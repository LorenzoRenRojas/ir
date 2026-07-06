// The single source of truth for Metatron motion, shared by the landing hero,
// the marketing backdrops, and the onboarding/coming-soon avatar.
//
// Timeline (period 18s): the cube folds and drifts as always — then once per
// cycle it wakes: geometry eases to the half-fold flat-top stance, squashes
// into the Eye, the upper lid draws in, the pupil dilates, it blinks twice,
// holds your gaze, and dissolves back into the cube.

const HALF = Math.PI / 6
const D = 132

export interface MetatronFrame {
  pts: { x: number; y: number }[]
  pupilR: number // center-node radius (grows into the pupil)
  lidOpacity: number // upper-lid liner stroke opacity (0 = hidden)
  lid: { x: number; y: number }[] // polyline along the upper lid
}

const PERIOD = 18
const EYE_START = 10
const EYE_END = 16

// One continuous breath: sin²(πu) rises from exactly 0, peaks, and returns to
// exactly 0 with zero velocity at both ends — the eye forms AS the geometry
// moves and dissolves the same way. No plateaus, no blink events, no snaps.
function eyeEnvelope(tm: number): number {
  if (tm <= EYE_START || tm >= EYE_END) return 0
  const u = (tm - EYE_START) / (EYE_END - EYE_START)
  const s = Math.sin(Math.PI * u)
  return s * s
}

export function metatronFrame(t: number): MetatronFrame {
  let fold = Math.sin(t * 0.42) * 0.5 + 0.5
  let g = t * 0.18

  const tm = t % PERIOD
  const e = eyeEnvelope(tm)

  if (e > 0) {
    // Blend toward the Eye stance: fold 0.5, flat-top orientation. The target
    // rotation is fixed from the WINDOW START (deterministic, no state), so it
    // can't jump mid-morph — angles repeat every 60°, making this the nearest
    // equivalent stance, a settle rather than a spin.
    const SIXTH = Math.PI / 3
    const target = -15 * (Math.PI / 180)
    const windowStartT = t - tm + EYE_START
    const gAtStart = windowStartT * 0.18
    const k = Math.round((gAtStart - target) / SIXTH)
    const gTarget = target + k * SIXTH
    fold = fold + (0.5 - fold) * e
    g = g + (gTarget - g) * e
  }

  const squash = 1 - 0.44 * e
  const innerTuck = 1 - 0.18 * e // inner ring tucks so no vertex breaks the almond

  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - HALF * fold + g
    pts.push({ x: Math.cos(a) * D, y: Math.sin(a) * D * squash * innerTuck })
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + HALF * fold + g
    const r = D * (2 - (2 - Math.sqrt(3)) * fold)
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * squash })
  }

  // Pupil dilates on the same envelope — one gesture with everything else
  const pupilR = 4 + 26 * e

  // Upper lid: left hull tip → top nodes → right hull tip; the liner fades in
  // on the same curve, so it's simply the hull edge gaining weight
  const outer = pts.slice(7)
  const byX = [...outer].sort((a, b) => a.x - b.x)
  const tops = outer.filter(p => p.y < -1).sort((a, b) => a.x - b.x)
  const lid = [byX[0], ...tops, byX[byX.length - 1]]

  return { pts, pupilR, lidOpacity: e * 0.95, lid }
}
