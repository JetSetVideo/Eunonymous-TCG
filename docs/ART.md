# Card artwork

## Source
The 131 images in `assets/art/` come from the user's OneDrive **Eunonymous** folder. They were copied, renamed to lowercase slugs and resized (max 560 px, JPEG). `assets/art/manifest.json` lists `{file, title, w, h}` with the original descriptive title. One source file was renamed to `blackqueenregal.jpg` on import; `politicalCompasMeme` was excluded.

## Files
- `js/card-art.js` — `CARD_ART` (card id → file), `CARD_ART_FOCUS` (file → CSS `object-position`), `CARD_ART_BASE`, and `cardArtFor(card)` → `{src, pos}` or `null`.
- `assets/art/cards_brief.json` — the card list used to build the mapping.

## Mapping rules
1. Every one of the 268 cards has exactly one image; all 131 images are used.
2. **Legendary and mythic cards (42) each have an image no other card uses.**
3. No image is used more than 3 times (distribution: 54 × 3, 29 × 2, 48 × 1).
4. Reuse is kept within the same team / character so palettes stay coherent (e.g. Technopriest = red/gold priests, Biopure = forest/flower images, Economy = gold/desert/beach, Overchargers = jetpacks, pirates, red/electric figures).
5. Type guides the subject: creatures → characters; structures → places, cities, machines, objects; spells/actions → cosmic, abstract or ritual images.
6. Images were tagged visually (subject, mood, colours, subject position). Focal points: `50% 15%` (subject near top), `50% 25%` (portrait face upper third), `50% 40%` (centred scenes/objects), `50% 65%` (subject low in frame).

## Changing a card's art
1. Drop the new JPEG in `assets/art/` (resize to ≤560 px).
2. Edit the card's line in `CARD_ART` in `js/card-art.js`; add the file to `CARD_ART_FOCUS` if new (default `50% 30%`).
3. Keep legendary/mythic images unique and reuse ≤3, then verify:

```bash
node -e "eval(require('fs').readFileSync('js/card-art.js','utf8')+';global.M=CARD_ART');const c=require('./assets/art/cards_brief.json');const n={};for(const x of c){const f=M[x.id];if(!f)throw x.id;n[f]=(n[f]||0)+1}console.log(Object.keys(M).length,Object.keys(n).length,Math.max(...Object.values(n)))"
```

## Legendary & mythic assignments
| Card | Id | Rarity | Team / Character | Image |
|---|---|---|---|---|
| Crimson Vanguard | `oc_006` | legendary | Overchargers | `epicknightflamingsword.jpg` |
| Colossus Warden | `fr_005` | legendary | Fortress | `japmechaviewback.jpg` |
| Oblivion | `ct_010` | legendary | Control | `blackholetwisting.jpg` |
| Echo Mimic | `sy_009` | legendary | Synergy | `cybernetic-twin-cyborg-women-robots.jpg` |
| Golden Avatar | `ec_007` | legendary | Economy | `cyberlatinagold.jpg` |
| Chaos Engine | `ch_009` | legendary | Chaos | `chickenfeetartdecobox.jpg` |
| Total Anarchy | `ch_010` | legendary | Chaos | `guru-seaofhandswithagazelle.jpg` |
| Synth Titan | `sl_003` | legendary | Synth Legends | `hypergeometric-indian-god.jpg` |
| Codex of Power | `sl_005` | legendary | Synth Legends | `buddhalookingmatrixcode.jpg` |
| World Breaker | `tb_003` | legendary | Titanborn | `dark-skin-redeyes-gneral-suit.jpg` |
| Nexus Anchor | `nt_010` | legendary | Neutral | `pixelsateliteballbase.jpg` |
| The Architect | `my_001` | mythic | Synth Legends | `lifelike-vision-a-celtic-french-god-president-of-the-solar-sys-3.jpg` |
| The Nullifier | `my_002` | mythic | Chaos | `devilnoir.jpg` |
| The Great Vault | `my_003` | mythic | Economy | `chickenfeetartdecobox2.jpg` |
| The Eunonymous | `my_004` | mythic | Synth Legends | `metaversedeityblackfacediamons.jpg` |
| Berserker Axe | `gr_010` | legendary | Overchargers | `bleudemonarmoredspeed.jpg` |
| Aegis Shield | `gr_011` | legendary | Fortress | `celticgoddesscorinthianarmor.jpg` |
| Titan Mail | `gr_012` | legendary | Titanborn | `wardenelitemilitiaarmor.jpg` |
| Time Dilation | `ac_012` | legendary | Control | `galaxycircles.jpg` |
| Sanctuary Guardian | `fr_015` | legendary | Fortress | `aiangelsuit.jpg` |
| Temporal Mage | `ct_014` | legendary | Control | `intothecosmicvoid-a-mage-covered-in-black-and-white-checkered.jpg` |
| Gravity Manipulator | `ct_017` | legendary | Control | `universe-below-eye-hole.jpg` |
| Ancient Construct | `sl_006` | legendary | Synth Legends | `anubis.jpg` |
| Apocalypse Engine | `ch_014` | legendary | Chaos | `skullrobotcrab.jpg` |
| The Collector | `ec_014` | legendary | Economy | `blackantagonistsmiling.jpg` |
| Colossus of Deep | `tb_007` | legendary | Titanborn | `creepyfungicreature.jpg` |
| Time Vault | `sl_007` | legendary | Synth Legends | `chineseskytemple.jpg` |
| Genesis Spire | `sl_010` | legendary | Synth Legends | `infiniteskyscrapper.jpg` |
| The Stormbringer | `my_005` | mythic | Overchargers | `wuxiachineseman.jpg` |
| The Indomitable | `my_006` | mythic | Fortress | `whiteheroredcape.jpg` |
| The Overseer | `my_007` | mythic | Control | `hermespowereyes.jpg` |
| The Confluence | `my_008` | mythic | Synergy | `7astralprojectionbodies.jpg` |
| The Monopoly | `my_009` | mythic | Economy | `asianprincessgold.jpg` |
| Prime Directive Warden | `syt_008` | legendary | Titanborn / Synthetic | `fullarmorrobotqueenblackcables.jpg` |
| Patient Zero | `mem_008` | legendary | Chaos / Memetic | `jockerclown.jpg` |
| Philosopher’s Core | `ref_008` | legendary | Economy / Refinist | `alchemymagic-ai-projection-femine-matrix.jpg` |
| Voice of the Machine God | `tec_008` | legendary | Control / Technopriest | `metapope.jpg` |
| The Redline | `cyb_008` | legendary | Overchargers / Cyborg | `cybercowboyridinghorsebike-orange-moonpurplefield.jpg` |
| The World Root | `bio_008` | legendary | Fortress / Biopure | `perfect30yocelticmanpurpletree.jpg` |
| The Unseen | `eth_008` | legendary | Synth Legends / Ethereal | `whitespiritwalkingonpurpleland.jpg` |
| Central Directive | `org_008` | legendary | Synergy / Organizer | `robotic-bees-fly-over-futuristic-cityscape-dusk.jpg` |
| The Kingmaker | `sch_008` | legendary | Control / Schemist | `blackqueenregal.jpg` |
