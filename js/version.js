/**
 * Eunonymous-TCG — version + build metadata  (js/version.js)
 * =========================================================
 * Single source of truth for the game version. Loaded FIRST, before everything
 * else, so any module (and the QA harness) can read it.
 *
 * Bump GAME_VERSION on every change that can affect balance, card stats or bugs —
 * it is stamped onto saved profiles, battle history and QA screenshots so runs can
 * be compared across versions. See docs/VERSIONING.md.
 *
 * Loaded as a classic script -> top-level const lives in the global lexical
 * environment (NOT on window). Reference it by bare name, or via
 * `VersionInfo` which is explicitly attached to window for tooling.
 */
const GAME_VERSION = '1.2.0';

// Bumped when the DATA changes in a way that invalidates balance comparisons
// (card stats, rules, keyword behaviour). Version-only changes leave this alone.
const BALANCE_REVISION = 1;

const VersionInfo = {
  name: 'Eunonymous-TCG',
  version: GAME_VERSION,
  balanceRevision: BALANCE_REVISION,
  build: {
    // Injected by the QA harness at screenshot time if absent.
    commit: (typeof EUNONYMOUS_COMMIT !== 'undefined') ? EUNONYMOUS_COMMIT : 'dev',
    date: (typeof EUNONYMOUS_BUILD_DATE !== 'undefined') ? EUNONYMOUS_BUILD_DATE : null
  },
  /** Short label used in HUDs, logs and screenshot overlays. */
  label() {
    return 'v' + this.version + (this.balanceRevision ? '+b' + this.balanceRevision : '');
  },
  /** Full one-line descriptor. */
  describe() {
    return this.name + ' ' + this.label() +
      (this.build.commit && this.build.commit !== 'dev' ? ' (' + this.build.commit + ')' : '');
  },
  /** Parsed numeric version for comparisons: [major, minor, patch]. */
  tuple() {
    return this.version.split('.').map((n) => parseInt(n, 10) || 0);
  }
};

// Expose for tooling/QA without relying on the lexical global.
if (typeof window !== 'undefined') {
  window.VersionInfo = VersionInfo;
  window.GAME_VERSION = GAME_VERSION;
}