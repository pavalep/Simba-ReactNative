/**
 * About screen — app info, legal links and contact.
 *
 * The version is NOT here: it is a fact, not a copy, and its owner is
 * `src/constants/appVersion.ts` (the native build's `versionName` and
 * `versionCode`). The "Built with" chips are not here either — their
 * owner is `src/constants/techStack.ts`.
 *
 * 2026-11-12: the reset strings went with the reset itself. The
 * Profile owns the reset now (`md/CONTENT_OWNERSHIP.md`), and the
 * About page's red "Reset all settings" was a second door to the same
 * action.
 */
const textContent = {
  headerTitle: 'About',
  appName: 'Simba Player',
  tagline: 'Your personal media player',
  changelog: 'Changelog',
  credits: 'Credits',
  shareApp: 'Share App',
  reportBug: 'Report Bug',
  contactFeedback: 'Contact / Feedback',
  privacyPolicy: 'Privacy Policy',
  /**
   * The title the Terms screen shows (`TermsScreen.tsx`,
   * `InternalHeader title="Terms of Use"`). The About row names the
   * page it opens, so the two cannot drift.
   */
  termsOfService: 'Terms of Use',
  openSourceLicenses: 'Open Source Licenses',
  rateOnPlayStore: 'Rate on Play Store',
  /** The divider above the link list — the section the links live in. */
  moreLinks: 'More',
} as const;

export default textContent;
