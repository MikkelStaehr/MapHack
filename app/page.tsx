"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import ModeToggle from "@/components/ModeToggle";
import ActionsPanel from "@/components/ActionsPanel";
import { Toast, Hint, LoadingOverlay } from "@/components/Toast";
import SearchBar from "@/components/SearchBar";
import PoiCreateSheet from "@/components/PoiCreateSheet";
import PoiInfoSheet from "@/components/PoiInfoSheet";
import PhaseBar from "@/components/PhaseBar";

// qrcode + modal UI is only needed when the user actually shares — keep
// it out of the main bundle and pull it in on first open.
const ShareModal = dynamic(() => import("@/components/ShareModal"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <span className="spinner" />
    </div>
  ),
});
import type {
  Coord,
  LatLng,
  Mode,
  Phase,
  POI,
  PoiSnapRequest,
  PoiType,
} from "@/lib/types";
import { totalDistanceKm } from "@/lib/geo";
import { buildGpx, parseGpx, sanitizeFilename } from "@/lib/gpx";
import { buildShareUrl, parseShareHash } from "@/lib/share";
import { setRouteSnapshot } from "@/lib/routeMirror";
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
  const [pois, setPois] = useState<POI[]>([]);
  const [pendingPoi, setPendingPoi] = useState<PoiSnapRequest | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("route");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [hint, setHint] = useState("Tap på kortet for at sætte punkter");
  const [hintVisible, setHintVisible] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const mapRef = useRef<RouteMapHandle>(null);

  // Show a message briefly
  const showToast = (msg: string) => {
    setToast(msg);
    setToastKey((k) => k + 1);
  };

  // Update hint when phase or mode changes, auto-hide after 3s
  useEffect(() => {
    if (phase === "poi") {
      setHint("Tap på ruten for at markere checkpoints");
    } else if (mode === "draw") {
      setHint("Tegn ruten med fingeren - slip for at afslutte");
    } else {
      setHint("Tap på kortet for at sætte punkter");
    }
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), 3000);
    return () => clearTimeout(t);
  }, [mode, phase]);

  // Mirror route into a module-level snapshot so the ErrorBoundary can
  // rescue it if React crashes and page state becomes inaccessible.
  useEffect(() => {
    setRouteSnapshot(routeCoords, routeName);
  }, [routeCoords, routeName]);

  const distanceKm = useMemo(() => totalDistanceKm(routeCoords), [routeCoords]);
  const selectedPoi = useMemo(
    () => pois.find((p) => p.id === selectedPoiId) ?? null,
    [pois, selectedPoiId],
  );
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
    setPois([]);
    setPhase("route");
  };

  const handleClear = () => {
    if (
      waypoints.length === 0 &&
      routeCoords.length === 0 &&
      pois.length === 0
    )
      return;
    if (confirm("Ryd hele ruten og alle checkpoints?")) clearAll();
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

  // Load a shared route from the URL hash on mount. Retries until RouteMap
  // has mounted so skipNextRouting() can take effect on the ref.
  useEffect(() => {
    const hash = window.location.hash;
    const parsed = parseShareHash(hash);
    if (!parsed) return;

    if (parsed.expired) {
      showToast("Linket er udløbet (>24 timer)");
      // Clear hash so reload doesn't retry
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    const apply = (attempt = 0) => {
      if (!mapRef.current) {
        if (attempt > 20) return; // ~1s worst case
        setTimeout(() => apply(attempt + 1), 50);
        return;
      }
      mapRef.current.skipNextRouting();
      setRouteCoords(parsed.coords);
      setWaypoints([
        { lat: parsed.coords[0][0], lng: parsed.coords[0][1] },
        {
          lat: parsed.coords[parsed.coords.length - 1][0],
          lng: parsed.coords[parsed.coords.length - 1][1],
        },
      ]);
      if (parsed.name) setRouteName(parsed.name);
      // New route → wipe any existing POIs and bring user back to route
      // phase. POI-through-share comes later in step 8.
      setPois([]);
      setPhase("route");
      setTimeout(() => mapRef.current?.fitToRoute(), 60);
      showToast("Rute indlæst fra link ✓");
    };
    apply();
  }, []);

  const handleReverse = () => {
    if (routeCoords.length < 2) return;
    mapRef.current?.skipNextRouting();
    setRouteCoords([...routeCoords].reverse());
    setWaypoints([...waypoints].reverse());
    // Flip POIs' routeIndex to match the reversed order
    setPois((prev) =>
      prev.map((p) => ({
        ...p,
        routeIndex: Math.max(0, routeCoords.length - 2 - p.routeIndex),
      })),
    );
    showToast("Rute omvendt ✓");
  };

  // Creates a new POI from the currently pending snap request. id via
  // crypto.randomUUID with a timestamp+random fallback for older environments.
  const handleCommitPoi = (type: PoiType, name: string) => {
    if (!pendingPoi) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const trimmed = name.trim();
    setPois((prev) => [
      ...prev,
      {
        id,
        type,
        name: trimmed ? trimmed : undefined,
        coord: pendingPoi.coord,
        routeIndex: pendingPoi.routeIndex,
      },
    ]);
    setPendingPoi(null);
    showToast("Checkpoint tilføjet ✓");
  };

  const handleDeletePoi = (id: string) => {
    setPois((prev) => prev.filter((p) => p.id !== id));
    setSelectedPoiId(null);
    showToast("Checkpoint slettet ✓");
  };

  const handleShare = async () => {
    if (routeCoords.length < 2) return;
    const name = (routeName || "Cykelrute").trim();
    const url = buildShareUrl(name, routeCoords);

    // Reflect in address bar so refresh keeps the route.
    window.history.replaceState(null, "", url);

    // Open the share modal which handles QR rendering. Best-effort clipboard
    // copy up front so the user doesn't have to click again if they don't
    // need the QR.
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Modal still shows the URL so they can copy manually
    }
    setShareUrl(url);
  };

  const handleUploadFile = async (file: File) => {
    try {
      const text = await file.text();
      const { name, coords } = parseGpx(text);
      if (coords.length < 2) {
        showToast("Ingen punkter fundet i filen");
        return;
      }
      // Replace current route entirely. Tell the map to skip the re-routing
      // effect so the uploaded track isn't overwritten by OSRM/straight line.
      mapRef.current?.skipNextRouting();
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
      // New file → fresh POI slate, back in route phase. POI parsing from
      // the file comes in step 7.
      setPois([]);
      setPhase("route");
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
        <PhaseBar
          phase={phase}
          onChange={setPhase}
          canGoToPoi={routeCoords.length >= 2}
        />
        {phase === "route" && <ModeToggle mode={mode} onChange={setMode} />}
        <SearchBar
          onPick={(lat, lng) => mapRef.current?.panTo(lat, lng)}
        />
        <Hint text={hint} visible={hintVisible} />
        <RouteMap
          ref={mapRef}
          mode={mode}
          phase={phase}
          useRouting={useRouting}
          waypoints={waypoints}
          routeCoords={routeCoords}
          pois={pois}
          onWaypointsChange={setWaypoints}
          onRouteChange={setRouteCoords}
          onLoadingChange={setLoading}
          onError={showToast}
          onPoiRequest={setPendingPoi}
          onPoiSelect={setSelectedPoiId}
        />
        <LoadingOverlay show={loading} />
      </div>

      <ActionsPanel
        phase={phase}
        useRouting={useRouting}
        onRoutingToggle={() => setUseRouting((v) => !v)}
        routeName={routeName}
        onRouteNameChange={setRouteName}
        canDownload={canDownload}
        onUndo={handleUndo}
        onClear={handleClear}
        onDownload={handleDownload}
        onUploadFile={handleUploadFile}
        onShare={handleShare}
        onReverse={handleReverse}
      />

      <Toast key={toastKey} message={toast} />
      {shareUrl && (
        <ShareModal url={shareUrl} onClose={() => setShareUrl(null)} />
      )}

      <PoiCreateSheet
        pending={pendingPoi}
        onSave={handleCommitPoi}
        onCancel={() => setPendingPoi(null)}
      />
      <PoiInfoSheet
        poi={selectedPoi}
        onDelete={handleDeletePoi}
        onClose={() => setSelectedPoiId(null)}
      />
    </div>
  );
}
