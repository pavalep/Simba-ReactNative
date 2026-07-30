import React, {useMemo, useCallback, useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
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
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ScanProgressBanner} from '../../components/feedback/ScanProgressBanner/ScanProgressBanner';
import {LinkedFoldersScreenProps} from '../../navigation/types';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';

type Props = LinkedFoldersScreenProps;

export const LinkedFoldersScreen: React.FC<Props> = ({route, navigation}) => {
  const {type} = route.params;
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const dispatch = useAppDispatch();
  const isVideo = type === 'video';

  const folders = useAppSelector(s =>
    isVideo ? s.settings.videoFolders : s.settings.audioFolders,
  );
  const isScanning = useAppSelector(s => s.settings.isScanning);
  const lastScanTimestamp = useAppSelector(s => s.settings.lastScanTimestamp);

  // ── Edge case states ──
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Add-folder modal state ──
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addInputValue, setAddInputValue] = useState('');

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
        card: {
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
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
        folderLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          gap: 10,
        },
        folderIconWrap: {
          width: 32,
          height: 32,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.08)',
        },
        folderPath: {
          flex: 1,
        },
        removeButton: {
          padding: spacing.xs,
        },
        removeText: {
          color: colors.semantic.error,
        },
        centerContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        retryButton: {
          marginTop: spacing.md,
          paddingVertical: 10,
          paddingHorizontal: 24,
          borderRadius: 10,
          backgroundColor: colors.accent.goldDim,
        },
        addButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border.subtle,
          gap: 8,
        },
        // ── Empty state ──
        emptyContainer: {
          alignItems: 'center',
          paddingVertical: spacing.xxl + spacing.lg,
          gap: spacing.sm,
        },
        emptyIcon: {
          opacity: 0.3,
        },
        // ── Modal ──
        modalOverlay: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background.overlay,
        },
        modalContent: {
          width: '85%',
          borderRadius: radius.md,
          backgroundColor: colors.background.elevated,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
        },
        modalTitle: {
          marginBottom: spacing.sm,
          textAlign: 'center',
        },
        modalSubtitle: {
          marginBottom: spacing.lg,
          textAlign: 'center',
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border.subtle,
          borderRadius: radius.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          color: colors.text.primary,
          fontSize: 15,
          backgroundColor: colors.background.floating,
          marginBottom: spacing.md,
        },
        modalActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: spacing.sm,
        },
        modalButton: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.sm,
        },
        modalButtonCancel: {
          backgroundColor: colors.background.floating,
        },
        modalButtonConfirm: {
          backgroundColor: colors.accent.gold,
        },
        modalButtonConfirmText: {
          color: colors.text.inverse,
          fontWeight: '600',
        },
      }),
    [colors, isDark],
  );

  const handleAddFolder = useCallback(() => {
    setAddInputValue('');
    setAddModalVisible(true);
  }, []);

  const confirmAddFolder = useCallback(() => {
    const path = addInputValue.trim();
    if (path) {
      if (isVideo) {
        dispatch(addVideoFolder(path));
      } else {
        dispatch(addAudioFolder(path));
      }
    }
    setAddModalVisible(false);
    setAddInputValue('');
  }, [addInputValue, dispatch, isVideo]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Simulate refresh — add real data-fetching logic here later
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
    } catch {
      setError('Failed to load folders.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      <InternalHeader title={isVideo ? 'Video Folders' : 'Audio Folders'} />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityOrb size={48} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AppText
            variant="body1"
            color="error"
            style={{textAlign: 'center', marginBottom: spacing.sm}}>
            {error}
          </AppText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}>
            <AppText variant="button" color="accent">
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
            />
          }>
          {/* Scan Status Banner */}
          <ScanProgressBanner
            isScanning={isScanning}
            lastScanTimestamp={lastScanTimestamp}
          />

          {/* Scan Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.accent.gold,
                marginBottom: spacing.lg,
                paddingVertical: spacing.sm,
                borderTopWidth: 1,
                opacity: isScanning ? 0.5 : 1,
              },
            ]}
            activeOpacity={0.7}
            onPress={handleScan}
            disabled={isScanning}>
            {isScanning ? (
              <ActivityOrb size={20} color={colors.accent.gold} />
            ) : (
              <AppText variant="body1" color="accent" style={{fontWeight: '600'}}>
                Scan Folders
              </AppText>
            )}
          </TouchableOpacity>

          {/* Folder List */}
          <View style={styles.card}>
            {folders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <SvgIcon
                  name="folder"
                  size={40}
                  color={colors.text.tertiary}
                  style={styles.emptyIcon}
                />
                <AppText variant="body2" color="tertiary">
                  No {isVideo ? 'video' : 'audio'} folders linked yet.
                </AppText>
                <AppText variant="caption" color="tertiary">
                  Tap "Add Folder" below to get started.
                </AppText>
              </View>
            ) : (
              folders.map((folder, index) => (
                <View key={`${folder}-${index}`} style={styles.folderRow}>
                  <View style={styles.folderLeft}>
                    <View style={styles.folderIconWrap}>
                      <SvgIcon
                        name="folder"
                        size={16}
                        color={colors.accent.gold}
                      />
                    </View>
                    <AppText
                      variant="body2"
                      color="primary"
                      style={styles.folderPath}
                      numberOfLines={1}>
                      {folder}
                    </AppText>
                  </View>
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
      )}

      {/* ── Add Folder Modal (cross-platform) ── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <AppText
              variant="h3"
              color="primary"
              style={styles.modalTitle}>
              Add {isVideo ? 'Video' : 'Audio'} Folder
            </AppText>
            <AppText
              variant="caption"
              color="tertiary"
              style={styles.modalSubtitle}>
              Enter the full folder path
            </AppText>

            <TextInput
              style={styles.input}
              placeholder="/storage/emulated/0/Movies"
              placeholderTextColor={colors.text.tertiary}
              value={addInputValue}
              onChangeText={setAddInputValue}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setAddModalVisible(false)}>
                <AppText variant="body2" color="secondary">
                  Cancel
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmAddFolder}>
                <AppText
                  variant="body2"
                  style={styles.modalButtonConfirmText}>
                  Add
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};
