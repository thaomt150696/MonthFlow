// Task card used on Month (compact) and Week / Inbox / Focus (large).
import { icons, checkSVG } from "./icons.js";
import { esc } from "../lib/html.js";
import { fmtDayMonth } from "../lib/date.js";
import { isOverdue, STATUS_LABEL } from "../model.js";

export function checkbox(task, large) {
  const done = task.status === "done";
  return `<button class="cb ${large ? "lg" : ""}" data-action="toggle" data-id="${task.id}" aria-label="${done ? "Mark as not done" : "Mark as done"}" aria-pressed="${done}"><span class="box">${done ? checkSVG : ""}</span></button>`;
}

export function cardHTML(task, project, ctx, opts = {}) {
  const large = opts.size === "lg";
  const done = task.status === "done";
  const over = isOverdue(task, ctx.todayISO);
  const color = project ? project.color : "slate";
  const cls = ["card", large ? "lg" : "", "pj-" + color, done ? "is-done" : "", task.status === "in_progress" ? "is-prog" : "", ctx.ui.selectedId === task.id ? "is-sel" : ""].join(" ");
  const tip = [task.title, STATUS_LABEL[task.status] + (task.dueDate ? " · Due " + fmtDayMonth(task.dueDate) : ""), "Right-click for more actions"].join("\n");
  const attrs = `class="${cls}" data-action="open-task" data-id="${task.id}" data-drag-id="${task.id}" draggable="true" tabindex="0" title="${esc(tip)}"`;

  if (!large) {
    return `<div ${attrs}>${checkbox(task)}<span class="tt">${esc(task.title)}</span>${over ? `<span class="ov" aria-label="Overdue">${icons.alert}</span>` : ""}</div>`;
  }
  // Each meta item may shrink; badge text truncates instead of overflowing narrow columns.
  let meta = project ? `<span class="pd"><i></i><span class="bt">${esc(project.name)}</span></span>` : "";
  if (task.status === "in_progress") meta += '<span class="badge prog"><span class="bt">In progress</span></span>';
  if (over) meta += `<span class="badge over">${icons.alert}<span class="bt">Overdue</span></span><span class="bt">Due ${fmtDayMonth(task.dueDate)}</span>`;
  else if (task.dueDate && !done) meta += `<span class="bt">Due ${fmtDayMonth(task.dueDate)}</span>`;
  if (opts.showDate && task.scheduledDate) meta += `<span class="bt">${fmtDayMonth(task.scheduledDate)}</span>`;
  if (done) meta += "<span>Done</span>";
  const menu = opts.noMenu ? "" : `<button class="menu-btn" data-action="card-menu" data-id="${task.id}" aria-label="More actions for ${esc(task.title)}" title="More actions">${icons.more}</button>`;
  return `<div ${attrs}>${checkbox(task, true)}<div class="body"><span class="tt">${esc(task.title)}</span>${meta ? `<span class="meta">${meta}</span>` : ""}</div>${menu}</div>`;
}
