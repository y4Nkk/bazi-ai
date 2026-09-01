/**
 * Brand mark: four ascending pillar-candles — the four pillars of the natal
 * chart drawn as the fate-trend chart. Pure fill shapes keep it crisp from
 * favicon to header size; uses the primary token so it follows light/dark.
 */
export function BrandMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="5 5 54 54"
      className={className}
      role="img"
      aria-label="命轨标志"
    >
      <g className="fill-current">
        <rect x="9.5" y="30" width="3" height="22" rx={1.5} />
        <rect x="6" y="34" width="10" height="14" rx={3.5} />
        <rect x="23.5" y="24" width="3" height="24" rx={1.5} />
        <rect x="20" y="28" width="10" height="16" rx={3.5} />
        <rect x="37.5" y="18" width="3" height="26" rx={1.5} />
        <rect x="34" y="22" width="10" height="18" rx={3.5} />
        <rect x="51.5" y="12" width="3" height="28" rx={1.5} />
        <rect x="48" y="16" width="10" height="20" rx={3.5} />
      </g>
    </svg>
  );
}
