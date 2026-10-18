// App shell: sidebar, header and the month grid (tasks arrive in v0.1).
import { icons, markSVG } from "./icons.js";
import { syncBadge } from "./sync.js";
import { esc } from "../lib/html.js";
import { MONTHS, MONTHS_SHORT, WEEKDAYS_SHORT, monthGridDays, toISO } from "../lib/date.js";

const DEFAULT_PROJECTS = [
  { name: "Training", color: "blue" },
  { name: "Admin", color: "amber" },
  { name: "Personal", color: "violet" }
];

function initials(user) {
  const src = (user.displayName || user.email || "?").trim();
  return esc(src.charAt(0).toUpperCase());
}

function sidebar(user) {
  const avatar = user.photoURL
    ? `<span class="avatar"><img src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer"></span>`
    : `<span class="avatar">${initials(user)}</span>`;
  return `<aside class="side">
    <div class="logo">${markSVG}MonthFlow</div>
    <button class="btn primary new-task" disabled title="Creating tasks arrives in the next update">${icons.plus}New task<span class="kbd">N</span></button>
    <button class="nav" aria-current="page">${icons.calendar}Calendar</button>
    <button class="nav" disabled title="Inbox arrives in the next update">${icons.inbox}Inbox<span class="count">0</span></button>
    <div class="overline">Projects</div>
    ${DEFAULT_PROJECTS.map((p) => `<div class="project-row pj-${p.color}"><i></i>${p.name}</div>`).join("")}
    <div class="account">
      ${avatar}
      <span class="who">${esc(user.displayName || "Signed in")}<small>${esc(user.email || "")}</small></span>
      <button class="ibtn" id="signOutBtn" aria-label="Sign out" title="Sign out">${icons.logout}</button>
    </div>
  </aside>`;
}

function monthGrid(cursor, today) {
  const days = monthGridDays(cursor.getFullYear(), cursor.getMonth());
  const rows = days.length / 7;
  const todayISO = toISO(today);
  const cells = days.map((d, i) => {
    const inMonth = d.getMonth() === cursor.getMonth();
    const isToday = toISO(d) === todayISO;
    const showMonth = i === 0 || d.getDate() === 1;
    const cls = ["cell", inMonth ? "" : "out", isToday ? "today" : "", i >= days.length - 7 ? "last-row" : ""].join(" ");
    return `<div class="${cls}" data-date="${toISO(d)}">
      <div class="dl"><span class="dn">${d.getDate()}</span>${showMonth ? `<span class="mo">${MONTHS_SHORT[d.getMonth()]}</span>` : ""}${isToday ? '<span class="tdy">Today</span>' : ""}</div>
    </div>`;
  }).join("");
  return `<div class="dow">${WEEKDAYS_SHORT.map((w) => `<div>${w}</div>`).join("")}</div>
    <div class="mgrid" style="--rows:${rows}">${cells}</div>`;
}

export function shellView({ user, cursor, today }) {
  return `<div class="app">
    ${sidebar(user)}
    <div class="main">
      <header class="head">
        <h2>${MONTHS[cursor.getMonth()]} <span>${cursor.getFullYear()}</span></h2>
        <div class="arrows">
          <button class="ibtn" id="prevBtn" aria-label="Previous month">${icons.left}</button>
          <button class="ibtn" id="nextBtn" aria-label="Next month">${icons.right}</button>
        </div>
        <button class="btn secondary sm" id="todayBtn">Today</button>
        <div class="seg" role="group" aria-label="View">
          <button aria-pressed="true">Month</button>
          <button aria-pressed="false" disabled title="Week View arrives in the next update">Week</button>
        </div>
        <span class="spacer"></span>
        ${syncBadge()}
      </header>
      <main class="content">
        <div class="hint">${icons.info}<span><b>You’re signed in.</b> Sign-in and sync are ready. Tasks arrive in the next update.</span></div>
        ${monthGrid(cursor, today)}
      </main>
    </div>
  </div>`;
}
