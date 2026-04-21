import type { Mode } from "@/lib/types";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

export default function ModeToggle({ mode, onChange }: Props) {
  const btnBase =
    "rounded-full px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer";
  const active = "bg-[var(--color-accent)] text-[var(--color-accent-ink)]";
  const inactive = "bg-transparent text-[var(--color-ink-dim)]";

  return (
    <div className="absolute left-1/2 top-16 z-[500] flex -translate-x-1/2 gap-0.5 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-1 shadow-lg shadow-black/40">
      <button
        onClick={() => onChange("click")}
        className={`${btnBase} ${mode === "click" ? active : inactive}`}
      >
        Klik
      </button>
      <button
        onClick={() => onChange("draw")}
        className={`${btnBase} ${mode === "draw" ? active : inactive}`}
      >
        Frihånd
      </button>
    </div>
  );
}
