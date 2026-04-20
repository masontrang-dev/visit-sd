"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useAuth } from "@/lib/auth-context";
import imageCompression from "browser-image-compression";
import ConfirmModal from "@/components/ConfirmModal";
import { type Restaurant } from "@/lib/supabase";
import {
  extractCuisineFromTypes,
  extractNeighborhood,
  DEFAULT_CUISINE_OPTIONS,
} from "@/lib/google-types";

type Props = {
  onSave: (entry: Omit<Restaurant, "id" | "created_at">) => Promise<boolean>;
  onClose: () => void;
  editData?: Restaurant | null;
  existingCuisines?: string[];
  onDeleteSuccess?: () => void;
};

const PRICES = ["$", "$$", "$$$", "$$$$"];

const VISIBILITIES: ("public" | "private" | "archived")[] = [
  "public",
  "private",
  "archived",
];

const VISIBILITY_LABELS: Record<"public" | "private" | "archived", string> = {
  public: "Public",
  private: "🔒 Private",
  archived: "📦 Archived",
};

const VISIBILITY_HINTS: Record<"public" | "private" | "archived", string> = {
  public: "Shown in the guide to everyone.",
  private: "Your journal only — hidden from the public guide.",
  archived: "Kept for history — hidden from the public guide.",
};

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

const PRICE_LEVEL_MAP: Record<number, string> = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$",
};

const labelCls =
  "block text-xs tracking-wide uppercase font-medium text-txt2 mb-1";

export default function AddModal({
  onSave,
  onClose,
  editData,
  existingCuisines,
  onDeleteSuccess,
}: Props) {
  const { displayName } = useAuth();
  const [name, setName] = useState(editData?.name ?? "");
  const [neighborhood, setNeighborhood] = useState(
    editData?.neighborhood ?? "",
  );
  const [cuisine, setCuisine] = useState(editData?.cuisine ?? "");
  const [price, setPrice] = useState(editData?.price ?? "$$$");
  const [addedBy, setAddedBy] = useState(
    editData?.added_by ?? displayName ?? "",
  );
  const [visibility, setVisibility] = useState<
    "public" | "private" | "archived"
  >(editData?.visibility ?? "public");
  const isPublic = visibility === "public";
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
  const [openingHours, setOpeningHours] = useState<any>(
    editData?.opening_hours ?? null,
  );
  const [storefrontPhotoUrl, setStorefrontPhotoUrl] = useState<string | null>(
    editData?.storefront_photo_url ?? null,
  );

  const cuisineOptions = Array.from(
    new Set([...DEFAULT_CUISINE_OPTIONS, ...(existingCuisines ?? [])]),
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
      // Extract neighborhood from address components with fallback chain
      if (place.address_components) {
        const hood = extractNeighborhood(place.address_components);
        if (hood) setNeighborhood(hood);
      }
      // Auto-detect cuisine from Google place types
      if (place.types) {
        const detected = extractCuisineFromTypes(place.types);
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
      // Auto-populate opening hours
      const openingHoursData =
        place.opening_hours || (place as any).current_opening_hours;
      if (openingHoursData) {
        setOpeningHours({
          weekday_text: openingHoursData.weekday_text || [],
          periods: openingHoursData.periods || [],
        });
      }
      // Auto-populate storefront photo from first Google photo
      if (place.photos && place.photos.length > 0) {
        const photoRef = place.photos[0].getUrl({ maxWidth: 800 });
        if (photoRef) {
          setStorefrontPhotoUrl(photoRef);
        }
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
            "opening_hours",
            "current_opening_hours",
            "photos",
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


    const previousVisibility = editData?.visibility ?? null;
    const visibilityChanged =
      !!editData && previousVisibility !== visibility;
    const nextVisibilityChangedAt = visibilityChanged
      ? new Date().toISOString()
      : (editData?.visibility_changed_at ?? null);
    const nextPreviousVisibility = visibilityChanged
      ? previousVisibility
      : (editData?.previous_visibility ?? null);

    const ok = await onSave({
      name: name.trim(),
      neighborhood: neighborhood.trim(),
      cuisine: cuisine.trim(),
      price,
      note: editData?.note ?? "",
      added_by: addedBy || null,
      address: address.trim() || null,
      google_maps_url: googleMapsUrl || null,
      place_id: placeId || null,
      lat,
      lng,
      photo_url: finalPhotoUrl.trim() || null,
      storefront_photo_url: storefrontPhotoUrl,
      must_try: editData?.must_try ?? false,
      must_try_since: editData?.must_try_since ?? null,
      date_added: editData?.date_added ?? null,
      last_visited: editData?.last_visited ?? null,
      google_rating: googleRating,
      google_review_count: googleReviewCount,
      my_rating: editData?.my_rating ?? null,
      occasions: occasions.length > 0 ? occasions : null,
      opening_hours: openingHours,
      visibility,
      visibility_changed_at: nextVisibilityChangedAt,
      previous_visibility: nextPreviousVisibility,
    });

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
      .update({
        visibility: "archived",
        visibility_changed_at: new Date().toISOString(),
        previous_visibility: editData.visibility,
      })
      .eq("id", editData.id);

    if (error) {
      setError("Failed to archive restaurant.");
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

        <div className="mb-4">
          <label className={labelCls}>Visibility</label>
          <div className="flex gap-2">
            {VISIBILITIES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={`flex-1 p-2 text-sm font-medium border-[1.5px] cursor-pointer font-body rounded-none transition-all duration-[0.12s] ${
                  visibility === v
                    ? "bg-txt text-bg border-txt"
                    : "bg-transparent text-txt2 border-brd"
                }`}
              >
                {VISIBILITY_LABELS[v]}
              </button>
            ))}
          </div>
          <p className="text-2xs text-txt2 mt-1.5">
            {VISIBILITY_HINTS[visibility]}
          </p>
        </div>


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
          {editData && editData.visibility !== "archived" && (
            <button
              onClick={handleDeleteClick}
              disabled={saving || success}
              className="btn-outline !border-accent !text-accent hover:!bg-accent hover:!text-white"
            >
              Archive
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
          title="Archive Restaurant"
          message={`Archive "${editData.name}"? It will be hidden from public listings but can be restored from the admin view.`}
          confirmText="Archive"
          cancelText="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
