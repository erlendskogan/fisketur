import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

import Game from './components/Game'
import { loadStorage, writeStorage } from './storage'

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Screen />
    </SafeAreaProvider>
  )
}

function Screen() {
  // The game draws edge to edge, behind the notch and home indicator, and pads its own
  // HUD and buttons; it only needs to know how much.
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Game
        insets={{ top: insets.top, bottom: insets.bottom }}
        loadStorage={loadStorage}
        writeStorage={writeStorage}
        dom={{
          style: styles.game,
          contentInsetAdjustmentBehavior: 'never',
          scrollEnabled: false,
          bounces: false,
          showsVerticalScrollIndicator: false,
          showsHorizontalScrollIndicator: false,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // the game's own night colour, so nothing white flashes while the web view loads
  root: { flex: 1, backgroundColor: '#141642' },
  game: { flex: 1 },
})
