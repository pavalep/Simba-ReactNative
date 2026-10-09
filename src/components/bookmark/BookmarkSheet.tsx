import React, {useCallback, useRef, useState} from 'react';
import {
  Dimensions,
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../core/AppText/AppText';
import {AppTextInput} from '../core/AppTextInput/AppTextInput';
import {KeyboardAwareView} from '../core/KeyboardAwareView/KeyboardAwareView';
import {SvgIcon} from '../utility/SvgIcon';
import {BookmarkItem} from './BookmarkItem';
import {BottomSheet} from '../sheets/BottomSheet/BottomSheet';
import type {Bookmark} from '../../features/bookmarks';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentPosition: number;
  duration: number;
  fileUri: string;
  fileTitle: string;
  mediaType: 'video' | 'audio';
  thumbnailPath?: string;
  bookmarks: Bookmark[];
  onSave: (label: string) => void;
  onDelete: (id: string) => void;
  onJumpTo: (position: number) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${secs}`;
}

export const BookmarkSheet: React.FC<Props> = ({
  visible,
  onClose,
  currentPosition,
  duration,
  bookmarks,
  onSave,
  onDelete,
  onJumpTo,
}) => {
  const {colors} = useTheme();
  const [label, setLabel] = useState('');

  const handleSave = useCallback(() => {
    if (currentPosition < 1) return;
    onSave(label);
    setLabel('');
    onClose();
  }, [currentPosition, label, onSave, onClose]);

  const handleJumpTo = useCallback(
    (item: Bookmark) => {
      onJumpTo(item.position);
      onClose();
    },
    [onJumpTo, onClose],
  );

  const handleDelete = useCallback(
    (id: string) => {
      onDelete(id);
    },
    [onDelete],
  );

  const canSave = currentPosition >= 1;

  // The bookmark list scrolls, so true-sheet needs a handle on it to
  // size and scroll the sheet body. Without this the sheet never
  // discovers its own body, and a `flex: 1` body measures to zero.
  const listRef = useRef<FlatList<Bookmark>>(null);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      // Rest at 'auto' so the sheet is as tall as the form plus whatever
      // the list is showing, capped at 85% (the wrapper derives the cap
      // from the largest explicit detent). A fixed fraction would either
      // clip the list or leave a dead panel under it.
      snapPoints={['auto', '85%']}
      initialSnap={0}
      scrollableRef={listRef}
      title={
        <View style={styles.titleRow}>
          <SvgIcon name="bookmark" size={20} color={colors.accent.gold} />
          <AppText variant="displaySans" color="primary" style={{marginLeft: spacing.sm}}>
            Bookmarks
          </AppText>
        </View>
      }>
      <KeyboardAwareView style={styles.container}>
        {/* ── Save new bookmark ── */}
        <View
          style={[
            styles.saveSection,
            {borderBottomColor: colors.border.subtle},
          ]}>
          {/* Position info */}
          {canSave && (
            <AppText variant="caption" color="secondary" style={styles.positionInfo}>
              Current position: {formatTime(currentPosition)}
              {duration > 0 ? ` / ${formatTime(duration)}` : ''}
            </AppText>
          )}

          {/* Input + Save button */}
          <View style={styles.saveRow}>
            <AppTextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Label (optional)"
              label="Label"
              clearable
              containerStyle={styles.inputWrap}
              accessibilityLabel="Bookmark label"
            />
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: canSave
                    ? colors.accent.gold
                    : colors.text.tertiary,
                },
              ]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Save bookmark">
              <SvgIcon name="bookmark" size={18} color={colors.text.inverse} />
              <AppText
                variant="button"
                style={{color: colors.text.inverse, marginLeft: 4}}>
                Save
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Existing bookmarks list ── */}
        <View style={styles.listSection}>
          {bookmarks.length === 0 ? (
            <View style={styles.empty}>
              <SvgIcon
                name="bookmark"
                size={32}
                color={colors.text.tertiary}
              />
              <AppText variant="body2" color="tertiary" style={{marginTop: spacing.sm}}>
                No bookmarks yet. Save your current position to start.
              </AppText>
            </View>
          ) : (
            /* 59.1: virtualized bookmark rows */
            <FlatList
              ref={listRef}
              data={bookmarks}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <BookmarkItem
                  item={item}
                  onPress={handleJumpTo}
                  onDelete={handleDelete}
                />
              )}
            />
          )}
        </View>
      </KeyboardAwareView>
    </BottomSheet>
  );
};

// V6 8.1.4: wrap in React.memo so the sheet body does not re-render on
// every parent tick. The hook passes a fresh `MpvPlayer.getPosition()`
// value on every render; without memo the FlatList re-renders each
// position update while the sheet is open.
export const MemoizedBookmarkSheet = React.memo(BookmarkSheet);
export default MemoizedBookmarkSheet;

const styles = StyleSheet.create({
  // No `flex` here or on `listSection`. true-sheet measures the sheet's
  // content view UNCONSTRAINED (TrueSheetContentViewShadowNode), and a
  // `flexBasis: 0` child measures to ZERO in that pass — so a `flex: 1`
  // body collapses and only the save section survives. An EXPLICIT
  // maxHeight on the list is what lets it be measured, capped, and
  // scrolled, all at once.
  container: {},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  positionInfo: {
    marginBottom: spacing.sm,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  listSection: {
    // The list is user-generated and unbounded in length, so it gets a
    // ceiling rather than a fixed height: a short list is fully shown and
    // the sheet hugs it, a long one caps and scrolls. 45% of the window
    // leaves room for the save form above it and for the expanded stop.
    maxHeight: Dimensions.get('window').height * 0.45,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
});
