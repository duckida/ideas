"use client";

// Role-aware top navigation. Which tabs show depends on the signed-in role:
// students see the default tabs; leaders/admins additionally get Moderation.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getChangesRequestedCount } from "@/lib/api";
import { strings } from "@/lib/strings";

interface Tab {
  href: string;
  label: string;
  roles?: Array<"leader" | "admin">;
}

const TABS: Tab[] = [
  { href: "/ideas", label: strings.nav.ideas },
  { href: "/moderation", label: strings.nav.moderation, roles: ["leader", "admin"] },
  { href: "/me", label: strings.nav.me },
  { href: "/admin", label: strings.nav.admin, roles: ["admin"] },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const [changesCount, setChangesCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getChangesRequestedCount(user.uid)
      .then((count) => {
        if (active) setChangesCount(count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  // Wait for role to be known before choosing tabs (avoid flash).
  if (!role) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/ideas" className="flex items-center gap-2">
          <span className="inline-block h-6 w-6 rounded-full bg-kakao" />
          <span className="text-lg font-extrabold text-ink">{strings.brand.name}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {TABS.filter(
            (tab) => !tab.roles || tab.roles.includes(role as "leader" | "admin"),
          ).map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(tab.href + "/");
            const showDot = tab.href === "/me" && changesCount > 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-kakao-soft text-ink"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                {tab.label}
                {showDot && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-danger" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-semibold text-ink sm:block">
            {user?.displayName}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-background hover:text-foreground"
          >
            {strings.nav.signOut}
          </button>
        </div>
      </div>
    </header>
  );
}