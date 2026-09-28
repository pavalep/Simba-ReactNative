/**
 * V19 W3 Phase 3.4 — `MoreSheet` (single-entry secondary surface).
 *
 * The single sheet attached to the TransportBar's `<More />`
 * button. Lists the secondary actions that don't deserve their
 * own row-3 slot but should be reachable without leaving the
 * chrome:
 *
 *   ┌───────────────────────────────────────────────┐
 *   │  Library                                       │
 *   │   • Save                                      │
 *   │   • Add to playlist                           │
 *   │  Information                                   │
 *   │   • Track info                                │
 *   │   • Share                                     │
 *   └───────────────────────────────────────────────┘
 *
 * Per the W3 spec:
 *   - "exactly ONE sheet, NOT a chain of `Modal`s"
 *     → single Modal instance; tapping any action closes the
 *     sheet BEFORE invoking the callback.
 *   - "closes predictably (back-swipe, tap-outside, dismiss
 *     button) — focus returns to `More`"
 *     → Pressable scrim + `onRequestClose` (Android back).
 *
 * Wiring status (2026-09-28):
 *   - Share is wired to `shareService.shareContent(target)`
 *     using the lib's `usePlayer().state.title` + `.artist`.
 *   - Save / Add to playlist / Track info are PLACEHOLDER
 *     callbacks in this wave; the wiring to the project's
 *     existing PlaylistPicker / metadata sheet / library store
 *     is documented in the More component and lands in a
 *     follow-up once the chrome's "current track" identity
 *     stabilizes (the chrome currently only knows about the
 *     transport, not the media item URI).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.4.
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
import {SvgIcon, type SvgIconName} from '../../../../components/utility/SvgIcon';

export type MoreAction =
  | 'save'
  | 'addToPlaylist'
  | 'trackInfo'
  | 'share';

export interface MoreSheetOption {
  action: MoreAction;
  label: string;
  icon: SvgIconName;
}

const MORE_OPTIONS: ReadonlyArray<MoreSheetOption> = [
  {action: 'save', label: 'Save', icon: 'bookmark'},
  {action: 'addToPlaylist', label: 'Add to playlist', icon: 'listMusic'},
  {action: 'trackInfo', label: 'Track info', icon: 'info'},
  {action: 'share', label: 'Share', icon: 'share'},
];

export interface MoreSheetProps {
  visible: boolean;
  onAction: (action: MoreAction) => void;
  onClose: () => void;
}

export const MoreSheet: React.FC<MoreSheetProps> = ({
  visible,
  onAction,
  onClose,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

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
        accessibilityLabel="Close more menu"
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
              More
            </AppText>
            <View
              style={[styles.divider, {backgroundColor: colors.border.subtle}]}
            />
            {MORE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.action}
                onPress={() => {
                  // Close the sheet BEFORE invoking the action so
                  // the chrome's auto-hide timer (W3.5) can reset
                  // and focus returns to the More button.
                  onClose();
                  onAction(opt.action);
                }}
                activeOpacity={0.7}
                accessibilityRole="menuitem"
                accessibilityLabel={opt.label}
                style={styles.row}
              >
                <SvgIcon
                  name={opt.icon}
                  size={20}
                  color={colors.text.secondary}
                />
                <AppText
                  variant="body2"
                  color="primary"
                  style={styles.label}
                >
                  {opt.label}
                </AppText>
              </TouchableOpacity>
            ))}
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  label: {
    marginLeft: spacing.sm + 4,
  },
});

export default MoreSheet;
