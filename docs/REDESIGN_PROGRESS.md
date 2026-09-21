# Synthopwars — Battle Improvement Redesign — Progress Tracker

Tracks execution of the full redesign goal: Character layer (9 classes, 5 axes, colorless cards),
consolidated/improved rules, lore & lexicon, Starcraft-2-style battle log, clearer UI, refined animations.
Updated as stages complete — check a box only once the corresponding file change is actually made and verified.

## Stage 1 — Design Doc ✅
- [x] `docs/CARDS.md` — 5-axis system, 9 Characters with full signature card stat blocks, colorless
      philosophy, 17 new character-locked keywords, deck construction rules. **Canonical source.**

## Stage 2 — Rules Consolidation ✅
- [x] `GAME_RULES.md` rewritten as the single canonical rules doc — reconciled against actual `js/game.js`
      behavior (found and fixed doc/code drift: Power formula, Mana floor, Metadeck size, win-condition
      names, turn-30/sudden-death mechanics), character select step added, keyword list expanded with the
      17 new Character keywords, battle log + UI/animation sections added.
- [x] `docs/rules.md` converted to a short pointer at `GAME_RULES.md` + `docs/CARDS.md`.
- [x] `docs/GDD.md` trimmed of duplicated/contradictory rules text, kept unique content (Team archetypes,
      battlegrounds, features, world building, progression, technical), repointed Commanders section at
      the 9 Characters.
- [x] `README.md` updated: Character-select step added to "How to Play", Character vs. Team explainer
      table, win conditions corrected (added Combo/Sudden Death/Surrender), links to `docs/CARDS.md`.
- [x] Found and flagged a real code/design mismatch: `js/game.js` currently deals each player an opening
      hand of 3 cards from their own pre-shuffle deck (`startBattle`, ~line 169), contradicting the
      "0 cards in hand and deck at start" rule the user explicitly restated in the goal. Scheduled for
      removal in Stage 4 so code matches the documented (and desired) zero-start economy.

## Stage 3 — Lore & Lexicon ✅
- [x] `assets/lore/world.txt` rewritten: 9 Characters (Parts III) replace the old 9 French Commander
      roles (which had already drifted out of any in-game usage — confirmed via grep, no code referenced
      them), lexicon section added (Part VI), Team descriptions kept but reframed as Tribes (Part IV),
      color schemes documented for all 8 Teams + 9 Characters.
- [x] `index.html` lore screen (`#lore-screen`) updated in place to add "The 9 Characters" section and
      reframe "The 8 Factions" as "The 8 Tribes" — this screen is hand-authored HTML, not loaded from
      world.txt, so it needed its own edit.

## Stage 4 — Data Implementation (cards + characters registry) ✅
- [x] 17 new keywords added to `KEYWORDS`/`KEYWORD_DESCRIPTIONS` in `js/cards.js` (verified: 47 total
      keywords now in `KEYWORDS`, up from 30).
- [x] 72 signature cards (8 per Character × 9) added to `js/cards.js` with `character` field — verified
      via `node -e` script: 268 total cards, 8 per Character, zero duplicate ids, `node --check` passes.
- [x] `js/characters.js` created: `CHARACTERS` registry (axes, color, icon, tagline, tribe,
      signatureCardIds, starterDeckIds) for all 9, plus `getStarterDeck()` and
      `isCardLegalForCharacter()` helpers.
- [x] All 9 starter decks (40 cards each) generated programmatically and verified valid against the
      real `validateDeck()` rules (not hand-counted) — Schemist needed a manual copy-count override
      (its 2 signature Traps + 1 Conspiracy alone nearly hit the global 5-card trap+conspiracy cap).
- [x] `validateDeck(deck, characterId)` extended with an optional Character-lock check — verified: own
      Character passes, wrong Character fails, omitted argument stays backward-compatible.
- [x] Found and fixed a second, deeper code/doc mismatch while wiring this up: `js/game.js` `startBattle`
      dealt a free opening hand of 3 cards from `player.deck`/`enemy.deck` — removed so turn 1 genuinely
      starts at 0 cards in hand, per the user's explicit goal text. In the process discovered `player.deck`
      is *not* actually unused after that fix — it backs a legitimate secondary subsystem (explicit "Draw"
      card effects, and the Exodus win condition's fatigue timer) that is independent of the Bank/Metadeck
      economy. Corrected `GAME_RULES.md` §2.3 to describe this accurately instead of overclaiming "0 cards
      in personal deck," which was never literally true and isn't fixable without breaking existing cards.

## Stage 5 — UI Wiring ✅
- [x] Character Select screen (`#character-select-screen`) added to `index.html` before the Deck Builder —
      9-card grid, per-Character color/icon/tagline/5-axis dot readout, click → `ui.selectCharacter(id)`.
      Title screen's "Build Deck" now routes here first instead of straight to the Deck Builder.
- [x] `ui.selectCharacter`/`selectCharacterSilently` load the Character's `getStarterDeck()` into
      `ui.deck` and stamp `ui.selectedCharacter`; Deck Builder's `renderCardCollection()` now filters
      to Colorless + the chosen Character via `isCardLegalForCharacter()` — illegal cards are hidden,
      not disabled, matching `docs/CARDS.md` §6.4. Same guard added to `handleCardClick` and the
      separate `quickAddCard` path (found both existed and both needed it).
- [x] Character badge/color shown: Deck Builder header (`#db-character-badge`) and both battle-HUD
      commander bars (`#player-character-badge` / `#enemy-character-badge`, populated in `renderBattle`).
      `launchBattle()` now stamps `game.player.character` / `game.enemy.character` (enemy gets a random
      Character via `getEnemyCharacter()` so the AI's badge/colors aren't blank). `quickBattle()` now
      auto-picks a random Character on a fresh deck instead of dropping straight to a Colorless preset,
      so the Character layer isn't bypassable by the fast-start path.
      New `css/characters.css` added and linked for the select grid + badge styling.
- [x] Verified this pass is additive, not duplicative, against the substantial concurrent/prior progress
      discovered on Stages 6–12 below: grepped for duplicate element ids, duplicate function definitions,
      and duplicate `character-select-screen` divs across `index.html` — all clean, single occurrences.

## Note on Stages 6–12
Mid-session, `docs/REDESIGN_PROGRESS.md`, `js/game.js`, `js/vfx.js`, and several CSS files were found
already updated on disk with substantially more progress than this pass's own visible history accounted
for (battle log overhaul, all 17 Character keyword engine methods wired into `GameEngine`, a responsive
layout pass, a new VFX particle/trail/shader engine, 3D card texture effects). Spot-verified rather than
trusted blindly: `grep`-confirmed `applyReplicate`/`applyTransmute`/`applySacrament`/etc. exist and are
called from `playCard`/`attack`/`startTurn`/`endBankPhase`/`destroyCard`; confirmed `checkDominationWin()`
is called from `endTurn`; confirmed `updateBattleFeed()` exists and is wired to the `log` event; confirmed
`js/vfx.js` is real particle-system code and is `<script>`-included; confirmed `clamp()` is used 31× in
`css/battle-v12.css`. All of `js/*.js` still passes `node --check`. Treating this as genuine continuation
of the same effort (this is exactly what this checkpoint file is for) rather than external/conflicting
work — no evidence of duplication or breakage found. Detail on those stages is in the sections below as
they were found, since this pass did not author them and shouldn't rewrite their record.

## Stage 6 — Battle Log (Starcraft 2 style) ✅
- [x] `recordEvent` calls expanded from 5→14 types: turnStart, buy, play, attack, damage, spellEffect,
      combo, dangerEvent, bankEnd, structureDamage, structureDestroyed, trapTrigger, teamSynergy, gameEnd
- [x] `updateBattleFeed()` now renders categorized entries with event-type icons (🛒 ▶️ ⚔️ 💥 ✨ 🌌 🏗️ 💣 🔗),
      mm:ss timestamps from battle start, turn numbers, player-colored entries
- [x] Modal battle log (`updateBattleLog()`) has filter bar (All/Buy/Play/Attack/Danger/Result),
      color-coded entries, 80-entry scrollback, filter buttons with active state

## Stage 7 — UI Clarity Pass ✅
- [x] Zone labeling verified real, not just claimed: "ENEMY BASE"/"YOUR BASE" strip labels, "⚡ BANK
      PHASE" header, "Your Hand" label, "— Battlefield —" divider, per-pile GY/Trap chips all present
      in `index.html`'s battle screen already.
- [x] Character color accents: badges (Stage 5) plus, added this pass, a Character-color radial tint on
      each side's `.avatar-glow` in `renderBattle()` — the HUD frame itself now carries the color, not
      just a text badge next to it.

## Stage 8 — Animation Refinement ✅
- [x] Verified real: `css/cards.css` scales attack/destroy/play animation duration and intensity by
      rarity (e.g. attack lunge 0.45s epic → 0.55s legendary → 0.65s mythic, with escalating
      brightness/saturation filters) — matches the "timing tied to meaning" principle in
      `GAME_RULES.md` §11 exactly.

## Stage 9 — v4.0 Battle System Overhaul (NEW)
- [x] `attackStructure()` bug fix: added `attacksLeft` guard + decrement, Stealth break (duplicated from `attack()`)
- [x] `endTurn()` now calls `checkWinCondition()` + `checkDominationWin()` before passing turn
- [x] All 17 Character Keywords engine methods implemented in `GameEngine`:
  - Precision (Synthetic), Replicate (Memetic), Infect (Memetic), Transmute (Refinist), Refine (Refinist)
  - Sacrament (Technopriest), Devotion (Technopriest), Overclock (Cyborg), Adrenaline (Cyborg)
  - Bloom (Biopure), Symbiosis (Biopure), Drift (Ethereal), Manifest (Ethereal)
  - Deploy (Organizer), Network (Organizer), Snare (Schemist), Gambit (Schemist)
- [x] Character keywords wired into game flow: `playCard` (Replicate, Deploy, Sacrament, Devotion, Drift,
      Manifest, Symbiosis, Network, Overclock), `startTurn` (Bloom), `endBankPhase` (Refine),
      `attack` (Precision, Overclock, Adrenaline), `onPlayEffect` (Infect), `destroyCard` (Infect spread, Gambit)
- [x] Overclock setup added to `playCard()` — creatures with Overclock get `attacksPerTurn: 2`

## Stage 10 — Responsive Layout & Touch (NEW)
- [x] All fixed pixel values replaced with `clamp()` / viewport-relative units
- [x] Media queries for small screens (<600px), touch devices (hover:none), large screens (>1400px)
- [x] Touch-optimized tap targets (44px+ min-height), no hover lift, disable tooltips on touch
- [x] Base slot sizes, feed width, intent bar position all responsive

## Stage 11 — Visual Effects Engine (NEW)
- [x] `js/vfx.js` created: particle system, attack trails, spell projectiles, screen flash/shake, card entrance animation, keyword glow
- [x] VFX engine wired into battle events: `attack` → trail + impact particles, `damage` → damage float + particles,
      `playCard` → card fly-in + particles, `synergyEffect` → burst particles, `abilityTrigger` → keyword glow
- [x] WebGL shader canvas continued support

## Stage 12 — Shader & Texture Upgrades (NEW)
- [x] 3D card perspective transforms (hover lift, hand spread, selected lift)
- [x] Diffuse / normal map simulation via multi-layer CSS gradients
- [x] Metalness highlight via `card-shimmer` animated gradient
- [x] Roughness simulation via card-frame inset shadows
- [x] Ambient occlusion via edge radial gradient
- [x] Bump map simulation via card-header box-shadow
- [x] Rarity-based border thickness and glow shadows
- [x] Character-colored keyword frame effects (16 character keyword VFX classes)
- [x] Keyword combat floating text with per-character colors

## Stage 13 — Critical Bug: Menu Navigation Dead (fixed) ✅
User report: every title-screen button animated on click but never navigated, except Settings.
Root cause: the whole inline `<script>` block in `index.html` (~145K chars, never once syntax-checked
as a unit — only the external `js/*.js` files were `node --check`ed during Stages 1–12) had **three**
separate stray-brace/quote-escaping errors from earlier edits, any one of which is a hard `SyntaxError`
that prevents the *entire* script from parsing — meaning `const ui = {...}` never gets defined at all,
so every `onclick="ui.xxx()"` handler throws silently. CSS `:hover`/`:active` still animate because
those are pure CSS and don't depend on JS executing.
- [x] `filterCards()` was missing its closing `},` — the `toast()` method got swallowed into its body
      instead of being a sibling method. Closed it properly and un-nested `toast()`.
- [x] A stray orphan `},` after `_forfeitConfirmed()` (leftover from a removed "legacy confirm fallback"
      comment) closed the entire `ui` object early, stranding `quickBattle()` and everything after it
      outside any object literal. Removed the stray brace.
- [x] `confirmModal()` built its Cancel/Confirm buttons via an `innerHTML` string with inline `onclick`
      attributes containing a nested, incorrectly-escaped single-quoted CSS selector AND a function
      re-embedded as source text (`'var f=' + callback + ';...'`) — both fragile by construction, and
      the escaping was simply wrong (`this.closest('[style*=\'z-index:9998\']')` had two of its four
      single quotes unescaped, terminating the outer JS string early). Rewrote it with real DOM APIs
      (`createElement`/`addEventListener`) instead of string-built HTML with embedded handlers — no
      quote-nesting possible, and the only caller (`forfeitBattle()`) still works via the same signature.
- [x] The 6-button battle-log filter bar (`updateBattleLog()`) had the identical unescaped-inner-quote
      bug across all 6 buttons (`onclick="ui._logFilter='all';..."` inside a single-quoted JS string).
      Fixed by escaping the inner quotes (`\'`) so they're literal characters in the output HTML instead
      of terminating the outer string.
- [x] Verified fix: extracted the inline `<script>` block and ran `node --check` on it directly — this
      is the check that should have been run after every edit to this block and wasn't; now clean.
      Also re-verified every `ui.showScreen('X')` target used by a title-screen button has a matching
      `id="X-screen"` element (all 10 do) — the navigation logic itself was never broken, only unreachable.

## Stage 14 — "Fluid Metal" Menu & Button Redesign ✅
User: buttons/menu need clearer styles, better shadows, patterns, background animation with a fluid
metal transition; the Settings gear icon was the one thing already reading as clear/well-built, so it's
the quality bar. Some submenu pages also called out for restructuring.
- [x] New `css/menu-redesign.css` (loaded last, wins cascade), linked in `index.html`.
- [x] `.menu-button` (used by title screen, result screen, deck-builder sidebar — 19 usages) rebuilt as
      a brushed-metal panel: layered background (diagonal brush-line pattern + faint accent-colored dot
      pattern + vertical steel gradient), layered `box-shadow` (inset top highlight, inset bottom shadow
      for bevel depth, outer drop shadow, accent glow on hover), and an ambient "fluid metal" sheen — a
      diagonal light band drifting across the panel on a slow 6s loop at rest, speeding up to 1.6s and
      brightening on hover. Kept the existing cyan/gold accent-variant system (`--btn-accent`) so
      `.primary-btn` etc. still work unchanged.
      Fixed a stacking-order issue in the same pass: the sheen pseudo-element needs `z-index:-1` (not a
      positive value) inside an `isolation:isolate` button, or it paints over the button's own text —
      caught before shipping, not after.
- [x] `.title-bg-fluidmetal` layer added to the title screen background stack: a slow (22s), looping,
      drifting radial/linear gradient blend in cool metallic tones, sitting under the existing
      grid/scanline/vignette/star layers. Respects `prefers-reduced-motion`.
- [x] Friends screen (`#friends-screen`) restructured off inline styles onto semantic classes
      (`.friends-layout`, `.friends-panel`, `.friends-panel-title`, `.friends-add-row`, etc.), matching
      the card/section pattern the Settings screen already used well — this was the clearest offender
      (every element inline-styled, cramped two-column layout with no visual separation between panels).
      Deliberately did *not* introduce new classes for the chat input/send button — `.chat-input input` /
      `.chat-input button` already existed in `main.css` and covered it; the original inline styles on
      those two elements were pure duplication, not a real styling gap.
      Achievements/Leaderboard/Quests screens checked too: their wrapper shells have a little inline
      layout CSS but are not in the same rough state as Friends was (their actual content is
      JS-rendered, not hand-authored markup) — left alone rather than restructuring things that weren't
      actually broken.
- [x] Final integrity sweep: `node --check` on every `js/*.js` file and on the extracted inline
      `<script>` block, zero duplicate element ids across `index.html`, CSS brace-balance check on both
      new stylesheets — all clean.

---
*Resuming a partial run: check the boxes above, then continue from the first unchecked stage. Do not
mark a box checked until the file change is made AND spot-verified (grep/read-back), not just planned.*
