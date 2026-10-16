// Everything people say. `who` is a portrait id, or null for narration.

export type Who = 'marit' | 'halvor' | 'selma' | 'edvard' | 'pus' | null
export interface Line {
  who: Who
  text: string
}

const n = (text: string): Line => ({ who: null, text })
const m = (text: string): Line => ({ who: 'marit', text })
const h = (text: string): Line => ({ who: 'halvor', text })
const s = (text: string): Line => ({ who: 'selma', text })
const e = (text: string): Line => ({ who: 'edvard', text })

export const NAMES: Record<string, string> = {
  marit: 'Marit',
  halvor: 'Halvor',
  selma: 'Selma',
  edvard: 'Bestefar',
  pus: 'Pus',
}

export const INTRO: Line[] = [
  n('Brevet fra Marit kom en regnfull tirsdag.'),
  n('«Bestefaren din har blitt glemsk. Fyret har vært mørkt i et helt år. Og Måken ligger og venter på noen som kan ro henne.»'),
  n('Så nå står du på kaia i Skjærvik, med en ryggsekk, en bambusstang og lukten av tang i nesa.'),
]

export const MEET_MARIT: Line[] = [
  m('Der er du jo! Du er like lang som bestefaren din, bare med mindre skjegg.'),
  m('Jeg er Marit. Jeg driver Krambua her, med agn, snøre og alt du trenger. Og kaffe, hvis du spør pent.'),
  m('Knut bor oppe i fyret. Han har gode og dårlige dager. Han spør etter deg, men han husker ikke alltid hvem han spør etter.'),
  m('Måken er din nå. Ro ut og bli kjent med fjorden. Kommer du tilbake med fisk, kjøper jeg den.'),
  m('Trykk på Sjøen nederst når du er klar. Eller trykk på båten.'),
]

export const FIRST_SALE: Line[] = [
  m('Din aller første fangst! Den burde egentlig henge på veggen.'),
  m('Men vi selger den. Tanken teller.'),
  m('Gå gjerne opp og hils på bestefaren din i fyret. Og Halvor i Havnebua har sikkert noe du kan gjøre for ham.'),
]

export const MEET_HALVOR: Line[] = [
  h('Så du er barnebarnet til Knut. Hm.'),
  h('Han var den beste fiskeren i fjorden. Jeg var nest best. Det har jeg aldri tilgitt ham.'),
  h('Jeg er havnefogd. Det betyr at jeg sitter her i bua, drikker kaffe og holder øye med været.'),
  h('Men jeg holder også orden på hva fjorden gir. Klarer du oppdragene mine, får du betalt. Og kanskje litt respekt.'),
  h('Du finner dem under Oppdrag nederst. Lykke til. Du kommer til å trenge det.'),
]

export const MEET_EDVARD: Line[] = [
  n('Døra til fyret knirker. Det lukter tjære og gammel kaffe.'),
  e('Ingrid? Er det deg? Nei... Du har øynene hennes, men du er ikke Ingrid.'),
  e('Barnebarnet mitt. Selvfølgelig. Unnskyld. Hodet mitt er som et garn med hull i. Ting glipper ut.'),
  e('Jeg skulle tenne fyret. Det har jeg gjort hver kveld i femti år. Men nå husker jeg ikke hvorfor det var så viktig.'),
  e('Jeg pleide å skrive brev. Til henne der nede. Den gamle. Jeg puttet dem i blikkbokser og senket dem i fjorden.'),
  e('Kanskje noen av dem ligger der fortsatt. Hvis du finner dem, vil du lese dem for meg?'),
  n('Kanskje glitrer det i en blikkboks langs fjellveggen. Stopp kroken ved den, så hekter den seg fast.'),
]

export const MEET_SELMA: Line[] = [
  s('Hei! Du må være den nye fiskeren alle snakker om. Jeg er Selma, havbiolog.'),
  s('Jeg skal kartlegge livet i fjorden i sommer. Marit sier du allerede har funnet fem arter. Det er mer enn instrumentene mine har klart på en uke.'),
  s('Så la oss samarbeide. Hver nye art du fanger, skriver jeg inn i Fiskeboka. Jo mer boka vokser, desto mer har jeg å gi deg.'),
  s('Her, ta denne hodelykta. Under 150 meter blir det mørkt, og fiskene der nede er litt... spesielle.'),
]

export const CAT: Line[] = [
  m('Pus har sittet på brygga og stirret på Måken hele uka. Jeg tror hun har bestemt seg.'),
  m('Hun er din nå. Eller du er hennes. Det er vanskelig å si med katter.'),
  { who: 'pus', text: 'Mjau.' },
]

export const LETTERS: { text: string; after: Line[] }[] = [
  {
    text: 'Kjære gamle. I dag ble jeg far. Hun heter Ingrid og skriker som en måke. Jeg rodde ut for å fortelle deg det. Du kom opp og så på meg, og jeg tror du smilte. Hilsen K.',
    after: [
      e('Ingrid... Hun skrek virkelig som en måke. Det var derfor jeg kalte båten Måken.'),
      n('Bestefar ler så kaffekoppen skvulper.'),
      e('Takk, vennen. Det var en god dag å huske.'),
    ],
  },
  {
    text: 'Kjære gamle. Marit, jenta til kjøpmannen, falt i sjøen i dag. Jeg fikk henne opp, men det var du som dyttet henne mot båten. Jeg så det blå skinnet ditt under henne. Ingen tror meg. Det gjør ingenting. Hilsen K.',
    after: [
      e('Lille Marit! Hun var fem år og ville fange en krabbe med hendene.'),
      e('Hun husker det ikke. Men hun har gitt meg gratis kaffe i førti år. Kanskje hun husker litt likevel.'),
    ],
  },
  {
    text: 'Kjære gamle. Stormen tok alt lyset i bygda i natt. Fyret var mørkt, og jeg var langt ute. Da så jeg deg, et blått lys under kjølen, og du viste meg veien hjem. Jeg lover deg at fyret aldri skal slukne igjen, så du alltid vet hvor vi er. Hilsen K.',
    after: [
      e('Jeg lovte det. Og så glemte jeg det.'),
      n('Bestefar sitter lenge stille og ser ut over fjorden.'),
      e('Fyret er ikke bare for båtene. Det har aldri vært bare for båtene. Det er for henne, så hun vet at vi fortsatt er her.'),
    ],
  },
  {
    text: 'Kjære gamle. Jeg begynner å glemme ting. Navn, dager, hvor jeg har satt kaffekoppen. Hvis jeg glemmer deg, håper jeg noen andre finner veien ned til deg. Linsa i fyret har sprukket. Bare lyset ditt kan få den til å skinne igjen. Hilsen K.',
    after: [
      e('Linsa har sprukket... Ja. Det var derfor jeg sluttet å tenne. Lyset ble bare en grå flekk.'),
      e('Hun bor i Grøfta, helt på bunnen. Ingen snøre i Krambua rekker så langt. Men mitt gjør det.'),
      n('Bestefar henter en gammel snelle fra en kiste. Snøret er mørkt og glatt, og det har ligget der i tretti år.'),
      e('Senk lyset ditt helt ned til bunnen. Hvis hun fortsatt husker meg, så kommer hun.'),
    ],
  },
]

export const LETTER_FOUND = (i: number): Line[] => [
  n(i === 0 ? 'Kroken har hektet seg i en rusten blikkboks. Inni ligger et brev, pakket i voksduk.' : 'Enda en blikkboks! Brevet inni er tørt.'),
  n('Det står «Til Den gamle» på konvolutten. Ta det med til bestefar i fyret.'),
]

export const GAMLE: Line[] = [
  n('Snøret blir stramt, og så slakt. Noe enormt stiger opp av mørket, men det drar ikke lenger.'),
  n('Den gamle ser på deg med et øye så stort som en tallerken. Hun er blå som skumringen, med prikker som stjerner.'),
  n('Hun kjenner igjen båten. Du kan se det på henne.'),
  n('Hun slipper kroken selv, svømmer en runde rundt Måken og legger igjen et skjell som lyser som en liten måne.'),
  n('Så synker hun tilbake i dypet. Du har fått et lysskjell. Ta det med til bestefar.'),
]

export const ENDING: Line[] = [
  e('Du fant henne. Og hun husket meg?'),
  e('Da tenner vi fyret. Sammen.'),
  n('Dere legger lysskjellet bak den sprukne linsa. Bestefar vrir om den gamle bryteren.'),
  n('Lyset fyller hele fjorden. Langt der ute, under vannet, lyser noe blått tilbake.'),
  m('DET LYSER! Halvor, se! Det lyser!'),
  h('Jeg ser det, Marit. Jeg er gammel, ikke blind.'),
  s('Instrumentene mine har nettopp registrert noe som er altfor stort til å være en fisk. Det vinker.'),
  e('Takk, vennen. Nå husker jeg. Og når jeg glemmer igjen, så husker du for meg.'),
  n('Slutt. Men fjorden er full av fisk, og Måken venter.'),
]

export const CHATTER: Record<'marit' | 'halvor' | 'selma' | 'edvard', string[]> = {
  marit: [
    'Har du prøvd å fiske om natta? Noen fisker våkner først når månen kommer opp.',
    'Bedre agn lokker fram de sjeldne fiskene. Bare så du vet det.',
    'Bestefaren din kjøpte alltid to kanelboller. En til seg selv og en han sa var «til henne».',
    'Kaffen er gratis for alle som har fisk i kassa.',
    'Halvor sier han er nest best i fjorden. Jeg har aldri sett ham fange noe som helst.',
    'Er kassa full, ror du bare inn hit. Jeg kjøper alt.',
  ],
  halvor: [
    'Holder du fisken inne i det grønne feltet hele veien, kaller jeg det en perfekt fangst.',
    'Store fisker drar nedover. Hold inne litt lenger enn du tror du trenger.',
    'Knut og jeg rodde om kapp en gang. Han vant. Jeg sier han jukset.',
    'Været skal bli fint. Eller dårlig. Det blir alltid det ene eller det andre.',
    'Av og til glimter det i en skattekiste mens du drar inn. Hold feltet over den, så er den din.',
  ],
  selma: [
    'Rødt lys forsvinner først i dypet. Derfor er så mange dyphavsfisker røde. De er usynlige der nede.',
    'Jeg har aldri sett en håkjerring i levende live. Si fra hvis du får en!',
    'Knut sier det bor noe stort i Grøfta. Instrumentene mine finner ingenting. Jeg tror mer på Knut.',
    'Noen arter kommer bare fram om natta, og noen bare om dagen. Fiskeboka viser når.',
    'Lysprikkfisk er den vanligste fisken i hele verden. Ingen har hørt om den.',
  ],
  edvard: [
    'Ta deg en kopp kaffe. Den er fra i går, men den er god.',
    'Fjorden er dyp, vennen. Dypere enn folk tror.',
    'Finner du flere brev, så kom innom. Jeg har god tid.',
    'Jeg hadde en stang en gang, laget av greenheart. Marit tok vare på den for meg, tror jeg.',
  ],
}

export const AFTER_ENDING: Record<'edvard', string[]> = {
  edvard: [
    'Ser du lyset? Hver kveld nå. Det glemmer jeg aldri igjen.',
    'Hun var innom i går natt. Bare for å si hei.',
    'Du er en bedre fisker enn meg. Ikke si det til Halvor.',
  ],
}
