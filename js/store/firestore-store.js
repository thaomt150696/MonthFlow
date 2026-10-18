// Firestore store: same API as memory-store.js, data under users/{uid}/tasks and users/{uid}/projects.
// Firestore applies writes locally at once (also offline) and syncs them in the background;
// listeners deliver both local and remote changes, so other devices update in real time.
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "../firebase.js";
import { defaultProjects } from "../sample-data.js";

const BATCH_LIMIT = 450; // Firestore allows 500 writes per batch

// Firestore rejects undefined values; the id lives in the document path, not the data.
function toData(item) {
  const { id, ...rest } = item;
  return JSON.parse(JSON.stringify(rest));
}

export function createFirestoreStore(uid) {
  const userRef = doc(db, "users", uid);
  const tasksCol = collection(userRef, "tasks");
  const projectsCol = collection(userRef, "projects");

  let state = { tasks: [], projects: [] };
  const pending = { tasks: false, projects: false };
  const loaded = { tasks: false, projects: false };
  let online = navigator.onLine;
  let failed = false;
  let sync = online ? "synced" : "offline";
  const listeners = new Set();
  const syncListeners = new Set();
  let markReady;
  const ready = new Promise((resolve) => { markReady = resolve; });

  function emit() { listeners.forEach((fn) => fn(state)); }
  function updateSync() {
    const next = failed ? "error" : !online ? "offline" : pending.tasks || pending.projects ? "syncing" : "synced";
    if (next === sync) return;
    sync = next;
    syncListeners.forEach((fn) => fn(next));
  }

  function listen(key, col) {
    return onSnapshot(col, { includeMetadataChanges: true }, (snap) => {
      state = { ...state, [key]: snap.docs.map((d) => ({ ...d.data(), id: d.id })) };
      pending[key] = snap.metadata.hasPendingWrites;
      loaded[key] = true;
      emit();
      updateSync();
      if (loaded.tasks && loaded.projects) markReady();
    }, () => {
      // Usually permission-denied: access was removed or the session expired.
      failed = true;
      updateSync();
      markReady();
    });
  }
  const unsubscribe = [listen("tasks", tasksCol), listen("projects", projectsCol)];

  const onOnline = () => { online = true; updateSync(); };
  const onOffline = () => { online = false; updateSync(); };
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  // Resolves when the server confirms; rejects (and the SDK rolls back) when it refuses.
  function write(promise) {
    return promise.then(
      () => { if (failed) { failed = false; updateSync(); } },
      (err) => { failed = true; updateSync(); throw err; }
    );
  }

  async function commitInBatches(ops) {
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
      await write(batch.commit());
    }
  }

  return {
    ready,
    getState: () => state,
    getSync: () => sync,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onSync(fn) { syncListeners.add(fn); return () => syncListeners.delete(fn); },

    putTask: (task) => write(setDoc(doc(tasksCol, task.id), toData({ ...task, updatedAt: Date.now() }))),
    updateTask: (id, patch) => write(updateDoc(doc(tasksCol, id), toData({ ...patch, updatedAt: Date.now() }))),
    removeTask: (id) => write(deleteDoc(doc(tasksCol, id))),

    putProject: (p) => write(setDoc(doc(projectsCol, p.id), toData(p))),
    updateProject: (id, patch) => write(updateDoc(doc(projectsCol, id), toData(patch))),
    removeProject(id) {
      const batch = writeBatch(db);
      batch.delete(doc(projectsCol, id));
      state.tasks.filter((t) => t.projectId === id).forEach((t) => batch.update(doc(tasksCol, t.id), { projectId: null, updatedAt: Date.now() }));
      return write(batch.commit());
    },

    // Merge a backup: same ID overwrites, new IDs are added, nothing is deleted.
    importData(data) {
      const ops = [
        ...(data.projects || []).map((p) => (b) => b.set(doc(projectsCol, p.id), toData(p))),
        ...(data.tasks || []).map((t) => (b) => b.set(doc(tasksCol, t.id), toData(t)))
      ];
      return commitInBatches(ops);
    },

    // First sign-in: create Training, Admin, Personal once. Never re-seeds after that.
    async ensureDefaults() {
      try {
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().seededAt) return;
        const batch = writeBatch(db);
        defaultProjects().forEach((p) => batch.set(doc(projectsCol, p.id), toData(p)));
        batch.set(userRef, { seededAt: Date.now() }, { merge: true });
        batch.commit().catch(() => {});
      } catch { /* offline on first launch: try again next time */ }
    },

    close() {
      unsubscribe.forEach((u) => u());
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    }
  };
}
