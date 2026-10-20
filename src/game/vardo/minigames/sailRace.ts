// Kappseilas: a top-down race up the coast. The boat always moves forward; it steers
// towards the finger (drag, or hold on the left or right side). Sail through the buoy
// gates for a burst of speed, keep clear of skerries and breaking waves, beat the rivals
// to the finish line.

import { Pix, mix, rng, shade } from '../../../art/pixel'
import { INK } from '../../../art/sprites'
import { sfx } from '../../../audio'
import type { MiniInput, RaceResult } from '../types'
import { Bits, clamp, COL, lerp, Mini, shake } from './common'
import { text, textC, textW } from './font'

/** width of the course in world pixels; the screen shows it centred */
const CW = 196
const GATE_GAP = 46
const MISS_PENALTY = 2

interface Gate {
  d: number
  x: number
  done: 0 | 1 | -1
  flash: number
}
interface Rock {
  d: number
  x: number
  r: number
  seed: number
}
interface Wave {
  d: number
  x: number
  w: number
  vx: number
  ph: number
}
interface Boat {
  x: number
  d: number
  vx: number
  mult: number
  /** rivals: share of the base speed */
  f: number
  lane: number
  slow: number
  done: number
  hull: string
  spr: HTMLCanvasElement
}

const HULLS = ['#b0703e', '#e8e4dc', '#3a5a8a', '#a8343a']
const RIVAL_HULLS = ['#2e6a5a', '#e8b83a', '#6a4a8a', '#e8743a', '#4a8ac8', '#5a5a68']

/** A boat seen from above, bow up */
function boatTop(hull: string, tier: number, sail: boolean) {
  const L = 17 + tier * 3
  const B = 7 + Math.min(3, tier)
  const p = new Pix(B + 8, L + 4)
  const cx = (B + 8) / 2 - 0.5
  for (let y = 0; y < L; y++) {
    const v = y / (L - 1)
    // a pointed bow, full in the middle, a flat transom aft
    const hw = (B / 2) * (v < 0.4 ? Math.sqrt(v / 0.4) : 1 - Math.pow((v - 0.4) / 0.6, 3) * 0.25)
    for (let x = -Math.ceil(hw); x <= Math.ceil(hw); x++) {
      if (Math.abs(x) > hw + 0.2) continue
      const edge = Math.abs(x) > hw - 1.1
      let c = edge ? shade(hull, -0.15) : hull === '#e8e4dc' ? '#c8a878' : mix(hull, '#c8a878', 0.55)
      if (!edge && x === 0 && !sail) c = shade(c, -0.08)
      p.set(cx + x + 0.5, y + 2, c)
    }
  }
  if (sail) {
    // the mast and the sail out to starboard, filled by a wind from port
    const my = Math.round(L * 0.38) + 2
    p.set(cx + 0.5, my, '#4a3428')
    for (let i = 1; i < Math.round(L * 0.55); i++) {
      const bulge = Math.round(Math.sin((i / (L * 0.55)) * Math.PI) * 2)
      p.set(cx + 0.5 + Math.round(i * 0.35) + bulge, my + i, '#f8f4ea')
      p.set(cx + 1.5 + Math.round(i * 0.35) + bulge, my + i, '#d8d4ca')
    }
  } else {
    // a wheelhouse and some fish boxes on deck
    const wy = Math.round(L * 0.55) + 2
    p.rect(Math.round(cx - B / 2 + 2) + 0, wy, B - 3, 4, '#f4f4f0')
    p.rect(Math.round(cx - B / 2 + 2) + 0, wy, B - 3, 1, '#26304e')
    p.rect(Math.round(cx - 1), Math.round(L * 0.25) + 2, 3, 3, '#4a8ac8')
  }
  p.outline(0.6)
  return p.toCanvas()
}

export class SailRace extends Mini<RaceResult> {
  readonly title: string
  private kind: 'regatta' | 'delivery'
  private len: number
  private base: number
  private tier: number
  private me: Boat
  private rivals: Boat[] = []
  private gates: Gate[] = []
  private rocks: Rock[] = []
  private waves: Wave[] = []
  private hits = 0
  private penalty = 0
  private inv = 0
  private shakeT = 0
  private hitFlash = 0
  private bits = new Bits()
  private pops: { x: number; d: number; t: number; s: string; c: string }[] = []
  private W = 196
  private quit = false

  constructor(opts: { boat: number; rivals: number; length: number; seed: number; kind: 'regatta' | 'delivery' }) {
    super()
    this.kind = opts.kind
    this.title = opts.kind === 'delivery' ? 'Hastetur' : 'Kappseilas'
    this.tier = clamp(Math.round(opts.boat), 0, 3)
    this.base = 62 + this.tier * 7
    // lengths up to 120 are read as seconds of sailing, longer ones as world pixels
    this.len = clamp(opts.length <= 120 ? opts.length * this.base : opts.length, 700, 9000)
    const r = rng(opts.seed * 7919 + 13)
    const sail = opts.kind === 'regatta'
    this.me = { x: CW / 2, d: 0, vx: 0, mult: 1, f: 1, lane: 0, slow: 0, done: -1, hull: HULLS[this.tier], spr: boatTop(HULLS[this.tier], this.tier, sail) }
    const n = clamp(Math.round(opts.rivals), 0, 5)
    for (let i = 0; i < n; i++) {
      const hull = RIVAL_HULLS[i % RIVAL_HULLS.length]
      const slot = i + 1
      const side = slot % 2 ? -1 : 1
      this.rivals.push({
        x: CW / 2 + side * Math.ceil(slot / 2) * 22,
        d: -4 - (i % 2) * 6,
        vx: 0,
        mult: 1,
        f: 0.83 + (i / Math.max(1, n - 1)) * 0.12 + (r() - 0.5) * 0.03,
        lane: (r() - 0.5) * 18,
        slow: 0,
        done: -1,
        hull,
        spr: boatTop(hull, this.tier, sail),
      })
    }
    // the course: gates along a wandering line, skerries off the line, breaking waves across it
    let cx = CW / 2
    for (let d = 320; d < this.len - 160; d += 210 + r() * 60) {
      cx = clamp(cx + (r() - 0.5) * 110, 46, CW - 46)
      this.gates.push({ d, x: cx, done: 0, flash: 0 })
    }
    const pts = [{ d: 0, x: CW / 2 }, ...this.gates, { d: this.len, x: CW / 2 }]
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const k = 1 + Math.floor(r() * 3)
      for (let j = 0; j < k; j++) {
        const d = lerp(a.d, b.d, 0.25 + r() * 0.5)
        const line = lerp(a.x, b.x, (d - a.d) / Math.max(1, b.d - a.d))
        let x = 12 + r() * (CW - 24)
        // most skerries lie off the line, but some sit right on it and have to be dodged
        if (r() < 0.4 && i > 0) x = line + (r() - 0.5) * 24
        else if (Math.abs(x - line) < 30) x = line + (x < line ? -1 : 1) * (30 + r() * 20)
        if (x < 10 || x > CW - 10 || d < 150) continue
        this.rocks.push({ d, x, r: 5 + r() * 6, seed: Math.floor(r() * 9999) })
      }
      if (i > 0 && r() < 0.55) {
        const d = lerp(a.d, b.d, 0.5 + (r() - 0.5) * 0.3)
        this.waves.push({ d, x: r() * CW, w: 40 + r() * 40, vx: (r() < 0.5 ? -1 : 1) * (14 + r() * 14), ph: r() * 6 })
      }
    }
  }

  /** stop racing: the result is a time of -1 */
  giveUp() {
    if (this.result || this.phase === 'end') return
    this.quit = true
    this.finish({ time: -1, hits: this.hits, place: this.rivals.length + 1 }, ['GA OPP', 'NESTE GANG!'], false)
  }

  private lineX(d: number) {
    const pts = [{ d: -100, x: CW / 2 }, ...this.gates, { d: this.len + 200, x: CW / 2 }]
    for (let i = 0; i < pts.length - 1; i++) if (d <= pts[i + 1].d) return lerp(pts[i].x, pts[i + 1].x, clamp((d - pts[i].d) / (pts[i + 1].d - pts[i].d)))
    return CW / 2
  }

  private breaking(w: Wave) {
    return Math.sin(this.t * 1.6 + w.ph) > 0.25
  }
  private waveX(w: Wave) {
    // the crest drifts sideways and wraps across the course
    return ((((w.x + w.vx * this.t) % (CW + w.w)) + CW + w.w) % (CW + w.w)) - w.w / 2
  }

  // ---------- play ----------

  protected step(dt: number, inp: MiniInput, playing: boolean) {
    this.bits.update(dt)
    for (const p of this.pops) p.t += dt
    this.pops = this.pops.filter((p) => p.t < 1)
    for (const gt of this.gates) gt.flash = Math.max(0, gt.flash - dt)
    this.inv = Math.max(0, this.inv - dt)
    this.shakeT = Math.max(0, this.shakeT - dt)
    this.hitFlash = Math.max(0, this.hitFlash - dt)
    if (!playing || this.quit) {
      // after the finish everyone glides on a little
      if (this.phase === 'end') for (const b of [this.me, ...this.rivals]) b.d += this.base * 0.5 * dt
      return
    }
    const me = this.me
    // steering: towards the finger
    const offX = (this.W - CW) / 2
    const want = inp.down ? clamp((inp.x - offX - me.x) * 4.5, -95, 95) : 0
    me.vx += (want - me.vx) * Math.min(1, dt * 7)
    me.x += me.vx * dt
    if (me.x < 10 || me.x > CW - 10) {
      me.x = clamp(me.x, 10, CW - 10)
      me.mult = Math.min(me.mult, 0.8)
    }
    me.mult += (1 - me.mult) * Math.min(1, dt * 1.1)
    const before = me.d
    me.d += this.base * me.mult * dt
    this.wake(me, dt)

    // gates
    for (const gt of this.gates) {
      if (gt.done || before >= gt.d || me.d < gt.d) continue
      if (Math.abs(me.x - gt.x) < GATE_GAP / 2 - 2) {
        gt.done = 1
        gt.flash = 0.6
        me.mult = Math.max(me.mult, 1.22)
        sfx.coin()
        this.pops.push({ x: gt.x, d: gt.d, t: 0, s: 'FINT!', c: COL.gold })
      } else {
        gt.done = -1
        this.penalty += MISS_PENALTY
        sfx.lose()
        this.pops.push({ x: gt.x, d: gt.d, t: 0, s: `BOMMET +${MISS_PENALTY}S`, c: COL.red })
      }
    }
    // rocks and breaking waves
    if (this.inv <= 0) {
      for (const rk of this.rocks) {
        if (Math.abs(rk.d - me.d) > 20) continue
        if (Math.hypot(rk.x - me.x, (rk.d - me.d) * 0.9) < rk.r + 4) {
          this.hit(0.25, 'SKJÆR!')
          me.vx = (me.x < rk.x ? -1 : 1) * 70
          break
        }
      }
      for (const w of this.waves) {
        if (Math.abs(w.d - me.d) > 4 || !this.breaking(w)) continue
        const wx = this.waveX(w)
        if (Math.abs(me.x - wx) < w.w / 2) {
          this.hit(0.55, 'BRÅTT!')
          this.bits.splash(me.x, -me.d, 16, 0.9)
          break
        }
      }
    }
    // rivals: follow the course line in their own lane
    for (const b of this.rivals) {
      if (b.done >= 0) {
        b.d += this.base * 0.6 * dt
        continue
      }
      let tx = clamp(this.lineX(b.d + 40) + b.lane, 12, CW - 12)
      for (const rk of this.rocks) if (rk.d > b.d && rk.d - b.d < 70 && Math.abs(rk.x - tx) < rk.r + 9) tx = rk.x + (b.x < rk.x ? -1 : 1) * (rk.r + 14)
      const wv = clamp((tx - b.x) * 3, -80, 80)
      b.vx += (wv - b.vx) * Math.min(1, dt * 5)
      b.x += b.vx * dt
      if (b.slow > 0) b.slow -= dt
      else if (Math.random() < dt * 0.05) b.slow = 0.8
      // a little rubber band so the race stays a race
      const gap = me.d - b.d
      const rubber = clamp(gap / 600, -0.04, 0.04)
      b.d += this.base * b.f * (b.slow > 0 ? 0.7 : 1) * (1 + rubber) * dt
      this.wake(b, dt)
      if (b.d >= this.len) b.done = this.pt
      // bumping into each other
      const dx = b.x - me.x
      const dd = b.d - me.d
      if (Math.abs(dx) < 9 && Math.abs(dd) < 14) {
        const s = dx >= 0 ? 1 : -1
        b.x += s * 1.5
        me.x -= s * 1.5
        me.vx = -s * 30
        me.mult = Math.min(me.mult, 0.9)
        if (this.inv <= 0) sfx.creak()
      }
    }
    if (me.d >= this.len) this.finishRace()
  }

  private wake(b: Boat, dt: number) {
    if (Math.random() < dt * 40) {
      const s = Math.random() < 0.5 ? -1 : 1
      this.bits.add(b.x + s * 3, -(b.d - 10), s * (8 + Math.random() * 10), 0, Math.random() < 0.6 ? '#ffffff' : '#cfe8f4', 0.6, 0)
    }
  }

  private hit(mult: number, s: string) {
    this.hits++
    this.inv = 1
    this.me.mult = mult
    this.shakeT = 0.35
    this.hitFlash = 0.4
    sfx.splash()
    sfx.creak()
    this.pops.push({ x: this.me.x, d: this.me.d + 12, t: 0, s, c: COL.red })
    for (let i = 0; i < 14; i++) this.bits.add(this.me.x, -(this.me.d + 6), (Math.random() - 0.5) * 80, (Math.random() - 0.2) * 60, i % 2 ? '#ffffff' : '#cfe8f4', 0.5, 0)
  }

  private endTime = -1
  private get time() {
    return this.endTime >= 0 ? this.endTime : this.pt + this.penalty
  }

  private finishRace() {
    const t = this.time
    this.endTime = t
    const times = this.rivals.map((b) => (b.done >= 0 ? b.done : this.pt + (this.len - b.d) / (this.base * b.f)))
    const place = 1 + times.filter((x) => x < t).length
    const n = this.rivals.length + 1
    const card = [
      this.kind === 'delivery' ? (place === 1 ? 'LEVERT FØRST!' : 'LEVERT!') : place === 1 ? 'DU VANT!' : `${place}. PLASS`,
      `TID ${fmt(t)}`,
      ...(n > 1 ? [`PLASS ${place} AV ${n}`] : []),
      ...(this.hits ? [`${this.hits} SMELL`] : ['INGEN SMELL!']),
    ]
    this.finish({ time: Math.round(t * 10) / 10, hits: this.hits, place }, card, place <= Math.max(1, Math.ceil(n / 2)))
  }

  protected playHint() {
    if (this.inv > 0.5) return 'Au! Hold avstand til skjær og brott'
    const next = this.gates.find((g) => !g.done && g.d > this.me.d)
    if (next && next.d - this.me.d < 120) return 'Styr mellom bøyene for ekstra fart'
    return 'Dra mot venstre eller høyre for å styre'
  }

  // ---------- drawing ----------

  protected scene(g: CanvasRenderingContext2D, W: number, H: number) {
    this.W = W
    const sh = shake(this.t, this.shakeT > 0 ? 2 : 0)
    const offX = Math.round((W - CW) / 2) + sh.x
    const py = Math.round(H * 0.66)
    const cam = this.me.d
    const sy = (d: number) => Math.round(py - (d - cam)) + sh.y
    const sx = (x: number) => Math.round(x + offX)
    // the sea, with wave marks fixed to the world so it scrolls as you go
    g.fillStyle = '#2e6a8a'
    g.fillRect(0, 0, W, H)
    const d0 = Math.floor((cam - (H - py)) / 6) * 6
    for (let d = d0; d < cam + py + 6; d += 6) {
      const r = rng((d / 6) * 2654435761)
      for (let i = 0; i < 3; i++) {
        const x = r() * (W + 20) - 10
        g.fillStyle = r() < 0.4 ? '#4a8aa8' : '#24587a'
        g.fillRect(Math.round(x + Math.sin(this.t + d) * 2), sy(d), 3 + Math.floor(r() * 5), 1)
      }
    }
    // the coast on both sides
    for (let y = 0; y < H; y++) {
      const d = cam + (py - y)
      for (const side of [-1, 1]) {
        const w = 6 + Math.round(Math.sin(d * 0.013 + side) * 4 + Math.sin(d * 0.051) * 2)
        const x0 = side < 0 ? 0 : offX + CW - w
        const x1 = side < 0 ? offX + w : W
        g.fillStyle = '#6a6a4a'
        g.fillRect(x0, y, x1 - x0, 1)
        g.fillStyle = '#8a8466'
        g.fillRect(side < 0 ? x1 - 2 : x0, y, 2, 1)
        g.fillStyle = (y + Math.floor(this.t * 8)) % 4 ? '#cfe8f4' : '#ffffff'
        g.fillRect(side < 0 ? x1 : x0 - 1, y, 1, 1)
      }
    }
    const vis = (d: number, m = 30) => d > cam - (H - py) - m && d < cam + py + m
    // the finish line
    if (vis(this.len)) {
      const y = sy(this.len)
      for (let x = 0; x < CW; x += 4) {
        g.fillStyle = (x / 4) % 2 ? INK : '#f8f8f0'
        g.fillRect(sx(x), y, 4, 2)
        g.fillStyle = (x / 4) % 2 ? '#f8f8f0' : INK
        g.fillRect(sx(x), y + 2, 4, 2)
      }
      textC(g, 'MÅL', sx(CW / 2), y - 16, COL.gold, { scale: 2 })
    }
    // breaking waves
    for (const w of this.waves) {
      if (!vis(w.d)) continue
      const wx = this.waveX(w)
      const br = this.breaking(w)
      const y = sy(w.d)
      for (let i = -w.w / 2; i < w.w / 2; i++) {
        const u = i / (w.w / 2)
        const bend = Math.round(u * u * 3)
        const xx = sx(wx + i)
        if (br) {
          g.fillStyle = (i + Math.floor(this.t * 20)) % 3 ? '#ffffff' : '#cfe8f4'
          g.fillRect(xx, y + bend - 1, 1, 3)
          if (Math.random() < 0.04) this.bits.add(wx + i, -(w.d + 2), (Math.random() - 0.5) * 20, 10, '#ffffff', 0.4, 0)
        } else {
          g.fillStyle = '#1e4a6a'
          g.fillRect(xx, y + bend, 1, 2)
          g.fillStyle = '#5a9ab8'
          g.fillRect(xx, y + bend - 1, 1, 1)
        }
      }
    }
    // skerries
    for (const rk of this.rocks) {
      if (!vis(rk.d)) continue
      const cx = sx(rk.x)
      const cy = sy(rk.d)
      const r = Math.round(rk.r)
      const rr = rng(rk.seed)
      for (let j = -r - 2; j <= r + 2; j++)
        for (let i = -r - 2; i <= r + 2; i++) {
          const a = Math.atan2(j, i)
          const rad = r * (0.85 + 0.15 * Math.sin(a * 3 + rk.seed)) * (j > 0 ? 0.85 : 1)
          const d = Math.hypot(i, j)
          if (d > rad + 2) continue
          let c: string
          if (d > rad) c = (Math.floor(this.t * 6) + i + j) % 3 ? '#ffffff' : '#cfe8f4'
          else if (d > rad - 1) c = INK
          else c = j < -r * 0.3 && i < r * 0.3 ? '#8a8474' : (i * 3 + j) % 7 === 0 ? '#3e3a34' : '#5e584c'
          g.fillStyle = c
          g.fillRect(cx + i, cy + j, 1, 1)
        }
      if (rr() < 0.5) {
        // a kittiwake resting on top
        g.fillStyle = '#f8f8f4'
        g.fillRect(cx - 1, cy - r + 1, 2, 2)
      }
    }
    // gates: a red and a green buoy and a dotted line between them
    for (const gt of this.gates) {
      if (!vis(gt.d)) continue
      const y = sy(gt.d)
      const bob = Math.round(Math.sin(this.t * 3 + gt.d) * 1)
      const lx = sx(gt.x - GATE_GAP / 2)
      const rx = sx(gt.x + GATE_GAP / 2)
      if (!gt.done || gt.flash > 0) {
        g.fillStyle = gt.flash > 0 ? COL.gold : 'rgba(248,248,240,0.45)'
        for (let x = lx + 4; x < rx - 3; x += 3) g.fillRect(x, y, 1, 1)
      }
      for (const [x, c] of [[lx, '#d8343a'], [rx, '#2e9a4a']] as [number, string][]) {
        g.fillStyle = INK
        g.fillRect(x - 3, y - 3 + bob, 6, 6)
        g.fillStyle = c
        g.fillRect(x - 2, y - 2 + bob, 4, 4)
        g.fillStyle = shade(c, 0.35)
        g.fillRect(x - 2, y - 2 + bob, 2, 1)
        g.fillStyle = '#ffffff'
        g.fillRect(x - 3, y + 3 + bob, 6, 1)
      }
      if (gt.done === -1) {
        g.fillStyle = COL.red
        g.fillRect(lx + 2, y - 1, rx - lx - 4, 1)
      }
    }
    // spray and wake live in world space with y = -distance
    this.bits.draw(g, offX, py + cam + sh.y)
    // boats, back to front
    const boats = [...this.rivals, this.me].sort((a, b) => b.d - a.d)
    for (const b of boats) {
      if (!vis(b.d)) continue
      const x = sx(b.x)
      const y = sy(b.d)
      const ang = clamp(b.vx / (this.base * 1.6), -0.6, 0.6)
      if (b === this.me && this.inv > 0 && Math.floor(this.inv * 12) % 2) continue
      g.save()
      g.translate(x, y)
      g.rotate(ang)
      g.drawImage(b.spr, -Math.round(b.spr.width / 2), -Math.round(b.spr.height * 0.35))
      g.restore()
      // a bow wave
      g.fillStyle = '#ffffff'
      g.fillRect(x - 1 + Math.round(ang * 8), y - Math.round(b.spr.height * 0.35) - 1, 3, 1)
    }
    // which boat is yours, until the race is under way
    if (this.phase === 'intro' || (this.phase === 'play' && this.pt < 2.5)) {
      const x = sx(this.me.x)
      const y = sy(this.me.d) - Math.round(this.me.spr.height * 0.35) - 5 + Math.round(Math.sin(this.t * 6))
      textC(g, 'DU', x, y - 9, COL.gold)
      g.fillStyle = COL.gold
      g.fillRect(x - 2, y - 1, 5, 1)
      g.fillRect(x - 1, y, 3, 1)
      g.fillRect(x, y + 1, 1, 1)
    }
    for (const p of this.pops) {
      if (p.t > 0.7 && Math.floor(p.t * 20) % 2) continue
      textC(g, p.s, sx(p.x), sy(p.d) - 10 - Math.round(p.t * 14), p.c)
    }
    if (this.hitFlash > 0 && Math.floor(this.hitFlash * 20) % 2 === 0) {
      g.fillStyle = 'rgba(232,80,58,0.18)'
      g.fillRect(0, 0, W, H)
    }
    this.hud(g, W, H)
  }

  private hud(g: CanvasRenderingContext2D, W: number, H: number) {
    const y = Math.round(H * 0.12)
    const tt = fmt(this.phase === 'intro' ? 0 : this.time)
    text(g, tt, 10, y, COL.paper, { scale: 2 })
    if (this.rivals.length) {
      const place = 1 + this.rivals.filter((b) => b.d > this.me.d).length
      const s = `${place}/${this.rivals.length + 1}`
      text(g, s, W - 10 - textW(s, 2), y, place === 1 ? COL.gold : COL.paper, { scale: 2 })
      text(g, 'PLASS', W - 10 - textW('PLASS'), y + 13, '#cfe8f4')
    }
    if (this.hits) text(g, `SMELL ${this.hits}`, 10, y + 13, '#ff9a7a')
    // the course as a thin bar on the right, with every boat on it
    const bx = W - 5
    const top = y + 26
    const bh = Math.round(H * 0.5)
    g.fillStyle = INK
    g.fillRect(bx - 2, top - 1, 4, bh + 2)
    g.fillStyle = '#4a5a6a'
    g.fillRect(bx - 1, top, 2, bh)
    const at = (d: number) => top + bh - Math.round(clamp(d / this.len) * bh)
    for (const b of this.rivals) {
      g.fillStyle = b.hull
      g.fillRect(bx - 1, at(b.d) - 1, 2, 2)
    }
    g.fillStyle = COL.gold
    g.fillRect(bx - 2, at(this.me.d) - 1, 4, 3)
    g.fillStyle = '#f8f8f0'
    g.fillRect(bx - 2, top - 1, 4, 1)
  }
}

function fmt(t: number) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`
}
