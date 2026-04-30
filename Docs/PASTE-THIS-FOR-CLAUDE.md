# CLASSROOM CONNECT — Project Context for Claude

## What is this?
Classroom Connect is an offline-first interactive classroom learning platform. A teacher creates lessons (content slides + interactive question slides), delivers them live over a local WiFi hotspot, and students participate from their phone browsers — no internet required. Think of it as an offline Kahoot fused with a presentation tool.

## Who is building this?
- **Moussa Junior Sidibe** (designer, product owner) — Fulbright scholar from Côte d'Ivoire, MS in Instructional Design from Syracuse University. Limited programming skills. Defines features, tests code, makes design decisions.
- **Claude** (developer) — Writes all code, explains technical decisions, debugs issues, suggests architecture.

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
- **Local database:** SQLite / IndexedDB
- **Mobile packaging:** Capacitor (for Android/iOS)
- **Cloud sync:** Supabase or Firebase (syncs when internet is available)

## How the Local Network Works
1. Teacher opens the app and enables WiFi hotspot (or uses a portable router for 40+ students)
2. App starts a local server and displays a session code/IP address
3. Students connect to the hotspot and open the address in any browser
4. All communication flows over this local network via Socket.IO — no internet needed
5. Data saves locally on teacher's device and syncs to cloud when internet is available later

## Core Features

### Teacher Features
- **Lesson Builder:** Create lessons with content slides (text, images) and question slides (MCQ, True/False)
- **Live Session:** Start a session, see student lobby, advance slides, push questions, view live response dashboard
- **Leaderboard:** End-of-lesson rankings based on correctness and speed (Kahoot-style scoring)
- **Data & Reports:** Attendance logs, individual/class performance, session history, cloud sync

### Student Features
- Join via browser (no app install, no account)
- View content slides on their device as teacher presents
- Answer questions when they appear
- Immediate correct/incorrect feedback
- See their score and leaderboard position

### Scoring System
- 1000 base points per correct answer
- Up to 500 speed bonus points
- Optional streak bonus for consecutive correct answers
- Leaderboard updates after each question

## Build Phases

### Phase 1: Live Quiz Session (Core Proof of Concept)
- Node.js + Express server on teacher's device
- Socket.IO for real-time communication
- Teacher interface: start session, push hardcoded questions, view responses, show leaderboard
- Student interface: join session, see questions, submit answers, view score
- Basic scoring engine (correctness + speed)
- Lobby/waiting room showing connected students

### Phase 2: Lesson Builder & Content Delivery
- Lesson authoring interface (add/edit/delete/reorder slides)
- Content slide editor (text + images)
- Question slide editor (MCQ, True/False, timers, point values)
- Lesson library (save, organize lessons)
- Content delivery to student devices during live session
- Bilingual interface (French/English toggle)

### Phase 3: Data, Storage & Cloud Sync
- Local SQLite database for all persistent data
- Student roster management
- Attendance tracking
- Session history with scores and participation data
- Cloud sync engine (detect connectivity, upload/download, handle conflicts)

### Phase 4: Polish, Packaging & Expansion
- Capacitor packaging for Android and iOS
- PWA version for browser access
- UI/UX polish and responsive design
- Additional question types
- Exportable reports (PDF/CSV)
- Performance optimization for low-end devices

## Project Repository
GitHub: github.com/MoussaJuniorSidibe/Classroom-Connect

## Project File Structure
```
Classroom-Connect/
  /server/        — Node.js server code (Express + Socket.IO)
  /client/        — Student-facing web interface (React)
  /teacher/       — Teacher-facing interface (lesson builder + dashboard)
  /shared/        — Shared utilities, types, constants
  /database/      — SQLite schema and data management
  /docs/          — Project documentation
  /i18n/          — Language files (French + English)
  package.json    — Dependencies and scripts
  README.md       — Project overview
```

## Current Status
- **Current Phase:** Phase 1 — Nearly complete
- **Last Session:** April 30, 2026 — Added real-time student name tracking on teacher dashboard
- **Next Step:** Final Phase 1 polish and edge cases, then move to Phase 2 (Lesson Builder)

## Session Log
| Date | What Was Done | Next Steps |
|------|--------------|------------|
| April 30, 2026 | Setup: GitHub repo, Git, VS Code, Node.js, project docs | Begin Phase 1 |
| April 30, 2026 | Phase 1: Built server, lobby, quiz engine, scoring, leaderboard, teacher-controlled reveal, real-time per-student answer tracking | Final Phase 1 polish, then Phase 2 |
