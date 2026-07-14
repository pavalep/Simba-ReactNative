import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useColors} from '../../context/ThemeContext';
import {makeStyles} from '../../utils/makeStyles';
import {radius} from '../../constants/radius';

// ── SectionHeader ──────────────────────────────────
interface SectionHeaderProps {
  children: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({children}) => {
  const styles = useStyles();
  return (
    <Text style={styles.sectionHeader}>{children.toUpperCase()}</Text>
  );
};

// ── PrefCard ────────────────────────────────────────
interface PrefCardProps {
  children: React.ReactNode;
}

export const PrefCard: React.FC<PrefCardProps> = ({children}) => {
  const styles = useStyles();
  return <View style={styles.prefCard}>{children}</View>;
};

// ── PrefDivider ─────────────────────────────────────
export const PrefDivider: React.FC = () => {
  const styles = useStyles();
  return <View style={styles.prefDivider} />;
};

// ── Toggle ──────────────────────────────────────────
interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({value, onValueChange}) => {
  const colors = useColors();
  const styles = useStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
      style={styles.toggle}
      accessibilityRole="switch"
      accessibilityState={{checked: value}}
    >
      <View
        style={[
          styles.toggleTrack,
          {backgroundColor: value ? colors.accentDim : 'rgba(255,255,255,0.12)'},
        ]}
      />
      <View
        style={[
          styles.toggleThumb,
          {
            left: value ? 22 : 2,
            backgroundColor: value ? colors.accentLight : colors.textHint,
          },
        ]}
      />
    </TouchableOpacity>
  );
};

// ── SettingRow ──────────────────────────────────────
interface SettingRowProps {
  label: string;
  description: string;
  control: React.ReactNode;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  control,
}) => {
  const styles = useStyles();
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
      {control}
    </View>
  );
};

// ── InputGroup ──────────────────────────────────────
interface InputGroupProps {
  label: string;
  value: string;
  hint: string;
  onChangeText: (text: string) => void;
}

export const InputGroup: React.FC<InputGroupProps> = ({
  label,
  value,
  hint,
  onChangeText,
}) => {
  const colors = useColors();
  const styles = useStyles();

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.inputBox,
          {
            color: colors.osdForeground,
            backgroundColor: colors.bgPrimary,
            borderColor: colors.popoverBorder,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textHint}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.inputHint}>{hint}</Text>
    </View>
  );
};

// ── ShortcutRow ─────────────────────────────────────
interface ShortcutRowProps {
  keyCombo: string;
  action: string;
}

export const ShortcutRow: React.FC<ShortcutRowProps> = ({keyCombo, action}) => {
  const styles = useStyles();
  return (
    <View style={styles.shortcutRow}>
      <Text style={styles.shortcutKey}>{keyCombo}</Text>
      <Text style={styles.shortcutAction}>{action}</Text>
    </View>
  );
};

// ── Styles ──────────────────────────────────────────
const useStyles = makeStyles(colors =>
  StyleSheet.create({
    sectionHeader: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.2,
      color: colors.textTertiary,
      marginBottom: 10,
      marginTop: 22,
    },
    prefCard: {
      backgroundColor: colors.popoverBg,
      borderWidth: 1,
      borderColor: colors.popoverBorder,
      borderRadius: radius.sm,
      padding: 12,
      marginBottom: 4,
    },
    prefDivider: {
      height: 1,
      backgroundColor: colors.popoverBorder,
      marginVertical: 10,
    },
    toggle: {
      position: 'relative',
      flexShrink: 0,
      width: 44,
      height: 24,
      justifyContent: 'center',
    },
    toggleTrack: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },
    toggleThumb: {
      position: 'absolute',
      top: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.osdForeground,
    },
    settingDesc: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 2,
    },
    inputGroup: {
      marginTop: 8,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      marginBottom: 4,
    },
    inputBox: {
      padding: 8,
      borderRadius: radius.xs,
      borderWidth: 1,
      fontSize: 11,
    },
    inputHint: {
      fontSize: 9,
      color: colors.textTertiary,
      marginTop: 4,
    },
    shortcutRow: {
      flexDirection: 'row',
      paddingVertical: 6,
      gap: 16,
    },
    shortcutKey: {
      width: 120,
      flexShrink: 0,
      fontSize: 11,
      fontWeight: '600',
      color: colors.osdForeground,
    },
    shortcutAction: {
      fontSize: 11,
      color: colors.textSecondary,
    },
  }),
);
