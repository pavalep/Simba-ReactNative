import React, {useMemo, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  FlatList,
  Animated,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SimbaStatusBar} from '../../components/StatusBar';
import {AppText} from '../../components/core/AppText/AppText';
import {ScanProgressBanner} from '../../components/feedback/ScanProgressBanner/ScanProgressBanner';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {spacing, radius} from '../../theme/tokens';
import {LibraryScreenProps} from '../../navigation/types';
import {LibraryFoldersSegment} from './components/LibraryFoldersSegment';
import {LibraryAudioSegment} from './components/LibraryAudioSegment';
import {LibraryArtistsSegment} from './components/LibraryArtistsSegment';
import {LibraryAlbumsSegment} from './components/LibraryAlbumsSegment';
import {LibraryPlaylistsSegment} from './components/LibraryPlaylistsSegment';
import {ViewToggle} from './components/ViewToggle';
import {PlaylistCreateModal} from '../../components/playlist/PlaylistCreateModal';
import {
  useLibraryScreen,
  SEGMENTS,
  FILTER_CHIPS,
  SORT_OPTIONS,
  CONTENT_MODE_OPTIONS,
  PLAYLIST_FILTER_TYPES,
  GRID_GAP,
} from './hooks/useLibraryScreen';

type Props = LibraryScreenProps;

export const LibraryScreen: React.FC<Props> = ({navigation}) => {
  const {
    colors, isDark, bottomChromeInset,
    activeSegment, setActiveSegment,
    contentMode, setContentMode, showDropdown, setShowDropdown,
    viewMode, setViewMode,
    sortBy, setSortBy,
    filterType, setFilterType,
    sortPickerVisible, setSortPickerVisible,
    playlistFilterType, setPlaylistFilterType,
    createModalVisible, setCreateModalVisible,
    videoFolders, audioFolders, lastScanTimestamp,
    scannedTrackCount, scannedTracks,
    filteredPlaylists,
    selectedSortLabel, currentTitle,
    showSortControls, showFilterChips, showViewToggle,
    isScanning, scanProgress, scanHistory,
    cancelScan,
    isRefreshing, hasAnimated,
    isAudioPlaying, currentAudioUri,
    handleRefresh,
    navigateToSettings, navigateToLinkedFolders, navigateToFolderBrowser, handleLinkFolder,
    handleArtistPress, handleAlbumPress, handleScanAudioFolders,
    handleCreatePlaylist, handlePlayAllPlaylist, handleShufflePlaylist,
    handlePlaylistCardPress,
  } = useLibraryScreen(navigation);

  // ── Stagger entrance animation ──
  const entranceAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (hasAnimated) {
      entranceAnim.setValue(0);
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [hasAnimated, entranceAnim, activeSegment]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {flex: 1},
        glowWarm: {
          position: 'absolute',
          top: -120,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'android' ? 16 : 4,
          paddingBottom: 12,
        },
        titleWrapper: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        titleChevron: {marginTop: 6},
        segmentedControl: {marginBottom: 12},
        segment: {
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 2,
          borderBottomColor: 'transparent',
        },
        segmentActive: {borderBottomColor: colors.accent.gold},
        segmentLabel: {fontWeight: '500', fontSize: 13},
        segmentIcon: {width: 14, height: 14, marginRight: 8},
        segmentInner: {flexDirection: 'row', alignItems: 'center'},
        controlBar: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          marginBottom: 12,
          gap: spacing.sm,
        },
        sortBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 6,
          paddingHorizontal: spacing.sm + 2,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
          gap: 6,
        },
        sortBtnLabel: {fontWeight: '500'},
        filterRow: {flex: 1, flexDirection: 'row', gap: spacing.xs},
        filterChip: {
          paddingVertical: 6,
          paddingHorizontal: spacing.sm + 2,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
        },
        filterChipActive: {
          backgroundColor: colors.accent.goldDim,
          borderColor: colors.accent.gold,
        },
        filterChipLabel: {fontWeight: '500'},
        sortPickerScrim: {flex: 1, justifyContent: 'flex-end'},
        sortPickerPanel: {
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: 34,
        },
        sortPickerHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
        },
        sortPickerOption: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        sortPickerDivider: {height: StyleSheet.hairlineWidth, marginHorizontal: spacing.lg},
        sortRadio: {
          width: 20, height: 20, borderRadius: 10, borderWidth: 2,
          alignItems: 'center', justifyContent: 'center',
        },
        sortRadioInner: {width: 10, height: 10, borderRadius: 5},
        dropdownScrim: {flex: 1, justifyContent: 'flex-end'},
        dropdownPanel: {
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: 34,
        },
        dropdownHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
        },
        dropdownDivider: {height: StyleSheet.hairlineWidth, marginHorizontal: spacing.lg},
        dropdownOption: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        scroll: {flex: 1},
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: bottomChromeInset,
        },
        playlistFilterRow: {
          flexDirection: 'row',
          paddingHorizontal: 20,
          marginBottom: 16,
          gap: spacing.sm,
        },
        playlistFilterChip: {
          paddingVertical: 6,
          paddingHorizontal: 16,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
        },
        playlistFilterChipActive: {
          backgroundColor: colors.accent.goldDim,
          borderColor: colors.accent.gold,
        },
        gridRow: {flexDirection: 'row', gap: GRID_GAP},
        gridCol: {flex: 1},
        fabOverlay: {
          position: 'absolute',
          bottom: bottomChromeInset,
          right: 20,
          zIndex: 10,
        },
        fab: {
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.accent.gold,
          alignItems: 'center', justifyContent: 'center',
          elevation: 8,
          shadowColor: colors.accent.gold,
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.35, shadowRadius: 8,
        },
        fabText: {
          fontSize: 28, lineHeight: 30,
          color: colors.text.inverse, fontWeight: '400',
        },
      }),
    [bottomChromeInset, colors],
  );

  // ── Renders ──

  const renderLibraryContent = () => (
    <>
      <View style={styles.segmentedControl}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row', paddingHorizontal: 20}}>
          {SEGMENTS.map(seg => {
            const isActive = activeSegment === seg.key;
            return (
              <TouchableOpacity key={seg.key} style={[styles.segment, isActive && styles.segmentActive]} onPress={() => setActiveSegment(seg.key)} activeOpacity={0.7}>
                <View style={styles.segmentInner}>
                  <SvgIcon name={seg.icon} size={16} color={isActive ? colors.accent.gold : colors.text.secondary} style={styles.segmentIcon} />
                  <AppText variant="body2" color={isActive ? 'accent' : 'secondary'} style={styles.segmentLabel}>{seg.label}</AppText>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {(showSortControls || showFilterChips) && (
        <View style={styles.controlBar}>
          {showSortControls && (
            <TouchableOpacity style={styles.sortBtn} onPress={() => setSortPickerVisible(true)} activeOpacity={0.7}>
              <SvgIcon name="sliders" size={14} color={colors.text.secondary} />
              <AppText variant="caption" color="secondary" style={styles.sortBtnLabel}>{selectedSortLabel}</AppText>
            </TouchableOpacity>
          )}
          {showFilterChips && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {FILTER_CHIPS.map(chip => {
                const isActive = filterType === chip.key;
                return (
                  <TouchableOpacity key={chip.key} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setFilterType(chip.key)} activeOpacity={0.7}>
                    <AppText variant="caption" color={isActive ? 'accent' : 'secondary'} style={styles.filterChipLabel}>{chip.label}</AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }>
        <ScanProgressBanner isScanning={isScanning} lastScanTimestamp={lastScanTimestamp} scanProgress={scanProgress} scanHistory={scanHistory} onCancel={cancelScan} trackCount={scannedTrackCount} />

        <Animated.View style={{opacity: entranceAnim}}>
          {activeSegment === 'folders' && (
            <LibraryFoldersSegment
              videoFolders={videoFolders}
              audioFolders={audioFolders}
              scannedTracks={scannedTracks}
              lastScanTimestamp={lastScanTimestamp}
              colors={colors}
              isDark={isDark}
              onLinkFolder={handleLinkFolder}
              onNavigateToFolderBrowser={navigateToFolderBrowser}
            />
          )}
          {activeSegment === 'audio' && (
            <LibraryAudioSegment
              audioFolders={audioFolders}
              colors={colors}
              isDark={isDark}
              viewMode={viewMode}
              isAudioPlaying={isAudioPlaying}
              currentAudioUri={currentAudioUri}
              onNavigateToSettings={navigateToSettings}
              onNavigateToFolderBrowser={navigateToFolderBrowser}
              onNavigateToLinkedFolders={navigateToLinkedFolders}
            />
          )}
          {activeSegment === 'artists' && (
            <LibraryArtistsSegment audioFolders={audioFolders} isMediaScanning={isScanning} scannedTrackCount={scannedTrackCount} colors={colors} onNavigateToSettings={navigateToSettings} onScanAudioFolders={handleScanAudioFolders} onArtistPress={handleArtistPress} onViewAllArtists={() => navigation.navigate('AllAudioScreen', {sort: 'artist'})} />
          )}
          {activeSegment === 'albums' && (
            <LibraryAlbumsSegment audioFolders={audioFolders} isMediaScanning={isScanning} scannedTrackCount={scannedTrackCount} colors={colors} onNavigateToSettings={navigateToSettings} onScanAudioFolders={handleScanAudioFolders} onAlbumPress={handleAlbumPress} onViewAllAlbums={() => navigation.navigate('AllAudioScreen', {})} />
          )}
        </Animated.View>
      </ScrollView>
    </>
  );

  const renderPlaylistContent = () => (
    <>
      <View style={styles.playlistFilterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row', gap: spacing.sm}}>
          {PLAYLIST_FILTER_TYPES.map(item => {
            const isActive = playlistFilterType === item.key;
            return (
              <TouchableOpacity key={item.key} style={[styles.playlistFilterChip, isActive && styles.playlistFilterChipActive]} onPress={() => setPlaylistFilterType(item.key)} activeOpacity={0.7}>
                <AppText variant="caption" color={isActive ? 'accent' : 'secondary'} style={{fontWeight: '600'}}>{item.label}</AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LibraryPlaylistsSegment playlists={filteredPlaylists} colors={colors} onPlaylistCardPress={handlePlaylistCardPress} onPlayAllPlaylist={handlePlayAllPlaylist} onShufflePlaylist={handleShufflePlaylist} />
      </ScrollView>

      <View style={styles.fabOverlay} pointerEvents="box-none">
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setCreateModalVisible(true)}>
          <AppText style={styles.fabText}>+</AppText>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient colors={[colors.background.primary, colors.background.elevated]} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowWarm, {backgroundColor: colors.accent.gold, opacity: isDark ? 0.22 : 0.12}]} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.titleWrapper} activeOpacity={0.7} onPress={() => setShowDropdown(true)}>
          <AppText variant="h1" color="primary">{currentTitle}</AppText>
          <SvgIcon name="chevronDown" size={20} color={colors.text.primary} style={styles.titleChevron} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {contentMode === 'library' && showViewToggle && <ViewToggle value={viewMode} onChange={setViewMode} />}
        </View>
      </View>

      {contentMode === 'library' ? renderLibraryContent() : renderPlaylistContent()}

      <Modal transparent visible={sortPickerVisible} onRequestClose={() => setSortPickerVisible(false)} animationType="fade">
        <TouchableOpacity style={styles.sortPickerScrim} activeOpacity={1} onPress={() => setSortPickerVisible(false)}>
          <View style={[styles.sortPickerPanel, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
            <View style={styles.sortPickerHeader}>
              <AppText variant="body2" color="primary">Sort by</AppText>
              <TouchableOpacity onPress={() => setSortPickerVisible(false)}>
                <SvgIcon name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.sortPickerDivider, {backgroundColor: colors.border.subtle}]} />
            <FlatList
              data={SORT_OPTIONS}
              keyExtractor={item => item.key}
              renderItem={({item}) => {
                const isSelected = sortBy === item.key;
                return (
                  <TouchableOpacity style={[styles.sortPickerOption, {borderBottomColor: colors.border.subtle}]} onPress={() => { setSortBy(item.key); setSortPickerVisible(false); }} activeOpacity={0.7}>
                    <AppText variant="body2" color={isSelected ? 'accent' : 'primary'}>{item.label}</AppText>
                    <View style={[styles.sortRadio, {borderColor: isSelected ? colors.accent.gold : colors.border.subtle}]}>
                      {isSelected && <View style={[styles.sortRadioInner, {backgroundColor: colors.accent.gold}]} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              getItemLayout={(_, index) => ({length: 76, offset: 76 * index, index})}
              windowSize={5}
              maxToRenderPerBatch={10}
              removeClippedSubviews={true}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal transparent visible={showDropdown} onRequestClose={() => setShowDropdown(false)} animationType="fade">
        <TouchableOpacity style={styles.dropdownScrim} activeOpacity={1} onPress={() => setShowDropdown(false)}>
          <View style={[styles.dropdownPanel, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
            <View style={styles.dropdownHeader}>
              <AppText variant="body2" color="secondary">Select View</AppText>
              <TouchableOpacity onPress={() => setShowDropdown(false)}>
                <SvgIcon name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.dropdownDivider, {backgroundColor: colors.border.subtle}]} />
            {CONTENT_MODE_OPTIONS.map(option => {
              const isSelected = contentMode === option.key;
              return (
                <TouchableOpacity key={option.key} style={[styles.dropdownOption, {borderBottomColor: colors.border.subtle}]} onPress={() => { setContentMode(option.key); setShowDropdown(false); }} activeOpacity={0.7}>
                  <AppText variant="body2" color={isSelected ? 'accent' : 'primary'}>{option.label}</AppText>
                  <View style={[styles.sortRadio, {borderColor: isSelected ? colors.accent.gold : colors.border.subtle}]}>
                    {isSelected && <View style={[styles.sortRadioInner, {backgroundColor: colors.accent.gold}]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <PlaylistCreateModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} onCreate={handleCreatePlaylist} />
    </SafeAreaView>
  );
};
