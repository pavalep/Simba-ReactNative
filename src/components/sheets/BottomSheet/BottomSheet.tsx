// ─── BottomSheet — true-sheet wrapper (KISS) ───────────────────────────
//
// Thin shim over @lodev09/react-native-true-sheet that preserves the
// project's existing call-site API: every caller passes visible,
// onClose, optional snapPoints, optional title, optional dismissable,
// and children. Every existing caller (FilterSheet, QueueSheet,
// PlaylistSheet, BookmarkSheet, InfoSheet, VideoPlayer overlays,
// PlaylistCreateModal, PlaylistContextMenu, SleepTimerSheet) keeps
// working unchanged.
//
// We chose true-sheet over @gorhom/bottom-sheet because gorhom 5.2.14
// uses the legacy `runOnJS` scheduling API and silently fails to mount
// its modal on the New Architecture + reanimated 4.3+ combo our stack
// uses (gorhom issue #2696). true-sheet ships native iOS / Android
// sheets and bypasses that JS-side brokenness entirely.
//
//   - `snapPoints: ['40%', '75%']`  →  `detents: [0.4, 0.75]` (fractions)
//   - `initialSnap`                 →  `initialDetentIndex`
//   - `dismissable`                 →  `dismissible` (true-sheet spelling)
//   - `onClose` callback            →  `onDidDismiss` event
//   - `onSnapChange`                →  `onDetentChange` event

import React, {useEffect, useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {TrueSheet, type DetentChangeEvent} from '@lodev09/react-native-true-sheet';

// The ref type exported by true-sheet is `TrueSheet` (the class); the
// methods we actually call (present / dismiss / resize) live on the
// `TrueSheetMethods` interface that the class implements, but TS won't
// accept the narrower interface for a `Ref<TrueSheet>`. We keep the
// full class ref and use a local alias for the imperative handle.
type TrueSheetApi = {
  present: (index?: number, animated?: boolean) => Promise<void>;
  dismiss: (animated?: boolean) => Promise<void>;
  resize: (index: number) => Promise<void>;
};
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

export interface BottomSheetProps<T = unknown> {
  /** Whether the sheet is visible. */
  visible: boolean;
  /** Called when the sheet requests close (backdrop tap, drag, back btn). */
  onClose: () => void;
  /** Snap points as strings ('40%') or absolute numbers (pixels).
   *  true-sheet only accepts fractions 0-1, so we coerce anything else. */
  snapPoints?: Array<string | number>;
  /** Initial snap index (default 0 = first snap). */
  initialSnap?: number;
  /** Optional snap-change callback. */
  onSnapChange?: (index: number) => void;
  /** Sheet title (optional). String or custom React node. */
  title?: string | React.ReactNode;
  /** Backdrop tap / drag closes the sheet (default true). */
  dismissable?: boolean;
  /** Children rendered inside the sheet (after the header). */
  children: React.ReactNode;
  /** Typed data payload — opaque to the sheet itself. */
  data?: T;
}

/** Imperative handle exposed via ref. Mirrors true-sheet's API. */
export interface BottomSheetHandle {
  present: () => void;
  dismiss: () => void;
  resize: (index: number) => void;
}

/** Convert any snap-point format into a true-sheet fraction (0-1). */
function snapToDetent(snap: string | number): number {
  if (typeof snap === 'number') {
    return snap <= 1 ? snap : 0.5;
  }
  if (snap.endsWith('%')) {
    return Math.max(0.05, Math.min(1, parseFloat(snap) / 100));
  }
  return Math.max(0.05, Math.min(1, parseFloat(snap)));
}

function BottomSheetInner<T>(
  props: BottomSheetProps<T>,
  ref: React.Ref<BottomSheetHandle>,
) {
  const {
    visible,
    onClose,
    snapPoints = ['50%'],
    initialSnap = 0,
    onSnapChange,
    title,
    dismissable = true,
    children,
  } = props;

  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<TrueSheet>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Coerce caller-provided snap points to true-sheet fractions. true-sheet
  // caps detents at 3 — anything longer is silently trimmed.
  const detents = useMemo(
    () => snapPoints.map(snapToDetent).slice(0, 3),
    [snapPoints],
  );

  // ── Drive show / hide imperatively ──
  // true-sheet mounts but doesn't auto-present. We call present() on
  // visible=true and dismiss() on visible=false. Detent index comes from
  // `initialSnap` (default 0).
  useEffect(() => {
    if (visible) {
      sheetRef.current?.present(initialSnap);
    } else {
      sheetRef.current?.dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Imperative handle for callers that want ref-based control ──
  React.useImperativeHandle(
    ref,
    () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
      resize: (i: number) => {
        sheetRef.current?.resize(i);
      },
    }),
    [],
  );

  return (
    <TrueSheet
      ref={sheetRef}
      // -1 means "not presented". true-sheet's docs say present() must be
      // called to actually show the sheet — initialDetentIndex alone won't.
      initialDetentIndex={-1}
      detents={detents}
      dismissible={dismissable}
      grabber
      // On Android, the `scrollable` prop applies `flex: 1` to the native
      // content view, which is REQUIRED for child ScrollViews (FilterSheet,
      // QueueSheet, etc.) to size correctly. Without it the body collapses
      // to zero height and only the title row is visible.
      scrollable
      // We use "never" and let the consumer add insets.bottom to their
      // last child (footer / reset button / etc.). With "automatic"
      // true-sheet pulls the sheet above the gesture bar AND reports
      // insets.bottom = 0 inside the sheet, which makes any consumer
      // bottom padding a fixed value that doesn't grow on devices with
      // tall gesture regions (Android edge-to-edge nav bar, ~32dp).
      insetAdjustment="never"
      backgroundColor={colors.background.elevated}
      cornerRadius={radius.lg}
      onDidDismiss={() => onCloseRef.current()}
      onDetentChange={(event: DetentChangeEvent) =>
        onSnapChange?.(event.nativeEvent.index)
      }
      style={
        // Only apply the inner bottom padding when a title row is shown
        // — the title sits above the content and needs clearance. Sheets
        // without a title (FilterSheet with pinned footer) want their
        // last child to touch the sheet edge, so we drop the padding.
        title
          ? {paddingBottom: spacing.md + insets.bottom}
          : undefined
      }>
      {/* true-sheet wraps its children in a native content view. Pass the
          ScrollView / content the caller supplied directly — NO flex:1
          wrapper above it, because the native content view doesn't have
          an explicit height for `flex:1` to resolve and the body collapses
          to zero (the "empty sheet" symptom). */}
      {title ? (
        <View
          style={[
            styles.header,
            {borderBottomColor: colors.border.subtle},
          ]}>
          {typeof title === 'string' ? (
            <AppText
              style={[
                styles.headerTitle,
                {color: colors.text.primary},
              ]}>
              {title}
            </AppText>
          ) : (
            <View style={styles.headerCustom}>{title}</View>
          )}
        </View>
      ) : null}
      {children}
    </TrueSheet>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BottomSheet = React.forwardRef(BottomSheetInner) as <T = unknown>(
  props: BottomSheetProps<T> & {ref?: React.Ref<BottomSheetHandle>},
) => React.ReactElement;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerCustom: {
    flex: 1,
  },
});