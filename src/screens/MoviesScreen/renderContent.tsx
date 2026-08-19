// ─── Movies Screen — renderContent re-export ─────────────────────────
// Re-exports the `renderMoviesContent` closure defined in MoviesContent.tsx
// so browse/config.ts can bind it on the section config without a circular
// dependency (config is consumed by MoviesScreen.tsx, which would
// otherwise import itself).

export {renderMoviesContent} from './MoviesContent';