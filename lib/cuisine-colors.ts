import { type Restaurant } from "@/lib/supabase";

export const CUISINE_COLORS = [
  "var(--cuisine-1)",
  "var(--cuisine-2)",
  "var(--cuisine-3)",
  "var(--cuisine-4)",
  "var(--cuisine-5)",
  "var(--cuisine-6)",
  "var(--cuisine-7)",
  "var(--cuisine-8)",
  "var(--cuisine-9)",
  "var(--cuisine-10)",
];

export function buildCuisineColorMap(
  restaurants: Restaurant[],
): Record<string, string> {
  const cuisines = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean)),
  ).sort();
  const map: Record<string, string> = {};
  cuisines.forEach((c, i) => {
    map[c as string] = CUISINE_COLORS[i % CUISINE_COLORS.length];
  });
  return map;
}
