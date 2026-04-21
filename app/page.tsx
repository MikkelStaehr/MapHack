"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import ActionsPanel from "@/components/ActionsPanel";
import { Toast, Hint, LoadingOverlay } from "@/components/Toast";
import SearchBar from "@/components/SearchBar";
import PoiCreateSheet from "@/components/PoiCreateSheet";
import PoiInfoSheet from "@/components/PoiInfoSheet";
import PhaseBar from "@/components/PhaseBar";
import GeneratePanel from "@/components/GeneratePanel";
import DownloadFormatSheet, {
  type DownloadFormat,
} from "@/components/DownloadFormatSheet";

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
  Phase,
  POI,
  PoiSnapRequest,
  PoiType,
} from "@/lib/types";
import { totalDistanceKm } from "@/lib/geo";
import { buildGpx, sanitizeFilename } from "@/lib/gpx";
import { buildTcx } from "@/lib/tcx";
import { parseRouteFile } from "@/lib/import";
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
  const [useRouting, setUseRouting] = useState(true);
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [routeCoords, setRouteCoords] = useState<Coord[]>([]);
  const [routeName, setRouteName] = useState("");
  const [pois, setPois] = useState<POI[]>([]);
  const [pendingPoi, setPendingPoi] = useState<PoiSnapRequest | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("route");
  const [downloadOpen, setDownloadOpen] = useState(false);
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

  // Update hint when phase changes, auto-hide after 3s
  useEffect(() => {
    setHint(
      phase === "poi"
        ? "Tap på ruten for at markere checkpoints"
        : "Tap på kortet for at sætte punkter",
    );
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  // Mirror route into a module-level snapshot so the ErrorBoundary can
  // rescue it if React crashes and page state becomes inaccessible.
  useEffect(() => {
    setRouteSnapshot(routeCoords, routeName, pois);
  }, [routeCoords, routeName, pois]);

  // When entering the generate phase, fit the map to the route so the user
  // sees the whole thing at once for review. Small delay for layout.
  useEffect(() => {
    if (phase === "generate") {
      const t = setTimeout(() => mapRef.current?.fitToRoute(), 80);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const distanceKm = useMemo(() => totalDistanceKm(routeCoords), [routeCoords]);
  const selectedPoi = useMemo(
    () => pois.find((p) => p.id === selectedPoiId) ?? null,
    [pois, selectedPoiId],
  );
  const pointCount = waypoints.length;
  const canDownload = routeCoords.length >= 2;

  const handleUndo = () => {
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
    setDownloadOpen(true);
  };

  const handleDownloadFormat = (format: DownloadFormat) => {
    if (routeCoords.length < 2) return;
    const name = (routeName || "Cykelrute").trim();
    let body: string;
    let mime: string;
    let ext: string;
    if (format === "tcx") {
      body = buildTcx(name, routeCoords, pois);
      mime = "application/vnd.garmin.tcx+xml";
      ext = ".tcx";
    } else {
      body = buildGpx(name, routeCoords, pois);
      mime = "application/gpx+xml";
      ext = ".gpx";
    }
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sanitizeFilename(name) + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadOpen(false);
    showToast(`${format.toUpperCase()} downloadet ✓`);
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
      // Apply POIs that came through the link (if any). Each is already
      // anchored to the route by the parser.
      setPois(parsed.pois);
      setPhase("route");
      setTimeout(() => mapRef.current?.fitToRoute(), 60);
      const n = parsed.pois.length;
      showToast(
        n > 0
          ? `Rute + ${n} checkpoint${n === 1 ? "" : "s"} indlæst fra link ✓`
          : "Rute indlæst fra link ✓",
      );
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
    const url = buildShareUrl(name, routeCoords, pois);

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
      const { name, coords, pois: parsedPois } = parseRouteFile(
        text,
        file.name,
      );
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
      const cleanName = name || file.name.replace(/\.(gpx|tcx)$/i, "");
      setRouteName(cleanName);
      // POIs parsed from the file are already snapped to the route by the
      // parser — apply them as-is. No dangling checkpoints from previous work.
      setPois(parsedPois);
      setPhase("route");
      // Fit map to the new route after state settles
      setTimeout(() => mapRef.current?.fitToRoute(), 50);
      const poiCount = parsedPois.length;
      showToast(
        poiCount > 0
          ? `Rute + ${poiCount} checkpoint${poiCount === 1 ? "" : "s"} indlæst ✓`
          : "Rute indlæst ✓",
      );
    } catch (err) {
      console.error(err);
      showToast("Kunne ikke læse filen");
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col">
      <Header pointCount={pointCount} distanceKm={distanceKm} />

      <div className="relative flex-1">
        <PhaseBar
          phase={phase}
          onChange={setPhase}
          canAdvance={routeCoords.length >= 2}
        />
        <SearchBar
          onPick={(lat, lng) => mapRef.current?.panTo(lat, lng)}
        />
        <Hint text={hint} visible={hintVisible} />
        <RouteMap
          ref={mapRef}
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

        {/* Phase 1/2 dock floats over the map as a translucent pill so the
            map stays fully visible behind it. Phase 3 uses a pinned panel
            below. */}
        {phase !== "generate" && (
          <div className="absolute bottom-0 left-0 right-0 z-[700]">
            <ActionsPanel
              phase={phase}
              useRouting={useRouting}
              onRoutingToggle={() => setUseRouting((v) => !v)}
              canDownload={canDownload}
              onUndo={handleUndo}
              onClear={handleClear}
              onUploadFile={handleUploadFile}
              onReverse={handleReverse}
            />
          </div>
        )}
      </div>

      {phase === "generate" && (
        <GeneratePanel
          routeCoords={routeCoords}
          pois={pois}
          routeName={routeName}
          onRouteNameChange={setRouteName}
          canExport={canDownload}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      )}

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
      <DownloadFormatSheet
        open={downloadOpen}
        hasCheckpoints={pois.length > 0}
        onSelect={handleDownloadFormat}
        onCancel={() => setDownloadOpen(false)}
      />
    </div>
  );
}
