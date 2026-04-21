"use client";

import { useRef } from "react";
import {
  Bike,
  Undo2,
  ArrowLeftRight,
  Trash2,
  Upload,
} from "lucide-react";
import type { Phase } from "@/lib/types";

type Props = {
  phase: Phase;
  useRouting: boolean;
  onRoutingToggle: () => void;
  canDownload: boolean;
  onUndo: () => void;
  onClear: () => void;
  onUploadFile: (file: File) => void;
  onReverse: () => void;
};

export default function ActionsPanel({
  phase,
  useRouting,
  onRoutingToggle,
  canDownload,
  onUndo,
  onClear,
  onUploadFile,
  onReverse,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = "";
  };

  // Dock button styles. 44x44 tap target (Apple HIG) with smaller icon.
  const btn =
    "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors active:scale-[0.94] cursor-pointer";
  const active = "bg-[var(--color-accent)] text-[var(--color-accent-ink)]";
  const neutral =
    "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]";
  const danger =
    "bg-transparent text-[var(--color-danger)] hover:bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)]";
  const disabled =
    "bg-transparent text-[var(--color-ink-dim)] cursor-not-allowed";

  return (
    <div
      className="flex items-center justify-center gap-0.5 border-t border-[var(--color-line)] bg-[var(--color-panel)] px-3 pt-2"
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      {phase === "route" && (
        <button
          onClick={onRoutingToggle}
          aria-label="Følg veje (cykel)"
          title="Følg veje (cykel)"
          className={`${btn} ${useRouting ? active : neutral}`}
        >
          <Bike size={20} strokeWidth={2.2} />
        </button>
      )}

      {phase === "route" && (
        <button
          onClick={onUndo}
          aria-label="Fortryd"
          title="Fortryd"
          className={`${btn} ${neutral}`}
        >
          <Undo2 size={20} strokeWidth={2.2} />
        </button>
      )}

      <button
        onClick={onReverse}
        disabled={!canDownload}
        aria-label="Omvend rute"
        title="Omvend rute"
        className={`${btn} ${canDownload ? neutral : disabled}`}
      >
        <ArrowLeftRight size={20} strokeWidth={2.2} />
      </button>

      <button
        onClick={onClear}
        aria-label="Ryd alt"
        title="Ryd alt"
        className={`${btn} ${danger}`}
      >
        <Trash2 size={20} strokeWidth={2.2} />
      </button>

      {phase === "route" && (
        <>
          <div className="mx-1 h-6 w-px bg-[var(--color-line)]" aria-hidden />

          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload GPX"
            title="Upload GPX-fil"
            className={`${btn} ${neutral}`}
          >
            <Upload size={20} strokeWidth={2.2} />
          </button>
        </>
      )}

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
