# SIMBA Player — V20 Deep Jugaad Audit

**Opened:** 2026-10-09
**Companion tracker:** `SIMBA_PLAYER_V20_JUGAAD_TRACKER.md`
**Brief:** *"find as many jugaad issues as you can and fix, which deviate from good app UI/UX
practice, and code practice."*

---

## 0. Method, and one correction worth keeping

Three read-only sweeps ran over `src/` while the APK was rebuilding. Their **narration**
was useful as a map, but narration is not evidence — several intermediate claims turned
out to be wrong.

> **Correction.** A sweep asserted that `ResumePromptContext` was "defined and exported but
> never provided", and that the resume dialog must therefore be coming from the library.
> That inference was wrong. `App.tsx:325` mounts
> `<ResumePromptContext.Provider value={promptResume}>`. I had grepped the symbol and
> missed the JSX. Had that gone into the tracker as a finding, it would have sent the next
> hour deleting a provider that is present and correct.
>
> The rule this re-confirms: **an agent's narration is a pointer, never a citation.** Every
> claim in this document and in the tracker was re-opened and read before it was written
> down. Where a claim could not be verified, it is marked `UNVERIFIED` rather than asserted.

Every claim below carries `file:line`. Where something genuinely does not exist, the
document says so rather than speculating.

---

## 1. The black screen — resolved, and it was two bugs wearing one coat

### 1a. The audio black screen

Symptom: tapping a podcast episode opened `PlayerActivity` and rendered **video chrome**
(`video-header-back`, `transport-playpause`, `pip-toggle`, `video-header-lock`) for a
podcast. A black screen.

Two independent causes had to both be fixed before audio could play:

**Cause 1 — stale Metro transform cache.** `usePlayerActivity.ts` sits at the *same path*
in 1.12.0 and 1.13.0. Metro served the cached pre-fork module, so the `opts.type === 'audio'`
branch never ran. Fixed by `npx react-native start --reset-cache`.

**Cause 2 — a stale native binary, which is the real one.** After the cache reset the audio
chrome rendered correctly but **nothing played**:

```
TypeError: undefined is not a function
```

over 14,101 logcat lines containing **zero** occurrences of `startAudioPlayback`,
`MpvBridgeModule` or `MediaPlaybackService`. Meanwhile:

| | |
| --- | --- |
| `node_modules` lib version | **1.13.0** |
| `fun startAudioPlayback` | present at `MpvBridgeModule.kt:1969` |
| `app-debug.apk` `LastWriteTime` | **08-10-2026 14:24:26** — built *before* the install |

Fresh JS calling a method the old binary never had. **The fix was a rebuild, not a shim.**
A JS fallback that caught the missing method would have left a permanently broken binary
behind a green checkmark — precisely the failure mode this audit exists to remove.

After rebuild (`LastWriteTime 09-10-2026 12:29:39`) + install:

- `topResumedActivity = com.simba.player/.MainActivity` — the launch never leaves the task
- `PlayerActivity` occurrences in the activity dump: **0**
- In-app chrome present: `audio-minimize`, `audio-close`, `audio-shuffle`, `audio-previous`,
  `audio-playpause`, `audio-next`, `audio-repeat`

### 1b. The video black screen — still open

Video renders black while position advances. **Cause not yet established.** The competing
explanations are an emulator SurfaceView capture limitation versus a real render defect, and
they are not distinguishable from a screenshot. No code should be written until one physical
device or MediaCodec-level observation separates them. Guessing here risks "fixing" a
capture artefact by damaging working code.

---

## 2. The resume prompt

Location: `App.tsx:278-298` (`promptResume`), provided via `ResumePromptContext.Provider`
at `App.tsx:325`, rendered through `useConfirmDialog` → `ConfirmDialog` → `Dialog`.

### 2a. Ordering — correct, contrary to the report

The seam awaits the prompt **before** the launch:

```
useResumeAwarePlayerActivity.ts:204-208
  const choice =
    plan.kind === 'prompt' && promptResume
      ? await promptResume(plan.candidate)     // ← user answers here
      : undefined;
  const startPositionMs = resolvePlanStartMs(plan, choice);

useResumeAwarePlayerActivity.ts:212
  beginSession({...});                          // ← only now
```

`beginSession` is deliberately after the await, and its own comment (`App.tsx`, seam line
210) records the reason: a rejected launch must not leave a "now playing" entry for media
that never started.

**However** — there are **two other resume entry points** that do *not* go through the seam
and therefore do *not* prompt at all:
- `usePlayWithResume` (`src/infrastructure/player/`) — the lib's own lookup
- `useOpenPlaylist` — the lib's `useOpenWithResume`, bypassing the app seam entirely

So the *observed* "prompt after playback starts" is not explained by this seam. It needs one
device reproduction against a **video** launch specifically. Audio was verified to prompt
first-hand and correctly. Recorded as `UNVERIFIED` rather than guessed.

### 2b. Auto-dismiss — correction to an earlier claim in this document

> **Retracted.** This section previously read *"the spec's 'auto-dismisses after
> 8 s' is itself questionable and should **not** be implemented as written."* That
> was me over-reading the complaint. The user clarified: auto-hiding the resume
> card after a period of no interaction **is** the industry approach and is
> wanted. Netflix, YouTube and Plex all dismiss it.
>
> What was objected to was never the auto-hide. It was that the card appeared
> **after playback had already started**, so it read as a post-hoc
> interruption rather than a choice made before anything played.

So the real defects are:

**The dismissal target is wrong, not the dismissal itself.** `App.tsx:293-297`
records: *"Dismissing the dialog resolves `false` too, and that maps to start
from the beginning."* So a card that auto-hides — no tap, no decision, just a
timeout — **restarts the media from zero and destroys the exact resume point
the card was offering to restore.**

The V19 spec (`md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md:604-611`) says the
opposite: *"Auto-dismisses after 8 s; **default action is Resume**."* The spec is
right and the implementation inverted it. A timeout must never be a
**destructive** default — Netflix, YouTube and Plex all resolve a dismissed
resume card to *continue*, never to restart.

**There is still no timer.** Swept `ConfirmDialog.tsx` (103 lines) and
`Dialog.tsx` (281 lines) in full — neither contains a `setTimeout`, auto-hide,
or dismiss-after. So the auto-close that was observed remains unexplained by
code. An `ActivityShell` remount would clear `useConfirmDialog`'s state and
make the card vanish with its promise unresolved — a hypothesis, untested,
recorded as such rather than asserted.

**Target behaviour:** card appears **before** playback, shows artwork, offers
two buttons, and after ~8 s of no interaction resolves to **Continue** — never
to restart.

### 2c. No screenshot — structural, and real

`Dialog.tsx` accepts `children` (`:34`) but `ConfirmDialog` **never passes any**
(`ConfirmDialog.tsx:44-52`), and `ConfirmDialogProps` has no image field at all
(`:10-19`). `promptResume` supplies only `title` + `message` + two labels (`App.tsx:284-292`).

So a screenshot cannot appear without a new component. The generic confirm dialog is the
wrong tool: this prompt needs artwork, a timecode, and a resume-vs-restart choice.

**Shipping precedent for the target shape** (these are not invented):
- **Plex** — resume cards show the title's own artwork/still above the choice
- **Netflix** — resume row carries the title art; "Play from beginning" is the secondary action
- **YouTube** — "Resume watching" affordance on the video card, art-forward
- **Kodi** — "Resume from hh:mm:ss" alongside "Play from beginning" (already cited in the
  `App.tsx:267-272` comment)

The app's **own** V19 spec (`md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md:604-611`) already
specified this — *"a centered card with a thumbnail … Auto-dismisses after 8 s; default action
is Resume"* — and `SmartResumePrompt.tsx` is listed as **not created** in
`md/SIMBA_PLAYER_MODULE_V19_TRACKER.md:870`. So this was specified, never built, and the
generic dialog quietly stood in for it.

Note that the spec's *"auto-dismisses after 8 s"* is itself questionable and should **not**
be implemented as written: silently choosing an action for the user is worse than waiting.

---

## 3. Artwork — why recents, bookmarks and the audio player are all blank

### 3a. What works, and the contrast that proves the bug

The **Followed Podcasts** rail renders real artwork via `FastImage` reading `podcast.image`.
The **Recently Played** rail and **Bookmarks** rail render a grey circle with a generic play
glyph. Same screen, same image loader, same network. **So image rendering is not broken —
the recents/bookmarks data path simply has no URL to render.**

Both broken rails feed `MediaRailCard` an `imageUri={resumeThumbnailPath || thumbnailPath}`.
Both fields are empty. `MediaRailCard.tsx:85` then picks its badge glyph from `lane`, which
is why the placeholder and the wrong badge appear together.

### 3b. A real frame-capture capability already exists — and is used once

`captureFrame` exists, returns an **absolute local JPEG path**, and is invoked on player
teardown. So frame capture is not missing infrastructure.

The gate is upstream of it: both writers
(`usePlaybackCheckpointSync`, `useBookmarkToggle`) are **gated on `session.thumbnailPath`**,
and only one writer calls `begin()` — the launch seam `useResumeAwarePlayerActivity.ts`.
So the question is what the seam puts in `thumbnailPath`.

**The podcast play path passes no artwork at all**, even though the episode object carries an
image field. That single omission is why the audio player shows "No artwork" for a podcast
whose own artwork renders two rails away on the same screen.

`resumeThumbnailPath` is declared on the recent-history entry and **read** by the rail, but
no code writes a non-empty value. A field that is persisted, read, and never written is the
definition of a placeholder — it should either be implemented or removed.

### 3c. Artwork is a URL, artwork is a path

The seam forwards a **catalogue URL** into `artworkPath`, while `captureFrame` produces a
**local file path**. The library's contract for `artworkPath` accepts `http(s)` URLs, so
this works — but it means the same field carries two different kinds of value depending on
the source. That is the kind of ambiguity that produces a blank image six months from now.

---

## 4. The audio player's missing controls — validated, not invented

The user asked for volume, mute and a queue. Per the standing rule, each must be traceable
to a shipping app. All three are, and one is validated *inside this codebase*:

> **`src/screens/HelpScreen.tsx:79` already tells users:** *"Open any song or video, tap the
> **queue/list icon**, then 'Add to playlist'."*
> **No queue or list icon exists in either player.** The help text is the specification; the
> UI is the missing work. This is the strongest possible evidence that the control is owed
> and was lost.

Precedent: **Spotify** (queue button + volume in now-playing), **Apple Music** (queue +
volume), **Plex** (queue in the player), **YouTube Music** (queue + volume), **VLC** (playlist
+ volume), **Huawei Video / Tencent Video** (queue + volume in the player drawer).

**Nothing needs to be invented — everything already exists:**

| Need | Exists at | Notes |
| --- | --- | --- |
| Volume + mute UI | `src/components/player/video/TransportBar/VolumeControl.tsx` | **zero props** — pulls all state from `useTransport()`. Generic in logic, video-specific in size. |
| Volume state | `useTransport.ts:174` `volume`, `:176` `isMuted` | already plumbed |
| Volume commands | `useTransport.ts:223` `setVolume`, `:233` `setMuted` | already plumbed |
| Native volume | `types/player.ts:70-73` (readable), `:175-180` (writable) | readable **and** writable |
| Queue route | `RootNavigator.tsx:272-275`, screen exists | already registered |
| Glyphs | `SvgIcon.tsx:120-121` `volume`/`volumeMute`, `:128-129` `listMusic`/`list` | already in the icon registry |

Three defects to fix in that area:

- `VolumeControl.tsx:171` — slider hit area is **40px tall**, below the 44px floor. Raise to 44
  before reusing in portrait audio.
- `useTransport.ts:223` **and** `:260` — `setVolume` declared **twice** in `TransportCommands`,
  with two conflicting "since" comments. TypeScript permits duplicate interface members, so
  it compiles silently and will drift.
- The web/no-native shim (`MpvPlayerModule.ts:594-602`) makes `getVolume()` return `100` and
  `getMuted()` return `false`. A volume control would therefore *look* functional and do
  nothing in web preview. New volume UI must be able to signal that state.

### The queue has three competing sources — and they disagree

| # | Source | Written by | Read by |
| --- | --- | --- | --- |
| 1 | lib `usePlayerQueueStore.queue` | `useQueue()`, 7 screens | `QueueScreen` |
| 2 | app `usePlayerStore.playlist` | `useQueueSync` (partial) | `QueueScreen` |
| 3 | mpv engine `playlist` + `currentIndex` | mpv / `useOpenPlaylist` | `canGoPrev` / `canGoNext` |

`QueueScreen` renders **#1 + #2**. The Next button acts on **#3**. They will disagree,
because #2 is fed a phantom entry: `useQueueSync.ts:101-108` writes
`uri: ''`, `duration: 0`, and **hardcodes `source:'local'`, `type:'audio'`, `mediaType:'audio'`
for *any* launch, including video.**

The file's comments admit the empty `uri`. They do **not** admit the lane mislabelling,
which is the more damaging half: it writes "this is audio" about a film.

`TransportState` exposes only `currentUri` and `nextTrack` (`useTransport.ts:610-614`) — it
does **not** expose `playlist` or `currentIndex`, so a queue UI cannot be built on the facade
today without adding them first.

---

## 5. Identity: why a Turkish film shows a music note

Full detail in the tracker's badge-chain diagram. The load-bearing facts:

1. `src/types/media.ts:76-77` — a missing `type` **and** missing `mediaType` **both default
   to `'audio'`**.
2. Only **4 of 31** launch sites pass any identity field. The other 27 are silently retagged
   audio by that default.
3. `src/features/bookmarks/index.ts:139-140` defaults **the same omitted fields to
   `'video'`**, and `useBookmarkToggle.ts:127,132` does too. One field, two opposite answers,
   both persisted.
4. Every badge consumer reads `mediaType`, never `type`. So fixing the *kind* alone would
   change nothing visible — the lane is the broken field.

The fix belongs in the seam, not the card: `bridgeOpts.type` is already `'video' | 'audio'`
at **every** launch site and is currently discarded.

---

## 6. Launch routing — audio must open audio

- `openPlaylist` bypasses the app seam (lib's `useOpenPlaylist` → lib's `usePlayerActivity`):
  no `beginSession`, no `expandAudioPlayer()`, no lane recorded. **P0.**
- `resolveStreamType('episode')` → `'video'`. A podcast episode is audio. No caller passes
  it today — a loaded gun.
- `'archive-video'` is a valid `MediaKind` but is **absent** from the library's video branch,
  so it falls through to `default → 'audio'`.
- `HistoryScreen.tsx:99` — `mediaType ?? 'video'` inverts the safe default.
- `fileService.ts:58` — unknown extension → `'video'`, consumed un-wrapped at
  `FolderBrowserScreen.tsx:190`. `.opus`, `.m4b`, `.aac`, `.oga` open a video window.
- `QueueScreen.ts:197`, `useHomeScreen.ts:187` — `?? 'video'` fallbacks.
- `usePlaybackCheckpointSync.ts:87-97` drops `source` and `folderId`.

---

## 7. Dead and placeholder code

Every "0 call sites" below was confirmed by an actual grep over `src/`.

| File | Lines | Call sites | Note |
| --- | --- | --- | --- |
| `player/AudioLyricsView/AudioLyricsView.tsx` | 525 | **0** | largest dead file in the audio tree |
| `player/AudioVisualizer/AudioVisualizer.tsx` | 143 | **0** | yet `ChangelogScreen.tsx:41` advertises a "waveform visualizer" |
| `screens/NowPlaying/.../NowPlayingScreen.tsx` | 64 | 1 | `return null` at `:61`; a routed deep-link sink |
| 13 × `related/textContent.ts` + `types/textContent.ts` | ~250 | **0** | incl. `homeTextContent`, orphaned *by its own barrel* |
| `useQueueScreen.ts:73-74` | in-file | 0 uses | `navigation` destructured, never read; leaves holes in 3 dep arrays |

**Not problems, recorded so nobody re-litigates them:**
- **Zero empty `catch {}` blocks in `src/`.** Swept. The only match was a *comment* describing
  an already-fixed one.
- No third-party OS-control packages. `package.json` has exactly one slider
  (`@react-native-community/slider`, a generic UI widget). Brightness and volume both route
  through the library facade, as required.

**Copy that lies:**
- `HelpScreen.tsx:79` — advertises the queue/list icon that does not exist. *(The copy is right;
  the UI is missing.)*
- `ChangelogScreen.tsx:41` — advertises a waveform visualizer with 0 call sites.
- `useSongScreen.ts:229` — `handleViewFullLyrics` opens the **player**, not lyrics.
- `recentHistoryStore.ts:112` — comment says "20-item cap"; the cap is 10.

**Touch targets:** every interactive element in the new audio player is ≥44px. The one
violation is `VolumeControl.tsx:171` at 40px.

---

## Carried forward

Enumerated individually, per standing preference.

1. Video black screen — cause unestablished; emulator SurfaceView capture limit vs real
   defect is unresolved. **Do not write code for it yet.**
2. Resume prompt ordering on a **video** launch — the seam is provably correct for audio;
   the video path is unverified.
3. Resume prompt "auto-close" — **no timer exists** in either dialog file. Remount is a
   hypothesis. Untested.
4. Resume card with screenshot — needs a new component; the generic `Dialog` has no image slot.
5. `resumeThumbnailPath` — declared, read, never written. Implement or delete.
6. `captureFrame` — real capability, one caller; confirm the wiring for audio episodes.
7. Artwork URL vs artwork path — one field, two value kinds.
8. Volume + mute + queue — all three owed, all three buildable from existing components.
9. `VolumeControl.tsx:171` — 40px slider, below the 44 floor.
10. `useTransport.ts:223`/`:260` — duplicate `setVolume` declaration.
11. Three competing queue sources; `QueueScreen` and the Next button can disagree.
12. `TransportState` exposes no playlist/index — a queue UI needs them first.
13. `useQueueSync.ts:101-108` — phantom `uri:''` **and** hardcoded audio lane for video.
14. `media.ts:76-77` audio default — the movie music-note root cause.
15. `features/bookmarks/index.ts:139-140` + `useBookmarkToggle.ts:127,132` — conflicting video default.
16. 27 of 31 launch sites record no identity field.
17. `openPlaylist` bypasses the app seam — no `beginSession`, no `expandAudioPlayer`.
18. `resolveStreamType('episode')` → `'video'`; `'archive-video'` missing from the video branch.
19. `HistoryScreen.tsx:99`, `fileService.ts:58`, `QueueScreen.ts:197`, `useHomeScreen.ts:187` — video-default fallbacks.
20. `usePlaybackCheckpointSync.ts` drops `source` and `folderId`.
21. Dead code: `AudioLyricsView` (525), `AudioVisualizer` (143), 13 × `textContent.ts`, `types/textContent.ts`.
22. `NowPlayingScreen` — routed `return null`.
23. `useQueueScreen.ts:73-74` — unused `navigation` + holed dep arrays.
24. `useSongScreen.ts:229` — `handleViewFullLyrics` name lie.
25. `HelpScreen.tsx:79` + `ChangelogScreen.tsx:41` — copy advertising unbuilt features.
26. `recentHistoryStore.ts:112` — wrong cap in comment.
27. **Device proof needed** — does `useQueueSync` now observe audio sessions, post-no-Activity?
    `App.tsx:306-307` and `AudioPlayer.tsx:11-13` contradict each other.
28. **Device proof needed** — does the library's `onVolumeChanged` fire on Android?
29. **Open risk** — the web/no-native shim makes volume read 100 and mute read false.
30. Argent 0.25.0 → 0.27.0 update pending, **not applied**, needs explicit consent.