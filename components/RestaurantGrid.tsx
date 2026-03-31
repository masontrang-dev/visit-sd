"use client";

import { useState } from "react";
import Link from "next/link";
import { type Restaurant, type RestaurantVisit } from "@/lib/supabase";

type Props = {
  restaurants: Restaurant[];
  grouped: boolean;
  onDelete?: (id: number) => void;
  deletingId?: number | null;
  onEdit?: (r: Restaurant) => void;
  mustTryFilter?: boolean;
  onMarkVisited?: (id: number, visitedBy: string) => Promise<void>;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
};

function Card({
  r,
  onDelete,
  deletingId,
  onEdit,
  onMarkVisited,
  visitingId,
  visits,
}: {
  r: Restaurant;
  onDelete?: (id: number) => void;
  deletingId?: number | null;
  onEdit?: (r: Restaurant) => void;
  onMarkVisited?: (id: number, visitedBy: string) => Promise<void>;
  visitingId?: number | null;
  visits?: Record<number, RestaurantVisit[]>;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const restaurantVisits = visits?.[r.id] || [];
  const visitCount = restaurantVisits.length;

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return (
    <div className="bg-bg relative border-b border-brd transition-colors duration-100 hover:bg-bg2">
      {r.photo_url && (
        <img
          src={r.photo_url}
          alt={r.name}
          className="w-full h-[140px] object-cover block"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="p-5">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-[10px] tracking-[0.12em] uppercase font-medium text-accent">
            {r.cuisine}
          </p>
          {r.must_try && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-pill bg-accent text-white tracking-[0.05em] uppercase">
              ★ Must-Try
            </span>
          )}
        </div>
        <Link
          href={`/restaurant/${r.id}`}
          className="font-display text-[28px] leading-none text-txt mb-1 no-underline block hover:text-accent transition-colors duration-100"
        >
          {r.name}
        </Link>
        <p className="text-[13px] text-txt2 flex items-center gap-[5px]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent2 shrink-0" />
          {r.neighborhood}
        </p>
        <p className="absolute top-5 right-5 text-[13px] font-medium text-txt2">
          {r.price}
        </p>
        {r.note && (
          <p className="mt-2.5 text-[13px] text-txt2 leading-relaxed border-t border-brd pt-2.5 italic">
            {r.note}
          </p>
        )}
        {r.address && <p className="mt-2 text-xs text-txt2">{r.address}</p>}
        {r.google_maps_url && (
          <a
            href={r.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-1 text-xs font-medium text-accent2 no-underline"
          >
            View on Maps ↗
          </a>
        )}
        {r.added_by && (
          <p className="mt-2 text-[11px] text-txt2 tracking-[0.05em]">
            Added by {r.added_by}
          </p>
        )}
        {r.date_added && (
          <p className="mt-1 text-[11px] text-txt2 tracking-[0.05em]">
            Added {formatDate(r.date_added)}
          </p>
        )}
        {visitCount > 0 && (
          <div className="mt-2 pt-2 border-t border-brd">
            <p className="text-[11px] text-txt2 tracking-[0.05em]">
              Visited {visitCount} time{visitCount !== 1 ? "s" : ""}
              {r.last_visited && (
                <span>, last on {formatDate(r.last_visited)}</span>
              )}
            </p>
            {visitCount > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="mt-1 text-[11px] text-accent2 font-medium bg-transparent border-none cursor-pointer p-0 tracking-[0.05em]"
              >
                {showHistory ? "Hide" : "Show"} history
              </button>
            )}
            {showHistory && (
              <div className="mt-2 space-y-1">
                {restaurantVisits.map((visit) => (
                  <p key={visit.id} className="text-[11px] text-txt2">
                    • {formatDate(visit.visited_at)} by {visit.visited_by}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        {onMarkVisited && (
          <button
            onClick={() => {
              const adminNames = (process.env.NEXT_PUBLIC_ADMIN_NAMES ?? "")
                .split(",")
                .filter(Boolean);
              const visitedBy = adminNames[0] || "Admin";
              onMarkVisited(r.id, visitedBy);
            }}
            disabled={visitingId === r.id}
            className={`mt-2 text-[13px] font-medium py-1.5 px-3 rounded-pill border-[1.5px] font-body ${visitingId === r.id ? "cursor-default opacity-30 bg-transparent border-brd text-txt2" : "cursor-pointer bg-accent2 text-white border-accent2"}`}
          >
            {visitingId === r.id ? "Marking..." : "✓ Mark as Visited"}
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(r)}
            className={`absolute ${onMarkVisited ? "bottom-[72px]" : "bottom-4"} ${onDelete ? "right-20" : "right-4"} bg-transparent border-none cursor-pointer text-sm text-txt2 font-body opacity-60 p-0`}
            title="Edit"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(r.id)}
            disabled={deletingId === r.id}
            className={`absolute ${onMarkVisited ? "bottom-[72px]" : "bottom-4"} right-4 bg-transparent border-none text-sm text-accent font-body p-0 ${deletingId === r.id ? "cursor-default opacity-30" : "cursor-pointer opacity-60"}`}
            title="Remove"
          >
            {deletingId === r.id ? "Removing..." : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}

const gridClass =
  "grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-0 bg-brd border-l border-brd";

export default function RestaurantGrid({
  restaurants,
  grouped,
  onDelete,
  deletingId,
  onEdit,
  mustTryFilter,
  onMarkVisited,
  visitingId,
  visits,
}: Props) {
  if (restaurants.length === 0) {
    return (
      <div className="py-12 px-6 text-center">
        <p className="font-display text-5xl text-brd mb-3">NO SPOTS YET</p>
        <p className="text-txt2 text-[15px]">
          {grouped
            ? "Add your first recommendation"
            : "No spots in this category"}
        </p>
      </div>
    );
  }

  if (!grouped) {
    return (
      <div className={gridClass}>
        {restaurants.map((r) => (
          <Card
            key={r.id}
            r={r}
            onDelete={onDelete}
            deletingId={deletingId}
            onEdit={onEdit}
            onMarkVisited={onMarkVisited}
            visitingId={visitingId}
            visits={visits}
          />
        ))}
      </div>
    );
  }

  const byCuisine: Record<string, Restaurant[]> = {};
  restaurants.forEach((r) => {
    const c = r.cuisine || "Other";
    if (!byCuisine[c]) byCuisine[c] = [];
    byCuisine[c].push(r);
  });

  return (
    <>
      {Object.keys(byCuisine)
        .sort()
        .map((cuisine, i) => (
          <section key={cuisine}>
            <div
              className={`py-4 px-6 pb-2 ${i === 0 ? "" : "border-t-2 border-txt"}`}
            >
              <span className="font-display text-[22px] tracking-[0.04em]">
                {cuisine}
              </span>
              <span className="text-[13px] text-txt2 ml-2.5">
                {byCuisine[cuisine].length} spot
                {byCuisine[cuisine].length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className={gridClass}>
              {byCuisine[cuisine].map((r) => (
                <Card
                  key={r.id}
                  r={r}
                  onDelete={onDelete}
                  deletingId={deletingId}
                  onEdit={onEdit}
                  onMarkVisited={onMarkVisited}
                  visitingId={visitingId}
                  visits={visits}
                />
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
