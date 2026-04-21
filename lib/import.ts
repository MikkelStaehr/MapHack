import type { ParsedRoute } from "./types";
import { parseGpx } from "./gpx";
import { parseTcx } from "./tcx";

/**
 * Dispatch to the right parser based on filename extension first (most
 * reliable), with a content sniff as fallback for files where the user
 * renamed or we only have bytes. Unknown / ambiguous files go through
 * the GPX parser which will throw a readable error if the content isn't
 * actually GPX.
 */
export function parseRouteFile(
  text: string,
  filename?: string,
): ParsedRoute {
  const lower = (filename ?? "").toLowerCase();
  if (lower.endsWith(".tcx")) return parseTcx(text);
  if (lower.endsWith(".gpx")) return parseGpx(text);

  const head = text.slice(0, 500).toLowerCase();
  if (head.includes("<trainingcenterdatabase")) return parseTcx(text);
  return parseGpx(text);
}
