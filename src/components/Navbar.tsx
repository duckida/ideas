"use client";

// Role-aware top navigation. Which tabs show depends on the signed-in role:
// students see the default tabs; leaders/admins additionally get Moderation.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-kakao-soft text-ink"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                {tab.label}
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