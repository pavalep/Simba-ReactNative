import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {useAppDispatch} from '../../store';
import {
  addVideoFolder,
  addAudioFolder,
} from '../../store/slices/settingsSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import type {FolderLinkingWizardScreenProps} from '../../navigation/types';

type Props = FolderLinkingWizardScreenProps;
type FolderType = 'video' | 'audio' | 'mixed';

const ITEM_HEIGHT = 76;

const STEPS = ['Type', 'Folder', 'Scan', 'Done'];
const STEP_COUNT = 4;

const FOLDER_TYPE_OPTIONS: {type: FolderType; label: string; icon: 'music' | 'video' | 'folder'; desc: string}[] = [
  {type: 'video', label: 'Videos', icon: 'video', desc: 'Movies, shows, clips'},
  {type: 'audio', label: 'Music', icon: 'music', desc: 'Songs, albums, podcasts'},
  {type: 'mixed', label: 'Mixed', icon: 'folder', desc: 'Both video & audio files'},
];

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export const FolderLinkingWizard: React.FC<Props> = () => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const dispatch = useAppDispatch();

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState(0);
  const [folderType, setFolderType] = useState<FolderType | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [browsePath, setBrowsePath] = useState(RNFS.ExternalStorageDirectoryPath || RNFS.DocumentDirectoryPath);
  const [dirContents, setDirContents] = useState<DirEntry[]>([]);
  const [showBrowser, setShowBrowser] = useState(false);
  const [_isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ── Progress dots ──
  const renderProgressDots = () => (
    <View style={styles.progressRow}>
      {STEPS.map((label, i) => (
        <View key={label} style={styles.dotWrapper}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  i <= step ? colors.accent.gold : colors.border.subtle,
              },
            ]}
          />
          <AppText
            variant="caption"
            style={{
              color: i <= step ? colors.text.primary : colors.text.tertiary,
              marginTop: 4,
            }}>
            {label}
          </AppText>
        </View>
      ))}
    </View>
  );

  // ── Step fade transition ──
  const transitionStep = useCallback(
    (next: number) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setStep(next);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim],
  );

  // ── Step 0: Folder Type Selection ──
  const renderTypeSelection = () => (
    <View style={styles.stepContent}>
      <AppText variant="h2" color="primary" style={styles.stepTitle}>
        What kind of media?
      </AppText>
      <AppText variant="body2" color="tertiary" style={styles.stepSubtitle}>
        Select the type of files you want to link
      </AppText>
      {FOLDER_TYPE_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.type}
          style={[
            styles.typeCard,
            {
              backgroundColor: colors.background.elevated,
              borderColor:
                folderType === opt.type
                  ? colors.accent.gold
                  : colors.border.subtle,
            },
          ]}
          onPress={() => setFolderType(opt.type)}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{selected: folderType === opt.type}}>
          <SvgIcon
            name={opt.icon}
            size={28}
            color={
              folderType === opt.type
                ? colors.accent.gold
                : colors.text.secondary
            }
          />
          <View style={styles.typeTextCol}>
            <AppText variant="body2" color="primary">
              {opt.label}
            </AppText>
            <AppText variant="caption" color="tertiary">
              {opt.desc}
            </AppText>
          </View>
          <View
            style={[
              styles.radio,
              {
                borderColor:
                  folderType === opt.type
                    ? colors.accent.gold
                    : colors.border.subtle,
                backgroundColor:
                  folderType === opt.type ? colors.accent.gold : 'transparent',
              },
            ]}>
            {folderType === opt.type && (
              <View style={styles.radioInner} />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Step 1: Folder Picker ──
  const loadDirContents = useCallback(async (dirPath: string) => {
    setError(null);
    try {
      const items = await RNFS.readDir(dirPath);
      const dirs = items
        .filter(item => item.isDirectory())
        .map(item => ({
          name: item.name,
          path: item.path,
          isDirectory: true,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setDirContents(dirs);
      setBrowsePath(dirPath);
    } catch {
      setError('Unable to read directory. Check permissions.');
      setDirContents([]);
    }
  }, []);

  const handleBrowseDir = useCallback(
    (dirPath: string) => {
      loadDirContents(dirPath);
    },
    [loadDirContents],
  );

  const handleSelectDir = useCallback(
    (dirPath: string) => {
      setSelectedPath(dirPath);
      setShowBrowser(false);
    },
    [],
  );

  const renderFolderPicker = () => (
    <View style={styles.stepContent}>
      <AppText variant="h2" color="primary" style={styles.stepTitle}>
        Choose a folder
      </AppText>
      <AppText variant="body2" color="tertiary" style={styles.stepSubtitle}>
        Select the folder containing your media files
      </AppText>

      {/* Selected path display */}
      <TouchableOpacity
        style={[styles.pathCard, {backgroundColor: colors.background.elevated}]}
        onPress={() => {
          setShowBrowser(true);
          if (!browsePath) setBrowsePath(RNFS.ExternalStorageDirectoryPath || RNFS.DocumentDirectoryPath);
          loadDirContents(browsePath || RNFS.ExternalStorageDirectoryPath || RNFS.DocumentDirectoryPath);
        }}
        activeOpacity={0.7}>
        <SvgIcon name="folder" size={22} color={colors.accent.gold} />
        <View style={styles.pathTextCol}>
          <AppText variant="body2" color="primary" numberOfLines={1}>
            {selectedPath || 'Tap to browse'}
          </AppText>
          {!selectedPath && (
            <AppText variant="caption" color="tertiary">
              No folder selected
            </AppText>
          )}
        </View>
        <SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />
      </TouchableOpacity>

      {/* Browse modal */}
      {showBrowser && (
        <View
          style={[
            styles.browserContainer,
            {backgroundColor: colors.background.elevated},
          ]}>
          {/* Breadcrumb */}
          <View style={styles.breadcrumbRow}>
            <TouchableOpacity
              onPress={() =>
                handleBrowseDir(
                  RNFS.ExternalStorageDirectoryPath || RNFS.DocumentDirectoryPath,
                )
              }
              activeOpacity={0.7}>
              <AppText variant="caption" color="accent">
                Root
              </AppText>
            </TouchableOpacity>
            <AppText variant="caption" color="tertiary">
              {' '}/{' '}
            </AppText>
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {browsePath.split('/').pop() || browsePath}
            </AppText>
          </View>

          {/* Parent directory */}
          {browsePath !==
            (RNFS.ExternalStorageDirectoryPath || RNFS.DocumentDirectoryPath) && (
            <TouchableOpacity
              style={[styles.dirRow, {borderBottomColor: colors.border.subtle}]}
              onPress={() => {
                const parent = browsePath.split('/').slice(0, -1).join('/');
                if (parent) handleBrowseDir(parent);
              }}
              activeOpacity={0.6}>
              <SvgIcon name="folder" size={20} color={colors.text.tertiary} />
              <AppText
                variant="body2"
                color="tertiary"
                style={{marginLeft: spacing.sm}}>
                ..
              </AppText>
            </TouchableOpacity>
          )}

          {/* Error state */}
          {error && (
            <AppText
              variant="caption"
              color="error"
              style={{padding: spacing.sm, textAlign: 'center'}}>
              {error}
            </AppText>
          )}

          {/* Directory listing */}
          <FlatList
            data={dirContents}
            keyExtractor={item => item.path}
            style={styles.dirList}
            getItemLayout={(_, index) => ({length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index})}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[
                  styles.dirRow,
                  {borderBottomColor: colors.border.subtle},
                ]}
                onPress={() => handleBrowseDir(item.path)}
                activeOpacity={0.6}>
                <SvgIcon
                  name="folder"
                  size={20}
                  color={colors.text.secondary}
                />
                <AppText
                  variant="body2"
                  color="primary"
                  style={{marginLeft: spacing.sm}}
                  numberOfLines={1}>
                  {item.name}
                </AppText>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !error ? (
                <AppText
                  variant="caption"
                  color="tertiary"
                  style={{padding: spacing.lg, textAlign: 'center'}}>
                  No subdirectories found
                </AppText>
              ) : null
            }
          />

          {/* Select this folder */}
          <TouchableOpacity
            style={[
              styles.selectButton,
              {backgroundColor: colors.accent.gold},
            ]}
            onPress={() => handleSelectDir(browsePath)}
            activeOpacity={0.8}>
            <AppText variant="button" color="inverse">
              Select This Folder
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ── Step 2: Scanning ──
  useEffect(() => {
    if (step !== 2) return;

    setIsScanning(true);
    setScanProgress(0);
    setScanComplete(false);

    // Simulate progressive file discovery
    let cancelled = false;
    const totalFiles = Math.floor(Math.random() * 150) + 30;
    let found = 0;

    const interval = setInterval(() => {
      if (cancelled) return;
      found += Math.floor(Math.random() * 8) + 1;
      if (found >= totalFiles) {
        found = totalFiles;
        setFileCount(found);
        setScanProgress(100);
        setScanComplete(true);
        setIsScanning(false);
        clearInterval(interval);
      } else {
        setFileCount(found);
        setScanProgress(Math.round((found / totalFiles) * 100));
      }
    }, 300);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step]);

  const renderScanning = () => (
    <View style={[styles.stepContent, styles.centerStep]}>
      {scanComplete ? (
        <>
          <View
            style={[styles.checkCircle, {backgroundColor: colors.semantic.success}]}>
            <AppText variant="h2" style={{color: '#fff'}}>
              ✓
            </AppText>
          </View>
          <AppText
            variant="h2"
            color="primary"
            style={{marginTop: spacing.lg, textAlign: 'center'}}>
            Scan Complete
          </AppText>
        </>
      ) : (
        <>
          <ActivityOrb size={64} />
          <AppText
            variant="h2"
            color="primary"
            style={{marginTop: spacing.lg, textAlign: 'center'}}>
            Scanning...
          </AppText>
        </>
      )}

      <View style={styles.scanStats}>
        <View style={[styles.statCard, {backgroundColor: colors.background.elevated}]}>
          <AppText variant="h3" color="accent">
            {fileCount}
          </AppText>
          <AppText variant="caption" color="tertiary">
            Files found
          </AppText>
        </View>
        <View style={[styles.statCard, {backgroundColor: colors.background.elevated}]}>
          <AppText variant="h3" color="accent">
            {scanProgress}%
          </AppText>
          <AppText variant="caption" color="tertiary">
            Complete
          </AppText>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBarBg, {backgroundColor: colors.border.subtle}]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${scanProgress}%`,
              backgroundColor: colors.accent.gold,
            },
          ]}
        />
      </View>
    </View>
  );

  // ── Step 3: Success ──
  const handleGoToLibrary = useCallback(() => {
    if (!folderType || !selectedPath) return;
    if (folderType === 'video' || folderType === 'mixed') {
      dispatch(addVideoFolder(selectedPath));
    }
    if (folderType === 'audio' || folderType === 'mixed') {
      dispatch(addAudioFolder(selectedPath));
    }
    // Go back to LinkedFolders
    nav.navigate('LinkedFolders', {type: folderType === 'mixed' ? 'video' : folderType});
  }, [folderType, selectedPath, dispatch, nav]);

  const handleAddAnother = useCallback(() => {
    setSelectedPath('');
    setDirContents([]);
    setFileCount(0);
    setScanProgress(0);
    setScanComplete(false);
    transitionStep(1);
  }, [transitionStep]);

  const renderSuccess = () => (
    <View style={[styles.stepContent, styles.centerStep]}>
      <View
        style={[styles.checkCircleLarge, {backgroundColor: colors.semantic.success}]}>
        <AppText variant="display" style={{color: '#fff', fontSize: 48}}>
          ✓
        </AppText>
      </View>

      <AppText
        variant="h2"
        color="primary"
        style={{marginTop: spacing.xl, textAlign: 'center'}}>
        Folder Linked!
      </AppText>
      <AppText
        variant="body2"
        color="tertiary"
        style={{textAlign: 'center', marginTop: spacing.sm}}>
        {selectedPath}
      </AppText>

      <View style={styles.successStats}>
        <View style={[styles.statCard, {backgroundColor: colors.background.elevated}]}>
          <AppText variant="h3" color="accent">
            {fileCount}
          </AppText>
          <AppText variant="caption" color="tertiary">
            Media files
          </AppText>
        </View>
        <View style={[styles.statCard, {backgroundColor: colors.background.elevated}]}>
          <AppText variant="h3" color="accent">
            {folderType === 'video'
              ? 'Videos'
              : folderType === 'audio'
              ? 'Music'
              : 'Mixed'}
          </AppText>
          <AppText variant="caption" color="tertiary">
            Type
          </AppText>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, {backgroundColor: colors.accent.gold}]}
        onPress={handleGoToLibrary}
        activeOpacity={0.8}>
        <AppText variant="button" color="inverse">
          Go to Library
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, {borderColor: colors.border.subtle}]}
        onPress={handleAddAnother}
        activeOpacity={0.7}>
        <AppText variant="button" color="accent">
          Add Another Folder
        </AppText>
      </TouchableOpacity>
    </View>
  );

  // ── Navigation ──
  const handleBack = useCallback(() => {
    if (step === 0) {
      nav.goBack();
    } else if (step === 1 && showBrowser) {
      setShowBrowser(false);
    } else {
      transitionStep(step - 1);
    }
  }, [step, showBrowser, nav, transitionStep]);

  const handleNext = useCallback(() => {
    if (step === 0 && !folderType) return;
    if (step === 1 && !selectedPath) return;
    if (step === 2 && !scanComplete) return;
    if (step < STEP_COUNT - 1) {
      transitionStep(step + 1);
    }
  }, [step, folderType, selectedPath, scanComplete, transitionStep]);

  const canNext = useMemo(() => {
    if (step === 0) return folderType !== null;
    if (step === 1) return selectedPath !== '';
    if (step === 2) return scanComplete;
    return false;
  }, [step, folderType, selectedPath, scanComplete]);

  // ── Render ──
  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            borderBottomColor: colors.border.subtle,
          },
        ]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Go back">
          <AppText variant="body1" color="secondary" style={{fontSize: 22}}>
            ←
          </AppText>
        </TouchableOpacity>
        <AppText variant="h3" color="primary">
          Link Folder
        </AppText>
        <View style={styles.backBtn} />
      </View>

      {/* Progress dots */}
      <View style={styles.progressSection}>{renderProgressDots()}</View>

      {/* Step content */}
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{flexGrow: 1}}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={{flex: 1, opacity: fadeAnim}}>
          {step === 0 && renderTypeSelection()}
          {step === 1 && renderFolderPicker()}
          {step === 2 && renderScanning()}
          {step === 3 && renderSuccess()}
        </Animated.View>
      </ScrollView>

      {/* Bottom actions (steps 0-2) */}
      {step < 3 && (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + spacing.md,
              borderTopColor: colors.border.subtle,
            },
          ]}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                backgroundColor: canNext
                  ? colors.accent.gold
                  : colors.border.subtle,
              },
            ]}
            onPress={handleNext}
            disabled={!canNext}
            activeOpacity={0.8}>
            <AppText
              variant="button"
              style={{
                color: canNext
                  ? '#fff'
                  : colors.text.tertiary,
              }}>
              {step === 2 ? 'Continue' : 'Next'}
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dotWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    flex: 1,
  },
  centerStep: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    marginBottom: spacing.xl,
  },
  // Type selection
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  typeTextCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  // Folder picker
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  pathTextCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  browserContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 320,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  dirList: {
    maxHeight: 200,
  },
  dirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 0,
  },
  // Scanning
  scanStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 12,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Success
  successStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    width: '100%',
  },
  primaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  // Bottom bar
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  nextButton: {
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
});
