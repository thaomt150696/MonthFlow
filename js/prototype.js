// Prototype mode: the real app UI on an in-browser store with sample data,
// plus a small control panel to simulate offline, save errors and an empty calendar.
import { createMemoryStore } from "./store/memory-store.js";
import { mountApp } from "./app.js";
import { sampleData, defaultProjects } from "./sample-data.js";

const STORAGE_KEY = "monthflow-prototype-v1";

export function startPrototype(root, { user, onSignOut, canDownload = true } = {}) {
  const store = createMemoryStore({ seed: () => sampleData(), storageKey: STORAGE_KEY });
  mountApp(root, {
    store,
    user: user || { displayName: "Preview user", email: "preview@example.com", photoURL: "" },
    onSignOut: onSignOut || (() => {}),
    canDownload
  });
  mountControls(store);
}

function mountControls(store) {
  const host = document.createElement("div");
  host.className = "proto";
  document.body.appendChild(host);
  let open = false;
  let failArmed = false;

  const draw = () => {
    host.innerHTML = `
      ${open ? `<div class="proto-panel" role="dialog" aria-label="Prototype controls">
        <div><h4>Prototype MonthFlow</h4><p>Dữ liệu mẫu, chỉ lưu trên trình duyệt này. Chưa kết nối Firebase.</p></div>
        <ul>
          <li>Bấm vào một ngày để tạo task</li>
          <li>Tick checkbox để hoàn thành, tick lại để hoàn tác</li>
          <li>Kéo thẻ sang ngày khác</li>
          <li>Bấm vào thẻ để mở Task details</li>
          <li>Xóa task: chuột phải vào thẻ, nút ⋯ trên thẻ ở Week/Inbox, phím Delete, hoặc nút thùng rác trong Task details</li>
          <li>Thu gọn menu trái: nút cạnh chữ MonthFlow hoặc phím [</li>
          <li>Bấm Inbox, kéo task vào lịch</li>
          <li>Chuyển sang Week, ghim Weekly Focus</li>
          <li>Phím tắt: N, T, M, W, ← →, Esc</li>
        </ul>
        <div class="proto-actions">
          <button class="btn secondary sm" data-p="offline" aria-pressed="${!store.isOnline()}">${store.isOnline() ? "Giả lập mất mạng" : "Có mạng trở lại"}</button>
          <button class="btn secondary sm" data-p="fail" aria-pressed="${failArmed}">${failArmed ? "Lần lưu tới sẽ lỗi…" : "Cho lần lưu tới bị lỗi"}</button>
          <button class="btn secondary sm" data-p="empty">Xem lịch trống (lần đầu dùng)</button>
          <button class="btn secondary sm" data-p="reset">Khôi phục dữ liệu mẫu</button>
        </div>
      </div>` : ""}
      <button class="proto-toggle" data-p="toggle" aria-expanded="${open}"><i></i>Prototype</button>`;
  };

  host.addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]");
    if (!b) return;
    const a = b.dataset.p;
    if (a === "toggle") open = !open;
    else if (a === "offline") store.setOnline(!store.isOnline());
    else if (a === "fail") { store.failNextSave(); failArmed = true; }
    else if (a === "empty") store.replaceAll({ projects: defaultProjects(), tasks: [] });
    else if (a === "reset") store.replaceAll(sampleData());
    draw();
  });
  store.onSync((s) => { if (s === "error" || s === "synced") { failArmed = failArmed && s !== "error"; draw(); } });
  draw();
}
