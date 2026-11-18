/**
 * An audiobook chapter is launched AS A CHAPTER, not as a music file.
 *
 * ## The defect
 *
 * The chapter was launched as `openPlayer({uri, title, type: 'audio'})` —
 * a generic audio file. The launch seam records the media KIND from
 * `mediaKind ?? bridgeOpts.type`
 * (`src/infrastructure/player/useResumeAwareLaunch.ts`), so the
 * playback-history row for a chapter was tagged `'audio'`.
 *
 * That was a real disagreement inside the app: the SAME file already
 * writes the chapter's BOOKMARK with `type: 'audiobook'` and its
 * PLAYLIST entry with `'audiobook'`, so the history row and the
 * bookmark row said different things about the same chapter — and
 * nothing in the app could tell an audiobook chapter from a music
 * track.
 *
 * ## What is asserted
 *
 *   1. the chapter launch carries the catalogue KIND (`'audiobook'`) —
 *      proven on the "now playing" session, which is the record the
 *      checkpoint writer reads
 *      (`src/infrastructure/player/usePlaybackCheckpointSync.ts`);
 *   2. the launch carries the BOOK's cover as the artwork — the chapter
 *      IS the book, so the history row has a picture instead of none;
 *   3. the stream type is still `'audio'` — the chapter plays on the
 *      audio lane, and the bridge needs its own `'video' | 'audio'`.
 */

import React from 'react';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {AudiobookDetailScreen} from '../../../src/screens/AudiobookDetailScreen/components/AudiobookDetailScreen';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import {usePlayerStore} from '../../../src/state/playerStore';
import {usePlayerQueueStore} from '@simba-dev/react-native-media-player/src/stores/playerQueueStore';

// The player bridge is native.
interface BridgeLaunchOptions {
  uri: string;
  title?: string;
  type: string;
  artworkPath?: string;
}

const mockOpenWithResume = jest.fn<
  Promise<boolean>,
  [BridgeLaunchOptions]
>(async () => true);

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    useOpenWithResume: () => mockOpenWithResume,
  };
});

// The book + its chapters come from the Internet Archive; the launch
// itself is what is under test, so the fetch is seeded here.
jest.mock(
  '../../../src/screens/AudiobookDetailScreen/hooks/useAudiobookDetailScreen',
  () => ({
    useAudiobookDetailScreen: () => ({
      book: {
        id: 42,
        title: 'The Book',
        author: 'An Author',
        description: '',
        urlZipFile: 'https://archive.org/download/the_book_001/the_book_001.zip',
        urlLibrivox: 'https://librivox.org/the-book',
        urlIArchive: 'https://archive.org/details/the_book_001',
        totalTime: 600,
        language: 'English',
      },
      chapters: [
        {
          name: 'chapter_01',
          title: 'Chapter One',
          url: 'https://archive.org/download/the_book_001/chapter_01.mp3',
          lengthSeconds: 600,
          format: 'VBR MP3',
          trackNumber: 1,
        },
        {
          name: 'chapter_02',
          title: 'Chapter Two',
          url: 'https://archive.org/download/the_book_001/chapter_02.mp3',
          lengthSeconds: 420,
          format: 'VBR MP3',
          trackNumber: 2,
        },
      ],
      isLoading: false,
      error: null,
      retry: jest.fn(),
    }),
  }),
);

const COVER_URL = 'https://archive.org/services/img/the_book_001';
const CHAPTER_URL =
  'https://archive.org/download/the_book_001/chapter_01.mp3';
const CHAPTER_TWO_URL =
  'https://archive.org/download/the_book_001/chapter_02.mp3';

async function renderScreen() {
  return renderWithProviders(AudiobookDetailScreen, {
    routeName: 'AudiobookDetail',
    initialParams: {bookId: 42},
  });
}

describe('AudiobookDetailScreen — the chapter launch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNowPlayingStore.getState().reset();
    usePlayerStore.getState().reset();
    usePlayerQueueStore.getState().clearQueue();
  });

  it('launches the chapter as an AUDIOBOOK, not as a generic audio file', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByText('1. Chapter One'));

    await waitFor(() => {
      expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    });

    // The session is what the checkpoint writer copies the kind from
    // (`writeCheckpoint` → `addRecent({type: session.type})`).
    const session = useNowPlayingStore.getState().current;
    expect(session?.type).toBe('audiobook');
    expect(session?.mediaLane).toBe('audio');

    // The stream type the bridge is asked for is unchanged.
    const opts = mockOpenWithResume.mock.calls[0][0] as {
      uri: string;
      type: string;
      artworkPath?: string;
    };
    expect(opts.uri).toBe(CHAPTER_URL);
    expect(opts.type).toBe('audio');
  });

  it('carries the BOOK cover as the launch artwork', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByText('1. Chapter One'));

    await waitFor(() => {
      expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    });

    // The chapter IS the book: the history row gets the book's cover.
    const session = useNowPlayingStore.getState().current;
    expect(session?.thumbnailPath).toBe(COVER_URL);

    const opts = mockOpenWithResume.mock.calls[0][0] as {
      artworkPath?: string;
    };
    expect(opts.artworkPath).toBe(COVER_URL);
  });

  /**
   * WAVE B16 — the chapter list is the RUN.
   *
   * The screen used to BUILD the chapter list and then never pass it
   * anywhere, while this file's header promised "EOF auto-advances to
   * the next chapter". The chapter played alone and the player stopped
   * at its end.
   *
   * The chapter list is now the run — the same list the engine advances
   * through — so EOF opens the next chapter, the next control points at
   * it, and the Queue screen's "Up Next" lists the rest of the book.
   */
  it('loads the whole chapter list as the run, so EOF advances', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByText('2. Chapter Two'));

    await waitFor(() => {
      expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    });

    const run = usePlayerStore.getState();
    expect(run.playlist.map(e => e.title)).toEqual([
      'Chapter One',
      'Chapter Two',
    ]);
    // The tapped chapter is where the run stands.
    expect(run.currentIndex).toBe(1);
    expect(run.currentFile?.uri).toBe(CHAPTER_TWO_URL);
    // And the chapter carries the book's KIND in the run too, so the
    // Queue screen's "Up Next" badges it as an audiobook chapter.
    expect(run.playlist[0]?.type).toBe('audiobook');
    expect(run.playlist[0]?.mediaType).toBe('audio');
  });

  it('the queue writes the chapter as an AUDIOBOOK, like the bookmark does', async () => {
    await renderScreen();

    // Long-press opens the app's one menu; "Add to Queue" is the row.
    await fireEvent(screen.getByText('1. Chapter One'), 'longPress');
    await waitFor(() => {
      expect(screen.getByText('Add to Queue')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Add to Queue'));

    const queue = usePlayerQueueStore.getState().queue;
    expect(queue).toHaveLength(1);
    // The same answer the bookmark gives for the same chapter.
    expect(queue[0]?.type).toBe('audiobook');
    expect(queue[0]?.mediaType).toBe('audio');
  });
});
