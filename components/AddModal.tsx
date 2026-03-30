"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { type Restaurant } from "@/lib/supabase";

type Props = {
  onSave: (entry: Omit<Restaurant, "id" | "created_at">) => Promise<boolean>;
  onClose: () => void;
  editData?: Restaurant | null;
};

const PRICES = ["$", "$$", "$$$", "$$$$"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 15,
  border: "1.5px solid var(--brd)",
  background: "var(--bg)",
  color: "var(--txt)",
  borderRadius: 0,
  outline: "none",
  fontFamily: "var(--font-body)",
  transition: "border-color 0.12s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: "var(--txt2)",
  marginBottom: 5,
};

const ADMIN_NAMES = (process.env.NEXT_PUBLIC_ADMIN_NAMES ?? "")
  .split(",")
  .filter(Boolean);

export default function AddModal({ onSave, onClose, editData }: Props) {
  const [name, setName] = useState(editData?.name ?? "");
  const [neighborhood, setNeighborhood] = useState(
    editData?.neighborhood ?? "",
  );
  const [cuisine, setCuisine] = useState(editData?.cuisine ?? "");
  const [price, setPrice] = useState(editData?.price ?? "$$$");
  const [note, setNote] = useState(editData?.note ?? "");
  const [addedBy, setAddedBy] = useState(
    editData?.added_by ?? ADMIN_NAMES[0] ?? "",
  );
  const [mustTry, setMustTry] = useState(editData?.must_try ?? false);
  const [photoUrl, setPhotoUrl] = useState(editData?.photo_url ?? "");
  const [address, setAddress] = useState(editData?.address ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    editData?.google_maps_url ?? "",
  );
  const [placeId, setPlaceId] = useState(editData?.place_id ?? "");
  const [lat, setLat] = useState<number | null>(editData?.lat ?? null);
  const [lng, setLng] = useState<number | null>(editData?.lng ?? null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const autocompleteRef = useRef<HTMLInputElement>(null);

  const handlePlaceSelect = useCallback(
    (place: google.maps.places.PlaceResult) => {
      if (place.name) setName(place.name);
      if (place.formatted_address) setAddress(place.formatted_address);
      if (place.place_id) {
        setPlaceId(place.place_id);
        setGoogleMapsUrl(
          `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        );
      }
      if (place.geometry?.location) {
        setLat(place.geometry.location.lat());
        setLng(place.geometry.location.lng());
      }
      // Try to extract neighborhood from address components
      const hood = place.address_components?.find(
        (c) =>
          c.types.includes("neighborhood") || c.types.includes("sublocality"),
      );
      if (hood) setNeighborhood(hood.long_name);
    },
    [],
  );

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !autocompleteRef.current) return;

    let autocomplete: google.maps.places.Autocomplete | null = null;

    setOptions({ key: apiKey });
    importLibrary("places").then(() => {
      if (!autocompleteRef.current) return;
      autocomplete = new google.maps.places.Autocomplete(
        autocompleteRef.current,
        {
          types: ["establishment"],
          componentRestrictions: { country: "us" },
          fields: [
            "name",
            "formatted_address",
            "place_id",
            "geometry",
            "address_components",
          ],
        },
      );
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete!.getPlace();
        if (place) handlePlaceSelect(place);
      });
    });

    return () => {
      if (autocomplete) google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [handlePlaceSelect]);

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    const ok = await onSave({
      name: name.trim(),
      neighborhood: neighborhood.trim(),
      cuisine: cuisine.trim(),
      price,
      note: note.trim(),
      added_by: addedBy || null,
      address: address.trim() || null,
      google_maps_url: googleMapsUrl || null,
      place_id: placeId || null,
      lat,
      lng,
      photo_url: photoUrl.trim() || null,
      must_try: mustTry,
    });
    setSaving(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => onClose(), 800);
    } else {
      setError("Failed to save — please try again.");
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--bg)",
          border: "2px solid var(--txt)",
          padding: "1.75rem",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 36,
            marginBottom: "1.25rem",
          }}
        >
          {success
            ? editData
              ? "Spot updated!"
              : "Spot added!"
            : editData
              ? "Edit spot"
              : "Add a spot"}
        </p>

        {success && (
          <p
            style={{
              color: "var(--accent)",
              fontSize: 14,
              marginBottom: "1rem",
            }}
          >
            {editData
              ? "Changes saved successfully."
              : "Restaurant saved successfully."}
          </p>
        )}

        {!editData && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Search Google Places</label>
            <input
              ref={autocompleteRef}
              placeholder="Search for a restaurant..."
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--brd)")}
            />
          </div>
        )}

        {[
          {
            label: "Restaurant name",
            value: name,
            set: setName,
            placeholder: "e.g. Juniper & Ivy",
          },
          {
            label: "Neighborhood",
            value: neighborhood,
            set: setNeighborhood,
            placeholder: "e.g. Little Italy, North Park...",
          },
          {
            label: "Cuisine type",
            value: cuisine,
            set: setCuisine,
            placeholder: "e.g. Mexican, Seafood, Italian...",
          },
          {
            label: "Address",
            value: address,
            set: setAddress,
            placeholder: "e.g. 2228 Kettner Blvd, San Diego",
          },
        ].map((field) => (
          <div key={field.label} style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>{field.label}</label>
            <input
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              placeholder={field.placeholder}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--brd)")}
            />
          </div>
        ))}

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Price range</label>
          <div style={{ display: "flex", gap: 8 }}>
            {PRICES.map((p) => (
              <button
                key={p}
                onClick={() => setPrice(p)}
                style={{
                  flex: 1,
                  padding: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "1.5px solid var(--brd)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  borderRadius: 0,
                  background: price === p ? "var(--txt)" : "transparent",
                  color: price === p ? "var(--bg)" : "var(--txt2)",
                  borderColor: price === p ? "var(--txt)" : "var(--brd)",
                  transition: "all 0.12s",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Must-Try</label>
          <button
            type="button"
            onClick={() => setMustTry(!mustTry)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              border: "1.5px solid",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              borderRadius: 20,
              background: mustTry ? "var(--accent)" : "transparent",
              color: mustTry ? "#fff" : "var(--txt2)",
              borderColor: mustTry ? "var(--accent)" : "var(--brd)",
              transition: "all 0.12s",
            }}
          >
            {mustTry ? "★ Must-Try" : "☆ Mark as Must-Try"}
          </button>
        </div>

        {ADMIN_NAMES.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Added by</label>
            <select
              value={addedBy}
              onChange={(e) => setAddedBy(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {ADMIN_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Photo URL</label>
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--brd)")}
          />
          {photoUrl.trim() && (
            <img
              src={photoUrl.trim()}
              alt="Preview"
              style={{
                marginTop: 8,
                width: "100%",
                height: 120,
                objectFit: "cover",
                border: "1px solid var(--brd)",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Why you love it</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What makes this place special?"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--brd)")}
          />
        </div>

        {error && (
          <p style={{ color: "var(--accent)", fontSize: 13, marginBottom: 8 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: "1.5rem" }}>
          <button
            onClick={handleSave}
            disabled={saving || success}
            style={{
              flex: 1,
              padding: 10,
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              fontSize: 14,
              fontWeight: 500,
              cursor: saving || success ? "default" : "pointer",
              fontFamily: "var(--font-body)",
              borderRadius: 0,
              opacity: saving || success ? 0.6 : 1,
            }}
          >
            {saving
              ? "Saving..."
              : success
                ? "Saved!"
                : editData
                  ? "Save changes"
                  : "Save restaurant"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px",
              background: "transparent",
              color: "var(--txt2)",
              border: "1.5px solid var(--brd)",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              borderRadius: 0,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
