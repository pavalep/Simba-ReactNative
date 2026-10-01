/**
 * `useCaptionStyleBridge` — the single owner of caption rendering style.
 *
 * The caption settings are a user preference (MMKV, `player.captionStyle`)
 * and mpv renders the actual subtitles. Until this hook existed the two
 * were connected only by a docstring: the store was written, the
 * `CaptionCustomizer` UI rendered it, and nothing ever told mpv — so
 * every caption control was inert. The tracker's own wording was
 * "settings are stored + the chrome reads them", with the mpv wiring
 * deferred.
 *
 * ## Why this is a hook and not a call site
 *
 * Caption style has to reach mpv in two situations, and only one of them
 * has a call site:
 *
 *   1. The user changes a setting → easy to wire at the control, but
 *      easy to wire in N places.
 *   2. A file loads and mpv's option state is rebuilt → nobody is at a
 *      call site, and the preference silently stops applying.
 *
 * A hook mounted once in the chrome subtree covers both, and being the
 * only writer means there is no second place to keep in sync.
 *
 * ## Why re-apply on media change
 *
 * `sub-*` are mpv *options*, and a `loadfile` re-establishes the option
 * state for the new file. Pushing once on mount is therefore not enough
 * for the second track in a queue — the preference would apply to
 * whatever loaded first and never again. Re-applying on every
 * `mediaKey` change is what makes the setting actually persistent, which
 * is the entire point of persisting it.
 *
 * Mounted by `ExpandedChrome`; the hook itself is deliberately
 * effect-only and renders nothing.
 */

import {useEffect, useMemo} from 'react';
import {useTransport} from './useTransport';
import {useTheme} from '../../theme';
import {
  backgroundOpacityToMpvColor,
  borderToMpvBorderSize,
  fontSizeToMpvPx,
  positionToMpvAlign,
  positionToMpvPos,
  type CaptionSettings,
} from '../../state/useCaptionSettingsStore';
import {useCaptionSettingsStore} from '../../state/useCaptionSettingsStore';

/**
 * The colours mpv should draw with. Not user settings — taken from the
 * app's own palette so captions sit inside the same design language as
 * the chrome instead of inventing a second colour set here.
 */
export interface CaptionPalette {
  /** Glyph colour, in mpv's `#RRGGBBAA` form. */
  text: string;
  /** Outline colour, in mpv's `#RRGGBBAA` form. */
  border: string;
}

/**
 * Convert `#RRGGBB` / `#RGB` (the app's token form) into mpv's
 * `#RRGGBBAA`, appending an opaque alpha.
 *
 * mpv does not accept the CSS `#RRGGBB` shorthand for these options and
 * silently ignores an unknown colour, which would look exactly like
 * "the bridge isn't working" — so the conversion is explicit and tested
 * rather than left to the string that happens to be in the token file.
 */
export function toMpvColor(hex: string, alpha = 'FF'): string {
  const body = hex.replace('#', '').trim();
  if (body.length === 3) {
    // #RGB → #RRGGBB
    const expanded = body
      .split('')
      .map(c => c + c)
      .join('');
    return `#${expanded}${alpha}`;
  }
  if (body.length === 6) {
    return `#${body}${alpha}`;
  }
  // Already full, or unrecognised — pass through so mpv reports the
  // problem rather than us guessing.
  return `#${body}`;
}

/**
 * The full set of mpv properties implied by a caption style.
 *
 * Returned as a list rather than applied inside, so the mapping is a
 * pure function that can be asserted without a live mpv instance.
 */
export function captionSettingsToMpvProps(
  settings: CaptionSettings,
  palette: CaptionPalette,
): Array<[name: string, value: string | number]> {
  return [
    ['sub-font-size', fontSizeToMpvPx(settings.fontSize)],
    ['sub-back-color', backgroundOpacityToMpvColor(settings.backgroundOpacity)],
    // Where the caption box sits on screen.
    ['sub-pos', positionToMpvPos(settings.position)],
    // Which edge of that box the text is anchored to. `sub-pos` moves
    // the box; `sub-align` decides which end the text hangs off, so both
    // have to agree or the text lands on the wrong edge of its own box.
    ['sub-align', positionToMpvAlign(settings.position)],
    ['sub-border-size', borderToMpvBorderSize(settings.border)],
    ['sub-border-color', palette.border],
    ['sub-color', palette.text],
  ];
}

/**
 * Push caption style to mpv. Mount once, inside the chrome subtree.
 *
 * Returns the properties it last applied, so a caller (or a test) can
 * assert what the bridge actually pushed without reaching into mpv.
 */
export function useCaptionStyleBridge(): ReadonlyArray<[string, string | number]> {
  const {commands, state} = useTransport();
  const {colors} = useTheme();

  // A stable per-media key. `state.title` is mpv's `media-title`, which
  // changes when a different file loads and is already part of the
  // transport snapshot, so this needs no extra subscription.
  const mediaKey = state.title;

  const fontSize = useCaptionSettingsStore(s => s.fontSize);
  const backgroundOpacity = useCaptionSettingsStore(s => s.backgroundOpacity);
  const position = useCaptionSettingsStore(s => s.position);
  const border = useCaptionSettingsStore(s => s.border);

  const palette = useMemo<CaptionPalette>(
    () => ({
      text: toMpvColor(colors.text.primary),
      // Captions sit on video, so the outline is always a dark ink —
      // the same ink the app uses for its own hairline borders, not a
      // second black.
      border: toMpvColor(colors.border.subtle, 'FF'),
    }),
    [colors.text.primary, colors.border.subtle],
  );

  const props = useMemo(
    () =>
      captionSettingsToMpvProps(
        {fontSize, backgroundOpacity, position, border},
        palette,
      ),
    [fontSize, backgroundOpacity, position, border, palette],
  );

  // Re-applied on media change as well as on a style change — see the
  // module docstring for why a one-shot push is not enough.
  useEffect(() => {
    for (const [name, value] of props) {
      commands.setProperty(name, value);
    }
  }, [commands, props, mediaKey]);

  return props;
}
