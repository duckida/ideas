"use client";

// Admin page — admins add and remove leaders by email. Promotion flips the
// users/{uid}.role field to "leader"; demotion returns it to "student".
// firestore.rules restrict this page to admins.

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGate } from "@/components/ProtectedRoute";
import { getUserByEmail, getLeaders, setUserRole } from "@/lib/api";
import { strings } from "@/lib/strings";
import type { UserDoc } from "@/lib/types";

export default function AdminPage() {
  const [leaders, setLeaders] = useState<UserDoc[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    getLeaders()
      .then((list) => {
        if (active) setLeaders(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tick]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const user = await getUserByEmail(email.trim());
      if (!user) {
        setNotice({ kind: "error", text: strings.admin.userNotFound });
        return;
      }
      if (user.role === "leader" || user.role === "admin") {
        setNotice({ kind: "error", text: strings.admin.alreadyLeader });
        return;
      }
      await setUserRole(user.uid, "leader");
      setEmail("");
      setNotice({ kind: "ok", text: strings.admin.added });
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

  return (
    <RoleGate roles={["admin"]}>
      <ProtectedRoute>
        <Navbar />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
          <h1 className="text-2xl font-extrabold text-ink">{strings.admin.heading}</h1>

          <form onSubmit={handleAdd} className="mt-6 flex gap-2">
            <label className="flex-1">
              <span className="sr-only">{strings.admin.emailLabel}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={strings.admin.emailPlaceholder}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-kakao"
              />
            </label>
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

          <h2 className="mt-8 text-lg font-extrabold text-ink">{strings.admin.addLeader}</h2>
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
        </main>
      </ProtectedRoute>
    </RoleGate>
  );
}