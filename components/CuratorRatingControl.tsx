"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, type CuratorRating } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { formatDisplayName } from "@/lib/utils";

type CuratorProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Props = {
  restaurantId: number;
  onChange?: () => void;
};

export default function CuratorRatingControl({
  restaurantId,
  onChange,
}: Props) {
  const { user, isAdmin } = useAuth();
  const [ratings, setRatings] = useState<CuratorRating[]>([]);
  const [profiles, setProfiles] = useState<Record<string, CuratorProfile>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    const { data: ratingsData } = await supabase
      .from("curator_ratings")
      .select("*")
      .eq("restaurant_id", restaurantId);

    const rows = (ratingsData ?? []) as CuratorRating[];
    setRatings(rows);

    if (rows.length > 0) {
      const ids = rows.map((r) => r.user_id);
      const { data: profilesData } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      const map: Record<string, CuratorProfile> = {};
      (profilesData ?? []).forEach((p: CuratorProfile) => {
        map[p.user_id] = p;
      });
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoaded(true);
  }, [restaurantId]);

  useEffect(() => {
    load();
  }, [load]);

  const myRating = user ? ratings.find((r) => r.user_id === user.id) : null;
  const myValue = myRating?.rating ?? null;

  const avg =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 2,
        ) / 2
      : null;

  async function setRating(next: number | null) {
    if (!user || saving) return;
    setSaving(true);

    if (next === null) {
      await supabase
        .from("curator_ratings")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("curator_ratings").upsert(
        {
          restaurant_id: restaurantId,
          user_id: user.id,
          rating: next,
          previous_rating: myValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id,user_id" },
      );
    }

    await load();
    setSaving(false);
    onChange?.();
  }

  if (!loaded) {
    return (
      <div className="flex-1 text-center py-3 px-3">
        <div className="font-display text-[clamp(32px,6vw,40px)] leading-none text-accent mb-1">
          —
        </div>
        <div className="text-2xs uppercase tracking-wide text-txt2 mb-0.5">
          Curators&rsquo; rating
        </div>
      </div>
    );
  }

  const hasDetails = ratings.length > 0 || (isAdmin && !!user);

  return (
    <div className="flex-1 py-3 px-3">
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((e) => !e)}
        disabled={!hasDetails}
        className={`w-full text-center bg-transparent border-none p-0 ${
          hasDetails ? "cursor-pointer" : "cursor-default"
        }`}
        aria-expanded={expanded}
      >
        <div className="font-display text-[clamp(32px,6vw,40px)] leading-none text-accent mb-1">
          {avg !== null ? `${avg}/5` : "—"}
        </div>
        <div className="text-2xs uppercase tracking-wide text-txt2 mb-0.5">
          Curators&rsquo; rating
        </div>
        <div className="text-2xs text-txt2 opacity-60 flex items-center justify-center gap-1">
          <span>
            {ratings.length} curator{ratings.length !== 1 ? "s" : ""}
          </span>
          {hasDetails && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </button>

      {expanded && ratings.length > 0 && (
        <div className="mt-3 space-y-1">
          {ratings.map((r) => {
            const p = profiles[r.user_id];
            const name = formatDisplayName(p?.display_name) || "Curator";
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 text-2xs"
              >
                <span className="text-txt2 truncate">{name}</span>
                <span className="text-accent font-medium shrink-0">
                  {"★".repeat(r.rating)}
                  <span className="text-brd">{"★".repeat(5 - r.rating)}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {expanded && isAdmin && user && (
        <div className="mt-3 pt-3 border-t border-brd">
          <div className="text-2xs uppercase tracking-wide text-txt2 mb-1 text-center">
            Your rating
          </div>
          <div className="flex gap-1 justify-center items-center">
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
      )}
    </div>
  );
}
