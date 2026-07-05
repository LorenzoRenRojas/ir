// Tiny static Metatron mark for buttons — the inner ring of the half-fold
// geometry (center + 6 nodes, fully connected). Uses currentColor, so it
// inherits the button's text color; globals.css lights it crimson with a
// glow when the parent button/link is hovered (class: ir-mticon).
// Deliberately NOT animated per-instance: dozens of RAF loops on a list page
// would burn CPU — hover glow gives the "lights up" feel at zero idle cost.

const HALF = Math.PI / 6
const D = 100
const fold = 0.5
const g = -15 * (Math.PI / 180)

const pts: [number, number][] = [[0, 0]]
for (let i = 0; i < 6; i++) {
  const a = (i * Math.PI) / 3 - HALF * fold + g
  pts.push([Math.cos(a) * D, Math.sin(a) * D])
}

const lines: string[] = []
for (let i = 0; i < pts.length; i++) {
  for (let j = i + 1; j < pts.length; j++) {
    lines.push(`M${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}L${pts[j][0].toFixed(1)} ${pts[j][1].toFixed(1)}`)
  }
}
const PATH = lines.join('')

export default function MetatronIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      className="ir-mticon"
      width={size}
      height={size}
      viewBox="-130 -130 260 260"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={PATH} stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="16" fill="currentColor" />
      ))}
    </svg>
  )
}
