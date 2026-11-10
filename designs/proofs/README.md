# designs/proofs

The device captures behind the numbers in `md/HOME_V2_REFACTOR.md` §10.

A measurement nobody can re-check is a claim. These are the pixels the
§10 numbers were read off.

| file | what it shows |
|---|---|
| `home-v2-light-top.png` | Home, top: the unboxed greeting, the weather chip, the "Your Library" divider, "Recently Played", "Followed Podcasts" |
| `home-v2-light-discover.png` | Home, scrolled: the "Discover" divider, "Explore Contents", and the catalogue cards |

## What they were taken on

- **Device:** emulator-5554, AVD `Medium_Phone`
- **Screen:** 1080 × 2400 px, 411 × 914 dp → **2.628 px per dp**
- **Build:** the debug app, reloaded from Metro — so it is the JS in the
  commits, not a stale bundle
- **Theme:** light
- **State:** a populated library (one recent film, one followed podcast)
  and live weather

## The numbers §10 reads off these files

| what | measured | the board |
|---|---|---|
| The rail pitch (Movies card → Podcasts card) | 172.0 dp | 160 + 12 = 172 |
| The gutter (Movies / Explore Contents / Recently Played) | 17.1 / 17.5 / 17.5 dp | 16 dp, one gutter |
| The FAB's gold — the theme's light gold at full alpha | `#b8922e` | `#B8922E` (`theme/tokens.ts:321`) |
| The page's parchment | `#f5f0e8` | — |
| The "Your Library" divider label | `#be9c40` | 0.9 × `#B8922E` over the parchment = `#be9b40` |
| The "Discover" divider label | `#be9c40` | the same |

The last two are the swapped-gold bug, measured: the OLD code drew the
dark theme's `#C9A84C` at 0.9 here, which would have measured
`#cdaf5b`.

## What these do NOT prove

One state only. The dark theme, an empty library (the "first run"
board), a pinned playlist, a bookmark and the long-press menu are not
in these files.
