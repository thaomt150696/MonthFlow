// Entry point: decides which screen to show and wires up events.
import { isConfigured } from "./firebase-config.js";
import { splashView, setupView, signInView, deniedView, connectionErrorView } from "./ui/screens.js";

const root = document.getElementById("app");

function render(html) {
  root.innerHTML = html;
}

// Without Firebase config: setup screen plus local previews of each screen.
function startPreview() {
  let prototypeStarted = false;
  const show = () => {
    const h = location.hash;
    if (h === "#preview-app") {
      if (prototypeStarted) { location.reload(); return; }
      prototypeStarted = true;
      import("./prototype.js").then((m) => m.startPrototype(root, { onSignOut: () => { location.hash = "#preview-signin"; } }));
      return;
    }
    if (prototypeStarted) { location.reload(); return; }
    if (h === "#preview-signin") {
      render(signInView());
      root.querySelector("#signInBtn").addEventListener("click", () => render(signInView({ error: "Firebase isn’t configured yet, so sign-in is only a preview." })));
    } else if (h === "#preview-denied") {
      render(deniedView({ email: "other.person@gmail.com" }));
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

  let appMounted = false;
  watchAuth(async (user) => {
    if (!user) {
      if (appMounted) { location.reload(); return; } // signed out elsewhere or session ended
      showSignIn();
      return;
    }
    if (appMounted) return;
    await verifyAndOpen(user);
  });

  async function verifyAndOpen(user) {
    render(splashView());
    const access = await checkAccess(user);
    if (access === "denied") {
      deniedEmail = user.email || "";
      await signOut(); // triggers watchAuth(null), which shows the denied screen
      return;
    }
    if (access === "unreachable") {
      render(connectionErrorView());
      root.querySelector("#retryBtn").addEventListener("click", () => verifyAndOpen(user));
      root.querySelector("#offlineBtn").addEventListener("click", () => openApp(user));
      return;
    }
    await openApp(user); // "ok", or "offline": work from this device's copy and sync later
  }

  async function openApp(user) {
    render(splashView());
    const [{ mountApp }, { createFirestoreStore }] = await Promise.all([import("./app.js"), import("./store/firestore-store.js")]);
    const store = createFirestoreStore(user.uid);
    store.ensureDefaults();
    await store.ready;
    appMounted = true;
    mountApp(root, {
      store,
      user,
      onSignOut: async () => {
        appMounted = false;
        store.close();
        render(splashView());
        await signOut({ clearCache: true });
        location.reload();
      }
    });
  }
}

if (isConfigured) startApp();
else startPreview();
