// Small helpers the Vardø drawing code shares: where the chapter keeps its state, which boat
// you sail, which ground you are on, and which nights have northern lights.

import type { Save } from '../game/state'
import type { BoatKind, GroundId, VardoState } from '../game/vardo/types'
import { rng } from './pixel'

/** World id of the fifth chapter; not in WorldId until the chapter is wired in */
export const VARDO = 'vardo'

export const isVardo = (s: { world: string }) => (s.world as string) === VARDO

/** Vardø's part of the save, if you have been there */
export const vaOf = (s: Save): VardoState | undefined => (s as { va?: VardoState }).va

/** The ground the boat is on; Bussesundet until you have a choice */
export const groundOf = (s: Save): GroundId => vaOf(s)?.ground ?? 'sundet'

export const BOAT_KINDS: BoatKind[] = ['faering', 'sjark', 'kystbat', 'havfisker']

/** The boat sprite for a boat tier */
export const boatKindOf = (tier: number): BoatKind => BOAT_KINDS[Math.max(0, Math.min(BOAT_KINDS.length - 1, Math.round(tier) || 0))]

/** The style string Backdrop, buildWater and paintFar take for a ground */
export const vaStyle = (ground: GroundId) => `${VARDO}:${ground}`

/**
 * Whether the northern lights come out on a night. The night belongs to the day it starts
 * on, so the lights do not switch off at midnight. About half the nights from the first
 * autumn evenings; never the very first night, when the chapter's light nights still hold.
 */
export function auroraTonight(day: number, time = 0.9): boolean {
  const d = time < 0.5 ? day - 1 : day
  if (d < 1) return false
  const r = rng(d * 4099 + 7)
  r()
  return r() < 0.5
}

/** 0..1: how strong tonight's lights are, so some nights only a faint arc shows */
export function auroraStrength(day: number, time = 0.9): number {
  if (!auroraTonight(day, time)) return 0
  const d = time < 0.5 ? day - 1 : day
  const r = rng(d * 131 + 3)
  r()
  return 0.45 + r() * 0.55
}
