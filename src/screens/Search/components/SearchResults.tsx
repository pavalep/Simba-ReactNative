import React from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {useTheme} from '../../../theme';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {ResultTile} from './ResultTile';
import {ResultListRow} from './ResultListRow';

const GRID_GAP = 12;

interface SearchResultGroup {
  key: string;
  label: string;
  items: any[];
}

interface SearchResultsProps {
  groups: SearchResultGroup[];
  debouncedQuery: string;
  tileWidth: number;
  onPlayFile: (fileUri: string, title: string) => void;
  onNavigate: (route: string, params?: Record<string, any>) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  groups,
  debouncedQuery,
  tileWidth,
  onPlayFile,
  onNavigate,
}) => {
  const {spacing: s} = useTheme();

  return (
    /* 59.1: virtualized result groups */
    <FlatList
      data={groups}
      keyExtractor={group => group.key}
      renderItem={({item: group}) => {
        const isListGroup =
          group.key === 'artists' ||
          group.key === 'albums' ||
          group.key === 'playlists' ||
          group.key === 'folders';
        return (
          <View style={{marginTop: s.md}}>
            <SectionHeader label={group.label} />
            {isListGroup ? (
              /* 59.1: virtualized list rows */
              <FlatList
                data={group.items}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <ResultListRow
                    item={item}
                    query={debouncedQuery}
                    onPress={() => {
                      const nt = item.navigateTo;
                      if (nt?.route) {
                        onNavigate(nt.route, nt.params);
                      } else if (nt?.screen) {
                        onNavigate(nt.screen, nt.params);
                      } else if (item.fileUri) {
                        onPlayFile(item.fileUri, item.title);
                      }
                    }}
                  />
                )}
                scrollEnabled={false}
                initialNumToRender={group.items.length}
              />
            ) : (
              /* 59.1: flexWrap grid — .map kept (FlatList can't wrap) */
              <View style={styles.resultsGrid}>
                {group.items.map((item: any) => (
                  <ResultTile
                    key={item.id}
                    item={item}
                    tileWidth={tileWidth}
                    query={debouncedQuery}
                    onPress={() => onPlayFile(item.fileUri!, item.title)}
                  />
                ))}
              </View>
            )}
          </View>
        );
      }}
      scrollEnabled={false}
      initialNumToRender={groups.length}
    />
  );
};

const styles = StyleSheet.create({
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
});
