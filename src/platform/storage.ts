// Where the save game lives. The web page keeps it in localStorage; the iOS app swaps in
// native storage with setSaveStore() before the game starts (mobile/components/Game.tsx).

export interface SaveStore {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

const browser: SaveStore = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
  remove: (key) => localStorage.removeItem(key),
}

let store = browser

export const saveStore = () => store

export function setSaveStore(s: SaveStore) {
  store = s
}
