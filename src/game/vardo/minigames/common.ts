// Shared pieces for the Vardø minigames: the intro/end-card phases, wooden frames,
// splash particles, dithered gradients and fish sprites with a fallback look.

import { genFish, type FishArt, type Look } from '../../../art/fishgen'
import { hash, mix, rgba, shade } from '../../../art/pixel'
import { INK } from '../../../art/sprites'
import { sfx } from '../../../audio'
import { SPECIES_BY_ID } from '../../data'
import type { MiniGame, MiniInput } from '../types'
import { LINE, textC } from './font'

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const ease = (t: number) => t * t * (3 - 2 * t)

export const NO_INPUT: MiniInput = { down: false, x: 0, y: 0, tap: false, release: false, swipe: 0 }

export const COL = {
  ink: INK,
  paper: '#f4ecdc',
  gold: '#ffd84a',
  green: '#7ae05a',
  red: '#e8503a',
  amber: '#f2c24a',
  wood: '#c98a4a',
  dark: '#1a2238',
}

const INTRO = 2
const OUTRO = 1

/**
 * Every minigame runs «Klar …» → «Nå!» → play → end card → result. Subclasses implement
 * step() (called every frame, also during intro and end card so the scene keeps moving)
 * and scene(); they call finish() once when the game is over.
 */
export abstract class Mini<R> implements MiniGame<R> {
  abstract readonly title: string
  result: R | null = null
  phase: 'intro' | 'play' | 'end' = 'intro'
  /** seconds in the current phase */
  pt = 0
  /** seconds since start */
  t = 0
  private pending: R | null = null
  private card: string[] = []
  private cardCol = COL.paper
  private klar = false

  update(dt: number, input: MiniInput) {
    if (this.result) return
    dt = Math.min(dt, 0.05)
    this.t += dt
    this.pt += dt
    if (this.phase === 'intro') {
      if (!this.klar) {
        this.klar = true
        sfx.click()
      }
      this.step(dt, NO_INPUT, false)
      if (this.pt >= INTRO) {
        this.phase = 'play'
        this.pt = 0
        sfx.bite()
        this.begin()
      }
    } else if (this.phase === 'play') this.step(dt, input, true)
    else {
      this.step(dt, NO_INPUT, false)
      if (this.pt >= OUTRO && this.pending) this.result = this.pending
    }
  }

  /** called once when «Nå!» shows */
  protected begin() {}
  protected abstract step(dt: number, input: MiniInput, playing: boolean): void
  protected abstract scene(g: CanvasRenderingContext2D, W: number, H: number): void
  protected abstract playHint(): string

  hint() {
    // the intro is when you have time to read what to do
    if (this.phase === 'intro') return this.playHint()
    if (this.phase === 'end') return this.card[0] ?? 'Ferdig!'
    return this.playHint()
  }

  /** ends the game; the end card shows for a second before result is set */
  protected finish(r: R, card: string[], good = true) {
    if (this.phase === 'end') return
    this.pending = r
    this.card = card
    this.cardCol = good ? COL.gold : '#ff9a7a'
    this.phase = 'end'
    this.pt = 0
    if (good) sfx.catch()
    else sfx.lose()
  }

  draw(g: CanvasRenderingContext2D, W: number, H: number) {
    g.imageSmoothingEnabled = false
    g.save()
    this.scene(g, W, H)
    g.restore()
    const cy = Math.round(H * 0.36)
    if (this.phase === 'intro') {
      const k = this.pt < 1.3
      dither(g, 0, cy - 14, W, 34, INK, 0.5)
      if (k) {
        const dots = '.'.repeat(1 + Math.min(2, Math.floor(this.pt * 2.4)))
        textC(g, 'KLAR' + dots, W / 2, cy - 2, COL.paper, { scale: 2 })
      } else {
        const pop = this.pt < 1.42 ? 4 : 3
        textC(g, 'NÅ!', W / 2, cy - (pop === 4 ? 6 : 4), COL.gold, { scale: pop })
      }
      textC(g, this.title, W / 2, cy - 26, COL.paper)
    } else if (this.phase === 'play' && this.pt < 0.5) {
      // «Nå!» lingers a moment and fades out by dithering
      if (Math.floor(this.pt * 20) % 2 === 0 || this.pt < 0.25) textC(g, 'NÅ!', W / 2, cy - 4, COL.gold, { scale: 3 })
    } else if (this.phase === 'end') {
      const n = this.card.length
      const h = 10 + n * (LINE + 2) + 6
      const top = cy - Math.round(h / 2)
      const slide = Math.round(Math.max(0, 1 - this.pt * 6) * -20)
      panel(g, 16, top + slide, W - 32, h)
      this.card.forEach((l, i) => textC(g, l, W / 2, top + slide + 8 + i * (LINE + 2) + (i === 0 ? 0 : 2), i === 0 ? this.cardCol : COL.paper, { scale: 1 }))
    }
  }
}

// ---------- drawing helpers ----------

/** A checkerboard of colour over a rectangle: the pixel-art way of drawing a translucent layer */
export function dither(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, a = 0.5) {
  g.fillStyle = rgba(c, a)
  g.fillRect(x, y, w, h)
  g.fillStyle = rgba(c, a * 0.6)
  for (let j = 0; j < h; j++) for (let i = (j % 2); i < w; i += 2) g.fillRect(x + i, y + j, 1, 1)
}

/** Vertical gradient in flat bands with a dithered seam between them */
export function bands(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, bot: string, n = 8) {
  const bh = h / n
  for (let i = 0; i < n; i++) {
    const yy = Math.floor(y + i * bh)
    g.fillStyle = mix(top, bot, i / Math.max(1, n - 1))
    g.fillRect(x, yy, w, Math.ceil(bh) + 1)
    if (i > 0) {
      g.fillStyle = mix(top, bot, (i - 1) / Math.max(1, n - 1))
      for (let xx = (yy % 2); xx < w; xx += 2) g.fillRect(x + xx, yy, 1, 1)
    }
  }
}

/** The wooden frame the reel meter uses, with a fill */
export function frame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  g.fillStyle = INK
  g.fillRect(x - 2, y - 1, w + 4, h + 2)
  g.fillRect(x - 1, y - 2, w + 2, h + 4)
  g.fillStyle = COL.wood
  g.fillRect(x - 1, y - 1, w + 2, h + 2)
  g.fillStyle = shade(COL.wood, 0.25)
  g.fillRect(x - 1, y - 1, w + 2, 1)
  g.fillStyle = fill
  g.fillRect(x, y, w, h)
}

/** A dark rounded card for text */
export function panel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = '#2a2438') {
  g.fillStyle = INK
  g.fillRect(x + 1, y - 1, w - 2, h + 2)
  g.fillRect(x - 1, y + 1, w + 2, h - 2)
  g.fillRect(x, y, w, h)
  g.fillStyle = shade(fill, 0.2)
  g.fillRect(x + 1, y, w - 2, h)
  g.fillStyle = fill
  g.fillRect(x + 1, y + 1, w - 2, h - 2)
  g.fillStyle = shade(fill, 0.12)
  g.fillRect(x + 2, y + 1, w - 4, 1)
}

/** A horizontal meter: value 0..1, an optional good band, framed */
export function hbar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, v: number, col: string, band?: [number, number]) {
  frame(g, x, y, w, h, '#2a1d2e')
  if (band) {
    g.fillStyle = '#2e5a3a'
    g.fillRect(x + Math.round(band[0] * w), y, Math.round((band[1] - band[0]) * w), h)
  }
  const fw = Math.round(clamp(v) * w)
  g.fillStyle = col
  g.fillRect(x, y + 1, fw, h - 2)
  g.fillStyle = shade(col, 0.35)
  g.fillRect(x, y + 1, fw, 1)
}

// ---------- particles ----------

export interface Bit {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  c: string
  g: number
  s: number
}

/** Splashes, drips, sparkles: square pixels with gravity */
export class Bits {
  list: Bit[] = []
  add(x: number, y: number, vx: number, vy: number, c: string, life = 0.6, grav = 160, size = 1) {
    if (this.list.length < 400) this.list.push({ x, y, vx, vy, life, max: life, c, g: grav, s: size })
  }
  splash(x: number, y: number, n = 14, power = 1, cols = ['#ffffff', '#cfe8f4', '#8ac0dc']) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
      const sp = (30 + Math.random() * 60) * power
      this.add(x + (Math.random() - 0.5) * 6, y, Math.cos(a) * sp, Math.sin(a) * sp, cols[i % cols.length], 0.4 + Math.random() * 0.5, 200, Math.random() < 0.3 ? 2 : 1)
    }
  }
  update(dt: number, floor = Infinity) {
    for (const b of this.list) {
      b.life -= dt
      b.vy += b.g * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.y > floor) b.life = 0
    }
    this.list = this.list.filter((b) => b.life > 0)
  }
  draw(g: CanvasRenderingContext2D, ox = 0, oy = 0) {
    for (const b of this.list) {
      if (b.life < b.max * 0.3 && Math.floor(b.life * 30) % 2) continue
      g.fillStyle = b.c
      g.fillRect(Math.round(b.x + ox), Math.round(b.y + oy), b.s, b.s)
    }
  }
}

// ---------- fish art ----------

/** A generic North Atlantic fish, coloured from the id, for species that are not loaded yet */
function fallbackLook(id: string): Look {
  const h = hash(id)
  const kinds: Look[] = [
    { shape: 'fusiform', len: 18, h: 7, top: '#5a5a3a', mid: '#a8a070', belly: '#ece4cc', fin: '#7a7450', pattern: 'spots', pat: '#4a4628', dorsal: 'low', barbel: true },
    { shape: 'fusiform', len: 18, h: 6, top: '#3b4d58', mid: '#8496a0', belly: '#d2dbda', fin: '#5a6c76', pattern: 'line', pat: '#e2ece8', dorsal: 'low' },
    { shape: 'deep', len: 16, h: 9, top: '#a8402e', mid: '#d86a4a', belly: '#f0c8a8', fin: '#c8503a', dorsal: 'spiny' },
    { shape: 'flat', len: 17, h: 11, top: '#6a5a44', mid: '#8a7656', belly: '#a89070', fin: '#7a6a4a', pattern: 'mottled', pat: '#4a3e2e', tail: 'round', dorsal: 'long' },
  ]
  return kinds[h % kinds.length]
}

const arts = new Map<string, FishArt>()
/** Fish sprite for a species id; small = the reel-icon size */
export function fishArt(id: string, small = false) {
  const key = id + (small ? ':s' : '')
  let a = arts.get(key)
  if (!a) {
    const base = SPECIES_BY_ID[id]?.look ?? fallbackLook(id)
    let look: Look = { ...base, lure: false, glowAt: undefined }
    // keep them small enough to read as a catch in a net, never as monsters
    const maxLen = small ? 12 : 20
    if (look.len > maxLen) {
      const k = maxLen / look.len
      look = { ...look, len: maxLen, h: Math.max(4, Math.round(look.h * k)) }
    }
    if (small) look = { ...look, crest: undefined, beak: false, pattern: undefined, eye: 1 }
    a = genFish(look, id + ':mini' + (small ? 's' : ''))
    arts.set(key, a)
  }
  return a
}

/** The swell: a slow sum of sines, in pixels; returns height and vertical speed */
export function swell(t: number, amp: number) {
  const y = Math.sin(t * 1.7) * amp + Math.sin(t * 0.63 + 1.3) * amp * 0.6 + Math.sin(t * 3.1 + 0.4) * amp * 0.15
  const v = Math.cos(t * 1.7) * 1.7 * amp + Math.cos(t * 0.63 + 1.3) * 0.63 * amp * 0.6 + Math.cos(t * 3.1 + 0.4) * 3.1 * amp * 0.15
  return { y, v }
}

/** Short shake offset for hits */
export function shake(t: number, power: number) {
  if (power <= 0) return { x: 0, y: 0 }
  return { x: Math.round(Math.sin(t * 91) * power), y: Math.round(Math.cos(t * 77) * power) }
}

/** A plain sky over a far, low Varanger coast and the sea, used behind several games */
export function seaBackdrop(g: CanvasRenderingContext2D, W: number, horizon: number, t: number, hills = true) {
  bands(g, 0, 0, W, horizon, '#5a7aa8', '#d8dce0', 8)
  // thin streaks of high cloud
  g.fillStyle = '#e8ecf0'
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 67 + t * 2) % (W + 60)) - 30
    const cy = 20 + ((i * 37) % Math.max(10, horizon - 50))
    g.fillRect(Math.round(cx), cy, 22 + (i % 3) * 8, 1)
    g.fillRect(Math.round(cx) + 6, cy - 1, 10, 1)
  }
  if (hills) {
    // the Varanger tundra: long, low, rounded and treeless
    for (let x = 0; x < W; x++) {
      const h = Math.round(4 + 3 * Math.sin(x * 0.03 + 1) + 2 * Math.sin(x * 0.081) + Math.sin(x * 0.2) * 0.6)
      g.fillStyle = '#7a8496'
      g.fillRect(x, horizon - h, 1, h)
      g.fillStyle = '#8e98a8'
      g.fillRect(x, horizon - h, 1, 1)
    }
  }
}

export { INK }
