// Optional reward ads. The web page has none; the iOS app plugs in AdMob with setAdPlayer()
// before the game starts (mobile/components/Game.tsx, native side in mobile/ads.ts).

export interface AdPlayer {
  /** Plays one reward ad; true when it was watched to the end */
  show(): Promise<boolean>
  /** Google's form where the player can change their ad consent (required in the EEA) */
  privacy(): Promise<void>
}

let player: AdPlayer | null = null

export const adsOn = () => !!player

export function setAdPlayer(p: AdPlayer) {
  player = p
}

export async function adPrivacy() {
  try {
    await player?.privacy()
  } catch {
    /* no form to show */
  }
}

export async function playAd() {
  if (!player) return false
  try {
    return await player.show()
  } catch {
    return false
  }
}
