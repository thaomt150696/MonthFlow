// In-browser store used by the prototype and local previews.
// Same API as the Firestore store: changes apply at once (optimistic), then a simulated
// server confirms them. A failed save rolls back and rejects so the UI can offer Retry.

export function createMemoryStore({ seed, storageKey = "", latency = 450 } = {}) {
  let state = load() || seed();
  let online = true;
  let failNext = false;
  let inFlight = 0;
  let sync = "synced";
  const listeners = new Set();
  const syncListeners = new Set();

  function load() {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function persist() {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* storage blocked: keep in memory */ }
  }
  function emit() { listeners.forEach((fn) => fn(state)); }
  function setSync(s) {
    if (s === sync) return;
    sync = s;
    syncListeners.forEach((fn) => fn(s));
  }

  function commit(mutate) {
    const before = state;
    state = mutate(state);
    persist();
    emit();
    if (!online) { setSync("offline"); return Promise.resolve(); }
    inFlight++;
    setSync("syncing");
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        inFlight--;
        if (failNext) {
          failNext = false;
          state = before;
          persist();
          emit();
          setSync("error");
          reject(new Error("save-failed"));
          return;
        }
        if (inFlight === 0) setSync("synced");
        resolve();
      }, latency);
    });
  }

  const upsert = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

  return {
    getState: () => state,
    getSync: () => sync,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onSync(fn) { syncListeners.add(fn); return () => syncListeners.delete(fn); },

    putTask: (task) => commit((s) => ({ ...s, tasks: upsert(s.tasks, { ...task, updatedAt: Date.now() }) })),
    updateTask: (id, patch) => commit((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)) })),
    removeTask: (id) => commit((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),

    putProject: (p) => commit((s) => ({ ...s, projects: upsert(s.projects, p) })),
    updateProject: (id, patch) => commit((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    removeProject: (id) => commit((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t))
    })),

    // Merge a backup: same ID updates, new IDs are added, nothing is deleted.
    importData: (data) => commit((s) => ({
      projects: (data.projects || []).reduce(upsert, s.projects),
      tasks: (data.tasks || []).reduce(upsert, s.tasks)
    })),

    // Prototype controls
    setOnline(value) {
      online = value;
      if (!online) { setSync("offline"); return; }
      setSync("syncing");
      setTimeout(() => { if (online && inFlight === 0) setSync("synced"); }, latency + 300);
    },
    isOnline: () => online,
    failNextSave() { failNext = true; },
    replaceAll(next) { state = next; persist(); emit(); }
  };
}
