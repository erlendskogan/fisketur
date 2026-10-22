// Injected into the game page before anything else runs. It takes over the page's clock so a
// video can be captured frame by frame: requestAnimationFrame, timers, performance.now, Date,
// CSS animations and WebAudio all follow a virtual time that only moves when the recorder says
// so. The game's own WebAudio is rendered offline in step with the frames.
//
// Settings come in window.__REKLAME: { audioSeconds, audioMode: 'all' | 'sfx' | 'music', seed }.
;(() => {
  const cfg = window.__REKLAME || {}
  let vt = 0 // ms

  // ---------- a seeded Math.random, so a take plays the same every time ----------
  let seed = (cfg.seed ?? 1) >>> 0 || 1
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // ---------- clocks ----------
  const RealDate = Date
  const t0 = new RealDate(2026, 6, 14, 12, 0, 0).getTime()
  performance.now = () => vt
  class VDate extends RealDate {
    constructor(...a) {
      if (a.length) super(...a)
      else super(t0 + vt)
    }
    static now() {
      return t0 + vt
    }
  }
  window.Date = VDate

  // ---------- timers ----------
  let nextId = 1
  const timers = new Map()
  window.setTimeout = (fn, ms = 0, ...args) => {
    const id = nextId++
    timers.set(id, { due: vt + Math.max(0, +ms || 0), fn, args, every: 0 })
    return id
  }
  window.setInterval = (fn, ms = 0, ...args) => {
    const id = nextId++
    const every = Math.max(1, +ms || 0)
    timers.set(id, { due: vt + every, fn, args, every })
    return id
  }
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id)

  let rafs = new Map()
  window.requestAnimationFrame = (fn) => {
    const id = nextId++
    rafs.set(id, fn)
    return id
  }
  window.cancelAnimationFrame = (id) => rafs.delete(id)

  const runTimers = (until) => {
    for (;;) {
      let best = null
      for (const [id, t] of timers) if (t.due <= until && (!best || t.due < best[1].due)) best = [id, t]
      if (!best) return
      const [id, t] = best
      vt = Math.max(vt, t.due)
      if (t.every) t.due += t.every
      else timers.delete(id)
      try {
        typeof t.fn === 'function' ? t.fn(...t.args) : eval(t.fn)
      } catch (e) {
        console.error(e)
      }
    }
  }

  // ---------- CSS animations and transitions ----------
  const started = new WeakMap()
  const syncAnimations = () => {
    for (const a of document.getAnimations()) {
      // a CSS animation that is paused from script outlives a change of animation-name
      if (a instanceof CSSAnimation) {
        const el = a.effect?.target
        if (!el?.isConnected || !getComputedStyle(el).animationName.split(', ').includes(a.animationName)) {
          a.cancel()
          continue
        }
      }
      if (!started.has(a)) started.set(a, vt)
      a.pause()
      a.currentTime = vt - started.get(a)
    }
  }

  // ---------- WebAudio, rendered offline ----------
  const SR = 48000
  const Q = 128
  const audio = { ctx: null, startVt: 0, done: null, length: 0, finished: false }
  const RealOffline = window.OfflineAudioContext
  const RealConnect = AudioNode.prototype.connect
  function FakeAudioContext() {
    const length = Math.ceil((cfg.audioSeconds ?? 30) * SR)
    const c = new RealOffline({ numberOfChannels: 2, length, sampleRate: SR })
    audio.ctx = c
    audio.length = length
    audio.startVt = vt
    const realResume = RealOffline.prototype.resume.bind(c)
    audio.resume = realResume
    c.resume = () => Promise.resolve()
    Object.defineProperty(c, 'state', { get: () => 'running' })
    // the first two gains the game makes are the master and the music bus (src/audio.ts)
    let gains = 0
    const createGain = c.createGain.bind(c)
    c.createGain = () => {
      const g = createGain()
      gains++
      const mode = cfg.audioMode || 'all'
      if (gains === 1 && mode === 'music') g.connect = () => undefined
      if (gains === 2 && mode === 'sfx') g.connect = () => undefined
      if (gains === 2 && mode === 'music') {
        const out = createGain()
        out.gain.value = 0.6
        RealConnect.call(out, c.destination)
        g.connect = () => RealConnect.call(g, out)
      }
      return g
    }
    // rendering runs on its own thread: always wait until it is parked at the last stop
    audio.parked = c.suspend(Q / SR)
    audio.done = c.startRendering()
    return c
  }
  window.AudioContext = FakeAudioContext
  window.webkitAudioContext = FakeAudioContext

  const renderAudio = async () => {
    const c = audio.ctx
    if (!c || audio.finished) return
    await audio.parked
    const want = (vt - audio.startVt) / 1000
    const frame = Math.ceil((want * SR) / Q) * Q
    const now = Math.round(c.currentTime * SR)
    if (frame <= now) return
    if (frame >= audio.length) {
      audio.finished = true
      await audio.resume()
      return
    }
    audio.parked = c.suspend(frame / SR)
    await audio.resume()
    await audio.parked
  }

  // ---------- the recorder's handles ----------
  window.__rk = {
    get vt() {
      return vt
    },
    /** called before the frame's animation callbacks, for autopilots */
    perFrame: null,
    async step(ms) {
      const until = vt + ms
      runTimers(until)
      vt = until
      await renderAudio()
      try {
        this.perFrame?.(vt)
      } catch (e) {
        console.error(e)
      }
      const cbs = rafs
      rafs = new Map()
      for (const fn of cbs.values())
        try {
          fn(vt)
        } catch (e) {
          console.error(e)
        }
      syncAnimations()
    },
    /** Finish the audio and hand it over as 32-bit float stereo PCM in base64, with its start time */
    async audio() {
      if (!audio.ctx) return null
      if (!audio.finished) {
        audio.finished = true
        await audio.parked
        await audio.resume()
      }
      const buf = await audio.done
      const L = buf.getChannelData(0)
      const R = buf.getChannelData(1)
      const out = new Float32Array(L.length * 2)
      for (let i = 0; i < L.length; i++) {
        out[i * 2] = L[i]
        out[i * 2 + 1] = R[i]
      }
      const bytes = new Uint8Array(out.buffer)
      let s = ''
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
      return { startMs: audio.startVt, sampleRate: SR, pcm: btoa(s) }
    },
  }
})()
