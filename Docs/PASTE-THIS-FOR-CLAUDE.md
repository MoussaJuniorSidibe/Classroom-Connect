# CLASSROOM CONNECT — Project Context for Claude

## IMPORTANT: How to start a session with Claude
This file alone is NOT enough for Claude to build correctly. The project is a system of interrelated elements — code files reference each other through shared event names, variable names, CSS patterns, and architecture. Claude needs to see the actual code to build anything that matches.

**Every new session, Moussa must share THREE things:**

1. **This file** — paste it first for the big picture
2. **The relevant code files** — paste the actual code from the files that the feature will touch. Open them in VS Code, Ctrl+A to select all, copy, and paste with a label like "Here is server.js:" before each one.
3. **What you want to work on** — be specific about the feature or fix

**Which code files to share depends on the task:**
- Working on the live session or quiz logic → share `server.js`, `teacher.html`, `student.html`
- Working on the lesson builder → share `server.js`, `builder.html`
- Working on translations/language → share `i18n.js` plus whichever HTML files are affected
- Working on the database or data features → share `database.js`, `server.js`
- Working on roster management → share `roster.html`, `server.js`, `database.js`
- Working on session history → share `history.html`, `server.js`, `database.js`
- Working on student codes (connecting roster to live sessions) → share `server.js`, `student.html`, `teacher.html`, `roster.html`, `database.js`
- Working on cloud sync → share `database.js`, `server.js` (requires planning conversation first — see Cloud Sync section)
- Adding a new feature that touches everything → share all files
- Fixing a bug → share the file(s) with the bug plus the error message

**If the files are too long for one message**, split them across messages or share the most relevant ones first. Claude should ask for any additional files it needs.

**Claude: when you receive this file, if Moussa has not shared the code files, ask him to paste the relevant ones before building anything.**

---

## What is this?
Classroom Connect is an offline-first interactive classroom learning platform. A teacher creates lessons (content slides + interactive question slides), delivers them live over a local WiFi hotspot, and students participate from their phone browsers — no internet required. Think of it as an offline Kahoot fused with a presentation tool.

## Who is building this?
- **Moussa Junior Sidibe** (designer, product owner) — Fulbright scholar from Côte d'Ivoire, MS in Instructional Design from Syracuse University. Limited programming skills. Defines features, tests code, makes design decisions.
- **Claude** (developer) — Writes all code, explains technical decisions, debugs issues, suggests architecture.

## Collaboration Rules
- When Moussa wants to discuss or learn, Claude stays in discussion mode. No building until Moussa gives a clear signal like "let's build this" or "code it."
- When Moussa flags something as a concern, Claude explains first whether it's an actual issue or expected behavior at this stage, and they decide together before touching code.
- Claude explains technical concepts in plain language as we build.
- At the end of each session, Claude reminds Moussa to update this file and push to GitHub.
- Claude always provides complete files — never asks Moussa to make manual code edits.

## Target Users
- Teachers in K–12 and tertiary education, particularly in Côte d'Ivoire and Francophone West Africa
- Students aged 10+ with access to any device with a browser
- Class size: up to 40 students
- Languages: Bilingual French and English

## Tech Stack
- **Language:** JavaScript (one language for everything)
- **Server (teacher's device):** Node.js + Express
- **Real-time communication:** Socket.IO
- **Database:** SQLite via better-sqlite3 (local on teacher's device)
- **Student interface:** HTML/CSS (served from teacher's device, opens in browser)
- **Translations:** Shared i18n.js file loaded by all HTML pages
- **Lesson storage:** JSON files saved in /lessons/ directory
- **Image storage:** Uploaded images saved in /uploads/ directory
- **Mobile packaging:** Capacitor (Phase 4)
- **Cloud sync:** Supabase or Firebase (Phase 3 Step 4 — not yet built, requires planning)

## How the Local Network Works
1. Teacher opens the app and enables WiFi hotspot (or uses a portable router for 40+ students)
2. App starts a local server and displays a session code/IP address
3. Students connect to the hotspot and open the address in any browser
4. All communication flows over this local network via Socket.IO — no internet needed
5. Data saves locally on teacher's device (SQLite database) and syncs to cloud when internet is available (future)

## Key Architecture Details (for Claude)

### Socket.IO events
student-join, start-session (sends lessonId), next-slide, submit-answer, answer-received, answer-result, show-results, question-results, content-slide, teacher-slide-info, session-started, session-ended, student-list, answer-status, detailed-answer-status

### REST API endpoints
**Lessons:** GET /api/lessons, GET /api/lessons/:id, POST /api/lessons, DELETE /api/lessons/:id
**Images:** POST /api/upload-image (accepts { filename, data } as base64)
**Sessions:** GET /api/sessions, GET /api/sessions/:id (returns session + attendance + scores + answers)
**Classes:** GET /api/classes, POST /api/classes, PUT /api/classes/:id, DELETE /api/classes/:id
**Students:** GET /api/classes/:id/students, POST /api/classes/:id/students, PUT /api/students/:id, DELETE /api/students/:id

### Database tables (SQLite — classroom-connect.db)
- **classes** — id, name, created_at
- **roster_students** — id, name, class_id, created_at
- **sessions** — id, lesson_id, lesson_title, class_id, total_slides, total_questions, started_at, ended_at
- **session_attendance** — id, session_id, student_name, joined_at
- **session_answers** — id, session_id, student_name, question_index, question_text, answer_index, is_correct, points, response_time_ms
- **session_scores** — id, session_id, student_name, total_score, correct_count, total_answered

### Translation system
All UI text uses t("key") and tFormat("key", args) functions from i18n.js. New features must add translation keys to both en and fr objects in i18n.js.

### Language toggle
Button with class "lang-toggle" in top-right corner of every page. Calls toggleLanguage(). Language saved in localStorage as "cc-lang".

### UI pattern
Dark theme (#0f172a background, #1e293b cards, #334155 borders). Buttons use gradients. Blue (#3b82f6) and purple (#8b5cf6) as primary colors. Student interface optimized for 420px phone width.

## Core Features — What's Built

### Teacher Features
- **Lesson Builder:** Create lessons with content slides (text + images) and question slides (MCQ, True/False) — BUILT
- **Live Session:** Select a lesson, start session, advance through slides, push questions, view live response dashboard with individual student name tracking — BUILT
- **Teacher-controlled reveal:** Students wait after answering; teacher clicks "Reveal Answer" — BUILT
- **Leaderboard:** End-of-lesson rankings based on correctness and speed (Kahoot-style scoring) — BUILT
- **Bilingual interface:** French/English toggle on all screens — BUILT
- **Student Roster:** Create classes, add/edit/delete students — BUILT (not yet connected to live sessions)
- **Session History:** View past sessions with attendance, scores, and question breakdown — BUILT
- **Database:** All session data (attendance, answers, scores) saved permanently to SQLite — BUILT

### Student Features
- Join via browser (no app install, no account) — BUILT
- View content slides (with images) on their device as teacher presents — BUILT
- Answer questions with timer and immediate lock — BUILT
- Feedback after teacher reveals — BUILT
- Final leaderboard with rankings — BUILT
- Bilingual French/English toggle — BUILT

### Scoring System
- 1000 base points per correct answer
- Up to 500 speed bonus points
- Leaderboard updates after each question

## Build Phases

### Phase 1: Live Quiz Session — COMPLETE
Server, Socket.IO, lobby, quiz engine, scoring, leaderboard, teacher-controlled reveal, per-student tracking

### Phase 2: Lesson Builder & Content Delivery — COMPLETE
Lesson builder with content/question slides, lesson saving/loading/deleting, teacher selects lesson, content slide delivery to students, image support in content slides, bilingual French/English toggle

### Phase 3: Data, Storage & Cloud Sync — IN PROGRESS (Steps 1-3 complete)
- **Step 1: Local database — COMPLETE.** SQLite via better-sqlite3. All session data saved permanently.
- **Step 2: Student roster management — COMPLETE.** Create classes, add/edit/delete students. Data saved to database.
- **Step 3: Session history and reports — COMPLETE.** View past sessions with attendance, scores, question breakdown.
- **Step 4: Cloud sync — NOT STARTED.** Requires planning conversation before building. See Cloud Sync section below.
- **NEXT TO BUILD: Student codes** — Connect the roster to live sessions. Each student gets a unique 4-digit code. They type their code when joining instead of picking from a list. This links roster data to session data for tracking performance over time.

### Phase 4: Polish, Packaging & Launch
- Capacitor packaging for Android and iOS
- PWA version for browser access
- **UI/UX overhaul and brand identity** (see UI Vision section)
- Additional question types
- Exportable reports
- Performance optimization for low-end devices
- User testing with real teachers

## Student Codes Feature (Next to Build)
Each student in the roster gets a unique short code (4-digit number). The teacher can print or share these codes. When joining a live session, students type their code instead of their name. The system looks up who they are from the roster. This ensures:
- Consistent tracking across sessions (same student identity every time)
- No typos or duplicate names
- No risk of accidentally selecting someone else's name
- Simple and fast for students on any device

## Cloud Sync — REQUIRES PLANNING BEFORE BUILDING
**DO NOT start building cloud sync without a planning conversation with Moussa first.**

Cloud sync is the most technically complex feature. It requires:
- Choosing between Supabase and Firebase (discussion needed on pros/cons for this use case)
- Setting up an external account and configuring the service
- Designing the sync logic (what syncs, when, conflict resolution)
- Handling authentication (teacher accounts)
- Testing connectivity detection and sync-when-available behavior

This should be a dedicated session with a planning conversation before any code is written.

## UI & Branding Vision

**IMPORTANT — Claude must read this section and act on it when Phase 4 begins.**

The current UI is functional scaffolding — not the final product. By Phase 4, Classroom Connect needs a complete visual overhaul with a real brand identity, custom icons, and polished design.

**CLAUDE ACTION ITEM — When Phase 4 begins, prompt Moussa with this:**
"Before we start the UI overhaul, I need you to collect visual references. Screenshot apps, websites, or designs you think feel right for Classroom Connect — the colors, the mood, the energy, the style. Also think about whether you want to create custom illustrations or icons that give the app a distinctive look. Share those references with me and describe what you want. That will be much more productive than me guessing at your taste."

## Debugging & Development Process
- Moussa tests all code on real devices and reports issues
- Claude fixes bugs based on error messages and described circumstances
- We iterate: build, test, report, fix, repeat
- Claude always provides complete files, never asks Moussa to make manual edits
- This process can yield a fully functional app without hiring programmers
- For production deployment with many users, a code review by a developer is recommended

## Project Repository
GitHub: github.com/MoussaJuniorSidibe/Classroom-Connect

## .gitignore (protects private data from GitHub)
```
node_modules/
classroom-connect.db
classroom-connect.db-wal
classroom-connect.db-shm
uploads/
lessons/
```

## Current Project File Structure
```
Classroom-Connect/
  server.js             — Node.js server (Express + Socket.IO + all API endpoints)
  database.js           — SQLite database module (tables, queries, data access)
  package.json          — Dependencies (express, socket.io, better-sqlite3)
  .gitignore            — Excludes node_modules, database, uploads, lessons from GitHub
  classroom-connect.db  — SQLite database file (local only, not on GitHub)
  node_modules/         — Installed libraries (local only, not on GitHub)
  lessons/              — Saved lesson JSON files (local only, not on GitHub)
  uploads/              — Uploaded images (local only, not on GitHub)
  Docs/                 — Project documentation
    PASTE-THIS-FOR-CLAUDE.md  — This file (context for Claude sessions)
    Classroom-Connect-Project-Documentation.docx  — Full project doc (v1)
    Classroom-Connect-Project-Documentation v2.docx — Full project doc (v2)
  public/               — Files served to browsers (all bilingual FR/EN)
    i18n.js             — Shared translations (English + French)
    teacher.html        — Teacher dashboard (lobby, lesson select, live session, results)
    student.html        — Student interface (join, view slides, answer, leaderboard)
    builder.html        — Lesson builder (create/edit lessons with content + question slides + images)
    roster.html         — Student roster (create classes, manage student lists)
    history.html        — Session history (view past sessions, attendance, scores, question breakdown)
```

## Current Status
<!-- UPDATE THIS SECTION AFTER EACH SESSION -->
- **Current Phase:** Phase 3 — Steps 1-3 complete. Step 4 (cloud sync) saved for separate session.
- **Last Session:** April 30, 2026 — Built database, roster management, session history, cleaned up .gitignore
- **Next Step:** Build student codes feature (connect roster to live sessions), then plan cloud sync

## Session Log
<!-- ADD NEW ENTRIES AFTER EACH SESSION -->
| Date | What Was Done | Next Steps |
|------|--------------|------------|
| April 30, 2026 | Setup: GitHub repo, Git, VS Code, Node.js, project docs | Begin Phase 1 |
| April 30, 2026 | Phase 1: Server, lobby, quiz engine, scoring, leaderboard, teacher-controlled reveal, per-student tracking | Begin Phase 2 |
| April 30, 2026 | Phase 2: Lesson builder, content/question slides, lesson saving/loading, teacher lesson selection, content delivery | Add bilingual toggle |
| April 30, 2026 | Phase 2: Bilingual French/English toggle across all interfaces | Add image support |
| April 30, 2026 | Phase 2 COMPLETE: Image support in content slides, emoji fix | Begin Phase 3 |
| April 30, 2026 | Phase 3 Step 1: SQLite database — sessions, attendance, answers, scores saved permanently | Step 2: Roster |
| April 30, 2026 | Phase 3 Step 2: Student roster management — classes and student lists with database storage | Step 3: History |
| April 30, 2026 | Phase 3 Step 3: Session history page — view past sessions with attendance, scores, question breakdown | Build student codes, plan cloud sync |
| April 30, 2026 | Cleaned .gitignore — removed uploads, lessons, database from GitHub tracking | Update documentation |
