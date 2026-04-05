"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useAuth } from "@/lib/auth-context";
import imageCompression from "browser-image-compression";
import ConfirmModal from "@/components/ConfirmModal";
import { type Restaurant } from "@/lib/supabase";

type Props = {
  onSave: (entry: Omit<Restaurant, "id" | "created_at">) => Promise<boolean>;
  onClose: () => void;
  editData?: Restaurant | null;
  existingCuisines?: string[];
  onDeleteSuccess?: () => void;
};

const PRICES = ["$", "$$", "$$$", "$$$$"];

const OCCASION_SUGGESTIONS = [
  "casual",
  "date-friendly",
  "family-friendly",
  "quick-bite",
  "special-occasion",
  "group-dining",
  "late-night",
  "brunch-spot",
  "romantic",
  "business-lunch",
];

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

const labelCls =
  "block text-xs tracking-wide uppercase font-medium text-txt2 mb-1";

export default function AddModal({
  onSave,
  onClose,
  editData,
  existingCuisines,
  onDeleteSuccess,
}: Props) {
  const { username } = useAuth();
  const [name, setName] = useState(editData?.name ?? "");
  const [neighborhood, setNeighborhood] = useState(
    editData?.neighborhood ?? "",
  );
  const [cuisine, setCuisine] = useState(editData?.cuisine ?? "");
  const [price, setPrice] = useState(editData?.price ?? "$$$");
  const [note, setNote] = useState(editData?.note ?? "");
  const [addedBy, setAddedBy] = useState(editData?.added_by ?? username ?? "");
  const [mustTry, setMustTry] = useState(editData?.must_try ?? false);
  const [myRating, setMyRating] = useState<number | null>(
    editData?.my_rating ?? null,
  );
  const [ratingNotes, setRatingNotes] = useState("");
  const [googleRating, setGoogleRating] = useState<number | null>(
    editData?.google_rating ?? null,
  );
  const [googleReviewCount, setGoogleReviewCount] = useState<number | null>(
    editData?.google_review_count ?? null,
  );
  const [photoUrl, setPhotoUrl] = useState(editData?.photo_url ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cuisineOpen, setCuisineOpen] = useState(false);
  const [cuisineHighlight, setCuisineHighlight] = useState(-1);
  const cuisineWrapperRef = useRef<HTMLDivElement>(null);
  const [occasions, setOccasions] = useState<string[]>(
    editData?.occasions ?? [],
  );
  const [occasionInput, setOccasionInput] = useState("");

  const cuisineOptions = Array.from(
    new Set([...(existingCuisines ?? []), ...DEFAULT_CUISINE_OPTIONS]),
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
        const name = encodeURIComponent(place.name || "");
        setGoogleMapsUrl(
          `https://www.google.com/maps/search/?api=1&query=${name}&query_place_id=${place.place_id}`,
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
      // Auto-populate Google rating
      if (place.rating != null) {
        setGoogleRating(place.rating);
      }
      if (place.user_ratings_total != null) {
        setGoogleReviewCount(place.user_ratings_total);
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
            "rating",
            "user_ratings_total",
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

    let finalPhotoUrl = photoUrl;

    // Upload photo file if one was selected
    if (photoFile) {
      setUploading(true);

      // Delete old photo if it exists (when editing)
      if (editData?.photo_url) {
        try {
          // Extract filename from the old photo URL
          const oldUrl = editData.photo_url;
          const urlParts = oldUrl.split("/restaurant-photos/");
          if (urlParts.length > 1) {
            const oldFileName = urlParts[1];
            console.log("Deleting old photo:", oldFileName);

            const { error: deleteError } = await supabase.storage
              .from("restaurant-photos")
              .remove([oldFileName]);

            if (deleteError) {
              console.warn("Failed to delete old photo:", deleteError);
              // Continue anyway - don't block the upload
            } else {
              console.log("Old photo deleted successfully");
            }
          }
        } catch (deleteErr) {
          console.warn("Error deleting old photo:", deleteErr);
          // Continue anyway - don't block the upload
        }
      }

      // Compress image before upload
      let fileToUpload = photoFile;
      try {
        const options = {
          maxSizeMB: 0.5, // Max 500KB
          maxWidthOrHeight: 1920, // Max dimension
          useWebWorker: true,
          fileType: "image/jpeg", // Convert to JPEG for better compression
        };
        fileToUpload = await imageCompression(photoFile, options);
      } catch (compressionError) {
        console.warn(
          "Image compression failed, uploading original:",
          compressionError,
        );
      }

      const fileExt = "jpg"; // Always use jpg after compression
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("restaurant-photos")
        .upload(fileName, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });
      setUploading(false);

      if (uploadError) {
        setError("Failed to upload photo. Please try again.");
        setSaving(false);
        return;
      }

      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("restaurant-photos")
          .getPublicUrl(uploadData.path);
        finalPhotoUrl = urlData.publicUrl;
        console.log("Photo uploaded successfully. URL:", finalPhotoUrl);
      }
    }

    console.log("Saving restaurant with photo_url:", finalPhotoUrl);

    // Track rating change for history
    const ratingChanged =
      editData && myRating !== null && myRating !== editData.my_rating;

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
      photo_url: finalPhotoUrl.trim() || null,
      storefront_photo_url: editData?.storefront_photo_url ?? null,
      must_try: mustTry,
      date_added: editData?.date_added ?? null,
      last_visited: editData?.last_visited ?? null,
      google_rating: googleRating,
      google_review_count: googleReviewCount,
      my_rating: myRating,
      occasions: occasions.length > 0 ? occasions : null,
      is_open_now: editData?.is_open_now ?? null,
      hours_text: editData?.hours_text ?? null,
      opening_hours: editData?.opening_hours ?? null,
    });

    // Save rating history if rating changed
    if (ok && ratingChanged && editData && myRating !== null) {
      await supabase.from("rating_history").insert({
        restaurant_id: editData.id,
        rating: myRating,
        changed_by: username || "Unknown",
        notes: ratingNotes.trim() || null,
      });
    }
    setSaving(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => onClose(), 800);
    } else {
      setError("Failed to save — please try again.");
    }
  }

  function handleDeleteClick() {
    if (!editData) return;
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (!editData) return;
    setSaving(true);
    setError("");
    setShowDeleteConfirm(false);

    const { error } = await supabase
      .from("restaurants")
      .delete()
      .eq("id", editData.id);

    if (error) {
      setError("Failed to delete restaurant.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => {
      onClose();
      onDeleteSuccess?.();
    }, 800);
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-black/55 z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-bg border-2 border-txt p-6 w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        <p className="font-display text-2xl mb-5">
          {success
            ? editData
              ? "Spot updated!"
              : "Spot added!"
            : editData
              ? "Edit spot"
              : "Add a spot"}
        </p>

        {success && (
          <p className="text-success text-sm mb-4">
            {editData
              ? "Changes saved successfully."
              : "Restaurant saved successfully."}
          </p>
        )}

        {!editData && (
          <div className="mb-4">
            <label className={labelCls}>Search Google Places</label>
            <input
              ref={autocompleteRef}
              placeholder="Search for a restaurant..."
              className="input-base"
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
          <div key={field.label} className="mb-4">
            <label className={labelCls}>{field.label}</label>
            <input
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              placeholder={field.placeholder}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="input-base"
            />
          </div>
        ))}

        <div ref={cuisineWrapperRef} className="mb-4 relative">
          <label className={labelCls}>Cuisine type</label>
          <input
            value={cuisine}
            onChange={(e) => {
              setCuisine(e.target.value);
              setCuisineOpen(true);
              setCuisineHighlight(-1);
            }}
            placeholder="Search or type a cuisine..."
            onFocus={() => setCuisineOpen(true)}
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
                  const picked = filteredCuisines[cuisineHighlight];
                  setCuisine(picked);
                  setCuisineOpen(false);
                  setCuisineHighlight(-1);
                } else {
                  setCuisineOpen(false);
                }
              } else if (e.key === "Escape") {
                setCuisineOpen(false);
              }
            }}
            className="input-base"
            autoComplete="off"
          />
          {cuisineOpen && (filteredCuisines.length > 0 || showCuisineAdd) && (
            <ul className="absolute top-full left-0 right-0 z-10 bg-bg border-[1.5px] border-brd border-t-0 max-h-[200px] overflow-y-auto list-none m-0 p-0">
              {showCuisineAdd && (
                <li
                  onMouseDown={() => {
                    setCuisineOpen(false);
                  }}
                  className={`py-2 px-3 text-sm cursor-pointer text-accent font-medium font-body ${filteredCuisines.length > 0 ? "border-b border-brd" : ""}`}
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
                  className={`py-2 px-3 text-sm cursor-pointer font-body text-txt transition-colors duration-75 hover:bg-bg2 ${i === cuisineHighlight ? "bg-bg2" : "bg-transparent"}`}
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-4">
          <label className={labelCls}>Price range</label>
          <div className="flex gap-2">
            {PRICES.map((p) => (
              <button
                key={p}
                onClick={() => setPrice(p)}
                className={`flex-1 p-2 text-sm font-medium border-[1.5px] cursor-pointer font-body rounded-none transition-all duration-[0.12s] ${
                  price === p
                    ? "bg-txt text-bg border-txt"
                    : "bg-transparent text-txt2 border-brd"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className={labelCls}>Occasion Tags</label>
          <div className="mb-2">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={occasionInput}
                onChange={(e) => setOccasionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && occasionInput.trim()) {
                    e.preventDefault();
                    const tag = occasionInput.trim().toLowerCase();
                    if (!occasions.includes(tag)) {
                      setOccasions([...occasions, tag]);
                    }
                    setOccasionInput("");
                  }
                }}
                placeholder="Add occasion tag..."
                className="input-base flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (occasionInput.trim()) {
                    const tag = occasionInput.trim().toLowerCase();
                    if (!occasions.includes(tag)) {
                      setOccasions([...occasions, tag]);
                    }
                    setOccasionInput("");
                  }
                }}
                className="btn-outline !py-2 !px-4 !border-txt !text-txt"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {OCCASION_SUGGESTIONS.filter((s) => !occasions.includes(s)).map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setOccasions([...occasions, suggestion])}
                    className="text-2xs px-2 py-1 border border-brd text-txt2 hover:border-txt hover:text-txt transition-colors capitalize"
                  >
                    + {suggestion}
                  </button>
                ),
              )}
            </div>
            {occasions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {occasions.map((tag) => (
                  <span
                    key={tag}
                    className="text-2xs font-medium px-2.5 py-1 rounded-pill border border-txt text-txt capitalize flex items-center gap-1.5"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        setOccasions(occasions.filter((t) => t !== tag))
                      }
                      className="text-txt hover:text-accent transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className={labelCls}>Must-Try</label>
          <button
            type="button"
            onClick={() => setMustTry(!mustTry)}
            className={`chip ${
              mustTry ? "!bg-accent !text-white !border-accent" : ""
            }`}
          >
            {mustTry ? "★ Must-Try" : "☆ Mark as Must-Try"}
          </button>
        </div>

        <div className="mb-4">
          <label className={labelCls}>My Rating</label>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setMyRating(myRating === star ? null : star)}
                className="text-3xl cursor-pointer bg-transparent border-none p-0 transition-all duration-100 hover:scale-110"
                style={{
                  color: myRating && star <= myRating ? "#D85A30" : "#D3D1C7",
                }}
              >
                ★
              </button>
            ))}
            {myRating !== null && (
              <button
                type="button"
                onClick={() => setMyRating(null)}
                className="text-xs text-txt2 ml-2 bg-transparent border-none cursor-pointer hover:text-accent"
              >
                Clear
              </button>
            )}
          </div>
          {editData && myRating !== null && myRating !== editData.my_rating && (
            <div>
              <input
                value={ratingNotes}
                onChange={(e) => setRatingNotes(e.target.value)}
                placeholder="Why did your rating change? (optional)"
                className="input-base text-xs"
              />
            </div>
          )}
        </div>

        {googleRating !== null && (
          <div className="mb-4 p-3 bg-bg2 border border-brd">
            <label className="text-2xs tracking-wide uppercase font-medium text-txt2 mb-1 block">
              Google Rating (auto-populated)
            </label>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-accent">★</span>
              <span className="font-medium text-txt">
                {googleRating.toFixed(1)}
              </span>
              {googleReviewCount && (
                <span className="text-txt2">
                  ({googleReviewCount.toLocaleString()} reviews)
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className={labelCls}>Photo</label>
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPhotoFile(file);
                  setPhotoUrl(""); // Clear URL if file is selected
                }
              }}
              className="text-sm text-txt2 file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-[1.5px] file:border-brd file:text-sm file:font-medium file:bg-transparent file:text-txt2 file:cursor-pointer hover:file:bg-bg2"
            />
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-brd" />
              <span className="text-xs text-txt2 uppercase tracking-wide">
                or
              </span>
              <div className="flex-1 h-px bg-brd" />
            </div>
            <input
              value={photoUrl}
              onChange={(e) => {
                setPhotoUrl(e.target.value);
                setPhotoFile(null); // Clear file if URL is entered
              }}
              placeholder="Paste image URL"
              className="input-base"
              disabled={!!photoFile}
            />
          </div>
          {(photoFile || photoUrl.trim()) && (
            <img
              src={photoFile ? URL.createObjectURL(photoFile) : photoUrl.trim()}
              alt="Preview"
              className="mt-2 w-full h-[120px] object-cover border border-brd"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>

        <div className="mb-4">
          <label className={labelCls}>Why you love it</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What makes this place special?"
            rows={3}
            className="input-base resize-y leading-relaxed"
          />
        </div>

        {error && <p className="text-error text-sm mb-2">{error}</p>}

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="btn-primary flex-1"
          >
            {uploading
              ? "Uploading photo..."
              : saving
                ? "Saving..."
                : success
                  ? "Saved!"
                  : editData
                    ? "Save changes"
                    : "Save restaurant"}
          </button>
          {editData && (
            <button
              onClick={handleDeleteClick}
              disabled={saving || success}
              className="btn-outline !border-accent !text-accent hover:!bg-accent hover:!text-white"
            >
              Delete
            </button>
          )}
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && editData && (
        <ConfirmModal
          title="Delete Restaurant"
          message={`Are you sure you want to delete "${editData.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
