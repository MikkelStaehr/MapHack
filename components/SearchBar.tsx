"use client";

import { useEffect, useRef, useState } from "react";

type Result = { label: string; lat: number; lng: number };

type Props = {
  onPick: (lat: number, lng: number) => void;
};

type NominatimResult = { display_name: string; lat: string; lon: string };

// Nominatim public API. Usage policy: max 1 req/sec, send a descriptive
// User-Agent. Browsers set UA automatically and we debounce at 500ms so
// typical typing stays well under the limit.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export default function SearchBar({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 3) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      try {
        const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=0`;
        const res = await fetch(url, { signal: abortRef.current.signal });
        if (!res.ok) throw new Error("Nominatim failed");
        const data: NominatimResult[] = await res.json();
        setResults(
          data
            .map((r) => ({
              label: r.display_name,
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon),
            }))
            .filter((r) => !isNaN(r.lat) && !isNaN(r.lng)),
        );
      } catch (e) {
        const isAbort = e instanceof DOMException && e.name === "AbortError";
        if (!isAbort) setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [q, open]);

  const handlePick = (r: Result) => {
    onPick(r.lat, r.lng);
    close();
  };

  const close = () => {
    setOpen(false);
    setQ("");
    setResults([]);
    abortRef.current?.abort();
  };

  return (
    <div className="absolute left-3 top-3 z-[500]">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Søg"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-ink)] shadow-lg shadow-black/40 transition-transform active:scale-[0.95] cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      ) : (
        <div className="w-[min(80vw,360px)] rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-lg shadow-black/40">
          <div className="flex items-center gap-2 p-2">
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Søg adresse eller sted"
              className="flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <button
              onClick={close}
              aria-label="Luk"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-ink)] cursor-pointer"
            >
              ×
            </button>
          </div>
          {loading && (
            <div className="flex items-center gap-2 px-3 pb-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-ink-dim)]">
              <span className="spinner" />
              Søger…
            </div>
          )}
          {results.length > 0 && (
            <ul className="max-h-[40vh] overflow-y-auto border-t border-[var(--color-line)]">
              {results.map((r, i) => (
                <li key={`${r.lat},${r.lng},${i}`}>
                  <button
                    onClick={() => handlePick(r)}
                    className="block w-full border-b border-[var(--color-line)] px-3 py-2.5 text-left text-[13px] leading-snug text-[var(--color-ink)] transition-colors last:border-0 hover:bg-[var(--color-panel-2)] cursor-pointer"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && q.trim().length >= 3 && results.length === 0 && (
            <p className="px-3 pb-3 text-[12px] text-[var(--color-ink-dim)]">
              Ingen resultater
            </p>
          )}
        </div>
      )}
    </div>
  );
}
