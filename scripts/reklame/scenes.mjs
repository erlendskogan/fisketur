// Building blocks shared by the three ads: captions, the end card and the fishing autopilots

/** A caption; `at` is the top edge in % of the screen, `cls` adds big/small/in-fade/in-slide */
export const cap = (html, at = 16, cls = '', id = '') => `<div class="cap ${cls}" ${id ? `id="${id}"` : ''} style="top:${at}%">${html}</div>`

export const sign = (text, at = 30, cls = '') => `<div class="sign ${cls}" style="top:${at}%">${text}</div>`

export const stamp = (place, country, at = 26) => `<div class="stamp" style="top:${at}%">${place}<small>${country}</small></div>`

export const END = (tag) => `<div class="end">
  <img class="icon" src="/icon-512.png" alt="">
  <h1>Fisketur</h1>
  <div class="tag">${tag}</div>
  <div class="cta">Last ned gratis</div>
  <div class="fine">På App Store for iPhone</div>
</div>`

/** Where the big yellow button is, in CSS pixels */
export const actPos = (t) =>
  t.eval(() => {
    const r = document.getElementById('act').getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })

/**
 * Page-side code for t.perFrame(): plays the reeling minigame like a steady thumb, keeping the
 * green zone on the fish, and shows the thumb while it holds.
 */
export const REEL_PILOT = (x, y) => `
  const s = __game.sea, r = s.reel
  if (s.mode === 'reel' && r && !r.result) {
    const err = r.fish - (r.zonePos + r.zone / 2) - r.zoneVel * 0.32 + r.fishVel * 0.25
    s.holding = err > -0.01
    __touch(${x}, ${y}, s.holding)
  } else __touch(0, 0, false)
`

/** Remove the overlay elements matching a selector with a short fade */
export const fadeOut = (t, sel) => t.eval((sel) => document.querySelectorAll(`#rk ${sel}`).forEach((el) => el.classList.add('out')), sel)
