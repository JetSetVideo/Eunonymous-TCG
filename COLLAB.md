# COLLAB.md — shared agent ledger

**Append only. Never edit or delete existing entries.** Newest entries at the bottom.
This is the audit log that lets Hermes (Ubuntu) and Claude Code (Mac M1) hand work
back and forth without stepping on each other.

Entry template:

```
### YYYY-MM-DD · <agent> · <branch>
**Did:**      what changed, in one or two lines
**Files:**    paths touched
**State:**    does it build / do the tests pass?
**Broken:**   anything you knowingly left broken
**Next:**     @hermes / @claude — the specific next step, or "nothing pending"
```

---

### 2026-09-21 · hermes · main (initial)

**Did:** Renamed the project `Synthopwars` → `Eunonymous-TCG`, initialised the git
repo, and built the real LAN multiplayer that the game only pretended to have.
Two computers on the same Wi-Fi can now play each other, and the two agents share
this repo as a coordination bus.

**Files:** added `server/lan-server.js`, `js/net.js`, `test/lan-server-test.js`,
`test/lan-browser-test.js`, `AGENTS.md`, `CLAUDE.md`, `COLLAB.md`, `docs/LAN_SETUP.md`,
`docs/MAC_SETUP.md`, `scripts/start-lan.sh`, `.gitignore`.
Modified `index.html` (title, `<h1>`, favicon, `js/net.js` include),
`js/game.js` (two `!this.netHumanEnemy` guards), `package.json` (name, scripts, `ws`).

**State:** `test/lan-server-test.js` 9/9 pass. `test/lan-browser-test.js` 24/24 pass —
two headless browsers complete a mirrored turn cycle in both directions.

**Broken:** Nothing known. Two benign 404s for `/favicon.ico` were fixed with an
inline favicon.

**Next:** @claude — pick up the guest-side polish pass:
  1. The guest renders state directly and therefore skips VFX/animation events
     (see AGENTS.md §8). Consider mirroring the interesting `emit` events to the
     guest so it animates too.
  2. Lobby ergonomics: no "waiting for host to start" spinner, no reconnect if a
     socket drops mid-match. Both are fair game.
  3. Please re-run both tests on macOS and record the result below.

**Ground rules reminder:** the human has not authorised rewriting history. Never
force-push `main`. Do not commit `node_modules/`.

---

### 2026-09-21 · hermes · main

**Did:** Fixed the test wiring. `package.json` had `"test": "node test/battle-test.js"`,
which points at a **legacy manual harness** — no assertions, no failure exit code,
and hardcoded to a chromium build plus a server on :8931. So `npm test` verified
nothing. Replaced it with a self-hosting runner.

- `test/run-all.js` — picks a free port, boots `server/lan-server.js`, runs both
  suites against it, tears the server down, exits non-zero on any failure.
- `npm test` → the runner. Added `test:relay`, `test:mirror`, `harness:battle`.
- Both suites now read `LAN_URL` / `GAME_URL`, and the browser suite auto-detects
  a Chromium-family binary (macOS Chrome path included) instead of hardcoding one.
- `package-lock.json` re-synced (`ws` was missing).

**Files:** `package.json`, `package-lock.json`, `test/run-all.js`,
`test/lan-server-test.js`, `test/lan-browser-test.js`, `AGENTS.md`, `CLAUDE.md`.

**State:** `npm test` → **9/9 relay + 24/24 browser mirror, all suites passed.**
Server boots on :8934 for the run and is cleaned up.

**Broken:** Nothing known.

**Next:** @claude — `npm test` is now the single bar. Run it once on macOS to
confirm the runner works there (the browser auto-detect should find your Chrome;
override with `CHROME_PATH` if not), then record the result below and pick up the
guest-side polish tasks from the first entry.

---

### 2026-09-21 · hermes · main · v1.2.0+b1

**Did:** Fixed the reported Quick Battle log bug (root cause was NOT the log),
added the version system, added the QA harness, and captured the responsive matrix.

#### Bug fixed — `turn-1-is-not-skipped`

- **What:** Opening a match after a coin toss that picked the enemy started **two**
  turns: `turnCount` doubled to 2, the player's opening Bank phase was skipped, and
  the AI immediately took turn 1. The battle log is where the player noticed it —
  the enemy was buying cards before the player had a turn.
- **Where:** `index.html:3263-3264` (`launchBattle`), symptom rendered at
  `index.html:3364` (`updateBattleLog`).
- **When:** Every Quick Battle, 50% of the time — any time `coinWinner === 'enemy'`.
- **Why:** `startBattle()` already ends by calling `startTurn(this.player)`. The
  caller then called `startTurn(this.game.enemy)` **again** for the coin winner.
- **How:** `npm run qa:probe` → `turnCount=2, enemyTurn=1 (expected 0)`. Reproduced
  headlessly, so it is not a race.
- **Fix:** `startBattle(deck, enemyDeck, mode, battleground, firstSide)` now starts
  the correct opening turn itself; the caller's extra `startTurn` was deleted;
  `js/net.js` forwards the new argument.
- **What-next:** closed. Guarded permanently by the probe, which now covers **both**
  coin-toss outcomes.

#### Added

- `js/version.js` — `GAME_VERSION` + `BALANCE_REVISION`, loaded first. `v1.2.0+b1`.
- `tools/qa/harness.js` — the QA harness (`npm run qa`, `npm run qa:probe`):
  stamped screenshots across 6 viewports, FPS, console/JS/network error capture,
  layout-overflow detection, two probes, `REPORT.md` + `report.json`.
- `docs/QA_HARNESS.md`, `docs/VERSIONING.md`, `docs/AGENT_ROSTER.md`
  (14 agents, six-W reporting contract, 7 player personas, 14-axis balance matrix).

#### Measured findings from the first sweep (v1.2.0+b1)

- **What:** The title screen is **1688px tall inside an 844px viewport** at 390×844 —
  2× vertical overflow, i.e. it scrolls on a phone. The **NET PLAY panel covers the
  entire lower menu** at that size (WORLD, FRIENDS, TROPHIES, LEADERBOARD, QUESTS,
  HELP are all unreachable behind it).
  **Where:** title screen, all 6 viewports (overflow `Y` on every one), worst on
  `phone-portrait`. Panel CSS injected by `js/net.js`.
  **Why:** fixed-size layout with no vertical scaling; the net panel is a
  desktop-positioned floating widget (`position:fixed; right/bottom`).
  **What-next:** @ui-designer + @ux — responsive layout pass, and the net panel
  must become a collapsible/inline control below the tablet breakpoint.
- **What:** At 1920×1080 the arena uses only the centre ~60% of the width; text does
  not scale up; the NET PLAY panel clips the right edge of the battlefield row.
  **Where:** `desktop__quickbattle`. **Why:** single fixed layout, no large-screen rules.
- **What:** FPS falls roughly in proportion to viewport area —
  35 fps @390×844 → **6.4 fps @1920×1080** (headless, `--disable-gpu`).
  **Why:** consistent with **fill-rate-bound** rendering (fullscreen shader + VFX
  canvases), not game logic. **Caveat:** software rasterisation makes absolute
  numbers pessimistic; the *trend* is the signal. **What-next:** @optimiser —
  profile on real hardware before acting; then consider capping shader canvas
  resolution / DPR.
- **Zero console errors, zero failed requests, and zero horizontal overflow** across
  all 12 captures. The error baseline is clean.

#### Discrepancies found: Notion GDD vs. current implementation (needs a decision)

The Notion GDD (`Eunonymous — Game Design Document`, v2.0, 2026-05-28) is now the
authoritative spec. The build disagrees with it in several places:

| GDD says | Build does | Impact |
|---|---|---|
| 9 **Roles** as Commander classes (Artiste, Policier, Docteur, Ingénieur, Cuisinier, Politicien, Architecte, Professeur, Juge) | 9 different **Characters** (Synthetic, Memetic, Refinist, Technopriest, Cyborg, Biopure, Ethereal, Organizer, Schemist) | The core identity system is not the specced one |
| Starting hand of **5** from the mixed pool | **0-card** zero-start economy, everything bought from the Metadeck | Fundamental economy difference |
| Trap Row max **3**, separate Battle Phase | Trap row exists; phases differ (bank/main) | Turn structure |
| Deck: 40 cards, copy limits by rarity | 40 cards, "min 20 creatures" | Deck rules |
| Battle Row max 5 | 5 | ✅ agrees |

**What-next:** @game-designer + @architect must reconcile these before rules work
proceeds. This is a decision for the human, not for an agent to guess.

**Files:** `js/version.js` (new), `tools/qa/harness.js` (new), `docs/AGENT_ROSTER.md`,
`docs/VERSIONING.md`, `docs/QA_HARNESS.md` (new), `js/game.js`, `js/net.js`,
`index.html`, `AGENTS.md`, `package.json`, `.gitignore`.

**State:** `npm test` → 9/9 + 24/24 pass. `npm run qa:probe` → 2/2 probes pass
(after the fix; 1/2 before). No console errors in any capture.

**Broken:** Nothing known. The responsive/performance findings above are defects, not
unknowns — they are logged here rather than silently fixed without a design decision.

**Next:** @claude — in priority order:
  1. `npm test` + `npm run qa` once on macOS, record the result below.
  2. Read `docs/AGENT_ROSTER.md`; adopt the six-W format for your findings.
  3. Guest-side VFX mirroring (carried over from the first entry) — still open.
  4. Responsive layout: net panel must not cover the menu below the tablet
     breakpoint, and the title screen must fit without scrolling. This is the
     biggest single UX defect measured so far.

---

### 2026-09-21 · hermes · main · decision: identity layer

**Did:** Implemented the human's decision on the GDD-vs-build fork —
*"map the 9 Characters onto the 9 Roles (keep both — characters become role variants)"*.

**The model now:**
- **Role** (`js/roles.js`) = mechanics. Passive + active (CD 3), transcribed verbatim
  from GDD §4. 9 roles.
- **Character** (`js/characters.js`) = identity. Art, lore, tribe, 8 signature cards,
  starter deck. Unchanged.
- Every existing artwork, signature card and starter deck survives the change — only
  the mechanical layer is introduced. That was the point of choosing this option.

**Mapping (PROPOSAL, marked as such in `docs/ROLES.md`):**
Synthetic→Architecte · Memetic→Politicien · Refinist→Ingénieur ·
Technopriest→Juge · Cyborg→Artiste · Biopure→Docteur · Ethereal→Professeur ·
Organizer→Cuisinier · Schemist→Policier

**Files:** `js/roles.js` (new), `docs/ROLES.md` (new), `index.html` (script tag),
`tools/qa/harness.js` (probe).

**State:** `npm run qa:probe` → **3/3 probes pass.** New probe
`role-mapping-complete` asserts 9 roles, every character resolving to a real role,
and no role left unclaimed. Observed:
`roles=9 characters=9 weak=["Cyborg"]`.

**Three GDD gaps found while mapping — these need the human, not an agent:**

1. **There is no aggro role.** Cyborg is tempo-5 / Overchargers / Overclock-Adrenaline
   — the fast deck. None of the 9 roles is fast. Artiste is the nearest fit but it is
   spell-mastery, not rush. Cyborg is therefore **the one weak mapping**. Decide: add
   a 10th aggro role, or accept Cyborg-as-Artiste.
2. **Sacrifice has no home.** Technopriest's Sacrament sacrifices its own creatures;
   Juge's Requiem is the closest, but there is no aristocrats role.
3. **The build contradicts the GDD economy.** GDD says a **5-card starting hand** from
   the mixed pool; the build uses a **0-card zero-start economy** bought from the
   Metadeck. This changes the whole opening curve and therefore the power ranking of
   every cheap card. **Resolve before any balance work** — it invalidates all
   pre-existing balance assumptions.

**Broken:** Nothing. But note: the role passives/actives are **data only** — no role
yet affects play. Wiring them is balance-affecting and must be scored on the 14 axes
with an AI-vs-AI batch before it ships.

**Next:** @claude — the ordering I would argue for:
  1. Get the two machines verified (`npm test` + `npm run qa` on macOS).
  2. The three GDD gaps above are blocking. Ask the human, do not guess.
  3. Responsive/UI rework (biggest measured UX defect).
  4. Art import from `~/OneDrive/Eunonymous` — but only AFTER gap 3 is resolved, or
     cards get renamed twice.

**Note on the art:** 132 files (73 jpeg, 47 png, 11 jpg, 1 webp; 265MB) in
`~/OneDrive/Eunonymous`. Filenames are descriptive-but-inconsistent
(`3ladies-cyborgs-product.jpeg`, `alchemymagic_ai-projection_femine_matrix.webp`).
They need a naming convention + a manifest before import, not a bulk copy.

---

### 2026-09-21 · hermes · main · economy decision + responsive fix

#### Decision: the opening economy is ZERO-START (GDD §2.1 superseded)

Made under the human's instruction to use best judgement; **pending one-line
confirmation**. Full reasoning + reversal path: `docs/DECISIONS.md`.

Evidence, strongest first:
1. The human's own brief describes the build: *"cards of two facing players are mixed
   ... into a common master deck and **bought by each player at their turn**."*
2. The GDD contradicts itself — §7.4 describes a shared shop Recruit Phase, which only
   makes sense with a buy economy.
3. Turn 1 already grants 2 mana + a deliberately smaller 3-card market — a designed
   counterweight to the missing head start.

**Consequences:** balance work and the art import are both unblocked.
**Not done:** the Notion GDD was **not** edited (human's rule: append-only, yellow/blue).

#### Fixed: net panel covered the menu on phones — probe-verified

- **What (before):** at 390×844, **5 menu items were hidden behind the NET PLAY panel**
  (Friends, Trophies, Leaderboard, Quests, Help). A fixed-position overlay, so
  `scrollHeight` checks never saw it.
- **Where:** `js/net.js` injected panel CSS; title screen.
- **Why:** desktop-positioned floating widget at all sizes.
- **How:** new probe `menu-reachable-on-small-screens` hit-tests every menu item with
  `document.elementFromPoint` at phone size. It failed first with the 5 items named.
- **Fix:** panel shrinks below 860px, caps its own height, and **auto-collapses** into a
  small `◈ NET PLAY ◂` pill. Driven by a `matchMedia` listener rather than a one-shot
  width read — the probe caught that the first attempt only collapsed at load, so a
  resize/orientation change left it expanded. It now only ever auto-collapses; an
  explicit user expand is never fought.
- **After:** probe passes. `buttonCount=9, covered=[], offscreen=[]`. Visually confirmed
  — all 9 items visible, panel collapsed bottom-right.

#### Open — title screen still overflows (HYPOTHESIS, not yet diagnosed)

- **What:** `scrollH=1688` vs `clientH=844` at 390×844 — 2× vertical overflow — and it
  is still `overflow=Y` on **all 6 viewports**.
- **Where:** title screen, every size.
- **Hypothesis (unverified):** inactive `.screen` blocks are not `display:none`, so their
  content still contributes height. The tutorial screen alone is ~60 lines of rules
  text. This would explain why the overflow is present even at 1920×1080 where the
  menu is short.
- **Why it matters:** every menu item now fits inside the first 844px, so nothing is
  *blocked* — but the page still scrolls, which violates the "avoid scrolling" goal.
- **What-next:** @ui-designer — first VERIFY the hypothesis (measure each `.screen`'s
  contribution to `scrollHeight`), then hide inactive screens properly. Do not fix
  before verifying; the cause might be the aurora/background layer instead.

**Files:** `docs/DECISIONS.md` (new), `js/net.js`, `tools/qa/harness.js` (new probe).

**State:** `npm test` → 9/9 + 24/24 pass. `npm run qa:probe` → **4/4 probes pass.**
Full sweep: 0 console errors, 0 failed requests, 0 horizontal overflow, 12 captures.

**Next:** @claude —
  1. Confirm (or overturn) the economy decision — it is one line either way.
  2. Verify the title-overflow hypothesis before fixing it.
  3. The remaining GDD gaps: no aggro role (Cyborg), no sacrifice role (Technopriest).
  4. Then the art import, which is now unblocked.

---

### 2026-09-21 · hermes · main · fixed a false-confidence test

**Did:** Fixed a racy assertion in `test/lan-browser-test.js` that had been passing
for the wrong reason.

- **What:** The final assertion after the guest's turn was
  `guest.currentPlayer === guest.player`. That can never be true: ending the guest's
  turn hands control back to the **host**, and because the guest swaps sides on every
  snapshot the host *is* the guest's **enemy**. The correct expectation is
  `guest.currentPlayer === guest.enemy`.
- **Why it passed before:** `waitFor` polls every 120ms, so on earlier runs it sampled
  the window *before* the final snapshot landed — while the guest still held its own
  turn. It was asserting the pre-snapshot state, not the mirrored one. Timing shifted
  slightly and it began to fail.
- **Why it matters:** a green suite was reporting agreement between the two engines
  that it was not actually testing. That is worse than no test.
- **Fix:** assert the correct expectation (`currentPlayer === ui.game.enemy`), and add
  a real cross-check — `host.turnCount === guest.turnCount` — so the suite now proves
  the two engines agree on the shared clock instead of racing to a coincidence.
- **Result:** 24 → 26 assertions, both suites pass, **stable across two consecutive
  runs**.

**Files:** `test/lan-browser-test.js`.

**State:** `npm test` → 26/26, twice. `npm run qa:probe` → 4/4.

**Next:** unchanged from the entry above. @claude — when you next touch the mirror
tests, prefer cross-checking host against guest over asserting an absolute value;
absolute values go stale silently, cross-checks cannot.

---

### 2026-09-21 · hermes · main · 100vh no-scroll achieved (directive Phase 1)

**Directive:** "The entire layout—headers, battlefields, decks, player bars, logs and
settings—must reside dynamically inside the viewport bounds. Zero vertical or
horizontal page scrolling allowed."

**Method:** made the requirement machine-checkable BEFORE touching layout. New probe
`no-page-scroll` measures both the page **and the active screen** on both axes, across
all 6 viewports, and names the offending elements.

#### Fix 1 — the document was exactly 2x the viewport

- **What:** page `scrollHeight` was 2x `clientHeight` at **every** viewport
  (844→1688, 1024→2048, 768→1536, 1080→2160).
- **Where:** `css/main.css:2014`, the `#title-screen` block in "TITLE SCREEN REDESIGN".
- **Why:** that block set `position: relative` on `#title-screen`. `.screen` sets
  `position: absolute`, which keeps screens OUT of normal flow so they overlap — but an
  **ID selector beats a class selector**, so the active title screen was pulled back
  into flow. It then occupied a full viewport and pushed its sibling `#screen-shake`
  down by the same amount: `#screen-shake` measured `top:768, bottom:1536`.
- **How found:** the probe's offender list. **My stated hypothesis — "inactive
  `.screen` blocks are not display:none" — was WRONG.** Screens *are* `display:none`.
  Measuring instead of fixing blind is what avoided a wasted change.
- **Fix:** dropped the `position` declaration (with a comment explaining why it must
  not come back).

#### Fix 2 — decoration was forcing the scroll

- **What:** the screen still scrolled internally by 105–290px, and horizontally by
  66–574px.
- **Where:** `.title-bg-grid` (and 4 sibling layers) in `index.html`.
- **Why:** `.title-bg-grid` uses `transform: perspective(500px) rotateX(60deg)
  translateY(20%)`. Its *rendered* bounds far exceed its `inset: 0` box, and as direct
  children of the screen they inflated `scrollHeight`.
- **Fix:** wrapped all 5 decorative layers in one `.title-bg` container with
  `overflow: hidden`, so decoration can never affect layout again.

#### Fix 3 — parametric sizing for the title menu

- **What:** the menu (header + 9 buttons) is the tallest surface; content was still
  6–34px too tall at 768/844/1024, and the H1 was 447px wide inside a 390px phone.
- **Why:** fixed sizes. Critically, the H1's binding constraint on a phone is **width**,
  not height — so clamps driven only by `vh` could not fix it.
- **Fix:** `#title-screen` now exposes parametric metrics
  (`--t-h1`, `--t-btn-pad-y`, `--t-btn-font`, `--t-gap`, …), every one a
  `clamp(min, preferred, max)` with `preferred = min(vh-term, vw-term)`. Retune the
  variables, not the rules. A `max-height: 520px` block switches the buttons to a
  wrapping row for phone-landscape.

**Verified:** `no-page-scroll` PASS — page and screen both exactly `clientH` on both
axes at all 6 viewports (`overY=0 overX=0` at 390x844, 844x390, 768x1024, 1024x768,
1366x768, 1920x1080). All 12 captures show `overflow=--`. Visually confirmed at laptop
and phone. FPS also rose slightly (35→37 phone, 37→42 quickbattle) now the document is
not double-height. `npm test` still 26/26.

#### New finding — two competing version systems

The game renders its own footer tag reading **"v4.0 · Battle System Overhaul"**
(`.version-tag` / `#version-display`) while `js/version.js` reports **1.2.0**. Two
sources of truth for "what version is this" will make the balance-comparison work
unreliable. **What-next:** collapse them onto `VersionInfo.label()`.

**Files:** `css/main.css`, `index.html`, `tools/qa/harness.js`.

**Next:** @claude — `no-page-scroll` is now the guard for the whole 100vh requirement.
Extend it to the battle screen (`#battle-screen` has `overflow: hidden` but its inner
rows were never measured) and to the modals. Then Phase 2 (the Quick Battle match-setup
screen) has a clean, contained surface to build into.

---

### 2026-09-21 · hermes · main · Battle flow, factions, shop, login transition

**Did:** Built the vertical slice the brief leads with — the Battle flow — plus the
faction identity layer it depends on. One complete, verified slice rather than
fifteen started.

#### Faction layer (`js/factions.js`, `css/factions.css`)

- **What:** The Notion "Factions" page yields exactly **9** factions and they ARE the
  game's 9 Characters: Synthetic, Memetic, Refinist, Technopriest, Cyborg, Biopure,
  Ethereal, Organizer, Schemist — with taglines already matching `characters.js`.
- **Where:** `js/factions.js` (registry + SVG marks + palettes),
  `css/factions.css` (motion + chips + card backs).
- **How:** each faction now carries a colour code (primary/deep/glow/edge) and one of
  the nine MATERIAL STYLES, assigned 1:1: Synthetic→metal, Memetic→glitchy,
  Refinist→bronze, Technopriest→material, Cyborg→energy, Biopure→organic,
  Ethereal→virtual, Organizer→fluid, Schemist→atomic.
- **Icons:** inline animated SVG (no icon font, no image request, themes via
  `currentColor`). Each style has its own motion — metal sweeps, glitchy
  misregisters, atomic orbits, fluid flows — all **transform/opacity only** (compositor
  friendly) and disabled under `prefers-reduced-motion`.
- **Also from Notion:** the faction axis vocabulary is recorded per faction
  (eternity/immediate, totalitarian/libertarian, biology/technology, …) for future
  balance positioning.

#### Battle flow — the brief's headline

- **Before:** `⚡ Quick Battle` jumped straight into a duel with a random opponent.
  Field picking lived on a separate `🗺️ Pick Field` button.
- **After:** `⚔️ Battle` → **setup screen** → **1s login transition** → match.
  - Modes: **1v1 PvP · Player vs AI · Conflict (tournament) · AI vs AI (spectator)**.
  - **AI profiles with intelligence degrees**: 6 opponents (Rookie → Archon), each with
    rank, MMR, favourite factions, tactical description, `aiStyle` and a 1–5 star
    intelligence shown in the UI.
  - **Field vote**: both sides vote; agreement takes the field, disagreement rolls
    between the two. (Previously a raw picker.)
  - **Pick Field button REMOVED** — folded into setup, as instructed.
  - **Shop button added** to the home menu.

#### Shop + profile (`js/setup.js`)

- **What:** 9 faction card backs, **free** — unlocked by winning **one** match with
  that faction, per the brief.
- **Where:** `#shop-screen`; profile in `localStorage['eunonymous_profile']` (schemaVersion,
  gameVersion, W/L, per-faction wins, unlocks, last-50 match history).
- **Hooked:** `handleVictory` / `handleDefeat` now call `ui.setupRecordResult()`, which
  updates the profile and awards the unlock. Unlock is announced via toast.
- **Honest limitation:** `conflict` and `aivai` are **selectable and labelled
  "prototype"** in the UI — the engine still resolves them as a 1v1 duel. Making AI
  play BOTH sides needs `aiBankPhase/aiPlayCards/aiAttack` generalised off `this.enemy`,
  which is real engine work I did not fake.

#### Verification (all at the committed state)

- **New probe `battle-setup-flow`** — asserts BATTLE opens setup, 4 mode tiles, field
  vote tiles, AI intelligence panel, mode selection sticks, AI cycles, vote registers,
  the login overlay appears, `elapsedMs >= 1000`, the match starts, the overlay hides.
  Observed: `elapsedMs: 1097, loginSeen: true, finalScreen: "battle",
  gameState: "battle", aiAfterCycle: "tactician"`. **PASS.**
- **`no-page-scroll` EXTENDED** to sweep the new setup + shop screens, not just the
  title. Required first extracting a shared `measureLayout()`/`overflowProblems()` pair
  so the measurement is not duplicated.
  Observed: `phone-portrait/setup 844/844`, `laptop/setup 768/768`,
  `phone-portrait/shop 844/844`, `laptop/shop 768/768` — **all overY=0 overX=0.**
- 6/6 probes pass; `npm test` 26/26; 6 new captures, 0 console errors, 0 overflow.

#### Defects found and fixed during the visual review

- **Shop grid wrapped 8+1** — `auto-fit` produced 8 columns at laptop width, leaving
  Schemist alone on a ragged second row. Fixed with explicit counts that divide 9
  (9 across ≥1180px, else 3×3).
- **The `login` screenshot flow captured the wrong thing** — it fired the real
  transition, but the harness measures FPS for ~1.5s before shooting, so the 1s
  overlay was already gone and the shot showed the battle screen. The flow now drives
  `Login.show()` directly with a long duration to hold it open; the real 1s length is
  asserted by `battle-setup-flow` instead. **Lesson: a screenshot flow that lets a
  transient state expire silently produces a picture of the wrong screen.**

**Files:** `js/factions.js`, `js/setup.js`, `css/factions.css`, `css/setup.css` (all new);
`index.html`, `tools/qa/harness.js`.

**Broken:** nothing known. `conflict`/`aivai` are labelled prototypes, not silently wrong.

**Next:** @claude — still outstanding from the brief, roughly in dependency order:
  1. Card mechanics: sacrifice / combine / exclude-from-graveyard (engine work).
  2. World lore page rebuild from Notion (faction names only + the new faction marks).
  3. Deck Builder: 2.5×3.5 card geometry + card history + premade decks section.
  4. Leaderboard categories (best cards, most played, faction/character stats).
  5. Quests page + profile-persisted quest data.
  6. Help page refresh.
  7. Icons beyond the factions (menu/UI) in the same animated-SVG style.
  8. AI vs AI + Conflict real engine support (generalise the AI off `this.enemy`).
  Do NOT batch these — each deserves its own probe and screenshot comparison, as this
  slice did.
