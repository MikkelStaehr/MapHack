"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = {
  url: string | null;
  onClose: () => void;
};

export default function ShareModal({ url, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrTooBig, setQrTooBig] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate QR from the share URL. QR code has a capacity limit; very long
  // routes (rare after DP simplification) can overflow — fall back to text.
  useEffect(() => {
    if (!url) {
      setQrDataUrl(null);
      setQrTooBig(false);
      return;
    }
    QRCode.toDataURL(url, {
      margin: 1,
      width: 260,
      errorCorrectionLevel: "L",
      color: { dark: "#0e0e0e", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrTooBig(true));
  }, [url]);

  // Reset "copied" indicator when modal re-opens
  useEffect(() => {
    if (url) setCopied(false);
  }, [url]);

  if (!url) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers / insecure context: user has the URL visible below
    }
  };

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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg uppercase tracking-tight">
            Del rute
          </h2>
          <button
            onClick={onClose}
            aria-label="Luk"
            className="h-8 w-8 rounded-full border border-[var(--color-line)] text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-ink)] cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex min-h-[260px] items-center justify-center rounded-xl bg-white p-3">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR-kode til rute-link"
              width={240}
              height={240}
              className="block"
            />
          ) : qrTooBig ? (
            <p className="px-4 text-center text-sm text-[var(--color-bg)]">
              Ruten er for lang til at passe i en QR-kode — brug linket
              nedenfor.
            </p>
          ) : (
            <span className="spinner" />
          )}
        </div>

        <p className="mb-3 break-all rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-dim)]">
          {url}
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-3.5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] transition-transform active:scale-[0.97] cursor-pointer"
          >
            {copied ? "Kopieret ✓" : "Kopier link"}
          </button>
        </div>

        <p className="mt-3 text-center font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">
          Linket udløber efter 24 timer
        </p>
      </div>
    </div>
  );
}
