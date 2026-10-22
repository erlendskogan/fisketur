// Ad 3, «Reisen»: the breadth. One bar of the chorus per place, cut on the downbeat, each with a
// little time-lapse and a passport stamp; then the fish book, two rare catches and the end card.

import { save } from './saves.mjs'
import { cap, END, stamp } from './scenes.mjs'
import { FPS, take } from './studio.mjs'

/** One bar of the soundtrack (74 bpm, 4/4), in seconds */
export const BAR = (4 * 60) / 74

/** Frame-exact length of the half-bars from `from` to `to`, so cuts never drift off the beat */
const span = (from, to) => (Math.round((to * BAR * FPS) / 2) - Math.round((from * BAR * FPS) / 2)) / FPS

/** Signs, hints and toasts off: these are postcards */
const CLEAN = `#labels,#hint,#toasts{visibility:hidden}`
/** Over a sheet the HUD only peeks out at the sides */
const NO_HUD = `#hud,#hud2{visibility:hidden}`
const style = (t, css) => t.eval((css) => document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`), css)

/** Run the clock from `a` to `b` over `sec` seconds of film */
const timelapse = (t, a, b, sec) =>
  t.perFrame(`
    window.__tl0 ??= vt
    window.__dev.time = ${a} + (${b} - ${a}) * Math.min(1, (vt - window.__tl0) / ${sec * 1000})
  `)

async function postcard(name, { world, view, from, to, place, country, half, at = 0, extra, before, stampAt }) {
  const t = await take(name, { seed: 30 + at, audioSeconds: 8, save: save({ world, time: from, ...extra }) })
  await style(t, CLEAN)
  await t.eval((v) => {
    window.__game.go(v)
    // clear skies on every postcard
    window.__dev.wx.fog = 0
    window.__dev.wx.rain = 0
  }, view)
  await t.down(216, 360)
  await t.up()
  await t.skip(1)
  const sec = span(at, at + half)
  await timelapse(t, from, to, sec)
  if (before) await before(t)
  await t.addOverlay(stamp(place, country, stampAt ?? (view === 'sea' ? 50 : 62)))
  await t.film(sec)
  return t.finish()
}

export async function ad3(name = 'ad3') {
  const clips = []
  // bar 1: home, with the promise of the whole game
  clips.push(
    await postcard(`${name}-1`, {
      world: 'norge',
      view: 'harbor',
      from: 0.6,
      to: 0.68,
      place: 'SKJÆRVIK',
      country: 'NORGE',
      half: 2,
      at: 0,
      before: (t) => t.overlay(cap('Fem steder.<br><span class="y">194 arter.</span>', 11, 'big')),
    }),
  )
  clips.push(await postcard(`${name}-2`, { world: 'alaska', view: 'harbor', from: 0.4, to: 0.46, place: 'PETERSBURG', country: 'ALASKA', half: 2, at: 2 }))
  clips.push(
    await postcard(`${name}-3`, {
      world: 'hawaii',
      view: 'sea',
      from: 0.69,
      to: 0.725,
      place: 'HILO',
      country: 'HAWAII',
      half: 2,
      at: 4,
      // a humpback breaches out in the bay
      before: (t) =>
        t.eval(() => {
          const s = window.__game.sea
          s.whales.push({ x: s.W * 0.68, t0: s.t + 0.3, dir: -1, breach: true })
          s.nextWhale = 99
        }),
    }),
  )
  clips.push(await postcard(`${name}-4`, { world: 'lofoten', view: 'harbor', from: 0.005, to: 0.045, place: 'HENNINGSVÆR', country: 'LOFOTEN', half: 2, at: 6 }))
  clips.push(await postcard(`${name}-5`, { world: 'vardo', view: 'harbor', from: 0.715, to: 0.76, place: 'VARDØ', country: 'FINNMARK', half: 2, at: 8 }))
  clips.push(await book(`${name}-6`, 10))
  clips.push(await card(`${name}-7`, 'hawaii', 'megamunn', 12))
  clips.push(await card(`${name}-8`, 'vardo', 'v_isdronninga', 13))
  clips.push(await end(`${name}-9`, 14))
  return { clips }
}

/** The fish book in Hawaii, nearly full, scrolling down through the zones */
async function book(name, at) {
  const t = await take(name, { seed: 40, audioSeconds: 8, save: save({ world: 'hawaii', time: 0.5 }) })
  await style(t, CLEAN + NO_HUD)
  await t.down(216, 360)
  await t.up()
  await t.skip(1)
  await t.eval(() => {
    const g = window.__game
    Object.keys(window.__species).forEach((id, i) => {
      if (i % 6 !== 4) g.s.book[id] = { n: 1 + (i % 5), best: 30 + i }
    })
    g.openBook()
  })
  await t.skip(0.4)
  await t.overlay(cap('Fyll fiskeboka', 4, 'in-slide'))
  const sec = span(at, at + 2)
  await t.perFrame(`
    const b = document.querySelector('#sheet .panel-body')
    window.__sc0 ??= vt
    if (b) b.scrollTop = Math.max(0, (vt - window.__sc0 - 500) / ${sec * 1000 - 700}) * (b.scrollHeight - b.clientHeight) * 0.75
  `)
  await t.film(sec)
  return t.finish()
}

/** A rare catch, straight to its card: one half-bar each */
async function card(name, world, id, at) {
  const t = await take(name, { seed: 50 + at, audioSeconds: 6, save: save({ world, time: world === 'vardo' ? 0.9 : 0.7 }) })
  await style(t, CLEAN + NO_HUD)
  await t.eval(() => window.__game.go('sea'))
  await t.down(216, 360)
  await t.up()
  await t.skip(1)
  await t.eval((id) => {
    const sp = window.__species[id]
    window.__game.catchCard(sp, { cm: sp.cm[1], kg: sp.kg[1], value: Math.round(sp.value * 1.3) }, true, true, 0)
  }, id)
  // the card is already up when the cut lands
  await t.skip(0.6)
  await t.overlay(at % 2 ? '' : cap('Jakt på de <span class="y">sjeldne</span>', 6, 'in-slide'))
  await t.film(span(at, at + 1))
  return t.finish()
}

async function end(name, at) {
  const t = await take(name, { seed: 60, audioSeconds: 8, save: save({ world: 'lofoten', time: 0.99 }) })
  await style(t, CLEAN)
  await t.eval(() => window.__game.go('harbor'))
  await t.down(216, 360)
  await t.up()
  await t.skip(1)
  await t.overlay(END('Fra fjorden i Norge til<br>Alaska og Hawaii'))
  await t.film(span(at, at + 2) + 0.6)
  return t.finish()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { closeBrowser } = await import('./studio.mjs')
  await ad3(process.argv[2])
  await closeBrowser()
}
