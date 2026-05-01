const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");
const fs = require("fs");
const path = require("path");
const db = require("./database");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json({ limit: "20mb" }));

// Serve uploaded images
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use("/uploads", express.static(UPLOADS_DIR));

// ====== LESSON STORAGE (JSON files) ======
const LESSONS_DIR = path.join(__dirname, "lessons");
if (!fs.existsSync(LESSONS_DIR)) fs.mkdirSync(LESSONS_DIR);

app.get("/api/lessons", (req, res) => {
  const files = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith(".json"));
  const lessons = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), "utf-8"));
    return {
      id: data.id, title: data.title,
      slideCount: data.slides.length,
      questionCount: data.slides.filter(s => s.type === "question").length,
      contentCount: data.slides.filter(s => s.type === "content").length,
      createdAt: data.createdAt, updatedAt: data.updatedAt
    };
  });
  res.json(lessons);
});

app.get("/api/lessons/:id", (req, res) => {
  const filePath = path.join(LESSONS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Lesson not found" });
  res.json(JSON.parse(fs.readFileSync(filePath, "utf-8")));
});

app.post("/api/lessons", (req, res) => {
  const lesson = req.body;
  if (!lesson.id) { lesson.id = "lesson_" + Date.now(); lesson.createdAt = new Date().toISOString(); }
  lesson.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(LESSONS_DIR, `${lesson.id}.json`), JSON.stringify(lesson, null, 2));
  res.json({ success: true, id: lesson.id });
});

app.delete("/api/lessons/:id", (req, res) => {
  const filePath = path.join(LESSONS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ success: true });
});

// ====== IMAGE UPLOAD ======
app.post("/api/upload-image", (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) return res.status(400).json({ error: "Missing filename or data" });
  const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const ext = path.extname(filename).toLowerCase() || ".jpg";
  const safeName = "img_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8) + ext;
  fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer);
  console.log(`Image uploaded: ${safeName} (${(buffer.length / 1024).toFixed(1)} KB)`);
  res.json({ success: true, url: "/uploads/" + safeName });
});

// ====== SESSION HISTORY API ======
app.get("/api/sessions", (req, res) => {
  res.json(db.getAllSessions());
});

app.get("/api/sessions/:id", (req, res) => {
  const session = db.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const attendance = db.getSessionAttendance(req.params.id);
  const scores = db.getSessionScores(req.params.id);
  const answers = db.getSessionAnswers(req.params.id);
  res.json({ session, attendance, scores, answers });
});

// ====== CLASS & ROSTER API ======
app.get("/api/classes", (req, res) => {
  res.json(db.getAllClasses());
});

app.post("/api/classes", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const id = "class_" + Date.now();
  db.createClass(id, name);
  res.json({ success: true, id });
});

app.delete("/api/classes/:id", (req, res) => {
  db.deleteClass(req.params.id);
  res.json({ success: true });
});

app.put("/api/classes/:id", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  db.updateClassName(req.params.id, name);
  res.json({ success: true });
});

app.get("/api/classes/:id/students", (req, res) => {
  res.json(db.getClassStudents(req.params.id));
});

app.post("/api/classes/:id/students", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const studentId = "student_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  db.addStudentToClass(studentId, name, req.params.id);
  res.json({ success: true, id: studentId });
});

app.delete("/api/students/:id", (req, res) => {
  db.removeStudentFromClass(req.params.id);
  res.json({ success: true });
});

app.put("/api/students/:id", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  db.updateStudentName(req.params.id, name);
  res.json({ success: true });
});

// ====== GAME STATE ======
const students = new Map();
let currentQuestion = null;
let questionStartTime = null;
let questionIndex = -1;
let slideIndex = -1;
let sessionActive = false;
let currentLesson = null;
let currentSlides = [];
let currentQuestions = [];
let currentSessionId = null;
const pendingResults = new Map();

// ====== SCORING ======
function calculatePoints(isCorrect, responseTimeMs, timeLimitMs) {
  if (!isCorrect) return 0;
  const basePoints = 1000;
  const maxSpeedBonus = 500;
  const timeRatio = Math.max(0, 1 - (responseTimeMs / timeLimitMs));
  return basePoints + Math.round(maxSpeedBonus * timeRatio);
}

// ====== SOCKET CONNECTIONS ======
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("student-join", (name) => {
    students.set(socket.id, {
      name, joinedAt: new Date(), score: 0, answers: [], hasAnswered: false
    });
    console.log(`Student joined: ${name}`);

    // Record attendance in database if session is active
    if (currentSessionId) {
      try { db.recordAttendance(currentSessionId, name); }
      catch (e) { console.error("Failed to record attendance:", e.message); }
    }

    io.emit("student-list", getStudentList());
    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());

    if (sessionActive && slideIndex >= 0 && slideIndex < currentSlides.length) {
      const slide = currentSlides[slideIndex];
      if (slide.type === "content") {
        socket.emit("content-slide", {
          index: slideIndex, total: currentSlides.length,
          title: slide.title || "", body: slide.body || "", image: slide.image || null
        });
      } else if (slide.type === "question") {
        const qIdx = currentQuestions.indexOf(slide);
        socket.emit("question", {
          index: qIdx, total: currentQuestions.length,
          question: slide.question, options: slide.options,
          type: slide.questionType || "mcq", timeLimit: slide.timeLimit || 20
        });
      }
    }
  });

  socket.on("start-session", (lessonId) => {
    const filePath = path.join(LESSONS_DIR, `${lessonId}.json`);
    if (!fs.existsSync(filePath)) { socket.emit("error", "Lesson not found"); return; }

    currentLesson = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    currentSlides = currentLesson.slides;
    currentQuestions = currentSlides.filter(s => s.type === "question");
    sessionActive = true; slideIndex = -1; questionIndex = -1; currentQuestion = null;

    // Create session in database
    currentSessionId = "session_" + Date.now();
    try {
      db.createSession(currentSessionId, lessonId, currentLesson.title, currentSlides.length, currentQuestions.length);
      console.log(`Session saved to database: ${currentSessionId}`);
    } catch (e) {
      console.error("Failed to create session in DB:", e.message);
    }

    // Record attendance for students already connected
    students.forEach(s => {
      try { db.recordAttendance(currentSessionId, s.name); }
      catch (e) { console.error("Failed to record attendance:", e.message); }
    });

    students.forEach(s => { s.score = 0; s.answers = []; s.hasAnswered = false; });

    io.emit("session-started", {
      title: currentLesson.title,
      totalSlides: currentSlides.length,
      totalQuestions: currentQuestions.length
    });
    console.log(`Session started with lesson: ${currentLesson.title}`);
  });

  socket.on("next-slide", () => {
    slideIndex++;
    pendingResults.clear();

    if (slideIndex >= currentSlides.length) {
      // Save final scores to database
      if (currentSessionId) {
        try {
          db.recordFinalScores(currentSessionId, students);
          db.endSession(currentSessionId);
          console.log(`Session ${currentSessionId} scores saved and session ended.`);
        } catch (e) {
          console.error("Failed to save final scores:", e.message);
        }
      }

      io.emit("session-ended", getLeaderboard());
      sessionActive = false; currentQuestion = null; currentLesson = null; currentSessionId = null;
      console.log("Session ended!");
      return;
    }

    const slide = currentSlides[slideIndex];

    if (slide.type === "content") {
      io.emit("content-slide", {
        index: slideIndex, total: currentSlides.length,
        title: slide.title || "", body: slide.body || "", image: slide.image || null
      });
      io.emit("teacher-slide-info", {
        slideIndex, totalSlides: currentSlides.length, type: "content",
        title: slide.title || "", body: slide.body || "", image: slide.image || null
      });
      console.log(`Content slide ${slideIndex + 1}/${currentSlides.length}: ${slide.title}`);

    } else if (slide.type === "question") {
      questionIndex++;
      currentQuestion = slide;
      questionStartTime = Date.now();
      students.forEach(s => { s.hasAnswered = false; });

      io.emit("question", {
        index: questionIndex, total: currentQuestions.length,
        question: slide.question, options: slide.options,
        type: slide.questionType || "mcq", timeLimit: slide.timeLimit || 20
      });
      io.emit("teacher-slide-info", {
        slideIndex, totalSlides: currentSlides.length, type: "question",
        question: slide.question, options: slide.options,
        questionIndex, totalQuestions: currentQuestions.length
      });
      io.emit("answer-status", getAnswerStatus());
      io.emit("detailed-answer-status", getDetailedAnswerStatus());
      console.log(`Question ${questionIndex + 1}/${currentQuestions.length}: ${slide.question}`);
    }
  });

  socket.on("submit-answer", (answerIndex) => {
    const student = students.get(socket.id);
    if (!student || !currentQuestion || student.hasAnswered) return;

    const responseTime = Date.now() - questionStartTime;
    const timeLimitMs = (currentQuestion.timeLimit || 20) * 1000;
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const points = calculatePoints(isCorrect, responseTime, timeLimitMs);

    student.hasAnswered = true;
    student.score += points;
    student.answers.push({ questionIndex, answerIndex, isCorrect, points, responseTime });

    // Save answer to database
    if (currentSessionId) {
      try {
        db.recordAnswer(currentSessionId, student.name, questionIndex, currentQuestion.question, answerIndex, isCorrect, points, responseTime);
      } catch (e) {
        console.error("Failed to record answer:", e.message);
      }
    }

    pendingResults.set(socket.id, {
      isCorrect, points, totalScore: student.score, correctIndex: currentQuestion.correctIndex
    });

    socket.emit("answer-received");
    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());
  });

  socket.on("show-results", () => {
    if (!currentQuestion) return;
    pendingResults.forEach((result, sid) => { io.to(sid).emit("answer-result", result); });
    students.forEach((student, sid) => {
      if (!student.hasAnswered) {
        io.to(sid).emit("answer-result", {
          isCorrect: false, points: 0, totalScore: student.score,
          correctIndex: currentQuestion.correctIndex, didNotAnswer: true
        });
      }
    });
    io.emit("question-results", getQuestionResults());
  });

  socket.on("disconnect", () => {
    const student = students.get(socket.id);
    if (student) {
      console.log(`Student left: ${student.name}`);
      students.delete(socket.id);
      pendingResults.delete(socket.id);
      io.emit("student-list", getStudentList());
      io.emit("answer-status", getAnswerStatus());
      io.emit("detailed-answer-status", getDetailedAnswerStatus());
    }
  });
});

// ====== HELPERS ======
function getStudentList() { return Array.from(students.values()).map(s => ({ name: s.name, score: s.score })); }
function getLeaderboard() { return Array.from(students.values()).map(s => ({ name: s.name, score: s.score })).sort((a, b) => b.score - a.score); }
function getAnswerStatus() { return { answered: Array.from(students.values()).filter(s => s.hasAnswered).length, total: students.size }; }
function getDetailedAnswerStatus() { return Array.from(students.values()).map(s => ({ name: s.name, hasAnswered: s.hasAnswered })); }
function getQuestionResults() {
  const optionCounts = currentQuestion.options.map(() => 0);
  let correctCount = 0;
  students.forEach(s => {
    const a = s.answers[s.answers.length - 1];
    if (a && a.questionIndex === questionIndex) { optionCounts[a.answerIndex]++; if (a.isCorrect) correctCount++; }
  });
  return {
    question: currentQuestion.question, options: currentQuestion.options,
    correctIndex: currentQuestion.correctIndex, optionCounts, correctCount,
    totalStudents: students.size, leaderboard: getLeaderboard().slice(0, 5)
  };
}

// ====== START ======
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
}

const PORT = 3000;
server.listen(PORT, "0.0.0.0", () => {
  const localIP = getLocalIP();
  console.log("");
  console.log("===========================================");
  console.log("   CLASSROOM CONNECT SERVER IS RUNNING");
  console.log("   Database: classroom-connect.db");
  console.log("===========================================");
  console.log("");
  console.log(`   Teacher:   http://localhost:${PORT}/teacher.html`);
  console.log(`   Builder:   http://localhost:${PORT}/builder.html`);
  console.log(`   Students:  http://${localIP}:${PORT}/student.html`);
  console.log("");
  console.log("===========================================");
  console.log("");
});
