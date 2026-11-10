// ─── The rail metrics — ONE owner for the page's card geometry ──────────
//
// V2 gives the Home page ONE card grammar: the artwork whole, the text
// underneath, every card the same width. That means the card's width, the
// gap between two cards and the pitch the rails snap to are ONE set of
// numbers — not five copies of "160" in five files.
//
// Before this file the width was written out five times: the media card,
// the catalogue card, the playlist tile, the podcast tile and the rail's
// own snap interval. Changing one of them would have left the page with
// two different pitches, which is exactly the kind of drift the eye
// notices and nobody can name.
//
// The gap is the app's own `spacing.md` (12) and the width is the app's
// own 160 dp rail card (`MediaRailCard`).

import {spacing} from '../../theme/tokens';

/** Every card on a Home rail is this wide. */
export const RAIL_CARD_WIDTH = 160;

/** The gap between two cards on a rail. */
export const RAIL_CARD_GAP = spacing.md; // 12

/** What the rail actually snaps to: the card plus the gap. */
export const RAIL_CARD_PITCH = RAIL_CARD_WIDTH + RAIL_CARD_GAP;

/** The media card's artwork is 16:9 at the width above. */
export const RAIL_MEDIA_ARTWORK_HEIGHT = 90;

/**
 * The media card's total height: 90 artwork + 8 gap + 20 title + 2 gap +
 * 18 meta = 138.
 */
export const RAIL_MEDIA_CARD_HEIGHT = 138;
