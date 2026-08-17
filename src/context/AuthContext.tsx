"use client";

// AuthContext — exposes the signed-in Firebase user + their Firestore role,
// and keeps that state in sync with Firebase Auth via onAuthStateChanged.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getAuth, onIdTokenChanged, type User } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";
import {
  ensureUserDoc,
  loadUserDoc,
  signOutUser,
  type AuthUser,
} from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  /** The raw Firebase user — null while still determining auth state. */
  firebaseUser: User | null;
  /** True until the first auth state is known (avoid flashing protected UI). */
  initializing: boolean;
  role: AuthUser["role"] | null;
  isLeader: boolean;
  isAdmin: boolean;
  /** Re-read the users/{uid} doc (e.g. after the one-time name setup). */
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setAuthUser(null);
        setInitializing(false);
        return;
      }
      try {
        // First visit after a persisted session may never have had
        // ensureUserDoc run (it's called from signInWith* only). Create the
        // doc now so the name gate and role lookups work on refresh.
        await ensureUserDoc(user);
        setAuthUser(await loadUserDoc(user));
      } catch {
        // Role doc unreadable — fall back to a student profile so the UI
        // still shows; firestore.rules gate the real writes.
        setAuthUser({
          uid: user.uid,
          email: user.email ?? null,
          displayName: "",
          displayNameSet: false,
          role: "student",
        });
      } finally {
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, []);

  const refreshUser = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    const current = auth.currentUser;
    if (!current) return;
    try {
      setAuthUser(await loadUserDoc(current));
    } catch {
      // Keep the previous profile on a failed re-read.
    }
  }, []);

  const role = authUser?.role ?? null;

  const value: AuthContextValue = {
    user: authUser,
    firebaseUser,
    initializing,
    role,
    isLeader: role === "leader" || role === "admin",
    isAdmin: role === "admin",
    refreshUser,
    signOut: signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}