import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'

import Game from './components/Game'

export default function App() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Game dom={{ style: styles.game }} />
    </View>
  )
}

const styles = StyleSheet.create({
  // the game's own night colour, so nothing white flashes while the web view loads
  root: { flex: 1, backgroundColor: '#141642' },
  game: { flex: 1 },
})
