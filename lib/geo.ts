import type { Coord, LatLng } from "./types";

/**
 * Haversine distance in km between two [lat, lng] points.
 */
export function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function totalDistanceKm(coords: Coord[]): number {
  let d = 0;
  for (let i = 1; i < coords.length; i++) {
    d += haversineKm(coords[i - 1], coords[i]);
  }
  return d;
}

/**
 * Snap a point to the nearest position on a polyline. Pure, no Leaflet.
 *
 * Nearest-point-on-segment is computed in a local equirectangular projection
 * (scale longitude by cos(avg lat)) which is accurate to within millimeters
 * at cycling scales. The caller is responsible for pixel-distance thresholds
 * since those depend on the screen projection we don't know about here.
 *
 * distanceFromStartM accumulates real geographic meters (haversine) along
 * the route up to the snap point — that's what TCX <DistanceMeters> wants
 * so devices alert at exactly the right moment during a ride.
 *
 * Returns null for degenerate routes (< 2 points).
 */
export function snapToRoute(
  point: LatLng,
  route: Coord[],
): { coord: Coord; segmentIndex: number; distanceFromStartM: number } | null {
  if (route.length < 2) return null;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const cosLat = Math.cos(toRad(point.lat));
  const px = point.lng * cosLat;
  const py = point.lat;

  let bestDistSq = Infinity;
  let bestSegmentIndex = 0;
  let bestT = 0;
  let bestCoord: Coord = route[0];

  for (let i = 0; i < route.length - 1; i++) {
    const [alat, alng] = route[i];
    const [blat, blng] = route[i + 1];
    const ax = alng * cosLat;
    const ay = alat;
    const bx = blng * cosLat;
    const by = blat;

    const dx = bx - ax;
    const dy = by - ay;
    const segLenSq = dx * dx + dy * dy;

    let t: number;
    if (segLenSq === 0) {
      t = 0;
    } else {
      t = ((px - ax) * dx + (py - ay) * dy) / segLenSq;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }

    const sx = ax + t * dx;
    const sy = ay + t * dy;
    const distSq = (px - sx) * (px - sx) + (py - sy) * (py - sy);

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestSegmentIndex = i;
      bestT = t;
      bestCoord = [alat + t * (blat - alat), alng + t * (blng - alng)];
    }
  }

  // Haversine distance from start up to the snap point. Sum full segments
  // before the snap, then add bestT * length of the snap segment.
  let distanceFromStartM = 0;
  for (let i = 0; i < bestSegmentIndex; i++) {
    distanceFromStartM += haversineKm(route[i], route[i + 1]) * 1000;
  }
  const segLenM =
    haversineKm(route[bestSegmentIndex], route[bestSegmentIndex + 1]) * 1000;
  distanceFromStartM += bestT * segLenM;

  return {
    coord: bestCoord,
    segmentIndex: bestSegmentIndex,
    distanceFromStartM,
  };
}

/**
 * Fetch a cycling route from OSRM's public demo server.
 * Note: This is a free public service with rate limits. For production
 * traffic we should swap to BRouter or a self-hosted GraphHopper/OSRM.
 */
export async function fetchCyclingRoute(
  waypoints: LatLng[]
): Promise<Coord[]> {
  if (waypoints.length < 2) return waypoints.map((w) => [w.lat, w.lng]);

  const coordStr = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/cycling/${coordStr}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing fejl");
  const data = await res.json();
  if (!data.routes?.length) throw new Error("Ingen rute fundet");

  // GeoJSON returns [lng, lat] - flip to [lat, lng]
  return data.routes[0].geometry.coordinates.map(
    (c: [number, number]): Coord => [c[1], c[0]]
  );
}
