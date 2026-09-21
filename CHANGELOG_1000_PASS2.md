# SYNTHOPWARS — 1000 CHANGES MANIFEST (PASS 2)
## Second Exhaustive Improvement Plan

Following the first pass which added 56 new cards, 15 keywords, 3 card types, CSS animations, battle rules, and UI improvements, this second pass focuses on everything still missing.

---

## SECTION K: STRUCTURE DAMAGE & DEFENSE SYSTEM (Changes 1001–1060)
1001. js/game.js: Structures now have currentHp that can be damaged — currently structures use health but not currentHp properly — HOW: initialize currentHp in playCard for structures
1002. js/game.js: When creature attacks base and structures exist, frontmost structure intercepts — HOW: check field.base[0] first
1003. js/game.js: Structure takes damage reducing its currentHp — HOW: apply damage to structure.currentHp
1004. js/game.js: When structure currentHp <= 0, destroy it and deal 1 splash to base — HOW: destroyCard + bonus
1005. js/game.js: Structures with defense > 0 reduce incoming damage by their DEF — HOW: defValue from structure.defense
1006. js/game.js: Add structure.destroyed event with rubble animation — HOW: emit + CSS
1007. js/game.js: Structure HP bar visible on card in battle — HOW: showBattleStats for structures
1008. js/game.js: Healing effects (Healing Pulse, Revitalize) heal structures — HOW: iterate field.base
1009. js/game.js: Structures can be targeted by spells that deal damage — HOW: allow target selection
1010. js/game.js: Add "Demolish" keyword: deal double damage to structures — HOW: multiplier
1011–1020: Each structure card gets defense stat usable in battle (Forward Camp gets DEF 2, Fortress Wall DEF 5, etc.)
1021–1030: Structure visual states: intact (full HP), damaged (cracks at <60%), critical (<30% red flashing), destroyed (shatter)
1031–1040: Structure intercept logistics: front structure takes hit first, if destroyed overflow hits next structure, then base
1041–1050: Structure abilities that trigger when damaged (Fortress Wall: when damaged, heal 1)
1051–1060: Structure synergy: adjacent structures share DEF (Chain Wall effect)

## SECTION L: CARD SCORE CHANGES IN BATTLE (Changes 1061–1130)
1061. js/game.js: When a creature takes damage, its currentHp AND currentDef both visible — HOW: update both
1062. js/game.js: When a creature's DEF is reduced to 0, subsequent attacks deal full ATK — HOW: defValue = 0
1063. js/game.js: DEF can be permanently reduced by certain effects (Quake, Demoralize) — HOW: modify card.defense base
1064. js/game.js: When DEF is buffed (Fortify, Sanctuary), show golden glow on DEF badge — HOW: CSS class
1065. js/game.js: When ATK is buffed (Overclock Surge, Unity), show golden glow on ATK badge — HOW: CSS class
1066. js/game.js: Temporary buffs (until end of turn) vs permanent buffs — HOW: buff.expireTurn
1067. js/game.js: Temporary buff removal at end of turn — HOW: check and remove in endTurn
1068. js/game.js: Stat change animations: floating +N or -N text near affected stat — HOW: spawn element
1069. js/game.js: When HP changes, HP bar animates smoothly — HOW: CSS transition already exists, ensure update
1070. js/game.js: When HP drops below 0, show "OVERKILL" text — already added, verify trigger
1071–1080: Each keyword effect gets a unique floating combat text (Surge: "SURGE!", Ward: "WARD!", Poison: "POISONED", etc.)
1081–1090: Counter-attack damage shows as "COUNTER!" text in different color
1091–1100: Buff applications show "BUFF" text with stat name (e.g. "+2 ATK" in gold)
1101–1110: Debuff applications show "DEBUFF" text with stat name (e.g. "-1 DEF" in red)
1111–1120: Healing shows green "+N" text
1121–1130: Power gain/loss shows blue "+N PWR" / "-N PWR" text

## SECTION M: NEW CARDS EXPANSION (Changes 1131–1250)
1131. js/cards.js: Add "Marauder" (Creature, Overchargers, 4 cost, 5/2/4, Rare, ability: "Pierce: Ignores DEF. Charge")
1132. js/cards.js: Add "Blade Master" (Creature, Overchargers, 5 cost, 6/3/5, Epic, ability: "Barrage: Attacks all enemy creatures. Surge: Doubles ATK first attack")
1133. js/cards.js: Add "Storm Caller" (Creature, Overchargers, 3 cost, 3/2/3, Uncommon, ability: "When played: Deal 2 damage to enemy base if you have 3+ Overcharger creatures")
1134. js/cards.js: Add "Aegis Bearer" (Creature, Fortress, 4 cost, 2/6/6, Rare, ability: "Ward: Absorbs next damage. Shield: Halves next attack. Taunt")
1135. js/cards.js: Add "Stone Warden" (Creature, Fortress, 6 cost, 4/8/8, Epic, ability: "Thorns: 1 counter damage. Regenerate: Heal 2 HP/turn. Immortal: Survives at 1 HP once")
1136. js/cards.js: Add "Sanctuary Guardian" (Creature, Fortress, 7 cost, 5/10/10, Legendary, ability: "All allied structures gain Ward. Adjacent creatures gain Shield. Taunt")
1137. js/cards.js: Add "Mind Flayer" (Creature, Control, 5 cost, 4/4/5, Epic, ability: "Silence: Removes abilities from target creature. Lifesteal")
1138. js/cards.js: Add "Temporal Mage" (Creature, Control, 6 cost, 5/5/6, Legendary, ability: "When played: Enemy skips next main phase. Reflect: Returns 50% damage")
1139. js/cards.js: Add "Siren" (Creature, Control, 3 cost, 2/3/3, Uncommon, ability: "When played: Silence all enemy creatures with cost < 4")
1140. js/cards.js: Add "Synth Hacker" (Creature, Control, 2 cost, 1/2/2, Common, ability: "When played: Look at top 3 cards of enemy deck, discard 1")
1141. js/cards.js: Add "Resonance Chamber" (Structure, Synergy, 4 cost, 0/0/5, Rare, ability: "All Link creatures gain Reflect and Thorns")
1142. js/cards.js: Add "Mutation Lab" (Structure, Chaos, 4 cost, 0/0/5, Epic, ability: "At start of turn: Random allied creature gains a random keyword")
1143. js/cards.js: Add "Plasma Cannon" (Structure, Overchargers, 5 cost, 3/0/4, Rare, ability: "Can attack: Deals 3 damage to enemy base or creature. Demolish: Double damage to structures")
1144. js/cards.js: Add "Mega Reactor" (Structure, Economy, 6 cost, 0/0/8, Epic, ability: "Generates +3 Power/turn. When destroyed: Deal 3 damage to all creatures")
1145. js/cards.js: Add "Shield Generator" (Structure, Fortress, 5 cost, 0/5/8, Epic, ability: "All allied creatures gain Ward. When destroyed: All allies gain Shield")
1146. js/cards.js: Add "Siege Engine" (Creature, Titanborn, 6 cost, 7/6/7, Epic, ability: "Demolish: Double damage to structures. Pierce: Ignores DEF")
1147. js/cards.js: Add "Gravity Manipulator" (Creature, Control, 7 cost, 6/6/7, Legendary, ability: "When played: Return all enemy creatures to their owner's hand. They cost +2 next turn")
1148. js/cards.js: Add "Ancient Construct" (Creature, Synth Legends, 8 cost, 8/8/10, Legendary, ability: "Ward. Reflect. Immortal. Cannot be targeted by enemy spells")
1149. js/cards.js: Add "Apocalypse Engine" (Creature, Chaos, 9 cost, 10/5/10, Legendary, ability: "Barrage. Pierce. When played: Deal 5 damage to ALL other creatures. Lifesteal")
1150. js/cards.js: Add "The Collector" (Creature, Economy, 8 cost, 7/7/8, Legendary, ability: "When played: Steal the strongest enemy creature. Steal 2 Power")
1151. js/cards.js: Add "Energy Vampire" (Creature, Control, 3 cost, 2/3/3, Uncommon, ability: "Lifesteal. When played: Enemy loses 2 Power, you gain 2 Power")
1152. js/cards.js: Add "Nanite Swarm" (Creature, Chaos, 2 cost, 1/1/3, Uncommon, ability: "Poison: Deals 1 damage per turn. When destroyed: Spread poison to adjacent enemy")
1153. js/cards.js: Add "Gladiator" (Creature, Overchargers, 3 cost, 4/2/3, Uncommon, ability: "Enrage: +3 ATK when below 50% HP. Fortify: +1/+1 if survives combat")
1154. js/cards.js: Add "Duelist" (Creature, Synergy, 2 cost, 3/1/2, Common, ability: "Pierce. When another Link creature enters: Gain +1 ATK")
1155. js/cards.js: Add "Iron Sentinel" (Creature, Fortress, 4 cost, 1/7/7, Rare, ability: "Taunt. Thorns: 2 counter damage. Cannot attack")
1156. js/cards.js: Add "Wraith" (Creature, Control, 4 cost, 5/2/3, Rare, ability: "Stealth: Cannot be targeted until it attacks. Pierce")
1157. js/cards.js: Add "Catalyst Mage" (Creature, Synergy, 5 cost, 3/4/5, Epic, ability: "Catalyst: Gains +2/+2 if another Synergy creature is on field. Lifesteal")
1158. js/cards.js: Add "Golden Golem" (Creature, Economy, 6 cost, 5/7/7, Epic, ability: "Production: +2 Power/turn. Immortal. When destroyed: Opponent gains 4 Power")
1159. js/cards.js: Add "Berserk Engine" (Creature, Chaos, 4 cost, 5/1/4, Rare, ability: "Enrage: +4 ATK below 50% HP. Reckless: Must attack each turn")
1160. js/cards.js: Add "Colossus of Deep" (Creature, Titanborn, 8 cost, 9/9/12, Legendary, ability: "Immortal. Fortify. Demolish. Taunt. Cannot be targeted by spells")
1161. js/cards.js: Add "Phantom Assassin" (Creature, Control, 3 cost, 4/1/2, Uncommon, ability: "Stealth. Pierce. When it attacks the base: Deal double damage")
1162. js/cards.js: Add "War Drummer" (Creature, Overchargers, 2 cost, 1/2/2, Common, ability: "When played: All Overcharger creatures gain Charge")
1163. js/cards.js: Add "Living Fortress" (Structure, Fortress, 5 cost, 0/8/10, Rare, ability: "Absorbs all base damage. Regenerate: Heal 2 HP/turn. Taunt")
1164. js/cards.js: Add "Dark Portal" (Structure, Chaos, 4 cost, 0/0/6, Epic, ability: "At start of turn: 30% chance to destroy a random enemy creature. 30% chance to destroy a random ally")
1165. js/cards.js: Add "Time Vault" (Structure, Synth Legends, 6 cost, 0/0/8, Legendary, ability: "Ward. At start of turn: You gain 1 extra mana. Cannot be destroyed by spells")
1166. js/cards.js: Add "Shield Maiden" (Creature, Fortress, 2 cost, 2/3/3, Common, ability: "Shield. Cover: Protects adjacent allies")
1167. js/cards.js: Add "Blood Mage" (Creature, Chaos, 3 cost, 3/2/3, Uncommon, ability: "Lifesteal. When played: Lose 2 HP, draw 1 card")
1168. js/cards.js: Add "Iron Maiden" (Creature, Fortress, 4 cost, 2/5/5, Rare, ability: "Thorns: 3 counter damage. Reflect: Returns 50% damage to attacker")
1169. js/cards.js: Add "Lightning Rod" (Structure, Control, 3 cost, 0/3/4, Uncommon, ability: "When you cast a spell: Deal 2 damage to a random enemy creature")
1170. js/cards.js: Add "Enrage Totem" (Structure, Overchargers, 3 cost, 0/2/4, Uncommon, ability: "All Overcharger creatures gain Enrage: +2 ATK below 50% HP")
1171. js/cards.js: Add "Nanite Hive" (Structure, Chaos, 4 cost, 0/2/5, Rare, ability: "All Chaos creatures gain Poison. When a creature dies: Spawn a 1/1 token with Poison")
1172. js/cards.js: Add "Oracle Temple" (Structure, Control, 5 cost, 0/3/6, Rare, ability: "At start of turn: Reveal enemy hand. Enemy spells cost +2")
1173. js/cards.js: Add "Synth Cathedral" (Structure, Synth Legends, 5 cost, 0/4/7, Epic, ability: "All Synth Legend creatures gain Ward and Regenerate. Generate +1 Power")
1174. js/cards.js: Add "Gold Mint" (Structure, Economy, 3 cost, 0/1/4, Uncommon, ability: "Production: +2 Power. Ward. When destroyed: Draw 2 cards")
1175. js/cards.js: Add "Rage Pit" (Structure, Overchargers, 2 cost, 0/1/3, Common, ability: "When allied creature attacks: It gains +1 ATK permanently (max +3)")
1176. js/cards.js: Add "Phalanx Formation" (Action, Fortress, 3, ability: "All your creatures gain Shield and Cover for this turn. Draw 1 card")
1177. js/cards.js: Add "Ambush Tactic" (Action, Overchargers, 2, ability: "Give all your creatures Charge and +1 ATK this turn")
1178. js/cards.js: Add "Mass Confusion" (Action, Chaos, 4, ability: "Silence all enemy creatures. 30% chance each attacks its own base")
1179. js/cards.js: Add "Iron Rain" (Action, Overchargers, 3, ability: "Deal 2 damage to all enemy creatures and structures. Demolish applies")
1180. js/cards.js: Add "Power Surge" (Action, Economy, 2, ability: "Gain 1 Power for each card in your hand. Lose 2 Power at end of turn")
1181. js/cards.js: Add "Mind Warp" (Action, Control, 3, ability: "Take control of target enemy creature with cost <= 4. It gains Berserk")
1182. js/cards.js: Add "Soul Harvest" (Action, Synth Legends, 2, ability: "Destroy your weakest creature: Heal your base for its HP, draw 2 cards")
1183. js/cards.js: Add "Earth Splitter" (Action, Titanborn, 4, ability: "Deal 8 damage to target structure. If destroyed, deal 4 to enemy base")
1184. js/cards.js: Add "Shrapnel Bomb" (Gear, Chaos, 3, "+2 ATK, Thorns: 2, When creature dies: Deal 2 damage to all enemies", Rare)
1185. js/cards.js: Add "Scope" (Gear, Control, 1, "+1 ATK, Pierce, Stealth once per turn", Uncommon)
1186. js/cards.js: Add "Med Kit" (Gear, Fortress, 2, "+2 HP, Regenerate: Heal 1/turn, Ward once", Common)
1187. js/cards.js: Add "Power Core" (Gear, Economy, 3, "Generate +1 Power/turn while equipped creature is alive", Uncommon)
1188. js/cards.js: Add "Venom Gland" (Gear, Chaos, 2, "Poison stacks 3 on attack. Lifesteal", Rare)
1189. js/cards.js: Add "Phase Device" (Gear, Control, 3, "Stealth every turn. Reflect once", Epic)
1190. js/cards.js: Add "Titan Gauntlet" (Gear, Titanborn, 5, "+3 ATK, Demolish, +3 DEF", Epic)
1191–1200: Add 10 more neutral cards with mix of new keywords and types
1201–1210: Add Conspiracy cards: "Betrayal" (Control), "Hidden Cache" (Economy), "Blood Pact" (Chaos), "Secret Route" (Synergy), "Ancient Codex" (Synth Legends), "Titan's Secret" (Titanborn), "Double Agent" (Control), "Vantage Point" (Fortress), "Surprise Attack" (Overchargers), "Mystery Box" (Chaos)
1211–1220: Add Mythic cards: "The Time Lord" (Control, 10 cost, ability: Silence all enemies permanently, Ward, Reflect), "The War God" (Overchargers, 10 cost, 12/8/12, Barrage, Pierce, Enrage), "The Guardian" (Fortress, 10 cost, 6/14/14, Immortal, Ward, all allies gain Shield), "The Architect Reborn" (Economy, 10 cost, Production 5, all cards free), "The Void Queen" (Synergy, 10 cost, 10/10/10, all Link creatures copy her stats), "The Chaos Bringer" (Chaos, 10 cost, 15/0/8, Barrage, all creatures attack random targets)
1221–1230: Add combo IDs for new card families and update checkCombos
1231–1240: Update PRESET_ARCHETYPES with new cards from this expansion
1241–1250: Update validateDeck copy limits for structures (max 10 from 8)

## SECTION N: KEYWORD ANIMATION INTEGRATION (Changes 1251–1350)
1251. When Surge activates: red flash on attacker + "SURGE!" text
1252. When Ward absorbs: blue shield bubble + "WARD!" text
1253. When Pierce triggers: orange slash effect + "PIERCE!" text
1254. When Lifesteal heals: green swirl on attacker base + heal number
1255. When Barrage triggers: multiple attack lines to all enemies
1256. When Fortify activates: golden "+1/+1" text on card
1257. When Shield halves damage: cyan ripple + "HALVED!" text
1258. When Reflect returns damage: purple return arrow + damage number
1259. When Stealth is active: card gets translucent shimmer
1260. When Silence is applied: muzzle icon on card + "SILENCED!" text
1261. When Enrage activates: red aura burst + "+ATK" text
1262. When Poison deals damage: green dripping effect + "-N" text
1263. When Regenerate heals: soft green glow + "+1" text
1264. When Thorns hits attacker: spike visual + "-1" text
1265. When Immortal saves: golden flash + "IMMORTAL!" text
1266. When Catalyst triggers: chain visual between cards
1267. When combo activates: team-colored full-screen flash
1268. When synergy activates: wave expansion from player
1269. When Sudden Death triggers: screen edges pulse red
1270. When Mana Burn triggers: blue flame on player bar
1271–1280: Each animation above gets a sound effect in audio.js
1281–1290: Each animation gets CSS keyframe definitions
1291–1300: Each animation gets emit event from game.js
1301–1310: UI controller handles each event and triggers visual
1311–1320: Timing system: animations queue and play in sequence, not overlapping
1321–1330: Animation speed scales with animation speed setting (0.5x to 2x)
1331–1340: Reduced-motion accessibility option disables all keyword animations
1341–1350: Animation completion callbacks to ensure game logic waits for visual

## SECTION O: AUDIO EXPANSION (Changes 1351–1420)
1351. js/audio.js: Add 'ward' sound — crystal shield shatter — HOW: high-freq sine burst
1352. js/audio.js: Add 'pierce' sound — sharp metallic clang — HOW: square wave high freq
1353. js/audio.js: Add 'lifesteal' sound — soft drain tone — HOW: descending sine
1354. js/audio.js: Add 'barrage' sound — rapid fire sequence — HOW: 5 quick impacts
1355. js/audio.js: Add 'fortify' sound — solidifying clunk — HOW: low square
1356. js/audio.js: Add 'shield' sound — bubble pop — HOW: sine with pitch bend up
1357. js/audio.js: Add 'reflect' sound — reverse swish — HOW: ascending noise
1358. js/audio.js: Add 'stealth' sound — whisper fade — HOW: filtered noise quiet
1359. js/audio.js: Add 'silence' sound — mute thud — HOW: low square cutoff
1360. js/audio.js: Add 'enrage' sound — growl — HOW: sawtooth low with distortion
1361. js/audio.js: Add 'poison' sound — bubbling — HOW: random sine pops
1362. js/audio.js: Add 'regenerate' sound — soft chime — HOW: high sine ascending
1363. js/audio.js: Add 'thorns' sound — prick — HOW: short high noise
1364. js/audio.js: Add 'immortal' sound — divine chord — HOW: major triad sine
1365. js/audio.js: Add 'catalyst' sound — connection hum — HOW: two sine waves
1366. js/audio.js: Add 'suddendeath' sound — alarm — HOW: alternating tones
1367. js/audio.js: Add 'manaburn' sound — flame — HOW: noise burst with filter
1368. js/audio.js: Add 'overkill' sound — impact + zoom — HOW: low impact + rising freq
1369. js/audio.js: Add 'gear_equip' sound — mechanical click — HOW: two quick square clicks
1370. js/audio.js: Add 'conspiracy_reveal' sound — dramatic reveal — HOW: low to high sweep
1371–1380: Add per-team ambient music variations (different base frequencies and waveforms)
1381–1390: Add music intensity changes based on game state (calm menu, tense battle, victorious)
1391–1400: Add UI sounds: dropdown open, slider change, toggle, tab switch, scroll
1401–1410: Add 'structure_destroyed' sound — crumbling — HOW: descending noise with reverb
1411–1420: Add 'demolish' sound — heavy crunch — HOW: low square + noise burst

## SECTION P: DECK BUILDER POLISH (Changes 1421–1500)
1421. Add "deck analysis" panel showing: avg cost, creature/spell/structure ratio, win conditions, weaknesses
1422. Add "auto-complete" button: fills remaining deck slots with best-fit cards based on current composition
1423. Add card tier list overlay (S/A/B/C/D ranking based on community stats)
1424. Add "import from clipboard" button using navigator.clipboard API
1425. Add deck sharing via URL (encode deck in hash)
1426. Add "deck statistics" showing: total stats sum, keyword distribution, team breakdown percentage
1427. Add drag-and-drop from collection to deck list
1428. Add "quick add" button on each card (+ icon that adds to deck without clicking the card)
1429. Add "max copies reached" red indicator on cards at their copy limit
1430. Add deck cost summary (total power cost of all cards)
1431–1440: Add "deck archetype detector" that identifies the deck type (Aggro, Control, Midrange, Combo, Ramp) based on card distribution
1441–1450: Add "sideboard" concept (5 extra cards visible but not in main deck for best-of-3)
1451–1460: Add "mulligan simulator" showing probability of getting each card in opening hand
1461–1470: Add card collection view modes: grid (current), list (compact rows), gallery (large cards)
1471–1480: Add filter save/load presets (save current filter state to localStorage)
1481–1490: Add "recently played" cards section showing cards used in last 5 battles
1491–1500: Add "card detail" modal with full art, lore, stats, and usage statistics

## SECTION Q: BATTLE UI COMPLETENESS (Changes 1501–1600)
1501. Add targeting arrow system: when selecting an attacker, show arrows to valid targets
1502. Add "invalid target" red highlight when hovering over non-targetable cards
1503. Add "confirm attack" dialog when toggle is on (shows attacker vs target preview)
1504. Add battle history scrollable panel (bottom or side) with last 20 actions
1505. Add "combat preview" tooltip: shows expected damage before confirming attack
1506. Add "mana remaining" indicator that dims unplayable cards in hand
1507. Add "playable" glow on cards in hand that you can afford to play
1508. Add "slot full" indicator when all 5 battle slots are occupied
1509. Add "equip target" UI: when playing a Gear card, highlight valid creatures
1510. Add "conspiracy trigger" notification: when a conspiracy is revealed, show animation
1511–1520: Add "phase indicator" in center showing current phase (Bank → Power → Main → End)
1521–1530: Add "turn counter" prominently displayed in battle arena
1531–1540: Add "HP difference" indicator showing who's ahead and by how much
1541–1550: Add "card advantage" indicator showing hand/deck count comparison
1551–1560: Add "synergy tracker" showing active team synergies with icons
1561–1570: Add "keyword glossary" accessible during battle (click keyword to see definition)
1571–1580: Add "surrender" confirmation dialog with stats summary
1581–1590: Add "battle speed" control (0.5x, 1x, 2x, 4x) for animations
1591–1600: Add "auto-play" toggle for AI vs AI spectating

## SECTION R: VISUAL EFFECTS — BATTLE (Changes 1601–1700)
1601. Add screen-edge glow when HP is low (< 30%): red pulsing vignette
1602. Add "lethal damage" preview: if attack would kill target, show skull icon on target
1603. Add "lethal to base" indicator: if attack would reduce base to 0, show "LETHAL" text
1604. Add projectile variety: arrows for ranged, slash for melee, magic bolt for spells
1605. Add "hit" flash: target briefly flashes white when damaged
1606. Add "heal" glow: target briefly glows green when healed
1607. Add "buff" particles: golden sparkles rise from card when buffed
1608. Add "debuff" particles: purple particles fall onto card when debuffed
1609. Add "silence" visual: card gets grayscale + muzzle icon overlaid
1610. Add "stealth" visual: card becomes semi-transparent with shimmer
1611–1620: Add "zone" lighting: player zone gets warm color, enemy zone gets cold color
1621–1630: Add "battle weather" effects matching battleground (rain, sand, fog covering cards)
1631–1640: Add "card entrance" animation: cards slide in from deck position to hand
1641–1650: Add "card exit" animation: destroyed cards fade with particle scatter
1651–1660: Add "mana crystal" 3D animation: crystals form from particles when mana gained
1661–1670: Add "power" flowing visual: power energy streams from structures to player bar
1671–1680: Add "team banner" on each side of battle arena showing player's primary team
1681–1690: Add "turn transition" full-screen wipe effect between turns
1691–1700: Add "victory/defeat" full-screen overlay with dramatic text and effects

## SECTION S: SOCIAL & META DEPTH (Changes 1701–1800)
1701. Improve friends list: add "challenge to battle" button that starts bot match with friend's deck
1702. Add "spectate" button on friends who are "ingame"
1703. Add friend profile modal: shows their stats, favorite deck, achievements
1704. Add "block" and "report" buttons on friends
1705. Add chat emotes (predefined: GG, Well Played, Oops, Thanks, Wow)
1706. Add chat timestamps on messages
1707. Add chat channel tabs: Global, Team, Private
1708–1720: Add leaderboard improvements: rank icons, movement arrows, win streak indicators
1721–1740: Add achievement improvements: progress bars, tier badges, recently unlocked section
1741–1760: Add quest improvements: daily/weekly tabs, countdown timers, quest chains
1761–1780: Add "profile" screen: player avatar, rank, stats, deck history, match history
1781–1800: Add "card collection tracker" showing total cards available vs owned

## SECTION T: RULES & HELP (Changes 1801–1900)
1801. Add "How to Play" tutorial screen with interactive step-by-step guide
1802. Add "Keyword Glossary" screen listing all 30 keywords with descriptions and examples
1803. Add "Rules Reference" screen with damage formulas, combat resolution order, win conditions
1804. Add "Card Type Guide" explaining when to play each type (Creature, Spell, Trap, Structure, Action, Gear, Conspiracy, Role)
1805. Add "Battleground Guide" explaining each biome's rules and strategies
1806–1850: Add 45 FAQ entries covering common questions and edge cases
1851–1870: Add "Tips of the Day" that rotate on title screen
1871–1890: Add "Strategy Guide" with 20 archetype explanations (Aggro, Control, Combo, etc.)
1891–1900: Add "Glossary" of game terms (Base, Bank Phase, Power, Mana, GY, etc.)

## SECTION U: DATA INTEGRITY (Changes 1901–2000)
1901. js/game.js: Add input validation to buyCard: prevent buying cards not in market
1902. js/game.js: Add state validation: can't play cards during enemy turn
1903. js/game.js: Add null checks: all field.battle iterations check for null slots
1904. js/game.js: Prevent duplicate instance IDs: use UUID instead of Date.now()
1905. js/game.js: Add max hand size enforcement during drawCard
1906. js/game.js: Validate deck before battle: must have exactly 40 cards
1907. js/cards.js: Add card schema validation: all required fields present
1908. js/cards.js: Prevent duplicate card IDs
1909. index.html: Add localStorage quota management: clear old chat history if > 5MB
1910. index.html: Add save state versioning for migration compatibility
1911–1920: Add error boundaries: wrap UI functions in try-catch with error display
1921–1930: Add anti-cheat: validate card costs are paid, prevent playing from empty hand
1931–1940: Add state recovery: if game crashes, save state can be restored
1941–1950: Add battle replay system: record all actions and allow playback
1951–1960: Add "desync detection": compare player and enemy state checksums
1961–1970: Add card version tracking: if card data changes, invalidate old saved decks
1971–1980: Add "safe mode" that disables custom nodes/abilities causing errors
1981–1990: Add performance monitoring: FPS counter, memory usage, detect leaks
1991–2000: Add "audit log" of all game actions for debugging and replay