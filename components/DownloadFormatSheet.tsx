"use client";

import { FileText, Activity } from "lucide-react";

export type DownloadFormat = "gpx" | "tcx";

type Props = {
  open: boolean;
  hasCheckpoints: boolean;
  onSelect: (format: DownloadFormat) => void;
  onCancel: () => void;
};

export default function DownloadFormatSheet({
  open,
  hasCheckpoints,
  onSelect,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-[var(--color-line)] bg-[var(--color-panel)] p-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg uppercase tracking-tight">
          Vælg format
        </h2>

        <div className="mb-3 flex flex-col gap-2">
          <button
            onClick={() => onSelect("gpx")}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-2)] px-4 py-3.5 text-left transition-transform active:scale-[0.98] cursor-pointer hover:border-[var(--color-accent)]"
          >
            <FileText
              size={22}
              strokeWidth={2}
              className="flex-shrink-0 text-[var(--color-accent)]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                GPX
              </p>
              <p className="text-[11px] text-[var(--color-ink-dim)]">
                Kompatibel med Komoot, Strava, Wahoo, Garmin
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelect("tcx")}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-2)] px-4 py-3.5 text-left transition-transform active:scale-[0.98] cursor-pointer hover:border-[var(--color-accent)]"
          >
            <Activity
              size={22}
              strokeWidth={2}
              className="flex-shrink-0 text-[var(--color-accent)]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                TCX{hasCheckpoints ? " (med alerts)" : ""}
              </p>
              <p className="text-[11px] text-[var(--color-ink-dim)]">
                {hasCheckpoints
                  ? "Checkpoints alert'er på Wahoo / Garmin / Karoo"
                  : "Garmin Course format, understøtter alerts"}
              </p>
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full rounded-lg border border-[var(--color-line)] bg-transparent px-3.5 py-3 text-sm text-[var(--color-ink)] transition-transform active:scale-[0.97] cursor-pointer"
        >
          Annullér
        </button>
      </div>
    </div>
  );
}
