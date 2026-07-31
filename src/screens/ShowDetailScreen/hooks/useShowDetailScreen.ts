// ─── TV Show Detail Hook ───────────────────────────────────────────────
// Phase 38.2/38.4: show + episode list from TVMaze; local video files are
// matched to episodes by filename (S01E02 patterns) for enrichment.

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createSelector} from '@reduxjs/toolkit';
import {getShowById, getEpisodeList} from '../../../services/api/tvmazeService';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import {useAppSelector} from '../../../store';
import {
  fileNameMatchesShow,
  fileNameMatchesEpisode,
} from '../../../services/episodeMatcher';
import type {TVMazeShow, TVMazeEpisode} from '../../../types/api';

// 59.2: stable selector — inline filters re-ran on EVERY store dispatch
// (incl. mpv position ticks) and re-rendered the whole screen.
const selectLocalVideos = createSelector([selectAllTracks], tracks =>
  tracks.filter(t => t.mediaType === 'video'),
);

export interface MatchedEpisode {
  episode: TVMazeEpisode;
  /** Local file uri when a matching local video exists (P38.4). */
  localUri: string | null;
}

export function useShowDetailScreen(showId: number) {
  const localVideos = useAppSelector(selectLocalVideos);
  const [show, setShow] = useState<TVMazeShow | null>(null);
  const [episodes, setEpisodes] = useState<TVMazeEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const load = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const [showData, episodeData] = await Promise.all([
        getShowById(showId),
        getEpisodeList(showId),
      ]);
      setShow(showData);
      setEpisodes(episodeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load show');
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const retry = useCallback(() => {
    load();
  }, [load]);

  return {
    show,
    seasons,
    matchedCount,
    isLoading,
    error,
    retry,
  };
}
