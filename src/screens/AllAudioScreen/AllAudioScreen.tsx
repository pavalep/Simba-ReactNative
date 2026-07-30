import React, {useMemo, useState} from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {useAppSelector} from '../../store';
import {selectAllTracks} from '../../store/slices/mediaSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {SimbaStatusBar} from '../../components/StatusBar';
import {radius} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'AllAudioScreen'>;

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - GAP) / COLUMN_COUNT;

export const AllAudioScreen: React.FC<Props> = ({navigation}) => {
  const {colors, isDark} = useTheme();
  const [sort, setSort] = useState<'title' | 'artist'>('title');

  const allAudio = useAppSelector(state =>
    selectAllTracks(state).filter(t => t.mediaType === 'audio'),
  );

  const sortedAudio = useMemo(() => {
    const sorted = [...allAudio];
    if (sort === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => a.artist.localeCompare(b.artist));
    }
    return sorted;
  }, [allAudio, sort]);

  const handlePlay = (uri: string, title: string) => {
    navigation.navigate('AudioPlayer', {fileUri: uri, fileTitle: title});
  };

  const renderItem = ({item}: {item: typeof allAudio[number]}) => (
    <TouchableOpacity
      style={[styles.card, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}
      activeOpacity={0.7}
      onPress={() => handlePlay(item.uri, item.title)}>
      <View style={[styles.thumb, {backgroundColor: colors.accent.goldDim}]}>
        <SvgIcon name="music" size={28} color={colors.accent.gold} />
      </View>
      <AppText variant="caption" color="primary" numberOfLines={2} style={styles.cardTitle}>
        {item.title}
      </AppText>
      <AppText variant="caption" color="tertiary" numberOfLines={1}>
        {item.artist}
      </AppText>
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
        <AppText variant="h2" color="primary" style={{flex: 1}}>All Audio</AppText>
        <TouchableOpacity
          style={[styles.sortBtn, {backgroundColor: colors.background.elevated}]}
          onPress={() => setSort(s => s === 'title' ? 'artist' : 'title')}
          activeOpacity={0.7}>
          <SvgIcon name="list" size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedAudio}
        renderItem={renderItem}
        keyExtractor={item => item.uri}
        numColumns={COLUMN_COUNT}
        columnWrapperStyle={{gap: GAP}}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <SvgIcon name="music" size={48} color={colors.text.tertiary} />
            <AppText variant="body2" color="tertiary" style={{marginTop: 12}}>
              No audio files found.
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
  sortBtn: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  listContent: {paddingHorizontal: 16, paddingBottom: 40, gap: GAP},
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.md,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: GAP,
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    paddingHorizontal: 10,
    paddingTop: 8,
    fontWeight: '600',
  },
  empty: {alignItems: 'center', justifyContent: 'center', paddingTop: 80},
});
