// Sync status badge in the header. v0: follows the browser's online/offline state.
import { icons } from "./icons.js";

const LABELS = {
  synced: [icons.synced, "Synced"],
  syncing: [icons.syncing, "Syncing…"],
  offline: [icons.offline, "Offline"],
  error: [icons.alert, "Not saved"]
};

let current = navigator.onLine ? "synced" : "offline";

export function syncBadge() {
  const [ico, label] = LABELS[current];
  return `<span class="sync" id="syncBadge" data-state="${current}" role="status">${ico}${label}</span>`;
}

export function setSyncState(state) {
  current = state;
  const el = document.getElementById("syncBadge");
  if (el) el.outerHTML = syncBadge();
}

window.addEventListener("online", () => setSyncState("synced"));
window.addEventListener("offline", () => setSyncState("offline"));
