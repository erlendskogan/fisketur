// The fishing scene: the boat on the surface and the cross-section of the fjord below

import { genFish, type FishArt } from '../art/fishgen'
import { canvas, rgba, shade, rng } from '../art/pixel'
import {
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
  INK,
} from '../art/sprites'
import { bandGradient, buildWater, drawBeam, drawDeco, drawRidge, lighthouseSprite, nightness, ridge, skyAt, SEABED, type Water } from '../art/scenery'
import { sfx } from '../audio'
import { depthToY, PAINTS, WORLD_BOTTOM, SPECIES, SPECIES_BY_ID, yToDepth, ZONE_H, ZONES, zoneAt, type Species } from './data'
import { Reel } from './reel'
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
  private waitT = 0
  private biteT = 0
  private cooldown = 0
  private castT = 0
  private snagT = 0
  private carrying = false
  private catT = 0
  private hearts: { x: number; y: number; t: number }[] = []
  private bubbles: { x: number; y: number; t: number }[] = []
  private motes: { x: number; y: number; s: number }[] = []
  private jellies: { x: number; y: number; ph: number }[] = []
  private ridges: { far: number[]; near: number[] } = { far: [], near: [] }
  private boatImg!: HTMLCanvasElement
  private paint = ''
  private fisherImg = fisherSprite()
  private cats = catSprites()
  private heart = heartSprite()
  private bang = bangSprite()
  private tin = tinSprite()
  private gulls = gullSprites()
  private jellyImgs = jellySprites()
  private lhSmall = { off: lighthouseSprite(false, 'small'), on: lighthouseSprite(true, 'small') }
  private dark = canvas(1, 1)
  private stars: { x: number; y: number; p: number }[] = []
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
      this.ridges = { far: ridge(W, 3, 34, 14), near: ridge(W, 9, 18, 9) }
      const r = rng(5)
      this.stars = Array.from({ length: 40 }, () => ({ x: Math.floor(r() * W), y: r(), p: r() * 6 }))
      this.motes = Array.from({ length: 46 }, () => ({ x: r() * W, y: r() * H, s: 0.5 + r() }))
      this.jellies = Array.from({ length: 5 }, () => ({ x: 20 + r() * (W - 40), y: 2 * ZONE_H + r() * ZONE_H * 2, ph: r() * 6 }))
      this.fish = []
    }
    this.dark = canvas(W, H)
    this.boatX = Math.round(W * 0.58) - 42
    this.tipX = this.boatX + 42
    this.tipY = -32
    if (this.mode === 'idle') this.lure = { x: this.tipX, y: this.tipY + 10 }
    this.camY = this.idleCam
  }

  get idleCam() {
    return -Math.round(this.H * 0.42)
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
    if (this.mode === 'idle') this.cast()
    else if (this.mode === 'wait') {
      this.targetY = this.maxY
      this.mode = 'sink'
      this.host.modeChanged()
    }
    this.letting = true
  }

  /** Finger up anywhere */
  release() {
    this.holding = false
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
    this.updateFish(dt, paused)
    if (paused) return

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
    if (Math.random() > dt * 1.4 * gearValue(this.s, 'lure')) return
    const near = this.fish.filter((f) => f.state === 'swim' && !f.sp.special && Math.abs(f.y - this.lure.y) < 46 && Math.abs(f.x - this.lure.x) < this.W)
    if (!near.length) return
    const f = near[Math.floor(Math.random() * near.length)]
    f.state = 'approach'
  }

  // ---------- drawing ----------

  draw(g: CanvasRenderingContext2D) {
    const { W, H } = this
    const cam = Math.round(this.camY)
    const surf = -cam
    const time = this.s.time
    const night = nightness(time)

    // sky
    if (surf > 0) this.drawSky(g, surf, time, night)

    // water background
    const wy0 = Math.max(0, cam)
    g.drawImage(this.water.bg, 0, wy0, W, H, 0, wy0 - cam, W, H)

    // sun rays in the shallows
    if (cam < ZONE_H) {
      g.save()
      g.globalAlpha = 0.07 * (1 - night)
      g.fillStyle = '#e8fbff'
      for (let i = 0; i < 5; i++) {
        const x = ((i * 53 + this.t * 3) % (W + 60)) - 30
        g.beginPath()
        g.moveTo(x, surf)
        g.lineTo(x + 10, surf)
        g.lineTo(x + 50, surf + 200)
        g.lineTo(x + 30, surf + 200)
        g.fill()
      }
      g.restore()
    }

    for (const d of this.water.deco) if (d.y - cam > -80 && d.y - cam < H + 10) drawDeco(g, d, cam, this.t)

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
      g.fillStyle = rgba('#e8fbff', 0.6 * (1 - b.t / 1.5))
      g.fillRect(Math.round(b.x + Math.sin(b.t * 6) * 1.5), Math.round(b.y - cam), 1, 1)
    }

    // boat, fisher, cat
    this.drawBoat(g, surf, night)

    // surface: tint the hull below the waterline, then the wave line
    if (surf > -4 && surf < H) {
      const top = ZONES[0].water[0]
      g.fillStyle = rgba(top, 0.55)
      g.fillRect(0, surf + 1, W, 12)
      for (let x = 0; x < W; x++) {
        const w = Math.round(Math.sin(x * 0.12 + this.t * 1.6) + Math.sin(x * 0.05 - this.t))
        g.fillStyle = w > 0 ? '#e8fbff' : '#9ae4f4'
        g.fillRect(x, surf + w, 1, 1)
        g.fillStyle = rgba('#46c3df', 0.9)
        g.fillRect(x, surf + w + 1, 1, 2)
      }
    }

    // drifting particles below 60 m
    for (const m of this.motes) {
      m.y += m.s * 0.15
      if (m.y > H) m.y -= H
      const wy = m.y + cam
      if (wy < 2 * ZONE_H) continue
      g.fillStyle = 'rgba(210,225,240,0.35)'
      g.fillRect(Math.round(m.x + Math.sin(this.t * 0.4 + m.s * 9) * 2), Math.round(m.y), 1, 1)
    }

    this.drawDarkness(g, cam, surf, night)

    // things that glow
    for (const gl of this.water.glows) {
      const y = gl.y - cam
      if (y < -4 || y > H + 4) continue
      const tw = 0.6 + 0.4 * Math.sin(this.t * 2 + gl.x)
      g.fillStyle = rgba(gl.c, 0.25 * tw)
      g.fillRect(gl.x - 1, y - 1, 3, 3)
      g.fillStyle = gl.c
      g.fillRect(gl.x, y, 1, 1)
    }
    for (const d of this.water.deco)
      if (d.kind === 'glowplant') {
        const y = d.y - cam - Math.round(d.len) + 1
        if (y < -4 || y > H + 4) continue
        g.fillStyle = rgba(d.color, 0.3)
        g.fillRect(Math.round(d.x) - 1, y - 1, 3, 3)
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

  private rodTip(cam: number) {
    const hx = this.boatX + 14 + FISHER_HAND.x
    const hy = this.bob - 15 - 7 + FISHER_HAND.y - cam
    const bend = this.mode === 'reel' ? 7 + Math.sin(this.t * 14) : this.mode === 'bite' ? 4 : this.mode === 'land' ? 5 : 0
    return { x: hx + 18 - Math.round(bend * 0.3), y: hy - 16 + bend, hx, hy }
  }

  private drawBoat(g: CanvasRenderingContext2D, surf: number, night: number) {
    if (surf < -30 || surf > this.H + 30) return
    const top = surf - 15 + this.bob
    const bx = this.boatX
    // fisher sits behind the gunwale
    g.drawImage(this.fisherImg, bx + 14, top - 7)
    // rod
    const tip = this.rodTip(this.camY)
    const steps = 22
    for (let i = 0; i <= steps; i++) {
      const k = i / steps
      const x = tip.hx + (tip.x - tip.hx) * k
      const y = tip.hy + (tip.y - tip.hy) * k + Math.sin(k * Math.PI) * -2 * (1 - k)
      g.fillStyle = k < 0.3 ? '#6a4a32' : k > 0.92 ? '#e8e0d0' : '#a87a4a'
      g.fillRect(Math.round(x), Math.round(y), 1, 1)
    }
    g.drawImage(this.boatImg, bx, top)
    // the lantern glows at night
    if (night > 0.2) {
      g.save()
      g.globalCompositeOperation = 'lighter'
      g.fillStyle = `rgba(255,190,90,${0.18 * night})`
      g.beginPath()
      g.arc(bx + LANTERN.x, top + LANTERN.y, 9, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    if (this.s.flags.cat) {
      const blink = this.catT % 4 < 0.15
      g.drawImage(this.cats[blink ? 1 : 0], bx + 34, top + 1)
    }
    for (const h of this.hearts) {
      g.globalAlpha = 1 - h.t / 1.4
      g.drawImage(this.heart, Math.round(h.x + Math.sin(h.t * 5) * 2), Math.round(h.y - h.t * 14 + surf))
      g.globalAlpha = 1
    }
    void BOAT_W
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

  private drawSky(g: CanvasRenderingContext2D, surf: number, time: number, night: number) {
    const W = this.W
    const [top, bot] = skyAt(time)
    bandGradient(g, 0, 0, W, surf, top, bot, 9)
    // stars
    if (night > 0.05)
      for (const s of this.stars) {
        const y = Math.round(s.y * surf * 0.75)
        const tw = Math.sin(this.t * 1.5 + s.p) > 0.2 ? 1 : 0.5
        g.fillStyle = `rgba(255,250,230,${night * tw})`
        g.fillRect(s.x, y, 1, 1)
      }
    // sun and moon
    const arc = (t0: number, t1: number) => {
      const k = (time - t0) / (t1 - t0)
      if (k < 0 || k > 1) return null
      return { x: Math.round(W * (0.9 - k * 0.8)), y: Math.round(surf - 26 - Math.sin(k * Math.PI) * (surf * 0.55)) }
    }
    const sun = arc(0.2, 0.8)
    if (sun) {
      g.fillStyle = 'rgba(255,240,180,0.35)'
      g.fillRect(sun.x - 6, sun.y - 6, 13, 13)
      g.fillStyle = time > 0.62 || time < 0.3 ? '#ffb46a' : '#fff2b8'
      g.fillRect(sun.x - 4, sun.y - 5, 9, 11)
      g.fillRect(sun.x - 5, sun.y - 4, 11, 9)
    }
    const mk = ((time < 0.5 ? time + 1 : time) - 0.74) / 0.52
    if (mk >= 0 && mk <= 1) {
      const mx = Math.round(W * (0.9 - mk * 0.8))
      const my = Math.round(surf - 26 - Math.sin(mk * Math.PI) * (surf * 0.55))
      g.fillStyle = '#f2ecd2'
      g.fillRect(mx - 3, my - 4, 7, 9)
      g.fillRect(mx - 4, my - 3, 9, 7)
      g.fillStyle = '#d2ccb2'
      g.fillRect(mx - 1, my - 1, 2, 2)
      g.fillRect(mx + 2, my + 1, 1, 1)
    }

    // clouds
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 71 + this.t * (2 + i * 0.6)) % (W + 70)) - 35
      const cy = 14 + ((i * 37) % Math.max(20, Math.round(surf * 0.4)))
      const col = night > 0.5 ? 'rgba(80,80,130,0.5)' : time > 0.62 ? 'rgba(255,214,200,0.85)' : 'rgba(255,255,255,0.85)'
      g.fillStyle = col
      g.fillRect(Math.round(cx), cy, 22, 3)
      g.fillRect(Math.round(cx) + 4, cy - 3, 10, 3)
      g.fillRect(Math.round(cx) + 12, cy - 2, 6, 2)
    }

    // fjord
    const farCol = shade(bot, -0.25)
    drawRidge(g, this.ridges.far, surf, farCol, night > 0.5 ? '#9aa4c8' : '#f4f8ff')
    const nearCol = night > 0.5 ? '#1e2a3e' : shade('#3a6a5a', -0.1 - night * 0.3)
    drawRidge(g, this.ridges.near, surf, nearCol)
    // the lighthouse on its island
    const lit = !!this.s.flags.ending
    const lh = lit ? this.lhSmall.on : this.lhSmall.off
    const lx = this.W - 26
    g.fillStyle = '#4a4a5a'
    g.fillRect(lx - 4, surf - 4, 22, 5)
    g.fillRect(lx - 1, surf - 6, 16, 3)
    g.drawImage(lh.c, lx, surf - lh.c.height - 3)

    // gulls in daylight
    if (night < 0.5)
      for (let i = 0; i < 2; i++) {
        const gx = ((this.t * (9 + i * 4) + i * 90) % (W + 40)) - 20
        const gy = 20 + i * 18 + Math.round(Math.sin(this.t + i) * 3)
        g.drawImage(this.gulls[Math.floor(this.t * 3 + i) % 2], Math.round(gx), gy)
      }

    if (lit && night > 0.2) {
      const p = { x: lx + lh.lamp.x, y: surf - lh.c.height - 3 + lh.lamp.y }
      drawBeam(g, p.x, p.y, this.t * 0.8, 160, night)
    }
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
      const a = Math.max(depthDark, night * 0.5)
      if (a < 0.02) continue
      any = true
      dg.fillStyle = `rgba(4,6,20,${a})`
      dg.fillRect(0, y, W, 2)
    }
    // the sky above the water dims at night
    if (night > 0 && surf > 0) {
      dg.fillStyle = `rgba(8,10,40,${night * 0.3})`
      dg.fillRect(0, 0, W, Math.min(H, surf + 1))
      any = true
    }
    if (!any) return
    dg.globalCompositeOperation = 'destination-out'
    const hole = (x: number, y: number, r: number) => {
      for (const [k, a] of [
        [1, 0.35],
        [0.72, 0.5],
        [0.45, 1],
      ] as const) {
        dg.fillStyle = `rgba(0,0,0,${a})`
        dg.beginPath()
        dg.arc(x, y, r * k, 0, Math.PI * 2)
        dg.fill()
      }
    }
    if (this.lure.y > 0) hole(this.lure.x, this.lure.y - cam, gearValue(this.s, 'lamp'))
    if (night > 0.2) hole(this.boatX + LANTERN.x, surf - 15 + this.bob + LANTERN.y, 26)
    for (const f of this.fish) {
      if (f.sp.special) hole(f.x, f.y - cam, 78)
      else if (f.sp.look.glow && f.sp.look.glowAt !== 'eye') hole(f.x, f.y - cam, 7)
    }
    g.drawImage(this.dark.c, 0, 0)
    void INK
  }
}

export const zoneName = (y: number) => ZONES[zoneAt(y)].name
