// DOM helpers: dialogue box, toasts and bottom sheets

import { iconCanvas, portrait } from '../art/sprites'
import { toURL } from '../art/pixel'
import { sfx } from '../audio'
import { NAMES, type Line } from '../game/story'

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

const iconCache = new Map<string, string>()
/**
 * An icon as a data URL, drawn so each of its 12×12 pixels covers a whole number of screen
 * pixels when shown `css` pixels wide; that keeps it crisp on every screen.
 */
export const icon = (name: string, css = 24) => {
  const scale = Math.max(1, Math.round((css / 12) * (window.devicePixelRatio || 1)))
  const k = name + scale
  if (!iconCache.has(k)) iconCache.set(k, toURL(iconCanvas(name), scale))
  return iconCache.get(k)!
}
export const iconImg = (name: string, css = 24) => `<img class="px" src="${icon(name, css)}" width="${css}" height="${css}" alt="">`

const faceCache = new Map<string, string>()
export const face = (id: string) => {
  if (!faceCache.has(id)) faceCache.set(id, toURL(portrait(id), 4))
  return faceCache.get(id)!
}

export const kr = (n: number) => `${Math.round(n).toLocaleString('nb-NO')} kr`

export class UI {
  private talkEl = $('#talk')
  private sheetEl = $('#sheet')
  private toastsEl = $('#toasts')
  talking = false
  onSheetClose: (() => void) | null = null

  get sheetOpen() {
    return !this.sheetEl.classList.contains('hidden')
  }

  get busy() {
    return this.talking || this.sheetOpen
  }

  toast(text: string, ico?: string) {
    const el = document.createElement('div')
    el.className = 'toast pix'
    el.innerHTML = `${ico ? iconImg(ico) : ''}<span>${esc(text)}</span>`
    this.toastsEl.appendChild(el)
    while (this.toastsEl.children.length > 3) this.toastsEl.firstElementChild!.remove()
    setTimeout(() => el.remove(), 3200)
  }

  /** Plays lines one by one; resolves when the last one is dismissed */
  talk(lines: Line[]): Promise<void> {
    if (!lines.length) return Promise.resolve()
    this.talking = true
    const el = this.talkEl
    el.classList.remove('hidden')
    return new Promise((done) => {
      let i = 0
      let typing = 0
      let shown = 0
      let full = ''
      const show = () => {
        const l = lines[i]
        full = l.text
        shown = 0
        el.classList.toggle('narrate', !l.who)
        el.innerHTML = `<div class="box pix">${l.who ? `<span class="name">${NAMES[l.who]}</span><img class="px" src="${face(l.who)}" alt="">` : ''}<div class="text"></div><i class="more hidden"></i></div>`
        const text = $('.text', el)
        clearInterval(typing)
        typing = window.setInterval(() => {
          shown = Math.min(full.length, shown + 1)
          text.textContent = full.slice(0, shown)
          if (l.who && shown % 3 === 0) sfx.blip()
          if (shown >= full.length) {
            clearInterval(typing)
            $('.more', el).classList.remove('hidden')
          }
        }, 22)
      }
      const next = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        if (shown < full.length) {
          shown = full.length - 1
          return
        }
        i++
        if (i >= lines.length) {
          clearInterval(typing)
          el.removeEventListener('pointerdown', next)
          el.classList.add('hidden')
          el.innerHTML = ''
          this.talking = false
          done()
        } else {
          sfx.click()
          show()
        }
      }
      el.addEventListener('pointerdown', next)
      show()
    })
  }

  /** A bottom sheet with a title; `body` gets wired by the caller */
  sheet(title: string, body: string, onClose?: () => void) {
    this.sheetEl.classList.remove('hidden')
    this.sheetEl.innerHTML = `<div class="panel pix"><div class="panel-head"><h2>${esc(title)}</h2><button class="x" aria-label="Lukk">X</button></div><div class="panel-body">${body}</div></div>`
    this.onSheetClose = onClose ?? null
    $('.x', this.sheetEl).onclick = () => this.closeSheet()
    this.sheetEl.onpointerdown = (e) => {
      if (e.target === this.sheetEl) this.closeSheet()
    }
    return $('.panel-body', this.sheetEl)
  }

  /** Replace the body of the open sheet, keeping scroll */
  body() {
    return $('.panel-body', this.sheetEl)
  }

  setTitle(t: string) {
    $('.panel-head h2', this.sheetEl).textContent = t
  }

  closeSheet() {
    if (!this.sheetOpen) return
    this.sheetEl.classList.add('hidden')
    this.sheetEl.innerHTML = ''
    const cb = this.onSheetClose
    this.onSheetClose = null
    cb?.()
  }
}
