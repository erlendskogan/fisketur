import { BOOK, GEAR, QUESTS, setWorld, type GearKind, type WorldId } from './data'

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
  /** days gone by, for the weather */
  day: number
  paint: string
  paints: string[]
  sound: boolean
  /** where you live and fish right now */
  world: WorldId
  /** what you left behind in the other places: money, gear, catch and paint */
  away: Partial<Record<WorldId, Part>>
  /** Selma's hydrophones in Alaska: set out and listened to */
  hydro: { placed: number; heard: number }
}

/** The things that belong to one place */
export interface Part {
  money: number
  gear: Record<GearKind, number>
  bucket: Catch[]
  paint: string
  paints: string[]
}

const freshGear = (): Record<GearKind, number> => ({ line: 0, rod: 0, reel: 0, bucket: 0, lure: 0, lamp: 0 })

/** What you have when you first arrive somewhere: the change in your pocket and an old boat */
export function freshPart(w: WorldId): Part {
  return w === 'alaska'
    ? { money: 60, gear: freshGear(), bucket: [], paint: 'ak_hvit', paints: ['ak_hvit'] }
    : { money: 0, gear: freshGear(), bucket: [], paint: 'hvit', paints: ['hvit'] }
}

/** Pack up what belongs here and pick up what you left in the other place */
export function switchWorld(s: Save, to: WorldId) {
  if (s.world === to) return
  s.away[s.world] = { money: s.money, gear: { ...s.gear }, bucket: s.bucket, paint: s.paint, paints: s.paints }
  const p = s.away[to] ?? freshPart(to)
  delete s.away[to]
  s.money = p.money
  s.gear = { ...freshGear(), ...p.gear }
  s.bucket = p.bucket
  s.paint = p.paint
  s.paints = p.paints
  s.world = to
  setWorld(to)
}

const KEY = 'fisketur:save'

export function fresh(): Save {
  return {
    v: 1,
    money: 0,
    gear: freshGear(),
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
    day: 0,
    paint: 'hvit',
    paints: ['hvit'],
    sound: true,
    world: 'norge',
    away: {},
    hydro: { placed: 0, heard: 0 },
  }
}

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s: Save = { ...fresh(), ...JSON.parse(raw) }
      setWorld(s.world)
      return s
    }
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

/** Whether you have met the one who hands out quests where you are */
export const questsOpen = (s: Save) => !!(s.world === 'alaska' ? s.flags.ak_metRay : s.flags.metHalvor)

/** The three earliest unfinished quests are active */
export function activeQuests(s: Save) {
  if (!questsOpen(s)) return []
  return QUESTS.filter((q) => !s.done.includes(q.id)).slice(0, 3)
}

export const bucketValue = (s: Save) => s.bucket.reduce((n, c) => n + c.value, 0)
/** Species found in the book of the place you are in */
export const bookCount = (s: Save) => BOOK.filter((sp) => s.book[sp.id]).length
