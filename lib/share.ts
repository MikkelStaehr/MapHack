import type { Coord, POI, PoiType } from "./types";
import { snapToRoute } from "./geo";
import { newId } from "./id";

// Links are soft-enforced to expire after 24h. The timestamp lives in the
// URL itself, so a technical user could tamper with it — acceptable for a
// friend-to-friend chat context.
export const SHARE_TTL_MS = 24 * 60 * 60 * 1000;

// Douglas-Peucker tolerance in degrees. ~1e-4 ≈ 10m at Danish latitudes,
// visually indistinguishable from the original on a cycling-scale map.
const SHARE_SIMPLIFY_EPSILON = 1e-4;

/**
 * Douglas-Peucker line simplification. Iterative (stack-based) to avoid
 * recursion blowouts on very long routes. Returns a subset of coords that
 * preserves the route's shape within `epsilon` degrees.
 */
export function simplifyCoords(coords: Coord[], epsilon: number): Coord[] {
  if (coords.length < 3) return coords.slice();

  const perpDist = (p: Coord, a: Coord, b: Coord): number => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    if (dx === 0 && dy === 0) {
      return Math.hypot(p[0] - a[0], p[1] - a[1]);
    }
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    const tc = Math.max(0, Math.min(1, t));
    const cx = a[0] + tc * dx;
    const cy = a[1] + tc * dy;
    return Math.hypot(p[0] - cx, p[1] - cy);
  };

  const keep = new Array<boolean>(coords.length).fill(false);
  keep[0] = true;
  keep[coords.length - 1] = true;
  const stack: [number, number][] = [[0, coords.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(coords[i], coords[s], coords[e]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > epsilon && maxIdx !== -1) {
      keep[maxIdx] = true;
      stack.push([s, maxIdx]);
      stack.push([maxIdx, e]);
    }
  }

  const result: Coord[] = [];
  for (let i = 0; i < coords.length; i++) {
    if (keep[i]) result.push(coords[i]);
  }
  return result;
}

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
  pois: POI[];
  createdAt: number; // unix ms
  expired: boolean;
};

// Compact per-POI encoding. Each POI becomes "<idx>,<letter>,<urlEncodedName>"
// and POIs are joined by "|". Single-letter type saves 3-5 bytes per POI vs
// full strings. Name is pre-encoded so commas/pipes inside it don't break
// the split — encodeURIComponent handles everything.
const POI_TYPE_TO_LETTER: Record<PoiType, string> = {
  sprint: "s",
  kom: "k",
  water: "w",
  coffee: "c",
  info: "i",
};
const LETTER_TO_POI_TYPE: Record<string, PoiType> = {
  s: "sprint",
  k: "kom",
  w: "water",
  c: "coffee",
  i: "info",
};

function encodePois(pois: POI[], simplified: Coord[]): string {
  if (pois.length === 0) return "";
  return pois
    .map((p) => {
      // Re-snap each POI against the simplified route we actually put in
      // the URL — indices into the original full route would be garbage
      // after DP simplification.
      const snap = snapToRoute(
        { lat: p.coord[0], lng: p.coord[1] },
        simplified,
      );
      const idx = snap?.segmentIndex ?? 0;
      const letter = POI_TYPE_TO_LETTER[p.type];
      const name = encodeURIComponent(p.name ?? "");
      return `${idx},${letter},${name}`;
    })
    .join("|");
}

function decodePois(poiStr: string, route: Coord[]): POI[] {
  if (!poiStr) return [];
  const results: POI[] = [];
  for (const chunk of poiStr.split("|")) {
    const parts = chunk.split(",");
    if (parts.length < 2) continue;
    const idx = parseInt(parts[0], 10);
    const type = LETTER_TO_POI_TYPE[parts[1]];
    if (!type || !Number.isFinite(idx)) continue;
    const name = parts[2] ? decodeURIComponent(parts[2]) : "";
    const safeIdx = Math.max(0, Math.min(idx, route.length - 1));
    const coord = route[safeIdx];
    if (!coord) continue;
    results.push({
      id: newId(),
      type,
      name: name || undefined,
      coord,
      routeIndex: safeIdx,
    });
  }
  return results;
}

/**
 * Build an absolute URL whose hash embeds the full route + name + timestamp.
 * Uses the hash fragment so the payload never hits the server.
 */
export function buildShareUrl(
  name: string,
  coords: Coord[],
  pois: POI[] = [],
): string {
  // Simplify before encoding to keep URLs short. The full-resolution route
  // stays in the sender's app for GPX download; only the shared link is
  // simplified (10m tolerance is visually indistinguishable on a map).
  const simplified = simplifyCoords(coords, SHARE_SIMPLIFY_EPSILON);
  const poly = encodePolyline(simplified);
  const params = new URLSearchParams();
  params.set("r", poly);
  params.set("t", Math.floor(Date.now() / 1000).toString());
  if (name.trim()) params.set("n", name.trim());
  const poiStr = encodePois(pois, simplified);
  if (poiStr) params.set("p", poiStr);
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
  const pois = decodePois(params.get("p") ?? "", coords);

  return { name, coords, pois, createdAt, expired };
}
