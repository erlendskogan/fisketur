// The fishing scene: the boat on the surface and the cross-section of the fjord below

import { genFish, type FishArt } from '../art/fishgen'
import { canvas, mix, rgba, rng } from '../art/pixel'
import {
  BOAT_GEO,
  type BoatSpriteKind,
  kittiwakeSprites,
  bangSprite,
  boatSprite,
  catSprites,
  fisherSprite,
  FISHER_HAND,
  gullSprites,
  heartSprite,
  jellySprites,
  tinSprite,
  hydroSprite,
} from '../art/sprites'
import { buildWater, drawBeam, drawDeco, farLighthouse, nightness, SEABED, type Water } from '../art/scenery'
import { ambientAt, Backdrop, drawGlitter, drawReflection, drawRipples, glow, golden, light, rippleColour, skyAt, tintAmbient, type Sky } from '../art/fjord'
import { sfx } from '../audio'
import { depthToY, PAINTS, WORLD, WORLD_BOTTOM, SPECIES, SPECIES_BY_ID, yToDepth, ZONE_H, ZONES, zoneAt, type Species } from './data'
import { HYDRO_DEPTHS } from './alaska'
import { BUOY_DEPTHS } from './hawaii'
import { dev } from './harbor'
import { Reel } from './reel'
import { Rain, weatherAt } from './weather'
import { gearValue, type Save } from './state'
import { auroraStrength, boatKindOf, groundOf, isVardo, vaOf, vaStyle } from '../art/vardo'
import { netFull, potFull, soupActive, soupBite } from './vardo/economy'
import { VA_LEGEND_RULES, VA_POMOR_DEPTHS } from './vardo/data'
import type { GroundId } from './vardo/types'

/** What you see on the horizon from each of Vardø's grounds */
const VA_FAR: Record<GroundId, 'town' | 'coast' | 'open' | 'ocean'> = { sundet: 'town', fjorden: 'coast', banken: 'open', eggakanten: 'ocean' }

const arts = new Map<string, FishArt>()
export function artFor(sp: Species) {
  let a = arts.get(sp.id)
  if (!a) {
    a = genFish(sp.look, sp.id)
    arts.set(sp.id, a)
  }
  return a
}

/** How big a landed fish turns out; a better lure brings up bigger ones */
export function rollSize(sp: Species, lure: number) {
  const t = Math.pow(Math.random(), 1.7 / Math.sqrt(lure))
  const cm = Math.round(sp.cm[0] + (sp.cm[1] - sp.cm[0]) * t)
  const kg = +(sp.kg[0] + (sp.kg[1] - sp.kg[0]) * Math.pow(t, 2.2)).toFixed(sp.kg[1] < 2 ? 2 : 1)
  return { cm, kg }
}

type FishState = 'swim' | 'approach' | 'nibble' | 'bite' | 'hooked' | 'flee' | 'leap'

interface Fish {
  sp: Species
  art: FishArt
  x: number
  y: number
  baseY: number
  speed: number
  dir: 1 | -1
  ph: number
  state: FishState
  t: number
  nibbles: number
  alpha: number
  drift: number
}

export type Mode = 'idle' | 'cast' | 'sink' | 'wait' | 'bite' | 'reel' | 'land' | 'retrieve' | 'snag'

export interface SeaHost {
  s: Save
  caught(sp: Species, cm: number, kg: number, perfect: boolean, chest: boolean): void
  /** The fish got away while you reeled */
  escaped(sp: Species): void
  letterFound(): void
  hydroPlaced(): void
  hint(text: string): void
  calfVisit(): void
  gamleVisit(): void
  gamleCaught(): void
  modeChanged(): void
  /** Vardø: something other than a letter came up on the hook (a Pomor find, a ghost net) */
  itemFound(kind: string): void
  /** Vardø: Den gamle and Den unge have come to the boat at Eggakanten */
  ungeVisit(): void
}

/** Things lying on the wall that the hook can catch on and bring up */
type SnagKind = 'letter' | 'pomor' | 'ghostnet'

export const LETTER_DEPTHS = [40, 120, 300, 800]

export class Sea {
  W = 0
  H = 0
  water!: Water
  fish: Fish[] = []
  mode: Mode = 'idle'
  lure = { x: 0, y: 0 }
  targetY = 0
  camY = 0
  t = 0
  hooked: Fish | null = null
  reel: Reel | null = null
  holding = false
  /** finger is down letting out line */
  letting = false
  /** how long the finger has been down while waiting: a tap hauls in, a hold goes deeper */
  private pressT = -1
  private waitT = 0
  private biteT = 0
  private cooldown = 0
  private castT = 0
  private snagT = 0
  /** what is hanging on the hook on its way up, if anything */
  private carrying: SnagKind | null = null
  private catT = 0
  private hearts: { x: number; y: number; t: number }[] = []
  private bubbles: { x: number; y: number; t: number }[] = []
  /** marine snow, in screen space; z is how far away (parallax) */
  private snow: { x: number; y: number; z: number; ph: number }[] = []
  /** glowing plankton stirred up by the lure in the dark */
  private sparks: { x: number; y: number; t: number; c: string }[] = []
  private schools: { x: number; y: number; dir: 1 | -1; speed: number; n: number; ph: number }[] = []
  private jellies: { x: number; y: number; ph: number }[] = []
  private bd = new Backdrop()
  private rain = new Rain()
  /** height of the sky above the surface when the camera rests */
  private hz = 0
  private sc = canvas(1, 1)
  private work = canvas(1, 1)
  private farC = canvas(1, 1)
  private farLamp = { x: 0, y: 0 }
  private farLit: boolean | null = null
  private windows: { x: number; y: number; on: number }[] = []
  private whales: { x: number; t0: number; dir: 1 | -1; breach?: boolean; orca?: boolean }[] = []
  private gamle: { t0: number; told: boolean } | null = null
  private gamleT = 0
  private calf: { t0: number; told: boolean } | null = null
  private calfT = 0
  /** Vardø: Den unge circling the boat's light at Eggakanten */
  private unge: { t0: number } | null = null
  private dayHint = false
  private flyers: { x: number; t0: number; y: number }[] = []
  private nextWhale = 6
  private net: { x: number; t0: number } | null = null
  private boatImg!: HTMLCanvasElement
  private paint = ''
  private fisherImg = fisherSprite(WORLD)
  private knutImg = fisherSprite('knut')
  private cats = catSprites()
  private heart = heartSprite()
  private bang = bangSprite()
  private tin = tinSprite()
  private hydro = hydroSprite()
  private gulls = gullSprites()
  private jellyImgs = jellySprites(WORLD)
  private kitti = kittiwakeSprites()
  /** the boat sprite you sail; Vardø's tiers are bigger boats */
  private kind: BoatSpriteKind = 'faering'
  private farKey = ''
  private vaLamp = false
  private dark = canvas(1, 1)
  private landing: { fish: Fish; t: number; x0: number; y0: number } | null = null
  /** where the line and the boat sit, in world coordinates */
  tipX = 0
  tipY = 0
  boatX = 0

  constructor(private host: SeaHost) {}

  get s() {
    return this.host.s
  }

  private get geo() {
    return BOAT_GEO[this.kind]
  }

  private get va() {
    return isVardo(this.s)
  }

  /** The sprite for the boat you sail here */
  private boatKind(): BoatSpriteKind {
    if (this.va) return boatKindOf(vaOf(this.s)?.boat ?? 0)
    return WORLD === 'alaska' ? 'troller' : WORLD === 'hawaii' ? 'research' : 'faering'
  }

  /** The style the water, the hills and the far shore are drawn in: per ground in Vardø */
  private style() {
    return this.va ? vaStyle(groundOf(this.s)) : WORLD
  }

  /** Put the boat so the rod tip stays at the same place whatever boat you have */
  private placeBoat() {
    const geo = this.geo
    this.boatX = Math.round(this.W * 0.58) - (geo.fisher.x + 28)
    this.tipX = this.boatX + geo.fisher.x + 28
    this.tipY = -geo.wl + geo.fisher.y - 10
  }

  resize(W: number, H: number) {
    if (W === this.W && H === this.H) return
    const rebuild = W !== this.W
    this.W = W
    this.H = H
    if (rebuild) {
      this.water = buildWater(W, this.style())
      const r = rng(5)
      this.snow = Array.from({ length: 60 }, () => ({ x: r() * W, y: r() * H, z: 0.3 + r() * 0.7, ph: r() * 6 }))
      this.jellies = Array.from({ length: 5 }, () => ({ x: 20 + r() * (W - 40), y: 2 * ZONE_H + r() * ZONE_H * 2, ph: r() * 6 }))
      this.schools = Array.from({ length: 4 }, (_, i) => ({ x: r() * W, y: 50 + i * 120 + r() * 60, dir: r() < 0.5 ? 1 : -1, speed: 3 + r() * 4, n: 7 + Math.floor(r() * 6), ph: r() * 6 }))
      this.fish = []
    }
    this.dark = canvas(W, H)
    this.hz = Math.round(H * 0.42)
    this.bd.resize(W, this.hz, WORLD === 'alaska' ? 45 : WORLD === 'hawaii' ? 60 : this.va ? 85 : 5, 0.72, this.style())
    this.rain.resize(W, H)
    this.sc = canvas(W, this.hz)
    this.work = canvas(W, this.hz)
    this.farLit = null
    this.kind = this.boatKind()
    this.placeBoat()
    if (this.mode === 'idle') this.lure = { x: this.tipX, y: this.tipY + 10 }
    this.camY = this.idleCam
  }

  get idleCam() {
    return -this.hz
  }

  get maxY() {
    return Math.min(depthToY(gearValue(this.s, 'line')), SEABED - 6)
  }

  get depth() {
    return this.mode === 'idle' || this.lure.y < 0 ? 0 : yToDepth(this.lure.y)
  }

  // ---------- input ----------

  /** A tap on the scene at screen coordinates */
  /** Finger down on the scene: hold to let line out, let go to stop */
  press(sx: number, sy: number) {
    const wy = sy + this.camY
    // pet the cat
    const cg = this.geo
    if (this.s.flags.cat && Math.abs(sx - (this.boatX + cg.cat.x + 6)) < 9 && Math.abs(wy - (this.bob - cg.wl + cg.cat.y + 2)) < 10) {
      this.hearts.push({ x: this.boatX + cg.cat.x + 4, y: this.bob - cg.wl + cg.cat.y - 6, t: 0 })
      sfx.purr()
      return
    }
    if (this.mode === 'bite') return this.strike()
    if (this.mode === 'reel') {
      this.holding = true
      return
    }
    if (this.mode === 'wait') {
      this.pressT = 0
      return
    }
    if (this.mode === 'idle') this.cast()
    this.letting = true
  }

  /** Finger up anywhere */
  release() {
    this.holding = false
    if (this.pressT >= 0) {
      this.pressT = -1
      if (this.mode === 'wait') this.retrieve()
      return
    }
    if (!this.letting) return
    this.letting = false
    // let go during the cast: stop just below the surface
    if (this.mode === 'cast') this.targetY = 10
    else if (this.mode === 'sink') this.stop()
  }

  /** The big button: it never lets line out, it only hooks and reels in */
  action() {
    if (this.mode === 'wait') this.retrieve()
    else if (this.mode === 'bite') this.strike()
  }

  cast() {
    this.mode = 'cast'
    this.castT = 0
    this.targetY = this.maxY
    sfx.cast()
    this.host.modeChanged()
  }

  stop() {
    this.targetY = this.lure.y
    this.mode = 'wait'
    this.waitT = 0
    this.host.modeChanged()
  }

  retrieve() {
    this.releaseInterest()
    this.mode = 'retrieve'
    this.host.modeChanged()
  }

  /** Pull the lure out of the water immediately (when rowing to the harbour) */
  reset() {
    this.releaseInterest()
    this.hooked = null
    this.reel = null
    this.landing = null
    this.carrying = null
    this.mode = 'idle'
    this.lure = { x: this.tipX, y: this.tipY + 10 }
    this.host.modeChanged()
  }

  private releaseInterest() {
    for (const f of this.fish) if (f.state === 'approach' || f.state === 'nibble' || f.state === 'bite') this.flee(f)
  }

  private strike() {
    const f = this.fish.find((x) => x.state === 'bite')
    if (!f) return
    f.state = 'hooked'
    this.hooked = f
    this.reel = new Reel(f.sp, gearValue(this.s, 'rod'), gearValue(this.s, 'reel'), gearValue(this.s, 'lure'))
    this.mode = 'reel'
    sfx.bite()
    this.host.modeChanged()
  }

  private flee(f: Fish) {
    f.state = 'flee'
    f.dir = f.x < this.lure.x ? -1 : 1
    f.t = 0
  }

  // ---------- simulation ----------

  get bob() {
    return Math.round(Math.sin(this.t * 1.4) * 1.2)
  }

  update(dt: number, paused: boolean) {
    this.t += dt
    const kind = this.boatKind()
    if (this.paint !== `${this.s.paint}|${kind}`) {
      const p = PAINTS.find((x) => x.id === this.s.paint) ?? PAINTS[0]
      if (kind !== this.kind) {
        // a new boat: keep the line where it was, move the boat under it
        this.kind = kind
        this.placeBoat()
        if (this.mode === 'idle') this.lure = { x: this.tipX, y: this.tipY + 10 }
      }
      this.boatImg = boatSprite(p.hull, p.stripe, kind)
      this.paint = `${this.s.paint}|${kind}`
    }
    this.bd.update(dt)
    const surf = -Math.round(this.camY)
    this.rain.update(dt, weatherAt(this.s.day, this.s.time).rain, () => surf)
    this.updateFish(dt, paused)
    this.updateLife(dt)
    if (paused) return

    if (this.pressT >= 0) {
      this.pressT += dt
      if (this.mode !== 'wait') this.pressT = -1
      else if (this.pressT > 0.22) {
        this.pressT = -1
        this.targetY = this.maxY
        this.mode = 'sink'
        this.letting = true
        this.host.modeChanged()
      }
    }

    const lure = this.lure
    const sway = Math.sin(this.t * 0.8) * 1.5
    switch (this.mode) {
      case 'idle':
        lure.x = this.tipX
        lure.y = this.tipY + 10 + this.bob
        break
      case 'cast': {
        this.castT += dt / 0.4
        const k = Math.min(1, this.castT)
        lure.x = this.tipX + Math.sin(k * Math.PI) * 6
        lure.y = this.tipY + 10 + (0 - this.tipY - 10) * k * k
        if (k >= 1) {
          sfx.splash()
          lure.y = 0
          this.mode = 'sink'
          this.host.modeChanged()
        }
        break
      }
      case 'sink': {
        const speed = 110 + Math.max(0, lure.y) * 0.1
        const dir = Math.sign(this.targetY - lure.y)
        lure.y += dir * speed * dt
        lure.x = this.tipX + sway
        if (Math.random() < dt * 8) this.bubbles.push({ x: lure.x, y: lure.y, t: 0 })
        if ((dir > 0 && lure.y >= this.targetY) || (dir < 0 && lure.y <= this.targetY) || dir === 0) {
          lure.y = this.targetY
          this.mode = 'wait'
          this.waitT = 0
          sfx.plop()
          this.host.modeChanged()
        }
        break
      }
      case 'wait':
        lure.x = this.tipX + sway
        this.waitT += dt
        this.cooldown -= dt
        this.lookForBite(dt)
        break
      case 'bite':
        lure.x = this.tipX + sway + (Math.random() - 0.5) * 2
        this.biteT -= dt
        if (this.biteT <= 0) {
          const f = this.fish.find((x) => x.state === 'bite')
          if (f) this.flee(f)
          this.mode = 'wait'
          this.cooldown = 1.5
          sfx.lose()
          this.host.modeChanged()
        }
        break
      case 'reel': {
        const r = this.reel!
        r.update(dt, this.holding)
        lure.x = this.tipX + sway + Math.sin(this.t * 20) * 1.5
        if (r.result === 'win') {
          sfx.catch()
          this.mode = 'land'
          this.host.modeChanged()
        } else if (r.result === 'lose') {
          sfx.lose()
          const lost = this.hooked
          if (lost) this.flee(lost)
          this.hooked = null
          this.reel = null
          this.mode = 'wait'
          this.cooldown = 2
          if (lost) this.host.escaped(lost.sp)
          this.host.modeChanged()
        }
        break
      }
      case 'land':
      case 'retrieve':
      case 'snag': {
        const speed = this.mode === 'retrieve' ? 260 + lure.y * 0.25 : 340 + lure.y * 0.3
        lure.y -= speed * dt
        lure.x = this.tipX + sway
        if (lure.y <= 0) {
          lure.y = 0
          if (this.mode === 'land' && this.hooked) {
            this.landing = { fish: this.hooked, t: 0, x0: lure.x, y0: 0 }
            this.hooked.state = 'leap'
            this.hooked = null
            sfx.splash()
          } else if (this.mode === 'snag') {
            const kind = this.carrying
            this.carrying = null
            if (kind === 'letter') this.host.letterFound()
            else if (kind) this.host.itemFound(kind)
          }
          this.mode = 'idle'
          this.host.modeChanged()
        }
        break
      }
    }

    if (this.landing) {
      const L = this.landing
      L.t += dt / 0.6
      const k = Math.min(1, L.t)
      const f = L.fish
      f.x = L.x0 + (this.boatX + this.geo.fisher.x + 14 - L.x0) * k
      f.y = -Math.sin(k * Math.PI) * 26 - k * 8
      if (k >= 1) {
        this.fish = this.fish.filter((x) => x !== f)
        const r = this.reel!
        this.reel = null
        this.landing = null
        if (f.sp.id === 'gamle') this.host.gamleCaught()
        else {
          const { cm, kg } = rollSize(f.sp, gearValue(this.s, 'lure'))
          this.host.caught(f.sp, cm, kg, r.perfect, r.chestWon)
        }
      }
    }

    // camera
    const want = this.mode === 'idle' && !this.landing ? this.idleCam : Math.min(WORLD_BOTTOM + 30 - this.H, Math.max(this.idleCam, Math.round(lure.y - this.H * 0.48)))
    this.camY += (want - this.camY) * Math.min(1, dt * (this.mode === 'sink' || this.mode === 'land' ? 9 : 5))
    if (Math.abs(want - this.camY) < 0.5) this.camY = want

    this.bubbles = this.bubbles.filter((b) => (b.t += dt) < 1.5)
    for (const b of this.bubbles) b.y -= dt * 20
    this.hearts = this.hearts.filter((h) => (h.t += dt) < 1.4)
    this.catT += dt
  }

  private eligible(sp: Species) {
    const n = nightness(this.s.time) > 0.5
    return !sp.special && (!sp.time || sp.time === 'any' || (sp.time === 'night') === n)
  }

  private pickSpecies(zone: number) {
    const lureMult = gearValue(this.s, 'lure')
    const list = SPECIES.filter((sp) => sp.zone === zone && this.eligible(sp))
    const w = list.map((sp) => sp.weight * (sp.rare ? Math.pow(lureMult, 1.6) : 1))
    let r = Math.random() * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < list.length; i++) if ((r -= w[i]) <= 0) return list[i]
    return list[0]
  }

  private bounds(y: number, half: number) {
    const i = Math.max(0, Math.min(this.water.wallL.length - 1, Math.round(y)))
    return [this.water.wallL[i] + half + 2, this.W - this.water.wallR[i] - half - 2] as const
  }

  private spawn(zone: number, sp: Species = this.pickSpecies(zone), y?: number) {
    const art = artFor(sp)
    const top = zone * ZONE_H + (zone === 0 ? 24 : 10) + art.h / 2
    const bot = zone === ZONES.length - 1 ? SEABED - 12 - art.h / 2 : (zone + 1) * ZONE_H - 10
    const yy = y ?? top + Math.random() * Math.max(1, bot - top)
    const [lo, hi] = this.bounds(yy, art.w / 2)
    const base = sp.behavior === 'dart' ? 16 : sp.behavior === 'calm' ? 10 : sp.behavior === 'floater' ? 8 : 6
    const f: Fish = {
      sp,
      art,
      x: lo + Math.random() * Math.max(1, hi - lo),
      y: yy,
      baseY: yy,
      speed: base * (0.7 + Math.random() * 0.6) * (art.w > 40 ? 0.7 : 1),
      dir: Math.random() < 0.5 ? 1 : -1,
      ph: Math.random() * 6,
      state: 'swim',
      t: 0,
      nibbles: 0,
      alpha: 0,
      drift: (Math.random() - 0.5) * 3,
    }
    this.fish.push(f)
    return f
  }

  private mouth(f: Fish, dir: 1 | -1 = f.dir) {
    const mx = f.art.mouthX - f.art.w / 2
    const my = f.art.mouthY - f.art.h / 2
    return { x: dir === 1 ? mx : -mx, y: my }
  }

  private updateFish(dt: number, paused: boolean) {
    // keep each zone stocked
    const counts = ZONES.map(() => 0)
    for (const f of this.fish) if (!f.sp.special && f.state !== 'flee') counts[f.sp.zone]++
    for (let z = 0; z < ZONES.length; z++) if (counts[z] < (z === 0 ? 6 : 5)) this.spawn(z)

    for (const f of this.fish) {
      f.t += dt
      f.alpha = Math.min(1, f.alpha + dt)
      if (paused && f.state !== 'swim') continue
      const m = this.mouth(f)
      switch (f.state) {
        case 'swim': {
          f.x += f.dir * f.speed * dt
          f.baseY += f.drift * dt
          const zTop = f.sp.zone * ZONE_H + (f.sp.zone === 0 ? 24 : 8)
          const zBot = f.sp.special ? SEABED - 30 : Math.min(SEABED - 12, (f.sp.zone + 1) * ZONE_H - 8)
          if (f.baseY < zTop || f.baseY > zBot) f.drift = -f.drift
          f.y = f.baseY + Math.sin(f.t * 1.3 + f.ph) * 2
          const [lo, hi] = this.bounds(f.y, f.art.w / 2)
          if (f.x < lo) f.dir = 1
          if (f.x > hi) f.dir = -1
          if (Math.random() < dt * 0.06) f.dir = f.dir === 1 ? -1 : 1
          // fish that only come out at day or night slip away when the time changes
          if (!f.sp.special && !this.eligible(f.sp) && Math.random() < dt * 0.05) this.flee(f)
          break
        }
        case 'approach': {
          f.dir = this.lure.x > f.x ? 1 : -1
          const tx = this.lure.x - this.mouth(f).x
          const ty = this.lure.y - m.y
          const dx = tx - f.x
          const dy = ty - f.y
          const d = Math.hypot(dx, dy)
          const v = f.sp.special ? 14 : f.speed * 1.6 + 6
          if (d < 1.5) {
            f.state = 'nibble'
            f.t = 0
            f.nibbles = f.sp.special ? 1 : 1 + Math.floor(Math.random() * 3)
          } else {
            f.x += (dx / d) * Math.min(d, v * dt)
            f.y += (dy / d) * Math.min(d, v * dt)
          }
          if (this.mode !== 'wait') this.flee(f)
          break
        }
        case 'nibble': {
          const k = f.t % 0.7
          const back = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.35
          f.x = this.lure.x - m.x - f.dir * back * 3
          f.y = this.lure.y - m.y
          if (f.t > 0.7) {
            f.t = 0
            f.nibbles--
            if (f.nibbles > 0) sfx.nibble()
            else {
              f.state = 'bite'
              this.mode = 'bite'
              this.biteT = f.sp.special ? 2.6 : 0.95
              sfx.bite()
              navigator.vibrate?.(60)
              this.host.modeChanged()
            }
          }
          if (this.mode !== 'wait' && f.state === 'nibble') this.flee(f)
          break
        }
        case 'bite':
          f.x = this.lure.x - m.x
          f.y = this.lure.y - m.y
          break
        case 'hooked':
          if (Math.random() < dt * 2) f.dir = f.dir === 1 ? -1 : 1
          f.x = this.lure.x - this.mouth(f).x
          f.y = this.lure.y - m.y + Math.sin(this.t * 16) * 1.5
          break
        case 'flee':
          f.x += f.dir * (f.speed * 3 + 20) * dt
          f.alpha = Math.max(0, f.alpha - dt * 0.8)
          break
        case 'leap':
          break
      }
    }
    this.fish = this.fish.filter((f) => !(f.state === 'flee' && (f.alpha <= 0 || f.x < -80 || f.x > this.W + 80)))
  }

  /** Rebuild the water for the place you have just moved to */
  newWorld() {
    const W = this.W
    this.W = 0
    this.resize(W, this.H)
    this.farLit = null
    this.paint = ''
    this.fisherImg = fisherSprite(this.va ? 'vardo' : WORLD)
    this.jellyImgs = jellySprites(this.va ? 'vardo' : WORLD)
    this.farKey = ''
    this.whales = []
    this.net = null
    this.calf = null
    this.calfT = 0
    this.gamle = null
    this.gamleT = 0
    this.unge = null
  }

  /** Where the next of Selma's hydrophones should go, if you are carrying one */
  hydroTarget() {
    const s = this.s
    if (WORLD === 'hawaii') {
      // Selma's song buoys only hear the whales at night
      const b = s.buoys
      if (!s.flags.hi_buoys || b.placed !== b.heard || b.placed >= BUOY_DEPTHS.length || nightness(s.time) < 0.5) return null
      if (b.placed === 1 && !s.flags.hi_pondFull) return null
      return Math.round(depthToY(BUOY_DEPTHS[b.placed]))
    }
    const h = s.hydro
    if (WORLD !== 'alaska' || !s.flags.ak_hydro || h.placed !== h.heard || h.placed >= HYDRO_DEPTHS.length) return null
    if (h.placed === 2 && !s.flags.ak_dam) return null
    return Math.round(depthToY(HYDRO_DEPTHS[h.placed]))
  }

  /** The next thing waiting on the wall: Knut's letter tins at home, Nadja's Pomor finds and ghost nets in Vardø */
  private letterItem(): { x: number; y: number; kind: SnagKind } | null {
    const s = this.s
    if (this.carrying) return null
    const at = (depth: number, side: 1 | -1, kind: SnagKind) => {
      const y = Math.round(depthToY(depth))
      const x = side === 1 ? this.water.wallL[y] + 5 : this.W - this.water.wallR[y] - 12
      return { x, y, kind }
    }
    if (this.va) {
      const va = vaOf(s)
      if (!va) return null
      const g = groundOf(s)
      const c = va.contract
      if (c && c.kind === 'ghostnet' && !c.done && !c.failed && c.ground === g && c.depth) return at(c.depth, -1, 'ghostnet')
      const p = VA_POMOR_DEPTHS[va.pomor]
      if (p && s.flags.va_metNadja && !s.flags.va_pomorFound && p.ground === g) return at(p.depth, 1, 'pomor')
      return null
    }
    if (WORLD !== 'norge') return null
    if (!s.flags.metKnut || s.letters.found > s.letters.delivered || s.letters.delivered >= 4) return null
    return at(LETTER_DEPTHS[s.letters.delivered], s.letters.delivered % 2 === 0 ? 1 : -1, 'letter')
  }

  /** A humpback is up and diving where you can see it from the boat (for Selma's fluke photos) */
  get whaleUp() {
    return this.va && this.camY < 0 && this.whales.some((w) => !w.orca && !w.breach && this.t - w.t0 > 0.5 && this.t - w.t0 < 6.5)
  }

  /** Vardø: a legend comes instead of an ordinary fish when its weather, hour and boat are right */
  private legendFor(zone: number): Species | null {
    const va = vaOf(this.s)
    if (!va) return null
    const g = groundOf(this.s)
    const time = this.s.time
    const wx = weatherAt(this.s.day, time)
    const night = nightness(time) > 0.5
    for (const r of VA_LEGEND_RULES) {
      if (r.ground !== g || r.zone !== zone || SPECIES_BY_ID[r.id]?.pot) continue
      if (r.time === 'dawn' ? time < 0.2 || time > 0.3 : r.time === 'night' ? !night : r.time === 'day' ? night : false) continue
      if (r.weather === 'rain' ? wx.rain < 0.3 : r.weather === 'fog' ? wx.fog < 0.3 : false) continue
      if (va.boat < (r.minBoat ?? 0)) continue
      if (Math.random() < r.chance) return SPECIES_BY_ID[r.id]
    }
    return null
  }

  private lookForBite(dt: number) {
    // hold a hydrophone still at its depth and it fastens itself to the rock
    const hy = this.hydroTarget()
    if (hy !== null && Math.abs(this.lure.y - hy) < 14) {
      this.snagT += dt
      if (this.snagT > 1.5) {
        this.snagT = 0
        this.releaseInterest()
        if (WORLD === 'hawaii') this.s.buoys.placed++
        else this.s.hydro.placed++
        this.mode = 'retrieve'
        sfx.plop()
        this.host.hydroPlaced()
        this.host.modeChanged()
      }
      return
    }
    // a song buoy taken down in daylight: tell the player why nothing happens
    if (WORLD === 'hawaii' && !this.dayHint) {
      const b = this.s.buoys
      if (this.s.flags.hi_buoys && b.placed === b.heard && b.placed < BUOY_DEPTHS.length && nightness(this.s.time) < 0.5 && (b.placed !== 1 || this.s.flags.hi_pondFull)) {
        if (Math.abs(this.lure.y - depthToY(BUOY_DEPTHS[b.placed])) < 14) {
          this.dayHint = true
          this.host.hint('Sangbøyene hører bare hvalene om natta. Kom tilbake når det er mørkt.')
        }
      }
    }
    const item = this.letterItem()
    if (item && Math.abs(this.lure.y - item.y) < 22) {
      this.snagT += dt
      if (this.snagT > 1.2) {
        this.snagT = 0
        this.releaseInterest()
        this.carrying = item.kind
        this.mode = 'snag'
        sfx.bite()
        this.host.modeChanged()
      }
      return
    }
    this.snagT = 0
    if (this.cooldown > 0 || this.fish.some((f) => f.state === 'approach' || f.state === 'nibble')) return

    // Den gamle comes before anything else when she is expected
    const s = this.s
    // and in Alaska, the king salmon comes in to the shallows on his way home
    if (WORLD === 'alaska' && s.flags.ak_finale && !s.flags.ak_king && this.lure.y < depthToY(60)) {
      if (this.waitT > 2 && !this.fish.some((f) => f.sp.special)) {
        const k = this.spawn(1, SPECIES_BY_ID.kongen, this.lure.y + 20)
        k.x = this.W + 50
        k.state = 'approach'
      }
      return
    }
    if (s.flags.finale && !s.flags.scale && this.lure.y > SEABED - 150) {
      if (this.waitT > 2 && !this.fish.some((f) => f.sp.special)) {
        const g = this.spawn(5, SPECIES_BY_ID.gamle, this.lure.y + 30)
        g.x = -40
        g.state = 'approach'
      }
      return
    }
    // fish bite better when it rains, and after a bowl of fish soup in Signes hus
    const rain = weatherAt(this.s.day, this.s.time).rain
    const va = vaOf(this.s)
    const soup = this.va && va && soupActive(va, this.s.day ?? 0) ? soupBite : 1
    if (Math.random() > dt * 1.4 * gearValue(this.s, 'lure') * (1 + rain * 0.5) * soup) return
    if (this.va) {
      const zone = zoneAt(this.lure.y)
      const leg = this.legendFor(zone)
      if (leg && !this.fish.some((f) => f.sp.id === leg.id)) {
        const f = this.spawn(zone, leg, this.lure.y + 10)
        f.x = this.lure.x < this.W / 2 ? this.W + 40 : -40
        f.state = 'approach'
        return
      }
    }
    const near = this.fish.filter((f) => f.state === 'swim' && !f.sp.special && Math.abs(f.y - this.lure.y) < 46 && Math.abs(f.x - this.lure.x) < this.W)
    if (!near.length) return
    const f = near[Math.floor(Math.random() * near.length)]
    f.state = 'approach'
  }

  /** Lofoten: on a dark night at sea with the twelve skrei hung, Den gamle comes to see Knut */
  private updateLofoten(dt: number) {
    const f = this.s.flags
    if (f.lo_finale && !f.lo_gamle && this.mode === 'idle' && nightness(this.s.time) > 0.5) {
      this.gamleT += dt
      if (this.gamleT > 2 && !this.gamle) {
        this.gamle = { t0: this.t, told: false }
        sfx.whale()
      }
    }
    if (this.gamle && !this.gamle.told && this.t - this.gamle.t0 > 7) {
      this.gamle.told = true
      this.host.gamleVisit()
    }
    if (f.lo_gamle && this.gamle && this.t - this.gamle.t0 > 30) this.gamle = null
  }

  /**
   * Vardø: at Eggakanten on a dark night, lying still with the big boat, Den gamle comes up one
   * last time with a young one that circles your light
   */
  private updateVardo(dt: number) {
    const f = this.s.flags
    const va = vaOf(this.s)
    const ready = !!va && f.va_joik && f.va_family && va.boat >= 3 && !f.va_unge && groundOf(this.s) === 'eggakanten'
    if (ready && this.mode === 'idle' && nightness(this.s.time) > 0.5) {
      this.gamleT += dt
      if (this.gamleT > 2 && !this.gamle) {
        this.gamle = { t0: this.t, told: false }
        this.unge = { t0: this.t + 2 }
        sfx.whale()
      }
    } else if (!this.gamle) this.gamleT = 0
    if (this.gamle && this.unge && !this.gamle.told && this.t - this.gamle.t0 > 9) {
      this.gamle.told = true
      this.host.ungeVisit()
    }
    if (f.va_unge && this.gamle && this.t - this.gamle.t0 > 30) {
      this.gamle = null
      this.unge = null
    }
  }

  /** Where Den gamle lies at the surface: beside the bow, or astern of Vardø's big boats so the hull does not hide her */
  private gamleX() {
    return this.va ? Math.max(28, this.boatX - 30) : this.boatX + 70
  }

  /** The middle of Den unge's circle: under the lantern, below the keel */
  private ungeAt(surf: number) {
    return { x: this.boatX + this.geo.lantern.x - 8, y: surf + Math.max(14, this.geo.h - this.geo.wl + 12) }
  }

  /** Den unge circling under the lantern, a small blue light learning to glow */
  private drawUnge(g: CanvasRenderingContext2D, surf: number) {
    if (!this.unge) return
    const k = (this.t - this.unge.t0) / 2
    if (k <= 0) return
    const sp = SPECIES_BY_ID.v_unge
    if (!sp) return
    const art = artFor(sp)
    const a = this.t * 0.9
    const at = this.ungeAt(surf)
    const x = Math.round(at.x + Math.cos(a) * 30 - art.w / 2)
    const y = Math.round(at.y + Math.sin(a) * 5 - art.h / 2)
    const dir = -Math.sin(a) >= 0 ? 'right' : 'left'
    const fr = Math.floor(this.t * 4) % 2
    g.globalAlpha = Math.min(1, k)
    g.drawImage(art[dir][fr], x, y)
    g.globalCompositeOperation = 'lighter'
    // the glow comes and goes: she has not quite learnt it yet
    g.globalAlpha = Math.min(1, k) * (0.4 + 0.3 * Math.sin(this.t * 3.1) * Math.sin(this.t * 1.7))
    const gl = art[dir === 'right' ? 'glowRight' : 'glowLeft'][fr]
    if (gl) g.drawImage(gl, x, y)
    glow(g, x + art.w / 2, y + art.h / 2, 10, '#8ad8ff', 0.25)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
  }

  /** Hawaii: the mother and calf come to the boat when the song is complete, and flying fish */
  private updateHawaii(dt: number) {
    const f = this.s.flags
    if (f.hi_finale && !f.hi_calf && this.mode === 'idle') {
      this.calfT += dt
      if (this.calfT > 2 && !this.calf) {
        this.calf = { t0: this.t, told: false }
        sfx.song()
      }
    }
    if (this.calf && !this.calf.told && this.t - this.calf.t0 > 6) {
      this.calf.told = true
      this.host.calfVisit()
    }
    if (f.hi_calf && this.calf && this.t - this.calf.t0 > 30) this.calf = null
    if (nightness(this.s.time) < 0.4 && Math.random() < dt * 0.15) this.flyers.push({ x: 0, t0: this.t, y: Math.random() * 3 })
    this.flyers = this.flyers.filter((x) => this.t - x.t0 < 2)
  }

  /** Fish schools in the distance, plankton and the far scenery */
  private updateLife(dt: number) {
    const W = this.W
    if (WORLD === 'hawaii') this.updateHawaii(dt)
    if (WORLD === 'lofoten') this.updateLofoten(dt)
    if (this.va) this.updateVardo(dt)
    if (WORLD !== 'norge') {
      // whales come up now and then; when the herring are in they come often and feed together
      const feeding = WORLD === 'alaska' && !!this.s.flags.ak_finale
      this.nextWhale -= dt
      if (this.nextWhale <= 0) {
        this.nextWhale = feeding ? 5 + Math.random() * 6 : 14 + Math.random() * 22
        const x = W * (0.45 + Math.random() * 0.45)
        if (feeding && !this.net && Math.random() < 0.5) this.net = { x, t0: this.t }
        else if (WORLD === 'lofoten' && Math.random() < 0.6) {
          // a pod of orcas following the herring into Vestfjorden
          const dir = Math.random() < 0.5 ? 1 : -1
          for (let i = 0; i < 3; i++) this.whales.push({ x: x + i * 9 * -dir, t0: this.t + i * 0.5, dir, orca: true })
        } else this.whales.push({ x, t0: this.t, dir: Math.random() < 0.5 ? 1 : -1, breach: WORLD === 'hawaii' && Math.random() < 0.4 })
        // you hear them through the hull when the surface is close
        if (this.camY < 40 && WORLD !== 'lofoten') sfx.whale(true)
      }
      this.whales = this.whales.filter((w) => this.t - w.t0 < 7.5)
    }
    for (const sc of this.schools) {
      sc.x += sc.dir * sc.speed * dt
      if (sc.x < -40) sc.dir = 1
      if (sc.x > W + 40) sc.dir = -1
    }
    // the lure stirs up glowing plankton where it is dark
    const dark = Math.max(nightness(this.s.time), Math.min(1, Math.max(0, this.lure.y - 500) / 300))
    const moving = this.mode === 'sink' || this.mode === 'retrieve' || this.mode === 'land' || this.mode === 'snag' || this.mode === 'reel'
    if (dark > 0.3 && this.lure.y > 4 && moving && Math.random() < dt * 30 * dark)
      this.sparks.push({ x: this.lure.x + (Math.random() - 0.5) * 8, y: this.lure.y + (Math.random() - 0.5) * 6, t: 0, c: Math.random() < 0.8 ? '#7affe8' : '#9ab8ff' })
    for (const f of this.fish)
      if (dark > 0.5 && f.state !== 'swim' && f.y > 4 && Math.random() < dt * 4) this.sparks.push({ x: f.x - f.dir * f.art.w * 0.4, y: f.y, t: 0, c: '#7affe8' })
    for (const p of this.sparks) {
      p.t += dt
      p.y -= dt * 2
    }
    this.sparks = this.sparks.filter((p) => p.t < 1.4)
  }

  // ---------- drawing ----------

  /** The distant shore: a few houses on the left and the lighthouse on its skerry */
  private paintFar() {
    if (this.va) return this.paintFarVa()
    if (WORLD === 'alaska') return this.paintFarAk()
    if (WORLD === 'hawaii') return this.paintFarHi()
    if (WORLD === 'lofoten') return this.paintFarLo()
    const lit = dev.ending ?? !!this.s.flags.ending
    if (this.farLit === lit) return
    this.farLit = lit
    const { W, hz } = this
    this.farC = canvas(W, hz)
    const g = this.farC.g
    const r = rng(3)
    // a spit of land with a little hamlet
    const landW = Math.round(W * 0.34)
    for (let x = 0; x < landW; x++) {
      const h = Math.round(3 + 2 * Math.cos((x / landW) * Math.PI * 0.5) + Math.sin(x * 0.4) * 0.6)
      g.fillStyle = '#2e4a3a'
      g.fillRect(x, hz - h, 1, h)
      g.fillStyle = '#4a6a4a'
      g.fillRect(x, hz - h, 1, 1)
      g.fillStyle = '#3e3a52'
      g.fillRect(x, hz - 1, 1, 1)
    }
    this.windows = []
    const houses: [number, number, number, string][] = [
      [4, 7, 5, '#c8423a'],
      [13, 5, 4, '#f0b43c'],
      [20, 6, 5, '#f4ecdc'],
      [29, 5, 4, '#c8423a'],
      [37, 4, 3, '#8a4a3a'],
    ]
    for (const [x, w, h, c] of houses) {
      if (x + w > landW - 3) continue
      const base = hz - 4
      g.fillStyle = c
      g.fillRect(x, base - h, w, h)
      g.fillStyle = '#2a2438'
      for (let i = 0; i < Math.ceil(w / 2) + 1; i++) g.fillRect(x - 1 + i, base - h - i, w + 2 - i * 2, 1)
      g.fillStyle = '#26304e'
      g.fillRect(x + 1, base - h + 2, 1, 1)
      this.windows.push({ x: x + 1, y: base - h + 2, on: 0.2 + r() * 0.5 })
      if (w > 4) {
        g.fillRect(x + w - 2, base - h + 2, 1, 1)
        this.windows.push({ x: x + w - 2, y: base - h + 2, on: 0.2 + r() * 0.5 })
      }
    }
    // a little pier
    g.fillStyle = '#5a3e2a'
    g.fillRect(landW - 2, hz - 3, 9, 1)
    for (const x of [landW, landW + 3, landW + 6]) g.fillRect(x, hz - 2, 1, 2)

    const lh = farLighthouse(lit)
    const lx = W - lh.c.width - 2
    g.drawImage(lh.c, lx, hz - lh.c.height)
    this.farLamp = { x: lx + lh.lamp.x, y: hz - lh.c.height + lh.lamp.y }
  }

  /**
   * Vardø's horizon from each ground: the town and Hornøya from the sound, the low Varanger
   * coast from the fjord, a far trawler on the banks, and only Bjørnøya, very faint, at the edge
   */
  private paintFarVa() {
    const ground = groundOf(this.s)
    if (this.farKey === ground && this.farLit !== null) return
    this.farKey = ground
    this.farLit = false
    this.vaLamp = false
    const far = VA_FAR[ground]
    const { W, hz } = this
    this.farC = canvas(W, hz)
    const g = this.farC.g
    const r = rng(23)
    this.windows = []
    const px = (x: number, y: number, c: string, w = 1, h = 1) => {
      g.fillStyle = c
      g.fillRect(Math.round(x), Math.round(y), w, h)
    }
    const land = (from: number, to: number, base: number, amp: number, col: string, lit: string) => {
      const tops: number[] = []
      for (let x = from; x < to; x++) {
        const u = (x - from) / Math.max(1, to - from - 1)
        const edge = Math.min(1, u * 8, (1 - u) * 5)
        const h = Math.max(1, Math.round((base + amp * Math.sin(x * 0.13) + 0.6 * Math.sin(x * 0.41)) * Math.pow(edge, 0.5)))
        tops.push(hz - h)
        px(x, hz - h, col, 1, h)
        px(x, hz - h, lit)
        px(x, hz - 1, '#3a3a52')
      }
      return (x: number) => tops[Math.max(0, Math.min(tops.length - 1, Math.round(x) - from))]
    }
    const house = (x: number, w: number, h: number, c: string, base: number) => {
      px(x, base - h, c, w, h)
      px(x + w - 1, base - h, mix(c, '#2a2438', 0.3), 1, h)
      const roof = r() < 0.5 ? '#3a3a4a' : '#7a3a34'
      px(x - 1, base - h - 1, roof, w + 2, 1)
      px(x, base - h - 2, mix(roof, '#ffffff', 0.15), w, 1)
      px(x + 1, base - h + 1, '#26304e')
      this.windows.push({ x: x + 1, y: base - h + 1, on: 0.15 + r() * 0.5 })
    }

    if (far === 'town') {
      // Vardøya: the town along the water, the church, the fortress and the radar domes
      const landW = Math.round(W * 0.52)
      const top = land(0, landW, 6, 1.2, '#4e5446', '#6e7258')
      const domeX = Math.round(landW * 0.28)
      for (const [dx, rr] of [[0, 3], [8, 2]] as [number, number][]) {
        const cx = domeX + dx
        const cy = top(cx) - rr - 1
        for (let y = -rr; y <= rr; y++)
          for (let x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr + 1) px(cx + x, cy + y, x + y < 0 ? '#f4f6fa' : '#c8ccd8')
        px(cx - 1, cy + rr + 1, '#8a8a96', 3, 1)
      }
      const cols = ['#c8423a', '#f0b43c', '#3a6a9e', '#f4ecdc', '#4a8a6a', '#e86a4a', '#f4ecdc', '#8a4a6a']
      for (let x = 2; x < landW - 18; x += 5 + Math.floor(r() * 2)) house(x, 4, 3 + Math.floor(r() * 2), cols[Math.floor(r() * cols.length)], hz - 2)
      // the church: white with a tall pointed spire
      const cx = Math.round(landW * 0.48)
      px(cx, hz - 7, '#f4f4f0', 6, 5)
      px(cx + 5, hz - 7, '#c8c8d0', 1, 5)
      for (let i = 0; i < 7; i++) px(cx + 1, hz - 8 - i, i < 2 ? '#f4f4f0' : '#8a8a96', i < 3 ? 2 : 1, 1)
      this.windows.push({ x: cx + 2, y: hz - 5, on: 0.3 })
      // Vardøhus: a low green star of ramparts at the end of the town
      const fx = landW - 16
      for (let x = fx; x < fx + 13; x++) {
        const tip = Math.abs(((x - fx) % 6) - 3) < 1 ? 1 : 0
        px(x, hz - 3 - tip, '#6a8a4a')
        px(x, hz - 2, '#8a8a7a')
      }
      px(fx + 6, hz - 9, '#e8e4dc', 1, 6)
      px(fx + 7, hz - 9, '#c8303a', 3, 2)
      // Hornøya with its bird cliff and the lighthouse
      const hx = Math.round(W * 0.74)
      const hw = Math.round(W * 0.2)
      const ht = land(hx, hx + hw, 7, 2, '#4a4a54', '#6a6a60')
      for (let i = 0; i < 26; i++) px(hx + 2 + r() * hw * 0.45, hz - 2 - r() * 6, '#e8e4d8')
      const lx = hx + Math.round(hw * 0.6)
      const ly = ht(lx)
      px(lx, ly - 6, '#f4f4f0', 2, 6)
      px(lx + 1, ly - 6, '#c8c8d0', 1, 6)
      px(lx - 1, ly - 8, '#c8303a', 4, 2)
      px(lx, ly - 9, '#2a2438', 2, 1)
      this.farLamp = { x: lx + 1, y: ly - 7 }
      this.vaLamp = true
      // a little harbour light on the breakwater
      px(landW + 1, hz - 3, '#5a5a68', 6, 1)
      this.windows.push({ x: landW + 6, y: hz - 4, on: 0.1 })
    } else if (far === 'coast') {
      // the low south shore of Varangerfjorden, a fishing village and its breakwater
      const landW = Math.round(W * 0.66)
      land(0, landW, 4, 0.8, '#4a5040', '#6a6e52')
      const vx = Math.round(W * 0.18)
      for (let i = 0; i < 6; i++) house(vx + i * 6 + Math.floor(r() * 2), 4, 2 + Math.floor(r() * 2), ['#f4ecdc', '#c8423a', '#f0b43c'][i % 3], hz - 2)
      px(vx + 38, hz - 2, '#5a5a68', 10, 1)
      this.windows.push({ x: vx + 47, y: hz - 3, on: 0.05 })
      // a road along the shore with a car's lights now and then
      px(0, hz - 2, '#6a6a5a', landW - 4, 1)
    } else if (far === 'open') {
      // a trawler working on the banks, far off
      const tx = Math.round(W * 0.74)
      const b = hz - 2
      for (let x = 0; x < 18; x++) {
        const sheer = x > 13 ? 1 : 0
        px(tx + x, b - 2 - sheer, '#2a3040', 1, 3 + sheer)
      }
      px(tx + 11, b - 6, '#e8e8ec', 5, 3)
      px(tx + 12, b - 5, '#26304e', 3, 1)
      this.windows.push({ x: tx + 12, y: b - 5, on: 0.05 }, { x: tx + 14, y: b - 5, on: 0.05 })
      px(tx + 13, b - 10, '#8a8a96', 1, 4)
      this.windows.push({ x: tx + 13, y: b - 11, on: 0 })
      px(tx + 1, b - 7, '#f2a83a', 1, 4)
      px(tx + 4, b - 7, '#f2a83a', 1, 4)
      px(tx + 1, b - 7, '#f2a83a', 4, 1)
    } else {
      // the open Barents Sea; Bjørnøya only just showing at the edge of the world
      g.globalAlpha = 0.3
      const bx = Math.round(W * 0.05)
      const bw = Math.round(W * 0.22)
      for (let x = 0; x < bw; x++) {
        const u = x / (bw - 1)
        const h = Math.round(4 * Math.min(1, u * 5, (1 - u) * 3) + (u > 0.7 && u < 0.85 ? 1 : 0))
        px(bx + x, hz - h - 1, '#8a98b8', 1, h)
      }
      g.globalAlpha = 1
      const sx = Math.round(W * 0.88)
      px(sx, hz - 2, '#3a4050', 6, 1)
      px(sx + 3, hz - 4, '#c8ccd8', 2, 2)
      this.windows.push({ x: sx + 3, y: hz - 4, on: 0 })
    }
  }

  /** Net and pot buoys on this ground, from left to right: pots in a string, nets on their staves */
  private buoyList() {
    const va = vaOf(this.s)
    if (!va) return []
    const g = groundOf(this.s)
    const W = this.W
    const out: { x: number; net: boolean; full: boolean }[] = []
    let k = 0
    for (const n of va.nets) if (n.ground === g) out.push({ x: W - 8 - k++ * 12, net: true, full: netFull(va, n) })
    k = 0
    for (const p of va.pots) if (p.ground === g && k < 10) out.push({ x: 5 + k++ * 6, net: false, full: potFull(va, p) })
    return out
  }

  /** The buoys riding the swell; a kittiwake sits on a full net's float, which hangs lower */
  private drawBuoys(g: CanvasRenderingContext2D, hz: number, sky: Sky) {
    for (const b of this.buoyList()) {
      const bob = Math.round(Math.sin(this.t * 1.6 + b.x * 0.13) * 0.8)
      const y = hz + bob + (b.full ? 1 : 0)
      const x = Math.round(b.x)
      if (b.net) {
        // the stave with its flag
        g.fillStyle = '#4a3a2e'
        g.fillRect(x + 2, y - 13, 1, 11)
        const wave = Math.sin(this.t * 4 + x) > 0 ? 1 : 0
        g.fillStyle = '#f07a2a'
        g.fillRect(x + 3, y - 13, 3, 2)
        g.fillRect(x + 6, y - 13 + wave, 1, 2)
        g.fillStyle = '#b8521c'
        g.fillRect(x + 3, y - 12, 3, 1)
        // the float
        g.fillStyle = '#d8433a'
        g.fillRect(x, y - 4, 5, 3)
        g.fillRect(x + 1, y - 5, 3, 1)
        g.fillStyle = '#ff8a6a'
        g.fillRect(x + 1, y - 4, 1, 1)
        g.fillStyle = '#8a2a2a'
        g.fillRect(x, y - 2, 5, 1)
        if (b.full) {
          // a kittiwake resting on the float: the net is ready to haul
          g.fillStyle = '#f4f4f0'
          g.fillRect(x - 1, y - 8, 3, 2)
          g.fillRect(x - 2, y - 9, 2, 1)
          g.fillStyle = '#b8c0cc'
          g.fillRect(x, y - 8, 3, 1)
          g.fillStyle = '#1e1e28'
          g.fillRect(x + 3, y - 8, 1, 1)
          g.fillStyle = '#e8d84a'
          g.fillRect(x - 3, y - 9, 1, 1)
        }
      } else {
        g.fillStyle = b.full ? '#c89a2e' : '#f2c24a'
        g.fillRect(x, y - 3, 3, 2)
        g.fillStyle = '#fff0a0'
        g.fillRect(x, y - 3, 1, 1)
        g.fillStyle = '#3a3a48'
        g.fillRect(x + 1, y - 5, 1, 2)
      }
      g.fillStyle = rgba(rippleColour(sky), 0.6)
      g.fillRect(x - 1 + (Math.floor(this.t * 2 + x) % 2), y - 1, b.net ? 7 : 5, 1)
    }
  }

  /** Ropes from the buoys down into the dark, so you can see where the gear stands */
  private drawBuoyLines(g: CanvasRenderingContext2D, surf: number) {
    for (const b of this.buoyList()) {
      const x = Math.round(b.x) + (b.net ? 2 : 1)
      for (let d = 1; d < 40; d += 1) {
        const a = 0.5 * (1 - d / 40)
        g.fillStyle = rgba(b.net ? '#e8d8b0' : '#c8c0a0', a)
        g.fillRect(x + Math.round(Math.sin(this.t * 0.8 + d * 0.15 + b.x) * (d / 40) * 2), surf + d, 1, 1)
      }
    }
  }

  /** Petersburg on its pilings to the left, and icebergs from the LeConte Glacier drifting by */
  private paintFarAk() {
    if (this.farLit === false) return
    this.farLit = false
    const { W, hz } = this
    this.farC = canvas(W, hz)
    const g = this.farC.g
    const r = rng(8)
    const landW = Math.round(W * 0.36)
    for (let x = 0; x < landW; x++) {
      const h = Math.round(4 + 2 * Math.cos((x / landW) * Math.PI * 0.5) + Math.sin(x * 0.5) * 0.6)
      g.fillStyle = '#173a30'
      g.fillRect(x, hz - h - 2, 1, h)
      // spruce right down to the water
      if (x % 2 === 0) {
        const t = 3 + Math.floor(r() * 4)
        g.fillRect(x, hz - h - 2 - t, 1, t)
      }
    }
    // the town on pilings along the water
    this.windows = []
    const houses: [number, number, number, string][] = [
      [3, 9, 6, '#e4e0d4'],
      [14, 5, 5, '#c8423a'],
      [21, 6, 6, '#5a7a9a'],
      [29, 8, 5, '#e4e0d4'],
      [39, 5, 4, '#f0b43c'],
      [46, 6, 5, '#c8423a'],
    ]
    for (const [x, w, h, c] of houses) {
      if (x + w > landW) continue
      const base = hz - 4
      g.fillStyle = '#4a3a2e'
      for (let px = x; px < x + w; px += 2) g.fillRect(px, base, 1, 4)
      g.fillStyle = c
      g.fillRect(x, base - h, w, h)
      g.fillStyle = w > 7 ? '#a8343a' : '#2a2438'
      for (let i = 0; i < Math.ceil(w / 2) + 1; i++) g.fillRect(x - 1 + i, base - h - i, w + 2 - i * 2, 1)
      g.fillStyle = '#26304e'
      g.fillRect(x + 1, base - h + 2, 1, 1)
      this.windows.push({ x: x + 1, y: base - h + 2, on: 0.15 + r() * 0.5 })
      if (w > 5) {
        g.fillRect(x + w - 2, base - h + 2, 1, 1)
        this.windows.push({ x: x + w - 2, y: base - h + 2, on: 0.15 + r() * 0.5 })
      }
    }
    g.fillStyle = '#5a4230'
    g.fillRect(0, hz - 4, landW + 4, 1)
    // icebergs, white above and glassy blue where the water has worn them
    const berg = (bx: number, bw: number, bh: number) => {
      for (let x = 0; x < bw; x++) {
        const u = x / (bw - 1)
        const h = Math.round(bh * (0.55 + 0.45 * Math.sin(Math.PI * u)) * (0.85 + 0.15 * Math.sin(x * 1.7)))
        for (let y = 0; y < h; y++) {
          const yy = hz - h + y
          let c = y === 0 ? '#ffffff' : u < 0.45 ? '#e8f4fa' : '#bcdcec'
          if (y > h - 3) c = '#7ab8d8'
          if ((x * 3 + y) % 11 === 0 && y > 1) c = '#9ad0e8'
          g.fillStyle = c
          g.fillRect(bx + x, yy, 1, 1)
        }
      }
    }
    berg(W - 34, 16, 9)
    berg(W - 14, 8, 5)
    berg(Math.round(W * 0.5), 6, 3)
  }

  /** Bakke Creek tumbling out of the forest: a trickle behind the dam, a white cascade once it is free */
  private drawCreek(g: CanvasRenderingContext2D, hz: number, sky: Sky) {
    const free = !!this.s.flags.ak_dam
    const x0 = Math.round(this.W * 0.29)
    const top = hz - 18
    const c = mix('#e8f4fa', sky.hor, 0.35)
    const w = free ? 3 : 1
    for (let y = top; y < hz - 1; y++) {
      const flow = Math.floor(this.t * 12 - y) % 4
      g.fillStyle = rgba(c, free ? (flow === 0 ? 0.95 : 0.7) : flow === 0 ? 0.6 : 0.25)
      g.fillRect(x0 + Math.round(Math.sin(y * 0.6) * 0.6), y, w, 1)
    }
    if (free) {
      g.fillStyle = rgba(c, 0.8)
      for (let i = 0; i < 5; i++) g.fillRect(x0 - 2 + ((i * 3 + Math.floor(this.t * 6)) % 7), hz - 2, 1, 1)
      // salmon leaping at the mouth of the creek once they are home
      if (this.s.flags.ak_king) {
        const ph = (this.t * 0.7) % 1
        if (ph < 0.35) {
          const k = ph / 0.35
          g.fillStyle = '#d8584a'
          g.fillRect(x0 + 4 + Math.round(k * 6), hz - 2 - Math.round(Math.sin(Math.PI * k) * 6), 2, 1)
        }
      }
    }
  }

  /** Snowy skerries with red rorbuer and drying racks on the left, a lone skerry out in Vestfjorden */
  private paintFarLo() {
    if (this.farLit === false) return
    this.farLit = false
    const { W, hz } = this
    this.farC = canvas(W, hz)
    const g = this.farC.g
    const r = rng(14)
    const landW = Math.round(W * 0.38)
    for (let x = 0; x < landW; x++) {
      const h = Math.round(5 + 2 * Math.cos((x / landW) * Math.PI * 0.5) + Math.sin(x * 0.7) * 0.8)
      g.fillStyle = '#3a4250'
      g.fillRect(x, hz - h - 1, 1, h)
      g.fillStyle = '#eef2f8'
      g.fillRect(x, hz - h - 1, 1, 2)
    }
    this.windows = []
    // red and yellow rorbuer on poles at the water's edge
    for (let x = 3; x < landW - 8; x += 8 + Math.floor(r() * 3)) {
      const c = r() < 0.75 ? '#a8343a' : '#e8b83a'
      const base = hz - 3
      g.fillStyle = '#3e2e24'
      for (let px = x; px < x + 6; px += 2) g.fillRect(px, base, 1, 3)
      g.fillStyle = c
      g.fillRect(x, base - 4, 6, 4)
      g.fillStyle = '#eef2f8'
      for (let i = 0; i < 4; i++) g.fillRect(x - 1 + i, base - 5 - i, 8 - i * 2, 1)
      g.fillStyle = '#26304e'
      g.fillRect(x + 2, base - 3, 1, 1)
      this.windows.push({ x: x + 2, y: base - 3, on: 0.1 + r() * 0.4 })
    }
    // a drying rack full of fish
    const hx = landW + 2
    g.fillStyle = '#6a5040'
    for (let x = hx; x < hx + 14; x += 4) g.fillRect(x, hz - 9, 1, 8)
    g.fillRect(hx, hz - 9, 14, 1)
    g.fillStyle = '#9a9488'
    for (let x = hx + 1; x < hx + 14; x += 2) g.fillRect(x, hz - 8, 1, 3)
    // a skerry with snow on it out in the fjord
    const sx = Math.round(W * 0.78)
    for (let i = -9; i <= 9; i++) {
      const h = Math.round(5 * Math.sqrt(Math.max(0, 1 - (i / 9) ** 2)) + (i % 3 === 0 ? 1 : 0))
      g.fillStyle = '#3a4250'
      g.fillRect(sx + i, hz - h, 1, h)
      g.fillStyle = '#eef2f8'
      g.fillRect(sx + i, hz - h, 1, Math.min(2, h))
    }
  }

  /** Hilo's old wooden bayfront on the left and Coconut Island with its palms out in the bay */
  private paintFarHi() {
    if (this.farLit === false) return
    this.farLit = false
    const { W, hz } = this
    this.farC = canvas(W, hz)
    const g = this.farC.g
    const r = rng(12)
    const landW = Math.round(W * 0.4)
    for (let x = 0; x < landW; x++) {
      const h = Math.round(5 + 2 * Math.cos((x / landW) * Math.PI * 0.5))
      g.fillStyle = '#2a5a2e'
      g.fillRect(x, hz - h - 1, 1, h)
      g.fillStyle = '#4a8a3a'
      g.fillRect(x, hz - h - 1, 1, 1)
    }
    g.fillStyle = '#1e1e26'
    g.fillRect(0, hz - 2, landW + 2, 2)
    // the bayfront: old two-storey shops with false fronts in faded colours
    this.windows = []
    let x = 2
    const cols = ['#e8c87a', '#8ac0b0', '#e89a7a', '#f0ece0', '#a8b8e0', '#e8b0c0']
    while (x < landW - 8) {
      const w = 6 + Math.floor(r() * 4)
      const h = 6 + Math.floor(r() * 4)
      const base = hz - 3
      g.fillStyle = cols[Math.floor(r() * cols.length)]
      g.fillRect(x, base - h, w, h)
      g.fillStyle = '#5a4a3e'
      g.fillRect(x, base - h, w, 1)
      g.fillRect(x, base - 3, w, 1)
      g.fillStyle = '#26304e'
      for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        g.fillRect(wx, base - h + 2, 1, 2)
        this.windows.push({ x: wx, y: base - h + 2, on: 0.15 + r() * 0.5 })
      }
      x += w + 1
    }
    // a few palms along the waterfront
    const palm = (px: number, py: number, h: number) => {
      g.fillStyle = '#6a5038'
      for (let i = 0; i < h; i++) g.fillRect(px + Math.round(Math.sin(i * 0.25) * 1.2), py - i, 1, 1)
      const tx = px + Math.round(Math.sin(h * 0.25) * 1.2)
      const ty = py - h
      g.fillStyle = '#2e7a3a'
      for (const [dx, dy] of [[-3, 1], [-2, 0], [-1, 0], [1, 0], [2, 0], [3, 1], [-4, 2], [4, 2], [0, -1], [-1, 1], [1, 1]]) g.fillRect(tx + dx, ty + dy, 1, 1)
    }
    palm(landW - 4, hz - 3, 10)
    palm(landW - 12, hz - 3, 8)
    // Coconut Island: a small round island with a bridge and tall palms
    const ix = Math.round(W * 0.66)
    for (let i = -12; i <= 12; i++) {
      const h = Math.round(4 * Math.sqrt(Math.max(0, 1 - (i / 12) ** 2)))
      g.fillStyle = '#2e6a32'
      g.fillRect(ix + i, hz - h - 1, 1, h)
      g.fillStyle = '#e8d8a8'
      g.fillRect(ix + i, hz - 1, 1, 1)
    }
    palm(ix - 6, hz - 3, 11)
    palm(ix + 1, hz - 4, 14)
    palm(ix + 7, hz - 3, 10)
    g.fillStyle = '#8a7a6a'
    for (let i = 0; i < 16; i++) g.fillRect(ix - 28 + i, hz - 2 - (i % 4 === 0 ? 1 : 0), 1, 1)
  }

  /** Humpbacks: a blow, the long back with its little fin, and the tail as it dives */
  private drawWhales(g: CanvasRenderingContext2D, hz: number, sky: Sky) {
    if (WORLD === 'norge') return
    const t = this.t
    const dark = mix('#3e4658', sky.hor, 0.2)
    const rim = mix('#8a96aa', sky.hor, 0.3)
    const pale = mix('#f0f4f8', sky.hor, 0.25)
    for (const w of this.whales) {
      const k = (t - w.t0) / 7
      if (k < 0 || k > 1) continue
      const x = Math.round(w.x + w.dir * k * 18)
      if (w.orca) {
        // a tall black fin, a black back and the white patch behind the eye
        if (k > 0.1 && k < 0.6) {
          const q = (k - 0.1) / 0.5
          const lift = Math.sin(Math.PI * q) * 3
          const bx = x + Math.round(q * 6) * w.dir
          g.fillStyle = '#14141c'
          for (let i = -6; i <= 6; i++) {
            const h = Math.round(lift * Math.cos((i / 6) * (Math.PI / 2)))
            if (h > 0) g.fillRect(bx + i, hz - h, 1, h)
          }
          const fin = Math.round(lift * 2.6)
          for (let y = 0; y < fin; y++) g.fillRect(bx - Math.round(y * 0.25) * w.dir, hz - Math.round(lift) - y, Math.max(1, 3 - Math.floor((y * 3) / fin)), 1)
          if (lift > 1.5) {
            g.fillStyle = '#f4f4f0'
            g.fillRect(bx + 4 * w.dir, hz - Math.round(lift) + 1, 2, 1)
          }
        }
        continue
      }
      if (w.breach) {
        // a humpback throwing itself out of the water and crashing back on its side
        if (k < 0.45) {
          const q = k / 0.45
          const up = Math.sin(Math.PI * q) * 20
          const tilt = q * 1.2
          for (let i = 0; i < 22; i++) {
            const by = hz - Math.round(i * Math.cos(tilt) * (up / 20))
            const bx = x + Math.round(i * Math.sin(tilt) * w.dir)
            if (by >= hz) continue
            const wdt = i < 4 ? 3 : i > 16 ? 2 : 4
            g.fillStyle = i % 4 === 1 ? pale : dark
            g.fillRect(bx - 1, by, wdt, 1)
            if (i === 12) {
              g.fillStyle = pale
              g.fillRect(bx + 3 * w.dir, by + 1, 3 * w.dir, 1)
            }
          }
        } else if (k < 0.7) {
          const q = (k - 0.45) / 0.25
          g.fillStyle = rgba(pale, 0.9 * (1 - q))
          for (let i = 0; i < 16; i++) g.fillRect(x + 8 * w.dir + Math.round(Math.sin(i * 2.3) * (4 + q * 10)), hz - 1 - Math.round(Math.abs(Math.cos(i * 1.7)) * (1 - q) * 10), 1, 1)
        }
        continue
      }
      // the blow
      if (k < 0.18) {
        const q = k / 0.18
        g.fillStyle = rgba(pale, 0.7 * (1 - q))
        for (let i = 0; i < 14 * q + 2; i++) g.fillRect(x + Math.round(Math.sin(i * 1.3) * (i / 4)), hz - 2 - i, 1 + (i > 6 ? 2 : 1), 1)
      }
      // the back rolling over
      if (k > 0.08 && k < 0.5) {
        const q = (k - 0.08) / 0.42
        const lift = Math.sin(Math.PI * q) * 5.5
        for (let i = -13; i <= 13; i++) {
          const h = Math.round(lift * Math.cos((i / 13) * (Math.PI / 2)))
          if (h <= 0) continue
          const bx = x + i * w.dir - Math.round(q * 10) * w.dir
          g.fillStyle = dark
          g.fillRect(bx, hz - h, 1, h)
          g.fillStyle = rim
          g.fillRect(bx, hz - h, 1, 1)
        }
        if (q > 0.4) {
          const fx = x - Math.round(q * 10) * w.dir - 7 * w.dir
          g.fillStyle = dark
          g.fillRect(fx, hz - Math.round(lift) - 2, 1, 3)
          g.fillRect(fx - w.dir, hz - Math.round(lift) - 3, 1, 2)
        }
      }
      // the tail lifting before the dive
      if (k > 0.55 && k < 0.95) {
        const q = (k - 0.55) / 0.4
        const up = Math.sin(Math.PI * q) * 14
        const tx = x - 6 * w.dir
        g.fillStyle = dark
        for (let y = 0; y < up - 4; y++) g.fillRect(tx - 1, hz - y - 1, 3 - (y > 6 ? 1 : 0), 1)
        const top = Math.round(hz - up)
        // the flukes, black on top and white underneath, spread like a swallow's tail
        for (let i = -8; i <= 8; i++) {
          const a = Math.abs(i)
          const yy = top + Math.round(a * 0.35) - (a > 5 ? 1 : 0)
          g.fillStyle = a < 2 ? dark : (i + 9) % 3 === 0 ? dark : pale
          g.fillRect(tx + i, yy, 1, a > 6 ? 1 : 3)
          g.fillStyle = rim
          g.fillRect(tx + i, yy - 1, 1, 1)
        }
        if (q > 0.5 && Math.floor(t * 8) % 2) {
          g.fillStyle = rgba(pale, 0.8)
          g.fillRect(tx - 3, top + 4, 1, 1)
          g.fillRect(tx + 4, top + 5, 1, 1)
        }
      }
    }
    // Den gamle, come all the way from Skjærvik, lying blue and glowing beside the boat
    if (this.gamle) {
      const k = Math.min(1, (t - this.gamle.t0) / 3)
      const bx = this.gamleX()
      const len = 26
      const lift = 4 * k + Math.sin(t * 0.7) * 0.5
      for (let i = -len; i <= len; i++) {
        const h = Math.round(lift * Math.cos((i / len) * (Math.PI / 2)))
        if (h <= 0) continue
        g.fillStyle = (i * 7) % 11 === 0 ? '#e8f4ff' : '#2a5aa8'
        g.fillRect(bx + i, hz - h, 1, h)
        g.fillStyle = '#8ad0ff'
        g.fillRect(bx + i, hz - h, 1, 1)
      }
    }
    // a mother and her calf resting at the surface next to the boat
    if (this.calf) {
      const k = Math.min(1, (t - this.calf.t0) / 2)
      for (const [ox, len, lift] of [
        [64, 15, 5],
        [44, 8, 3],
      ]) {
        const bx = this.boatX + ox
        const h0 = lift * k + Math.sin(t * 0.8 + ox) * 0.6
        for (let i = -len; i <= len; i++) {
          const h = Math.round(h0 * Math.cos((i / len) * (Math.PI / 2)))
          if (h <= 0) continue
          g.fillStyle = dark
          g.fillRect(bx + i, hz - h, 1, h)
          g.fillStyle = rim
          g.fillRect(bx + i, hz - h, 1, 1)
        }
        // blows now and then, the calf more often
        const ph = (t * (len < 10 ? 0.5 : 0.3) + ox) % 1
        if (ph < 0.2 && k >= 1) {
          g.fillStyle = rgba(pale, 0.7 * (1 - ph / 0.2))
          for (let i = 0; i < (len < 10 ? 6 : 11); i++) g.fillRect(bx + 4 + Math.round(Math.sin(i) * (i / 4)), hz - lift - 1 - i, 1, 1)
        }
      }
    }
    // flying fish gliding low over the waves
    for (const f of this.flyers) {
      const k = (t - f.t0) / 1.6
      if (k < 0 || k > 1) continue
      const fx = Math.round(this.W * 0.95 - k * 70)
      const fy = Math.round(hz - 2 - Math.sin(Math.PI * k) * 5 - f.y)
      g.fillStyle = '#c8d8e8'
      g.fillRect(fx, fy, 3, 1)
      g.fillStyle = '#6a8ab8'
      g.fillRect(fx + 1, fy - 1 + (Math.floor(t * 20) % 2), 2, 1)
    }
    // bubble netting: a ring of bubbles, then mouths bursting up through the middle
    if (this.net) {
      const k = (t - this.net.t0) / 5
      const x = this.net.x
      if (k > 1) this.net = null
      else {
        const rad = 6 + Math.min(1, k * 2) * 8
        g.fillStyle = rgba(pale, 0.85)
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2 + t
          if (Math.sin(t * 9 + i) > -0.2) g.fillRect(Math.round(x + Math.cos(a) * rad), hz - 1 + Math.round(Math.sin(a) * 0.8), 1, 1)
        }
        if (k > 0.5) {
          const q = (k - 0.5) / 0.5
          const lift = Math.sin(Math.PI * q) * 11
          for (const [ox, d] of [
            [-5, 0],
            [0, 0.15],
            [5, 0.05],
          ]) {
            const h = Math.round(lift * (1 - d))
            for (let y = 0; y < h; y++) {
              const wdt = Math.max(1, 3 - Math.floor(y / 4))
              g.fillStyle = y > h - 3 ? '#e88a9a' : y % 3 === 1 ? pale : dark
              g.fillRect(Math.round(x + ox - wdt / 2), hz - y - 1, wdt, 1)
            }
          }
          g.fillStyle = rgba(pale, 0.7 * (1 - q))
          for (let i = 0; i < 10; i++) g.fillRect(Math.round(x + Math.sin(i * 2.1) * 9), hz - 2 - Math.round(q * 8 * ((i % 3) + 1) * 0.5), 1, 1)
        }
      }
    }
  }

  /** The world above the surface, painted into `sc` with its waterline on the bottom edge */
  private paintSurface(time: number): Sky {
    const { W, hz } = this
    const sg = this.sc.g
    sg.clearRect(0, 0, W, hz)
    const wx = weatherAt(this.s.day, time)
    if (this.va) this.bd.aurora = auroraStrength(this.s.day ?? 0, time)
    const sky = this.bd.draw(sg, this.t, time, wx)
    this.paintFar()

    const wg = this.work.g
    wg.clearRect(0, 0, W, hz)
    wg.drawImage(this.farC.c, 0, 0)
    // gulls in daylight
    if (sky.night < 0.6)
      for (let i = 0; i < 3; i++) {
        const span = W + 40
        const gx = ((((this.t * (8 + i * 3) + i * 90) % span) + span) % span) - 20
        const gy = Math.round(hz * (0.2 + i * 0.12) + Math.sin(this.t + i) * 3)
        if (this.va) wg.drawImage(this.kitti[[0, 1, 2, 1][Math.floor(this.t * 4 + i) % 4]], Math.round(gx), gy)
        else wg.drawImage(this.gulls[Math.floor(this.t * 3 + i) % 2], Math.round(gx), gy)
      }
    if (this.va) this.drawBuoys(wg, hz, sky)
    this.drawWhales(wg, hz, sky)
    if (WORLD === 'alaska') this.drawCreek(wg, hz, sky)
    this.drawBoat(wg, hz)
    tintAmbient(wg, time, W, hz)
    if (wx.rain > 0) {
      wg.globalCompositeOperation = 'source-atop'
      wg.fillStyle = rgba('#2a3048', wx.rain * 0.3)
      wg.fillRect(0, 0, W, hz)
      wg.globalCompositeOperation = 'source-over'
    }
    sg.drawImage(this.work.c, 0, 0)
    this.bd.fogOver(sg, sky, wx.fog)
    // Den gamle shines through the dark, so her light goes on after the night tint
    if (this.gamle) {
      const k = Math.min(1, (this.t - this.gamle.t0) / 3)
      const bx = this.gamleX()
      light(sg, bx, hz - 2, 30, '#6ab8ff', 0.45 * k)
      light(sg, bx, hz - 3, 12, '#c8f0ff', 0.35 * k)
      for (let i = -24; i <= 24; i += 5) {
        const tw = Math.sin(this.t * 2 + i) > 0 ? 1 : 0.4
        sg.fillStyle = rgba('#e8f8ff', 0.8 * k * tw)
        sg.fillRect(bx + i, hz - Math.round(3 * k * Math.cos((i / 26) * (Math.PI / 2))), 1, 1)
      }
    }

    // lights
    const night = sky.night
    for (const w of this.windows) {
      const a = Math.max(0, Math.min(1, (night - w.on) * 5))
      if (a <= 0) continue
      sg.fillStyle = rgba('#ffc45a', a)
      sg.fillRect(w.x, w.y, 1, 1)
      light(sg, w.x, w.y, 3, '#ffa040', a * 0.35)
    }
    if (this.vaLamp) {
      light(sg, this.farLamp.x, this.farLamp.y, 5, '#ffe6a0', 0.25 + night * 0.4)
      if (night > 0.3) drawBeam(sg, this.farLamp.x, this.farLamp.y, this.t * 0.9, 120, night * 0.8)
    }
    if (night > 0.2) {
      const lx = this.boatX + this.geo.lantern.x
      const ly = hz - this.geo.wl + this.bob + this.geo.lantern.y
      sg.fillStyle = '#ffe08a'
      sg.fillRect(lx, ly, 1, 1)
      light(sg, lx, ly, 9, '#ffa040', night * 0.55)
    }
    if (this.farLit) {
      light(sg, this.farLamp.x, this.farLamp.y, 7, '#ffe6a0', 0.5 + night * 0.3)
      drawBeam(sg, this.farLamp.x, this.farLamp.y, this.t * 0.8, 150, Math.max(0.3, night))
    }
    for (const h of this.hearts) {
      sg.globalAlpha = 1 - h.t / 1.4
      sg.drawImage(this.heart, Math.round(h.x + Math.sin(h.t * 5) * 2), Math.round(h.y - h.t * 14 + hz))
      sg.globalAlpha = 1
    }
    return sky
  }

  draw(g: CanvasRenderingContext2D) {
    const { W, H, hz } = this
    const cam = Math.round(this.camY)
    const surf = -cam
    const time = this.s.time
    const night = nightness(time)

    // the world above water, and the light of the moment
    const wx = weatherAt(this.s.day, time)
    let sky: Sky
    if (surf > -2) {
      sky = this.paintSurface(time)
      g.drawImage(this.sc.c, 0, surf - hz)
    } else {
      const [top, hor] = skyAt(time, wx)
      sky = { top, hor, night, gold: golden(time) * (1 - night) * (1 - wx.rain), sun: null }
    }

    // water background
    const wy0 = Math.max(0, cam)
    g.drawImage(this.water.bg, 0, wy0, W, H, 0, wy0 - cam, W, H)

    // the colour of the sky reaches down into the shallows
    const [amb, ambA] = ambientAt(time)
    if (ambA > 0 && surf < H)
      for (let y = Math.max(0, surf); y < Math.min(H, surf + 240); y += 3) {
        const k = (y - surf) / 240
        g.fillStyle = rgba(amb, ambA * 0.55 * (1 - k))
        g.fillRect(0, y, W, 3)
      }

    // grey days make for murky water
    const murk = wx.rain * 0.25 + wx.fog * 0.12
    if (murk > 0 && surf < H) {
      g.fillStyle = rgba('#1a2238', murk)
      g.fillRect(0, Math.max(0, surf), W, H)
    }

    // the sky and the boat mirrored on the underside of the surface
    const R = Math.min(34, H - surf - 1)
    if (surf > -R && R > 0) {
      drawReflection(g, this.sc.c, this.t, sky, surf + 1, R, { fill: false, fade: 1 })
      drawRipples(g, this.t, sky, W, surf + 1, R, 24)
      drawGlitter(g, this.t, sky, surf + 1, R)
    }

    if (surf + 260 > 0) this.drawLightShafts(g, surf, sky, 1 - wx.rain * 0.75 - wx.fog * 0.4)

    // plants grow upwards from their root, so cull by how far up they reach, not by the root alone
    for (const d of this.water.deco) {
      const y = d.y - cam
      if (y > -30 && y - d.len - 20 < H) drawDeco(g, d, cam, this.t)
    }

    // a humpback gliding past far behind everything, just a long shadow
    if (WORLD !== 'norge') {
      const span = W + 160
      const wx = ((this.t * 4) % span) - 80
      const wy = 170 + Math.sin(this.t * 0.05) * 40 - cam
      if (wy > -30 && wy < H + 30) {
        g.fillStyle = rgba(mix(ZONES[0].water[1], '#06101e', 0.6), 0.32)
        for (let i = 0; i < 60; i++) {
          const u = i / 59
          const h = Math.round(9 * Math.sin(Math.PI * Math.pow(u, 0.7)) + 1)
          g.fillRect(Math.round(wx + 30 - i), Math.round(wy - h / 2 + Math.sin(this.t + i * 0.08) * 0.8), 1, h)
        }
        // the long white-edged flipper and the tail
        g.fillRect(Math.round(wx + 14), Math.round(wy + 3), 2, 1)
        for (let i = 0; i < 14; i++) g.fillRect(Math.round(wx + 14 - i), Math.round(wy + 4 + i * 0.4), 2, 1)
        for (let i = -5; i <= 5; i++) g.fillRect(Math.round(wx - 31 - Math.abs(i) * 0.3), Math.round(wy + i + Math.sin(this.t * 1.5) * 1.5), 2, 1)
      }
    }

    // fish schools far behind, just shadows in the water
    for (const sc of this.schools) {
      const y0 = sc.y - cam
      if (y0 < -20 || y0 > H + 20) continue
      g.fillStyle = rgba(mix(skyAt(time)[0], '#08142a', 0.7), 0.28)
      for (let i = 0; i < sc.n; i++) {
        const fx = Math.round(sc.x + Math.sin(i * 2.1 + sc.ph) * 12 + Math.sin(this.t * 0.8 + i) * 1.5)
        const fy = Math.round(y0 + Math.cos(i * 1.7 + sc.ph) * 6 + Math.sin(this.t * 1.1 + i * 0.7) * 1)
        g.fillRect(fx, fy, 3, 1)
        g.fillRect(fx + (sc.dir === 1 ? -1 : 3), fy + (Math.floor(this.t * 4 + i) % 2 ? -1 : 1) * 0, 1, 1)
      }
    }

    // jellyfish
    for (const j of this.jellies) {
      const y = j.y + Math.sin(this.t * 0.5 + j.ph) * 14 - cam
      if (y < -20 || y > H + 20) continue
      g.globalAlpha = 0.75
      g.drawImage(this.jellyImgs[Math.floor(this.t * 1.5 + j.ph) % 2], Math.round(j.x + Math.sin(this.t * 0.3 + j.ph) * 8), Math.round(y))
      g.globalAlpha = 1
    }

    // letter tin, Pomor find or ghost net
    const item = this.letterItem()
    if (item?.kind === 'ghostnet') this.drawGhostNet(g, item.x, item.y - cam)
    else if (item) g.drawImage(this.tin, item.x, item.y - cam - 4)

    // Selma's hydrophones on the rock, and a mark where the next one goes
    const hy = this.hydroTarget()
    const devices = WORLD === 'alaska' ? HYDRO_DEPTHS.slice(0, this.s.hydro.placed) : WORLD === 'hawaii' ? BUOY_DEPTHS.slice(0, this.s.buoys.placed) : []
    if (WORLD !== 'norge') {
      for (const depth of devices) {
        const y = Math.round(depthToY(depth))
        if (y - cam < -10 || y - cam > H + 10) continue
        g.drawImage(this.hydro, this.water.wallL[y] - 1, y - cam - 4)
      }
      if (hy !== null && this.mode !== 'idle' && hy - cam > -4 && hy - cam < H + 4) {
        const y = hy - cam
        const on = Math.sin(this.t * 4) > 0
        g.fillStyle = on ? 'rgba(255,216,74,0.7)' : 'rgba(255,216,74,0.35)'
        const xl = this.water.wallL[hy]
        const xr = W - this.water.wallR[hy]
        for (let x = xl + 2; x < xr - 2; x += 5) g.fillRect(x, y, 2, 1)
      }
    }

    // fish
    for (const f of this.fish) this.drawFish(g, f, cam, false)

    // line and lure
    const lx = Math.round(this.lure.x)
    const ly = Math.round(this.lure.y - cam)
    const tip = this.rodTip(cam)
    g.strokeStyle = 'rgba(240,240,255,0.55)'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(tip.x + 0.5, tip.y + 0.5)
    g.lineTo(lx + 0.5, ly + 0.5)
    g.stroke()
    g.fillStyle = '#c8ccd8'
    g.fillRect(lx, ly, 1, 3)
    g.fillRect(lx + 1, ly + 3, 1, 1)
    g.fillStyle = ['#d86a6a', '#e8eef4', '#ffd84a', '#7affd8'][this.s.gear.lure]
    g.fillRect(lx - 1, ly + 1, 2, 2)
    if (this.carrying === 'ghostnet') this.drawGhostNet(g, lx - 5, ly + 3)
    else if (this.carrying) g.drawImage(this.tin, lx - 4, ly + 3)
    if (hy !== null && ly > surf) g.drawImage(this.hydro, lx - 2, ly + 3)

    for (const b of this.bubbles) {
      const by = Math.round(b.y - cam)
      if (by <= surf) continue
      g.fillStyle = rgba('#e8fbff', 0.6 * (1 - b.t / 1.5))
      g.fillRect(Math.round(b.x + Math.sin(b.t * 6) * 1.5), by, 1, 1)
      if (b.t < 0.4) {
        g.fillStyle = rgba('#e8fbff', 0.3)
        g.fillRect(Math.round(b.x + Math.sin(b.t * 6) * 1.5) + 1, by - 1, 1, 1)
      }
    }

    // surface: the hull under water, foam and the wave line
    if (surf > -4 && surf < H) {
      const geo = this.geo
      const top = surf - geo.wl + this.bob
      const sub = surf + 1 - top
      if (sub > 0 && sub < geo.h) {
        g.globalAlpha = 0.3
        g.drawImage(this.boatImg, 0, sub, geo.w, geo.h - sub, this.boatX, surf + 1, geo.w, geo.h - sub)
        g.globalAlpha = 1
      }
      if (this.va) this.drawBuoyLines(g, surf)
      const hi = rippleColour(sky)
      for (const crest of [false, true]) {
        g.fillStyle = rgba(hi, crest ? 0.75 : 0.35)
        g.beginPath()
        for (let x = 0; x < W; x++) {
          const w = Math.sin(x * 0.12 + this.t * 1.6) + Math.sin(x * 0.05 - this.t)
          if (w > 0.6 === crest) g.rect(x, surf + (w > -0.4 ? 0 : 1), 1, 1)
        }
        g.fill()
      }
      g.fillStyle = rgba('#ffffff', 0.6)
      g.beginPath()
      for (let x = this.boatX + geo.foam[0]; x < this.boatX + geo.foam[1]; x++) if (Math.sin(x * 0.9 + this.t * 3) > 0.5) g.rect(x, surf + 1, 1, 1)
      g.fill()
    }

    // marine snow drifting past, with parallax
    for (const m of this.snow) {
      const sy = ((((m.y + this.t * 2 * m.z - cam * m.z) % H) + H) % H)
      if (sy <= surf + 3) continue
      const sx = Math.round(m.x + Math.sin(this.t * 0.4 + m.ph) * 2)
      g.fillStyle = rgba('#d8e8f4', 0.1 + 0.28 * m.z)
      g.fillRect(sx, Math.round(sy), 1, 1)
    }

    if (surf > 0) {
      g.save()
      g.beginPath()
      g.rect(0, 0, W, surf + 1)
      g.clip()
      this.rain.draw(g, wx.rain, night)
      g.restore()
    }

    this.drawDarkness(g, cam, surf, night)
    this.drawUnge(g, surf)

    // things that glow
    g.globalCompositeOperation = 'lighter'
    for (const gl of this.water.glows) {
      const y = gl.y - cam
      if (y < -6 || y > H + 6) continue
      const tw = 0.6 + 0.4 * Math.sin(this.t * 2 + gl.x)
      glow(g, gl.x, y, 3, gl.c, 0.5 * tw)
    }
    for (const d of this.water.deco)
      if (d.kind === 'glowplant') {
        const y = d.y - cam - Math.round(d.len) + 1
        if (y < -6 || y > H + 6) continue
        glow(g, d.x, y, 3, d.color, 0.55)
      }
    for (const d of this.water.deco)
      if (d.kind === 'vent' && d.y - cam > -40 && d.y - cam < H + 40) glow(g, d.x, d.y - cam - d.len, 12, '#ff6a2a', 0.3 + 0.1 * Math.sin(this.t * 3 + d.seed))
    for (const j of this.jellies) {
      const y = j.y + Math.sin(this.t * 0.5 + j.ph) * 14 - cam
      if (y < -20 || y > H + 20) continue
      glow(g, j.x + Math.sin(this.t * 0.3 + j.ph) * 8 + 4, y + 3, 9, this.va ? '#a8b8ff' : WORLD === 'alaska' ? '#ff8a5a' : '#ff7ac0', 0.22 + 0.08 * Math.sin(this.t * 2 + j.ph))
    }
    devices.forEach((depth, i) => {
        const y = Math.round(depthToY(depth))
        if (y - cam < -10 || y - cam > H + 10 || Math.sin(this.t * 3 + i) < 0.3) return
        glow(g, this.water.wallL[y] + 1, y - cam - 4, 3, '#6aff8a', 0.7)
      })
    for (const p of this.sparks) {
      const y = p.y - cam
      const a = (1 - p.t / 1.4) * (p.t < 0.15 ? p.t / 0.15 : 1)
      glow(g, p.x, y, 2, p.c, a * 0.8)
    }
    g.globalCompositeOperation = 'source-over'
    for (const p of this.sparks) {
      g.fillStyle = rgba(p.c, 1 - p.t / 1.4)
      g.fillRect(Math.round(p.x), Math.round(p.y - cam), 1, 1)
    }
    for (const gl of this.water.glows) {
      const y = gl.y - cam
      if (y < -4 || y > H + 4) continue
      g.fillStyle = gl.c
      g.fillRect(gl.x, y, 1, 1)
    }
    for (const d of this.water.deco)
      if (d.kind === 'glowplant') {
        const y = d.y - cam - Math.round(d.len) + 1
        if (y < -4 || y > H + 4) continue
        g.fillStyle = d.color
        g.fillRect(Math.round(d.x), y, 1, 1)
      }
    for (const f of this.fish) this.drawFish(g, f, cam, true)
    if (item && Math.sin(this.t * 3) > 0.6) {
      g.fillStyle = '#fff8e0'
      const gx = item.x + 6
      const gy = item.y - cam - 5
      g.fillRect(gx, gy - 1, 1, 3)
      g.fillRect(gx - 1, gy, 3, 1)
    }
    if (ly > surf) {
      light(g, lx, ly + 2, 6, '#ffe8a0', this.s.gear.lamp ? 0.35 : 0.15)
      g.fillStyle = this.s.gear.lamp ? '#fff4c8' : 'rgba(255,244,200,0.6)'
      g.fillRect(lx - 1, ly + 1, 2, 2)
    }

    // bite alert
    if (this.mode === 'bite' && Math.floor(this.t * 8) % 2 === 0) g.drawImage(this.bang, lx - 1, ly - 16)

    // max depth marker
    const my = Math.round(this.maxY - cam)
    if (my > surf && my < H && this.mode !== 'idle') {
      g.fillStyle = 'rgba(255,216,74,0.45)'
      for (let x = 0; x < W; x += 4) g.fillRect(x, my + 6, 2, 1)
    }

    if (this.reel && this.mode === 'reel') {
      g.fillStyle = 'rgba(10,12,30,0.25)'
      g.fillRect(0, 0, W, H)
      this.reel.draw(g, W, H)
    }
  }

  /** Shafts of daylight slanting down from the surface, and the shimmer of caustics just below it */
  private drawLightShafts(g: CanvasRenderingContext2D, surf: number, sky: Sky, clear: number) {
    const day = (1 - sky.night) * clear
    if (day < 0.05) return
    const W = this.W
    const col = sky.sun ? mix('#e8fbff', sky.sun.c, 0.55) : '#e8fbff'
    // rays lean away from the sun
    const lean = sky.sun ? (0.5 - sky.sun.x / W) * 0.7 : 0.25
    g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 6; i++) {
      const x0 = ((i * 47 + this.t * 2.2 + Math.sin(this.t * 0.13 + i) * 10) % (W + 80)) - 40
      const w = 4 + (i % 3) * 4
      const flick = 0.55 + 0.45 * Math.sin(this.t * 0.6 + i * 2.3)
      const seg = 52
      for (let k = 0; k < 5; k++) {
        const ya = surf + k * seg
        const yb = ya + seg
        const xa = x0 + lean * k * seg
        const xb = x0 + lean * (k + 1) * seg
        const wa = w * (1 + k * 0.35)
        const wb = w * (1 + (k + 1) * 0.35)
        g.fillStyle = rgba(col, 0.075 * day * flick * (1 - k / 5))
        g.beginPath()
        g.moveTo(Math.round(xa), ya)
        g.lineTo(Math.round(xa + wa), ya)
        g.lineTo(Math.round(xb + wb), yb)
        g.lineTo(Math.round(xb), yb)
        g.fill()
      }
    }
    // caustics
    for (let d = 2; d < 30; d += 2) {
      const y = surf + d
      if (y < 0 || y >= this.H) continue
      const a = (1 - d / 30) * 0.32 * day
      g.fillStyle = rgba(col, a)
      g.beginPath()
      for (let x = 0; x < W; x++) {
        const v = Math.sin(x * 0.21 + Math.sin(d * 0.5 + this.t * 0.9) * 2.2 + this.t * 0.8) * Math.sin(x * 0.07 - this.t * 0.5 + d * 0.2)
        if (v > 0.72) g.rect(x, y, 1, 1)
      }
      g.fill()
    }
    g.globalCompositeOperation = 'source-over'
  }

  /** A lost net tangled on the rock: grey mesh with a float and a dead fish in it */
  private drawGhostNet(g: CanvasRenderingContext2D, x: number, y: number) {
    g.fillStyle = 'rgba(190,200,190,0.75)'
    for (let j = 0; j < 9; j++) for (let i = 0; i < 12; i++) if ((i + j) % 2 === 0 && Math.sin(i * 1.7 + j * 0.9) > -0.6) g.fillRect(x + i, y - 5 + j + Math.round(Math.sin(this.t + i * 0.5) * 0.6), 1, 1)
    g.fillStyle = '#d8743a'
    g.fillRect(x + 9, y - 7, 3, 2)
    g.fillStyle = '#a8b0b8'
    g.fillRect(x + 3, y, 4, 1)
    g.fillRect(x + 2, y - 1, 1, 1)
  }

  private rodTip(cam: number) {
    const geo = this.geo
    const hx = this.boatX + geo.fisher.x + FISHER_HAND.x
    const hy = this.bob - geo.wl + geo.fisher.y + FISHER_HAND.y - cam
    const bend = this.mode === 'reel' ? 7 + Math.sin(this.t * 14) : this.mode === 'bite' ? 4 : this.mode === 'land' ? 5 : 0
    return { x: hx + 18 - Math.round(bend * 0.3), y: hy - 16 + bend, hx, hy }
  }

  /** The boat with the fisher and the cat, drawn with the waterline at `surf` */
  private drawBoat(g: CanvasRenderingContext2D, surf: number) {
    const geo = this.geo
    const top = surf - geo.wl + this.bob
    const bx = this.boatX
    // fisher sits behind the gunwale
    g.drawImage(this.fisherImg, bx + geo.fisher.x, top + geo.fisher.y)
    // rod
    const tip = this.rodTip(-surf)
    const steps = 22
    for (let i = 0; i <= steps; i++) {
      const k = i / steps
      const x = tip.hx + (tip.x - tip.hx) * k
      const y = tip.hy + (tip.y - tip.hy) * k + Math.sin(k * Math.PI) * -2 * (1 - k)
      g.fillStyle = k < 0.3 ? '#6a4a32' : k > 0.92 ? '#e8e0d0' : '#a87a4a'
      g.fillRect(Math.round(x), Math.round(y), 1, 1)
    }
    // great-grandfather's boat with grandfather in it, the last nights in Lofoten
    const knut = WORLD === 'lofoten' && this.s.flags.lo_hjellFull && !this.s.flags.lo_ending
    if (knut) g.drawImage(this.knutImg, bx + 28, top - 5)
    g.drawImage(this.boatImg, bx, top)
    if (this.s.flags.cat && !knut) {
      const blink = this.catT % 4 < 0.15
      g.drawImage(this.cats[blink ? 1 : 0], bx + geo.cat.x, top + geo.cat.y)
    }
  }

  private drawFish(g: CanvasRenderingContext2D, f: Fish, cam: number, glowPass: boolean) {
    const a = f.art
    const x = Math.round(f.x - a.w / 2)
    const y = Math.round(f.y - a.h / 2 - cam)
    if (y > this.H || y + a.h < 0) return
    const fr = Math.floor(f.t * (f.state === 'hooked' ? 14 : 3 + f.speed * 0.25) + f.ph) % 2
    const img = glowPass ? (f.dir === 1 ? a.glowRight : a.glowLeft)[fr] : (f.dir === 1 ? a.right : a.left)[fr]
    if (!img) return
    g.globalAlpha = f.alpha
    if (glowPass) {
      g.save()
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = f.alpha * 0.35
      g.drawImage(img, x - 1, y)
      g.drawImage(img, x + 1, y)
      g.drawImage(img, x, y - 1)
      g.drawImage(img, x, y + 1)
      g.restore()
      g.globalAlpha = f.alpha
    }
    g.drawImage(img, x, y)
    g.globalAlpha = 1
  }

  private drawDarkness(g: CanvasRenderingContext2D, cam: number, surf: number, night: number) {
    const { W, H } = this
    const dg = this.dark.g
    dg.globalCompositeOperation = 'source-over'
    dg.clearRect(0, 0, W, H)
    let any = false
    for (let y = Math.max(0, surf + 1); y < H; y += 2) {
      const d = yToDepth(y + cam)
      const depthDark = d < 110 ? 0 : d < 400 ? ((d - 110) / 290) * 0.8 : d < 1000 ? 0.8 + ((d - 400) / 600) * 0.13 : 0.93
      const a = Math.max(depthDark, night * 0.52)
      if (a < 0.02) continue
      any = true
      dg.fillStyle = `rgba(6,8,34,${a})`
      dg.fillRect(0, y, W, 2)
    }
    if (!any) return
    // light cuts holes in the dark, with dithered edges
    dg.globalCompositeOperation = 'destination-out'
    const hole = (x: number, y: number, r: number) => {
      const R = Math.max(2, Math.round(r))
      glow(dg, x, y, R, '#000000', 1)
      glow(dg, x, y, Math.round(R * 0.55), '#000000', 1)
    }
    if (this.lure.y > 0) hole(this.lure.x, this.lure.y - cam, gearValue(this.s, 'lamp'))
    if (night > 0.2) hole(this.boatX + this.geo.lantern.x, surf - this.geo.wl + this.bob + this.geo.lantern.y, 26)
    for (const f of this.fish) {
      if (f.sp.special) hole(f.x, f.y - cam, 78)
      else if (f.sp.look.glow && f.sp.look.glowAt !== 'eye') hole(f.x, f.y - cam, 8)
    }
    for (const j of this.jellies) {
      const y = j.y + Math.sin(this.t * 0.5 + j.ph) * 14 - cam
      if (y > -20 && y < H + 20) hole(j.x + Math.sin(this.t * 0.3 + j.ph) * 8 + 4, y + 3, 10)
    }
    if (this.unge) {
      const at = this.ungeAt(surf)
      hole(at.x, at.y, 44)
    }
    g.drawImage(this.dark.c, 0, 0)
  }
}

export const zoneName = (y: number) => ZONES[zoneAt(y)].name
