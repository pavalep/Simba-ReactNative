/**
 * V19 W5 Phase 5.3 — the 5-category error classifier.
 *
 * This is a PURE function module. No React, no store, no lib
 * import — `classifyError(mpvError)` maps an opaque native
 * failure into one of 5 documented categories plus the recovery
 * actions the chrome should offer.
 *
 * Why a classifier and not the `StreamError` union that
 * `streamErrors.ts` already defines?
 *
 *   `StreamError` is a *result type* — the shape a launch path
 *   returns in an `err(...)`. It answers "what kind of failure is
 *   this?" for the `usePlay` / `useOpenWithResume` launch surfaces.
 *
 *   The classifier answers a different question: "an mpv failure
 *   already happened mid-playback — what do we TELL the user and
 *   what can we OFFER them?" It therefore carries, per category:
 *     - a human title  (e.g. "Couldn't reach the server")
 *     - a human body   (e.g. "Check your connection and try again")
 *     - the recovery actions the chrome should render as buttons
 *     - whether the failure is worth retrying at all
 *
 *   The two compose: the classifier *reuses* `StreamError` as its
 *   `cause` so a caller that already has a `StreamError` doesn't
 *   lose information when it passes through here.
 *
 * The 5 categories (SPEC §3.5 + TRACKER Phase 5.3):
 *
 *   | category     | trigger                            | recovery offered        |
 *   |--------------|------------------------------------|-------------------------|
 *   | `network`    | HTTP 5xx / DNS / reset / timeout   | retry                   |
 *   | `codec`      | mpv EXIT_FATAL naming a codec      | retry (software decode) |
 *   | `unsupported`| EOF after seek beyond duration    | reset-to-zero + resume  |
 *   | `expired`    | missing API credential             | re-auth                 |
 *   | `blocked`    | SurfaceView null + another player  | stop-other + retry      |
 *   | `unknown`    | everything else                    | retry + close           |
 *
 * `blocked` is deliberately NOT retryable-on-its-own: retrying
 * while another player still owns the native session reproduces
 * the same failure. The action list carries `stop-other` so the
 * chrome can offer the two-step recovery.
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_V19_SPECIFICATION.md` §3.5 (error surface)
 *   + §2.2 (error classifier lives in the VideoController
 *   boundary, not the chrome)
 *   `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 5.3.
 */

import type {StreamError} from '../streamErrors';

// ─── Categories + recovery actions ───────────────────────────────────

/**
 * The 5 documented error categories.
 *
 * The TRACKER writes these as `network` / `codec` / `unsupported`
 * / `expired` / `blocked` / `unknown` — 5 real categories plus
 * the documented catch-all, which is why the union has 6 members.
 */
export type ErrorCategory =
  | 'network'
  | 'codec'
  | 'unsupported'
  | 'expired'
  | 'blocked'
  | 'unknown';

/**
 * The recovery actions the chrome may offer for a failure.
 *
 * These are *intents*, not calls. The classifier never invokes
 * `retry()` or re-auth itself — it only names what should be
 * offered. The controller's command surface owns the actual
 * invocations, so the classifier stays pure and testable.
 */
export type ErrorRecoveryAction =
  /** Re-attempt the load (`VideoController.retry()`). */
  | 'retry'
  /** Dismiss the player surface (`VideoController.close()`). */
  | 'close'
  /** Re-run authentication. */
  | 'reauth'
  /** Seek to 0 and resume playback (the seek-beyond-duration path). */
  | 'reset-to-zero'
  /** Stop the other native player session that owns the SurfaceView. */
  | 'stop-other'
  /**
   * Retry once with hardware decode disabled. mpv-native mapping:
   * `hwdec=no` is what forces libmpv onto its software decode
   * path — there is no `setDecoder` API and inventing one would
   * be a fake control (the same rule as the W3.5.6 quality
   * presets, which map to `hwdec` × `profile`).
   */
  | 'software-decode';

/**
 * A classified failure — what the chrome renders and offers.
 */
export interface ClassifiedError {
  readonly category: ErrorCategory;
  /** Short, human title. e.g. "Couldn't reach the server". */
  readonly title: string;
  /** One sentence of human body copy. */
  readonly message: string;
  /**
   * Ordered recovery actions. First entry is the primary button
   * the chrome should render. May be empty for a terminal
   * category that offers nothing actionable.
   */
  readonly actions: readonly ErrorRecoveryAction[];
  /**
   * True when re-attempting the SAME source could plausibly
   * succeed without the user changing anything. `blocked` and
   * `expired` are false — the session must change first.
   */
  readonly retryable: boolean;
  /**
   * The originating failure, preserved verbatim when it was
   * already a `StreamError` so no information is lost by
   * routing it through the classifier.
   */
  readonly cause?: StreamError;
  /** The raw input, kept for the `__DEV__` log line + bug reports. */
  readonly raw?: unknown;
}

// ─── Copy table ─────────────────────────────────────────────────────

/**
 * Per-category copy + recovery, in one place so the table is
 * reviewable at a glance (SPEC §3.5 mandates the overlay show
 * "a short error title" and "the human-readable error message").
 *
 * Kept as a frozen record rather than scattered template literals
 * so a copy tweak is a one-line diff and the table test can
 * assert every category is present.
 */
const CATEGORY_TABLE: Record<
  ErrorCategory,
  {
    title: string;
    message: string;
    actions: readonly ErrorRecoveryAction[];
    retryable: boolean;
  }
> = {
  network: {
    title: "Couldn't reach the server",
    message: 'Check your connection and try again.',
    actions: ['retry', 'close'],
    retryable: true,
  },
  codec: {
    title: "Can't play this video",
    message: 'The video format may not be supported on this device.',
    actions: ['software-decode', 'retry', 'close'],
    retryable: true,
  },
  unsupported: {
    title: "Can't seek past the end",
    message: 'That position is past the end of this video.',
    actions: ['reset-to-zero', 'close'],
    retryable: true,
  },
  expired: {
    title: 'Sign in again',
    message: 'Your session expired. Sign in to keep watching.',
    actions: ['reauth', 'close'],
    retryable: false,
  },
  blocked: {
    title: 'Another player is active',
    message: 'Stop the other player to watch this here.',
    actions: ['stop-other', 'retry', 'close'],
    retryable: false,
  },
  unknown: {
    title: 'Something went wrong',
    message: 'We hit a problem playing this video.',
    actions: ['retry', 'close'],
    retryable: true,
  },
};

// ─── Signal extraction ──────────────────────────────────────────────

/** A `StreamError` carries `kind`; anything else is unknown-shape. */
function asStreamError(e: unknown): StreamError | undefined {
  if (
    e &&
    typeof e === 'object' &&
    'kind' in e &&
    typeof (e as {kind?: unknown}).kind === 'string'
  ) {
    return e as StreamError;
  }
  return undefined;
}

/**
 * Flatten an arbitrary thrown value into a lowercase haystack we
 * can pattern-match.
 *
 * Deliberately broad: mpv surfaces failures as a Kotlin exception
 * message, an RN Promise rejection, or a bare string depending on
 * where it crossed the bridge. Searching the concatenation of
 * message + code + reason + status + detail is the only
 * shape-agnostic approach that does not require widening the lib
 * (the lib currently surfaces no typed error codes mid-playback —
 * see `streamErrors.ts` header).
 *
 * `name` is deliberately EXCLUDED. Every `new Error(...)` carries
 * `name: "Error"`, so including it put the literal token "error"
 * into the haystack of every single failure — which made every
 * `hasFailure` guard trivially true and collapsed the two-token
 * rules (notably `codec`) into one-token rules. Signal must come
 * from the message or the structured fields, never from the JS
 * error class.
 */
function haystack(e: unknown): string {
  if (e === null || e === undefined) return '';
  if (typeof e === 'string') return e.toLowerCase();
  if (typeof e !== 'object') return String(e).toLowerCase();
  const o = e as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of ['message', 'code', 'reason', 'status', 'detail']) {
    const v = o[k];
    if (typeof v === 'string') parts.push(v);
    else if (typeof v === 'number') parts.push(String(v));
  }
  return parts.join(' ').toLowerCase();
}

/**
 * Ordered rules. First match wins, so more specific categories are
 * tested before the broad ones.
 *
 * Order rationale:
 *   1. `expired` / `blocked` — credential + session-shape signals
 *      are unambiguous, so they must not be shadowed by a generic
 *      "network" match on the word "expired request".
 *   2. `codec` — needs an explicit codec token AND a failure
 *      token, because "codec" alone also appears in benign
 *      metadata logs.
 *   3. `unsupported` — the seek-beyond-duration shape.
 *   4. `network` — the broadest transient bucket; matched last so
 *      it only absorbs what the specific rules did not claim.
 *   5. `unknown` — the terminal fallback in `classifyError`.
 */
const RULES: ReadonlyArray<{
  category: ErrorCategory;
  matches: (hay: string, se: StreamError | undefined) => boolean;
}> = [
  {
    // 401 / 403 / explicit auth signals. Checked before `network`
    // so a "403 Forbidden" is not reported as a connectivity
    // problem the user cannot fix by toggling Wi-Fi.
    category: 'expired',
    matches: (hay, se) => {
      if (se?.kind === 'expired') return true;
      if (/\b(401|403)\b/.test(hay)) return true;
      return /(unauthor|forbidden|token\s+(expire|invalid)|api[_-]?key\s*(expire|invalid|missing)|auth\s+failed|credential)/.test(
        hay,
      );
    },
  },
  {
    // SurfaceView null while another player owns the session.
    // Both halves are required — a null SurfaceView on its own is
    // a render-timing issue, not a contention problem, and must
    // not steal the failure from `network`.
    //
    // The `(is\s+)?(already\s+|currently\s+)?(active|...)` chain
    // allows the natural adverbs that appear between the copula
    // and the state word ("another player IS ALREADY ACTIVE"),
    // which is the phrasing the bridge actually emits.
    category: 'blocked',
    matches: (hay) =>
      /(another\s+(player|app|session|instance)\s+(is\s+)?(already\s+|currently\s+|still\s+)?(active|playing|running|in\s+use)|player\s+already\s+(active|in\s+use)|surface\s*(view)?\s*(is\s+)?null[^.]{0,40}(another|active)|single\s+instance|player\s+instance\s+exists)/.test(
        hay,
      ),
  },
  {
    // mpv EXIT_FATAL naming a codec. Requires BOTH a codec token
    // and a failure token so a benign "codec: h264" metadata line
    // does not classify as a codec failure.
    category: 'codec',
    matches: (hay) => {
      const hasCodec =
        /codec|avcodec|videotoolbox|mediacodec|av1|hevc|h\.?265|h\.?264|vp9|avc|exit_fatal|decoder/.test(
          hay,
        );
      const hasFailure =
        /(fatal|unsupported|not\s+supported|failed|error|cannot\s+decode|could\s+not\s+decode|no\s+decoder|invalid\s+data)/.test(
          hay,
        );
      return hasCodec && hasFailure;
    },
  },
  {
    // Seek beyond duration: mpv surfaces this as an EOF reached
    // immediately after the seek, so the message carries both a
    // seek/position token and an EOF/out-of-range token.
    category: 'unsupported',
    matches: (hay, se) => {
      if (se?.kind === 'unsupported') return true;
      const hasSeek = /(seek|position|out\s+of\s+(range|bounds)|beyond)/.test(hay);
      const hasEof = /(eof|end\s+of\s+file|past\s+the\s+end|out\s+of\s+(range|bounds))/.test(
        hay,
      );
      return hasSeek && hasEof;
    },
  },
  {
    // Transient transport failures: 5xx, DNS, reset, timeout.
    // Checked last so it only absorbs the leftovers.
    category: 'network',
    matches: (hay, se) => {
      if (se?.kind === 'network') return true;
      if (/\b(50[0-9]|429)\b/.test(hay)) return true;
      return /(econnreset|econnrefused|enotfound|etimedout|epipe|socket|dns|timeout|timed\s+out|unreachable|network|connection\s+(reset|refused|lost|failed)|failed\s+to\s+fetch|load\s+failed|unable\s+to\s+load|http\s+5\d\d)/.test(
        hay,
      );
    },
  },
];

/**
 * Classify an arbitrary mpv / bridge failure.
 *
 * NEVER throws and NEVER returns undefined — an unrecognized
 * failure yields the `unknown` category. That is the contract the
 * `VideoErrorOverlay` depends on: it always has a title, a body,
 * and at least a close action to render.
 *
 * Pure: same input → same output, no side effects, no clock, no
 * lib access. Fully unit-testable, which is what the Phase 5.3
 * table test + fuzz test exercise.
 *
 * @param e The thrown value / bridge rejection / `StreamError`.
 * @returns A `ClassifiedError` with copy + recovery actions.
 */
export function classifyError(e: unknown): ClassifiedError {
  const hay = haystack(e);
  const se = asStreamError(e);

  // A pre-classified StreamError short-circuits the heuristics for
  // the categories that have a 1:1 counterpart, but still runs
  // `unsupported` / `network` / `expired` guards below so a
  // `StreamError` of kind `unsupported` is not re-typed as
  // `network` by a stray message match.
  let category: ErrorCategory = 'unknown';
  for (const rule of RULES) {
    if (rule.matches(hay, se)) {
      category = rule.category;
      break;
    }
  }

  const row = CATEGORY_TABLE[category];
  return {
    category,
    title: row.title,
    message: row.message,
    actions: row.actions,
    retryable: row.retryable,
    cause: se,
    raw: e,
  };
}
