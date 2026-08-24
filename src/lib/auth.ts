// Auth service — Microsoft OAuth (school account) + email/password fallback.
// On first sign-in we create a users/{uid} doc (role: student); on later
// sign-ins we read that doc so the role set by an admin survives.

import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  OAuthProvider,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";
import { DEFAULT_ROLE, type Role } from "@/lib/types";
import { LAST_IDEA_AT_FIELD, MAX_DISPLAY_NAME_LENGTH } from "@/lib/defs";
import { getInvitedLeaderByEmail } from "@/lib/api";

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
  /** See UserDoc.displayNameSet — true once a display name was set. */
  displayNameSet: boolean;
  role: Role;
  /** Optional leader title (e.g. "Digital Leader", "Head Girl"). */
  title?: string;
}

/** True when a string looks like an email address. Used to detect legacy user
 * docs where the old ensureUserDoc stored the email as `displayName` because
 * the provider had no real name — those accounts still need a name. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Loads the role doc for the current Firebase user (defaults to student). */
export async function loadUserDoc(user: User): Promise<AuthUser> {
  const db = getFirestore(getFirebaseApp());
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as {
      displayName?: string;
      displayNameSet?: boolean;
      role?: Role;
      title?: string;
    };
    const storedName = data.displayName || "";
    const providerName = user.displayName || "";
    // The doc flag is authoritative. Legacy docs (created before the flag)
    // count as "set" only when they hold a real name — an email placeholder
    // means the user still needs to choose one.
    const displayNameSet =
      data.displayNameSet ?? (storedName.length > 0 && !looksLikeEmail(storedName));
    return {
      uid: user.uid,
      email: user.email ?? null,
      displayName: displayNameSet ? storedName || providerName || "" : "",
      displayNameSet,
      role: data.role ?? DEFAULT_ROLE,
      title: data.title,
    };
  }
  // No doc yet — treat as a brand-new student account. displayNameSet only
  // becomes true once the user doc records it, so the signup gate offers a
  // name prompt.
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName || "",
    displayNameSet: Boolean(user.displayName && !looksLikeEmail(user.displayName)),
    role: DEFAULT_ROLE,
  };
}

/**
 * Creates users/{uid} on first sign-in so the rules' role lookup works.
 * Runs in a transaction: if two sign-ins race, the loser re-reads and skips,
 * so a role an admin promoted mid-race can never be clobbered back to
 * `student` (issue #5 — getDoc-then-setDoc TOCTOU).
 */
async function ensureUserDoc(user: User): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const ref = doc(db, "users", user.uid);

  // Check if this email was pre-invited as a leader.
  let invitedRole: Role = DEFAULT_ROLE;
  if (user.email) {
    try {
      const invited = await getInvitedLeaderByEmail(user.email);
      if (invited) {
        invitedRole = "leader";
      }
    } catch {
      // If the invitedLeaders read fails (e.g. offline), just default to student.
    }
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, {
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName || "",
        // True when the provider handed us a real name (e.g. Microsoft),
        // false for email/password signups so the one-time name gate shows.
        displayNameSet: Boolean(user.displayName && !looksLikeEmail(user.displayName)),
        role: invitedRole,
        [LAST_IDEA_AT_FIELD]: null,
      });
      // If invited, clean up the pending invitation.
      if (invitedRole === "leader" && user.email) {
        const invitedRef = doc(db, "invitedLeaders", user.email.toLowerCase());
        tx.delete(invitedRef);
      }
    }
  });
}

/** Persist the display name chosen at the one-time signup gate. */
export async function setUserDisplayName(
  displayName: string,
  firestore = getFirestore(getFirebaseApp()),
): Promise<void> {
  const name = displayName.trim();
  if (!name) throw new Error("display_name_required");
  if (name.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error("display_name_too_long");
  }
  const auth = getAuth(getFirebaseApp());
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("not_signed_in");
  await updateProfile(auth.currentUser, { displayName: name });
  await updateDoc(doc(firestore, "users", uid), {
    displayName: name,
    displayNameSet: true,
  });
}

/** Alias exported for explicit callers (e.g. tests). */
export { ensureUserDoc };