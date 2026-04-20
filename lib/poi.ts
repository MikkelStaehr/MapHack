import type { LucideIcon } from "lucide-react";
import { Zap, Mountain, Droplet, Coffee, Info } from "lucide-react";
import type { PoiType } from "./types";

// Shared UI config for POI types. Used by the map markers, the type-picker
// dialog, and (via color) the exported GPX waypoints.
export const POI_CONFIG: Record<
  PoiType,
  { icon: LucideIcon; label: string; color: string }
> = {
  sprint: { icon: Zap, label: "Sprint", color: "#ffd60a" },
  kom: { icon: Mountain, label: "KOM", color: "#ff5a5a" },
  water: { icon: Droplet, label: "Vandstop", color: "#4aa3ff" },
  coffee: { icon: Coffee, label: "Kaffe", color: "#8b5e3c" },
  info: { icon: Info, label: "Info", color: "#8a857a" },
};

export const POI_TYPES: PoiType[] = ["sprint", "kom", "water", "coffee", "info"];
