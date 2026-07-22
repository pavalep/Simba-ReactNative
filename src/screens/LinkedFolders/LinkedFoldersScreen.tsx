import React, {useMemo, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  addVideoFolder,
  removeVideoFolder,
  addAudioFolder,
  removeAudioFolder,
  setScanning,
  setLastScanTimestamp,
} from '../../store/slices/settingsSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {LinkedFoldersScreenProps} from '../../navigation/types';

type Props = LinkedFoldersScreenProps;

export const LinkedFoldersScreen: React.FC<Props> = ({route, navigation}) => {
  const {type} = route.params;
  const {colors} = useTheme();
  const dispatch = useAppDispatch();
  const isVideo = type === 'video';

  const folders = useAppSelector(s =>
    isVideo ? s.settings.videoFolders : s.settings.audioFolders,
  );
  const isScanning = useAppSelector(s => s.settings.isScanning);
  const lastScanTimestamp = useAppSelector(s => s.settings.lastScanTimestamp);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background.primary,
        },
        scrollContent: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl * 2,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        },
        backButton: {
          marginRight: spacing.sm,
          padding: spacing.xs,
        },
        backIcon: {
          opacity: 0.65,
        },
        card: {
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
          marginBottom: spacing.lg,
          overflow: 'hidden',
        },
        folderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        folderPath: {
          flex: 1,
          marginRight: spacing.sm,
        },
        removeButton: {
          padding: spacing.xs,
        },
        removeText: {
          color: colors.semantic.error,
        },
        addButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border.subtle,
        },
        scanButton: {
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent.gold,
          paddingVertical: spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        },
        scanButtonText: {
          color: colors.accent.gold,
          fontWeight: '600',
        },
        scanButtonDisabled: {
          opacity: 0.5,
        },
        lastScan: {
          alignItems: 'center',
          marginBottom: spacing.lg,
        },
        emptyContainer: {
          alignItems: 'center',
          paddingVertical: spacing.xxl,
        },
        emptyText: {
          marginTop: spacing.sm,
          textAlign: 'center',
        },
      }),
    [colors],
  );

  const handleAddFolder = useCallback(() => {
    Alert.prompt(
      `Add ${isVideo ? 'Video' : 'Audio'} Folder`,
      'Enter the folder path:',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Add',
          onPress: (text?: string) => {
            const path = text?.trim();
            if (path) {
              if (isVideo) {
                dispatch(addVideoFolder(path));
              } else {
                dispatch(addAudioFolder(path));
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'default',
    );
  }, [dispatch, isVideo]);

  const handleRemoveFolder = useCallback(
    (folder: string) => {
      Alert.alert(
        'Remove Folder',
        `Remove "${folder}" from linked folders?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              if (isVideo) {
                dispatch(removeVideoFolder(folder));
              } else {
                dispatch(removeAudioFolder(folder));
              }
            },
          },
        ],
      );
    },
    [dispatch, isVideo],
  );

  const handleScan = useCallback(() => {
    dispatch(setScanning(true));
    // Simulate a scan with a timeout
    setTimeout(() => {
      dispatch(setScanning(false));
      dispatch(setLastScanTimestamp(Date.now()));
    }, 2000);
  }, [dispatch]);

  const formatLastScan = (timestamp: number | null): string => {
    if (timestamp === null) {
      return 'Never';
    }
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) {
      return 'Just now';
    }
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <AppText variant="h2" color="secondary" style={styles.backIcon}>
            ←
          </AppText>
        </TouchableOpacity>
        <AppText variant="h1" color="primary">
          {isVideo ? 'Video' : 'Audio'} Folders
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          activeOpacity={0.7}
          onPress={handleScan}
          disabled={isScanning}>
          {isScanning ? (
            <ActivityIndicator color={colors.accent.gold} size="small" />
          ) : (
            <AppText
              variant="body1"
              color="accent"
              style={styles.scanButtonText}>
              Scan Folders
            </AppText>
          )}
        </TouchableOpacity>

        {/* Last Scanned */}
        <View style={styles.lastScan}>
          <AppText variant="caption" color="tertiary">
            Last scanned: {formatLastScan(lastScanTimestamp)}
          </AppText>
        </View>

        {/* Folder List */}
        <View style={styles.card}>
          {folders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AppText variant="body2" color="tertiary" style={styles.emptyText}>
                No {isVideo ? 'video' : 'audio'} folders linked yet.
              </AppText>
              <AppText variant="caption" color="tertiary" style={styles.emptyText}>
                Tap "Add Folder" below to get started.
              </AppText>
            </View>
          ) : (
            folders.map((folder, index) => (
              <View key={`${folder}-${index}`} style={styles.folderRow}>
                <AppText
                  variant="body2"
                  color="primary"
                  style={styles.folderPath}
                  numberOfLines={1}>
                  {folder}
                </AppText>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFolder(folder)}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <AppText
                    variant="caption"
                    color="error"
                    style={styles.removeText}>
                    Remove
                  </AppText>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Add Folder Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddFolder}
            activeOpacity={0.7}>
            <AppText variant="body1" color="accent">
              + Add Folder
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
