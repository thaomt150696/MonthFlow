// Sign-in, sign-out and the access check against Firestore Security Rules.
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDocFromServer, setDoc, serverTimestamp, terminate, clearIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, googleProvider } from "./firebase.js";

export function watchAuth(callback) {
  getRedirectResult(auth).catch(() => {});
  return onAuthStateChanged(auth, callback);
}

// Returns the user, or null when the person closed the popup.
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    if (err.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return null;
    throw err;
  }
}

// clearCache: also delete this device's offline copy of the data (Firestore can't be used
// afterwards, so the caller reloads the page).
export async function signOut({ clearCache = false } = {}) {
  await fbSignOut(auth);
  if (!clearCache) return;
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch { /* another tab still holds the cache; it is cleared on its next sign-out */ }
}

const SERVER_CHECK_MS = 12000;

// "ok" | "denied" | "offline" | "unreachable". Rules only allow the owner's account to read users/{uid}.
// Asks the server (not the local cache), so a missing database or blocked connection is noticed
// at sign-in instead of showing "Syncing…" forever.
export async function checkAccess(user) {
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await Promise.race([
      getDocFromServer(ref),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), SERVER_CHECK_MS))
    ]);
    const profile = { email: user.email, name: user.displayName || "", lastSeenAt: serverTimestamp() };
    if (!snap.exists()) profile.createdAt = serverTimestamp();
    // Fire and forget: offline writes resolve only after the server acknowledges them.
    setDoc(ref, profile, { merge: true }).catch(() => {});
    return "ok";
  } catch (err) {
    const setupProblem = /has not been used|is disabled|does not exist/i.test(err.message || "");
    if (err.code === "permission-denied" && !setupProblem) return "denied";
    return navigator.onLine ? "unreachable" : "offline";
  }
}

export function signInErrorMessage(err) {
  switch (err && err.code) {
    case "auth/network-request-failed": return "No internet connection. Check your network and try again.";
    case "auth/unauthorized-domain": return "This address isn’t allowed to sign in yet. Add it under Authentication › Settings › Authorized domains in Firebase.";
    case "auth/operation-not-allowed": return "Google sign-in is turned off for this Firebase project. Turn it on under Authentication › Sign-in method.";
    case "auth/configuration-not-found": return "Authentication isn’t set up in Firebase yet. Open Authentication, click Get started, then enable Google.";
    case "auth/popup-blocked": return "The sign-in window was blocked. Allow pop-ups for this site and try again.";
    default: return "Couldn’t sign in. Try again in a moment.";
  }
}
