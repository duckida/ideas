"use client";

// Role-aware top navigation. Which tabs show depends on the signed-in role:
// students see the default tabs; leaders/admins additionally get Moderation.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@hackclub/icons";
import { useAuth } from "@/context/AuthContext";
import { SettingsModal } from "@/components/SettingsModal";
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getChangesRequestedCount(user.uid)
      .then((count) => {
        if (active) setChangesCount(count);
      })
      .catch((err) =>
        console.error("Navbar: failed to load changes-requested count", err),
      );
    return () => {
      active = false;
    };
  }, [user]);

  // Wait for role to be known before choosing tabs (avoid flash).
  if (!role) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
        <Link href="/ideas" className="flex shrink-0 items-center gap-2">
          <span className="inline-block h-6 w-6 rounded-full bg-kakao" />
          <span className="hidden text-lg font-extrabold text-ink sm:inline">{strings.brand.name}</span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
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
                className={`relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden text-sm font-semibold text-ink md:block">
            {user?.displayName}
          </span>

          {/* Settings — icon in a pill, opens the settings modal */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={strings.nav.settings}
            aria-haspopup="dialog"
            title={strings.nav.settings}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:bg-background hover:text-foreground"
          >
            <Icon glyph="settings" size={18} />
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            aria-label={strings.nav.signOut}
            title={strings.nav.signOut}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:bg-background hover:text-foreground"
          >
            <Icon glyph="door-leave" size={18} />
          </button>
        </div>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </header>
  );
}