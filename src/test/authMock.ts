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
  refreshUser: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
};

export function setAuthUser(
  user:
    | (Omit<AuthUser, "displayNameSet"> & { displayNameSet?: boolean })
    | null,
) {
  const normalized = user
    ? { ...user, displayNameSet: user.displayNameSet ?? Boolean(user.displayName) }
    : null;
  authControl.user = normalized;
  authControl.role = normalized?.role ?? null;
  authControl.isLeader = normalized?.role === "leader" || normalized?.role === "admin";
  authControl.isAdmin = normalized?.role === "admin";
  authControl.firebaseUser = normalized ? { uid: normalized.uid } : null;
}

/** Snapshot of the current auth state to hand to useAuth(). */
export function useAuthState() {
  return { ...authControl };
}