# CLASSROOM CONNECT — Project Context for Claude

## IMPORTANT: How to start a session with Claude
This file alone is NOT enough for Claude to build correctly. The project is a system of interrelated elements — code files reference each other through shared event names, variable names, CSS patterns, and architecture. Claude needs to see the actual code to build anything that matches.

**Every new session, Moussa shares THREE things:**

1. **This file** — for the big picture
2. **The relevant code files** — drag-and-drop the actual files (server.js, database.js, contents of public/, etc.) so Claude can read them. Pasting code in the message body also works but uploading is cleaner.
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

**Claude: when you receive this file, if Moussa has not shared the code files, ask him to upload the relevant ones before building anything.**

A separate guide called `How-to-Start-a-New-Claude-Session.docx` lives in the Docs/ folder and walks Moussa through the process step-by-step.

---

## What is this?
Classroom Connect is an offline-first interactive classroom learning platform. A teacher creates lessons (content slides + interactive question slides), delivers them live over a local WiFi hotspot, and students participate from their phone browsers — no internet required. Think of it as an offline Kahoot fused with a presentation tool.

## Who is building this?
- **Moussa Junior Sidibe** (designer, product owner) — Fulbright scholar from Côte d'Ivoire, MS in Instructional Design from Syracuse University. Limited programming skills. Defines features, tests code, makes design decisions.
- **Claude** (developer) — Writes all code, explains technical decisions, debugs issues, suggests architecture. Also acts as a mentor — explains technical concepts in plain language so Moussa can make informed decisions.

## Collaboration Rules
- When Moussa wants to discuss or learn, Claude stays in discussion mode. No building until Moussa gives a clear signal like "let's build this" or "code it."
- When Moussa flags something as a concern, Claude explains first whether it's an actual issue or expected behavior at this stage, and they decide together before touching code.
- **When Claude sees a better approach than what's been proposed, Claude raises it openly and explains the trade-offs.** Moussa is the designer and makes the final call, but he relies on Claude to surface developer-side options he might not see. Don't stay quiet about a better path.
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
- **QR code generation:** `qrcode` npm package (server-side, returns data URL)
- **Reports export:** `exceljs` npm package (planned — replacing the interim CSV implementation with .xlsx)
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
5. Students scan a **QR code** displayed on the teacher's screen — the student page opens in their browser (BUILT)
6. Students enter their 4-digit code (or, for open sessions, their name) and they're in the session
7. All communication flows over this local network via Socket.IO — no internet needed
8. Data saves locally on the teacher's device (SQLite database)

### Important: Students never install an app
Students only need a browser. The teacher's device serves the student page directly over the local network. This means:
- iPhones, Android phones, tablets, old phones, borrowed devices — all work
- No app download, no account creation, no storage space needed on student devices
- The only device that runs the Classroom Connect app is the teacher's device

### QR Code for Student Joining (BUILT — Phase 4 Step 2)
The teacher's screen displays a QR code that students scan to open the student page instantly. This replaces the need to type an IP address manually. Backed by the `qrcode` npm package; the server generates a data URL via `/api/server-info` and the teacher dashboard renders it inline.

## Key Architecture Details (for Claude)

### Socket.IO events
student-join, student-join-code, join-success, join-error, join-mode (server → client; tells students to use code or name screen based on whether teacher has a class selected), select-class (teacher → server), start-session (sends {lessonId, classId}), next-slide, submit-answer, answer-received, answer-result, show-results, question-results, content-slide, teacher-slide-info, session-started, session-ended, student-list, answer-status, detailed-answer-status

### REST API endpoints
**Lessons:** GET /api/lessons, GET /api/lessons/:id, POST /api/lessons, DELETE /api/lessons/:id
**Images:** POST /api/upload-image (accepts { filename, data } as base64)
**Sessions:** GET /api/sessions, GET /api/sessions/:id (returns session + attendance + scores + answers)
**Session Export:** GET /api/sessions/:id/export — currently returns CSV with UTF-8 BOM; will be upgraded to return an .xlsx workbook (multi-sheet, formatted)
**Server Info & QR Code:** GET /api/server-info — returns local IP, port, student URL, and QR code data URL
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
- Fallback: students without a code can join by typing their name (only allowed when no class is selected)
- The student join page shows code input by default when a class is selected; switches to name input when no class is selected (controlled by the server's `join-mode` event)

### Class-aware session logic (BUILT — Phase 4 Step 2 companion fix)
- When the teacher selects a class on the dashboard, the server emits `join-mode: { usesCodes: true }` to all connected students. Their join screen switches to code-only.
- When the teacher selects "no class," the server emits `join-mode: { usesCodes: false }`. Students see the name screen.
- Code-based joins are validated: if a class is selected, the code must belong to a student in that class (otherwise `join-error: "wrong-class"`).
- Name-based joins are rejected outright when a class is selected (`join-error: "class-required"`).

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
- **QR Code on Teacher Dashboard:** Students scan to open student page — BUILT (tested May 5, 2026)
- **Class-aware session logic:** Class selected = code-only with validation; no class = name-only — BUILT (tested May 5, 2026)
- **Session Export:** Download session results — BUILT as CSV (May 1, 2026); upgrading to .xlsx (in progress)

### Student Features
- Join via QR code, then 4-digit code (or name as fallback) in browser — BUILT
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

### Phase 4: Polish, Packaging & Launch — IN PROGRESS
- **Step 1: Exportable Reports — COMPLETE ✓ (CSV) / xlsx upgrade IN PROGRESS.** Built initially as CSV with UTF-8 BOM (May 1, 2026) for fast turnaround. Decision made May 5, 2026 to upgrade to .xlsx for a teacher-friendly format: multiple sheets (Scores / Attendance / Question Breakdown), proper number/percentage/date cell types, bold headers, frozen first row, color-highlighted top 3. The xlsx version replaces the CSV. Library: `exceljs`. This is the immediate next code task.
- **Step 2: QR Code for Student Joining — COMPLETE ✓ (built and tested May 2026).** Teacher dashboard displays a QR code that students scan to open the student page. Eliminates typing IP addresses. Implementation also bundled a class/code logic fix: class selected = code-only join with class-match validation; no class = name-only join. Server broadcasts `join-mode` so the student screen reflects the teacher's selection in real time.
- **Step 3: Additional Question Types — NEXT.** Add at least short answer and/or image-based questions to give teachers more flexibility in lesson design. To be discussed before building: which types, how grading works (especially for short answer — exact match, case-insensitive, multiple acceptable answers?), and how each fits into builder.html and the live flow in teacher.html / student.html.
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

**IMPORTANT — Claude must read this section and act on it when Phase 4 Step 5 begins.**

The current UI is functional scaffolding — not the final product. By Phase 4 Step 5, Classroom Connect needs a complete visual overhaul with a real brand identity, custom icons, and polished design.

**CLAUDE ACTION ITEM — When Phase 4 Step 5 begins, prompt Moussa with this:**
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
  server.js             — Node.js server (Express + Socket.IO + all API endpoints, including QR code and export)
  database.js           — SQLite database module (tables, queries, student codes, data access)
  package.json          — Dependencies (express, socket.io, better-sqlite3, qrcode; exceljs to be added)
  .gitignore            — Excludes node_modules, database, uploads, lessons from GitHub
  classroom-connect.db  — SQLite database file (local only, not on GitHub)
  node_modules/         — Installed libraries (local only, not on GitHub)
  lessons/              — Saved lesson JSON files (local only, not on GitHub)
  uploads/              — Uploaded images (local only, not on GitHub)
  Docs/                 — Project documentation
    PASTE-THIS-FOR-CLAUDE.md  — This file (context for Claude sessions)
    How-to-Start-a-New-Claude-Session.docx — Step-by-step guide for Moussa
    Classroom-Connect-Project-Documentation-v5.docx — Full project doc (current — V5)
    [older versions kept for history: v1, v2, v3, v4]
  public/               — Files served to browsers (all bilingual FR/EN)
    i18n.js             — Shared translations (English + French)
    teacher.html        — Teacher dashboard (lobby with QR, lesson + class select, live session, results)
    student.html        — Student interface (code/name join controlled by server, slides, answers, leaderboard)
    builder.html        — Lesson builder (content + question slides + images)
    roster.html         — Student roster (classes, students with 4-digit codes)
    history.html        — Session history (attendance, scores, question breakdown, export button)
```

## Current Status
<!-- UPDATE THIS SECTION AFTER EACH SESSION -->
- **Current Phase:** Phase 4 — Steps 1 and 2 COMPLETE. Step 1 (export) being upgraded from CSV to .xlsx as the immediate next code task. Step 3 (Additional Question Types) is queued after the xlsx upgrade.
- **Last Session:** May 5, 2026 — Verified Phase 4 Step 2 (QR code + class/code logic) working in real testing. Decided to upgrade Step 1 export from CSV to .xlsx for a teacher-friendly format (multiple sheets, formatted cells, bold headers, frozen rows). Rebuilt project documentation as Version 5.0 (.docx) and refreshed this file. Added explicit "Claude raises better approaches" rule to the Collaboration Rules section.
- **Next Step:** Build the .xlsx export upgrade using `exceljs`, then move to Phase 4 Step 3 (Additional Question Types) — discussion first, then build.

## Priority Order Going Forward
1. .xlsx export upgrade (immediate)
2. Phase 4 Step 3: Additional Question Types (discuss → build)
3. Phase 4 Step 4: User Testing
4. Phase 4 Steps 5–7 in order
5. Cloud sync with Supabase comes after Phase 4, whenever it becomes needed.

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
| May 1, 2026 | Phase 4 Step 1: Built CSV export endpoint (`/api/sessions/:id/export`) with UTF-8 BOM for French character support, download button on session history page | Phase 4 Step 2 |
| May 1, 2026 | Phase 4 Step 2: Built QR code on teacher dashboard via `qrcode` npm package and `/api/server-info`. Companion fix: class/code session logic — class selected = code-only with class-match validation; no class = name-only. Server broadcasts `join-mode`. Renamed Public to public for Linux compatibility. Created session transition guide. | Test class/code fix |
| May 5, 2026 | Verified Phase 4 Step 2 working in real testing. Decided to upgrade Step 1 export from CSV to .xlsx (teacher-friendly: multi-sheet, formatted, typed cells). Rebuilt project documentation as Version 5.0 (.docx). Refreshed this file. Added explicit "Claude raises better approaches" rule to the Collaboration Rules section. | Build .xlsx export upgrade, then Phase 4 Step 3 (Question Types) |
