# Content ownership — Home → Profile → Settings

**Status:** analysis, 2026-11-11. Nothing in §5 has been built yet.
**Companions:** `md/PROFILE_RC1_REFACTOR.md` (the Profile's own rebuild, §13) · `md/HOME_V2_REFACTOR.md` (Home's redesign).

---

## 1. The complaint, and the evidence for it

The owner asked for this after the R1 wave:

> "i think your library is a repeat, DRY in UI also, with home page gets more priority then profile then settings, re examine UI, we dont want user to think we fill with same content again and again."

The repetition is real, and it is not a matter of taste. It is visible in the app's live component tree, read off `emulator-5554` through Argent's Metro debugger on 2026-11-11.

### 1.1 What the two screens actually render, side by side

```
HomeHeader (tap: 0.50,0.07)
  TouchableOpacity "Open profile" (tap: 0.91,0.07)
FlatList
  WeatherGreetingComponent          "Good morning, Paval"
  AppText "Discover"                                    ← Cormorant divider
  SectionHeader "Explore Contents"
  FlatList  →  "Movies", "Podcasts", …                   ← 9 cards
Fab "Play media file"

InternalHeader "Profile" (tap: 0.50,0.06)
  TouchableOpacity → SvgIcon (the gear)
ScrollView
  Avatar / AppText "Paval E P" / AppText "pavalep@gmail.com"
  AppText "Your Library"                                 ← Cormorant divider
  AppText "0 tracks · 0 videos · 0 playlists"
  TouchableOpacity "Playlists, 0"
  TouchableOpacity "Bookmarks, 0"
  TouchableOpacity "History"
  TouchableOpacity "Downloads, 0"
  TouchableOpacity "Followed podcasts, 0"
  TouchableOpacity "Local files, 0"
  AppText "Activity"
  TouchableOpacity "Playback statistics"
  AppText "Account"
  TouchableOpacity "Sign out"
  TouchableOpacity "Revoke Google access"
  TouchableOpacity "Clear local data"
```

**On this device, Home has NO "Your Library" section at all** — because the library is empty and *"a rail with nothing in it is not drawn"* (`useHomeScreen.ts:373`). The Profile, on the same device, shows a "Your Library" heading over **six rows that all read zero**, plus a line reading "0 tracks · 0 videos · 0 playlists".

So the Profile is not merely redundant. On an empty library it is a page of zeros, and the same words — "Your Library" — head two different sections on two different screens.

### 1.2 Every row on the Profile is a row Home already has

| The Profile's row (R1) | Goes to | Home's version of the same thing |
|---|---|---|
| Playlists → `AllPlaylistsScreen` | All Playlists | the **Pinned Playlists** rail's "See All" (`useHomeScreen.ts:84-86`) |
| Bookmarks → `Bookmarks` | Bookmarks | the **Bookmarks** rail (`useHomeScreen.ts:359`) |
| History → `History` | History | the **Recently Played** rail's "See All" (`useHomeScreen.ts:346-352`) |
| Downloads → `Downloads` | Downloads | the **Library** page's own Downloads button (`LibraryScreenContent.tsx:460`) |
| Followed podcasts → `FollowedPodcasts` | My Podcasts | the **Followed Podcasts** rail (`useHomeScreen.ts:360`) |
| Local files → `Library` | the Library | the **"Local Files" card** in Home's Discover rail (`BrowseAllShelf.tsx:103-106` → `useHomeScreen.ts:306-308`) |
| the count line "N tracks · N videos · N playlists" | — | the **Library** page's own counts, and the Stats page's counts |

**Six of seven, and the count line. All repeated.**

And the duplication is not only against Home. Settings repeats the Profile (the account card draws the identity again), Settings repeats Home (its "Discover" section is the nine browse cards again), and Settings repeats the About page (its "About" section is a second index of the About page's own link list).

---

## 2. The principle

> **One owner per piece of content. Every screen that is not the owner links to it; it does not re-print it.**

And the priority the owner set:

> **Home › Profile › Settings**

Read as: *when two screens could own the same content, the higher one wins.*

| Screen | Its one job | The test |
|---|---|---|
| **Home** | **your stuff, and what to play** | it is where the library lives, so nothing else re-lists the library |
| **Profile** | **you** — who you are, what you have done, and the account itself | nothing on it may be a list of your media |
| **Settings** | **how the app behaves** | nothing on it may be a fact about you or about the app; only preferences |

This is not an invention. It is what every shipping app of this class does:

| App | The avatar/account page carries | The library lives |
|---|---|---|
| YouTube / YouTube Music | Your channel, History, Playlists, Watch later, Downloads, Settings, Help, Feedback, **Privacy policy**, **Terms of service**, Sign out | the Home feed + Your channel |
| Spotify | Account, Upgrade, Download, **Privacy**, **Support**, Sign out | a separate **Library** surface |
| Apple Music | Account Settings, Subscription, Sign Out | a separate **Library** surface |
| Plex | Preferences, Sign In, Manage Library Access, Download & Sync, Playback, Consume code, Manage Account | Home (Watch Later / Recently Added) |
| Tencent Video / Huawei Video | Settings, **My downloads**, Cache management, Feedback, About, **Privacy policy** | the "My" / Home tab |

Three things every one of them agrees on, and the three rules this app will now follow:

1. **The account page carries identity, activity, account actions, help and legal — and NOT a library index.** Not one of them puts "Playlists / Bookmarks / History / Downloads" in a list on the account page *and* on Home.
2. **The account page carries Help and Privacy/Terms; the preferences page carries only preferences.**
3. **One door per page.** A page is reached from one place; a screen that links to it does not also re-print its contents.

---

## 3. The ownership table

Every content item in the app, and the screen that owns it.

| # | Content | **Owner** | The doors to it | Not on |
|---|---|---|---|---|
| 1 | Recently played (the rail) | **Home** | the rail → `History` | Profile, Settings |
| 2 | Your playlists (the rail) | **Home** | the rail → `AllPlaylistsScreen` | Profile, Settings |
| 3 | Your bookmarks (the rail) | **Home** | the rail → `Bookmarks` | Profile, Settings |
| 4 | Followed podcasts (the rail) | **Home** | the rail → `FollowedPodcasts` | Profile, Settings |
| 5 | The local media library | **Home** | the "Local Files" card → `Library` | Profile, Settings |
| 6 | Offline / downloaded media | **`Library`** | the Library's Downloads button → `Downloads` | Profile |
| 7 | Playback statistics (plays, streak, top media) | **`Profile`** | the Profile's "Activity" row → `Stats` | Home, Settings |
| 8 | Who you are (avatar, name, email, signed-in state) | **`Profile`** | the Home header's avatar → `Profile` | Home, Settings |
| 9 | Sign out · Revoke Google access · Clear local data | **`Profile`** | the Profile's "Account" group | Home, Settings |
| 10 | Help / FAQ | **`Profile`** | the Profile's "Support" group → `Help` | Settings |
| 11 | About Simba — version, credits, licences, privacy, terms, changelog, rate, share, report a bug, contact | **`Profile`** → `About` | the Profile's "Support" group → `About` | Settings |
| 12 | Theme, accent, hardware acceleration, audio normalisation, dialogue boost, skip silence, subtitle language/style/colour/opacity, auto-load subtitles, equalizer | **`Settings`** | the Profile's gear → `Settings` | Home, Profile |
| 13 | Linked folders, MPV options, auto-delete downloads | **`Settings`** | the Profile's gear → `Settings` | Home, Profile |
| 14 | Reset preferences | **`Settings`** | the Profile's gear → `Settings` | Home, Profile |

Two consequences fall out of the table and are worth stating plainly:

- **Downloads moves off the Profile** (row 6). It is offline copies of library media, the Library page already owns the door (`LibraryScreenContent.tsx:460`) and shows the count, and the post-download button already leads there (`DownloadButton.tsx:73`). Three doors for one list; it becomes one.
- **The About group leaves Settings** (rows 10-11). The About page *already is* the hub — its own `LINK_ITEMS` list Changelog, Credits, Licenses, Privacy, Terms, Rate, Share, Report a bug and Contact (`AboutScreen.tsx:56-114`). Settings' "About" section was a **second index of the same links**. The About page keeps the hub; the Profile keeps the one door.

---

## 4. The duplication map — everything that repeats today

| Content | Where it repeats | Citations |
|---|---|---|
| The identity block | the Profile, and Settings' account card | `ProfileScreen.tsx` (identity), `SettingsScreen.tsx:119` `<AccountSection />` |
| "Your Library" | as a heading on Home **and** on the Profile | `useHomeScreen.ts:386-390`, `ProfileScreen.tsx` |
| Playlists | Home's rail, the Profile's row | `useHomeScreen.ts:358`, Profile row → `AllPlaylistsScreen` |
| Bookmarks | Home's rail, the Profile's row | `useHomeScreen.ts:359`, Profile row → `Bookmarks` |
| Recently played / History | Home's rail, the Profile's row | `useHomeScreen.ts:346-352`, Profile row → `History` |
| Followed podcasts | Home's rail, the Profile's row | `useHomeScreen.ts:360`, Profile row → `FollowedPodcasts` |
| Local media | Home's "Local Files" card, the Profile's row | `BrowseAllShelf.tsx:103`, `useHomeScreen.ts:306-308`, Profile row → `Library` |
| Downloads | the Library's button, the post-download button, the Profile's row | `LibraryScreenContent.tsx:460`, `DownloadButton.tsx:73`, Profile row → `Downloads` |
| The nine catalogue areas | Home's Explore Contents, Settings' "Discover" section | `BrowseAllShelf.tsx`, `SettingsScreen.tsx:161-168` |
| Changelog · Credits · Licenses · About | the About page's own link list, **and** Settings' "About" section | `AboutScreen.tsx:56-114`, `SettingsScreen.tsx:341-352,380-383` |
| The app version | the About page, **and** Settings' "Version" row | `AboutScreen.tsx` (version block), `SettingsScreen.tsx:336-339` |
| The library counts | the Profile's count line, the Library page, the Stats page | Profile count line; `StatsScreen.tsx:68-75` |

---

## 5. The redesign

### 5.1 The Profile — "you"

```
[back]        Profile                                    [gear]
                  (avatar)  Paval E P
                            pavalep@gmail.com

── Activity ──
  Playback statistics                                    >
── Account ──
  Sign out                                              >
  Revoke Google access                                   >
  Clear local data                                       >
── Support ──
  Help                                                   >
  About Simba                                            >
```

Six rows, three groups, the identity, and the gear.

- **"Your Library" is gone**, and so is the count line. The Profile is no longer a second index of the library, and the word no longer heads two sections on two screens.
- **"Activity"** is the one thing the Profile owns that nothing else shows: the plays, the streak and the top media. `Stats` is reachable from nowhere else in the app (`grep navigate('Stats'` → the Profile only), so this row is its single door.
- **"Account"** holds the three things that act on the account itself. Only "Sign out" is red — the other two sit behind a confirmation dialog, and three red rows read as an error screen.
- **"Support"** holds Help and About Simba. Help's only other door was Settings' About section; the About page's hub already owns privacy, terms, credits, licences and the changelog, so the Profile does not re-print them.
- The **gear** stays the one door to Settings.

**Nothing on this page appears on Home, and nothing on it appears on Settings.**

### 5.2 Settings — "how the app behaves"

```
Appearance      Theme · Accent colour (Gold — a fact, not a setting)
Playback        Hardware acceleration · Audio normalisation · Dialogue boost
                Skip silence · Subtitle language · Audio settings
Subtitles       Font size · Text colour · Background opacity · Auto-load subtitles
Library         Linked folders · MPV options
                Reset preferences
```

Removed from Settings, and why:

| Removed | Why |
|---|---|
| the account card | the Profile owns the identity |
| the whole **Discover** section (7 rows) | Home's Explore Contents owns the nine catalogue areas (decision D-C) |
| **About Simba**, **Credits**, **Changelog**, **Help**, **Licenses** | the About page owns the hub; these were a second index of it |
| the **Version** row | the About page owns the version — one owner per fact |
| — | "Reset preferences" **stays**: it is a preferences action |

### 5.3 Home — unchanged, and that is the point

Home already owns the library and already does it well: the greeting, "Your Library" (up to four rails, each with a "See All"), "Discover" (one rail, nine cards). **No change is proposed to Home.** The redundancy was never in Home — it was in the two screens that repeated it.

### 5.4 The internal pages

*See §6 — the source sweep of History, Bookmarks, All Playlists, Downloads, Followed Podcasts, Library, Stats and the rest, and the three defects it found.*

### 5.5 The boards in Penpot

The design lives on the `SIMBA` page, in light and dark.

**`Profile / light` and `Profile / dark`** — 411 × 672, 37 shapes each. Read back out of the live file, the whole board is:

```
Profile                                    (serif title, 48)
PE                          (the avatar disc, 72)
Paval E P
pavalep@gmail.com
Activity
  Playback statistics
Account
  Sign out                               (the only red row)
  Revoke Google access
  Clear local data
Support
  Help
  About Simba
```

**`Settings / light` and `Settings / dark`** — the About section is gone; the board now reads:

```
Appearance      Theme (System) · Accent colour (Gold)
Playback        Hardware acceleration · Audio normalisation · Dialogue boost
                Skip silence · Subtitle language · Audio settings
Subtitles       Font size · Text colour · Background opacity · Auto-load subtitles
Library         Linked folders · MPV options
Reset           Reset preferences
```

**The connectors, resolved to their target boards** (read back by mapping `action.destination.id` through the live board list — a count is not a proof that a link landed):

```
Profile / light :: Profile right glyph     -> Settings / light
Profile / light :: Profile Stats label     -> Stats / light
Profile / light :: Profile Sign out label  -> Login / light — orb rest
Profile / light :: Profile Help label      -> Help / light
Profile / light :: Profile About label     -> About / light
Settings / light :: Settings Audio Settings label -> AudioSettings / light
Settings / light :: Settings Linked Folders label  -> LinkedFolders / light
```

The thirteen edges that are **gone**: the Profile's six library rows (History, Stats kept; Bookmarks, All Playlists, Followed Podcasts, Downloads, Library removed) and Settings' seven About rows (About Simba, Credits, Changelog, Help, Open source licences, Privacy policy, Terms of use). Each of those pages keeps exactly one door — the About page's.

**The run:** 17 build calls, 0 errors, 63 boards · 15 link calls, 0 errors, **362 connectors**, 8 skipped (the Login orb's own pulse links, which are idempotent) · 1 flow call, one flow `SIMBA app` starting at `Splash / light` · the page holds **67 boards**.

**No media were uploaded** — the redesign reuses the app's own glyphs, so the plan reported `media ids known: 89/89` and the upload step had nothing to do.

---

## 6. The internal pages

Every page reachable from the Profile's rails, read from source. The question asked of each one: **what is this page's one job, and does anything else print the same thing?**

### 6.1 What each page does today

| Page | Its job | Its content | Its doors in |
|---|---|---|---|
| **History** | the full playback history | a "Clear all" button, a search field, 4 filter chips (All/Video/Audio/Streaming), the rows with a resume bar and a remove "×" | Home's "Recently Played → See All"; **the Profile's "History" row**; `simbaplayer://history` |
| **Bookmarks** | the saved moments | a header action reading **"N saved"**, a search field, the grouped list | Home's "Bookmarks → See All"; **the Profile's "Bookmarks" row**; `simbaplayer://bookmarks` |
| **All Playlists** | every playlist, pinned first | a "Create" button, 3 kind filters (All/audio/video), a "Pinned" section, an "Other playlists" section, cards with a visible pin toggle | Home's "Pinned Playlists → See All"; **the Profile's "Playlists" row** |
| **Downloads** | the offline media | an "N items" subtitle, a **Storage** card with a usage bar, an **auto-delete policy** chip row (Off/5/10/25/50), the download rows | the Library page's Downloads button; the post-download button; **the Profile's "Downloads" row**; `simbaplayer://downloads` |
| **My Podcasts** | the followed feeds | one flat list: artwork, title, author, episode count, "Unfollow" | Home's "Followed Podcasts → See All"; **the Profile's "Followed podcasts" row** |
| **Library** | the local media | a tappable title that opens a "Select View" dropdown (Library / Playlists), a view toggle, the **Downloads** button, a segment rail (Folders/Audio/Artists/Albums), sort + filter chips, the "N files in library" banner, and a **Playlists** content mode | Home's "Local Files" card; the Profile's "Local files" row; the Downloads screen; Stats' empty state; the folder wizard |
| **Stats** | the playback numbers | a 6-card grid (Plays, Playback Time, Tracks, Videos, Days Active, Day Streak) and a "Most Played" top-5 list | **the Profile's "Playback statistics" row only**; `simbaplayer://stats` |

### 6.2 What repeats between them

| Content | Shown by | Cited |
|---|---|---|
| **The playlist list and the same 3 kind-filter chips** | All Playlists **and** the Library's "Playlists" content mode — both read `usePlaylists()` and both use `LOCAL_PLAYLIST_FILTERS` | `useAllPlaylistsScreen.ts:56-60`, `useLibraryScreen.ts:119,142-145`, `localFilesConfig.ts:58-65` |
| **Creating a playlist** | All Playlists' header button **and** the Library's "+" FAB | `AllPlaylistsScreen.tsx:145-150`, `LibraryScreenContent.tsx:429-433` |
| **The bookmark count** | Bookmarks' "N saved" **and** the Profile's row trailing count | `BookmarksScreen.tsx:84`, `ProfileScreen.tsx:238-240` |
| **The bookmark list** | Bookmarks **and** Home's rail | `useBookmarksScreen.ts:41`, `useHomeScreen.ts:359` |
| **The download count** | Downloads' "N items" **and** the Profile's row trailing count | `DownloadsScreen.tsx:199-201`, `ProfileScreen.tsx:249-251` |
| **The local-file total** | the Library's "N files in library" **and** the Profile's "Local files" count — **both `useMediaStore.tracks.length`** | `ScanProgressBanner.tsx:158-161`, `ProfileScreen.tsx:261-263` |
| **Tracks / Videos** | Stats' two cards **and** the Profile's count line — **both `useSessionStore.mediaLibrary`** | `StatsScreen.tsx:43,68-75`, `ProfileScreen.tsx:227` |
| **Resetting the preferences** | Settings' "Reset preferences" **and** the About page's footer "Reset all settings" | `SettingsScreen.tsx:358-378`, `AboutScreen.tsx:382-391` |
| **The version** | Settings (from `package.json`) **and** About (a hard-coded string) | `SettingsScreen.tsx:336-339`, `AboutScreen.tsx:316-320` |
| **The library names** | About's "Built with" chips, Credits' grouped libraries, Licenses' texts | `AboutScreen.tsx:117`, `CreditsScreen.tsx:26-66`, `LicensesScreen.tsx:28-92` |
| **Changelog / Credits / Licences / About entry points** | Settings' About section **and** the About page's own link list | `SettingsScreen.tsx:341-383`, `AboutScreen.tsx:56-114` |

One thing the sweep proved and it is worth stating: **History, Bookmarks, All Playlists and Downloads each show only their own domain.** None of them prints another one's list or count. The repetition is not between those pages — it is between those pages and **Home**, the **Profile**, the **Library** and the **About** page.

### 6.3 Three defects the sweep found, which are worse than the repetition

**1. The Bookmarks "N saved" chip is a delete-everything button wearing a count's clothes.**
`BookmarksScreen.tsx:84` renders the count as the header's right action, and its `onPress` is `handleClearAll` (`:60-70`) → a confirm dialog → `clearAllBookmarks()`. A user who taps "12 saved" because it looks like information is offered a wipe of every bookmark they have. **A count must not be a destructive control.**

**2. On the Downloads screen, a finished download cannot be opened, and its action button re-downloads it.**
The row body is a plain `View` (`DownloadsScreen.tsx:84`), so a completed download cannot be played from the list. And on a `done` row the first action button draws a *download* icon (`:127`) but calls `resumeDownload` (`useDownloadsScreen.ts:67-70` → `downloadService.ts:484-496`) — which **re-downloads the file that is already there**.

**3. History's pull-to-refresh does nothing.**
`HistoryScreen.tsx:80-83` flips a boolean for one animation frame and never re-reads anything. Every rail on Home is fed by a live persisted store, so there is nothing to refresh — the same reasoning that already removed Home's pull-to-refresh.

### 6.4 What changes on the internal pages

| Page | Change | Why |
|---|---|---|
| **Bookmarks** | the count becomes a **plain, non-pressable label**; "Clear all bookmarks" becomes an explicit, named control | §6.3.1 — a count is not a button |
| **All Playlists** | keeps the playlist list and the kind filters — it is the **owner** | it is the one page that lists every playlist |
| **Library** | the **"Playlists" content mode is removed**; the title dropdown's "Playlists" entry navigates to All Playlists instead | §6.2 — the same list and the same chips on two pages |
| **Library** | the "+" create-playlist FAB is removed (All Playlists owns creation) | §6.2 |
| **Downloads** | the row body becomes **pressable** and plays the file; the "done" row's action becomes **Play** | §6.3.2 |
| **Downloads** | the auto-delete policy chips stay on this page — the policy is about these downloads | one owner, and it is the page that shows what the policy affects |
| **History** | the pull-to-refresh is removed | §6.3.3 |
| **Stats** | unchanged — it is the owner of the playback numbers | — |
| **About** | the footer's "Reset all settings" is removed (Settings owns it); "Built with" is corrected to the stack the app actually uses | §6.2 — one owner per fact |

### 6.5 The About page, and the three pages that name libraries

About's "Built with" chips, Credits' grouped library list and Licenses' full texts all name the same libraries. That is a **summary → detail → legal** chain, not a repetition — the same shape as "6 videos" → the Videos page. What makes it slop today is that the summary is **false**: it says "Redux Toolkit" and the app uses Zustand 5 + MMKV.

So the summary stays, corrected, and Credits keeps the detail. What is removed is the *second index*: Settings' About section, which re-listed About's own links.

---


## 7. What this costs in code

| Wave | Change | Files |
|---|---|---|
| **R1b** | The Profile loses "Your Library", the count line and the five duplicated rows; gains the "Support" group (Help, About Simba) | `src/screens/Profile/components/ProfileScreen.tsx` |
| **R2** | Settings loses the account card, the Discover section (D-C), the About section and the Version row; keeps "Reset preferences" | `src/screens/Settings/components/SettingsScreen.tsx` |
| **R2** | The About page owns the version; its footer "Reset all settings" is removed; "Built with" is corrected | `src/screens/About/components/AboutScreen.tsx` |
| **R3** | The Bookmarks count stops being a destructive control | `src/screens/Bookmarks/components/BookmarksScreen.tsx` |
| **R3** | The Downloads rows become playable; the "done" action becomes Play | `src/screens/DownloadsScreen/**` |
| **R3** | The Library's "Playlists" content mode and its create FAB are removed; its title dropdown navigates to All Playlists | `src/features/library/presentation/**` |
| **R3** | History's pull-to-refresh is removed | `src/screens/History/components/HistoryScreen.tsx` |
| **R4** | Stats is untouched — it is the owner | — |
| **R5** | The dead `textContent` strings in Bookmarks, and the rest of the dead-code sweep | — |

Two things are **not** changed: **Home is untouched**, and **no route is deleted**. The redundancy was never in Home — it was in the screens that repeated it.

---

## 8. Carried forward

| ID | Item |
|---|---|
| CO-01 | The Profile's Activity row is the **only** door to `Stats`. If Stats ever grows a section of its own, the Profile's row must be re-checked against it. |
| CO-02 | `Downloads` is reachable from the Library page and from the post-download button. Both are contextual shortcuts to the page that owns it; neither re-prints its contents. |
| CO-03 | The About page's `LINK_ITEMS` list is a hub. It must not grow a second copy of the Profile's "Support" rows. |
| CO-04 | Settings' "Accent colour — Gold" row has **no `onPress`**: it is a fact, and the board draws it without a chevron. If it ever becomes a setting, it needs a real control. |
| CO-05 | The App Store and the Play Store both require the privacy policy to be findable. The chain is now Profile → About Simba → Privacy policy (two taps). Verified as still reachable before RC1 ships. |
| CO-06 | The Profile's six rows leave a lot of quiet space below them. That is the V2 grammar (the Home greeting is unboxed and airy too), but it is a **judgement call, not a measurement** — if it reads as empty on the device, the answer is more content, not more padding. |
| CO-07 | The Downloads page owns the auto-delete policy (`autoDeleteDownloads`) as chips **on the content page**, while every other preference lives in Settings. It is coherent (the policy is about these downloads) but it is the one preference that does not live in Settings. |
| CO-08 | The sweep could not determine from source whether `useDownloadsSync()` keeps `useDownloadsStore.records` in sync with `downloadService` at the moment the Downloads page opens. Worth a device proof. |

