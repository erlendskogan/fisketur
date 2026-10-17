// A little pixel map of the world for the travel sheet: the places you have lived and the
// way the song travelled between them.

import { Pix, rng, shade } from './pixel'

/** 10° by 10° cells, from 180°W and 90°N; # is land */
const LAND = [
  '............####....................',
  '......######.####...#...#.###########',
  '.####.#########.##.#.###############',
  '..#..#######.....###################',
  '.....#######.....#####.##########.#.',
  '......#####......######.##########..',
  '.......##..#....#######.####.###....',
  '..*.....#.......#######..#..###.....',
  '..........####...######.....####....',
  '..........#####....####......#####..',
  '...........####....###.#......####..',
  '...........###.....###.......######.',
  '...........##...............####...#',
  '...........#.......................#',
  '...........#........................',
  '....................................',
  '####################################',
  '####################################',
]

export interface MapPlace {
  lat: number
  lon: number
  /** 0 not yet, 1 visited, 2 here now */
  state: number
}

export function worldMap(places: MapPlace[], route: [number, number][]) {
  const W = 144
  const H = 72
  const p = new Pix(W, H)
  const r = rng(3)
  const land = (x: number, y: number) => {
    const row = LAND[Math.floor(y / 4)] ?? ''
    const c = row[Math.floor(x / 4)]
    return c === '#' || (c === '*' && (x % 4 === 1 || x % 4 === 2) && y % 4 === 2)
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      // ragged coasts: let the cell edges wobble a little
      const jx = x + Math.round((r() - 0.5) * 1.6)
      const jy = y + Math.round((r() - 0.5) * 1.6)
      if (land(jx, jy)) p.set(x, y, y > 62 ? '#e8eef4' : y < 8 ? '#dce6ec' : (x + y) % 5 === 0 ? '#5a8a4a' : '#6a9a52')
      else p.set(x, y, (Math.floor(x / 2) + y) % 7 === 0 ? '#2e6a9a' : '#2a5e8c')
    }
  // grid lines like an old sea chart
  for (let x = 0; x < W; x += 24) for (let y = 0; y < H; y += 2) p.set(x, y, shade(p.get(x, y)!, 0.12))
  for (let y = 0; y < H; y += 18) for (let x = 0; x < W; x += 2) p.set(x, y, shade(p.get(x, y)!, 0.12))
  const at = (lat: number, lon: number) => [Math.round(((lon + 180) / 360) * W), Math.round(((90 - lat) / 180) * H)] as const
  // the route the song took: dotted, wrapping around the edge of the map where it crosses the Pacific
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = at(...route[i])
    const [bx, by] = at(...route[i + 1])
    const wrap = Math.abs(bx - ax) > W / 2
    const tx = wrap ? (bx < ax ? bx + W : bx - W) : bx
    const n = Math.max(Math.abs(tx - ax), Math.abs(by - ay))
    for (let k = 0; k <= n; k += 3) {
      const x = Math.round(ax + ((tx - ax) * k) / n)
      const y = Math.round(ay + ((by - ay) * k) / n - Math.sin((Math.PI * k) / n) * 4)
      p.set(((x % W) + W) % W, y, '#ffe48a')
    }
  }
  for (const pl of places) {
    const [x, y] = at(pl.lat, pl.lon)
    const c = pl.state === 2 ? '#ff5a4a' : pl.state === 1 ? '#ffd84a' : '#8a9aaa'
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) p.set(x + dx, y + dy, c)
    p.set(x, y, pl.state === 2 ? '#fff8e8' : c)
  }
  return p.toCanvas()
}
