// ────────────────────────────────────────────────────────
// Simba Player — useSongScreen Hook (Phase 18)
// ────────────────────────────────────────────────────────

import {useState, useEffect, useCallback, useMemo} from 'react';
import {Alert, Share} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppSelector, useAppDispatch} from '../../../store';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import {addToQueue} from '../../../store/slices/playerSlice';
import {useBookmarks} from '../../../features/bookmarks';
import {useToast} from '../../../components/feedback/Toast';
import {loadLrc} from '../../../services/lrcService';
import type {RootStackParamList} from '../../../navigation/types';
import type {LrcLine} from '../../../utils/lrcParser';
import {isRemoteUri} from '../../../utils/mediaUri';
import { resolveStreamType, usePlayerActivity } from '@simba-dev/react-native-media-player';

type SongRoute = RouteProp<RootStackParamList, 'SongScreen'>;
type SongNav = NativeStackNavigationProp<RootStackParamList, 'SongScreen'>;

/** Derive file format from URI extension. */
function getFormat(uri: string): string {
  const ext = uri.split('.').pop()?.toUpperCase() ?? '';
  return ext || '—';
}

/** Format seconds → HH:MM:SS */
function formatDuration(sec: number): string {
  if (sec <= 0) return '--:--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useSongScreen() {
  const route = useRoute<SongRoute>();
  const navigation = useNavigation<SongNav>();
  const dispatch = useAppDispatch();
  const {show: showToast} = useToast();
  const {openPlayer} = usePlayerActivity();

  const {fileUri, title: titleParam, artist: artistParam, album: albumParam} = route.params;

  // Find the full track from store
  const allTracks = useAppSelector(selectAllTracks);
  const track = useMemo(
    () => allTracks.find(t => t.uri === fileUri) ?? null,
    [allTracks, fileUri],
  );

  // Derived metadata
  const displayTitle = track?.title ?? titleParam ?? 'Unknown Track';
  const displayArtist = track?.artist ?? artistParam ?? 'Unknown Artist';
  const displayAlbum = track?.album ?? albumParam ?? null;
  const displayYear = track?.year ?? 0;
  const displayGenre = track?.genre ?? null;
  const displayDuration = track?.duration ?? 0;
  const displayFormat = getFormat(fileUri);
  const displayPath = fileUri.startsWith('file://') ? fileUri.replace('file://', '') : fileUri;
  const albumArtUri = track?.albumArtUri ?? '';

  // Bookmarks
  const {
    bookmarksForFile,
    bookmarkCountForFile,
    add: addBookmark,
    remove: removeBookmark,
  } = useBookmarks(fileUri);

  const [bookmarkSheetVisible, setBookmarkSheetVisible] = useState(false);

  const handleOpenBookmarkSheet = useCallback(() => setBookmarkSheetVisible(true), []);
  const handleCloseBookmarkSheet = useCallback(() => setBookmarkSheetVisible(false), []);

  const handleSaveBookmark = useCallback(
    (label: string) => {
      const source: 'api' | 'local' = isRemoteUri(fileUri) ? 'api' : 'local';
      const input = {
        fileUri,
        title: displayTitle,
        position: 0,
        duration: displayDuration,
        label,
        source,
        type: 'music' as const,
        mediaType: 'audio' as const,
      };
      const result = addBookmark(input);
      if (result.status === 'requires-confirmation') {
        Alert.alert(
          'Bookmark limit reached',
          `Adding “${displayTitle}” will remove the oldest bookmark “${result.candidate.title}”. Continue?`,
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Remove & Add',
              style: 'destructive',
              onPress: () => {
                addBookmark(result.requested, {evictId: result.candidate.id});
                showToast('Bookmark saved', 'success');
                setBookmarkSheetVisible(false);
              },
            },
          ],
        );
        return;
      }
      showToast('Bookmark saved', 'success');
      setBookmarkSheetVisible(false);
    },
    [addBookmark, fileUri, displayTitle, displayDuration, showToast],
  );

  const handleDeleteBookmark = useCallback(
    (id: string) => {
      removeBookmark(id);
      showToast('Bookmark removed', 'info');
    },
    [removeBookmark, showToast],
  );

  const handleJumpToBookmark = useCallback(
    (position: number) => {
      openPlayer({
        uri: fileUri,
        title: displayTitle,
        startPositionMs: position,
        type: resolveStreamType(resolveStreamType(resolveStreamType('music'))),
      });
    },
    [openPlayer, fileUri, displayTitle, displayDuration],
  );

  // Lyrics
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLyricsLoading(true);
    loadLrc(fileUri).then(result => {
      if (!mounted) return;
      setLyricsLoading(false);
      if (result && result.lines.length > 0) {
        setLyrics(result.lines);
      }
    });
    return () => { mounted = false; };
  }, [fileUri]);

  const lyricsPreview = useMemo(() => {
    if (lyrics.length === 0) return null;
    return lyrics.slice(0, 3).map(l => l.text).join('\n');
  }, [lyrics]);

  const hasLyrics = lyrics.length > 0;

  // PlaylistSheet
  const [playlistSheetVisible, setPlaylistSheetVisible] = useState(false);

  const playlistSheetItem = useMemo(
    () => ({
      fileUri,
      title: displayTitle,
      duration: displayDuration,
      artist: displayArtist,
      album: displayAlbum ?? undefined,
    }),
    [fileUri, displayTitle, displayDuration, displayArtist, displayAlbum],
  );

  // ── Actions ──

  const handlePlay = useCallback(() => {
    openPlayer({
      uri: fileUri,
      title: displayTitle,
      type: resolveStreamType(resolveStreamType(resolveStreamType('music'))),
    });
  }, [openPlayer, fileUri, displayTitle, displayDuration]);

  const handleAddToPlaylist = useCallback(() => {
    setPlaylistSheetVisible(true);
  }, []);

  const handleClosePlaylistSheet = useCallback(() => {
    setPlaylistSheetVisible(false);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: [
          `🎵 ${displayTitle}`,
          displayArtist ? `👤 ${displayArtist}` : '',
          displayAlbum ? `💿 ${displayAlbum}` : '',
          `⏱ ${formatDuration(displayDuration)}`,
          displayPath,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch {
      // user cancelled
    }
  }, [displayTitle, displayArtist, displayAlbum, displayDuration, displayPath]);

  const handleAddToQueue = useCallback(() => {
    dispatch(addToQueue({uri: fileUri, title: displayTitle, duration: displayDuration}));
    showToast('Added to queue', 'success');
  }, [dispatch, fileUri, displayTitle, displayDuration, showToast]);

  const handleCopyPath = useCallback(() => {
    Clipboard.setString(displayPath);
    showToast('Path copied to clipboard', 'success');
  }, [displayPath, showToast]);

  const handleViewFullLyrics = useCallback(() => {
    openPlayer({
      uri: fileUri,
      title: displayTitle,
      type: resolveStreamType(resolveStreamType(resolveStreamType('music'))),
    });
  }, [openPlayer, fileUri, displayTitle, displayDuration]);

  const goToArtist = useCallback(() => {
    navigation.navigate('ArtistScreen', {artistName: displayArtist});
  }, [navigation, displayArtist]);

  const goToAlbum = useCallback(() => {
    if (displayAlbum) {
      navigation.navigate('AlbumScreen', {albumName: displayAlbum, artistName: displayArtist});
    }
  }, [navigation, displayAlbum, displayArtist]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  return {
    fileUri,
    displayTitle,
    displayArtist,
    displayAlbum,
    displayYear,
    displayGenre,
    displayDuration,
    displayFormat,
    displayPath,
    albumArtUri,
    formatDuration,
    bookmarksForFile,
    bookmarkCountForFile,
    bookmarkSheetVisible,
    handleOpenBookmarkSheet,
    handleCloseBookmarkSheet,
    handleSaveBookmark,
    handleDeleteBookmark,
    handleJumpToBookmark,
    lyricsPreview,
    hasLyrics,
    lyricsLoading,
    playlistSheetVisible,
    handleClosePlaylistSheet,
    playlistSheetItem,
    handlePlay,
    handleAddToPlaylist,
    handleShare,
    handleAddToQueue,
    handleCopyPath,
    handleViewFullLyrics,
    goToArtist,
    goToAlbum,
    goBack,
  };
}
