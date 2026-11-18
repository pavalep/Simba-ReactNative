/**
 * WAVE B15 — the player's MORE SHEET, shared by both lanes.
 *
 * ## Why this file exists
 *
 * The video lane had a "more" panel (`VideoMoreSheet`) and the audio lane
 * had NOTHING. That is the whole of the answer to "the audio player is
 * missing options the video player has":
 *
 *   - the sheet was written for the video lane, named for it, and mounted
 *     inside the video lane's transport bar;
 *   - the audio lane was rebuilt as its own tree (V22 W22) and inherited
 *     none of it;
 *   - nothing was ever REMOVED from the audio lane — the options were
 *     never there to begin with.
 *
 * So the fix is not "give the audio player four more buttons". It is to
 * make the sheet a shared piece of the player, owned by neither lane, and
 * let each lane say which rows IT has.
 *
 * ## What is shared and what is not
 *
 * SHARED (this file + `MoreSheetRows.tsx`): the panel, the backdrop, the
 * pinned header, the drag-to-dismiss, and the row grammar — one value row,
 * one toggle row, one action row. Two lanes with two sheets that look
 * different is how the video's sheet and the audio's sheet would drift
 * apart within a week.
 *
 * PER LANE: which rows exist. The video has a quality preset and a
 * caption-adjacent video surface; the audio has an equalizer. Neither
 * lane may show a row it cannot act on.
 *
 * ## The three exits are structural
 *
 * The sheet can always be closed:
 *
 *   1. tap the backdrop,
 *   2. drag the header down past a dismissal threshold,
 *   3. the ✕ in the PINNED header.
 *
 * The header is pinned OUTSIDE the scroll on purpose. A close button at
 * the bottom of a scroll is not a close button.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §1.4
 * and §3.3; `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.10.
 */

import * as React from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PanResponderGestureState,
} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing, radius} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {PlayerControl, CONTROL_ICON_SIZE} from '../PlayerControl/PlayerControl';

/* ─────────────────────────────────────────────────────────────────────────
 *                                CONSTANTS
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The resting height of the sheet.
 *
 * 90% (the old value) covered nine tenths of the player and left the film
 * as a sliver — the "it goes full screen" complaint. 62% keeps the player
 * visible above the panel, which is what a panel over a playing item is
 * for: you adjust a setting and watch the thing you adjusted.
 */
export const SHEET_MAX_HEIGHT = '62%';

/**
 * How far the sheet must be dragged down before it dismisses, in px.
 *
 * A fixed distance rather than a velocity test, because velocity alone
 * dismisses on a fast flick that was clearly a fling-to-scroll. 88 px
 * is roughly a thumb's worth of travel.
 */
export const DISMISS_DRAG_PX = 88;

/** Drag velocity that dismisses regardless of distance (a real flick). */
export const DISMISS_VELOCITY = 0.6;

/* ─────────────────────────────────────────────────────────────────────────
 *                            THE EXPANSION STATE
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Which setting row is expanded. EXACTLY ONE at a time.
 *
 * It lives in a hook rather than in the chrome because the chrome does
 * not know the rows — but the RULE ("one at a time") is the same rule in
 * both lanes, and two owners of it would be two chances to disagree.
 */
export interface MoreSheetExpansion {
  /** The key of the expanded row, or null when none is expanded. */
  readonly expanded: string | null;
  /** Expand this row, or collapse it if it is already the open one. */
  readonly toggle: (key: string) => void;
  /** Collapse whatever is open. Used when the sheet closes. */
  readonly collapse: () => void;
}

export function useMoreSheetExpansion(): MoreSheetExpansion {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const toggle = React.useCallback((key: string) => {
    setExpanded(prev => (prev === key ? null : key));
  }, []);

  const collapse = React.useCallback(() => setExpanded(null), []);

  return {expanded, toggle, collapse};
}

/* ─────────────────────────────────────────────────────────────────────────
 *                                 COMPONENT
 * ──────────────────────────────────────────────────────────────────────── */

export interface MoreSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The panel's title. Both lanes call it "More". */
  title?: string;
  /** The rows. */
  children: React.ReactNode;
  /** Test id for the panel itself — the sheet's stable handle. */
  testID?: string;
}

export const MoreSheet: React.FC<MoreSheetProps> = ({
  visible,
  onClose,
  title = 'More',
  children,
  testID = 'more-sheet',
}) => {
  const {colors} = useTheme();

  /**
   * Drag-to-dismiss. Wired to the HEADER only, never to the body — a
   * responder on the body would fight the `ScrollView`'s own pan and
   * the sheet would become impossible to scroll. The header is a fixed,
   * non-scrolling strip, so taking the gesture there costs nothing.
   */
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g: PanResponderGestureState) =>
          g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (
          _e,
          g: PanResponderGestureState,
        ) => {
          if (g.dy > DISMISS_DRAG_PX || g.vy > DISMISS_VELOCITY) {
            onClose();
          }
        },
      }),
    [onClose],
  );

  return (
    <Modal
      visible={visible}
      // `fade`, not `slide`: the sheet is a panel over a still-playing item.
      // A slide-up implies the media is being covered by a new page; a
      // cross-fade says a layer arrived over the top.
      animationType="fade"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.root}>
        {/* ── Backdrop: PRESSABLE ─────────────────────────────────────
            It was a plain `View`, so tapping outside did nothing and the
            only exit was a Close button scrolled off-screen. */}
        <Pressable
          testID="more-backdrop"
          style={[styles.backdrop, {backgroundColor: colors.background.scrim}]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close more menu"
          accessibilityHint="Dismisses this panel"
        />

        <View
          testID={testID}
          style={[
            styles.sheet,
            {
              maxHeight: SHEET_MAX_HEIGHT,
              backgroundColor: colors.background.onMediaSheet,
            },
          ]}
        >
          {/* ── Pinned header ───────────────────────────────────────────
              Outside the ScrollView, so the close control can never scroll
              out of reach. Drag it to dismiss. */}
          <View style={styles.header} {...panResponder.panHandlers}>
            <View
              style={[styles.handle, {backgroundColor: colors.border.emphasis}]}
            />
            <View style={styles.titleRow}>
              <AppText
                variant="h3"
                // V19 W8.7 — was `colors.text.inverse`, which is
                // "#0A0A0C" in the dark palette: "inverse of the theme
                // BACKGROUND". On this sheet's near-black surface that
                // is black text on black. An on-media surface takes
                // `onMedia*` ink (SPEC I13).
                color={colors.text.onMediaSoft}
                style={styles.sheetTitle}
              >
                {title}
              </AppText>
              <PlayerControl
                testID="more-close"
                icon="close"
                iconSize={CONTROL_ICON_SIZE}
                onPress={onClose}
                accessibilityLabel="Close more menu"
                accessibilityHint="Dismisses this panel"
                tint={colors.text.onMediaSoft}
              />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 *                                  STYLES
 * ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
});
