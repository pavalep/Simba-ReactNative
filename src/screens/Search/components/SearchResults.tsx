import React from 'react';
import {View, StyleSheet} from 'react-native';
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
    <>
      {groups.map(group => {
        const isListGroup =
          group.key === 'artists' ||
          group.key === 'albums' ||
          group.key === 'playlists' ||
          group.key === 'folders';
        return (
          <View key={group.key} style={{marginTop: s.md}}>
            <SectionHeader label={group.label} />
            {isListGroup
              ? group.items.map((item: any) => (
                  <ResultListRow
                    key={item.id}
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
                ))
              : (
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
      })}
    </>
  );
};

const styles = StyleSheet.create({
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
});
