"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  supabase,
  type Restaurant,
  type MenuItem,
  type RestaurantVisit,
} from "@/lib/supabase";
import type { RestaurantPhoto } from "@/components/RestaurantGrid";

export type HomeData = {
  restaurants: Restaurant[];
  recommendedItems: Record<number, MenuItem[]>;
  restaurantPhotos: Record<number, RestaurantPhoto[]>;
  visits: Record<number, RestaurantVisit[]>;
  /** Lowercase blob of extra searchable text per restaurant (menu item names,
   * order notes, curator take notes). Lets the client searchbar match against
   * data that doesn't live on the restaurant row itself. */
  searchIndex: Record<number, string>;
  loading: boolean;
  /** True once the secondary data (recommendations, photos, search index) has
   * finished loading. Used by the home page to defer mounting the virtualized
   * grid until card content is stable — without this, cards grow as data
   * streams in and the windowed list visibly reflows. */
  secondaryLoaded: boolean;
  reload: () => Promise<void>;
};

export function useHomeData(isAdmin: boolean, user: User | null): HomeData {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<
    Record<number, MenuItem[]>
  >({});
  const [restaurantPhotos, setRestaurantPhotos] = useState<
    Record<number, RestaurantPhoto[]>
  >({});
  const [visits, setVisits] = useState<Record<number, RestaurantVisit[]>>({});
  const [searchIndex, setSearchIndex] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);

  const loadVisits = useCallback(async () => {
    const { data } = await supabase
      .from("restaurant_visits")
      .select("*")
      .order("visited_at", { ascending: false });
    if (!data) return;
    const grouped: Record<number, RestaurantVisit[]> = {};
    data.forEach((visit: RestaurantVisit) => {
      if (!grouped[visit.restaurant_id]) grouped[visit.restaurant_id] = [];
      grouped[visit.restaurant_id].push(visit);
    });
    setVisits(grouped);
  }, []);

  const load = useCallback(async () => {
    setSecondaryLoaded(false);
    // Phase 1: fetch restaurants and render the grid immediately.
    let query = supabase
      .from("restaurants")
      .select("*")
      .order("cuisine")
      .order("name");
    if (!isAdmin) {
      query = query.eq("visibility", "public");
    }
    const { data } = (await query) as { data: Restaurant[] | null };
    const rows = data ?? [];
    setRestaurants(rows);
    setLoading(false);

    if (rows.length === 0) {
      setSecondaryLoaded(true);
      return;
    }
    const visibleRestaurantIds = rows.map((r) => r.id);

    // Phase 2: recommendations, order photos, and the per-restaurant search
    // blob (menu names + order notes + curator notes) in parallel.
    const [
      recResult,
      orderResult,
      allMenuResult,
      orderNotesResult,
      curatorNotesResult,
    ] = await Promise.all([
      supabase
        .from("menu_item_recommendations")
        .select("menu_item_id") as Promise<{
        data: { menu_item_id: number }[] | null;
      }>,
      supabase
        .from("item_orders")
        .select("restaurant_id, menu_item_id, photo_url, ordered_at")
        .in("restaurant_id", visibleRestaurantIds)
        .not("photo_url", "is", null)
        .order("ordered_at", { ascending: false })
        .limit(500) as Promise<{
        data:
          | {
              restaurant_id: number;
              menu_item_id: number;
              photo_url: string;
              ordered_at: string;
            }[]
          | null;
      }>,
      supabase
        .from("menu_items")
        .select("restaurant_id, name, category")
        .in("restaurant_id", visibleRestaurantIds) as Promise<{
        data:
          | { restaurant_id: number; name: string; category: string | null }[]
          | null;
      }>,
      supabase
        .from("item_orders")
        .select("restaurant_id, notes")
        .in("restaurant_id", visibleRestaurantIds)
        .not("notes", "is", null) as Promise<{
        data: { restaurant_id: number; notes: string }[] | null;
      }>,
      supabase
        .from("curator_ratings")
        .select("restaurant_id, note")
        .in("restaurant_id", visibleRestaurantIds)
        .not("note", "is", null) as Promise<{
        data: { restaurant_id: number; note: string }[] | null;
      }>,
    ]);

    const index: Record<number, string[]> = {};
    (allMenuResult.data ?? []).forEach((m) => {
      (index[m.restaurant_id] ??= []).push(m.name);
      if (m.category) (index[m.restaurant_id] ??= []).push(m.category);
    });
    (orderNotesResult.data ?? []).forEach((o) => {
      (index[o.restaurant_id] ??= []).push(o.notes);
    });
    (curatorNotesResult.data ?? []).forEach((c) => {
      (index[c.restaurant_id] ??= []).push(c.note);
    });
    const flatIndex: Record<number, string> = {};
    Object.entries(index).forEach(([id, parts]) => {
      flatIndex[Number(id)] = parts.join(" ").toLowerCase();
    });
    setSearchIndex(flatIndex);

    const recRows = recResult.data ?? [];
    const orderRows = orderResult.data ?? [];

    const recommendedIds = Array.from(
      new Set(recRows.map((r) => r.menu_item_id)),
    );
    const recommendedSet = new Set(recommendedIds);
    const orderMenuIds = Array.from(
      new Set(orderRows.map((o) => o.menu_item_id)),
    );

    // Phase 3: menu item details + order item names in parallel.
    const [menuResult, nameResult] = await Promise.all([
      recommendedIds.length > 0
        ? (supabase
            .from("menu_items")
            .select("*")
            .in("id", recommendedIds)
            .in("restaurant_id", visibleRestaurantIds)
            .order("name") as Promise<{ data: MenuItem[] | null }>)
        : Promise.resolve({ data: [] as MenuItem[] }),
      orderMenuIds.length > 0
        ? (supabase
            .from("menu_items")
            .select("id, name")
            .in("id", orderMenuIds) as Promise<{
            data: { id: number; name: string }[] | null;
          }>)
        : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    ]);

    const menuData = menuResult.data ?? [];
    if (menuData.length > 0) {
      const itemsByRestaurant: Record<number, MenuItem[]> = {};
      menuData.forEach((item) => {
        if (!itemsByRestaurant[item.restaurant_id])
          itemsByRestaurant[item.restaurant_id] = [];
        itemsByRestaurant[item.restaurant_id].push(item);
      });
      setRecommendedItems(itemsByRestaurant);
    }

    if (orderRows.length > 0) {
      const nameById = new Map<number, string>();
      (nameResult.data ?? []).forEach((m) => nameById.set(m.id, m.name));

      const buckets: Record<number, RestaurantPhoto[]> = {};
      const seen: Record<number, Set<string>> = {};
      orderRows.forEach((o) => {
        if (!buckets[o.restaurant_id]) {
          buckets[o.restaurant_id] = [];
          seen[o.restaurant_id] = new Set();
        }
        if (seen[o.restaurant_id].has(o.photo_url)) return;
        seen[o.restaurant_id].add(o.photo_url);
        buckets[o.restaurant_id].push({
          url: o.photo_url,
          itemName: nameById.get(o.menu_item_id) ?? null,
          isStorefront: false,
          isRecommended: recommendedSet.has(o.menu_item_id),
        });
      });

      Object.keys(buckets).forEach((key) => {
        const id = Number(key);
        buckets[id].sort(
          (a, b) => Number(b.isRecommended) - Number(a.isRecommended),
        );
      });
      setRestaurantPhotos(buckets);
    }

    setSecondaryLoaded(true);
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user) {
      loadVisits();
    } else {
      setVisits({});
    }
  }, [user, loadVisits]);

  return {
    restaurants,
    recommendedItems,
    restaurantPhotos,
    visits,
    searchIndex,
    loading,
    secondaryLoaded,
    reload: load,
  };
}
