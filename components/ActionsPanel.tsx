"use client";

import { useRef } from "react";
import { Bike } from "lucide-react";
import type { Phase } from "@/lib/types";

type Props = {
  phase: Phase;
  useRouting: boolean;
  onRoutingToggle: () => void;
  routeName: string;
  onRouteNameChange: (name: string) => void;
  canDownload: boolean;
  onUndo: () => void;
  onClear: () => void;
  onDownload: () => void;
  onUploadFile: (file: File) => void;
  onShare: () => void;
  onReverse: () => void;
};

export default function ActionsPanel({
  phase,
  useRouting,
  onRoutingToggle,
  routeName,
  onRouteNameChange,
  canDownload,
  onUndo,
  onClear,
  onDownload,
  onUploadFile,
  onShare,
  onReverse,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = ""; // Allow re-upload of same file
  };

  const btnBase =
    "rounded-lg border px-3 py-2.5 font-medium text-sm transition-transform active:scale-[0.97] cursor-pointer";
  const btnSecondary = `${btnBase} border-[var(--color-line)] bg-transparent text-[var(--color-ink)]`;
  const btnNeutral = `${btnBase} border-[var(--color-line)] bg-[var(--color-panel-2)] text-[var(--color-ink)]`;
  const btnDanger = `${btnBase} border-[var(--color-line)] bg-transparent text-[var(--color-danger)]`;
  const btnPrimary = canDownload
    ? `${btnBase} border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold`
    : `${btnBase} border-[var(--color-line)] bg-[var(--color-panel-2)] text-[var(--color-ink-dim)] font-semibold`;

  return (
    <div
      className="flex flex-col gap-2 border-t border-[var(--color-line)] bg-[var(--color-panel)] px-4 pt-2.5"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      {/* Name input with inline routing toggle (route phase only). The toggle
          lives here instead of its own row so route planning doesn't burn
          vertical space on a one-shot setting. */}
      <div className="flex items-center gap-2">
        {phase === "route" && (
          <button
            onClick={onRoutingToggle}
            aria-label={useRouting ? "Følg veje (slået til)" : "Lige linjer"}
            title="Følg veje (cykel)"
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              useRouting
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "border-[var(--color-line)] bg-[var(--color-panel-2)] text-[var(--color-ink-dim)]"
            }`}
          >
            <Bike size={18} strokeWidth={2.5} />
          </button>
        )}
        <input
          type="text"
          value={routeName}
          onChange={(e) => onRouteNameChange(e.target.value)}
          placeholder="Rutens navn (fx Onsdag solo)"
          className="flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        {phase === "route" && (
          <button onClick={onUndo} className={`flex-1 ${btnSecondary}`}>
            Fortryd
          </button>
        )}
        <button
          onClick={onReverse}
          disabled={!canDownload}
          className={`flex-1 ${btnSecondary} disabled:text-[var(--color-ink-dim)]`}
        >
          Omvend
        </button>
        <button onClick={onClear} className={`flex-1 ${btnDanger}`}>
          Ryd
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 ${btnNeutral}`}
        >
          Upload
        </button>
        <button
          onClick={onDownload}
          disabled={!canDownload}
          className={`flex-[2] ${btnPrimary}`}
        >
          Download GPX
        </button>
        <button
          onClick={onShare}
          disabled={!canDownload}
          className={`flex-1 ${btnNeutral} disabled:text-[var(--color-ink-dim)]`}
        >
          Del link
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx,application/gpx+xml,text/xml"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
