"use client";

// Settings page — theme selector (Appearance) and the About section.

import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsContent } from "@/components/SettingsContent";
import { strings } from "@/lib/strings";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-extrabold text-ink">
          {strings.settings.heading}
        </h1>
        <div className="mt-6">
          <SettingsContent />
        </div>
      </main>
    </ProtectedRoute>
  );
}
