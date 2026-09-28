/**
 * V19 W3 Phase 3.4 — `More` (single entry point).
 *
 * The single compact control that opens the secondary surface
 * (Save / Add to playlist / Track info / Share). Implemented
 * exactly per the W3 spec:
 *
 *   - "Tap opens MoreSheet — exactly ONE sheet, NOT a chain of
 *     `Modal`s"
 *     → local sheet state, single Modal instance.
 *
 *   - "MoreSheet lists groups: Library (Save, Add to playlist) ·
 *     Information (Track info, Share)"
 *     → handled inside `MoreSheet`.
 *
 *   - "No two paths to the same secondary action"
 *     → no other chrome surface opens the same sheet.
 *
 * Wiring (2026-09-28):
 *   - Share is wired to `shareService.shareContent({title, subtitle})`
 *     using the lib's `usePlayer().state.title` + `.artist`.
 *   - Save / Add to playlist / Track info are placeholder no-ops
 *     that surface a console warning. Real wiring lands in a
 *     follow-up wave once the chrome's "current track" identity
 *     (URI + mediaType) is exposed through the facade — the
 *     chrome currently only knows about transport state.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.4.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {
  VideoMoreSheet,
  type VideoMoreAction,
} from '../VideoMoreSheet/VideoMoreSheet';

export const More: React.FC = () => {
  const {colors} = useTheme();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // V19 W3.5.6 — share / save / track-info / etc. now live inside
  // the `VideoMoreSheet` component. This button just opens it.
  // (Title/artist context is read inside the sheet from the same
  // lib hook.) The legacy W3.4 shareService/shareContent path is
  // owned by `VideoMoreSheet`'s `handleLegacy` switch.

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="More options"
        accessibilityHint="Opens the secondary actions menu"
        hitSlop={8}
        style={({pressed}) => [
          styles.button,
          pressed ? {opacity: 0.7} : null,
        ]}
      >
        <SvgIcon name="sliders" size={20} color={colors.text.secondary} />
      </Pressable>

      <VideoMoreSheet
        visible={sheetOpen}
        onAction={(_action: VideoMoreAction) => {
          // The sheet owns all action side-effects (setSpeed,
          // shareContent, etc.). The button only owns visibility,
          // so we intentionally no-op here.
        }}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 44,
    minWidth: 44,
  },
});

export default More;
