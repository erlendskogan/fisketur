'use dom'

// Runs inside the web view: this is the same game as the web page, mounted on its own DOM.

import { useEffect } from 'react'
import type { DOMProps } from 'expo/dom'

import { mountGame } from '../../src/main'
import { setAdPlayer } from '../../src/platform/ads'
import { setSaveStore } from '../../src/platform/storage'

// Metro does not copy files referenced by url() in CSS into the app, so the font the web
// page gets from @fontsource's CSS is required here instead, which Metro does bundle.
// The latin subset covers everything the game writes, æøå included.
const fontFile: string | { uri: string } = require('@fontsource/jersey-10/files/jersey-10-latin-400-normal.woff2')

async function loadFont() {
  const url = typeof fontFile === 'string' ? fontFile : fontFile.uri
  try {
    const face = new FontFace('Jersey 10', `url(${url})`)
    document.fonts.add(await face.load())
  } catch {
    /* falls back to monospace, like the web page would */
  }
}

type Props = {
  dom?: DOMProps
  /** Notch and home indicator, measured natively */
  insets: { top: number; bottom: number }
  /** Native storage (mobile/storage.ts); these run in the app, not in the web view */
  loadStorage: () => Promise<Record<string, string>>
  writeStorage: (key: string, value: string | null) => Promise<void>
  /** Whether this build can show reward ads (not in Expo Go) */
  ads: boolean
  /** Native AdMob (mobile/ads.ts): true when the ad was watched to the end */
  showRewardedAd: () => Promise<boolean>
}

/** The game reads its save synchronously, so fetch it all from the app before starting */
async function connectNativeStorage({ loadStorage, writeStorage }: Props) {
  const data = await loadStorage().catch(() => null)
  // could not read the save: play on in the web view's own storage rather than overwrite it
  if (!data) return
  setSaveStore({
    get: (key) => data[key] ?? null,
    set: (key, value) => {
      data[key] = value
      writeStorage(key, value)
    },
    remove: (key) => {
      delete data[key]
      writeStorage(key, null)
    },
  })
}

// Effects run twice in development (React strict mode); the game must only start once
let mounted = false

export default function Game(props: Props) {
  const { insets } = props
  useEffect(() => {
    // style.css reads env(safe-area-inset-*) into these, which is 0 in the app's web view
    const root = document.documentElement.style
    root.setProperty('--safe-top', `${insets.top}px`)
    root.setProperty('--safe-bot', `${insets.bottom}px`)
  }, [insets.top, insets.bottom])

  useEffect(() => {
    if (mounted) return
    mounted = true
    // the page already has user-scalable=no; this also stops iOS pinch gestures
    document.addEventListener('gesturestart', (e) => e.preventDefault())
    if (props.ads) setAdPlayer({ show: props.showRewardedAd })
    Promise.all([loadFont(), connectNativeStorage(props)]).then(() => mountGame())
  }, [])
  return null
}
