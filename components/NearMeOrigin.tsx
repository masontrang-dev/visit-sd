"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { GeoStatus } from "@/hooks/useGeolocation";

type Position = { lat: number; lng: number };

type Props = {
  gpsPosition: Position | null;
  gpsStatus: GeoStatus;
  onRequestGps: () => void;
  manualPosition: Position | null;
  manualLabel: string;
  onManualChange: (position: Position | null, label: string) => void;
};

// Bias autocomplete suggestions toward the San Diego area without restricting
// matches — users entering a hotel or address elsewhere still get results.
const SD_BOUNDS = {
  north: 33.114,
  south: 32.534,
  east: -116.911,
  west: -117.292,
};

export default function NearMeOrigin({
  gpsPosition,
  gpsStatus,
  onRequestGps,
  manualPosition,
  manualLabel,
  onManualChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onManualChangeRef = useRef(onManualChange);

  useEffect(() => {
    onManualChangeRef.current = onManualChange;
  }, [onManualChange]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    let autocomplete: google.maps.places.Autocomplete | null = null;

    setOptions({ key: apiKey });
    importLibrary("places").then(() => {
      if (!inputRef.current) return;
      autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ["geocode"],
        componentRestrictions: { country: "us" },
        bounds: SD_BOUNDS,
        fields: ["geometry", "formatted_address"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete!.getPlace();
        const loc = place.geometry?.location;
        if (!loc) return;
        const label =
          place.formatted_address || inputRef.current?.value || "address";
        onManualChangeRef.current(
          { lat: loc.lat(), lng: loc.lng() },
          label,
        );
      });
    });

    return () => {
      if (autocomplete) google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, []);

  // Keep the input's DOM value in sync when manualLabel changes externally
  // (e.g. cleared by clicking the GPS button).
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== manualLabel) {
      inputRef.current.value = manualLabel;
    }
  }, [manualLabel]);

  const usingManual = manualPosition !== null;
  const usingGps = !usingManual && gpsPosition !== null;

  function handleGpsClick() {
    onManualChange(null, "");
    onRequestGps();
  }

  function handleClear() {
    onManualChange(null, "");
  }

  let statusLine: string | null = null;
  if (usingManual) {
    statusLine = `Sorting by distance from ${manualLabel}`;
  } else if (gpsStatus === "requesting") {
    statusLine = "Getting your location…";
  } else if (usingGps) {
    statusLine = "Sorting by distance from your current location";
  } else if (gpsStatus === "denied") {
    statusLine =
      "Location permission denied — enter an address to sort by distance";
  } else if (gpsStatus === "unsupported") {
    statusLine =
      "Geolocation unsupported — enter an address to sort by distance";
  } else if (gpsStatus === "error") {
    statusLine =
      "Couldn't get your location — enter an address to sort by distance";
  }

  return (
    <div className="px-6 py-3 border-b border-brd">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={handleGpsClick}
          className={`btn-outline !py-2 !px-3 whitespace-nowrap ${
            usingGps ? "!border-accent !text-accent" : ""
          }`}
          title="Use my current location"
          aria-label="Use my current location"
          aria-pressed={usingGps}
        >
          <span aria-hidden="true">📍</span>{" "}
          <span className="hidden sm:inline">Use my location</span>
        </button>
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            placeholder="Or enter an address…"
            defaultValue={manualLabel}
            className="input-base !py-2 !pl-3 !pr-8 !bg-bg2 placeholder:text-txt2 placeholder:opacity-60"
            aria-label="Address to sort by distance from"
          />
          {usingManual && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-txt2 hover:text-txt text-xl leading-none"
              title="Clear address"
              aria-label="Clear address"
            >
              ×
            </button>
          )}
        </div>
      </div>
      {statusLine && <p className="mt-2 text-xs text-txt2">{statusLine}</p>}
    </div>
  );
}
