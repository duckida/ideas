"use client";

// AuthContext — exposes the signed-in Firebase user + their Firestore role,
// and keeps that state in sync with Firebase Auth via onAuthStateChanged.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getAuth, onIdTokenChanged, type User } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";
import { loadUserDoc, signOutUser, type AuthUser } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  /** The raw Firebase user — null while still determining auth state. */
  firebaseUser: User | null;
  /** True until the first auth state is known (avoid flashing protected UI). */
  initializing: boolean;
  role: AuthUser["role"] | null;
  isLeader: boolean;
  isAdmin: boolean;
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
        setAuthUser(await loadUserDoc(user));
      } catch {
        // Role doc unreadable — fall back to a student profile so the UI
        // still shows; firestore.rules gate the real writes.
        setAuthUser({
          uid: user.uid,
          email: user.email ?? null,
          displayName: user.displayName || user.email || "You",
          role: "student",
        });
      } finally {
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, []);

  const role = authUser?.role ?? null;

  const value: AuthContextValue = {
    user: authUser,
    firebaseUser,
    initializing,
    role,
    isLeader: role === "leader" || role === "admin",
    isAdmin: role === "admin",
    signOut: signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}