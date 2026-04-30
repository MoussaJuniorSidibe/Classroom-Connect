const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json({ limit: "10mb" }));

// ====== LESSON STORAGE ======
const LESSONS_DIR = path.join(__dirname, "lessons");
if (!fs.existsSync(LESSONS_DIR)) {
  fs.mkdirSync(LESSONS_DIR);
}

// API: Get all lessons
app.get("/api/lessons", (req, res) => {
  const files = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith(".json"));
  const lessons = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), "utf-8"));
    return {
      id: data.id,
      title: data.title,
      slideCount: data.slides.length,
      questionCount: data.slides.filter(s => s.type === "question").length,
      contentCount: data.slides.filter(s => s.type === "content").length,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  });
  res.json(lessons);
});

// API: Get one lesson
app.get("/api/lessons/:id", (req, res) => {
  const filePath = path.join(LESSONS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Lesson not found" });
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(data);
});

// API: Save a lesson (create or update)
app.post("/api/lessons", (req, res) => {
  const lesson = req.body;
  if (!lesson.id) {
    lesson.id = "lesson_" + Date.now();
    lesson.createdAt = new Date().toISOString();
  }
  lesson.updatedAt = new Date().toISOString();
  const filePath = path.join(LESSONS_DIR, `${lesson.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(lesson, null, 2));
  res.json({ success: true, id: lesson.id });
});

// API: Delete a lesson
app.delete("/api/lessons/:id", (req, res) => {
  const filePath = path.join(LESSONS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
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
const pendingResults = new Map();

// ====== SCORING ======
function calculatePoints(isCorrect, responseTimeMs, timeLimitMs) {
  if (!isCorrect) return 0;
  const basePoints = 1000;
  const maxSpeedBonus = 500;
  const timeRatio = Math.max(0, 1 - (responseTimeMs / timeLimitMs));
  const speedBonus = Math.round(maxSpeedBonus * timeRatio);
  return basePoints + speedBonus;
}

// ====== SOCKET CONNECTIONS ======
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("student-join", (name) => {
    students.set(socket.id, {
      name: name,
      joinedAt: new Date(),
      score: 0,
      answers: [],
      hasAnswered: false
    });
    console.log(`Student joined: ${name}`);
    io.emit("student-list", getStudentList());
    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());

    // If session is active, send current slide
    if (sessionActive && slideIndex >= 0 && slideIndex < currentSlides.length) {
      const slide = currentSlides[slideIndex];
      if (slide.type === "content") {
        socket.emit("content-slide", {
          index: slideIndex,
          total: currentSlides.length,
          title: slide.title || "",
          body: slide.body || ""
        });
      } else if (slide.type === "question") {
        const qIdx = currentQuestions.indexOf(slide);
        socket.emit("question", {
          index: qIdx,
          total: currentQuestions.length,
          question: slide.question,
          options: slide.options,
          type: slide.questionType || "mcq",
          timeLimit: slide.timeLimit || 20
        });
      }
    }
  });

  // Teacher loads a lesson and starts session
  socket.on("start-session", (lessonId) => {
    const filePath = path.join(LESSONS_DIR, `${lessonId}.json`);
    if (!fs.existsSync(filePath)) {
      socket.emit("error", "Lesson not found");
      return;
    }

    currentLesson = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    currentSlides = currentLesson.slides;
    currentQuestions = currentSlides.filter(s => s.type === "question");
    sessionActive = true;
    slideIndex = -1;
    questionIndex = -1;
    currentQuestion = null;

    students.forEach((student) => {
      student.score = 0;
      student.answers = [];
      student.hasAnswered = false;
    });

    io.emit("session-started", {
      title: currentLesson.title,
      totalSlides: currentSlides.length,
      totalQuestions: currentQuestions.length
    });
    console.log(`Session started with lesson: ${currentLesson.title}`);
  });

  // Teacher advances to next slide
  socket.on("next-slide", () => {
    slideIndex++;
    pendingResults.clear();

    if (slideIndex >= currentSlides.length) {
      // Session is over
      const leaderboard = getLeaderboard();
      io.emit("session-ended", leaderboard);
      sessionActive = false;
      currentQuestion = null;
      currentLesson = null;
      console.log("Session ended! Final leaderboard sent.");
      return;
    }

    const slide = currentSlides[slideIndex];

    if (slide.type === "content") {
      // Send content slide to everyone
      io.emit("content-slide", {
        index: slideIndex,
        total: currentSlides.length,
        title: slide.title || "",
        body: slide.body || ""
      });

      // Tell teacher it's a content slide
      io.emit("teacher-slide-info", {
        slideIndex: slideIndex,
        totalSlides: currentSlides.length,
        type: "content",
        title: slide.title || "",
        body: slide.body || ""
      });

      console.log(`Content slide ${slideIndex + 1}/${currentSlides.length}: ${slide.title}`);

    } else if (slide.type === "question") {
      questionIndex++;
      currentQuestion = slide;
      questionStartTime = Date.now();

      students.forEach((student) => {
        student.hasAnswered = false;
      });

      // Send question to students
      io.emit("question", {
        index: questionIndex,
        total: currentQuestions.length,
        question: slide.question,
        options: slide.options,
        type: slide.questionType || "mcq",
        timeLimit: slide.timeLimit || 20
      });

      // Tell teacher about the question
      io.emit("teacher-slide-info", {
        slideIndex: slideIndex,
        totalSlides: currentSlides.length,
        type: "question",
        question: slide.question,
        options: slide.options,
        questionIndex: questionIndex,
        totalQuestions: currentQuestions.length
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
    student.answers.push({
      questionIndex: questionIndex,
      answerIndex: answerIndex,
      isCorrect: isCorrect,
      points: points,
      responseTime: responseTime
    });

    pendingResults.set(socket.id, {
      isCorrect: isCorrect,
      points: points,
      totalScore: student.score,
      correctIndex: currentQuestion.correctIndex
    });

    socket.emit("answer-received");
    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());

    console.log(`${student.name} submitted answer (result hidden until reveal)`);
  });

  socket.on("show-results", () => {
    if (!currentQuestion) return;

    pendingResults.forEach((result, socketId) => {
      io.to(socketId).emit("answer-result", result);
    });

    students.forEach((student, socketId) => {
      if (!student.hasAnswered) {
        io.to(socketId).emit("answer-result", {
          isCorrect: false,
          points: 0,
          totalScore: student.score,
          correctIndex: currentQuestion.correctIndex,
          didNotAnswer: true
        });
      }
    });

    const results = getQuestionResults();
    io.emit("question-results", results);
    console.log("Teacher revealed results!");
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

// ====== HELPER FUNCTIONS ======
function getStudentList() {
  return Array.from(students.values()).map(s => ({
    name: s.name,
    score: s.score
  }));
}

function getLeaderboard() {
  return Array.from(students.values())
    .map(s => ({ name: s.name, score: s.score }))
    .sort((a, b) => b.score - a.score);
}

function getAnswerStatus() {
  const total = students.size;
  const answered = Array.from(students.values()).filter(s => s.hasAnswered).length;
  return { answered, total };
}

function getDetailedAnswerStatus() {
  return Array.from(students.values()).map(s => ({
    name: s.name,
    hasAnswered: s.hasAnswered
  }));
}

function getQuestionResults() {
  const optionCounts = currentQuestion.options.map(() => 0);
  let correctCount = 0;

  students.forEach((student) => {
    const lastAnswer = student.answers[student.answers.length - 1];
    if (lastAnswer && lastAnswer.questionIndex === questionIndex) {
      optionCounts[lastAnswer.answerIndex]++;
      if (lastAnswer.isCorrect) correctCount++;
    }
  });

  return {
    question: currentQuestion.question,
    options: currentQuestion.options,
    correctIndex: currentQuestion.correctIndex,
    optionCounts: optionCounts,
    correctCount: correctCount,
    totalStudents: students.size,
    leaderboard: getLeaderboard().slice(0, 5)
  };
}

// ====== START SERVER ======
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
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
  console.log("===========================================");
  console.log("");
  console.log(`   Teacher:   http://localhost:${PORT}/teacher.html`);
  console.log(`   Builder:   http://localhost:${PORT}/builder.html`);
  console.log(`   Students:  http://${localIP}:${PORT}/student.html`);
  console.log("");
  console.log("===========================================");
  console.log("");
});