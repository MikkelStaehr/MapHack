type Props = {
  pointCount: number;
  distanceKm: number;
};

export default function Header({ pointCount, distanceKm }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3">
      <div className="flex items-baseline gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-[18px] uppercase tracking-tight">
          Rute
        </h1>
        <span className="font-[family-name:var(--font-mono)] font-semibold text-[var(--color-accent)]">
          →
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-ink-dim)]">
          .gpx
        </span>
      </div>
      <div className="flex gap-4 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-dim)]">
        <span>
          <b className="font-semibold text-[var(--color-ink)]">{pointCount}</b>{" "}
          pkt
        </span>
        <span>
          <b className="font-semibold text-[var(--color-ink)]">
            {distanceKm.toFixed(1)}
          </b>{" "}
          km
        </span>
      </div>
    </header>
  );
}
