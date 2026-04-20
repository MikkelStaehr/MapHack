"use client";

import { Component, type ReactNode } from "react";
import { getRouteSnapshot } from "@/lib/routeMirror";
import { buildGpx, sanitizeFilename } from "@/lib/gpx";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("App crash:", error);
  }

  handleRescue = () => {
    const snap = getRouteSnapshot();
    if (snap.coords.length >= 2) {
      const name = (snap.name || "Cykelrute").trim();
      const gpx = buildGpx(name, snap.coords);
      const blob = new Blob([gpx], { type: "application/gpx+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = sanitizeFilename(name) + ".gpx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    // Small delay so the download actually triggers before reload wipes
    // the current document.
    setTimeout(() => window.location.reload(), 400);
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const snap = getRouteSnapshot();
    const canRescue = snap.coords.length >= 2;

    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-5 bg-[var(--color-bg)] px-6 text-center">
        <div className="max-w-sm rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6">
          <h1 className="mb-2 font-[family-name:var(--font-display)] text-xl uppercase tracking-tight text-[var(--color-ink)]">
            Noget gik galt
          </h1>
          <p className="mb-5 text-sm text-[var(--color-ink-dim)]">
            {canRescue
              ? "Men din rute er sikker — hent den som GPX inden vi starter forfra."
              : "Der er ingen rute at redde — vi starter bare forfra."}
          </p>
          <button
            onClick={this.handleRescue}
            className="w-full rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-3.5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] transition-transform active:scale-[0.97] cursor-pointer"
          >
            {canRescue ? "Download GPX og start forfra" : "Start forfra"}
          </button>
        </div>
      </div>
    );
  }
}
