import type { Coord, POI } from "./types";
import { POI_GPX_SYM, POI_LABEL } from "./poiFormats";

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
 * Parse a GPX document. Tries trkpt first (tracks), then rtept (routes),
 * then wpt (waypoints) as a fallback. Returns name from <trk>/<rte>/<metadata>.
 *
 * Uses getElementsByTagNameNS("*", ...) instead of querySelectorAll to
 * match elements regardless of the GPX default namespace. CSS selectors
 * on XML documents with a default xmlns can fail to match the localname.
 */
export function parseGpx(xmlText: string): { name: string; coords: Coord[] } {
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
  if (coords.length === 0) readPoints("wpt");

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

  return { name, coords };
}

/**
 * Sanitize a name for use as a filename.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9æøåÆØÅ_-]+/g, "_");
}
