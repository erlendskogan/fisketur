// Sky, fjord, lighthouse and the underwater cross-section

import { Pix, canvas, mix, shade, rng, rgba } from './pixel'
import { ZONES, ZONE_H, WORLD_BOTTOM } from '../game/data'

// ---------- time of day ----------

const SKY: [number, string, string][] = [
  [0.0, '#141642', '#2e2a66'],
  [0.17, '#1e2260', '#3a3274'],
  [0.23, '#3a3a86', '#ff9a7a'],
  [0.29, '#4aa4e6', '#c4ecf6'],
  [0.5, '#3496e6', '#a8dcf4'],
  [0.64, '#4e7ad6', '#ffd09a'],
  [0.71, '#5a3a8a', '#ff8a6a'],
  [0.77, '#22205a', '#7a3a7a'],
  [0.83, '#141642', '#2e2a66'],
  [1.0, '#141642', '#2e2a66'],
]

export function skyAt(t: number): [string, string] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [a, at, ab] = SKY[i]
    const [b, bt, bb] = SKY[i + 1]
    if (t >= a && t <= b) {
      const k = (t - a) / (b - a)
      return [mix(at, bt, k), mix(ab, bb, k)]
    }
  }
  return [SKY[0][1], SKY[0][2]]
}

/** 0 at day, 1 at deep night */
export function nightness(t: number) {
  const s = (a: number, b: number, x: number) => Math.max(0, Math.min(1, (x - a) / (b - a)))
  if (t < 0.5) return 1 - s(0.2, 0.29, t)
  return s(0.7, 0.8, t)
}

export const isNight = (t: number) => nightness(t) > 0.5

/** Vertical gradient drawn in flat bands with a dithered seam, for a pixel-art look */
export function bandGradient(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, bot: string, bands = 10) {
  const bh = h / bands
  for (let i = 0; i < bands; i++) {
    const c = mix(top, bot, i / (bands - 1))
    g.fillStyle = c
    g.fillRect(x, Math.floor(y + i * bh), w, Math.ceil(bh) + 1)
    if (i > 0) {
      g.fillStyle = mix(top, bot, (i - 1) / (bands - 1))
      const yy = Math.floor(y + i * bh)
      for (let xx = 0; xx < w; xx += 2) g.fillRect(x + xx + (Math.floor(yy) % 2), yy, 1, 1)
    }
  }
}

// ---------- background mountains ----------

export function ridge(w: number, seed: number, base: number, amp: number) {
  const r = rng(seed)
  const ph = [r() * 6, r() * 6, r() * 6]
  const out: number[] = []
  for (let x = 0; x < w; x++)
    out.push(Math.round(base + amp * (0.55 * Math.sin(x * 0.021 + ph[0]) + 0.3 * Math.sin(x * 0.057 + ph[1]) + 0.15 * Math.sin(x * 0.13 + ph[2]))))
  return out
}

/** Draws mountains whose foot sits at `foot`, heights from `r` */
export function drawRidge(g: CanvasRenderingContext2D, r: number[], foot: number, col: string, snow?: string) {
  const peak = Math.min(...r)
  for (let x = 0; x < r.length; x++) {
    const top = foot - r[x]
    g.fillStyle = col
    g.fillRect(x, top, 1, r[x] + 1)
    if (snow && r[x] > peak + (Math.max(...r) - peak) * 0.62) {
      g.fillStyle = snow
      g.fillRect(x, top, 1, Math.max(1, Math.round((r[x] - peak) * 0.18)))
    }
    // lit edge on the left slopes
    if (x > 0 && r[x] > r[x - 1]) {
      g.fillStyle = shade(col, 0.12)
      g.fillRect(x, top, 1, 1)
    }
  }
}

// ---------- the lighthouse ----------

export function lighthouseSprite(lit: boolean, scale: 'small' | 'big') {
  const big = scale === 'big'
  const H = big ? 46 : 16
  const bw = big ? 12 : 5
  const tw = big ? 8 : 3
  const W = bw + 10
  const p = new Pix(W, H + (big ? 12 : 5))
  const cx = W / 2
  const roomH = big ? 6 : 2
  const top = big ? 10 : 4
  for (let y = top; y < H + (big ? 12 : 5); y++) {
    const k = (y - top) / (H - top)
    const hw = (tw + (bw - tw) * Math.min(1, k)) / 2
    for (let x = Math.floor(cx - hw); x < Math.ceil(cx + hw); x++) {
      const band = Math.floor((y - top) / (big ? 6 : 3)) % 2 === 0
      let c = band ? '#f4ecdc' : '#d8433a'
      if (x < cx - hw + (big ? 2 : 1)) c = shade(c, -0.18)
      p.set(x, y, c)
    }
  }
  // gallery and lantern room
  p.rect(Math.floor(cx - tw / 2 - 2), top - 1, tw + 4, 1, '#2a1d2e')
  const glass = lit ? '#ffe6a0' : '#3a4a62'
  p.rect(Math.floor(cx - tw / 2), top - 1 - roomH, tw, roomH, glass)
  if (big) {
    p.set(Math.floor(cx), top - 1 - roomH + 1, lit ? '#fff8e0' : '#5a6a84')
    p.set(Math.floor(cx) - 2, top - 1 - roomH + 2, lit ? '#fff8e0' : '#4a5a74')
  }
  // dome
  for (let i = 0; i < (big ? 3 : 1); i++) p.rect(Math.floor(cx - tw / 2) + i, top - 2 - roomH - i, tw - i * 2, 1, '#a52e34')
  p.set(Math.floor(cx), top - 2 - roomH - (big ? 4 : 2), '#2a1d2e')
  if (big) {
    // door and a little window
    p.rect(Math.floor(cx) - 1, H + 7, 3, 5, '#5a3a2a')
    p.rect(Math.floor(cx), top + 12, 2, 2, lit ? '#ffd36a' : '#2a3a52')
  }
  p.outline(0.55, (x, y) => p.get(x, y) === glass)
  return { c: p.toCanvas(), lamp: { x: Math.floor(cx), y: top - 1 - Math.ceil(roomH / 2) } }
}

/** The rotating beam: a soft fan of light from (x,y) */
export function drawBeam(g: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, alpha: number) {
  const spread = 0.07
  const dir = Math.cos(angle)
  // the beam sweeps around: draw it shorter when it points "away"
  const l = len * (0.35 + 0.65 * Math.abs(dir))
  const sx = Math.sign(dir) || 1
  g.save()
  g.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 3; i++) {
    const s = spread * (1 + i * 0.8)
    g.fillStyle = `rgba(255, 236, 170, ${(alpha * 0.18) / (i + 1)})`
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + sx * l, y - l * s - Math.sin(angle) * 6)
    g.lineTo(x + sx * l, y + l * s - Math.sin(angle) * 6)
    g.closePath()
    g.fill()
  }
  g.fillStyle = `rgba(255, 246, 200, ${alpha})`
  g.fillRect(x - 1, y - 1, 3, 3)
  g.restore()
}

// ---------- underwater cross-section ----------

export interface Deco {
  x: number
  y: number
  kind: 'kelp' | 'glowplant' | 'vent'
  len: number
  side: 1 | -1
  seed: number
  color: string
}

export interface Water {
  bg: HTMLCanvasElement
  wallL: number[]
  wallR: number[]
  deco: Deco[]
  /** fixed glowing dots (sea pens, plants), world coords */
  glows: { x: number; y: number; c: string; r: number }[]
}

export const SEABED = WORLD_BOTTOM - 26

export function buildWater(W: number): Water {
  const Hh = WORLD_BOTTOM + 40
  const { c, g } = canvas(W, Hh)
  const r = rng(7)
  // water colour, banded per zone
  ZONES.forEach((z, i) => bandGradient(g, 0, i * ZONE_H, W, ZONE_H, z.water[0], z.water[1], 12))
  g.fillStyle = ZONES[ZONES.length - 1].water[1]
  g.fillRect(0, WORLD_BOTTOM, W, 40)

  // fjord walls
  const wallL: number[] = []
  const wallR: number[] = []
  const wallAt = (y: number, ph: number) => {
    const grow = Math.max(0, Math.min(1, (y - 90) / 420))
    const trench = Math.max(0, Math.min(1, (y - 5 * ZONE_H + 40) / 80))
    const base = grow * W * 0.14 + trench * W * 0.14
    const n = 6 * Math.sin(y * 0.031 + ph) + 4 * Math.sin(y * 0.077 + ph * 2) + 2 * Math.sin(y * 0.19 + ph * 3)
    return Math.max(0, Math.round(base + n * grow))
  }
  for (let y = 0; y < Hh; y++) {
    wallL.push(wallAt(y, 1.3))
    wallR.push(wallAt(y, 4.1))
  }
  const rockAt = (y: number) => {
    const i = Math.max(0, Math.min(ZONES.length - 1, Math.floor(y / ZONE_H)))
    const next = ZONES[Math.min(ZONES.length - 1, i + 1)].rock
    return mix(ZONES[i].rock, next, (y % ZONE_H) / ZONE_H)
  }
  const rock = new Pix(W, Hh)
  for (let y = 0; y < Hh; y++) {
    const base = rockAt(y)
    const paint = (x: number, edge: number) => {
      let col = base
      const d = edge
      if (d === 0) col = shade(base, 0.28)
      else if (d === 1) col = shade(base, 0.1)
      else if (((x * 7 + y * 13) % 23 === 0) || ((x + y * 3) % 31 === 0)) col = shade(base, -0.18)
      else if ((Math.floor(x / 4) + Math.floor(y / 5)) % 7 === 0) col = shade(base, -0.08)
      rock.set(x, y, col)
    }
    for (let x = 0; x < wallL[y]; x++) paint(x, wallL[y] - 1 - x)
    for (let x = 0; x < wallR[y]; x++) paint(W - 1 - x, wallR[y] - 1 - x)
    if (y >= SEABED) {
      const bump = Math.round(3 * Math.sin(y * 0.3) + 2 * Math.sin(y * 0.11))
      void bump
    }
  }
  // seabed
  for (let x = 0; x < W; x++) {
    const top = SEABED + Math.round(3 * Math.sin(x * 0.09) + 2 * Math.sin(x * 0.23 + 1))
    for (let y = top; y < Hh; y++) rock.set(x, y, y === top ? '#4a4a7a' : y < top + 3 ? '#34345a' : '#24203e')
  }
  g.drawImage(rock.toCanvas(), 0, 0)

  const deco: Deco[] = []
  const glows: Water['glows'] = []
  const onWall = (y: number, side: 1 | -1) => (side === 1 ? wallL[Math.round(y)] : W - wallR[Math.round(y)])

  // Grunna: a little seaweed, small rocks
  for (let i = 0; i < 6; i++) {
    const y = 120 + r() * 170
    const side = r() < 0.5 ? 1 : -1
    deco.push({ x: onWall(y, side), y, kind: 'kelp', len: 8 + r() * 10, side, seed: r() * 10, color: '#5aa84a' })
  }
  // Tareskogen: kelp forest
  for (let i = 0; i < 22; i++) {
    const y = ZONE_H + 10 + r() * (ZONE_H - 20)
    const side = r() < 0.5 ? 1 : -1
    deco.push({ x: onWall(y, side), y, kind: 'kelp', len: 22 + r() * 40, side, seed: r() * 10, color: r() < 0.5 ? '#3a8a4a' : '#5a9a3a' })
  }
  // Skumringen: sponges and soft corals baked in
  const blob = (x: number, y: number, col: string, n: number) => {
    for (let k = 0; k < n; k++) {
      const dx = Math.round((r() - 0.5) * 5)
      const dy = Math.round((r() - 0.5) * 4)
      g.fillStyle = k % 3 === 0 ? shade(col, 0.2) : col
      g.fillRect(x + dx, y + dy, 2, 2)
    }
    g.fillStyle = shade(col, -0.4)
    g.fillRect(x, y + 3, 1, 1)
  }
  for (let i = 0; i < 26; i++) {
    const y = 2 * ZONE_H + r() * ZONE_H
    const side = r() < 0.5 ? 1 : -1
    const x = onWall(y, side) + (side === 1 ? 1 : -3)
    blob(x, Math.round(y), ['#ff8a4a', '#f2c24a', '#e85a8a', '#c86ad8'][Math.floor(r() * 4)], 6)
  }
  // Dypet: white cold-water coral and sea pens with faint glow
  for (let i = 0; i < 22; i++) {
    const y = 3 * ZONE_H + r() * ZONE_H
    const side = r() < 0.5 ? 1 : -1
    const x = onWall(y, side)
    g.fillStyle = '#d8d0c8'
    for (let k = 0; k < 5; k++) g.fillRect(x + side * k, Math.round(y) - Math.round(k * 0.6) - (k % 2), 1, 2)
    if (r() < 0.5) glows.push({ x: x + side * 4, y: Math.round(y) - 3, c: '#7ad8ff', r: 1 })
  }
  // Avgrunnen: glowing tube worms
  for (let i = 0; i < 18; i++) {
    const y = 4 * ZONE_H + r() * ZONE_H
    const side = r() < 0.5 ? 1 : -1
    const x = onWall(y, side)
    g.fillStyle = '#4a3a5a'
    for (let k = 0; k < 4; k++) g.fillRect(x + side * k, Math.round(y), 1, 1)
    glows.push({ x: x + side * 4, y: Math.round(y), c: ['#ff6ab8', '#6affff', '#b88aff'][Math.floor(r() * 3)], r: 1 })
  }
  // Grøfta: glowing plants on the seabed and vents
  for (let i = 0; i < 16; i++) {
    const x = 6 + r() * (W - 12)
    deco.push({ x, y: SEABED + 1, kind: 'glowplant', len: 6 + r() * 12, side: 1, seed: r() * 10, color: ['#7affd8', '#9ae8ff', '#d0a8ff'][Math.floor(r() * 3)] })
  }
  deco.push({ x: W * 0.2, y: SEABED, kind: 'vent', len: 10, side: 1, seed: 1, color: '#3a2a3a' })
  deco.push({ x: W * 0.78, y: SEABED, kind: 'vent', len: 14, side: 1, seed: 2, color: '#3a2a3a' })

  return { bg: c, wallL, wallR, deco, glows }
}

/** Swaying seaweed and other animated decorations */
export function drawDeco(g: CanvasRenderingContext2D, d: Deco, camY: number, t: number) {
  const y0 = d.y - camY
  if (d.kind === 'kelp') {
    const n = Math.round(d.len)
    let x = d.x
    let y = y0
    for (let i = 0; i < n; i++) {
      const k = i / n
      const sway = Math.sin(t * 0.9 + d.seed + i * 0.18) * k * 1.2
      x += d.side * (k < 0.25 ? 0.9 : 0.25) + sway * 0.35
      y -= 0.9
      g.fillStyle = i % 4 === 0 ? shade(d.color, 0.18) : d.color
      g.fillRect(Math.round(x), Math.round(y), 2, 1)
      if (i % 6 === 3 && i > 4) {
        g.fillStyle = shade(d.color, 0.08)
        g.fillRect(Math.round(x) + (i % 12 === 3 ? 2 : -2), Math.round(y), 2, 1)
      }
    }
  } else if (d.kind === 'glowplant') {
    const n = Math.round(d.len)
    for (let i = 0; i < n; i++) {
      const sway = Math.round(Math.sin(t * 0.7 + d.seed + i * 0.2) * (i / n) * 2)
      g.fillStyle = i === n - 1 ? d.color : shade(d.color, -0.55)
      g.fillRect(Math.round(d.x) + sway, Math.round(y0 - i), 1, 1)
    }
  } else if (d.kind === 'vent') {
    g.fillStyle = d.color
    for (let i = 0; i < d.len; i++) g.fillRect(Math.round(d.x) - 3 + Math.round(i * 0.15), Math.round(y0 - i), 6 - Math.round(i * 0.3), 1)
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.25 + i / 6 + d.seed) % 1
      g.fillStyle = rgba('#c8b8d8', 0.35 * (1 - ph))
      g.fillRect(Math.round(d.x + Math.sin(ph * 9 + i) * 2), Math.round(y0 - d.len - ph * 40), 2, 2)
    }
  }
}
