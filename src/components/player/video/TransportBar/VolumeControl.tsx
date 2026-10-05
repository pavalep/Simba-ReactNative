/**
 * V19 W7.3 — `VolumeControl`: the player's audio surface.
 *
 * ## The defect this fixes
 *
 * The reported complaint was "there is no volume icon, no volume bar, no
 * mute". That was not an oversight in one file — the chrome simply had
 * no audio control surface. `TransportState` exposed `volume` and
 * `isMuted` and nothing read them, so the only way to change the volume
 * was to drag an invisible strip on the video itself, with no on-screen
 * level and no way to mute at all.
 *
 * ## Why the slider is PERSISTENT, not expand-on-tap
 *
 * The first version made the speaker glyph reveal a hidden slider, and
 * its own test suite immediately caught the consequence: a control
 * labelled "Mute" that only expanded a panel and never muted. That is
 * invariant I3 in its purest form — a control that looks live and does
 * not do what it says — and it is worse than having no control.
 *
 * Two honest affordances are now both visible at rest:
 *
 *   - the speaker glyph, whose label names the ACTION ("Mute" /
 *     "Unmute"), which mutes;
 *   - a slider, which sets the level.
 *
 * This is also the industry pattern. Huawei Video, Tencent Video, Apple
 * TV and YouTube all keep a volume slider in the transport band rather
 * than hiding it behind a second tap: a control the user has to discover
 * before they can adjust anything is worse than a few pixels of
 * permanent chrome, and the horizontal budget here (a landscape phone)
 * comfortably affords it. A previous draft also animated the row's
 * width open and closed, which made the neighbouring controls slide
 * sideways every time the user touched it.
 *
 * ## Why mute is NOT `setVolume(0)`
 *
 * `mute` and `volume` are two different mpv properties. Simulating a
 * mute by writing volume 0 destroys the level the user had chosen, and
 * the unmute then has to invent a value to restore — which is why
 * players that fake it either come back silent or come back at 100%. The
 * lib already ships a real `commands.setMuted(boolean)`, so this control
 * calls that, and `state.volume` is preserved across the cycle. The
 * test suite pins this specifically.
 *
 * ## The gesture relationship with `VerticalSwipeGestures`
 *
 * That component also drives volume, by dragging on the video. The two
 * are deliberately NOT kept in sync by shared state — they read and
 * write the SAME lib property, so the slider reflects a swipe within
 * one state tick, and a swipe updates the slider. There is no second
 * store that could drift.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md`
 * §3.2; `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.3.
 */

import * as React from 'react';
import {StyleSheet, View} from 'react-native';
import Slider from '@react-native-community/slider';
import {useTheme} from '../../../../theme';
import {useTransport} from '../../../../infrastructure/player';
import {PlayerControl, CONTROL_ICON_SIZE} from '../PlayerControl/PlayerControl';

/** Width of the slider track, in dp. */
const SLIDER_WIDTH = 96;

/** Minimum width of the mute toggle, so the row never reflows. */
const TOGGLE_WIDTH = 44;

export const VolumeControl: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();

  const isMuted = state.isMuted;
  const volume = state.volume;

  /**
   * The glyph is `volumeMute` only when genuinely silent. A separate
   * "low" glyph does not exist in the registry, and inventing one to
   * distinguish 30% from 70% would add a control state the user can
   * already read from the slider's own thumb position.
   */
  const onToggleMute = React.useCallback(() => {
    commands.setMuted(!isMuted);
  }, [commands, isMuted]);

  const onChange = React.useCallback(
    (value: number) => {
      // Dragging a muted slider up is an implicit unmute in every player
      // the user has ever used. Treating it as anything else leaves them
      // dragging a control that appears to do nothing.
      if (isMuted && value > 0) {
        commands.setMuted(false);
      }
      commands.setVolume(value);
    },
    [commands, isMuted],
  );

  // While muted the slider must READ as silent. Seeding it with the real
  // volume would show a full-looking track on a muted player, so the
  // drag would appear to do nothing until the user moved it.
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <View style={styles.container}>
      <PlayerControl
        testID="volume-toggle"
        icon={isMuted ? 'volumeMute' : 'volume'}
        iconSize={CONTROL_ICON_SIZE}
        onPress={onToggleMute}
        accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
        accessibilityHint="Toggles audio output"
        // Gold when muted, so the state is legible without relying on
        // the glyph alone (WCAG 1.4.1) — the glyph swap carries the same
        // information for anyone who cannot see colour.
        tint={isMuted ? colors.accent.gold : colors.text.onMediaSoft}
        style={styles.toggle}
      />

      <Slider
        testID="volume-slider"
        style={styles.slider}
        value={effectiveVolume}
        minimumValue={0}
        maximumValue={100}
        step={1}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent.gold}
        maximumTrackTintColor={colors.background.onMediaPillBorder}
        thumbTintColor={colors.accent.gold}
        accessibilityLabel="Volume"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(effectiveVolume),
          text: `${Math.round(effectiveVolume)} percent`,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    // The slider sits closer to its own glyph than to the next control,
    // so it reads as belonging to the volume button rather than as a
    // stray second progress bar.
    gap: 2,
  },
  toggle: {
    width: TOGGLE_WIDTH,
  },
  slider: {
    width: SLIDER_WIDTH,
    height: 40,
  },
});

export default VolumeControl;
