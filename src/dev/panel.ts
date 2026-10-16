// Dev-only panel for previewing the harbour: scrub the time of day, toggle story flags

import { dev } from '../game/harbor'

const STAGES: [string, number][] = [
  ['Natt', 0.05],
  ['Daggry', 0.215],
  ['Soloppgang', 0.25],
  ['Morgen', 0.29],
  ['Dag', 0.45],
  ['Gyllen', 0.66],
  ['Solnedgang', 0.705],
  ['Skumring', 0.745],
  ['Blåtime', 0.78],
]

const el = document.createElement('div')
el.id = 'devpanel'
el.style.cssText =
  'position:fixed;left:6px;top:calc(env(safe-area-inset-top) + 64px);z-index:9999;background:rgba(10,8,30,.82);color:#fff;font:11px/1.3 system-ui,sans-serif;padding:6px;border-radius:8px;display:flex;flex-direction:column;gap:4px;max-width:180px;pointer-events:auto'
document.body.append(el)

let open = true

function render() {
  const btn = (label: string, on: boolean, data: string) =>
    `<button data-k="${data}" style="font:inherit;padding:2px 5px;border-radius:4px;border:1px solid #fff4;background:${on ? '#ffd84a' : '#ffffff18'};color:${on ? '#222' : '#fff'}">${label}</button>`
  if (!open) {
    el.innerHTML = btn('dev', false, 'toggle')
    return
  }
  const t = dev.time
  el.innerHTML = `
    <div style="display:flex;gap:3px;flex-wrap:wrap">${STAGES.map(([n, v]) => btn(n, t !== null && Math.abs(t - v) < 0.004, `time:${v}`)).join('')}${btn('Auto', t === null, 'auto')}</div>
    <input type="range" min="0" max="1" step="0.0025" value="${t ?? 0.45}" data-k="slider">
    <div style="display:flex;gap:3px;flex-wrap:wrap">${btn('Fyr tent', dev.ending === true, 'ending')}${btn('Selma', dev.selma === true, 'selma')}${btn('skjul', false, 'toggle')}</div>`
}

el.addEventListener('pointerdown', (e) => e.stopPropagation())
el.addEventListener('click', (e) => {
  e.stopPropagation()
  const k = (e.target as HTMLElement).closest<HTMLElement>('[data-k]')?.dataset.k
  if (!k || k === 'slider') return
  if (k === 'toggle') open = !open
  else if (k === 'auto') dev.time = null
  else if (k === 'ending') dev.ending = dev.ending ? null : true
  else if (k === 'selma') dev.selma = dev.selma ? null : true
  else if (k.startsWith('time:')) dev.time = Number(k.slice(5))
  render()
})
el.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement
  if (t.dataset.k === 'slider') dev.time = Number(t.value)
})

render()

// handy from the console: __dev.time = 0.7
;(window as unknown as { __dev: typeof dev }).__dev = dev

// ?brygge or ?sjo skips the title and opens the harbour or the sea, for quick previews after a reload
const q = new URLSearchParams(location.search)
const tab = q.has('brygge') ? 'harbor' : q.has('sjo') ? 'sea' : null
if (tab)
  setTimeout(() => {
    document.querySelector('#title')?.dispatchEvent(new PointerEvent('pointerdown'))
    setTimeout(() => document.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.click(), 100)
  }, 300)
