// ────────────────────────────────────────────────────────
// Simba Player — ArtistBio Component (Phase 16.5)
// Expandable bio section with Show more/Show less
// ────────────────────────────────────────────────────────

import React, {useState, useCallback} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';

interface ArtistBioProps {
  /** Full bio text, or empty string if unavailable */
  bio?: string;
}

const MAX_LINES_COLLAPSED = 3;

export const ArtistBio: React.FC<ArtistBioProps> = ({bio}) => {
  const {colors} = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const hasBio = bio && bio.trim().length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
        },
      ]}>
      <AppText variant="h3" color="primary" style={styles.sectionTitle}>
        About
      </AppText>

      {hasBio ? (
        <>
          <AppText
            variant="body2"
            color="secondary"
            numberOfLines={expanded ? undefined : MAX_LINES_COLLAPSED}>
            {bio}
          </AppText>
          {bio.length > 120 && (
            <TouchableOpacity
              onPress={toggleExpanded}
              activeOpacity={0.7}
              style={styles.toggleBtn}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Show less' : 'Show more'}>
              <AppText variant="body2" color="accent">
                {expanded ? 'Show less' : 'Show more'}
              </AppText>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <AppText variant="body2" color="secondary" style={styles.placeholder}>
            Artist information is not yet available. Metadata will be enriched
            as more files are scanned.
          </AppText>
          <AppText variant="caption" color="tertiary" style={styles.hint}>
            Bio data from MusicBrainz or other sources will appear here.
          </AppText>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  toggleBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  placeholder: {
    lineHeight: 22,
  },
  hint: {
    marginTop: spacing.sm,
  },
});
