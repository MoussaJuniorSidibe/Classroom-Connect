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
- Claude explains technical concepts in plain language as we build.
- At the end of each session, Claude reminds Moussa to update this file and push to GitHub.

## Target Users
- Teachers in K–12 and tertiary education, particularly in Côte d'Ivoire and Francophone West Africa
- Students aged 10+ with access to any device with a browser
- Class size: up to 40 students
- Languages: Bilingual French and English

## Tech Stack
- **Language:** JavaScript/TypeScript (one language for everything)
- **Server (teacher's device):** Node.js + Express
- **Real-time communication:** Socket.IO
- **Student interface:** HTML/CSS (served from teacher's device, opens in browser)
- **Translations:** Shared i18n.js file loaded by all HTML pages
- **Local database:** SQLite / IndexedDB (Phase 3)
- **Mobile packaging:** Capacitor (Phase 4)
- **Cloud sync:** Supabase or Firebase (Phase 3)
- **Lesson storage (current):** JSON files saved in /lessons/ directory on teacher's device

## How the Local Network Works
1. Teacher opens the app and enables WiFi hotspot (or uses a portable router for 40+ students)
2. App starts a local server and displays a session code/IP address
3. Students connect to the hotspot and open the address in any browser
4. All communication flows over this local network via Socket.IO — no internet needed
5. Data saves locally on teacher's device and syncs to cloud when internet is available later

## Key Architecture Details (for Claude)
- **Socket.IO events used:** student-join, start-session (sends lessonId), next-slide, submit-answer, answer-received, answer-result, show-results, question-results, content-slide, teacher-slide-info, session-started, session-ended, student-list, answer-status, detailed-answer-status
- **Lesson API endpoints:** GET /api/lessons, GET /api/lessons/:id, POST /api/lessons, DELETE /api/lessons/:id
- **Translations:** All UI text uses t("key") and tFormat("key", args) functions from i18n.js. New features must add translation keys to both en and fr in i18n.js.
- **Language toggle:** Button with class "lang-toggle" in top-right corner of every page. Calls toggleLanguage(). Language saved in localStorage as "cc-lang".
- **UI pattern:** Dark theme (#0f172a background, #1e293b cards, #334155 borders). Buttons use gradients. Blue (#3b82f6) and purple (#8b5cf6) as primary colors.

## Core Features

### Teacher Features
- **Lesson Builder:** Create lessons with content slides (text) and question slides (MCQ, True/False) — BUILT
- **Live Session:** Start a session with a selected lesson, advance through slides, push questions, view live response dashboard with individual student name tracking — BUILT
- **Teacher-controlled reveal:** Students wait after answering; teacher clicks "Reveal Answer" — BUILT
- **Leaderboard:** End-of-lesson rankings based on correctness and speed (Kahoot-style scoring) — BUILT
- **Bilingual interface:** French/English toggle on all screens — BUILT
- **Data & Reports:** Attendance logs, performance tracking, cloud sync — Phase 3

### Student Features
- Join via browser (no app install, no account) — BUILT
- View content slides on their device as teacher presents — BUILT
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
- Server, Socket.IO, lobby, quiz engine, scoring, leaderboard, teacher-controlled reveal, per-student tracking

### Phase 2: Lesson Builder & Content Delivery — NEARLY COMPLETE
- Lesson builder with content/question slides — BUILT
- Lesson saving/loading/deleting — BUILT
- Teacher selects lesson before starting session — BUILT
- Content slide delivery to student devices — BUILT
- Bilingual French/English toggle — BUILT
- **Still needed:** Image support in content slides

### Phase 3: Data, Storage & Cloud Sync
- Local SQLite database for all persistent data
- Student roster management
- Attendance tracking
- Session history with scores and participation data
- Cloud sync engine

### Phase 4: Polish, Packaging & Launch
- Capacitor packaging for Android and iOS
- PWA version for browser access
- **UI/UX overhaul and brand identity** (see UI Vision section)
- Additional question types
- Image and media support
- Exportable reports
- User testing with real teachers

## UI & Branding Vision

**IMPORTANT — Claude must read this section and act on it when Phase 4 begins.**

The current UI is functional scaffolding — not the final product. By Phase 4, Classroom Connect needs a complete visual overhaul with a real brand identity, custom icons, and polished design.

**CLAUDE ACTION ITEM — When Phase 4 begins, prompt Moussa with this:**
"Before we start the UI overhaul, I need you to collect visual references. Screenshot apps, websites, or designs you think feel right for Classroom Connect — the colors, the mood, the energy, the style. Also think about whether you want to create custom illustrations or icons that give the app a distinctive look. Share those references with me and describe what you want. That will be much more productive than me guessing at your taste."

## Debugging & Development Process
- Moussa tests all code on real devices and reports issues
- Claude fixes bugs based on error messages and described circumstances
- We iterate: build, test, report, fix, repeat
- This process can yield a fully functional app without hiring programmers
- For production deployment with many users, a code review by a developer is recommended

## Project Repository
GitHub: github.com/MoussaJuniorSidibe/Classroom-Connect

## Current Project File Structure
```
Classroom-Connect/
  server.js             — Node.js server (Express + Socket.IO + lesson API)
  package.json          — Dependencies and scripts
  .gitignore            — Excludes node_modules from GitHub
  node_modules/         — Installed libraries (local only, not on GitHub)
  lessons/              — Saved lesson JSON files (created automatically)
  Docs/                 — Project documentation
  public/               — Files served to browsers
    i18n.js             — Shared translations (English + French)
    teacher.html        — Teacher dashboard (lobby, live session, results)
    student.html        — Student interface (join, view slides, answer, leaderboard)
    builder.html        — Lesson builder (create/edit lessons with slides)
```

## Current Status
<!-- UPDATE THIS SECTION AFTER EACH SESSION -->
- **Current Phase:** Phase 2 — Nearly complete
- **Last Session:** April 30, 2026 — Added bilingual French/English toggle to all interfaces
- **Next Step:** Add image support in content slides, then Phase 2 is complete

## Session Log
<!-- ADD NEW ENTRIES AFTER EACH SESSION -->
| Date | What Was Done | Next Steps |
|------|--------------|------------|
| April 30, 2026 | Setup: GitHub repo, Git, VS Code, Node.js, project docs | Begin Phase 1 |
| April 30, 2026 | Phase 1: Server, lobby, quiz engine, scoring, leaderboard, teacher-controlled reveal, per-student tracking | Begin Phase 2 |
| April 30, 2026 | Phase 2: Lesson builder, content/question slides, lesson saving/loading, teacher lesson selection, content delivery | Add bilingual toggle |
| April 30, 2026 | Phase 2: Bilingual French/English toggle across student, teacher, and builder interfaces | Add image support in content slides |
