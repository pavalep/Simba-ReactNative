// ─── Audiobook Detail Screen Hook ──────────────────────────────────────
// Phase 37.2/37.3: fetch a LibriVox book + its chapter list from the
// Internet Archive metadata (the same item backs LibriVox streaming).
//
// V18.3.3: migrated to a single useApiQuery. The book lookup + the
// archive-track lookup stay sequential (the second fetch depends on
// the first) but happen inside one queryFn so the consumer still
// sees one loading state. The Internet Archive service is not yet
// V18-migrated (Wave 5), so it stays imported from the legacy file.

import {useApiQuery} from '../../../hooks/useApiQuery';
import {getAudiobookById} from '../../../infrastructure/api/librivox/adapter';
import {
  getArchiveTracks,
  archiveIdentifierFromUrl,
} from '../../../infrastructure/api/internetArchive/adapter';
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
  const {data, isFetching, error, refetch} = useApiQuery<{
    book: AudiobookResult;
    chapters: ArchiveTrack[];
  } | null>({
    queryKey: ['librivox', 'byId', bookId],
    queryFn: async () => {
      const bookData = await getAudiobookById(bookId);
      if (!bookData) throw new Error('Audiobook not found');
      const identifier = archiveIdentifierFromUrl(bookData.urlIArchive);
      const chapters = identifier ? await getArchiveTracks(identifier) : [];
      return {book: bookData, chapters};
    },
    staleTime: 60 * 60 * 1000,
  });

  return {
    book: data?.book ?? null,
    chapters: data?.chapters ?? [],
    isLoading: isFetching,
    error: error?.message ?? null,
    retry: () => {
      void refetch();
    },
  };
}
