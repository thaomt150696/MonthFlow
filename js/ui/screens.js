// Full-screen states shown before the app shell: splash, setup, sign-in, access denied.
import { icons, markSVG, googleG } from "./icons.js";
import { esc } from "../lib/html.js";

export function splashView() {
  return `<div class="screen-center"><div class="splash" role="status">${markSVG}<span>Loading MonthFlow…</span></div></div>`;
}

export function setupView() {
  return `<div class="screen-center"><div class="auth-card">
    ${markSVG}
    <h1>Setup needed</h1>
    <p>MonthFlow isn’t connected to Firebase yet.</p>
    <ol class="setup-steps">
      <li>Create a Firebase project and a web app.</li>
      <li>Paste its config into <code>js/firebase-config.js</code>.</li>
      <li>Turn on Google sign-in and Cloud Firestore, then publish <code>firestore.rules</code>.</li>
    </ol>
    <small>Preview the screens without Firebase:</small>
    <div class="preview-links">
      <a class="btn secondary sm" href="#preview-signin">Sign-in</a>
      <a class="btn secondary sm" href="#preview-denied">Access denied</a>
      <a class="btn secondary sm" href="#preview-app">App shell</a>
    </div>
  </div></div>`;
}

export function signInView({ busy = false, error = "" } = {}) {
  return `<div class="screen-center"><div class="auth-card">
    ${markSVG}
    <h1>MonthFlow</h1>
    <p>Plan your month. Finish your week.<br>Your tasks stay in sync on every device.</p>
    ${error ? `<div class="alert" role="alert">${icons.alert}<div>${esc(error)}</div></div>` : ""}
    <button class="gbtn" id="signInBtn" ${busy ? "disabled" : ""}>${googleG}${busy ? "Signing in…" : "Continue with Google"}</button>
    <small>Only your tasks are stored. Nothing is posted to your Google account.</small>
  </div></div>`;
}

export function connectionErrorView() {
  return `<div class="screen-center"><div class="auth-card">
    ${markSVG}
    <h1>MonthFlow</h1>
    <div class="alert" role="alert">${icons.alert}<div><b>Can’t reach your data.</b>Your internet works, but MonthFlow couldn’t connect to its database. Changes made now would stay on this device only.</div></div>
    <button class="btn primary lg" id="retryBtn">Try again</button>
    <button class="btn ghost sm" id="offlineBtn">Continue on this device</button>
    <small>If this keeps happening, check that Cloud Firestore is created in the Firebase project.</small>
  </div></div>`;
}

export function deniedView({ email = "" } = {}) {
  return `<div class="screen-center"><div class="auth-card">
    ${markSVG}
    <h1>MonthFlow</h1>
    <div class="alert" role="alert">${icons.alert}<div><b>This Google account can’t open this workspace.</b>${email ? `Signed in as ${esc(email)}. ` : ""}Sign in with the account that owns this MonthFlow.</div></div>
    <button class="gbtn" id="signInBtn">${googleG}Use another account</button>
  </div></div>`;
}
