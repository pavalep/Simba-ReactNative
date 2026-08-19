// ─── Music Screen — renderContent re-export ──────────────────────────
// Re-exports the `renderMusicContent` closure defined in MusicContent.tsx
// so browse/config.ts can bind it on the section config without a circular
// dependency (config is consumed by MusicScreen.tsx, which would
// otherwise import itself).

export {renderMusicContent} from './MusicContent';