import type { Restaurant } from "@/lib/supabase";

export type DedupeResult = {
  displayList: Restaurant[];
  chainLocationCounts: Record<number, number>;
};

/**
 * Collapses a sorted/filtered restaurant list so that each linked chain
 * (restaurants sharing a chain_id) appears only once.
 *
 * Representative selection: the location most recently visited (via
 * last_visited), breaking ties by lowest id (first added).
 *
 * The original sort order of the input is preserved — the representative
 * appears at the position it occupies in the input array.
 *
 * Returns:
 *   displayList          — deduplicated array, same relative order as input
 *   chainLocationCounts  — map from representative id → count of siblings in
 *                          the input list (including the representative itself)
 */
export function dedupeByChain(restaurants: Restaurant[]): DedupeResult {
  const chainGroups = new Map<number, Restaurant[]>();

  for (const r of restaurants) {
    if (r.chain_id == null) continue;
    const group = chainGroups.get(r.chain_id) ?? [];
    group.push(r);
    chainGroups.set(r.chain_id, group);
  }

  const representativeIds = new Map<number, number>();
  chainGroups.forEach((group, chainId) => {
    const rep = group.reduce((best, r) => {
      const bestTime = best.last_visited
        ? new Date(best.last_visited).getTime()
        : 0;
      const rTime = r.last_visited ? new Date(r.last_visited).getTime() : 0;
      if (rTime > bestTime) return r;
      if (rTime === bestTime && r.id < best.id) return r;
      return best;
    });
    representativeIds.set(chainId, rep.id);
  });

  const displayList = restaurants.filter((r) => {
    if (r.chain_id == null) return true;
    return representativeIds.get(r.chain_id) === r.id;
  });

  const chainLocationCounts: Record<number, number> = {};
  representativeIds.forEach((repId, chainId) => {
    chainLocationCounts[repId] = chainGroups.get(chainId)!.length;
  });

  return { displayList, chainLocationCounts };
}
