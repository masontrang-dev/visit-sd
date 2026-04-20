"use client";

import { useEffect, useRef, useState } from "react";
import type { CuratorRating } from "@/lib/supabase";
import { formatDisplayName } from "@/lib/utils";
import { tap } from "@/lib/haptics";

export type CuratorProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Props = {
  ratings: CuratorRating[];
  profiles: Record<string, CuratorProfile>;
  userId?: string;
  isAdmin: boolean;
  onSave: (args: {
    rating: number | null;
    note: string | null;
    must_try: boolean;
  }) => Promise<void>;
};

function getNoteLabels(rating: number | null): {
  label: string;
  placeholder: string;
} {
  switch (rating) {
    case 5:
      return {
        label: "Why you love it",
        placeholder: "What makes this place special?",
      };
    case 4:
      return {
        label: "Why you like it",
        placeholder: "What keeps you coming back?",
      };
    case 3:
      return {
        label: "Your take",
        placeholder: "Mixed bag — what worked, what didn't?",
      };
    case 2:
      return {
        label: "What fell short",
        placeholder: "What would you change?",
      };
    case 1:
      return {
        label: "Why you'd skip it",
        placeholder: "What went wrong?",
      };
    default:
      return {
        label: "Your notes",
        placeholder: "First impressions, things to remember…",
      };
  }
}

export default function CuratorRatingPanel({
  ratings,
  profiles,
  userId,
  isAdmin,
  onSave,
}: Props) {
  const myRating = userId ? ratings.find((r) => r.user_id === userId) : null;
  const myValue = myRating?.rating ?? null;
  const savedNote = myRating?.note ?? "";
  const myMustTry = myRating?.must_try ?? false;
  const [noteDraft, setNoteDraft] = useState(savedNote);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNoteDraft(savedNote);
  }, [savedNote]);

  const noteDirty = noteDraft.trim() !== savedNote.trim();

  // Auto-grow the textarea so the curator can see everything they've typed
  // without a tiny internal scroll bar on mobile.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [noteDraft]);

  async function commit(next: {
    rating: number | null;
    note: string | null;
    must_try: boolean;
  }) {
    if (saving) return;
    tap();
    setSaving(true);
    await onSave(next);
    setSaving(false);
  }

  async function setRating(next: number | null) {
    await commit({
      rating: next,
      note: savedNote || null,
      must_try: myMustTry,
    });
  }

  async function saveNote() {
    const cleaned = noteDraft.trim();
    await commit({
      rating: myValue,
      note: cleaned.length > 0 ? cleaned : null,
      must_try: myMustTry,
    });
  }

  async function toggleMustTry() {
    await commit({
      rating: myValue,
      note: savedNote || null,
      must_try: !myMustTry,
    });
  }

  return (
    <div className="px-6 py-4 border-b border-brd bg-bg2 scroll-fade-in">
      {ratings.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-2xs uppercase tracking-wide text-txt2 mb-2">
            All curators
          </div>
          {ratings.map((r) => {
            const p = profiles[r.user_id];
            const name = formatDisplayName(p?.display_name) || "Curator";
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-txt2 truncate">{name}</span>
                <span className="text-accent font-medium shrink-0">
                  {r.rating !== null ? (
                    <>
                      {"★".repeat(r.rating)}
                      <span className="text-brd">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </>
                  ) : (
                    <span className="text-txt2 opacity-60">no rating</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && userId && (
        <div
          className={`${ratings.length > 0 ? "mt-4 pt-4 border-t border-brd" : ""}`}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="text-2xs uppercase tracking-wide text-txt2 mb-2">
                Your rating
              </div>
              <div className="flex gap-1 items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(myValue === star ? null : star)}
                    disabled={saving}
                    className={`text-xl bg-transparent border-none cursor-pointer p-1 transition-colors duration-[0.12s] ${
                      myValue !== null && star <= myValue
                        ? "text-accent"
                        : "text-brd"
                    }`}
                  >
                    ★
                  </button>
                ))}
                {myValue !== null && (
                  <button
                    onClick={() => setRating(null)}
                    disabled={saving}
                    className="text-2xs text-txt2 ml-2 bg-transparent border-none cursor-pointer hover:text-accent"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-2xs uppercase tracking-wide text-txt2 mb-2">
                Must-try
              </div>
              <button
                type="button"
                onClick={toggleMustTry}
                disabled={saving}
                className={`chip ${
                  myMustTry ? "!bg-accent !text-white !border-accent" : ""
                }`}
              >
                {myMustTry ? "★ Must-try" : "☆ Mark"}
              </button>
            </div>
          </div>

          <div className="text-2xs uppercase tracking-wide text-txt2 mb-2">
            {getNoteLabels(myValue).label}
          </div>
          <textarea
            ref={textareaRef}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={getNoteLabels(myValue).placeholder}
            rows={3}
            className="input-base resize-none leading-relaxed w-full overflow-hidden"
          />
          {noteDirty && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveNote}
                disabled={saving}
                className="btn-primary text-sm px-3 py-1.5"
              >
                Save note
              </button>
              <button
                onClick={() => setNoteDraft(savedNote)}
                disabled={saving}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
