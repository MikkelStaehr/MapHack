"use client";

import { POI_CONFIG } from "@/lib/poi";
import type { POI } from "@/lib/types";

type Props = {
  poi: POI | null;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export default function PoiInfoSheet({ poi, onDelete, onClose }: Props) {
  if (!poi) return null;
  const cfg = POI_CONFIG[poi.type];
  const Icon = cfg.icon;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-[var(--color-line)] bg-[var(--color-panel)] p-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2"
            style={{
              background: cfg.color,
              borderColor: "var(--color-bg)",
            }}
          >
            <Icon size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-ink-dim)]">
              {cfg.label}
            </p>
            <h2 className="truncate text-lg font-semibold text-[var(--color-ink)]">
              {poi.name || cfg.label}
            </h2>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--color-line)] bg-transparent px-3.5 py-3 text-sm text-[var(--color-ink)] transition-transform active:scale-[0.97] cursor-pointer"
          >
            Luk
          </button>
          <button
            onClick={() => onDelete(poi.id)}
            className="flex-1 rounded-lg border border-[var(--color-danger)] bg-transparent px-3.5 py-3 text-sm font-semibold text-[var(--color-danger)] transition-transform active:scale-[0.97] cursor-pointer"
          >
            Slet
          </button>
        </div>
      </div>
    </div>
  );
}
