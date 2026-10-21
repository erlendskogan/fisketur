// The fifth chapter wired into the game: Vardø's harbour spots, Signes hus, the sea chart,
// nets and pots, the contract board, the minigames and everything that earns while you play.
// main.ts keeps the hooks; the chapter's logic lives here.

import { nightness } from '../../art/scenery'
import { auroraTonight } from '../../art/vardo'
import { sfx } from '../../audio'
import { SPECIES_BY_ID, WORLDS, setGround, type BookReward, type Species, type WorldId } from '../data'
import type { Harbor, SpotId } from '../harbor'
import { artFor, type Sea } from '../sea'
import { bookCount, bucketValue, gearValue, type Save } from '../state'
import { DERBY, LO_HOME_CALL, NAMES, type Line } from '../story'
import { esc, iconImg, kr, type UI } from '../../ui/ui'
import { CRAB_MIN_MM, VA_BOOK, VA_GEAR, VA_GHOSTNET_DEPTHS, VA_GROUNDS, VA_LEGEND_RULES, VA_SPECIES } from './data'
import {
  BRYGGE_SHARE,
  NET_PRICES,
  PLANT_STAGES,
  POT_GROUNDS,
  POT_PRICE,
  VA_BOATS,
  VA_ROOMS,
  VA_TRACKS,
  boatOf,
  buyBoat,
  buyNet,
  buyPot,
  buyRoom,
  buyTrack,
  canBuy,
  canBuyTrack,
  collect,
  cookSoup,
  groundsFor,
  guestCashCap,
  guestRate,
  holdCap,
  landCrabs,
  landNetHaul,
  liftNet,
  liftPots,
  lvl,
  netCap,
  netFull,
  netSlots,
  nextLevel,
  plantAdvance,
  plantCashCap,
  plantDeliver,
  plantMissing,
  plantOpen,
  plantRate,
  potCap,
  potSlots,
  rankLevel,
  rankOf,
  setNet,
  setPots,
  smokeCap,
  smokeCashCap,
  smokeLeft,
  smokeLoad,
  soupActive,
  sortOutcome,
  tickPassive,
  xpForCatch,
  xpForHaul,
} from './economy'
import { contractCatch, contractCrabs, contractEvent, contractSell, contractTarget, contractTick, finishContract, refreshOffers, takeOffer } from './contracts'
import { HouseScene, type HouseSpotId } from './house'
import { CrabSort, NetHaul, PhotoHunt, SailRace } from './minigames'
import {
  AFTER_VA_ENDING,
  ASLAK_CRAB,
  ASLAK_ELLE_NET,
  ASLAK_JOIK,
  ASLAK_NET_DONE,
  BRITA_BOARD,
  BRITA_FINE,
  BRITA_RULES,
  FRIDA_HAV,
  FRIDA_KYST,
  FRIDA_RACE,
  FRIDA_RACE_WON,
  FRIDA_SJARK,
  KNUT_LEGEND,
  MEET_ASLAK,
  MEET_BRITA,
  MEET_FRIDA,
  MEET_NADJA,
  NADJA_PLANT,
  NADJA_PLANT_STAGE,
  NADJA_POMOR,
  SELMA_ARRIVES,
  SELMA_FLUKE,
  SELMA_LETTER,
  VA_CHATTER,
  VA_CONTRACT_DONE,
  VA_CONTRACT_FAIL,
  VA_DERBY,
  VA_ENDING,
  VA_FAMILY_CALL,
  VA_HOUSE,
  VA_ROOF_DONE,
  VA_ROOM_DONE,
  VA_SJARK,
  VA_UNGE,
} from './story'
import { GROUND_ORDER, ROOM_ORDER, type ActiveContract, type GroundId, type MiniGame, type MiniInput, type NetState, type RoomId, type TrackId, type VardoState } from './types'

DERBY.vardo = VA_DERBY

export type View = 'sea' | 'harbor' | 'house' | 'mini'

/** What the controller needs from the game */
export interface VaHost {
  s: Save
  ui: UI
  sea: Sea
  harbor: Harbor
  view: View
  started: boolean
  save(): void
  go(v: View): void
  fade(mid: () => Promise<void> | void): Promise<void>
  placeHead(who: string, line: string): string
  openShop(tab?: 'main' | 'gear' | 'paint'): void
  openQuests(): void
  openBook(detail?: string, w?: WorldId): void
  openTravel(): void
  startDerby(): void
  derbyPrizes(): void
  chapterDone(): boolean
  claimable(): number
  bookClaimable(): BookReward | undefined
  rewardKey(n: number): number
  worldTabs(w: WorldId): string
  sell(): void
  adSellButton(): string
  wireAdSell(b: HTMLElement): void
  refresh(): void
}

/** Every fish and crab of a ground, for the nets and pots (no legends, no Den unge) */
const POOL_CACHE: Partial<Record<GroundId, Species[]>> = {}
const pool = (g: GroundId) => (POOL_CACHE[g] ??= VA_SPECIES.filter((sp) => sp.ground === g && !sp.legend && !sp.special))

/** Humpbacks Selma wants: the first four in order (her lines name them), then any of the rest */
const WHALES = ['domino', 'tromso', 'sagtann', 'arret', 'stjerne', 'blekk', 'halvmane', 'prikk', 'bolge', 'hvithale', 'kryss', 'mork']
const FLUKES = 4

/** When Knut phones with a tall tale: the rank it takes, in order */
const LEGEND_CALLS: [keyof typeof KNUT_LEGEND, number][] = [
  ['v_gamlegra', 3],
  ['v_kongen', 5],
  ['v_gullsjarken', 8],
  ['v_lavedora', 11],
  ['v_isdronninga', 16],
]

const RACE_RANK = [5, 9, 13]

/** Short names over the rooms in the house view, so two fit side by side on a phone */
const ROOM_LABEL: Record<HouseSpotId, string> = {
  tak: 'Soverommet',
  kjokken: 'Kjøkkenet',
  stue: 'Stua',
  gjest1: 'Gjesterom',
  verksted: 'Garnloftet',
  akvarium: 'Akvariet',
  royeri: 'Røykeriet',
  brygge: 'Brygga',
  gjest2: 'Loftsrom',
  badstue: 'Badstua',
  tarn: 'Nordlys',
  door: 'Ut',
}

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
/** A stretch of time in words, so it is not read as the time of day: «12 min», «40 s» */
const dur = (sec: number) => (sec >= 60 ? `${Math.ceil(sec / 60)} min` : `${Math.max(1, Math.ceil(sec))} s`)
const groundName = (g: GroundId) => VA_GROUNDS[g].name
/** The ground the way people on the quay say it, short enough for the HUD row on a phone */
const CHIP_NAME: Record<GroundId, string> = { sundet: 'Sundet', fjorden: 'Fjorden', banken: 'Banken', eggakanten: 'Egga' }
const atGround = (g: GroundId) => `${g === 'banken' || g === 'eggakanten' ? 'på' : 'i'} ${groundName(g)}`

export class Vardo {
  house: HouseScene
  mini: MiniGame | null = null
  private miniDone: ((r: unknown) => void) | null = null
  private miniFrom: View = 'sea'
  private input: MiniInput = { down: false, x: 0, y: 0, tap: false, release: false, swipe: 0 }
  private downAt = { x: 0, y: 0, t: 0 }
  private capWarned = new Set<string>()
  private rank = 0
  private bryggeT = 0
  /** Nets on deck in a running haul: Mikkel leaves them alone */
  private hauling = new Set<NetState>()
  /** Mikkel's hauls since his last word, told in one toast */
  private mikkelNews = { n: 0, t: 0 }
  hudKey = ''
  /** what Frida said when you came in, kept while you switch tabs */
  private fridaLine = ''

  constructor(private host: VaHost) {
    this.house = new HouseScene(host)
  }

  get s() {
    return this.host.s
  }

  get va(): VardoState | undefined {
    return this.s.va
  }

  /** True while you live in Vardø */
  get here() {
    return this.s.world === 'vardo' && !!this.s.va
  }

  private get ui() {
    return this.host.ui
  }

  private talk(lines: Line[]) {
    return this.ui.talk(lines)
  }

  private say(who: Line['who'], text: string) {
    return this.talk([{ who, text }])
  }

  /** XP for a story step, contract or haul; the rank-up toast comes from tick */
  private xp(n: number) {
    if (this.va) this.va.xp += Math.max(0, Math.round(n))
  }

  private get level() {
    return this.va ? rankLevel(this.va) : 0
  }

  /** Called on arrival and after a load in Vardø, so the tables match the save */
  enter() {
    const va = this.va
    if (!va) return
    setGround(va.ground)
    WORLDS.vardo.boat = boatOf(va).name
    this.rank = rankLevel(va)
    // flags a closed app could have missed between a save and the end of a scene
    const f = this.s.flags
    if (plantOpen(va)) f.va_plantOpen = true
    if (va.flukes.length >= FLUKES) f.va_flukesDone = true
  }

  // ---------- every frame ----------

  tick(dt: number) {
    const s = this.s
    const va = s.va
    // nothing earns in a hidden tab (the frame loop stops there anyway)
    if (!va || !this.host.started || document.hidden) return
    const night = nightness(s.time) > 0.5
    const out = tickPassive(va, dt, { night, aurora: auroraTonight(s.day ?? 0, s.time), pool })
    if (!this.here) return
    WORLDS.vardo.boat = boatOf(va).name

    // toasts once per event: a net or a string of pots filling, a till reaching its cap
    const mikkel = va.rooms.includes('brygge') && va.mikkel?.on !== false
    for (const i of out.netFull) if (!mikkel && va.nets[i]) this.ui.toast(`Garnet ${atGround(va.nets[i].ground)} er fullt. Dra det under Redskap.`, 'net')
    const potGrounds = new Set(out.potFull.map((i) => va.pots[i]?.ground).filter(Boolean) as GroundId[])
    for (const g of potGrounds) if (va.pots.filter((p) => p.ground === g).every((p) => p.crabs.length >= potCap(va))) this.ui.toast(`Teinene ${atGround(g)} er fulle.`, 'crab')
    const capped = new Set(out.cashCapped)
    for (const k of capped)
      if (!this.capWarned.has(k)) {
        this.capWarned.add(k)
        this.ui.toast(k === 'smoke' ? 'Røykeriet er fullt. Hent pengene i Signes hus.' : k === 'guests' ? 'Gjesteboka er full. Hent pengene i Signes hus.' : 'Fiskebruket er fullt. Hent andelen din hos Nadja.', 'coin')
      }
    for (const k of [...this.capWarned]) {
      const cash = k === 'smoke' ? va.smoke.cash : k === 'guests' ? va.guests.cash : k === 'mikkel' ? (va.mikkel?.cash ?? 0) : va.plant.cash
      const cap = k === 'smoke' ? smokeCashCap(va) : k === 'guests' ? guestCashCap(va) : k === 'mikkel' ? this.mikkelCap() : plantCashCap(va)
      if (cash < cap * 0.9) this.capWarned.delete(k)
    }

    // Mikkel hauls the full nets for you once you have your own jetty
    if (mikkel) {
      this.bryggeT += dt
      if (this.bryggeT > 4) {
        this.bryggeT = 0
        const full = va.nets.filter((n) => netFull(va, n) && !this.hauling.has(n))
        // like the other tills, the jetty fills up: Mikkel waits for you to collect before he hauls again
        const room = (va.mikkel?.cash ?? 0) < this.mikkelCap()
        if (full.length && !room && !this.capWarned.has('mikkel')) {
          this.capWarned.add('mikkel')
          this.ui.toast('Mikkel venter på brygga med pengene dine. Hent dem i Signes hus.', 'coin')
        }
        if (full.length && room) {
          const kr0 = Math.round(full.reduce((n, net) => n + net.fish.reduce((a, c) => a + c.value, 0), 0) * BRYGGE_SHARE)
          for (const n of full) {
            va.stats.netFish += n.fish.length
            n.fish = []
            n.t = 0
          }
          va.mikkel = { on: true, cash: (va.mikkel?.cash ?? 0) + kr0 }
          const m = this.mikkelNews
          if (!m.n) m.t = 0
          m.n += full.length
        }
      }
      // one word from Mikkel per round of hauls, not one per net
      const m = this.mikkelNews
      if (m.n && (m.t += dt) > 20) {
        this.ui.toast(`Mikkel dro ${m.n === 1 ? 'et garn' : `${m.n} garn`} for deg. Nå venter ${kr(Math.floor(va.mikkel?.cash ?? 0))} på brygga.`, 'net')
        this.mikkelNews = { n: 0, t: 0 }
      }
    }

    // the board fills up every morning once Brita has shown it to you
    if (s.flags.va_board) refreshOffers(va, s.day ?? 0, this.offerOpts())

    const c = va.contract
    if (c) {
      const paused = this.ui.busy || this.host.view === 'mini'
      contractTick(c, paused ? 0 : dt, s.day ?? 0)
      const fishing = this.host.view === 'sea' && ['reel', 'bite', 'land', 'snag'].includes(this.host.sea.mode)
      if ((c.done || c.failed) && !paused && !fishing) this.closeContract(c)
    }

    const r = rankLevel(va)
    if (this.rank && r > this.rank) {
      sfx.fanfare()
      this.ui.toast(`Rang ${r}: ${rankOf(va.xp).title}!`, 'star')
    }
    this.rank = r
  }

  /** What Mikkel keeps for you on the jetty before he stops hauling */
  private mikkelCap() {
    const va = this.va!
    return Math.max(10000, netSlots(va) * netCap(va) * 400)
  }

  private offerOpts() {
    const va = this.va!
    return { rank: rankLevel(va), grounds: groundsFor(va.boat), pool, flags: this.s.flags, line: gearValue(this.s, 'line'), ghostDepths: VA_GHOSTNET_DEPTHS, reach: (g: GroundId, z: number) => VA_GROUNDS[g].zones[z].from < gearValue(this.s, 'line') }
  }

  // ---------- phone calls ----------

  /** Calls that come in the next time you open a place: Knut after Lofoten, Selma's letter, Knut's tall tales */
  async calls() {
    const s = this.s
    const f = s.flags
    if (f.lo_ending && !f.va_call) {
      await this.talk(LO_HOME_CALL)
      f.va_call = true
      this.host.save()
      if (s.world !== 'norge') this.ui.toast('Bestefar vil at du kommer hjem til Skjærvik.', 'house')
      return
    }
    const va = this.va
    if (!this.here || !va) return
    if (va.rooms.includes('gjest1') && f.va_selmaLetter && !f.va_selma) return this.selmaArrives()
    if (!f.va_selmaLetter && va.boat >= 1 && this.level >= 6) {
      sfx.click()
      await this.talk(SELMA_LETTER)
      f.va_selmaLetter = true
      this.xp(30)
      this.host.save()
      return
    }
    for (const [id, rank] of LEGEND_CALLS) {
      if (f[`va_told_${id}`]) continue
      const rule = VA_LEGEND_RULES.find((r) => r.id === id)
      if (this.level < rank || (rule && VA_GROUNDS[rule.ground].boat > va.boat)) break
      await this.talk(KNUT_LEGEND[id])
      f[`va_told_${id}`] = true
      this.host.save()
      this.ui.toast('Fiskeboka har fått et nytt hint under Legender.', 'book')
      return
    }
  }

  // ---------- the harbour ----------

  placeName(id: SpotId) {
    const boat = this.va ? boatOf(this.va).name : 'Signe'
    return { krambua: 'Pomorbrygga', havnebua: 'Havnekontoret', stasjon: 'Signes hus', naust: 'Aslaks naust', fyret: 'Slippen', baten: boat }[id]
  }

  async openSpot(id: SpotId) {
    const s = this.s
    const f = s.flags
    const va = this.va!
    if (id === 'baten') return this.host.go('sea')
    if (id === 'krambua') {
      if (!f.va_metNadja) {
        await this.talk(MEET_NADJA)
        f.va_metNadja = true
        this.xp(5)
        this.host.save()
        return
      }
      if (f.va_pomorFound && va.pomor < NADJA_POMOR.length) {
        const i = va.pomor
        sfx.chest()
        await this.talk(NADJA_POMOR[i])
        va.pomor = i + 1
        f.va_pomorFound = false
        const prize = [1500, 4000, 12000][i]
        s.money += prize
        this.xp(80 + i * 60)
        this.host.save()
        this.ui.toast(i === 2 ? `Du fikk ${kr(prize)} og en samovar til stua!` : `Nadja ga deg ${kr(prize)} for funnet.`, 'coin')
        return
      }
      if (va.boat >= 2 && !f.va_plantTold) {
        await this.talk(NADJA_PLANT)
        f.va_plantTold = true
        this.xp(40)
        this.host.save()
      }
      return this.nadja()
    }
    if (id === 'havnebua') {
      if (!f.va_sold1) return this.say('brita', 'Selg litt fisk til Nadja på Pomorbrygga først. Så snakker vi.')
      if (!f.va_metBrita) {
        await this.talk(MEET_BRITA)
        f.va_metBrita = true
        this.xp(5)
        this.host.save()
      }
      if (this.level >= 2 && !f.va_board) {
        await this.talk(BRITA_BOARD)
        f.va_board = true
        refreshOffers(va, s.day ?? 0, this.offerOpts())
        this.host.save()
        return this.board()
      }
      if (f.va_crabSorted && !f.va_rules) {
        await this.talk(BRITA_RULES)
        f.va_rules = true
        this.xp(20)
        this.host.save()
      }
      if (va.fineDue) await this.settleFine(va.fineDue)
      return this.brita()
    }
    if (id === 'stasjon') {
      sfx.creak()
      if (!f.va_houseSeen) {
        await this.talk(VA_HOUSE)
        f.va_houseSeen = true
        this.xp(5)
        this.host.save()
        return
      }
      if (!va.rooms.includes('tak')) return this.talk([{ who: null, text: 'Det regner inn gjennom taket, og Pus sitter i solflekken sin. Frida på Slippen kan legge nytt tak.' }])
      if (f.va_unge && !f.va_ending) {
        await this.talk(VA_ENDING.slice(0, 5))
        f.va_ending = true
        sfx.fanfare()
        this.xp(300)
        this.host.save()
        await this.talk(VA_ENDING.slice(5))
        this.ui.toast('Brita har startet Vardø-derbyet på Havnekontoret.', 'trophy')
      }
      return this.host.go('house')
    }
    if (id === 'naust') return this.naust()
    if (id === 'fyret') return this.slippen()
  }

  /** The crabs that should have gone back: a fine you cannot pay in full is not forgiven silently */
  private async settleFine(due: { n: number; kr: number }) {
    const s = this.s
    const va = this.va!
    const paid = Math.min(s.money, due.kr)
    s.money -= paid
    va.fines += due.n
    va.fineDue = undefined
    this.host.save()
    sfx.coin()
    await this.talk([
      { who: null, text: `Brita har gått gjennom kassene dine på kaia. Hun legger ${due.n === 1 ? 'én krabbe' : `${['to', 'tre', 'fire', 'fem'][due.n - 2] ?? due.n} krabber`} på disken.` },
      { who: 'brita', text: pick(BRITA_FINE) },
      { who: null, text: `Brita skriver en bot på ${kr(due.kr)}.` },
      ...(paid < due.kr
        ? [{ who: 'brita' as const, text: paid ? `Du har bare ${kr(paid)}. Jeg tar det og stryker resten. Denne gangen.` : 'Du har ikke en krone. Jeg stryker boten. Denne gangen.' }]
        : []),
    ])
    this.host.refresh()
  }

  /** Places in Vardø with something new waiting */
  badges(): SpotId[] {
    const s = this.s
    const f = s.flags
    const va = this.va
    if (!va) return []
    const out: SpotId[] = []
    const r = this.level
    if (s.derby?.done && s.derby.world === 'vardo') out.push('havnebua')
    const plantNext = f.va_plantTold && !plantOpen(va) && this.plantReady()
    if (!f.va_metNadja || (s.bucket.length && !f.va_sold1) || f.va_pomorFound || (va.boat >= 2 && !f.va_plantTold) || plantNext || va.plant.cash >= plantCashCap(va) * 0.5) out.push('krambua')
    const contractDone = !!va.contract && (va.contract.done || va.contract.failed)
    if ((f.va_sold1 && !f.va_metBrita) || (r >= 2 && !f.va_board) || (f.va_crabSorted && !f.va_rules) || va.fineDue || this.host.bookClaimable() || contractDone) out.push('havnebua')
    if (!f.va_houseSeen || (f.va_unge && !f.va_ending) || this.houseCash()) out.push('stasjon')
    if (va.rooms.includes('tak') && (!f.va_metAslak || (f.va_netHauled && !f.va_netDone) || (va.boat >= 1 && !f.va_crab) || (f.va_flukesDone && va.boat >= 2 && !f.va_joik) || (va.rooms.includes('verksted') && !f.va_elleNet))) out.push('naust')
    if (
      (f.va_houseSeen && !f.va_metFrida) ||
      (f.va_metFrida && !va.rooms.includes('tak')) ||
      (r >= 4 && !f.va_fridaSjark) ||
      (r >= 10 && va.boat >= 1 && !f.va_fridaKyst) ||
      (r >= 16 && f.va_joik && va.boat >= 2 && !f.va_fridaHav) ||
      (f.va_selmaLetter && !va.rooms.includes('gjest1'))
    )
      out.push('fyret')
    return out
  }

  /** Money waiting somewhere in the house */
  private houseCash() {
    const va = this.va
    if (!va) return false
    return va.guests.cash >= 100 || va.smoke.cash > 0 || (va.mikkel?.cash ?? 0) > 0
  }

  private plantReady() {
    const va = this.va!
    const st = PLANT_STAGES[va.plant.stage]
    if (!st) return false
    if (st.deliver) return Object.entries(plantMissing(va)).some(([id]) => [...this.s.bucket, ...va.hold].some((c) => c.id === id))
    return canBuy(va, this.s.money, st.price, st.rank, undefined, this.s.flags).ok && va.boat >= 2
  }

  /** One line on what to do next in Vardø */
  goal(): string {
    const s = this.s
    const f = s.flags
    const va = this.va!
    const r = this.level
    const rk = rankOf(va.xp)
    const toRank = (n: number, why: string) => `${why}. Du har rang ${r} og trenger ${n} (${rk.into}/${rk.need} XP til neste).`
    if (!f.va_metNadja) return 'Gå til Nadja på Pomorbrygga.'
    if (!f.va_sold1) return 'Fang en fisk i Bussesundet og selg den til Nadja.'
    if (!f.va_metBrita) return 'Hils på Brita på Havnekontoret.'
    if (!f.va_houseSeen) return 'Gå og se på Signes hus.'
    if (!f.va_metFrida) return 'Snakk med Frida på Slippen.'
    if (!va.rooms.includes('tak')) return `Kjøp nytt tak hos Frida på Slippen (${kr(VA_ROOMS.tak.price)}).`
    if (!f.va_metAslak) return 'Hils på Aslak i naustet.'
    if (!f.va_netSet) return 'Ro ut i Bussesundet og sett Elles garn under Redskap.'
    if (!f.va_netHauled) return 'Fisk mens garnet fyller seg. Dra det under Redskap når det har fått noen fisk.'
    if (!f.va_netDone) return 'Fortell Aslak i naustet om fangsten.'
    if (r < 2) return toRank(2, 'Fisk og dra garn til du får rang 2')
    if (!f.va_board) return 'Brita har noe å vise deg på Havnekontoret.'
    if (va.boat < 1 && r < 4) return toRank(4, 'Ta kontrakter hos Brita og fisk til rang 4. Frida bygger noe')
    if (!f.va_fridaSjark) return 'Frida har noe å vise deg på Slippen.'
    if (va.boat < 1) return `Kjøp sjarken hos Frida (${kr(VA_BOATS[1].price)}).`
    if (!f.va_crab) return 'Aslak har teiner til deg i naustet.'
    if (!f.va_crabSorted) return 'Sett teinene i Varangerfjorden under Redskap, og dra dem når de er fulle.'
    if (!f.va_rules) return 'Brita vil snakke med deg om krabbene.'
    if (va.fineDue) return 'Brita venter på Havnekontoret. Det var krabber i kassa som skulle vært sluppet ut.'
    if (r < 6) return toRank(6, 'Fisk, dra garn og ta kontrakter')
    if (!f.va_selmaLetter) return 'Telefonen ringer. Trykk på et sted på kaia.'
    if (!va.rooms.includes('gjest1')) return `Bygg gjesterommet hos Frida, så Selma har et sted å bo (${kr(VA_ROOMS.gjest1.price)}).`
    if (va.flukes.length < FLUKES) return `Ta bilde av hvalhaler for Selma (${va.flukes.length}/${FLUKES}). Se etter hvaler som dykker.`
    if (va.boat < 2 && r < 10) return toRank(10, 'Frida har en kystbåt på gang')
    if (!f.va_fridaKyst) return 'Frida har noe nytt på Slippen.'
    if (va.boat < 2) return `Kjøp kystbåten hos Frida (${kr(VA_BOATS[2].price)}).`
    if (!f.va_plantTold) return 'Nadja vil vise deg noe på Pomorbrygga.'
    if (!f.va_joik) return 'Aslak vil snakke med deg i naustet.'
    if (va.boat < 3 && r < 16) return toRank(16, 'Frida trenger tid til den store båten. Hjelp Nadja med fiskebruket imens')
    if (!f.va_fridaHav) return 'Frida har noe stort på Slippen.'
    if (va.boat < 3) return `Kjøp havfiskebåten hos Frida (${kr(VA_BOATS[3].price)}).`
    if (!f.va_unge) return 'Dra ut til Eggakanten om natta, og ligg stille ved overflaten.'
    if (!f.va_ending) return 'Gå hjem til Signes hus. Alle venter.'
    return 'Ta kontrakter, bygg ut huset og finn legendene.'
  }

  // ---------- Pomorbrygga (Nadja) ----------

  private holdValue() {
    return this.va ? this.va.hold.reduce((n, c) => n + c.value, 0) : 0
  }

  /** The box and the hold together, for selling */
  saleValue() {
    return bucketValue(this.s) + this.holdValue()
  }

  nadja() {
    const s = this.s
    const f = s.flags
    const va = this.va!
    const n = s.bucket.length + va.hold.length
    const greet = n ? `Det ser ut som du har ${n} fisk til meg!` : f.va_ending ? pick(AFTER_VA_ENDING) : pick(VA_CHATTER.nadja)
    const plant = f.va_plantTold ? this.plantRows() : ''
    const b = this.ui.sheet(
      'Pomorbrygga',
      `${this.host.placeHead('nadja', greet)}<div class="stack">
        ${plant}
        <button class="btn green" data-a="sell" ${n ? '' : 'disabled'}>${iconImg('coin')}Selg fangsten<span class="right">${kr(this.saleValue())}</span></button>
        ${this.host.adSellButton()}
        ${va.hold.length ? `<p class="muted">Kassa: ${s.bucket.length} fisk. Lasterommet: ${va.hold.length} fisk.</p>` : ''}
        <button class="btn" data-a="gear">${iconImg('gear')}Utstyr</button>
        <button class="btn plain" data-a="paint">${iconImg('sea')}Båtmaling</button>
      </div>`,
    )
    b.querySelector<HTMLElement>('[data-a=sell]')!.onclick = () => this.host.sell()
    this.host.wireAdSell(b)
    b.querySelector<HTMLElement>('[data-a=gear]')!.onclick = () => this.host.openShop('gear')
    b.querySelector<HTMLElement>('[data-a=paint]')!.onclick = () => this.host.openShop('paint')
    this.wirePlant(b)
  }

  private plantRows() {
    const va = this.va!
    const s = this.s
    if (plantOpen(va)) {
      return `<p><b>Fiskebruket</b>: ${kr(Math.floor(va.plant.cash))} av ${kr(plantCashCap(va))} venter. ${kr(Math.round(plantRate(va)))} i minuttet.</p>
        <button class="btn green" data-a="plantCash" ${va.plant.cash >= 1 ? '' : 'disabled'}>${iconImg('coin')}Hent andelen fra bruket</button>
        <button class="btn" data-a="plantUp">${iconImg('hammer')}Bygg ut fiskebruket</button>`
    }
    const st = PLANT_STAGES[va.plant.stage]
    if (!st) return ''
    const step = `<p><b>Fiskebruket, steg ${va.plant.stage + 1} av ${PLANT_STAGES.length}: ${esc(st.title)}</b><br><small>${esc(st.text)}</small></p>`
    if (st.deliver) {
      const miss = plantMissing(va)
      const list = Object.entries(miss)
        .map(([id, n]) => `${n} ${esc((SPECIES_BY_ID[id]?.name ?? id).toLowerCase())}`)
        .join(', ')
      const have = [...s.bucket, ...va.hold].some((c) => miss[c.id])
      return `${step}<p class="muted">Mangler: ${list}.</p><button class="btn green" data-a="plantFish" ${have ? '' : 'disabled'}>${iconImg('fish')}Lever fisk til bruket</button>`
    }
    const b = va.boat < 2 ? { ok: false, why: 'Krever kystbåt' } : canBuy(va, s.money, st.price, st.rank, undefined, s.flags)
    return `${step}<button class="btn green" data-a="plantPay" ${b.ok ? '' : 'disabled'}>${iconImg('hammer')}${esc(st.title)}<span class="right">${b.ok ? kr(st.price) : esc(b.why)}</span></button>`
  }

  private wirePlant(b: HTMLElement) {
    const s = this.s
    const va = this.va!
    const on = (a: string, fn: () => void) => {
      const el = b.querySelector<HTMLElement>(`[data-a=${a}]`)
      if (el) el.onclick = fn
    }
    on('plantCash', () => {
      const got = collect(va, 'plant')
      s.money += got
      sfx.coin()
      this.ui.toast(`Du hentet ${kr(got)} fra fiskebruket.`, 'coin')
      this.host.save()
      this.nadja()
    })
    on('plantUp', () => this.tracksSheet('Fiskebruket', 'nadja', 'Folk, kjøl og transport. Jo mer bruket får, jo mer tjener byen. Og du.', ['plantStaff', 'plantCold', 'plantTruck'], () => this.nadja()))
    on('plantFish', async () => {
      const stage = va.plant.stage
      const fromBox = plantDeliver(va, s.bucket)
      s.bucket = s.bucket.filter((c) => !fromBox.includes(c))
      if (va.plant.stage === stage) {
        const fromHold = plantDeliver(va, va.hold)
        va.hold = va.hold.filter((c) => !fromHold.includes(c))
        fromBox.push(...fromHold)
      }
      sfx.coin()
      this.ui.toast(`Du leverte ${fromBox.length} fisk til fiskebruket.`, 'fish')
      this.host.save()
      if (va.plant.stage > stage) await this.plantStep(stage)
      else this.nadja()
    })
    on('plantPay', async () => {
      const stage = va.plant.stage
      const r = plantAdvance(va, s.money, s.flags)
      if (!r.ok) return
      s.money -= r.cost
      this.host.save()
      await this.plantStep(stage)
    })
  }

  private async plantStep(stage: number) {
    const s = this.s
    this.ui.closeSheet()
    sfx.fanfare()
    await this.talk(NADJA_PLANT_STAGE[stage] ?? [])
    this.xp(120 + stage * 60)
    if (plantOpen(this.va!)) {
      s.flags.va_plantOpen = true
      this.ui.toast('Fiskebruket er åpent! Hent andelen din hos Nadja.', 'coin')
    }
    this.host.save()
  }

  // ---------- Havnekontoret (Brita) ----------

  brita() {
    const s = this.s
    const f = s.flags
    const va = this.va!
    const d = s.derby && s.derby.world === 'vardo' ? s.derby : null
    const done = this.host.chapterDone()
    const can = done && !d && (s.derbyDay?.vardo ?? -1) !== s.day
    const derby = d
      ? d.done
        ? `<button class="btn green" data-a="prize">${iconImg('trophy')}Premieutdeling</button>`
        : '<p class="muted">Derbyet er i gang. Ut og fisk!</p>'
      : can
        ? `<button class="btn green" data-a="derby">${iconImg('trophy')}Bli med i Vardø-derbyet</button>`
        : done
          ? '<p class="muted">Neste derby er i morgen.</p>'
          : ''
    const reward = this.host.bookClaimable()
    const c = va.contract
    const board = f.va_board
      ? `<button class="btn" data-a="board">${iconImg('key')}Kontrakttavla<span class="right">${c ? (c.done ? 'Ferdig!' : 'Aktiv') : `${va.offers.length} ledige`}</span></button>`
      : `<p class="muted">Kontrakttavla ved døra åpner når du har rang 2.</p>`
    const claim = this.host.claimable()
    const b = this.ui.sheet(
      'Havnekontoret',
      `${this.host.placeHead('brita', pick(VA_CHATTER.brita))}<div class="stack">
        ${derby}
        ${reward ? `<button class="btn green" data-a="book">${iconImg('book')}Fiskeboka: hent ${esc(reward.text)}</button>` : ''}
        <button class="btn" data-a="q">${iconImg('scroll')}Oppdrag${claim ? `<span class="right">${claim} klar</span>` : ''}</button>
        ${board}
        <button class="btn plain" data-a="ticket">${iconImg('anchor')}Hurtigruten</button>
      </div>
      <p class="muted" style="margin-top:10px">Fiskeboka: ${bookCount(s)} av ${VA_BOOK.length} arter.${this.nextReward()}</p>`,
    )
    b.querySelector<HTMLElement>('[data-a=q]')!.onclick = () => this.host.openQuests()
    b.querySelector<HTMLElement>('[data-a=ticket]')!.onclick = () => this.host.openTravel()
    const bd = b.querySelector<HTMLElement>('[data-a=board]')
    if (bd) bd.onclick = () => this.board()
    const st = b.querySelector<HTMLElement>('[data-a=derby]')
    if (st) st.onclick = () => this.host.startDerby()
    const pr = b.querySelector<HTMLElement>('[data-a=prize]')
    if (pr) pr.onclick = () => this.host.derbyPrizes()
    const bk = b.querySelector<HTMLElement>('[data-a=book]')
    if (bk && reward)
      bk.onclick = () => {
        s.bookClaimed.push(this.host.rewardKey(reward.n))
        if (reward.money) s.money += reward.money
        if (reward.gift) s.gear[reward.gift[0]] = Math.max(s.gear[reward.gift[0]], reward.gift[1])
        if (reward.flag) s.flags[reward.flag] = true
        sfx.fanfare()
        this.ui.toast(`Du fikk: ${reward.text}`, 'book')
        this.host.save()
        this.brita()
      }
  }

  private nextReward() {
    const next = WORLDS.vardo.rewards.find((r) => !this.s.bookClaimed.includes(this.host.rewardKey(r.n)))
    return next && !this.host.bookClaimable() ? ` Ved ${next.n}: ${esc(next.text)}.` : ''
  }

  /** The contract board by the door: the job you have and three new ones every day */
  board() {
    const s = this.s
    const va = this.va!
    refreshOffers(va, s.day ?? 0, this.offerOpts())
    const c = va.contract
    const active = c
      ? `<div class="row"><div class="info"><b>${esc(c.title)}</b><small>${esc(c.text)}</small>
          <div class="progress"><i style="width:${Math.min(100, (c.progress / contractTarget(c)) * 100)}%"></i></div>
          <small>${this.progressText(c)}</small></div></div>
        <div class="stack">
          ${(c.kind === 'tour' || c.kind === 'race') && !c.done && !c.failed ? `<button class="btn green" data-a="go">${iconImg(c.kind === 'tour' ? 'camera' : 'boat')}${c.kind === 'tour' ? 'Dra på fugletur' : 'Til start'}</button>` : ''}
          <button class="btn plain" data-a="drop">Gi opp kontrakten</button>
        </div>`
      : ''
    const offers = va.offers.length
      ? va.offers
          .map(
            (o) => `<div class="row"><div class="info"><b>${esc(o.title)}</b><small>${esc(o.text)}</small>
              <small>${kr(o.money)} · ${o.xp} XP${o.limit ? ` · ${dur(o.limit)}` : ''}</small></div>
              <button class="btn" data-take="${o.id}" ${c ? 'disabled' : ''}>Ta</button></div>`,
          )
          .join('')
      : '<p class="muted">Tavla er tom. Nye kontrakter kommer i morgen tidlig.</p>'
    const b = this.ui.sheet(
      'Kontrakttavla',
      `${this.host.placeHead('brita', c ? 'Gjør ferdig den du har, så snakker vi om neste.' : 'Én om gangen. Gjør den du tar.')}
      ${active}
      ${c ? '<p class="cat">Neste gang</p>' : ''}${offers}
      <p class="muted" style="margin-top:10px">Fullført: ${va.contractsDone}.${va.streak > 1 ? ` ${va.streak} på rad gir ${Math.min(5, va.streak) * 10} % ekstra.` : ''}</p>
      <div class="stack" style="margin-top:8px"><button class="btn plain" data-a="back">Tilbake</button></div>`,
    )
    b.querySelectorAll<HTMLElement>('[data-take]').forEach(
      (el) =>
        (el.onclick = () => {
          const t = takeOffer(va, el.dataset.take!, s.day ?? 0)
          if (!t) return
          if (t.kind === 'ghostnet' && t.ground && !t.depth) {
            // an offer from an older save: pick a depth the line reaches now
            const ds = VA_GHOSTNET_DEPTHS[t.ground]
            const reach = ds.filter((d) => d <= gearValue(s, 'line') - 5)
            t.depth = reach.length ? pick(reach) : ds[0]
            t.text += ` Det henger fast rundt ${t.depth} meter nede.`
          }
          sfx.click()
          this.ui.toast(`Kontrakt: ${t.title}`, 'key')
          this.host.save()
          this.host.refresh()
          this.board()
        }),
    )
    b.querySelector<HTMLElement>('[data-a=back]')!.onclick = () => this.brita()
    const drop = b.querySelector<HTMLElement>('[data-a=drop]')
    if (drop && c)
      drop.onclick = () => {
        c.failed = true
        this.ui.closeSheet()
      }
    const go = b.querySelector<HTMLElement>('[data-a=go]')
    if (go && c) go.onclick = () => (c.kind === 'tour' ? this.tour(c) : this.raceContract(c))
  }

  private progressText(c: ActiveContract) {
    const t = contractTarget(c)
    const p = c.kind === 'deliver' ? `${kr(c.progress)} av ${kr(t)}` : c.kind === 'heavy' || c.kind === 'ghostnet' || c.kind === 'tour' || c.kind === 'race' ? (c.done ? 'Klart' : 'Ikke ennå') : `${c.progress} av ${t}`
    const when = c.left !== undefined ? ` · ${clock(c.left)} igjen` : c.dueDay !== undefined ? (c.dueDay > (this.s.day ?? 0) ? ' · frist i morgen' : ' · frist i dag') : ''
    return `${p}${when}`
  }

  /** A finished or failed contract is paid out or struck off, with a word from whoever asked */
  private closeContract(c: ActiveContract) {
    const va = this.va!
    const ok = c.done
    const r = finishContract(va, c)
    // away from the quay the word comes over the radio
    const v = this.host.view
    const radio: Line[] = v === 'harbor' || (v === 'house' && c.who === 'selma') ? [] : [{ who: null, text: v === 'house' ? `Telefonen ringer. Det er ${NAMES[c.who]}.` : `VHF-en knitrer. Det er ${NAMES[c.who]}.` }]
    if (ok) {
      this.s.money += r.money
      sfx.fanfare()
      this.talk([
        ...radio,
        { who: c.who, text: pick(VA_CONTRACT_DONE[c.who]) },
        { who: null, text: `Du fikk ${kr(r.money)} og ${r.xp} XP.${r.streak > 1 ? ` ${r.streak} kontrakter på rad.` : ''}` },
      ])
    } else {
      sfx.lose()
      this.talk([...radio, { who: c.who, text: pick(VA_CONTRACT_FAIL[c.who]) }])
    }
    this.host.save()
    this.host.refresh()
  }

  // ---------- Aslaks naust ----------

  private async naust() {
    const s = this.s
    const f = s.flags
    const va = this.va!
    sfx.creak()
    if (!va.rooms.includes('tak')) return this.talk([{ who: null, text: 'Naustet er låst. På døra henger en lapp: «Ute med garna. Kom tilbake når du har tak over hodet. Aslak.»' }])
    if (!f.va_metAslak) {
      await this.talk(MEET_ASLAK)
      f.va_metAslak = true
      va.netsOwned = Math.max(va.netsOwned, 1)
      this.xp(5)
      this.host.save()
      this.ui.toast('Du fikk Elles garn!', 'net')
      return
    }
    if (f.va_netHauled && !f.va_netDone) {
      await this.talk(ASLAK_NET_DONE)
      f.va_netDone = true
      this.xp(10)
      this.host.save()
    } else if (va.boat >= 1 && !f.va_crab) {
      await this.talk(ASLAK_CRAB)
      f.va_crab = true
      va.potsOwned = Math.max(va.potsOwned, 2)
      this.xp(30)
      this.host.save()
      this.ui.toast('Du fikk to teiner!', 'crab')
      return
    } else if (f.va_flukesDone && va.boat >= 2 && !f.va_joik) {
      sfx.song()
      await this.talk(ASLAK_JOIK)
      f.va_joik = true
      this.xp(150)
      this.host.save()
      return
    } else if (va.rooms.includes('verksted') && !f.va_elleNet) {
      await this.talk(ASLAK_ELLE_NET)
      f.va_elleNet = true
      va.up.netMesh = VA_TRACKS.netMesh.levels.length - 1
      sfx.fanfare()
      this.xp(80)
      this.host.save()
      this.ui.toast('Du fikk Elles beste garn!', 'net')
      return
    }
    this.aslak()
  }

  /** Aslak's nets and pots: more of them, and better */
  aslak(back?: () => void) {
    const s = this.s
    const f = s.flags
    const va = this.va!
    const netBuy = buyNet({ ...va, up: { ...va.up } }, s.money, f)
    const netNext = NET_PRICES[va.netsOwned]
    const nets = `<p class="cat">Garn: ${va.netsOwned} av ${netSlots(va)} plasser på dekk</p>
      ${
        netNext !== undefined && f.va_netHauled
          ? `<div class="row"><div class="info"><b>Ett garn til</b><small>${netBuy.ok ? 'Aslak har knyttet et nytt.' : esc(netBuy.why)}</small></div><button class="btn" data-a="net" ${netBuy.ok ? '' : 'disabled'}>${kr(netNext)}</button></div>`
          : ''
      }
      ${f.va_netHauled ? (['netLen', 'netMesh', 'netFloat'] as TrackId[]).map((t) => this.trackRow(t)).join('') : '<p class="muted">Dra det første garnet ditt, så kan Aslak gjøre det bedre.</p>'}`
    const potBuy = buyPot({ ...va }, s.money, f)
    const pots = f.va_crab
      ? `<p class="cat">Teiner: ${va.potsOwned} av ${potSlots(va)} plasser på dekk</p>
        <div class="row"><div class="info"><b>En teine til</b><small>${potBuy.ok ? 'Rustfri og klar.' : esc(potBuy.why)}</small></div><button class="btn" data-a="pot" ${potBuy.ok ? '' : 'disabled'}>${kr(POT_PRICE(va.potsOwned))}</button></div>
        ${(['potType', 'potBait'] as TrackId[]).map((t) => this.trackRow(t)).join('')}`
      : ''
    const b = this.ui.sheet(
      'Aslaks naust',
      `${this.host.placeHead('aslak', pick(VA_CHATTER.aslak))}${nets}${pots}
      ${!va.rooms.includes('verksted') ? '<p class="muted">De beste nivåene trenger et garnloft i Signes hus.</p>' : ''}
      ${back ? '<div class="stack" style="margin-top:10px"><button class="btn plain" data-a="back">Tilbake</button></div>' : ''}`,
    )
    const nb = b.querySelector<HTMLElement>('[data-a=net]')
    if (nb)
      nb.onclick = () => {
        const r = buyNet(va, s.money, f)
        if (!r.ok) return
        s.money -= r.cost
        sfx.coin()
        this.ui.toast('Du kjøpte et garn til!', 'net')
        this.host.save()
        this.aslak(back)
      }
    const pb = b.querySelector<HTMLElement>('[data-a=pot]')
    if (pb)
      pb.onclick = () => {
        const r = buyPot(va, s.money, f)
        if (!r.ok) return
        s.money -= r.cost
        sfx.coin()
        this.ui.toast('Du kjøpte en teine til!', 'crab')
        this.host.save()
        this.aslak(back)
      }
    this.wireTracks(b, () => this.aslak(back))
    const bk = b.querySelector<HTMLElement>('[data-a=back]')
    if (bk && back) bk.onclick = back
  }

  /** One upgrade track: where you are, what comes next and the button for it */
  private trackRow(t: TrackId) {
    const va = this.va!
    const tr = VA_TRACKS[t]
    const cur = lvl(va, t)
    const now = tr.levels[Math.min(cur, tr.levels.length - 1)]
    const next = nextLevel(va, t)
    const pips = `<span class="lvl">${tr.levels.map((_, i) => `<i class="${i <= cur ? 'on' : ''}"></i>`).join('')}</span>`
    const b = canBuyTrack(va, t, this.s.money, this.s.flags)
    const sub = next ? `Neste: ${next.name}. ${next.text}${b.ok || b.why.startsWith('Koster') ? '' : ` ${b.why}.`}` : now.text
    const right = next ? `<button class="btn" data-track="${t}" ${b.ok ? '' : 'disabled'}>${kr(next.price)}</button>` : '<span class="muted">Maks</span>'
    return `<div class="row"><div class="info"><b>${esc(tr.title)}: ${esc(now.name)}${pips}</b><small>${esc(sub)}</small></div>${right}</div>`
  }

  private wireTracks(b: HTMLElement, again: () => void) {
    const s = this.s
    b.querySelectorAll<HTMLElement>('[data-track]').forEach(
      (el) =>
        (el.onclick = () => {
          const t = el.dataset.track as TrackId
          const r = buyTrack(this.va!, t, s.money, s.flags)
          if (!r.ok) return
          s.money -= r.cost
          sfx.coin()
          this.xp(10)
          this.ui.toast(`${VA_TRACKS[t].title}: ${VA_TRACKS[t].levels[lvl(this.va!, t)].name}!`, 'hammer')
          this.host.save()
          again()
        }),
    )
  }

  private tracksSheet(title: string, who: string, line: string, tracks: TrackId[], back: () => void) {
    const b = this.ui.sheet(title, `${this.host.placeHead(who, line)}${tracks.map((t) => this.trackRow(t)).join('')}<div class="stack" style="margin-top:10px"><button class="btn plain" data-a="back">Tilbake</button></div>`)
    this.wireTracks(b, () => this.tracksSheet(title, who, line, tracks, back))
    b.querySelector<HTMLElement>('[data-a=back]')!.onclick = back
  }

  // ---------- Slippen (Frida) ----------

  private async slippen() {
    const s = this.s
    const f = s.flags
    const va = this.va!
    const r = this.level
    if (!f.va_metFrida) {
      await this.talk(MEET_FRIDA)
      f.va_metFrida = true
      this.xp(5)
      this.host.save()
    } else if (r >= 4 && !f.va_fridaSjark) {
      await this.talk(FRIDA_SJARK)
      f.va_fridaSjark = true
      this.host.save()
    } else if (r >= 10 && va.boat >= 1 && !f.va_fridaKyst) {
      await this.talk(FRIDA_KYST)
      f.va_fridaKyst = true
      this.host.save()
    } else if (r >= 16 && f.va_joik && va.boat >= 2 && !f.va_fridaHav) {
      await this.talk(FRIDA_HAV)
      f.va_fridaHav = true
      this.host.save()
    }
    this.frida()
  }

  /** Rooms for the house, boats and the regatta, one tab each; opens on whatever you can do next */
  frida(tab?: 'bat' | 'hus' | 'regatta') {
    const s = this.s
    const f = s.flags
    const va = this.va!
    const offered = [true, !!f.va_fridaSjark, !!f.va_fridaKyst, !!f.va_fridaHav]
    const next = VA_BOATS.find((bt) => bt.tier === va.boat + 1 && offered[bt.tier])
    const nb = next && canBuy(va, s.money, next.price, next.rank, next.needs, f, next.needsText)
    const cur = boatOf(va)
    const boats = `<div class="row"><div class="info"><b>${esc(cur.name)} · ${esc(cur.type)}</b><small>${esc(cur.text)}</small></div><span class="stamp gold">DIN</span></div>${
      next && nb
        ? `<div class="row"><div class="info"><b>${esc(next.name)} · ${esc(next.type)}</b><small>${esc(next.text)}${nb.ok || nb.why.startsWith('Koster') ? '' : ` ${esc(nb.why)}.`}</small></div><button class="btn" data-boat="${next.tier}" ${nb.ok ? '' : 'disabled'}>${kr(next.price)}</button></div>`
        : `<p class="muted">${va.boat >= VA_BOATS.length - 1 ? 'Du har den største båten Frida bygger.' : 'Frida har ikke noe nytt på slippen ennå.'}</p>`
    }`
    // rooms you can build now first, then the rest, and the finished ones on a single line
    const open = ROOM_ORDER.filter((id) => !va.rooms.includes(id)).map((id) => ({ id, b: this.roomCheck(id) }))
    open.sort((a, b) => Number(b.b.ok) - Number(a.b.ok))
    const done = ROOM_ORDER.filter((id) => va.rooms.includes(id))
    const rooms = `${open
      .map(({ id, b }) => {
        const rm = VA_ROOMS[id]
        return `<div class="row"><div class="info"><b>${esc(rm.name)}</b><small>${esc(rm.text)}${b.ok || b.why.startsWith('Koster') ? '' : ` ${esc(b.why)}.`}</small></div><button class="btn" data-room="${id}" ${b.ok ? '' : 'disabled'}>${kr(rm.price)}</button></div>`
      })
      .join('')}${done.length ? `<p class="muted" style="margin-top:10px"><b>Ferdig (${done.length} av ${ROOM_ORDER.length}):</b> ${done.map((id) => esc(VA_ROOMS[id].name)).join(', ')}.</p>` : ''}`
    const ri = va.races
    const raceOk = ri < FRIDA_RACE.length && this.level >= RACE_RANK[ri]
    const raceShown = f.va_metFrida && this.level >= RACE_RANK[0] - 1
    const race =
      ri < FRIDA_RACE.length
        ? `<div class="row"><div class="info"><b>Regatta ${ri + 1} av ${FRIDA_RACE.length}</b><small>${raceOk ? 'Frida har et startnummer til deg.' : `Krever rang ${RACE_RANK[ri]}.`}</small></div><button class="btn" data-a="race" ${raceOk ? '' : 'disabled'}>Start</button></div>`
        : '<p class="muted">Du har vunnet alle tre regattaene.</p>'
    const roomOk = open.some((o) => o.b.ok)
    const pick0 = tab ?? (nb?.ok ? 'bat' : roomOk ? 'hus' : raceOk ? 'regatta' : 'hus')
    const tabs: ['bat' | 'hus' | 'regatta', string, boolean][] = [
      ['hus', 'Huset', roomOk],
      ['bat', 'Båter', !!nb?.ok],
      ...(raceShown ? [['regatta', 'Regatta', raceOk] as ['regatta', string, boolean]] : []),
    ]
    const b = this.ui.sheet(
      'Slippen',
      `${this.host.placeHead('frida', tab && this.fridaLine ? this.fridaLine : (this.fridaLine = pick(VA_CHATTER.frida)))}
      <div class="tabs3">${tabs.map(([id, name, bad]) => `<button class="btn ${id === pick0 ? '' : 'plain'}" data-tab="${id}">${name}${bad && id !== pick0 ? '<span class="badge">!</span>' : ''}</button>`).join('')}</div>
      ${pick0 === 'hus' ? rooms : pick0 === 'bat' ? boats : race}`,
    )
    b.querySelectorAll<HTMLElement>('[data-tab]').forEach((el) => (el.onclick = () => (sfx.click(), this.frida(el.dataset.tab as 'bat' | 'hus' | 'regatta'))))
    b.querySelectorAll<HTMLElement>('[data-room]').forEach((el) => (el.onclick = () => this.buildRoom(el.dataset.room as RoomId)))
    b.querySelectorAll<HTMLElement>('[data-boat]').forEach((el) => (el.onclick = () => this.buyBoat(Number(el.dataset.boat))))
    const rb = b.querySelector<HTMLElement>('[data-a=race]')
    if (rb) rb.onclick = () => this.regatta()
  }

  /** Whether Frida can build a room now, without building it */
  private roomCheck(id: RoomId) {
    const va = this.va!
    const rm = VA_ROOMS[id]
    if (id !== 'tak' && !va.rooms.includes('tak')) return { ok: false, why: 'Fiks taket først', cost: rm.price }
    return canBuy(va, this.s.money, rm.price, rm.rank, rm.needs, this.s.flags, rm.needsText)
  }

  private async buildRoom(id: RoomId) {
    const s = this.s
    const va = this.va!
    const r = buyRoom(va, id, s.money, s.flags)
    if (!r.ok) return
    s.money -= r.cost
    this.ui.closeSheet()
    sfx.fanfare()
    this.xp(id === 'tak' ? 10 : 60)
    if (id === 'brygge') va.mikkel = { on: true, cash: va.mikkel?.cash ?? 0 }
    this.host.save()
    this.host.refresh()
    await this.talk(id === 'tak' ? VA_ROOF_DONE : VA_ROOM_DONE[id])
    if (id === 'gjest1' && !s.flags.va_selma) await this.selmaArrives()
    if (id === 'tak') this.ui.toast('Trykk på Signes hus for å gå inn.', 'house')
  }

  private async selmaArrives() {
    const s = this.s
    await this.talk(SELMA_ARRIVES)
    s.flags.va_selma = true
    this.xp(40)
    this.host.save()
    this.ui.toast('Se etter hvaler som dykker ute på sjøen.', 'camera')
  }

  private async buyBoat(tier: number) {
    const s = this.s
    const va = this.va!
    const r = buyBoat(va, tier, s.money, s.flags)
    if (!r.ok) return
    s.money -= r.cost
    s.flags[`va_boat${tier}`] = true
    WORLDS.vardo.boat = boatOf(va).name
    this.ui.closeSheet()
    sfx.fanfare()
    this.xp(100 * tier)
    this.host.save()
    this.host.refresh()
    if (tier === 1) await this.talk(VA_SJARK)
    else if (tier === 2) await this.talk([{ who: null, text: 'Varanger glir ned slippen med et dypt plask. Tiddlybanken er åpen for deg nå. Ute på sjøen trykker du på navnet på feltet du er på, så åpner Sjøkartet seg.' }])
    else {
      // the finale waits for this flag, so it is set before the scene in case the app is closed mid-way
      s.flags.va_family = true
      this.host.save()
      await this.talk([{ who: null, text: 'Nordkapp glir ned slippen, og hele kaia kjenner det i bena. Eggakanten er innen rekkevidde.' }])
      await this.talk(VA_FAMILY_CALL)
    }
  }

  private regatta() {
    const va = this.va!
    const i = va.races
    this.ui.closeSheet()
    this.talk(FRIDA_RACE[i]).then(() =>
      this.startMini(new SailRace({ boat: va.boat, rivals: 2 + i, length: 34 + i * 6, seed: 101 + i * 7, kind: 'regatta' }), async (r) => {
        const s = this.s
        if (r.time >= 0 && r.place === 1) {
          va.races++
          const prize = 2000 * (i + 1)
          s.money += prize
          this.xp(150 + i * 100)
          this.host.save()
          if (va.races >= FRIDA_RACE.length) {
            s.flags.va_regattaWon = true
            if (!s.paints.includes('va_regatta')) s.paints.push('va_regatta')
            await this.talk(FRIDA_RACE_WON)
            this.ui.toast('Du fikk Regatta-malingen! Bruk den hos Nadja.', 'boat')
          } else await this.say('frida', `Førsteplass. ${kr(prize)} i premie. Neste regatta kommer når du er klar.`)
        } else await this.say('frida', r.time < 0 ? 'Ga du opp? Vi tar den igjen en annen dag.' : `Plass ${r.place}. Du må vinne for å gå videre. Prøv igjen.`)
      }),
    )
  }

  // ---------- Signes hus ----------

  houseLabels(px: number) {
    const va = this.va
    if (!va) return ''
    const badge = (id: HouseSpotId) =>
      (id === 'gjest1' && va.guests.cash >= 100) || (id === 'royeri' && va.smoke.cash > 0) || (id === 'brygge' && (va.mikkel?.cash ?? 0) > 0)
    return this.house.spots
      .map((p) => {
        const built = p.id === 'door' || va.rooms.includes(p.id)
        const x = Math.max(44, Math.min(innerWidth - 40, (p.x + p.w / 2) * px))
        const below = p.id !== 'tarn' && p.id !== 'door'
        const y = (below ? p.y + 2 : p.y) * px
        return `<span class="label small${below ? ' below' : ''}${built ? '' : ' dim'}" style="left:${x}px;top:${y}px">${ROOM_LABEL[p.id]}${badge(p.id) ? '<span class="badge">!</span>' : ''}</span>`
      })
      .join('')
  }

  houseKey() {
    const va = this.va
    return va ? `${va.rooms.join(',')}|${va.guests.cash >= 100}|${va.smoke.cash > 0}|${(va.mikkel?.cash ?? 0) > 0}` : ''
  }

  openRoom(id: HouseSpotId) {
    sfx.click()
    const s = this.s
    const va = this.va!
    if (id === 'door') return this.host.go('harbor')
    if (!va.rooms.includes(id)) {
      const rm = VA_ROOMS[id]
      const b = this.roomCheck(id)
      const sh = this.ui.sheet(
        rm.name,
        `<p>${esc(rm.text)}</p><p class="muted">Frida kan bygge dette for ${kr(rm.price)}. ${b.ok ? 'Hun venter på Slippen.' : `${esc(b.why)}.`}</p>
        <div class="stack"><button class="btn" data-a="slip">${iconImg('hammer')}Gå til Slippen</button></div>`,
      )
      sh.querySelector<HTMLElement>('[data-a=slip]')!.onclick = () => {
        this.ui.closeSheet()
        this.host.go('harbor')
        this.frida()
      }
      return
    }
    const head = (line: string, who = 'pus') => this.host.placeHead(who, line)
    const done = (title: string, body: string) => this.ui.sheet(title, body)
    if (id === 'tak') {
      const b = done('Soverommet', `${head(pick(VA_CHATTER.house))}<div class="stack">
        <button class="btn" data-a="morning">${iconImg('sun')}Sov til morgenen</button>
        <button class="btn" data-a="evening">${iconImg('moon')}Sov til kvelden</button></div>`)
      b.querySelector<HTMLElement>('[data-a=morning]')!.onclick = () => this.sleep(0.27)
      b.querySelector<HTMLElement>('[data-a=evening]')!.onclick = () => this.sleep(0.8)
      return
    }
    if (id === 'kjokken') {
      const on = soupActive(va, s.day ?? 0)
      const rows = s.bucket
        .map((c, i) => `<div class="row"><div class="info"><b>${esc(SPECIES_BY_ID[c.id]?.name ?? c.id)}</b><small>${c.cm} cm · ${kr(c.value)}</small></div><button class="btn" data-soup="${i}" ${on ? 'disabled' : ''}>Kok suppe</button></div>`)
        .join('')
      const b = done(
        'Kjøkkenet',
        `${head(on ? 'Suppa står og godgjør seg på komfyren. Fisken biter bedre resten av dagen.' : 'Komfyren er varm. En fisk fra kassa blir til fiskesuppe, og med suppe i magen biter fisken bedre resten av dagen.', 'edvard')}
        ${on ? '' : rows || '<p class="muted">Kassa er tom. Ta med en fisk hjem.</p>'}`,
      )
      b.querySelectorAll<HTMLElement>('[data-soup]').forEach(
        (el) =>
          (el.onclick = () => {
            const c = s.bucket[Number(el.dataset.soup)]
            if (!c || !cookSoup(va, s.day ?? 0)) return
            s.bucket = s.bucket.filter((x) => x !== c)
            sfx.coin()
            this.ui.toast('Fiskesuppe! Fisken biter bedre resten av dagen.', 'fish')
            this.host.save()
            this.ui.closeSheet()
          }),
      )
      return
    }
    if (id === 'stue') return this.trophies()
    if (id === 'gjest1' || id === 'gjest2') return this.guestBook()
    if (id === 'akvarium') return this.aquarium()
    if (id === 'royeri') return this.smokehouse()
    if (id === 'verksted') {
      const b = done(
        'Garnloftet',
        `${head(s.flags.va_elleNet ? 'Elles beste garn henger her, bøtt og helt.' : 'Aslak har noe han vil vise deg i naustet.', 'aslak')}
        <p>Her kan garna og teinene bygges om til de beste nivåene.</p>
        <div class="stack"><button class="btn" data-a="gear">${iconImg('net')}Garn og teiner</button></div>`,
      )
      b.querySelector<HTMLElement>('[data-a=gear]')!.onclick = () => this.aslak(() => this.openRoom('verksted'))
      return
    }
    if (id === 'brygge') {
      const m = va.mikkel ?? { on: true, cash: 0 }
      va.mikkel = m
      const b = done(
        'Egen brygge',
        `${head(m.on ? 'Mikkel drar de fulle garna for deg og selger fisken til Nadja. Han tar en andel.' : 'Mikkel sitter på brygga og venter. Han drar garna når du sier fra.', 'aslak')}
        <p>Mikkel beholder ${Math.round((1 - BRYGGE_SHARE) * 100)} % av det garna gir. Du får resten her på brygga.</p>
        <div class="stack">
          <button class="btn green" data-a="cash" ${m.cash >= 1 ? '' : 'disabled'}>${iconImg('coin')}Hent pengene<span class="right">${kr(Math.floor(m.cash))}</span></button>
          <button class="btn plain" data-a="toggle">${m.on ? 'Be Mikkel ta fri' : 'Be Mikkel dra garna'}</button>
        </div>`,
      )
      b.querySelector<HTMLElement>('[data-a=cash]')!.onclick = () => {
        const got = Math.floor(m.cash)
        m.cash -= got
        s.money += got
        sfx.coin()
        this.host.save()
        this.openRoom('brygge')
      }
      b.querySelector<HTMLElement>('[data-a=toggle]')!.onclick = () => {
        m.on = !m.on
        this.host.save()
        this.openRoom('brygge')
      }
      return
    }
    if (id === 'badstue' || id === 'tarn') {
      const rm = VA_ROOMS[id]
      const aurora = auroraTonight(s.day ?? 0, s.time)
      done(
        rm.name,
        `${head(id === 'badstue' ? 'Dampen ryker. Havet er seks grader. Gjestene hyler og ler.' : aurora ? 'Det er nordlys i natt. Gjestene sitter oppe og ser på himmelen.' : 'Ingen nordlys i natt. Men stjernene er fine de også.', 'selma')}
        <p>${esc(rm.does)}</p>
        <p class="muted">${id === 'badstue' ? 'Gjestene betaler 1,4 ganger så mye.' : 'Gjestene betaler 2,5 ganger så mye på netter med nordlys, ellers 1,2.'}</p>`,
      )
    }
  }

  /** Skip the clock to morning or evening; the nets and the guests do not earn in your sleep */
  private async sleep(to: number) {
    const s = this.s
    this.ui.closeSheet()
    await this.host.fade(() => {
      if (s.time >= to) s.day = (s.day ?? 0) + 1
      s.time = to
      this.host.save()
    })
    this.ui.toast(to < 0.5 ? 'God morgen! Pus vil ha frokost.' : 'Du sov hele dagen. Det er kveld.', to < 0.5 ? 'sun' : 'moon')
  }

  private trophies() {
    const s = this.s
    const rows = (Object.keys(WORLDS) as WorldId[])
      .map((w) => {
        const best = WORLDS[w].species
          .filter((sp) => !sp.special && !sp.legend && s.book[sp.id])
          .sort((a, b) => s.book[b.id].best - s.book[a.id].best)[0]
        if (!best) return ''
        return `<div class="row"><img class="px" src="${this.fishURL(best)}" style="width:56px;object-fit:contain" alt=""><div class="info"><b>${esc(WORLDS[w].place)}: ${esc(best.name)}</b><small>${s.book[best.id].best} cm</small></div></div>`
      })
      .join('')
    const legends = this.va!.legends.map((id) => SPECIES_BY_ID[id]).filter(Boolean)
    this.ui.sheet(
      'Trofeveggen',
      `${this.host.placeHead('pus', 'Pus sover under trofeveggen. Han later som han ikke er imponert.')}
      ${rows || '<p class="muted">Veggen er tom ennå.</p>'}
      ${legends.length ? `<p class="cat">Legender</p>${legends.map((sp) => `<div class="row"><img class="px" src="${this.fishURL(sp)}" style="width:56px;object-fit:contain" alt=""><div class="info"><b>${esc(sp.name)}</b><small>${s.book[sp.id]?.best ?? sp.cm[0]} cm</small></div></div>`).join('')}` : ''}
      ${this.va!.pomor >= 3 ? '<p class="muted">Pomor-samovaren står og blinker ved ovnen.</p>' : ''}`,
    )
  }

  private guestBook() {
    const s = this.s
    const va = this.va!
    const aurora = auroraTonight(s.day ?? 0, s.time) && nightness(s.time) > 0.5
    const b = this.ui.sheet(
      'Gjesteboka',
      `${this.host.placeHead('selma', s.flags.va_selma ? pick(VA_CHATTER.selmaVa) : 'Gjesteboka ligger på bordet i gangen.')}
      <p>${kr(Math.floor(va.guests.cash))} av ${kr(guestCashCap(va))} venter. Gjestene betaler ${kr(Math.round(guestRate(va, aurora)))} i minuttet${aurora ? ' i nordlysnatta' : ''}. ${va.guests.nights} gjestenetter så langt.</p>
      <div class="stack"><button class="btn green" data-a="cash" ${va.guests.cash >= 1 ? '' : 'disabled'}>${iconImg('coin')}Hent pengene</button></div>
      ${(['guestComfort', 'guestAds'] as TrackId[]).map((t) => this.trackRow(t)).join('')}`,
    )
    b.querySelector<HTMLElement>('[data-a=cash]')!.onclick = () => {
      const got = collect(va, 'guests')
      s.money += got
      sfx.coin()
      this.ui.toast(`Du hentet ${kr(got)} fra gjesteboka.`, 'coin')
      this.host.save()
      this.guestBook()
    }
    this.wireTracks(b, () => this.guestBook())
  }

  private aquarium() {
    const va = this.va!
    const rows = va.aquarium
      .map((id, i) => {
        const sp = SPECIES_BY_ID[id]
        return sp ? `<div class="row"><img class="px" src="${this.fishURL(sp)}" style="width:56px;object-fit:contain" alt=""><div class="info"><b>${esc(sp.name)}</b></div><button class="btn plain" data-out="${i}">Slipp ut</button></div>` : ''
      })
      .join('')
    const b = this.ui.sheet(
      `Akvariet ${va.aquarium.length}/6`,
      `${this.host.placeHead('selma', 'Når du får en art som ikke svømmer her ennå, trykker du «Sett i akvariet» på fangstkortet.')}${rows || '<p class="muted">Tanken er tom.</p>'}`,
    )
    b.querySelectorAll<HTMLElement>('[data-out]').forEach(
      (el) =>
        (el.onclick = () => {
          va.aquarium.splice(Number(el.dataset.out), 1)
          sfx.splash()
          this.host.save()
          this.aquarium()
        }),
    )
  }

  /** Whether a fish just caught can go into the tank */
  aquariumRoom(sp: Species) {
    const va = this.va
    return !!va && this.here && va.rooms.includes('akvarium') && va.aquarium.length < 6 && !va.aquarium.includes(sp.id) && !sp.legend
  }

  toAquarium(sp: Species) {
    const va = this.va!
    va.aquarium.push(sp.id)
    this.ui.toast(`${sp.name} svømmer i akvariet (${va.aquarium.length}/6).`, 'fish')
  }

  private smokehouse() {
    const s = this.s
    const va = this.va!
    const left = smokeLeft(va)
    const status = va.smoke.load.length ? (left > 0 ? `${va.smoke.load.length} fisk i røyken, ferdig om ${dur(left)}.` : `${va.smoke.load.length} fisk er ferdig røkt. Det er ikke plass til mer penger i røykeriet.`) : 'Røykeriet er tomt.'
    const room = smokeCap(va) - va.smoke.load.length
    const b = this.ui.sheet(
      'Røykeriet',
      `${this.host.placeHead('nadja', 'Røkt fisk er gull i Oslo. Fyll ovnen, så selger jeg den.')}
      <p>${status} Plass til ${smokeCap(va)}.</p>
      <p>${kr(Math.floor(va.smoke.cash))} av ${kr(smokeCashCap(va))} venter.</p>
      <div class="stack">
        <button class="btn green" data-a="cash" ${va.smoke.cash >= 1 ? '' : 'disabled'}>${iconImg('coin')}Hent pengene</button>
        <button class="btn" data-a="box" ${room > 0 && s.bucket.length ? '' : 'disabled'}>${iconImg('bucket')}Legg inn fra kassa (${s.bucket.length})</button>
        <button class="btn" data-a="hold" ${room > 0 && va.hold.length ? '' : 'disabled'}>${iconImg('smoke')}Legg inn fra lasterommet (${va.hold.length})</button>
      </div>
      ${(['smokeOven', 'smokeWood', 'smokeBrand'] as TrackId[]).map((t) => this.trackRow(t)).join('')}`,
    )
    b.querySelector<HTMLElement>('[data-a=cash]')!.onclick = () => {
      const got = collect(va, 'smoke')
      s.money += got
      sfx.coin()
      this.ui.toast(`Du hentet ${kr(got)} fra røykeriet.`, 'coin')
      this.host.save()
      this.smokehouse()
    }
    const load = (from: 'box' | 'hold') => {
      const list = from === 'box' ? s.bucket : va.hold
      // the dearest fish first: smoking multiplies
      const took = smokeLoad(va, [...list].sort((a, b) => b.value - a.value))
      if (from === 'box') s.bucket = s.bucket.filter((c) => !took.includes(c))
      else va.hold = va.hold.filter((c) => !took.includes(c))
      sfx.plop()
      this.host.save()
      this.smokehouse()
    }
    b.querySelector<HTMLElement>('[data-a=box]')!.onclick = () => load('box')
    b.querySelector<HTMLElement>('[data-a=hold]')!.onclick = () => load('hold')
    this.wireTracks(b, () => this.smokehouse())
  }

  private imgCache = new Map<string, string>()
  private fishURL(sp: Species) {
    if (!this.imgCache.has(sp.id)) {
      const src = artFor(sp).right[0]
      const c = document.createElement('canvas')
      const k = sp.look.len > 50 ? 2 : sp.look.len > 28 ? 3 : 4
      c.width = src.width * k
      c.height = src.height * k
      const g = c.getContext('2d')!
      g.imageSmoothingEnabled = false
      g.drawImage(src, 0, 0, c.width, c.height)
      this.imgCache.set(sp.id, c.toDataURL())
    }
    return this.imgCache.get(sp.id)!
  }

  // ---------- at sea ----------

  /** The second row of HUD chips in Vardø: ground, gear, rank, contract, a whale to photograph */
  hud(view: View): string {
    const s = this.s
    const va = this.va
    if (!this.here || !va) return ''
    if (view === 'mini') {
      const m = this.mini
      return m instanceof SailRace ? `<button class="chip" data-va="giveup">${iconImg('anchor')}Gi opp</button>` : ''
    }
    const sea = view === 'sea'
    const g = va.ground
    const rk = rankOf(va.xp)
    const c = va.contract
    const full = va.nets.some((n) => n.ground === g && netFull(va, n)) || va.pots.some((p) => p.ground === g && p.crabs.length >= potCap(va))
    const chips: string[] = []
    if (sea) {
      chips.push(`<button class="chip" data-va="chart">${iconImg('map')}${CHIP_NAME[g]}</button>`)
      chips.push(`<button class="chip" data-va="gear">${iconImg('net')}Redskap ${va.hold.length}/${holdCap(va)}${full ? '<span class="badge">!</span>' : ''}</button>`)
    }
    chips.push(`<button class="chip money" data-va="rank">${iconImg('star')}${rk.level}</button>`)
    if (c && !c.failed) {
      const left = c.left !== undefined && !c.done ? clock(c.left) : ''
      const prog = c.done ? 'Ferdig!' : c.kind === 'deliver' ? `${Math.round((c.progress / contractTarget(c)) * 100)} %` : c.kind === 'race' ? 'Regatta' : c.kind === 'tour' ? 'Fugletur' : `${c.progress}/${contractTarget(c)}`
      chips.push(`<button class="chip${left && c.left! < 30 ? ' money' : ''}" data-va="contract">${iconImg('key')}${left ? `${left} · ` : ''}${prog}</button>`)
    }
    if (sea && s.flags.va_selma && va.flukes.length < WHALES.length && this.host.sea.mode === 'idle' && this.host.sea.whaleUp)
      chips.push(`<button class="chip money" data-va="photo">${iconImg('camera')}Ta bilde!</button>`)
    return chips.join('')
  }

  /** Changes often enough to need a re-render: the timer and the whale */
  hudState(view: View) {
    const va = this.va
    if (!this.here || !va) return ''
    const c = va.contract
    return `${view}|${va.ground}|${va.hold.length}|${rankLevel(va)}|${c ? `${c.id}${c.progress}${c.done}${c.failed}${Math.floor(c.left ?? 0)}` : ''}|${this.host.sea.whaleUp && this.host.sea.mode === 'idle'}|${va.nets.map((n) => n.fish.length).join(',')}|${va.pots.map((p) => p.crabs.length).join(',')}|${this.mini ? 1 : 0}`
  }

  renderHud(el: HTMLElement, view: View) {
    const key = this.hudState(view)
    if (key === this.hudKey) return
    this.hudKey = key
    el.innerHTML = this.hud(view)
  }

  hudClick(kind: string) {
    if (this.ui.talking) return
    sfx.click()
    const idle = this.host.sea.mode === 'idle'
    if (kind === 'giveup' && this.mini instanceof SailRace) return this.mini.giveUp()
    if (kind === 'chart') return idle ? this.chart() : this.ui.toast('Hal inn snøret først.')
    if (kind === 'gear') return idle ? this.gear() : this.ui.toast('Hal inn snøret først.')
    if (kind === 'rank') return this.rankSheet()
    if (kind === 'contract') {
      const c = this.va?.contract
      if (!c) return
      return this.ui.sheet('Kontrakt', `${this.host.placeHead(c.who, c.text)}<p><b>${esc(c.title)}</b></p><div class="progress"><i style="width:${Math.min(100, (c.progress / contractTarget(c)) * 100)}%"></i></div><p class="muted">${this.progressText(c)}</p>`)
    }
    if (kind === 'photo' && idle) return this.fluke()
  }

  /** Brita's word in a sheet: her face on land, her voice on the radio at sea */
  private britaHead(line: string) {
    if (this.host.view !== 'sea') return this.host.placeHead('brita', line)
    return `<div class="who">${iconImg('radio', 72)}<p><b>Brita på VHF-en:</b> «${esc(line)}»</p></div>`
  }

  private rankSheet() {
    const va = this.va!
    const rk = rankOf(va.xp)
    const next = rankOf(va.xp + rk.need - rk.into)
    this.ui.sheet(
      'Rykte',
      `${this.britaHead('Folk på kaia snakker. Jo mer du gjør, jo mer tillit får du.')}
      <p><b>Rang ${rk.level}: ${esc(rk.title)}</b></p>
      <div class="progress"><i style="width:${(rk.into / rk.need) * 100}%"></i></div>
      <p class="muted">${rk.into} av ${rk.need} XP til rang ${rk.level + 1}: ${esc(next.title)}.</p>
      <p class="muted">Du får XP for fisk, garn og teiner, kontrakter, oppdrag og alt du hjelper folk med. Rang åpner båter, rom og bedre utstyr.</p>`,
    )
  }

  /** Sjøkartet: the grounds your boat reaches, and the trip out */
  chart() {
    const va = this.va!
    const rows = GROUND_ORDER.map((g) => {
      const gr = VA_GROUNDS[g]
      const here = g === va.ground
      const ok = va.boat >= gr.boat
      const nets = va.nets.filter((n) => n.ground === g)
      const pots = va.pots.filter((p) => p.ground === g)
      const gear = [nets.length ? `${nets.length} garn${nets.some((n) => netFull(va, n)) ? ' (fullt)' : ''}` : '', pots.length ? `${pots.length} teiner` : ''].filter(Boolean).join(', ')
      const hours = Math.abs(gr.hours - VA_GROUNDS[va.ground].hours)
      const right = here ? '<span class="muted">Her</span>' : ok ? `<button class="btn" data-sail="${g}">Stevn ut</button>` : `<span class="muted">Krever ${VA_BOATS[gr.boat].type.toLowerCase()}</span>`
      return `<div class="row"><div class="info"><b>${esc(gr.name)}</b><small>${esc(gr.text)}${!here && ok ? ` ${hours ? `${hours} ${hours === 1 ? 'time' : 'timer'} unna.` : 'Rett ved.'}` : ''}${gear ? ` Ute: ${gear}.` : ''}</small></div>${right}</div>`
    }).join('')
    const b = this.ui.sheet('Sjøkartet', `${this.britaHead('Følg med på været. Havtåka kommer fort her ute.')}${rows}`)
    b.querySelectorAll<HTMLElement>('[data-sail]').forEach((el) => (el.onclick = () => this.sail(el.dataset.sail as GroundId)))
  }

  private async sail(g: GroundId) {
    const s = this.s
    const va = this.va!
    if (this.host.sea.mode !== 'idle') return
    this.ui.closeSheet()
    const hours = Math.abs(VA_GROUNDS[g].hours - VA_GROUNDS[va.ground].hours)
    await this.host.fade(() => {
      let t = s.time + hours / 24
      if (t >= 1) {
        t -= 1
        s.day = (s.day ?? 0) + 1
      }
      s.time = t
      va.ground = g
      setGround(g)
      this.host.sea.newWorld()
      this.host.refresh()
      this.host.save()
    })
    this.ui.toast(`Du er ${atGround(g)}.`, 'map')
  }

  /** Redskap: the nets and pots on the ground you are on */
  gear() {
    const s = this.s
    const f = s.flags
    const va = this.va!
    const g = va.ground
    const here = va.nets.map((n, i) => ({ n, i })).filter((x) => x.n.ground === g)
    const free = Math.min(va.netsOwned, netSlots(va)) - va.nets.length
    const netRows = here
      .map(
        ({ n, i }) => `<div class="row"><div class="info"><b>Garn ${here.findIndex((x) => x.i === i) + 1}</b><small>${n.fish.length} av ${netCap(va)} fisk${netFull(va, n) ? ', fullt' : ''}</small>
          <div class="progress"><i style="width:${(n.fish.length / netCap(va)) * 100}%"></i></div></div>
          <button class="btn green" data-haul="${i}" ${n.fish.length ? '' : 'disabled'}>Dra</button><button class="btn plain" data-lift="${i}">Ta opp</button></div>`,
      )
      .join('')
    const away = va.nets.filter((n) => n.ground !== g).length
    const potsHere = va.pots.filter((p) => p.ground === g)
    const crabs = potsHere.reduce((n, p) => n + p.crabs.length, 0)
    const potFree = Math.min(va.potsOwned, potSlots(va)) - va.pots.length
    const canPots = POT_GROUNDS.includes(g)
    const pots = f.va_crab
      ? canPots
        ? `<p class="cat">Teiner ${atGround(g)}: ${potsHere.length}</p>
          ${potsHere.length ? `<p class="muted">${crabs} krabber i teinene (plass til ${potCap(va)} i hver).</p>` : ''}
          <div class="stack">
            ${potFree > 0 ? `<button class="btn" data-a="setPots">${iconImg('crab')}Sett ${potFree} teiner her</button>` : ''}
            ${potsHere.length ? `<button class="btn green" data-a="haulPots" ${crabs ? '' : 'disabled'}>${iconImg('crab')}Dra teinene</button><button class="btn plain" data-a="liftPots">Ta opp teinene</button>` : ''}
          </div>`
        : `<p class="muted">Teiner står bare i Varangerfjorden og på Tiddlybanken.${va.pots.length ? ` Du har ${va.pots.length} teiner ute.` : ''}</p>`
      : ''
    const b = this.ui.sheet(
      `Redskap · ${groundName(g)}`,
      `<p>Lasterommet: <b>${va.hold.length} av ${holdCap(va)}</b> fisk. Selg det hos Nadja sammen med kassa.</p>
      ${va.netsOwned ? `<p class="cat">Garn ${atGround(g)}</p>${netRows || '<p class="muted">Ingen garn her.</p>'}` : '<p class="muted">Du har ingen garn ennå. Aslak i naustet har kanskje et.</p>'}
      ${free > 0 ? `<div class="stack"><button class="btn" data-a="setNet">${iconImg('net')}Sett garn her</button></div>` : ''}
      ${away ? `<p class="muted">${away} garn står ute andre steder.</p>` : ''}
      ${pots}`,
    )
    b.querySelectorAll<HTMLElement>('[data-haul]').forEach((el) => (el.onclick = () => this.haulNet(Number(el.dataset.haul))))
    b.querySelectorAll<HTMLElement>('[data-lift]').forEach(
      (el) =>
        (el.onclick = () => {
          const fish = liftNet(va, Number(el.dataset.lift))
          const over = landNetHaul(va, fish)
          sfx.splash()
          if (fish.length) this.ui.toast(`Garnet er på dekk. ${fish.length - over} fisk i lasterommet.`, 'net')
          this.host.save()
          this.gear()
        }),
    )
    const sn = b.querySelector<HTMLElement>('[data-a=setNet]')
    if (sn)
      sn.onclick = () => {
        if (!setNet(va, g)) return
        f.va_netSet = true
        sfx.splash()
        this.ui.toast('Garnet står. Det fisker mens du gjør andre ting.', 'net')
        this.host.save()
        this.gear()
      }
    const sp = b.querySelector<HTMLElement>('[data-a=setPots]')
    if (sp)
      sp.onclick = () => {
        setPots(va, g, potsHere.length + potFree)
        sfx.splash()
        this.ui.toast('Teinene står. Krabbene kommer etter hvert.', 'crab')
        this.host.save()
        this.gear()
      }
    const hp = b.querySelector<HTMLElement>('[data-a=haulPots]')
    if (hp) hp.onclick = () => this.haulPots(false)
    const lp = b.querySelector<HTMLElement>('[data-a=liftPots]')
    if (lp) lp.onclick = () => this.haulPots(true)
  }

  private haulNet(i: number) {
    const s = this.s
    const va = this.va!
    const net = va.nets[i]
    // the fish stay in the net until the haul is over, so closing the app mid-haul loses nothing
    const fish = net ? [...net.fish] : []
    if (!net || !fish.length) return
    this.hauling.add(net)
    this.startMini(new NetHaul(fish, { mesh: lvl(va, 'netMesh') / 5, boat: va.boat }), (r) => {
      this.hauling.delete(net)
      net.fish = net.fish.filter((c) => !fish.includes(c))
      net.t = 0
      const over = landNetHaul(va, r.kept)
      for (const c of r.kept) this.record(c.id, c.cm)
      this.xp(xpForHaul(r.kept))
      const first = !s.flags.va_netHauled
      s.flags.va_netHauled = true
      this.host.save()
      this.ui.toast(`${r.kept.length - over} fisk i lasterommet${r.lost ? `, ${r.lost} slapp` : ''}${over ? `, ${over} fikk ikke plass` : ''}.`, 'net')
      if (first) setTimeout(() => this.ui.toast('Fortell Aslak i naustet om fangsten.', 'house'), 600)
    })
  }

  /** Haul (or take up) the pots where you are, and sort the catch on deck */
  private haulPots(lift: boolean) {
    const s = this.s
    const f = s.flags
    const va = this.va!
    const g = va.ground
    // like the nets: the crabs stay in the pots until the sorting is done
    const pots = va.pots.filter((p) => p.ground === g)
    const crabs = pots.flatMap((p) => p.crabs)
    const empty = () => {
      const all = new Set(crabs)
      for (const p of pots) {
        p.crabs = p.crabs.filter((c) => !all.has(c))
        p.t = 0
      }
      if (lift) liftPots(va, g)
    }
    // the King of Varanger walks into a pot once in a lifetime
    const king = VA_LEGEND_RULES.find((r) => r.id === 'v_kongen')
    if (crabs.length && king && king.ground === g && va.boat >= (king.minBoat ?? 0) && Math.random() < king.chance) {
      const sp = SPECIES_BY_ID.v_kongen
      crabs.splice(Math.floor(Math.random() * crabs.length), 0, { id: sp.id, mm: Math.round(sp.cm[1] * 10), male: true, kg: sp.kg[1], value: sp.value })
    }
    if (!crabs.length) {
      empty()
      if (lift) this.ui.toast('Teinene er på dekk.', 'crab')
      this.host.save()
      return this.gear()
    }
    const min = (id: string) => CRAB_MIN_MM[id] ?? 0
    this.startMini(new CrabSort(crabs, min, { tutorial: !f.va_crabSorted }), async (r) => {
      empty()
      const out = sortOutcome(crabs, r.keep, CRAB_MIN_MM, this.level)
      const over = landCrabs(va, out.kept)
      for (const c of crabs) this.record(c.id, Math.round(c.mm / 10))
      this.xp(xpForHaul(out.kept))
      const c = va.contract
      if (c && (!c.ground || c.ground === g)) contractCrabs(c, out.kept.length)
      if (out.kept.some((c) => c.id === 'v_kongen') && !va.legends.includes('v_kongen')) {
        va.legends.push('v_kongen')
        sfx.fanfare()
        this.ui.toast('Kongen av Varanger! En legende i Fiskeboka.', 'crab')
      }
      const first = !f.va_crabSorted
      f.va_crabSorted = true
      this.ui.toast(`${out.kept.length - over} krabber i lasterommet${over ? `, ${over} fikk ikke plass` : ''}.`, 'crab')
      if (out.fine) {
        // Brita is on land: she finds the crabs when you come in, and the fine waits for her
        const due = va.fineDue ?? { n: 0, kr: 0 }
        va.fineDue = { n: due.n + out.wrong, kr: due.kr + out.fine }
        sfx.lose()
      }
      this.host.save()
      if (first || out.fine) this.ui.toast(out.fine ? out.wrong === 1 ? 'Én krabbe i kassa skulle vært sluppet ut. Brita ser den når du kommer inn.' : `${out.wrong} krabber i kassa skulle vært sluppet ut. Brita ser dem når du kommer inn.` : 'Brita vil snakke med deg om krabbene.', 'house')
    })
  }

  /** Something from the nets or pots goes into the book as well */
  private record(id: string, cm: number) {
    const b = this.s.book
    const prev = b[id]
    b[id] = { n: (prev?.n ?? 0) + 1, best: Math.max(prev?.best ?? 0, cm) }
  }

  private fluke() {
    const s = this.s
    const va = this.va!
    const n = va.flukes.length
    const wanted = n < FLUKES ? [WHALES[n]] : WHALES.filter((w) => !va.flukes.includes(w))
    this.startMini(new PhotoHunt('fluke', { whales: wanted }), async (r) => {
      const id = r.fluke
      if (!id || va.flukes.includes(id) || !WHALES.includes(id)) {
        this.ui.toast(id ? 'Den hvalen har Selma allerede.' : 'Ingen god halefinne denne gangen. Vent på neste hval.', 'camera')
        return
      }
      va.flukes.push(id)
      sfx.chest()
      const i = va.flukes.length - 1
      if (i === FLUKES - 1) s.flags.va_flukesDone = true
      this.host.save()
      if (i < FLUKES) {
        await this.talk(SELMA_FLUKE[i])
        this.xp(60 + i * 30)
        if (i === FLUKES - 1) {
          sfx.fanfare()
          this.ui.toast('Aslak vil høre om hvalen med arret.', 'house')
        }
      } else {
        s.money += 800
        this.xp(40)
        this.ui.toast(`Ny hval i Selmas katalog (${va.flukes.length}/${WHALES.length}). Hun gir deg ${kr(800)}.`, 'camera')
      }
      this.host.save()
    })
  }

  private tour(c: ActiveContract) {
    this.ui.closeSheet()
    this.startMini(new PhotoHunt('birds'), (r) => {
      const good = r.shots.filter((x) => x >= 0.4).length
      if (!contractEvent(c, 'tour', good)) c.failed = true
      this.host.save()
    })
  }

  private raceContract(c: ActiveContract) {
    const va = this.va!
    this.ui.closeSheet()
    this.startMini(new SailRace({ boat: va.boat, rivals: 3, length: 32, seed: (this.s.day ?? 0) * 13 + 5, kind: Math.random() < 0.5 ? 'delivery' : 'regatta' }), (r) => {
      if (r.time < 0 || !contractEvent(c, 'race', r.place)) c.failed = true
      this.host.save()
    })
  }

  // ---------- hooks from the game ----------

  /** A fish on the hook in Vardø: rank, contracts and legends */
  onCatch(sp: Species, kgs: number, value: number, night: boolean) {
    const va = this.va
    if (!this.here || !va) return
    this.xp(xpForCatch(value))
    const c = va.contract
    if (c) contractCatch(c, { sp, kg: kgs, ground: va.ground, night, zone: sp.zone })
    if (sp.legend && !va.legends.includes(sp.id)) {
      va.legends.push(sp.id)
      sfx.fanfare()
      this.ui.toast(`${sp.name}! En legende i Fiskeboka.`, 'star')
    }
  }

  /** Fish sold to Nadja: the box and the hold together */
  onSell(krs: number, kgs: number) {
    const va = this.va
    if (!va) return
    const c = va.contract
    if (c) contractSell(c, krs, kgs)
    this.xp(Math.round(Math.sqrt(krs) * 0.5))
  }

  /** A Pomor find or a ghost net came up on the hook */
  async itemFound(kind: string) {
    const s = this.s
    const va = this.va
    if (!va) return
    sfx.chest()
    if (kind === 'pomor') {
      s.flags.va_pomorFound = true
      this.host.save()
      this.ui.toast(['Et grønt kobberlokk! Ta det med til Nadja.', 'En gammel mynt! Ta den med til Nadja.', 'En flaske med et brev i! Ta den med til Nadja.'][va.pomor] ?? 'Noe gammelt! Ta det med til Nadja.', 'letter')
      return
    }
    if (kind === 'ghostnet' && va.contract) {
      contractEvent(va.contract, 'ghostnet')
      this.host.save()
      await this.talk([{ who: null, text: 'Et gammelt garn kommer opp over ripa, grått og tungt av tang. Det har fisket for ingen i årevis. Nå er det slutt.' }])
    }
  }

  /** The finale at Eggakanten */
  async ungeVisit() {
    const s = this.s
    sfx.fanfare()
    s.flags.va_unge = true
    s.book.v_unge = { n: 1, best: 260 }
    this.xp(400)
    this.host.save()
    await this.talk(VA_UNGE)
    this.ui.toast('Dra hjem til Signes hus. Bestefar venter.', 'house')
  }

  // ---------- the book ----------

  openBook(detail?: string, tab?: GroundId | 'legender') {
    const s = this.s
    const va = this.va
    const cur: GroundId | 'legender' = tab ?? (detail ? ((SPECIES_BY_ID[detail]?.legend ? 'legender' : (SPECIES_BY_ID[detail]?.ground as GroundId)) ?? 'sundet') : (va?.ground ?? 'sundet'))
    if (detail) {
      const sp = SPECIES_BY_ID[detail]
      const rec = s.book[sp.id]
      const g = (sp.ground as GroundId) ?? 'sundet'
      const z = VA_GROUNDS[g].zones[sp.zone]
      const rule = VA_LEGEND_RULES.find((r) => r.id === sp.id)
      const when = sp.pot ? 'Fanges i teine' : rule?.time === 'dawn' ? 'Bare i grålysningen' : sp.time === 'night' ? 'Bare om natta' : sp.time === 'day' ? 'Bare om dagen' : 'Hele døgnet'
      const told = !!s.flags[`va_told_${sp.id}`]
      const b = this.ui.sheet(
        rec ? sp.name : '???',
        `<div class="catch"><div class="fishimg"><img class="px" src="${rec ? this.fishURL(sp) : this.darkURL(sp)}" alt=""></div></div>
        ${rec ? `<p>${esc(sp.text)}</p><div class="facts"><span><small>Fanget</small>${rec.n}</span><span><small>Største</small>${rec.best} cm</span><span><small>Verdi</small>${kr(sp.value)}</span></div>` : `<p>${rule ? (told ? esc(rule.hint) : 'Bestefar har kanskje en historie om denne.') : 'Ingen har fanget denne ennå.'}</p>`}
        ${sp.special || (rule && !rec) ? '' : `<p class="muted">${esc(VA_GROUNDS[g].name)}, ${esc(z.name)}, ${z.from}–${z.to} m. ${when}.${sp.rare ? ' Sjelden.' : ''}</p>`}
        <div class="stack"><button class="btn plain" data-a="back">Tilbake</button></div>`,
      )
      b.querySelector<HTMLElement>('[data-a=back]')!.onclick = () => this.openBook(undefined, cur)
      return
    }
    const tabs = `<div class="tabs3 tabs5">${[...GROUND_ORDER, 'legender' as const]
      .map((t) => `<button class="btn ${t === cur ? '' : 'plain'}" data-g="${t}">${t === 'legender' ? 'Legender' : VA_GROUNDS[t].name.replace('Varanger', 'Varanger­')}</button>`)
      .join('')}</div>`
    let body = ''
    if (cur === 'legender') {
      const list = VA_SPECIES.filter((sp) => sp.legend || (sp.special && s.book[sp.id]))
      body = `<div class="book-grid">${list
        .map((sp) => {
          const rec = s.book[sp.id]
          const told = s.flags[`va_told_${sp.id}`]
          return `<button class="book-cell" data-sp="${sp.id}"><img class="px" src="${rec ? this.fishURL(sp) : this.darkURL(sp)}" alt="">${rec ? esc(sp.name) : told ? '???' : '<span class="muted">???</span>'}</button>`
        })
        .join('')}</div>
        <p class="muted">Bestefar har en historie om hver av dem. Han ringer når du har gjort deg fortjent til den.</p>`
    } else {
      const gr = VA_GROUNDS[cur]
      const reachBoat = (va?.boat ?? 0) >= gr.boat
      body = gr.zones
        .map((z, i) => {
          const list = VA_BOOK.filter((sp) => sp.ground === cur && sp.zone === i)
          if (!list.length) return ''
          return `<p class="cat">${esc(z.name)} · ${z.from}–${z.to} m</p><div class="book-grid">${list
            .map((sp) => {
              const rec = s.book[sp.id]
              const reach = reachBoat && (sp.pot ? !!s.flags.va_crab : this.lineReach() >= z.from)
              return `<button class="book-cell" data-sp="${sp.id}"><img class="px" src="${rec ? this.fishURL(sp) : this.darkURL(sp)}" alt="">${rec ? esc(sp.name) : reach ? '???' : `<span class="muted">${reachBoat ? (sp.pot ? 'Teine' : 'For dypt') : 'For langt'}</span>`}</button>`
            })
            .join('')}</div>`
        })
        .join('')
    }
    const n = VA_BOOK.filter((sp) => s.book[sp.id]).length
    const b = this.ui.sheet(
      'Fiskeboka',
      `${this.host.worldTabs('vardo')}<p>Vardø: ${n} av ${VA_BOOK.length} arter funnet</p><div class="progress"><i style="width:${(n / VA_BOOK.length) * 100}%"></i></div>${tabs}${body}`,
    )
    b.querySelectorAll<HTMLElement>('[data-sp]').forEach((el) => (el.onclick = () => this.openBook(el.dataset.sp)))
    b.querySelectorAll<HTMLElement>('[data-g]').forEach((el) => (el.onclick = () => this.openBook(undefined, el.dataset.g as GroundId | 'legender')))
    b.querySelectorAll<HTMLElement>('[data-w]').forEach((el) => (el.onclick = () => this.host.openBook(undefined, el.dataset.w as WorldId)))
  }

  /** How deep Vardø's line reaches, also when you look at the book from another place */
  private lineReach() {
    if (this.here) return gearValue(this.s, 'line')
    const lv = this.s.away.vardo?.gear.line ?? 0
    return VA_GEAR.line.levels[Math.min(lv, VA_GEAR.line.levels.length - 1)].value
  }

  private darkCache = new Map<string, string>()
  private darkURL(sp: Species) {
    if (!this.darkCache.has(sp.id)) {
      const src = artFor(sp).right[0]
      const k = sp.look.len > 50 ? 2 : sp.look.len > 28 ? 3 : 4
      const c = document.createElement('canvas')
      c.width = src.width * k
      c.height = src.height * k
      const g = c.getContext('2d')!
      g.imageSmoothingEnabled = false
      g.drawImage(src, 0, 0, c.width, c.height)
      g.globalCompositeOperation = 'source-in'
      g.fillStyle = '#3a2c3e'
      g.fillRect(0, 0, c.width, c.height)
      this.darkCache.set(sp.id, c.toDataURL())
    }
    return this.darkCache.get(sp.id)!
  }

  // ---------- minigames ----------

  /** Runs a minigame full screen on the main canvas, then hands its result back */
  startMini<R>(m: MiniGame<R>, done: (r: R) => void) {
    this.ui.closeSheet()
    if (this.host.view === 'sea') this.host.sea.reset()
    this.miniFrom = this.host.view === 'mini' ? 'sea' : this.host.view
    this.mini = m
    this.miniDone = done as (r: unknown) => void
    this.input = { down: false, x: 0, y: 0, tap: false, release: false, swipe: 0 }
    this.host.view = 'mini'
    document.body.classList.add('mini')
    this.host.refresh()
  }

  pointer(kind: 'down' | 'move' | 'up', x: number, y: number) {
    const inp = this.input
    if (!this.mini) return
    inp.x = x
    inp.y = y
    if (kind === 'down') {
      inp.down = true
      inp.tap = true
      this.downAt = { x, y, t: performance.now() }
    } else if (kind === 'up' && inp.down) {
      inp.down = false
      inp.release = true
      const dx = x - this.downAt.x
      const dy = y - this.downAt.y
      if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2 && performance.now() - this.downAt.t < 700) inp.swipe = dx > 0 ? 1 : -1
    }
  }

  /** One frame of the running minigame; returns the hint for the dock */
  frameMini(dt: number, g: CanvasRenderingContext2D, W: number, H: number): string {
    const m = this.mini
    if (!m) return ''
    m.update(dt, this.input)
    this.input.tap = false
    this.input.release = false
    this.input.swipe = 0
    g.save()
    m.draw(g, W, H)
    g.restore()
    const hint = m.hint()
    if (m.result) {
      const done = this.miniDone
      const r = m.result
      this.mini = null
      this.miniDone = null
      this.host.view = this.miniFrom
      document.body.classList.remove('mini')
      this.host.refresh()
      done?.(r)
      this.host.save()
    }
    return hint
  }

  // ---------- little things for the shop ----------

  /** What the people in the gear shop hint at for the gifts that are not sold */
  giftHint(k: string, cur: number) {
    if (k === 'lamp') return cur === 0 ? 'Fyll Fiskeboka med fem arter, så har Brita en hodelykt til deg.' : 'Signes gamle stormlykt står et sted. Fyll Fiskeboka.'
    if (k === 'line') return 'Aslak snakker om Elles line. Se på Britas liste.'
    return 'Frida dreier noe på Slippen. Se på Britas liste.'
  }

  /** The hold, shown in the fish box sheet */
  holdText() {
    const va = this.va
    if (!this.here || !va) return ''
    return `<p class="muted" style="margin-top:8px">Lasterommet: ${va.hold.length} av ${holdCap(va)} fisk, ${kr(this.holdValue())}. Nadja kjøper det sammen med kassa.</p>`
  }

  /** Sell the hold along with the box; returns what it came to */
  sellHold(): { kr: number; n: number; kg: number } {
    const va = this.va
    if (!this.here || !va) return { kr: 0, n: 0, kg: 0 }
    const out = { kr: this.holdValue(), n: va.hold.length, kg: va.hold.reduce((n, c) => n + c.kg, 0) }
    va.hold = []
    return out
  }

  /** The gear sheet's greeting at Pomorbrygga */
  gearLine() {
    return 'Snøre, agn og kaffe. Alt du glemte hjemme, har Pomorbrygga.'
  }

  /** Rank and gifts from Brita's list */
  claimed(money: number) {
    this.xp(10 + Math.round(money / 50))
  }
}
