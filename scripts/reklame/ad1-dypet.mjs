// Ad 1, «Dypet»: the hook is the depth. Cast, let the line run 850 metres down into the dark,
// something huge takes the hook, reel it in and meet a new species.

import { book, save } from './saves.mjs'
import { actPos, cap, END, fadeOut, REEL_PILOT } from './scenes.mjs'
import { take } from './studio.mjs'

const ZONES = [
  [25, 'Grunna'],
  [60, 'Tareskogen'],
  [150, 'Skumringen'],
  [400, 'Dypet'],
  [1000, 'Avgrunnen'],
  [1200, 'Grøfta'],
]

/** A big depth readout under the caption, with the name of the zone you are in */
const DEPTH_METER = `
  const el = document.getElementById('rk-depth')
  if (el) {
    const d = Math.round(__game.sea.depth)
    el.querySelector('b').textContent = d + ' m'
    const z = ${JSON.stringify(ZONES)}.find((z) => d <= z[0])[1]
    const n = el.querySelector('small')
    if (n.textContent !== z) {
      // a fresh element, so the slide-in plays again
      const m = n.cloneNode()
      m.textContent = z
      n.replaceWith(m)
    }
  }
`

export async function ad1(name = 'ad1') {
  const t = await take(name, {
    seed: 11,
    audioSeconds: 30,
    save: save({
      time: 0.705,
      money: 3420,
      gear: { line: 5, rod: 3, reel: 3, bucket: 3, lure: 3, lamp: 3 },
      book: book(['sild', 'makrell', 'sei', 'lyr', 'torsk', 'berggylt', 'lange', 'uer', 'brosme', 'blakveite', 'lysprikk', 'okse']),
      flags: { cat: true },
      stats: { caught: 2, perfect: 0, sold: 0, night: 0, released: 0, treasure: 0 },
    }),
  })
  // straight to the boat, past the title
  await t.down(216, 360)
  await t.up()
  await t.skip(1.2)
  const act = await actPos(t)

  // the hook
  await t.overlay(`<div class="shade-top"></div>${cap('Hvor dypt tør du<br><span class="y">å fiske?</span>', 15, 'big')}`)
  await t.film(1.7)

  // hold to cast, and keep holding while the line runs down
  await fadeOut(t, '.cap')
  await t.down(act.x, act.y)
  await t.addOverlay(`<div class="cap" id="rk-depth" style="top:15%"><b style="font-size:84px;color:var(--gold)">0 m</b><br><small class="cap small in-slide" style="position:static;display:block;margin-top:6px">Grunna</small></div>`)
  await t.perFrame(DEPTH_METER)
  await t.film(0.5)
  await t.film(6, { speed: 2.6, until: 'g.sea.lure.y > 1420' })
  await t.up()
  // something big comes for the lure, before anything else can
  await t.eval(() => {
    const s = window.__game.sea
    const f = s.spawn(4, window.__species.sildekonge, s.lure.y + 8)
    f.x = s.lure.x + 62
    f.alpha = 0
    f.state = 'approach'
    document.getElementById('hint').style.visibility = 'hidden'
  })
  await t.film(0.6)
  await fadeOut(t, '#rk-depth')
  await t.addOverlay(cap('Noe <span class="c">stort</span> nærmer seg …', 15, 'in-fade'))
  // one nibble is enough for an ad
  await t.perFrame(`for (const f of __game.sea.fish) if (f.state === 'nibble' && f.nibbles > 1) f.nibbles = 1`)
  await t.film(8, { speed: 1.3, until: "g.sea.mode === 'bite'" })
  await t.eval(() => (document.getElementById('hint').style.visibility = ''))
  await t.overlay(`<div class="flash"></div>${cap('<span class="y">NAPP!</span>', 15, 'big')}`)
  await t.tap(act.x, act.y, 0.15)

  // reel it in
  await t.perFrame(REEL_PILOT(act.x, act.y))
  await t.film(0.5)
  await fadeOut(t, '.cap')
  await t.film(0.25)
  await t.addOverlay(cap('Hold det grønne feltet<br>på fisken!', 15, 'in-slide'))
  await t.film(10, { until: "g.sea.mode === 'land'" })
  await t.perFrame(null)
  await t.eval(() => window.__touch(0, 0, false))
  await fadeOut(t, '.cap')
  await t.film(6, { until: "!document.getElementById('sheet').classList.contains('hidden')" })
  const reveal = t.time

  // the catch card
  await t.overlay('')
  await t.film(2.6)
  const keep = await t.eval(() => {
    const r = document.querySelector('#sheet [data-a=keep]').getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  await t.tap(keep.x, keep.y, 0.2)
  await t.film(0.4)

  // end card
  await t.overlay(END('Nesten 200 arter å finne,<br>helt ned til 1200 meter'))
  await t.film(3.6)
  return { clips: [await t.finish()], reveal }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { closeBrowser } = await import('./studio.mjs')
  await ad1(process.argv[2])
  await closeBrowser()
}
