// The harbour: Krambua, Havnebua, Havstasjonen and the lighthouse

import { Pix, canvas, rgba, shade, rng } from '../art/pixel'
import { boatSprite, catSprites, INK } from '../art/sprites'
import { bandGradient, drawBeam, drawRidge, lighthouseSprite, nightness, ridge, skyAt } from '../art/scenery'
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

interface HouseOpts {
  w: number
  wallH: number
  gable: number
  wall: string
  roof: string
  trim: string
  windows: [number, number][]
  door: [number, number, number]
  sod?: boolean
  flat?: boolean
  boarded?: boolean
  stripe?: string
}

function house(o: HouseOpts) {
  const W = o.w + 6
  const top = o.flat ? 8 : o.gable + 2
  const Hh = top + o.wallH
  const p = new Pix(W, Hh + 1)
  const x0 = 3
  const lights: [number, number, number, number][] = []
  // walls with planks
  for (let y = top; y < Hh; y++)
    for (let x = x0; x < x0 + o.w; x++) {
      let c = (x - x0) % 3 === 0 ? shade(o.wall, -0.1) : o.wall
      if (o.stripe && y >= top + 3 && y < top + 5) c = o.stripe
      if (x < x0 + 2) c = shade(c, -0.1)
      p.set(x, y, c)
    }
  if (o.flat) {
    p.rect(x0 - 2, top - 3, o.w + 4, 3, o.roof)
    p.rect(x0 - 2, top - 3, o.w + 4, 1, shade(o.roof, 0.2))
    // antenna and a little dish
    for (let y = 0; y < top - 3; y++) p.set(x0 + o.w - 6, y, '#8a8a9a')
    p.rect(x0 + 4, top - 7, 5, 2, '#d8dce4')
    p.rect(x0 + 5, top - 8, 3, 1, '#d8dce4')
    p.set(x0 + 6, top - 5, '#8a8a9a')
    p.set(x0 + 6, top - 4, '#8a8a9a')
  } else {
    // gable
    const cx = x0 + o.w / 2
    for (let j = 0; j <= o.gable; j++) {
      const y = top - o.gable + j - 1
      const hw = (o.w / 2) * (j / o.gable)
      for (let x = Math.floor(cx - hw); x < Math.ceil(cx + hw); x++) p.set(x, y, (x - x0) % 3 === 0 ? shade(o.wall, -0.1) : o.wall)
      // roof edges
      const thick = o.sod ? 3 : 2
      for (let k = 0; k < thick; k++) {
        const roofC = o.sod ? (k === thick - 1 ? '#7ac04a' : '#5a9a3a') : k === 0 ? o.roof : shade(o.roof, 0.18)
        p.set(Math.floor(cx - hw) - 1 - k, y, roofC)
        p.set(Math.ceil(cx + hw) + k, y, roofC)
      }
      if (o.sod && j % 4 === 2) {
        p.set(Math.floor(cx - hw) - 3, y - 1, '#f2e2ea')
        p.set(Math.ceil(cx + hw) + 2, y - 1, '#ffd84a')
      }
    }
    // white barge boards crossing at the peak
    p.set(Math.round(cx) - 1, top - o.gable - 3, o.trim)
    p.set(Math.round(cx), top - o.gable - 3, o.trim)
    p.set(Math.round(cx) - 2, top - o.gable - 4, o.trim)
    p.set(Math.round(cx) + 1, top - o.gable - 4, o.trim)
  }
  // windows
  for (const [wx, wy] of o.windows) {
    const X = x0 + wx
    const Y = top + wy
    p.rect(X, Y, 6, 6, o.trim)
    if (o.boarded) {
      p.rect(X + 1, Y + 1, 4, 4, '#7a5a3a')
      p.set(X + 1, Y + 1, '#5a3a2a')
      p.set(X + 4, Y + 4, '#5a3a2a')
    } else {
      p.rect(X + 1, Y + 1, 4, 4, '#2a3a5a')
      p.set(X + 1, Y + 1, '#8ab8d8')
      p.rect(X + 1, Y + 3, 4, 0, o.trim)
      p.set(X + 3, Y + 1, o.trim)
      p.set(X + 3, Y + 2, o.trim)
      p.set(X + 3, Y + 3, o.trim)
      p.set(X + 3, Y + 4, o.trim)
      p.set(X + 1, Y + 3, o.trim)
      p.set(X + 2, Y + 3, o.trim)
      p.set(X + 4, Y + 3, o.trim)
      lights.push([X + 1, Y + 1, 4, 4])
    }
  }
  // door
  const [dx, dw, dh] = o.door
  p.rect(x0 + dx - 1, Hh - dh - 1, dw + 2, dh + 1, o.trim)
  p.rect(x0 + dx, Hh - dh, dw, dh, o.boarded ? '#6a5a4a' : '#5a3a2a')
  if (dw > 4) for (let y = Hh - dh; y < Hh; y++) p.set(x0 + dx + Math.floor(dw / 2), y, '#3a2a22')
  p.set(x0 + dx + dw - 2, Hh - Math.round(dh / 2), '#ffd84a')
  p.outline(0.55)
  return { c: p.toCanvas(), lights, top }
}

export class Harbor {
  W = 0
  H = 0
  deckY = 0
  spots: Spot[] = []
  private front: HTMLCanvasElement | null = null
  private lights: [number, number, number, number][] = []
  private key = ''
  private ridges = { far: [] as number[], near: [] as number[] }
  private lh = { off: lighthouseSprite(false, 'big'), on: lighthouseSprite(true, 'big') }
  private lhPos = { x: 0, y: 0 }
  private boat: HTMLCanvasElement | null = null
  private paint = ''
  private cats = catSprites()
  private stars: { x: number; y: number; p: number }[] = []
  t = 0

  constructor(private host: { s: Save }) {}

  resize(W: number, H: number) {
    if (W === this.W && H === this.H) return
    this.W = W
    this.H = H
    this.deckY = Math.round(H * 0.54)
    this.ridges = { far: ridge(W, 21, 92, 30), near: ridge(W, 4, 50, 16) }
    const r = rng(11)
    this.stars = Array.from({ length: 50 }, () => ({ x: Math.floor(r() * W), y: r(), p: r() * 6 }))
    this.key = ''
  }

  private rebuild() {
    const s = this.host.s
    const key = `${this.W}x${this.H}:${!!s.flags.selma}:${!!s.flags.ending}`
    if (key === this.key) return
    this.key = key
    const { W, H, deckY } = this
    const { c, g } = canvas(W, H)
    this.lights = []
    this.spots = []

    // the quay
    const quayW = Math.round(W * 0.8)
    g.fillStyle = '#6a4a32'
    g.fillRect(0, deckY, quayW, 5)
    g.fillStyle = '#8a6242'
    for (let x = 0; x < quayW; x += 7) g.fillRect(x, deckY, 6, 1)
    g.fillStyle = '#4a3222'
    g.fillRect(0, deckY + 4, quayW, 1)
    for (let x = 4; x < quayW; x += 14) {
      g.fillStyle = '#4a3222'
      g.fillRect(x, deckY + 5, 3, 22)
      g.fillStyle = '#5a4030'
      g.fillRect(x, deckY + 5, 1, 22)
    }

    const place = (id: SpotId, o: HouseOpts, x: number) => {
      const h = house(o)
      const y = deckY - h.c.height + 1
      g.drawImage(h.c, x, y)
      for (const [lx, ly, lw, lh] of h.lights) this.lights.push([x + lx, y + ly, lw, lh])
      this.spots.push({ id, x, y: y - 2, w: h.c.width, h: h.c.height + 4 })
    }
    const kw = Math.round(W * 0.3)
    place(
      'krambua',
      { w: kw, wallH: 32, gable: Math.round(kw * 0.36), wall: '#c8423a', roof: '#3a3440', trim: '#f4ecdc', windows: [[4, 6], [kw - 10, 6], [Math.round(kw / 2) - 3, -9]], door: [Math.round(kw / 2) - 4, 8, 14] },
      Math.round(W * 0.02),
    )
    const hw = Math.round(W * 0.17)
    place(
      'havnebua',
      { w: hw, wallH: 22, gable: Math.round(hw * 0.38), wall: '#f2b43a', roof: '#5a9a3a', trim: '#f4ecdc', windows: [[3, 5]], door: [hw - 9, 6, 12], sod: true },
      Math.round(W * 0.35),
    )
    const sw = Math.round(W * 0.2)
    const selma = !!s.flags.selma
    place(
      'stasjon',
      {
        w: sw,
        wallH: 28,
        gable: 0,
        flat: true,
        wall: selma ? '#e8eef2' : '#b8b0a4',
        roof: selma ? '#5a6a7a' : '#6a625a',
        trim: selma ? '#f8fafc' : '#d8d0c4',
        stripe: selma ? '#2aa59a' : undefined,
        windows: [[3, 8], [sw - 9, 8]],
        door: [Math.round(sw / 2) - 3, 6, 13],
        boarded: !selma,
      },
      Math.round(W * 0.54),
    )

    // the lighthouse on its rock
    const lh = s.flags.ending ? this.lh.on : this.lh.off
    const lx = W - lh.c.width - 2
    const ly = deckY + 14 - lh.c.height
    const rock = new Pix(lh.c.width + 14, 26)
    const rr = rng(3)
    for (let y = 0; y < 26; y++)
      for (let x = 0; x < rock.w; x++) {
        const cx = rock.w / 2
        const half = cx * Math.min(1, 0.45 + y / 18) - (y < 4 ? 4 - y : 0) * 1.2
        if (Math.abs(x - cx) > half + Math.sin(y * 1.7 + x) * 0.8) continue
        rock.set(x, y, rr() < 0.15 ? '#5a5a6e' : x < cx - 3 ? '#4a4a5c' : '#6a6a7e')
      }
    rock.outline(0.5)
    g.drawImage(rock.toCanvas(), lx - 7, deckY + 8)
    g.drawImage(lh.c, lx, ly)
    this.lhPos = { x: lx + lh.lamp.x, y: ly + lh.lamp.y }
    this.spots.push({ id: 'fyret', x: lx - 6, y: ly - 4, w: lh.c.width + 12, h: lh.c.height + 18 })
    this.spots.push({ id: 'baten', x: Math.round(W * 0.12), y: deckY + 8, w: 56, h: 26 })

    // lamp posts
    for (const x of [Math.round(W * 0.33), Math.round(W * 0.52)]) {
      g.fillStyle = INK
      g.fillRect(x, deckY - 16, 2, 16)
      g.fillRect(x - 1, deckY - 19, 4, 4)
      g.fillStyle = '#ffd36a'
      g.fillRect(x, deckY - 18, 2, 2)
      this.lights.push([x, deckY - 18, 2, 2])
    }
    this.front = c
  }

  update(dt: number) {
    this.t += dt
  }

  draw(g: CanvasRenderingContext2D) {
    this.rebuild()
    const s = this.host.s
    const { W, H, deckY } = this
    const time = s.time
    const night = nightness(time)
    const [top, bot] = skyAt(time)
    bandGradient(g, 0, 0, W, deckY + 6, top, bot, 10)
    if (night > 0.05)
      for (const st of this.stars) {
        g.fillStyle = `rgba(255,250,230,${night * (Math.sin(this.t * 1.5 + st.p) > 0.2 ? 1 : 0.5)})`
        g.fillRect(st.x, Math.round(st.y * deckY * 0.6), 1, 1)
      }
    // clouds
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 61 + this.t * (1.5 + i * 0.5)) % (W + 70)) - 35
      const cy = 30 + ((i * 41) % Math.max(30, Math.round(deckY * 0.45)))
      g.fillStyle = night > 0.5 ? 'rgba(80,80,130,0.5)' : time > 0.62 ? 'rgba(255,214,200,0.85)' : 'rgba(255,255,255,0.85)'
      g.fillRect(Math.round(cx), cy, 26, 3)
      g.fillRect(Math.round(cx) + 5, cy - 3, 12, 3)
      g.fillRect(Math.round(cx) + 14, cy - 2, 7, 2)
    }
    drawRidge(g, this.ridges.far, deckY - 4, shade(bot, -0.25), night > 0.5 ? '#9aa4c8' : '#f4f8ff')
    drawRidge(g, this.ridges.near, deckY - 2, night > 0.5 ? '#1e2a3e' : shade('#3a6a5a', -0.1 - night * 0.3))

    // water
    bandGradient(g, 0, deckY + 5, W, H - deckY - 5, night > 0.5 ? '#1a3a6a' : '#3ab0d8', night > 0.5 ? '#0e1a3a' : '#1f6f9a', 8)
    for (let i = 0; i < 26; i++) {
      const y = deckY + 8 + ((i * 17) % Math.max(10, H - deckY - 10))
      const x = (i * 47 + Math.sin(this.t * 0.8 + i) * 6) % W
      g.fillStyle = rgba('#e8fbff', 0.25 + 0.2 * Math.sin(this.t * 2 + i))
      g.fillRect(Math.round(x), y, 4 + (i % 3) * 2, 1)
    }

    g.drawImage(this.front!, 0, 0)

    // Måken at her mooring
    if (this.paint !== s.paint || !this.boat) {
      const p = PAINTS.find((x) => x.id === s.paint) ?? PAINTS[0]
      this.boat = boatSprite(p.hull, p.stripe)
      this.paint = s.paint
    }
    const bob = Math.round(Math.sin(this.t * 1.3))
    const bx = Math.round(W * 0.14)
    const by = deckY + 26 - 15 + bob
    g.drawImage(this.boat, bx, by)
    if (s.flags.cat) g.drawImage(this.cats[this.t % 5 < 0.15 ? 1 : 0], bx + 34, by + 1)
    g.fillStyle = rgba(night > 0.5 ? '#1a3a6a' : '#3ab0d8', 0.55)
    g.fillRect(bx, deckY + 27, 50, 8)
    // mooring rope
    g.fillStyle = '#c8a878'
    for (let i = 0; i < 8; i++) g.fillRect(bx + 44 + i, by + 6 - Math.round(Math.sin((i / 8) * Math.PI) * -2) - Math.round(i * 0.9), 1, 1)

    // night: dim, then lights
    if (night > 0) {
      g.fillStyle = `rgba(8,10,40,${night * 0.38})`
      g.fillRect(0, 0, W, H)
      g.save()
      g.globalCompositeOperation = 'lighter'
      for (const [x, y, w, h] of this.lights) {
        g.fillStyle = `rgba(255,200,100,${night * 0.9})`
        g.fillRect(x, y, w, h)
        g.fillStyle = `rgba(255,190,90,${night * 0.12})`
        g.fillRect(x - 3, y - 3, w + 6, h + 6)
        g.fillStyle = `rgba(255,190,90,${night * 0.1})`
        g.fillRect(x, deckY + 8 + (deckY - y) * 0.4, w, 2)
      }
      g.restore()
    }
    if (s.flags.ending) drawBeam(g, this.lhPos.x, this.lhPos.y, this.t * 0.8, 200, Math.max(0.35, night))
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
