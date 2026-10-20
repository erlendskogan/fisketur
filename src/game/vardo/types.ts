// Shared shapes for the fifth chapter, Vardø. Every Vardø module builds on these, so
// change them only together with everything that uses them.

import type { Catch } from '../state'
import type { Zone } from '../data'

export const VA = 'vardo' as const

// ---------- fishing grounds ----------

/** Where you can fish from Vardø; the boat you own decides how far out you can go */
export type GroundId = 'sundet' | 'fjorden' | 'banken' | 'eggakanten'
export const GROUND_ORDER: GroundId[] = ['sundet', 'fjorden', 'banken', 'eggakanten']

export interface Ground {
  id: GroundId
  /** «Bussesundet», «Varangerfjorden», «Tiddlybanken», «Eggakanten» */
  name: string
  /** one short line for the sea chart */
  text: string
  /** always 6 zones, like every other world */
  zones: Zone[]
  /** lowest boat tier that can go there (0 = færing) */
  boat: number
  /** hours of game clock the trip out takes */
  hours: number
  /** what you see on the horizon from the boat */
  far: 'town' | 'coast' | 'open' | 'ocean'
}

// ---------- boats ----------

export type BoatKind = 'faering' | 'sjark' | 'kystbat' | 'havfisker'

export interface Boat {
  tier: number
  kind: BoatKind
  /** the boat's name, e.g. «Signe» */
  name: string
  /** «Færing», «Sjark», «Kystbåt», «Havfiskebåt» */
  type: string
  price: number
  /** rank needed before Frida will sell it */
  rank: number
  /** story flag needed, if any */
  needs?: string
  needsText?: string
  text: string
  /** how many nets and pots fit on deck */
  netSlots: number
  potSlots: number
  /** fish the hold (lasterommet) carries from nets, apart from the fish box */
  hold: number
}

// ---------- the house ----------

export type RoomId = 'tak' | 'kjokken' | 'stue' | 'gjest1' | 'verksted' | 'akvarium' | 'royeri' | 'brygge' | 'gjest2' | 'badstue' | 'tarn'
export const ROOM_ORDER: RoomId[] = ['tak', 'kjokken', 'stue', 'gjest1', 'verksted', 'akvarium', 'royeri', 'brygge', 'gjest2', 'badstue', 'tarn']

export interface Room {
  id: RoomId
  name: string
  price: number
  rank: number
  needs?: string
  needsText?: string
  /** what the room is, shown before you build it */
  text: string
  /** what it lets you do, shown after */
  does: string
}

// ---------- upgrades for the businesses ----------

/** Upgrade tracks; each has levels 0..n, level 0 is what you start with */
export type TrackId =
  | 'netLen' // longer nets: more fish per minute
  | 'netMesh' // better nets: worth more, rarer fish
  | 'netFloat' // floats: how many fish a net holds before it is full
  | 'potType' // pots: crabs per minute and capacity
  | 'potBait' // bait: bigger crabs
  | 'smokeOven' // smokehouse: how many fish smoke at once
  | 'smokeWood' // smokehouse: how fast
  | 'smokeBrand' // smokehouse: price
  | 'guestComfort' // guest rooms: money per guest
  | 'guestAds' // guest rooms: how often guests come
  | 'plantStaff' // the fish plant: money per minute
  | 'plantCold' // the fish plant: how much it keeps before you collect
  | 'plantTruck' // the fish plant: multiplier

export interface TrackLevel {
  name: string
  price: number
  rank: number
  /** the number the track controls at this level (rate, multiplier or capacity) */
  value: number
  text: string
}

export interface Track {
  id: TrackId
  title: string
  /** room or flag that has to exist before the track can be upgraded */
  needs?: string
  levels: TrackLevel[]
}

// ---------- passive income state ----------

export interface NetState {
  ground: GroundId
  fish: Catch[]
  /** seconds since the last fish */
  t: number
}

export interface CrabCatch {
  /** species id of the crab */
  id: string
  /** carapace length in millimetres */
  mm: number
  male: boolean
  kg: number
  value: number
}

export interface PotState {
  ground: GroundId
  crabs: CrabCatch[]
  t: number
}

// ---------- contracts (Brita's board) ----------

export type ContractKind = 'rush' | 'species' | 'heavy' | 'deliver' | 'night' | 'ghostnet' | 'crab' | 'tour' | 'race'
export type VaWho = 'nadja' | 'brita' | 'aslak' | 'frida' | 'selma'

export interface ContractOffer {
  id: string
  kind: ContractKind
  who: VaWho
  title: string
  text: string
  ground?: GroundId
  species?: string
  n?: number
  kg?: number
  /** real seconds to finish, for timed contracts (the clock runs only while you are not in a menu) */
  limit?: number
  /** ghost nets: how deep it lies on the wall, always within reach of your line when offered */
  depth?: number
  money: number
  xp: number
}

export interface ActiveContract extends ContractOffer {
  progress: number
  /** seconds left, for timed contracts */
  left?: number
  /** game day (Save.day) it must be done by, for untimed ones */
  dueDay?: number
  done: boolean
  failed: boolean
}

// ---------- everything Vardø keeps in the save ----------

export interface VardoState {
  ground: GroundId
  /** highest boat tier you own; you sail the best one */
  boat: number
  rooms: RoomId[]
  xp: number
  up: Partial<Record<TrackId, number>>
  nets: NetState[]
  /** nets you own (set or not) */
  netsOwned: number
  pots: PotState[]
  potsOwned: number
  /** catch from the nets, carried in the hold until you sell it to Nadja */
  hold: Catch[]
  smoke: { load: Catch[]; t: number; cash: number }
  guests: { t: number; cash: number; nights: number }
  plant: { stage: number; delivered: Record<string, number>; t: number; cash: number }
  contract: ActiveContract | null
  offers: ContractOffer[]
  offersDay: number
  contractsDone: number
  /** contracts finished in a row without failing */
  streak: number
  /** fish shown in the aquarium (species ids) */
  aquarium: string[]
  /** game day a soup buff from the kitchen lasts through, if any */
  soupDay?: number
  /** whale flukes photographed for Selma (ids) */
  flukes: string[]
  /** Pomor things found on the sea floor for Nadja */
  pomor: number
  legends: string[]
  races: number
  fines: number
  /** illegal crabs Brita has yet to find in your hold: count and fine, settled at Havnekontoret */
  fineDue?: { n: number; kr: number }
  /** Aslak's grandson hauling your full nets once you have a jetty: on or off, and what he has sold for you */
  mikkel?: { on: boolean; cash: number }
  stats: { netFish: number; crabs: number; smoked: number; guestNights: number; passive: number; ghostnets: number }
}

// ---------- minigames ----------

/** Pointer state handed to a minigame each frame, in canvas pixels */
export interface MiniInput {
  /** finger is down */
  down: boolean
  x: number
  y: number
  /** finger went down this frame */
  tap: boolean
  /** finger went up this frame */
  release: boolean
  /** a horizontal swipe finished this frame: -1 left, 1 right, 0 none */
  swipe: -1 | 0 | 1
}

export interface MiniGame<R = unknown> {
  /** shown in the HUD while playing */
  readonly title: string
  update(dt: number, input: MiniInput): void
  /** draws the whole canvas (W×H logical pixels, already pixel-scaled) */
  draw(g: CanvasRenderingContext2D, W: number, H: number): void
  /** one line for the hint above the dock */
  hint(): string
  /** null while playing; set once when it ends */
  result: R | null
}

export interface NetHaulResult {
  /** fish that came aboard whole */
  kept: Catch[]
  /** fish that fell out or were torn */
  lost: number
  /** 0..1, how cleanly it went */
  quality: number
}

export interface CrabSortResult {
  /** same order as the crabs handed in: true = kept */
  keep: boolean[]
  /** kept crabs that were too small or female (a fine) */
  wrong: number
  /** legal crabs thrown back */
  missed: number
}

export interface PhotoResult {
  /** 0..1 per photo taken, best first */
  shots: number[]
  /** for flukes: which whale was photographed, if the shot was good enough */
  fluke?: string
}

export interface RaceResult {
  /** seconds to finish, or -1 if you gave up */
  time: number
  /** waves or rocks hit */
  hits: number
  place: number
}
