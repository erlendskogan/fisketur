// Entry for the web page (GitHub Pages / home-screen app). The iOS app mounts the game itself.

import '@fontsource/jersey-10/index.css'

import { mountGame } from './main'
import { watchForUpdates } from './update'

mountGame()

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(() => {})
watchForUpdates()
