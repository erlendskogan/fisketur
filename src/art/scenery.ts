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
  kind: 'kelp' | 'grass' | 'glowplant' | 'vent' | 'anemone' | 'bullkelp' | 'crab' | 'turtle' | 'fan'
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

export function buildWater(W: number, world = 'norge'): Water {
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
  const vg = world.startsWith('vardo') ? (world.split(':')[1] ?? 'sundet') : null
  const wallAt = (y: number, ph: number) => {
    if (vg) return vardoWall(vg, y, ph, W)
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
    // green weed on the ledges only where light reaches; off Vardø that stops at about 35 metres
    const shallow = y < (vg ? ({ sundet: 620, fjorden: 330, banken: 175 } as Record<string, number>)[vg] ?? 0 : ZONE_H * 1.6)
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
  if (vg === 'sundet' || vg === 'banken') {
    // sand lying on the ledges and slopes of the sound and the banks
    const sand = (x: number, y: number, k: number) => {
      const c = rock.get(x, y)
      if (c) rock.set(x, y, mix(c, (x + y) % 3 === 0 ? '#b8a880' : '#a89870', k))
    }
    for (let y = 1; y < Hh; y++)
      for (const [wall, side] of [[wallL, 1], [wallR, -1]] as [number[], number][]) {
        const step = wall[y] - wall[y - 1]
        if (step <= 0) continue
        for (let d = 0; d < Math.min(step + 2, 8); d++) {
          const x = side === 1 ? wall[y] - 1 - d : W - wall[y] + d
          sand(x, y, 0.55 * Math.max(0.2, 1 - y / 1400))
          sand(x, y + 1, 0.3 * Math.max(0.2, 1 - y / 1400))
        }
      }
  }
  // seabed: rippled sand with pebbles; soft grey ooze in the deep off the shelf
  const bed = vg === 'eggakanten' ? ['#4a4a6a', '#34344e', '#22223a'] : vg === 'sundet' ? ['#6a6478', '#4a4460', '#34304a'] : ['#5a5684', '#3e3a64', '#2a2648']
  for (let x = 0; x < W; x++) {
    const top = SEABED + Math.round(3 * Math.sin(x * 0.09) + 2 * Math.sin(x * 0.23 + 1))
    for (let y = top; y < Hh; y++) {
      const d = y - top
      let col = d === 0 ? bed[0] : d < 3 ? bed[1] : bed[2]
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

  if (world === 'alaska') {
    alaskaLife(g, W, r, deco, glows, onWall, px)
    return { bg: c, wallL, wallR, deco, glows }
  }
  if (world === 'hawaii') {
    hawaiiLife(g, W, r, deco, glows, onWall, px)
    return { bg: c, wallL, wallR, deco, glows }
  }
  if (world === 'lofoten') {
    lofotenLife(g, W, r, deco, glows, onWall, px)
    return { bg: c, wallL, wallR, deco, glows }
  }
  if (vg) {
    vardoLife(vg, g, W, r, deco, glows, onWall, px)
    return { bg: c, wallL, wallR, deco, glows }
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

/** Frederick Sound: eelgrass and ochre stars, bull kelp, crabs, plumose anemones, red tree coral */
function alaskaLife(
  g: CanvasRenderingContext2D,
  W: number,
  r: () => number,
  deco: Deco[],
  glows: Water['glows'],
  onWall: (y: number, side: 1 | -1) => number,
  px: (x: number, y: number, c: string) => void,
) {
  const side = () => (r() < 0.5 ? 1 : -1) as 1 | -1
  const star = (x: number, y: number, col: string, arms: number) => {
    // ochre stars have five fat arms, sunflower stars up to twenty thin ones
    for (let a = 0; a < arms; a++) {
      const ang = (a / arms) * Math.PI * 2
      const len = arms > 5 ? 3 : 2
      for (let k = 1; k <= len; k++) px(x + Math.round(Math.cos(ang) * k), y + Math.round(Math.sin(ang) * k * 0.8), k === len ? shade(col, 0.2) : col)
    }
    px(x, y, shade(col, -0.2))
  }
  // Tidevannet: eelgrass, mussels and barnacles, purple ochre stars
  for (let i = 0; i < 14; i++) {
    const y = 60 + r() * 230
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'grass', len: 6 + r() * 8, side: sd, seed: r() * 10, color: r() < 0.5 ? '#5aa84a' : '#7ab84a' })
  }
  for (let i = 0; i < 50; i++) {
    const y = Math.round(80 + r() * 260)
    const sd = side()
    const x = onWall(y, sd) - (sd === 1 ? 1 : 0)
    if (r() < 0.55) for (let k = 0; k < 3; k++) px(x - sd * (k % 2), y + k, k === 0 ? '#4a5a8a' : '#1e1e3a')
    else px(x, y, '#ece8dc')
  }
  for (let i = 0; i < 14; i++) {
    const y = Math.round(110 + r() * 250)
    const sd = side()
    star(onWall(y, sd) - sd * 3, y, r() < 0.6 ? '#8a3a9a' : '#e8702a', 5)
  }
  // Kelpskogen: bull kelp reaching for the light, and sunflower stars
  for (let i = 0; i < 16; i++) {
    const y = 300 + 30 + r() * 250
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'bullkelp', len: 50 + r() * 70, side: sd, seed: r() * 10, color: '#7a6a2e' })
  }
  for (let i = 0; i < 10; i++) {
    const y = 300 + r() * 300
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'kelp', len: 14 + r() * 18, side: sd, seed: r() * 10, color: '#4a8a3a' })
  }
  for (let i = 0; i < 8; i++) {
    const y = Math.round(340 + r() * 520)
    const sd = side()
    star(onWall(y, sd) - sd * 4, y, r() < 0.5 ? '#f08a3a' : '#c84a8a', 12)
  }
  // Kveitebanken: Dungeness crabs on the ledges and sea pens
  for (let i = 0; i < 8; i++) {
    const y = 600 + 20 + r() * 260
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'crab', len: 0, side: sd, seed: r() * 10, color: '#c8703a' })
  }
  for (let i = 0; i < 12; i++) {
    const y = Math.round(600 + r() * 300)
    const sd = side()
    const x = onWall(y, sd) + sd * 2
    for (let k = 0; k < 5; k++) px(x, y - k, k > 2 ? '#f0c08a' : '#a87a5a')
    if (r() < 0.4) glows.push({ x, y: y - 4, c: '#9ae8ff', r: 1 })
  }
  // Steinriket: white plumose anemones and red tree coral, home of the old rockfish
  for (let i = 0; i < 14; i++) {
    const y = 900 + r() * 300
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'anemone', len: 5 + r() * 4, side: sd, seed: r() * 10, color: r() < 0.7 ? '#f4ece4' : '#f0a07a' })
  }
  for (let i = 0; i < 16; i++) {
    const y = Math.round(920 + r() * 280)
    const sd = side()
    const x = onWall(y, sd)
    // a little red tree coral, branching out from the rock
    const branch = (bx: number, by: number, dx: number, n: number) => {
      for (let k = 0; k < n; k++) {
        px(bx + dx * k, by - Math.round(k * 0.8), k === n - 1 ? '#ff8a8a' : '#d8343a')
        if (k === 2 && n > 3) branch(bx + dx * k, by - 2, dx, n - 2)
      }
    }
    branch(x, y, sd, 5)
    branch(x, y - 1, sd, 3)
  }
  // Sundet: glass sponges like pale vases
  for (let i = 0; i < 12; i++) {
    const y = Math.round(1200 + r() * 300)
    const sd = side()
    const x = onWall(y, sd) + (sd === 1 ? 0 : -3)
    for (let k = 0; k < 5; k++) {
      g.fillStyle = k === 4 ? '#e8e4d8' : '#b8b4a8'
      g.fillRect(x, y - k, 1 + Math.min(2, Math.floor(k / 2)), 1)
      g.fillRect(x + 2, y - k, 1, 1)
    }
    if (r() < 0.3) glows.push({ x: x + 1, y: y - 5, c: '#b8f0ff', r: 1 })
  }
  // Juvet: deep-sea glows on the walls and plants on the bottom
  for (let i = 0; i < 20; i++) {
    const y = 1500 + r() * 280
    const sd = side()
    glows.push({ x: onWall(y, sd) + sd * 3, y: Math.round(y), c: ['#8affd8', '#6ab8ff', '#ff8ab8'][Math.floor(r() * 3)], r: 1 })
  }
  for (let i = 0; i < 12; i++) {
    const x = 6 + r() * (W - 12)
    deco.push({ x, y: SEABED + 1, kind: 'glowplant', len: 5 + r() * 10, side: 1, seed: r() * 10, color: ['#8affd8', '#b8a8ff'][Math.floor(r() * 2)] })
  }
}

/** Lofoten: rockweed and mussels, a forest of tare, king crabs, and the white coral of Røstrevet */
function lofotenLife(
  g: CanvasRenderingContext2D,
  W: number,
  r: () => number,
  deco: Deco[],
  glows: Water['glows'],
  onWall: (y: number, side: 1 | -1) => number,
  px: (x: number, y: number, c: string) => void,
) {
  const side = () => (r() < 0.5 ? 1 : -1) as 1 | -1
  for (let i = 0; i < 12; i++) {
    const y = 60 + r() * 220
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'grass', len: 5 + r() * 6, side: sd, seed: r() * 10, color: r() < 0.5 ? '#8a7a3a' : '#6a6a2e' })
  }
  for (let i = 0; i < 46; i++) {
    const y = Math.round(80 + r() * 300)
    const sd = side()
    const x = onWall(y, sd) - (sd === 1 ? 1 : 0)
    if (r() < 0.6) for (let k = 0; k < 3; k++) px(x - sd * (k % 2), y + k, k === 0 ? '#4a5a8a' : '#1e1e3a')
    else px(x, y, '#ece8dc')
  }
  // tare: thick stalks with a broad frond, a forest from 15 to 60 metres
  for (let i = 0; i < 26; i++) {
    const y = 300 + 10 + r() * 280
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'kelp', len: 18 + r() * 30, side: sd, seed: r() * 10, color: r() < 0.5 ? '#6a6a2a' : '#7a6a32' })
  }
  // green sea urchins grazing the rock
  for (let i = 0; i < 24; i++) {
    const y = Math.round(300 + r() * 400)
    const sd = side()
    const x = onWall(y, sd) - sd * 2
    const c = '#4a8a3a'
    px(x, y, c)
    for (const [dx, dy] of [[-1, -1], [1, -1], [-2, 0], [2, 0], [0, -2]]) px(x + dx, y + dy, '#6aaa4a')
  }
  // king crabs walking along the ledges of Vestfjorden
  for (let i = 0; i < 9; i++) {
    const y = 600 + 20 + r() * 400
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'crab', len: 1, side: sd, seed: r() * 10, color: '#a8382e' })
  }
  // Røstrevet: mounds of white and orange Lophelia coral
  const lophelia = (x: number, y: number, dir: number, col: string) => {
    const branch = (bx: number, by: number, n: number, ang: number) => {
      for (let k = 0; k < n; k++) {
        const cx = Math.round(bx + Math.cos(ang) * k * dir)
        const cy = Math.round(by - Math.sin(ang) * k)
        px(cx, cy, k === n - 1 ? '#fff8f0' : col)
        if (k === Math.floor(n / 2) && n > 3) {
          branch(cx, cy, n - 2, ang + 0.6)
          branch(cx, cy, n - 2, ang - 0.5)
        }
      }
    }
    branch(x, y, 7, 0.9)
    branch(x, y, 5, 0.4)
  }
  for (let i = 0; i < 30; i++) {
    const y = Math.round(900 + r() * 300)
    const sd = side()
    lophelia(onWall(y, sd), y, sd, r() < 0.6 ? '#f0e8dc' : '#f0a070')
  }
  for (let i = 0; i < 8; i++) {
    const y = 900 + r() * 300
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'anemone', len: 5 + r() * 4, side: sd, seed: r() * 10, color: '#f4ece4' })
  }
  // Eggakanten: cold-water sponges
  for (let i = 0; i < 14; i++) {
    const y = Math.round(1200 + r() * 300)
    const sd = side()
    const x = onWall(y, sd) + (sd === 1 ? 0 : -4)
    g.fillStyle = '#c8b898'
    g.fillRect(x, y - 4, 4, 4)
    g.fillStyle = '#e8dcc0'
    g.fillRect(x, y - 4, 4, 1)
    g.fillStyle = '#8a7a5a'
    g.fillRect(x + 1, y - 3, 2, 1)
  }
  // Norskehavet: small lights in the cold dark
  for (let i = 0; i < 18; i++) {
    const y = 1500 + r() * 280
    const sd = side()
    glows.push({ x: onWall(y, sd) + sd * 3, y: Math.round(y), c: ['#8affd8', '#6ab8ff'][Math.floor(r() * 2)], r: 1 })
  }
  for (let i = 0; i < 8; i++) {
    const x = 6 + r() * (W - 12)
    deco.push({ x, y: SEABED + 1, kind: 'glowplant', len: 4 + r() * 8, side: 1, seed: r() * 10, color: '#8affd8' })
  }
}

/** Hilo Bay: coral heads and urchins on black lava, turtles, sea fans, and vents on the volcano below */
function hawaiiLife(
  g: CanvasRenderingContext2D,
  W: number,
  r: () => number,
  deco: Deco[],
  glows: Water['glows'],
  onWall: (y: number, side: 1 | -1) => number,
  px: (x: number, y: number, c: string) => void,
) {
  const side = () => (r() < 0.5 ? 1 : -1) as 1 | -1
  // Revet and Lavakanten: lobe and cauliflower coral growing on the lava
  const coral = (x: number, y: number, dir: number, col: string, n: number) => {
    for (let k = 0; k < n; k++) {
      const cx = x + dir * Math.round(r() * 5)
      const cy = y - Math.round(r() * 4)
      g.fillStyle = k % 3 === 0 ? shade(col, 0.25) : col
      g.fillRect(cx, cy, 2, 2)
      g.fillStyle = shade(col, -0.2)
      g.fillRect(cx, cy + 2, 2, 1)
    }
  }
  for (let i = 0; i < 40; i++) {
    const y = Math.round(90 + r() * 480)
    const sd = side()
    coral(onWall(y, sd) - (sd === 1 ? 0 : 6), y, sd, ['#e8a87a', '#c8b06a', '#a8c08a', '#f0c8a0', '#d8889a'][Math.floor(r() * 5)], 5 + Math.floor(r() * 4))
  }
  // spiny black urchins and a few pink ones
  for (let i = 0; i < 26; i++) {
    const y = Math.round(100 + r() * 500)
    const sd = side()
    const x = onWall(y, sd) - sd * 2
    const c = r() < 0.7 ? '#1e1a2a' : '#c85a8a'
    px(x, y, c)
    for (const [dx, dy] of [[-1, -1], [1, -1], [-2, 0], [2, 0], [0, -2], [-1, 1], [1, 1]]) px(x + dx, y + dy, c)
  }
  for (let i = 0; i < 8; i++) {
    const y = 60 + r() * 400
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'grass', len: 4 + r() * 5, side: sd, seed: r() * 10, color: '#5aa84a' })
  }
  // honu: green sea turtles gliding up and down the reef
  for (let i = 0; i < 4; i++) deco.push({ x: W * (0.2 + r() * 0.6), y: 80 + r() * 420, kind: 'turtle', len: 0, side: r() < 0.5 ? 1 : -1, seed: r() * 10, color: '#5a7a3a' })
  // Stupet and Dypbanken: sea fans and black coral on the drop-off
  for (let i = 0; i < 20; i++) {
    const y = 620 + r() * 560
    const sd = side()
    deco.push({ x: onWall(y, sd), y, kind: 'fan', len: 6 + r() * 6, side: sd, seed: r() * 10, color: r() < 0.6 ? '#d84a5a' : '#2a2a34' })
  }
  // Det blå: glass sponges and lanterns of light
  for (let i = 0; i < 14; i++) {
    const y = Math.round(1220 + r() * 280)
    const sd = side()
    const x = onWall(y, sd) + sd * 2
    for (let k = 0; k < 4; k++) px(x, y - k, k === 3 ? '#e8e4d8' : '#a8a498')
    if (r() < 0.4) glows.push({ x, y: y - 4, c: '#b8f0ff', r: 1 })
  }
  // Lavadypet: glows on the walls and hot vents on the young volcano below Hawaiʻi
  for (let i = 0; i < 18; i++) {
    const y = 1520 + r() * 260
    const sd = side()
    glows.push({ x: onWall(y, sd) + sd * 3, y: Math.round(y), c: ['#8affd8', '#d0a8ff', '#ffb46a'][Math.floor(r() * 3)], r: 1 })
  }
  deco.push({ x: W * 0.3, y: SEABED, kind: 'vent', len: 12, side: 1, seed: 3, color: '#2a1a1a' })
  deco.push({ x: W * 0.55, y: SEABED, kind: 'vent', len: 9, side: 1, seed: 5, color: '#2a1a1a' })
  deco.push({ x: W * 0.8, y: SEABED, kind: 'vent', len: 15, side: 1, seed: 7, color: '#2a1a1a' })
  for (let i = 0; i < 10; i++) {
    const x = 6 + r() * (W - 12)
    deco.push({ x, y: SEABED + 1, kind: 'glowplant', len: 4 + r() * 8, side: 1, seed: r() * 10, color: '#ffb46a' })
  }
}

/**
 * The walls of Vardø's four grounds. Bussesundet is a shallow sandy sound, Varangerfjorden a
 * stepped rocky fjord, Tiddlybanken a sea of flat banks, and at Eggakanten the shelf breaks
 * off on the left into a cliff falling to the deep, with open water on the right.
 */
function vardoWall(ground: string, y: number, ph: number, W: number) {
  const cl = (v: number) => Math.max(0, Math.min(1, v))
  const n = 5 * Math.sin(y * 0.031 + ph) + 3 * Math.sin(y * 0.077 + ph * 2) + 1.5 * Math.sin(y * 0.19 + ph * 3)
  const left = ph < 2
  if (ground === 'sundet') {
    const base = cl((y - 30) / 520) * W * 0.2 + cl((y - 1000) / 700) * W * 0.12
    return Math.max(0, Math.round(base + n * cl(y / 300) * 0.8))
  }
  if (ground === 'fjorden') {
    // terraces: the wall steps out every ninety pixels, a flat ledge for the crabs to walk
    // four steps out, then the rock falls back under an overhang and it starts again
    const k = y / 90 + (left ? 0 : 2.5)
    const i = Math.floor(k)
    const f = k - i
    const c = i % 5
    const steps = c < 4 ? c + cl((f - 0.8) * 5) : 4 * (1 - cl(f * 1.6))
    const base = cl((y - 60) / 300) * W * (0.07 + 0.035 * steps) + cl((y - 1300) / 400) * W * 0.07
    return Math.max(0, Math.round(base + n * cl((y - 60) / 200) * 0.5))
  }
  if (ground === 'banken') {
    // wide flat banks at different depths on each side, the edge dropping in a short slope
    const bank = (top: number, w: number) => cl((y - top) / 18) * w
    const base = left ? Math.max(bank(560, W * 0.3), bank(1150, W * 0.35)) : Math.max(bank(840, W * 0.25), bank(1420, W * 0.3))
    const shallow = cl((y - 80) / 400) * W * 0.07
    const bumps = y > 300 ? n * 0.4 : n * 0.2
    return Math.max(0, Math.round(Math.max(base, shallow) + bumps))
  }
  // eggakanten
  if (left) {
    // the shelf: flat on top, the edge rounding over and the cliff going down almost straight
    const shelf = cl((y - 120) / 30) * W * 0.44
    const slope = cl((y - 200) / 1500) * W * 0.06
    const cracks = y > 200 ? 3 * Math.sin(y * 0.05 + 1) + 2 * Math.sin(y * 0.17) : 0
    return Math.max(0, Math.round(shelf + slope + cracks))
  }
  return Math.max(0, Math.round(cl((y - 1250) / 400) * W * 0.18 + (y > 1250 ? n * 0.6 : 0)))
}

/** What lives on the walls of each ground off Vardø */
function vardoLife(
  ground: string,
  g: CanvasRenderingContext2D,
  W: number,
  r: () => number,
  deco: Deco[],
  glows: Water['glows'],
  onWall: (y: number, side: 1 | -1) => number,
  px: (x: number, y: number, c: string) => void,
) {
  const side = () => (r() < 0.5 ? 1 : -1) as 1 | -1
  const eggakanten = ground === 'eggakanten'
  // on the drop-off almost everything grows on the left wall
  const wallSide = () => (eggakanten ? 1 : side())
  const urchin = (x: number, y: number, c: string, c2: string) => {
    px(x, y, c)
    for (const [dx, dy] of [[-1, -1], [1, -1], [-2, 0], [2, 0], [0, -2]]) px(x + dx, y + dy, c2)
  }
  const sponge = (x: number, y: number, c: string, h: number, dir: number) => {
    // a lumpy sponge growing out from the rock, paler at its rim
    for (let k = 0; k < h; k++) {
      const w = 2 + Math.round(Math.sin((k / h) * Math.PI) * 2)
      g.fillStyle = k === h - 1 ? shade(c, 0.3) : k % 2 ? c : shade(c, -0.1)
      g.fillRect(dir === 1 ? x : x - w, y - k, w, 1)
    }
    g.fillStyle = shade(c, -0.35)
    g.fillRect(dir === 1 ? x + 1 : x - 2, y - h + 1, 1, 1)
  }
  const brittle = (x: number, y: number, c: string) => {
    px(x, y, shade(c, -0.2))
    for (const [dx, dy] of [[-2, -1], [-1, 0], [1, 0], [2, -1], [0, 1], [-2, 1], [2, 1], [-3, 0], [3, 0]]) if (r() < 0.8) px(x + dx, y + dy, c)
  }
  const lophelia = (x: number, y: number, dir: number, col: string) => {
    const branch = (bx: number, by: number, n: number, ang: number) => {
      for (let k = 0; k < n; k++) {
        const cx = Math.round(bx + Math.cos(ang) * k * dir)
        const cy = Math.round(by - Math.sin(ang) * k)
        px(cx, cy, k === n - 1 ? '#fff8f0' : col)
        if (k === Math.floor(n / 2) && n > 3) {
          branch(cx, cy, n - 2, ang + 0.6)
          branch(cx, cy, n - 2, ang - 0.5)
        }
      }
    }
    branch(x, y, 6, 0.9)
    branch(x, y, 4, 0.3)
  }
  const mussels = (n: number, from: number, span: number) => {
    for (let i = 0; i < n; i++) {
      const y = Math.round(from + r() * span)
      const sd = wallSide()
      const x = onWall(y, sd) - (sd === 1 ? 1 : 0)
      if (r() < 0.6) for (let k = 0; k < 3; k++) px(x - sd * (k % 2), y + k, k === 0 ? '#4a5a8a' : '#1e1e3a')
      else px(x, y, '#ece8dc')
    }
  }

  if (ground === 'sundet') {
    // Bussesundet: rockweed and sugar kelp in the shallows, a thick tare forest, sand and urchins below
    for (let i = 0; i < 16; i++) {
      const y = 40 + r() * 260
      const sd = side()
      deco.push({ x: onWall(y, sd), y, kind: 'grass', len: 5 + r() * 7, side: sd, seed: r() * 10, color: r() < 0.5 ? '#8a7a3a' : '#6a7a32' })
    }
    mussels(50, 60, 320)
    // tare down to about 33 metres, where the light gives out
    for (let i = 0; i < 40; i++) {
      const y = 150 + r() * 480
      const sd = side()
      deco.push({ x: onWall(y, sd), y, kind: 'kelp', len: 22 + r() * 42, side: sd, seed: r() * 10, color: ['#6a6a2a', '#7a6a32', '#5a7a32'][Math.floor(r() * 3)] })
    }
    for (let i = 0; i < 30; i++) {
      const y = Math.round(300 + r() * 700)
      const sd = side()
      urchin(onWall(y, sd) - sd * 2, y, '#7a3a5a', '#a85a8a')
    }
    for (let i = 0; i < 14; i++) {
      const y = Math.round(200 + r() * 900)
      const sd = side()
      const x = onWall(y, sd) - sd * 3
      const c = ['#ff7a3a', '#e84a6a', '#ffb43a'][Math.floor(r() * 3)]
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1]]) px(x + dx, y + dy, dx === 0 && dy === 0 ? shade(c, 0.3) : c)
    }
    for (let i = 0; i < 10; i++) {
      const y = 900 + r() * 700
      const sd = side()
      deco.push({ x: onWall(y, sd), y, kind: 'anemone', len: 4 + r() * 3, side: sd, seed: r() * 10, color: ['#f4e4f0', '#ffb46a', '#ff8ab8'][Math.floor(r() * 3)] })
    }
    // flounder-coloured sand ripples and shells on the bottom of the sound
    for (let i = 0; i < 30; i++) px(6 + r() * (W - 12), SEABED - 1 - Math.round(r() * 2), r() < 0.5 ? '#e8e0cc' : '#b8a888')
    for (let i = 0; i < 8; i++) deco.push({ x: 8 + r() * (W - 16), y: SEABED + 1, kind: 'grass', len: 4 + r() * 4, side: side(), seed: r() * 10, color: '#7a8a3a' })
    return
  }

  if (ground === 'fjorden') {
    // Varangerfjorden: kelp near the top (no deeper than about 35 metres), then ledge after ledge of rock with king crabs on them
    for (let i = 0; i < 18; i++) {
      const y = 80 + r() * 250
      const sd = side()
      deco.push({ x: onWall(y, sd), y, kind: 'kelp', len: 16 + r() * 26, side: sd, seed: r() * 10, color: r() < 0.5 ? '#6a6a2a' : '#7a6a32' })
    }
    mussels(40, 60, 400)
    for (let i = 0; i < 26; i++) {
      const y = 380 + r() * 1100
      const sd = side()
      deco.push({ x: onWall(y, sd), y, kind: 'crab', len: 1, side: sd, seed: r() * 10, color: r() < 0.8 ? '#a8382e' : '#b84a32' })
    }
    for (let i = 0; i < 30; i++) {
      const y = Math.round(300 + r() * 1300)
      const sd = side()
      brittle(onWall(y, sd) - sd * 3, y, ['#c88a6a', '#a87a8a', '#d8a87a'][Math.floor(r() * 3)])
    }
    for (let i = 0; i < 24; i++) {
      const y = Math.round(200 + r() * 600)
      const sd = side()
      urchin(onWall(y, sd) - sd * 2, y, '#4a8a3a', '#6aaa4a')
    }
    for (let i = 0; i < 14; i++) {
      const y = 600 + r() * 900
      const sd = side()
      deco.push({ x: onWall(y, sd), y, kind: 'anemone', len: 5 + r() * 4, side: sd, seed: r() * 10, color: r() < 0.6 ? '#f4ece4' : '#ff9a6a' })
    }
    for (let i = 0; i < 12; i++) {
      const y = 1400 + r() * 360
      const sd = side()
      glows.push({ x: onWall(y, sd) + sd * 3, y: Math.round(y), c: ['#8affd8', '#6ab8ff'][Math.floor(r() * 2)], r: 1 })
    }
    for (let i = 0; i < 6; i++) deco.push({ x: 8 + r() * (W - 16), y: SEABED + 1, kind: 'crab', len: 1, side: side(), seed: r() * 10, color: '#a8382e' })
    return
  }

  if (ground === 'banken') {
    // Tiddlybanken: sponges like boulders on the flat banks, pink soft corals, sea pens and snow crabs
    const onBank = (n: number, tint: (i: number) => void) => {
      for (let i = 0; i < n; i++) tint(i)
    }
    // the tops of the banks, where the wall steps out flat
    const benches: { y: number; side: 1 | -1 }[] = [
      { y: 560, side: 1 },
      { y: 1150, side: 1 },
      { y: 840, side: -1 },
      { y: 1420, side: -1 },
    ]
    for (const b of benches) {
      const x0 = b.side === 1 ? 2 : W - onWall(b.y + 20, -1) + 2
      const x1 = b.side === 1 ? onWall(b.y + 20, 1) - 2 : W - 2
      onBank(Math.round((x1 - x0) / 5), () => {
        const x = Math.round(x0 + r() * (x1 - x0))
        const top = b.y + 1
        const k = r()
        if (k < 0.35) sponge(x, top, ['#e8c86a', '#f0a050', '#e8e0c8'][Math.floor(r() * 3)], 3 + Math.floor(r() * 4), 1)
        else if (k < 0.6) deco.push({ x, y: top, kind: 'anemone', len: 3 + r() * 3, side: 1, seed: r() * 10, color: ['#ff9ab8', '#ffb07a', '#f4e4f0'][Math.floor(r() * 3)] })
        else if (k < 0.75) {
          for (let j = 0; j < 5; j++) px(x, top - j, j > 2 ? '#f0c08a' : '#a87a5a')
          if (r() < 0.5) glows.push({ x, y: top - 4, c: '#9ae8ff', r: 1 })
        } else if (k < 0.85) deco.push({ x, y: top, kind: 'crab', len: 2, side: r() < 0.5 ? 1 : -1, seed: r() * 10, color: '#d8823a' })
        else brittle(x, top - 1, '#d8a87a')
      })
    }
    mussels(30, 60, 300)
    for (let i = 0; i < 8; i++) {
      const y = 90 + r() * 80
      const sd = side()
      deco.push({ x: onWall(y, sd), y, kind: 'kelp', len: 12 + r() * 18, side: sd, seed: r() * 10, color: '#6a6a2a' })
    }
    for (let i = 0; i < 30; i++) {
      const y = Math.round(300 + r() * 1400)
      const sd = side()
      sponge(onWall(y, sd) + (sd === 1 ? 0 : 0), y, ['#e8c86a', '#c8b898', '#f0a050'][Math.floor(r() * 3)], 2 + Math.floor(r() * 3), sd)
    }
    for (let i = 0; i < 14; i++) {
      const y = 1500 + r() * 260
      const sd = side()
      glows.push({ x: onWall(y, sd) + sd * 3, y: Math.round(y), c: ['#8affd8', '#6ab8ff'][Math.floor(r() * 2)], r: 1 })
    }
    for (let i = 0; i < 8; i++) deco.push({ x: 8 + r() * (W - 16), y: SEABED + 1, kind: 'glowplant', len: 4 + r() * 6, side: 1, seed: r() * 10, color: '#9ae8ff' })
    return
  }

  // Eggakanten: far too deep for kelp. Sponges, sea pens and feather stars on the shelf,
  // Lophelia and glass sponges down the cliff, brittle stars everywhere, lights in the deep
  const seaPen = (x: number, y: number, c: string) => {
    const h = 4 + Math.floor(r() * 4)
    for (let k = 0; k < h; k++) px(x, y - k, k < 2 ? shade(c, -0.35) : c)
    for (let k = 2; k < h; k += 1) px(x + (k % 2 ? 1 : -1), y - k, shade(c, 0.2))
    if (r() < 0.3) glows.push({ x, y: y - h, c: '#9ae8ff', r: 1 })
  }
  const featherStar = (x: number, y: number, c: string) => {
    // a feather star on a short stalk, its arms curling up and out
    px(x, y, shade(c, -0.3))
    px(x, y - 1, c)
    for (const [dx, dy] of [[-1, -2], [-2, -3], [-3, -3], [1, -2], [2, -3], [3, -3], [0, -2], [0, -3], [-1, -4], [1, -4]]) px(x + dx, y + dy, dy < -3 ? shade(c, 0.3) : c)
  }
  // the top of the shelf, its flat face
  const shelfX = onWall(160, 1)
  // the shelf rounds over, so each thing sits on the first rock under it
  const top = (x: number) => {
    let y = 100
    while (y < 160 && onWall(y, 1) <= x) y++
    return y
  }
  for (let i = 0; i < Math.round(shelfX / 5); i++) {
    const x = Math.round(2 + r() * (shelfX - 4))
    const y = top(x)
    const k = r()
    if (k < 0.35) sponge(x, y, ['#e8c86a', '#c8b898', '#e8e0c8'][Math.floor(r() * 3)], 2 + Math.floor(r() * 3), 1)
    else if (k < 0.6) seaPen(x, y, r() < 0.5 ? '#e8826a' : '#f0c08a')
    else if (k < 0.8) featherStar(x, y, r() < 0.5 ? '#e8a05a' : '#d8705a')
    else brittle(x, y - 1, ['#c88a6a', '#d8a87a'][Math.floor(r() * 2)])
  }
  for (let i = 0; i < 40; i++) {
    const y = Math.round(220 + r() * 800)
    lophelia(onWall(y, 1), y, 1, r() < 0.6 ? '#f0e8dc' : '#f0a070')
  }
  for (let i = 0; i < 14; i++) {
    const y = 300 + r() * 700
    deco.push({ x: onWall(y, 1), y, kind: 'anemone', len: 5 + r() * 4, side: 1, seed: r() * 10, color: '#f4ece4' })
  }
  for (let i = 0; i < 16; i++) {
    const y = 600 + r() * 500
    deco.push({ x: onWall(y, 1), y, kind: 'fan', len: 6 + r() * 6, side: 1, seed: r() * 10, color: r() < 0.6 ? '#e8705a' : '#f0d8c8' })
  }
  for (let i = 0; i < 18; i++) {
    const y = Math.round(1000 + r() * 500)
    const x = onWall(y, 1) + 2
    // glass sponges like pale vases
    for (let k = 0; k < 5; k++) {
      g.fillStyle = k === 4 ? '#e8e4d8' : '#b8b4a8'
      g.fillRect(x, y - k, 1 + Math.min(2, Math.floor(k / 2)), 1)
      g.fillRect(x + 2, y - k, 1, 1)
    }
    if (r() < 0.35) glows.push({ x: x + 1, y: y - 5, c: '#b8f0ff', r: 1 })
  }
  for (let i = 0; i < 24; i++) {
    const y = Math.round(200 + r() * 1300)
    const k = r()
    if (k < 0.5) brittle(onWall(y, 1) + 3, y, ['#c88a6a', '#a87a8a', '#d8a87a'][Math.floor(r() * 3)])
    else featherStar(onWall(y, 1) + 2, y, ['#e8a05a', '#d8705a', '#f0d8a8'][Math.floor(r() * 3)])
  }
  // sea pens standing in the ooze on the bottom
  const bedL = onWall(SEABED, 1) + 4
  const bedR = onWall(SEABED, -1) - 4
  for (let i = 0; i < 12; i++) {
    const x = Math.round(bedL + r() * (bedR - bedL))
    seaPen(x, SEABED - 1 + Math.round(3 * Math.sin(x * 0.09) + 2 * Math.sin(x * 0.23 + 1)), r() < 0.5 ? '#e8826a' : '#f0c08a')
  }
  for (let i = 0; i < 30; i++) {
    const y = 1200 + r() * 560
    const sd = y > 1350 && r() < 0.4 ? -1 : 1
    glows.push({ x: onWall(y, sd) + sd * 3, y: Math.round(y), c: ['#8affd8', '#6ab8ff', '#d0a8ff'][Math.floor(r() * 3)], r: 1 })
  }
  for (let i = 0; i < 14; i++) deco.push({ x: 6 + r() * (W - 12), y: SEABED + 1, kind: 'glowplant', len: 5 + r() * 12, side: 1, seed: r() * 10, color: ['#7affd8', '#9ae8ff', '#d0a8ff'][Math.floor(r() * 3)] })
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
  } else if (d.kind === 'bullkelp') {
    // a single thin stipe up towards the surface, a float, and long blades streaming in the current
    const n = Math.round(d.len)
    let x = d.x + d.side
    let y = y0
    for (let i = 0; i < n; i++) {
      const k = i / n
      x += Math.sin(t * 0.6 + d.seed + i * 0.05) * 0.18 * k + d.side * (k < 0.08 ? 0.6 : 0.05)
      y -= 1
      g.fillStyle = k < 0.15 ? '#4a4a22' : '#6a5e2a'
      g.fillRect(Math.round(x), Math.round(y), 1, 1)
    }
    g.fillStyle = '#9a8a3a'
    g.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 2)
    g.fillStyle = '#c8b45a'
    g.fillRect(Math.round(x) - 1, Math.round(y) - 2, 1, 1)
    for (let b = 0; b < 4; b++) {
      const len = 8 + b * 3
      for (let j = 0; j < len; j++) {
        const wav = Math.sin(t * 1.4 + d.seed + b + j * 0.35) * (j / len) * 2
        g.fillStyle = j > len - 3 ? '#c8a84a' : b % 2 ? '#a8903a' : '#8a7a32'
        g.fillRect(Math.round(x + (b - 1.5) * 1.2 + j * 0.9 * (b % 2 ? 1 : -1) * 0.5 + wav), Math.round(y - 2 - j * 0.6), 1, 1)
      }
    }
  } else if (d.kind === 'turtle') {
    // a green sea turtle paddling slowly along the reef
    const span = 260
    const k = ((t * 3 + d.seed * 40) % span) / span
    const X = Math.round(d.side === 1 ? -20 + k * 240 : 220 - k * 240)
    const Y = Math.round(y0 + Math.sin(t * 0.4 + d.seed) * 10)
    const flap = Math.floor(t * 2 + d.seed) % 2
    const f = d.side
    g.fillStyle = '#4a6a32'
    g.fillRect(X - 4, Y - 2, 9, 4)
    g.fillStyle = '#8a9a4a'
    g.fillRect(X - 3, Y - 2, 7, 1)
    g.fillRect(X - 2, Y, 2, 1)
    g.fillRect(X + 1, Y, 2, 1)
    g.fillStyle = '#9aa86a'
    g.fillRect(X + f * 5 - (f === 1 ? 0 : 1), Y - 1, 2, 2)
    g.fillStyle = '#7a8a5a'
    g.fillRect(X + f * 2, Y + 2 + flap, 3, 1)
    g.fillRect(X - f * 3, Y + 2 - flap, 2, 1)
  } else if (d.kind === 'fan') {
    // a sea fan swaying on the wall
    const n = Math.round(d.len)
    for (let i = 0; i < n; i++) {
      const k = i / n
      const sway = Math.sin(t * 0.8 + d.seed) * k * 1.5
      for (let j = -Math.round(k * 3); j <= Math.round(k * 3); j++)
        if ((i + j) % 2 === 0) {
          g.fillStyle = i === n - 1 ? shade(d.color, 0.3) : d.color
          g.fillRect(Math.round(d.x + d.side * (1 + i) + sway), Math.round(y0 + j - i * 0.3), 1, 1)
        }
    }
  } else if (d.kind === 'crab' && d.len > 0) {
    // a king crab: big, spiny and slow, with long jointed legs
    const X = Math.round(d.x + d.side * (5 + Math.sin(t * 0.15 + d.seed) * 4))
    const Y = Math.round(y0)
    const step = Math.floor(t * 2 + d.seed) % 2
    g.fillStyle = '#7a2a22'
    for (const [lx, ly] of [[-5, 0], [-4, -2], [4, -2], [5, 0], [-6, 1], [6, 1]]) g.fillRect(X + lx, Y + ly - (lx < 0 ? step : 1 - step), 1, 2)
    g.fillStyle = d.color
    g.fillRect(X - 3, Y - 4, 7, 3)
    g.fillStyle = shade(d.color, 0.3)
    for (let x = -2; x <= 2; x += 2) g.fillRect(X + x, Y - 4, 1, 1)
    g.fillStyle = '#e8c8a0'
    g.fillRect(X - 4, Y - 5, 1, 1)
    g.fillRect(X + 4, Y - 5, 1, 1)
  } else if (d.kind === 'crab') {
    // a Dungeness crab shuffling sideways along its ledge
    const X = Math.round(d.x + d.side * (3 + Math.sin(t * 0.3 + d.seed) * 3))
    const Y = Math.round(y0)
    const legs = Math.floor(t * 4 + d.seed) % 2
    g.fillStyle = '#8a4a2a'
    g.fillRect(X - 3, Y - 1 + legs, 1, 1)
    g.fillRect(X + 3, Y - legs, 1, 1)
    g.fillStyle = d.color
    g.fillRect(X - 2, Y - 3, 5, 2)
    g.fillStyle = shade(d.color, 0.25)
    g.fillRect(X - 1, Y - 3, 3, 1)
    g.fillStyle = '#f0d0a0'
    g.fillRect(X - 3, Y - 4, 1, 1)
    g.fillRect(X + 3, Y - 4, 1, 1)
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
