// Save games for the takes: a player some hours in, so the HUD, the gear and the book look lived-in

/** Every arrival scene and first meeting already seen, so a take starts without dialogue */
export const SEEN = {
  metMarit: true,
  metHalvor: true,
  metKnut: true,
  welcomedHome: true,
  ak_moved: true,
  hi_moved: true,
  lo_moved: true,
  va_moved: true,
  va_invite: true,
  ak_metAstrid: true,
  ak_metRay: true,
  hi_metLeilani: true,
  hi_metKimo: true,
  lo_metIngvild: true,
  lo_metJohan: true,
  va_metNadja: true,
  va_metBrita: true,
  // story beats that would otherwise pop up as toasts mid-take
  selma: true,
  metSelma: true,
  ak_selma: true,
  catPending: true,
}

/** Species ids in the book, each caught once */
export const book = (ids) => Object.fromEntries(ids.map((id) => [id, { n: 1 + (id.length % 4), best: 40 + id.length * 7 }]))

export function save(extra = {}) {
  const { flags, gear, ...rest } = extra
  return {
    money: 1840,
    time: 0.66,
    day: 3,
    sound: true,
    world: 'norge',
    paint: 'hvit',
    flags: { ...SEEN, ...flags },
    gear: { line: 2, rod: 2, reel: 1, bucket: 2, lure: 1, lamp: 0, ...gear },
    // Vardø keeps its own state; the game fills in what is missing
    va: {},
    ...rest,
  }
}
