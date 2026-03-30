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
      <div
        style={{
          padding: "3rem 1.5rem",
          textAlign: "center",
          color: "var(--txt2)",
        }}
      >
        <p style={{ fontSize: 15 }}>
          Google Maps API key not configured. Add{" "}
          <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment.
        </p>
      </div>
    );
  }

  const markersData = restaurants.filter((r) => r.lat != null && r.lng != null);

  return (
    <div style={{ height: "calc(100vh - 200px)", minHeight: 400 }}>
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
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  maxWidth: 220,
                  padding: 4,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    lineHeight: 1.1,
                    marginBottom: 4,
                  }}
                >
                  {selected.name}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--txt2)",
                    marginBottom: 2,
                  }}
                >
                  {selected.cuisine} · {selected.price}
                </p>
                {selected.neighborhood && (
                  <p style={{ fontSize: 12, color: "var(--txt2)" }}>
                    {selected.neighborhood}
                  </p>
                )}
                {selected.must_try && (
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "var(--accent)",
                      color: "#fff",
                    }}
                  >
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
