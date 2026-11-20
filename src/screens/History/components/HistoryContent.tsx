// ─── History — Browse Content ──────────────────────────────────────────
// The list the browse shell hosts.
//
// WAVE B16 (Wave B2) — rewritten from the screen's own hand-rolled shell.
//
// The shell owns the header, the search field, the chip strip and the
// filter sheet. This component owns the list, the list's empty state,
// the ROW and the row's menu.
//
// ── No pull-to-refresh ──────────────────────────────────────────────
// The old screen's `RefreshControl` flipped a boolean for one animation
// frame and re-read nothing: the History list is fed by a live
// persisted store, so there is nothing to refresh. It was a spinner
// that never fetched anything — the same reasoning that already
// removed Home's pull-to-refresh (spec §6.3.3,
// `md/CONTENT_OWNERSHIP.md`).

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useConfirmDialog} from '../../../components/core/Dialog/ConfirmDialog';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {MediaActionsSheet} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {useQueueActions} from '../../../hooks/useQueueActions';
import {useTheme} from '../../../theme';
import {formatPositionAccessibility, formatPositionLine} from '../../../utils/mediaTime';
import {useHistoryData} from './HistoryDataProvider';
import {createHistoryScreenStyles} from '../styles';
import type {SectionRenderContext} from '../types';
import type {RecentHistoryEntry} from '../../../features/recentHistory';
import text from '../related/textContent.json';

export const HistoryContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createHistoryScreenStyles(), []);
  const {visibleEntries, playEntry, removeEntry, setFilter, setQuery} =
    useHistoryData();
  const {confirm, dialog} = useConfirmDialog();

  // ── The scope the shell owns, pushed down into the provider ──────────
  // The media-type filter's DEFAULT is 'all', and a default is not an
  // explicit selection — so the scope reads the config's default until
  // the user picks one.
  const filter = ctx.options.filter?.[0] ?? 'all';
  useEffect(() => {
    setFilter(filter);
  }, [filter, setFilter]);
  useEffect(() => {
    setQuery(ctx.query);
  }, [ctx.query, setQuery]);

  const handleRemove = useCallback(
    async (fileUri: string, title: string) => {
      const ok = await confirm({
        title: text.dialogs.removeTitle,
        message: text.dialogs.removeMessage.replace('{title}', title),
        confirmLabel: text.dialogs.removeConfirmLabel,
        destructive: true,
      });
      if (ok) {
        removeEntry(fileUri);
      }
    },
    [confirm, removeEntry],
  );
  // ── The row menu ────────────────────────────────────────────────────
  // 58.4/58.5: the standard long-press menu — Play Next / Queue /
  // Remove.
  const {playNext, addToQueue} = useQueueActions();
  const [menuItem, setMenuItem] = useState<RecentHistoryEntry | null>(null);

  const menuActions = useMemo(
    () =>
      menuItem
        ? [
            {
              label: text.menu.playNext,
              icon: 'skipForward' as const,
              onPress: () =>
                playNext({
                  uri: menuItem.fileUri,
                  title: menuItem.title,
                  duration: menuItem.duration,
                  source: menuItem.source,
                  mediaType: menuItem.mediaType,
                }),
            },
            {
              label: text.menu.addToQueue,
              icon: 'list' as const,
              onPress: () =>
                addToQueue({
                  uri: menuItem.fileUri,
                  title: menuItem.title,
                  duration: menuItem.duration,
                  source: menuItem.source,
                  mediaType: menuItem.mediaType,
                }),
            },
            {
              label: text.menu.removeFromHistory,
              icon: 'close' as const,
              destructive: true,
              onPress: () => {
                setMenuItem(null);
                void handleRemove(menuItem.fileUri, menuItem.title);
              },
            },
          ]
        : [],
    [addToQueue, menuItem, playNext],
  );


  const renderRow = useCallback(
    ({item}: {item: RecentHistoryEntry}) => {
      const pct =
        item.duration > 0
          ? Math.min(100, Math.max(0, (item.position / item.duration) * 100))
          : 0;
      return (
        <TouchableOpacity
          style={[styles.row, {backgroundColor: colors.background.elevated}]}
          onPress={() => playEntry(item)}
          onLongPress={() => setMenuItem(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={formatPositionAccessibility(
            item.title,
            item.position,
            item.duration,
          )}>
          <View style={[styles.rowIcon, {backgroundColor: colors.border.subtle}]}>
            <SvgIcon
              name={item.mediaType === 'audio' ? 'music' : 'video'}
              size={20}
              color={colors.accent.gold}
            />
          </View>
          <View style={styles.rowBody}>
            <AppText variant="body2" color="primary" numberOfLines={1}>
              {item.title}
            </AppText>
            <AppText variant="caption" color="tertiary">
              {formatPositionLine(item.position, item.duration)}
            </AppText>
            {/* 47.2: row progress bar */}
            <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: colors.accent.gold,
                  },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => void handleRemove(item.fileUri, item.title)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            accessibilityRole="button"
            accessibilityLabel={text.row.removeLabel.replace('{title}', item.title)}>
            <SvgIcon name="close" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [colors, handleRemove, playEntry, styles],
  );

  // The empty state says WHICH emptiness it is: nothing was ever played,
  // or the scope keeps nothing.
  const isScoped = filter !== 'all' || ctx.query.trim().length > 0;

  return (
    <View style={styles.sectionRoot}>
      {dialog}
      {visibleEntries.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="list"
            title={text.states.emptyTitle}
            description={
              isScoped ? text.states.noMatchMessage : text.states.emptyMessage
            }
          />
        </View>
      ) : (
        <FlatList
          testID="section-History-list"
          data={visibleEntries}
          keyExtractor={item => item.fileUri}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={5}
          maxToRenderPerBatch={10}
        />
      )}

      <MediaActionsSheet
        visible={menuItem !== null}
        onClose={() => setMenuItem(null)}
        title={menuItem?.title ?? 'History Item'}
        actions={menuActions}
      />
    </View>
  );
};