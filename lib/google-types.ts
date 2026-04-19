// Non-restaurant Google food & drink place types.
// Types containing "restaurant" are automatically included via isGoogleFoodDrinkType().
const NON_RESTAURANT_FOOD_TYPES = new Set([
  "bakery",
  "bar",
  "cafe",
  "coffee_shop",
  "food_court",
  "ice_cream_shop",
  "meal_delivery",
  "meal_takeaway",
  "sandwich_shop",
  "steak_house",
  "wine_bar",
]);

/** Maps Google place types to readable cuisine labels. */
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
  indonesian_restaurant: "Indonesian",
  malaysian_restaurant: "Malaysian",
  filipino_restaurant: "Filipino",
  german_restaurant: "German",
  british_restaurant: "British",
  irish_restaurant: "Irish",
  portuguese_restaurant: "Portuguese",
  argentinian_restaurant: "Argentinian",
  colombian_restaurant: "Colombian",
  cuban_restaurant: "Cuban",
  jamaican_restaurant: "Jamaican",
  moroccan_restaurant: "Moroccan",
  taiwanese_restaurant: "Taiwanese",
  nepalese_restaurant: "Nepalese",
  pakistani_restaurant: "Pakistani",
  persian_restaurant: "Persian",
  polish_restaurant: "Polish",
  russian_restaurant: "Russian",
  scandinavian_restaurant: "Scandinavian",
  soul_food_restaurant: "Soul Food",
  cajun_restaurant: "Cajun",
  tex_mex_restaurant: "Tex-Mex",
  wine_bar: "Wine Bar",
  food_court: "Food Court",
  meal_delivery: "Delivery",
  meal_takeaway: "Takeout",
};

/** Returns true if a Google place type is food/drink related. */
export function isGoogleFoodDrinkType(type: string): boolean {
  return type.includes("restaurant") || NON_RESTAURANT_FOOD_TYPES.has(type);
}

/** Formats a Google place type for display: "mexican_restaurant" → "Mexican Restaurant" */
export function formatGoogleType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extracts the best food/drink type from a Google place types array.
 * Uses GOOGLE_TYPE_TO_CUISINE mapping for readable labels, falls back to formatting.
 * Skips the generic "restaurant" type in favor of more specific ones.
 */
export function extractCuisineFromTypes(types: string[]): string | null {
  // Prefer mapped types first
  for (const t of types) {
    if (GOOGLE_TYPE_TO_CUISINE[t]) return GOOGLE_TYPE_TO_CUISINE[t];
  }
  // Fall back to formatted type for unmapped food/drink types
  for (const t of types) {
    if (t !== "restaurant" && isGoogleFoodDrinkType(t))
      return formatGoogleType(t);
  }
  // Fall back to generic "restaurant" if nothing more specific
  if (types.includes("restaurant")) return "Restaurant";
  return null;
}

/** Default cuisine options for the AddModal dropdown. */
export const DEFAULT_CUISINE_OPTIONS = [
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

type OpeningHoursTime = {
  day: number;
  hour?: number;
  minute?: number;
  hours?: number;
  minutes?: number;
  time?: string;
};

type OpeningHoursPeriod = {
  open: OpeningHoursTime;
  close?: OpeningHoursTime;
};

type OpeningHours = {
  weekday_text?: string[];
  periods?: OpeningHoursPeriod[];
} | null;

// Periods come from two sources with different shapes:
// - Places API (New) via refresh-google-data cron: { day, hour, minute }
// - Legacy JS SDK via AddModal: { day, hours, minutes, time: "HHMM" }
function readMinutes(t: OpeningHoursTime): number {
  const h = t.hour ?? t.hours;
  const m = t.minute ?? t.minutes;
  if (typeof h === "number" && typeof m === "number") return h * 60 + m;
  if (typeof t.time === "string" && /^\d{4}$/.test(t.time)) {
    return parseInt(t.time.slice(0, 2), 10) * 60 + parseInt(t.time.slice(2), 10);
  }
  return NaN;
}

/**
 * Checks if a restaurant is currently open based on its stored opening_hours periods.
 * "Now" is evaluated in America/Los_Angeles since periods are in the restaurant's
 * (San Diego) local time regardless of viewer timezone.
 * Returns null if no hours data is available.
 */
export function isCurrentlyOpen(openingHours: OpeningHours): boolean | null {
  if (!openingHours?.periods || openingHours.periods.length === 0) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const hour = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );
  const currentMinutes = (hour % 24) * 60 + minute;

  for (const period of openingHours.periods) {
    // 24-hour place: single period with no close is "always open" per Google.
    if (!period.close) return true;

    const openMin = readMinutes(period.open);
    const closeMin = readMinutes(period.close);
    if (Number.isNaN(openMin) || Number.isNaN(closeMin)) continue;

    if (period.open.day === day && period.close.day === day) {
      if (currentMinutes >= openMin && currentMinutes < closeMin) return true;
    } else if (period.open.day === day && period.close.day !== day) {
      if (currentMinutes >= openMin) return true;
    } else if (period.close.day === day && period.open.day !== day) {
      if (currentMinutes < closeMin) return true;
    }
  }

  return false;
}

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

/**
 * Extracts neighborhood from Google address components with progressive fallback:
 * neighborhood → sublocality_level_1 → sublocality → locality → postal_town
 */
export function extractNeighborhood(
  components: AddressComponent[],
): string | null {
  const priorities = [
    "neighborhood",
    "sublocality_level_1",
    "sublocality",
    "locality",
    "postal_town",
  ];
  for (const type of priorities) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return null;
}
