import React, {useState, useCallback} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../core/AppText/AppText';
import {SvgIcon} from '../utility/SvgIcon';
import {BookmarkItem} from './BookmarkItem';
import {BottomSheet} from '../sheets/BottomSheet/BottomSheet';
import type {Bookmark} from '../../store/slices/bookmarkSlice';

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
  _fileUri,
  _fileTitle,
  _mediaType,
  _thumbnailPath,
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

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['40%', '65%']}
      initialSnap={0}
      title={
        <View style={styles.titleRow}>
          <SvgIcon name="bookmark" size={20} color={colors.accent.gold} />
          <AppText variant="h3" color="primary" style={{marginLeft: spacing.sm}}>
            Bookmarks
          </AppText>
        </View>
      }>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
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
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text.primary,
                  backgroundColor: colors.background.floating,
                  borderColor: colors.border.subtle,
                },
              ]}
              placeholder="Label (optional)"
              placeholderTextColor={colors.text.tertiary}
              value={label}
              onChangeText={setLabel}
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
            <View>
              {bookmarks.map(item => (
                <BookmarkItem
                  key={item.id}
                  item={item}
                  onPress={handleJumpTo}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    height: 42,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  listSection: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
});
