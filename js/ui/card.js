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
  const tip = [task.title, STATUS_LABEL[task.status] + (task.dueDate ? " · Due " + fmtDayMonth(task.dueDate) : "")].join("\n");
  const attrs = `class="${cls}" data-action="open-task" data-id="${task.id}" data-drag-id="${task.id}" draggable="true" tabindex="0" title="${esc(tip)}"`;

  if (!large) {
    return `<div ${attrs}>${checkbox(task)}<span class="tt">${esc(task.title)}</span>${over ? `<span class="ov" aria-label="Overdue">${icons.alert}</span>` : ""}</div>`;
  }
  let meta = project ? `<span class="pd"><i></i>${esc(project.name)}</span>` : "";
  if (task.status === "in_progress") meta += '<span class="badge prog">In progress</span>';
  if (over) meta += `<span class="badge over">${icons.alert}Overdue · ${fmtDayMonth(task.dueDate)}</span>`;
  else if (task.dueDate && !done) meta += `<span>Due ${fmtDayMonth(task.dueDate)}</span>`;
  if (opts.showDate && task.scheduledDate) meta += `<span>${fmtDayMonth(task.scheduledDate)}</span>`;
  if (done) meta += "<span>Done</span>";
  return `<div ${attrs}>${checkbox(task, true)}<div class="body"><span class="tt">${esc(task.title)}</span>${meta ? `<span class="meta">${meta}</span>` : ""}</div></div>`;
}
