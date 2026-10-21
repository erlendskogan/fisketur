// Native side of the optional reward ads (the game side is src/platform/ads.ts).
// The game only ever asks "show one, did they watch it?"; loading, consent and the
// AdMob SDK stay here. Expo Go has no AdMob module, so there the game simply gets no ads.
//
// Real ads only in builds made with the "store" profile (eas.json), which sets
// EXPO_PUBLIC_ADS_LIVE. Every other build, TestFlight included, gets Google's test ads:
// watching your own real ads counts as invalid traffic and can close the AdMob account.

type Ads = typeof import('react-native-google-mobile-ads')

const LIVE = process.env.EXPO_PUBLIC_ADS_LIVE === '1'
const REWARDED_UNIT = 'ca-app-pub-3475938586108487/7952897153'

let ads: Ads | null = null
try {
  ads = require('react-native-google-mobile-ads')
} catch {
  /* Expo Go */
}

type Rewarded = import('react-native-google-mobile-ads').RewardedAd
let ad: Rewarded | null = null
let started: Promise<boolean> | null = null

/** Consent (GDPR) and SDK start, once; resolves whether ads may be requested */
function start() {
  started ??= (async () => {
    if (!ads) return false
    try {
      const info = await ads.AdsConsent.gatherConsent()
      if (!info.canRequestAds) return false
    } catch {
      /* no consent form configured (test ids): ads are still non-personalised */
    }
    await ads.default().initialize()
    return true
  })().catch(() => false)
  return started
}

/** Keep one ad loaded so the button can play it at once */
function preload() {
  if (!ads || ad) return
  ad = ads.RewardedAd.createForAdRequest(LIVE ? REWARDED_UNIT : ads.TestIds.REWARDED, { requestNonPersonalizedAdsOnly: true })
  const a = ad
  a.addAdEventListener(ads.AdEventType.ERROR, () => {
    // try again later; a failed ad is never shown
    if (ad === a) ad = null
  })
  a.load()
}

export async function initAds() {
  if (await start()) preload()
}

export const adsAvailable = () => !!ads

/** Plays a reward ad; true when it was watched to the end */
export async function showRewardedAd(): Promise<boolean> {
  if (!ads || !(await start())) return false
  const m = ads
  preload()
  const a = ad!
  return new Promise<boolean>((resolve) => {
    let earned = false
    let over = false
    // no ad within ten seconds: give up rather than leave the player waiting
    const wait = setTimeout(() => done(false), 10000)
    const offs: (() => void)[] = []
    const done = (ok: boolean) => {
      if (over) return
      over = true
      clearTimeout(wait)
      offs.forEach((off) => off())
      if (ad === a) ad = null
      preload()
      resolve(ok)
    }
    const play = () => {
      clearTimeout(wait)
      a.show().catch(() => done(false))
    }
    offs.push(a.addAdEventListener(m.RewardedAdEventType.EARNED_REWARD, () => (earned = true)))
    offs.push(a.addAdEventListener(m.AdEventType.CLOSED, () => done(earned)))
    offs.push(a.addAdEventListener(m.AdEventType.ERROR, () => done(false)))
    if (a.loaded) play()
    else offs.push(a.addAdEventListener(m.RewardedAdEventType.LOADED, play))
  })
}
