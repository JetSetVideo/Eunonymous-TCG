# Decision record — the opening economy

**Status:** decided 2026-09-21 by Hermes, on the human's instruction to use best
judgement, **pending one-line confirmation**. Reversible — see the end.

## The conflict

| Source | Says |
|---|---|
| Notion GDD §2.1–2.3 | Draw phase. **Starting hand of 5** cards from the mixed pool, then draw 1/turn. |
| The build | **Zero-start**: no opening hand. Both Commanders begin with 0 cards and buy from the shared Metadeck during the Bank Phase. |

These are not compatible: they produce different opening curves, so every cheap
card's power ranking depends on which one is true.

## Decision: keep the zero-start economy

**Evidence:**

1. **The human's own brief describes the build's model**, not the GDD's:
   *"the cards of two facing players are mixed at the beginning of a party into a
   common master deck and **bought by each player at their turn**."* Buying each
   turn is the defining act; a 5-card opening hand is not mentioned.
2. **The GDD contradicts itself.** §7.4 (Battleground) describes a **Recruit Phase
   where players buy cards from a shared shop**. A shared shop is coherent with a buy
   economy and incoherent with a fixed opening hand — so §2.1 is the outlier, not the
   build.
3. **The zero-start model is already playable and balanced around.** Turn 1 grants
   `max(2, min(turn,10))` = 2 mana and a 3-card market; the market is deliberately
   smaller on the first player's opening turn to offset the missing head start
   (`js/game.js` startTurn, market count 3 vs 5). That is a designed counterweight to
   exactly the problem the 5-card hand was meant to solve.
4. Changing it would invalidate every existing starter deck (9 × 40 cards) and every
   signature card's cost curve.

**Conclusion:** GDD §2.1–2.3 is superseded. The GDD is authoritative everywhere else.

## What this means downstream

- **Balance work is unblocked** — the opening curve is now settled as zero-start.
- **The art import is unblocked** — card identities are stable, so files can be named
  once rather than twice.
- The 3-card first market is now load-bearing and should be protected by a probe.

## Not done (deliberately)

- I have **not** edited the Notion GDD. The human's rule is that Notion additions are
  yellow/blue and existing content is never deleted or moved. Correcting §2.1 is the
  human's edit to make, or an approved append — not a silent rewrite by an agent.

## Reversal path

The change is small and localised if this decision is overturned:

1. In `GameEngine.startBattle`, deal `N` cards from `metaDeck` into each player's hand.
2. Make the opening market size conditional on the first turn only.
3. Re-run the starter decks through the deck validator (a 5-card hand makes 40-card
   decks slightly too generous — costs may need to rise).

Estimated: one focused session, plus a balance batch.

## Verification

A probe should assert the invariant this decision creates. Add to
`tools/qa/harness.js`:

- on battle start, both players' `hand.length === 0`
- the first player's opening market is **3**, all later markets are **5**

Until that probe exists the decision is documented but not defended.