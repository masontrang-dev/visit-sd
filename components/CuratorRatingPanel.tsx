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
  /** True when the viewer can edit their own rating/note (admins, superusers,
   *  curators). */
  canEdit: boolean;
  onSave: (args: {
    rating: number | null;
    note: string | null;
    must_try: boolean;
  }) => Promise<void>;
  /** Called after Save (post-commit) or Cancel to close the editor. */
  onClose?: () => void;
  /** When true, drop the panel's outer container styling so it can be
   *  embedded inside a parent card (e.g. the curator-take editor). */
  bare?: boolean;
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
  canEdit,
  onSave,
  onClose,
  bare = false,
}: Props) {
  const myRating = userId ? ratings.find((r) => r.user_id === userId) : null;
  const myValue = myRating?.rating ?? null;
  const savedNote = myRating?.note ?? "";
  const myMustTry = myRating?.must_try ?? false;

  const [ratingDraft, setRatingDraft] = useState<number | null>(myValue);
  const [mustTryDraft, setMustTryDraft] = useState<boolean>(myMustTry);
  const [noteDraft, setNoteDraft] = useState(savedNote);
  const [saving, setSaving] = useState(false);

  // Resync drafts when the persisted values change (e.g. after a save reload,
  // or if another tab updated the row).
  useEffect(() => {
    setRatingDraft(myValue);
  }, [myValue]);
  useEffect(() => {
    setMustTryDraft(myMustTry);
  }, [myMustTry]);
  useEffect(() => {
    setNoteDraft(savedNote);
  }, [savedNote]);

  const dirty =
    ratingDraft !== myValue ||
    mustTryDraft !== myMustTry ||
    noteDraft.trim() !== savedNote.trim();

  // Auto-grow the textarea so the curator can see everything they've typed
  // without a tiny internal scroll bar on mobile.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [noteDraft]);

  async function handleSave() {
    if (saving) return;
    tap();
    if (dirty) {
      setSaving(true);
      const cleaned = noteDraft.trim();
      await onSave({
        rating: ratingDraft,
        note: cleaned.length > 0 ? cleaned : null,
        must_try: mustTryDraft,
      });
      setSaving(false);
    }
    onClose?.();
  }

  function handleCancel() {
    if (saving) return;
    setRatingDraft(myValue);
    setMustTryDraft(myMustTry);
    setNoteDraft(savedNote);
    onClose?.();
  }

  const showAllCurators = !bare && ratings.length > 0;

  return (
    <div
      className={
        bare
          ? ""
          : "px-6 py-4 border-b border-brd bg-bg2 scroll-fade-in"
      }
    >
      {showAllCurators && (
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

      {canEdit && userId && (
        <div
          className={`${showAllCurators ? "mt-4 pt-4 border-t border-brd" : ""}`}
        >
          <div className="flex items-end justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="text-2xs uppercase tracking-wide text-txt2 mb-2">
                Your rating
              </div>
              <div className="flex gap-1 items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      tap();
                      setRatingDraft(ratingDraft === star ? null : star);
                    }}
                    disabled={saving}
                    className={`text-xl bg-transparent border-none cursor-pointer p-1 transition-colors duration-[0.12s] ${
                      ratingDraft !== null && star <= ratingDraft
                        ? "text-accent"
                        : "text-brd"
                    }`}
                  >
                    ★
                  </button>
                ))}
                {ratingDraft !== null && (
                  <button
                    onClick={() => {
                      tap();
                      setRatingDraft(null);
                    }}
                    disabled={saving}
                    className="text-2xs text-txt2 ml-2 bg-transparent border-none cursor-pointer hover:text-accent"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                tap();
                setMustTryDraft(!mustTryDraft);
              }}
              disabled={saving}
              className={`chip shrink-0 ${
                mustTryDraft ? "!bg-accent !text-white !border-accent" : ""
              }`}
            >
              {mustTryDraft ? "★ Must-try" : "☆ Must-try"}
            </button>
          </div>

          <div className="text-2xs uppercase tracking-wide text-txt2 mb-2">
            {getNoteLabels(ratingDraft).label}
          </div>
          <textarea
            ref={textareaRef}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={getNoteLabels(ratingDraft).placeholder}
            rows={3}
            className="input-base resize-none leading-relaxed w-full overflow-hidden"
          />
          <div className="flex gap-2 mt-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="btn-secondary text-sm px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm px-3 py-1.5"
            >
              {dirty ? "Save" : "Done"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
