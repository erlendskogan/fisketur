// Vardø, at the edge of the Barents Sea, late summer into autumn. Four fishing grounds,
// further and further out; every fish and crab here really lives in those waters.
// Ids all start with v_ so they never clash with the other worlds' species.

import type { GearKind, GearLevel, Quest, Species } from '../data'
import type { GroundId, Ground } from './types'

// ---------- grounds ----------

export const VA_GROUNDS: Record<GroundId, Ground> = {
  sundet: {
    id: 'sundet', name: 'Bussesundet', boat: 0, hours: 0, far: 'town',
    text: 'Det grunne sundet mellom Vardø og fastlandet. Tare, sand og kysttorsk.',
    zones: [
      { name: 'Tangbeltet', from: 0, to: 10, water: ['#4a9a86', '#3e8a7a'], rock: '#5e6a52' },
      { name: 'Tareskogen', from: 10, to: 30, water: ['#3e8a7a', '#32786e'], rock: '#4e5e4a' },
      { name: 'Sandbunnen', from: 30, to: 55, water: ['#32786e', '#286462'], rock: '#7a7258' },
      { name: 'Strømmen', from: 55, to: 85, water: ['#286462', '#1e5056'], rock: '#46524e' },
      { name: 'Renna', from: 85, to: 120, water: ['#1e5056', '#183e4a'], rock: '#3a4446' },
      { name: 'Dypålen', from: 120, to: 150, water: ['#183e4a', '#122e3e'], rock: '#2e3640' },
    ],
  },
  fjorden: {
    id: 'fjorden', name: 'Varangerfjorden', boat: 1, hours: 1, far: 'coast',
    text: 'Den brede fjorden inn mot Kirkenes. Her går kongekrabba på bunnen.',
    zones: [
      { name: 'Strandberget', from: 0, to: 30, water: ['#2e8a88', '#267878'], rock: '#56605a' },
      { name: 'Tarebakken', from: 30, to: 80, water: ['#267878', '#1e6268'], rock: '#48524e' },
      { name: 'Krabbebunnen', from: 80, to: 150, water: ['#1e6268', '#184c5c'], rock: '#3e4648' },
      { name: 'Midtfjorden', from: 150, to: 250, water: ['#184c5c', '#14384e'], rock: '#343c44' },
      { name: 'Mudderbunnen', from: 250, to: 330, water: ['#14384e', '#102840'], rock: '#3a3830' },
      { name: 'Dypbassenget', from: 330, to: 400, water: ['#102840', '#0c1c34'], rock: '#24283a' },
    ],
  },
  banken: {
    id: 'banken', name: 'Tiddlybanken', boat: 2, hours: 3, far: 'open',
    text: 'Bankene ute i Barentshavet, helt bort mot grenselinja. Stor torsk og snøkrabbe.',
    zones: [
      { name: 'Overvannet', from: 0, to: 60, water: ['#2a7282', '#226276'], rock: '#4a5458' },
      { name: 'Mellomvannet', from: 60, to: 150, water: ['#226276', '#1a4e68'], rock: '#3e4850' },
      { name: 'Bankeryggen', from: 150, to: 250, water: ['#1a4e68', '#163c5a'], rock: '#4a4a44' },
      { name: 'Bankskråningen', from: 250, to: 350, water: ['#163c5a', '#122c4c'], rock: '#323a48' },
      { name: 'Polarfronten', from: 350, to: 450, water: ['#122c4c', '#0e1e3c'], rock: '#282e40' },
      { name: 'Dyprenna', from: 450, to: 600, water: ['#0e1e3c', '#0a142e'], rock: '#1e2234' },
    ],
  },
  eggakanten: {
    id: 'eggakanten', name: 'Eggakanten', boat: 3, hours: 6, far: 'ocean',
    text: 'Der sokkelen stuper ned i dyphavet. Ikke land i sikte, bare hav.',
    zones: [
      { name: 'Åpent hav', from: 0, to: 200, water: ['#1e5a70', '#184a62'], rock: '#3a4450' },
      { name: 'Sokkelkanten', from: 200, to: 450, water: ['#184a62', '#123652'], rock: '#2e3646' },
      { name: 'Skråningen', from: 450, to: 750, water: ['#123652', '#0c2240'], rock: '#262c3e' },
      { name: 'Dypskråningen', from: 750, to: 1100, water: ['#0c2240', '#08142c'], rock: '#1e2234' },
      { name: 'Kaldtvannet', from: 1100, to: 1500, water: ['#08142c', '#050a1c'], rock: '#16182a' },
      { name: 'Dypsletta', from: 1500, to: 2000, water: ['#050a1c', '#03040c'], rock: '#100f1e' },
    ],
  },
}

// ---------- fish and crabs ----------
// For crabs (pot: true) cm is the carapace length, as on the sorting gauge.

export const VA_SPECIES: Species[] = [
  // ===== Bussesundet =====
  // Tangbeltet
  {
    id: 'v_tangsprell', name: 'Tangsprell', ground: 'sundet', zone: 0, weight: 18, value: 8, cm: [10, 25], kg: [0.02, 0.1], difficulty: 1, behavior: 'dart',
    look: { shape: 'eel', len: 16, h: 4, top: '#7a5a2e', mid: '#b8844a', belly: '#ecc890', fin: '#9a6a3a', pattern: 'spots', pat: '#1e1418', tail: 'round', dorsal: 'long' },
    text: 'Når sjøen trekker seg ut, gjemmer den seg under en våt stein og venter. Den tåler å ligge på land i flere timer.',
  },
  {
    id: 'v_ulke', name: 'Ulke', ground: 'sundet', zone: 0, weight: 20, value: 12, cm: [15, 40], kg: [0.1, 1.2], difficulty: 2, behavior: 'sinker',
    look: { shape: 'angler', len: 15, h: 8, top: '#4e4a3a', mid: '#7e7454', belly: '#e0c890', fin: '#5e5640', pattern: 'mottled', pat: '#2e2a20', tail: 'round', dorsal: 'spiny', eye: 2 },
    text: 'Den knurrer når du tar den opp av vannet. Om vinteren vokter hannen eggene helt alene.',
  },
  {
    id: 'v_alekvabbe', name: 'Ålekvabbe', ground: 'sundet', zone: 0, weight: 14, value: 14, cm: [20, 45], kg: [0.1, 0.5], difficulty: 2, behavior: 'calm',
    look: { shape: 'eel', len: 20, h: 6, top: '#6e6436', mid: '#a09448', belly: '#e4d68c', fin: '#82763e', pattern: 'mottled', pat: '#443a20', tail: 'point', dorsal: 'long' },
    text: 'En av de få fiskene i havet som føder levende unger. Beina blir grønne når du koker den, helt ufarlig.',
  },
  // Tareskogen
  {
    id: 'v_rognkjeks', name: 'Rognkjeks', ground: 'sundet', zone: 1, weight: 14, value: 30, cm: [20, 50], kg: [0.5, 5], difficulty: 2, behavior: 'sinker',
    look: { shape: 'round', len: 14, h: 12, top: '#4a7a42', mid: '#86ae60', belly: '#e8904a', fin: '#689a4e', pattern: 'spots', pat: '#2c4a22', tail: 'round', dorsal: 'none' },
    text: 'Hunnen heter rognkjeks og hannen rognkall. Han suger seg fast på en stein med magen og passer eggene alene.',
  },
  {
    id: 'v_sei', name: 'Sei', ground: 'sundet', zone: 1, weight: 26, value: 22, cm: [25, 70], kg: [0.3, 3.5], difficulty: 2, behavior: 'calm',
    look: { shape: 'fusiform', len: 19, h: 7, top: '#34464e', mid: '#7e909a', belly: '#d0dad8', fin: '#526470', pattern: 'line', pat: '#e2ece8', dorsal: 'low', tail: 'fork' },
    text: 'Den unge seien vokser opp inne ved land. Når den er stor nok, svømmer den ut på bankene.',
  },
  {
    id: 'v_pukkellaks', name: 'Pukkellaks', ground: 'sundet', zone: 1, weight: 16, value: 25, cm: [40, 65], kg: [1, 3], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 21, h: 9, top: '#5a6a62', mid: '#b8b8a8', belly: '#f0e8e4', fin: '#6a7068', pattern: 'spots', pat: '#1e2420', tail: 'fork', dorsal: 'high' },
    text: 'Russerne satte den ut i elvene på Kola for over seksti år siden. Nå kommer den i tusenvis hvert annet år, og den hører ikke hjemme her.',
  },
  {
    id: 'v_sjoroye', name: 'Sjørøye', ground: 'sundet', zone: 1, weight: 4, rare: true, time: 'day', value: 320, cm: [30, 70], kg: [0.5, 5], difficulty: 6, behavior: 'dart',
    look: { shape: 'fusiform', len: 22, h: 8, top: '#3e5a6a', mid: '#c0ccd0', belly: '#f4d8c0', fin: '#c86a4a', pattern: 'spots', pat: '#f4c8b8', tail: 'square', dorsal: 'low' },
    text: 'Den er i sjøen bare noen få uker om sommeren for å spise seg feit. Så svømmer den tilbake til elva og vannet den kom fra.',
  },
  // Sandbunnen
  {
    id: 'v_rodspette', name: 'Rødspette', ground: 'sundet', zone: 2, weight: 16, value: 30, cm: [25, 50], kg: [0.3, 2], difficulty: 3, behavior: 'sinker',
    look: { shape: 'flat', len: 17, h: 11, top: '#86684a', mid: '#a0825c', belly: '#b2946a', fin: '#927452', pattern: 'spots', pat: '#ff7a2e', tail: 'round', dorsal: 'long' },
    text: 'Den blir født som en helt vanlig fisk. Så vandrer det ene øyet over på den andre siden, og den legger seg ned på sanden.',
  },
  {
    id: 'v_sandflyndre', name: 'Sandflyndre', ground: 'sundet', zone: 2, weight: 18, value: 18, cm: [20, 35], kg: [0.1, 0.6], difficulty: 2, behavior: 'sinker',
    look: { shape: 'flat', len: 16, h: 10, top: '#867658', mid: '#a49478', belly: '#b4a488', fin: '#968668', pattern: 'mottled', pat: '#665638', tail: 'round', dorsal: 'long' },
    text: 'Stryk den fra halen mot hodet, så kjennes den som sandpapir. Rødspetta er glatt.',
  },
  {
    id: 'v_panserulke', name: 'Panserulke', ground: 'sundet', zone: 2, weight: 10, value: 40, cm: [10, 20], kg: [0.02, 0.1], difficulty: 3, behavior: 'sinker',
    look: { shape: 'long', len: 15, h: 4, top: '#6a604c', mid: '#988a6c', belly: '#e0d4b4', fin: '#7a6e56', pattern: 'bars', pat: '#3a3426', tail: 'round', dorsal: 'spiny', barbel: true, eye: 2 },
    text: 'Hele kroppen er dekket av harde beinplater, som en rustning. Under haka har den en liten busk med skjeggtråder.',
  },
  // Strømmen
  {
    id: 'v_torsk', name: 'Kysttorsk', ground: 'sundet', zone: 3, weight: 26, value: 70, cm: [40, 110], kg: [0.8, 14], difficulty: 3, behavior: 'heavy',
    look: { shape: 'fusiform', len: 23, h: 9, top: '#6e6a3a', mid: '#b4a86a', belly: '#f0e8c8', fin: '#948a56', pattern: 'mottled', pat: '#524a26', tail: 'square', dorsal: 'low', barbel: true },
    text: 'Kysttorsken blir i fjorden hele livet, mens skreien vandrer. Forskerne ser forskjell på dem på formen på øresteinene.',
  },
  {
    id: 'v_hyse', name: 'Hyse', ground: 'sundet', zone: 3, weight: 20, value: 50, cm: [30, 70], kg: [0.4, 4], difficulty: 3, behavior: 'calm',
    look: { shape: 'fusiform', len: 20, h: 7, top: '#46464e', mid: '#a4a8b0', belly: '#eaecf0', fin: '#3a3a42', pattern: 'line', pat: '#1e1e26', tail: 'square', dorsal: 'high', barbel: true },
    text: 'Den har en svart flekk bak gjellene og en svart strek langs siden. Den lever av slangestjerner og mark på bunnen.',
  },
  // Renna
  {
    id: 'v_steinbit', name: 'Gråsteinbit', ground: 'sundet', zone: 4, weight: 14, value: 110, cm: [40, 110], kg: [1, 12], difficulty: 5, behavior: 'heavy',
    look: { shape: 'eel', len: 28, h: 9, top: '#565c64', mid: '#868c94', belly: '#c4c8cc', fin: '#666c74', pattern: 'bars', pat: '#2e3238', tail: 'round', dorsal: 'long', teeth: true },
    text: 'Den har frostvæske i blodet, så den klarer seg i iskaldt vann. Tennene knuser kråkeboller og skjell.',
  },
  {
    id: 'v_kloskate', name: 'Kloskate', ground: 'sundet', zone: 4, weight: 12, value: 70, cm: [30, 80], kg: [0.5, 5], difficulty: 4, behavior: 'sinker',
    look: { shape: 'flat', len: 22, h: 14, top: '#76665a', mid: '#968678', belly: '#ece4d8', fin: '#86766a', pattern: 'spots', pat: '#e4d8c4', tail: 'point', dorsal: 'none' },
    text: 'Den vanligste skata i Barentshavet. Ryggen er full av torner, som en tistel.',
  },
  {
    id: 'v_brosme', name: 'Brosme', ground: 'sundet', zone: 4, weight: 14, value: 80, cm: [40, 90], kg: [1, 8], difficulty: 3, behavior: 'sinker',
    look: { shape: 'fusiform', len: 22, h: 8, top: '#765838', mid: '#a4784c', belly: '#e4c894', fin: '#86623e', tail: 'round', dorsal: 'long', barbel: true },
    text: 'Den har én lang ryggfinne som går fra nakken helt til halen. Folk her oppe sier den er den beste fisken i suppa.',
  },
  // Dypålen
  {
    id: 'v_langebarn', name: 'Langebarn', ground: 'sundet', zone: 5, weight: 14, value: 60, cm: [20, 45], kg: [0.03, 0.2], difficulty: 3, behavior: 'calm',
    look: { shape: 'eel', len: 22, h: 4, top: '#a08a5a', mid: '#c8b484', belly: '#ece0c0', fin: '#b09a6a', pattern: 'spots', pat: '#6a5636', tail: 'round', dorsal: 'long' },
    text: 'Tynn som en blyant og nesten en halv meter lang. Den bor i ganger den graver i mudderet.',
  },
  {
    id: 'v_vortekjeks', name: 'Vortekjeks', ground: 'sundet', zone: 5, weight: 3, rare: true, value: 600, cm: [5, 12], kg: [0.02, 0.1], difficulty: 6, behavior: 'floater',
    look: { shape: 'round', len: 11, h: 10, top: '#6a7a4a', mid: '#94a46a', belly: '#e0c890', fin: '#7a8a56', pattern: 'spots', pat: '#3a4a26', tail: 'round', dorsal: 'none', eye: 2 },
    text: 'En liten slektning av rognkjeksen, full av vorter og pigger. Den blir sjelden større enn en knyttneve.',
  },

  // ===== Varangerfjorden =====
  // Strandberget
  {
    id: 'v_sild', name: 'Sild', ground: 'fjorden', zone: 0, weight: 26, value: 40, cm: [20, 35], kg: [0.1, 0.4], difficulty: 3, behavior: 'calm',
    look: { shape: 'fusiform', len: 13, h: 5, top: '#2e5a96', mid: '#a4c8de', belly: '#eef5f7', fin: '#8cb2c6', dorsal: 'low', tail: 'fork' },
    text: 'Sild snakker sammen om natta ved å slippe små luftbobler ut bakfra. Det høres ut som en liten prutt.',
  },
  {
    id: 'v_lodde', name: 'Lodde', ground: 'fjorden', zone: 0, weight: 24, value: 45, cm: [12, 20], kg: [0.01, 0.05], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 12, h: 4, top: '#4a7a6e', mid: '#b4ccc4', belly: '#eef4f0', fin: '#7a9a8e', tail: 'fork', dorsal: 'low' },
    text: 'Torsken, selen, hvalen og sjøfuglene i Barentshavet lever av den. Den gyter langs kysten om våren, og nesten alle dør etterpå.',
  },
  {
    id: 'v_makrell', name: 'Makrell', ground: 'fjorden', zone: 0, weight: 5, rare: true, time: 'day', value: 300, cm: [25, 45], kg: [0.3, 1.2], difficulty: 5, behavior: 'dart',
    look: { shape: 'fusiform', len: 17, h: 6, top: '#1e8670', mid: '#84d0b4', belly: '#f2f8ee', fin: '#58a68e', pattern: 'wavy', pat: '#123a3c', dorsal: 'low', tail: 'fork' },
    text: 'Før kom den nesten aldri så langt nord. Nå er havet blitt varmere, og om sensommeren svømmer den helt hit.',
  },
  // Tarebakken
  {
    id: 'v_gapeflyndre', name: 'Gapeflyndre', ground: 'fjorden', zone: 1, weight: 22, value: 60, cm: [20, 50], kg: [0.1, 1.5], difficulty: 3, behavior: 'sinker',
    look: { shape: 'flat', len: 18, h: 10, top: '#a0846a', mid: '#c0a488', belly: '#d4b898', fin: '#b0947a', tail: 'round', dorsal: 'long', bigMouth: true },
    text: 'Flyndra med det store gapet. Den er den vanligste flatfisken i hele Barentshavet.',
  },
  {
    id: 'v_pyntekrabbe', name: 'Pyntekrabbe', ground: 'fjorden', zone: 1, weight: 14, pot: true, value: 40, cm: [5, 11], kg: [0.1, 0.4], difficulty: 3, behavior: 'sinker',
    look: { shape: 'crab', len: 14, h: 9, top: '#7a6a4a', mid: '#9a8a62', belly: '#e0d0a8', fin: '#6a7a42', pattern: 'mottled', pat: '#4a6a32' },
    text: 'Den fester tang og svamp på skallet sitt, så den blir nesten usynlig. Derav navnet.',
  },
  {
    id: 'v_kongekrabbe', name: 'Kongekrabbe', ground: 'fjorden', zone: 1, weight: 24, pot: true, value: 450, cm: [9, 20], kg: [1, 10], difficulty: 5, behavior: 'heavy',
    look: { shape: 'crab', len: 22, h: 12, top: '#8a2a2a', mid: '#b2443a', belly: '#f0dcc4', fin: '#a03a32', pattern: 'spots', pat: '#e88a6a' },
    text: 'Sovjetiske forskere slapp den ut i Murmanskfjorden på 1960-tallet. Nå går den i Varangerfjorden, og beina kan spenne over halvannen meter.',
  },
  // Krabbebunnen
  {
    id: 'v_flekksteinbit', name: 'Flekksteinbit', ground: 'fjorden', zone: 2, weight: 14, value: 380, cm: [50, 140], kg: [2, 22], difficulty: 6, behavior: 'heavy',
    look: { shape: 'eel', len: 30, h: 10, top: '#76766a', mid: '#9a9a88', belly: '#c8c8b8', fin: '#6a6a5a', pattern: 'spots', pat: '#2a2a22', tail: 'round', dorsal: 'long', teeth: true },
    text: 'Steinbiten med leopardflekker. Den knuser krabber og kråkeboller med tennene.',
  },
  {
    id: 'v_kveite', name: 'Kveite', ground: 'fjorden', zone: 2, weight: 4, rare: true, value: 1600, cm: [70, 200], kg: [8, 120], difficulty: 8, behavior: 'heavy',
    look: { shape: 'flat', len: 36, h: 18, top: '#3c3e36', mid: '#5c5e4e', belly: '#ecece4', fin: '#4c4e42', pattern: 'mottled', pat: '#2c2e26', tail: 'lunate', dorsal: 'long', eye: 2 },
    text: 'Den største flyndra i verden. Hunnene kan bli over to hundre kilo, mens hannene sjelden blir over femti.',
  },
  // Midtfjorden
  {
    id: 'v_uer', name: 'Uer', ground: 'fjorden', zone: 3, weight: 18, value: 260, cm: [35, 80], kg: [0.8, 8], difficulty: 5, behavior: 'calm',
    look: { shape: 'deep', len: 20, h: 9, top: '#d0482e', mid: '#f07a4a', belly: '#ffc49a', fin: '#e05a3a', tail: 'square', dorsal: 'spiny', eye: 3 },
    text: 'Den kan bli over seksti år gammel. I stedet for egg føder den tusenvis av bitte små levende larver.',
  },
  {
    id: 'v_lusuer', name: 'Lusuer', ground: 'fjorden', zone: 3, weight: 18, value: 120, cm: [15, 35], kg: [0.1, 0.6], difficulty: 4, behavior: 'calm',
    look: { shape: 'deep', len: 15, h: 7, top: '#d44a3a', mid: '#ee7a5a', belly: '#ffc0a8', fin: '#e45a4a', pattern: 'bars', pat: '#a42a2a', tail: 'square', dorsal: 'spiny', eye: 2 },
    text: 'Den minste av uerne. Den holder seg nærmere land enn slektningene sine.',
  },
  // Mudderbunnen
  {
    id: 'v_vahls', name: 'Vahls ålebrosme', ground: 'fjorden', zone: 4, weight: 16, value: 220, cm: [20, 50], kg: [0.1, 0.8], difficulty: 5, behavior: 'sinker',
    look: { shape: 'eel', len: 24, h: 6, top: '#7a6650', mid: '#9a866c', belly: '#d8c8b0', fin: '#6a5844', pattern: 'bars', pat: '#4a3a2c', tail: 'round', dorsal: 'long' },
    text: 'Den ligger stille på mudderbunnen og spiser små krepsdyr. Den legger få egg, men de er store som erter.',
  },
  {
    id: 'v_rundskate', name: 'Rundskate', ground: 'fjorden', zone: 4, weight: 12, value: 300, cm: [25, 55], kg: [0.3, 1.5], difficulty: 5, behavior: 'sinker',
    look: { shape: 'flat', len: 18, h: 13, top: '#6a5e54', mid: '#8a7e72', belly: '#e8e0d4', fin: '#7a6e62', pattern: 'mottled', pat: '#4a4038', tail: 'point', dorsal: 'none' },
    text: 'En liten, rund skate fra det kalde dypet. Den blir sjelden mer enn en halv meter lang.',
  },
  // Dypbassenget
  {
    id: 'v_blakveite', name: 'Blåkveite', ground: 'fjorden', zone: 5, weight: 14, value: 700, cm: [45, 110], kg: [1, 25], difficulty: 7, behavior: 'heavy',
    look: { shape: 'flat', len: 28, h: 13, top: '#3a3e4a', mid: '#545a68', belly: '#6a7080', fin: '#424856', tail: 'square', dorsal: 'long', eye: 2, teeth: true },
    text: 'Den er mørk på begge sider, og det ene øyet sitter oppe på kanten av hodet. Den jakter fritt i vannet, ikke bare på bunnen.',
  },

  // ===== Tiddlybanken =====
  // Overvannet
  {
    id: 'v_polartorsk', name: 'Polartorsk', ground: 'banken', zone: 0, weight: 24, value: 140, cm: [15, 30], kg: [0.05, 0.25], difficulty: 4, behavior: 'dart',
    look: { shape: 'fusiform', len: 14, h: 5, top: '#6e7280', mid: '#c4c6d0', belly: '#f0f0f6', fin: '#848a98', tail: 'fork', dorsal: 'low', eye: 2, barbel: true },
    text: 'Den lever lengre nord enn noen annen fisk. Om vinteren gjemmer den seg i sprekker under havisen.',
  },
  {
    id: 'v_havsil', name: 'Havsil', ground: 'banken', zone: 0, weight: 20, value: 120, cm: [10, 25], kg: [0.01, 0.05], difficulty: 4, behavior: 'dart',
    look: { shape: 'long', len: 15, h: 3, top: '#5a8a86', mid: '#c4dcd4', belly: '#f2f6f2', fin: '#8aaaa4', tail: 'fork', dorsal: 'long' },
    text: 'Om natta og hele vinteren graver den seg ned i sanden på banken. Bare om dagen svømmer den opp og spiser.',
  },
  // Mellomvannet
  {
    id: 'v_havtorsk', name: 'Havtorsk', ground: 'banken', zone: 1, weight: 28, value: 360, cm: [50, 140], kg: [2, 30], difficulty: 5, behavior: 'heavy',
    look: { shape: 'fusiform', len: 26, h: 9, top: '#666238', mid: '#c4b886', belly: '#f4eedc', fin: '#868054', pattern: 'mottled', pat: '#484226', tail: 'square', dorsal: 'low', barbel: true },
    text: 'Verdens største torskebestand lever her i Barentshavet. Når den er stor nok, svømmer den til Lofoten for å gyte, og da kalles den skrei.',
  },
  {
    id: 'v_storsei', name: 'Storsei', ground: 'banken', zone: 1, weight: 18, value: 260, cm: [60, 120], kg: [3, 18], difficulty: 5, behavior: 'dart',
    look: { shape: 'fusiform', len: 25, h: 8, top: '#2e3e48', mid: '#76889a', belly: '#ccd6d6', fin: '#4a5c6a', pattern: 'line', pat: '#e2ece8', dorsal: 'low', tail: 'fork' },
    text: 'Seien fra sundet, ferdig voksen. Ute på banken jager den sild og lodde i flokker, helt opp til overflata.',
  },
  {
    id: 'v_lange', name: 'Lange', ground: 'banken', zone: 1, weight: 10, value: 420, cm: [60, 180], kg: [2, 30], difficulty: 6, behavior: 'heavy',
    look: { shape: 'eel', len: 34, h: 7, top: '#5a5e40', mid: '#8a8c62', belly: '#d8d8c0', fin: '#6a6e4a', pattern: 'mottled', pat: '#3e4228', tail: 'round', dorsal: 'long', barbel: true },
    text: 'Den lengste av torskefiskene. Den kan bli over to meter lang og bor helst blant steiner på bunnen.',
  },
  // Bankeryggen
  {
    id: 'v_snokrabbe', name: 'Snøkrabbe', ground: 'banken', zone: 2, weight: 26, pot: true, value: 380, cm: [6, 14], kg: [0.3, 1.3], difficulty: 5, behavior: 'sinker',
    look: { shape: 'crab', len: 18, h: 9, top: '#c26a3a', mid: '#d8885a', belly: '#f4e4c8', fin: '#b85e34' },
    text: 'Den ble først funnet i Barentshavet i 1996, og ingen vet sikkert hvordan den kom hit. Nå er det et helt fiske etter den.',
  },
  {
    id: 'v_smorflyndre', name: 'Smørflyndre', ground: 'banken', zone: 2, weight: 18, value: 240, cm: [25, 55], kg: [0.2, 1.8], difficulty: 5, behavior: 'sinker',
    look: { shape: 'flat', len: 19, h: 10, top: '#968676', mid: '#b4a494', belly: '#c4b4a4', fin: '#867666', tail: 'round', dorsal: 'long', eye: 2 },
    text: 'Tynn og glatt, med et kjøtt så mildt at den har fått navn etter smør. Den kan bli over tjue år gammel.',
  },
  // Bankskråningen
  {
    id: 'v_trollkrabbe', name: 'Trollkrabbe', ground: 'banken', zone: 3, weight: 10, pot: true, value: 260, cm: [7, 14], kg: [0.4, 2], difficulty: 5, behavior: 'sinker',
    look: { shape: 'crab', len: 17, h: 10, top: '#b2482e', mid: '#d06a44', belly: '#f0d8b8', fin: '#a03e2a', pattern: 'spots', pat: '#f0a07a' },
    text: 'Ryggskjoldet er fullt av pigger. Den er i slekt med eremittkrepsen, akkurat som kongekrabba.',
  },
  {
    id: 'v_snabeluer', name: 'Snabeluer', ground: 'banken', zone: 3, weight: 22, value: 520, cm: [30, 55], kg: [0.5, 2.5], difficulty: 6, behavior: 'calm',
    look: { shape: 'deep', len: 18, h: 8, top: '#e43a3a', mid: '#fc6a5a', belly: '#ffa898', fin: '#ec4a4a', tail: 'square', dorsal: 'spiny', eye: 3, beak: true },
    text: 'Den har en liten nebbpigg på haka, som en snabel. Den kan bli over sytti år gammel.',
  },
  {
    id: 'v_blaasteinbit', name: 'Blåsteinbit', ground: 'banken', zone: 3, weight: 12, value: 900, cm: [60, 140], kg: [3, 20], difficulty: 7, behavior: 'heavy',
    look: { shape: 'eel', len: 30, h: 10, top: '#3a4a6a', mid: '#5a6a8a', belly: '#9aa4b8', fin: '#2e3a58', pattern: 'mottled', pat: '#24304a', tail: 'round', dorsal: 'long', teeth: true },
    text: 'Den største steinbiten. Den svømmer ofte langt oppe i vannet, ikke bare på bunnen som de andre.',
  },
  // Polarfronten
  {
    id: 'v_esmark', name: 'Esmarks ålebrosme', ground: 'banken', zone: 4, weight: 18, value: 700, cm: [30, 75], kg: [0.4, 2.5], difficulty: 6, behavior: 'sinker',
    look: { shape: 'eel', len: 28, h: 7, top: '#665848', mid: '#887866', belly: '#c4b49e', fin: '#58483a', pattern: 'bars', pat: '#3a2e24', tail: 'round', dorsal: 'long' },
    text: 'En av de største ålebrosmene, over sytti centimeter lang. Den liker vann som holder seg rundt null grader.',
  },
  {
    id: 'v_haakjerring', name: 'Håkjerring', ground: 'banken', zone: 4, weight: 3, rare: true, value: 4800, cm: [250, 450], kg: [200, 700], difficulty: 9, behavior: 'heavy',
    look: { shape: 'shark', len: 60, h: 14, top: '#3e4448', mid: '#585e62', belly: '#7a7e80', fin: '#363c40', tail: 'round', dorsal: 'low', eye: 1 },
    text: 'Den kan bli flere hundre år gammel, eldst av alle virveldyr. Den svømmer langsommere enn du går.',
  },
  // Dyprenna
  {
    id: 'v_gelatinringbuk', name: 'Gelatinringbuk', ground: 'banken', zone: 5, weight: 16, value: 1100, cm: [10, 30], kg: [0.05, 0.5], difficulty: 6, behavior: 'floater',
    look: { shape: 'chimaera', len: 18, h: 9, top: '#c8a8a8', mid: '#e4c8c8', belly: '#f6e6e6', fin: '#d8b8bc', tail: 'point', dorsal: 'long', eye: 1 },
    text: 'Myk som gelé, med en sugeskive under buken. Den lever langt nord, både på bunnen og oppe i vannet.',
  },
  {
    id: 'v_ishavsringbuk', name: 'Ringbuk', ground: 'banken', zone: 5, weight: 14, value: 1400, cm: [8, 20], kg: [0.03, 0.2], difficulty: 6, behavior: 'floater',
    look: { shape: 'chimaera', len: 15, h: 8, top: '#8a6a4a', mid: '#b08a64', belly: '#e8d4b8', fin: '#9a7a58', pattern: 'mottled', pat: '#5a4430', tail: 'point', dorsal: 'long', eye: 1 },
    text: 'Bukfinnene har vokst sammen til en sugeskive, som en ring under buken. Med den holder den seg fast på steinene.',
  },

  // ===== Eggakanten =====
  // Åpent hav
  {
    id: 'v_kolmule', name: 'Kolmule', ground: 'eggakanten', zone: 0, weight: 26, value: 300, cm: [20, 40], kg: [0.1, 0.5], difficulty: 5, behavior: 'dart',
    look: { shape: 'fusiform', len: 15, h: 5, top: '#4a5a7a', mid: '#a8b4c8', belly: '#eaeef4', fin: '#5a6a88', tail: 'fork', dorsal: 'low', eye: 2 },
    text: 'Den gyter vest for Irland og svømmer helt hit opp for å spise. En lang tur for en så liten fisk.',
  },
  {
    id: 'v_habrann', name: 'Håbrann', ground: 'eggakanten', zone: 0, weight: 3, rare: true, value: 9000, cm: [150, 300], kg: [60, 200], difficulty: 9, behavior: 'heavy',
    look: { shape: 'shark', len: 52, h: 15, top: '#3a4a5a', mid: '#5a6a7a', belly: '#e8eef4', fin: '#34424e', tail: 'lunate', dorsal: 'high', eye: 2 },
    text: 'En hai som holder kroppen mange grader varmere enn vannet rundt. Derfor klarer den seg så langt nord.',
  },
  // Sokkelkanten
  {
    id: 'v_vassild', name: 'Vassild', ground: 'eggakanten', zone: 1, weight: 22, value: 500, cm: [25, 50], kg: [0.2, 1], difficulty: 5, behavior: 'calm',
    look: { shape: 'fusiform', len: 17, h: 5, top: '#6a7a6a', mid: '#c8d4cc', belly: '#f2f6f2', fin: '#8a9a8a', tail: 'fork', dorsal: 'low', eye: 3 },
    text: 'Store øyne og blanke sølvskjell. Den står i stimer langs skråningen og spiser krill og små blekkspruter.',
  },
  {
    id: 'v_blaalange', name: 'Blålange', ground: 'eggakanten', zone: 1, weight: 14, value: 1200, cm: [70, 150], kg: [2, 15], difficulty: 6, behavior: 'heavy',
    look: { shape: 'eel', len: 32, h: 6, top: '#4a5a6a', mid: '#7a8a98', belly: '#c8d0d8', fin: '#5a6a7a', tail: 'round', dorsal: 'long', barbel: true },
    text: 'Langens blågrå slektning fra dypet. Den samles på noen få faste steder langs kanten for å gyte.',
  },
  {
    id: 'v_perlemorfisk', name: 'Perlemorfisk', ground: 'eggakanten', zone: 1, weight: 16, time: 'night', value: 800, cm: [3, 7], kg: [0.005, 0.02], difficulty: 5, behavior: 'dart',
    look: { shape: 'fusiform', len: 10, h: 4, top: '#2e3e54', mid: '#a8b8c8', belly: '#e0e8f0', fin: '#5a6a80', glow: '#8ad8ff', glowAt: 'row', eye: 3 },
    text: 'Bare noen få centimeter lang, med en rad små lys langs buken. Om natta kommer den opp mot overflata for å spise.',
  },
  // Skråningen
  {
    id: 'v_isgalt', name: 'Isgalt', ground: 'eggakanten', zone: 2, weight: 20, value: 1500, cm: [40, 100], kg: [0.5, 4], difficulty: 6, behavior: 'floater',
    look: { shape: 'chimaera', len: 26, h: 9, top: '#5e6068', mid: '#8e9098', belly: '#c4c4cc', fin: '#6e7078', tail: 'point', dorsal: 'high', eye: 3, barbel: true },
    text: 'Halen blir tynnere og tynnere til den bare er en tråd. Hele huden er ru av små pigger.',
  },
  {
    id: 'v_oksefisk', name: 'Øksefisk', ground: 'eggakanten', zone: 2, weight: 14, value: 1800, cm: [4, 9], kg: [0.005, 0.03], difficulty: 6, behavior: 'floater',
    look: { shape: 'hatchet', len: 11, h: 9, top: '#5a6a7a', mid: '#c8d4e0', belly: '#eef2f8', fin: '#8a9aaa', glow: '#9ae0ff', glowAt: 'belly', eye: 3 },
    text: 'Den er flat som et øksehode, og øynene peker rett opp. Lysene på buken gjør at den ikke synes mot det svake lyset ovenfra.',
  },
  {
    id: 'v_lysprikkfisk', name: 'Nordlig lysprikkfisk', ground: 'eggakanten', zone: 2, weight: 18, value: 1100, cm: [4, 10], kg: [0.01, 0.03], difficulty: 5, behavior: 'dart',
    look: { shape: 'fusiform', len: 11, h: 4, top: '#1e2a3c', mid: '#2e4054', belly: '#405870', fin: '#2a3a4e', glow: '#6affd8', glowAt: 'row', eye: 2 },
    text: 'Hver natt svømmer den flere hundre meter opp for å spise. Før det blir lyst, er den nede i mørket igjen.',
  },
  // Dypskråningen
  {
    id: 'v_skolest', name: 'Skolest', ground: 'eggakanten', zone: 3, weight: 20, value: 2200, cm: [50, 100], kg: [0.8, 3], difficulty: 7, behavior: 'floater',
    look: { shape: 'chimaera', len: 28, h: 8, top: '#4a4a52', mid: '#6e6e78', belly: '#9a9aa4', fin: '#56565e', tail: 'point', dorsal: 'high', eye: 3 },
    text: 'Store øyne og en hale som ender i en tråd. Den kan bli over femti år gammel.',
  },
  {
    id: 'v_arktisk_alebrosme', name: 'Arktisk ålebrosme', ground: 'eggakanten', zone: 3, weight: 16, value: 2600, cm: [30, 75], kg: [0.4, 3], difficulty: 7, behavior: 'sinker',
    look: { shape: 'eel', len: 28, h: 7, top: '#5a4a3e', mid: '#7e6a58', belly: '#c8b49c', fin: '#4a3c30', pattern: 'mottled', pat: '#2e241c', tail: 'round', dorsal: 'long' },
    text: 'Den har et mønster som et nett over ryggen. Derfor heter den reticulatus, «nettet», på latin.',
  },
  // Kaldtvannet
  {
    id: 'v_isskate', name: 'Isskate', ground: 'eggakanten', zone: 4, weight: 16, value: 3200, cm: [50, 100], kg: [1, 8], difficulty: 8, behavior: 'sinker',
    look: { shape: 'flat', len: 26, h: 16, top: '#4a4448', mid: '#6a6268', belly: '#e8e4e0', fin: '#5a5258', pattern: 'spots', pat: '#2e2a2e', tail: 'point', dorsal: 'none', eye: 2 },
    text: 'En av svært få skater som lever i vann kaldere enn null grader. Den har store torner langs midten av ryggen.',
  },
  // Dypsletta
  {
    id: 'v_blek_alebrosme', name: 'Blek ålebrosme', ground: 'eggakanten', zone: 5, weight: 16, value: 3000, cm: [15, 30], kg: [0.05, 0.3], difficulty: 7, behavior: 'sinker',
    look: { shape: 'eel', len: 22, h: 6, top: '#a89a8a', mid: '#c8bcae', belly: '#ece4da', fin: '#9a8c7c', pattern: 'bars', pat: '#7a6c5c', tail: 'round', dorsal: 'long' },
    text: 'Nesten uten farge, som så mye som lever i mørket. Den spiser små krepsdyr og mark i mudderet langt nede.',
  },
  {
    id: 'v_svart_ringbuk', name: 'Svart ringbuk', ground: 'eggakanten', zone: 5, weight: 20, value: 4000, cm: [10, 25], kg: [0.03, 0.3], difficulty: 8, behavior: 'floater',
    look: { shape: 'chimaera', len: 17, h: 8, top: '#1a1418', mid: '#2a2228', belly: '#3a3036', fin: '#221a20', tail: 'point', dorsal: 'long', eye: 1 },
    text: 'Svart helt inn i munnen, og myk som gelé. Den lever dypere enn nesten alle andre fisker i Norskehavet.',
  },
  // ===== Den unge =====
  {
    id: 'v_unge', name: 'Den unge', ground: 'eggakanten', zone: 5, weight: 0, special: true, value: 0, cm: [260, 260], kg: [90, 90], difficulty: 10, behavior: 'heavy',
    look: { shape: 'fusiform', len: 40, h: 14, top: '#24467e', mid: '#4a7ec0', belly: '#a4d0f0', fin: '#3462ae', pattern: 'spots', pat: '#f0f8ff', tail: 'diamond', dorsal: 'high', eye: 3, eyeColor: '#ffe9a8', glow: '#b4f0ff', glowAt: 'lines' },
    text: 'Hun sirklet rundt lyset ditt og var ikke redd. Den gamle sang, og den unge hørte etter.',
  },

  // ===== Legender =====
  {
    id: 'v_gamlegra', name: 'Gamle Grå', ground: 'sundet', zone: 3, weight: 0, legend: true, value: 6000, cm: [150, 165], kg: [40, 55], difficulty: 9, behavior: 'heavy',
    look: { shape: 'fusiform', len: 40, h: 14, top: '#5a5a50', mid: '#9a988a', belly: '#e4e2d8', fin: '#7a786c', pattern: 'mottled', pat: '#3e3e36', tail: 'square', dorsal: 'low', barbel: true, eye: 2 },
    text: 'En kysttorsk så gammel at den er blitt grå. Signe kalte den Gamle Grå da hun var jente, og den var gammel allerede da.',
  },
  {
    id: 'v_kongen', name: 'Kongen av Varanger', ground: 'fjorden', zone: 1, weight: 0, legend: true, pot: true, value: 9000, cm: [23, 24], kg: [13, 15], difficulty: 9, behavior: 'heavy',
    look: { shape: 'crab', len: 30, h: 16, top: '#6a1a22', mid: '#9a2e30', belly: '#f4e0c8', fin: '#8a2228', pattern: 'spots', pat: '#f0b07a' },
    text: 'En kongekrabbe så stor at den knapt fikk plass i teina. Aslak sier han har hørt om den i førti år, men aldri sett den.',
  },
  {
    id: 'v_gullsjarken', name: 'Gullsjarken', ground: 'fjorden', zone: 3, weight: 0, legend: true, value: 12000, cm: [85, 95], kg: [12, 15], difficulty: 9, behavior: 'calm',
    look: { shape: 'deep', len: 28, h: 13, top: '#d8902a', mid: '#f4c04a', belly: '#fff0b0', fin: '#e8a83a', tail: 'square', dorsal: 'spiny', eye: 3, eyeColor: '#ffe9a8' },
    text: 'En uer så gul at den glinser som gull. Fiskerne sa den var verdt mer enn en hel sjark, og at den bare viser seg i tåka.',
  },
  {
    id: 'v_lavedora', name: 'Låvedøra', ground: 'banken', zone: 2, weight: 0, legend: true, value: 25000, cm: [280, 300], kg: [280, 320], difficulty: 10, behavior: 'heavy',
    look: { shape: 'flat', len: 60, h: 30, top: '#2e3028', mid: '#4a4c40', belly: '#ecece2', fin: '#3a3c32', pattern: 'mottled', pat: '#1e2018', tail: 'lunate', dorsal: 'long', eye: 3 },
    text: 'En kveite på størrelse med ei låvedør. Det sies at den har slitt av flere snører enn noen kan telle.',
  },
  {
    id: 'v_isdronninga', name: 'Isdronninga', ground: 'eggakanten', zone: 3, weight: 0, legend: true, time: 'night', value: 40000, cm: [125, 135], kg: [40, 48], difficulty: 10, behavior: 'heavy',
    look: { shape: 'flat', len: 44, h: 20, top: '#c8d4e4', mid: '#e0e8f2', belly: '#f6f8fc', fin: '#b0c0d8', tail: 'square', dorsal: 'long', eye: 3, eyeColor: '#9ae8ff', teeth: true },
    text: 'En blåkveite nesten helt hvit, som is. Ingen vet om den er en eventyrfisk eller bare veldig gammel.',
  },
]

/** When a legend may bite; chance is per bite (or per pot haul for crabs) while the rule holds */
export const VA_LEGEND_RULES: { id: string; ground: GroundId; zone: number; time?: 'day' | 'night' | 'dawn'; weather?: 'rain' | 'fog'; minBoat?: number; chance: number; hint: string }[] = [
  { id: 'v_gamlegra', ground: 'sundet', zone: 3, time: 'dawn', chance: 0.04, hint: 'Gamle Grå står i Strømmen i Bussesundet, og han biter bare når sola står opp.' },
  { id: 'v_kongen', ground: 'fjorden', zone: 1, minBoat: 1, chance: 0.02, hint: 'Aslak sier Kongen av Varanger går i teina én gang i livet, hvis du er heldig.' },
  { id: 'v_gullsjarken', ground: 'fjorden', zone: 3, weather: 'fog', chance: 0.035, hint: 'Mor sa at Gullsjarken bare viser seg midt i fjorden når havtåka ligger tett.' },
  { id: 'v_lavedora', ground: 'banken', zone: 2, weather: 'rain', minBoat: 2, chance: 0.03, hint: 'Far sa at Låvedøra bare biter når det regner på banken.' },
  { id: 'v_isdronninga', ground: 'eggakanten', zone: 3, time: 'night', minBoat: 3, chance: 0.025, hint: 'Isdronninga kommer opp langs eggakanten om natta, når alle andre sover.' },
]

// ---------- gear ----------

export const VA_GEAR: Record<GearKind, { title: string; levels: GearLevel[] }> = {
  line: {
    title: 'Snøre',
    levels: [
      { name: 'Håndsnøre', price: 0, value: 30, text: 'Signes gamle håndsnøre fra loftet. Rekker 30 meter.' },
      { name: 'Sundsnøre', price: 500, value: 80, text: 'Ned i renna i sundet, 80 meter.' },
      { name: 'Fjordline', price: 2400, value: 160, text: 'Ned på krabbebunnen i fjorden. 160 meter.', needs: 'va_boat1', needsText: 'Krever sjark' },
      { name: 'Bankline', price: 8000, value: 400, text: 'Helt ned i Polarfronten, 400 meter.', needs: 'va_boat2', needsText: 'Krever kystbåt' },
      { name: 'Eggaline', price: 22000, value: 800, text: 'Nedover skråningen på eggakanten, 800 meter.', needs: 'va_boat3', needsText: 'Krever havfiskebåt' },
      { name: 'Elles line', price: 0, value: 2000, text: 'Elle egnet denne linja i femti år. Aslak sier den rekker helt til bunns.', gift: true },
    ],
  },
  rod: {
    title: 'Stang',
    levels: [
      { name: 'Pilkestang', price: 0, value: 0.27, text: 'Den stod bak døra i Signes gang.' },
      { name: 'Kystpilk', price: 700, value: 0.33, text: 'Større fangstfelt.' },
      { name: 'Barentsstang', price: 3200, value: 0.39, text: 'Tåler høststormene i Barentshavet.' },
      { name: 'Aslaks stang', price: 12000, value: 0.46, text: 'Aslak spikket den av bjørk fra Varangerhalvøya. Han sier den vet hvor fisken står.', needs: 'va_metAslak', needsText: 'Bli kjent med Aslak først' },
    ],
  },
  reel: {
    title: 'Snelle',
    levels: [
      { name: 'Treskje', price: 0, value: 1, text: 'Den samme gamle.' },
      { name: 'Havsnelle', price: 1000, value: 1.25, text: 'Haler raskere inn.' },
      { name: 'Elektrisk snelle', price: 4200, value: 1.5, text: 'Den drar fisken opp fra dypet for deg, nesten.' },
      { name: 'Fridas snelle', price: 0, value: 1.85, text: 'Frida dreide den selv på Slippen. Hun sier den er nøyaktig på en tidels millimeter.', gift: true },
    ],
  },
  bucket: {
    title: 'Fiskekasse',
    levels: [
      { name: 'Bøtte', price: 0, value: 6, text: 'Plass til 6 fisk.' },
      { name: 'Fiskekasse', price: 600, value: 10, text: 'Plass til 10 fisk.' },
      { name: 'Isboks', price: 2400, value: 16, text: 'Plass til 16 fisk.' },
      { name: 'Kjølekar', price: 7200, value: 24, text: 'Plass til 24 fisk.' },
    ],
  },
  lure: {
    title: 'Agn',
    levels: [
      { name: 'Blank pilk', price: 0, value: 1, text: 'Det glinser, og torsken vil ha det.' },
      { name: 'Lodde på krok', price: 800, value: 1.35, text: 'Alt i Barentshavet spiser lodde. Sjeldne fisk blir nysgjerrige.' },
      { name: 'Rød sprut', price: 3300, value: 1.7, text: 'En gummiblekksprut. Enda flere sjeldne fisk.' },
      { name: 'Selvlysende pilk', price: 10000, value: 2.2, text: 'Den lyser i høstmørket. Ingen fisk kan la den være.' },
    ],
  },
  lamp: {
    title: 'Lykt',
    levels: [
      { name: 'Ingen lykt', price: 0, value: 14, text: 'Bare en blank krok.' },
      { name: 'Hodelykt', price: 0, value: 42, text: 'Lyser opp litt i mørket.', gift: true },
      { name: 'Dykkerlykt', price: 4500, value: 62, text: 'Ser langt i mørket.', needs: 'lamp1', needsText: 'Krever hodelykt' },
      { name: 'Signes lykt', price: 0, value: 88, text: 'Stormlykta Signe hadde i vinduet da hun var jente. Den lyser fortsatt.', gift: true },
    ],
  },
}

// ---------- Brita's list ----------
// zone and distinct goals count the zone index within whatever ground you are on

export const VA_QUESTS: Quest[] = [
  { id: 'v1', title: 'Fang tre fisk', goal: { kind: 'catch', n: 3 }, money: 200 },
  { id: 'v2', title: 'Fang en kysttorsk', goal: { kind: 'species', id: 'v_torsk', n: 1 }, money: 300 },
  { id: 'v3', title: 'Fang tre pukkellaks', goal: { kind: 'species', id: 'v_pukkellaks', n: 3 }, money: 500 },
  { id: 'v4', title: 'Selg fisk for 1500 kr', goal: { kind: 'sell', kr: 1500 }, money: 400 },
  { id: 'v5', title: 'Fang tre ulike arter på grunna', goal: { kind: 'distinct', zone: 0, n: 3 }, money: 600 },
  { id: 'v6', title: 'Fang en rognkjeks', goal: { kind: 'species', id: 'v_rognkjeks', n: 1 }, money: 500 },
  { id: 'v7', title: 'Fang tre fisk om natta', goal: { kind: 'night', n: 3 }, money: 800 },
  { id: 'v8', title: 'Slipp ut fem fisk', goal: { kind: 'release', n: 5 }, money: 800 },
  { id: 'v9', title: 'Fang en sjørøye', goal: { kind: 'species', id: 'v_sjoroye', n: 1 }, money: 1200 },
  { id: 'v10', title: 'Fang ti pukkellaks', goal: { kind: 'species', id: 'v_pukkellaks', n: 10 }, money: 2000 },
  { id: 'v11', title: 'Fang en fisk på over 10 kg', goal: { kind: 'heavy', kg: 10 }, money: 1500 },
  { id: 'v12', title: 'Fem perfekte fangster', goal: { kind: 'perfect', n: 5 }, money: 1500 },
  { id: 'v13', title: 'Fang en uer', goal: { kind: 'species', id: 'v_uer', n: 1 }, money: 2500 },
  { id: 'v14', title: 'Finn en skattekiste', goal: { kind: 'treasure', n: 1 }, money: 2000 },
  { id: 'v15', title: 'Fang en kveite', goal: { kind: 'species', id: 'v_kveite', n: 1 }, money: 3000 },
  { id: 'v16', title: 'Fang 25 pukkellaks', goal: { kind: 'species', id: 'v_pukkellaks', n: 25 }, money: 5000 },
  { id: 'v17', title: 'Fang en blåkveite', goal: { kind: 'species', id: 'v_blakveite', n: 1 }, unlock: 'gift:reel:3', reward: 'Fridas snelle' },
  { id: 'v18', title: 'Selg fisk for 30 000 kr', goal: { kind: 'sell', kr: 30000 }, money: 6000 },
  { id: 'v19', title: 'Fang en håkjerring', goal: { kind: 'species', id: 'v_haakjerring', n: 1 }, money: 10000 },
  { id: 'v20', title: 'Fang ti fisk i det dypeste beltet', goal: { kind: 'zone', zone: 5, n: 10 }, money: 15000 },
  { id: 'v21', title: 'Fang en isgalt', goal: { kind: 'species', id: 'v_isgalt', n: 1 }, unlock: 'gift:line:5', reward: 'Elles line' },
  { id: 'v22', title: 'Fang en fisk på over 150 kg', goal: { kind: 'heavy', kg: 150 }, money: 25000 },
  { id: 'v23', title: 'Fang en svart ringbuk', goal: { kind: 'species', id: 'v_svart_ringbuk', n: 1 }, money: 40000 },
  { id: 'v24', title: 'Selg fisk for 250 000 kr', goal: { kind: 'sell', kr: 250000 }, unlock: 'va_goldpaint', reward: 'Gullmaling til båten' },
]

// ---------- the book ----------

/** Everything that counts in the book: no specials, no legends (they have their own page) */
export const VA_BOOK = VA_SPECIES.filter((s) => !s.special && !s.legend)

export const VA_BOOK_REWARDS: { n: number; text: string; money?: number; gift?: [GearKind, number]; flag?: string }[] = [
  { n: 5, text: 'Hodelykt', gift: ['lamp', 1] },
  { n: 12, text: '3000 kr', money: 3000 },
  { n: 20, text: '8000 kr', money: 8000 },
  { n: 30, text: 'Signes lykt', gift: ['lamp', 3] },
  { n: 40, text: '20 000 kr', money: 20000 },
  { n: 50, text: '50 000 kr', money: 50000 },
  { n: VA_BOOK.length, text: 'Vardø-medaljen', flag: 'va_medal' },
]

export const VA_PAINTS: { id: string; name: string; hull: string; stripe: string; price: number; needs?: string }[] = [
  { id: 'va_hvit', name: 'Hvit og rød', hull: '#ece8e0', stripe: '#b23a32', price: 0 },
  { id: 'va_bla', name: 'Signe-blå', hull: '#3a6a9a', stripe: '#f0ece0', price: 1200 },
  { id: 'va_krykkje', name: 'Krykkje', hull: '#e8e8e4', stripe: '#2a2a2e', price: 1200 },
  { id: 'va_pomor', name: 'Pomor', hull: '#2a5a3e', stripe: '#e8c04a', price: 1500 },
  { id: 'va_nordlys', name: 'Nordlys', hull: '#1e2a4a', stripe: '#8affd8', price: 1500 },
  { id: 'va_regatta', name: 'Regatta', hull: '#f2f0ea', stripe: '#1e6ac8', price: 0, needs: 'va_regattaWon' },
  { id: 'va_gull', name: 'Gull', hull: '#f2c24a', stripe: '#8a5a2a', price: 0, needs: 'va_goldpaint' },
]

// ---------- things on the sea floor ----------

/** Nadja's three Pomor things, in order: kettle lid, kopek, trader's letter */
export const VA_POMOR_DEPTHS: { ground: GroundId; depth: number }[] = [
  { ground: 'sundet', depth: 68 },
  { ground: 'sundet', depth: 132 },
  { ground: 'fjorden', depth: 285 },
]

/** Depths where a lost ghost net can lie for a ghostnet contract */
export const VA_GHOSTNET_DEPTHS: Record<GroundId, number[]> = {
  sundet: [40, 95, 135],
  fjorden: [70, 180, 290, 370],
  banken: [130, 260, 420, 560],
  eggakanten: [380, 820, 1350, 1800],
}

/**
 * Legal minimum carapace length in mm, by crab species. Crabs without an entry have no
 * size limit. Kongekrabbe: 130 mm skallengde in the regulated area east of 26°E.
 * Snøkrabbe: the real rule is 95 mm shell *width* (skallbredde); the carapace is a bit
 * wider than it is long, so 95 mm width is roughly 85 mm length on our length gauge.
 */
export const CRAB_MIN_MM: Record<string, number> = {
  v_kongekrabbe: 130,
  v_kongen: 130,
  v_snokrabbe: 85,
}

/** The fish that can bite on the hook on a ground (no crabs, legends or Den unge) */
export function groundSpecies(g: GroundId): Species[] {
  return VA_SPECIES.filter((s) => s.ground === g && !s.pot && !s.legend && !s.special)
}
