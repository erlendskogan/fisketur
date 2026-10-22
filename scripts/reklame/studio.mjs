// The recorder: opens the game from the Vite dev server with a virtual clock (vtime.js), plays a
// scripted take and writes it as a lossless-ish 1080 × 1920 clip plus the game's own audio.

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PW || 'playwright-core')

const HERE = dirname(fileURLToPath(import.meta.url))
export const OUT = process.env.OUT || join(HERE, '.out')
const URL = process.env.URL || 'http://localhost:5173/'
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

export const FPS = 30
/** CSS pixels of a large iPhone; the page renders at 2.5× for 1080 × 1920 */
export const VW = 432
export const VH = 768
const DPR = 1080 / VW

const OVERLAY_CSS = readFileSync(join(HERE, 'overlay.css'), 'utf8')

let browser = null
async function getBrowser() {
  browser ??= await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu-vsync'] })
  return browser
}
export async function closeBrowser() {
  await browser?.close()
  browser = null
}

/**
 * One continuous take. `save` is written to localStorage before the game boots.
 * audioMode: 'sfx' keeps sound effects and ambience but not the music, 'music' only the music.
 */
export async function take(name, { save, seed = 7, audioSeconds = 40, audioMode = 'sfx', safeTop = 47, safeBot = 24 } = {}) {
  mkdirSync(OUT, { recursive: true })
  const b = await getBrowser()
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error(`[${name}] pageerror`, e.message))
  page.on('console', (m) => m.type() === 'error' && console.error(`[${name}]`, m.text()))
  await page.addInitScript(
    ({ cfg, save }) => {
      window.__REKLAME = cfg
      if (save) localStorage.setItem('fisketur:save', JSON.stringify(save))
      else localStorage.removeItem('fisketur:save')
    },
    { cfg: { seed, audioSeconds, audioMode }, save },
  )
  await page.addInitScript({ path: join(HERE, 'vtime.js') })
  await page.goto(URL)
  await page.waitForFunction(() => window.__game && window.__dev && document.fonts.status === 'loaded')
  await page.evaluate(
    async ({ css, safeTop, safeBot }) => {
      await document.fonts.load('16px "Jersey 10"')
      document.getElementById('devpanel')?.remove()
      const st = document.createElement('style')
      st.textContent = `:root{--safe-top:${safeTop}px;--safe-bot:${safeBot}px}\n${css}`
      document.head.append(st)
      const rk = document.createElement('div')
      rk.id = 'rk'
      document.body.append(rk)
      const tl = document.createElement('div')
      tl.style.cssText = 'position:fixed;inset:0;z-index:100001;pointer-events:none'
      document.body.append(tl)
      let touchAt = ''
      window.__touch = (x, y, on) => {
        const k = on ? `${x},${y}` : ''
        if (k === touchAt) return
        touchAt = k
        tl.innerHTML = on ? `<div class="rk-touch" style="left:${x}px;top:${y}px"></div>` : ''
      }
    },
    { css: OVERLAY_CSS, safeTop, safeBot },
  )
  const cdp = await ctx.newCDPSession(page)

  const file = join(OUT, `${name}.mkv`)
  // started on the first frame, so a take can also be used for sound only
  let ff = null
  let ffDone = null
  const encoder = () => {
    ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '6', '-pix_fmt', 'yuv444p', file], {
      stdio: ['pipe', 'inherit', 'inherit'],
    })
    ffDone = new Promise((res, rej) => ff.on('close', (c) => (c ? rej(new Error(`ffmpeg ${c}`)) : res())))
  }
  let frames = 0
  let acc = 0
  /** Virtual time of each frame and how many game frames went into it, to line the sound up */
  const clock = []

  const t = {
    page,
    name,
    get frames() {
      return frames
    },
    /** Seconds of video so far */
    get time() {
      return frames / FPS
    },
    eval: (fn, arg) => page.evaluate(fn, arg),
    /** Run per-frame code in the page (before the game's frame), or null to stop */
    perFrame: (src) => page.evaluate((src) => (window.__rk.perFrame = src ? new Function('vt', src) : null), src),
    /** Advance the game without filming */
    async skip(sec, speed = 1) {
      const n = Math.round(sec * FPS * speed)
      await page.evaluate(
        async ({ n, ms }) => {
          for (let i = 0; i < n; i++) await window.__rk.step(ms)
        },
        { n, ms: 1000 / FPS },
      )
    },
    /**
     * Film up to `sec` seconds. `speed` runs the game faster than real time (several game frames
     * per video frame, so the game's 50 ms step cap still holds). `until` is page-side code with
     * the game as `g`; filming stops after the first frame where it is true, and film() says so.
     */
    async film(sec, { speed = 1, each, until } = {}) {
      const n = Math.round(sec * FPS)
      for (let i = 0; i < n; i++) {
        acc += speed
        const k = Math.floor(acc + 1e-9)
        acc -= k
        const { hit, vt } = await page.evaluate(
          async ({ k, ms, until }) => {
            for (let j = 0; j < k; j++) await window.__rk.step(ms)
            return { hit: until ? !!new Function('g', `return (${until})`)(window.__game) : false, vt: window.__rk.vt }
          },
          { k, ms: 1000 / FPS, until },
        )
        if (each) await each(i)
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: VW, height: VH, scale: DPR } })
        const buf = Buffer.from(data, 'base64')
        if (!ff) encoder()
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
        clock.push({ vt, k, speed })
        frames++
        if (hit) return true
      }
      return false
    },
    /** Tap or hold on the page at CSS pixel coordinates; shows a touch marker in the overlay */
    async down(x, y) {
      await page.evaluate(({ x, y }) => window.__touch?.(x, y, true), { x, y })
      await page.mouse.move(x, y)
      await page.mouse.down()
    },
    async up() {
      await page.evaluate(() => window.__touch?.(0, 0, false))
      await page.mouse.up()
    },
    async tap(x, y, holdSec = 0.12) {
      await t.down(x, y)
      await t.film(holdSec)
      await t.up()
    },
    /** Put HTML in the overlay layer (replaces what is there), or clear it */
    overlay: (html = '') => page.evaluate((html) => (document.getElementById('rk').innerHTML = html), html),
    addOverlay: (html) => page.evaluate((html) => document.getElementById('rk').insertAdjacentHTML('beforeend', html), html),
    /** The whole sound of the take on the game's clock, from virtual time 0 (for the soundtrack) */
    async rawAudio(path) {
      const a = await page.evaluate(() => window.__rk.audio())
      writeWav(path, Buffer.from(a.pcm, 'base64'), a.sampleRate, a.startMs / 1000)
      await ctx.close()
      return path
    },
    async finish() {
      ff?.stdin.end()
      await ffDone
      const a = await page.evaluate(() => window.__rk.audio())
      let wav = null
      if (a && frames) {
        const raw = join(OUT, `${name}.raw.wav`)
        writeWav(raw, Buffer.from(a.pcm, 'base64'), a.sampleRate, a.startMs / 1000)
        wav = join(OUT, `${name}.wav`)
        await followClock(raw, wav, clock)
      }
      await ctx.close()
      console.log(`[${name}] ${frames} frames (${(frames / FPS).toFixed(2)} s)`)
      return { video: file, audio: wav, seconds: frames / FPS }
    },
  }
  return t
}

/**
 * Cut the take's sound to the frames that were filmed: each frame gets the sound of the game
 * frames that went into it, sped up (pitch kept) where the game ran faster than the film.
 */
async function followClock(raw, out, clock) {
  const T = 1 / FPS
  const segs = []
  for (const { vt, k, speed } of clock) {
    const end = vt / 1000
    const start = end - k * T
    const last = segs.at(-1)
    if (last && last.speed === speed && Math.abs(last.end - start) < 1e-6) {
      last.end = end
      last.n++
    } else segs.push({ start, end, speed, n: 1 })
  }
  const parts = segs.map((g, i) => {
    let f = `[0:a]atrim=start=${Math.max(0, g.start).toFixed(6)}:end=${g.end.toFixed(6)},asetpts=PTS-STARTPTS`
    // atempo takes at most 2× per stage, so chain it
    let r = (g.end - g.start) / (g.n * T)
    if (Math.abs(r - 1) > 1e-3)
      for (; r > 1.0001; r /= Math.min(r, 2)) f += `,atempo=${Math.min(r, 2).toFixed(6)}`
    return `${f},apad=whole_dur=${(g.n * T).toFixed(6)},atrim=end=${(g.n * T).toFixed(6)}[s${i}]`
  })
  const graph = `${parts.join(';')};${segs.map((_, i) => `[s${i}]`).join('')}concat=n=${segs.length}:v=0:a=1[a]`
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-filter_complex', graph, '-map', '[a]', '-c:a', 'pcm_f32le', out])
}

export function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] })
    p.on('close', (c) => (c ? rej(new Error(`${cmd} ${c}`)) : res()))
  })
}

/** 32-bit float stereo WAV, padded with silence at the start so it lines up with the game's clock */
function writeWav(path, pcm, rate, lead) {
  const pad = Buffer.alloc(Math.round(lead * rate) * 8)
  const data = Buffer.concat([pad, pcm])
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + data.length, 4)
  h.write('WAVE', 8)
  h.write('fmt ', 12)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(3, 20)
  h.writeUInt16LE(2, 22)
  h.writeUInt32LE(rate, 24)
  h.writeUInt32LE(rate * 8, 28)
  h.writeUInt16LE(8, 32)
  h.writeUInt16LE(32, 34)
  h.write('data', 36)
  h.writeUInt32LE(data.length, 40)
  writeFileSync(path, Buffer.concat([h, data]))
}
