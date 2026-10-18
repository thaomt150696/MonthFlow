// Entry point: decides which screen to show and wires up events.
import { isConfigured } from "./firebase-config.js";
import { splashView, setupView, signInView, deniedView } from "./ui/screens.js";

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

  watchAuth(async (user) => {
    if (!user) { showSignIn(); return; }
    render(splashView());
    const access = await checkAccess(user);
    if (access === "denied") {
      deniedEmail = user.email || "";
      await signOut(); // triggers watchAuth(null), which shows the denied screen
      return;
    }
    // Phase 4 replaces this in-memory store with the Firestore store.
    const [{ mountApp }, { createMemoryStore }, { defaultProjects }] = await Promise.all([
      import("./app.js"), import("./store/memory-store.js"), import("./sample-data.js")
    ]);
    mountApp(root, { store: createMemoryStore({ seed: () => ({ projects: defaultProjects(), tasks: [] }) }), user, onSignOut: () => signOut() });
  });
}

if (isConfigured) startApp();
else startPreview();
