// Shared auth-control for component tests. Test files register the mock:
//
//   vi.mock("@/context/AuthContext", async () => {
//     const auth = await vi.importActual<typeof import("@/test/authMock")>(
//       "@/test/authMock",
//     );
//     return { useAuth: () => auth.useAuthState() };
//   });
//
// Then call setAuthUser(...) per test before rendering.

import { vi } from "vitest";
import type { AuthUser } from "@/lib/auth";

export const authControl = {
  user: null as AuthUser | null,
  firebaseUser: null as { uid: string } | null,
  initializing: false,
  role: null as AuthUser["role"] | null,
  isLeader: false,
  isAdmin: false,
  signOut: vi.fn(async () => {}),
};

export function setAuthUser(user: AuthUser | null) {
  authControl.user = user;
  authControl.role = user?.role ?? null;
  authControl.isLeader = user?.role === "leader" || user?.role === "admin";
  authControl.isAdmin = user?.role === "admin";
  authControl.firebaseUser = user ? { uid: user.uid } : null;
}

/** Snapshot of the current auth state to hand to useAuth(). */
export function useAuthState() {
  return { ...authControl };
}