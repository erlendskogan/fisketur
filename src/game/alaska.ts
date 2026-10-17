// Petersburg, Alaska: «Little Norway» on Mitkof Island, where Frederick Sound meets the
// Wrangell Narrows. Founded by Norwegian fishermen; halibut, salmon, rockfish and whales.
// Every fish here really lives in the waters of Southeast Alaska.

import type { GearKind, GearLevel, Quest, Species, Zone } from './data'

export const AK_ZONES: Zone[] = [
  { name: 'Tidevannet', from: 0, to: 20, water: ['#2e7f96', '#226a84'], rock: '#5a6e52' },
  { name: 'Kelpskogen', from: 20, to: 60, water: ['#226a84', '#1a5470'], rock: '#4a5c4c' },
  { name: 'Kveitebanken', from: 60, to: 150, water: ['#1a5470', '#173e64'], rock: '#4a4a5e' },
  { name: 'Steinriket', from: 150, to: 300, water: ['#173e64', '#142a58'], rock: '#3c3a58' },
  { name: 'Sundet', from: 300, to: 600, water: ['#142a58', '#0e143a'], rock: '#2a2848' },
  { name: 'Juvet', from: 600, to: 900, water: ['#0e143a', '#07081c'], rock: '#1e1a34' },
]

export const AK_SPECIES: Species[] = [
  // Tidevannet
  {
    id: 'ak_sild', name: 'Stillehavssild', zone: 0, weight: 28, value: 2, cm: [15, 30], kg: [0.05, 0.3], difficulty: 1, behavior: 'calm',
    look: { shape: 'fusiform', len: 13, h: 5, top: '#2a5a8a', mid: '#a8c8dc', belly: '#f0f6f8', fin: '#90b0c4', dorsal: 'low' },
    text: 'Silda som alt annet her lever av. Når den gyter om våren, blir sjøen melkehvit langs hele kysten.',
  },
  {
    id: 'pukkellaks', name: 'Pukkellaks', zone: 0, weight: 22, value: 5, cm: [40, 60], kg: [1, 2.5], difficulty: 2, behavior: 'dart',
    look: { shape: 'fusiform', len: 17, h: 6, top: '#4a6a7a', mid: '#c8d4dc', belly: '#f4f4f0', fin: '#7a8c96', pattern: 'spots', pat: '#1a2028', dorsal: 'low' },
    text: 'Den minste og vanligste laksen i Alaska. Hannene får en stor pukkel på ryggen når de går opp i elva.',
  },
  {
    id: 'dolly', name: 'Dolly Varden', zone: 0, weight: 16, value: 6, cm: [25, 55], kg: [0.3, 2], difficulty: 2, behavior: 'calm',
    look: { shape: 'fusiform', len: 16, h: 6, top: '#4a6a5a', mid: '#b8c8b8', belly: '#f0e8e0', fin: '#c87a6a', pattern: 'spots', pat: '#ff8a9a', dorsal: 'low' },
    text: 'En røye med rosa prikker. Oppkalt etter en kjole i en roman av Charles Dickens, helt sant.',
  },
  {
    id: 'kelpgronn', name: 'Kelpgrønnfisk', zone: 0, weight: 14, value: 5, cm: [25, 50], kg: [0.4, 2], difficulty: 2, behavior: 'calm',
    look: { shape: 'fusiform', len: 17, h: 7, top: '#6a5a4a', mid: '#a08a6a', belly: '#d8c8a8', fin: '#8a7a5a', pattern: 'spots', pat: '#4ab8e8', dorsal: 'spiny' },
    text: 'Hannene er grå med himmelblå flekker. De vokter eggene sine i kelpen og jager vekk alt som kommer nær.',
  },
  {
    id: 'stjerneflyndre', name: 'Stjerneflyndre', zone: 0, weight: 10, value: 8, cm: [30, 60], kg: [0.5, 3], difficulty: 3, behavior: 'sinker',
    look: { shape: 'flat', len: 18, h: 11, top: '#5a5a3e', mid: '#7a7650', belly: '#8a8660', fin: '#f2a83a', pattern: 'mottled', pat: '#3a3424', tail: 'round', dorsal: 'long' },
    text: 'Finnene har oransje og svarte striper. Den kan ha øynene på høyre eller venstre side, akkurat som den vil.',
  },
  {
    id: 'solvlaks', name: 'Sølvlaks', zone: 0, weight: 4, rare: true, time: 'day', value: 22, cm: [50, 75], kg: [2, 6], difficulty: 5, behavior: 'dart',
    look: { shape: 'fusiform', len: 19, h: 7, top: '#2a4a7a', mid: '#d4e0ec', belly: '#f8fafc', fin: '#8aa0b8', pattern: 'spots', pat: '#2a3448', dorsal: 'low' },
    text: 'Coho, sier de her. Hopper høyere enn noen annen laks og kjemper som en villkatt.',
  },

  // Kelpskogen
  {
    id: 'lingcod', name: 'Lingcod', zone: 1, weight: 16, value: 18, cm: [60, 120], kg: [3, 25], difficulty: 4, behavior: 'heavy',
    look: { shape: 'fusiform', len: 25, h: 8, top: '#5a5a3a', mid: '#8a8a5a', belly: '#c8c8a0', fin: '#6a6a42', pattern: 'mottled', pat: '#3a3a22', tail: 'round', dorsal: 'spiny', teeth: true, bigMouth: true },
    text: 'Verken torsk eller lange, men et stort gap med tenner. Noen har blågrønt kjøtt. Det blir hvitt når du steker det.',
  },
  {
    id: 'stillehavstorsk', name: 'Stillehavstorsk', zone: 1, weight: 20, value: 10, cm: [40, 90], kg: [1, 10], difficulty: 3, behavior: 'heavy',
    look: { shape: 'fusiform', len: 22, h: 8, top: '#7a6c4a', mid: '#b8a878', belly: '#ece4cc', fin: '#9a8c62', pattern: 'mottled', pat: '#5a4c30', tail: 'square', dorsal: 'low', barbel: true },
    text: 'Fetteren til torsken hjemme, bare med større hode. Astrid sier den smaker nesten like godt. Nesten.',
  },
  {
    id: 'irsklord', name: 'Red Irish Lord', zone: 1, weight: 12, value: 9, cm: [20, 50], kg: [0.3, 2], difficulty: 3, behavior: 'sinker',
    look: { shape: 'deep', len: 16, h: 8, top: '#a83a2e', mid: '#d8704a', belly: '#f0c0a0', fin: '#c85a3a', pattern: 'mottled', pat: '#5a1e22', tail: 'round', dorsal: 'spiny', eye: 2 },
    text: 'En ulke i rødt, hvitt og brunt, som ligger stille på steinene og ser ut som en del av dem.',
  },
  {
    id: 'ketalaks', name: 'Ketalaks', zone: 1, weight: 14, value: 9, cm: [55, 80], kg: [3, 8], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 21, h: 7, top: '#3a5a5a', mid: '#a8b8a8', belly: '#e8ece0', fin: '#5a6a5a', pattern: 'bars', pat: '#7a4a7a', dorsal: 'low', teeth: true },
    text: 'Når den går opp i elva, får den lilla og grønne striper og store hjørnetenner. Derfor kalles den hundelaks.',
  },
  {
    id: 'rodlaks', name: 'Rødlaks', zone: 1, weight: 10, value: 14, cm: [50, 70], kg: [2, 4], difficulty: 4, behavior: 'dart',
    look: { shape: 'fusiform', len: 18, h: 6, top: '#2a4a8a', mid: '#c8d4e4', belly: '#f4f6fa', fin: '#6a80a8', dorsal: 'low' },
    text: 'Sølvblå i havet, knallrød med grønt hode i elva. Den finner veien tilbake til den samme innsjøen den ble født i.',
  },
  {
    id: 'kongelaks', name: 'Kongelaks', zone: 1, weight: 3, rare: true, value: 80, cm: [70, 120], kg: [7, 30], difficulty: 7, behavior: 'heavy',
    look: { shape: 'fusiform', len: 26, h: 9, top: '#3a5a6a', mid: '#c4d0d8', belly: '#f4f6f6', fin: '#5a6c78', pattern: 'spots', pat: '#141a22', tail: 'square', dorsal: 'low' },
    text: 'Alaskas statsfisk og den største laksen som finnes. Kjennes på det svarte tannkjøttet.',
  },

  // Kveitebanken
  {
    id: 'ak_kveite', name: 'Stillehavskveite', zone: 2, weight: 16, value: 60, cm: [80, 220], kg: [8, 150], difficulty: 6, behavior: 'heavy',
    look: { shape: 'flat', len: 34, h: 17, top: '#4a4a3e', mid: '#6a6a54', belly: '#7a7a62', fin: '#5a5a48', pattern: 'mottled', pat: '#3a3a2e', tail: 'lunate', dorsal: 'long', eye: 2 },
    text: 'Petersburg ble bygd på kveite. Små kalles «chicken», de største «barn door», og noen veier mer enn en elg.',
  },
  {
    id: 'alaskasei', name: 'Alaskasei', zone: 2, weight: 22, value: 5, cm: [30, 70], kg: [0.4, 2], difficulty: 2, behavior: 'calm',
    look: { shape: 'fusiform', len: 18, h: 6, top: '#5a6a5a', mid: '#a8b4a0', belly: '#e8ece4', fin: '#7a8a76', pattern: 'mottled', pat: '#3e4a3e', dorsal: 'low', eye: 2 },
    text: 'Verdens største fiskeri. Det er mest sannsynlig denne fisken som er i fiskepinnene dine.',
  },
  {
    id: 'storrokke', name: 'Storrokke', zone: 2, weight: 10, value: 20, cm: [80, 180], kg: [5, 60], difficulty: 5, behavior: 'sinker',
    look: { shape: 'flat', len: 26, h: 16, top: '#6a5e4a', mid: '#8a7e64', belly: '#9a8e72', fin: '#7a6e56', pattern: 'spots', pat: '#2a2418', tail: 'point', dorsal: 'none', eye: 1 },
    text: 'Den største rokka på kysten. Har to store øyeflekker på vingene for å skremme vekk sjøløver.',
  },
  {
    id: 'kobberuer', name: 'Kobberuer', zone: 2, weight: 14, value: 12, cm: [25, 55], kg: [0.4, 3], difficulty: 3, behavior: 'calm',
    look: { shape: 'deep', len: 17, h: 8, top: '#8a5a3a', mid: '#c88a5a', belly: '#f0d0a8', fin: '#a8683a', pattern: 'mottled', pat: '#f0e0c0', tail: 'square', dorsal: 'spiny', eye: 2 },
    text: 'Kobberbrun med en lys stripe langs siden. Står helt stille mellom steinene og venter på at maten skal komme.',
  },
  {
    id: 'svartuer', name: 'Svart uer', zone: 2, weight: 14, value: 9, cm: [30, 60], kg: [0.5, 4], difficulty: 3, behavior: 'dart',
    look: { shape: 'deep', len: 17, h: 7, top: '#2a2a34', mid: '#4a4a58', belly: '#8a8a98', fin: '#34343e', pattern: 'mottled', pat: '#5a5a6a', tail: 'square', dorsal: 'spiny', eye: 2 },
    text: 'Svømmer i stimer midt i vannet i stedet for å gjemme seg ved bunnen, som de fleste andre uer gjør.',
  },
  {
    id: 'ulveal', name: 'Ulveål', zone: 2, weight: 3, rare: true, time: 'night', value: 75, cm: [100, 240], kg: [5, 18], difficulty: 7, behavior: 'heavy',
    look: { shape: 'eel', len: 34, h: 8, top: '#6a6a72', mid: '#8a8a92', belly: '#b8b4ae', fin: '#7a7a82', pattern: 'spots', pat: '#2a2a32', tail: 'point', dorsal: 'long', teeth: true },
    text: 'Et ansikt bare en mor kan elske. Paret bor i samme hule i hele sitt liv og knuser kråkeboller med kjevene.',
  },

  // Steinriket
  {
    id: 'gulloye', name: 'Gulløye-uer', zone: 3, weight: 14, value: 40, cm: [40, 90], kg: [1, 10], difficulty: 5, behavior: 'calm',
    look: { shape: 'deep', len: 20, h: 10, top: '#e85a2e', mid: '#ff8a4a', belly: '#ffc08a', fin: '#f06a3a', tail: 'square', dorsal: 'spiny', eye: 2, eyeColor: '#ffd84a' },
    text: 'Knallorange med knallgule øyne. Kan bli over hundre år gammel. Noen av dem var unge da Astrid var liten.',
  },
  {
    id: 'piggrygg', name: 'Piggrygg-uer', zone: 3, weight: 16, value: 22, cm: [30, 60], kg: [0.5, 3], difficulty: 4, behavior: 'calm',
    look: { shape: 'deep', len: 17, h: 9, top: '#5a3e2a', mid: '#a8743e', belly: '#e8c07a', fin: '#c8903a', pattern: 'spots', pat: '#ffd06a', tail: 'round', dorsal: 'high', eye: 2 },
    text: 'Har en høy og giftig ryggfinne. Den gjemmer seg i sprekker og flytter seg nesten ikke i hele livet.',
  },
  {
    id: 'tigeruer', name: 'Tiger-uer', zone: 3, weight: 10, value: 30, cm: [30, 60], kg: [0.5, 3], difficulty: 4, behavior: 'sinker',
    look: { shape: 'deep', len: 17, h: 9, top: '#d86a7a', mid: '#f0a0a8', belly: '#f8d0d0', fin: '#e07a8a', pattern: 'bars', pat: '#5a1e2a', tail: 'square', dorsal: 'spiny', eye: 2 },
    text: 'Rosa med mørke tigerstriper. Hver fisk har sin egen hule og jager vekk alle andre.',
  },
  {
    id: 'kinauer', name: 'Kina-uer', zone: 3, weight: 10, value: 28, cm: [25, 45], kg: [0.4, 2], difficulty: 4, behavior: 'calm',
    look: { shape: 'deep', len: 16, h: 8, top: '#1e1e2a', mid: '#2e2e3a', belly: '#4a4a58', fin: '#26262e', pattern: 'line', pat: '#ffd84a', tail: 'round', dorsal: 'spiny', eye: 2 },
    text: 'Svart med en gul stripe som en lynlås. Lever hele livet på den samme steinen.',
  },
  {
    id: 'flekkhavmus', name: 'Flekkhavmus', zone: 3, weight: 12, value: 30, cm: [40, 90], kg: [0.5, 2], difficulty: 4, behavior: 'floater',
    look: { shape: 'chimaera', len: 26, h: 9, top: '#8a6a5a', mid: '#b89a88', belly: '#e8d8c8', fin: '#a88a78', pattern: 'spots', pat: '#f8f0e8', tail: 'point', dorsal: 'high', eye: 3, eyeColor: '#6affb4', glowAt: 'eye', glow: '#6affb4' },
    text: 'Fetteren til havmusa hjemme, med hvite prikker. Øynene lyser grønt i lyset fra lykta.',
  },
  {
    id: 'kortraker', name: 'Kortraker-uer', zone: 3, weight: 2, rare: true, value: 160, cm: [60, 110], kg: [4, 25], difficulty: 8, behavior: 'heavy',
    look: { shape: 'deep', len: 26, h: 12, top: '#c83a3a', mid: '#e86a5a', belly: '#f8b0a0', fin: '#d84a4a', tail: 'square', dorsal: 'spiny', eye: 3 },
    text: 'Den største ueren i Alaska. Noen er over hundre og femti år gamle, eldre enn byen selv.',
  },

  // Sundet
  {
    id: 'sabelfisk', name: 'Sabelfisk', zone: 4, weight: 20, value: 45, cm: [50, 100], kg: [2, 12], difficulty: 5, behavior: 'dart',
    look: { shape: 'fusiform', len: 23, h: 7, top: '#2a2e38', mid: '#4a505e', belly: '#8a92a0', fin: '#363a46', dorsal: 'low', eye: 2 },
    text: 'Fiskerne kaller den «black cod» og kokkene kaller den smør. Den kan bli over nitti år gammel.',
  },
  {
    id: 'pigghaa', name: 'Pigghå', zone: 4, weight: 18, value: 14, cm: [60, 120], kg: [2, 8], difficulty: 4, behavior: 'dart',
    look: { shape: 'shark', len: 30, h: 7, top: '#5a6070', mid: '#7a8090', belly: '#c8ccd4', fin: '#646a7a', pattern: 'spots', pat: '#e8ecf4', tail: 'lunate', dorsal: 'low', eye: 2 },
    text: 'En liten hai med en giftig pigg foran hver ryggfinne. Den kan bli over åtti år gammel.',
  },
  {
    id: 'kjempeskolest', name: 'Kjempeskolest', zone: 4, weight: 14, value: 30, cm: [60, 150], kg: [2, 20], difficulty: 4, behavior: 'floater',
    look: { shape: 'chimaera', len: 30, h: 10, top: '#6a6a70', mid: '#9a9aa0', belly: '#c8c8cc', fin: '#7a7a80', tail: 'point', dorsal: 'high', eye: 3 },
    text: 'Et enormt hode, en rottehale og øyne som et par speil. Den største skolesten i havet.',
  },
  {
    id: 'doverflyndre', name: 'Doverflyndre', zone: 4, weight: 14, value: 24, cm: [30, 70], kg: [0.4, 4], difficulty: 3, behavior: 'sinker',
    look: { shape: 'flat', len: 20, h: 11, top: '#5a4a42', mid: '#7a6a5e', belly: '#8a7a6e', fin: '#6a5a50', pattern: 'mottled', pat: '#3a2e28', tail: 'round', dorsal: 'long' },
    text: 'Glatt og slimete som en såpe. Ligger på den mørke bunnen der det nesten ikke er oksygen.',
  },
  {
    id: 'sovehai', name: 'Stillehavshåkjerring', zone: 4, weight: 2, rare: true, value: 700, cm: [300, 440], kg: [300, 900], difficulty: 9, behavior: 'heavy',
    look: { shape: 'shark', len: 56, h: 14, top: '#3e4250', mid: '#5a5e6c', belly: '#8a8e9a', fin: '#464a58', tail: 'lunate', dorsal: 'low', eyeColor: '#c8f0ff', glowAt: 'eye', glow: '#c8f0ff' },
    text: 'Sovehaien, kaller de den her. Svømmer så sakte at ingen vet hvordan den klarer å fange noe som helst.',
  },

  // Juvet
  {
    id: 'nordlysprikk', name: 'Nordlig lysprikkfisk', zone: 5, weight: 24, value: 40, cm: [5, 13], kg: [0.01, 0.05], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 12, h: 4, top: '#1e2a3c', mid: '#2e4054', belly: '#405870', fin: '#2a3a4e', glow: '#8affd8', glowAt: 'row', eye: 2 },
    text: 'Om natta svømmer den hundrevis av meter opp for å spise, og før det blir lyst er den nede igjen.',
  },
  {
    id: 'stillehavshuggorm', name: 'Stillehavshuggorm', zone: 5, weight: 14, value: 95, cm: [15, 25], kg: [0.03, 0.15], difficulty: 6, behavior: 'dart',
    look: { shape: 'long', len: 22, h: 6, top: '#1a2a3c', mid: '#2e4a60', belly: '#3e5a72', fin: '#2a3e52', glow: '#6ab8ff', glowAt: 'row', teeth: true, bigMouth: true, eye: 1, dorsal: 'low', tail: 'fork' },
    text: 'Huggormfisken fra Stillehavet. Tennene er så lange at de ikke får plass i munnen.',
  },
  {
    id: 'ringbuk', name: 'Ringbuk', zone: 5, weight: 14, value: 70, cm: [10, 30], kg: [0.05, 0.4], difficulty: 4, behavior: 'floater',
    look: { shape: 'chimaera', len: 20, h: 9, top: '#e8a8b4', mid: '#f4c8cc', belly: '#fae0e0', fin: '#f0c0c8', tail: 'point', dorsal: 'long', eye: 1 },
    text: 'Rosa, gjennomsiktig og helt uten skjell. Ringbuker finnes dypere enn noen annen fisk i havet.',
  },
  {
    id: 'solvokse', name: 'Sølvøksefisk', zone: 5, weight: 12, value: 80, cm: [4, 10], kg: [0.01, 0.05], difficulty: 3, behavior: 'floater',
    look: { shape: 'hatchet', len: 12, h: 10, top: '#a8b8c8', mid: '#dce8f2', belly: '#eef6fa', fin: '#b8c8d6', glow: '#8affff', glowAt: 'belly', eye: 2, tail: 'square', dorsal: 'low' },
    text: 'Den samme lille speilfisken som hjemme. Den har svømt hele veien rundt jorda, bare litt saktere enn deg.',
  },
  {
    id: 'langfinnedrage', name: 'Langfinnet dragefisk', zone: 5, weight: 8, value: 220, cm: [20, 40], kg: [0.05, 0.3], difficulty: 7, behavior: 'dart',
    look: { shape: 'long', len: 26, h: 5, top: '#140c18', mid: '#241428', belly: '#2e1a32', fin: '#1e1022', glow: '#ff6a8a', glowAt: 'spots', teeth: true, barbel: true, eye: 1, tail: 'fork', dorsal: 'none' },
    text: 'Den lyser rødt under øyet, et lys nesten ingen andre i dypet kan se. En lommelykt bare for den selv.',
  },
  {
    id: 'tonneoye', name: 'Tønneøye', zone: 5, weight: 2, rare: true, value: 450, cm: [10, 15], kg: [0.05, 0.2], difficulty: 8, behavior: 'floater',
    look: { shape: 'deep', len: 15, h: 8, top: '#3a4a58', mid: '#5a6a78', belly: '#7a8a96', fin: '#c8d8e8', eye: 3, eyeColor: '#8aff8a', glowAt: 'eye', glow: '#8aff8a' },
    text: 'Hodet er gjennomsiktig som en kuppel, og de grønne øynene kan snu seg og se rett opp gjennom det.',
  },

  // the king of Bakke Creek
  {
    id: 'kongen', name: 'Kongen', zone: 1, weight: 0, special: true, value: 0, cm: [140, 140], kg: [44, 44], difficulty: 9, behavior: 'heavy',
    look: { shape: 'fusiform', len: 46, h: 15, top: '#2a4a6a', mid: '#b8c8d4', belly: '#f4f6f8', fin: '#4a5c6c', pattern: 'spots', pat: '#141a22', tail: 'square', dorsal: 'low', eye: 2 },
    text: 'Den første kongelaksen på femti år som vendte hjem til Bakke-elva. Du lot ham gå, og han husket veien.',
  },
]

export const AK_GEAR: Record<GearKind, { title: string; levels: GearLevel[] }> = {
  line: {
    title: 'Snøre',
    levels: [
      { name: 'Monofil', price: 0, value: 20, text: 'Rekker 20 meter ned.' },
      { name: 'Laksesnøre', price: 25, value: 60, text: 'Ned i kelpskogen, 60 meter.' },
      { name: 'Kveitesnøre', price: 90, value: 150, text: 'Tykt nok for en kveite. 150 meter.' },
      { name: 'Dypsnøre', price: 300, value: 300, text: 'Ned i Steinriket, 300 meter.', needs: 'ak_deep', needsText: 'Ray må gi deg lov til å fiske dypt' },
      { name: 'Langline', price: 800, value: 600, text: 'Rekker ned i Sundet. 600 meter.', needs: 'lamp2', needsText: 'Krever dykkerlykt' },
      { name: 'Arnes snøre', price: 0, value: 900, text: 'Snøret Arne brukte på de dypeste kastene. Rekker helt ned i Juvet.', gift: true },
    ],
  },
  rod: {
    title: 'Stang',
    levels: [
      { name: 'Ternens gamle stang', price: 0, value: 0.27, text: 'Litt rusten, men den holder.' },
      { name: 'Laksestang', price: 30, value: 0.33, text: 'Større fangstfelt.' },
      { name: 'Kveitestang', price: 120, value: 0.39, text: 'Stiv og sterk.' },
      { name: 'Arnes trollingstang', price: 480, value: 0.46, text: 'Henger på veggen hos Astrid. Hun selger den bare til familie.', needs: 'ak_sold1', needsText: 'Selg fisk til Astrid først' },
    ],
  },
  reel: {
    title: 'Snelle',
    levels: [
      { name: 'Sveivsnelle', price: 0, value: 1, text: 'Sveiv og håp.' },
      { name: 'Trollingsnelle', price: 40, value: 1.25, text: 'Haler raskere inn.' },
      { name: 'Dyphavssnelle', price: 160, value: 1.5, text: 'Bygd for kveite.' },
      { name: 'Rays elektriske snelle', price: 0, value: 1.85, text: 'Den sveiver av seg selv. Nesten juks.', gift: true },
    ],
  },
  bucket: {
    title: 'Fiskekasse',
    levels: [
      { name: 'Bøtte', price: 0, value: 6, text: 'Plass til 6 fisk.' },
      { name: 'Isboks', price: 25, value: 10, text: 'Plass til 10 fisk.' },
      { name: 'Iskiste', price: 95, value: 16, text: 'Plass til 16 fisk.' },
      { name: 'Lasterommet i Ternen', price: 300, value: 24, text: 'Plass til 24 fisk.' },
    ],
  },
  lure: {
    title: 'Agn',
    levels: [
      { name: 'Sild på krok', price: 0, value: 1, text: 'Det alle fiskerne i Petersburg bruker.' },
      { name: 'Hoochie', price: 35, value: 1.35, text: 'Et blekksprutskjørt av plast. Laksen elsker det.' },
      { name: 'Kveitejigg', price: 140, value: 1.7, text: 'Tung og blank. Enda flere sjeldne fisk.' },
      { name: 'Lysende flasher', price: 450, value: 2.2, text: 'Blinker i dypet. Ingen fisk kan la den være.' },
    ],
  },
  lamp: {
    title: 'Lykt',
    levels: [
      { name: 'Ingen lykt', price: 0, value: 14, text: 'Bare en blank krok.' },
      { name: 'Pannelampe', price: 0, value: 42, text: 'Lyser opp litt i mørket.', gift: true },
      { name: 'Dykkerlykt', price: 200, value: 62, text: 'Ser langt i mørket.', needs: 'lamp1', needsText: 'Krever pannelampe' },
      { name: 'Nordlyslykt', price: 0, value: 88, text: 'Selma bygde den av en hydrofon og en gammel lykt.', gift: true },
    ],
  },
}

export const AK_QUESTS: Quest[] = [
  { id: 'a1', title: 'Fang tre fisk', goal: { kind: 'catch', n: 3 }, money: 8 },
  { id: 'a2', title: 'Fang en pukkellaks', goal: { kind: 'species', id: 'pukkellaks', n: 1 }, money: 10 },
  { id: 'a3', title: 'Selg fisk for $40', goal: { kind: 'sell', kr: 40 }, money: 15 },
  { id: 'a4', title: 'Fang tre ulike arter i Kelpskogen', goal: { kind: 'distinct', zone: 1, n: 3 }, money: 30 },
  { id: 'a5', title: 'Fang en lingcod', goal: { kind: 'species', id: 'lingcod', n: 1 }, money: 35 },
  { id: 'a6', title: 'Slipp ut tre fisk', goal: { kind: 'release', n: 3 }, money: 20 },
  { id: 'a7', title: 'Fang en stillehavskveite', goal: { kind: 'species', id: 'ak_kveite', n: 1 }, unlock: 'ak_deep', reward: 'Dypsnøre hos Astrid' },
  { id: 'a8', title: 'Fang to fisk om natta', goal: { kind: 'night', n: 2 }, money: 35 },
  { id: 'a9', title: 'Fang en fisk på over 20 kg', goal: { kind: 'heavy', kg: 20 }, money: 60 },
  { id: 'a10', title: 'Fang en gulløye-uer', goal: { kind: 'species', id: 'gulloye', n: 1 }, money: 50 },
  { id: 'a11', title: 'Fem perfekte fangster', goal: { kind: 'perfect', n: 5 }, money: 60 },
  { id: 'a12', title: 'Finn en skattekiste', goal: { kind: 'treasure', n: 1 }, money: 50 },
  { id: 'a13', title: 'Fang ti fisk i Sundet', goal: { kind: 'zone', zone: 4, n: 10 }, money: 150 },
  { id: 'a14', title: 'Fang en stillehavshåkjerring', goal: { kind: 'species', id: 'sovehai', n: 1 }, unlock: 'gift:reel:3', reward: 'Rays elektriske snelle' },
  { id: 'a15', title: 'Selg fisk for $3000', goal: { kind: 'sell', kr: 3000 }, unlock: 'ak_goldpaint', reward: 'Gullmaling til Ternen' },
  { id: 'a16', title: 'Fang en tønneøye', goal: { kind: 'species', id: 'tonneoye', n: 1 }, money: 400 },
]

export const AK_BOOK_REWARDS: { n: number; text: string; money?: number; gift?: [GearKind, number]; flag?: string }[] = [
  { n: 5, text: 'Pannelampe', gift: ['lamp', 1] },
  { n: 10, text: '$80', money: 80 },
  { n: 18, text: '$200', money: 200 },
  { n: 26, text: 'Nordlyslykt', gift: ['lamp', 3] },
  { n: 33, text: 'Selmas Alaska-medalje', flag: 'ak_medal' },
]

export const AK_PAINTS: { id: string; name: string; hull: string; stripe: string; price: number; needs?: string }[] = [
  { id: 'ak_hvit', name: 'Hvit og grønn', hull: '#ece8dc', stripe: '#3a7a5a', price: 0 },
  { id: 'ak_laks', name: 'Laksrød', hull: '#d8584a', stripe: '#f0e6cc', price: 40 },
  { id: 'ak_is', name: 'Isblå', hull: '#8ac4e0', stripe: '#2a4a7a', price: 40 },
  { id: 'ak_gran', name: 'Granskog', hull: '#2e5a42', stripe: '#e8d090', price: 40 },
  { id: 'ak_gull', name: 'Gull', hull: '#f2c24a', stripe: '#8a5a2a', price: 0, needs: 'ak_goldpaint' },
]

/** Where Selma's hydrophones go, in metres */
export const HYDRO_DEPTHS = [30, 100, 250, 600]
