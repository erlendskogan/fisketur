import { Pix, grid, shade, mix } from './pixel'

export const INK = '#2a1d2e'

// ---------- boat ----------

export const BOAT_W = 48
export const BOAT_H = 24

/**
 * Måken: a small double-ended clinker-built boat. Ternen, in Alaska, is the same kind of
 * hull with a little wheelhouse at the stern. The water line is at y = 15.
 */
export type BoatSpriteKind = 'faering' | 'troller' | 'research' | 'sjark' | 'kystbat' | 'havfisker'

/**
 * Where things sit on each boat sprite, relative to its top-left corner: the waterline,
 * the fisher sprite, the masthead lantern, the cat, the bow rope and the foam along the hull
 */
export interface BoatGeo {
  w: number
  h: number
  /** waterline row */
  wl: number
  /** top-left of the fisher sprite */
  fisher: { x: number; y: number }
  lantern: { x: number; y: number }
  /** top-left of the cat sprite */
  cat: { x: number; y: number }
  /** where the mooring rope is made fast */
  bow: { x: number; y: number }
  /** foam at the waterline from x0 to x1 */
  foam: [number, number]
}

const SMALL_GEO: BoatGeo = { w: BOAT_W, h: BOAT_H, wl: 15, fisher: { x: 14, y: -7 }, lantern: { x: 6, y: 1 }, cat: { x: 34, y: 1 }, bow: { x: 45, y: 4 }, foam: [3, 44] }

export const BOAT_GEO: Record<BoatSpriteKind, BoatGeo> = {
  faering: SMALL_GEO,
  troller: SMALL_GEO,
  research: SMALL_GEO,
  sjark: { w: 64, h: 32, wl: 21, fisher: { x: 22, y: -2 }, lantern: { x: 44, y: 1 }, cat: { x: 5, y: -6 }, bow: { x: 61, y: 7 }, foam: [3, 60] },
  kystbat: { w: 80, h: 40, wl: 27, fisher: { x: 32, y: 3 }, lantern: { x: 54, y: 1 }, cat: { x: 9, y: -8 }, bow: { x: 77, y: 7 }, foam: [3, 76] },
  havfisker: { w: 100, h: 50, wl: 36, fisher: { x: 30, y: 10 }, lantern: { x: 74, y: 1 }, cat: { x: 13, y: 8 }, bow: { x: 96, y: 9 }, foam: [4, 95] },
}

export const boatSize = (kind: BoatSpriteKind) => BOAT_GEO[kind]

/**
 * @param built below 1, the boat is still on the slip: planked from the keel up to this
 * share of the hull, bare frames above, and nothing on deck yet
 */
export function boatSprite(hull: string, stripe: string, kind: BoatSpriteKind = 'faering', built = 1) {
  if (kind === 'sjark' || kind === 'kystbat' || kind === 'havfisker') return bigBoat(hull, stripe, kind, built)
  const p = new Pix(BOAT_W, BOAT_H)
  const L = 44
  const ox = 2
  const wood = '#b0703e'
  const rail = '#d8945a'
  const bottom = '#8a3a34'
  for (let x = 0; x < L; x++) {
    const u = x / (L - 1)
    const top = Math.round(11 - 5 * Math.pow(u, 5) - 2.5 * Math.pow(1 - u, 4))
    const depth = Math.round(9.5 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.97 + 0.015)), 0.5))
    // light from the left and from above: the bow side is a touch brighter
    const lightX = 0.05 - u * 0.1
    for (let r = 0; r <= depth; r++) {
      const y = top + r
      if (built < 1) {
        // on the slip: bare oak frames above the planking, raw planks below
        const up = depth ? 1 - r / depth : 1
        if (r > 0 && up > built && x % 4 !== 1) continue
        let c = r === 0 || up > built ? '#a8784a' : r % 2 === 0 ? '#b8885a' : '#d0a070'
        c = shade(c, lightX)
        p.set(ox + x, y, c)
        continue
      }
      let c = hull
      if (r === 0) c = x % 7 === 3 ? shade(rail, 0.2) : rail
      else if (r === 1) c = shade(wood, -0.2)
      else if (r === 3 || (r === 4 && depth > 7)) c = stripe
      else if (y >= 16) c = y === 16 ? shade(bottom, 0.15) : bottom
      // clinker strakes: each plank overlaps the one below, a dark seam and a lit edge
      if (r > 1 && c !== stripe) {
        if (r % 2 === 0) c = shade(c, -0.14)
        else if (r === 5 || r === 7) c = shade(c, 0.06)
      }
      if (r > 1 && r % 2 === 0 && x % 6 === 2 && y < 16) c = '#e8dcc8'
      c = shade(c, lightX)
      if (r === depth && depth > 2) c = shade(c, -0.18)
      if (x === 0 || x === L - 1) c = shade(c, -0.15)
      p.set(ox + x, y, c)
    }
  }
  // stem posts
  p.set(ox + L - 1, 4, wood)
  p.set(ox + L, 3, wood)
  p.set(ox + L, 2, shade(wood, 0.2))
  p.set(ox, 8, wood)
  p.set(ox - 1, 7, wood)
  if (built < 1) {
    p.outline(0.5)
    return p.toCanvas()
  }
  // oarlocks
  for (const x of [15, 29]) p.set(ox + x, Math.round(11 - 5 * Math.pow(x / 43, 5) - 2.5 * Math.pow(1 - x / 43, 4)) - 1, '#4a4458')
  if (kind === 'research') {
    // Koholā: an open research boat with a canvas sun roof on four poles
    for (const x of [ox + 2, ox + 12]) for (let y = 3; y < 10; y++) p.set(x, y, '#8a8a96')
    p.rect(ox + 1, 2, 13, 1, stripe)
    p.rect(ox + 1, 3, 13, 1, shade(stripe, -0.25))
    p.rect(ox + 5, 7, 4, 3, '#4a4a58')
    p.set(ox + 6, 7, '#8ab8e0')
  }
  if (kind === 'troller') {
    // a wheelhouse with two windows and a tin roof
    const wall = shade(hull, -0.06)
    for (let y = 4; y < 11; y++)
      for (let x = ox + 1; x < ox + 12; x++) {
        if (p.get(x, y) && y > 8) continue
        p.set(x, y, x === ox + 1 ? shade(wall, -0.2) : x === ox + 11 ? shade(wall, -0.3) : wall)
      }
    p.rect(ox, 3, 13, 1, '#5a5a68')
    p.rect(ox + 1, 3, 11, 1, '#8a8a96')
    for (const wx of [ox + 3, ox + 7]) {
      p.rect(wx, 5, 3, 3, '#26304e')
      p.set(wx, 5, '#8ab8e0')
    }
    p.rect(ox + 1, 9, 11, 1, stripe)
  }
  // lantern pole at the stern
  for (let y = 0; y < (kind === 'faering' ? 8 : 3); y++) p.set(ox + 4, y + 1, y < 3 ? '#4a3428' : '#6a4a32')
  p.rect(ox + 3, 0, 3, 3, '#3a3a4a')
  p.outline(0.6)
  // lantern glass, drawn after the outline so it stays bright
  p.set(ox + 4, 1, '#ffd36a')
  return p.toCanvas()
}

export const LANTERN = { x: 6, y: 1 }

/** A wheelhouse or deckhouse: walls lit from the left, a dark roof with an overhang */
function house(p: Pix, x0: number, x1: number, y0: number, y1: number, wall: string, roof: string | null) {
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) p.set(x, y, x === x0 ? shade(wall, 0.12) : x >= x1 - 2 ? shade(wall, -0.2 - (x === x1 - 1 ? 0.1 : 0)) : y === y1 - 1 ? shade(wall, -0.12) : wall)
  if (roof) {
    p.rect(x0 - 1, y0 - 1, x1 - x0 + 2, 1, shade(roof, 0.25))
    p.rect(x0 - 1, y0, x1 - x0 + 2, 1, roof)
    for (let x = x0; x < x1; x++) p.set(x, y0 + 1, shade(p.get(x, y0 + 1) ?? wall, -0.15))
  }
}

/** A window with the sky glinting in its top corner */
function pane(p: Pix, x: number, y: number, w: number, h: number) {
  p.rect(x, y, w, h, '#26304e')
  p.set(x, y, '#8ab8e0')
  if (w > 2) p.set(x + 1, y, '#4a6894')
  if (h > 2) p.set(x, y + 1, '#4a6894')
}

/**
 * The working boats of Vardø, from the little sjark to the steel havfiskebåt. Each is built
 * from the same kind of hull: a rail on top, a coloured sheer stripe, planks or plates
 * shaded from the left, and red bottom paint below the waterline.
 */
function bigBoat(hull: string, stripe: string, kind: 'sjark' | 'kystbat' | 'havfisker', built = 1) {
  const G = BOAT_GEO[kind]
  const p = new Pix(G.w, G.h)
  const ox = 2
  const L = G.w - 4
  const wood = kind !== 'havfisker'
  const rail = wood ? '#d8945a' : shade(hull, 0.35)
  const bottom = '#8a3a34'
  const white = '#eeeae0'
  // the hull outline per kind: top of the rail and the keel line
  const T = kind === 'havfisker' ? 6 : 0
  const topAt = (u: number) => {
    if (kind === 'sjark') return 13 - 4.5 * u ** 3 - 1.2 * (1 - u) ** 4
    if (kind === 'kystbat') return 17 - 6.5 * u ** 3 - 1.6 * (1 - u) ** 4
    // a low working deck aft and a high forecastle forward
    return T + (u < 0.6 ? 18 - 2 * (1 - u) ** 3 : 12 - 4 * ((u - 0.6) / 0.4) ** 2.2)
  }
  const keelAt = (u: number) => {
    if (kind === 'havfisker') {
      if (u < 0.1) return T + 33 + (u / 0.1) * 8
      if (u > 0.8) return T + 41 - ((u - 0.8) / 0.2) ** 1.5 * 27
      return T + 41
    }
    const D = kind === 'sjark' ? 15 : 19
    const top = topAt(u)
    return top + D * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.02)), kind === 'sjark' ? 0.42 : 0.36)
  }
  const tops: number[] = []
  for (let x = 0; x < L; x++) {
    const u = x / (L - 1)
    const top = Math.round(topAt(u))
    const keel = Math.round(keelAt(u))
    tops.push(top)
    const lightX = 0.06 - u * 0.12
    for (let y = top; y <= keel; y++) {
      const r = y - top
      if (built < 1) {
        // on the slip: frames standing bare above the planking or plating done so far
        const up = (keel - y) / Math.max(1, keel - top)
        const frame = wood ? '#a8784a' : '#6a6a78'
        if (r > 0 && up > built && x % 4 !== 1) continue
        let c = r === 0 || up > built ? frame : wood ? ((y - top) % 3 === 2 ? '#b8885a' : '#d0a070') : x % 12 === 6 ? '#7a7a86' : '#9a9aa6'
        if (!wood && up <= built && y > G.wl) c = '#a85a3a'
        p.set(ox + x, y, shade(c, lightX))
        continue
      }
      let c = hull
      if (r === 0) c = x % 8 === 3 ? shade(rail, 0.2) : rail
      else if (r === 1) c = shade(rail, -0.28)
      else if (r === 3 || r === 4) c = stripe
      else if (y === G.wl - 1) c = wood ? '#f4ecdc' : '#2a2430'
      else if (y >= G.wl) c = y === G.wl ? shade(bottom, 0.15) : bottom
      if (r > 1 && c === hull) {
        // carvel planks on the wooden boats, welded plates on the steel one
        if (wood && (y - top) % 3 === 2) c = shade(c, -0.1)
        if (wood && (x * 7 + y * 3) % 23 === 0) c = shade(c, 0.07)
        if (!wood && x % 14 === 7 && y > top + 5) c = shade(c, -0.08)
      }
      c = shade(c, lightX)
      if (y === keel && keel - top > 2) c = shade(c, -0.18)
      if (x === 0 || x === L - 1) c = shade(c, -0.15)
      p.set(ox + x, y, c)
    }
  }
  const deckAt = (x: number) => tops[Math.max(0, Math.min(L - 1, x - ox))]
  if (built < 1) {
    p.outline(0.5)
    return p.toCanvas()
  }

  if (kind === 'sjark') {
    // a wheelhouse aft with three windows, a mast forward with a crosstree and a lantern
    house(p, ox + 5, ox + 20, 5, deckAt(ox + 12), white, '#4a4a58')
    pane(p, ox + 7, 7, 3, 3)
    pane(p, ox + 11, 7, 3, 3)
    pane(p, ox + 15, 7, 4, 3)
    p.rect(ox + 6, 11, 13, 1, stripe)
    // exhaust pipe
    for (let y = 1; y < 4; y++) p.set(ox + 17, y, '#3a3a48')
    p.set(ox + 17, 0, '#5a5a68')
    const mx = 44
    for (let y = 2; y < deckAt(mx); y++) p.set(mx, y, '#6a4a32')
    p.rect(mx - 2, 6, 5, 1, '#6a4a32')
    // the forestay down to the stem
    for (let i = 1; i < 14; i++) p.set(mx + i, Math.round(2 + i * ((deckAt(ox + L - 2) - 2) / 14)), '#9a9aaa')
    // a net hauler on the rail
    p.rect(52, deckAt(52) - 3, 3, 3, '#7a7a8a')
    p.set(53, deckAt(52) - 2, '#c8c8d0')
  } else if (kind === 'kystbat') {
    // a deckhouse with portholes, a wheelhouse with a band of windows on top, a mast with a derrick
    house(p, ox + 6, ox + 31, 10, deckAt(ox + 18), white, null)
    for (const x of [ox + 9, ox + 15, ox + 21]) {
      p.rect(x, 12, 2, 2, '#26304e')
      p.set(x, 12, '#8ab8e0')
    }
    p.rect(ox + 6, 15, 25, 1, stripe)
    house(p, ox + 10, ox + 28, 3, 10, white, '#3a3a48')
    pane(p, ox + 12, 5, 4, 3)
    pane(p, ox + 17, 5, 4, 3)
    pane(p, ox + 22, 5, 5, 3)
    p.rect(ox + 9, 9, 20, 1, shade(white, -0.25))
    // radar bar on a short post
    p.rect(ox + 21, 0, 7, 1, '#3a3a48')
    p.set(ox + 24, 1, '#5a5a68')
    const mx = 54
    for (let y = 2; y < deckAt(mx); y++) p.set(mx, y, '#8a8a96')
    p.rect(mx - 2, 6, 5, 1, '#8a8a96')
    for (let i = 1; i < 20; i++) p.set(mx + i, Math.round(2 + i * ((deckAt(ox + L - 2) - 2) / 20)), '#9a9aaa')
    // net hauler on the rail forward, fish boxes on deck
    p.rect(66, deckAt(66) - 4, 4, 4, '#7a7a8a')
    p.set(67, deckAt(66) - 3, '#c8c8d0')
    p.rect(36, deckAt(36) - 2, 5, 2, '#3a6ac8')
    p.rect(36, deckAt(36) - 2, 5, 1, '#6a9ae8')
  } else {
    // havfiskebåt: superstructure forward, gantry aft, a steel hull with portholes
    const f0 = ox + 60
    const f1 = ox + 86
    house(p, f0, f1, T + 7, deckAt(f0 + 4), white, null)
    for (const x of [f0 + 3, f0 + 8, f0 + 13, f0 + 18]) {
      p.rect(x, T + 9, 2, 2, '#26304e')
      p.set(x, T + 9, '#8ab8e0')
    }
    p.rect(f0, T + 12, f1 - f0, 1, stripe)
    // the wheelhouse, its windows raked forward
    house(p, f0 + 3, f1 - 2, T + 1, T + 7, white, '#3a3a48')
    for (let x = f0 + 5; x < f1 - 3; x++) {
      if ((x - f0) % 5 === 0) continue
      p.set(x, T + 3, x < f0 + 9 ? '#8ab8e0' : '#26304e')
      p.set(x, T + 4, '#26304e')
    }
    p.set(f1 - 2, T + 2, shade(white, -0.3))
    p.rect(f0 + 3, T + 6, f1 - f0 - 5, 1, shade(white, -0.28))
    // mast with a radar bar and lights
    const mx = G.lantern.x
    for (let y = 1; y < T + 1; y++) p.set(mx, y, '#8a8a96')
    p.rect(mx - 4, 4, 9, 1, '#3a3a48')
    p.set(mx + 4, 3, '#c8c8d0')
    p.set(mx - 3, 5, '#5a5a68')
    // a gantry at the stern and the net drum on the working deck
    for (const gx of [ox + 2, ox + 8]) for (let y = T + 4; y < deckAt(gx); y++) p.set(gx, y, '#f2a83a')
    p.rect(ox + 1, T + 3, 9, 2, '#f2a83a')
    p.rect(ox + 1, T + 3, 9, 1, '#ffc86a')
    for (let y = T + 5; y < T + 10; y++) p.set(ox + 5, y, '#5a5a68')
    const dy = deckAt(ox + 18) - 6
    p.rect(ox + 13, dy, 10, 6, '#5a5a68')
    p.rect(ox + 14, dy + 1, 8, 4, '#e8742a')
    for (let x = ox + 14; x < ox + 22; x += 2) p.set(x, dy + 2, '#b8521c')
    p.rect(ox + 13, dy, 10, 1, '#8a8a96')
    // freeing ports along the bulwark, with a streak of rust under each
    for (let x = ox + 26; x < f0 - 2; x += 7) {
      p.rect(x, deckAt(x) + 2, 3, 1, '#1e1e26')
      p.set(x + 1, deckAt(x) + 3, mix(hull, '#a8582e', 0.5))
      p.set(x + 1, deckAt(x) + 5, mix(hull, '#a8582e', 0.3))
    }
    // portholes in the forecastle, an anchor at the bow
    for (const x of [f0 + 4, f0 + 12, f0 + 20]) {
      p.rect(x, deckAt(x) + 6, 2, 2, '#26304e')
      p.set(x, deckAt(x) + 6, '#8ab8e0')
    }
    const ax = ox + L - 10
    p.rect(ax, deckAt(ax) + 4, 2, 4, '#2a2430')
    p.rect(ax - 1, deckAt(ax) + 7, 4, 1, '#2a2430')
    // the bulwark rail stands proud of the deck aft
    for (let x = ox + 12; x < f0; x += 4) p.set(x, deckAt(x) - 1, rail)
  }
  // masthead lantern
  p.rect(G.lantern.x - 1, G.lantern.y - 1, 3, 3, '#3a3a4a')
  p.outline(0.6)
  p.set(G.lantern.x, G.lantern.y, '#ffd36a')
  return p.toCanvas()
}

// ---------- the fisher ----------

const FISHER_PAL = {
  k: INK,
  p: '#f2e6cc',
  P: '#c8b8a0',
  w: '#fff8e8',
  r: '#d8433a',
  R: '#a52e34',
  h: '#ff7a5a',
  a: '#6a3e26',
  s: '#f2c29b',
  S: '#d9946e',
  e: INK,
  b: '#ec8a7a',
  m: '#a8484e',
  c: '#e8a82e',
  y: '#f2c24a',
  Y: '#c98f2e',
  l: '#ffe48a',
  d: '#8a5a2e',
  g: '#3a6a8a',
}

const FISHER = [
  '....kkk.......',
  '...kpwpk......',
  '...kPpPk......',
  '..kkrhrkk.....',
  '.krhhrrrRk....',
  '.krhrrrrRk....',
  '.kRrRrRrRk....',
  '.kaaSssssk....',
  '.kaSsssesk....',
  '.kaSssssssk...',
  '..kSbssSsk....',
  '..kkSsmmk.....',
  '..kcccccck....',
  '.kyylyyyyyk...',
  '.kyYlyydyyyk..',
  '.kyYyyyyyggk..',
  '.kyYyydyyyk...',
  '.kyYyyyyyk....',
  '.kyYyyyyyk....',
]

/**
 * At home a yellow sou'wester coat and a red hat; in Alaska orange rain gear and a green
 * beanie; in Hawaii a straw hat and a red shirt with white flowers
 */
export const fisherSprite = (world = 'norge') =>
  grid(
    FISHER,
    world === 'alaska'
      ? { ...FISHER_PAL, r: '#3a7a52', R: '#24543a', h: '#5aa070', p: '#e8e0cc', y: '#f07a2a', Y: '#b8521c', l: '#ffa860', c: '#d8641e', d: '#5a2e18', g: '#2a2a34' }
      : world === 'vardo'
        ? { ...FISHER_PAL, r: '#f07a2a', R: '#b8521c', h: '#ffa860', y: '#2e5a3e', Y: '#1e3e2a', l: '#4a7a56', c: '#e8e0cc', d: '#c8c0a8', g: '#2a2a34' }
      : world === 'lofoten'
        ? { ...FISHER_PAL, r: '#2a3a6a', R: '#1a2448', h: '#4a5a8a', p: '#e8e0cc', y: '#f07a2a', Y: '#b8521c', l: '#ffa860', c: '#e8eef4', d: '#5a2e18', g: '#2a2a34' }
        : world === 'knut'
          ? { ...FISHER_PAL, r: '#3a4a7a', R: '#24305a', h: '#5a6a9a', p: '#e8e0cc', a: '#e8e4dc', y: '#3a5a8a', Y: '#24406a', l: '#5a7aa8', c: '#e8e4dc', d: '#e8e4dc', g: '#6a4a3a', b: '#e89a8a' }
          : world === 'hawaii'
        ? { ...FISHER_PAL, r: '#e8c878', R: '#b8964a', h: '#f8e0a0', p: '#e8c878', P: '#b8964a', w: '#f8e0a0', y: '#e8484a', Y: '#a8303a', l: '#fff0e8', c: '#f4ecdc', d: '#fff0e8', g: '#f2c29b' }
        : FISHER_PAL,
  )
/** Where the rod is held, relative to the fisher sprite */
export const FISHER_HAND = { x: 10, y: 15 }

// ---------- the cat ----------

const CAT_PAL = { k: INK, o: '#f0a04a', O: '#c8742e', w: '#f8ecd8', e: '#3a6a3a', n: '#e87a8a', p: '#f6b0a0' }

const CAT = [
  '.k...k........',
  'kpk.kpk.......',
  'koOoOook......',
  'koeooeok......',
  'kowwnwok....k.',
  '.kowwok....kok',
  '.kooOoOooookk.',
  '.kowoOoOoook..',
  '.kowwoooook...',
  '.kkwkkkkwkk...',
]
const CAT_BLINK = CAT.map((r, i) => (i === 3 ? 'kokkokok......' : r))

export const catSprites = () => [grid(CAT, CAT_PAL), grid(CAT_BLINK, CAT_PAL)]

// ---------- small things ----------

export const heartSprite = () =>
  grid(['.kk.kk.', 'kppkppk', 'kpwpppk', '.kpppk.', '..kpk..', '...k...'], { k: INK, p: '#ff6a8a', w: '#fff8e8' })

export const bangSprite = () => grid(['kkkk', 'kyyk', 'kyyk', 'kyyk', 'kyyk', 'kkkk', 'kyyk', 'kkkk'], { k: INK, y: '#ffe04a' })

export const tinSprite = () =>
  grid(['.kkkkkk.', 'kTtTTTTk', 'kTTTTTTk', 'kkkkkkkk', 'kTTTTTTk', 'kTTtTTTk', '.kkkkkk.'], { k: INK, T: '#8a9aaa', t: '#e8f0f8' })

/** One of Selma's hydrophones: a yellow cylinder with a green light on top */
export const hydroSprite = () =>
  grid(['.kgk.', 'kyyyk', 'kywyk', 'kkkkk', 'kyyyk', 'kYyYk', '.kkk.', '..c..', '..c..'], { k: INK, y: '#ffd84a', Y: '#d8962e', w: '#fff8e8', g: '#6aff8a', c: '#3a3a4a' })

export const chestSprite = () =>
  grid(['.kkkkkk.', 'kbBbBbbk', 'kkkyykkk', 'kbbykbbk', 'kbbbbbbk', 'kBBBBBBk', 'kkkkkkkk'], {
    k: INK,
    b: '#c9823e',
    B: '#9a5a2e',
    y: '#ffd84a',
  })

export const gullSprites = () => [
  grid(['k.....k', '.k...k.', '..kwk..'], { k: '#2a2a3a', w: '#f8f8f0' }),
  grid(['.......', 'kkkwkkk', '.......'], { k: '#2a2a3a', w: '#f8f8f0' }),
]

/** Kittiwakes, the small gulls of the bird cliffs: pale grey wings dipped in black at the tips */
export const kittiwakeSprites = () => {
  const pal = { K: '#1e1e28', g: '#c8d0dc', w: '#f8f8f4', y: '#e8d84a' }
  return [
    grid(['K.......K', '.g.....g.', '..gwwwg..', '....y....'], pal),
    grid(['.........', 'KggwwwggK', '...www...', '....y....'], pal),
    grid(['.........', '...www...', 'KggwwwggK', '.........'], pal),
  ]
}

/** A puffin whirring low over the water: black back, white face and belly, orange beak and feet; facing right */
export const puffinSprites = () => {
  const pal = { k: '#1a1a24', w: '#f4f2ec', g: '#c8c8cc', o: '#f07a2a', r: '#d8433a', f: '#f2a03a' }
  return [
    grid(['..kk....', '...kk.wk', '.kkkkwwor', 'k.wwwww..', '...f.f...'], pal),
    grid(['........', '......wk', '.kkkkwwor', 'k.wkkkw..', '...kkf...'], pal),
  ]
}

/** A bald eagle soaring: dark wings, white head and tail */
export const eagleSprites = () => {
  const pal = { k: '#3a2a22', K: '#5a4232', w: '#f4f0e8', y: '#f2c24a' }
  return [
    grid(['kk.......kk', '.kK.....Kk.', '..kKkkkkkwy', '.ww........'], pal),
    grid(['...........', 'kkKkk.kkKkk', '...kkkkkkwy', '.ww........'], pal),
  ]
}

/** A green sea turtle, honu, paddling at the surface */
export const turtleSprite = () =>
  grid(['...gg.....', '..gGgGg.hh', '.gGgGgGghk', 'f.gGgGg.hh', '.f.....f..'], { g: '#5a7a3a', G: '#8a9a4a', h: '#9aa86a', k: INK, f: '#7a8a5a' })

/** A sea otter floating on its back, paws on its chest */
export const otterSprite = () =>
  grid(['..ww......', '.wkwbbbb..', 'bbbBBbbbbb', '.bbbbbbbB.', '..b....b..'], { b: '#6a4a32', B: '#a88a6a', w: '#c8b8a0', k: INK })

/** Pink jellies at home; in Alaska the big red lion's mane */
export const jellySprites = (world = 'norge') => {
  const pal =
    world === 'alaska'
      ? { a: '#e8603a', b: '#ffb08a', c: '#c8402a' }
      : world === 'hawaii'
        ? { a: '#8ab8ff', b: '#d0e4ff', c: '#6a8ae8' }
        : world === 'vardo'
          ? // moon jellies: glassy, with four violet rings
            { a: '#b8c4f0', b: '#e8ecff', c: '#9a8ad8' }
        : { a: '#ff9ad0', b: '#ffd0ea', c: '#d870b0' }
  return [
    grid(['..aaaaa..', '.abbbbba.', 'aabbbbbaa', 'acaacaaca', '.c.c.c.c.', '.c.c.c.c.', 'c.c.c.c..', '.c...c...'], pal),
    grid(['.........', '.aaaaaaa.', 'abbbbbbba', 'acaacaaca', '.c.c.c.c.', 'c.c.c.c.c', '.c.c.c...', 'c...c....'], pal),
  ]
}

// ---------- icons for the HTML interface ----------

const ICON_PAL = {
  k: INK,
  w: '#fff8e8',
  y: '#ffd84a',
  Y: '#d8962e',
  o: '#a8641e',
  b: '#c9823e',
  B: '#8a5a2e',
  d: '#5a3a22',
  r: '#d8433a',
  R: '#a52e34',
  p: '#f2e2b8',
  P: '#d8be88',
  g: '#c8d0dc',
  G: '#7a8298',
  s: '#4cb8e8',
  S: '#2a7ab0',
  n: '#1e4a7a',
  f: '#9ad8ea',
  F: '#4a8aa8',
  c: '#eef2fa',
  C: '#a8b4cc',
  h: '#ffd36a',
  O: '#f07a2a',
  q: '#b8521c',
  e: '#6ab84a',
  E: '#2e7a3a',
  m: '#d8d8e4',
  M: '#8a8a9e',
  v: '#4a4a5a',
  j: '#f2c29b',
  J: '#d9946e',
}

/** 12×12 icons for the HTML interface */
export const ICONS: Record<string, string[]> = {
  coin: [
    '...kkkkkk...',
    '..kyyyyyyk..',
    '.kywwyyyyYk.',
    'kywyyyyyyyYk',
    'kyyyoooyoyYk',
    'kyyoyooooyYk',
    'kyyyoooyoyYk',
    'kyyyyyyyyyYk',
    'kYyyyyyyyYYk',
    '.kYYyyyyYYk.',
    '..kYYYYYYk..',
    '...kkkkkk...',
  ],
  bucket: [
    '.........kk.',
    '..kkkkk.kfFk',
    '.k.....kkfFk',
    'k.......kfk.',
    'kkkkkkkkkkkk',
    'kwbbbbbbbbBk',
    'kgggggggggGk',
    '.kbbbbbbbBk.',
    '.kwbbbbbbBk.',
    '.kgggggggGk.',
    '.kbbbbbbBBk.',
    '..kkkkkkkk..',
  ],
  book: [
    '.kkkkkkkkkk.',
    'kSssssssssPk',
    'kSsssssssspk',
    'kSssssssssPk',
    'kSssfffsfspk',
    'kSsfwffffsPk',
    'kSssfffsfspk',
    'kSssssssssPk',
    'kSsyyyyyyspk',
    'kSnnnnnnnnPk',
    'kkkkkkkkkkpk',
    '.kpPpPpPpPk.',
  ],
  scroll: [
    'kkkkkkkkkkk.',
    'kPppppppppPk',
    'kkkkkkkkkkk.',
    '.kpppppppk..',
    '.kpGGGGppk..',
    '.kpppppppk..',
    '.kpGGGGGpk..',
    '.kpppppppk..',
    '.kpGGGpkkk..',
    'kkkkkkkRrRk.',
    'kPpppkRrwrRk',
    'kkkkkkkRRRk.',
  ],
  sea: [
    '.....kkk....',
    '....kfffk.k.',
    '...kfwfffkFk',
    '...kffffFFk.',
    '....kkFFk.k.',
    '......kk....',
    '.kk.....kk..',
    'kssk...kssk.',
    'sswsk.kswssk',
    'SsssskssssSS',
    'SSSsSSSSsSSS',
    'nSnnnSnnnSnn',
  ],
  house: [
    '.....kk.....',
    '....kwwk....',
    '...kwrrwk...',
    '..kwrhhrwk..',
    '.kwrrhhrrwk.',
    'kwrrrrrrrrwk',
    '.krrrrrrrrk.',
    '.krhhrrkkrk.',
    '.krhhrrkbrk.',
    '.kRRRRRkbRk.',
    'kdbdbdbdbdbk',
    '.k.k...k.k..',
  ],
  gear: [
    '..........kk',
    '.........kwk',
    '........kBk.',
    '.......kbk.w',
    '......kbk..w',
    '.....kbk...w',
    '..kkkbk....k',
    '.kgggk....kh',
    'kgGkgGk....k',
    'kgkkkgk.....',
    'dkgGgk......',
    'dd.kk.......',
  ],
  rain: [
    '....kkkk....',
    '..kkcccckk..',
    '.kcccwccccC.',
    'kccwccccccCk',
    'kcccccccCCCk',
    '.kCCCCCCCCk.',
    '..kkkkkkkk..',
    '..s...s...s.',
    '.s...s...s..',
    '...s...s....',
    '..s...s...s.',
    '............',
  ],
  trophy: [
    '.kkkkkkkkkk.',
    'kyyyyyyyyYYk',
    'kywyyyyyyYYk',
    'kyyyyyyyyYYk',
    '.kyyyyyyyYk.',
    '..kyyyyyYk..',
    '...kkyykk...',
    '....kyYk....',
    '....kyYk....',
    '...kkyykk...',
    '..kbbbbbbk..',
    '..kkkkkkkk..',
  ],
  snow: [
    '....kkkk....',
    '..kkcccckk..',
    '.kcccwccccC.',
    'kccwccccccCk',
    'kcccccccCCCk',
    '.kCCCCCCCCk.',
    '..kkkkkkkk..',
    '..w...w...w.',
    '.www.www.www',
    '..w...w...w.',
    '....w...w...',
    '...www.www..',
  ],
  lock: [
    '....kkkk....',
    '...kGggGk...',
    '..kGk..kGk..',
    '..kgk..kgk..',
    '.kkkkkkkkkk.',
    '.kyyyyyyyYk.',
    '.kywyyyyyYk.',
    '.kyyykkyyYk.',
    '.kyyykkyyYk.',
    '.kyyyykyyYk.',
    '.kYYYYYYYYk.',
    '.kkkkkkkkkk.',
  ],
  net: [
    '.kk..kk..kk.',
    'kOOkkOOkkOOk',
    'kqqkkqqkkqqk',
    'kPkPkPkPkPkk',
    'k.P.P.P.P.Pk',
    'kP.P.P.P.P.k',
    '.kP.P.P.P.k.',
    '.k.P.P.P.Pk.',
    '..kP.P.P.k..',
    '..k.P.P.Pk..',
    '...kkkkkk...',
    '...kv..vk...',
  ],
  crab: [
    '.kk......kk.',
    'krwk....kwrk',
    'krRk....kRrk',
    '.kRk.kk.kRk.',
    '..kkkrrkkk..',
    'kk.krwrrrk.k',
    'rkkrrrrrrRkr',
    '.krrrrrrrRk.',
    'rkkRrrrrRRkr',
    'k.kkRRRRRkkk',
    '.k..kkkkk..k',
    '..k.......k.',
  ],
  boat: [
    '.......k....',
    '..kkkk.k....',
    '..kwnk.k..k.',
    '..kccck.k.k.',
    '..kcCck..kk.',
    'kkkkkkkkkkkk',
    'kpPpPpPpPppk',
    '.krrrrrrrrk.',
    '.kbbbbbbbbk.',
    '..kBbbbbBk..',
    '...kkkkkk...',
    '.sSs.sSs.sS.',
  ],
  smoke: [
    '....kkk.....',
    '...kmmmk.kk.',
    '..kmmmMk.kmk',
    '...kkMMkkMk.',
    '....kMk.kk..',
    '..kkkkkk....',
    '.kkGgkkkkk..',
    'kbbbbbbbbbk.',
    'kbkkkbbbbBk.',
    'kbkhkbBbbBk.',
    'kbkhkbbbbBk.',
    'kkkkkkkkkkk.',
  ],
  guest: [
    '....kkkk....',
    '...kyyyyk...',
    '..kyyjjjyk..',
    '..kyjjjjyk..',
    '..kjkjjkJk..',
    '..kjjjjjJk..',
    '...kjrrJk...',
    '....kkkk....',
    '..kkSSSSkk..',
    '.kSswSSSnnk.',
    'kSsSSSSSSnnk',
    'kkkkkkkkkkkk',
  ],
  star: [
    '.....kk.....',
    '....kyyk....',
    '....kwyk....',
    'kkkkkyyYkkkk',
    'kyywyyyyyYYk',
    '.kyyyyyyyYk.',
    '..kyyyyyYk..',
    '..kyyyyyYk..',
    '.kyyyYkyYYk.',
    '.kyYYk.kYYk.',
    'kYYkk...kkYk',
    'kkk.......kk',
  ],
  anchor: [
    '....kkkk....',
    '....kgGk....',
    '....kkkk....',
    '..kkkgGkkk..',
    '..kggggGGk..',
    '..kkkgGkkk..',
    '.k..kgGk..k.',
    'kgk.kgGk.kgk',
    'kgGkkgGkkGGk',
    '.kgGggGGgGk.',
    '..kkgGGgkk..',
    '....kkkk....',
  ],
  camera: [
    '............',
    '..kkk.......',
    '.kvvvkkkkkk.',
    'kkkkkkkkkkkk',
    'kvvvkkkkvhvk',
    'kvvkcCCCkvvk',
    'kvvkcwnCkvvk',
    'kvvkCnnCkvvk',
    'kvvvkCCkvvvk',
    'kvvvvkkvvvvk',
    'kkkkkkkkkkkk',
    '............',
  ],
  map: [
    'kkkk.kkk.kkk',
    'kppPkpppkppk',
    'kpPpkpPpkprk',
    'kPppkPprkrpk',
    'kppPkprpkrRk',
    'kpPpkrpPkppk',
    'kprrkPppkPpk',
    'krpPkpPpkppk',
    'kpppkppPkPpk',
    'kPpPkppPkppk',
    'kppPkPppkPpk',
    'kkkk.kkk.kkk',
  ],
  key: [
    '...kkkk.....',
    '..kyyyyk....',
    '.kywkkyYk...',
    '.kyk..kYk...',
    '.kyk..kYk...',
    '.kYykkyYk...',
    '..kYyyYk....',
    '...kyYk.....',
    '...kyYkk....',
    '...kyYyYk...',
    '...kyYkk....',
    '...kkkk.....',
  ],
  hammer: [
    '..kkkkkk....',
    '.kgggggGk...',
    'kgwggggGGkk.',
    'kGGGGGGGGGk.',
    '.kkkbbkkkk..',
    '....kbBk....',
    '....kbBk....',
    '....kbBk....',
    '....kbBk....',
    '....kbBk....',
    '....kdBk....',
    '....kkkk....',
  ],
  fish: [
    '............',
    '.....kkkk...',
    'kk..kfffFk..',
    'kFkkffffffk.',
    'kFFkfffwkfFk',
    '.kFFffffffFk',
    '.kFFfffffffk',
    'kFFkCCCCCCk.',
    'kFk.kCCCCk..',
    'kk...kkkk...',
    '............',
    '............',
  ],
  letter: [
    '............',
    'kkkkkkkkkkkk',
    'kpkppppppkpk',
    'kppkppppkppk',
    'kpppkppkpppk',
    'kppppkkppppk',
    'kpppppppppPk',
    'kppppppRRpPk',
    'kppppppRRpPk',
    'kPPPPPPPPPPk',
    'kkkkkkkkkkkk',
    '............',
  ],
}

/** Round things are easier to draw than to type */
function roundIcon(name: string) {
  const p = new Pix(12, 12)
  const c = 5.5
  const at = (x: number, y: number) => Math.hypot(x - c, y - c)
  if (name === 'sun') {
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++) {
        const d = at(x, y)
        const a = Math.atan2(y - c, x - c)
        const ray = d > 4.6 && d < 6.4 && Math.abs(Math.sin(a * 4)) < 0.38
        if (d < 4.1) p.set(x, y, d < 2.2 && x < c && y < c ? '#fff8e8' : x + y > 13 ? '#f2a83a' : '#ffd84a')
        else if (ray) p.set(x, y, '#ffc84a')
      }
    p.outline(0.55)
  } else if (name === 'moon') {
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++) {
        if (at(x, y) > 5 || Math.hypot(x - 8, y - 3.5) < 4) continue
        p.set(x, y, x + y > 12 ? '#c8b880' : '#f2e6b0')
      }
    p.outline(0.55)
    p.set(3, 6, '#c8b880')
    p.set(5, 9, '#c8b880')
  } else if (name === 'clock') {
    // a round wall clock with brass rim, for the time it takes
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++) {
        const d = at(x, y)
        if (d < 4.3) p.set(x, y, '#f8f2e2')
        else if (d < 5.6) p.set(x, y, x + y > 11 ? '#c98f2e' : '#ffd84a')
      }
    p.outline(0.55)
    for (const [x, y] of [[5, 1], [9, 5], [5, 9], [1, 5]]) p.set(x + (x === 5 ? 0 : 0), y + (y === 5 ? 0 : 0), '#8a7a5a')
    for (let k = 0; k < 3; k++) p.set(5, 5 - k, INK)
    for (let k = 1; k < 4; k++) p.set(5 + k, 5, INK)
    p.set(5, 5, '#d8433a')
  } else if (name === 'wheel') {
    // a ship's wheel, for the settings
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++) {
        const d = at(x, y)
        const a = Math.atan2(y - c, x - c)
        const spoke = Math.abs(Math.sin(a * 4)) < 0.22
        if (d < 1.5) p.set(x, y, '#ffd84a')
        else if (d > 2.6 && d < 4.2) p.set(x, y, d < 3.3 ? '#f2e2b8' : x + y > 11 ? '#c8a878' : '#e8d0a0')
        else if (spoke && d < 5.6) p.set(x, y, d > 4.6 ? '#ffd84a' : '#f2e2b8')
      }
    // the parts are too thin to darken their own edges, so ring them in ink instead
    const filled = p.d.slice()
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++) {
        if (filled[y * 12 + x]) continue
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const X = x + dx
          const Y = y + dy
          return X >= 0 && Y >= 0 && X < 12 && Y < 12 && filled[Y * 12 + X]
        })
        if (near && at(x, y) > 1.5) p.set(x, y, INK)
      }
  }
  return p.toCanvas()
}

export const iconCanvas = (name: string) => (ICONS[name] ? grid(ICONS[name], ICON_PAL) : roundIcon(name))

// ---------- portraits ----------

interface Face {
  skin: string
  hair: string
  eyes?: string
  style: 'bun' | 'bob' | 'hat' | 'old' | 'cap' | 'short' | 'flat'
  cloth: string
  cloth2?: string
  beard?: string
  mustache?: string
  glasses?: boolean
  freckles?: boolean
  brows?: string
  /** small gold drops below the ears */
  earrings?: string
  /** half-moon reading glasses low on the nose, on a string round the neck */
  readers?: string
  /** colour of a flat cap or baseball cap */
  capColor?: string
  /** lines round the eyes and mouth */
  wrinkles?: boolean
  /** a carpenter's pencil behind the ear */
  pencil?: boolean
}

export const PORTRAITS: Record<string, Face> = {
  marit: { skin: '#f4c8a0', hair: '#d8642e', style: 'bun', cloth: '#4c8a5a', cloth2: '#f0e2c0', freckles: true },
  halvor: { skin: '#e8b48c', hair: '#e8e4dc', style: 'hat', cloth: '#2e4a6e', beard: '#f2eee6', brows: '#f2eee6' },
  selma: { skin: '#b07a52', hair: '#2a1c22', style: 'bob', cloth: '#2aa59a', cloth2: '#f2c24a', glasses: true },
  edvard: { skin: '#f0c2a0', hair: '#f2eee6', style: 'old', cloth: '#2e4a8a', cloth2: '#d8433a', brows: '#f8f6f0', beard: undefined },
  astrid: { skin: '#f2c4a4', hair: '#ece8e2', style: 'bun', cloth: '#b8323a', cloth2: '#f4ecdc', glasses: true, brows: '#d8d4ce' },
  ray: { skin: '#e0a882', hair: '#8a5a3a', style: 'cap', cloth: '#3a6a8a', cloth2: '#f2c24a', mustache: '#7a4a2e' },
  leilani: { skin: '#c88a5e', hair: '#1e1418', style: 'bob', cloth: '#e84a6a', cloth2: '#fff0e8' },
  kimo: { skin: '#b87a52', hair: '#d8d4ce', style: 'old', cloth: '#2a8ac8', cloth2: '#ffd84a', brows: '#e8e4de', mustache: '#d8d4ce' },
  tutu: { skin: '#b07a52', hair: '#f4f2ee', style: 'bun', cloth: '#f4ecdc', cloth2: '#ffd84a', brows: '#e8e4de' },
  ingvild: { skin: '#f4c8a8', hair: '#e8b86a', style: 'bob', cloth: '#f2742a', cloth2: '#2a3a5a', freckles: true },
  johan: { skin: '#e8b090', hair: '#e8e4dc', style: 'cap', cloth: '#2a3a5a', cloth2: '#f4ecdc', beard: '#f0ece6', brows: '#f0ece6' },
  nadja: { skin: '#e8b48e', hair: '#2a1a1e', style: 'bun', cloth: '#b8303a', cloth2: '#f4ecdc', earrings: '#ffd84a', brows: '#2a1a1e' },
  brita: { skin: '#f0c6a8', hair: '#b4b2bc', style: 'short', cloth: '#1e2a4e', cloth2: '#f4f4f0', readers: '#9a5a3a', brows: '#8a8894' },
  aslak: { skin: '#d49a72', hair: '#f2eee6', style: 'flat', cloth: '#26283a', cloth2: '#2a5ab8', capColor: '#3e3e4c', brows: '#f4f2ec', wrinkles: true, mustache: '#ece8e0' },
  frida: { skin: '#f4c8a8', hair: '#f0d070', style: 'short', cloth: '#4a7a3e', cloth2: '#e8e0d0', freckles: true, pencil: true, brows: '#c8a048' },
}

/** Where each person is usually found, painted behind the portrait */
const BACKDROPS: Record<string, { sky: [string, string]; hill?: string; planks?: boolean; stars?: boolean }> = {
  marit: { sky: ['#f6c47a', '#c8644a'], planks: true },
  halvor: { sky: ['#7ab8e0', '#3a78b0'], hill: '#2e5272' },
  selma: { sky: ['#5ac8c0', '#1e6a7a'], hill: '#1c3e4a' },
  edvard: { sky: ['#2a2a6a', '#5a3a7a'], hill: '#161c40', stars: true },
  astrid: { sky: ['#e8c890', '#b8704a'], planks: true },
  ray: { sky: ['#9ab8c8', '#4a6a80'], hill: '#1e3a32' },
  leilani: { sky: ['#ffd8a0', '#e87a6a'], planks: true },
  kimo: { sky: ['#7ad0e8', '#2a8ab8'], hill: '#2a5a3a' },
  tutu: { sky: ['#ffb07a', '#a85a8a'], hill: '#1e2a3a' },
  ingvild: { sky: ['#a8c8e8', '#4a6a9a'], hill: '#e8eef4' },
  johan: { sky: ['#2a3a6a', '#6a4a8a'], hill: '#d8e4f0', stars: true },
  pus: { sky: ['#ffc080', '#e07a5a'], planks: true },
  nadja: { sky: ['#ece4d4', '#a89c8c'], planks: true },
  brita: { sky: ['#9ac4e4', '#4a7aaa'], hill: '#6a6e4a' },
  aslak: { sky: ['#f4b07a', '#6a4a7a'], hill: '#2a2434' },
  frida: { sky: ['#a8d4ec', '#5a8abc'], hill: '#8a5236' },
}

function withBackdrop(face: HTMLCanvasElement, id: string) {
  const b = BACKDROPS[id] ?? BACKDROPS.halvor
  const S = face.width
  const p = new Pix(S, S)
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const k = y / (S - 1) + (BAY[(y % 4) * 4 + (x % 4)] / 16 - 0.5) * 0.25
      let c = mix(b.sky[0], b.sky[1], Math.round(Math.max(0, Math.min(1, k)) * 4) / 4)
      if (b.planks) {
        if (x % 6 === 0) c = shade(c, -0.12)
        else if (x % 6 === 1) c = shade(c, 0.08)
      }
      if (b.hill && y > S - 9 + Math.round(2.5 * Math.sin(x * 0.35 + id.length) + Math.sin(x * 0.9))) c = b.hill
      if (b.stars && (x * 7 + y * 13) % 37 === 0 && y < S - 10) c = '#f8f4e0'
      p.set(x, y, c)
    }
  const c = p.toCanvas()
  c.getContext('2d')!.drawImage(face, 0, 0)
  return c
}

export function portrait(id: string) {
  return withBackdrop(id === 'pus' ? catPortrait() : person(id), id)
}

function person(id: string) {
  const f = PORTRAITS[id]
  const S = 24
  const p = new Pix(S, S)
  const skinS = shade(f.skin, -0.2)
  const hairS = shade(f.hair, -0.22)
  const cx = 11.5
  const cy = 10.5
  // body
  for (let y = 18; y < S; y++)
    for (let x = 3; x < 21; x++) {
      const dx = Math.abs(x - cx)
      if (dx > 6 + (y - 18) * 1.4) continue
      let c = f.cloth
      if (f.cloth2 && id === 'edvard' && (y === 20 || y === 22) && (x + y) % 3 === 0) c = f.cloth2
      if (f.cloth2 && id === 'edvard' && y === 19) c = '#f2eee6'
      // a Norwegian knitted sweater: a white yoke with red stars
      if (id === 'astrid' && y < 22 && (y === 18 || (x + y) % 2 === 0)) c = y === 20 && x % 4 === 1 ? f.cloth : f.cloth2!
      // aloha shirts: big white flowers on red, yellow on blue
      if ((id === 'leilani' || id === 'kimo') && y > 18 && (x * 3 + y * 5) % 7 === 0) c = f.cloth2!
      // a lei of yellow flowers around the neck
      if (id === 'tutu' && y === 18 && Math.abs(x - cx) < 6) c = (x % 2 ? '#ffd84a' : '#f8a83a')
      // a reflective stripe across the flotation suit
      if (id === 'ingvild' && y === 21 && Math.abs(x - cx) < 7) c = '#e8eef4'
      // a work jacket with a yellow collar
      if (id === 'ray' && y === 18 && Math.abs(x - cx) < 5) c = f.cloth2!
      if (f.cloth2 && id === 'marit' && dx < 3.5 && y > 18) c = shade(f.cloth, 0.05)
      if (f.cloth2 && id === 'marit' && dx >= 3.5 && dx < 5.5) c = f.cloth2
      if (id === 'selma' && y === 19 && dx < 2) c = f.cloth2!
      // a red knitted cardigan open over a white blouse, with gold buttons
      if (id === 'nadja') {
        if (dx < 3.5 - (y - 18) * 0.75) c = f.cloth2!
        else if ((x + y) % 2 === 0) c = shade(c, -0.06)
        if (Math.abs(dx - (3.6 - (y - 18) * 0.75)) < 0.5 && y > 19 && y % 2 === 0) c = '#f2c24a'
      }
      // a navy uniform jacket: white collar, lapels, gold buttons and shoulder stripes
      if (id === 'brita') {
        if (y === 18 && dx < 2.5) c = f.cloth2!
        if (y > 18 && Math.abs(dx - (2 - (y - 19) * 0.5)) < 0.6 && dx > 0.4) c = shade(f.cloth, -0.3)
        if ((y === 20 || y === 22) && dx < 0.6 && x === 11) c = '#f2c24a'
        if (y === 19 && dx > 6 && dx < 8.5) c = '#f2c24a'
      }
      // a dark knitted jumper with the bright collar of a gákti: blue with red and yellow bands
      if (id === 'aslak') {
        if ((x + Math.floor(y / 2)) % 3 === 0) c = shade(c, 0.08)
        if (y === 18 && dx < 5.5) c = f.cloth2!
        if (y === 19 && dx < 6.5) c = x % 2 ? '#d8333a' : '#f2c24a'
        if (y > 19 && dx < 1.2) c = y % 2 ? f.cloth2! : '#d8333a'
      }
      // green overalls over a work shirt
      if (id === 'frida') {
        const bib = dx < 3.6 && y > 18
        const strap = Math.abs(dx - 4.4) < 0.9
        if (!bib && !strap && y < 21) c = f.cloth2!
        if (strap && y === 19) c = '#d8d4c8'
        if (y === 18 && dx < 2) c = f.cloth2!
      }
      if (x < cx - 4) c = shade(c, -0.12)
      p.set(x, y, c)
    }
  // neck
  p.rect(10, 16, 4, 3, skinS)
  // head
  for (let y = 2; y < 18; y++)
    for (let x = 4; x < 20; x++) {
      const d = ((x - cx) / 6.2) ** 2 + ((y - cy) / 6.8) ** 2
      if (d > 1) continue
      p.set(x, y, x < cx - 3.5 || y > 15 ? skinS : f.skin)
    }
  // ears
  p.set(5, 11, skinS)
  p.set(18, 11, skinS)
  // hair
  const H = f.hair
  if (f.style === 'bun' || f.style === 'bob') {
    for (let y = 0; y < 17; y++)
      for (let x = 2; x < 22; x++) {
        const d = ((x - cx) / 7.4) ** 2 + ((y - 9.5) / 8) ** 2
        if (d > 1) continue
        const top = y < 7 - (Math.abs(x - cx) < 2 ? 0 : 0)
        const side = Math.abs(x - cx) > 5.2 && y < (f.style === 'bob' ? 16 : 12)
        const fringe = f.style === 'bob' && y < 8 && (x < 9 || x > 13)
        if (top || side || fringe) p.set(x, y, x < cx - 3 || (y > 3 && (x + y) % 5 === 0) ? hairS : H)
      }
    if (f.style === 'bun')
      for (let y = 0; y < 5; y++)
        for (let x = 8; x < 16; x++) if (((x - cx) / 3) ** 2 + ((y - 2) / 2.4) ** 2 <= 1) p.set(x, y, x < 11 ? hairS : H)
  }
  if (f.style === 'short') {
    // cropped short: the ears show, a side parting and a fringe swept across
    for (let y = 1; y < 12; y++)
      for (let x = 3; x < 21; x++) {
        const d = ((x - cx) / 7) ** 2 + ((y - 8.5) / 7.6) ** 2
        if (d > 1) continue
        const top = y < 6
        const side = Math.abs(x - cx) > 5.6 && y < 10
        const fringe = y < 8 && x < 9 + (7 - y)
        if (top || side || fringe) p.set(x, y, x < cx - 3 || (y > 2 && (x * 2 + y) % 7 === 0) ? hairS : H)
      }
    if (id === 'frida')
      // a few unruly tufts, and sawdust in them
      for (const [x, y, c] of [[9, 1, H], [10, 0, H], [14, 1, H], [15, 2, hairS], [16, 1, H], [12, 3, '#fff4d0'], [16, 4, '#fff4d0'], [7, 5, '#fff4d0']] as [number, number, string][]) p.set(x, y, c)
  }
  if (f.style === 'flat') {
    // a flat cap, wide over the brow with a short peak
    const cap = f.capColor ?? '#3e3e4c'
    for (let y = 1; y < 9; y++)
      for (let x = 3; x < 21; x++) {
        const crown = y < 7 && ((x - cx) / 7.4) ** 2 + ((y - 6) / 5) ** 2 <= 1
        const peak = y >= 7 && y <= 8 && Math.abs(x - cx) < 6.5 - (y - 7)
        if (crown || peak) p.set(x, y, peak ? (y === 8 ? shade(cap, -0.35) : shade(cap, -0.15)) : x < cx - 2 ? shade(cap, -0.12) : (x + y) % 3 === 0 ? shade(cap, 0.08) : cap)
      }
    // white hair curling out under the cap
    for (const [x, y] of [[4, 8], [5, 9], [5, 10], [19, 8], [18, 9], [18, 10], [4, 10]]) p.set(x, y, (x + y) % 2 ? H : shade(H, -0.1))
  }
  if (f.pencil)
    // a carpenter's pencil tucked behind the ear
    for (let k = 0; k < 5; k++) {
      p.set(21 - k, 4 + k, k === 0 ? '#e87a8a' : k === 4 ? '#e8c8a0' : '#f2c24a')
      p.set(21 - k, 5 + k, k === 4 ? '#3a3a48' : k === 0 ? '#c85a6a' : '#c8962e')
    }
  if (f.style === 'old') {
    // bald on top, tufts at the side
    for (let y = 5; y < 13; y++) {
      p.set(4, y, H)
      p.set(5, y, y % 2 ? H : shade(H, -0.12))
      p.set(19, y, H)
      p.set(18, y, y % 2 ? H : shade(H, -0.12))
    }
    p.set(6, 5, H)
    p.set(17, 5, H)
    p.set(13, 4, shade(f.skin, 0.25))
    p.set(14, 4, shade(f.skin, 0.25))
  }
  if (f.style === 'cap') {
    // a baseball cap with the bill pointing at you
    const cap = '#2a3a5a'
    for (let y = 1; y < 9; y++)
      for (let x = 3; x < 21; x++) {
        const crown = y < 7 && ((x - cx) / 6.6) ** 2 + ((y - 6.5) / 5.5) ** 2 <= 1
        const bill = y >= 7 && y <= 8 && Math.abs(x - cx) < 7.5
        if (crown || bill) p.set(x, y, bill ? (y === 8 ? '#1a2440' : '#3a4a6a') : x < cx - 2 ? '#1e2a48' : cap)
      }
    p.set(11, 3, '#f2c24a')
    p.set(12, 3, '#f2c24a')
    p.set(5, 9, H)
    p.set(5, 10, H)
    p.set(18, 9, H)
    p.set(18, 10, H)
  }
  if (f.style === 'hat') {
    const hat = '#f2c24a'
    const hatS = '#c98f2e'
    for (let y = 0; y < 9; y++)
      for (let x = 2; x < 22; x++) {
        const crown = y < 7 && ((x - cx) / 6.4) ** 2 + ((y - 6) / 6) ** 2 <= 1
        const brim = y >= 6 && y <= 8 && Math.abs(x - cx) < 10 - (y - 6)
        if (crown || brim) p.set(x, y, brim ? (y === 8 ? hatS : hat) : x < cx - 2 ? hatS : hat)
      }
    // side hair under the hat
    p.set(5, 9, H)
    p.set(5, 10, H)
    p.set(18, 9, H)
    p.set(18, 10, H)
  }
  // beard
  if (f.beard)
    for (let y = 12; y < 20; y++)
      for (let x = 4; x < 20; x++) {
        const d = ((x - cx) / 7) ** 2 + ((y - 12) / 7.5) ** 2
        if (d > 1 || (y < 15 && Math.abs(x - cx) < 4)) continue
        p.set(x, y, (x + y) % 4 === 0 ? shade(f.beard, -0.12) : f.beard)
      }
  p.outline(0.62)

  // face details on top of the outline
  const eye = f.eyes ?? INK
  for (const ex of [8, 14]) {
    p.set(ex, 11, eye)
    p.set(ex + 1, 11, eye)
    p.set(ex, 12, eye)
    p.set(ex + 1, 12, eye)
    p.set(ex, 11, '#fff8e8')
    if (f.readers) {
      // half-moon readers: only the lower rims, sitting low
      for (let i = -1; i <= 2; i++) p.set(ex + i, 14, f.readers)
      p.set(ex - 2, 13, f.readers)
      p.set(ex + 3, 13, f.readers)
      p.set(ex, 13, '#c8dcec')
      p.set(ex + 1, 13, '#a8c0d8')
    }
    if (f.glasses) {
      const fr = '#f2c24a'
      for (let i = -1; i <= 2; i++) {
        p.set(ex + i, 9, fr)
        p.set(ex + i, 14, fr)
      }
      for (let j = 10; j <= 13; j++) {
        p.set(ex - 2, j, fr)
        p.set(ex + 3, j, fr)
      }
    }
    const brow = f.brows ?? shade(f.hair, -0.3)
    if (!f.glasses) {
      p.set(ex, 9, brow)
      p.set(ex + 1, 9, brow)
      if (f.style === 'old' || f.style === 'hat') {
        p.set(ex - 1, 9, brow)
        p.set(ex + 2, 9, brow)
        p.set(ex + (ex < 11 ? -1 : 2), 8, brow)
      }
    }
  }
  if (f.glasses) {
    p.set(11, 11, '#f2c24a')
    p.set(12, 11, '#f2c24a')
  }
  if (f.readers) {
    p.set(11, 13, f.readers)
    p.set(12, 13, f.readers)
    // the string hangs from the arms down round the neck
    for (const [x, y] of [[4, 13], [4, 14], [4, 15], [19, 13], [19, 14], [19, 15], [6, 18], [7, 19], [8, 20], [9, 21], [10, 21], [11, 22], [12, 22], [13, 21], [14, 21], [15, 20], [16, 19], [17, 18]]) p.set(x, y, '#e8d49a')
  }
  if (f.earrings)
    for (const ex of [5, 18]) {
      p.set(ex, 12, f.earrings)
      p.set(ex, 13, shade(f.earrings, -0.25))
      p.set(ex, 14, f.earrings)
    }
  if (f.wrinkles) {
    const ln = shade(f.skin, -0.18)
    for (const [x, y] of [[6, 11], [6, 12], [17, 11], [17, 12], [9, 15], [14, 15], [8, 14], [15, 14], [10, 10], [13, 10]]) p.set(x, y, ln)
  }
  // nose and mouth
  p.set(11, 13, skinS)
  p.set(12, 13, skinS)
  p.set(11, 14, skinS)
  const mouth = '#a8484e'
  if (f.beard) {
    p.set(10, 15, mouth)
    p.set(11, 15, mouth)
    p.set(12, 15, mouth)
    p.set(13, 15, mouth)
  } else {
    p.set(10, 15, mouth)
    p.set(11, 16, mouth)
    p.set(12, 16, mouth)
    p.set(13, 15, mouth)
  }
  if (f.mustache) for (let x = 9; x <= 14; x++) p.set(x, 14, x === 9 || x === 14 ? shade(f.mustache, -0.15) : f.mustache)
  // blush and freckles
  const blush = mix(f.skin, '#ff6a6a', 0.35)
  p.set(7, 14, blush)
  p.set(16, 14, blush)
  if (f.freckles) for (const [x, y] of [[8, 13], [9, 14], [15, 13], [14, 14]]) p.set(x, y, shade(f.skin, -0.25))
  if (id === 'leilani') {
    // a hibiscus flower behind her ear
    for (const [x, y, c] of [[4, 8, '#ff5a7a'], [5, 7, '#ff5a7a'], [3, 7, '#ff8aa0'], [4, 6, '#ff5a7a'], [4, 7, '#ffd84a']] as [number, number, string][]) p.set(x, y, c)
  }
  if (f.style === 'old' || id === 'astrid' || id === 'tutu') {
    p.set(7, 9, shade(f.skin, -0.12))
    p.set(16, 9, shade(f.skin, -0.12))
  }
  return p.toCanvas()
}

function catPortrait() {
  const S = 24
  const p = new Pix(S, S)
  const o = '#f0a04a'
  const O = '#c8742e'
  const w = '#f8ecd8'
  const cx = 11.5
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const head = ((x - cx) / 8.5) ** 2 + ((y - 13) / 7) ** 2 <= 1
      const earL = y >= 3 && y < 9 && x >= 4 && x <= 9 && x - 4 >= (8 - y) * 0.6 && 9 - x >= (8 - y) * 0.2
      const earR = y >= 3 && y < 9 && x >= 14 && x <= 19 && 19 - x >= (8 - y) * 0.6 && x - 14 >= (8 - y) * 0.2
      const body = y >= 19 && Math.abs(x - cx) < 9
      if (!(head || earL || earR || body)) continue
      let c = o
      if ((earL || earR) && !head && Math.abs(x - (x < 12 ? 6.5 : 16.5)) < 1.2 && y > 5) c = '#f6b0a0'
      if (head && y < 10 && (x === 10 || x === 13 || x === 11 || x === 12) && y % 3 !== 0) c = O
      if (head && y > 14 && Math.abs(x - cx) < 3.5) c = w
      if (body && Math.abs(x - cx) < 3) c = w
      if (x < 6 && head) c = O
      p.set(x, y, c)
    }
  p.outline(0.6)
  for (const ex of [7, 15]) {
    p.rect(ex, 12, 2, 2, '#4a8a3a')
    p.set(ex + 1, 12, '#1a2a1a')
    p.set(ex + 1, 13, '#1a2a1a')
    p.set(ex, 12, '#c8f0a0')
  }
  p.set(11, 15, '#e87a8a')
  p.set(12, 15, '#e87a8a')
  p.set(11, 16, INK)
  p.set(12, 16, INK)
  p.set(10, 17, INK)
  p.set(13, 17, INK)
  for (const [x, y] of [[3, 15], [4, 16], [20, 15], [19, 16]]) p.set(x, y, '#f8ecd8')
  return p.toCanvas()
}
