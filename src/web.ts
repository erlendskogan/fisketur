// Entry for the web page (GitHub Pages / home-screen app). The iOS app mounts the game itself.

import '@fontsource/jersey-10/index.css'

import { SPECIES_BY_ID } from './game/data'
import { mountGame } from './main'
import { watchForUpdates } from './update'

const game = mountGame()

// dev-only: console handles and the preview panel (Vite leaves these out of the build)
if (import.meta.env.DEV) {
  Object.assign(window, { __game: game, __species: SPECIES_BY_ID })
  import('./dev/panel')
}

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(() => {})
watchForUpdates()
