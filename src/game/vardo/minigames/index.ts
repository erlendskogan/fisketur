// The Vardø minigames, plus demo() and run() so they can be tried from the browser console:
//   const m = await import('/src/game/vardo/minigames/index.ts'); m.MINI_DEMO.run('crab')

import { initAudio } from '../../../audio'
import type { Catch } from '../../state'
import type { CrabCatch, MiniGame, MiniInput } from '../types'
import { CrabSort } from './crabSort'
import { NetHaul } from './netHaul'
import { PhotoHunt } from './photoHunt'
import { SailRace } from './sailRace'
import { LINE, textC as textCentre, wrap as wrapText } from './font'

export { CrabSort, NetHaul, PhotoHunt, SailRace }
export { crabKind, crabSprite, isSnowCrab } from './crabSort'
export { flukeSprite } from './photoHunt'
export { text, textC, textW, wrap } from './font'

export type DemoKind = 'net' | 'crab' | 'crabTutorial' | 'snow' | 'fluke' | 'birds' | 'race' | 'delivery'
export const DEMO_KINDS: DemoKind[] = ['net', 'crab', 'crabTutorial', 'snow', 'fluke', 'birds', 'race', 'delivery']

const fish = (id: string, cm: number, kg: number, value: number): Catch => ({ id, cm, kg, value })

/** Builds a minigame with made-up data */
export function demo(kind: DemoKind): MiniGame {
  switch (kind) {
    case 'net':
      return new NetHaul(
        [fish('v_torsk', 64, 2.8, 60), fish('v_sei', 52, 1.6, 30), fish('v_hyse', 44, 1.1, 34), fish('v_torsk', 71, 3.6, 72), fish('v_rognkjeks', 38, 1.4, 40), fish('v_ukjent', 40, 1, 20), fish('v_sei', 58, 2, 34), fish('v_flyndre', 35, 0.8, 26)],
        { mesh: 1, boat: 1 },
      )
    case 'crab':
    case 'crabTutorial':
    case 'snow': {
      const id = kind === 'snow' ? 'v_snokrabbe' : 'v_kongekrabbe'
      const min = kind === 'snow' ? 95 : 130
      const crabs: CrabCatch[] = Array.from({ length: 7 }, (_, i) => {
        const male = i % 3 !== 1
        const mm = Math.round(min + (i % 2 ? -1 : 1) * (8 + ((i * 17) % 40)))
        return { id, mm, male, kg: mm / 50, value: male && mm >= min ? 180 : 0 }
      })
      return new CrabSort(crabs, (cid) => (/sn/.test(cid) ? 95 : 130), { tutorial: kind === 'crabTutorial' })
    }
    case 'fluke':
      return new PhotoHunt('fluke', { whales: ['hval_stjerne', 'hval_blekk', 'arret'] })
    case 'birds':
      return new PhotoHunt('birds', {})
    case 'race':
      return new SailRace({ boat: 1, rivals: 3, length: 35, seed: 7, kind: 'regatta' })
    case 'delivery':
      return new SailRace({ boat: 2, rivals: 2, length: 30, seed: 3, kind: 'delivery' })
  }
}

/**
 * Runs a minigame full screen on its own canvas, scaled like the game (about 196 logical
 * pixels wide), and resolves with the result. For testing; the game hosts them itself.
 */
export function run(game: MiniGame | DemoKind, onFrame?: (g: MiniGame) => void): Promise<unknown> {
  const m = typeof game === 'string' ? demo(game) : game
  const cv = document.createElement('canvas')
  cv.style.cssText = 'position:fixed;inset:0;z-index:9999;touch-action:none;image-rendering:pixelated;background:#000'
  document.body.appendChild(cv)
  const g = cv.getContext('2d')!
  let W = 196
  let H = 420
  let px = 1
  const resize = () => {
    const dpr = devicePixelRatio || 1
    const scale = Math.max(2, Math.round((innerWidth * dpr) / 196))
    W = Math.ceil((innerWidth * dpr) / scale)
    H = Math.ceil((innerHeight * dpr) / scale)
    px = scale / dpr
    if (innerWidth > innerHeight * 0.6) {
      // a desktop window: show a phone-shaped 196×430 screen that fills the height
      W = 196
      H = 430
      px = innerHeight / H
    }
    cv.width = W
    cv.height = H
    cv.style.width = `${W * px}px`
    cv.style.height = `${H * px}px`
    g.imageSmoothingEnabled = false
  }
  resize()
  addEventListener('resize', resize)
  const inp: MiniInput = { down: false, x: 0, y: 0, tap: false, release: false, swipe: 0 }
  let sx = 0
  let sy = 0
  let st = 0
  const pos = (e: PointerEvent) => {
    inp.x = e.clientX / px
    inp.y = e.clientY / px
  }
  cv.addEventListener('pointerdown', (e) => {
    initAudio()
    cv.setPointerCapture(e.pointerId)
    pos(e)
    inp.down = true
    inp.tap = true
    sx = inp.x
    sy = inp.y
    st = performance.now()
  })
  cv.addEventListener('pointermove', (e) => pos(e))
  const up = (e: PointerEvent) => {
    if (!inp.down) return
    pos(e)
    inp.down = false
    inp.release = true
    const dx = inp.x - sx
    const dy = inp.y - sy
    if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2 && performance.now() - st < 700) inp.swipe = dx > 0 ? 1 : -1
  }
  cv.addEventListener('pointerup', up)
  cv.addEventListener('pointercancel', up)
  return new Promise((resolve) => {
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      m.update(dt, inp)
      inp.tap = false
      inp.release = false
      inp.swipe = 0
      m.draw(g, W, H)
      // the host shows the hint above its dock; here it goes at the bottom of the canvas
      wrapText(m.hint(), W - 16).forEach((l, i, a) => textCentre(g, l, W / 2, H - 8 - (a.length - i) * LINE, '#cfe8f4'))
      onFrame?.(m)
      if (m.result) {
        console.log(m.title, m.result)
        setTimeout(() => {
          cv.remove()
          removeEventListener('resize', resize)
          resolve(m.result)
        }, 400)
        return
      }
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

export const MINI_DEMO = { demo, run, kinds: DEMO_KINDS }
