// ────────────────────────────────────────────────────────
// Simba Player — SongMetadata Component (Phase 18)
// Duration, format, genre, year, file path (tap to copy)
// ────────────────────────────────────────────────────────

import React from 'react';
import {View, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {spacing, radius} from '../../../theme/tokens';

interface MetadataRow {
  label: string;
  value: string;
  actionable?: boolean;
  onPress?: () => void;
}

interface SongMetadataProps {
  duration: string;
  format: string;
  genre: string | null;
  year: number;
  filePath: string;
  onCopyPath: () => void;
}

export const SongMetadata: React.FC<SongMetadataProps> = ({
  duration,
  format,
  genre,
  year,
  filePath,
  onCopyPath,
}) => {
  const {colors} = useTheme();

  const rows: MetadataRow[] = [
    {label: 'Duration', value: duration},
    {label: 'Format', value: format},
    {label: 'Genre', value: genre || '—'},
    {label: 'Year', value: year > 0 ? String(year) : '—'},
    {label: 'Bitrate', value: '—'},
    {label: 'Sample Rate', value: '—'},
    {label: 'Channels', value: '—'},
    {label: 'File Size', value: '—'},
  ];

  return (
    <View style={styles.section}>
      <AppText variant="displaySans" color="secondary" style={styles.sectionTitle}>
        Details
      </AppText>

      <View style={[styles.card, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
        {/* 59.1: virtualized metadata rows */}
        <FlatList
          data={rows}
          keyExtractor={row => row.label}
          renderItem={({item: row, index: idx}) => (
            <View
              style={[
                styles.row,
                idx < rows.length - 1 && {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle},
              ]}>
              <AppText variant="body2" color="tertiary" style={styles.label}>
                {row.label}
              </AppText>
              <AppText variant="body2" color="primary" style={styles.value}>
                {row.value}
              </AppText>
            </View>
          )}
          scrollEnabled={false}
          initialNumToRender={rows.length}
        />
      </View>

      {/* File path — tap to copy */}
      <TouchableOpacity
        style={[styles.pathCard, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}
        onPress={onCopyPath}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Copy file path">
        <AppText variant="caption" color="tertiary" style={styles.pathLabel}>
          File Path
        </AppText>
        <AppText variant="body2" color="primary" numberOfLines={2} style={styles.pathValue}>
          {filePath}
        </AppText>
        <AppText variant="caption" color="accent" style={styles.copyHint}>
          Tap to copy
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  label: {
    flex: 1,
  },
  value: {
    fontWeight: '500',
    textAlign: 'right',
  },
  pathCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: spacing.sm,
  },
  pathLabel: {
    marginBottom: 4,
  },
  pathValue: {
    fontWeight: '500',
  },
  copyHint: {
    marginTop: 4,
    fontStyle: 'italic',
  },
});
