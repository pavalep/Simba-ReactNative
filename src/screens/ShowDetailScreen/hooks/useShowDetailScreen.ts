// ─── TV Show Detail Hook ───────────────────────────────────────────────
// Phase 38.2/38.4: show + episode list from TVMaze; local video files are
// matched to episodes by filename (S01E02 patterns) for enrichment.
//
// V18.3.3: migrated to useApiQuery. The two parallel fetches
// (`Promise.all([getShowById, getEpisodeList])`) stay parallel —
// they happen inside the queryFn. The `seasons` and `matchedCount`
// derivations stay as `useMemo` (pure data transforms).

import {useMemo} from 'react';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {getShowById, getEpisodeList} from '../../../infrastructure/api/tvmaze/adapter';
import {
  fileNameMatchesShow,
  fileNameMatchesEpisode,
} from '../../../services/episodeMatcher';
import type {TVMazeShow, TVMazeEpisode} from '../../../types/api';
import {useMediaStore, useMediaVideoTracks} from '../../../state';

export interface MatchedEpisode {
  episode: TVMazeEpisode;
  /** Local file uri when a matching local video exists (P38.4). */
  localUri: string | null;
}

export function useShowDetailScreen(showId: number) {
  const localVideos = useMediaVideoTracks();

  const {data, isFetching, error, refetch} = useApiQuery<{
    show: TVMazeShow;
    episodes: TVMazeEpisode[];
  }>({
    queryKey: ['tvmaze', 'show', showId],
    queryFn: () =>
      Promise.all([getShowById(showId), getEpisodeList(showId)]).then(
        ([show, episodes]) => ({show, episodes}),
      ),
    staleTime: 60 * 60 * 1000,
  });

  const show = data?.show ?? null;
  const episodes = data?.episodes ?? [];

  // ── Group episodes by season, each matched to a local file ──
  const seasons = useMemo((): {season: number; items: MatchedEpisode[]}[] => {
    if (!show) return [];
    const map = new Map<number, MatchedEpisode[]>();
    for (const episode of episodes) {
      const local = localVideos.find(
        t =>
          fileNameMatchesShow(t.title, show.name) &&
          fileNameMatchesEpisode(t.title, episode.season, episode.number),
      );
      const entry: MatchedEpisode = {
        episode,
        localUri: local ? local.uri : null,
      };
      const list = map.get(episode.season);
      if (list) {
        list.push(entry);
      } else {
        map.set(episode.season, [entry]);
      }
    }
    return Array.from(map.entries())
      .map(([season, items]) => ({
        season,
        items: items.sort(
          (a, b) => (a.episode.number ?? 0) - (b.episode.number ?? 0),
        ),
      }))
      .sort((a, b) => a.season - b.season);
  }, [show, episodes, localVideos]);

  const matchedCount = useMemo(
    () =>
      seasons.reduce(
        (acc, s) => acc + s.items.filter(i => i.localUri).length,
        0,
      ),
    [seasons],
  );

  return {
    show,
    seasons,
    matchedCount,
    isLoading: isFetching,
    error: error?.message ?? null,
    retry: () => {
      void refetch();
    },
  };
}
