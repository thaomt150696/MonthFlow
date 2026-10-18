// Firebase web app settings. These values are public identifiers, not secrets:
// access to data is enforced by Firestore Security Rules (see firestore.rules).
// From Firebase console > Project settings > Your apps.
export const firebaseConfig = {
  apiKey: "AIzaSyA5Of-fDnrpAh2ihSgNgMoIXmeFmnpQ0ZI",
  authDomain: "monthflow-b7c56.firebaseapp.com",
  projectId: "monthflow-b7c56",
  storageBucket: "monthflow-b7c56.firebasestorage.app",
  messagingSenderId: "307912833643",
  appId: "1:307912833643:web:7cd59eacb8bf1952658f2e"
};

export const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).includes("YOUR_"));
