import type { Coord, POI } from "./types";

// Module-level mirror of the route state. page.tsx writes to it whenever
// routeCoords / routeName / pois change, and the ErrorBoundary reads from
// it in its fallback UI — we can't read React state after a crash, so we
// keep a plain-object copy outside the React tree.
type Snapshot = { coords: Coord[]; name: string; pois: POI[] };

let snapshot: Snapshot = { coords: [], name: "", pois: [] };

export function setRouteSnapshot(
  coords: Coord[],
  name: string,
  pois: POI[] = [],
) {
  snapshot = { coords, name, pois };
}

export function getRouteSnapshot(): Snapshot {
  return snapshot;
}
