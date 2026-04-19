"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  type Restaurant,
  type RestaurantVisit,
  type MenuItem,
  type ItemOrder,
  type DrinkDetails,
  type MenuItemRecommendation,
} from "@/lib/supabase";
import IllustrationNoVisits from "@/components/IllustrationNoVisits";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import AddModal from "@/components/AddModal";
import OrderModal from "@/components/OrderModal";
import ConfirmModal from "@/components/ConfirmModal";
import CheckInModal from "@/components/CheckInModal";
import CuratorRatingControl from "@/components/CuratorRatingControl";
import MenuItemRecommendToggle from "@/components/MenuItemRecommendToggle";
import Link from "next/link";
import Image from "next/image";
import { isCurrentlyOpen } from "@/lib/google-types";
import { trackEvent } from "@/lib/analytics";

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

export default function RestaurantDetailPage({ params }: Props) {
  const router = useRouter();
  const { isAdmin, isSuperuser, displayName, user, isLoading: authLoading } =
    useAuth();
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
  const [ratingRefresh, setRatingRefresh] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const hasScrolled = useRef(false);

  // Check if user has checked in within last 24 hours
  const hasRecentCheckIn = visits.some((visit) => {
    if (visit.visited_by !== displayName) return false;
    const visitTime = new Date(visit.visited_at).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return now - visitTime < twentyFourHours;
  });

  // Check if current user can check in (not within 24 hours for regular users)
  const canCheckIn = isAdmin || isSuperuser ? true : !hasRecentCheckIn;

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
    const handleScroll = () => {
      hasScrolled.current = true;
      setIsScrolled(window.scrollY > 100);
    };
    // Delay listener to skip the browser's initial scroll-to-top on navigation
    const timer = setTimeout(() => {
      window.addEventListener("scroll", handleScroll);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
          supabase.from("restaurants").select("cuisine"),
        ]);

      setVisits(visitsResult.data ?? []);
      setMenuItems(menuResult.data ?? []);
      setItemOrders(ordersResult.data ?? []);

      if (cuisinesResult.data) {
        const rows = cuisinesResult.data as { cuisine: string | null }[];
        const uniqueCuisines = Array.from(
          new Set(rows.map((r) => r.cuisine).filter(Boolean)),
        ).sort();
        setCuisines(uniqueCuisines as string[]);
      }

      await loadRecommendationsAndNames(
        menuResult.data ?? [],
        ordersResult.data ?? [],
      );
    }
    fetchData();
  }, [params]);

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
          recNames[p.user_id] = p.display_name || "Curator";
          ordNames[p.user_id] = p.display_name || "Curator";
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
        },
      ]);

    if (insertError) {
      toast("Failed to mark as visited", "error");
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

    toast("Check-in logged", "success");

    // Open order modal if user chose to log order
    if (shouldLogOrder) {
      setEditingOrder(null);
      setEditingMenuItem(null);
      setShowOrderModal(true);
    }
  }

  async function handleDelete() {
    if (!restaurant || !confirm(`Delete ${restaurant.name}?`)) return;

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

    console.log(
      "Restaurant detail UPDATE payload:",
      JSON.stringify(entry, null, 2),
    );
    console.log("Photo URL being updated:", entry.photo_url);

    const { data: updateData, error } = await supabase
      .from("restaurants")
      .update(entry)
      .eq("id", restaurant.id)
      .select();

    console.log("Update response:", { data: updateData, error });

    if (error) {
      console.error("Update error:", error);
      setSaveError("Failed to update restaurant.");
      return false;
    }

    if (updateData && Array.isArray(updateData) && updateData.length > 0) {
      console.log("Updated restaurant from response:", updateData[0]);
      console.log("Photo URL in update response:", updateData[0]?.photo_url);
    }

    // Reload restaurant data
    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurant.id)
      .single();

    if (restaurantData) {
      console.log("Reloaded restaurant data:", restaurantData);
      console.log("Photo URL in reloaded data:", restaurantData.photo_url);
      console.log(
        "FULL Photo URL (no truncation):",
        JSON.stringify(restaurantData.photo_url),
      );
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
        notes: source.notes,
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
    latestNote: string | null;
    orderCount: number;
    recommenderIds: string[];
  };

  const dishGroups: DishGroup[] = menuItems.map((mi) => {
    const orders = itemOrders.filter((o) => o.menu_item_id === mi.id);
    const latestOrder = orders[0] ?? null;
    const latestNote =
      orders.find((o) => (o.notes ?? "").trim().length > 0)?.notes ?? null;
    const recommenderIds = recommendations
      .filter((r) => r.menu_item_id === mi.id)
      .map((r) => r.user_id);
    return {
      menuItem: mi,
      orders,
      latestOrder,
      latestNote,
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

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

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

  return (
    <main className={`min-h-screen pb-24`}>
      {/* Sticky Compact Header - Shows on scroll */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-bg border-b-2 border-txt transition-transform duration-300 ${
          isScrolled ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ visibility: hasScrolled.current ? "visible" : "hidden" }}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link
              href="/"
              onClick={handleBackClick}
              className="text-txt no-underline shrink-0"
            >
              ←
            </Link>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl leading-tight truncate">
                {restaurant.name}
              </h2>
              <p className="text-xs text-txt2 truncate">
                {restaurant.cuisine} · {restaurant.neighborhood}
              </p>
            </div>
          </div>
        </div>
      </div>

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
        {(restaurant.photo_url || restaurant.storefront_photo_url) && (
          <div className="relative overflow-hidden aspect-[16/9] max-h-[320px]">
            <Image
              key={restaurant.photo_url || restaurant.storefront_photo_url}
              src={(restaurant.photo_url || restaurant.storefront_photo_url)!}
              alt={restaurant.name}
              fill
              sizes="100vw"
              priority
              className="object-cover"
              onError={(e) => {
                (
                  e.target as HTMLImageElement
                ).parentElement!.parentElement!.style.display = "none";
              }}
              unoptimized
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent pointer-events-none" />
          </div>
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
                      onClick={() => trackEvent("outbound_click", "google_maps")}
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
            (restaurant.occasions && restaurant.occasions.length > 0)) && (
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
            </div>
          )}
        </div>
      </div>

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
          key={`curator-${restaurant.id}-${ratingRefresh}`}
          restaurantId={restaurant.id}
          onChange={() => setRatingRefresh((n) => n + 1)}
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

      {/* Curator Take Section */}
      {restaurant.note && (
        <div className="p-6 border-b border-brd scroll-fade-in">
          <h2 className="text-2xs uppercase tracking-wide text-txt2 mb-3 font-medium">
            Why we love it
          </h2>
          <blockquote className="border-l-2 border-accent pl-3">
            <p className="text-base text-txt leading-relaxed italic">
              &ldquo;{restaurant.note}&rdquo;
            </p>
            {restaurant.added_by && (
              <footer className="text-2xs uppercase tracking-wide text-txt2 mt-2 not-italic">
                — {restaurant.added_by}
              </footer>
            )}
          </blockquote>
        </div>
      )}

      {/* What to order here — public-facing, recommended dishes only */}
      {publicDishes.length > 0 && (
        <div className="p-6 border-b border-brd scroll-fade-in">
          <h2 className="font-display text-xl mb-3 tracking-tight">
            What to order here
          </h2>
          <div className="space-y-3">
            {publicDishes.map((item) => {
              const isUsual = item.menuItem.id === usualBadgeDishId;
              return (
                <div
                  key={item.menuItem.id}
                  className="flex items-start gap-3 border-[1.5px] border-brd p-3"
                >
                  <div className="w-16 h-16 rounded-lg bg-bg2 border border-brd shrink-0 overflow-hidden">
                    {item.latestOrder?.photo_url ? (
                      <img
                        src={item.latestOrder.photo_url}
                        alt={item.menuItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-bg2 to-brd" />
                    )}
                  </div>
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
                    {item.latestNote && (
                      <p className="text-xs text-txt leading-snug italic mb-1">
                        &ldquo;{item.latestNote}&rdquo;
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons - Sticky at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg border-t-2 border-txt p-4 z-40">
        <div className="max-w-4xl mx-auto flex gap-3">
          {restaurant.google_maps_url ? (
            <a
              href={restaurant.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("outbound_click", "google_maps")}
              className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-center bg-accent text-white no-underline transition-opacity hover:opacity-90"
            >
              View on Maps
            </a>
          ) : (
            <button
              disabled
              className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-center bg-brd text-txt2 cursor-not-allowed"
            >
              View on Maps
            </button>
          )}
          {displayName && (
            <button
              onClick={() => setShowCheckInModal(true)}
              disabled={visitingId === restaurant.id || !canCheckIn}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium text-center transition-opacity ${
                visitingId === restaurant.id || !canCheckIn
                  ? "bg-txt2 text-white cursor-not-allowed opacity-50"
                  : "bg-accent2 text-white hover:opacity-90"
              }`}
            >
              {visitingId === restaurant.id
                ? "Checking in..."
                : !canCheckIn
                  ? "✓ Checked In"
                  : "Check in"}
            </button>
          )}
          {(isAdmin || isSuperuser) && (
            <button
              onClick={() => {
                setEditingOrder(null);
                setEditingMenuItem(null);
                setShowOrderModal(true);
              }}
              className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-center bg-accent text-white transition-opacity hover:opacity-90"
            >
              Log order
            </button>
          )}
          <button
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator
                  .share({
                    title: restaurant.name,
                    text: `Check out ${restaurant.name} on Visit SD`,
                    url: url,
                  })
                  .catch(() => {
                    navigator.clipboard.writeText(url);
                    toast("Link copied to clipboard", "success");
                  });
              } else {
                navigator.clipboard.writeText(url);
                toast("Link copied to clipboard", "success");
              }
            }}
            className="py-3 px-4 rounded-lg text-sm font-medium text-center bg-bg2 text-txt border-[1.5px] border-brd transition-colors hover:border-txt"
            aria-label="Share"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>
      </div>

      {/* Curator order history — read-only for non-admins */}
      {itemOrders.length > 0 && (
        <div className="p-6 border-t border-brd scroll-fade-in">
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
                const expanded = expandedDishId === group.menuItem.id;
                return (
                  <div
                    key={group.menuItem.id}
                    className="border-[1.5px] border-brd"
                  >
                    <button
                      onClick={() =>
                        setExpandedDishId(
                          expanded ? null : group.menuItem.id,
                        )
                      }
                      className="w-full text-left p-3 flex items-start justify-between gap-3 bg-transparent cursor-pointer"
                    >
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
                        <p className="text-2xs text-txt2 mb-1">
                          {group.orderCount} order
                          {group.orderCount !== 1 ? "s" : ""}
                        </p>
                        {group.latestNote && (
                          <p className="text-xs text-txt italic mb-2">
                            Latest: &ldquo;{group.latestNote}&rdquo;
                          </p>
                        )}
                      </div>
                      <Chevron open={expanded} className="text-txt2 mt-1" />
                    </button>
                    <div className="px-3 pb-3 -mt-1">
                      <MenuItemRecommendToggle
                        menuItemId={group.menuItem.id}
                        recommendedUserIds={group.recommenderIds}
                        recommenderNames={recommenderNames}
                        onChange={reloadOrders}
                      />
                    </div>
                    {expanded && (
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
                              <img
                                src={order.photo_url}
                                alt={group.menuItem.name}
                                className="w-16 h-16 object-cover border border-brd shrink-0"
                                onError={(e) => {
                                  (
                                    e.target as HTMLImageElement
                                  ).style.display = "none";
                                }}
                              />
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
                return (
                  <div key={order.id} className="border-[1.5px] border-brd p-3">
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
                        <img
                          src={order.photo_url}
                          alt={menuItem?.name}
                          className="w-16 h-16 object-cover border border-brd shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
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
              })}
            </div>
          )}
        </div>
      )}

      {/* Visit History */}
      <div className="p-6 border-t border-brd scroll-fade-in">
        <button
          onClick={() => setShowVisitHistory(!showVisitHistory)}
          className="w-full flex items-center justify-between gap-3 bg-transparent border-none cursor-pointer p-0 text-left"
        >
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <h2 className="font-display text-xl tracking-tight">
              Visit History
            </h2>
            <span className="text-sm text-txt2">
              {visits.length} {visits.length === 1 ? "visit" : "visits"}
              {restaurant.last_visited &&
                ` · last ${formatDate(restaurant.last_visited)}`}
            </span>
          </div>
          <Chevron open={showVisitHistory} className="text-txt2 shrink-0" />
        </button>

        {showVisitHistory && (
          <div className="mt-4">
            {visits.length === 0 ? (
              <div className="py-4 text-center">
                <IllustrationNoVisits className="mx-auto mb-1" />
                <p className="text-sm text-txt2">No visits recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-start justify-between gap-3 pb-3 border-b border-brd last:border-0"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-2 h-2 rounded-full bg-accent2 shrink-0 mt-1.5" />
                      <div className="flex-1">
                        <p className="text-sm text-txt font-medium">
                          {formatDate(visit.visited_at)} at{" "}
                          {formatTime(visit.visited_at)}
                        </p>
                        <p className="text-xs text-txt2">
                          by {visit.visited_by}
                        </p>
                        {visit.note && (
                          <p className="text-xs text-txt2 mt-1.5 italic">
                            &ldquo;{visit.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    {(isSuperuser ||
                      (isAdmin && visit.visited_by === displayName) ||
                      (isAdmin &&
                        !superuserNames.includes(visit.visited_by) &&
                        !adminNames.includes(visit.visited_by))) && (
                      <button
                        onClick={() => setShowDeleteVisitConfirm(visit.id)}
                        disabled={deletingVisitId === visit.id}
                        className="text-xs text-txt2 hover:text-error transition-colors shrink-0"
                      >
                        {deletingVisitId === visit.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Metadata */}
      {(restaurant.added_by || restaurant.date_added) && (
        <div className="px-6 py-4 border-t border-brd">
          <p className="text-2xs text-txt2 opacity-70">
            {restaurant.added_by && <>Added by {restaurant.added_by}</>}
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
          isAdmin={isAdmin || isSuperuser}
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
    </main>
  );
}
