// ─── RemoteResults ───────────────────────────────────────────────────────
// The REMOTE result groups — the five free-content APIs.
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN) — four changes:
//
// 1. **THE SECTION TITLES ARE THE APP'S.** They were `displaySans` with
//    `fontWeight: '700'`, and `displaySans` is **Manrope SemiBold 22**.
//    Asking for weight 700 asks Android for `Manrope SemiBold_bold.ttf`,
//    which DOES NOT SHIP (`android/app/src/main/assets/fonts/` has
//    `Manrope-SemiBold.ttf` and `Manrope_bold.ttf`, and no
//    `Manrope SemiBold_bold.ttf`). React Native then falls back
//    SILENTLY, and the glyph that is drawn is not the face that was
//    measured. The titles are now `SubsectionTitle` — the gold Cormorant
//    italic chapter break the Profile and the About page use, and the
//    same component the local groups use.
//
// 2. **THE PODCASTS AND RADIO SECTIONS ARE GONE.** Their result arrays
//    are hard-coded `[]` (`useAggregatedSearch.ts` — Podcast Index needs
//    SHA1 auth, Radio Browser needs a name-based query), so those two
//    sections could only ever draw a SKELETON. They were two blocks of
//    screen in the design that the app could not draw. The two adapters
//    are still to be built; until they are, the sections are not drawn.
//
// 3. **THE ROW IS THE ONE ROW.** `MediaRow` was a near-copy of
//    `StreamingRow` with a different padding, a different radius and no
//    hairline, and its trailing edge was a 32 dp GOLD DISC. Every result
//    on the page now draws `SearchResultRow` — the Profile page's
//    `SettingsRow` anatomy — with the download as a bare glyph.
//
// 4. **THE FILTERS REACH THIS LIST.** The scope, the media-kind filter
//    and the sort are applied in `utils/searchFilters.ts`, to BOTH the
//    local results and these. Before this, the filter sheet's controls
//    only reached the local results, so on a query whose results came
//    from the APIs the sheet did nothing at all (device proof in
//    `md/SEARCH_PAGE_REDESIGN.md` §2.1).
//
// TWO THINGS ARE NOT DRAWN HERE
// ─────────────────────────────
// • An empty section. The page says "nothing found" once, in one
//   grammar, rather than once per source.
// • A loading state. The page's own results area owns the one loading
//   treatment (`Placeholder`), so the five sources cannot each draw
//   their own skeleton — that was five grey bars racing each other.

import React from 'react';
import {View} from 'react-native';
import {SubsectionTitle} from '../../../components/utility/SubsectionTitle/SubsectionTitle';
import type {
  AggregatedSearchResults,
  AudiobookResult,
  AudiusTrackResult,
  InternetArchiveItemResult,
  IPTVChannelResult,
  JamendoTrackResult,
} from '../../../types/api';
import {SearchResultRow} from './SearchResultRow';

export interface RemoteResultsHandlers {
  onPlayTrack: (track: JamendoTrackResult) => void;
  onPlayAudius: (track: AudiusTrackResult) => void;
  onOpenAudiobook: (book: AudiobookResult) => void;
  onOpenArchive: (item: InternetArchiveItemResult) => void;
  onOpenChannel: (channel: IPTVChannelResult) => void;
}

interface RemoteResultsProps {
  results: AggregatedSearchResults;
  handlers: RemoteResultsHandlers;
}

/** One result group: the gold divider, then its rows. */
const Section: React.FC<{label: string; children: React.ReactNode}> = ({
  label,
  children,
}) => (
  <View>
    <SubsectionTitle label={label} variant="displaySerif" />
    {children}
  </View>
);

export const RemoteResults: React.FC<RemoteResultsProps> = React.memo(
  ({results, handlers}) => {
    const hasMusic =
      results.jamendoTracks.length + results.audiusTracks.length > 0;
    const hasTv = results.iptvChannels.length > 0;
    const hasAudiobooks = results.audiobooks.length > 0;
    const hasArchive = results.internetArchiveItems.length > 0;

    if (!hasMusic && !hasTv && !hasAudiobooks && !hasArchive) {
      return null;
    }

    return (
      <View>
        {hasMusic ? (
          <Section label="Music">
            {results.jamendoTracks.map(item => (
              <SearchResultRow
                key={`jamendo-${item.id}`}
                title={item.name}
                subtitle={item.artistName}
                artwork={item.imageUrl}
                icon="music"
                trailing="download"
                download={{
                  uri: item.audioUrl,
                  title: item.name,
                  mediaType: 'audio',
                  source: 'api',
                }}
                onPress={() => handlers.onPlayTrack(item)}
              />
            ))}
            {results.audiusTracks.map(item => (
              <SearchResultRow
                key={`audius-${item.id}`}
                title={item.title}
                subtitle={item.artistName}
                artwork={item.artworkUrl}
                icon="music"
                trailing="download"
                download={{
                  uri: item.streamUrl,
                  title: item.title,
                  mediaType: 'audio',
                  source: 'api',
                }}
                onPress={() => handlers.onPlayAudius(item)}
              />
            ))}
          </Section>
        ) : null}

        {hasTv ? (
          <Section label="TV">
            {results.iptvChannels.map(item => (
              <SearchResultRow
                key={`tv-${item.id}`}
                title={item.name}
                subtitle={`${item.country} · ${item.category}`}
                artwork={item.image}
                icon="tv"
                onPress={() => handlers.onOpenChannel(item)}
              />
            ))}
          </Section>
        ) : null}

        {hasAudiobooks ? (
          <Section label="Audiobooks">
            {results.audiobooks.map(item => (
              <SearchResultRow
                key={`book-${item.id}`}
                title={item.title}
                subtitle={item.author}
                icon="book"
                trailing="chevron"
                onPress={() => handlers.onOpenAudiobook(item)}
              />
            ))}
          </Section>
        ) : null}

        {hasArchive ? (
          <Section label="Archive">
            {results.internetArchiveItems.map(item => (
              <SearchResultRow
                key={`archive-${item.identifier}`}
                title={item.title}
                subtitle={item.creator}
                artwork={item.imageUrl}
                icon="archive"
                trailing="chevron"
                onPress={() => handlers.onOpenArchive(item)}
              />
            ))}
          </Section>
        ) : null}
      </View>
    );
  },
);
