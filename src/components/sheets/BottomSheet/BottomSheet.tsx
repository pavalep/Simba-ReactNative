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
// ── Why sheet bodies must NOT use `flex: 1` ───────────────────────────
//
// true-sheet 4.x sizes the sheet by measuring its content view with an
// UNBOUNDED height (TrueSheetContentViewShadowNode.updateNaturalHeightIfNeeded).
// In that pass there is no free space for `flexGrow` to distribute, so a
// child styled `flex: 1` resolves to its `flexBasis` — which for the
// shorthand `flex: 1` is 0. The body measures to zero, `naturalHeight`
// collapses to whatever intrinsic-height siblings exist, and the sheet
// renders as an empty panel with only those siblings visible. This is
// what blacked out the Movies filter sheet.
//
// The two things a scrolling body needs, both required:
//   1. NO `flex: 1` on the body — let it take its natural height, and
//      let `scrollableRef` let the sheet cap + scroll it.
//   2. `scrollableRef` — without it `findScrollView()` returns null and
//      the sheet never discovers its own body.
//
//   - `snapPoints: ['40%', '75%']`  →  `detents: [0.4, 0.75]` (fractions)
//   - `initialSnap`                 →  `initialDetentIndex`
//   - `dismissable`                 →  `dismissible` (true-sheet spelling)
//   - `onClose` callback            →  `onDidDismiss` event
//   - `onSnapChange`                →  `onDetentChange` event

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
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
  /**
   * Snap points, smallest first. `'40%'` / `0.4` are screen fractions;
   * `'auto'` sizes the sheet to its content; `'peek'` is the peek
   * detent. `'auto'` is what a content-sized sheet should rest at — a
   * fixed fraction either clips the body or leaves a dead panel below it.
   */
  snapPoints?: Array<string | number>;
  /** Initial snap index (default 0 = first snap). */
  initialSnap?: number;
  /** Optional snap-change callback. */
  onSnapChange?: (index: number) => void;
  /** Sheet title (optional). String or custom React node. */
  title?: string | React.ReactNode;
  /** Backdrop tap / drag closes the sheet (default true). */
  dismissable?: boolean;
  /**
   * Ref to the scrollable the caller renders as the sheet body
   * (`ScrollView` / `FlatList`). Required whenever the body scrolls.
   *
   * true-sheet 4.x resolves this to a React tag and hands it to the
   * native content view, which is the ONLY way the sheet discovers its
   * scrollable: `TrueSheetContentView.findScrollView()` returns null for
   * a handle it never received. Without it the sheet cannot measure or
   * scroll its body, and a `flex: 1` body collapses to zero height —
   * an empty sheet with only its intrinsic-height footer showing.
   *
   * This is a straight pass-through of true-sheet's own prop; there is
   * no inference or auto-discovery here, because the wrapper cannot see
   * into the caller's children to find a ref.
   */
  scrollableRef?: React.RefObject<React.Component<unknown> | null>;
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

/** true-sheet's own detent type: a screen fraction, or a keyword. */
type SheetDetent = number | 'auto' | 'peek';

/** Convert any snap-point format into a true-sheet detent. */
function snapToDetent(snap: string | number): SheetDetent {
  // Keywords pass straight through — they are already valid detents and
  // carry meaning a fraction cannot (size to content, peek behind the
  // screen edge).
  if (snap === 'auto' || snap === 'peek') return snap;
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
    scrollableRef,
    children,
  } = props;

  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<TrueSheet>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  /**
   * Whether the native sheet is presented, and the in-flight `present()`
   * promise while it isn't yet.
   *
   * true-sheet's native methods are not idempotent in either direction:
   * `dismiss()` on a sheet that was never presented warns and no-ops,
   * and `resize()` before the sheet is presented is rejected outright
   * ("Cannot resize. Sheet is not presented"). Both used to happen on
   * every open, because a plain `visible` effect fires once on mount
   * with `visible === false`, and because a consumer's resize effect
   * runs in the same commit as our `present()` — which is still async.
   *
   * So we gate on real presentation, and defer a resize that arrives
   * before presentation onto the present promise instead of dropping it.
   */
  const presentedRef = useRef(false);
  const presentationRef = useRef<Promise<void> | null>(null);

  // Coerce caller-provided snap points to true-sheet detents. true-sheet
  // caps detents at 3 — anything longer is silently trimmed.
  const detents = useMemo(
    () => snapPoints.map(snapToDetent).slice(0, 3),
    [snapPoints],
  );

  /**
   * Cap for the `'auto'` detent, in dp.
   *
   * `auto` has no intrinsic ceiling of its own: true-sheet only clamps it
   * to the window height, so a long body would make detent 0 TALLER than
   * detent 1 and invert the sheet's rest stops. Deriving the cap from the
   * largest explicit detent keeps `auto` ≤ the expanded stop by
   * construction, so a caller can write `['auto', '92%']` and get both
   * "opens snug" and "never grows past the expanded stop, scrolls
   * instead" without restating the ceiling.
   *
   * Undefined when the caller has no `auto` detent — the cap would then
   * be meaningless, and would silently shrink a fixed-fraction sheet.
   */
  const maxContentHeight = useMemo(() => {
    if (!detents.includes('auto')) return undefined;
    const explicit = detents.filter(
      (d): d is number => typeof d === 'number',
    );
    const largest = explicit.length ? Math.max(...explicit) : 0.9;
    return Math.round(largest * Dimensions.get('window').height);
  }, [detents]);

  // ── Drive show / hide imperatively ──
  // true-sheet mounts but doesn't auto-present. We call present() on a
  // false→true transition and dismiss() on true→false. The initial mount
  // is deliberately NOT a transition: a sheet that starts hidden is
  // already in its desired state, and dismissing it would warn.
  useEffect(() => {
    if (visible) {
      if (presentedRef.current) return;
      presentedRef.current = true;
      presentationRef.current = sheetRef.current?.present(initialSnap) ?? null;
    } else {
      if (!presentedRef.current) return;
      presentedRef.current = false;
      presentationRef.current = null;
      sheetRef.current?.dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleDidDismiss = useCallback(() => {
    // The user dismissed it natively (backdrop, drag, back button), so
    // the native and JS views of "presented" are back in step before
    // `onClose` asks the parent to flip `visible`.
    presentedRef.current = false;
    presentationRef.current = null;
    onCloseRef.current();
  }, []);

  const resize = useCallback((index: number) => {
    const pending = presentationRef.current;
    if (pending) {
      void pending.then(() => sheetRef.current?.resize(index));
      return;
    }
    void sheetRef.current?.resize(index);
  }, []);

  // ── Imperative handle for callers that want ref-based control ──
  React.useImperativeHandle(
    ref,
    () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
      resize,
    }),
    [resize],
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
      // The caller's ref to ITS scrollable. true-sheet resolves it to a
      // React tag and uses it to find, measure and scroll the body — see
      // the `scrollableRef` prop doc above. Omitting it is what produced
      // the empty-sheet body (a `flex: 1` body with no discoverable
      // scrollable measures to zero).
      scrollableRef={scrollableRef}
      // Ceiling for the 'auto' detent — see the `maxContentHeight` memo.
      maxContentHeight={maxContentHeight}
      // We use "never" and let the consumer add insets.bottom to their
      // last child (footer / reset button / etc.). With "automatic"
      // true-sheet pulls the sheet above the gesture bar AND reports
      // insets.bottom = 0 inside the sheet, which makes any consumer
      // bottom padding a fixed value that doesn't grow on devices with
      // tall gesture regions (Android edge-to-edge nav bar, ~32dp).
      insetAdjustment="never"
      backgroundColor={colors.background.elevated}
      cornerRadius={radius.lg}
      onDidDismiss={handleDidDismiss}
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
      {/* true-sheet wraps children in a native content view sized to the
          sheet's visible height. A `flex: 1` body fills that height only
          once `scrollableRef` has let the sheet discover it, so the
          caller passes its ScrollView/FlatList straight through — no
          extra flex wrapper. */}
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