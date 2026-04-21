import type { PoiType } from "./types";

// Pure format mappings for POI types — no React deps, safe to import from
// export/import/url-encoding code without dragging lucide-react into the
// main bundle.

export const POI_TYPES: PoiType[] = [
  "sprint",
  "kom",
  "water",
  "coffee",
  "info",
];

export const POI_LABEL: Record<PoiType, string> = {
  sprint: "Sprint",
  kom: "KOM",
  water: "Vandstop",
  coffee: "Kaffe",
  info: "Info",
};

export const POI_COLOR: Record<PoiType, string> = {
  sprint: "#ffd60a",
  kom: "#ff5a5a",
  water: "#4aa3ff",
  coffee: "#8b5e3c",
  info: "#8a857a",
};

// GPX <sym> element. Maps to common Garmin/Wahoo named symbols so the
// checkpoints render with recognizable icons on the cycling computer.
export const POI_GPX_SYM: Record<PoiType, string> = {
  sprint: "Flag, Blue",
  kom: "Summit",
  water: "Water Source",
  coffee: "Restaurant",
  info: "Information",
};

// TCX CoursePoint <PointType>. Garmin's standard vocabulary that triggers
// the proper alert icon + audio cue as the rider approaches during a ride.
export const POI_TCX_TYPE: Record<PoiType, string> = {
  sprint: "Sprint",
  kom: "Summit",
  water: "Water",
  coffee: "Food",
  info: "Generic",
};
