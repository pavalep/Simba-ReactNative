/**
 * V19 W3.6 Phase 3.6.1 — `CaptionTrackSelector`.
 *
 * Per-Track kind labelling. The lib's `MpvTrack` exposes
 * `title` and `lang` but NOT a `kind: 'subtitle' | 'caption'
 * | 'sdh'` discriminator. The lib-side kind enum is a
 * follow-up bridge update (TRACKER Phase 3.6.1 §"Track metadata
 * carries `kind`"). Until then, the chrome maps generic
 * tracks to "Subtitles" labels and treats the lang field as
 * the primary identifier.
 *
 * The lib's title often already includes "[CC]" / "[SDH]" /
 * "(Subtitles)" markers (Netflix / YouTube convention). The
 * `captionTracks` derivation in `useTransport.ts` preserves
 * the title verbatim; the label is rendered as-is.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3 + TRACKER Phase 3.6.1.
 */

import * as React from 'react';
import {Modal, Pressable, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {radius, spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {useTransport, type CaptionTrack} from '../../../../infrastructure/player';

export interface CaptionTrackSelectorProps {
  visible: boolean;
  onSelect: (trackId: number | null) => void;
  onClose: () => void;
}

/**
 * Per the TRACKER spec:
 *
 *   "Track metadata carries `kind: 'subtitle' | 'caption' | 'sdh'`;
 *    emitted by the lib."
 *
 * The lib doesn't yet emit `kind`. Until it does, we classify
 * each track by inspecting its `label` / `title` for common
 * markers:
 *   - contains "[CC]"        → caption (closed captions for the
 *     deaf / hard-of-hearing)
 *   - contains "[SDH]"       → sdh (same as CC in practice; some
 *     broadcasters distinguish)
 *   - contains "(Subtitles)" → subtitle (translation track)
 *   - otherwise              → subtitle (default — the most
 *     common kind for an unlabeled sub track)
 *
 * The lib-side kind enum will replace this regex-based fallback
 * in the next bridge update; the function signature stays the
 * same so the chrome doesn't need to change.
 */
export type CaptionTrackKind = 'subtitle' | 'caption' | 'sdh';

export function classifyCaptionKind(label: string): CaptionTrackKind {
  const upper = label.toUpperCase();
  if (upper.includes('[SDH]')) return 'sdh';
  if (upper.includes('[CC]')) return 'caption';
  return 'subtitle';
}

/**
 * Returns the user-facing label for a track. Today this is
 * mostly the lib's title verbatim. When the lib-side kind
 * field lands, this helper will prepend "[CC]" / "[SDH]" /
 * "Subtitles" markers per the TRACKER's example:
 *   - "English (Subtitles)" vs "English [CC]" vs "English [SDH]"
 */
export function formatCaptionLabel(track: CaptionTrack): string {
  // Until the lib exposes `kind`, preserve the lib title. Common
  // markers like "[CC]" / "[SDH]" already in the title render
  // through unchanged, which matches the Apple-Music-style
  // single-picker UX.
  return track.label;
}

export const CaptionTrackSelector: React.FC<CaptionTrackSelectorProps> = ({
  visible,
  onSelect,
  onClose,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {state} = useTransport();

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
        accessibilityLabel="Close captions selector"
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
            <TouchableOpacity
              onPress={() => {
                onClose();
                onSelect(null);
              }}
              accessibilityRole="menuitem"
              accessibilityLabel="Captions off"
              accessibilityState={{
                selected: state.activeCaptionTrackId === null,
              }}
              style={[
                styles.row,
                state.activeCaptionTrackId === null
                  ? {backgroundColor: colors.accent.goldSoft}
                  : null,
              ]}
            >
              <AppText
                variant="body2"
                color={
                  state.activeCaptionTrackId === null ? 'accent' : 'primary'
                }
              >
                Off
              </AppText>
            </TouchableOpacity>
            {state.captionTracks.map(track => {
              const isActive = track.id === state.activeCaptionTrackId;
              const kind = classifyCaptionKind(track.label);
              return (
                <TouchableOpacity
                  key={track.id}
                  onPress={() => {
                    onClose();
                    onSelect(track.id);
                  }}
                  accessibilityRole="menuitem"
                  accessibilityLabel={`Captions: ${formatCaptionLabel(track)}`}
                  accessibilityState={{selected: isActive}}
                  style={[
                    styles.row,
                    isActive ? {backgroundColor: colors.accent.goldSoft} : null,
                  ]}
                >
                  <AppText
                    variant="body2"
                    color={isActive ? 'accent' : 'primary'}
                    style={styles.label}
                  >
                    {formatCaptionLabel(track)}
                  </AppText>
                  {kind === 'sdh' ? (
                    <AppText
                      variant="caption"
                      color={isActive ? 'accent' : 'tertiary'}
                      style={styles.kindHint}
                    >
                      SDH
                    </AppText>
                  ) : null}
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  label: {
    flex: 1,
  },
  kindHint: {
    fontVariant: ['tabular-nums'],
  },
});

export default CaptionTrackSelector;
