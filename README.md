# MonthFlow

Plan your month. Finish your week.

MonthFlow is a calendar-first task manager for one person. Tasks live on a month and week calendar, sync across devices through Firebase, and keep working offline.

**Live:** https://thaomt150696.github.io/MonthFlow/ · **Version:** 1.0.0

## Features

- **Month and Week views.** Weeks start on Monday; weekends are shaded; today is highlighted.
- **Quick Add.** Click any day (or press `N`) to add a task. Only the name is required. Tasks without a date go to the Inbox.
- **Checkbox on every card.** Tick to finish, tick again to undo. Done tasks stay on the calendar.
- **Drag and drop.** Move a task to another day, or between the calendar and the Inbox. The due date never moves with it.
- **Task details.** Status, priority, project, scheduled date, due date, checklist and notes. Changes save automatically.
- **Inbox** for tasks without a date, and **Weekly Focus** for up to three tasks per week.
- **Projects** with eight colors. Card color shows the project, never the status.
- **Undo** after creating, moving or deleting a task.
- **Sync and offline.** Real-time sync between devices. Without internet you can keep working; changes sync when you're back online. The header always shows Synced, Syncing…, Offline or Not saved.
- **Backup.** Export all tasks and projects as JSON, import them back (Settings).
- **Fits laptops.** Task details floats over the calendar below 1280 px; the sidebar becomes an icon rail below 1024 px.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `N` | New task |
| `T` | Go to today |
| `M` / `W` | Month view / Week view |
| `←` / `→` | Previous / next month or week |
| `[` | Collapse or expand the sidebar |
| `Enter` | Create the task (in New task) |
| `Ctrl` + `Enter` | Create the task from Notes |
| `Esc` | Close the open panel, menu or dialog |
| `Delete` | Delete the selected task (with Undo) |
| `Shift` + `F10` | Open the selected task's menu (or right-click the card) |
| `?` | Show all shortcuts |

## Tips

- After an update, press `Ctrl` + `F5` if you still see the old version. GitHub Pages lets browsers keep files for about 10 minutes.
- Signing out also removes this device's offline copy of your data, which is useful on shared computers.

## Tech

Plain HTML, CSS and JavaScript modules. No build step.
Firebase Authentication (Google) and Cloud Firestore with offline persistence, loaded from the official CDN.
Hosted on GitHub Pages.

```
index.html
css/        tokens, base, components, app layout
js/
  main.js           picks the screen: sign-in, app, previews
  app.js            UI state, events, drag and drop, shortcuts
  model.js          task and project shapes, validation
  auth.js           Google sign-in and the access check
  firebase*.js      Firebase setup
  store/            firestore-store.js (live), memory-store.js (previews)
  ui/               views, overlays, cards, icons, sign-in screens
  lib/              dates, ids, HTML escaping
firestore.rules     Security Rules template
```

## Run locally

```bash
python -m http.server 8000
```

Open http://localhost:8000 to use the app with Firebase, or http://localhost:8000/?preview#preview-app for the same UI with sample data stored only in your browser.

## Connect your own Firebase project

1. Create a project at https://console.firebase.google.com and add a **Web app**.
2. Copy the web app config into `js/firebase-config.js`.
3. **Authentication:** click Get started, enable Google, and add your site's domain under Settings › Authorized domains.
4. **Firestore Database:** create a database, then open **Rules**, paste `firestore.rules`, replace `OWNER_EMAIL` with your Google account and publish.

The Firebase config is a public identifier. Your data is protected by the Security Rules: only the owner's account can read or write it.

## Privacy

Tasks are stored in the owner's Firebase project under their account. This repository contains code only, never task data.
