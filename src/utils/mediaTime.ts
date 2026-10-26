/**
 * The two time facts a media card can show — where you left off, and how
 * long the thing is — and the rules for putting them on screen.
 *
 * ## Why this module exists
 *
 * A card with a resume position shows two numbers: `1:37 / 21:58`. A card
 * with NO position shows one: `21:58`. Composing them with a template that
 * always prints both is how a card ends up reading `" / 21:58"` — a line
 * that opens with a separator and claims a position that does not exist.
 * The accessibility label did the same thing in prose: `The Rifle,  of
 * 21:58`, with a dangling "of" and nothing in front of it.
 *
 * ## Why `formatDuration` is not the thing being fixed
 *
 * The cause is `formatDuration(0)` returning `''`. That empty string is
 * CORRECT and load-bearing: a duration of zero means "unknown", and
 * printing `0:00` in its place would be a claim that the media is zero
 * seconds long — a lie on a grid badge, on a stats card, and on a history
 * row. Changing the formatter would push that lie into four places to
 * remove a stray separator from two.
 *
 * So the formatter stays exactly as it is, and the CARDS stop composing a
 * position that is not there.
 *
 * The rule, in one line: **the position segment appears only when there IS
 * a position.**
 */

import {formatDuration} from './timeAgo';

/**
 * The two facts, split so that no caller can compose them into a claim the
 * data does not support.
 *
 * A position of 0 is not a position: it means "not started", which is a
 * different fact from "stopped at the first second" — and the difference
 * is exactly what the old ` / 21:58` line threw away.
 */
function splitTimes(
  positionSeconds: number | undefined,
  durationSeconds: number | undefined,
): {position?: string; duration?: string} {
  const position =
    typeof positionSeconds === 'number' && positionSeconds > 0
      ? formatDuration(positionSeconds)
      : undefined;
  const duration =
    typeof durationSeconds === 'number' && durationSeconds > 0
      ? formatDuration(durationSeconds)
      : undefined;
  return {position, duration};
}

/**
 * The line under a card's title: `1:37 / 21:58`, or `21:58` when there is
 * no position, or nothing at all when the duration is unknown.
 *
 * `undefined` rather than an empty string, because the caller renders the
 * line only when there is one — an empty `<Text>` is a layout artefact,
 * not a line.
 */
export function formatPositionLine(
  positionSeconds?: number,
  durationSeconds?: number,
): string | undefined {
  const {position, duration} = splitTimes(positionSeconds, durationSeconds);
  if (!duration) return undefined;
  return position ? `${position} / ${duration}` : duration;
}

/**
 * The card's spoken label: `The Rifle, 1:37 of 21:58`.
 *
 * With no position there is nothing to resume, so the label says how long
 * the thing is and stops there. The old shape printed the position segment
 * unconditionally, which produced `The Rifle,  of 21:58` — a dangling
 * "of" with nothing in front of it.
 *
 * The duration is in the label even though it is also visible under the
 * title, because `accessibilityLabel` on the card REPLACES the children's
 * labels: whatever is not written here is not spoken at all.
 */
export function formatPositionAccessibility(
  title: string,
  positionSeconds?: number,
  durationSeconds?: number,
): string {
  const {position, duration} = splitTimes(positionSeconds, durationSeconds);
  if (position && duration) return `${title}, ${position} of ${duration}`;
  if (duration) return `${title}, ${duration} long`;
  return title;
}
