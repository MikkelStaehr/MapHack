import type { Coord } from "./types";
import { haversineKm } from "./geo";

// Rough cycling-group average. Good enough for "hvor lang tid tager ruten"
// at the review step — not meant to be a precise race-time estimator.
const DEFAULT_AVG_KMH = 25;

export function estimateCyclingMinutes(
  distanceKm: number,
  avgKmh = DEFAULT_AVG_KMH,
): number {
  if (avgKmh <= 0 || distanceKm <= 0) return 0;
  return (distanceKm / avgKmh) * 60;
}

export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}t ${m}m`;
}

/**
 * Count "dangerous" left turns along a cycling route.
 *
 * Routes from OSRM often have lots of closely-spaced interpolation points;
 * analyzing every triple gives noise (0.5° jitter reads as a "turn"). We
 * first walk the route and keep only points >= 50m apart so each sampled
 * bearing represents a real road segment.
 *
 * Then for each triple we compute the signed bearing change. Danish
 * convention: bearings measured CW from north, so a negative delta means a
 * left turn. We count turns in (-150°, -thresholdDeg); tighter than 60° is
 * "sharp left", wider than 150° is treated as a U-turn (likely a spur we
 * shouldn't alert on).
 */
export function countLeftTurns(coords: Coord[], thresholdDeg = 60): number {
  if (coords.length < 3) return 0;

  const MIN_SEGMENT_M = 50;
  const simplified: Coord[] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const prev = simplified[simplified.length - 1];
    if (haversineKm(prev, coords[i]) * 1000 >= MIN_SEGMENT_M) {
      simplified.push(coords[i]);
    }
  }
  if (simplified[simplified.length - 1] !== coords[coords.length - 1]) {
    simplified.push(coords[coords.length - 1]);
  }
  if (simplified.length < 3) return 0;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const bearing = (from: Coord, to: Coord) => {
    const lat1 = toRad(from[0]);
    const lat2 = toRad(to[0]);
    const dLng = toRad(to[1] - from[1]);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };

  let count = 0;
  for (let i = 1; i < simplified.length - 1; i++) {
    const b1 = bearing(simplified[i - 1], simplified[i]);
    const b2 = bearing(simplified[i], simplified[i + 1]);
    // Normalize delta to (-180, 180]. Negative = left.
    const delta = ((b2 - b1 + 540) % 360) - 180;
    if (delta < -thresholdDeg && delta > -150) count++;
  }
  return count;
}
