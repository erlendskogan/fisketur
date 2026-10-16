// The weather: some days a shower blows in over the fjord, some mornings start in fog.
// It follows from the day number, so it is the same every time you look.

import type { Weather } from '../art/fjord'
import { rng } from '../art/pixel'
import { WORLD } from './data'

export type { Weather }

/** Overrides for the dev panel */
export const devWeather = { rain: null as number | null, fog: null as number | null }

const ease = (a: number, b: number, fade: number, t: number) => Math.max(0, Math.min(1, (t - a) / fade, (b - t) / fade))

export function weatherAt(day: number, time: number): Weather {
  const r = rng(day * 7919 + 13)
  r()
  // the very first day is always fine
  // Petersburg gets more than twice the rain of home, and its mornings are often grey
  const ak = WORLD === 'alaska'
  const hi = WORLD === 'hawaii'
  const lo = WORLD === 'lofoten'
  const showers = day > 0 && r() < (ak ? 0.55 : hi ? 0.5 : lo ? 0.5 : 0.32)
  const start = 0.3 + r() * 0.4
  const len = 0.08 + r() * 0.14
  const heavy = 0.5 + r() * 0.5
  const foggy = day > 0 && r() < (ak ? 0.45 : hi ? 0.12 : lo ? 0.2 : 0.35)
  const thick = 0.6 + r() * 0.4
  const rain = showers ? ease(start, start + len, 0.03, time) * heavy : 0
  // fog settles before dawn and burns off in the morning
  const fog = foggy ? ease(0.12, 0.38 + thick * 0.05, 0.06, time) * thick : 0
  return { rain: devWeather.rain ?? rain, fog: devWeather.fog ?? fog }
}

// ---------- rain ----------

interface Drop {
  x: number
  y: number
  v: number
  len: number
  k: number
}

/** Streaks of rain falling over a scene, with splashes where they land */
export class Rain {
  private drops: Drop[] = []
  private splashes: { x: number; y: number; t: number }[] = []
  private W = 0
  private H = 0

  resize(W: number, H: number) {
    this.W = W
    this.H = H
    const r = rng(17)
    this.drops = Array.from({ length: 140 }, () => ({ x: r() * W, y: r() * H, v: 150 + r() * 80, len: 3 + Math.floor(r() * 3), k: r() }))
    this.splashes = []
  }

  /** `floor(x, k)` gives the screen y where a drop at x lands; k is a random number fixed per drop */
  /** in Lofoten the showers come as snow */
  snow = false
  private t = 0

  update(dt: number, amount: number, floor: (x: number, k: number) => number) {
    this.snow = WORLD === 'lofoten'
    this.t += dt
    if (amount <= 0) {
      this.splashes = []
      return
    }
    for (const d of this.drops) {
      if (this.snow) {
        d.y += d.v * 0.14 * dt
        d.x += Math.sin(this.t * 1.3 + d.k * 20) * 10 * dt - 4 * dt
      } else {
        d.y += d.v * dt
        d.x -= d.v * 0.25 * dt
      }
      const f = floor(d.x, d.k)
      if (d.y >= f) {
        if (!this.snow && Math.random() < amount && f < this.H) this.splashes.push({ x: d.x, y: f, t: 0 })
        d.y = -Math.random() * 40
        d.x = Math.random() * (this.W + 40)
        d.k = Math.random()
      }
    }
    for (const s of this.splashes) s.t += dt / 0.35
    this.splashes = this.splashes.filter((s) => s.t < 1)
  }

  draw(g: CanvasRenderingContext2D, amount: number, night: number) {
    if (amount <= 0) return
    const n = Math.floor(this.drops.length * amount)
    if (this.snow) {
      g.fillStyle = night > 0.5 ? 'rgba(200,210,240,0.8)' : 'rgba(255,255,255,0.9)'
      g.beginPath()
      for (let i = 0; i < n; i++) {
        const d = this.drops[i]
        g.rect(Math.round(d.x), Math.round(d.y), d.len > 4 ? 2 : 1, d.len > 4 ? 2 : 1)
      }
      g.fill()
      return
    }
    g.fillStyle = night > 0.5 ? `rgba(150,170,220,${0.3 + amount * 0.15})` : `rgba(210,225,245,${0.3 + amount * 0.2})`
    g.beginPath()
    for (let i = 0; i < n; i++) {
      const d = this.drops[i]
      const x = Math.round(d.x)
      const y = Math.round(d.y)
      for (let k = 0; k < d.len; k++) g.rect(x + Math.floor(k / 3), y - k, 1, 1)
    }
    g.fill()
    g.fillStyle = night > 0.5 ? 'rgba(170,190,230,0.6)' : 'rgba(235,245,255,0.7)'
    g.beginPath()
    for (const s of this.splashes) {
      const x = Math.round(s.x)
      const y = Math.round(s.y)
      if (s.t < 0.4) {
        g.rect(x - 1, y - 1, 1, 1)
        g.rect(x + 1, y - 1, 1, 1)
      } else {
        const w = 1 + Math.round(s.t * 3)
        g.rect(x - w, y, 1, 1)
        g.rect(x + w, y, 1, 1)
      }
    }
    g.fill()
  }
}
