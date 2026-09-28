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
import {shareContent} from '../../../../services/shareService';
import {usePlayer} from '@simba-dev/react-native-media-player';
import {MoreSheet, type MoreAction} from './MoreSheet';

export const More: React.FC = () => {
  const {colors} = useTheme();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // `usePlayer().state` carries the lib-side title + artist
  // (mpv's media-title + metadata/by-key/artist). W3.4's Share
  // action uses these for the share sheet body. Once the chrome
  // gains a proper "current track" facade, this falls back to
  // the facade's track URI for deep-linking.
  const {state: playerState} = usePlayer();
  const title = playerState.title ?? '';
  const artist = playerState.artist ?? '';

  const handleAction = React.useCallback(
    (action: MoreAction) => {
      switch (action) {
        case 'share':
          if (title) {
            shareContent({
              route: 'SongScreen',
              params: {},
              title,
              subtitle: artist || undefined,
            }).catch(() => {
              // User cancelled share — shareService already
              // swallows the cancellation; this catch is just to
              // satisfy the no-floating-promises lint rule.
            });
          }
          break;
        case 'save':
        case 'addToPlaylist':
        case 'trackInfo':
          // Placeholder — full wiring requires a "current track"
          // identity (URI + mediaType) on the facade, which the
          // chrome doesn't have yet. See header comment.
          console.warn(
            `[More] action '${action}' is a placeholder — wire in a follow-up wave.`,
          );
          break;
      }
    },
    [title, artist],
  );

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

      <MoreSheet
        visible={sheetOpen}
        onAction={handleAction}
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
