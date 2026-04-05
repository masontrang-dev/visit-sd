"use client";

import { useState, useCallback, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import Link from "next/link";
import { type Restaurant } from "@/lib/supabase";

const CUISINE_COLORS = [
  "var(--cuisine-1)",
  "var(--cuisine-2)",
  "var(--cuisine-3)",
  "var(--cuisine-4)",
  "var(--cuisine-5)",
  "var(--cuisine-6)",
  "var(--cuisine-7)",
  "var(--cuisine-8)",
  "var(--cuisine-9)",
  "var(--cuisine-10)",
];

function buildCuisineColorMap(restaurants: Restaurant[]): Record<string, string> {
  const cuisines = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const map: Record<string, string> = {};
  cuisines.forEach((c, i) => {
    map[c as string] = CUISINE_COLORS[i % CUISINE_COLORS.length];
  });
  return map;
}

function MarkerPin({ color }: { color: string }) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ transform: "translate(-50%, -100%)" }}
    >
      <div
        className="w-3 h-3 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.3)]"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

type Props = {
  restaurants: Restaurant[];
  allRestaurants?: Restaurant[];
};

const SD_CENTER = { lat: 32.7157, lng: -117.1611 };

export default function MapView({ restaurants, allRestaurants }: Props) {
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const cuisineColorMap = useMemo(
    () => buildCuisineColorMap(allRestaurants ?? restaurants),
    [allRestaurants, restaurants],
  );

  const handleMarkerClick = useCallback((r: Restaurant) => {
    setSelected(r);
  }, []);

  if (!apiKey) {
    return (
      <div className="py-12 px-6 text-center text-txt2">
        <p className="text-base">
          Google Maps API key not configured. Add{" "}
          <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment.
        </p>
      </div>
    );
  }

  const markersData = restaurants.filter((r) => r.lat != null && r.lng != null);

  return (
    <div className="h-[calc(100vh-200px)] min-h-[400px]">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={SD_CENTER}
          defaultZoom={12}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="visit-sd-map"
          style={{ width: "100%", height: "100%" }}
        >
          {markersData.map((r) => {
            const color = cuisineColorMap[r.cuisine || ""] || CUISINE_COLORS[0];
            return (
              <AdvancedMarker
                key={r.id}
                position={{ lat: r.lat!, lng: r.lng! }}
                onClick={() => handleMarkerClick(r)}
              >
                <MarkerPin color={color} />
              </AdvancedMarker>
            );
          })}
          {selected && selected.lat != null && selected.lng != null && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="font-body max-w-[220px] p-1" style={{ color: "#1a1a18" }}>
                <Link
                  href={`/restaurant/${selected.id}`}
                  className="font-display text-xl leading-tight mb-1 block no-underline transition-colors"
                  style={{ color: "#1a1a18" }}
                >
                  {selected.name}
                </Link>
                <p className="text-xs mb-0.5" style={{ color: "#5f5e5a" }}>
                  {selected.cuisine} · {selected.price}
                </p>
                {selected.neighborhood && (
                  <p className="text-xs" style={{ color: "#5f5e5a" }}>{selected.neighborhood}</p>
                )}
                {selected.must_try && (
                  <span className="inline-block mt-1 text-2xs font-medium px-2 py-0.5 rounded-pill bg-accent text-white">
                    ★ Must-Try
                  </span>
                )}
                <Link
                  href={`/restaurant/${selected.id}`}
                  className="block mt-2 text-xs font-medium no-underline hover:opacity-70 transition-opacity"
                  style={{ color: "#1d9e75" }}
                >
                  View details →
                </Link>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
