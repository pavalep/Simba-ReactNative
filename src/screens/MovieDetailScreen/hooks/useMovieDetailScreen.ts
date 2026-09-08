// ─── Movie Detail Screen Hook ───────────────────────────────────────────
// Fetches detailed info about an Internet Archive movie by identifier.
//
// V18.5.3: migrated to `useApiQuery` per V18 ideal. The `onRetry`
// callback (for partial-replication retry) is exposed as
// `retry: () => void` for the consumer; the retry-with-callback
// form is still available as the underlying `resolveInternetArchiveVideoDetails`
// call (the V18 hook surface is the no-arg form, matching the rest
// of the V18 family).

import {useApiQuery} from '../../../hooks/useApiQuery';
import {getInternetArchiveVideoDetails} from '../../../services/api/internetArchiveAdapter';
import type {InternetArchiveVideoResult} from '../../../types/api';

export function useMovieDetailScreen(identifier: string) {
  const q = useApiQuery<InternetArchiveVideoResult | null>({
    queryKey: ['internetArchive', 'videoDetails', identifier],
    queryFn: () => getInternetArchiveVideoDetails(identifier),
    enabled: !!identifier,
  });

  return {
    item: q.data ?? null,
    isLoading: q.isFetching,
    error: (q.error as Error | null)?.message ?? null,
    retry: () => {
      void q.refetch();
    },
  };
}
