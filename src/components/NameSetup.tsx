"use client";

// NameSetup — the one-time gate that asks a signed-in user to pick a display
// name when they don't have one yet (e.g. email/password signups, or a
// provider that returned no name). Writes it to the Firebase profile and the
// users/{uid} doc (displayName + displayNameSet), then lets the ProfileGate
// re-render into the regular app.

import { useState, type FormEvent } from "react";
import { setUserDisplayName } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { MAX_DISPLAY_NAME_LENGTH } from "@/lib/defs";
import { strings } from "@/lib/strings";

export function NameSetup() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(strings.auth.nameRequiredError);
      return;
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      setError(strings.auth.nameTooLongError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setUserDisplayName(trimmed);
      // Re-read users/{uid} so displayNameSet flips true and the gate unmounts.
      await refreshUser();
    } catch {
      setError(strings.auth.nameSaveError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-[1.25rem] bg-surface p-8 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-setup-title"
      >
        <h1
          id="name-setup-title"
          className="text-lg font-extrabold text-ink"
        >
          {strings.auth.nameSetupTitle}
        </h1>
        <p className="mt-2 text-sm text-muted">{strings.auth.nameSetupHint}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">{strings.auth.nameLabel}</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={strings.auth.namePlaceholder}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-kakao"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full rounded-full bg-kakao px-4 py-3 font-bold text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            {busy ? strings.common.loading : strings.auth.nameSave}
          </button>
        </form>
      </div>
    </div>
  );
}