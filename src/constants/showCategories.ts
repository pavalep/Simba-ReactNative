// ─── TV Shows Browse Constants ─────────────────────────────────────────
// Phase 38: browse entries for the TV shows (TVMaze) screens + Home shelf.
// Each mode maps to a real TVMaze endpoint (no fake data).

/** Home shelf entries for the Shows section (P38.7). */
export interface ShowsBrowseEntry {
  id: 'search' | 'today' | 'browse';
  name: string;
  description: string;
  icon: string;
}

export const SHOWS_BROWSE: ShowsBrowseEntry[] = [
  {
    id: 'search',
    name: 'Search',
    description: 'Find any TV show',
    icon: 'search',
  },
  {
    id: 'today',
    name: 'On Today',
    description: 'What airs right now',
    icon: 'bell',
  },
  {
    id: 'browse',
    name: 'Popular',
    description: 'Browse the TVMaze catalog',
    icon: 'layoutGrid',
  },
];
