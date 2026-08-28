"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveLoadingState = deriveLoadingState;
exports.isPreparingPhase = isPreparingPhase;
/**
 * v11 (UI revamp) loading-state derivation.
 *
 * One pure function, one precedence chain, one output. Consumed by the
 * session reducer and any test that needs the same shape the view
 * layer reads.
 *
 * Precedence (highest wins):
 *   1. `phase === 'error'` (or a populated `error` field) → `error`
 *   2. `isSeeking` → `seeking`        — wins over buffering (spec §3.1)
 *   3. `isBuffering` → `buffering`    — the native event has fired
 *   4. `phase ∈ {preparing, connecting}` → `preparing`
 *   5. otherwise → `idle`             — pill hidden
 *
 * `reconnecting` is reserved for a future transport-reset wave; no
 * rule currently produces it. The destination on `seeking` is `0` for
 * now (the snapshot does not yet carry the seek target); the rail
 * scrub tooltip will plumb the real value in a later phase.
 */
function deriveLoadingState(snapshot) {
    const error = snapshot.error;
    if (snapshot.phase === 'error' || error !== null) {
        return {
            kind: 'error',
            message: error?.message ?? 'Playback error',
            recoverable: error?.recoverable ?? false,
        };
    }
    if (snapshot.isSeeking) {
        return { kind: 'seeking', to: 0 };
    }
    if (snapshot.isBuffering) {
        return { kind: 'buffering', cacheFill: snapshot.cacheFill };
    }
    if (snapshot.phase === 'preparing' ||
        snapshot.phase === 'connecting') {
        return { kind: 'preparing' };
    }
    return { kind: 'idle' };
}
/**
 * Type-level guard for `phase` to make the rule above easier to read at
 * the call site; not exported to keep the public surface tight.
 */
function isPreparingPhase(phase) {
    return phase === 'preparing' || phase === 'connecting';
}
