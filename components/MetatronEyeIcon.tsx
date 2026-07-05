// The Eye at icon size — Recompete Radar's mark. Same geometry as the logo
// (half-fold, flat-top, 0.5 squash), currentColor so it inherits button/nav
// color and ignites via the shared .ir-mticon hover CSS.

const HALF = Math.PI / 6
const D = 120
const fold = 0.5
const g = -15 * (Math.PI / 180)
const squash = 0.5

const pts: [number, number][] = []
for (let i = 0; i < 6; i++) {
  const a = (i * Math.PI) / 3 - HALF * fold + g
  pts.push([Math.cos(a) * D, Math.sin(a) * D * squash])
}
const outer: [number, number][] = []
for (let i = 0; i < 6; i++) {
  const a = (i * Math.PI) / 3 + HALF * fold + g
  const r = D * (2 - (2 - Math.sqrt(3)) * fold)
  outer.push([Math.cos(a) * r, Math.sin(a) * r * squash])
}

const byX = [...outer].sort((a, b) => a[0] - b[0])
const tops = outer.filter(p => p[1] < -1).sort((a, b) => a[0] - b[0])
const lid = [byX[0], ...tops, byX[byX.length - 1]]
const LID = 'M' + lid.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')
// lower hull for the eye outline
const bottoms = outer.filter(p => p[1] > 1).sort((a, b) => a[0] - b[0])
const lower = [byX[0], ...bottoms, byX[byX.length - 1]]
const LOWER = 'M' + lower.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')

export default function MetatronEyeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      className="ir-mticon"
      width={size}
      height={size * 0.62}
      viewBox="-250 -150 500 300"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={LID} stroke="currentColor" strokeWidth="26" fill="none" strokeLinecap="round" />
      <path d={LOWER} stroke="currentColor" strokeWidth="14" strokeOpacity="0.55" fill="none" strokeLinecap="round" />
      <circle cx="0" cy="0" r="52" fill="currentColor" />
    </svg>
  )
}
