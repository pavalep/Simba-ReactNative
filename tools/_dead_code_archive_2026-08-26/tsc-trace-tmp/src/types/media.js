"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDIA_KIND_LABELS = void 0;
exports.mediaKindToLane = mediaKindToLane;
exports.normalizeMediaClassification = normalizeMediaClassification;
exports.linkedMediaFolderId = linkedMediaFolderId;
exports.linkedMediaFolderIdFromPath = linkedMediaFolderIdFromPath;
exports.classifyLocalMedia = classifyLocalMedia;
exports.classifyApiMedia = classifyApiMedia;
/** Stable display labels reserved for the future badge system. */
exports.MEDIA_KIND_LABELS = {
    audio: 'Audio',
    music: 'Music',
    podcast: 'Podcast',
    audiobook: 'Audiobook',
    radio: 'Radio',
    video: 'Video',
    movie: 'Movie',
    'live-tv': 'Live TV',
    'archive-audio': 'Archive Audio',
    'archive-video': 'Archive Video',
};
const AUDIO_KINDS = new Set([
    'audio',
    'music',
    'podcast',
    'audiobook',
    'radio',
    'archive-audio',
]);
/** Convert a semantic kind into the queue/player lane. */
function mediaKindToLane(kind) {
    return AUDIO_KINDS.has(kind) ? 'audio' : 'video';
}
/** Normalize a legacy or partially populated record at a state boundary. */
function normalizeMediaClassification(input) {
    const type = input.type ?? input.mediaType ?? 'audio';
    const mediaType = input.mediaType ?? mediaKindToLane(type);
    return {
        source: input.source ?? 'local',
        type,
        mediaType,
        ...(input.provider ? { provider: input.provider } : {}),
        ...(input.folderId ? { folderId: input.folderId } : {}),
    };
}
/** Build a deterministic folder identity at the settings/scanner boundary. */
function linkedMediaFolderId(path, mediaType) {
    return `local-folder:${mediaType}:${path.trim().replace(/\\/g, '/')}`;
}
/** Backward-compatible path-only identity used by folder-browser callers. */
function linkedMediaFolderIdFromPath(path) {
    return linkedMediaFolderId(path, 'audio');
}
/** Build the canonical classification for a local file scanner result. */
function classifyLocalMedia(mediaType) {
    return {
        source: 'local',
        type: mediaType,
        mediaType,
    };
}
/** Build an API classification while retaining the provider for future badges. */
function classifyApiMedia(type, provider) {
    return {
        source: 'api',
        type,
        mediaType: mediaKindToLane(type),
        ...(provider ? { provider } : {}),
    };
}
