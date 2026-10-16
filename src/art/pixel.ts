// Small helpers for drawing pixel art into canvases

export type RGB = [number, number, number]

export const hex2rgb = (h: string): RGB => {
  const n = parseInt(h.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgb2hex = ([r, g, b]: RGB) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')

export const mix = (a: string, b: string, t: number) => {
  const A = hex2rgb(a)
  const B = hex2rgb(b)
  return rgb2hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t])
}

/** Negative darkens towards a deep violet (hue-shifted shadows), positive lightens towards a warm white */
export const shade = (c: string, t: number) => (t < 0 ? mix(c, '#140c24', -t) : mix(c, '#fff8e8', t))

export const rgba = (c: string, a: number) => {
  const [r, g, b] = hex2rgb(c)
  return `rgba(${r},${g},${b},${a})`
}

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  const g = c.getContext('2d')!
  g.imageSmoothingEnabled = false
  return { c, g }
}

/** Sprite from rows of characters; each character is looked up in the palette, unknown = transparent */
export function grid(rows: string[], pal: Record<string, string>) {
  const h = rows.length
  const w = Math.max(...rows.map((r) => r.length))
  const p = new Pix(w, h)
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const col = pal[r[x]]
      if (col) p.set(x, y, col)
    }
  })
  return p.toCanvas()
}

export function flip(src: HTMLCanvasElement) {
  const { c, g } = canvas(src.width, src.height)
  g.translate(src.width, 0)
  g.scale(-1, 1)
  g.drawImage(src, 0, 0)
  return c
}

/** Nearest-neighbour upscaled data URL, for use in HTML */
export function toURL(src: HTMLCanvasElement, scale: number) {
  const { c, g } = canvas(src.width * scale, src.height * scale)
  g.drawImage(src, 0, 0, c.width, c.height)
  return c.toDataURL()
}

/** A pixel buffer of hex colours */
export class Pix {
  d: (string | null)[]
  constructor(
    public w: number,
    public h: number,
  ) {
    this.d = new Array(w * h).fill(null)
  }
  in(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }
  set(x: number, y: number, c: string | null) {
    x = Math.round(x)
    y = Math.round(y)
    if (this.in(x, y)) this.d[y * this.w + x] = c
  }
  get(x: number, y: number) {
    x = Math.round(x)
    y = Math.round(y)
    return this.in(x, y) ? this.d[y * this.w + x] : null
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }
  /** Darken every filled pixel that touches an empty one */
  outline(amount = 0.55, keep?: (x: number, y: number) => boolean) {
    const out: [number, number, string][] = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y)
        if (!c || keep?.(x, y)) continue
        if (!this.get(x - 1, y) || !this.get(x + 1, y) || !this.get(x, y - 1) || !this.get(x, y + 1))
          out.push([x, y, shade(c, -amount)])
      }
    for (const [x, y, c] of out) this.set(x, y, c)
  }
  toCanvas() {
    const { c, g } = canvas(this.w, this.h)
    const img = g.createImageData(this.w, this.h)
    this.d.forEach((col, i) => {
      if (!col) return
      const [r, gg, b] = hex2rgb(col)
      img.data.set([r, gg, b, 255], i * 4)
    })
    g.putImageData(img, 0, 0)
    return c
  }
}

/** Deterministic random numbers */
export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

export const hash = (str: string) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}
