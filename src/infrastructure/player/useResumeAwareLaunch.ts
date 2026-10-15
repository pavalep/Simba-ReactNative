/**
 * V19 W9.3 — resume-aware launch seam.
 *
 * @see the `useResumeAwareLaunch` wrapper in `./index.ts` for the full
 * account of the defect this fixes. That docblock is the canonical
 * one; this file exists only so `./index.ts` and `./playbackFacade.ts`
 * can share ONE implementation without importing each other
 * (`playbackFacade` is already imported by `index.ts` for the
 * `PlaybackId` type, so the reverse edge would be a runtime cycle).
 */

import React, {useMemo} from 'react';
import {useOpenWithResume} from '@simba-dev/react-native-media-player';
import type {
  OpenPlayerOptions,
  UsePlayerActivityResult,
} from '@simba-dev/react-native-media-player';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {useAudioPresentationStore} from '../../state/useAudioPresentationStore';
import {usePresentationStore} from '../../state/usePresentationStore';
// Imported from the concrete store modules rather than the `state`
// barrel: `resumePolicy` already depends on those two types, and the
// barrel re-exports enough of the app that routing through it here
// would put a cycle (`state/index` -> ... -> `infrastructure/player`)
// on the seam's import graph for no benefit.
import {useBookmarksStore} from '../../state/bookmarksStore';
import {useRecentHistoryStore} from '../../state/recentHistoryStore';
import {
  planResume,
  resolvePlanStartMs,
  resolveResumeCandidate,
  type ResumeCandidate,
  type ResumeChoice,
} from './resumePolicy';

/**
 * Extra identity a launching screen can supply, beyond what the bridge
 * needs.
 *
 * The bridge only wants `uri` / `title` / `type` / `startPositionMs`.
 * These fields exist so the resume + "Recently Played" chain can write a
 * shelf entry that actually looks like the thing the user tapped —
 * with its artwork, its lane, its catalogue name — instead of a row of
 * bare titles.
 *
 * Entirely optional. A caller that has only a URI (the file picker, a
 * deep link) passes nothing and still resumes correctly; the entry just
 * carries less metadata.
 */
export interface LaunchIdentity {
  /**
   * Semantic kind from the catalogue, e.g. `'movie'`.
   *
   * Named `mediaKind`, NOT `type`, and that is deliberate: the bridge's
   * `OpenPlayerOptions.type` is the REQUIRED `'video' | 'audio'` stream
   * type. Naming the semantic kind `type` too meant destructuring it off
   * silently removed a field the bridge still required — `tsc` caught it,
   * but only because this seam is the one place the collision exists.
   */
  mediaKind?: NowPlayingKind;
  /** Playback lane. Keeps audio and video shelves independent. */
  mediaLane?: 'audio' | 'video';
  /** Catalogue / provider name, when the screen knows it. */
  provider?: string;
  /** Artwork URI, when the screen has one. */
  thumbnailPath?: string;
}

type NowPlayingKind = NonNullable<
  import('../../state/nowPlayingStore').NowPlaying['type']
>;

/** The launch shape the app's seam accepts: bridge options + optional identity. */
export type AppOpenPlayerOptions = OpenPlayerOptions & LaunchIdentity;

/**
 * The lib's result type, with `openPlayer` widened to accept the app's
 * own identity fields.
 *
 * This widening is not cosmetic. While the seam was typed with the
 * lib's `UsePlayerActivityResult`, `openPlayer` accepted
 * `OpenPlayerOptions` alone — so `mediaLane` / `mediaKind` /
 * `thumbnailPath` were a type error at every one of the ~34 call sites.
 * The fields existed, the seam destructured them, and nothing could
 * pass them without a cast. That is why every launch arrived
 * unclassified, why the history store defaulted to the audio lane, and
 * why films rendered with a music badge.
 */
export type AppPlayerLaunchResult = Omit<UsePlayerActivityResult, 'openPlayer'> & {
  openPlayer: (opts: AppOpenPlayerOptions) => Promise<boolean>;
};

/**
 * Asks the user what to do about a saved position.
 *
 * Reached through {@link ResumePromptContext} rather than a per-call
 * argument, because this hook is called from ~34 screens. A prompt
 * passed as a parameter would be opt-in per screen, and the one screen
 * that forgets it silently loses the choice — the exact failure the seam
 * exists to prevent. A context provider at the app root makes the
 * choice universal.
 *
 * The callback lives in `App.tsx` (it needs a `Dialog`), so this module
 * stays free of UI and a unit test can supply a plain function.
 */
export type PromptResume = (candidate: ResumeCandidate) => Promise<ResumeChoice>;

/**
 * `undefined` means "no prompt wired" and resumes silently. It is NOT
 * a way to disable resume — an explicit `startPositionMs: 0` is.
 */
export const ResumePromptContext = React.createContext<PromptResume | undefined>(
  undefined,
);

/**
 * Per-call override, for a screen that deliberately wants a different
 * prompt (or none) for one launch. Rare enough that the common path is
 * the context.
 */
export interface UseResumeAwareLaunchOptions {
  readonly promptResume?: PromptResume;
}

/**
 * `useResumeAwareLaunch` with resume resolved — and, when a prompt is
 * available, asked about — by default.
 *
 * Replaces the lib's pass-through hook for every app call site. See
 * `./index.ts` for why resume belongs at this seam rather than at 34
 * screens, and `resumePolicy.ts` for what the policy actually does.
 *
 * Behaviour contract:
 *   - `resumeId` is the media `uri` (the app's resume key everywhere —
 *     the policy matches on `Bookmark.fileUri` /
 *     `RecentHistoryEntry.fileUri`).
 *   - The seam ALWAYS sends an explicit `startPositionMs`. That is what
 *     makes it the single authority: the lib's own `resumePolicy` lookup
 *     is gated on `providedStartMs == null`
 *     (`useOpenWithResume.tsx:128`), so an always-present value means
 *     two resume rules can never disagree about the same launch.
 *   - An explicit caller position still wins untouched — including `0`,
 *     which is how "start over" is expressed and what suppresses the
 *     lib's policy.
 *   - W9.5: when a saved position exists and a prompt is wired, the user
 *     is asked (Plex: "Resume" / "From the beginning"; VLC: "Continue
 *     playback?"). Previously four screens each re-implemented resume
 *     by passing a store position — in SECONDS — into a MILLISECOND
 *     field, which both broke by 1000x and silently bypassed this
 *     policy on every launch.
 *   - The launch is recorded in `useNowPlayingStore`. The lib cannot
 *     tell us which file a single-file launch is playing (its
 *     `currentUri` comes from the queue, which `openPlayer` does not
 *     populate), so the seam — which was handed the URI — is the only
 *     place that can publish it. `usePlaybackCheckpointSync` reads it
 *     to write resume checkpoints.
 */
export function useResumeAwareLaunch(
  options: UseResumeAwareLaunchOptions = {},
): AppPlayerLaunchResult {
  const openWithResume = useOpenWithResume();
  const beginSession = useNowPlayingStore(s => s.begin);
  const endSession = useNowPlayingStore(s => s.end);
  const expandAudioPlayer = useAudioPresentationStore(s => s.expand);
  const expandVideo = usePresentationStore(s =>
    s.setVideoPresentation,
  );
  const contextPrompt = React.useContext(ResumePromptContext);
  const promptResume = options.promptResume ?? contextPrompt;

  return useMemo<AppPlayerLaunchResult>(
    () => ({
      openPlayer: async (opts: AppOpenPlayerOptions) => {
        // Identity fields are ours; the bridge must not see most of them,
        // so they are destructured off before delegating. Forwarding an
        // unknown key across the bridge is how argument-shape drift
        // starts. `type` is deliberately NOT destructured — it belongs
        // to the bridge and is required there.
        //
        // `thumbnailPath` is the exception: it becomes the media
        // notification's artwork on the audio path, which now runs
        // without a window. Nothing else would put an image on the
        // notification, because before V20 that was `PlayerActivity`'s
        // job and it was hardcoded to an empty string.
        const {mediaKind, mediaLane, provider, thumbnailPath, ...bridgeOpts} = opts;

        const candidate = resolveResumeCandidate(
          {
            bookmarks: useBookmarksStore.getState().items,
            history: useRecentHistoryStore.getState().entries,
          },
          bridgeOpts.uri,
        );

        const plan = planResume({
          explicitStartMs: bridgeOpts.startPositionMs,
          candidate,
          prompt: promptResume != null,
        });

        // Only `prompt` plans block. `explicit` and `auto` resolve
        // synchronously, so the overwhelmingly common path adds no
        // await and cannot be delayed by a dialog that is not there.
        const choice =
          plan.kind === 'prompt' && promptResume
            ? await promptResume(plan.candidate)
            : undefined;
        const startPositionMs = resolvePlanStartMs(plan, choice);

        // Recorded BEFORE the launch is awaited. A rejected launch must
        // not leave a "now playing" entry for media that never started.
        beginSession({
          uri: bridgeOpts.uri,
          title: bridgeOpts.title,
          // V21 F3: the position this session actually begins at.
          //
          // It used to exist only as an argument to `openWithResume` and
          // was gone one call later, which meant an in-window video load
          // had no way to honour "continue from 12:04" — there was no
          // second Activity to carry the position in as an Intent extra,
          // and the session did not record it. Required rather than
          // optional for that reason: a launch that cannot state where it
          // starts is a launch that will silently start over.
          startPositionMs,
          // The stream type the bridge is about to be asked for. Recorded
          // so the audio chrome can tell an audio launch from a video one:
          // both write a session here, but only audio has no window and
          // therefore needs in-app chrome.
          streamType: bridgeOpts.type,
          // The LANE is NOT optional, and that is the whole point of this
          // change. `bridgeOpts.type` is `'video' | 'audio'` at every one
          // of the ~31 launch sites and was being discarded here — the
          // conditional spreads below left both fields off the session
          // unless a screen happened to pass `mediaKind`/`mediaLane`,
          // which only 4 did. The checkpoint writer then forwarded no
          // lane, and `normalizeMediaClassification` filled the hole with
          // `'audio'` (media.ts:76). That is the Turkish film with a
          // music note in Recently Played.
          //
          // A catalogue lane still wins when a screen supplies one: it is
          // more specific than "it's audio". But its absence is no longer
          // allowed to become a fact.
          type: mediaKind ?? bridgeOpts.type,
          mediaLane: mediaLane ?? bridgeOpts.type,
          ...(provider ? {provider} : {}),
          ...(thumbnailPath ? {thumbnailPath} : {}),
        });

        // V20 Phase C — an audio launch shows the full player.
        //
        // Spotify, YouTube Music, Apple Music and Plex all open the
        // now-playing screen when a track is tapped from a list, so this
        // is observed behaviour rather than a preference.
        //
        // Written HERE, once, and only for audio. It must not become a
        // per-tree sync effect: `App` is mounted once per Activity React
        // root, so two writers of one value is the W6.0 ping-pong that
        // shipped a black player screen (see `usePresentationStore`).
        // Screens live in the MainActivity tree, and so does this seam,
        // so there is exactly one writer.
        if (bridgeOpts.type === 'audio') {
          expandAudioPlayer();
        }

        // V21 F4 — and a video launch asks for the fullscreen
        // presentation, by the same rule.
        //
        // Without this, tapping a film while a previous film sat in the
        // dock would open it minimised: `videoPresentation` survives the
        // session, so the new video would inherit the old one's request and
        // land in a 44pt dock instead of opening fullscreen the way every
        // video app does. It is a discrete event write, not an effect that
        // depends on the value it writes — the W6.0 shape is a per-tree
        // reconciliation, and this is neither.
        if (bridgeOpts.type === 'video') {
          expandVideo('expanded');
        }

        // V21 F3 — video does NOT launch an Activity any more.
        //
        // `openWithResume` → `bridge.openPlayer` → `startActivity` is the
        // mechanism this phase removes. The session written just above is
        // the payload: `useInWindowVideoLaunch` rebuilds it and calls the
        // library's own `useLaunchPlayback`, and the surface already mounted
        // in `MainActivity` renders it. A `SurfaceView`'s Surface belongs
        // to its window, so video in a second Activity is also what makes an
        // in-app mini player impossible — this is not a preference.
        //
        // Resolves `true` on the same terms `openPlayer` used: the app has
        // taken responsibility for this launch and the session is recorded.
        // It is NOT a claim that pixels are on screen — that is what the
        // surface actually reporting is for, and a failed load surfaces
        // through mpv's own `end-file` event rather than through this
        // promise. Returning `false` here would mean "nothing was
        // attempted", which would be untrue.
        if (bridgeOpts.type === 'video') {
          return Promise.resolve(true);
        }

        return openWithResume({
          ...bridgeOpts,
          startPositionMs,
          resumeId: bridgeOpts.uri,
          ...(thumbnailPath ? {artworkPath: thumbnailPath} : {}),
        }).catch(error => {
          endSession();
          throw error;
        });
      },
    }),
    [
      openWithResume,
      beginSession,
      endSession,
      expandAudioPlayer,
      expandVideo,
      promptResume,
    ],
  );
}