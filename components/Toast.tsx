"use client";

import { useEffect, useState } from "react";

export function Toast({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!message) return;
    setText(message);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-[2000] -translate-x-1/2 rounded-full bg-[var(--color-ink)] px-4 py-2.5 text-sm font-semibold text-[var(--color-bg)] transition-opacity duration-200 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {text}
    </div>
  );
}

export function Hint({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-16 z-[500] max-w-[90%] -translate-x-1/2 rounded-lg border border-[var(--color-line)] bg-black/90 px-3.5 py-2 text-center text-xs text-[var(--color-ink)] backdrop-blur-md transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {text}
    </div>
  );
}

export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-[600] flex items-center justify-center bg-black/60 font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-ink)]">
      <span className="spinner mr-2.5" />
      Beregner rute…
    </div>
  );
}
