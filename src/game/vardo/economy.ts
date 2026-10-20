// Vardø's economy: boats, rooms, upgrades, rank and everything that earns while you play.
// Pure functions on VardoState; money lives in the Save, so buy helpers return a cost
// for the caller to take. Only type imports here, so scripts/vardo-sim.ts can run it in Node.

import type { Catch } from '../state'
import type { Species } from '../data'
import type { Boat, CrabCatch, GroundId, NetState, PotState, Room, RoomId, Track, TrackId, VardoState } from './types'

const GROUNDS: GroundId[] = ['sundet', 'fjorden', 'banken', 'eggakanten']
/** Grounds where crab pots can stand */
export const POT_GROUNDS: GroundId[] = ['fjorden', 'banken']

// ---------- boats ----------

export const VA_BOATS: Boat[] = [
  {
    tier: 0, kind: 'faering', name: 'Signe', type: 'Færing', price: 0, rank: 0,
    text: 'Fire årer, ett garn og et lite lasterom. Bygget for sundet og stille dager.',
    netSlots: 1, potSlots: 0, hold: 10,
  },
  {
    tier: 1, kind: 'sjark', name: 'Elle', type: 'Sjark', price: 4500, rank: 4,
    text: 'Liten motor, styrhus og plass til to garn og fire teiner. Tar deg inn i Varangerfjorden.',
    netSlots: 2, potSlots: 4, hold: 20,
  },
  {
    tier: 2, kind: 'kystbat', name: 'Varanger', type: 'Kystbåt', price: 25000, rank: 10,
    text: 'Tre garn, åtte teiner og et lasterom som tåler en god dag. Tiddlybanken er innen rekkevidde.',
    netSlots: 3, potSlots: 8, hold: 40,
  },
  {
    tier: 3, kind: 'havfisker', name: 'Nordkapp', type: 'Havfiskebåt', price: 95000, rank: 16,
    needs: 'va_joik', needsText: 'Aslak har noe å fortelle deg først',
    text: 'Stålskrog, radar og plass til alt. Bygget for å gå helt ut til Eggakanten.',
    netSlots: 4, potSlots: 12, hold: 70,
  },
]

/** Grounds the boat you own can reach */
export const groundsFor = (boat: number): GroundId[] => GROUNDS.slice(0, Math.max(1, Math.min(4, boat + 1)))

// ---------- rooms ----------

export const VA_ROOMS: Record<RoomId, Room> = {
  tak: {
    id: 'tak', name: 'Tak og vinduer', price: 1200, rank: 0, needs: 'va_metFrida', needsText: 'Snakk med Frida på Slippen',
    text: 'Det regner rett inn på kjøkkenbenken. Frida kan legge nytt tak og sette inn glass.',
    does: 'Huset er tett. Du kan sove her, til morgen eller til kveld.',
  },
  kjokken: {
    id: 'kjokken', name: 'Kjøkkenet', price: 1500, rank: 2,
    text: 'En gammel vedkomfyr under støvet. Signe stekte fisk her hver dag.',
    does: 'Kok fiskesuppe av en fisk fra kassa. Fisken biter bedre resten av dagen.',
  },
  stue: {
    id: 'stue', name: 'Stua med ovnen', price: 4500, rank: 3,
    text: 'Tapetet henger i flak, men ovnen er hel. Pus har allerede sett seg ut en plass.',
    does: 'Trofeveggen: den største fisken din fra hvert sted henger her.',
  },
  gjest1: {
    id: 'gjest1', name: 'Gjesterommet', price: 9000, rank: 6, needs: 'va_selmaLetter', needsText: 'Noen må trenge et rom først',
    text: 'Et lite rom med skråtak og utsikt mot havet. Trenger seng, maling og en ny dør.',
    does: 'Gjester betaler mens du fisker. Pengene venter i gjesteboka.',
  },
  verksted: {
    id: 'verksted', name: 'Garnloftet', price: 7000, rank: 5, needs: 'va_metAslak', needsText: 'Snakk med Aslak i naustet',
    text: 'Et høyt loft med kroker i bjelkene. Her hang garna til tørk før.',
    does: 'Du kan bøte og bygge om garn og teiner til de beste nivåene.',
  },
  akvarium: {
    id: 'akvarium', name: 'Akvariet', price: 16000, rank: 8,
    text: 'Et gammelt glasskar i gangen. Det trenger pumpe, sand og litt tålmodighet.',
    does: 'Seks levende fisk fra fangsten svømmer her.',
  },
  royeri: {
    id: 'royeri', name: 'Røykeriet', price: 24000, rank: 9,
    text: 'Et skjevt skur ved siden av huset. Det lukter fortsatt svakt av einer.',
    does: 'Røyk fisk fra kassa eller lasterommet. Røkt fisk er verdt mye mer.',
  },
  brygge: {
    id: 'brygge', name: 'Egen brygge', price: 65000, rank: 12,
    text: 'Pælene står der ennå. Resten har havet tatt.',
    does: 'Båten ligger hjemme. Aslaks barnebarn drar garna for deg, mot en andel.',
  },
  gjest2: {
    id: 'gjest2', name: 'Loftsrommene', price: 120000, rank: 14, needs: 'gjest1', needsText: 'Bygg gjesterommet først',
    text: 'To rom under mønet, fulle av gamle kister og fuglereir.',
    does: 'To rom til. Flere gjester, mer i gjesteboka.',
  },
  badstue: {
    id: 'badstue', name: 'Badstua ved sjøen', price: 260000, rank: 17, needs: 'gjest1', needsText: 'Bygg gjesterommet først',
    text: 'En liten tømmerbu på svaberget, med en stige rett ned i havet.',
    does: 'Gjestene betaler mer når de kan bade.',
  },
  tarn: {
    id: 'tarn', name: 'Nordlysrommet', price: 700000, rank: 21, needs: 'gjest2', needsText: 'Bygg loftsrommene først',
    text: 'Frida har tegnet et glassloft på taket. «Fire meter glass. Det går. Tror jeg.»',
    does: 'Gjestene betaler mye mer på netter med nordlys.',
  },
}

// ---------- upgrade tracks ----------

type Lv = [name: string, price: number, rank: number, value: number, text: string]
const track = (id: TrackId, title: string, needs: string | undefined, lv: Lv[]): Track => ({
  id, title, needs, levels: lv.map(([name, price, rank, value, text]) => ({ name, price, rank, value, text })),
})

export const VA_TRACKS: Record<TrackId, Track> = {
  netLen: track('netLen', 'Garnlengde', 'va_netHauled', [
    ['Elles garn', 0, 0, 0.4, 'Et kort garn. En fisk annethvert minutt, nesten.'],
    ['Lengre lenke', 700, 2, 0.5, 'Ti favner til. Flere fisk i minuttet.'],
    ['Dobbel lenke', 3000, 4, 0.6, 'To garn knyttet sammen.'],
    ['Tredobbel lenke', 11000, 8, 0.7, 'Lang nok til å fange en hel stim.'],
    ['Bankgarn', 35000, 12, 0.8, 'Laget for bankene.'],
    ['Havgarn', 90000, 16, 0.9, 'Så langt at du nesten ikke ser enden.'],
    ['Aslaks lenke', 220000, 20, 1, 'En fisk i minuttet. Aslak sier at Elle ville ha nikket.'],
  ]),
  netMesh: track('netMesh', 'Maskevidde', 'va_netHauled', [
    ['Gammel lin', 0, 0, 0.5, 'Elles linnet. Garnfisk er verdt halvparten av krokfisk.'],
    ['Nylonmasker', 1500, 3, 0.58, 'Fisken kommer opp hel. Litt mer verdt.'],
    ['Riktig maske', 6000, 6, 0.66, 'Småfisken slipper ut, den store blir.'],
    ['Monofilament', 22000, 10, 0.75, 'Nesten usynlig i sjøen. Sjeldnere fisk.'],
    ['Skånsom maske', 70000, 14, 0.86, 'Fisken er så fin at Nadja betaler ekstra.'],
    ['Elles beste', 180000, 18, 1, 'Knyttet for hånd. Garnfisk like fin som krokfisk.'],
  ]),
  netFloat: track('netFloat', 'Garnflottører', 'va_netHauled', [
    ['Korkflottører', 0, 0, 8, 'Garnet holder 8 fisk før det er fullt.'],
    ['Glasskuler', 500, 2, 12, 'Gamle glasskuler fra naustet. 12 fisk.'],
    ['Plastflottører', 2500, 4, 16, 'Bærer 16 fisk.'],
    ['Store blåser', 9000, 8, 20, 'Bærer 20 fisk.'],
    ['Skumflottører', 30000, 12, 25, 'Bærer 25 fisk.'],
    ['Havblåser', 80000, 16, 32, 'Bærer 32 fisk. Det synker ikke.'],
  ]),
  potType: track('potType', 'Teiner', 'va_crab', [
    ['Gamle teiner', 0, 0, 0.25, 'Rustne, men de fisker. Holder 6 krabber.'],
    ['Nye teiner', 2500, 5, 0.32, 'Bedre inngang. Holder 7 krabber.'],
    ['Store teiner', 9000, 8, 0.4, 'Holder 8 krabber.'],
    ['Kongekrabbeteiner', 28000, 11, 0.5, 'Laget for kongekrabbe. Holder 10.'],
    ['Stålteiner', 80000, 15, 0.6, 'Tåler alt Barentshavet har. Holder 12.'],
    ['Bankteiner', 200000, 19, 0.7, 'Holder 14 krabber.'],
  ]),
  potBait: track('potBait', 'Teineagn', 'va_crab', [
    ['Fiskeavskjær', 0, 0, 0, 'Det som blir til overs.'],
    ['Sild', 2000, 5, 0.06, 'Krabbene som kommer er litt større.'],
    ['Torskehoder', 8000, 9, 0.12, 'De store hannene liker torsk.'],
    ['Agnpølse', 28000, 13, 0.18, 'Holder lukten lenge. Større krabber.'],
    ['Aslaks blanding', 85000, 17, 0.25, 'Han vil ikke si hva som er i. De største krabbene.'],
  ]),
  smokeOven: track('smokeOven', 'Røykeovn', 'royeri', [
    ['Tønneovn', 0, 0, 3, 'Plass til 3 fisk.'],
    ['Murt ovn', 10000, 10, 4, 'Plass til 4 fisk.'],
    ['Dobbel ovn', 30000, 12, 6, 'Plass til 6 fisk.'],
    ['Røykeskap', 80000, 15, 8, 'Plass til 8 fisk.'],
    ['Røykehus', 180000, 18, 10, 'Plass til 10 fisk.'],
    ['Pomorovnen', 380000, 21, 12, 'Plass til 12 fisk.'],
  ]),
  smokeWood: track('smokeWood', 'Røykeved', 'royeri', [
    ['Drivved', 0, 0, 12, 'Ferdig på 12 minutter.'],
    ['Bjørk', 7000, 10, 10, 'Ferdig på 10 minutter.'],
    ['Einer', 22000, 12, 8, 'Ferdig på 8 minutter.'],
    ['Or', 60000, 15, 7, 'Ferdig på 7 minutter.'],
    ['Bøk', 140000, 18, 6, 'Ferdig på 6 minutter.'],
    ['Eik fra Arkhangelsk', 320000, 21, 5, 'Ferdig på 5 minutter.'],
  ]),
  smokeBrand: track('smokeBrand', 'Merkevare', 'royeri', [
    ['Hjemmerøkt', 0, 0, 1.25, 'Røkt fisk er verdt en firedel mer.'],
    ['Egen etikett', 12000, 10, 1.35, '«Signes røykeri». 1,35 ganger.'],
    ['På Pomorbrygga', 40000, 12, 1.45, 'Nadja selger den i disken. 1,45 ganger.'],
    ['Hurtigruten', 100000, 15, 1.6, 'Serveres om bord. 1,6 ganger.'],
    ['Oslo', 220000, 18, 1.75, 'Restaurantene i Oslo ringer. 1,75 ganger.'],
    ['Verdensberømt', 450000, 21, 1.9, 'Folk kommer fra Tokyo for å smake. 1,9 ganger.'],
  ]),
  guestComfort: track('guestComfort', 'Komfort', 'gjest1', [
    ['Feltseng', 0, 0, 25, 'Hver gjest betaler 25 kr i minuttet.'],
    ['Ordentlige senger', 5000, 7, 35, '35 kr i minuttet.'],
    ['Dyner og ullpledd', 14000, 9, 50, '50 kr i minuttet.'],
    ['Varmekabler', 35000, 11, 70, '70 kr i minuttet.'],
    ['Frokost med røkt fisk', 80000, 14, 95, '95 kr i minuttet.'],
    ['Utsikt og kikkert', 160000, 17, 125, '125 kr i minuttet.'],
    ['Signes oppskrifter', 320000, 20, 160, '160 kr i minuttet.'],
    ['Østhavets beste', 550000, 23, 200, '200 kr i minuttet.'],
  ]),
  guestAds: track('guestAds', 'Reklame', 'gjest1', [
    ['Lapp på Pomorbrygga', 0, 0, 0.6, 'Rommene er fulle 6 av 10 netter.'],
    ['Plakat på Hurtigruten', 6000, 8, 0.7, '7 av 10 netter.'],
    ['Nettside', 22000, 11, 0.8, '8 av 10 netter.'],
    ['Reisebyrå i Tromsø', 70000, 15, 0.9, '9 av 10 netter.'],
    ['I avisa', 200000, 19, 1, 'Fullt hver natt.'],
  ]),
  plantStaff: track('plantStaff', 'Folk på bruket', 'va_plantOpen', [
    ['Nadja og to til', 0, 0, 350, 'Bruket tjener 350 kr i minuttet.'],
    ['Et skiftlag', 25000, 12, 500, '500 kr i minuttet.'],
    ['To skiftlag', 70000, 14, 680, '680 kr i minuttet.'],
    ['Filetlinje', 135000, 17, 880, '880 kr i minuttet.'],
    ['Lærlinger fra skolen', 235000, 19, 1100, '1100 kr i minuttet.'],
    ['Hele byen', 380000, 21, 1350, '1350 kr i minuttet.'],
    ['Pomorbruket', 585000, 23, 1600, '1600 kr i minuttet.'],
  ]),
  plantCold: track('plantCold', 'Kjølelager', 'va_plantOpen', [
    ['Gammel fryser', 0, 0, 15000, 'Bruket holder 15 000 kr før du må hente.'],
    ['Ny kompressor', 15000, 12, 30000, 'Holder 30 000 kr.'],
    ['Kjølerom', 45000, 15, 55000, 'Holder 55 000 kr.'],
    ['Fryselager', 100000, 17, 90000, 'Holder 90 000 kr.'],
    ['Stort fryselager', 190000, 20, 130000, 'Holder 130 000 kr.'],
    ['Frysehotell', 340000, 22, 180000, 'Holder 180 000 kr.'],
  ]),
  plantTruck: track('plantTruck', 'Transport', 'va_plantOpen', [
    ['Nadjas varebil', 0, 0, 1, 'Fisken selges i byen.'],
    ['Kjølebil', 35000, 13, 1.1, 'Selges til Kirkenes. 1,1 ganger.'],
    ['Vogntog', 100000, 16, 1.2, 'Selges sørover. 1,2 ganger.'],
    ['Hurtigrutefrakt', 200000, 18, 1.32, 'Fisken går med Hurtigruten. 1,32 ganger.'],
    ['Eksport', 360000, 21, 1.45, 'Fisk fra Vardø i Paris. 1,45 ganger.'],
    ['Eget fraktfly', 540000, 24, 1.6, 'Rett fra Vardø lufthavn. 1,6 ganger.'],
  ]),
}

/** Net and pot levels from this one up need the net loft (verksted) */
export const VERKSTED_FROM = 3
const POT_CAP = [6, 7, 8, 10, 12, 14]

export const lvl = (va: VardoState, t: TrackId) => va.up[t] ?? 0
export const trackValue = (va: VardoState, t: TrackId) => {
  const ls = VA_TRACKS[t].levels
  return ls[Math.min(ls.length - 1, lvl(va, t))].value
}

// ---------- rank (Rykte) ----------

const TITLES = [
  'Nykommer', 'Dekkshand', 'Fisker', 'Kystfisker', 'Garnbøter', 'Teinefisker', 'Sjarkfisker', 'Bas',
  'Fangstleder', 'Navigatør', 'Bankfisker', 'Båtfører', 'Havfisker', 'Skipper', 'Erfaren skipper',
  'Kystskipper', 'Ishavsskipper', 'Bruksgründer', 'Reder', 'Storreder', 'Havets kjenning',
  'Barentshavets skipper', 'Varanger-veteran', 'Vardøs stolthet', 'Vardø-legende',
]

/**
 * XP to go from level L to L+1: steeper towards 25, then a steady climb forever. The first
 * step is a good first session of fishing (10–15 minutes), so the board does not open at once
 */
export const xpNeed = (L: number): number =>
  L <= 1 ? 300 : L <= 25 ? Math.round(95 * Math.pow(L, 1.1) + 0.003 * Math.pow(L, 5)) : xpNeed(25) + (L - 25) * 3000

export const rankTitle = (level: number) =>
  level <= TITLES.length ? TITLES[level - 1] : `Vardø-legende ${level - TITLES.length + 1}`

export function rankOf(xp: number): { level: number; title: string; into: number; need: number } {
  let level = 1
  let left = Math.max(0, xp)
  while (left >= xpNeed(level)) {
    left -= xpNeed(level)
    level++
  }
  return { level, title: rankTitle(level), into: Math.floor(left), need: xpNeed(level) }
}

/** XP for a fish worth `value` kroner: bigger fish count more, but not linearly */
export const xpForCatch = (value: number) => Math.max(1, Math.round(2 + Math.sqrt(Math.max(0, value)) * 0.9))

/** XP for a net haul or a sorted pot: half of what the same fish on the hook gives */
export const xpForHaul = (list: { value: number }[]) => list.reduce((n, c) => n + Math.round(xpForCatch(c.value) * 0.5), 0)

export const rankLevel = (va: VardoState) => rankOf(va.xp).level

// ---------- save state ----------

export function freshVardo(): VardoState {
  return {
    ground: 'sundet',
    boat: 0,
    rooms: [],
    xp: 0,
    up: {},
    nets: [],
    netsOwned: 0,
    pots: [],
    potsOwned: 0,
    hold: [],
    smoke: { load: [], t: 0, cash: 0 },
    guests: { t: 0, cash: 0, nights: 0 },
    plant: { stage: 0, delivered: {}, t: 0, cash: 0 },
    contract: null,
    offers: [],
    offersDay: -1,
    contractsDone: 0,
    streak: 0,
    aquarium: [],
    flukes: [],
    pomor: 0,
    legends: [],
    races: 0,
    fines: 0,
    stats: { netFish: 0, crabs: 0, smoked: 0, guestNights: 0, passive: 0, ghostnets: 0 },
  }
}

/** Fill in whatever an older save is missing */
export function ensureVardo(v?: Partial<VardoState>): VardoState {
  const f = freshVardo()
  if (!v) return f
  return {
    ...f,
    ...v,
    up: { ...v.up },
    rooms: v.rooms ?? [],
    nets: v.nets ?? [],
    pots: v.pots ?? [],
    hold: v.hold ?? [],
    smoke: { ...f.smoke, ...v.smoke },
    guests: { ...f.guests, ...v.guests },
    plant: { ...f.plant, ...v.plant, delivered: { ...v.plant?.delivered } },
    offers: v.offers ?? [],
    aquarium: v.aquarium ?? [],
    flukes: v.flukes ?? [],
    legends: v.legends ?? [],
    stats: { ...f.stats, ...v.stats },
  }
}

// ---------- gear on deck ----------

export const boatOf = (va: VardoState) => VA_BOATS[Math.max(0, Math.min(VA_BOATS.length - 1, va.boat))]
export const netSlots = (va: VardoState) => boatOf(va).netSlots
export const potSlots = (va: VardoState) => boatOf(va).potSlots
export const holdCap = (va: VardoState) => boatOf(va).hold
export const netCap = (va: VardoState) => trackValue(va, 'netFloat')
export const potCap = (va: VardoState) => POT_CAP[Math.min(POT_CAP.length - 1, lvl(va, 'potType'))]
export const netFull = (va: VardoState, n: NetState) => n.fish.length >= netCap(va)
export const potFull = (va: VardoState, p: PotState) => p.crabs.length >= potCap(va)

/** Set one more net where you are; false if every net you own (or the deck holds) is out */
export function setNet(va: VardoState, ground: GroundId): boolean {
  if (va.nets.length >= Math.min(va.netsOwned, netSlots(va))) return false
  va.nets.push({ ground, fish: [], t: 0 })
  return true
}

/** Empty a net for the haul; the net stays in the water and starts fishing again */
export function takeNet(va: VardoState, index: number): Catch[] {
  const n = va.nets[index]
  if (!n) return []
  const fish = n.fish
  n.fish = []
  n.t = 0
  return fish
}

/** Take a net up on deck for good (to move it to another ground) */
export function liftNet(va: VardoState, index: number): Catch[] {
  const fish = takeNet(va, index)
  va.nets.splice(index, 1)
  return fish
}

/** The fish that survived the haul go into the hold; returns how many did not fit */
export function landNetHaul(va: VardoState, kept: Catch[]): number {
  const room = Math.max(0, holdCap(va) - va.hold.length)
  const fit = kept.slice(0, room)
  va.hold.push(...fit)
  va.stats.netFish += fit.length
  return kept.length - fit.length
}

/** Put pots out on a ground so that `n` stand there; returns how many stand there now */
export function setPots(va: VardoState, ground: GroundId, n: number): number {
  if (!POT_GROUNDS.includes(ground)) return 0
  const here = va.pots.filter((p) => p.ground === ground).length
  const free = Math.min(va.potsOwned, potSlots(va)) - va.pots.length
  const add = Math.max(0, Math.min(n - here, free))
  for (let i = 0; i < add; i++) va.pots.push({ ground, crabs: [], t: 0 })
  return here + add
}

/** Empty every pot on a ground; they stay out */
export function takePots(va: VardoState, ground: GroundId): CrabCatch[] {
  const out: CrabCatch[] = []
  for (const p of va.pots) {
    if (p.ground !== ground) continue
    out.push(...p.crabs)
    p.crabs = []
    p.t = 0
  }
  return out
}

/** Take the pots on a ground up on deck */
export function liftPots(va: VardoState, ground: GroundId): CrabCatch[] {
  const out = takePots(va, ground)
  va.pots = va.pots.filter((p) => p.ground !== ground)
  return out
}

/**
 * Brita's fine for one sorting round: a modest fixed sum that grows a little with your rank and
 * with each extra wrong crab, never much more than the whole haul was worth
 */
export function crabFine(wrong: number, rank: number, haulValue: number): number {
  if (wrong <= 0) return 0
  const base = Math.min(800, 300 + 25 * Math.max(0, rank - 1))
  const fine = base + (wrong - 1) * 100
  return Math.max(100, Math.min(fine, Math.round((haulValue + 300) / 50) * 50))
}
const legalMm = (c: CrabCatch, minMm: number | Record<string, number>) =>
  typeof minMm === 'number' ? minMm : (minMm[c.id] ?? 0)
export const crabLegal = (c: CrabCatch, minMm: number | Record<string, number>) => c.male && c.mm >= legalMm(c, minMm)

/** What a sorting round comes to: legal crabs kept, wrong ones fined (Brita takes them), legal ones thrown back missed */
export function sortOutcome(crabs: CrabCatch[], keep: boolean[], minMm: number | Record<string, number>, rank = 1) {
  const kept: CrabCatch[] = []
  let wrong = 0
  let missed = 0
  crabs.forEach((c, i) => {
    const legal = crabLegal(c, minMm)
    if (keep[i] && legal) kept.push(c)
    else if (keep[i]) wrong++
    else if (legal) missed++
  })
  const fine = crabFine(wrong, rank, crabs.reduce((n, c) => n + c.value, 0))
  return { kept, value: kept.reduce((n, c) => n + c.value, 0), wrong, missed, fine }
}

export const crabToCatch = (c: CrabCatch): Catch => ({ id: c.id, cm: Math.round(c.mm / 10), kg: c.kg, value: c.value })

/** Kept crabs into the hold; returns how many did not fit */
export function landCrabs(va: VardoState, kept: CrabCatch[]): number {
  const room = Math.max(0, holdCap(va) - va.hold.length)
  const fit = kept.slice(0, room)
  va.hold.push(...fit.map(crabToCatch))
  va.stats.crabs += fit.length
  return kept.length - fit.length
}

/** With your own jetty, Aslak's grandson hauls the full nets and sells them, keeping his share */
export const BRYGGE_SHARE = 0.6
export function bryggeHaul(va: VardoState): { kr: number; fish: number } {
  if (!va.rooms.includes('brygge')) return { kr: 0, fish: 0 }
  let kr = 0
  let fish = 0
  for (const n of va.nets) {
    if (!netFull(va, n)) continue
    kr += n.fish.reduce((s, c) => s + c.value, 0)
    fish += n.fish.length
    n.fish = []
    n.t = 0
  }
  va.stats.netFish += fish
  return { kr: Math.round(kr * BRYGGE_SHARE), fish }
}

// ---------- buying ----------

export interface Buy {
  ok: boolean
  /** Norwegian reason when not ok */
  why: string
  cost: number
}

const NEEDS_TEXT: Record<string, string> = {
  verksted: 'Bygg garnloftet først',
  royeri: 'Bygg røykeriet først',
  gjest1: 'Bygg gjesterommet først',
  gjest2: 'Bygg loftsrommene først',
  tak: 'Fiks taket først',
  va_plantOpen: 'Fiskebruket må åpne først',
  va_netHauled: 'Dra det første garnet ditt først',
  va_crab: 'Aslak må vise deg teinene først',
  va_metFrida: 'Snakk med Frida på Slippen',
  va_metAslak: 'Snakk med Aslak i naustet',
  va_joik: 'Aslak har noe å fortelle deg først',
  va_selmaLetter: 'Noen må trenge et rom først',
}

const isRoom = (s: string): s is RoomId => s in VA_ROOMS
export const needsMetVa = (va: VardoState, needs: string | undefined, flags: Record<string, boolean>) =>
  !needs ? true : isRoom(needs) ? va.rooms.includes(needs) : !!flags[needs]

/** The one check every shop uses */
export function canBuy(
  va: VardoState, money: number, price: number, rank: number, needs: string | undefined, flags: Record<string, boolean>, needsText?: string,
): Buy {
  if (!needsMetVa(va, needs, flags)) return { ok: false, why: needsText ?? NEEDS_TEXT[needs!] ?? 'Ikke ennå', cost: price }
  if (rankLevel(va) < rank) return { ok: false, why: `Krever rang ${rank}`, cost: price }
  if (money < price) return { ok: false, why: `Koster ${fmtKr(price)}`, cost: price }
  return { ok: true, why: '', cost: price }
}

export const fmtKr = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} kr`

export function buyRoom(va: VardoState, id: RoomId, money: number, flags: Record<string, boolean>): Buy {
  if (va.rooms.includes(id)) return { ok: false, why: 'Allerede bygget', cost: 0 }
  const r = VA_ROOMS[id]
  if (id !== 'tak' && !va.rooms.includes('tak')) return { ok: false, why: NEEDS_TEXT.tak, cost: r.price }
  const b = canBuy(va, money, r.price, r.rank, r.needs, flags, r.needsText)
  if (b.ok) va.rooms.push(id)
  return b
}

export function buyBoat(va: VardoState, tier: number, money: number, flags: Record<string, boolean>): Buy {
  const bt = VA_BOATS[tier]
  if (!bt || tier <= va.boat) return { ok: false, why: 'Du har allerede en bedre båt', cost: 0 }
  if (tier > va.boat + 1) return { ok: false, why: `Kjøp ${VA_BOATS[va.boat + 1].type.toLowerCase()}en først`, cost: bt.price }
  const b = canBuy(va, money, bt.price, bt.rank, bt.needs, flags, bt.needsText)
  if (b.ok) va.boat = tier
  return b
}

/** The next level of a track, or null when it is maxed */
export const nextLevel = (va: VardoState, t: TrackId) => VA_TRACKS[t].levels[lvl(va, t) + 1] ?? null

export function canBuyTrack(va: VardoState, t: TrackId, money: number, flags: Record<string, boolean>): Buy {
  const next = nextLevel(va, t)
  if (!next) return { ok: false, why: 'Beste nivå', cost: 0 }
  const tr = VA_TRACKS[t]
  const gear = t.startsWith('net') || t.startsWith('pot')
  if (gear && lvl(va, t) + 1 >= VERKSTED_FROM && !va.rooms.includes('verksted')) return { ok: false, why: NEEDS_TEXT.verksted, cost: next.price }
  return canBuy(va, money, next.price, next.rank, tr.needs, flags)
}

export function buyTrack(va: VardoState, t: TrackId, money: number, flags: Record<string, boolean>): Buy {
  const b = canBuyTrack(va, t, money, flags)
  if (b.ok) va.up[t] = lvl(va, t) + 1
  return b
}

/** Extra nets and pots from Aslak. The first net and two pots are gifts */
export const NET_PRICES = [0, 3500, 18000, 70000]
export const POT_PRICE = (owned: number) => Math.round(1500 * Math.pow(1.35, Math.max(0, owned - 2)) / 100) * 100

export function buyNet(va: VardoState, money: number, flags: Record<string, boolean>): Buy {
  if (va.netsOwned >= NET_PRICES.length) return { ok: false, why: 'Du har alle garna', cost: 0 }
  if (va.netsOwned >= netSlots(va)) return { ok: false, why: 'Ikke plass på dekk. Trenger større båt', cost: 0 }
  const b = canBuy(va, money, NET_PRICES[va.netsOwned], 0, 'va_netHauled', flags)
  if (b.ok) va.netsOwned++
  return b
}

export function buyPot(va: VardoState, money: number, flags: Record<string, boolean>): Buy {
  if (va.potsOwned >= potSlots(va)) return { ok: false, why: 'Ikke plass på dekk. Trenger større båt', cost: 0 }
  const b = canBuy(va, money, POT_PRICE(va.potsOwned), 0, 'va_crab', flags)
  if (b.ok) va.potsOwned++
  return b
}

// ---------- smokehouse ----------

export const smokeCap = (va: VardoState) => trackValue(va, 'smokeOven')
/** Waiting smokehouse cash tops out after a handful of loads of good fish */
export const smokeCashCap = (va: VardoState) => 15000 + smokeCap(va) * 8000 * trackValue(va, 'smokeBrand')

/** Load fish into the smokehouse; returns the fish it took (the caller removes them from the box or hold) */
export function smokeLoad(va: VardoState, fish: Catch[]): Catch[] {
  if (!va.rooms.includes('royeri')) return []
  const room = smokeCap(va) - va.smoke.load.length
  const took = fish.slice(0, Math.max(0, room))
  va.smoke.load.push(...took)
  return took
}

/** Seconds left on the current load, 0 when empty or done */
export const smokeLeft = (va: VardoState) =>
  va.smoke.load.length ? Math.max(0, trackValue(va, 'smokeWood') * 60 - va.smoke.t) : 0

// ---------- guests ----------

export const guestRooms = (va: VardoState) => (va.rooms.includes('gjest1') ? 1 : 0) + (va.rooms.includes('gjest2') ? 2 : 0)

/** Kroner per minute from the guests right now */
export function guestRate(va: VardoState, aurora = false): number {
  const n = guestRooms(va)
  if (!n) return 0
  let r = n * trackValue(va, 'guestComfort') * trackValue(va, 'guestAds')
  if (va.rooms.includes('badstue')) r *= 1.4
  if (va.rooms.includes('tarn')) r *= aurora ? 2.5 : 1.2
  return r
}
/** The guest book holds about an hour of an ordinary night */
export const guestCashCap = (va: VardoState) => Math.max(2000, Math.round((guestRate(va) * 60) / 100) * 100)

// ---------- fish plant ----------

export interface PlantStage {
  title: string
  text: string
  price: number
  rank: number
  /** fish to deliver, by species id */
  deliver?: Record<string, number>
}

export const PLANT_STAGES: PlantStage[] = [
  { title: 'Kjøp bygget', text: 'Kommunen selger bruket for det det koster å rive det.', price: 25000, rank: 10 },
  {
    title: 'Fiks fryseren', text: 'Fryseren går, men den må testes med ekte fisk.', price: 0, rank: 10,
    deliver: { v_torsk: 20, v_hyse: 12, v_sei: 12, v_kveite: 1 },
  },
  { title: 'Ansett folk', text: 'Nadja vet om ti stykker som vil jobbe. De trenger lønn den første måneden.', price: 30000, rank: 11 },
  { title: 'Åpning', text: 'Bånd, kake og ordføreren. Og et nytt skilt over døra.', price: 45000, rank: 12 },
]

export const plantOpen = (va: VardoState) => va.plant.stage >= PLANT_STAGES.length

/** Fish still missing for the current stage, by species id */
export function plantMissing(va: VardoState): Record<string, number> {
  const st = PLANT_STAGES[va.plant.stage]
  const out: Record<string, number> = {}
  if (!st?.deliver) return out
  for (const [id, n] of Object.entries(st.deliver)) {
    const left = n - (va.plant.delivered[id] ?? 0)
    if (left > 0) out[id] = left
  }
  return out
}

/** Hand fish to the plant; returns the fish it took. A delivery-only stage advances itself when complete */
export function plantDeliver(va: VardoState, list: Catch[]): Catch[] {
  const st = PLANT_STAGES[va.plant.stage]
  if (!st?.deliver) return []
  const took: Catch[] = []
  for (const c of list) {
    const need = (st.deliver[c.id] ?? 0) - (va.plant.delivered[c.id] ?? 0)
    if (need <= 0) continue
    va.plant.delivered[c.id] = (va.plant.delivered[c.id] ?? 0) + 1
    took.push(c)
  }
  if (!Object.keys(plantMissing(va)).length && !st.price) {
    va.plant.stage++
    va.plant.delivered = {}
  }
  return took
}

/** Pay for the current stage (money stages); fish stages need plantDeliver as well */
export function plantAdvance(va: VardoState, money: number, flags: Record<string, boolean>): Buy {
  const st = PLANT_STAGES[va.plant.stage]
  if (!st) return { ok: false, why: 'Bruket er åpent', cost: 0 }
  if (Object.keys(plantMissing(va)).length) return { ok: false, why: 'Mangler fisk', cost: st.price }
  if (va.boat < 2) return { ok: false, why: 'Krever kystbåt', cost: st.price }
  const b = canBuy(va, money, st.price, st.rank, undefined, flags)
  if (b.ok) {
    va.plant.stage++
    va.plant.delivered = {}
  }
  return b
}

export const plantRate = (va: VardoState) => (plantOpen(va) ? trackValue(va, 'plantStaff') * trackValue(va, 'plantTruck') : 0)
export const plantCashCap = (va: VardoState) => trackValue(va, 'plantCold')

// ---------- collecting ----------

/** Take the money waiting in a business; the caller adds it to the purse */
export function collect(va: VardoState, which: 'smoke' | 'guests' | 'plant'): number {
  const box = which === 'smoke' ? va.smoke : which === 'guests' ? va.guests : va.plant
  const kr = Math.floor(box.cash)
  box.cash -= kr
  return kr
}

// ---------- soup ----------

export const soupBite = 1.3
export const soupActive = (va: VardoState, day: number) => va.soupDay !== undefined && day <= va.soupDay
export function cookSoup(va: VardoState, day: number): boolean {
  if (!va.rooms.includes('kjokken')) return false
  va.soupDay = day
  return true
}

// ---------- the passive tick ----------

export interface PassiveCtx {
  night: boolean
  aurora: boolean
  /** every species of a ground (data.ts groundSpecies) */
  pool: (g: GroundId) => Species[]
  rand?: () => number
}

const pick = <T extends { weight: number }>(list: T[], w: (x: T) => number, rand: () => number): T | null => {
  const total = list.reduce((n, x) => n + w(x), 0)
  if (total <= 0) return null
  let r = rand() * total
  for (const x of list) if ((r -= w(x)) <= 0) return x
  return list[list.length - 1]
}

const fitsTime = (sp: Species, night: boolean) => !sp.time || sp.time === 'any' || (sp.time === 'night') === night

/** One fish out of a net on a ground: shallow and middle water, better mesh means better fish */
export function netFish(va: VardoState, pool: Species[], night: boolean, rand: () => number = Math.random): Catch | null {
  const mesh = trackValue(va, 'netMesh')
  const list = pool.filter((s) => s.zone <= 2 && !s.pot && !s.special && !s.legend && s.weight > 0 && fitsTime(s, night))
  const sp = pick(list, (s) => s.weight * (s.rare ? 0.4 + (mesh - 0.5) * 2 : 1), rand)
  if (!sp) return null
  const t = Math.pow(rand(), 0.8 / mesh)
  const cm = Math.round(sp.cm[0] + (sp.cm[1] - sp.cm[0]) * t)
  const kg = +(sp.kg[0] + (sp.kg[1] - sp.kg[0]) * Math.pow(t, 2.2)).toFixed(sp.kg[1] < 2 ? 2 : 1)
  return { id: sp.id, cm, kg, value: Math.round(sp.value * (0.7 + 0.6 * t) * mesh) }
}

/** One crab out of a pot. Crab species keep their carapace length in `cm`, so mm = cm × 10 */
export function potCrab(va: VardoState, pool: Species[], rand: () => number = Math.random): CrabCatch | null {
  const sp = pick(pool.filter((s) => s.pot && !s.legend && s.weight > 0), (s) => s.weight, rand)
  if (!sp) return null
  const bait = trackValue(va, 'potBait')
  const male = rand() < 0.55
  const t = Math.min(1, Math.pow(rand(), 1 / (1 + bait * 3)) * (male ? 1 : 0.82))
  const mm = Math.round((sp.cm[0] + (sp.cm[1] - sp.cm[0]) * t) * 10)
  const kg = +(sp.kg[0] + (sp.kg[1] - sp.kg[0]) * Math.pow(t, 2)).toFixed(1)
  return { id: sp.id, mm, male, kg, value: Math.round(sp.value * (0.7 + 0.6 * t)) }
}

/** Seconds a game night lasts for the guest book (one game day) */
export const GUEST_NIGHT = 540

/** Everything that earns while you play; dt in seconds */
export function tickPassive(va: VardoState, dt: number, ctx: PassiveCtx) {
  const rand = ctx.rand ?? Math.random
  const out = { netFull: [] as number[], potFull: [] as number[], smoked: 0, cashCapped: [] as string[] }
  let earned = 0

  // nets
  const perFish = 60 / trackValue(va, 'netLen')
  const ncap = netCap(va)
  va.nets.forEach((n, i) => {
    if (n.fish.length >= ncap) return
    n.t += dt
    const pool = ctx.pool(n.ground)
    while (n.t >= perFish && n.fish.length < ncap) {
      n.t -= perFish
      const f = netFish(va, pool, ctx.night, rand)
      if (!f) break
      n.fish.push(f)
      earned += f.value
    }
    if (n.fish.length >= ncap) {
      n.t = 0
      out.netFull.push(i)
    }
  })

  // pots
  const perCrab = 60 / trackValue(va, 'potType')
  const pcap = potCap(va)
  va.pots.forEach((p, i) => {
    if (p.crabs.length >= pcap) return
    p.t += dt
    const pool = ctx.pool(p.ground)
    while (p.t >= perCrab && p.crabs.length < pcap) {
      p.t -= perCrab
      const c = potCrab(va, pool, rand)
      if (!c) break
      p.crabs.push(c)
      earned += c.value
    }
    if (p.crabs.length >= pcap) {
      p.t = 0
      out.potFull.push(i)
    }
  })

  // smokehouse
  const sm = va.smoke
  if (va.rooms.includes('royeri') && sm.load.length) {
    const need = trackValue(va, 'smokeWood') * 60
    sm.t = Math.min(need, sm.t + dt)
    if (sm.t >= need) {
      const kr = Math.round(sm.load.reduce((s, c) => s + c.value, 0) * trackValue(va, 'smokeBrand'))
      if (sm.cash + kr <= smokeCashCap(va)) {
        sm.cash += kr
        // the fish were already counted when the nets caught them; only the smoking adds
        earned += kr - sm.load.reduce((s, c) => s + c.value, 0)
        out.smoked = sm.load.length
        va.stats.smoked += sm.load.length
        sm.load = []
        sm.t = 0
      } else out.cashCapped.push('smoke')
    }
  }

  // guests
  const g = va.guests
  const rate = guestRate(va, ctx.aurora && ctx.night)
  if (rate > 0) {
    const cap = guestCashCap(va)
    if (g.cash < cap) {
      const kr = Math.min(cap - g.cash, (rate * dt) / 60)
      g.cash += kr
      earned += kr
      g.t += dt
      while (g.t >= GUEST_NIGHT) {
        g.t -= GUEST_NIGHT
        g.nights += guestRooms(va)
        va.stats.guestNights += guestRooms(va)
      }
      if (g.cash >= cap) out.cashCapped.push('guests')
    }
  }

  // fish plant
  const pl = va.plant
  if (plantOpen(va)) {
    const cap = plantCashCap(va)
    if (pl.cash < cap) {
      const kr = Math.min(cap - pl.cash, (plantRate(va) * dt) / 60)
      pl.cash += kr
      pl.t += dt
      earned += kr
      if (pl.cash >= cap) out.cashCapped.push('plant')
    }
  }

  va.stats.passive += earned
  return out
}
