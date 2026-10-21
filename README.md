# Fisketur

Et koselig fiskespill i pikselgrafikk. Spillet er skrevet i TypeScript med Canvas 2D og kjører både som nettside (GitHub Pages) og som iOS-app.

## Struktur

```
index.html, vite.config.ts   nettsiden (Vite)
src/                         spillet, delt mellom web og app
  main.ts                    mountGame(): bygger spillet og starter det
  web.ts                     web-inngang: font, service worker og oppdateringssjekk
  platform/storage.ts        hvor lagringen ligger (localStorage på web, native i appen)
mobile/                      iOS-appen (Expo)
  App.tsx                    fullskjerm, safe area, kobler til native lagring
  components/Game.tsx        DOM component ('use dom') som kjører spillet i en web view
  storage.ts                 native lagring (AsyncStorage)
  ads.ts                     valgfrie belønningsreklamer (AdMob)
  app.json, eas.json         app- og byggoppsett
```

Appen er et tynt skall. Spillkoden ligger bare i `src/`, og Metro bygger den inn i appen derfra. Endrer du spillet, endres både web og app.

## Web

```sh
npm install
npm run dev      # utviklingsserver
npm run build    # typecheck + bygg til dist/
```

Ved push til `main` publiseres `dist/` til GitHub Pages (`.github/workflows/deploy.yml`).

## App (utvikling)

```sh
cd mobile
npm install
npm start        # Metro + QR-kode for Expo Go
npm run typecheck
```

Installer **Expo Go** fra App Store og skann QR-koden med kameraet. Telefonen må være på samme nett som maskinen.

Expo Go støtter bare den nyeste Expo SDK-en. Når en ny SDK kommer, må du enten oppgradere prosjektet eller lage et utviklingsbygg: `npm run ios:dev`, og så `npm run start:dev-client`. Det krever at iPhonen er registrert med `eas device:create`.

## Deploy til TestFlight

Dette må du gjøre selv. Du trenger ikke Mac eller Xcode, for EAS bygger og signerer i skyen.

### 1. Kontoer (én gang)

- **Apple Developer Program:** meld deg inn på <https://developer.apple.com/programs/> (99 USD/år). Godkjenningen kan ta et par døgn.
- **Expo-konto:** lag en gratis konto på <https://expo.dev/signup>.

### 2. EAS CLI og prosjekt (én gang)

```sh
npm i -g eas-cli
eas login
cd mobile
npm install      # appen har egne pakker; npm install i rota installerer bare weben
eas init
```

Bruk npm, ikke pnpm eller yarn. EAS velger pakkehåndterer ut fra hvilken lockfil som finnes, og prosjektet har `package-lock.json`.

`eas init` oppretter prosjektet på expo.dev og legger `extra.eas.projectId` (og `owner`) inn i `mobile/app.json`. **Commit den endringen.**

### 3. Første bygg

```sh
npm run ios:build          # = eas build -p ios --profile production
```

Første gang spør EAS om å logge inn med Apple-kontoen din. Svar ja når den tilbyr å lage sertifikat og provisioning profile og å registrere bundle ID-en `com.gesk.fisketur`. Sertifikatene lagres hos EAS, ikke i repoet. Bygget tar typisk 10–20 minutter, og du får en lenke til loggen.

### 4. Send til App Store Connect

```sh
npm run ios:submit         # = eas submit -p ios --latest
```

- Finnes ikke appen i App Store Connect fra før, lar `eas submit` deg opprette den. Du kan også gjøre det selv under **Apps → +** på <https://appstoreconnect.apple.com>.
- Navnet i App Store må være unikt i hele butikken. Er «Fisketur» tatt, velg for eksempel «Fisketur – fiskespill». Navnet under ikonet på telefonen blir fortsatt «Fisketur».
- Vil du bygge og sende i ett steg: `eas build -p ios --profile production --auto-submit`.

Apple bruker 5–30 minutter på å behandle bygget før det dukker opp i TestFlight. Spørsmålet om eksportkryptering er allerede besvart i appen (`ITSAppUsesNonExemptEncryption: false`).

### 5. Legg til testere

I App Store Connect: **Apps → Fisketur → TestFlight**.

- **Interne testere** (opptil 100 personer i teamet ditt): legg dem først til under **Users and Access**, og deretter i en intern testgruppe. Det krever ingen review.
- **Eksterne testere** (hvem som helst, med e-post eller offentlig lenke): lag en ekstern gruppe. Første bygg må gjennom Beta App Review, som vanligvis tar under ett døgn.

Testerne installerer **TestFlight**-appen og får invitasjonen der.

### 6. Nye bygg og versjoner

- **Buildnummeret** (`CFBundleVersion`) øker EAS selv for hvert produksjonsbygg (`autoIncrement` med `appVersionSource: "remote"` i `eas.json`). Du gjør ingenting.
  - Se gjeldende nummer: `eas build:version:get -p ios`
  - Sett det manuelt: `eas build:version:set -p ios`
- **Versjonen** brukerne ser (`1.0.0`) står i `expo.version` i `mobile/app.json`. Mange TestFlight-bygg kan ha samme versjon. Når en versjon er sluppet i App Store, må du øke den (for eksempel til `1.0.1` eller `1.1.0`) før neste innsending.
- Etter en endring i spillet eller appen: `npm run ios:build` og så `npm run ios:submit`. Appen oppdaterer seg ikke selv når nettsiden endres.

### 7. Fra TestFlight til App Store

I App Store Connect må du fylle ut:

- beskrivelse og nøkkelord
- skjermbilder for 6,9"-iPhone
- URL til personvernerklæring (påkrevd)
- personvernskjemaet *App Privacy*: spillet lagrer bare lokalt, men AdMob samler inn enhets-ID, grov posisjon og bruksdata for reklame (se Googles veiledning for App Store-personvernskjemaet). Svar *ikke* «Data Not Collected».
- aldersgrense og kategori (*Games → Casual*)

Velg så bygget og trykk **Add for Review**.

### 8. Bygg fra GitHub

Workflowen `.github/workflows/testflight.yml` bygger appen på EAS og sender den til TestFlight. Start den under **Actions → TestFlight → Run workflow**. Alle med skrivetilgang til repoet kan kjøre den, og den som gjør det trenger verken Expo- eller Apple-konto. Jobben blir grønn når bygget er lastet opp til App Store Connect, vanligvis etter 15–30 minutter. Deretter bruker Apple 5–30 minutter før bygget dukker opp i TestFlight.

Oppsett (én gang):

1. **App Store Connect API-nøkkel på EAS** (den som eier Expo-prosjektet): kjør `cd mobile && eas credentials -p ios`, velg `production` og *App Store Connect: Manage your API Key*. Er det allerede satt opp en nøkkel for EAS Submit, er du ferdig. Hvis ikke, velg å sette den opp. EAS lager nøkkelen etter Apple-innlogging og lagrer den hos seg, ikke i repoet.
2. **`ascAppId` i `mobile/eas.json`** (under `submit.production.ios`): appens Apple ID. Den finner du i App Store Connect under **Apps → Fisketur → App Information → Apple ID**. Den er ikke hemmelig. Uten den stopper innsendingen først etter at bygget er ferdig.
3. **Expo-token** (den som eier Expo-prosjektet): gå til <https://expo.dev> → **Account settings → Access tokens → Create token**, for eksempel med navnet «fisketur-github».
4. **GitHub-secret** (eieren av GitHub-repoet): gå til **Settings → Secrets and variables → Actions → New repository secret**. Navnet skal være `EXPO_TOKEN`, og verdien er tokenet. I et personlig repo er det bare eieren som kan legge inn secrets.

Om tokenet:

- Det gir tilgang til hele Expo-kontoen det er laget på, også andre prosjekter der.
- Alle med skrivetilgang til repoet kan i praksis bruke det.
- Kommer det på avveie, slett det på expo.dev, lag et nytt og oppdater secreten.
- Vil dere begrense tilgangen, kan prosjektet flyttes til en Expo-organisasjon med en *robot user* som bare har tilgang til det.

Vil andre enn kontoeieren se byggene i TestFlight, må de legges til som brukere i App Store Connect og deretter som interne testere (se punkt 5).

Ikke legg sertifikater, `.p8`- eller `.p12`-filer eller API-nøkler i repoet. `mobile/.gitignore` stopper de vanligste. Trenger du nøkler senere (for eksempel for innsending fra CI), legg dem i EAS sine miljøvariabler eller hemmeligheter.

## Reklame

Appen har valgfrie belønningsreklamer (AdMob). Nettsiden har ingen. Spilleren velger selv å se dem, og hver type kan brukes 3 ganger per kalenderdag:

- **Salg:** +50 % på salget når du selger minst 3 fisk (Krambua, Bakke Fisk, Fiskeboden, Mottaket, Pomorbrygga).
- **Andre sjanse:** slipper en ny art eller en sjelden fisk mens du sveiver, kan du se en reklame og lande den likevel. Gjelder ikke legender, Den gamle, Kongen eller under fiskekonkurransen.

Grensene står øverst i `src/main.ts` (`AD_SALE_BONUS`, `AD_SALE_MIN`, `AD_PER_DAY`). Reklamen spilles i appen (`mobile/ads.ts`), og spillet får bare vite om den ble sett ferdig (`src/platform/ads.ts`). Annonsene ber bare om ikke-personaliserte annonser, så appen trenger ikke å spørre om sporing (ATT). Samtykke etter GDPR går gjennom Googles UMP.

AdMob-appen heter «Fisketur» (iOS). App-ID-en står i `mobile/app.json`, og ad unit-en «Belonning» står i `mobile/ads.ts`.

**Test eller ekte reklame:** vanlige bygg (også TestFlight) viser Googles testreklame. Ser du på eller trykker på dine egne ekte annonser, regnes det som ugyldig trafikk, og AdMob kan stenge kontoen. Bare bygget som skal til App Store skal ha ekte reklame. Start da TestFlight-workflowen med **reklame: ekte**. Det bygger EAS-profilen `store`, som setter `EXPO_PUBLIC_ADS_LIVE=1`. Vil du teste ekte annonser på egen telefon, legg den inn som testenhet i AdMob under **Innstillinger → Testenheter**.

Personvernerklæringen ligger på <https://erlendskogan.github.io/fisketur/personvern.html> (`public/personvern.html`). Bruk den i App Store Connect og i AdMob.

I Expo Go finnes ikke AdMob-modulen, så der vises ingen reklameknapper. Bruk et utviklingsbygg (`npm run ios:dev`) for å teste reklamen lokalt.

## Kjente begrensninger i appen

- Lyden følger lydløs-bryteren på iPhonen. WebAudio i en web view oppfører seg slik.
- På iPad kjører appen som iPhone-app i portrett (`supportsTablet: false`).
- Web og app har hver sin lagring, så fremgangen deles ikke mellom dem.
- Appen bruker bare latin-delen av fonten. Den dekker all tekst i spillet (æøå, «», –).
- Bare iOS er satt opp. Android krever mer konfigurasjon og egne ikoner.
