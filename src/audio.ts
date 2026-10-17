// Tiny synthesised sound effects and a soft generative tune, all WebAudio

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicGain: GainNode | null = null
let enabled = true
let noiseBuf: AudioBuffer | null = null

export function initAudio() {
  if (ctx) {
    // iOS reports 'interrupted' (not 'suspended') after a call or a trip to another app
    if (ctx.state !== 'running') ctx.resume()
    return
  }
  try {
    ctx = new AudioContext()
  } catch {
    return
  }
  master = ctx.createGain()
  master.gain.value = enabled ? 0.6 : 0
  master.connect(ctx.destination)
  musicGain = ctx.createGain()
  musicGain.gain.value = 0.18
  musicGain.connect(master)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  startWaves()
  startRain()
  startMusic()
}

export function setSound(on: boolean) {
  enabled = on
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, 0.05)
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12, when = 0, slide = 0, dest?: AudioNode) {
  if (!ctx || !master) return
  const t = ctx.currentTime + when
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(dest ?? master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, vol: number, freq: number, q = 1, when = 0, sweep = 0) {
  if (!ctx || !master || !noiseBuf) return
  const t = ctx.currentTime + when
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.setValueAtTime(freq, t)
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + dur)
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start(t)
  src.stop(t + dur + 0.05)
}

/** A humpback's call: a low tone that slides up and back down, with a slow wobble */
function whaleCall(base: number, vol: number) {
  if (!ctx || !master) return
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  const lfo = ctx.createOscillator()
  const lfoG = ctx.createGain()
  const g = ctx.createGain()
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 900
  o.type = 'sine'
  o.frequency.setValueAtTime(base, t)
  o.frequency.exponentialRampToValueAtTime(base * 1.9, t + 0.9)
  o.frequency.exponentialRampToValueAtTime(base * 0.8, t + 2.2)
  lfo.frequency.value = 5
  lfoG.gain.value = base * 0.03
  lfo.connect(lfoG)
  lfoG.connect(o.frequency)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.4)
  g.gain.linearRampToValueAtTime(vol * 0.7, t + 1.6)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4)
  o.connect(f)
  f.connect(g)
  g.connect(master)
  o.start(t)
  lfo.start(t)
  o.stop(t + 2.5)
  lfo.stop(t + 2.5)
}

export const sfx = {
  whale(far = false) {
    whaleCall(far ? 160 : 120, far ? 0.04 : 0.09)
  },
  song() {
    // three phrases, like the recordings: Den gamle, the whales of the north, and the new verse
    whaleCall(110, 0.08)
    setTimeout(() => whaleCall(150, 0.07), 1800)
    setTimeout(() => whaleCall(200, 0.06), 3600)
  },
  cast() {
    noise(0.25, 0.25, 1800, 0.8, 0, -1200)
  },
  splash() {
    noise(0.4, 0.35, 900, 0.7, 0, -500)
    tone(320, 0.12, 'sine', 0.06, 0, -160)
  },
  plop() {
    tone(500, 0.08, 'sine', 0.12, 0, -300)
  },
  nibble() {
    tone(880, 0.05, 'triangle', 0.07)
  },
  bite() {
    tone(660, 0.07, 'square', 0.1)
    tone(990, 0.1, 'square', 0.1, 0.07)
  },
  tick() {
    tone(1400 + Math.random() * 200, 0.02, 'square', 0.025)
  },
  lose() {
    tone(392, 0.15, 'triangle', 0.1)
    tone(311, 0.25, 'triangle', 0.1, 0.14)
  },
  catch() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.07, i * 0.08))
  },
  fanfare() {
    ;[523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.24, 'triangle', 0.1, i * 0.11))
  },
  coin() {
    tone(988, 0.06, 'square', 0.06)
    tone(1319, 0.14, 'square', 0.06, 0.06)
  },
  click() {
    tone(700, 0.03, 'square', 0.04)
  },
  blip() {
    tone(560 + Math.random() * 60, 0.025, 'square', 0.025)
  },
  purr() {
    for (let i = 0; i < 6; i++) noise(0.09, 0.08, 120, 3, i * 0.12)
  },
  chest() {
    ;[784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.06))
  },
  creak() {
    tone(180, 0.3, 'sawtooth', 0.03, 0, 60)
  },
}

/** Gentle surf: filtered noise with a slow swell */
function startWaves() {
  if (!ctx || !master || !noiseBuf) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 500
  const g = ctx.createGain()
  g.gain.value = 0.035
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.12
  const lfoG = ctx.createGain()
  lfoG.gain.value = 0.025
  lfo.connect(lfoG)
  lfoG.connect(g.gain)
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start()
  lfo.start()
}

let rainGain: GainNode | null = null

/** Soft hiss of rain on the water, silent until it rains */
function startRain() {
  if (!ctx || !master || !noiseBuf) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 900
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 5200
  rainGain = ctx.createGain()
  rainGain.gain.value = 0
  src.connect(hp)
  hp.connect(lp)
  lp.connect(rainGain)
  rainGain.connect(master)
  src.start()
}

/** 0..1, how hard it is raining */
let rainNow = -1
export function setRain(amount: number) {
  const a = Math.round(amount * 20) / 20
  if (!rainGain || !ctx || a === rainNow) return
  rainNow = a
  rainGain.gain.setTargetAtTime(a * 0.05, ctx.currentTime, 0.8)
}

/** Each place has its own tune: a music box at home, something slower and darker in Alaska, a ukulele in Hawaii */
const STYLES: Record<string, { base: number; beat: number; scale: number[]; chords: number[][]; pluck: boolean }> = {
  norge: { base: 261.63, beat: 0.62, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [-5, -1, 2]], pluck: false },
  alaska: { base: 220, beat: 0.78, scale: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22], chords: [[0, 3, 7], [-4, 0, 3], [-9, -5, -2], [-2, 2, 5]], pluck: false },
  hawaii: { base: 293.66, beat: 0.46, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [-3, 0, 4]], pluck: true },
}
let style = 'norge'
export const setMusic = (s: string) => (style = STYLES[s] ? s : 'norge')

/** A slow pentatonic tune that never quite repeats */
function startMusic() {
  if (!ctx || !musicGain) return
  let step = 0
  let note = 4
  const tick = () => {
    if (!ctx || !musicGain) return
    const st = STYLES[style]
    const hz = (semi: number) => st.base * Math.pow(2, semi / 12)
    const beat = st.beat
    const chord = st.chords[Math.floor(step / 8) % st.chords.length]
    if (st.pluck) {
      // a ukulele strum on every other beat
      if (step % 2 === 0) chord.forEach((n, i) => tone(hz(n), beat * 0.9, 'triangle', 0.035, i * 0.03, 0, musicGain!))
    } else if (step % 8 === 0) for (const n of chord) tone(hz(n - 12), beat * 7, 'sine', 0.05, 0, 0, musicGain)
    if (Math.random() < (st.pluck ? 0.6 : 0.72)) {
      note = Math.max(0, Math.min(st.scale.length - 1, note + Math.round((Math.random() - 0.5) * 4)))
      tone(hz(st.scale[note]), beat * (st.pluck ? 1.1 : 2.2), 'triangle', 0.07, 0, 0, musicGain)
      if (Math.random() < 0.2) tone(hz(st.scale[note] + 12), beat * 1.2, 'sine', 0.03, beat / 2, 0, musicGain)
    }
    step++
    setTimeout(tick, beat * 1000)
  }
  tick()
}
