import type { Look } from '../art/fishgen'
import { AK_BOOK_REWARDS, AK_GEAR, AK_PAINTS, AK_QUESTS, AK_SPECIES, AK_ZONES } from './alaska'
import { HI_BOOK_REWARDS, HI_GEAR, HI_PAINTS, HI_QUESTS, HI_SPECIES, HI_ZONES } from './hawaii'
import { LO_BOOK_REWARDS, LO_GEAR, LO_PAINTS, LO_QUESTS, LO_SPECIES, LO_ZONES } from './lofoten'

// ---------- depth zones ----------

export interface Zone {
  name: string
  from: number
  to: number
  /** water colours at the top and bottom of the zone */
  water: [string, string]
  rock: string
}

const NO_ZONES: Zone[] = [
  { name: 'Grunna', from: 0, to: 25, water: ['#2f8fb0', '#23779a'], rock: '#5f7a58' },
  { name: 'Tareskogen', from: 25, to: 60, water: ['#23779a', '#1a5e82'], rock: '#4c6450' },
  { name: 'Skumringen', from: 60, to: 150, water: ['#1a5e82', '#1a4272'], rock: '#3e4c66' },
  { name: 'Dypet', from: 150, to: 400, water: ['#1a4272', '#162a5e'], rock: '#323a5c' },
  { name: 'Avgrunnen', from: 400, to: 1000, water: ['#162a5e', '#0e1238'], rock: '#262648' },
  { name: 'Grøfta', from: 1000, to: 1200, water: ['#0e1238', '#08081e'], rock: '#1e1a36' },
]

/** World pixels per zone */
/** The zones of the place you are fishing now (see setWorld) */
export let ZONES: Zone[] = NO_ZONES

export const ZONE_H = 300
export const WORLD_BOTTOM = NO_ZONES.length * ZONE_H

export function depthToY(d: number) {
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i]
    if (d <= z.to) return i * ZONE_H + ((d - z.from) / (z.to - z.from)) * ZONE_H
  }
  return WORLD_BOTTOM
}

export function yToDepth(y: number) {
  const i = Math.max(0, Math.min(ZONES.length - 1, Math.floor(y / ZONE_H)))
  const z = ZONES[i]
  return z.from + ((Math.max(0, y) - i * ZONE_H) / ZONE_H) * (z.to - z.from)
}

export const zoneAt = (y: number) => Math.max(0, Math.min(ZONES.length - 1, Math.floor(y / ZONE_H)))

// ---------- fish ----------

export type Behavior = 'calm' | 'dart' | 'sinker' | 'floater' | 'heavy'
export type TimeRule = 'day' | 'night' | 'any'

export interface Species {
  id: string
  name: string
  zone: number
  /** relative chance among the zone's fish */
  weight: number
  rare?: boolean
  time?: TimeRule
  value: number
  cm: [number, number]
  kg: [number, number]
  difficulty: number
  behavior: Behavior
  look: Look
  text: string
  /** Not part of normal spawning */
  special?: boolean
}

const NO_SPECIES: Species[] = [
  // Grunna
  {
    id: 'sild', name: 'Sild', zone: 0, weight: 30, value: 6, cm: [20, 35], kg: [0.1, 0.4], difficulty: 1, behavior: 'calm',
    look: { shape: 'fusiform', len: 13, h: 5, top: '#2f5d9a', mid: '#a6cbe0', belly: '#eef5f7', fin: '#8fb4c8', dorsal: 'low' },
    text: 'Sølvet i havet. Svømmer i store stimer og er grunnen til at det står hus langs hele kysten.',
  },
  {
    id: 'makrell', name: 'Makrell', zone: 0, weight: 24, value: 14, cm: [25, 45], kg: [0.3, 1.2], difficulty: 2, behavior: 'dart',
    look: { shape: 'fusiform', len: 17, h: 6, top: '#1f8a72', mid: '#86d3b6', belly: '#f2f8ee', fin: '#5aa890', pattern: 'wavy', pat: '#123a3c', dorsal: 'low' },
    text: 'Rask og sulten. Kommer inn mot land når sjøen blir varm, og biter på nesten hva som helst.',
  },
  {
    id: 'sei', name: 'Sei', zone: 0, weight: 20, value: 12, cm: [30, 80], kg: [0.4, 4], difficulty: 2, behavior: 'calm',
    look: { shape: 'fusiform', len: 19, h: 7, top: '#3b4d58', mid: '#8496a0', belly: '#d2dbda', fin: '#5a6c76', pattern: 'line', pat: '#e2ece8', dorsal: 'low' },
    text: 'Den grå arbeidshesten i fjorden. Glir rundt i flokker og gir seg aldri før den må.',
  },
  {
    id: 'lyr', name: 'Lyr', zone: 0, weight: 14, value: 16, cm: [30, 75], kg: [0.4, 5], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 19, h: 7, top: '#6f5a2a', mid: '#c2a55a', belly: '#f0e4bc', fin: '#9a8040', pattern: 'line', pat: '#3e3018', dorsal: 'low' },
    text: 'Bronsefarget og sta. Står gjerne og lurer ved tareskogen og stuper når den kjenner kroken.',
  },
  {
    id: 'rodspette', name: 'Rødspette', zone: 0, weight: 10, value: 22, cm: [25, 50], kg: [0.3, 2], difficulty: 3, behavior: 'sinker',
    look: { shape: 'flat', len: 17, h: 11, top: '#8f6c45', mid: '#a7835a', belly: '#b99468', fin: '#9a7650', pattern: 'spots', pat: '#ff7a2e', tail: 'round', dorsal: 'long' },
    text: 'Ligger flatt på sandbunnen med begge øynene på samme side. De oransje prikkene lyser som glør.',
  },
  {
    id: 'hornfisk', name: 'Hornfisk', zone: 0, weight: 4, rare: true, time: 'day', value: 48, cm: [50, 90], kg: [0.4, 1.3], difficulty: 5, behavior: 'dart',
    look: { shape: 'long', len: 24, h: 3, top: '#2e8f5e', mid: '#78d8a2', belly: '#eaf7e2', fin: '#4aa874', beak: true, tail: 'fork', dorsal: 'none' },
    text: 'Et grønt spyd med nebb. Hopper over bølgene på solfylte dager. Beina er grønne, helt sant.',
  },

  // Tareskogen
  {
    id: 'torsk', name: 'Torsk', zone: 1, weight: 22, value: 30, cm: [40, 110], kg: [0.8, 12], difficulty: 3, behavior: 'heavy',
    look: { shape: 'fusiform', len: 23, h: 9, top: '#7d6c3a', mid: '#bdac6a', belly: '#f1e8c8', fin: '#9c8c56', pattern: 'mottled', pat: '#5a4a26', tail: 'square', dorsal: 'low', barbel: true },
    text: 'Kongen av kysten. Har skjegg på haka og et gap som slukker det meste. Bygget hele landsdeler.',
  },
  {
    id: 'berggylt', name: 'Berggylt', zone: 1, weight: 16, value: 28, cm: [25, 55], kg: [0.4, 3], difficulty: 3, behavior: 'calm',
    look: { shape: 'deep', len: 17, h: 9, top: '#2f7f3e', mid: '#72c45c', belly: '#f4c45a', fin: '#5aa84a', pattern: 'spots', pat: '#f8e48c', tail: 'round', dorsal: 'spiny' },
    text: 'Fargerik og nysgjerrig. Starter livet som hunn, og noen blir hanner når de er store nok.',
  },
  {
    id: 'blastal', name: 'Blåstål', zone: 1, weight: 6, rare: true, value: 58, cm: [25, 35], kg: [0.2, 0.6], difficulty: 4, behavior: 'dart',
    look: { shape: 'deep', len: 17, h: 8, top: '#ff7a2e', mid: '#ff9c4a', belly: '#ffd48a', fin: '#ff8a3a', pattern: 'stripes', pat: '#2fb6ff', tail: 'round', dorsal: 'spiny' },
    text: 'Ser ut som den har svømt hit fra et korallrev. Hannene er oransje med elektrisk blå tegninger.',
  },
  {
    id: 'rognkjeks', name: 'Rognkjeks', zone: 1, weight: 12, value: 36, cm: [20, 45], kg: [0.5, 4], difficulty: 2, behavior: 'sinker',
    look: { shape: 'round', len: 13, h: 11, top: '#50803c', mid: '#8eb45e', belly: '#ee9c48', fin: '#6e9a4a', pattern: 'spots', pat: '#2c4a22', tail: 'round', dorsal: 'none' },
    text: 'En liten, rund klump med sugekopp på magen. Pappaen passer på eggene helt alene.',
  },
  {
    id: 'piggvar', name: 'Piggvar', zone: 1, weight: 7, value: 72, cm: [35, 80], kg: [1, 10], difficulty: 5, behavior: 'sinker',
    look: { shape: 'flat', len: 21, h: 14, top: '#6c5c4a', mid: '#8a7a62', belly: '#9c8c72', fin: '#7c6c56', pattern: 'mottled', pat: '#c9b796', tail: 'round', dorsal: 'long' },
    text: 'En flat kamuflasjemester med knuter i huden. Kokker over hele verden vil ha den.',
  },
  {
    id: 'havkatt', name: 'Havkatt', zone: 1, weight: 4, rare: true, time: 'night', value: 95, cm: [60, 120], kg: [2, 15], difficulty: 6, behavior: 'heavy',
    look: { shape: 'eel', len: 29, h: 8, top: '#5c6d7c', mid: '#8c9ca8', belly: '#cdd1cc', fin: '#6c7c88', pattern: 'bars', pat: '#2e3a48', tail: 'round', dorsal: 'long', teeth: true },
    text: 'Stygg som natta og snill som et lam. Knuser kråkeboller med tennene og kommer fram når det er mørkt.',
  },

  // Skumringen
  {
    id: 'lange', name: 'Lange', zone: 2, weight: 18, value: 52, cm: [60, 160], kg: [2, 20], difficulty: 4, behavior: 'heavy',
    look: { shape: 'eel', len: 33, h: 6, top: '#6c5c3a', mid: '#9c8c5c', belly: '#dccfaa', fin: '#8a7a4c', pattern: 'mottled', pat: '#4c3e24', tail: 'round', dorsal: 'long', barbel: true },
    text: 'Lang og seig. Gjemmer seg i sprekker i berget og hogger etter alt som kommer forbi.',
  },
  {
    id: 'uer', name: 'Uer', zone: 2, weight: 16, value: 62, cm: [30, 60], kg: [0.6, 4], difficulty: 4, behavior: 'calm',
    look: { shape: 'deep', len: 19, h: 9, top: '#d43a2e', mid: '#ff6c4a', belly: '#ffb48c', fin: '#e84a3a', tail: 'square', dorsal: 'spiny', eye: 2 },
    text: 'Knallrød med store øyne. Kan bli over hundre år gammel. Rødt er usynlig der nede, så den er godt gjemt.',
  },
  {
    id: 'brosme', name: 'Brosme', zone: 2, weight: 16, value: 46, cm: [40, 100], kg: [1, 10], difficulty: 3, behavior: 'sinker',
    look: { shape: 'fusiform', len: 22, h: 8, top: '#6c4a2e', mid: '#9c6c40', belly: '#e2c28c', fin: '#7c5434', tail: 'round', dorsal: 'long', barbel: true },
    text: 'Brun og rolig med en lang ryggfinne som bølger. Har sin egen lille skjeggtust.',
  },
  {
    id: 'breiflabb', name: 'Breiflabb', zone: 2, weight: 7, value: 125, cm: [50, 150], kg: [3, 40], difficulty: 6, behavior: 'heavy',
    look: { shape: 'angler', len: 28, h: 16, top: '#6c5c3e', mid: '#8c7c52', belly: '#c9b98a', fin: '#7c6c48', pattern: 'mottled', pat: '#4a3c26', tail: 'square', dorsal: 'none', lure: true, glow: '#ffdc6a' },
    text: 'Mest munn. Ligger stille og vifter med fiskestanga si til noen blir nysgjerrige nok.',
  },
  {
    id: 'kveite', name: 'Kveite', zone: 2, weight: 3, rare: true, value: 230, cm: [80, 250], kg: [8, 150], difficulty: 8, behavior: 'heavy',
    look: { shape: 'flat', len: 38, h: 18, top: '#4c4c40', mid: '#6c6c54', belly: '#7c7c62', fin: '#5c5c4a', pattern: 'mottled', pat: '#3a3a30', tail: 'lunate', dorsal: 'long', eye: 2 },
    text: 'Havets dør. Den største flatfisken som finnes. Bestefar snakket om en på størrelse med en låvedør.',
  },

  // Dypet
  {
    id: 'blakveite', name: 'Blåkveite', zone: 3, weight: 18, value: 110, cm: [50, 110], kg: [2, 20], difficulty: 5, behavior: 'sinker',
    look: { shape: 'flat', len: 28, h: 13, top: '#2e3c52', mid: '#4a5c72', belly: '#5c6e84', fin: '#3e4e64', tail: 'lunate', dorsal: 'long', eye: 2 },
    text: 'Mørk og glatt. Svømmer mer opprett enn andre flatfisk, som om den ikke helt har bestemt seg.',
  },
  {
    id: 'havmus', name: 'Havmus', zone: 3, weight: 14, value: 135, cm: [40, 100], kg: [0.6, 3], difficulty: 5, behavior: 'floater',
    look: { shape: 'chimaera', len: 28, h: 10, top: '#8c7c6e', mid: '#cbbaaa', belly: '#efe4d8', fin: '#a89888', pattern: 'spots', pat: '#f6ecde', tail: 'point', dorsal: 'high', eye: 3, eyeColor: '#5affb4', glowAt: 'eye', glow: '#5affb4' },
    text: 'En levende fossil i slekt med haiene. Grønne øyne som speiler lys og en hale som en tråd.',
  },
  {
    id: 'vassild', name: 'Vassild', zone: 3, weight: 18, value: 64, cm: [25, 55], kg: [0.2, 1], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 17, h: 5, top: '#8ca2b2', mid: '#d4e0e8', belly: '#f4f8fa', fin: '#a8bccc', eye: 2, dorsal: 'low' },
    text: 'Sølvblank med store øyne som drikker hvert lille glimt av lys.',
  },
  {
    id: 'skolest', name: 'Skolest', zone: 3, weight: 12, value: 84, cm: [40, 100], kg: [0.5, 3], difficulty: 4, behavior: 'floater',
    look: { shape: 'chimaera', len: 25, h: 8, top: '#6c707c', mid: '#9ca2ac', belly: '#cdd2d8', fin: '#7c828c', tail: 'point', dorsal: 'high', eye: 2 },
    text: 'Rottehale og stort hode. Svømmer med nesa ned og leter i mudderet.',
  },
  {
    id: 'hakjerring', name: 'Håkjerring', zone: 3, weight: 2, rare: true, value: 640, cm: [300, 550], kg: [300, 1000], difficulty: 9, behavior: 'heavy',
    look: { shape: 'shark', len: 54, h: 14, top: '#4a4e58', mid: '#6c707a', belly: '#9ca2a8', fin: '#545862', tail: 'lunate', dorsal: 'low', eyeColor: '#c8f0ff', glowAt: 'eye', glow: '#c8f0ff' },
    text: 'Verdens eldste virveldyr. Denne kan ha vært ung da bestefaren til bestefaren din ble født.',
  },

  // Avgrunnen
  {
    id: 'lysprikk', name: 'Lysprikkfisk', zone: 4, weight: 24, value: 92, cm: [5, 15], kg: [0.02, 0.1], difficulty: 3, behavior: 'dart',
    look: { shape: 'fusiform', len: 12, h: 4, top: '#1e2a3c', mid: '#2e4054', belly: '#405870', fin: '#2a3a4e', glow: '#6affff', glowAt: 'row', eye: 1 },
    text: 'Små lykter i mørket. Det finnes flere av dem enn av nesten noe annet dyr på jorda.',
  },
  {
    id: 'okse', name: 'Øksefisk', zone: 4, weight: 18, value: 115, cm: [4, 12], kg: [0.01, 0.06], difficulty: 3, behavior: 'floater',
    look: { shape: 'hatchet', len: 12, h: 10, top: '#a8b8c8', mid: '#dce8f2', belly: '#eef6fa', fin: '#b8c8d6', glow: '#8affff', glowAt: 'belly', eye: 2, tail: 'square', dorsal: 'low' },
    text: 'Tynn som et barberblad og blank som et speil. Lyser under magen så den forsvinner mot lyset ovenfra.',
  },
  {
    id: 'huggorm', name: 'Huggormfisk', zone: 4, weight: 12, value: 220, cm: [20, 35], kg: [0.05, 0.3], difficulty: 6, behavior: 'dart',
    look: { shape: 'long', len: 23, h: 6, top: '#1a2a3c', mid: '#2e4a60', belly: '#3e5a72', fin: '#2a3e52', glow: '#6ab8ff', glowAt: 'row', teeth: true, bigMouth: true, eye: 1, dorsal: 'low', tail: 'fork' },
    text: 'Tennene er så lange at den ikke får lukket munnen. Heldigvis er den mindre enn en banan.',
  },
  {
    id: 'pelikanal', name: 'Pelikanål', zone: 4, weight: 8, value: 260, cm: [40, 100], kg: [0.2, 1], difficulty: 6, behavior: 'floater',
    look: { shape: 'eel', len: 34, h: 6, top: '#141418', mid: '#24242c', belly: '#34343e', fin: '#1c1c22', glow: '#ff6ab8', glowAt: 'tail', bigMouth: true, eye: 1, tail: 'point', dorsal: 'long' },
    text: 'En munn med en hale på. Halespissen lyser rosa, ingen vet helt hvorfor.',
  },
  {
    id: 'sildekonge', name: 'Sildekonge', zone: 4, weight: 2, rare: true, value: 940, cm: [300, 800], kg: [50, 250], difficulty: 9, behavior: 'calm',
    look: { shape: 'long', len: 62, h: 7, top: '#c4d0da', mid: '#eaf2f6', belly: '#f6fafc', fin: '#ff3a4a', crest: '#ff3a4a', pattern: 'spots', pat: '#8ca0b4', tail: 'point', eye: 2 },
    text: 'Havets lengste beinfisk med en rød fjærkrone. Gamle fiskere trodde den ledet sildestimene.',
  },

  // Grøfta
  {
    id: 'spokelse', name: 'Spøkelsesfisk', zone: 5, weight: 20, value: 410, cm: [15, 40], kg: [0.1, 0.5], difficulty: 5, behavior: 'floater',
    look: { shape: 'deep', len: 16, h: 7, top: '#b8b8e0', mid: '#d6d6f2', belly: '#ececfa', fin: '#c8c8ec', glow: '#d0a8ff', glowAt: 'lines', eye: 2, eyeColor: '#d0a8ff', tail: 'round', dorsal: 'high' },
    text: 'Nesten gjennomsiktig. Du kan se hjertet slå, svakt lilla.',
  },
  {
    id: 'drage', name: 'Dragefisk', zone: 5, weight: 12, value: 520, cm: [20, 50], kg: [0.1, 0.8], difficulty: 7, behavior: 'dart',
    look: { shape: 'long', len: 24, h: 5, top: '#140c14', mid: '#24141e', belly: '#2e1a26', fin: '#1e101a', glow: '#ff4a5a', glowAt: 'spots', teeth: true, barbel: true, eye: 1, tail: 'fork', dorsal: 'none' },
    text: 'Lyser rødt, et lys bare den selv kan se. Svartere enn svart, huden sluker nesten alt lys.',
  },
  {
    id: 'gamle', name: 'Den gamle', zone: 5, weight: 0, special: true, value: 0, cm: [620, 620], kg: [900, 900], difficulty: 10, behavior: 'heavy',
    look: { shape: 'fusiform', len: 92, h: 32, top: '#1d3a72', mid: '#3a6cb2', belly: '#8cbce8', fin: '#2a52a0', pattern: 'spots', pat: '#e8f4ff', tail: 'diamond', dorsal: 'high', eye: 3, eyeColor: '#ffe9a8', glow: '#9ae8ff', glowAt: 'lines' },
    text: 'Hun har sett fjorden bli til. Bestefar kalte henne Den gamle, og hun husket ham.',
  },
]

export let SPECIES: Species[] = NO_SPECIES
/** Every fish in every world, so a catch can always be looked up */
export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries([...NO_SPECIES, ...AK_SPECIES, ...HI_SPECIES, ...LO_SPECIES].map((s) => [s.id, s]))
export let BOOK = SPECIES.filter((s) => !s.special)

// ---------- gear ----------

export type GearKind = 'line' | 'rod' | 'reel' | 'bucket' | 'lure' | 'lamp'

export interface GearLevel {
  name: string
  price: number
  value: number
  text: string
  /** unlock flag required before it can be bought */
  needs?: string
  needsText?: string
  /** never sold; given by someone */
  gift?: boolean
}

const NO_GEAR: Record<GearKind, { title: string; levels: GearLevel[] }> = {
  line: {
    title: 'Snøre',
    levels: [
      { name: 'Bomullssnøre', price: 0, value: 25, text: 'Rekker 25 meter ned.' },
      { name: 'Nylonsnøre', price: 150, value: 60, text: 'Rekker ned i tareskogen, 60 meter.' },
      { name: 'Flettesnøre', price: 650, value: 150, text: 'Tynt og sterkt. 150 meter.' },
      { name: 'Dyphavssnøre', price: 2200, value: 400, text: 'Ned i Dypet, 400 meter.', needs: 'deepline', needsText: 'Halvor må gå god for deg først' },
      { name: 'Trykksnøre', price: 6500, value: 1000, text: 'Tåler trykket i Avgrunnen. 1000 meter.', needs: 'lamp2', needsText: 'Krever dykkerlykt' },
      { name: 'Knuts snøre', price: 0, value: 1200, text: 'Bestefars eget snøre. Rekker helt til bunns.', gift: true },
    ],
  },
  rod: {
    title: 'Stang',
    levels: [
      { name: 'Bambusstang', price: 0, value: 0.27, text: 'Bøyelig og grei.' },
      { name: 'Glassfiberstang', price: 220, value: 0.33, text: 'Større fangstfelt.' },
      { name: 'Karbonstang', price: 950, value: 0.39, text: 'Lett og presis.' },
      { name: 'Knuts greenheart', price: 3800, value: 0.46, text: 'Håndlaget av bestefar for femti år siden.', needs: 'metKnut', needsText: 'Snakk med bestefar' },
    ],
  },
  reel: {
    title: 'Snelle',
    levels: [
      { name: 'Treskje', price: 0, value: 1, text: 'Sveiv den rundt.' },
      { name: 'Messingsnelle', price: 320, value: 1.25, text: 'Haler raskere inn.' },
      { name: 'Multisnelle', price: 1300, value: 1.5, text: 'Smører seg selv, nesten.' },
      { name: 'Halvors snelle', price: 0, value: 1.85, text: 'Den beste snella i fjorden.', gift: true },
    ],
  },
  bucket: {
    title: 'Fiskekasse',
    levels: [
      { name: 'Bøtte', price: 0, value: 6, text: 'Plass til 6 fisk.' },
      { name: 'Trekasse', price: 180, value: 10, text: 'Plass til 10 fisk.' },
      { name: 'Isboks', price: 750, value: 16, text: 'Plass til 16 fisk.' },
      { name: 'Kjølerom', price: 2400, value: 24, text: 'Plass til 24 fisk.' },
    ],
  },
  lure: {
    title: 'Agn',
    levels: [
      { name: 'Meitemark', price: 0, value: 1, text: 'Klassisk.' },
      { name: 'Blank sluk', price: 260, value: 1.35, text: 'Fisken biter raskere og sjeldne fisk blir nysgjerrige.' },
      { name: 'Glitterjigg', price: 1100, value: 1.7, text: 'Enda flere sjeldne fisk.' },
      { name: 'Lysende jigg', price: 3600, value: 2.2, text: 'Ingen fisk kan motstå den.' },
    ],
  },
  lamp: {
    title: 'Lykt',
    levels: [
      { name: 'Ingen lykt', price: 0, value: 14, text: 'Bare en blank krok.' },
      { name: 'Hodelykt', price: 0, value: 42, text: 'Lyser opp litt i mørket.', gift: true },
      { name: 'Dykkerlykt', price: 1600, value: 62, text: 'Ser langt i mørket.', needs: 'lamp1', needsText: 'Krever hodelykt' },
      { name: 'Havstjerne', price: 0, value: 88, text: 'Et lys fra havstasjonen.', gift: true },
    ],
  },
}

export let GEAR = NO_GEAR

export const GEAR_ORDER: GearKind[] = ['line', 'rod', 'reel', 'bucket', 'lure', 'lamp']

// ---------- Halvor's tasks ----------

export type QuestGoal =
  | { kind: 'catch'; n: number }
  | { kind: 'species'; id: string; n: number }
  | { kind: 'distinct'; zone: number; n: number }
  | { kind: 'heavy'; kg: number }
  | { kind: 'night'; n: number }
  | { kind: 'perfect'; n: number }
  | { kind: 'sell'; kr: number }
  | { kind: 'zone'; zone: number; n: number }
  | { kind: 'release'; n: number }
  | { kind: 'treasure'; n: number }

export interface Quest {
  id: string
  title: string
  goal: QuestGoal
  money?: number
  unlock?: string
  reward?: string
}

const NO_QUESTS: Quest[] = [
  { id: 'q1', title: 'Fang tre fisk', goal: { kind: 'catch', n: 3 }, money: 50 },
  { id: 'q2', title: 'Fang en makrell', goal: { kind: 'species', id: 'makrell', n: 1 }, money: 60 },
  { id: 'q3', title: 'Selg fisk for 300 kr', goal: { kind: 'sell', kr: 300 }, money: 120 },
  { id: 'q4', title: 'Fang tre ulike arter i Tareskogen', goal: { kind: 'distinct', zone: 1, n: 3 }, money: 220 },
  { id: 'q5', title: 'Slipp ut to fisk', goal: { kind: 'release', n: 2 }, money: 100 },
  { id: 'q6', title: 'Fang en fisk på over 5 kg', goal: { kind: 'heavy', kg: 5 }, money: 260 },
  { id: 'q7', title: 'Fang en fisk om natta', goal: { kind: 'night', n: 1 }, money: 200 },
  { id: 'q8', title: 'Fang en uer', goal: { kind: 'species', id: 'uer', n: 1 }, money: 300 },
  { id: 'q9', title: 'Fem perfekte fangster', goal: { kind: 'perfect', n: 5 }, money: 400 },
  { id: 'q10', title: 'Fang en breiflabb', goal: { kind: 'species', id: 'breiflabb', n: 1 }, unlock: 'deepline', reward: 'Dyphavssnøre i Krambua' },
  { id: 'q11', title: 'Finn en skattekiste', goal: { kind: 'treasure', n: 1 }, money: 350 },
  { id: 'q12', title: 'Fang ti fisk i Dypet', goal: { kind: 'zone', zone: 3, n: 10 }, money: 900 },
  { id: 'q13', title: 'Fang en kveite', goal: { kind: 'species', id: 'kveite', n: 1 }, money: 1200 },
  { id: 'q14', title: 'Fang en håkjerring', goal: { kind: 'species', id: 'hakjerring', n: 1 }, unlock: 'reel3', reward: 'Halvors snelle' },
  { id: 'q15', title: 'Selg fisk for 20 000 kr', goal: { kind: 'sell', kr: 20000 }, unlock: 'goldpaint', reward: 'Gullmaling til Måken' },
  { id: 'q16', title: 'Fang en sildekonge', goal: { kind: 'species', id: 'sildekonge', n: 1 }, money: 3000 },
]

export let QUESTS = NO_QUESTS

export const questTarget = (g: QuestGoal) =>
  g.kind === 'heavy' ? 1 : g.kind === 'sell' ? g.kr : g.n

// ---------- Selma's book milestones ----------

export type BookReward = { n: number; text: string; money?: number; gift?: [GearKind, number]; flag?: string }
const NO_BOOK_REWARDS: BookReward[] = [
  { n: 5, text: 'Hodelykt', gift: ['lamp', 1] },
  { n: 10, text: '600 kr', money: 600 },
  { n: 15, text: '1500 kr', money: 1500 },
  { n: 22, text: 'Havstjerne-lykt', gift: ['lamp', 3] },
  { n: 29, text: 'Selmas medalje', flag: 'medal' },
]

// ---------- boat paints ----------

export type Paint = { id: string; name: string; hull: string; stripe: string; price: number; needs?: string }
const NO_PAINTS: Paint[] = [
  { id: 'hvit', name: 'Hvit og rød', hull: '#f0e6cc', stripe: '#d8433a', price: 0 },
  { id: 'bla', name: 'Fjordblå', hull: '#3a6cb2', stripe: '#f0e6cc', price: 400 },
  { id: 'gronn', name: 'Mosegrønn', hull: '#4c8a4a', stripe: '#f2c24a', price: 400 },
  { id: 'rosa', name: 'Solnedgang', hull: '#f08a8a', stripe: '#7a3a6a', price: 400 },
  { id: 'gull', name: 'Gull', hull: '#f2c24a', stripe: '#8a5a2a', price: 0, needs: 'goldpaint' },
]

export let BOOK_REWARDS = NO_BOOK_REWARDS
export let PAINTS = NO_PAINTS

// ---------- worlds ----------

export type WorldId = 'norge' | 'alaska' | 'hawaii' | 'lofoten'

export const WORLDS: Record<WorldId, { place: string; currency: 'kr' | '$'; boat: string; zones: Zone[]; species: Species[]; gear: typeof NO_GEAR; quests: Quest[]; rewards: BookReward[]; paints: Paint[] }> = {
  norge: { place: 'Skjærvik', currency: 'kr', boat: 'Måken', zones: NO_ZONES, species: NO_SPECIES, gear: NO_GEAR, quests: NO_QUESTS, rewards: NO_BOOK_REWARDS, paints: NO_PAINTS },
  alaska: { place: 'Petersburg', currency: '$', boat: 'Ternen', zones: AK_ZONES, species: AK_SPECIES, gear: AK_GEAR, quests: AK_QUESTS, rewards: AK_BOOK_REWARDS, paints: AK_PAINTS },
  hawaii: { place: 'Hilo', currency: '$', boat: 'Koholā', zones: HI_ZONES, species: HI_SPECIES, gear: HI_GEAR, quests: HI_QUESTS, rewards: HI_BOOK_REWARDS, paints: HI_PAINTS },
  lofoten: { place: 'Henningsvær', currency: 'kr', boat: 'Nordstjerna', zones: LO_ZONES, species: LO_SPECIES, gear: LO_GEAR, quests: LO_QUESTS, rewards: LO_BOOK_REWARDS, paints: LO_PAINTS },
}

export let WORLD: WorldId = 'norge'

/** Point every table above at the place you are in now */
export function setWorld(id: WorldId) {
  const w = WORLDS[id] ?? WORLDS.norge
  WORLD = id
  ZONES = w.zones
  SPECIES = w.species
  BOOK = w.species.filter((s) => !s.special)
  GEAR = w.gear
  QUESTS = w.quests
  BOOK_REWARDS = w.rewards
  PAINTS = w.paints
}

export const worldOf = (speciesId: string): WorldId =>
  AK_SPECIES.some((s) => s.id === speciesId) ? 'alaska' : HI_SPECIES.some((s) => s.id === speciesId) ? 'hawaii' : LO_SPECIES.some((s) => s.id === speciesId) ? 'lofoten' : 'norge'
