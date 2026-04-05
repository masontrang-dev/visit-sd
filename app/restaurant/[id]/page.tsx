"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  type Restaurant,
  type RestaurantVisit,
  type MenuItem,
  type ItemOrder,
  type DrinkDetails,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import AddModal from "@/components/AddModal";
import OrderModal from "@/components/OrderModal";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export default function RestaurantDetailPage({ params }: Props) {
  const router = useRouter();
  const { isAdmin, username } = useAuth();
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

  useEffect(() => {
    async function load() {
      const resolvedParams = await params;
      const restaurantId = parseInt(resolvedParams.id);
      if (isNaN(restaurantId)) {
        setError("Invalid restaurant ID");
        setLoading(false);
        return;
      }

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

      const { data: visitsData } = await supabase
        .from("restaurant_visits")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("visited_at", { ascending: false });

      setRestaurant(restaurantData);
      setVisits(visitsData ?? []);

      // Load menu items and orders
      const { data: menuData } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");
      setMenuItems(menuData ?? []);

      const { data: ordersData } = await supabase
        .from("item_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("ordered_at", { ascending: false });
      setItemOrders(ordersData ?? []);

      setLoading(false);

      // Load all cuisines for the edit modal
      const { data: allRestaurants } = await supabase
        .from("restaurants")
        .select("cuisine");

      if (allRestaurants) {
        const uniqueCuisines = Array.from(
          new Set(allRestaurants.map((r) => r.cuisine).filter(Boolean)),
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
      alert("Failed to mark as visited");
      setVisitingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ last_visited: new Date().toISOString() })
      .eq("id", restaurant.id);

    if (updateError) {
      alert("Failed to update last visited date");
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
      alert("Failed to delete restaurant");
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
      <main className="min-h-screen p-6">
        <p className="text-txt2">Loading...</p>
      </main>
    );
  }

  if (error || !restaurant) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-error mb-4">{error || "Restaurant not found"}</p>
        <Link
          href={isAdmin ? "/admin" : "/"}
          className="text-accent2 font-medium text-sm no-underline"
        >
          ← Back to list
        </Link>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${isAdmin ? "pb-20" : ""}`}>
      {/* Breadcrumb */}
      <div className="p-6 pb-4 border-b border-brd">
        <Link
          href={isAdmin ? "/admin" : "/"}
          className="text-xs tracking-wide uppercase font-medium text-accent2 no-underline"
        >
          ← Back to list
        </Link>
      </div>

      {/* Restaurant Header */}
      <div className="border-b-2 border-txt">
        {restaurant.photo_url && (
          <img
            key={restaurant.photo_url}
            src={restaurant.photo_url}
            alt={restaurant.name}
            className="w-full h-[300px] object-cover block"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs tracking-wide uppercase font-medium text-accent">
              {restaurant.cuisine}
            </p>
            {restaurant.must_try && (
              <span className="text-2xs font-medium px-2 py-0.5 rounded-pill bg-accent text-white tracking-tight uppercase">
                ★ Must-Try
              </span>
            )}
          </div>
          <h1 className="font-display text-[clamp(48px,8vw,72px)] leading-[0.9] tracking-tight mb-3">
            {restaurant.name}
          </h1>
          <p className="text-base text-txt2 flex items-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent2 shrink-0" />
            {restaurant.neighborhood}
          </p>
          <p className="text-base font-medium text-txt2 mb-4">
            {restaurant.price}
          </p>
          <div className="flex gap-2 flex-wrap items-center">
            {restaurant.google_maps_url && (
              <a
                href={restaurant.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium py-2 px-4 rounded-pill border-[1.5px] border-accent2 text-accent2 no-underline transition-all duration-100 hover:bg-accent2 hover:text-white"
              >
                View on Google Maps ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {restaurant.note && (
        <div className="p-6 border-b border-brd bg-bg2">
          <h2 className="font-display text-xl mb-3 tracking-tight">
            Notes
          </h2>
          <p className="text-base text-txt leading-relaxed italic border-l-[3px] border-accent pl-4">
            {restaurant.note}
          </p>
        </div>
      )}

      {/* Address */}
      {restaurant.address && (
        <div className="p-6 border-b border-brd">
          <h2 className="font-display text-xl mb-3 tracking-tight">
            Address
          </h2>
          <p className="text-sm text-txt2">{restaurant.address}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="p-6 border-b border-brd">
        <h2 className="font-display text-xl mb-3 tracking-tight">
          Details
        </h2>
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

      {/* Visit History */}
      <div className="p-6 border-b border-brd">
        <button
          onClick={() => setShowVisitHistory(!showVisitHistory)}
          className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer p-0 mb-3 text-left"
        >
          <h2 className="font-display text-xl tracking-tight">
            Visit History
          </h2>
          <span className="text-xl text-txt2">
            {showVisitHistory ? "▾" : "▸"}
          </span>
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
              <p className="text-txt2 text-sm">No visits recorded yet</p>
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
                      <p className="text-xs text-txt2">
                        by {visit.visited_by}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usual Order — boba shops only */}
      {usualOrder && (
        <div className="p-6 border-b border-brd bg-bg2">
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

      {/* Menu Highlights */}
      {(highlightedItems.length > 0 || itemsWithOrders.length > 0) && (
        <div className="p-6 border-b border-brd">
          <h2 className="font-display text-xl mb-3 tracking-tight">
            Menu Highlights
          </h2>
          <div className="space-y-3">
            {(highlightedItems.length > 0
              ? highlightedItems
              : itemsWithOrders
            ).map((item) => (
              <div key={item.menuItem.id}>
                <button
                  onClick={() =>
                    setExpandedItem(
                      expandedItem === item.menuItem.id
                        ? null
                        : item.menuItem.id,
                    )
                  }
                  className="w-full text-left bg-transparent border-none cursor-pointer p-0"
                >
                  <div className="flex items-start gap-3">
                    {item.latestOrder?.photo_url && (
                      <img
                        src={item.latestOrder.photo_url}
                        alt={item.menuItem.name}
                        className="w-16 h-16 object-cover border border-brd shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-lg leading-tight">
                          {item.menuItem.name}
                        </p>
                        {item.menuItem.is_recommended && (
                          <span className="text-2xs font-medium px-1.5 py-0.5 rounded-pill bg-accent text-white tracking-tight uppercase shrink-0">
                            ★
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-txt2">
                        {item.avgRating !== null && !isNaN(item.avgRating) && (
                          <span className="text-accent font-medium">
                            ★ {item.avgRating.toFixed(1)}
                          </span>
                        )}
                        <span>
                          ordered {item.orderCount} time
                          {item.orderCount !== 1 ? "s" : ""}
                        </span>
                        {item.menuItem.category && (
                          <span className="capitalize">
                            {item.menuItem.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-base text-txt2 shrink-0 mt-1">
                      {expandedItem === item.menuItem.id ? "▾" : "▸"}
                    </span>
                  </div>
                </button>

                {expandedItem === item.menuItem.id && item.latestOrder && (
                  <div className="mt-2 ml-0 pl-4 border-l-[3px] border-accent">
                    {item.latestOrder.notes && (
                      <p className="text-sm text-txt leading-relaxed italic mb-2">
                        {item.latestOrder.notes}
                      </p>
                    )}
                    {item.latestOrder.drink_details && (
                      <p className="text-xs text-txt2 mb-1">
                        {formatDrinkSummary(
                          item.latestOrder.drink_details as DrinkDetails,
                        )}
                      </p>
                    )}
                    <p className="text-xs text-txt2">
                      Last ordered: {formatDate(item.latestOrder.ordered_at)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order History */}
      {itemOrders.length > 0 && (
        <div className="p-6 border-b border-brd">
          <h2 className="font-display text-xl mb-3 tracking-tight">
            Order History
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
            {saveError && (
              <p className="text-error text-xs">{saveError}</p>
            )}
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
