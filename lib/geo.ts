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
