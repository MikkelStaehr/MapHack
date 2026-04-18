import type { Coord } from "./types";

// Links are soft-enforced to expire after 24h. The timestamp lives in the
// URL itself, so a technical user could tamper with it — acceptable for a
// friend-to-friend chat context.
export const SHARE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Google Encoded Polyline Algorithm. Produces a compact ASCII string
 * (roughly 5 chars per point) via delta encoding on lat/lng pairs
 * multiplied by 1e5. No dependencies, battle-tested format.
 */
export function encodePolyline(coords: Coord[]): string {
  let result = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const [lat, lng] of coords) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    result += encodeSigned(latE5 - prevLat);
    result += encodeSigned(lngE5 - prevLng);
    prevLat = latE5;
    prevLng = lngE5;
  }
  return result;
}

export function decodePolyline(str: string): Coord[] {
  const coords: Coord[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

function encodeSigned(n: number): string {
  let v = n < 0 ? ~(n << 1) : n << 1;
  let result = "";
  while (v >= 0x20) {
    result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>>= 5;
  }
  result += String.fromCharCode(v + 63);
  return result;
}

export type SharedRoute = {
  name: string;
  coords: Coord[];
  createdAt: number; // unix ms
  expired: boolean;
};

/**
 * Build an absolute URL whose hash embeds the full route + name + timestamp.
 * Uses the hash fragment so the payload never hits the server.
 */
export function buildShareUrl(name: string, coords: Coord[]): string {
  const poly = encodePolyline(coords);
  const params = new URLSearchParams();
  params.set("r", poly);
  params.set("t", Math.floor(Date.now() / 1000).toString());
  if (name.trim()) params.set("n", name.trim());
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "/";
  return `${base}#${params.toString()}`;
}

/**
 * Parse the current URL hash into a SharedRoute, or null if the hash doesn't
 * look like a shared route. `expired` is true when older than SHARE_TTL_MS.
 */
export function parseShareHash(hash: string): SharedRoute | null {
  if (!hash || hash.length < 2) return null;
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(trimmed);
  const poly = params.get("r");
  const ts = params.get("t");
  if (!poly || !ts) return null;

  let coords: Coord[];
  try {
    coords = decodePolyline(poly);
  } catch {
    return null;
  }
  if (coords.length < 2) return null;

  const createdAt = Number(ts) * 1000;
  if (!Number.isFinite(createdAt)) return null;

  const expired = Date.now() - createdAt > SHARE_TTL_MS;
  const name = params.get("n") ?? "";

  return { name, coords, createdAt, expired };
}
