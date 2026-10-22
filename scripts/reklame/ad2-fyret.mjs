// Ad 2, «Fyret»: the story. Grandfather has grown forgetful and the lighthouse has been dark for
// a year; you find his old letters in the deep, he remembers his promise, and the light comes on.

import { save } from './saves.mjs'
import { actPos, cap, END, fadeOut } from './scenes.mjs'
import { take } from './studio.mjs'

/** Lift the dialogue box off the bottom edge, where the apps put their own buttons, and keep toasts out */
const TALK_UP = `#talk{padding-bottom:150px}#talk.narrate{background:rgba(10,8,30,0.4)}#toasts{display:none}`
/** For the wide shots: no signs or hints over the scenery */
const CLEAN = `#labels,#hint{visibility:hidden}`

const style = (t, css) => t.eval((css) => document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`), css)

/** Tap the dialogue on: finishes the line, or goes to the next one */
const nextLine = (t) => t.eval(() => document.getElementById('talk').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))

/** Start the game and wait out the title, in the harbour or at sea */
async function boot(t, view) {
  await t.eval((view) => window.__game.go(view), view)
  await t.down(180, 300)
  await t.up()
  await t.skip(1)
}

const base = (extra) =>
  save({
    money: 2260,
    gear: { line: 3, rod: 2, reel: 2, bucket: 2, lure: 2, lamp: 1 },
    letters: { found: 2, delivered: 2 },
    stats: { caught: 40, perfect: 9, sold: 30, night: 4, released: 1, treasure: 2 },
    ...extra,
  })

/** 1: the harbour at dusk in the rain, the lighthouse dark */
async function dusk(name) {
  const t = await take(name, { seed: 21, audioSeconds: 12, save: base({ time: 0.775 }) })
  await style(t, TALK_UP + CLEAN)
  await t.eval(() => (window.__dev.wx.rain = 1))
  await boot(t, 'harbor')
  await t.eval(() => {
    window.__game.ui.talk([{ text: 'Bestefar har blitt glemsk.' }, { text: 'Fyret i Skjærvik har vært mørkt i et helt år.' }])
  })
  await t.skip(0.25)
  await t.overlay('<div class="lift"></div>')
  await t.film(1.9)
  await nextLine(t)
  await t.film(2.7)
  return t.finish()
}

/** 2: at sea, the line goes down to a rusty tin on the rock wall */
async function letter(name) {
  const t = await take(name, { seed: 22, audioSeconds: 14, save: base({ time: 0.7 }) })
  await style(t, TALK_UP)
  await boot(t, 'sea')
  const act = await actPos(t)
  await t.overlay(`<div class="lift"></div>${cap('For lenge siden senket<br>han brev i havet …', 14, 'in-fade')}`)
  await t.film(1.2)
  await t.down(act.x, act.y)
  await t.film(4, { speed: 3, until: 'g.sea.lure.y > 1072' })
  await t.up()
  await fadeOut(t, '.cap')
  await t.film(0.3)
  await t.addOverlay(cap('Finn dem i dypet', 14, 'in-slide'))
  await t.film(5, { until: "g.sea.mode === 'snag'" })
  await t.film(5, { until: 'g.ui.talking' })
  await fadeOut(t, '.cap')
  await t.film(2.1)
  return t.finish()
}

/** 3: grandfather reads the letter, and remembers */
async function lighthouse(name) {
  const t = await take(name, { seed: 23, audioSeconds: 16, save: base({ time: 0.69, letters: { found: 3, delivered: 2 } }) })
  await style(t, TALK_UP)
  await boot(t, 'harbor')
  await t.eval(() => {
    window.__game.openSpot('fyret')
  })
  await t.skip(0.6)
  await t.overlay('<div class="lift"></div>')
  await t.film(1.6)
  await nextLine(t)
  await t.film(0.2)
  await nextLine(t)
  await t.film(4.4)
  await t.eval(() => document.querySelector('#sheet [data-a=ok]').click())
  await t.film(2.7)
  return t.finish()
}

/** 4: the lighthouse is lit again, and the end card */
async function lit(name) {
  const t = await take(name, { seed: 24, audioSeconds: 12, save: base({ time: 0.86, flags: { ending: true, scale: true, finale: true } }) })
  await style(t, TALK_UP + CLEAN)
  await boot(t, 'harbor')
  await t.overlay(`<div class="lift"></div>${cap('… og tenn fyret<br><span class="y">igjen</span>', 14, 'in-fade big')}`)
  await t.film(3.2)
  await t.overlay(END('Et lite fiskespill<br>om å huske'))
  await t.film(3.8)
  return t.finish()
}

export async function ad2(name = 'ad2') {
  const clips = [await dusk(`${name}-1`), await letter(`${name}-2`), await lighthouse(`${name}-3`), await lit(`${name}-4`)]
  // the light comes on with the second verse
  return { clips, lit: clips.slice(0, 3).reduce((n, c) => n + c.seconds, 0) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { closeBrowser } = await import('./studio.mjs')
  await ad2(process.argv[2])
  await closeBrowser()
}
