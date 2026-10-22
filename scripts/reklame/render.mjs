// Records the three ads and puts them together: the takes, the game's soundtrack under them,
// loudness for social video, and H.264 + AAC at 1080 × 1920.
//
//   node scripts/reklame/render.mjs            all three
//   node scripts/reklame/render.mjs 1 3        some of them
//
// Needs the Vite dev server (npm run dev) and Playwright; see README.md in this folder.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ad1 } from './ad1-dypet.mjs'
import { ad2 } from './ad2-fyret.mjs'
import { ad3, BAR } from './ad3-reisen.mjs'
import { save } from './saves.mjs'
import { closeBrowser, OUT, run, take } from './studio.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEST = process.env.DEST || join(HERE, '../../docs/reklamevideoer')

/** Where the parts of the song begin in the soundtrack render (src/audio.ts: 0.3 s lead, 8 + 8 + 8 + 4 bars) */
const SONG = { verse: 0.3, verse2: 0.3 + 8 * BAR, chorus: 0.3 + 16 * BAR }

/** The soundtrack on its own, played by the game's synth for a minute and a half */
async function soundtrack() {
  const path = join(OUT, 'soundtrack.wav')
  if (existsSync(path)) return path
  const t = await take('soundtrack', { audioMode: 'music', audioSeconds: 96, save: save({}) })
  await t.down(216, 360)
  await t.up()
  await t.skip(96)
  return t.rawAudio(path)
}

/** Integrated loudness (LUFS) of an audio file */
function lufs(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
  const v = Number(r.stderr.match(/"input_i" : "(-?[\d.inf]+)"/)?.[1])
  return Number.isFinite(v) ? v : -70
}

/**
 * The clips back to back, the take sound (effects and ambience) over the soundtrack from
 * `musicFrom` seconds, mixed at fixed loudness targets and normalised to −14 LUFS.
 */
async function compose(name, clips, musicFrom, cover = 0.5) {
  mkdirSync(DEST, { recursive: true })
  const total = clips.reduce((n, c) => n + c.seconds, 0)
  const vlist = join(OUT, `${name}.videos.txt`)
  const alist = join(OUT, `${name}.audios.txt`)
  writeFileSync(vlist, clips.map((c) => `file '${c.video}'`).join('\n'))
  writeFileSync(alist, clips.map((c) => `file '${c.audio}'`).join('\n'))
  const sfx = join(OUT, `${name}.sfx.wav`)
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', alist, '-c:a', 'pcm_f32le', sfx])
  const music = join(OUT, `${name}.music.wav`)
  const fadeAt = Math.max(0, total - 1.4)
  await run('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', await soundtrack(),
    '-af', `atrim=start=${musicFrom.toFixed(4)}:duration=${total.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=0.25,afade=t=out:st=${fadeAt.toFixed(3)}:d=1.4`,
    '-c:a', 'pcm_f32le', music,
  ])
  // the music carries the ad; the game's own sounds sit just under it
  const gm = -17 - lufs(music)
  const gs = -21 - lufs(sfx)
  const out = join(DEST, `${name}.mp4`)
  await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', vlist,
    '-i', sfx, '-i', music,
    '-filter_complex', `[1:a]volume=${gs.toFixed(2)}dB[s];[2:a]volume=${gm.toFixed(2)}dB[m];[s][m]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-2:LRA=11,aresample=48000[a]`,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-r', '30',
    '-x264-params', 'keyint=60:min-keyint=30',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', '-shortest', out,
  ])
  // a still for the ad platforms' cover picker
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(cover), '-i', out, '-frames:v', '1', join(DEST, `${name}.jpg`)])
  console.log(`${out}: ${total.toFixed(2)} s`)
}

const pick = process.argv.slice(2)
const want = (n) => !pick.length || pick.includes(String(n))

if (want(1)) {
  const { clips, reveal } = await ad1('ad1')
  // the chorus and the saxophone come in with the new species
  await compose('1-dypet', clips, SONG.chorus - reveal)
}
if (want(2)) {
  const { clips, lit } = await ad2('ad2')
  await compose('2-fyret', clips, Math.max(0, SONG.verse2 - lit), 3.6)
}
if (want(3)) {
  const { clips } = await ad3('ad3')
  await compose('3-reisen', clips, SONG.chorus)
}
await closeBrowser()
