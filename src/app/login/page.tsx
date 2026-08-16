"use client";

// Login page — school Microsoft account (popup) or email/password fallback.
// All copy comes from strings.ts.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithMicrosoft, signInWithEmail } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { strings, t } from "@/lib/strings";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"microsoft" | "email" | null>(null);

  if (user) {
    // Already signed in — bounce to the home page.
    router.replace("/ideas");
    return null;
  }

  async function handleMicrosoft() {
    setBusy("microsoft");
    setError(null);
    try {
      await signInWithMicrosoft();
      router.replace("/ideas");
    } catch {
      setError(strings.auth.genericError);
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError(strings.auth.emailError);
      return;
    }
    setBusy("email");
    setError(null);
    try {
      await signInWithEmail(email, password);
      router.replace("/ideas");
    } catch {
      setError(strings.auth.genericError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[1.25rem] border border-line bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-ink">
          {t(strings.auth.title, { brand: strings.brand.name })}
        </h1>
        <p className="mt-2 text-muted">{strings.auth.subtitle}</p>

        <button
          type="button"
          onClick={handleMicrosoft}
          disabled={busy !== null}
          className="mt-8 w-full rounded-full bg-ink px-4 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy === "microsoft"
            ? strings.common.loading
            : strings.auth.microsoftButton}
        </button>

        <div className="my-6 flex items-center gap-3 text-muted">
          <span className="h-px flex-1 bg-line" />
          <span className="text-sm">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">{strings.auth.emailLabel}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-kakao"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">
              {strings.auth.passwordLabel}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-kakao"
            />
          </label>

          {error && (
            <p className="text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy !== null}
            className="w-full rounded-full bg-kakao px-4 py-3 font-bold text-ink transition hover:brightness-95 disabled:opacity-50"
          >
            {busy === "email" ? strings.common.loading : strings.auth.emailButton}
          </button>
        </form>
      </div>
    </main>
  );
}