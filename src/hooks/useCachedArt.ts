import {useEffect, useState} from 'react';

import {isRemoteUri} from '../utils/mediaUri';
import {
  getCachedArtPathSync,
  getCachedArtPath,
  cacheArt,
} from '../services/artCacheService';

/**
 * Resolve a remote artwork URL to a locally cached `file://` path (P33.7).
 * Returns null for local/empty URIs and while the first fetch is in flight.
 * Once cached, later calls resolve synchronously from memory (59.4) so
 * remounts (list recycling, re-navigation) render art instantly with no
 * placeholder flash — zero scroll flicker.
 */
export function useCachedArt(uri: string | null | undefined): string | null {
  // 59.4: sync memory hit on first render — no async disk round-trip for
  // already-cached art, so remounts never flash the placeholder.
  const [cached, setCached] = useState<string | null>(() =>
    uri ? getCachedArtPathSync(uri) : null,
  );

  useEffect(() => {
    let cancelled = false;
    if (!uri || !isRemoteUri(uri)) {
      setCached(null);
      return;
    }
    // Already resolved synchronously — skip the disk check entirely.
    if (getCachedArtPathSync(uri)) return;
    (async () => {
      const existing = await getCachedArtPath(uri);
      if (cancelled) return;
      if (existing) {
        setCached(existing);
        return;
      }
      const downloaded = await cacheArt(uri);
      if (!cancelled) setCached(downloaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return cached;
}
