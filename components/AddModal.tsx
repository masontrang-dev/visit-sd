"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { type Restaurant } from "@/lib/supabase";

type Props = {
  onSave: (entry: Omit<Restaurant, "id" | "created_at">) => Promise<boolean>;
  onClose: () => void;
  editData?: Restaurant | null;
  existingCuisines?: string[];
};

const PRICES = ["$", "$$", "$$$", "$$$$"];

const GOOGLE_TYPE_TO_CUISINE: Record<string, string> = {
  mexican_restaurant: "Mexican",
  italian_restaurant: "Italian",
  japanese_restaurant: "Japanese",
  chinese_restaurant: "Chinese",
  thai_restaurant: "Thai",
  indian_restaurant: "Indian",
  korean_restaurant: "Korean",
  vietnamese_restaurant: "Vietnamese",
  french_restaurant: "French",
  greek_restaurant: "Greek",
  mediterranean_restaurant: "Mediterranean",
  middle_eastern_restaurant: "Middle Eastern",
  seafood_restaurant: "Seafood",
  steak_house: "Steakhouse",
  sushi_restaurant: "Sushi",
  pizza_restaurant: "Pizza",
  hamburger_restaurant: "Burgers",
  barbecue_restaurant: "BBQ",
  breakfast_restaurant: "Breakfast",
  brunch_restaurant: "Brunch",
  vegan_restaurant: "Vegan",
  vegetarian_restaurant: "Vegetarian",
  ramen_restaurant: "Ramen",
  sandwich_shop: "Sandwiches",
  cafe: "Cafe",
  coffee_shop: "Coffee",
  bakery: "Bakery",
  ice_cream_shop: "Dessert",
  bar: "Bar",
  american_restaurant: "American",
  spanish_restaurant: "Spanish",
  turkish_restaurant: "Turkish",
  brazilian_restaurant: "Brazilian",
  peruvian_restaurant: "Peruvian",
  lebanese_restaurant: "Lebanese",
  african_restaurant: "African",
  ethiopian_restaurant: "Ethiopian",
  caribbean_restaurant: "Caribbean",
};

const PRICE_LEVEL_MAP: Record<number, string> = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$",
};

function extractCuisine(types: string[]): string | null {
  for (const t of types) {
    if (GOOGLE_TYPE_TO_CUISINE[t]) return GOOGLE_TYPE_TO_CUISINE[t];
  }
  return null;
}

const DEFAULT_CUISINE_OPTIONS = [
  "African",
  "American",
  "Asian Fusion",
  "BBQ",
  "Bakery",
  "Bar",
  "Brazilian",
  "Breakfast",
  "Brunch",
  "Burgers",
  "Cafe",
  "Caribbean",
  "Chinese",
  "Coffee",
  "Dessert",
  "Ethiopian",
  "French",
  "Greek",
  "Hawaiian",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Lebanese",
  "Mediterranean",
  "Mexican",
  "Middle Eastern",
  "Peruvian",
  "Pizza",
  "Ramen",
  "Sandwiches",
  "Seafood",
  "Southern",
  "Spanish",
  "Steakhouse",
  "Sushi",
  "Tacos",
  "Thai",
  "Turkish",
  "Vegan",
  "Vegetarian",
  "Vietnamese",
];

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

export default function AddModal({
  onSave,
  onClose,
  editData,
  existingCuisines = [],
}: Props) {
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
  const [cuisineOpen, setCuisineOpen] = useState(false);
  const [cuisineHighlight, setCuisineHighlight] = useState(-1);
  const cuisineWrapperRef = useRef<HTMLDivElement>(null);

  const cuisineOptions = Array.from(
    new Set([...existingCuisines, ...DEFAULT_CUISINE_OPTIONS]),
  ).sort();
  const filteredCuisines = cuisine.trim()
    ? cuisineOptions.filter((c) =>
        c.toLowerCase().includes(cuisine.trim().toLowerCase()),
      )
    : cuisineOptions;
  const showCuisineAdd =
    cuisine.trim() &&
    !cuisineOptions.some(
      (c) => c.toLowerCase() === cuisine.trim().toLowerCase(),
    );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        cuisineWrapperRef.current &&
        !cuisineWrapperRef.current.contains(e.target as Node)
      ) {
        setCuisineOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      // Auto-detect cuisine from place types
      if (place.types) {
        const detected = extractCuisine(place.types);
        if (detected) setCuisine(detected);
      }
      // Auto-detect price range from price_level
      if (place.price_level != null && PRICE_LEVEL_MAP[place.price_level]) {
        setPrice(PRICE_LEVEL_MAP[place.price_level]);
      }
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
            "price_level",
            "types",
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

        <div
          ref={cuisineWrapperRef}
          style={{ marginBottom: "1rem", position: "relative" }}
        >
          <label style={labelStyle}>Cuisine type</label>
          <input
            value={cuisine}
            onChange={(e) => {
              setCuisine(e.target.value);
              setCuisineOpen(true);
              setCuisineHighlight(-1);
            }}
            placeholder="Search or type a cuisine..."
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
              setCuisineOpen(true);
            }}
            onBlur={(e) => (e.target.style.borderColor = "var(--brd)")}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCuisineHighlight((prev) =>
                  prev < filteredCuisines.length - 1 ? prev + 1 : prev,
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCuisineHighlight((prev) => (prev > 0 ? prev - 1 : -1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (
                  cuisineHighlight >= 0 &&
                  filteredCuisines[cuisineHighlight]
                ) {
                  setCuisine(filteredCuisines[cuisineHighlight]);
                  setCuisineOpen(false);
                  setCuisineHighlight(-1);
                } else {
                  setCuisineOpen(false);
                }
              } else if (e.key === "Escape") {
                setCuisineOpen(false);
              }
            }}
            style={inputStyle}
            autoComplete="off"
          />
          {cuisineOpen && (filteredCuisines.length > 0 || showCuisineAdd) && (
            <ul
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 10,
                background: "var(--bg)",
                border: "1.5px solid var(--brd)",
                borderTop: "none",
                maxHeight: 200,
                overflowY: "auto",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {showCuisineAdd && (
                <li
                  onMouseDown={() => {
                    setCuisineOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: 14,
                    cursor: "pointer",
                    color: "var(--accent)",
                    fontWeight: 500,
                    fontFamily: "var(--font-body)",
                    borderBottom:
                      filteredCuisines.length > 0
                        ? "1px solid var(--brd)"
                        : "none",
                  }}
                >
                  Add &ldquo;{cuisine.trim()}&rdquo;
                </li>
              )}
              {filteredCuisines.map((c, i) => (
                <li
                  key={c}
                  onMouseDown={() => {
                    setCuisine(c);
                    setCuisineOpen(false);
                    setCuisineHighlight(-1);
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    background:
                      i === cuisineHighlight ? "var(--bg2)" : "transparent",
                    color: "var(--txt)",
                    transition: "background 0.08s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      i === cuisineHighlight ? "var(--bg2)" : "transparent")
                  }
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

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
