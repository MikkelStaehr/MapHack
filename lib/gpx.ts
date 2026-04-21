import type { Coord, ParsedRoute, POI, PoiType } from "./types";
import { POI_GPX_SYM, POI_LABEL, POI_TYPES } from "./poiFormats";
import { snapToRoute } from "./geo";
import { newId } from "./id";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Build a GPX 1.1 document from a track of coordinates and optional POIs.
 *
 * POIs become <wpt> elements with a Garmin/Wahoo-compatible <sym> so the
 * checkpoints render with the right icon on the cycling computer. They're
 * sorted by routeIndex so they appear in riding order in apps that list
 * them (Komoot, RWGPS). GPX waypoints don't carry "distance along route"
 * — that's TCX's job.
 */
export function buildGpx(
  name: string,
  coords: Coord[],
  pois: POI[] = [],
): string {
  const time = new Date().toISOString();

  const sortedPois = [...pois].sort((a, b) => a.routeIndex - b.routeIndex);
  const wpts = sortedPois
    .map((p) => {
      const label = p.name?.trim() || POI_LABEL[p.type];
      return `  <wpt lat="${p.coord[0].toFixed(6)}" lon="${p.coord[1].toFixed(6)}">
    <name>${escapeXml(label)}</name>
    <sym>${escapeXml(POI_GPX_SYM[p.type])}</sym>
    <type>${p.type}</type>
  </wpt>`;
    })
    .join("\n");

  const trkpts = coords
    .map(
      (c) =>
        `      <trkpt lat="${c[0].toFixed(6)}" lon="${c[1].toFixed(6)}"></trkpt>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rute til GPX" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${time}</time>
  </metadata>${wpts ? "\n" + wpts : ""}
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Map an arbitrary GPX sym/type string to one of our internal PoiType
 * buckets. Prefers our own <type> marker (exact match), falls back to
 * reverse-lookup of POI_GPX_SYM, then a few loose heuristics on the sym
 * keyword so routes from other apps still land somewhere sensible.
 */
function inferPoiTypeFromGpx(
  typeStr: string,
  symStr: string,
): PoiType {
  const t = typeStr.trim().toLowerCase();
  if ((POI_TYPES as string[]).includes(t)) return t as PoiType;

  for (const key of POI_TYPES) {
    if (symStr === POI_GPX_SYM[key]) return key;
  }

  const sym = symStr.toLowerCase();
  if (sym.includes("water")) return "water";
  if (sym.includes("summit") || sym.includes("peak") || sym.includes("mountain"))
    return "kom";
  if (
    sym.includes("food") ||
    sym.includes("restaurant") ||
    sym.includes("coffee") ||
    sym.includes("cafe")
  )
    return "coffee";
  if (sym.includes("sprint") || sym.includes("flag")) return "sprint";
  return "info";
}

/**
 * Parse a GPX document. Tries trkpt first (tracks), then rtept (routes),
 * then wpt (waypoints) as a fallback for the track. Also parses <wpt> as
 * POIs (they're snapped to the parsed track before being returned).
 * Returns name from <trk>/<rte>/<metadata>.
 *
 * Uses getElementsByTagNameNS("*", ...) instead of querySelectorAll to
 * match elements regardless of the GPX default namespace. CSS selectors
 * on XML documents with a default xmlns can fail to match the localname.
 */
export function parseGpx(xmlText: string): ParsedRoute {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parseErr = doc.getElementsByTagName("parsererror")[0];
  if (parseErr) throw new Error("Ugyldig GPX-fil");

  const coords: Coord[] = [];
  const readPoints = (tag: string) => {
    const nodes = doc.getElementsByTagNameNS("*", tag);
    for (let i = 0; i < nodes.length; i++) {
      const pt = nodes[i];
      const lat = parseFloat(pt.getAttribute("lat") || "");
      const lng = parseFloat(pt.getAttribute("lon") || "");
      if (!isNaN(lat) && !isNaN(lng)) coords.push([lat, lng]);
    }
  };

  readPoints("trkpt");
  if (coords.length === 0) readPoints("rtept");
  // Only fall back to wpt for the track if there are no trkpt/rtept — a
  // file with wpt AND trkpt uses wpt as POIs (below), not as the track.
  const hasTrack = coords.length > 0;
  if (!hasTrack) readPoints("wpt");

  // Waypoints as POIs — only when we actually found a track above, so we
  // don't double-count wpt as both the track and its own POIs.
  const pois: POI[] = [];
  if (hasTrack) {
    const wpts = doc.getElementsByTagNameNS("*", "wpt");
    for (let i = 0; i < wpts.length; i++) {
      const w = wpts[i];
      const lat = parseFloat(w.getAttribute("lat") || "");
      const lng = parseFloat(w.getAttribute("lon") || "");
      if (isNaN(lat) || isNaN(lng)) continue;

      const typeStr =
        w.getElementsByTagNameNS("*", "type")[0]?.textContent?.trim() ?? "";
      const symStr =
        w.getElementsByTagNameNS("*", "sym")[0]?.textContent?.trim() ?? "";
      const nameStr = w
        .getElementsByTagNameNS("*", "name")[0]
        ?.textContent?.trim();

      pois.push({
        id: newId(),
        type: inferPoiTypeFromGpx(typeStr, symStr),
        name: nameStr || undefined,
        coord: [lat, lng],
        routeIndex: 0,
      });
    }
  }

  // Look for a name in trk/rte/metadata, preferring the first match.
  let name = "";
  for (const parent of ["trk", "rte", "metadata"] as const) {
    const parents = doc.getElementsByTagNameNS("*", parent);
    if (parents.length === 0) continue;
    const names = parents[0].getElementsByTagNameNS("*", "name");
    if (names.length > 0 && names[0].textContent) {
      name = names[0].textContent.trim();
      break;
    }
  }

  // Snap POIs onto the parsed track so they appear "on" the route.
  if (coords.length >= 2 && pois.length > 0) {
    for (const p of pois) {
      const snap = snapToRoute({ lat: p.coord[0], lng: p.coord[1] }, coords);
      if (snap) {
        p.coord = snap.coord;
        p.routeIndex = snap.segmentIndex;
      }
    }
  }

  return { name, coords, pois };
}

/**
 * Sanitize a name for use as a filename.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9æøåÆØÅ_-]+/g, "_");
}
