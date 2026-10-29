/**
 * ONE owner for the "which artwork do we show" decision.
 *
 * ## The rule
 *
 * A frame captured from the video WINS over catalogue artwork.
 *
 * The artwork says what the film IS. The frame says WHERE IN IT YOU
 * WERE — and every surface that shows a *position* (Recently Played,
 * the resume prompt, the Bookmarks rail) is selling the position, not
 * the film. Netflix, Plex and Jellyfin all lead a continue-watching
 * card with the frame rather than the poster for the same reason.
 *
 * ## Why it is a function and not a habit
 *
 * The rule used to be written out at each call site:
 *
 * ```ts
 * imageUri={item.resumeThumbnailPath || item.thumbnailPath}
 * ```
 *
 * Three surfaces did that, and the fourth — the Bookmarks rail — read
 * only `thumbnailPath`. So a bookmark of a film with no catalogue art
 * showed a placeholder glyph while the app was holding a perfectly good
 * frame of that film on disk. A rule that lives in four places is not
 * a rule; it is four chances to forget it, and one of them did.
 *
 * `resolveMediaArtwork` is the single implementation. Every surface
 * that draws artwork for a media record asks it, so a new surface
 * cannot get the precedence wrong by accident.
 *
 * ## What it does NOT decide
 *
 * How the path is rendered is a separate question, owned by
 * `toRenderableImageUri` in `./mediaUri`: a captured frame is a LOCAL
 * file path and needs the `file://` scheme, while catalogue artwork is
 * a remote URL and must be left alone. This helper only answers
 * *which* path.
 */

/**
 * The two artwork fields every media record in the app can carry.
 *
 * Structural on purpose: `HomeMediaShelfItem`, `Bookmark`,
 * `RecentHistoryEntry` and `ResumeCandidate` all carry these two
 * optional fields, and this helper accepts any of them without any of
 * them having to import it.
 */
export interface MediaArtwork {
  /** Catalogue artwork — a remote URL, or a local path. */
  readonly thumbnailPath?: string;
  /**
   * A frame captured at the resume / bookmark position, on this device.
   *
   * Distinct from `thumbnailPath` in the same way a bookmark is
   * distinct from a catalogue entry: it is a fact about *this
   * viewing*, not about the title.
   */
  readonly resumeThumbnailPath?: string;
}

/**
 * The artwork to draw for a record — or `undefined` when it has none,
 * which every caller renders as a placeholder.
 *
 * An empty string counts as "none", not as artwork: a blank path is
 * not a picture, and passing it on would leave the caller deciding
 * whether `''` means "draw nothing" or "draw the empty image".
 */
export function resolveMediaArtwork(
  artwork: MediaArtwork | null | undefined,
): string | undefined {
  if (!artwork) return undefined;
  return artwork.resumeThumbnailPath || artwork.thumbnailPath || undefined;
}
