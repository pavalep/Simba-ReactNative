/**
 * V19 W3 Phase 3.2 — `CaptionsToggle` (compact optional control).
 *
 * Renders ONLY when the current file has at least one caption
 * track (`state.captionTracks.length > 0`). When no captions
 * exist, the component returns `null` so the TransportBar's
 * Row 3 collapses cleanly — no inert button, no zero-width
 * spacer (per the W3 spec §"No inert button when unsupported").
 *
 * The button itself is a compact icon + label:
 *   - `subtitles` icon (a CC-bubble SVG already in the icon set)
 *   - Label: the active track's title/lang, or "CC" if no track
 *     is active (matches YouTube's convention)
 *
 * Tap opens `CaptionsSheet`, which is mounted as a sibling
 * INSIDE this component so the open-state is local.
 *
 * Gold accent applies when a track is active (`activeTrackId !== null`).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.2.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {useTransport} from '../../../../infrastructure/player';
import {CaptionsSheet} from './CaptionsSheet';

export const CaptionsToggle: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // The spec says: render ONLY when there's at least one caption
  // track. When no tracks exist, the component is absent — the
  // TransportBar's Row 3 collapses the slot to ModeControl + More.
  if (state.captionTracks.length === 0) return null;

  const activeTrack = state.captionTracks.find(
    t => t.id === state.activeCaptionTrackId,
  );
  const isActive = state.activeCaptionTrackId !== null;
  const label = activeTrack ? activeTrack.label : 'CC';
  // On-media tokens: the toggle paints directly on the video (a dark
  // surface in BOTH themes), so the "CC" / track label must not
  // resolve to light theme's near-black `text.tertiary`.
  const labelColor = isActive ? colors.accent.gold : colors.text.onMediaMuted;
  const iconColor = isActive ? colors.accent.gold : colors.text.onMediaMuted;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          isActive
            ? `Captions: ${label}. Tap to change.`
            : 'Captions off. Tap to choose a caption track.'
        }
        accessibilityHint="Opens the captions picker"
        hitSlop={8}
        style={({pressed}) => [
          styles.button,
          pressed ? {opacity: 0.7} : null,
        ]}
      >
        <SvgIcon name="subtitles" size={16} color={iconColor} />
        <AppText
          variant="caption"
          style={[styles.label, {color: labelColor}]}
          numberOfLines={1}
        >
          {label}
        </AppText>
      </Pressable>

      <CaptionsSheet
        visible={sheetOpen}
        captionTracks={state.captionTracks}
        activeTrackId={state.activeCaptionTrackId}
        onSelect={id => commands.selectCaptionTrack(id)}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 44,
    minWidth: 44,
    gap: spacing.xs,
  },
  label: {
    fontVariant: ['tabular-nums'],
    maxWidth: 100,
  },
});

export default CaptionsToggle;
