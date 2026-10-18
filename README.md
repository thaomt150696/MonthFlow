# MonthFlow

Plan your month. Finish your week.

MonthFlow is a calendar-first task manager for one person. Tasks live on a month and week calendar, sync across devices through Firebase, and keep working offline.

**Status:** v0 — sign-in, access control and the app shell. Tasks arrive in v0.1.

## Features (v1.0 roadmap)

- Month View and Week View, weeks start on Monday
- Quick Add from any day, with a checkbox on every task card
- Drag a task to another day; the due date never moves with it
- Task details panel with checklist and notes, saved automatically
- Inbox for tasks without a date, Weekly Focus for up to three tasks
- Sign in with Google, real-time sync between devices, offline support
- Export and import a JSON backup

## Tech

Plain HTML, CSS and JavaScript modules. No build step.
Firebase Authentication (Google) and Cloud Firestore, loaded from the official CDN.
Hosted on GitHub Pages.

## Run locally

```bash
python -m http.server 8000
```

Open http://localhost:8000. Without a Firebase config the app shows a setup screen with previews of each screen.

## Connect Firebase

1. Create a project at https://console.firebase.google.com and add a **Web app**.
2. Copy the web app config into `js/firebase-config.js`.
3. **Authentication › Sign-in method:** enable Google.
4. **Authentication › Settings › Authorized domains:** add `<your-username>.github.io`.
5. **Firestore Database:** create a database, then open **Rules**, paste `firestore.rules`, replace `OWNER_EMAIL` with your Google account and publish.

The Firebase config is a public identifier. Your data is protected by the Security Rules: only the owner's account can read or write it.

## Privacy

Tasks are stored in your own Firebase project. This repository contains code only, never task data.
