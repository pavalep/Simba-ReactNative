import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {radius} from '../../../theme/tokens';
import {useTheme} from '../../../theme';

export interface PlayerErrorFallbackProps {
  title: string;
  message: string;
  detail?: string;
  /** Optional error code shown in caption style */
  errorCode?: string;
  /** Optional file name shown in detail */
  fileName?: string;
  onRetry: () => void;
  onGoBack?: () => void;
  /** Override for the go-back button label (default: "Choose Different File") */
  goBackLabel?: string;
  /** Optional callback to open settings */
  onOpenSettings?: () => void;
}

export const PlayerErrorFallback: React.FC<PlayerErrorFallbackProps> = ({
  title,
  message,
  detail,
  errorCode,
  fileName,
  onRetry,
  onGoBack,
  goBackLabel = 'Choose Different File',
  onOpenSettings,
}) => {
  const {colors} = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: colors.background.primary}]}>
      {/* Error icon */}
      <View style={[styles.iconCircle, {backgroundColor: colors.semantic.error + '26'}]}>
        <AppText style={[styles.iconChar, {color: colors.semantic.error}]}>!</AppText>
      </View>

      {/* Title */}
      <AppText variant="h2" color="primary" style={styles.title}>
        {title}
      </AppText>

      {/* Message */}
      <AppText variant="body2" color="secondary" style={styles.message}>
        {message}
      </AppText>

      {/* Error code / file name */}
      {(errorCode || fileName) && (
        <View style={styles.metaRow}>
          {errorCode && (
            <AppText variant="caption" color="tertiary" style={styles.metaText}>
              Code: {errorCode}
            </AppText>
          )}
          {fileName && (
            <AppText variant="caption" color="tertiary" style={styles.metaText} numberOfLines={1}>
              {fileName}
            </AppText>
          )}
        </View>
      )}

      {/* Detail */}
      {detail && (
        <AppText variant="caption" color="tertiary" style={styles.detailText}>
          {detail}
        </AppText>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, {backgroundColor: colors.accent.gold}]}
          onPress={onRetry}
          activeOpacity={0.8}>
          <AppText
            variant="body2"
            style={[styles.btnLabel, {color: colors.text.primary}]}>
            Retry
          </AppText>
        </TouchableOpacity>

        {onGoBack && (
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, {borderColor: colors.border.subtle}]}
            onPress={onGoBack}
            activeOpacity={0.8}>
            <AppText variant="body2" color="primary">
              {goBackLabel}
            </AppText>
          </TouchableOpacity>
        )}

        {onOpenSettings && (
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, {borderColor: colors.accent.gold}]}
            onPress={onOpenSettings}
            activeOpacity={0.8}>
            <AppText variant="body2" color="primary">
              Open Settings
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconChar: {
    fontSize: 36,
    fontWeight: '700',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  metaText: {
    textAlign: 'center',
  },
  detailText: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  actions: {
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: radius.sm,
    minWidth: 160,
    alignItems: 'center',
  },
  btnSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnLabel: {
    fontWeight: '600',
  },
});
