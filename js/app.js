// App controller: owns UI state, renders views, handles events, talks to the store.
import { appHTML } from "./ui/views.js";
import { overlaysHTML } from "./ui/overlays.js";
import { toISO, fromISO, addDays, weekKey, fmtShort, fmtDayMonth } from "./lib/date.js";
import { newTask, newProject, validateTitle, quickAddWarnings, PROJECT_COLORS, FOCUS_MAX } from "./model.js";
import { newId } from "./lib/id.js";

const PREFS_KEY = "monthflow-ui";

function readPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}
function writePrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
}

export function mountApp(root, { store, user, onSignOut, canDownload = true }) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = toISO(today);
  const prefs = readPrefs();
  const narrowQuery = matchMedia("(max-width: 1023px)");

  const ui = {
    view: prefs.view === "week" ? "week" : "month",
    cursor: today,
    selectedId: null,
    titleError: "",
    tray: false,
    focusCollapsed: !!prefs.focusCollapsed,
    sideCollapsed: !!prefs.sideCollapsed,
    narrow: narrowQuery.matches,
    sideOpenNarrow: false,
    shortcuts: false,
    qa: null,
    dayList: null,
    menu: null, // { id, x, y } from right-click, or { id } anchored to the card's ⋯ button
    picker: null,
    projectPop: null,
    settings: false,
    dialog: null,
    toasts: [],
    sync: store.getSync(),
    hintDismissed: false,
    inputs: {} // drafts of text fields, so a re-render never loses typing
  };
  let data = store.getState();
  let pointerDown = false, dragging = false, pendingRender = false, dragId = null, dropEl = null;
  let focusAfter = null;

  const find = (id) => data.tasks.find((t) => t.id === id);
  const ctx = () => ({ data, ui, user, todayISO, projectsById: Object.fromEntries(data.projects.map((p) => [p.id, p])) });

  /* ---------- rendering ---------- */
  const SCROLLERS = [".content", ".tray-b", ".dp-b", ".daylist"];
  let scrollView = null; // calendar scroll only carries over within the same month/week view

  function render() {
    pendingRender = false;
    const focus = captureFocus();
    const view = ui.view + ":" + (ui.view === "month" ? ui.cursor.getFullYear() + "-" + ui.cursor.getMonth() : weekKey(ui.cursor));
    const scrolls = SCROLLERS.map((s) => { const el = root.querySelector(s); return el ? el.scrollTop : 0; });
    if (view !== scrollView) scrolls[0] = 0;
    scrollView = view;
    const c = ctx();
    root.innerHTML = appHTML(c) + overlaysHTML(c);
    SCROLLERS.forEach((s, i) => { const el = root.querySelector(s); if (el && scrolls[i]) el.scrollTop = scrolls[i]; });
    markScrolled();
    restoreFocus(focus);
    placePopovers();
  }
  function markScrolled() {
    const el = root.querySelector(".content");
    if (el) el.classList.toggle("is-scrolled", el.scrollTop > 0);
  }
  // Store and sync events can arrive mid-click or mid-drag; wait so the click still lands.
  function requestRender() {
    if (pointerDown || dragging) { pendingRender = true; return; }
    render();
  }

  function captureFocus() {
    const el = document.activeElement;
    if (!el || !root.contains(el) || el === root) return null;
    if (el.id) {
      let s = null, e = null;
      try { s = el.selectionStart; e = el.selectionEnd; } catch { /* not a text field */ }
      return { id: el.id, s, e };
    }
    if (el.dataset.action) {
      const keys = ["id", "date", "item", "value"].filter((k) => el.dataset[k]);
      return { sel: `[data-action="${el.dataset.action}"]` + keys.map((k) => `[data-${k}="${el.dataset[k]}"]`).join("") };
    }
    return null;
  }
  function restoreFocus(f) {
    const target = focusAfter ? document.getElementById(focusAfter) : f && (f.id ? document.getElementById(f.id) : root.querySelector(f.sel));
    const fromDraft = !focusAfter && f && f.id;
    focusAfter = null;
    if (!target) return;
    target.focus({ preventScroll: true });
    if (fromDraft && f.s != null) { try { target.setSelectionRange(f.s, f.e); } catch { /* ignore */ } }
  }

  function place(pop, anchor, mode) {
    const w = pop.offsetWidth, h = pop.offsetHeight, m = 8;
    let x, y;
    if (!anchor) { x = (innerWidth - w) / 2; y = 80; }
    else {
      const r = anchor.getBoundingClientRect();
      if (mode === "over") { x = r.left - 6; y = r.top - 6; }
      else if (mode === "below") { x = r.left; y = r.bottom + 6; }
      else { x = r.right + 8; if (x + w > innerWidth - m) x = r.left - w - 8; y = r.top - 8; }
    }
    pop.style.left = Math.max(m, Math.min(x, innerWidth - w - m)) + "px";
    pop.style.top = Math.max(m, Math.min(y, innerHeight - h - m)) + "px";
  }
  function placePopovers() {
    const q = (s) => root.querySelector(s);
    const qaAnchor = ui.qa && (ui.qa.anchor === "day" ? q(`.cell[data-date="${ui.qa.date}"]`) || q(`.col[data-date="${ui.qa.date}"]`) : q("#newTaskBtn"));
    const m = ui.menu;
    const menuAnchor = m && (m.x != null
      ? { getBoundingClientRect: () => ({ left: m.x, right: m.x, top: m.y, bottom: m.y }) }
      : q(`.menu-btn[data-id="${m.id}"]`) || q(`.card[data-id="${m.id}"]`));
    const pops = [
      ["qa", qaAnchor, "side"],
      ["menu", menuAnchor, "below"],
      ["daylist", ui.dayList && q(`.cell[data-date="${ui.dayList.date}"]`), "over"],
      ["picker", q("#pinSlot"), "below"],
      ["project", ui.projectPop && (ui.projectPop.id ? q(`[data-project-row="${ui.projectPop.id}"]`) : q("#addProjectBtn")), "side"]
    ];
    for (const [name, anchor, mode] of pops) {
      const pop = q(`[data-pop="${name}"]`);
      if (pop) place(pop, anchor, mode);
    }
  }

  /* ---------- feedback ---------- */
  function toast(text, opts = {}) {
    const t = { id: newId(), text, kind: opts.kind || "info", actionLabel: opts.actionLabel || "", action: opts.action || null };
    ui.toasts = [...ui.toasts.slice(-2), t];
    if (t.kind !== "error") setTimeout(() => dismissToast(t.id), 6000);
    requestRender();
  }
  function dismissToast(id) {
    if (!ui.toasts.some((t) => t.id === id)) return;
    ui.toasts = ui.toasts.filter((t) => t.id !== id);
    requestRender();
  }
  // Every write goes through here: on failure the store has rolled back; offer Retry.
  function run(op) {
    return op().catch(() => toast("Couldn’t save your changes.", { kind: "error", actionLabel: "Retry", action: () => run(op) }));
  }

  /* ---------- tasks ---------- */
  function toggleDone(id) {
    const t = find(id);
    if (!t) return;
    const patch = t.status === "done"
      ? { status: t.statusBeforeDone || "todo", statusBeforeDone: null, completedAt: null }
      : { status: "done", statusBeforeDone: t.status, completedAt: Date.now() };
    run(() => store.updateTask(id, patch));
  }
  function setStatus(t, status) {
    const patch = status === "done"
      ? { status, statusBeforeDone: t.status === "done" ? t.statusBeforeDone : t.status, completedAt: t.completedAt || Date.now() }
      : { status, statusBeforeDone: null, completedAt: null };
    run(() => store.updateTask(t.id, patch));
  }
  function moveTask(id, date) {
    const t = find(id);
    if (!t || t.scheduledDate === date) return;
    const prev = t.scheduledDate;
    run(() => store.updateTask(id, { scheduledDate: date }));
    toast(date ? "Moved to " + fmtShort(date) : "Moved to Inbox", { actionLabel: "Undo", action: () => run(() => store.updateTask(id, { scheduledDate: prev })) });
  }
  function deleteTask(id) {
    const t = find(id);
    if (!t) return;
    if (ui.selectedId === id) closePanelNow();
    run(() => store.removeTask(id));
    toast("Task deleted", { actionLabel: "Undo", action: () => run(() => store.putTask(t)) });
  }
  function toggleFocus(id) {
    const t = find(id);
    if (!t || !t.scheduledDate) return;
    const key = weekKey(fromISO(t.scheduledDate));
    if (t.focusWeek === key) { run(() => store.updateTask(id, { focusWeek: null })); return; }
    if (data.tasks.filter((x) => x.focusWeek === key).length >= FOCUS_MAX) { toast("This week already has 3 focus tasks."); return; }
    run(() => store.updateTask(id, { focusWeek: key }));
  }
  function pinTask(id) {
    const key = weekKey(ui.cursor);
    ui.picker = null;
    if (data.tasks.filter((x) => x.focusWeek === key).length >= FOCUS_MAX) { toast("This week already has 3 focus tasks."); return; }
    run(() => store.updateTask(id, { focusWeek: key }));
  }
  function addInbox(text) {
    const title = text.trim();
    const err = validateTitle(title);
    if (err) { if (title) toast(err, { kind: "error" }); return; }
    const task = newTask({ title });
    delete ui.inputs["inbox-new"];
    focusAfter = "inbox-new";
    run(() => store.putTask(task));
    toast("Added to Inbox", { actionLabel: "Undo", action: () => run(() => store.removeTask(task.id)) });
  }

  /* ---------- task details panel ---------- */
  function clearPanelInputs() {
    ["dp-title", "dp-notes", "dp-check-new"].forEach((k) => delete ui.inputs[k]);
  }
  function openTask(id) {
    if (!find(id)) return;
    closeTransient();
    if (ui.selectedId && ui.selectedId !== id && !savePanelDrafts()) return;
    ui.selectedId = id;
    ui.titleError = "";
    clearPanelInputs();
  }
  // Saves typed title/notes; returns false when the title is invalid and the panel must stay.
  function savePanelDrafts() {
    const t = find(ui.selectedId);
    if (!t) return true;
    if ("dp-title" in ui.inputs) {
      const err = validateTitle(ui.inputs["dp-title"]);
      if (err) { ui.titleError = err; focusAfter = "dp-title"; return false; }
      const title = ui.inputs["dp-title"].trim();
      if (title !== t.title) run(() => store.updateTask(t.id, { title }));
    }
    if ("dp-notes" in ui.inputs && ui.inputs["dp-notes"] !== (t.notes || "")) {
      const notes = ui.inputs["dp-notes"];
      run(() => store.updateTask(t.id, { notes }));
    }
    ui.titleError = "";
    clearPanelInputs();
    return true;
  }
  function closePanel() {
    if (!savePanelDrafts()) return;
    closePanelNow();
  }
  function closePanelNow() {
    ui.selectedId = null;
    ui.titleError = "";
    clearPanelInputs();
  }
  function updateChecklist(fn) {
    const t = find(ui.selectedId);
    if (t) run(() => store.updateTask(t.id, { checklist: fn(t.checklist) }));
  }

  /* ---------- quick add ---------- */
  function openQA(date, anchor) {
    closeTransient();
    ui.qa = {
      date, anchor,
      draft: { title: "", date: date || "", priority: "medium", projectId: "", due: "", notes: "" },
      more: false, error: "", warnings: [], warnedKey: ""
    };
    focusAfter = "qa-title";
  }
  function requestCloseQA() {
    if (!ui.qa) return;
    const d = ui.qa.draft;
    if (d.title.trim() || d.notes.trim()) {
      ui.dialog = {
        title: "Discard this task?", body: "You typed a task name but haven’t created it yet.",
        cancel: "Keep editing", confirm: "Discard",
        onConfirm: () => { ui.qa = null; },
        onCancel: () => { focusAfter = "qa-title"; }
      };
      focusAfter = "dlgCancel";
    } else {
      ui.qa = null;
    }
  }
  function submitQA() {
    const qa = ui.qa;
    if (!qa) return;
    const d = qa.draft;
    const err = validateTitle(d.title);
    if (err) { qa.error = err; qa.warnings = []; focusAfter = "qa-title"; render(); return; }
    qa.error = "";
    const warnings = quickAddWarnings(d, data.tasks, todayISO);
    const key = JSON.stringify(d);
    if (warnings.length && qa.warnedKey !== key) { qa.warnings = warnings; qa.warnedKey = key; render(); return; }
    const task = newTask({
      title: d.title.trim(), scheduledDate: d.date || null, priority: d.priority,
      projectId: d.projectId || null, dueDate: d.due || null, notes: d.notes.trim()
    });
    ui.qa = null;
    run(() => store.putTask(task));
    toast(task.scheduledDate ? "Task created" : "Added to Inbox", { actionLabel: "Undo", action: () => run(() => store.removeTask(task.id)) });
    render();
  }

  /* ---------- projects ---------- */
  function openProject(id) {
    closeTransient();
    const p = id && data.projects.find((x) => x.id === id);
    const used = new Set(data.projects.map((x) => x.color));
    ui.projectPop = { id: p ? p.id : null, draft: { name: p ? p.name : "", color: p ? p.color : PROJECT_COLORS.find((c) => !used.has(c)) || "slate" }, error: "" };
    focusAfter = "proj-name";
  }
  function saveProject() {
    const pp = ui.projectPop;
    const name = pp.draft.name.trim();
    if (!name) { pp.error = "Enter a project name."; focusAfter = "proj-name"; render(); return; }
    if (pp.id) run(() => store.updateProject(pp.id, { name, color: pp.draft.color }));
    else run(() => store.putProject(newProject({ name, color: pp.draft.color })));
    ui.projectPop = null;
    render();
  }
  function confirmDeleteProject() {
    const p = data.projects.find((x) => x.id === ui.projectPop.id);
    ui.projectPop = null;
    if (!p) return;
    ui.dialog = {
      title: `Delete “${p.name}”?`, body: "Its tasks stay on your calendar without a project.",
      cancel: "Cancel", confirm: "Delete project",
      onConfirm: () => run(() => store.removeProject(p.id))
    };
    focusAfter = "dlgCancel";
  }

  /* ---------- settings ---------- */
  function exportData() {
    const name = `monthflow-backup-${todayISO}.json`;
    if (!canDownload) { toast("Downloads are turned off in this preview. Export works in the real app."); return; }
    const blob = new Blob([JSON.stringify({ app: "MonthFlow", version: 1, exportedAt: new Date().toISOString(), projects: data.projects, tasks: data.tasks }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Exported " + name);
  }
  async function importFile(file) {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!json || !Array.isArray(json.tasks)) throw new Error("not a backup");
      const tasks = json.tasks.filter((t) => t && t.id && typeof t.title === "string").map((t) => newTask(t));
      const projects = (json.projects || []).filter((p) => p && p.id && p.name).map((p) => newProject(p));
      run(() => store.importData({ tasks, projects }));
      toast(`Imported ${tasks.length} tasks`);
    } catch {
      toast("This file isn’t a MonthFlow backup.", { kind: "error" });
    }
  }

  /* ---------- navigation ---------- */
  function move(n) {
    const c = ui.cursor;
    if (ui.view === "month") {
      const last = new Date(c.getFullYear(), c.getMonth() + n + 1, 0).getDate();
      ui.cursor = new Date(c.getFullYear(), c.getMonth() + n, Math.min(c.getDate(), last));
    } else {
      ui.cursor = addDays(c, 7 * n);
    }
    ui.dayList = null;
    ui.picker = null;
  }
  function setView(v) {
    ui.view = v;
    ui.dayList = null;
    ui.picker = null;
    writePrefs({ ...readPrefs(), view: v });
  }
  function closeTransient() {
    ui.dayList = null;
    ui.picker = null;
    ui.projectPop = null;
    ui.menu = null;
  }
  function toggleSide() {
    if (ui.narrow) { ui.sideOpenNarrow = !ui.sideOpenNarrow; return; }
    ui.sideCollapsed = !ui.sideCollapsed;
    writePrefs({ ...readPrefs(), sideCollapsed: ui.sideCollapsed });
  }
  function openMenu(id, point) {
    closeTransient();
    ui.menu = point ? { id, x: point.x, y: point.y } : { id };
    focusAfter = "menu-first";
  }
  // Runs a menu command on the task the menu was opened for.
  function menuCommand(fn) {
    const id = ui.menu && ui.menu.id;
    ui.menu = null;
    if (id) fn(id);
  }
  function handleEscape() {
    if (ui.dialog) { const d = ui.dialog; ui.dialog = null; d.onCancel && d.onCancel(); return true; }
    if (ui.qa) { requestCloseQA(); return true; }
    if (ui.projectPop || ui.picker || ui.dayList || ui.menu) { closeTransient(); return true; }
    if (ui.shortcuts) { ui.shortcuts = false; return true; }
    if (ui.settings) { ui.settings = false; return true; }
    if (ui.narrow && ui.sideOpenNarrow) { ui.sideOpenNarrow = false; return true; }
    if (ui.selectedId) { closePanel(); return true; }
    if (ui.tray) { ui.tray = false; return true; }
    return false;
  }

  /* ---------- events ---------- */
  const actions = {
    toggle: (el) => toggleDone(el.dataset.id),
    "open-task": (el) => openTask(el.dataset.id),
    cell: (el) => openQA(el.dataset.date, "day"),
    "add-day": (el) => openQA(el.dataset.date, "day"),
    "new-task": () => openQA(null, "button"),
    daylist: (el) => { closeTransient(); ui.dayList = { date: el.dataset.date }; },
    "daylist-close": () => { ui.dayList = null; },
    prev: () => move(-1),
    next: () => move(1),
    today: () => { ui.cursor = today; },
    "view-month": () => setView("month"),
    "view-week": () => setView("week"),
    "toggle-tray": () => { ui.tray = !ui.tray; if (ui.tray) focusAfter = "inbox-new"; },
    "go-calendar": () => { ui.tray = false; },
    "toggle-side": () => toggleSide(),
    "card-menu": (el) => openMenu(el.dataset.id),
    "menu-open": () => menuCommand(openTask),
    "menu-done": () => menuCommand(toggleDone),
    "menu-inbox": () => menuCommand((id) => moveTask(id, null)),
    "menu-delete": () => menuCommand(deleteTask),
    "close-panel": () => closePanel(),
    "delete-task": () => deleteTask(ui.selectedId),
    "focus-toggle": () => toggleFocus(ui.selectedId),
    "check-toggle": (el) => updateChecklist((list) => list.map((c) => (c.id === el.dataset.item ? { ...c, done: !c.done } : c))),
    "check-delete": (el) => updateChecklist((list) => list.filter((c) => c.id !== el.dataset.item)),
    "qa-cancel": () => requestCloseQA(),
    "qa-more": () => { ui.qa.more = true; focusAfter = "qa-due"; },
    "qa-priority": (el) => { ui.qa.draft.priority = el.dataset.value; },
    "pin-slot": () => { closeTransient(); ui.picker = true; },
    "picker-close": () => { ui.picker = null; },
    "pin-task": (el) => pinTask(el.dataset.id),
    unpin: (el) => run(() => store.updateTask(el.dataset.id, { focusWeek: null })),
    "focus-collapse": () => { ui.focusCollapsed = !ui.focusCollapsed; writePrefs({ ...readPrefs(), focusCollapsed: ui.focusCollapsed }); },
    "project-new": () => openProject(null),
    "project-edit": (el) => openProject(el.dataset.id),
    "project-color": (el) => { ui.projectPop.draft.color = el.dataset.value; },
    "project-cancel": () => { ui.projectPop = null; },
    "project-delete": () => confirmDeleteProject(),
    "settings-open": () => { closeTransient(); ui.settings = true; focusAfter = "settingsClose"; },
    "settings-close": () => { ui.settings = false; },
    "shortcuts-open": () => { closeTransient(); ui.settings = false; ui.shortcuts = true; focusAfter = "shortcutsClose"; },
    "shortcuts-close": () => { ui.shortcuts = false; },
    export: () => exportData(),
    "sign-out": () => { ui.settings = false; if (onSignOut) onSignOut(); },
    "toast-action": (el) => { const t = ui.toasts.find((x) => x.id === el.dataset.id); dismissToast(el.dataset.id); if (t && t.action) t.action(); },
    "toast-close": (el) => dismissToast(el.dataset.id),
    "dialog-confirm": () => { const d = ui.dialog; ui.dialog = null; d.onConfirm(); },
    "dialog-cancel": () => { const d = ui.dialog; ui.dialog = null; if (d.onCancel) d.onCancel(); },
    "hint-dismiss": () => { ui.hintDismissed = true; }
  };

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    const action = el && el.dataset.action;
    // A click outside a light popover closes it and is not passed on (checkboxes and toasts still work).
    if (!e.target.closest("[data-pop]") && !ui.dialog && (ui.qa || ui.dayList || ui.picker || ui.projectPop || ui.menu)) {
      const passThrough = action === "toggle" || action === "toast-action" || action === "toast-close";
      if (ui.qa) requestCloseQA();
      closeTransient();
      if (!passThrough) { render(); return; }
    }
    // Narrow window: the expanded sidebar floats; a click outside closes it.
    const inSide = !!e.target.closest(".side");
    if (ui.narrow && ui.sideOpenNarrow && !inSide) { ui.sideOpenNarrow = false; render(); return; }
    if (!el || !actions[action]) return;
    actions[action](el);
    if (ui.narrow && inSide && !["toggle-side", "project-new", "project-edit"].includes(action)) ui.sideOpenNarrow = false;
    render();
  });

  root.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target.id === "qaForm") submitQA();
    else if (e.target.id === "projForm") saveProject();
  });

  const QA_FIELDS = { "qa-title": "title", "qa-date": "date", "qa-project": "projectId", "qa-due": "due", "qa-notes": "notes" };
  root.addEventListener("input", (e) => {
    const el = e.target;
    if (ui.qa && QA_FIELDS[el.id]) {
      ui.qa.draft[QA_FIELDS[el.id]] = el.value;
      if (el.id === "qa-title" && ui.qa.error && el.value.trim()) {
        ui.qa.error = "";
        el.classList.remove("is-error");
        const msg = document.getElementById("qa-err");
        if (msg) msg.remove();
      }
      return;
    }
    if (ui.projectPop && el.id === "proj-name") { ui.projectPop.draft.name = el.value; return; }
    if (el.id && "keep" in el.dataset) ui.inputs[el.id] = el.value;
  });

  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.id === "importFile") { importFile(el.files && el.files[0]); return; }
    const t = find(ui.selectedId);
    if (!t) return;
    switch (el.id) {
      case "dp-title": {
        const err = validateTitle(el.value);
        if (err) { ui.titleError = err; ui.inputs["dp-title"] = el.value; requestRender(); return; }
        ui.titleError = "";
        delete ui.inputs["dp-title"];
        const title = el.value.trim();
        if (title !== t.title) run(() => store.updateTask(t.id, { title }));
        else requestRender();
        return;
      }
      case "dp-notes":
        delete ui.inputs["dp-notes"];
        if (el.value !== (t.notes || "")) run(() => store.updateTask(t.id, { notes: el.value }));
        return;
      case "dp-status": setStatus(t, el.value); return;
      case "dp-priority": run(() => store.updateTask(t.id, { priority: el.value })); return;
      case "dp-project": run(() => store.updateTask(t.id, { projectId: el.value || null })); return;
      case "dp-date": run(() => store.updateTask(t.id, { scheduledDate: el.value || null })); return;
      case "dp-due": run(() => store.updateTask(t.id, { dueDate: el.value || null })); return;
    }
  });

  root.addEventListener("keydown", (e) => {
    const el = e.target;
    if (el.id === "dp-title" && e.key === "Enter") { e.preventDefault(); el.blur(); }
    else if (el.id === "dp-check-new" && e.key === "Enter") {
      e.preventDefault();
      const text = el.value.trim();
      if (!text) return;
      delete ui.inputs["dp-check-new"];
      focusAfter = "dp-check-new";
      updateChecklist((list) => [...list, { id: newId(), text, done: false }]);
    }
    else if (el.id === "inbox-new" && e.key === "Enter") { e.preventDefault(); addInbox(el.value); }
    else if (el.id === "qa-notes" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitQA(); }
    else if (el.classList.contains("card") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openTask(el.dataset.id); render(); }
    else if (el.classList.contains("card") && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); deleteTask(el.dataset.id); render(); }
    else if (el.classList.contains("card") && (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10"))) { e.preventDefault(); openMenu(el.dataset.id); render(); }
  });

  // Right-click on any task card opens its action menu.
  root.addEventListener("contextmenu", (e) => {
    const card = e.target.closest(".card[data-id]");
    if (!card || ui.dialog) return;
    e.preventDefault();
    if (ui.qa) { requestCloseQA(); render(); return; }
    openMenu(card.dataset.id, { x: e.clientX, y: e.clientY });
    render();
  });

  document.addEventListener("keydown", (e) => {
    if (!root.isConnected) return;
    if (e.key === "Escape") { if (handleEscape()) { e.preventDefault(); render(); } return; }
    const typing = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
    if (typing || e.ctrlKey || e.metaKey || e.altKey || ui.dialog || ui.settings || ui.shortcuts || ui.qa || ui.projectPop) return;
    const k = e.key.toLowerCase();
    if (e.key === "?") { e.preventDefault(); closeTransient(); ui.shortcuts = true; focusAfter = "shortcutsClose"; }
    else if (k === "n") { e.preventDefault(); openQA(null, "button"); }
    else if (k === "t") ui.cursor = today;
    else if (k === "m") setView("month");
    else if (k === "w") setView("week");
    else if (e.key === "[") toggleSide();
    else if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowRight") move(1);
    else return;
    render();
  });

  // Pointer tracking for requestRender()
  document.addEventListener("pointerdown", (e) => { if (root.contains(e.target)) pointerDown = true; }, true);
  const release = () => {
    if (!pointerDown) return;
    pointerDown = false;
    if (pendingRender) setTimeout(() => { if (pendingRender && !pointerDown && !dragging) render(); }, 0);
  };
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
  // Re-check the narrow breakpoint on every resize too: some browsers skip the media query change event.
  const syncNarrow = () => {
    if (narrowQuery.matches === ui.narrow) return false;
    ui.narrow = narrowQuery.matches;
    ui.sideOpenNarrow = false;
    requestRender();
    return true;
  };
  window.addEventListener("resize", () => { if (!syncNarrow()) placePopovers(); });
  narrowQuery.addEventListener("change", syncNarrow);
  root.addEventListener("scroll", (e) => {
    if (e.target.classList && e.target.classList.contains("content")) { markScrolled(); placePopovers(); }
  }, true);

  /* ---------- drag and drop ---------- */
  function setDrop(el) {
    if (dropEl === el) return;
    if (dropEl) { dropEl.classList.remove("is-drop"); if (dropEl.dataset.drop !== "inbox") dropEl.removeAttribute("data-drop-label"); }
    dropEl = el;
    if (!el) return;
    el.classList.add("is-drop");
    if (el.dataset.drop !== "inbox") {
      const t = find(dragId);
      el.dataset.dropLabel = "Move to " + fmtShort(el.dataset.drop) + (t && t.dueDate ? " · due " + fmtDayMonth(t.dueDate) + " stays" : "");
    }
  }
  function endDrag() {
    dragging = false;
    pointerDown = false;
    setDrop(null);
    root.querySelectorAll(".is-dragging").forEach((n) => n.classList.remove("is-dragging"));
  }
  root.addEventListener("dragstart", (e) => {
    const card = e.target.closest("[data-drag-id]");
    if (!card) return;
    dragging = true;
    dragId = card.dataset.dragId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragId);
    const pop = card.closest('[data-pop="daylist"]');
    if (pop) { ui.dayList = null; pendingRender = true; requestAnimationFrame(() => { pop.style.visibility = "hidden"; }); }
    requestAnimationFrame(() => card.classList.add("is-dragging"));
  });
  root.addEventListener("dragover", (e) => {
    if (!dragging) return;
    const target = e.target.closest("[data-drop]");
    setDrop(target);
    if (!target) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  root.addEventListener("dragleave", (e) => {
    if (dragging && !root.contains(e.relatedTarget)) setDrop(null);
  });
  root.addEventListener("drop", (e) => {
    const target = e.target.closest("[data-drop]");
    if (!dragging || !target) return;
    e.preventDefault();
    const id = dragId;
    const date = target.dataset.drop === "inbox" ? null : target.dataset.drop;
    endDrag();
    moveTask(id, date);
    render();
  });
  root.addEventListener("dragend", () => {
    const was = dragging;
    endDrag();
    if (was || pendingRender) render();
  });

  /* ---------- store ---------- */
  store.subscribe((s) => {
    data = s;
    if (ui.selectedId && !find(ui.selectedId)) closePanelNow();
    requestRender();
  });
  store.onSync((s) => { ui.sync = s; requestRender(); });

  render();
  return { render };
}
