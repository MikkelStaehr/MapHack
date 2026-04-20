import type { Coord } from "./types";

// Module-level mirror of the route state. page.tsx writes to it whenever
// routeCoords or routeName changes, and the ErrorBoundary reads from it in
// its fallback UI — we can't read React state after a crash, so we keep a
// plain-object copy outside the React tree.
type Snapshot = { coords: Coord[]; name: string };

let snapshot: Snapshot = { coords: [], name: "" };

export function setRouteSnapshot(coords: Coord[], name: string) {
  snapshot = { coords, name };
}

export function getRouteSnapshot(): Snapshot {
  return snapshot;
}
