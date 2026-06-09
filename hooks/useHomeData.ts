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

// Module-level in-memory cache for the primary restaurant list. Survives React
// re-mounts (e.g. back-nav from a detail page) so the home page can paint
// instantly without re-running the Supabase query and re-showing the skeleton.
// Lost on full page reload — that's intentional, and matches the "feels fresh
// but feels instant" tradeoff.
//
// CRITICAL: keyed by isAdmin. Admin sessions see non-public restaurants that
// the anon query filters out via `.eq("visibility", "public")`. A shared
// cache would leak admin-only rows to an anon user on the next mount.
type RestaurantCacheKey = "anon" | "admin";
type RestaurantCacheEntry = {
  restaurants: Restaurant[];
  timestamp: number;
};
const restaurantCache: Record<RestaurantCacheKey, RestaurantCacheEntry | null> =
  {
    anon: null,
    admin: null,
  };
const RESTAURANT_CACHE_TTL_MS = 60_000;

function getCacheKey(isAdmin: boolean): RestaurantCacheKey {
  return isAdmin ? "admin" : "anon";
}

function invalidateRestaurantCache() {
  restaurantCache.anon = null;
  restaurantCache.admin = null;
}

export type HomeData = {
  restaurants: Restaurant[];
  recommendedItems: Record<number, MenuItem[]>;
  restaurantPhotos: Record<number, RestaurantPhoto[]>;
  visits: Record<number, RestaurantVisit[]>;
  /** Lowercase blob of extra searchable text per restaurant (menu item names,
   * order notes, curator take notes). Lets the client searchbar match against
   * data that doesn't live on the restaurant row itself. */
  searchIndex: Record<number, string>;
  /** Number of non-null curator ratings per restaurant. Used as a tiebreaker
   * in the default sort so a 5.0 from three curators ranks above a 5.0 from
   * one. */
  curatorRatingCountByRestaurant: Record<number, number>;
  loading: boolean;
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
  const [curatorRatingCountByRestaurant, setCuratorRatingCountByRestaurant] =
    useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

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
    // Phase 1: fetch restaurants and render the grid immediately.
    // Cache hit path: skip the network round-trip entirely and paint from
    // the module-level cache. setLoading(false) without ever flipping to
    // true avoids the skeleton flash on back-nav.
    const cacheKey = getCacheKey(isAdmin);
    const cached = restaurantCache[cacheKey];
    const cacheFresh =
      cached !== null && Date.now() - cached.timestamp < RESTAURANT_CACHE_TTL_MS;

    let rows: Restaurant[];
    if (cacheFresh && cached) {
      rows = cached.restaurants;
      setRestaurants(rows);
      setLoading(false);
    } else {
      let query = supabase
        .from("restaurants")
        .select("*")
        .order("cuisine")
        .order("name");
      if (!isAdmin) {
        query = query.eq("visibility", "public");
      }
      const { data } = (await query) as { data: Restaurant[] | null };
      // my_rating is legacy: the grid now derives the curator rating from
      // curator_ratings in Phase 2 below. Null it out so we never flash the
      // stale DB value before Phase 2 fills it in.
      rows = (data ?? []).map((r) => ({ ...r, my_rating: null }));
      setRestaurants(rows);
      setLoading(false);
      restaurantCache[cacheKey] = {
        restaurants: rows,
        timestamp: Date.now(),
      };
    }

    if (rows.length === 0) {
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
        .select("restaurant_id, note, rating")
        .in("restaurant_id", visibleRestaurantIds) as Promise<{
        data: {
          restaurant_id: number;
          note: string | null;
          rating: number | null;
        }[]
          | null;
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
    const ratingsByRestaurant: Record<number, number[]> = {};
    (curatorNotesResult.data ?? []).forEach((c) => {
      if (c.note) (index[c.restaurant_id] ??= []).push(c.note);
      if (c.rating != null) {
        (ratingsByRestaurant[c.restaurant_id] ??= []).push(c.rating);
      }
    });
    const flatIndex: Record<number, string> = {};
    Object.entries(index).forEach(([id, parts]) => {
      flatIndex[Number(id)] = parts.join(" ").toLowerCase();
    });
    setSearchIndex(flatIndex);

    // Derive the grid's curator rating from curator_ratings (simple avg),
    // then re-set restaurants and refresh the cache so back-nav paints with
    // the computed value instead of flashing empty ratings.
    const countByRestaurant: Record<number, number> = {};
    const mergedRows = rows.map((r) => {
      const rs = ratingsByRestaurant[r.id] ?? [];
      countByRestaurant[r.id] = rs.length;
      const avg =
        rs.length > 0
          ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 10) / 10
          : null;
      return { ...r, my_rating: avg };
    });
    rows = mergedRows;
    setRestaurants(mergedRows);
    setCuratorRatingCountByRestaurant(countByRestaurant);
    restaurantCache[cacheKey] = {
      restaurants: mergedRows,
      timestamp: Date.now(),
    };

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
  }, [isAdmin]);

  // reload() is what callers invoke after a mutation or on pull-to-refresh —
  // they explicitly want fresh data, so blow the cache away (both keys, since
  // admin/anon visibility can shift around login state) before re-fetching.
  const reload = useCallback(async () => {
    invalidateRestaurantCache();
    await load();
  }, [load]);

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
    curatorRatingCountByRestaurant,
    loading,
    reload,
  };
}
