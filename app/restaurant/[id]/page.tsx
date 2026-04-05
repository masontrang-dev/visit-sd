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
  type RatingHistory,
} from "@/lib/supabase";
import IllustrationNoVisits from "@/components/IllustrationNoVisits";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import AddModal from "@/components/AddModal";
import OrderModal from "@/components/OrderModal";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";
import Image from "next/image";

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
  const { isAdmin, username } = useAuth();
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
  const [togglingRecommended, setTogglingRecommended] = useState<number | null>(
    null,
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const hasScrolled = useRef(false);

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

  useEffect(() => {
    async function load() {
      const resolvedParams = await params;
      const restaurantId = parseInt(resolvedParams.id);
      if (isNaN(restaurantId)) {
        setError("Invalid restaurant ID");
        setLoading(false);
        return;
      }

      // Fetch restaurant data first for fast initial render
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
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
            .eq("restaurant_id", restaurantId)
            .order("visited_at", { ascending: false }),
          supabase
            .from("menu_items")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("name"),
          supabase
            .from("item_orders")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("ordered_at", { ascending: false }),
          supabase.from("restaurants").select("cuisine"),
        ]);

      setVisits(visitsResult.data ?? []);
      setMenuItems(menuResult.data ?? []);
      setItemOrders(ordersResult.data ?? []);

      if (cuisinesResult.data) {
        const uniqueCuisines = Array.from(
          new Set(cuisinesResult.data.map((r) => r.cuisine).filter(Boolean)),
        ).sort();
        setCuisines(uniqueCuisines as string[]);
      }
    }
    load();
  }, [params]);

  async function handleMarkVisited() {
    if (!restaurant || !username) return;

    const visitedBy = username;

    setVisitingId(restaurant.id);

    const { error: insertError } = await supabase
      .from("restaurant_visits")
      .insert([{ restaurant_id: restaurant.id, visited_by: visitedBy }]);

    if (insertError) {
      toast("Failed to mark as visited", "error");
      setVisitingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ last_visited: new Date().toISOString() })
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
    setMenuItems(menuData ?? []);

    const { data: ordersData } = await supabase
      .from("item_orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("ordered_at", { ascending: false });
    setItemOrders(ordersData ?? []);
  }

  async function toggleRecommended(menuItemId: number, currentValue: boolean) {
    setTogglingRecommended(menuItemId);
    const { error } = await supabase
      .from("menu_items")
      .update({ is_recommended: !currentValue })
      .eq("id", menuItemId);

    if (error) {
      toast("Failed to update recommendation", "error");
    } else {
      // Reload menu items to reflect change
      await reloadOrders();
      toast(
        !currentValue ? "Added to recommended" : "Removed from recommended",
        "success",
      );
    }
    setTogglingRecommended(null);
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
      // Could show an error state, but for now just reset
      setDeletingOrderId(null);
    } else {
      await reloadOrders();
    }
    setDeletingOrderId(null);
  }

  // Compute highlighted menu items (is_recommended or has orders)
  const highlightedItems = menuItems
    .filter((mi) => mi.is_recommended)
    .map((mi) => {
      const orders = itemOrders.filter((o) => o.menu_item_id === mi.id);
      const avgRating =
        orders.length > 0
          ? orders.reduce((sum, o) => sum + (o.rating ?? 0), 0) /
            orders.filter((o) => o.rating !== null).length
          : null;
      const latestOrder = orders[0] ?? null;
      return {
        menuItem: mi,
        orders,
        avgRating,
        latestOrder,
        orderCount: orders.length,
      };
    });

  // All items with orders (for showing even non-recommended items with history)
  const itemsWithOrders = menuItems
    .map((mi) => {
      const orders = itemOrders.filter((o) => o.menu_item_id === mi.id);
      const avgRating =
        orders.filter((o) => o.rating !== null).length > 0
          ? orders.reduce((sum, o) => sum + (o.rating ?? 0), 0) /
            orders.filter((o) => o.rating !== null).length
          : null;
      const latestOrder = orders[0] ?? null;
      return {
        menuItem: mi,
        orders,
        avgRating,
        latestOrder,
        orderCount: orders.length,
      };
    })
    .filter((item) => item.orderCount > 0)
    .sort((a, b) => {
      // Sort by rating desc, then order count desc
      if ((b.avgRating ?? 0) !== (a.avgRating ?? 0))
        return (b.avgRating ?? 0) - (a.avgRating ?? 0);
      return b.orderCount - a.orderCount;
    });

  // Usual order for boba shops (check if any menu items have category 'boba')
  const hasBobaItems = menuItems.some((mi) => mi.category === "boba");
  const usualOrder =
    hasBobaItems && itemsWithOrders.length > 0 ? itemsWithOrders[0] : null;

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

      {/* Restaurant Header */}
      <div className="border-b-2 border-txt">
        {(restaurant.photo_url || restaurant.storefront_photo_url) && (
          <div className="relative overflow-hidden aspect-[16/9] max-h-[400px]">
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
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <p className="text-xs tracking-wide uppercase font-medium text-accent">
              {restaurant.cuisine}
            </p>
            {restaurant.hours_text && (
              <span className="text-2xs font-medium px-2 py-0.5 rounded-pill bg-[#EAF3DE] text-[#27500A] tracking-tight">
                {restaurant.hours_text}
              </span>
            )}
          </div>
          <h1 className="font-display text-[clamp(48px,8vw,72px)] leading-[0.9] tracking-tight mb-3">
            {restaurant.name}
          </h1>
          <div className="flex items-center gap-3 flex-wrap text-base text-txt2 mb-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-accent2 shrink-0" />
              {restaurant.neighborhood}
            </span>
            <span className="text-brd">·</span>
            <span className="font-medium">{restaurant.price}</span>
          </div>
          {(restaurant.must_try ||
            (restaurant.occasions && restaurant.occasions.length > 0)) && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
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
        {restaurant.google_rating && (
          <div className="flex-1 text-center py-4 px-3">
            <div className="font-display text-[clamp(32px,6vw,40px)] leading-none text-txt mb-1">
              {restaurant.google_rating.toFixed(1)}
            </div>
            <div className="text-2xs uppercase tracking-wide text-txt2 mb-0.5">
              Google rating
            </div>
            {restaurant.google_review_count && (
              <div className="text-2xs text-txt2 opacity-60">
                {restaurant.google_review_count.toLocaleString()} reviews
              </div>
            )}
          </div>
        )}
        {restaurant.google_rating && <div className="w-px bg-brd" />}
        <div className="flex-1 text-center py-4 px-3">
          <div className="font-display text-[clamp(32px,6vw,40px)] leading-none text-accent mb-1">
            {restaurant.my_rating ? `${restaurant.my_rating}/5` : "—"}
          </div>
          <div className="text-2xs uppercase tracking-wide text-txt2 mb-0.5">
            My rating
          </div>
          <div className="text-2xs text-txt2 opacity-60">
            {visits.length} visit{visits.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="w-px bg-brd" />
        <div className="flex-1 text-center py-4 px-3">
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

      {/* My Take Section */}
      {restaurant.note && (
        <div className="p-6 border-b border-brd scroll-fade-in">
          <h2 className="text-2xs uppercase tracking-wide text-txt2 mb-3 font-medium">
            My take
          </h2>
          <p className="text-base text-txt leading-relaxed italic border-l-2 border-accent pl-3">
            &ldquo;{restaurant.note}&rdquo;
          </p>
        </div>
      )}

      {/* Usual Order — boba shops only */}
      {usualOrder && (
        <div className="p-6 border-b border-brd bg-bg2 scroll-fade-in">
          <h2 className="font-display text-xl mb-3 tracking-tight">
            Usual Order
          </h2>
          <div className="border-[1.5px] border-txt p-4">
            <p className="font-display text-xl leading-tight mb-1">
              {usualOrder.menuItem.name}
            </p>
            {usualOrder.latestOrder?.drink_details && (
              <p className="text-sm text-txt2 mb-2">
                {formatDrinkSummary(
                  usualOrder.latestOrder.drink_details as DrinkDetails,
                )}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-txt2">
              {usualOrder.avgRating !== null &&
                !isNaN(usualOrder.avgRating) && (
                  <span className="text-accent font-medium">
                    ★ {usualOrder.avgRating.toFixed(1)}
                  </span>
                )}
              <span>
                ordered {usualOrder.orderCount} time
                {usualOrder.orderCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items I've Tried */}
      {(highlightedItems.length > 0 || itemsWithOrders.length > 0) && (
        <div className="p-6 border-b border-brd scroll-fade-in">
          <h2 className="text-2xs uppercase tracking-wide text-txt2 mb-3 font-medium">
            Menu items I&rsquo;ve tried
          </h2>
          <div className="space-y-0">
            {(highlightedItems.length > 0
              ? highlightedItems
              : itemsWithOrders
            ).map((item, idx, arr) => (
              <div
                key={item.menuItem.id}
                className={`flex items-center gap-3 py-3 ${idx < arr.length - 1 ? "border-b border-brd/40" : ""}`}
              >
                <div className="w-11 h-11 rounded-lg bg-bg2 border border-brd shrink-0 overflow-hidden">
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
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-txt">
                      {item.menuItem.name}
                    </p>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRecommended(
                            item.menuItem.id,
                            item.menuItem.is_recommended,
                          );
                        }}
                        disabled={togglingRecommended === item.menuItem.id}
                        className={`text-2xs font-medium px-2 py-0.5 rounded-pill tracking-tight uppercase shrink-0 border-[1.5px] transition-all duration-150 ${
                          item.menuItem.is_recommended
                            ? "bg-accent text-white border-accent"
                            : "bg-transparent text-txt2 border-brd hover:border-accent hover:text-accent"
                        }`}
                      >
                        {togglingRecommended === item.menuItem.id
                          ? "..."
                          : item.menuItem.is_recommended
                            ? "★ Remove"
                            : "☆ Add"}
                      </button>
                    )}
                  </div>
                  <p className="text-2xs text-txt2 mb-1">
                    Ordered {item.orderCount} time
                    {item.orderCount !== 1 ? "s" : ""}
                    {item.latestOrder?.drink_details &&
                      ` · ${formatDrinkSummary(item.latestOrder.drink_details as DrinkDetails)}`}
                  </p>
                  {item.avgRating !== null && !isNaN(item.avgRating) && (
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div
                          key={star}
                          className={`w-2.5 h-2.5 ${
                            star <= Math.round(item.avgRating!)
                              ? "bg-accent"
                              : "bg-brd"
                          }`}
                          style={{
                            clipPath:
                              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visit History */}
      <div className="p-6 border-b border-brd scroll-fade-in">
        <button
          onClick={() => setShowVisitHistory(!showVisitHistory)}
          className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer p-0 mb-3 text-left"
        >
          <h2 className="font-display text-xl tracking-tight">Visit History</h2>
          <Chevron open={showVisitHistory} className="text-txt2" />
        </button>

        {!showVisitHistory && (
          <div className="space-y-1.5">
            <p className="text-sm text-txt2">
              <span className="font-medium">Total visits:</span> {visits.length}
            </p>
            {restaurant.last_visited && (
              <p className="text-sm text-txt2">
                <span className="font-medium">Last visited:</span>{" "}
                {formatDate(restaurant.last_visited)}
              </p>
            )}
          </div>
        )}

        {showVisitHistory && (
          <div>
            <div className="mb-3 space-y-1.5">
              <p className="text-sm text-txt2">
                <span className="font-medium">Total visits:</span>{" "}
                {visits.length}
              </p>
              {restaurant.last_visited && (
                <p className="text-sm text-txt2">
                  <span className="font-medium">Last visited:</span>{" "}
                  {formatDate(restaurant.last_visited)}
                </p>
              )}
            </div>
            {visits.length === 0 ? (
              <div className="py-4 text-center">
                <IllustrationNoVisits className="mx-auto mb-1" />
                <p className="text-sm text-txt2">No visits recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center gap-3 pb-3 border-b border-brd last:border-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-accent2 shrink-0" />
                    <div>
                      <p className="text-sm text-txt font-medium">
                        {formatDate(visit.visited_at)} at{" "}
                        {formatTime(visit.visited_at)}
                      </p>
                      <p className="text-xs text-txt2">by {visit.visited_by}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Address */}
      {restaurant.address && (
        <div className="p-6 border-b border-brd scroll-fade-in">
          <h2 className="font-display text-xl mb-3 tracking-tight">Address</h2>
          <p className="text-sm text-txt2">{restaurant.address}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="p-6 border-b border-brd scroll-fade-in">
        <h2 className="font-display text-xl mb-3 tracking-tight">Details</h2>
        <div className="space-y-2">
          {restaurant.added_by && (
            <p className="text-sm text-txt2">
              <span className="font-medium">Added by:</span>{" "}
              {restaurant.added_by}
            </p>
          )}
          {restaurant.date_added && (
            <p className="text-sm text-txt2">
              <span className="font-medium">Date added:</span>{" "}
              {formatDate(restaurant.date_added)}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons - View on Maps & Share - Sticky at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg border-t-2 border-txt p-4 z-40">
        <div className="max-w-4xl mx-auto flex gap-3">
          {restaurant.google_maps_url ? (
            <a
              href={restaurant.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
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
            className="flex-1 py-3 px-4 rounded-lg text-sm font-medium text-center bg-bg2 text-txt border-[1.5px] border-brd transition-colors hover:border-txt"
          >
            Share this spot
          </button>
        </div>
      </div>

      {/* Order History - Admin Only */}
      {isAdmin && itemOrders.length > 0 && (
        <div className="p-6 border-t border-brd scroll-fade-in">
          <h2 className="text-2xs uppercase tracking-wide text-txt2 mb-3 font-medium">
            Full order history (Admin)
          </h2>
          <div className="space-y-3">
            {itemOrders.map((order) => {
              const menuItem = menuItems.find(
                (mi) => mi.id === order.menu_item_id,
              );
              return (
                <div key={order.id} className="border-[1.5px] border-brd p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-display text-lg leading-tight">
                          {menuItem?.name || "Unknown item"}
                        </p>
                        {order.rating && (
                          <span className="text-accent font-medium text-sm">
                            ★ {order.rating}
                          </span>
                        )}
                        {menuItem?.category && (
                          <span className="text-xs text-txt2 capitalize">
                            {menuItem.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-txt2 mb-2">
                        {formatDate(order.ordered_at)}
                      </p>
                      {order.notes && (
                        <p className="text-sm text-txt leading-relaxed italic mb-2">
                          {order.notes}
                        </p>
                      )}
                      {order.drink_details && (
                        <p className="text-xs text-txt2">
                          {formatDrinkSummary(
                            order.drink_details as DrinkDetails,
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {order.photo_url && (
                        <img
                          src={order.photo_url}
                          alt={menuItem?.name}
                          className="w-16 h-16 object-cover border border-brd"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      )}
                    </div>
                  </div>
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
                      {deletingOrderId === order.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* Floating Action Bar */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 right-0 bg-bg border-t-2 border-txt p-3 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-txt2 mr-3">Admin:</span>
              <button
                onClick={handleMarkVisited}
                disabled={visitingId === restaurant.id}
                className={`btn-base text-sm py-2 px-3 rounded-pill border-[1.5px] ${
                  visitingId === restaurant.id
                    ? "bg-transparent border-brd text-txt2"
                    : "bg-accent2 text-white border-accent2"
                }`}
              >
                {visitingId === restaurant.id ? "Marking..." : "✓ Visited"}
              </button>
              <button
                onClick={() => {
                  setEditingOrder(null);
                  setEditingMenuItem(null);
                  setShowOrderModal(true);
                }}
                className="btn-primary btn-pill !py-2 !px-3"
              >
                + Order
              </button>
              <button
                onClick={handleEdit}
                className="btn-outline btn-pill !py-2 !px-3 !border-txt !text-txt"
              >
                Edit
              </button>
            </div>
            {saveError && <p className="text-error text-xs">{saveError}</p>}
          </div>
        </div>
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
    </main>
  );
}
