"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useAuth } from "@/lib/auth-context";
import ConfirmModal from "@/components/ConfirmModal";
import { type Restaurant } from "@/lib/supabase";
import {
  extractCuisineFromTypes,
  extractNeighborhood,
  DEFAULT_CUISINE_OPTIONS,
  type OpeningHours,
} from "@/lib/google-types";
import { OCCASION_SUGGESTIONS } from "@/lib/occasions";
import { normalizeFoodTag } from "@/lib/food-tags";

type Props = {
  onSave: (entry: Omit<Restaurant, "id" | "created_at">) => Promise<boolean>;
  onClose: () => void;
  editData?: Restaurant | null;
  existingCuisines?: string[];
  existingFoodTags?: string[];
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
  existingFoodTags,
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
  // Cache the preview blob URL so it is created once per file and revoked on
  // change / unmount. Previously a new blob URL was minted on every render
  // and never released, pinning each picked photo in memory.
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);
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
  const [foodTags, setFoodTags] = useState<string[]>(editData?.food_tags ?? []);
  const [foodTagInput, setFoodTagInput] = useState("");
  const [foodTagOpen, setFoodTagOpen] = useState(false);
  const [foodTagHighlight, setFoodTagHighlight] = useState(-1);
  const foodTagWrapperRef = useRef<HTMLDivElement>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    editData?.opening_hours ?? null,
  );
  const [storefrontPhotoUrl, setStorefrontPhotoUrl] = useState<string | null>(
    editData?.storefront_photo_url ?? null,
  );

  type LinkedLocation = {
    id: number;
    name: string;
    neighborhood: string | null;
    chain_id: number | null;
  };
  const [currentChainId, setCurrentChainId] = useState<number | null>(
    editData?.chain_id ?? null,
  );
  const [linkedSiblings, setLinkedSiblings] = useState<LinkedLocation[]>([]);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState<LinkedLocation[]>([]);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [pendingCascade, setPendingCascade] = useState<{
    target: LinkedLocation;
    extraCount: number;
  } | null>(null);

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

  const foodTagOptions = Array.from(new Set(existingFoodTags ?? [])).sort();
  const normalizedFoodTagInput = normalizeFoodTag(foodTagInput);
  const filteredFoodTagOptions = foodTagOptions.filter(
    (t) =>
      !foodTags.includes(t) &&
      (!normalizedFoodTagInput || t.includes(normalizedFoodTagInput)),
  );
  const showFoodTagAdd =
    !!normalizedFoodTagInput &&
    !foodTags.includes(normalizedFoodTagInput) &&
    !foodTagOptions.some((t) => t === normalizedFoodTagInput);

  function addFoodTag(tag: string) {
    const t = normalizeFoodTag(tag);
    if (!t || foodTags.includes(t)) return;
    setFoodTags([...foodTags, t]);
    setFoodTagInput("");
    setFoodTagHighlight(-1);
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        cuisineWrapperRef.current &&
        !cuisineWrapperRef.current.contains(e.target as Node)
      ) {
        setCuisineOpen(false);
      }
      if (
        foodTagWrapperRef.current &&
        !foodTagWrapperRef.current.contains(e.target as Node)
      ) {
        setFoodTagOpen(false);
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
        const { default: imageCompression } = await import(
          "browser-image-compression"
        );
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
    const visibilityChanged = !!editData && previousVisibility !== visibility;
    const nextVisibilityChangedAt = visibilityChanged
      ? new Date().toISOString()
      : (editData?.visibility_changed_at ?? null);
    const nextPreviousVisibility = visibilityChanged
      ? previousVisibility
      : (editData?.previous_visibility ?? null);
    const nextVisibilityChangedBy = visibilityChanged
      ? (displayName ?? null)
      : (editData?.visibility_changed_by ?? null);

    const ok = await onSave({
      name: name.trim(),
      neighborhood: neighborhood.trim(),
      cuisine: cuisine.trim(),
      price,
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
      food_tags: foodTags.length > 0 ? foodTags : null,
      opening_hours: openingHours,
      visibility,
      visibility_changed_at: nextVisibilityChangedAt,
      previous_visibility: nextPreviousVisibility,
      visibility_changed_by: nextVisibilityChangedBy,
      chain_id: currentChainId,
    });

    // Chain write-through: when editing a location in a chain, propagate the
    // fields that should stay identical across siblings (curator-agnostic
    // attributes of the place). Skip this for new records and when not chained.
    let siblingSyncFailed = false;
    if (ok && editData && currentChainId != null) {
      const sharedUpdates = {
        occasions: occasions.length > 0 ? occasions : null,
        food_tags: foodTags.length > 0 ? foodTags : null,
        visibility,
        visibility_changed_at: nextVisibilityChangedAt,
        previous_visibility: nextPreviousVisibility,
        visibility_changed_by: nextVisibilityChangedBy,
      };
      const { error: syncError } = await supabase
        .from("restaurants")
        .update(sharedUpdates)
        .eq("chain_id", currentChainId)
        .neq("id", editData.id);
      if (syncError) {
        console.warn("Failed to sync shared fields to siblings:", syncError);
        siblingSyncFailed = true;
      }
    }

    setSaving(false);
    if (!ok) {
      setError("Failed to save — please try again.");
      return;
    }
    if (siblingSyncFailed) {
      // Main row saved, but siblings are out of sync. Surface it and leave the
      // modal open so the user can retry the save.
      setError(
        "Saved this location, but failed to sync shared fields to linked locations. Try saving again.",
      );
      return;
    }
    setSuccess(true);
    setTimeout(() => onClose(), 800);
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

    const archivePayload = {
      visibility: "archived" as const,
      visibility_changed_at: new Date().toISOString(),
      previous_visibility: editData.visibility,
    };

    const { error } = await supabase
      .from("restaurants")
      .update(archivePayload)
      .eq("id", editData.id);

    if (error) {
      setError("Failed to archive restaurant.");
      setSaving(false);
      return;
    }

    // Visibility is a chain-shared field — propagate archive to siblings so
    // the chain stays consistent with the save flow's write-through.
    if (currentChainId != null) {
      const { error: syncError } = await supabase
        .from("restaurants")
        .update(archivePayload)
        .eq("chain_id", currentChainId)
        .neq("id", editData.id);
      if (syncError) {
        setError(
          "Archived this location, but failed to archive linked locations.",
        );
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => {
      onClose();
      onDeleteSuccess?.();
    }, 800);
  }

  useEffect(() => {
    if (!editData || currentChainId == null) {
      setLinkedSiblings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, neighborhood, chain_id")
        .eq("chain_id", currentChainId)
        .neq("id", editData.id);
      if (!cancelled) setLinkedSiblings((data as LinkedLocation[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [editData, currentChainId]);

  useEffect(() => {
    if (!editData) {
      setLinkResults([]);
      return;
    }
    const q = linkSearch.trim();
    if (!q) {
      setLinkResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const excludeIds = [editData.id, ...linkedSiblings.map((s) => s.id)];
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, neighborhood, chain_id")
        .ilike("name", `%${q}%`)
        .not("id", "in", `(${excludeIds.join(",")})`)
        .neq("visibility", "archived")
        .limit(8);
      setLinkResults((data as LinkedLocation[]) ?? []);
    }, 200);
    return () => clearTimeout(handle);
  }, [linkSearch, linkedSiblings, editData]);

  async function handleLink(target: LinkedLocation) {
    if (!editData || linkBusy) return;

    // If the target is already in a chain with other members beyond itself,
    // linking will pull all of those members into this chain too. Surface a
    // confirm so the user knows the cascade is happening.
    if (target.chain_id != null) {
      const { data: cascadeRows } = await supabase
        .from("restaurants")
        .select("id")
        .eq("chain_id", target.chain_id)
        .neq("id", target.id);
      const extraCount = cascadeRows?.length ?? 0;
      if (extraCount > 0) {
        setPendingCascade({ target, extraCount });
        return;
      }
    }

    await performLink(target);
  }

  async function performLink(target: LinkedLocation) {
    if (!editData || linkBusy) return;
    setLinkBusy(true);
    setLinkError("");

    const selfChain = currentChainId;
    const targetChain = target.chain_id;

    let sharedChainId: number;
    if (selfChain != null && targetChain != null) {
      // Both already in chains — cascade: merge the higher chain_id into the lower
      sharedChainId = Math.min(selfChain, targetChain);
      const otherChainId = Math.max(selfChain, targetChain);
      if (sharedChainId !== otherChainId) {
        const { error } = await supabase
          .from("restaurants")
          .update({ chain_id: sharedChainId })
          .eq("chain_id", otherChainId);
        if (error) {
          setLinkError("Failed to merge chains.");
          setLinkBusy(false);
          return;
        }
      }
    } else if (selfChain != null) {
      sharedChainId = selfChain;
      const { error } = await supabase
        .from("restaurants")
        .update({ chain_id: sharedChainId })
        .eq("id", target.id);
      if (error) {
        setLinkError("Failed to link location.");
        setLinkBusy(false);
        return;
      }
    } else if (targetChain != null) {
      sharedChainId = targetChain;
      const { error } = await supabase
        .from("restaurants")
        .update({ chain_id: sharedChainId })
        .eq("id", editData.id);
      if (error) {
        setLinkError("Failed to link location.");
        setLinkBusy(false);
        return;
      }
    } else {
      // Neither has a chain — generate one using the lower id
      sharedChainId = Math.min(editData.id, target.id);
      const { error } = await supabase
        .from("restaurants")
        .update({ chain_id: sharedChainId })
        .in("id", [editData.id, target.id]);
      if (error) {
        setLinkError("Failed to link location.");
        setLinkBusy(false);
        return;
      }
    }

    setCurrentChainId(sharedChainId);
    setLinkSearch("");
    setLinkResults([]);
    setLinkBusy(false);
  }

  async function handleUnlinkSibling(siblingId: number) {
    if (!editData || linkBusy) return;
    setLinkBusy(true);
    setLinkError("");

    const { error } = await supabase
      .from("restaurants")
      .update({ chain_id: null })
      .eq("id", siblingId);
    if (error) {
      setLinkError("Failed to unlink.");
      setLinkBusy(false);
      return;
    }

    // If this unlink leaves only self in the chain, null self too (no chain-of-one)
    if (linkedSiblings.length === 1) {
      const { error: err2 } = await supabase
        .from("restaurants")
        .update({ chain_id: null })
        .eq("id", editData.id);
      if (err2) {
        setLinkError("Failed to clean up chain.");
        setLinkBusy(false);
        return;
      }
      setCurrentChainId(null);
      setLinkedSiblings([]);
    } else {
      setLinkedSiblings(linkedSiblings.filter((s) => s.id !== siblingId));
    }
    setLinkBusy(false);
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={editData ? "Edit spot" : "Add a spot"}
      className="fixed inset-0 bg-overlay-bg backdrop-blur-sm z-[100] flex items-center justify-center p-4 motion-safe:animate-backdrop-in"
    >
      <div className="bg-bg border-[1.5px] border-txt w-full max-w-[480px] max-h-[90vh] flex flex-col shadow-xl motion-safe:animate-modal-in">
        <div className="flex-shrink-0 px-6 pt-6 pb-3 flex items-start justify-between border-b border-brd">
          <p className="font-display text-2xl leading-none">
            {success
              ? editData
                ? "Spot updated!"
                : "Spot added!"
              : editData
                ? "Edit spot"
                : "Add a spot"}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            type="button"
            className="text-txt2 hover:text-txt text-2xl leading-none -mt-0.5"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden p-6 pt-3">
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

          <div ref={foodTagWrapperRef} className="mb-4 relative">
            <label className={labelCls}>Food / drink tags</label>
            <input
              value={foodTagInput}
              onChange={(e) => {
                setFoodTagInput(e.target.value);
                setFoodTagOpen(true);
                setFoodTagHighlight(-1);
              }}
              onFocus={() => setFoodTagOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setFoodTagHighlight((prev) =>
                    prev < filteredFoodTagOptions.length - 1 ? prev + 1 : prev,
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setFoodTagHighlight((prev) => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (
                    foodTagHighlight >= 0 &&
                    filteredFoodTagOptions[foodTagHighlight]
                  ) {
                    addFoodTag(filteredFoodTagOptions[foodTagHighlight]);
                  } else if (normalizedFoodTagInput) {
                    addFoodTag(normalizedFoodTagInput);
                  }
                } else if (e.key === "Escape") {
                  setFoodTagOpen(false);
                }
              }}
              placeholder="Search or add a food/drink tag (e.g. boba, ramen)"
              className="input-base"
              autoComplete="off"
            />
            {foodTagOpen &&
              (filteredFoodTagOptions.length > 0 || showFoodTagAdd) && (
                <ul className="absolute top-full left-0 right-0 z-10 bg-bg border-[1.5px] border-brd border-t-0 max-h-[200px] overflow-y-auto list-none m-0 p-0">
                  {showFoodTagAdd && (
                    <li
                      onMouseDown={() => addFoodTag(normalizedFoodTagInput)}
                      className={`py-2 px-3 text-sm cursor-pointer text-accent font-medium font-body ${filteredFoodTagOptions.length > 0 ? "border-b border-brd" : ""}`}
                    >
                      Add &ldquo;{normalizedFoodTagInput}&rdquo;
                    </li>
                  )}
                  {filteredFoodTagOptions.map((t, i) => (
                    <li
                      key={t}
                      onMouseDown={() => addFoodTag(t)}
                      className={`py-2 px-3 text-sm cursor-pointer font-body text-txt transition-colors duration-75 hover:bg-bg2 ${i === foodTagHighlight ? "bg-bg2" : "bg-transparent"}`}
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            {foodTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {foodTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-2xs font-medium px-2.5 py-1 rounded-pill border border-txt text-txt capitalize flex items-center gap-1.5"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        setFoodTags(foodTags.filter((t) => t !== tag))
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
                src={photoPreviewUrl ?? photoUrl.trim()}
                alt="Preview"
                className="mt-2 w-full h-[120px] object-cover border border-brd"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>

          {editData && !showLinkPanel && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowLinkPanel(true)}
                className="btn-outline w-full text-sm"
              >
                {linkedSiblings.length > 0
                  ? `Manage linked locations (${linkedSiblings.length})`
                  : "Link another location"}
              </button>
            </div>
          )}

          {editData && showLinkPanel && (
            <div className="mb-4 p-3 border border-brd">
              <div className="flex items-start justify-between gap-2 mb-2">
                <label className={`${labelCls} mb-0`}>Linked locations</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkPanel(false);
                    setLinkSearch("");
                    setLinkResults([]);
                  }}
                  className="text-txt2 hover:text-txt text-lg leading-none"
                  aria-label="Close linked locations"
                >
                  ×
                </button>
              </div>
              <p className="text-2xs text-txt2 mb-2">
                Linked locations share menu items and order history on the
                detail page. Visits stay per-location.
              </p>

              {linkedSiblings.length > 0 ? (
                <div className="flex flex-col gap-1.5 mb-3">
                  {linkedSiblings.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 bg-bg2 border border-brd"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{s.name}</div>
                        {s.neighborhood && (
                          <div className="text-2xs text-txt2 truncate">
                            {s.neighborhood}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlinkSibling(s.id)}
                        disabled={linkBusy}
                        className="text-2xs uppercase tracking-wide text-accent hover:underline disabled:opacity-50"
                      >
                        Unlink
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-2xs text-txt2 mb-2 italic">
                  Not linked to any other locations.
                </p>
              )}

              <div className="relative">
                <input
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  placeholder="Search to link another location…"
                  disabled={linkBusy}
                  className="input-base"
                />
                {linkResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-bg border border-brd max-h-[200px] overflow-y-auto">
                    {linkResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleLink(r)}
                        disabled={linkBusy}
                        className="w-full text-left px-2 py-1.5 hover:bg-bg2 border-b border-brd last:border-b-0 disabled:opacity-50"
                      >
                        <div className="text-sm truncate">
                          {r.name}
                          {r.chain_id != null && (
                            <span className="ml-1 text-2xs text-txt2">
                              (already in a chain)
                            </span>
                          )}
                        </div>
                        {r.neighborhood && (
                          <div className="text-2xs text-txt2 truncate">
                            {r.neighborhood}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {linkError && (
                <p className="text-error text-2xs mt-2">{linkError}</p>
              )}
            </div>
          )}

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

      {/* Chain Cascade Confirmation Modal */}
      {pendingCascade && (
        <ConfirmModal
          title="Merge chain?"
          message={`"${pendingCascade.target.name}" is already linked to ${pendingCascade.extraCount} other location${pendingCascade.extraCount === 1 ? "" : "s"}. Linking will pull all of them into this chain and they will start sharing menu items, orders, occasions, food tags, and visibility with this location.`}
          confirmText="Merge"
          cancelText="Cancel"
          onConfirm={() => {
            const target = pendingCascade.target;
            setPendingCascade(null);
            performLink(target);
          }}
          onCancel={() => setPendingCascade(null)}
        />
      )}
    </div>
  );
}
