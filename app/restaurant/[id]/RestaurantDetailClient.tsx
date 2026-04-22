"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  type Restaurant,
  type RestaurantVisit,
  type MenuItem,
  type ItemOrder,
  type DrinkDetails,
  type MenuItemRecommendation,
  type CuratorRating,
} from "@/lib/supabase";
import IllustrationNoVisits from "@/components/IllustrationNoVisits";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import AddModal from "@/components/AddModal";
import OrderModal from "@/components/OrderModal";
import ConfirmModal from "@/components/ConfirmModal";
import CheckInModal from "@/components/CheckInModal";
import CuratorRatingControl from "@/components/CuratorRatingControl";
import CuratorRatingPanel, {
  type CuratorProfile,
} from "@/components/CuratorRatingPanel";
import MenuItemRecommendToggle from "@/components/MenuItemRecommendToggle";
import PhotoCarousel, {
  type RestaurantPhoto,
} from "@/components/PhotoCarousel";
import PhotoLightbox, {
  type LightboxPhoto,
} from "@/components/PhotoLightbox";
import Link from "next/link";
import { isCurrentlyOpen } from "@/lib/google-types";
import { trackEvent } from "@/lib/analytics";
import { formatDisplayName } from "@/lib/utils";
import { success } from "@/lib/haptics";
import SwipeableRow from "@/components/SwipeableRow";
import { CUISINE_COLORS } from "@/lib/cuisine-colors";
import { formatFoodTag } from "@/lib/food-tags";
import { RestaurantDetailProvider } from "./RestaurantDetailContext";
import StickyHeader from "./StickyHeader";
import RestaurantActionBar from "./RestaurantActionBar";
import VisitHistorySection from "./VisitHistorySection";
import { formatDate, formatTime } from "./formatters";

function Chevron({
  open,
  className = "",
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${open ? "rotate-90" : ""} ${className}`}
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  params: Promise<{ id: string }>;
};

export default function RestaurantDetailClient({ params }: Props) {
  const router = useRouter();
  const {
    isAdmin,
    isSuperuser,
    canManageContent,
    displayName,
    user,
    isLoading: authLoading,
  } = useAuth();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [visits, setVisits] = useState<RestaurantVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitingId, setVisitingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showVisitHistory, setShowVisitHistory] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [existingFoodTags, setExistingFoodTags] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [itemOrders, setItemOrders] = useState<ItemOrder[]>([]);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [editingOrder, setEditingOrder] = useState<ItemOrder | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null,
  );
  const [deletingVisitId, setDeletingVisitId] = useState<number | null>(null);
  const [showDeleteVisitConfirm, setShowDeleteVisitConfirm] = useState<
    number | null
  >(null);
  const [showDeleteRestaurantConfirm, setShowDeleteRestaurantConfirm] =
    useState(false);
  const [superuserNames, setSuperuserNames] = useState<string[]>([]);
  const [adminNames, setAdminNames] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<
    MenuItemRecommendation[]
  >([]);
  const [recommenderNames, setRecommenderNames] = useState<
    Record<string, string>
  >({});
  const [ordererNames, setOrdererNames] = useState<Record<string, string>>({});
  const [historyView, setHistoryView] = useState<"by-dish" | "timeline">(
    "by-dish",
  );
  const [expandedDishId, setExpandedDishId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{
    photos: LightboxPhoto[];
    index: number;
    header?: string;
  } | null>(null);
  const [curatorRatings, setCuratorRatings] = useState<CuratorRating[]>([]);
  const [curatorProfiles, setCuratorProfiles] = useState<
    Record<string, CuratorProfile>
  >({});
  const [curatorRatingsLoaded, setCuratorRatingsLoaded] = useState(false);
  const [editingMyTake, setEditingMyTake] = useState(false);

  // Average of the 1-5 ratings (ignoring note-only rows). Drives both the
  // "Curators' rating" header and the public notes-section heading.
  const curatorAvg = useMemo(() => {
    const rated = curatorRatings.filter((r) => r.rating !== null);
    if (rated.length === 0) return null;
    const sum = rated.reduce((s, r) => s + (r.rating ?? 0), 0);
    return sum / rated.length;
  }, [curatorRatings]);
  const [isScrolled, setIsScrolled] = useState(false);
  const hasScrolled = useRef(false);
  const stickySentinelRef = useRef<HTMLDivElement>(null);

  const cuisineColor = useMemo(() => {
    if (!restaurant?.cuisine || cuisines.length === 0) return CUISINE_COLORS[0];
    const idx = cuisines.indexOf(restaurant.cuisine);
    return idx >= 0
      ? CUISINE_COLORS[idx % CUISINE_COLORS.length]
      : CUISINE_COLORS[0];
  }, [restaurant?.cuisine, cuisines]);

  // Check if user has checked in within last 24 hours
  const hasRecentCheckIn = visits.some((visit) => {
    if (visit.visited_by !== displayName) return false;
    const visitTime = new Date(visit.visited_at).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return now - visitTime < twentyFourHours;
  });

  // Check if current user can check in (not within 24 hours for regular users)
  const canCheckIn = isAdmin ? true : !hasRecentCheckIn;

  function handleBackClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    // Use browser history to go back
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback if no history
      router.push("/");
    }
  }

  useEffect(() => {
    const el = stickySentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        hasScrolled.current = true;
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [restaurant?.id]);

  // Redirect non-admin visitors away from private / archived restaurants
  useEffect(() => {
    if (authLoading || !restaurant) return;
    const vis = restaurant.visibility ?? "public";
    if (vis !== "public" && !isAdmin) {
      router.replace("/");
    }
  }, [authLoading, isAdmin, restaurant, router]);

  useEffect(() => {
    async function fetchData() {
      const resolvedParams = await params;
      const id = parseInt(resolvedParams.id, 10);
      if (isNaN(id)) {
        setError("Invalid restaurant ID");
        setLoading(false);
        return;
      }

      // Fetch superuser and admin names if admin (to determine delete permissions)
      if (isAdmin && !isSuperuser) {
        const { data: roles } = (await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["superuser", "admin"])) as {
          data: { user_id: string; role: string }[] | null;
        };

        if (roles) {
          const superuserIds = roles
            .filter((r) => r.role === "superuser")
            .map((r) => r.user_id);
          const adminIds = roles
            .filter((r) => r.role === "admin")
            .map((r) => r.user_id);

          const { data: profiles } = (await supabase
            .from("user_profiles")
            .select("user_id, display_name")
            .in("user_id", [...superuserIds, ...adminIds])) as {
            data: { user_id: string; display_name: string | null }[] | null;
          };

          if (profiles) {
            const superuserProfiles = profiles.filter((p) =>
              superuserIds.includes(p.user_id),
            );
            const adminProfiles = profiles.filter((p) =>
              adminIds.includes(p.user_id),
            );

            setSuperuserNames(
              superuserProfiles
                .map((p) => p.display_name)
                .filter((n): n is string => Boolean(n)),
            );
            setAdminNames(
              adminProfiles
                .map((p) => p.display_name)
                .filter((n): n is string => Boolean(n)),
            );
          }
        }
      }

      // Fetch restaurant data first for fast initial render
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .single();

      if (restaurantError || !restaurantData) {
        setError("Restaurant not found");
        setLoading(false);
        return;
      }

      // Show restaurant immediately, then load the rest in parallel
      setRestaurant(restaurantData);
      setLoading(false);

      const [visitsResult, menuResult, ordersResult, cuisinesResult] =
        await Promise.all([
          supabase
            .from("restaurant_visits")
            .select("*")
            .eq("restaurant_id", id)
            .order("visited_at", { ascending: false }),
          supabase
            .from("menu_items")
            .select("*")
            .eq("restaurant_id", id)
            .order("name"),
          supabase
            .from("item_orders")
            .select("*")
            .eq("restaurant_id", id)
            .order("ordered_at", { ascending: false }),
          supabase.from("restaurants").select("cuisine, food_tags"),
        ]);

      setVisits(visitsResult.data ?? []);
      setMenuItems(menuResult.data ?? []);
      setItemOrders(ordersResult.data ?? []);

      if (cuisinesResult.data) {
        const rows = cuisinesResult.data as {
          cuisine: string | null;
          food_tags: string[] | null;
        }[];
        const uniqueCuisines = Array.from(
          new Set(rows.map((r) => r.cuisine).filter(Boolean)),
        ).sort();
        setCuisines(uniqueCuisines as string[]);
        const uniqueFoodTags = Array.from(
          new Set(rows.flatMap((r) => r.food_tags ?? [])),
        ).sort();
        setExistingFoodTags(uniqueFoodTags);
      }

      await Promise.all([
        loadRecommendationsAndNames(
          menuResult.data ?? [],
          ordersResult.data ?? [],
        ),
        loadCuratorRatings(id),
      ]);
    }
    fetchData();
  }, [params]);

  async function loadCuratorRatings(restaurantId: number) {
    const { data: ratingsData } = await supabase
      .from("curator_ratings")
      .select("*")
      .eq("restaurant_id", restaurantId);
    const rows = (ratingsData ?? []) as CuratorRating[];
    setCuratorRatings(rows);

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
      setCuratorProfiles(map);
    } else {
      setCuratorProfiles({});
    }
    setCuratorRatingsLoaded(true);
  }

  async function saveCuratorRating(args: {
    rating: number | null;
    note: string | null;
    must_try: boolean;
  }) {
    if (!user || !restaurant) return;
    const existing = curatorRatings.find((r) => r.user_id === user.id);
    const cleanedNote =
      args.note && args.note.trim().length > 0 ? args.note.trim() : null;

    // must_try_since: stamp now on false->true, keep on true->true, null on *->false.
    const wasMustTry = existing?.must_try ?? false;
    const nextMustTrySince = args.must_try
      ? wasMustTry
        ? (existing?.must_try_since ?? new Date().toISOString())
        : new Date().toISOString()
      : null;

    if (
      args.rating === null &&
      cleanedNote === null &&
      args.must_try === false
    ) {
      await supabase
        .from("curator_ratings")
        .delete()
        .eq("restaurant_id", restaurant.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("curator_ratings").upsert(
        {
          restaurant_id: restaurant.id,
          user_id: user.id,
          rating: args.rating,
          previous_rating: existing?.rating ?? null,
          note: cleanedNote,
          must_try: args.must_try,
          must_try_since: nextMustTrySince,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id,user_id" },
      );
    }

    // Recompute the cached rollup on restaurants so the home grid/filters stay
    // consistent with the per-curator flags.
    const { data: refreshed } = await supabase
      .from("curator_ratings")
      .select("must_try, must_try_since")
      .eq("restaurant_id", restaurant.id);
    const flagged = (refreshed ?? []).filter(
      (r: { must_try: boolean; must_try_since: string | null }) =>
        r.must_try && r.must_try_since,
    ) as { must_try: boolean; must_try_since: string }[];
    const nextRollupMustTry = flagged.length > 0;
    const nextRollupSince = nextRollupMustTry
      ? flagged
          .map((r) => r.must_try_since)
          .sort()[0]
      : null;

    if (
      nextRollupMustTry !== restaurant.must_try ||
      nextRollupSince !== restaurant.must_try_since
    ) {
      await supabase
        .from("restaurants")
        .update({
          must_try: nextRollupMustTry,
          must_try_since: nextRollupSince,
        })
        .eq("id", restaurant.id);
      setRestaurant({
        ...restaurant,
        must_try: nextRollupMustTry,
        must_try_since: nextRollupSince,
      });
    }

    await loadCuratorRatings(restaurant.id);
  }

  async function loadRecommendationsAndNames(
    items: MenuItem[],
    orders: ItemOrder[],
  ) {
    const itemIds = items.map((m) => m.id);
    let recs: MenuItemRecommendation[] = [];
    if (itemIds.length > 0) {
      const { data } = await supabase
        .from("menu_item_recommendations")
        .select("*")
        .in("menu_item_id", itemIds);
      recs = (data ?? []) as MenuItemRecommendation[];
    }
    setRecommendations(recs);

    const userIds = Array.from(
      new Set([
        ...recs.map((r) => r.user_id),
        ...orders.map((o) => o.ordered_by).filter(Boolean),
      ]),
    );

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const recNames: Record<string, string> = {};
      const ordNames: Record<string, string> = {};
      (profiles ?? []).forEach(
        (p: { user_id: string; display_name: string | null }) => {
          const label = formatDisplayName(p.display_name) || "Curator";
          recNames[p.user_id] = label;
          ordNames[p.user_id] = label;
        },
      );
      setRecommenderNames(recNames);
      setOrdererNames(ordNames);
    } else {
      setRecommenderNames({});
      setOrdererNames({});
    }
  }

  async function handleCheckIn(
    visitDate: string,
    shouldLogOrder: boolean,
    note?: string,
  ) {
    if (!restaurant || !displayName) return;

    const visitedBy = displayName;

    setVisitingId(restaurant.id);
    setShowCheckInModal(false);

    const { error: insertError } = await supabase
      .from("restaurant_visits")
      .insert([
        {
          restaurant_id: restaurant.id,
          visited_by: visitedBy,
          visited_at: visitDate,
          note: note || null,
          user_id: user?.id ?? null,
        },
      ]);

    if (insertError) {
      // The 24h cooldown is now enforced in Postgres; surface that clearly
      // rather than leaving the user wondering why the button failed.
      const msg = /row-level security/i.test(insertError.message)
        ? "You've already checked in here in the last 24 hours."
        : "Failed to mark as visited";
      toast(msg, "error");
      setVisitingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ last_visited: visitDate })
      .eq("id", restaurant.id);

    if (updateError) {
      toast("Failed to update last visited date", "error");
    }

    const { data: visitsData } = await supabase
      .from("restaurant_visits")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("visited_at", { ascending: false });

    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurant.id)
      .single();

    setVisits(visitsData ?? []);
    if (restaurantData) setRestaurant(restaurantData);
    setVisitingId(null);

    success();
    toast("Check-in logged", "success");

    // Open order modal if user chose to log order
    if (shouldLogOrder) {
      setEditingOrder(null);
      setEditingMenuItem(null);
      setShowOrderModal(true);
    }
  }

  function handleDelete() {
    if (!restaurant) return;
    setShowDeleteRestaurantConfirm(true);
  }

  async function confirmDeleteRestaurant() {
    if (!restaurant) return;
    setShowDeleteRestaurantConfirm(false);
    setDeletingId(restaurant.id);

    const { error } = await supabase
      .from("restaurants")
      .delete()
      .eq("id", restaurant.id);

    if (error) {
      toast("Failed to delete restaurant", "error");
      setDeletingId(null);
      return;
    }

    router.push("/");
  }

  function handleEdit() {
    if (!restaurant) return;
    setShowEditModal(true);
  }

  async function handleSave(
    entry: Omit<Restaurant, "id" | "created_at">,
  ): Promise<boolean> {
    if (!restaurant) return false;
    setSaveError("");

    const { error } = await supabase
      .from("restaurants")
      .update(entry)
      .eq("id", restaurant.id);

    if (error) {
      console.error("Update error:", error);
      setSaveError("Failed to update restaurant.");
      return false;
    }

    // Reload restaurant data
    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurant.id)
      .single();

    if (restaurantData) {
      setRestaurant(restaurantData);
    }

    setShowEditModal(false);
    return true;
  }

  async function reloadOrders() {
    if (!restaurant) return;
    const { data: menuData } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("name");
    const items = menuData ?? [];
    setMenuItems(items);

    const { data: ordersData } = await supabase
      .from("item_orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("ordered_at", { ascending: false });
    const orders = ordersData ?? [];
    setItemOrders(orders);

    await loadRecommendationsAndNames(items, orders);
  }

  async function handleLogAgain(source: ItemOrder) {
    if (!user || !restaurant) return;
    const { error: insertError } = await supabase.from("item_orders").insert([
      {
        menu_item_id: source.menu_item_id,
        restaurant_id: source.restaurant_id,
        ordered_at: new Date().toISOString().slice(0, 10),
        notes: null,
        drink_details: source.drink_details,
        photo_url: null,
        ordered_by: user.id,
      },
    ]);
    if (insertError) {
      toast("Failed to log order", "error");
      return;
    }
    toast("Logged again", "success");
    await reloadOrders();
  }

  async function handleEditOrder(order: ItemOrder) {
    const menuItem = menuItems.find((mi) => mi.id === order.menu_item_id);
    setEditingOrder(order);
    setEditingMenuItem(menuItem ?? null);
    setShowOrderModal(true);
  }

  function handleDeleteOrderClick(orderId: number) {
    setShowDeleteConfirm(orderId);
  }

  async function handleDeleteOrderConfirm(orderId: number) {
    setDeletingOrderId(orderId);
    setShowDeleteConfirm(null);
    const { error } = await supabase
      .from("item_orders")
      .delete()
      .eq("id", orderId);
    if (error) {
      setDeletingOrderId(null);
    } else {
      await reloadOrders();
    }
    setDeletingOrderId(null);
  }

  async function handleDeleteVisit(visitId: number) {
    if (!restaurant) return;

    setDeletingVisitId(visitId);
    setShowDeleteVisitConfirm(null);

    const { error } = await supabase
      .from("restaurant_visits")
      .delete()
      .eq("id", visitId);

    if (error) {
      toast("Failed to delete visit", "error");
      setDeletingVisitId(null);
      return;
    }

    // Reload visits
    const { data: visitsData } = await supabase
      .from("restaurant_visits")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("visited_at", { ascending: false });

    setVisits(visitsData ?? []);

    // Update last_visited if needed
    const newLastVisited =
      visitsData && visitsData.length > 0 ? visitsData[0].visited_at : null;

    await supabase
      .from("restaurants")
      .update({ last_visited: newLastVisited })
      .eq("id", restaurant.id);

    // Reload restaurant data
    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurant.id)
      .single();

    if (restaurantData) setRestaurant(restaurantData);
    setDeletingVisitId(null);
    toast("Visit deleted", "success");
  }

  // Build one group per menu item with aggregated order / recommender data
  type DishGroup = {
    menuItem: MenuItem;
    orders: ItemOrder[];
    latestOrder: ItemOrder | null;
    noteOrder: ItemOrder | null;
    latestPhotoUrl: string | null;
    orderCount: number;
    recommenderIds: string[];
  };

  const dishGroups: DishGroup[] = menuItems.map((mi) => {
    const orders = itemOrders.filter((o) => o.menu_item_id === mi.id);
    const latestOrder = orders[0] ?? null;
    const noteOrder =
      orders.find((o) => (o.notes ?? "").trim().length > 0) ?? null;
    const latestPhotoUrl =
      orders.find((o) => (o.photo_url ?? "").trim().length > 0)?.photo_url ??
      null;
    const recommenderIds = recommendations
      .filter((r) => r.menu_item_id === mi.id)
      .map((r) => r.user_id);
    return {
      menuItem: mi,
      orders,
      latestOrder,
      noteOrder,
      latestPhotoUrl,
      orderCount: orders.length,
      recommenderIds,
    };
  });

  // Public "What to order here": at least one curator recommends it.
  const publicDishes = dishGroups
    .filter((g) => g.recommenderIds.length > 0)
    .sort((a, b) => {
      if (b.recommenderIds.length !== a.recommenderIds.length)
        return b.recommenderIds.length - a.recommenderIds.length;
      return b.orderCount - a.orderCount;
    });

  // Curator "My history here": every dish with at least one order, sorted by order count.
  const curatorDishes = dishGroups
    .filter((g) => g.orderCount > 0)
    .sort((a, b) => {
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      const aLatest = a.latestOrder?.ordered_at ?? "";
      const bLatest = b.latestOrder?.ordered_at ?? "";
      return bLatest.localeCompare(aLatest);
    });

  // Usual-order badge: boba drink with >=3 orders that is >50% of boba orders at this shop.
  const bobaOrders = itemOrders.filter((o) => {
    const mi = menuItems.find((m) => m.id === o.menu_item_id);
    return mi?.category === "boba";
  });
  const usualBadgeDishId = (() => {
    if (bobaOrders.length === 0) return null;
    const counts: Record<number, number> = {};
    bobaOrders.forEach((o) => {
      counts[o.menu_item_id] = (counts[o.menu_item_id] || 0) + 1;
    });
    const [topId, topCount] = Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )[0] ?? [null, 0];
    if (!topId || topCount < 3) return null;
    if (topCount / bobaOrders.length <= 0.5) return null;
    return parseInt(topId);
  })();

  function formatDrinkSummary(details: DrinkDetails | null): string {
    if (!details) return "";
    const parts: string[] = [];
    if (details.sweetness) parts.push(details.sweetness.label);
    if (details.ice) parts.push(details.ice.label);
    if (details.toppings && details.toppings.length > 0)
      parts.push(details.toppings.join(" + "));
    if (details.size) parts.push(details.size);
    if (details.temperature) parts.push(details.temperature);
    if (details.milk_type) parts.push(details.milk_type + " milk");
    return parts.join(" · ");
  }

  function buildDishPhotos(
    orders: ItemOrder[],
    dishName: string,
  ): LightboxPhoto[] {
    return orders
      .filter((o) => (o.photo_url ?? "").trim().length > 0)
      .map((o) => ({
        url: o.photo_url!,
        title: dishName,
        subtitle: `${formatDate(o.ordered_at)} · by ${
          ordererNames[o.ordered_by] || "curator"
        }`,
      }));
  }

  function buildOrderHistoryPhotos(): LightboxPhoto[] {
    if (historyView === "by-dish") {
      return curatorDishes.flatMap((group) =>
        buildDishPhotos(group.orders, group.menuItem.name),
      );
    }
    return itemOrders
      .filter((o) => (o.photo_url ?? "").trim().length > 0)
      .map((o) => {
        const mi = menuItems.find((m) => m.id === o.menu_item_id);
        return {
          url: o.photo_url!,
          title: mi?.name ?? "Unknown item",
          subtitle: `${formatDate(o.ordered_at)} · by ${
            ordererNames[o.ordered_by] || "curator"
          }`,
        };
      });
  }

  function openOrderHistoryLightbox(focusUrl: string) {
    const photos = buildOrderHistoryPhotos();
    if (photos.length === 0) return;
    const idx = Math.max(
      0,
      photos.findIndex((p) => p.url === focusUrl),
    );
    setLightbox({ photos, index: idx, header: "Order History" });
  }

  function openRecommendedLightbox(focusUrl: string) {
    const photos = publicDishes.flatMap((group) =>
      buildDishPhotos(group.orders, group.menuItem.name),
    );
    if (photos.length === 0) return;
    const idx = Math.max(
      0,
      photos.findIndex((p) => p.url === focusUrl),
    );
    setLightbox({ photos, index: idx, header: "Recommended Items" });
  }

  const heroPhotos: RestaurantPhoto[] = useMemo(() => {
    if (!restaurant) return [];
    const slides: RestaurantPhoto[] = [];
    const seen = new Set<string>();

    const storefrontUrl =
      restaurant.photo_url || restaurant.storefront_photo_url;
    if (storefrontUrl) {
      seen.add(storefrontUrl);
      slides.push({
        url: storefrontUrl,
        itemName: null,
        isStorefront: true,
        isRecommended: false,
      });
    }

    const recCountByItem = new Map<number, number>();
    recommendations.forEach((r) => {
      recCountByItem.set(
        r.menu_item_id,
        (recCountByItem.get(r.menu_item_id) ?? 0) + 1,
      );
    });
    const orderCountByItem = new Map<number, number>();
    itemOrders.forEach((o) => {
      orderCountByItem.set(
        o.menu_item_id,
        (orderCountByItem.get(o.menu_item_id) ?? 0) + 1,
      );
    });
    const nameById = new Map<number, string>();
    menuItems.forEach((m) => nameById.set(m.id, m.name));

    // Group photos by menu_item_id. itemOrders is already sorted ordered_at
    // desc, so each group is newest-first.
    const photosByDish = new Map<number, RestaurantPhoto[]>();
    itemOrders.forEach((o) => {
      if (!o.photo_url || seen.has(o.photo_url)) return;
      seen.add(o.photo_url);
      const photo: RestaurantPhoto = {
        url: o.photo_url,
        itemName: nameById.get(o.menu_item_id) ?? null,
        isStorefront: false,
        isRecommended: (recCountByItem.get(o.menu_item_id) ?? 0) > 0,
      };
      const list = photosByDish.get(o.menu_item_id) ?? [];
      list.push(photo);
      photosByDish.set(o.menu_item_id, list);
    });

    // Recommended dishes first, in the same order as the "Recommended Items"
    // section: by recommender count desc, then by order count desc.
    const recommendedIds = Array.from(recCountByItem.keys()).sort((a, b) => {
      const recDiff =
        (recCountByItem.get(b) ?? 0) - (recCountByItem.get(a) ?? 0);
      if (recDiff !== 0) return recDiff;
      return (orderCountByItem.get(b) ?? 0) - (orderCountByItem.get(a) ?? 0);
    });

    const orderedPhotos: RestaurantPhoto[] = [];
    recommendedIds.forEach((id) => {
      const list = photosByDish.get(id);
      if (list) {
        orderedPhotos.push(...list);
        photosByDish.delete(id);
      }
    });
    // Remaining non-recommended dish photos, still grouped by dish.
    photosByDish.forEach((list) => {
      orderedPhotos.push(...list);
    });

    return [...slides, ...orderedPhotos];
  }, [restaurant, itemOrders, menuItems, recommendations]);

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="p-6 pb-4 border-b border-brd">
          <div className="h-3 w-24 bg-bg2 rounded-pill animate-pulse" />
        </div>
        <div className="border-b-2 border-txt">
          <div className="w-full h-[400px] bg-bg2 animate-pulse" />
          <div className="p-6">
            <div className="h-3 w-20 bg-bg2 rounded-pill animate-pulse mb-3" />
            <div className="h-12 w-3/4 bg-bg2 animate-pulse mb-4" />
            <div className="flex gap-3">
              <div className="h-4 w-24 bg-bg2 rounded-pill animate-pulse" />
              <div className="h-4 w-16 bg-bg2 rounded-pill animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-6 border-b border-brd">
          <div className="h-5 w-16 bg-bg2 animate-pulse mb-3" />
          <div className="h-4 w-full bg-bg2 animate-pulse mb-2" />
          <div className="h-4 w-2/3 bg-bg2 animate-pulse" />
        </div>
      </main>
    );
  }

  if (error || !restaurant) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-error mb-4">{error || "Restaurant not found"}</p>
        <Link
          href="/"
          onClick={handleBackClick}
          className="text-accent2 font-medium text-sm no-underline"
        >
          ← Back to list
        </Link>
      </main>
    );
  }

  const contextValue = {
    restaurant,
    visits,
    cuisineColor,
    isScrolled,
    hasScrolled,
    superuserNames,
    adminNames,
    visitingId,
    canCheckIn,
    deletingVisitId,
    showVisitHistory,
    setShowVisitHistory,
    setShowCheckInModal,
    setShowOrderModal,
    setShowDeleteVisitConfirm,
    setEditingOrder,
    setEditingMenuItem,
  };

  return (
    <RestaurantDetailProvider value={contextValue}>
    <main className={`min-h-screen pb-24`}>
      <StickyHeader />

      {/* Breadcrumb */}
      <div className="sticky top-0 z-10 bg-bg p-6 pb-4 border-b border-brd">
        <Link
          href="/"
          onClick={handleBackClick}
          className="text-xs tracking-wide uppercase font-medium text-accent2 no-underline"
        >
          ← Back to list
        </Link>
      </div>

      {/* Visibility banner (admin-only view of non-public restaurants) */}
      {isAdmin &&
        restaurant.visibility &&
        restaurant.visibility !== "public" && (
          <div
            className={`p-4 text-sm font-medium border-b-2 border-txt ${
              restaurant.visibility === "private"
                ? "bg-bg2 text-txt"
                : "bg-bg2 text-txt2"
            }`}
          >
            {restaurant.visibility === "private"
              ? "🔒 Private — not shown in the public guide"
              : "📦 Archived — kept for history, hidden from the public guide"}
          </div>
        )}

      {/* Restaurant Header */}
      <div className="border-b-2 border-txt">
        {heroPhotos.length > 0 && (
          <PhotoCarousel
            photos={heroPhotos}
            priority
            aspectClass="aspect-[16/9] max-h-[320px]"
            heroName={`hero-${restaurant.id}`}
            onPhotoClick={(i) => {
              setLightbox({
                photos: heroPhotos.map((p) => {
                  const order = itemOrders.find((o) => o.photo_url === p.url);
                  const subtitle = order
                    ? `${formatDate(order.ordered_at)} · by ${
                        ordererNames[order.ordered_by] || "curator"
                      }`
                    : null;
                  return {
                    url: p.url,
                    title: p.itemName ?? restaurant.name,
                    subtitle,
                  };
                }),
                index: i,
              });
            }}
          />
        )}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <p className="text-xs tracking-wide uppercase font-medium text-accent">
              {restaurant.cuisine}
            </p>
            {(() => {
              const openNow = isCurrentlyOpen(restaurant.opening_hours);
              if (openNow === null) return null;
              return (
                <span
                  className={`text-2xs font-medium px-2 py-0.5 rounded-pill tracking-tight ${
                    openNow
                      ? "bg-[#EAF3DE] text-[#27500A]"
                      : "bg-[#F1EFE8] text-[#5F5E5A]"
                  }`}
                >
                  {openNow ? "Open now" : "Closed"}
                </span>
              );
            })()}
          </div>
          <h1 className="font-display text-[clamp(44px,7.5vw,64px)] leading-[0.9] tracking-tight mb-2">
            {restaurant.name}
          </h1>
          <div className="flex items-center gap-3 flex-wrap text-base text-txt2 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-accent2 shrink-0" />
              {restaurant.neighborhood}
            </span>
            <span className="text-brd">·</span>
            <span className="font-medium">{restaurant.price}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {restaurant.address && (
                <>
                  {restaurant.google_maps_url ? (
                    <a
                      href={restaurant.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackEvent("outbound_click", "google_maps")
                      }
                      className="text-xs text-txt2 no-underline hover:text-accent2 transition-colors inline-flex items-center gap-1"
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {restaurant.address}
                    </a>
                  ) : (
                    <p className="text-xs text-txt2">{restaurant.address}</p>
                  )}
                </>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={handleEdit}
                className="btn-outline btn-pill !py-1 !px-2.5 !text-2xs !border-txt !text-txt shrink-0"
              >
                Edit
              </button>
            )}
          </div>
          {(restaurant.must_try ||
            (restaurant.occasions && restaurant.occasions.length > 0) ||
            (restaurant.food_tags && restaurant.food_tags.length > 0)) && (
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {restaurant.must_try && (
                <span className="text-2xs font-medium px-2 py-0.5 rounded-pill bg-accent text-white tracking-tight uppercase">
                  Must-Try
                </span>
              )}
              {restaurant.occasions?.map((occasion) => (
                <span
                  key={occasion}
                  className="text-2xs font-medium px-2.5 py-1 rounded-pill border border-brd text-txt2 capitalize"
                >
                  {occasion}
                </span>
              ))}
              {restaurant.food_tags?.map((tag) => (
                <span
                  key={`food-tag-${tag}`}
                  className="text-2xs font-medium px-2.5 py-1 rounded-pill border border-brd text-txt2"
                >
                  {formatFoodTag(tag)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sentinel for sticky header IntersectionObserver */}
      <div ref={stickySentinelRef} aria-hidden="true" className="h-px" />

      {/* Ratings Section - Always show 3 columns: Google, My Rating, Check-ins */}
      <div className="flex items-stretch border-b border-brd">
        <div className="flex-1 text-center py-3 px-3">
          <div className="font-display text-[clamp(32px,6vw,40px)] leading-none text-txt mb-1">
            {restaurant.google_rating
              ? restaurant.google_rating.toFixed(1)
              : "—"}
          </div>
          <div className="text-2xs uppercase tracking-wide text-txt2 mb-0.5">
            Google rating
          </div>
          {restaurant.google_rating && restaurant.google_review_count ? (
            <div className="text-2xs text-txt2 opacity-60">
              {restaurant.google_review_count.toLocaleString()} reviews
            </div>
          ) : (
            <div className="text-2xs text-txt2 opacity-60">—</div>
          )}
        </div>
        <div className="w-px bg-brd" />
        <CuratorRatingControl
          ratingsCount={curatorRatings.length}
          avg={curatorAvg !== null ? Math.round(curatorAvg * 2) / 2 : null}
          loaded={curatorRatingsLoaded}
        />
        <div className="w-px bg-brd" />
        <div className="flex-1 text-center py-3 px-3">
          <div className="font-display text-[clamp(32px,6vw,40px)] leading-none text-txt mb-1">
            {visits.length}
          </div>
          <div className="text-2xs uppercase tracking-wide text-txt2 mb-0.5">
            Check-ins
          </div>
          {restaurant.last_visited && (
            <div className="text-2xs text-txt2 opacity-60">
              Last:{" "}
              {(() => {
                if (!restaurant.last_visited) return "";
                const date = new Date(restaurant.last_visited);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 0) return "today";
                if (diffDays === 1) return "1 day ago";
                if (diffDays < 7) return `${diffDays} days ago`;
                if (diffDays < 30)
                  return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? "s" : ""} ago`;
                return formatDate(restaurant.last_visited).replace(
                  /\d{4}$/,
                  (y) => y.slice(2),
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Curator Take Section — public quotes plus inline edit for the
          signed-in curator (replaces the old expandable rating panel). */}
      {(() => {
        const myRating = user
          ? curatorRatings.find((r) => r.user_id === user.id)
          : null;
        const hasMyRating = !!myRating;
        const noted = curatorRatings.filter(
          (r) => r.note && r.note.trim().length > 0,
        );
        const showSection =
          curatorRatings.length > 0 || (canManageContent && !!user);
        if (!showSection) return null;
        const sectionLabel =
          curatorAvg !== null && curatorAvg >= 5
            ? "Why we love it"
            : curatorAvg !== null && curatorAvg >= 4
              ? "Why we like it"
              : "Our Take";
        // Animated expand/collapse using a 1fr ↔ 0fr grid row. Both views
        // (quote + editor, or CTA + editor) stay mounted; the height
        // transition gives a smooth in-place morph instead of a hard swap.
        const expandRow = (open: boolean) =>
          `grid transition-[grid-template-rows] duration-[280ms] ease-out ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`;
        const editorBody = (
          <CuratorRatingPanel
            bare
            ratings={curatorRatings}
            profiles={curatorProfiles}
            userId={user?.id}
            canEdit={canManageContent}
            onSave={saveCuratorRating}
            onClose={() => setEditingMyTake(false)}
          />
        );
        return (
          <section
            id="our-take"
            className="px-6 py-7 border-b border-brd scroll-fade-in"
          >
            {curatorRatings.length > 0 && (
              <header className="flex items-baseline justify-between gap-3 mb-5">
                <h2 className="font-display text-2xl tracking-tight leading-none">
                  {noted.length > 0 ? sectionLabel : "Our Take"}
                </h2>
                <span className="text-2xs uppercase tracking-[0.1em] text-txt2 shrink-0">
                  {curatorRatings.length} curator
                  {curatorRatings.length !== 1 ? "s" : ""}
                </span>
              </header>
            )}

            <div className="space-y-3">
              {curatorRatings.map((r) => {
                const isOwn = canManageContent && !!user && r.user_id === user.id;
                const isEditingThis = isOwn && editingMyTake;
                const hasNote = !!(r.note && r.note.trim().length > 0);
                const p = curatorProfiles[r.user_id];
                const name =
                  formatDisplayName(p?.display_name) || "Curator";
                return (
                  <figure
                    key={r.id}
                    className="relative bg-bg2 border border-brd p-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-txt truncate">
                          {name}
                        </div>
                        {!isEditingThis && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {r.rating !== null && (
                              <span
                                className="text-accent text-xs leading-none"
                                aria-label={`${r.rating} out of 5 stars`}
                              >
                                {"★".repeat(r.rating)}
                                <span className="text-brd">
                                  {"★".repeat(5 - r.rating)}
                                </span>
                              </span>
                            )}
                            {r.must_try && (
                              <span className="text-2xs font-medium px-1.5 py-0.5 rounded-pill bg-accent text-white tracking-tight uppercase leading-none">
                                ★ Must-Try
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {isOwn && !editingMyTake && (
                        <button
                          type="button"
                          onClick={() => setEditingMyTake(true)}
                          aria-label="Edit your take"
                          className="text-txt2 hover:text-accent bg-transparent border-none cursor-pointer p-1.5 -m-1.5 transition-colors duration-150 shrink-0"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Quote view — collapses when own + editing.
                        Skipped for curators who only rated. */}
                    {hasNote && (
                      <div className={expandRow(!isEditingThis)}>
                        <div className="overflow-hidden">
                          <p className="text-base text-txt leading-relaxed pt-3">
                            {r.note}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Editor view — only mounted for the signed-in curator */}
                    {isOwn && (
                      <div className={expandRow(isEditingThis)}>
                        <div className="overflow-hidden">
                          <div className="pt-4">{editorBody}</div>
                        </div>
                      </div>
                    )}
                  </figure>
                );
              })}

              {/* Add-your-take slot — only when the curator has no rating
                  row yet. If they've rated (with or without a note) their
                  card above already contains the editor. */}
              {canManageContent && !!user && !hasMyRating && (
                <figure className="relative bg-bg2 border border-brd overflow-hidden">
                  <div className={expandRow(!editingMyTake)}>
                    <div className="overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setEditingMyTake(true)}
                        className="w-full py-4 px-5 text-txt2 hover:text-accent transition-colors duration-150 text-sm font-medium tracking-wide flex items-center justify-center gap-2 bg-transparent cursor-pointer border-none"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        <span>Add your take</span>
                      </button>
                    </div>
                  </div>
                  <div className={expandRow(editingMyTake)}>
                    <div className="overflow-hidden">
                      <div className="p-5">{editorBody}</div>
                    </div>
                  </div>
                </figure>
              )}
            </div>
          </section>
        );
      })()}

      {/* What to order here — public-facing, recommended dishes only */}
      {publicDishes.length > 0 && (
        <div
          id="recommended-items"
          className="p-6 border-b border-brd scroll-fade-in"
        >
          <h2 className="font-display text-xl mb-3 tracking-tight">
            Recommended Items
          </h2>
          <div className="space-y-3">
            {publicDishes.map((item) => {
              const isUsual = item.menuItem.id === usualBadgeDishId;
              return (
                <div
                  key={item.menuItem.id}
                  className="flex items-start gap-3 border-[1.5px] border-brd p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-display text-lg leading-tight">
                        {item.menuItem.name}
                      </p>
                      {isUsual && (
                        <span className="text-2xs font-medium px-2 py-0.5 rounded-pill bg-accent text-white tracking-tight uppercase">
                          Usual order
                        </span>
                      )}
                    </div>
                    {item.noteOrder && (
                      <p className="text-xs text-txt leading-snug italic mb-1">
                        {item.noteOrder.id !== item.latestOrder?.id && (
                          <span className="not-italic text-txt2">
                            Latest note (from{" "}
                            {formatDate(item.noteOrder.ordered_at)}):{" "}
                          </span>
                        )}
                        &ldquo;{item.noteOrder.notes}&rdquo;
                        {item.noteOrder.id !== item.latestOrder?.id && (
                          <span className="not-italic text-txt2">
                            {" "}
                            &mdash;{" "}
                            {ordererNames[item.noteOrder.ordered_by] ||
                              "curator"}
                          </span>
                        )}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-2xs text-txt2 flex-wrap">
                      <span>
                        {item.orderCount} order
                        {item.orderCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        Recommended by{" "}
                        {item.recommenderIds
                          .map((id) => recommenderNames[id] || "curator")
                          .join(", ")}
                      </span>
                    </div>
                    {isUsual && isAdmin && item.latestOrder && (
                      <button
                        onClick={() => handleLogAgain(item.latestOrder!)}
                        className="mt-2 py-1.5 px-3 text-2xs font-medium bg-accent text-white border-[1.5px] border-accent rounded-pill transition-all hover:opacity-90"
                      >
                        Log this again
                      </button>
                    )}
                  </div>
                  {item.latestPhotoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        openRecommendedLightbox(item.latestPhotoUrl!)
                      }
                      className="shrink-0 p-0 border-none bg-transparent cursor-pointer"
                      aria-label={`View photos of ${item.menuItem.name}`}
                    >
                      <img
                        src={item.latestPhotoUrl}
                        alt={item.menuItem.name}
                        loading="lazy"
                        decoding="async"
                        className="w-16 h-16 object-cover rounded-lg border border-brd bg-bg2"
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <RestaurantActionBar />

      {/* Curator order history — read-only for non-admins */}
      {itemOrders.length > 0 && (
        <div
          id="order-history"
          className="p-6 border-t border-brd scroll-fade-in"
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-display text-xl tracking-tight">
              Curators&rsquo; order history
            </h2>
            <div className="flex border-[1.5px] border-brd rounded-none overflow-hidden">
              <button
                onClick={() => setHistoryView("by-dish")}
                className={`py-1 px-3 text-2xs font-medium uppercase tracking-wide transition-colors ${
                  historyView === "by-dish"
                    ? "bg-txt text-bg"
                    : "bg-transparent text-txt2"
                }`}
              >
                By dish
              </button>
              <button
                onClick={() => setHistoryView("timeline")}
                className={`py-1 px-3 text-2xs font-medium uppercase tracking-wide transition-colors ${
                  historyView === "timeline"
                    ? "bg-txt text-bg"
                    : "bg-transparent text-txt2"
                }`}
              >
                Timeline
              </button>
            </div>
          </div>

          {historyView === "by-dish" ? (
            <div className="space-y-3">
              {curatorDishes.map((group) => {
                const isSingle = group.orderCount === 1;
                const expanded = expandedDishId === group.menuItem.id;
                const latest = group.latestOrder;
                const latestCurator = latest
                  ? ordererNames[latest.ordered_by] || "curator"
                  : null;
                return (
                  <div
                    key={group.menuItem.id}
                    className="border-[1.5px] border-brd"
                  >
                    {isSingle ? (
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-display text-lg leading-tight">
                              {group.menuItem.name}
                            </p>
                            {group.menuItem.category && (
                              <span className="text-2xs text-txt2 capitalize">
                                {group.menuItem.category}
                              </span>
                            )}
                          </div>
                          {latest && (
                            <p className="text-2xs text-txt2 mb-1">
                              {formatDate(latest.ordered_at)} · by{" "}
                              {latestCurator}
                            </p>
                          )}
                          {latest?.notes && (
                            <p className="text-sm text-txt italic mb-1">
                              {latest.notes}
                            </p>
                          )}
                          {latest?.drink_details && (
                            <p className="text-2xs text-txt2">
                              {formatDrinkSummary(
                                latest.drink_details as DrinkDetails,
                              )}
                            </p>
                          )}
                          {isAdmin && latest && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleEditOrder(latest)}
                                className="btn-outline !py-1 !px-2 !text-2xs !border-txt !text-txt"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteOrderClick(latest.id)
                                }
                                disabled={deletingOrderId === latest.id}
                                className="btn-outline !py-1 !px-2 !text-2xs !border-accent !text-accent hover:!bg-accent hover:!text-white"
                              >
                                {deletingOrderId === latest.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          )}
                        </div>
                        {group.latestPhotoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              openOrderHistoryLightbox(group.latestPhotoUrl!)
                            }
                            className="shrink-0 p-0 border-none bg-transparent cursor-pointer"
                            aria-label={`View photo of ${group.menuItem.name}`}
                          >
                            <img
                              src={group.latestPhotoUrl}
                              alt={group.menuItem.name}
                              loading="lazy"
                              decoding="async"
                              className="w-16 h-16 object-cover rounded-lg border border-brd bg-bg2"
                            />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDishId(
                              expanded ? null : group.menuItem.id,
                            )
                          }
                          className="flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer p-0"
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-display text-lg leading-tight">
                              {group.menuItem.name}
                            </p>
                            {group.menuItem.category && (
                              <span className="text-2xs text-txt2 capitalize">
                                {group.menuItem.category}
                              </span>
                            )}
                            <Chevron open={expanded} className="text-txt2" />
                          </div>
                          <p className="text-2xs text-txt2 mb-1">
                            {group.orderCount} orders
                            {latest && (
                              <>
                                {" · last "}
                                {formatDate(latest.ordered_at)} by{" "}
                                {latestCurator}
                              </>
                            )}
                          </p>
                          {group.noteOrder && (
                            <p className="text-xs text-txt italic mb-2">
                              {group.noteOrder.id === group.latestOrder?.id ? (
                                <>&ldquo;{group.noteOrder.notes}&rdquo;</>
                              ) : (
                                <>
                                  <span className="not-italic text-txt2">
                                    Latest note (from{" "}
                                    {formatDate(group.noteOrder.ordered_at)}):{" "}
                                  </span>
                                  &ldquo;{group.noteOrder.notes}&rdquo;
                                  <span className="not-italic text-txt2">
                                    {" "}
                                    &mdash;{" "}
                                    {ordererNames[
                                      group.noteOrder.ordered_by
                                    ] || "curator"}
                                  </span>
                                </>
                              )}
                            </p>
                          )}
                        </button>
                        {group.latestPhotoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              openOrderHistoryLightbox(group.latestPhotoUrl!)
                            }
                            className="shrink-0 p-0 border-none bg-transparent cursor-pointer"
                            aria-label={`View photos of ${group.menuItem.name}`}
                          >
                            <img
                              src={group.latestPhotoUrl}
                              alt={group.menuItem.name}
                              loading="lazy"
                              decoding="async"
                              className="w-16 h-16 object-cover rounded-lg border border-brd bg-bg2"
                            />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="px-3 pb-3 -mt-1">
                      <MenuItemRecommendToggle
                        menuItemId={group.menuItem.id}
                        recommendedUserIds={group.recommenderIds}
                        recommenderNames={recommenderNames}
                        onChange={reloadOrders}
                      />
                    </div>
                    {!isSingle && expanded && (
                      <div className="border-t border-brd p-3 space-y-3 bg-bg2">
                        {group.orders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-start gap-3 pb-3 border-b border-brd/40 last:border-0 last:pb-0"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="text-xs text-txt2">
                                  {formatDate(order.ordered_at)} · by{" "}
                                  {ordererNames[order.ordered_by] || "curator"}
                                </p>
                              </div>
                              {order.notes && (
                                <p className="text-sm text-txt italic mb-1">
                                  {order.notes}
                                </p>
                              )}
                              {order.drink_details && (
                                <p className="text-2xs text-txt2">
                                  {formatDrinkSummary(
                                    order.drink_details as DrinkDetails,
                                  )}
                                </p>
                              )}
                              {isAdmin && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleEditOrder(order)}
                                    className="btn-outline !py-1 !px-2 !text-2xs !border-txt !text-txt"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteOrderClick(order.id)
                                    }
                                    disabled={deletingOrderId === order.id}
                                    className="btn-outline !py-1 !px-2 !text-2xs !border-accent !text-accent hover:!bg-accent hover:!text-white"
                                  >
                                    {deletingOrderId === order.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </div>
                              )}
                            </div>
                            {order.photo_url && (
                              <button
                                type="button"
                                onClick={() =>
                                  openOrderHistoryLightbox(order.photo_url!)
                                }
                                className="shrink-0 p-0 border-none bg-transparent cursor-pointer"
                                aria-label={`View photo of ${group.menuItem.name}`}
                              >
                                <img
                                  src={order.photo_url}
                                  alt={group.menuItem.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-16 h-16 object-cover rounded-lg border border-brd bg-bg2"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {itemOrders.map((order) => {
                const menuItem = menuItems.find(
                  (mi) => mi.id === order.menu_item_id,
                );
                const rowContent = (
                  <div className="border-[1.5px] border-brd p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-display text-lg leading-tight">
                            {menuItem?.name || "Unknown item"}
                          </p>
                          {menuItem?.category && (
                            <span className="text-2xs text-txt2 capitalize">
                              {menuItem.category}
                            </span>
                          )}
                        </div>
                        <p className="text-2xs text-txt2 mb-2">
                          {formatDate(order.ordered_at)} · by{" "}
                          {ordererNames[order.ordered_by] || "curator"}
                        </p>
                        {order.notes && (
                          <p className="text-sm text-txt italic mb-1">
                            {order.notes}
                          </p>
                        )}
                        {order.drink_details && (
                          <p className="text-2xs text-txt2">
                            {formatDrinkSummary(
                              order.drink_details as DrinkDetails,
                            )}
                          </p>
                        )}
                      </div>
                      {order.photo_url && (
                        <button
                          type="button"
                          onClick={() =>
                            openOrderHistoryLightbox(order.photo_url!)
                          }
                          className="shrink-0 p-0 border-none bg-transparent cursor-pointer"
                          aria-label={`View photo of ${menuItem?.name || "order"}`}
                        >
                          <img
                            src={order.photo_url}
                            alt={menuItem?.name}
                            loading="lazy"
                            decoding="async"
                            className="w-16 h-16 object-cover rounded-lg border border-brd bg-bg2"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </button>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="btn-outline !py-1 !px-3 !text-xs !border-txt !text-txt"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOrderClick(order.id)}
                          disabled={deletingOrderId === order.id}
                          className="btn-outline !py-1 !px-3 !text-xs !border-accent !text-accent hover:!bg-accent hover:!text-white"
                        >
                          {deletingOrderId === order.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                );
                return (
                  <SwipeableRow
                    key={order.id}
                    enabled={isAdmin}
                    onDelete={() => handleDeleteOrderClick(order.id)}
                  >
                    {rowContent}
                  </SwipeableRow>
                );
              })}
            </div>
          )}
        </div>
      )}

      <VisitHistorySection />

      {/* Footer Metadata */}
      {(restaurant.added_by || restaurant.date_added) && (
        <div className="px-6 py-4 border-t border-brd">
          <p className="text-2xs text-txt2 opacity-70">
            {restaurant.added_by && (
              <>Added by {formatDisplayName(restaurant.added_by)}</>
            )}
            {restaurant.added_by && restaurant.date_added && " · "}
            {restaurant.date_added && formatDate(restaurant.date_added)}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && restaurant && (
        <AddModal
          onSave={handleSave}
          onClose={() => {
            setShowEditModal(false);
            setSaveError("");
          }}
          editData={restaurant}
          existingCuisines={cuisines}
          existingFoodTags={existingFoodTags}
          onDeleteSuccess={() => router.push("/admin")}
        />
      )}

      {/* Order Modal */}
      {showOrderModal && restaurant && (
        <OrderModal
          restaurantId={restaurant.id}
          editOrder={editingOrder}
          editMenuItem={editingMenuItem}
          onClose={() => {
            setShowOrderModal(false);
            setEditingOrder(null);
            setEditingMenuItem(null);
          }}
          onSaved={reloadOrders}
        />
      )}

      {/* Check-In Modal */}
      {showCheckInModal && restaurant && (
        <CheckInModal
          restaurantName={restaurant.name}
          onConfirm={handleCheckIn}
          onClose={() => setShowCheckInModal(false)}
          isAdmin={isAdmin}
        />
      )}

      {/* Photo Lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          startIndex={lightbox.index}
          header={lightbox.header}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Delete Order Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Order"
          message="Are you sure you want to delete this order? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => handleDeleteOrderConfirm(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {/* Delete Visit Confirmation Modal */}
      {showDeleteVisitConfirm && (
        <ConfirmModal
          title="Delete Visit"
          message="Are you sure you want to delete this visit? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => handleDeleteVisit(showDeleteVisitConfirm)}
          onCancel={() => setShowDeleteVisitConfirm(null)}
        />
      )}

      {/* Delete Restaurant Confirmation Modal */}
      {showDeleteRestaurantConfirm && restaurant && (
        <ConfirmModal
          title={`Delete ${restaurant.name}?`}
          message="This will permanently delete the restaurant and all associated visits, orders, and recommendations. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteRestaurant}
          onCancel={() => setShowDeleteRestaurantConfirm(false)}
        />
      )}
    </main>
    </RestaurantDetailProvider>
  );
}
