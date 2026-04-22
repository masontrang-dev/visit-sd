export function formatFoodTag(slug: string): string {
  return slug
    .split(/[-\s]+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function normalizeFoodTag(input: string): string {
  return input.trim().toLowerCase();
}
