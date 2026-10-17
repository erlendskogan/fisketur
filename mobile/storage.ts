// Native side of the game's save store (the web view side is in components/Game.tsx).
// The web view can reload at any time, from "Start et nytt spill" or when iOS reclaims its
// memory, and then reads everything back from here, so this also keeps an in-memory copy
// that is updated before the disk write: a reload never sees an older save than the last one.

import AsyncStorage from '@react-native-async-storage/async-storage'

let data: Record<string, string> = {}
let loading: Promise<Record<string, string>> | null = null

export function loadStorage() {
  loading ??= (async () => {
    const pairs = await AsyncStorage.multiGet(await AsyncStorage.getAllKeys())
    for (const [key, value] of pairs) if (value != null) data[key] = value
    return data
  })()
  return loading
}

export async function writeStorage(key: string, value: string | null) {
  if (value == null) {
    delete data[key]
    await AsyncStorage.removeItem(key)
  } else {
    data[key] = value
    await AsyncStorage.setItem(key, value)
  }
}
