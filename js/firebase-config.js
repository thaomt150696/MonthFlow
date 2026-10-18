// Firebase web app settings. These values are public identifiers, not secrets:
// access to data is enforced by Firestore Security Rules (see firestore.rules).
// Replace the placeholders with the config from Firebase console > Project settings > Your apps.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).includes("YOUR_"));
