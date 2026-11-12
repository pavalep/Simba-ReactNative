#!/usr/bin/env node
/**
 * app-boards.js — the prototype's board registry and its connector graph.
 *
 * TWO THINGS LIVE HERE
 * --------------------
 *
 * 1. **The board registry** — the screens the prototype covers.
 *
 *    "Actually being used" is the rule: a screen is in the registry if an
 *    in-app tap can reach it, or if it is part of the auth flow. That
 *    excludes four routes which are deep-link-only (`SongScreen`,
 *    `AllVideosScreen`, `MusicDetail`, `NowPlaying`) — `NowPlaying`
 *    additionally renders `null`, so it has nothing to draw.
 *
 * 2. **The connector graph** — every navigation edge, taken from the app's
 *    own source. The edges are the app's `navigate(...)` calls; the
 *    inventory that produced them is quoted in `md/UI_UX_PROTOTYPE_REBUILD.md`.
 *
 * WHY EVERY SCREEN IS A BOARD FROM DAY ONE
 * ----------------------------------------
 * A prototype is only useful if **Play** walks the app. If the other 48
 * screens did not exist yet, Home would have nothing to link to and the
 * flow would be a dead end — so every screen gets a board immediately, and
 * the pages are then designed one at a time, each replacing its
 * placeholder. The map is complete from the first minute; the design work
 * fills it in.
 *
 * A placeholder board is honest: it says, in the app's own type, that the
 * screen is not designed yet and points at the tracker.
 */

'use strict';

const {SCREEN_W, SCREEN_H} = require('./kit');

/**
 * The screens, in the order the app's navigators declare them.
 *
 * `group` is only for the board's caption — it says which part of the app
 * the screen belongs to, so a placeholder reads as a map rather than as a
 * list of names.
 */
const ROUTES = [
  // ── Auth ──
  // The native splash — the `SplashActivity` the launcher starts, not
  // a JS route.
  {route: 'Splash', title: 'Splash', group: 'Sign in'},
  {route: 'Login', title: 'Login', group: 'Sign in'},

  // ── The main four ──
  {route: 'Home', title: 'Home', group: 'Main'},
  {route: 'Library', title: 'Library', group: 'Main'},
  {route: 'Search', title: 'Search', group: 'Main'},
  {route: 'Profile', title: 'Profile', group: 'Main'},

  // ── The Profile's own pages ──────────────────────────────────────
  //
  // There is no "Settings" page any more (2026-11-11,
  // `md/PROFILE_SETTINGS_MERGE.md`): the preferences were merged into the
  // Profile, so the pages the Profile leads to are these — the About page
  // and its hub, the audio pages, the folder pages and the legal pages.
  {route: 'About', title: 'About', group: 'Profile'},
  {route: 'AudioSettings', title: 'Audio Settings', group: 'Profile'},
  {route: 'Equalizer', title: 'Equalizer', group: 'Profile'},
  {route: 'LinkedFolders', title: 'Linked Folders', group: 'Profile'},
  {route: 'FolderLinkingWizard', title: 'Link a Folder', group: 'Profile'},
  {route: 'Changelog', title: 'Changelog', group: 'Profile'},
  {route: 'Licenses', title: 'Open Source Licenses', group: 'Profile'},
  {route: 'Credits', title: 'Credits', group: 'Profile'},
  {route: 'Privacy', title: 'Privacy Policy', group: 'Profile'},
  {route: 'Terms', title: 'Terms of Service', group: 'Profile'},
  {route: 'Help', title: 'Help', group: 'Profile'},

  // ── The user's own library ──
  {route: 'Bookmarks', title: 'Bookmarks', group: 'Your library'},
  {route: 'History', title: 'History', group: 'Your library'},
  {route: 'Stats', title: 'Stats', group: 'Your library'},
  {route: 'Downloads', title: 'Downloads', group: 'Your library'},
  {route: 'PlaylistDetail', title: 'Playlist', group: 'Your library'},
  {route: 'AddToPlaylist', title: 'Add to Playlist', group: 'Your library'},
  {route: 'FolderBrowser', title: 'Folder Browser', group: 'Your library'},
  {route: 'AllAudioScreen', title: 'All Audio', group: 'Your library'},
  {route: 'AllPlaylistsScreen', title: 'All Playlists', group: 'Your library'},
  {route: 'ArtistScreen', title: 'Artist', group: 'Your library'},
  {route: 'AlbumScreen', title: 'Album', group: 'Your library'},
  {route: 'GenreScreen', title: 'Genre', group: 'Your library'},
  {route: 'ArtistDetail', title: 'Artist', group: 'Your library'},
  {route: 'AlbumDetail', title: 'Album', group: 'Your library'},
  // "My Podcasts" — the feeds the user FOLLOWS.
  //
  // This board was missing until 2026-11-11. The app's Home rail has pointed
  // at `FollowedPodcasts` since the rail's own comment says so
  // (`src/screens/Home/index.tsx:71-80`), but the prototype's registry had
  // never heard of the route, so the prototype's "See all Followed Podcasts"
  // connector pointed at the CATALOGUE — the very page the app's comment
  // says cannot answer the question. The route exists
  // (`src/navigation/types.ts:88-96`); the registry had simply drifted.
  {route: 'FollowedPodcasts', title: 'Followed Podcasts', group: 'Your library'},

  // ── The catalogue ──
  {route: 'MoviesScreen', title: 'Movies', group: 'Browse'},
  {route: 'MovieDetail', title: 'Movie', group: 'Browse'},
  {route: 'PodcastsScreen', title: 'Podcasts', group: 'Browse'},
  {route: 'PodcastDetail', title: 'Podcast', group: 'Browse'},
  {route: 'MusicScreen', title: 'Music', group: 'Browse'},
  {route: 'RadioScreen', title: 'Live Radio', group: 'Browse'},
  {route: 'RadioFavoritesScreen', title: 'Radio Favourites', group: 'Browse'},
  {route: 'LiveTVScreen', title: 'Live TV', group: 'Browse'},
  {route: 'LiveTVFavoritesScreen', title: 'TV Favourites', group: 'Browse'},
  {route: 'AudiobooksScreen', title: 'Audiobooks', group: 'Browse'},
  {route: 'AudiobookDetail', title: 'Audiobook', group: 'Browse'},
  {route: 'ArchiveScreen', title: 'Internet Archive', group: 'Browse'},
  {route: 'ArchiveItemDetail', title: 'Archive Item', group: 'Browse'},
  {route: 'ShowsScreen', title: 'Shows', group: 'Browse'},
  {route: 'ShowDetail', title: 'Show', group: 'Browse'},

  // ── The player ──
  {route: 'Queue', title: 'Queue', group: 'Player'},
];

/**
 * The connector graph.
 *
 * `from` / `to` are ROUTE names. `shape` is the name of the shape on the
 * `from` board that carries the link — when it is given, the connector
 * fires from that element (the button the user would actually press);
 * when it is omitted, the whole board is the hit target, which is what a
 * placeholder board can offer.
 *
 * `family` and `also` exist because of how Penpot's Play viewer hit-tests:
 * the TOPMOST shape under the pointer wins, and there is no fall-through.
 * A card is drawn as several shapes (the cover, the scrim, the icon disc,
 * the title, the description), and the title sits ON TOP of the cover — so
 * a connector on the cover alone is dead wherever the text is. Every shape
 * of the unit therefore carries the same connector:
 *
 *   • `family` — a name prefix. Every shape on the board whose name starts
 *     with `family + ' '` gets the connector. The families are the drawing
 *     kit's own names ("Browse card Movies artwork", "Browse card Movies
 *     title", …), so the rule cannot drift from the drawing.
 *   • `also` — individual extra shapes, for the units whose parts do not
 *     share a prefix (the Login screen's button label and Google mark).
 *
 * Every edge here was read out of the app's own navigation calls. The
 * file:line for each one is in `md/UI_UX_PROTOTYPE_REBUILD.md`.
 */
const EDGES = [
  // ── Auth ──
  // The native splash holds for 1.5 s (`SplashActivity.kt`'s
  // `splashDuration = 1500L`) and then hands over to the RN app.
  {from: 'Splash', to: 'Login', trigger: 'after-delay', delay: 1500, label: 'auto → Login'},
  {
    from: 'Login',
    to: 'Home',
    trigger: 'click',
    shape: 'Sign in with Google',
    also: ['Button label', 'Google mark'],
    label: 'Sign in with Google',
  },

  // ── Home ──
  //
  // Every edge below is an `navigate(...)` the app itself makes, read out
  // of `src/screens/Home/hooks/useHomeScreen.ts` and the Home components.
  // The SHAPE names are the drawing kit's own shape names, and the
  // `family` is the prefix every shape of that unit carries — rule P10:
  // the whole card is the target, not the picture of the card.
  {from: 'Home', to: 'Search', trigger: 'click', shape: 'Home header search', family: 'Home header search', label: 'Search'},
  {from: 'Home', to: 'Profile', trigger: 'click', shape: 'Home header avatar', family: 'Home header avatar', label: 'Open profile'},
  {from: 'Home', to: 'MoviesScreen', trigger: 'click', shape: 'Browse card Movies artwork', family: 'Browse card Movies', label: 'Movies'},
  {from: 'Home', to: 'PodcastsScreen', trigger: 'click', shape: 'Browse card Podcasts artwork', family: 'Browse card Podcasts', label: 'Podcasts'},
  {from: 'Home', to: 'MusicScreen', trigger: 'click', shape: 'Browse card Music artwork', family: 'Browse card Music', label: 'Music'},
  {from: 'Home', to: 'RadioScreen', trigger: 'click', shape: 'Browse card Radio artwork', family: 'Browse card Radio', label: 'Radio'},
  {from: 'Home', to: 'LiveTVScreen', trigger: 'click', shape: 'Browse card Live TV artwork', family: 'Browse card Live TV', label: 'Live TV'},
  {from: 'Home', to: 'AudiobooksScreen', trigger: 'click', shape: 'Browse card Audiobooks artwork', family: 'Browse card Audiobooks', label: 'Audiobooks'},
  {from: 'Home', to: 'ShowsScreen', trigger: 'click', shape: 'Browse card Shows artwork', family: 'Browse card Shows', label: 'Shows'},
  {from: 'Home', to: 'ArchiveScreen', trigger: 'click', shape: 'Browse card Archive artwork', family: 'Browse card Archive', label: 'Archive'},
  // "Local Files" is not a screen of its own: `handleSeeAll` maps it onto
  // the Library (`useHomeScreen.ts:338-340`).
  {from: 'Home', to: 'Library', trigger: 'click', shape: 'Browse card Local Files card', family: 'Browse card Local Files', label: 'Local Files'},
  {from: 'Home', to: 'History', trigger: 'click', shape: 'Recently Played See All', label: 'See all Recently Played'},
  {from: 'Home', to: 'AllPlaylistsScreen', trigger: 'click', shape: 'Pinned Playlists See All', label: 'See all Pinned Playlists'},
  {from: 'Home', to: 'Bookmarks', trigger: 'click', shape: 'Bookmarks See All', label: 'See all Bookmarks'},
  {from: 'Home', to: 'FollowedPodcasts', trigger: 'click', shape: 'Followed Podcasts See All', label: 'See all Followed Podcasts'},
  {from: 'Home', to: 'PodcastDetail', trigger: 'click', shape: 'Followed podcast card 1 artwork', family: 'Followed podcast card 1', label: 'podcast'},
  {from: 'Home', to: 'GenreScreen', trigger: 'click', shape: 'Genre Jazz bg', family: 'Genre Jazz', label: 'genre'},
  {from: 'Home', to: 'PlaylistDetail', trigger: 'click', shape: 'Pinned playlist tile 1 cover', family: 'Pinned playlist tile 1', label: 'playlist'},
  // The Queue is the app's ONLY route that starts inside a COMPONENT: the
  // audio player's minimise handler is `navigate('Queue', {from: 'audio'})`
  // (`src/components/player/audio/AudioPlayer/AudioPlayer.tsx:229`), and the
  // screen route that would stand in for the player (`NowPlaying`) renders
  // `null`, so there is no board to put between the two.
  //
  // The prototype therefore carries the Queue on the Recently Played card —
  // a REAL element of the screen — and compresses the app's three steps
  // (tap the track -> the player overlay -> minimise -> the Queue) into
  // one edge. It is the ONE edge the app does not make in one tap, and
  // md/UI_UX_PROTOTYPE_REBUILD.md says so in as many words.
  {from: 'Home', to: 'Queue', trigger: 'click', shape: 'Recently Played card 1 artwork', family: 'Recently Played card 1', label: 'open the audio track'},

  // ── Library ──
  {from: 'Library', to: 'Downloads', trigger: 'click', shape: 'Library downloads', label: 'Downloads'},
  {from: 'Library', to: 'AllAudioScreen', trigger: 'click', shape: 'All artists See All', label: 'See All'},
  {from: 'Library', to: 'ArtistScreen', trigger: 'click', shape: 'Artist tile', label: 'artist'},
  {from: 'Library', to: 'AlbumScreen', trigger: 'click', shape: 'Album tile', label: 'album'},
  {from: 'Library', to: 'PlaylistDetail', trigger: 'click', shape: 'Playlist card', label: 'playlist'},
  {from: 'Library', to: 'FolderBrowser', trigger: 'click', shape: 'Folder row', label: 'folder'},
  // The Library's empty state used to say "Go to Settings". There is no
  // Settings page any more — and a page called Settings was never the
  // right door to a folder picker, so the empty state now links the
  // folders directly (md/PROFILE_SETTINGS_MERGE.md).
  {from: 'Library', to: 'LinkedFolders', trigger: 'click', label: 'Link folders'},
  {from: 'Library', to: 'FolderLinkingWizard', trigger: 'click', shape: 'Link Folder', label: 'Link Folder'},

  // ── Profile ──
  //
  // The Profile is "you", not "your library" (2026-11-11,
  // `md/CONTENT_OWNERSHIP.md`), and it is also where the preferences live
  // (2026-11-11, `md/PROFILE_SETTINGS_MERGE.md`).
  //
  // Its six library rows — Playlists, Bookmarks, History, Downloads,
  // Followed podcasts, Local files — are GONE. Home already carries the
  // Recently Played, Pinned Playlists, Bookmarks and Followed Podcasts
  // rails, each with a "See All", and the Library page owns Downloads
  // and the local media. A second index of the same library, under the
  // same "Your Library" heading, is the app saying the same thing twice.
  //
  // What the Profile keeps is what nothing else owns: the account
  // (Activity → Stats; Account → sign out, revoke, clear), the
  // preferences (Appearance, Playback, Subtitles, Library), the app's
  // own pages (Support → Help, About Simba) — which used to be
  // re-listed in Settings' "About" section.
  {from: 'Profile', to: 'Stats', trigger: 'click', shape: 'Profile Stats label', label: 'Playback statistics'},
  {from: 'Profile', to: 'Help', trigger: 'click', shape: 'Profile Help label', label: 'Help'},
  {from: 'Profile', to: 'About', trigger: 'click', shape: 'Profile About label', label: 'About Simba'},
  {from: 'Profile', to: 'AudioSettings', trigger: 'click', shape: 'Profile Audio settings label', label: 'Audio settings'},
  // The Profile's "Linked folders" row opens a picker, and the picker
  // leads to the Linked Folders page — the prototype walks the last hop.
  {from: 'Profile', to: 'LinkedFolders', trigger: 'click', shape: 'Profile Linked folders label', label: 'Linked folders'},
  {from: 'Profile', to: 'Login', trigger: 'click', shape: 'Profile Sign out label', label: 'Sign out'},

  // ── The settings stack's own pages ──
  //
  // The "Settings" page itself is GONE (2026-11-11,
  // md/PROFILE_SETTINGS_MERGE.md): the Profile carries the preferences now,
  // and its two doors into the settings stack are the edges above.
  {from: 'AudioSettings', to: 'Equalizer', trigger: 'click', shape: 'Audio Settings Preset', label: 'Preset'},
  {from: 'LinkedFolders', to: 'FolderLinkingWizard', trigger: 'click', shape: 'Add Folder', label: 'Add Folder'},
  {from: 'FolderLinkingWizard', to: 'Library', trigger: 'click', shape: 'Go to Library', label: 'Go to Library'},
  {from: 'About', to: 'Changelog', trigger: 'click', shape: 'About Changelog label', label: 'Changelog'},
  {from: 'About', to: 'Credits', trigger: 'click', shape: 'About Credits label', label: 'Credits'},
  {from: 'About', to: 'Licenses', trigger: 'click', shape: 'About Licenses label', label: 'Open Source Licenses'},
  {from: 'About', to: 'Privacy', trigger: 'click', shape: 'About Privacy label', label: 'Privacy Policy'},
  {from: 'About', to: 'Terms', trigger: 'click', shape: 'About Terms label', label: 'Terms of Use'},

  // ── The Login screen's legal links ──
  {from: 'Login', to: 'Privacy', trigger: 'click', shape: 'Privacy Policy', label: 'Privacy Policy'},
  {from: 'Login', to: 'Terms', trigger: 'click', shape: 'Terms of Service', label: 'Terms of Service'},

  // ── Detail screens ──
  {from: 'ArtistScreen', to: 'AlbumScreen', trigger: 'click', shape: 'Artist album card', label: 'Open album'},
  {from: 'ArtistScreen', to: 'AllAudioScreen', trigger: 'click', shape: 'Artist See All', label: 'See All'},
  {from: 'AlbumScreen', to: 'ArtistScreen', trigger: 'click', shape: 'Album artist link', label: 'View artist'},
  {from: 'ArtistDetail', to: 'AlbumDetail', trigger: 'click', shape: 'ArtistDetail release row', label: 'release'},
  {from: 'AlbumDetail', to: 'ArtistDetail', trigger: 'click', shape: 'AlbumDetail artist link', label: 'artist'},
  {from: 'AllPlaylistsScreen', to: 'PlaylistDetail', trigger: 'click', shape: 'Playlist card', label: 'playlist'},
  {from: 'PlaylistDetail', to: 'AddToPlaylist', trigger: 'click', shape: 'Playlist Add items', label: 'Add items'},
  {from: 'PlaylistDetail', to: 'FolderBrowser', trigger: 'click', shape: 'Playlist Add local files', label: 'Add local files'},
  // The Folder Browser's permission error used to offer a "Settings"
  // action that opened Simba's own Settings page. A storage permission is
  // granted in the OPERATING SYSTEM's settings, so that action now opens
  // the OS app settings (Linking.openSettings()) — which is not a board
  // (md/PROFILE_SETTINGS_MERGE.md).

  // ── Catalogue ──
  {from: 'PodcastsScreen', to: 'PodcastDetail', trigger: 'click', shape: 'Podcast row', label: 'podcast'},
  {from: 'ShowsScreen', to: 'ShowDetail', trigger: 'click', shape: 'Show card', label: 'show'},
  {from: 'AudiobooksScreen', to: 'AudiobookDetail', trigger: 'click', shape: 'Book row', label: 'book'},
  {from: 'ArchiveScreen', to: 'MovieDetail', trigger: 'click', shape: 'Archive video row', label: 'video'},
  {from: 'ArchiveScreen', to: 'ArchiveItemDetail', trigger: 'click', shape: 'Archive audio row', label: 'audio'},
  {from: 'RadioScreen', to: 'RadioFavoritesScreen', trigger: 'click', shape: 'Radio heart', label: 'favourites'},
  {from: 'LiveTVScreen', to: 'LiveTVFavoritesScreen', trigger: 'click', shape: 'Live TV heart', label: 'favourites'},

  // ── Search ──
  //
  // The Search page's results board carries a row for each of these six
  // destinations, and the SHAPE names are the row's own names — the title
  // shape is the exact name, and the row's artwork, caption, trailing
  // control and hairline carry the same prefix. The `family` is what makes
  // the WHOLE row the target (rule P10): the Play viewer gives the click
  // to the topmost shape under the pointer and does not fall through, so a
  // connector on the title alone would be dead on the artwork and on the
  // chevron.
  {from: 'Search', to: 'ArtistDetail', trigger: 'click', shape: 'Search artist result', family: 'Search artist result', label: 'artist'},
  {from: 'Search', to: 'AlbumDetail', trigger: 'click', shape: 'Search album result', family: 'Search album result', label: 'album'},
  {from: 'Search', to: 'PlaylistDetail', trigger: 'click', shape: 'Search playlist result', family: 'Search playlist result', label: 'playlist'},
  {from: 'Search', to: 'FolderBrowser', trigger: 'click', shape: 'Search folder result', family: 'Search folder result', label: 'folder'},
  {from: 'Search', to: 'AudiobookDetail', trigger: 'click', shape: 'Search audiobook result', family: 'Search audiobook result', label: 'audiobook'},
  {from: 'Search', to: 'ArchiveItemDetail', trigger: 'click', shape: 'Search archive result', family: 'Search archive result', label: 'archive'},

  // ── The player and downloads ──
  {from: 'Queue', to: 'Library', trigger: 'click', shape: 'Queue Go back', label: 'Go back'},
  {from: 'Downloads', to: 'Library', trigger: 'click', shape: 'Downloads Go to Library', label: 'Go to Library'},
  {from: 'Stats', to: 'Library', trigger: 'click', shape: 'Stats Browse Library', label: 'Browse Library'},
];

/**
 * A placeholder board — a screen that is in the map but not designed yet.
 *
 * It is deliberately quiet: the board's own surface, the screen's name in
 * the app's display type, the group it belongs to, and one line saying
 * that the design work is tracked. It must not pretend to be a design.
 */
function placeholderBoard(route, theme) {
  const {kit} = require('./kit');
  const k = kit(theme);
  const c = k.c;
  const entry = ROUTES.find(r => r.route === route);
  const title = entry ? entry.title : route;
  const group = entry ? entry.group : '';

  return [
    k.rect('Placeholder surface', {
      x: 0,
      y: 0,
      w: SCREEN_W,
      h: SCREEN_H,
      fill: c.background.primary,
    }),
    // A hairline frame, so the placeholder reads as a frame rather than
    // as a page that forgot its content.
    k.rect('Placeholder frame', {
      x: 0.5,
      y: 0.5,
      w: SCREEN_W - 1,
      h: SCREEN_H - 1,
      fill: 'rgba(0,0,0,0)',
      stroke: c.border.emphasis,
      strokeWidth: 1,
    }),
    k.text('Placeholder group', group.toUpperCase(), {
      x: {center: SCREEN_W / 2},
      y: 380,
      family: 'Inter',
      weight: 500,
      size: 11,
      lineHeight: 16,
      letterSpacing: 1.2,
      fill: c.accent.gold,
    }),
    k.text('Placeholder title', title, {
      x: {center: SCREEN_W / 2},
      y: 404,
      family: 'Manrope SemiBold',
      weight: 600,
      size: 28,
      lineHeight: 36,
      fill: c.text.primary,
    }),
    k.text('Placeholder note', 'Not designed yet', {
      x: {center: SCREEN_W / 2},
      y: 452,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: c.text.tertiary,
    }),
    k.text('Placeholder tracker', 'md/UI_UX_PROTOTYPE_REBUILD.md', {
      x: {center: SCREEN_W / 2},
      y: 476,
      family: 'JetBrains Mono',
      weight: 400,
      size: 11,
      lineHeight: 16,
      fill: c.text.tertiary,
    }),
  ];
}

/**
 * The V2 Home's edges — the SAME app edges, on the V2 boards.
 *
 * The redesign does not change what the screen does, so the V2 boards carry
 * the same navigation as V1, on the V2 shapes. The one edge V1 has and V2
 * does not is the GENRE edge: the genre shelf is gone.
 *
 * The shape names are the V2 kit's own names — the prefix is "V2 " and the
 * rail titles are the V2 shelf titles ("V2 Recently Played action", not
 * "V2 Recently Played See All", because the action is not a "See All" label
 * any more).
 */
const V2_EDGES = [
  {from: 'Home', to: 'Search', trigger: 'click', shape: 'V2 Home header search', family: 'V2 Home header search', label: 'Search'},
  {from: 'Home', to: 'Profile', trigger: 'click', shape: 'V2 Home header avatar', family: 'V2 Home header avatar', label: 'Open profile'},
  {from: 'Home', to: 'MoviesScreen', trigger: 'click', shape: 'V2 Browse card Movies artwork', family: 'V2 Browse card Movies', label: 'Movies'},
  {from: 'Home', to: 'PodcastsScreen', trigger: 'click', shape: 'V2 Browse card Podcasts artwork', family: 'V2 Browse card Podcasts', label: 'Podcasts'},
  {from: 'Home', to: 'MusicScreen', trigger: 'click', shape: 'V2 Browse card Music artwork', family: 'V2 Browse card Music', label: 'Music'},
  {from: 'Home', to: 'RadioScreen', trigger: 'click', shape: 'V2 Browse card Radio artwork', family: 'V2 Browse card Radio', label: 'Radio'},
  {from: 'Home', to: 'LiveTVScreen', trigger: 'click', shape: 'V2 Browse card Live TV artwork', family: 'V2 Browse card Live TV', label: 'Live TV'},
  {from: 'Home', to: 'AudiobooksScreen', trigger: 'click', shape: 'V2 Browse card Audiobooks artwork', family: 'V2 Browse card Audiobooks', label: 'Audiobooks'},
  {from: 'Home', to: 'ShowsScreen', trigger: 'click', shape: 'V2 Browse card Shows artwork', family: 'V2 Browse card Shows', label: 'Shows'},
  {from: 'Home', to: 'ArchiveScreen', trigger: 'click', shape: 'V2 Browse card Archive artwork', family: 'V2 Browse card Archive', label: 'Archive'},
  {from: 'Home', to: 'Library', trigger: 'click', shape: 'V2 Browse card Local Files artwork', family: 'V2 Browse card Local Files', label: 'Local Files'},
  {from: 'Home', to: 'History', trigger: 'click', shape: 'V2 Recently Played action', label: 'See all Recently Played'},
  {from: 'Home', to: 'AllPlaylistsScreen', trigger: 'click', shape: 'V2 Pinned Playlists action', label: 'See all Pinned Playlists'},
  {from: 'Home', to: 'Bookmarks', trigger: 'click', shape: 'V2 Bookmarks action', label: 'See all Bookmarks'},
  {from: 'Home', to: 'FollowedPodcasts', trigger: 'click', shape: 'V2 Followed Podcasts action', label: 'See all Followed Podcasts'},
  {from: 'Home', to: 'PodcastDetail', trigger: 'click', shape: 'V2 Followed Podcasts card 1 artwork', family: 'V2 Followed Podcasts card 1', label: 'podcast'},
  {from: 'Home', to: 'PlaylistDetail', trigger: 'click', shape: 'V2 Pinned Playlists tile 1 cover', family: 'V2 Pinned Playlists tile 1', label: 'playlist'},
  // The Queue — the one edge the app does not make in one tap. See
  // md/UI_UX_PROTOTYPE_REBUILD.md §4.7.1.
  {from: 'Home', to: 'Queue', trigger: 'click', shape: 'V2 Recently Played card 1 artwork', family: 'V2 Recently Played card 1', label: 'open the audio track'},
];

module.exports = {
  V2_EDGES,
  ROUTES, EDGES, placeholderBoard, SCREEN_W, SCREEN_H};
