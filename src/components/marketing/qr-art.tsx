/** Decorative QR-like pattern for marketing visuals. Not a scannable or real code. */
export function QrArt({ className }: { className?: string }) {
  const n = 21;
  const cells: [number, number][] = [];
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const finder = (x: number, y: number) =>
    [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx! && x < fx! + 7 && y >= fy! && y < fy! + 7);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rand() > 0.52) cells.push([x, y]);

  const Finder = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" rx="1.6" fill="currentColor" />
      <rect x="1" y="1" width="5" height="5" rx="1.1" fill="white" />
      <rect x="2" y="2" width="3" height="3" rx="0.8" fill="currentColor" />
    </g>
  );

  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} aria-hidden className={className}>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" rx="0.25" fill="currentColor" />
      ))}
      <Finder x={0} y={0} />
      <Finder x={n - 7} y={0} />
      <Finder x={0} y={n - 7} />
    </svg>
  );
}
