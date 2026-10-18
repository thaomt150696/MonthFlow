// Overlays: Quick Add, day list, focus picker, project editor, settings, dialog, toasts.
import { icons } from "./icons.js";
import { cardHTML } from "./card.js";
import { esc } from "../lib/html.js";
import { fmtShort, fmtDayMonth, weekDays, toISO, weekKey } from "../lib/date.js";
import { byCreated, PROJECT_COLORS, TITLE_MAX } from "../model.js";
import { syncBadge } from "./views.js";

function quickAddHTML(ctx) {
  const qa = ctx.ui.qa;
  if (!qa) return "";
  const d = qa.draft;
  const prio = ["low", "medium", "high"].map((p) =>
    `<button type="button" data-action="qa-priority" data-value="${p}" aria-pressed="${d.priority === p}">${p === "medium" ? "Med" : p[0].toUpperCase() + p.slice(1)}</button>`).join("");
  const warned = qa.warnings.length > 0;
  return `<form class="pop qa" id="qaForm" role="dialog" aria-label="New task" data-pop="qa" novalidate>
    <div class="pop-h"><strong>New task</strong><button type="button" class="ibtn" data-action="qa-cancel" aria-label="Close">${icons.x}</button></div>
    <div class="field"><label class="label" for="qa-title">Task name <em>*</em></label>
      <input class="input ${qa.error ? "is-error" : ""}" id="qa-title" maxlength="${TITLE_MAX + 20}" autocomplete="off" placeholder="e.g. Hoàn thiện slide đào tạo" value="${esc(d.title)}" ${qa.error ? 'aria-invalid="true" aria-describedby="qa-err"' : ""}>
      ${qa.error ? `<span class="help err" id="qa-err">${icons.alert}${esc(qa.error)}</span>` : ""}</div>
    <div class="field"><label class="label" for="qa-date">Date</label>
      <input class="input" type="date" id="qa-date" value="${d.date || ""}"></div>
    <div class="two">
      <div class="field"><span class="label">Priority</span><span class="seg" role="group" aria-label="Priority">${prio}</span></div>
      <div class="field"><label class="label" for="qa-project">Project</label>
        <select class="input" id="qa-project"><option value="">No project</option>${ctx.data.projects.map((p) => `<option value="${p.id}" ${p.id === d.projectId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
    </div>
    ${qa.more
      ? `<div class="field"><label class="label" for="qa-due">Due date</label><input class="input" type="date" id="qa-due" value="${d.due || ""}"></div>
         <div class="field"><label class="label" for="qa-notes">Notes</label><textarea class="input" id="qa-notes" rows="3" placeholder="Add notes…">${esc(d.notes)}</textarea></div>`
      : `<button type="button" class="linkb" data-action="qa-more">${icons.plus}Due date and notes</button>`}
    ${warned ? `<div class="help warn" role="alert">${icons.alert}<div>${qa.warnings.map(esc).join("<br>")}<br>You can still create the task.</div></div>` : ""}
    <div class="pop-f"><span class="hint-k"><span class="kbd light">↵</span>to create</span>
      <button type="button" class="btn ghost sm" data-action="qa-cancel">Cancel</button>
      <button type="submit" class="btn primary sm">${warned ? "Create anyway" : "Create task"}</button></div>
  </form>`;
}

function dayListHTML(ctx) {
  const dl = ctx.ui.dayList;
  if (!dl) return "";
  const list = ctx.data.tasks.filter((t) => t.scheduledDate === dl.date).sort(byCreated);
  return `<div class="pop daylist" role="dialog" aria-label="Tasks on ${fmtShort(dl.date)}" data-pop="daylist">
    <div class="pop-h"><strong>${fmtShort(dl.date)} · ${list.length} tasks</strong><button class="ibtn" data-action="daylist-close" aria-label="Close">${icons.x}</button></div>
    ${list.map((t) => cardHTML(t, ctx.projectsById[t.projectId], ctx)).join("")}
    <button class="addrow" data-action="add-day" data-date="${dl.date}">${icons.plus}Add task</button>
  </div>`;
}

function pickerHTML(ctx) {
  if (!ctx.ui.picker) return "";
  const key = weekKey(ctx.ui.cursor);
  const days = weekDays(ctx.ui.cursor).map(toISO);
  const list = ctx.data.tasks.filter((t) => days.includes(t.scheduledDate) && t.focusWeek !== key && t.status !== "done")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || byCreated(a, b));
  return `<div class="pop picker" role="dialog" aria-label="Pin a task" data-pop="picker">
    <div class="pop-h"><strong>Pin a task to this week</strong><button class="ibtn" data-action="picker-close" aria-label="Close">${icons.x}</button></div>
    ${list.length
      ? list.map((t) => { const p = ctx.projectsById[t.projectId]; return `<button class="pick-row pj-${p ? p.color : "slate"}" data-action="pin-task" data-id="${t.id}"><i></i>${esc(t.title)}<small>${fmtDayMonth(t.scheduledDate)}</small></button>`; }).join("")
      : '<p class="empty">No open tasks this week yet. Add tasks to the week first, then pin the most important ones.</p>'}
  </div>`;
}

function projectPopHTML(ctx) {
  const pp = ctx.ui.projectPop;
  if (!pp) return "";
  const sw = PROJECT_COLORS.map((c) => `<button type="button" class="pj-${c}" data-action="project-color" data-value="${c}" aria-pressed="${pp.draft.color === c}" aria-label="${c}"><i></i></button>`).join("");
  return `<form class="pop projpop" id="projForm" role="dialog" aria-label="${pp.id ? "Edit project" : "New project"}" data-pop="project" novalidate>
    <div class="pop-h"><strong>${pp.id ? "Edit project" : "New project"}</strong><button type="button" class="ibtn" data-action="project-cancel" aria-label="Close">${icons.x}</button></div>
    <div class="field"><label class="label" for="proj-name">Name</label>
      <input class="input ${pp.error ? "is-error" : ""}" id="proj-name" maxlength="40" autocomplete="off" value="${esc(pp.draft.name)}" placeholder="e.g. Training">
      ${pp.error ? `<span class="help err">${icons.alert}${esc(pp.error)}</span>` : ""}</div>
    <div class="field"><span class="label">Color</span><div class="swatches" role="group" aria-label="Color">${sw}</div></div>
    <div class="pop-f">${pp.id ? `<button type="button" class="btn danger sm" data-action="project-delete">${icons.trash}Delete</button>` : ""}<span style="flex:1"></span>
      <button type="button" class="btn ghost sm" data-action="project-cancel">Cancel</button>
      <button type="submit" class="btn primary sm">${pp.id ? "Save" : "Create"}</button></div>
  </form>`;
}

function settingsHTML(ctx) {
  if (!ctx.ui.settings) return "";
  const { user, data, ui } = ctx;
  const syncLine = { synced: "All changes are synced.", syncing: "Syncing your latest changes…", offline: "You’re offline. Changes are saved on this device.", error: "Some changes weren’t saved. Try again." }[ui.sync];
  return `<div class="scrim" data-action="settings-close"></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Settings" data-pop="settings">
    <div class="m-h"><strong>Settings</strong><button class="ibtn" data-action="settings-close" aria-label="Close">${icons.x}</button></div>
    <section class="m-sec"><h3>Account</h3>
      <div class="m-row"><span class="avatar">${esc((user.displayName || user.email || "?").charAt(0).toUpperCase())}</span>
        <span class="grow"><b>${esc(user.displayName || "Signed in")}</b>${esc(user.email || "")}</span>
        <button class="btn secondary sm" data-action="sign-out">${icons.logout}Sign out</button></div>
    </section>
    <section class="m-sec"><h3>Backup</h3>
      <div class="m-row"><span class="grow">Download all ${data.tasks.length} tasks and ${data.projects.length} projects as a JSON file.</span>
        <button class="btn secondary sm" data-action="export">${icons.download}Export</button></div>
      <div class="m-row"><span class="grow">Import a backup. Tasks with the same ID are updated; the rest are added. Nothing is deleted.</span>
        <label class="btn secondary sm" for="importFile">${icons.upload}Import…</label>
        <input type="file" id="importFile" accept="application/json,.json" hidden></div>
    </section>
    <section class="m-sec"><h3>Sync</h3><div class="m-row"><span class="grow">${syncLine}</span>${syncBadge(ui.sync)}</div></section>
  </div>`;
}

function dialogHTML(ctx) {
  const d = ctx.ui.dialog;
  if (!d) return "";
  return `<div class="scrim" data-action="dialog-cancel" style="z-index:74"></div>
  <div class="modal sm" role="alertdialog" aria-modal="true" aria-labelledby="dlgTitle" style="z-index:75" data-pop="dialog">
    <div class="dialog"><strong id="dlgTitle">${esc(d.title)}</strong><p>${esc(d.body)}</p>
      <div class="acts"><button class="btn secondary" data-action="dialog-cancel" id="dlgCancel">${esc(d.cancel)}</button>
        <button class="btn ${d.danger ? "primary" : "primary"}" data-action="dialog-confirm" id="dlgConfirm">${esc(d.confirm)}</button></div></div>
  </div>`;
}

function toastsHTML(ctx) {
  return `<div class="toasts" aria-live="polite">${ctx.ui.toasts.map((t) =>
    `<div class="toast ${t.kind === "error" ? "err" : ""}" role="${t.kind === "error" ? "alert" : "status"}">${t.kind === "error" ? icons.alert : ""}${esc(t.text)}
      ${t.actionLabel ? `<button data-action="toast-action" data-id="${t.id}">${esc(t.actionLabel)}</button>` : ""}
      <button class="x" data-action="toast-close" data-id="${t.id}" aria-label="Dismiss">${icons.x}</button></div>`).join("")}</div>`;
}

export function overlaysHTML(ctx) {
  return quickAddHTML(ctx) + dayListHTML(ctx) + pickerHTML(ctx) + projectPopHTML(ctx) + settingsHTML(ctx) + dialogHTML(ctx) + toastsHTML(ctx);
}
