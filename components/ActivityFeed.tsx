"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { formatDisplayName } from "@/lib/utils";

const LAST_SEEN_KEY = "feed_last_seen_at";
const WINDOW_DAYS = 7;
const MAX_EVENTS = 20;

type EventKind =
  | "visit"
  | "order"
  | "rating_new"
  | "rating_changed"
  | "recommend"
  | "must_try"
  | "restaurant_added"
  | "visibility";

type FeedEvent = {
  id: string;
  kind: EventKind;
  at: string;
  restaurantId: number;
  restaurantName: string;
  actorLabel: string | null;
  primary: string;
  meta?: string | null;
};

type ProfileMap = Record<string, string>;
type RestaurantMap = Record<number, string>;
type MenuItemMap = Record<number, { name: string; restaurant_id: number }>;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function iconFor(kind: EventKind): string {
  switch (kind) {
    case "visit":
      return "✓";
    case "order":
      return "🍽";
    case "rating_new":
    case "rating_changed":
      return "★";
    case "recommend":
      return "☆";
    case "must_try":
      return "♥";
    case "restaurant_added":
      return "+";
    case "visibility":
      return "◐";
  }
}

function visibilityPhrase(
  prev: string | null,
  next: string,
  name: string,
): string {
  if (next === "archived") return `archived ${name}`;
  if (prev === "archived") return `restored ${name}`;
  if (next === "private") return `made ${name} private`;
  if (next === "public") return `made ${name} public`;
  return `changed ${name} visibility to ${next}`;
}

export default function ActivityFeed() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{
    top: number;
    right: number;
    width: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    try {
      setLastSeen(localStorage.getItem(LAST_SEEN_KEY));
    } catch {}
  }, [isAdmin]);

  const loadFeed = useCallback(async () => {
    const since = new Date(
      Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [
      visitsRes,
      ordersRes,
      ratingsRes,
      recsRes,
      restaurantEventsRes,
    ] = await Promise.all([
      supabase
        .from("restaurant_visits")
        .select("id, restaurant_id, visited_by, visited_at")
        .gte("visited_at", since)
        .order("visited_at", { ascending: false })
        .limit(MAX_EVENTS),
      supabase
        .from("item_orders")
        .select(
          "id, restaurant_id, menu_item_id, ordered_by, created_at, ordered_at",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(MAX_EVENTS),
      supabase
        .from("curator_ratings")
        .select(
          "id, restaurant_id, user_id, rating, previous_rating, must_try, must_try_since, created_at, updated_at",
        )
        .gte("updated_at", since)
        .order("updated_at", { ascending: false })
        .limit(MAX_EVENTS),
      supabase
        .from("menu_item_recommendations")
        .select("id, menu_item_id, user_id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(MAX_EVENTS),
      supabase
        .from("restaurants")
        .select(
          "id, name, created_at, visibility, previous_visibility, visibility_changed_at, added_by",
        )
        .or(
          `created_at.gte.${since},visibility_changed_at.gte.${since}`,
        )
        .order("created_at", { ascending: false })
        .limit(MAX_EVENTS * 2),
    ]);

    const visits = visitsRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const ratings = ratingsRes.data ?? [];
    const recs = recsRes.data ?? [];
    const restaurantEvents = restaurantEventsRes.data ?? [];

    const restaurantIds = new Set<number>();
    visits.forEach((v: any) => restaurantIds.add(v.restaurant_id));
    orders.forEach((o: any) => restaurantIds.add(o.restaurant_id));
    ratings.forEach((r: any) => restaurantIds.add(r.restaurant_id));
    restaurantEvents.forEach((r: any) => restaurantIds.add(r.id));

    const menuItemIds = new Set<number>();
    orders.forEach((o: any) => menuItemIds.add(o.menu_item_id));
    recs.forEach((r: any) => menuItemIds.add(r.menu_item_id));

    const userIds = new Set<string>();
    orders.forEach((o: any) => o.ordered_by && userIds.add(o.ordered_by));
    ratings.forEach((r: any) => r.user_id && userIds.add(r.user_id));
    recs.forEach((r: any) => r.user_id && userIds.add(r.user_id));

    const restaurantMap: RestaurantMap = {};
    restaurantEvents.forEach((r: any) => {
      restaurantMap[r.id] = r.name;
    });
    const missingRestaurantIds = [...restaurantIds].filter(
      (id) => !(id in restaurantMap),
    );

    const [restRes, miRes, profRes] = await Promise.all([
      missingRestaurantIds.length > 0
        ? supabase
            .from("restaurants")
            .select("id, name")
            .in("id", missingRestaurantIds)
        : Promise.resolve({ data: [] as any[] }),
      menuItemIds.size > 0
        ? supabase
            .from("menu_items")
            .select("id, name, restaurant_id")
            .in("id", [...menuItemIds])
        : Promise.resolve({ data: [] as any[] }),
      userIds.size > 0
        ? supabase
            .from("user_profiles")
            .select("user_id, display_name")
            .in("user_id", [...userIds])
        : Promise.resolve({ data: [] as any[] }),
    ]);

    (restRes.data ?? []).forEach((r: any) => {
      restaurantMap[r.id] = r.name;
    });
    const menuItemMap: MenuItemMap = {};
    (miRes.data ?? []).forEach((m: any) => {
      menuItemMap[m.id] = { name: m.name, restaurant_id: m.restaurant_id };
    });
    const profileMap: ProfileMap = {};
    (profRes.data ?? []).forEach((p: any) => {
      if (p.display_name) profileMap[p.user_id] = p.display_name;
    });

    const list: FeedEvent[] = [];

    visits.forEach((v: any) => {
      const restaurantName = restaurantMap[v.restaurant_id] ?? "a restaurant";
      list.push({
        id: `visit-${v.id}`,
        kind: "visit",
        at: v.visited_at,
        restaurantId: v.restaurant_id,
        restaurantName,
        actorLabel: v.visited_by ?? null,
        primary: `checked in at ${restaurantName}`,
      });
    });

    orders.forEach((o: any) => {
      const restaurantName = restaurantMap[o.restaurant_id] ?? "a restaurant";
      const item = menuItemMap[o.menu_item_id]?.name ?? "an item";
      list.push({
        id: `order-${o.id}`,
        kind: "order",
        at: o.created_at,
        restaurantId: o.restaurant_id,
        restaurantName,
        actorLabel: profileMap[o.ordered_by] ?? null,
        primary: `logged ${item} at ${restaurantName}`,
      });
    });

    ratings.forEach((r: any) => {
      const restaurantName = restaurantMap[r.restaurant_id] ?? "a restaurant";
      if (r.rating !== null) {
        const isUpdate =
          r.previous_rating !== null &&
          r.previous_rating !== undefined &&
          r.previous_rating !== r.rating;
        const kind: EventKind = isUpdate ? "rating_changed" : "rating_new";
        const primary = isUpdate
          ? `changed rating of ${restaurantName} from ${r.previous_rating} to ${r.rating}`
          : `rated ${restaurantName} ${r.rating}/5`;
        list.push({
          id: `rating-${r.id}-${r.updated_at}`,
          kind,
          at: r.updated_at,
          restaurantId: r.restaurant_id,
          restaurantName,
          actorLabel: profileMap[r.user_id] ?? null,
          primary,
        });
      }
      if (r.must_try && r.must_try_since && r.must_try_since >= since) {
        list.push({
          id: `musttry-${r.id}-${r.must_try_since}`,
          kind: "must_try",
          at: r.must_try_since,
          restaurantId: r.restaurant_id,
          restaurantName,
          actorLabel: profileMap[r.user_id] ?? null,
          primary: `marked ${restaurantName} must-try`,
        });
      }
    });

    recs.forEach((r: any) => {
      const mi = menuItemMap[r.menu_item_id];
      if (!mi) return;
      const restaurantName = restaurantMap[mi.restaurant_id] ?? "a restaurant";
      list.push({
        id: `rec-${r.id}`,
        kind: "recommend",
        at: r.created_at,
        restaurantId: mi.restaurant_id,
        restaurantName,
        actorLabel: profileMap[r.user_id] ?? null,
        primary: `recommended ${mi.name} at ${restaurantName}`,
      });
    });

    restaurantEvents.forEach((r: any) => {
      if (r.created_at >= since) {
        list.push({
          id: `added-${r.id}`,
          kind: "restaurant_added",
          at: r.created_at,
          restaurantId: r.id,
          restaurantName: r.name,
          actorLabel: r.added_by ?? null,
          primary: `added ${r.name}`,
        });
      }
      if (r.visibility_changed_at && r.visibility_changed_at >= since) {
        list.push({
          id: `vis-${r.id}-${r.visibility_changed_at}`,
          kind: "visibility",
          at: r.visibility_changed_at,
          restaurantId: r.id,
          restaurantName: r.name,
          actorLabel: r.added_by ?? null,
          primary: visibilityPhrase(
            r.previous_visibility,
            r.visibility,
            r.name,
          ),
        });
      }
    });

    list.sort((a, b) => (a.at < b.at ? 1 : -1));
    const filtered = list.filter((e) => e.restaurantId in restaurantMap);
    setEvents(filtered.slice(0, MAX_EVENTS));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadFeed();
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_visits" },
        () => loadFeed(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "item_orders" },
        () => loadFeed(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curator_ratings" },
        () => loadFeed(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_item_recommendations" },
        () => loadFeed(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "restaurants" },
        () => loadFeed(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurants" },
        () => loadFeed(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loadFeed]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        buttonRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function updateAnchor() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 8;
      const maxWidth = Math.max(240, rect.right - margin);
      setAnchor({
        top: rect.bottom + margin,
        right: window.innerWidth - rect.right,
        width: Math.min(440, maxWidth),
      });
    }
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [open]);

  const unreadCount = useMemo(() => {
    if (!lastSeen) return events.length;
    return events.filter((e) => e.at > lastSeen).length;
  }, [events, lastSeen]);

  function handleOpen() {
    setOpen((v) => {
      const next = !v;
      if (next && events.length > 0) {
        const newest = events[0].at;
        try {
          localStorage.setItem(LAST_SEEN_KEY, newest);
          setLastSeen(newest);
        } catch {}
      }
      return next;
    });
  }

  if (!isAdmin) return null;

  const popover =
    open && anchor ? (
      <>
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[999] bg-black/20 backdrop-blur-[1px]"
        />
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Activity feed"
          style={{
            top: anchor.top,
            right: anchor.right,
            width: anchor.width,
          }}
          className="fixed max-h-[min(70vh,640px)] bg-bg border-[1.5px] border-txt z-[1000] flex flex-col shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35),0_8px_16px_-8px_rgba(0,0,0,0.25)]"
        >
          <div className="h-1 bg-accent shrink-0" aria-hidden />
          <div className="px-4 py-2.5 border-b border-brd flex items-center justify-between shrink-0">
            <span className="font-display text-sm tracking-wide uppercase text-txt">
              Activity
            </span>
            <span className="text-2xs text-txt2 opacity-60 uppercase tracking-wide">
              last {WINDOW_DAYS}d
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {!loaded ? (
              <div className="p-6 text-sm text-txt2 text-center">Loading…</div>
            ) : events.length === 0 ? (
              <div className="p-6 text-sm text-txt2 text-center">
                No activity yet.
              </div>
            ) : (
              events.map((e) => (
                <Link
                  key={e.id}
                  href={`/restaurant/${e.restaurantId}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 border-b border-brd/40 last:border-b-0 hover:bg-brd/20 no-underline transition-colors"
                >
                  <span
                    className="w-7 h-7 flex items-center justify-center shrink-0 rounded-full bg-brd/30 text-txt text-sm leading-none"
                    aria-hidden
                  >
                    {iconFor(e.kind)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-txt leading-snug">
                      {e.actorLabel && (
                        <span className="font-medium">{formatDisplayName(e.actorLabel)} </span>
                      )}
                      {e.primary}
                    </p>
                    <p className="text-2xs text-txt2 mt-0.5 uppercase tracking-wide">
                      {relativeTime(e.at)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </>
    ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        aria-label="Activity feed"
        className="relative w-9 h-9 flex items-center justify-center rounded-full border border-brd bg-bg text-txt2 hover:text-txt transition-colors duration-150"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-2xs font-medium flex items-center justify-center origin-center ${
              open ? "" : "motion-safe:animate-badge-pulse"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {mounted && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
