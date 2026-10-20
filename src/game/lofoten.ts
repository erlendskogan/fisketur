// Henningsvær in Lofoten, in the middle of winter: the skrei season, when the cod come in
// from the Barents Sea to spawn in Vestfjorden, as they have done for a thousand years.
// Every fish here really lives in the waters around Lofoten.

import type { GearKind, GearLevel, Quest, Species, Zone } from './data'

export const LO_ZONES: Zone[] = [
  { name: 'Fjæra', from: 0, to: 15, water: ['#2a7a8a', '#22667a'], rock: '#5a6470' },
  { name: 'Tarebeltet', from: 15, to: 60, water: ['#22667a', '#1a4e6a'], rock: '#4c5664' },
  { name: 'Vestfjorden', from: 60, to: 200, water: ['#1a4e6a', '#16385e'], rock: '#3e4658' },
  { name: 'Korallrevet', from: 200, to: 350, water: ['#16385e', '#122650'], rock: '#343a50' },
  { name: 'Eggakanten', from: 350, to: 800, water: ['#122650', '#0c1436'], rock: '#262842' },
  { name: 'Norskehavet', from: 800, to: 1200, water: ['#0c1436', '#06081c'], rock: '#1c1a32' },
]

export const LO_SPECIES: Species[] = [
  // Fjæra
  {
    id: 'ulke', name: 'Ulke', zone: 0, weight: 22, value: 8, cm: [15, 40], kg: [0.1, 1], difficulty: 2, behavior: 'sinker',
    look: { shape: 'angler', len: 15, h: 8, top: '#5a5040', mid: '#8a7a5a', belly: '#d8c8a0', fin: '#6a5a44', pattern: 'mottled', pat: '#3a3226', tail: 'round', dorsal: 'spiny', eye: 2 },
    text: 'Et stort hode og mange pigger. Den blåser seg opp og grynter når du drar den opp. Barna i fjæra er livredde for den.',
  },
  {
    id: 'tangkvabbe', name: 'Ålekvabbe', zone: 0, weight: 16, value: 10, cm: [20, 45], kg: [0.1, 0.5], difficulty: 2, behavior: 'calm',
    look: { shape: 'eel', len: 20, h: 6, top: '#7a6a3a', mid: '#a8984a', belly: '#e8d890', fin: '#8a7a42', pattern: 'mottled', pat: '#4a3e22', tail: 'point', dorsal: 'long' },
    text: 'En av de få fiskene som føder levende unger. Mora bærer dem i magen hele vinteren.',
  },
  {
    id: 'tangsprell', name: 'Tangsprell', zone: 0, weight: 14, value: 7, cm: [10, 25], kg: [0.02, 0.1], difficulty: 2, behavior: 'dart',
    look: { shape: 'eel', len: 16, h: 4, top: '#8a5a2a', mid: '#c8884a', belly: '#f0c890', fin: '#a8683a', pattern: 'spots', pat: '#1e1418', tail: 'round', dorsal: 'long' },
    text: 'Glatt som såpe og med en rad svarte prikker langs ryggen. Den vrir seg ut av hånda di før du rekker å se den.',
  },
  {
    id: 'sandflyndre', name: 'Sandflyndre', zone: 0, weight: 16, value: 12, cm: [20, 35], kg: [0.1, 0.6], difficulty: 2, behavior: 'sinker',
    look: { shape: 'flat', len: 16, h: 10, top: '#8a7a5a', mid: '#a8987a', belly: '#b8a88a', fin: '#9a8a6a', pattern: 'mottled', pat: '#6a5a40', tail: 'round', dorsal: 'long' },
    text: 'Ru som sandpapir på oversiden. Den graver seg ned i sanden så bare øynene stikker opp.',
  },
  {
    id: 'rognkall', name: 'Rognkall', zone: 0, weight: 10, value: 18, cm: [20, 40], kg: [0.5, 3], difficulty: 3, behavior: 'sinker',
    look: { shape: 'round', len: 14, h: 12, top: '#3a6a8a', mid: '#5a8aa8', belly: '#e86a3a', fin: '#4a7a98', pattern: 'spots', pat: '#2a4a68', tail: 'round', dorsal: 'none' },
    text: 'Hannen til rognkjeksen, med knallrød mage om vinteren. Han suger seg fast på en stein og vokter eggene alene.',
  },
  {
    id: 'laks', name: 'Atlantisk laks', zone: 0, weight: 4, rare: true, time: 'day', value: 90, cm: [50, 100], kg: [2, 12], difficulty: 6, behavior: 'dart',
    look: { shape: 'fusiform', len: 22, h: 8, top: '#3a5a7a', mid: '#c8d4e0', belly: '#f6f8fa', fin: '#5a6c80', pattern: 'spots', pat: '#1e2430', tail: 'square', dorsal: 'low' },
    text: 'Villaksen. Den svømmer over hele Norskehavet og finner tilbake til elva den ble født i.',
  },

  // Tarebeltet
  {
    id: 'skrei', name: 'Skrei', zone: 1, weight: 30, value: 40, cm: [60, 130], kg: [3, 25], difficulty: 4, behavior: 'heavy',
    look: { shape: 'fusiform', len: 26, h: 9, top: '#6a6440', mid: '#c8bc8a', belly: '#f4eedc', fin: '#8a8458', pattern: 'mottled', pat: '#4a4428', tail: 'square', dorsal: 'low', barbel: true },
    text: 'Torsken som vandrer tusen kilometer fra Barentshavet for å gyte her. Det er den Lofoten er bygd på.',
  },
  {
    id: 'hyse', name: 'Hyse', zone: 1, weight: 18, value: 22, cm: [30, 70], kg: [0.4, 4], difficulty: 3, behavior: 'calm',
    look: { shape: 'fusiform', len: 20, h: 7, top: '#4a4a52', mid: '#a8acb4', belly: '#eceef2', fin: '#3e3e46', pattern: 'line', pat: '#1e1e26', tail: 'square', dorsal: 'high', barbel: true },
    text: 'Har en svart flekk bak gjellene. Folk sier det er fingeravtrykket til Peter, han som fisket i Bibelen.',
  },
  {
    id: 'hvitting', name: 'Hvitting', zone: 1, weight: 16, value: 14, cm: [25, 50], kg: [0.2, 1.5], difficulty: 2, behavior: 'dart',
    look: { shape: 'fusiform', len: 18, h: 6, top: '#8a8a7a', mid: '#d4d4c8', belly: '#f6f6f0', fin: '#9a9a8a', tail: 'square', dorsal: 'low' },
    text: 'En sølvblank liten torskefisk med en mørk flekk ved brystfinnen. Den jager småsild i store flokker.',
  },
  {
    id: 'steinbit', name: 'Gråsteinbit', zone: 1, weight: 12, value: 36, cm: [50, 120], kg: [2, 15], difficulty: 5, behavior: 'heavy',
    look: { shape: 'eel', len: 28, h: 9, top: '#5a6068', mid: '#8a9098', belly: '#c8ccd0', fin: '#6a7078', pattern: 'bars', pat: '#2e3238', tail: 'round', dorsal: 'long', teeth: true },
    text: 'Tenner som en skiftenøkkel. Den knuser skjell og kråkeboller, og den mister tennene og får nye hvert år.',
  },
  {
    id: 'knurr', name: 'Knurr', zone: 1, weight: 10, value: 20, cm: [20, 45], kg: [0.2, 1], difficulty: 3, behavior: 'sinker',
    look: { shape: 'deep', len: 16, h: 7, top: '#8a6a5a', mid: '#b8988a', belly: '#e8d8c8', fin: '#d86a5a', pattern: 'spots', pat: '#f0e8e0', tail: 'square', dorsal: 'spiny', eye: 2 },
    text: 'Den går på bunnen på tre par fingre under brystet, og den knurrer når du drar den opp. Derav navnet.',
  },
  {
    id: 'kveite_lo', name: 'Lofotkveite', zone: 1, weight: 3, rare: true, value: 320, cm: [80, 230], kg: [10, 160], difficulty: 8, behavior: 'heavy',
    look: { shape: 'flat', len: 36, h: 18, top: '#3e4038', mid: '#5e6050', belly: '#6e705e', fin: '#4e5044', pattern: 'mottled', pat: '#2e3028', tail: 'lunate', dorsal: 'long', eye: 2 },
    text: 'Kveita som følger skreien inn i Vestfjorden for å spise. Bestefar fikk en på åtti kilo i 1961, og han har fortalt om den siden.',
  },

  // Vestfjorden
  {
    id: 'lysing', name: 'Lysing', zone: 2, weight: 16, value: 30, cm: [40, 100], kg: [0.5, 8], difficulty: 4, behavior: 'dart',
    look: { shape: 'fusiform', len: 22, h: 7, top: '#6a6a7a', mid: '#b8b8c8', belly: '#eeeef4', fin: '#7a7a8a', tail: 'square', dorsal: 'long', teeth: true, bigMouth: true },
    text: 'Gapet er svart på innsiden. Den jager i mørket og spiser mest om natta.',
  },
  {
    id: 'kolmule', name: 'Kolmule', zone: 2, weight: 20, value: 10, cm: [20, 40], kg: [0.1, 0.5], difficulty: 2, behavior: 'dart',
    look: { shape: 'fusiform', len: 15, h: 5, top: '#4a5a7a', mid: '#a8b4c8', belly: '#eaeef4', fin: '#5a6a88', tail: 'fork', dorsal: 'low', eye: 2 },
    text: 'En av de mest tallrike fiskene i Norskehavet. Den svømmer i enorme stimer som vises på ekkoloddet som skyer.',
  },
  {
    id: 'lusuer', name: 'Lusuer', zone: 2, weight: 14, value: 26, cm: [15, 35], kg: [0.1, 0.6], difficulty: 3, behavior: 'calm',
    look: { shape: 'deep', len: 15, h: 7, top: '#d84a3a', mid: '#f07a5a', belly: '#ffc0a8', fin: '#e85a4a', pattern: 'bars', pat: '#a82a2a', tail: 'square', dorsal: 'spiny', eye: 2 },
    text: 'Den minste ueren. Den føder levende unger, tusenvis på en gang, som en hel sky av rødt.',
  },
  {
    id: 'gapeflyndre', name: 'Gapeflyndre', zone: 2, weight: 14, value: 18, cm: [20, 45], kg: [0.1, 1], difficulty: 3, behavior: 'sinker',
    look: { shape: 'flat', len: 18, h: 10, top: '#a8886a', mid: '#c8a888', belly: '#d8b898', fin: '#b8987a', tail: 'round', dorsal: 'long', bigMouth: true },
    text: 'En flyndre med et uvanlig stort gap. Den spiser reker og børstemark på den mudrete bunnen.',
  },
  {
    id: 'smorflyndre', name: 'Smørflyndre', zone: 2, weight: 10, value: 32, cm: [25, 50], kg: [0.2, 1.5], difficulty: 4, behavior: 'sinker',
    look: { shape: 'flat', len: 19, h: 10, top: '#9a8a7a', mid: '#b8a898', belly: '#c8b8a8', fin: '#8a7a6a', tail: 'round', dorsal: 'long', eye: 2 },
    text: 'Tynn og glatt, og med et kjøtt så mildt at den har fått navn etter smør.',
  },
  {
    id: 'flekksteinbit', name: 'Flekksteinbit', zone: 2, weight: 3, rare: true, value: 180, cm: [60, 140], kg: [3, 25], difficulty: 7, behavior: 'heavy',
    look: { shape: 'eel', len: 30, h: 10, top: '#7a7a6a', mid: '#9a9a88', belly: '#c8c8b8', fin: '#6a6a5a', pattern: 'spots', pat: '#2a2a22', tail: 'round', dorsal: 'long', teeth: true },
    text: 'Steinbiten med leopardflekker. Den er blitt sjelden, og fiskerne setter den ut igjen når de får den.',
  },

  // Korallrevet
  {
    id: 'blaalange', name: 'Blålange', zone: 3, weight: 14, value: 48, cm: [70, 150], kg: [2, 15], difficulty: 5, behavior: 'heavy',
    look: { shape: 'eel', len: 32, h: 6, top: '#4a5a6a', mid: '#7a8a98', belly: '#c8d0d8', fin: '#5a6a7a', tail: 'round', dorsal: 'long', barbel: true },
    text: 'Langens blågrå fetter fra de dype bankene. Den kan bli tretti år gammel.',
  },
  {
    id: 'snabeluer', name: 'Snabeluer', zone: 3, weight: 16, value: 42, cm: [30, 55], kg: [0.5, 2.5], difficulty: 4, behavior: 'calm',
    look: { shape: 'deep', len: 18, h: 8, top: '#e83a3a', mid: '#ff6a5a', belly: '#ffa898', fin: '#f04a4a', tail: 'square', dorsal: 'spiny', eye: 3, beak: true },
    text: 'En dyphavsuer med en liten pigg på haka, som en nese. Den står i stimer over korallrevet.',
  },
  {
    id: 'kloskate', name: 'Kloskate', zone: 3, weight: 12, value: 34, cm: [40, 90], kg: [1, 6], difficulty: 4, behavior: 'sinker',
    look: { shape: 'flat', len: 22, h: 14, top: '#7a6a5a', mid: '#9a8a7a', belly: '#c8baa8', fin: '#8a7a6a', pattern: 'spots', pat: '#e8dcc8', tail: 'point', dorsal: 'none' },
    text: 'En rokke med torner langs hele ryggen. Eggene ligger i svarte kapsler som folk langs kysten kaller havfruepunger.',
  },
  {
    id: 'haagjel', name: 'Hågjel', zone: 3, weight: 12, value: 30, cm: [40, 80], kg: [0.4, 2], difficulty: 4, behavior: 'dart',
    look: { shape: 'shark', len: 24, h: 6, top: '#8a6a52', mid: '#a88a6e', belly: '#e0d0c0', fin: '#7a5c46', pattern: 'spots', pat: '#4a3424', tail: 'lunate', dorsal: 'low', eye: 2 },
    text: 'En liten hai med flekker og svart munn innvendig. Den lever ved Røstrevet, verdens største kaldtvannskorallrev.',
  },
  {
    id: 'brosme_lo', name: 'Brosme', zone: 3, weight: 14, value: 34, cm: [40, 90], kg: [1, 8], difficulty: 3, behavior: 'sinker',
    look: { shape: 'fusiform', len: 22, h: 8, top: '#7a5a3a', mid: '#a87a4e', belly: '#e8cc98', fin: '#8a6440', tail: 'round', dorsal: 'long', barbel: true },
    text: 'Den samme rolige brosmen som hjemme. Her henger den til tørk på hjellene ved siden av skreien.',
  },
  {
    id: 'havaal', name: 'Havål', zone: 3, weight: 3, rare: true, time: 'night', value: 220, cm: [100, 250], kg: [5, 60], difficulty: 8, behavior: 'heavy',
    look: { shape: 'eel', len: 40, h: 8, top: '#3a3a44', mid: '#5a5a66', belly: '#9a9aa4', fin: '#44444e', tail: 'point', dorsal: 'long', teeth: true },
    text: 'En ål tykk som en arm og lang som en båt. Den bor i hull i revet og kommer ut om natta.',
  },

  // Eggakanten
  {
    id: 'isgalt', name: 'Isgalt', zone: 4, weight: 16, value: 50, cm: [40, 100], kg: [0.5, 4], difficulty: 4, behavior: 'floater',
    look: { shape: 'chimaera', len: 26, h: 9, top: '#6a6a74', mid: '#9a9aa4', belly: '#c8c8d0', fin: '#7a7a84', tail: 'point', dorsal: 'high', eye: 3, barbel: true },
    text: 'En skolest fra det iskalde vannet på kanten av sokkelen. Halen er bare en tynn tråd.',
  },
  {
    id: 'svarthaa', name: 'Svarthå', zone: 4, weight: 16, value: 60, cm: [20, 60], kg: [0.2, 1], difficulty: 4, behavior: 'dart',
    look: { shape: 'shark', len: 22, h: 5, top: '#2a2a32', mid: '#3a3a44', belly: '#1a1a22', fin: '#2a2a32', glow: '#8affd8', glowAt: 'belly', tail: 'lunate', dorsal: 'low', eye: 2 },
    text: 'En lyshai. Magen lyser svakt grønt, så den forsvinner mot det lille lyset ovenfra.',
  },
  {
    id: 'ringbuk_lo', name: 'Polarringbuk', zone: 4, weight: 10, value: 70, cm: [10, 30], kg: [0.05, 0.5], difficulty: 4, behavior: 'floater',
    look: { shape: 'chimaera', len: 18, h: 9, top: '#d8b8c0', mid: '#ecd0d4', belly: '#f8e8ea', fin: '#e0c4ca', tail: 'point', dorsal: 'long', eye: 1 },
    text: 'Myk som gelé og nesten gjennomsiktig. Den lever i kaldt vann der det ikke finnes noen annen fisk som ligner.',
  },
  {
    id: 'blaasteinbit', name: 'Blåsteinbit', zone: 4, weight: 12, value: 70, cm: [60, 140], kg: [3, 20], difficulty: 6, behavior: 'heavy',
    look: { shape: 'eel', len: 30, h: 10, top: '#3a4a6a', mid: '#5a6a8a', belly: '#9aa4b8', fin: '#2e3a58', pattern: 'mottled', pat: '#24304a', tail: 'round', dorsal: 'long', teeth: true },
    text: 'Den største og blåeste steinbiten. Den lever i det kalde dypet og er like myk som den er stygg.',
  },
  {
    id: 'habrann', name: 'Håbrann', zone: 4, weight: 2, rare: true, value: 800, cm: [150, 300], kg: [60, 200], difficulty: 9, behavior: 'heavy',
    look: { shape: 'shark', len: 52, h: 15, top: '#3a4a5a', mid: '#5a6a7a', belly: '#e8eef4', fin: '#34424e', tail: 'lunate', dorsal: 'high', eye: 2 },
    text: 'Makrellhaien fra Norskehavet. Den er varmblodig, og den jager makrell og sild i full fart.',
  },

  // Norskehavet
  {
    id: 'esmark', name: 'Ulvefisk', zone: 5, weight: 18, value: 120, cm: [30, 70], kg: [0.4, 2], difficulty: 5, behavior: 'sinker',
    look: { shape: 'eel', len: 28, h: 7, top: '#6a5a4a', mid: '#8a7a68', belly: '#c8b8a0', fin: '#5a4a3a', pattern: 'bars', pat: '#3a2e24', tail: 'round', dorsal: 'long' },
    text: 'Den største ålebrosmen i nord, og latinnavnet har den etter den norske zoologen Esmark. Den spiser nesten bare slangestjerner.',
  },
  {
    id: 'nordlyslykt', name: 'Nordlig lysprikkfisk', zone: 5, weight: 22, value: 90, cm: [4, 10], kg: [0.01, 0.03], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 11, h: 4, top: '#1e2a3c', mid: '#2e4054', belly: '#405870', fin: '#2a3a4e', glow: '#6affd8', glowAt: 'row', eye: 2 },
    text: 'Bitte små lys i mørket. Om vinteren står de så tett i Norskehavet at ekkoloddet tror det er havbunnen.',
  },
  {
    id: 'polartorsk', name: 'Polartorsk', zone: 5, weight: 14, value: 110, cm: [15, 30], kg: [0.05, 0.2], difficulty: 4, behavior: 'dart',
    look: { shape: 'fusiform', len: 14, h: 5, top: '#7a7a8a', mid: '#c8c8d4', belly: '#f0f0f6', fin: '#8a8a9a', tail: 'fork', dorsal: 'low', eye: 2, barbel: true },
    text: 'Fisken som lever lengst nord i verden. Noen kommer sørover med det iskalde dypvannet, og blodet har frostvæske så de ikke fryser.',
  },
  {
    id: 'svartkjeft', name: 'Løskjevefisk', zone: 5, weight: 12, value: 140, cm: [15, 35], kg: [0.05, 0.3], difficulty: 5, behavior: 'floater',
    look: { shape: 'deep', len: 16, h: 8, top: '#1a1a22', mid: '#2a2a34', belly: '#3a3a44', fin: '#222228', glow: '#ff6a8a', glowAt: 'eye', eye: 2, eyeColor: '#ff6a8a', bigMouth: true },
    text: 'Svart som natta, med et rødt lys under øyet og en kjeve som henger løst. Selma sendte en melding med bare ett ord om den: «WOW».',
  },
  {
    id: 'storskate', name: 'Storskate', zone: 5, weight: 2, rare: true, value: 950, cm: [150, 280], kg: [40, 100], difficulty: 9, behavior: 'sinker',
    look: { shape: 'flat', len: 44, h: 22, top: '#4a4a52', mid: '#6a6a72', belly: '#e8e4dc', fin: '#5a5a62', pattern: 'spots', pat: '#8a8a92', tail: 'point', dorsal: 'none', eye: 2 },
    text: 'Den største rokka i Europa, og den er kritisk truet. Den kan bli over femti år gammel. Slipp den ut igjen, sier Johan.',
  },
]

export const LO_GEAR: Record<GearKind, { title: string; levels: GearLevel[] }> = {
  line: {
    title: 'Snøre',
    levels: [
      { name: 'Juksa', price: 0, value: 15, text: 'Et håndsnøre med en blank pilk. Rekker 15 meter.' },
      { name: 'Skreisnøre', price: 300, value: 60, text: 'Ned i tarebeltet, 60 meter.' },
      { name: 'Linebalje', price: 1400, value: 200, text: 'Line i en balje, som før i tida. 200 meter.' },
      { name: 'Revsnøre', price: 4500, value: 350, text: 'Ned til korallrevet, 350 meter.', needs: 'lo_deep', needsText: 'Johan må vise deg revet først' },
      { name: 'Eggasnøre', price: 12000, value: 800, text: 'Helt ned langs eggakanten, 800 meter.', needs: 'lamp2', needsText: 'Krever dykkerlykt' },
      { name: 'Fars snøre', price: 0, value: 1200, text: 'Snøret oldefaren din brukte i Lofoten. Det rekker helt ned i Norskehavet.', gift: true },
    ],
  },
  rod: {
    title: 'Stang',
    levels: [
      { name: 'Gammel pilkestang', price: 0, value: 0.27, text: 'Den har hengt i rorbua i femti år.' },
      { name: 'Skreistang', price: 400, value: 0.33, text: 'Større fangstfelt.' },
      { name: 'Havstang', price: 1800, value: 0.39, text: 'Tåler vinterstormene.' },
      { name: 'Johans juksastang', price: 7000, value: 0.46, text: 'Johan laget den til seg selv i 1968. Den er ikke til salgs. Unntatt for deg.', needs: 'lo_metJohan', needsText: 'Bli kjent med Johan først' },
    ],
  },
  reel: {
    title: 'Snelle',
    levels: [
      { name: 'Treskje', price: 0, value: 1, text: 'Akkurat som hjemme.' },
      { name: 'Juksasnelle', price: 600, value: 1.25, text: 'Haler raskere inn.' },
      { name: 'Elektrisk snelle', price: 2400, value: 1.5, text: 'Den sveiver av seg selv, nesten.' },
      { name: 'Astrids snelle', price: 0, value: 1.85, text: 'Astrid vant Lofotfisket med den da hun var femten. Det har hun nevnt én eller to ganger.', gift: true },
    ],
  },
  bucket: {
    title: 'Fiskekasse',
    levels: [
      { name: 'Bøtte', price: 0, value: 6, text: 'Plass til 6 fisk.' },
      { name: 'Fiskekasse', price: 350, value: 10, text: 'Plass til 10 fisk.' },
      { name: 'Isboks', price: 1400, value: 16, text: 'Plass til 16 fisk.' },
      { name: 'Lasterommet i Nordstjerna', price: 4200, value: 24, text: 'Plass til 24 fisk.' },
    ],
  },
  lure: {
    title: 'Agn',
    levels: [
      { name: 'Blank pilk', price: 0, value: 1, text: 'Skreien elsker alt som glinser.' },
      { name: 'Sild på krok', price: 450, value: 1.35, text: 'Fisken biter raskere og sjeldne fisk blir nysgjerrige.' },
      { name: 'Rød gummimakk', price: 1900, value: 1.7, text: 'Enda flere sjeldne fisk.' },
      { name: 'Selvlysende pilk', price: 6000, value: 2.2, text: 'Den lyser i polarnatta. Ingen fisk kan la den være.' },
    ],
  },
  lamp: {
    title: 'Lykt',
    levels: [
      { name: 'Ingen lykt', price: 0, value: 14, text: 'Bare en blank krok.' },
      { name: 'Hodelykt', price: 0, value: 42, text: 'Lyser opp litt i mørket.', gift: true },
      { name: 'Dykkerlykt', price: 2500, value: 62, text: 'Ser langt i mørket.', needs: 'lamp1', needsText: 'Krever hodelykt' },
      { name: 'Nordlyslykt', price: 0, value: 88, text: 'En gammel parafinlykt bestefar har pusset opp. Den lyser grønt, som nordlyset.', gift: true },
    ],
  },
}

export const LO_QUESTS: Quest[] = [
  { id: 'l1', title: 'Fang tre fisk', goal: { kind: 'catch', n: 3 }, money: 100 },
  { id: 'l2', title: 'Fang en skrei', goal: { kind: 'species', id: 'skrei', n: 1 }, money: 150 },
  { id: 'l3', title: 'Selg fisk for 800 kr', goal: { kind: 'sell', kr: 800 }, money: 250 },
  { id: 'l4', title: 'Fang tre ulike arter i Tarebeltet', goal: { kind: 'distinct', zone: 1, n: 3 }, money: 400 },
  { id: 'l5', title: 'Fang en hyse', goal: { kind: 'species', id: 'hyse', n: 1 }, money: 300 },
  { id: 'l6', title: 'Fang tre fisk om natta', goal: { kind: 'night', n: 3 }, money: 500 },
  { id: 'l7', title: 'Fang en lysing', goal: { kind: 'species', id: 'lysing', n: 1 }, unlock: 'lo_deep', reward: 'Revsnøre på mottaket' },
  { id: 'l8', title: 'Slipp ut fem fisk', goal: { kind: 'release', n: 5 }, money: 600 },
  { id: 'l9', title: 'Fang en fisk på over 20 kg', goal: { kind: 'heavy', kg: 20 }, money: 1200 },
  { id: 'l10', title: 'Fang en snabeluer', goal: { kind: 'species', id: 'snabeluer', n: 1 }, money: 900 },
  { id: 'l11', title: 'Sju perfekte fangster', goal: { kind: 'perfect', n: 7 }, money: 1200 },
  { id: 'l12', title: 'Finn en skattekiste', goal: { kind: 'treasure', n: 1 }, money: 800 },
  { id: 'l13', title: 'Fang ti fisk på Eggakanten', goal: { kind: 'zone', zone: 4, n: 10 }, money: 3000 },
  { id: 'l14', title: 'Fang en håbrann', goal: { kind: 'species', id: 'habrann', n: 1 }, unlock: 'gift:reel:3', reward: 'Astrids snelle' },
  { id: 'l15', title: 'Selg fisk for 60 000 kr', goal: { kind: 'sell', kr: 60000 }, unlock: 'lo_goldpaint', reward: 'Gullmaling til Nordstjerna' },
  { id: 'l16', title: 'Fang en storskate', goal: { kind: 'species', id: 'storskate', n: 1 }, money: 8000 },
]

export const LO_BOOK_REWARDS: { n: number; text: string; money?: number; gift?: [GearKind, number]; flag?: string }[] = [
  { n: 5, text: 'Hodelykt', gift: ['lamp', 1] },
  { n: 10, text: '1200 kr', money: 1200 },
  { n: 18, text: '3000 kr', money: 3000 },
  { n: 26, text: 'Nordlyslykt', gift: ['lamp', 3] },
  { n: 34, text: 'Bestefars kompass', flag: 'lo_compass' },
]

export const LO_PAINTS: { id: string; name: string; hull: string; stripe: string; price: number; needs?: string }[] = [
  { id: 'lo_hvit', name: 'Hvit og blå', hull: '#ece8e0', stripe: '#2a4a8a', price: 0 },
  { id: 'lo_rod', name: 'Rorbu-rød', hull: '#a8343a', stripe: '#f0e8dc', price: 600 },
  { id: 'lo_natt', name: 'Polarnatt', hull: '#1e2a4a', stripe: '#8affd8', price: 600 },
  { id: 'lo_gronn', name: 'Nordlys', hull: '#2a6a5a', stripe: '#d8f0e0', price: 600 },
  { id: 'lo_gull', name: 'Gull', hull: '#f2c24a', stripe: '#8a5a2a', price: 0, needs: 'lo_goldpaint' },
]

/** Skrei to hang on the family's drying rack, like great-grandfather did */
export const HJELL_NEED = 12
