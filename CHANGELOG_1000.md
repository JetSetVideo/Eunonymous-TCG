# SYNTHOPWARS — 1000 CHANGES MANIFEST
## Player Journey Critique & Exhaustive Improvement Plan

Each change: WHERE (file/section) · WHEN (phase of play) · HOW (implementation) · WHY (problem) · WHAT FOR (outcome)

---
## SECTION A: TITLE SCREEN (Changes 1–60)
1. index.html: Add animated particle background canvas behind title — WHEN: title load — HOW: CSS keyframes + canvas particles — WHY: static bg is lifeless — WHAT FOR: AAA first impression
2. css/main.css: Add synthwave grid-floor CSS animation on title — WHEN: title visible — HOW: perspective transform + keyframe scroll — WHY: no depth — WHAT FOR: retro-futuristic atmosphere
3. index.html: Title logo gets glow pulse + chromatic aberration — WHEN: title shown — HOW: text-shadow animation + filter hue — WHY: flat text — WHAT FOR: premium brand feel
4. css/main.css: Menu buttons get hover sound + ripple effect — WHEN: hover — HOW: CSS ::after ripple + JS audio — WHY: no feedback — WHAT FOR: tactile response
5. index.html: Player quick-info shows animated rank badge — WHEN: title load — HOW: CSS badge with shimmer — WHY: plain text — WHAT FOR: status display
6. css/main.css: Version tag gets typing animation — WHEN: title load — HOW: CSS steps animation — WHY: static — WHAT FOR: polish
7. index.html: Add "Daily Login" reward popup on title — WHEN: first visit per day — HOW: localStorage timestamp + modal — WHY: no retention mechanic — WHAT FOR: player engagement
8. css/main.css: Title screen vignette overlay — WHEN: always — HOW: radial gradient pseudo-element — WHY: flat edges — WHAT FOR: cinematic framing
9. index.html: Settings gear icon gets rotation animation on hover — WHEN: hover — HOW: CSS transform rotate — WHY: static — WHAT FOR: interactivity
10. css/main.css: Add scan-line CRT overlay on title — WHEN: title — HOW: repeating-linear-gradient animation — WHY: no retro texture — WHAT FOR: synthwave aesthetic
11–20: Title buttons each get unique icon animations (Attack swords clash, Battle lightning crack, World globe spin, Friends pulse, Trophies shine, Leaderboard bars rise, Quests scroll, Help question mark bounce)
21–30: Title background gets 6-layer parallax (stars, grid, fog, neon glow, particles, vignette)
31–40: Menu button states (hover, active, pressed, disabled, loading) with distinct animations
41–50: Title screen transition animations (fade, slide, scale per target screen)
51–60: Accessibility — focus rings, aria labels, keyboard nav, reduced-motion fallback, screen-reader hints

## SECTION B: DECK BUILDER — UI (Changes 61–180)
61. index.html: Deck builder sidebar gets scroll bar styling — WHEN: many decks — HOW: custom webkit-scrollbar — WHY: ugly default — WHAT FOR: polish
62. css/cards.css: Card collection grid gets staggered fade-in — WHEN: collection renders — HOW: animation-delay per nth-child — WHY: pop-in jarring — WHAT FOR: smooth load
63. index.html: Filter dropdowns get custom arrow icons — WHEN: always — HOW: CSS background-image SVG — WHY: default ugly — WHAT FOR: design consistency
64. css/main.css: Cost filter slider gets custom track + thumb — HOW: ::-webkit-slider-thumb styling — WHY: default gray — WHAT FOR: visual quality
65. index.html: Add real-time deck validation sidebar indicator — WHEN: deck changes — HOW: green check / red warning with message — WHY: no inline validation — WHAT FOR: data integrity
66. css/main.css: Deck stats grid gets animated counters — WHEN: stat changes — HOW: JS count-up animation — WHY: instant number swap — WHAT FOR: smooth feedback
67. index.html: Card collection gets "sort by" dropdown (cost, name, rarity, team, type) — WHEN: browsing — HOW: JS sort function — WHY: no sort — WHAT FOR: usability
68. css/cards.css: Selected card in collection gets selection ring + checkmark — WHEN: clicked — HOW: CSS class toggle — WHY: no visual of what's in deck — WHAT FOR: clarity
69. index.html: Add card count badges on collection cards showing copies in deck — WHEN: card in deck — HOW: badge overlay element — WHY: can't see count — WHAT FOR: deck building clarity
70. css/main.css: Deck summary gets mana curve bar chart — WHEN: deck changes — HOW: CSS bars per cost — WHY: no curve visualization — WHAT FOR: deck analysis
71. index.html: Preset deck items get preview tooltip on hover — WHEN: hover — HOW: tooltip with deck archetype info — WHY: no preview — WHAT FOR: informed choice
72. css/main.css: Saved deck items show team composition icons — WHEN: deck list renders — HOW: team icon row — WHY: no team info — WHAT FOR: deck identity
73. index.html: Add "deck export/import" UI with QR code option — WHEN: export clicked — HOW: canvas QR generation — WHY: text codes unwieldy — WHAT FOR: sharing
74. css/cards.css: Deck builder background gets subtle animated grid — WHEN: always — HOW: CSS animation — WHY: flat bg — WHAT FOR: atmosphere
75. index.html: Add search bar for card name text search — WHEN: browsing — HOW: input + filter — WHY: no text search — WHAT FOR: usability
76–85: Card collection gets lazy-loading (intersection observer) for performance with 100+ cards
86–95: Deck summary gets type distribution pie chart (CSS conic-gradient)
96–105: Filter system gets "multi-select" for teams and types (checkbox chips)
106–115: Card hover gets full-size preview flyout (like Hearthstone)
116–125: Deck builder gets "undo/redo" history stack
126–135: Saved deck gets drag-to-reorder
136–145: Card collection gets "compare mode" showing 2 cards side by side
146–155: Deck stats get tooltip explanations (what each metric means)
156–165: Deck builder gets "suggested cards" based on current composition
166–175: Background gets team-colored gradient when filtering by team
176–180: Deck builder gets keyboard shortcuts (Ctrl+S save, Ctrl+Z undo, / search)

## SECTION C: CARD DESIGN — FRAMES & TEXTURES (Changes 181–320)
181. css/cards.css: Each card type gets unique frame border style — Creature: angular, Spell: rounded, Trap: jagged, Structure: thick, Role: ornate — WHY: all same border — WHAT FOR: instant type recognition
182. css/cards.css: Card frame gets layered multi-border (outer glow, inner border, team color stripe) — HOW: box-shadow + border + ::before — WHY: single border flat — WHAT FOR: depth
183. css/cards.css: Creature cards get attack-themed frame (red gradient border with sword motif) — HOW: gradient border + corner ornaments — WHY: generic frame — WHAT FOR: type identity
184. css/cards.css: Spell cards get arcane-themed frame (blue gradient with energy swirl) — HOW: animated gradient — WHY: generic — WHAT FOR: type identity
185. css/cards.css: Trap cards get danger-themed frame (orange jagged with warning stripes) — HOW: clip-path jagged + stripes — WHY: generic — WHAT FOR: type identity
186. css/cards.css: Structure cards get fortified frame (green thick with rivet dots) — HOW: border + radial-gradient rivets — WHY: generic — WHAT FOR: type identity
187. css/cards.css: Role cards get ornate frame (purple with crown filigree) — HOW: SVG border or pseudo-elements — WHY: generic — WHAT FOR: type identity
188. css/cards.css: Team color integrated into frame as gradient stripe at top — HOW: linear-gradient bar — WHY: team only in bg — WHAT FOR: team identity
189. css/cards.css: Rarity gets distinct corner gem (common=gray dot, uncommon=green, rare=blue, epic=purple, legendary=gold, mythic=rainbow) — HOW: pseudo-element with radial-gradient — WHY: stars only — WHAT FOR: rarity at glance
190. css/cards.css: Card art area gets per-team texture overlay — Overchargers: electric sparks, Fortress: hexagonal plates, Control: circuit traces, Synergy: DNA helix, Economy: gold filigree, Chaos: glitch noise, Synth Legends: ancient runes, Titanborn: cracked stone — HOW: CSS background patterns — WHY: blank art bg — WHAT FOR: visual richness
191. css/cards.css: Card art gets inner shadow for depth — HOW: inset box-shadow — WHY: flat art — WHAT FOR: 3D feel
192. css/cards.css: Card gets subtle 3D tilt on hover (perspective transform) — HOW: transform-style preserve-3d — WHY: flat hover — WHAT FOR: premium feel
193. css/cards.css: Legendary cards get animated golden frame border (rotating gradient) — HOW: conic-gradient animation — WHY: static gold — WHAT FOR: prestige
194. css/cards.css: Mythic cards get full holographic treatment (rainbow shift + particle overlay) — HOW: hue-rotate + canvas particles — WHY: only border — WHAT FOR: ultimate rarity
195. css/cards.css: Card name gets text shadow matching team color — HOW: text-shadow — WHY: plain — WHAT FOR: readability + style
196. css/cards.css: Ability text gets keyword color-coding (Surge=red, Invoke=gold, etc.) — HOW: per-keyword CSS — WHY: all white — WHAT FOR: gameplay clarity
197. css/cards.css: Card gets bottom team emblem watermark — HOW: ::after with team icon, low opacity — WHY: no team mark — WHAT FOR: identity
198. css/cards.css: Card art icon gets team-colored glow — HOW: drop-shadow with team color — WHY: flat icon — WHAT FOR: visual pop
199. css/cards.css: Card stats (ATK/DEF/Power/Production) get distinct icons per stat — HOW: SVG or emoji per stat — WHY: tiny text — WHAT FOR: readability
200. css/cards.css: Card in hand gets curved fan layout in battle — HOW: transform rotate per index — WHY: flat row — WHAT FOR: Hearthstone feel
201–210: Each team gets 3 background texture variations (normal, premium for rare+, animated for legendary+)
211–220: Card frames get 3 tiers (base, upgraded for rare+, premium for legendary+) with progressively more ornate borders
221–230: Ability text area gets parchment/terminal texture per card type
231–240: ATK/DEF badges get 3D beveled style with inset shadows and highlights
241–250: Mana cost coin gets spin animation on hover and glow pulse when affordable
251–260: Card type badge gets icon prefix (Creature=sword, Spell=star, Trap=skull, Structure=wall, Role=crown)
261–270: Card gets subtle "breathing" idle animation (scale 1.0 ↔ 1.01) in battle
271–280: Card gets "exhausted" visual state after attacking (grayscale + dim)
281–290: Card gets "can attack" glow indicator (green ring) when ready to attack in battle
291–300: Card gets "buffed" visual state (golden aura) when stats are increased
301–310: Card gets "debuffed" visual state (red aura) when stats are decreased
311–320: Card back gets team-colored variant + animated pattern

## SECTION D: CARDS — NEW CARDS & KEYWORDS (Changes 321–500)
321. js/cards.js: Add 10 new "Action" card type (instant effects, no board presence) — WHY: no action type yet — WHAT FOR: strategic variety
322. js/cards.js: Add 10 new "Gear" card type (equippable items that modify creatures) — WHY: no gear — WHAT FOR: RPG depth
323. js/cards.js: Add 10 new "Conspiracy" card type (hidden cards that activate on conditions) — WHY: no conspiracy — WHAT FOR: bluffing layer
324. js/cards.js: Add 5 new keywords: WARD, PIERCE, LIFESTEAL, BARRAGE, FORTIFY — WHY: limited keywords — WHAT FOR: deeper combat
325. js/cards.js: Add 5 more keywords: SHIELD, REFLECT, STEALTH, SILENCE, ENRAGE — WHY: combat shallow — WHAT FOR: tactical options
326. js/cards.js: Add 5 more keywords: POISON, REGENERATE, THORNS, IMMORTAL, CATALYST — WHY: need status — WHAT FOR: status effects
327. js/cards.js: Add keyword WARD: "Absorbs the next instance of damage or removal" — HOW: shield buff consumed on hit — WHAT FOR: protection
328. js/cards.js: Add keyword PIERCE: "Damage ignores DEF entirely" — HOW: skip DEF in damage calc — WHAT FOR: anti-tank
329. js/cards.js: Add keyword LIFESTEAL: "Heal your Base for damage dealt" — HOW: heal = damage dealt — WHAT FOR: sustain
330. js/cards.js: Add keyword BARRAGE: "Attacks all enemy creatures simultaneously" — HOW: loop attack function — WHAT FOR: board clear
331. js/cards.js: Add keyword FORTIFY: "If this survives combat, gain +1/+1 permanently" — HOW: post-combat check — WHAT FOR: slow growth
332. js/cards.js: Add keyword SHIELD: "Reduces next attack's damage by half (rounded down)" — HOW: damage floor calc — WHAT FOR: defense
333. js/cards.js: Add keyword REFLECT: "Returns 50% of damage back to attacker" — HOW: post-damage handler — WHAT FOR: anti-aggro
334. js/cards.js: Add keyword STEALTH: "Cannot be targeted until it attacks" — HOW: untargetable flag — WHAT FOR: positioning
335. js/cards.js: Add keyword SILENCE: "Removes all abilities from target" — HOW: clear ability string — WHAT FOR: utility
336. js/cards.js: Add keyword ENRAGE: "Gains +2 ATK when below 50% HP" — HOW: HP threshold check — WHAT FOR: comeback
337. js/cards.js: Add keyword POISON: "Target takes 1 damage at end of each turn" — HOW: endTurn poison stack — WHAT FOR: attrition
338. js/cards.js: Add keyword REGENERATE: "Heals 1 HP at start of turn" — HOW: startTurn check — WHAT FOR: sustain
339. js/cards.js: Add keyword THORNS: "Deals 1 damage to attacker when attacked" — HOW: on-attack handler — WHAT FOR: anti-aggro
340. js/cards.js: Add keyword IMMORTAL: "Survives lethal damage at 1 HP once" — HOW: floor HP at 1 — WHAT FOR: resilience
341. js/cards.js: Add keyword CATALYST: "Gains bonus when paired with a specific team card" — HOW: team check on field — WHAT FOR: synergy depth
342. js/cards.js: Add card "Plasma Rifle" (Gear, Overchargers, +2 ATK, Rarity: Uncommon) — HOW: equip to creature — WHAT FOR: aggro tool
343. js/cards.js: Add card "Force Field Generator" (Gear, Fortress, +3 DEF, Rarity: Rare) — HOW: equip — WHAT FOR: defense
344. js/cards.js: Add card "Data Spike" (Action, Control, cost 2: Silence target creature, draw 1) — HOW: instant effect — WHAT FOR: control
345. js/cards.js: Add card "Smokescreen" (Conspiracy, Synergy: Hidden. Reveal when enemy attacks: redirect to your strongest creature) — WHAT FOR: defense trick
346. js/cards.js: Add card "Overclock Module" (Gear, Overchargers, +1 ATK + Pierce, Rarity: Epic) — WHAT FOR: aggro finisher
347. js/cards.js: Add card "Magnetic Shield" (Gear, Fortress, +2 DEF + Ward, Rarity: Epic) — WHAT FOR: protection
348. js/cards.js: Add card "False Flag" (Conspiracy, Control: Hidden. Reveal when enemy plays a creature: take control of it) — WHAT FOR: control finisher
349. js/cards.js: Add card "Riot Shield" (Gear, Fortress, +1 DEF + Thorns, Rarity: Uncommon) — WHAT FOR: anti-aggro
350. js/cards.js: Add card "Nano Injector" (Gear, Chaos, +3 ATK -1 DEF + Enrage, Rarity: Rare) — WHAT FOR: risk/reward
351. js/cards.js: Add card "Holo Decoy" (Conspiracy, Economy: Hidden. Reveal when enemy attacks base: Negate the attack, draw 1) — WHAT FOR: economy defense
352. js/cards.js: Add card "EMP Blast" (Action, Control, cost 3: Silence all enemy creatures, deal 1 damage to each) — WHAT FOR: board clear
353. js/cards.js: Add card "Reinforced Plating" (Gear, Fortress, Structure: +3 HP, Rarity: Uncommon) — WHAT FOR: structure buff
354. js/cards.js: Add card "Adrenaline Shot" (Action, Overchargers, cost 1: Give target creature +3 ATK and Charge) — WHAT FOR: aggro burst
355. js/cards.js: Add card "Sacrificial Pact" (Action, Synth Legends, cost 1: Destroy your creature, draw 2 cards and gain 3 power) — WHAT FOR: card advantage
356. js/cards.js: Add card "Dark Ritual" (Action, Chaos, cost 0: Lose 3 Base HP, gain 5 Power) — WHAT FOR: risk/reward
357. js/cards.js: Add card "Mind Link" (Action, Synergy, cost 3: All your Link creatures gain Ward) — WHAT FOR: protection
358. js/cards.js: Add card "Gold Rush" (Action, Economy, cost 1: Gain 2 Power for each Structure you control) — WHAT FOR: economy spike
359. js/cards.js: Add card "Tremor" (Action, Titanborn, cost 2: Destroy all enemy Structures with HP < 4) — WHAT FOR: anti-structure
360. js/cards.js: Add card "Shadow Network" (Conspiracy, Control: Hidden. Reveal at start of your turn: Look at enemy hand) — WHAT FOR: information
361. js/cards.js: Add card "Flash Bang" (Action, Control, cost 2: Enemy creatures lose Charge and can't attack next turn) — WHAT FOR: tempo
362. js/cards.js: Add card "Blood Offering" (Action, Chaos, cost 0: Destroy your weakest creature, deal its ATK as damage to enemy base) — WHAT FOR: finisher
363. js/cards.js: Add card "Gravity Well" (Action, Control, cost 4: Return all creatures with cost < 3 to their owners' hands) — WHAT FOR: tempo
364. js/cards.js: Add card "Time Dilation" (Action, Control, cost 5: Enemy skips their next Bank Phase) — WHAT FOR: disruption
365. js/cards.js: Add card "Weapon Cache" (Gear, Economy: Draw 1 card when equipped creature attacks) — WHAT FOR: card draw
366. js/cards.js: Add card "Vampiric Blade" (Gear, Chaos, Lifesteal, Rarity: Rare) — WHAT FOR: sustain
367. js/cards.js: Add card "Berserker Axe" (Gear, Overchargers, +4 ATK -2 DEF + Enrage, Rarity: Legendary) — WHAT FOR: aggro capstone
368. js/cards.js: Add card "Aegis Shield" (Gear, Fortress, Ward + Reflect, Rarity: Legendary) — WHAT FOR: ultimate defense
369. js/cards.js: Add card "Titan Mail" (Gear, Titanborn, +2 DEF + Immortal, Rarity: Legendary) — WHAT FOR: unkillable
370. js/cards.js: Add card "Echo Orb" (Gear, Synergy, Echo: Copy first spell cast when equipped creature attacks, Rarity: Epic) — WHAT FOR: combo
371. js/cards.js: Add keyword descriptions for all 15 new keywords in KEYWORD_DESCRIPTIONS — WHAT FOR: tooltip clarity
372. js/cards.js: Update KEYWORDS constant with 15 new entries — WHAT FOR: system registration
373. js/cards.js: Add COPY_LIMITS for new card types (Action: 3, Gear: 3, Conspiracy: 3) — WHAT FOR: deck building
374. js/cards.js: Update validateDeck to handle new types — WHAT FOR: data integrity
375. js/cards.js: Add 8 new Overcharger cards (2 creatures, 1 spell, 1 trap, 1 structure, 1 gear, 1 action, 1 conspiracy) — WHAT FOR: team expansion
376–390: Add 8 new cards each for Fortress, Control, Synergy, Economy, Chaos, Synth Legends, Titanborn (2 each per team × 7 = 14 cards)
391–400: Add 10 new neutral cards (mix of new types)
401–410: Update PRESET_ARCHETYPES with new cards
411–420: Add 5 new Mythic cards (one per faction era)
421–430: Add keyword integration helpers (isKeywordCard, getCardKeywords)
431–440: Add CARD_TYPES constants for ACTION, GEAR, CONSPIRACY
441–450: Add team-specific gear art keywords
451–460: Add card descriptions for all 30 new cards (lore + flavor)
461–470: Add combo IDs for new card families (action: 'tactic', gear: 'armed', conspiracy: 'secret')
471–480: Add combo check logic for new families
481–490: Add icon assignment for all new cards
491–500: Add rarity balance review (ensure each rarity tier has 8+ cards)

## SECTION E: BATTLE RULES & EQUATIONS (Changes 501–680)
501. js/game.js: Damage formula documented: damage = max(1, ATK - DEF - reduction) — add comment — WHAT FOR: clarity
502. js/game.js: Add pierce damage: if attacker has Pierce, damage = ATK (ignore DEF) — HOW: check attacker keyword — WHAT FOR: anti-tank
503. js/game.js: Add lifesteal: if attacker has Lifesteal, heal attacker's base for damage dealt — HOW: post-damage — WHAT FOR: sustain
504. js/game.js: Add ward: if target has Ward, consume ward and negate all damage — HOW: check and remove ward — WHAT FOR: protection
505. js/game.js: Add reflect: if target has Reflect, return 50% damage to attacker — HOW: post-damage calc — WHAT FOR: anti-aggro
506. js/game.js: Add thorns: if target has Thorns, deal 1 to attacker — HOW: on-hit — WHAT FOR: anti-aggro
507. js/game.js: Add poison stacks: at endTurn, poisoned creatures take 1 per stack — HOW: status array — WHAT FOR: attrition
508. js/game.js: Add silence: target.ability = '' (or silenced flag) — HOW: modify ability — WHAT FOR: utility
509. js/game.js: Add enrage: if HP < 50%, +2 ATK — HOW: check in attack — WHAT FOR: comeback
510. js/game.js: Add fortify: if survives combat, +1/+1 — HOW: post-combat check — WHAT FOR: growth
511. js/game.js: Add barrage: attack all enemy creatures at once — HOW: loop — WHAT FOR: board clear
512. js/game.js: Add stealth: untargetable until attacks — HOW: flag check in attack — WHAT FOR: positioning
513. js/game.js: Add immortal: survive at 1 HP once — HOW: floor — WHAT FOR: resilience
514. js/game.js: Structure HP: structures now take damage and can be destroyed — HOW: currentHp on structures — WHAT FOR: structure defense
515. js/game.js: Structure defense: structures reduce incoming base damage by their DEF — HOW: def calc — WHAT FOR: meaningful structures
516. js/game.js: Attack base: if structures present, they intercept — HOW: redirect to structures first — WHAT FOR: defense layer
517. js/game.js: Add "Overkill" rule: excess damage to creature spills to base — HOW: overflow calc — WHAT FOR: agro viability
518. js/game.js: Add "Cover" improvement: Cover works for any adjacent ally, not just one — HOW: proximity check — WHAT FOR: protection
519. js/game.js: Add "Taunt" improvement: must attack highest DEF taunt first — HOW: sort by DEF — WHAT FOR: tank value
520. js/game.js: Add "First Strike" rule: faster creature (Speed) attacks first, no counter — HOW: speed compare — WHAT FOR: speed matters
521. js/game.js: Speed comparison equation: if attacker.speed > target.speed, target doesn't counter — HOW: compare — WHAT FOR: stat depth
522. js/game.js: Range: creatures with range ≥ 2 can attack back row (structures) — HOW: target check — WHAT FOR: positioning
523. js/game.js: Counter-attack: only counters if target survives AND has Speed ≥ attacker — HOW: speed check — WHAT FOR: tactical
524. js/game.js: Add "Berserk" state: creatures that drop below 33% HP gain +3 ATK — HOW: HP threshold — WHAT FOR: comeback
525. js/game.js: Add "Healing Reduction" stacking: if poisoned, healing is halved — HOW: heal modifier — WHAT FOR: poison value
526. js/game.js: Add "Armor" stat: flat DR applied before DEF (separate from DEF) — HOW: armor value — WHAT FOR: tank depth
527. js/game.js: Add "Magic Damage" type: ignores armor but not DEF — HOW: damage type — WHAT FOR: variety
528. js/game.js: Add "True Damage": ignores both armor and DEF — HOW: type — WHAT FOR: rare utility
529. js/game.js: Combo win: 5 unique teams on field = instant alternate win — HOW: team count — WHAT FOR: joker build
530. js/game.js: Add "Fatigue" improvement: each fatigue turn, damage increases by +1 more — HOW: incremental — WHAT FOR: ending games
531. js/game.js: Add "Mana Burn": unused mana at end of phase dealt as 1 dmg per 2 mana to base — HOW: mana→damage — WHAT FOR: resource pressure
532. js/game.js: Add "Overload" mechanic: spending more power than available deals self-damage — HOW: check — WHAT FOR: resource risk
533. js/game.js: Add "Board Limit" enforcement: max 5 creatures, 5 structures, 3 traps — HOW: slot check — WHAT FOR: board clarity
534. js/game.js: Add battlefield rule for Dalian: traps trigger even without base attack — HOW: activation on play — WHAT FOR: trap value
535. js/game.js: Add battlefield rule for Mashhad: Speed affects cost (speed × 0.5 reduction) — HOW: cost modifier — WHAT FOR: speed value
536. js/game.js: Add battlefield rule for London: fog hides enemy hand count — HOW: visible=false — WHAT FOR: uncertainty
537. js/game.js: Add battlefield rule for Beijing: spells deal +1 damage — HOW: bonus — WHAT FOR: spell meta
538. js/game.js: Add battlefield rule for Lahore: healing doubled includes lifesteal — HOW: heal modifier — WHAT FOR: sustain meta
539. js/game.js: Add battlefield rule for Odessa: creatures bounce to hand at start (random 1) — HOW: random — WHAT FOR: chaos field
540. js/game.js: Add "Turn Timer" improvement: 15s bank phase, 30s main phase separate — HOW: split timers — WHAT FOR: pacing
541. js/game.js: Add "APM check": if player acts 0 actions for 3 turns, auto-lose — HOW: turn check — WHAT FOR: anti-stall
542. js/game.js: Add "Sudden Death": at turn 30, both bases take 2 dmg/turn — HOW: endgame — WHAT FOR: game ending
543. js/game.js: Structure destruction: when structure is destroyed, deal 1 damage to base — HOW: on destroy — WHAT FOR: structure risk
544. js/game.js: Add "Resonance Chain": 3+ same team creatures = aoe buff per turn — HOW: synergy — WHAT FOR: team decks
545. js/game.js: Add "Exhaustion": creatures that attacked can't defend next turn — HOW: exhausted flag — WHAT FOR: tactical choices
546–570: Add per-keyword animation triggers (Surge flash, Poison drip, Ward shield bubble, Lifesteal green swirl, etc.)
571–600: Add 30 new ability text parsing improvements (regex for new keywords, proper damage calc, conditional effects)
601–630: Add AI improvements (AI evaluates new keywords, equips gear optimally, considers conspiracy reveals, plays around enemy traps, values lifesteal/pierce based on matchup)
631–640: Add "Chain Damage" calculations (lightning jumps between targets with falloff)
641–650: Add "Splash Damage" equations (Detonate deals 50% of ATK to adjacent, not flat)
651–660: Add "Heal Cap" rules (can't heal above maxHp, overheal wasted)
661–670: Add "Damage Type" system (Physical, Magic, True, Poison — different interactions with armor/ward)
671–680: Add "Stack Resolution" rules (multiple buffs/debuffs resolve in order: ward>shield>armor>def>reflect>thorns)

## SECTION F: BATTLE SCREEN — VISUAL (Changes 681–800)
681. css/main.css: Battle arena gets animated background matching battleground biome — WHEN: battle — HOW: class-based bg — WHY: flat bg — WHAT FOR: immersion
682. css/main.css: Player/enemy bars get glassmorphism style — HOW: backdrop-filter blur — WHY: flat panels — WHAT FOR: modern UI
683. css/main.css: HP orb gets liquid fill animation — HOW: SVG wave animate — WHY: static number — WHAT FOR: visual health
684. css/main.css: Mana crystals get 3D gem appearance — HOW: CSS shapes + gradient — WHY: flat pips — WHAT FOR: premium resource display
685. css/main.css: Phase clock gets ticking animation — HOW: CSS rotation — WHY: static — WHAT FOR: urgency
686. css/main.css: Battle row gets slot indicators (numbered 1-5 with glow) — HOW: CSS pseudo-elements — WHY: no slot labels — WHAT FOR: positioning clarity
687. css/main.css: Card play gets trajectory animation (flies from hand to slot) — HOW: CSS keyframe path — WHY: pop-in — WHAT FOR: smooth transition
688. css/main.css: Attack gets projectile animation (slash/bolt from attacker to target) — HOW: CSS animation + particle — WHY: instant — WHAT FOR: visual feedback
689. css/main.css: Damage numbers get enhanced popups (color-coded, sized by damage, with element icons) — HOW: JS spawn + CSS animate — WHY: basic — WHAT FOR: readability
690. css/main.css: Card death gets shard/shatter effect — HOW: CSS fragment animation — WHY: just disappears — WHAT FOR: satisfying destruction
691. css/main.css: Turn timer gets pulsing red when < 5s — HOW: CSS animation — WHY: no warning — WHAT FOR: urgency
692. css/main.css: Graveyard icon gets stacked card visual — HOW: CSS layered cards — WHY: single icon — WHAT FOR: visual count
693. css/main.css: Trap display gets hidden/secret card back visual — HOW: card-back element — WHY: text count — WHAT FOR: mystery
694. css/main.css: Bank phase market cards get hover-to-zoom — HOW: CSS scale on hover — WHY: small cards — WHAT FOR: readability
695. css/main.css: Bank phase gets "purchase" animation (coin flies, card slides to hand) — HOW: CSS path — WHY: instant add — WHAT FOR: purchase feedback
696. css/main.css: Battle log gets color-coded entries (damage=red, heal=green, buff=gold, debuff=purple) — HOW: CSS classes — WHY: monochrome — WHAT FOR: readability
697. css/main.css: Combo popup gets full-screen flash effect — HOW: CSS overlay animation — WHY: small popup — WHAT FOR: excitement
698. css/main.css: Synergy activation gets team-colored wave effect — HOW: radial expand — WHY: text only — WHAT FOR: team pride
699. css/main.css: Victory screen gets confetti + rank-up animation — HOW: canvas particles — WHY: static — WHAT FOR: celebration
700. css/main.css: Defeat screen gets desaturate + slow zoom — HOW: CSS filter — WHY: instant — WHAT FOR: emotional impact
701–710: Card hand gets spring physics on hover (cards push neighbors)
711–720: Battle arena gets ambient light sources (team-colored glows at top and bottom)
721–730: Battle background gets animated particles matching biome (rain for Dalian, sand for Mashhad, fog for London, neon for Beijing, gold for Lahore, gravity for Odessa)
731–740: Card status effects get visible icons (poison=skull, frozen=snowflake, silenced=muzzle, warded=shield)
741–750: Structure cards on field get damage cracks when HP low
751–760: Mana bar gets overflow animation when gaining mana (fill up + sparkle)
761–770: Enemy turn gets "thinking" indicator with animated dots
771–780: Battle arena gets center divider with battleground name watermark
781–790: Card hover in battle gets targeting arrows (valid targets highlighted)
791–800: Battle gets "spectator view" option with wider camera pan

## SECTION G: SHOWDOWN / VS SCREEN (Changes 801–850)
801. css/main.css: VS screen gets split-screen animation (player slides left, enemy slides right) — HOW: CSS transform — WHY: instant — WHAT FOR: dramatic intro
802. css/main.css: VS text gets explosion + shake animation — HOW: keyframe — WHY: static — WHAT FOR: hype
803. css/main.css: Coin flip gets 3D rotation animation — HOW: transform rotateY — WHY: flat — WHAT FOR: decision reveal
804. css/main.css: Avatar canvases get ring glow matching team color — HOW: box-shadow — WHY: flat — WHAT FOR: identity
805. css/main.css: Deck visual gets card stack with count badge — HOW: CSS layered — WHY: single back — WHAT FOR: deck size display
806. css/main.css: "Searching opponent" gets animated dots + radar sweep — HOW: CSS animation — WHY: static text — WHAT FOR: match feel
807. css/main.css: Fight button gets charging glow effect — HOW: pulsing — WHY: static — WHAT FOR: call to action
808. css/main.css: Player rank gets tier-colored badge (Bronze→Mythic) — HOW: gradient — WHY: text — WHAT FOR: progression display
809–820: VS screen gets team-colored background based on player's deck majority team
821–830: Opponent reveal gets card-back-to-avatar flip animation
831–840: Battle transition gets wipe+flash effect
841–850: Showdown gets crowd/ambient cheer audio cue

## SECTION H: BATTLEGROUNDS (Changes 851–900)
851. js/game.js: Battleground card grid gets 3D tilt on hover — HOW: perspective — WHY: flat — WHAT FOR: premium feel
852. css/main.css: BG card gets biome preview animation (mini-scene) — HOW: CSS layered bg — WHY: gradient only — WHAT FOR: preview
853. css/main.css: Selected BG gets pulsing border + check badge — HOW: CSS — WHY: simple highlight — WHAT FOR: clear selection
854. css/main.css: BG effect text gets icon-prefixed condition descriptions — HOW: icon + text — WHY: plain text — WHAT FOR: readability
855. css/main.css: Difficulty gets color-coded badge (Easy=green, Medium=yellow, Hard=red, Extreme=purple) — HOW: CSS classes — WHY: text — WHAT FOR: at-a-glance difficulty
856–870: Each BG gets unique animated background (rain, sandstorm, fog, neon, golden, gravity, fire)
871–880: BG selection gets audio preview (ambient sound on hover)
881–890: BG rules get detailed explanation tooltip on hover
891–900: BG gets "recommended deck" hint based on biome rules

## SECTION I: LORE, SOCIAL, META (Changes 901–960)
901. css/main.css: Lore page gets parchment texture + animated page reveal — HOW: CSS — WHAT FOR: immersion
902. css/main.css: Lore city entries get hover-expand with map — WHAT FOR: world building
903–910: Friends list gets online/in-game/offline status with animated icons
911–920: Leaderboard gets rank movement arrows (up/down/steady)
921–930: Achievements gets progress bars + unlock animations
931–940: Quests gets daily/weekly tabs with countdown timers
941–950: Settings gets each section animated icons
951–960: Tutorial gets step-by-step interactive guide (highlight-click-next)

## SECTION J: AUDIO & POLISH (Changes 961–1000)
961. js/audio.js: Add per-team ambient music tracks — WHAT FOR: team identity
962. js/audio.js: Add card-play sound scaled by rarity (common=soft, mythic=epic) — WHAT FOR: rarity feel
963. js/audio.js: Add attack impact sound scaled by damage — WHAT FOR: impact scaling
964. js/audio.js: Add structure destruction rumble — WHAT FOR: weight
965. js/audio.js: Add trap trigger warning sound — WHAT FOR: surprise
966. js/audio.js: Add combo activation crescendo — WHAT FOR: hype
967. js/audio.js: Add synergy activation chime per team — WHAT FOR: team identity
968. js/audio.js: Add victory fanfare and defeat dirge — WHAT FOR: emotion
969. js/audio.js: Add bank phase purchase chime — WHAT FOR: purchase feedback
970. js/audio.js: Add turn timer warning beep at 5s — WHAT FOR: urgency
971–980: Add UI micro-interactions (button click, toggle, slider, dropdown, hover tick)
981–990: Add reduced-motion accessibility option (disables all animations)
991–995: Add debug overlay (perf counter, FPS, card count)
996–1000: Add error boundary (graceful crash with error code)