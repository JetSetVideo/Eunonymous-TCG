# Audio & VFX

`js/audio.js` (global `audio`) and `js/vfx.js` (global `SynthVFX`). Both are
procedural — no asset files.

## How they hook in

Both modules **auto-bind to the current `GameEngine`** (they poll `ui.game` every
250 ms and call `bindEngine(game)` once per engine instance). They subscribe with
`game.on(...)`, so no extra wiring in `index.html` is needed. On the LAN guest the
engine does not emit events, so the guest still gets only the UI's generic sounds.

| Engine event | Sound | VFX |
|---|---|---|
| `buyCard` (you) | `buy` | — |
| `playCard` | `play_creature` / `play_spell` (Spell, Action) / `play_structure` / `play_trap` (Trap, Conspiracy) / `gear_equip` | (UI: `animateCardPlay`) |
| `combatHit` | `hit` / `hit_heavy` (dmg ≥ 6), 90 ms after the swing | trail + impact ring + sparks + damage number on the card |
| `baseAttack` | `attack` | trail to the HP orb |
| `damage` to a player | `base_hit` (enemy) / `base_hit_player` (you) | impact ring on the HP orb; red flash if you take ≥ 5 |
| `destroy` | `death` | shard burst + collapse flash |
| `structureDestroyed` | `structure_destroyed` | shard burst + short shake |
| `heal` | `heal` | green motes at the HP orb |
| `bankStart` | `turn_player` / `turn_enemy` | cyan / red edge pulse |
| `error` | `no_mana` (message mentions mana/power) or `error` | — |
| `victory` / `defeat` | (UI plays `victory`/`defeat`) | gold flash + confetti / red vignette |

Generic UI calls `play`, `click`, `damage` and `error` are deferred one microtask.
If a specific sound from the same family fires in that tick, it replaces the
generic one, so they don't stack. Every name the UI already uses still works.

## Mix

voice → `sfxGain` → `masterGain` → headroom (0.7) → bus compressor (−18 dB, 4:1)
→ limiter (−3 dB, 20:1) → output. Measured peak with 10 heavy sounds layered at
full volume: 0.72 (no clipping). Each sound has a minimum re-trigger gap, and the
voice cap is 24. Volume changes ramp smoothly. The `master`/`music`/`sfx`
settings and the mute toggle (master = 0) behave as before.

The AudioContext is only created after a user gesture (`pointerdown`, `keydown`
or `touchend`), so Chrome shows no autoplay warning. Music starts at that point.
Music stops while the tab is hidden.

## VFX rules

- All overlays are `position:fixed; pointer-events:none`. Each one is tracked and
  removed when its animation finishes, with a hard timeout as a backstop.
  `SynthVFX.stats()` returns live node / particle counts and should return to 0.
- Effect durations: damage number 560 ms, impact ring 380 ms, trail about 280 ms,
  death 520 ms, turn pulse 550 ms. Victory confetti (about 1.4 s) is rare.
- `prefers-reduced-motion` (or `body.reduced-motion`): no shake, no trails,
  fade-only numbers and card play, 35% particles at 30% speed.
- The canvas loop is frame-rate independent and DPR-aware. It does not redraw
  when nothing is alive.
- `screenShake` uses the CSS `translate` property, so it never overwrites
  `#battle-arena`'s `transform`.
