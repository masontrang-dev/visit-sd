"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  type MenuItem,
  type ItemOrder,
  type Restaurant,
  type DrinkDetails,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import AdminButton from "@/components/AdminButton";
import ThemeToggle from "@/components/ThemeToggle";

type ShopSummary = {
  restaurant: Restaurant;
  totalVisits: number;
  lastVisit: string | null;
  mostOrderedDrink: string | null;
  commonCustomization: string | null;
  daysSinceLastVisit: number;
};

type BobaStats = {
  totalCheckins: number;
  totalThisMonth: number;
  totalThisYear: number;
  uniqueShops: number;
  uniqueDrinks: number;
  favoriteShop: string | null;
};

const SWEETNESS_LABELS: Record<number, string> = {
  0: "No sugar",
  25: "25%",
  50: "50%",
  75: "75%",
  100: "100%",
};

const ICE_LABELS: Record<number, string> = {
  0: "No ice",
  25: "Light ice",
  40: "Less ice",
  50: "Regular",
  100: "Extra ice",
};

export default function BobaDashboardPage() {
  const { isSuperuser, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BobaStats>({
    totalCheckins: 0,
    totalThisMonth: 0,
    totalThisYear: 0,
    uniqueShops: 0,
    uniqueDrinks: 0,
    favoriteShop: null,
  });
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [avgSweetness, setAvgSweetness] = useState<number | null>(null);
  const [avgIce, setAvgIce] = useState<number | null>(null);
  const [topToppings, setTopToppings] = useState<
    { name: string; count: number }[]
  >([]);
  const [hotVsIced, setHotVsIced] = useState<{ hot: number; iced: number }>({
    hot: 0,
    iced: 0,
  });
  const [sweetnessDistribution, setSweetnessDistribution] = useState<
    { range: string; count: number; percentage: number }[]
  >([]);
  const [recentVisits, setRecentVisits] = useState<ItemOrder[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (!authLoading && isSuperuser) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperuser, authLoading]);

  async function loadDashboard() {
    setLoading(true);

    // Load all menu items with category 'boba'
    const { data: bobaMenuItems } = (await supabase
      .from("menu_items")
      .select("*")
      .eq("category", "boba")
      .order("name")) as { data: MenuItem[] | null };

    if (!bobaMenuItems || bobaMenuItems.length === 0) {
      setLoading(false);
      return;
    }

    // Get unique restaurant IDs that have boba menu items
    const bobaRestaurantIds = Array.from(
      new Set(bobaMenuItems.map((mi) => mi.restaurant_id)),
    );

    // Load those restaurants
    const { data: bobaRestaurants } = (await supabase
      .from("restaurants")
      .select("*")
      .in("id", bobaRestaurantIds)
      .order("name")) as { data: Restaurant[] | null };

    // Load all orders for restaurants that have boba menu items
    const { data: allOrders } = await supabase
      .from("item_orders")
      .select("*")
      .in("restaurant_id", bobaRestaurantIds)
      .order("ordered_at", { ascending: false });

    const orders: ItemOrder[] = allOrders ?? [];

    // Load all menu items for those restaurants
    const { data: allMenuItems } = await supabase
      .from("menu_items")
      .select("*")
      .in("restaurant_id", bobaRestaurantIds);

    const items: MenuItem[] = allMenuItems ?? [];
    setMenuItems(items);

    // Summary stats
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;

    const thisMonthOrders = orders.filter((o) => o.ordered_at >= monthStart);
    const thisYearOrders = orders.filter((o) => o.ordered_at >= yearStart);

    const uniqueShopIds = new Set(orders.map((o) => o.restaurant_id));
    const uniqueDrinkIds = new Set(orders.map((o) => o.menu_item_id));

    // Favorite shop by order count
    const shopCounts: Record<number, number> = {};
    orders.forEach((o) => {
      shopCounts[o.restaurant_id] = (shopCounts[o.restaurant_id] || 0) + 1;
    });
    const favShopId = Object.entries(shopCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const favShop = favShopId
      ? ((bobaRestaurants ?? []).find((r) => r.id === parseInt(favShopId))
          ?.name ?? null)
      : null;

    setStats({
      totalCheckins: orders.length,
      totalThisMonth: thisMonthOrders.length,
      totalThisYear: thisYearOrders.length,
      uniqueShops: uniqueShopIds.size,
      uniqueDrinks: uniqueDrinkIds.size,
      favoriteShop: favShop,
    });

    // Per-shop breakdown
    const shopSummaries: ShopSummary[] = (bobaRestaurants ?? []).map((r) => {
      const shopOrders = orders.filter((o) => o.restaurant_id === r.id);
      const shopItems = items.filter((mi) => mi.restaurant_id === r.id);

      // Most ordered drink
      const drinkCounts: Record<number, number> = {};
      shopOrders.forEach((o) => {
        drinkCounts[o.menu_item_id] = (drinkCounts[o.menu_item_id] || 0) + 1;
      });
      const topDrinkId = Object.entries(drinkCounts).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];
      const topDrink = topDrinkId
        ? shopItems.find((mi) => mi.id === parseInt(topDrinkId))
        : null;

      // Most common customization
      const customizations: string[] = [];
      shopOrders.forEach((o) => {
        if (o.drink_details) {
          const details = o.drink_details as DrinkDetails;
          const parts: string[] = [];
          if (details.sweetness) parts.push(details.sweetness.label);
          if (details.ice) parts.push(details.ice.label);
          if (details.toppings && details.toppings.length > 0)
            parts.push(details.toppings.join(" + "));
          if (parts.length > 0) customizations.push(parts.join(", "));
        }
      });
      const commonCustomization =
        customizations.length > 0
          ? (Object.entries(
              customizations.reduce(
                (acc, c) => {
                  acc[c] = (acc[c] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              ),
            ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
          : null;

      // Days since last visit
      const lastVisit = shopOrders[0]?.ordered_at ?? null;
      const daysSinceLastVisit = lastVisit
        ? Math.floor(
            (Date.now() - new Date(lastVisit).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;

      return {
        restaurant: r,
        totalVisits: shopOrders.length,
        lastVisit,
        mostOrderedDrink: topDrink?.name ?? null,
        commonCustomization,
        daysSinceLastVisit,
      };
    });

    setShops(shopSummaries);

    // Preference analysis
    const sweetValues: number[] = [];
    const iceValues: number[] = [];
    const toppingCounts: Record<string, number> = {};
    let hotCount = 0;
    let icedCount = 0;

    orders.forEach((o) => {
      if (o.drink_details) {
        const details = o.drink_details as DrinkDetails;
        if (details.sweetness) sweetValues.push(details.sweetness.value);
        if (details.ice) iceValues.push(details.ice.value);
        if (details.toppings) {
          details.toppings.forEach((t) => {
            toppingCounts[t] = (toppingCounts[t] || 0) + 1;
          });
        }
        if (details.temperature) {
          if (details.temperature.toLowerCase().includes("hot")) hotCount++;
          else icedCount++;
        }
      }
    });

    if (sweetValues.length > 0) {
      setAvgSweetness(
        Math.round(sweetValues.reduce((s, v) => s + v, 0) / sweetValues.length),
      );
    }
    if (iceValues.length > 0) {
      setAvgIce(
        Math.round(iceValues.reduce((s, v) => s + v, 0) / iceValues.length),
      );
    }

    const sortedToppings = Object.entries(toppingCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    setTopToppings(sortedToppings);
    setHotVsIced({ hot: hotCount, iced: icedCount });

    // Sweetness distribution
    const sweetDist: Record<number, number> = {};
    sweetValues.forEach((v) => {
      const bucket = Math.round(v / 25) * 25;
      sweetDist[bucket] = (sweetDist[bucket] || 0) + 1;
    });
    const totalSweet = sweetValues.length;
    setSweetnessDistribution(
      Object.entries(sweetDist)
        .map(([value, count]) => ({
          value: parseInt(value),
          count,
          percentage: Math.round((count / totalSweet) * 100),
        }))
        .sort((a, b) => a.value - b.value)
        .map((item) => ({
          range: `${item.value}%`,
          count: item.count,
          percentage: item.percentage,
        })),
    );

    // Set recent visits (last 5 orders)
    setRecentVisits(orders.slice(0, 5));

    setLoading(false);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getSweetnessLabel(value: number): string {
    return SWEETNESS_LABELS[value] ?? `${value}%`;
  }

  function getIceLabel(value: number): string {
    return ICE_LABELS[value] ?? `${value}%`;
  }

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
    return parts.join(", ");
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-txt2 text-sm">Loading...</p>
      </main>
    );
  }

  if (!isSuperuser) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-error text-lg mb-4">Access Denied</p>
          <p className="text-txt2 text-sm mb-6">
            Only superusers can access boba analytics.
          </p>
          <Link href="/" className="text-accent hover:underline">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="relative pt-10 px-6 pb-6 border-b-2 border-txt">
        <div className="absolute top-4 right-4 flex gap-2">
          <ThemeToggle />
          <AdminButton />
        </div>
        <p className="text-xs tracking-wide uppercase text-accent font-medium mb-1.5">
          Admin · Boba Dashboard
        </p>
        <h1 className="font-display text-[clamp(48px,10vw,80px)] leading-[0.88]">
          BOBA
          <br />
          <span className="text-accent">TRACKER</span>
        </h1>
        <div className="mt-4">
          <Link href="/" className="text-sm text-accent hover:underline">
            ← Back to Home
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="py-12 px-6 text-txt2">Loading dashboard...</p>
      ) : (
        <>
          {/* Summary Stats */}
          <section className="p-6 border-b border-brd">
            <h2 className="font-display text-xl mb-4 tracking-tight">
              Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border-[1.5px] border-brd p-4">
                <p className="text-2xl font-display leading-tight">
                  {stats.totalCheckins}
                </p>
                <p className="text-xs text-txt2 uppercase tracking-wide">
                  Total checkins
                </p>
              </div>
              <div className="border-[1.5px] border-brd p-4">
                <p className="text-2xl font-display leading-tight">
                  {stats.totalThisMonth}
                </p>
                <p className="text-xs text-txt2 uppercase tracking-wide">
                  This month
                </p>
              </div>
              <div className="border-[1.5px] border-brd p-4">
                <p className="text-2xl font-display leading-tight">
                  {stats.uniqueShops}
                </p>
                <p className="text-xs text-txt2 uppercase tracking-wide">
                  Unique shops
                </p>
              </div>
              <div className="border-[1.5px] border-brd p-4">
                <p className="text-2xl font-display leading-tight">
                  {stats.uniqueDrinks}
                </p>
                <p className="text-xs text-txt2 uppercase tracking-wide">
                  Unique drinks
                </p>
              </div>
            </div>
            {stats.favoriteShop && (
              <p className="mt-4 text-sm text-txt">
                Favorite shop:{" "}
                <span className="font-medium">{stats.favoriteShop}</span>
              </p>
            )}
          </section>

          {/* Per-shop breakdown */}
          <section className="p-6 border-b border-brd">
            <h2 className="font-display text-xl mb-4 tracking-tight">
              Per-shop breakdown
            </h2>
            <div className="space-y-4">
              {shops.map((shop) => (
                <div
                  key={shop.restaurant.id}
                  className="border-[1.5px] border-brd p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display text-lg leading-tight">
                      {shop.restaurant.name}
                    </h3>
                    <span className="text-xs text-txt2">
                      {shop.totalVisits} visit
                      {shop.totalVisits !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-txt2 mb-1">
                    {shop.restaurant.neighborhood}
                  </p>
                  {shop.mostOrderedDrink && (
                    <p className="text-sm text-txt mb-1">
                      Most ordered:{" "}
                      <span className="font-medium">
                        {shop.mostOrderedDrink}
                      </span>
                    </p>
                  )}
                  {shop.commonCustomization && (
                    <p className="text-xs text-txt2 italic">
                      Usually: {shop.commonCustomization}
                    </p>
                  )}
                  {shop.lastVisit && (
                    <p className="text-xs text-txt2 mt-2">
                      Last visit: {formatDate(shop.lastVisit)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Preference analysis */}
          <section className="p-6 border-b border-brd">
            <h2 className="font-display text-xl mb-4 tracking-tight">
              Preference analysis
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Sweetness</h3>
                {avgSweetness !== null ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Average:</span>
                      <span>{avgSweetness}%</span>
                    </div>
                    <div className="w-full bg-bg2 border border-brd h-2">
                      <div
                        className="bg-accent h-full"
                        style={{ width: `${avgSweetness}%` }}
                      />
                    </div>
                    <div className="text-xs text-txt2">
                      {avgSweetness < 50
                        ? "Less sweet preference"
                        : avgSweetness < 80
                          ? "Balanced sweetness"
                          : "Sweet tooth"}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-txt2">No data yet</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Ice level</h3>
                {avgIce !== null ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Average:</span>
                      <span>{avgIce}%</span>
                    </div>
                    <div className="w-full bg-bg2 border border-brd h-2">
                      <div
                        className="bg-accent h-full"
                        style={{ width: `${avgIce}%` }}
                      />
                    </div>
                    <div className="text-xs text-txt2">
                      {avgIce < 30
                        ? "Light ice preference"
                        : avgIce < 60
                          ? "Regular ice"
                          : "Extra ice lover"}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-txt2">No data yet</p>
                )}
              </div>
            </div>

            {topToppings.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Top toppings</h3>
                <div className="flex flex-wrap gap-2">
                  {topToppings.map((topping) => (
                    <span
                      key={topping.name}
                      className="px-2 py-1 bg-bg2 border border-brd text-xs"
                    >
                      {topping.name} ({topping.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">
                Temperature preference
              </h3>
              <div className="flex gap-4 text-sm">
                <span>
                  Hot: <span className="font-medium">{hotVsIced.hot}</span>
                </span>
                <span>
                  Iced: <span className="font-medium">{hotVsIced.iced}</span>
                </span>
              </div>
            </div>
          </section>

          {/* Sweetness distribution */}
          <section className="p-6 border-b border-brd">
            <h2 className="font-display text-xl mb-4 tracking-tight">
              Sweetness distribution
            </h2>
            <div className="space-y-2">
              {sweetnessDistribution.map((bucket) => (
                <div key={bucket.range} className="flex items-center gap-3">
                  <span className="text-xs w-16">{bucket.range}</span>
                  <div className="flex-1 bg-bg2 border border-brd h-4">
                    <div
                      className="bg-accent h-full"
                      style={{ width: `${bucket.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs w-12 text-right">
                    {bucket.count}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Visits */}
          {recentVisits.length > 0 && (
            <section className="p-6 border-b border-brd">
              <h2 className="font-display text-xl mb-4 tracking-tight">
                Recent Visits
              </h2>
              <div className="space-y-3">
                {recentVisits.map((visit) => {
                  const menuItem = menuItems.find(
                    (mi: MenuItem) => mi.id === visit.menu_item_id,
                  );
                  const restaurant = shops.find(
                    (s) => s.restaurant.id === visit.restaurant_id,
                  )?.restaurant;
                  return (
                    <div
                      key={visit.id}
                      className="border-[1.5px] border-brd p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display text-lg leading-tight">
                              {menuItem?.name || "Unknown drink"}
                            </h3>
                          </div>
                          <p className="text-xs text-txt2 mb-1">
                            {restaurant?.name} • {restaurant?.neighborhood}
                          </p>
                          <p className="text-xs text-txt2 mb-2">
                            {formatDate(visit.ordered_at)}
                          </p>
                          {visit.notes && (
                            <p className="text-sm text-txt leading-relaxed italic mb-2">
                              {visit.notes}
                            </p>
                          )}
                          {visit.drink_details && (
                            <p className="text-xs text-txt2">
                              {formatDrinkSummary(
                                visit.drink_details as DrinkDetails,
                              )}
                            </p>
                          )}
                        </div>
                        {visit.photo_url && (
                          <div className="ml-3">
                            <img
                              src={visit.photo_url}
                              alt={menuItem?.name}
                              className="w-16 h-16 object-cover border border-brd"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Haven't been in a while */}
          {shops.length > 0 && (
            <section className="p-6">
              <h2 className="font-display text-xl mb-4 tracking-tight">
                Haven't been in a while
              </h2>
              <div className="space-y-3">
                {shops
                  .filter((shop) => shop.daysSinceLastVisit > 30)
                  .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit)
                  .map((shop) => (
                    <div
                      key={shop.restaurant.id}
                      className="border-[1.5px] border-brd p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-display text-lg leading-tight">
                            {shop.restaurant.name}
                          </h3>
                          <p className="text-xs text-txt2">
                            {shop.restaurant.neighborhood}
                          </p>
                          <p className="text-sm text-txt mt-1">
                            Last visit: {formatDate(shop.lastVisit!)} (
                            {shop.daysSinceLastVisit} days ago)
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                {shops.filter((shop) => shop.daysSinceLastVisit > 30).length ===
                  0 && (
                  <div className="text-center py-8">
                    <p className="text-txt2">
                      You've visited all your boba spots recently! 🎉
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* No data state */}
          {shops.length === 0 && (
            <div className="text-center py-12">
              <p className="text-txt2 mb-4">
                No boba data yet. Tag some menu items with category
                &ldquo;boba&rdquo; and start logging orders!
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
