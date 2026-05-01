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
- Working on cloud sync → share `database.js`, `server.js` (requires planning conversation first — see Cloud Sync section)
- Working on Capacitor packaging → share `server.js`, `package.json`
- Adding a new feature that touches everything → share all files
- Fixing a bug → share the file(s) with the bug plus the error message

**If the files are too long for one message**, split them across messages or share the most relevant ones first. Claude should ask for any additional files it needs.

**Claude: when you receive this file, if Moussa has not shared the code files, ask him to paste the relevant ones before building anything.**

---

## What is this?
Classroom Connect is an offline-first interactive classroom learning platform. A teacher creates lessons (content slides + interactive question slides), delivers them live over a local WiFi hotspot, and students participate from their phone browsers — no internet required. Think of it as an offline Kahoot fused with a presentation tool.

## Who is building this?
- **Moussa Junior Sidibe** (designer, product owner) — Fulbright scholar from Côte d'Ivoire, MS in Instructional Design from Syracuse University. Limited programming skills. Defines features, tests code, makes design decisions.
- **Claude** (developer) — Writes all code, explains technical decisions, debugs issues, suggests architecture. Also acts as a mentor — explains technical concepts in plain language so Moussa can make informed decisions.

## Collaboration Rules
- When Moussa wants to discuss or learn, Claude stays in discussion mode. No building until Moussa gives a clear signal like "let's build this" or "code it."
- When Moussa flags something as a concern, Claude explains first whether it's an actual issue or expected behavior at this stage, and they decide together before touching code.
- Claude explains technical concepts in plain language as we build.
- At the end of each session, Claude tells Moussa exactly what to update in this file and gives the Git commands to push to GitHub.
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
- **Mobile packaging:** Capacitor (Phase 4 — for teacher's device only)
- **Cloud sync:** Supabase recommended (postponed — see Cloud Sync section)

## How the App Works — The Offline Model

**This is the core design principle of Classroom Connect: everything works without internet.**

Every architecture choice — SQLite, Socket.IO over local WiFi, local file storage — was made specifically so the app runs fully offline. Offline is not a feature we add. It's how the app already works.

### How a session runs:
1. Teacher opens the Classroom Connect app on their device (phone, tablet, or laptop)
2. Teacher enables WiFi hotspot (or uses a portable router for 40+ students)
3. The app starts a local server automatically
4. Students connect their phones to the teacher's WiFi — any phone with a browser works
5. Students scan a **QR code** displayed on the teacher's screen (Phase 4 feature) — the student page opens in their browser
6. Students enter their 4-digit code and they're in the session
7. All communication flows over this local network via Socket.IO — no internet needed
8. Data saves locally on the teacher's device (SQLite database)

### Important: Students never install an app
Students only need a browser. The teacher's device serves the student page directly over the local network. This means:
- iPhones, Android phones, tablets, old phones, borrowed devices — all work
- No app download, no account creation, no storage space needed on student devices
- The only device that runs the Classroom Connect app is the teacher's device

### QR Code for Student Joining (Phase 4)
**Decided:** The teacher's screen will display a QR code that students scan to open the student page instantly. This replaces the need to type an IP address manually. This is the chosen method — more professional and easier for students.

## Key Architecture Details (for Claude)

### Socket.IO events
student-join, student-join-code, join-success, join-error, start-session (sends {lessonId, classId}), next-slide, submit-answer, answer-received, answer-result, show-results, question-results, content-slide, teacher-slide-info, session-started, session-ended, student-list, answer-status, detailed-answer-status

### REST API endpoints
**Lessons:** GET /api/lessons, GET /api/lessons/:id, POST /api/lessons, DELETE /api/lessons/:id
**Images:** POST /api/upload-image (accepts { filename, data } as base64)
**Sessions:** GET /api/sessions, GET /api/sessions/:id (returns session + attendance + scores + answers)
**Classes:** GET /api/classes, POST /api/classes, PUT /api/classes/:id, DELETE /api/classes/:id
**Students:** GET /api/classes/:id/students, POST /api/classes/:id/students, PUT /api/students/:id, DELETE /api/students/:id
**Code lookup:** GET /api/lookup-code/:code (returns student name, code, class info)

### Database tables (SQLite — classroom-connect.db)
- **classes** — id, name, created_at
- **roster_students** — id, name, class_id, code (unique 4-digit), created_at
- **sessions** — id, lesson_id, lesson_title, class_id, total_slides, total_questions, started_at, ended_at
- **session_attendance** — id, session_id, student_name, student_code, joined_at
- **session_answers** — id, session_id, student_name, student_code, question_index, question_text, answer_index, is_correct, points, response_time_ms
- **session_scores** — id, session_id, student_name, student_code, total_score, correct_count, total_answered

### Student Codes System
- Each student in the roster automatically gets a unique 4-digit code (1000-9999)
- Codes are generated on student creation and displayed on the roster page
- Students type their code to join a session — the system looks up their name
- Fallback: students without a code can join by typing their name (for sessions without a class selected)
- The student join page shows code input by default, with a link to switch to name input

### Translation system
All UI text uses t("key") and tFormat("key", args) functions from i18n.js. New features must add translation keys to both en and fr objects in i18n.js.

### Language toggle
Button with class "lang-toggle" in top-right corner of every page. Calls toggleLanguage(). Language saved in localStorage as "cc-lang".

### UI pattern
Dark theme (#0f172a background, #1e293b cards, #334155 borders). Buttons use gradients. Blue (#3b82f6) and purple (#8b5cf6) as primary colors. Student interface optimized for 420px phone width.

## Core Features — What's Built

### Teacher Features
- **Lesson Builder:** Create lessons with content slides (text + images) and question slides (MCQ, True/False) — BUILT
- **Live Session:** Select a lesson AND optionally a class, start session, advance through slides, push questions, view live dashboard — BUILT
- **Teacher-controlled reveal:** Students wait after answering; teacher clicks "Reveal Answer" — BUILT
- **Leaderboard:** End-of-lesson rankings based on correctness and speed — BUILT
- **Bilingual interface:** French/English toggle on all screens — BUILT
- **Student Roster:** Create classes, add/edit/delete students, each student gets unique 4-digit code — BUILT
- **Student Codes:** Roster connected to live sessions via code-based joining — BUILT
- **Session History:** View past sessions with attendance, scores, and question breakdown — BUILT
- **Database:** All session data saved permanently to SQLite, linked to student codes — BUILT

### Student Features
- Join via 4-digit code (or name as fallback) in browser — BUILT
- View content slides (with images) on their device — BUILT
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

### Phase 3: Data & Storage — COMPLETE (Cloud Sync Postponed)
- **Step 1: Local database — COMPLETE.** SQLite via better-sqlite3. All session data saved permanently.
- **Step 2: Student roster management — COMPLETE.** Create classes, add/edit/delete students with auto-generated codes.
- **Step 3: Session history and reports — COMPLETE.** View past sessions with attendance, scores, question breakdown.
- **Student codes — COMPLETE.** Roster connected to live sessions. Students join with 4-digit codes. Teacher optionally selects a class when starting session.
- **Cloud sync — POSTPONED.** Not cancelled, just not needed yet. Can be added at any stage, even after the app is fully packaged and in use. See Cloud Sync section.

### Phase 4: Polish, Packaging & Launch — LOCKED PLAN
- **Step 1: Exportable Reports — NOT STARTED.** Add download button on session history page. Exports session results as a spreadsheet (.xlsx) — student names, scores, per-question breakdown. Works fully offline (generated on the server, downloaded via browser). Makes the app immediately useful for real grading workflows.
- **Step 2: QR Code for Student Joining — NOT STARTED.** Teacher dashboard displays a QR code that students scan to open the student page. Eliminates typing IP addresses. Already decided as the chosen method.
- **Step 3: Additional Question Types — NOT STARTED.** Add at least short answer and/or image-based questions to give teachers more flexibility in lesson design.
- **Step 4: User Testing — NOT STARTED.** Pause building. Test with a small group of real users (even 2-3 friends or a colleague). Collect feedback. Fix what comes up before continuing.
- **Step 5: UI/UX Overhaul — NOT STARTED.** Complete visual redesign with real brand identity. Requires Moussa to collect visual references first (see UI Vision section).
- **Step 6: Capacitor Packaging — NOT STARTED.** Wrap the app into an installable Android app. Teacher taps an icon, everything runs. Android first, iOS if demand exists (requires Mac + $99/yr Apple Developer account).
- **Step 7: Pilot Launch — NOT STARTED.** Put it in the hands of real teachers in a real classroom.

## Packaging & Platform Strategy (Phase 4)

**Capacitor packaging is only for the teacher's device.** It wraps the entire app (server, database, everything) into an installable app. Teacher taps an icon, the server starts automatically, students connect. No terminal, no `node server.js` required.

**Students never install an app.** They use their phone's browser. Any device with a browser works — iPhone, Android, tablet, old phone, anything.

**Platform rollout order:**
1. **Android first** — covers the vast majority of target users in Côte d'Ivoire and West Africa. Capacitor builds Android apps.
2. **iOS if needed** — Capacitor supports iOS, but building requires a Mac computer and an Apple Developer account ($99/year). Add when there's demand.
3. **Desktop packaging (optional, future)** — if a "double-click to launch" experience is ever needed on Windows/Mac, a different tool (Electron) would be used. Not a priority since teachers can use the Android app on a phone or tablet.

## Cloud Sync — POSTPONED (Build When Ready)

**Status: Postponed by decision.** The app works fully without cloud sync. It can be added at any stage — even after the app is packaged, polished, and in use by real teachers — without restructuring any existing code.

**Why it's safe to add later:** The local database is well-structured with clean tables, unique IDs, and clear relationships. Cloud sync is an additional module that copies data between local SQLite and cloud when internet is available. It sits alongside the existing code, doesn't replace anything.

**Recommended service: Supabase** — open-source, uses PostgreSQL (matches our SQL-based local database), generous free tier (500MB storage, 50K monthly users — more than enough). Free for our use case.

**When Moussa is ready to build it:**
1. Go to supabase.com and create a free account
2. Create a new project (pick any name and a strong password)
3. Copy the project URL and the anon/public API key from project settings
4. Start a Claude session with this file + database.js + server.js
5. Tell Claude: "I want to add cloud sync using Supabase. Here is my project URL and API key."

**What Claude will build:**
- Supabase client integration in the server
- Cloud database tables mirroring the local SQLite schema
- Sync logic: detect connectivity, push new local data to cloud, pull updates
- Manual sync button on teacher dashboard + sync status indicator
- Teacher account/authentication for cloud access
- Conflict resolution (last-edit-wins for v1)

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
- At the end of each session, Claude tells Moussa what to update in this file and gives Git push commands
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
  database.js           — SQLite database module (tables, queries, student codes, data access)
  package.json          — Dependencies (express, socket.io, better-sqlite3)
  .gitignore            — Excludes node_modules, database, uploads, lessons from GitHub
  classroom-connect.db  — SQLite database file (local only, not on GitHub)
  node_modules/         — Installed libraries (local only, not on GitHub)
  lessons/              — Saved lesson JSON files (local only, not on GitHub)
  uploads/              — Uploaded images (local only, not on GitHub)
  Docs/                 — Project documentation
    PASTE-THIS-FOR-CLAUDE.md  — This file (context for Claude sessions)
    Classroom-Connect-Project-Documentation.docx — Full project doc (v1)
    Classroom-Connect-Project-Documentation v2.docx — Full project doc (v2)
    Classroom-Connect-Project-Documentation-v3.docx — Full project doc (v3)
  public/               — Files served to browsers (all bilingual FR/EN)
    i18n.js             — Shared translations (English + French)
    teacher.html        — Teacher dashboard (lobby, lesson + class select, live session, results)
    student.html        — Student interface (code join, name fallback, slides, answers, leaderboard)
    builder.html        — Lesson builder (content + question slides + images)
    roster.html         — Student roster (classes, students with 4-digit codes)
    history.html        — Session history (attendance, scores, question breakdown)
```

## Current Status
<!-- UPDATE THIS SECTION AFTER EACH SESSION -->
- **Current Phase:** Phase 4 — Step 1 (Exportable Reports) COMPLETE. Step 2 (QR Code) is next.
- **Last Session:** May 1, 2026 — Built Phase 4 Step 1: export button on session history page, CSV download with scores and question breakdown, bilingual, works offline
- **Next Step:** Phase 4 Step 2 — QR Code for Student Joining (teacher.html + server.js)

## Priority Order Going Forward
Follow the Phase 4 step-by-step plan above (Steps 1-7). Cloud sync with Supabase comes after Phase 4, whenever it becomes needed.

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
| April 30, 2026 | Phase 3 Step 3: Session history page — attendance, scores, question breakdown | Student codes |
| April 30, 2026 | Phase 3: Student codes — 4-digit codes, roster connected to live sessions, teacher class selection | Cloud sync (new session) |
| April 30, 2026 | Planning session: Postponed cloud sync, chose QR code for student joining, clarified packaging strategy (Android first, teacher-only app, students use browser), locked Phase 4 step-by-step plan (7 steps from exportable reports through pilot launch) | Phase 4 Step 1: Exportable Reports |
| May 1, 2026 | Phase 4 Step 1 COMPLETE: Export button on session history, CSV download with scores + question breakdown, UTF-8 for French, works fully offline | Phase 4 Step 2: QR Code |