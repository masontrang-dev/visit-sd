"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type WishlistState = {
  /** Set of restaurant IDs the signed-in user has wishlisted. */
  ids: Set<number>;
  loading: boolean;
  /** Add or remove a restaurant from the wishlist. Returns the new state. */
  toggle: (restaurantId: number) => Promise<boolean>;
  reload: () => Promise<void>;
};

export function useWishlist(user: User | null): WishlistState {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_wishlist")
      .select("restaurant_id")
      .eq("user_id", user.id);
    const next = new Set<number>();
    (data ?? []).forEach((row: { restaurant_id: number }) => {
      next.add(row.restaurant_id);
    });
    setIds(next);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggle = useCallback(
    async (restaurantId: number): Promise<boolean> => {
      if (!user) return false;
      const currentlyIn = ids.has(restaurantId);
      // Optimistic update
      setIds((prev) => {
        const next = new Set(prev);
        if (currentlyIn) next.delete(restaurantId);
        else next.add(restaurantId);
        return next;
      });
      if (currentlyIn) {
        const { error } = await supabase
          .from("user_wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("restaurant_id", restaurantId);
        if (error) {
          // Roll back on failure
          setIds((prev) => new Set(prev).add(restaurantId));
          return true;
        }
        return false;
      } else {
        const { error } = await supabase
          .from("user_wishlist")
          .insert({ user_id: user.id, restaurant_id: restaurantId });
        if (error) {
          setIds((prev) => {
            const next = new Set(prev);
            next.delete(restaurantId);
            return next;
          });
          return false;
        }
        return true;
      }
    },
    [ids, user],
  );

  return { ids, loading, toggle, reload };
}
