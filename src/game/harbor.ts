// The harbour: Krambua, Havnebua, Havstasjonen and the lighthouse

import { Pix, canvas, rgba, shade, mix, rng } from '../art/pixel'
import { boatSprite, catSprites, eagleSprites, gullSprites, kittiwakeSprites, otterSprite, puffinSprites, turtleSprite, BOAT_GEO, type BoatSpriteKind } from '../art/sprites'
import { auroraStrength, boatKindOf, isVardo, vaOf } from '../art/vardo'
import { VA_BOATS, rankLevel } from './vardo/economy'
import { drawBeam } from '../art/scenery'
import { Backdrop, drawGlitter, drawReflection, drawRipples, glow, light, makeVignette, PAL as L, rippleColour, tintAmbient, clamp01 } from '../art/fjord'
import { PAINTS } from './data'
import type { Save } from './state'
import { Rain, weatherAt } from './weather'

export type SpotId = 'krambua' | 'havnebua' | 'stasjon' | 'fyret' | 'baten' | 'naust'

export interface Spot {
  id: SpotId
  x: number
  y: number
  w: number
  h: number
}

/** Overrides used by the dev panel to preview the harbour */
export const dev = {
  time: null as number | null,
  ending: null as boolean | null,
  selma: null as boolean | null,
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

// ---------- Petersburg, Alaska ----------

/** A tiny 3×5 pixel font, enough for the signs */
const GLYPHS: Record<string, string[]> = {
  A: ['.1.', '1.1', '111', '1.1', '1.1'],
  B: ['11.', '1.1', '11.', '1.1', '11.'],
  E: ['111', '1..', '11.', '1..', '111'],
  F: ['111', '1..', '11.', '1..', '1..'],
  H: ['1.1', '1.1', '111', '1.1', '1.1'],
  I: ['111', '.1.', '.1.', '.1.', '111'],
  K: ['1.1', '1.1', '11.', '1.1', '1.1'],
  M: ['1.1', '111', '111', '1.1', '1.1'],
  L: ['1..', '1..', '1..', '1..', '111'],
  O: ['.1.', '1.1', '1.1', '1.1', '.1.'],
  P: ['11.', '1.1', '11.', '1..', '1..'],
  W: ['1.1', '1.1', '1.1', '111', '1.1'],
  R: ['11.', '1.1', '11.', '1.1', '1.1'],
  S: ['.11', '1..', '.1.', '..1', '11.'],
  T: ['111', '.1.', '.1.', '.1.', '.1.'],
  G: ['.11', '1..', '1.1', '1.1', '.11'],
  Y: ['1.1', '1.1', '.1.', '.1.', '.1.'],
  N: ['11.', '1.1', '1.1', '1.1', '1.1'],
  V: ['1.1', '1.1', '1.1', '1.1', '.1.'],
  U: ['1.1', '1.1', '1.1', '1.1', '111'],
  D: ['11.', '1.1', '1.1', '1.1', '11.'],
}

function letters(p: Pix, text: string, x: number, y: number, c: string) {
  for (const ch of text) {
    const g = GLYPHS[ch]
    if (g) g.forEach((row, j) => [...row].forEach((v, i) => v === '1' && p.set(x + i, y + j, c)))
    x += ch === ' ' ? 2 : 4
  }
}
const textW = (t: string) => [...t].reduce((n, ch) => n + (ch === ' ' ? 2 : 4), 0) - 1

/** Bakke Fisk: Astrid and Arne's old cannery shed on the quay, with a sign and rosemaling */
function bakkeFisk(w: number, r: () => number): Built {
  const gable = Math.round(w * 0.3)
  const wallH = 40
  const m = 6
  const apex = 10
  const top = apex + gable
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const cx = x0 + w / 2
  const wall = '#e4e0d4'
  const trim = '#2e6a5a'
  const roof = '#a8343a'
  const s = gable / (w / 2)
  const yLine = (x: number) => apex - 1 + Math.abs(x + 0.5 - cx) * s

  // a stovepipe behind the roof
  const chx = Math.round(x0 + w * 0.28)
  const chTop = Math.round(yLine(chx + 1)) - 8
  for (let y = chTop; y < chTop + 12; y++) for (let x = chx; x < chx + 2; x++) p.set(x, y, x === chx ? '#8a8a96' : '#5a5a68')
  p.rect(chx - 1, chTop - 1, 4, 1, '#3a3a48')
  b.smoke.push([chx + 1, chTop - 2])

  planks(p, x0, w, apex, H, wall, r, 'siding', (x, y) => y >= top || y + 0.5 >= yLine(x))
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.4))
    p.set(x, H - 2, shade(wall, -0.2))
  }
  // corner boards
  for (let y = top; y < H - 1; y++) {
    p.set(x0, y, shade(trim, -0.1))
    p.set(x0 + 1, y, trim)
    p.set(x0 + w - 2, y, trim)
    p.set(x0 + w - 1, y, shade(trim, -0.3))
  }
  // a red metal roof with ribs, overhanging the gable
  for (let y = 0; y < top + 4; y++)
    for (let x = x0 - 5; x < x0 + w + 5; x++) {
      const v = yLine(x) - (y + 0.5)
      if (v < 0 || v >= 5) continue
      p.set(x, y, v < 1.2 ? shade(roof, 0.25) : v < 3.6 ? ((x + y) % 4 === 0 ? shade(roof, -0.12) : roof) : shade(roof, -0.3))
    }
  // rosemaling on the gable: a painted band of flowers and curls
  const band = top - 9
  for (let x = Math.round(cx - gable * 0.9); x < Math.round(cx + gable * 0.9); x++) {
    if (band + 0.5 < yLine(x) + 2) continue
    const k = (x + 1000) % 6
    p.set(x, band, k === 0 ? '#d83a3a' : k === 3 ? '#2a5aa8' : '#2e6a5a')
    if (k === 0 || k === 3) {
      p.set(x, band - 1, '#f2c24a')
      p.set(x, band + 1, k === 0 ? '#f2c24a' : '#d83a3a')
    }
  }
  // loft window under the peak
  win(b, Math.round(cx - 3.5), apex + 5, '#f4ecdc', r, {})
  // the sign
  const sign = 'BAKKE FISK'
  const sw = textW(sign) + 6
  const sx = Math.round(cx - sw / 2)
  const sy = top + 3
  p.rect(sx, sy, sw, 9, '#1e4a40')
  p.rect(sx, sy, sw, 1, '#3a7a6a')
  p.rect(sx, sy + 8, sw, 1, '#123a32')
  letters(p, sign, sx + 3, sy + 2, '#f4ecdc')
  // windows
  win(b, x0 + 4, top + 16, '#f4ecdc', r, { flowers: true })
  win(b, x0 + w - 11, top + 16, '#f4ecdc', r, { flowers: true })
  // a big sliding cargo door, and a small door with a window
  const gw = Math.min(16, Math.round(w * 0.24))
  const gx = Math.round(cx - gw / 2) - 3
  const gy = H - 1 - 17
  p.rect(gx - 1, gy - 2, gw + 2, 1, '#4a4a58')
  p.rect(gx, gy, gw, 17, '#7a4a32')
  for (let x = gx; x < gx + gw; x += 3) for (let y = gy; y < gy + 17; y++) p.set(x, y, '#5e3824')
  line(p, gx, gy, gx + gw - 1, gy + 16, '#9a6a44')
  line(p, gx + gw - 1, gy, gx, gy + 16, '#9a6a44')
  p.rect(gx, gy, gw, 1, '#4a2a1e')
  door(b, gx + gw + 3, 6, 13, trim, '#f4ecdc', true)
  // rosemaling around the small door
  for (const [x, y, c] of [
    [gx + gw + 2, H - 16, '#d83a3a'],
    [gx + gw + 4, H - 17, '#f2c24a'],
    [gx + gw + 6, H - 17, '#2a5aa8'],
    [gx + gw + 8, H - 17, '#f2c24a'],
    [gx + gw + 10, H - 16, '#d83a3a'],
  ] as [number, number, string][])
    p.set(x, y, c)
  // a lamp over the cargo door
  const lx = Math.round(cx) - 3
  p.rect(lx - 1, gy - 5, 3, 1, '#2a2438')
  p.rect(lx - 1, gy - 4, 3, 2, '#ffd36a')
  b.lights.push({ x: lx - 1, y: gy - 4, w: 3, h: 2, kind: 'lamp', on: 0.1, ph: 3 })
  return b
}

/** The harbour office: a small blue house with a radio mast and a life ring */
function harborOffice(w: number, r: () => number): Built {
  const roofH = 6
  const wallH = 24
  const m = 5
  const mast = 18
  const top = mast + roofH
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const wall = '#5a7a9a'
  const trim = '#f4ecdc'
  planks(p, x0, w, top, H, wall, r, 'siding')
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  for (let y = top; y < H - 1; y++) {
    p.set(x0, y, shade(trim, -0.1))
    p.set(x0 + w - 1, y, shade(trim, -0.25))
  }
  // a shed roof sloping to the back
  for (let y = 0; y < roofH; y++) {
    const yy = top - roofH + y
    for (let x = x0 - 3; x < x0 + w + 3; x++) {
      if (y < Math.round(((x - x0 + 3) / (w + 6)) * (roofH - 2))) continue
      p.set(x, yy, y === roofH - 1 ? '#2a3448' : (x + y) % 5 === 0 ? '#3e4a62' : '#4a5670')
    }
  }
  // radio mast with a red light on top
  const ax = x0 + 3
  for (let y = 1; y < top - roofH + 1; y++) {
    p.set(ax, y, '#9a9aae')
    if (y % 4 === 0) {
      p.set(ax - 1, y, '#7a7a8e')
      p.set(ax + 1, y, '#7a7a8e')
    }
  }
  p.set(ax, 0, '#5a2a2a')
  b.blink.push([ax, 0])
  // the sign
  const sign = 'HARBOR'
  const sw = textW(sign) + 4
  const sx = Math.round(x0 + w / 2 - sw / 2)
  p.rect(sx, top + 2, sw, 7, '#f4ecdc')
  p.rect(sx, top + 8, sw, 1, '#b8b0a4')
  letters(p, sign, sx + 2, top + 3, '#2a3a5a')
  // a wide window full of charts, and the door
  win(b, x0 + 3, top + 12, trim, r, { wide: true })
  door(b, x0 + w - 9, 6, 13, '#2a3a5a', trim)
  // an orange life ring on the wall
  const rx = x0 + 14
  const ry = top + 13
  blit(p, spr(['.oo.', 'owwo', 'o..o', 'owwo', '.oo.'].map((s) => s), { o: '#f2742a', w: '#f4ecdc' }), rx, ry)
  return b
}

/** Selma's cabin: a green A-frame with a big triangle of glass */
function aFrame(w: number, selma: boolean, r: () => number): Built {
  const H = Math.round(w * 0.95) + 6
  const m = 6
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const cx = x0 + w / 2
  const roof = selma ? '#3a6a4a' : '#4a5a4e'
  const wood = selma ? '#b8844e' : '#8a7a68'
  const slope = (H - 3) / (w / 2 + 3)
  const roofAt = (x: number) => 2 + Math.abs(x + 0.5 - cx) * slope
  // the front wall inside the roof
  planks(p, x0 + 2, w - 4, 4, H, wood, r, selma ? 'batten' : 'weathered', (x, y) => y > roofAt(x) + 3)
  // big triangular window
  const wy = Math.round(H * 0.38)
  for (let y = wy; y < H - 16; y++)
    for (let x = x0; x < x0 + w; x++) {
      const inside = y > roofAt(x) + 7
      if (!inside) continue
      p.set(x, y, (x + 1) % 5 === 0 ? '#e8dcc8' : GLASS)
    }
  for (let y = wy; y < H - 16; y += 5)
    for (let x = x0; x < x0 + w; x++) if (y > roofAt(x) + 7) p.set(x, y, '#e8dcc8')
  for (let x = x0; x < x0 + w; x++) {
    const y = H - 16
    if (y > roofAt(x) + 7) p.set(x, y, '#e8dcc8')
  }
  const glassAt: [number, number][] = []
  for (let y = wy; y < H - 16; y++) for (let x = x0; x < x0 + w; x++) if (p.get(x, y) === GLASS) glassAt.push([x, y])
  for (const [x, y] of glassAt) if ((x + y) % 7 === 0) p.set(x, y, '#5a7aa8')
  // light the panes as one window
  if (glassAt.length) {
    const xs = glassAt.map(([x]) => x)
    const ys = glassAt.map(([, y]) => y)
    const lx = Math.min(...xs)
    const ly = Math.min(...ys)
    b.lights.push({ x: lx + 1, y: ly + 2, w: Math.max(...xs) - lx - 1, h: Math.max(...ys) - ly - 2, kind: 'pane', on: selma ? 0.15 : 9, ph: 4 })
  }
  // the roof: two steep planes of shingles that almost reach the deck
  for (let y = 0; y < H; y++)
    for (let x = x0 - 3; x < x0 + w + 3; x++) {
      const v = y + 0.5 - roofAt(x)
      if (v < 0 || v >= 4) continue
      p.set(x, y, v < 1 ? shade(roof, 0.3) : (y + Math.floor(x / 2)) % 3 === 0 ? shade(roof, -0.18) : roof)
    }
  // door and steps
  door(b, Math.round(cx - 3), 6, 12, selma ? '#a8343a' : '#5a4a3e', '#e8dcc8', false)
  if (selma) {
    // satellite dish and antenna on the ridge
    blit(p, spr(['..ww', '.wwws', 'wwws', '.k..'], { w: '#e8ecf2', s: '#a8b0c0', k: '#5a5a6e' }), Math.round(cx) + 3, 0)
    b.blink.push([Math.round(cx) - 2, 0])
    p.set(Math.round(cx) - 2, 1, '#7a7a8e')
    p.set(Math.round(cx) - 2, 2, '#7a7a8e')
  } else {
    // a sign in the window: TIL LEIE
    const sx = Math.round(cx - 8)
    p.rect(sx, H - 25, 17, 7, '#f4ecdc')
    p.rect(sx, H - 19, 17, 1, '#b8b0a4')
    letters(p, 'LEIE', sx + 1, H - 24, '#a8343a')
  }
  // stovepipe
  b.smoke.push([Math.round(cx) - 5, 3])
  if (selma) p.rect(Math.round(cx) - 6, 3, 2, 3, '#4a4a58')
  return b
}

/** The mail plane: a yellow bush plane on floats. The waterline is at the bottom. */
function floatplane(y = '#f2c24a', Y = '#c8902e', red = '#c8383a') {
  const p = new Pix(44, 20)
  // floats
  for (let x = 4; x < 38; x++) {
    const nose = x > 33 ? x - 33 : 0
    p.set(x, 18, '#c8ccd8')
    p.set(x, 19, '#8a90a0')
    if (nose < 3) p.set(x, 17, x % 6 === 0 ? '#8a90a0' : '#e8ecf2')
  }
  // struts
  for (const sx of [12, 26]) for (let yy = 12; yy < 17; yy++) p.set(sx + Math.round((yy - 12) * 0.3), yy, '#5a5a68')
  // fuselage, tapering to the tail on the left
  for (let x = 2; x < 38; x++) {
    const u = (x - 2) / 36
    const top = Math.round(u < 0.5 ? 9 - u * 6 : 6)
    const bot = Math.round(u < 0.4 ? 10 + u * 5 : 12)
    for (let yy = top; yy <= bot; yy++) {
      let c = yy === top ? shade(y, 0.25) : yy >= bot - 1 ? Y : y
      if (yy === Math.round((top + bot) / 2) + 1) c = red
      p.set(x, yy, c)
    }
  }
  // tail fin
  for (let yy = 1; yy < 7; yy++) for (let x = 2; x < 2 + Math.round((7 - yy) * 0.9) + 2; x++) p.set(x, yy, x === 2 ? Y : y)
  p.rect(2, 1, 3, 2, red)
  // high wing above the cabin, seen almost edge on
  p.rect(16, 4, 20, 2, Y)
  p.rect(16, 4, 20, 1, shade(y, 0.2))
  // cabin windows
  p.rect(26, 7, 3, 3, GLASS)
  p.rect(30, 7, 3, 3, GLASS)
  p.set(26, 7, '#8ab8e0')
  p.set(30, 7, '#8ab8e0')
  // engine cowling and propeller
  p.rect(37, 7, 3, 5, '#3a3a48')
  p.rect(40, 5, 1, 9, '#8a8a96')
  p.set(40, 9, '#2a2438')
  p.outline(0.45, (x, yy) => yy >= 17)
  return p
}

const USFLAG = (x: number, y: number) =>
  x < 5 && y < 4 ? ((x + y) % 2 === 0 ? '#f4f4f0' : '#2a3a7a') : y % 2 === 0 ? '#c8283a' : '#f4f4f0'



// ---------- Hilo, Hawaiʻi ----------

/** Leilani's fish stall: an open shed with a tin roof, a counter of fish on ice and a POKE sign */
function fishStall(w: number, r: () => number): Built {
  const m = 6
  const roofY = 12
  const H = roofY + 34
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const wall = '#3a8a8a'
  // back wall, posts and an open front
  planks(p, x0, w, roofY + 4, H, wall, r, 'batten')
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  for (const px of [x0, x0 + w - 2, Math.round(x0 + w / 2)]) for (let y = roofY + 3; y < H - 1; y++) {
    p.set(px, y, '#f4ecdc')
    p.set(px + 1, y, '#c8c0b0')
  }
  // a rusty corrugated tin roof
  for (let y = 0; y < 6; y++)
    for (let x = x0 - 4; x < x0 + w + 4; x++) {
      const yy = roofY - 2 + y
      if (y < 3 - Math.round(((x - x0 + 4) / (w + 8)) * 3)) continue
      p.set(x, yy, x % 3 === 0 ? '#8a3a2a' : y === 5 ? '#5a2a22' : (x * 7 + y) % 11 === 0 ? '#c86a3a' : '#a8483a')
    }
  // the sign on the roof
  const sign = 'POKE'
  const sw = textW(sign) + 6
  const sx = Math.round(x0 + w / 2 - sw / 2)
  p.rect(sx, 1, sw, 9, '#f4ecdc')
  p.rect(sx, 9, sw, 1, '#b8b0a4')
  letters(p, sign, sx + 3, 3, '#e8484a')
  for (const lx of [sx + 1, sx + sw - 2]) for (let y = 10; y < roofY - 1; y++) p.set(lx, y, '#5a4a3e')
  // the counter with fish laid out on ice
  const cy = H - 12
  p.rect(x0 + 2, cy, w - 4, 2, '#e8f0f4')
  p.rect(x0 + 2, cy + 2, w - 4, 9, '#c8a878')
  for (let x = x0 + 2; x < x0 + w - 2; x += 3) for (let y = cy + 2; y < cy + 11; y++) p.set(x, y, '#a8885a')
  const fishCols = ['#e8484a', '#f2c24a', '#4a8ab8', '#e88aa0', '#8a9aa8']
  for (let x = x0 + 4; x < x0 + w - 6; x += 5) {
    const c = fishCols[Math.floor(r() * fishCols.length)]
    p.rect(x, cy - 1, 4, 1, c)
    p.set(x + 4, cy - 1, shade(c, -0.3))
  }
  // a string of lights under the roof
  for (let x = x0 + 1; x < x0 + w - 1; x += 4) {
    p.set(x, roofY + 4, '#ffd36a')
    b.lights.push({ x, y: roofY + 4, w: 1, h: 1, kind: 'lamp', on: 0.05, ph: x })
  }
  b.blades.push([x0 + 3, roofY + 3])
  return b
}

/** Kimo's harbour office: a white plantation house with a green roof and a shady lanai */
function plantation(w: number, r: () => number): Built {
  const m = 6
  const roofH = 9
  const wallH = 24
  const top = 4 + roofH
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const wall = '#f0ece0'
  const trim = '#3a7a5a'
  planks(p, x0, w, top, H, wall, r, 'siding')
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  // a hipped tin roof, pale green
  for (let y = 0; y < roofH; y++) {
    const inset = Math.round((roofH - y) * 0.9)
    for (let x = x0 - 3 + inset; x < x0 + w + 3 - inset; x++) p.set(x, 4 + y, y === roofH - 1 ? '#2a5a42' : x % 3 === 0 ? '#5a9a7a' : '#7ab89a')
  }
  // the lanai: a shaded porch with posts and a railing
  for (let y = top; y < H - 1; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) if (y < top + 3) p.set(x, y, shade(wall, -0.25))
  for (let x = x0 + 1; x < x0 + w - 1; x += 6) for (let y = top; y < H - 1; y++) p.set(x, y, trim)
  for (let x = x0 + 1; x < x0 + w - 1; x++) {
    p.set(x, H - 8, trim)
    if (x % 2 === 0) for (let y = H - 7; y < H - 2; y++) p.set(x, y, shade(trim, 0.3))
  }
  const sign = 'HARBOR'
  const sw = textW(sign) + 4
  const sx = Math.round(x0 + w / 2 - sw / 2)
  p.rect(sx, top + 4, sw, 7, trim)
  letters(p, sign, sx + 2, top + 5, '#f4ecdc')
  win(b, x0 + 3, top + 12, '#f4ecdc', r, { wide: true })
  door(b, x0 + w - 10, 6, 12, '#2a5a42', '#f4ecdc')
  // a radio mast on the roof
  const ax = x0 + w - 5
  for (let y = 0; y < 6; y++) p.set(ax, y, '#9a9aae')
  p.set(ax, 0, '#5a2a2a')
  b.blink.push([ax, 0])
  return b
}

/** Selma's whale station: a little turquoise shack with a tail painted on the wall and an antenna */
function whaleShack(w: number, r: () => number): Built {
  const m = 6
  const top = 14
  const H = top + 22
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const wall = '#4ac0b8'
  planks(p, x0, w, top, H, wall, r, 'batten')
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  // a low gable of tin
  const cx = x0 + w / 2
  for (let y = 6; y < top + 1; y++)
    for (let x = x0 - 3; x < x0 + w + 3; x++) {
      const v = y - (6 + Math.abs(x + 0.5 - cx) * 0.55)
      if (v < 0 || v > 3) continue
      p.set(x, y, v < 1 ? '#e8ecf0' : '#a8b0bc')
    }
  // a whale's tail painted on the wall
  const tx = x0 + 5
  const ty = top + 4
  blit(p, spr(['w.....w', 'ww...ww', '.wwwww.', '...w...', '...w...', '..www..'], { w: '#f4f8fa' }), tx, ty)
  win(b, x0 + w - 11, top + 4, '#f4ecdc', r, {})
  door(b, Math.round(cx) - 2, 5, 11, '#2a6a74', '#f4ecdc', true)
  // antenna and a dish
  const ax = Math.round(cx) + 2
  for (let y = 0; y < 8; y++) p.set(ax, y, '#9a9aae')
  b.blink.push([ax, 0])
  blit(p, spr(['..ww', '.wwws', 'wwws', '.k..'], { w: '#e8ecf2', s: '#a8b0c0', k: '#5a5a6e' }), x0 + 1, 7)
  // a cable reel for the buoys
  blit(p, spr(['.yyy.', 'ykkky', 'ykyky', 'ykkky', '.yyy.'], { y: '#ffd84a', k: '#3a3a4a' }), x0 + w - 1, H - 6)
  return b
}

const HAWAIIFLAG = (x: number, y: number) =>
  x < 5 && y < 4 ? (x === 2 || y === 1 ? '#d82a3a' : x === 1 || x === 3 || y === 0 || y === 2 ? '#f4f4f0' : '#1a3a8a') : ['#f4f4f0', '#d82a3a', '#1a3a8a'][y % 3]

/** A tall palm leaning over the quay */
function palmTree(h: number) {
  const p = new Pix(19, h + 6)
  for (let i = 0; i < h; i++) {
    const x = 9 + Math.round(Math.sin((i / h) * 1.4) * 3)
    p.set(x, h + 5 - i, i % 3 === 0 ? '#5a4030' : '#7a5a40')
    p.set(x + 1, h + 5 - i, '#4a3426')
  }
  const tx = 9 + Math.round(Math.sin(1.4) * 3)
  const fronds: [number, number][] = [[-1, 0], [1, 0], [-1, 1], [1, 1]]
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1]] as [number, number][])
    for (let k = 1; k < 9; k++) {
      const x = tx + dx * k
      const y = 6 + dy * Math.round(k * 0.4) + Math.round((k * k) / 16)
      p.set(x, y, k > 6 ? '#2e7a3a' : '#3a9a4a')
      if (k % 2 === 0) p.set(x, y + 1, '#2a6a32')
    }
  void fronds
  p.rect(tx - 1, 6, 3, 2, '#6a4a2a')
  p.outline(0.4)
  return p
}


// ---------- Henningsvær, Lofoten ----------

/** Snow lying on everything that faces up */
function snowOn(p: Pix, r: () => number) {
  const tops: [number, number][] = []
  for (let x = 0; x < p.w; x++)
    for (let y = 0; y < p.h; y++)
      if (p.get(x, y)) {
        tops.push([x, y])
        break
      }
  for (const [x, y] of tops) {
    p.set(x, y, '#f4f8fc')
    if (r() < 0.7) p.set(x, y + 1, '#dce6f0')
  }
}

/** The fish receiving station: a big white shed on the quay with a crane and the MOTTAK sign */
function mottak(w: number, r: () => number): Built {
  const m = 6
  const roofH = 10
  const wallH = 32
  const top = 6 + roofH
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const wall = '#e8e8ec'
  planks(p, x0, w, top, H, wall, r, 'siding')
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  // a dark gable roof
  const cx = x0 + w / 2
  for (let y = 6; y < top + 1; y++)
    for (let x = x0 - 3; x < x0 + w + 3; x++) {
      const v = y - (6 + Math.abs(x + 0.5 - cx) * (roofH / (w / 2 + 3)))
      if (v < 0 || v > 4) continue
      p.set(x, y, v < 1 ? '#5a5a68' : (x + y) % 4 === 0 ? '#2e2e3a' : '#3a3a48')
    }
  const sign = 'MOTTAK'
  const sw = textW(sign) + 4
  const sx = Math.round(cx - sw / 2)
  p.rect(sx, top + 3, sw, 7, '#2a3a6a')
  letters(p, sign, sx + 2, top + 4, '#f4f4f0')
  // a wide door for fish boxes, and a small window
  const gw = 14
  const gx = Math.round(cx - gw / 2)
  p.rect(gx, H - 16, gw, 15, '#3a6a9a')
  for (let x = gx; x < gx + gw; x += 2) for (let y = H - 16; y < H - 1; y++) p.set(x, y, '#2e5a88')
  p.rect(gx, H - 16, gw, 1, '#1e3a5a')
  win(b, x0 + 3, top + 13, '#f4ecdc', r, {})
  win(b, x0 + w - 10, top + 13, '#f4ecdc', r, {})
  // a crane arm for lifting fish out of the boats
  for (let y = 0; y < top; y++) p.set(x0 + w - 3, y, '#f2c24a')
  line(p, x0 + w - 3, 0, x0 + w + 4, 3, '#f2c24a')
  for (let y = 4; y < 12; y++) p.set(x0 + w + 4, y, '#4a4a58')
  p.rect(x0 + w + 3, 12, 3, 2, '#8a8a96')
  // a lamp over the door
  p.rect(Math.round(cx) - 1, H - 19, 3, 2, '#ffd36a')
  b.lights.push({ x: Math.round(cx) - 1, y: H - 19, w: 3, h: 2, kind: 'lamp', on: 0.05, ph: 6 })
  snowOn(p, r)
  return b
}

/** A rorbu: a fisherman's cabin on poles over the water, red or yellow, with a white gable trim */
function rorbu(w: number, wall: string, r: () => number, ruined = false): Built {
  const m = 6
  const gable = Math.round(w * 0.42)
  const wallH = 20
  const apex = 4
  const top = apex + gable
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const cx = x0 + w / 2
  const s = gable / (w / 2)
  const yLine = (x: number) => apex - 1 + Math.abs(x + 0.5 - cx) * s
  planks(p, x0, w, apex, H, wall, r, ruined ? 'weathered' : 'batten', (x, y) => y >= top || y + 0.5 >= yLine(x))
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  for (let y = 0; y < top + 3; y++)
    for (let x = x0 - 4; x < x0 + w + 4; x++) {
      const v = yLine(x) - (y + 0.5)
      if (v < 0 || v >= 3.6) continue
      p.set(x, y, v < 1.2 ? '#f4ecdc' : v < 2.4 ? '#3a3a48' : '#4a4a58')
    }
  if (ruined) {
    // holes in the roof and boards over a broken window
    for (const hx of [x0 + 3, x0 + w - 6]) for (let k = 0; k < 3; k++) p.set(hx + k, Math.round(yLine(hx + k)) + 1, '#1e1a22')
    win(b, x0 + 3, top + 4, '#c8bfae', r, { boarded: true })
    p.rect(x0 + w - 8, top + 6, 5, 2, '#8a6a4a')
  } else {
    win(b, x0 + 3, top + 4, '#f4ecdc', r, {})
    win(b, x0 + w - 10, top + 4, '#f4ecdc', r, {})
    // a stovepipe with smoke
    const chx = Math.round(x0 + w * 0.7)
    const chy = Math.round(yLine(chx)) - 4
    p.rect(chx, chy, 2, 5, '#4a4a58')
    b.smoke.push([chx + 1, chy - 1])
  }
  door(b, Math.round(cx) - 3, 6, 12, ruined ? '#5a4a3e' : '#2a4a6a', '#f4ecdc')
  snowOn(p, r)
  return b
}

/** A drying rack of poles with `n` pairs of skrei hanging from it */
function hjell(w: number, n: number) {
  const p = new Pix(w, 24)
  for (let x = 0; x < w; x += 6) for (let y = 3; y < 24; y++) p.set(x, y, y < 5 ? '#8a6a4a' : '#6a4a32')
  for (const y of [3, 12]) for (let x = 0; x < w; x++) p.set(x, y, '#7a5a3e')
  let k = 0
  for (const y of [4, 13])
    for (let x = 2; x < w - 1; x += 3) {
      if (k++ >= n) continue
      for (let j = 0; j < 6; j++) {
        p.set(x, y + j, j > 4 ? '#6a6458' : j % 2 ? '#a8a294' : '#c8c2b0')
      }
      p.set(x + 1, y + 1, '#8a8478')
    }
  for (let x = 0; x < w; x++) p.set(x, 2, '#f4f8fc')
  return p
}

/** The coastal steamer, black hull and white decks, docking at the end of the quay */
function hurtigruten() {
  const p = new Pix(52, 26)
  for (let x = 2; x < 50; x++) {
    const u = x / 50
    const top = 14 + Math.round(Math.pow(1 - u, 3) * 2)
    for (let y = top; y < 26; y++) p.set(x, y, y === top ? '#4a4a58' : y > 22 ? '#a8343a' : '#1e1e26')
  }
  // bow rising to the right
  for (let y = 10; y < 14; y++) for (let x = 46 + (13 - y); x < 51; x++) p.set(x, y, '#1e1e26')
  // white superstructure with rows of windows
  p.rect(10, 7, 30, 7, '#f0f0f4')
  p.rect(14, 3, 20, 4, '#f0f0f4')
  for (let x = 11; x < 39; x += 2) p.set(x, 9, '#3a4a6a')
  for (let x = 15; x < 33; x += 2) p.set(x, 5, '#3a4a6a')
  // the red funnel with a black top
  p.rect(22, 0, 4, 4, '#c8383a')
  p.rect(22, 0, 4, 1, '#1e1e26')
  p.outline(0.4, (x, y) => y > 22)
  return p
}

// ---------- Vardø ----------

/** A gable roof with barge boards over the wall below it, like the other gable-end houses */
function gableRoof(p: Pix, x0: number, w: number, apex: number, gable: number, roof: string, trim: string | null, over = 4) {
  const cx = x0 + w / 2
  const s = gable / (w / 2)
  const yLine = (x: number) => apex - 1 + Math.abs(x + 0.5 - cx) * s
  for (let y = 0; y < apex + gable + 4; y++)
    for (let x = x0 - over; x < x0 + w + over; x++) {
      const v = yLine(x) - (y + 0.5)
      if (v < 0 || v >= 3.8) continue
      p.set(x, y, trim && v < 1.2 ? trim : v < 2.2 ? shade(roof, -0.2) : v < 3.2 ? roof : shade(roof, 0.3))
    }
  return yLine
}

/** Pomorbrygga: Nadja's white wharf building, a loft door in its wall dormer, the sign, and a mural */
function pomorbrygga(w: number, r: () => number): Built {
  const m = 6
  const roofH = 9
  const ry = 9
  const top = ry + roofH
  const wallH = 34
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const cx = Math.round(x0 + w / 2)
  const wall = '#ece8e0'
  const trim = '#2e5a5a'
  const roof = '#3a3a4a'

  // a stovepipe from Nadja's office
  const chx = x0 + w - 9
  for (let y = 3; y < ry + 3; y++) for (let x = chx; x < chx + 2; x++) p.set(x, y, x === chx ? '#8a8a96' : '#5a5a68')
  p.rect(chx - 1, 2, 4, 1, '#3a3a48')
  b.smoke.push([chx + 1, 1])

  planks(p, x0, w, top, H, wall, r, 'siding')
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.4))
    p.set(x, H - 2, shade(wall, -0.2))
  }
  for (let y = top; y < H - 1; y++) {
    p.set(x0, y, shade(trim, -0.1))
    p.set(x0 + 1, y, trim)
    p.set(x0 + w - 2, y, trim)
    p.set(x0 + w - 1, y, shade(trim, -0.3))
  }
  // the long roof, tarred boards with a ridge
  for (let rr = 0; rr < roofH; rr++) {
    const y = ry + rr
    const inset = Math.round((roofH - 1 - rr) * 0.45)
    for (let x = x0 - 3 + inset; x < x0 + w + 3 - inset; x++) {
      let c = rr === 0 ? shade(roof, 0.35) : rr === roofH - 1 ? shade(roof, -0.35) : (x + rr * 2) % 5 === 0 ? shade(roof, -0.12) : roof
      if (rr > 0 && rr < roofH - 2 && r() < 0.05) c = mix(c, '#5a7a4a', 0.5)
      p.set(x, y, c)
    }
  }
  for (let x = x0; x < x0 + w; x++) darken(p, x, top, 0.25)
  // the wall dormer with a loft door and a hoist beam
  const aw = 13
  const ax = cx - Math.floor(aw / 2)
  planks(p, ax, aw, 4, top + 1, wall, r, 'siding')
  for (let y = 4; y < top + 1; y++) {
    p.set(ax, y, trim)
    p.set(ax + aw - 1, y, shade(trim, -0.25))
  }
  gableRoof(p, ax, aw, 2, 4, roof, '#f4ecdc', 2)
  p.rect(cx - 3, 8, 7, 9, '#7a4a32')
  for (const x of [cx - 1, cx + 1]) for (let y = 8; y < 17; y++) p.set(x, y, '#5e3824')
  p.rect(cx - 4, 7, 9, 1, trim)
  p.rect(cx - 1, 5, 3, 1, '#4a3222')
  p.set(cx + 1, 6, '#c8a878')
  // the sign
  const sign = 'POMORBRYGGA'
  const sw = textW(sign) + 4
  const sx = Math.round(x0 + w / 2 - sw / 2)
  const sy = top + 2
  p.rect(sx, sy, sw, 8, '#1e3a4a')
  p.rect(sx, sy, sw, 1, '#3a6a7a')
  p.rect(sx, sy + 7, sw, 1, '#122a36')
  letters(p, sign, sx + 2, sy + 2, '#f4ecdc')
  // a cargo door, the shop door with a lamp
  const gx = x0 + 3
  const gw = 12
  const gy = H - 1 - 16
  p.rect(gx - 1, gy - 1, gw + 2, 1, trim)
  p.rect(gx, gy, gw, 16, '#2e5a5a')
  for (let x = gx; x < gx + gw; x += 3) for (let y = gy; y < gy + 16; y++) p.set(x, y, '#244848')
  line(p, gx, gy, gx + gw / 2 - 1, gy + 15, '#4a7a7a')
  line(p, gx + gw - 1, gy, gx + gw / 2, gy + 15, '#4a7a7a')
  p.rect(gx + gw / 2 - 1, gy, 1, 16, '#1a3434')
  const dx = gx + gw + 3
  door(b, dx, 7, 14, '#a8343a', trim, true)
  p.rect(dx + 2, H - 19, 3, 1, '#2a2438')
  p.rect(dx + 2, H - 18, 3, 2, '#ffd36a')
  b.lights.push({ x: dx + 2, y: H - 18, w: 3, h: 2, kind: 'lamp', on: 0.08, ph: 5 })
  // the mural: a humpback's tail rising out of a sea of colour under an orange sun
  const mx0 = dx + 10
  const mw = x0 + w - 3 - mx0
  const my0 = sy + 10
  const mh = H - 4 - my0
  if (mw > 8)
    for (let y = 0; y < mh; y++)
      for (let x = 0; x < mw; x++) {
        const u = x / (mw - 1)
        const v = y / (mh - 1)
        let c = mix('#2a8a9a', '#1e3a7a', v)
        if ((x + y) % 2 === 0 && v > 0.4 && v < 0.6) c = mix('#2a8a9a', '#1e3a7a', 0.6)
        if (Math.hypot(u - 0.74, v - 0.28) < 0.2) c = Math.hypot(u - 0.74, v - 0.28) < 0.12 ? '#ffc84a' : '#f07a3a'
        // the fluke: a stalk and two curved blades
        const sxx = 0.38
        const stalk = Math.abs(u - sxx) < 0.07 && v > 0.42
        const blades = v > 0.12 && v < 0.5 && Math.abs(Math.abs(u - sxx) - (0.5 - v) * 0.9) < 0.11
        if (stalk || blades) c = v < 0.2 ? '#e8ecf4' : '#14182e'
        if (v > 0.78) c = Math.sin(x * 1.3 + y * 2) > 0.3 ? '#e8f4f8' : '#3ab8c8'
        if (x === 0 || y === 0) c = shade(c, 0.1)
        p.set(mx0 + x, my0 + y, c)
      }
  return b
}

/** Havnekontoret: Brita's small ochre office with the contract board on posts beside the door */
function havnekontoret(w: number, r: () => number): Built {
  const m = 6
  const gable = Math.round(w * 0.44)
  const apex = 4
  const top = apex + gable
  const wallH = 19
  const H = top + wallH
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m - 1
  const wall = '#d89a3a'
  const trim = '#f4ecdc'
  const yLine = (x: number) => apex - 1 + Math.abs(x + 0.5 - (x0 + w / 2)) * (gable / (w / 2))
  planks(p, x0, w, apex, H, wall, r, 'batten', (x, y) => y >= top || y + 0.5 >= yLine(x))
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  p.rect(x0, top, w, 1, trim)
  for (let x = x0; x < x0 + w; x++) darken(p, x, top + 1, 0.2)
  for (let y = top; y < H - 1; y++) {
    p.set(x0, y, shade(trim, -0.1))
    p.set(x0 + w - 1, y, shade(trim, -0.22))
  }
  gableRoof(p, x0, w, apex, gable, '#a8343a', trim, 3)
  // a round window in the gable and a life ring on the wall
  const cx = Math.round(x0 + w / 2)
  p.rect(cx - 1, top - 5, 2, 2, GLASS)
  p.set(cx - 1, top - 5, '#8ab8e0')
  b.lights.push({ x: cx - 1, y: top - 5, w: 2, h: 2, kind: 'pane', on: 0.3, ph: 3 })
  win(b, x0 + 2, top + 4, trim, r)
  door(b, x0 + w - 8, 6, 13, '#2a4a6a', trim, true)
  for (const [ddx, ddy, c] of [[0, 1, '#ff6a3a'], [1, 0, '#f4ecdc'], [2, 0, '#ff6a3a'], [3, 1, '#f4ecdc'], [3, 2, '#ff6a3a'], [2, 3, '#f4ecdc'], [1, 3, '#ff6a3a'], [0, 2, '#f4ecdc']] as [number, number, string][])
    p.set(x0 + 10 + ddx, top + 3 + ddy, c)
  // the contract board: a little roof over notes pinned to a dark board
  const bx = x0 + w + 1
  const by = H - 15
  for (const px of [bx, bx + 5]) for (let y = by; y < H; y++) p.set(px, y, '#5a3e2a')
  p.rect(bx - 1, by - 1, 8, 1, '#a8343a')
  p.rect(bx, by, 6, 6, '#4a3424')
  const notes = ['#f4ecdc', '#ffe48a', '#f8c0c8', '#f4ecdc', '#c8e0f0']
  for (const [nx, ny, k] of [[1, 1, 0], [3, 1, 1], [1, 3, 2], [4, 3, 3], [2, 4, 4]] as [number, number, number][]) {
    p.set(bx + nx, by + ny, notes[k])
    if (nx < 4) p.set(bx + nx, by + ny + (ny < 3 ? 1 : 0), shade(notes[k], -0.1))
  }
  p.set(bx + 3, by + 1, '#d8433a')
  return b
}

/**
 * Signes hus: a blue two-storey house with its gable to the sea, the smokehouse beside it on the
 * left and the sauna on the right. Without a roof it is a ruin; every room you build shows.
 */
function signesHus(rooms: string[], r: () => number): Built & { tarn: [number, number] | null; door: number } {
  const has = (id: string) => rooms.includes(id)
  const roofed = has('tak')
  const shedW = 10
  const hw = 30
  const saunaW = 10
  const m = 3
  const W = m + shedW + 1 + hw + 1 + saunaW + m
  const wallH = 32
  const gable = 13
  const apex = 11
  const top = apex + gable
  const H = top + wallH
  const p = new Pix(W, H)
  const b = built(p)
  const x0 = m + shedW + 1
  const cx = x0 + hw / 2
  const wall = roofed ? '#3a6a9e' : '#6a7a8a'
  const trim = roofed ? '#f0ece4' : '#b8b4a8'
  const roof = roofed ? '#34343f' : '#4a4642'

  // the chimney: whole and smoking once the kitchen is in use, broken before
  const chx = Math.round(x0 + hw * 0.66)
  const yLine0 = (x: number) => apex - 1 + Math.abs(x + 0.5 - cx) * (gable / (hw / 2))
  const chTop = Math.round(yLine0(chx + 1)) - (roofed ? 6 : 2)
  for (let y = chTop; y < chTop + 9; y++)
    for (let x = chx; x < chx + 3; x++) p.set(x, y, (y - chTop) % 3 === 2 ? '#6a3430' : x === chx ? '#b0604a' : '#924a3a')
  if (roofed) {
    p.rect(chx - 1, chTop, 5, 1, '#4a4458')
    if (has('kjokken')) b.smoke.push([chx + 1, chTop - 1])
  } else p.set(chx + 2, chTop, null)

  planks(p, x0, hw, apex, H, wall, r, roofed ? 'siding' : 'weathered', (x, y) => y >= top || y + 0.5 >= yLine0(x))
  for (let x = x0; x < x0 + hw; x++) {
    p.set(x, H - 1, shade(wall, -0.35))
    p.set(x, H - 2, shade(wall, -0.15))
  }
  for (let y = top; y < H - 1; y++) {
    p.set(x0, y, shade(trim, -0.1))
    p.set(x0 + 1, y, trim)
    p.set(x0 + hw - 2, y, trim)
    p.set(x0 + hw - 1, y, shade(trim, -0.22))
  }
  // the band between the floors and under the gable
  const mid = top + 15
  p.rect(x0, mid, hw, 1, trim)
  p.rect(x0, top, hw, 1, trim)
  for (let x = x0; x < x0 + hw; x++) {
    darken(p, x, mid + 1, 0.2)
    darken(p, x, top + 1, 0.2)
  }
  gableRoof(p, x0, hw, apex, gable, roof, trim, 4)
  if (!roofed) {
    // holes through the roof, the barge board hanging loose, weeds on the steps
    for (const [hx, n] of [[x0 - 1, 4], [x0 + hw - 5, 3], [x0 + 6, 2]] as [number, number][])
      for (let k = 0; k < n; k++) {
        const y = Math.round(yLine0(hx + k)) + 1
        p.set(hx + k, y, '#1e1a22')
        p.set(hx + k, y + 1, '#2a2428')
      }
    for (let k = 0; k < 5; k++) p.set(x0 + hw + 1 + Math.floor(k / 2), Math.round(yLine0(x0 + hw)) + 1 + k, '#d8d0c0')
    for (let x = x0; x < x0 + hw; x++) if (r() < 0.4) p.set(x, H - 2 - (r() < 0.3 ? 1 : 0), r() < 0.5 ? '#5a7a3a' : '#6a8a42')
  }
  // windows: kitchen and living room below, bedroom and guest room above, the loft in the gable
  const lit = (id: string) => roofed && has(id)
  const winAt = (X: number, Y: number, id: string, curtains = false) => {
    if (!roofed) return win(b, X, Y, trim, r, { boarded: true })
    const n = b.lights.length
    win(b, X, Y, trim, r)
    if (!lit(id)) b.lights.splice(n)
    else for (const l of b.lights.slice(n)) l.on = 0.08 + r() * 0.2
    if (curtains && lit(id))
      for (let y = Y + 1; y < Y + 8; y++) {
        p.set(X + 1, y, y % 2 ? '#d8433a' : '#f4ecdc')
        p.set(X + 5, y, y % 2 ? '#d8433a' : '#f4ecdc')
      }
  }
  winAt(x0 + 3, mid + 4, 'kjokken')
  winAt(x0 + hw - 10, mid + 4, 'stue')
  winAt(x0 + 3, top + 3, 'tak')
  winAt(x0 + hw - 10, top + 3, 'gjest1', true)
  const loft = has('gjest2') || has('verksted') ? (has('gjest2') ? 'gjest2' : 'verksted') : 'gjest2'
  winAt(Math.round(cx) - 3, apex + 5, loft, has('gjest2'))
  // the door between the windows, with a lamp over it
  const dx = Math.round(cx) - 3
  door(b, dx, 6, 12, roofed ? '#2a4a3a' : '#5a4a3e', trim, roofed)
  if (!roofed) {
    p.rect(dx - 1, H - 10, 8, 1, '#9a7a5a')
    p.rect(dx - 1, H - 6, 8, 1, '#8a6a4a')
  } else {
    p.rect(dx + 2, H - 16, 2, 2, '#ffd36a')
    b.lights.push({ x: dx + 2, y: H - 16, w: 2, h: 2, kind: 'lamp', on: 0.06, ph: 9 })
  }

  // Nordlysrommet: a glass loft on the ridge
  let tarn: [number, number] | null = null
  if (roofed && has('tarn')) {
    const tx = Math.round(cx) - 5
    const ty = apex - 8
    for (let y = ty; y < ty + 7; y++)
      for (let x = tx; x < tx + 10; x++) p.set(x, y, x === tx || x === tx + 9 || (x - tx) % 3 === 0 ? '#e8e4dc' : y === ty ? '#9ac8e8' : GLASS)
    for (let k = 0; k < 6; k++) p.rect(tx - 1 + k, ty - 1 - Math.floor(k / 2) * 0, 12 - k * 2, 1, k === 0 ? '#4a4a58' : '#34343f')
    p.rect(tx + 1, ty - 2, 8, 1, '#34343f')
    p.rect(tx + 3, ty - 3, 4, 1, '#4a4a58')
    for (const x of [tx + 1, tx + 4, tx + 7]) b.lights.push({ x, y: ty + 1, w: 2, h: 5, kind: 'pane', on: 0.15, ph: x })
    tarn = [tx + 5, ty + 3]
  }

  // Røykeriet: a tarred shed with a stovepipe and fish hanging inside the open door
  if (has('royeri')) {
    const sx = m
    const sh = 13
    const sy = H - sh
    planks(p, sx, shedW, sy, H, '#3a2c26', r, 'batten')
    for (let x = sx - 1; x < sx + shedW + 1; x++) {
      const y = sy - 1 - Math.round(((x - sx) / shedW) * 2)
      p.set(x, y, '#2a2a34')
      p.set(x, y + 1, '#4a4a58')
    }
    p.rect(sx + 2, H - 9, 5, 8, '#1a1210')
    for (const fx of [sx + 3, sx + 5]) for (let y = H - 8; y < H - 4; y++) p.set(fx, y, y === H - 8 ? '#8a7a5a' : '#c89a5a')
    b.lights.push({ x: sx + 2, y: H - 3, w: 5, h: 2, kind: 'lamp', on: 0, ph: 7 })
    for (let y = sy - 6; y < sy - 2; y++) p.set(sx + shedW - 3, y, '#4a4a58')
    b.smoke.push([sx + shedW - 3, sy - 7])
    b.smoke.push([sx + 1, sy - 2])
  } else {
    // a heap of old planks where the shed will go
    for (let k = 0; k < 4; k++) p.rect(m + k, H - 2 - k, shedW - k * 2, 1, k % 2 ? '#7a5a3e' : '#9a7a5a')
  }
  // Badstua: a little sauna hut with a stovepipe, a towel on the rail and a bench
  if (has('badstue')) {
    const sx = x0 + hw + 1
    const sh = 11
    const sy = H - sh
    planks(p, sx, saunaW, sy, H, '#9a6a42', r, 'batten')
    for (let x = sx - 1; x < sx + saunaW + 1; x++) {
      const y = sy - 1 - Math.round(((sx + saunaW - x) / saunaW) * 2)
      p.set(x, y, '#5a7a3a')
      p.set(x, y + 1, '#3a3a48')
    }
    p.rect(sx + 5, H - 8, 4, 7, '#4a2e22')
    p.rect(sx + 1, H - 9, 3, 3, GLASS)
    b.lights.push({ x: sx + 1, y: H - 9, w: 3, h: 3, kind: 'pane', on: 0.1, ph: 8 })
    p.rect(sx + 1, H - 5, 3, 2, '#f4f4f0')
    p.set(sx + 1, H - 4, '#d8433a')
    for (let y = sy - 6; y < sy - 1; y++) p.set(sx + 2, y, '#4a4a58')
    b.smoke.push([sx + 2, sy - 7])
  }
  return { ...b, tarn, door: dx }
}

/** Aslak's naust: a tarred boathouse on poles, its big doors ajar, glass floats on the wall */
function naust(w: number, r: () => number): Built {
  const m = 3
  const gable = Math.round(w * 0.5)
  const apex = 2
  const top = apex + gable
  const wallH = 14
  const legs = 0
  const H = top + wallH + legs
  const p = new Pix(w + m * 2, H)
  const b = built(p)
  const x0 = m
  const cx = x0 + w / 2
  const tar = '#3a2a24'
  const yLine = (x: number) => apex - 1 + Math.abs(x + 0.5 - cx) * (gable / (w / 2))
  planks(p, x0, w, apex, H, tar, r, 'batten', (x, y) => y >= top || y + 0.5 >= yLine(x))
  for (let x = x0; x < x0 + w; x++) p.set(x, H - 1, '#1e1612')
  gableRoof(p, x0, w, apex, gable, '#2e2e38', null, 2)
  // moss on the roof
  for (let x = x0 - 2; x < x0 + w + 2; x++) if (r() < 0.35) p.set(x, Math.round(yLine(x)) - 1, r() < 0.5 ? '#5a7a3a' : '#6a8a42')
  // the boat doors, one standing open on the dark inside
  const dw = w - 6
  const dx = x0 + 3
  const dy = H - 11
  p.rect(dx, dy, dw, 10, '#14100e')
  p.rect(dx, dy, Math.floor(dw / 2), 10, '#5a3e2e')
  for (let y = dy; y < dy + 10; y += 3) p.rect(dx, y, Math.floor(dw / 2), 1, '#4a3226')
  line(p, dx, dy + 9, dx + Math.floor(dw / 2) - 1, dy, '#6a4a36')
  // a stem of an old færing just inside, and a lit window high in the gable
  p.rect(dx + dw - 3, dy + 4, 1, 5, '#8a5a3a')
  p.rect(Math.round(cx) - 1, top - 4, 2, 2, GLASS)
  b.lights.push({ x: Math.round(cx) - 1, y: top - 4, w: 2, h: 2, kind: 'pane', on: 0.12, ph: 11 })
  // green glass floats in net bags on the corners
  for (const [gx, gy] of [[x0 - 1, top + 2], [x0 + w - 1, top + 4], [x0 - 1, top + 6]] as [number, number][]) {
    p.rect(gx, gy, 2, 2, '#3a9a7a')
    p.set(gx, gy, '#9ae8c8')
    p.set(gx + 1, gy + 1, '#1e5a4a')
    p.set(gx, gy - 1, '#c8a878')
  }
  // a stovepipe
  const sx = Math.round(x0 + w * 0.72)
  for (let y = Math.round(yLine(sx)) - 4; y < Math.round(yLine(sx)); y++) p.set(sx, y, '#4a4a58')
  b.smoke.push([sx, Math.round(yLine(sx)) - 5])
  return b
}

/** Where everything stands on Vardø's quay, from the left; the slip takes what is left on the right */
function vaLayout(W: number) {
  const kx = 2
  const kw = Math.max(46, Math.min(52, Math.round(W * 0.24)))
  const flagX = kx + kw + 2
  const hx = kx + kw + 6
  const hw = W < 195 ? 17 : 18
  const sx = hx + hw + 8
  const quayEnd = sx + 53
  const nx = quayEnd + 2
  const nw = 16
  const slipX = nx + nw + 9
  return { kx, kw, flagX, hx, hw, sx, quayEnd, nx, nw, slipX }
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
  private vignette: HTMLCanvasElement | null = null
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
  private lhPos = { x: 0, y: 0 }
  private ending = false
  private boat: HTMLCanvasElement | null = null
  private paint = ''
  private cats = catSprites()
  private gulls = gullSprites()
  private eagles = eagleSprites()
  private otter = otterSprite()
  private turtle = turtleSprite()
  private puffs: Puff[] = []
  private bugs: { x: number; y: number; ph: number }[] = []
  private motes: { x: number; y: number; ph: number }[] = []
  private rings: { x: number; y: number; age: number; size: number }[] = []
  private fish: { x: number; y: number; age: number; dir: number; arc: number } | null = null
  private nextFish = 5
  private nextSpray = 2
  private smokeT = 0
  private bd = new Backdrop()
  private ak = false
  private hi = false
  private lo = false
  private flag2At: [number, number] | null = null
  private plane: { x: number; y: number } | null = null
  private otters: { x: number; ph: number; dir: number }[] = []
  private festival = false
  private va = false
  private quayW = 0
  /** the boat at her mooring: where she lies and which sprite she is */
  private boatX = 0
  private boatKind: BoatSpriteKind = 'faering'
  private kitti = kittiwakeSprites()
  private puffinImgs = puffinSprites()
  private puffins: { x: number; y: number; dir: 1 | -1; t: number }[] = []
  private nextPuffin = 4
  private tarnAt: [number, number] | null = null
  private shedGlow: [number, number] | null = null
  private rain = new Rain()
  private r = rng(77)

  constructor(private host: { s: Save }) {}

  resize(W: number, H: number) {
    if (W === this.W && H === this.H) return
    this.W = W
    this.H = H
    this.deckY = Math.round(H * 0.54)
    this.wl = this.deckY + 24
    const { deckY, wl } = this
    this.bd.resize(W, wl)
    this.rain.resize(W, H)
    const r = rng(11)
    this.bugs = Array.from({ length: 16 }, () => ({ x: r() * W, y: deckY - 30 + r() * 50, ph: r() * 6 }))
    this.motes = Array.from({ length: 24 }, () => ({ x: r() * W, y: r() * wl, ph: r() * 6 }))
    this.scene = canvas(W, wl)
    this.work = canvas(W, wl)
    this.vignette = makeVignette(W, H)
    this.key = ''
  }

  private rebuild() {
    const s = this.host.s
    const ak = s.world === 'alaska'
    const selma = dev.selma ?? !!(ak ? s.flags.ak_selma : s.world === 'hawaii' ? true : s.flags.selma)
    const ending = s.world === 'norge' && (dev.ending ?? !!s.flags.ending)
    const hi = s.world === 'hawaii'
    const lo = s.world === 'lofoten'
    const festival = (ak && !!s.flags.ak_ending) || (hi && !!s.flags.hi_ending) || (lo && !!s.flags.lo_ending)
    const isVa = isVardo(s)
    const vk = isVa ? this.vaKey() : ''
    const key = `${this.W}x${this.H}:${selma}:${ending}:${s.world}:${festival}:${s.flags.lo_fixed}:${s.hjell}:${vk}`
    if (key === this.key) return
    this.key = key
    this.ending = ending
    this.ak = ak
    this.hi = s.world === 'hawaii'
    this.lo = s.world === 'lofoten'
    this.va = isVa
    if (!isVa) this.puffins = []
    this.bd.resize(this.W, this.wl, ak ? 40 : s.world === 'hawaii' ? 60 : s.world === 'lofoten' ? 70 : isVa ? 80 : 0, 1, s.world)
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
    const quayW = isVa ? vaLayout(W).quayEnd : Math.round(W * 0.8)
    this.quayW = quayW
    this.boatX = Math.round(W * 0.14)
    this.boatKind = ak ? 'troller' : hi ? 'research' : 'faering'
    this.tarnAt = null
    this.shedGlow = null
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
      // the tide here is six metres: a band of barnacles and weed high up the pilings
      if (ak) for (let y = wl - 14; y < wl - 4; y++) for (let k = 0; k < 3; k++) F.set(sx + k, y, y < wl - 11 ? (r() < 0.6 ? '#d8d4c8' : '#a8a498') : r() < 0.5 ? '#4a5a2a' : '#5a3a4a')
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

    const place = (id: SpotId, b: Built, x: number, base = deckY) => {
      const y = base - b.p.h
      blit(F, b.p, x, y)
      for (const l of b.lights) this.lights.push({ ...l, x: l.x + x, y: l.y + y })
      const off = (list: [number, number][]) => list.map(([a, c]) => [a + x, c + y] as [number, number])
      this.smokeAt.push(...off(b.smoke))
      this.blinks.push(...off(b.blink))
      this.vanes.push(...off(b.vane))
      this.blades.push(...off(b.blades))
      this.spots.push({ id, x: x + 3, y: y - 2, w: b.p.w - 6, h: b.p.h + 4 })
    }
    if (ak) {
      this.buildAk(F, place, r, selma, festival, quayW)
      this.front = F.toCanvas()
      return
    }
    if (hi) {
      this.buildHi(F, place, r, festival, quayW)
      this.front = F.toCanvas()
      return
    }
    if (lo) {
      this.buildLo(F, place, r, festival, quayW)
      this.front = F.toCanvas()
      return
    }
    if (isVa) {
      this.buildVa(F, place, r)
      return
    }
    this.plane = null
    this.flag2At = null
    this.otters = []
    this.festival = false
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

  /** Petersburg: Bakke Fisk, the harbour office, Selma's cabin and the mail plane */
  private buildAk(F: Pix, place: (id: SpotId, b: Built, x: number) => void, r: () => number, selma: boolean, festival: boolean, quayW: number) {
    const { W, deckY, wl } = this
    const kx = Math.round(W * 0.01) + 3
    const kw = Math.round(W * 0.33)
    place('krambua', bakkeFisk(kw, r), kx - 6)
    const hx = Math.round(W * 0.385) + 3
    const hw = Math.round(W * 0.14)
    place('havnebua', harborOffice(hw, r), hx - 5)
    const sx = Math.round(W * 0.565) + 3
    const sw = Math.round(W * 0.19)
    place('stasjon', aFrame(sw, selma, r), sx - 6)
    // on the quay: fish totes, a crab pot and coiled line
    blit(F, CRATE, kx + 2, deckY - CRATE.h)
    blit(F, CRATE, kx + 9, deckY - CRATE.h)
    blit(F, CRATE, kx + 5, deckY - CRATE.h * 2)
    blit(F, POT, hx + hw - 2, deckY - POT.h)
    blit(F, COIL, sx + sw - 6, deckY - COIL.h)
    const bx = Math.round(W * 0.14)
    this.bollard = [bx + 47, deckY - 4]
    blit(F, BOLLARD, bx + 46, deckY - BOLLARD.h)
    const lad = bx + 53
    for (let y = deckY + 1; y < wl + 1; y++) {
      F.set(lad, y, '#6a4a32')
      F.set(lad + 3, y, '#4a3222')
      if ((y - deckY) % 3 === 0) {
        F.set(lad + 1, y, '#8a6242')
        F.set(lad + 2, y, '#7a5236')
      }
    }
    // a lamp post
    const lp = Math.round(W * 0.37)
    F.rect(lp - 1, deckY - 2, 3, 2, '#2a2438')
    for (let y = deckY - 17; y < deckY - 2; y++) F.set(lp, y, '#2a2438')
    F.rect(lp - 2, deckY - 22, 5, 4, '#2a2438')
    F.rect(lp - 1, deckY - 22, 3, 4, '#e8d8a0')
    this.lights.push({ x: lp - 1, y: deckY - 22, w: 3, h: 4, kind: 'lamp', on: 0.05, ph: lp })
    // two flags at the end of the quay: Norway and the United States, like all over town
    const fx = quayW - 3
    for (let y = deckY - 36; y < deckY; y++) {
      F.set(fx, y, '#f4ecdc')
      F.set(fx + 1, y, '#b8b0a4')
    }
    F.rect(fx, deckY - 38, 2, 2, '#ffd84a')
    this.flagAt = [fx + 2, deckY - 35]
    this.flag2At = [fx + 2, deckY - 25]
    // bunting for the Little Norway festival once the salmon are home
    this.festival = festival
    if (festival) {
      const cols = ['#d82a3a', '#f4f4f0', '#1a3a8a']
      for (let x = 4; x < quayW - 4; x++) {
        const y = Math.round(deckY - 44 + Math.sin(((x % 40) / 40) * Math.PI) * 6)
        F.set(x, y, '#3a3448')
        if (x % 4 === 0) {
          const c = cols[(x / 4) % 3]
          F.set(x, y + 1, c)
          F.set(x + 1, y + 1, c)
          F.set(x, y + 2, c)
        }
      }
    }
    // the floatplane at its float on the right
    const pl = floatplane()
    const px = W - pl.w - 1
    const py = wl - pl.h + 2
    // a short float dock to tie up to
    for (let x = px - 8; x < W; x++) {
      F.set(x, wl - 1, '#8a6a4a')
      F.set(x, wl, '#5a4230')
    }
    blit(F, pl, px, py)
    this.plane = { x: px, y: py }
    this.rockSpan = [px + 3, px + 38]
    this.lhPos = { x: 0, y: 0 }
    this.spots.push({ id: 'fyret', x: px - 2, y: py - 4, w: pl.w + 4, h: pl.h + 6 })
    this.spots.push({ id: 'baten', x: Math.round(W * 0.12), y: wl - 16, w: 56, h: 26 })
    const rr = rng(4)
    this.otters = Array.from({ length: 2 }, (_, i) => ({ x: W * (0.3 + i * 0.32) + rr() * 10, ph: rr() * 6, dir: i % 2 ? 1 : -1 }))
  }

  /** Henningsvær: the fish receiving station, Johan's yellow rorbu, the family's red rorbu, the drying rack and Hurtigruten */
  private buildLo(F: Pix, place: (id: SpotId, b: Built, x: number) => void, r: () => number, festival: boolean, quayW: number) {
    const { W, deckY, wl } = this
    const s = this.host.s
    const kx = Math.round(W * 0.02) + 3
    const kw = Math.round(W * 0.3)
    place('krambua', mottak(kw, r), kx - 6)
    const hx = Math.round(W * 0.37) + 3
    const hw = Math.round(W * 0.15)
    place('havnebua', rorbu(hw, '#e8b83a', r), hx - 6)
    const sx = Math.round(W * 0.58) + 3
    const sw = Math.round(W * 0.15)
    place('stasjon', rorbu(sw, '#a8343a', r, !s.flags.lo_fixed), sx - 6)
    // the family drying rack behind the quay, filling up with skrei
    const rack = hjell(Math.round(W * 0.08) + 2, s.hjell)
    blit(F, rack, sx + sw + 2, deckY - rack.h)
    // fish boxes stacked on the quay, with snow on them
    for (const [x, y] of [[kx + 2, 0], [kx + 9, 0], [kx + 5, 1]] as [number, number][]) {
      F.rect(x, deckY - 4 - y * 4, 7, 4, '#3a6ac8')
      F.rect(x, deckY - 4 - y * 4, 7, 1, '#f4f8fc')
    }
    const bx = Math.round(W * 0.14)
    this.bollard = [bx + 47, deckY - 4]
    blit(F, BOLLARD, bx + 46, deckY - BOLLARD.h)
    const lad = bx + 53
    for (let y = deckY + 1; y < wl + 1; y++) {
      F.set(lad, y, '#6a4a32')
      F.set(lad + 3, y, '#4a3222')
      if ((y - deckY) % 3 === 0) {
        F.set(lad + 1, y, '#8a6242')
        F.set(lad + 2, y, '#7a5236')
      }
    }
    // snow along the quay
    for (let x = 0; x < quayW; x++) if (r() < 0.8) F.set(x, deckY, '#eef4fa')
    const fx = quayW - 3
    for (let y = deckY - 36; y < deckY; y++) {
      F.set(fx, y, '#f4ecdc')
      F.set(fx + 1, y, '#b8b0a4')
    }
    F.rect(fx, deckY - 38, 2, 2, '#ffd84a')
    this.flagAt = [fx + 2, deckY - 35]
    this.flag2At = null
    this.festival = festival
    if (festival) {
      // lanterns strung along the quay for the last evening
      for (let x = 4; x < quayW - 4; x++) {
        const y = Math.round(deckY - 40 + Math.sin(((x % 36) / 36) * Math.PI) * 5)
        F.set(x, y, '#3a3448')
        if (x % 6 === 0) {
          F.set(x, y + 1, '#ffd36a')
          this.lights.push({ x, y: y + 1, w: 1, h: 1, kind: 'lamp', on: 0, ph: x })
        }
      }
    }
    const ship = hurtigruten()
    const px = W - ship.w + 6
    const py = wl - ship.h + 4
    blit(F, ship, px, py)
    for (let x = px + 12; x < px + 38; x += 2) this.lights.push({ x, y: py + 9, w: 1, h: 1, kind: 'pane', on: 0.1, ph: x })
    this.plane = null
    this.rockSpan = [px + 3, W]
    this.lhPos = { x: 0, y: 0 }
    this.spots.push({ id: 'fyret', x: px, y: py - 2, w: ship.w - 6, h: ship.h })
    this.spots.push({ id: 'baten', x: Math.round(W * 0.12), y: wl - 16, w: 56, h: 26 })
    this.otters = []
  }

  /** Hilo: Leilani's fish stall, Kimo's office, the whale station, palms and the island plane */
  private buildHi(F: Pix, place: (id: SpotId, b: Built, x: number) => void, r: () => number, festival: boolean, quayW: number) {
    const { W, deckY, wl } = this
    const kx = Math.round(W * 0.02) + 3
    const kw = Math.round(W * 0.3)
    place('krambua', fishStall(kw, r), kx - 6)
    const hx = Math.round(W * 0.37) + 3
    const hw = Math.round(W * 0.17)
    place('havnebua', plantation(hw, r), hx - 6)
    const sx = Math.round(W * 0.585) + 3
    const sw = Math.round(W * 0.15)
    place('stasjon', whaleShack(sw, r), sx - 6)
    // coolers, a surfboard and a net on the quay
    F.rect(kx + 2, deckY - 5, 7, 5, '#f4f4f0')
    F.rect(kx + 2, deckY - 5, 7, 1, '#3a8ac8')
    F.rect(kx + 10, deckY - 4, 6, 4, '#e84a4a')
    F.rect(kx + 10, deckY - 4, 6, 1, '#f4f4f0')
    for (let y = deckY - 16; y < deckY; y++) {
      F.set(hx + hw + 1, y, y < deckY - 13 ? '#f2c24a' : '#f8e8a8')
      F.set(hx + hw + 2, y, '#e8b83a')
    }
    blit(F, COIL, sx + sw - 6, deckY - COIL.h)
    const bx = Math.round(W * 0.14)
    this.bollard = [bx + 47, deckY - 4]
    blit(F, BOLLARD, bx + 46, deckY - BOLLARD.h)
    const lad = bx + 53
    for (let y = deckY + 1; y < wl + 1; y++) {
      F.set(lad, y, '#6a4a32')
      F.set(lad + 3, y, '#4a3222')
      if ((y - deckY) % 3 === 0) {
        F.set(lad + 1, y, '#8a6242')
        F.set(lad + 2, y, '#7a5236')
      }
    }
    // a palm at the end of the quay, and the state flag
    const palm = palmTree(34)
    blit(F, palm, quayW - 26, deckY - palm.h + 1)
    const fx = quayW - 3
    for (let y = deckY - 36; y < deckY; y++) {
      F.set(fx, y, '#f4ecdc')
      F.set(fx + 1, y, '#b8b0a4')
    }
    F.rect(fx, deckY - 38, 2, 2, '#ffd84a')
    this.flagAt = [fx + 2, deckY - 35]
    this.flag2At = null
    this.festival = festival
    if (festival) {
      // flower garlands between the posts for the celebration at the pond
      const cols = ['#ffd84a', '#ff8aa0', '#f4f4f0', '#ff6a3a']
      for (let x = 4; x < quayW - 4; x++) {
        const y = Math.round(deckY - 40 + Math.sin(((x % 36) / 36) * Math.PI) * 5)
        F.set(x, y, x % 2 ? cols[(x >> 1) % 4] : '#3a8a3a')
      }
    }
    const pl = floatplane('#f0f0f4', '#a8b0c0', '#2a8ac8')
    const px = W - pl.w - 1
    const py = wl - pl.h + 2
    for (let x = px - 8; x < W; x++) {
      F.set(x, wl - 1, '#8a6a4a')
      F.set(x, wl, '#5a4230')
    }
    blit(F, pl, px, py)
    this.plane = { x: px, y: py }
    this.rockSpan = [px + 3, px + 38]
    this.lhPos = { x: 0, y: 0 }
    this.spots.push({ id: 'fyret', x: px - 2, y: py - 4, w: pl.w + 4, h: pl.h + 6 })
    this.spots.push({ id: 'baten', x: Math.round(W * 0.12), y: wl - 16, w: 56, h: 26 })
    const rr = rng(6)
    this.otters = Array.from({ length: 2 }, (_, i) => ({ x: W * (0.3 + i * 0.32) + rr() * 10, ph: rr() * 6, dir: i % 2 ? 1 : -1 }))
  }

  /** How far along the boat on Frida's slip is: 1 when you can buy it; a færing for fun once you own them all */
  private slipBoat(): { kind: BoatSpriteKind; built: number } {
    const s = this.host.s
    const va = vaOf(s)
    const tier = (va?.boat ?? 0) + 1
    const next = VA_BOATS[tier]
    if (!va || !next) return { kind: 'faering', built: 0.55 }
    const rank = rankLevel(va)
    const ready = rank >= next.rank && (!next.needs || !!s.flags[next.needs])
    const built = ready ? 1 : Math.max(0.4, Math.min(0.88, 0.4 + (0.48 * rank) / Math.max(1, next.rank)))
    return { kind: boatKindOf(tier), built: Math.round(built * 20) / 20 }
  }

  /** Everything in Vardø that changes how the harbour looks */
  private vaKey() {
    const s = this.host.s
    const va = vaOf(s)
    if (!va) return 'none'
    const slip = this.slipBoat()
    return `${va.rooms.join(',')}|${va.boat}|${slip.kind}${slip.built}|${va.smoke.load.length > 0}|${s.paint}`
  }

  /** Vardø: Pomorbrygga, Havnekontoret, Signes hus, Aslak's naust and Frida's slip */
  private buildVa(F: Pix, place: (id: SpotId, b: Built, x: number, base?: number) => void, r: () => number) {
    const { W, deckY, wl } = this
    const s = this.host.s
    const va = vaOf(s)
    const rooms: string[] = va?.rooms ?? []
    const L = vaLayout(W)
    this.plane = null
    this.flag2At = null
    this.otters = []
    this.festival = false
    this.lhPos = { x: 0, y: 0 }

    place('krambua', pomorbrygga(L.kw, r), L.kx - 6)
    place('havnebua', havnekontoret(L.hw, r), L.hx - 5)
    const smoking = !!va && va.smoke.load.length > 0
    const sh = signesHus(rooms, r)
    if (!smoking && rooms.includes('royeri')) {
      // the smokehouse only smokes while there is fish in it
      sh.smoke = sh.smoke.filter(([x]) => x > 3 + 11)
      sh.lights = sh.lights.filter((l) => !(l.kind === 'lamp' && l.on === 0))
    }
    const sy = deckY - sh.p.h
    place('stasjon', sh, L.sx - 3)
    if (sh.tarn) this.tarnAt = [sh.tarn[0] + L.sx - 3, sh.tarn[1] + sy]
    if (smoking) this.shedGlow = [L.sx + 4, deckY - 2]

    // fish boxes stacked outside Pomorbrygga and a pallet of crab pots by the office
    for (const [x, y, c] of [[L.kx + 15, 0, '#3a6ac8'], [L.kx + 22, 0, '#e8742a'], [L.kx + 18, 1, '#3a6ac8']] as [number, number, string][]) {
      F.rect(x, deckY - 4 - y * 4, 7, 4, c)
      F.rect(x, deckY - 4 - y * 4, 7, 1, shade(c, 0.3))
      F.rect(x, deckY - 1 - y * 4, 7, 1, shade(c, -0.3))
    }
    blit(F, POT, L.hx + L.hw - 9, deckY - POT.h)
    // the flagpole between the wharf and the office
    const fx = L.flagX
    for (let y = deckY - 32; y < deckY; y++) {
      F.set(fx, y, '#f4ecdc')
      F.set(fx + 1, y, '#b8b0a4')
    }
    F.rect(fx, deckY - 34, 2, 2, '#ffd84a')
    this.flagAt = [fx + 2, deckY - 31]

    // the boat: at the quay, or at home by her own jetty once there is one
    const tier = va?.boat ?? 0
    this.boatKind = boatKindOf(tier)
    const geo = BOAT_GEO[this.boatKind]
    const home = rooms.includes('brygge')
    if (home) {
      this.boatX = L.quayEnd - 2 - geo.w
      // a floating jetty along the quay below the house, with a gangway down from the deck
      const j0 = L.sx + 6
      const j1 = L.quayEnd + 1
      for (let x = j0; x < j1; x++) {
        F.set(x, wl - 3, '#b07c4e')
        F.set(x, wl - 2, '#7a5236')
        F.set(x, wl - 1, x % 6 < 4 ? '#3e3e4a' : '#5e3e28')
      }
      for (let i = 0; i <= 10; i++) {
        const x = Math.round(j0 + 2 + i)
        const y = Math.round(deckY + 1 + i * ((wl - deckY - 4) / 10))
        F.set(x, y, '#8a6242')
        F.set(x, y - 3, '#4a3222')
      }
      this.bollard = [L.quayEnd - 4, wl - 4]
      F.rect(L.quayEnd - 5, wl - 4, 3, 1, '#3a3448')
    } else {
      this.boatX = Math.round(W * 0.06)
      const bx = Math.min(L.quayEnd - 6, this.boatX + geo.bow.x + 2)
      this.bollard = [bx + 1, deckY - 4]
      blit(F, BOLLARD, bx, deckY - BOLLARD.h)
      const lad = bx + 6
      if (lad + 3 < L.quayEnd)
        for (let y = deckY + 1; y < wl + 1; y++) {
          F.set(lad, y, '#6a4a32')
          F.set(lad + 3, y, '#4a3222')
          if ((y - deckY) % 3 === 0) {
            F.set(lad + 1, y, '#8a6242')
            F.set(lad + 2, y, '#7a5236')
          }
        }
    }
    const top = wl - geo.wl
    this.spots.push({ id: 'baten', x: this.boatX, y: Math.max(deckY + 3, top + 4), w: geo.w, h: wl + 10 - Math.max(deckY + 3, top + 4) })

    // Aslak's naust on its poles at the water, and his nets drying on a rack beside it
    const nb = naust(L.nw, r)
    const nBase = deckY + 7
    for (const px of [L.nx + 1, L.nx + 7, L.nx + L.nw - 2]) {
      for (let y = nBase; y < wl; y++) {
        F.set(px, y, '#4a3426')
        F.set(px + 1, y, '#2e2018')
      }
      for (let y = wl - 3; y < wl; y++) F.set(px, y, '#3a4a2a')
      this.stilts.push(px)
    }
    for (let x = L.nx - 2; x < L.nx + L.nw + 2; x++) {
      F.set(x, nBase, '#6a4a32')
      F.set(x, nBase + 1, '#3e2a1e')
    }
    place('naust', nb, L.nx - 3, nBase)
    const ladX = L.nx + L.nw - 5
    for (let y = nBase + 2; y < wl; y += 2) F.rect(ladX, y, 3, 1, '#6a4a32')
    const rx0 = L.nx + L.nw + 1
    const rx1 = rx0 + 6
    const rackTop = deckY - 10
    for (const px of [rx0, rx1]) for (let y = rackTop; y < wl; y++) F.set(px, y, y < nBase ? '#6a4a32' : '#4a3426')
    for (let x = rx0; x <= rx1; x++) F.set(x, rackTop, '#7a5a3e')
    // the net hangs in folds from the bar, cork floats along the top
    for (let x = rx0 + 1; x < rx1; x++) {
      const len = 12 + Math.round(Math.sin(x * 1.7) * 2)
      for (let y = rackTop + 1; y < rackTop + 1 + len; y++) if ((x + y) % 2 === 0) F.set(x, y, y > rackTop + len - 2 ? '#8a6a4a' : '#c8a070')
      if (x % 2) F.set(x, rackTop + 1, '#e8742a')
    }
    this.stilts.push(rx0 - 1, rx1 - 1)
    // the drying rack belongs to the naust too
    const ns = this.spots.find((p) => p.id === 'naust')
    if (ns) ns.w += 7

    // shore rocks below the slip, where the swell breaks
    const rk = rockIsle(18, 7, r)
    blit(F, rk.p, W - 16, wl - 5)
    this.rockSpan = [W - 14, W]
    this.front = F.toCanvas()

    // Slippen: rails down into the water, the next boat on its cradle, a gantry with a chain hoist
    const g = this.front.getContext('2d')!
    const sx0 = L.slipX
    const yr = (x: number) => deckY + 3 + ((x - sx0) * (wl + 2 - deckY - 3)) / Math.max(1, W - sx0)
    const sb = this.slipBoat()
    const sGeo = BOAT_GEO[sb.kind]
    const paint = PAINTS.find((x) => x.id === s.paint) ?? PAINTS[0] ?? { hull: '#f4ecdc', stripe: '#2a5a8a' }
    const img = boatSprite(paint.hull, paint.stripe, sb.kind, sb.built)
    // the hull's underside per column (flipped, bow up the slip), so she rests on the rails where they come closest
    const data = img.getContext('2d')!.getImageData(0, 0, img.width, img.height).data
    const under: number[] = []
    for (let x = 0; x < img.width; x++) {
      let low = -1
      for (let y = 0; y < img.height; y++) if (data[(y * img.width + (img.width - 1 - x)) * 4 + 3] > 0) low = y
      under.push(low)
    }
    const bx = sx0 + 3
    let by = 1e9
    under.forEach((low, x) => {
      if (low >= 0 && bx + x < W) by = Math.min(by, Math.round(yr(bx + x)) - 3 - low)
    })
    // the slipway: a timber ramp with steel rails, on a few posts down into the water
    for (let x = sx0 - 2; x < W; x++) {
      const y = Math.round(yr(x))
      g.fillStyle = '#9a9aa6'
      g.fillRect(x, y, 1, 1)
      g.fillStyle = '#6a4a32'
      g.fillRect(x, y + 1, 1, 1)
      g.fillStyle = '#4a3222'
      g.fillRect(x, y + 2, 1, 1)
      if ((x - sx0) % 11 === 4) {
        g.fillStyle = '#3e2a1e'
        g.fillRect(x, y + 3, 2, Math.max(0, wl - y - 3))
      }
    }
    // the cradle: a beam under the keel on blocks down to the rails
    g.fillStyle = '#5a3e2a'
    under.forEach((low, x) => {
      const X = bx + x
      if (low < 0 || X >= W || x % 7 !== 3) return
      const y0 = by + low + 1
      g.fillRect(X, y0, 2, Math.max(1, Math.round(yr(X)) - y0))
    })
    g.fillStyle = '#7a5a3e'
    under.forEach((low, x) => {
      if (low >= 0 && bx + x < W) g.fillRect(bx + x, by + low + 1, 1, 1)
    })
    const keel = Math.max(...under)
    // the boat on the cradle, bow up the slip
    g.save()
    g.translate(bx + img.width, by)
    g.scale(-1, 1)
    g.drawImage(img, 0, 0)
    g.restore()
    // the gantry over the slip
    const beam = deckY - 50
    g.fillStyle = '#5a3e2a'
    for (const lx of [sx0, W - 3]) g.fillRect(lx, beam, 2, Math.round(yr(lx)) - beam)
    g.fillStyle = '#3e2a1e'
    for (const lx of [sx0 + 1, W - 2]) g.fillRect(lx, beam, 1, Math.round(yr(lx)) - beam)
    g.fillStyle = '#7a5a3e'
    g.fillRect(sx0 - 1, beam, W - sx0, 2)
    g.fillStyle = '#9a7a5a'
    g.fillRect(sx0 - 1, beam, W - sx0, 1)
    // a chain hoist on a trolley, hanging just above the boat
    const hx = Math.round((sx0 + Math.min(W, bx + sGeo.w)) / 2)
    g.fillStyle = '#3a3a48'
    g.fillRect(hx - 2, beam + 2, 5, 2)
    g.fillStyle = '#8a8a96'
    const hookY = Math.max(beam + 6, by - 3)
    for (let y = beam + 4; y < hookY; y += 2) g.fillRect(hx, y, 1, 1)
    g.fillStyle = '#c8a840'
    g.fillRect(hx - 1, hookY, 3, 2)
    // the winch at the top of the slip, its wire running down to the cradle
    g.fillStyle = '#3a3a48'
    g.fillRect(sx0 - 6, deckY - 4, 5, 4)
    g.fillStyle = '#8a8a96'
    g.fillRect(sx0 - 5, deckY - 3, 3, 2)
    g.fillStyle = 'rgba(200,200,210,0.8)'
    for (let x = sx0 - 2; x < bx + 3; x++) g.fillRect(x, Math.round(deckY - 2 + ((x - sx0 + 2) * (by + keel - deckY + 2)) / Math.max(1, bx + 3 - sx0 + 2)), 1, 1)
    this.spots.push({ id: 'fyret', x: sx0 - 2, y: beam - 2, w: W - sx0 + 2, h: wl - beam + 4 })
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
      this.nextFish = this.festival ? 0.8 + r() * 2 : 5 + r() * 9
      let x = 6 + r() * (W - 12)
      if (x > this.boatX - 4 && x < this.boatX + BOAT_GEO[this.boatKind].w + 4) x = (x + W * 0.5) % W
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

    // puffins whirring low over the water, out to Hornøya and back
    if (this.va) {
      this.nextPuffin -= dt
      if (this.nextPuffin <= 0 && this.H - wl > 12) {
        this.nextPuffin = 6 + r() * 12
        const dir = r() < 0.5 ? 1 : -1
        const n = r() < 0.4 ? 2 : 1
        for (let i = 0; i < n; i++) this.puffins.push({ x: dir === 1 ? -10 - i * 9 : W + 10 + i * 9, y: wl + 3 + r() * Math.min(18, this.H - wl - 8), dir, t: r() * 3 })
      }
      for (const p of this.puffins) {
        p.t += dt
        p.x += p.dir * 46 * dt
      }
      this.puffins = this.puffins.filter((p) => p.x > -30 && p.x < W + 30)
    }
    this.bd.update(dt)
    const wx = weatherAt(this.host.s.day, this.host.s.time)
    const quayW = this.quayW || Math.round(W * 0.8)
    this.rain.update(dt, wx.rain, (x, k) => (k < 0.25 && x < quayW ? this.deckY : wl + 1 + k * (this.H - wl - 1)))
  }

  draw(g: CanvasRenderingContext2D) {
    this.rebuild()
    const s = this.host.s
    const { W, H, wl, deckY } = this
    const time = s.time
    const wind = 0.6 + 0.4 * Math.sin(this.t * 0.1)

    // ---------- sky and hills ----------
    const sg = this.scene.g
    sg.clearRect(0, 0, W, wl)
    const wx = weatherAt(s.day, time)
    if (this.va) this.bd.aurora = auroraStrength(s.day ?? 0, time)
    const sky = this.bd.draw(sg, this.t, time, wx)
    const { night, gold, sun } = sky

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
        wg.fillStyle = shade(this.hi ? HAWAIIFLAG(x, y) : FLAG(x, y), lightness)
        wg.fillRect(fx + x, fy + y + dy, 1, 1)
      }
    }
    if (this.flag2At) {
      const [ux, uy] = this.flag2At
      if (this.ak)
        for (let x = 0; x < 11; x++) {
          const ph = this.t * 4 * wind - x * 0.7 + 1.3
          const dy = Math.round(Math.sin(ph) * (x / 10) * 1.6 * wind)
          const lightness = Math.cos(ph) * 0.14 * (x / 10)
          for (let y = 0; y < 7; y++) {
            wg.fillStyle = shade(USFLAG(x, y), lightness)
            wg.fillRect(ux + x, uy + y + dy, 1, 1)
          }
        }
    }
    // the plane's propeller turns lazily in the wind
    if (this.plane) {
      const k = Math.floor(this.t * 1.5) % 3
      wg.fillStyle = '#8a8a96'
      wg.fillRect(this.plane.x + 40, this.plane.y + 5, 1, 9)
      wg.fillStyle = '#c8ccd8'
      wg.fillRect(this.plane.x + 40, this.plane.y + 5 + k * 3, 1, 3)
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
    // gulls at home, eagles circling over Petersburg
    if ((this.ak || this.lo) && night < 0.7)
      for (let i = 0; i < 2; i++) {
        const a = this.t * (0.12 + i * 0.05) + i * 2.5
        const x = W * (0.3 + i * 0.35) + Math.cos(a) * W * 0.22
        const y = wl * (0.22 + i * 0.08) + Math.sin(a) * wl * 0.06
        wg.drawImage(this.eagles[Math.sin(this.t * 1.5 + i) > 0.7 ? 1 : 0], Math.round(x), Math.round(y))
      }
    else if (this.va && night < 0.65)
      // kittiwakes wheeling over the harbour on their way to and from the bird cliffs
      for (let i = 0; i < 5; i++) {
        const span = W + 40
        const x = ((((i * 61 + this.t * (5 + i * 1.7) * (i % 2 ? 1 : -1)) % span) + span) % span) - 20
        const y = Math.round(wl * (0.18 + i * 0.07) + Math.sin(this.t * (0.6 + i * 0.1) + i * 2) * 6)
        const f = Math.floor(this.t * (4 + i * 0.4) + i) % 4
        wg.drawImage(this.kitti[f === 3 ? 1 : f], Math.round(x), y)
      }
    else if (night < 0.6)
      for (let i = 0; i < 3; i++) {
        const span = W + 40
        const x = ((((i * 97 + this.t * (6 + i * 2)) % span) + span) % span) - 20
        const y = Math.round(wl * (0.25 + i * 0.1) + Math.sin(this.t * 0.8 + i * 2) * 4)
        wg.drawImage(this.gulls[Math.floor(this.t * 4 + i) % 2], Math.round(x), y)
      }

    // Måken at her mooring
    const geo = BOAT_GEO[this.boatKind]
    if (this.paint !== `${s.paint}|${this.boatKind}` || !this.boat) {
      const p = PAINTS.find((x) => x.id === s.paint) ?? PAINTS[0]
      this.boat = boatSprite(p.hull, p.stripe, this.boatKind)
      this.paint = `${s.paint}|${this.boatKind}`
    }
    const bob = Math.round(Math.sin(this.t * 1.3))
    const bx = this.boatX
    const by = wl - geo.wl + bob
    wg.drawImage(this.boat, bx, by)
    if (s.flags.cat) wg.drawImage(this.cats[this.t % 5 < 0.15 ? 1 : 0], bx + geo.cat.x, by + geo.cat.y)
    // mooring rope, sagging between the bow and the bollard
    wg.fillStyle = '#c8a878'
    const [ox, oy] = this.bollard
    const rx0 = bx + geo.bow.x
    const ry0 = by + geo.bow.y
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
    tintAmbient(wg, time, W, wl)
    if (wx.rain > 0) {
      wg.globalCompositeOperation = 'source-atop'
      wg.fillStyle = rgba('#2a3048', wx.rain * 0.3)
      wg.fillRect(0, 0, W, wl)
      wg.globalCompositeOperation = 'source-over'
    }
    sg.drawImage(this.work.c, 0, 0)
    this.bd.fogOver(sg, sky, wx.fog)

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
    // the glass loft glows green on aurora nights, warm on the others; the smokehouse glows while it works
    if (this.tarnAt && night > 0.25) {
      const [tx, ty] = this.tarnAt
      light(sg, tx, ty, 12, this.bd.aurora > 0 ? '#6affc0' : '#ffb060', (night - 0.25) * 0.5 * (0.85 + 0.15 * Math.sin(this.t * 0.7)))
    }
    if (this.shedGlow) {
      const [gx, gy] = this.shedGlow
      light(sg, gx, gy - 4, 7, '#ff8a3a', 0.25 + night * 0.35 + 0.08 * Math.sin(this.t * 5))
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
    drawReflection(g, this.scene.c, this.t, sky, wl, H - wl)
    const hi = rippleColour(sky)
    drawRipples(g, this.t, sky, W, wl, depth)
    drawGlitter(g, this.t, sky, wl, depth)
    g.globalCompositeOperation = 'lighter'
    // foam where the water meets posts, rock and boat
    g.fillStyle = rgba(hi, 0.5)
    for (const sx of this.stilts) {
      const w = Math.round(Math.sin(this.t * 2 + sx) * 1)
      g.fillRect(sx - 1 + w, wl, 1, 1)
      g.fillRect(sx + 3 - w, wl, 1, 1)
    }
    for (let x = bx + geo.foam[0]; x < bx + geo.foam[1]; x++) if (Math.sin(x * 0.9 + this.t * 3) > 0.4) g.fillRect(x, wl + 1, 1, 1)
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
    if (sub > 0 && sub < geo.h) {
      g.globalAlpha = 0.22
      g.drawImage(this.boat, 0, sub, geo.w, geo.h - sub, bx, wl, geo.w, geo.h - sub)
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
    // sea otters floating about on their backs
    if (this.ak || this.hi)
      this.otters.forEach((o, i) => {
        const span = W + 20
        const x = ((((o.x + this.t * 0.8 * o.dir) % span) + span) % span) - 10
        const y = wl + 5 + i * 9 + Math.round(Math.sin(this.t * 1.2 + o.ph))
        if (y + 5 > H) return
        g.drawImage(this.hi ? this.turtle : this.otter, Math.round(x), y)
        g.fillStyle = rgba(hi, 0.4)
        g.fillRect(Math.round(x) - 1, y + 4, 12, 1)
      })
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
    for (const p of this.puffins) {
      const img = this.puffinImgs[Math.floor(p.t * 14) % 2]
      const y = Math.round(p.y + Math.sin(p.t * 3) * 1.5)
      if (p.dir === 1) g.drawImage(img, Math.round(p.x), y)
      else {
        g.save()
        g.translate(Math.round(p.x) + img.width, y)
        g.scale(-1, 1)
        g.drawImage(img, 0, 0)
        g.restore()
      }
      // its shadow skimming the surface
      g.fillStyle = rgba('#0a1430', 0.25)
      g.fillRect(Math.round(p.x) + 1, y + 7, 5, 1)
    }
    for (const p of this.puffs) {
      if (p.kind !== 'drop') continue
      g.fillStyle = rgba('#ffffff', 0.85 * (1 - p.age / p.life))
      g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
    }

    if (this.ending) drawBeam(g, this.lhPos.x, this.lhPos.y, this.t * 0.8, 200, Math.max(0.35, night))
    this.rain.draw(g, wx.rain, night)
    if (this.vignette && L.vignette > 0) {
      g.globalAlpha = L.vignette
      g.drawImage(this.vignette, 0, 0)
      g.globalAlpha = 1
    }
  }

  hit(x: number, y: number): SpotId | null {
    // the lighthouse and the boat first, the houses overlap less
    for (const id of ['fyret', 'baten', 'naust', 'havnebua', 'stasjon', 'krambua'] as SpotId[]) {
      const s = this.spots.find((p) => p.id === id)
      if (s && x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return id
    }
    return null
  }
}
