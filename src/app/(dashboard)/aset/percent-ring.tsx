// Ring SVG ringan — tiada library carta (satu metrik sahaja, tak berbaloi
// tambah dependency). stroke-dasharray drpd lilitan bulatan, bukan lib.
export function PercentRing({ percent, size = 72 }: { percent: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={stroke}
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-display font-bold tabular-nums"
        style={{ fontSize: size * 0.24 }}
      >
        {clamped}%
      </text>
    </svg>
  );
}
