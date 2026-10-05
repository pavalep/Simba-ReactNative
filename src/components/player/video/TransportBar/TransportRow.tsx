/**
 * V19 W7.3 — `TransportRow`: the primary action cluster.
 *
 *   ┌───────────────────────────────────────────────┐
 *   │   ⟲10    ⏮    ▶ / ⏵    ⏭    ⟳10              │
 *   └───────────────────────────────────────────────┘
 *
 *   - Rewind 10    `commands.rewind10()`  (−10 s)
 *   - Previous     `commands.skipPrev()`  (absent when canGoPrev is false)
 *   - Play / Pause `commands.togglePlayPause()` — the only filled control
 *   - Next         `commands.next()`      (absent when canGoNext is false)
 *   - Forward 10   `commands.forward10()` (+10 s)
 *
 * ## Why the row is a tight CENTRED cluster now (it used to be space-between)
 *
 * `space-between` pushed Rewind 10 to the far left and Forward 10 to the
 * far right, with play/pause stranded in whatever space was left over.
 * On a wide screen the three controls in the middle ended up ~200 px
 * apart, so the row stopped reading as one group; on a narrow one the
 * outer two crowded the primary CTA. Both symptoms read as "the UI is
 * not designed". A centred cluster with a fixed gap keeps every control
 * a fixed distance from the next one at any width, which is what makes
 * the row legible as a single object.
 *
 * There is a second, subtler reason. Previous and Next are
 * *conditionally absent* (see below), so the number of controls changes
 * from 5 to 3 depending on the playlist. Under `space-between` that
 * change re-spread the remaining controls across the full width, so the
 * play/pause button physically MOVED when a queue appeared or ran out.
 * Under a centred cluster the whole group simply recentres, and the
 * primary CTA stays in the optical middle.
 *
 * ## Why Previous / Next still render `null` when unavailable
 *
 * The reported complaint was "there is no next/previous visible", so
 * this is worth stating plainly: that is CORRECT for a single-file
 * play. `canGoNext` is derived from the real mpv playlist
 * (`idx < playlist.length - 1`), and a movie opened from a detail
 * screen is launched through `openWithResume` — one file, no queue — so
 * there is genuinely nothing to skip to.
 *
 * The alternative, a permanently visible but inert button, is the
 * defect this project has an invariant about (SPEC §0.3 I3): a control
 * that looks live and does nothing is worse than an absent one. So the
 * controls appear when a queue exists and disappear when it does not.
 * The layout above is what makes that honest choice stop looking like a
 * layout bug.
 *
 * ## Why every control goes through `PlayerControl`
 *
 * This file used to hand-roll `Pressable` + `SvgIcon size={28}` +
 * `hitSlop={8}` five times. The `hitSlop` was the "some icons are not
 * clickable" defect: it inflated each control's touch area 8 px past
 * its own bounds on every side, so in a dense row the neighbours
 * overlapped and competed for the same tap. The primitive is a real
 * 44 pt target with the glyph centred inside it, no `hitSlop`, and a
 * spring press — the numbers cannot drift again.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md`
 * §3.2 and §1.3; `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.3.
 */

import * as React from 'react';
import {StyleSheet, View} from 'react-native';
import {spacing} from '../../../../theme/tokens';
import {useTransport} from '../../../../infrastructure/player';
import {
  PlayerControl,
  CONTROL_ICON_SIZE_TRANSPORT,
  CONTROL_PRIMARY_TARGET,
} from '../PlayerControl/PlayerControl';

/** Gap between adjacent transport controls. */
const CONTROL_GAP = 6;

const TransportRow: React.FC = () => {
  const {state, commands} = useTransport();

  const playPauseLabel = state.isEnded
    ? 'Replay from beginning'
    : state.isPlaying
      ? 'Pause'
      : 'Play';
  const playPauseIcon = state.isEnded
    ? 'replay'
    : state.isPlaying
      ? 'pause'
      : 'play';

  // `isEnded` is a real terminal state, so "replay" is a seek-to-zero,
  // not a play call that mpv would treat as a no-op at the end of a
  // file. Kept as a distinct branch rather than folded into
  // `togglePlayPause`.
  const onPlayPause = () => {
    if (state.isEnded) commands.seek(0);
    else commands.togglePlayPause();
  };

  return (
    <View style={styles.row} accessible={false}>
      <PlayerControl
        testID="transport-rewind10"
        icon="rewind10"
        iconSize={CONTROL_ICON_SIZE_TRANSPORT}
        onPress={commands.rewind10}
        accessibilityLabel="Rewind 10 seconds"
      />

      {/* Previous — smart-prev: restart the current item when past the
          threshold, skip to the previous one otherwise. Wired through
          `skipPrev`, which owns that rule and its MMKV threshold. */}
      {state.canGoPrev ? (
        <PlayerControl
          testID="transport-prev"
          icon="skipBack"
          iconSize={CONTROL_ICON_SIZE_TRANSPORT}
          onPress={commands.skipPrev}
          accessibilityLabel="Previous track"
          accessibilityHint="Restarts the current item if it has only just started"
        />
      ) : null}

      <PlayerControl
        testID="transport-playpause"
        icon={playPauseIcon}
        iconSize={CONTROL_ICON_SIZE_TRANSPORT}
        targetSize={CONTROL_PRIMARY_TARGET}
        filled
        onPress={onPlayPause}
        accessibilityLabel={playPauseLabel}
      />

      {state.canGoNext ? (
        <PlayerControl
          testID="transport-next"
          icon="skipForward"
          iconSize={CONTROL_ICON_SIZE_TRANSPORT}
          onPress={commands.next}
          accessibilityLabel="Next track"
        />
      ) : null}

      <PlayerControl
        testID="transport-forward10"
        icon="forward10"
        iconSize={CONTROL_ICON_SIZE_TRANSPORT}
        onPress={commands.forward10}
        accessibilityLabel="Forward 10 seconds"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CONTROL_GAP,
    // Every child is a fixed-size target, so the row's own height is
    // the primary control's — the 56 pt play/pause sets the band and
    // the 44 pt neighbours centre inside it. Without this the row
    // collapsed to the icon height and the targets overlapped.
    minHeight: CONTROL_PRIMARY_TARGET,
    paddingVertical: spacing.xs,
  },
});

export default TransportRow;

// Named re-export for callers that prefer named imports (test suites,
// sibling chrome primitives). Both reference the SAME component.
export {TransportRow};
