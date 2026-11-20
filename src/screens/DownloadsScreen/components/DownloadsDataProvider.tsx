// ─── Downloads — DownloadsDataProvider ─────────────────────────────────
// Sits ABOVE the shell so the page's data has ONE owner.
//
// WAVE B16 (Wave B2) — this file is new.
//
// The provider exists for the same reason the Music, Movies, Podcasts,
// Audiobooks and All Audio screens have one: the page's data must have
// one owner, and the content component must not reach for the
// download service itself.
//
// The page declares no search and no option groups, so there is no
// shell-owned scope to push DOWN into it — the provider's job here is
// narrower than its siblings': it owns the page's data and its
// actions, and the content reads them.

import React, {useCallback, useContext, useMemo, type ReactNode} from 'react';
import {useDownloadsScreen} from '../hooks/useDownloadsScreen';

type DownloadsPage = ReturnType<typeof useDownloadsScreen>;

interface DownloadsDataContextValue extends DownloadsPage {}

const DownloadsDataContext = React.createContext<DownloadsDataContextValue | null>(
  null,
);

export function useDownloadsData(): DownloadsDataContextValue {
  const ctx = useContext(DownloadsDataContext);
  if (!ctx) {
    throw new Error('useDownloadsData must be used inside <DownloadsDataProvider>.');
  }
  return ctx;
};

export const DownloadsDataProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const page = useDownloadsScreen();

  // The actions are stable identities, so the content's callbacks do
  // not re-render the list on every pass.
  const stablePauseResume = useCallback(
    (uri: string, status: string) => page.handlePauseResume(uri, status),
    [page.handlePauseResume],
  );
  const stableRetry = useCallback((uri: string) => page.handleRetry(uri), [
    page.handleRetry,
  ]);
  const stablePlay = useCallback(
    (record: DownloadsPage['records'][number]) => page.handlePlay(record),
    [page.handlePlay],
  );
  const stableSetConfirmUri = useCallback<DownloadsPage['setConfirmUri']>(
    uri => page.setConfirmUri(uri),
    [page.setConfirmUri],
  );

  const value = useMemo<DownloadsDataContextValue>(
    () => ({
      ...page,
      handlePauseResume: stablePauseResume,
      handleRetry: stableRetry,
      handlePlay: stablePlay,
      setConfirmUri: stableSetConfirmUri,
    }),
    [
      page,
      stablePauseResume,
      stableRetry,
      stablePlay,
      stableSetConfirmUri,
    ],
  );

  return (
    <DownloadsDataContext.Provider value={value}>
      {children}
    </DownloadsDataContext.Provider>
  );
};