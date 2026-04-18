import type { Coord } from "./types";

/**
 * Build a GPX 1.1 document from a track of coordinates.
 */
export function buildGpx(name: string, coords: Coord[]): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const time = new Date().toISOString();
  const trkpts = coords
    .map(
      (c) =>
        `      <trkpt lat="${c[0].toFixed(6)}" lon="${c[1].toFixed(6)}"></trkpt>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rute til GPX" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escape(name)}</name>
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${escape(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Parse a GPX document. Tries trkpt first (tracks), then rtept (routes),
 * then wpt (waypoints) as a fallback. Returns name from <trk>/<rte>/<metadata>.
 */
export function parseGpx(xmlText: string): { name: string; coords: Coord[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parseErr = doc.querySelector("parsererror");
  if (parseErr) throw new Error("Ugyldig GPX-fil");

  const coords: Coord[] = [];

  const readPoints = (selector: string) => {
    doc.querySelectorAll(selector).forEach((pt) => {
      const lat = parseFloat(pt.getAttribute("lat") || "");
      const lng = parseFloat(pt.getAttribute("lon") || "");
      if (!isNaN(lat) && !isNaN(lng)) coords.push([lat, lng]);
    });
  };

  readPoints("trkpt");
  if (coords.length === 0) readPoints("rtept");
  if (coords.length === 0) readPoints("wpt");

  let name = "";
  const nameEl = doc.querySelector(
    "trk > name, rte > name, metadata > name"
  );
  if (nameEl?.textContent) name = nameEl.textContent.trim();

  return { name, coords };
}

/**
 * Sanitize a name for use as a filename.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9æøåÆØÅ_-]+/g, "_");
}
