/**
 * V19 W3.6 Phase 3.6.2 — `CaptionCustomizer`.
 *
 * Modal sheet with caption style controls: Font size, Background
 * opacity, Position. The settings persist via
 * `useCaptionSettingsStore` (MMKV) so user preferences follow
 * them across sessions.
 *
 * Lives in the More sheet's "Captions" submenu (per the spec).
 * Today there's no nested More submenu yet; the More sheet's
 * Track info / Captions entries can open this sheet via the
 * existing More-sheet wiring. A future W3.6.4+ enhancement can
 * route through a submenu.
 *
 * Layout: three vertical groups, each with a header + a row of
 * gold-highlighted chips (Apple-Music-style settings picker).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3 + TRACKER Phase 3.6.2.
 */

import * as React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {radius, spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {
  useCaptionSettingsStore,
  type CaptionFontSize,
  type CaptionBackgroundOpacity,
  type CaptionPosition,
  type CaptionBorder,
} from '../../../../state/useCaptionSettingsStore';

export interface CaptionCustomizerProps {
  visible: boolean;
  onClose: () => void;
}

const FONT_SIZE_OPTIONS: ReadonlyArray<{
  key: CaptionFontSize;
  label: string;
}> = [
  {key: 'small', label: 'S'},
  {key: 'medium', label: 'M'},
  {key: 'large', label: 'L'},
  {key: 'extra-large', label: 'XL'},
];

const BACKGROUND_OPACITY_OPTIONS: ReadonlyArray<{
  key: CaptionBackgroundOpacity;
  label: string;
}> = [
  {key: 'none', label: 'None'},
  {key: 'fifty', label: '50%'},
  {key: 'solid', label: 'Solid'},
];

const POSITION_OPTIONS: ReadonlyArray<{
  key: CaptionPosition;
  label: string;
}> = [
  {key: 'bottom', label: 'Bottom'},
  {key: 'top', label: 'Top'},
];

const BORDER_OPTIONS: ReadonlyArray<{key: CaptionBorder; label: string}> = [
  {key: 'none', label: 'None'},
  {key: 'thin', label: 'Thin'},
  {key: 'thick', label: 'Thick'},
];

export const CaptionCustomizer: React.FC<CaptionCustomizerProps> = ({
  visible,
  onClose,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  const fontSize = useCaptionSettingsStore(s => s.fontSize);
  const backgroundOpacity = useCaptionSettingsStore(s => s.backgroundOpacity);
  const position = useCaptionSettingsStore(s => s.position);
  const border = useCaptionSettingsStore(s => s.border);
  const setFontSize = useCaptionSettingsStore(s => s.setFontSize);
  const setBackgroundOpacity = useCaptionSettingsStore(
    s => s.setBackgroundOpacity,
  );
  const setPosition = useCaptionSettingsStore(s => s.setPosition);
  const setBorder = useCaptionSettingsStore(s => s.setBorder);

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
        accessibilityLabel="Close captions customizer"
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
              Caption style
            </AppText>
            <View
              style={[styles.divider, {backgroundColor: colors.border.subtle}]}
            />

            <CaptionGroup
              title="Font size"
              options={FONT_SIZE_OPTIONS}
              selected={fontSize}
              onSelect={key => setFontSize(key as CaptionFontSize)}
              colors={colors}
            />

            <CaptionGroup
              title="Background"
              options={BACKGROUND_OPACITY_OPTIONS}
              selected={backgroundOpacity}
              onSelect={key =>
                setBackgroundOpacity(key as CaptionBackgroundOpacity)
              }
              colors={colors}
            />

            <CaptionGroup
              title="Position"
              options={POSITION_OPTIONS}
              selected={position}
              onSelect={key => setPosition(key as CaptionPosition)}
              colors={colors}
            />

            <CaptionGroup
              title="Outline"
              options={BORDER_OPTIONS}
              selected={border}
              onSelect={key => setBorder(key as CaptionBorder)}
              colors={colors}
            />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

interface CaptionGroupProps {
  title: string;
  options: ReadonlyArray<{key: string; label: string}>;
  selected: string;
  onSelect: (key: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

const CaptionGroup: React.FC<CaptionGroupProps> = ({
  title,
  options,
  selected,
  onSelect,
  colors,
}) => (
  <View style={styles.group}>
    <AppText variant="caption" color="tertiary" style={styles.groupTitle}>
      {title}
    </AppText>
    <View style={styles.chipRow}>
      {options.map(opt => {
        const isActive = opt.key === selected;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${title}: ${opt.label}`}
            accessibilityState={{selected: isActive}}
            style={[
              styles.chip,
              isActive
                ? {backgroundColor: colors.accent.goldSoft, borderColor: colors.accent.gold}
                : {backgroundColor: colors.background.elevated, borderColor: colors.border.emphasis},
            ]}
          >
            <AppText
              variant="body2"
              color={isActive ? 'accent' : 'primary'}
            >
              {opt.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

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
    paddingVertical: spacing.md,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  group: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  groupTitle: {
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CaptionCustomizer;
