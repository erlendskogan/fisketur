// The time of day, the far lighthouse and the underwater cross-section of the fjord

import { Pix, canvas, mix, shade, rng, rgba } from './pixel'
import { ZONES, ZONE_H, WORLD_BOTTOM } from '../game/data'

// ---------- time of day ----------

/** 0 at day, 1 at deep night */
export function nightness(t: number) {
  const s = (a: number, b: number, x: number) => Math.max(0, Math.min(1, (x - a) / (b - a)))
  if (t < 0.5) return 1 - s(0.2, 0.29, t)
  return s(0.7, 0.8, t)
}

export const isNight = (t: number) => nightness(t) > 0.5

/** Vertical gradient drawn in flat bands with a dithered seam, for a pixel-art look */
function bandGradient(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, bot: string, bands = 10) {
  const bh = h / bands
  for (let i = 0; i < bands; i++) {
    const yy = Math.floor(y + i * bh)
    g.fillStyle = mix(top, bot, i / (bands - 1))
    g.fillRect(x, yy, w, Math.ceil(bh) + 1)
    if (i > 0) {
      g.fillStyle = mix(top, bot, (i - 1) / (bands - 1))
      for (let xx = 0; xx < w; xx += 2) g.fillRect(x + xx + (yy % 2), yy, 1, 1)
    }
  }
}

// ---------- the lighthouse far out on its skerry ----------

/** A small lighthouse on a rock, seen from out on the fjord. The waterline is the bottom row. */
export function farLighthouse(lit: boolean) {
  const W = 26
  const H = 32
  const p = new Pix(W, H)
  // the skerry
  const tops: number[] = []
  for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W
    const h = Math.round((5 + 1.6 * Math.sin(x * 0.55 + 1) + Math.sin(x * 1.3)) * Math.pow(Math.sin(Math.PI * u), 0.6))
    tops.push(H - h)
    for (let y = H - h; y < H; y++) {
      const d = y - (H - h)
      let c = d === 0 ? '#8e8ca2' : d === 1 ? '#6c6a84' : (x + y * 2) % 7 === 0 ? '#3a3650' : '#52506a'
      if (d === 0 && x > 6 && x < 19 && (x * 5) % 3 !== 0) c = '#5a7a4a'
      if (x < W * 0.35 && d > 0) c = shade(c, 0.06)
      if (y >= H - 1) c = '#2e2c44'
      p.set(x, y, c)
    }
  }
  const cx = 13
  const base = tops[cx] + 1
  const top = base - 19
  // tower, red and white bands, lit from the left
  for (let y = top; y < base; y++) {
    const k = (y - top) / (base - top)
    const hw = 1.5 + k * 1.3
    const band = Math.floor((y - top) / 4) % 2 === 0
    for (let x = Math.round(cx - hw); x < Math.round(cx + hw) + 1; x++) {
      let c = band ? '#d8433a' : '#f4ecdc'
      if (x === Math.round(cx - hw)) c = shade(c, 0.12)
      else if (x >= Math.round(cx + hw)) c = shade(c, -0.28)
      p.set(x, y, c)
    }
  }
  // the keeper's door and a window
  p.set(cx, base - 1, '#4a2e2a')
  p.set(cx, base - 2, '#4a2e2a')
  p.set(cx, top + 8, lit ? '#ffd36a' : '#2a3a52')
  // gallery, lantern and dome
  p.rect(cx - 3, top - 1, 7, 1, '#2a1d2e')
  p.set(cx - 3, top - 2, '#2a1d2e')
  p.set(cx + 3, top - 2, '#2a1d2e')
  const glass = lit ? '#ffe6a0' : '#3a4a62'
  p.rect(cx - 1, top - 4, 3, 3, glass)
  p.set(cx - 1, top - 4, lit ? '#fff8e0' : '#5a6a84')
  p.rect(cx - 2, top - 5, 5, 1, '#a52e34')
  p.rect(cx - 1, top - 6, 3, 1, '#c8423a')
  p.set(cx, top - 7, '#2a1d2e')
  p.outline(0.5, (x, y) => p.get(x, y) === glass || y >= H - 1)
  return { c: p.toCanvas(), lamp: { x: cx, y: top - 3 } }
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
  kind: 'kelp' | 'grass' | 'glowplant' | 'vent' | 'anemone'
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

/** Smooth value noise in 0..1 */
function vnoise(x: number, y: number, seed: number) {
  const h = (i: number, j: number) => {
    let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 982451653)
    n = Math.imul(n ^ (n >>> 13), 1274126177)
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296
  }
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * sx
  const b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * sx
  return a + (b - a) * sy
}

/**
 * Worley cells on a jittered grid. `light` runs from -1 (lower right of a stone)
 * to 1 (upper left), `edge` is the distance to the border between two stones.
 */
function boulder(x: number, y: number, seed: number) {
  const CW = 14
  const CH = 10
  const cx = Math.floor(x / CW)
  const cy = Math.floor(y / CH)
  let d1 = 1e9
  let d2 = 1e9
  let bx = 0
  let by = 0
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i
      const gy = cy + j
      const px = (gx + 0.05 + 0.9 * vnoise(gx * 7.1, gy * 3.3, seed + 40)) * CW
      const py = (gy + 0.05 + 0.9 * vnoise(gx * 5.7, gy * 9.1, seed + 41)) * CH
      const d = Math.hypot(x - px, (y - py) * 1.25) + vnoise(x * 0.7, y * 0.7, seed + 42) * 2.5
      if (d < d1) {
        d2 = d1
        d1 = d
        bx = px
        by = py
      } else if (d < d2) d2 = d
    }
  const r = Math.max(1, d1)
  return { light: (-(x - bx) / CW - (y - by) / CH) * 1.4 * Math.min(1, r / 3), edge: d2 - d1 }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

const zoneMix = (y: number, pick: (i: number) => string) => {
  const i = Math.max(0, Math.min(ZONES.length - 1, Math.floor(y / ZONE_H)))
  return mix(pick(i), pick(Math.min(ZONES.length - 1, i + 1)), Math.max(0, (y - i * ZONE_H) / ZONE_H))
}

export function buildWater(W: number): Water {
  const Hh = WORLD_BOTTOM + 40
  const { c, g } = canvas(W, Hh)
  const r = rng(7)
  // water colour, banded per zone
  ZONES.forEach((z, i) => bandGradient(g, 0, i * ZONE_H, W, ZONE_H, z.water[0], z.water[1], 14))
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
  const rockAt = (y: number) => zoneMix(y, (i) => ZONES[i].rock)
  const waterAt = (y: number) => zoneMix(y, (i) => ZONES[i].water[0])
  const rock = new Pix(W, Hh)
  for (let y = 0; y < Hh; y++) {
    const base = rockAt(y)
    const rim = mix(shade(base, 0.32), waterAt(y), 0.25)
    const shallow = y < ZONE_H * 1.6
    const paint = (x: number, d: number, wall: number[], side: number) => {
      // d is the distance in from the face of the wall
      let col: string
      // a ledge: the wall above is narrower, so this pixel faces up towards the light
      const above = wall[y - 1] ?? wall[y]
      const ledge = d < wall[y] - above
      if (d === 0) col = rim
      else if (ledge) col = shallow && (x * 3 + y) % 4 !== 0 ? (y < ZONE_H ? '#6a9a4a' : '#4e7a48') : shade(base, 0.2)
      else if (d === 1) col = shade(base, 0.1)
      else {
        // chunky boulders, lit from the upper left, with dark cracks between them
        const b = boulder(x, y, side)
        const n = vnoise(x * 0.5, y * 0.4, side + 9)
        const v = b.light + (n - 0.5) * 0.35 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.3
        col = b.edge < 0.8 ? shade(base, -0.34) : v < -0.35 ? shade(base, -0.24) : v < 0.05 ? shade(base, -0.08) : v < 0.4 ? base : mix(shade(base, 0.16), rim, 0.2)
        // further into the rock is in shadow
        if (d > 14) col = shade(col, -Math.min(0.25, (d - 14) * 0.02))
        if ((x * 7 + y * 13) % 41 === 0) col = shade(base, -0.35)
      }
      rock.set(x, y, col)
    }
    for (let x = 0; x < wallL[y]; x++) paint(x, wallL[y] - 1 - x, wallL, 1)
    for (let x = 0; x < wallR[y]; x++) paint(W - 1 - x, wallR[y] - 1 - x, wallR, 2)
  }
  // seabed: rippled sand with pebbles
  for (let x = 0; x < W; x++) {
    const top = SEABED + Math.round(3 * Math.sin(x * 0.09) + 2 * Math.sin(x * 0.23 + 1))
    for (let y = top; y < Hh; y++) {
      const d = y - top
      let col = d === 0 ? '#5a5684' : d < 3 ? '#3e3a64' : '#2a2648'
      if (d > 2 && (x + Math.round(Math.sin(y * 0.8) * 2)) % 6 === 0) col = '#34305a'
      if (d > 1 && (x * 13 + y * 7) % 29 === 0) col = '#6a6694'
      rock.set(x, y, col)
    }
  }
  g.drawImage(rock.toCanvas(), 0, 0)

  const deco: Deco[] = []
  const glows: Water['glows'] = []
  const onWall = (y: number, side: 1 | -1) => (side === 1 ? wallL[Math.round(y)] : W - wallR[Math.round(y)])
  const px = (x: number, y: number, col: string) => {
    g.fillStyle = col
    g.fillRect(Math.round(x), Math.round(y), 1, 1)
  }

  // Grunna: sea grass, mussels and barnacles, starfish
  for (let i = 0; i < 10; i++) {
    const y = 110 + r() * 190
    const side = r() < 0.5 ? 1 : -1
    deco.push({ x: onWall(y, side), y, kind: 'grass', len: 5 + r() * 6, side, seed: r() * 10, color: r() < 0.5 ? '#6ab84a' : '#4e9a48' })
  }
  for (let i = 0; i < 6; i++) {
    const y = 120 + r() * 170
    const side = r() < 0.5 ? 1 : -1
    deco.push({ x: onWall(y, side), y, kind: 'kelp', len: 8 + r() * 10, side, seed: r() * 10, color: '#5aa84a' })
  }
  for (let i = 0; i < 40; i++) {
    const y = Math.round(100 + r() * (ZONE_H * 1.3))
    const side = r() < 0.5 ? 1 : -1
    const x = onWall(y, side) - (side === 1 ? 1 : 0)
    if (r() < 0.5) {
      // a little cluster of blue mussels
      for (let k = 0; k < 3; k++) px(x - side * (k % 2), y + k, k === 0 ? '#5a6a9a' : '#2a2a4a')
    } else px(x, y, '#e8e4d8')
  }
  const star = (x: number, y: number, col: string) => {
    px(x, y, col)
    px(x - 1, y, col)
    px(x + 1, y, col)
    px(x, y - 1, col)
    px(x - 1, y + 1, col)
    px(x + 1, y + 1, col)
    px(x, y, shade(col, 0.3))
  }
  for (let i = 0; i < 12; i++) {
    const y = Math.round(130 + r() * (ZONE_H * 1.8))
    const side = r() < 0.5 ? 1 : -1
    star(onWall(y, side) - side * 2, y, ['#ff7a3a', '#e84a6a', '#a85ad8', '#ffb43a'][Math.floor(r() * 4)])
  }
  // Tareskogen: kelp forest
  for (let i = 0; i < 24; i++) {
    const y = ZONE_H + 10 + r() * (ZONE_H - 20)
    const side = r() < 0.5 ? 1 : -1
    deco.push({ x: onWall(y, side), y, kind: 'kelp', len: 22 + r() * 40, side, seed: r() * 10, color: r() < 0.5 ? '#3a8a4a' : '#6a9a3a' })
  }
  // Skumringen: sponges, soft corals and anemones
  const blob = (x: number, y: number, col: string, n: number) => {
    for (let k = 0; k < n; k++) {
      const dx = Math.round((r() - 0.5) * 5)
      const dy = Math.round((r() - 0.5) * 4)
      g.fillStyle = k % 3 === 0 ? shade(col, 0.2) : col
      g.fillRect(x + dx, y + dy, 2, 2)
    }
    g.fillStyle = shade(col, 0.45)
    g.fillRect(x, y - 1, 1, 1)
    g.fillStyle = shade(col, -0.4)
    g.fillRect(x, y + 3, 1, 1)
  }
  for (let i = 0; i < 26; i++) {
    const y = 2 * ZONE_H + r() * ZONE_H
    const side = r() < 0.5 ? 1 : -1
    const x = onWall(y, side) + (side === 1 ? 1 : -3)
    blob(x, Math.round(y), ['#ff8a4a', '#f2c24a', '#e85a8a', '#c86ad8'][Math.floor(r() * 4)], 6)
  }
  for (let i = 0; i < 10; i++) {
    const y = 1.7 * ZONE_H + r() * ZONE_H * 1.1
    const side = r() < 0.5 ? 1 : -1
    deco.push({ x: onWall(y, side), y, kind: 'anemone', len: 4 + r() * 3, side, seed: r() * 10, color: ['#ff8ab8', '#ffb46a', '#f4e4f0'][Math.floor(r() * 3)] })
  }
  // Dypet: white cold-water coral and sea pens with faint glow
  for (let i = 0; i < 22; i++) {
    const y = 3 * ZONE_H + r() * ZONE_H
    const side = r() < 0.5 ? 1 : -1
    const x = onWall(y, side)
    for (let k = 0; k < 6; k++) {
      g.fillStyle = k > 3 ? '#f4ece4' : '#d8d0c8'
      g.fillRect(x + side * k, Math.round(y) - Math.round(k * 0.6) - (k % 2), 1, 2)
      if (k === 3) g.fillRect(x + side * k, Math.round(y) - 4, 1, 1)
    }
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
    const dark = shade(d.color, -0.3)
    const lit = shade(d.color, 0.22)
    for (let i = 0; i < n; i++) {
      const k = i / n
      const sway = Math.sin(t * 0.9 + d.seed + i * 0.18) * k * 1.2
      x += d.side * (k < 0.25 ? 0.9 : 0.25) + sway * 0.35
      y -= 0.9
      const col = k < 0.3 ? mix(dark, d.color, k / 0.3) : d.color
      const X = Math.round(x)
      const Y = Math.round(y)
      g.fillStyle = col
      g.fillRect(X, Y, 2, 1)
      g.fillStyle = i % 3 === 0 ? lit : shade(col, 0.08)
      g.fillRect(X + (d.side === 1 ? 0 : 1), Y, 1, 1)
      // blades, longer towards the top, and a gas bladder now and then
      if (i % 3 === 2 && i > 3) {
        const dir = Math.floor(i / 3) % 2 ? 1 : -1
        const len = 2 + Math.round(k * 3)
        const flap = Math.round(Math.sin(t * 1.4 + d.seed + i) * 0.8)
        for (let j = 1; j <= len; j++) {
          g.fillStyle = j === len ? lit : shade(d.color, 0.06)
          g.fillRect(X + (dir === 1 ? 1 + j : -j), Y + (j > 1 ? flap : 0) + (j > len - 1 ? 1 : 0), 1, 1)
        }
      }
      if (i % 9 === 7 && k > 0.4) {
        g.fillStyle = '#c8b04a'
        g.fillRect(X + (d.side === 1 ? 2 : -1), Y, 1, 1)
      }
    }
  } else if (d.kind === 'grass') {
    for (let b = 0; b < 4; b++) {
      const n = Math.round(d.len * (0.6 + ((b * 37) % 10) / 20))
      for (let i = 0; i < n; i++) {
        const k = i / n
        const sway = Math.sin(t * 1.3 + d.seed + b) * k * k * 2.5
        g.fillStyle = i === n - 1 ? shade(d.color, 0.3) : k < 0.4 ? shade(d.color, -0.15) : d.color
        g.fillRect(Math.round(d.x + d.side * (b * 1.2 + 0.5 + k * 1.5) + sway), Math.round(y0 - i), 1, 1)
      }
    }
  } else if (d.kind === 'anemone') {
    // a stubby body with waving tentacles
    const X = Math.round(d.x) + (d.side === 1 ? 0 : -3)
    const Y = Math.round(y0)
    g.fillStyle = shade(d.color, -0.25)
    g.fillRect(X, Y - 2, 3, 3)
    g.fillStyle = d.color
    g.fillRect(X, Y - 3, 3, 1)
    for (let i = 0; i < 5; i++) {
      const n = Math.round(d.len * (0.6 + (i % 2) * 0.4))
      for (let j = 0; j < n; j++) {
        const wav = Math.round(Math.sin(t * 2 + d.seed + i + j * 0.6) * (j / n) * 1.5)
        g.fillStyle = j === n - 1 ? shade(d.color, 0.4) : d.color
        g.fillRect(X - 1 + i + wav, Y - 4 - j, 1, 1)
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
    g.fillStyle = '#ff8a3a'
    g.fillRect(Math.round(d.x), Math.round(y0 - d.len), 1, 1)
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.25 + i / 6 + d.seed) % 1
      g.fillStyle = rgba('#c8b8d8', 0.35 * (1 - ph))
      g.fillRect(Math.round(d.x + Math.sin(ph * 9 + i) * 2), Math.round(y0 - d.len - ph * 40), 2, 2)
    }
  }
}
