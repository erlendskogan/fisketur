// Procedural pixel-art fish. Every species is described by a handful of shape and
// colour parameters; the generator turns that into a shaded, outlined sprite with
// two tail frames, facing right (head on the right).

import { Pix, flip, hash, rng, shade } from './pixel'

export type Shape = 'fusiform' | 'deep' | 'round' | 'flat' | 'eel' | 'long' | 'angler' | 'shark' | 'chimaera' | 'hatchet'
export type Tail = 'fork' | 'round' | 'square' | 'lunate' | 'point' | 'diamond'
export type Dorsal = 'low' | 'high' | 'spiny' | 'long' | 'sail' | 'none'
export type Pattern = 'wavy' | 'bars' | 'spots' | 'mottled' | 'line' | 'stripes'

export interface Look {
  shape: Shape
  len: number
  h: number
  top: string
  mid: string
  belly: string
  fin: string
  pattern?: Pattern
  pat?: string
  tail?: Tail
  dorsal?: Dorsal
  eye?: 1 | 2 | 3
  eyeColor?: string
  glow?: string
  glowAt?: 'row' | 'belly' | 'lines' | 'tail' | 'spots' | 'eye'
  lure?: boolean
  teeth?: boolean
  barbel?: boolean
  beak?: boolean
  crest?: string
  bigMouth?: boolean
}

export interface FishArt {
  right: HTMLCanvasElement[]
  left: HTMLCanvasElement[]
  glowRight: (HTMLCanvasElement | null)[]
  glowLeft: (HTMLCanvasElement | null)[]
  w: number
  h: number
  /** Mouth position in the right-facing sprite */
  mouthX: number
  mouthY: number
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Half-heights (as a fraction of h/2) above and below the centre line at u (0 = tail, 1 = nose) */
function profile(shape: Shape, u: number): [number, number] {
  const nose = (k: number) => (u > 1 - k ? 0.4 + 0.6 * Math.sqrt(Math.max(0, (1 - u) / k)) : 1)
  switch (shape) {
    case 'fusiform': {
      const p = (0.3 + 0.7 * Math.sin(Math.PI * Math.pow(u, 1.25) * 0.94 + 0.03)) * nose(0.1)
      return [p, p * 0.96]
    }
    case 'deep': {
      const p = (0.3 + 0.7 * Math.sin(Math.PI * Math.pow(u, 1.05) * 0.92 + 0.05)) * nose(0.14)
      return [p * 1.04, p * 0.96]
    }
    case 'round': {
      const p = Math.max(0.36, Math.sqrt(Math.max(0, 1 - ((u - 0.56) / 0.56) ** 2)))
      return [p, p]
    }
    case 'flat': {
      const p = Math.max(0.22, Math.sqrt(Math.max(0, 1 - ((u - 0.52) / 0.54) ** 2)))
      return [p, p]
    }
    case 'eel': {
      const p = (u < 0.25 ? 0.35 + 0.65 * (u / 0.25) : 1) * nose(0.08)
      return [p, p]
    }
    case 'long': {
      const p = (u < 0.12 ? 0.5 + 0.5 * (u / 0.12) : 1) * (u > 0.85 ? 1 - ((u - 0.85) / 0.15) * 0.55 : 1)
      return [p, p]
    }
    case 'angler': {
      const p = (0.25 + 0.75 * Math.pow(u, 0.6)) * (u > 0.94 ? 0.85 : 1)
      return [p * 0.85, p]
    }
    case 'shark': {
      const p = (0.2 + 0.8 * Math.sin(Math.PI * Math.pow(u, 1.45) * 0.93 + 0.04)) * nose(0.12)
      return [p, p * 0.82]
    }
    case 'chimaera': {
      const p = u < 0.55 ? 0.1 + 0.8 * Math.pow(u / 0.55, 1.6) : 0.9 * nose(0.16)
      return [p, p * 0.9]
    }
    case 'hatchet': {
      const p = 0.3 + 0.7 * Math.sin(Math.PI * Math.pow(u, 0.85) * 0.9 + 0.08)
      return [p * 0.55, p]
    }
  }
}

function tailSpan(type: Tail, k: number, ph: number, H: number): [number, number, number, number] | null {
  // returns [upperOuter, upperInner, lowerInner, lowerOuter] distances from centre (inner < 0 = solid)
  switch (type) {
    case 'fork': {
      const outer = ph * 0.8 + k * H * 0.42
      const inner = k < 0.45 ? -1 : ((k - 0.45) / 0.55) * (ph * 0.8 + H * 0.26)
      return [outer, inner, inner, outer]
    }
    case 'round': {
      const o = ph * 0.8 + H * 0.36 * Math.sin((Math.PI / 2) * Math.min(1, k * 1.5)) * (k > 0.8 ? 1 - ((k - 0.8) / 0.2) * 0.45 : 1)
      return [o, -1, -1, o]
    }
    case 'square': {
      const o = ph * 0.8 + k * H * 0.3
      return [o, -1, -1, o]
    }
    case 'lunate': {
      const inner = k < 0.3 ? -1 : ((k - 0.3) / 0.7) * (ph * 0.7 + H * 0.2)
      return [ph * 0.7 + k * H * 0.58, inner, inner, ph * 0.7 + k * H * 0.34]
    }
    case 'point': {
      const o = Math.max(0.5, ph * (1 - k))
      return [o, -1, -1, o]
    }
    case 'diamond': {
      const o = ph * 0.7 + H * 0.32 * (k < 0.55 ? k / 0.55 : (1 - k) / 0.45)
      return [o, -1, -1, o]
    }
  }
}

function dorsalHeight(type: Dorsal, u: number, H: number, x: number) {
  const bump = (a: number, b: number) => (u < a || u > b ? 0 : Math.sin((Math.PI * (u - a)) / (b - a)))
  switch (type) {
    case 'low':
      return H * 0.22 * bump(0.36, 0.7)
    case 'high': {
      if (u < 0.3 || u > 0.74) return 0
      const s = (u - 0.3) / 0.44
      return H * 0.42 * (s < 0.3 ? s / 0.3 : 1 - ((s - 0.3) / 0.7) * 0.7)
    }
    case 'spiny':
      return H * 0.28 * bump(0.24, 0.82) * (x % 3 === 0 ? 1.15 : 0.72)
    case 'long':
      return u > 0.06 && u < 0.88 ? Math.max(1.5, H * 0.18) : 0
    case 'sail':
      return H * 0.6 * bump(0.2, 0.8)
    case 'none':
      return 0
  }
}

function analHeight(shape: Shape, u: number, H: number) {
  if (shape === 'flat' || shape === 'eel' || shape === 'long' || shape === 'chimaera')
    return u > 0.06 && u < 0.62 ? Math.max(1.5, H * 0.16) : 0
  if (shape === 'round' || shape === 'angler') return 0
  return u < 0.24 || u > 0.46 ? 0 : H * 0.17 * Math.sin((Math.PI * (u - 0.24)) / 0.22)
}

function noise(x: number, y: number, seed: number) {
  return (hash(`${x},${y},${seed}`) % 1000) / 1000
}

export function genFish(look: Look, id: string): FishArt {
  const H = look.h
  const shape = look.shape
  const tailType = look.tail ?? 'fork'
  const tailLen = Math.max(2, Math.round(look.len * (shape === 'eel' || shape === 'long' ? 0.08 : shape === 'chimaera' ? 0.14 : shape === 'round' ? 0.17 : 0.22)))
  const bodyLen = look.len - tailLen
  const beakLen = look.beak ? Math.round(look.len * 0.16) : 0
  const padT = Math.ceil(H * (look.crest ? 1.45 : 0.75)) + (look.lure ? 8 : 2)
  const padB = Math.ceil(H * 0.45) + 2
  const W = look.len + 3 + beakLen
  const Ht = padT + H + padB
  const cy = padT + H / 2
  const x0 = 1 + tailLen
  const seed = hash(id)
  const r = rng(seed)

  // spot positions shared by both frames
  const spots: [number, number, number][] = []
  for (let i = 0; i < Math.round(look.len * 0.5); i++) spots.push([0.08 + r() * 0.84, 0.08 + r() * 0.7, r() < 0.3 ? 2 : 1])

  const right: HTMLCanvasElement[] = []
  const glowRight: (HTMLCanvasElement | null)[] = []
  let mouthX = 0
  let mouthY = 0

  for (const bend of [-1, 1]) {
    const p = new Pix(W, Ht)
    const glow = new Pix(W, Ht)
    let glowAny = false
    const setGlow = (x: number, y: number) => {
      if (!look.glow || !p.get(x, y)) return
      p.set(x, y, look.glow)
      glow.set(x, y, look.glow)
      glowAny = true
    }

    const [pt0, pb0] = profile(shape, 0)
    const ph = (H / 2) * ((pt0 + pb0) / 2)
    const topAt = (u: number) => cy - (H / 2) * profile(shape, clamp01(u))[0]
    const botAt = (u: number) => cy + (H / 2) * profile(shape, clamp01(u))[1]

    // tail
    for (let i = 0; i < tailLen; i++) {
      const X = x0 - 1 - i
      const k = (i + 1) / tailLen
      const sp = tailSpan(tailType, k, ph, H)
      if (!sp) continue
      const off = Math.round(bend * k * k * Math.max(1, H * 0.12))
      const c = i % 2 ? look.fin : shade(look.fin, -0.1)
      const [uo, ui, li, lo] = sp
      for (let y = Math.round(cy - uo); y <= Math.round(cy + lo); y++) {
        const d = y - cy
        if (ui >= 0 && d < 0 && -d < ui) continue
        if (li >= 0 && d > 0 && d < li) continue
        if (ui >= 0 && li >= 0 && Math.abs(d) < Math.min(ui, li)) continue
        p.set(X, y + off, c)
      }
    }

    // dorsal and anal fins (behind the body)
    for (let x = 0; x < bodyLen; x++) {
      const u = (x + 0.5) / bodyLen
      const X = x0 + x
      const hd = look.crest ? Math.max(H * 0.3, u > 0.86 ? H * 1.35 * (1 - (u - 0.86) / 0.14) + H * 0.3 : 0) : dorsalHeight(look.dorsal ?? 'low', u, H, x)
      const top = topAt(u)
      const finC = look.crest ?? look.fin
      for (let j = 0; j < Math.round(hd); j++) p.set(X, Math.round(top) - 1 - j, x % 2 ? finC : shade(finC, -0.12))
      const ha = analHeight(shape, u, H)
      const bot = botAt(u)
      for (let j = 0; j < Math.round(ha); j++) p.set(X, Math.round(bot) + 1 + j, x % 2 ? look.fin : shade(look.fin, -0.12))
    }

    // body
    for (let x = 0; x < bodyLen; x++) {
      const u = (x + 0.5) / bodyLen
      const X = x0 + x
      const top = topAt(u)
      const bot = botAt(u)
      for (let y = Math.round(top); y <= Math.round(bot); y++) {
        const t = (y - top) / Math.max(1, bot - top)
        const dith = (X + y) % 2 === 0
        let c = t < 0.38 ? look.top : t < 0.64 ? look.mid : look.belly
        if (Math.abs(t - 0.38) < 0.07) c = dith ? look.top : look.mid
        else if (Math.abs(t - 0.64) < 0.07) c = dith ? look.mid : look.belly
        if (H >= 6 && t > 0.08 && t < 0.2 && u > 0.3 && u < 0.86) c = shade(c, 0.16)
        if (t > 0.9) c = shade(c, -0.14)

        // pattern
        const pc = look.pat ?? shade(look.top, -0.35)
        switch (look.pattern) {
          case 'wavy':
            if (t < 0.48 && Math.sin(X * 1.15 + Math.sin(y * 0.9) * 2) > 0.3 && u < 0.86) c = pc
            break
          case 'bars':
            if (t < 0.86 && X % 5 < 2 && u > 0.08 && u < 0.84) c = pc
            break
          case 'mottled':
            if (u < 0.92 && noise(Math.floor(X / 2), Math.floor(y / 2), seed) > 0.66 && t < 0.85) c = pc
            break
          case 'line':
            if (Math.abs(t - 0.42 - 0.08 * Math.sin(u * 3)) < 0.06 && u > 0.04 && u < 0.82) c = pc
            break
          case 'stripes':
            if (u > 0.3 && t > 0.15 && t < 0.85 && (Math.round(t * H + Math.sin(X * 0.6) * 0.8) % 3 === 0)) c = pc
            break
          case 'spots':
            for (const [su, st, sz] of spots) {
              const sx = x0 + Math.round(su * bodyLen)
              const sy = Math.round(topAt(su) + st * (botAt(su) - topAt(su)))
              if (X >= sx && X < sx + sz && y >= sy && y < sy + sz) c = pc
            }
            break
        }
        p.set(X, y, c)
      }
    }

    // pectoral fin and gill
    const span = (u: number) => [topAt(u), botAt(u)] as const
    {
      const u = shape === 'angler' ? 0.6 : 0.7
      const X = x0 + Math.round(bodyLen * u)
      const [t, b] = span(u)
      const Y = Math.round(t + (b - t) * 0.58)
      const fc = shade(look.fin, -0.06)
      p.set(X, Y, fc)
      if (H >= 7) {
        p.set(X - 1, Y, fc)
        p.set(X - 1, Y + 1, fc)
        p.set(X - 2, Y + 1, fc)
      }
      if (H >= 12) {
        p.set(X - 2, Y, fc)
        p.set(X - 3, Y + 1, fc)
        p.set(X - 3, Y + 2, fc)
        p.set(X - 2, Y + 2, fc)
      }
    }
    if (H >= 6 && shape !== 'flat' && shape !== 'eel') {
      const u = 0.79
      const [t, b] = span(u)
      for (let y = Math.round(t + (b - t) * 0.22); y <= Math.round(t + (b - t) * 0.78); y++) {
        const k = (y - t) / (b - t)
        const X = x0 + Math.round(bodyLen * u + Math.sin(k * Math.PI) * (H > 10 ? 1.4 : 0.6))
        const c = p.get(X, y)
        if (c) p.set(X, y, shade(c, -0.22))
      }
    }

    // glow spots
    if (look.glow && look.glowAt) {
      for (let x = 0; x < bodyLen; x++) {
        const u = (x + 0.5) / bodyLen
        const X = x0 + x
        const [t, b] = span(u)
        const at = (k: number) => Math.round(t + (b - t) * k)
        if (look.glowAt === 'row' && u > 0.12 && u < 0.86 && x % 3 === 0) setGlow(X, at(0.74))
        if (look.glowAt === 'belly' && u > 0.1 && u < 0.88 && x % 2 === 0) setGlow(X, Math.round(b) - 1)
        if (look.glowAt === 'lines' && u > 0.06 && u < 0.86) {
          setGlow(X, at(0.45))
          if (x % 2 === 0) setGlow(X, at(0.78))
        }
      }
      if (look.glowAt === 'spots')
        for (const [su, st] of spots.slice(0, 10)) setGlow(x0 + Math.round(su * bodyLen), Math.round(topAt(su) + st * (botAt(su) - topAt(su))))
      if (look.glowAt === 'tail') for (let y = 0; y < Ht; y++) for (let x = 1; x < 4; x++) setGlow(x, y)
    }

    p.outline(0.6, (x, y) => !!glow.get(x, y))

    // face
    const nx = x0 + bodyLen - 1
    const eu = shape === 'angler' ? 0.8 : shape === 'chimaera' ? 0.84 : shape === 'flat' ? 0.84 : shape === 'hatchet' ? 0.82 : 0.87
    const [et, eb] = span(eu)
    const ey = Math.round(et + (eb - et) * (shape === 'flat' ? 0.2 : shape === 'angler' ? 0.16 : shape === 'hatchet' ? 0.3 : 0.34))
    const ex = x0 + Math.round(bodyLen * eu)
    const er = look.eye ?? (H >= 14 ? 2 : 1)
    const white = look.eyeColor ?? '#f4ecd0'
    const pupil = '#120c1e'
    const eyeGlow = look.glowAt === 'eye'
    const put = (x: number, y: number, c: string) => {
      p.set(x, y, c)
      if (eyeGlow && c !== pupil) {
        glow.set(x, y, c)
        glowAny = true
      }
    }
    if (er === 1) {
      put(ex, ey, white)
      put(ex + 1, ey, pupil)
      put(ex, ey + 1, pupil)
      put(ex + 1, ey + 1, pupil)
    } else {
      const R = er === 2 ? 2 : 3
      for (let j = -R; j < R; j++)
        for (let i = -R; i < R; i++) {
          const d = Math.hypot(i + 0.5, j + 0.5)
          if (d > R) continue
          put(ex + i, ey + j, d > R - 1.05 ? white : pupil)
        }
      put(ex - 1, ey - 1, '#ffffff')
    }

    const my = Math.round(cy + H * (shape === 'angler' ? 0.12 : 0.1))
    const lip = shade(look.mid, -0.62)
    if (look.bigMouth || shape === 'angler') {
      const back = Math.round(bodyLen * 0.28)
      for (let i = 0; i < back; i++) {
        p.set(nx - i, my, lip)
        if (look.teeth !== false && i % 2 === 0 && i > 0) {
          p.set(nx - i, my - 1, '#f8f2e2')
          if (i % 4 === 0) p.set(nx - i, my + 1, '#f8f2e2')
        }
      }
    } else {
      p.set(nx, my, lip)
      p.set(nx - 1, my, lip)
      if (look.teeth) {
        p.set(nx - 1, my - 1, '#f8f2e2')
        p.set(nx - 3, my - 1, '#f8f2e2')
        p.set(nx - 2, my + 1, '#f8f2e2')
      }
    }
    if (look.barbel) {
      const b = Math.round(botAt(0.92))
      p.set(nx - 2, b + 1, shade(look.belly, -0.3))
      p.set(nx - 2, b + 2, shade(look.belly, -0.3))
    }
    if (beakLen) {
      for (let i = 1; i <= beakLen; i++) {
        p.set(nx + i, Math.round(cy), shade(look.top, -0.25))
        if (i < beakLen) p.set(nx + i, Math.round(cy) + 1, shade(look.mid, -0.15))
      }
    }
    if (look.lure) {
      const sx = x0 + Math.round(bodyLen * 0.84)
      const sy = Math.round(topAt(0.84))
      const stalk = shade(look.top, -0.25)
      for (let j = 1; j <= 6; j++) p.set(sx, sy - j, stalk)
      for (let i = 1; i <= 3; i++) p.set(sx + i, sy - 6 - (i === 1 ? 1 : 0), stalk)
      const lc = look.glow ?? '#ffe08a'
      for (const [dx, dy] of [
        [4, -7],
        [5, -7],
        [4, -6],
        [5, -6],
      ]) {
        p.set(sx + dx, sy + dy, lc)
        glow.set(sx + dx, sy + dy, lc)
      }
      glowAny = true
    }

    mouthX = nx + beakLen
    mouthY = my
    right.push(p.toCanvas())
    glowRight.push(glowAny ? glow.toCanvas() : null)
  }

  return {
    right,
    left: right.map(flip),
    glowRight,
    glowLeft: glowRight.map((g) => (g ? flip(g) : null)),
    w: W,
    h: Ht,
    mouthX,
    mouthY,
  }
}
