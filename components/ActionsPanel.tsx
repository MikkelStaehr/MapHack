"use client";

import { useRef } from "react";

type Props = {
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
    "rounded-lg border px-3.5 py-3 font-medium text-sm transition-transform active:scale-[0.97] cursor-pointer";
  const btnSecondary = `${btnBase} border-[var(--color-line)] bg-transparent text-[var(--color-ink)]`;
  const btnNeutral = `${btnBase} border-[var(--color-line)] bg-[var(--color-panel-2)] text-[var(--color-ink)]`;
  const btnDanger = `${btnBase} border-[var(--color-line)] bg-transparent text-[var(--color-danger)]`;
  const btnPrimary = canDownload
    ? `${btnBase} border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold`
    : `${btnBase} border-[var(--color-line)] bg-[var(--color-panel-2)] text-[var(--color-ink-dim)] font-semibold`;

  return (
    <div
      className="flex flex-col gap-2.5 border-t border-[var(--color-line)] bg-[var(--color-panel)] px-4 pt-3.5"
      style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom))" }}
    >
      {/* Routing toggle */}
      <div className="flex items-center gap-2 px-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-ink-dim)]">
        <button
          onClick={onRoutingToggle}
          className={`relative h-5 w-9 rounded-full border transition-colors cursor-pointer ${
            useRouting
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
              : "border-[var(--color-line)] bg-[var(--color-panel-2)]"
          }`}
          aria-label="Toggle routing"
        >
          <span
            className={`absolute top-px h-4 w-4 rounded-full transition-transform ${
              useRouting
                ? "translate-x-[17px] bg-[var(--color-accent-ink)]"
                : "translate-x-px bg-[var(--color-ink)]"
            }`}
          />
        </button>
        <span>Følg veje (cykel)</span>
      </div>

      <input
        type="text"
        value={routeName}
        onChange={(e) => onRouteNameChange(e.target.value)}
        placeholder="Rutens navn (fx Onsdag solo)"
        className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3.5 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:border-[var(--color-accent)] focus:outline-none"
      />

      <div className="flex gap-2">
        <button onClick={onUndo} className={`flex-1 ${btnSecondary}`}>
          Fortryd
        </button>
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
          Upload GPX
        </button>
        <button
          onClick={onDownload}
          disabled={!canDownload}
          className={`flex-[2] ${btnPrimary}`}
        >
          Download GPX
        </button>
      </div>

      <button
        onClick={onShare}
        disabled={!canDownload}
        className={`w-full ${btnNeutral} disabled:text-[var(--color-ink-dim)]`}
      >
        Del som link
      </button>

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
