// The fishing scene: the boat on the surface and the cross-section of the fjord below

import { genFish, type FishArt } from '../art/fishgen'
import { canvas, mix, rgba, rng } from '../art/pixel'
import {
  BOAT_H,
  BOAT_W,
  bangSprite,
  boatSprite,
  catSprites,
  fisherSprite,
  FISHER_HAND,
  gullSprites,
  heartSprite,
  jellySprites,
  LANTERN,
  tinSprite,
} from '../art/sprites'
import { buildWater, drawBeam, drawDeco, farLighthouse, nightness, SEABED, type Water } from '../art/scenery'
import { ambientAt, Backdrop, drawGlitter, drawReflection, drawRipples, glow, golden, light, rippleColour, skyAt, tintAmbient, type Sky } from '../art/fjord'
import { sfx } from '../audio'
import { depthToY, PAINTS, WORLD_BOTTOM, SPECIES, SPECIES_BY_ID, yToDepth, ZONE_H, ZONES, zoneAt, type Species } from './data'
import { dev } from './harbor'
import { Reel } from './reel'
import { Rain, weatherAt } from './weather'
import { gearValue, type Save } from './state'

const arts = new Map<string, FishArt>()
export function artFor(sp: Species) {
  let a = arts.get(sp.id)
  if (!a) {
    a = genFish(sp.look, sp.id)
    arts.set(sp.id, a)
  }
  return a
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
  escaped(): void
  letterFound(): void
  gamleCaught(): void
  modeChanged(): void
}

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
  private carrying = false
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
  private boatImg!: HTMLCanvasElement
  private paint = ''
  private fisherImg = fisherSprite()
  private cats = catSprites()
  private heart = heartSprite()
  private bang = bangSprite()
  private tin = tinSprite()
  private gulls = gullSprites()
  private jellyImgs = jellySprites()
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

  resize(W: number, H: number) {
    if (W === this.W && H === this.H) return
    const rebuild = W !== this.W
    this.W = W
    this.H = H
    if (rebuild) {
      this.water = buildWater(W)
      const r = rng(5)
      this.snow = Array.from({ length: 60 }, () => ({ x: r() * W, y: r() * H, z: 0.3 + r() * 0.7, ph: r() * 6 }))
      this.jellies = Array.from({ length: 5 }, () => ({ x: 20 + r() * (W - 40), y: 2 * ZONE_H + r() * ZONE_H * 2, ph: r() * 6 }))
      this.schools = Array.from({ length: 4 }, (_, i) => ({ x: r() * W, y: 50 + i * 120 + r() * 60, dir: r() < 0.5 ? 1 : -1, speed: 3 + r() * 4, n: 7 + Math.floor(r() * 6), ph: r() * 6 }))
      this.fish = []
    }
    this.dark = canvas(W, H)
    this.hz = Math.round(H * 0.42)
    this.bd.resize(W, this.hz, 5, 0.72)
    this.rain.resize(W, H)
    this.sc = canvas(W, this.hz)
    this.work = canvas(W, this.hz)
    this.farLit = null
    this.boatX = Math.round(W * 0.58) - 42
    this.tipX = this.boatX + 42
    this.tipY = -32
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
    if (this.s.flags.cat && Math.abs(sx - (this.boatX + 40)) < 9 && Math.abs(wy - (this.bob - 14)) < 10) {
      this.hearts.push({ x: this.boatX + 38, y: this.bob - 22, t: 0 })
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
    this.carrying = false
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
    if (this.paint !== this.s.paint) {
      const p = PAINTS.find((x) => x.id === this.s.paint) ?? PAINTS[0]
      this.boatImg = boatSprite(p.hull, p.stripe)
      this.paint = this.s.paint
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
          if (this.hooked) this.flee(this.hooked)
          this.hooked = null
          this.reel = null
          this.mode = 'wait'
          this.cooldown = 2
          this.host.escaped()
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
            this.carrying = false
            this.host.letterFound()
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
      f.x = L.x0 + (this.boatX + 28 - L.x0) * k
      f.y = -Math.sin(k * Math.PI) * 26 - k * 8
      if (k >= 1) {
        this.fish = this.fish.filter((x) => x !== f)
        const r = this.reel!
        this.reel = null
        this.landing = null
        if (f.sp.id === 'gamle') this.host.gamleCaught()
        else {
          const t = Math.pow(Math.random(), 1.7 / Math.sqrt(gearValue(this.s, 'lure')))
          const cm = Math.round(f.sp.cm[0] + (f.sp.cm[1] - f.sp.cm[0]) * t)
          const kg = +(f.sp.kg[0] + (f.sp.kg[1] - f.sp.kg[0]) * Math.pow(t, 2.2)).toFixed(f.sp.kg[1] < 2 ? 2 : 1)
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

  private letterItem() {
    const s = this.s
    if (!s.flags.metKnut || s.letters.found > s.letters.delivered || s.letters.delivered >= 4 || this.carrying) return null
    const y = Math.round(depthToY(LETTER_DEPTHS[s.letters.delivered]))
    const side = s.letters.delivered % 2 === 0 ? 1 : -1
    const x = side === 1 ? this.water.wallL[y] + 5 : this.W - this.water.wallR[y] - 12
    return { x, y }
  }

  private lookForBite(dt: number) {
    const item = this.letterItem()
    if (item && Math.abs(this.lure.y - item.y) < 22) {
      this.snagT += dt
      if (this.snagT > 1.2) {
        this.snagT = 0
        this.releaseInterest()
        this.carrying = true
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
    if (s.flags.finale && !s.flags.scale && this.lure.y > SEABED - 150) {
      if (this.waitT > 2 && !this.fish.some((f) => f.sp.special)) {
        const g = this.spawn(5, SPECIES_BY_ID.gamle, this.lure.y + 30)
        g.x = -40
        g.state = 'approach'
      }
      return
    }
    // fish bite better when it rains
    const rain = weatherAt(this.s.day, this.s.time).rain
    if (Math.random() > dt * 1.4 * gearValue(this.s, 'lure') * (1 + rain * 0.5)) return
    const near = this.fish.filter((f) => f.state === 'swim' && !f.sp.special && Math.abs(f.y - this.lure.y) < 46 && Math.abs(f.x - this.lure.x) < this.W)
    if (!near.length) return
    const f = near[Math.floor(Math.random() * near.length)]
    f.state = 'approach'
  }

  /** Fish schools in the distance, plankton and the far scenery */
  private updateLife(dt: number) {
    const W = this.W
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

  /** The world above the surface, painted into `sc` with its waterline on the bottom edge */
  private paintSurface(time: number): Sky {
    const { W, hz } = this
    const sg = this.sc.g
    sg.clearRect(0, 0, W, hz)
    const wx = weatherAt(this.s.day, time)
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
        wg.drawImage(this.gulls[Math.floor(this.t * 3 + i) % 2], Math.round(gx), gy)
      }
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

    // lights
    const night = sky.night
    for (const w of this.windows) {
      const a = Math.max(0, Math.min(1, (night - w.on) * 5))
      if (a <= 0) continue
      sg.fillStyle = rgba('#ffc45a', a)
      sg.fillRect(w.x, w.y, 1, 1)
      light(sg, w.x, w.y, 3, '#ffa040', a * 0.35)
    }
    if (night > 0.2) {
      const lx = this.boatX + LANTERN.x
      const ly = hz - 15 + this.bob + LANTERN.y
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

    for (const d of this.water.deco) if (d.y - cam > -80 && d.y - cam < H + 10) drawDeco(g, d, cam, this.t)

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

    // letter tin
    const item = this.letterItem()
    if (item) g.drawImage(this.tin, item.x, item.y - cam - 4)

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
    if (this.carrying) g.drawImage(this.tin, lx - 4, ly + 3)

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
      const top = surf - 15 + this.bob
      const sub = surf + 1 - top
      if (sub > 0 && sub < BOAT_H) {
        g.globalAlpha = 0.3
        g.drawImage(this.boatImg, 0, sub, BOAT_W, BOAT_H - sub, this.boatX, surf + 1, BOAT_W, BOAT_H - sub)
        g.globalAlpha = 1
      }
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
      for (let x = this.boatX + 3; x < this.boatX + 44; x++) if (Math.sin(x * 0.9 + this.t * 3) > 0.5) g.rect(x, surf + 1, 1, 1)
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
      glow(g, j.x + Math.sin(this.t * 0.3 + j.ph) * 8 + 4, y + 3, 9, '#ff7ac0', 0.22 + 0.08 * Math.sin(this.t * 2 + j.ph))
    }
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

  private rodTip(cam: number) {
    const hx = this.boatX + 14 + FISHER_HAND.x
    const hy = this.bob - 15 - 7 + FISHER_HAND.y - cam
    const bend = this.mode === 'reel' ? 7 + Math.sin(this.t * 14) : this.mode === 'bite' ? 4 : this.mode === 'land' ? 5 : 0
    return { x: hx + 18 - Math.round(bend * 0.3), y: hy - 16 + bend, hx, hy }
  }

  /** The boat with the fisher and the cat, drawn with the waterline at `surf` */
  private drawBoat(g: CanvasRenderingContext2D, surf: number) {
    const top = surf - 15 + this.bob
    const bx = this.boatX
    // fisher sits behind the gunwale
    g.drawImage(this.fisherImg, bx + 14, top - 7)
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
    g.drawImage(this.boatImg, bx, top)
    if (this.s.flags.cat) {
      const blink = this.catT % 4 < 0.15
      g.drawImage(this.cats[blink ? 1 : 0], bx + 34, top + 1)
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
    if (night > 0.2) hole(this.boatX + LANTERN.x, surf - 15 + this.bob + LANTERN.y, 26)
    for (const f of this.fish) {
      if (f.sp.special) hole(f.x, f.y - cam, 78)
      else if (f.sp.look.glow && f.sp.look.glowAt !== 'eye') hole(f.x, f.y - cam, 8)
    }
    for (const j of this.jellies) {
      const y = j.y + Math.sin(this.t * 0.5 + j.ph) * 14 - cam
      if (y > -20 && y < H + 20) hole(j.x + Math.sin(this.t * 0.3 + j.ph) * 8 + 4, y + 3, 10)
    }
    g.drawImage(this.dark.c, 0, 0)
  }
}

export const zoneName = (y: number) => ZONES[zoneAt(y)].name
