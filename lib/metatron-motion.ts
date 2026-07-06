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

// The eye morph experiment is retired — the cube folds and drifts, period.
// The frame still reports pupil/lid fields so the components stay stable:
// pupil rests at node size, the lid never draws.
export function metatronFrame(t: number): MetatronFrame {
  const fold = Math.sin(t * 0.42) * 0.5 + 0.5
  const g = t * 0.18

  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }]
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - HALF * fold + g
    pts.push({ x: Math.cos(a) * D, y: Math.sin(a) * D })
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + HALF * fold + g
    const r = D * (2 - (2 - Math.sqrt(3)) * fold)
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }

  return { pts, pupilR: 4, lidOpacity: 0, lid: [] }
}
