# SIMBA — App-wide page issue scan (2026-11-06)

**Every screen in the app, read once, every defect written down, nothing fixed.**
This is an **audit**, not a wave: no source file was touched, no build / test /
lint / typecheck was run, and no fix patch appears anywhere in this file.

**Scanned:** 2026-11-06 · branch `f5/w22-close-minimise-d9` · HEAD `9ff8e2d`
**Scope:** every screen under `src/screens/*/components/` (38 files — the brief
names 38 screens and says 40; two of the 38 are registered in the navigator
under a different file name, `RadioContent.tsx` and `LiveTVContent.tsx`, and are
listed under their route names below), plus the shared components those screens
use, `src/navigation/`, `src/state/`, `src/theme/tokens.ts` and the seams in
`src/infrastructure/player/`.
**Method:** **static read of the source only.** Every entry below cites the
`file:line` that proves it and explains the mechanism. **NO device verification
was performed** — nothing here was measured on a screen; where a conclusion
needed a device it is in the last section, not in the findings.
**ID space:** `S-nnn`, a register of its own. The `B-nnn` bug register
(`md/SIMBA_BUG_TRACKER_2026_10_21.md`) is untouched and still owns everything
it already owns; cross-references are listed at the end.

## How to read this file

| Column | Meaning |
|---|---|
| **ID** | `S-nnn`, permanent. Never reused, never renumbered. |
| **State** | `OPEN` — found by this scan, not yet fixed. |
| **Severity** | `P0` broken · `P1` wrong/lies to the user · `P2` degraded · `P3` cosmetic/cleanup |
| **Lane** | `video` · `audio` · `both` · `app-shell` |
| **Evidence** | `file:line` — the line that proves the defect, read in this repo at this commit. |

---

## Summary

| Severity | Count |
|---|---|
| P0 | 0 |
| P1 | 6 |
| P2 | 10 |
| P3 | 8 |
| **Total** | **24** |

Screens read: **38 of 38**. Screens with at least one finding: **21**. Screens
read clean: **17**. Screens not readable: **0**.

### Coverage

| # | Screen (file) | Status | Findings |
|---|---|---|---|
| 1 | Terms (`TermsScreen.tsx`) | read — issues found | S-007 |
| 2 | History (`HistoryScreen.tsx`) | read — issues found | S-021, S-024 |
| 3 | Help (`HelpScreen.tsx`) | read — issues found | S-017 |
| 4 | Stats (`StatsScreen.tsx`) | read — no issues found | — |
| 5 | Genre (`GenreScreen.tsx`) | read — no issues found | — |
| 6 | Splash (`SplashScreen.tsx`) | read — no issues found | — |
| 7 | Song (`SongScreen.tsx`) | read — no issues found | — |
| 8 | ShowsScreen (`ShowsScreen.tsx`) | read — issues found | S-018 |
| 9 | FolderBrowser (`FolderBrowserScreen.tsx`) | read — issues found | S-003 |
| 10 | Artist (`ArtistScreen.tsx`) | read — no issues found | — |
| 11 | DownloadsScreen (`DownloadsScreen.tsx`) | read — issues found | S-006, S-016, S-021 |
| 12 | ShowDetailScreen (`ShowDetailScreen.tsx`) | read — no issues found | — |
| 13 | AddToPlaylistScreen (`AddToPlaylistScreen.tsx`) | read — issues found | S-014 |
| 14 | AllAudio (`AllAudioScreen.tsx`) | read — issues found | S-013 |
| 15 | AllPlaylists (`AllPlaylistsScreen.tsx`) | read — no issues found | — |
| 16 | Credits (`CreditsScreen.tsx`) | read — no issues found | — |
| 17 | ArchiveItemDetailScreen (`ArchiveItemDetailScreen.tsx`) | read — issues found | S-010 |
| 18 | Settings (`SettingsScreen.tsx`) | read — issues found | S-005, S-022 |
| 19 | About (`AboutScreen.tsx`) | read — issues found | S-017 |
| 20 | Album (`AlbumScreen.tsx`) | read — issues found | S-019 |
| 21 | Changelog (`ChangelogScreen.tsx`) | read — no issues found | — |
| 22 | PlaylistDetail (`PlaylistDetailScreen.tsx`) | read — issues found | S-001, S-002, S-009 |
| 23 | AudioSettings (`AudioSettingsScreen.tsx`) | read — no issues found | — |
| 24 | AudiobookDetailScreen (`AudiobookDetailScreen.tsx`) | read — issues found | S-010 |
| 25 | AllVideos (`AllVideosScreen.tsx`) | read — issues found | S-013 |
| 26 | Bookmarks (`BookmarksScreen.tsx`) | read — no issues found | — |
| 27 | NowPlaying (`NowPlayingScreen.tsx`) | read — no issues found | — |
| 28 | Privacy (`PrivacyScreen.tsx`) | read — issues found | S-007 |
| 29 | RadioScreenNew (`RadioContent.tsx`) | read — issues found | S-011, S-023 |
| 30 | Search (`SearchScreen.tsx`) | read — issues found | S-012 |
| 31 | QueueScreen (`QueueScreen.tsx`) | read — issues found | S-015 |
| 32 | LinkedFolders (`LinkedFoldersScreen.tsx`) | read — issues found | S-012 |
| 33 | Profile (`ProfileScreen.tsx`) | read — issues found | S-004 |
| 34 | MusicDetailScreen (`MusicDetailScreen.tsx`) | read — no issues found | — |
| 35 | Licenses (`LicensesScreen.tsx`) | read — no issues found | — |
| 36 | MovieDetailScreen (`MovieDetailScreen.tsx`) | read — issues found | S-008, S-020 |
| 37 | Login (`LoginScreen.tsx`) | read — no issues found | — |
| 38 | LiveTVScreenNew (`LiveTVContent.tsx`) | read — issues found | S-011, S-023 |

Shared code read alongside the screens: `ScreenContainer`, `SettingsRow`,
`AccountSection`, `InternalHeader`, `useAnimatedEntrance`, `usePlaylistLaunch`,
`useResumeAwareLaunch`, `useMovieDetailScreen`, `useMusicDetailScreen`,
`useMoreFromArtist`, `useDownloadsScreen`, `downloadService`, `useRadioBrowser`,
`useQueueScreen`, `useAddToPlaylistScreen`, `useShowsScreen`,
`useSettingsScreen`, `m3uParser`, `timeAgo`, `theme/tokens.ts`,
`state/authStore.ts`, `state/mediaStore.ts`, `state/playerStore.ts`,
`navigation/RootNavigator.tsx`, `navigation/SettingsStack.tsx`.

---

## Findings

### S-001 · P1 · audio · PlaylistDetail — every playlist row shows a wrong duration — **OPEN**

**Defect.** The playlist row formatter treats `PlaylistItem.duration` as
milliseconds; the field is seconds everywhere else in the app.

**Evidence (source-proven).**
- `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx:524-530` — `const formatDuration = useCallback((ms: number) => { … const totalSec = Math.floor(ms / 1000); … })`.
- `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx:761` — the row renders `{formatDuration(item.duration)}`.
- `src/screens/AddToPlaylistScreen/hooks/useAddToPlaylistScreen.ts:137-142` — *"SECONDS, unconverted. `PlaylistItem.duration` is seconds everywhere else — the media store, the bookmarks store, the scanner, the queue — …"*.
- `src/state/mediaStore.ts:24-25` — `ScannedTrack.duration` is *"Duration in seconds"*.
- `src/infrastructure/player/useQueueSync.ts:94-96` — the queue is fed in *"SECONDS, which is the unit `ScannedTrack.duration` and `PlaylistItem.duration` both use."*
- `src/screens/QueueScreen/components/QueueScreen.tsx:57-62` — the queue screen's own formatter divides seconds (it divides by 60, never by 1000).

**Why it's a defect.** The value stored on a playlist item is seconds; this
formatter divides it by 1000 before rendering. A three-minute track is stored as
`180` → `Math.floor(180 / 1000)` → `0` → the row reads **`0:00`**. A 45-minute
track is stored as `2700` → `2` → **`0:02`**. Every duration on this screen is
wrong by roughly the size of the number itself.

**Impact.** The PlaylistDetail list — the one surface where the user checks how
long the things they assembled are — shows `0:00` on every row.

---

### S-002 · P1 · audio · PlaylistDetail + m3uParser — M3U export writes `#EXTINF:0`, and M3U import inflates the stored unit by 1000× — **OPEN**

**Defect.** The M3U writer and reader disagree with each other, and both
disagree with the app's own unit for `PlaylistItem.duration`.

**Evidence (source-proven).**
- `src/utils/m3uParser.ts:126` — `lines.push(\`#EXTINF:${Math.floor(item.duration / 1000)},${titleLine}\`);`
- `src/utils/m3uParser.ts:58,89` — the parser reads `#EXTINF:<seconds>` — the M3U format's unit is seconds.
- `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx:266` — `duration: e.duration > 0 ? e.duration * 1000 : 0` — the importer multiplies the parsed seconds by 1000.
- `src/screens/AddToPlaylistScreen/hooks/useAddToPlaylistScreen.ts:137-142` — the stored unit is seconds.

**Why it's a defect.** Export takes a seconds value and divides it by 1000, so
every exported entry is written as `#EXTINF:0` — the durations are gone before
the file leaves the device. Import takes a seconds value and multiplies it by
1000, so a third-party M3U's three-minute track is stored as `180000`, which
the app reads as 180 000 seconds — 50 hours. The two halves also cancel each
other out, which is why the corruption is invisible on a playlist that was
imported (the inflated value is what S-001's millisecond formatter happens to
render correctly) and glaring on a playlist that was assembled in the app.

**Impact.** Every M3U export carries zero durations; every M3U import stores a
duration 1000× too large. Both are silent — no error, no warning.

---

### S-003 · P1 · app-shell · FolderBrowser — tapping a folder in "Add local files" builds a relative path, so the folder never opens — **OPEN**

**Defect.** After entering a subfolder, the screen rebuilds the path from the
breadcrumb *names* only, and without an absolute `initialPath` that produces a
relative path that does not exist.

**Evidence (source-proven).**
- `src/screens/FolderBrowser/components/FolderBrowserScreen.tsx:100-107` — `currentPath`: with no breadcrumbs it returns `RNFS.ExternalStorageDirectoryPath`; otherwise, **only if `initialPath.startsWith('/')`** does it return `'/' + breadcrumbs.join('/')` — otherwise it returns `breadcrumbs.join('/')`, a relative path.
- `src/screens/FolderBrowser/components/FolderBrowserScreen.tsx:168-169` — `const folderName = folderPath.split('/').pop() || folderPath; setBreadcrumbs(prev => [...prev, folderName]);` — only the **name** is pushed, the parent path is dropped.
- `src/screens/FolderBrowser/components/FolderBrowserScreen.tsx:114` — `const entries = await RNFS.readDir(path);` — the read uses the path built above.
- `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx:151-153` — the only in-app entry point: `navigation.navigate('FolderBrowser', {targetPlaylistId: playlistId})` — **no `initialPath`**.

**Why it's a defect.** The route is entered with no `initialPath`, so
`initialPath` is `''` and `initialPath.startsWith('/')` is false. The first
listing is correct (`/storage/emulated/0`). The user taps a folder, say
`Movies`; `handleEnterFolder` pushes the name only, so the breadcrumbs become
`['Movies']` and `currentPath` becomes **`'Movies'`** — relative, not
`/storage/emulated/0/Movies`. `RNFS.readDir('Movies')` cannot resolve to the
folder the user tapped. The screen shows the error and a Retry that re-reads
the same broken path; only the "Home" breadcrumb recovers.

**Impact.** The primary flow of "Add local files" cannot descend into any
folder. The user sees an error toast on the first tap, with a Retry that is
guaranteed to fail again.

---

### S-004 · P1 · app-shell · Profile — the signed-out state is an empty card, and the destructive account rows are offered to a user with no session — **OPEN**

**Defect.** The Profile screen has no sign-in affordance at all, and renders
its Account section unconditionally.

**Evidence (source-proven).**
- `src/screens/Profile/components/ProfileScreen.tsx:62` — `const {user, isLoading, signIn, signOut, revokeAccess} = useAuth();` — **`signIn` and `isLoading` are never referenced again in the file** (the only other `useAuth` consumers are `signOut` at `:127` and `revokeAccess` at `:132`).
- `src/screens/Profile/components/ProfileScreen.tsx:186-201` — the header card renders `{user ? (<>…</>) : null}` — a signed-out user gets an **empty coloured card**.
- `src/screens/Profile/components/ProfileScreen.tsx:344-360` — the Account section ("Sign Out", "Revoke Google Access", "Clear Local Data") is rendered **unconditionally** — there is no `user ?` guard on the section or on any of the three rows.
- `src/screens/Profile/components/ProfileScreen.tsx:427-434` — `styles.signInBtn` and `styles.signInLabel` are defined and **referenced nowhere** — the styles of a sign-in button that is not rendered.
- `src/components/sections/AccountSection/AccountSection.tsx:34` — `if (!user) return null;` — the Settings account card disappears entirely when signed out, so Settings offers no sign-in either.

**Why it's a defect.** The file destructures `signIn` and keeps the styles for a
sign-in button, which is the code's own statement of what this screen is
supposed to offer; neither is wired. What *is* wired runs the other way: the
screen tells a user with no session that they can "Sign Out" and "Revoke
Google Access". Tapping "Sign Out" opens a confirm dialog whose only job is
to call `signOut()` on a session that does not exist.

**Impact.** A signed-out user who reaches Profile gets a blank card, no way to
sign in, and two account-destructive actions presented as live.

---

### S-005 · P1 · app-shell · Settings — a failed library refresh blanks the whole screen, and its "Retry" does not retry — **OPEN**

**Defect.** The refresh failure sets a local error flag that hides the entire
settings body; the only recovery is a transient toast whose "Retry" action
clears the flag without re-running the scan.

**Evidence (source-proven).**
- `src/screens/Settings/hooks/useSettingsScreen.ts:86` — `const [error, setError] = useState<string | null>(null);` — local state, not a store read.
- `src/screens/Settings/hooks/useSettingsScreen.ts:120-130` — the only writer: `onRefresh`'s `catch { setError('Failed to refresh the local library.'); }`.
- `src/screens/Settings/components/SettingsScreen.tsx:106` — `) : !error ? (` … `: null` — when `error` is set, **the whole ScrollView is replaced by `null`**; only the header survives.
- `src/screens/Settings/components/SettingsScreen.tsx:82-89` — the only way back: `toast.show(error, 'error', {duration: 8000, action: {label: 'Retry', onPress: () => setError(null)}})`.

**Why it's a defect.** `setError(null)` clears the flag and re-renders the
settings body; it does not call `startScan` again — the "Retry" label names an
action the handler does not perform. And the recovery control is a toast with an
8-second lifetime: once it expires, the screen is a header over an empty
background with no error text, no retry, and no content.

**Impact.** One failed pull-to-refresh can leave Settings permanently blank
until the user leaves and re-enters the screen.

---

### S-006 · P1 · app-shell · DownloadsScreen — a completed download's button says "Resume download" and silently restarts the whole download — **OPEN**

**Defect.** The row action treats every non-downloading, non-failed record as
paused, and the service's "resume" for a finished record wipes it and starts
over.

**Evidence (source-proven).**
- `src/screens/DownloadsScreen/components/DownloadsScreen.tsx:78-80` — `const active = record.status === 'downloading'; const paused = …; const failed = record.status === 'error';` — **there is no `done` case**.
- `src/screens/DownloadsScreen/components/DownloadsScreen.tsx:123-124` — `accessibilityLabel={failed ? 'Retry download' : active ? 'Pause download' : 'Resume download'}` — a `done` record falls into the `else` and is announced as "Resume download".
- `src/screens/DownloadsScreen/components/DownloadsScreen.tsx:127` — `name={failed || !active ? 'download' : 'pause'}` — a `done` record shows the download glyph.
- `src/screens/DownloadsScreen/hooks/useDownloadsScreen.ts:67-70` — `if (status === 'downloading') downloadService.pauseDownload(uri); else downloadService.resumeDownload(uri);`
- `src/services/downloadService.ts:484-496` — `resumeDownload` finds the record, and for anything that is not `'downloading'` does `updateRecord(uri, {status: 'downloading', received: 0, size: 0, error: undefined})` and then calls `startDownload` — **a full re-download from byte 0**. Its own docblock (`:481-483`) says it is for *"a paused download"*.

**Why it's a defect.** A finished download is a terminal state, but nothing in
the row or the handler knows that, so the button reaches `resumeDownload`,
which resets the record's `received`/`size` to zero and re-fetches the entire
payload. The control is presented as available and its label describes an
operation ("resume") that is not what happens.

**Impact.** One tap on a completed download discards its completed state and
re-downloads the whole file — bandwidth and data for a button that was labelled
as a resume.

---

### S-007 · P2 · app-shell · Terms + Privacy — both pages paint a fixed gold fill; in dark mode the body text is unreadable — **OPEN**

**Defect.** The two legal pages hard-code a light parchment fill and ignore
the theme, while their body text takes its colour from the theme.

**Evidence (source-proven).**
- `src/screens/Terms/components/TermsScreen.tsx:19` — `<View style={[StyleSheet.absoluteFill, {backgroundColor: '#D4B47A'}]} />`
- `src/screens/Privacy/components/PrivacyScreen.tsx:19` — the same line.
- `src/screens/Terms/components/TermsScreen.tsx:14` and `src/screens/Privacy/components/PrivacyScreen.tsx:14` — both destructure `useTheme()`'s `colors` and **never use it**: the theme is consulted and then ignored.
- `src/theme/tokens.ts:329` — dark theme `text.primary` = `'#EDEDED'`; `src/theme/tokens.ts:253` — light theme `text.primary` = `'#1A1A1C'`.
- The body text on both pages is rendered with `color="primary"`.

**Why it's a defect.** The fill is a constant; the text colour is not. In the
dark theme the body is `#EDEDED` on `#D4B47A` — a contrast ratio of about
**1.66 : 1**, against WCAG AA's 4.5 : 1. In the light theme the same pair is
about 8.7 : 1 and fine, which is why the page reads as acceptable in one theme
and is unusable in the other.

**Impact.** In the app's dark theme the Terms and Privacy pages are a bright
gold sheet with near-white text — effectively unreadable.

---

### S-008 · P2 · video · MovieDetailScreen — the hook exposes a retry and the screen never calls it — **OPEN**

**Defect.** The screen destructures `retry` and never uses it; the error state
offers no way to try again.

**Evidence (source-proven).**
- `src/screens/MovieDetailScreen/components/MovieDetailScreen.tsx:62` — `const {item, isLoading, error, retry} = useMovieDetailScreen(identifier);` — **`retry` appears nowhere else in the file**.
- `src/screens/MovieDetailScreen/components/MovieDetailScreen.tsx:145-157` — the error branch renders a `Placeholder` (`:148-154`) with a title and **no action, no button, no retry**.
- `src/screens/MovieDetailScreen/hooks/useMovieDetailScreen.ts:26-28` — `retry: () => { void q.refetch(); }`, written explicitly for this consumer.

**Why it's a defect.** The hook documents that the no-argument retry exists
*"for the consumer"*, and the consumer takes it and drops it. The `refetch`
capability is unreachable from the only screen that would use it, so a failed
movie load is a dead end: the user must back out and re-enter the screen.

**Impact.** A transient network failure on a film leaves the user staring at
an error card with no action on it.

---

### S-009 · P2 · audio · PlaylistDetail — single-track play from a playlist drops the artwork — **OPEN**

**Defect.** The one-track launch passes the artwork under a key the launch seam
does not read; the file's own comment says so, two hundred lines above it.

**Evidence (source-proven).**
- `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx:404` — `...(item.thumbnailPath ? {artworkUri: item.thumbnailPath} : {})`.
- `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx:185-189` — the same file's comment on the *playlist* path: *"`thumbnailPath`, not `artworkUri`. … `artworkUri` matched nothing — the artwork was forwarded onto the bridge and dropped with no error, which is why playlist launches had no notification artwork while every single-track launch did."*
- `src/infrastructure/player/useResumeAwareLaunch.ts:201` — `const {mediaKind, mediaLane, provider, thumbnailPath, ...bridgeOpts} = opts;` — `artworkUri` is **not** destructured, so it stays inside `bridgeOpts`.
- `src/infrastructure/player/useResumeAwareLaunch.ts:262` — the session's artwork is `...(thumbnailPath ? {thumbnailPath} : {})`.
- `src/infrastructure/player/useResumeAwareLaunch.ts:320` — the notification's artwork is `...(thumbnailPath ? {artworkPath: thumbnailPath} : {})`.

**Why it's a defect.** `thumbnailPath` is the only channel the seam reads, and
it is the only one that reaches the now-playing session or the media
notification. `artworkUri` is forwarded to the bridge as an unknown key and
dropped — the exact failure the file's own comment describes for the sibling
path, still present on this one.

**Impact.** Tapping a track *inside* a playlist launches with no artwork, while
the same track tapped from any other list has artwork. One screen, two
different keys for the same value.

---

### S-010 · P2 · audio · AudiobookDetailScreen + ArchiveItemDetailScreen — the chapter/track list is built and thrown away; the documented EOF auto-advance cannot happen — **OPEN**

**Defect.** Both screens map the full chapter/track list, never use the result,
and launch a single item.

**Evidence (source-proven).**
- `src/screens/AudiobookDetailScreen/components/AudiobookDetailScreen.tsx:99` — `const list = chapters.map(c => ({…}));` — **`list` is never read**; the launch that follows passes only `uri`, `title` and `type`.
- `src/screens/AudiobookDetailScreen/components/AudiobookDetailScreen.tsx:4-5` — the file's own header: *"Tap a chapter → AudioPlayer with the full chapter list so EOF auto-advances to the next chapter."*
- `src/screens/ArchiveItemDetailScreen/components/ArchiveItemDetailScreen.tsx:88` — `const list = tracks.map(t => ({…}));` — same shape, same discard.
- `src/screens/ArchiveItemDetailScreen/components/ArchiveItemDetailScreen.tsx:2-5` — the same header claim, *"so EOF auto-advance, cross-track resume via recents"*.

**Why it's a defect.** The launch goes through `openPlayer` (one item), so the
player never receives the remaining chapters. At the end of the tapped chapter
there is nothing queued to advance into. The mapped list is dead code that
reads exactly like a live feature — and the file header documents a behaviour
the code cannot deliver.

**Cross-reference.** This is the *run/queue* class of `B-046` / `F-056` (a
single-track launch that does not fill the run) in two screens the earlier fix
did not cover. `F-056` made `useQueueSync` replace a stale run with the live
item, so the queue is no longer *stale* — but it now holds exactly one item,
and the EOF-advance half of these two files' claims is still unmet. It is
listed here rather than folded into `F-056` because the dead `list` and the
false header claim are new, unreported instances.

**Impact.** An audiobook stops at the end of the tapped chapter; an archived
album stops at the end of the tapped track. Both screens promise otherwise in
their own header comments.

---

### S-011 · P2 · both · RadioContent + LiveTVContent — the error screen points at a Retry button that is not on the screen — **OPEN**

**Defect.** The failure placeholder tells the user to use a Retry at the
bottom of the screen; in the error state there is no bottom of the screen.

**Evidence (source-proven).**
- `src/screens/RadioScreenNew/components/RadioContent.tsx:278` — `message="Use Retry at the bottom of the screen to try again."`
- `src/screens/LiveTVScreenNew/components/LiveTVContent.tsx:307` — the same string.
- `src/screens/RadioScreenNew/components/RadioContent.tsx:274-279` and `src/screens/LiveTVScreenNew/components/LiveTVContent.tsx:303-308` — both are the **`Placeholder` in the error branch**, which replaces the list entirely.
- The Retry footer lives inside the FlatList's `ListFooterComponent` — a child of the list, which is not rendered in the error branch.
- The page-1 failure toast (with its own Retry action) is the only live retry, and it is transient.

**Why it's a defect.** The instruction names a control that only exists in a
state the user is not in. The control the user actually has is a toast that
auto-dismisses.

**Impact.** After the toast is gone, the error screen instructs the user to
tap something that is not there.

---

### S-012 · P2 · app-shell · SearchScreen + LinkedFoldersScreen — the error state and its Retry button can never be rendered — **OPEN**

**Defect.** Both screens keep an `error` state that nothing ever sets to a
non-null value, so their error branches and Retry buttons are unreachable.

**Evidence (source-proven).**
- `src/screens/Search/components/SearchScreen.tsx:152` — `const [error, setError] = useState<string | null>(null);`
- `src/screens/Search/components/SearchScreen.tsx:346` — `const handleRetry = useCallback(() => setError(null), []);` — **the only call to `setError` in the file**, and it sets `null`.
- `src/screens/Search/components/SearchScreen.tsx:514-525` — the error branch and its Retry button (`onPress={handleRetry}`) — unreachable, because `error` is permanently `null`.
- `src/screens/LinkedFolders/components/LinkedFoldersScreen.tsx:288` and `:326` — the identical shape (`setError` only ever called with `null`).
- `src/screens/LinkedFolders/components/LinkedFoldersScreen.tsx:410-417` — the error branch and its Retry button — unreachable.
- `src/screens/LinkedFolders/components/LinkedFoldersScreen.tsx:439` — `scrollEnabled={!error}` — always `true`, for the same reason.

**Why it's a defect.** `error` is initialised to `null` and the only writer
sets it back to `null`; there is no code path that can make it non-null. The
error surfaces are therefore not "rarely reached" — they are unreachable, and
the Retry buttons they contain can never be pressed.

**Impact.** Both screens advertise a failure-and-retry surface that cannot
appear. A genuine failure in either path has no user-visible error state at
all.

---

### S-013 · P2 · app-shell · AllAudioScreen + AllVideosScreen — `getItemLayout` describes a one-column list, but the grid renders two columns — **OPEN**

**Defect.** The grid list supplies a per-item height to `getItemLayout` while
rendering two items per row.

**Evidence (source-proven).**
- `src/screens/AllAudio/components/AllAudioScreen.tsx:205` — `numColumns={COLUMN_COUNT}` (2); `:209` — `getItemLayout={(_, index) => ({length: 76, offset: 76 * index, index})}`.
- `src/screens/AllVideos/components/AllVideosScreen.tsx:298` — `numColumns={COLUMN_COUNT}` (2); `:302` — the same `getItemLayout`.
- Both screens also carry the same `getItemLayout` on their single-column list (`:229` and `:322`).

**Why it's a defect.** With `numColumns > 1`, `getItemLayout`'s `length` must
be the height of a **row** — two items — not of one item. `76` is neither the
card's height (the 16:9 thumbnail plus the two text lines is roughly 155 dp)
nor a row height. Every offset in the list is therefore computed from the wrong
pitch, and `removeClippedSubviews` (both screens set it) makes the error
visible as blank cells during a fast scroll.

**Impact.** The grid's scroll geometry is wrong in both media browsers; rows
mis-place and the list shows gaps while scrolling.

---

### S-014 · P2 · app-shell · AddToPlaylistScreen — the screen draws its own header under the status bar — **OPEN**

**Defect.** The screen renders its own header but consumes only the bottom
inset.

**Evidence (source-proven).**
- `src/screens/AddToPlaylistScreen/components/AddToPlaylistScreen.tsx:333` — the root is a plain `<View style={styles.root}>` — no `SafeAreaView`, no `edges`, no top padding.
- `src/screens/AddToPlaylistScreen/components/AddToPlaylistScreen.tsx:138-141` — `styles.root` is `{flex: 1, backgroundColor: colors.background.primary}` — nothing offsets the status bar.
- `src/screens/AddToPlaylistScreen/components/AddToPlaylistScreen.tsx:334-337` — the header row (`BackButton` + title) is the first thing in that root.
- `insets` is consumed only for the bottom action bar.

**Why it's a defect.** Every other screen in the app that draws its own header
either uses `SafeAreaView` or pads by `insets.top`; this one does neither, so
the back chevron and the title start at the very top of the window.

**Impact.** On any device with a status bar or a notch, the Add-to-playlist
header sits under the system bar.

---

### S-015 · P2 · audio · QueueScreen — the row key omits the row's origin, so the same track listed twice collides — **OPEN**

**Defect.** The section list's key is built from the media identity only; the
up-next list can contain the same track twice, from two different sources.

**Evidence (source-proven).**
- `src/screens/QueueScreen/components/QueueScreen.tsx:46-55` — `queueEntryKey(item)` returns `[item.uri, item.source, item.type, item.mediaType, item.provider ?? '', item.folderId ?? ''].join('|')` — no origin, no index.
- `src/screens/QueueScreen/components/QueueScreen.tsx:512` — `keyExtractor={item => queueEntryKey(item)}` on a `SectionList`.
- `src/screens/QueueScreen/hooks/useQueueScreen.ts:127-130` — `upNextRows` is the lib queue's rows **concatenated with** the store playlist's rows (`[...queuedRows, ...playlistRows]`).

**Why it's a defect.** Playing a playlist puts the same items into the player
queue and into the store's playlist; the up-next list is built from both, so
the same track appears twice — and both copies hash to the same key, because
the key is derived only from the media fields. Two children of one SectionList
then share a key.

**Impact.** React warns about duplicate keys, and rows can mis-render or reuse
one another's state when the list updates.

---

### S-016 · P2 · app-shell · DownloadsScreen — the auto-delete policy chips stack vertically inside a row container — **OPEN**

**Defect.** A vertical list is placed inside a `flexDirection: 'row'` container.

**Evidence (source-proven).**
- `src/screens/DownloadsScreen/components/DownloadsScreen.tsx:262` — `<View style={styles.chipRow}>` … `:263-290` — a `<FlatList data={POLICY_OPTIONS} … />` with **no `horizontal` prop** and `scrollEnabled={false}`.
- `src/screens/DownloadsScreen/components/DownloadsScreen.tsx:369` — `chipRow: {flexDirection: 'row', gap: spacing.xs}`.
- `src/screens/DownloadsScreen/components/DownloadsScreen.tsx:31-37` — the five options: Off / 5 / 10 / 25 / 50.

**Why it's a defect.** A row container lays out its **children** in a row; the
only child here is a *vertical* FlatList, and a vertical list lays its items
out in a column. The five chips therefore stack one per line, and the "row"
grows to the height of five chips instead of holding one chip rail.

**Impact.** The auto-delete policy selector is a tall vertical stack where the
layout says it should be a single horizontal rail.

---

### S-017 · P3 · app-shell · AboutScreen + HelpScreen — external links swallow every failure — **OPEN**

**Defect.** `Linking.openURL` rejections are discarded with an empty catch.

**Evidence (source-proven).**
- `src/screens/About/components/AboutScreen.tsx:267` — `Linking.openURL(item.url).catch(() => {});`
- `src/screens/Help/components/HelpScreen.tsx:380` — `onPress={() => Linking.openURL(CONTACT_URL).catch(() => {})}`.

**Why it's a defect.** If no activity can handle the URL (no browser installed,
no mail client, a malformed `mailto:`), the promise rejects and the empty
catch discards it. The tap produces no navigation and no message — the control
is a silent no-op from the user's point of view.

**Impact.** "Rate on Play Store", "Report a Bug" and the Help contact card can
be dead taps with zero feedback, and the app's own `toast` is right there to
say so.

---

### S-018 · P3 · video · ShowsScreen — the "Airing Today" failure path is dead code — **OPEN**

**Defect.** The effect that was supposed to surface the rail's failure has an
empty body, and the hook's retry is never called.

**Evidence (source-proven).**
- `src/screens/ShowsScreen/components/ShowsScreen.tsx:72-73` — `todaysError, retryTodays,` are destructured from the hook.
- `src/screens/ShowsScreen/components/ShowsScreen.tsx:95-100` — the effect's body contains **only a comment** — no `setTodaysError`, no `retryTodays()` call, no toast.
- `src/screens/ShowsScreen/hooks/useShowsScreen.ts:148-150` — the hook exposes both `todaysError: todaysQ.error?.message ?? null` and `retryTodays: () => { void todaysQ.refetch(); }`.

**Why it's a defect.** The hook computes the error and hands over a retry; the
screen reads neither. `retryTodays` has no call site anywhere in the screen.

**Impact.** The "Airing Today" rail can fail with no error surface and no
retry, while the code that would have provided both sits unused in the screen.

---

### S-019 · P3 · audio · AlbumScreen — the entrance stagger indices are off by one — **OPEN**

**Defect.** Three groups are meant to stagger in; two of them share one
animation and the third style is never used.

**Evidence (source-proven).**
- `src/screens/Album/components/AlbumScreen.tsx:100` — the meta bar: `entrance.styles[0]`.
- `src/screens/Album/components/AlbumScreen.tsx:112-113` — the action row, whose comment says *"Action row (entrance 1)"*, is wired to `entrance.styles[0]`.
- `src/screens/Album/components/AlbumScreen.tsx:122-123` — the track list, whose comment says *"Track list (entrance 2)"*, is wired to `entrance.styles[1]`.
- `useAnimatedEntrance(3)` supplies indices 0, 1 and 2.
- The sibling screen does it correctly: `src/screens/Artist/components/ArtistScreen.tsx:203,235,250,258` — `styles[0]`, `[1]`, `[2]`, `[3]`.

**Why it's a defect.** The comments name one index and the code passes
another. The meta bar and the action row share the same animated value, so they
animate in unison rather than staggered, and `styles[2]` is dead.

**Impact.** The Album screen's entrance is a two-step animation with a dead
third slot, and its comments no longer describe the code.

---

### S-020 · P3 · video · MovieDetailScreen — `resizeMode` is written into a style object, where React Native ignores it — **OPEN**

**Defect.** The declared resize mode sits in a `StyleSheet` style rather than
on the `Image` as a prop.

**Evidence (source-proven).**
- `src/screens/MovieDetailScreen/components/MovieDetailScreen.tsx:530-532` — `heroImage: {…StyleSheet.absoluteFill, resizeMode: 'cover'}`.
- `src/screens/MovieDetailScreen/components/MovieDetailScreen.tsx:181-186` — the `Image` is rendered with `style={styles.heroImage}` and **no `resizeMode` prop**.
- `src/screens/MovieDetailScreen/components/MovieDetailScreen.tsx:180` — the comment claims *"`resizeMode="cover"` matches the previous 16:9 placeholder"* — describing code that does not run.
- Every sibling surface passes it as a prop: `src/screens/ShowDetailScreen/components/ShowDetailScreen.tsx:162`, `src/screens/ArchiveItemDetailScreen/components/ArchiveItemDetailScreen.tsx:272`, `src/screens/AudiobookDetailScreen/components/AudiobookDetailScreen.tsx:279`, `src/screens/MusicDetailScreen/components/MusicDetailScreen.tsx:320`.

**Why it's a defect.** `resizeMode` is an `Image` prop; React Native ignores
unknown keys in a style object. The image happens to look right only because
`Image`'s default resize mode is already `cover` — the declared behaviour is
not in force, and the comment above it describes a prop the file does not have.

**Impact.** Cosmetic today. The next person who changes the default, or
deletes the style key assuming it was doing something, gets an unexpected
result. The same mistake is present in `src/screens/Search/components/ResultTile.tsx:164-165` and `src/screens/Search/components/ResultListRow.tsx:75-76`.

---

### S-021 · P3 · app-shell · HistoryScreen + DownloadsScreen — touch targets below the 44 dp guideline — **OPEN**

**Defect.** Several small controls are well under the 44 dp minimum touch
target.

**Evidence (source-proven).**
- `src/screens/History/components/HistoryScreen.tsx:231-237` — the row's remove control: an 18 dp `SvgIcon` with `hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}` → an effective target of about **38 dp**.
- `src/screens/History/components/HistoryScreen.tsx:424-428` — `filterChip: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16}` — one caption line inside 7 dp of padding → about **30 dp** tall, and the chip's `TouchableOpacity` (`:285-297`) applies **no `hitSlop`**.
- `src/screens/History/components/HistoryScreen.tsx:257-265` — "Clear All": a caption line inside `hitSlop` 12 → about **36-40 dp**.
- `src/screens/DownloadsScreen/components/DownloadsScreen.tsx:398-405` — `actionBtn: {width: 34, height: 34}` → **34 dp**.

**Why it's a defect.** Each of these is a real, one-tap control (remove a
history entry, switch a filter, clear the history, pause/resume a download)
sized below the platform minimum, and two of them sit next to a destructive
action.

**Impact.** Harder to hit accurately; the history filter chips in particular
are the most-used control on that screen.

---

### S-022 · P3 · app-shell · SettingsScreen — "Accent Color" and "Version" are settings rows with no action — **OPEN**

**Defect.** Two rows are styled exactly like the interactive ones but have no
handler.

**Evidence (source-proven).**
- `src/screens/Settings/components/SettingsScreen.tsx:133` — `<SettingsRow label="Accent Color" description="Gold — Simba brand" />` — no `onPress`.
- `src/screens/Settings/components/SettingsScreen.tsx:338-341` — the "Version" row — no `onPress`.
- `src/components/utility/SettingsRow/SettingsRow.tsx:38-49` — when `onPress` is absent the component renders a plain `View`: not a button, and with no `accessibilityRole`.

**Why it's a defect.** The row is visually identical to the neighbouring rows
that *are* buttons, so the screen presents it as a setting the user can
change. Tapping it does nothing at all, and a screen reader announces it as
static text — the user is never told the accent colour is fixed.

**Impact.** A dead-looking row in the Appearance section; the app's own copy
says the accent is fixed, but the row offers no way to discover that.

---

### S-023 · P3 · both · RadioContent + LiveTVContent — the screen and the hook disagree about whether there is another page — **OPEN**

**Defect.** The screen computes "is there more?" from the row count; the hook
that fetches the next page knows the real answer.

**Evidence (source-proven).**
- `src/screens/RadioScreenNew/components/RadioContent.tsx:154` — `const hasMore = rows.length > 0 && rows.length % PAGE_SIZE === 0;`
- `src/screens/LiveTVScreenNew/components/LiveTVContent.tsx:154` — `const hasMore = rows.length > 0 && rows.length >= PAGE_SIZE;`
- `src/screens/RadioScreenNew/hooks/useRadioBrowser.ts` — the hook owns `stationsQ.hasNextPage`, and its `loadMore` returns early when there is no next page.

**Why it's a defect.** Two owners of one fact. When the total is an exact
multiple of the page size, the screen's arithmetic says "there is more" while
the hook's `hasNextPage` says there is not. The screen then calls `loadMore`
on every end-reach for a page that does not exist; the hook's guard is what
actually stops the request, so the cost is a wasted call rather than a loop.

**Impact.** The footer can offer "Could not load more — tap to retry" for a
list that is simply complete.

---

### S-024 · P3 · app-shell · HistoryScreen — pull-to-refresh does no work — **OPEN**

**Defect.** The refresh gesture pulses the spinner and stops.

**Evidence (source-proven).**
- `src/screens/History/components/HistoryScreen.tsx:78` — the comment: *"pull-to-refresh — local store data, so just pulse the spinner"*.
- `src/screens/History/components/HistoryScreen.tsx:80-83` — `setRefreshing(true); requestAnimationFrame(() => setRefreshing(false));`.
- The sibling screens do the real thing: `src/screens/AllAudio/hooks/useAllAudioScreen.ts:94-96` and `src/screens/AllVideos/hooks/useAllVideosScreen.ts:141-143` both call `startScan(true)`.

**Why it's a defect.** The gesture is the app's convention for "re-read the
library" on every other list screen. Here it starts a spinner and cancels it on
the next frame, so the user is shown a refresh that refreshes nothing.

**Impact.** Low — the history store is already live — but the gesture makes a
promise the code does not keep, and the difference from AllAudio/AllVideos is
invisible to the user.

---

## Cross-references to the existing register

Nothing already tracked is re-reported here. Two items touch an existing entry
and are recorded as cross-references rather than new bugs:

- **S-010** is the *run/queue* class of **B-046** / **F-056** (a single-track
  launch that does not fill the run) in two screens that fix did not cover —
  see the note under S-010 for what is genuinely new (the discarded `list` and
  the false EOF-advance claim in the two file headers).
- **S-009** is the `artworkUri` / `thumbnailPath` key confusion that
  `PlaylistDetailScreen.tsx:185-189` already documents for the *playlist*
  launch path. It is reported separately because the **single-track** path at
  `:404` was missed by that earlier fix and still ships.

Not re-reported, and deliberately so: the PiP chrome in the PiP window
(**B-050**), **B-052**, the SAF picker's accessibility tree (**B-018**) and the
album/artist render-crash surfaces — none of them were touched by this scan,
and no new instance of any of them was found.

## Not reported, by house rule

- **A missing `Alert.alert`.** The repo bans `Alert.alert`; its absence is
  the correct pattern, so no screen was faulted for not using one. (The
  legacy `Alert.alert` calls in six screens are lint-legal under the
  `src/screens/**` override in `.eslintrc.js` and were left alone.)
- **Raw colour literals, inline `style={{}}` objects, `no-void`, `no-console`.**
  These are ESLint rules, not defects.
- **The local media-player reference.** The app consumes
  `@simba-dev/react-native-media-player` from npm only.
- **Copy and i18n.** There is no localisation helper in this codebase —
  `react-native-localize` appears only in `src/utils/weatherLocale.ts` — so
  hard-coded user-visible strings are the house pattern, not a finding.

## Unverified / needs a device check

These were **not** promoted to findings because reading the source could not
settle them. Each states what would settle it.

1. **AboutScreen's link list may clip on short viewports.**
   `src/screens/About/components/AboutScreen.tsx:347-377` renders the nine
   link rows in a `FlatList` with `scrollEnabled={false}` and
   `initialNumToRender={LINK_ITEMS.length}` inside `styles.content`
   (`flex: 1`), below the logo block and the "Built with" row. If the content
   exceeds the available height, the tail rows ("Report a Bug", "Contact &
   Feedback") are clipped and the list cannot scroll — but the content height
   depends on the device, which no source read can settle.
   *Settle with:* one short-viewport device or emulator, dark and light.
2. **The RN "VirtualizedList should never be nested inside plain ScrollViews
   with the same orientation" warning.** Seven screens put a vertical `FlatList`
   inside a vertical `ScrollView`: Credits (`CreditsScreen.tsx:139` → `:150`),
   Changelog (`:149` → `:154`), Licenses (`:177` → `:188`), Stats (`:150` →
   `:192`), Genre (`:112` → `:131`), Help (`:293` → `:313`) and ShowDetailScreen
   (`:153` → `:246`). Several of those lists then nest a second `FlatList`
   inside the first (Help `:329`, Changelog `:167`, Genre `:178`/`:236`,
   Credits `:173`/`:182`, ShowDetailScreen `:254`).
   DownloadsScreen's policy chips are a different shape — a `FlatList` inside
   another `FlatList`'s `ListHeaderComponent` — but the same warning class.
   The warning is certain from the structure; whether it degrades anything on
   device is not.
   *Settle with:* one `adb logcat` run over each of those screens.
3. **Module-scope `Dimensions.get('window')`.** `AllAudioScreen.tsx:29`,
   `AllVideosScreen.tsx` (same shape), `MovieDetailScreen.tsx:56`,
   `LinkedFoldersScreen.tsx:34` and `LoginScreen.tsx:24` read the window size
   once at import time, so the derived card/hero sizes do not follow a
   rotation or a fold. The mechanism is certain; whether it is visible depends
   on whether the app is locked to portrait (`F-054` replaced the orientation
   locker with `commands.setOrientation('portrait')`, which would make the
   rotation case unreachable) — that lock's runtime behaviour was not
   verified here.
   *Settle with:* one rotation on a device with the lock disabled.
4. **The `FolderBrowser` row height versus `ITEM_HEIGHT`.**
   `FolderBrowserScreen.tsx:622` pairs `getItemLayout` with `ITEM_HEIGHT = 76`
   while the row style is `paddingVertical: 14` around a one-line title and a
   32 dp icon (≈48-50 dp). The offset map is therefore off by roughly half a
   row. The measurement is arithmetic on the styles, not a screenshot, and the
   visible effect (row drift while scrolling) was not confirmed.
   *Settle with:* one scroll of the folder list on a device.
5. **`QueueScreen`'s duplicate-key claim needs a reproduction, not just a
   reading (S-015).** The two sources of the up-next list are proven
   (`useQueueScreen.ts:127-130`), and so is the key's blindness to origin
   (`QueueScreen.tsx:46-55`); that the two lists actually hold the same track
   at the same time depends on the runtime state of the player queue and the
   store playlist.
   *Settle with:* play a playlist, open the Queue screen, and read the React
   duplicate-key warning.
