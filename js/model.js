// Task and project shapes, labels and validation rules.
import { newId } from "./lib/id.js";

export const PROJECT_COLORS = ["blue", "teal", "green", "amber", "orange", "rose", "violet", "slate"];
export const STATUS_LABEL = { todo: "Todo", in_progress: "In progress", done: "Done" };
export const PRIORITY_LABEL = { low: "Low", medium: "Medium", high: "High" };
export const TITLE_MAX = 120;
export const FOCUS_MAX = 3;

export function newTask(fields = {}) {
  const now = Date.now();
  return {
    id: newId(),
    title: "",
    status: "todo",
    statusBeforeDone: null,
    priority: "medium",
    projectId: null,
    scheduledDate: null,
    dueDate: null,
    checklist: [],
    notes: "",
    focusWeek: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...fields
  };
}

export function newProject(fields = {}) {
  return { id: newId(), name: "", color: "blue", createdAt: Date.now(), ...fields };
}

// Overdue is derived, never stored: a due date in the past and not done.
export function isOverdue(task, todayISO) {
  return !!task.dueDate && task.dueDate < todayISO && task.status !== "done";
}

export function validateTitle(title) {
  const t = (title || "").trim();
  if (!t) return "Enter a task name.";
  if (t.length > TITLE_MAX) return "Keep the task name under " + TITLE_MAX + " characters.";
  return "";
}

// Warnings never block saving; the person confirms with "Create anyway".
export function quickAddWarnings(draft, tasks, todayISO) {
  const out = [];
  if (draft.date && draft.due && draft.due < draft.date) out.push("The due date is before the scheduled date.");
  if (draft.date && draft.date < todayISO) out.push("The scheduled date is in the past.");
  const name = draft.title.trim().toLowerCase();
  if (draft.date && tasks.some((t) => t.scheduledDate === draft.date && t.title.trim().toLowerCase() === name)) {
    out.push("A task with this name is already on this day.");
  }
  return out;
}

export function byCreated(a, b) {
  return (a.createdAt || 0) - (b.createdAt || 0);
}
