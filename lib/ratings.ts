// Bayesian-smoothed rating: blends the observed mean with a fixed prior so a
// single 4.5 doesn't outrank three 4.5s. PRIOR_WEIGHT acts as a phantom number
// of votes at PRIOR_MEAN — small enough to barely move many-curator averages
// but enough to make agreement visibly bump the score.
const PRIOR_MEAN = 3.5;
const PRIOR_WEIGHT = 1;

export function computeWeightedCuratorRating(
  ratings: number[],
): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  const weighted =
    (PRIOR_WEIGHT * PRIOR_MEAN + sum) / (PRIOR_WEIGHT + ratings.length);
  return Math.round(weighted * 10) / 10;
}
