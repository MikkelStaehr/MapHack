"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import ModeToggle from "@/components/ModeToggle";
import ActionsPanel from "@/components/ActionsPanel";
import { Toast, Hint, LoadingOverlay } from "@/components/Toast";
import type { Coord, LatLng, Mode } from "@/lib/types";
import { totalDistanceKm } from "@/lib/geo";
import { buildGpx, parseGpx, sanitizeFilename } from "@/lib/gpx";
import type { RouteMapHandle } from "@/components/RouteMap";

// Leaflet touches window, so it must be client-only
const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#1a1a1a] font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
      Indlæser kort…
    </div>
  ),
});

export default function Home() {
  const [mode, setMode] = useState<Mode>("click");
  const [useRouting, setUseRouting] = useState(true);
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [routeCoords, setRouteCoords] = useState<Coord[]>([]);
  const [routeName, setRouteName] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [hint, setHint] = useState("Tap på kortet for at sætte punkter");
  const [hintVisible, setHintVisible] = useState(true);

  const mapRef = useRef<RouteMapHandle>(null);

  // Show a message briefly
  const showToast = (msg: string) => {
    setToast(msg);
    setToastKey((k) => k + 1);
  };

  // Update hint when mode changes, auto-hide after 3s
  useEffect(() => {
    if (mode === "draw") {
      setHint("Tegn ruten med fingeren - slip for at afslutte");
    } else {
      setHint("Tap på kortet for at sætte punkter");
    }
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), 3000);
    return () => clearTimeout(t);
  }, [mode]);

  const distanceKm = useMemo(() => totalDistanceKm(routeCoords), [routeCoords]);
  const pointCount = waypoints.length;
  const canDownload = routeCoords.length >= 2;

  const handleUndo = () => {
    if (mode === "draw") {
      // In draw mode undo = clear (one continuous stroke)
      clearAll();
      return;
    }
    if (waypoints.length === 0) return;
    setWaypoints(waypoints.slice(0, -1));
  };

  const clearAll = () => {
    setWaypoints([]);
    setRouteCoords([]);
  };

  const handleClear = () => {
    if (waypoints.length === 0 && routeCoords.length === 0) return;
    if (confirm("Ryd hele ruten?")) clearAll();
  };

  const handleDownload = () => {
    if (routeCoords.length < 2) return;
    const name = (routeName || "Cykelrute").trim();
    const gpx = buildGpx(name, routeCoords);
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sanitizeFilename(name) + ".gpx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("GPX downloadet ✓");
  };

  const handleUploadFile = async (file: File) => {
    try {
      const text = await file.text();
      const { name, coords } = parseGpx(text);
      if (coords.length < 2) {
        showToast("Ingen punkter fundet i filen");
        return;
      }
      // Replace current route entirely
      setRouteCoords(coords);
      setWaypoints([
        { lat: coords[0][0], lng: coords[0][1] },
        {
          lat: coords[coords.length - 1][0],
          lng: coords[coords.length - 1][1],
        },
      ]);
      const cleanName = name || file.name.replace(/\.gpx$/i, "");
      setRouteName(cleanName);
      // Fit map to the new route after state settles
      setTimeout(() => mapRef.current?.fitToRoute(), 50);
      showToast("Rute indlæst ✓");
    } catch (err) {
      console.error(err);
      showToast("Kunne ikke læse GPX-filen");
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col">
      <Header pointCount={pointCount} distanceKm={distanceKm} />

      <div className="relative flex-1">
        <ModeToggle mode={mode} onChange={setMode} />
        <Hint text={hint} visible={hintVisible} />
        <RouteMap
          ref={mapRef}
          mode={mode}
          useRouting={useRouting}
          waypoints={waypoints}
          routeCoords={routeCoords}
          onWaypointsChange={setWaypoints}
          onRouteChange={setRouteCoords}
          onLoadingChange={setLoading}
          onError={showToast}
        />
        <LoadingOverlay show={loading} />
      </div>

      <ActionsPanel
        useRouting={useRouting}
        onRoutingToggle={() => setUseRouting((v) => !v)}
        routeName={routeName}
        onRouteNameChange={setRouteName}
        canDownload={canDownload}
        onUndo={handleUndo}
        onClear={handleClear}
        onDownload={handleDownload}
        onUploadFile={handleUploadFile}
      />

      <Toast key={toastKey} message={toast} />
    </div>
  );
}
