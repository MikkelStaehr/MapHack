"use client";

import { useEffect, useState } from "react";
import { POI_CONFIG, POI_TYPES } from "@/lib/poi";
import type { PoiSnapRequest, PoiType } from "@/lib/types";

type Props = {
  pending: PoiSnapRequest | null;
  onSave: (type: PoiType, name: string) => void;
  onCancel: () => void;
};

export default function PoiCreateSheet({ pending, onSave, onCancel }: Props) {
  const [type, setType] = useState<PoiType>("sprint");
  const [name, setName] = useState("");

  // Reset form each time the sheet opens
  useEffect(() => {
    if (pending) {
      setType("sprint");
      setName("");
    }
  }, [pending]);

  if (!pending) return null;

  const kmFromStart = (pending.distanceFromStartM / 1000).toFixed(1);

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
        <div className="mb-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg uppercase tracking-tight">
            Nyt checkpoint
          </h2>
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-ink-dim)]">
            Ved {kmFromStart} km på ruten
          </p>
        </div>

        <div className="mb-4 grid grid-cols-5 gap-2">
          {POI_TYPES.map((t) => {
            const cfg = POI_CONFIG[t];
            const Icon = cfg.icon;
            const active = type === t;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 transition-colors cursor-pointer ${
                  active
                    ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                    : "border-[var(--color-line)] bg-[var(--color-panel-2)]"
                }`}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2"
                  style={{
                    background: cfg.color,
                    borderColor: "var(--color-bg)",
                  }}
                >
                  <Icon size={18} color="#fff" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-medium text-[var(--color-ink)]">
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Navn (valgfrit)"
          maxLength={40}
          className="mb-3 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3.5 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:border-[var(--color-accent)] focus:outline-none"
        />

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[var(--color-line)] bg-transparent px-3.5 py-3 text-sm text-[var(--color-ink)] transition-transform active:scale-[0.97] cursor-pointer"
          >
            Annullér
          </button>
          <button
            onClick={() => onSave(type, name)}
            className="flex-[2] rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-3.5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] transition-transform active:scale-[0.97] cursor-pointer"
          >
            Gem checkpoint
          </button>
        </div>
      </div>
    </div>
  );
}
