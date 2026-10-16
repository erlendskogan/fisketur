// Everything people say. `who` is a portrait id, or null for narration.

export type Who = 'marit' | 'halvor' | 'selma' | 'edvard' | 'pus' | 'astrid' | 'ray' | 'leilani' | 'kimo' | 'tutu' | 'ingvild' | 'johan' | null
export interface Line {
  who: Who
  text: string
}

const n = (text: string): Line => ({ who: null, text })
const m = (text: string): Line => ({ who: 'marit', text })
const h = (text: string): Line => ({ who: 'halvor', text })
const s = (text: string): Line => ({ who: 'selma', text })
const e = (text: string): Line => ({ who: 'edvard', text })
const a = (text: string): Line => ({ who: 'astrid', text })
const r = (text: string): Line => ({ who: 'ray', text })
const l = (text: string): Line => ({ who: 'leilani', text })
const k = (text: string): Line => ({ who: 'kimo', text })
const t = (text: string): Line => ({ who: 'tutu', text })
const i = (text: string): Line => ({ who: 'ingvild', text })
const j = (text: string): Line => ({ who: 'johan', text })

export const NAMES: Record<string, string> = {
  marit: 'Marit',
  halvor: 'Halvor',
  selma: 'Selma',
  edvard: 'Bestefar',
  pus: 'Pus',
  astrid: 'Astrid',
  ray: 'Ray',
  leilani: 'Leilani',
  kimo: 'Kimo',
  tutu: 'Tūtū',
  ingvild: 'Ingvild',
  johan: 'Johan',
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

export const CHATTER: Record<'marit' | 'halvor' | 'selma' | 'edvard' | 'astrid' | 'ray' | 'selmaAk' | 'leilani' | 'kimo' | 'selmaHi' | 'ingvild' | 'johan' | 'lofoten', string[]> = {
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
  astrid: [
    'Kaffen er gratis. Kanelbollene koster en dollar. Det er Amerika.',
    'Arne fisket kveite på tre hundre meter med håndsnøre. Han hadde armer som trestammer.',
    'Hold øye med sjøløvene. De er smarte, frekke og alltid sultne. Akkurat som Ray.',
    'Vi feirer 17. mai her også, med vikingskip og lutefisk. Amerikanerne skjønner ingenting.',
    'Er kassa full, så kom inn med den. Jeg kjøper alt som har finner.',
    'Om natta kommer ulveålen fram. Ta med deg lykta.',
    'Knut skrev at du fanget Den gamle. Han skrev det tre ganger i samme brev. Han er visst stolt.',
  ],
  ray: [
    'Kveite på over hundre kilo kaller vi «barn door». Fordi den er stor som en låvedør, skjønner du.',
    'Laksen går om sommeren og høsten. Kongelaksen er sjeldnest. Og dyrest.',
    'Det regner tre hundre dager i året her. De andre dagene regner det også.',
    'Ser du en hval med halen i været, så dykker den. Da kommer den opp et helt annet sted.',
    'Hold fisken i det grønne feltet hele veien, så skriver jeg det i protokollen som perfekt.',
    'Uff da betyr «oi». Og «au». Og «nei, nei, nei». Det er et veldig nyttig ord.',
  ],
  selmaAk: [
    'Tidevannet her er over seks meter. Kaia står på stolper så den ikke drukner to ganger om dagen.',
    'Gulløye-uer kan bli over hundre år gamle. Mange av dem er eldre enn Astrid. Ikke si det til henne.',
    'Knølhvalene svømmer til Hawaii om vinteren og kommer tilbake hit for å spise om sommeren.',
    'Ringbuker lever dypere enn noen annen fisk. Over åtte tusen meter ned!',
    'Sølvlaksen hopper. Ingen vet helt hvorfor. Jeg tror den synes det er gøy.',
    'Laksen lukter seg fram til elva den ble født i. Over tusen kilometer, bare med nesa.',
  ],
  leilani: [
    'Fiskeauksjonen starter klokka seks om morgenen. Kjøperne kjenner på fisken som om den var en melon.',
    'Poke er rå fisk med salt, tang og sesamolje. Hvis du ikke liker det, er det noe galt med deg.',
    'Regner det? Det regner alltid i Hilo. Det er derfor alt er så grønt.',
    'Kassa full? Kom med den. Jeg kjøper alt som svømmer, unntatt honu. Skilpaddene lar vi være.',
    'Om natta kommer menpachi og sverdfisken opp. Ta med lykta.',
    'Tūtū spør etter deg. Hun sier du har gamle øyne. Jeg tror det er et kompliment.',
  ],
  kimo: [
    'Ser du fugler som stuper, er det tunfisk under dem. Det har fiskerne her visst i tusen år.',
    'Mauna Kea har snø på toppen om vinteren. Folk tror ikke på meg når jeg sier det, før de ser det.',
    'Ulua er sta. Hold inne lenge, slipp aldri. Som en god ukulele-akkord.',
    'Hold fisken i det grønne feltet hele veien, så skriver jeg perfekt i boka. Med stor P.',
    'Ray ringte igjen. Han sa «uff da» elleve ganger. Jeg har begynt å si det selv.',
  ],
  selmaHi: [
    'Det er bare hannene som synger. Hvorfor, vet ingen sikkert. Jeg tror de skryter.',
    'Knølhvalene spiser ingenting mens de er på Hawaii. De lever på fettet fra Alaska hele vinteren.',
    'Under oss ligger en undersjøisk vulkan som vokser. Om noen tusen år blir den en ny øy.',
    'Rødt lys forsvinner først i dypet. Derfor er så mange av de dype snapperne røde.',
    'Papegøyefisken lager sand. En stor en kan lage flere hundre kilo i året. Tenk på det neste gang du ligger på stranda.',
  ],
  ingvild: [
    'Skreien henger på hjellen til mai. Sol og vind og frost, ingenting annet. Så blir den til tørrfisk, og den holder i ti år.',
    'Det er polarnatt nå, men sola kommer snart tilbake. Vi feirer den med solboller.',
    'Kassa full? Kom inn med den. Mottaket stenger aldri i skreisesongen.',
    'Tunger! Ungene her skjærer ut torsketunger og selger dem. De tjener mer enn meg.',
    'Om natta kommer lysingen og havålen opp. Ta med lykta.',
  ],
  johan: [
    'Hold fisken i det grønne feltet hele veien. Det kaller jeg perfekt. Knut kalte det flaks.',
    'Spekkhoggerne kommer inn i Vestfjorden etter silda. Ser du en høy, svart finne, så er det dem.',
    'Røstrevet er det største korallrevet i den kalde delen av verden. Folk tror ikke på det før de ser det.',
    'Nittiåtte kilo, var den. Kveita mi. Nittiåtte.',
    'Været snur fort i Lofoten. Ser du snøbygene komme over Vestfjorden, så ro hjem.',
  ],
  lofoten: [
    'Far sa at Lofotveggen er det siste nordmannen ser før han kommer hjem fra havet.',
    'Astrid snorker. Ikke si at jeg sa det.',
    'Nordlyset var sterkere da vi var små. Eller kanskje vi var mindre.',
    'Kaffen her smaker bedre enn hjemme. Det er vannet, sier Astrid. Det er selskapet, sier jeg.',
  ],
}

// ---------- Alaska ----------

export const AK_LETTER_MARIT: Line[] = [
  m('Det kom post i dag. Et brev til bestefaren din, med frimerker fra Amerika!'),
  m('Det står «Petersburg, Alaska» på baksiden. Det er fra Astrid, søsteren hans. Hun reiste over havet før jeg ble født.'),
  m('Ta det med opp til fyret. Han har ikke fått brev fra henne på tjue år.'),
]

export const AK_LETTER =
  'Kjære Knut. Marit skriver at hodet ditt har blitt glemsk, så kanskje du ikke husker meg lenger. Det gjør ingenting. Jeg husker for oss begge. Jeg brakk hofta på den glatte kaia i vinter og kan ikke fiske selv lenger. Ternen har ligget fortøyd i to år. Hvis ingen tar over kaia og butikken til Arne og meg innen høsten, må jeg selge. Det er rart. Byen som ble bygd av folk som oss, har nesten ingen igjen som drar ut. Og Bakke-elva er tom for laks. Det har den vært lenge. Jeg ber ikke om noe. Jeg ville bare at noen der hjemme skulle vite det. Din lillesøster, Astrid.'

export const AK_LETTER_KNUT: Line[] = [
  e('Astrid... Lillesøster. Hun rodde fortere enn meg, og det lot hun meg aldri glemme.'),
  e('Hun reiste til Petersburg i 1961, som mange fra kysten her. De kaller byen «Little Norway». Hus med rosemaling og kveite så store som dører.'),
  e('Jeg kan ikke reise, vennen. Jeg lovte Den gamle at fyret aldri skal slukne igjen.'),
  e('Men du kan.'),
  n('Bestefar ser lenge på deg. I dag husker han alt.'),
  e('Ta med deg Pus og Fiskeboka. Måken og utstyret ditt blir her hos meg. Jeg skal ro henne hver dag, det har jeg ikke gjort på et år.'),
  e('Kronene dine er ikke verdt stort der borte heller. La dem stå i banken til du kommer hjem på besøk.'),
  s('Vent! Jeg hørte at noen skal til Alaska?'),
  s('Husker du lyden instrumentene mine fanget opp da fyret ble tent? Sangen til Den gamle?'),
  s('I går fikk jeg en e-post fra en forsker i Alaska. Hydrofonene deres i Frederick Sound har tatt opp den samme melodien. Tone for tone, på den andre siden av jorda.'),
  s('Petersburg ligger rett ved Frederick Sound. Det kan ikke være tilfeldig. Reis du først, så kommer jeg etter så snart instrumentene er pakket.'),
]

export const AK_TRAVEL: Line[] = [
  n('Marit pakker en kurv med kanelboller. Halvor later som han ikke er rørt, og gir deg et kart over Stillehavet.'),
  h('Det er fra 1958. Øyene har nok ikke flyttet seg.'),
  n('Bestefar står i døra til fyret og vinker til ferja er langt ute på fjorden.'),
  n('Tre fly, to døgn og én svært misfornøyd katt senere lander et lite sjøfly på vannet utenfor Petersburg, Alaska.'),
  n('Fjellene er dobbelt så høye som hjemme, og skogen går helt ned i sjøen. Over kaia sirkler en havørn.'),
]

export const MEET_ASTRID: Line[] = [
  a('Så du er barnebarnet til Knut. Du har den samme lange nesa. Stakkars deg.'),
  a('Jeg er Astrid. Velkommen til Petersburg. Her snakker vi engelsk med norsk aksent og sier «uff da» når det går galt. Det går ofte galt.'),
  a('Dette er Bakke Fisk. Arne og jeg drev kaia i femti år. Nå driver jeg den alene, med en knust hofte og en kaffetrakter.'),
  a('Og der ligger Ternen. Hun er eldre enn deg og lekker litt, men hun flyter.'),
  a('Du har vel ikke dollar? Nei. Her har du seksti, det er nok til agn. Utstyret til Arne kan du låne.'),
  a('Jeg kjøper fisken din. Er kaia full av fisk til høsten, så selger jeg ikke. Det er det hele.'),
  a('Trykk på Sjøen nederst når du er klar. Ternen venter.'),
]

export const AK_FIRST_SALE: Line[] = [
  a('Din første fisk i Alaska! Arne ville sagt at den var for liten. Arne sa det om alt.'),
  a('Gå bort til havnekontoret og hils på Ray. Han er havnefogd, og han tror han er norsk fordi oldefaren hans het Olsen.'),
]

export const MEET_RAY: Line[] = [
  r('Velkommen, velkommen! Ray Olsen, havnefogd. Oldefaren min kom fra Bergen. Eller Bodø. Et sted med B.'),
  r('Jeg holder orden på kvoter og fortøyninger, og jeg har en liste over ting som må fiskes. Klarer du dem, betaler havna deg i gode, amerikanske dollar.'),
  r('Pass deg for sjøløvene, de stjeler fisk rett av kroken. Og for Astrid. Hun stjeler alt annet.'),
  r('Oppdragene finner du under Oppdrag. Uff da, så glad jeg er for at noen vil fiske igjen!'),
]

export const AK_SELMA_ARRIVES: Line[] = [
  s('Jeg kom! Instrumentene mine overlevde flyturen. Det gjorde ikke hårføneren.'),
  s('Jeg har leid den grønne hytta. Planen er sånn: Jeg har med meg fire hydrofoner. Det er mikrofoner som tåler å ligge i sjøen.'),
  s('De må ned på forskjellige dybder i sundet. Du tar dem med på kroken og holder dem stille på riktig dybde, så fester de seg til fjellveggen.'),
  s('Etterpå kommer du hit, så lytter vi sammen. Den første skal ned på 30 meter.'),
  s('Og her, ta denne pannelampa. Fiskeboka er din igjen også. Jeg har laget et nytt kapittel til den.'),
]

export const HYDRO_HEARD: Line[][] = [
  [
    s('Hør. Det knitrer. Det er reker, tusenvis av dem. Og det dype brummet der er en båtmotor.'),
    s('Og så... Den lave tonen som går opp og ned. Den kjenner jeg igjen.'),
    n('Selma spiller av opptaket fra Skjærvik, fra natta da fyret ble tent. Tonene er de samme.'),
    s('Det er ikke Den gamle, hun er altfor langt unna. Men noe her ute synger sangen hennes. Neste hydrofon må ned på 100 meter.'),
  ],
  [
    s('Nå hører vi det tydelig. Det er en knølhval. Hannene synger lange sanger, og de lærer sangene av hverandre.'),
    s('Sangen har vandret fra hval til hval over hele havet. Fra Den gamle i Grøfta til Frederick Sound. Er det ikke vakkert?'),
    s('Men det er noe annet også. Ved utløpet av Bakke-elva er det helt stille. Ingen lakseyngel, ingen småfisk. Ingenting.'),
    s('Spør Astrid om elva. Hun vet noe. Jeg ser det på henne hver gang noen nevner den.'),
  ],
  [
    s('Der! Hør på det knurret. Det er tusenvis av sild som samler seg. Og laksen kommer etter silda.'),
    s('Hvalen synger fortsatt, men den er ikke alene lenger. Det er en hel flokk.'),
    n('Selma gir deg en snelle med mørkt, tynt snøre. På lappen står det: «Fra Astrid. Det var Arnes. Han ville at noen skulle bruke det.»'),
    s('Den siste hydrofonen må helt ned i Juvet, på 580 meter. Der går lyden lengst.'),
  ],
  [
    n('Hydrofonen i Juvet er stille lenge. Så kommer sangen, så sterkt at høyttaleren rister.'),
    s('Hvalene samler seg i sundet, alle sammen på en gang. Det har jeg bare lest om.'),
    s('De jakter sild sammen. De blåser et garn av bobler rundt stimen og stiger opp gjennom midten med åpen munn.'),
    s('Og silda er her fordi elva lever igjen. Alt henger sammen.'),
    s('Ro ut i det grunne vannet ved elveosen, fort! Hvis laksen kommer hjem, så kommer den nå.'),
  ],
]

export const AK_CREEK: Line[] = [
  a('Selma har snakket med deg om elva, har hun?'),
  a('I 1971 bygde Arne en demning oppe i Bakke-elva. Hermetikkfabrikken trengte ferskvann, og vi trengte pengene.'),
  a('Laksen kom opp til demningen år etter år og kom seg ikke forbi. Til slutt sluttet den å komme.'),
  a('Arne angret til den dagen han døde. Han ville rive den, men det kostet penger vi aldri hadde.'),
  a('Ray sier det koster 1500 dollar med maskiner og tillatelser og alt. Jeg har ikke 1500 dollar. Jeg har en hofte og en kaffetrakter.'),
  n('Hos Astrid kan du nå betale for å få revet demningen.'),
]

export const AK_DAM: Line[] = [
  n('En gravemaskin kjører opp skogsveien. Ray står og dirigerer med begge armene, selv om ingen har bedt ham om det.'),
  n('Demningen holder i en halv dag. Så brister den, og elva renner fri for første gang på over femti år.'),
  a('Arne. Hører du? Elva er fri.'),
  a('Takk, vennen. Det er lenge siden jeg har grått. Det er bare støv fra gravemaskinen.'),
  s('Nå må vi finne ut om laksen finner veien tilbake. Hydrofon nummer tre skal ned på 250 meter, der fisken samler seg før den går mot land.'),
]

export const AK_KING: Line[] = [
  n('Det er den største laksen du noen gang har sett, sølvblank med svarte prikker. En kongelaks, nesten like lang som deg.'),
  n('Det sitter et gammelt merke på ryggfinnen hans. Selma har skrevet «Bakke» på det med tusj.'),
  n('Han ser ut som han er på vei et sted. Du løsner kroken forsiktig og lar ham gå.'),
  n('Han svømmer rett mot Bakke-elva.'),
]

export const AK_ENDING: Line[] = [
  n('Om kvelden står hele byen nede ved osen av Bakke-elva.'),
  n('Kongelaksen går først. Etter ham kommer hundrevis til, sølvblanke rygger i det grunne vannet. Laksen har kommet hjem.'),
  r('Uff da! Uff da, uff da! Se på dem!'),
  s('Ute i sundet blåser hvalene. Fem, seks, sju av dem. De synger fortsatt sangen til Den gamle.'),
  a('Jeg selger ikke kaia. Ikke nå, og ikke så lenge du vil fiske fra den.'),
  a('Arne ville sagt at det var på tide. Han sa det om alt, men denne gangen hadde han rett.'),
  n('Om natta ringer du hjem. Bestefar svarer etter første ring.'),
  e('Fyret lyser, vennen. Og hun var innom i natt. Hun synger en ny sang nå. Jeg tror hun har lært den av noen.'),
  n('Slutt på andre kapittel. Men sundet er fullt av fisk, og Ternen venter.'),
]

export const AFTER_AK_ENDING: string[] = [
  'Hele byen snakker om laksen. Jeg har solgt flere kanelboller denne uka enn hele i fjor.',
  'Arnes stang har aldri vært brukt så mye. Den henger bedre i hendene dine enn på veggen.',
  'Ray vil lage en statue av kongelaksen midt på kaia. Jeg har sagt nei. Foreløpig.',
]

export const FLY_HOME: Line[] = [
  n('Postflyet til Juneau går hver morgen. Derfra går det fly videre, hele veien hjem til Skjærvik.'),
]

export const BACK_HOME: Line[] = [
  e('Du er hjemme! Måken har aldri vært så velstelt. Jeg har rodd henne hver eneste dag.'),
  e('Utstyret ditt står der du satte det, og Marit har passet på kronene dine. Hils Astrid fra meg når du drar tilbake.'),
]

export const BACK_TO_ALASKA: Line[] = [n('Tre fly og to døgn senere glir sjøflyet inn mot Petersburg. Astrid står på kaia og later som hun ikke har ventet.')]

export const AFTER_ENDING: Record<'edvard', string[]> = {
  edvard: [
    'Ser du lyset? Hver kveld nå. Det glemmer jeg aldri igjen.',
    'Hun var innom i går natt. Bare for å si hei.',
    'Du er en bedre fisker enn meg. Ikke si det til Halvor.',
  ],
}

// ---------- Hawaii ----------

export const HI_INVITE: Line[] = [
  s('Kjenner du at det har blitt kaldt? Om noen uker legger isen seg i vikene, og hvalene drar.'),
  s('Knølhvalene herfra svømmer helt til Hawaii om vinteren. Der får de kalvene sine, og der synger hannene mer enn noe annet sted.'),
  s('Og sangen endrer seg der. Hver vinter får den nye vers. Jeg har fått penger til å følge den og ta den opp.'),
  s('Problemet er at jeg trenger en skipper. Han jeg hadde, brakk foten på en ukulele. Ikke spør.'),
  a('Dra, vennen. Fisket stenger om en måned uansett, og Ternen skal på land for vinteren.'),
  a('Utstyret blir hos meg til våren. Dollarene dine kan du ta med deg. De er like mye verdt der nede, sier Ray, men det tror jeg ikke på.'),
  r('Hilo! Fetteren til kona mi bor i Hilo. Han heter Kimo og er havnefogd der. Han er nesten like flink som meg.'),
  n('Nå kan du fly til Hawaii fra sjøflyet.'),
]

export const HI_TRAVEL: Line[] = [
  n('Astrid trekker Ternen opp på slippen og legger en presenning over henne, som et teppe.'),
  n('Mange timer med fly, og Pus i en kurv hun aldri kommer til å tilgi deg for.'),
  n('Det regner varmt i Hilo. Over byen står Mauna Kea med snø på toppen, og i bukta ligger en liten øy full av palmer.'),
  n('Selma venter allerede på kaia, ved en hvit båt med turkis stripe. Hun har solbriller på hodet og et mikrofonstativ under armen.'),
]

export const MEET_LEILANI: Line[] = [
  l('Aloha! Du må være skipperen til Selma. Jeg er Leilani, og jeg har fiskeboden her på kaia.'),
  l('Fisken du får, kjøper jeg. Til poke, til restaurantene og til auksjonen tidlig om morgenen. Alt har en kjøper i Hilo.'),
  l('Du har vel ikke snøre som passer her? Nei. Alaska-utstyr på et korallrev, det hadde vært noe.'),
  l('Her har du et håndsnøre og en bambusstang. Fisk på revet først, så snakkes vi.'),
  s('Og båten heter Koholā. Det betyr knølhval. Jeg valgte henne på grunn av navnet.'),
]

export const HI_FIRST_SALE: Line[] = [
  l('Den første fisken fra Hilo! Tūtū ville sagt at den første fisken skal gis tilbake til havet. Men hun er snill, så hun lar deg selge den.'),
  l('Gå bort til havnekontoret og si hei til onkel Kimo. Han vet alt om bankene her ute, og han forteller det gjerne. Lenge.'),
]

export const MEET_KIMO: Line[] = [
  k('Aloha, aloha! Du er den nye. Ray i Alaska ringte meg. Han snakket i tjue minutter, og jeg forsto halvparten.'),
  k('Jeg er Kimo. Havnefogd, fisker og den beste ukulelespilleren i denne bygningen.'),
  k('Jeg har en liste med ting som må fiskes. Gjør dem, så betaler havna. Og gjør du dem bra, viser jeg deg de dype bankene.'),
]

export const HI_SELMA_PLAN: Line[] = [
  s('Velkommen til hvalstasjonen! Den er liten, men den har kaffe og strøm. Noen ganger begge deler samtidig.'),
  s('Her er planen. Jeg har tre sangbøyer. De skal ned på 20, 120 og 330 meter.'),
  s('Men hvalene synger mest om natta, så bøyene må settes ut når det er mørkt. Om dagen hører de bare båtmotorer og reker.'),
  s('Fiskeboka har fått et nytt kapittel også, og her er en pannelampe. Hawaii har fisk du aldri har sett maken til.'),
]

export const BUOY_HEARD: Line[][] = [
  [
    s('Hør. Det er sangen, men hør på slutten. Den har fått et nytt vers.'),
    s('Hannene bytter vers med hverandre, som barn som lærer en sang i skolegården.'),
    s('Leilani var innom mens du var ute, og hun var lei seg. Bestemoren hennes har en gammel fiskedam i Keaukaha. Stormen i høst knuste muren.'),
    s('Gå og snakk med henne. Jeg tror hun trenger hjelp mer enn hun vil si.'),
  ],
  [
    s('Der! Hør på den lange, lave tonen. Det er en mor som kaller på kalven sin. Hun synger ikke, hun nynner.'),
    s('Kimo sier en mor med kalv har holdt seg i Hilo-bukta hele uka. Det skjer nesten aldri så nær land.'),
    s('Den siste bøya må ned på 330 meter, langt ute på Dypbanken. Om natta, som de andre.'),
  ],
  [
    n('Bøya i dypet er stille lenge. Så kommer sangen, og den er annerledes enn alt Selma har spilt av før.'),
    s('Hør på begynnelsen. Det er Den gamle, fra Skjærvik. Midten er hvalene fra Frederick Sound.'),
    s('Og slutten er ny. Den ble til her, i vinter. Tre steder i én sang.'),
    s('Moren og kalven er inne i bukta nå, rett ved fiskedammen. Ro ut og ligg stille ved overflaten. Kanskje de vil hilse.'),
  ],
]

export const HI_POND: Line[] = [
  l('Selma har fortalt deg om dammen, har hun?'),
  l('Tūtū er åttiseks. Familien hennes har passet på fiskedammen i Keaukaha i flere hundre år. Muren er bygd av lavastein, stein for stein, for hånd.'),
  l('Stormen i høst rev et stort hull i den. Multene svømte ut, og havet tok sanden.'),
  l('Vi trenger lavastein og folk til en dugnad. Det koster rundt 800 dollar. Jeg har ikke 800 dollar. Jeg har en fiskebod og en bestemor.'),
  n('Hos Leilani kan du nå betale for å få bygd opp muren igjen.'),
]

export const HI_WALL: Line[] = [
  n('På lørdag kommer halve Keaukaha med arbeidshansker og kjølebager. Kimo spiller ukulele i stedet for å bære stein.'),
  n('Stein for stein blir muren bygd opp igjen. Til slutt setter Tūtū den siste steinen på plass selv.'),
  t('Mahalo. Takk. Muren har stått i flere hundre år. Nå står den hundre år til.'),
  t('Men en dam uten fisk er bare et basseng. Fang unge fisk til meg: multe, manini eller papegøyefisk. Fire stykker. Så slipper vi dem inn gjennom slusa.'),
  n('Når du fanger multe, manini eller papegøyefisk, kan du nå slippe dem ut i dammen.'),
]

export const HI_POND_FULL: Line[] = [
  t('Fire unge fisk i dammen. Om noen år er de hundre.'),
  t('Mannen min fisket med dette snøret. Det er laget av olonā, den sterkeste planten på øya. Det har ligget i en kiste i førti år.'),
  n('Tūtū gir deg en snelle med mørkt, skinnende snøre. Det rekker helt ned i Lavadypet.'),
  t('Selma sier hun trenger deg på havet om natta. Gå, gå. Gamle damer trenger søvn.'),
]

export const HI_CALF: Line[] = [
  n('Ved siden av Koholā stiger en liten, grå rygg opp. Så en til, mye større. En mor og en kalv.'),
  n('Kalven blåser en liten, sprutende fontene. Moren ligger stille og ser på båten med ett stort øye.'),
  n('Så synker de, og gjennom skroget hører du det. Sangen, alle tre versene.'),
  n('Ro inn til kaia. Tūtū og Leilani venter.'),
]

export const HI_ENDING: Line[] = [
  n('Om kvelden samles alle ved fiskedammen i Keaukaha. Månen er full, og multene glinser bak den nye muren.'),
  t('Da jeg var liten, sa bestemoren min at hvalene kommer tilbake til de stedene der folk tar vare på havet.'),
  t('Jeg trodde det var et eventyr. Nå tror jeg hun bare visste mer enn meg.'),
  l('Tūtū vil at du skal ha en stein fra muren. Den kan stå på kaia hjemme, sier hun. Hvor nå enn hjemme er.'),
  k('Hjemme er der fisken biter! Det sier jeg alltid. Ingen har hørt meg si det før, men jeg sier det.'),
  s('Jeg sender opptaket til Skjærvik i kveld. Og til Petersburg.'),
  n('Samme natt ringer telefonen. Det er bestefar, og bak ham hører du noen le.'),
  e('Hun er her, vennen. Astrid kom med flyet i går, for første gang på sekstito år.'),
  e('Og i natt sang Den gamle det nye verset. Hvordan kan hun vite det?'),
  a('Havet er mindre enn folk tror, Knut. Det har jeg alltid sagt.'),
  n('Slutt på tredje kapittel. Men revet er fullt av fisk, og Koholā venter.'),
]

export const AFTER_HI_ENDING: string[] = [
  'Tūtū sitter ved dammen hver morgen nå og teller multer. Hun er oppe i tjueen.',
  'Folk kommer fra hele øya for å se fiskedammen. Jeg selger poke til alle sammen.',
  'Kimo har skrevet en sang om deg. Den er veldig lang og rimer ikke.',
]

export const BACK_TO_HAWAII: Line[] = [n('Flyet senker seg over regnskogen, og der ligger Hilo. Leilani vinker fra fiskeboden med en hel fisk.')]

export const FLY_HOME_HI: Line[] = [n('Fra Hilo til Honolulu, og videre over hele jorda. Tre dager senere står du på kaia i Skjærvik med solbrent nese.')]

/** What they say at home once you have been away */
export const HOME_NEWS: Record<'marit' | 'halvor', string[]> = {
  marit: [
    'Bestefaren din har vært ute med Måken hver eneste dag. Han kommer hjem med to sei og et smil.',
    'Astrid sendte et postkort. Det var bare et bilde av en kveite og ordene «Se her, Marit».',
    'Fortell, fortell! Er fjellene i Amerika virkelig større enn våre? Nei, ikke si det. Jeg vil ikke vite det.',
  ],
  halvor: [
    'Så du kom tilbake. Hm. Fjorden har ikke vært den samme. Den har vært stillere. Det har vært fint.',
    'Han Ray ringer meg. Jeg vet ikke hvordan han fikk nummeret. Han sier «uff da» hele tida.',
    'Knut fanger mer fisk enn meg igjen. Det er din skyld.',
  ],
}

// ---------- Lofoten ----------

export const LO_INVITE: Line[] = [
  n('Astrid sitter ved kjøkkenbordet i fyret, som om hun aldri har reist. Bestefar skjenker kaffe til henne og til deg.'),
  a('Der er du! Knut har fortalt meg alt. To ganger. Og en gang til i morges, men det gjør ingenting.'),
  e('Vi har snakket om far. Hver vinter dro han på Lofotfiske, med en sjark som het Nordstjerna og en rorbu i Henningsvær.'),
  a('Vi var med ham den siste vinteren. Knut var tolv og jeg var ti. Jeg dro opp mer fisk enn ham.'),
  e('Det har hun aldri latt meg glemme. Ikke en eneste gang på sekstifem år.'),
  e('Rorbua står der fortsatt, og Nordstjerna ligger i naustet under den. Den er vår, men ingen har vært der på mange år.'),
  a('Én vinter til, Knut. Vi tre. Før vi blir for gamle.'),
  e('Fyret, Astrid. Jeg har lovet...'),
  h('Jeg tenner fyret. Jeg har vært nest best i fjorden i femti år. Et fyr klarer jeg å tenne.'),
  e('... Takk, Halvor.'),
  e('Skreien kommer i februar, og Hurtigruten går fra kaia hver tirsdag. Måken er for liten til Vestfjorden om vinteren, så hun blir her.'),
  e('Kronene dine kan du ta med deg. Vi er jo fortsatt i Norge.'),
  n('Nå kan du ta Hurtigruten til Lofoten fra fyret.'),
]

export const LO_TRAVEL: Line[] = [
  n('Hurtigruten glir nordover langs kysten. Bestefar står ute på dekk i to timer og ser på hver eneste holme.'),
  n('Over Vestfjorden kommer Lofotveggen opp av mørket, en mur av fjell med snø helt ned i sjøen.'),
  n('I Henningsvær står hjellene fulle av fisk, og over fjellene danser et grønt lys.'),
  a('Nordlyset. Det var her vi så det for første gang, Knut.'),
  e('Jeg husker. Jeg husker det, Astrid.'),
]

export const MEET_INGVILD: Line[] = [
  i('Hei og velkommen! Ingvild heter jeg, og jeg driver fiskemottaket. Er det dere som er Bakke-familien?'),
  i('Rorbua deres står der borte. Den er... ja. Dere får se selv.'),
  i('Fisken kjøper jeg, all skrei og alt annet. Prisene er gode i år. Utstyr har jeg også, for det du har med deg holder ikke i Vestfjorden i februar.'),
  i('Og kronene dine er like gode her som i Skjærvik. Det er det beste med å bo i samme land.'),
]

export const LO_FIRST_SALE: Line[] = [
  i('Din første fisk til mottaket! Bestefaren din sier oldefaren din alltid ga den første fisken til den som trengte den mest.'),
  i('Gå bort til Johan i den gule rorbua. Han har fisket her i sytti vintre og vet alt. Han er bare litt sur.'),
]

export const MEET_JOHAN: Line[] = [
  j('Knut Bakke? Lever han fortsatt? Jeg trodde han var blitt til en fyrlykt for lenge siden.'),
  j('Vi fisket sammen i 1961. Han fikk en kveite på åtti kilo og har aldri sluttet å snakke om det. Jeg fikk en på nittiåtte. Det har han glemt.'),
  j('Jeg har en liste over ting som må fiskes. Klar dem, så betaler jeg. Og så skal jeg vise deg revet ute ved Røst.'),
]

export const LO_RORBU: Line[] = [
  n('Den røde rorbua heller litt mot sjøen. Taket har hull, og vinduene er dekket av rim.'),
  e('Her sov vi. Far, Astrid og jeg, i den samme køya. Det luktet tran og våte ullsokker.'),
  a('Den trenger nytt tak, en ovn og nye vinduer. Ingvild sier det koster 5000 kroner.'),
  n('På mottaket kan du nå betale for å sette rorbua i stand.'),
]

export const LO_FIXED: Line[] = [
  n('Snekkeren fra Svolvær kommer med nye takplater. Johan bærer ved, og påstår at han ikke gjør det.'),
  n('Om kvelden brenner det i ovnen, og det lukter kaffe og nyvasket treverk.'),
  a('Nå er det en rorbu igjen. Og her, ta denne hodelykta. I polarnatta trenger du den.'),
  e('Far hengte alltid fisken på hjellen bak rorbua. Tolv skrei, så var vinteren god. Vil du henge opp tolv for meg?'),
  n('Når du fanger skrei, kan du nå henge dem på familiehjellen.'),
]

export const LO_HJELL_FULL: Line[] = [
  e('Tolv skrei på hjellen. Det er en god vinter.'),
  e('Jeg har noe til deg. Det var fars snøre, fra den siste vinteren.'),
  n('Bestefar gir deg en gammel snelle med tjæret snøre. Det rekker helt ned i Norskehavet.'),
  a('Og så vil Knut ut på havet. Om natta, når det er mørkt og stille. Han har noe han vil vise deg.'),
]

export const LO_GAMLE: Line[] = [
  n('Havet ligger blankt. Bestefar sitter i baugen og ser ned i vannet.'),
  n('Så kommer et blått lys opp fra dypet. Det er Den gamle. Hun har svømt hele veien fra Skjærvik.'),
  e('Hun husket meg. Hun fant meg her også.'),
  n('Den gamle ligger stille ved siden av båten lenge. Så synker hun, og det blå lyset blir borte i dypet.'),
  e('Nå kan jeg glemme, vennen. For du husker.'),
]

export const LO_ENDING: Line[] = [
  n('Den siste kvelden i Lofoten sitter alle sammen i rorbua. Ingvild har med seg boller, og Johan har med seg en historie om en kveite på nittiåtte kilo.'),
  j('Hundre kilo var den. Nesten.'),
  a('Vi kommer igjen neste vinter. Alle sammen. Selma også, hun har skrevet at hun vil se nordlyset.'),
  e('Far sa alltid at havet ikke eier noen, men at det husker alle som har vært glad i det.'),
  e('Jeg tror han hadde rett. Jeg tror havet husker for oss når vi glemmer.'),
  n('Bestefar sovner i den samme køya som han sov i da han var tolv år gammel. Utenfor danser nordlyset over Vestfjorden.'),
  n('Slutt på fjerde kapittel. Men skreien biter, og Nordstjerna venter.'),
]

export const AFTER_LO_ENDING: string[] = [
  'Hjellen deres er den fineste i hele Henningsvær. Folk tar bilder av den.',
  'Johan sier kveita var hundre og to kilo nå. Den vokser hver gang han forteller om den.',
  'Bestefaren din er nede på kaia hver morgen og teller båtene. Han husker navnet på alle sammen.',
]

export const TO_LOFOTEN_AGAIN: Line[] = [n('Hurtigruten legger til i Henningsvær i snødrevet. Ingvild står på kaia med en kasse skrei og et stort smil.')]

export const LO_HOME_CALL: Line[] = [
  n('Telefonen ringer. Det er bestefar.'),
  e('Vennen? Astrid og jeg har noe vi vil spørre deg om. Kom hjem til Skjærvik når du kan.'),
]
