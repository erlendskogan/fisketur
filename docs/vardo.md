# Femte kapittel: Vardø — design

This is the plan every agent works from. In-game text is Norwegian bokmål, short sentences, warm and a little dry, in the voice of the existing chapters (read `src/game/story.ts`). Code comments in English, matching the existing style (sparse, one-line, explain *why*). Shared types: `src/game/vardo/types.ts`.

## The idea

The four first chapters were about the old people's memories: Knut's letters, Astrid's river, Tūtū's pond, the family rorbu. Chapter five is about **your own place**. Knut and Astrid's mother, **Signe**, grew up in **Vardø**, the easternmost town in Norway, out at the edge of the Barents Sea. Her childhood house stands empty, and the town gives old houses to people who will move there and bring them back to life. Knut and Astrid are too old. «Alle disse årene har du hjulpet oss med å huske. Nå er det din tur. Lag ditt eget sted.» The price is one krone, and Astrid has already paid it.

Vardø is the longest chapter by far and opens into an almost endless game: a house to restore room by room, four boats from a færing to a havfiskebåt, four fishing grounds further and further out, nets and crab pots that fish while you play, a smokehouse, guest rooms and finally the old fish plant, a contract board with jobs that never run out, a rank that keeps climbing, legendary fish, and a story that ends with Den gamle passing her song on.

Season: late summer into autumn. Light nights turning dark, the first northern lights, sea fog (havtåke), king crab season. No snow (Lofoten had winter).

Through-line: Den gamle's song travels with the humpbacks. In the Barents Sea the humpbacks feed on capelin (lodde) all summer and autumn. Aslak's grandmother joiked a glowing fish. At Eggakanten, where the shelf drops into the deep, Den gamle comes one last time, with a young one: **Den unge**. Knut handed his memories to you; Den gamle hands her song to her young. That parallel is the emotional core. Do not spell it out too much.

World id: `'vardo'`, place «Vardø», currency kr (kroner follow you between Skjærvik, Lofoten and Vardø). Travel: Hurtigruten (it really calls at Vardø), from the lighthouse in Skjærvik and from Hurtigruten in Henningsvær. In Vardø you buy the ticket from Brita at the harbour office.

## People

Portrait ids and looks (art agent draws them; story agent writes them):

- **Nadja** (`nadja`) — runs **Pomorbrygga**: the fish buyer and the shop (the `krambua` spot). 40s, quick, practical, laughs loud. Her family has been in Vardø since the Pomor trade, when boats from the White Sea traded flour for fish here every summer. Dream: open the old fish plant (fiskebruket) again so the town has work. Dark hair in a bun, red cardigan, gold earrings.
- **Brita** (`brita`) — **havnefogd** at **Havnekontoret** (`havnebua`). 50s, ex-coast guard, crisp, fair, secretly soft. Gives the list of oppdrag (like Halvor/Ray/Kimo/Johan), runs the **kontrakttavla** (contract board), sells Hurtigruten tickets, hands out fines when you keep undersized crabs. Grey short hair, navy uniform jacket, reading glasses on a string.
- **Aslak** (`aslak`) — sea Sámi fisherman, about 75, lives in **Aslaks naust** (new spot `naust`). Quiet, funny in few words. His late wife Elle knotted nets all her life; he gives you the first one. Teaches nets, then king crab pots. His grandmother joiked a fish that glowed in the deep, «hun som husker». Write him with respect: a real person, not a mystic. White hair, weathered face, a blue gákti-collar detail on a dark knitted jumper, cap.
- **Frida** (`frida`) — boat builder and carpenter at **Slippen** (the `fyret` spot in Vardø: the slipway with a boat on it). 30s, sawdust in her hair, talks in measurements. Fixes the house, builds and sells boats. Her grandfather built boats on the same slip. Blonde short hair, green overalls, pencil behind the ear, freckles.
- **Selma** (`selma`) — arrives mid-chapter to study humpbacks feeding on capelin; becomes your first guest. Fluke photos (halefinne-ID) is her mechanic.
- **Knut** (`edvard`), **Astrid** (`astrid`), **Halvor** (`halvor`) — in Skjærvik for the invite; Knut and Astrid phone now and then and come on Hurtigruten for the finale.
- **Pus** the cat comes along; in the house he sleeps by the stove.

## The harbour in Vardø

Spots, left to right: `krambua` Pomorbrygga (wide, white-painted wharf building, «POMORBRYGGA» sign), `havnebua` Havnekontoret (small, ochre, flagpole, a contract board by the door), `stasjon` **Signes hus** (blue two-storey house, ruined at first: roof holes, boarded windows; changes with the rooms you build: lit windows, chimney smoke when kitchen exists, smokehouse shed beside it once `royeri`, own jetty once `brygge`, glass loft once `tarn`), `naust` Aslaks naust (small dark-tarred boathouse on poles at the water, nets hanging to dry, glass floats), `fyret` Slippen (slipway on the right with the next boat Frida is building on it, a crane/winch). `baten` = your boat at the mooring, drawn as the boat tier you own.
Backdrop: low, treeless, rounded hills (Varanger tundra), the star-shaped Vardøhus fortress on a low rise, a radar dome on the hill (Vardø really has them; keep it a small white ball), the open sea to the east. Kittiwakes (krykkje) instead of gulls; puffins over the water sometimes.
Vardø's houses are colourful; the town has big murals (Komafest street art) — one mural on a wall is a nice touch.

## The house: Signes hus

Tapping Signes hus (once the roof is fixed) opens a **house view**: a new scene drawn on the main canvas like the harbour, a cutaway dollhouse of the house with its rooms. Rooms that are not built are dark, dusty, boarded. Tap a room to open its sheet. Nav button «Kaia» goes back.

Rooms (`ROOM_ORDER`) — price/rank are the economy agent's call; these are intents:

| id | name | does |
|---|---|---|
| `tak` | Tak og vinduer | story repair, makes the house livable; unlocks the house view and the bed: **sov** (skip to morning or evening) |
| `kjokken` | Kjøkkenet | cook **fiskesuppe** from a fish in the box: better bites for the rest of the day (soupDay) |
| `stue` | Stua med ovnen | **trofeveggen**: your record fish from every place; Pus sleeps by the stove |
| `gjest1` | Gjesterommet | guests pay while you play; Selma moves in first |
| `verksted` | Garnloftet | needed for net and pot upgrades beyond the first levels |
| `akvarium` | Akvariet | put up to 6 live fish from the catch card into the tank; they swim in the house view |
| `royeri` | Røykeriet (shed beside the house) | smokehouse business |
| `brygge` | Egen brygge | your boat moors at home; Aslak's grandson can haul your nets for you (auto-haul at a lower share) |
| `gjest2` | Loftsrommene | more guests |
| `badstue` | Badstua ved sjøen | guests pay more |
| `tarn` | Nordlysrommet (glass loft) | guests pay much more on nights with northern lights; cosmetic glow |

## Boats and grounds

| tier | kind | name | type | grounds | nets | pots |
|---|---|---|---|---|---|---|
| 0 | faering | Signe | Færing | sundet | 1 | 0 |
| 1 | sjark | Elle | Sjark | + fjorden | 2 | 4 |
| 2 | kystbat | Varanger | Kystbåt | + banken | 3 | 8 |
| 3 | havfisker | Nordkapp | Havfiskebåt | + eggakanten | 4 | 12 |

(The sjark is named Elle after Aslak's wife — Aslak asks you to; story beat.) Each boat has its own sprite; in the sea view the bigger boats are visibly bigger.

Grounds (`GROUND_ORDER`), each with exactly 6 zones and its own species, real fish of the place:

- `sundet` **Bussesundet** — the sound between Vardø and the mainland. Shallow to ~150 m. Kelp, sand, rognkjeks, torsk, sei, hyse, ulke, flatfish, pukkellaks (invasive pink salmon — a real current problem in Finnmark; quests ask you to take them out), sjørøye. Far view: the town.
- `fjorden` **Varangerfjorden** — to ~400 m. King crab country (pots), steinbit, flekksteinbit, kveite, uer, lodde, sild, blåkveite in the deep. Far view: coast.
- `banken` **Tiddlybanken** — the open Barents Sea banks out towards the Russian border line, to ~600 m. Big cod, hyse, snabeluer, blåsteinbit, snøkrabbe (pots), polartorsk, håkjerring. Far view: open sea.
- `eggakanten` **Eggakanten** — where the shelf drops into the Norwegian Sea deep, to ~2000 m. Blåkveite, isgalt, isskolest, deep eelpouts, snailfish, lanternfish, glowing deep fish; Den unge. Far view: ocean, maybe an oil-free empty horizon with a far ship and Bjørnøya very faint.

Going to another ground: from the sea view a HUD chip with the ground's name opens **Sjøkartet** (sheet): grounds, locked/unlocked by boat tier, «Stevn ut» → fade, game clock moves on by `hours`, water rebuilt.

## Passive income (it works while you play, in any place; not while the game is closed)

1. **Garn** (Aslak). Set a net on the ground you are on (sea view → «Redskap» chip → sheet). It fills with that ground's shallow/mid fish over time up to a cap. **Haul** it in the sea view on that ground: the **Garntrekk** minigame. Fish go into the **hold** (`va.hold`, boat capacity) and are sold with the box at Nadja. Upgrades at Aslak's: netLen, netMesh, netFloat; more nets (up to boat slots).
2. **Teiner** (Aslak, after the sjark). King crab in `fjorden`, snow crab on `banken`. Haul → **Krabbesortering** minigame: keep males with carapace ≥ the legal minimum, throw back females and small ones. Keeping illegal crabs = a fine from Brita. Upgrades: potType, potBait.
3. **Røykeriet** (room). Load fish from the box or hold; they smoke over time, value × multiplier, sold by Nadja; money waits in the smokehouse till you collect it in the house view. Upgrades smokeOven, smokeWood, smokeBrand.
4. **Gjester** (rooms). Guests pay while you play; money waits in the guest book till you collect. Upgrades guestComfort, guestAds; more rooms add more; badstue and tarn multiply.
5. **Fiskebruket** (Nadja, after the kystbåt). Stages to restore it (pay + deliver fish), then it earns a lot; collect at Pomorbrygga. Upgrades plantStaff, plantCold, plantTruck. Money waits up to a cap (plantCold) — the GTA loop: come back and collect.

All waiting cash has caps so being away from a business means it stops, not that it overflows.

## Rank (Rykte)

XP from catches (by value), net and pot hauls, contracts, oppdrag, story steps. Levels go on forever; titles for the first ~25 levels (Nykommer, Dekkshand, Fisker, Kystfisker, … Skipper, … Reder, … Vardø-legende), then «Vardø-legende 2», «3», …. Rank gates boats, rooms, upgrades and harder contracts, which is what keeps kroner from Lofoten from skipping the chapter. Shown as a HUD chip in Vardø (a star icon and the level).

## Contracts (Kontrakttavla, Brita)

Opens at rank 2. Three offers on the board, new ones every game day; take one at a time. Kinds:
- `rush` — catch n fish (any or of a zone) on ground g within `limit` seconds (timer in HUD like the derby).
- `species` — catch n of a species before the day is out (dueDay).
- `heavy` — one fish over kg on ground g.
- `deliver` — sell fish worth / weighing x to Nadja before dueDay.
- `night` — n fish at night.
- `ghostnet` — find and haul up a lost ghost net (spøkelsesgarn) on ground g: it lies at a depth on the wall, like Knut's letters (snag mechanic). Real: Fiskeridirektoratet clears ghost nets every year.
- `crab` — deliver n legal king crabs.
- `tour` — take guests on a bird trip to Hornøya (photo minigame of puffins, guillemots, kittiwakes). Needs gjest1.
- `race` — Frida's regatta / a rush delivery to Kiberg (sail minigame).
Rewards money + XP, scaled with rank; streak bonus. Failing just clears it and breaks the streak.

## Minigames (new, all drawn on the main canvas, pixel art, playable with one thumb)

- **Garntrekk** (`NetHaul`): the net comes over the gunwale; hold to pull, keep the strain in the green band as the swell lifts and drops the boat; tangled fish come up and you tap each one as it passes the rail to pick it free. Too much strain tears the mesh and fish fall out. ~15–25 s.
- **Krabbesortering** (`CrabSort`): one crab at a time on the deck/sorting table, top-down; a gauge shows carapace length against the legal line, and you can see if it is a male or a female (females have a wide, round tail flap underneath — show it with a «flip» look or a clear marker). Swipe/tap right = keep, left = throw back. A short timer per crab. ~10–30 s.
- **Fotojakt** (`PhotoHunt`): two modes — `fluke`: a humpback dives, the tail rises out of the water for a moment, tap at the right moment and framing for a good ID photo; `birds`: Hornøya bird cliff with puffins zipping by, tap to photograph, guests cheer. ~20 s.
- **Kappseilas** (`SailRace`): top-down sailing/driving through buoys, waves and skerries towards a finish, steering by dragging left/right; rivals. ~30–45 s.

Each returns its result type from `types.ts`.

## Story chain (flags; the integration follows exactly this)

All Vardø flags start with `va_`.

1. `va_call` — after the Lofoten ending, Knut phones (`LO_HOME_CALL` already exists in story.ts, unused). Plays the next time a spot is opened after `lo_ending`. nextGoal: go home to Skjærvik.
2. `va_invite` — in the lighthouse in Skjærvik: `VA_INVITE` (Knut, Astrid, Halvor; Signe's house; one krone; «lag ditt eget sted»; Knut: «Mor sa at havet utenfor Vardø er der alle sangene ender opp.»). Unlocks travel.
3. `va_moved` — first trip: `VA_TRAVEL` (Hurtigruten round Nordkinn and Varanger, the flat land, the fortress, kittiwakes, fog lifting, a mural on a wall).
4. `va_metNadja` — `MEET_NADJA` at Pomorbrygga; first sale `VA_FIRST_SALE` sets `va_sold1` and sends you to Brita and to the house.
5. `va_metBrita` — `MEET_BRITA` at Havnekontoret (needs `va_sold1`): oppdrag open.
6. `va_houseSeen` — `VA_HOUSE` the first time you open Signes hus: ruined; you find a photo of Signe as a girl on the steps with a fish bigger than her. «Frida på Slippen kan fikse taket.»
7. `va_metFrida` — `MEET_FRIDA` at Slippen. Then buy room `tak` from Frida → `VA_ROOF_DONE` (the house view opens, Knut phones: proud).
8. `va_metAslak` — `MEET_ASLAK` at the naust (after `tak`). He gives you Elle's old net (`va.netsOwned = 1`). nextGoal: set it in Bussesundet.
9. `va_netSet` → `va_netHauled` (first haul, then `ASLAK_NET_DONE` at the naust: upgrades open).
10. Rank 2 → `va_board`: `BRITA_BOARD` — the contract board opens.
11. Sjark: Frida offers it once rank ≥ 4 (`FRIDA_SJARK`). Buying sets boat 1 → `VA_SJARK` (Aslak asks you to name her Elle). Fjorden opens.
12. `va_crab` — `ASLAK_CRAB` at the naust once boat ≥ 1: two pots and the rules; first sort → `va_crabSorted` (Brita: `BRITA_RULES` about fines).
13. Selma: once boat ≥ 1 and rank ≥ 6 → `va_selmaLetter` `SELMA_LETTER` (Knut forwards it: she's coming and needs a room). Build `gjest1` → `va_selma` `SELMA_ARRIVES`: first guest, gives you a camera; flukes: photograph 4 different humpbacks (`va.flukes`), `SELMA_FLUKE[i]` each time; the fourth is the whale with the white scar that sang outside Skjærvik years ago → `va_flukesDone`.
14. Kystbåt (rank ≥ 10, `FRIDA_KYST`) → boat 2, banken opens. `NADJA_PLANT` at Pomorbrygga: the fish plant story, `va.plant.stage` 0→4 with `NADJA_PLANT_STAGE[i]` lines; stage 4 = open (`va_plantOpen`).
15. `va_joik` — `ASLAK_JOIK` at the naust once `va_flukesDone` and boat ≥ 2: his grandmother's joik for «hun som husker», who lives where the shelf falls into the deep. «Ta deg en større båt.»
16. Havfiskebåt (rank ≥ 16, needs `va_joik`, `FRIDA_HAV`) → boat 3, Eggakanten opens. Knut and Astrid phone: they are coming on Hurtigruten (`va_family`).
17. `va_finale` — at Eggakanten at night, boat idle at the surface (like Lofoten's Den gamle): Den gamle rises with Den unge; Den unge circles your light; Den gamle sings once and sinks. `VA_UNGE` → `va_unge`. Den unge goes in the book (special, 1 entry).
18. `va_ending` — `VA_ENDING` in Signes hus: everyone (Knut, Astrid, Nadja, Brita, Aslak, Frida, Selma). Knut in Signe's kitchen. «Slutt på femte kapittel. Men havet er stort, og Vardø har mange hus.» Then: the daily derby opens (host Brita), and everything else goes on.

Side storylines (optional, rewards):
- **Pomorskatten** (Nadja): 3 Pomor things on the sea floor at fixed depths in sundet/fjorden (snag like Knut's letters): a copper kettle lid, a kopek from 1800-something, a trader's letter. `va.pomor` 0→3, `NADJA_POMOR[i]`. Reward: a samovar for the stue + money.
- **Elles garn** (Aslak): after `verksted`, mend Elle's best net → the best net level is a gift.
- **Regattaen** (Frida): 3 races, rank-gated; win all → a paint.
- **Legender** (Knut's tall tales, by phone): 5 legendary fish with conditions (ground, depth band, night/day, fog/rain, boat tier, lure). E.g. «Låvedøra» (a halibut the size of a barn door, banken, rain), «Gamle Grå» (a giant cod in sundet at dawn), «Isdronninga» (a giant Greenland halibut at Eggakanten at night), «Kongen av Varanger» (a huge king crab — caught in a pot, rare), «Gullsjarken» (a golden redfish). Book has a «Legender» section.
- **Pukkellaks** (Brita): oppdrag that ask you to take the invasive pink salmon out of the sound.

After the ending: derby, contracts, rank, businesses, legends, aquarium, flukes beyond 4 (more whales to find: up to 12).

## File ownership in phase A (parallel agents — touch only your files)

- **content**: `src/game/vardo/data.ts` (grounds, species, gear, oppdrag, book rewards, paints, legends + their conditions, Pomor depths, ghost net depths, crab legal minimum).
- **economy**: `src/game/vardo/economy.ts`, `src/game/vardo/contracts.ts` (boats, rooms, tracks, rank, all passive ticks, hauls, sorting outcome, contract generation and progress; pure functions on `VardoState`, no DOM). A `scripts/vardo-sim.ts` pacing simulation.
- **story**: `src/game/vardo/story.ts` (every line), and nothing else.
- **minigames**: `src/game/vardo/minigames/*.ts`.
- **art**: `src/art/*.ts` (new `src/art/vardo.ts` and edits to existing art files), and the drawing parts of `src/game/harbor.ts` and `src/game/sea.ts` for Vardø; new `src/game/vardo/house.ts` (the house view scene).

Phase B (one agent) wires it into `main.ts`, `data.ts`, `state.ts`, `sea.ts` logic, `audio.ts`, `weather.ts`, dev panel. Nobody in phase A edits `main.ts`, `src/game/data.ts`, `src/game/state.ts`.
