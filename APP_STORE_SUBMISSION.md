# Fisketur – innsending til App Store (versjon 1.0)

Kartlagt fra repoet `erlendskogan/fisketur` (commit `bc9fcef`, 21. oktober 2026). Ingen kode er endret.

**Slik er dokumentet bygget opp:** Alt som skal limes inn i App Store Connect står på engelsk i egne kodeblokker, med tegnantall. Forklaringene til deg står på norsk. Det jeg ikke kunne finne ut fra koden, er merket `UKJENT – trenger svar fra Eivind` og samlet i spørsmålslisten nederst.

**Slik er det sjekket:**
- Lest all app-konfigurasjon (`mobile/app.json`, `mobile/eas.json`, `mobile/package.json`), app-skallet (`mobile/*.ts*`) og spillkoden i `src/`.
- Kjørt `expo prebuild` på en kopi utenfor repoet. Da får jeg samme `Info.plist`, entitlements og byggeinnstillinger som EAS lager.
- Lest loggen fra den siste TestFlight-kjøringen i GitHub Actions (run 39608137919).
- Bygget nettversjonen og tatt prøveskjermbilder i 6,9"-størrelse med Playwright.

**Dette fikk jeg ikke sjekket:** Nettverket her slipper ikke gjennom til `erlendskogan.github.io`, `developers.google.com` eller `expo.dev`. Jeg har derfor ikke åpnet personvernsiden selv, ikke lest Googles egen AdMob-veiledning for personvernskjemaet og ikke lastet ned selve `.ipa`-filen. Disse punktene er merket **(verifiser)**.

---

## 1. App-oversikt

| Felt | Verdi | Kilde |
|---|---|---|
| Navn under ikonet | `Fisketur` | `mobile/app.json` → `expo.name` (`CFBundleDisplayName`) |
| Navn i App Store Connect | UKJENT – trenger svar fra Eivind (README foreslår «Fisketur – fiskespill» hvis «Fisketur» er tatt) | – |
| Bundle ID | `com.gesk.fisketur` | `app.json` → `ios.bundleIdentifier` |
| Apple ID (ASC) | `6823686668` | `mobile/eas.json` → `submit.production.ios.ascAppId` |
| Apple-team | `Z7R22PD5ND` – Eivind Geiran (Individual) | EAS-loggen |
| Expo-prosjekt | `@egeiran/fisketur` (`1215dc50-92cf-4126-99a1-4d936c975948`) | `app.json` |
| Versjon (`CFBundleShortVersionString`) | **`1.0.0`** (ikke `1.0`, se punkt 9) | `app.json` → `expo.version` |
| Build-nummer (`CFBundleVersion`) | Siste opplastede: **4** (21.10.2026 13:27 UTC). Neste blir 5. Styres av EAS (`appVersionSource: "remote"`, `autoIncrement`). | EAS-loggen |
| Minimum iOS | **16.4** | Expo SDK 58-standard (`IPHONEOS_DEPLOYMENT_TARGET` i prebuild) |
| Enheter | **Bare iPhone** (`supportsTablet: false` → `TARGETED_DEVICE_FAMILY = 1`), bare portrett. På iPad kjører den i iPhone-kompatibilitetsmodus. | `app.json`, prebuild |
| Språk i appen | **Bare norsk (bokmål).** All tekst i spillet er norsk. Binæren har ingen `.lproj`-lokaliseringer og `CFBundleDevelopmentRegion` er standard (`en`), så App Store vil sannsynligvis vise «English» som språk (se punkt 11). | `src/game/story.ts` m.fl., prebuild |
| Utseende | Alltid mørkt (`userInterfaceStyle: "dark"`) | `app.json` |

**Teknologistack**

- Spillet: TypeScript og Canvas 2D (`src/`). Det deles med nettversjonen, som bygges med Vite og ligger på GitHub Pages.
- iOS-appen: Expo SDK 58 (`expo ~58.0.13`), React Native 0.88, React 19.3 og Hermes. Spillet kjører i en **Expo DOM component** (`'use dom'`, `@expo/dom-webview`, altså WKWebView). Web-koden pakkes inn i appen og lastes fra lokale filer, ikke fra nettet.
- Native moduler: `@react-native-async-storage/async-storage` (lagring), `react-native-google-mobile-ads` 17.3.1 (Google Mobile Ads SDK 13.10.0 og UMP 3.1.0), `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `react-native-safe-area-context`. `expo-dev-client` er med, men bare i debug-bygg.
- Bygg og innsending: EAS Build i skyen (ingen Mac eller Xcode trengs) og EAS Submit. GitHub Actions-workflowen `.github/workflows/testflight.yml` starter dem.
- Lyd: all musikk og alle lydeffekter lages med WebAudio i koden (`src/audio.ts`). Appen har ingen lydfiler.
- Grafikk: all pikselgrafikk tegnes av koden (`src/art/*`). App-ikonet er spillets eget pikselikon.

**Hva appen gjør (fakta, utledet fra koden)**

Fisketur er et koselig enspillerspill om fisking, i pikselgrafikk og med historie. Du ror ut, slipper ut snøre til ønsket dybde (seks dybdesoner, ned til 1200 m), får napp og sveiver inn med et lite minispill. Fangsten selger du på kaia. Pengene bruker du på utstyr (snøre, stang, snelle, fiskekasse, sluk og lykt) og båtmaling. Det finnes fem kapitler med hvert sitt sted: Skjærvik (fyret og bestefars brev), Petersburg i Alaska, Hilo på Hawaiʻi, Henningsvær i Lofoten og Vardø. Vardø er et langt, nesten åpent kapittel der du setter i stand et hus rom for rom, kjøper båter, setter garn og krabbeteiner og spiller minispill (krabbesortering, garnhaling, hvalfoto, fuglefoto, seilas og levering). Spillet har en fiskebok med 194 arter (inkludert 5 legender), oppdrag, skattekister og en daglig fiskekonkurranse når et kapittel er ferdig.

Det finnes ingen konto, ingen innlogging, ingen server og ingen kjøp i appen. Fremgangen lagres lokalt (AsyncStorage). Den eneste nettverksbruken er valgfrie belønningsreklamer fra Google AdMob: +50 % på et salg av minst 3 fisk, eller en ny sjanse når en ny eller sjelden fisk slipper. Hver type kan brukes maks 3 ganger per dag. Spillet passer for alle aldre og er laget for voksne og familier som liker rolige spill.

---

## 2. Tekster til App Store-siden (engelsk, US)

> Beskrivelsen sier tydelig at spillet er på norsk. Det er viktig for Apples krav til korrekt metadata (2.3) og for å unngå dårlige anmeldelser.

**Subtitle** (28 / 30 tegn)
```text
Cozy pixel-art fishing story
```

**Promotional Text** (166 / 170 tegn)
```text
Row out from a tiny Norwegian harbor, fill your fish book with almost 200 species and help your grandfather light the old lighthouse again. Game text is in Norwegian.
```

**Description** (1900 / 4000 tegn)
```text
Fisketur is a cozy pixel-art fishing game with a story. Please note: all text in the game is in Norwegian (Bokmål).

Your grandfather has grown forgetful, and the lighthouse in the little harbor of Skjærvik has been dark for a year. You arrive with a backpack and a bamboo rod, take over his old rowing boat and start fishing the fjord.

FISH
• Hold to let your line out, let go at the depth you want and wait for a bite.
• Reel in with a simple one-finger minigame: keep the green zone on the fish.
• The deeper you go, the stranger the fish, all the way down to 1,200 meters. Below 150 meters it gets dark, so bring a lamp.
• Rain makes the fish bite better, and the light changes from dawn to night.

COLLECT AND UPGRADE
• Almost 200 species across five places, each with its own page and a short fact in your fish book.
• Sell your catch and upgrade your line, rod, reel, fish box, lure and lamp.
• Paint your boat, finish quests for the locals, find treasure chests and hunt for rare legendary fish.

FIVE CHAPTERS
• Skjærvik, Norway: find your grandfather's old letters and light the lighthouse again.
• Petersburg, Alaska: help the salmon find their way home.
• Hilo, Hawaiʻi: listen for humpback song and rebuild an old fish pond.
• Henningsvær, Lofoten: winter cod fishing and the family's old fishing cabin.
• Vardø: restore your own house by the Barents Sea room by room, with new boats, nets, king crab pots, a smokehouse, guests, a contract board and small minigames.

When a chapter is done, the harbor holds a fishing competition every day.

NO PRESSURE
• No account, no sign-in and no in-app purchases.
• Your progress is saved on your iPhone, and the game works offline.
• Optional rewarded ads: you choose whether to watch a short ad for a bigger sale or a second chance at a fish that got away, at most three times a day for each.
• Original pixel art and a synthesized soundtrack.
```

**Keywords** (95 / 100 tegn. Uten appnavn og uten kategoriord som «game».)
```text
fishing,cozy,pixel,retro,story,norway,norwegian,boat,sea,ocean,fjord,lighthouse,angler,relaxing
```

**Copyright** (18 tegn). **UKJENT – trenger svar fra Eivind.** Forslaget bygger på at Apple-kontoen er en individuell konto i ditt navn. Men det meste av koden og innholdet er skrevet av Erlend Skogan (32 av 45 commits). Rettighetshaver kan derfor være «Eivind Geiran», «Erlend Skogan» eller begge.
```text
2026 Eivind Geiran
```

**Kategori**
- Primary Category: `Games`, med subkategoriene `Casual` og `Simulation`
- Secondary Category (valgfri): `Entertainment`
- Ikke velg Kids-kategorien. Den har strenge regler for tredjepartsreklame (1.3) som appen ikke er satt opp for.

**What's New:** brukes ikke for versjon 1.0.

---

## 3. URL-er

| Felt | Forslag | Status |
|---|---|---|
| **Privacy Policy URL** | `https://erlendskogan.github.io/fisketur/personvern.html` | Siden finnes i repoet (`public/personvern.html`) og ble publisert av Deploy-workflowen på `bc9fcef` (grønn 21.10.2026). Jeg fikk ikke åpnet den herfra: **(verifiser)** at den åpner i en nettleser. Den er bare på norsk og mangler noen elementer (se under). |
| **Support URL** | Anbefalt: `https://erlendskogan.github.io/fisketur/support.html` (**finnes ikke ennå**, utkast under). Midlertidig mulig: `https://github.com/erlendskogan/fisketur/issues` (offentlig, svarer 200). | GitHub Issues krever GitHub-konto for å skrive. Apple vil at brukerne lett skal kunne kontakte deg (1.5). Vi anbefaler en side med e-postadresse. |
| **Marketing URL** (valgfri) | La stå tom, eller `https://erlendskogan.github.io/fisketur/` | Den adressen er den gratis nettversjonen av spillet. Det er lov, men den kan få reviewer til å vurdere appen som en «nettside pakket som app» (4.2). Vi anbefaler å la feltet stå tomt. |

**Personvernerklæringen som ligger ute nå** sier riktig at appen ikke har kontoer, at fremgangen lagres lokalt og at AdMob samler inn data. Den sier også at bare ikke-personaliserte annonser vises og at appen ikke ber om sporing. Dette mangler:
- hvem som er behandlingsansvarlig (navn) og en e-postadresse (GDPR art. 13, Apple 5.1.1(i)),
- hvor lenge data lagres og hvordan man sletter dem eller trekker tilbake samtykke,
- brukerens rettigheter og klagerett til Datatilsynet,
- en engelsk versjon (reviewer leser engelsk).

Utkastet under kan erstatte innholdet i `public/personvern.html` på samme URL. Jeg kan legge det inn hvis du ber om det.

### Utkast: Privacy Policy (engelsk)

```text
Privacy Policy – Fisketur
Last updated: <DATE>

WHO WE ARE
Fisketur is made by UKJENT – trenger svar fra Eivind ("we", "us"), who is the data controller for the app and this website.
Contact: UKJENT – trenger svar fra Eivind (e-mail address)

IN SHORT
Fisketur has no user accounts, no sign-in and no servers of our own. Your game progress is stored only on your own device. The iOS app can show optional rewarded ads from Google AdMob, and when an ad is requested, Google collects some information about your device. The web version of the game has no ads.

WHAT THE GAME STORES ON YOUR DEVICE
The game saves your progress (catches, in-game money, gear, story progress and settings) and, in the iOS app, how many optional ads you have watched today. This information stays on your device and is never sent to us or to anyone else. It is deleted when you delete the app (or clear the website data in your browser for the web version), or when you choose "Start et nytt spill" (Start a new game) in the game's settings.

ADVERTISING IN THE iOS APP (GOOGLE ADMOB)
You can choose to watch a short ad in return for a reward in the game. Ads are always optional. They are provided by Google AdMob (Google LLC; for users in the EEA and Switzerland, Google Ireland Limited).
To show ads, measure them, limit how often you see the same ad and prevent fraud, Google's software in the app may collect:
- your IP address and the approximate location it indicates,
- device and operating system information (such as device model, OS version and language),
- device identifiers such as the identifier for vendors. The advertising identifier (IDFA) is not available, because the app never asks for permission to track you,
- information about the ads shown and how you interacted with them,
- crash and performance data for the ad software.
The app requests non-personalized ads only. It does not track you across other companies' apps or websites, and we do not sell personal data. We do not receive any of this information ourselves, apart from aggregated ad statistics from Google.
How Google uses information from apps that use its services: https://policies.google.com/technologies/partner-sites
Google Privacy Policy: https://policies.google.com/privacy

CONSENT (EEA, UK AND SWITZERLAND)
If you are in the EEA, the UK or Switzerland, Google's consent message asks for your choice before ads are requested. Where consent is required, we rely on it. You can change or withdraw your choice at any time in the game under "Dagbok og innstillinger" (Journal and settings) → "Personvern og reklame" (Privacy and ads). Withdrawing consent does not affect processing that took place before.

THE WEB VERSION AND THIS WEBSITE
The web version of the game and this page are hosted on GitHub Pages. GitHub may process technical information such as your IP address in order to deliver the pages (see the GitHub Privacy Statement). The web version shows no ads and stores your progress only in your browser.

CHILDREN
Fisketur is suitable for all ages but is not specifically directed at children. We do not knowingly collect personal information from children, and the app requests non-personalized ads only.

HOW LONG DATA IS KEPT
We do not store any personal data ourselves. Data on your device stays there until you delete it as described above. Google keeps advertising data according to its own policies.

YOUR RIGHTS
Under the GDPR you have the right to access, correct and delete personal data, to restrict or object to processing, to data portability and to withdraw consent. Because we do not hold personal data about you, requests about advertising data are handled by Google, but you are welcome to contact us and we will help. You can also complain to your data protection authority. In Norway this is Datatilsynet (www.datatilsynet.no).

CHANGES
If the app changes how it handles data, we will update this page and the date at the top.

CONTACT
UKJENT – trenger svar fra Eivind (e-mail address)
```

### Utkast: Personvernerklæring (norsk)

```text
Personvern i Fisketur
Sist oppdatert: <DATO>

HVEM VI ER
Fisketur er laget av UKJENT – trenger svar fra Eivind («vi»). Vi er behandlingsansvarlig for appen og denne nettsiden.
Kontakt: UKJENT – trenger svar fra Eivind (e-postadresse)

KORT FORTALT
Fisketur har ingen brukerkontoer, ingen innlogging og ingen egne servere. Fremgangen din lagres bare på din egen enhet. iOS-appen kan vise reklame som du selv velger å se. Reklamen leveres av Google AdMob, og Google samler da inn noen opplysninger om enheten. Nettversjonen av spillet har ingen reklame.

DET SPILLET LAGRER PÅ ENHETEN DIN
Spillet lagrer fremgangen din (fangst, penger i spillet, utstyr, hvor langt du har kommet i historien og innstillinger). I iOS-appen lagres også hvor mange reklamer du har sett i dag. Opplysningene blir på enheten og sendes ikke til oss eller andre. De slettes når du sletter appen (eller nettstedsdataene i nettleseren for nettversjonen), eller når du velger «Start et nytt spill» i innstillingene.

REKLAME I iOS-APPEN (GOOGLE ADMOB)
Du kan velge å se en kort reklame for å få en belønning i spillet. Reklamen er alltid frivillig. Den leveres av Google AdMob (Google LLC, og Google Ireland Limited for brukere i EØS og Sveits).
For å vise og måle reklame, begrense hvor ofte du ser samme annonse og hindre svindel kan Googles programvare i appen samle inn:
- IP-adressen din og den omtrentlige posisjonen den viser,
- opplysninger om enheten og operativsystemet (for eksempel modell, versjon og språk),
- enhets-ID-er som identifikatoren for leverandør. Annonse-ID-en (IDFA) er ikke tilgjengelig, fordi appen aldri ber om lov til å spore deg,
- hvilke annonser som ble vist og hvordan du brukte dem,
- krasj- og ytelsesdata for reklameprogramvaren.
Appen ber bare om ikke-personaliserte annonser. Den sporer deg ikke på tvers av andre selskapers apper og nettsider, og vi selger ikke personopplysninger. Vi får ikke disse opplysningene selv, bare samlet statistikk om reklamen fra Google.
Slik bruker Google opplysninger fra apper som bruker tjenestene deres: https://policies.google.com/technologies/partner-sites
Googles personvernerklæring: https://policies.google.com/privacy

SAMTYKKE (EØS, STORBRITANNIA OG SVEITS)
Er du i EØS, Storbritannia eller Sveits, ber Googles samtykkemelding om valget ditt før det hentes reklame. Der samtykke kreves, er det grunnlaget for behandlingen. Du kan endre eller trekke tilbake samtykket når som helst under «Dagbok og innstillinger» → «Personvern og reklame» i spillet. Det påvirker ikke behandling som skjedde før du trakk det tilbake.

NETTVERSJONEN OG DENNE NETTSIDEN
Nettversjonen av spillet og denne siden ligger på GitHub Pages. GitHub kan behandle tekniske opplysninger som IP-adressen din for å levere sidene (se GitHubs personvernerklæring). Nettversjonen har ingen reklame og lagrer fremgangen bare i nettleseren din.

BARN
Fisketur passer for alle aldre, men er ikke laget spesielt for barn. Vi samler ikke bevisst inn personopplysninger om barn, og appen ber bare om ikke-personaliserte annonser.

HVOR LENGE OPPLYSNINGER LAGRES
Vi lagrer ingen personopplysninger selv. Det som ligger på enheten din, blir der til du sletter det som beskrevet over. Google lagrer reklamedata etter sine egne regler.

DINE RETTIGHETER
Etter personvernforordningen (GDPR) har du rett til innsyn, retting og sletting, til å begrense eller protestere mot behandling, til dataportabilitet og til å trekke tilbake samtykke. Fordi vi ikke har personopplysninger om deg, er det Google som håndterer forespørsler om reklamedata, men ta gjerne kontakt, så hjelper vi deg. Du kan også klage til Datatilsynet (www.datatilsynet.no).

ENDRINGER
Endrer appen hvordan den behandler opplysninger, oppdaterer vi denne siden og datoen øverst.

KONTAKT
UKJENT – trenger svar fra Eivind (e-postadresse)
```

### Utkast: Support-side (engelsk), foreslått publisert som `public/support.html`

```text
Fisketur – Support

Fisketur is a cozy pixel-art fishing game for iPhone. The game text is in Norwegian.

Questions, bug reports or feedback?
E-mail: UKJENT – trenger svar fra Eivind
or open an issue: https://github.com/erlendskogan/fisketur/issues

Frequently asked questions
- Where is my progress saved? Only on your iPhone. If you delete the app, your progress is deleted too.
- How do I start over? Tap the gear icon at the top right → "Start et nytt spill" and tap again to confirm.
- Do I have to watch ads? No. Ads are optional and give a small bonus in the game, at most three times a day for each kind.
- How do I change my ad consent (EEA, UK, Switzerland)? Gear icon → "Personvern og reklame".
- There is no sound. The game follows the iPhone's silent switch. Turn it off, or check "Lyd: på" in the settings.

Privacy policy: https://erlendskogan.github.io/fisketur/personvern.html
```

**app-ads.txt (for AdMob-inntekter, ikke for review):** AdMob vil verifisere `app-ads.txt` på rotdomenet til utvikler-nettstedet som står i App Store-oppføringen. AdMob leser Marketing URL, og Support URL hvis Marketing URL mangler **(verifiser i AdMob-hjelpen)**. For `erlendskogan.github.io` må filen ligge på `https://erlendskogan.github.io/app-ads.txt`. Det krever et eget repo, `erlendskogan/erlendskogan.github.io`, fordi `/fisketur/app-ads.txt` ikke telles. Linjen blir (utgiver-ID fra app-ID-en i `app.json`):
```text
google.com, pub-3475938586108487, DIRECT, f08c47fec0942fa0
```
Ligger Support URL på `github.com`, kan AdMob ikke verifisere i det hele tatt. Det er en grunn til til å bruke en side på `erlendskogan.github.io`.

---

## 4. App Privacy (nutrition labels)

**Svar på det første spørsmålet:** *Do you or your third-party partners collect data from this app?* → **Yes**. Google AdMob samler inn data. Svar **ikke** «Data Not Collected».

Selve appen sender ingenting fra enheten. Spillfremgang, innstillinger og reklameteller ligger i AsyncStorage (`mobile/storage.ts`, `src/game/state.ts`). Appen har ingen analyse-, krasj-, push-, innloggings- eller betalings-SDK-er. Jeg sjekket for Firebase, Sentry, Amplitude, Segment, Bugsnag, RevenueCat, OneSignal, expo-notifications og expo-updates, og ingen av dem finnes i `mobile/node_modules`. All innsamling under kommer fra **Google Mobile Ads SDK 13.10.0 og UMP 3.1.0** via `react-native-google-mobile-ads` (`mobile/ads.ts`).

**Merk (verifiser):** Jeg fikk ikke åpnet Googles side «App Store data disclosure» for AdMob (developers.google.com/admob/ios/privacy/data-disclosure). Datatypene under er de Google oppgir for SDK-en (IP-basert posisjon, enhets-ID, produktinteraksjon, annonsedata, krasj, ytelse og annen diagnostikk). Søkeresultatet fra Googles side bekrefter disse typene. Sammenlign med siden før du sender inn.

| Datatype (Apples kategorier) | Samles inn? | Koblet til brukerens identitet? | Brukes til sporing (tracking)? | Formål | Hvor i koden / hvilken SDK |
|---|---|---|---|---|---|
| Contact Info (navn, e-post, telefon, adresse, annet) | Nei | – | – | – | Ingen innlogging eller skjema |
| Health & Fitness | Nei | – | – | – | – |
| Financial Info | Nei | – | – | – | Ingen kjøp |
| **Location – Coarse Location** | **Ja** | Nei | Nei | Third-Party Advertising, Analytics | Google Mobile Ads SDK (anslår posisjon fra IP) |
| Location – Precise Location | Nei | – | – | – | Ingen posisjonstillatelse |
| Sensitive Info | Nei | – | – | – | – |
| Contacts | Nei | – | – | – | – |
| User Content (meldinger, bilder/video, lyd, spillinnhold, kundeservice, annet) | Nei | – | – | – | Fremgangen lagres bare lokalt (AsyncStorage). Data som aldri forlater enheten regnes ikke som innsamlet. |
| Browsing History | Nei | – | – | – | – |
| Search History | Nei | – | – | – | – |
| Identifiers – User ID | Nei | – | – | – | Ingen kontoer |
| **Identifiers – Device ID** | **Ja** | Nei | Nei | Third-Party Advertising, Analytics | Google Mobile Ads SDK (IDFV; IDFA er ikke tilgjengelig uten ATT) |
| Purchases | Nei | – | – | – | Ingen IAP |
| **Usage Data – Product Interaction** | **Ja** | Nei | Nei | Third-Party Advertising, Analytics | Google Mobile Ads SDK (visninger og trykk på annonser, appstart) |
| **Usage Data – Advertising Data** | **Ja** | Nei | Nei | Third-Party Advertising, Analytics | Google Mobile Ads SDK (hvilke annonser som ble vist) |
| Usage Data – Other Usage Data | Nei | – | – | – | – |
| **Diagnostics – Crash Data** | **Ja** | Nei | Nei | Analytics | Google Mobile Ads SDK |
| **Diagnostics – Performance Data** | **Ja** | Nei | Nei | Analytics | Google Mobile Ads SDK |
| **Diagnostics – Other Diagnostic Data** | **Ja** | Nei | Nei | Analytics | Google Mobile Ads SDK |
| Surroundings / Body | Nei | – | – | – | – |
| Other Data | Nei | – | – | – | – |

**Hvorfor «Nei» på kobling og sporing:**
- **Sporing:** Appen ber bare om ikke-personaliserte annonser (`requestNonPersonalizedAdsOnly: true` i `mobile/ads.ts`), har ingen ATT-dialog og sender ikke data til datameglere. Svarer du «Yes» på «used for tracking», krever Apple at appen ber om tillatelse med ATT (5.1.2). Uten ATT-dialog fører det nesten alltid til avvisning. Svarene må altså henge sammen med koden: **ingen tracking**.
- **Kobling:** Appen har ingen konto, ingen bruker-ID og knytter ingenting til hvem brukeren er. Det konservative alternativet er å svare **«Linked: Yes» for Device ID**. Det gir ingen avvisningsrisiko, men viser «Data Linked to You» på App Store-siden. Sier Googles side eller personvernmanifestet til SDK-en noe annet, følg dem.

**ATT / sporing på tvers av apper:**
- `NSUserTrackingUsageDescription` finnes **ikke**. Appen kaller ikke `requestTrackingAuthorization`, og IDFA er derfor ikke tilgjengelig (nuller).
- `react-native-google-mobile-ads` lenker `AppTrackingTransparency` svakt (weak), men koden bruker det ikke.
- `SKAdNetworkItems` inneholder bare Googles `cstr6suwn9.skadnetwork` (`app.json`). Det er greit. Google anbefaler en lengre liste for bedre fyllingsgrad, men det er valgfritt.
- Samtykke etter GDPR går gjennom Googles UMP (`AdsConsent.gatherConsent()` ved oppstart, `showPrivacyOptionsForm()` fra innstillingene).

**`NS*UsageDescription`-nøkler i ferdig `Info.plist`** (fra `expo prebuild` med samme konfigurasjon):

| Nøkkel | Tekst | Brukes i release? |
|---|---|---|
| `NSLocalNetworkUsageDescription` | «Expo Dev Launcher uses the local network to discover and connect to development servers running on your computer.» | **Nei.** Den kommer fra `expo-dev-client`, som bare kompileres inn i debug-bygg (`"debugOnly": true`). Dialogen vises aldri i App Store-bygget. Lav risiko (se punkt 11, kosmetisk). |
| `NSBonjourServices` (`_expo._tcp`) | – (ikke en tekst) | Nei, samme grunn |

Ingen andre tillatelser (kamera, mikrofon, bilder, posisjon, kontakter, sporing, Bluetooth, varsler) finnes, og koden ber ikke om dem.

Andre relevante nøkler: `ITSAppUsesNonExemptEncryption = false`, `GADApplicationIdentifier = ca-app-pub-3475938586108487~7350261920`, `GADDelayAppMeasurementInit = true`, `NSAllowsArbitraryLoads = false`.

**Privacy Manifest (`PrivacyInfo.xcprivacy`):**
- Repoet har ingen egen `PrivacyInfo.xcprivacy` på appnivå. `ios/` lages av EAS ved hvert bygg og er git-ignorert.
- Podfile-en har `privacy_file_aggregation_enabled` på (standard). Under `pod install` på EAS lager React Native derfor en `PrivacyInfo.xcprivacy` på appnivå som samler required-reason-API-ene fra alle pods. Manifestene som finnes i avhengighetene:
  - React Native (`React/Resources`): FileTimestamp `C617.1`, UserDefaults `CA92.1`
  - AsyncStorage: FileTimestamp `C617.1`
  - expo-constants, expo-system-ui: UserDefaults `CA92.1`
  - expo-file-system: FileTimestamp `0A2A.1`, `3B52.1`, DiskSpace `E174.1`, `85F4.1`
  - Pluss boost, glog og RCT-Folly fra React Native
- Google Mobile Ads SDK har eget privacy manifest fra versjon 11.2.0 (appen bruker 13.10.0). UMP har også eget manifest. **(verifiser)**, se neste punkt.
- Appens egen kode (JS i web view) kaller ingen required-reason-API-er direkte.
- **Sjekk etter opplasting:** Apple sender e-post med advarsler (`ITMS-91053 Missing API declaration`, `ITMS-91061 Missing privacy manifest`) hvis noe mangler. Ingen slike advarsler er nevnt i repoet. Se i innboksen for bygg 4. Kom det ingen, er manifestene i orden.
- Vil du ha full kontroll, kan `ios.privacyManifests` legges i `app.json` (`NSPrivacyTracking: false` og eventuelle egne datatyper). Det er ikke nødvendig, fordi appen ikke samler inn noe selv.

---

## 5. Aldersgrense (age rating)

Apples spørreskjema har siden 2025 nye trinn (4+, 9+, 13+, 16+ og 18+). Svarene under bygger på all tekst i `src/game/**/story.ts`, artsbeskrivelsene og minispillene. Jeg søkte etter alkohol, tobakk, vold, våpen, skrekk, sex, gambling og medisinske temaer.

| Spørsmål | Svar | Begrunnelse |
|---|---|---|
| Parental Controls | No | Ingen foreldrekontroll |
| Age Assurance | No | Ingen aldersverifisering |
| Unrestricted Web Access | No | Ingen nettleser eller eksterne lenker i appen. Web view-en viser bare spillet som er pakket inn i appen. |
| User-Generated Content | No | Ingen brukerinnhold deles |
| Messaging and Chat | No | Ingen chat |
| Advertising | **Yes** | Valgfrie belønningsreklamer fra AdMob |
| Profanity or Crude Humor | None | Ingen banning. Humoren er mild (for eksempel «Et ansikt bare en mor kan elske»). |
| Horror/Fear Themes | None | «Spøkelsesfisk» og «Spøkelseshai» er ekte artsnavn. Ingen skrekk. |
| Alcohol, Tobacco, or Drug Use or References | None | Bare kaffe. «Røykeriet» i Vardø er for røyking av fisk. |
| Medical or Treatment Information | None | – |
| Health or Wellness Topics | No | Bestefaren er glemsk (et varmt hovedtema om hukommelse), men det handler ikke om medisin. |
| Mature or Suggestive Themes | None | Én forelskelse nevnes i en bisetning («ble forelsket og glemte å reise hjem»). At en gammel bifigur døde, nevnes én gang. Ingenting er beskrevet. |
| Sexual Content or Nudity | None | – |
| Graphic Sexual Content and Nudity | None | – |
| Cartoon or Fantasy Violence | None | Fisking: du fanger, slipper ut og selger fisk. Ingen kamp eller skade vises. |
| Realistic Violence | None | – |
| Prolonged Graphic or Sadistic Realistic Violence | None | – |
| Guns or Other Weapons | None | Ingen våpen |
| Simulated Gambling | None | Skattekister gir tilfeldige penger i spillet, men ingen innsats eller kortspill. |
| Contests | No | Fiskekonkurransen («derby») er en del av spillet og gir bare premier i spillet. Ingen ekte premier. |
| Gambling (real money) | No | – |
| Loot Boxes | No | Ingenting med tilfeldig innhold kan kjøpes |

**Forventet resultat: 4+.**

**Reklamen må passe for 4+ (retningslinje 2.5.18).** Koden setter ingen `maxAdContentRating`. Sett **maks annonseinnholdsvurdering til «G»** i AdMob: *Blocking controls → Content → Max ad content rating*, eller tilsvarende under appen. Ellers kan reviewer få se en annonse som ikke passer for 4+.

---

## 6. Content Rights

| Innhold | Kilde | Lisens / rettighet |
|---|---|---|
| All pikselgrafikk (scener, figurer, ~190 fisker, båter, ikoner i UI) | Tegnes av koden i `src/art/*` (prosedyrisk generert, ingen bildefiler) | Eget verk |
| App-ikon og splash (`mobile/assets/icon.png`, `splash-icon.png`) | Spillets eget pikselikon skalert til 1024 px (commit `e608871`) | Eget verk |
| Musikk og lydeffekter | Syntetisert i koden med WebAudio (`src/audio.ts`). Ingen lydfiler, ingen samples. | Eget verk |
| Historie, dialog og faktatekster om fiskene | Skrevet for spillet (`src/game/**`) | Eget verk |
| Font «Jersey 10» | `@fontsource/jersey-10` 5.3.0, Copyright 2023 The Soft Type Project Authors | **SIL Open Font License 1.1.** Lov å bruke og bygge inn i apper, også kommersielt. Lisensteksten bør følge med eller kunne vises; den ligger i npm-pakken. |
| Reklame | Google AdMob (tredjepartsinnhold som vises i appen) | AdMob-avtalen (Google AdMob Terms) |
| Programvarebiblioteker | Expo, React Native, React (MIT), AsyncStorage (MIT), react-native-google-mobile-ads (Apache-2.0), Google Mobile Ads/UMP SDK (Googles vilkår) | Åpen kildekode / leverandørvilkår |
| Ekte stedsnavn og varemerker i teksten | Skjærvik (oppdiktet), Petersburg, Hilo, Henningsvær, Vardø, Barentshavet. «Hurtigruten» nevnes som reisemåte (32 ganger i koden) og «Widerøe» én gang. | Beskrivende omtale i tekst, ingen logoer. Lav risiko. Butikknavn som «Bakke Fisk», «Pomorbrygga», «Krambua» og «Mottaket» ser oppdiktet ut, men jeg kan ikke bekrefte at de ikke finnes. |
| Flagg (Norge, USA) i pikselgrafikken | Nasjonalflagg | Ikke beskyttet som varemerke |
| Data fra API-er | Ingen. Appen henter ikke innhold fra nettet (bortsett fra reklame). | – |

**Svar i App Store Connect:**
- *Does your app contain, show, or access third-party content?* → **Yes** (Google-reklame og fonten Jersey 10).
- *Do you have all necessary rights to that content?* → **Yes**.

**Dette må du kunne dokumentere hvis Apple spør:**
1. Lisensen for Jersey 10 (OFL 1.1, ligger i `node_modules/@fontsource/jersey-10/LICENSE`).
2. At du har en AdMob-konto og en godkjent app-ID (`ca-app-pub-3475938586108487~7350261920`).
3. At du har rett til koden og innholdet. Git-historikken viser at Erlend Skogan har skrevet det meste, mens Apple-kontoen er din. **En skriftlig avtale mellom dere** (e-post holder) om at appen kan publiseres under din konto, er lurt. Deler av koden er laget med Claude (Anthropic), og etter Anthropics vilkår eier dere det som blir laget.

---

## 7. App Review Information

**Contact Information**
```text
First Name: Eivind
Last Name: Geiran
Phone Number: UKJENT – trenger svar fra Eivind (format: +47 xxx xx xxx)
Email: eivind.geiran@gmail.com
```
Navnet kommer fra Apple-teamet i EAS-loggen («Eivind Geiran (Individual)»). E-posten er ditt forslag og står ikke i repoet. UKJENT om det er adressen du vil bruke.

**Sign-In Information**
- *Sign-in required:* **Nei** (fjern haken). Appen har ingen kontoer og ingen innlogging, så det trengs ingen demokonto og ingen `<DEMO_PASSORD>`.
- Username/Password: la stå tomme.

**Notes** (3319 / 4000 tegn)
```text
Fisketur is a single-player fishing game. All in-game text is in Norwegian, so the button names below are given in Norwegian with an English translation.

NO LOGIN, NO BACKEND, NO PURCHASES
- No account or sign-in. Nothing to set up.
- No server of our own: the game is bundled in the app, saves progress on the device and works offline.
- No in-app purchases. The money in the game ("kr") is earned by fishing and cannot be bought.
- No push notifications, no background tasks, no camera, microphone, photos or location permissions.
- iPhone only, portrait. On iPad it runs in iPhone compatibility mode.

TECHNICAL NOTE
The game is written in TypeScript and drawn on an HTML canvas. It runs from files bundled inside the app (Expo / React Native with a local web view). It does not load a website and does not download code.

HOW TO TEST THE MAIN FLOW
1. Launch the app and tap the title screen ("Trykk for å begynne" = tap to begin).
2. Tap anywhere to move through the short intro dialogue.
3. Tap "Sjøen" (The Sea) in the bottom bar, or tap the boat.
4. Press and hold the yellow button "Hold for å kaste" (hold to cast) or the screen to let the line out. Release at the depth you want.
5. Wait for a bite. When "NAPP!" appears, tap the screen.
6. Reeling: hold your finger on the screen to lift the green zone and keep it on the fish until the meter is full.
7. On the catch card, tap "Ha i kassa" (keep it) or "Slipp ut" (release).
8. Tap "Bryggen" (The Harbor) in the bottom bar, then tap the red building "Krambua" (the shop) and tap "Selg fangsten" (sell the catch).
9. In the shop, "Utstyr" (Gear) upgrades the line, rod, reel, fish box, lure and lamp, and "Båtmaling" is boat paint.
10. "Fiskebok" (Fish Book) lists every species you have caught. "Oppdrag" (Quests) opens after you have sold a fish and talked to the harbor master in "Havnebua".
11. The gear icon in the top right opens "Dagbok og innstillinger" (Journal and settings): sound on/off, "Personvern og reklame" (privacy and ads) and "Start et nytt spill" (start a new game, deletes local progress after a second tap).

ADVERTISING (OPTIONAL REWARDED ADS)
The app shows Google AdMob rewarded ads only when the player chooses to watch one. There are no banner or interstitial ads. Two places offer an ad, each at most 3 times per calendar day:
- In the shop, when you have at least 3 fish in your box: "Reklame: +50 %" gives 50% more for the sale.
- When a new or rare fish gets away while reeling, a "Den slapp!" (It got away!) card offers "Se reklame" (watch an ad) to land it anyway, or "La den gå" (let it go).
If no ad loads within about 10 seconds, the game simply continues without the reward.

Only non-personalized ads are requested. The app never asks for tracking permission (no App Tracking Transparency prompt), so the advertising identifier (IDFA) is not available. In the EEA, the UK and Switzerland, Google's consent message (UMP) appears at first launch, and the choice can be changed later under "Personvern og reklame" in the settings. Outside those regions there is no consent form, so that button has nothing to show.

ACCOUNT DELETION
Not applicable: the app has no accounts and stores no personal data on any server.

PRIVACY POLICY
https://erlendskogan.github.io/fisketur/personvern.html

Thank you for reviewing Fisketur!
```

**Kontosletting (5.1.1(v)):** Gjelder ikke, fordi appen ikke har kontoer. «Start et nytt spill» (`src/main.ts`, `openSettings()`) sletter lokal fremgang etter to trykk.

**UGC og sosiale funksjoner (1.2):** Gjelder ikke. Det finnes ingen brukerinnhold, chat, profiler eller deling.

**Sign in with Apple (4.8):** Gjelder ikke. Det finnes ingen tredjeparts-innlogging.

**Backend:** Ingen. Ingenting må være oppe for review, bortsett fra Googles annonseservere. Uten nett virker spillet, men reklameknappene gir ingen belønning (10 sekunders tidsavbrudd).

**Feature flags:** Bare `EXPO_PUBLIC_ADS_LIVE`, som velger mellom ekte og test-reklame (se punkt 9). Utviklerpanelet (`src/dev/panel.ts`) lastes bare i nettversjonens dev-modus og er ikke med i appen.

---

## 8. Betaling og tilgjengelighet

**Kjøp i appen:** Ingen. Det finnes ingen StoreKit, RevenueCat, Stripe eller andre betalingsløsninger, og ingen digitale varer selges. Pengene i spillet («kr» og «$») tjenes bare ved å fiske. Belønningsreklame er lov (ingen risiko mot 3.1.1). De er valgfrie og begrenset til 3 per type per dag, så de faller heller ikke inn under 3.2.2 (apper laget hovedsakelig for å vise reklame).

**Pris og tilgjengelighet (forslag)**
- Pris: **Free** (0 kr).
- Land: UKJENT – trenger svar fra Eivind. Spillet er bare på norsk. Enten alle land (helt lov), eller bare Norge og Norden for å unngå skuffede brukere.
- **EU (Digital Services Act):** For å bli distribuert i EU-land må du oppgi «trader status» i App Store Connect (*Business*). Siden appen tjener penger på reklame, er du sannsynligvis «trader». Da vises adresse, telefon og e-post offentlig i EU-butikkene. Vil du ikke det, velg bort EU-landene. Norge er ikke EU.
- *iPhone and iPad Apps on Apple Silicon Macs* og *Apple Vision Pro*: **velg bort.** Appen er ikke testet der, og den er låst til portrett.

**App Accessibility (Accessibility Nutrition Labels, frivillig):** Oppgi **ingen** funksjoner for versjon 1.0. Begrunnelse fra koden:
- VoiceOver: Nei. Selve spillet tegnes på et canvas, og bare et par knapper har `aria-label` («Innstillinger», «Lukk»).
- Larger Text (Dynamic Type): Nei. Fontstørrelsene er faste px-verdier i `src/style.css`.
- Reduced Motion: Nei. Appen bruker ikke `prefers-reduced-motion`.
- Sufficient Contrast / Differentiate Without Color: ikke sjekket, så de bør ikke oppgis.
- Dark Interface: Nei. Appen er låst til mørk systemstil, men mange paneler er lyse (for eksempel Fiskeboka).
- Captions / Audio Descriptions: ikke relevant. Det finnes ingen tale eller video; all dialog er tekst.

**Eksportkryptering (Export Compliance):** Appen bruker ingen kryptering ut over HTTPS via iOS og Google-SDK-en. `ITSAppUsesNonExemptEncryption = false` er riktig og står allerede i `app.json`, så App Store Connect spør ikke ved opplasting.

---

## 9. Build og signering

**Status**

| Sjekk | Resultat |
|---|---|
| Bundle ID | `com.gesk.fisketur` ✔ (samme i `app.json`, EAS og provisioning profile) |
| Versjon | **`1.0.0`, ikke `1.0`.** Versjonen i App Store Connect og `CFBundleShortVersionString` i bygget må være like for at bygget skal kunne velges. **Gjør dette:** endre versjonsnummeret i App Store Connect fra `1.0` til `1.0.0` (feltet kan endres så lenge versjonen er i «Prepare for Submission»). Alternativet er å sette `"version": "1.0"` i `mobile/app.json` og bygge på nytt (kodeendring, ikke gjort). |
| Build-nummer | Siste opplastede er **4**. EAS øker selv (`autoIncrement`, `appVersionSource: remote`), så neste blir **5**. Det er alltid høyere enn tidligere. ✔ |
| **Reklame i bygget** | **Bygg 4 er laget med profilen `production` og viser derfor Googles testreklame.** Loggen viser `--profile production` og «No environment variables … found». Bare profilen `store` setter `EXPO_PUBLIC_ADS_LIVE=1` (`mobile/eas.json`, `mobile/ads.ts`). **Bygg 4 skal ikke sendes til review.** Et nytt bygg med `reklame: ekte` må lages. |
| Sertifikat og profil | Distribusjonssertifikat og provisioning profile ligger hos EAS. Begge utløper 29.06.2027. ✔ |
| Produksjons-API | Ingen backend og ingen URL-er å bytte. ✔ |
| Debug-kode / testnøkler | Utviklerpanelet er bare med i nettversjonens dev-modus. `expo-dev-client` er bare med i debug-bygg. AdMob-app-ID-en er ekte i alle bygg, og ad unit-ID-en (`ca-app-pub-3475938586108487/7952897153`) brukes bare med `store`-profilen. `window.game` blir hengende igjen som et ufarlig debug-håndtak. ✔ |
| Entitlements | Tomme (ingen push, ingen associated domains, ingen Sign in with Apple). Det er riktig, siden ingen av dem brukes. ✔ |
| App-ikon | `mobile/assets/icon.png`: 1024 × 1024, RGB **uten alfakanal**. ✔ |
| Launch screen | `SplashScreen.storyboard` fra `expo-splash-screen` med `splash-icon.png` (160 pt) på `#141642`. ✔ |
| Personvernmanifest | Samles automatisk under bygget (se punkt 4). ✔ (verifiser e-posten fra Apple) |

**Slik lager og laster du opp bygget til review.** Prosjektet er en Expo-app uten `ios/`-mappe, så Xcode Archive brukes ikke.

*Alternativ A – fra GitHub (anbefalt, allerede satt opp):*
1. Gå til <https://github.com/erlendskogan/fisketur/actions/workflows/testflight.yml> og velg **Run workflow**.
2. Velg branch **`main`** og **reklame: `ekte`**, og trykk **Run workflow**.
3. Vent til jobben er grønn (forrige gang tok den 7 minutter, vanligvis 15–30). Den bygger `store`-profilen og laster opp automatisk med submit-profilen `production` (`ascAppId 6823686668`).
4. Vent 5–30 minutter på at Apple behandler bygget. Det dukker opp som **1.0.0 (5)** under *TestFlight*.
5. Gå til *App Store → iOS App 1.0.0 → Build → +* og velg **1.0.0 (5)**.

*Alternativ B – fra egen maskin (krever tilgang til Expo-kontoen `egeiran`):*
```sh
cd mobile
npm ci
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile store --auto-submit-with-profile=production
# kontroll: npx eas-cli@latest build:version:get -p ios
```

*Kontroller før du velger bygget:*
- Åpne byggesiden på expo.dev og sjekk at **Build profile = `store`**.
- **Ikke se på eller trykk på dine egne ekte annonser** i TestFlight-bygget. AdMob kan regne det som ugyldig trafikk. Vil du teste, legg telefonen inn som testenhet i AdMob (*Settings → Test devices*).
- Følg med på e-post fra App Store Connect om behandlingen. ITMS-advarsler betyr at noe må rettes.
- Alternativ C (Transporter) er bare aktuelt hvis du laster ned `.ipa` fra expo.dev og laster opp fra en Mac. Det trengs ikke.

**Dette mangler for at bygget skal gå gjennom:**
1. Et nytt bygg med profilen `store` (reklame: ekte).
2. Lik versjon i App Store Connect og bygget (`1.0.0`).
3. AdMob: appen må være godkjent og ha samtykkemeldingen publisert (README sier at den er det). Maks annonseinnhold bør settes til G (punkt 5).

---

## 10. Skjermbilder

**Størrelser**
- **iPhone 6,9" (påkrevd):** 1320 × 2868 px i portrett. 1290 × 2796 og 1260 × 2736 godtas også. Fra 6,9" skalerer Apple selv ned til de mindre skjermene. 6,5" (1242 × 2688 eller 1284 × 2778) trengs bare hvis du ikke laster opp 6,9".
- **iPad: ikke nødvendig.** Appen er bare for iPhone (`TARGETED_DEVICE_FAMILY = 1`).
- 3–10 bilder, PNG eller JPEG, uten alfa.

**Anbefalt rekkefølge (7 bilder).** Teksten er forslag til overlegg hvis du vil legge tekst på bildene. App Store Connect har ikke eget felt for bildetekst.

| # | Skjerm | Forslag til bildetekst (engelsk) |
|---|---|---|
| 1 | Bryggen i Skjærvik i gyllent lys, med skiltene, fyret og Måken | *A cozy harbor in the Norwegian fjords* |
| 2 | Sjøen: båten med snøret langt nede og fisk i dypet | *Let your line down into the deep* |
| 3 | Sveiving: det grønne feltet over en fisk (krever at du spiller) | *Hold to keep the green zone on the fish* |
| 4 | Fangstkortet for en ny art | *Almost 200 species to discover* |
| 5 | Fiskeboka med mange arter funnet | *Fill your fish book* |
| 6 | Dialog med bestefar i fyret, eller et av brevene | *A warm story about memory and family* |
| 7 | Kaia i Vardø (Signes hus, Pomorbrygga), eventuelt i nordlys | *Restore your own house by the Barents Sea* |
| (8) | Alaska eller Hawaiʻi | *Travel to Alaska, Hawaiʻi, Lofoten and Vardø* |

Skjermbildene viser norsk tekst. Det er greit, siden spillet er norsk, og det samsvarer med beskrivelsen.

**Slik lager du dem**
- *Best:* Ta dem på en iPhone 16/17 Pro Max (sideknapp + volum opp). De blir 1320 × 2868 direkte. Spill litt først, så kassa, pengene og Fiskeboka ikke er tomme.
- *Automatisk, fra nettversjonen (testet her):* Spillet er samme kode som appen. Nettversjonens dev-modus har håndtak for å reise mellom stedene og stille klokka (`window.__game`, `window.__dev`). Skriptet under lager 1320 × 2868-bilder av Bryggen, Sjøen, Fiskeboka, Alaska, Hawaiʻi, Lofoten og Vardø. Jeg har kjørt det, og prøvebildene ligger utenfor repoet. Begrensninger: det bruker en helt ny lagring (0 kr og tom Fiskebok), har ingen statuslinje, og hintlinjen nederst («Neste: …») kan vise et mål som ikke passer, fordi skriptet hopper over historien. Det fungerer best for kaiscenene.

```sh
# I repoets rot. Terminal 1:
npm install && npm run dev            # http://localhost:5173
# Terminal 2 (Playwright må være installert):
node appstore-shots.cjs ./skjermbilder
```

```js
// appstore-shots.cjs – iPhone 6.9" (1320 x 2868) from the dev server
const { chromium } = require(process.env.PW || 'playwright')
const out = process.argv[2] || '.'
const URL = process.env.URL || 'http://localhost:5173/'
;(async () => {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
  const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const wait = (ms) => page.waitForTimeout(ms)
  const talkThrough = async () => {
    for (let i = 0; i < 60; i++) {
      if (await page.locator('#talk.hidden').count()) return
      await page.mouse.click(220, 860)
      await wait(200)
    }
  }
  const shot = async (name) => {
    await page.evaluate(() => document.getElementById('devpanel')?.remove())
    await wait(300)
    await page.screenshot({ path: `${out}/${name}.png` })
  }
  await page.goto(URL)
  await wait(1500)
  await page.dispatchEvent('#title', 'pointerdown')
  await wait(800)
  await talkThrough()
  await page.evaluate(() => (window.__dev.time = 0.66)) // golden hour
  await wait(1200)
  await shot('01-harbor')
  await page.click('[data-tab="sea"]')
  await wait(1500)
  await shot('02-sea')
  await page.click('[data-tab="book"]')
  await wait(800)
  await shot('03-fishbook')
  await page.evaluate(() => document.querySelector('#sheet .x')?.click())
  for (const [w, t, name] of [['alaska', 0.29, '04-alaska'], ['hawaii', 0.705, '05-hawaii'], ['lofoten', 0.78, '06-lofoten'], ['vardo', 0.45, '07-vardo']]) {
    await page.evaluate((w) => { const g = window.__game; g.s.flags.ak_moved = true; g.s.flags.va_invite = true; g.travel(w) }, w)
    await wait(2500)
    await talkThrough()
    await page.evaluate(() => document.querySelector('#sheet .x')?.click())
    await page.evaluate((t) => (window.__dev.time = t), t)
    await wait(1200)
    await shot(name)
  }
  await browser.close()
})()
```

Det finnes ikke noe simulator- eller UI-testoppsett for iOS i repoet (ingen Detox, Maestro eller XCUITest).

---

## 11. Risikosjekk mot App Store Review Guidelines

### Blokkerende
1. **Bygget for review viser testreklame.** Bygg 4 er `production`, ikke `store`. Bygg på nytt med `reklame: ekte` (punkt 9).
2. **Versjonen er ulik:** `1.0` i App Store Connect og `1.0.0` i bygget. Endre den i App Store Connect (punkt 9).
3. **Feltene som mangler i App Store Connect:** Content Rights, Privacy Policy URL, Build, Contact Information (telefon er UKJENT), aldersgrense, Description, Keywords, Support URL, App Privacy og skjermbilder. Alt unntatt telefon og copyright er klart i dette dokumentet.

### Bør fikses (reell avvisningsrisiko)
1. **Ingen lenke til personvernerklæringen inne i appen (5.1.1(i)).** Apple krever lenken både i metadata og «within the app in an easily accessible manner». Innstillingene (`openSettings()` i `src/main.ts`) har ingen slik lenke. Forslag: en knapp «Personvernerklæring» som åpner URL-en med `Linking.openURL` fra app-skallet. Det er en liten kodeendring.
2. **Knappen «Personvern og reklame» gjør ingenting utenfor EØS (2.1).** `showAdPrivacy()` svelger feilen når Google ikke har noe skjema. Reviewer i USA trykker og ingenting skjer. Forslag: vis knappen bare når `AdsConsent.getPrivacyOptionsRequirementStatus()` sier `REQUIRED`, og åpne ellers personvernerklæringen. Det er forklart i Review Notes, så risikoen er lavere.
3. **Reklamen må passe aldersgrensen (2.5.18).** Sett maks annonseinnhold til G i AdMob (punkt 5).
4. **Språket (2.3).** Appen er bare på norsk, men binæren ser engelsk ut (`CFBundleDevelopmentRegion` er standard `en`). Beskrivelsen sier at spillet er norsk, så metadataen er ærlig. Sett i tillegg `ios.infoPlist.CFBundleDevelopmentRegion: "nb"` (og eventuelt `CFBundleLocalizations: ["nb"]`) i `app.json`, så App Store viser «Norwegian Bokmål». Det er en kodeendring.
5. **Personvernerklæringen er ufullstendig og bare på norsk** (punkt 3). Publiser utkastet med navn og e-post.
6. **Support URL bør ha kontaktinformasjon (1.5).** GitHub Issues krever konto. Publiser support-siden med e-postadresse.
7. **Web view-app (4.2 Minimum Functionality).** Spillet kjører i en WKWebView. Det er et fullverdig, offline spill med native lagring og native reklame, ikke en nettside, så risikoen er lav. Review Notes forklarer det («does not load a website and does not download code»). Bruk ikke nettversjonen som Marketing URL.

### Kosmetisk / lav risiko
1. `NSLocalNetworkUsageDescription` med teksten om «Expo Dev Launcher» og `NSBonjourServices` følger med i release-`Info.plist` fra `expo-dev-client`, men brukes aldri der. Kan fjernes ved å bygge `store` uten `expo-dev-client`.
2. `UISupportedInterfaceOrientations` inneholder `PortraitUpsideDown`. Det er ufarlig.
3. På iPad kjører appen i iPhone-kompatibilitetsmodus. Apple tester av og til iPhone-apper på iPad. Spillet skalerer selv etter skjermstørrelsen (`resize()` i `src/main.ts`), så det bør se riktig ut. Ta gjerne en rask test i iPad-simulator eller på en iPad med TestFlight.
4. Lyden følger lydløs-bryteren (WebAudio i web view). Det er en kjent begrensning, men ikke et review-problem. Support-siden forklarer det.
5. Det ligger debug-håndtak i nettverkoden (`window.game`) og en `console.log` i minispillets testfunksjon `run()`. De er ufarlige.

### Sjekket og i orden
- **Krasj uten nett:** Spillet, fonten og lagringen er lokale. AdMob/UMP-feil fanges (`try/catch` i `mobile/ads.ts`), og annonsevisning gir opp etter 10 sekunder.
- **Plassholderinnhold:** Ingen «lorem», «TODO» eller «kommer snart» i UI-et. «Tomt hus» er en del av historien.
- **Døde lenker:** Appen har ingen lenker. URL-ene i metadata er beskrevet i punkt 3.
- **Skjulte funksjoner:** Det finnes ingen. Utviklerpanelet er ikke med i appen.
- **Ufullstendige funksjoner:** Ingen funnet. Alle fem kapitlene har en slutt i koden (flaggene `ending`, `ak_ending`, `hi_ending`, `lo_ending` og `va_ending`). Jeg har ikke spilt dem gjennom.
- **Kontosletting, UGC, Sign in with Apple:** Ikke relevant (punkt 7).
- **Betaling (3.1):** Ingen digitale varer selges (punkt 8).
- **Kode lastet ned etter installasjon (2.5.2):** Ingen. Oppdateringssjekken i `src/update.ts` kjører bare på nettsiden, ikke i appen.

---

## Blokkerende mangler før jeg kan trykke Add for Review

1. Lag et nytt bygg med **reklame: ekte** (`store`-profilen). Bygg 4 har testreklame. Velg **1.0.0 (5)** under *Build*.
2. Endre versjonen i App Store Connect fra **1.0 til 1.0.0**, så bygget kan velges.
3. Åpne <https://erlendskogan.github.io/fisketur/personvern.html> i en nettleser og bekreft at siden vises (jeg fikk ikke sjekket det herfra). Lim den inn som **Privacy Policy URL**.
4. Fyll ut **App Privacy** etter tabellen i punkt 4 (Yes, data collected; ingen tracking) og trykk **Publish**.
5. Svar på **Content Rights** (Yes / Yes) og **aldersgrense-skjemaet** (punkt 5, gir 4+).
6. Lim inn **Description, Keywords, Promotional Text, Subtitle og Support URL** (punkt 2 og 3). Sett **Copyright** når rettighetshaver er avklart.
7. Fyll inn **Contact Information** med telefonnummer. Ta bort haken for **Sign-in required** og lim inn **Notes** (punkt 7).
8. Last opp minst 3 **skjermbilder i 6,9"** (1320 × 2868).
9. Velg **kategori** (Games: Casual og Simulation), **pris Free** og **land**. Sjekk **DSA trader status** under *Business* hvis appen skal selges i EU.

## Spørsmål til Eivind

1. Hvilket telefonnummer skal stå i App Review Contact Information?
2. Er eivind.geiran@gmail.com riktig e-post for Apple-reviewere?
3. Hvem eier rettighetene og skal stå i Copyright: Eivind Geiran, Erlend Skogan eller begge?
4. Hvilket navn skal stå som behandlingsansvarlig i personvernerklæringen?
5. Hvilken e-post skal stå offentlig for support og personvern?
6. Hvilket appnavn er registrert i App Store Connect: «Fisketur» eller noe annet?
7. Skal appen være tilgjengelig i alle land eller bare i Norge og Norden?
8. Er du næringsdrivende («trader») etter EUs DSA, eller skal EU-landene velges bort?
9. Er barn under 13 en uttalt målgruppe? I så fall må AdMob settes til «child-directed», og svarene i punkt 4 og 5 endres.
10. Har du fått e-post fra Apple med ITMS-advarsler etter bygg 4?
11. Er AdMob-appen godkjent («Ready»), og er samtykkemeldingen fortsatt publisert?
12. Skal jeg fikse punktene under «Bør fikses» i koden (personvernlenke i appen, skjule den tomme personvernknappen og norsk språkregion) før du bygger på nytt?
13. Skal jeg legge personvernutkastet og support-siden inn i `public/`?
