import type { Phase } from "@/lib/types";

type Props = {
  phase: Phase;
  onChange: (phase: Phase) => void;
  canAdvance: boolean;
};

export default function PhaseBar({ phase, onChange, canAdvance }: Props) {
  const btnBase =
    "rounded-full px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";
  const active = "bg-[var(--color-accent)] text-[var(--color-accent-ink)]";
  const inactive = "bg-transparent text-[var(--color-ink-dim)]";

  return (
    <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 gap-0.5 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-1 shadow-lg shadow-black/40">
      <button
        onClick={() => onChange("route")}
        className={`${btnBase} ${phase === "route" ? active : inactive}`}
      >
        1. Rute
      </button>
      <button
        onClick={() => canAdvance && onChange("poi")}
        disabled={!canAdvance}
        className={`${btnBase} ${phase === "poi" ? active : inactive}`}
      >
        2. Checkpoints
      </button>
      <button
        onClick={() => canAdvance && onChange("generate")}
        disabled={!canAdvance}
        className={`${btnBase} ${phase === "generate" ? active : inactive}`}
      >
        3. Generér
      </button>
    </div>
  );
}
