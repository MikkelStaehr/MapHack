export type LatLng = { lat: number; lng: number };
export type Coord = [number, number]; // [lat, lng]
export type Mode = "click" | "draw";

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
