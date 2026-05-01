const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const db = require("./database");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json({ limit: "20mb" }));

const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use("/uploads", express.static(UPLOADS_DIR));

const LESSONS_DIR = path.join(__dirname, "lessons");
if (!fs.existsSync(LESSONS_DIR)) fs.mkdirSync(LESSONS_DIR);

// ====== LESSON API ======
app.get("/api/lessons", (req, res) => {
  const files = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith(".json"));
  const lessons = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), "utf-8"));
    return { id: data.id, title: data.title, slideCount: data.slides.length,
      questionCount: data.slides.filter(s => s.type === "question").length,
      contentCount: data.slides.filter(s => s.type === "content").length,
      createdAt: data.createdAt, updatedAt: data.updatedAt };
  });
  res.json(lessons);
});

app.get("/api/lessons/:id", (req, res) => {
  const fp = path.join(LESSONS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: "Not found" });
  res.json(JSON.parse(fs.readFileSync(fp, "utf-8")));
});

app.post("/api/lessons", (req, res) => {
  const lesson = req.body;
  if (!lesson.id) { lesson.id = "lesson_" + Date.now(); lesson.createdAt = new Date().toISOString(); }
  lesson.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(LESSONS_DIR, `${lesson.id}.json`), JSON.stringify(lesson, null, 2));
  res.json({ success: true, id: lesson.id });
});

app.delete("/api/lessons/:id", (req, res) => {
  const fp = path.join(LESSONS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ success: true });
});

// ====== IMAGE API ======
app.post("/api/upload-image", (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) return res.status(400).json({ error: "Missing data" });
  const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const ext = path.extname(filename).toLowerCase() || ".jpg";
  const safeName = "img_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8) + ext;
  fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer);
  res.json({ success: true, url: "/uploads/" + safeName });
});

// ====== SESSION HISTORY API ======
app.get("/api/sessions", (req, res) => { res.json(db.getAllSessions()); });

app.get("/api/sessions/:id", (req, res) => {
  const session = db.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Not found" });
  res.json({
    session, attendance: db.getSessionAttendance(req.params.id),
    scores: db.getSessionScores(req.params.id), answers: db.getSessionAnswers(req.params.id)
  });
});

// ====== SESSION EXPORT API ======
app.get("/api/sessions/:id/export", (req, res) => {
  const session = db.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Not found" });

  const scores = db.getSessionScores(req.params.id);
  const answers = db.getSessionAnswers(req.params.id);
  const attendance = db.getSessionAttendance(req.params.id);

  // Build CSV content
  const lines = [];

  // Session info header
  lines.push(`Session Report`);
  lines.push(`Lesson,"${csvEscape(session.lesson_title || "Untitled")}"`);
  lines.push(`Date,"${session.started_at}"`);
  lines.push(`Students,${attendance.length}`);
  lines.push(`Questions,${session.total_questions}`);
  lines.push(``);

  // Scores table
  lines.push(`Rank,Student Name,Student Code,Total Score,Correct Answers,Total Questions,Accuracy %`);
  scores.forEach((s, i) => {
    const accuracy = s.total_answered > 0 ? Math.round((s.correct_count / s.total_answered) * 100) : 0;
    lines.push(`${i + 1},"${csvEscape(s.student_name)}",${s.student_code || "N/A"},${s.total_score},${s.correct_count},${s.total_answered},${accuracy}%`);
  });

  // Add question breakdown section
  if (answers.length > 0) {
    lines.push(``);
    lines.push(`Question Breakdown`);
    lines.push(`Question,Student,Answer Correct,Points,Response Time (s)`);

    const sortedAnswers = [...answers].sort((a, b) => a.question_index - b.question_index || a.student_name.localeCompare(b.student_name));
    sortedAnswers.forEach(a => {
      const timeSeconds = a.response_time_ms ? (a.response_time_ms / 1000).toFixed(1) : "N/A";
      lines.push(`"${csvEscape(a.question_text || "Question " + (a.question_index + 1))}","${csvEscape(a.student_name)}",${a.is_correct ? "Yes" : "No"},${a.points},${timeSeconds}`);
    });
  }

  const csv = lines.join("\n");
  const safeTitle = (session.lesson_title || "session").replace(/[^a-zA-Z0-9-_ ]/g, "").substring(0, 50);
  const filename = `ClassroomConnect_${safeTitle}_${session.started_at.split("T")[0] || "report"}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  // Add BOM for Excel to detect UTF-8 correctly (important for French characters)
  res.send("\uFEFF" + csv);
});

function csvEscape(str) {
  if (!str) return "";
  return str.replace(/"/g, '""');
}

// ====== CLASS & ROSTER API ======
app.get("/api/classes", (req, res) => { res.json(db.getAllClasses()); });

app.post("/api/classes", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const id = "class_" + Date.now();
  db.createClass(id, name);
  res.json({ success: true, id });
});

app.delete("/api/classes/:id", (req, res) => { db.deleteClass(req.params.id); res.json({ success: true }); });

app.put("/api/classes/:id", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  db.updateClassName(req.params.id, name);
  res.json({ success: true });
});

app.get("/api/classes/:id/students", (req, res) => { res.json(db.getClassStudents(req.params.id)); });

app.post("/api/classes/:id/students", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const studentId = "student_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  const code = db.addStudentToClass(studentId, name, req.params.id);
  res.json({ success: true, id: studentId, code });
});

app.delete("/api/students/:id", (req, res) => { db.removeStudentFromClass(req.params.id); res.json({ success: true }); });

app.put("/api/students/:id", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  db.updateStudentName(req.params.id, name);
  res.json({ success: true });
});

// ====== STUDENT CODE LOOKUP API ======
app.get("/api/lookup-code/:code", (req, res) => {
  const student = db.lookupStudentByCode(req.params.code);
  if (!student) return res.status(404).json({ error: "Code not found" });
  res.json({ name: student.name, code: student.code, className: student.class_name, classId: student.class_id });
});

// ====== SERVER INFO & QR CODE API ======
app.get("/api/server-info", async (req, res) => {
  const localIP = getLocalIP();
  const studentUrl = `http://${localIP}:${PORT}/student.html`;
  try {
    const qrDataUrl = await QRCode.toDataURL(studentUrl, {
      width: 280, margin: 2, color: { dark: "#1e293b", light: "#ffffff" }
    });
    res.json({ ip: localIP, port: PORT, studentUrl, qrCode: qrDataUrl });
  } catch (err) {
    res.json({ ip: localIP, port: PORT, studentUrl, qrCode: null });
  }
});

// ====== GAME STATE ======
const students = new Map();
let currentQuestion = null, questionStartTime = null, questionIndex = -1, slideIndex = -1;
let sessionActive = false, currentLesson = null, currentSlides = [], currentQuestions = [];
let currentSessionId = null, currentClassId = null;
let selectedClassForSession = null; // tracks teacher's class selection before/during session
const pendingResults = new Map();

function calculatePoints(isCorrect, responseTimeMs, timeLimitMs) {
  if (!isCorrect) return 0;
  return 1000 + Math.round(500 * Math.max(0, 1 - (responseTimeMs / timeLimitMs)));
}

// ====== SOCKET CONNECTIONS ======
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // Send current join mode to newly connected student
  socket.emit("join-mode", { usesCodes: !!selectedClassForSession });

  // Teacher selects or deselects a class (before or during lobby)
  socket.on("select-class", (classId) => {
    selectedClassForSession = classId || null;
    // Broadcast new join mode to all connected students
    io.emit("join-mode", { usesCodes: !!selectedClassForSession });
    console.log(`Class selection changed: ${selectedClassForSession || "none (open session)"}`);
  });

  // Student joins with a code (class session)
  socket.on("student-join-code", (code) => {
    const student = db.lookupStudentByCode(code);
    if (!student) {
      socket.emit("join-error", "invalid-code");
      return;
    }

    // If a class is selected, only accept codes from that class
    if (selectedClassForSession && student.class_id !== selectedClassForSession) {
      socket.emit("join-error", "wrong-class");
      return;
    }

    students.set(socket.id, {
      name: student.name, code: student.code, joinedAt: new Date(),
      score: 0, answers: [], hasAnswered: false
    });
    console.log(`Student joined via code ${code}: ${student.name}`);

    if (currentSessionId) {
      try { db.recordAttendance(currentSessionId, student.name, student.code); } catch (e) {}
    }

    socket.emit("join-success", { name: student.name });
    io.emit("student-list", getStudentList());
    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());

    if (sessionActive && slideIndex >= 0 && slideIndex < currentSlides.length) {
      const slide = currentSlides[slideIndex];
      if (slide.type === "content") {
        socket.emit("content-slide", { index: slideIndex, total: currentSlides.length, title: slide.title || "", body: slide.body || "", image: slide.image || null });
      } else if (slide.type === "question") {
        socket.emit("question", { index: currentQuestions.indexOf(slide), total: currentQuestions.length, question: slide.question, options: slide.options, type: slide.questionType || "mcq", timeLimit: slide.timeLimit || 20 });
      }
    }
  });

  // Student joins with name (open session — no class selected)
  socket.on("student-join", (name) => {
    // Reject name join if a class is selected — students must use their code
    if (selectedClassForSession) {
      socket.emit("join-error", "class-required");
      return;
    }

    students.set(socket.id, {
      name, code: null, joinedAt: new Date(), score: 0, answers: [], hasAnswered: false
    });
    console.log(`Student joined: ${name}`);
    if (currentSessionId) {
      try { db.recordAttendance(currentSessionId, name, null); } catch (e) {}
    }
    io.emit("student-list", getStudentList());
    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());

    if (sessionActive && slideIndex >= 0 && slideIndex < currentSlides.length) {
      const slide = currentSlides[slideIndex];
      if (slide.type === "content") {
        socket.emit("content-slide", { index: slideIndex, total: currentSlides.length, title: slide.title || "", body: slide.body || "", image: slide.image || null });
      } else if (slide.type === "question") {
        socket.emit("question", { index: currentQuestions.indexOf(slide), total: currentQuestions.length, question: slide.question, options: slide.options, type: slide.questionType || "mcq", timeLimit: slide.timeLimit || 20 });
      }
    }
  });

  socket.on("start-session", (data) => {
    // data can be a string (lessonId) for backward compat, or an object { lessonId, classId }
    let lessonId, classId;
    if (typeof data === "string") { lessonId = data; classId = null; }
    else { lessonId = data.lessonId; classId = data.classId || null; }

    const fp = path.join(LESSONS_DIR, `${lessonId}.json`);
    if (!fs.existsSync(fp)) { socket.emit("error", "Lesson not found"); return; }

    currentLesson = JSON.parse(fs.readFileSync(fp, "utf-8"));
    currentSlides = currentLesson.slides;
    currentQuestions = currentSlides.filter(s => s.type === "question");
    sessionActive = true; slideIndex = -1; questionIndex = -1; currentQuestion = null;
    currentClassId = selectedClassForSession; // use the tracked class selection

    currentSessionId = "session_" + Date.now();
    try { db.createSession(currentSessionId, lessonId, currentLesson.title, currentSlides.length, currentQuestions.length, classId); } catch (e) { console.error(e.message); }

    students.forEach(s => {
      s.score = 0; s.answers = []; s.hasAnswered = false;
      try { db.recordAttendance(currentSessionId, s.name, s.code || null); } catch (e) {}
    });

    io.emit("session-started", {
      title: currentLesson.title, totalSlides: currentSlides.length,
      totalQuestions: currentQuestions.length, usesCodes: !!currentClassId
    });
    console.log(`Session started: ${currentLesson.title}${currentClassId ? " (class: " + currentClassId + ")" : ""}`);
  });

  socket.on("next-slide", () => {
    slideIndex++; pendingResults.clear();
    if (slideIndex >= currentSlides.length) {
      if (currentSessionId) {
        try { db.recordFinalScores(currentSessionId, students); db.endSession(currentSessionId); } catch (e) { console.error(e.message); }
      }
      io.emit("session-ended", getLeaderboard());
      sessionActive = false; currentQuestion = null; currentLesson = null; currentSessionId = null; currentClassId = null;
      selectedClassForSession = null;
      io.emit("join-mode", { usesCodes: false });
      return;
    }

    const slide = currentSlides[slideIndex];
    if (slide.type === "content") {
      io.emit("content-slide", { index: slideIndex, total: currentSlides.length, title: slide.title || "", body: slide.body || "", image: slide.image || null });
      io.emit("teacher-slide-info", { slideIndex, totalSlides: currentSlides.length, type: "content", title: slide.title || "", body: slide.body || "", image: slide.image || null });
    } else if (slide.type === "question") {
      questionIndex++; currentQuestion = slide; questionStartTime = Date.now();
      students.forEach(s => { s.hasAnswered = false; });
      io.emit("question", { index: questionIndex, total: currentQuestions.length, question: slide.question, options: slide.options, type: slide.questionType || "mcq", timeLimit: slide.timeLimit || 20 });
      io.emit("teacher-slide-info", { slideIndex, totalSlides: currentSlides.length, type: "question", question: slide.question, options: slide.options, questionIndex, totalQuestions: currentQuestions.length });
      io.emit("answer-status", getAnswerStatus());
      io.emit("detailed-answer-status", getDetailedAnswerStatus());
    }
  });

  socket.on("submit-answer", (answerIndex) => {
    const student = students.get(socket.id);
    if (!student || !currentQuestion || student.hasAnswered) return;
    const responseTime = Date.now() - questionStartTime;
    const timeLimitMs = (currentQuestion.timeLimit || 20) * 1000;
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const points = calculatePoints(isCorrect, responseTime, timeLimitMs);

    student.hasAnswered = true; student.score += points;
    student.answers.push({ questionIndex, answerIndex, isCorrect, points, responseTime });

    if (currentSessionId) {
      try { db.recordAnswer(currentSessionId, student.name, student.code || null, questionIndex, currentQuestion.question, answerIndex, isCorrect, points, responseTime); } catch (e) {}
    }

    pendingResults.set(socket.id, { isCorrect, points, totalScore: student.score, correctIndex: currentQuestion.correctIndex });
    socket.emit("answer-received");
    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());
  });

  socket.on("show-results", () => {
    if (!currentQuestion) return;
    pendingResults.forEach((result, sid) => { io.to(sid).emit("answer-result", result); });
    students.forEach((student, sid) => {
      if (!student.hasAnswered) {
        io.to(sid).emit("answer-result", { isCorrect: false, points: 0, totalScore: student.score, correctIndex: currentQuestion.correctIndex, didNotAnswer: true });
      }
    });
    io.emit("question-results", getQuestionResults());
  });

  socket.on("disconnect", () => {
    const student = students.get(socket.id);
    if (student) {
      students.delete(socket.id); pendingResults.delete(socket.id);
      io.emit("student-list", getStudentList());
      io.emit("answer-status", getAnswerStatus());
      io.emit("detailed-answer-status", getDetailedAnswerStatus());
    }
  });
});

function getStudentList() { return Array.from(students.values()).map(s => ({ name: s.name, score: s.score })); }
function getLeaderboard() { return Array.from(students.values()).map(s => ({ name: s.name, score: s.score })).sort((a, b) => b.score - a.score); }
function getAnswerStatus() { return { answered: Array.from(students.values()).filter(s => s.hasAnswered).length, total: students.size }; }
function getDetailedAnswerStatus() { return Array.from(students.values()).map(s => ({ name: s.name, hasAnswered: s.hasAnswered })); }
function getQuestionResults() {
  const oc = currentQuestion.options.map(() => 0); let cc = 0;
  students.forEach(s => { const a = s.answers[s.answers.length - 1]; if (a && a.questionIndex === questionIndex) { oc[a.answerIndex]++; if (a.isCorrect) cc++; } });
  return { question: currentQuestion.question, options: currentQuestion.options, correctIndex: currentQuestion.correctIndex, optionCounts: oc, correctCount: cc, totalStudents: students.size, leaderboard: getLeaderboard().slice(0, 5) };
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) { for (const iface of interfaces[name]) { if (iface.family === "IPv4" && !iface.internal) return iface.address; } }
  return "localhost";
}

const PORT = 3000;
server.listen(PORT, "0.0.0.0", () => {
  const localIP = getLocalIP();
  console.log("\n===========================================");
  console.log("   CLASSROOM CONNECT SERVER IS RUNNING");
  console.log("   Database: classroom-connect.db");
  console.log("===========================================\n");
  console.log(`   Teacher:   http://localhost:${PORT}/teacher.html`);
  console.log(`   Builder:   http://localhost:${PORT}/builder.html`);
  console.log(`   Roster:    http://localhost:${PORT}/roster.html`);
  console.log(`   History:   http://localhost:${PORT}/history.html`);
  console.log(`   Students:  http://${localIP}:${PORT}/student.html\n`);
  console.log("===========================================\n");
});
