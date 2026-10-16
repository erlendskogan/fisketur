// Hilo, on the rainy side of Hawaiʻi Island: a working harbour under Mauna Kea, where the
// humpbacks from Alaska spend the winter. Every fish here really lives in Hawaiian waters.

import type { GearKind, GearLevel, Quest, Species, Zone } from './data'

export const HI_ZONES: Zone[] = [
  { name: 'Revet', from: 0, to: 15, water: ['#2aa8c0', '#2090b0'], rock: '#3a3a44' },
  { name: 'Lavakanten', from: 15, to: 60, water: ['#2090b0', '#1a72a0'], rock: '#32323e' },
  { name: 'Stupet', from: 60, to: 150, water: ['#1a72a0', '#16528c'], rock: '#2c2c3a' },
  { name: 'Dypbanken', from: 150, to: 350, water: ['#16528c', '#123470'], rock: '#262636' },
  { name: 'Det blå', from: 350, to: 700, water: ['#123470', '#0c1848'], rock: '#201e32' },
  { name: 'Lavadypet', from: 700, to: 1000, water: ['#0c1848', '#060a22'], rock: '#1a1628' },
]

export const HI_SPECIES: Species[] = [
  // Revet
  {
    id: 'humu', name: 'Humuhumunukunukuāpuaʻa', zone: 0, weight: 14, value: 6, cm: [15, 25], kg: [0.2, 0.6], difficulty: 3, behavior: 'dart',
    look: { shape: 'deep', len: 15, h: 8, top: '#6a6a5a', mid: '#e8e0c8', belly: '#f4f0e0', fin: '#2a4a8a', pattern: 'stripes', pat: '#2a2a3a', tail: 'square', dorsal: 'spiny', eye: 2 },
    text: 'Statsfisken til Hawaii, med et navn lengre enn den selv. Den grynter når den blir redd.',
  },
  {
    id: 'manini', name: 'Manini', zone: 0, weight: 24, value: 3, cm: [10, 20], kg: [0.1, 0.3], difficulty: 1, behavior: 'calm',
    look: { shape: 'deep', len: 13, h: 8, top: '#d8d0a0', mid: '#f0ecd0', belly: '#f8f6e8', fin: '#e8e0b0', pattern: 'bars', pat: '#1e1e2a', tail: 'square', dorsal: 'spiny' },
    text: 'Fangedrakt med svarte striper. Beiter alger i store flokker så rev og fisk holder seg friske.',
  },
  {
    id: 'lauipala', name: 'Gul kirurgfisk', zone: 0, weight: 18, value: 4, cm: [10, 20], kg: [0.1, 0.3], difficulty: 2, behavior: 'dart',
    look: { shape: 'deep', len: 13, h: 9, top: '#ffd83a', mid: '#ffe85a', belly: '#fff08a', fin: '#f2c22a', tail: 'square', dorsal: 'spiny' },
    text: 'Lauʻipala heter den her. Knallgul hele livet, og den har en liten skalpell ved halen.',
  },
  {
    id: 'uhu', name: 'Papegøyefisk', zone: 0, weight: 14, value: 8, cm: [25, 60], kg: [0.5, 3], difficulty: 3, behavior: 'calm',
    look: { shape: 'deep', len: 18, h: 9, top: '#2a9a8a', mid: '#5ac8b8', belly: '#a8e8d8', fin: '#e85aa8', pattern: 'mottled', pat: '#f070b0', tail: 'lunate', dorsal: 'long', eye: 2 },
    text: 'Uhu. Gnager på korallene med et nebb av tenner og bæsjer hvit sand. Mye av stranda er laget av den.',
  },
  {
    id: 'amaama', name: 'Multe', zone: 0, weight: 16, value: 5, cm: [20, 45], kg: [0.3, 2], difficulty: 2, behavior: 'calm',
    look: { shape: 'fusiform', len: 16, h: 6, top: '#5a6a7a', mid: '#b8c4cc', belly: '#eef2f4', fin: '#8a98a4', pattern: 'line', pat: '#4a5868', dorsal: 'low' },
    text: 'ʻAmaʻama. Den fisken de gamle hawaiierne holdt i fiskedammene sine, generasjon etter generasjon.',
  },
  {
    id: 'lauwiliwili', name: 'Langsnutet sommerfuglfisk', zone: 0, weight: 4, rare: true, time: 'day', value: 30, cm: [15, 22], kg: [0.1, 0.3], difficulty: 5, behavior: 'dart',
    look: { shape: 'deep', len: 14, h: 9, top: '#ffd83a', mid: '#ffe060', belly: '#fff4c0', fin: '#f8d040', beak: true, tail: 'round', dorsal: 'high', eye: 1 },
    text: 'Har en snute som en pinsett og plukker mat ut av de trangeste sprekkene i korallen.',
  },

  // Lavakanten
  {
    id: 'papio', name: 'Papio', zone: 1, weight: 18, value: 14, cm: [30, 60], kg: [0.5, 4], difficulty: 4, behavior: 'dart',
    look: { shape: 'deep', len: 19, h: 9, top: '#4a5a6a', mid: '#b8c4cc', belly: '#eef0f2', fin: '#3a4a5a', tail: 'fork', dorsal: 'low', eye: 2 },
    text: 'En ung ulua. Jager i flokk langs lavakanten og slår mot agnet som et lyn.',
  },
  {
    id: 'puhi', name: 'Murene', zone: 1, weight: 14, value: 12, cm: [50, 120], kg: [1, 8], difficulty: 4, behavior: 'heavy',
    look: { shape: 'eel', len: 30, h: 7, top: '#6a5a2a', mid: '#9a8a4a', belly: '#c8b878', fin: '#e8d050', pattern: 'mottled', pat: '#3a3018', tail: 'point', dorsal: 'long', teeth: true },
    text: 'Puhi. Gaper hele tida, men den er ikke sint, den puster bare. Bor i hullene i lavaen.',
  },
  {
    id: 'menpachi', name: 'Menpachi', zone: 1, weight: 14, time: 'night', value: 10, cm: [15, 30], kg: [0.1, 0.5], difficulty: 3, behavior: 'calm',
    look: { shape: 'deep', len: 14, h: 7, top: '#d83a3a', mid: '#f06a5a', belly: '#ffb0a0', fin: '#e84a3a', tail: 'fork', dorsal: 'spiny', eye: 3 },
    text: 'En ekornfisk med enorme øyne. Gjemmer seg i hulene om dagen og kommer ut om natta.',
  },
  {
    id: 'kala', name: 'Enhjørningfisk', zone: 1, weight: 12, value: 11, cm: [30, 60], kg: [0.6, 3], difficulty: 3, behavior: 'calm',
    look: { shape: 'deep', len: 19, h: 9, top: '#5a6a7a', mid: '#8a9aa8', belly: '#b8c4cc', fin: '#4a8ab8', tail: 'lunate', dorsal: 'long', eye: 1 },
    text: 'Kala. Har et horn i panna og blå pigger ved halen. Ingen vet helt hva hornet er til.',
  },
  {
    id: 'kahala', name: 'Kāhala', zone: 1, weight: 10, value: 18, cm: [50, 110], kg: [2, 20], difficulty: 5, behavior: 'heavy',
    look: { shape: 'fusiform', len: 23, h: 8, top: '#6a6a4a', mid: '#c8c0a0', belly: '#f0ecdc', fin: '#c8a84a', pattern: 'line', pat: '#e8b83a', tail: 'fork', dorsal: 'low' },
    text: 'En ravfisk med en gyllen stripe fra øyet til halen. Sterk og sta.',
  },
  {
    id: 'ulua', name: 'Ulua', zone: 1, weight: 3, rare: true, value: 90, cm: [80, 170], kg: [15, 70], difficulty: 8, behavior: 'heavy',
    look: { shape: 'deep', len: 30, h: 15, top: '#3a4450', mid: '#9aa4ae', belly: '#dce0e4', fin: '#2a3440', tail: 'fork', dorsal: 'low', eye: 2 },
    text: 'Kjempemakrellen. Den største ulua kan veie mer enn en voksen mann, og fiskerne her snakker om den med ærefrykt.',
  },

  // Stupet
  {
    id: 'mahimahi', name: 'Mahimahi', zone: 2, weight: 16, value: 28, cm: [60, 140], kg: [3, 20], difficulty: 5, behavior: 'dart',
    look: { shape: 'fusiform', len: 25, h: 9, top: '#2a8a5a', mid: '#a8d84a', belly: '#f8e85a', fin: '#2a6ab8', pattern: 'spots', pat: '#2a5ab8', tail: 'fork', dorsal: 'long', eye: 1 },
    text: 'Grønn, gull og blå. Fargene blinker mens den kjemper, og falmer når den kommer opp. Navnet betyr «sterk sterk».',
  },
  {
    id: 'ono', name: 'Ono', zone: 2, weight: 12, value: 30, cm: [90, 170], kg: [6, 35], difficulty: 6, behavior: 'dart',
    look: { shape: 'long', len: 30, h: 6, top: '#2a4a8a', mid: '#8ab0d8', belly: '#e8f0f8', fin: '#2a3a6a', pattern: 'bars', pat: '#1e2a5a', tail: 'lunate', dorsal: 'long', teeth: true },
    text: 'En av de raskeste fiskene i havet. Ono betyr «god å spise» på hawaiisk. Det sier jo litt.',
  },
  {
    id: 'aku', name: 'Bonitt', zone: 2, weight: 16, value: 14, cm: [40, 80], kg: [2, 8], difficulty: 4, behavior: 'dart',
    look: { shape: 'fusiform', len: 20, h: 8, top: '#2a2e5a', mid: '#8a9ab8', belly: '#e8ecf4', fin: '#2a3050', pattern: 'stripes', pat: '#3a4468', tail: 'lunate', dorsal: 'low' },
    text: 'Aku. Striper på magen og alltid i fart. Fiskerne finner stimene ved å se etter fugler som stuper.',
  },
  {
    id: 'omilu', name: 'Blåfinnet makrell', zone: 2, weight: 12, value: 16, cm: [40, 90], kg: [1, 9], difficulty: 5, behavior: 'dart',
    look: { shape: 'deep', len: 20, h: 10, top: '#3a5a8a', mid: '#a8b8d0', belly: '#e8eef4', fin: '#3a8ae8', pattern: 'spots', pat: '#2a3a6a', tail: 'fork', dorsal: 'low', eye: 2 },
    text: 'ʻŌmilu. Elektrisk blå finner, og den jakter sammen med andre fisk som en ulveflokk.',
  },
  {
    id: 'taape', name: 'Blåstripet snapper', zone: 2, weight: 14, value: 7, cm: [20, 35], kg: [0.2, 0.8], difficulty: 3, behavior: 'calm',
    look: { shape: 'deep', len: 15, h: 7, top: '#f0c83a', mid: '#ffd85a', belly: '#fff0b0', fin: '#f2c22a', pattern: 'stripes', pat: '#3a8ae8', tail: 'fork', dorsal: 'spiny' },
    text: 'Taʻape. Gul med blå striper. Den ble satt ut her på femtitallet og har bredt seg overalt siden.',
  },
  {
    id: 'ahi', name: 'Gulfinnet tunfisk', zone: 2, weight: 3, rare: true, value: 140, cm: [100, 200], kg: [20, 150], difficulty: 8, behavior: 'heavy',
    look: { shape: 'fusiform', len: 32, h: 11, top: '#1e2a5a', mid: '#a8b8d0', belly: '#f0f4f8', fin: '#f8d83a', pattern: 'line', pat: '#f8d83a', tail: 'lunate', dorsal: 'high', eye: 2 },
    text: 'Ahi. Gule finner som sigder. Den største av dem selges på fiskeauksjonen før solen er oppe.',
  },

  // Dypbanken
  {
    id: 'opakapaka', name: 'ʻŌpakapaka', zone: 3, weight: 18, value: 30, cm: [30, 70], kg: [0.5, 8], difficulty: 4, behavior: 'calm',
    look: { shape: 'deep', len: 19, h: 8, top: '#e88aa0', mid: '#f4b0c0', belly: '#fadce4', fin: '#e8a0b0', tail: 'fork', dorsal: 'spiny', eye: 2 },
    text: 'Rosa snapper fra dypet, og den mest kjente av de sju bunnfiskene fiskerne her kaller «Deep 7».',
  },
  {
    id: 'onaga', name: 'Onaga', zone: 3, weight: 12, value: 45, cm: [40, 90], kg: [1, 9], difficulty: 5, behavior: 'heavy',
    look: { shape: 'deep', len: 21, h: 9, top: '#d82a3a', mid: '#f04a4a', belly: '#ff9a8a', fin: '#e83a3a', tail: 'fork', dorsal: 'spiny', eye: 2 },
    text: 'Rubinsnapperen, med en lang, spiss hale. Den røde fargen betyr lykke, og den kjøpes til nyttår.',
  },
  {
    id: 'ehu', name: 'Ehu', zone: 3, weight: 14, value: 26, cm: [30, 60], kg: [0.5, 4], difficulty: 4, behavior: 'calm',
    look: { shape: 'deep', len: 17, h: 8, top: '#f06a3a', mid: '#ff9a5a', belly: '#ffd0a8', fin: '#f07a3a', tail: 'fork', dorsal: 'spiny', eye: 2 },
    text: 'Knalloransje snapper. I dypet ser den nesten svart ut, for der finnes det ikke rødt lys.',
  },
  {
    id: 'kalekale', name: 'Kalekale', zone: 3, weight: 14, value: 20, cm: [25, 45], kg: [0.3, 2], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 16, h: 6, top: '#e88a9a', mid: '#f4b8c0', belly: '#fae0e4', fin: '#f2d050', pattern: 'line', pat: '#f2d050', tail: 'fork', dorsal: 'spiny' },
    text: 'En liten, rosa snapper med gule linjer. Den minste av de sju fra dypet.',
  },
  {
    id: 'hapuupuu', name: 'Hāpuʻupuʻu', zone: 3, weight: 6, value: 60, cm: [50, 100], kg: [3, 20], difficulty: 6, behavior: 'sinker',
    look: { shape: 'deep', len: 23, h: 11, top: '#3a3a44', mid: '#5a5a66', belly: '#8a8a94', fin: '#2e2e38', pattern: 'spots', pat: '#e8e8f0', tail: 'round', dorsal: 'spiny', eye: 2, bigMouth: true },
    text: 'Hawaiis egen havabbor. Den finnes ingen andre steder i verden. De unge er svarte med hvite prikker.',
  },
  {
    id: 'gindai', name: 'Gindai', zone: 3, weight: 10, value: 24, cm: [25, 40], kg: [0.3, 1.5], difficulty: 4, behavior: 'calm',
    look: { shape: 'deep', len: 15, h: 7, top: '#d8a0a8', mid: '#ecc4c8', belly: '#f8e4e4', fin: '#e0a8b0', pattern: 'bars', pat: '#c8707a', tail: 'fork', dorsal: 'spiny', eye: 2 },
    text: 'Den sjeldneste av de sju. Fiskerne regner det som et godt tegn når den biter.',
  },

  // Det blå
  {
    id: 'monchong', name: 'Monchong', zone: 4, weight: 16, value: 30, cm: [40, 80], kg: [2, 8], difficulty: 4, behavior: 'calm',
    look: { shape: 'deep', len: 20, h: 12, top: '#2a2a38', mid: '#4a4a5a', belly: '#6a6a7a', fin: '#1e1e2a', tail: 'lunate', dorsal: 'high', eye: 2 },
    text: 'En sigdbrasme fra mørket med store, nesten firkantede skjell. Den var nesten ukjent til langlinefiskerne begynte å få den opp.',
  },
  {
    id: 'walu', name: 'Escolar', zone: 4, weight: 14, value: 22, cm: [80, 150], kg: [5, 30], difficulty: 5, behavior: 'heavy',
    look: { shape: 'fusiform', len: 26, h: 8, top: '#3a3430', mid: '#5a524a', belly: '#8a8278', fin: '#2e2824', dorsal: 'low', eye: 2 },
    text: 'Walu. Så fet at kjøttet nesten smelter. Spis bare litt av gangen, sier Leilani, og hun mener det.',
  },
  {
    id: 'opah', name: 'Opah', zone: 4, weight: 6, value: 120, cm: [80, 150], kg: [20, 70], difficulty: 6, behavior: 'calm',
    look: { shape: 'round', len: 24, h: 18, top: '#5a6a9a', mid: '#e86a6a', belly: '#f8a0a0', fin: '#e83a3a', pattern: 'spots', pat: '#f8f4f0', tail: 'lunate', dorsal: 'high', eye: 2 },
    text: 'Månefisken. Rund som en tallerken og den eneste fisken som holder hele kroppen varm, som et pattedyr.',
  },
  {
    id: 'shutome', name: 'Sverdfisk', zone: 4, weight: 8, time: 'night', value: 110, cm: [150, 300], kg: [40, 200], difficulty: 8, behavior: 'heavy',
    look: { shape: 'long', len: 40, h: 9, top: '#2a2a3a', mid: '#5a5a6a', belly: '#9a9aa8', fin: '#2e2e3e', beak: true, tail: 'lunate', dorsal: 'high', eye: 3 },
    text: 'Shutome. Den har et varmeorgan bak øynene, så den kan se skarpt i det kalde dypet om natta.',
  },
  {
    id: 'megamunn', name: 'Megamunnhai', zone: 4, weight: 1, rare: true, value: 900, cm: [400, 550], kg: [700, 1200], difficulty: 9, behavior: 'calm',
    look: { shape: 'shark', len: 60, h: 16, top: '#3a3640', mid: '#5a5462', belly: '#8a8494', fin: '#2e2a34', tail: 'lunate', dorsal: 'low', bigMouth: true, eye: 2, glow: '#c8d8ff', glowAt: 'belly' },
    text: 'Den første som noen gang ble sett, viklet seg inn i et anker utenfor Hawaii i 1976. Det er bare funnet noen hundre siden.',
  },

  // Lavadypet
  {
    id: 'kakehai', name: 'Kakestikkhai', zone: 5, weight: 16, value: 60, cm: [30, 50], kg: [0.5, 1.5], difficulty: 5, behavior: 'dart',
    look: { shape: 'shark', len: 20, h: 5, top: '#4a3a3a', mid: '#6a5a58', belly: '#8a7a78', fin: '#3a2e2e', glow: '#8affd8', glowAt: 'belly', tail: 'lunate', dorsal: 'low', eye: 2 },
    text: 'En liten hai som lyser på magen og biter runde hull i hvaler og tunfisk, som et kakestikk.',
  },
  {
    id: 'huggtann', name: 'Huggtann', zone: 5, weight: 14, value: 80, cm: [10, 18], kg: [0.05, 0.2], difficulty: 5, behavior: 'floater',
    look: { shape: 'deep', len: 14, h: 9, top: '#1e1418', mid: '#2e2026', belly: '#3e2e34', fin: '#24181c', teeth: true, bigMouth: true, eye: 1 },
    text: 'Har de største tennene av noen fisk, i forhold til størrelsen. De er så lange at den må ha lommer til dem i hodet.',
  },
  {
    id: 'hawaiilys', name: 'Lysprikkfisk', zone: 5, weight: 22, value: 50, cm: [5, 12], kg: [0.01, 0.05], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 12, h: 4, top: '#1e2a3c', mid: '#2e4054', belly: '#405870', fin: '#2a3a4e', glow: '#6affff', glowAt: 'row', eye: 2 },
    text: 'De samme små lyktene finnes i alle hav. Selma sier det er den eneste fisken hun har sett på alle tre stedene.',
  },
  {
    id: 'svartdrage', name: 'Svart dragefisk', zone: 5, weight: 10, value: 180, cm: [20, 40], kg: [0.05, 0.3], difficulty: 7, behavior: 'dart',
    look: { shape: 'long', len: 26, h: 5, top: '#0e0a10', mid: '#1a141e', belly: '#241c28', fin: '#140e16', glow: '#d0a8ff', glowAt: 'spots', teeth: true, barbel: true, eye: 1, tail: 'fork', dorsal: 'none' },
    text: 'Huden er så svart at den sluker nesten alt lys. Skjegget lyser lilla og lokker byttet nær.',
  },
  {
    id: 'spokelseshai', name: 'Spøkelseshai', zone: 5, weight: 2, rare: true, value: 500, cm: [60, 120], kg: [2, 8], difficulty: 8, behavior: 'floater',
    look: { shape: 'chimaera', len: 30, h: 10, top: '#a8a0b8', mid: '#d0c8dc', belly: '#ece8f2', fin: '#b8b0c8', tail: 'point', dorsal: 'high', eye: 3, eyeColor: '#8ae8ff', glowAt: 'eye', glow: '#8ae8ff' },
    text: 'En havmus fra de dypeste lavaskråningene, blek som et gjenferd. Nesten ingen har sett den levende.',
  },
]

export const HI_GEAR: Record<GearKind, { title: string; levels: GearLevel[] }> = {
  line: {
    title: 'Snøre',
    levels: [
      { name: 'Håndsnøre', price: 0, value: 15, text: 'Rekker 15 meter ned.' },
      { name: 'Revsnøre', price: 30, value: 60, text: 'Ned langs lavakanten, 60 meter.' },
      { name: 'Trollingsnøre', price: 110, value: 150, text: 'Ut over stupet, 150 meter.' },
      { name: 'Bunnfiskesnøre', price: 380, value: 350, text: 'Ned til de sju fra dypet, 350 meter.', needs: 'hi_deep', needsText: 'Kimo må vise deg bankene først' },
      { name: 'Dyphavssnøre', price: 950, value: 700, text: 'Ned i det blå, 700 meter.', needs: 'lamp2', needsText: 'Krever dykkerlykt' },
      { name: 'Tūtūs snøre', price: 0, value: 1000, text: 'Snøret fra fiskedammen. Det rekker helt ned i Lavadypet.', gift: true },
    ],
  },
  rod: {
    title: 'Stang',
    levels: [
      { name: 'Bambusstang', price: 0, value: 0.27, text: 'Som hjemme, nesten.' },
      { name: 'Revstang', price: 40, value: 0.33, text: 'Større fangstfelt.' },
      { name: 'Trollingstang', price: 150, value: 0.39, text: 'For mahimahi og ono.' },
      { name: 'Kimos uluastang', price: 600, value: 0.46, text: 'Kimo bygde den selv. Han selger den bare til folk han liker.', needs: 'hi_metKimo', needsText: 'Bli kjent med Kimo først' },
    ],
  },
  reel: {
    title: 'Snelle',
    levels: [
      { name: 'Håndhjul', price: 0, value: 1, text: 'Du sveiver med fingrene.' },
      { name: 'Revsnelle', price: 50, value: 1.25, text: 'Haler raskere inn.' },
      { name: 'Havsnelle', price: 200, value: 1.5, text: 'Tåler en tunfisk.' },
      { name: 'Leilanis snelle', price: 0, value: 1.85, text: 'Bestefaren hennes vant fiskekonkurranser med den.', gift: true },
    ],
  },
  bucket: {
    title: 'Fiskekasse',
    levels: [
      { name: 'Bøtte', price: 0, value: 6, text: 'Plass til 6 fisk.' },
      { name: 'Kjølebag', price: 30, value: 10, text: 'Plass til 10 fisk.' },
      { name: 'Iskiste', price: 120, value: 16, text: 'Plass til 16 fisk.' },
      { name: 'Fiskerommet i Koholā', price: 380, value: 24, text: 'Plass til 24 fisk.' },
    ],
  },
  lure: {
    title: 'Agn',
    levels: [
      { name: 'Blekksprut på krok', price: 0, value: 1, text: 'Tako, som de sier her.' },
      { name: 'Fjærjigg', price: 45, value: 1.35, text: 'Fisken biter raskere og sjeldne fisk blir nysgjerrige.' },
      { name: 'Tunfiskblekksprut', price: 170, value: 1.7, text: 'Et glinsende skjørt. Enda flere sjeldne fisk.' },
      { name: 'Perlemorsjigg', price: 520, value: 2.2, text: 'Laget av skjell, slik de gjorde det før. Ingen fisk kan la den være.' },
    ],
  },
  lamp: {
    title: 'Lykt',
    levels: [
      { name: 'Ingen lykt', price: 0, value: 14, text: 'Bare en blank krok.' },
      { name: 'Pannelampe', price: 0, value: 42, text: 'Lyser opp litt i mørket.', gift: true },
      { name: 'Dykkerlykt', price: 240, value: 62, text: 'Ser langt i mørket.', needs: 'lamp1', needsText: 'Krever pannelampe' },
      { name: 'Lavalykta', price: 0, value: 88, text: 'Selma bygde den med et glass fra en vulkanstasjon. Den lyser rødt som glødende lava.', gift: true },
    ],
  },
}

export const HI_QUESTS: Quest[] = [
  { id: 'h1', title: 'Fang tre fisk', goal: { kind: 'catch', n: 3 }, money: 10 },
  { id: 'h2', title: 'Fang en manini', goal: { kind: 'species', id: 'manini', n: 1 }, money: 12 },
  { id: 'h3', title: 'Selg fisk for $60', goal: { kind: 'sell', kr: 60 }, money: 20 },
  { id: 'h4', title: 'Fang tre ulike arter på Revet', goal: { kind: 'distinct', zone: 0, n: 3 }, money: 25 },
  { id: 'h5', title: 'Fang en murene', goal: { kind: 'species', id: 'puhi', n: 1 }, money: 30 },
  { id: 'h6', title: 'Fang tre fisk om natta', goal: { kind: 'night', n: 3 }, money: 40 },
  { id: 'h7', title: 'Fang en mahimahi', goal: { kind: 'species', id: 'mahimahi', n: 1 }, unlock: 'hi_deep', reward: 'Bunnfiskesnøre hos Leilani' },
  { id: 'h8', title: 'Slipp ut fire fisk', goal: { kind: 'release', n: 4 }, money: 40 },
  { id: 'h9', title: 'Fang en onaga', goal: { kind: 'species', id: 'onaga', n: 1 }, money: 70 },
  { id: 'h10', title: 'Fang en fisk på over 30 kg', goal: { kind: 'heavy', kg: 30 }, money: 90 },
  { id: 'h11', title: 'Seks perfekte fangster', goal: { kind: 'perfect', n: 6 }, money: 80 },
  { id: 'h12', title: 'Finn en skattekiste', goal: { kind: 'treasure', n: 1 }, money: 60 },
  { id: 'h13', title: 'Fang ti fisk i Det blå', goal: { kind: 'zone', zone: 4, n: 10 }, money: 200 },
  { id: 'h14', title: 'Fang en ulua', goal: { kind: 'species', id: 'ulua', n: 1 }, unlock: 'gift:reel:3', reward: 'Leilanis snelle' },
  { id: 'h15', title: 'Selg fisk for $4000', goal: { kind: 'sell', kr: 4000 }, unlock: 'hi_goldpaint', reward: 'Gullmaling til Koholā' },
  { id: 'h16', title: 'Fang en megamunnhai', goal: { kind: 'species', id: 'megamunn', n: 1 }, money: 600 },
]

export const HI_BOOK_REWARDS: { n: number; text: string; money?: number; gift?: [GearKind, number]; flag?: string }[] = [
  { n: 5, text: 'Pannelampe', gift: ['lamp', 1] },
  { n: 10, text: '$100', money: 100 },
  { n: 18, text: '$250', money: 250 },
  { n: 26, text: 'Lavalykta', gift: ['lamp', 3] },
  { n: 34, text: 'Selmas Hawaii-medalje', flag: 'hi_medal' },
]

export const HI_PAINTS: { id: string; name: string; hull: string; stripe: string; price: number; needs?: string }[] = [
  { id: 'hi_hvit', name: 'Hvit og turkis', hull: '#f0ece0', stripe: '#2aa8a8', price: 0 },
  { id: 'hi_lava', name: 'Lava', hull: '#2a2a32', stripe: '#f2742a', price: 50 },
  { id: 'hi_hibiskus', name: 'Hibiskus', hull: '#e84a6a', stripe: '#ffd84a', price: 50 },
  { id: 'hi_hav', name: 'Revblå', hull: '#2a8ac8', stripe: '#f0ece0', price: 50 },
  { id: 'hi_gull', name: 'Gull', hull: '#f2c24a', stripe: '#8a5a2a', price: 0, needs: 'hi_goldpaint' },
]

/** Where Selma's song buoys go, in metres; they only hear the whales at night */
export const BUOY_DEPTHS = [20, 120, 330]

/** The fish Tūtū wants back in her pond */
export const POND_FISH = ['amaama', 'manini', 'uhu']
export const POND_NEED = 4
