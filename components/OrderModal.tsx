"use client";

import { useState, useEffect, useRef } from "react";
import {
  supabase,
  type MenuItem,
  type ItemOrder,
  type DrinkDetails,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import imageCompression from "browser-image-compression";

type Props = {
  restaurantId: number;
  onClose: () => void;
  onSaved: () => void;
  editOrder?: ItemOrder | null;
  editMenuItem?: MenuItem | null;
  prefillFromOrder?: ItemOrder | null;
  prefillMenuItem?: MenuItem | null;
};

const CATEGORIES = ["food", "drink", "dessert", "boba"];

const SWEETNESS_DESCRIPTORS: { label: string; value: number }[] = [
  { label: "No sugar", value: 0 },
  { label: "25%", value: 25 },
  { label: "Half sweet", value: 50 },
  { label: "Less sweet", value: 75 },
  { label: "Full sweet", value: 100 },
];

const ICE_DESCRIPTORS: { label: string; value: number }[] = [
  { label: "No ice", value: 0 },
  { label: "Light ice", value: 25 },
  { label: "Less ice", value: 40 },
  { label: "Regular", value: 50 },
  { label: "Extra ice", value: 100 },
];

const DEFAULT_TOPPINGS = [
  "Tapioca pearls (boba)",
  "Popping boba",
  "Grass jelly",
  "Pudding",
  "Lychee jelly",
  "Aloe vera",
  "Red bean",
  "Cheese foam",
];

const BOBA_SIZES = ["Small", "Medium", "Large", "Extra Large"];
const CAFE_SIZES = ["Small", "Medium", "Large"];
const BOBA_TEMPS = ["Hot", "Warm", "Iced"];
const CAFE_TEMPS = ["Hot", "Iced"];
const MILK_TYPES = ["Whole", "Oat", "Almond", "Soy", "Coconut", "None"];

const labelCls =
  "block text-xs tracking-wide uppercase font-medium text-txt2 mb-1";

export default function OrderModal({
  restaurantId,
  onClose,
  onSaved,
  editOrder = null,
  editMenuItem = null,
  prefillFromOrder = null,
  prefillMenuItem = null,
}: Props) {
  const { user } = useAuth();
  const isEditing = !!editOrder;
  // Seed initial form values from either the order being edited or a prefill source.
  const sourceOrder = editOrder ?? prefillFromOrder;
  const sourceItem = editMenuItem ?? prefillMenuItem;
  const sourceDrink = (sourceOrder?.drink_details as DrinkDetails) ?? null;

  // Menu item state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState(sourceItem?.name ?? "");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(
    sourceItem ?? null,
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Order fields
  const [selectedCategory, setSelectedCategory] = useState(
    sourceItem?.category ?? "food",
  );
  const [liked, setLiked] = useState<boolean | null>(
    sourceOrder?.liked ?? null,
  );

  // Determine form type based on current category selection
  const formType =
    selectedCategory === "boba"
      ? "boba"
      : selectedCategory === "drink"
        ? "cafe"
        : "standard";
  const [notes, setNotes] = useState(sourceOrder?.notes ?? "");
  const [orderedAt, setOrderedAt] = useState(
    // Edits keep the original date; prefills default to today.
    editOrder?.ordered_at ?? new Date().toISOString().slice(0, 10),
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  // Photos are per-visit and do not carry over from a prefill source.
  const [photoUrl, setPhotoUrl] = useState(
    isEditing ? (editOrder?.photo_url ?? "") : "",
  );

  // Boba fields
  const [sweetnessStyle, setSweetnessStyle] = useState<
    "descriptive" | "percentage"
  >(sourceDrink?.sweetness?.style ?? "descriptive");
  const [sweetnessValue, setSweetnessValue] = useState(
    sourceDrink?.sweetness?.value ?? 75,
  );
  const [iceStyle, setIceStyle] = useState<"descriptive" | "percentage">(
    sourceDrink?.ice?.style ?? "descriptive",
  );
  const [iceValue, setIceValue] = useState(sourceDrink?.ice?.value ?? 50);
  const [toppings, setToppings] = useState<string[]>(
    sourceDrink?.toppings ?? [],
  );
  const [customTopping, setCustomTopping] = useState("");

  // Shared cafe/boba fields
  const [size, setSize] = useState<string | null>(sourceDrink?.size ?? null);
  const [temperature, setTemperature] = useState<string | null>(
    sourceDrink?.temperature ?? null,
  );

  // Cafe-only fields
  const [milkType, setMilkType] = useState<string | null>(
    sourceDrink?.milk_type ?? null,
  );
  const [shots, setShots] = useState<number | null>(sourceDrink?.shots ?? null);

  // Past orders (for one-tap repeat logging)
  const [pastOrders, setPastOrders] = useState<ItemOrder[]>([]);
  const [pastOrdersDismissed, setPastOrdersDismissed] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadMenuItems() {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");
      setMenuItems(data ?? []);
    }
    loadMenuItems();
  }, [restaurantId]);

  useEffect(() => {
    async function loadPastOrders() {
      const { data } = await supabase
        .from("item_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("ordered_at", { ascending: false });
      setPastOrders((data ?? []) as ItemOrder[]);
    }
    loadPastOrders();
  }, [restaurantId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = menuSearch.trim()
    ? menuItems.filter((m) =>
        m.name.toLowerCase().includes(menuSearch.trim().toLowerCase()),
      )
    : menuItems;

  const showCreateNew =
    menuSearch.trim() &&
    !menuItems.some(
      (m) => m.name.toLowerCase() === menuSearch.trim().toLowerCase(),
    );

  function selectMenuItem(item: MenuItem) {
    setSelectedItem(item);
    setMenuSearch(item.name);
    if (item.category) setSelectedCategory(item.category);
    setShowDropdown(false);
    setHighlightIdx(-1);
  }

  function getSweetnessLabel(value: number): string {
    const match = SWEETNESS_DESCRIPTORS.find((d) => d.value === value);
    return match ? match.label : `${value}%`;
  }

  function getIceLabel(value: number): string {
    const match = ICE_DESCRIPTORS.find((d) => d.value === value);
    return match ? match.label : `${value}%`;
  }

  function buildDrinkDetails(): DrinkDetails | null {
    if (formType === "standard") return null;

    const details: DrinkDetails = {};

    if (formType === "boba") {
      details.sweetness = {
        style: sweetnessStyle,
        value: sweetnessValue,
        label: getSweetnessLabel(sweetnessValue),
      };
      details.ice = {
        style: iceStyle,
        value: iceValue,
        label: getIceLabel(iceValue),
      };
      if (toppings.length > 0) details.toppings = toppings;
    }

    if (formType === "boba" || formType === "cafe") {
      if (size) details.size = size;
      if (temperature) details.temperature = temperature;
    }

    if (formType === "cafe") {
      if (milkType) details.milk_type = milkType;
      if (shots) details.shots = shots;
    }

    return Object.keys(details).length > 0 ? details : null;
  }

  async function handleSave() {
    if (!menuSearch.trim() || saving) return;
    setSaving(true);
    setError("");

    let menuItemId: number;

    // Create or use existing menu item
    if (selectedItem) {
      menuItemId = selectedItem.id;
      // Update category if changed
      if (selectedItem.category !== selectedCategory) {
        await supabase
          .from("menu_items")
          .update({ category: selectedCategory })
          .eq("id", menuItemId);
      }
    } else {
      // Create new menu item
      const { data: newItem, error: createError } = await supabase
        .from("menu_items")
        .insert([
          {
            restaurant_id: restaurantId,
            name: menuSearch.trim(),
            category: selectedCategory,
          },
        ])
        .select()
        .single();

      if (createError || !newItem) {
        setError("Failed to create menu item.");
        setSaving(false);
        return;
      }
      menuItemId = newItem.id;
    }

    // Upload photo if present
    let finalPhotoUrl: string | null = null;
    if (photoFile) {
      setUploading(true);
      let fileToUpload = photoFile;
      try {
        fileToUpload = await imageCompression(photoFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: "image/jpeg",
        });
      } catch {
        // Use original if compression fails
      }

      const fileName = `${restaurantId}/${menuItemId}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(fileName, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });
      setUploading(false);

      if (uploadError) {
        setError("Failed to upload photo.");
        setSaving(false);
        return;
      }

      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("item-photos")
          .getPublicUrl(uploadData.path);
        finalPhotoUrl = urlData.publicUrl;
      }
    } else if (photoUrl.trim()) {
      finalPhotoUrl = photoUrl.trim();
    }

    // Insert or update order
    const drinkDetails = buildDrinkDetails();
    const basePayload = {
      menu_item_id: menuItemId,
      restaurant_id: restaurantId,
      ordered_at: orderedAt,
      liked,
      notes: notes.trim() || null,
      photo_url: finalPhotoUrl,
      drink_details: drinkDetails,
    };

    if (isEditing) {
      const { error: orderError } = await supabase
        .from("item_orders")
        .update(basePayload)
        .eq("id", editOrder!.id);
      if (orderError) {
        setError("Failed to update order.");
        setSaving(false);
        return;
      }
    } else {
      if (!user) {
        setError("You must be signed in to log an order.");
        setSaving(false);
        return;
      }
      const { error: orderError } = await supabase
        .from("item_orders")
        .insert([{ ...basePayload, ordered_by: user.id }]);
      if (orderError) {
        setError("Failed to save order.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => {
      onSaved();
      onClose();
    }, 800);
  }

  async function handleLogAgainPastOrder(past: ItemOrder) {
    if (saving) return;
    if (!user) {
      setError("You must be signed in to log an order.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("item_orders").insert([
      {
        menu_item_id: past.menu_item_id,
        restaurant_id: past.restaurant_id,
        ordered_at: new Date().toISOString().slice(0, 10),
        liked: past.liked,
        notes: past.notes,
        drink_details: past.drink_details,
        photo_url: null,
        ordered_by: user.id,
      },
    ]);
    setSaving(false);
    if (insertError) {
      setError("Failed to log order.");
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      onSaved();
      onClose();
    }, 800);
  }

  function handleAdjustAndLogPastOrder(past: ItemOrder) {
    const item = menuItems.find((m) => m.id === past.menu_item_id) ?? null;
    if (item) {
      setSelectedItem(item);
      setMenuSearch(item.name);
      if (item.category) setSelectedCategory(item.category);
    }
    setLiked(past.liked);
    setNotes(past.notes ?? "");
    setOrderedAt(new Date().toISOString().slice(0, 10));
    setPhotoFile(null);
    setPhotoUrl("");

    const drink = (past.drink_details as DrinkDetails) ?? null;
    if (drink) {
      if (drink.sweetness) {
        setSweetnessStyle(drink.sweetness.style);
        setSweetnessValue(drink.sweetness.value);
      }
      if (drink.ice) {
        setIceStyle(drink.ice.style);
        setIceValue(drink.ice.value);
      }
      setToppings(drink.toppings ?? []);
      setSize(drink.size ?? null);
      setTemperature(drink.temperature ?? null);
      setMilkType(drink.milk_type ?? null);
      setShots(drink.shots ?? null);
    }
    setPastOrdersDismissed(true);
    setTimeout(() => {
      dropdownRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function formatDrinkSummary(details: DrinkDetails | null): string {
    if (!details) return "";
    const parts: string[] = [];
    if (details.sweetness) parts.push(details.sweetness.label);
    if (details.ice) parts.push(details.ice.label);
    if (details.toppings && details.toppings.length > 0)
      parts.push(details.toppings.join(" + "));
    if (details.size) parts.push(details.size);
    if (details.temperature) parts.push(details.temperature);
    if (details.milk_type) parts.push(details.milk_type + " milk");
    if (details.shots) parts.push(`${details.shots} shot${details.shots > 1 ? "s" : ""}`);
    return parts.join(" · ");
  }

  // Most recent order per menu item, sorted by recency (pastOrders is pre-sorted desc).
  const groupedPast: ItemOrder[] = (() => {
    const seen = new Set<number>();
    const result: ItemOrder[] = [];
    for (const o of pastOrders) {
      if (!seen.has(o.menu_item_id)) {
        seen.add(o.menu_item_id);
        result.push(o);
      }
    }
    return result;
  })();
  const visiblePast = showAllPast ? groupedPast : groupedPast.slice(0, 5);
  const showPastOrdersSection =
    !isEditing &&
    !prefillFromOrder &&
    !pastOrdersDismissed &&
    groupedPast.length > 0;

  function toggleTopping(topping: string) {
    setToppings((prev) =>
      prev.includes(topping)
        ? prev.filter((t) => t !== topping)
        : [...prev, topping],
    );
  }

  function addCustomTopping() {
    const t = customTopping.trim();
    if (t && !toppings.includes(t)) {
      setToppings((prev) => [...prev, t]);
      setCustomTopping("");
    }
  }

  // Snap slider to 5% increments
  function snapTo5(value: number): number {
    return Math.round(value / 5) * 5;
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-black/55 z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-bg border-2 border-txt p-6 w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        <p className="font-display text-2xl mb-5">
          {success
            ? isEditing
              ? "Order updated!"
              : "Order logged!"
            : isEditing
              ? "Edit order"
              : "Log an order"}
        </p>

        {success && (
          <p className="text-accent2 text-sm mb-4">
            {isEditing
              ? "Order updated successfully."
              : "Order saved successfully."}
          </p>
        )}

        {/* Past orders — one-tap repeat logging */}
        {showPastOrdersSection && (
          <div className="mb-5 border-[1.5px] border-brd p-3">
            <p className="text-xs tracking-wide uppercase font-medium text-txt2 mb-2">
              Your past orders here
            </p>
            <div className="space-y-2">
              {visiblePast.map((past) => {
                const item = menuItems.find((m) => m.id === past.menu_item_id);
                if (!item) return null;
                const drinkSummary = formatDrinkSummary(
                  past.drink_details as DrinkDetails | null,
                );
                return (
                  <div
                    key={past.id}
                    className="flex items-start gap-2 p-2 bg-bg2 border border-brd"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-txt leading-tight">
                        {item.name}
                      </p>
                      {drinkSummary && (
                        <p className="text-2xs text-txt2 leading-snug mt-0.5">
                          {drinkSummary}
                        </p>
                      )}
                      <p className="text-2xs text-txt2 opacity-70 mt-0.5">
                        {past.liked === true
                          ? "👍"
                          : past.liked === false
                            ? "👎"
                            : "—"}
                        {" · "}
                        last {new Date(past.ordered_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => handleLogAgainPastOrder(past)}
                        disabled={saving || success}
                        className="py-1 px-2 text-2xs font-medium bg-accent text-white border-[1.5px] border-accent cursor-pointer disabled:opacity-50"
                      >
                        Log again
                      </button>
                      <button
                        onClick={() => handleAdjustAndLogPastOrder(past)}
                        disabled={saving || success}
                        className="py-1 px-2 text-2xs font-medium bg-transparent text-txt2 border-[1.5px] border-brd cursor-pointer disabled:opacity-50"
                      >
                        Adjust & log
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {groupedPast.length > 5 && (
              <button
                onClick={() => setShowAllPast((v) => !v)}
                className="mt-2 text-xs text-accent2 bg-transparent border-none cursor-pointer"
              >
                {showAllPast
                  ? "Show less"
                  : `Show ${groupedPast.length - 5} more`}
              </button>
            )}
            <button
              onClick={() => setPastOrdersDismissed(true)}
              className="mt-2 text-xs text-txt2 bg-transparent border-none cursor-pointer block"
            >
              Or log a brand new item ↓
            </button>
          </div>
        )}

        {/* Menu item search/select */}
        <div ref={dropdownRef} className="mb-4 relative">
          <label className={labelCls}>Menu item</label>
          <input
            value={menuSearch}
            onChange={(e) => {
              setMenuSearch(e.target.value);
              setSelectedItem(null);
              setShowDropdown(true);
              setHighlightIdx(-1);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={(e) => {
              const items = filteredItems;
              const offset = showCreateNew ? 1 : 0;
              const total = items.length + offset;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIdx((prev) => (prev < total - 1 ? prev + 1 : prev));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIdx((prev) => (prev > 0 ? prev - 1 : -1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (showCreateNew && highlightIdx === 0) {
                  // "Create new" selected — just close dropdown, use typed name
                  setShowDropdown(false);
                  setHighlightIdx(-1);
                } else if (
                  highlightIdx >= offset &&
                  items[highlightIdx - offset]
                ) {
                  selectMenuItem(items[highlightIdx - offset]);
                } else {
                  setShowDropdown(false);
                }
              } else if (e.key === "Escape") {
                setShowDropdown(false);
              }
            }}
            placeholder="Search or type a new item..."
            className="input-base"
            autoComplete="off"
          />
          {showDropdown && (filteredItems.length > 0 || showCreateNew) && (
            <ul className="absolute top-full left-0 right-0 z-10 bg-bg border-[1.5px] border-brd border-t-0 max-h-[200px] overflow-y-auto list-none m-0 p-0">
              {showCreateNew && (
                <li
                  onMouseDown={() => {
                    setShowDropdown(false);
                    setHighlightIdx(-1);
                  }}
                  className={`py-2 px-3 text-sm cursor-pointer text-accent font-medium font-body ${filteredItems.length > 0 ? "border-b border-brd" : ""} ${highlightIdx === 0 ? "bg-bg2" : ""}`}
                >
                  Create &ldquo;{menuSearch.trim()}&rdquo;
                </li>
              )}
              {filteredItems.map((item, i) => {
                const idx = i + (showCreateNew ? 1 : 0);
                return (
                  <li
                    key={item.id}
                    onMouseDown={() => selectMenuItem(item)}
                    className={`py-2 px-3 text-sm cursor-pointer font-body text-txt transition-colors duration-75 hover:bg-bg2 ${idx === highlightIdx ? "bg-bg2" : "bg-transparent"}`}
                  >
                    <span>{item.name}</span>
                    {item.category && (
                      <span className="ml-2 text-xs text-txt2">
                        {item.category}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className={labelCls}>Category</label>
          <div className="flex gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`flex-1 p-2 text-sm font-medium border-[1.5px] cursor-pointer font-body rounded-none transition-all duration-[0.12s] capitalize ${
                  selectedCategory === c
                    ? "bg-txt text-bg border-txt"
                    : "bg-transparent text-txt2 border-brd"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Verdict — thumbs up/down (nullable) */}
        <div className="mb-4">
          <label className={labelCls}>Verdict</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLiked(liked === true ? null : true)}
              className={`flex-1 p-2 text-sm font-medium border-[1.5px] cursor-pointer font-body rounded-none transition-all duration-[0.12s] ${
                liked === true
                  ? "bg-accent2 text-white border-accent2"
                  : "bg-transparent text-txt2 border-brd"
              }`}
            >
              👍 Liked
            </button>
            <button
              onClick={() => setLiked(liked === false ? null : false)}
              className={`flex-1 p-2 text-sm font-medium border-[1.5px] cursor-pointer font-body rounded-none transition-all duration-[0.12s] ${
                liked === false
                  ? "bg-txt text-bg border-txt"
                  : "bg-transparent text-txt2 border-brd"
              }`}
            >
              👎 Didn&rsquo;t like
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="mb-4">
          <label className={labelCls}>Date ordered</label>
          <input
            type="date"
            value={orderedAt}
            onChange={(e) => setOrderedAt(e.target.value)}
            className="input-base"
          />
        </div>

        {/* Boba-specific fields */}
        {formType === "boba" && (
          <>
            {/* Sweetness */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + " mb-0"}>Sweetness</label>
                <button
                  onClick={() =>
                    setSweetnessStyle(
                      sweetnessStyle === "descriptive"
                        ? "percentage"
                        : "descriptive",
                    )
                  }
                  className="text-xs text-accent2 bg-transparent border-none cursor-pointer font-body"
                >
                  {sweetnessStyle === "descriptive"
                    ? "Switch to %"
                    : "Switch to labels"}
                </button>
              </div>
              {sweetnessStyle === "descriptive" ? (
                <div className="flex gap-1.5 flex-wrap">
                  {SWEETNESS_DESCRIPTORS.map((d) => (
                    <button
                      key={d.label}
                      onClick={() => setSweetnessValue(d.value)}
                      className={`py-1.5 px-3 text-xs font-medium border-[1.5px] cursor-pointer font-body rounded-pill transition-all duration-[0.12s] ${
                        sweetnessValue === d.value
                          ? "bg-txt text-bg border-txt"
                          : "bg-transparent text-txt2 border-brd"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={sweetnessValue}
                    onChange={(e) =>
                      setSweetnessValue(snapTo5(parseInt(e.target.value)))
                    }
                    className="flex-1 accent-accent"
                  />
                  <span className="text-sm font-medium text-txt min-w-[40px] text-right">
                    {sweetnessValue}%
                  </span>
                </div>
              )}
            </div>

            {/* Ice */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + " mb-0"}>Ice level</label>
                <button
                  onClick={() =>
                    setIceStyle(
                      iceStyle === "descriptive" ? "percentage" : "descriptive",
                    )
                  }
                  className="text-xs text-accent2 bg-transparent border-none cursor-pointer font-body"
                >
                  {iceStyle === "descriptive"
                    ? "Switch to %"
                    : "Switch to labels"}
                </button>
              </div>
              {iceStyle === "descriptive" ? (
                <div className="flex gap-1.5 flex-wrap">
                  {ICE_DESCRIPTORS.map((d) => (
                    <button
                      key={d.label}
                      onClick={() => setIceValue(d.value)}
                      className={`py-1.5 px-3 text-xs font-medium border-[1.5px] cursor-pointer font-body rounded-pill transition-all duration-[0.12s] ${
                        iceValue === d.value
                          ? "bg-txt text-bg border-txt"
                          : "bg-transparent text-txt2 border-brd"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={iceValue}
                    onChange={(e) =>
                      setIceValue(snapTo5(parseInt(e.target.value)))
                    }
                    className="flex-1 accent-accent"
                  />
                  <span className="text-sm font-medium text-txt min-w-[40px] text-right">
                    {iceValue}%
                  </span>
                </div>
              )}
            </div>

            {/* Toppings */}
            <div className="mb-4">
              <label className={labelCls}>Toppings</label>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {DEFAULT_TOPPINGS.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTopping(t)}
                    className={`py-1.5 px-3 text-xs font-medium border-[1.5px] cursor-pointer font-body rounded-pill transition-all duration-[0.12s] ${
                      toppings.includes(t)
                        ? "bg-accent2 text-white border-accent2"
                        : "bg-transparent text-txt2 border-brd"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                {/* Custom toppings that aren't in defaults */}
                {toppings
                  .filter((t) => !DEFAULT_TOPPINGS.includes(t))
                  .map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleTopping(t)}
                      className="py-1.5 px-3 text-xs font-medium border-[1.5px] cursor-pointer font-body rounded-pill bg-accent2 text-white border-accent2"
                    >
                      {t} ✕
                    </button>
                  ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={customTopping}
                  onChange={(e) => setCustomTopping(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTopping();
                    }
                  }}
                  placeholder="Add custom topping..."
                  className="input-base flex-1"
                />
                <button
                  onClick={addCustomTopping}
                  disabled={!customTopping.trim()}
                  className="btn-outline"
                >
                  Add
                </button>
              </div>
            </div>
          </>
        )}

        {/* Size (boba + cafe) */}
        {(formType === "boba" || formType === "cafe") && (
          <div className="mb-4">
            <label className={labelCls}>Size</label>
            <div className="flex gap-2">
              {(formType === "boba" ? BOBA_SIZES : CAFE_SIZES).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(size === s ? null : s)}
                  className={`flex-1 p-2 text-sm font-medium border-[1.5px] cursor-pointer font-body rounded-none transition-all duration-[0.12s] ${
                    size === s
                      ? "bg-txt text-bg border-txt"
                      : "bg-transparent text-txt2 border-brd"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Temperature (boba + cafe) */}
        {(formType === "boba" || formType === "cafe") && (
          <div className="mb-4">
            <label className={labelCls}>Temperature</label>
            <div className="flex gap-2">
              {(formType === "boba" ? BOBA_TEMPS : CAFE_TEMPS).map((t) => (
                <button
                  key={t}
                  onClick={() => setTemperature(temperature === t ? null : t)}
                  className={`flex-1 p-2 text-sm font-medium border-[1.5px] cursor-pointer font-body rounded-none transition-all duration-[0.12s] ${
                    temperature === t
                      ? "bg-txt text-bg border-txt"
                      : "bg-transparent text-txt2 border-brd"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cafe-only: Milk type */}
        {formType === "cafe" && (
          <div className="mb-4">
            <label className={labelCls}>Milk type</label>
            <div className="flex gap-1.5 flex-wrap">
              {MILK_TYPES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMilkType(milkType === m ? null : m)}
                  className={`py-1.5 px-3 text-xs font-medium border-[1.5px] cursor-pointer font-body rounded-pill transition-all duration-[0.12s] ${
                    milkType === m
                      ? "bg-txt text-bg border-txt"
                      : "bg-transparent text-txt2 border-brd"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cafe-only: Shots */}
        {formType === "cafe" && (
          <div className="mb-4">
            <label className={labelCls}>Espresso shots</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setShots(shots === s ? null : s)}
                  className={`w-10 h-10 text-sm font-medium border-[1.5px] cursor-pointer font-body rounded-none transition-all duration-[0.12s] ${
                    shots === s
                      ? "bg-txt text-bg border-txt"
                      : "bg-transparent text-txt2 border-brd"
                  }`}
                >
                  {s === 4 ? "4+" : s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photo */}
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
                  setPhotoUrl("");
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
                setPhotoFile(null);
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

        {/* Notes */}
        <div className="mb-4">
          <label className={labelCls}>Notes / review</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How was it? What stood out?"
            rows={3}
            className="input-base resize-y leading-relaxed"
          />
        </div>

        {error && <p className="text-error text-sm mb-2">{error}</p>}

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            disabled={saving || success || !menuSearch.trim()}
            className="btn-primary flex-1"
          >
            {uploading
              ? "Uploading photo..."
              : saving
                ? "Saving..."
                : success
                  ? "Saved!"
                  : isEditing
                    ? "Update order"
                    : "Save order"}
          </button>
          <button
            onClick={onClose}
            className="btn-outline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
