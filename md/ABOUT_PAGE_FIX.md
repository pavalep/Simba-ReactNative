# ABOUT_PAGE_FIX — the About page tells the truth

**Date:** 2026-11-12
**Branch:** `f5/w22-close-minimise-d9`
**Scope:** the About page (`src/screens/About/`), the two constants it now reads, the Credits page's stack list, the two URLs the page handed out, and — because the owner's second message turned out to be app-wide — the shared `SubsectionTitle` divider, the shared `InternalHeader` title, and the `About / light` + `About / dark` boards.

---

## 1. The ask

The owner screenshotted the About page and wrote one word: **"fix"**.

The screenshot shows four things, all of them on the same screen:

1. the link list is a **column of unlabelled icons** — nine rows, no words;
2. the version reads **"Version 1.0.0"**;
3. the "Built with" card names **Redux Toolkit**;
4. a **red "Reset all settings"** sits at the foot of the page.

Then, in the same conversation, a fifth and a sixth fact, given by the owner:

5. **"Report a bug" opens `github.com/diegopvlk/Cine/issues`** — a different project. The app's repository is **`pavalep/Simba-ReactNative`**.
6. The Play Store row opened `…details?id=com.simbaplayer`, but the app's `applicationId` is **`com.simba.player`**.

Both URLs were already written down as defects in `md/PROFILE_RC1_REFACTOR.md` §7 (the table at lines 190–193) — the analysis had been done and the fix had not been made. They are fixed here.

Then a second message, with two more screenshots:

7. **"Accoun is only there for title Account, this is a bug sometimes happening in all pages including home, profile, about etc."** — every section divider in the app dropped its **last character**. "Librar", "Accoun", "Activit", "Appearanc", "Playbac", "More" (as "Mor"), "Support" (as "Suppor"), "Reset" (as "Rese"). It is not an About-page defect; it is one shared component, and it is on every page in the app.
8. **"header title About is too big, make all in small size, like in Profile page, this is not needed to be this much big"** — the seven informational pages rendered their title at **48 px Cormorant Garamond Bold** while every other internal page renders **22 px Manrope SemiBold**.

Both are app-wide, and both are fixed here.

---

## 2. The eight defects, with the evidence — and the gate that missed two of them

### 2.1 The link list collapsed to icons — a circular constraint

**READ** (`src/screens/About/components/AboutScreen.tsx`, before this wave):

```tsx
content: {
  flex: 1,
  alignItems: 'center',        // ← the column centres its children
  paddingHorizontal: spacing.xl,
},
…
<FlatList
  data={LINK_ITEMS}
  renderItem={({item, index: idx}) => (
    <Animated.View style={[styles.linkItem, entrance.styles[idx]]}>
…
linkItem: {
  flexDirection: 'row',
  width: '100%',               // ← the row asks for the list's width
  …
},
linkLabel: {
  flex: 1,                     // ← the label takes what is left
},
```

**WHY IT COLLAPSES.** The `FlatList` is a child of a column whose `alignItems` is `center`, so on the cross axis the list shrink-wraps to its content. The list's width therefore depends on its rows; every row asks for `width: '100%'` of the list; and the only fixed-width children are the 18 dp icon and the 16 dp chevron. Yoga resolves the cycle to the widest fixed child — roughly 42 dp — and the label's `flex: 1` resolves to **zero**. The rows were never missing their labels; the labels had nowhere to go.

**THE FIX.** The rows are the app's own `SettingsRow` now — a full-bleed row with a hairline under it, the same component the Profile's 21 rows use — and nothing above the list is a centred column any more. The list is also no longer a `FlatList` inside a fixed column: the page scrolls, so nine rows of 52 dp (two of them 67 dp, because they carry a description) fit under the lockup on a 411 × 914 dp screen.

`SettingsRow` gained one optional prop for this: `leading`, a glyph in front of the label. The About board draws the links as icon, label, chevron, and the Profile's rows have no icon, so the prop is optional and nobody else uses it.

### 2.2 The version was a hard-coded lie

| Where | What it said | What is true |
|---|---|---|
| `textContent.version` | `Version 1.0.0` | `android/app/build.gradle` → `versionName "1.1.0"`, `versionCode 2` |
| `package.json` `version` | `0.0.1` | React Native's template placeholder — never touched, and never a build's version |
| the Settings page (deleted in the merge wave) | `0.0.1 (1)` | — |

So the app showed **three different versions** for one binary, and the true one nowhere. The Changelog's newest entry says `1.1.0` — that was the only place the truth appeared.

**THE FIX.** `src/constants/appVersion.ts` is the one owner: `APP_VERSION_NAME`, `APP_BUILD_NUMBER`, and the `Version 1.1.0 (2)` label. It is a constant rather than a runtime read because no native module in this app exposes `BuildConfig`, and adding one (`react-native-device-info`, or a bespoke TurboModule) means a new native dependency and a rebuild for a string that changes once per release.

**The guard is what makes the constant honest.** `__tests__/app/appVersion.test.ts` reads `android/app/build.gradle`, the iOS project and the Changelog screen and fails if the constant drifts from any of them. The iOS project was `MARKETING_VERSION = 1.0` / `CURRENT_PROJECT_VERSION = 1` — stale scaffold — and is now `1.1.0` / `2`, so both platforms carry the same number the page prints.

### 2.3 "Built with: Redux Toolkit"

`package.json` has **no `redux` and no `@reduxjs/toolkit`**. All 23 stores are `zustand` stores; the persistence layer is `react-native-mmkv` with AsyncStorage as the fallback. The About page had claimed Redux since 25.3, and the **Credits page claimed it too** — along with `redux-persist`, which the app also does not have.

**THE FIX.** `src/constants/techStack.ts` owns the list once, and both pages read it:

- the About page's six chips — React Native, TypeScript, MPV, Zustand, MMKV, React Navigation;
- the Credits page's five groups — the same stack in full, with versions and licences.

`__tests__/app/techStack.test.ts` checks that every package the stack names is a real dependency, that no entry names Redux, and that every chip is a stack entry.

The Credits page also carried a `fontWeight: '700'` on its group titles, on top of the `displaySans` variant's `Manrope SemiBold` family — which resolves to `Manrope SemiBold_bold.ttf`, a file that does not ship. The group titles were silently falling back to the system font. The override is gone; the family carries the weight, as the house rule says.

### 2.4 Two resets

The Profile carries **"Reset preferences"** (it resets the preferences and KEEPS the linked folders). The About page carried a red **"Reset all settings"** (it reset everything and unlinked the folders too). Two rows, two names, one action — and the About page's is the destructive one, sitting under a page whose job is to describe the app.

**THE FIX.** The About page's reset is gone, with its dialog. The Profile owns the reset (`md/CONTENT_OWNERSHIP.md`), and the linked folders are unlinked from the Profile's own **Linked folders** page, which is one row away.

### 2.5 The bug report went to another project

`GITHUB_ISSUES_URL` was `https://github.com/diegopvlk/Cine/issues`. The app's remote is `https://github.com/pavalep/Simba-ReactNative.git` — `git remote -v` says so. The row sent the user to a stranger's issue tracker.

**THE FIX.** `https://github.com/pavalep/Simba-ReactNative/issues`.

### 2.6 The store link opened the wrong listing

`PLAY_STORE_URL` was `…/details?id=com.simbaplayer`. The app's `applicationId` is `com.simba.player` (`android/app/build.gradle`) — the two are different packages, so the row opened a listing that is not this app (if it opened one at all).

**THE FIX.** `…/details?id=com.simba.player`. The same URL is in the share sheet's message, so it is fixed there too.

### 2.7 Every divider dropped its last character

**THE SYMPTOM.** One component, `src/components/utility/SubsectionTitle/SubsectionTitle.tsx`, drew the "── Title ──" divider. Its `displaySerif` label lost the last glyph of its text on every screen: "Librar", "Accoun", "Activit", "Appearanc", "Playbac", "Mor", "Suppor", "Rese".

**THE PROOF THAT IT WAS DROPPED, NOT CLIPPED.** A 5× crop of the Profile's "Activity" divider shows the word as "Activit" with **empty space to the right of the "t"** — the "y" is not half-drawn, it is not there. A clipped glyph still shows the left part of its ink; a dropped glyph shows nothing. The label's own box was measured wide enough to hold the whole word; the glyph was never drawn into it.

**THE TWO DEFECTS IN THE STYLE.** Before this wave the override was:

```tsx
const displaySerifOverride: TextStyle = {
  fontFamily: FONT_FAMILY.cormorant.bold,   // ← see below
  fontWeight: '700',
  fontSize: 18,
  lineHeight: 24,
  fontStyle: 'italic',                      // ← 700 + italic
  letterSpacing: 0.3,
};
```

1. **A face that does not ship.** The Cormorant family ships three files — regular, bold and italic. The weight selects the file, so `fontWeight: '700'` + `fontStyle: 'italic'` asks for **`Cormorant Garamond_bold_italic.ttf`**, which is not among them. React Native falls back silently; there is no warning, no error, and the glyphs still look like a serif, so the fallback is invisible.
2. **A positive `letterSpacing` on a label whose advance is already measured by a fallback face.** A trailing advance after the last glyph is exactly what pushes a final glyph past its own measured box.

**THE EXPERIMENTS, IN ORDER.** Each was a single-variable change on the emulator, read back through the accessibility tree:

| Step | Change | Measured label width | Last glyph |
|---|---|---|---|
| 0 | as above (`700` + italic, `letterSpacing: 0.3`) | 62.9 dp | **dropped** |
| 1 | `fontWeight: '400'` + `fontFamily: FONT_FAMILY.cormorant.italic` — the face that **does** ship | 55.1 dp | **still dropped** |
| 2 | `letterSpacing: 0.3 → 0` (on top of step 1) | narrower boxes, every divider re-measured | **present** |

Step 1 is load-bearing but **not sufficient** on its own: the width moved by 7.8 dp, so the override demonstrably took effect, and the glyph was still missing. Step 2 is what closed it. Both are fixed, and both are recorded here as two defects rather than one — the honest chain.

**THE FIX.** `fontWeight: '400'` with `FONT_FAMILY.cormorant.italic` (the same face the brand lockup's tagline uses, `src/constants/brand.ts` → `LOCKUP_TAGLINE`) and `letterSpacing: 0`. The house rule holds: the **family key carries the weight**, so a style override must not ask for a weight the family does not have.

### 2.8 The header title was on a different scale from every other page

`InternalHeader` took a `titleVariant` prop. Its default was `displaySans` — Manrope SemiBold 22 px — and **seven informational pages opted in to `displaySerif`**, the 48 px Cormorant Garamond Bold token:

```
Terms · About · Changelog · Credits · Privacy · Help · Licenses
```

The owner: *"header title About is too big, make all in small size, like in Profile page, this is not needed to be this much big."*

**THE FIX.** The prop is **gone**. One title style for every internal page — Manrope SemiBold 22 px, `letterSpacing: 0.2`, centred — and the seven pages lost their `titleVariant` argument. The Profile was always the reference; the About page now measures the same.

This also closed the last two `fontWeight: '700'` overrides in the header: the title style asked for `Manrope SemiBold_bold.ttf` on top of the `Manrope SemiBold` family, and that file does not ship either — the same silent fallback as §2.7, one component over. The family key carries the weight; the style carries the size, the tracking and the centring.

### 2.9 Why the font gate did not catch either of them

`scripts/check-font-resolution.js` resolves every `<AppText>` / `<Text>` usage in `src/` against the shipped Android font assets and fails on a fallback. It is the right guard, and it passed while both of the bugs above were live.

**The reason is the shape of the style prop.** The gate reads two forms:

```js
/style=\{styles\.([A-Za-z0-9_]+)\}/   // style={styles.someName}
/style=\{\{([^}]*)\}\}/               // style={{ …inline… }}
```

Both of these components pass their style **conditionally** —

```tsx
// SubsectionTitle
style={isDisplaySerif ? displaySerifOverride : styles.label}
// InternalHeader (before this wave)
style={[styles.title, titleVariant === 'displaySerif' && styles.titleSerif]}
```

— so neither matched, and the gate never resolved their fonts. **Measured on 2026-11-12: of 685 text tags in `src/`, the gate audits 259 and skips 426.** The blind spot is not the divider's or the header's fault; it is the gate's.

**WHAT THIS WAVE DOES.** `__tests__/app/fontResolution.test.tsx` renders both components, flattens the **real** rendered style, resolves the font the way `ReactFontManager.kt` does (`"fonts/" + family + suffix + ext`, suffix chosen by the weight), and asserts the file exists in `android/app/src/main/assets/fonts/`. It also asserts the two sizes (18 px, 22 px) and the divider's `letterSpacing: 0`, and — so the guard cannot go vacuous — that `Cormorant Garamond_bold_italic.ttf` and `Manrope SemiBold_bold.ttf` really are **not** shipped.

**And the blind spot was swept for the same class of defect.** A separate scan resolved the font for every conditional style the gate skips — **59 font-bearing conditional styles** across `src/` — against the shipped assets. **Every one of them resolves to a file that ships.** The app has exactly two live font fallbacks of this kind, and both were the ones above.

**The guard was verified by re-breaking the bug**: with `fontWeight: '700'` and `letterSpacing: 0.3` put back into `SubsectionTitle`, the test fails with

```
Expected: "Cormorant Garamond_italic.ttf"
Received: "Cormorant Garamond_bold_italic.ttf"
```

— the exact file that does not ship. The fix was then restored and the suite re-run green.

**WHAT THIS WAVE DOES NOT.** It does not close the 426-tag gap. Auditing every conditional style in the app would surface every font override in `src/` at once, which is a wave of its own (it is carried forward in §7).

---

## 3. What the page looks like now

```
   About                          ← InternalHeader, the app's own
  ┌──────────────────────────────┐
  │            (lion)            │   the lockup, centred
  │        Simba Player          │   h3, gold
  │   Your personal media player │   body2, tertiary
  │       Version 1.1.0 (2)      │   caption, secondary
  └──────────────────────────────┘
  ┌──────────────────────────────┐
  │          Built with           │   the app's OWN stack
  │  React Native TypeScript MPV │
  │  Zustand MMKV React Navigation│
  └──────────────────────────────┘
  ────────── More ───────────────   the gold Cormorant divider
  ⏱ Changelog                    │
  🏆 Credits                     │   the app's `SettingsRow`:
  📖 Open Source Licenses        │   18 dp gold glyph, label,
  🔒 Privacy Policy              │   14 dp chevron, a hairline
  ℹ Terms of Use                 │   under each row
  🏆 Rate on Play Store          │
  ↗ Share App                    │
  ⚠ Report Bug                   │
  📢 Contact / Feedback          │
```

**The row labels are the titles of the pages they open.** The Terms screen's own header says "Terms of Use", so the About row says "Terms of Use" too — and `textContent.termsOfService` now carries that string, with the comment saying why.

**The icons are one per row.** The old list drew a music note for three rows and a gear for three more; the icon said nothing. The nine are the ones the About board draws: a history clock for the changelog, an award for the credits, a book for the licences, a lock for the privacy policy, an info mark for the terms, a trophy for the store rating, a share glyph for the share row, an alert circle for the bug report and a megaphone for the contact row. All nine were already in `SvgIcon`'s map and in `src/assets/svg/` — they were simply never used.

**The two rows that carry a description** (Credits, Share App) are 67 dp on the device, the same 67 dp the Profile's described rows measure.

---

## 4. The design

`designs/penpot/profile.js` → `aboutBoard()`, the `About / light` and `About / dark` boards.

| Change | Why |
|---|---|
| The red "Reset all settings" is **gone** | The Profile owns the reset (§2.4). |
| The row labels are the pages' **own titles** | "Open source licences" → "Open Source Licenses" (American spelling), "Terms of use" → "Terms of Use" (the Terms screen's title). |
| Two rows carry their **description** | The board drew every row at 52 dp; the app has always had two described rows, and a described row is 67 dp. The board now says so. |
| The app name is **Inter SemiBold** | The app's `h3` is Inter SemiBold 20/28; the board drew Inter Bold. |
| The "Built with" label and the chips are **13/18** | The app's `caption`. The board drew them at 11/16 (the `overline` token). |
| The chip card's height is **computed** | Six chips wrap to two rows. The old fixed 74 dp card was one row tall and cut the second one off. |
| Each chip row is **centred** | The app's `justifyContent: 'center'` on the wrapping row. |
| The chip widths are re-measured at 13 px | The estimate was Inter 11 px (`length × 6.2 + 16`); at 13 px it is `length × 7.2 + 16`. |

`designs/penpot/app-boards.js` — the five `About → …` connector labels follow the row labels.

**The two app-wide changes also redraw the boards.** `designs/penpot/profile.js` → `P.header()` and the `HEADER` constant were the board's copy of the page title, and it drew the 48 px Cormorant Bold that §2.8 removed.

**And the About board's own stack was re-derived from the app's source rules**, after reading the rebuilt board back out of Penpot and comparing it with the device (§6). Four of its positions were wrong:

| Board change | Why |
|---|---|
| The page title is **Manrope SemiBold 22/28, letterSpacing 0.2**, at y = 16 | One title style for every internal page (§2.8). The Profile's is the reference. |
| The divider labels are **Cormorant italic 400, letterSpacing 0** | The board drew the italic face but carried `letterSpacing: 0.3` — the very tracking that dropped the app's last glyph (§2.7). Two places: `designs/penpot/kit.js` (the shared divider) and `designs/penpot/profile.js` (the Profile's own). |
| The version line sits **22 dp** below the tagline | The board advanced the stack by 18 (the caption's line height) instead of the tagline's 22. The version was 4 dp too high. |
| The first chip row sits **8 dp** below the "Built with" label | The card is a flex row with `gap: spacing.sm`, and the label is one of its flex children — so the gap applies between it and the first chip row. The board's card was the right HEIGHT but its contents were 8 dp high. |
| The "More" divider sits **20 dp** below the card | `SubsectionTitle`'s own `marginTop: spacing.sm` (8) + `paddingVertical: spacing.md` (12). The board had 44 (two `spacing.lg` steps). |
| The About tagline is **15/22** | The app's `body2` token is 15/22; the board had 13/18. |

The board plan after this change: **61 boards, 142 links in 15 calls, media 87/87 known, 0 upload batches**, and **0 overlapping board pairs**.

---

## 5. The code, file by file

| File | Change |
|---|---|
| `src/constants/appVersion.ts` | **NEW** — the version's one owner. |
| `src/constants/techStack.ts` | **NEW** — the stack's one owner (the chips + the credits groups). |
| `src/screens/About/components/AboutScreen.tsx` | Rewritten: the rows are `SettingsRow`s, the page scrolls, the version and the chips come from the constants, the reset and its dialog are gone, the two URLs are right, the icons are one per row. |
| `src/screens/About/related/textContent.ts` | The version and the reset strings are gone; the labels are the pages' own titles. |
| `src/components/utility/SettingsRow/SettingsRow.tsx` | One optional `leading` prop. |
| `src/screens/Credits/components/CreditsScreen.tsx` | The groups come from `techStack.ts`; the `fontWeight: '700'` override is gone. |
| `ios/CinePlayer.xcodeproj/project.pbxproj` | `MARKETING_VERSION 1.0 → 1.1.0`, `CURRENT_PROJECT_VERSION 1 → 2` (both configurations). |
| `__tests__/app/appVersion.test.ts` | **NEW** — the version against the three places it is stated. |
| `__tests__/app/techStack.test.ts` | **NEW** — the stack against `package.json`. |
| `__tests__/screens/About/AboutScreen.test.tsx` | **NEW** — the six facts on the screen. |
| `__tests__/app/fontResolution.test.tsx` | **NEW** — renders the divider label and the header title and resolves their fonts the way RN does, asserting the file ships (§2.9). |
| `src/components/utility/SubsectionTitle/SubsectionTitle.tsx` | The divider label's face is the shipping italic, `fontWeight: '400'`, `letterSpacing: 0` (§2.7). |
| `src/components/layout/InternalHeader/InternalHeader.tsx` | The `titleVariant` prop is **gone**; one title style, Manrope SemiBold 22 px, with the `fontWeight: '700'` override removed (§2.8). |
| `src/screens/{About,Changelog,Credits,Help,Licenses,Privacy,Terms}/components/*.tsx` | The seven `titleVariant="displaySerif"` arguments are gone (§2.8). |
| `designs/penpot/profile.js` | The About board's tagline, stack offsets and `P.header()`'s title style; the Profile's own divider loses its `letterSpacing: 0.3` (§4). |
| `designs/penpot/kit.js` | The shared divider label loses its `letterSpacing: 0.3` — the value that truncated the app's label (§4, §2.7). |
| `designs/penpot/app-boards.js` | The `About → …` connector labels follow the row labels. |

---

## 6. The device proof

**Device:** `emulator-5554` — Android emulator, Medium Phone, API 37, **1080 × 2400 px at 420 dpi**, so **1 dp = 2.625 px**. Read back through Argent's `describe` (the accessibility tree; `adb shell uiautomator dump` produces nothing on this emulator) and `screenshot`. Normalised frames × 1080 / × 2400 give pixels; ÷ 2.625 gives dp.

**The eight defects, one by one.**

| # | Defect | How it was disproved |
|---|---|---|
| 1 | the link list collapsed to unlabelled icons | The tree lists all **nine labels** as `Button` rows: `Changelog`, `Credits, Contributors and libraries used`, `Open Source Licenses`, `Privacy Policy`, `Terms of Use`, `Rate on Play Store`, `Share App, Send Simba Player to a friend`, `Report Bug`, `Contact / Feedback`. Each row's frame is **full width (1.000)**, not 42 dp. |
| 2 | `Version 1.0.0` | The tree reads **`Version 1.1.0 (2)`**. |
| 3 | "Built with: Redux Toolkit" | The tree reads **`Built with`** and the six chips — `React Native`, `TypeScript`, `MPV`, `Zustand` (row 1), `MMKV`, `React Navigation` (row 2). No `Redux` anywhere on the screen. |
| 4 | a red "Reset all settings" | The tree ends at `Contact / Feedback`. **No reset row, no red footer.** |
| 5 | the bug report went to `diegopvlk/Cine` | `https://github.com/pavalep/Simba-ReactNative/issues` in the source. |
| 6 | the store link opened `com.simbaplayer` | `…/details?id=com.simba.player` in the source — the `applicationId`. |
| 7 | every divider lost its last character | **Every divider in the app now reads whole.** Profile: `Activity`, `Appearance`, `Playback`, `Subtitles`, `Library`, `Account`, `Support`, `Reset`. About: `More`. |
| 8 | the header title was too big | The About header's title measures **0.159 × 0.031** (normalised) — the Profile's measures **0.170 × 0.031**. Same 0.031 height: the same 22 px type on both pages. |

**The About page, as the tree reads it** (normalised x, y, w, h):

```
StaticText "About"                    (0.420, 0.043, 0.159, 0.031)   ← 22 px, same as the Profile's
StaticText "Simba Player"             (0.345, 0.202, 0.308, 0.031)
StaticText "Your personal media player"(0.262, 0.233, 0.475, 0.024)
StaticText "Version 1.1.0 (2)"         (0.381, 0.257, 0.238, 0.020)
StaticText "Built with"               (0.068, 0.308, 0.864, 0.020)
  StaticText "React Native"           (0.133, 0.345, 0.195, 0.020)
  StaticText "TypeScript"             (0.387, 0.345, 0.166, 0.020)
  StaticText "MPV"                    (0.611, 0.345, 0.072, 0.020)
  StaticText "Zustand"                (0.742, 0.345, 0.126, 0.020)
  StaticText "MMKV"                   (0.290, 0.383, 0.101, 0.020)
  StaticText "React Navigation"       (0.449, 0.383, 0.261, 0.020)
StaticText "More"                     (0.459, 0.443, 0.081, 0.026)   ← whole
Button "Changelog"                    (0.000, 0.482, 1.000, 0.057)
Button "Credits, Contributors…"       (0.000, 0.539, 1.000, 0.073)
Button "Open Source Licenses"          (0.000, 0.612, 1.000, 0.057)
Button "Privacy Policy"               (0.000, 0.668, 1.000, 0.057)
Button "Terms of Use"                 (0.000, 0.725, 1.000, 0.057)
Button "Rate on Play Store"            (0.000, 0.782, 1.000, 0.057)
Button "Share App, Send Simba…"        (0.000, 0.839, 1.000, 0.073)
Button "Report Bug"                    (0.000, 0.912, 1.000, 0.057)
Button "Contact / Feedback"            (0.000, 0.969, 1.000, 0.031)   ← clipped by the viewport: the page scrolls
```

**The row heights, measured against the board.** `0.057 × 2400 = 136.8 px = 52.1 dp` for a plain row; `0.073 × 2400 = 175.2 px = 66.7 dp` for a described one. The board draws 52 dp and 67 dp. The divider label's height is `0.026 × 2400 = 62.4 px = 23.8 dp`, the 24 dp line height.

**The page scrolls.** The last row sits at y = 0.969 — the viewport cuts it — and the content above it runs to the fold, so the About screen is a `ScrollView`, not a fixed column. That is the change that let nine rows fit under the lockup.

**The gates**, `X:/Development/SIMBA/.scratch-figcraft/gates.ps1`:

```
tsc          exit=0
eslint       exit=0
boundaries   exit=0
fonts        exit=0
boards       exit=0
jest         exit=0
ALL GATES DONE
```

### 6.1 The board, measured against the device

The rebuilt `About / light` board was read back out of Penpot (`execute_code`, plain data only) and compared with the device's own stack.

**How the device column was derived.** The accessibility frame's y is normalised; `y × 2400` is pixels, `÷ 2.625` is dp from the screen's top, and the constant **+24 dp status-bar offset** (CF-22) is removed to land on the app's own top. The chip rows are the chips' **shape** tops, so the 4 dp of `paddingVertical` is taken off the text's box.

| Element | Board (dp) | Device (dp) | Δ |
|---|---|---|---|
| the header title "About" | 16 | 15.3 | 0.7 |
| the lockup's lion | 76 | — | — |
| the app name | 160 | 160.7 | 0.7 |
| the tagline | 188 | 189.0 | 1.0 |
| the version | 210 | 211.0 | 1.0 |
| the "Built with" label | 256 | 257.6 | 1.6 |
| the first chip row | 286 | 287.4 | 1.4 |
| the second chip row | 320 | 322.2 | 2.2 |
| the "More" divider's label | 378 | 381.0 | 3.0 |
| the Changelog row's icon | 431 | 433.7 | 2.7 |
| the Contact row's icon | 877 | 879.2 | 2.2 |

**Before this wave's board correction the same table read 4 dp, 13 dp, 13 dp and 17 dp** — the version line, the two chip rows and the "More" divider were all out. The four fixes in §4 close them.

**What the board now says, read back from Penpot.** `About title` — Manrope, 22 px, weight 600, box 28 tall, y = 16. `About links label` — "More", Cormorant Garamond, 18 px, weight 400, italic, letterSpacing 0 (the label's width moved 34 → 33, which is the trailing tracking that was removed). `About tagline` — 15/22. `About version` — "Version 1.1.0 (2)", 13/18. `About built with card` — 114 tall, its chips at +42 and +76 inside it.

**The page holds 65 boards and the plan holds 61.** The four that are not in the plan are the Login boards (`Login / light — orb peak`, `Login / light — orb rest`, `Login / dark — orb peak`, `Login / dark — orb rest`), which `designs/build-penpot-app.js` deliberately does not rebuild — the login pass owns them, and the links pass skips them (8 skipped connectors). Every one of the plan's 61 boards is on the page, and there are no stale boards left over from an earlier wave.

**The pipeline, run once, end to end:** plan → 18 build calls (61 boards) → 15 links calls (373 connectors, 8 skipped) → 1 flow call (`SIMBA app`, starting at `Splash / light`) → `check-grid.js` → **0 overlapping pairs**.

---

## 7. What this wave does NOT fix

- **The font gate still cannot see 426 of the app's 685 text tags** (§2.9). Any style passed conditionally — `style={cond ? styles.a : styles.b}` — is invisible to `scripts/check-font-resolution.js`, and every one of those is an unguarded font resolution. The two that actually shipped are guarded by a new test; the rest are not.
- **The Privacy and Terms pages still paint a hardcoded gold slab** (`#D4B47A`) over the whole screen, which in the dark theme is a gold page with brown text (`md/PROFILE_RC1_REFACTOR.md` §6.2). Both are one tap from the About page and both are still wrong.
- **The support address `support@simbaplayer.app` is unverified** (CF-13), and so is the `https://simbaplayer.app` linking prefix (CF-07). Both were left alone: they are not machine-checkable, and the owner did not correct them.
- **The app's `package.json` version is still `0.0.1`.** It is the npm placeholder and no gate reads it; the About page no longer does either.
- The rest of the R waves (R3, R4, R5, R6) and the standing backlog are untouched.
