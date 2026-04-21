"use client";

import { useMemo } from "react";
import { Download, Share2 } from "lucide-react";
import type { Coord, POI } from "@/lib/types";
import { totalDistanceKm } from "@/lib/geo";
import {
  countLeftTurns,
  estimateCyclingMinutes,
  formatDuration,
} from "@/lib/stats";

type Props = {
  routeCoords: Coord[];
  pois: POI[];
  routeName: string;
  onRouteNameChange: (name: string) => void;
  canExport: boolean;
  onDownload: () => void;
  onShare: () => void;
};

export default function GeneratePanel({
  routeCoords,
  pois,
  routeName,
  onRouteNameChange,
  canExport,
  onDownload,
  onShare,
}: Props) {
  const distanceKm = useMemo(
    () => totalDistanceKm(routeCoords),
    [routeCoords],
  );
  const durationMin = useMemo(
    () => estimateCyclingMinutes(distanceKm),
    [distanceKm],
  );
  const leftTurns = useMemo(() => countLeftTurns(routeCoords), [routeCoords]);

  const stats: { label: string; value: string; sub?: string }[] = [
    { label: "Længde", value: `${distanceKm.toFixed(1)} km` },
    {
      label: "Varighed",
      value: formatDuration(durationMin),
      sub: "ved 25 km/t",
    },
    { label: "Checkpoints", value: String(pois.length) },
    {
      label: "Venstresving",
      value: String(leftTurns),
      sub: leftTurns === 1 ? "farligt" : "farlige",
    },
  ];

  return (
    <div
      className="flex flex-col gap-2.5 border-t border-[var(--color-line)] bg-[var(--color-panel)] px-4 pt-3"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <input
        type="text"
        value={routeName}
        onChange={(e) => onRouteNameChange(e.target.value)}
        placeholder="Giv ruten et navn"
        maxLength={60}
        className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2"
          >
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">
              {s.label}
            </p>
            <p className="font-[family-name:var(--font-display)] text-lg leading-tight text-[var(--color-ink)]">
              {s.value}
            </p>
            {s.sub && (
              <p className="font-[family-name:var(--font-mono)] text-[10px] leading-tight text-[var(--color-ink-dim)]">
                {s.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onDownload}
          disabled={!canExport}
          className={`flex flex-[2] items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition-transform active:scale-[0.97] cursor-pointer ${
            canExport
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
              : "border-[var(--color-line)] bg-[var(--color-panel-2)] text-[var(--color-ink-dim)] cursor-not-allowed"
          }`}
        >
          <Download size={16} strokeWidth={2.5} />
          Download
        </button>
        <button
          onClick={onShare}
          disabled={!canExport}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm transition-transform active:scale-[0.97] cursor-pointer ${
            canExport
              ? "border-[var(--color-line)] bg-[var(--color-panel-2)] text-[var(--color-ink)]"
              : "border-[var(--color-line)] bg-[var(--color-panel-2)] text-[var(--color-ink-dim)] cursor-not-allowed"
          }`}
        >
          <Share2 size={16} strokeWidth={2.5} />
          Del link
        </button>
      </div>
    </div>
  );
}
