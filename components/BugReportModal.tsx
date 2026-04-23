"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth-context";
import Modal, { ModalHeader } from "./Modal";

type Kind = "bug" | "suggestion";

export default function BugReportModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [kind, setKind] = useState<Kind>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
      kind,
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

  const isBug = kind === "bug";
  const subheading = isBug
    ? "Something broken or confusing? Let us know."
    : "Got an idea to make this better? Tell us.";
  const descriptionLabel = isBug ? "What happened?" : "What’s your idea?";
  const descriptionPlaceholder = isBug
    ? "Steps to reproduce, what you expected, what happened instead."
    : "Describe the suggestion and why it would help.";
  const successCopy = isBug
    ? "Thanks — your report has been filed. We’ll take a look."
    : "Thanks — your suggestion has been filed. We’ll take a look.";

  return (
    <Modal open onClose={onClose} size="md" ariaLabel="Report or suggestion">
      <ModalHeader
        title="REPORT / SUGGEST"
        subtitle={subheading}
        onClose={onClose}
      />
      <div className="p-6 pt-4">
        {submitted ? (
          <>
            <p className="text-accent2 text-sm mb-4">{successCopy}</p>
            <button
              onClick={onClose}
              className="btn-secondary w-full text-sm"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <span className="block text-xs uppercase tracking-wide text-txt2 mb-1">
              Type
            </span>
            <div
              role="radiogroup"
              aria-label="Type"
              className="flex gap-2 mb-4"
            >
              {(["bug", "suggestion"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide border-[1.5px] transition-colors ${
                    kind === k
                      ? "border-txt bg-txt text-bg"
                      : "border-brd text-txt2 hover:border-txt"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

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
              {descriptionLabel}
            </label>
            <textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder={descriptionPlaceholder}
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
    </Modal>
  );
}
