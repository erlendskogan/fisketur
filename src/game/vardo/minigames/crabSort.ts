// Krabbesortering: crabs from the pot land on the sorting table one at a time. The gauge
// shows the carapace against the legal line, and as the crab is turned over you see the
// tail flap: narrow on a male, broad and round on a female. Swipe right (or tap the right
// half) to keep it in the tub, left to throw it back over the rail.

import { Pix, hash, mix, shade } from '../../../art/pixel'
import { bangSprite, INK } from '../../../art/sprites'
import { sfx } from '../../../audio'
import type { CrabCatch, CrabSortResult, MiniInput } from '../types'
import { Bits, clamp, COL, ease, frame, lerp, Mini, panel, shake } from './common'
import { LINE, text, textC, textW, wrap } from './font'

const PX_PER_MM = 0.22

interface Spr {
  c: HTMLCanvasElement
  w: number
  h: number
}

const sprites = new Map<string, Spr>()
export const isSnowCrab = (id: string) => /sn(o|ø)|snow|opilio/i.test(id)

/** Which crab to draw: king crab, snow crab, the small decorator crab or the spiny stone crab */
export type CrabKind = 'king' | 'snow' | 'pynt' | 'troll'
export const crabKind = (id: string): CrabKind => (isSnowCrab(id) ? 'snow' : /pynt/.test(id) ? 'pynt' : /troll/.test(id) ? 'troll' : 'king')

// shape and colour per kind: carapace length/width, leg length, leg pairs and thickness, claw size, spines
const KINDS: Record<CrabKind, { ch: number; leg: (cw: number) => number; pairs: number[]; bend: number; thick: number[]; arm: number; hand: [number, number]; spines: number; pal: { base: string; light: string; dark: string; spine: string; under: string; legU: string; eggs: string } }> = {
  king: { ch: 1, leg: (cw) => cw * 1.1 + 6, pairs: [-0.45, 0.08, 0.6], bend: 0.75, thick: [1.7, 1.3, 0.8], arm: 1.6, hand: [3.2, 2.3], spines: 3, pal: { base: '#8a2e24', light: '#c4563a', dark: '#561a1c', spine: '#eca07a', under: '#ecd6b6', legU: '#d8986a', eggs: '#8a2e4a' } },
  snow: { ch: 0.9, leg: (cw) => cw * 1.45 + 6, pairs: [-0.6, -0.2, 0.2, 0.6], bend: 0.55, thick: [1.1, 0.8, 0.5], arm: 1, hand: [1.6, 1.6], spines: 0, pal: { base: '#d8844a', light: '#f2b878', dark: '#a0522e', spine: '#f8d0a0', under: '#f4e2c4', legU: '#eac08a', eggs: '#e8742a' } },
  // Hyas: a small brown spider crab, pear-shaped, wearing weed and sponge it has stuck on itself
  pynt: { ch: 1.2, leg: (cw) => cw * 0.95 + 5, pairs: [-0.55, -0.15, 0.25, 0.65], bend: 0.6, thick: [1, 0.8, 0.5], arm: 0.9, hand: [1.5, 1.5], spines: 0, pal: { base: '#7a5a3e', light: '#a8845a', dark: '#4e3a2a', spine: '#c8a878', under: '#e8d8b8', legU: '#d8c098', eggs: '#d0802a' } },
  // Lithodes: orange-red and covered in spines, with shorter, stouter legs than the king crab
  troll: { ch: 1.05, leg: (cw) => cw * 0.8 + 5, pairs: [-0.45, 0.08, 0.6], bend: 0.7, thick: [1.9, 1.5, 1], arm: 1.7, hand: [2.8, 2.2], spines: 2, pal: { base: '#c0502e', light: '#e8784a', dark: '#7e2e1e', spine: '#ffc890', under: '#f0dcc0', legU: '#e8b088', eggs: '#8a2e4a' } },
}
const CRAB_NAME: Record<CrabKind, string> = { king: 'KONGEKRABBE', snow: 'SNØKRABBE', pynt: 'PYNTEKRABBE', troll: 'TROLLKRABBE' }
const WEED = ['#5a7a32', '#7a9a3a', '#4a6a2a']
const SPONGE = ['#e8c86a', '#d89a8a', '#e8e0c8']

/** A crab seen from above (or from below, turned over), facing up the screen */
export function crabSprite(kind: CrabKind, cw: number, male: boolean, under: boolean, fr: number): Spr {
  cw = Math.max(8, Math.round(cw))
  const key = `${kind}${cw}${male ? 'm' : 'f'}${under ? 'u' : 't'}${fr}`
  const hit = sprites.get(key)
  if (hit) return hit
  const K = KINDS[kind]
  const snow = kind === 'snow'
  const pynt = kind === 'pynt'
  const ch = Math.round(cw * K.ch)
  const legLen = K.leg(cw)
  const S = Math.ceil(cw + legLen * 2.1 + 14)
  const SH = Math.ceil(ch + legLen * 1.7 + 18)
  const p = new Pix(S, SH)
  const cx = S / 2
  const cy = SH / 2 + 2
  const seed = hash(key.slice(0, -1))
  const pal = K.pal
  const rnd = (x: number, y: number) => hash(`${Math.round(x)},${Math.round(y)},${seed}`) % 100
  // soft blotches for the decorator crab's weed
  const vnz = (x: number, y: number) => 0.5 + 0.3 * Math.sin(x * 1.3 + seed) * Math.cos(y * 1.1 - seed * 0.3) + 0.2 * Math.sin((x - y) * 0.9 + seed * 0.7)

  const disk = (x: number, y: number, r: number, c: string) => {
    for (let j = -Math.ceil(r); j <= Math.ceil(r); j++)
      for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) if (i * i + j * j <= r * r + 0.3) p.set(x + i, y + j, c)
  }
  const seg = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, c: string, spiky: boolean) => {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)))
    for (let i = 0; i <= n; i++) {
      const k = i / n
      const x = lerp(x0, x1, k)
      const y = lerp(y0, y1, k)
      disk(x, y, lerp(r0, r1, k), c)
    }
    // a lit top edge; spines along the legs of the stone crabs, bits of weed on the decorator crab
    for (let i = 1; i < n; i++) {
      const k = i / n
      const x = lerp(x0, x1, k)
      const y = lerp(y0, y1, k)
      p.set(x, y - Math.max(0, lerp(r0, r1, k) - 0.5), shade(c, 0.22))
      if (spiky && K.spines && i % K.spines === 0) p.set(x, y - lerp(r0, r1, k) - 1, under ? shade(c, -0.2) : pal.spine)
      if (spiky && pynt && !under && rnd(x, y) < 22) p.set(x, y - lerp(r0, r1, k) - 1, rnd(y, x) < 60 ? WEED[i % 3] : SPONGE[i % 3])
    }
  }

  // legs first, the body covers their roots
  const legC = under ? pal.legU : pal.base
  for (const s of [-1, 1]) {
    K.pairs.forEach((a0, i) => {
      const a = a0 + (fr ? (i % 2 ? 0.07 : -0.05) : 0)
      const rx = cx + s * cw * (pynt ? 0.3 + 0.12 * (a0 + 0.6) : 0.4)
      const ry = cy + ch * 0.4 * Math.sin(a) + ch * 0.05
      const l1 = legLen * 0.5
      const l2 = legLen * 0.58
      const jx = rx + s * Math.cos(a) * l1
      const jy = ry + Math.sin(a) * l1
      const b = a + K.bend
      const tx = jx + s * Math.cos(b) * l2
      const ty = jy + Math.sin(b) * l2
      const d = b + 0.7
      const th = K.thick
      seg(rx, ry, jx, jy, th[0], th[1], legC, !snow)
      seg(jx, jy, tx, ty, th[1], th[2], legC, !snow)
      seg(tx, ty, tx + s * Math.cos(d) * 3, ty + Math.sin(d) * 3, th[2], 0.4, shade(legC, -0.15), false)
      p.set(jx, jy, shade(legC, -0.3))
    })
    // the claws: on the stone crabs the right one is much bigger
    const big = s === 1
    const ax = cx + s * cw * (pynt ? 0.16 : 0.26)
    const ay = cy - ch * (pynt ? 0.2 : 0.36)
    const armL = cw * (snow ? 0.45 : pynt ? 0.5 : 0.42) + 3
    const ex = ax + s * armL * 0.55
    const ey = ay - armL * 0.75
    seg(ax, ay, ex, ey, K.arm, K.arm * 0.88, legC, !snow)
    const hr = big ? K.hand[0] : K.hand[1]
    const hx = ex + s * 0.5
    const hy = ey - hr
    disk(hx, hy, hr, under ? shade(pal.legU, 0.08) : shade(pal.base, 0.06))
    seg(hx - s * hr * 0.4, hy - hr * 0.6, hx - s * hr * 0.9, hy - hr - 2.5, 0.9, 0.4, under ? pal.legU : pal.dark, false)
    seg(hx + s * hr * 0.4, hy - hr * 0.6, hx + s * hr * 0.2, hy - hr - 3, 0.9, 0.4, under ? pal.legU : pal.dark, false)
  }

  // the carapace (or, turned over, the sternum); the decorator and stone crabs are pear-shaped, narrow in front
  const inside = (u: number, v: number) =>
    snow
      ? u * u + v * v * 1.05 < 1
      : pynt
        ? Math.pow(u / (0.62 + 0.36 * v), 2) + v * v < 1
        : kind === 'troll'
          ? Math.pow(u / (0.84 + 0.16 * v), 2) + v * v < 1
          : u * u + Math.pow(v * (1 - 0.22 * v), 2) < 1 && !(v > 0.92 && Math.abs(u) > 0.5)
  for (let y = -ch; y <= ch; y++)
    for (let x = -cw; x <= cw; x++) {
      const u = x / (cw / 2)
      const v = y / (ch / 2)
      if (!inside(u, v)) continue
      let c: string
      if (under) {
        c = pal.under
        if (Math.abs(u) > 0.72) c = shade(c, -0.08)
        if (!snow && !pynt && rnd(x, y) % 29 === 0) c = '#d89060'
      } else {
        const lit = (-u - v) * 0.16
        c = lit > 0.12 ? pal.light : lit < -0.14 ? pal.dark : pal.base
        c = shade(c, lit * 0.6)
        const nz = rnd(x, y)
        if (kind === 'king' && nz < 11) c = pal.spine
        else if (kind === 'king' && nz < 18) c = pal.dark
        else if (kind === 'troll' && nz < 22) c = pal.spine
        else if (kind === 'troll' && nz < 30) c = pal.dark
        else if (snow && nz < 6) c = pal.light
        // weed and sponge stuck on in patches
        else if (pynt && ((vnz(x, y) > 0.68 && nz < 80) || nz < 7)) c = nz < 55 ? WEED[nz % 3] : SPONGE[nz % 3]
        // the groove that runs across the back
        if (!pynt && Math.abs(v + 0.1 - Math.abs(u) * 0.3) < 0.06 && Math.abs(u) < 0.55) c = shade(c, -0.25)
      }
      p.set(cx + x, cy + y, c)
    }
  if (!under) {
    const top = cy - ch / 2
    if (kind === 'king') {
      // the rostrum and the eyes at the front
      p.set(cx, top - 1, pal.base)
      p.set(cx, top - 2, pal.spine)
      p.set(cx - 1, top - 1, pal.dark)
      p.set(cx + 1, top - 1, pal.dark)
    } else if (kind === 'troll') {
      // a long spiny rostrum, and spines sticking out all round the edge
      for (let k = 1; k <= 3; k++) p.set(cx, top - k, k === 3 ? pal.spine : pal.base)
      p.set(cx - 1, top - 2, pal.spine)
      p.set(cx + 1, top - 2, pal.spine)
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        const u = Math.sin(a)
        const v = -Math.cos(a)
        const w = 0.84 + 0.16 * v
        p.set(cx + Math.round(u * w * (cw / 2 + 1.2)), cy + Math.round(v * (ch / 2 + 1.2)), pal.spine)
      }
    } else if (pynt) {
      // two horns in front, and tufts of weed sticking up off the back
      p.set(cx - 1, top - 1, pal.base)
      p.set(cx + 1, top - 1, pal.base)
      p.set(cx - 1, top - 2, pal.dark)
      p.set(cx + 1, top - 2, pal.dark)
      for (let i = 0; i < 3 + Math.floor(cw / 6); i++) {
        const u = ((hash(`${seed}t${i}`) % 100) / 100 - 0.5) * 1.2
        const v = ((hash(`${seed}v${i}`) % 100) / 100) * 0.9
        const bx = cx + Math.round(u * (0.62 + 0.36 * v) * (cw / 2))
        const by = cy + Math.round(v * (ch / 2))
        const h = 2 + (i % 3)
        for (let k = 0; k < h; k++) p.set(bx + (k > 1 ? (i % 2 ? 1 : -1) : 0), by - k, k === h - 1 ? shade(WEED[i % 3], 0.3) : WEED[i % 3])
      }
    }
    const ey = top + (snow ? 0 : pynt ? 2 : kind === 'troll' ? 1 : -1)
    const ex = pynt ? 1 : 2
    for (const s of [-1, 1]) {
      p.set(cx + s * ex, ey, '#1a1418')
      p.set(cx + s * ex, ey + 1, shade(pal.base, -0.3))
    }
  } else {
    // the tail flap folded under the body: a narrow triangle on males, a broad round fan on females
    const fill = mix(pal.under, '#b88a5a', 0.35)
    for (let y = -ch; y <= ch; y++)
      for (let x = -cw; x <= cw; x++) {
        const u = x / (cw / 2)
        const v = y / (ch / 2)
        let inFlap: boolean
        if (male) {
          const hw = 0.07 + 0.22 * clamp((v + 0.25) / 1.1)
          inFlap = v > -0.25 && v < 0.88 && Math.abs(u) < hw
        } else inFlap = Math.pow(u / 0.74, 2) + Math.pow((v - 0.3) / 0.62, 2) < 1 && v > -0.3
        if (!inFlap || !inside(u, v)) continue
        let c = fill
        // the segments of the flap
        if (Math.round(v * ch * 0.5) % 3 === 0) c = shade(fill, -0.18)
        // a berried female carries her eggs under the flap
        if (!male && (x + y * 3) % 5 === 0 && v > 0.05) c = pal.eggs
        p.set(cx + x, cy + y, c)
      }
  }
  p.outline(0.62)
  const spr = { c: p.toCanvas(), w: S, h: SH }
  sprites.set(key, spr)
  return spr
}

type St = 'in' | 'sort' | 'keep' | 'throw'

export class CrabSort extends Mini<CrabSortResult> {
  readonly title = 'Krabbesortering'
  private i = 0
  private st: St = 'in'
  private sT = 0
  private keep: boolean[]
  private wrong = 0
  private missed = 0
  private limit: number
  private flipDur: number
  private downX = 0
  private downT = 0
  private dragging = false
  private dragX = 0
  private outX = 0
  private outY = 0
  private warn = 0
  private warnText = ''
  private shakeT = 0
  private bits = new Bits()
  private pops: { x: number; y: number; t: number; s: string; c: string }[] = []
  private inTub: { kind: CrabKind; cw: number; male: boolean; x: number; y: number }[] = []
  private W = 196
  private H = 420
  private tutorial: boolean
  private bang = bangSprite()
  private splashed = false

  constructor(
    private crabs: CrabCatch[],
    private minMm: (id: string) => number,
    opts: { tutorial?: boolean } = {},
  ) {
    super()
    this.tutorial = !!opts.tutorial
    this.keep = crabs.map(() => false)
    this.limit = this.tutorial ? 9 : 4
    this.flipDur = this.tutorial ? 1.8 : 0.9
  }

  private get crab() {
    return this.crabs[this.i] as CrabCatch | undefined
  }
  private legal(c: CrabCatch) {
    return c.male && c.mm >= this.minMm(c.id)
  }
  private get center() {
    return { x: Math.round(this.W / 2), y: Math.round(this.H * 0.37) }
  }
  private get tubPos() {
    return { x: this.W - 34, y: Math.round(this.H * 0.75) }
  }

  protected begin() {
    if (!this.crabs.length) this.end()
  }

  protected step(dt: number, inp: MiniInput, playing: boolean) {
    this.sT += dt
    this.bits.update(dt, this.H)
    for (const p of this.pops) p.t += dt
    this.pops = this.pops.filter((p) => p.t < 1)
    this.warn = Math.max(0, this.warn - dt)
    this.shakeT = Math.max(0, this.shakeT - dt)
    if (!playing || !this.crab) return
    if (this.st === 'in') {
      if (this.sT >= 0.35) {
        this.st = 'sort'
        this.sT = 0
        sfx.creak()
      }
      return
    }
    if (this.st === 'sort') {
      if (inp.tap) {
        this.downX = inp.x
        this.downT = this.t
        this.dragging = true
      }
      if (this.dragging && inp.down) this.dragX = clamp(inp.x - this.downX, -60, 60)
      if (inp.release || inp.swipe) {
        const dx = inp.x - this.downX
        let dir = 0
        if (inp.swipe) dir = inp.swipe
        else if (this.dragging && Math.abs(dx) > 18) dir = Math.sign(dx)
        else if (this.dragging && Math.abs(dx) < 10 && this.t - this.downT < 0.45) dir = this.downX > this.W / 2 ? 1 : -1
        this.dragging = false
        if (dir) this.decide(dir > 0)
        else this.dragX = 0
      } else if (!inp.down && this.dragging) {
        this.dragging = false
        this.dragX = 0
      }
      if (this.st === 'sort' && this.sT >= this.limit + this.flipDur) {
        this.pops.push({ x: this.center.x, y: this.center.y - 30, t: 0, s: 'FOR SEINT', c: COL.amber })
        this.decide(false)
      }
      return
    }
    // flying out to the tub or over the rail
    if (this.sT >= 0.4) {
      const c = this.crab!
      if (this.st === 'keep') {
        const tp = this.tubPos
        this.inTub.push({ kind: crabKind(c.id), cw: 8, male: c.male, x: tp.x + ((this.inTub.length * 7) % 18) - 9, y: tp.y + ((this.inTub.length * 5) % 10) - 5 })
        sfx.plop()
      }
      this.i++
      this.st = 'in'
      this.sT = 0
      this.dragX = 0
      if (!this.crab) this.end()
    }
  }

  private decide(keep: boolean) {
    const c = this.crab!
    this.keep[this.i] = keep
    this.st = keep ? 'keep' : 'throw'
    this.splashed = false
    this.outX = this.center.x + this.dragX
    this.outY = this.center.y
    this.sT = 0
    const ok = this.legal(c)
    if (keep) {
      if (!ok) {
        this.wrong++
        this.warn = 1.1
        this.shakeT = 0.3
        this.warnText = !c.male ? 'HUNN! SLIPP HENNE UT' : 'FOR LITEN!'
        sfx.lose()
      } else {
        sfx.coin()
        this.pops.push({ x: this.center.x + 30, y: this.center.y - 20, t: 0, s: 'BRA!', c: COL.green })
      }
    } else {
      sfx.cast()
      if (ok) {
        this.missed++
        this.pops.push({ x: this.center.x - 30, y: this.center.y - 20, t: 0, s: 'DEN KUNNE DU HA BEHOLDT', c: COL.amber })
      } else this.pops.push({ x: this.center.x - 30, y: this.center.y - 20, t: 0, s: 'RIKTIG', c: COL.green })
    }
  }

  private end() {
    const kept = this.keep.filter(Boolean).length
    const card = [
      this.wrong ? 'FEIL I KARET!' : this.missed ? 'SORTERT' : 'PERFEKT SORTERT!',
      `BEHOLDT ${kept} AV ${this.crabs.length}`,
      ...(this.wrong ? [`${this.wrong} SKULLE UT IGJEN`] : []),
      ...(this.missed ? [`${this.missed} GODE KASTET UT`] : []),
    ]
    this.finish({ keep: this.keep, wrong: this.wrong, missed: this.missed }, card, this.wrong === 0)
  }

  protected playHint() {
    if (this.phase === 'intro') return 'Behold store hanner. Hunner og små krabber skal ut igjen'
    if (this.warn > 0) return this.warnText === 'FOR LITEN!' ? 'For liten! Under minstemålet må den ut igjen' : 'Hunner har bred, rund flik under buken. De skal ut igjen'
    if (this.st === 'in' || !this.crab) return 'Her kommer neste krabbe …'
    if (this.sT < this.flipDur) return 'Se på buken: smal flik er hann, bred og rund er hunn'
    return 'Sveip til høyre for å beholde, til venstre for å kaste ut'
  }

  // ---------- drawing ----------

  protected scene(g: CanvasRenderingContext2D, W: number, H: number) {
    this.W = W
    this.H = H
    const sh = shake(this.t, this.shakeT > 0 ? 2 : 0)
    g.translate(sh.x, sh.y)
    this.deck(g, W, H)
    this.drawTub(g, false)
    const c = this.crab
    if (c && this.phase !== 'end') this.drawCrab(g, c)
    this.drawTub(g, true)
    this.bits.draw(g)
    this.gauge(g, W, H)
    for (const p of this.pops) {
      if (p.t > 0.7 && Math.floor(p.t * 20) % 2) continue
      textC(g, p.s, p.x, Math.round(p.y - p.t * 14), p.c)
    }
    if (this.warn > 0) {
      if (Math.floor(this.warn * 10) % 2 === 0) {
        g.fillStyle = 'rgba(232,80,58,0.22)'
        g.fillRect(-4, -4, W + 8, H + 8)
      }
      const y = Math.round(H * 0.2)
      panel(g, 24, y - 6, W - 48, 30, '#5a1e24')
      g.drawImage(this.bang, 32, y)
      textC(g, 'UT IGJEN!', W / 2 + 4, y - 1, COL.red, { scale: 2 })
      textC(g, this.warnText, W / 2 + 4, y + 13, COL.paper)
    }
    g.translate(-sh.x, -sh.y)
    if (this.tutorial && this.phase === 'play' && this.warn <= 0) this.help(g, W, H)
  }

  private deck(g: CanvasRenderingContext2D, W: number, H: number) {
    // planks running fore and aft, with a little dither of wear
    for (let x = 0; x < W; x++) {
      const plank = Math.floor((x + 3) / 11)
      const base = plank % 2 ? '#8a6a4a' : '#94744e'
      g.fillStyle = (x + 3) % 11 === 0 ? '#5a4232' : base
      g.fillRect(x, 0, 1, H)
    }
    g.fillStyle = '#7a5a3e'
    for (let i = 0; i < 90; i++) {
      const x = (i * 37) % W
      const y = (i * 97) % H
      g.fillRect(x, y, 2, 1)
    }
    // the sea beyond the rail on the left
    const sw = 16
    for (let y = 0; y < H; y++) {
      const wv = Math.round(Math.sin(y * 0.15 + this.t * 2) * 1.2)
      g.fillStyle = (y + Math.floor(this.t * 10)) % 9 === 0 ? '#5a9ab8' : '#2e6a8a'
      g.fillRect(0, y, sw + wv, 1)
      g.fillStyle = '#cfe8f4'
      g.fillRect(sw + wv, y, 1, 1)
    }
    g.fillStyle = INK
    g.fillRect(sw + 1, 0, 6, H)
    g.fillStyle = '#c98a4a'
    g.fillRect(sw + 2, 0, 4, H)
    g.fillStyle = '#e0a868'
    g.fillRect(sw + 2, 0, 1, H)
    // the sorting table: a steel tray with a rim
    const tx = 30
    const ty = Math.round(H * 0.14)
    const tw = W - 52
    const th = Math.round(H * 0.47)
    g.fillStyle = INK
    g.fillRect(tx - 2, ty - 2, tw + 4, th + 4)
    g.fillStyle = '#8a94a8'
    g.fillRect(tx - 1, ty - 1, tw + 2, th + 2)
    g.fillStyle = '#5a6478'
    g.fillRect(tx + 1, ty + 1, tw - 2, th - 2)
    g.fillStyle = '#626c80'
    for (let y = ty + 3; y < ty + th - 2; y += 4) for (let x = tx + 3 + ((y / 4) % 2) * 2; x < tx + tw - 2; x += 4) g.fillRect(x, y, 1, 1)
    g.fillStyle = '#c8d0dc'
    g.fillRect(tx - 1, ty - 1, tw + 2, 1)
    // the pot, just emptied, at the head of the table
    const px = Math.round(W / 2)
    const py = ty - 2
    g.fillStyle = INK
    g.fillRect(px - 22, py - 10, 44, 12)
    g.fillStyle = '#3a4a5a'
    g.fillRect(px - 21, py - 9, 42, 10)
    g.fillStyle = '#8aa0b0'
    for (let x = px - 21; x < px + 21; x += 3) g.fillRect(x, py - 9, 1, 10)
    for (let y = py - 9; y < py + 1; y += 3) g.fillRect(px - 21, y, 42, 1)
    g.fillStyle = '#e8743a'
    g.fillRect(px - 2, py - 12, 4, 3)
  }

  private drawTub(g: CanvasRenderingContext2D, front: boolean) {
    const { x, y } = this.tubPos
    const rw = 25
    const rh = 15
    if (!front) {
      for (let j = -rh; j <= rh; j++)
        for (let i = -rw; i <= rw; i++) {
          const d = (i * i) / (rw * rw) + (j * j) / (rh * rh)
          if (d > 1) continue
          g.fillStyle = d > 0.78 ? (d > 0.92 ? INK : j < 0 ? '#6a9ac8' : '#3a6a98') : '#1e3a5a'
          g.fillRect(x + i, y + j, 1, 1)
        }
      for (const c of this.inTub) {
        const s = crabSprite(c.kind, c.cw, c.male, false, 0)
        g.drawImage(s.c, Math.round(c.x - s.w / 2), Math.round(c.y - s.h / 2))
      }
    } else {
      text(g, `${this.inTub.length}`, x + rw - 2, y + rh - 4, COL.gold)
    }
  }

  private drawCrab(g: CanvasRenderingContext2D, c: CrabCatch) {
    const kind = crabKind(c.id)
    const cw = c.mm * PX_PER_MM
    const fr = Math.floor(this.t * (this.st === 'sort' ? 3 : 8)) % 2
    let x = this.center.x + this.dragX
    let y = this.center.y
    let sy = 1
    let under = false
    let scale = 1
    if (this.st === 'in') {
      const k = ease(clamp(this.sT / 0.35))
      y = lerp(Math.round(this.H * 0.12), this.center.y, k)
      sy = 0.6 + 0.4 * k
    } else if (this.st === 'sort' && this.sT < this.flipDur) {
      // turned over to look at the belly, then back: scaleY through zero swaps the side
      const k = this.sT / this.flipDur
      if (k < 0.2) {
        sy = Math.abs(Math.cos(Math.PI * (k / 0.2)))
        under = k / 0.2 > 0.5
      } else if (k > 0.8) {
        const m = (k - 0.8) / 0.2
        sy = Math.abs(Math.cos(Math.PI * m))
        under = m < 0.5
      } else under = true
      sy = Math.max(0.08, sy)
    } else if (this.st === 'keep' || this.st === 'throw') {
      const k = ease(clamp(this.sT / 0.4))
      const tp = this.tubPos
      const tx = this.st === 'keep' ? tp.x : -50
      const ty = this.st === 'keep' ? tp.y : this.outY + 10
      x = lerp(this.outX, tx, k)
      y = lerp(this.outY, ty, k) - Math.sin(Math.PI * k) * 18
      if (this.st === 'keep') scale = lerp(1, 8 / cw, k * k)
      if (this.st === 'throw' && k > 0.55 && !this.splashed) {
        this.splashed = true
        this.bits.splash(10, y, 18, 1.1)
        sfx.splash()
      }
    }
    const s = crabSprite(kind, cw, c.male, under, fr)
    const w = Math.round(s.w * scale)
    const h = Math.max(1, Math.round(s.h * sy * scale))
    // a soft shadow on the table
    if (this.st === 'sort' || this.st === 'in') {
      g.fillStyle = 'rgba(20,12,36,0.25)'
      g.fillRect(Math.round(x - cw * 0.6), Math.round(y + cw * 0.5 + 4), Math.round(cw * 1.2), 3)
    }
    g.drawImage(s.c, Math.round(x - w / 2), Math.round(y - h / 2), w, h)
    // once you have seen the belly, a badge says what it was
    if (this.st === 'sort' && this.sT >= this.flipDur) {
      const lbl = c.male ? 'HANN' : 'HUNN'
      const bx = Math.round(x + cw * 0.5 + 10)
      const by = Math.round(y - cw * 0.5 - 14)
      const bw = textW(lbl) + 14
      panel(g, bx, by, bw, 11, c.male ? '#2a3a5a' : '#5a2a4a')
      // the flap shape as a tiny icon
      g.fillStyle = '#e8d0a8'
      if (c.male) {
        g.fillRect(bx + 4, by + 3, 1, 2)
        g.fillRect(bx + 3, by + 5, 3, 2)
        g.fillRect(bx + 3, by + 7, 3, 1)
      } else {
        g.fillRect(bx + 3, by + 3, 5, 1)
        g.fillRect(bx + 2, by + 4, 7, 3)
        g.fillRect(bx + 3, by + 7, 5, 1)
      }
      text(g, lbl, bx + 11, by + 3, COL.paper, { outline: false })
    }
  }

  private gauge(g: CanvasRenderingContext2D, W: number, H: number) {
    const c = this.crab
    const y = Math.round(H * 0.555)
    const x = 34
    const w = W - 60
    const min = c ? this.minMm(c.id) : 130
    // bycatch crabs have no legal size: the gauge just measures them
    const free = min <= 0
    const lo = free ? 0 : min - 60
    const hi = free ? 120 : min + 60
    const at = (mm: number) => x + Math.round(((mm - lo) / (hi - lo)) * w)
    // a brass gauge with millimetre ticks
    frame(g, x, y, w, 8, '#e8c86a')
    g.fillStyle = '#a8862e'
    for (let mm = Math.ceil(lo / 5) * 5; mm <= hi; mm += 5) g.fillRect(at(mm), y, 1, mm % 10 === 0 ? 4 : 2)
    for (let mm = Math.ceil(lo / 20) * 20; mm <= hi; mm += 20) text(g, `${mm}`, at(mm) - Math.round(textW(`${mm}`) / 2), y + 12, '#d8c8a0', { outline: INK })
    // which crab it is, so the small ones are not mistaken for king crabs
    if (c && this.st !== 'in') textC(g, CRAB_NAME[crabKind(c.id)], W / 2, y - (free ? 32 : 24), COL.paper)
    // the legal line
    if (free) textC(g, 'INGEN MINSTEMÅL', W / 2, y - 22, '#cfe8f4')
    else {
      g.fillStyle = COL.red
      g.fillRect(at(min) - 1, y - 6, 2, 14)
      text(g, 'MIN', at(min) - 5, y - 13, COL.red)
    }
    if (c && this.st !== 'in') {
      const m = at(clamp(c.mm, lo, hi))
      const k = this.st === 'sort' ? ease(clamp(this.sT / 0.4)) : 1
      const mx = Math.round(lerp(x, m, k))
      g.fillStyle = INK
      g.fillRect(mx - 2, y - 4, 5, 13)
      g.fillStyle = COL.paper
      g.fillRect(mx - 1, y - 3, 3, 11)
      const lbl = `${Math.round(c.mm)} MM`
      text(g, lbl, clamp(mx - Math.round(textW(lbl) / 2), 4, W - textW(lbl) - 4), y - 13 - (!free && Math.abs(mx - at(min)) < 18 ? 8 : 0), COL.paper)
    }
    // the timer and the two choices
    const ty = y + 22
    if (c && this.st === 'sort') {
      const left = clamp(1 - (this.sT - this.flipDur) / this.limit)
      const col = left < 0.3 ? COL.red : left < 0.6 ? COL.amber : COL.green
      g.fillStyle = INK
      g.fillRect(x - 1, ty - 1, w + 2, 4)
      g.fillStyle = col
      g.fillRect(x, ty, Math.round(w * left), 2)
    }
    const ay = ty + 8
    const pulse = Math.floor(this.t * 3) % 2
    text(g, '← KAST UT', 24 - (this.dragX < -10 ? pulse : 0), ay, this.dragX < -10 ? COL.gold : '#cfe8f4')
    const kt = 'BEHOLD →'
    text(g, kt, W - 24 - textW(kt) + (this.dragX > 10 ? pulse : 0), ay, this.dragX > 10 ? COL.gold : '#cfe8f4')
    text(g, `${Math.min(this.i + 1, this.crabs.length)}/${this.crabs.length}`, W / 2 - 6, ay, COL.paper)
  }

  private help(g: CanvasRenderingContext2D, W: number, H: number) {
    const lines = [
      'BEHOLD: HANN OG OVER STREKEN.',
      'SE PÅ BUKEN NÅR DEN SNUS:',
      'SMAL FLIK = HANN, BRED = HUNN.',
      'HUNNER OG SMÅ SKAL UT IGJEN.',
    ].flatMap((l) => wrap(l, W - 24))
    const h = lines.length * LINE + 6
    const y = Math.round(H * 0.15) + 2
    panel(g, 8, y, W - 16, h, '#26304e')
    lines.forEach((l, i) => textC(g, l, W / 2, y + 4 + i * LINE, i === 2 ? COL.gold : COL.paper, { outline: false }))
  }
}
