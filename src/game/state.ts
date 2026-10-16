import { GEAR, QUESTS, type GearKind } from './data'

export interface Catch {
  id: string
  cm: number
  kg: number
  value: number
}

export interface Save {
  v: 1
  money: number
  gear: Record<GearKind, number>
  bucket: Catch[]
  book: Record<string, { n: number; best: number }>
  flags: Record<string, boolean>
  /** quest id -> progress (absent = not started yet) */
  quests: Record<string, number>
  questSets: Record<string, string[]>
  done: string[]
  /** letters found but not yet given to Edvard / delivered */
  letters: { found: number; delivered: number }
  stats: { caught: number; perfect: number; sold: number; night: number; released: number; treasure: number }
  bookClaimed: number[]
  time: number
  paint: string
  paints: string[]
  sound: boolean
}

const KEY = 'fisketur:save'

export function fresh(): Save {
  return {
    v: 1,
    money: 0,
    gear: { line: 0, rod: 0, reel: 0, bucket: 0, lure: 0, lamp: 0 },
    bucket: [],
    book: {},
    flags: {},
    quests: {},
    questSets: {},
    done: [],
    letters: { found: 0, delivered: 0 },
    stats: { caught: 0, perfect: 0, sold: 0, night: 0, released: 0, treasure: 0 },
    bookClaimed: [],
    time: 0.3,
    paint: 'hvit',
    paints: ['hvit'],
    sound: true,
  }
}

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...JSON.parse(raw) }
  } catch {
    /* private mode or corrupt save */
  }
  return fresh()
}

export function persist(s: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function wipe() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export const gearValue = (s: Save, k: GearKind) => GEAR[k].levels[s.gear[k]].value

export const needsMet = (s: Save, needs?: string) =>
  !needs ? true : needs === 'lamp1' ? s.gear.lamp >= 1 : needs === 'lamp2' ? s.gear.lamp >= 2 : !!s.flags[needs]

/** The three earliest unfinished quests are active */
export function activeQuests(s: Save) {
  if (!s.flags.metHalvor) return []
  return QUESTS.filter((q) => !s.done.includes(q.id)).slice(0, 3)
}

export const bucketValue = (s: Save) => s.bucket.reduce((n, c) => n + c.value, 0)
export const bookCount = (s: Save) => Object.keys(s.book).filter((k) => k !== 'gamle').length
