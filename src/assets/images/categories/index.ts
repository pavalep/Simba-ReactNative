// ─── Category Cover Image Registry ───────────────────────────────────
// P53: Every Home-page category card now uses a local image as its
// background, with a dark linear gradient overlay so the title and
// description stay readable. The covers were generated with
// `image_synthesize` to match each section's mood (no API dependency).
//
// This registry exposes every cover as a static `require()` — Metro
// bundles them at build time so there's no runtime cost. Each section
// lives in its own subdirectory for easy per-section editing.

import type {ImageSourcePropType} from 'react-native';

export type CategoryCover = ImageSourcePropType;

export const CATEGORY_COVERS = {
  // ── Movies ──
  movies: {
    all:           require('./movies/all.png'),
    classicFilms:  require('./movies/classic.png'),
    publicDomain:  require('./movies/publicdomain.png'),
    documentary:   require('./movies/documentary.png'),
    silentFilms:   require('./movies/silent.png'),
    comedy:        require('./movies/comedy.png'),
    sciFi:         require('./movies/scifi.png'),
    westerns:      require('./movies/western.png'),
    filmNoir:      require('./movies/noir.png'),
  },
  // ── Podcasts ──
  podcasts: {
    all:         require('./podcasts/all.png'),
    arts:        require('./podcasts/arts.png'),
    music:       require('./podcasts/music.png'),
    business:    require('./podcasts/business.png'),
    comedy:      require('./podcasts/comedy.png'),
    education:   require('./podcasts/education.png'),
    health:      require('./podcasts/health.png'),
    technology:  require('./podcasts/technology.png'),
    history:     require('./podcasts/history.png'),
    news:        require('./podcasts/news.png'),
    science:     require('./podcasts/news.png'), // falls back to news (no science asset generated)
    sports:      require('./podcasts/news.png'), // falls back to news
    tvFilm:      require('./podcasts/news.png'), // falls back to news
  },
  // ── Music ──
  music: {
    all:         require('./music/all.png'),
    rock:        require('./music/rock.png'),
    pop:         require('./music/pop.png'),
    electronic:  require('./music/electronic.png'),
    jazz:        require('./music/jazz.png'),
    classical:   require('./music/classical.png'),
    hiphop:      require('./music/hiphop.png'),
    ambient:     require('./music/ambient.png'),
    folk:        require('./music/folk.png'),
    blues:       require('./music/blues.png'),
    reggae:      require('./music/reggae.png'),
  },
  // ── Live TV ──
  liveTv: {
    all:           require('./livetv/all.png'),
    news:          require('./livetv/news.png'),
    sports:        require('./livetv/sports.png'),
    music:         require('./livetv/music.png'),
    movies:        require('./livetv/movies.png'),
    documentary:   require('./livetv/documentary.png'),
    kids:          require('./livetv/kids.png'),
    entertainment: require('./livetv/entertainment.png'),
  },
  // ── Live Radio ──
  radio: {
    all:        require('./radio/all.png'),
    pop:        require('./radio/pop.png'),
    rock:       require('./radio/rock.png'),
    jazz:       require('./radio/jazz.png'),
    classical:  require('./radio/classical.png'),
    news:       require('./radio/news.png'),
    talk:       require('./radio/talk.png'),
    hiphop:     require('./radio/hiphop.png'),
    electronic: require('./radio/electronic.png'),
    country:    require('./radio/country.png'),
  },
  // ── Audiobooks ──
  audiobooks: {
    all:       require('./audiobooks/all.png'),
    fiction:   require('./audiobooks/fiction.png'),
    mystery:   require('./audiobooks/mystery.png'),
    romance:   require('./audiobooks/romance.png'),
    sciFi:     require('./audiobooks/scifi.png'),
    history:   require('./audiobooks/history.png'),
    poetry:    require('./audiobooks/poetry.png'),
    adventure: require('./audiobooks/adventure.png'),
  },
  // ── Internet Archive ──
  archive: {
    all:        require('./archive/all.png'),
    audio:      require('./archive/audio.png'),
    video:      require('./archive/video.png'),
    oldTime:    require('./archive/oldtime.png'),
    concerts:   require('./archive/concerts.png'),
    speeches:   require('./archive/speeches.png'),
    news:       require('./archive/news.png'),
    audiobooks: require('./archive/audiobooks.png'),
  },
  // ── TV Shows ──
  shows: {
    all:         require('./shows/all.png'),
    drama:       require('./shows/drama.png'),
    comedy:      require('./shows/comedy.png'),
    action:      require('./shows/action.png'),
    sciFi:       require('./shows/scifi.png'),
    mystery:     require('./shows/mystery.png'),
    thriller:    require('./shows/thriller.png'),
    romance:     require('./shows/romance.png'),
    fantasy:     require('./shows/fantasy.png'),
    documentary: require('./shows/documentary.png'),
  },
} as const;
