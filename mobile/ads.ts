// Native side of the optional reward ads (the game side is src/platform/ads.ts).
// The game only ever asks "show one, did they watch it?"; loading, consent and the
// AdMob SDK stay here. Expo Go has no AdMob module, so there the game simply gets no ads.
//
// Until the app has its own AdMob account these are Google's test ids: TestFlight builds
// show test ads and earn nothing. To go live, put the app's ad unit id in REWARDED_UNIT
// and its app id in the react-native-google-mobile-ads plugin in app.json.

type Ads = typeof import('react-native-google-mobile-ads')

const REWARDED_UNIT: string | null = null

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
  ad = ads.RewardedAd.createForAdRequest(REWARDED_UNIT ?? ads.TestIds.REWARDED, { requestNonPersonalizedAdsOnly: true })
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
