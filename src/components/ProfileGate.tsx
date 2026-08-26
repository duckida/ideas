"use client";

// ProfileGate — wraps the whole app. While a signed-in user hasn't set a
// display name yet (users/{uid}.displayNameSet === false), it shows the
// one-time NameSetup screen instead of the app content. Once the name is
// saved, displayNameSet flips true in Firestore, AuthContext re-reads it, and
// this component renders its children again.

import { useAuth } from "@/context/AuthContext";
import { NameSetup } from "@/components/NameSetup";
import { strings } from "@/lib/strings";

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();

  // Don't flicker while auth is still resolving.
  if (initializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        {strings.common.loadingDots}
      </div>
    );
  }

  if (user && !user.displayNameSet) {
    return <NameSetup />;
  }

  return <>{children}</>;
}