import React from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {useAppSelector} from '../../store';
import {selectAllPlaylists} from '../../store/slices/playlistSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {SimbaStatusBar} from '../../components/StatusBar';
import {radius} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'AllPlaylistsScreen'>;

export const AllPlaylistsScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const allPlaylists = useAppSelector(selectAllPlaylists);

  const handlePlaylist = (playlistId: string, playlistName: string) => {
    navigation.navigate('PlaylistDetail', {playlistId, playlistName});
  };

  const renderItem = ({item}: {item: typeof allPlaylists[number]}) => (
    <TouchableOpacity
      style={[styles.item, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}
      activeOpacity={0.7}
      onPress={() => handlePlaylist(item.id, item.name)}>
      <View style={[styles.iconBox, {backgroundColor: colors.accent.goldDim}]}>
        <SvgIcon name="listMusic" size={22} color={colors.accent.gold} />
      </View>
      <View style={styles.info}>
        <AppText variant="body2" color="primary" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="caption" color="tertiary">
          {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
        </AppText>
      </View>
      <SvgIcon
        name="chevronUp"
        size={16}
        color={colors.text.tertiary}
        style={{transform: [{rotate: '90deg'}]}}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient colors={[colors.background.primary, colors.background.elevated]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, {backgroundColor: colors.background.elevated}]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <SvgIcon name="chevronDown" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="h2" color="primary" style={{flex: 1}}>All Playlists</AppText>
      </View>

      <FlatList
        data={allPlaylists}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <SvgIcon name="listMusic" size={48} color={colors.text.tertiary} />
            <AppText variant="body2" color="tertiary" style={{marginTop: 12}}>
              No playlists yet.
            </AppText>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  listContent: {paddingHorizontal: 16, paddingBottom: 40},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {flex: 1},
  empty: {alignItems: 'center', justifyContent: 'center', paddingTop: 80},
});
