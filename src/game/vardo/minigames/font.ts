// A tiny pixel font for the minigames, drawn with fillRect so it stays crisp at any
// scale. Extends the 3×5 sign letters in harbor.ts with the whole alphabet, æøå,
// digits and the punctuation the minigames need. Text is always drawn in capitals.

import { INK } from '../../../art/sprites'

/** Rows of '1' and '.'; a glyph with more than 5 rows starts that many rows higher (Å) */
const G: Record<string, string[]> = {
  A: ['.1.', '1.1', '111', '1.1', '1.1'],
  B: ['11.', '1.1', '11.', '1.1', '11.'],
  C: ['.11', '1..', '1..', '1..', '.11'],
  D: ['11.', '1.1', '1.1', '1.1', '11.'],
  E: ['111', '1..', '11.', '1..', '111'],
  F: ['111', '1..', '11.', '1..', '1..'],
  G: ['.11', '1..', '1.1', '1.1', '.11'],
  H: ['1.1', '1.1', '111', '1.1', '1.1'],
  I: ['111', '.1.', '.1.', '.1.', '111'],
  J: ['..1', '..1', '..1', '1.1', '.1.'],
  K: ['1.1', '1.1', '11.', '1.1', '1.1'],
  L: ['1..', '1..', '1..', '1..', '111'],
  M: ['1...1', '11.11', '1.1.1', '1...1', '1...1'],
  N: ['1..1', '11.1', '1.11', '1..1', '1..1'],
  O: ['.1.', '1.1', '1.1', '1.1', '.1.'],
  P: ['11.', '1.1', '11.', '1..', '1..'],
  Q: ['.1.', '1.1', '1.1', '11.', '.11'],
  R: ['11.', '1.1', '11.', '1.1', '1.1'],
  S: ['.11', '1..', '.1.', '..1', '11.'],
  T: ['111', '.1.', '.1.', '.1.', '.1.'],
  U: ['1.1', '1.1', '1.1', '1.1', '111'],
  V: ['1.1', '1.1', '1.1', '1.1', '.1.'],
  W: ['1...1', '1...1', '1.1.1', '11.11', '1...1'],
  X: ['1.1', '1.1', '.1.', '1.1', '1.1'],
  Y: ['1.1', '1.1', '.1.', '.1.', '.1.'],
  Z: ['111', '..1', '.1.', '1..', '111'],
  Æ: ['.111', '1.1.', '1111', '1.1.', '1.11'],
  Ø: ['.111', '1.11', '11.1', '1..1', '111.'],
  Å: ['.1.', '...', '.1.', '1.1', '111', '1.1', '1.1'],
  '0': ['111', '1.1', '1.1', '1.1', '111'],
  '1': ['.1.', '11.', '.1.', '.1.', '111'],
  '2': ['11.', '..1', '.1.', '1..', '111'],
  '3': ['11.', '..1', '.1.', '..1', '11.'],
  '4': ['1.1', '1.1', '111', '..1', '..1'],
  '5': ['111', '1..', '11.', '..1', '11.'],
  '6': ['.11', '1..', '111', '1.1', '111'],
  '7': ['111', '..1', '.1.', '.1.', '.1.'],
  '8': ['111', '1.1', '111', '1.1', '111'],
  '9': ['111', '1.1', '111', '..1', '11.'],
  '.': ['.', '.', '.', '.', '1'],
  ',': ['.', '.', '.', '1', '1'],
  '!': ['1', '1', '1', '.', '1'],
  '?': ['111', '..1', '.1.', '...', '.1.'],
  ':': ['.', '1', '.', '1', '.'],
  ';': ['.', '1', '.', '1', '1'],
  '-': ['...', '...', '111', '...', '...'],
  '+': ['...', '.1.', '111', '.1.', '...'],
  '=': ['...', '111', '...', '111', '...'],
  '×': ['...', '1.1', '.1.', '1.1', '...'],
  '/': ['..1', '..1', '.1.', '1..', '1..'],
  '%': ['1.1', '..1', '.1.', '1..', '1.1'],
  "'": ['1', '1', '.', '.', '.'],
  '"': ['1.1', '1.1', '...', '...', '...'],
  '«': ['....', '.1.1', '1.1.', '.1.1', '....'],
  '»': ['....', '1.1.', '.1.1', '1.1.', '....'],
  '…': ['.....', '.....', '.....', '.....', '1.1.1'],
  '(': ['.1', '1.', '1.', '1.', '.1'],
  ')': ['1.', '.1', '.1', '.1', '1.'],
  '<': ['..1', '.1.', '1..', '.1.', '..1'],
  '>': ['1..', '.1.', '..1', '.1.', '1..'],
  '←': ['..1..', '.1...', '11111', '.1...', '..1..'],
  '→': ['..1..', '...1.', '11111', '...1.', '..1..'],
  '↑': ['.1.', '111', '1.1', '.1.', '.1.'],
  '↓': ['.1.', '.1.', '1.1', '111', '.1.'],
  '*': ['.1.', '111', '.1.', '1.1', '...'],
  '#': ['1.1', '111', '1.1', '111', '1.1'],
}

/** Line height at scale 1 (glyphs are 5 tall, Å reaches two rows above) */
export const LINE = 8

const glyph = (ch: string) => G[ch] ?? (ch === ' ' ? null : G['?'])
const advance = (ch: string) => (ch === ' ' ? 3 : (glyph(ch)?.[0].length ?? 3) + 1)

/** Width in pixels of a line of text */
export function textW(s: string, scale = 1) {
  let w = 0
  for (const ch of s.toUpperCase()) w += advance(ch)
  return Math.max(0, w - 1) * scale
}

function raw(g: CanvasRenderingContext2D, s: string, x: number, y: number, scale: number) {
  x = Math.round(x)
  y = Math.round(y)
  for (const ch of s.toUpperCase()) {
    const rows = glyph(ch)
    if (rows) {
      const off = rows.length - 5
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === '1') g.fillRect(x + i * scale, y + (j - off) * scale, scale, scale)
      })
    }
    x += advance(ch) * scale
  }
}

export interface TextOpts {
  scale?: number
  /** ink outline (default) or a drop shadow colour, or none */
  outline?: string | false
  shadow?: string
}

/** Draws text with its top-left corner at x, y */
export function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, o: TextOpts = {}) {
  const sc = o.scale ?? 1
  const ol = o.outline === undefined ? INK : o.outline
  if (o.shadow) {
    g.fillStyle = o.shadow
    raw(g, s, x, y + sc, sc)
  }
  if (ol) {
    g.fillStyle = ol
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) raw(g, s, x + dx * sc, y + dy * sc, sc)
  }
  g.fillStyle = color
  raw(g, s, x, y, sc)
}

/** Draws text centred on cx */
export function textC(g: CanvasRenderingContext2D, s: string, cx: number, y: number, color: string, o: TextOpts = {}) {
  text(g, s, Math.round(cx - textW(s, o.scale ?? 1) / 2), y, color, o)
}

/** Breaks text into lines no wider than w */
export function wrap(s: string, w: number, scale = 1) {
  const out: string[] = []
  let line = ''
  for (const word of s.split(' ')) {
    const next = line ? line + ' ' + word : word
    if (line && textW(next, scale) > w) {
      out.push(line)
      line = word
    } else line = next
  }
  if (line) out.push(line)
  return out
}
