"use client";

// ConfirmDialog — the app's themed replacement for window.confirm(). Renders
// a small centered dialog with a title, optional detail, and confirm/cancel
// actions. The confirm button is styled `danger` for destructive actions.

import { strings } from "@/lib/strings";

interface ConfirmDialogProps {
  title: string;
  detail?: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  detail,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[1.25rem] bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-extrabold text-ink">
          {title}
        </h2>
        {detail && <p className="mt-2 text-sm text-muted">{detail}</p>}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-full border border-line px-4 py-2.5 font-bold text-muted hover:bg-background disabled:opacity-50"
          >
            {strings.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-full bg-danger px-4 py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}