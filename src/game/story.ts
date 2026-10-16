// Everything people say. `who` is a portrait id, or null for narration.

export type Who = 'marit' | 'halvor' | 'selma' | 'edvard' | 'pus' | 'astrid' | 'ray' | null
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

export const NAMES: Record<string, string> = {
  marit: 'Marit',
  halvor: 'Halvor',
  selma: 'Selma',
  edvard: 'Bestefar',
  pus: 'Pus',
  astrid: 'Astrid',
  ray: 'Ray',
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

export const CHATTER: Record<'marit' | 'halvor' | 'selma' | 'edvard' | 'astrid' | 'ray' | 'selmaAk', string[]> = {
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
