"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { tap } from "@/lib/haptics";

type Props = {
  menuItemId: number;
  recommendedUserIds: string[];
  recommenderNames: Record<string, string>;
  onLocalToggle?: (nowRecommended: boolean) => void;
};

export default function MenuItemRecommendToggle({
  menuItemId,
  recommendedUserIds,
  recommenderNames,
  onLocalToggle,
}: Props) {
  const { user, canManageContent } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!canManageContent || !user) return null;

  const iRecommend = recommendedUserIds.includes(user.id);
  const othersRecommend = recommendedUserIds.filter((id) => id !== user.id);

  async function toggle() {
    if (!user || busy) return;
    tap();
    const wasRecommending = iRecommend;
    // Optimistic flip — parent updates `recommendations`, button label
    // re-renders to the new state immediately.
    onLocalToggle?.(!wasRecommending);
    setBusy(true);
    const op = wasRecommending
      ? supabase
          .from("menu_item_recommendations")
          .delete()
          .eq("menu_item_id", menuItemId)
          .eq("user_id", user.id)
      : supabase
          .from("menu_item_recommendations")
          .insert({ menu_item_id: menuItemId, user_id: user.id });
    const { error } = await op;
    if (error) onLocalToggle?.(wasRecommending);
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={toggle}
        disabled={busy}
        className={`text-2xs font-medium px-2 py-0.5 rounded-pill tracking-tight uppercase shrink-0 border-[1.5px] transition-all duration-150 ${
          iRecommend
            ? "bg-accent text-white border-accent"
            : "bg-transparent text-txt2 border-brd hover:border-accent hover:text-accent"
        }`}
      >
        {iRecommend ? "★ Recommended" : "☆ Recommend"}
      </button>
      {othersRecommend.length > 0 && (
        <span className="text-2xs text-txt2">
          Also:{" "}
          {othersRecommend
            .map((id) => recommenderNames[id] || "curator")
            .join(", ")}
        </span>
      )}
    </div>
  );
}
