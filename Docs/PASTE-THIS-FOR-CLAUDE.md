# CLASSROOM CONNECT — Project Context for Claude

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
- **Student interface:** HTML/CSS + React (served from teacher's device, opens in browser)
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

## Core Features

### Teacher Features
- **Lesson Builder:** Create lessons with content slides (text) and question slides (MCQ, True/False) — BUILT
- **Live Session:** Start a session with a selected lesson, see student lobby, advance through slides, push questions, view live response dashboard with individual student name tracking — BUILT
- **Teacher-controlled reveal:** Students wait after answering; teacher clicks "Reveal Answer" to show results to everyone simultaneously — BUILT
- **Leaderboard:** End-of-lesson rankings based on correctness and speed (Kahoot-style scoring) — BUILT
- **Data & Reports:** Attendance logs, individual/class performance, session history, cloud sync — Phase 3

### Student Features
- Join via browser (no app install, no account) — BUILT
- View content slides on their device as teacher presents — BUILT
- Answer questions when they appear — BUILT
- Answer locked screen while waiting for teacher to reveal — BUILT
- Immediate correct/incorrect feedback after teacher reveals — BUILT
- See their score and leaderboard position — BUILT

### Scoring System
- 1000 base points per correct answer
- Up to 500 speed bonus points
- Optional streak bonus for consecutive correct answers (future)
- Leaderboard updates after each question

## Build Phases

### Phase 1: Live Quiz Session (Core Proof of Concept) — COMPLETE
- Node.js + Express server on teacher's device
- Socket.IO for real-time communication
- Teacher interface: start session, push questions, view responses, show leaderboard
- Student interface: join session, see questions, submit answers, view score
- Basic scoring engine (correctness + speed)
- Lobby/waiting room showing connected students
- Real-time per-student answer tracking on teacher dashboard
- Teacher-controlled answer reveal

### Phase 2: Lesson Builder & Content Delivery — IN PROGRESS
- Lesson authoring interface (add/edit/delete/reorder slides) — BUILT
- Content slide editor (text) — BUILT
- Question slide editor (MCQ, True/False, timers, point values) — BUILT
- Lesson library (save, organize lessons) — BUILT
- Content delivery to student devices during live session — BUILT
- Teacher selects a saved lesson before starting session — BUILT
- **Still needed:** Image support in content slides
- **Still needed:** Bilingual interface (French/English toggle)

### Phase 3: Data, Storage & Cloud Sync
- Local SQLite database for all persistent data
- Student roster management
- Attendance tracking
- Session history with scores and participation data
- Cloud sync engine (detect connectivity, upload/download, handle conflicts)

### Phase 4: Polish, Packaging & Launch
- Capacitor packaging for Android and iOS
- PWA version for browser access
- **UI/UX overhaul and brand identity** (see UI Vision section below)
- Additional question types (fill-in-the-blank, matching, short answer)
- Image and media support in lessons
- Exportable reports (PDF/CSV)
- Performance optimization for low-end devices
- User testing with real teachers

## UI & Branding Vision

**IMPORTANT — Claude must read this section and act on it when Phase 4 begins.**

The current UI is functional scaffolding — dark theme with blue gradients — not the final product. By Phase 4, Classroom Connect needs a complete visual overhaul:

- A real color palette, logo, and brand identity
- Custom icons and visual elements designed specifically for Classroom Connect
- Typography that feels right for an educational context
- Student experience should feel fun, playful, and engaging (they're competing on a leaderboard)
- Teacher experience should feel clean, professional, and confidence-inspiring
- Support for images in content slides (teachers should be able to add diagrams, photos, etc.)
- Potential for short video clips stored locally on teacher's device
- Responsive design that works on all screen sizes including low-end Android phones
- Personalized visual elements that Moussa will create or direct

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
  node_modules/         — Installed libraries (managed by npm)
  lessons/              — Saved lesson JSON files (created automatically)
  Docs/                 — Project documentation
  public/               — Files served to browsers (teacher, student, builder)
    teacher.html        — Teacher dashboard (lobby, live session, results)
    student.html        — Student interface (join, view slides, answer, leaderboard)
    builder.html        — Lesson builder (create/edit lessons with slides)
```

## Current Status
- **Current Phase:** Phase 2 — Nearly complete
- **Last Session:** April 30, 2026 — Added bilingual French/English toggle to all interfaces
- **Next Step:** Add image support in content slides, then Phase 2 is complete

## Session Log
| Date | What Was Done | Next Steps |
|------|--------------|------------|
| April 30, 2026 | Setup: GitHub repo, Git, VS Code, Node.js, project docs | Begin Phase 1 |
| April 30, 2026 | Phase 1: Server, lobby, quiz engine, scoring, leaderboard, teacher-controlled reveal, per-student tracking | Begin Phase 2 |
| April 30, 2026 | Phase 2: Lesson builder, content/question slides, lesson saving/loading, teacher lesson selection, content slide delivery | Add bilingual toggle |
| April 30, 2026 | Phase 2: Bilingual French/English toggle across student, teacher, and builder interfaces | Add image support in content slides |