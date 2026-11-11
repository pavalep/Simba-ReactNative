# PROFILE & INTERNAL PAGES — RC1 Analysis and Redesign Plan

**Repo:** `X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE` · branch `f5/w22-close-minimise-d9` · HEAD `e746481`
**Date:** 2026-11-11
**Status:** ANALYSIS ONLY. No app code is touched by this document. The code waves in §11 wait for the user's approval of the Penpot boards in §10.

---

## 0. The brief, restated

> "the profile page has ai slop data, the ui looks so bad, create the perfect profile page, for our app, remove the already available data from homepage, or duplicates, keep it simple, also refactor internal pages, delete non sensical internal pages, etc, because most was created with ai slop code, many sub functions, dead codes etc will be there — all such should be removed, as we are moving from beta to RC1, first deep analyse, think, create a cohesive profile UI and internal page UI's in penpot, dont delete the code or touch the code before that, after approval we can start on that, start with analysis, md creation, then approval"

Restated as five deliverables:

| # | Deliverable | Where |
|---|---|---|
| D1 | A deep analysis of the Profile page and every "internal" page | §1–§8 |
| D2 | A written record of the findings | this file |
| D3 | A cohesive Profile UI **and** internal-page UIs, designed in Penpot | §10 |
| D4 | An approval gate before any code changes | §12 |
| D5 | The code plan that runs *after* approval | §11 |

---

## 1. How this analysis was made — the evidence is measured, not recalled

Three independent sources, cross-checked against each other:

1. **Source reading.** Every file named below was read in full at the stated line numbers.
2. **A live device walk** with Argent MCP on `emulator-5554` (AVD `Medium_Phone`, 1080×2400 @ 420 dpi = 2.625 px/dp, dark theme, signed in as `pavalep@gmail.com`). Screenshots and the React component tree were captured on the running app — not a mock, not a design file. The artefacts are in `C:\Users\paval\AppData\Local\Temp\simserver-ocH4vw\media\`.
3. **A repo-wide static sweep.** `X:/Development/SIMBA/.scratch-figcraft/dead-runtime.js` counts, for every exported runtime symbol in `src/`, how many *other* files under `src/` or `__tests__/` mention it. Zero mentions = dead.

Anything below marked **MEASURED** was read off the running app. Anything marked **READ** was read from source. Nothing here is from memory.

---

## 2. The verdict, in one paragraph

The Profile is not badly designed — it is **three different pages wearing one page's clothes**, and each of the three is redundant. It is a launcher for things that live on Home, a second copy of the account card that Settings already draws, and a stats panel whose numbers come from a *different store* than the Stats page's numbers. Underneath it sit eight settings that exist in the store with no UI anywhere, a Help page that sends the user to six of them, an About page whose link list has collapsed to a 32 dp column of unlabelled icons, a Credits page that claims the app uses Redux Toolkit when it uses Zustand, and a Privacy page that paints a hardcoded gold slab over the whole screen in the dark theme. **Not one of the 52 screens is non-sensical enough to delete** — the correct move is to repair the internal pages and give the Profile one job. §5 gives the per-page verdict.

---

## 3. The Profile page, as it renders today

**MEASURED** — the app was signed in and the Profile was opened through the Home header avatar. Component tree from `mcp__argent__debugger-component-tree`; screenshots at 0.6 scale.

```
InternalHeader "Profile"                       (0.50, 0.06)
  BackButton "Go back"                         (0.06, 0.06)
  TouchableOpacity "Sign out"                  (0.94, 0.06)   ← text wraps, clips
ScrollView
  Avatar "PE"                                  (0.16, 0.16)
  AppText "Paval E P"                          (0.59, 0.15)
  AppText "pavalep@gmail.com"                 (0.59, 0.17)
  AppText "0" / "Tracks"                       (0.18, 0.25/0.28)
  AppText "0" / "Videos"                       (0.50, 0.25/0.28)
  AppText "0" / "Bookmarks"                    (0.82, 0.25/0.28)
  AppText "0" / "Followed"                     (0.18, 0.35/0.37)
  AppText "0" / "Playlists"                    (0.50, 0.35/0.37)
  AppText "0" / "Plays"                        (0.82, 0.35/0.37)
  AppText "Playback"                           (0.50, 0.46)   ← NO value above it
  AppText "Shortcuts"                          (0.50, 0.53)
  TouchableOpacity "History, …"                (0.50, 0.59)
  TouchableOpacity "Stats, …"                  (0.50, 0.66)
  TouchableOpacity "Bookmarks, 0 saved positions"   (0.50, 0.74)
  TouchableOpacity "Playlists, 0 playlists"          (0.50, 0.81)
  TouchableOpacity "Followed Podcasts, 0 followed feeds" (0.50, 0.88)
  TouchableOpacity "Downloads, …"             (0.50, 0.96)
  TouchableOpacity "Local Media, …"            (0.50, 1.03)
  TouchableOpacity "Settings, …"               (0.50, 1.10)   ← off-screen
  AppText "Preferences"                        (0.50, 1.17)
  AppText "Account"                            (0.50, 1.24)
  … "Sign Out / Logout", "Revoke Google Access / Revoke", "Clear Local Data / Wipe"
```

The visual result (MEASURED, dark theme):

- A **generic dark-grey card grid** with **zero gold anywhere**. Compare Home, which carries the engraved lion, the gold Allura wordmark, the gold Cormorant dividers and the gold category discs. The Profile is not recognisably a Simba screen.
- The header's **"Sign out" wraps onto two lines and is clipped** by the header's bottom edge.
- The **"Playback" cell sits alone in a full-width box with no number above it**.
- Section titles ("Shortcuts", "Preferences", "Account") are `displaySans` — Manrope SemiBold 22 px, left-aligned, no rules, no gold.
- **"Bookmarks", "Playlists" and "Followed" each appear TWICE** — once as a stat, once as the description of a shortcut row underneath. The number 0 is printed four times on one screen.
- The **Account card stacks three red rows** ("Logout", "Revoke", "Wipe").

---

## 4. The Profile's defects, one by one

Every row is cited to a file and a line.

### 4.1 The stats grid — "runnercassry stats … its chaos", confirmed and explained

| ID | Defect | Evidence |
|---|---|---|
| **P-01** | **The 7-cell grid breaks its own layout.** `flexBasis: '30%'` + `flexWrap` fits 3 per row, so 7 items render 3 + 3 + **1 orphan** stretched to full width. | `ProfileScreen.tsx:446` (`flexBasis: '30%'`), `:107-116` (7 stats) |
| **P-02** | **The orphan cell has no value.** `formatDuration(0)` returns `''` (`if (!totalSeconds \|\| totalSeconds <= 0) return '';`), so the 7th cell renders an empty string above the word "Playback". | `src/utils/timeAgo.ts` `formatDuration`; MEASURED — the screenshot shows a bare "Playback" label |
| **P-03** | **"Playback" is a lie.** It is `Σ(playCount × duration)` **over the recents list only** — it ignores every track in the library that is not in the last N recents. | `ProfileScreen.tsx:93-100` (`recentFiles.reduce(...)`) |
| **P-04** | **"Tracks" and "Videos" come from a different store than the Stats page's.** The Profile reads `useMediaStore(s => s.tracks)` (the scanned library); the Stats page reads `useSessionStore(state => state.mediaLibrary)` (the playback roll-up). The same two words, two sources, two numbers. | `ProfileScreen.tsx:66-67,82-85` vs `StatsScreen.tsx:43,69-74` |
| **P-05** | **"Followed" is ambiguous.** It counts followed *podcasts* but the row below calls them "followed feeds". | `ProfileScreen.tsx:71,111` vs `:298` |
| **P-06** | **The whole grid is a fitness-app pattern, not a media-app pattern.** No shipping media app puts a numeric stat grid on the account page — YouTube Music, Apple Music, Spotify, Plex, VLC, Tencent Video and Huawei Video all show *identity + a list of your things*. | §9 |

### 4.2 Duplication with Home and with itself

| ID | Defect | Evidence |
|---|---|---|
| **P-07** | **The "Recently Played" chip strip duplicates Home's Recently Played rail.** Two surfaces, one dataset, both on the two most-visited pages. | `ProfileScreen.tsx:223-264` vs `src/screens/Home/index.tsx:118-125` (`HomeMediaShelf`) |
| **P-08** | **The "Shortcuts" block is a launcher-of-launchers.** 8 rows — History, Stats, Bookmarks, Playlists, Followed Podcasts, Downloads, Local Media, Settings — of which Bookmarks, Playlists and Followed Podcasts are already rails on Home, and Local Media is on Home's Explore Contents card. | `ProfileScreen.tsx:267-321` vs `src/screens/Home/index.tsx:126-163` |
| **P-09** | **The same number is printed twice.** "Bookmarks", "Playlists", "Followed" appear as a stat cell *and* as the description of the shortcut row 400 px lower. | `ProfileScreen.tsx:110-112` vs `:286,292,298` |
| **P-10** | **"Followed Podcasts" navigates to the wrong page.** It goes to `PodcastsScreen` — the *catalogue* (a category filter + search over the Podcast Index) — not to `FollowedPodcasts`, the list of feeds the user follows. **This exact bug was already found and fixed on Home**; the comment at `Home/index.tsx:71-80` says so by name. The Profile still carries the old, wrong answer. | `ProfileScreen.tsx:299` vs `Home/index.tsx:78-80`; the route exists and is correct at `src/navigation/types.ts:88-96` |
| **P-11** | **"Preferences → Theme" is a third door to Settings → Theme.** Settings already owns the theme picker (`SettingsScreen.tsx:126-130` + `ThemePickerDialog`). | `ProfileScreen.tsx:324-336` |
| **P-12** | **"Sign Out" is drawn twice** — once as the header's right action (`:178-182`) and once as the Account card's first row (`:344-349`). | `ProfileScreen.tsx:178-182, 344-349` |
| **P-13** | **Settings' "Account Section" card draws the Profile's identity block again.** Avatar, name, email — and tapping it opens the Profile. The Profile is a circle. | `src/components/sections/AccountSection/AccountSection.tsx:37-42`; MEASURED — the card is the first row of Settings |

### 4.3 Dead code inside the Profile screen

`@typescript-eslint/no-unused-vars` is **off** in three places in `.eslintrc.js` (L66, L67, L118). The lint gate therefore **cannot** see any of this — which is exactly how it accumulated. See §8.

| ID | Dead thing | Evidence |
|---|---|---|
| **P-14** | `import {ActivityOrb}` — never rendered. | `ProfileScreen.tsx:21` |
| **P-15** | `import {normalizeMediaClassification}` — never used. | `ProfileScreen.tsx:37` |
| **P-16** | `signIn` destructured from `useAuth()` and never called. | `ProfileScreen.tsx:62` |
| **P-17** | `styles.placeholderAvatar` — 7 dead lines. | `ProfileScreen.tsx:420-426` |
| **P-18** | `styles.signInBtn` + `styles.signInLabel` — 8 dead lines, and `signInLabel` carries a `fontWeight: '700'` that violates the font rule (weight lives in the family key). | `ProfileScreen.tsx:427-434` |
| **P-19** | **The signed-out branch renders an empty card.** `{user ? (…) : null}` inside a card with a background — a signed-out user sees a blank grey box where their name should be. | `ProfileScreen.tsx:186-201` |
| **P-20** | `ProfileScreenProps` is exported but the screen declares its own local `type Props = RootStackScreenProps<'Profile'>`. Two names for one type. | `src/screens/Profile/types/index.ts:3` vs `ProfileScreen.tsx:42` |
| **P-21** | `isLoading` from `useAuth()` is destructured and never used. | `ProfileScreen.tsx:62` |
| **P-22** | **The `Avatar` component never renders the user's photo.** Its `uri` branch draws the INITIALS inside a highlighted disc, with the comment *"The avatar image would go here, via `<MediaImage>`, once an image URL is available"*. So the Profile's and Settings' avatars show "PE", while the Home header's avatar — which uses `MediaImage` directly — shows the real photo. Two avatars, two behaviours, one component. | `src/components/core/Avatar/Avatar.tsx:34-59` vs `src/components/layout/HomeHeader/HomeHeader.tsx:184-189` |

---

## 5. The internal pages — per-page verdict

All 52 screens were inventoried (`src/screens/**`, file and line counts). The 12 "internal page" candidates were each read in full and, where reachable, walked on the device.

### 5.1 The candidates

| Page | What it is | Verdict | Why |
|---|---|---|---|
| **About** | App identity, links, "Built with", reset | **REPAIR** | Broken in four ways (§6.1). A Play Store release needs it. |
| **Changelog** | 4 version entries (0.8.0 → 1.1.0) | **REPAIR** | Real content, but its newest entry predates RC1 and one entry describes the Profile slop itself. |
| **Credits** | Library credits by group | **REPAIR** | Real, but lists Redux Toolkit / redux-persist / AsyncStorage, which the app does not use. |
| **Help** | FAQ, 3 sections, with search | **REPAIR** | Real, but sends the user to six controls that do not exist (§6.3). |
| **Licenses** | Per-library licence list, expandable | **KEEP** | Correct and working. |
| **Privacy** | 3 paragraphs | **REPAIR** | Paints a hardcoded gold slab (§6.2). |
| **Terms** | 3 paragraphs | **REPAIR** | Same gold slab. |
| **Stats** | Plays, playback time, tracks, videos, days active, day streak, top media | **KEEP — but give it ONE job** | It owns the streak / days-active / top-media content that nothing else has. The duplication is the Profile's grid, not this page. |
| **Equalizer** | 10-band EQ with presets | **KEEP** | Working, reached from Audio Settings. |
| **Audio Settings** | Sample rate, replay gain, gapless, audio delay, EQ | **KEEP** | Working. |
| **Folder linking wizard / Linked folders / Folder browser** | Folder linking and browsing | **KEEP** | Working, and the app's core local-media path. |
| **Queue / Downloads / Now Playing** | Player surfaces | **KEEP** | All reachable and working. |

### 5.2 The honest answer on "delete non sensical internal pages"

**Nothing should be deleted.** The reason the internal pages *feel* nonsensical is not that there are too many of them — it is that:

- **The Profile is a launcher of pages that already have a home**, so every one of them looks like clutter when seen from there.
- **Settings duplicates Home** (§6.4), so Settings feels like a second Home.
- **Six of the internal pages are broken or lying** (§6), so they feel like filler.

Delete About, Help, Licenses, Privacy or Terms and the app becomes *less* shippable — the Play Store listing requires a privacy policy, and licence disclosure is expected. The fix is to give each page one job and make it true, which is what §9 and §10 propose.

**One page is a genuine deletion candidate** if the user wants it: the **Stats** page. But it is the only surface for day streaks, days-active and top-media — content that Spotify (Wrapped), YouTube (Watch time) and VLC (Statistics) all ship. My recommendation is to keep it and let the Profile link to it once.

---

## 6. The internal pages' defects

### 6.1 About — the link list has collapsed, and three facts are false

**MEASURED** on the device, the About screen's link list renders as a **32 dp-wide column of unlabelled icons** down the middle of the screen:

```
ScrollView  (0.461, 0.473, 0.078, 0.417)     ← 0.078 of the screen width = 32 dp
  Button "Changelog"             (0.461, 0.473, 0.078, 0.057)
  Button "Credits"               (0.461, 0.535, 0.078, 0.057)
  Button "Open Source Licenses"  (0.461, 0.596, 0.078, 0.057)
  Button "Privacy Policy"        (0.461, 0.657, 0.078, 0.057)
  Button "Terms of Service"      (0.461, 0.718, 0.078, 0.057)
  Button "Rate on Play Store"     (0.461, 0.780, 0.078, 0.057)
  Button "Share App"             (0.461, 0.841, 0.078, 0.050)
```

**Root cause (READ):** `styles.content` has `alignItems: 'center'` (`AboutScreen.tsx:168`) and the `FlatList` has no width of its own; each row declares `width: '100%'` (`AboutScreen.tsx:221`). The list's width therefore depends on its content and its content's width depends on the list — a circular constraint that Yoga resolves by collapsing to the widest fixed child: the 18 dp icon plus the 16 dp chevron. The labels have nowhere to go. The row's `flex: 1` label (`styles.linkLabel`, `:231-233`) is squeezed to zero.

**Three facts on the same screen are false:**

| Claim on screen | Truth | Evidence |
|---|---|---|
| **"Version 1.0.0"** | The native build is **1.1.0 (versionCode 2)** | `AboutScreen.tsx` `textContent.version`; `android/app/build.gradle` `versionName "1.1.0"`, `versionCode 2` |
| **"Built with: … Redux Toolkit"** | The app uses **Zustand 5**; Redux is not in `package.json` | `AboutScreen.tsx:117`; `package.json` has `zustand ^5.0.15` and no redux |
| **Rate on Play Store → `com.simbaplayer`** | The real application id is **`com.simba.player`** | `AboutScreen.tsx:52-53`; `android/app/build.gradle` `applicationId "com.simba.player"` |
| **Report Bug → `github.com/diegopvlk/Cine/issues`** | This is a different project. The app's repo is **`pavalep/Simba-ReactNative`** | `AboutScreen.tsx:54` |

**And a fourth:** Settings' About block reports the version as **"0.0.1 (1)"**, read from `package.json` (`useSettingsScreen.ts:21-28`). So the app shows **three different versions** for the same binary — 0.0.1 on Settings, 1.0.0 on About, and the true 1.1.0 nowhere.

Also: **"Reset all settings"** (red, bottom of About) duplicates **"Reset Preferences"** in Settings.

### 6.2 Privacy and Terms — a hardcoded gold slab over the whole screen

**READ:** both screens paint an opaque fill over the entire viewport:

```tsx
<View style={[StyleSheet.absoluteFill, {backgroundColor: '#D4B47A'}]} />
```
`src/screens/Privacy/components/PrivacyScreen.tsx:19` · `src/screens/Terms/components/TermsScreen.tsx:19`

**MEASURED** in the dark theme, the Privacy page renders as a **gold page with dark-tan body text** — the theme's `text.primary` (near-white in dark) is drawn on `#D4B47A`, so the paragraphs are low-contrast brown on gold while the rest of the app is charcoal. The header title is also truncated to **"Privacy P…"** because the `displaySerif` title is 48 px inside a `paddingHorizontal: 96` overlay (`InternalHeader.tsx:121,135-144`).

These are the **only two** hardcoded background colours in `src/screens/` — a grep for `backgroundColor: '#` returns exactly these two hits.

### 6.3 Help — a directory to controls that do not exist

**READ.** The FAQ names six controls, and **none of them has a UI anywhere in the app**:

| The Help page says | The store has the key | Is there a UI row? |
|---|---|---|
| "Preferences → **Remember playback position**" | `rememberPlaybackPosition` | **NO** — `setRememberPlaybackPosition` has 0 call sites |
| "Preferences → **Media notifications**" | `notificationsEnabled` | **NO** — 0 call sites |
| "Preferences → **Language**" | `appLanguage` | **NO** — 0 call sites |
| "Preferences → **Larger controls**" | `largerControls` | **NO** — 0 call sites |
| "**High-contrast subtitles**" | `highContrastSubtitles` | **NO** — 0 call sites |
| "Preferences → **Rescan library**" | `scanOnLaunch` | **NO** — 0 call sites |

(Swept with `setRememberPlaybackPosition`, `setNotificationsEnabled`, `setAppLanguage`, `setLargerControls`, `setHighContrastSubtitles`, `setScanOnLaunch` — 0 hits each outside `settingsStore.ts`. `setAutoDeleteDownloads` is the only one of the batch that *does* have a UI, on the Downloads screen.)

Three more inaccuracies in the same page:
- It calls the page **"Preferences"** in eight answers. The page is called **"Settings"** everywhere else in the app.
- It says "Settings → **Audio & Playback**" — the section is called **"Playback"**.
- It says "About → **Report Bug**" — that link exists but its list has collapsed (§6.1) and it points at the wrong repository.

### 6.4 Settings — duplicates Home, and mixes three jobs in one page

**MEASURED** on the device, Settings is one scroll with 7 sections:

| Section | Rows | Problem |
|---|---|---|
| *(account card)* | "PE / Paval E P / pavalep@gmail.com / View Profile" | **Duplicates the Profile's identity block** (P-13) |
| Appearance | Theme, **Accent Color** | "Accent Color — Gold — Simba brand" has **no `onPress`** — a dead row that looks like a setting. `SettingsScreen.tsx:131` |
| Library | Linked Folders, MPV Options | Linked Folders is also on the Profile and in the Library screen |
| **Discover** | **Movies, Podcasts, Music, Live TV, Live Radio, Audiobooks, Archives (7 rows)** | **7 of Home's 9 "Explore Contents" cards, as a plain text list.** `SettingsScreen.tsx:162-168` vs `Home/components/BrowseAllShelf.tsx:53-107` |
| Playback | 4 switches + Subtitle Language + Audio Settings | Correct |
| Subtitles | 4 rows | Correct. But the "Text Color" row's accessibility label is literally **`[object Object]`** — `description` is a React element that `SettingsRow` stringifies. MEASURED. |
| About | Version, About Simba, Credits, Changelog, Help, Reset Preferences, Licenses | Version is wrong (§6.1). "Reset Preferences" duplicates About's "Reset all settings". |

Two more measured facts:
- The Subtitle Language row shows **"eng, jpn, und"** — `und` is the ISO-639 "undetermined" code, hardcoded into the store's default: `preferredLanguages: 'eng, jpn, und'` (`src/state/settingsStore.ts:162`).
- Settings' `SettingsRow` touch targets are **full-bleed** (frame x = 0.000, width = 1.000) while the Profile's rows are inset (x = 0.039, width = 0.922). The same component, two grammars.

### 6.5 The rest of the internal pages — smaller findings

| ID | Page | Finding |
|---|---|---|
| **I-01** | Credits | Lists **Redux Toolkit, redux-persist, AsyncStorage** as "State & Data". The app uses Zustand + MMKV. `CreditsScreen.tsx:47` |
| **I-02** | About | The `LinkItem` interface carries a 13-line comment about a TypeScript distribution problem, and the fix is `navigation.navigate(item.route as any)` — the `as any` the comment says it removed. `AboutScreen.tsx:35-46, 260-262` |
| **I-03** | Changelog | Its newest entry (1.1.0) lists *"Profile screen with real playback stats and recently played strip"* — i.e. it advertises the slop this document removes. `ChangelogScreen.tsx:24-25` |
| **I-04** | Privacy / Terms | No `edges` on `SafeAreaView`, no `SimbaStatusBar` variant check, and the title truncates (§6.2). |
| **I-05** | Privacy / Terms | "Last updated: July 2026" on a page that is about to ship in RC1. |
| **I-06** | Help | Its own search box searches a hardcoded array — fine — but the "Contact support" action mails `support@simbaplayer.app`, a domain that appears nowhere else in the app and is not the app's repo owner. `HelpScreen.tsx` `CONTACT_URL` |
| **I-07** | About / Privacy / Terms / Help | All four build a `Linking.openURL` to a URL that may not exist. `simba.player` / `simbaplayer.app` are asserted, never verified. |

---

## 7. Dead code and slop, repo-wide

### 7.1 The lint gate is blind to dead code

`.eslintrc.js` disables the unused-vars rule **three times**:

```
L66:  'no-unused-vars': 'off',
L67:  '@typescript-eslint/no-unused-vars': 'off',
L118: '@typescript-eslint/no-unused-vars': 'off',
```

The file's own comment says the rule is off because of "dep issues + unused imports/vars. Migrating every one to the exhaustive-deps + strict-unused-vars rules is a V20+ sweep". **That sweep never happened.** Every gate the project runs — `tsc --noEmit`, `eslint --max-warnings 0`, the import-boundary check, the font check, jest — passes green on a screen carrying four dead imports and eleven dead style lines. **This is the mechanism by which "AI slop" accumulated: the gates cannot see it.**

### 7.2 The dead-export census

`dead-runtime.js` (every exported runtime symbol in `src/`, counted against every other file in `src/` and `__tests__/`): **68 dead runtime exports**. The largest concentrations:

| Area | Count | Examples |
|---|---|---|
| `src/services` | 17 | `getCacheSize`, `getDownloadPolicy`, `getTotalDownloadedBytes`, `clearLrcCache`, `getActiveLyricIndex`, `buildShareUrl`, `buildHttpsUrl`, `parseNetworkError`, `handlePlaybackError`, `isValidSubtitleFile`, `configureGoogleSignin`, `getRecords`, `getLocalPath`, `getKeepLastN`, `DEFAULT_KEEP_LAST_N`, `DEFAULT_MAX_AGE_MS`, `isLoaded` |
| `src/utils` | 14 | `slideInUp`, `springScale`, `pulseLoop`, `pulseScaleLoop`, `staggerEntrance`, `rotateLoop`, `interpolateRotate`, `getCurrentLyricIndex`, `getExportFileName`, `getM3uMimeType`, `getExportFilePath`, `sourceFromUri`, `classifyStreamType`, `getDisplayExt` |
| `src/constants` | 5 | `AUDIOBOOKS_BROWSE`, `AUDIOBOOK_CATEGORIES`, `ARCHIVE_BROWSE`, `ARCHIVE_CATEGORIES`, `FONT_ROLE` |
| `src/infrastructure/api` | 3 | `axiosInstance`, `getAxiosInstance`, `parsePageParam` |
| `src/theme` | 3 | `useThemeContext`, `useColors`, `mergeTokens` |
| `src/state` | 4 | `BOOKMARK_POSITION_TOLERANCE_SEC`, `getNowPlaying`, `getOrientationLocked`, `getNowPlaying` |
| `src/components` | 6 | `RAIL_CARD_GAP`, `CHROME_TRAVEL_PX`, `deriveNextUpView`, `MODE_LABEL`, `DISMISS_VELOCITY`, `useSleepTimer` |
| screens | 7 | `BROWSE_ALL_SECTIONS`, `PODCASTS_SECTION_CONFIG`, `AUDIOBOOK_GENRE_OPTIONS`, `LOAD_MORE_THROTTLE_MS`, `RADIO_PAGE_SIZE`, `MemoizedBookmarkSheet`, `QueryProvider` |

**Note on `getCacheSize` / `formatBytes`:** an earlier reading of this repo suggested both were dead. **That was wrong.** `formatBytes` is used by `DownloadsScreen.tsx:23,53,238`. Only **`getCacheSize`** (`src/services/cacheService.ts:28`) is dead.

### 7.3 The font rule, broken in three places

The project rule: **weight lives in the family key**, never a `fontWeight` prop. Violations found:

| File | Line | Code |
|---|---|---|
| `src/components/layout/InternalHeader/InternalHeader.tsx` | 130-131 | `fontSize: 22, fontWeight: '700'` |
| `src/components/layout/InternalHeader/InternalHeader.tsx` | 140 | `fontWeight: '700'` (the serif title) |
| `src/components/layout/HomeHeader/HomeHeader.tsx` | 271 | `fontWeight: '700'` (the avatar initial) |
| `src/screens/Profile/components/ProfileScreen.tsx` | 433 | `fontWeight: '700'` (in a dead style) |

The `SectionHeader` component documents the rule at length ("encoding the weight in the family key makes Android's font manager deterministically pick Manrope-SemiBold.ttf") and then `InternalHeader` does the opposite.

### 7.4 The prototype had drifted from the app too

The Penpot board registry (`designs/penpot/app-boards.js`) is supposed to mirror the app's routes. Comparing the two, mechanically, over the app's `RootStackParamList`:

```
app routes: 52   boards: 48
IN THE APP BUT NOT ON THE PAGE: SongScreen, AllVideosScreen, FollowedPodcasts, NowPlaying, MusicDetail
```

Four of those five are deliberate — the registry's own comment excludes the deep-link-only `SongScreen`, `AllVideosScreen`, `MusicDetail` and `NowPlaying` (which renders `null`). **The fifth was an oversight: `FollowedPodcasts` was never registered.**

The consequence was not a missing board — it was a **wrong edge**. Both the V1 and the V2 "See all Followed Podcasts" connectors pointed at `PodcastsScreen`, the catalogue, which is the very page the app's own Home comment says cannot answer the question:

```tsx
// src/screens/Home/index.tsx:71-80
// 35.5: per-user rail — the "See All" link goes to the page that owns
// the user's full followed list.
//
// It used to point at `PodcastsScreen`, which is the CATALOGUE — a
// category filter and a search box over the Podcast Index. It does not
// list the podcasts the user follows, so the link answered a question
// the page could not answer. `FollowedPodcasts` is the page that can.
```

The app was fixed; the prototype was not. The registry now carries the route, and both edges point at `FollowedPodcasts`.

**This is the same bug as P-10** — the Profile's "Followed Podcasts" row still pointed at the catalogue — found twice, in two places that were supposed to agree.

---

## 8. Duplication map — who owns what

One owner per fact. The table below says where each piece of information should live after this wave.

| Information | Today | Should live in |
|---|---|---|
| The user's name, email, avatar | **Profile header** AND **Settings' AccountSection** | **Profile** only. Settings links to it. |
| Recently played items | **Home rail** AND **Profile chip strip** | **Home** only. |
| Bookmarks / Playlists / Followed counts | **Profile stat cell** AND **Profile shortcut description** | **One place.** §12 asks where. |
| Tracks / Videos counts | **Profile stat cell** (`useMediaStore`) AND **Stats page** (`useSessionStore`) | **One store — `sessionStore.mediaLibrary`.** Both pages read it. The Profile shows it as the count line; the Stats page shows the rest. |
| Days active / day streak / top media | Stats page only | **Stats page.** |
| Playback time | **Profile stat cell** (recents only) AND **Stats page** (library-authoritative) | **Stats page.** |
| The 9 catalogue areas | **Home's Explore Contents rail** AND **Settings' Discover list (7 rows)** | **Home's rail.** Settings' Discover section goes. |
| Theme | **Settings → Theme** AND **Profile → Preferences → Theme** | **Settings.** |
| Playback position memory | Store key only; Help sends you to it | **Settings**, or delete the key and the FAQ line together. |
| Notifications / language / larger controls / high-contrast subtitles / scan-on-launch | Store keys only; Help sends you to all five | **Settings** rows, or delete the keys and the FAQ lines together. §12 asks. |
| The app version | **Three** answers: 0.0.1 (Settings), 1.0.0 (About), 1.1.0 (the truth) | **One**, read from the native build. |
| "Reset everything" | **Settings → Reset Preferences** AND **About → Reset all settings** | **One.** Settings. |
| Privacy policy / terms | Login footer + About (collapsed list) | **Login footer + Settings.** |

---

## 9. The recommended shape — and why it is not an invention

### 9.1 The rule being applied

**"Never invent an affordance: before adding a control, name the shipping apps that already use it."**

Every element below is named after a shipping app that already does it:

| Element | Precedent |
|---|---|
| Avatar + name + email, unboxed at the top of the page | **Spotify**, **Apple Music**, **Plex**, **YouTube** |
| A **list of your own things** (playlists, history, downloads, follows), each one row | **YouTube** (Your channel), **Apple Music** (Playlists/Artists/Albums/Songs), **Plex** (My Library / Watchlist / History) |
| A **count as trailing text** on a row, not as a stat tile | **VLC** (Media Library), **Plex** |
| **Settings separate from the account page**, reached by a gear or a row | **YouTube**, **Spotify**, **Apple Music**, **Plex**, **Tencent Video**, **Huawei Video** |
| Destructive actions **in the account section, one red row each, not three stacked** | **YouTube** (Sign out), **Spotify** (Log out) |
| **No numeric stat grid on the account page** | Every media app above has *none*. Stat grids are a fitness-app pattern. |
| **A "listening statistics" surface as its own page** | **Spotify** (Wrapped), **YouTube** (Watch time), **VLC** (Statistics) |
| Section titles as the **Cormorant italic gold divider** already used on Home | **Simba's own V2 grammar** (`SubsectionTitle` `displaySerif`) |

### 9.2 The proposed Profile

```
┌─────────────────────────────────────────────┐
│  ←        Profile                    ⋯      │   InternalHeader, titleVariant displaySerif
│                                             │
│    (avatar)   Paval E P                     │   UNBOXED — no card (the V2 greeting rule)
│                pavalep@gmail.com            │
│                                             │
│  ────────────  Your Library  ────────────   │   Cormorant Italic 18, gold 0.9, goldGlow rules
│                                             │
│    124 tracks · 8 videos · 6 playlists      │   ONE quiet line (VLC pattern)
│                                             │
│    Playlists                        6   ›   │   count as trailing text, ONE grammar
│    Bookmarks                       12   ›   │
│    History                             ›   │
│    Downloads                        3   ›   │
│    Followed podcasts                 4   ›   │
│    Local files                        2   ›   │
│                                             │
│  ────────────  Activity  ────────────────   │
│                                             │
│    Playback statistics                  ›   │   → Stats page (one owner for the numbers)
│                                             │
│  ────────────  Account  ─────────────────   │
│                                             │
│    Sign out                             ›   │
│    Revoke Google access                  ›   │
│    Clear local data                     ›   │
└─────────────────────────────────────────────┘
```

**Removed, and why:**

- **The 7-cell stats grid** — chaos (P-01…P-06); no media app has one; the numbers move to the Stats page.
- **The "Recently Played" chip strip** — duplicates Home's rail (P-07).
- **The 8-row "Shortcuts" launcher** — duplicates Home's rails (P-08); the rows become a plain, honest list of the user's things.
- **The "Preferences → Theme" section** — third door to Settings (P-11).
- **The header's "Sign out"** — sign-out belongs in the Account section, once (P-12). The header keeps a chevron back and a settings gear.

**Fixed, not removed:** the "Followed Podcasts" row now navigates to `FollowedPodcasts`, not the catalogue (P-10).

### 9.3 The proposed Settings

```
Appearance      Theme, Accent colour
Playback        Hardware acceleration, Audio normalisation, Dialogue boost,
                Skip silence, Subtitle language, Audio settings
Subtitles       Font size, Text colour, Background opacity, Auto-load
Library         Linked folders, MPV options, Downloads
About           Version (1.1.0 · 2), About Simba, Changelog, Credits,
                Licenses, Help, Privacy policy, Terms
```

**Removed from Settings:** the **Discover** section (7 rows that duplicate Home's Explore Contents rail) and the **AccountSection card** (it belongs to the Profile). **Not added:** the six rows for the settings that have no UI — **decision D-B was "delete the keys"**, so those eight store keys and the six Help answers that point at them go away together (§12).

---

## 10. The design brief for Penpot — and what was actually built

Boards are on page `SIMBA` (`0ad3c344-4868-800a-8008-eb4b437d4762`), file `3681d377-bc58-8110-8008-eb35633c2708`.

**The drawing is `designs/penpot/profile.js`** — a new file, because the account page and the internal pages have a grammar the Home screen does not have (`kit.js` draws the app as it is today; `kit-v2.js` draws the Home redesign; `profile.js` draws the RC1 family).

**Every number in it comes from the app.** The header is `InternalHeader.tsx`'s metrics, the section titles are `SubsectionTitle.tsx`'s `displaySerif` divider, the rows are `SettingsRow.tsx`'s row, and the colours come from `app-spec.js`, which reads `src/theme/tokens.ts` through the TypeScript AST.

### 10.1 The boards that were drawn

| Board | Contents | Shapes |
|---|---|---|
| `Profile / light` | The §9.2 layout | 55 |
| `Profile / dark` | The §9.2 layout, dark | 55 |
| `Settings / light` | The §9.3 layout — no Discover, no account card | 99 |
| `Settings / dark` | The §9.3 layout, dark | 99 |
| `About / light` | The repaired link list — full width, true facts | 63 |
| `About / dark` | The repaired link list, dark | 63 |
| `Help / light` | The repaired FAQ structure | 31 |
| `Help / dark` | The repaired FAQ structure, dark | 31 |
| `Privacy / light` | On the theme background, not a gold slab | 18 |
| `Privacy / dark` | On the theme background, dark | 18 |
| `Terms / light` | The same drawing, the terms copy | 17 |
| `Terms / dark` | The same drawing, dark | 17 |
| `Credits / light` | The libraries the app ACTUALLY uses | 48 |
| `Credits / dark` | The same, dark | 48 |
| `Stats / light` | The one stats surface, restyled | 40 |
| `Stats / dark` | The same, dark | 40 |

### 10.2 The design rules the boards obey

- Colours, spacing and radii come from `designs/penpot/app-spec.js` and `src/theme/tokens.ts`.
- Section titles use the **Cormorant Garamond Italic 18 px, gold @ 0.9 alpha, `goldGlow` rules @ 0.25, 20 px gap** grammar — the `SubsectionTitle` `displaySerif` variant already in the app. **Not** the V7 `displaySans` heading the Profile and Settings use today.
- The identity block is **unboxed** — the V2 greeting rule, applied to the Profile.
- Counts are **trailing text on a row**, never a tile.
- **Only ONE red row** in the Account section. Revoke and Clear live behind a confirmation dialog, so the row does not have to shout — and three red rows in a row read as an error screen.
- The Profile's Settings door is a **gear in the header** — the one place the account page can carry a control, and the way YouTube, Spotify, Apple Music, Plex and Tencent Video all do it. The old header's right action was the TEXT "Sign out", which wrapped and was clipped inside a 36 dp circle.
- The About link rows are **full width** — icon 18 + label + chevron 14.
- The Profile's page fits **one screen** (910 dp of a 914 dp viewport), where the old one ran to four screens of launcher.

### 10.3 The icons that were added

The design's icon set held 26 glyphs; the About page's new list needs ten more, and the header needs a back chevron and a gear. All eleven are **the app's own SVG files** (`src/assets/svg/`), listed in `SvgIcon.tsx`'s icon map — nothing was drawn from scratch:

`chevronLeft` (`ic_chevron_left.svg`) · `history` · `award` · `book` · `lock` · `info` · `trophy` · `share` · `alertCircle` · `megaphone` · `settings` (`ui_settings.svg`)

They were rasterised by `designs/penpot/icons.js` (70 renders) and uploaded to the Penpot file.

### 10.4 The build, and how it was verified

The pipeline ran in the order the project uses — **plan → media → plan → boards → links → flow** — because `build-penpot-app.js` writes the media ids INTO the plan files, so a plan generated before the upload has no id for a changed asset.

| Step | Result |
|---|---|
| `node designs/build-penpot-app.js` | 62 boards · 167 links in 17 calls · 89 media · **67/89 ids known** |
| `node designs/run-media.js` | 1 call · 11.0 s · **uploaded 22** (the new glyphs) · store now 89 |
| `node designs/build-penpot-app.js` | 62 boards · **89/89 ids known — ready to build** |
| `node designs/run-mcp.js build` | **17 calls, 0 errors** · 62 boards drawn |
| `node designs/run-mcp.js links` | **17 calls, 0 errors** · **404 connectors created**, 8 skipped (the Login orb's own pulse links, which are idempotent) |
| `node designs/run-mcp.js flow` | 1 call · 8 stray flows removed · **one flow, `SIMBA app`, starting at `Splash / light`** |

**The first links pass found a real defect.** Two connectors came back skipped — *"missing board Profile / light → FollowedPodcasts / light"*. The route exists in the app and the app's Home rail points at it, but the prototype's board registry had never heard of it (§7.4). The registry was fixed, **both** the V1 and the V2 "See all Followed Podcasts" edges were corrected to point at the followed list instead of the catalogue, the whole page was rebuilt, and the second links pass came back with **zero errors**.

**The boards were read back, not assumed.** The shape list of every new board was read out of the live Penpot file through the plugin (`execute_code`), and the counts match the generator exactly:

```
Profile / light            55 shapes  23 text   3 gfx    411x910
Profile / dark             55 shapes  23 text   3 gfx    411x910
Settings / light           99 shapes  38 text   5 gfx    411x1722
Settings / dark            99 shapes  38 text   5 gfx    411x1722
About / light              63 shapes  22 text   2 gfx    411x920
About / dark               63 shapes  22 text   2 gfx    411x920
Help / light               31 shapes  11 text   0 gfx    411x690
Help / dark                31 shapes  11 text   0 gfx    411x690
Privacy / light            18 shapes  15 text   1 gfx    411x460
Privacy / dark             18 shapes  15 text   1 gfx    411x460
Terms / light              17 shapes  14 text   1 gfx    411x438
Terms / dark               17 shapes  14 text   1 gfx    411x438
Credits / light            48 shapes  21 text   1 gfx    411x1162
Credits / dark             48 shapes  21 text   1 gfx    411x1162
Stats / light              40 shapes  24 text   1 gfx    411x728
Stats / dark               40 shapes  24 text   1 gfx    411x728
FollowedPodcasts / light    6 shapes   4 text   0 gfx    411x914
```

**MISSING: []** — every board is on the page (67 boards in total).

The geometry was checked too, not just the names: on `Profile / light` the back button sits at board x + 8, the rules at x + 0, the row labels at x + 16, the chevrons at x + 381 and the counts right-aligned to x + 373 — which is the 16 dp gutter the app's own `SettingsRow` uses.

### 10.5 A new gate

The registry drift (§7.4) was a **silent** failure: a connector was simply skipped and the run still reported success. So the check is now a gate:

```
node designs/check-board-routes.js
```

It reads the app's `RootStackParamList` through the TypeScript AST, compares it against the board registry, and fails on any route that has neither a board nor a stated reason. The four deliberate exclusions (`SongScreen`, `AllVideosScreen`, `MusicDetail`, `NowPlaying` — all deep-link-only) and the one board without an app route (`Splash`, the native `SplashActivity`) are each listed with the reason they are there.

---

## 11. The code plan — for AFTER approval

Nothing in this section runs until the user approves the Penpot boards.

| Wave | Scope | Deletes | Notes |
|---|---|---|---|
| **R1** | **Profile rebuild.** New `ProfileScreen` on the V2 grammar. | The stats grid, the recent chip strip, the Shortcuts block, the Preferences block, the header Sign-out, P-14…P-21 | The one home for the identity block |
| **R2** | **Settings rebuild.** Remove Discover + AccountSection; add the six missing rows; fix the version to read the native build; fix the `[object Object]` a11y label. | The 7 Discover rows | Makes the Help page true |
| **R3** | **About, Credits, Help, Privacy, Terms.** Fix the collapsed list, the three false facts, the gold slab, the Redux claim, the FAQ answers, the duplicate reset. | — | 5 pages, one pass |
| **R4** | **Stats.** One owner for the numbers; the Profile links to it. | The Profile's duplicate cells | |
| **R5** | **Dead code sweep.** 68 dead runtime exports; the Profile's dead imports and styles; `HomeHeader`'s fallback branch. | ~68 exports + dead code | Requires the unused-vars lint rule to come back on, or a manual list |
| **R6** | **Lint gate.** Turn `@typescript-eslint/no-unused-vars` back on for `src/screens/**` and `src/components/**`, with a `_` escape. | — | **Without this, R5 regresses the moment someone adds a line.** |

**Gates for every wave:** `npx tsc --noEmit` · `npx eslint . --ext .ts,.tsx --max-warnings 0` · `node scripts/check-import-boundaries.js` · `node scripts/check-font-resolution.js` · `node node_modules/jest/bin/jest.js --verbose`.

**Deletion rule:** a file is deleted only when it has zero inbound references *and* its exports have zero symbol references across `src/` and `__tests__/`.

---

## 12. The decisions — asked and answered (2026-11-11)

Three questions were put to the user as a questionnaire, because each one changes what gets drawn in Penpot. All three are now closed.

### D-A — Does the Profile keep a count of the library?

**ANSWER: A — one quiet line.** "124 tracks · 8 videos · 6 playlists". No grid, no tiles.

The Profile carries **one** line of counts, set under the "Your Library" divider in the app's own `caption` role (Inter 13/18, secondary). Every number behind it comes from **one** store — the same store the Stats page reads — so the two pages cannot disagree. The 7-cell grid, the orphaned "Playback" tile and the empty-value bug are all gone.

### D-B — The eight settings that exist in the store but have no UI

**ANSWER: B — delete the keys and the six Help answers that point at them.**

So the eight store keys — `rememberPlaybackPosition`, `externalSubtitleDirectories`, `largerControls`, `highContrastSubtitles`, `scanOnLaunch`, `notificationsEnabled`, `appLanguage`, `homeCity` — are **removed from the store**, together with their setters, and the six Help answers that send the user to them are **removed from the FAQ**. The Help page then tells the truth by omission, and the store stops carrying eight promises the app cannot keep.

`autoDeleteDownloads` is **kept** — it is the one key of the batch that has a real UI (the Downloads screen).

> **Consequence worth stating plainly:** "Remember playback position" is a *behaviour*, not only a toggle. Before the key is deleted, the resume behaviour itself must be checked — if the player honours `rememberPlaybackPosition`, deleting the key silently changes playback behaviour. The code wave must read the player path first and either keep the behaviour unconditionally or make the deletion safe. Carried as **CF-20**.

### D-C — Settings' "Discover" section

**ANSWER: A — remove it.** Home's "Explore Contents" rail owns the nine catalogue areas.

Settings becomes a **preferences page and nothing else**, which is what YouTube, Spotify, Apple Music, Plex, Tencent Video and Huawei Video all do.

### The revised code plan (D-B and D-C folded in)

| Wave | Scope | Deletes |
|---|---|---|
| **R1** | **Profile rebuild** on the V2 grammar: unboxed identity, one count line, one list of your things, one Activity row, one Account section. | The 7-cell grid, the recent chip strip, the 8-row Shortcuts block, the Preferences block, the header Sign-out, P-14…P-21 |
| **R2** | **Settings rebuild.** Remove the Discover section and the AccountSection card; read the version from the native build; fix the `[object Object]` a11y label; drop the dead "Accent Color" row or make it real. | The 7 Discover rows, the AccountSection card |
| **R3** | **About, Credits, Help, Privacy, Terms.** Fix the collapsed list, the three false facts, the gold slab, the Redux claim, the FAQ answers, the duplicate reset, and **delete the six Help answers** that point at the deleted keys. | 6 FAQ answers |
| **R4** | **Stats.** One owner for the numbers; the Profile links to it. | The Profile's duplicate cells |
| **R5** | **Dead code sweep** + **the eight store keys** (D-B). | ~68 dead runtime exports · 8 store keys + their setters · 6 FAQ answers · dead imports and styles |
| **R6** | **Lint gate.** Turn `@typescript-eslint/no-unused-vars` back on for `src/screens/**` and `src/components/**`, with a `_` escape. | — |

---

## Carried forward

Every item below is deferred, not done. Each is listed separately so none is lost.

| ID | Item | Source |
|---|---|---|
| CF-01 | The `simbaplayer://` deep links do not resolve on Android — `AndroidManifest.xml` has no intent-filter for the scheme (only `video/*`, `audio/*`, `content://`). All 12 documented examples in `navigation/linking.ts` are dead on Android. `adb shell am start -d 'simbaplayer://profile'` → "Activity not started, unable to resolve Intent". | §1 walk, `android/app/src/main/AndroidManifest.xml` |
| CF-02 | `HomeHeader.tsx:107-113` — `handleAvatarPress` falls back to `navigation.navigate('Settings')` when no `onAvatarPress` is passed. Home always passes one, so the branch is dead, and the comment at `:17` claims the avatar "opens the Profile screen, which is where Settings lives" — which is false; Settings is a separate route. | `src/components/layout/HomeHeader/HomeHeader.tsx` |
| CF-03 | `HomeHeader.tsx:271` — `fontWeight: '700'` on the avatar initial, violating the font rule. | §7.3 |
| CF-04 | `InternalHeader.tsx:130-131, 140` — `fontWeight: '700'` overrides, violating the font rule. | §7.3 |
| CF-05 | The `InternalHeader` title overlay's `paddingHorizontal: 96` truncates long `displaySerif` titles. **Measured on the new boards**: the overlay leaves 411 − 192 = **219 dp** of usable width, and the serif titles are wider than that — "Privacy Policy" 265 px, "Terms of Use" 249 px, "Followed Podcasts" 249 px. The app renders them as "Privacy P…" (measured on the device). **The fix is one number**: `paddingHorizontal: 96 → 64` (`InternalHeader.tsx:121`), which leaves 283 dp. The longest title (265) then fits with 18 dp to spare, and the title still clears the 36 dp back button (ends at x = 44) and the 36 dp right action (starts at x = 367). The boards already draw the titles at their full width — this is the change that makes the app match. | §6.2, §10.4 |
| CF-06 | The `InternalHeader` right action is a fixed 36×36 circle — any text label wraps and clips. | §3, §4 |
| CF-07 | `linking.ts` declares `https://simbaplayer.app` as a prefix. The domain is not the app's repo owner and was never verified. | `src/navigation/linking.ts` |
| CF-08 | `src/services/cacheService.ts:28` — `getCacheSize` is dead. (`formatBytes` is **used** by the Downloads screen; an earlier reading of this repo was wrong about that.) | §7.2 |
| CF-09 | `src/screens/About/components/AboutScreen.tsx:35-46, 260-262` — the `LinkItem` comment claims the `as any` cast was removed; it is still there. | §6.5 |
| CF-10 | `src/navigation/linking.ts` — `Stats: 'stats',` is indented out of alignment with its siblings. Cosmetic. | `src/navigation/linking.ts` |
| CF-11 | `src/screens/Profile/types/index.ts:3` — `ProfileScreenProps` duplicates the screen's local `Props` type. | §4.3 |
| CF-12 | `src/state/settingsStore.ts:162` — the default `preferredLanguages` is `'eng, jpn, und'`, and `und` is shown verbatim in the Settings UI. | §6.4 |
| CF-13 | The Help page's `support@simbaplayer.app` and the About page's `support@simbaplayer.app` mailto are unverified domains. | §6.5 |
| CF-14 | `src/screens/Profile/components/ProfileScreen.tsx:186-201` — a signed-out user sees an empty grey card where the identity block should be. | §4.3 |
| CF-15 | The Settings screen's `SettingsRow` touch targets are full-bleed (x = 0.000, width = 1.000) while the Profile's are inset (x = 0.039, width = 0.922) — one component, two grammars. | §6.4 |
| CF-16 | `.eslintrc.js:66,67,118` — the unused-vars rule is off in three places, so the gates cannot see dead code. §11 R6 turns it back on. | §7.1 |
| CF-17 | The Penpot flow's Home board is still **V1** (`Home / light`, `Home / dark`) while the app renders **V2** (`Home_V2_Light`, `Home_V2_Dark`). Carried from `HOME_V2_REFACTOR.md` §16. | `designs/build-penpot-app.js` |
| CF-18 | **B-019 — Argent 0.30.1 → 0.32.0.** Needs the user's explicit informed consent. **Do it LAST.** Do not update autonomously. | standing backlog |
| CF-19 | The Penpot Play hand walk, the un-measured device proofs (empty library / "first run" board, pinned playlist, bookmark, long-press menu), the seeded-data proofs (F-065 ×2, F-066), the 2026-11-03 native crash, the 75-site weight-intent sweep, the API 24–30 PiP path, NO-JANK, B-018, the v7 doc rename banners, iOS verification, the dark-theme variants for the remaining screens, the optional `Allura.ttf` upload, the page-by-page loop for the remaining ~48 screens, `graphify-out/`, F-10, F-13, F-15, F-17, B-050 — all carried unchanged. | `HOME_V2_REFACTOR.md` |
| CF-20 | **Decision D-B has a behavioural consequence.** `rememberPlaybackPosition` is not only a toggle — the player's resume path may read it. Before the key is deleted, the resume behaviour must be read and either kept unconditionally or the deletion made safe. The same check applies to `scanOnLaunch` (does anything trigger a scan at launch?) and `notificationsEnabled` (the manifest asks for `POST_NOTIFICATIONS` — is the service gated on this key?). | §12 D-B |
