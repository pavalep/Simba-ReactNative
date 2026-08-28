"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyVideoSnapshot = emptyVideoSnapshot;
function emptyVideoSnapshot() {
    return {
        generation: 0,
        source: null,
        sourceFingerprint: null,
        phase: 'idle',
        position: 0,
        duration: null,
        isPlaying: false,
        isEnded: false,
        isBuffering: false,
        isSeeking: false,
        isSeekable: false,
        isLive: false,
        bufferedRanges: [],
        cacheFill: 0,
        tracks: [],
        chapters: [],
        currentChapterId: null,
        volume: 100,
        isMuted: false,
        speed: 1,
        hasFirstFrame: false,
        hasSurfaceAttached: false,
        videoMetrics: null,
        error: null,
        loadingState: { kind: 'idle' },
        isLoading: false,
    };
}
