// v11 T1.1 validation: log-trace the loading-state derivation across
// the two canonical sequences the tracker step 6 requires:
//   1. load → preparing → idle
//   2. stall → buffering → idle
// Plus a stale-generation guard check.
import {reduceVideoSessionEvent} from '../src/modules/playback/video/state/reduceVideoSessionEvent.ts';
import {emptyVideoSnapshot} from '../src/modules/playback/video/domain/VideoTypes.ts';

function fmt(state) {
  return `phase=${state.phase.padEnd(11)} isBuffering=${String(state.isBuffering).padEnd(5)} isSeeking=${String(state.isSeeking).padEnd(5)} error=${state.error ? 'set' : 'null '} loadingState=${JSON.stringify(state.loadingState)} isLoading=${state.isLoading}`;
}

const GEN = 1;
let s = {...emptyVideoSnapshot(), generation: GEN, source: {uri: 'x', title: 't', source: 'local', type: 'video', mediaLane: 'video'}};
console.log('--- T1.1 trace ---');
console.log('initial           ', fmt(s));

// Sequence 1: file-loaded → preparing
s = reduceVideoSessionEvent(s, {type: 'file-loaded', generation: GEN});
console.log('file-loaded       ', fmt(s));

// first-frame → playing → idle
s = reduceVideoSessionEvent(s, {type: 'playback-state-changed', generation: GEN, isPlaying: true});
console.log('playback-state +  ', fmt(s));
s = reduceVideoSessionEvent(s, {type: 'first-frame', generation: GEN});
console.log('first-frame       ', fmt(s));

// Sequence 2: buffering → buffering
s = reduceVideoSessionEvent(s, {type: 'buffering-changed', generation: GEN, isBuffering: true, cacheFill: 0.62});
console.log('buffering 62%     ', fmt(s));

// recovery → idle
s = reduceVideoSessionEvent(s, {type: 'playback-restart', generation: GEN});
console.log('playback-restart  ', fmt(s));

// Stale generation guard: a playback-restart from generation 99 should NOT clear a real stall
s = reduceVideoSessionEvent(s, {type: 'buffering-changed', generation: GEN, isBuffering: true, cacheFill: 0.4});
console.log('stall again 40%   ', fmt(s));
const stale = reduceVideoSessionEvent(s, {type: 'playback-restart', generation: 99});
console.log('STALE gen 99      ', fmt(stale), '<-- must equal previous');
console.log('still stalled?    ', stale.loadingState.kind === 'buffering' && stale.isBuffering === true ? 'OK' : 'FAIL');

// Error path
s = reduceVideoSessionEvent(s, {type: 'error', generation: GEN, message: 'no first frame', recoverable: true});
console.log('error             ', fmt(s));
