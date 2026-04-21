import type { Coord, POI } from "./types";
import { haversineKm, snapToRoute } from "./geo";
import { POI_LABEL, POI_TCX_TYPE } from "./poiFormats";

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Assume 25 km/h to produce monotonically increasing Time values on each
// Trackpoint and CoursePoint. Devices use the times only for ordering and
// playback simulation when loading a Course — not a claim about when the
// rider actually starts.
const AVG_MPS = (25 * 1000) / 3600;
const BASE_TIME = new Date("2020-01-01T00:00:00.000Z");

function tcxTime(seconds: number): string {
  return new Date(BASE_TIME.getTime() + seconds * 1000).toISOString();
}

/**
 * Build a TCX Course document. Unlike GPX waypoints, TCX CoursePoints
 * alert the rider by name + type as they're approached during a ride —
 * that's the point of this format. Each CoursePoint needs DistanceMeters
 * which we compute from the route via snapToRoute, so alerts fire at
 * exactly the right spot.
 *
 * Schema-level constraints enforced here:
 *   <Course>/<Name>     maxLength 15
 *   <CoursePoint>/<Name> maxLength 10
 * Devices typically accept longer, but strict parsers fail on overage.
 */
export function buildTcx(
  name: string,
  coords: Coord[],
  pois: POI[] = [],
): string {
  if (coords.length < 2) {
    throw new Error("TCX export kræver mindst 2 punkter");
  }

  const dists: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    dists.push(dists[i - 1] + haversineKm(coords[i - 1], coords[i]) * 1000);
  }
  const totalM = dists[dists.length - 1];

  const start = coords[0];
  const end = coords[coords.length - 1];

  const courseName = (name.trim() || "Cykelrute").slice(0, 15);

  const trackpoints = coords
    .map((c, i) => {
      const t = dists[i] / AVG_MPS;
      return `        <Trackpoint>
          <Time>${tcxTime(t)}</Time>
          <Position>
            <LatitudeDegrees>${c[0].toFixed(6)}</LatitudeDegrees>
            <LongitudeDegrees>${c[1].toFixed(6)}</LongitudeDegrees>
          </Position>
          <DistanceMeters>${dists[i].toFixed(1)}</DistanceMeters>
        </Trackpoint>`;
    })
    .join("\n");

  // Re-snap each POI to the current route for accurate DistanceMeters even
  // if the route was edited after the POI was placed.
  const withDist = pois
    .map((p) => {
      const snap = snapToRoute({ lat: p.coord[0], lng: p.coord[1] }, coords);
      return { poi: p, distM: snap?.distanceFromStartM ?? 0 };
    })
    .sort((a, b) => a.distM - b.distM);

  const coursePoints = withDist
    .map(({ poi, distM }) => {
      const rawLabel = poi.name?.trim() || POI_LABEL[poi.type];
      const label = rawLabel.slice(0, 10);
      const t = distM / AVG_MPS;
      return `      <CoursePoint>
        <Name>${escapeXml(label)}</Name>
        <Time>${tcxTime(t)}</Time>
        <Position>
          <LatitudeDegrees>${poi.coord[0].toFixed(6)}</LatitudeDegrees>
          <LongitudeDegrees>${poi.coord[1].toFixed(6)}</LongitudeDegrees>
        </Position>
        <PointType>${POI_TCX_TYPE[poi.type]}</PointType>
      </CoursePoint>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Courses>
    <Course>
      <Name>${escapeXml(courseName)}</Name>
      <Lap>
        <TotalTimeSeconds>${(totalM / AVG_MPS).toFixed(1)}</TotalTimeSeconds>
        <DistanceMeters>${totalM.toFixed(1)}</DistanceMeters>
        <BeginPosition>
          <LatitudeDegrees>${start[0].toFixed(6)}</LatitudeDegrees>
          <LongitudeDegrees>${start[1].toFixed(6)}</LongitudeDegrees>
        </BeginPosition>
        <EndPosition>
          <LatitudeDegrees>${end[0].toFixed(6)}</LatitudeDegrees>
          <LongitudeDegrees>${end[1].toFixed(6)}</LongitudeDegrees>
        </EndPosition>
        <Intensity>Active</Intensity>
      </Lap>
      <Track>
${trackpoints}
      </Track>${coursePoints ? "\n" + coursePoints : ""}
    </Course>
  </Courses>
</TrainingCenterDatabase>`;
}
