import '@fontsource/jersey-10/index.css'
import './style.css'

import { canvas, toURL } from './art/pixel'
import { nightness } from './art/scenery'
import { initAudio, setRain, setSound, sfx } from './audio'
import {
  BOOK,
  BOOK_REWARDS,
  GEAR,
  GEAR_ORDER,
  PAINTS,
  QUESTS,
  SPECIES_BY_ID,
  ZONES,
  questTarget,
  zoneAt,
  depthToY,
  type Quest,
  type Species,
} from './game/data'
import { Harbor, type SpotId } from './game/harbor'
import { artFor, Sea, type SeaHost } from './game/sea'
import { activeQuests, bookCount, bucketValue, fresh, gearValue, load, needsMet, persist, wipe, type Save } from './game/state'
import { AFTER_ENDING, CAT, CHATTER, ENDING, FIRST_SALE, GAMLE, INTRO, LETTERS, LETTER_FOUND, MEET_EDVARD, MEET_HALVOR, MEET_MARIT, MEET_SELMA, type Line } from './game/story'
import { $, esc, face, icon, iconImg, kr, UI } from './ui/ui'
import { watchForUpdates } from './update'
import { weatherAt } from './game/weather'

if (import.meta.env.DEV) import('./dev/panel')

const DAY_SECONDS = 540

type View = 'sea' | 'harbor'

class Game implements SeaHost {
  s: Save = load()
  ui = new UI()
  sea = new Sea(this)
  harbor = new Harbor(this)
  view: View = 'harbor'
  cv = $<HTMLCanvasElement>('#cv')
  g = this.cv.getContext('2d')!
  W = 0
  H = 0
  px = 1
  started = false
  private last = performance.now()
  private saveT = 0
  private hudKey = ''
  private navKey = ''
  private labelKey = ''

  constructor() {
    this.g.imageSmoothingEnabled = false
    setSound(this.s.sound)
    this.view = this.s.flags.metMarit ? 'sea' : 'harbor'
    addEventListener('resize', () => this.resize())
    visualViewport?.addEventListener('resize', () => this.resize())
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 300))
    this.resize()
    this.bindInput()
    this.title()
    requestAnimationFrame(this.frame)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) persist(this.s)
      this.last = performance.now()
    })
  }

  // ---------- setup ----------

  resize() {
    const dpr = window.devicePixelRatio || 1
    // the app box covers the whole screen, also behind the status bar and home indicator
    const box = $('#app').getBoundingClientRect()
    const cw = box.width || innerWidth
    const ch = box.height || innerHeight
    const scale = Math.max(2, Math.round((cw * dpr) / 196))
    this.W = Math.ceil((cw * dpr) / scale)
    this.H = Math.ceil((ch * dpr) / scale)
    this.cv.width = this.W
    this.cv.height = this.H
    this.px = scale / dpr
    this.cv.style.width = `${this.W * this.px}px`
    this.cv.style.height = `${this.H * this.px}px`
    this.g.imageSmoothingEnabled = false
    this.sea.resize(this.W, this.H)
    this.harbor.resize(this.W, this.H)
    this.labelKey = ''
  }

  private bindInput() {
    const pos = (e: PointerEvent) => ({ x: e.clientX / this.px, y: e.clientY / this.px })
    this.cv.addEventListener('pointerdown', (e) => {
      initAudio()
      if (!this.started || this.ui.busy) return
      const p = pos(e)
      if (this.view === 'sea') this.sea.press(p.x, p.y)
      else {
        const id = this.harbor.hit(p.x, p.y)
        if (id) this.openSpot(id)
      }
    })
    const up = () => this.sea.release()
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
    // the reel can be held anywhere, also on top of the dock
    $('#dock').addEventListener('pointerdown', (e) => {
      if (this.view === 'sea' && this.sea.mode === 'reel' && !(e.target as HTMLElement).closest('#nav')) this.sea.holding = true
    })
    addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || !this.started || this.ui.busy) return
      e.preventDefault()
      if (!e.repeat && this.view === 'sea') this.sea.press(-99, -99)
    })
    addEventListener('keyup', (e) => e.code === 'Space' && this.sea.release())

    // the button: hold it to let line out (like the water), tap it to hook or reel in
    $('#act').addEventListener('pointerdown', (e) => {
      initAudio()
      if (this.view !== 'sea' || this.ui.busy || !this.started) return
      e.stopPropagation()
      const m = this.sea.mode
      if (m === 'idle') this.sea.press(-99, -99)
      else this.sea.action()
    })
    $('#nav').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button')
      if (!b || this.ui.talking) return
      sfx.click()
      this.ui.closeSheet()
      const t = b.dataset.tab
      if (t === 'sea') this.go('sea')
      if (t === 'harbor') this.go('harbor')
      if (t === 'book') this.openBook()
      if (t === 'quests') this.openQuests()
    })
    $('#hud').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-hud]') as HTMLElement | null
      if (!b || this.ui.talking) return
      sfx.click()
      if (b.dataset.hud === 'bucket') this.openBucket()
      if (b.dataset.hud === 'settings') this.openSettings()
    })
  }

  private title() {
    const el = $('#title')
    const cont = !!this.s.flags.metMarit
    document.body.classList.add('intro')
    el.innerHTML = `<h1>Fisketur</h1><p>Et lite fiskespill fra fjorden</p><p class="start">Trykk for å ${cont ? 'fortsette' : 'begynne'}</p>`
    el.addEventListener(
      'pointerdown',
      async () => {
        initAudio()
        sfx.click()
        el.classList.add('gone')
        setTimeout(() => el.remove(), 600)
        this.started = true
        if (cont) document.body.classList.remove('intro')
        if (!this.s.flags.metMarit) {
          this.view = 'harbor'
          await this.ui.talk(INTRO)
          await this.ui.talk(MEET_MARIT)
          this.s.flags.metMarit = true
          document.body.classList.remove('intro')
          this.save()
        }
      },
      { once: true },
    )
  }

  save() {
    persist(this.s)
  }

  go(v: View) {
    if (v === this.view) return
    if (v === 'harbor' && ['reel', 'land', 'bite', 'snag'].includes(this.sea.mode)) {
      this.ui.toast('Du har noe på kroken!')
      return
    }
    if (v === 'harbor') this.sea.reset()
    this.view = v
    this.labelKey = ''
  }

  // ---------- loop ----------

  private frame = (now: number) => {
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000))
    this.last = now
    const before = this.s.time
    this.s.time = (this.s.time + dt / DAY_SECONDS) % 1
    if (this.s.time < before) this.s.day = (this.s.day ?? 0) + 1
    this.watchWeather()
    const paused = this.ui.busy || !this.started
    this.sea.update(dt, paused)
    this.harbor.update(dt)
    this.g.clearRect(0, 0, this.W, this.H)
    if (this.view === 'sea') this.sea.draw(this.g)
    else this.harbor.draw(this.g)
    this.renderHud()
    this.renderDock()
    this.renderLabels()
    this.matchEdges(dt)
    this.saveT += dt
    if (this.saveT > 8) {
      this.saveT = 0
      this.save()
    }
    requestAnimationFrame(this.frame)
  }

  /**
   * iOS home-screen apps leave a strip below the page that only the page background
   * can paint. Give it the colour of the bottom of the scene so it blends in.
   */
  private edgeT = 0
  private edge = ''
  private matchEdges(dt: number) {
    this.edgeT -= dt
    if (this.edgeT > 0) return
    this.edgeT = 0.4
    const [r, g, b] = this.g.getImageData(Math.floor(this.W / 2), this.H - 1, 1, 1).data
    const c = `rgb(${r},${g},${b})`
    if (c === this.edge) return
    this.edge = c
    document.documentElement.style.background = c
    document.body.style.background = c
  }

  private raining = false
  /** A word when a shower starts, since the fish bite better in the rain */
  private watchWeather() {
    const rain = weatherAt(this.s.day, this.s.time).rain
    setRain(rain)
    if (!this.raining && rain > 0.3 && this.started && !this.ui.busy) {
      this.raining = true
      this.ui.toast('Det begynner å regne. Fisken biter bedre nå!', 'rain')
    } else if (this.raining && rain < 0.05) this.raining = false
  }

  // ---------- HUD and dock ----------

  private renderHud() {
    const s = this.s
    const hour = Math.floor(s.time * 24)
    const min = Math.floor((s.time * 24 * 60) % 60 / 10) * 10
    const depth = this.view === 'sea' ? Math.round(this.sea.depth) : -1
    const wet = weatherAt(s.day, s.time).rain > 0.3
    const key = `${s.money}|${s.bucket.length}|${gearValue(s, 'bucket')}|${depth}|${hour}:${min}|${this.view}|${s.gear.line}|${wet}`
    if (key === this.hudKey) return
    this.hudKey = key
    const night = nightness(s.time) > 0.5
    $('#hud').innerHTML = `
      <span class="chip">${iconImg('coin')}${kr(s.money)}</span>
      <button class="chip" data-hud="bucket">${iconImg('bucket')}${s.bucket.length}/${gearValue(s, 'bucket')}</button>
      <span class="grow"></span>
      ${depth >= 0 ? `<span class="chip depth">${depth} m<small>/ ${gearValue(s, 'line')}</small></span>` : ''}
      <span class="chip">${iconImg(wet ? 'rain' : night ? 'moon' : 'sun')}${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}</span>
      <button class="chip icon-only" data-hud="settings" aria-label="Innstillinger">${iconImg('gear')}</button>`
  }

  private renderDock() {
    const s = this.s
    const mode = this.sea.mode
    const act = $<HTMLButtonElement>('#act')
    const hint = $('#hint')
    const sea = this.view === 'sea'
    const labels: Record<string, string> = {
      idle: 'Hold for å kaste',
      cast: 'Slipp for å stoppe',
      sink: 'Slipp for å stoppe',
      wait: 'Hal inn',
      bite: 'NAPP!',
      reel: '',
      land: 'Haler inn ...',
      retrieve: 'Haler inn ...',
      snag: 'Haler inn ...',
    }
    const hintText = !sea
      ? ''
      : mode === 'reel'
        ? 'Hold inne for å løfte det grønne feltet'
        : mode === 'wait'
          ? s.stats.caught < 3
            ? 'Vent på napp. Hold på skjermen for å gå dypere.'
            : ''
          : mode === 'idle' && s.stats.caught < 3
            ? 'Hold fingeren på skjermen for å slippe ut snøre'
            : mode === 'sink' && s.stats.caught < 3
              ? 'Slipp når du er på riktig dybde'
              : ''
    const navKey = `${this.view}|${this.badges().join(',')}|${!!s.flags.metHalvor}|${this.claimable()}`
    const actKey = `${sea}|${mode}|${hintText}`
    if (act.dataset.key !== actKey) {
      act.dataset.key = actKey
      act.classList.toggle('hidden', !sea || mode === 'reel')
      act.textContent = labels[mode]
      act.disabled = ['land', 'retrieve', 'snag'].includes(mode)
      act.classList.toggle('hot', mode === 'bite')
      act.classList.toggle('green', mode === 'wait' || mode === 'sink')
      hint.textContent = hintText
    }
    if (navKey === this.navKey) return
    this.navKey = navKey
    const harborBadge = this.badges().length > 0
    const claim = this.claimable()
    $('#nav').innerHTML = `
      <button data-tab="sea" class="${this.view === 'sea' ? 'on' : ''}"><img class="px" src="${icon('sea')}" alt="">Sjøen</button>
      <button data-tab="harbor" class="${this.view === 'harbor' ? 'on' : ''}"><img class="px" src="${icon('house')}" alt="">Bryggen${harborBadge ? '<span class="badge">!</span>' : ''}</button>
      <button data-tab="book"><img class="px" src="${icon('book')}" alt="">Fiskebok</button>
      <button data-tab="quests" ${s.flags.metHalvor ? '' : 'disabled'}><img class="px" src="${icon(s.flags.metHalvor ? 'scroll' : 'lock')}" alt="">Oppdrag${claim ? `<span class="badge">${claim}</span>` : ''}</button>`
  }

  private renderLabels() {
    const el = $('#labels')
    if (this.view !== 'harbor' || !this.started) {
      if (el.innerHTML) el.innerHTML = ''
      this.labelKey = ''
      return
    }
    const badges = this.badges()
    const key = `${this.W}|${badges.join(',')}|${!!this.s.flags.selma}|${this.harbor.spots.length}`
    if (key === this.labelKey) return
    this.labelKey = key
    const names: Record<SpotId, string> = {
      krambua: 'Krambua',
      havnebua: 'Havnebua',
      stasjon: this.s.flags.selma ? 'Havstasjonen' : 'Tomt hus',
      fyret: 'Fyret',
      baten: 'Måken',
    }
    el.innerHTML = this.harbor.spots
      .map((p) => {
        const x = Math.max(56, Math.min(innerWidth - 50, (p.x + p.w / 2) * this.px))
        const y = (p.id === 'baten' ? p.y + p.h + 14 : p.y) * this.px
        return `<span class="label" style="left:${x}px;top:${y}px">${names[p.id]}${badges.includes(p.id) ? '<span class="badge">!</span>' : ''}</span>`
      })
      .join('')
  }

  /** Places with something new waiting */
  badges(): SpotId[] {
    const f = this.s.flags
    const out: SpotId[] = []
    if ((f.catPending && !f.cat) || (this.s.bucket.length && !f.sold1)) out.push('krambua')
    if (f.sold1 && !f.metHalvor) out.push('havnebua')
    if (f.selma && (!f.metSelma || this.bookClaimable())) out.push('stasjon')
    if ((f.sold1 && !f.metKnut) || this.s.letters.found > this.s.letters.delivered || (f.scale && !f.ending)) out.push('fyret')
    return out
  }

  claimable() {
    return activeQuests(this.s).filter((q) => (this.s.quests[q.id] ?? 0) >= questTarget(q.goal)).length
  }

  bookClaimable() {
    const n = bookCount(this.s)
    return BOOK_REWARDS.find((r) => n >= r.n && !this.s.bookClaimed.includes(r.n))
  }

  // ---------- events from the sea ----------

  caught(sp: Species, cm: number, kg: number, perfect: boolean, chest: boolean) {
    const s = this.s
    const k = (cm - sp.cm[0]) / Math.max(1, sp.cm[1] - sp.cm[0])
    const value = Math.round(sp.value * (0.7 + 0.6 * k))
    const isNew = !s.book[sp.id]
    const prev = s.book[sp.id]
    s.book[sp.id] = { n: (prev?.n ?? 0) + 1, best: Math.max(prev?.best ?? 0, cm) }
    s.stats.caught++
    if (perfect) s.stats.perfect++
    const night = nightness(s.time) > 0.5
    if (night) s.stats.night++
    let bonus = 0
    if (chest) {
      bonus = Math.round(30 + sp.zone * 90 + Math.random() * (60 + sp.zone * 80))
      s.money += bonus
      s.stats.treasure++
      this.progress('treasure')
    }
    this.progress('catch', { sp, kg, perfect, night })
    this.checkStory()
    this.save()
    this.catchCard(sp, { cm, kg, value }, isNew, perfect, bonus, prev?.best)
  }

  escaped() {
    this.ui.toast('Den slapp! Prøv igjen.')
  }

  async letterFound() {
    const s = this.s
    s.letters.found = s.letters.delivered + 1
    this.save()
    sfx.chest()
    await this.ui.talk(LETTER_FOUND(s.letters.delivered))
  }

  async gamleCaught() {
    sfx.fanfare()
    this.s.flags.scale = true
    this.s.book.gamle = { n: 1, best: 620 }
    this.save()
    await this.ui.talk(GAMLE)
  }

  modeChanged() {
    /* the dock re-renders from its own key */
  }

  // ---------- quests ----------

  progress(kind: 'catch' | 'sell' | 'release' | 'treasure', data: { sp?: Species; kg?: number; perfect?: boolean; night?: boolean; kr?: number } = {}) {
    const s = this.s
    for (const q of activeQuests(s)) {
      const before = s.quests[q.id] ?? 0
      const target = questTarget(q.goal)
      if (before >= target) continue
      let p = before
      const g = q.goal
      const sp = data.sp
      if (kind === 'catch' && sp) {
        if (g.kind === 'catch') p++
        if (g.kind === 'species' && g.id === sp.id) p++
        if (g.kind === 'heavy' && (data.kg ?? 0) >= g.kg) p = 1
        if (g.kind === 'night' && data.night) p++
        if (g.kind === 'perfect' && data.perfect) p++
        if (g.kind === 'zone' && sp.zone === g.zone) p++
        if (g.kind === 'distinct' && sp.zone === g.zone) {
          const set = new Set(s.questSets[q.id] ?? [])
          set.add(sp.id)
          s.questSets[q.id] = [...set]
          p = set.size
        }
      }
      if (kind === 'sell' && g.kind === 'sell') p += data.kr ?? 0
      if (kind === 'release' && g.kind === 'release') p++
      if (kind === 'treasure' && g.kind === 'treasure') p++
      s.quests[q.id] = Math.min(p, target)
      if (p >= target) {
        this.ui.toast(`Oppdrag klart: ${q.title}`, 'scroll')
        sfx.coin()
      }
    }
  }

  claim(q: Quest) {
    const s = this.s
    s.done.push(q.id)
    if (q.money) s.money += q.money
    if (q.unlock === 'reel3') s.gear.reel = 3
    else if (q.unlock === 'goldpaint') {
      s.flags.goldpaint = true
      if (!s.paints.includes('gull')) s.paints.push('gull')
    } else if (q.unlock) s.flags[q.unlock] = true
    sfx.coin()
    this.save()
  }

  // ---------- story ----------

  checkStory() {
    const s = this.s
    if (!s.flags.selma && bookCount(s) >= 5) {
      s.flags.selma = true
      this.ui.toast('En forskningsbåt har lagt til ved Havstasjonen.', 'house')
    }
    if (!s.flags.catPending && s.stats.caught >= 12) {
      s.flags.catPending = true
      this.ui.toast('Marit vil gjerne snakke med deg.', 'house')
    }
  }

  async openSpot(id: SpotId) {
    sfx.click()
    const s = this.s
    const f = s.flags
    if (id === 'baten') return this.go('sea')
    if (id === 'krambua') {
      if (f.catPending && !f.cat) {
        await this.ui.talk(CAT)
        f.cat = true
        this.save()
      }
      return this.openShop()
    }
    if (id === 'havnebua') {
      if (!f.sold1) return this.ui.talk([{ who: 'halvor', text: 'Kom tilbake når du har solgt litt fisk, så skal vi snakkes.' }])
      if (!f.metHalvor) {
        await this.ui.talk(MEET_HALVOR)
        f.metHalvor = true
        this.save()
      }
      return this.openHalvor()
    }
    if (id === 'stasjon') {
      if (!f.selma) return this.ui.talk([{ who: null, text: 'Huset står tomt. På døra henger en lapp: «Ledig. Passer for forsker eller annen rar person.»' }])
      if (!f.metSelma) {
        await this.ui.talk(MEET_SELMA)
        f.metSelma = true
        s.gear.lamp = Math.max(s.gear.lamp, 1)
        if (!s.bookClaimed.includes(5)) s.bookClaimed.push(5)
        this.ui.toast('Du fikk en hodelykt!', 'gear')
        this.save()
      }
      return this.openSelma()
    }
    if (id === 'fyret') return this.visitKnut()
  }

  private async visitKnut() {
    const s = this.s
    const f = s.flags
    sfx.creak()
    if (!f.metKnut) {
      await this.ui.talk(MEET_EDVARD)
      f.metKnut = true
      this.save()
      return
    }
    if (s.letters.found > s.letters.delivered) {
      const i = s.letters.delivered
      const L = LETTERS[i]
      await this.ui.talk([{ who: 'edvard', text: 'Et brev? Les det for meg, er du snill. Øynene mine er ikke hva de var.' }])
      this.showLetter(L.text, async () => {
        await this.ui.talk(L.after)
        s.letters.delivered = i + 1
        if (i === 3) {
          s.gear.line = 5
          f.finale = true
          sfx.fanfare()
          this.ui.toast('Du fikk Knuts snøre. Det rekker helt til bunns!', 'gear')
        }
        this.save()
      })
      return
    }
    if (f.scale && !f.ending) {
      await this.ui.talk(ENDING.slice(0, 3))
      f.ending = true
      sfx.fanfare()
      this.save()
      await this.ui.talk(ENDING.slice(3))
      return
    }
    const pool = f.ending ? AFTER_ENDING.edvard : CHATTER.edvard
    const hint: Line[] =
      f.finale && !f.scale
        ? [{ who: 'edvard', text: 'Senk lyset helt ned i Grøfta, vennen. Hun venter.' }]
        : s.letters.delivered < 4 && s.letters.found === s.letters.delivered
          ? [{ who: 'edvard', text: `Det neste brevet... jeg tror jeg senket det på rundt ${[40, 120, 300, 800][s.letters.delivered]} meter.` }]
          : []
    await this.ui.talk([{ who: 'edvard', text: pool[Math.floor(Math.random() * pool.length)] }, ...hint])
  }

  private showLetter(text: string, then: () => void) {
    const b = this.ui.sheet('Til Den gamle', `<div class="letter">${esc(text)}</div><div class="stack" style="margin-top:14px"><button class="btn" data-a="ok">Brett sammen brevet</button></div>`, then)
    b.querySelector<HTMLElement>('[data-a=ok]')!.onclick = () => this.ui.closeSheet()
  }

  // ---------- panels ----------

  private placeHead(who: string, line: string) {
    return `<div class="who"><img class="px" src="${face(who)}" alt=""><p>${esc(line)}</p></div>`
  }

  private chatter(who: 'marit' | 'halvor' | 'selma') {
    const pool = CHATTER[who]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  openShop(tab: 'main' | 'gear' | 'paint' = 'main') {
    const s = this.s
    const greet = s.bucket.length ? `Det ser ut som du har ${s.bucket.length} fisk til meg!` : this.chatter('marit')
    if (tab === 'main') {
      const b = this.ui.sheet(
        'Krambua',
        `${this.placeHead('marit', greet)}<div class="stack">
          <button class="btn green" data-a="sell" ${s.bucket.length ? '' : 'disabled'}>${iconImg('coin')}Selg fangsten<span class="right">${kr(bucketValue(s))}</span></button>
          <button class="btn" data-a="gear">${iconImg('gear')}Utstyr</button>
          <button class="btn plain" data-a="paint">${iconImg('sea')}Båtmaling</button>
        </div>`,
      )
      b.querySelector<HTMLElement>('[data-a=sell]')!.onclick = () => this.sell()
      b.querySelector<HTMLElement>('[data-a=gear]')!.onclick = () => this.openShop('gear')
      b.querySelector<HTMLElement>('[data-a=paint]')!.onclick = () => this.openShop('paint')
      return
    }
    if (tab === 'gear') {
      const rows = GEAR_ORDER.map((k) => {
        const cur = s.gear[k]
        const levels = GEAR[k].levels
        const now = levels[cur]
        const next = levels[cur + 1]
        const pips = `<span class="lvl">${levels.map((_, i) => `<i class="${i <= cur ? 'on' : ''}"></i>`).join('')}</span>`
        let right = '<span class="muted">Maks</span>'
        let sub = now.text
        if (next) {
          if (next.gift) {
            sub = `Neste: ${k === 'lamp' ? (cur === 0 ? 'Kanskje noen på Havstasjonen har en lykt?' : 'Selma har noe spesielt.') : k === 'line' ? 'Bestefar har det siste snøret.' : 'Halvor har en snelle han aldri låner bort.'}`
          } else if (!needsMet(s, next.needs)) {
            sub = `Neste: ${next.name}. ${next.needsText}.`
          } else {
            sub = `Neste: ${next.name}. ${next.text}`
            right = `<button class="btn" data-buy="${k}" ${s.money >= next.price ? '' : 'disabled'}>${kr(next.price)}</button>`
          }
        }
        return `<div class="row"><div class="info"><b>${GEAR[k].title}: ${now.name}${pips}</b><small>${esc(sub)}</small></div>${right}</div>`
      }).join('')
      const b = this.ui.sheet('Utstyr', `${this.placeHead('marit', 'Alt du trenger for å komme dypere. Og kaffen er gratis.')}${rows}<div class="stack" style="margin-top:12px"><button class="btn plain" data-a="back">Tilbake</button></div>`)
      b.querySelectorAll<HTMLElement>('[data-buy]').forEach(
        (el) =>
          (el.onclick = () => {
            const k = el.dataset.buy as keyof typeof GEAR
            const next = GEAR[k].levels[s.gear[k] + 1]
            if (!next || s.money < next.price) return
            s.money -= next.price
            s.gear[k]++
            sfx.coin()
            this.ui.toast(`Du kjøpte ${next.name}!`, 'coin')
            this.save()
            this.openShop('gear')
          }),
      )
      b.querySelector<HTMLElement>('[data-a=back]')!.onclick = () => this.openShop()
      return
    }
    const rows = PAINTS.filter((p) => !p.needs || s.flags[p.needs])
      .map((p) => {
        const owned = s.paints.includes(p.id)
        const btn =
          s.paint === p.id
            ? '<span class="muted">I bruk</span>'
            : owned
              ? `<button class="btn plain" data-paint="${p.id}">Bruk</button>`
              : `<button class="btn" data-paint="${p.id}" ${s.money >= p.price ? '' : 'disabled'}>${kr(p.price)}</button>`
        return `<div class="row"><span style="width:34px;height:22px;background:${p.hull};box-shadow:0 0 0 2px var(--ink), inset 0 -7px 0 ${p.stripe}"></span><div class="info"><b>${p.name}</b></div>${btn}</div>`
      })
      .join('')
    const b = this.ui.sheet('Båtmaling', `${this.placeHead('marit', 'Måken fortjener litt farge.')}${rows}<div class="stack" style="margin-top:12px"><button class="btn plain" data-a="back">Tilbake</button></div>`)
    b.querySelectorAll<HTMLElement>('[data-paint]').forEach(
      (el) =>
        (el.onclick = () => {
          const p = PAINTS.find((x) => x.id === el.dataset.paint)!
          if (!s.paints.includes(p.id)) {
            if (s.money < p.price) return
            s.money -= p.price
            s.paints.push(p.id)
            sfx.coin()
          }
          s.paint = p.id
          this.save()
          this.openShop('paint')
        }),
    )
    b.querySelector<HTMLElement>('[data-a=back]')!.onclick = () => this.openShop()
  }

  private async sell() {
    const s = this.s
    const total = bucketValue(s)
    if (!total) return
    s.money += total
    s.stats.sold += total
    const n = s.bucket.length
    s.bucket = []
    sfx.coin()
    this.progress('sell', { kr: total })
    this.ui.toast(`Solgte ${n} fisk for ${kr(total)}`, 'coin')
    this.save()
    if (!s.flags.sold1) {
      s.flags.sold1 = true
      this.save()
      this.ui.closeSheet()
      await this.ui.talk(FIRST_SALE)
      return
    }
    this.openShop()
  }

  openHalvor() {
    const b = this.ui.sheet(
      'Havnebua',
      `${this.placeHead('halvor', this.chatter('halvor'))}<div class="stack"><button class="btn" data-a="q">${iconImg('scroll')}Oppdrag${this.claimable() ? `<span class="right">${this.claimable()} klar</span>` : ''}</button></div>`,
    )
    b.querySelector<HTMLElement>('[data-a=q]')!.onclick = () => this.openQuests()
  }

  openQuests() {
    const s = this.s
    if (!s.flags.metHalvor) return
    const list = activeQuests(s)
    const rows = list.length
      ? list
          .map((q) => {
            const p = s.quests[q.id] ?? 0
            const t = questTarget(q.goal)
            const done = p >= t
            const reward = q.reward ?? (q.money ? kr(q.money) : '')
            const shown = q.goal.kind === 'sell' ? `${kr(p)} / ${kr(t)}` : q.goal.kind === 'heavy' ? (done ? 'Klart' : 'Ikke ennå') : `${p} / ${t}`
            return `<div class="row"><div class="info"><b>${esc(q.title)}</b><small>Belønning: ${esc(reward)}</small><div class="progress"><i style="width:${Math.min(100, (p / t) * 100)}%"></i></div><small>${shown}</small></div>${done ? `<button class="btn green" data-claim="${q.id}">Hent</button>` : ''}</div>`
          })
          .join('')
      : '<p>Du har klart alle oppdragene mine. Jeg er nesten litt rørt.</p>'
    const b = this.ui.sheet('Oppdrag', `${this.placeHead('halvor', 'Gjør det jeg sier, så skal du få betalt.')}${rows}<p class="muted" style="margin-top:12px">Fullført: ${s.done.length} av ${QUESTS.length}</p>`)
    b.querySelectorAll<HTMLElement>('[data-claim]').forEach(
      (el) =>
        (el.onclick = () => {
          const q = QUESTS.find((x) => x.id === el.dataset.claim)!
          this.claim(q)
          this.ui.toast(`Belønning: ${q.reward ?? kr(q.money ?? 0)}`, 'coin')
          this.openQuests()
        }),
    )
  }

  openSelma() {
    const s = this.s
    const reward = this.bookClaimable()
    const next = BOOK_REWARDS.find((r) => !s.bookClaimed.includes(r.n))
    const b = this.ui.sheet(
      'Havstasjonen',
      `${this.placeHead('selma', this.chatter('selma'))}
      <p>Fiskeboka: <b>${bookCount(s)} av ${BOOK.length}</b> arter.${next && !reward ? ` Ved ${next.n} arter: ${next.text}.` : ''}</p>
      <div class="stack">
        ${reward ? `<button class="btn green" data-a="claim">Hent belønning: ${esc(reward.text)}</button>` : ''}
        <button class="btn" data-a="book">${iconImg('book')}Åpne Fiskeboka</button>
      </div>`,
    )
    b.querySelector<HTMLElement>('[data-a=book]')!.onclick = () => this.openBook()
    const c = b.querySelector<HTMLElement>('[data-a=claim]')
    if (c && reward)
      c.onclick = () => {
        s.bookClaimed.push(reward.n)
        if (reward.money) s.money += reward.money
        if (reward.gift) s.gear[reward.gift[0]] = Math.max(s.gear[reward.gift[0]], reward.gift[1])
        if (reward.flag) s.flags[reward.flag] = true
        sfx.fanfare()
        this.ui.toast(`Du fikk: ${reward.text}`, 'book')
        this.save()
        this.openSelma()
      }
  }

  private imgCache = new Map<string, string>()
  private fishURL(sp: Species, known: boolean) {
    const key = sp.id + known
    if (!this.imgCache.has(key)) {
      const art = artFor(sp)
      const src = art.right[0]
      let c = src
      if (!known) {
        const t = canvas(src.width, src.height)
        t.g.drawImage(src, 0, 0)
        t.g.globalCompositeOperation = 'source-in'
        t.g.fillStyle = '#3a2c3e'
        t.g.fillRect(0, 0, src.width, src.height)
        c = t.c
      }
      this.imgCache.set(key, toURL(c, sp.look.len > 50 ? 2 : sp.look.len > 28 ? 3 : 4))
    }
    return this.imgCache.get(key)!
  }

  openBook(detail?: string) {
    const s = this.s
    if (detail) {
      const sp = SPECIES_BY_ID[detail]
      const rec = s.book[sp.id]
      const z = ZONES[sp.zone]
      const when = sp.time === 'night' ? 'Bare om natta' : sp.time === 'day' ? 'Bare om dagen' : 'Hele døgnet'
      const b = this.ui.sheet(
        rec ? sp.name : '???',
        `<div class="catch"><div class="fishimg"><img class="px" src="${this.fishURL(sp, !!rec)}" alt=""></div></div>
         ${rec ? `<p>${esc(sp.text)}</p><div class="facts"><span><small>Fanget</small>${rec.n}</span><span><small>Største</small>${rec.best} cm</span><span><small>Verdi</small>${kr(sp.value)}</span></div>` : '<p>Ingen har fanget denne ennå.</p>'}
         <p class="muted">${z.name}, ${z.from}–${z.to} m. ${when}.${sp.rare ? ' Sjelden.' : ''}</p>
         <div class="stack"><button class="btn plain" data-a="back">Tilbake</button></div>`,
      )
      b.querySelector<HTMLElement>('[data-a=back]')!.onclick = () => this.openBook()
      return
    }
    const sections = ZONES.map((z, i) => {
      const list = BOOK.filter((sp) => sp.zone === i)
      if (!list.length) return ''
      const reach = gearValue(s, 'line') >= z.from || list.some((sp) => s.book[sp.id])
      return `<p class="cat">${z.name} · ${z.from}–${z.to} m</p><div class="book-grid">${list
        .map((sp) => {
          const rec = s.book[sp.id]
          return `<button class="book-cell" data-sp="${sp.id}"><img class="px" src="${this.fishURL(sp, !!rec)}" alt="">${rec ? esc(sp.name) : reach ? '???' : '<span class="muted">For dypt</span>'}</button>`
        })
        .join('')}</div>`
    }).join('')
    const n = bookCount(s)
    const b = this.ui.sheet('Fiskeboka', `<p>${n} av ${BOOK.length} arter funnet</p><div class="progress"><i style="width:${(n / BOOK.length) * 100}%"></i></div>${sections}`)
    b.querySelectorAll<HTMLElement>('[data-sp]').forEach((el) => (el.onclick = () => this.openBook(el.dataset.sp)))
  }

  private catchCard(sp: Species, c: { cm: number; kg: number; value: number }, isNew: boolean, perfect: boolean, bonus: number, prevBest?: number) {
    const s = this.s
    const room = s.bucket.length < gearValue(s, 'bucket')
    const record = !isNew && prevBest !== undefined && c.cm > prevBest
    const b = this.ui.sheet(
      isNew ? 'Ny art!' : 'Fangst!',
      `<div class="catch">
        <div class="fishimg"><img class="px" src="${this.fishURL(sp, true)}" alt=""></div>
        <h3>${esc(sp.name)}</h3>
        ${isNew ? '<span class="stamp">NY I FISKEBOKA</span> ' : ''}${record ? '<span class="stamp gold">NY REKORD</span> ' : ''}${perfect ? '<span class="stamp gold">PERFEKT</span>' : ''}
        <div class="facts"><span><small>Lengde</small>${c.cm} cm</span><span><small>Vekt</small>${String(c.kg).replace('.', ',')} kg</span><span><small>Verdi</small>${kr(c.value)}</span></div>
        ${isNew ? `<p class="muted">${esc(sp.text)}</p>` : ''}
        ${bonus ? `<p><b>Skattekiste!</b> Du fant ${kr(bonus)}.</p>` : ''}
        ${room ? '' : '<p class="muted">Kassa er full. Selg fangsten hos Marit på Bryggen.</p>'}
      </div>
      <div class="two"><button class="btn plain" data-a="rel">Slipp ut</button><button class="btn green" data-a="keep" ${room ? '' : 'disabled'}>Ha i kassa</button></div>`,
    )
    let decided = false
    const keep = () => {
      if (decided) return
      decided = true
      if (room) s.bucket.push({ id: sp.id, cm: c.cm, kg: c.kg, value: c.value })
      else this.release()
      this.save()
      this.ui.closeSheet()
      if (s.stats.caught === 1) this.ui.toast('Fin fangst! Selg fisken hos Marit i Krambua på Bryggen.', 'house')
    }
    b.querySelector<HTMLElement>('[data-a=keep]')!.onclick = keep
    b.querySelector<HTMLElement>('[data-a=rel]')!.onclick = () => {
      if (decided) return
      decided = true
      this.release()
      this.save()
      this.ui.closeSheet()
    }
    this.ui.onSheetClose = () => {
      if (!decided) keep()
    }
  }

  private release() {
    this.s.stats.released++
    this.progress('release')
    sfx.splash()
  }

  openBucket() {
    const s = this.s
    const rows = s.bucket.length
      ? s.bucket
          .map((c) => {
            const sp = SPECIES_BY_ID[c.id]
            return `<div class="row"><img class="px" src="${this.fishURL(sp, true)}" style="width:56px;object-fit:contain" alt=""><div class="info"><b>${esc(sp.name)}</b><small>${c.cm} cm · ${String(c.kg).replace('.', ',')} kg</small></div><span>${kr(c.value)}</span></div>`
          })
          .join('')
      : '<p class="muted">Kassa er tom. Ut og fisk!</p>'
    const b = this.ui.sheet(
      `Fiskekassa ${s.bucket.length}/${gearValue(s, 'bucket')}`,
      `${rows}${s.bucket.length ? `<p style="margin-top:10px">Til sammen: <b>${kr(bucketValue(s))}</b></p><div class="stack"><button class="btn" data-a="go">${iconImg('house')}Ro inn til Krambua</button></div>` : ''}`,
    )
    const go = b.querySelector<HTMLElement>('[data-a=go]')
    if (go)
      go.onclick = () => {
        this.ui.closeSheet()
        this.go('harbor')
        if (this.view === 'harbor') this.openShop()
      }
  }

  openSettings() {
    const s = this.s
    const b = this.ui.sheet(
      'Innstillinger',
      `<div class="stack">
        <button class="btn plain" data-a="sound">Lyd: ${s.sound ? 'på' : 'av'}</button>
        <button class="btn red" data-a="reset">Start et nytt spill</button>
      </div>
      <p class="muted" style="margin-top:16px">Fisketur. Spillet lagres automatisk på denne telefonen.</p>`,
    )
    b.querySelector<HTMLElement>('[data-a=sound]')!.onclick = () => {
      s.sound = !s.sound
      setSound(s.sound)
      this.save()
      this.openSettings()
    }
    const r = b.querySelector<HTMLElement>('[data-a=reset]')!
    let armed = false
    r.onclick = () => {
      if (!armed) {
        armed = true
        r.textContent = 'Sikker? Alt blir slettet. Trykk igjen.'
        return
      }
      wipe()
      this.s = fresh()
      persist(this.s)
      location.reload()
    }
  }
}

// debug helpers for testing in the browser console
const game = new Game()
if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game
;(window as unknown as { game: Game }).game = game
void zoneAt
void depthToY

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(() => {})
watchForUpdates()
