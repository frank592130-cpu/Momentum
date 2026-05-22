import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
}

export function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    name: user.displayName ?? user.email?.split("@")[0] ?? "Momentum",
    email: user.email ?? "",
    photoURL: user.photoURL ?? undefined,
  };
}

export function listenToAuthState(callback: (user: User | null) => void, onError: (error: Error) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback, onError);
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return credential.user;
}

export async function registerWithEmail(email: string, password: string, name: string) {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  const displayName = name.trim() || email.trim().split("@")[0];
  await updateProfile(credential.user, { displayName });
  return credential.user;
}

export async function signInWithGoogleIdToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(getFirebaseAuth(), credential);
  return result.user;
}

export async function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(getFirebaseAuth(), provider);
  return result.user;
}

export async function logout() {
  await signOut(getFirebaseAuth());
}

export function getAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("invalid-email")) return "Email format is invalid.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Email or password is incorrect.";
  }
  if (code.includes("email-already-in-use")) return "This email is already registered.";
  if (code.includes("weak-password")) return "Password must be at least 6 characters.";
  if (code.includes("popup") || code.includes("cancelled") || code.includes("canceled")) return "Google sign-in was cancelled.";
  if (code.includes("unauthorized-domain")) return "Add this domain to Firebase Auth authorized domains.";
  return error instanceof Error ? error.message : "Authentication failed.";
}
