"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useApiIsLoaded,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import Link from "next/link";
import type { Restaurant } from "@/lib/supabase";
import { CUISINE_COLORS, buildCuisineColorMap } from "@/lib/cuisine-colors";

function MapSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-bg2 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, var(--bg) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-txt2 text-sm bg-bg/80 px-3 py-1.5 rounded-pill backdrop-blur-sm">
          <div className="w-3 h-3 border-2 border-txt2 border-t-transparent rounded-full animate-spin" />
          Loading map...
        </div>
      </div>
    </div>
  );
}

function MapLoadingOverlay() {
  const isLoaded = useApiIsLoaded();
  if (isLoaded) return null;
  return <MapSkeleton />;
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

function UserLocationPin() {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ transform: "translate(-50%, -50%)" }}
    >
      <div className="absolute w-8 h-8 rounded-full bg-accent2 opacity-25 animate-ping" />
      <div className="relative w-4 h-4 rounded-full bg-accent2 border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.4)]" />
    </div>
  );
}

type Props = {
  restaurants: Restaurant[];
  allRestaurants?: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
  userLocationLabel?: string;
  sortByDistance?: boolean;
};

const SD_CENTER = { lat: 32.7157, lng: -117.1611 };
const DEFAULT_ZOOM = 12;
const USER_LOCATION_ZOOM = 14;

export default function MapView({
  restaurants,
  allRestaurants,
  userLocation,
  userLocationLabel,
  sortByDistance = false,
}: Props) {
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [userPinSelected, setUserPinSelected] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Controlled camera. Initializing from userLocation so the first frame is
  // already centered correctly when the user opens the map with a known
  // location. After mount, userLocation changes are propagated via the effect
  // below, and user pans/zooms are propagated via onCameraChanged.
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    userLocation ?? SD_CENTER,
  );
  const [zoom, setZoom] = useState<number>(
    userLocation ? USER_LOCATION_ZOOM : DEFAULT_ZOOM,
  );

  useEffect(() => {
    if (userLocation) {
      setCenter(userLocation);
      setZoom((z) => (z < USER_LOCATION_ZOOM ? USER_LOCATION_ZOOM : z));
    }
  }, [userLocation]);

  const handleCameraChanged = useCallback((ev: MapCameraChangedEvent) => {
    setCenter(ev.detail.center);
    setZoom(ev.detail.zoom);
  }, []);

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
    <div className="h-[calc(100vh-200px)] min-h-[400px] relative">
      <APIProvider apiKey={apiKey}>
        <MapLoadingOverlay />
        <Map
          center={center}
          zoom={zoom}
          onCameraChanged={handleCameraChanged}
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
          {userLocation && (
            <AdvancedMarker
              position={userLocation}
              onClick={() => setUserPinSelected(true)}
              zIndex={9999}
            >
              <UserLocationPin />
            </AdvancedMarker>
          )}
          {userLocation && userPinSelected && (
            <InfoWindow
              position={userLocation}
              onCloseClick={() => setUserPinSelected(false)}
            >
              <div className="font-body max-w-[220px] p-1 text-txt">
                <p className="text-xs font-medium text-txt">
                  {userLocationLabel || "Your location"}
                </p>
                {sortByDistance && (
                  <p className="text-2xs text-txt2 mt-0.5">
                    Sorting by distance from here
                  </p>
                )}
              </div>
            </InfoWindow>
          )}
          {selected && selected.lat != null && selected.lng != null && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="font-body max-w-[220px] p-1 text-txt">
                <Link
                  href={`/restaurant/${selected.id}`}
                  className="font-display text-xl leading-tight mb-1 block no-underline text-txt transition-colors"
                >
                  {selected.name}
                </Link>
                <p className="text-xs mb-0.5 text-txt2">
                  {selected.cuisine} · {selected.price}
                </p>
                {selected.neighborhood && (
                  <p className="text-xs text-txt2">{selected.neighborhood}</p>
                )}
                {selected.must_try && (
                  <span className="inline-block mt-1 text-2xs font-medium px-2 py-0.5 rounded-pill bg-accent text-white">
                    ★ Must-Try
                  </span>
                )}
                <Link
                  href={`/restaurant/${selected.id}`}
                  className="block mt-2 text-xs font-medium text-accent2 no-underline hover:opacity-70 transition-opacity"
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
