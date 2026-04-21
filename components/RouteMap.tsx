"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Map as LeafletMap, Polyline, Marker } from "leaflet";
import { createElement } from "react";
import type {
  Coord,
  LatLng,
  Phase,
  POI,
  PoiSnapRequest,
  PoiType,
} from "@/lib/types";
import { fetchCyclingRoute, snapToRoute } from "@/lib/geo";
import { POI_CONFIG } from "@/lib/poi";

// Snap threshold in screen pixels. Slightly looser on touch devices since
// fingers cover more area than a mouse cursor. Fixed per session via a
// single ontouchstart check at module load.
const POI_SNAP_THRESHOLD_PX =
  typeof window !== "undefined" && "ontouchstart" in window ? 40 : 30;

// Pre-render each POI icon to a static SVG string once at module load.
// We need HTML strings for Leaflet divIcon; rendering React every marker
// is wasteful and the icons are static per type.
const POI_ICON_HTML: Record<PoiType, string> = {
  sprint: "",
  kom: "",
  water: "",
  coffee: "",
  info: "",
};
function ensurePoiIconHtml() {
  if (POI_ICON_HTML.sprint) return; // already computed
  for (const type of Object.keys(POI_CONFIG) as PoiType[]) {
    const Icon = POI_CONFIG[type].icon;
    POI_ICON_HTML[type] = renderToStaticMarkup(
      createElement(Icon, { size: 18, color: "#fff", strokeWidth: 2.5 }),
    );
  }
}

export type RouteMapHandle = {
  fitToRoute: () => void;
  skipNextRouting: () => void;
  panTo: (lat: number, lng: number) => void;
};

type Props = {
  phase: Phase;
  useRouting: boolean;
  waypoints: LatLng[];
  routeCoords: Coord[];
  pois: POI[];
  onWaypointsChange: (wps: LatLng[]) => void;
  onRouteChange: (coords: Coord[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onError: (message: string) => void;
  onPoiRequest: (snap: PoiSnapRequest) => void;
  onPoiSelect: (poiId: string) => void;
};

const RouteMap = forwardRef<RouteMapHandle, Props>(function RouteMap(
  {
    phase,
    useRouting,
    waypoints,
    routeCoords,
    pois,
    onWaypointsChange,
    onRouteChange,
    onLoadingChange,
    onError,
    onPoiRequest,
    onPoiSelect,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const poiMarkersRef = useRef<Marker[]>([]);
  const lineRef = useRef<Polyline | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  // Set by parent before a waypoint change that should NOT trigger re-routing
  // (e.g. when loading an uploaded GPX where routeCoords is the source of truth)
  const skipNextRoutingRef = useRef(false);

  // Keep refs to the latest props so Leaflet event handlers see current values
  const phaseRef = useRef(phase);
  const useRoutingRef = useRef(useRouting);
  const waypointsRef = useRef(waypoints);
  const routeCoordsRef = useRef(routeCoords);
  const callbacksRef = useRef({
    onWaypointsChange,
    onRouteChange,
    onLoadingChange,
    onError,
    onPoiRequest,
    onPoiSelect,
  });

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    useRoutingRef.current = useRouting;
  }, [useRouting]);
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);
  useEffect(() => {
    routeCoordsRef.current = routeCoords;
  }, [routeCoords]);
  useEffect(() => {
    callbacksRef.current = {
      onWaypointsChange,
      onRouteChange,
      onLoadingChange,
      onError,
      onPoiRequest,
      onPoiSelect,
    };
  }, [
    onWaypointsChange,
    onRouteChange,
    onLoadingChange,
    onError,
    onPoiRequest,
    onPoiSelect,
  ]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      LRef.current = L;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        // tap: true, // removed in newer Leaflet - touch works natively
      }).setView([55.6761, 12.5683], 12);

      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution: "© OpenStreetMap, © CARTO",
          maxZoom: 19,
        }
      ).addTo(map);

      // Try to center on user
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) {
              map.setView([pos.coords.latitude, pos.coords.longitude], 13);
            }
          },
          () => {},
          { timeout: 4000 }
        );
      }

      // Map click handler. Phase dictates the action completely:
      //   phase="poi":   snap + open POI create sheet if within threshold
      //   phase="route": append waypoint in click mode
      // No cross-phase leaking — the two-step wizard keeps the interactions
      // from fighting over the same tap.
      map.on("click", (e) => {
        if (phaseRef.current === "poi") {
          const route = routeCoordsRef.current;
          if (route.length < 2) return;
          const snap = snapToRoute(
            { lat: e.latlng.lat, lng: e.latlng.lng },
            route,
          );
          if (!snap) return;
          const clickPx = map.latLngToContainerPoint(e.latlng);
          const snapPx = map.latLngToContainerPoint(snap.coord);
          const distPx = Math.hypot(
            clickPx.x - snapPx.x,
            clickPx.y - snapPx.y,
          );
          if (distPx <= POI_SNAP_THRESHOLD_PX) {
            callbacksRef.current.onPoiRequest({
              coord: snap.coord,
              routeIndex: snap.segmentIndex,
              distanceFromStartM: snap.distanceFromStartM,
            });
          }
          return;
        }
        // phase === "route": append a waypoint at the click location
        const next = [
          ...waypointsRef.current,
          { lat: e.latlng.lat, lng: e.latlng.lng },
        ];
        callbacksRef.current.onWaypointsChange(next);
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers from waypoints. Only in route phase — in poi/generate
  // phases the route is locked and draggable handles would be misleading.
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (phase !== "route") return;

    waypoints.forEach((wp, i) => {
      const isStart = i === 0;
      const isEnd = i === waypoints.length - 1 && waypoints.length > 1;
      const cls = isStart ? "start" : isEnd ? "end" : "";
      const icon = L.divIcon({
        className: "",
        html: `<div class="marker-dot ${cls}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const m = L.marker([wp.lat, wp.lng], { icon, draggable: true }).addTo(
        map
      );
      m.on("dragend", (ev) => {
        const ll = (ev.target as Marker).getLatLng();
        const next = [...waypointsRef.current];
        next[i] = { lat: ll.lat, lng: ll.lng };
        callbacksRef.current.onWaypointsChange(next);
      });
      markersRef.current.push(m);
    });
  }, [waypoints, phase]);

  // Render POI markers. Each marker is a colored circle with a Lucide icon
  // rendered to SVG once per type at module load. Hidden in route phase so
  // previously-placed checkpoints don't confuse route editing.
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    ensurePoiIconHtml();

    poiMarkersRef.current.forEach((m) => map.removeLayer(m));
    poiMarkersRef.current = [];

    if (phase === "route") return;

    pois.forEach((poi) => {
      const cfg = POI_CONFIG[poi.type];
      const icon = L.divIcon({
        className: "",
        html: `<div class="poi-marker"><div class="poi-marker-inner" style="background:${cfg.color}">${POI_ICON_HTML[poi.type]}</div></div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const m = L.marker(poi.coord, { icon }).addTo(map);
      m.on("click", (ev) => {
        // Tap-to-edit only in the poi phase; in generate phase it's a
        // review-only view so taps should be no-ops.
        if (phaseRef.current !== "poi") return;
        // Stop propagation so the map click handler (which opens POI-create)
        // doesn't also fire when the user actually wanted to inspect this POI.
        L.DomEvent.stopPropagation(ev);
        callbacksRef.current.onPoiSelect(poi.id);
      });
      poiMarkersRef.current.push(m);
    });
  }, [pois, phase]);

  // Rebuild route when waypoints or routing toggle change
  useEffect(() => {
    if (skipNextRoutingRef.current) {
      skipNextRoutingRef.current = false;
      return;
    }

    let cancelled = false;

    (async () => {
      if (waypoints.length < 2) {
        callbacksRef.current.onRouteChange(
          waypoints.map((w) => [w.lat, w.lng] as Coord)
        );
        return;
      }

      if (useRouting) {
        callbacksRef.current.onLoadingChange(true);
        try {
          const coords = await fetchCyclingRoute(waypoints);
          if (!cancelled) callbacksRef.current.onRouteChange(coords);
        } catch {
          if (!cancelled) {
            callbacksRef.current.onError(
              "Kunne ikke hente rute - bruger lige linjer"
            );
            callbacksRef.current.onRouteChange(
              waypoints.map((w) => [w.lat, w.lng] as Coord)
            );
          }
        } finally {
          if (!cancelled) callbacksRef.current.onLoadingChange(false);
        }
      } else {
        callbacksRef.current.onRouteChange(
          waypoints.map((w) => [w.lat, w.lng] as Coord)
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [waypoints, useRouting]);

  // Draw polyline from routeCoords
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }
    if (routeCoords.length < 2) return;

    lineRef.current = L.polyline(routeCoords, {
      color: "#d4ff3a",
      weight: 5,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    // Polyline click propagates to map by default (bubblingMouseEvents: true),
    // which is what we want — the map click handler does snap + POI dispatch
    // uniformly for both on-the-line and near-the-line clicks.
  }, [routeCoords]);

  // Imperative API for parent to fit the map to the current route
  useImperativeHandle(ref, () => ({
    fitToRoute: () => {
      const map = mapRef.current;
      const L = LRef.current;
      const coords = routeCoordsRef.current;
      if (!map || !L || coords.length < 2) return;
      const bounds = L.latLngBounds(
        coords.map(([lat, lng]) => [lat, lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    },
    skipNextRouting: () => {
      skipNextRoutingRef.current = true;
    },
    panTo: (lat, lng) => {
      const map = mapRef.current;
      if (!map) return;
      const currentZoom = map.getZoom();
      map.setView([lat, lng], Math.max(currentZoom, 14));
    },
  }));

  return <div ref={containerRef} className="h-full w-full" />;
});

export default RouteMap;
