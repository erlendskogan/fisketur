// The harbour: Krambua, Havnebua, Havstasjonen and the lighthouse

import { Pix, canvas, rgba, shade, mix, rng, hex2rgb } from '../art/pixel'
import { boatSprite, catSprites, gullSprites, BOAT_W, BOAT_H } from '../art/sprites'
import { bandGradient, drawBeam, nightness } from '../art/scenery'
import { PAINTS } from './data'
import type { Save } from './state'

export type SpotId = 'krambua' | 'havnebua' | 'stasjon' | 'fyret' | 'baten'

export interface Spot {
  id: SpotId
  x: number
  y: number
  w: number
  h: number
}

// ---------- looks ----------

type SkyTable = [number, string, string][]

interface Look {
  sky: SkyTable
  /** far, mid and near hills by day and by night */
  hills: [string, string, string]
  nightHills: [string, string, string]
  water: [string, string]
  nightWater: [string, string]
  nightTint: string
  mist: number
  /** how much of the scene shows in the water */
  reflect: number
  wobble: number
  vignette: number
  rays: number
  sunGlow: number
}

/** The harbour palette: deep Kingdom-style colours, thick mist and strong reflections */
const L: Look = {
  sky: [
    [0.0, '#080a26', '#1c1848'],
    [0.16, '#0e1238', '#262058'],
    [0.2, '#1e2260', '#5a3a7a'],
    [0.23, '#2e3a80', '#e0708a'],
    [0.255, '#3a5aa0', '#ff9a6a'],
    [0.285, '#3a76bc', '#ffd09a'],
    [0.33, '#2a72bc', '#9ad6e6'],
    [0.5, '#2464b4', '#84cce6'],
    [0.6, '#2c62b0', '#b8dce0'],
    [0.66, '#3a5aa8', '#ffc888'],
    [0.705, '#40308a', '#ff7040'],
    [0.74, '#2a1e6a', '#c8486a'],
    [0.775, '#16164e', '#5a2a6a'],
    [0.82, '#080a26', '#1c1848'],
    [1.0, '#080a26', '#1c1848'],
  ],
  hills: ['#4a6a9a', '#2e5272', '#1c3e3a'],
  nightHills: ['#1e2450', '#161c40', '#0c1226'],
  water: ['#2a7a9a', '#0e3a5a'],
  nightWater: ['#16285a', '#060c26'],
  nightTint: '#0c1240',
  mist: 0.75,
  reflect: 0.62,
  wobble: 1.1,
  vignette: 0.6,
  rays: 1,
  sunGlow: 1,
}

/** Overrides used by the dev panel to preview the harbour */
export const dev = {
  time: null as number | null,
  ending: null as boolean | null,
  selma: null as boolean | null,
}

function lerpTable(tab: SkyTable, t: number): [string, string] {
  for (let i = 0; i < tab.length - 1; i++) {
    const [a, at, ab] = tab[i]
    const [b, bt, bb] = tab[i + 1]
    if (t >= a && t <= b) {
      const k = (t - a) / (b - a)
      return [mix(at, bt, k), mix(ab, bb, k)]
    }
  }
  return [tab[0][1], tab[0][2]]
}

/** Light falling on the houses through the day: [time, colour, strength]; 'night' means the palette's night tint */
const AMBIENT: [number, string, number][] = [
  [0.0, 'night', 0.6],
  [0.16, 'night', 0.58],
  [0.2, '#3a3a8a', 0.42],
  [0.23, '#c85a8a', 0.34],
  [0.255, '#ff7a4a', 0.3],
  [0.285, '#ffb060', 0.16],
  [0.34, '#ffffff', 0],
  [0.6, '#ffffff', 0],
  [0.66, '#ffa050', 0.18],
  [0.705, '#ff5a30', 0.34],
  [0.74, '#7a2a8a', 0.46],
  [0.775, '#24246e', 0.54],
  [0.82, 'night', 0.6],
  [1.0, 'night', 0.6],
]

function ambientAt(t: number, nightTint: string): [string, number] {
  const col = (c: string) => (c === 'night' ? nightTint : c)
  for (let i = 0; i < AMBIENT.length - 1; i++) {
    const [a, ac, aa] = AMBIENT[i]
    const [b, bc, ba] = AMBIENT[i + 1]
    if (t >= a && t <= b) {
      const k = (t - a) / (b - a)
      // a colour with no strength takes the neighbour's colour, so day fades cleanly
      const c0 = aa === 0 ? col(bc) : col(ac)
      const c1 = ba === 0 ? col(ac) : col(bc)
      return [mix(c0, c1, k), aa + (ba - aa) * k]
    }
  }
  return [nightTint, 0.6]
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const bump = (t: number, c: number, w: number) => clamp01(1 - Math.abs(t - c) / w)
/** 1 around sunrise and sunset */
const golden = (t: number) => Math.max(bump(t, 0.255, 0.07), bump(t, 0.715, 0.08))
const frac = (x: number) => x - Math.floor(x)
const noise = (a: number, b: number) => frac(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453)

// ---------- soft pixel glows ----------

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const glowCache = new Map<string, HTMLCanvasElement>()

/** A round glow with dithered falloff, so it stays pixelly when scaled up */
function glowSprite(r: number, col: string) {
  const key = `${r}|${col}`
  const hit = glowCache.get(key)
  if (hit) return hit
  const s = r * 2 + 1
  const { c, g } = canvas(s, s)
  const img = g.createImageData(s, s)
  const [R, G, B] = hex2rgb(col)
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - r, y - r) / (r + 0.5)
      if (d >= 1) continue
      const th = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16
      const a = Math.floor((1 - d) * (1 - d) * 5 + th) / 5
      if (a > 0) img.data.set([R, G, B, Math.round(a * 255)], (y * s + x) * 4)
    }
  g.putImageData(img, 0, 0)
  glowCache.set(key, c)
  return c
}

function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) {
  if (a <= 0.01) return
  g.globalAlpha = Math.min(1, a)
  g.drawImage(glowSprite(r, col), Math.round(x) - r, Math.round(y) - r)
  g.globalAlpha = 1
}

// ---------- pixel helpers ----------

function spr(rows: string[], pal: Record<string, string>) {
  const p = new Pix(Math.max(...rows.map((r) => r.length)), rows.length)
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (pal[row[x]]) p.set(x, y, pal[row[x]])
  })
  return p
}

function blit(dst: Pix, src: Pix, ox: number, oy: number) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.d[y * src.w + x]
      if (c) dst.set(ox + x, oy + y, c)
    }
}

function line(p: Pix, x0: number, y0: number, x1: number, y1: number, c: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= n; i++) p.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c)
}

/** Darken pixels that already exist */
function darken(p: Pix, x: number, y: number, t: number) {
  const c = p.get(x, y)
  if (c) p.set(x, y, shade(c, -t))
}

// ---------- buildings ----------

interface Light {
  x: number
  y: number
  w: number
  h: number
  kind: 'pane' | 'lamp'
  /** how dark it must be before this one is lit */
  on: number
  ph: number
}

interface Built {
  p: Pix
  lights: Light[]
  smoke: [number, number][]
  blink: [number, number][]
  vane: [number, number][]
  blades: [number, number][]
}

const built = (p: Pix): Built => ({ p, lights: [], smoke: [], blink: [], vane: [], blades: [] })

const GLASS = '#26304e'

function planks(p: Pix, x0: number, w: number, y0: number, y1: number, base: string, r: () => number, kind: 'batten' | 'siding' | 'weathered' = 'batten', inside?: (x: number, y: number) => boolean) {
  const tones = Array.from({ length: Math.ceil(w / 4) + 1 }, () => shade(base, (r() - 0.5) * 0.1))
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x0 + w; x++) {
      if (inside && !inside(x, y)) continue
      const lx = x - x0
      let c: string
      if (kind === 'siding') {
        const row = y % 3
        c = row === 2 ? shade(base, -0.1) : row === 0 ? shade(base, 0.05) : base
      } else {
        const tone = tones[Math.floor(lx / 4)]
        const k = lx % 4
        c = k === 0 ? shade(tone, 0.14) : k === 1 ? shade(tone, -0.1) : tone
        if ((lx * 13 + y * 7) % 19 === 0) c = shade(c, -0.07)
      }
      if (kind === 'weathered') {
        const q = r()
        if (q < 0.07) c = shade(c, -0.16)
        else if (q < 0.1) c = mix(c, '#5a7a4a', 0.35)
      }
      p.set(x, y, c)
    }
}

function win(b: Built, X: number, Y: number, trim: string, r: () => number, o: { flowers?: boolean; boarded?: boolean; wide?: boolean } = {}) {
  const p = b.p
  const w = o.wide ? 9 : 7
  const h = o.wide ? 7 : 9
  p.rect(X - 1, Y - 1, w + 2, 1, trim)
  p.rect(X, Y, w, h, trim)
  if (o.boarded) {
    p.rect(X + 1, Y + 1, w - 2, h - 2, '#2e2622')
    p.rect(X - 1, Y + 1, w + 2, 2, '#9a7a5a')
    p.rect(X - 1, Y + 1, w + 2, 1, '#b8946a')
    p.rect(X - 1, Y + h - 3, w + 2, 2, '#8a6a4a')
    p.rect(X - 1, Y + h - 3, w + 2, 1, '#a8845e')
    for (const yy of [Y + 2, Y + h - 2]) {
      p.set(X, yy, '#3a3438')
      p.set(X + w - 1, yy, '#3a3438')
    }
    p.rect(X - 1, Y + h, w + 2, 1, shade(trim, -0.2))
    return
  }
  p.rect(X + 1, Y + 1, w - 2, h - 2, GLASS)
  const mx = X + Math.floor(w / 2)
  const my = Y + Math.floor(h / 2)
  for (let y = Y + 1; y < Y + h - 1; y++) p.set(mx, y, trim)
  if (!o.wide) for (let x = X + 1; x < X + w - 1; x++) p.set(x, my, trim)
  const panes: [number, number, number, number][] = o.wide
    ? [
        [X + 1, Y + 1, mx - X - 1, h - 2],
        [mx + 1, Y + 1, X + w - mx - 2, h - 2],
      ]
    : [
        [X + 1, Y + 1, mx - X - 1, my - Y - 1],
        [mx + 1, Y + 1, X + w - mx - 2, my - Y - 1],
        [X + 1, my + 1, mx - X - 1, Y + h - my - 2],
        [mx + 1, my + 1, X + w - mx - 2, Y + h - my - 2],
      ]
  const on = 0.12 + r() * 0.5
  for (const [px, py, pw, ph] of panes) {
    // the sky glinting in the glass
    p.set(px, py, '#8ab8e0')
    if (pw > 1) p.set(px + 1, py, '#4a6894')
    if (ph > 2) p.set(px, py + 1, '#4a6894')
    b.lights.push({ x: px, y: py, w: pw, h: ph, kind: 'pane', on, ph: r() * 6 })
  }
  p.rect(X - 1, Y + h, w + 2, 1, shade(trim, -0.14))
  for (let x = X - 1; x < X + w + 1; x++) darken(p, x, Y + h + 1, 0.2)
  if (o.flowers) {
    p.rect(X, Y + h + 1, w, 2, '#7a4a2a')
    p.rect(X, Y + h + 1, w, 1, '#9a6234')
    const fl = ['#ff5a6a', '#ffd84a', '#f8a0d8']
    for (let i = 0; i < w; i++) p.set(X + i, Y + h, i % 2 === 0 ? fl[(i / 2) % 3] : '#4a9a3a')
    p.set(X + 1, Y + h - 1, '#5aaa3a')
    p.set(X + w - 2, Y + h - 1, '#5aaa3a')
  }
}

function door(b: Built, X: number, w: number, h: number, col: string, trim: string, glassPane = false) {
  const p = b.p
  const Y = p.h - 1 - h
  p.rect(X - 1, Y - 1, w + 2, h + 1, trim)
  p.rect(X, Y, w, h, col)
  for (let x = X + 1; x < X + w; x += 2) for (let y = Y + 1; y < Y + h; y++) p.set(x, y, shade(col, -0.16))
  p.rect(X, Y, w, 1, shade(col, -0.35))
  p.set(X + w - 2, Y + Math.floor(h * 0.55), '#ffd84a')
  if (glassPane) {
    p.rect(X + 1, Y + 2, w - 2, 4, GLASS)
    p.set(X + 1, Y + 2, '#8ab8e0')
    b.lights.push({ x: X + 1, y: Y + 2, w: w - 2, h: 4, kind: 'pane', on: 0.2, ph: 1 })
  }
  p.rect(X - 2, p.h - 1, w + 4, 1, '#9a96a4')
}

/** The red general store, gable end to the sea, with a loft hatch */
function krambua(w: number, r: () => number): Built {
  const gable = Math.round(w * 0.38)
  const wallH = 32
  const m = 6
  const apex = 9
  const top = apex + gable
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const cx = x0 + w / 2
  const wall = '#c8423a'
  const trim = '#f4ecdc'
  const roof = '#3e3a56'
  const s = gable / (w / 2)
  const yLine = (x: number) => apex - 1 + Math.abs(x + 0.5 - cx) * s

  // brick chimney, behind the roof
  const chx = Math.round(x0 + w * 0.7)
  const chTop = Math.round(yLine(chx + 2)) - 7
  for (let y = chTop; y < chTop + 12; y++)
    for (let x = chx; x < chx + 4; x++) p.set(x, y, (y - chTop) % 3 === 2 ? '#6a3430' : x === chx ? '#b0604a' : '#924a3a')
  p.rect(chx - 1, chTop, 6, 2, '#4a4458')
  p.rect(chx - 1, chTop, 6, 1, '#7a7490')
  b.smoke.push([chx + 2, chTop - 1])

  planks(p, x0, w, apex, H, wall, r, 'batten', (x, y) => y >= top || y + 0.5 >= yLine(x))
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  // trim board where the gable meets the wall
  p.rect(x0, top, w, 1, trim)
  for (let x = x0; x < x0 + w; x++) darken(p, x, top + 1, 0.2)
  for (let y = top; y < H - 1; y++) {
    p.set(x0, y, shade(trim, -0.1))
    p.set(x0 + 1, y, trim)
    p.set(x0 + w - 2, y, trim)
    p.set(x0 + w - 1, y, shade(trim, -0.22))
  }
  // barge boards and roof edge, with overhang
  for (let y = 0; y < top + 4; y++)
    for (let x = x0 - 5; x < x0 + w + 5; x++) {
      const v = yLine(x) - (y + 0.5)
      if (v < 0 || v >= 4.6) continue
      p.set(x, y, v < 1.4 ? trim : v < 2.3 ? shade(roof, -0.2) : v < 3.5 ? roof : shade(roof, 0.38))
    }
  // the crossed boards at the peak
  for (let k = 1; k <= 3; k++) {
    const y = Math.round(apex - 2.2 - k * s)
    p.set(Math.floor(cx - 0.5 + k), y, trim)
    p.set(Math.floor(cx - 0.5 - k), y, trim)
  }
  // loft hatch with a hoist beam
  const hx = Math.round(cx - 3.5)
  const hy = top - 12
  p.rect(hx - 1, hy - 1, 9, 10, trim)
  p.rect(hx, hy, 7, 9, '#6a3a2e')
  for (const x of [hx + 2, hx + 4]) for (let y = hy; y < hy + 9; y++) p.set(x, y, '#58302a')
  for (let i = 0; i < 7; i++) p.set(hx + i, hy + Math.round((i * 8) / 6), '#8a5a3a')
  p.rect(Math.round(cx) - 1, hy - 4, 2, 2, '#4a3222')
  p.set(Math.round(cx) - 1, hy - 2, '#c8a878')

  win(b, x0 + 4, top + 6, trim, r, { flowers: true })
  win(b, x0 + w - 11, top + 6, trim, r, { flowers: true })

  // door, a shop sign with a fish, and a wall lamp
  const dw = 8
  const dh = 14
  const dx = Math.round(cx - dw / 2)
  door(b, dx, dw, dh, '#2a5a4a', trim)
  const sy = H - 1 - dh - 8
  p.rect(dx - 2, sy, dw + 4, 5, '#3a2a22')
  p.rect(dx - 1, sy + 1, dw + 2, 3, '#f2dca0')
  for (let x = dx + 1; x < dx + 6; x++) p.set(x, sy + 2, '#2a6a8a')
  p.set(dx + 3, sy + 1, '#2a6a8a')
  p.set(dx + 3, sy + 3, '#2a6a8a')
  p.set(dx + 6, sy + 1, '#2a6a8a')
  p.set(dx + 6, sy + 3, '#2a6a8a')
  p.set(dx + 1, sy + 2, '#f2dca0')
  const lx = dx + dw + 3
  const ly = H - 1 - dh - 2
  p.set(lx, ly - 1, '#2a2438')
  p.rect(lx - 1, ly, 3, 1, '#2a2438')
  p.rect(lx - 1, ly + 1, 3, 2, '#ffd36a')
  p.rect(lx - 1, ly + 3, 3, 1, '#2a2438')
  b.lights.push({ x: lx - 1, y: ly + 1, w: 3, h: 2, kind: 'lamp', on: 0.1, ph: 2 })
  return b
}

/** Halvor's boathouse: long side to the sea, turf roof, stone chimney */
function havnebua(w: number, r: () => number): Built {
  const roofH = 11
  const wallH = 22
  const m = 6
  const ry = 7
  const top = ry + roofH
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const wall = '#f0b43c'
  const trim = '#f4ecdc'

  const chx = x0 + Math.round(w * 0.66)
  for (let y = 2; y < ry + 5; y++)
    for (let x = chx; x < chx + 5; x++) {
      const joint = y % 2 === 0 && (x + (y >> 1)) % 3 === 0
      p.set(x, y, x === chx ? '#aaa6b6' : joint ? '#5a566a' : '#8a8698')
    }
  p.rect(chx - 1, 1, 7, 2, '#4a4658')
  p.rect(chx - 1, 1, 7, 1, '#6e6a80')
  b.smoke.push([chx + 2, 0])

  planks(p, x0, w, top, H, wall, r)
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
    darken(p, x, top, 0.3)
    darken(p, x, top + 1, 0.14)
  }
  for (let y = top; y < H - 1; y++) {
    p.set(x0, y, shade(trim, -0.1))
    p.set(x0 + 1, y, trim)
    p.set(x0 + w - 2, y, trim)
    p.set(x0 + w - 1, y, shade(trim, -0.22))
  }

  // turf roof on a birch-bark eave
  const greens = ['#5a9a3a', '#4a8a34', '#68a842', '#4f9238']
  const flowers = ['#ffe04a', '#f8f0f4', '#e86a9a', '#b88aff']
  for (let rr = 0; rr < roofH; rr++) {
    const y = ry + rr
    const inset = Math.round((roofH - 1 - rr) * 0.5)
    for (let x = x0 - 4 + inset; x < x0 + w + 4 - inset; x++) {
      let c: string
      if (rr === roofH - 1) c = '#4a3424'
      else if (rr === roofH - 2) c = x % 3 === 0 ? '#a8946a' : '#d0bc94'
      else if (rr === 0) c = r() < 0.5 ? '#8ad05a' : '#7ac04a'
      else if (rr === 1) c = '#6ab446'
      else c = greens[Math.floor(r() * greens.length)]
      if (rr > 0 && rr < roofH - 3 && r() < 0.08) c = flowers[Math.floor(r() * flowers.length)]
      p.set(x, y, c)
    }
  }
  const inset = Math.round((roofH - 1) * 0.5)
  for (let x = x0 - 4 + inset; x < x0 + w + 4 - inset; x++) {
    if (x >= chx - 1 && x <= chx + 5) continue
    const q = r()
    if (q < 0.25) p.set(x, ry - 1, '#7ac04a')
    else if (q < 0.45) b.blades.push([x, ry - 1])
  }

  win(b, x0 + 4, top + 4, trim, r, { flowers: true })
  const dx = x0 + w - 11
  if (dx - (x0 + 13) >= 9) win(b, x0 + 14, top + 4, trim, r)
  door(b, dx, 6, 13, '#6a3a2e', trim)

  // buoys hung on the corner
  const bx = x0 + w + 1
  for (let y = top; y < top + 8; y++) p.set(bx + 1, y, '#c8a878')
  p.rect(bx, top + 2, 3, 3, '#ff6a3a')
  p.rect(bx, top + 3, 3, 1, '#f4ecdc')
  p.set(bx, top + 2, '#ffa07a')
  p.rect(bx, top + 7, 3, 3, '#f4ecdc')
  p.rect(bx, top + 8, 3, 1, '#d8433a')
  p.set(bx + 2, top + 9, '#b8b0a4')
  return b
}

/** Selma's ocean station, or the empty house before she moves in */
function stasjon(w: number, selma: boolean, r: () => number): Built {
  const wallH = 28
  const m = 5
  const roofY = 15
  const top = roofY + 3
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const wall = selma ? '#e8eef2' : '#a49c90'
  const roof = selma ? '#4a5a6e' : '#5a524a'
  const trim = selma ? '#ffffff' : '#c8bfae'

  planks(p, x0, w, top, H, wall, r, selma ? 'siding' : 'weathered')
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  if (selma) {
    p.rect(x0, top + 4, w, 1, '#4ac8b8')
    p.rect(x0, top + 5, w, 1, '#2a9a90')
  } else {
    for (let y = top + 13; y < top + 22; y++) p.set(x0 + w - 7, y, '#2a2420')
    for (let x = x0; x < x0 + w; x++) if (r() < 0.35) p.set(x, H - 2, r() < 0.5 ? '#5a7a3a' : '#4a6a32')
  }
  for (let y = top; y < H - 1; y++) {
    p.set(x0, y, shade(trim, -0.1))
    p.set(x0 + 1, y, trim)
    p.set(x0 + w - 2, y, trim)
    p.set(x0 + w - 1, y, shade(trim, -0.22))
  }
  // flat roof with a parapet
  p.rect(x0 - 2, roofY, w + 4, 3, roof)
  p.rect(x0 - 2, roofY, w + 4, 1, shade(roof, 0.3))
  p.rect(x0 - 2, roofY + 2, w + 4, 1, shade(roof, -0.25))
  for (let x = x0; x < x0 + w; x++) darken(p, x, top, 0.22)
  if (!selma) for (let x = x0 - 2; x < x0 + w + 2; x++) if (r() < 0.3) p.set(x, roofY - 1, r() < 0.5 ? '#6a9a4a' : '#5a8a3e')

  // antenna mast
  const ax = x0 + w - 6
  const mastTop = selma ? 1 : 6
  for (let y = mastTop; y < roofY; y++) {
    p.set(ax, y, '#7a7a8e')
    if ((y - mastTop) % 3 === 0) {
      p.set(ax - 1, y, '#9a9aae')
      p.set(ax + 1, y, '#9a9aae')
    }
  }
  if (selma) {
    p.set(ax, mastTop - 1, '#5a2a2a')
    b.blink.push([ax, mastTop - 1])
    blit(p, spr(['..ww', '.wwws', 'wwws', 'wws.', '.k..', 'kkk.'], { w: '#e8ecf2', s: '#a8b0c0', k: '#5a5a6e' }), x0 + 3, roofY - 6)
    const vx = x0 + Math.round(w * 0.45)
    for (let y = roofY - 6; y < roofY; y++) p.set(vx, y, '#7a7a8e')
    b.vane.push([vx, roofY - 7])
  } else {
    p.set(ax + 1, mastTop - 1, '#7a7a8e')
    p.set(ax + 2, mastTop - 2, '#7a7a8e')
    blit(p, spr(['.ww.', 'wwws', '.ws.', '..k.', '.kkk'], { w: '#9a968c', s: '#7a766e', k: '#4a4a52' }), x0 + 3, roofY - 5)
  }

  win(b, x0 + 4, top + 8, trim, r, { wide: true, boarded: !selma })
  win(b, x0 + w - 13, top + 8, trim, r, { wide: true, boarded: !selma })
  const dx = Math.round(x0 + w / 2 - 3)
  door(b, dx, 6, 13, selma ? '#2a6a74' : '#6a5a4a', trim, selma)
  if (!selma) {
    const dy = H - 1 - 13
    p.rect(dx - 1, dy + 3, 8, 1, '#9a7a5a')
    p.rect(dx - 1, dy + 8, 8, 1, '#8a6a4a')
  }
  return b
}

function lighthouse(lit: boolean) {
  const W = 20
  const H = 58
  const cx = 10
  const p = new Pix(W, H)
  for (let y = 16; y < 52; y++) {
    const hw = 4 + ((y - 16) / 36) * 2.6
    const xl = Math.round(cx - hw)
    const xr = Math.round(cx + hw)
    const band = Math.floor((y - 16) / 7) % 2 === 0 ? '#f4ecdc' : '#d83a3a'
    for (let x = xl; x < xr; x++) {
      // round tower, lit from the left
      const u = (x + 0.5 - xl) / (xr - xl)
      p.set(x, y, u < 0.12 ? shade(band, -0.1) : u < 0.34 ? shade(band, 0.16) : u < 0.62 ? band : u < 0.84 ? shade(band, -0.18) : shade(band, -0.34))
    }
  }
  for (const [wy, wx] of [
    [19, 0],
    [33, -1],
  ]) {
    p.rect(cx + wx - 1, wy, 2, 3, lit ? '#ffd36a' : '#2a3450')
    p.set(cx + wx - 1, wy, lit ? '#fff0b0' : '#5a7090')
    p.rect(cx + wx - 2, wy + 3, 4, 1, '#b8b0a4')
  }
  // door
  p.rect(cx - 3, 45, 6, 7, '#b8b0a4')
  p.rect(cx - 2, 44, 4, 1, '#b8b0a4')
  p.rect(cx - 2, 46, 4, 6, '#5a3a2a')
  p.rect(cx - 1, 45, 2, 1, '#5a3a2a')
  p.set(cx - 1, 47, '#4a2e22')
  p.set(cx - 1, 49, '#4a2e22')
  p.set(cx + 1, 49, '#ffd84a')
  // stone plinth
  for (let y = 52; y < H; y++)
    for (let x = cx - 8; x < cx + 8; x++) {
      const row = Math.floor((y - 52) / 3)
      const mortar = (y - 52) % 3 === 2 || (x + row * 2) % 4 === 0
      const u = (x - cx + 8) / 16
      let c = mortar ? '#6a6878' : '#9a98a8'
      if (u < 0.3) c = shade(c, 0.12)
      else if (u > 0.75) c = shade(c, -0.2)
      p.set(x, y, c)
    }
  // lantern room
  const glass = lit ? '#ffe48a' : '#3a4a6a'
  p.rect(cx - 4, 6, 8, 6, '#2a2438')
  p.rect(cx - 3, 7, 6, 4, glass)
  if (lit) {
    p.rect(cx - 1, 7, 2, 4, '#fffbe8')
    p.set(cx + 2, 8, '#2a2438')
  } else {
    p.set(cx - 3, 7, '#8aa8c8')
    p.set(cx - 2, 8, '#6a88a8')
    p.set(cx + 1, 9, '#2a2438')
    p.set(cx + 1, 8, '#2a2438')
  }
  // gallery and railing
  p.rect(cx - 5, 16, 10, 1, '#3a2a3e')
  p.rect(cx - 7, 14, 14, 2, '#2a2438')
  p.rect(cx - 7, 14, 14, 1, '#5a5468')
  for (let x = cx - 7; x < cx + 7; x += 2) p.rect(x, 12, 1, 2, '#2a2438')
  p.rect(cx - 7, 11, 14, 1, '#2a2438')
  // dome, vent and rod
  p.rect(cx - 5, 5, 10, 1, '#7a2430')
  p.rect(cx - 4, 4, 8, 1, '#c8343a')
  p.rect(cx - 3, 3, 6, 1, '#c8343a')
  p.rect(cx - 2, 2, 4, 1, '#c8343a')
  p.set(cx - 4, 4, '#ee6a5a')
  p.set(cx - 3, 3, '#f48a7a')
  p.set(cx - 2, 2, '#f48a7a')
  p.set(cx + 3, 4, '#962a34')
  p.rect(cx - 1, 0, 2, 2, '#2a2438')
  return { p, lamp: { x: cx, y: 9 } }
}

function rockIsle(w: number, h: number, r: () => number) {
  const p = new Pix(w, h)
  // a low, lumpy skerry: two rounded boulders under a flatter top
  const tops: number[] = []
  const lumps = [
    [0.5, 1, 0.5],
    [0.22, 0.55, 0.22],
    [0.8, 0.6, 0.2],
  ]
  for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / w
    let hh = 0
    for (const [c, a, s] of lumps) hh = Math.max(hh, a * h * Math.sqrt(Math.max(0, 1 - ((u - c) / s) ** 2)))
    tops.push(Math.round(h - Math.min(h, hh)))
  }
  // blotchy shading in 2×2 cells, so the stone reads as slabs rather than noise
  const cell = new Map<string, number>()
  const cellAt = (x: number, y: number) => {
    const k = `${x >> 1},${y >> 1}`
    if (!cell.has(k)) cell.set(k, r())
    return cell.get(k)!
  }
  for (let x = 0; x < w; x++) {
    for (let y = tops[x]; y < h; y++) {
      if (y >= h) continue
      const d = y - tops[x]
      const slopeL = (tops[x - 1] ?? h) > tops[x]
      const slopeR = (tops[x + 1] ?? h) > tops[x]
      let c = '#6a6a84'
      const q = cellAt(x, y)
      if (q < 0.2) c = '#5a5a74'
      else if (q > 0.85) c = '#7a7a94'
      if (slopeL && d < 3) c = '#9494ae'
      else if (slopeR && d < 3) c = '#4a4a62'
      if (d > 4 && x > w * 0.55) c = shade(c, -0.12)
      if ((x * 3 + y * 5) % 29 === 0 && d > 1) c = '#3a3a50'
      if (d === 0) c = r() < 0.12 ? '#ffe04a' : r() < 0.5 ? '#8aba52' : '#6a9a42'
      else if (d === 1 && r() < 0.6) c = '#5a8a3a'
      if (y >= h - 3) c = y === h - 3 && r() < 0.6 ? '#5a6a2a' : mix(c, '#22223a', 0.5)
      p.set(x, y, c)
    }
  }
  return { p, tops }
}

// ---------- quay props ----------

const BARREL = spr([' aaa ', 'abbba', 'cdccc', 'eeeee', 'cdccc', 'eeeee', ' ccc '], { a: '#c89a6a', b: '#6a4428', c: '#a86a3a', d: '#cc8a50', e: '#4a3a3a' })
const CRATE = spr([' fs fs ', 'aaaaaaa', 'abcbcba', 'aaaaaaa', 'abcbcba'], { f: '#d8e4ea', s: '#8aa0b0', a: '#6a4a30', b: '#c8945a', c: '#a87a48' })
const POT = spr([' kkkkk ', 'kn n nk', 'k n n k', 'kn n nk', 'kkkkkkk'], { k: '#4a3a2a', n: '#3a6a5a' })
const COIL = spr([' aaaa ', 'abbbba'], { a: '#d8b888', b: '#a88858' })
const BOLLARD = spr([' kk ', 'klkk', ' kk ', 'kkkk'], { k: '#3a3448', l: '#7a7490' })

for (const p of [BARREL, CRATE, POT, COIL, BOLLARD]) p.outline(0.35)

const FLAG = (x: number, y: number) =>
  y === 4 || x === 4 ? '#1a3a8a' : y === 3 || y === 5 || x === 3 || x === 5 ? '#f4f4f0' : '#d82a3a'

// ---------- clouds ----------

interface Cloud {
  x: number
  y: number
  speed: number
  w: number
  /** [y, x, length, level] where level is 1 body, 2 lit top, 3 shadow */
  runs: [number, number, number, number][]
}

function makeCloud(r: () => number, w: number, h: number): Cloud['runs'] {
  const fill = new Uint8Array(w * h)
  const n = 3 + Math.floor(r() * 3)
  for (let i = 0; i < n; i++) {
    const bx = w * (0.18 + (0.64 * i) / (n - 1)) + (r() - 0.5) * 4
    const rx = w * (0.16 + r() * 0.12)
    const ry = h * (0.45 + r() * 0.4) * (1 - Math.abs(i / (n - 1) - 0.5))
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if (((x - bx) / rx) ** 2 + ((y - (h - 1)) / ry) ** 2 <= 1) fill[y * w + x] = 1
  }
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && fill[y * w + x] === 1
  const runs: Cloud['runs'] = []
  for (let y = 0; y < h; y++) {
    let x = 0
    while (x < w) {
      if (!at(x, y)) {
        x++
        continue
      }
      const lv = (xx: number) => (!at(xx, y - 1) ? 2 : y >= h - 2 || !at(xx, y + 2) ? 3 : 1)
      const l = lv(x)
      let e = x
      while (e < w && at(e, y) && lv(e) === l) e++
      runs.push([y, x, e - x, l])
      x = e
    }
  }
  return runs
}

// ---------- the harbour ----------

interface Puff {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  kind: 'smoke' | 'drop'
}

export class Harbor {
  W = 0
  H = 0
  deckY = 0
  /** where the water surface meets the quay posts and the hills */
  wl = 0
  spots: Spot[] = []
  t = 0
  private front: HTMLCanvasElement | null = null
  private scene = canvas(1, 1)
  private work = canvas(1, 1)
  private skyC = canvas(1, 1)
  private hillsC = canvas(1, 1)
  private vignette: HTMLCanvasElement | null = null
  private cacheKey = ''
  private key = ''
  private lights: Light[] = []
  private smokeAt: [number, number][] = []
  private blinks: [number, number][] = []
  private vanes: [number, number][] = []
  private blades: [number, number][] = []
  private stilts: number[] = []
  private flagAt: [number, number] = [0, 0]
  private bollard: [number, number] = [0, 0]
  private rockSpan: [number, number] = [0, 0]
  private ridges = { far: [] as number[], mid: [] as number[], near: [] as number[] }
  /** screen y of the far ridge, on average */
  private ridgeTop = 0
  private pines: { x: number; h: number }[] = []
  private shoreLights: { x: number; y: number; on: number }[] = []
  private clouds: Cloud[] = []
  private stars: { x: number; y: number; p: number; b: number }[] = []
  private lhPos = { x: 0, y: 0 }
  private ending = false
  private boat: HTMLCanvasElement | null = null
  private paint = ''
  private cats = catSprites()
  private gulls = gullSprites()
  private puffs: Puff[] = []
  private bugs: { x: number; y: number; ph: number }[] = []
  private motes: { x: number; y: number; ph: number }[] = []
  private rings: { x: number; y: number; age: number; size: number }[] = []
  private fish: { x: number; y: number; age: number; dir: number; arc: number } | null = null
  private nextFish = 5
  private nextSpray = 2
  private smokeT = 0
  private shooting: { x: number; y: number; age: number } | null = null
  private r = rng(77)

  constructor(private host: { s: Save }) {}

  resize(W: number, H: number) {
    if (W === this.W && H === this.H) return
    this.W = W
    this.H = H
    this.deckY = Math.round(H * 0.54)
    this.wl = this.deckY + 24
    const { deckY, wl } = this
    this.ridges = {
      far: ridgeLine(W, 21, deckY * 0.4 + 28, deckY * 0.12, 0.65),
      mid: ridgeLine(W, 8, deckY * 0.24 + 26, deckY * 0.07, 0.4),
      near: ridgeLine(W, 4, 34, 8, 0.1),
    }
    this.ridgeTop = wl - this.ridges.far.reduce((a, b) => a + b, 0) / W
    const r = rng(11)
    this.pines = []
    for (let x = 0; x < W; x += 2 + Math.floor(r() * 3)) if (r() < 0.75) this.pines.push({ x, h: 3 + Math.floor(r() * 6) })
    this.shoreLights = Array.from({ length: 5 }, () => {
      const x = Math.floor(r() * W)
      return { x, y: wl - 2 - Math.floor(r() * Math.min(10, this.ridges.near[x] - 4)), on: 0.3 + r() * 0.4 }
    })
    this.stars = Array.from({ length: 70 }, () => ({ x: Math.floor(r() * W), y: r() * r(), p: r() * 6, b: r() }))
    this.clouds = Array.from({ length: 6 }, (_, i) => {
      const far = i < 3
      const w = far ? 14 + Math.floor(r() * 10) : 26 + Math.floor(r() * 16)
      const h = far ? 4 + Math.floor(r() * 2) : 7 + Math.floor(r() * 4)
      return { x: r() * W, y: Math.round((far ? 0.08 + r() * 0.2 : 0.12 + r() * 0.25) * wl), speed: far ? 0.6 + r() * 0.5 : 1.4 + r() * 1, w, runs: makeCloud(r, w, h) }
    })
    this.bugs = Array.from({ length: 16 }, () => ({ x: r() * W, y: deckY - 30 + r() * 50, ph: r() * 6 }))
    this.motes = Array.from({ length: 24 }, () => ({ x: r() * W, y: r() * wl, ph: r() * 6 }))
    this.scene = canvas(W, wl)
    this.work = canvas(W, wl)
    this.skyC = canvas(W, wl)
    this.hillsC = canvas(W, wl)
    this.vignette = makeVignette(W, H)
    this.key = ''
    this.cacheKey = ''
  }

  private rebuild() {
    const s = this.host.s
    const selma = dev.selma ?? !!s.flags.selma
    const ending = dev.ending ?? !!s.flags.ending
    const key = `${this.W}x${this.H}:${selma}:${ending}`
    if (key === this.key) return
    this.key = key
    this.ending = ending
    const { W, deckY, wl } = this
    const F = new Pix(W, wl)
    const r = rng(29)
    this.lights = []
    this.smokeAt = []
    this.blinks = []
    this.vanes = []
    this.blades = []
    this.spots = []

    // posts, bracing and the deck
    const quayW = Math.round(W * 0.8)
    this.stilts = []
    for (let x = 3; x < quayW - 2; x += 14) this.stilts.push(x)
    this.stilts.forEach((sx, i) => {
      const next = this.stilts[i + 1]
      if (i % 2 === 0 && next) line(F, sx + 2, deckY + 7, next, wl - 5, '#3a2a1e')
    })
    for (const sx of this.stilts) {
      for (let y = deckY + 5; y < wl; y++) {
        F.set(sx, y, '#7a5a3e')
        F.set(sx + 1, y, '#5a3e2a')
        F.set(sx + 2, y, '#3e2a1e')
      }
      for (let y = wl - 4; y < wl; y++) for (let k = 0; k < 3; k++) F.set(sx + k, y, r() < 0.3 ? '#2a3a22' : '#3a4a2a')
      if (r() < 0.7) F.set(sx + 1, wl - 5, '#c8c8b8')
    }
    for (let x = 0; x < quayW; x++) {
      F.set(x, deckY, '#b07c4e')
      F.set(x, deckY + 1, '#8a5e3c')
      F.set(x, deckY + 2, '#7a5236')
      F.set(x, deckY + 3, '#4a3222')
      F.set(x, deckY + 4, '#5e3e28')
      F.set(x, deckY + 5, '#3e2a1e')
    }
    for (let x = 4; x < quayW; x += 5 + Math.floor(r() * 5)) {
      F.set(x, deckY + 1, '#4a3222')
      F.set(x, deckY + 2, '#4a3222')
    }
    for (const sx of this.stilts) F.set(sx + 1, deckY + 4, '#a8a8b8')

    const place = (id: SpotId, b: Built, x: number) => {
      const y = deckY - b.p.h
      blit(F, b.p, x, y)
      for (const l of b.lights) this.lights.push({ ...l, x: l.x + x, y: l.y + y })
      const off = (list: [number, number][]) => list.map(([a, c]) => [a + x, c + y] as [number, number])
      this.smokeAt.push(...off(b.smoke))
      this.blinks.push(...off(b.blink))
      this.vanes.push(...off(b.vane))
      this.blades.push(...off(b.blades))
      this.spots.push({ id, x: x + 3, y: y - 2, w: b.p.w - 6, h: b.p.h + 4 })
    }
    const kx = Math.round(W * 0.02) + 3
    const kw = Math.round(W * 0.3)
    place('krambua', krambua(kw, r), kx - 6)
    const hx = Math.round(W * 0.35) + 3
    const hw = Math.round(W * 0.17)
    place('havnebua', havnebua(hw, r), hx - 6)
    const sx = Math.round(W * 0.54) + 3
    const sw = Math.round(W * 0.2)
    place('stasjon', stasjon(sw, selma, r), sx - 5)

    // things on the quay
    blit(F, BARREL, kx + 3, deckY - BARREL.h)
    blit(F, BARREL, kx + 9, deckY - BARREL.h)
    blit(F, CRATE, kx + kw - 13, deckY - CRATE.h)
    blit(F, COIL, hx + 4, deckY - COIL.h)
    blit(F, POT, sx + 3, deckY - POT.h)
    const bx = Math.round(W * 0.14)
    this.bollard = [bx + 47, deckY - 4]
    blit(F, BOLLARD, bx + 46, deckY - BOLLARD.h)
    // ladder down to the boat
    const lad = bx + 53
    if (lad + 3 < quayW)
      for (let y = deckY + 1; y < wl + 1; y++) {
        F.set(lad, y, '#6a4a32')
        F.set(lad + 3, y, '#4a3222')
        if ((y - deckY) % 3 === 0) {
          F.set(lad + 1, y, '#8a6242')
          F.set(lad + 2, y, '#7a5236')
        }
      }
    // lamp posts
    for (const x of [Math.round(W * 0.335), Math.round(W * 0.525)]) {
      F.rect(x - 1, deckY - 2, 3, 2, '#2a2438')
      for (let y = deckY - 17; y < deckY - 2; y++) {
        F.set(x, y, '#2a2438')
      }
      F.set(x, deckY - 12, '#4a4458')
      F.rect(x - 1, deckY - 24, 3, 1, '#2a2438')
      F.rect(x - 2, deckY - 23, 5, 1, '#2a2438')
      F.rect(x - 2, deckY - 22, 5, 4, '#2a2438')
      F.rect(x - 1, deckY - 22, 3, 4, '#e8d8a0')
      F.rect(x - 2, deckY - 18, 5, 1, '#2a2438')
      this.lights.push({ x: x - 1, y: deckY - 22, w: 3, h: 4, kind: 'lamp', on: 0.05, ph: x })
    }
    // flagpole at the end of the quay
    const fx = quayW - 3
    for (let y = deckY - 36; y < deckY; y++) {
      F.set(fx, y, '#f4ecdc')
      F.set(fx + 1, y, '#b8b0a4')
    }
    F.rect(fx, deckY - 38, 2, 2, '#ffd84a')
    this.flagAt = [fx + 2, deckY - 35]

    // the lighthouse on its rock
    const lh = lighthouse(ending)
    const lx = W - lh.p.w - 1
    const rk = rockIsle(40, 19, r)
    const rx = Math.round(lx + lh.p.w / 2 - 20)
    blit(F, rk.p, rx, wl - rk.p.h)
    const ly = wl - rk.p.h + rk.tops[20] + 2 - lh.p.h
    blit(F, lh.p, lx, ly)
    this.rockSpan = [rx, rx + 40]
    this.lhPos = { x: lx + lh.lamp.x, y: ly + lh.lamp.y }
    this.spots.push({ id: 'fyret', x: lx - 6, y: ly - 4, w: lh.p.w + 12, h: lh.p.h + 18 })
    this.spots.push({ id: 'baten', x: Math.round(W * 0.12), y: wl - 16, w: 56, h: 26 })

    this.front = F.toCanvas()
  }

  update(dt: number) {
    this.t += dt
    if (dev.time !== null) this.host.s.time = dev.time
    const { W, wl, r } = this
    const wind = 0.6 + 0.4 * Math.sin(this.t * 0.1)

    this.smokeT -= dt
    if (this.smokeT <= 0) {
      this.smokeT = 0.32
      for (const [x, y] of this.smokeAt) this.puffs.push({ x: x + (r() - 0.5), y, vx: 0, vy: -4 - r() * 2, age: 0, life: 3 + r() * 1.5, kind: 'smoke' })
    }
    this.nextSpray -= dt
    if (this.nextSpray <= 0) {
      this.nextSpray = 1.5 + r() * 3
      const [a, b] = this.rockSpan
      const left = r() < 0.5
      for (let i = 0; i < 7; i++)
        this.puffs.push({ x: left ? a + 2 + r() * 4 : b - 6 + r() * 4, y: wl - 1, vx: (left ? -1 : 1) * (2 + r() * 8), vy: -14 - r() * 16, age: 0, life: 2, kind: 'drop' })
    }
    for (const p of this.puffs) {
      p.age += dt
      if (p.kind === 'smoke') {
        p.vx = (2 + wind * 5) * (0.3 + p.age / p.life)
        p.x += p.vx * dt
        p.y += p.vy * dt
      } else {
        p.vy += 70 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.y > wl + 1 && p.vy > 0) p.age = p.life
      }
    }
    this.puffs = this.puffs.filter((p) => p.age < p.life)

    for (const b of this.bugs) {
      b.x += Math.sin(this.t * 0.5 + b.ph) * 5 * dt
      b.y += Math.cos(this.t * 0.7 + b.ph * 1.3) * 3 * dt
    }
    for (const m of this.motes) {
      m.x += (1.5 + Math.sin(this.t * 0.4 + m.ph)) * dt * 2
      m.y += (Math.sin(this.t * 0.9 + m.ph) - 0.4) * dt * 2
      if (m.x > W + 2) m.x = -2
      if (m.y < 0) m.y = wl - 1
    }

    // a fish jumps now and then
    this.nextFish -= dt
    if (!this.fish && this.nextFish <= 0 && this.H - wl > 14) {
      this.nextFish = 5 + r() * 9
      const bx = Math.round(W * 0.14)
      let x = 6 + r() * (W - 12)
      if (x > bx - 4 && x < bx + BOAT_W + 4) x = (x + W * 0.5) % W
      const y = wl + 6 + r() * (this.H - wl - 10)
      const k = (y - wl) / (this.H - wl)
      this.fish = { x, y, age: 0, dir: r() < 0.5 ? -1 : 1, arc: 7 + k * 10 }
      this.rings.push({ x, y, age: 0, size: 0.6 + k })
    }
    if (this.fish) {
      const f = this.fish
      f.age += dt / 0.9
      if (f.age >= 1) {
        const x = f.x + f.dir * 12
        this.rings.push({ x, y: f.y, age: 0, size: 1 })
        for (let i = 0; i < 5; i++) this.puffs.push({ x, y: f.y - 1, vx: (r() - 0.5) * 16, vy: -10 - r() * 14, age: 0, life: 1, kind: 'drop' })
        this.fish = null
      }
    }
    for (const g of this.rings) g.age += dt / 1.6
    this.rings = this.rings.filter((g) => g.age < 1)

    if (!this.shooting && r() < dt * 0.04) this.shooting = { x: r() * W, y: r() * wl * 0.3, age: 0 }
    if (this.shooting) {
      this.shooting.age += dt / 0.7
      if (this.shooting.age >= 1) this.shooting = null
    }
  }

  private paintCaches(t: number) {
    const key = `${Math.round(t * 1000)}:${this.W}x${this.H}`
    if (key === this.cacheKey) return
    this.cacheKey = key
    const { W, wl } = this
    const night = nightness(t)
    const gold = golden(t) * (1 - night)
    const [top, hor] = lerpTable(L.sky, t)
    const [amb, ambA] = ambientAt(t, L.nightTint)

    const sg = this.skyC.g
    bandGradient(sg, 0, 0, W, wl, top, hor, 28)

    const g = this.hillsC.g
    g.clearRect(0, 0, W, wl)
    const layers = [
      { r: this.ridges.far, i: 0, haze: 0.42, snow: 0.55 },
      { r: this.ridges.mid, i: 1, haze: 0.22, snow: 0.82 },
      { r: this.ridges.near, i: 2, haze: 0.04, snow: 0 },
    ]
    for (const ly of layers) {
      let base = mix(L.hills[ly.i], L.nightHills[ly.i], night)
      base = mix(base, hor, ly.haze * (1 - night * 0.5))
      base = mix(base, amb, ambA * 0.55)
      const lit = shade(base, 0.12)
      const dark = shade(base, -0.12)
      const foot = mix(base, hor, 0.22 + ly.haze * 0.5)
      const snowC = mix(mix('#f4f8ff', '#ffd0b0', gold * 0.6), '#7a84b8', night * 0.8)
      const lo = Math.min(...ly.r)
      const hi = Math.max(...ly.r)
      const snowLine = lo + (hi - lo) * ly.snow
      for (let x = 0; x < W; x++) {
        const h = ly.r[x]
        const y0 = wl - h
        g.fillStyle = base
        g.fillRect(x, y0, 1, h)
        const fh = Math.round(h * 0.3)
        g.fillStyle = foot
        g.fillRect(x, wl - fh + (x % 2), 1, fh)
        const prev = ly.r[x - 1] ?? h
        if (h > prev) {
          g.fillStyle = lit
          g.fillRect(x, y0, 1, Math.min(4, h - prev + 1))
        } else if (h < prev) {
          g.fillStyle = dark
          g.fillRect(x, y0, 1, 1)
        }
        if (ly.snow && h > snowLine) {
          g.fillStyle = snowC
          g.fillRect(x, y0, 1, Math.round((h - snowLine) * 0.45) + 1 + (x % 2))
        }
      }
      if (ly.i === 2) {
        g.fillStyle = shade(base, -0.14)
        for (const p of this.pines) {
          const y0 = wl - ly.r[p.x] - p.h + 1
          for (let k = 0; k < p.h; k++) {
            const hw = Math.floor(k * 0.45) + (k > 1 && k % 2 === 0 ? 1 : 0)
            g.fillRect(p.x - hw, y0 + k, hw * 2 + 1, 1)
          }
        }
      }
      // haze settling into the valleys of this layer, thickest at its foot
      if (ly.i < 2) {
        const steps = 5
        for (let k = 0; k < steps; k++) {
          g.fillStyle = rgba(hor, L.mist * 0.055)
          for (let x = 0; x < W; x++) {
            const h = ly.r[x]
            const hh = Math.round(h * (1 - k / steps) * 0.75 + ((x + k) % 2))
            g.fillRect(x, wl - hh, 1, hh)
          }
        }
      }
    }
  }

  draw(g: CanvasRenderingContext2D) {
    this.rebuild()
    const s = this.host.s
    const { W, H, wl, deckY } = this
    const time = s.time
    const night = nightness(time)
    const gold = golden(time) * (1 - night)
    const [skyTop, hor] = lerpTable(L.sky, time)
    this.paintCaches(time)
    const wind = 0.6 + 0.4 * Math.sin(this.t * 0.1)

    // ---------- sky and hills ----------
    const sg = this.scene.g
    sg.clearRect(0, 0, W, wl)
    sg.drawImage(this.skyC.c, 0, 0)
    if (night > 0.05) {
      for (const st of this.stars) {
        const tw = Math.sin(this.t * (1 + st.b) + st.p)
        sg.fillStyle = `rgba(255,250,230,${night * (0.35 + 0.65 * st.b) * (tw > 0.3 ? 1 : 0.45)})`
        const y = Math.round(st.y * wl * 0.75)
        sg.fillRect(st.x, y, 1, 1)
        if (st.b > 0.93 && tw > 0.6) {
          sg.fillStyle = `rgba(255,250,230,${night * 0.4})`
          sg.fillRect(st.x - 1, y, 3, 1)
          sg.fillRect(st.x, y - 1, 1, 3)
        }
      }
      if (this.shooting && night > 0.5) {
        const { x, y, age } = this.shooting
        for (let i = 0; i < 8; i++) {
          sg.fillStyle = `rgba(255,250,230,${(1 - i / 8) * (1 - age) * night})`
          sg.fillRect(Math.round(x + age * 50 - i * 1.6), Math.round(y + age * 20 - i * 0.64), 1, 1)
        }
      }
    }

    // sun and moon
    let sun: { x: number; y: number; c: string } | null = null
    const sk = (time - 0.21) / 0.56
    if (sk > 0 && sk < 1) {
      const lift = Math.sin(Math.PI * sk)
      const x = W * (0.08 + 0.84 * sk)
      const y = this.ridgeTop + 6 - lift * (this.ridgeTop - 8)
      const c = mix('#fff4c8', '#ff7a3a', (1 - lift) ** 2)
      sun = { x, y, c }
      sg.globalCompositeOperation = 'lighter'
      glow(sg, x, y, 34, c, 0.22 * L.sunGlow)
      glow(sg, x, y, 14, '#fff0c0', 0.4 * L.sunGlow)
      sg.globalCompositeOperation = 'source-over'
      disc(sg, x, y, 4, c, '#fffbe8')
    }
    const mk = (((time - 0.74 + 1) % 1) / 0.52)
    if (mk > 0 && mk < 1 && night > 0.05) {
      const lift = Math.sin(Math.PI * mk)
      const x = W * (0.85 - 0.7 * mk)
      const y = wl - 14 - lift * wl * 0.6
      sun ??= { x, y, c: '#c8d8ff' }
      sg.globalCompositeOperation = 'lighter'
      glow(sg, x, y, 22, '#8aa8ff', 0.3 * night)
      sg.globalCompositeOperation = 'source-over'
      sg.globalAlpha = night
      disc(sg, x, y, 3, '#d8d4c4', '#f8f4e4')
      sg.fillStyle = '#b8b4a4'
      sg.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 1)
      sg.fillRect(Math.round(x) - 1, Math.round(y) + 1, 1, 1)
      sg.globalAlpha = 1
    }

    // clouds
    const cBase = mix(mix('#f4f6ff', mix(hor, '#ffb890', 0.3), 0.15 + gold * 0.7), '#2e2e62', night * 0.85)
    const cHi = mix(mix('#ffffff', '#ffd8a8', gold), mix(cBase, '#9aa0d8', 0.4), night)
    const cSh = mix(cBase, skyTop, 0.45)
    const cols = ['', cBase, cHi, cSh]
    for (const c of this.clouds) {
      const span = W + c.w + 20
      const cx = Math.round((((c.x + this.t * c.speed) % span) + span) % span) - c.w - 10
      for (const lv of [1, 2, 3]) {
        sg.fillStyle = cols[lv]
        for (const [y, x, len, l] of c.runs) if (l === lv) sg.fillRect(cx + x, c.y + y, len, 1)
      }
    }

    sg.drawImage(this.hillsC.c, 0, 0)
    if (sun && gold > 0) {
      // the low sun lights up the haze over the ridges
      sg.globalCompositeOperation = 'lighter'
      glow(sg, sun.x, Math.max(sun.y, this.ridgeTop), 44, sun.c, gold * 0.3 * L.sunGlow)
      sg.globalCompositeOperation = 'source-over'
    }

    // mist rolling at the foot of the hills
    const mc = mix(hor, '#ffffff', 0.18 * (1 - night))
    for (const [amp, a, off] of [
      [6, 0.16, 0],
      [3.5, 0.3, 2],
    ]) {
      sg.fillStyle = rgba(mc, L.mist * a)
      for (let x = 0; x < W; x++) {
        const h = Math.round(amp + 2 * Math.sin(x * 0.06 + this.t * 0.25 + off) + 1.5 * Math.sin(x * 0.15 - this.t * 0.4 + off))
        if (h > 0) sg.fillRect(x, wl - h, 1, h)
      }
    }
    if (night > 0.2)
      for (const l of this.shoreLights) {
        const a = clamp01((night - l.on) * 4)
        sg.fillStyle = rgba('#ffd070', a)
        sg.fillRect(l.x, l.y, 1, 1)
        sg.globalCompositeOperation = 'lighter'
        glow(sg, l.x, l.y, 3, '#ff9a40', a * 0.4)
        sg.globalCompositeOperation = 'source-over'
      }

    // ---------- the lit world: houses, boat, smoke ----------
    const wg = this.work.g
    wg.clearRect(0, 0, W, wl)
    wg.drawImage(this.front!, 0, 0)

    // the flag
    const [fx, fy] = this.flagAt
    for (let x = 0; x < 11; x++) {
      const ph = this.t * 4 * wind - x * 0.7
      const dy = Math.round(Math.sin(ph) * (x / 10) * 1.6 * wind)
      const lightness = Math.cos(ph) * 0.14 * (x / 10)
      for (let y = 0; y < 8; y++) {
        wg.fillStyle = shade(FLAG(x, y), lightness)
        wg.fillRect(fx + x, fy + y + dy, 1, 1)
      }
    }
    // grass on the turf roof
    wg.fillStyle = '#7ac04a'
    for (const [x, y] of this.blades) {
      const lean = Math.sin(this.t * 2 * wind + x * 0.5) > 0.3 ? 1 : 0
      wg.fillRect(x, y, 1, 1)
      wg.fillRect(x + lean, y - 1, 1, 1)
    }
    // the anemometer on the station
    for (const [x, y] of this.vanes) {
      wg.fillStyle = '#5a5a6e'
      wg.fillRect(x, y, 1, 1)
      wg.fillStyle = '#e8ecf2'
      for (let k = 0; k < 3; k++) {
        const a = this.t * 7 + (k * Math.PI * 2) / 3
        wg.fillRect(Math.round(x + Math.cos(a) * 2.5), Math.round(y + Math.sin(a) * 0.8), 1, 1)
      }
    }
    // gulls
    if (night < 0.6)
      for (let i = 0; i < 3; i++) {
        const span = W + 40
        const x = ((((i * 97 + this.t * (6 + i * 2)) % span) + span) % span) - 20
        const y = Math.round(wl * (0.25 + i * 0.1) + Math.sin(this.t * 0.8 + i * 2) * 4)
        wg.drawImage(this.gulls[Math.floor(this.t * 4 + i) % 2], Math.round(x), y)
      }

    // Måken at her mooring
    if (this.paint !== s.paint || !this.boat) {
      const p = PAINTS.find((x) => x.id === s.paint) ?? PAINTS[0]
      this.boat = boatSprite(p.hull, p.stripe)
      this.paint = s.paint
    }
    const bob = Math.round(Math.sin(this.t * 1.3))
    const bx = Math.round(W * 0.14)
    const by = wl - 15 + bob
    wg.drawImage(this.boat, bx, by)
    if (s.flags.cat) wg.drawImage(this.cats[this.t % 5 < 0.15 ? 1 : 0], bx + 34, by + 1)
    // mooring rope, sagging between the bow and the bollard
    wg.fillStyle = '#c8a878'
    const [ox, oy] = this.bollard
    const rx0 = bx + 45
    const ry0 = by + 4
    for (let i = 0; i <= 10; i++) {
      const k = i / 10
      wg.fillRect(Math.round(rx0 + (ox - rx0) * k), Math.round(ry0 + (oy - ry0) * k + Math.sin(k * Math.PI) * 2.5), 1, 1)
    }
    // chimney smoke
    for (const p of this.puffs) {
      if (p.kind !== 'smoke') continue
      const k = p.age / p.life
      const size = 1 + Math.floor(k * 3)
      wg.fillStyle = rgba(k < 0.3 ? '#f4f4f8' : '#d8dce8', 0.6 * (1 - k))
      wg.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size)
    }

    // ambient light: blue at night, pink at dawn, gold and red around sunrise and sunset, violet at dusk
    wg.globalCompositeOperation = 'source-atop'
    const [amb, ambA] = ambientAt(time, L.nightTint)
    if (ambA > 0) {
      wg.fillStyle = rgba(amb, ambA)
      wg.fillRect(0, 0, W, wl)
    }
    wg.globalCompositeOperation = 'source-over'
    sg.drawImage(this.work.c, 0, 0)

    // ---------- lights and glowing things ----------
    for (const l of this.lights) {
      const a = clamp01((night - l.on) * 5)
      if (a <= 0) continue
      const flick = 0.85 + 0.15 * Math.sin(this.t * 6 + l.ph) * Math.sin(this.t * 2.3 + l.ph * 3)
      sg.globalAlpha = a
      sg.fillStyle = l.kind === 'lamp' ? '#fff0b0' : '#ffc45a'
      sg.fillRect(l.x, l.y, l.w, l.h)
      if (l.kind === 'pane') {
        sg.fillStyle = '#ffe8a0'
        sg.fillRect(l.x, l.y, 1, 1)
        sg.fillStyle = '#e8963e'
        sg.fillRect(l.x, l.y + l.h - 1, l.w, 1)
      }
      sg.globalAlpha = 1
      sg.globalCompositeOperation = 'lighter'
      glow(sg, l.x + l.w / 2, l.y + l.h / 2, l.kind === 'lamp' ? 10 : 5, '#ffa040', a * flick * (l.kind === 'lamp' ? 0.6 : 0.3))
      sg.globalCompositeOperation = 'source-over'
    }
    for (const [x, y] of this.blinks) {
      if (Math.sin(this.t * 3) > 0.55) {
        sg.fillStyle = '#ff4a3a'
        sg.fillRect(x, y, 1, 1)
        sg.globalCompositeOperation = 'lighter'
        glow(sg, x, y, 4, '#ff3a2a', 0.3 + night * 0.4)
        sg.globalCompositeOperation = 'source-over'
      }
    }
    if (this.ending) {
      sg.globalCompositeOperation = 'lighter'
      glow(sg, this.lhPos.x, this.lhPos.y, 14, '#ffe6a0', 0.5 + night * 0.3)
      sg.globalCompositeOperation = 'source-over'
    }
    sg.globalCompositeOperation = 'lighter'
    if (night > 0.3)
      for (const b of this.bugs) {
        const a = (night - 0.3) * 1.4 * Math.max(0, Math.sin(this.t * 1.7 + b.ph * 3)) ** 3
        if (a < 0.03) continue
        const x = (((b.x % W) + W) % W)
        const y = deckY - 30 + ((((b.y - deckY + 30) % 52) + 52) % 52)
        sg.fillStyle = rgba('#eaff8a', a)
        sg.fillRect(Math.round(x), Math.round(y), 1, 1)
        glow(sg, x, y, 4, '#b8ff5a', a * 0.5)
      }
    if (night < 0.7)
      for (const m of this.motes) {
        const a = (1 - night) * 0.5 * (0.5 + 0.5 * Math.sin(this.t * 2 + m.ph * 5))
        sg.fillStyle = rgba(gold > 0.2 ? '#ffd090' : '#fff6c8', a)
        sg.fillRect(Math.round(m.x), Math.round(m.y), 1, 1)
      }
    // sun rays
    if (sun && L.rays > 0 && night < 0.6) {
      for (let i = 0; i < 5; i++) {
        const ang = Math.PI / 2 + (i - 2) * 0.32 + Math.sin(this.t * 0.1 + i) * 0.05
        const len = wl * 1.5
        const w = 0.05 + (i % 2) * 0.03
        sg.fillStyle = rgba(sun.c, L.rays * 0.05 * (0.6 + 0.4 * Math.sin(this.t * 0.4 + i * 2)) * (1 - night))
        sg.beginPath()
        sg.moveTo(sun.x, sun.y)
        sg.lineTo(sun.x + Math.cos(ang - w) * len, sun.y + Math.sin(ang - w) * len)
        sg.lineTo(sun.x + Math.cos(ang + w) * len, sun.y + Math.sin(ang + w) * len)
        sg.fill()
      }
    }
    sg.globalCompositeOperation = 'source-over'

    // ---------- compose, with the scene mirrored in the water ----------
    g.drawImage(this.scene.c, 0, 0)
    const depth = Math.max(1, H - wl)
    const w0 = mix(mix(L.water[0], L.nightWater[0], night), hor, 0.25 + gold * 0.2)
    const w1 = mix(L.water[1], L.nightWater[1], night)
    for (let y = wl; y < H; y++) {
      const d = y - wl
      const k = d / depth
      g.fillStyle = mix(w0, w1, Math.min(1, k * 1.2))
      g.fillRect(0, y, W, 1)
      const src = wl - 1 - d
      if (src < 0) continue
      const wob = Math.round(Math.sin(this.t * 1.7 + d * 0.42) * L.wobble * (0.5 + k * 2) + Math.sin(this.t * 0.6 + d * 0.11) * 0.7)
      g.globalAlpha = L.reflect * (1 - k * 0.55)
      g.drawImage(this.scene.c, 0, src, W, 1, wob, y, W, 1)
      g.globalAlpha = 1
    }
    // ripples
    const hi = night > 0.5 ? '#9ab8e8' : mix('#ffffff', hor, 0.3)
    for (let i = 0; i < 40; i++) {
      const d = 2 + ((i * 53) % Math.max(4, depth - 2))
      const k = d / depth
      const len = 2 + Math.round(k * 7) + (i % 3)
      const span = W + 20
      const x = ((((i * 71 + this.t * (2 + (i % 5)) * (i % 2 ? 1 : -1)) % span) + span) % span) - 10
      g.fillStyle = rgba(hi, (0.1 + 0.28 * k) * (0.5 + 0.5 * Math.sin(this.t * 1.3 + i * 1.7)))
      g.fillRect(Math.round(x), wl + d, len, 1)
    }
    g.globalCompositeOperation = 'lighter'
    // the glittering path under the sun or moon
    if (sun) {
      const sx = sun.x
      for (let d = 1; d < depth; d += 2) {
        const k = d / depth
        const spread = 3 + k * 18
        for (let j = 0; j < 2; j++) {
          const q = noise(d + j * 31, Math.floor(this.t * 5 + d * 0.3))
          if (q > 0.55) continue
          g.fillStyle = rgba(sun.c, (0.3 + 0.4 * (1 - k)) * (night > 0.5 ? 0.6 : 1))
          g.fillRect(Math.round(sx + (q / 0.55 - 0.5) * 2 * spread), wl + d, q < 0.15 ? 2 : 1, 1)
        }
      }
    }
    // foam where the water meets posts, rock and boat
    g.fillStyle = rgba(hi, 0.5)
    for (const sx of this.stilts) {
      const w = Math.round(Math.sin(this.t * 2 + sx) * 1)
      g.fillRect(sx - 1 + w, wl, 1, 1)
      g.fillRect(sx + 3 - w, wl, 1, 1)
    }
    for (let x = bx + 3; x < bx + 44; x++) if (Math.sin(x * 0.9 + this.t * 3) > 0.4) g.fillRect(x, wl + 1, 1, 1)
    g.fillStyle = rgba('#ffffff', 0.75)
    const [ra, rb] = this.rockSpan
    for (let x = ra - 2; x < rb + 2; x++) {
      const v = Math.sin(x * 0.8 + this.t * 2.4) + Math.sin(x * 0.3 - this.t * 1.3)
      if (v > 0.5) g.fillRect(x, wl, 1, 1)
      if (v > 1.1) g.fillRect(x + 1, wl + 1, 1, 1)
    }
    g.globalCompositeOperation = 'source-over'
    // the part of the hull under water
    const sub = wl - by
    if (sub > 0 && sub < BOAT_H) {
      g.globalAlpha = 0.22
      g.drawImage(this.boat, 0, sub, BOAT_W, BOAT_H - sub, bx, wl, BOAT_W, BOAT_H - sub)
      g.globalAlpha = 1
    }
    // rings and the leaping fish
    for (const r of this.rings) {
      const rx = (2 + r.age * 10) * r.size
      const ry = (0.6 + r.age * 2.4) * r.size
      g.fillStyle = rgba(hi, 0.55 * (1 - r.age))
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        g.fillRect(Math.round(r.x + Math.cos(a) * rx), Math.round(r.y + Math.sin(a) * ry), 1, 1)
      }
    }
    if (this.fish) {
      const f = this.fish
      const x = f.x + f.dir * 12 * f.age
      const y = f.y - Math.sin(Math.PI * f.age) * f.arc
      const vx = f.dir * 12
      const vy = -Math.cos(Math.PI * f.age) * f.arc * Math.PI
      const n = Math.hypot(vx, vy)
      const ux = vx / n
      const uy = vy / n
      const body = ['#3a5a7a', '#8aa8c0', '#c8dce8', '#f4fbff']
      body.forEach((c, i) => {
        g.fillStyle = c
        g.fillRect(Math.round(x + ux * (i - 1.5) * 1.3), Math.round(y + uy * (i - 1.5) * 1.3), 1, 1)
      })
    }
    for (const p of this.puffs) {
      if (p.kind !== 'drop') continue
      g.fillStyle = rgba('#ffffff', 0.85 * (1 - p.age / p.life))
      g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
    }

    if (this.ending) drawBeam(g, this.lhPos.x, this.lhPos.y, this.t * 0.8, 200, Math.max(0.35, night))
    if (this.vignette && L.vignette > 0) {
      g.globalAlpha = L.vignette
      g.drawImage(this.vignette, 0, 0)
      g.globalAlpha = 1
    }
  }

  hit(x: number, y: number): SpotId | null {
    // the lighthouse and the boat first, the houses overlap less
    for (const id of ['fyret', 'baten', 'havnebua', 'stasjon', 'krambua'] as SpotId[]) {
      const s = this.spots.find((p) => p.id === id)
      if (s && x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return id
    }
    return null
  }
}

function ridgeLine(w: number, seed: number, base: number, amp: number, peaky: number) {
  const r = rng(seed)
  const ph = Array.from({ length: 5 }, () => r() * 6.28)
  return Array.from({ length: w }, (_, x) => {
    const smooth = 0.5 * Math.sin(x * 0.018 + ph[0]) + 0.3 * Math.sin(x * 0.047 + ph[1]) + 0.12 * Math.sin(x * 0.11 + ph[2])
    const a = 1 - Math.abs(Math.sin(x * 0.026 + ph[3]))
    const b = 1 - Math.abs(Math.sin(x * 0.061 + ph[4]))
    return Math.max(2, Math.round(base + amp * (smooth * (1 - peaky) + (a * a * 1.2 + b * b * 0.4 - 0.6) * peaky)))
  })
}

/** A filled pixel circle with a brighter core */
function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, rim: string, core: string) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const d = dx * dx + dy * dy
      if (d > r * r + r * 0.6) continue
      g.fillStyle = d > (r - 1.2) ** 2 ? rim : core
      g.fillRect(cx + dx, cy + dy, 1, 1)
    }
}

function makeVignette(W: number, H: number) {
  const { c, g } = canvas(W, H)
  const img = g.createImageData(W, H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const nx = (x - W / 2) / (W / 2)
      const ny = (y - H * 0.45) / (H * 0.62)
      const a = clamp01((Math.hypot(nx, ny) - 0.72) / 0.6)
      const th = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16
      const q = Math.floor(a * 4 + th) / 4
      if (q > 0) img.data.set([10, 8, 32, Math.round(q * 0.75 * 255)], (y * W + x) * 4)
    }
  g.putImageData(img, 0, 0)
  return c
}
