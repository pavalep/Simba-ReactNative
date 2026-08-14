// ─── v10: Tab-Source Unification ─────────────────────────────────────────
// Phase 1.2. The 8 section screens historically built their tab bars from 4
// different source shapes:
//   1. constants            — MOVIE_CATEGORIES, PODCAST_TABS
//   2. hook exports         — MUSIC_TABS, RADIO_TABS, LIVE_TV_TABS
//   3. screen-local arrays  — Audiobooks, Shows
//   4. inline routes        — Archive
// This module normalizes every one of them to the unified `SectionTab`
// shape and resolves the mount-time preselect index from route params.
//
// ─── AUDIT — exact current tab lists (byte-identical regression target) ──
// Movies    (9): all, classic-films, public-domain, documentaries,
//                silent-films, comedy, sci-fi, western, film-noir
//                → All, Classic Films, Public Domain, Documentaries,
//                  Silent Films, Comedy, Sci-Fi, Westerns, Film Noir
// Music     (3): search→Search, genres→Genres, popular→Popular
// Radio     (5): top→Top, genres→Genres, countries→Countries,
//                languages→Languages, favorites→Favorites
// Live TV   (3): all→All Channels, categories→Categories, favorites→Favorites
// Audiobooks(3): search→Search, genres→Genres, recent→New Releases
// Podcasts (12): All, Arts, Music, Business, Comedy, Education, Health,
//                Technology, History, News, Science, Sports
//                (PODCAST_TABS slice(0,12); tab key == title)
// Shows     (3): search→Search, today→Today, browse→Browse
// Archive   (2): audio→Audio, video→Video

import {useCallback, useMemo, useState} from 'react';
import type {SectionBrowseConfig, SectionTab} from '../sectionConfig';

// ─── Normalizer ──────────────────────────────────────────────────────────

/** Anything the 8 sections use today as a tab source. */
export type SectionTabSource =
  | ReadonlyArray<{key: string | number; title: string}>
  | ReadonlyArray<{id: string | number; name: string}>
  | Record<string, string>;

/**
 * Normalize any of the 4 historical tab-source shapes to `SectionTab[]`.
 * Keys/titles are stringified defensively (podcast ids are numbers; the
 * podcast screen already uses the *title* as the tab key).
 */
export function toSectionTabs(raw: SectionTabSource): SectionTab[] {
  if (Array.isArray(raw)) {
    return raw.map(entry => {
      const e = entry as {
        key?: string | number;
        id?: string | number;
        title?: string;
        name?: string;
      };
      const key = e.key ?? e.id;
      const title = e.title ?? e.name;
      return {key: String(key), title: title != null ? String(title) : String(key)};
    });
  }
  // Record<string, string> — key → title.
  return Object.entries(raw).map(([key, title]) => ({key, title}));
}

// ─── Preselect resolution ────────────────────────────────────────────────

/**
 * Resolve the mount-time tab index from a route param value
 * (`initialTab` / `categoryId` / `initialGenre` …). Unknown or missing
 * keys fall back to 0 — out-of-range is guarded here, not at the call site.
 */
export function resolveInitialTabIndex(tabs: SectionTab[], preselectKey?: string): number {
  if (!preselectKey) return 0;
  const index = tabs.findIndex(t => t.key === preselectKey);
  return index >= 0 ? index : 0;
}

// ─── Hook ────────────────────────────────────────────────────────────────

export interface SectionTabsState {
  /** Normalized tab list (unified shape). */
  tabs: SectionTab[];
  /** Current tab index (controlled by the shell's TabView). */
  index: number;
  /** Set the active tab index. */
  setIndex: (index: number) => void;
  /** Mount-time preselect index, derived from the route param. */
  initialTabIndex: number;
  /** Jump to a tab by key (no-op if the key is unknown). */
  setTab: (key: string) => void;
  /** Map a tab index back to its source key (for content renderers). */
  getTabKey: (index: number) => string | undefined;
}

/**
 * Resolve a section config's tab bar: normalizes `config.tabs` once, seeds
 * the mount index from the route-preselect key, and guards out-of-range.
 */
export function useSectionTabs(
  config: SectionBrowseConfig,
  preselectKey?: string,
): SectionTabsState {
  const tabs = useMemo(() => toSectionTabs(config.tabs), [config.tabs]);

  const initialTabIndex = useMemo(
    () => resolveInitialTabIndex(tabs, preselectKey),
    [tabs, preselectKey],
  );

  const [index, setIndex] = useState(initialTabIndex);

  const setTab = useCallback(
    (key: string) => {
      const i = tabs.findIndex(t => t.key === key);
      if (i >= 0) setIndex(i);
    },
    [tabs],
  );

  const getTabKey = useCallback((i: number) => tabs[i]?.key, [tabs]);

  return {tabs, index, setIndex, initialTabIndex, setTab, getTabKey};
}

// ─── TEMPORARY dev-only snapshot (Phase 1.2 validation, not shipped) ────
// Logs the 8 normalized tab lists so a developer can eyeball them against
// the audit block above. Removed once every section is migrated.

export function logSectionTabsSnapshot(configs: Record<string, SectionBrowseConfig>): void {
  if (!__DEV__) return;
  console.group('[v10] Section tab snapshot');
  Object.entries(configs).forEach(([route, config]) => {
    const titles = toSectionTabs(config.tabs).map(t => `${t.key} → ${t.title}`);
    console.log(`\n${route} (${titles.length})`);
    titles.forEach(t => console.log(`  ${t}`));
  });
  console.groupEnd();
}
