import '@fontsource/jersey-10/index.css'
import './style.css'

import { canvas, mix, toURL } from './art/pixel'
import { ambientAt, skyAt } from './art/fjord'
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
  WORLDS,
  questTarget,
  zoneAt,
  depthToY,
  type Quest,
  type Species,
  type WorldId,
} from './game/data'
import { Harbor, type SpotId } from './game/harbor'
import { artFor, Sea, type SeaHost } from './game/sea'
import { activeQuests, bookCount, bucketValue, fresh, gearValue, load, needsMet, persist, questsOpen, switchWorld, wipe, type Save } from './game/state'
import {
  AFTER_AK_ENDING,
  AFTER_HI_ENDING,
  BACK_TO_HAWAII,
  BUOY_HEARD,
  FLY_HOME_HI,
  HI_CALF,
  HI_ENDING,
  HI_FIRST_SALE,
  HI_INVITE,
  HI_POND,
  HI_POND_FULL,
  HI_SELMA_PLAN,
  HI_TRAVEL,
  HI_WALL,
  MEET_KIMO,
  MEET_LEILANI,
  AFTER_ENDING,
  AK_CREEK,
  AK_DAM,
  AK_ENDING,
  AK_FIRST_SALE,
  AK_KING,
  AK_LETTER,
  AK_LETTER_KNUT,
  AK_LETTER_MARIT,
  AK_SELMA_ARRIVES,
  AK_TRAVEL,
  BACK_HOME,
  BACK_TO_ALASKA,
  CAT,
  CHATTER,
  ENDING,
  FIRST_SALE,
  FLY_HOME,
  GAMLE,
  HYDRO_HEARD,
  INTRO,
  LETTERS,
  LETTER_FOUND,
  MEET_ASTRID,
  MEET_EDVARD,
  MEET_HALVOR,
  MEET_MARIT,
  MEET_RAY,
  MEET_SELMA,
  type Line,
} from './game/story'
import { HYDRO_DEPTHS } from './game/alaska'
import { BUOY_DEPTHS, POND_FISH, POND_NEED } from './game/hawaii'
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

  /** True while you live in Petersburg */
  get ak() {
    return this.s.world === 'alaska'
  }

  get hi() {
    return this.s.world === 'hawaii'
  }

  /** What the places are called where you are */
  private placeName(id: SpotId) {
    const f = this.s.flags
    if (this.hi) return { krambua: 'Fiskeboden', havnebua: 'Havna', stasjon: 'Hvalstasjonen', fyret: 'Øyflyet', baten: 'Koholā' }[id]
    if (this.ak) return { krambua: 'Bakke Fisk', havnebua: 'Havnekontoret', stasjon: f.ak_selma ? 'Selmas hytte' : 'Tom hytte', fyret: 'Sjøflyet', baten: 'Ternen' }[id]
    return { krambua: 'Krambua', havnebua: 'Havnebua', stasjon: f.selma ? 'Havstasjonen' : 'Tomt hus', fyret: 'Fyret', baten: 'Måken' }[id]
  }

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
      <span class="chip money">${iconImg('coin')}${kr(s.money)}</span>
      <button class="chip" data-hud="bucket">${iconImg('bucket')}${s.bucket.length}/${gearValue(s, 'bucket')}</button>
      <span class="grow"></span>
      ${depth >= 0 ? `<span class="chip depth">${depth} m<small>/ ${gearValue(s, 'line')}</small></span>` : ''}
      <span class="chip">${iconImg(wet ? 'rain' : night ? 'moon' : 'sun')}${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}</span>
      <button class="chip icon-only" data-hud="settings" aria-label="Innstillinger">${iconImg('wheel')}</button>`
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
          ? s.stats.caught < 5
            ? 'Vent på napp. Trykk for å hale inn, hold for å gå dypere.'
            : ''
          : mode === 'bite'
            ? 'Trykk på skjermen!'
          : mode === 'idle' && s.stats.caught < 3
            ? 'Hold fingeren på skjermen for å slippe ut snøre'
            : mode === 'sink' && s.stats.caught < 3
              ? 'Slipp når du er på riktig dybde'
              : ''
    const navKey = `${this.view}|${this.badges().join(',')}|${questsOpen(s)}|${this.claimable()}|${s.world}`
    const actKey = `${sea}|${mode}|${hintText}`
    if (act.dataset.key !== actKey) {
      act.dataset.key = actKey
      // once the line is out, the screen itself is the control: no button, no tabs
      document.body.classList.toggle('fishing', sea && mode !== 'idle')
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
      <button data-tab="sea" class="${this.view === 'sea' ? 'on' : ''}"><img class="px" src="${icon('sea', 36)}" alt="">Sjøen</button>
      <button data-tab="harbor" class="${this.view === 'harbor' ? 'on' : ''}"><img class="px" src="${icon('house', 36)}" alt="">${this.ak || this.hi ? 'Kaia' : 'Bryggen'}${harborBadge ? '<span class="badge">!</span>' : ''}</button>
      <button data-tab="book"><img class="px" src="${icon('book', 36)}" alt="">Fiskebok</button>
      <button data-tab="quests" ${questsOpen(s) ? '' : 'disabled'}><img class="px" src="${icon(questsOpen(s) ? 'scroll' : 'lock', 36)}" alt="">Oppdrag${claim ? `<span class="badge">${claim}</span>` : ''}</button>`
  }

  private renderLabels() {
    const el = $('#labels')
    if (this.view !== 'harbor' || !this.started) {
      if (el.innerHTML) el.innerHTML = ''
      this.labelKey = ''
      return
    }
    this.lightLabels(el)
    const badges = this.badges()
    const key = `${this.W}|${badges.join(',')}|${!!this.s.flags.selma}|${!!this.s.flags.ak_selma}|${this.harbor.spots.length}|${this.s.world}`
    if (key === this.labelKey) return
    this.labelKey = key
    el.innerHTML = this.harbor.spots
      .map((p) => {
        const x = Math.max(56, Math.min(innerWidth - 50, (p.x + p.w / 2) * this.px))
        const below = p.id === 'baten'
        const y = (below ? p.y + p.h : p.y) * this.px
        return `<span class="label${below ? ' below' : ''}" style="left:${x}px;top:${y}px">${this.placeName(p.id)}${badges.includes(p.id) ? '<span class="badge">!</span>' : ''}</span>`
      })
      .join('')
  }

  private labelLight = ''
  /** The signs take the same light as the houses, so they sit in the scene instead of on top of it */
  private lightLabels(el: HTMLElement) {
    const s = this.s
    const wx = weatherAt(s.day, s.time)
    const key = `${Math.round(s.time * 400)}|${Math.round(wx.rain * 10)}|${Math.round(wx.fog * 10)}`
    if (key === this.labelLight) return
    this.labelLight = key
    const [amb, a] = ambientAt(s.time)
    const hor = skyAt(s.time, wx)[1]
    const night = nightness(s.time)
    const lit = (c: string) => {
      let out = mix(c, amb, a)
      out = mix(out, '#2a3048', wx.rain * 0.3)
      // fog and distance wash the colours towards the horizon
      return mix(out, hor, 0.12 + wx.fog * 0.35)
    }
    const v = (name: string, c: string) => el.style.setProperty(name, c)
    v('--sign', lit('#7a5232'))
    v('--sign-hi', lit('#b07c4e'))
    v('--sign-lo', lit('#5a3a22'))
    v('--sign-grain', lit('#3e2a1e'))
    v('--sign-ink', lit('#2a1d2e'))
    v('--sign-text', mix(lit('#fff8e8'), lit('#c8b8a0'), night * 0.6))
  }

  /** Places with something new waiting */
  badges(): SpotId[] {
    const f = this.s.flags
    const out: SpotId[] = []
    if (this.hi) {
      if (!f.hi_metLeilani || (this.s.bucket.length && !f.hi_sold1) || (f.hi_askPond && !f.hi_pondTold) || (f.hi_wall && this.s.pond >= POND_NEED && !f.hi_pondFull) || (f.hi_calf && !f.hi_ending)) out.push('krambua')
      if (f.hi_sold1 && !f.hi_metKimo) out.push('havnebua')
      if (!f.hi_metSelma || this.bookClaimable() || this.s.buoys.placed > this.s.buoys.heard) out.push('stasjon')
      return out
    }
    if (this.ak) {
      if (f.ak_ending && !f.hi_invite) out.push('stasjon')
      if (!f.ak_metAstrid || (this.s.bucket.length && !f.ak_sold1) || (f.ak_askCreek && !f.ak_confessed) || (f.ak_king && !f.ak_ending)) out.push('krambua')
      if (f.ak_sold1 && !f.ak_metRay) out.push('havnebua')
      if (f.ak_selma && (!f.ak_metSelma || this.bookClaimable() || this.s.hydro.placed > this.s.hydro.heard)) out.push('stasjon')
      return out
    }
    if (f.ending && !f.akLetter) out.push('krambua')
    if (f.akLetter && !f.akRead) out.push('fyret')
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
    return BOOK_REWARDS.find((r) => n >= r.n && !this.s.bookClaimed.includes(this.rewardKey(r.n)))
  }

  /** Book rewards are remembered by count; Alaska's are kept apart from home's */
  private rewardKey(n: number) {
    return this.ak ? 1000 + n : this.hi ? 2000 + n : n
  }

  // ---------- events from the sea ----------

  caught(sp: Species, cm: number, kg: number, perfect: boolean, chest: boolean) {
    const s = this.s
    if (sp.id === 'kongen') return this.kingCaught()
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

  /** The king salmon is never kept: you let him swim home */
  private async kingCaught() {
    const s = this.s
    sfx.fanfare()
    s.book.kongen = { n: 1, best: 140 }
    s.flags.ak_king = true
    s.stats.released++
    this.save()
    await this.ui.talk(AK_KING)
    this.ui.toast('Gå til Astrid på kaia.', 'house')
  }

  hydroPlaced() {
    sfx.chest()
    this.save()
    this.ui.toast('Hydrofonen sitter! Gå til Selma og lytt.', 'sea')
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
    if (q.unlock === 'reel3' || q.unlock === 'gift:reel:3') s.gear.reel = 3
    else if (q.unlock === 'goldpaint' || q.unlock === 'ak_goldpaint') {
      s.flags[q.unlock] = true
      const id = q.unlock === 'goldpaint' ? 'gull' : 'ak_gull'
      if (!s.paints.includes(id)) s.paints.push(id)
    } else if (q.unlock) s.flags[q.unlock] = true
    sfx.coin()
    this.save()
  }

  // ---------- story ----------

  checkStory() {
    const s = this.s
    if (this.ak) {
      if (!s.flags.ak_selma && bookCount(s) >= 5) {
        s.flags.ak_selma = true
        this.ui.toast('Selma har landet med sjøflyet!', 'house')
      }
      return
    }
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
    if (this.ak) return this.openSpotAk(id)
    if (this.hi) return this.openSpotHi(id)
    if (id === 'baten') return this.go('sea')
    if (id === 'krambua') {
      if (f.ending && !f.akLetter) {
        await this.ui.talk(AK_LETTER_MARIT)
        f.akLetter = true
        this.save()
        this.ui.toast('Ta brevet med til bestefar i fyret.', 'letter')
        return
      }
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
      if (f.ak_selma) return this.openSelma(true)
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
    if (f.akLetter && !f.akRead) {
      await this.ui.talk([{ who: 'edvard', text: 'Et brev fra Amerika? Til meg? Les det høyt, vennen.' }])
      this.showLetter(AK_LETTER, async () => {
        await this.ui.talk(AK_LETTER_KNUT)
        f.akRead = true
        this.save()
        this.openTravel()
      }, 'Fra Petersburg')
      return
    }
    if (f.akRead) {
      // home on a visit from Alaska
      if (f.ak_moved && !f.welcomedHome) {
        f.welcomedHome = true
        this.save()
        await this.ui.talk(BACK_HOME)
      }
      return this.openTravel()
    }
    return this.knutChat()
  }

  private async knutChat() {
    const s = this.s
    const f = s.flags
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

  // ---------- Alaska ----------

  private async openSpotAk(id: SpotId) {
    const s = this.s
    const f = s.flags
    if (id === 'baten') return this.go('sea')
    if (id === 'krambua') {
      if (!f.ak_metAstrid) {
        await this.ui.talk(MEET_ASTRID)
        f.ak_metAstrid = true
        this.save()
        return
      }
      if (f.ak_askCreek && !f.ak_confessed) {
        await this.ui.talk(AK_CREEK)
        f.ak_confessed = true
        this.save()
      }
      if (f.ak_king && !f.ak_ending) {
        await this.ui.talk(AK_ENDING)
        f.ak_ending = true
        sfx.fanfare()
        this.save()
        return
      }
      return this.openShop()
    }
    if (id === 'havnebua') {
      if (!f.ak_sold1) return this.ui.talk([{ who: 'ray', text: 'Hei, hei! Selg litt fisk til Astrid først, så har jeg en liste til deg.' }])
      if (!f.ak_metRay) {
        await this.ui.talk(MEET_RAY)
        f.ak_metRay = true
        this.save()
      }
      return this.openHalvor()
    }
    if (id === 'stasjon') {
      if (!f.ak_selma) return this.ui.talk([{ who: null, text: 'Hytta er grønn og tom. På døra henger en lapp: «Til leie. Bjørner må banke på.»' }])
      if (f.ak_ending && !f.hi_invite) {
        await this.ui.talk(HI_INVITE)
        f.hi_invite = true
        this.save()
        return
      }
      if (!f.ak_metSelma) {
        await this.ui.talk(AK_SELMA_ARRIVES)
        f.ak_metSelma = true
        f.ak_hydro = true
        s.gear.lamp = Math.max(s.gear.lamp, 1)
        if (!s.bookClaimed.includes(1005)) s.bookClaimed.push(1005)
        this.ui.toast('Du fikk en pannelampe og fire hydrofoner!', 'gear')
        this.save()
      }
      const h = s.hydro
      if (h.placed > h.heard) {
        const i = h.heard
        sfx.creak()
        await this.ui.talk(HYDRO_HEARD[i])
        h.heard = i + 1
        if (i === 1) f.ak_askCreek = true
        if (i === 2) {
          s.gear.line = Math.max(s.gear.line, 5)
          this.ui.toast('Du fikk Arnes snøre. Det rekker ned i Juvet!', 'gear')
        }
        if (i === 3) {
          f.ak_finale = true
          sfx.fanfare()
        }
        this.save()
        return
      }
      return this.openSelma()
    }
    if (id === 'fyret') return this.openTravel()
  }

  /** Where you can go from here: the lighthouse at home, the floatplane in Petersburg, the island plane in Hilo */
  private destinations(): WorldId[] {
    const f = this.s.flags
    const all: WorldId[] = []
    if (f.akRead) all.push('alaska')
    if (f.ak_moved) all.push('norge')
    if (f.hi_invite) all.push('hawaii')
    return all.filter((w) => w !== this.s.world)
  }

  private openTravel() {
    const s = this.s
    const f = s.flags
    const here = s.world
    const head =
      here === 'norge'
        ? this.placeHead('edvard', f.ak_moved ? 'Skal du ut og reise igjen? Hils dem fra meg.' : 'Astrid trenger deg mer enn jeg gjør nå. Fyret passer jeg på.')
        : here === 'alaska'
          ? '<p>Et lite gult sjøfly vugger ved flytebrygga. Piloten drikker kaffe hos Astrid og tar med post, folk og katter.</p>'
          : '<p>Det lille øyflyet står klart på kaia. Herfra går det fly til Honolulu, og videre ut i verden.</p>'
    const why: Record<WorldId, string> = {
      alaska: f.ak_moved
        ? 'Astrid og Ray venter i Petersburg. Ternen og utstyret ditt ligger der du forlot dem.'
        : 'Du tar med deg Pus, ryggsekken og Fiskeboka. Måken, utstyret og kronene dine blir igjen hos bestefar til du kommer hjem på besøk.',
      norge: 'Hjem til Skjærvik, der Måken, utstyret og kronene dine venter hos bestefar.',
      hawaii: f.hi_moved
        ? 'Leilani, Kimo og Tūtū venter i Hilo, og Koholā ligger ved kaia.'
        : 'Ternen og Alaska-utstyret blir hos Astrid til våren. Dollarene dine kan du ta med, de gjelder i Hawaii også.',
    }
    const label: Record<WorldId, string> = { alaska: 'Reis til Alaska', norge: 'Reis hjem til Skjærvik', hawaii: 'Fly til Hawaii' }
    const list = this.destinations()
    const b = this.ui.sheet(
      this.placeName('fyret'),
      `${head}
      ${list.map((w) => `<p>${esc(why[w])}</p>`).join('')}
      <div class="stack">
        ${list.map((w) => `<button class="btn green" data-go="${w}">${iconImg('sea')}${label[w]}</button>`).join('')}
        ${here === 'norge' ? '<button class="btn plain" data-a="talk">Snakk med bestefar</button>' : ''}
      </div>`,
    )
    b.querySelectorAll<HTMLElement>('[data-go]').forEach((el) => (el.onclick = () => this.travel(el.dataset.go as WorldId)))
    const t = b.querySelector<HTMLElement>('[data-a=talk]')
    if (t)
      t.onclick = () => {
        this.ui.closeSheet()
        this.knutChat()
      }
  }

  private async travel(to: WorldId) {
    const s = this.s
    const f = s.flags
    if (s.world === to) return
    if (['reel', 'land', 'bite', 'snag'].includes(this.sea.mode)) return
    this.ui.closeSheet()
    this.sea.reset()
    const from = s.world
    const firstAk = to === 'alaska' && !f.ak_moved
    const firstHi = to === 'hawaii' && !f.hi_moved
    await this.fade(async () => {
      switchWorld(s, to)
      if (to === 'alaska') f.ak_moved = true
      if (to === 'hawaii') f.hi_moved = true
      this.view = 'harbor'
      this.sea.newWorld()
      this.navKey = ''
      this.labelKey = ''
      this.hudKey = ''
      this.save()
    })
    if (to === 'alaska') await this.ui.talk(firstAk ? AK_TRAVEL : BACK_TO_ALASKA)
    else if (to === 'hawaii') await this.ui.talk(firstHi ? HI_TRAVEL : BACK_TO_HAWAII)
    else {
      await this.ui.talk(from === 'hawaii' ? FLY_HOME_HI : FLY_HOME)
      f.welcomedHome = false
    }
    if (to === 'alaska' && !f.ak_metAstrid) await this.openSpotAk('krambua')
    else if (to === 'hawaii' && !f.hi_metLeilani) await this.openSpotHi('krambua')
    else if (to === 'norge') this.ui.toast('Bestefar venter i fyret.', 'house')
  }

  // ---------- Hawaii ----------

  private async openSpotHi(id: SpotId) {
    const s = this.s
    const f = s.flags
    if (id === 'baten') return this.go('sea')
    if (id === 'fyret') return this.openTravel()
    if (id === 'krambua') {
      if (!f.hi_metLeilani) {
        await this.ui.talk(MEET_LEILANI)
        f.hi_metLeilani = true
        this.save()
        return
      }
      if (f.hi_askPond && !f.hi_pondTold) {
        await this.ui.talk(HI_POND)
        f.hi_pondTold = true
        this.save()
      }
      if (f.hi_wall && s.pond >= POND_NEED && !f.hi_pondFull) {
        await this.ui.talk(HI_POND_FULL)
        f.hi_pondFull = true
        s.gear.line = Math.max(s.gear.line, 5)
        sfx.fanfare()
        this.ui.toast('Du fikk Tūtūs snøre. Det rekker helt ned i Lavadypet!', 'gear')
        this.save()
        return
      }
      if (f.hi_calf && !f.hi_ending) {
        await this.ui.talk(HI_ENDING)
        f.hi_ending = true
        sfx.fanfare()
        this.save()
        return
      }
      return this.openShop()
    }
    if (id === 'havnebua') {
      if (!f.hi_sold1) return this.ui.talk([{ who: 'kimo', text: 'Aloha! Selg en fisk til Leilani først, så skal du få lista mi. Den er lang.' }])
      if (!f.hi_metKimo) {
        await this.ui.talk(MEET_KIMO)
        f.hi_metKimo = true
        this.save()
      }
      return this.openHalvor()
    }
    if (id === 'stasjon') {
      if (!f.hi_metSelma) {
        await this.ui.talk(HI_SELMA_PLAN)
        f.hi_metSelma = true
        f.hi_buoys = true
        s.gear.lamp = Math.max(s.gear.lamp, 1)
        if (!s.bookClaimed.includes(2005)) s.bookClaimed.push(2005)
        this.ui.toast('Du fikk en pannelampe og tre sangbøyer!', 'gear')
        this.save()
        return
      }
      const b = s.buoys
      if (b.placed > b.heard) {
        const i = b.heard
        sfx.creak()
        await this.ui.talk(BUOY_HEARD[i])
        b.heard = i + 1
        if (i === 0) f.hi_askPond = true
        if (i === 2) {
          f.hi_finale = true
          sfx.fanfare()
        }
        this.save()
        return
      }
      return this.openSelma()
    }
  }

  calfVisit() {
    this.s.flags.hi_calf = true
    this.save()
    sfx.fanfare()
    this.ui.talk(HI_CALF)
  }

  /** A young fish let go into Tūtū's pond instead of the fish box */
  private toPond() {
    const s = this.s
    s.pond++
    this.release()
    this.ui.toast(s.pond >= POND_NEED ? 'Dammen har fått fire fisk! Gå til Leilani.' : `Fisken svømmer inn i dammen (${s.pond}/${POND_NEED})`, 'sea')
  }

  /** A short fade to black around `mid`, for travelling */
  private async fade(mid: () => Promise<void> | void) {
    const el = document.createElement('div')
    el.className = 'fade'
    $('#app').appendChild(el)
    await new Promise((r) => setTimeout(r, 30))
    el.classList.add('on')
    await new Promise((r) => setTimeout(r, 650))
    await mid()
    await new Promise((r) => setTimeout(r, 250))
    el.classList.remove('on')
    setTimeout(() => el.remove(), 700)
  }

  private showLetter(text: string, then: () => void, title = 'Til Den gamle') {
    const b = this.ui.sheet(title, `<div class="letter">${esc(text)}</div><div class="stack" style="margin-top:14px"><button class="btn" data-a="ok">Brett sammen brevet</button></div>`, then)
    b.querySelector<HTMLElement>('[data-a=ok]')!.onclick = () => this.ui.closeSheet()
  }

  // ---------- panels ----------

  private placeHead(who: string, line: string) {
    return `<div class="who"><img class="px" src="${face(who)}" alt=""><p>${esc(line)}</p></div>`
  }

  private chatter(who: 'marit' | 'halvor' | 'selma' | 'astrid' | 'ray' | 'selmaAk' | 'leilani' | 'kimo' | 'selmaHi') {
    const pool = CHATTER[who]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  openShop(tab: 'main' | 'gear' | 'paint' = 'main') {
    const s = this.s
    const who = this.ak ? 'astrid' : this.hi ? 'leilani' : 'marit'
    const after = this.ak && s.flags.ak_ending ? AFTER_AK_ENDING : this.hi && s.flags.hi_ending ? AFTER_HI_ENDING : null
    const ending = after ? after[Math.floor(Math.random() * after.length)] : null
    const wall = this.hi && s.flags.hi_pondTold && !s.flags.hi_wall
    const greet = s.bucket.length ? `Det ser ut som du har ${s.bucket.length} fisk til meg!` : (ending ?? this.chatter(who))
    const dam = this.ak && s.flags.ak_confessed && !s.flags.ak_dam
    if (tab === 'main') {
      const b = this.ui.sheet(
        this.placeName('krambua'),
        `${this.placeHead(who, greet)}<div class="stack">
          ${dam ? `<button class="btn green" data-a="dam" ${s.money >= 1500 ? '' : 'disabled'}>${iconImg('sea')}Riv demningen<span class="right">${kr(1500)}</span></button>` : ''}
          ${wall ? `<button class="btn green" data-a="wall" ${s.money >= 1500 ? '' : 'disabled'}>${iconImg('house')}Bygg opp muren<span class="right">${kr(1500)}</span></button>` : ''}
          <button class="btn green" data-a="sell" ${s.bucket.length ? '' : 'disabled'}>${iconImg('coin')}Selg fangsten<span class="right">${kr(bucketValue(s))}</span></button>
          <button class="btn" data-a="gear">${iconImg('gear')}Utstyr</button>
          <button class="btn plain" data-a="paint">${iconImg('sea')}Båtmaling</button>
        </div>`,
      )
      b.querySelector<HTMLElement>('[data-a=sell]')!.onclick = () => this.sell()
      b.querySelector<HTMLElement>('[data-a=gear]')!.onclick = () => this.openShop('gear')
      b.querySelector<HTMLElement>('[data-a=paint]')!.onclick = () => this.openShop('paint')
      const wl = b.querySelector<HTMLElement>('[data-a=wall]')
      if (wl)
        wl.onclick = async () => {
          if (s.money < 1500) return
          s.money -= 1500
          s.flags.hi_wall = true
          this.ui.closeSheet()
          sfx.fanfare()
          this.save()
          await this.ui.talk(HI_WALL)
        }
      const d = b.querySelector<HTMLElement>('[data-a=dam]')
      if (d)
        d.onclick = async () => {
          if (s.money < 1500) return
          s.money -= 1500
          s.flags.ak_dam = true
          this.ui.closeSheet()
          sfx.fanfare()
          this.save()
          await this.ui.talk(AK_DAM)
        }
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
            sub = `Neste: ${
              this.hi
                ? k === 'lamp'
                  ? cur === 0
                    ? 'Kanskje Selma har en lykt på hvalstasjonen?'
                    : 'Selma bygger noe med et glass fra vulkanstasjonen.'
                  : k === 'line'
                    ? 'Tūtū har et snøre hun har tatt vare på i førti år.'
                    : 'Leilani har en snelle hun ikke snakker om.'
                : this.ak
                ? k === 'lamp'
                  ? cur === 0
                    ? 'Kanskje Selma har med seg en lykt?'
                    : 'Selma bygger på noe.'
                  : k === 'line'
                    ? 'Astrid har noe hun ikke har vist deg ennå.'
                    : 'Ray har en snelle han er veldig stolt av.'
                : k === 'lamp'
                  ? cur === 0
                    ? 'Kanskje noen på Havstasjonen har en lykt?'
                    : 'Selma har noe spesielt.'
                  : k === 'line'
                    ? 'Bestefar har det siste snøret.'
                    : 'Halvor har en snelle han aldri låner bort.'
            }`
          } else if (!needsMet(s, next.needs)) {
            sub = `Neste: ${next.name}. ${next.needsText}.`
          } else {
            sub = `Neste: ${next.name}. ${next.text}`
            right = `<button class="btn" data-buy="${k}" ${s.money >= next.price ? '' : 'disabled'}>${kr(next.price)}</button>`
          }
        }
        return `<div class="row"><div class="info"><b>${GEAR[k].title}: ${now.name}${pips}</b><small>${esc(sub)}</small></div>${right}</div>`
      }).join('')
      const b = this.ui.sheet('Utstyr', `${this.placeHead(who, this.ak ? 'Alt her var Arnes en gang. Nå er det ditt, hvis du betaler.' : this.hi ? 'Revutstyr, havutstyr og litt av hvert. Bestefaren min solgte det samme fra den samme disken.' : 'Alt du trenger for å komme dypere. Og kaffen er gratis.')}${rows}<div class="stack" style="margin-top:12px"><button class="btn plain" data-a="back">Tilbake</button></div>`)
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
    const b = this.ui.sheet('Båtmaling', `${this.placeHead(who, `${WORLDS[s.world].boat} fortjener litt farge.`)}${rows}<div class="stack" style="margin-top:12px"><button class="btn plain" data-a="back">Tilbake</button></div>`)
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
    const first = this.ak ? 'ak_sold1' : this.hi ? 'hi_sold1' : 'sold1'
    if (!s.flags[first]) {
      s.flags[first] = true
      this.save()
      this.ui.closeSheet()
      await this.ui.talk(this.ak ? AK_FIRST_SALE : this.hi ? HI_FIRST_SALE : FIRST_SALE)
      return
    }
    this.openShop()
  }

  openHalvor() {
    const who = this.ak ? 'ray' : this.hi ? 'kimo' : 'halvor'
    const b = this.ui.sheet(
      this.placeName('havnebua'),
      `${this.placeHead(who, this.chatter(who))}<div class="stack"><button class="btn" data-a="q">${iconImg('scroll')}Oppdrag${this.claimable() ? `<span class="right">${this.claimable()} klar</span>` : ''}</button></div>`,
    )
    b.querySelector<HTMLElement>('[data-a=q]')!.onclick = () => this.openQuests()
  }

  openQuests() {
    const s = this.s
    if (!questsOpen(s)) return
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
      : `<p>${this.ak ? 'Du har klart hele lista! Uff da, nå må jeg lage en ny.' : this.hi ? 'Hele lista! Jeg skal skrive en sang om det.' : 'Du har klart alle oppdragene mine. Jeg er nesten litt rørt.'}</p>`
    const b = this.ui.sheet('Oppdrag', `${this.ak ? this.placeHead('ray', 'Gjør det som står på lista, så betaler havna.') : this.hi ? this.placeHead('kimo', 'Lista er lang, men livet er langt.') : this.placeHead('halvor', 'Gjør det jeg sier, så skal du få betalt.')}${rows}<p class="muted" style="margin-top:12px">Fullført: ${s.done.length} av ${QUESTS.length}</p>`)
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

  /** `away`: Selma has gone to Alaska and left her rewards in a box by the door */
  openSelma(away = false) {
    const s = this.s
    const reward = this.bookClaimable()
    const next = BOOK_REWARDS.find((r) => !s.bookClaimed.includes(this.rewardKey(r.n)))
    const h = s.hydro
    const bu = s.buoys
    const buoy =
      this.hi && s.flags.hi_buoys
        ? bu.placed >= BUOY_DEPTHS.length
          ? '<p>Alle tre sangbøyene ligger ute og lytter.</p>'
          : bu.placed > bu.heard
            ? '<p>Sangbøya er ute. Lytt til den sammen med Selma.</p>'
            : bu.placed === 1 && !s.flags.hi_pondFull
              ? '<p class="muted">Neste bøye må vente. Hjelp Leilani og Tūtū med fiskedammen først.</p>'
              : `<p>Neste sangbøye: <b>${BUOY_DEPTHS[bu.placed]} m</b>, og bare om natta.${gearValue(s, 'line') < BUOY_DEPTHS[bu.placed] ? ' Snøret ditt rekker ikke så langt ennå.' : ''}</p>`
        : ''
    const hydro =
      this.ak && s.flags.ak_hydro
        ? h.placed >= 4
          ? '<p>Alle fire hydrofonene ligger ute og lytter.</p>'
          : h.placed > h.heard
            ? '<p>Hydrofonen er ute. Lytt til den sammen med Selma.</p>'
            : h.placed === 2 && !s.flags.ak_dam
              ? '<p class="muted">Neste hydrofon må vente til elva er fri.</p>'
              : `<p>Neste hydrofon: <b>${HYDRO_DEPTHS[h.placed]} m</b>. Ta den med på kroken og hold den stille der.${gearValue(s, 'line') < HYDRO_DEPTHS[h.placed] ? ' Snøret ditt rekker ikke så langt ennå.' : ''}</p>`
        : ''
    const head = away
      ? '<p>Havstasjonen er låst. På døra henger en lapp: «I Alaska. Mat fiskene. Belønningene ligger i kassa. Hilsen Selma.»</p>'
      : this.placeHead('selma', this.chatter(this.ak ? 'selmaAk' : this.hi ? 'selmaHi' : 'selma'))
    const b = this.ui.sheet(
      away ? 'Havstasjonen' : this.placeName('stasjon'),
      `${head}${hydro}${buoy}
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
        s.bookClaimed.push(this.rewardKey(reward.n))
        if (reward.money) s.money += reward.money
        if (reward.gift) s.gear[reward.gift[0]] = Math.max(s.gear[reward.gift[0]], reward.gift[1])
        if (reward.flag) s.flags[reward.flag] = true
        sfx.fanfare()
        this.ui.toast(`Du fikk: ${reward.text}`, 'book')
        this.save()
        this.openSelma(away)
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

  openBook(detail?: string, w: WorldId = this.s.world) {
    const s = this.s
    const zones = WORLDS[w].zones
    if (detail) {
      const sp = SPECIES_BY_ID[detail]
      const rec = s.book[sp.id]
      const z = zones[sp.zone]
      const when = sp.time === 'night' ? 'Bare om natta' : sp.time === 'day' ? 'Bare om dagen' : 'Hele døgnet'
      const b = this.ui.sheet(
        rec ? sp.name : '???',
        `<div class="catch"><div class="fishimg"><img class="px" src="${this.fishURL(sp, !!rec)}" alt=""></div></div>
         ${rec ? `<p>${esc(sp.text)}</p><div class="facts"><span><small>Fanget</small>${rec.n}</span><span><small>Største</small>${rec.best} cm</span><span><small>Verdi</small>${kr(sp.value)}</span></div>` : '<p>Ingen har fanget denne ennå.</p>'}
         <p class="muted">${z.name}, ${z.from}–${z.to} m. ${when}.${sp.rare ? ' Sjelden.' : ''}</p>
         <div class="stack"><button class="btn plain" data-a="back">Tilbake</button></div>`,
      )
      b.querySelector<HTMLElement>('[data-a=back]')!.onclick = () => this.openBook(undefined, w)
      return
    }
    const book = WORLDS[w].species.filter((sp) => !sp.special)
    const here = w === s.world
    const sections = zones.map((z, i) => {
      const list = book.filter((sp) => sp.zone === i)
      if (!list.length) return ''
      const reach = (here && gearValue(s, 'line') >= z.from) || list.some((sp) => s.book[sp.id])
      return `<p class="cat">${z.name} · ${z.from}–${z.to} m</p><div class="book-grid">${list
        .map((sp) => {
          const rec = s.book[sp.id]
          return `<button class="book-cell" data-sp="${sp.id}"><img class="px" src="${this.fishURL(sp, !!rec)}" alt="">${rec ? esc(sp.name) : reach ? '???' : '<span class="muted">For dypt</span>'}</button>`
        })
        .join('')}</div>`
    }).join('')
    const n = book.filter((sp) => s.book[sp.id]).length
    // once you have lived in both places, the book has a chapter for each
    const tabs = s.flags.ak_moved
      ? `<div class="tabs3">${(['norge', 'alaska', 'hawaii'] as WorldId[])
          .filter((id) => id !== 'hawaii' || s.flags.hi_moved)
          .map((id) => `<button class="btn ${id === w ? '' : 'plain'}" data-w="${id}">${WORLDS[id].place}</button>`)
          .join('')}</div>`
      : ''
    const b = this.ui.sheet('Fiskeboka', `${tabs}<p>${WORLDS[w].place}: ${n} av ${book.length} arter funnet</p><div class="progress"><i style="width:${(n / book.length) * 100}%"></i></div>${sections}`)
    b.querySelectorAll<HTMLElement>('[data-sp]').forEach((el) => (el.onclick = () => this.openBook(el.dataset.sp, w)))
    b.querySelectorAll<HTMLElement>('[data-w]').forEach((el) => (el.onclick = () => this.openBook(undefined, el.dataset.w as WorldId)))
  }

  private catchCard(sp: Species, c: { cm: number; kg: number; value: number }, isNew: boolean, perfect: boolean, bonus: number, prevBest?: number) {
    const s = this.s
    const room = s.bucket.length < gearValue(s, 'bucket')
    const record = !isNew && prevBest !== undefined && c.cm > prevBest
    const pond = this.hi && s.flags.hi_wall && s.pond < POND_NEED && POND_FISH.includes(sp.id)
    const b = this.ui.sheet(
      isNew ? 'Ny art!' : 'Fangst!',
      `<div class="catch">
        <div class="fishimg"><img class="px" src="${this.fishURL(sp, true)}" alt=""></div>
        <h3>${esc(sp.name)}</h3>
        ${isNew ? '<span class="stamp">NY I FISKEBOKA</span> ' : ''}${record ? '<span class="stamp gold">NY REKORD</span> ' : ''}${perfect ? '<span class="stamp gold">PERFEKT</span>' : ''}
        <div class="facts"><span><small>Lengde</small>${c.cm} cm</span><span><small>Vekt</small>${String(c.kg).replace('.', ',')} kg</span><span><small>Verdi</small>${kr(c.value)}</span></div>
        ${isNew ? `<p class="muted">${esc(sp.text)}</p>` : ''}
        ${bonus ? `<p><b>Skattekiste!</b> Du fant ${kr(bonus)}.</p>` : ''}
        ${room ? '' : `<p class="muted">Kassa er full. Selg fangsten hos ${this.ak ? 'Astrid på kaia' : 'Marit på Bryggen'}.</p>`}
      </div>
      <div class="two"><button class="btn plain" data-a="rel">Slipp ut</button><button class="btn green" data-a="keep" ${room ? '' : 'disabled'}>Ha i kassa</button></div>
      ${pond ? `<div class="stack" style="margin-top:8px"><button class="btn" data-a="pond">${iconImg('sea')}Slipp den i Tūtūs dam (${s.pond}/${POND_NEED})</button></div>` : ''}`,
    )
    const pb = b.querySelector<HTMLElement>('[data-a=pond]')
    if (pb)
      pb.onclick = () => {
        if (decided) return
        decided = true
        this.toPond()
        this.save()
        this.ui.closeSheet()
      }
    let decided = false
    const keep = () => {
      if (decided) return
      decided = true
      if (room) s.bucket.push({ id: sp.id, cm: c.cm, kg: c.kg, value: c.value })
      else this.release()
      this.save()
      this.ui.closeSheet()
      if (s.stats.caught === 1) this.ui.toast('Fin fangst! Selg fisken hos Marit i Krambua på Bryggen.', 'house')
      if (this.ak && !s.flags.ak_sold1 && s.bucket.length === 1) this.ui.toast('Fin fangst! Astrid på Bakke Fisk kjøper den.', 'house')
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
      `${rows}${s.bucket.length ? `<p style="margin-top:10px">Til sammen: <b>${kr(bucketValue(s))}</b></p><div class="stack"><button class="btn" data-a="go">${iconImg('house')}Ro inn til ${this.placeName('krambua')}</button></div>` : ''}`,
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
if (import.meta.env.DEV) Object.assign(window, { __game: game, __species: SPECIES_BY_ID })
;(window as unknown as { game: Game }).game = game
void zoneAt
void depthToY

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(() => {})
watchForUpdates()
