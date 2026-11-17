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
import {SimbaStatusBar} from '../../../../components/StatusBar';
import {AppText} from '../../../../components/core/AppText/AppText';
import {ScanProgressBanner} from '../../../../components/feedback/ScanProgressBanner/ScanProgressBanner';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {spacing, radius} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import {LibraryScreenProps} from '../../../../navigation/types';
import {LibraryFoldersSegment} from './LibraryFoldersSegment';
import {LibraryAudioSegment} from './LibraryAudioSegment';
import {LibraryArtistsSegment} from './LibraryArtistsSegment';
import {LibraryAlbumsSegment} from './LibraryAlbumsSegment';
import {ViewToggle} from './ViewToggle';
import {
  useLibraryScreen,
  SEGMENTS,
  FILTER_CHIPS,
  SORT_OPTIONS,
  LIBRARY_MENU_ENTRIES,
  GRID_GAP,
} from '../hooks/useLibraryScreen';

type Props = LibraryScreenProps;

export const LibraryScreen: React.FC<Props> = ({navigation}) => {
  const {
    colors, isDark, contentBottomInset,
    activeSegment, setActiveSegment,
    showDropdown, setShowDropdown,
    viewMode, setViewMode,
    sortBy, setSortBy,
    filterType, setFilterType,
    sortPickerVisible, setSortPickerVisible,
    videoFolders, audioFolders, lastScanTimestamp,
    scannedTrackCount, scannedTracks,
    selectedSortLabel,
    showSortControls, showFilterChips, showViewToggle,
    isScanning, scanProgress, scanHistory,
    cancelScan,
    isRefreshing, hasAnimated,
    isAudioPlaying, currentAudioUri,
    handleRefresh,
    navigateToLinkedFolders, navigateToFolderBrowser, handleLinkFolder,
    handleArtistPress, handleAlbumPress, handleScanAudioFolders, handleMediaPress,
    handleLibraryMenuSelect,
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
        segmentLabel: {fontFamily: FONT_FAMILY.inter.medium, fontSize: 13},
        segmentIcon: {width: 14, height: 14, marginRight: 8},
        segmentInner: {flexDirection: 'row', alignItems: 'center'},
        segmentRail: {flexDirection: 'row', paddingHorizontal: 20},
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
        sortBtnLabel: {fontFamily: FONT_FAMILY.inter.medium},
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
        filterChipLabel: {fontFamily: FONT_FAMILY.inter.medium},
        filterRail: {flexDirection: 'row', gap: spacing.xs},
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
        // 49.7: Downloads shortcut (Library entry point)
        downloadsBtn: {
          width: 40,
          height: 40,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        },
        scroll: {flex: 1},
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: contentBottomInset,
        },
        gridRow: {flexDirection: 'row', gap: GRID_GAP},
        gridCol: {flex: 1},

      }),
    [contentBottomInset, colors],
  );

  // ── Renders ──

  const renderLibraryContent = () => (
    <>
      <View style={styles.segmentedControl}>
        <FlatList
          horizontal
          data={SEGMENTS}
          keyExtractor={seg => seg.key}
          renderItem={({item: seg}) => {
            const isActive = activeSegment === seg.key;
            return (
              <TouchableOpacity style={[styles.segment, isActive && styles.segmentActive]} onPress={() => setActiveSegment(seg.key)} activeOpacity={0.7}>
                <View style={styles.segmentInner}>
                  <SvgIcon name={seg.icon} size={16} color={isActive ? colors.accent.gold : colors.text.secondary} style={styles.segmentIcon} />
                  <AppText variant="body2" color={isActive ? 'accent' : 'secondary'} style={styles.segmentLabel}>{seg.label}</AppText>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.segmentRail}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          initialNumToRender={SEGMENTS.length}
        />
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
            <FlatList
              horizontal
              data={FILTER_CHIPS}
              keyExtractor={chip => chip.key}
              renderItem={({item: chip}) => {
                const isActive = filterType === chip.key;
                return (
                  <TouchableOpacity style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setFilterType(chip.key)} activeOpacity={0.7}>
                    <AppText variant="caption" color={isActive ? 'accent' : 'secondary'} style={styles.filterChipLabel}>{chip.label}</AppText>
                  </TouchableOpacity>
                );
              }}
              style={styles.filterRow}
              contentContainerStyle={styles.filterRail}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              initialNumToRender={FILTER_CHIPS.length}
            />
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
              onLinkFolder={handleLinkFolder}
              onNavigateToFolderBrowser={navigateToFolderBrowser}
            />
          )}
          {activeSegment === 'audio' && (
            <LibraryAudioSegment
              audioFolders={audioFolders}
              scannedTracks={scannedTracks}
              filterType={filterType}
              sortBy={sortBy}
              colors={colors}
              viewMode={viewMode}
              isAudioPlaying={isAudioPlaying}
              currentAudioUri={currentAudioUri}
              onNavigateToFolderBrowser={navigateToFolderBrowser}
              onNavigateToLinkedFolders={navigateToLinkedFolders}
              onMediaPress={handleMediaPress}
            />
          )}
          {activeSegment === 'artists' && (
            <LibraryArtistsSegment audioFolders={audioFolders} isMediaScanning={isScanning} scannedTrackCount={scannedTrackCount} colors={colors} onLinkFolders={() => navigateToLinkedFolders('audio')} onScanAudioFolders={handleScanAudioFolders} onArtistPress={handleArtistPress} onViewAllArtists={() => navigation.navigate('AllAudioScreen', {sort: 'artist'})} />
          )}
          {activeSegment === 'albums' && (
            <LibraryAlbumsSegment audioFolders={audioFolders} isMediaScanning={isScanning} scannedTrackCount={scannedTrackCount} colors={colors} onLinkFolders={() => navigateToLinkedFolders('audio')} onScanAudioFolders={handleScanAudioFolders} onAlbumPress={handleAlbumPress} onViewAllAlbums={() => navigation.navigate('AllAudioScreen', {})} />
          )}
        </Animated.View>
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient colors={[colors.background.primary, colors.background.elevated]} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowWarm, {backgroundColor: colors.accent.gold, opacity: isDark ? 0.22 : 0.12}]} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.titleWrapper} activeOpacity={0.7} onPress={() => setShowDropdown(true)}>
          {/* The Library is the Library: the dropdown's "Playlists" entry
              navigates to All Playlists, which owns the playlist list
              (spec §6.4). There is no second content mode to title. */}
          <AppText variant="displaySans" color="primary">Library</AppText>
          <SvgIcon name="chevronDown" size={20} color={colors.text.primary} style={styles.titleChevron} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {showViewToggle && <ViewToggle value={viewMode} onChange={setViewMode} />}
          <TouchableOpacity
            style={styles.downloadsBtn}
            onPress={() => navigation.navigate('Downloads')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Downloads">
            <SvgIcon name="download" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {renderLibraryContent()}

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
              {/* The sheet no longer SWITCHES a view: "Playlists" leaves
                  the Library for All Playlists, which owns the playlist
                  list (spec §6.4). "Select View" promised a switch this
                  list cannot make. */}
              <AppText variant="body2" color="secondary">Go to</AppText>
              <TouchableOpacity onPress={() => setShowDropdown(false)}>
                <SvgIcon name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.dropdownDivider, {backgroundColor: colors.border.subtle}]} />
            <FlatList
              data={LIBRARY_MENU_ENTRIES}
              keyExtractor={option => option.key}
              renderItem={({item: option}) => {
                // The dot marks the page you are ON. The Library is
                // always the Library — the other entry navigates away,
                // so no entry can be "selected" in the old sense.
                const isCurrentPage = option.key === 'library';
                return (
                  <TouchableOpacity style={[styles.dropdownOption, {borderBottomColor: colors.border.subtle}]} onPress={() => handleLibraryMenuSelect(option.key)} activeOpacity={0.7}>
                    <AppText variant="body2" color={isCurrentPage ? 'accent' : 'primary'}>{option.label}</AppText>
                    <View style={[styles.sortRadio, {borderColor: isCurrentPage ? colors.accent.gold : colors.border.subtle}]}>
                      {isCurrentPage && <View style={[styles.sortRadioInner, {backgroundColor: colors.accent.gold}]} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              scrollEnabled={false}
              initialNumToRender={LIBRARY_MENU_ENTRIES.length}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
