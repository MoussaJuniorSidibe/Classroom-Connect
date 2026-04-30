const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// ====== GAME STATE ======
const students = new Map();
let currentQuestion = null;
let questionStartTime = null;
let questionIndex = -1;
let sessionActive = false;
const pendingResults = new Map();

// Sample questions for testing
const questions = [
  {
    type: "mcq",
    question: "What is the capital of Côte d'Ivoire?",
    options: ["Abidjan", "Yamoussoukro", "Bouaké", "San-Pédro"],
    correctIndex: 1,
    timeLimit: 20
  },
  {
    type: "mcq",
    question: "What does HTML stand for?",
    options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"],
    correctIndex: 0,
    timeLimit: 20
  },
  {
    type: "truefalse",
    question: "The Earth revolves around the Sun.",
    options: ["True", "False"],
    correctIndex: 0,
    timeLimit: 15
  },
  {
    type: "mcq",
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctIndex: 1,
    timeLimit: 20
  },
  {
    type: "truefalse",
    question: "Water boils at 50°C at sea level.",
    options: ["True", "False"],
    correctIndex: 1,
    timeLimit: 15
  }
];

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

    // Send updated detailed status to teacher
    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());

    if (sessionActive && currentQuestion) {
      socket.emit("question", {
        index: questionIndex,
        total: questions.length,
        question: currentQuestion.question,
        options: currentQuestion.options,
        type: currentQuestion.type,
        timeLimit: currentQuestion.timeLimit
      });
    }
  });

  socket.on("start-session", () => {
    sessionActive = true;
    questionIndex = -1;
    students.forEach((student) => {
      student.score = 0;
      student.answers = [];
    });
    io.emit("session-started");
    console.log("Session started!");
  });

  socket.on("next-question", () => {
    questionIndex++;
    pendingResults.clear();

    if (questionIndex >= questions.length) {
      const leaderboard = getLeaderboard();
      io.emit("session-ended", leaderboard);
      sessionActive = false;
      currentQuestion = null;
      console.log("Session ended! Final leaderboard sent.");
      return;
    }

    currentQuestion = questions[questionIndex];
    questionStartTime = Date.now();

    students.forEach((student) => {
      student.hasAnswered = false;
    });

    io.emit("question", {
      index: questionIndex,
      total: questions.length,
      question: currentQuestion.question,
      options: currentQuestion.options,
      type: currentQuestion.type,
      timeLimit: currentQuestion.timeLimit
    });

    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());
    console.log(`Question ${questionIndex + 1}/${questions.length}: ${currentQuestion.question}`);
  });

  socket.on("submit-answer", (answerIndex) => {
    const student = students.get(socket.id);
    if (!student || !currentQuestion || student.hasAnswered) return;

    const responseTime = Date.now() - questionStartTime;
    const timeLimitMs = currentQuestion.timeLimit * 1000;
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

    // Send both summary and detailed status
    io.emit("answer-status", getAnswerStatus());
    io.emit("detailed-answer-status", getDetailedAnswerStatus());

    console.log(`${student.name} submitted answer (result hidden until reveal)`);
  });

  socket.on("show-results", () => {
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
  console.log(`   Teacher:  http://localhost:${PORT}/teacher.html`);
  console.log(`   Students: http://${localIP}:${PORT}/student.html`);
  console.log("");
  console.log(`   ${questions.length} questions loaded`);
  console.log("===========================================");
  console.log("");
});