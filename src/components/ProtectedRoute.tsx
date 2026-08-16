"use client";

// Routing gates: ProtectedRoute requires a signed-in user (redirects to
// /login), RoleGate restricts children to leader/admin roles.

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { strings } from "@/lib/strings";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !user) router.replace("/login");
  }, [initializing, user, router]);

  if (initializing || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        {strings.common.loading}
      </div>
    );
  }
  return <>{children}</>;
}

/** Gate a page to leader (incl. admin) or admin-only access. */
export function RoleGate({
  roles,
  children,
}: {
  roles: Array<"leader" | "admin">;
  children: ReactNode;
}) {
  const { role, initializing } = useAuth();
  const router = useRouter();

  const allowed = role !== null && roles.includes(role as "leader" | "admin");

  useEffect(() => {
    if (!initializing && !allowed) router.replace("/ideas");
  }, [initializing, allowed, router]);

  if (initializing || !allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        {strings.common.loading}
      </div>
    );
  }
  return <>{children}</>;
}