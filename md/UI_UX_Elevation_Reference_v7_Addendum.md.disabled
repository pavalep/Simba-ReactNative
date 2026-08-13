# SIMBA Mobile: v7 Reference Addendum — Manager-Provided Visual Target

> **Purpose:** Lock the manager's reference screenshot + the manager's
> typed prompt into the v7 record so the spec is grounded in a single
> document. This addendum is read by `UI_UX_Elevation_Specification_v7.md`.

---

## 1. Reference Screenshot (manager-provided)

`ChatGPT Image Aug 12, 2026, 02_06_34 PM.png` — annotated below.

![Manager reference](../.minimax/v2/assets/2026/08/12/15-25-42-657-asset_20260812-152542-657_f20e7be8c951_4480b266-ChatGPT%20Image%20Aug%2012,%202026,%2002_06_34%20PM.png)

The reference is **NOT** an accurate representation of the app's current
state. It is a **visual target** for the brand-typography refinement:
how the Home screen should look after v7 ships.

### What the reference shows that is NEW for v7

1. **Wordmark "Simba" in a script/cursive font** (title case, gold).
   Today the wordmark is "SIMBA" in a bold all-caps sans (Inter /
   system default).
2. **Small circular icons next to each library rail title** —
   • Recently Played → circular clock icon
   • Bookmarks       → circular bookmark icon
   • Followed Podcasts → circular podcast-rings icon
3. **"View all" link visible on Movies and Podcasts rows** in addition
   to the rail itself. (Today Movies has it; Podcasts does not always
   surface it; v7 must make this consistent.)

### What the reference shows that is ALREADY in the app

- Lion logo + wordmark + tagline as a single header block.
- "Your media, your way" tagline in muted gray.
- Weather greeting card: "Good afternoon, Paval" + chip + caption.
- "YOUR LIBRARY" / "DISCOVER" subsection dividers (ruled, centered).
- Per-user rails: Recently Played, Bookmarks, Followed Podcasts —
  collapsible with chevron.
- Discover rails: Movies, Podcasts, etc. — each with "All / curated /
  specialty" CategoryCard row.
- Dark gradient CategoryCard art with 80px icon-circle on top.
- Bottom tab nav: Home / Library.
- Gold accent on every interactive element.

### What the reference does NOT show but v7 must keep

- Splash screen (full-screen lion mark on parchment).
- Login screen (Google sign-in).
- Profile / Settings / Search screens.
- Mini player.
- All video / audio / book / archive player screens.
- Bookmarks list screen, Category list screen, Genre screen.

These must use the **same** font system as Home so the whole app
is consistent (no serif / cursive leakage into the rest of the UI).

---

## 2. Manager's Typed Prompt (verbatim, condensed)

> **One-line brief:** Replace the bold all-caps "SIMBA" wordmark with
> an elegant script/cursive font (Allura → Great Vibes → Alex Brush
> fallback). Keep everything else on a clean modern sans-serif
> (Inter). Do not redesign the rest of the app. The script font is a
> brand element, not a general typography system.

### Typography rules (must-haves)

- **Wordmark "Simba"** → script font. Title case. Gold. ~44–58 px
  on mobile, scaled to the existing responsive system. Do not
  overflow the header; do not collide with search/avatar.
- **Tagline, greeting, weather, section titles, card titles,
  card descriptions, navigation, buttons, metadata, dialogs,
  empty states, error messages** → Inter (clean modern sans).
  - Regular / Medium / SemiBold / Bold as appropriate.
  - No serif. No additional script.
- **Lion icon** unchanged. Spacing between lion and wordmark may be
  tightened a touch but the lion stays as-is.
- **One font creates the identity, one font handles the UI.** This
  distinction is the whole point. Do not introduce a third font.

### Process

- Inspect existing typography system first; extend it, do not
  duplicate it.
- Add Allura (`Allura-Regular.ttf`) and Inter weights
  (`Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-SemiBold.ttf`,
  `Inter-Bold.ttf`) to `assets/fonts/`.
- Configure `react-native.config.js` to link them. Run
  `npx react-native-asset` and verify Android + iOS pick them up.
- Inspect each TTF's actual `fontFamily` PostScript name; do not
  assume the filename is the family name.
- Add semantic styles to the typography token set
  (`brandScript`, `uiRegular`, `uiMedium`, `uiSemiBold`, `uiBold`).
- Do not change navigation, business logic, APIs, media playback,
  state management, component architecture, icons, artwork, card
  structure, bottom navigation, or color palette.

### Quality checks

- Wordmark renders correctly (no fallback).
- Inter renders everywhere else.
- Header does not overflow on small devices.
- Wordmark does not collide with search / avatar.
- Light mode + dark mode if supported.
- iOS + Android both render the same.
- Accessibility / font scaling respected.

---

## 3. Additional visual deltas (v7, derived from the reference)

These were not in the manager's typed prompt but are visible in the
reference screenshot and must be addressed by the v7 spec:

1. **Rail-leading icons** for the three "Your Library" rails
   (Recently Played, Bookmarks, Followed Podcasts). Small circular
   icons (24–32 px) sit immediately to the left of the rail title.
   Same gold tint as the bottom-nav active state.
2. **"View all" link** on Movies and Podcasts rows. Movies already
   has it (via `MovieCategoriesShelf.onSeeAll`); Podcasts
   (`PodcastCategoriesShelf`) must add an equivalent prop. Other
   Discover rows that today are omitted (e.g. Live TV, Shows) are
   out of scope for v7 — but if they appear in the reference later,
   apply the same pattern.

---

## 4. What v7 explicitly does NOT do (out of scope)

- Re-architect the Home screen layout, the navigation stack, the
  auth flow, the weather card, the Lottie animations, the
  CategoryCard art, the bottom tab nav, or any other component.
- Change the color palette (gold stays gold, parchment stays
  parchment, dark-mode tokens stay where they are).
- Add additional script/serif fonts beyond the one (Allura) for the
  wordmark.
- Add custom font loading libraries (use the standard RN
  `react-native.config.js` + `npx react-native-asset` flow).
- Apply the script font anywhere except the wordmark.
- Animate the wordmark (subtle, static, premium — the screenshot
  shows no animation on the wordmark itself).
- Bundle a font CDN or runtime font downloader. Fonts ship in
  the app bundle.

---

## 5. Acceptance

v7 ships when, on a cold launch:

- Header reads "Simba" in a script font, gold, sized 44–58 px.
- Lion icon to the left of "Simba" is unchanged in color and
  position (spacing may be tightened by 2–4 px).
- "Your media, your way" tagline below in Inter Regular, muted
  gray, slightly tracked.
- Three "Your Library" rails (Recently Played, Bookmarks, Followed
  Podcasts) each render with a small circular icon to the left of
  the title.
- "Movies" and "Podcasts" each have a "View all" link to the right
  of the title.
- Every other piece of text in the app (greeting, weather, body
  text, headings, navigation, dialogs, errors) renders in Inter.
- `tsc --noEmit` clean.
- `npx react-native-asset` reports the fonts linked to Android + iOS.
- Cold-start landing page on authed device is Home, not Login
  (P67 invariant).
- Android emulator (Pixel) + iOS simulator both pass the same
  visual checks above.
