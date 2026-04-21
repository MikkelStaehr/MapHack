import type { LucideIcon } from "lucide-react";
import { Zap, Mountain, Droplet, Coffee, Info } from "lucide-react";
import type { PoiType } from "./types";
import { POI_LABEL, POI_COLOR } from "./poiFormats";

// Combines the pure format data (labels, colors) with React icons so the
// UI components can render POIs in one pass. Format mappings used from
// pure code (export/import/url-encoding) go through lib/poiFormats.ts.
export const POI_CONFIG: Record<
  PoiType,
  { icon: LucideIcon; label: string; color: string }
> = {
  sprint: { icon: Zap, label: POI_LABEL.sprint, color: POI_COLOR.sprint },
  kom: { icon: Mountain, label: POI_LABEL.kom, color: POI_COLOR.kom },
  water: { icon: Droplet, label: POI_LABEL.water, color: POI_COLOR.water },
  coffee: { icon: Coffee, label: POI_LABEL.coffee, color: POI_COLOR.coffee },
  info: { icon: Info, label: POI_LABEL.info, color: POI_COLOR.info },
};

export { POI_TYPES } from "./poiFormats";
