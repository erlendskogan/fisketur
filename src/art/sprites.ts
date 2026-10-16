import { Pix, grid, shade, mix } from './pixel'

export const INK = '#2a1d2e'

// ---------- boat ----------

export const BOAT_W = 48
export const BOAT_H = 24

/** Måken: a small double-ended clinker-built boat. The water line is at y = 15. */
export function boatSprite(hull: string, stripe: string) {
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
  // oarlocks
  for (const x of [15, 29]) p.set(ox + x, Math.round(11 - 5 * Math.pow(x / 43, 5) - 2.5 * Math.pow(1 - x / 43, 4)) - 1, '#4a4458')
  // lantern pole at the stern
  for (let y = 0; y < 8; y++) p.set(ox + 4, y + 1, y < 3 ? '#4a3428' : '#6a4a32')
  p.rect(ox + 3, 0, 3, 3, '#3a3a4a')
  p.outline(0.6)
  // lantern glass, drawn after the outline so it stays bright
  p.set(ox + 4, 1, '#ffd36a')
  return p.toCanvas()
}

export const LANTERN = { x: 6, y: 1 }

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

export const fisherSprite = () => grid(FISHER, FISHER_PAL)
/** Where the rod is held, relative to the fisher sprite */
export const FISHER_HAND = { x: 10, y: 15 }

// ---------- the cat ----------

const CAT_PAL = { k: INK, o: '#f0a04a', O: '#c8742e', w: '#f8ecd8', e: '#3a6a3a', n: '#e87a8a', p: '#f6b0a0' }

const CAT = [
  '.k...k......',
  'kpk.kpk.....',
  'kooooook....',
  'koeooeok....',
  'kowwnwok....',
  '.kowwok.....',
  '.kooOooookk.',
  '.kowoOOoookok',
  '.kowwoOOook.k',
  '.kkkkkkkkkk.',
]
const CAT_BLINK = CAT.map((r, i) => (i === 3 ? 'kokkokok....' : r))

export const catSprites = () => [grid(CAT, CAT_PAL), grid(CAT_BLINK, CAT_PAL)]

// ---------- small things ----------

export const heartSprite = () =>
  grid(['.kk.kk.', 'kppkppk', 'kpwpppk', '.kpppk.', '..kpk..', '...k...'], { k: INK, p: '#ff6a8a', w: '#fff8e8' })

export const bangSprite = () => grid(['kkkk', 'kyyk', 'kyyk', 'kyyk', 'kyyk', 'kkkk', 'kyyk', 'kkkk'], { k: INK, y: '#ffe04a' })

export const tinSprite = () =>
  grid(['.kkkkkk.', 'kTtTTTTk', 'kTTTTTTk', 'kkkkkkkk', 'kTTTTTTk', 'kTTtTTTk', '.kkkkkk.'], { k: INK, T: '#8a9aaa', t: '#e8f0f8' })

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

export const jellySprites = () => {
  const pal = { a: '#ff9ad0', b: '#ffd0ea', c: '#d870b0' }
  return [
    grid(['..aaaaa..', '.abbbbba.', 'aabbbbbaa', 'acaacaaca', '.c.c.c.c.', '.c.c.c.c.', 'c.c.c.c..', '.c...c...'], pal),
    grid(['.........', '.aaaaaaa.', 'abbbbbbba', 'acaacaaca', '.c.c.c.c.', 'c.c.c.c.c', '.c.c.c...', 'c...c....'], pal),
  ]
}

// ---------- icons for the HTML interface ----------

const ICON_PAL = {
  k: INK,
  y: '#ffd84a',
  Y: '#d8962e',
  w: '#fff8e8',
  b: '#c9823e',
  B: '#8a5a2e',
  r: '#d8433a',
  R: '#a52e34',
  p: '#f2e2b8',
  g: '#a8b0c0',
  s: '#4cb8e8',
  S: '#2a7ab0',
  m: '#f2e6b0',
}

export const ICONS: Record<string, string[]> = {
  coin: ['..kkkk..', '.kyyyyk.', 'kyywyyYk', 'kywyyyYk', 'kyyyyyYk', 'kyyyyYYk', '.kYYYYk.', '..kkkk..'],
  bucket: ['..kkkkk..', '.k.....k.', 'kkkkkkkkk', 'kbbbbbbbk', 'kBbbbbbBk', '.kbbbbbk.', '.kBbbbBk.', '.kbbbbbk.', '..kkkkk..'],
  book: ['kkkkkkkk.', 'krrrrrrwk', 'krrrwrrwk', 'krrwwwrwk', 'krrrwrrwk', 'krrrrrrwk', 'krrrrrrwk', 'kRRRRRRwk', 'kkkkkkkk.'],
  scroll: ['.kkkkkkk.', 'kwwwwwwwk', '.kpppppk.', '.kpkkkpk.', '.kpppppk.', '.kpkkppk.', '.kpppppk.', 'kwwwwwwwk', '.kkkkkkk.'],
  sea: ['.........', '.........', '..kk...kk', '.ksskskss', 'kssSsssSs', 'kSSSSSSSS', 'kssskssss', 'kSSSSSSSS', '.........'],
  house: ['....k....', '...krk...', '..krrrk..', '.krrrrrk.', 'kkkkkkkkk', '.kwwwwwk.', '.kwykwwk.', '.kwwkwwk.', '.kkkkkkk.'],
  gear: ['...k.k...', '.kkkkkkk.', '.kgggggk.', 'kkgkkkgkk', '.kgk.kgk.', 'kkgkkkgkk', '.kgggggk.', '.kkkkkkk.', '...k.k...'],
  sun: ['....y....', '.y..y..y.', '..yyyyy..', '..yywyy..', 'yyywyyyyy', '..yyyyy..', '..yyyyy..', '.y..y..y.', '....y....'],
  moon: ['..kkk....', '.kmmk....', 'kmmk.....', 'kmmk.....', 'kmmk.....', 'kmmmk....', '.kmmmkkk.', '..kmmmmk.', '...kkkk..'],
  letter: ['kkkkkkkkk', 'kpkpppkpk', 'kppkpkppk', 'kpppkpppk', 'kpppppppk', 'kpppprrpk', 'kpppprrpk', 'kkkkkkkkk'],
  lock: ['..kkkk..', '.kgggk..', '.kg..gk.', 'kkkkkkkk', 'kyyyyyyk', 'kyyYyyyk', 'kyyYyyyk', 'kkkkkkkk'],
}

export const iconCanvas = (name: string) => grid(ICONS[name], ICON_PAL)

// ---------- portraits ----------

interface Face {
  skin: string
  hair: string
  eyes?: string
  style: 'bun' | 'bob' | 'hat' | 'old'
  cloth: string
  cloth2?: string
  beard?: string
  glasses?: boolean
  freckles?: boolean
  brows?: string
}

export const PORTRAITS: Record<string, Face> = {
  marit: { skin: '#f4c8a0', hair: '#d8642e', style: 'bun', cloth: '#4c8a5a', cloth2: '#f0e2c0', freckles: true },
  halvor: { skin: '#e8b48c', hair: '#e8e4dc', style: 'hat', cloth: '#2e4a6e', beard: '#f2eee6', brows: '#f2eee6' },
  selma: { skin: '#b07a52', hair: '#2a1c22', style: 'bob', cloth: '#2aa59a', cloth2: '#f2c24a', glasses: true },
  edvard: { skin: '#f0c2a0', hair: '#f2eee6', style: 'old', cloth: '#2e4a8a', cloth2: '#d8433a', brows: '#f8f6f0', beard: undefined },
}

export function portrait(id: string) {
  if (id === 'pus') return catPortrait()
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
      if (f.cloth2 && id === 'marit' && dx < 3.5 && y > 18) c = shade(f.cloth, 0.05)
      if (f.cloth2 && id === 'marit' && dx >= 3.5 && dx < 5.5) c = f.cloth2
      if (id === 'selma' && y === 19 && dx < 2) c = f.cloth2!
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
  // blush and freckles
  const blush = mix(f.skin, '#ff6a6a', 0.35)
  p.set(7, 14, blush)
  p.set(16, 14, blush)
  if (f.freckles) for (const [x, y] of [[8, 13], [9, 14], [15, 13], [14, 14]]) p.set(x, y, shade(f.skin, -0.25))
  if (f.style === 'old') {
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
