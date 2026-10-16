'use dom'

// Runs inside the web view: this is the same game as the web page, mounted on its own DOM.

import { useEffect } from 'react'
import type { DOMProps } from 'expo/dom'

import { mountGame } from '../../src/main'

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
}

// Effects run twice in development (React strict mode); the game must only start once
let mounted = false

export default function Game({ insets }: Props) {
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
    loadFont().then(() => mountGame())
  }, [])
  return null
}
