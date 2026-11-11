# PROFILE_SETTINGS_MERGE — the Profile and the Settings page are ONE page

**Date:** 2026-11-11
**Status:** approved by the owner; implemented in this wave (design → code)
**Supersedes:** nothing. **Amends:** `md/CONTENT_OWNERSHIP.md` §2 (the owner model),
`md/PROFILE_RC1_REFACTOR.md` §13 (the Profile's inventory).

---

## 1. The ask

> "now profile seems too less, merge settings to profile else it will feel too less"
>
> "after merging proceed , no need to ask"

The Profile was thin. The Settings page held the preferences. Two pages for one
person, split by a row of content that belongs together.

---

## 2. What "too less" measured

Not a taste judgement — a row count, read out of the app's own source and
confirmed on `emulator-5554` (1080×2400 @ 420 dp).

### The Profile, before this wave

`src/screens/Profile/components/ProfileScreen.tsx` (the R1 rewrite) drew:

| Block | Rows |
|---|---|
| identity (avatar, name, email) | — |
| "Your Library" + the count line | 1 + 6 rows |
| "Activity" | 1 row |
| "Account" | 3 rows (or 1 "Sign in") |

**10 rows in 3 groups**, and six of the ten rows repeated a rail Home already
carries (the duplication map is in `md/CONTENT_OWNERSHIP.md`).

### The Settings page, before this wave

`src/screens/Settings/components/SettingsScreen.tsx` drew:

| Group | Rows |
|---|---|
| the account card (`AccountSection`) | — |
| Appearance | 2 |
| Library | 2 |
| Discover | 7 |
| Playback | 6 |
| Subtitles | 4 |
| About | 7 |

**28 rows in 7 groups**, plus five dialogs.

So the app had 38 preference/account rows split across two pages that a user
opens together, and the page that held the preferences was reachable only
through a 18 dp gear in the Profile's header.

### The merged page

**21 rows in 9 groups** — the Profile's identity and account, plus every
preference the Settings page owned, in one scroll.

---

## 3. The decision

**One route. `Profile`.** The `Settings` screen, its route and its props type
are deleted; the merged screen IS the Profile.

The alternative — keeping a `Settings` screen that renders the same rows — is
exactly the duplication this whole wave exists to kill: two owners for one
page, and the user has to learn which of the two is "the real one".

### Why the Profile and not the other way round

The ownership model (`md/CONTENT_OWNERSHIP.md`) is **Home › Profile › Settings**:
each page owns content nothing else owns. This wave dissolves the third level
into the second rather than the first, because:

* **Home is Home.** It is the thing the app opens on, and it must not grow
  preferences — a settings list on the Home tab is what the old VLC-era
  Android apps did, and it is the reason Home feels like a launcher.
* **The Profile is already "you".** Identity, activity, the account actions
  and the app's own pages are all "you" — the things that are about the person
  using the app. A theme, a subtitle size and a hardware-acceleration switch
  are about the same person, on the same device. They belong on the same page.

### The deep-link contract is kept

`simbaplayer://settings` must still resolve — it is a published URL. The
Profile takes the path `profile` and an **alias** of `settings`:

```ts
Profile: {path: 'profile', alias: ['settings']},
```

Every sibling path (`settings/about`, `settings/privacy`, `settings/help`,
`settings/folders/:type`, `settings/folder-wizard/:type`, `settings/audio`,
`settings/equalizer`, `settings/changelog`, `settings/licenses`,
`settings/credits`, `settings/terms`) stays on its own existing root route.
Only the bare `settings` moves.

**Proven, not assumed.** A probe against the installed `@react-navigation/core`
7.22.1 (`getStateFromPath`) resolved:

| URL | Route |
|---|---|
| `/profile` | `Profile` |
| `/settings` | `Profile` ← the alias |
| `/settings/about` | `About` |
| `/settings/audio` | `AudioSettings` |
| `/settings/help` | `Help` |
| `/settings/folders/audio` | `LinkedFolders {type: 'audio'}` |
| `/settings/folder-wizard/video` | `FolderLinkingWizard {type: 'video'}` |

`alias` is a supported `PathConfig` field (`@react-navigation/core/src/types.tsx:1318`).
Alias configs are pushed **after** the main config (`getStateFromPath.tsx:584-633`)
and the match is sorted by segment count, so the more specific `settings/…`
siblings win over the bare `settings` alias.

> Honest scope note: `simbaplayer://` deep links do not open the app on
> Android at all — there is no manifest intent-filter (defect **CF-01**, still
> open). The alias fixes the *linking config*; CF-01 is what stops the OS from
> handing the URL to the app.

---

## 4. The merged Profile — row by row

Board order, top to bottom. **9 groups, 21 rows.**

### Identity (unboxed)

Avatar, name, email. The V2 grammar's rule — no card around it.

### Activity — 1 row

| Row | Goes to | Notes |
|---|---|---|
| Playback statistics | `Stats` | Stats is reachable from nowhere else in the app; this row is its single door. |

### Appearance — 1 row

| Row | Goes to | Notes |
|---|---|---|
| Theme | `ThemePickerDialog` | Description = the current mode ("System" / "Light" / "Dark"). |

> **The "Accent Color — Gold — Simba brand" row is deleted.**
> `SettingsScreen.tsx:131` drew it with **no `onPress`** — a setting that
> cannot be changed. `useSettingsStore` has no accent field at all
> (`settingsStore.ts:150-190`): gold is the app's only accent and is not a
> preference. The old Penpot board's own comment said it "is gone rather than
> kept as a decoration" while the drawing still drew it — that contradiction
> is closed here, in both the board and the code.

### Playback — 6 rows

| Row | Control | Notes |
|---|---|---|
| Hardware acceleration | switch | `isHardwareAccelerationEnabled`, default **on** |
| Audio normalization | switch | `isAudioNormalizationEnabled`, default off |
| Dialogue boost | switch | `isDialogueBoostEnabled`, default off |
| Skip silence | switch + description | `skipSilenceEnabled`, default off |
| Subtitle language | row → `SubtitleLanguageDialog` | Description = the preferred languages |
| Audio settings | row | `AudioSettings` → Equalizer |

### Subtitles — 4 rows

| Row | Control | Notes |
|---|---|---|
| Font size | row → `SubtitleStyleDialog` | "Small" / "Medium" / "Large" / "Extra Large" |
| Text color | row → `SubtitleStyleDialog` | The description carries the colour swatch |
| Background opacity | row → `SubtitleStyleDialog` | "None" / "Light" / "Medium" / "Heavy" |
| Auto-load subtitles | switch | `isAutoLoadSubtitlesEnabled`, default **on** |

### Library — 2 rows

| Row | Goes to | Notes |
|---|---|---|
| Linked folders | `LinkedFoldersDialog` → `LinkedFolders` | Description = "None" / "N folders" |
| MPV options | `MpvConfigEditor` | Description = "Default" / "N options set" |

### Account — 3 rows

| Row | Action | Notes |
|---|---|---|
| Sign out | `ConfirmDialog` | The ONE red row. |
| Revoke Google access | `ConfirmDialog` | |
| Clear local data | `ConfirmDialog` | |

Signed out, the group is a single **Sign in** row.

### Support — 2 rows

| Row | Goes to | Notes |
|---|---|---|
| Help | `Help` | |
| About Simba | `About` | The About page keeps the hub: version, credits, changelog, licences, privacy, terms. |

### Reset — 1 row

| Row | Action | Notes |
|---|---|---|
| Reset preferences | `ConfirmDialog` | See §6. |

### What does NOT come across

| Settings row | Why it stays out |
|---|---|
| Discover — Movies, Podcasts, Music, Live TV, Live Radio, Audiobooks, Archives | All seven already sit on Home's Explore Contents rail. A second list of the same seven is the repetition this wave removes. |
| About — Version | The About page owns the version, and the version is currently a hardcoded string there (defect in R3). |
| About — About Simba, Credits, Changelog, Help, Licenses | The About page's own link list is the hub. Each of those pages keeps exactly ONE door. |
| the account card (`AccountSection`) | It drew the Profile's identity block again, and tapping it opened the Profile. |
| pull-to-refresh rescan | The Library page owns the rescan (`useLibraryScreen.ts` → `handleRefresh` → `startScan`). |
| the entrance animation | Settings' seven-section stagger is a Settings-only flourish; the Profile's grammar is the quiet Cormorant divider. |

**No page loses its only door.** Every route that lost a row here still has a
door somewhere: the catalogue on Home, the legal pages on About, the folders
on the merged Profile, the rescan on the Library.

---

## 5. The header

**The gear is deleted.** It would open the page you are already on. The
Profile's header is now the title and nothing else.

The app's `InternalHeader` renders a 36 dp `rightSpacer` when `rightAction` is
absent (`InternalHeader.tsx:151-157`), so the header keeps its geometry.

---

## 6. Two false statements this merge forced into the open

### "Reset preferences" was not resetting preferences

`useSettingsStore.reset()` is `set({...initialState})` (`settingsStore.ts:350`),
and `initialState` carries `videoFolders: []` and `audioFolders: []`
(`settingsStore.ts:179-181`). **The old dialog said "Linked folders, local
media, downloads, and personal items will be preserved" — and the linked
folders were not preserved.** The row is named "preferences"; a folder link is
not a preference.

**Fix:** a new `resetPreferences()` action on the store restores every
preference to its default and **keeps** `videoFolders`, `audioFolders`,
`linkedFolders` and `lastScanTimestamp`. The dialog message now matches the
behaviour instead of promising something the code never did.

### The Help FAQ pointed at a page that will not exist

`HelpScreen.tsx` told the user to "Open Settings → Linked Folders" (:35), to
"Try Settings → Audio & Playback → Hardware acceleration" (:69), and pointed at
four preferences that **have no UI at all** — `appLanguage`, `largerControls`,
`highContrastSubtitles`, `notificationsEnabled` (:115, :119, :65).

The Penpot Help board had already been cut to three sections of two questions
each, with the note that "the answers that point at a setting with no UI are
gone". The code was never brought in line.

**Fix:** the FAQ becomes the board's three sections, and every answer is true
of the merged app.

---

## 7. The code changes, file by file

| File | Change |
|---|---|
| `src/screens/Profile/components/ProfileScreen.tsx` | rewritten as the merged screen |
| `src/screens/Profile/hooks/useProfileScreen.ts` | **new** — the merged state hook (the Profile's counts + every preference + the five dialogs' visibility) |
| `src/screens/Profile/components/{ThemePickerDialog,SubtitleLanguageDialog,SubtitleStyleDialog,MpvConfigEditor,LinkedFoldersDialog}.tsx` | moved from `src/screens/Settings/components/` |
| `src/screens/Settings/**` | deleted (screen, hook, types, index, the five dialogs) |
| `src/components/sections/AccountSection/AccountSection.tsx` | deleted — its only importer was the Settings screen |
| `src/navigation/RootNavigator.tsx` | the `Settings` screen, its render wrapper and its import are gone |
| `src/navigation/types.ts` | `Settings: undefined` and `SettingsScreenProps` are gone |
| `src/navigation/index.ts` | the `SettingsScreenProps` export is gone |
| `src/navigation/linking.ts` | `Settings: 'settings'` → `Profile: {path: 'profile', alias: ['settings']}` |
| `src/navigation/navPersistence.ts.disabled` | `'Settings'` removed from `RESTORABLE_ROUTES` (the file is disabled and not compiled; it is kept truthful) |
| `src/features/library/presentation/hooks/useLibraryScreen.ts` | `navigateToSettings` is gone |
| `src/features/library/presentation/components/Library{Audio,Artists,Albums}Segment.tsx` | the empty state's action becomes **"Link folders"**, which goes to `LinkedFolders` — not to a page called Settings |
| `src/features/library/presentation/components/LibraryScreenContent.tsx` | the prop is renamed and re-pointed |
| `src/screens/FolderBrowser/components/FolderBrowserScreen.tsx` | the permission error's "Settings" action opens the **OS app settings** (`Linking.openSettings()`), which is what a storage permission needs — it used to open Simba's own Settings page |
| `src/components/layout/HomeHeader/HomeHeader.tsx` | the dead `navigate('Settings')` fallback (CF-02) is re-pointed |
| `src/screens/Help/components/HelpScreen.tsx` | the FAQ is cut to the board's three sections and re-pointed at the Profile |
| `src/state/settingsStore.ts` | `resetPreferences()` added |
| `__tests__/navigation/navigationGraph.test.ts` | the `Settings` route is removed from the graph's expectations, and `/settings` now resolves to `Profile` |

---

## 8. The design

The Penpot file `SIMBA` carries a board per route, in both themes.

* `Profile / light` and `Profile / dark` are **redrawn** as the merged page.
* `Settings / light` and `Settings / dark` are **deleted**.
* The board registry (`designs/penpot/app-boards.js`) loses the `Settings`
  route and the five edges that pointed at it, and gains the merged Profile's
  own edges (Stats, Help, About, AudioSettings, LinkedFolders, Login).
* `designs/build-penpot-app.js` drops `settingsBoard` from `RC1_PAGES`.

### The board is TALL

The merged Profile is ≈1900 dp tall — nine dividers and twenty-one rows. The
page grid's row pitch is `SCREEN_H (914) + GAP_Y (700) = 1614`, so a board
that tall **overlaps the row below it**, and an overlapped board hides the one
behind it.

The grid therefore learned to measure: each row's height is now the tallest
board in that row, and the rows below a tall row are pushed down. Only the
rows that actually need it move.

### Copy is American

The repo's user-facing strings are American ("Color", "Favorites",
"Normalization"). The boards had drifted to British ("colour", "normalisation").
The merged board is American, to match the app.

---

## 9. The device proof

`emulator-5554` — 1080 × 2400 px @ 420 dpi, so **1 dp = 2.625 px**, and the
usual **+24 dp** status-bar offset (defect **CF-22**). The app was reloaded
through Metro and the Profile was read out of the live view hierarchy.

### What rendered

All **21 rows in 9 groups**, in the board's order: the identity, "Activity"
(Playback statistics), "Appearance" (Theme), "Playback" (Hardware
acceleration, Audio normalization, Dialogue boost, Skip silence, Subtitle
language, Audio settings), "Subtitles" (Font size, Text color, Background
opacity, Auto-load subtitles), "Library" (Linked folders, MPV options),
"Account" (Sign out, Revoke Google access, Clear local data), "Support"
(Help, About Simba), "Reset" (Reset preferences).

### The board against the device

| What | The device | The board | Off by |
|---|---|---|---|
| the avatar | x 16, 72 × 72 dp | x 16, 72 × 72 | — |
| the name / email | x 104 | x 104 | — |
| the first divider's label | 24 dp below the identity | 24 dp | — |
| the other dividers' labels | 28 dp below the row above | 28 dp | — |
| a row | 52 dp | 52 | — |
| a row with a description | 66.7–67.0 dp | 67 | — |
| the switch | 46.5 × 27 dp, flush with the 16 dp gutter | 46 × 27 | — |
| the chevron | 14 dp at x 381 | 14 dp at x 381 | — |
| "Playback statistics" | y 227.8 | y 227 | 0.8 dp |
| "Appearance" | y 293.3 | y 292 | 1.3 dp |
| "Theme" | y 341.3 | y 340 | 1.3 dp |

The last dp is the screen's own: the app's header measures 60.95 dp where
the board's `HEADER_H` is 60, so the app's content sits ~1.1 dp below the
board's from the identity down. That is the same rounding the R1 proof
recorded.

### Three things the measurement changed

1. **The description row is 67 dp, not 66.** The board said 66; the device
   says 175–176 px. The board was changed.
2. **The switch is 46 × 27 dp, not 44 × 26.** The old numbers were the iOS
   size and had never been measured on this app. The board was changed.
3. **The first divider is 12 dp above the rest.** The Profile gives the
   divider after the identity 4 dp of its own margin (`dividerFirst`) and
   the ones after a row 8 dp (`divider`) — 24 dp and 28 dp to the label.
   The board now draws the first section with 12 and the rest with 16.

### One defect the proof found

The **"Text color" row announced "Text color, [object Object]"** to a
screen reader: its description is a *node* (the colour swatch and the hex),
and `SettingsRow`'s default label is `` `${label}, ${description}` ``. The
row now carries an explicit `accessibilityLabel` of the value itself.

---

## 10. What this wave does NOT fix

Carried forward, each with its own id:

* **R3** — the About page's "Reset all settings" footer is a second reset.
  It is no longer a pure duplicate: the Profile's "Reset preferences"
  keeps the linked folders, and this one does not (its dialog now says so).
  Which of the two survives is R3's call.
* **R3** — the About page's version string is still hardcoded, and its "Built
  with" still names Redux Toolkit (the app uses Zustand + MMKV).
* **R3** — the Bookmarks "N saved" chip is still a delete-everything button.
* **R3** — a finished Download still cannot be opened, and its "done" action
  still re-downloads.
* **R3** — the Library's "Playlists" mode is still the All Playlists page.
* **R3** — History's pull-to-refresh still re-reads nothing.
* **CF-01** — `simbaplayer://` deep links still do not open the app on Android.
* **CF-12** — `preferredLanguages` still defaults to `'eng, jpn, und'`.
* **CF-13** — `support@simbaplayer.app` is still unverified.
* The Help page's FAQ is now the board's three sections, but the board's
  wording and the code's wording were reconciled **by hand** — the Help page
  still deserves its own pass.
* The merged Profile is one long scroll. It is 21 rows; it was checked on a
  device, but the fold positions of each group have not been designed.
