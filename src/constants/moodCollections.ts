// ─── Mood Collections (P41.3) ─────────────────────────────────────────────
// Moods are defined as Jamendo genre/tag queries — the collection content is
// always real API data fetched per tag, never a hardcoded track list.

import type {IconName} from '../components/utility/SvgIcon';

export interface MoodCollection {
  id: string;
  name: string;
  icon: IconName;
  /** Jamendo genre tags that power this mood (fetched per tag, merged). */
  tags: string[];
}

export const MOOD_COLLECTIONS: MoodCollection[] = [
  {
    id: 'focus',
    name: 'Focus',
    icon: 'speed',
    tags: ['ambient', 'chillout', 'downtempo'],
  },
  {
    id: 'workout',
    name: 'Workout',
    icon: 'shuffle',
    tags: ['dance', 'electro', 'rock'],
  },
  {
    id: 'chill',
    name: 'Chill',
    icon: 'headphones',
    tags: ['lounge', 'chillout', 'jazz'],
  },
  {
    id: 'upbeat',
    name: 'Upbeat',
    icon: 'music',
    tags: ['pop', 'funk', 'soul'],
  },
  {
    id: 'night',
    name: 'Late Night',
    icon: 'listMusic',
    tags: ['blues', 'jazz', 'downtempo'],
  },
  {
    id: 'travel',
    name: 'Road Trip',
    icon: 'camera',
    tags: ['world', 'latin', 'reggae'],
  },
];
