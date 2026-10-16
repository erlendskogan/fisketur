// The reeling minigame: keep the green catch zone on the fish until the meter is full

import { genFish, type FishArt } from '../art/fishgen'
import { chestSprite, INK } from '../art/sprites'
import { shade } from '../art/pixel'
import { sfx } from '../audio'
import type { Species } from './data'

const icons = new Map<string, FishArt>()
function iconFor(sp: Species) {
  let a = icons.get(sp.id)
  if (!a) {
    a = genFish({ ...sp.look, len: 11, h: sp.look.shape === 'flat' || sp.look.shape === 'round' ? 7 : 5, lure: false, crest: undefined, beak: false, pattern: undefined, eye: 1, glowAt: undefined }, sp.id + ':icon')
    icons.set(sp.id, a)
  }
  return a
}

let chestImg: HTMLCanvasElement | null = null

export class Reel {
  zone: number
  zonePos = 0
  zoneVel = 0
  fish = 0.5
  fishVel = 0
  target = 0.5
  timer = 0
  progress = 0.3
  perfect = true
  result: 'win' | 'lose' | null = null
  chest: { pos: number; prog: number; life: number; got: boolean } | null = null
  chestWon = false
  private chestTimer: number
  private tickT = 0
  t = 0

  constructor(
    public sp: Species,
    rod: number,
    private reelMult: number,
    lureMult: number,
  ) {
    this.zone = rod * (sp.id === 'gamle' ? 0.95 : 1)
    this.zonePos = 0
    this.fish = 0.3 + Math.random() * 0.3
    this.chestTimer = Math.random() < 0.1 + lureMult * 0.04 && sp.id !== 'gamle' ? 1 + Math.random() * 2 : -1
  }

  update(dt: number, holding: boolean) {
    if (this.result) return
    this.t += dt
    const d = this.sp.difficulty
    const heavy = this.sp.behavior === 'heavy'

    // the catch zone
    this.zoneVel += (holding ? 3.4 : -(2.9 + (heavy ? 0.5 : 0))) * dt
    this.zoneVel = Math.max(-1.5, Math.min(1.5, this.zoneVel))
    this.zonePos += this.zoneVel * dt
    if (this.zonePos < 0) {
      this.zonePos = 0
      this.zoneVel = -this.zoneVel * 0.35
      if (Math.abs(this.zoneVel) < 0.05) this.zoneVel = 0
    }
    if (this.zonePos > 1 - this.zone) {
      this.zonePos = 1 - this.zone
      this.zoneVel = Math.min(0, this.zoneVel)
    }

    // the fish
    this.timer -= dt
    if (this.timer <= 0) {
      const b = this.sp.behavior
      const r = Math.random()
      const span = 0.25 + d * 0.06
      if (b === 'sinker') this.target = Math.max(0.03, Math.min(0.97, r * 0.6 + (Math.random() < 0.3 ? 0.3 : 0)))
      else if (b === 'floater') this.target = Math.max(0.03, Math.min(0.97, 0.4 + r * 0.57))
      else this.target = Math.max(0.03, Math.min(0.97, this.fish + (r - 0.5) * 2 * span))
      this.timer = b === 'dart' ? 0.35 + Math.random() * (1.4 - d * 0.08) : b === 'heavy' ? 0.9 + Math.random() * 1.6 : 0.7 + Math.random() * (2.2 - d * 0.12)
    }
    const k = 3 + d * 0.9 + (this.sp.behavior === 'dart' ? 4 : 0)
    this.fishVel += (this.target - this.fish) * k * dt
    this.fishVel *= Math.pow(this.sp.behavior === 'dart' ? 0.08 : 0.2, dt)
    this.fish += this.fishVel * dt
    this.fish = Math.max(0.02, Math.min(0.98, this.fish))

    const inZone = this.fish >= this.zonePos && this.fish <= this.zonePos + this.zone
    if (inZone) {
      this.progress += 0.24 * this.reelMult * (1 - d * 0.032) * dt
      this.tickT -= dt
      if (this.tickT <= 0) {
        sfx.tick()
        this.tickT = 0.09
      }
    } else {
      this.perfect = false
      this.progress -= (this.sp.id === 'gamle' ? 0.06 : 0.12 + d * 0.012) * dt
    }

    // treasure
    if (this.chestTimer > 0) {
      this.chestTimer -= dt
      if (this.chestTimer <= 0) this.chest = { pos: 0.1 + Math.random() * 0.8, prog: 0, life: 7, got: false }
    }
    if (this.chest && !this.chest.got) {
      const c = this.chest
      c.life -= dt
      if (c.pos >= this.zonePos && c.pos <= this.zonePos + this.zone) c.prog += 0.55 * dt
      else c.prog = Math.max(0, c.prog - 0.25 * dt)
      if (c.prog >= 1) {
        c.got = true
        this.chestWon = true
        sfx.chest()
      } else if (c.life <= 0) this.chest = null
    }

    if (this.progress >= 1) this.result = 'win'
    else if (this.progress <= 0) this.result = 'lose'
  }

  draw(g: CanvasRenderingContext2D, W: number, H: number) {
    const barH = Math.round(Math.min(150, H * 0.42))
    const barW = 18
    const x = W - barW - 30
    const y = Math.round(H * 0.24)

    // frame
    const frame = (fx: number, fy: number, fw: number, fh: number, fill: string) => {
      g.fillStyle = INK
      g.fillRect(fx - 2, fy - 1, fw + 4, fh + 2)
      g.fillRect(fx - 1, fy - 2, fw + 2, fh + 4)
      g.fillStyle = '#c98a4a'
      g.fillRect(fx - 1, fy - 1, fw + 2, fh + 2)
      g.fillStyle = fill
      g.fillRect(fx, fy, fw, fh)
    }
    frame(x, y, barW, barH, '#1a3a5a')
    // water stripes
    g.fillStyle = '#1f466a'
    for (let i = 0; i < barH; i += 6) g.fillRect(x, y + i, barW, 2)

    // catch zone
    const zh = Math.round(this.zone * barH)
    const zy = Math.round(y + barH - this.zonePos * barH - zh)
    const inZone = this.fish >= this.zonePos && this.fish <= this.zonePos + this.zone
    g.fillStyle = inZone ? '#7ae05a' : '#5ab04a'
    g.fillRect(x + 1, zy, barW - 2, zh)
    g.fillStyle = shade(inZone ? '#7ae05a' : '#5ab04a', 0.3)
    g.fillRect(x + 1, zy, barW - 2, 1)
    g.fillStyle = shade('#5ab04a', -0.4)
    g.fillRect(x + 1, zy + zh - 1, barW - 2, 1)

    // chest
    if (this.chest && !this.chest.got) {
      chestImg ??= chestSprite()
      const cy = Math.round(y + barH - this.chest.pos * barH - chestImg.height / 2)
      g.drawImage(chestImg, x + Math.round((barW - chestImg.width) / 2), cy)
      g.fillStyle = '#ffd84a'
      g.fillRect(x + 1, cy + chestImg.height + 1, Math.round((barW - 2) * this.chest.prog), 1)
    }

    // fish icon
    const art = iconFor(this.sp)
    const wob = Math.round(Math.sin(this.t * 18) * (this.sp.behavior === 'dart' ? 1 : 0.5))
    const fy = Math.round(y + barH - this.fish * barH - art.h / 2)
    g.drawImage(art.right[Math.floor(this.t * 8) % 2], x + Math.round((barW - art.w) / 2) + wob, fy)

    // progress meter
    const px = x + barW + 5
    frame(px, y, 5, barH, '#2a1d2e')
    const ph = Math.round(Math.max(0, Math.min(1, this.progress)) * barH)
    const col = this.progress < 0.3 ? '#e8503a' : this.progress < 0.65 ? '#f2c24a' : '#7ae05a'
    g.fillStyle = col
    g.fillRect(px, y + barH - ph, 5, ph)
    g.fillStyle = shade(col, 0.35)
    g.fillRect(px, y + barH - ph, 1, ph)

    // reel handle
    const hx = x - 9
    const hy = y + barH - 10
    g.fillStyle = INK
    g.fillRect(hx - 1, hy - 1, 8, 8)
    g.fillStyle = '#a8b0c0'
    g.fillRect(hx, hy, 6, 6)
    const a = this.t * (inZone ? 14 : 4)
    g.fillStyle = '#c98a4a'
    g.fillRect(hx + 2 + Math.round(Math.cos(a) * 3), hy + 2 + Math.round(Math.sin(a) * 3), 3, 3)
    g.fillStyle = INK
    g.fillRect(hx + 2, hy + 2, 2, 2)
  }
}
