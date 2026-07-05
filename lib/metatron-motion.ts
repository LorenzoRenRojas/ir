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
const EYE_START = 11
const EYE_END = 16.5

function eyeEnvelope(tm: number): number {
  if (tm <= EYE_START || tm >= EYE_END) return 0
  const u = (tm - EYE_START) / (EYE_END - EYE_START)
  if (u < 0.18) return u / 0.18 // ease in
  if (u > 0.85) return (1 - u) / 0.15 // ease out
  return 1
}

export function metatronFrame(t: number): MetatronFrame {
  let fold = Math.sin(t * 0.42) * 0.5 + 0.5
  let g = t * 0.18

  const tm = t % PERIOD
  const e = eyeEnvelope(tm)

  if (e > 0) {
    // Blend toward the Eye stance: fold 0.5, flat-top orientation. Angles
    // repeat every 60°, so snap g to the NEAREST equivalent of -15° — a small
    // rotation, never a spin.
    const SIXTH = Math.PI / 3
    const target = -15 * (Math.PI / 180)
    const k = Math.round((g - target) / SIXTH)
    const gTarget = target + k * SIXTH
    fold = fold + (0.5 - fold) * e
    g = g + (gTarget - g) * e
  }

  const squash = 1 - 0.48 * e

  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - HALF * fold + g
    pts.push({ x: Math.cos(a) * D, y: Math.sin(a) * D * squash })
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + HALF * fold + g
    const r = D * (2 - (2 - Math.sqrt(3)) * fold)
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * squash })
  }

  // Pupil: dormant node → dilated gaze; two quick blinks near the hold's end
  let pupilR = 4 + 26 * e
  if (e > 0.95) {
    const inBlink = (a: number, b: number) => tm >= a && tm <= b
    if (inBlink(14.6, 14.78) || inBlink(15.0, 15.18)) pupilR = 4
  }

  // Upper lid: left hull tip → top nodes → right hull tip (only meaningful
  // while the eye is open; opacity follows the envelope)
  const outer = pts.slice(7)
  const byX = [...outer].sort((a, b) => a.x - b.x)
  const tops = outer.filter(p => p.y < -1).sort((a, b) => a.x - b.x)
  const lid = [byX[0], ...tops, byX[byX.length - 1]]

  return { pts, pupilR, lidOpacity: e * 0.95, lid }
}
