export type LatLng = { lat: number; lng: number };
export type Coord = [number, number]; // [lat, lng]
export type Mode = "click" | "draw";

// Two-step wizard: build route first, then mark POIs on it. Splits UI so
// waypoint markers and POI markers never compete for the same click on the
// same screen.
export type Phase = "route" | "poi";

// POI / checkpoint types. Maps to Garmin TCX CoursePoint PointType at export
// (sprint → Sprint, kom → Summit, water → Water, coffee → Food, info → Generic).
export type PoiType = "sprint" | "kom" | "water" | "coffee" | "info";

export type POI = {
  id: string;
  type: PoiType;
  name?: string;
  coord: Coord;
  // Index of the segment start where the POI snaps onto the route. The POI
  // lives between route[routeIndex] and route[routeIndex + 1]; coord is the
  // exact snapped position, so precise TCX <DistanceMeters> can be recomputed
  // from routeIndex + coord + the route.
  routeIndex: number;
};

// Result of snapping a user's click to the route, handed from RouteMap up to
// page.tsx so the create-sheet can commit it as a POI.
export type PoiSnapRequest = {
  coord: Coord;
  routeIndex: number;
  distanceFromStartM: number;
};
