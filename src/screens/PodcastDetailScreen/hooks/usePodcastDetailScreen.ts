// ─── Podcast Detail Screen Hook ───────────────────────────────────────
// Loads the podcast + its first page of episodes. Paginated by doubling
// `max` against the `/episodes/byfeedid` endpoint (no true offset) until
// a short page or the API cap is hit.
//
// Guards:
//   • seqRef       — drops stale responses when the API races a fast
//                    re-mount (podcastId changes mid-flight).
//   • inFlightRef  — one in-flight fetch at a time.
//   • throttle     — onEndReached can't pound the API.
//
// State model mirrors PodcastsScreen/usePodcastsScreen (single
// current-list, no per-scope cache, fresh fetch on every podcastId
// change).

import {useCallback, useEffect, useRef, useState} from 'react';
import {getPodcastById, getEpisodes} from '../../../services/api/podcastIndexService';
import type {PodcastResult, PodcastEpisodeResult} from '../../../types/api';
import text from '../related/textContent.json';
import {
  INITIAL_MAX,
  LOAD_MORE_THROTTLE_MS,
  MAX_RESULTS_PER_QUERY,
} from '../related/constants';

interface UsePodcastDetailScreenReturn {
  podcast: PodcastResult | null;
  episodes: PodcastEpisodeResult[];
  /** Episodes requested from the API on the last call (not the API cap). */
  maxRequested: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasLoaded: boolean;
  reachedEnd: boolean;
  loadMore: () => void;
  retry: () => void;
}

export function usePodcastDetailScreen(
  podcastId: number,
): UsePodcastDetailScreenReturn {
  const [podcast, setPodcast] = useState<PodcastResult | null>(null);
  const [episodes, setEpisodes] = useState<PodcastEpisodeResult[]>([]);
  const [maxRequested, setMaxRequested] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seqRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastLoadMoreAtRef = useRef(0);
  // Stash the latest loadMore for the throttle gate — never re-fires
  // when only the function identity changes.
  const loadMoreRef = useRef<() => void>(() => {});

  // ── Initial fetch (podcast + first window of episodes) ────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      setIsLoading(true);
      setError(null);
      setHasLoaded(false);
      seqRef.current++;
      inFlightRef.current = false;
      const seq = seqRef.current;

      try {
        const [podcastData, episodesData] = await Promise.all([
          getPodcastById(podcastId),
          getEpisodes(podcastId, INITIAL_MAX),
        ]);

        if (cancelled || seq !== seqRef.current) return;

        setPodcast(podcastData);
        setEpisodes(episodesData);
        setMaxRequested(INITIAL_MAX);
        setHasLoaded(true);
      } catch (err) {
        if (cancelled || seq !== seqRef.current) return;
        setError(
          err instanceof Error ? err.message : text.errors.loadFailed,
        );
        setHasLoaded(true);
      } finally {
        if (!cancelled && seq === seqRef.current) {
          setIsLoading(false);
        }
      }
    }

    fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [podcastId]);

  // ── Load the next page (called from onEndReached) ──────────────────
  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore) return;
    const max = maxRequested || INITIAL_MAX;
    // Short page = no more to fetch.
    if (episodes.length < max) return;
    // API ceiling reached.
    if (max >= MAX_RESULTS_PER_QUERY) return;

    const now = Date.now();
    if (now - lastLoadMoreAtRef.current < LOAD_MORE_THROTTLE_MS) return;
    lastLoadMoreAtRef.current = now;

    const nextMax = Math.min(max * 2, MAX_RESULTS_PER_QUERY);
    const seq = ++seqRef.current;

    setIsLoadingMore(true);
    getEpisodes(podcastId, nextMax)
      .then(data => {
        if (seq !== seqRef.current) return; // stale
        setEpisodes(prev => dedupeEpisodes(prev, data));
        setMaxRequested(nextMax);
      })
      .catch(err => {
        if (seq !== seqRef.current) return;
        setError(
          err instanceof Error ? err.message : text.errors.loadFailed,
        );
      })
      .finally(() => {
        if (seq === seqRef.current) setIsLoadingMore(false);
      });
  }, [isLoading, isLoadingMore, maxRequested, episodes.length, podcastId]);

  loadMoreRef.current = loadMore;

  const retry = useCallback(() => {
    // Re-fire the initial effect by triggering the load — simplest path
    // is to call the same load function with a state reset.
    seqRef.current++;
    inFlightRef.current = false;
    setIsLoading(true);
    setError(null);
    setHasLoaded(false);
    const seq = seqRef.current;
    Promise.all([
      getPodcastById(podcastId),
      getEpisodes(podcastId, INITIAL_MAX),
    ])
      .then(([podcastData, episodesData]) => {
        if (seq !== seqRef.current) return;
        setPodcast(podcastData);
        setEpisodes(episodesData);
        setMaxRequested(INITIAL_MAX);
        setHasLoaded(true);
      })
      .catch(err => {
        if (seq !== seqRef.current) return;
        setError(
          err instanceof Error ? err.message : text.errors.loadFailed,
        );
        setHasLoaded(true);
      })
      .finally(() => {
        if (seq === seqRef.current) setIsLoading(false);
      });
  }, [podcastId]);

  const reachedEnd =
    hasLoaded &&
    !error &&
    (episodes.length < maxRequested || maxRequested >= MAX_RESULTS_PER_QUERY);

  return {
    podcast,
    episodes,
    maxRequested,
    isLoading,
    isLoadingMore,
    hasLoaded,
    error,
    reachedEnd,
    loadMore,
    retry,
  };
}

/** Drop episodes the paginated response re-emits (same id seen). */
function dedupeEpisodes(
  prev: PodcastEpisodeResult[],
  next: PodcastEpisodeResult[],
): PodcastEpisodeResult[] {
  const seen = new Set(prev.map(e => e.id));
  const out = [...prev];
  for (const ep of next) {
    if (!seen.has(ep.id)) {
      out.push(ep);
      seen.add(ep.id);
    }
  }
  return out;
}