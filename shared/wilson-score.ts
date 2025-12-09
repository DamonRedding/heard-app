/**
 * Wilson Score Interval Implementation
 * 
 * Used for ranking comments based on upvotes/downvotes in a statistically sound way.
 * The Wilson score accounts for sample size, giving appropriate weight to items with
 * fewer total votes while still reflecting the proportion of positive votes.
 * 
 * This is the same algorithm used by Reddit for ranking comments.
 * 
 * Reference: https://www.evanmiller.org/how-not-to-sort-by-average-rating.html
 */

/**
 * Calculate the lower bound of the Wilson score confidence interval.
 * This is the primary ranking score - higher is better.
 * 
 * @param upvotes - Number of upvotes
 * @param downvotes - Number of downvotes
 * @param confidence - Confidence level (default 0.95 for 95% confidence)
 * @returns Lower bound of Wilson score (0 to 1)
 */
export function wilsonScoreLowerBound(
  upvotes: number,
  downvotes: number,
  confidence: number = 0.95
): number {
  const n = upvotes + downvotes;
  
  if (n === 0) {
    return 0;
  }
  
  // z-score for the given confidence level
  // Common values: 1.96 (95%), 1.645 (90%), 1.44 (85%), 2.576 (99%)
  const z = getZScore(confidence);
  
  // Proportion of positive votes
  const phat = upvotes / n;
  
  // Wilson score formula
  const numerator = phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);
  const denominator = 1 + (z * z) / n;
  
  return numerator / denominator;
}

/**
 * Calculate the full Wilson score confidence interval.
 * Returns both lower and upper bounds.
 * 
 * @param upvotes - Number of upvotes
 * @param downvotes - Number of downvotes
 * @param confidence - Confidence level (default 0.95)
 * @returns Object with lower and upper bounds
 */
export function wilsonScoreInterval(
  upvotes: number,
  downvotes: number,
  confidence: number = 0.95
): { lower: number; upper: number; score: number } {
  const n = upvotes + downvotes;
  
  if (n === 0) {
    return { lower: 0, upper: 0, score: 0 };
  }
  
  const z = getZScore(confidence);
  const phat = upvotes / n;
  
  const zSquaredOverN = (z * z) / n;
  const sqrtPart = Math.sqrt((phat * (1 - phat) + zSquaredOverN / 4) / n);
  
  const denominator = 1 + zSquaredOverN;
  const center = phat + zSquaredOverN / 2;
  
  const lower = (center - z * sqrtPart) / denominator;
  const upper = (center + z * sqrtPart) / denominator;
  
  return {
    lower: Math.max(0, lower),
    upper: Math.min(1, upper),
    score: lower, // Use lower bound as the ranking score
  };
}

/**
 * Get z-score for a given confidence level using approximation.
 * For common confidence levels, we use pre-computed values.
 */
function getZScore(confidence: number): number {
  // Pre-computed z-scores for common confidence levels
  const zScores: Record<number, number> = {
    0.80: 1.282,
    0.85: 1.44,
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  
  // Round to 2 decimal places for lookup
  const rounded = Math.round(confidence * 100) / 100;
  
  if (zScores[rounded]) {
    return zScores[rounded];
  }
  
  // For other values, use an approximation based on the standard normal distribution
  // Using Abramowitz and Stegun approximation for inverse normal CDF
  const p = (1 + confidence) / 2;
  
  // Coefficients for rational approximation
  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.383577518672690e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239e0;
  
  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;
  
  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838e0;
  const c4 = -2.549732539343734e0;
  const c5 = 4.374664141464968e0;
  const c6 = 2.938163982698783e0;
  
  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996e0;
  const d4 = 3.754408661907416e0;
  
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  
  let q: number, r: number;
  
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
           ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
           (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
}

/**
 * Sort comments by Wilson score (highest first).
 * Comments with higher confidence of being positively rated appear first.
 */
export function sortByWilsonScore<T extends { upvoteCount: number; downvoteCount: number }>(
  items: T[],
  confidence: number = 0.95
): T[] {
  return [...items].sort((a, b) => {
    const scoreA = wilsonScoreLowerBound(a.upvoteCount, a.downvoteCount, confidence);
    const scoreB = wilsonScoreLowerBound(b.upvoteCount, b.downvoteCount, confidence);
    return scoreB - scoreA;
  });
}

/**
 * Calculate and attach Wilson score to each comment.
 */
export function withWilsonScore<T extends { upvoteCount: number; downvoteCount: number }>(
  items: T[],
  confidence: number = 0.95
): (T & { wilsonScore: number })[] {
  return items.map(item => ({
    ...item,
    wilsonScore: wilsonScoreLowerBound(item.upvoteCount, item.downvoteCount, confidence),
  }));
}
