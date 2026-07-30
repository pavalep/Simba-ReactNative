// ─── Music Screen Hook ─────────────────────────────────────────────────
// Manages category/search state and fetches tracks from Jamendo and Audius.

import {useState, useEffect} from 'react';
import {MUSIC_CATEGORIES} from '../../../constants/musicCategories';
import {
  searchJamendoTracks,
  getJamendoTracksByGenre,
} from '../../../services/api/jamendoService';
import {
  searchAudiusTracks,
  getAudiusTracksByGenre,
} from '../../../services/api/audiusService';


// ─── Display Item ────────────────────────────────────────────────────────

export interface MusicTrackDisplayItem {
  id: number | string;
  title: string;
  artistName: string;
  duration: number;
  imageUrl: string;
  albumName?: string;
  source: 'jamendo' | 'audius';
}

// ─── Hook ────────────────────────────────────────────────────────────────

export function useMusicScreen(initialGenre?: string) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialGenre ?? MUSIC_CATEGORIES[0]?.genre ?? '',
  );
  const [results, setResults] = useState<MusicTrackDisplayItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tracks when category or search changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        if (searchQuery.trim()) {
          // ── Search mode ──
          const [jamendoResult, audiusResult] = await Promise.allSettled([
            searchJamendoTracks(searchQuery),
            searchAudiusTracks(searchQuery),
          ]);

          if (cancelled) return;

          const combined: MusicTrackDisplayItem[] = [];

          if (jamendoResult.status === 'fulfilled') {
            combined.push(
              ...jamendoResult.value.map(t => ({
                id: t.id,
                title: t.name,
                artistName: t.artistName,
                duration: t.duration,
                imageUrl: t.imageUrl,
                albumName: t.albumName,
                source: 'jamendo' as const,
              })),
            );
          }

          if (audiusResult.status === 'fulfilled') {
            combined.push(
              ...audiusResult.value.map(t => ({
                id: t.id,
                title: t.title,
                artistName: t.artistName,
                duration: t.duration,
                imageUrl: t.artworkUrl,
                source: 'audius' as const,
              })),
            );
          }

          setResults(combined);
        } else if (selectedCategory) {
          // ── Genre mode ──
          const [jamendoResult, audiusResult] = await Promise.allSettled([
            getJamendoTracksByGenre(selectedCategory),
            getAudiusTracksByGenre(selectedCategory),
          ]);

          if (cancelled) return;

          const combined: MusicTrackDisplayItem[] = [];

          if (jamendoResult.status === 'fulfilled') {
            combined.push(
              ...jamendoResult.value.map(t => ({
                id: t.id,
                title: t.name,
                artistName: t.artistName,
                duration: t.duration,
                imageUrl: t.imageUrl,
                albumName: t.albumName,
                source: 'jamendo' as const,
              })),
            );
          }

          if (audiusResult.status === 'fulfilled') {
            combined.push(
              ...audiusResult.value.map(t => ({
                id: t.id,
                title: t.title,
                artistName: t.artistName,
                duration: t.duration,
                imageUrl: t.artworkUrl,
                source: 'audius' as const,
              })),
            );
          }

          setResults(combined);
        } else {
          setResults([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load tracks',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedCategory, searchQuery]);

  return {
    selectedCategory,
    setSelectedCategory,
    results,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
  };
}
