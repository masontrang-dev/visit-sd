"use client";

import { useEffect, useState, useRef } from "react";
import {
  supabase,
  type Restaurant,
  type RestaurantVisit,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import RestaurantGrid from "@/components/RestaurantGrid";
import FilterBar, {
  type ImageDisplayMode,
  type VisibilityFilter,
} from "@/components/FilterBar";
import AddModal from "@/components/AddModal";
import OrderModal from "@/components/OrderModal";
import MapView from "@/components/MapView";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";
import AdminViewToggle from "@/components/AdminViewToggle";
import ActivityFeed from "@/components/ActivityFeed";

function StatPill({
  value,
  label,
  duration = 800,
  countFromZero = false,
}: {
  value: number;
  label: string;
  duration?: number;
  countFromZero?: boolean;
}) {
  const [display, setDisplay] = useState(countFromZero ? 0 : value);
  const prevRef = useRef(countFromZero ? 0 : value);
  const initialRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      if (countFromZero && value > 0) {
        timerRef.current = setTimeout(() => {
          const start = performance.now();
          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(value * eased));
            if (progress < 1) requestAnimationFrame(tick);
            else prevRef.current = value;
          }
          requestAnimationFrame(tick);
        }, 600);
        return;
      }
      setDisplay(value);
      prevRef.current = value;
      return;
    }
    if (value === prevRef.current) return;

    const start = performance.now();
    const from = prevRef.current;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (value - from) * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else prevRef.current = value;
    }
    requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, duration, countFromZero]);

  return <>{`${display} ${label}`}</>;
}

export default function AdminPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCuisines, setActiveCuisines] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [orderingRestaurant, setOrderingRestaurant] =
    useState<Restaurant | null>(null);
  const [opError, setOpError] = useState("");
  const [mustTryFilter, setMustTryFilter] = useState(false);
  const [activeNeighborhoods, setActiveNeighborhoods] = useState<string[]>([]);
  const [visits, setVisits] = useState<Record<number, RestaurantVisit[]>>({});
  const [visitingId, setVisitingId] = useState<number | null>(null);
  const [imageDisplayMode, setImageDisplayMode] = useState<ImageDisplayMode>(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("visitsd-image-display");
        if (saved === "full" || saved === "compact" || saved === "none") {
          return saved;
        }
      }
      return "full";
    },
  );
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [activePrices, setActivePrices] = useState<string[]>([]);
  const [activeVisibility, setActiveVisibility] =
    useState<VisibilityFilter>("public");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadData();
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, authLoading]);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .order("cuisine")
      .order("name");
    setRestaurants(data ?? []);
    await loadVisits();
    setLoading(false);
  }

  async function loadVisits() {
    const { data } = await supabase
      .from("restaurant_visits")
      .select("*")
      .order("visited_at", { ascending: false });
    if (data) {
      const grouped: Record<number, RestaurantVisit[]> = {};
      data.forEach((visit: RestaurantVisit) => {
        if (!grouped[visit.restaurant_id]) grouped[visit.restaurant_id] = [];
        grouped[visit.restaurant_id].push(visit);
      });
      setVisits(grouped);
    }
  }

  async function handleAdd(
    entry: Omit<Restaurant, "id" | "created_at">,
  ): Promise<boolean> {
    setOpError("");
    console.log("INSERT payload:", JSON.stringify(entry, null, 2));
    console.log("Photo URL being saved:", entry.photo_url);
    const { error, data } = await supabase
      .from("restaurants")
      .insert([entry])
      .select();
    console.log("INSERT response:", { error, data });
    if (error) {
      console.error("Insert error:", error);
      setOpError("Failed to add restaurant.");
      return false;
    }
    loadData();
    return true;
  }

  async function handleEdit(
    entry: Omit<Restaurant, "id" | "created_at">,
  ): Promise<boolean> {
    if (!editingRestaurant) return false;
    setOpError("");
    console.log("UPDATE payload:", JSON.stringify(entry, null, 2));
    console.log("Photo URL being updated:", entry.photo_url);
    const { error } = await supabase
      .from("restaurants")
      .update(entry)
      .eq("id", editingRestaurant.id);
    if (error) {
      console.error("Update error:", error);
      setOpError("Failed to update restaurant.");
      return false;
    }
    loadData();
    return true;
  }

  function handleOrder(restaurant: Restaurant) {
    setOrderingRestaurant(restaurant);
    setShowOrderModal(true);
  }

  function handleImageDisplayModeChange(mode: ImageDisplayMode) {
    setImageDisplayMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("visitsd-image-display", mode);
    }
  }

  const cuisines = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const neighborhoods = Array.from(
    new Set(restaurants.map((r) => r.neighborhood).filter(Boolean)),
  ).sort();
  const filtered = restaurants.filter((r) => {
    if (activeVisibility !== "all") {
      if ((r.visibility ?? "public") !== activeVisibility) return false;
    }
    if (activeCuisines.length > 0 && !activeCuisines.includes(r.cuisine || ""))
      return false;
    if (
      activeNeighborhoods.length > 0 &&
      !activeNeighborhoods.includes(r.neighborhood || "")
    )
      return false;
    if (mustTryFilter && !r.must_try) return false;
    if (activePrices.length > 0 && !activePrices.includes(r.price || ""))
      return false;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      const searchable = [r.name, r.cuisine, r.neighborhood, r.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-txt2 text-sm">Loading...</p>
      </main>
    );
  }

  if (!isAdmin) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-txt2 text-sm">Redirecting...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="relative pt-10 px-6 pb-6 border-b-2 border-txt">
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <ThemeToggle />
            <ActivityFeed />
            <AdminButton />
          </div>
          <AdminViewToggle />
        </div>
        <p className="text-xs tracking-wide uppercase text-accent font-medium mb-1.5">
          Admin · San Diego
        </p>
        <h1 className="font-display text-[clamp(48px,10vw,80px)] leading-[0.88]">
          MANAGE
          <br />
          <span className="text-accent">SPOTS</span>
        </h1>
        <div className="flex gap-2.5 mt-4 items-center">
          {(
            [
              [restaurants.length, "spots"],
              [cuisines.length, "cuisines"],
              [neighborhoods.length, "areas"],
            ] as const
          ).map(([count, label], i) => (
            <span
              key={label}
              className={`text-xs font-medium px-3 py-1 rounded-pill border-[1.5px] border-txt text-txt ${mounted ? "animate-fade-up" : "opacity-0"}`}
              style={
                mounted ? { animationDelay: `${300 + i * 100}ms` } : undefined
              }
            >
              <StatPill value={count} label={label} countFromZero={true} />
            </span>
          ))}
        </div>
      </header>

      <FilterBar
        cuisines={cuisines}
        activeCuisines={activeCuisines}
        onCuisineChange={setActiveCuisines}
        neighborhoods={neighborhoods}
        activeNeighborhoods={activeNeighborhoods}
        onNeighborhoodChange={setActiveNeighborhoods}
        onAdd={() => {
          setEditingRestaurant(null);
          setShowModal(true);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        mustTryFilter={mustTryFilter}
        onMustTryFilterChange={setMustTryFilter}
        activePrices={activePrices}
        onPriceChange={setActivePrices}
        isAdminView
        activeVisibility={activeVisibility}
        onVisibilityChange={setActiveVisibility}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        imageDisplayMode={imageDisplayMode}
        onImageDisplayModeChange={handleImageDisplayModeChange}
      />

      {opError && <p className="py-3 px-6 text-error text-sm">{opError}</p>}

      {loading ? (
        <p className="py-12 px-6 text-txt2">Loading...</p>
      ) : viewMode === "map" ? (
        <MapView restaurants={filtered} allRestaurants={restaurants} />
      ) : (
        <RestaurantGrid
          restaurants={filtered}
          grouped={false}
          onEdit={(r) => {
            setEditingRestaurant(r);
            setShowModal(true);
          }}
          onOrder={handleOrder}
          visitingId={visitingId}
          visits={visits}
          imageDisplayMode={imageDisplayMode}
        />
      )}

      <footer className="p-6 flex justify-end border-t-2 border-txt">
        <span className="text-xs font-medium text-txt2 opacity-50 tracking-tight font-body">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
      </footer>

      {showModal && (
        <AddModal
          onSave={editingRestaurant ? handleEdit : handleAdd}
          onClose={() => {
            setShowModal(false);
            setEditingRestaurant(null);
          }}
          editData={editingRestaurant}
          existingCuisines={cuisines}
        />
      )}

      {/* Order Modal */}
      {showOrderModal && orderingRestaurant && (
        <OrderModal
          restaurantId={orderingRestaurant.id}
          onClose={() => {
            setShowOrderModal(false);
            setOrderingRestaurant(null);
          }}
          onSaved={() => {
            setShowOrderModal(false);
            setOrderingRestaurant(null);
          }}
        />
      )}
    </main>
  );
}
