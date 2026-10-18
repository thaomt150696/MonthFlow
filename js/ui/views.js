// Layout views: sidebar, header, Month, Week, Inbox tray and the Task details panel.
import { icons, markSVG, checkSVG } from "./icons.js";
import { cardHTML, checkbox } from "./card.js";
import { esc } from "../lib/html.js";
import {
  MONTHS, MONTHS_SHORT, WEEKDAYS_SHORT, monthGridDays, weekDays, toISO, fromISO, isWeekend,
  isoWeek, weekKey, weekRangeLabel, dayName, fmtShort
} from "../lib/date.js";
import { isOverdue, byCreated, STATUS_LABEL, PRIORITY_LABEL, FOCUS_MAX } from "../model.js";

const SYNC = {
  synced: [icons.synced, "Synced"],
  syncing: [icons.syncing, "Syncing…"],
  offline: [icons.offline, "Offline"],
  error: [icons.alert, "Not saved"]
};

export function syncBadge(state) {
  const [ico, label] = SYNC[state] || SYNC.synced;
  return `<span class="sync" data-state="${state}" role="status">${ico}${label}</span>`;
}

const tasksOn = (ctx, iso) => ctx.data.tasks.filter((t) => t.scheduledDate === iso).sort(byCreated);
const val = (ctx, id, fallback) => (id in ctx.ui.inputs ? ctx.ui.inputs[id] : fallback);

function initials(user) {
  return esc((user.displayName || user.email || "?").trim().charAt(0).toUpperCase());
}

export function sidebarHTML(ctx) {
  const { ui, user, data } = ctx;
  const inboxCount = data.tasks.filter((t) => !t.scheduledDate && t.status !== "done").length;
  const avatar = user.photoURL
    ? `<span class="avatar"><img src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer"></span>`
    : `<span class="avatar">${initials(user)}</span>`;
  const projects = data.projects.map((p) => {
    const open = data.tasks.filter((t) => t.projectId === p.id && t.status !== "done").length;
    return `<div class="project-row pj-${p.color}" data-project-row="${p.id}"><i></i><span>${esc(p.name)}</span><small class="cnt">${open || ""}</small>
      <button class="ibtn" data-action="project-edit" data-id="${p.id}" aria-label="Edit ${esc(p.name)}">${icons.more}</button></div>`;
  }).join("");
  return `<aside class="side">
    <div class="logo">${markSVG}MonthFlow</div>
    <button class="btn primary new-task" id="newTaskBtn" data-action="new-task">${icons.plus}New task<span class="kbd">N</span></button>
    <button class="nav" data-action="go-calendar" ${!ui.tray ? 'aria-current="page"' : ""}>${icons.calendar}Calendar</button>
    <button class="nav" data-action="toggle-tray" aria-pressed="${ui.tray}">${icons.inbox}Inbox<span class="count">${inboxCount}</span></button>
    <div class="overline">Projects<button class="ibtn" id="addProjectBtn" data-action="project-new" aria-label="Add project">${icons.plus}</button></div>
    ${projects}
    <div class="account">
      ${avatar}
      <span class="who">${esc(user.displayName || "Signed in")}<small>${esc(user.email || "")}</small></span>
      <button class="ibtn" data-action="settings-open" aria-label="Settings" title="Settings">${icons.gear}</button>
    </div>
  </aside>`;
}

export function headerHTML(ctx) {
  const { ui, data, todayISO } = ctx;
  const c = ui.cursor;
  let title, sub = "", from, to;
  if (ui.view === "month") {
    title = `${MONTHS[c.getMonth()]} <span>${c.getFullYear()}</span>`;
    from = toISO(new Date(c.getFullYear(), c.getMonth(), 1));
    to = toISO(new Date(c.getFullYear(), c.getMonth() + 1, 0));
  } else {
    const days = weekDays(c);
    title = `${weekRangeLabel(days[0])} <span>${days[6].getFullYear()}</span>`;
    sub = "Week " + isoWeek(c).week;
    from = toISO(days[0]);
    to = toISO(days[6]);
  }
  const inRange = data.tasks.filter((t) => t.scheduledDate && t.scheduledDate >= from && t.scheduledDate <= to);
  const done = inRange.filter((t) => t.status === "done").length;
  const overdue = data.tasks.filter((t) => isOverdue(t, todayISO)).length;
  const unit = ui.view === "month" ? "month" : "week";
  return `<header class="head">
    <h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}
    <div class="arrows">
      <button class="ibtn" data-action="prev" aria-label="Previous ${unit}" title="Previous ${unit} (←)">${icons.left}</button>
      <button class="ibtn" data-action="next" aria-label="Next ${unit}" title="Next ${unit} (→)">${icons.right}</button>
    </div>
    <button class="btn secondary sm" data-action="today" title="Today (T)">Today</button>
    <div class="seg" role="group" aria-label="View">
      <button data-action="view-month" aria-pressed="${ui.view === "month"}" title="Month (M)">Month</button>
      <button data-action="view-week" aria-pressed="${ui.view === "week"}" title="Week (W)">Week</button>
    </div>
    <span class="spacer"></span>
    <div class="stats"><span><b>${inRange.length}</b> tasks</span><span><b>${done}</b> done</span>${overdue ? `<span class="over">${icons.alert}<b>${overdue}</b> overdue</span>` : ""}</div>
    ${syncBadge(ui.sync)}
  </header>`;
}

export function bannerHTML(ctx) {
  if (ctx.ui.sync !== "offline") return "";
  return `<div class="banner" role="status">${icons.offline}<span><b>You’re offline.</b> Changes are saved on this device and will sync when you’re back online.</span></div>`;
}

function hintHTML(ctx) {
  if (ctx.data.tasks.length || ctx.ui.hintDismissed) return "";
  return `<div class="hint">${icons.calendar}<span class="grow"><b>Your calendar is empty.</b> Click any day to add a task, or press <b>N</b>.</span>
    <button class="ibtn" data-action="hint-dismiss" aria-label="Dismiss">${icons.x}</button></div>`;
}

export function monthHTML(ctx) {
  const { ui, todayISO } = ctx;
  const c = ui.cursor;
  const days = monthGridDays(c.getFullYear(), c.getMonth());
  const cells = days.map((d, i) => {
    const iso = toISO(d);
    const list = tasksOn(ctx, iso);
    const more = list.length > 3;
    const shown = more ? list.slice(0, 2) : list;
    const anchor = ui.qa && ui.qa.date === iso && ui.qa.anchor === "day";
    const cls = ["cell", d.getMonth() === c.getMonth() ? "" : "out", isWeekend(d) ? "weekend" : "", iso === todayISO ? "today" : "", i >= days.length - 7 ? "last-row" : "", anchor ? "is-anchor" : ""].join(" ");
    const label = i === 0 || d.getDate() === 1 ? `<span class="mo">${MONTHS_SHORT[d.getMonth()]}</span>` : "";
    return `<div class="${cls}" data-action="cell" data-date="${iso}" data-drop="${iso}">
      <div class="dl"><span class="dn">${d.getDate()}</span>${label}${iso === todayISO ? '<span class="tdy">Today</span>' : ""}
        <button class="add-day" data-action="add-day" data-date="${iso}" aria-label="Add task on ${fmtShort(iso)}">${icons.plus}</button></div>
      <div class="cards">${shown.map((t) => cardHTML(t, ctx.projectsById[t.projectId], ctx)).join("")}</div>
      ${more ? `<button class="more" data-action="daylist" data-date="${iso}">+${list.length - 2} more</button>` : ""}
    </div>`;
  }).join("");
  return `<main class="content">${hintHTML(ctx)}
    <div class="dow">${WEEKDAYS_SHORT.map((w) => `<div>${w}</div>`).join("")}</div>
    <div class="mgrid" style="--rows:${days.length / 7}">${cells}</div>
  </main>`;
}

export function weekHTML(ctx) {
  const { ui, data, todayISO } = ctx;
  const days = weekDays(ui.cursor);
  const key = weekKey(ui.cursor);
  const focus = data.tasks.filter((t) => t.focusWeek === key).sort(byCreated);
  const doneN = focus.filter((t) => t.status === "done").length;
  const pct = focus.length ? Math.round((doneN / focus.length) * 100) : 0;
  const items = focus.map((t) => `<div class="fitem">${cardHTML(t, ctx.projectsById[t.projectId], ctx, { size: "lg", showDate: true })}
      <button class="ibtn unpin" data-action="unpin" data-id="${t.id}" aria-label="Remove from focus" title="Remove from focus">${icons.x}</button></div>`).join("");
  const slots = focus.length < FOCUS_MAX
    ? `<button class="slot" id="pinSlot" data-action="pin-slot">${icons.pin}Pin a task</button>` + '<div aria-hidden="true"></div>'.repeat(FOCUS_MAX - focus.length - 1)
    : "";
  const focusBar = `<section class="focus ${ui.focusCollapsed ? "collapsed" : ""}" aria-label="This week’s focus">
    <div class="fh"><strong>This week’s focus</strong><span class="fprog">${doneN}/${focus.length} done</span>
      <span class="fbar"><i style="width:${pct}%"></i></span><span class="spacer"></span>
      <button class="ibtn" data-action="focus-collapse" aria-expanded="${!ui.focusCollapsed}" aria-label="${ui.focusCollapsed ? "Expand" : "Collapse"} focus">${ui.focusCollapsed ? icons.down : icons.up}</button></div>
    ${ui.focusCollapsed ? "" : `<div class="fitems">${items}${slots}</div>`}
  </section>`;
  const cols = days.map((d) => {
    const iso = toISO(d);
    const today = iso === todayISO;
    return `<div class="col ${isWeekend(d) ? "weekend" : ""} ${today ? "today" : ""}" data-date="${iso}" data-drop="${iso}">
      <div class="ch"><span class="dname">${dayName(d)}</span><span class="dnum">${d.getDate()}</span>${today ? '<span class="badge accent">Today</span>' : ""}</div>
      <div class="cbody">${tasksOn(ctx, iso).map((t) => cardHTML(t, ctx.projectsById[t.projectId], ctx, { size: "lg" })).join("")}
        <button class="addrow" data-action="add-day" data-date="${iso}">${icons.plus}Add task</button></div>
    </div>`;
  }).join("");
  return `<main class="content">${hintHTML(ctx)}${focusBar}<div class="week">${cols}</div></main>`;
}

export function trayHTML(ctx) {
  if (!ctx.ui.tray) return "";
  const list = ctx.data.tasks.filter((t) => !t.scheduledDate).sort(byCreated);
  const open = list.filter((t) => t.status !== "done").length;
  return `<aside class="tray" data-drop="inbox" data-drop-label="Move to Inbox · remove the date" aria-label="Inbox">
    <div class="tray-h">${icons.inbox}<strong>Inbox</strong><span class="fprog">${open}</span>
      <button class="ibtn" data-action="toggle-tray" aria-label="Close inbox">${icons.x}</button></div>
    <div class="tray-b">
      <input class="input" id="inbox-new" data-keep placeholder="Add a task without a date…" value="${esc(val(ctx, "inbox-new", ""))}" aria-label="Add a task to Inbox">
      ${list.length
        ? list.map((t) => cardHTML(t, ctx.projectsById[t.projectId], ctx, { size: "lg" })).join("") + '<p class="tip-line">Drag a task onto a day to schedule it.</p>'
        : '<p class="empty">Inbox is empty. Tasks without a date land here.</p>'}
    </div>
  </aside>`;
}

export function panelHTML(ctx) {
  const { ui, data } = ctx;
  const t = data.tasks.find((x) => x.id === ui.selectedId);
  if (!t) return "";
  const project = ctx.projectsById[t.projectId];
  const color = project ? project.color : "slate";
  const title = val(ctx, "dp-title", t.title);
  const notes = val(ctx, "dp-notes", t.notes || "");
  const doneItems = t.checklist.filter((c) => c.done).length;
  const key = t.scheduledDate ? weekKey(fromISO(t.scheduledDate)) : null;
  const focusFull = key && t.focusWeek !== key && data.tasks.filter((x) => x.focusWeek === key).length >= FOCUS_MAX;
  const focusNote = !t.scheduledDate ? "Set a date to add this task to a week’s focus." : focusFull ? "This week already has 3 focus tasks." : "";
  const opt = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${v}</option>`).join("");
  const syncText = { synced: "Saved", syncing: "Saving…", offline: "Saved on this device", error: "Not saved" }[ui.sync];
  return `<aside class="dpanel" aria-label="Task details">
    <div class="dp-h"><strong>Task details</strong><button class="ibtn" data-action="close-panel" aria-label="Close" title="Close (Esc)">${icons.x}</button></div>
    <div class="dp-b">
      <div>
        <div class="dp-t pj-${color} ${t.status === "done" ? "is-done" : ""} ${t.status === "in_progress" ? "is-prog" : ""}">${checkbox(t, true)}
          <textarea class="dp-title ${ui.titleError ? "is-error" : ""}" id="dp-title" data-keep rows="1" maxlength="200" aria-label="Task name">${esc(title)}</textarea></div>
        ${ui.titleError ? `<p class="help err" style="padding-left:28px">${icons.alert}${esc(ui.titleError)}</p>` : ""}
      </div>
      <dl class="props">
        <dt><label for="dp-status">Status</label></dt><dd><select class="input" id="dp-status">${opt(STATUS_LABEL, t.status)}</select></dd>
        <dt><label for="dp-priority">Priority</label></dt><dd><select class="input" id="dp-priority">${opt(PRIORITY_LABEL, t.priority)}</select></dd>
        <dt><label for="dp-project">Project</label></dt><dd><select class="input" id="dp-project"><option value="">No project</option>${data.projects.map((p) => `<option value="${p.id}" ${p.id === t.projectId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></dd>
        <dt><label for="dp-date">Scheduled</label></dt><dd><input class="input" type="date" id="dp-date" value="${t.scheduledDate || ""}"></dd>
        <dt><label for="dp-due">Due date</label></dt><dd><input class="input" type="date" id="dp-due" value="${t.dueDate || ""}"></dd>
        <dt>Weekly focus</dt><dd><button class="switch" role="switch" data-action="focus-toggle" aria-checked="${!!key && t.focusWeek === key}" ${!t.scheduledDate || focusFull ? "disabled" : ""}><span class="track"></span>Focus this week</button>
          ${focusNote ? `<p class="note">${focusNote}</p>` : ""}</dd>
      </dl>
      <div class="blk">
        <div class="blk-h"><span>Checklist</span><span>${t.checklist.length ? doneItems + "/" + t.checklist.length : ""}</span></div>
        ${t.checklist.length ? `<div class="prog-mini"><i style="width:${Math.round((doneItems / t.checklist.length) * 100)}%"></i></div>` : ""}
        ${t.checklist.map((c) => `<div class="chk ${c.done ? "done" : ""}"><button class="cb ${c.done ? "checked" : ""}" data-action="check-toggle" data-item="${c.id}" aria-label="${c.done ? "Uncheck" : "Check"} ${esc(c.text)}"><span class="box">${c.done ? checkSVG : ""}</span></button><span>${esc(c.text)}</span>
          <button class="ibtn" data-action="check-delete" data-item="${c.id}" aria-label="Delete item">${icons.x}</button></div>`).join("")}
        <input class="input chk-new" id="dp-check-new" data-keep placeholder="+ Add item" value="${esc(val(ctx, "dp-check-new", ""))}" aria-label="Add checklist item">
      </div>
      <div class="blk">
        <div class="blk-h"><label for="dp-notes">Notes</label></div>
        <textarea class="input" id="dp-notes" data-keep rows="4" placeholder="Add notes…">${esc(notes)}</textarea>
      </div>
    </div>
    <div class="dp-f"><span class="g" data-state="${ui.sync}">${SYNC[ui.sync][0]}${syncText}</span>
      <button class="btn danger sm" data-action="delete-task">${icons.trash}Delete</button></div>
  </aside>`;
}

export function appHTML(ctx) {
  const { ui } = ctx;
  const panel = panelHTML(ctx);
  return `<div class="app ${panel ? "has-panel" : ""} ${ui.tray ? "has-tray" : ""}">
    ${sidebarHTML(ctx)}
    ${trayHTML(ctx)}
    <div class="main">${headerHTML(ctx)}${bannerHTML(ctx)}${ui.view === "month" ? monthHTML(ctx) : weekHTML(ctx)}</div>
    ${panel}
  </div>`;
}
