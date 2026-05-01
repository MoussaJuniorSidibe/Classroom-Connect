const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "classroom-connect.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// ====== CREATE TABLES ======
db.exec(`
  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS roster_students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_id TEXT NOT NULL,
    code TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    lesson_id TEXT,
    lesson_title TEXT,
    class_id TEXT,
    total_slides INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    started_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT
  );

  CREATE TABLE IF NOT EXISTS session_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_code TEXT,
    joined_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_code TEXT,
    question_index INTEGER NOT NULL,
    question_text TEXT,
    answer_index INTEGER,
    is_correct INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_code TEXT,
    total_score INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    total_answered INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
`);

// Add code column if it doesn't exist (migration for existing databases)
try { db.exec(`ALTER TABLE roster_students ADD COLUMN code TEXT UNIQUE`); } catch (e) { /* column already exists */ }
try { db.exec(`ALTER TABLE session_attendance ADD COLUMN student_code TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE session_answers ADD COLUMN student_code TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE session_scores ADD COLUMN student_code TEXT`); } catch (e) {}

// ====== CODE GENERATION ======
function generateUniqueCode() {
  const existing = new Set(
    db.prepare(`SELECT code FROM roster_students WHERE code IS NOT NULL`).all().map(r => r.code)
  );
  let code;
  let attempts = 0;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000)); // 4 digits: 1000-9999
    attempts++;
    if (attempts > 1000) throw new Error("Unable to generate unique code");
  } while (existing.has(code));
  return code;
}

function lookupStudentByCode(code) {
  return db.prepare(`
    SELECT rs.*, c.name as class_name
    FROM roster_students rs
    JOIN classes c ON rs.class_id = c.id
    WHERE rs.code = ?
  `).get(code);
}

function getStudentsByClassWithCodes(classId) {
  return db.prepare(`SELECT * FROM roster_students WHERE class_id = ? ORDER BY name`).all(classId);
}

// Assign codes to any students that don't have one yet
function assignMissingCodes() {
  const students = db.prepare(`SELECT id FROM roster_students WHERE code IS NULL`).all();
  const stmt = db.prepare(`UPDATE roster_students SET code = ? WHERE id = ?`);
  const assignAll = db.transaction(() => {
    for (const s of students) {
      stmt.run(generateUniqueCode(), s.id);
    }
  });
  assignAll();
  return students.length;
}

// Run on startup to ensure all students have codes
assignMissingCodes();

// ====== SESSION FUNCTIONS ======
function createSession(sessionId, lessonId, lessonTitle, totalSlides, totalQuestions, classId) {
  db.prepare(`
    INSERT INTO sessions (id, lesson_id, lesson_title, class_id, total_slides, total_questions, started_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(sessionId, lessonId, lessonTitle, classId || null, totalSlides, totalQuestions);
  return sessionId;
}

function endSession(sessionId) {
  db.prepare(`UPDATE sessions SET ended_at = datetime('now') WHERE id = ?`).run(sessionId);
}

function recordAttendance(sessionId, studentName, studentCode) {
  db.prepare(`
    INSERT INTO session_attendance (session_id, student_name, student_code, joined_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(sessionId, studentName, studentCode || null);
}

function recordAnswer(sessionId, studentName, studentCode, questionIndex, questionText, answerIndex, isCorrect, points, responseTimeMs) {
  db.prepare(`
    INSERT INTO session_answers (session_id, student_name, student_code, question_index, question_text, answer_index, is_correct, points, response_time_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, studentName, studentCode || null, questionIndex, questionText, answerIndex, isCorrect ? 1 : 0, points, responseTimeMs);
}

function recordFinalScores(sessionId, studentsMap) {
  const stmt = db.prepare(`
    INSERT INTO session_scores (session_id, student_name, student_code, total_score, correct_count, total_answered)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((students) => {
    for (const student of students) {
      const correctCount = student.answers.filter(a => a.isCorrect).length;
      stmt.run(sessionId, student.name, student.code || null, student.score, correctCount, student.answers.length);
    }
  });
  insertMany(Array.from(studentsMap.values()));
}

// ====== QUERY FUNCTIONS ======
function getAllSessions() {
  return db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM session_attendance WHERE session_id = s.id) as student_count
    FROM sessions s ORDER BY s.started_at DESC
  `).all();
}

function getSession(sessionId) {
  return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId);
}

function getSessionAttendance(sessionId) {
  return db.prepare(`SELECT * FROM session_attendance WHERE session_id = ? ORDER BY joined_at`).all(sessionId);
}

function getSessionScores(sessionId) {
  return db.prepare(`SELECT * FROM session_scores WHERE session_id = ? ORDER BY total_score DESC`).all(sessionId);
}

function getSessionAnswers(sessionId) {
  return db.prepare(`SELECT * FROM session_answers WHERE session_id = ? ORDER BY student_name, question_index`).all(sessionId);
}

function getStudentHistory(studentName) {
  return db.prepare(`
    SELECT sc.*, s.lesson_title, s.started_at as session_date
    FROM session_scores sc JOIN sessions s ON sc.session_id = s.id
    WHERE sc.student_name = ? ORDER BY s.started_at DESC
  `).all(studentName);
}

// ====== CLASS & ROSTER FUNCTIONS ======
function createClass(classId, name) {
  db.prepare(`INSERT INTO classes (id, name) VALUES (?, ?)`).run(classId, name);
}

function getAllClasses() {
  return db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM roster_students WHERE class_id = c.id) as student_count
    FROM classes c ORDER BY c.name
  `).all();
}

function getClass(classId) {
  return db.prepare(`SELECT * FROM classes WHERE id = ?`).get(classId);
}

function deleteClass(classId) {
  db.prepare(`DELETE FROM classes WHERE id = ?`).run(classId);
}

function addStudentToClass(studentId, name, classId) {
  const code = generateUniqueCode();
  db.prepare(`INSERT INTO roster_students (id, name, class_id, code) VALUES (?, ?, ?, ?)`).run(studentId, name, classId, code);
  return code;
}

function getClassStudents(classId) {
  return db.prepare(`SELECT * FROM roster_students WHERE class_id = ? ORDER BY name`).all(classId);
}

function removeStudentFromClass(studentId) {
  db.prepare(`DELETE FROM roster_students WHERE id = ?`).run(studentId);
}

function updateClassName(classId, name) {
  db.prepare(`UPDATE classes SET name = ? WHERE id = ?`).run(name, classId);
}

function updateStudentName(studentId, name) {
  db.prepare(`UPDATE roster_students SET name = ? WHERE id = ?`).run(name, studentId);
}

module.exports = {
  createSession, endSession, recordAttendance, recordAnswer, recordFinalScores,
  getAllSessions, getSession, getSessionAttendance, getSessionScores, getSessionAnswers,
  getStudentHistory, lookupStudentByCode, generateUniqueCode, assignMissingCodes,
  createClass, getAllClasses, getClass, deleteClass,
  addStudentToClass, getClassStudents, removeStudentFromClass,
  updateClassName, updateStudentName
};
