"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Map as LeafletMap, Polyline, Marker } from "leaflet";
import type { Coord, LatLng, Mode } from "@/lib/types";
import { fetchCyclingRoute } from "@/lib/geo";

export type RouteMapHandle = {
  fitToRoute: () => void;
};

type Props = {
  mode: Mode;
  useRouting: boolean;
  waypoints: LatLng[];
  routeCoords: Coord[];
  onWaypointsChange: (wps: LatLng[]) => void;
  onRouteChange: (coords: Coord[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onError: (message: string) => void;
};

const RouteMap = forwardRef<RouteMapHandle, Props>(function RouteMap(
  {
    mode,
    useRouting,
    waypoints,
    routeCoords,
    onWaypointsChange,
    onRouteChange,
    onLoadingChange,
    onError,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const lineRef = useRef<Polyline | null>(null);
  const isDrawingRef = useRef(false);
  const drawCoordsRef = useRef<Coord[]>([]);
  const LRef = useRef<typeof import("leaflet") | null>(null);

  // Keep refs to the latest props so Leaflet event handlers see current values
  const modeRef = useRef(mode);
  const useRoutingRef = useRef(useRouting);
  const waypointsRef = useRef(waypoints);
  const routeCoordsRef = useRef(routeCoords);
  const callbacksRef = useRef({
    onWaypointsChange,
    onRouteChange,
    onLoadingChange,
    onError,
  });

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
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
    };
  }, [onWaypointsChange, onRouteChange, onLoadingChange, onError]);

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

      // Click handler - add waypoint in click mode
      map.on("click", (e) => {
        if (modeRef.current !== "click") return;
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

  // Toggle dragging when mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mode === "draw") {
      map.dragging.disable();
      map.doubleClickZoom.disable();
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
    }
  }, [mode]);

  // Render markers from waypoints
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

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
  }, [waypoints]);

  // Rebuild route when waypoints or routing toggle change (click mode only)
  useEffect(() => {
    if (mode !== "click") return;

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
  }, [waypoints, useRouting, mode]);

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
  }, [routeCoords]);

  // Freehand draw handlers
  useEffect(() => {
    const container = containerRef.current;
    const map = mapRef.current;
    if (!container || !map) return;

    const getLatLng = (e: MouseEvent | TouchEvent): Coord | null => {
      const point =
        "touches" in e && e.touches.length > 0 ? e.touches[0] : (e as MouseEvent);
      const rect = container.getBoundingClientRect();
      const x = point.clientX - rect.left;
      const y = point.clientY - rect.top;
      const ll = map.containerPointToLatLng([x, y]);
      return [ll.lat, ll.lng];
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      if (modeRef.current !== "draw") return;
      e.preventDefault();
      const ll = getLatLng(e);
      if (!ll) return;
      isDrawingRef.current = true;
      drawCoordsRef.current = [ll];
      callbacksRef.current.onWaypointsChange([]);
      callbacksRef.current.onRouteChange([ll]);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current || modeRef.current !== "draw") return;
      e.preventDefault();
      const ll = getLatLng(e);
      if (!ll) return;
      drawCoordsRef.current.push(ll);
      callbacksRef.current.onRouteChange([...drawCoordsRef.current]);
    };

    const onEnd = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (modeRef.current !== "draw") return;
      const coords = drawCoordsRef.current;
      if (coords.length < 2) return;
      callbacksRef.current.onWaypointsChange([
        { lat: coords[0][0], lng: coords[0][1] },
        {
          lat: coords[coords.length - 1][0],
          lng: coords[coords.length - 1][1],
        },
      ]);
    };

    container.addEventListener("mousedown", onStart);
    container.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    container.addEventListener("touchstart", onStart, { passive: false });
    container.addEventListener("touchmove", onMove, { passive: false });
    container.addEventListener("touchend", onEnd);

    return () => {
      container.removeEventListener("mousedown", onStart);
      container.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      container.removeEventListener("touchstart", onStart);
      container.removeEventListener("touchmove", onMove);
      container.removeEventListener("touchend", onEnd);
    };
  }, []);

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
  }));

  return <div ref={containerRef} className="h-full w-full" />;
});

export default RouteMap;
