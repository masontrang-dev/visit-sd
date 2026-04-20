export const OCCASION_SUGGESTIONS = [
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

export function formatOccasion(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
