// Brita's contract board: three jobs a day that never run out. Pure functions; the
// caller pays out what finishContract returns. Only type imports (see economy.ts).

import type { Species } from '../data'
import type { ActiveContract, ContractKind, ContractOffer, GroundId, VaWho, VardoState } from './types'

const GROUND_NAME: Record<GroundId, string> = { sundet: 'Bussesundet', fjorden: 'Varangerfjorden', banken: 'Tiddlybanken', eggakanten: 'Eggakanten' }
/** «i Bussesundet», «på Tiddlybanken» */
export const atGround = (g: GroundId) => `${g === 'banken' || g === 'eggakanten' ? 'på' : 'i'} ${GROUND_NAME[g]}`
/** Rough kroner a minute of good fishing makes on each ground; rewards are measured in it */
const GROUND_KR: Record<GroundId, number> = { sundet: 150, fjorden: 600, banken: 1700, eggakanten: 4300 }
const GROUND_XP: Record<GroundId, number> = { sundet: 22, fjorden: 38, banken: 58, eggakanten: 85 }

export interface OfferOpts {
  rank: number
  /** grounds your boat reaches */
  grounds: GroundId[]
  pool: (g: GroundId) => Species[]
  flags: Record<string, boolean>
  /** how deep your line reaches, so ghost nets are only offered where you can get at them */
  line?: number
  /** where ghost nets can lie on each ground (data.ts VA_GHOSTNET_DEPTHS) */
  ghostDepths?: Record<GroundId, number[]>
  /** whether the line reaches a zone of a ground, so species and weight jobs are fishable */
  reach?: (g: GroundId, zone: number) => boolean
  rand?: () => number
}

type R = () => number
const pickOf = <T>(xs: T[], rand: R): T => xs[Math.floor(rand() * xs.length) % xs.length]
const WORDS = ['null', 'én', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti', 'elleve', 'tolv']
/** Small numbers read better as words in a sentence */
const numWord = (n: number) => WORDS[n] ?? String(n)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** {n} fills in a value, {N} the same value with a capital first letter */
const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => {
    const low = k.charAt(0).toLowerCase() + k.slice(1)
    const x = String(v[k] ?? v[low] ?? '')
    return k === low ? x : cap(x)
  })
const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step)
const kgText = (kg: number) => String(kg).replace('.', ',')
const krText = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} kr`

const hookable = (pool: Species[]) => pool.filter((s) => !s.pot && !s.special && !s.legend && s.weight > 0)

/** Money and XP for about `minutes` of effort on a ground */
function reward(g: GroundId, minutes: number, rank: number) {
  const r = 1 + rank * 0.03
  return { money: roundTo(GROUND_KR[g] * minutes * 0.6 * r, 50), xp: Math.round(GROUND_XP[g] * minutes * r) }
}

/** Templates: a title and, for each person who might ask, a few ways of saying it */
const T: Record<ContractKind, { title: string; by: Partial<Record<VaWho, string[]>> }> = {
  rush: {
    title: '{n} fisk på {min} minutter',
    by: {
      nadja: [
        'Nadja har en buss med turister på vei. Hun trenger {n} fisk {at}, og hun trenger dem nå.',
        '«Restauranten i Kiberg har glemt å bestille. Igjen.» Nadja vil ha {n} fisk {at}, fort.',
      ],
      brita: [
        '«Kokken på Hurtigruten ringte. {N} fisk {at} før de legger fra.» Brita ser på klokka.',
        'Brita har lovet mannskapet på kystvaktskipet middag. {N} fisk {at}. «Klokka går.»',
      ],
    },
  },
  species: {
    title: 'Fang {n} {sp}',
    by: {
      nadja: [
        'Nadja har en kunde som bare vil ha {sp}. «Ikke spør meg hvorfor. {N} stykker.»',
        'En kokk i Vadsø vil ha {n} {sp} før dagen er omme. Nadja har allerede sagt ja.',
      ],
      aslak: [
        'Aslak vil ha {n} {sp}. «Elle sa alltid at {sp} smakte best på denne tida.»',
        '«{N} {sp}.» Aslak sier ikke mer. Det trenger han ikke.',
      ],
    },
  },
  heavy: {
    title: 'En fisk over {kg} kg',
    by: {
      brita: [
        'Brita har veddet med havnefogden i Båtsfjord. Hun trenger en fisk over {kg} kg {at}.',
        'Avisa vil ha et bilde av en skikkelig fisk. Brita har sagt at du ordner det. Over {kg} kg, {at}.',
      ],
      frida: [
        'Frida skal bygge en ny fiskekasse og vil ha en ordentlig fisk å måle. Over {kg} kg, {at}. «Ellers blir målene feil.»',
        '«Bestefar hadde en vekt som gikk til {kg} kg. Jeg vil se den slå i bunn.» Fisken skal være fra et sted {at}.',
      ],
    },
  },
  deliver: {
    title: 'Selg fisk for {kr} til Nadja',
    by: {
      nadja: [
        'Nadja skal fylle en hel bil med fisk til Kirkenes. Selg henne fisk for {kr}.',
        '«Disken er tom, og det er lørdag.» Selg Nadja fisk for {kr}.',
        'Pomorbrygga har fått en stor ordre fra et hotell i Tromsø. Nadja trenger fisk for {kr}.',
      ],
    },
  },
  night: {
    title: 'Fang {n} fisk om natta',
    by: {
      aslak: [
        'Aslak sier fisken står høyere om natta. «Fang {n}, så skal du se.»',
        '«Farmor fisket bare om natta. Hun sa fisken var mindre redd da.» Aslak vil ha {n}.',
      ],
      brita: [
        'Brita trenger noen ute i natt som kan holde utkikk etter lys. Ta {n} fisk mens du er der.',
        '«Det er fullmåne og stille sjø. Hadde jeg vært deg, hadde jeg vært ute.» Brita vil ha {n} fisk.',
      ],
    },
  },
  ghostnet: {
    title: 'Spøkelsesgarn {at}',
    by: {
      brita: [
        'Et gammelt garn har slitt seg og fisker for seg selv {at}. Finn det og få det opp.',
        'Fiskeridirektoratet har meldt om et tapt garn {at}. Det fanger fisk og fugl helt til noen henter det.',
        '«Et spøkelsesgarn dreper i årevis.» Brita peker på kartet, et sted {at}.',
      ],
    },
  },
  crab: {
    title: 'Lever {n} store hannkrabber',
    by: {
      nadja: [
        'Nadja har en restaurant i Tokyo på tråden. {N} krabber, bare store hanner.',
        'Et hotell i Kirkenes vil ha {n} krabber til helga. «Store hanner. Brita teller.»',
      ],
      aslak: [
        'Aslak vil ha {n} krabber til en fest i naustet. «Store hanner. Ikke tull.»',
        '«Mikkel fyller år.» Aslak vil ha {n} krabber til barnebarnet. Store hanner, selvsagt.',
      ],
    },
  },
  tour: {
    title: 'Fugletur til Hornøya',
    by: {
      selma: [
        'Gjestene vil se lunde. Selma har lovet dem en tur til Hornøya. Ta {n} gode bilder.',
        'Selma har med seg to fuglekikkere fra Bergen. «De vil se lomvi. Og lunde. Og alt.» {N} gode bilder.',
        '«Det er fullt liv på fuglefjellet nå.» Selma vil ha {n} skarpe bilder til gjesteboka.',
      ],
    },
  },
  race: {
    title: 'Kappseilas til Kiberg',
    by: {
      frida: [
        'Frida har meldt deg på regattaen. «{Goal}, så er båten din god nok.»',
        'Legekontoret i Kiberg trenger en pakke medisiner før kvelden. Frida mener du er raskest. {Goal}.',
        '«Bestefar vant denne så mange ganger at de sluttet å telle.» Frida rekker deg et startnummer. {Goal}.',
      ],
    },
  },
}

/** Kinds you can be offered right now */
export function unlockedKinds(va: VardoState, o: OfferOpts): ContractKind[] {
  const ks: ContractKind[] = ['rush', 'species', 'heavy', 'deliver', 'night', 'ghostnet']
  if (va.potsOwned > 0 && o.grounds.some((g) => g === 'fjorden' || g === 'banken')) ks.push('crab')
  if (va.rooms.includes('gjest1')) ks.push('tour')
  if (o.flags.va_metFrida && o.rank >= 5) ks.push('race')
  return ks
}

/** Mostly the furthest ground you reach, sometimes one closer in */
function groundFor(grounds: GroundId[], rand: R): GroundId {
  const gs = grounds.length ? grounds : ['sundet' as GroundId]
  const r = rand()
  const i = r < 0.55 ? gs.length - 1 : r < 0.85 ? gs.length - 2 : gs.length - 3
  return gs[Math.max(0, i)]
}

function offerOf(kind: ContractKind, va: VardoState, day: number, idx: number, o: OfferOpts, rand: R): ContractOffer | null {
  const t = T[kind]
  const who = pickOf(Object.keys(t.by) as VaWho[], rand)
  let g = groundFor(o.grounds, rand)
  const id = `${day}-${idx}-${kind}`
  const base = { id, kind, who }
  const make = (vars: Record<string, string | number>, extra: Partial<ContractOffer>, minutes: number): ContractOffer => ({
    ...base,
    title: fill(t.title, { ...vars, at: atGround(g) }),
    text: fill(pickOf(t.by[who]!, rand), { ...vars, n: typeof vars.n === 'number' ? numWord(vars.n) : (vars.n ?? ''), at: atGround(g) }),
    ...extra,
    ...reward(g, minutes, o.rank),
  })
  switch (kind) {
    case 'rush': {
      const n = 3 + Math.floor(rand() * 4)
      const limit = Math.round(n * 45 + 60)
      return make({ n, min: Math.round(limit / 60) }, { ground: g, n, limit }, (n / 2.5) * 1.6)
    }
    case 'species': {
      const list = hookable(o.pool(g)).filter((s) => s.zone <= 3 && !s.rare && (s.time ?? 'any') !== 'night' && (!o.reach || o.reach(g, s.zone)))
      if (!list.length) return null
      const sp = pickOf(list, rand)
      const n = 2 + Math.floor(rand() * 3)
      return make({ n, sp: sp.name.toLowerCase() }, { ground: g, species: sp.id, n }, n * 2.2)
    }
    case 'heavy': {
      const list = hookable(o.pool(g)).filter((s) => s.zone <= 4 && !s.rare && s.kg[1] >= 2 && (!o.reach || o.reach(g, s.zone)))
      if (!list.length) return null
      const sp = pickOf(list, rand)
      const kg = +(sp.kg[0] + (sp.kg[1] - sp.kg[0]) * (0.35 + rand() * 0.2)).toFixed(sp.kg[1] < 10 ? 1 : 0)
      return make({ kg: kgText(kg) }, { ground: g, kg }, 7)
    }
    case 'deliver': {
      const minutes = 6 + Math.floor(rand() * 5)
      const kr = roundTo(GROUND_KR[g] * minutes, 100)
      // no ground: any fish from anywhere counts
      return make({ kr: krText(kr) }, { n: kr }, minutes * 0.5)
    }
    case 'night': {
      const n = 3 + Math.floor(rand() * 4)
      return make({ n }, { n }, n * 0.6)
    }
    case 'ghostnet': {
      // only where the line reaches: a net you cannot get at is no job at all
      const reach = (x: GroundId) => (o.ghostDepths?.[x] ?? []).filter((d) => d <= (o.line ?? Infinity) - 5)
      const gs = o.grounds.filter((x) => reach(x).length)
      if (!gs.length) return null
      if (!reach(g).length) g = gs[gs.length - 1]
      const depth = pickOf(reach(g), rand)
      const of = make({}, { ground: g, n: 1, depth }, 8)
      of.text += ` Det henger fast rundt ${depth} meter nede.`
      return of
    }
    case 'crab': {
      const cg = o.grounds.filter((x) => x === 'fjorden' || x === 'banken')
      g = pickOf(cg, rand)
      const n = 4 + Math.floor(rand() * 5)
      return make({ n }, { ground: g, n }, n * 1.2)
    }
    case 'tour': {
      const n = 3 + Math.floor(rand() * 3)
      g = 'sundet'
      // the trip pays like a stretch of fishing on your best ground, not the sound
      const best = o.grounds[o.grounds.length - 1] ?? 'sundet'
      return { ...make({ n }, { n }, 0), ...reward(best, 6, o.rank) }
    }
    case 'race': {
      const n = 1 + Math.floor(rand() * 3)
      const best = o.grounds[o.grounds.length - 1] ?? 'sundet'
      const goal = n === 1 ? 'vinn' : `kom blant de ${n === 2 ? 'to' : 'tre'} første`
      return { ...make({ n, goal }, { n }, 0), ...reward(best, 4 + (4 - n) * 2, o.rank) }
    }
  }
}

/** Three offers for the day, all of different kinds */
export function makeOffers(va: VardoState, day: number, o: OfferOpts): ContractOffer[] {
  const rand = o.rand ?? Math.random
  const kinds = unlockedKinds(va, o)
  // the newly opened kinds come up more often so they get noticed
  const weight = (k: ContractKind) => (k === 'tour' || k === 'race' || k === 'crab' ? 1.3 : k === 'ghostnet' ? 0.7 : 1)
  const out: ContractOffer[] = []
  const used = new Set<ContractKind>()
  for (let tries = 0; out.length < 3 && tries < 30; tries++) {
    const left = kinds.filter((k) => !used.has(k))
    if (!left.length) break
    const total = left.reduce((n, k) => n + weight(k), 0)
    let r = rand() * total
    const k = left.find((x) => (r -= weight(x)) <= 0) ?? left[left.length - 1]
    used.add(k)
    const of = offerOf(k, va, day, out.length, o, rand)
    if (of) out.push(of)
  }
  return out
}

/** New offers once per game day */
export function refreshOffers(va: VardoState, day: number, o: OfferOpts): boolean {
  // once a day, even when the board has been emptied: taking every job does not bring new ones
  if (va.offersDay === day) return false
  va.offers = makeOffers(va, day, o)
  va.offersDay = day
  return true
}

/** How much progress finishes a contract */
export const contractTarget = (c: ContractOffer) => (c.kind === 'heavy' || c.kind === 'ghostnet' ? 1 : c.kind === 'deliver' && c.kg ? c.kg : (c.n ?? 1))

export function startContract(offer: ContractOffer, day: number): ActiveContract {
  const c: ActiveContract = { ...offer, progress: 0, done: false, failed: false }
  if (offer.limit) c.left = offer.limit
  else c.dueDay = day + 1
  return c
}

/** Take an offer off the board and make it the active one */
export function takeOffer(va: VardoState, id: string, day: number): ActiveContract | null {
  if (va.contract) return null
  const of = va.offers.find((x) => x.id === id)
  if (!of) return null
  va.offers = va.offers.filter((x) => x !== of)
  va.contract = startContract(of, day)
  return va.contract
}

const bump = (c: ActiveContract, by: number) => {
  if (c.done || c.failed) return false
  c.progress = Math.min(contractTarget(c), c.progress + by)
  if (c.progress >= contractTarget(c)) c.done = true
  return true
}

/** A fish was caught on the hook; true if it counted */
export function contractCatch(c: ActiveContract, ev: { sp: Species | string; kg: number; ground: GroundId; night: boolean; zone: number }): boolean {
  if (c.done || c.failed) return false
  const id = typeof ev.sp === 'string' ? ev.sp : ev.sp.id
  const onGround = !c.ground || c.ground === ev.ground
  switch (c.kind) {
    case 'rush':
      return onGround && bump(c, 1)
    case 'species':
      return id === c.species && bump(c, 1)
    case 'heavy':
      return onGround && ev.kg >= (c.kg ?? 0) && bump(c, 1)
    case 'night':
      return ev.night && onGround && bump(c, 1)
    default:
      return false
  }
}

/** Fish sold to Nadja */
export function contractSell(c: ActiveContract, kr: number, kg: number): boolean {
  if (c.kind !== 'deliver') return false
  return bump(c, c.kg ? kg : kr)
}

/** Legal crabs kept after sorting */
export function contractCrabs(c: ActiveContract, n: number): boolean {
  return c.kind === 'crab' && n > 0 && bump(c, n)
}

/** Ghost net hauled, a tour (score = good photos) or a race (score = place) finished */
export function contractEvent(c: ActiveContract, kind: 'ghostnet' | 'tour' | 'race', score = 1): boolean {
  if (c.kind !== kind || c.done || c.failed) return false
  if (kind === 'ghostnet') return bump(c, 1)
  if (kind === 'tour') return score >= contractTarget(c) && bump(c, contractTarget(c))
  // race: place 1 is best; you need to be at or above n
  return score >= 1 && score <= contractTarget(c) && bump(c, contractTarget(c))
}

/** Runs the clock; returns true the moment it fails */
export function contractTick(c: ActiveContract, dt: number, day: number): boolean {
  if (c.done || c.failed) return false
  if (c.left !== undefined) {
    c.left -= dt
    if (c.left <= 0) {
      c.left = 0
      c.failed = true
    }
  }
  if (c.dueDay !== undefined && day > c.dueDay) c.failed = true
  return c.failed
}

/** Bonus for contracts in a row: +10 % each, up to +50 % */
export const streakMult = (streak: number) => 1 + Math.min(5, Math.max(0, streak)) * 0.1

/** Close the active contract: pays when done (with streak bonus), breaks the streak when failed or given up */
export function finishContract(va: VardoState, c: ActiveContract): { money: number; xp: number; streak: number; ok: boolean } {
  if (va.contract === c) va.contract = null
  if (!c.done) {
    va.streak = 0
    return { money: 0, xp: 0, streak: 0, ok: false }
  }
  const m = streakMult(va.streak)
  const money = roundTo(c.money * m, 50)
  const xp = Math.round(c.xp * m)
  va.streak++
  va.contractsDone++
  va.xp += xp
  if (c.kind === 'ghostnet') va.stats.ghostnets++
  return { money, xp, streak: va.streak, ok: true }
}

