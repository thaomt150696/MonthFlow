// Entry point: decides which screen to show and wires up events.
import { isConfigured } from "./firebase-config.js";
import { splashView, setupView, signInView, deniedView } from "./ui/screens.js";
import { shellView } from "./ui/shell.js";

const root = document.getElementById("app");
const today = new Date();
let cursor = new Date(today.getFullYear(), today.getMonth(), 1);

function render(html) {
  root.innerHTML = html;
}

function renderShell(user, onSignOut) {
  render(shellView({ user, cursor, today }));
  const moveMonth = (n) => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1); renderShell(user, onSignOut); };
  root.querySelector("#prevBtn").addEventListener("click", () => moveMonth(-1));
  root.querySelector("#nextBtn").addEventListener("click", () => moveMonth(1));
  root.querySelector("#todayBtn").addEventListener("click", () => { cursor = new Date(today.getFullYear(), today.getMonth(), 1); renderShell(user, onSignOut); });
  root.querySelector("#signOutBtn").addEventListener("click", onSignOut);
}

// Without Firebase config: setup screen plus local previews of each screen.
function startPreview() {
  const fakeUser = { displayName: "Preview user", email: "preview@example.com", photoURL: "" };
  const show = () => {
    const h = location.hash;
    if (h === "#preview-signin") {
      render(signInView());
      root.querySelector("#signInBtn").addEventListener("click", () => render(signInView({ error: "Firebase isn’t configured yet, so sign-in is only a preview." })));
    } else if (h === "#preview-denied") {
      render(deniedView({ email: "other.person@gmail.com" }));
    } else if (h === "#preview-app") {
      renderShell(fakeUser, () => { location.hash = "#preview-signin"; });
    } else {
      render(setupView());
    }
  };
  window.addEventListener("hashchange", show);
  show();
}

async function startApp() {
  render(splashView());
  const { watchAuth, signInWithGoogle, signOut, checkAccess, signInErrorMessage } = await import("./auth.js");
  let deniedEmail = "";

  const showSignIn = (opts) => {
    render(deniedEmail ? deniedView({ email: deniedEmail }) : signInView(opts));
    root.querySelector("#signInBtn").addEventListener("click", async () => {
      deniedEmail = "";
      render(signInView({ busy: true }));
      try {
        const user = await signInWithGoogle();
        if (!user) showSignIn();
      } catch (err) {
        showSignIn({ error: signInErrorMessage(err) });
      }
    });
  };

  watchAuth(async (user) => {
    if (!user) { showSignIn(); return; }
    render(splashView());
    const access = await checkAccess(user);
    if (access === "denied") {
      deniedEmail = user.email || "";
      await signOut(); // triggers watchAuth(null), which shows the denied screen
      return;
    }
    renderShell(user, () => signOut());
  });
}

if (isConfigured) startApp();
else startPreview();
