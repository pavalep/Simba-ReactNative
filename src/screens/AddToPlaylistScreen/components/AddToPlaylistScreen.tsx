/**
 * `AddToPlaylistScreen` — gather items from several sections and add them
 * to one playlist.
 *
 * ## Why this is a page and not a sheet
 *
 * `PlaylistSheet` adds ONE item to ONE playlist, from one tile. This page
 * adds MANY items, gathered from more than one section, to ONE playlist.
 * They are different verbs: a sheet is for one context, a page is for a
 * gathering. So this screen does NOT replace `PlaylistSheet` — the sheet
 * stays the single-item surface, and this page is the multi-source one.
 *
 * ## What this screen does not own
 *
 *  - The playlist list is filtered by `compatiblePlaylistsFor()` — the ONE
 *    rule, in `src/features/playlists`. This screen never re-implements the
 *    lane / allow-list logic.
 *  - Playlists are created by `PlaylistCreateModal` — the ONE create owner.
 *    This screen renders that modal; it has no create form of its own.
 *  - Items are added with `addItemToPlaylist()` and reported with
 *    `reportBatchAdd()` — the feature facade's own functions.
 *
 * The sections on offer, and the ones deliberately left out, are explained
 * in `../hooks/useAddToPlaylistScreen.ts`.
 */

import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppButton} from '../../../components/core/AppButton/AppButton';
import {BackButton} from '../../../components/utility/BackButton/BackButton';
import {SvgIcon, type IconName} from '../../../components/utility/SvgIcon';
import {MediaImage} from '../../../components/utility/MediaImage';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {PlaylistCreateModal} from '../../../components/playlist/PlaylistCreateModal/PlaylistCreateModal';
import {MEDIA_KIND_LABELS} from '../../../types/media';
import type {RootStackScreenProps} from '../../../navigation/types';
import {
  useAddToPlaylistScreen,
  type AddToPlaylistCandidate,
  type AddToPlaylistSection,
} from '../hooks/useAddToPlaylistScreen';

type Props = RootStackScreenProps<'AddToPlaylist'>;

/** The sections this page offers, and what each one says when it is empty. */
interface SectionMeta {
  id: AddToPlaylistSection;
  label: string;
  icon: IconName;
  emptyTitle: string;
  emptyDescription: string;
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'movies',
    label: 'Movies',
    icon: 'clapperboard',
    emptyTitle: 'No movies to add',
    emptyDescription: 'The archive returned no films for this section.',
  },
  {
    id: 'music',
    label: 'Music',
    icon: 'music',
    emptyTitle: 'No tracks to add',
    emptyDescription: 'Jamendo has no popular tracks to show right now.',
  },
  {
    id: 'downloads',
    label: 'Downloads',
    icon: 'download',
    emptyTitle: 'No downloads yet',
    emptyDescription:
      'Downloaded media shows up here, ready to add to a playlist.',
  },
];

const THUMBNAIL_SIZE = 44;

export const AddToPlaylistScreen: React.FC<Props> = ({route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  const playlistId = route.params?.playlistId;
  const playlistName = route.params?.playlistName;

  const {
    section,
    setSection,
    candidates,
    isLoading,
    error,
    selectedCount,
    isSelected,
    toggleCandidate,
    isResolving,
    compatiblePlaylists,
    targetId,
    target,
    setTargetId,
    handleCreate,
    handleAdd,
  } = useAddToPlaylistScreen(playlistId);

  // The screen owns only whether the ONE create owner is open.
  const [createVisible, setCreateVisible] = useState(false);

  const activeSection = useMemo(
    () => SECTIONS.find(entry => entry.id === section) ?? SECTIONS[0],
    [section],
  );

  /**
   * The target playlist cannot take EVERY ticked item. The rule already
   * said so — the target is simply not in the compatible list — so this
   * only reports it.
   */
  const targetBlocked =
    target !== null &&
    !compatiblePlaylists.some(playlist => playlist.id === target.id);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background.primary,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          gap: spacing.md,
        },
        headerTitleSection: {
          flex: 1,
        },
        targetBlock: {
          paddingBottom: spacing.sm,
        },
        targetLabel: {
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.xs,
        },
        chipRow: {
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          alignItems: 'center',
        },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border.subtle,
          maxWidth: 200,
        },
        chipActive: {
          borderColor: colors.accent.gold,
          backgroundColor: colors.accent.goldDim,
        },
        sectionChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        },
        sectionChipActive: {
          borderColor: colors.accent.gold,
          backgroundColor: colors.accent.goldDim,
        },
        listContent: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
        },
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: colors.border.emphasis,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkboxChecked: {
          backgroundColor: colors.accent.gold,
          borderColor: colors.accent.gold,
        },
        checkmark: {
          color: colors.background.primary,
          fontSize: 13,
          fontWeight: '700',
        },
        thumbnail: {
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
          borderRadius: radius.sm,
        },
        thumbnailEmpty: {
          backgroundColor: colors.background.elevated,
        },
        rowInfo: {
          flex: 1,
        },
        kindTag: {
          marginLeft: spacing.xs,
        },
        bottomBar: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          gap: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
        },
        blockedNote: {
          color: colors.semantic.warning,
        },
      }),
    [colors],
  );

  const renderCandidate = useCallback(
    ({item: candidate}: {item: AddToPlaylistCandidate}) => {
      const checked = isSelected(candidate.key);
      const resolving = isResolving(candidate.key);
      const kindLabel = MEDIA_KIND_LABELS[candidate.kind];
      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => {
            void toggleCandidate(candidate);
          }}
          accessibilityRole="checkbox"
          accessibilityState={{checked}}
          accessibilityLabel={candidate.title}
          accessibilityHint={kindLabel}>
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <AppText style={styles.checkmark}>{'✓'}</AppText>}
          </View>

          {candidate.thumbnailPath ? (
            <MediaImage
              source={candidate.thumbnailPath}
              style={styles.thumbnail}
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailEmpty]} />
          )}

          <View style={styles.rowInfo}>
            <AppText variant="body1" color="primary" numberOfLines={1}>
              {candidate.title}
            </AppText>
            {candidate.subtitle ? (
              <AppText variant="caption" color="tertiary" numberOfLines={1}>
                {candidate.subtitle}
              </AppText>
            ) : null}
          </View>

          <AppText variant="overline" color="tertiary" style={styles.kindTag}>
            {kindLabel}
          </AppText>

          {resolving ? (
            <ActivityIndicator size="small" color={colors.accent.gold} />
          ) : null}
        </TouchableOpacity>
      );
    },
    [colors, isResolving, isSelected, styles, toggleCandidate],
  );

  const keyExtractor = useCallback(
    (candidate: AddToPlaylistCandidate) => candidate.key,
    [],
  );

  const emptyContent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.listContent}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.listContent}>
          <AppText variant="body2" color="tertiary">
            {`Could not load this section. ${error}`}
          </AppText>
        </View>
      );
    }
    return (
      <EmptyState
        icon={activeSection.icon}
        title={activeSection.emptyTitle}
        description={activeSection.emptyDescription}
      />
    );
  }, [activeSection, colors, error, isLoading, styles]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton />
        <View style={styles.headerTitleSection}>
          <AppText variant="displaySerif" color="primary" numberOfLines={1}>
            Add to Playlist
          </AppText>
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {target ? target.name : playlistName ?? 'Choose a playlist'}
          </AppText>
        </View>
      </View>

      {/* ── The playlist this page adds to — filtered by the ONE rule ── */}
      <View style={styles.targetBlock}>
        <AppText variant="overline" color="tertiary" style={styles.targetLabel}>
          Adding to
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {compatiblePlaylists.map(playlist => {
            const active = playlist.id === targetId;
            return (
              <TouchableOpacity
                key={playlist.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setTargetId(playlist.id)}
                accessibilityRole="button"
                accessibilityLabel={`Add to ${playlist.name}`}
                accessibilityState={{selected: active}}>
                <AppText
                  variant="body2"
                  color={active ? 'accent' : 'secondary'}
                  numberOfLines={1}>
                  {playlist.name}
                </AppText>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setCreateVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="New playlist">
            <AppText variant="body2" color="accent">
              New playlist
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── The sections ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}>
        {SECTIONS.map(entry => {
          const active = entry.id === section;
          return (
            <TouchableOpacity
              key={entry.id}
              style={[styles.sectionChip, active && styles.sectionChipActive]}
              onPress={() => setSection(entry.id)}
              accessibilityRole="button"
              accessibilityLabel={entry.label}
              accessibilityState={{selected: active}}>
              <SvgIcon
                name={entry.icon}
                size={16}
                color={active ? colors.accent.gold : colors.text.tertiary}
              />
              <AppText variant="body2" color={active ? 'accent' : 'secondary'}>
                {entry.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── The items ── */}
      <FlatList
        data={candidates}
        renderItem={renderCandidate}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={emptyContent}
      />

      {/* ── The action ── */}
      {selectedCount > 0 && (
        <View
          style={[
            styles.bottomBar,
            {paddingBottom: insets.bottom + spacing.sm},
          ]}>
          {targetBlocked && target ? (
            <AppText variant="caption" style={styles.blockedNote}>
              {`The selected items cannot be added to "${target.name}".`}
            </AppText>
          ) : null}
          <AppButton
            title={`Add ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
            onPress={handleAdd}
            disabled={!target || targetBlocked}
            variant="primary"
            fullWidth
          />
        </View>
      )}

      {/* The ONE create owner. */}
      <PlaylistCreateModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={(name, kind) => {
          setCreateVisible(false);
          handleCreate(name, kind);
        }}
      />
    </View>
  );
};

export default AddToPlaylistScreen;
