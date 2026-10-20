// Everything people say in Vardø, the fifth chapter. Same shape as ../story.ts;
// the new portraits are added to Who at integration, so they live in VWho for now.

import type { Who } from '../story'
import type { RoomId } from './types'

export type VWho = Who | 'nadja' | 'brita' | 'aslak' | 'frida'
export interface VLine {
  who: VWho
  text: string
}

const n = (text: string): VLine => ({ who: null, text })
const e = (text: string): VLine => ({ who: 'edvard', text })
const a = (text: string): VLine => ({ who: 'astrid', text })
const h = (text: string): VLine => ({ who: 'halvor', text })
const s = (text: string): VLine => ({ who: 'selma', text })
const p = (text: string): VLine => ({ who: 'pus', text })
const na = (text: string): VLine => ({ who: 'nadja', text })
const br = (text: string): VLine => ({ who: 'brita', text })
const ak = (text: string): VLine => ({ who: 'aslak', text })
const fr = (text: string): VLine => ({ who: 'frida', text })

export const VA_NAMES: Record<'nadja' | 'brita' | 'aslak' | 'frida', string> = {
  nadja: 'Nadja',
  brita: 'Brita',
  aslak: 'Aslak',
  frida: 'Frida',
}

// ---------- leaving Skjærvik ----------

export const VA_INVITE: VLine[] = [
  n('Det er kaffe og vafler i fyret. Astrid sitter ved vinduet, Halvor ved døra, som om han bare skal innom.'),
  e('Der er du. Sett deg, vennen. Vi har noe til deg.'),
  a('Knut, la meg. Du begynner alltid på feil ende.'),
  a('Mor vår het Signe. Hun vokste opp i Vardø, helt øst i landet, der kysten slutter og Barentshavet begynner.'),
  e('Hun fortalte om huset. Blått, med to etasjer og en trapp der hun satt hver kveld og ventet på båtene.'),
  a('Huset står der fortsatt. Det har stått tomt i mange år. Kommunen gir bort gamle hus til folk som vil flytte dit og få liv i dem igjen.'),
  a('Det koster én krone. Jeg har allerede betalt. Jeg fikk ikke vekslepenger.'),
  e('Vi er for gamle, Astrid og jeg. Knærne mine er like glemske som hodet.'),
  e('Alle disse årene har du hjulpet oss med å huske. Brevene, elva, dammen, rorbua.'),
  e('Nå er det din tur. Lag ditt eget sted.'),
  h('Hm. Vardø. Der blåser det så fisken går baklengs.'),
  h('Men du klarer deg. Du har lært av den nest beste i fjorden.'),
  e('Mor sa at havet utenfor Vardø er der alle sangene ender opp.'),
  e('Jeg skjønte aldri hva hun mente. Kanskje du finner ut av det.'),
  a('Kronene dine tar du med. Og katten. Katten insisterer.'),
  n('Nå kan du ta Hurtigruten til Vardø fra fyret.'),
]

export const VA_TRAVEL: VLine[] = [
  n('Hurtigruten glir nordover, og så østover. Forbi Nordkapp, forbi Nordkinn, der fjellene blir lavere og lavere.'),
  n('Pus sover i kurven. Hun har reist mer enn de fleste katter, og hun er ikke imponert.'),
  n('Rundt Varangerhalvøya blir landet flatt og grått og grønt. Ingen trær, bare lave, runde åser og himmel.'),
  n('Havtåka ligger tett. Så letter den, som en gardin, og der er Vardø. En liten øy med fargerike hus, helt ytterst mot havet.'),
  n('På en lav kolle ligger Vardøhus festning, formet som en stjerne. Oppå åsen står en hvit radarkule og ser ut som en glemt fotball.'),
  n('Krykkjene skriker fra hver eneste hylle og takrenne. På en husvegg ved kaia er det malt en kvinne med en fisk i armene, tre etasjer høy.'),
  n('Det lukter tang og diesel og noe som steker. Du er så langt øst i Norge som det går an å komme.'),
]

export const MEET_NADJA: VLine[] = [
  na('Ha! Der er du. Astrid sa du var lang. Hun sa ikke at du var så blek. Det fikser vi.'),
  na('Nadja. Dette er Pomorbrygga. Jeg kjøper fisk og selger agn, snøre, kaffe og alt annet folk glemmer hjemme.'),
  na('Familien min har vært her siden pomortida. En russisk skipper kom med mel en sommer, ble forelsket og glemte å reise hjem.'),
  na('Astrid ringte meg i forrige uke. Hun har kjøpt en færing til deg av fetteren min. Hun ville at den skulle hete Signe.'),
  na('Jeg sa at det var et fint navn. Hun sa at hun visste det.'),
  na('Ro ut i Bussesundet først. Det er grunt og snilt, nesten. Kommer du inn med fisk, kjøper jeg den.'),
  na('Trykk på Sjøen nederst når du er klar. Eller på båten.'),
]

export const VA_FIRST_SALE: VLine[] = [
  na('Din første fisk fra Vardø! Den burde egentlig vært røkt og hengt opp over døra.'),
  na('Men vi selger den. Du trenger kronene mer enn døra trenger fisk.'),
  na('Gå bort til Brita på Havnekontoret. Hun er havnefogd og har en liste over alt som må gjøres.'),
  na('Og huset til Signe står der borte, det blå. Gå og se på det. Ikke len deg mot noe.'),
]

export const MEET_BRITA: VLine[] = [
  n('Havnekontoret lukter kaffe og papir. På veggen henger et sjøkart fullt av blyantstreker.'),
  br('Du er den nye. Nadja har nevnt deg. Tre ganger på én formiddag.'),
  br('Brita. Havnefogd. Tjuefem år i Kystvakten før det, så jeg vet når folk prøver å lure meg.'),
  br('Jeg holder orden på kaia, båtene og hva havet gir. Det er mye å holde orden på her ute.'),
  br('Jeg har en liste over ting som må fiskes. Noen av dem er pukkellaks i sundet. Den hører ikke hjemme her, og den sprer seg i elvene.'),
  br('Gjør oppdragene, så betaler havna. Du finner dem under Oppdrag nederst.'),
  n('Hun tar på seg lesebrillene, ser på deg over kanten og tar dem av igjen.'),
  br('Velkommen til Vardø. Det mener jeg.'),
]

export const VA_HOUSE: VLine[] = [
  n('Signes hus er blått, eller det var blått en gang. Malingen flasser i lange flak.'),
  n('Det er hull i taket, og vinduene er spikret igjen med bord. Døra går opp med et sukk.'),
  n('Inne ligger det støv på alt. En stol, en kald ovn, en kalender fra et år ingen husker.'),
  n('På kjøkkenbenken ligger et fotografi med brettede hjørner. En jente sitter på trappa utenfor og holder en torsk som er større enn henne.'),
  n('Hun ler så øynene blir borte. På baksiden står det med blyant: «Signe, 9 år. Ville ikke slippe den.»'),
  p('Mjau.'),
  n('Pus har funnet en solflekk på gulvet. Det er den eneste varme plassen i huset.'),
  n('Alle på kaia sier at Frida på Slippen kan fikse taket.'),
]

export const MEET_FRIDA: VLine[] = [
  n('På Slippen står en halvferdig båt på stokker. Sagflisen fyker fra et sted bak den.'),
  fr('Hei. Vent litt. Femtito og en halv. Sånn.'),
  fr('Frida. Jeg bygger båter og fikser hus. Mest båter. Hus er bare båter som står opp ned og ikke flyter.'),
  fr('Bestefar bygde båter på denne slippen i seksti år. Jeg har høvelen hans. Den er bedre enn meg.'),
  fr('Signes hus, ja. Jeg har målt det. Takbjelkene er gode, takplatene er ikke. Fire hull, det største er åtti ganger hundre og ti.'),
  fr('Nytt tak, nye vinduer og en dør som lukker seg. Da kan du bo der.'),
  n('Hos Frida kan du nå bestille nytt tak og nye vinduer til huset.'),
]

export const VA_ROOF_DONE: VLine[] = [
  n('I tre dager hamrer det fra Signes hus. Frida synger mens hun jobber, men bare tall.'),
  n('Så er det tett. Vinden blir ute, og lyset kommer inn gjennom nye vinduer.'),
  fr('Ferdig. Taket holder i femti år. Jeg har regnet på det.'),
  n('Den første natta sover du i den gamle senga til Signe. Pus legger seg på føttene dine.'),
  n('Om morgenen ringer telefonen.'),
  e('Vennen? Astrid sier taket er ferdig. Hun hørte det av Nadja, som hørte det av noen på kaia.'),
  e('Sover du godt der? Mor sa at havet utenfor Vardø synger deg i søvn.'),
  e('Jeg er stolt av deg. Det sier jeg ikke ofte nok. Eller, jeg sier det sikkert, men jeg glemmer at jeg har sagt det.'),
  n('Trykk på Signes hus for å gå inn. Senga står klar, så du kan sove til morgen eller kveld.'),
]

// ---------- Aslak and the nets ----------

export const MEET_ASLAK: VLine[] = [
  n('Naustet står på stolper over vannet. Garn henger til tørk, og glasskuler blinker grønt i vinduet.'),
  n('En gammel mann sitter på en kasse og bøter et garn. Han ser på deg lenge før han sier noe.'),
  ak('Aslak.'),
  ak('Du bor i Signes hus. Søstera hennes bodde der til jeg var voksen. Hun ga oss saft og kjeft. Mest kjeft.'),
  ak('Kona mi het Elle. Hun knyttet garn i sytti år. Fingrene hennes gikk fortere enn praten min. Det var ikke vanskelig.'),
  ak('Dette var hennes. Det er gammelt, men det er godt. Ta det.'),
  n('Aslak legger et sammenbrettet garn i armene dine. Det lukter tjære og tang.'),
  ak('Sett det i Bussesundet. Det fisker mens du gjør andre ting. Det er det fine med garn.'),
  n('Ute på sjøen kan du nå sette garnet under Redskap.'),
]

export const ASLAK_NET_DONE: VLine[] = [
  ak('Fisk i garnet. Godt.'),
  ak('Elle sa at et garn er som en samtale. Du må vente på svar.'),
  ak('Hun ville ikke likt at det lå i en skuff. Nå gjør det ikke det.'),
  ak('Jeg kan gjøre det lengre. Og bedre. Det koster litt. Ikke mye. Jeg er gammel, ikke grådig.'),
  n('Hos Aslak kan du nå forbedre garnene dine.'),
]

export const BRITA_BOARD: VLine[] = [
  br('Du har fått litt ry på kaia. Folk snakker. Pent, for det meste.'),
  br('Det betyr at du får bruke tavla. Kontrakttavla, ved døra.'),
  br('Fiskekjøpere, hotellet, folk i Kiberg. De trenger ting gjort, og de betaler godt.'),
  br('Tre kontrakter på tavla, nye hver dag. Du tar én av gangen. Og den du tar, gjør du ferdig.'),
  br('Klarer du mange på rad, betaler de bedre. Det er sånn tillit fungerer.'),
]

// ---------- the sjark ----------

export const FRIDA_SJARK: VLine[] = [
  fr('Kom og se. Hun er ferdig.'),
  n('På slippen står en sjark, hvit med en smal, rød stripe. Treverket lukter ferskt.'),
  fr('Tretti fot. Bred i baugen, lav i ripa, god å dra garn fra. Bestefar tegnet henne. Jeg bygde henne.'),
  fr('Plass til to garn og fire teiner. Og hun går inn i Varangerfjorden uten å klage.'),
  fr('Færingen er fin i sundet. Men fjorden er større enn sundet. Omtrent førti ganger.'),
  n('Hos Frida kan du nå kjøpe sjarken.'),
]

export const VA_SJARK: VLine[] = [
  n('Sjarken glir ned slippen og legger seg i vannet som om hun alltid har ligget der.'),
  n('Aslak står på kaia med lua i hånda. Han har ikke sagt noe på lenge.'),
  ak('Hun trenger et navn.'),
  ak('Hvis du vil. Du trenger ikke.'),
  ak('Elle. Kunne hun hett Elle?'),
  n('Frida henter pensel og maling uten å si et ord. Hun måler opp bokstavene, to ganger.'),
  ak('Takk. Nå får hun komme på sjøen igjen. Hun var alltid lei seg når hun måtte være på land.'),
  n('Varangerfjorden er åpen for deg nå. Ute på sjøen trykker du på navnet på fiskefeltet du er på, så åpner Sjøkartet seg.'),
]

export const ASLAK_CRAB: VLine[] = [
  ak('Du har en sjark nå. Da trenger du teiner.'),
  n('Aslak gir deg to teiner, runde bur av jern og nett.'),
  ak('Kongekrabbe. Den hørte ikke hjemme her. Forskere satte den ut lenger øst, på Kola, på sekstitallet. Så gikk den vestover.'),
  ak('Nå er den overalt i fjorden. Den spiser alt på bunnen. Folk betaler godt for den.'),
  ak('Hannene beholder du. Bare de store, over streken på målet. Hunnene går ut igjen. Det er vår regel her.'),
  ak('Snu krabben. Hunnen har en bred, rund hale under. Hannen har en smal.'),
  ak('Brita teller. Brita teller alt.'),
  n('Teinene setter du i Varangerfjorden under Redskap, som garnene.'),
]

export const BRITA_RULES: VLine[] = [
  br('De første krabbene dine. Bra. Da tar vi reglene én gang, så er det gjort.'),
  br('Små hanner går tilbake. Hunner går også tilbake. Loven krever det ikke, men her på kaia gjør vi det sånn. Hver gang.'),
  br('Finner jeg en hunn eller en liten krabbe i kassa di, blir det bot. Jeg liker ikke å skrive bøter, men jeg er god på det.'),
  br('En hunn bærer titusenvis av egg under halen. Det er neste års fangst. Og året etter.'),
  br('Gjør du det riktig, har vi krabber når du er like gammel som Aslak.'),
]

// ---------- Selma and the whales ----------

export const SELMA_LETTER: VLine[] = [
  n('Telefonen ringer. Det er bestefar, og han har brillene på. Det kan du høre.'),
  e('Vennen, det kom et brev til deg her. Fra Selma. Jeg leser det for deg. Astrid sier jeg ikke skal åpne andres post, men det har jeg allerede gjort.'),
  e('«Kjære deg. Knølhvalene er i Barentshavet nå. De spiser lodde hele sommeren og høsten, og de synger mindre enn på Hawaii, men de synger.»'),
  e('«Jeg har fått penger til å følge dem en sesong. Jeg kommer til Vardø. Har du et rom? Jeg tar med meg kaffe.»'),
  a('Det finnes ikke noe gjesterom der, Knut. Huset har et tak og en seng.'),
  e('Så får Frida bygge et rom. Frida kan bygge alt, sier Nadja.'),
  n('Bygg gjesterommet i Signes hus, så Selma har et sted å bo.'),
]

export const SELMA_ARRIVES: VLine[] = [
  n('Selma kommer med Hurtigruten, med tre kofferter og ett mikrofonstativ. Hun er fortsatt brun etter Hawaii.'),
  s('Du har et hus. Med vinduer! Jeg har bodd i telt på et skjær i to uker.'),
  s('Jeg er din første gjest, og du er min første fiskervert. Er det et ord? Nå er det et ord.'),
  s('Her er planen. Hver knølhval har sin egen hale. Mønsteret under halefinnen er som et fingeravtrykk. Svart og hvitt, flekker og arr.'),
  s('Jeg vil ha bilder av så mange som mulig. Når en hval dykker, løfter den halen rett opp. Da må du trykke.'),
  n('Selma gir deg et gammelt kamera i en vanntett veske.'),
  s('Fire forskjellige hvaler til å begynne med. Så ser vi hvem de er, og hvor de har vært.'),
  s('Og jeg blir med i båten når jeg kan. Det er ikke hver dag man har sin egen skipper.'),
  n('Når en hval dykker ute på sjøen, kan du nå ta bilde av halen. Selma sitter i baugen med notatboka.'),
]

export const SELMA_FLUKE: VLine[][] = [
  [
    s('Den første! Se, en nesten helt hvit underside med tre svarte prikker. Som en domino.'),
    s('Jeg slår henne opp i katalogen i kveld. Hvaler fra hele Nord-Atlanteren ligger der.'),
    s('Hun heter Domino nå. Til noen gir henne et bedre navn.'),
  ],
  [
    s('Denne kjenner jeg! Hun ble fotografert ved Tromsø i januar, ute i silda.'),
    s('Om vinteren spiser de sild i fjordene der. Om sommeren svømmer de hit for lodda. De følger maten, som folk.'),
    s('To av fire. Du har bedre hender enn den forrige skipperen min. Han brakk foten på en ukulele.'),
  ],
  [
    s('Se på kanten av halen. Den er flerret, som et sagblad. Tannmerker fra spekkhoggere. Hun har kommet seg unna en gang.'),
    s('Hun er gammel. Kanskje femti år. Hun har svømt mer enn noen av oss.'),
    s('Én til. Jeg har en følelse, men jeg sier den ikke høyt.'),
  ],
  [
    n('Selma ser lenge på bildet. Så tar hun et gammelt, krøllete bilde opp av jakkelomma og holder dem ved siden av hverandre.'),
    s('Det hvite arret på venstre side. Ser du? Det er henne.'),
    s('Det er hvalen som sang utenfor Skjærvik. Natta da fyret ble tent. Jeg tok bildet fra land, med skjelvende hender.'),
    s('Hun har vært i Alaska og på Hawaii. Og nå er hun her, ved Vardø, og spiser lodde som om ingenting har skjedd.'),
    s('Hun bar sangen hele veien. Fra Den gamle, over hele havet, og tilbake hit.'),
    n('Selma tørker øynene med ermet. Hun sier det er saltvann. Det er det sikkert.'),
  ],
]

// ---------- the coastal boat and the fish plant ----------

export const FRIDA_KYST: VLine[] = [
  fr('Jeg har noe på slippen. Femti fot. Styrehus. Varme i styrehuset.'),
  fr('Hun heter Varanger. Hun tåler sjø du ikke vil se. Tre garn, åtte teiner og et lasterom så stort som stua di.'),
  fr('Med henne kommer du ut på Tiddlybanken. Det er åpent hav der. Stor torsk, store bølger.'),
  fr('Bestefar ville bygd henne litt smalere. Bestefar tok feil. Jeg har tallene.'),
  n('Hos Frida kan du nå kjøpe kystbåten.'),
]

export const NADJA_PLANT: VLine[] = [
  na('Du har en kystbåt nå. Da kan vi snakke om fiskebruket.'),
  n('Nadja peker mot et langt, grått bygg ved enden av kaia. Vinduene er knust, og det bor en krykkje i hvert eneste ett.'),
  na('Om sommeren i pomortida kom båtene fra Kvitsjøen. Russiske pomorer med rugmel, gryn og tauverk. De byttet mot fisk.'),
  na('Hele kaia var full av folk. De snakket et eget språk, halvt norsk og halvt russisk, så alle forsto litt og ingen forsto alt.'),
  na('Det holdt på i to hundre år. Så kom revolusjonen i Russland, og etter 1919 kom det ingen flere båter.'),
  na('Men fisken var her fortsatt. Bestefaren min bygde fiskebruket. Det var arbeid til halve byen.'),
  na('Det stengte da jeg var tjue. Siden har de unge flyttet sørover, én etter én.'),
  na('Jeg vil åpne det igjen. Ikke for meg. For at noen skal ha et sted å komme hjem til.'),
  n('Hos Nadja kan du nå hjelpe til med å sette fiskebruket i stand, bit for bit.'),
]

export const NADJA_PLANT_STAGE: VLine[][] = [
  [
    n('Knust glass ut, nye ruter inn. Krykkjene flytter motvillig over på nabotaket.'),
    na('Det ser ut som et bygg igjen. Nesten. Hvis du myser.'),
  ],
  [
    n('Fryselageret durer i gang for første gang på over tjue år. Det rister i hele kaia.'),
    na('Hører du? Det er den fineste lyden i verden. Nå holder fisken seg.'),
    na('Bestefar sa at et fiskebruk uten kjøling er bare et naust med ambisjoner.'),
  ],
  [
    n('Filetlinja er skrudd sammen. Nadja har hengt opp en lapp i butikken: «Folk søkes.» Det kommer tolv stykker den første dagen.'),
    na('Tolv! To av dem har flyttet hjem fra Oslo for dette. Én er fetteren min, men han teller også.'),
  ],
  [
    n('Fiskebruket åpner en mandag morgen. Det er boller på bordet og flagg på taket.'),
    n('Det er lys i alle vinduene, og hele kaia lukter fisk og kaffe, slik den gjorde for lenge siden.'),
    na('Det er arbeid her igjen. Folk har et sted å gå om morgenen.'),
    na('Nei, jeg gråter ikke. Jeg har noe i øyet. Du får en andel av fiskebruket hver dag. Kom innom og hent den.'),
  ],
]

export const NADJA_POMOR: VLine[][] = [
  [
    n('Kroken har hektet seg i noe grønt og tungt. Det er et lokk av kobber, med et lite håndtak på toppen.'),
    na('Et kjelelokk! Pomorene hadde kobberkjeler om bord. De kokte te hele dagen og bød alle de handlet med på en kopp.'),
    na('Det er sikkert to hundre år gammelt. Det har ligget der nede og ventet på en kjele som aldri kom.'),
    na('Det finnes mer der nede. Det sa bestemor alltid.'),
  ],
  [
    n('I gjørma glinser en liten mynt. På den ene siden står det kopek med russiske bokstaver, og et årstall fra 1800-tallet.'),
    na('En kopek. Russiske penger. Pomorene handlet mest i bytte, mel for fisk, men noen mynter gikk fram og tilbake.'),
    na('Én kopek. Det var ikke mye den gangen heller. Noen har sikkert lett etter den og bannet. Lenge.'),
  ],
  [
    n('En liten flaske, forseglet med kork og voks. Inni ligger et sammenrullet papir, gult og sprøtt.'),
    na('Det er et brev. Skrevet på russenorsk, handelsspråket. Halvt norsk, halvt russisk, og helt sitt eget.'),
    na('«Kak sprek? Moja njet forstå.» Hva sier du? Jeg forstår ikke. Det var sånn de begynte, alltid.'),
    na('Og her nede: «Paa morradag skaffom.» I morgen spiser vi. Han inviterer noen til middag.'),
    na('Kanskje til tippoldemor. Jeg vil tro det. Ingen kan si meg imot.'),
    na('Takk. Jeg har noe til deg også. Den har stått på loftet i hundre år og trenger en stue.'),
    n('Nadja gir deg en gammel samovar av messing. Den skal stå i stua i Signes hus.'),
  ],
]

// ---------- Aslak's grandmother ----------

export const ASLAK_JOIK: VLine[] = [
  n('Aslak sitter i døra til naustet. Selma har vært her, og bildene av hvalhalene ligger på kassa ved siden av ham.'),
  ak('Hun fortalte meg om hvalen med arret. Og om fisken som lyser hjemme hos dere.'),
  ak('Áhkku min, farmor, hadde en joik. For en fisk. «Hun som husker.»'),
  ak('Man joiker ikke om noen. Man joiker dem. Joiken er dem. Så hun joiket fisken. Som en hun kjente.'),
  ak('Fisken bodde der havbunnen stuper ned i dypet, sa hun. Langt ute. Der ingen i færing kom.'),
  ak('Den lyste blått. Og den husket alle som hadde vært snille med havet.'),
  n('Aslak nynner noen toner, lavt og ujevnt. Så stopper han.'),
  ak('Nei. Det er hennes. Jeg har ikke stemmen til det.'),
  ak('Jeg trodde det var noe hun fant på. Hun hadde mange sånne. Men du har sett den fisken, sier Selma.'),
  ak('Eggakanten. Det er der. Ta deg en større båt.'),
]

export const ASLAK_ELLE_NET: VLine[] = [
  ak('Garnloftet. Godt. Da kan jeg vise deg noe.'),
  n('Aslak bretter ut et garn så fint at maskene nesten ikke synes. Det har et stort, gammelt hull midt på.'),
  ak('Elles beste. Det var det siste hun knyttet. Så rev det seg på en stein, og hun rakk ikke å bøte det.'),
  ak('Fingrene mine er for stive. Dine er ikke.'),
  n('I tre kvelder sitter dere på garnloftet. Aslak viser, du knytter. Han sier ingenting når det blir feil. Han bare peker.'),
  ak('Sånn. Hun ville sagt at det var greit. Det var det fineste hun sa om noe.'),
  ak('Det er ditt nå. Det beste garnet i Vardø.'),
]

// ---------- the big boat ----------

export const FRIDA_HAV: VLine[] = [
  fr('Kom ned på slippen. Ta på deg sko.'),
  n('Den største båten Frida har bygget, fyller hele slippen. Stålskrog, høyt styrehus, plass til fire garn og tolv teiner.'),
  fr('Sytti fot. Hun heter Nordkapp. Hun går ut til Eggakanten og hjem igjen i alt annet enn orkan.'),
  fr('Aslak kom innom i går. Han sa du måtte langt ut. Han sa ikke hvorfor, og jeg spurte ikke. Han så ut som han mente det.'),
  fr('Bestefar drømte om å bygge en sånn. Jeg har tegningene hans. Jeg rettet tre ting.'),
  n('Hos Frida kan du nå kjøpe havfiskebåten.'),
]

export const VA_FAMILY_CALL: VLine[] = [
  n('Telefonen ringer sent på kvelden. Bak bestefar hører du Astrid si noe om kofferter.'),
  e('Vennen. Astrid og jeg har bestemt oss. Vi kommer til Vardø.'),
  a('Jeg bestemte. Knut var enig.'),
  e('Hurtigruten går på tirsdag. Halvor passer fyret. Han har lovet å ikke røre lyspæra.'),
  e('Jeg vil se huset til mor. Bare én gang. Før jeg glemmer hvordan hun fortalte om det.'),
  a('Frida sier du har en stor båt nå. Og Selma sier at Aslak har sendt deg ut til Eggakanten.'),
  e('Hvis hun er der ute, vennen. Den gamle. Si at jeg kommer.'),
  n('Eggakanten er åpen nå. Dra ut om natta, og ligg stille ved overflaten.'),
]

// ---------- the finale ----------

export const VA_UNGE: VLine[] = [
  n('Havet ved Eggakanten ligger svart og stille. Langt under deg faller sokkelen ned i dypet.'),
  n('Lykta på dekk lager en liten, gul ring på vannet. Ellers er det mørkt i alle retninger.'),
  n('Så stiger et blått lys opp fra dypet. Sakte, som om det har god tid.'),
  n('Det er Den gamle. Hun er større enn du husker, og lyset hennes er svakere. Ved siden av henne svømmer noe lite.'),
  n('En ung fisk, liten ved siden av henne, men lengre enn deg. Den lyser også, men ujevnt, som om den ikke helt har lært det ennå.'),
  n('Den unge svømmer en runde rundt båten. Så en til, tettere, rett under lykta. Den ser opp på lyset ditt.'),
  n('Den gamle ligger stille og ser på dere begge.'),
  n('Så synger hun. Én gang. Det er sangen fra Skjærvik og Alaska og Hawaii og Lofoten, alle versene, og noe nytt helt til slutt.'),
  n('Du kjenner tonene i skroget og i brystet. Den unge ligger helt stille og lytter.'),
  n('Den gamle synker. Det blå lyset blir mindre og mindre, og så er det borte.'),
  n('Den unge blir igjen et øyeblikk ved lykta. Så følger den etter, ned i mørket.'),
  n('Du ligger lenge der ute. Så snur du baugen mot land. Bestefar venter i huset.'),
]

export const VA_ENDING: VLine[] = [
  n('Det lyser i alle vinduene i Signes hus. Røyken står rett opp fra pipa.'),
  n('Bestefar står på kjøkkenet. Han har funnet mors gamle kaffekjele i et skap, og han har kokt kaffe i den. Kaffen er for sterk.'),
  e('Hun sto akkurat her. Mor. Hun fortalte om det så mange ganger at jeg kjenner igjen benken.'),
  n('Du forteller om natta ved Eggakanten. Om Den gamle, og Den unge, og sangen. Bestefar hører på uten å si noe.'),
  e('Hadde hun en unge med seg?'),
  e('Da er det bra. Da er det godt.'),
  n('Han setter kjelen på ovnen og blir stående med hånda på håndtaket en stund.'),
  a('Du har stått sånn i en time, Knut. Kaffen blir ikke bedre av det.'),
  e('Jeg vet det, Astrid. Jeg bare husker.'),
  na('Flere boller! Jeg har med meg fire brett. Fiskebruket gikk med overskudd i dag, så jeg har råd til sukker.'),
  br('Jeg har ført det inn i protokollen. «Den gamle observert ved Eggakanten. Rolig sjø.» Jeg vet ikke hva annet jeg skulle skrive.'),
  fr('Taket holder. Jeg har sjekket det to ganger. Det er mye folk i ett hus.'),
  s('Jeg tok opp sangen fra båten. Den siste delen har jeg aldri hørt før. Jeg tror ingen har det.'),
  ak('Farmor ville likt å vite at hun hadde en unge.'),
  ak('Da er det noen som husker etter henne.'),
  n('Aslak nynner noen toner. Denne gangen stopper han ikke med en gang.'),
  e('Takk, vennen. For huset. For alt sammen.'),
  e('Mor sa at havet utenfor Vardø er der alle sangene ender opp. Hun tok feil. Det er der de begynner igjen.'),
  n('Pus sover ved ovnen. Utenfor flammer det første nordlyset over Barentshavet, grønt og stille.'),
  n('Slutt på femte kapittel. Men havet er stort, og Vardø har mange hus.'),
]

export const AFTER_VA_ENDING: string[] = [
  'Fiskebruket går for fullt. Fetteren min har fått seg kjæreste. Det kaller jeg ringvirkninger.',
  'Folk spør om huset ditt er til salgs. Jeg sier at det koster én krone, og at Astrid allerede har betalt.',
  'Bestefaren din satt på trappa til Signes hus hele formiddagen. Han vinket til alle båtene.',
  'Brita har hengt opp avisutklippet om fiskebruket på Havnekontoret. Hun later som det handler om noen andre.',
  'Tre familier har søkt om gamle hus i Vardø denne måneden. Tre! Det har ikke skjedd på tjue år.',
]

// ---------- side stories ----------

export const FRIDA_RACE: VLine[][] = [
  [
    fr('Regatta. Fra kaia, rundt bøyene i sundet og tilbake. Tre båter. Én vinner.'),
    fr('Hold innsiden i svingene. Det er fire meter kortere hver gang. Jeg har målt.'),
  ],
  [
    fr('Den neste går til Kiberg. Femten kilometer langs land. Skjær overalt, og de ligger ikke der kartet sier.'),
    fr('Vinneren får kaffe på kaia i Kiberg. Taperen må drikke den samme kaffen. Den er ikke god.'),
  ],
  [
    fr('Den siste. Rundt Hornøya og Reinøya. Åpent hav, krappe bølger, lundefugler i veien.'),
    fr('Bestefar vant den tolv år på rad. Så vant han ikke mer, fordi ingen ville stille opp mot ham.'),
  ],
]

export const FRIDA_RACE_WON: VLine[] = [
  fr('Tre av tre. Det har ingen gjort siden bestefar.'),
  fr('Han hadde en egen farge på båtene sine. Ingen andre fikk bruke den.'),
  n('Frida gir deg en boks med maling. På lokket står det med bestefarens skrift: «Slippen-blå. Bare for vinnere.»'),
  fr('Nå får du bruke den. Han ville sagt ja. Han sa sjelden ja, men han ville sagt det.'),
]

export const BRITA_FINE: string[] = [
  'Hunnkrabber i kassa. Her på kaia går de tilbake. De skulle blitt mødre til titusenvis. Bot.',
  'Under streken. De skulle fått vokse et år til. Bot, og så er vi ferdige med det.',
  'Jeg har målt to ganger. Det stemmer ikke. Bot.',
  'Jeg liker deg. Jeg skriver bot likevel. Det er sånn det må være.',
  'Kystvakten lærte meg å telle krabber. Jeg har aldri glemt det. Bot.',
  'Snu krabbene før du bestemmer deg. Bred hale er hunn. Bot denne gangen.',
]

export const KNUT_LEGEND: Record<'v_lavedora' | 'v_gamlegra' | 'v_isdronninga' | 'v_kongen' | 'v_gullsjarken', VLine[]> = {
  v_lavedora: [
    n('Telefonen ringer. Det er bestefar, og han høres oppspilt ut.'),
    e('Har jeg fortalt deg om Låvedøra? En kveite på Tiddlybanken så stor at mors onkel brukte den som dør på låven.'),
    e('Den kom bare opp når det regnet. Den likte ikke sola. Den hadde ingen solbriller.'),
    a('Det var et naust, Knut. Og han brukte en vanlig dør. Kveita var på femti kilo.'),
    e('Det var døra som var liten, Astrid.'),
  ],
  v_gamlegra: [
    n('Telefonen ringer. Bestefar har drukket morgenkaffen sin.'),
    e('Mor fortalte om Gamle Grå. En torsk i Bussesundet, grå som en stein og eldre enn kirka.'),
    e('Han beit bare i grålysningen, før byen våknet. Mor sa han var for stolt til å bite når folk så på.'),
    a('Hun sa han var lang som en åre, Knut. Ikke som en båt. Du sier båt hver gang.'),
    e('Årene var lengre den gangen.'),
  ],
  v_isdronninga: [
    n('Telefonen ringer sent. Bestefar hvisker, som om noen sover.'),
    e('Isdronninga. Blåkveite. Hun ligger ved Eggakanten, så dypt at det er mørkt både dag og natt.'),
    e('Men det er bare om natta hun kommer opp. Da lyser øynene hennes som is i måneskinn.'),
    a('Øynene hennes lyser ikke, Knut. Blåkveite har vanlige øyne. Mor sa hun var kald som is.'),
    e('Kald som is, lyser som is. Det er nesten det samme.'),
  ],
  v_kongen: [
    n('Telefonen ringer. Bestefar har lest avisa.'),
    e('Kongen av Varanger. En kongekrabbe så stor at den kunne gå over sundet uten å bli våt på ryggen.'),
    e('Far så den en gang, i en teine. Den så på ham og løftet lokket selv.'),
    a('Kongekrabba kom ikke hit før lenge etter far, Knut. Han så aldri en eneste en.'),
    e('Da har jeg hørt det av noen andre. Det er like sant. Den går i teinene i fjorden, sier Aslak. Bare sjelden.'),
  ],
  v_gullsjarken: [
    n('Telefonen ringer. Det er bestefar, og han ler allerede.'),
    e('Gullsjarken. En uer så gyllen at fiskerne trodde det var en sjark som hadde sunket med lysene på.'),
    e('Mor sa den sto midt i fjorden, der ueren står, og at den bare viste seg når havtåka lå tett.'),
    a('Den var rød, Knut. Bare litt gulere enn de andre. Mor kalte den Gullsjarken fordi du gråt da du ikke fikk se den.'),
    e('Jeg gråt ikke. Jeg hadde salt i øynene.'),
  ],
}

// ---------- everyday chatter ----------

export const VA_CHATTER: Record<'nadja' | 'brita' | 'aslak' | 'frida' | 'selmaVa' | 'house', string[]> = {
  nadja: [
    'Kassa full? Kom inn med den. Jeg kjøper alt som har finner eller klør.',
    'Kongekrabbe er dyrere enn laks nå. Folk i Tokyo spiser den. Folk i Vardø spiser fiskeboller.',
    'Pukkellaks kjøper jeg billig. Den hører ikke hjemme her, men den smaker greit røkt.',
    'Tippoldefar var pomor. Han lærte seg norsk av fiskerne og banning av krykkjene.',
    'Pomorene kom hver sommer så snart isen gikk opp i Kvitsjøen. Folk her kalte rugmelet deres «russemel».',
    'Har du prøvd å fiske om natta? Det er lyse netter nå, men de blir mørkere for hver uke.',
    'Ha! Brita ga deg bot? Hun ga meg bot i 2009. Jeg har fortsatt kvitteringen på kjøleskapet.',
    'Signe? Bestemor husket henne. Hun sa Signe kunne sløye en torsk raskere enn noen gutt.',
    'Røkt fisk selger best i Oslo. De tror det er luksus. Det er det jo.',
    'Hele byen snakker om huset ditt. Jeg har solgt mer kaffe siden du kom.',
  ],
  brita: [
    'Hold fisken i det grønne feltet hele veien, så fører jeg den som perfekt i protokollen.',
    'Havtåka kommer fort her. Ser du den komme inn fra havet, stevner du hjem. Ingen diskusjon.',
    'Pukkellaksen sprer seg i elvene i Finnmark. Hver eneste en du tar, er en tjeneste for villaksen.',
    'Fiskeridirektoratet rydder spøkelsesgarn hvert år. Gamle garn som fisker for ingen. Finner du et, ta det opp.',
    'Tjuefem år i Kystvakten. Jeg har sett mye rart på havet. Fisken til Knut er ikke det rareste.',
    'Krabbe: hann, stor nok, ellers ut. Jeg sier det én gang til, så slipper jeg å skrive bot.',
    'Kontrakttavla fylles opp hver morgen. Ta én, gjør den. Det er hele hemmeligheten.',
    'Vardø er byen lengst øst i Norge. Vi er lenger øst enn Istanbul. Slå det opp.',
    'Halvor i Skjærvik ringte. Han ville vite om du gjør det bra. Jeg sa ja. Han sa «hm».',
    'Lesebrillene mine? På hodet. Takk. Ikke fortell det til noen.',
  ],
  aslak: [
    'Garn er tålmodighet. Du har det, eller du får det.',
    'Elle sa jeg snakket for lite. Jeg sa at hun snakket for to.',
    'Lodda kommer, så kommer torsken, så kommer hvalen. Så kommer folk og lurer på hvor fisken ble av.',
    'Kongekrabba er god å selge. Vond å ha på bunnen. Begge deler er sant.',
    'Vi er sjøsamer. Vi har fisket her lenger enn noen har skrevet det ned.',
    'Barnebarnet mitt vil bli fisker. Jeg sa at det var et dårlig yrke. Da ble han enda sikrere.',
    'Kald vind fra nordøst. Da står fisken dypt.',
    'Lua mi er eldre enn Frida. Jeg har ikke sagt det til henne. Hun ville målt den.',
    'Brita teller krabbene dine. Jeg teller ikke. Jeg ser.',
    'Farmor sa havet tar og havet gir. Hun sa ikke i hvilken rekkefølge.',
  ],
  frida: [
    'Bordene i en færing er tolv millimeter. Nesten ingenting mellom deg og havet. Det er derfor de er så fine.',
    'Bestefar sa at en båt skal se riktig ut før den er riktig. Jeg sier at den skal måles.',
    'Jeg har sagflis i håret. Det har jeg hatt siden jeg var sju.',
    'Å bygge et rom er lett. Det er å få det rett som tar tid. To millimeter skiller en tett dør fra et trekkhull.',
    'Ikke legg til i Kiberg når det blåser fra øst. Skjærene der ligger to meter fra der du tror.',
    'Jeg måler alt. Bestefar sa at jeg målte vinden også. Det gjør jeg. Elleve sekundmeter i dag.',
    'Huset ditt har god sjel. Og dårlige rør. Men god sjel.',
    'Elle var den første båten jeg bygde alene. Jeg har ikke sagt det til Aslak. Jeg tror han vet det.',
    'Krykkjene bygger reir på alle husveggene i byen. Noen har satt opp hyller til dem. Jeg har snekret tre.',
    'Kaffen på Slippen er kokt i den samme kjelen som bestefar brukte. Den har aldri blitt vasket. Det er hemmeligheten.',
  ],
  selmaVa: [
    'Knølhvalene her spiser lodde. Én hval kan spise over et tonn om dagen. Jeg skulle hatt den appetitten.',
    'Halefinnen er fingeravtrykket deres. Hvit og svart, arr og flekker. Ingen to er like.',
    'Hornøya har lunder, lomvi og krykkjer. Og Norges østligste fyr. Knut ville likt det fyret.',
    'Lundene drar ut på havet i august. De ser ikke land igjen før våren. Tenk å være så modig og så liten.',
    'Pukkellaksen kom fra øst. Den er vakker, men den tar plassen til villaksen i elvene.',
    'Om vinteren drar hvalene inn i fjordene i Troms etter silda. Om sommeren kommer de hit. De følger maten.',
    'Hvalene her synger mindre enn på Hawaii. Men de nynner. Hydrofonen min hører det.',
    'Snabeluer kan bli over sytti år. Noen av dem her ute er eldre enn Brita. Ikke si det til henne.',
    'Gjesterommet ditt har den beste utsikten jeg har hatt i noen forskningsstasjon. Og den beste kaffen.',
    'Nordlig lysprikkfisk igjen! Det finnes milliarder av dem. Den følger meg rundt jorda.',
    'Aslak sier ikke mye. Men når han sier noe om havet, skriver jeg det ned.',
  ],
  house: [
    'Pus sover ved ovnen. Hun har bestemt at huset er hennes, og at du får bo her.',
    'Det knirker i trappa. Det er ikke spøkelser, det er bare et gammelt hus som strekker seg.',
    'Vinden synger i pipa. Signe hørte sikkert den samme lyden.',
    'Pus har lagt en krabbeklo på dørmatta. Det er en gave. Hun venter på takk.',
    'Fotografiet av Signe står på hylla. Hun holder fortsatt torsken. Hun slipper den aldri.',
    'Det lukter kaffe og tjære og fisk. Det lukter hjemme.',
    'Utenfor vinduet sitter tre krykkjer på takrenna og diskuterer noe viktig.',
    'Pus sitter i vinduskarmen og følger båtene med øynene. Hun teller dem, tror du.',
    'Ovnen knitrer. Klokka på veggen går igjen. Frida skrudde på den uten å si fra.',
    'Det er stille i huset. Ikke tomt stille, men godt stille.',
  ],
}

// ---------- the daily derby, after the ending ----------

export const VA_DERBY: { host: 'brita'; rivals: string[]; start: string; win: string; lose: string } = {
  host: 'brita',
  rivals: ['Brita', 'Nadja', 'Aslak'],
  start: 'Vardø-derbyet. To minutter, største totalvekt vinner. Jeg tar tida. Ingen juks.',
  win: 'Førsteplass. Notert i protokollen. Med penn, ikke blyant.',
  lose: 'Ikke denne gangen. Tavla er tom igjen i morgen.',
}

// ---------- travelling ----------

export const VA_TICKET_LINES: string[] = [
  'Hurtigruten sørover? Her er billetten. Stempelet har jeg klart.',
  'Hurtigruten går i kveld. Lugar eller dekk? Dekk. Selvfølgelig. Du er fisker.',
  'Billett til Skjærvik eller Henningsvær. Hils Halvor. Han kommer ikke til å hilse tilbake.',
  'En billett sørover. Jeg skriver det inn. Kom tilbake, ellers må jeg skrive det inn også.',
]

export const VA_TO_AGAIN: VLine[] = [
  n('Hurtigruten runder Varangerhalvøya, og havtåka letter. Der er stjernefestningen, og det blå huset ved kaia.'),
  n('Krykkjene skriker velkommen, eller kanskje noe annet. Nadja vinker fra Pomorbrygga med et kaffekrus.'),
]

export const VA_FROM: VLine[] = [
  n('Brita stempler billetten uten å se opp. Hurtigruten legger fra, og Vardø blir en stripe med farger i havtåka.'),
  n('Pus ser seg tilbake over ripa. Huset venter. Det har ventet lenge før. Det klarer det igjen.'),
]

// ---------- contracts ----------

export const VA_CONTRACT_DONE: Record<'nadja' | 'brita' | 'aslak' | 'frida' | 'selma', string[]> = {
  nadja: [
    'Ha! Akkurat som avtalt. Kunden blir så glad at han vil kysse meg. Det får han ikke.',
    'Levert og betalt. Sånn liker jeg det.',
    'Du er raskere enn fetteren min. Ikke si det til ham. Jo, si det.',
  ],
  brita: [
    'Fullført. Notert. Betalt.',
    'Godt gjort. Jeg sier det bare én gang, så hør etter.',
    'Ryddig arbeid. Kystvakten kunne brukt deg.',
  ],
  aslak: [
    'Bra.',
    'Elle ville nikket. Jeg nikker.',
    'Det var godt gjort. Nå har jeg sagt det.',
  ],
  frida: [
    'Innenfor toleransen. Null avvik. Perfekt.',
    'På minuttet. Jeg tok tida. Selvfølgelig tok jeg tida.',
    'Bra. Bestefar ville sagt «det holder». Det betydde at det var veldig bra.',
  ],
  selma: [
    'Gjestene var i ekstase. Én av dem gråt da han så lundene. Det var fint.',
    'Takk! Det er sånne dager jeg husker hvorfor jeg ble biolog.',
    'Fantastisk. Jeg skal skrive deg inn i takkelista i neste artikkel. Den er lang, men du står øverst.',
  ],
}

export const VA_CONTRACT_FAIL: Record<'nadja' | 'brita' | 'aslak' | 'frida' | 'selma', string[]> = {
  nadja: [
    'Ikke denne gangen. Jeg finner en annen kunde. Det gjør jeg alltid.',
    'Ah. Havet hadde andre planer. Det har det ofte.',
  ],
  brita: [
    'Ikke fullført. Kontrakten er strøket. I morgen er en ny dag.',
    'Det skjer. Ikke for ofte, håper jeg.',
  ],
  aslak: [
    'Neste gang.',
    'Fisken bestemmer. Ikke vi.',
  ],
  frida: [
    'For sent. Elleve sekunder for sent, faktisk. Men hvem teller vel.',
    'Utenfor toleransen. Vi justerer og prøver igjen.',
  ],
  selma: [
    'Gjestene dro hjem uten bilder. De sa det var fint uansett. Jeg tror de var høflige.',
    'Ikke så farlig. Hvalene og fuglene er der i morgen også.',
  ],
}

// ---------- the house, room by room ----------

export const VA_ROOM_DONE: Record<RoomId, VLine[]> = {
  tak: [
    fr('Taket er tett. Femti år, minst. Med god margin.'),
    n('Signes hus har tak og vinduer igjen. Senga står klar.'),
  ],
  kjokken: [
    n('Kjøkkenet har ny benk, ny vask og den gamle vedkomfyren, pusset opp. For første gang på mange år kommer det røyk fra pipa.'),
    fr('Komfyren er fra 1938. Den kommer til å holde lenger enn oss begge.'),
    n('På kjøkkenet kan du nå koke fiskesuppe. Med god suppe i magen får du bedre napp resten av dagen.'),
  ],
  stue: [
    n('Stua har fått tapet og en ovn som drar godt. Pus legger seg foran den med en gang og nekter å flytte seg.'),
    fr('Veggen der er bærende. Den tåler alle trofeene du har. Og litt til.'),
    n('På trofeveggen henger nå den største fisken din fra hvert sted du har fisket.'),
  ],
  gjest1: [
    n('Gjesterommet har en smal seng, et vindu mot havet og en krok til våte klær.'),
    fr('Tre ganger fire meter. Lite, men riktig. Folk betaler for riktig.'),
    n('Gjestene betaler mens du er ute og fisker. Pengene venter i gjesteboka.'),
  ],
  verksted: [
    n('På loftet henger garnene i rader. Det lukter tjære og hampetau.'),
    ak('Et godt garnloft. Elle hadde ikke et så godt. Hun hadde kjøkkenbordet.'),
    n('Nå kan Aslak oppgradere garnene og teinene dine enda mer.'),
  ],
  akvarium: [
    n('Et stort glassakvarium står i stua og bobler. Pus har allerede satt seg foran det. Hun tror det er tv.'),
    s('Du kan ha seks levende fisker i det. Velg dem fra fangsten din. Jeg kan se på dem i timevis.'),
  ],
  royeri: [
    n('Ved siden av huset står et lite skur med pipe. Det lukter or og einer.'),
    na('Et røykeri! Røkt fisk er gull i Oslo. Kom med fisken, så selger jeg den.'),
    n('Fisken i røykeriet blir mer verdt mens du gjør andre ting. Pengene venter til du henter dem.'),
  ],
  brygge: [
    n('Huset har fått sin egen brygge. Båten din kan ligge rett nedenfor trappa til Signe.'),
    ak('Barnebarnet mitt, Mikkel, kan trekke garnene dine for deg. Han tar en andel. Han er ung, men han er ærlig.'),
  ],
  gjest2: [
    n('Loftet har blitt til to små rom med skråtak. Man må bøye seg, men utsikten er verd det.'),
    fr('Takhøyde to meter og ti i midten. Én og førti ved veggen. Si fra til gjestene.'),
    n('Flere gjester betyr flere penger i gjesteboka.'),
  ],
  badstue: [
    n('Nede ved sjøen står en liten badstue av tømmer. Dampen ryker, og havet er seks grader kaldt.'),
    br('Badstue og et bad i Barentshavet. Jeg kommer på torsdag. Det er tjenstlig.'),
    n('Gjester med badstue betaler mer.'),
  ],
  tarn: [
    n('Øverst på huset har Frida bygget et lite rom av glass. Herfra ser du himmelen i alle retninger.'),
    fr('Glasset er herdet og tåler storm. Jeg har testet det med Nadja. Hun lener seg på alt.'),
    n('På netter med nordlys betaler gjestene mye mer for Nordlysrommet.'),
  ],
}

// ---------- naming the sjark ----------

export const VA_BOAT_NAME_TEXT = 'Frida maler navnet på baugen med hvite bokstaver: ELLE.'
