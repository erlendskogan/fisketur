// Signes hus seen as a cutaway dollhouse: every room in its place, dark and boarded until you
// build it, furnished and lit once you have. Drawn on the main canvas like the harbour.

import { canvas, mix, Pix, rgba, rng, shade } from '../../art/pixel'
import { BOAT_GEO, boatSprite, kittiwakeSprites } from '../../art/sprites'
import { Backdrop, drawGlitter, drawReflection, drawRipples, light, makeVignette, PAL as L, rippleColour, tintAmbient, clamp01 } from '../../art/fjord'
import { nightness } from '../../art/scenery'
import { auroraStrength, boatKindOf, vaOf } from '../../art/vardo'
import { artFor } from '../sea'
import { PAINTS, SPECIES_BY_ID, type Species } from '../data'
import type { Save } from '../state'
import { Rain, weatherAt } from '../weather'
import { soupActive } from './economy'
import { VA_SPECIES } from './data'
import { ROOM_ORDER, type RoomId, type VardoState } from './types'

export type HouseSpotId = RoomId | 'door'

export interface HouseSpot {
  id: HouseSpotId
  x: number
  y: number
  w: number
  h: number
}

const INK = '#2a1d2e'
const WALL = '#3a6a9e'
const TRIM = '#f0ece4'
const ROOF = '#34343f'
const WOOD = '#8a5a3a'

const speciesOf = (id: string): Species | undefined => SPECIES_BY_ID[id] ?? VA_SPECIES.find((s) => s.id === id)

/** Where everything in the house sits, worked out from the size of the screen */
function layout(W: number, H: number) {
  const cx = Math.round(W / 2) + 2
  const hx0 = cx - 54
  const hx1 = cx + 54
  const G = Math.round(H * 0.73)
  const seaY = G + 37
  const eave = G - 112
  const ridge = G - 172
  // underside of the roof, as a function of x
  const roofIn = (x: number) => eave + 6 - Math.round((60 - Math.abs(x + 0.5 - cx)) * (64 / 60))
  const rooms: Record<RoomId, { x: number; y: number; w: number; h: number }> = {
    kjokken: { x: hx0 + 3, y: G - 46, w: cx - 2 - (hx0 + 3), h: 46 },
    stue: { x: cx + 2, y: G - 46, w: hx1 - 3 - (cx + 2), h: 46 },
    tak: { x: hx0 + 3, y: G - 96, w: cx - 2 - (hx0 + 3), h: 46 },
    gjest1: { x: cx + 2, y: G - 96, w: hx1 - 3 - (cx + 2), h: 46 },
    gjest2: { x: hx0 + 3, y: G - 150, w: cx - 2 - (hx0 + 3), h: 50 },
    verksted: { x: cx + 2, y: G - 150, w: hx1 - 3 - (cx + 2), h: 50 },
    akvarium: { x: hx0 + 3, y: G + 4, w: hx1 - hx0 - 6, h: 28 },
    tarn: { x: cx - 15, y: ridge - 20, w: 30, h: 22 },
    royeri: { x: hx0 - 40, y: G - 30, w: 32, h: 30 },
    badstue: { x: 3, y: seaY - 25, w: 30, h: 25 },
    brygge: { x: hx1 + 22, y: seaY - 28, w: W - hx1 - 22, h: 40 },
  }
  const door = { x: hx1, y: G - 26, w: 18, h: 26 }
  return { cx, hx0, hx1, G, seaY, eave, ridge, roofIn, rooms, door }
}

type Layout = ReturnType<typeof layout>

// ---------- pixel helpers ----------

function boards(p: Pix, x0: number, y0: number, w: number, h: number, base: string, r: () => number, step = 4, inside?: (x: number, y: number) => boolean) {
  const tones = Array.from({ length: Math.ceil(w / step) + 1 }, () => shade(base, (r() - 0.5) * 0.1))
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      if (inside && !inside(x, y)) continue
      const k = (x - x0) % step
      const tone = tones[Math.floor((x - x0) / step)]
      let c = k === 0 ? shade(tone, 0.12) : k === 1 ? shade(tone, -0.08) : tone
      if ((x * 13 + y * 7) % 23 === 0) c = shade(c, -0.07)
      p.set(x, y, c)
    }
}

/** Wallpaper: a soft ground with a small repeating motif */
function paper(p: Pix, x0: number, y0: number, w: number, h: number, base: string, motif: string, inside?: (x: number, y: number) => boolean) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      if (inside && !inside(x, y)) continue
      const mx = (x - x0) % 6
      const my = (y - y0 + (Math.floor((x - x0) / 6) % 2) * 3) % 6
      p.set(x, y, mx === 2 && my === 2 ? motif : (mx === 2 && (my === 1 || my === 3)) || (my === 2 && (mx === 1 || mx === 3)) ? mix(base, motif, 0.4) : base)
    }
}

function floor(p: Pix, x0: number, y: number, w: number) {
  for (let x = x0; x < x0 + w; x++) {
    p.set(x, y, x % 7 === 0 ? shade(WOOD, -0.2) : shade(WOOD, 0.12))
    p.set(x, y + 1, WOOD)
  }
}

function frame(p: Pix, x: number, y: number, w: number, h: number, wood = '#a8743e') {
  for (let i = x; i < x + w; i++) {
    p.set(i, y, shade(wood, 0.15))
    p.set(i, y + h - 1, shade(wood, -0.25))
  }
  for (let j = y; j < y + h; j++) {
    p.set(x, j, shade(wood, 0.05))
    p.set(x + w - 1, j, shade(wood, -0.2))
  }
}

/** A room nobody has fixed yet: dark, dusty, boards nailed across, cobwebs in the corners */
function derelict(p: Pix, x0: number, y0: number, w: number, h: number, r: () => number, inside?: (x: number, y: number) => boolean) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      if (inside && !inside(x, y)) continue
      const k = (x - x0) % 5
      let c = k === 0 ? '#241c22' : k === 1 ? '#1a1418' : '#1e181c'
      if (r() < 0.04) c = '#2e262a'
      if ((x * 7 + y * 11) % 31 === 0) c = '#3a3036'
      p.set(x, y, c)
    }
  // old junk on the floor: a broken chair, a crate
  const fy = y0 + h - 1
  p.rect(x0 + 4, fy - 4, 6, 4, '#3a2c26')
  p.rect(x0 + 5, fy - 3, 4, 1, '#2a201c')
  p.set(x0 + w - 9, fy - 1, '#3a2e28')
  p.set(x0 + w - 8, fy - 2, '#3a2e28')
  p.set(x0 + w - 7, fy - 3, '#3a2e28')
  p.rect(x0 + w - 10, fy, 6, 1, '#3a2e28')
  // boards nailed across the opening
  const plank = (y: number, tilt: number) => {
    for (let x = x0 - 1; x < x0 + w + 1; x++) {
      const yy = Math.round(y + ((x - x0) / w - 0.5) * tilt)
      if (inside && !inside(x, yy) && !inside(x, yy + 2)) continue
      p.set(x, yy, '#9a7a5a')
      p.set(x, yy + 1, '#7a5e44')
      p.set(x, yy + 2, '#5e4634')
      if ((x - x0) % 14 === 3) p.set(x, yy + 1, '#c8c0b0')
    }
  }
  plank(y0 + Math.round(h * 0.35), 4)
  plank(y0 + Math.round(h * 0.68), -5)
  // cobwebs in the top corners
  for (const [cx, dir] of [[x0, 1], [x0 + w - 1, -1]] as [number, number][]) {
    let top = y0
    while (inside && !inside(cx + dir * 3, top) && top < y0 + h) top++
    for (let k = 0; k < 7; k++) {
      if (r() < 0.85) p.set(cx + dir * k, top + Math.round(k * 0.2), '#8a8494')
      if (k < 5) p.set(cx + dir * Math.round(k * 0.5), top + k, '#6a6474')
      if (k > 1 && k < 6) p.set(cx + dir * (k - 1), top + 6 - k, '#6a6474')
    }
  }
}

/** A cat curled up asleep, about nine pixels wide */
function sleepingCat(p: Pix, x: number, y: number) {
  const o = '#f0a04a'
  const O = '#c8742e'
  const w = '#f8ecd8'
  const rows = ['..kkkkk..', '.koOoOok.', 'koooOoook', 'kwwoooOOk', '.kkkkkkk.']
  rows.forEach((row, j) => [...row].forEach((c, i) => c !== '.' && p.set(x + i, y + j, c === 'k' ? INK : c === 'o' ? o : c === 'O' ? O : w)))
  p.set(x + 1, y + 2, '#f6b0a0')
}

// ---------- the scene ----------

export class HouseScene {
  W = 0
  H = 0
  t = 0
  spots: HouseSpot[] = []
  private L!: Layout
  private bd = new Backdrop()
  private rain = new Rain()
  private scene = canvas(1, 1)
  private outside = canvas(1, 1)
  private inside = canvas(1, 1)
  private shell: HTMLCanvasElement | null = null
  private rooms: HTMLCanvasElement | null = null
  private vignette: HTMLCanvasElement | null = null
  private key = ''
  private smokeAt: [number, number, 'smoke' | 'steam'][] = []
  private puffs: { x: number; y: number; vx: number; vy: number; age: number; life: number; steam: boolean }[] = []
  private smokeT = 0
  private swimmers: { id: string; x: number; y: number; dir: 1 | -1; speed: number; ph: number }[] = []
  private boat: HTMLCanvasElement | null = null
  private boatKey = ''
  private kitti = kittiwakeSprites()
  private r = rng(41)

  constructor(private host: { s: Save }) {}

  private get va(): VardoState | undefined {
    return vaOf(this.host.s)
  }

  private has(id: RoomId) {
    return !!this.va?.rooms.includes(id)
  }

  resize(W: number, H: number) {
    if (W === this.W && H === this.H) return
    this.W = W
    this.H = H
    this.L = layout(W, H)
    const top = this.L.seaY
    this.bd.resize(W, top, 60, 0.9, 'vardo:house')
    this.rain.resize(W, H)
    this.scene = canvas(W, top)
    this.outside = canvas(W, top)
    this.inside = canvas(W, top)
    this.vignette = makeVignette(W, H)
    this.key = ''
    this.spots = [...ROOM_ORDER.map((id) => ({ id, ...this.L.rooms[id] })), { id: 'door' as const, ...this.L.door }]
  }

  hit(x: number, y: number): HouseSpotId | null {
    // small things first: the door and the glass loft, then the rooms
    for (const id of ['door', 'tarn', 'brygge', 'badstue', 'royeri', 'akvarium', 'kjokken', 'stue', 'tak', 'gjest1', 'gjest2', 'verksted'] as HouseSpotId[]) {
      const s = this.spots.find((p) => p.id === id)
      if (s && x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return id
    }
    return null
  }

  // ---------- building the still parts ----------

  private stateKey() {
    const s = this.host.s
    const va = this.va
    if (!va) return `${this.W}x${this.H}|none`
    const book = Object.entries(s.book ?? {})
      .map(([id, b]) => `${id}:${b.best}`)
      .join(',')
    return `${this.W}x${this.H}|${va.rooms.join(',')}|${va.smoke.load.length}|${va.pomor}|${book}|${s.flags.cat}`
  }

  private rebuild() {
    const key = this.stateKey()
    if (key === this.key) return
    this.key = key
    const { W } = this
    const L = this.L
    const top = L.seaY
    const r = rng(53)
    this.smokeAt = []
    const sh = new Pix(W, top)
    const rm = new Pix(W, top)
    const has = (id: RoomId) => this.has(id)
    const roofed = has('tak')

    // ---- the ground: a knoll of rock and heather, sloping down to the shore on both sides ----
    const groundAt = (x: number) => {
      if (x < L.hx0 - 46) return Math.round(L.seaY - 6 - (L.seaY - 6 - L.G) * Math.max(0, Math.min(1, (x - 30) / (L.hx0 - 76))) ** 0.8)
      if (x <= L.hx1 + 20) return L.G
      return Math.round(L.G + (L.seaY - 3 - L.G) * Math.min(1, (x - L.hx1 - 20) / 10))
    }
    for (let x = 0; x < W; x++) {
      const gy = groundAt(x)
      for (let y = gy; y < top; y++) {
        const d = y - gy
        const n = Math.sin(x * 0.4 + y * 0.9) + Math.sin(x * 0.13 - y * 0.27)
        let c = n > 1.1 ? '#8a8a96' : n < -1.1 ? '#4a4a58' : '#6a6a78'
        if ((x * 3 + y * 5) % 37 === 0) c = '#d8a03a'
        if (d === 0) c = r() < 0.6 ? '#6a8a3a' : r() < 0.5 ? '#9a4a32' : '#5a7a32'
        else if (d === 1 && r() < 0.5) c = '#4a6a2e'
        if (y > top - 3) c = mix(c, '#22223a', 0.4)
        sh.set(x, y, c)
      }
      if (r() < 0.25) sh.set(x, gy - 1, r() < 0.3 ? '#9a4a32' : '#6a8a3a')
    }

    // ---- the cellar, set into the rock under the house ----
    const ak = L.rooms.akvarium
    for (let y = ak.y - 1; y < ak.y + ak.h + 2; y++)
      for (let x = ak.x - 3; x < ak.x + ak.w + 3; x++) {
        const row = Math.floor((y - ak.y) / 4)
        const mortar = (y - ak.y) % 4 === 3 || (x + row * 3) % 8 === 0
        sh.set(x, y, mortar ? '#4a4652' : (x + y) % 9 === 0 ? '#7a7684' : '#625e6c')
      }
    if (has('akvarium')) this.paintAquariumRoom(rm, r)
    else derelict(rm, ak.x, ak.y, ak.w, ak.h, r)

    // ---- the house: side walls, floors, the roof in section ----
    const { hx0, hx1, cx, G, eave, ridge, roofIn } = L
    const wall = roofed ? WALL : '#6a7a8a'
    const trim = roofed ? TRIM : '#b8b4a8'
    for (let y = eave; y < G + 1; y++) {
      for (const x of [hx0, hx0 + 1, hx0 + 2, hx1 - 3, hx1 - 2, hx1 - 1]) {
        const outer = x === hx0 || x === hx1 - 1
        sh.set(x, y, outer ? trim : y % 3 === 2 ? shade(wall, -0.15) : wall)
      }
    }
    // the middle wall between the rooms
    for (let y = eave; y < G; y++) for (const x of [cx - 2, cx - 1, cx, cx + 1]) sh.set(x, y, x === cx - 2 || x === cx + 1 ? '#5a4232' : '#7a5a42')
    // floor slabs: under the attic, between the floors, over the cellar
    for (const fy of [G - 100, G - 50, G]) {
      for (let x = hx0; x < hx1; x++) {
        sh.set(x, fy, '#a8784a')
        sh.set(x, fy + 1, '#7a5236')
        sh.set(x, fy + 2, '#5a3e28')
        sh.set(x, fy + 3, '#3e2a1e')
      }
    }
    // the roof: a thick band of shingles over the rafters, barge boards on the outside
    for (let y = ridge - 3; y < eave + 8; y++)
      for (let x = hx0 - 8; x < hx1 + 8; x++) {
        const inner = roofIn(x)
        const v = inner - y
        if (v < 0 || v > 7) continue
        let c = v === 7 ? trim : v === 6 ? shade(ROOF, 0.3) : v > 2 ? ((x + y) % 3 === 0 ? shade(ROOF, -0.15) : ROOF) : v === 2 ? '#6a4a32' : '#4a3426'
        if (!roofed && v > 1 && v < 7 && Math.abs(x - (cx - 30)) < 3) c = v > 4 ? '#1a1418' : '#4a3426'
        if (!roofed && v > 1 && v < 7 && Math.abs(x - (cx + 22)) < 2) c = '#1a1418'
        sh.set(x, y, c)
      }
    // chimneys on both slopes, with smoke from the stoves below
    for (const [chx, id] of [[cx - 30, 'kjokken'], [cx + 28, 'stue']] as [number, RoomId][]) {
      const base = roofIn(chx) - 5
      const ch = base - 12
      for (let y = ch; y < base; y++)
        for (let x = chx; x < chx + 5; x++) sh.set(x, y, (y - ch) % 3 === 2 ? '#6a3430' : x === chx ? '#b0604a' : '#924a3a')
      sh.rect(chx - 1, ch, 7, 1, '#4a4458')
      if (roofed && has(id)) this.smokeAt.push([chx + 2, ch - 1, 'smoke'])
    }

    // ---- the rooms ----
    const attic = (x: number, y: number) => y > roofIn(x) && y < G - 100
    for (const id of ['kjokken', 'stue', 'tak', 'gjest1', 'gjest2', 'verksted'] as RoomId[]) {
      const b = L.rooms[id]
      const clip = id === 'gjest2' || id === 'verksted' ? attic : undefined
      // the bedroom comes with the roof
      const built = id === 'tak' ? roofed : roofed && has(id)
      if (!built) derelict(rm, b.x, b.y, b.w, b.h, r, clip)
      else this.paintRoom(rm, id, b, r, clip)
    }

    // ---- the glass loft on the ridge ----
    const tb = L.rooms.tarn
    if (roofed && has('tarn')) {
      for (let y = tb.y; y < tb.y + tb.h; y++)
        for (let x = tb.x; x < tb.x + tb.w; x++) {
          const post = x === tb.x || x === tb.x + tb.w - 1 || (x - tb.x) % 7 === 0 || y === tb.y
          sh.set(x, y, post ? (y === tb.y ? '#d8d4cc' : TRIM) : null)
        }
      for (let x = tb.x - 2; x < tb.x + tb.w + 2; x++) {
        sh.set(x, tb.y - 1, ROOF)
        sh.set(x, tb.y - 2, shade(ROOF, 0.3))
      }
      sh.rect(tb.x, tb.y + tb.h - 1, tb.w, 2, '#7a5236')
      // two chairs and a telescope pointing at the sky
      const fy = tb.y + tb.h - 2
      for (const ax of [tb.x + 4, tb.x + 19]) {
        rm.rect(ax, fy - 4, 6, 3, '#a8343a')
        rm.rect(ax, fy - 7, 2, 4, '#a8343a')
        rm.set(ax + 1, fy - 1, '#4a3222')
        rm.set(ax + 5, fy - 1, '#4a3222')
      }
      for (let k = 0; k < 6; k++) rm.set(tb.x + 13 + k, fy - 5 - Math.round(k * 0.7), k > 3 ? '#c8a840' : '#8a8a96')
      rm.set(tb.x + 14, fy - 1, '#4a4a58')
      rm.set(tb.x + 16, fy - 1, '#4a4a58')
      rm.set(tb.x + 15, fy - 3, '#4a4a58')
    } else if (roofed) {
      // staked out: scaffold poles where the loft will stand
      for (const x of [tb.x + 1, tb.x + tb.w - 2]) for (let y = tb.y + 2; y < roofIn(x) + 2; y++) sh.set(x, y, '#8a6a4a')
      for (let x = tb.x; x < tb.x + tb.w; x++) if (x % 2) sh.set(x, tb.y + 2, '#a8845e')
      for (let k = 0; k < tb.w - 4; k++) sh.set(tb.x + 2 + k, tb.y + 4 + Math.round((k / (tb.w - 4)) * 10), '#7a5a3e')
    }

    // ---- the porch and the door, steps down to the jetty ----
    const d = L.door
    for (let y = d.y + 3; y < G; y++) for (let x = d.x; x < d.x + 14; x++) sh.set(x, y, x === d.x + 13 ? shade(wall, -0.3) : y % 3 === 2 ? shade(wall, -0.15) : wall)
    for (let x = d.x - 1; x < d.x + 17; x++) {
      sh.set(x, d.y + 1, ROOF)
      sh.set(x, d.y + 2, shade(ROOF, 0.3))
    }
    sh.rect(d.x + 4, G - 16, 7, 16, trim)
    sh.rect(d.x + 5, G - 15, 5, 15, roofed ? '#2a4a3a' : '#5a4a3e')
    sh.set(d.x + 9, G - 8, '#ffd84a')
    if (!roofed) {
      sh.rect(d.x + 3, G - 12, 9, 1, '#9a7a5a')
      sh.rect(d.x + 3, G - 6, 9, 1, '#8a6a4a')
    }
    sh.rect(d.x + 1, G - 20, 2, 3, '#ffd36a')
    for (let k = 0; k < 12; k++) {
      const x = d.x + 14 + k
      const y = G + Math.round((k / 12) * (L.seaY - 3 - G))
      sh.rect(x, y, 2, 1, '#a8784a')
      sh.set(x, y + 1, '#5a3e28')
    }

    // ---- the smokehouse ----
    const rb = L.rooms.royeri
    if (has('royeri')) this.paintSmokehouse(sh, rm, rb, r)
    else {
      // a stack of timber waiting for it
      for (let k = 0; k < 4; k++) sh.rect(rb.x + 4 + k * 2, G - 2 - k * 2, rb.w - 8 - k * 4, 2, k % 2 ? '#7a5a3e' : '#9a7a5a')
      for (let k = 0; k < 4; k++) sh.set(rb.x + 4 + k * 2, G - 1 - k * 2, '#5a3e28')
      for (const x of [rb.x + 2, rb.x + rb.w - 3]) for (let y = rb.y + 6; y < G; y++) if (y % 4) sh.set(x, y, '#c8a070')
    }

    // ---- the sauna on the shore ----
    const sb = L.rooms.badstue
    if (has('badstue')) {
      const sy = sb.y + 7
      boards(sh, sb.x + 2, sy, sb.w - 4, sb.y + sb.h - sy, '#9a6a42', r, 3)
      for (let x = sb.x; x < sb.x + sb.w; x++) {
        const v = sy - 1 - Math.round(((x - sb.x) / sb.w) * 5)
        sh.set(x, v, '#3a3a48')
        sh.set(x, v - 1, '#5a7a3a')
      }
      sh.rect(sb.x + 5, sy + 4, 5, 4, '#26304e')
      sh.rect(sb.x + 6, sy + 5, 3, 2, '#ffb060')
      sh.rect(sb.x + 15, sy + 3, 6, sb.y + sb.h - sy - 3, '#4a2e22')
      sh.rect(sb.x + 22, sb.y + sb.h - 6, 5, 2, '#f4f4f0')
      sh.set(sb.x + 22, sb.y + sb.h - 5, '#d8433a')
      for (let y = sb.y; y < sy - 4; y++) sh.set(sb.x + 24, y, '#4a4a58')
      this.smokeAt.push([sb.x + 24, sb.y - 1, 'steam'])
      // a ladder down into the sea
      for (let y = sb.y + sb.h; y < L.seaY; y++) {
        sh.set(sb.x + sb.w, y, '#8a6242')
        if (y % 2) sh.set(sb.x + sb.w + 1, y, '#a87a4a')
      }
    } else {
      for (const [x, y] of [[sb.x + 6, sb.y + sb.h - 2], [sb.x + sb.w - 8, sb.y + sb.h - 2], [sb.x + 6, sb.y + 10], [sb.x + sb.w - 8, sb.y + 10]] as [number, number][]) sh.rect(x, y, 2, 2, '#c8a070')
      for (let x = sb.x + 6; x < sb.x + sb.w - 6; x += 2) sh.set(x, sb.y + sb.h - 1, '#e8742a')
    }

    // ---- the jetty ----
    const jb = L.rooms.brygge
    if (has('brygge')) {
      for (let x = jb.x - 6; x < W; x++) {
        sh.set(x, L.seaY - 4, '#b07c4e')
        sh.set(x, L.seaY - 3, '#8a5e3c')
        sh.set(x, L.seaY - 2, '#5e3e28')
        if ((x - jb.x) % 9 === 0) sh.rect(x, L.seaY - 1, 2, 1, '#3e2a1e')
      }
      sh.rect(jb.x + 2, L.seaY - 7, 3, 3, '#3a3448')
      sh.set(jb.x + 3, L.seaY - 7, '#7a7490')
    } else {
      for (const x of [jb.x + 2, jb.x + 12]) for (let y = L.seaY - 9; y < L.seaY; y++) sh.set(x, y, '#6a4a32')
    }

    this.shell = sh.toCanvas()
    this.rooms = rm.toCanvas()
    this.paintTrophies()
    this.setSwimmers()
  }

  /** Furniture, wallpaper and lamps for a room that has been built */
  private paintRoom(p: Pix, id: RoomId, b: { x: number; y: number; w: number; h: number }, r: () => number, clip?: (x: number, y: number) => boolean) {
    const { x, y, w, h } = b
    const fy = y + h - 2
    const papers: Partial<Record<RoomId, [string, string]>> = {
      kjokken: ['#e8d8a0', '#c8a85a'],
      stue: ['#7a9a6a', '#c8d8a0'],
      tak: ['#c8b8d8', '#f4ecf4'],
      gjest1: ['#e8c4b4', '#c86a5a'],
      gjest2: ['#c4d4e4', '#f4f4f0'],
    }
    if (id === 'verksted') boards(p, x, y, w, h, '#a87a4a', r, 4, clip)
    else {
      const [base, motif] = papers[id]!
      paper(p, x, y, w, h, base, motif, clip)
      // a skirting board
      for (let i = x; i < x + w; i++) p.set(i, fy - 1, shade(base, -0.3))
    }
    floor(p, x, fy, w)
    // a ceiling lamp, lit and glowing at night
    const lampX = x + Math.round(w / 2)
    if (id !== 'gjest2' && id !== 'verksted') {
      for (let j = y; j < y + 4; j++) p.set(lampX, j, '#3a3a48')
      p.rect(lampX - 2, y + 4, 5, 2, '#f2c24a')
      p.set(lampX, y + 6, '#fff4c8')
    }
    if (id === 'kjokken') {
      // the wood stove with the soup pot, a table with chairs, plates on a shelf, a tiled wall
      const sx = x + 3
      for (let j = fy - 22; j < fy - 12; j++) for (let i = x; i < x + 16; i++) if ((i + j) % 3 !== 0) p.set(i, j, (i + j) % 2 ? '#e8ecf0' : '#c8d8e8')
      p.rect(sx, fy - 12, 11, 12, '#2a2a34')
      p.rect(sx, fy - 12, 11, 1, '#4a4a58')
      p.rect(sx + 2, fy - 7, 7, 4, '#1a1418')
      p.rect(sx + 3, fy - 32, 2, 20, '#2a2a34')
      p.set(sx + 3, fy - 32, '#4a4a58')
      p.rect(sx + 3, fy - 15, 5, 3, '#8a8a96')
      p.rect(sx + 2, fy - 15, 7, 1, '#a8a8b4')
      // the table and two chairs
      const tx = x + w - 20
      p.rect(tx, fy - 9, 14, 2, '#a8743e')
      p.rect(tx + 1, fy - 7, 1, 7, '#7a5232')
      p.rect(tx + 12, fy - 7, 1, 7, '#7a5232')
      p.rect(tx - 4, fy - 12, 1, 12, '#7a5232')
      p.rect(tx - 4, fy - 6, 4, 1, '#7a5232')
      p.rect(tx + 17, fy - 12, 1, 12, '#7a5232')
      p.rect(tx + 14, fy - 6, 4, 1, '#7a5232')
      p.rect(tx + 3, fy - 10, 3, 1, '#f4f4f0')
      p.set(tx + 9, fy - 11, '#d8433a')
      p.set(tx + 9, fy - 10, '#4a8a3a')
      // shelf with plates
      p.rect(x + w - 22, y + 12, 16, 1, '#7a5232')
      for (let i = 0; i < 5; i++) p.rect(x + w - 21 + i * 3, y + 9, 2, 3, i % 2 ? '#f4f4f0' : '#4a7ab8')
    } else if (id === 'stue') {
      // a round iron stove with Pus asleep beside it, an armchair, a rug and the trophy wall
      const sx = x + w - 15
      p.rect(sx + 3, y, 2, fy - 14 - y, '#2a2a34')
      p.rect(sx, fy - 14, 8, 2, '#3a3a48')
      p.rect(sx + 1, fy - 12, 6, 11, '#2a2a34')
      p.rect(sx + 2, fy - 9, 4, 4, '#1a1418')
      p.rect(sx, fy - 1, 8, 1, '#3a3a48')
      p.rect(x + 2, fy, w - 4, 1, '#a8343a')
      for (let i = x + 3; i < x + w - 3; i += 3) p.set(i, fy, '#f2c24a')
      // the armchair
      const ax = x + 3
      p.rect(ax, fy - 9, 3, 9, '#4a6a9a')
      p.rect(ax + 3, fy - 5, 8, 3, '#4a6a9a')
      p.rect(ax + 10, fy - 7, 2, 7, '#3a5a8a')
      p.rect(ax + 3, fy - 6, 8, 1, '#6a8aba')
      p.set(ax + 1, fy - 1, '#4a3222')
      p.set(ax + 10, fy - 1, '#4a3222')
      if (this.host.s.flags.cat !== false) sleepingCat(p, sx - 10, fy - 5)
      // the samovar from the Pomor trader's wreck, once Nadja's treasure is found
      if ((this.va?.pomor ?? 0) >= 3) {
        const mx = x + 15
        p.rect(mx, fy - 3, 6, 3, '#7a5232')
        p.rect(mx + 1, fy - 9, 4, 6, '#d8a03a')
        p.set(mx + 1, fy - 8, '#ffe08a')
        p.rect(mx + 2, fy - 11, 2, 2, '#c8902e')
        p.set(mx, fy - 6, '#a87020')
        p.set(mx + 5, fy - 6, '#a87020')
      }
      // six frames on the wall, filled in by paintTrophies
      for (let i = 0; i < 6; i++) frame(p, x + 3 + (i % 3) * 15, y + 6 + Math.floor(i / 3) * 11, 14, 10)
    } else if (id === 'tak') {
      // the big bed under a red and white quilt, a nightstand with a lamp, Signe's photo
      const bx = x + 4
      p.rect(bx, fy - 10, 2, 10, '#7a5232')
      p.rect(bx + 1, fy - 11, 1, 1, '#a8743e')
      p.rect(bx + 2, fy - 6, 22, 3, '#f4f0e8')
      p.rect(bx + 2, fy - 5, 22, 3, '#c8433a')
      for (let i = bx + 3; i < bx + 24; i += 3) p.set(i, fy - 4, '#f4ecdc')
      p.rect(bx + 2, fy - 7, 5, 2, '#f4f4f0')
      p.rect(bx + 2, fy - 2, 22, 2, '#7a5232')
      p.rect(bx + 23, fy - 7, 2, 7, '#7a5232')
      const nx = x + w - 10
      p.rect(nx, fy - 6, 6, 6, '#a8743e')
      p.rect(nx + 2, fy - 9, 2, 3, '#4a4a58')
      p.rect(nx + 1, fy - 11, 4, 2, '#f2c24a')
      frame(p, x + w - 16, y + 8, 9, 11, '#5a3e28')
      p.rect(x + w - 15, y + 9, 7, 9, '#c8b898')
      p.rect(x + w - 13, y + 11, 3, 5, '#6a5a4a')
      p.set(x + w - 12, y + 10, '#8a7a6a')
      p.rect(x + w - 15, y + 16, 3, 1, '#8aa8c8')
    } else if (id === 'gjest1') {
      // a single bed, a wash stand, a suitcase, curtains
      const bx = x + w - 22
      p.rect(bx, fy - 8, 2, 8, '#a8743e')
      p.rect(bx + 2, fy - 5, 16, 3, '#e8e4dc')
      p.rect(bx + 2, fy - 4, 16, 2, '#4a7ab8')
      for (let i = bx + 3; i < bx + 18; i += 4) p.set(i, fy - 3, '#f4f0e8')
      p.rect(bx + 2, fy - 6, 4, 2, '#f4f4f0')
      p.rect(bx + 2, fy - 2, 16, 2, '#7a5232')
      p.rect(bx + 17, fy - 7, 2, 7, '#a8743e')
      p.rect(x + 3, fy - 9, 8, 1, '#a8743e')
      p.rect(x + 4, fy - 8, 1, 8, '#7a5232')
      p.rect(x + 9, fy - 8, 1, 8, '#7a5232')
      p.rect(x + 5, fy - 11, 4, 2, '#f4f4f0')
      p.rect(x + 12, fy - 4, 7, 4, '#8a4a2e')
      p.rect(x + 14, fy - 5, 3, 1, '#4a2e22')
      // a view out of the back window, with curtains
      const wx = x + 8
      p.rect(wx, y + 8, 12, 12, '#f0ece4')
      p.rect(wx + 1, y + 9, 10, 10, '#4a78b0')
      p.rect(wx + 1, y + 15, 10, 4, '#3a5a7a')
      for (let j = y + 8; j < y + 22; j++) {
        p.set(wx - 1, j, j % 2 ? '#d8433a' : '#f4ecdc')
        p.set(wx + 12, j, j % 2 ? '#d8433a' : '#f4ecdc')
      }
    } else if (id === 'gjest2') {
      // two small beds under the slope of the roof, a skylight
      for (const bx of [x + 4, x + 26]) {
        p.rect(bx, fy - 5, 16, 3, '#e8e4dc')
        p.rect(bx, fy - 4, 16, 2, bx === x + 4 ? '#5a9a5a' : '#c8843a')
        p.rect(bx, fy - 6, 4, 2, '#f4f4f0')
        p.rect(bx, fy - 2, 16, 2, '#7a5232')
      }
      p.rect(x + 17, fy - 18, 2, 6, '#3a3a48')
      p.rect(x + 16, fy - 19, 4, 1, '#f2c24a')
    } else if (id === 'verksted') {
      // Elle's net loft: nets hanging from the rafters, floats, a bench with net needles
      for (let i = 0; i < 4; i++) {
        const nx = x + 6 + i * 11
        const top = (j: number) => clip?.(nx + j, y + 2) ?? true
        let ty = y
        while (!top(0) && ty < fy - 20) {
          ty++
          if (clip?.(nx, ty)) break
        }
        const len = 18 + (i % 2) * 6
        for (let j = 0; j < len; j++)
          for (let k = -3; k <= 3; k++) {
            const sway = Math.round(Math.sin(j * 0.3 + i) * 0.6)
            if ((j + k) % 2 === 0 && clip?.(nx + k + sway, ty + j) !== false) p.set(nx + k + sway, ty + j, j > len - 3 ? '#8a6a4a' : i % 2 ? '#c8a070' : '#7aa86a')
          }
        p.set(nx, ty + len, '#e8742a')
      }
      // glass floats and orange buoys on the floor
      for (const [gx, c] of [[x + 3, '#3a9a7a'], [x + 7, '#4aa8c8'], [x + 11, '#3a9a7a']] as [number, string][]) {
        p.rect(gx, fy - 3, 3, 3, c)
        p.set(gx, fy - 3, '#c8f0e8')
      }
      const bx = x + w - 18
      p.rect(bx, fy - 8, 15, 2, '#7a5232')
      p.rect(bx + 1, fy - 6, 1, 6, '#5a3e28')
      p.rect(bx + 13, fy - 6, 1, 6, '#5a3e28')
      p.rect(bx + 3, fy - 9, 4, 1, '#c8c0a8')
      p.rect(bx + 9, fy - 10, 3, 2, '#e8742a')
      p.rect(bx + 3, fy - 3, 6, 3, '#c8a878')
      p.rect(bx + 4, fy - 2, 4, 1, '#a88858')
    }
  }

  /** The cellar aquarium: a stone room around a big lit tank */
  private paintAquariumRoom(p: Pix, r: () => number) {
    const b = this.L.rooms.akvarium
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) p.set(x, y, (x * 5 + y * 3) % 17 === 0 ? '#4a4652' : (x + Math.floor(y / 4)) % 6 === 0 ? '#3a3644' : '#423e4c')
    floor(p, b.x, b.y + b.h - 2, b.w)
    const t = this.tank()
    p.rect(t.x - 2, t.y - 2, t.w + 4, t.h + 4, '#2a2a34')
    p.rect(t.x - 1, t.y - 1, t.w + 2, 1, '#8a8a96')
    for (let y = t.y; y < t.y + t.h; y++)
      for (let x = t.x; x < t.x + t.w; x++) {
        const k = (y - t.y) / t.h
        p.set(x, y, k > 0.85 ? ((x + y) % 3 ? '#c8b088' : '#a89068') : mix('#3a9ac8', '#1e5a8a', k))
      }
    // kelp and stones in the tank
    for (const kx of [t.x + 4, t.x + 9, t.x + t.w - 7]) for (let j = 0; j < 10; j++) p.set(kx + Math.round(Math.sin(j * 0.6) * 1), t.y + t.h - 3 - j, j % 3 ? '#5a8a3a' : '#7aaa4a')
    p.rect(t.x + t.w - 16, t.y + t.h - 5, 5, 3, '#6a6a78')
    p.set(t.x + t.w - 15, t.y + t.h - 5, '#9a9aa8')
    // a stool and a bucket for feeding
    p.rect(b.x + 4, b.y + b.h - 6, 5, 1, '#a8743e')
    p.rect(b.x + 5, b.y + b.h - 5, 1, 3, '#7a5232')
    p.rect(b.x + 7, b.y + b.h - 5, 1, 3, '#7a5232')
    p.rect(b.x + b.w - 8, b.y + b.h - 6, 4, 4, '#8a9aaa')
    p.set(b.x + b.w - 8, b.y + b.h - 6, '#c8d0dc')
    if (r() < 0) p.set(0, 0, null)
  }

  private tank() {
    const b = this.L.rooms.akvarium
    return { x: b.x + 14, y: b.y + 4, w: b.w - 28, h: b.h - 9 }
  }

  /** The smokehouse in section: blackened walls, racks of fish, the fire pit */
  private paintSmokehouse(sh: Pix, rm: Pix, b: { x: number; y: number; w: number; h: number }, r: () => number) {
    const loaded = this.va?.smoke.load.length ?? 0
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) {
        const edge = x < b.x + 2 || x >= b.x + b.w - 2
        if (edge) sh.set(x, y, (y + x) % 3 === 0 ? '#2a201c' : '#3a2c26')
      }
    // a pent roof and a stovepipe
    for (let x = b.x - 2; x < b.x + b.w + 2; x++) {
      const y = b.y - 1 - Math.round(((x - b.x) / b.w) * 4)
      sh.set(x, y, '#2a2a34')
      sh.set(x, y + 1, '#4a4a58')
    }
    for (let y = b.y - 10; y < b.y - 3; y++) sh.set(b.x + b.w - 6, y, '#4a4a58')
    if (loaded) this.smokeAt.push([b.x + b.w - 6, b.y - 11, 'smoke'])
    boards(rm, b.x + 2, b.y, b.w - 4, b.h, '#2e2420', r, 4)
    // racks of fish
    for (const ry of [b.y + 4, b.y + 12]) {
      for (let x = b.x + 3; x < b.x + b.w - 3; x++) rm.set(x, ry, '#5a3e2a')
    }
    let n = Math.min(10, loaded)
    for (const ry of [b.y + 4, b.y + 12])
      for (let x = b.x + 5; x < b.x + b.w - 4 && n > 0; x += 4, n--) {
        for (let j = 1; j < 7; j++) rm.set(x, ry + j, j === 6 ? '#8a5a2a' : j % 2 ? '#d8a050' : '#c8843a')
        rm.set(x + 1, ry + 2, '#b8742e')
      }
    // the fire pit; it glows while there is fish in the smoke
    rm.rect(b.x + 8, b.y + b.h - 4, b.w - 16, 3, '#4a4a58')
    rm.rect(b.x + 9, b.y + b.h - 4, b.w - 18, 1, loaded ? '#ff8a3a' : '#2a2a34')
  }

  /** Small pictures of your record fish on the wall of the living room */
  private paintTrophies() {
    if (!this.rooms || !this.has('stue') || !this.has('tak')) return
    const s = this.host.s
    const best = Object.entries(s.book ?? {})
      .map(([id, b]) => ({ sp: speciesOf(id), best: b.best }))
      .filter((e): e is { sp: Species; best: number } => !!e.sp && !e.sp.special)
      .sort((a, b) => b.best - a.best)
      .slice(0, 6)
    const g = this.rooms.getContext('2d')!
    g.imageSmoothingEnabled = false
    const b = this.L.rooms.stue
    best.forEach((e, i) => {
      const fx = b.x + 3 + (i % 3) * 15
      const fy = b.y + 6 + Math.floor(i / 3) * 11
      g.fillStyle = '#d8ccb0'
      g.fillRect(fx + 1, fy + 1, 12, 8)
      const art = artFor(e.sp)
      const img = art.right[0]
      // crop to the body, then shrink to fit the frame
      const k = Math.min(1, 11 / art.w, 7 / Math.max(4, art.h * 0.55))
      const w = Math.max(3, Math.round(art.w * k))
      const h = Math.max(2, Math.round(art.h * k))
      g.drawImage(img, fx + 7 - Math.round(w / 2), fy + 5 - Math.round(h / 2), w, h)
      g.fillStyle = '#c8a040'
      g.fillRect(fx + 5, fy + 9, 4, 1)
    })
  }

  private setSwimmers() {
    const va = this.va
    const t = this.tank()
    const ids = (va?.aquarium ?? []).filter((id) => speciesOf(id)).slice(0, 6)
    const r = rng(9)
    this.swimmers = ids.map((id, i) => ({ id, x: t.x + 6 + r() * (t.w - 12), y: t.y + 3 + ((i * 5) % Math.max(4, t.h - 9)), dir: (r() < 0.5 ? 1 : -1) as 1 | -1, speed: 3 + r() * 4, ph: r() * 6 }))
  }

  // ---------- running ----------

  update(dt: number) {
    this.t += dt
    const r = this.r
    this.smokeT -= dt
    if (this.smokeT <= 0) {
      this.smokeT = 0.3
      for (const [x, y, kind] of this.smokeAt)
        this.puffs.push({ x: x + (r() - 0.5), y, vx: 0, vy: kind === 'steam' ? -6 - r() * 2 : -4 - r() * 2, age: 0, life: kind === 'steam' ? 2 + r() : 3 + r() * 1.5, steam: kind === 'steam' })
      // the soup pot steams while the soup is on
      const va = this.va
      if (va && this.has('kjokken') && this.has('tak') && soupActive(va, this.host.s.day ?? 0)) {
        const b = this.L.rooms.kjokken
        this.puffs.push({ x: b.x + 8 + r() * 2, y: b.y + b.h - 18, vx: 0, vy: -5, age: 0, life: 1.6, steam: true })
      }
    }
    const wind = 0.6 + 0.4 * Math.sin(this.t * 0.1)
    for (const p of this.puffs) {
      p.age += dt
      p.vx = (p.steam ? 1 : 2 + wind * 5) * (0.3 + p.age / p.life)
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    this.puffs = this.puffs.filter((p) => p.age < p.life)
    const t = this.tank()
    for (const f of this.swimmers) {
      f.x += f.dir * f.speed * dt
      if (f.x < t.x + 5) f.dir = 1
      if (f.x > t.x + t.w - 5) f.dir = -1
    }
    this.bd.update(dt)
    const s = this.host.s
    const wx = weatherAt(s.day, s.time)
    this.rain.update(dt, wx.rain, (x, k) => (k < 0.3 ? this.L.G - 4 : this.L.seaY + 1 + k * (this.H - this.L.seaY - 1)))
  }

  draw(g: CanvasRenderingContext2D) {
    this.rebuild()
    const s = this.host.s
    const { W, H } = this
    const Lt = this.L
    const top = Lt.seaY
    const time = s.time
    const night = nightness(time)
    const wx = weatherAt(s.day, time)
    const aurora = auroraStrength(s.day ?? 0, time)
    this.bd.aurora = aurora

    // ---------- sky, hills and the outside of the house, in the light of the hour ----------
    const sg = this.scene.g
    sg.clearRect(0, 0, W, top)
    const sky = this.bd.draw(sg, this.t, time, wx)
    const og = this.outside.g
    og.clearRect(0, 0, W, top)
    og.drawImage(this.shell!, 0, 0)
    // kittiwakes over the shore
    if (night < 0.6)
      for (let i = 0; i < 3; i++) {
        const span = W + 40
        const x = ((((i * 83 + this.t * (5 + i * 2) * (i % 2 ? 1 : -1)) % span) + span) % span) - 20
        const y = Math.round(top * (0.16 + i * 0.08) + Math.sin(this.t * 0.7 + i) * 5)
        og.drawImage(this.kitti[[0, 1, 2, 1][Math.floor(this.t * 4 + i) % 4]], Math.round(x), y)
      }
    // your boat at your own jetty
    const bob = Math.round(Math.sin(this.t * 1.3))
    if (this.has('brygge')) this.drawBoat(og, bob)
    for (const p of this.puffs) {
      const k = p.age / p.life
      const size = 1 + Math.floor(k * 3)
      og.fillStyle = rgba(p.steam ? '#ffffff' : k < 0.3 ? '#f4f4f8' : '#d8dce8', (p.steam ? 0.45 : 0.6) * (1 - k))
      og.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size)
    }
    tintAmbient(og, time, W, top)
    if (wx.rain > 0) {
      og.globalCompositeOperation = 'source-atop'
      og.fillStyle = rgba('#2a3048', wx.rain * 0.3)
      og.fillRect(0, 0, W, top)
      og.globalCompositeOperation = 'source-over'
    }
    sg.drawImage(this.outside.c, 0, 0)

    // ---------- the rooms, lit from inside ----------
    const ig = this.inside.g
    ig.clearRect(0, 0, W, top)
    ig.drawImage(this.rooms!, 0, 0)
    this.drawLife(ig)
    tintAmbient(ig, time, W, top, 0.35)
    sg.drawImage(this.inside.c, 0, 0)
    this.drawLights(sg, night, aurora)
    this.bd.fogOver(sg, sky, wx.fog * 0.6)

    // ---------- compose with the sea below, the house mirrored in it ----------
    g.drawImage(this.scene.c, 0, 0)
    const depth = Math.max(1, H - top)
    drawReflection(g, this.scene.c, this.t, sky, top, depth)
    drawRipples(g, this.t, sky, W, top, depth, 20)
    drawGlitter(g, this.t, sky, top, depth)
    const hi = rippleColour(sky)
    g.fillStyle = rgba(hi, 0.6)
    for (let x = 0; x < W; x++) if (Math.sin(x * 0.7 + this.t * 2.2) + Math.sin(x * 0.23 - this.t) > 1.2) g.fillRect(x, top, 1, 1)
    if (this.has('brygge') && this.boat) {
      const geo = BOAT_GEO[boatKindOf(this.va?.boat ?? 0)]
      const by = top + 5 - geo.wl + bob
      const sub = top - by
      if (sub > 0 && sub < geo.h) {
        g.globalAlpha = 0.25
        g.drawImage(this.boat, 0, sub, geo.w, geo.h - sub, this.boatX(), top, geo.w, geo.h - sub)
        g.globalAlpha = 1
      }
    }
    this.rain.draw(g, wx.rain, night)
    if (this.vignette && L.vignette > 0) {
      g.globalAlpha = L.vignette * 0.8
      g.drawImage(this.vignette, 0, 0)
      g.globalAlpha = 1
    }
  }

  private boatX() {
    const geo = BOAT_GEO[boatKindOf(this.va?.boat ?? 0)]
    return Math.round(this.W - geo.w * 0.7)
  }

  /** Your boat alongside the jetty, bow towards the house; the bigger ones run off the edge */
  private drawBoat(g: CanvasRenderingContext2D, bob: number) {
    const s = this.host.s
    const kind = boatKindOf(this.va?.boat ?? 0)
    const key = `${s.paint}|${kind}`
    if (key !== this.boatKey || !this.boat) {
      const p = PAINTS.find((x) => x.id === s.paint) ?? PAINTS[0]
      this.boat = boatSprite(p?.hull ?? '#f4ecdc', p?.stripe ?? '#2a5a8a', kind)
      this.boatKey = key
    }
    const geo = BOAT_GEO[kind]
    const x = this.boatX()
    const y = this.L.seaY + 5 - geo.wl + bob
    g.drawImage(this.boat, x, y)
    // the mooring line to the bollard on the jetty
    const jb = this.L.rooms.brygge
    g.fillStyle = '#c8a878'
    const ax = x + geo.bow.x > this.W ? x + 4 : x + geo.bow.x
    for (let i = 0; i <= 8; i++) {
      const k = i / 8
      g.fillRect(Math.round(jb.x + 3 + (ax - jb.x - 3) * k), Math.round(this.L.seaY - 6 + (y + 6 - this.L.seaY + 6) * k + Math.sin(k * Math.PI) * 2), 1, 1)
    }
  }

  /** Things that move inside: the stove fires, fish in the tank, guests, the cat breathing */
  private drawLife(g: CanvasRenderingContext2D) {
    const s = this.host.s
    const va = this.va
    const Lt = this.L
    if (!va || !this.has('tak')) return
    const night = nightness(s.time)
    const flick = (ph: number) => 0.6 + 0.4 * Math.sin(this.t * 9 + ph) * Math.sin(this.t * 3.7 + ph * 2)
    const fire = (x: number, y: number, w: number, h: number, ph: number) => {
      g.fillStyle = rgba('#ff6a2a', 0.9)
      g.fillRect(x, y + h - 2, w, 2)
      g.fillStyle = rgba('#ffc84a', flick(ph))
      g.fillRect(x + 1 + (Math.floor(this.t * 6 + ph) % 2), y + 1, w - 2, h - 2)
      g.fillStyle = rgba('#fff4c8', flick(ph + 1) * 0.8)
      g.fillRect(x + Math.floor(w / 2), y + h - 3, 1, 1)
    }
    if (this.has('kjokken')) {
      const b = Lt.rooms.kjokken
      fire(b.x + 5, b.y + b.h - 9, 7, 4, 1)
    }
    if (this.has('stue')) {
      const b = Lt.rooms.stue
      fire(b.x + b.w - 13, b.y + b.h - 11, 4, 4, 2)
      // Pus breathing in his sleep, a Z drifting up now and then
      if (s.flags.cat !== false) {
        const cx = b.x + b.w - 25
        const cy = b.y + b.h - 7
        if (Math.sin(this.t * 1.5) > 0) {
          g.fillStyle = '#f0a04a'
          g.fillRect(cx + 2, cy - 1, 4, 1)
        }
        const zt = (this.t * 0.4) % 1
        g.fillStyle = rgba('#f4f0ff', 0.7 * (1 - zt))
        const zx = Math.round(cx + 6 + zt * 4)
        const zy = Math.round(cy - 4 - zt * 10)
        g.fillRect(zx, zy, 3, 1)
        g.fillRect(zx + 1, zy + 1, 1, 1)
        g.fillRect(zx, zy + 2, 3, 1)
      }
    }
    // guests: someone in the room when they have paid, and always at night
    const guestsHere = va.guests.cash > 0 || night > 0.5
    for (const id of ['gjest1', 'gjest2'] as RoomId[]) {
      if (!this.has(id) || !guestsHere) continue
      const b = Lt.rooms[id]
      const fy = b.y + b.h - 2
      g.fillStyle = id === 'gjest1' ? '#2a3a5a' : '#4a2a3a'
      if (night > 0.5) {
        // asleep: a head on the pillow
        const hx = id === 'gjest1' ? b.x + b.w - 19 : b.x + 6
        g.fillStyle = '#e8b48e'
        g.fillRect(hx, fy - 8, 3, 2)
        g.fillStyle = '#4a2e22'
        g.fillRect(hx, fy - 9, 3, 1)
      } else {
        // sitting on the bed, reading
        const px = id === 'gjest1' ? b.x + b.w - 12 : b.x + 10
        g.fillRect(px, fy - 13, 4, 8)
        g.fillRect(px + 1, fy - 5, 3, 3)
        g.fillStyle = '#e8b48e'
        g.fillRect(px, fy - 17, 4, 4)
        g.fillStyle = '#5a3a2a'
        g.fillRect(px, fy - 18, 4, 2)
        g.fillStyle = '#f4f0e8'
        g.fillRect(px - 2, fy - 11, 3, 2)
      }
    }
    // fish in the tank
    if (!this.has('akvarium')) return
    const t = this.tank()
    g.save()
    g.beginPath()
    g.rect(t.x, t.y, t.w, t.h)
    g.clip()
    for (const f of this.swimmers) {
      const sp = speciesOf(f.id)
      if (!sp) continue
      const art = artFor(sp)
      const img = (f.dir === 1 ? art.right : art.left)[Math.floor(this.t * 3 + f.ph) % 2]
      const k = Math.min(1, 13 / art.w)
      const w = Math.max(3, Math.round(art.w * k))
      const h = Math.max(2, Math.round(art.h * k))
      const y = f.y + Math.sin(this.t * 0.8 + f.ph) * 1.5
      g.drawImage(img, Math.round(f.x - w / 2), Math.round(y - h / 2 + 2), w, h)
    }
    // bubbles rising
    for (let i = 0; i < 6; i++) {
      const ph = (this.t * 0.35 + i / 6) % 1
      g.fillStyle = rgba('#e8fbff', 0.7 * (1 - ph))
      g.fillRect(t.x + t.w - 9 + Math.round(Math.sin(ph * 8 + i)), Math.round(t.y + t.h - 3 - ph * (t.h - 3)), 1, 1)
    }
    g.restore()
    // light rippling down through the tank
    g.fillStyle = rgba('#bfefff', 0.25)
    for (let x = t.x; x < t.x + t.w; x++) if (Math.sin(x * 0.5 + this.t * 2) > 0.7) g.fillRect(x, t.y, 1, 1)
  }

  /** Lamps in the built rooms at night, the tank's blue glow, the loft under the northern lights */
  private drawLights(g: CanvasRenderingContext2D, night: number, aurora: number) {
    const Lt = this.L
    const va = this.va
    if (!va || !this.has('tak')) return
    const lit = clamp01((night - 0.1) * 2)
    for (const id of ['kjokken', 'stue', 'tak', 'gjest1', 'gjest2', 'verksted'] as RoomId[]) {
      if (id !== 'tak' && !this.has(id)) continue
      const b = Lt.rooms[id]
      const flick = 0.9 + 0.1 * Math.sin(this.t * 2 + b.x)
      light(g, b.x + b.w / 2, b.y + (id === 'gjest2' || id === 'verksted' ? b.h * 0.6 : 7), 24, '#ffb060', (0.08 + 0.3 * lit) * flick)
    }
    if (this.has('kjokken')) {
      const b = Lt.rooms.kjokken
      light(g, b.x + 8, b.y + b.h - 7, 10, '#ff8a3a', 0.25 + 0.2 * Math.sin(this.t * 7))
    }
    if (this.has('stue')) {
      const b = Lt.rooms.stue
      light(g, b.x + b.w - 11, b.y + b.h - 9, 12, '#ff8a3a', 0.28 + 0.2 * Math.sin(this.t * 6 + 1))
    }
    if (this.has('akvarium')) {
      const t = this.tank()
      light(g, t.x + t.w / 2, t.y + t.h / 2, 26, '#4ab8ff', 0.18 + 0.2 * lit)
    }
    if (this.has('royeri') && va.smoke.load.length) {
      const b = Lt.rooms.royeri
      light(g, b.x + b.w / 2, b.y + b.h - 3, 14, '#ff7a2a', 0.35 + 0.1 * Math.sin(this.t * 5))
    }
    if (this.has('badstue')) {
      const b = Lt.rooms.badstue
      light(g, b.x + 8, b.y + 13, 8, '#ffb060', 0.2 + 0.35 * lit)
    }
    if (this.has('tarn') && night > 0.2) {
      const b = Lt.rooms.tarn
      light(g, b.x + b.w / 2, b.y + b.h / 2, 22, aurora > 0 ? '#5affb8' : '#ffb060', (night - 0.2) * (aurora > 0 ? 0.5 + 0.2 * Math.sin(this.t * 0.6) : 0.35))
    }
    // the lamp by the door
    const d = Lt.door
    light(g, d.x + 2, d.y + 7, 9, '#ffc060', 0.6 * lit)
  }
}
