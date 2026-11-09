# SIMBA — Figma Build Spec: Login screen

**Screen:** `Login` (root stack screen) · **App:** `MOBILE_APP_REACT_NATIVE` · **Branch:** `f5/w22-close-minimise-d9` · **Commit:** `9ff8e2d`
**Status:** Source-of-truth build spec — every value below is read from the app's source at that commit
**Reference frame:** **390 × 844 pt** (iPhone 14) · secondary column **412 × 915 dp** (typical Android)

> **No Figma MCP is configured in this environment, so this document is the source of truth.**
> The repo's `.mcp.json` registers exactly one server — `argent` (`.mcp.json:1-11`) — and there is no
> Figma connector, so nothing here was pushed into a Figma file and no Figma file was read. Every
> number is traceable to a `file:line` in the app source at commit `9ff8e2d`. Rebuild from this
> document, not from a live file.

---

## 0. How to use this document

1. Create a frame **390 × 844**, name it `Login` (see §1 for the grid and the insets).
2. Build the layer tree in §3 top-down. Every node carries its type, position, size, Auto Layout
   settings, fills, strokes, radii and effects.
3. §2 lists only the tokens this screen actually consumes. §4 lists every text run with its exact
   font file. §5 and §6 cover the button's variants and the screen's states.
4. §10 is the checklist a reviewer runs down against the rebuilt file.

**Citation rule used throughout:** `file.ts:LINE` means the value is literally on that line of that
file at commit `9ff8e2d`. Where a value is computed at runtime, the **formula** is given together
with the frame width it was designed against, and the computed value for 390 × 844 and 412 × 915.

---

## 1. Frame setup

### 1.1 The frame

| Property | Value | Source |
|---|---|---|
| Frame size (reference) | 390 × 844 pt | design choice for this spec; the app is fluid |
| Background fill | `background.primary` — dark `#0A0A0C`, light `#F5F0E8` | `src/screens/Login/components/LoginScreen.tsx:118` → `src/theme/tokens.ts:191` (dark), `:267` (light) |
| Clip content | On (the root View is `flex: 1` and paints the whole screen) | `src/screens/Login/components/LoginScreen.tsx:235-237` |
| Corner radius | 0 (no radius token is applied to the root) | `src/screens/Login/components/LoginScreen.tsx:235-237` |
| Device frame | iPhone 14 / iPhone 13 (390 × 844). Android equivalent 412 × 915 | design choice for this spec |

### 1.2 Safe-area insets

The screen reads the insets at runtime and **does not define them**:

| Insets | Used as | Source |
|---|---|---|
| `insets.top` | `paddingTop` of the `Content` frame | `src/screens/Login/components/LoginScreen.tsx:121` |
| `insets.bottom` | `paddingBottom` of the `Bottom Section` frame, `insets.bottom + 16` | `src/screens/Login/components/LoginScreen.tsx:165` |
| Provider | `SafeAreaProvider` wraps the whole app | `App.tsx:109` |

**Reference device values (NOT defined in source — read at runtime from the OS):**

| Device | `insets.top` | `insets.bottom` |
|---|---|---|
| iPhone 14 (390 × 844) | **47 pt** | **34 pt** |
| Android 412 × 915 (status bar + gesture nav) | **24 dp** | **34 dp** |

In Figma, put the status-bar and home-indicator blocks on a **separate overlay frame** (or use
Figma's device frame), and give the `Content` frame a top padding of 47 and the `Bottom Section`
frame a bottom padding of 50 (= 34 + 16).

### 1.3 Status bar

`SimbaStatusBar variant="home"` is mounted once for the whole app, above the navigator
(`src/app/AppContent.tsx:134`). It is **translucent with a transparent background**, and the bar
style follows the theme: `light-content` in dark, `dark-content` in light
(`src/components/StatusBar.tsx:29-40`). The Login screen itself paints no status-bar element.

### 1.4 Layout regions

| Region | Layout model | Notes |
|---|---|---|
| `Content` | Vertical Auto Layout, **fill** width & height | padding top = `insets.top`, padding left/right = **32** (`LoginScreen.tsx:246-249`) |
| `Logo Area` | Vertical Auto Layout, **fill** height (it is `flex: 1`), **fixed** width 326 | `justifyContent: center`, `alignItems: center`, `marginTop: -40` (`LoginScreen.tsx:250-255`) |
| `Logo Stack` | Vertical Auto Layout, **fixed** 280.8 × 280.8 | centred in `Logo Area` (`LoginScreen.tsx:256-261`) |
| `Orb Glow` | **Absolutely positioned** inside `Logo Stack` | `position: absolute`, `top: 0`, `left: 0` (`LoginScreen.tsx:238-245`) |
| `Logo Block` | Vertical Auto Layout, hug width, hug height | centred in `Logo Stack` (`LoginScreen.tsx:262-265`) |
| `Bottom Section` | Vertical Auto Layout, **fixed** width 326, hug height | `alignItems: center`, `paddingBottom = insets.bottom + 16` (`LoginScreen.tsx:165`, `:279-281`) |
| `Button Wrap` | Vertical Auto Layout, **fixed** width 326, **min height 80** | `marginBottom: 24` (`LoginScreen.tsx:282-286`) |
| `Legal Row` | **Horizontal** Auto Layout, hug width, hug height | `gap: 8`, centred (`LoginScreen.tsx:301-306`) |
| `Error Wrap` | Vertical Auto Layout, **fixed** width 260, hug height | `alignItems: center`, `gap: 6` (`LoginScreen.tsx:293-296`) |
| `Google Sign-In` button | **Horizontal** Auto Layout, **fixed** width 260, hug height | `paddingVertical 14`, `paddingHorizontal 24`, `minWidth 260` (`GoogleSignInButton.tsx:61-78`) |

---

## 2. Design tokens used by this screen

Only tokens the Login screen actually reads are listed. Dark and light are both shipped — the
theme is a user setting (`src/theme/index.tsx:69-79`), so **build the frame twice**.

### 2.1 Colour tokens

| Token | Dark | Light | Source |
|---|---|---|---|
| `background.primary` (screen fill) | `#0A0A0C` | `#F5F0E8` | `src/theme/tokens.ts:191`, `:267` |
| `background.elevated` (button fill) | `#141416` | `#FFFFFF` | `src/theme/tokens.ts:192`, `:268` |
| `accent.gold` (orb fill, spinner, `Try Again` text) | `#C9A84C` | `#B8922E` | `src/theme/tokens.ts:245`, `:321` |
| `border.subtle` (button 1 pt stroke) | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.06)` | `src/theme/tokens.ts:232`, `:308` |
| `text.primary` (button label) | `#EDEDED` | `#1A1A1C` | `src/theme/tokens.ts:236`, `:312` |
| `text.tertiary` (legal links + dot) | `rgba(237,237,237,0.30)` | `rgba(26,26,28,0.30)` | `src/theme/tokens.ts:238`, `:314` |
| `semantic.error` (error copy) | `#EF5350` | `#EF5350` | `src/theme/tokens.ts:258`, `:335` |

### 2.2 Literal (non-token) colours — hard-coded in the screen

| Value | Where | Source |
|---|---|---|
| `#5C3A1E` | the lion glyph fill **and** the `Simba` wordmark | `src/screens/Login/components/LoginScreen.tsx:143`, `:146` |
| `#6B4226` | the tagline text | `src/screens/Login/components/LoginScreen.tsx:156` |
| `#5C3A1E` | `accent.brandInk` — the same hex as a token, but the screen uses the literal | `src/theme/tokens.ts:253`, `:329` |
| `#000` | button shadow colour | `src/components/core/GoogleSignInButton/GoogleSignInButton.tsx:73` |
| `#EA4335` `#4285F4` `#FBBC05` `#34A853` | the four Google G path fills | `src/components/core/GoogleSignInButton/GoogleSignInButton.tsx:17-20` |

> **Note for the designer:** `#5C3A1E` (brand ink) and `#6B4226` (tagline brown) are **warm browns**
> baked into the screen. In the **light** theme they read as an engraved mark on parchment; in the
> **dark** theme they are dark brown on near-black and therefore very low contrast. Both are the
> source's choice — reproduce them as-is and flag it in review.

### 2.3 Radius / spacing / shadow tokens

| Token | Value | Source |
|---|---|---|
| `radius.md` → button corner radius | 12 (hard-coded as `12`, same as the token) | `src/components/core/GoogleSignInButton/GoogleSignInButton.tsx:70`; token at `src/theme/tokens.ts:440` |
| `radius.full` → orb, ring, dot | `ORB_SIZE / 2`, `ringSize / 2`, `1.5` | `src/screens/Login/components/LoginScreen.tsx:244`; `src/components/feedback/ActivityOrb/ActivityOrb.tsx:156`, `:163`; `src/screens/Login/components/LoginScreen.tsx:313` |
| `spacing.lg` → button horizontal padding | 24 (hard-coded) | `src/components/core/GoogleSignInButton/GoogleSignInButton.tsx:69`; token at `src/theme/tokens.ts:420` |

The button's shadow is **hard-coded in the component**, not read from `shadows.md`:

| Property | Value | Source |
|---|---|---|
| Shadow colour | `#000` | `GoogleSignInButton.tsx:73` |
| Shadow offset | X 0, Y 4 | `GoogleSignInButton.tsx:74` |
| Shadow opacity | 0.25 | `GoogleSignInButton.tsx:75` |
| Shadow blur (radius) | 12 | `GoogleSignInButton.tsx:76` |
| Android elevation | 6 | `GoogleSignInButton.tsx:77` |

**Figma equivalent:** Drop shadow, colour `#000000`, opacity 25 %, blur 12, **Y offset 4**, spread 0.

---

## 3. Layer tree

Figma vocabulary: `FRAME` · `TEXT` · `VECTOR` · `INSTANCE` · `ELLIPSE`. Positions are relative to the
**parent's** content box, in pt, for the **390 × 844** reference frame (`insets.top = 47`,
`insets.bottom = 34`).

### 3.1 The tree

```
L0   FRAME    "Login"                                   390 × 844    @ 0,0
│                                                       fill: background.primary
└── L1 FRAME    "Content"                               390 × 844    @ 0,0
    │                                               Auto Layout: vertical · fill × fill
    │                                               padding: top 47 · left/right 32 · bottom 0
    │                                               opacity: fadeAnim (0 → 1, 600 ms)
    ├── L2  FRAME    "Logo Area"                      326 × 665    @ 32,7
    │   │                                           Auto Layout: vertical · fill h × fixed w
    │   │                                           padding 0 · gap 0 · align: center / center
    │   │                                           margin-top: -40
    │   └── L3  FRAME  "Logo Stack"                  280.8 × 280.8 @ 54.6, 199.1
    │       │                                       Auto Layout: vertical · fixed × fixed
    │       │                                       align: center / center
    │       ├── L4  ELLIPSE "Orb Glow"               280.8 × 280.8 @ 0,0   (absolutely positioned)
    │       │                                       fill: accent.gold · opacity 0.08 → 0.16
    │       │                                       scale 1 → 1.12 (continuous loop)
    │       └── L5  FRAME  "Logo Block"              280.8 × H @ 0, (280.8 − H)/2
    │           │                                   Auto Layout: vertical · hug × hug
    │           │                                   align: center / center · gap 0
    │           ├── L6  VECTOR "Lion"                96 × 96
    │           │                                   fill/stroke: #5C3A1E (currentColor)
    │           ├── L7  TEXT    "Simba"              hug × 56
    │           │                                   Allura-Regular · 48 / 56 · #5C3A1E
    │           │                                   margin-top: 14
    │           └── L8  FRAME  "Tagline Wrap"        hug × 56N
    │               │                               Auto Layout: vertical · hug × hug
    │               │                               align: center · margin-top: 2
    │               │                               opacity 0 → 1 · translateY 20 → 0
    │               └── L9  TEXT "Your media, your way"  ≤280.8 × 56N
    │                                               Cormorant Garamond · 48 / 56 · #6B4226
    │                                               text-align: center
    └── L10 FRAME  "Bottom Section"                 326 × 172    @ 32,672
        │                                           Auto Layout: vertical · fixed w × hug h
        │                                           align: center · gap 0
        │                                           padding-bottom: 50 (= insets.bottom 34 + 16)
        │                                           opacity: buttonOpacity (0 → 1, 400 ms)
        ├── L11 FRAME  "Button Wrap"                326 × 80     @ 32,672
        │   │                                       Auto Layout: vertical · fixed w × min-h 80
        │   │                                       align: center · margin-bottom: 24
        │   │                                       scale 0.9 → 1 (spring)
        │   ├── L12 INSTANCE "Google Sign-In / Default"  260 × 52 @ 65,672
        │   │   │                                   Auto Layout: horizontal · fixed w × hug h
        │   │   │                                   fill: background.elevated
        │   │   │                                   stroke: border.subtle · 1 pt inside
        │   │   │                                   radius 12 · padding 14 v / 24 h
        │   │   │                                   drop shadow (see §2.3)
        │   │   ├── L13 VECTOR "Google G"           22 × 22
        │   │   └── L14 TEXT    "Sign in with Google"  hug × 24
        │   │                                       Inter · 16 / 24 · weight 600 · ls 0.3
        │   │                                       colour: text.primary
        │   └── [L15 FRAME "Error Wrap"   — only when `error` is set]
        │       │                                   Auto Layout: vertical · fixed w 260 × hug h
        │       │                                   align: center · gap 6
        │       ├── L16 TEXT "…"                     ≤260 × 18M
        │       │                                   Inter · 13 / 18 · colour: semantic.error
        │       │                                   text-align: center
        │       └── [L17 TEXT "Try Again" — hidden when errorKind = 'cancelled']
        │                                               Inter · 14 / 20 · weight 600 · underline
        │                                               colour: accent.gold
        └── L18 FRAME  "Legal Row"                   hug × 18     @ centred, 776
            │                                       Auto Layout: horizontal · hug × hug
            │                                       align: center / center · gap 8
            ├── L19 TEXT "Privacy Policy"            hug × 18
            │                                       Inter · 13 / 18 · colour: text.tertiary · underline
            ├── L20 ELLIPSE "Legal Dot"              3 × 3
            │                                       fill: text.tertiary
            └── L21 TEXT "Terms of Service"          hug × 18
                                                    Inter · 13 / 18 · colour: text.tertiary · underline
```

**Layer count:** 22 layers in the Login frame tree (L0 – L21, root frame included). L15 – L17 are
present only in an error state; L17 only for four of the five error kinds. Two further overlays are
owned by the app root, not by this screen — see §6.4.

### 3.2 The frame-to-frame geometry (390 × 844)

Derived by hand from the source's Yoga layout; every input is cited. The formulas are in §9.

| Node | Position | Size | Note |
|---|---|---|---|
| L0 `Login` | 0, 0 | 390 × 844 | fills the device |
| L1 `Content` | 0, 0 | 390 × 844 | `flex: 1`; inner content box = x 32…358, y 47…844 |
| L2 `Logo Area` | 32, **7** | 326 × **665** | `marginTop: -40` lifts it above the padding box top (47 − 40 = 7) |
| L3 `Logo Stack` | 54.6, **199.1** | 280.8 × 280.8 | centred in L2: x = 32 + (326 − 280.8)/2; y = 7 + (665 − 280.8)/2 |
| L4 `Orb Glow` | 0, 0 (in L3) | 280.8 × 280.8 | absolute, behind the logo block |
| L5 `Logo Block` | 0, 25.4 (in L3) | 280.8 × **230** | see the wrap note below — H is font-metric dependent |
| L6 `Lion` | 147.0, 224.5 | 96 × 96 | centred in L5: x = 54.6 + (280.8 − 96)/2 |
| L7 `Simba` | hug, 334.5 | hug × 56 | y = 224.5 + 96 + 14 |
| L8 `Tagline Wrap` | hug, 392.5 | hug × 56N | y = 334.5 + 56 + 2 |
| L9 tagline text | centred | ≤280.8 × 56N | y = 392.5 |
| L10 `Bottom Section` | 32, 672 | 326 × 172 | 80 (button wrap) + 24 (margin) + 18 (legal) + 50 (padding) = 172 |
| L11 `Button Wrap` | 32, 672 | 326 × 80 | `minHeight: 80`; the button sits at the **top** of this box |
| L12 `Google Sign-In` | 65, 672 | 260 × 52 | x = 32 + (326 − 260)/2; height = 24 (label line box) + 14 + 14 |
| L18 `Legal Row` | centred, 776 | hug × 18 | centred in the 326-wide content box; x is font-metric dependent (see §11 #2) |
| L20 `Legal Dot` | — | 3 × 3 | vertically centred on the 18-tall legal row |

> **The tagline wrap is the one genuinely font-metric-dependent measurement on this screen.**
> The tagline uses the `displaySerif` token — **48 px / 56 line-height** (`src/theme/tokens.ts:399`)
> — and there is **no `maxWidth`** on it (`src/screens/Login/components/LoginScreen.tsx:276-278`).
> Its only width constraint is the `Logo Stack` width of **280.8 pt**, so the string
> `"Your media, your way"` wraps to however many lines Cormorant Garamond Bold needs at 48 px:
>
> - **N = 1** → `Logo Block` height `H = 96 + 14 + 56 + 2 + 56 = 174` → L5 at y **252.5**
> - **N = 2** → `H = 96 + 14 + 56 + 2 + 112 = 230` → L5 at y **224.5** (the numbers quoted above)
>
> The formula for the whole block is `H = 96 + 14 + 56 + 2 + 56·N`, and each child's y inside the
> block is `96`, `96 + 14`, `96 + 14 + 56 + 2` below the block's top. **Install
> `assets/fonts/CormorantGaramond-Bold.ttf` in Figma and set the same 280.8 pt box width** — Figma
> will then wrap identically to React Native, and N resolves itself. Do not hard-code a line count.

### 3.3 The logo asset

| Property | Value | Source |
|---|---|---|
| Component | `SvgIcon name="lion" size={96} color="#5C3A1E"` | `src/screens/Login/components/LoginScreen.tsx:143` |
| Icon registry entry | `lion → LionSvg` | `src/components/utility/SvgIcon/SvgIcon.tsx:9`, `:113` |
| Asset file | `src/assets/svg/ui_lion.svg` | `src/components/utility/SvgIcon/SvgIcon.tsx:9` |
| Intrinsic viewBox | `0 0 215 215` (square) → rendered at 96 × 96, scale factor 96/215 = 0.4465 | `src/assets/svg/ui_lion.svg:1` |
| Outer ring | `<circle cx="107.2" cy="107.2" r="107.2" stroke="currentColor" stroke-width="0.5" opacity="0.2"/>` | `src/assets/svg/ui_lion.svg:2` |
| Lion body | one `<path fill="currentColor" …>` | `src/assets/svg/ui_lion.svg:3` |
| Colour | `#5C3A1E` — passed via the `color` prop, which resolves `currentColor` | `src/screens/Login/components/LoginScreen.tsx:143` |

**In Figma:** import `src/assets/svg/ui_lion.svg` as a vector, set the layer to **96 × 96**, set all
fills/strokes to `#5C3A1E`, and set the outer circle's stroke to `#5C3A1E` at **20 % opacity** with a
**0.22 pt** stroke (0.5 × 0.4465). Do **not** add a background circle or a rounded container — the
source draws the glyph directly.

---

## 4. Typography

`AppText` resolves a `variant` to a typography token and then applies the caller's `style` **on top**
(`src/components/core/AppText/AppText.tsx:80-90`), so the table below lists the token **and** every
override. The weight column is the weight the source asks for; note §4.1's caveat.

| # | Run | Family | Size / Line | Weight | Letter spacing | Align | Colour | Source |
|---|---|---|---|---|---|---|---|---|
| T1 | `Simba` | **Allura-Regular** | 48 / 56 | — (single weight, no `fontWeight`) | 0 | left (inherits) | `#5C3A1E` | token `src/theme/tokens.ts:397`; family `src/constants/fontFamily.ts:66`; colour + margin `LoginScreen.tsx:144-148`, `:269-271` |
| T2 | `Your media, your way` | **Cormorant Garamond** (Bold file) | 48 / 56 | — (token has no `fontWeight`) | 0 | center | `#6B4226` | token `src/theme/tokens.ts:399`; family `src/constants/fontFamily.ts:74`; colour `LoginScreen.tsx:154-158`; align `LoginScreen.tsx:276-278` |
| T3 | `Sign in with Google` | **Inter** | **16** / **24** | **600** | **0.3** | left | `text.primary` | `GoogleSignInButton.tsx:84-89`; line-height inherited from the `body1` token (`src/theme/tokens.ts:388`) because the override sets `fontSize` but not `lineHeight` |
| T4 | error copy | **Inter** | **13** / **18** | — (regular) | 0 | center | `semantic.error` | `LoginScreen.tsx:287-292`; `AppText` default variant is `body1` → `src/theme/tokens.ts:388` |
| T5 | `Try Again` | **Inter** | **14** / **20** | **600** | 0 | left | `accent.gold` | token `bodySmall` `src/theme/tokens.ts:390`; weight + underline `LoginScreen.tsx:297-300`; colour key `accent` → `AppText.tsx:72` |
| T6 | `Privacy Policy` | **Inter** | **13** / **18** | — (regular) | 0 | left | `text.tertiary` | token `caption` `src/theme/tokens.ts:391`; colour key `tertiary` → `AppText.tsx:69`; underline `LoginScreen.tsx:307-309` |
| T7 | `Terms of Service` | **Inter** | **13** / **18** | — (regular) | 0 | left | `text.tertiary` | same as T6 |

### 4.1 The weight caveat (read before you set the font in Figma)

> **CORRECTED 2026-11-09.** The paragraph below originally claimed that
> *"`fontFamily: 'Inter'` + weight 600 resolves to **Inter-Bold.ttf** on
> Android"*. That was wrong twice over. React Native opens ONE exact asset
> path — `"fonts/" + family + suffix`, where the suffix is `""` /
> `"_bold"` / `"_italic"` / `"_bold_italic"`, chosen by the weight
> (`>= 700` selects the bold slots) — and falls back to the **system font**
> when that path does not exist (`ReactFontManager.kt:138-144, :162-178,
> :187`). So `'Inter'` + weight 600 asked for `fonts/Inter.ttf`, which the
> app did not ship, and the run rendered in **Roboto**. The shipped files
> have been renamed to RN's convention (`fonts/Inter.ttf`,
> `fonts/Inter_bold.ttf`, `fonts/Inter SemiBold.ttf`, …) and the tokens
> carry the weight again (`src/theme/tokens.ts`). Evidence:
> `md/SIMBA_APP_PAGE_ISSUE_SCAN.md` S-025 … S-029.

The architecture now encodes the weight in **two** places, because that is
what the runtime actually needs:

- **the family name** — when the font vendor bakes the weight into
  `nameId=1` (`Inter SemiBold`, `Inter Medium`, `Manrope SemiBold`), and
- **the `fontWeight`** — when one family ships several files under one name
  (`Inter` Regular + Bold, `Cormorant Garamond` Regular + Bold + Italic).

Two of this screen's runs use a weight-specific family:

- **T3** (`Sign in with Google`) — `GoogleSignInButton.tsx:84-92` sets
  `fontFamily: FONT_FAMILY.inter.semibold` = **`'Inter SemiBold'`** with
  `fontWeight: '600'`, so the path RN opens is `fonts/Inter SemiBold.ttf`.
  (Before the fix the label inherited `body1`'s `'Inter'` and asked for
  `fonts/Inter.ttf` → Roboto Regular.) **Set this run to Inter SemiBold.**
- **T5** (`Try Again`) — `LoginScreen.tsx:297-305` sets the same
  `fontFamily` + `fontWeight: '600'`. **Set Inter SemiBold.**

The files these runs resolve to are in `assets/fonts/`:
`Allura.ttf`, `Cormorant Garamond.ttf`, `Cormorant Garamond_bold.ttf`,
`Cormorant Garamond_italic.ttf`, `Inter.ttf`, `Inter_bold.ttf`,
`Inter Medium.ttf`, `Inter SemiBold.ttf`, `JetBrains Mono.ttf`,
`Manrope SemiBold.ttf`, `Manrope_bold.ttf`.
`scripts/check-font-resolution.js` resolves every usage in `src/` the way
RN does and fails if any of them would fall back to the system font.

### 4.2 Three typography facts the designer should know

1. **The tagline renders at 48 px, not 16 px.** `src/theme/typographyStyles.ts:116-122` defines a
   `splashTagline` token (Cormorant Italic, 16 / 22) described as *"Splash / Login tagline"*, but
   `LoginScreen.tsx:154-158` uses `variant="displaySerif"` — the **48 px** token. The source's own
   comment on the wordmark says the same thing for the wordmark
   (`LoginScreen.tsx:266-268`). **Reproduce 48 px**; flag the unused-token mismatch to a human.
2. **The wordmark's optical gap is 14 pt**, not a spacing token (`LoginScreen.tsx:269-271`).
3. **Android text padding.** `includeFontPadding: false` is applied to the *semantic* typography
   helpers (`src/theme/typographyStyles.ts:135-136`), **not** to `AppText`'s token variants — so
   `AppText` on Android keeps the platform's extra text padding. This is a sub-pixel baseline
   difference between the two platforms, not a layout change.

---

## 5. Component and variant definitions — `Google Sign-In` button

`src/components/core/GoogleSignInButton/GoogleSignInButton.tsx`

### 5.1 The button component

| Property | Default | Pressed | Disabled | Loading | Source |
|---|---|---|---|---|---|
| Frame | 260 × 52, radius 12 | same | same | same | `:61-78` |
| Fill | `background.elevated` — `#141416` dark / `#FFFFFF` light | same | same | same | `:65` |
| Stroke | `border.subtle`, 1 pt, **inside** | same | same | same | `:66-67` |
| Padding | 14 vertical / 24 horizontal | same | same | same | `:68-69` |
| Min width | 260 | same | same | same | `:71` |
| Shadow | `#000`, Y 4, 25 %, blur 12, elevation 6 | same | same | same | `:73-77` |
| Content row | horizontal, `gap: 12`, align centre | same | same | **not rendered** | `:79-83` |
| Icon | Google G, 22 × 22, viewBox `0 0 48 48` | same | same | replaced | `:51`, `:15-23` |
| Label | `Sign in with Google`, Inter 16/24, weight 600, ls 0.3, `text.primary` | same | same | replaced | `:52`, `:84-89` |
| Spinner | — | — | — | `ActivityOrb size={20}` in `accent.gold` | `:47-48` |
| Press feedback | — | whole button opacity **0.85** | — | — | `:42` |
| Touch blocked | no | no | **yes** | **yes** | `:34`, `:41` |

### 5.2 The Google G vector

Four paths on a `0 0 48 48` viewBox, rendered at 22 × 22 (`GoogleSignInButton.tsx:15-23`):

| Path | Fill | Purpose |
|---|---|---|
| `M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85…` | `#EA4335` | red arc (top) |
| `M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94…` | `#4285F4` | blue arc (right) |
| `M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59…` | `#FBBC05` | yellow arc (left) |
| `M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6…` | `#34A853` | green arc (bottom) |

Plus one invisible path (`M0 0h48v48H0z`, fill `none`) that clips the viewBox.

**In Figma:** place the official Google "G" as a single vector (the path data above is the source of
truth — do not redraw it), 22 × 22, and place it 12 pt to the left of the label.

### 5.3 The loading spinner — `ActivityOrb`

`src/components/feedback/ActivityOrb/ActivityOrb.tsx` — used by the button at `size={20}`.

| Part | Size | Fill / stroke | Radius | Source |
|---|---|---|---|---|
| Container | 20 × 20 | — | — | `:36`, `:146-151` |
| Ring 1 / 2 / 3 | 20 × 20 each | stroke `accent.gold`, **2.5 pt** | 10 | `:152-158` |
| Centre orb | **7 × 7** (`20 × 0.35`) | fill `accent.gold` | 3.5 | `:37`, `:159-164` |

The rings are stacked in the same 20 × 20 box, so they read as one concentric figure. Ring opacity
rests at **0.25** (`:41`, `:43`, `:45`) and the centre orb has no ring border.

---

## 6. States and variants

### 6.1 The screen's state matrix

| # | State | Trigger | What changes | Source |
|---|---|---|---|---|
| 1 | **Default** | `error === null`, `isLoading === false` | full layout below | `LoginScreen.tsx:173` |
| 2 | **Pressed** | finger down on the button | whole button opacity → **0.85** | `GoogleSignInButton.tsx:42` |
| 3 | **Loading** | `isLoading === true` | the G + label are replaced by the `ActivityOrb` (20 pt gold); the button is not tappable | `GoogleSignInButton.tsx:34`, `:47-48` |
| 4 | **Disabled** | `isAuthenticated === true` → `disabled` prop | **no visual change exists in the source** — the button keeps its fill, stroke, label and shadow; only the touch handler is removed | `LoginScreen.tsx:170`; `GoogleSignInButton.tsx:34`, `:41` |
| 5 | **Error** | `error !== null` | an `Error Wrap` appears under the button (see §3.1 L15–L17) | `LoginScreen.tsx:173-199` |
| 6 | **Reduce motion** | `AccessibilityInfo.isReduceMotionEnabled()` | see §7.3 — the entrance animation is skipped entirely and the orb freezes | `src/hooks/useAccessibility.ts:14-22` |

### 6.2 The five `AuthErrorKind` cases

The kind union is declared at `src/state/authStore.ts:28-33`. The screen maps each kind to a tailored
string (`src/screens/Login/components/LoginScreen.tsx:28-34`) and **hides the `Try Again` link when
the kind is `cancelled`** (`LoginScreen.tsx:181`) — "the button itself is the retry" (`:27`).

| Kind | Message shown | `Try Again` link | Source |
|---|---|---|---|
| `cancelled` | `Sign-in was cancelled. Tap the button to try again.` | **hidden** | copy `LoginScreen.tsx:29`; hide rule `LoginScreen.tsx:181` |
| `play_services` | `Google Play Services aren't available. Update them, then try again.` | shown | copy `LoginScreen.tsx:30` |
| `offline` | `You're offline. Connect to the internet and try again.` | shown | copy `LoginScreen.tsx:31` |
| `session_expired` | `Your session expired. Please sign in again.` | shown | copy `LoginScreen.tsx:32` |
| `unknown` | `ERROR_COPY.unknown` is the **empty string**, so the screen falls back to the **raw error message** stored by the auth store | shown | `LoginScreen.tsx:33` (empty), fallback `:177-180` |

**The `unknown` fallback string is not fixed** — it is whatever the store holds. The raw messages the
auth layer can produce:

| Raw message | Kind it arrives with | Source |
|---|---|---|
| `Sign-in timed out. Please try again.` | `unknown` (30 s sign-in timeout) | `src/services/authService.ts:106` (timeout at `:234-237`) |
| `Sign-in failed. Please try again.` | `unknown` (fallback when the thrown error has no message) | `src/services/authService.ts:168` |
| the raw `Error.message` of an unclassified throw | `unknown` | `src/services/authService.ts:130`, `:168` |

**Error-block geometry.** The error text is `maxWidth: 260`, centred, 13 / 18
(`LoginScreen.tsx:287-292`), so it wraps to `M = ceil(textWidth / 260)` lines and the block is
`18·M` tall. The `Try Again` link is 14 / 20 (`bodySmall`). The `Error Wrap` height is therefore
`18·M + 6 + 20` (with the link) or `18·M` (for `cancelled`), and the `Button Wrap` grows past its
`minHeight: 80` when `18·M + 6 + 20 > 28`. Because `Logo Area` is `flex: 1`, **an error pushes the
logo block upward** — recompute `Logo Stack`'s y with the shorter `Logo Area` height (§9.2).

### 6.3 The legal row

| Item | Content | Style | Action | Source |
|---|---|---|---|---|
| `Privacy Policy` | text link | caption 13 / 18, `text.tertiary`, underlined | `navigationRef.navigate('Settings', {screen: 'Privacy'})` | `LoginScreen.tsx:204-213` |
| dot | 3 × 3 circle | fill `text.tertiary` | — | `LoginScreen.tsx:214`, `:310-314` |
| `Terms of Service` | text link | caption 13 / 18, `text.tertiary`, underlined | `navigationRef.navigate('Settings', {screen: 'Terms'})` | `LoginScreen.tsx:215-224` |

Both links use `activeOpacity: 0.7` and a `hitSlop` of 12 pt on all sides
(`LoginScreen.tsx:184`, `:207`, `:218`).

### 6.4 Global overlays above this screen (owned by the app root, not by Login)

| Overlay | When | What the designer needs | Source |
|---|---|---|---|
| `OfflineBanner` | the device is offline | absolute, top 0, full width, z-index 100; padding-top = `insets.top`; banner fill `semantic.error + '26'` (≈ 15 % red), `bodySmall` 14 / 20 in `semantic.error`, min height 36, padding 16 h / 8 v, gap 6; text `⚠ No internet connection — showing saved content`; slides down from −60 with a 300 ms timing | `src/components/status/OfflineBanner/OfflineBanner.tsx:31`, `:39-60`, `:66-82` |
| `GlobalOperationProgress` | a library scan is running | a centred `OperationProgress` card, title `Scanning library…` | `src/components/status/GlobalOperationProgress/GlobalOperationProgress.tsx:14-38` |

> **Source observation, for a human to resolve:** `OfflineBanner` is mounted **twice** — once in
> `src/app/AppContent.tsx:139` and once inside the root stack at
> `src/navigation/RootNavigator.tsx:292`. Both instances paint the same absolute banner, so the
> offline state renders the banner twice on the Login screen. Reproduce **one** banner and flag the
> duplicate mount.

---

## 7. Motion

All of it is `Animated` with `useNativeDriver: true`; nothing here uses the `motion` token block
(`src/theme/tokens.ts:528-535`) — the durations are literal.

### 7.1 Entrance timeline

| # | Element | Property | From → To | Delay | Duration | Easing | Source |
|---|---|---|---|---|---|---|---|
| M1 | `Content` (whole screen) | opacity | 0 → 1 | 0 | **600 ms** | default (RN `Easing.inOut(Easing.ease)` — no `easing` key is passed) | `src/screens/Login/hooks/useLoginScreen.ts:25-29` |
| M2 | `Logo Block` | opacity | 0 → 1 | **0 ms** | **500 ms** | default | `LoginScreen.tsx:79-84` |
| M3 | `Logo Block` | scale | **0.8** → 1 | 0 ms | spring, **friction 6, tension 60** | — | `LoginScreen.tsx:82` |
| M4 | `Tagline Wrap` | opacity | 0 → 1 | **200 ms** | **400 ms** | `Easing.out(Easing.cubic)` | `LoginScreen.tsx:86-91` |
| M5 | `Tagline Wrap` | translateY | **20 → 0** | 200 ms | 400 ms | `Easing.out(Easing.cubic)` | `LoginScreen.tsx:89` |
| M6 | `Bottom Section` (opacity) | opacity | 0 → 1 | **400 ms** | **400 ms** | default | `LoginScreen.tsx:93-98` |
| M7 | `Button Wrap` | scale | **0.9** → 1 | 400 ms | spring, **friction 7, tension 80** | — | `LoginScreen.tsx:96` |

M2/M3 run in parallel; M4/M5 run in parallel; M6/M7 run in parallel. The three groups are kicked off
by `setTimeout(…, 0)`, `setTimeout(…, 200)` and `setTimeout(…, 400)` (`LoginScreen.tsx:79`, `:86`,
`:93`), and the timeouts are cleared on unmount (`:100-104`).

**In Figma:** the entrance is a Smart-Animate / prototype sequence — set the initial state to
opacity 0 and scale 0.8 (logo), opacity 0 and Y +20 (tagline), opacity 0 and scale 0.9 (button),
then play three chained transitions with **Smart Animate** and the delays above. Use *Ease out* for
the timing runs and a spring for the two scale runs.

### 7.2 The continuous orb pulse

| Property | Value | Source |
|---|---|---|
| Loop | `Animated.loop` of a `sequence` (0 → 1 → 0), infinite | `src/screens/Login/hooks/useLoginScreen.ts:32-47` |
| Each half-leg | **3000 ms** | `useLoginScreen.ts:36`, `:42` |
| Easing | `Easing.inOut(Easing.sin)` on both legs | `useLoginScreen.ts:38`, `:44` |
| Scale | `interpolate([0,1] → [1, 1.12])` | `LoginScreen.tsx:107-110` |
| Opacity | `interpolate([0,1] → [0.08, 0.16])` | `LoginScreen.tsx:112-115` |

Full cycle = **6000 ms**. At rest (`pulseAnim = 0`) the orb is scale 1 at 8 % opacity.

### 7.3 The `reduceMotion` path

`reduceMotion` comes from `AccessibilityInfo.isReduceMotionEnabled()` and updates live on the
`reduceMotionChanged` event (`src/hooks/useAccessibility.ts:11-24`).

| Element | Normal | **Reduce motion** | Source |
|---|---|---|---|
| `Content` opacity | animates 0 → 1 over 600 ms | **set to 1 immediately** — no fade | `useLoginScreen.ts:18-23` |
| Orb pulse | infinite loop | **`pulseAnim` set to 0.5 and frozen** → scale **1.06**, opacity **0.12** (linear interpolation of §7.2 at 0.5) | `useLoginScreen.ts:21` |
| Logo block | fades + scales in | **opacity 1, scale 1** — the whole entrance is skipped, no stagger | `LoginScreen.tsx:69-78` |
| Tagline | fades + slides up | **opacity 1, translateY 0** | `LoginScreen.tsx:72-73` |
| Button | fades + scales in | **opacity 1, scale 1** | `LoginScreen.tsx:74-75` |
| `ActivityOrb` spinner | 3 looping rings + pulsing centre | **static**: ring opacity **0.15**, all scales 1 | `src/components/feedback/ActivityOrb/ActivityOrb.tsx:50-60` |

**In Figma:** build a second variant of the frame with every element at its final value and the orb
at scale 1.06 / 12 % opacity — there is **no** entrance animation on that variant.

---

## 8. Copy deck

Every user-visible string on the Login screen, with its source.

| String | Where | Source |
|---|---|---|
| `Simba` | the wordmark (Allura) | `src/constants/brand.ts:15` (`BRAND.name`) — rendered at `LoginScreen.tsx:147` |
| `Your media, your way` | the tagline (Cormorant) | `src/constants/brand.ts:17` (`BRAND.tagline`) — rendered at `LoginScreen.tsx:157` |
| `Sign in with Google` | the button label | `src/components/core/GoogleSignInButton/GoogleSignInButton.tsx:52` |
| `Sign-in was cancelled. Tap the button to try again.` | error, `cancelled` | `LoginScreen.tsx:29` |
| `Google Play Services aren't available. Update them, then try again.` | error, `play_services` | `LoginScreen.tsx:30` |
| `You're offline. Connect to the internet and try again.` | error, `offline` | `LoginScreen.tsx:31` |
| `Your session expired. Please sign in again.` | error, `session_expired` | `LoginScreen.tsx:32` |
| *(raw store message)* | error, `unknown` | `LoginScreen.tsx:33` is `''` → the raw message at `LoginScreen.tsx:177-180`; candidates in `src/services/authService.ts:106`, `:168` |
| `Try Again` | the retry link | `LoginScreen.tsx:194` |
| `Privacy Policy` | legal link | `LoginScreen.tsx:211` |
| `Terms of Service` | legal link | `LoginScreen.tsx:222` |
| `⚠ No internet connection — showing saved content` | global offline banner | `src/components/status/OfflineBanner/OfflineBanner.tsx:58` |

**Accessibility labels (not visible, but they are part of the screen's contract):**
`Sign in with Google` (`GoogleSignInButton.tsx:45`), `Signing in` / `Try signing in again`
(`LoginScreen.tsx:187`), `Privacy Policy` (`LoginScreen.tsx:209`), `Terms of Service`
(`LoginScreen.tsx:220`). The button's `accessibilityLabel` stays `Sign in with Google` even while the
loading spinner replaces the text (`GoogleSignInButton.tsx:45`, `:47-48`).

---

## 9. Responsive notes

### 9.1 The orb size — the only width-driven value

```
ORB_SIZE = Math.min(windowWidth * 0.72, 320)
```

`src/screens/Login/components/LoginScreen.tsx:24-25`. `width` is `Dimensions.get('window').width`
(read **once at module load**, `LoginScreen.tsx:24`), so the orb does **not** resize on rotation or
a split-screen resize until the JS bundle reloads.

| Frame width | `width × 0.72` | `ORB_SIZE` | Logo Stack | Content box | Logo Stack x |
|---|---|---|---|---|---|
| **390** (iPhone 14) | 280.80 | **280.8** | 280.8 × 280.8 | 326 | 54.6 |
| **412** (Android) | 296.64 | **296.64** | 296.64 × 296.64 | 348 | 32 + (348 − 296.64)/2 = **57.7** |
| 444.4+ | ≥ 320 | **320** (capped) | 320 × 320 | width − 64 | 32 + (width − 64 − 320)/2 |

Everything else is width-independent: the content padding is a flat **32** on each side
(`LoginScreen.tsx:248`), the button's min width is a flat **260** (`GoogleSignInButton.tsx:71`), and
the error text's max width is a flat **260** (`LoginScreen.tsx:291`).

> **Narrow screens (≤ 324 pt):** the button's `minWidth: 260` plus the content padding of 64 gives a
> minimum comfortable width of 324 pt; below that the button overflows the content box. The source has
> no fallback — reproduce it and flag it.

### 9.2 The vertical layout is fluid — recompute, don't scale

The vertical stack is: `Content` (fill) → `Logo Area` (`flex: 1`) → `Bottom Section` (hug). The
bottom section's height is content-driven, so **anything that changes the bottom section's height
pushes the logo block upward** (because `Logo Area` centres its content in whatever space is left).

| Situation | `Bottom Section` height | `Logo Area` height | `Logo Stack` y |
|---|---|---|---|
| Default | 80 + 24 + 18 + 50 = **172** | 665 | **199.1** |
| Error with `Try Again`, 2-line text | 114 + 24 + 18 + 50 = **206** | 631 | **182.1** |
| Error `cancelled` (no link), 2-line text | 88 + 24 + 18 + 50 = **180** | 657 | **191.6** |

Formulas (390 × 844, `insets.top = 47`, `insets.bottom = 34`):

```
contentInnerHeight = frameHeight − insets.top                     = 844 − 47 = 797
logoAreaHeight     = contentInnerHeight − bottomSectionHeight + 40   (the +40 undoes marginTop: −40)
logoStackY         = (insets.top − 40) + (logoAreaHeight − ORB_SIZE) / 2
bottomSectionHeight= buttonWrapHeight + 24 + 18 + (insets.bottom + 16)
buttonWrapHeight   = max(80, 52 + errorWrapHeight)
errorWrapHeight    = 18·M + 6 + 20   (with the link)   |   18·M   (cancelled)
```

### 9.3 What does **not** change with width

The wordmark, the tagline, the button, the error block and the legal row all use fixed or
content-driven widths. The tagline is the only element whose **wrap point** moves, and only because
its box is the `Logo Stack`, whose width is the orb size (§9.1).

---

## 10. Verify against Figma — checklist

- [ ] Frame is **390 × 844**, fill `#0A0A0C` (dark) or `#F5F0E8` (light), corner radius 0.
- [ ] `Content` has padding **47 top / 32 left / 32 right**; `Bottom Section` has padding-bottom **50**.
- [ ] `Logo Stack` is exactly **280.8 × 280.8** at **x 54.6, y 199.1** (default state).
- [ ] The gold orb is **280.8 × 280.8**, centred in `Logo Stack`, at **8 % opacity** (its resting value).
- [ ] The lion is **96 × 96** in `#5C3A1E`, drawn from `src/assets/svg/ui_lion.svg`, with **no**
      container circle behind it.
- [ ] The wordmark is **Allura 48 / 56**, `#5C3A1E`, **14 pt** below the lion, and reads `Simba`.
- [ ] The tagline is **Cormorant Garamond Bold 48 / 56**, `#6B4226`, centred, **2 pt** below the
      wordmark, and reads `Your media, your way` — wrapped by the same font file the app ships.
- [ ] The button is **260 × 52**, radius **12**, 1 pt `border.subtle` stroke, **14/24** padding,
      drop shadow `#000` Y 4, 25 %, blur 12.
- [ ] The G is **22 × 22** with the four brand path colours, **12 pt** left of the label.
- [ ] The label is **Inter SemiBold 16 / 24**, letter spacing **0.3**, colour `text.primary`.
- [ ] `Legal Row` is centred, gap **8**, with a **3 × 3** dot in `text.tertiary` between two
      underlined caption links.
- [ ] The error block is **260 wide**, centred, 13 / 18 in `semantic.error`, gap **6** to the
      `Try Again` link, which is **hidden** in the `cancelled` state only.
- [ ] The prototype has the three-step entrance (0 / 200 / 400 ms) and the 6 s orb pulse loop.
- [ ] The reduce-motion variant has no entrance animation and the orb frozen at **1.06 / 12 %**.
- [ ] Both themes are built (the app's theme is a user setting, not a fixed choice).

---

## 11. Values a human must resolve

These could not be found in the source and are **not** guessed here:

| # | Item | Why it is missing |
|---|---|---|
| 1 | The **exact line count** of the tagline at 48 px | It depends on the Cormorant Garamond Bold metrics at render time; the source sets no `maxWidth` and no `numberOfLines` (`LoginScreen.tsx:154-158`). Resolve by installing `assets/fonts/CormorantGaramond-Bold.ttf` and reproducing the 280.8 pt box. |
| 2 | The **rendered width** of every text run (wordmark, button label, legal links) | Font-metric dependent, not defined in source. Use "hug" in Figma. |
| 3 | The **exact safe-area insets** per device | Read at runtime by `useSafeAreaInsets()` (`LoginScreen.tsx:38`); §1.2 lists device reference values only. |
| 4 | **Pressed / disabled / loading button styles** beyond what is written | The button defines no pressed or disabled style — pressed is only `activeOpacity: 0.85` and disabled only blocks the touch (`GoogleSignInButton.tsx:34`, `:41`, `:42`). A designer must decide whether to invent a disabled treatment or reproduce the source's "looks identical" behaviour. |
| 5 | The **weight actually rendered** for `Sign in with Google` and `Try Again` on Android | `fontFamily: 'Inter'` + `fontWeight: '600'` resolves to Inter-Bold on Android and Inter-SemiBold on iOS (§4.1). The source's own doc comments call this axis a bug source (`src/constants/fontFamily.ts:24-43`). |
| 6 | The **duplicate `OfflineBanner` mount** | Mounted at `src/app/AppContent.tsx:139` and `src/navigation/RootNavigator.tsx:292`. |
| 7 | The **`splashTagline` token is unused by this screen** | `src/theme/typographyStyles.ts:116-122` describes a 16 px Cormorant Italic "Splash / Login tagline"; the screen actually uses the 48 px `displaySerif` token (`LoginScreen.tsx:154-158`). Which one is intended needs a human decision. |
| 8 | Whether the **`#5C3A1E` / `#6B4226` browns** are intended in the **dark** theme | Both are hard-coded literals (`LoginScreen.tsx:143`, `:146`, `:156`) and are very low contrast on `#0A0A0C`. |

---

**End of the Login Figma build spec.** Screen, commit and every cited file are at
`MOBILE_APP_REACT_NATIVE` @ `f5/w22-close-minimise-d9` / `9ff8e2d`.
