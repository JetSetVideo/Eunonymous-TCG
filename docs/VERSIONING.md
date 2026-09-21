# Versioning & tracking changes

Why this exists: to compare **card statistics and bug behaviour across versions**.
A win-rate number is meaningless without knowing which build produced it.

## The two numbers

| Constant | File | Meaning |
|---|---|---|
| `GAME_VERSION` | `js/version.js` | Any user-visible or behavioural change. `major.minor.patch`. |
| `BALANCE_REVISION` | `js/version.js` | Bumped **only** when data changes in a way that invalidates balance comparisons: card stats, rules, keyword behaviour, cost curves. |

`VersionInfo.label()` renders them together, e.g. `v1.2.0+b1`.

**Rule:** a bug fix or UI change bumps `GAME_VERSION` only. A card/rules change bumps
**both**. That way an analyst can tell whether a win-rate shift came from a code
change or a data change — and whether two runs are even comparable.

## Where the version is stamped

- **QA screenshots** — burnt into the HUD overlay by `tools/qa/harness.js`
  (`EUNONYMOUS-TCG v1.2.0+b1`). Every screenshot is self-describing.
- **QA reports** — `tools/qa/out/report.json` and `REPORT.md` carry it at the top.
- **Battle history** — to be attached to each recorded match (profiles/MMR work).
- **Profiles** — to be stored at profile creation, so a player's history can be
  segmented by game version.

## Bumping

Edit `js/version.js`:

```js
const GAME_VERSION = '1.2.0';
const BALANCE_REVISION = 1;
```

- **patch** (`1.2.0` → `1.2.1`) — bug fix, copy change, no behaviour change.
- **minor** (`1.2.0` → `1.3.0`) — new feature, new screen, new card set.
- **major** (`1.2.0` → `2.0.0`) — breaking change: save format, rules overhaul.

Record the bump in the `COLLAB.md` entry for that change, with the W6 block from
`docs/AGENT_ROSTER.md`.

## Comparing across versions

```bash
# 1. Tag the state you are about to measure
git tag -a v1.2.0 -m "balance revision 1"

# 2. Capture the stamped metrics
node tools/qa/harness.js --flows title,quickbattle

# 3. After changes + a version bump, capture again and diff
diff <(jq '.shots[] | {viewport,flow,fps}' tools/qa/out/report.json) previous.json
```

Keep the generated `report.json` for each released version under
`tools/qa/out/versions/<version>.json` so regressions are diffable, not recollected.

## Grilled into the roadmap

The Notion GDD (§18) plans Alpha → Season 3. Version tracking is what makes the
"compare card statistics per version" requirement (GDD §14 battle log + your
request) possible; without it the balance data is unattributable.