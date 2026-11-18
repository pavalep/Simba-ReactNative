// ─── Radio — Data Provider ───────────────────────────────────────────
//
// It sits ABOVE the browse shell, so the content and the shell share ONE
// query instance and ONE scope.
//
// The SHELL owns the scope's VALUES (the three filter axes and the search
// term live in `useSectionOptions` / `useSectionSearch`); this provider
// owns the scope's STATE and the query that answers it. The content
// pushes the shell's values down through `setScope`, exactly as the Music
// screen pushes its genre down through `setActiveGenre`.
//
// It also owns the station's press handler, because the content has no
// screen `navigation` and the launch seam is a provider-level concern.

import React, {useCallback, useMemo, useState, type ReactNode} from 'react';
import {
  useRadioScreen,
  EMPTY_RADIO_SCOPE,
  type RadioScope,
  type UseRadioScreenResult,
} from '../hooks/useRadioScreen';
import {resolveStreamType, useResumeAwareLaunch} from '../../../infrastructure/player';
import type {StationRow} from '../related/stationRow';

interface RadioDataContextValue extends UseRadioScreenResult {
  /** The scope the query is currently answering. */
  scope: RadioScope;
  /** Point the query at a new scope. */
  setScope: (scope: RadioScope) => void;
  /** Play the station. */
  handleStationPress: (row: StationRow) => void;
}

const RadioDataContext = React.createContext<RadioDataContextValue | null>(null);

export function useRadioData(): RadioDataContextValue {
  const ctx = React.useContext(RadioDataContext);
  if (!ctx) {
    throw new Error('useRadioData must be used inside <RadioDataProvider>.');
  }
  return ctx;
}

export const RadioDataProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [scope, setScopeState] = useState<RadioScope>(EMPTY_RADIO_SCOPE);
  const radio = useRadioScreen(scope);
  const {openPlayer} = useResumeAwareLaunch();

  // A STABLE setter: the content calls it from an effect, and an
  // unstable identity would re-run that effect on every render.
  const setScope = useCallback((next: RadioScope) => {
    setScopeState(prev => {
      if (
        prev.genre === next.genre &&
        prev.country === next.country &&
        prev.language === next.language &&
        prev.searchTerm === next.searchTerm
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const handleStationPress = useCallback(
    (row: StationRow) => {
      openPlayer({
        uri: row.url,
        title: row.name,
        type: resolveStreamType('radio'),
        // The KIND and the LANE, not just the lane.
        //
        // `resolveStreamType('radio')` is the LANE ('audio'), and the
        // seam defaults the kind to the lane — so the station was
        // recorded in Recently Played as type 'audio' instead of 'radio',
        // even though the app HAS a label for it (`src/types/media.ts`:
        // radio → 'Radio').
        mediaKind: 'radio',
        mediaLane: 'audio',
        ...(row.image ? {thumbnailPath: row.image} : {}),
      });
    },
    [openPlayer],
  );

  const value = useMemo<RadioDataContextValue>(
    () => ({
      ...radio,
      scope,
      setScope,
      handleStationPress,
    }),
    [radio, scope, setScope, handleStationPress],
  );

  return (
    <RadioDataContext.Provider value={value}>{children}</RadioDataContext.Provider>
  );
};
