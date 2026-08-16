// Auth service — Microsoft OAuth (school account) + email/password fallback.
// On first sign-in we create a users/{uid} doc (role: student); on later
// sign-ins we read that doc so the role set by an admin survives.

import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  OAuthProvider,
  type User,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";
import { DEFAULT_ROLE, type Role } from "@/lib/types";

/** OAuth provider for Microsoft / Office 365 school accounts. */
export function microsoftProvider(): OAuthProvider {
  return new OAuthProvider("microsoft.com");
}

export async function signInWithMicrosoft(): Promise<User> {
  const auth = getAuth(getFirebaseApp());
  const result = await signInWithPopup(auth, microsoftProvider());
  await ensureUserDoc(result.user);
  return result.user;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const auth = getAuth(getFirebaseApp());
  const result = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(result.user);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  const auth = getAuth(getFirebaseApp());
  await signOut(auth);
}

/** Role + display name of a signed-in user; null when not signed in. */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string;
  role: Role;
}

/** Loads the role doc for the current Firebase user (defaults to student). */
export async function loadUserDoc(user: User): Promise<AuthUser> {
  const db = getFirestore(getFirebaseApp());
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as { displayName?: string; role?: Role };
    return {
      uid: user.uid,
      email: user.email ?? null,
      displayName: data.displayName || user.displayName || user.email || "You",
      role: data.role ?? DEFAULT_ROLE,
    };
  }
  // No doc yet — treat as a brand-new student account.
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName || user.email || "You",
    role: DEFAULT_ROLE,
  };
}

/** Creates users/{uid} on first sign-in so the rules' role lookup works. */
async function ensureUserDoc(user: User): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName || user.email || "",
      role: DEFAULT_ROLE,
    });
  }
}