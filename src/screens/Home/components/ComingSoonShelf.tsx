// ─── Coming Soon Shelf ──────────────────────────────────────────────────
// v10.3 (Home Discover): Placeholder rail for Home-page sections that are
// scoped/structured but not yet built end-to-end. Today:
//
//   • "Playlists"   — full Playlists module is on the roadmap; this
//                     shelf currently surfaces a friendly empty-state
//                     hint inside the rail so the section is discoverable
//                     and we can wire the real data flow in later without
//                     reshuffling the Home page.
//   • "AI-Curated"  — same idea; we will land curated / AI-suggested
//                     shelves here once the recommendation engine ships.
//                     The user can already see this slot exists and that
//                     it's intentionally blank.
//
// Both render with dummy data + a "Coming soon" body so the placeholder
// reads as intentional, not broken. Swap placeholders with real loaders
// once the underlying modules land.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {EmptyState} from '../../../components/utility/EmptyState/EmptyState';
import {spacing} from '../../../theme/tokens';

export type ComingSoonReason =
  | 'PLAYLISTS' // placeholder for the Playlists module
  | 'AI_CURATED'; // placeholder for AI-curated / suggested rails

interface ComingSoonShelfProps {
  /** Section key (drives copy + icon). */
  reason: ComingSoonReason;
  /** Optional label override; defaults to the canonical title. */
  label?: string;
  /**
   * Dummy placeholder cards. Each entry is `{id, title, subtitle?}` and
   * renders inside the horizontal scroll so the rail has shape even
   * before the real data is wired. Pass an empty array to fall back to
   * the empty-state body.
   */
  placeholders?: ReadonlyArray<{id: string; title: string; subtitle?: string}>;
}

const DEFAULT_PLACEHOLDERS: ReadonlyArray<{id: string; title: string; subtitle?: string}> = [
  {id: 'p1', title: 'Coming soon', subtitle: 'Placeholder content'},
  {id: 'p2', title: 'Coming soon', subtitle: 'Placeholder content'},
  {id: 'p3', title: 'Coming soon', subtitle: 'Placeholder content'},
];

const REASON_META: Record<
  ComingSoonReason,
  {
    title: string;
    description: string;
    icon: 'listMusic' | 'sparkles';
  }
> = {
  PLAYLISTS: {
    title: 'Playlists',
    description:
      "We're polishing the Playlists experience. Soon you'll be able to curate and share your own playlists from Home.",
    icon: 'listMusic',
  },
  AI_CURATED: {
    title: 'AI-Curated for You',
    description:
      'Personal picks driven by what you watch, listen to, and follow will appear here once the recommendation engine is ready.',
    icon: 'sparkles',
  },
};

export const ComingSoonShelf: React.FC<ComingSoonShelfProps> = React.memo(
  ({reason, label, placeholders}) => {
    const meta = REASON_META[reason];
    const title = label ?? meta.title;
    const items = placeholders ?? DEFAULT_PLACEHOLDERS;

    return (
      <View style={styles.container}>
        <SectionHeader label={title} />
        <FlatList
          horizontal
          data={items}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          renderItem={({item}) => (
            <View style={styles.card}>
              <EmptyState
                variant="compact"
                icon={meta.icon}
                title={item.title}
                description={item.subtitle ?? meta.description}
              />
            </View>
          )}
          initialNumToRender={items.length}
          windowSize={5}
          maxToRenderPerBatch={items.length}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: 220,
    paddingVertical: spacing.sm,
  },
});
