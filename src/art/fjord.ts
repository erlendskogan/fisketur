// The fjord seen from the water: sky, sun and moon, clouds, layered hills and mist, and the
// light of the time of day. Shared by the harbour and the fishing scene so they always match.

import { canvas, hex2rgb, mix, rgba, rng, shade } from './pixel'
import { nightness } from './scenery'

// ---------- palette ----------

type SkyTable = [number, string, string][]

/** Deep Kingdom-style colours, thick mist and strong reflections */
export const PAL = {
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
  ] as SkyTable,
  /** far, mid and near hills by day and by night */
  hills: ['#4a6a9a', '#2e5272', '#1c3e3a'],
  nightHills: ['#1e2450', '#161c40', '#0c1226'],
  water: ['#2a7a9a', '#0e3a5a'],
  nightWater: ['#16285a', '#060c26'],
  nightTint: '#0c1240',
  mist: 0.75,
  /** how much of the scene shows in the water */
  reflect: 0.62,
  wobble: 1.1,
  vignette: 0.6,
  rays: 1,
  sunGlow: 1,
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

/** Sky colour at the zenith and at the horizon, greyed by rain and paled by fog */
export function skyAt(t: number, wx: Weather = CLEAR): [string, string] {
  let [top, hor] = lerpTable(PAL.sky, t)
  if (wx.rain > 0 || wx.fog > 0) {
    const night = nightness(t)
    const grey = mix('#6a7488', '#1a1e34', night)
    top = mix(top, grey, wx.rain * 0.55)
    hor = mix(hor, mix(grey, '#dce2ea', 0.25 * (1 - night)), wx.rain * 0.5)
    hor = mix(hor, mix('#c8d0dc', '#3a4064', night), wx.fog * 0.45)
  }
  return [top, hor]
}

export interface Weather {
  rain: number
  fog: number
}
export const CLEAR: Weather = { rain: 0, fog: 0 }

/** Light falling on the world through the day: [time, colour, strength]; 'night' means the night tint */
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

export function ambientAt(t: number): [string, number] {
  const col = (c: string) => (c === 'night' ? PAL.nightTint : c)
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
  return [PAL.nightTint, 0.6]
}

/** Tint everything already drawn in `g` with the light of the time of day */
export function tintAmbient(g: CanvasRenderingContext2D, t: number, w: number, h: number, strength = 1) {
  const [amb, a] = ambientAt(t)
  if (a <= 0) return
  g.globalCompositeOperation = 'source-atop'
  g.fillStyle = rgba(amb, a * strength)
  g.fillRect(0, 0, w, h)
  g.globalCompositeOperation = 'source-over'
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const bump = (t: number, c: number, w: number) => clamp01(1 - Math.abs(t - c) / w)
/** 1 around sunrise and sunset */
export const golden = (t: number) => Math.max(bump(t, 0.255, 0.07), bump(t, 0.715, 0.08))
const frac = (x: number) => x - Math.floor(x)
export const noise = (a: number, b: number) => frac(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453)

// ---------- soft pixel glows ----------

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
export const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16
const glowCache = new Map<string, HTMLCanvasElement>()

/** A round glow with dithered falloff, so it stays pixelly when scaled up */
export function glowSprite(r: number, col: string) {
  // colours that drift with the time of day are rounded so the cache stays small
  const [qr, qg, qb] = hex2rgb(col).map((v) => Math.round(v / 24) * 24)
  col = '#' + [qr, qg, qb].map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join('')
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
      const a = Math.floor((1 - d) * (1 - d) * 5 + bayer(x, y)) / 5
      if (a > 0) img.data.set([R, G, B, Math.round(a * 255)], (y * s + x) * 4)
    }
  g.putImageData(img, 0, 0)
  glowCache.set(key, c)
  return c
}

/** Draws a glow; set the composite operation ('lighter' for light) before calling */
export function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) {
  if (a <= 0.01) return
  g.globalAlpha = Math.min(1, a)
  g.drawImage(glowSprite(r, col), Math.round(x) - r, Math.round(y) - r)
  g.globalAlpha = 1
}

/** A glow added on top with the 'lighter' composite */
export function light(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) {
  const op = g.globalCompositeOperation
  g.globalCompositeOperation = 'lighter'
  glow(g, x, y, r, col, a)
  g.globalCompositeOperation = op
}

/** A filled pixel circle with a brighter core */
export function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, rim: string, core: string) {
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

export function makeVignette(W: number, H: number) {
  const { c, g } = canvas(W, H)
  const img = g.createImageData(W, H)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const nx = (x - W / 2) / (W / 2)
      const ny = (y - H * 0.45) / (H * 0.62)
      const a = clamp01((Math.hypot(nx, ny) - 0.72) / 0.6)
      const q = Math.floor(a * 4 + bayer(x, y)) / 4
      if (q > 0) img.data.set([10, 8, 32, Math.round(q * 0.75 * 255)], (y * W + x) * 4)
    }
  g.putImageData(img, 0, 0)
  return c
}

// ---------- hills and clouds ----------

export function ridgeLine(w: number, seed: number, base: number, amp: number, peaky: number) {
  const r = rng(seed)
  const ph = Array.from({ length: 5 }, () => r() * 6.28)
  return Array.from({ length: w }, (_, x) => {
    const smooth = 0.5 * Math.sin(x * 0.018 + ph[0]) + 0.3 * Math.sin(x * 0.047 + ph[1]) + 0.12 * Math.sin(x * 0.11 + ph[2])
    const a = 1 - Math.abs(Math.sin(x * 0.026 + ph[3]))
    const b = 1 - Math.abs(Math.sin(x * 0.061 + ph[4]))
    return Math.max(2, Math.round(base + amp * (smooth * (1 - peaky) + (a * a * 1.2 + b * b * 0.4 - 0.6) * peaky)))
  })
}

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

// ---------- the backdrop ----------

export interface Sky {
  top: string
  hor: string
  night: number
  gold: number
  /** the sun, or the moon at night, if it is up */
  sun: { x: number; y: number; c: string } | null
}

/**
 * Everything behind the foreground, from the zenith down to the waterline at the bottom
 * edge: sky, stars, sun, moon, clouds, three layers of hills with pines, mist and the lights
 * of farms on the far shore.
 */
export class Backdrop {
  W = 0
  H = 0
  /** average screen height of the far ridge, which the sun rises from behind */
  ridgeTop = 0
  private ridges = { far: [] as number[], mid: [] as number[], near: [] as number[] }
  private pines: { x: number; h: number }[] = []
  private shoreLights: { x: number; y: number; on: number }[] = []
  private stars: { x: number; y: number; p: number; b: number }[] = []
  private clouds: Cloud[] = []
  private skyC = canvas(1, 1)
  private hillsC = canvas(1, 1)
  private cacheKey = ''
  private wx: Weather = CLEAR
  private storm: { c: HTMLCanvasElement; key: string } | null = null
  private shooting: { x: number; y: number; age: number } | null = null
  private r = rng(91)

  /**
   * @param seed changes the shape of the hills
   * @param scale height of the hills; lower looks further away
   */
  resize(W: number, H: number, seed = 0, scale = 1) {
    this.W = W
    this.H = H
    const deck = H - 24
    this.ridges = {
      far: ridgeLine(W, 21 + seed, (deck * 0.4 + 28) * scale, deck * 0.12 * scale, 0.65),
      mid: ridgeLine(W, 8 + seed, (deck * 0.24 + 26) * scale, deck * 0.07 * scale, 0.4),
      near: ridgeLine(W, 4 + seed, 34 * scale, 8 * scale, 0.1),
    }
    this.ridgeTop = H - this.ridges.far.reduce((a, b) => a + b, 0) / W
    const r = rng(11 + seed)
    this.pines = []
    for (let x = 0; x < W; x += 2 + Math.floor(r() * 3)) if (r() < 0.75) this.pines.push({ x, h: 3 + Math.floor(r() * 6 * Math.min(1, scale + 0.2)) })
    this.shoreLights = Array.from({ length: 5 }, () => {
      const x = Math.floor(r() * W)
      return { x, y: H - 2 - Math.floor(r() * Math.min(10, this.ridges.near[x] - 4)), on: 0.3 + r() * 0.4 }
    })
    this.stars = Array.from({ length: 70 }, () => ({ x: Math.floor(r() * W), y: r() * r(), p: r() * 6, b: r() }))
    this.clouds = Array.from({ length: 6 }, (_, i) => {
      const far = i < 3
      const w = far ? 14 + Math.floor(r() * 10) : 26 + Math.floor(r() * 16)
      const h = far ? 4 + Math.floor(r() * 2) : 7 + Math.floor(r() * 4)
      return { x: r() * W, y: Math.round((far ? 0.08 + r() * 0.2 : 0.12 + r() * 0.25) * H), speed: far ? 0.6 + r() * 0.5 : 1.4 + r() * 1, w, runs: makeCloud(r, w, h) }
    })
    this.skyC = canvas(W, H)
    this.hillsC = canvas(W, H)
    this.cacheKey = ''
  }

  update(dt: number) {
    const r = this.r
    if (!this.shooting && r() < dt * 0.04) this.shooting = { x: r() * this.W, y: r() * this.H * 0.3, age: 0 }
    if (this.shooting) {
      this.shooting.age += dt / 0.7
      if (this.shooting.age >= 1) this.shooting = null
    }
  }

  private paintCaches(t: number) {
    const wx = this.wx
    const key = `${Math.round(t * 1000)}|${Math.round(wx.rain * 12)}|${Math.round(wx.fog * 12)}`
    if (key === this.cacheKey) return
    this.cacheKey = key
    const { W, H } = this
    const night = nightness(t)
    const gold = golden(t) * (1 - night)
    const [top, hor] = skyAt(t, wx)
    const [amb, ambA] = ambientAt(t)

    bandGradient(this.skyC.g, W, H, top, hor, 28)

    const g = this.hillsC.g
    g.clearRect(0, 0, W, H)
    const layers = [
      { r: this.ridges.far, i: 0, haze: 0.42, snow: 0.55 },
      { r: this.ridges.mid, i: 1, haze: 0.22, snow: 0.82 },
      { r: this.ridges.near, i: 2, haze: 0.04, snow: 0 },
    ]
    for (const ly of layers) {
      let base = mix(PAL.hills[ly.i], PAL.nightHills[ly.i], night)
      base = mix(base, hor, ly.haze * (1 - night * 0.5))
      base = mix(base, amb, ambA * 0.55)
      // fog swallows the far hills first
      base = mix(base, hor, wx.fog * (0.75 - ly.i * 0.2) + wx.rain * 0.2 * (2 - ly.i))
      const lit = shade(base, 0.12)
      const dark = shade(base, -0.12)
      const foot = mix(base, hor, 0.22 + ly.haze * 0.5)
      const snowC = mix(mix('#f4f8ff', '#ffd0b0', gold * 0.6), '#7a84b8', night * 0.8)
      const lo = Math.min(...ly.r)
      const hi = Math.max(...ly.r)
      const snowLine = lo + (hi - lo) * ly.snow
      for (let x = 0; x < W; x++) {
        const h = ly.r[x]
        const y0 = H - h
        g.fillStyle = base
        g.fillRect(x, y0, 1, h)
        const fh = Math.round(h * 0.3)
        g.fillStyle = foot
        g.fillRect(x, H - fh + (x % 2), 1, fh)
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
          const y0 = H - ly.r[p.x] - p.h + 1
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
          g.fillStyle = rgba(hor, PAL.mist * 0.055)
          for (let x = 0; x < W; x++) {
            const h = ly.r[x]
            const hh = Math.round(h * (1 - k / steps) * 0.75 + ((x + k) % 2))
            g.fillRect(x, H - hh, 1, hh)
          }
        }
      }
    }
  }

  /** Draws the backdrop into `g` (which must be at least W×H) and returns the light of the moment */
  draw(sg: CanvasRenderingContext2D, t: number, time: number, wx: Weather = CLEAR): Sky {
    this.wx = wx
    const clear = 1 - wx.rain * 0.85
    const { W, H } = this
    const night = nightness(time)
    const gold = golden(time) * (1 - night)
    const [skyTop, hor] = skyAt(time, wx)
    this.paintCaches(time)

    sg.drawImage(this.skyC.c, 0, 0)
    if (night > 0.05) {
      for (const st of this.stars) {
        const tw = Math.sin(t * (1 + st.b) + st.p)
        sg.fillStyle = `rgba(255,250,230,${night * clear * (1 - wx.fog * 0.6) * (0.35 + 0.65 * st.b) * (tw > 0.3 ? 1 : 0.45)})`
        const y = Math.round(st.y * H * 0.75)
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
    let sun: Sky['sun'] = null
    const sk = (time - 0.21) / 0.56
    if (sk > 0 && sk < 1) {
      const lift = Math.sin(Math.PI * sk)
      const x = W * (0.08 + 0.84 * sk)
      const y = this.ridgeTop + 6 - lift * (this.ridgeTop - 8)
      const c = mix('#fff4c8', '#ff7a3a', (1 - lift) ** 2)
      sun = { x, y, c }
      light(sg, x, y, 34, c, 0.22 * PAL.sunGlow * (clear + wx.fog * 0.3))
      light(sg, x, y, 14, '#fff0c0', 0.4 * PAL.sunGlow * clear)
      sg.globalAlpha = Math.max(0.1, 1 - wx.rain * 0.9 - wx.fog * 0.5)
      disc(sg, x, y, 4, c, '#fffbe8')
      sg.globalAlpha = 1
    }
    const mk = ((time - 0.74 + 1) % 1) / 0.52
    if (mk > 0 && mk < 1 && night > 0.05) {
      const lift = Math.sin(Math.PI * mk)
      const x = W * (0.85 - 0.7 * mk)
      const y = H - 14 - lift * H * 0.6
      sun ??= { x, y, c: '#c8d8ff' }
      light(sg, x, y, 22, '#8aa8ff', 0.3 * night)
      sg.globalAlpha = night
      disc(sg, x, y, 3, '#d8d4c4', '#f8f4e4')
      sg.fillStyle = '#b8b4a4'
      sg.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 1)
      sg.fillRect(Math.round(x) - 1, Math.round(y) + 1, 1, 1)
      sg.globalAlpha = 1
    }

    // clouds
    let cBase = mix(mix('#f4f6ff', mix(hor, '#ffb890', 0.3), 0.15 + gold * 0.7), '#2e2e62', night * 0.85)
    cBase = mix(cBase, mix('#7a8296', '#2a2e48', night), wx.rain * 0.7)
    const cHi = mix(mix('#ffffff', '#ffd8a8', gold), mix(cBase, '#9aa0d8', 0.4), night)
    const cSh = mix(cBase, skyTop, 0.45)
    const cols = ['', cBase, cHi, cSh]
    for (const c of this.clouds) {
      const span = W + c.w + 20
      const cx = Math.round((((c.x + t * c.speed) % span) + span) % span) - c.w - 10
      for (const lv of [1, 2, 3]) {
        sg.fillStyle = cols[lv]
        for (const [y, x, len, l] of c.runs) if (l === lv) sg.fillRect(cx + x, c.y + y, len, 1)
      }
    }

    if (wx.rain > 0) this.drawStorm(sg, t, night, wx.rain)
    sg.drawImage(this.hillsC.c, 0, 0)
    // the low sun lights up the haze over the ridges
    if (sun && gold > 0) light(sg, sun.x, Math.max(sun.y, this.ridgeTop), 44, sun.c, gold * 0.3 * PAL.sunGlow)

    // mist rolling at the foot of the hills
    const mc = mix(hor, '#ffffff', 0.18 * (1 - night))
    for (const [amp, a, off] of [
      [6, 0.16, 0],
      [3.5, 0.3, 2],
    ]) {
      sg.fillStyle = rgba(mc, Math.min(0.9, PAL.mist * a * (1 + wx.fog * 1.5)))
      sg.beginPath()
      for (let x = 0; x < W; x++) {
        const h = Math.round(amp * (1 + wx.fog * 2.5) + 2 * Math.sin(x * 0.06 + t * 0.25 + off) + 1.5 * Math.sin(x * 0.15 - t * 0.4 + off))
        if (h > 0) sg.rect(x, H - h, 1, h)
      }
      sg.fill()
    }
    if (night > 0.2)
      for (const l of this.shoreLights) {
        const a = clamp01((night - l.on) * 4)
        sg.fillStyle = rgba('#ffd070', a)
        sg.fillRect(l.x, l.y, 1, 1)
        light(sg, l.x, l.y, 3, '#ff9a40', a * 0.4)
      }
    return { top: skyTop, hor, night, gold: gold * clear, sun: wx.rain > 0.7 ? null : sun }
  }

  /** A heavy, dithered cloud deck that rolls in with the rain */
  private drawStorm(g: CanvasRenderingContext2D, t: number, night: number, rain: number) {
    const { W, H } = this
    const key = `${W}x${H}|${Math.round(night * 4)}`
    if (this.storm?.key !== key) {
      const h = Math.round(H * 0.5)
      const { c, g: sg } = canvas(W, h)
      const img = sg.createImageData(W, h)
      const dark = hex2rgb(mix('#4a5268', '#141830', night))
      const lit = hex2rgb(mix('#8a94a8', '#2a3050', night))
      // a flat deck with round puffs hanging from its underside
      const r = rng(5)
      const puffs = Array.from({ length: Math.ceil(W / 7) + 2 }, (_, i) => ({ x: i * 7 - 6 + r() * 5, y: h * (0.28 + r() * 0.22), rad: 5 + r() * 8 }))
      const cover = (x: number, y: number) => {
        let best = h * 0.3 - y
        for (const p of puffs) best = Math.max(best, p.rad - Math.hypot(x - p.x, (y - p.y) * 1.3))
        return best
      }
      for (let y = 0; y < h; y++)
        for (let x = 0; x < W; x++) {
          const v = cover(x, y)
          if (v < -1.5) continue
          // a dithered fringe, and a paler rim along the bottom of each puff
          if (v < 0 && bayer(x, y) > (v + 1.5) / 1.5) continue
          const below = cover(x, y + 2)
          const col = below < 0 ? lit : dark
          img.data.set([...col, v < 0 ? 200 : 255], (y * W + x) * 4)
        }
      sg.putImageData(img, 0, 0)
      this.storm = { c, key }
    }
    const off = Math.round((t * 1.5) % W)
    g.globalAlpha = Math.min(1, rain * 1.3)
    g.drawImage(this.storm.c, off, 0)
    g.drawImage(this.storm.c, off - W, 0)
    g.globalAlpha = 1
  }

  /** Fog lying over the foreground, thickest near the water */
  fogOver(g: CanvasRenderingContext2D, sky: Sky, fog: number) {
    if (fog <= 0.02) return
    const { W, H } = this
    const c = mix(sky.hor, '#ffffff', 0.1 * (1 - sky.night))
    for (let b = 0; b < 8; b++) {
      const y = Math.floor(H * (0.3 + b * 0.0875))
      const y1 = Math.floor(H * (0.3 + (b + 1) * 0.0875))
      g.fillStyle = rgba(c, fog * 0.075 * (b + 1))
      g.fillRect(0, y, W, y1 - y)
    }
  }
}

/** Vertical gradient in flat bands with a dithered seam between them */
function bandGradient(g: CanvasRenderingContext2D, w: number, h: number, top: string, bot: string, bands: number) {
  const bh = h / bands
  for (let i = 0; i < bands; i++) {
    const y = Math.floor(i * bh)
    g.fillStyle = mix(top, bot, i / (bands - 1))
    g.fillRect(0, y, w, Math.ceil(bh) + 1)
    if (i > 0) {
      g.fillStyle = mix(top, bot, (i - 1) / (bands - 1))
      for (let x = 0; x < w; x += 2) g.fillRect(x + (y % 2), y, 1, 1)
    }
  }
}

const flipped = new Map<HTMLCanvasElement, ReturnType<typeof canvas>>()

/**
 * The water below a scene, with the scene mirrored in it row by row (Kingdom style).
 * `src` holds the scene with its waterline on its bottom edge. Rows that wobble by the
 * same amount are drawn together, so this stays cheap.
 */
export function drawReflection(
  g: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  t: number,
  sky: Sky,
  y0: number,
  rows: number,
  opts: { fill?: boolean; fade?: number } = {},
) {
  const W = src.width
  const wl = src.height
  const { night, gold, hor } = sky
  const fade = opts.fade ?? 0.55
  if (opts.fill !== false) {
    const w0 = mix(mix(PAL.water[0], PAL.nightWater[0], night), hor, 0.25 + gold * 0.2)
    const w1 = mix(PAL.water[1], PAL.nightWater[1], night)
    const bands = 24
    for (let b = 0; b < bands; b++) {
      const a = Math.floor((b * rows) / bands)
      const e = Math.floor(((b + 1) * rows) / bands)
      g.fillStyle = mix(w0, w1, Math.min(1, (a / rows) * 1.2))
      g.fillRect(0, y0 + a, W, e - a)
    }
  }
  // the scene upside down, so mirrored rows run in the same direction as the water
  let f = flipped.get(src)
  if (!f || f.c.width !== W || f.c.height !== wl) {
    f = canvas(W, wl)
    flipped.set(src, f)
  }
  f.g.clearRect(0, 0, W, wl)
  f.g.setTransform(1, 0, 0, -1, 0, wl)
  f.g.drawImage(src, 0, 0)
  f.g.setTransform(1, 0, 0, 1, 0, 0)
  const n = Math.min(rows, wl)
  let start = 0
  let runWob = 0
  let runA = -1
  const flush = (end: number) => {
    if (runA > 0 && end > start) {
      g.globalAlpha = runA
      g.drawImage(f!.c, 0, start, W, end - start, runWob, y0 + start, W, end - start)
    }
  }
  for (let d = 0; d < n; d++) {
    const k = d / rows
    const wob = Math.round(Math.sin(t * 1.7 + d * 0.42) * PAL.wobble * (0.5 + k * 2) + Math.sin(t * 0.6 + d * 0.11) * 0.7)
    const a = Math.round(Math.max(0, PAL.reflect * (1 - k * fade)) * 20) / 20
    if (wob !== runWob || a !== runA) {
      flush(d)
      start = d
      runWob = wob
      runA = a
    }
  }
  flush(n)
  g.globalAlpha = 1
}

/** Glinting light on the water below the sun or moon */
export function drawGlitter(g: CanvasRenderingContext2D, t: number, sky: Sky, y0: number, rows: number) {
  if (!sky.sun) return
  const { x: sx, c } = sky.sun
  g.globalCompositeOperation = 'lighter'
  for (let d = 1; d < rows; d += 2) {
    const k = d / rows
    const spread = 3 + k * 18
    for (let j = 0; j < 2; j++) {
      const q = noise(d + j * 31, Math.floor(t * 5 + d * 0.3))
      if (q > 0.55) continue
      g.fillStyle = rgba(c, (0.3 + 0.4 * (1 - k)) * (sky.night > 0.5 ? 0.6 : 1))
      g.fillRect(Math.round(sx + (q / 0.55 - 0.5) * 2 * spread), y0 + d, q < 0.15 ? 2 : 1, 1)
    }
  }
  g.globalCompositeOperation = 'source-over'
}

/** Light ripples drifting on the surface */
export function drawRipples(g: CanvasRenderingContext2D, t: number, sky: Sky, W: number, y0: number, rows: number, n = 40) {
  const hi = rippleColour(sky)
  for (let i = 0; i < n; i++) {
    const d = 2 + ((i * 53) % Math.max(4, rows - 2))
    const k = d / rows
    const len = 2 + Math.round(k * 7) + (i % 3)
    const span = W + 20
    const x = ((((i * 71 + t * (2 + (i % 5)) * (i % 2 ? 1 : -1)) % span) + span) % span) - 10
    g.fillStyle = rgba(hi, (0.1 + 0.28 * k) * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7)))
    g.fillRect(Math.round(x), y0 + d, len, 1)
  }
}

export const rippleColour = (sky: Sky) => (sky.night > 0.5 ? '#9ab8e8' : mix('#ffffff', sky.hor, 0.3))
