"use client";

import { useState, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { type Restaurant } from "@/lib/supabase";

type Props = {
  restaurants: Restaurant[];
};

const SD_CENTER = { lat: 32.7157, lng: -117.1611 };

export default function MapView({ restaurants }: Props) {
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleMarkerClick = useCallback((r: Restaurant) => {
    setSelected(r);
  }, []);

  if (!apiKey) {
    return (
      <div className="py-12 px-6 text-center text-txt2">
        <p className="text-[15px]">
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
          {markersData.map((r) => (
            <AdvancedMarker
              key={r.id}
              position={{ lat: r.lat!, lng: r.lng! }}
              onClick={() => handleMarkerClick(r)}
            />
          ))}
          {selected && selected.lat != null && selected.lng != null && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="font-body max-w-[220px] p-1">
                <p className="font-display text-xl leading-tight mb-1">
                  {selected.name}
                </p>
                <p className="text-xs text-txt2 mb-0.5">
                  {selected.cuisine} · {selected.price}
                </p>
                {selected.neighborhood && (
                  <p className="text-xs text-txt2">{selected.neighborhood}</p>
                )}
                {selected.must_try && (
                  <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-pill bg-accent text-white">
                    ★ Must-Try
                  </span>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
