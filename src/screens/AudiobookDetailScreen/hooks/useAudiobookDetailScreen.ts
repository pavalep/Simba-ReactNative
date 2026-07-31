// ─── Audiobook Detail Screen Hook ──────────────────────────────────────
// Phase 37.2/37.3: fetch a LibriVox book + its chapter list from the
// Internet Archive metadata (the same item backs LibriVox streaming).

import {useState, useEffect, useCallback} from 'react';
import {getAudiobookById} from '../../../services/api/librivoxService';
import {
  getArchiveTracks,
  archiveIdentifierFromUrl,
} from '../../../services/api/internetArchiveService';
import type {AudiobookResult, ArchiveTrack} from '../../../types/api';

interface UseAudiobookDetailScreenReturn {
  book: AudiobookResult | null;
  chapters: ArchiveTrack[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useAudiobookDetailScreen(
  bookId: number,
): UseAudiobookDetailScreenReturn {
  const [book, setBook] = useState<AudiobookResult | null>(null);
  const [chapters, setChapters] = useState<ArchiveTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const bookData = await getAudiobookById(bookId);
      if (!bookData) {
        setError('Audiobook not found');
        return;
      }
      setBook(bookData);
      const identifier = archiveIdentifierFromUrl(bookData.urlIArchive);
      if (identifier) {
        const tracks = await getArchiveTracks(identifier);
        setChapters(tracks);
      } else {
        setChapters([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audiobook');
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {book, chapters, isLoading, error, retry: fetchData};
}
