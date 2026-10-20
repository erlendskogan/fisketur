// Pacing simulation for Vardø. Run: node --experimental-strip-types scripts/vardo-sim.ts [seed]
// A steady player fishes the furthest ground the boat reaches, hauls nets and pots every
// quarter of an hour, smokes, collects and buys things in a sensible order. It runs the real
// economy and contract code against made-up species pools with plausible values.

import type { Species } from '../src/game/data.ts'
import type { GroundId, RoomId, TrackId, VardoState } from '../src/game/vardo/types.ts'
import * as E from '../src/game/vardo/economy.ts'
import * as C from '../src/game/vardo/contracts.ts'

const seed = Number(process.argv[2] ?? 7)
let st = seed >>> 0
const rand = () => {
  st = (st + 0x6d2b79f5) >>> 0
  let t = st
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// ---------- assumptions ----------

const G: GroundId[] = ['sundet', 'fjorden', 'banken', 'eggakanten']
/** average hook-caught fish value per ground, and fish per minute including selling trips */
const HOOK_AVG: Record<GroundId, number> = { sundet: 60, fjorden: 250, banken: 700, eggakanten: 1800 }
const FISH_PER_MIN = 2.5
/** share of hook income spent on rods, lines, lures and so on (the per-world gear) until the chapter is done */
const GEAR_TAX = 0.15
/** minutes between rounds of hauling nets and pots, selling, smoking and collecting */
const ROUND = 15
/** one contract finished every this many minutes (from rank 2), 80 % success */
const CONTRACT_EVERY = 14

// made-up pools: zones 0–2 are what the nets catch, roughly half the hook average
const sp = (id: string, zone: number, value: number, weight: number, extra: Partial<Species> = {}): Species =>
  ({ id, name: id.slice(2), zone, value, weight, cm: [30, 90], kg: [1, 8], difficulty: 3, behavior: 'calm', look: {} as never, text: '', ...extra }) as Species
const POOLS: Record<GroundId, Species[]> = {
  sundet: [sp('v_torsk', 1, 50, 20), sp('v_sei', 0, 25, 25), sp('v_hyse', 1, 35, 18), sp('v_rognkjeks', 0, 30, 10), sp('v_sjoroye', 2, 90, 6), sp('v_kveite', 2, 300, 1, { rare: true })],
  fjorden: [sp('v_steinbit', 1, 140, 18), sp('v_uer', 2, 180, 14), sp('v_sild', 0, 60, 20), sp('v_torsk', 1, 120, 14), sp('v_kveite', 2, 900, 2, { rare: true }),
    sp('v_kongekrabbe', 3, 380, 10, { pot: true, cm: [8, 20], kg: [1, 6] })],
  banken: [sp('v_storsei', 0, 220, 18), sp('v_hyse', 1, 300, 16), sp('v_snabeluer', 2, 500, 14), sp('v_blasteinbit', 2, 480, 10), sp('v_polartorsk', 1, 260, 12),
    sp('v_snokrabbe', 3, 300, 10, { pot: true, cm: [6, 15], kg: [0.4, 1.4] })],
  eggakanten: [sp('v_blakveite', 2, 900, 18), sp('v_isgalt', 1, 650, 14), sp('v_isskolest', 2, 800, 12), sp('v_alebrosme', 1, 700, 12), sp('v_ringbuk', 2, 1500, 4, { rare: true })],
}
const CRAB_MIN: Record<string, number> = { v_kongekrabbe: 130, v_snokrabbe: 95 }

// ---------- the player ----------

const va: VardoState = E.freshVardo()
let money = 0
const flags: Record<string, boolean> = { va_metFrida: true, va_metNadja: true }
let t = 0
const income = { hook: 0, passive: 0, contract: 0 }
const window = { hook: 0, passive: 0, contract: 0, xp: 0 }
const events: string[] = []
const log = (what: string) => events.push(`${hm(t).padStart(6)}  r${String(E.rankLevel(va)).padStart(2)}  ${fmt(money).padStart(10)}  ${what}`)
const hm = (m: number) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`
const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const ground = () => E.groundsFor(va.boat)[E.groundsFor(va.boat).length - 1]
let flukeAt = -1
let endingAt = -1
let plantFishAt = -1
const marks: Record<string, number> = {}
const mark = (k: string) => {
  if (marks[k] === undefined) marks[k] = t
}

type Item = { room: RoomId } | { boat: number } | { track: TrackId; to?: number } | { net: true; to?: number } | { pot: true; to?: number } | { plant: true; to?: number }
const ORDER: Item[] = [
  { room: 'tak' }, { track: 'netLen' }, { track: 'netFloat' }, { room: 'kjokken' },
  { boat: 1 }, { pot: true }, { pot: true }, { net: true }, { track: 'netMesh' }, { track: 'netLen' }, { track: 'netFloat' }, { room: 'stue' },
  { room: 'gjest1' }, { track: 'guestComfort' }, { track: 'potType' }, { track: 'potBait' },
  { boat: 2 }, { plant: true }, { plant: true }, { plant: true }, { plant: true },
  { room: 'verksted' }, { net: true }, { pot: true }, { pot: true }, { track: 'netMesh' }, { track: 'netLen' }, { track: 'netFloat' },
  { track: 'guestAds' }, { track: 'potType' },
  { boat: 3 }, { net: true }, { pot: true }, { pot: true }, { room: 'royeri' }, { room: 'akvarium' },
  { room: 'brygge' }, { track: 'plantStaff' }, { track: 'plantCold' }, { room: 'gjest2' }, { track: 'smokeBrand' }, { track: 'smokeOven' },
  { room: 'badstue' }, { track: 'plantTruck' }, { room: 'tarn' },
]
const ALL_TRACKS = Object.keys(E.VA_TRACKS) as TrackId[]
// repeated entries mean «one more level» (or one more net/pot): give each its target count
{
  const seen: Record<string, number> = {}
  for (const it of ORDER) {
    const k = 'track' in it ? it.track : 'net' in it ? 'net' : 'pot' in it ? 'pot' : 'plant' in it ? 'plant' : ''
    if (!k) continue
    seen[k] = (seen[k] ?? 0) + 1
    ;(it as { to?: number }).to = seen[k] + (k === 'net' ? 1 : k === 'pot' ? 2 : 0)
  }
}

function tryItem(it: Item): 'bought' | 'gated' | 'poor' | 'done' {
  let b: E.Buy
  let what = ''
  if ('room' in it) {
    if (va.rooms.includes(it.room)) return 'done'
    b = E.buyRoom(va, it.room, money, flags)
    what = E.VA_ROOMS[it.room].name
  } else if ('boat' in it) {
    if (va.boat >= it.boat) return 'done'
    b = E.buyBoat(va, it.boat, money, flags)
    what = `${E.VA_BOATS[it.boat].type} ${E.VA_BOATS[it.boat].name}`
  } else if ('track' in it) {
    if (!E.nextLevel(va, it.track) || E.lvl(va, it.track) >= it.to!) return 'done'
    const next = E.nextLevel(va, it.track)!
    b = E.buyTrack(va, it.track, money, flags)
    what = `${E.VA_TRACKS[it.track].title}: ${next.name}`
  } else if ('net' in it) {
    if (va.netsOwned >= E.NET_PRICES.length || va.netsOwned >= it.to!) return 'done'
    if (va.netsOwned >= E.netSlots(va)) return 'gated'
    b = E.buyNet(va, money, flags)
    what = `garn nr. ${va.netsOwned + (b.ok ? 0 : 1)}`
  } else if ('pot' in it) {
    if (va.potsOwned >= 12 || va.potsOwned >= it.to!) return 'done'
    if (va.potsOwned >= E.potSlots(va) || !flags.va_crab) return 'gated'
    b = E.buyPot(va, money, flags)
    what = `teine nr. ${va.potsOwned}`
  } else {
    if (E.plantOpen(va) || va.plant.stage >= it.to!) return 'done'
    const stage = E.PLANT_STAGES[va.plant.stage]
    if (stage.deliver) return 'gated'
    b = E.plantAdvance(va, money, flags)
    what = `Fiskebruket: ${stage.title}`
  }
  if (b.ok) {
    money -= b.cost
    log(`kjøper ${what} (${fmt(b.cost)})`)
    return 'bought'
  }
  return b.why.startsWith('Koster') ? 'poor' : 'gated'
}

/** One shopping trip: the planned order first (skipping what is gated), then whatever upgrade is cheapest */
function shop() {
  for (let guard = 0; guard < 40; guard++) {
    let bought = false
    let stop = false
    for (const it of ORDER) {
      const r = tryItem(it)
      if (r === 'bought') {
        bought = true
        break
      }
      if (r === 'poor') {
        stop = true
        break
      }
      // a boat one rank away is worth saving for
      if (r === 'gated' && 'boat' in it && E.rankLevel(va) >= E.VA_BOATS[it.boat].rank - 1) {
        stop = true
        break
      }
      // 'done' items are passed; repeated track entries mean «one more level»
    }
    if (bought) continue
    if (stop && !orderDone()) return
    // after the plan: cheapest open upgrade, but only once the plan has nothing left
    if (!orderDone()) return
    const opts = ALL_TRACKS.map((k) => ({ k, b: E.canBuyTrack(va, k, money, flags) })).filter((x) => x.b.ok)
      // the plant first: it is what a sensible player grows, then whatever is cheapest
      .sort((a, b) => (a.k.startsWith('plant') ? 0 : 1) - (b.k.startsWith('plant') ? 0 : 1) || a.b.cost - b.b.cost)
    // save up for the plant while its next level is open by rank
    const plantNext = (['plantStaff', 'plantCold', 'plantTruck'] as TrackId[]).some((k) => E.canBuyTrack(va, k, Infinity, flags).ok)
    const pick = plantNext ? opts.find((x) => x.k.startsWith('plant')) : opts[0]
    if (!pick) return
    tryItem({ track: pick.k })
  }
}
let planned = false
const orderDone = () => planned || (planned = va.boat >= 3 && va.rooms.includes('tarn') && E.plantOpen(va))

// ---------- story gates (rough timings) ----------

function story() {
  const r = E.rankLevel(va)
  if (va.rooms.includes('tak') && !flags.va_metAslak) {
    flags.va_metAslak = true
    va.netsOwned = 1
    E.setNet(va, 'sundet')
    log('Aslak gir deg Elles garn')
  }
  if (va.boat >= 1 && !flags.va_crab) {
    flags.va_crab = true
    va.potsOwned = 2
    log('Aslak: to teiner')
  }
  if (va.boat >= 1 && r >= 6 && !flags.va_selmaLetter) {
    flags.va_selmaLetter = true
    log('Selmas brev')
  }
  if (va.rooms.includes('gjest1') && flukeAt < 0) flukeAt = t + 25
  if (flukeAt >= 0 && t >= flukeAt && !flags.va_flukesDone) {
    flags.va_flukesDone = true
    log('fire halefinner til Selma')
  }
  if (flags.va_flukesDone && va.boat >= 2 && !flags.va_joik) {
    flags.va_joik = true
    log('Aslaks joik')
  }
  // plant stage 1: about 12 minutes of fishing the right fish instead of selling them
  if (va.plant.stage === 1) {
    if (plantFishAt < 0) plantFishAt = t + 12
    if (t >= plantFishAt) {
      E.plantDeliver(va, [
        ...Array(20).fill({ id: 'v_torsk', cm: 60, kg: 3, value: 0 }), ...Array(12).fill({ id: 'v_hyse', cm: 50, kg: 2, value: 0 }),
        ...Array(12).fill({ id: 'v_sei', cm: 50, kg: 2, value: 0 }), { id: 'v_kveite', cm: 120, kg: 20, value: 0 },
      ])
      log('fryseren er testet')
    }
  }
  if (E.plantOpen(va) && !flags.va_plantOpen) {
    flags.va_plantOpen = true
    mark('plant open')
    log('FISKEBRUKET ÅPNER')
  }
  if (va.boat >= 3 && endingAt < 0) endingAt = t + 40
  if (endingAt >= 0 && t >= endingAt && !flags.va_ending) {
    flags.va_ending = true
    mark('ending')
    log('SLUTT PÅ FEMTE KAPITTEL')
  }
}

// ---------- one round of chores ----------

function chores(day: number) {
  const g = ground()
  // move nets and pots out to where you fish
  va.nets.forEach((n, i) => {
    if (n.ground !== g) {
      E.liftNet(va, i)
      va.nets.splice(i, 0, { ground: g, fish: [], t: 0 })
    }
  })
  while (E.setNet(va, g)) {}
  const pg = g === 'eggakanten' ? 'banken' : g
  if (E.POT_GROUNDS.includes(pg)) {
    for (const p of va.pots) if (p.ground !== pg) p.ground = pg
    E.setPots(va, pg, va.potsOwned)
  }
  // haul
  let xp = 0
  va.nets.forEach((_, i) => {
    const fish = E.takeNet(va, i)
    if (!fish.length) return
    flags.va_netHauled = true
    const kept = fish.filter(() => rand() < 0.92)
    E.landNetHaul(va, kept)
    xp += E.xpForHaul(kept)
  })
  for (const pg2 of E.POT_GROUNDS) {
    const crabs = E.takePots(va, pg2)
    if (!crabs.length) continue
    const keep = crabs.map((c) => (E.crabLegal(c, CRAB_MIN) ? rand() < 0.93 : rand() < 0.04))
    const o = E.sortOutcome(crabs, keep, CRAB_MIN)
    money -= o.fine
    E.landCrabs(va, o.kept)
    xp += E.xpForHaul(o.kept)
  }
  va.xp += xp
  // smoke the best of the hold, sell the rest
  if (va.rooms.includes('royeri') && !va.smoke.load.length) {
    va.hold.sort((a, b) => b.value - a.value)
    const took = E.smokeLoad(va, va.hold)
    va.hold = va.hold.slice(took.length)
  }
  const sold = va.hold.reduce((n, c) => n + c.value, 0)
  va.hold = []
  const got = sold + E.collect(va, 'smoke') + E.collect(va, 'guests') + E.collect(va, 'plant') + E.bryggeHaul(va).kr
  money += got
  income.passive += got
  window.passive += got
  void day
}

// ---------- run ----------

const HOURS = Number(process.argv[3] ?? 20)
const rows: string[] = []
let nextContract = CONTRACT_EVERY
let lastRank = 1
const DAY = 9 // real minutes per game day
for (t = 0; t < HOURS * 60; t++) {
  const day = Math.floor(t / DAY)
  const night = (t % DAY) / DAY > 0.72
  const g = ground()
  // hook fishing this minute
  const n = Math.floor(FISH_PER_MIN) + (rand() < FISH_PER_MIN % 1 ? 1 : 0)
  let kr = 0
  for (let i = 0; i < n; i++) {
    const v = HOOK_AVG[g] * (0.35 + rand() * 1.3)
    kr += v
    va.xp += E.xpForCatch(v)
  }
  if (va.plant.stage === 1) kr *= 0.4 // fishing for the freezer test instead of selling
  const net = kr * (flags.va_ending ? 1 : 1 - GEAR_TAX)
  money += net
  income.hook += net
  window.hook += net

  // contracts
  if (E.rankLevel(va) >= 2 && t >= nextContract) {
    nextContract = t + CONTRACT_EVERY
    const o = { rank: E.rankLevel(va), grounds: E.groundsFor(va.boat), pool: (x: GroundId) => POOLS[x], flags, rand }
    C.refreshOffers(va, day, o)
    const of = va.offers[0]
    if (of) {
      const c = C.takeOffer(va, of.id, day)!
      if (rand() < 0.8) c.done = true
      const r = C.finishContract(va, c)
      money += r.money
      income.contract += r.money
      window.contract += r.money
    }
  }

  E.tickPassive(va, 60, { night, aurora: night && rand() < 0.3, pool: (x) => POOLS[x], rand })
  if (t % ROUND === ROUND - 1) chores(day)
  story()
  shop()

  const r = E.rankLevel(va)
  if (r > lastRank) {
    for (let k = lastRank + 1; k <= r; k++) mark(`rank ${k}`)
    if ([2, 4, 6, 10, 12, 16, 20, 25, 30].includes(r)) log(`rang ${r}: ${E.rankTitle(r)}`)
    lastRank = r
  }
  if (va.boat >= 1) mark('sjark')
  if (va.boat >= 2) mark('kystbåt')
  if (va.boat >= 3) mark('havfiskebåt')
  if (va.rooms.includes('tak')) mark('tak')
  if (va.rooms.length === 11) mark('all rooms')
  if (E.plantOpen(va) && (['plantStaff', 'plantCold', 'plantTruck'] as TrackId[]).every((k) => !E.nextLevel(va, k))) mark('plant maxed')
  if (ALL_TRACKS.every((k) => !E.nextLevel(va, k))) mark('all tracks')

  if ((t + 1) % 30 === 0) {
    const tot = window.hook + window.passive + window.contract
    rows.push(
      `${hm(t + 1).padStart(6)}  ${String(r).padStart(4)}  ${fmt(money).padStart(10)}  ${fmt(window.hook / 30).padStart(7)}  ${fmt(window.passive / 30).padStart(7)}  ${fmt(window.contract / 30).padStart(7)}  ${String(Math.round((100 * window.passive) / Math.max(1, tot))).padStart(4)} %  ${String(Math.round((va.xp - window.xp) / 30)).padStart(5)}  ${g}`,
    )
    window.hook = window.passive = window.contract = 0
    window.xp = va.xp
  }
}

console.log(`\nVardø pacing, seed ${seed}\n`)
console.log('  time  rank       money  hook/m  pass/m  cont/m  passive  xp/m  ground')
for (const r of rows) console.log(r)
console.log('\nEvents\n')
for (const e of events) console.log(e)
console.log('\nMilestones (target in brackets)\n')
const target: [string, string][] = [
  ['tak', '8–10 min'], ['sjark', '50–70 min'], ['kystbåt', '2–2.5 h'], ['plant open', '~3 h'], ['havfiskebåt', '4–4.5 h'], ['ending', '~5 h'],
  ['all rooms', '~8 h'], ['plant maxed', '12–15 h'], ['rank 10', ''], ['rank 16', ''], ['rank 20', ''], ['rank 25', '~15 h'], ['rank 30', 'slowly after'], ['all tracks', ''],
]
for (const [k, tg] of target) console.log(`${k.padEnd(12)} ${marks[k] !== undefined ? hm(marks[k]).padStart(6) : '     –'}   ${tg}`)
console.log('\nRank reached at\n')
const rk = Object.keys(marks).filter((k) => k.startsWith('rank ')).map((k) => `${k.slice(5).padStart(2)} ${hm(marks[k]).padStart(5)}`)
for (let i = 0; i < rk.length; i += 8) console.log(rk.slice(i, i + 8).join('   '))
const tot = income.hook + income.passive + income.contract
console.log(`\nIncome split: hook ${Math.round((100 * income.hook) / tot)} %, passive ${Math.round((100 * income.passive) / tot)} %, contracts ${Math.round((100 * income.contract) / tot)} %`)
console.log(`Rank after ${HOURS} h: ${E.rankLevel(va)} (${E.rankOf(va.xp).title})`)
