// Garntrekk: haul a gill net over the gunwale. Hold to pull, keep the strain in the green
// band as the swell lifts and drops the boat, and tap each fish as it crosses the rail
// to pick it free. Too much strain tears the mesh and a fish falls out.

import { fisherSprite, INK } from '../../../art/sprites'
import { mix, shade } from '../../../art/pixel'
import { sfx } from '../../../audio'
import type { Catch } from '../../state'
import type { MiniInput, NetHaulResult } from '../types'
import { Bits, bands, clamp, COL, fishArt, hbar, lerp, Mini, seaBackdrop, shake, swell } from './common'
import { text, textC, textW } from './font'

type FishState = 'net' | 'fly' | 'tub' | 'drop'

interface NetFish {
  c: Catch
  /** position along the net, in net pixels from its start */
  at: number
  state: FishState
  /** animation clock for the current state */
  t: number
  x: number
  y: number
  vx: number
  vy: number
  /** start of the throw into the tub */
  fx: number
  fy: number
  dir: 1 | -1
  splashed: boolean
}

interface Pt {
  x: number
  y: number
  nx: number
  ny: number
}

const BAND: [number, number] = [0.35, 0.72]
const TEAR_AT = 0.82
/** the stretch around the roller where a fish can be picked */
const WIN_IN = 16
const WIN_OUT = -14

const HULLS: [string, string][] = [
  ['#b0703e', '#2e6a5a'],
  ['#e8e4dc', '#2a4a7a'],
  ['#3a5a8a', '#e8e4dc'],
  ['#a8343a', '#f4f4f0'],
]

let fisherImg: HTMLCanvasElement | null = null

export class NetHaul extends Mini<NetHaulResult> {
  readonly title = 'Garntrekk'
  private fish: NetFish[]
  private len: number
  private speed: number
  private amp: number
  private pulled = 0
  private strain = 0.05
  private over = 0
  private holding = false
  private holdT = 0
  private bandT = 0
  private tears: number[] = []
  private tearFlash = 0
  private shakeT = 0
  private kept: Catch[] = []
  private lost = 0
  private bits = new Bits()
  private pops: { x: number; y: number; t: number; s: string; c: string }[] = []
  private W = 196
  private H = 420
  private swellNow = { y: 0, v: 0 }
  private mesh: number
  private boat: number

  constructor(fish: Catch[], opts: { mesh: number; boat: number }) {
    super()
    this.mesh = Math.max(0, opts.mesh)
    this.boat = clamp(Math.round(opts.boat), 0, 3)
    const n = fish.length
    this.len = clamp(60 + n * 26, 260, 560)
    // about 16 s of steady pulling; a net hauler on the bigger boats goes a little quicker
    this.speed = (this.len / 16) * (1 + this.boat * 0.08)
    this.amp = [5, 4.2, 3.4, 2.6][this.boat]
    const gap = (this.len - 70) / Math.max(1, n)
    this.fish = fish.map((c, i) => ({
      c,
      at: 55 + (i + 0.5) * gap + (Math.random() - 0.5) * gap * 0.5,
      state: 'net',
      t: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      dir: Math.random() < 0.5 ? 1 : -1,
      splashed: false,
    }))
  }

  // ---------- geometry ----------

  private get waterY() {
    return Math.round(this.H * 0.46)
  }
  private get rollerX() {
    return Math.min(92, Math.round(this.W * 0.44))
  }
  private surfaceAt(x: number) {
    return this.waterY + swell(this.t - (x - 40) * 0.012, this.amp).y * 0.9 + Math.sin(x * 0.11 - this.t * 2.3) * 0.8
  }
  private get railY() {
    return this.waterY - 22 - this.boat * 2 + this.swellNow.y
  }
  private roller() {
    return { x: this.rollerX, y: this.railY - 2 }
  }

  /** the net's path from the roller down into the deep, sampled once a frame */
  private path: { x: number[]; y: number[]; cum: number[]; above: number } = { x: [], y: [], cum: [], above: 0 }
  private buildPath() {
    const R = this.roller()
    const ex = R.x + 18
    const ey = this.surfaceAt(ex)
    const xs: number[] = [R.x]
    const ys: number[] = [R.y]
    const steps = 6
    for (let i = 1; i <= steps; i++) {
      xs.push(lerp(R.x, ex, i / steps))
      ys.push(lerp(R.y, ey, i / steps))
    }
    const cx = ex + 22
    const cy = ey + (this.H - ey) * 0.62
    const bx = this.W + 30
    const by = this.H - 6
    for (let i = 1; i <= 40; i++) {
      const u = i / 40
      const x = (1 - u) * (1 - u) * ex + 2 * (1 - u) * u * cx + u * u * bx
      const y = (1 - u) * (1 - u) * ey + 2 * (1 - u) * u * cy + u * u * by
      // the net sways in the current, more the deeper it hangs
      xs.push(x + Math.sin(u * 7 - this.t * 1.3) * 3 * u)
      ys.push(y)
    }
    const cum = [0]
    for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]))
    this.path = { x: xs, y: ys, cum, above: cum[steps] }
  }
  private at(d: number): Pt {
    const { x, y, cum } = this.path
    if (d <= 0) {
      // past the roller the net runs inboard along the rail
      const R = this.roller()
      return { x: R.x + d, y: R.y - 1, nx: 0, ny: -1 }
    }
    let i = 1
    while (i < cum.length - 1 && cum[i] < d) i++
    const k = clamp((d - cum[i - 1]) / Math.max(0.001, cum[i] - cum[i - 1]))
    const dx = x[i] - x[i - 1]
    const dy = y[i] - y[i - 1]
    const l = Math.hypot(dx, dy) || 1
    return { x: lerp(x[i - 1], x[i], k), y: lerp(y[i - 1], y[i], k), nx: dy / l, ny: -dx / l }
  }
  private get tub() {
    return { x: 22, y: Math.round(this.railY - 9) }
  }

  // ---------- play ----------

  protected step(dt: number, inp: MiniInput, playing: boolean) {
    this.swellNow = swell(this.t, this.amp)
    this.buildPath()
    this.holding = playing && inp.down
    // the rail lifting (screen y going up) pulls the net tight
    const rising = clamp(-this.swellNow.v / (this.amp * 2.4))
    const falling = clamp(this.swellNow.v / (this.amp * 2.4))
    const inNet = this.fish.filter((f) => f.state === 'net').length
    const load = this.fish.length ? inNet / this.fish.length : 0
    const target = this.holding ? 0.44 + load * 0.08 + rising * 0.52 - falling * 0.22 : 0.06 + rising * 0.2
    this.strain += (target - this.strain) * Math.min(1, dt * (this.holding ? 5 : 3.5))
    this.strain = clamp(this.strain)

    if (this.holding) {
      const inBand = this.strain >= BAND[0] && this.strain <= BAND[1]
      this.holdT += dt
      if (inBand) this.bandT += dt
      const k = inBand ? 1 : this.strain < BAND[0] ? 0.55 : 0.8
      const before = this.pulled
      this.pulled = Math.min(this.len, this.pulled + this.speed * k * dt)
      // drips off the net where it comes out of the water
      if (Math.floor(this.pulled / 3) !== Math.floor(before / 3)) {
        const p = this.at(this.path.above * (0.3 + Math.random() * 0.7))
        this.bits.add(p.x, p.y, (Math.random() - 0.5) * 8, 10, Math.random() < 0.5 ? '#cfe8f4' : '#8ac0dc', 0.5)
      }
      if (this.strain > TEAR_AT) {
        this.over += dt
        if (this.over > 0.22 + this.mesh * 0.1) this.tear()
      } else this.over = Math.max(0, this.over - dt * 0.5)
    } else this.over = Math.max(0, this.over - dt)

    // picking
    if (playing && inp.tap) {
      let best: NetFish | null = null
      let bd = 30
      for (const f of this.fish) {
        if (f.state !== 'net') continue
        const d = f.at - this.pulled
        if (d > WIN_IN + 6 || d < WIN_OUT - 4) continue
        const dist = Math.hypot(f.x - inp.x, f.y - inp.y)
        if (dist < bd) {
          bd = dist
          best = f
        }
      }
      if (best) this.pick(best)
    }

    this.fishStep(dt, playing)
    this.bits.update(dt, this.H)
    for (const p of this.pops) p.t += dt
    this.pops = this.pops.filter((p) => p.t < 0.9)
    this.tearFlash = Math.max(0, this.tearFlash - dt)
    this.shakeT = Math.max(0, this.shakeT - dt)

    if (playing && this.pulled >= this.len && this.fish.every((f) => f.state === 'tub' || (f.state === 'drop' && f.t > 0.6))) this.done()
  }

  private fishStep(dt: number, playing: boolean) {
    const tub = this.tub
    for (const f of this.fish) {
      f.t += dt
      if (f.state === 'net') {
        const d = f.at - this.pulled
        const p = this.at(d)
        f.x = p.x
        f.y = p.y
        if (d < WIN_OUT && playing) {
          // nobody picked it: it shakes loose at the roller and flips back into the sea
          f.state = 'drop'
          f.t = 0
          f.vx = 30 + Math.random() * 20
          f.vy = -50
          this.lost++
          this.pops.push({ x: f.x, y: f.y - 10, t: 0, s: 'GLAPP', c: COL.red })
          sfx.lose()
        }
      } else if (f.state === 'fly') {
        const k = clamp(f.t / 0.45)
        f.x = lerp(f.fx, tub.x + ((f.at * 7) % 14) - 7, k)
        f.y = lerp(f.fy, tub.y - 2, k) - Math.sin(Math.PI * k) * 26
        if (k >= 1) {
          f.state = 'tub'
          f.t = 0
          sfx.plop()
          for (let i = 0; i < 6; i++) this.bits.add(f.x, f.y, (Math.random() - 0.5) * 60, -40 - Math.random() * 40, i % 2 ? '#cfe8f4' : '#f4f4f0', 0.4)
        }
      } else if (f.state === 'drop') {
        const sy = this.surfaceAt(f.x)
        if (f.y < sy) {
          f.vy += 240 * dt
        } else {
          if (!f.splashed) {
            f.splashed = true
            this.bits.splash(f.x, sy, 12, 0.8)
            sfx.splash()
          }
          f.vy = 18
          f.vx *= Math.pow(0.1, dt)
        }
        f.x += f.vx * dt
        f.y += f.vy * dt
      }
    }
  }

  private pick(f: NetFish) {
    f.state = 'fly'
    f.t = 0
    f.fx = f.x
    f.fy = f.y
    this.kept.push(f.c)
    sfx.click()
    sfx.tick()
    this.pops.push({ x: f.x, y: f.y - 12, t: 0, s: '+1', c: COL.gold })
    for (let i = 0; i < 8; i++) this.bits.add(f.x, f.y, (Math.random() - 0.5) * 50, -20 - Math.random() * 50, i % 3 ? '#cfe8f4' : '#ffffff', 0.45)
  }

  private tear() {
    this.over = 0
    this.strain = Math.max(0.3, this.strain - 0.35)
    this.tearFlash = 0.5
    this.shakeT = 0.3
    this.tears.push(this.pulled + 20 + Math.random() * 30)
    sfx.creak()
    // the fish nearest the surface falls out of the torn mesh
    let first: NetFish | null = null
    for (const f of this.fish) {
      if (f.state !== 'net') continue
      const d = f.at - this.pulled
      if (d > WIN_IN && (!first || f.at < first.at)) first = f
    }
    if (first) {
      first.state = 'drop'
      first.t = 0
      first.splashed = true
      first.vx = (Math.random() - 0.5) * 10
      first.vy = 20
      this.lost++
      this.pops.push({ x: first.x, y: first.y - 10, t: 0, s: 'RIFT!', c: COL.red })
      sfx.lose()
    } else this.pops.push({ x: this.rollerX + 20, y: this.waterY, t: 0, s: 'RIFT!', c: COL.red })
  }

  private done() {
    const n = this.fish.length
    const keptRatio = n ? this.kept.length / n : 1
    const bandRatio = this.holdT > 0 ? this.bandT / this.holdT : 1
    const quality = clamp(0.45 * bandRatio + 0.55 * keptRatio - this.tears.length * 0.05)
    const card = n
      ? [this.kept.length === n ? 'FULLT GARN!' : 'GARNET ER INNE', `FISK: ${this.kept.length} AV ${n}`, ...(this.lost ? [`${this.lost} GLAPP`] : [])]
      : ['TOMT GARN', 'BEDRE LYKKE NESTE GANG']
    this.finish({ kept: this.kept, lost: this.lost, quality }, card, n === 0 || keptRatio >= 0.6)
  }

  protected playHint() {
    if (this.strain > 0.78 && this.holding) return 'Slipp! Garnet strammer seg'
    if (this.fish.some((f) => f.state === 'net' && f.at - this.pulled < WIN_IN && f.at - this.pulled > WIN_OUT)) return 'Trykk på fisken for å plukke den løs'
    return 'Hold for å dra, slipp når garnet strammer seg'
  }

  // ---------- drawing ----------

  protected scene(g: CanvasRenderingContext2D, W: number, H: number) {
    if (W !== this.W || H !== this.H) {
      this.W = W
      this.H = H
      this.buildPath()
    }
    const sh = shake(this.t, this.shakeT > 0 ? 2 : 0)
    g.translate(sh.x, sh.y)
    const horizon = Math.round(H * 0.3)
    const wy = this.waterY
    seaBackdrop(g, W, horizon, this.t)
    // the far sea, with glints
    bands(g, 0, horizon, W, wy - horizon + 4, '#7a96b0', '#3e6488', 5)
    g.fillStyle = '#a8c0d4'
    for (let i = 0; i < 18; i++) {
      const y = horizon + 2 + ((i * 13) % Math.max(4, wy - horizon - 4))
      const x = ((i * 53 + this.t * (4 + (i % 3) * 2)) % (W + 20)) - 10
      g.fillRect(Math.round(x), y, 3 + (i % 4), 1)
    }
    this.kittiwakes(g, W, horizon)

    // under the surface: the cross-section of the sea
    for (let x = 0; x < W; x++) {
      const s = Math.round(this.surfaceAt(x))
      g.fillStyle = '#2e6a8a'
      g.fillRect(x, s, 1, H - s)
    }
    bands(g, 0, wy + 8, W, H - wy - 8, '#2a6284', '#0c1a34', 9)
    // light falling down into the water
    g.fillStyle = 'rgba(160,210,240,0.07)'
    for (let i = 0; i < 4; i++) {
      const x0 = ((i * 61 + this.t * 3) % (W + 80)) - 40
      for (let y = wy; y < H * 0.85; y += 2) g.fillRect(Math.round(x0 + (y - wy) * 0.35), y, 8 + i * 3, 1)
    }

    this.drawNet(g)
    this.drawWaterFish(g)

    // the surface line over everything below it
    for (let x = 0; x < W; x++) {
      const s = Math.round(this.surfaceAt(x))
      g.fillStyle = '#cfe8f4'
      g.fillRect(x, s, 1, 1)
      g.fillStyle = '#5a9ab8'
      g.fillRect(x, s + 1, 1, 1)
    }

    this.drawBoat(g)
    this.drawAirFish(g)
    this.bits.draw(g)
    for (const p of this.pops) {
      if (p.t > 0.6 && Math.floor(p.t * 20) % 2) continue
      textC(g, p.s, p.x, Math.round(p.y - p.t * 16), p.c)
    }
    if (this.tearFlash > 0 && Math.floor(this.tearFlash * 20) % 2 === 0) {
      g.fillStyle = 'rgba(232,80,58,0.18)'
      g.fillRect(-4, -4, W + 8, H + 8)
    }
    g.translate(-sh.x, -sh.y)
    this.hud(g, W, H)
  }

  private kittiwakes(g: CanvasRenderingContext2D, W: number, horizon: number) {
    for (let i = 0; i < 3; i++) {
      const x = ((i * 83 + this.t * (9 + i * 3)) % (W + 40)) - 20
      const y = horizon - 30 - i * 14 + Math.sin(this.t * 1.5 + i) * 3
      const up = Math.floor(this.t * 4 + i) % 2 === 0
      g.fillStyle = '#4a4a5a'
      if (up) {
        g.fillRect(Math.round(x) - 3, Math.round(y) - 1, 2, 1)
        g.fillRect(Math.round(x) + 2, Math.round(y) - 1, 2, 1)
      } else {
        g.fillRect(Math.round(x) - 3, Math.round(y), 7, 1)
      }
      g.fillStyle = '#f4f4f0'
      g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1)
    }
  }

  private drawNet(g: CanvasRenderingContext2D) {
    const total = this.path.cum[this.path.cum.length - 1]
    const end = Math.min(total, this.len - this.pulled)
    const above = this.path.above
    const deep = '#0c1a34'
    for (let d = -18; d <= end; d += 1) {
      const p = this.at(d)
      const n = Math.round(this.pulled + d)
      const sub = d > above
      const w = d <= 0 ? 2 : sub ? Math.min(12, 3 + (d - above) * 0.22) : 3
      const k = sub ? clamp((p.y - this.waterY) / (this.H - this.waterY)) : 0
      const meshC = sub ? mix('#a8c8c0', deep, k * 0.7) : '#e8eee0'
      if (this.tears.some((t) => Math.abs(t - n) < 4)) {
        // a torn hole: just frayed ends
        if (n % 3 === 0) {
          g.fillStyle = meshC
          g.fillRect(Math.round(p.x - p.nx * w * 0.5), Math.round(p.y - p.ny * w * 0.5), 1, 1)
        }
        continue
      }
      const hw = w / 2
      for (let j = -Math.floor(hw); j <= Math.ceil(hw); j++) {
        const a = (((n + j) % 5) + 5) % 5
        const b = (((n - j) % 5) + 5) % 5
        if (a !== 0 && b !== 0 && Math.abs(j) < hw) continue
        g.fillStyle = j <= -hw + 0.5 ? (sub ? mix('#d8c8a0', deep, k * 0.6) : '#d8c8a0') : j >= hw - 0.5 ? mix('#4a4458', deep, k * 0.5) : meshC
        g.fillRect(Math.round(p.x + p.nx * j), Math.round(p.y + p.ny * j), 1, 1)
      }
      // cork floats on the float line
      if (n % 22 === 0 && d > 0) {
        const fx = Math.round(p.x - p.nx * (hw + 1))
        const fy = Math.round(p.y - p.ny * (hw + 1))
        g.fillStyle = INK
        g.fillRect(fx - 2, fy - 1, 4, 3)
        g.fillStyle = sub ? mix('#e8743a', deep, k * 0.6) : '#e8743a'
        g.fillRect(fx - 1, fy - 1, 2, 2)
        g.fillStyle = sub ? mix('#ffb07a', deep, k * 0.6) : '#ffb07a'
        g.fillRect(fx - 1, fy - 1, 1, 1)
      }
    }
  }

  private drawFishAt(g: CanvasRenderingContext2D, f: NetFish, tangled: boolean, tint = 0) {
    const art = fishArt(f.c.id)
    const fr = Math.floor(this.t * (tangled ? 6 : 10) + f.at) % 2
    const img = f.dir > 0 ? art.right[fr] : art.left[fr]
    const x = Math.round(f.x - art.w / 2)
    const y = Math.round(f.y - art.h / 2)
    if (tint > 0.05) g.globalAlpha = 1 - tint * 0.5
    g.drawImage(img, x, y)
    g.globalAlpha = 1
    if (tangled) {
      // a few strands of mesh across the body
      g.fillStyle = tint > 0.05 ? mix('#c8d8d0', '#0c1a34', tint * 0.6) : '#e8eee0'
      const cx = Math.round(f.x)
      const cy = Math.round(f.y)
      for (let i = -3; i <= 3; i++) {
        g.fillRect(cx - 3 + i, cy + i, 1, 1)
        g.fillRect(cx + 3 + i, cy - i, 1, 1)
      }
    }
  }

  private drawWaterFish(g: CanvasRenderingContext2D) {
    for (const f of this.fish) {
      if (f.state === 'net' && f.at - this.pulled > this.path.above) {
        const k = clamp((f.y - this.waterY) / (this.H - this.waterY))
        this.drawFishAt(g, f, true, k)
      } else if (f.state === 'drop' && f.y >= this.surfaceAt(f.x) && f.t < 1.6) {
        if (f.t > 1 && Math.floor(f.t * 16) % 2) continue
        this.drawFishAt(g, f, false, 0.4 + f.t * 0.3)
      }
    }
  }

  private drawAirFish(g: CanvasRenderingContext2D) {
    for (const f of this.fish) {
      const d = f.at - this.pulled
      if (f.state === 'net' && d <= this.path.above) {
        this.drawFishAt(g, f, true)
        // the pick window: a pulsing ring so you know it can be tapped
        if (d < WIN_IN && d > WIN_OUT && this.phase === 'play') {
          const r = 9 + Math.round(Math.sin(this.t * 10))
          g.fillStyle = COL.gold
          for (let a = 0; a < 16; a++) {
            const ang = (a / 16) * Math.PI * 2 + this.t * 2
            if (a % 2) continue
            g.fillRect(Math.round(f.x + Math.cos(ang) * r), Math.round(f.y + Math.sin(ang) * r * 0.8), 1, 1)
          }
        }
      } else if (f.state === 'fly') this.drawFishAt(g, f, false)
      else if (f.state === 'drop' && f.y < this.surfaceAt(f.x)) this.drawFishAt(g, f, false)
    }
  }

  private drawBoat(g: CanvasRenderingContext2D) {
    const [hull, stripe] = HULLS[this.boat]
    const rx = this.rollerX
    const ry = this.railY
    const tub = this.tub
    // the fisher behind the rail, leaning into the pull
    fisherImg ??= fisherSprite('norge')
    const lean = this.holding ? Math.round(Math.sin(this.t * 9) + 1) : 0
    g.drawImage(fisherImg, rx - 30 + lean, Math.round(ry - 17 + lean * 0.5))
    // the fish tub on deck with what is in it
    const inTub = this.fish.filter((f) => f.state === 'tub')
    const tw = 26
    g.fillStyle = INK
    g.fillRect(tub.x - tw / 2 - 1, tub.y - 1, tw + 2, 12)
    g.fillStyle = '#4a7aa8'
    g.fillRect(tub.x - tw / 2, tub.y, tw, 11)
    g.fillStyle = '#6a9ac8'
    g.fillRect(tub.x - tw / 2, tub.y, tw, 1)
    g.fillStyle = '#2e5a88'
    g.fillRect(tub.x - tw / 2, tub.y + 4, tw, 1)
    // landed fish: the newest still flap on top of the pile
    inTub.forEach((f, i) => {
      const art = fishArt(f.c.id, true)
      const age = f.t
      const fresh = i >= inTub.length - 4 && age < 3
      const hop = fresh ? Math.abs(Math.sin(age * 9)) * 6 * Math.exp(-age * 0.8) : 0
      const flipDir = fresh ? Math.floor(age * 3) % 2 === 0 : (i % 2 === 0)
      const x = tub.x - 10 + ((i * 7) % 16)
      const y = tub.y - art.h + 3 - Math.min(4, Math.floor(i / 3)) - Math.round(hop)
      g.drawImage(flipDir ? art.right[Math.floor(age * 8) % 2] : art.left[0], Math.round(x - art.w / 2 + 4), y)
    })
    // the hull, seen from the side, bow towards the net
    const x0 = -6
    const x1 = rx + 4
    const depth = 26 + this.boat * 4
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / (x1 - x0)
      const top = Math.round(ry - Math.pow(u, 5) * 7)
      const bot = Math.round(ry + depth * Math.pow(Math.sin(Math.PI * Math.min(0.98, u * 0.55 + 0.45)), 0.7))
      const sx = Math.round(this.surfaceAt(x))
      for (let y = top; y <= bot; y++) {
        const r = y - top
        let c = r === 0 ? shade(hull, 0.3) : r === 1 ? shade(hull, -0.25) : r === 4 || r === 5 ? stripe : hull
        if (r > 1 && r % 3 === 0 && r !== 3) c = shade(c, -0.12)
        if (y === bot) c = INK
        if (r === 0 && x !== x1) c = shade('#d8945a', 0.1)
        if (y > sx) c = mix(shade(c, -0.2), '#2a6284', 0.55)
        g.fillStyle = c
        g.fillRect(x, y, 1, 1)
      }
      g.fillStyle = INK
      g.fillRect(x, top - 1, 1, 1)
    }
    // the roller at the rail
    const R = this.roller()
    g.fillStyle = INK
    g.fillRect(R.x - 4, R.y - 3, 8, 7)
    g.fillStyle = '#8a94a8'
    g.fillRect(R.x - 3, R.y - 2, 6, 5)
    g.fillStyle = '#c8d0dc'
    g.fillRect(R.x - 3, R.y - 2, 6, 1)
    const a = -this.pulled * 0.35
    g.fillStyle = INK
    g.fillRect(Math.round(R.x + Math.cos(a) * 2) - 1, Math.round(R.y + Math.sin(a) * 2), 2, 1)
    g.fillStyle = '#4a4458'
    g.fillRect(R.x - 1, R.y + 4, 2, 4)
  }

  private hud(g: CanvasRenderingContext2D, W: number, H: number) {
    const y = Math.round(H * 0.15)
    const x = 22
    const w = W - 44
    const col = this.strain > TEAR_AT ? COL.red : this.strain > BAND[1] ? COL.amber : this.strain >= BAND[0] ? COL.green : '#8ab8d8'
    text(g, 'STRAMMING', x - 1, y - 10, COL.paper)
    const n = this.fish.length
    const cnt = `${this.kept.length}/${n}`
    const ico = fishArt(this.fish[0]?.c.id ?? 'v_torsk', true)
    text(g, cnt, x + w - textW(cnt) + 1, y - 10, COL.gold)
    g.drawImage(ico.left[0], x + w - textW(cnt) - ico.w - 2, y - 8 - Math.round(ico.h / 2) + 2)
    hbar(g, x, y, w, 7, this.strain, col, BAND)
    // a needle that shivers when it is close to tearing
    const jit = this.strain > BAND[1] ? Math.round(Math.sin(this.t * 60)) : 0
    const nx = x + Math.round(this.strain * w) + jit
    g.fillStyle = INK
    g.fillRect(nx - 1, y - 3, 3, 13)
    g.fillStyle = COL.paper
    g.fillRect(nx, y - 2, 1, 11)
    // how much net is still out
    const py = y + 12
    g.fillStyle = INK
    g.fillRect(x - 1, py - 1, w + 2, 4)
    g.fillStyle = '#4a5a6a'
    g.fillRect(x, py, w, 2)
    g.fillStyle = '#d8c8a0'
    g.fillRect(x, py, Math.round((this.pulled / this.len) * w), 2)
    for (let i = 1; i < 6; i++) {
      g.fillStyle = '#e8743a'
      g.fillRect(x + Math.round((w * i) / 6), py, 1, 2)
    }
  }
}
