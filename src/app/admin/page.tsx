"use client";

// Admin page — admins add and remove leaders by email.
// Supports two flows:
//   1. User already signed up → promote them immediately via setUserRole
//   2. User hasn't signed up yet → add to invitedLeaders collection;
//      they'll be auto-promoted when they create an account.

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGate } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
  getUserByEmail,
  getLeaders,
  setUserRole,
  addInvitedLeader,
  getInvitedLeaders,
  removeInvitedLeader,
} from "@/lib/api";
import { strings } from "@/lib/strings";
import type { InvitedLeader, UserDoc } from "@/lib/types";

export default function AdminPage() {
  const auth = useAuth();
  const user = auth.user;
  const [leaders, setLeaders] = useState<UserDoc[]>([]);
  const [invited, setInvited] = useState<InvitedLeader[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    Promise.all([getLeaders(), getInvitedLeaders()])
      .then(([leaderList, invitedList]) => {
        if (active) {
          setLeaders(leaderList);
          setInvited(invitedList);
        }
      })
      .catch((err) => console.error("Admin: failed to load leaders", err));
    return () => {
      active = false;
    };
  }, [tick]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy || !user) return;
    setBusy(true);
    setNotice(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check if already a leader
      const existingLeader = leaders.find((l) => l.email === normalizedEmail);
      if (existingLeader) {
        setNotice({ kind: "error", text: strings.admin.alreadyLeader });
        return;
      }

      // Check if already invited
      const alreadyInvited = invited.find((i) => i.email === normalizedEmail);
      if (alreadyInvited) {
        setNotice({ kind: "error", text: strings.admin.alreadyLeader });
        return;
      }

      // Try to find the user — if they exist, promote directly
      const existingUser = await getUserByEmail(normalizedEmail);
      if (existingUser) {
        if (existingUser.role === "leader" || existingUser.role === "admin") {
          setNotice({ kind: "error", text: strings.admin.alreadyLeader });
          return;
        }
        await setUserRole(existingUser.uid, "leader");
        setEmail("");
        setDisplayName("");
        setTitle("");
        setNotice({ kind: "ok", text: strings.admin.added });
      } else {
        // User hasn't signed up yet — add an invitation
        await addInvitedLeader(
          normalizedEmail,
          auth.user?.uid ?? "unknown",
          displayName.trim() || undefined,
          title.trim() || undefined,
        );
        setEmail("");
        setDisplayName("");
        setTitle("");
        setNotice({ kind: "ok", text: strings.admin.invited });
      }
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(uid: string) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await setUserRole(uid, "student");
      setNotice({ kind: "ok", text: strings.admin.removed });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveInvite(emailAddr: string) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await removeInvitedLeader(emailAddr);
      setNotice({ kind: "ok", text: strings.admin.removed });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleGate roles={["admin"]}>
      <ProtectedRoute>
        <Navbar />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8">
          <h1 className="text-2xl font-extrabold text-ink">{strings.admin.heading}</h1>

          <form onSubmit={handleAdd} className="mt-6 space-y-3">
            <label className="block">
              <span className="sr-only">{strings.admin.emailLabel}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={strings.admin.emailPlaceholder}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-kakao"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex-1">
                <span className="sr-only">{strings.admin.nameLabel}</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={strings.admin.namePlaceholder}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-kakao"
                />
              </label>
              <label className="flex-1">
                <span className="sr-only">{strings.admin.titleLabel}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={strings.admin.titlePlaceholder}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-kakao"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="shrink-0 rounded-full bg-kakao px-5 py-2.5 font-bold text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              {strings.admin.add}
            </button>
          </form>

          {notice && (
            <p
              role="status"
              className={`mt-4 text-sm font-semibold ${
                notice.kind === "ok" ? "text-success" : "text-danger"
              }`}
            >
              {notice.text}
            </p>
          )}

          {/* Active leaders */}
          <h2 className="mt-8 text-lg font-extrabold text-ink">{strings.admin.activeLabel}</h2>
          {leaders.length === 0 ? (
            <p className="mt-3 text-muted">{strings.admin.noLeaders}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {leaders.map((leader) => (
                <li
                  key={leader.uid}
                  className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3"
                >
                  <div>
                    <p className="font-bold text-ink">{leader.displayName || leader.email}</p>
                    <p className="text-xs text-muted">{leader.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(leader.uid)}
                    disabled={busy}
                    className="shrink-0 rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger transition hover:bg-danger hover:text-white disabled:opacity-50"
                  >
                    {strings.admin.removeLeader}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Invited leaders (not yet signed up) */}
          <h2 className="mt-8 text-lg font-extrabold text-ink">{strings.admin.invitedLabel}</h2>
          {invited.length === 0 ? (
            <p className="mt-3 text-muted">{strings.admin.noInvited}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {invited.map((inv) => (
                <li
                  key={inv.email}
                  className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3"
                >
                  <div>
                    <p className="font-bold text-ink">{inv.displayName || inv.email}</p>
                    <p className="text-xs text-muted">{inv.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveInvite(inv.email)}
                    disabled={busy}
                    className="shrink-0 rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger transition hover:bg-danger hover:text-white disabled:opacity-50"
                  >
                    {strings.admin.removeInvite}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>
      </ProtectedRoute>
    </RoleGate>
  );
}
