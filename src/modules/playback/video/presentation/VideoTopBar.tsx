import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import strings from '../../../../constants/strings';
import {VideoControlButton} from './VideoControlButton';
import {useVideoPresentationGeometry} from './useVideoPresentationGeometry';

const TOP_BAR_HEIGHT = 96;
const BUTTON_HIT_SLOP = 44;
const ROW_GAP = 8;
const TITLE_SIDE_MARGIN = 8;

export interface VideoTopBarProps {
  readonly title: string;
  readonly onBack: () => void;
  readonly onClose: () => void;
  readonly onToggleLock?: () => void;
  readonly isLocked?: boolean;
  readonly onOpenMore?: () => void;
  /**
   * v11 T8.3: when `true`, the back button's label flips from
   * "Go back" to "Exit fullscreen" per spec §4.9 — landscape
   * chrome. The icon stays `back` (a chevron) so the visual
   * affordance is the same; only the spoken label changes.
   */
  readonly isFullscreen?: boolean;
  /**
   * Style override (tests / previews). The position is already
   * absolute; callers can tweak `top` / `height` for visuals.
   */
  readonly style?: ViewStyle;
}

/**
 * v11: the player's top chrome (spec §4.1).
 *
 * Layout: `back | title (ellipsised) | lock · more · close` over a
 * 96 px tall `scrimStrong → transparent` gradient. The top bar
 * itself never auto-hides in full mode (Rule 7) — only the bottom
 * bar + centre action fade during auto-hide. The mini player does
 * not mount this component.
 */
export function VideoTopBar({
  title,
  onBack,
  onClose,
  onToggleLock,
  isLocked = false,
  onOpenMore,
  isFullscreen = false,
  style,
}: VideoTopBarProps) {
  const geometry = useVideoPresentationGeometry();

  return (
    <LinearGradient
      pointerEvents="box-none"
      colors={[
        cinemaColors.background.scrimStrong,
        'rgba(10,10,12,0.00)',
      ]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={[
        styles.root,
        {
          paddingTop: geometry.topContentInset,
          paddingHorizontal: geometry.horizontalContentInset,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <VideoControlButton
          icon="back"
          // v11 T8.3: spec §4.9 — landscape chrome re-labels the
          // back button as "Exit fullscreen" so VoiceOver reads
          // the right affordance. The icon stays (chevron) so the
          // visual affordance is identical.
          label={isFullscreen ? strings.videoExitFullscreen : strings.videoGoBack}
          size="compact"
          onPress={onBack}
        />
        <Text
          style={styles.title}
          numberOfLines={1}
          ellipsizeMode="tail"
          allowFontScaling={false}
        >
          {title}
        </Text>
        <View style={styles.rightCluster}>
          {onToggleLock ? (
            <VideoControlButton
              icon={isLocked ? 'unlock' : 'lock'}
              label={isLocked ? strings.unlockControls : strings.lockControls}
              size="compact"
              onPress={onToggleLock}
            />
          ) : null}
          {onOpenMore ? (
            <VideoControlButton
              icon="more"
              label={strings.videoMoreOptions}
              size="compact"
              onPress={onOpenMore}
            />
          ) : null}
          <VideoControlButton
            icon="close"
            label={strings.videoClosePlayer}
            hint="Closes the video player and returns to the previous screen"
            size="compact"
            onPress={onClose}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TOP_BAR_HEIGHT,
    // The gradient owns the scrim; we sit on top of the surface, not
    // behind it. `box-none` lets taps pass through the empty middle
    // of the bar to the frame tap target below.
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    // Cormorant Garamond Italic 18 — the spec's title style. The v8
    // architecture encodes style in the family key
    // (`FONT_FAMILY.cormorant.italic` → the TTF whose `name` table
    // `nameId=1` reads "Cormorant Garamond"); `fontStyle: 'italic'`
    // is safe because the v8 picker restriction is on `fontWeight`,
    // not on `fontStyle`. We set `fontStyle` so iOS picks the
    // italic sub-family when the TTF name alone collides.
    fontFamily: FONT_FAMILY.cormorant.italic,
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 24,
    color: cinemaColors.text.bright,
    marginHorizontal: TITLE_SIDE_MARGIN,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
  },
});

// `BUTTON_HIT_SLOP` documents the spec's 44×44 hit-target requirement
// (already enforced by `VideoControlButton`'s `compact` size, which
// is 44×44). Exposed here so future code reviews can grep for the
// spec token without scanning the styles object.
export const VIDEO_TOP_BAR_BUTTON_HIT_SLOP = BUTTON_HIT_SLOP;
