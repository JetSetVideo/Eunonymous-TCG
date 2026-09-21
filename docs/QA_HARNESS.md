# QA harness — screenshots, metrics & bug probes

`tools/qa/harness.js` drives the game in a real browser and produces evidence.

It exists for three reasons:

1. **Screenshots you can compare.** Every shot is stamped with the game version,
   balance revision, viewport, flow, measured FPS, error count and overflow state —
   so two runs are diffable instead of just "it looked different".
2. **Bug probes.** Machine-checked invariants that fail loudly when a bug returns.
3. **The responsive matrix.** The game targets phones (both orientations), tablets,
   laptops and large desktops. The harness proves the layout at every one.

## Usage

```bash
node server/lan-server.js                 # the harness needs the game served
node tools/qa/harness.js                  # all viewports, title + quickbattle
node tools/qa/harness.js --probe          # probes only — fast, no screenshots
node tools/qa/harness.js --flows title                  # one flow
node tools/qa/harness.js --viewports phone-portrait,desktop
```

`CHROME_PATH` overrides browser detection. `GAME_URL` overrides the target
(default `http://127.0.0.1:8787/`).

## The viewport matrix

| Key | Size | Represents |
|---|---|---|
| `phone-portrait` | 390×844 @3x | iOS / Android vertical |
| `phone-landscape` | 844×390 @3x | phone horizontal |
| `tablet-portrait` | 768×1024 @2x | tablet vertical |
| `tablet-landscape` | 1024×768 @2x | tablet horizontal |
| `laptop` | 1366×768 @1x | laptop |
| `desktop` | 1920×1080 @1x | large desktop |

## Flows

A flow leaves the game on a screen worth looking at.

| Flow | Ends on |
|---|---|
| `title` | main menu |
| `quickbattle` | a live battle vs the AI |
| `quickbattle_log` | battle with the log modal open |

## Probes

Assertions about invariants. These are the regression net — prose tests rot,
probes don't.

| Probe | Asserts |
|---|---|
| `turn-1-is-not-skipped` | Opening a match always yields `turnCount === 1` and **exactly one** side holding turn 1, for *both* coin-toss outcomes. Guards the double-`startTurn` bug. |
| `battle-log-matches-history` | The log panel never renders more entries than the engine actually recorded. |

Add a probe **before** fixing a bug — it should fail first, then pass. That is the
proof the fix is real.

## Output

```
tools/qa/out/
  REPORT.md              human-readable summary (probes + screenshot table)
  report.json            machine-readable, for diffs across versions
  <viewport>__<flow>.png stamped screenshots
```

## Reading the output

The console flags each shot:

```
  ! phone-portrait__title    fps= 35.4 err=0 overflow=-Y
```

- `✓` / `!` — `!` means errors, failed requests, or layout overflow.
- `fps` — frames per second measured over ~1.5s via `requestAnimationFrame`.
- `overflow` — `X` horizontal, `Y` vertical. The project goal is **no scrolling**,
  so any `X`/`Y` is a real defect, not a nitpick.

## Interpreting FPS honestly

The harness runs headless with `--disable-gpu`, so **WebGL/shaders are software
rasterised**. Absolute numbers are therefore pessimistic versus real hardware.

What *is* meaningful is the **trend across viewport area**. If FPS falls roughly in
proportion to pixel count, the renderer is fill-rate bound — the cost scales with
fullscreen fragment work (the shader canvas, the VFX canvas, heavy CSS blurs), not
with game logic. Compare runs at the *same* viewport to detect real regressions.

Graphical work in this project should therefore be judged on the trend, and
confirmed on real hardware before being declared a user-facing problem.