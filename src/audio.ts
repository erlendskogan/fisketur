// Tiny synthesised sound effects and a piano-ballad soundtrack, all WebAudio

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

/**
 * The soundtrack: a slow, wistful piano ballad in the spirit of a North East coastal anthem.
 * Piano and bass first, then strings and a soft heartbeat drum, then a lonely saxophone over
 * the chorus before it all breathes out and starts again. Each place hears it in its own key.
 */
const KEYS: Record<string, number> = { norge: 0, lofoten: 0, alaska: -2, hawaii: 2 }
let key = 0
export const setMusic = (s: string) => (key = KEYS[s] ?? 0)

const BPM = 74
const BEAT = 60 / BPM
/** Chords as a piano voicing around E♭4 (semitones) and a bass root around E♭3 */
const CH: Record<string, { v: number[]; b: number }> = {
  Eb: { v: [-5, 0, 4], b: 0 },
  Gm: { v: [-5, -1, 4], b: 4 },
  Cm: { v: [-3, 0, 4], b: -3 },
  Ab: { v: [-3, 0, 5], b: 5 },
  Bb: { v: [-5, -1, 2], b: 7 },
  Fm: { v: [-3, 2, 5], b: 2 },
}
const VERSE = ['Eb', 'Gm', 'Cm', 'Ab', 'Eb', 'Gm', 'Cm', 'Bb']
const CHORUS = ['Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Eb', 'Fm', 'Bb']
const OUTRO = ['Ab', 'Ab', 'Eb', 'Eb']
/** Song sections: which chords, and which instruments join in */
const SONG: { chords: string[]; arp?: boolean; pulse?: boolean; pad?: boolean; kick?: boolean; brush?: boolean; sax?: boolean; bass?: boolean }[] = [
  { chords: VERSE, arp: true, bass: true },
  { chords: VERSE, pulse: true, pad: true, kick: true, bass: true },
  { chords: CHORUS, pulse: true, pad: true, kick: true, brush: true, sax: true, bass: true },
  { chords: OUTRO, arp: true, pad: true },
]
/** The saxophone's line over the chorus: [beat, semitone above E♭4, length in beats] per bar */
const SAX: number[][][] = [
  [[1, 9, 1], [2, 7, 0.5], [2.5, 9, 1.5]],
  [[0, 7, 2], [2.5, 4, 0.5], [3, 7, 1]],
  [[0, 14, 1.5], [1.5, 12, 0.5], [2, 11, 2]],
  [[0, 12, 3], [3.5, 11, 0.5]],
  [[0, 12, 1], [1, 14, 1], [2, 12, 1], [3, 9, 1]],
  [[0, 7, 3], [3, 9, 0.5], [3.5, 7, 0.5]],
  [[0, 5, 1.5], [1.5, 7, 0.5], [2, 9, 1], [3, 7, 1]],
  [[0, 7, 1], [1, 2, 3]],
]

let dry: GainNode | null = null
let wet: GainNode | null = null
const EB4 = 311.13
const hz = (semi: number) => EB4 * Math.pow(2, (semi + key) / 12)

/** A long, soft hall: decaying stereo noise as the impulse response */
function makeReverb() {
  if (!ctx || !musicGain) return
  const len = Math.floor(ctx.sampleRate * 2.8)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  const conv = ctx.createConvolver()
  conv.buffer = ir
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 3200
  wet = ctx.createGain()
  wet.gain.value = 0.55
  wet.connect(conv)
  conv.connect(tone)
  tone.connect(musicGain)
  dry = ctx.createGain()
  dry.connect(musicGain)
}

/** One voice: oscillators through a filter and an envelope, sent dry and to the hall */
function voice(t: number, freq: number, parts: [OscillatorType, number, number][], env: { a: number; d: number; s: number; r: number; len: number }, vol: number, cutoff: number, send = 0.5, vib = 0) {
  if (!ctx || !dry || !wet) return
  const g = ctx.createGain()
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = cutoff
  const end = t + env.len + env.r
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + env.a)
  g.gain.setTargetAtTime(vol * env.s, t + env.a, env.d)
  g.gain.setTargetAtTime(0, t + env.len, env.r / 4)
  f.connect(g)
  g.connect(dry)
  const s = ctx.createGain()
  s.gain.value = send
  g.connect(s)
  s.connect(wet)
  let lfo: OscillatorNode | null = null
  let lfoG: GainNode | null = null
  if (vib) {
    // vibrato that blooms in after the note has settled, like a held breath
    lfo = ctx.createOscillator()
    lfo.frequency.value = 5.2
    lfoG = ctx.createGain()
    lfoG.gain.setValueAtTime(0, t)
    lfoG.gain.linearRampToValueAtTime(freq * vib, t + Math.min(env.len, 0.6))
    lfo.connect(lfoG)
    lfo.start(t)
    lfo.stop(end)
  }
  for (const [type, mult, amt] of parts) {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq * mult
    if (lfoG) lfoG.connect(o.frequency)
    const pg = ctx.createGain()
    pg.gain.value = amt
    o.connect(pg)
    pg.connect(f)
    o.start(t)
    o.stop(end)
  }
}

const piano = (t: number, semi: number, vol: number, len = BEAT * 2) =>
  voice(t, hz(semi), [['sine', 1, 1], ['triangle', 2, 0.25], ['sine', 3, 0.08], ['sine', 1.003, 0.4]], { a: 0.006, d: 0.5, s: 0.25, r: 0.9, len }, vol, 2600, 0.45)
const strings = (t: number, semi: number, len: number) =>
  voice(t, hz(semi), [['sawtooth', 1, 0.5], ['sawtooth', 1.006, 0.5], ['sawtooth', 0.497, 0.3]], { a: len * 0.35, d: 1, s: 1, r: 1.4, len }, 0.016, 900, 0.8)
const bass = (t: number, semi: number, len: number) =>
  voice(t, hz(semi - 12), [['sine', 1, 1], ['triangle', 1, 0.35], ['sine', 0.5, 0.6]], { a: 0.02, d: 0.8, s: 0.5, r: 0.3, len }, 0.09, 600, 0.1)
const sax = (t: number, semi: number, len: number) =>
  voice(t, hz(semi), [['sawtooth', 1, 0.6], ['square', 1, 0.25], ['sine', 1, 0.5]], { a: 0.07, d: 0.3, s: 0.8, r: 0.35, len }, 0.045, 1500, 0.7, 0.012)

function kick(t: number, vol: number) {
  if (!ctx || !dry) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.setValueAtTime(110, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.18)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
  o.connect(g)
  g.connect(dry)
  o.start(t)
  o.stop(t + 0.4)
}

function brush(t: number, vol: number) {
  if (!ctx || !dry || !wet || !noiseBuf) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 2600
  f.Q.value = 0.6
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
  src.connect(f)
  f.connect(g)
  g.connect(dry)
  g.connect(wet)
  src.start(t, Math.random() * 0.5)
  src.stop(t + 0.3)
}

/** Everything one bar of the song plays, starting at time t */
function playBar(t: number, sec: (typeof SONG)[number], bar: number) {
  const c = CH[sec.chords[bar]]
  const [v0, v1, v2] = c.v
  const len = BEAT * 4
  if (sec.arp) {
    // a gentle rolling eighth-note figure, low to high and back
    ;[v0 - 12, v0, v1, v2, v1 + 12, v2, v1, v0].forEach((n, i) => piano(t + i * BEAT / 2, n, i === 0 ? 0.05 : 0.032, BEAT * 1.5))
  }
  if (sec.pulse) {
    piano(t, c.b - 12, 0.05, len)
    for (let b = 0; b < 4; b++) for (const n of c.v) piano(t + b * BEAT, n, b === 0 ? 0.03 : 0.021, BEAT * 0.9)
  }
  if (sec.bass) bass(t, c.b, len * 0.95)
  if (sec.pad) for (const n of c.v) strings(t, n, len)
  if (sec.kick) {
    kick(t, 0.22)
    kick(t + BEAT * 2, 0.16)
    if (sec.brush) kick(t + BEAT * 2.5, 0.08)
  }
  if (sec.brush) {
    brush(t + BEAT, 0.05)
    brush(t + BEAT * 3, 0.05)
  }
  if (sec.sax) for (const [at, n, l] of SAX[bar]) sax(t + at * BEAT, n, l * BEAT * 0.95)
}

/** Schedules the song a little ahead of time and loops it forever */
function startMusic() {
  if (!ctx || !musicGain) return
  makeReverb()
  let part = 0
  let bar = 0
  let next = ctx.currentTime + 0.3
  const tick = () => {
    if (!ctx) return
    // after the tab has been asleep, pick up from now instead of rushing to catch up
    if (next < ctx.currentTime) next = ctx.currentTime + 0.1
    while (next < ctx.currentTime + 1.2) {
      playBar(next, SONG[part], bar)
      next += BEAT * 4
      if (++bar >= SONG[part].chords.length) {
        bar = 0
        part = (part + 1) % SONG.length
      }
    }
    setTimeout(tick, 250)
  }
  tick()
}
