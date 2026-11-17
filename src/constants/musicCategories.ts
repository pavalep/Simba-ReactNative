// ─── Pre-built Music Categories ─────────────────────────────────────────
// The genre list for Jamendo / Audius discovery.
//
// 'all' is a synthetic first tile — the Home screen maps it to the
// MusicScreen Popular tab (a "browse everything trending" view).
//
// Only `id` and `name` are read: the browse sheet's rows are keyed by
// `id` and labelled by `name` (`MusicScreen/related/browseConfig.ts`),
// and the active chip is looked up by `id`
// (`MusicScreen/components/MusicContent.tsx`). The per-genre `icon`,
// `genre` and `image` fields were never read by anything, and the ten
// per-genre cover plates they pointed at were dead weight in the bundle
// — the Home rail's one music card uses `CATEGORY_COVERS.music.all`
// (`Home/components/BrowseAllShelf.tsx`).

export interface MusicCategory {
  id: string;
  name: string;
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  {id: 'all',        name: 'All'},
  {id: 'rock',       name: 'Rock'},
  {id: 'pop',        name: 'Pop'},
  {id: 'electronic', name: 'Electronic'},
  {id: 'jazz',       name: 'Jazz'},
  {id: 'classical',  name: 'Classical'},
  {id: 'hip-hop',    name: 'Hip-Hop'},
  {id: 'ambient',    name: 'Ambient'},
  {id: 'folk',       name: 'Folk'},
  {id: 'blues',      name: 'Blues'},
  {id: 'reggae',     name: 'Reggae'},
];
