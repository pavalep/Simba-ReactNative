/**
 * The app's outbound links — ONE owner for each fact.
 *
 * 2026-11-12. Three of these were wrong, and two of them sent the user
 * somewhere that does not exist:
 *
 *  • **The support address.** It was `support@simbaplayer.app` — a
 *    domain the project does not have. The owner corrected it: the
 *    address is `support@pavalep.cpm`. It was hard-coded in TWO places
 *    (the About page's "Contact / Feedback" row and the Help page's
 *    contact card), so it now lives here once.
 *
 *  • **The website.** `https://simbaplayer.app` was used as the web
 *    fallback of a shared link AND as a deep-link prefix in
 *    `src/navigation/linking.ts`. There is no such website, so both
 *    are gone. A dead domain in a share sheet is worse than no link:
 *    the recipient taps it and gets nothing. The fallback is now the
 *    project's GitHub, which is where the app actually lives.
 *
 *  • **The bug report.** It pointed at `github.com/diegopvlk/Cine` —
 *    a different project's issue tracker. It is this repository.
 *
 * The Play Store id is `com.simba.player`, which is the app's
 * `applicationId` in `android/app/build.gradle`.
 * `__tests__/app/links.test.ts` holds the guard.
 */

/** The project's home — the app's public page, and the share fallback. */
export const PROJECT_URL = 'https://github.com/pavalep/Simba-ReactNative';

/** Where a bug report goes. */
export const ISSUES_URL = `${PROJECT_URL}/issues`;

/** The Play Store listing. The id is the app's `applicationId`. */
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.simba.player';

/** The address the owner reads. */
export const SUPPORT_EMAIL = 'support@pavalep.cpm';

/**
 * A `mailto:` for the support address.
 *
 * The subject is encoded here, so a subject with a space reaches the
 * mail app as one subject line instead of being cut at the first space.
 */
export function supportMailto(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
