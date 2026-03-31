"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Restaurant, type RestaurantVisit } from "@/lib/supabase";
import Link from "next/link";

type Props = {
  params: { id: string };
};

export default function RestaurantDetailPage({ params }: Props) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [visits, setVisits] = useState<RestaurantVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [visitingId, setVisitingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const restaurantId = parseInt(params.id);
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
      setLoading(false);

      // Check admin status
      const adminCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("admin_auth="));
      setIsAdmin(!!adminCookie);
    }
    load();
  }, [params.id]);

  async function handleMarkVisited() {
    if (!restaurant) return;

    const adminNames = (process.env.NEXT_PUBLIC_ADMIN_NAMES ?? "")
      .split(",")
      .filter(Boolean);
    const visitedBy = adminNames[0] || "Admin";

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
    router.push(`/admin?edit=${restaurant.id}`);
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
        <p className="text-accent mb-4">{error || "Restaurant not found"}</p>
        <Link
          href="/"
          className="text-accent2 font-medium text-sm no-underline"
        >
          ← Back to list
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Breadcrumb */}
      <div className="p-6 pb-4 border-b border-brd">
        <Link
          href="/"
          className="text-[11px] tracking-[0.12em] uppercase font-medium text-accent2 no-underline"
        >
          ← Back to list
        </Link>
      </div>

      {/* Restaurant Header */}
      <div className="border-b-2 border-txt">
        {restaurant.photo_url && (
          <img
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
            <p className="text-[11px] tracking-[0.12em] uppercase font-medium text-accent">
              {restaurant.cuisine}
            </p>
            {restaurant.must_try && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-pill bg-accent text-white tracking-[0.05em] uppercase">
                ★ Must-Try
              </span>
            )}
          </div>
          <h1 className="font-display text-[clamp(48px,8vw,72px)] leading-[0.9] tracking-[0.02em] mb-3">
            {restaurant.name}
          </h1>
          <p className="text-[15px] text-txt2 flex items-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent2 shrink-0" />
            {restaurant.neighborhood}
          </p>
          <p className="text-[15px] font-medium text-txt2 mb-4">
            {restaurant.price}
          </p>
          {restaurant.note && (
            <p className="text-[15px] text-txt2 leading-relaxed italic border-t border-brd pt-4 mb-4">
              {restaurant.note}
            </p>
          )}
          {restaurant.address && (
            <p className="text-[13px] text-txt2 mb-2">{restaurant.address}</p>
          )}
          {restaurant.google_maps_url && (
            <a
              href={restaurant.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[14px] font-medium py-2 px-4 rounded-pill border-[1.5px] border-accent2 text-accent2 no-underline transition-all duration-100 hover:bg-accent2 hover:text-white"
            >
              View on Google Maps ↗
            </a>
          )}
        </div>
      </div>

      {/* Visit History */}
      <div className="p-6 border-b border-brd">
        <h2 className="font-display text-[28px] mb-3">Visit History</h2>
        {visits.length === 0 ? (
          <p className="text-txt2 text-[14px]">No visits recorded yet</p>
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center gap-3 pb-3 border-b border-brd last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-accent2 shrink-0" />
                <div>
                  <p className="text-[14px] text-txt font-medium">
                    {formatDate(visit.visited_at)} at {formatTime(visit.visited_at)}
                  </p>
                  <p className="text-[12px] text-txt2">by {visit.visited_by}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="p-6 border-b border-brd">
        <h2 className="font-display text-[28px] mb-3">Details</h2>
        <div className="space-y-2">
          {restaurant.added_by && (
            <p className="text-[13px] text-txt2">
              <span className="font-medium">Added by:</span> {restaurant.added_by}
            </p>
          )}
          {restaurant.date_added && (
            <p className="text-[13px] text-txt2">
              <span className="font-medium">Date added:</span>{" "}
              {formatDate(restaurant.date_added)}
            </p>
          )}
          {restaurant.last_visited && (
            <p className="text-[13px] text-txt2">
              <span className="font-medium">Last visited:</span>{" "}
              {formatDate(restaurant.last_visited)}
            </p>
          )}
          <p className="text-[13px] text-txt2">
            <span className="font-medium">Total visits:</span> {visits.length}
          </p>
        </div>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="p-6 flex gap-3 flex-wrap">
          <button
            onClick={handleMarkVisited}
            disabled={visitingId === restaurant.id}
            className={`text-[14px] font-medium py-2 px-4 rounded-pill border-[1.5px] font-body ${
              visitingId === restaurant.id
                ? "cursor-default opacity-30 bg-transparent border-brd text-txt2"
                : "cursor-pointer bg-accent2 text-white border-accent2"
            }`}
          >
            {visitingId === restaurant.id ? "Marking..." : "✓ Mark as Visited"}
          </button>
          <button
            onClick={handleEdit}
            className="text-[14px] font-medium py-2 px-4 rounded-pill border-[1.5px] border-txt text-txt bg-transparent cursor-pointer font-body"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deletingId === restaurant.id}
            className={`text-[14px] font-medium py-2 px-4 rounded-pill border-[1.5px] border-accent text-accent bg-transparent font-body ${
              deletingId === restaurant.id
                ? "cursor-default opacity-30"
                : "cursor-pointer"
            }`}
          >
            {deletingId === restaurant.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </main>
  );
}
