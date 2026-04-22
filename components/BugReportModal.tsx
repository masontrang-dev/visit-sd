"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth-context";

export default function BugReportModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function submit() {
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { error: insertErr } = await supabase.from("bug_reports").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      url: typeof window !== "undefined" ? window.location.href : null,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg border-2 border-txt rounded-md max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-3xl leading-none">REPORT A BUG</h2>
            <p className="text-txt2 text-sm mt-1">
              Something broken or confusing? Let us know.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-txt2 hover:text-txt text-xl leading-none"
          >
            ×
          </button>
        </div>

        {submitted ? (
          <>
            <p className="text-accent2 text-sm mb-4">
              Thanks — your report has been filed. We’ll take a look.
            </p>
            <button
              onClick={onClose}
              className="btn-secondary w-full text-sm"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <label
              htmlFor="bug-title"
              className="block text-xs uppercase tracking-wide text-txt2 mb-1"
            >
              Title
            </label>
            <input
              id="bug-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary"
              className="input-base mb-4"
            />

            <label
              htmlFor="bug-description"
              className="block text-xs uppercase tracking-wide text-txt2 mb-1"
            >
              What happened?
            </label>
            <textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Steps to reproduce, what you expected, what happened instead."
              className="input-base resize-none mb-3"
            />

            <p className="text-txt2 text-xs mb-4">
              We’ll also capture the current URL and your browser so we can
              reproduce the issue.
            </p>

            {error && <p className="text-error text-sm mb-3">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting || !title.trim() || !description.trim()}
              className="btn-secondary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
