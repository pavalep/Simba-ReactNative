import React, {useState, useMemo, useCallback} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {SimbaStatusBar} from '../../components/StatusBar';
import {AppText} from '../../components/core/AppText/AppText';
import {FolderBrowserScreenProps} from '../../navigation/types';

// ── Mock Data ──────────────────────────────────────────

interface MockItem {
  name: string;
  type: 'folder' | 'file';
  children?: MockItem[];
}

const MOCK_ROOT: MockItem[] = [
  {
    name: 'Movies',
    type: 'folder',
    children: [
      {name: 'Inception (2010).mp4', type: 'file'},
      {name: 'Interstellar (2014).mp4', type: 'file'},
      {name: 'The Matrix (1999).mp4', type: 'file'},
      {name: 'Blade Runner 2049.mp4', type: 'file'},
    ],
  },
  {
    name: 'TV Shows',
    type: 'folder',
    children: [
      {
        name: 'Breaking Bad',
        type: 'folder',
        children: [
          {name: 'S01E01 - Pilot.mp4', type: 'file'},
          {name: 'S01E02 - Cats in the Bag.mp4', type: 'file'},
          {name: 'S01E03 - And the Bag in the River.mp4', type: 'file'},
        ],
      },
      {
        name: 'Stranger Things',
        type: 'folder',
        children: [
          {name: 'S01E01 - The Vanishing of Will Byers.mp4', type: 'file'},
          {name: 'S01E02 - The Weirdo on Maple Street.mp4', type: 'file'},
        ],
      },
    ],
  },
  {
    name: 'Music',
    type: 'folder',
    children: [
      {name: 'Live at the Hollywood Bowl.mp4', type: 'file'},
      {name: 'Acoustic Sessions.mp4', type: 'file'},
    ],
  },
  {
    name: 'Documents',
    type: 'folder',
    children: [], // empty folder
  },
  {name: 'readme.txt', type: 'file'},
];

// ── Helpers ─────────────────────────────────────────────

function getItemsAtPath(path: string[]): MockItem[] {
  let current = MOCK_ROOT;
  for (const segment of path) {
    const found = current.find(
      item => item.name === segment && item.type === 'folder',
    );
    if (found?.children) {
      current = found.children;
    } else {
      return [];
    }
  }
  return current;
}

// ── Screen ──────────────────────────────────────────────

type Props = FolderBrowserScreenProps;

export const FolderBrowserScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const items = useMemo(() => getItemsAtPath(breadcrumbs), [breadcrumbs]);

  const handleEnterFolder = useCallback((folderName: string) => {
    setBreadcrumbs(prev => [...prev, folderName]);
  }, []);

  const handleBreadcrumbPress = useCallback((index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index));
  }, []);

  const handleFilePress = useCallback(
    (fileName: string) => {
      const fullPath = [...breadcrumbs, fileName].join('/');
      navigation.navigate('Player', {
        fileUri: fullPath,
        fileTitle: fileName,
      });
    },
    [breadcrumbs, navigation],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate network refresh
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // ── Styles ────────────────────────────────────────────

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {flex: 1},
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
        },
        backButton: {
          paddingRight: 16,
          paddingVertical: 4,
        },
        title: {
          fontSize: 28,
          fontWeight: '700',
        },
        breadcrumbRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
          flexWrap: 'wrap',
        },
        breadcrumbItem: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        separator: {
          marginHorizontal: 6,
          color: colors.text.tertiary,
        },
        listContent: {
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
          flexGrow: 1,
        },
        listEmptyContent: {
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        iconContainer: {
          width: 32,
          alignItems: 'center',
          marginRight: 12,
        },
        emptyContainer: {
          alignItems: 'center',
        },
        emptyText: {
          marginTop: 12,
          textAlign: 'center',
        },
      }),
    [colors, insets],
  );

  const renderItem = useCallback(
    ({item}: {item: MockItem}) => {
      const isFolder = item.type === 'folder';
      return (
        <TouchableOpacity
          style={styles.itemRow}
          activeOpacity={0.6}
          onPress={() => {
            if (isFolder) {
              handleEnterFolder(item.name);
            } else {
              handleFilePress(item.name);
            }
          }}>
          <View style={styles.iconContainer}>
            <AppText
              variant="body2"
              color={isFolder ? 'accent' : 'secondary'}>
              {isFolder ? '\u25B6' : '\u25C9'}
            </AppText>
          </View>
          <AppText
            variant="body2"
            color={isFolder ? 'primary' : 'secondary'}
            style={{flex: 1}}
            numberOfLines={1}>
            {item.name}
          </AppText>
          {isFolder && (
            <AppText
              variant="caption"
              color="tertiary"
              style={{marginLeft: 8}}>
              {item.children?.length ?? 0} items
            </AppText>
          )}
        </TouchableOpacity>
      );
    },
    [styles, handleEnterFolder, handleFilePress],
  );

  const renderBreadcrumbs = () => {
    const segments = ['Home', ...breadcrumbs];
    return (
      <View style={styles.breadcrumbRow}>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <View key={`${segment}-${index}`} style={styles.breadcrumbItem}>
              {index > 0 && (
                <AppText variant="caption" style={styles.separator}>
                  /
                </AppText>
              )}
              <TouchableOpacity
                onPress={() => handleBreadcrumbPress(index - 1)}
                disabled={isLast}
                activeOpacity={0.6}>
                <AppText
                  variant="caption"
                  color={isLast ? 'accent' : 'secondary'}>
                  {segment}
                </AppText>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <AppText variant="h3" color="tertiary">
        This folder is empty
      </AppText>
      <AppText variant="body2" color="tertiary" style={styles.emptyText}>
        No files or folders to show.
      </AppText>
    </View>
  );

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.primary]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <AppText variant="body1" color="accent">
            {'\u2190'} Back
          </AppText>
        </TouchableOpacity>
        <AppText variant="h2" color="primary" style={styles.title}>
          Folder Browser
        </AppText>
      </View>
      {renderBreadcrumbs()}
      <FlatList
        style={{flex: 1}}
        data={items}
        keyExtractor={item => item.name}
        renderItem={renderItem}
        contentContainerStyle={
          items.length === 0 ? styles.listEmptyContent : styles.listContent
        }
        ListEmptyComponent={renderEmptyState}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        getItemLayout={(_data, index) => ({
          length: 50,
          offset: 50 * index,
          index,
        })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
            progressBackgroundColor={colors.background.primary}
          />
        }
      />
    </View>
  );
};
