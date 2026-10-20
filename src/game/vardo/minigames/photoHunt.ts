// Fotojakt: drag the viewfinder, tap to take a picture. In 'fluke' mode humpbacks blow,
// arch and lift their tails; a sharp photo of the underside, fully raised and inside the
// frame, identifies the whale. In 'birds' mode puffins, guillemots and kittiwakes fly past
// the Hornøya bird cliff; birds in the frame score, puffins most.

import { Pix, hash, mix, rng } from '../../../art/pixel'
import { heartSprite, INK } from '../../../art/sprites'
import { sfx } from '../../../audio'
import type { MiniInput, PhotoResult } from '../types'
import { bands, Bits, clamp, COL, dither, lerp, Mini, seaBackdrop } from './common'
import { text, textC, textW } from './font'

type Mode = 'fluke' | 'birds'

// ---------- whales ----------

interface Whale {
  id: string
  /** reported when photographed well (only ids we were asked to find) */
  report: boolean
  x: number
  y: number
  s: number
  t: number
  dir: 1 | -1
}

const BLOW = [0, 0.9]
const BACK = [0.6, 2.1]
const UP = 2.1
const PEAK = 2.8
const HOLD = 3.15
const DOWN = 3.8
const LIFE = 4.6

/** how far the tail is out of the water, 0..1 */
function raise(t: number) {
  if (t < UP || t > DOWN) return 0
  if (t < PEAK) return Math.sin(((t - UP) / (PEAK - UP)) * Math.PI * 0.5)
  if (t < HOLD) return 1
  return Math.cos(((t - HOLD) / (DOWN - HOLD)) * Math.PI * 0.5)
}

const FW = 44
const FH = 20
const flukes = new Map<string, HTMLCanvasElement>()

/** A humpback's tail flukes, raised. underside = the black and white ID pattern */
export function flukeSprite(id: string, underside: boolean) {
  const key = id + (underside ? ':u' : ':t')
  const hit = flukes.get(key)
  if (hit) return hit
  const p = new Pix(FW, FH)
  const r = rng(hash(id) || 7)
  const scar = /arret/i.test(id)
  const white = scar ? 0.12 : 0.15 + r() * 0.75
  const blobs: [number, number, number, number, boolean][] = []
  const n = 3 + Math.floor(r() * 5)
  for (let i = 0; i < n; i++) blobs.push([(r() - 0.5) * 1.9, 0.2 + r() * 0.75, 0.12 + r() * 0.3, 0.1 + r() * 0.25, white > 0.5 ? false : true])
  const specks = Math.floor(r() * 3)
  for (let x = 0; x < FW; x++) {
    const u = ((x + 0.5) / FW) * 2 - 1
    const a = Math.abs(u)
    // lobe tips curve up, a notch in the middle, a scalloped trailing edge on top
    let top = Math.round(FH * (0.42 - 0.38 * Math.pow(a, 1.6)))
    if (a < 0.07) top += 3
    if (hash(`${id}${x}`) % 3 === 0 && a < 0.92) top += 1
    const stock = a < 0.13
    const bot = stock ? FH - 1 : Math.round(Math.min(FH * (0.74 + 0.26 * Math.pow(1 - a, 1.5)), top + (1 - a) * FH * 2.6))
    for (let y = Math.max(0, top); y <= bot; y++) {
      const v = (y - top) / Math.max(1, FH - top)
      let c: string
      if (!underside || stock) c = y === top ? '#4a5060' : (x + y) % 5 === 0 ? '#323846' : '#2a2e3a'
      else {
        let w = v > 0.05 && a < 0.96 ? white > 0.5 : false
        for (const [bx, by, rx, ry, isWhite] of blobs) if (((u - bx) / rx) ** 2 + ((v - by) / ry) ** 2 < 1) w = isWhite
        if (specks && hash(`${x},${y},${id}`) % (specks === 1 ? 23 : 11) === 0) w = !w
        // the black trailing edge
        if (y <= top + 1 || a > 0.9) w = false
        if (scar && Math.abs(v - 0.15 - (u - 0.15) * 0.9) < 0.07 && u > -0.05 && u < 0.85) w = true
        if (scar && u < -0.3 && u > -0.7 && Math.abs(v - 0.5 - (u + 0.5) * 0.4) < 0.05) w = true
        c = w ? (y % 3 === 0 ? '#e8ecf0' : '#f8f8f4') : (x + y) % 6 === 0 ? '#323846' : '#22262e'
      }
      p.set(x, y, c)
    }
  }
  p.outline(0.5)
  const c = p.toCanvas()
  flukes.set(key, c)
  return c
}

// ---------- birds ----------

type BirdKind = 'lunde' | 'lomvi' | 'krykkje'
interface Bird {
  kind: BirdKind
  x: number
  y: number
  vx: number
  ph: number
}
const BIRD_SCORE: Record<BirdKind, number> = { lunde: 0.4, lomvi: 0.18, krykkje: 0.14 }

function drawBird(g: CanvasRenderingContext2D, b: Bird, t: number) {
  const x = Math.round(b.x)
  const y = Math.round(b.y)
  const d = b.vx > 0 ? 1 : -1
  const px = (i: number, j: number, c: string, w = 1, h = 1) => {
    g.fillStyle = c
    g.fillRect(d > 0 ? x + i : x - i - w + 1, y + j, w, h)
  }
  if (b.kind === 'lunde') {
    // a puffin whirring: round black body, white face, orange beak and feet
    const up = Math.floor(t * 22 + b.ph) % 2 === 0
    px(-3, 0, INK, 6, 3)
    px(-2, 0, '#2a2a34', 4, 2)
    px(1, 0, '#f4f0e8', 2, 2)
    px(3, 0, '#f07a2a', 2, 1)
    px(3, 1, '#e8b830', 1, 1)
    px(-3, 2, '#f07a2a', 1, 1)
    if (up) px(-1, -2, INK, 2, 2)
    else px(-1, 3, INK, 2, 2)
  } else if (b.kind === 'lomvi') {
    // a guillemot: dark brown on top, white below, straight and fast
    const up = Math.floor(t * 14 + b.ph) % 2 === 0
    px(-4, 0, '#3a2e2a', 8, 2)
    px(-3, 1, '#f4f0e8', 6, 1)
    px(4, 0, '#3a2e2a', 1, 1)
    px(5, 0, INK, 1, 1)
    if (up) px(-2, -2, '#3a2e2a', 3, 2)
    else px(-2, 2, '#3a2e2a', 3, 2)
  } else {
    // a kittiwake gliding: white with grey wings and black tips
    const up = Math.floor(t * 4 + b.ph) % 3 === 0
    px(-2, 0, '#f8f8f4', 6, 2)
    px(4, 0, '#e8c84a', 1, 1)
    if (up) {
      px(-5, -2, INK, 1, 1)
      px(-4, -1, '#a8b0bc', 3, 1)
      px(4, -2, INK, 1, 1)
      px(1, -1, '#a8b0bc', 3, 1)
    } else {
      px(-7, 0, INK, 1, 1)
      px(-6, 0, '#a8b0bc', 4, 1)
      px(4, -1, '#a8b0bc', 4, 1)
      px(8, -1, INK, 1, 1)
    }
  }
}

// ---------- the game ----------

interface Shot {
  score: number
  img: HTMLCanvasElement | null
  id?: string
  t: number
}

export class PhotoHunt extends Mini<PhotoResult> {
  readonly title = 'Fotojakt'
  private mode: Mode
  private rand: () => number
  private wanted: string[]
  private whales: Whale[] = []
  private nextWhale = 0.4
  private birds: Bird[] = []
  private nextBird = 0
  private perched: { kind: BirdKind; x: number; y: number }[] = []
  private film: number
  private shots: Shot[] = []
  private vx = 0
  private vy = 0
  private lastX = 0
  private lastY = 0
  private moved = 0
  private cand: { score: number; id?: string } | null = null
  private capture: Shot | null = null
  private flash = 0
  private cheer = 0
  private bits = new Bits()
  private pops: { x: number; y: number; t: number; s: string; c: string }[] = []
  private W = 196
  private H = 420
  private placed = false
  private limit: number
  private heart = heartSprite()
  private whaleN = 0

  constructor(mode: Mode, opts: { whales?: string[]; rand?: () => number } = {}) {
    super()
    this.mode = mode
    this.rand = opts.rand ?? Math.random
    this.wanted = (opts.whales ?? []).slice()
    this.film = mode === 'fluke' ? 3 : 6
    this.limit = mode === 'fluke' ? 28 : 20
    if (mode === 'birds') {
      const r = rng(1234)
      for (let i = 0; i < 26; i++) this.perched.push({ kind: r() < 0.55 ? 'lomvi' : 'krykkje', x: r(), y: r() })
      for (let i = 0; i < 7; i++) this.perched.push({ kind: 'lunde', x: r(), y: -1 })
    }
  }

  private get vw() {
    return 76
  }
  private get vh() {
    return 56
  }
  private get horizon() {
    return Math.round(this.H * (this.mode === 'fluke' ? 0.27 : 0.62))
  }
  private get cliffX() {
    return Math.round(this.W * 0.56)
  }

  // ---------- play ----------

  protected step(dt: number, inp: MiniInput, playing: boolean) {
    if (!this.placed) {
      this.placed = true
      this.vx = this.W / 2
      this.vy = this.mode === 'fluke' ? this.H * 0.42 : this.H * 0.36
    }
    this.flash = Math.max(0, this.flash - dt * 3)
    this.cheer = Math.max(0, this.cheer - dt)
    this.bits.update(dt, this.H)
    for (const p of this.pops) p.t += dt
    this.pops = this.pops.filter((p) => p.t < 1.1)
    for (const s of this.shots) s.t += dt
    if (this.mode === 'fluke') this.whaleStep(dt, playing)
    else this.birdStep(dt, playing)
    if (!playing) return

    // aim by dragging, snap by tapping: the picture is what was in frame the moment the finger went down
    if (inp.tap) {
      this.lastX = inp.x
      this.lastY = inp.y
      this.moved = 0
      this.cand = this.score()
    } else if (inp.down) {
      const dx = inp.x - this.lastX
      const dy = inp.y - this.lastY
      this.moved += Math.abs(dx) + Math.abs(dy)
      this.vx = clamp(this.vx + dx, this.vw / 2 + 2, this.W - this.vw / 2 - 2)
      this.vy = clamp(this.vy + dy, this.vh / 2 + 24, this.H * 0.8 - this.vh / 2)
      this.lastX = inp.x
      this.lastY = inp.y
    }
    if (inp.release && this.cand && this.moved < 6 && this.film > 0) this.snap(this.cand)
    if (inp.release) this.cand = null

    const out = this.film <= 0 && this.flash <= 0 && (this.shots.at(-1)?.t ?? 0) > 0.8
    if (out || this.pt >= this.limit) this.end()
  }

  private snap(c: { score: number; id?: string }) {
    this.film--
    const shot: Shot = { score: c.score, img: null, id: c.id, t: 0 }
    this.shots.push(shot)
    this.capture = shot
    this.flash = 1
    sfx.click()
    sfx.tick()
    const word = rating(c.score)
    this.pops.push({ x: this.vx, y: this.vy - this.vh / 2 - 10, t: 0, s: word, c: c.score >= 0.6 ? COL.gold : c.score >= 0.3 ? COL.paper : '#ff9a7a' })
    if (c.id) {
      this.pops.push({ x: this.vx, y: this.vy + this.vh / 2 + 4, t: 0, s: 'HALE-ID!', c: COL.green })
      sfx.chest()
    }
    if (this.mode === 'birds' && c.score >= 0.4) {
      this.cheer = 1.2
      sfx.coin()
    }
  }

  private end() {
    const scores = this.shots.map((s) => s.score).sort((a, b) => b - a)
    const best = this.shots.filter((s) => s.id).sort((a, b) => b.score - a.score)[0]
    const card =
      this.mode === 'fluke'
        ? [best ? 'HALEFINNE-ID!' : scores[0] >= 0.3 ? 'FINE BILDER' : 'INGEN GODE BILDER', `${this.shots.length} BILDER TATT`, ...(scores.length ? [`BESTE: ${Math.round(scores[0] * 100)}%`] : [])]
        : [scores[0] >= 0.6 ? 'GJESTENE JUBLER!' : scores[0] >= 0.3 ? 'FINE BILDER' : 'FUGLENE VAR FOR RASKE', `${this.shots.length} BILDER TATT`, ...(scores.length ? [`BESTE: ${Math.round(scores[0] * 100)}%`] : [])]
    const r: PhotoResult = { shots: scores }
    if (best?.id) r.fluke = best.id
    this.finish(r, card, (scores[0] ?? 0) >= 0.3)
  }

  /** what a photo taken right now would be worth */
  private score(): { score: number; id?: string } {
    const x0 = this.vx - this.vw / 2
    const y0 = this.vy - this.vh / 2
    const inside = (x: number, y: number, w: number, h: number) => {
      const ix = Math.max(0, Math.min(x + w, x0 + this.vw) - Math.max(x, x0))
      const iy = Math.max(0, Math.min(y + h, y0 + this.vh) - Math.max(y, y0))
      return (ix * iy) / Math.max(1, w * h)
    }
    if (this.mode === 'fluke') {
      let best = { score: 0 } as { score: number; id?: string }
      for (const w of this.whales) {
        const r = raise(w.t)
        if (r > 0.02) {
          const b = this.flukeBox(w)
          const frame = inside(b.x, b.y, b.w, b.h) ** 2
          const timing = r < 0.65 ? r * 0.45 : 0.45 + 0.55 * ((r - 0.65) / 0.35)
          // a tail far out at sea is small in the picture
          const size = clamp(0.55 + w.s * 0.45)
          const s = clamp(timing * frame * size)
          if (s > best.score) best = { score: s, id: s >= 0.6 && w.report ? w.id : undefined }
        } else if (w.t > BLOW[0] && w.t < BACK[1]) {
          const s = inside(w.x - 20 * w.s, w.y - 22 * w.s, 40 * w.s, 24 * w.s) * 0.18
          if (s > best.score) best = { score: s }
        }
      }
      return best
    }
    let s = 0
    for (const b of this.birds) if (inside(b.x - 4, b.y - 2, 8, 4) > 0.6) s += BIRD_SCORE[b.kind]
    let perched = 0
    for (const p of this.perchedPos()) if (inside(p.x - 1, p.y - 3, 3, 4) > 0.9) perched += p.kind === 'lunde' ? 0.06 : 0.025
    return { score: clamp(s + Math.min(0.2, perched)) }
  }

  private whaleStep(dt: number, playing: boolean) {
    for (const w of this.whales) {
      const before = w.t
      w.t += dt
      if (before < BLOW[0] + 0.05 && w.t >= BLOW[0] + 0.05) sfx.whale(w.s < 0.8)
      if (before < DOWN - 0.1 && w.t >= DOWN - 0.1) {
        this.bits.splash(w.x, w.y, 10, 0.5 * w.s)
        sfx.splash()
      }
      // white water running off the raised tail
      const r = raise(w.t)
      if (r > 0.3 && Math.random() < dt * 30) {
        const b = this.flukeBox(w)
        this.bits.add(b.x + Math.random() * b.w, b.y + b.h * (0.3 + Math.random() * 0.5), 0, 10, Math.random() < 0.5 ? '#ffffff' : '#cfe8f4', 0.5, 120)
      }
    }
    this.whales = this.whales.filter((w) => w.t < LIFE)
    this.nextWhale -= dt
    if (this.nextWhale <= 0 && (playing || this.phase === 'intro') && this.whales.length < 2) {
      const rr = this.rand
      const y = lerp(this.horizon + 26, this.H * 0.62, rr())
      const s = 0.55 + ((y - this.horizon) / (this.H * 0.62 - this.horizon)) * 0.55
      let id: string
      let report = false
      if (this.wanted.length && (this.whaleN === 0 || rr() < 0.75)) {
        id = this.wanted[Math.floor(rr() * this.wanted.length)]
        report = true
      } else id = 'kjent' + Math.floor(rr() * 6)
      this.whaleN++
      this.whales.push({ id, report, x: lerp(40, this.W - 40, rr()), y, s, t: 0, dir: rr() < 0.5 ? 1 : -1 })
      this.nextWhale = 4.2 + rr() * 2
    }
  }

  private flukeBox(w: Whale) {
    const r = raise(w.t)
    const fw = Math.round(FW * w.s)
    const fh = Math.round(FH * w.s * 1.1)
    const vis = Math.max(1, Math.round(fh * r))
    const x = Math.round(w.x + w.dir * 16 * w.s - fw / 2)
    return { x, y: Math.round(w.y - vis), w: fw, h: vis, full: fh }
  }

  private birdStep(dt: number, playing: boolean) {
    for (const b of this.birds) {
      b.x += b.vx * dt
      if (b.kind === 'krykkje') b.y += Math.sin(this.t * 2 + b.ph) * 8 * dt
    }
    this.birds = this.birds.filter((b) => b.x > -20 && b.x < this.W + 20)
    this.nextBird -= dt
    if (this.nextBird <= 0 && (playing || this.phase === 'intro')) {
      const r = this.rand()
      const kind: BirdKind = r < 0.3 ? 'lunde' : r < 0.65 ? 'lomvi' : 'krykkje'
      const dir = this.rand() < 0.5 ? 1 : -1
      const n = kind === 'lunde' && this.rand() < 0.5 ? 2 + Math.floor(this.rand() * 2) : 1
      const y = lerp(this.H * 0.18, this.H * 0.6, this.rand())
      const sp = kind === 'lunde' ? 70 + this.rand() * 25 : kind === 'lomvi' ? 58 + this.rand() * 20 : 28 + this.rand() * 16
      for (let i = 0; i < n; i++)
        this.birds.push({ kind, x: dir > 0 ? -12 - i * 9 : this.W + 12 + i * 9, y: y + i * 4 * (i % 2 ? 1 : -1), vx: dir * sp, ph: this.rand() * 10 })
      this.nextBird = 0.45 + this.rand() * 0.8
    }
  }

  protected playHint() {
    if (this.film <= 0) return 'Filmen er brukt opp'
    if (this.mode === 'fluke') {
      if (this.whales.some((w) => raise(w.t) > 0.1 && raise(w.t) < 0.95 && w.t < PEAK)) return 'Vent til halen står rett opp …'
      if (this.whales.some((w) => w.t > BLOW[0] && w.t < UP)) return 'Den dukker snart! Sikt på der halen kommer'
      return 'Dra for å sikte, trykk for å ta bilde'
    }
    return 'Dra for å sikte, trykk for å ta bilde. Lundefuglen er best!'
  }

  // ---------- drawing ----------

  protected scene(g: CanvasRenderingContext2D, W: number, H: number) {
    this.W = W
    this.H = H
    if (this.mode === 'fluke') this.drawSea(g, W, H)
    else this.drawCliff(g, W, H)
    this.bits.draw(g)
    if (this.capture) {
      // the photo is the frame as it is drawn right now, before the viewfinder goes on top
      const m = g.getTransform()
      const c = document.createElement('canvas')
      c.width = this.vw
      c.height = this.vh
      const cg = c.getContext('2d')!
      cg.imageSmoothingEnabled = false
      cg.drawImage(g.canvas, (this.vx - this.vw / 2) * m.a + m.e, (this.vy - this.vh / 2) * m.d + m.f, this.vw * m.a, this.vh * m.d, 0, 0, this.vw, this.vh)
      this.capture.img = c
      this.capture = null
    }
    if (this.mode === 'birds') this.drawGuests(g, W, H)
    this.viewfinder(g, W, H)
    if (this.flash > 0) {
      g.fillStyle = `rgba(255,255,248,${(this.flash * 0.8).toFixed(2)})`
      g.fillRect(0, 0, W, H)
    }
    for (const p of this.pops) {
      if (p.t > 0.8 && Math.floor(p.t * 20) % 2) continue
      textC(g, p.s, p.x, Math.round(p.y - p.t * 10), p.c)
    }
    this.strip(g, W, H)
  }

  private drawSea(g: CanvasRenderingContext2D, W: number, H: number) {
    const hz = this.horizon
    seaBackdrop(g, W, hz, this.t)
    bands(g, 0, hz, W, H - hz, '#6a8aa8', '#1e3e60', 10)
    // waves, longer and closer together towards the horizon
    for (let i = 0; i < 70; i++) {
      const k = (i * 0.618) % 1
      const y = Math.round(hz + 2 + Math.pow(k, 1.6) * (H - hz))
      const len = 2 + Math.round(k * 9)
      const x = ((i * 47 + this.t * (3 + k * 8)) % (W + 20)) - 10
      g.fillStyle = k < 0.3 ? '#a8c0d4' : i % 3 ? '#4a7a9a' : '#8ab0c8'
      g.fillRect(Math.round(x), y, len, 1)
    }
    const ws = [...this.whales].sort((a, b) => a.y - b.y)
    for (const w of ws) this.drawWhale(g, w)
    // the bow of our boat at the bottom
    const by = Math.round(H * 0.86)
    g.fillStyle = INK
    g.fillRect(0, by - 1, W, H - by + 1)
    g.fillStyle = '#e8e4dc'
    g.fillRect(0, by, W, H - by)
    g.fillStyle = '#2a4a7a'
    g.fillRect(0, by + 4, W, 2)
    g.fillStyle = '#c98a4a'
    g.fillRect(0, by, W, 2)
  }

  private drawWhale(g: CanvasRenderingContext2D, w: Whale) {
    const s = w.s
    const x = w.x
    const y = Math.round(w.y)
    // the blow: a column of mist that rises and drifts
    if (w.t > BLOW[0] && w.t < BLOW[1] + 0.8) {
      const k = (w.t - BLOW[0]) / (BLOW[1] - BLOW[0])
      const hgt = Math.round(Math.min(1, k * 2) * 22 * s)
      const fade = clamp(1.6 - k)
      for (let j = 0; j < hgt; j++) {
        const spread = 1 + Math.round((j / Math.max(1, hgt)) * 4 * s)
        for (let i = -spread; i <= spread; i++) {
          if ((i + j + Math.floor(w.t * 12)) % 2 && Math.abs(i) === spread) continue
          if (Math.random() > fade) continue
          g.fillStyle = j > hgt * 0.7 ? '#e8eef4' : '#ffffff'
          g.fillRect(Math.round(x - w.dir * 10 * s + i + k * 3), y - 3 - j, 1, 1)
        }
      }
    }
    // the back rolling over in an arch with its small dorsal fin
    if (w.t > BACK[0] && w.t < BACK[1]) {
      const k = (w.t - BACK[0]) / (BACK[1] - BACK[0])
      const len = Math.round(42 * s)
      const hgt = Math.sin(Math.PI * k) * 7 * s
      const cx = x - w.dir * 14 * s + w.dir * k * 22 * s
      for (let i = -len / 2; i <= len / 2; i++) {
        const u = i / (len / 2)
        const h = Math.round(hgt * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - 0.3 * u * w.dir))
        if (h <= 0) continue
        for (let j = 0; j < h; j++) {
          g.fillStyle = j === h - 1 ? '#4a5060' : j === h - 2 ? '#323846' : '#22262e'
          g.fillRect(Math.round(cx + i), y - j, 1, 1)
        }
        // the dorsal fin sits two thirds back
        if (Math.abs(u + w.dir * 0.4) < 0.08 && k > 0.35) {
          g.fillStyle = '#22262e'
          g.fillRect(Math.round(cx + i), y - h - Math.round(2 * s), 1, Math.round(2 * s))
        }
      }
      g.fillStyle = '#e8f4fa'
      g.fillRect(Math.round(cx - len / 2) - 1, y, len + 2, 1)
    }
    // the flukes
    const r = raise(w.t)
    if (r > 0) {
      const b = this.flukeBox(w)
      const img = flukeSprite(w.id, r > 0.6)
      const srcH = Math.max(1, Math.round(FH * r))
      g.drawImage(img, 0, 0, FW, srcH, b.x, b.y, b.w, b.h)
      // white water where the tail stock leaves the sea
      g.fillStyle = '#ffffff'
      g.fillRect(b.x + Math.round(b.w * 0.3), y, Math.round(b.w * 0.4), 1)
      g.fillStyle = '#cfe8f4'
      g.fillRect(b.x + Math.round(b.w * 0.2), y + 1, Math.round(b.w * 0.6), 1)
    }
    // the footprint: a patch of smooth water after the dive
    if (w.t > DOWN && w.t < LIFE) {
      const k = (w.t - DOWN) / (LIFE - DOWN)
      g.fillStyle = mix('#8ab0c8', '#4a7a9a', k)
      const fw = Math.round(30 * s * (0.6 + k * 0.6))
      g.fillRect(Math.round(x + w.dir * 16 * s - fw / 2), y, fw, 2)
    }
  }

  private perchedPos() {
    const cx = this.cliffX
    const top = Math.round(this.H * 0.16)
    const bot = this.horizon
    return this.perched.map((p) => {
      if (p.y < 0) return { kind: p.kind, x: Math.round(cx + 16 + p.x * (this.W - cx - 20)), y: top + 6 + Math.round(p.x * 3) }
      // ledges every 14 px down the cliff face
      const row = Math.floor(p.y * Math.max(1, Math.floor((bot - top - 24) / 14)))
      const ly = top + 24 + row * 14
      const edge = this.cliffEdge(ly)
      return { kind: p.kind, x: Math.round(edge + 4 + p.x * (this.W - edge - 8)), y: ly }
    })
  }

  private cliffEdge(y: number) {
    return this.cliffX + Math.round(Math.sin(y * 0.09) * 5 + Math.sin(y * 0.031) * 8) - Math.round((y - this.H * 0.16) * 0.12)
  }

  private drawCliff(g: CanvasRenderingContext2D, W: number, H: number) {
    const hz = this.horizon
    bands(g, 0, 0, W, hz, '#4a6a98', '#d8dce0', 9)
    // far sea and the water under the cliff
    bands(g, 0, hz, W, H - hz, '#6a8aa8', '#2a4a6a', 6)
    for (let i = 0; i < 30; i++) {
      const k = (i * 0.618) % 1
      const y = Math.round(hz + 2 + Math.pow(k, 1.5) * (H - hz))
      const x = ((i * 53 + this.t * (3 + k * 6)) % (W + 20)) - 10
      g.fillStyle = i % 3 ? '#4a7a9a' : '#a8c0d4'
      g.fillRect(Math.round(x), y, 2 + Math.round(k * 7), 1)
    }
    // Hornøya: a steep cliff with grassy top and the lighthouse
    const top = Math.round(H * 0.16)
    for (let y = top; y < hz + 4; y++) {
      const edge = this.cliffEdge(y)
      for (let x = edge; x < W; x++) {
        const d = x - edge
        let c = (x * 3 + y * 7) % 13 === 0 ? '#4a4640' : (x + y * 2) % 9 === 0 ? '#7a7466' : '#625c50'
        if (d < 2) c = '#3a3630'
        else if (d < 4) c = '#7a7466'
        // ledges with guano streaks under them
        const ly = (y - top - 24) % 14
        if (y > top + 20 && ly === 0) c = '#8a8474'
        else if (y > top + 20 && ly > 0 && ly < 5 && (x * 7) % 5 === 0) c = '#d8d4c8'
        g.fillStyle = c
        g.fillRect(x, y, 1, 1)
      }
    }
    // the grass on top
    for (let x = this.cliffEdge(top); x < W; x++) {
      const h = 6 + Math.round(Math.sin(x * 0.2) * 1.5)
      g.fillStyle = '#5a7a3a'
      g.fillRect(x, top - 2, 1, h)
      g.fillStyle = '#7a9a4a'
      g.fillRect(x, top - 2, 1, 1)
      if (x % 17 === 5) {
        g.fillStyle = '#2a2420'
        g.fillRect(x, top + 2, 3, 2)
      }
    }
    // the lighthouse on Hornøya
    const lx = W - 22
    g.fillStyle = INK
    g.fillRect(lx - 3, top - 22, 7, 21)
    g.fillStyle = '#f4f4f0'
    g.fillRect(lx - 2, top - 20, 5, 18)
    g.fillStyle = '#c8423a'
    g.fillRect(lx - 2, top - 24, 5, 4)
    g.fillStyle = '#ffd36a'
    g.fillRect(lx - 1, top - 23, 3, 2)
    // foam at the foot of the cliff
    for (let y = hz - 1; y < hz + 4; y++) {
      g.fillStyle = (y + Math.floor(this.t * 6)) % 2 ? '#ffffff' : '#cfe8f4'
      g.fillRect(this.cliffEdge(y) - 2, y, 3, 1)
    }
    // birds on the ledges
    for (const p of this.perchedPos()) {
      const bob = Math.floor(this.t * 2 + p.x) % 7 === 0 ? 1 : 0
      if (p.kind === 'lomvi') {
        g.fillStyle = '#2e2622'
        g.fillRect(p.x, p.y - 4 + bob, 2, 4 - bob)
        g.fillStyle = '#f4f0e8'
        g.fillRect(p.x + 1, p.y - 2, 1, 2)
      } else if (p.kind === 'krykkje') {
        g.fillStyle = '#f8f8f4'
        g.fillRect(p.x, p.y - 3, 3, 3)
        g.fillStyle = '#a8b0bc'
        g.fillRect(p.x, p.y - 2, 2, 1)
        g.fillStyle = '#e8c84a'
        g.fillRect(p.x + 3, p.y - 3, 1, 1)
      } else {
        g.fillStyle = INK
        g.fillRect(p.x, p.y - 5 + bob, 3, 5 - bob)
        g.fillStyle = '#f4f0e8'
        g.fillRect(p.x + 1, p.y - 4 + bob, 2, 2)
        g.fillStyle = '#f07a2a'
        g.fillRect(p.x + 3, p.y - 4 + bob, 1, 2)
      }
    }
    for (const b of this.birds) drawBird(g, b, this.t)
  }

  private drawGuests(g: CanvasRenderingContext2D, W: number, H: number) {
    const by = Math.round(H * 0.86)
    const cols = [
      ['#e8a82e', '#c8423a'],
      ['#3a6a8a', '#f2c29b'],
      ['#a83a5a', '#d9946e'],
    ]
    cols.forEach(([coat, skin], i) => {
      const x = 40 + i * 42
      const jump = this.cheer > 0 ? Math.round(Math.abs(Math.sin((this.cheer + i * 0.2) * 12)) * 4) : 0
      g.fillStyle = INK
      g.fillRect(x - 4, by - 13 - jump, 9, 14)
      g.fillStyle = coat
      g.fillRect(x - 3, by - 7 - jump, 7, 8)
      g.fillStyle = skin
      g.fillRect(x - 2, by - 12 - jump, 5, 5)
      if (this.cheer > 0) {
        g.fillStyle = coat
        g.fillRect(x - 5, by - 14 - jump, 2, 5)
        g.fillRect(x + 4, by - 14 - jump, 2, 5)
        if (i === 1) g.drawImage(this.heart, x - 3, by - 24 - jump - Math.round((1.2 - this.cheer) * 10))
      }
    })
    g.fillStyle = INK
    g.fillRect(0, by - 1, W, H - by + 1)
    g.fillStyle = '#3a5a8a'
    g.fillRect(0, by, W, H - by)
    g.fillStyle = '#c98a4a'
    g.fillRect(0, by, W, 2)
  }

  private viewfinder(g: CanvasRenderingContext2D, W: number, H: number) {
    const x0 = Math.round(this.vx - this.vw / 2)
    const y0 = Math.round(this.vy - this.vh / 2)
    const x1 = x0 + this.vw
    const y1 = y0 + this.vh
    // darken what is outside the frame
    g.fillStyle = 'rgba(20,12,36,0.28)'
    g.fillRect(0, 0, W, y0)
    g.fillRect(0, y1, W, H - y1)
    g.fillRect(0, y0, x0, this.vh)
    g.fillRect(x1, y0, W - x1, this.vh)
    // corner brackets
    const L = 8
    const br = (x: number, y: number, dx: number, dy: number) => {
      g.fillStyle = INK
      g.fillRect(x - 1, y - 1, 3, 3)
      g.fillRect(dx > 0 ? x : x - L + 1, y - 1, L, 3)
      g.fillRect(x - 1, dy > 0 ? y : y - L + 1, 3, L)
      g.fillStyle = '#f8f8f0'
      g.fillRect(dx > 0 ? x : x - L + 2, y, L - 1, 1)
      g.fillRect(x, dy > 0 ? y : y - L + 2, 1, L - 1)
    }
    br(x0, y0, 1, 1)
    br(x1 - 1, y0, -1, 1)
    br(x0, y1 - 1, 1, -1)
    br(x1 - 1, y1 - 1, -1, -1)
    const cx = Math.round(this.vx)
    const cy = Math.round(this.vy)
    g.fillStyle = 'rgba(248,248,240,0.7)'
    g.fillRect(cx - 3, cy, 2, 1)
    g.fillRect(cx + 2, cy, 2, 1)
    g.fillRect(cx, cy - 3, 1, 2)
    g.fillRect(cx, cy + 2, 1, 2)
    // film left
    const ft = `FILM ${this.film}`
    text(g, ft, x0 + 3, y1 - 9, this.film ? COL.paper : COL.red)
    if (this.mode === 'fluke' && this.whales.some((w) => raise(w.t) > 0.97)) {
      if (Math.floor(this.t * 8) % 2) {
        g.fillStyle = COL.red
        g.fillRect(x1 - 7, y0 + 4, 3, 3)
      }
    }
  }

  private strip(g: CanvasRenderingContext2D, W: number, H: number) {
    const n = this.mode === 'fluke' ? 3 : 6
    const tw = this.mode === 'fluke' ? 38 : 26
    const th = Math.round(tw * (this.vh / this.vw))
    const gap = 4
    const total = n * tw + (n - 1) * gap
    const x0 = Math.round((W - total) / 2)
    const y = Math.round(H * 0.79) - th
    g.fillStyle = INK
    g.fillRect(x0 - 4, y - 4, total + 8, th + 8)
    g.fillStyle = '#2a2420'
    g.fillRect(x0 - 3, y - 3, total + 6, th + 6)
    for (let i = 0; i < total + 6; i += 4) {
      g.fillStyle = '#5a4a3e'
      g.fillRect(x0 - 3 + i, y - 3, 2, 1)
      g.fillRect(x0 - 3 + i, y + th + 2, 2, 1)
    }
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (tw + gap)
      const s = this.shots[i]
      if (s?.img) {
        const k = clamp(s.t * 4)
        g.drawImage(s.img, x, y, tw, th)
        if (k < 1) dither(g, x, y, tw, th, '#fff8e8', 1 - k)
        if (s.id) {
          g.fillStyle = COL.green
          g.fillRect(x, y, tw, 1)
          g.fillRect(x, y + th - 1, tw, 1)
        }
      } else {
        g.fillStyle = '#4a3e36'
        g.fillRect(x, y, tw, th)
      }
    }
    // the score of the latest photo under the strip
    const last = this.shots.at(-1)
    if (last && last.t < 2.5) {
      const w = rating(last.score)
      text(g, w, Math.round(W / 2 - textW(w) / 2), y + th + 6, last.score >= 0.6 ? COL.gold : COL.paper)
    }
    // time left for the bird tour
    if (this.mode === 'birds' && this.phase === 'play') {
      const left = Math.max(0, Math.ceil(this.limit - this.pt))
      text(g, `${left}`, 10, Math.round(H * 0.12), left <= 5 ? COL.red : COL.paper, { scale: 2 })
    }
  }
}

function rating(s: number) {
  return s >= 0.85 ? 'SKARPT!' : s >= 0.6 ? 'GODT BILDE' : s >= 0.3 ? 'OK' : s > 0.02 ? 'UKLART' : 'BOM'
}
