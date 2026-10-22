# Reklamevideoer

Tre reklamefilmer i mobilformat (1080 × 1920, 30 bilder/s, H.264 og AAC) laget av ekte spill. Ferdige filer ligger i `docs/reklamevideoer/`.

| Fil | Retning | Lengde |
|---|---|---|
| `1-dypet.mp4` | Gameplay-krok: snøret går 850 meter ned, en sildekonge biter, du sveiver den inn og får «Ny art!» | ca. 20 s |
| `2-fyret.mp4` | Historien: bestefar er glemsk, du finner brevet hans i dypet, han husker løftet sitt og fyret blir tent | ca. 28 s |
| `3-reisen.mp4` | Montasje klippet i takt med refrenget: Skjærvik, Alaska, Hawaii, Lofoten og Vardø, fiskeboka og to sjeldne fangster | ca. 26 s |

Hver video har også et stillbilde (`.jpg`) som kan brukes som forsidebilde.

## Slik lages de

Opptakene styres av skript, og alt kommer fra selve spillet: grafikken, grensesnittet, lydeffektene og musikken. `vtime.js` tar over klokka i nettleseren (requestAnimationFrame, tidtakere, CSS-animasjoner og WebAudio). Spillet går dermed bilde for bilde, og lyden rendres i takt med bildene. Tekstene og sluttkortet ligger i et eget lag over spillet (`overlay.css`).

```sh
npm install && npm run dev                       # terminal 1: spillet på http://localhost:5173
npm i --no-save playwright-core                  # terminal 2, én gang
node scripts/reklame/render.mjs                  # alle tre, eller f.eks. «render.mjs 2»
```

Du trenger `ffmpeg` og en Chromium. Skriptet bruker `/opt/pw-browsers/...`. Sett `CHROME=/sti/til/chrome` hvis den ligger et annet sted. Mellomfiler havner i `scripts/reklame/.out/`.

| Fil | Hva den gjør |
|---|---|
| `studio.mjs` | Opptaket: åpner spillet, filmer, lager lydsporet for hvert klipp |
| `saves.mjs` | Lagrede spill for opptakene (utstyr, fiskebok, sett historie) |
| `scenes.mjs` | Tekster, stempler, sluttkort og autopiloten som sveiver |
| `ad1-dypet.mjs`, `ad2-fyret.mjs`, `ad3-reisen.mjs` | Manus for hver video |
| `render.mjs` | Spiller inn, legger på musikken og lager de ferdige filene |

Musikken er spillets egen pianoballade. Den spilles inn for seg og legges under klippene: refrenget kommer inn når sildekongen dukker opp (1), andre vers begynner når fyret tennes (2), og hver takt i refrenget får sitt eget sted (3). Lyden normaliseres til −14 LUFS, som passer for TikTok, Reels og Shorts.

Vil du endre en tekst, finner du den i manuset for videoen. Sluttkortet står i `scenes.mjs` (`END`).
