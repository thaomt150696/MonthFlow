// Client-side IDs (20 chars, like Firestore auto IDs). Creating the ID before saving
// makes retries safe: saving the same task twice never makes a duplicate.
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function newId() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const b of bytes) id += CHARS[b % CHARS.length];
  return id;
}
