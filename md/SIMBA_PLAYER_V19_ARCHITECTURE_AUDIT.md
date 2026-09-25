# SIMBA Player — V19 Architecture Audit (Source of Truth)

**Owner:** V19 architect (this document is the contract — V19 SPEC §1-§14 reference it). Every architectural decision V19 makes traces to a section here.

**Audit date:** 2026-09-25
**Scope:** Full app (40+ consumer call sites) + the native module (`@simba-dev/react-native-media-player` v1.5.18) + the app's facade (`src/infrastructure/player/`) + the app's Zustand stores (`usePlayerStore`, `usePlaylistsStore`, etc.)

---

## 0. Executive summary

V19 is the player-UI rewrite for SIMBA. It does **not** rewrite the lib (the lib works — libc++ ABI fixed in D-040, mpv loads, audio plays, manifests correct for PiP). V19 rewrites the **consumer-side chrome** that 40+ screens rely on.

**The three-layer model V19 respects:**

```
Layer 1 — Native (@simba-dev/react-native-media-player)
  - libmpv + MpvBridgeModule + JNI + 16KB-aligned libc++
  - PlayerActivity (Android, launchMode=singleTask)
  - Opaque native queue, repeat, shuffle
  - API surface: openPlayer({uri, title, type, startPositionMs?}) → Promise<boolean>

Layer 2 — App Facade (src/infrastructure/player/)
  - usePlayer() / usePlayerProgress() / usePlayerActivity() / useOpenPlaylist()
  - useQueue() / useQueueSync() (NEW) / usePresentation() (NEW)
  - usePlaybackFacade() (composes 5 hooks)
  - usePlay() / usePlayWithResume() (typed Result<...>)
  - validateLane() (NEW) / secondsToMs() / bridgeErrors / streamErrors
  - V19 three-symbol public surface: SimbaPlayer, usePlayerActivity, useOpenWithResume
  - THIS LAYER IS THE BOUNDARY. Consumers never reach past it.

Layer 3 — Consumer (src/screens/**, src/components/**)
  - 40+ screens import ONLY from src/infrastructure/player/ (the facade)
  - V19 chrome primitives (VideoSurface, TransportBar, VideoMiniPlayer, etc.)
  - NowPlayingScreen (the V18 monolith — rewritten in W2/W3)
  - SimbaPlayer mounted at App.tsx shell (always-mount, conditional render)
```

---

## 1. Current architecture (what exists today)

### 1.1 Native module

The lib `@simba-dev/react-native-media-player` (v1.5.18) is the source of truth for **playback state**. It exposes:

| API | Signature | Returns |
|---|---|---|
| `openPlayer` | `({uri, title, type, startPositionMs?})` | `Promise<boolean>` |
| `openPlaylist` | `(entries: Array<{uri, title}>, opts: {type, startIndex?, shuffle?, startPositionMs?})` | `Promise<boolean>` |

The lib's native queue is **opaque** — JS cannot read "what's next." The lib has internal `next()` / `previous()` / `setLoopMode` commands but the queue contents are not exposed.

The native side is correct: `PlayerActivity` is `launchMode="singleTask"`, `resizeableActivity="true"`, `supportsPictureInPicture="true"`, with `configChanges` including `screenSize|smallestScreenSize|screenLayout|orientation|navigation`. PiP works manifest-wise; D-033 (black surface) is a separate paint-path issue.

### 1.2 App facade (`src/infrastructure/player/`)

Files:
- `index.ts` (12.3 KB) — barrel re-export + `usePlay` / `usePlayWithResume` hooks
- `playbackFacade.ts` (11.3 KB) — `usePlaybackFacade()` composes 5 hooks
- `position.ts` (1.8 KB) — `secondsToMs()` helper
- `resumePolicy.ts` (4.2 KB) — `resolveResumeMs()` for bookmarks+history
- `streamErrors.ts` (11.4 KB) — typed `Result<PlaybackId, StreamError>` machinery
- `bridgeErrors.ts` (4 KB) — `mapBridgeLaunchError()` for bridge rejection codes
- `.gitkeep`

The facade re-exports the lib's hooks (`usePlayerActivity`, `useOpenPlaylist`, `usePlayer`, `usePlayerProgress`, `useQueue`, `useQueueItemsAs`, `usePlaybackHistoryAs`, `resolveStreamType`, `getMpvPlayerModule`, `PlayerResumeProvider`, `useOpenWithResume`, `usePlayItem`) and adds app-side wrappers.

### 1.3 State stores (`src/state/`)

| Store | Owner | Persists | Lane-aware |
|---|---|---|---|
| `usePlayerStore` | app (Zustand, MMKV) | Yes | Yes (filters at addToPlaylist) |
| `usePlaylistsStore` | app (Zustand, MMKV) | Yes | Yes (filters at addItemToPlaylist) |
| `useBookmarksStore` | app (Zustand, MMKV) | Yes | No |
| `useRecentHistoryStore` | app (Zustand, MMKV) | Yes | No |
| `useDownloadsStore` | app (Zustand, MMKV) | Yes | No |
| `useMediaStore` | app (Zustand, MMKV) | Yes | Yes (separate audio/video tracks) |
| `useFollowedPodcastsStore` | app (Zustand, MMKV) | Yes | No |
| `useLiveFavoritesStore` | app (Zustand, MMKV) | Yes | No |
| `useSettingsStore`, `useWeatherStore`, `useSessionStore`, `useAuthStore` | app | varies | n/a |

`usePlayerStore` has: `currentFile` (PlaylistEntry | null), `playlist` (PlaylistEntry[]), `currentIndex` (number) + actions: `loadPlaylistToPlayer`, `addToPlaylist`, `removeFromPlaylist`, `reorderPlaylist`, `playFromPlaylist`, `clearPlaylist`, `setCurrentFile`, `reset`.

`usePlayerStore.addToPlaylist` filters by `activeLane(state) ?? incoming[0]?.mediaType` and drops items of mismatched lane. `normalizeSingleLane` does the same on `loadPlaylistToPlayer`.

### 1.4 Lane integrity

| Type | Values |
|---|---|
| `MediaKind` | `'audio' \| 'music' \| 'podcast' \| 'audiobook' \| 'radio' \| 'video' \| 'movie' \| 'live-tv' \| 'archive-audio' \| 'archive-video'` |
| `MediaLane` | `'audio' \| 'video'` |
| `MediaSource` | `'local' \| 'api'` |

The lib takes `type: 'video' | 'audio'` at the bridge level — it does NOT enforce that all items in a playlist share the lane. JS-side filtering is best-effort. Native-side enforcement is unverified.

### 1.5 The 40+ consumer call sites

Movies, Music, AllVideos, AllAudio, Home, Search, Song, Album, Artist, Audiobook, Radio, LiveTV, Genre, FolderBrowser, ArchiveItemDetail, Bookmarks, History, Queue, Stats, Profile, PlaylistDetail, AllPlaylists, PodcastDetail, EpisodeActions, features/library (LocalFolders, LibraryScreen, ArtistDetail, AlbumDetail), Settings, Equalizer, Help, About, Changelog, NowPlaying.

Every section of the app can play media. Local files (linked folders), podcasts, audiobooks, music, radio, live TV, Internet Archive, movies, video playlists.

### 1.6 NowPlayingScreen (the V18 monolith)

`src/screens/NowPlaying/components/NowPlayingScreen.tsx` (498 lines, the "shit" baseline per manager review). Anti-patterns:
- `TouchableOpacity` for seek track instead of `Pressable` + `accessibilityRole="adjustable"`
- `pointerEvents="none"` on inner View (the V11 anti-pattern)
- Raw emoji icons (`◀◀⏸▶▶▶`, `🔇🔈🔉🔊`)
- Hardcoded "70%" volume label
- 4 type guards imported from the facade (`isNetworkError`, etc.)
- `usePlaybackFacade()` for state + progress + commands + launch
- 159 lines of inline `StyleSheet.create`

This is THE decomposition target for W2/W3.

---

## 2. The 10 mistakes in the V19 SPEC draft (before correction)

The V19 SPEC §2-§13 contained these architectural mistakes. They are corrected in the rewritten SPEC.

### Mistake 1 — Name collision with the lib's `usePlayerActivity()`

- Lib: `usePlayerActivity()` returns `{openPlayer, getLaunchParams}` (the **LAUNCH** surface)
- V19 draft: `usePlayerActivity()` returns `{videoState, isPlaying, positionMs, ...}` (the **STATE** surface)
- **Fix:** V19 SPEC §5.4 keeps the LIB's name. The state surface is exposed as `usePlaybackState()` (NEW) which composes `usePlayer()` + `usePlayerProgress()`. Or V19 consumers just call `usePlayer()` + `usePlayerProgress()` directly. The three-symbol rule drops `usePlayerActivity` and uses the existing `useOpenWithResume` instead.

### Mistake 2 — `presentation: 'mini' | 'expanded' | 'pip'` is not a lib concept

- Lib has only "active session vs idle" — no presentation state
- V19 draft placed `setPresentation(...)` on the imperative ref
- **Fix:** `presentation` lives in a new `usePresentationStore` (Zustand, MMKV-persisted). SimbaPlayer reads from it. The lib is untouched. `setPresentation` is a store action, not an imperative ref method.

### Mistake 3 — `loadFile()` doesn't exist on the lib

- Lib: `openPlayer({uri, title, type, startPositionMs?})` returns `Promise<boolean>`
- V19 draft: `loadFile(item, opts)` returns `Promise<Result<PlaybackId, StreamError>>`
- **Fix:** Use the lib's name `openPlayer` (or wrap as `commands.open(input)` in the facade). SPEC §5.3 aligns.

### Mistake 4 — Repeat / shuffle source of truth

- Lib: `loopMode: 'none' | 'file' | 'playlist'` (internal state, presumably mutable via some command — needs verification in W0)
- V19 draft: chrome Repeat Off / One / All UI without naming the lib command
- **Fix:** SPEC §5.3 names the facade command as `commands.setLoopMode(mode)`. The UI label "Repeat one" maps to `loopMode: 'file'`. Mapping is explicit and locked.

### Mistake 5 — `presentation` independence from `PlayerActivity` lifecycle

- V19 draft §3.4.1 (corrected version) didn't say `setPresentation('expanded')` is a JS-side CSS visibility toggle, not a native intent
- **Fix:** SPEC §3.4.1 + §6 state machine say explicitly: "setPresentation is a JS-side state mutation. The native `PlayerActivity` is always the same instance (singleTask). No new activity launches on expand/collapse."

### Mistake 6 — `usePlayerStore` and the lib's session are two sources of truth

- `usePlayerStore.currentFile` (Zustand) vs lib's session (native)
- 40+ consumer screens don't consistently update `usePlayerStore` after launching playback
- Home screen's "Now Playing" tile can show stale item
- **Fix:** V19 introduces `useQueueSync()` middleware (in the facade). It subscribes to the lib's session + queue events and writes to `usePlayerStore`. `usePlayerStore` becomes a derived view, not a parallel source.

### Mistake 7 — No native queue inspection from JS

- `useQueue()` reads whatever the lib exposes; whether "next up" is in there is unverified
- V19's NextUpOverlay (§3.18) needs "next item" — without it, the overlay can't render the actual next
- **Fix:** SPEC §3.18 reads from `usePlayerStore.playlist[currentIndex + 1]`. The consumer queue is the source of truth for "what's next", and `useQueueSync()` keeps it in sync with the native queue.

### Mistake 8 — 40+ files import the facade, not the lib barrel

- V19 SPEC §2.1 Rule 2 said "import from `@simba-dev/react-native-media-player`" — WRONG
- The facade IS the boundary (existing import-boundary linter enforces this)
- **Fix:** SPEC §2.1 + §5 say the public surface is `src/infrastructure/player/` (the app's facade), NOT the npm package.

### Mistake 9 — No queue sync wire

- `usePlayerStore.addToPlaylist` updates only the Zustand store
- `useOpenPlaylist` replaces the native queue
- Two queues drift
- **Fix:** `useQueueSync()` middleware subscribes to launch + next + previous + clear events and writes `usePlayerStore.setCurrentFile(...)` + `currentIndex` updates. `usePlayerStore.playlist` is canonical; `openPlaylist()` reads from it.

### Mistake 10 — Persisted resume prompt storage mismatch

- V19 draft §3.17 wrote `AsyncStorage` for SmartResumePrompt
- The app uses MMKV (`sharedMMKVStorage`) — not AsyncStorage
- **Fix:** SPEC §3.17 uses MMKV. Same for §3.13 (caption customizer) + §3.16 (skip silence) + §3.18 (auto-play next).

---

## 3. The 10 architectural decisions V19 locks in (the contract)

| # | Decision | Rationale | Locked in |
|---|---|---|---|
| A | **Three-symbol public surface: `SimbaPlayer`, `usePlayerActivity`, `useOpenWithResume`** — imported from `src/infrastructure/player/` (the facade), NOT from the lib | Existing import-boundary linter enforces this. Junior-dev integration uses one barrel. | SPEC §2.1 + §5.1 |
| B | **`presentation` lives in `usePresentationStore` (NEW, Zustand, MMKV)** — SimbaPlayer reads from it. NOT in the lib. | Lib is singleTask PlayerActivity — only one presentation at the native level. Mini/expanded is JS-side. | SPEC §3.4.1 + §6 + §9 |
| C | **`useQueueSync()` middleware is the single wire between native queue and `usePlayerStore`** — `usePlayerStore` becomes derived view. | 40+ consumers currently have two sources of truth that drift. | SPEC §3.10 (new) + §9 + §10 |
| D | **`validateLane()` wrapper on every launch path** — JS-side enforcement; rejects mismatched lane before the bridge call. | Native-level lane enforcement is unverified; can't rely on it. | SPEC §3.5 (new) + §9 |
| E | **Repeat / shuffle source of truth is the lib's `loopMode` + `shuffle` state** — V19 chrome UI reads via `usePlayer().state.loopMode`; UI labels "Repeat off/one/all" are aliases for `loopMode: 'none' | 'file' | 'playlist'`. | SPEC §3.10 + §5.3 |
| F | **`openPlayer` (lib name) is canonical in the facade** — `commands.open(input)` re-exports it with typed `Result<...>`. V19 never uses the name `loadFile`. | Lib already has the API; rename costs nothing, matches user's existing patterns. | SPEC §5.3 |
| G | **`usePlayerStore.playlist[currentIndex + 1]` is the "next up" data source** — backed by `useQueueSync()` middleware. | Lib's native queue contents are opaque. | SPEC §3.18 |
| H | **MMKV (not AsyncStorage) for all V19 persistent state** — matches the existing app's persistence layer. | The app uses MMKV. AsyncStorage would be a separate persistence stack. | SPEC §3.13 + §3.16 + §3.17 + §3.18 |
| I | **Native queue inspection + rich error codes are V20 (not V19)** — V19 documents the gap; doesn't pretend it doesn't exist. | Lib work is out of scope; would need lib release. | SPEC §12 |
| J | **SimbaPlayer is ALWAYS mounted at App.tsx shell** (already corrected). Three presentations: `'idle' → null`, `'mini' → dock`, `'expanded' → full chrome`. | Chrome that toggles visibility = same view at different sizes. User-corrected from mount/unmount pattern. | SPEC §3.4.1 + §6 + Agent memory entry |

---

## 4. The corrected V19 architecture (final)

### 4.1 Three-layer model (locked)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1 — Native (lib)                                      │
│ @simba-dev/react-native-media-player                       │
│ - libmpv + MpvBridgeModule + JNI + 16KB-aligned libc++     │
│ - PlayerActivity (singleTask)                              │
│ - Opaque native queue, repeat, shuffle                      │
│ - API: openPlayer / openPlaylist (returns Promise<boolean>) │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ bridge calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2 — App Facade (src/infrastructure/player/)           │
│ Re-exports + wraps:                                         │
│   usePlayer, usePlayerProgress, usePlayerActivity,         │
│   useOpenPlaylist, useQueue, useQueueItemsAs,               │
│   usePlaybackHistoryAs, useOpenWithResume, usePlayItem     │
│ NEW (V19):                                                  │
│   useQueueSync (middleware: native queue ↔ usePlayerStore)  │
│   usePresentation (reads usePresentationStore)              │
│   validateLane (guards every launch path)                   │
│ App-side wrappers (typed):                                  │
│   usePlaybackFacade (composes 5 hooks)                     │
│   usePlay (open from 0)                                    │
│   usePlayWithResume (open at saved position)               │
│ Helpers: secondsToMs, resolveResumeMs, mapBridgeLaunchError│
│ Three-symbol V19 surface:                                   │
│   SimbaPlayer (NEW), usePlayerActivity (re-export),         │
│   useOpenWithResume (re-export)                             │
│ Persistence: MMKV (sharedMMKVStorage)                       │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ import from facade only
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3 — Consumer (40+ screens)                            │
│ Imports from src/infrastructure/player/ (the facade)        │
│ V19 chrome primitives (W1+):                                │
│   VideoSurface, VideoTitleOverlay, TransportBar,            │
│   VideoMiniPlayer, VideoErrorOverlay,                      │
│   VideoLoadingOverlay, VideoMoreSheet,                      │
│   ChromeAutoHideController, ScrubPreview,                  │
│   VerticalSwipeGestures, DoubleTapZones,                   │
│   LongPressSpeedPreview, CaptionTrackSelector,             │
│   AudioDescriptionTrackSelector, InteractiveTranscript,   │
│   SkipSilenceToggle, SmartResumePrompt,                    │
│   NextUpOverlay, ReduceMotionController,                    │
│   DpadController, CaptionCustomizer,                       │
│   FlashingLightsBadge (deferred to V20)                     │
│ SimbaPlayer: always mounted at App.tsx shell               │
│ NowPlayingScreen: rewritten in W2/W3                        │
│ QueueScreen, PlaylistDetail, MovieDetail, etc: unchanged    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 V19 public surface (the three symbols + types)

```tsx
// Junior-dev integration — the entire API surface
import {
  SimbaPlayer,                // <SimbaPlayer source={...} onError={...} ref={ref} />
  usePlayerActivity,          // launch surface: openPlayer, getLaunchParams (lib's API)
  useOpenWithResume,          // auto-lookup launch: PlayerResumeProvider-driven
} from 'src/infrastructure/player';

import type {
  SimbaPlayerRef,            // imperative ref API (play/pause/seek/setVolume/setLoopMode/...)
  VideoSource,               // { uri, title, kind: 'video' | 'audio' }
  OpenInput,                 // { uri, title, mediaType }
  Result,                    // ok | err
  StreamError,               // network | unsupported | expired | blocked | launch | codec
} from 'src/infrastructure/player';
```

### 4.3 State ownership (final)

| State | Owner | Persists | Notes |
|---|---|---|---|
| `isPlaying`, `title`, `artist`, `volume`, `mute`, `speed`, `loop`, `shuffle` | lib | n/a (transient) | `usePlayer().state` |
| `positionMs`, `durationMs`, `isBuffering`, `isSeeking`, `seekable`, `cacheFill` | lib | n/a (transient) | `usePlayerProgress()` |
| Native queue contents | lib (opaque) | No (lost on `PlayerActivity` kill) | `useQueue()` |
| `usePlayerStore.playlist` | app (Zustand MMKV) | **Yes** | Derived view, updated by `useQueueSync()` |
| `usePlayerStore.currentFile` | app (Zustand MMKV) | **Yes** | Set by `useQueueSync()` on every launch |
| `usePlayerStore.currentIndex` | app (Zustand MMKV) | **Yes** | Updated by `useQueueSync()` on next/prev |
| `usePresentationStore.mode` | app (Zustand MMKV) | **Yes** | NEW |
| Bookmarks | app (Zustand MMKV) | **Yes** | For resume prompt |
| Recent history | app (Zustand MMKV) | **Yes** | For resume prompt |
| Captions customizer | app (Zustand MMKV) | **Yes** | Font size / background / position |
| Skip silence toggle | app (Zustand MMKV) | **Yes** | Default OFF |
| Auto-play next toggle | app (Zustand MMKV) | **Yes** | Default OFF |
| Haptic feedback toggle | app (Zustand MMKV) | **Yes** | Default ON (iOS) |

### 4.4 Commands surface (final)

```ts
interface SimbaPlayerRef {
  // Transport (re-exposed from lib)
  play(): Promise<void>;
  pause(): Promise<void>;
  togglePlayPause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  seekRelative(deltaMs: number): Promise<void>;
  skip(direction: 'forward' | 'backward'): Promise<void>;
  // Output
  setVolume(volume: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  setVideoQuality(quality: string): Promise<void>;
  setLoopMode(mode: 'none' | 'file' | 'playlist'): Promise<void>;
  setShuffle(enabled: boolean): Promise<void>;
  selectCaptionTrack(trackId: string | null): Promise<void>;
  selectAudioDescriptionTrack(trackId: string | null): Promise<void>;
  setSkipSilence(enabled: boolean): Promise<void>;
  // Launch (re-exposed from lib)
  open(input: OpenInput): Promise<Result<PlaybackId, StreamError>>;
  openWithResume(input: OpenWithResumeInput): Promise<Result<PlaybackId, StreamError>>;
  openPlaylist(input: OpenPlaylistInput): Promise<Result<PlaybackId, StreamError>>;
  // Presentation (NEW — app-side only)
  setPresentation(mode: 'mini' | 'expanded' | 'pip'): void;
  // Read-only for the mini player dock
  getCurrentUri(): string | null;
  getCurrentTitle(): string | null;
  getCurrentArtwork(): string | null;
}
```

### 4.5 Always-mount + conditional rendering (locked)

`SimbaPlayer` is mounted at the App.tsx shell, sibling to `NavigationContainer`. It reads `videoState` (lib) + `presentation` (usePresentationStore) and conditionally renders:

```tsx
if (videoState === 'idle') return null;
if (presentation === 'mini') return <VideoMiniPlayer ... />;
return <FullChrome ... />;
```

No mount/unmount cycles. The bridge is bound once at app start. SurfaceView is allocated once. One bridge bind forever.

### 4.6 Queue sync wire (NEW, foundational)

```tsx
// src/infrastructure/player/useQueueSync.ts
// Mounted ONCE at App.tsx shell (same place as SimbaPlayer)

export function useQueueSync(): void {
  const {state} = usePlayer();
  const {openPlayer} = usePlayerActivity();
  const queueInfo = useQueue(); // whatever the lib exposes
  const setCurrentFile = usePlayerStore(s => s.setCurrentFile);
  const setCurrentIndex = usePlayerStore(s => s.playFromPlaylist);

  // Wire: any launch (openPlayer / openPlaylist) writes usePlayerStore
  // Wire: any next/previous command updates usePlayerStore.currentIndex
  // Wire: queue exhaustion clears usePlayerStore.currentFile
}
```

This is what makes Home's "Now Playing" tile + QueueScreen + PlaylistDetail show the same item.

### 4.7 Lane integrity guard (NEW, foundational)

```tsx
// src/infrastructure/player/validateLane.ts
// Wraps every launch path (open / openWithResume / openPlaylist)

function validateLane(
  input: {mediaType: MediaKind | MediaLane | 'video' | 'audio'},
  activeLane: MediaLane | undefined,
): Result<void, StreamError> {
  const itemLane = mediaTypeToLane(input.mediaType);
  if (activeLane && activeLane !== itemLane) {
    return err(laneError(`Can't play ${itemLane} while ${activeLane} is active. Stop playback first.`));
  }
  return ok(undefined);
}
```

JS-side enforcement. Native-level is unverified (V20 follow-up).

---

## 5. The migration plan (W0 → W7)

### W0 — Foundation (no behavior change)

| Phase | Deliverable | Why foundational |
|---|---|---|
| 0.0 | Isolation contract (ESLint rule + 7 grep checks + smoke-test page) | Locks the boundary |
| 0.1 | `useQueueSync()` middleware | Without this, no consumer can rely on `usePlayerStore` |
| 0.2 | `usePresentationStore` (Zustand MMKV) | Without this, `presentation` is unowned |
| 0.3 | `validateLane()` wrapper | Without this, lane integrity is best-effort |
| 0.4 | Empty stub files for chrome primitives (just `export {};`) | Wave 1+ fills them in |
| 0.5 | SimbaPlayer mounted at App.tsx (initially always returns null) | Establishes the mount point |

**W0 produces ZERO behavior change.** All 40+ consumers continue to work. The 7 chrome primitives are empty.

**Phase 0.5 conflict resolution (deferred to W4):** The V16 lib already exports its own `SimbaPlayer` component (verified at `App.tsx:6-10, 250`). It wraps `<AppContent />` with a `resumePolicy` for the auto-resume lookup and owns the cold-start `<SimbaPlayerRoot>` activity-launch branch. **V19's NEW `SimbaPlayer` is a different component** — it does not replace the V16 root in W0. The V16 SimbaPlayer stays at App.tsx; V19's SimbaPlayer is built as a stub but NOT mounted yet. The migration (V19 SimbaPlayer REPLACES V16 SimbaPlayer) is W4 work, when V19 has the chrome primitives to actually render. W0 just builds the foundation safely — no App.tsx churn.

### W1 — Chrome primitives (full implementation)

Fills in the 7 chrome primitives: VideoSurface, TransportBar, VideoMiniPlayer, VideoErrorOverlay, VideoLoadingOverlay, ChromeAutoHideController, ScrubPreview, etc.

### W2 — Transport bar + buffered range

`TransportBar` + `BufferedRangeFill` + `useTransport()` hook. The "defining difference" V11/V2 had.

### W3 — Mode row + More sheet + captions + PiP

The secondary-actions surface. Includes `VideoMoreSheet` with speed / quality / captions / sleep / cast.

### W3.5 — Chrome auto-hide + scrub preview + gestures + long-press

The 2026 research pass additions: `ChromeAutoHideController`, `ScrubPreview`, vertical-swipe gestures (volume + brightness), double-tap zones ±10s, long-press 2× speed preview.

### W3.6 — Accessibility + podcast-first features (12 of 15)

`CaptionTrackSelector` (subtitles/CC/SDH), `CaptionCustomizer`, `AudioDescriptionTrackSelector`, `InteractiveTranscript`, `SkipSilenceToggle`, `SmartResumePrompt`, `NextUpOverlay`, `ReduceMotionController`, `DpadController`, `SkipPrevSmartThreshold`, `AutoPlayNextToggle`, `HapticFeedback`, WCAG audit doc.

### W4 — Mini ↔ full sync

Mini/full expand/collapse with shared native session. NowPlayingScreen rewritten as `SimbaPlayer` consumer.

### W5 — VideoController (the orchestrator)

The 5-boundary state machine.

### W6 — PiP + system integration

Final PiP polish, MediaSession, lifecycle handling.

### W7 — Acceptance matrix + accessibility + responsive QA

All 30+ acceptance matrix rows pass. WCAG 2.2 AA audit template completed.

---

## 6. Open issues deferred to V20

These are real but out of V19 scope. Each is documented in SPEC §12.

1. **Native queue inspection** — lib needs to expose "next up" via a typed API. Today it's opaque.
2. **Rich error codes (HTTP status from bridge)** — V12 bridge returns `boolean`. W22 follow-up was: after native bridge update surfaces HTTP status codes.
3. **Native-level lane integrity enforcement** — V19 has JS-side `validateLane()`. Native-level would need lib update.
4. **Skip intro / credits / recap (Netflix pattern)** — requires content-team fingerprinting pipeline. Not a player feature.
5. **Network change handling** — wifi → cellular → offline prompts. Defer to V20.
6. **Flashing Lights badge** — iOS 17+ Dim Flashing Lights. Defer to V20.
7. **Voice-control intents** (Siri / Assistant) — partial via MediaSession; full registration is V20.
8. **Subtitle customization beyond font/bg/position** — color, edge style, font family. V20.
9. **Smart resume deep-link** (notification → specific timestamp) — V20; V19 supports `initialPositionMs` but deep-link plumbing is owned by navigation.
10. **Live captions (WCAG 1.2.4 AA)** — VOD-only today.

---

## 7. Risk register (mitigations)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| W0 changes break 40+ consumers | Medium | High | W0 produces ZERO behavior change; only adds middleware + stubs. CI gate: `npm run lint:boundaries` + `tsc --noEmit` + `jest` |
| `useQueueSync()` introduces re-render storm | Low | Medium | Use selector slices; debounce; only fire on real state changes |
| `usePresentationStore` not synced to MediaSession | Medium | Low | MediaSession reads `usePlayer().state` directly; doesn't need `usePresentationStore` |
| SimbaPlayer mounted at App.tsx conflicts with existing `SimbaPlayer` from V16 (lib) | Medium | High | W0 investigates: the V16 root `<SimbaPlayer>` mounts `<PlayerResumeProvider>`. V19's new SimbaPlayer REPLACES it. Migration is a single grep + delete pass. |
| Native bridge crash (D-033-style) | Low | High | Bridge re-bind recovery is a V20+ concern. V19 detects it via `presentation !== 'pip' && videoState === 'idle'` mismatch and shows "Reconnecting..." |
| W0 stub files cause circular imports | Low | Medium | Stubs only export empty; chrome primitives wire up in W1 |

---

## 8. Carried forward (each enumerated)

- **D-033 [HIGH]** — black-surface video render. Separate from V19.
- **V19-W0 [HIGH]** — 6 sub-phases (0.0 isolation, 0.1 queue sync, 0.2 presentation, 0.3 lane, 0.4 stubs, 0.5 SimbaPlayer mount)
- **V19-W1 through W7 [HIGH]** — full implementation per migration plan
- **Podcast Index runtime verification [MEDIUM]** — `episodeCount` fix staged + tsc clean
- **V20 items [MEDIUM]** — 10 deferred (see §6)
- **delete_me/ cleanup [LOW]** + **F-009 CI smoke-test [LOW]** + **F-010 CHANGELOG [LOW]** — unchanged

---

## 9. References

- `@simba-dev/react-native-media-player` v1.5.18 — the lib
- `src/infrastructure/player/index.ts` — the app's facade (12.3 KB barrel)
- `src/infrastructure/player/playbackFacade.ts` — `usePlaybackFacade` composition (11.3 KB)
- `src/state/playerStore.ts` — Zustand consumer queue
- `src/state/playlistsStore.ts` — Zustand persistent user playlists
- `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` — V19 SPEC (corrected by this audit)
- `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` — V19 TRACKER (corrected by this audit)
- `md/SIMBA_PLAYER_WCAG_2.2_AA_AUDIT.md` — a11y audit template
- Agent memory: "Chrome that toggles visibility — always-mount with conditional rendering"

---

**End of V19 architecture audit. This document is the source of truth for the corrected architecture. V19 SPEC §1-§14 reference back to it.**
