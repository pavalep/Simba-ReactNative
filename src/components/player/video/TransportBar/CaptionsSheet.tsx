/**
 * V19 W3 Phase 3.2 — `CaptionsSheet` (single-choice popover).
 *
 * Mirrors `ModeSheet`'s shape (Modal + scrim + elevated card)
 * but its options are dynamic — one per subtitle track plus
 * an "Off" entry that disables captions (lib's `setTrack('sub',
 * -1)` sentinel).
 *
 * Selection semantics match ModeSheet:
 *   - Tap an option → close sheet → invoke onSelect
 *   - Tap outside / back button → close sheet, NO onSelect
 *   - The currently-active option is gold-tinted with a small
 *     gold dot (Apple-Music single-choice picker)
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.2.
 */

import * as React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {radius, spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import type {CaptionTrack} from '../../../../infrastructure/player';

export interface CaptionsSheetOption {
  /** `null` means the "Off" entry (no captions). */
  trackId: number | null;
  label: string;
  /** Right-aligned hint (language code or "off"). */
  hint: string | null;
}

export interface CaptionsSheetProps {
  visible: boolean;
  captionTracks: CaptionTrack[];
  activeTrackId: number | null;
  onSelect: (trackId: number | null) => void;
  onClose: () => void;
}

function buildOptions(tracks: CaptionTrack[]): CaptionsSheetOption[] {
  const opts: CaptionsSheetOption[] = [
    {trackId: null, label: 'Off', hint: 'no captions'},
  ];
  for (const t of tracks) {
    opts.push({
      trackId: t.id,
      label: t.label,
      hint: t.lang,
    });
  }
  return opts;
}

export const CaptionsSheet: React.FC<CaptionsSheetProps> = ({
  visible,
  captionTracks,
  activeTrackId,
  onSelect,
  onClose,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;
  const options = buildOptions(captionTracks);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      accessibilityViewIsModal
    >
      <Pressable
        style={[styles.scrim, {backgroundColor: colors.background.scrimDim}]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close captions picker"
      >
        <View
          pointerEvents="box-none"
          style={[
            styles.cardContainer,
            {paddingBottom: insets.bottom + 88},
          ]}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.background.elevated,
                borderColor: colors.border.emphasis,
                shadowColor: colors.shadow,
              },
            ]}
            accessibilityRole="menu"
          >
            <AppText
              variant="caption"
              color="tertiary"
              style={styles.cardHeader}
            >
              Captions
            </AppText>
            <View
              style={[styles.divider, {backgroundColor: colors.border.subtle}]}
            />
            {options.map(opt => {
              const isActive = opt.trackId === activeTrackId;
              return (
                <TouchableOpacity
                  key={opt.trackId === null ? 'off' : `t-${opt.trackId}`}
                  onPress={() => {
                    onClose();
                    onSelect(opt.trackId);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="menuitem"
                  accessibilityLabel={
                    opt.trackId === null
                      ? 'Captions off'
                      : `Captions: ${opt.label}`
                  }
                  accessibilityState={{selected: isActive}}
                  style={[
                    styles.row,
                    isActive
                      ? {backgroundColor: colors.accent.goldSoft}
                      : null,
                  ]}
                >
                  <AppText
                    variant="body2"
                    color={isActive ? 'accent' : 'primary'}
                    style={styles.label}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </AppText>
                  <View style={styles.rightCluster}>
                    {opt.hint ? (
                      <AppText
                        variant="caption"
                        color={isActive ? 'accent' : 'tertiary'}
                        style={styles.hint}
                      >
                        {opt.hint}
                      </AppText>
                    ) : null}
                    {isActive ? (
                      <View
                        accessibilityElementsHidden
                        style={[
                          styles.dot,
                          {backgroundColor: colors.accent.gold},
                        ]}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardContainer: {
    paddingHorizontal: spacing.lg,
    alignItems: 'stretch',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  label: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hint: {
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default CaptionsSheet;
