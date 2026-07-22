# Simba Player — UI/UX Redesign Atlas

> **Goal:** Transform Simba Player from a rough prototype into a premium, minimalist media player that feels polished, intentional, and professional. No "kiddy" aesthetics. No inconsistent colors. No placeholder screens. No god-object components.

---

## Design Philosophy

- **Dark-first premium aesthetic.** All surfaces use deep charcoal/near-black backgrounds. Light mode uses warm off-whites (cream, ivory) — never pure white `#FFFFFF`.
- **Single accent color.** `#C9A84C` (muted antique gold) — used sparingly for active states, CTAs, and progress indicators. NOT lion-gold, NOT bright yellow. Subtle, restrained luxury.
- **Typography hierarchy.** San Francisco (iOS) / Roboto (Android) system fonts only. No external font dependencies.
- **Spatial rhythm.** 4pt grid system. Consistent padding: 16px (compact), 20px (standard), 24px (spacious).
- **Motion as signal.** Animations communicate state changes — not decoration. Spring-based, fast (250–350ms), physics-first.
- **Transparency with purpose.** Use `rgba(0,0,0,0.55)` for overlays and frosted glass for floating UI. No pure-black-on-black or pure-white-on-white unless deliberate.

---

## Color Palette

### Dark Mode (Default)
| Token | Hex | Usage |
|-------|-----|-------|
| `background.primary` | `#0A0A0C` | Screen backgrounds |
| `background.elevated` | `#141416` | Cards, panels |
| `background.floating` | `rgba(0,0,0,0.55)` | Floating tab bar, overlays |
| `background.overlay` | `rgba(10,10,12,0.85)` | Modal scrims |
| `border.subtle` | `rgba(255,255,255,0.06)` | Hairline dividers |
| `border.emphasis` | `rgba(255,255,255,0.10)` | Card outlines |
| `text.primary` | `#EDEDED` | Headlines, body |
| `text.secondary` | `rgba(237,237,237,0.55)` | Labels, captions |
| `text.tertiary` | `rgba(237,237,237,0.30)` | Placeholders, hints |
| `accent.gold` | `#C9A84C` | Active states, CTAs, progress |
| `accent.goldDim` | `rgba(201,168,76,0.15)` | Subtle gold tinting |
| `accent.goldGlow` | `rgba(201,168,76,0.25)` | Focus rings, active halos |
| `semantic.success` | `#4CAF50` | Completion indicators |
| `semantic.error` | `#EF5350` | Error states |
| `semantic.warning` | `#FFA726` | Warnings |

### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| `background.primary` | `#F5F0E8` | Warm ivory — NOT white |
| `background.elevated` | `#FFFFFF` | Cards, panels |
| `background.floating` | `rgba(245,240,232,0.90)` | Floating UI |
| `background.overlay` | `rgba(245,240,232,0.88)` | Modal scrims |
| `border.subtle` | `rgba(0,0,0,0.06)` | Hairline dividers |
| `border.emphasis` | `rgba(0,0,0,0.08)` | Card outlines |
| `text.primary` | `#1A1A1C` | Headlines, body |
| `text.secondary` | `rgba(26,26,28,0.55)` | Labels, captions |
| `text.tertiary` | `rgba(26,26,28,0.30)` | Placeholders |
| `accent.gold` | `#B8922E` | Darker gold for light mode contrast |
| `accent.goldDim` | `rgba(184,146,46,0.12)` | Subtle gold tinting |
| `accent.goldGlow` | `rgba(184,146,46,0.20)` | Focus rings |

### Typography Scale
| Variant | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| `h1` | 32px | 700 | 40px | Screen titles |
| `h2` | 24px | 700 | 32px | Section headers |
| `h3` | 20px | 600 | 28px | Card titles |
| `body1` | 17px | 400 | 24px | Primary body text |
| `body2` | 15px | 400 | 22px | Secondary body |
| `caption` | 13px | 400 | 18px | Labels, timestamps |
| `overline` | 11px | 500 | 16px | ALL CAPS section labels |
| `mono` | 14px | 400 | 20px | Codec info, technical data |

---

## Spatial System (4pt Grid)
```
xs: 4px   | compact internal spacing
sm: 8px   | icon-text gaps, tight lists
md: 12px  | card internal padding
lg: 16px  | standard margins/paddings
xl: 20px  | section padding
xxl: 24px | screen-level padding
xxxl: 32px| hero spacing
```

---

## Border Radius System
```
none: 0px      | sharp technical elements
sm: 6px        | buttons, small chips
md: 12px       | cards, panels
lg: 16px       | modals, bottom sheets
pill: 9999px   | floating tab bar, pills
```

---

## Shadow System
```
shadow.sm:  0 1px 3px rgba(0,0,0,0.3)       — cards
shadow.md:  0 4px 12px rgba(0,0,0,0.4)       — floating UI
shadow.lg:  0 8px 32px rgba(0,0,0,0.5)       — modals
shadow.gold: 0 0 20px rgba(201,168,76,0.15)  — accent glow
```

---

## Motion Specs
```
duration.fast:    150ms  — micro-interactions (checkbox, toggle)
duration.normal:   250ms  — panel open/close, page transitions
duration.slow:    350ms  — large layout changes, modal entry
duration.glacial: 500ms  — splash → home transition

easing.standard:  cubic-bezier(0.4, 0, 0.2, 1)  — standard material
easing.decelerate: cubic-bezier(0, 0, 0.2, 1)  — entering
easing.accelerate: cubic-bezier(0.4, 0, 1, 1)  — leaving
easing.spring:    spring(damping: 18, stiffness: 200, mass: 0.8)

Enter: decelerate | Exit: accelerate
```

---

## Screen Status Bar Strategy
- **Home, Library, Settings, Search:** `barStyle="light-content"` (dark) / `barStyle="dark-content"` (light). StatusBar translucent with `backgroundColor: transparent`.
- **Player (landscape):** StatusBar hidden.
- **Player (portrait):** StatusBar hidden, controls overlay.
- **Preferences, About, modals:** Translucent with matching `backgroundColor`.

---

# PHASE 1 — Foundation: Design Tokens & Theme System

### 1.1 Create Theme Token Module
**File:** `src/theme/tokens.ts`

Create a centralized token file with the full color palette, typography scale, spacing, border radius, and shadow system defined above. Export typed tokens for both dark and light modes.

**Deliverables:**
- `ColorTokens`, `TypographyTokens`, `SpacingTokens` TypeScript interfaces
- `darkTokens` and `lightTokens` objects
- `mergeTokens()` utility for component-level token customization

**Checklist:**
- [ ] All color tokens match the palette above
- [ ] Typography variants match the scale
- [ ] Spacing uses 4pt grid
- [ ] Shadow tokens defined for sm/md/lg/gold

### 1.2 Refactor ThemeContext
**File:** `src/context/ThemeContext.tsx`

Collapse the triple-hook indirection. Single `useTheme()` returning `{ theme, tokens, colors, spacing, typography, isDark, setTheme }`. Add `setTheme('dark' | 'light' | 'system')` to allow manual override stored in Redux. Persist preference via MMKV.

**Deliverables:**
- Single `ThemeContext` with `useTheme()` hook
- `ThemeProvider` wrapping the app
- Manual theme override stored in `settingsSlice.themeMode`
- `useColors()` aliased to `useTheme()` (for backward compat)

**Checklist:**
- [ ] Remove `useTheme()` → `useTheme()` → `lightTheme/darkTheme` chain
- [ ] Add `setTheme` to context
- [ ] Persist theme preference in Redux + MMKV
- [ ] Backward compatible `useColors` export

### 1.3 Simplify makeStyles
**File:** `src/utils/makeStyles.ts`

Remove per-render `StyleSheet.create()` call. Cache created stylesheets in a module-level `Map`. Accept tokens from context.

**Deliverables:**
- `makeStyles<T>(creator: (tokens) => T)` utility
- Module-level cache to avoid recreating StyleSheet objects
- Updated to accept `tokens` from `useTheme()`

**Checklist:**
- [ ] Styles cached, not recreated every render
- [ ] Accepts full theme tokens object
- [ ] Backward compatible with existing call sites

---

# PHASE 2 — Component Library Overhaul

### 2.1 Redesign AppText
**File:** `src/components/core/AppText/AppText.tsx`

Extend to support all typography variants from the scale. Add `numberOfLines`, `selectable`, `textAlign`, `onPress` props. Remove hardcoded color logic — let parent tokens control color.

**Deliverables:**
- All typography variants (`h1`, `h2`, `h3`, `body1`, `body2`, `caption`, `overline`, `mono`)
- `numberOfLines`, `selectable`, `textAlign` prop passthrough
- Default color driven by `text.primary` from tokens
- Optional `variant` prop to override

**Checklist:**
- [ ] 8 typography variants defined
- [ ] `numberOfLines` passthrough works
- [ ] `selectable` prop works
- [ ] Default color from tokens, not hardcoded

### 2.2 Create AppButton Component
**File:** `src/components/core/AppButton/AppButton.tsx`

Design variants:
- `variant: 'primary'` — Gold background, dark text, full width
- `variant: 'secondary'` — Transparent with gold border
- `variant: 'ghost'` — No border, text only
- `variant: 'icon'` — Square icon-only button (24x24 touch target 44x44)
- `size: 'sm' | 'md' | 'lg'`
- `loading` state with spinner
- `disabled` state with reduced opacity

**Deliverables:**
- 4 variants × 3 sizes = 12 style combinations
- Loading spinner (ActivityIndicator or custom)
- Press animation (scale down 0.97 on press)
- Accessible: `accessibilityRole="button"`, `accessibilityState`

**Checklist:**
- [ ] 4 variants implemented
- [ ] 3 sizes implemented
- [ ] Loading state with spinner
- [ ] Press animation
- [ ] Accessibility props

### 2.3 Create AppCard Component
**File:** `src/components/core/AppCard/AppCard.tsx`

Unified card component for list items, media tiles, info panels.
- Background: `background.elevated`
- Border: `border.subtle`, 0.5px
- Border radius: `md` (12px)
- Padding: `md` (12px)
- Optional `variant: 'interactive'` with press scale animation
- Optional `accent` prop to add left gold border stripe

**Deliverables:**
- Card with consistent styling
- Interactive variant with press feedback
- Accent stripe variant for featured/active items

**Checklist:**
- [ ] Base card with elevation and border
- [ ] Interactive variant with scale press
- [ ] Accent stripe variant
- [ ] Safe area aware padding

### 2.4 Create EmptyState Component
**File:** `src/components/core/EmptyState/EmptyState.tsx`

Reusable empty state for all screens (library empty, search no results, playlist empty, etc.).
- Props: `icon`, `title`, `subtitle`, `actionLabel`, `onAction`
- Icon area: 64x64 placeholder with muted icon
- Title: `h3` variant
- Subtitle: `body2` secondary color
- Action: optional AppButton
- Vertical layout centered in parent

**Deliverables:**
- Generic empty state component
- Pre-built variants: `emptyLibrary`, `emptySearch`, `emptyPlaylist`, `emptyRecent`
- Icon slot for custom SVG/image

**Checklist:**
- [ ] Icon + title + subtitle layout
- [ ] Optional action button
- [ ] 4 pre-built variant presets
- [ ] Centered vertically in parent

### 2.5 Create MediaTile Component
**File:** `src/components/core/MediaTile/MediaTile.tsx`

For displaying media items in grids/lists (continue watching, recent, library grid).
- Thumbnail area: 16:9 aspect ratio
- Progress bar overlay at bottom of thumbnail
- Title (1 line, truncate)
- Subtitle (duration / file size, 1 line)
- Options menu (3-dot) on top-right corner
- Press → navigate to Player
- Long press → context menu (add to playlist, share, info)

**Deliverables:**
- `MediaTile` component
- Thumbnail with aspect ratio
- Progress bar overlay
- Truncating title + subtitle
- 3-dot options menu
- Long press context menu
- Skeleton loading state

**Checklist:**
- [ ] Thumbnail with 16:9 aspect ratio
- [ ] Progress bar overlay
- [ ] Title/subtitle with truncation
- [ ] Options menu (3-dot)
- [ ] Long press context menu
- [ ] Skeleton loading state

### 2.6 Create SettingsRow Component
**File:** `src/components/core/SettingsRow/SettingsRow.tsx`

Building block for Settings and Settings sub-pages.
- Left: icon slot + title + optional subtitle
- Right: value/control slot (chevron, toggle, value text, stepper)
- Optional `description` below title
- Optional `badge` for notification counts
- `onPress` for navigable rows
- Dividers between rows

**Deliverables:**
- `SettingsRow` with left/right slots
- Variants: `navigable`, `toggle`, `stepper`, `value`, `action`
- Consistent divider styling
- Optional description text

**Checklist:**
- [ ] Left slot: icon + title + subtitle
- [ ] Right slot: chevron/toggle/stepper/value
- [ ] Optional description
- [ ] Divider between rows

### 2.7 Create SectionHeader Component
**File:** `src/components/core/SectionHeader/SectionHeader.tsx`

Screen section headers with optional "See All" action.
- Title: `overline` variant, uppercase
- Optional right action: "See All" → `body2` + chevron
- Padding: `xxl` horizontal, `md` top/bottom

**Deliverables:**
- `SectionHeader` component
- "See All" action variant
- Consistent with typography scale

**Checklist:**
- [ ] Title in overline variant
- [ ] Optional "See All" action
- [ ] Consistent padding

---

# PHASE 3 — Floating Tab Bar Polish

### 3.1 Polish FloatingTabBar
**File:** `src/components/tabbar/FloatingTabBar.tsx`

- Use `rgba(0,0,0,0.55)` background (already done)
- Fix Library tab icon: both focused/unfocused should show `uiVideosGray` — no music icon
- Add `useMemo` for `animValues` array to prevent recreation on every render
- Reduce active ring opacity: `GOLD + '0D'` (5%) → `GOLD + '1A'` (10%) for better visibility
- Ensure `borderColor: rgba(201,168,76,0.15)` uses correct gold token
- Add subtle `backdropFilter: 'blur(12px)'` via `BlurView` from `react-native` if available, or rely on semi-transparent background alone

**Deliverables:**
- Correct Library tab icons
- `useMemo` for animated values
- Better active ring visibility
- Consistent gold token usage

**Checklist:**
- [ ] Library tab icons correct
- [ ] No Animated.Value recreation on render
- [ ] Active ring visible
- [ ] Gold colors from theme tokens

### 3.2 Add Tab Bar Safe Area + Notch Handling
Ensure `FloatingTabBar` properly handles:
- iOS notch (top padding via safe area)
- Home indicator (bottom padding via `useSafeAreaInsets`)
- Landscape orientation (different insets)

**Deliverables:**
- Notch-aware layout
- Home indicator padding on iOS
- Landscape portrait mode handling

**Checklist:**
- [ ] Top notch handled
- [ ] Bottom home indicator handled
- [ ] Landscape insets correct

---

# PHASE 4 — Navigation Redesign

### 4.1 Refactor Navigation Types
**File:** `src/navigation/types.ts`

Consolidate the `StackInTabProps` generic usage. Ensure every screen in every stack has typed props. Add `PlayerScreenProps` with all params.

**Deliverables:**
- All screens typed with composite props
- `RootStackParamList` includes: `MainTabs`, `Player`, `Preferences`
- All tab stacks properly typed

**Checklist:**
- [ ] All screen types unified
- [ ] Player screen params fully typed
- [ ] Preferences params typed

### 4.2 Navigation Header Strategy
Define consistent screen header behavior:
- Tab root screens: No header visible. Custom top bar inside each screen.
- Sub-pages: Slide from right. Custom back button (←) with screen title.
- Player: No header. Full-screen video.
- Preferences: Modal-style slide from bottom.

Update all stack navigators with consistent `screenOptions`.

**Deliverables:**
- Tab root screens: no header
- Sub-pages: custom header with back button
- Consistent `animation: 'slide_from_right'` for sub-pages

**Checklist:**
- [ ] Tab roots have no header
- [ ] Sub-pages have consistent headers
- [ ] Animation consistent across stacks

### 4.3 Screen Transitions with AnimatedSwitch
For key transitions (Home → Player), implement custom animated transitions:
- Player enters: scale from 0.92 → 1.0, opacity 0 → 1, 350ms decelerate
- Home leaves: scale 1.0 → 0.92, opacity 1 → 0, 250ms accelerate

**Deliverables:**
- Custom transition between Home and Player
- Consistent timing and easing

**Checklist:**
- [ ] Player entrance animated
- [ ] Home exit animated
- [ ] Consistent timing

---

# PHASE 5 — HomeScreen Complete Redesign

### 5.1 Refactor HomeScreen Architecture
**File:** `src/screens/Home/HomeScreen.tsx`

**Layout Structure:**
```
SafeAreaView (no background — gradient behind)
  └── Animated.ScrollView
        ├── StatusBar (dynamic color)
        ├── Header (not sticky)
        │     ├── Logo mark (left)
        │     └── Search icon button (right)
        ├── GreetingSection
        │     ├── Dynamic greeting ("Good morning/afternoon/evening")
        │     └── Subtitle
        ├── OpenMediaCTA (full-width gold button)
        ├── ContinueWatchingSection [if has continue]
        │     ├── SectionHeader
        │     └── Horizontal ScrollView of MediaTiles (2 visible)
        ├── RecentSection [if has recent]
        │     ├── SectionHeader
        │     └── Grid of MediaTiles (2 columns)
        └── BottomSpacer (xxxl) — pushes content above tab bar
```

**Status Bar:** Dynamic color based on theme (`light-content` / `dark-content`).

**Dynamic Greeting:** `new Date().getHours()` → morning (<12), afternoon (12-18), evening (>18).

**OpenMediaCTA:** Full-width pill button, gold gradient (`#C9A84C` → `#B8922E`), dark text. Icon: folder. Text: "Open Media". Press → file picker → immediate Player navigation.

**Deliverables:**
- Clean scrollable layout
- Dynamic greeting based on time
- Full-width CTA button
- Conditional sections
- Bottom spacer above floating tab bar

**Checklist:**
- [ ] Dynamic greeting
- [ ] Status bar color matches theme
- [ ] OpenMediaCTA full-width
- [ ] Conditional sections (continue/recent)
- [ ] Bottom spacer

### 5.2 Add Empty State to HomeScreen
When `recentFiles.length === 0`:
- Show illustrated empty state
- Icon: large folder icon (64px, tertiary color)
- Title: "Ready to play"
- Subtitle: "Open a media file to get started"
- Action: OpenMediaCTA

**Deliverables:**
- Empty state when no recent files
- Same CTA as normal state

**Checklist:**
- [ ] Empty state with illustration
- [ ] Action button present
- [ ] Theme aware

### 5.3 Add Pull-to-Refresh
Add `RefreshControl` to ScrollView.
- Refresh recent files list
- Show subtle loading indicator
- Refresh icon spins during refresh

**Deliverables:**
- Pull-to-refresh on HomeScreen
- Loading state

**Checklist:**
- [ ] Pull-to-refresh works
- [ ] Loading indicator visible
- [ ] List refreshes

### 5.4 Status Bar Dynamic Color
Status bar color must match the theme:
- Dark mode: `barStyle="light-content"`, background transparent
- Light mode: `barStyle="dark-content"`, background transparent

**Deliverables:**
- StatusBar adapts to theme
- Translucent mode enabled

**Checklist:**
- [ ] Dark mode: light content
- [ ] Light mode: dark content

---

# PHASE 6 — LibraryScreen Redesign

### 6.1 LibraryScreen Full Implementation
**File:** `src/screens/Library/LibraryScreen.tsx`

**Layout:**
```
SafeAreaView
  ├── Header
  │     ├── Title: "Library"
  │     └── Search icon (navigates to SearchScreen)
  ├── SegmentedControl: [Videos] [Audio] [Folders]
  │     └── Full-width, pill-style, gold active indicator
  ├── Content Area (switches based on segment)
  │     ├── Videos: Grid of MediaTiles (2 columns)
  │     ├── Audio: Grid of MediaTiles (2 columns)
  │     └── Folders: List of folder items
  ├── FAB: "+" button (bottom-right, above tab bar) → Add folder
  └── Empty State (when segment empty)
```

**Deliverables:**
- Segmented control for Videos/Audio/Folders
- Grid layout for media
- Folder list for Folders segment
- FAB for adding folders
- Empty states per segment

**Checklist:**
- [ ] Segmented control works
- [ ] 2-column grid layout
- [ ] Folder list layout
- [ ] FAB positioned above tab bar
- [ ] Empty states per segment

### 6.2 Add Folder Linking (Settings Provision)
**File:** `src/screens/Settings/SettingsScreen.tsx`
**File:** `src/store/slices/settingsSlice.ts`

Add settings rows:
- "Video Folders" → navigates to folder picker → stores `string[]` in Redux
- "Audio Folders" → navigates to folder picker → stores `string[]` in Redux
- "Scan Folders" → triggers rescan of linked folders

**Deliverables:**
- Settings rows for video/audio folder linking
- Persist linked folders in Redux
- Scan trigger action

**Checklist:**
- [ ] Video folder picker in settings
- [ ] Audio folder picker in settings
- [ ] Folders persisted in Redux
- [ ] Scan trigger action

### 6.3 Add Library Home Prompt
When library is empty (no folders linked):
- Show onboarding prompt on LibraryScreen
- Illustration + "Link your first folder"
- Button → navigates to Settings → Folders

**Deliverables:**
- Empty library onboarding
- Direct link to Settings

**Checklist:**
- [ ] Empty prompt with CTA
- [ ] Links to Settings

---

# PHASE 7 — SearchScreen Implementation

### 7.1 SearchScreen Full Implementation
**File:** `src/screens/Search/SearchScreen.tsx`

**Layout:**
```
SafeAreaView
  ├── SearchBar (sticky)
  │     ├── Search icon (left)
  │     ├── TextInput (auto-focus)
  │     └── Clear button (right, when text present)
  ├── RecentSearches (when input empty)
  │     ├── SectionHeader: "Recent"
  │     └── List of recent search terms (tappable chips)
  ├── SearchResults (when text present)
  │     ├── Result count: "12 results"
  │     └── Grid of MediaTiles (2 columns)
  └── Empty State (no results)
```

**Search Behavior:**
- Debounce input: 300ms delay before search
- Search in: file name, folder path
- Filter by: type (video/audio), date range, size
- Sort by: relevance, date, name, size

**Deliverables:**
- Search bar with clear button
- Recent searches list
- Debounced search
- Results grid
- No-results empty state

**Checklist:**
- [ ] Search bar functional
- [ ] Recent searches shown
- [ ] Debounced search (300ms)
- [ ] Results displayed
- [ ] Empty state for no results

### 7.2 Search History Management
**File:** `src/store/slices/sessionSlice.ts`

Add `recentSearches: string[]` to session state. Limit to 20 items. Persist via MMKV.

**Deliverables:**
- Recent searches in Redux
- Max 20 items
- Persist across sessions

**Checklist:**
- [ ] Recent searches stored
- [ ] Max 20 enforced
- [ ] Persist across sessions

---

# PHASE 8 — SettingsScreen Redesign

### 8.1 SettingsScreen Full Implementation
**File:** `src/screens/Settings/SettingsScreen.tsx`

**Sections:**
```
SafeAreaView
  ├── Header: "Settings"
  │
  ├── Section: "Appearance"
  │     ├── Theme: [Dark ▾] (dropdown: Dark / Light / System)
  │     └── Accent Color (future)
  │
  ├── Section: "Playback"
  │     ├── Remember Position: [Toggle]
  │     ├── Default Speed: [1.0x ▾]
  │     └── Auto-play Next: [Toggle]
  │
  ├── Section: "Library"
  │     ├── Video Folders: [3 folders ›]
  │     ├── Audio Folders: [1 folder ›]
  │     ├── Scan Folders: [Button]
  │     └── Clear Library: [Button]
  │
  ├── Section: "Audio"
  │     └── Audio Settings: [›] → AudioSettingsScreen
  │
  └── Section: "About"
        ├── About: [›] → AboutScreen
        ├── Privacy Policy: [›]
        └── Licenses: [›]
```

**Deliverables:**
- Grouped settings with section headers
- SettingsRow components
- Theme selector (Dark/Light/System)
- Playback toggles and selectors
- Library folder management
- Navigation to sub-settings pages

**Checklist:**
- [ ] Section headers
- [ ] Theme selector works
- [ ] Playback settings persist
- [ ] Folder management links
- [ ] About section

### 8.2 Theme Selector Implementation
**File:** `src/context/ThemeContext.tsx`
**File:** `src/store/slices/settingsSlice.ts`

Add `themeMode: 'dark' | 'light' | 'system'` to settings. Sync with ThemeContext. Persist via MMKV.

**Deliverables:**
- Theme mode in Redux
- Context syncs with Redux
- MMKV persistence

**Checklist:**
- [ ] Theme persists across sessions
- [ ] System theme detection works
- [ ] Manual override works

---

# PHASE 9 — PlayerScreen Decomposition & Polish

### 9.1 Decompose PlayerScreen
**File:** `src/screens/Player/PlayerScreen.tsx`

Split the 1932-line god object into focused sub-components:

| Component | Responsibility |
|-----------|---------------|
| `PlayerScreen.tsx` | Orchestration, lifecycle, state wiring |
| `PlayerVideoSurface.tsx` | Native mpv view wrapper |
| `PlayerControls.tsx` | Play/pause, seek bar, time, volume |
| `PlayerTopBar.tsx` | Title, back button, options |
| `PlayerGestureLayer.tsx` | Swipe, double-tap, pinch gestures |
| `PlayerSubtitlePanel.tsx` | Subtitle track selection |
| `PlayerAudioPanel.tsx` | Audio track selection |
| `PlayerEqualizerPanel.tsx` | EQ bands and presets |
| `PlayerPlaylistPanel.tsx` | Playlist management |
| `PlayerLoadingOverlay.tsx` | Loading spinner during file load |

**Deliverables:**
- 10 focused components instead of 1 god object
- Each component < 300 lines
- Clear prop drilling through context

**Checklist:**
- [ ] PlayerScreen < 300 lines
- [ ] Each sub-component isolated
- [ ] State wired correctly
- [ ] No duplicate imports

### 9.2 Portrait vs Landscape Layout
**File:** `src/screens/Player/PlayerScreen.tsx`
**File:** `src/screens/Player/PlayerControls.tsx`
**File:** `src/screens/Player/PlayerTopBar.tsx`

**Portrait Mode:**
```
┌─────────────────────┐
│  TopBar (back, title)│
├─────────────────────┤
│                     │
│   16:9 Video Area    │
│   (centered)        │
│                     │
├─────────────────────┤
│  Progress Bar       │
│  Prev | ▶/⏸ | Next  │
│  Time | SeekBar | Dur│
│  ⚙️  ⬆️  ⏭️  ⛶       │
└─────────────────────┘
```

**Landscape Mode:**
```
┌───────────────────────────────────────┐
│                                       │
│   Full-screen video (no controls)     │
│                                       │
│  ← (tap to show)                      │
│                                       │
│            ▶/⏸  (center)              │
│                                       │
│   Progress bar (bottom, semi-trans)   │
└───────────────────────────────────────┘
```

**Implementation:** Use `Dimensions.get('window')` and `useWindowDimensions()`. Detect `width > height` → landscape mode. Animate layout changes with 350ms spring.

**Deliverables:**
- Portrait mode with separate controls area
- Landscape mode full-screen video
- Tap to show/hide controls in landscape
- Smooth animated transition between orientations

**Checklist:**
- [ ] Portrait layout correct
- [ ] Landscape layout correct
- [ ] Tap toggles controls in landscape
- [ ] Animated orientation transition

### 9.3 Player Loading State
**File:** `src/screens/Player/PlayerLoadingOverlay.tsx`

When navigating to Player, show loading state immediately:
- Full-screen semi-transparent overlay
- Centered activity indicator (large, gold color)
- File name displayed below
- "Loading..." text

Dismiss overlay when `onFileLoaded` fires from mpv.

**Deliverables:**
- Loading overlay component
- Shows immediately on navigation
- Dismisses on file loaded

**Checklist:**
- [ ] Loading overlay visible
- [ ] File name shown
- [ ] Dismisses on load complete

### 9.4 Player Controls Animation
**File:** `src/components/PlayerControls.tsx`

**Behaviors:**
- Auto-hide controls: 3 seconds after last interaction, fade out (250ms)
- Tap video area: toggle controls visibility
- Controls fade in/out with `Animated.timing`, opacity 0 ↔ 1, 250ms
- In landscape: controls have `backgroundColor: rgba(0,0,0,0.4)` gradient at bottom

**Deliverables:**
- Auto-hide after 3s
- Tap to toggle
- Fade animation
- Semi-transparent gradient in landscape

**Checklist:**
- [ ] Auto-hide works
- [ ] Tap toggles controls
- [ ] Fade animation smooth
- [ ] Landscape gradient overlay

### 9.5 Seek Bar Polish
**File:** `src/components/PlayerControls.tsx`

- Use `@react-native-community/slider` with custom styling
- Gold fill for buffered + played portions
- Thumbnail: 14px circle, gold with shadow
- Chapter markers: small gold dots on the track
- Time labels: `mono` variant, flanking left/right
- Seek by dragging (already functional, polish visuals)

**Deliverables:**
- Custom styled seek bar
- Gold progress fill
- Visible chapter markers
- Time labels

**Checklist:**
- [ ] Gold seek bar styling
- [ ] Chapter markers visible
- [ ] Time labels flanking
- [ ] Smooth dragging

### 9.6 Player Gestures
**File:** `src/screens/Player/PlayerGestureLayer.tsx`

Implement via `react-native-gesture-handler` + `react-native-reanimated`:
- **Swipe left/right on video:** Seek ±10 seconds
- **Double-tap left:** Seek -10s with "−10s" overlay animation
- **Double-tap right:** Seek +10s with "+10s" overlay animation
- **Pinch:** Toggle between fit/fill/zoom (if zoom metadata available)
- **Long press:** Slow motion (0.5x speed) while held

**Animation for seek feedback:**
```
Text: "−10s" or "+10s"
Animation: fade in + scale 0.5→1.0 (150ms spring)
Hold: 400ms
Fade out: 200ms
Position: 1/4 from edge (left for −, right for +)
```

**Deliverables:**
- Swipe seek gesture
- Double-tap skip with overlay animation
- Pinch zoom toggle
- Long press slow motion

**Checklist:**
- [ ] Swipe seek works
- [ ] Double-tap animation visible
- [ ] Pinch toggles zoom
- [ ] Long press slow motion

### 9.7 Player Top Bar Polish
**File:** `src/screens/Player/PlayerTopBar.tsx`

Remove all desktop conventions:
- Remove: ─ □ ✕ window controls (delete entirely)
- Keep: Back button (←), title (truncated), options menu (⋯)

Options menu items:
- Playback speed
- Subtitle settings
- Audio track
- Equalizer
- Picture-in-Picture (if supported)
- Lock screen orientation
- Info

**Deliverables:**
- Minimal top bar
- No desktop window controls
- Options menu with relevant items

**Checklist:**
- [ ] No window controls
- [ ] Back + title + options only
- [ ] Options menu functional

### 9.8 Remove Hardcoded Metadata
**File:** `src/screens/Player/PlayerScreen.tsx`

Replace hardcoded "1080p · H.264 · 5.1 AAC" with actual metadata from mpv:
- Get from `MpvPlayer.getVideoCodec()`, `getAudioCodec()`, `getBitrate()`
- Display: "1920×1080 · H.264 · AAC" only if metadata available
- Hide entirely if no metadata

**Deliverables:**
- Real codec info from mpv
- Hidden when unavailable

**Checklist:**
- [ ] Codec info from native
- [ ] Hidden when unavailable

### 9.9 Player Orientation Handling
**File:** `src/navigation/RootNavigator.tsx`

Player should:
- Allow both portrait and landscape
- Detect current orientation
- Default to landscape if video is landscape, portrait if video is portrait
- Use `orientation: 'all'` on Player screen

**Deliverables:**
- Both orientations allowed
- Orientation adapts to content

**Checklist:**
- [ ] Portrait allowed
- [ ] Landscape allowed
- [ ] Adapts to video orientation

---

# PHASE 10 — Sub-Pages Full Implementation

### 10.1 FolderBrowserScreen Implementation
**File:** `src/screens/FolderBrowser/FolderBrowserScreen.tsx`

**Layout:**
```
SafeAreaView
  ├── Header
  │     ├── Back button (←)
  │     ├── Title: current folder name
  │     └── Sort/Filter button
  ├── Breadcrumb path: "Home > Videos > Movies"
  ├── Content: FlatList of items
  │     ├── [Folder icon] FolderName (tappable → drill down)
  │     ├── [Video icon] FileName.mp4 (tappable → Player)
  │     └── [Audio icon] FileName.mp3 (tappable → Player)
  ├── Empty State (empty folder)
  └── FAB: Select all / Sort
```

**Features:**
- Drill down into folders
- Navigate up via breadcrumb or back
- Sort by: name, date, size
- Tap file → navigate to Player with fileUri
- Long press → multi-select mode

**Deliverables:**
- Folder navigation
- Breadcrumb path display
- Sort options
- File tap → Player
- Multi-select mode

**Checklist:**
- [ ] Folder drilling works
- [ ] Breadcrumb shown
- [ ] Sort works
- [ ] File opens Player
- [ ] Long press selects

### 10.2 PlaylistDetailScreen Implementation
**File:** `src/screens/PlaylistDetail/PlaylistDetailScreen.tsx`

**Layout:**
```
SafeAreaView
  ├── Header
  │     ├── Back button
  │     ├── Title: playlist name
  │     └── Edit / Shuffle buttons
  ├── Playlist info (if viewing saved playlist)
  │     ├── Item count
  │     └── Total duration
  ├── Content: FlatList of playlist items
  │     └── MediaTile (with remove button on swipe)
  ├── Empty State
  └── Bottom Action Bar
        └── Play All / Add to Queue
```

**Features:**
- View playlist items
- Reorder via drag-and-drop
- Remove items (swipe left)
- Play single item → Player
- Play All → starts Player with playlist
- Shuffle playlist

**Deliverables:**
- Playlist item list
- Drag-to-reorder
- Swipe-to-remove
- Play All button
- Shuffle mode

**Checklist:**
- [ ] Items listed
- [ ] Drag reorder works
- [ ] Swipe remove works
- [ ] Play All works
- [ ] Shuffle works

### 10.3 AboutScreen Polish
**File:** `src/screens/About/AboutScreen.tsx`

**Layout:**
```
SafeAreaView
  ├── Header
  │     ├── Back button
  │     └── Title: "About"
  ├── Content (centered)
  │     ├── App logo (centered, 80x80)
  │     ├── App name: "Simba Player"
  │     ├── Version: from app.json / PackageInfo
  │     ├── Copyright line
  │     ├── Divider
  │     └── Links list
  │           ├── Privacy Policy
  │           ├── Terms of Service
  │           ├── Open Source Licenses
  │           └── Rate on Play Store
  └── Footer: Reset all settings (destructive)
```

**Deliverables:**
- App info display
- Version from package
- Legal links
- Rate app link
- Reset settings

**Checklist:**
- [ ] Logo displayed
- [ ] Version dynamic
- [ ] Links navigable
- [ ] Reset settings

### 10.4 AudioSettingsScreen Implementation
**File:** `src/screens/AudioSettings/AudioSettingsScreen.tsx`

**Layout (using SettingsRow):**
```
SafeAreaView
  ├── Header: Back + "Audio Settings"
  ├── Section: "Output"
  │     ├── Audio Device: [Auto ▾] (Auto / Bluetooth / HDMI)
  │     └── Sample Rate: [48kHz ▾]
  ├── Section: "Enhancements"
  │     ├── Normalize Volume: [Toggle]
  │     ├── Dialogue Boost: [Toggle]
  │     └── ReplayGain: [Off ▾] (Off / Track / Album)
  ├── Section: "Equalizer"
  │     ├── Enable EQ: [Toggle]
  │     └── Preset: [Flat ▾] → navigates to EQ screen
  └── Section: "Advanced"
        ├── Gapless Playback: [Toggle]
        └── Audio Delay: [0ms ▾] (-500ms to +500ms)
```

**Deliverables:**
- All settings using SettingsRow
- Audio device selector
- EQ enable + preset
- Volume normalization
- Gapless playback

**Checklist:**
- [ ] All settings rows
- [ ] Device selector works
- [ ] EQ toggle works
- [ ] Settings persist

### 10.5 NowPlayingScreen Implementation
**File:** `src/screens/NowPlaying/NowPlayingScreen.tsx`

Full-screen now playing details (accessible from mini-player or Home).
**Layout:**
```
SafeAreaView
  ├── Header: Back + "Now Playing"
  ├── Artwork: large (full width minus margins), rounded corners
  ├── Title + Artist (truncated, centered)
  ├── Progress bar (seekable)
  ├── Time: current / total
  ├── Controls: Shuffle | ⏮ | ▶/⏸ | ⏭ | Repeat
  ├── Volume slider (optional)
  └── Bottom actions: Playlist | EQ | ⭐ | ⋯
```

**Deliverables:**
- Large artwork display
- Full controls
- Seekable progress
- Navigation actions

**Checklist:**
- [ ] Artwork shown
- [ ] Controls functional
- [ ] Progress seekable
- [ ] Bottom actions work

---

# PHASE 11 — PreferencesScreen Polish

### 11.1 Remove Emoji from Preferences
**File:** `src/screens/Preferences/PreferencesScreen.tsx`

Replace all emoji (✅, ✦, ⚡, etc.) with SVG/PNG icons or AppText with the accent color. Keep feature names text-only.

**Deliverables:**
- No emoji in UI
- Icon-based status indicators
- Clean feature list

**Checklist:**
- [ ] All emoji removed
- [ ] Icons for status
- [ ] Clean layout

### 11.2 Preferences Content Review
Review and remove:
- Keyboard shortcuts section (desktop, irrelevant)
- Duplicate About section (AboutScreen handles this)
- Hardware info section (technical, not useful for users)

Add:
- Link to Settings (where the real settings live)
- Theme selector shortcut

**Deliverables:**
- Clean preferences page
- Links to real settings
- No desktop-specific content

**Checklist:**
- [ ] Desktop content removed
- [ ] Settings link present
- [ ] Useful shortcuts

---

# PHASE 12 — Folder Structure Refactor

### 12.1 New Folder Structure

Consolidate and flatten the component hierarchy. Target structure:

```
src/
├── app/
│   └── App.tsx                    # App entry, providers, navigation
├── navigation/
│   ├── index.ts                   # Barrel exports
│   ├── navigationHelper.ts        # navigate(), goBack(), navigationRef
│   ├── types.ts                    # All navigation types
│   ├── RootNavigator.tsx           # Root stack (tabs + player + modals)
│   ├── TabNavigator.tsx            # Bottom tab navigator
│   ├── HomeStack.tsx               # Home tab stack
│   ├── LibraryStack.tsx            # Library tab stack
│   └── SettingsStack.tsx           # Settings tab stack
├── screens/
│   ├── Home/
│   │   └── HomeScreen.tsx
│   ├── Library/
│   │   └── LibraryScreen.tsx
│   ├── Settings/
│   │   └── SettingsScreen.tsx
│   ├── Player/
│   │   ├── PlayerScreen.tsx        # Thin orchestrator (< 200 lines)
│   │   ├── PlayerVideoSurface.tsx
│   │   ├── PlayerControls.tsx
│   │   ├── PlayerTopBar.tsx
│   │   ├── PlayerGestureLayer.tsx
│   │   ├── PlayerSubtitlePanel.tsx
│   │   ├── PlayerAudioPanel.tsx
│   │   ├── PlayerEqualizerPanel.tsx
│   │   ├── PlayerPlaylistPanel.tsx
│   │   └── PlayerLoadingOverlay.tsx
│   ├── Search/
│   │   └── SearchScreen.tsx
│   ├── NowPlaying/
│   │   └── NowPlayingScreen.tsx
│   ├── FolderBrowser/
│   │   └── FolderBrowserScreen.tsx
│   ├── PlaylistDetail/
│   │   └── PlaylistDetailScreen.tsx
│   ├── AudioSettings/
│   │   └── AudioSettingsScreen.tsx
│   ├── About/
│   │   └── AboutScreen.tsx
│   └── Preferences/
│       └── PreferencesScreen.tsx
├── components/
│   ├── core/
│   │   ├── AppText/
│   │   │   └── AppText.tsx
│   │   ├── AppButton/
│   │   │   └── AppButton.tsx
│   │   ├── AppCard/
│   │   │   └── AppCard.tsx
│   │   ├── AppView/
│   │   │   └── AppView.tsx
│   │   ├── EmptyState/
│   │   │   └── EmptyState.tsx
│   │   ├── MediaTile/
│   │   │   └── MediaTile.tsx
│   │   ├── SectionHeader/
│   │   │   └── SectionHeader.tsx
│   │   └── SettingsRow/
│   │       └── SettingsRow.tsx
│   ├── tabbar/
│   │   └── FloatingTabBar.tsx
│   └── preferences/
│       └── index.tsx
├── theme/
│   ├── index.ts                    # ThemeProvider, useTheme, useColors
│   ├── tokens.ts                   # Color, typography, spacing tokens
│   └── animations.ts               # Shared animation configs
├── store/
│   ├── index.ts                    # Store configuration
│   ├── hooks.ts                    # useAppDispatch, useAppSelector
│   └── slices/
│       ├── playerSlice.ts
│       ├── sessionSlice.ts
│       └── settingsSlice.ts
├── services/
│   ├── fileService.ts
│   ├── storageService.ts           # MMKV wrapper
│   └── libraryScanService.ts       # Folder scanning logic
├── hooks/
│   ├── useOrientation.ts           # Landscape/portrait detection
│   ├── useKeyboard.ts              # Keyboard show/hide
│   └── useAutoHideControls.ts      # Player controls auto-hide logic
├── constants/
│   ├── imagePaths.ts               # All PNG asset requires
│   └── layout.ts                   # Screen dimensions, grid config
└── native/
    └── (existing native modules)
```

**Files to DELETE after refactor:**
- `src/utils/makeStyles.ts` (replaced by theme tokens)
- `src/context/ThemeContext.tsx` (moved to `src/theme/index.ts`)
- All placeholder screens that are replaced by full implementations

**Checklist:**
- [ ] All screens in `src/screens/`
- [ ] All shared components in `src/components/core/`
- [ ] Theme system in `src/theme/`
- [ ] Custom hooks in `src/hooks/`
- [ ] Services in `src/services/`
- [ ] Constants in `src/constants/`
- [ ] Deleted obsolete files

---

# PHASE 13 — Animation Infrastructure

### 13.1 Shared Animation Configs
**File:** `src/theme/animations.ts`

Centralize all animation configs:
```typescript
export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
    glacial: 500,
  },
  easing: {
    standard: Easing.bezier(0.4, 0, 0.2, 1),
    decelerate: Easing.bezier(0, 0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0, 1, 1),
  },
  spring: {
    default: { damping: 18, stiffness: 200, mass: 0.8 },
    snappy: { damping: 20, stiffness: 300, mass: 0.6 },
    bouncy: { damping: 12, stiffness: 180, mass: 1.0 },
  },
};
```

**Deliverables:**
- Centralized animation config
- Duration and easing tokens
- Spring presets

**Checklist:**
- [ ] All animation values centralized
- [ ] Consistent usage across components

### 13.2 createScreenTransition Hook
**File:** `src/hooks/useScreenTransition.ts`

Reusable hook for screen-level animated transitions:
- `useEnterAnimation()` — fade + scale in on mount
- `useExitAnimation()` — fade + scale out on unmount
- `useTabPressAnimation(target)` — spring scale on tab press

**Deliverables:**
- Reusable transition hooks
- Mount/unmount animations
- Tab press animation

**Checklist:**
- [ ] Enter animation works
- [ ] Exit animation works
- [ ] Tab press animation

---

# PHASE 14 — Data & State Management

### 14.1 Persist Theme Preference
**File:** `src/services/storageService.ts`

Create MMKV wrapper:
- `setThemePreference(mode: 'dark' | 'light' | 'system')`
- `getThemePreference()`
- `setRecentSearches(searches: string[])`
- `getRecentSearches()`
- `setLinkedFolders(type: 'video' | 'audio', paths: string[])`
- `getLinkedFolders(type)`

**Deliverables:**
- MMKV storage wrapper
- Typed getter/setter functions
- Error handling

**Checklist:**
- [ ] Theme persists
- [ ] Searches persist
- [ ] Folders persist

### 14.2 Library Scan Service
**File:** `src/services/libraryScanService.ts`

- `scanFolder(path: string): Promise<MediaItem[]>`
- `scanAllLinkedFolders()`
- `getVideos(): MediaItem[]`
- `getAudio(): MediaItem[]`
- `searchMedia(query: string): MediaItem[]`
- `sortMedia(items: MediaItem[], sortBy: SortOption): MediaItem[]`

**Deliverables:**
- Folder scanning
- Video/audio separation
- Search
- Sorting

**Checklist:**
- [ ] Folder scan works
- [ ] Videos/audio separated
- [ ] Search functional
- [ ] Sort works

### 14.3 Player State Cleanup
**File:** `src/store/slices/playerSlice.ts`

- Add `playbackSpeed: number` state
- Add `sleepTimerEndTime: number | null`
- Add `equalizerGains: number[]` (10 bands)
- Add `equalizerEnabled: boolean`
- Sync loop mode enum between playerSlice and settingsSlice

**Deliverables:**
- Playback speed in state
- Sleep timer in state
- EQ state in state
- Fixed loop mode enum

**Checklist:**
- [ ] Speed state added
- [ ] Sleep timer state added
- [ ] EQ state added
- [ ] Enum consistent

---

# PHASE 15 — Player Gesture & Control Polish

### 15.1 Gesture Handler Setup
Install `react-native-gesture-handler` if not present. Wrap app with `GestureHandlerRootView` in App.tsx.

**Checklist:**
- [ ] Package installed
- [ ] Root view wrapped

### 15.2 Reanimated Setup
Install `react-native-reanimated` if not present. Configure babel plugin. Update PlayerGestureLayer with gesture handlers.

**Checklist:**
- [ ] Package installed
- [ ] Babel configured
- [ ] Gestures implemented

### 15.3 Swipe Seek Gesture
**File:** `src/screens/Player/PlayerGestureLayer.tsx`

- Horizontal pan on video area
- `translationX > 50px` → seek +10s
- `translationX < -50px` → seek -10s
- Visual feedback: time badge overlay

**Checklist:**
- [ ] Swipe seek works
- [ ] Time badge shows
- [ ] Smooth animation

### 15.4 Double Tap Skip
**File:** `src/screens/Player/PlayerGestureLayer.tsx`

- Double tap left 1/4 of screen → −10s
- Double tap right 1/4 of screen → +10s
- Ripple animation from tap point
- "−10s" / "+10s" text overlay

**Checklist:**
- [ ] Double tap detected
- [ ] Correct direction
- [ ] Animation plays
- [ ] Ripple effect

### 15.5 Lock Screen Gesture
Add "Lock" button in player options. When locked:
- All gestures disabled
- Small "🔓" unlock button visible (top-right corner)
- Tap unlock → re-enable gestures

**Deliverables:**
- Lock toggle
- Locked state indicator
- Unlock gesture area

**Checklist:**
- [ ] Lock button works
- [ ] Gestures disabled
- [ ] Unlock works

---

# PHASE 16 — Mini-Player / Now Playing Bar

### 16.1 MiniPlayer Component
**File:** `src/components/MiniPlayer/MiniPlayer.tsx`

Persistent mini-player bar above tab bar:
```
┌─────────────────────────────────────────────┐
│ [Thumb] Title                ▶/⏸   ⋯      │
│        ████████░░░░░░░░░░░░░ (progress)     │
└─────────────────────────────────────────────┘
Height: 60px
Background: background.floating (rgba(0,0,0,0.55))
Border-top: border.subtle
Press → expand to full PlayerScreen
```

**Deliverables:**
- Mini player bar
- Thumbnail + title
- Play/pause button
- Progress bar
- Tap to expand

**Checklist:**
- [ ] Shows when playing
- [ ] Progress bar visible
- [ ] Play/pause works
- [ ] Tap expands

### 16.2 Mini-Player in TabNavigator
**File:** `src/navigation/TabNavigator.tsx`

Conditionally render `MiniPlayer` above `FloatingTabBar` when:
- `playerState.status === 'playing' | 'paused'`
- Not on PlayerScreen

**Deliverables:**
- Mini player conditionally shown
- Above tab bar
- Pushes content up slightly

**Checklist:**
- [ ] Shows during playback
- [ ] Hidden on PlayerScreen
- [ ] Tab bar aware

---

# PHASE 17 — Accessibility

### 17.1 Touch Target Sizes
All interactive elements: minimum 44×44px touch target (Apple HIG / Material guidelines). Review all buttons, icons, list items.

**Checklist:**
- [ ] All touch targets ≥ 44px
- [ ] No cramped interactions

### 17.2 Accessibility Labels
Add `accessibilityLabel` to:
- All tab bar items
- All media tiles
- All buttons
- Seek bar with current time
- Play/pause with current state

**Deliverables:**
- VoiceOver/TalkBack compatible
- Screen reader announces correctly

**Checklist:**
- [ ] Tab bar labeled
- [ ] Tiles labeled
- [ ] Controls labeled

### 17.3 Dynamic Type Support
Respect system font size settings where appropriate. Use `PixelRatio.getFontScale()` for relative scaling.

**Checklist:**
- [ ] Text scales with system
- [ ] Layout adapts

---

# PHASE 18 — Error & Loading States

### 18.1 Global Error Boundary
**File:** `src/app/ErrorBoundary.tsx`

Wrap app with error boundary. Show friendly error screen with:
- App icon
- "Something went wrong" message
- "Try Again" button
- Optional error details (collapsible)

**Deliverables:**
- Error boundary component
- Friendly error UI
- Retry functionality

**Checklist:**
- [ ] Error boundary catches crashes
- [ ] Friendly UI shown
- [ ] Retry works

### 18.2 File Not Found Handling
**File:** `src/services/fileService.ts`

- When file not found during playback → show error toast
- Offer to remove from recent
- Navigate back to Home

**Deliverables:**
- File not found detection
- Toast notification
- Recent cleanup option

**Checklist:**
- [ ] File not found detected
- [ ] Toast shown
- [ ] Option to remove

### 18.3 Network Error Handling
For streaming URLs (future):
- Show "No internet connection" state
- Retry button
- Cache previous content for offline viewing

**Checklist:**
- [ ] Network error detected
- [ ] Retry offered

---

# PHASE 19 — Performance Optimization

### 19.1 Image Caching
**File:** `src/constants/imagePaths.ts`

All PNG assets already using `require()` which webpack caches. For remote thumbnails:
- Use `react-native-fast-image` (already installed) for thumbnails
- Cache size: 100MB
- Priority: HIGH for visible, LOW for off-screen

**Checklist:**
- [ ] FastImage for thumbnails
- [ ] Cache configured

### 19.2 FlatList Optimization
All list components (library grid, search results, playlist, recent):
- `windowSize={5}` (render 5 screens)
- `maxToRenderPerBatch={10}`
- `removeClippedSubviews={true}` (Android)
- `getItemLayout` for fixed-height items

**Deliverables:**
- Optimized FlatLists
- Smooth scrolling

**Checklist:**
- [ ] windowSize set
- [ ] Batch size set
- [ ] getItemLayout where applicable

### 19.3 Memoization Audit
Review all components for unnecessary re-renders:
- `React.memo` for pure presentational components
- `useCallback` for event handlers passed as props
- `useMemo` for expensive computations

**Checklist:**
- [ ] Pure components memoized
- [ ] Handlers wrapped
- [ ] Computations memoized

---

# PHASE 20 — Splash & App Launch

### 20.1 Splash Screen
**File:** `android/app/src/main/res/drawable/splash.xml`
**File:** `android/app/src/main/res/values/styles.xml`

Configure splash screen:
- Background: `#0A0A0C` (dark) / `#F5F0E8` (light)
- Centered app logo
- Hide status bar on splash

**Deliverables:**
- Branded splash screen
- Theme-aware background

**Checklist:**
- [ ] Splash visible
- [ ] Logo centered
- [ ] No status bar

### 20.2 Launch Sequence Animation
**File:** `src/screens/Home/HomeScreen.tsx`

On cold start:
1. Splash shown (native)
2. App loads, navigation ready
3. Home mounts with fade-in animation (500ms)
4. Tab bar fades in (300ms delay, 250ms animation)

**Deliverables:**
- Smooth launch sequence
- No flash of unstyled content

**Checklist:**
- [ ] No FOUC
- [ ] Smooth fade in

---

# PHASE 21 — Preferences Deep Integration

### 21.1 Settings ↔ Preferences Sync
**File:** `src/screens/Preferences/PreferencesScreen.tsx`
**File:** `src/screens/Settings/SettingsScreen.tsx`

Ensure Preferences and Settings are consistent:
- Preferences links to Settings for playback/library/audio
- Settings is the single source of truth for all app settings
- Preferences becomes a "quick access" / "developer tools" page

**Deliverables:**
- Preferences links to Settings
- Consistent data

**Checklist:**
- [ ] Preferences → Settings link
- [ ] No conflicting settings

---

# PHASE 22 — Folder Linking Deep Integration

### 22.1 Settings Folder Management
**File:** `src/screens/Settings/SettingsScreen.tsx`

Full folder management:
- "Video Folders" row → opens folder picker → allows multiple selections
- "Audio Folders" row → opens folder picker → allows multiple selections
- Each row shows count: "3 folders"
- Tap row → navigates to a sub-page listing folders with delete option
- "Scan Folders" button → shows progress indicator → completes silently

**Deliverables:**
- Folder picker integration
- Multiple folders per type
- Scan with progress

**Checklist:**
- [ ] Folder picker works
- [ ] Multiple folders stored
- [ ] Scan triggers

### 22.2 Library Integration
**File:** `src/screens/Library/LibraryScreen.tsx`

Library tab reads from linked folders:
- On mount, scan all linked folders
- Cache scan results in Redux
- Show "Scanning..." state during initial scan
- Show "Last scanned: X minutes ago" in Library header

**Deliverables:**
- Library reads from linked folders
- Caching in Redux
- Scan status shown

**Checklist:**
- [ ] Library populated from folders
- [ ] Cache works
- [ ] Scan status shown

---

# PHASE 23 — Search Deep Integration

### 23.1 Search Targets
**File:** `src/screens/Search/SearchScreen.tsx`

Search across:
- Recent files (by name)
- Library files (by name, folder path)
- Playlist names
- Results grouped by type: "Recent", "Videos", "Audio"

**Deliverables:**
- Multi-source search
- Grouped results

**Checklist:**
- [ ] Searches recent
- [ ] Searches library
- [ ] Grouped results

### 23.2 Search Filters
Add filter chips above results:
- All | Videos | Audio
- Sort: Relevance | Date | Name

**Deliverables:**
- Filter chips
- Sort options

**Checklist:**
- [ ] Filter chips work
- [ ] Sort works

---

# PHASE 24 — Player Sub-Panels Polish

### 24.1 Subtitle Panel
**File:** `src/screens/Player/PlayerSubtitlePanel.tsx`

Bottom sheet design:
- Drag handle at top
- List of subtitle tracks
- Each row: track lang, codec, "✓" if active
- "No Subtitles" option
- External subtitle button → file picker
- Subtitle style: size (S/M/L), color (white/yellow/blue), background (none/semi/opaque)

**Deliverables:**
- Track list
- External subtitle picker
- Style customization

**Checklist:**
- [ ] Tracks listed
- [ ] External picker works
- [ ] Style options

### 24.2 Audio Panel
**File:** `src/screens/Player/PlayerAudioPanel.tsx`

- List of audio tracks
- Each: language, codec, channel count, "✓" if active
- Track selection

**Deliverables:**
- Audio track list
- Selection works

**Checklist:**
- [ ] Tracks listed
- [ ] Selection works

### 24.3 Equalizer Panel
**File:** `src/screens/Player/PlayerEqualizerPanel.tsx`

- Toggle: Enable/Disable EQ
- Preset selector: Flat, Rock, Pop, Jazz, Classical, Dance, Custom
- 10-band graphic EQ with sliders
- Visual frequency response curve (simple line graph)
- Bass boost toggle
- Virtualizer toggle

**Deliverables:**
- EQ enable/disable
- Presets
- 10-band sliders
- Preset curve visualization

**Checklist:**
- [ ] Toggle works
- [ ] Presets load
- [ ] Band sliders
- [ ] Visual curve

### 24.4 Playlist Panel
**File:** `src/screens/Player/PlayerPlaylistPanel.tsx`

- Current queue display
- Now playing highlighted
- Tap item → jump to it
- Drag to reorder (future)
- Swipe to remove
- "Add to Queue" button
- "Clear Queue" button

**Deliverables:**
- Queue list
- Now playing highlighted
- Swipe remove

**Checklist:**
- [ ] Queue listed
- [ ] Highlighted item
- [ ] Swipe remove works

---

# PHASE 25 — Animations: Panel Entry/Exit

### 25.1 Bottom Sheet Animation
All player sub-panels (subtitles, audio, EQ, playlist) use bottom sheet animation:
- Enter: translateY from screen bottom → 0, backdrop opacity 0 → 0.5, 350ms decelerate
- Exit: translateY 0 → screen bottom, backdrop opacity 0.5 → 0, 250ms accelerate
- Backdrop: `rgba(0,0,0,0.5)`

**Deliverables:**
- Consistent panel animation
- Backdrop scrim
- Timing as specified

**Checklist:**
- [ ] Panel animates in
- [ ] Panel animates out
- [ ] Backdrop works

---

# PHASE 26 — Now Playing Queue

### 26.1 Queue Management in Redux
**File:** `src/store/slices/playerSlice.ts`

- `addToQueue(entry: PlaylistEntry)`
- `removeFromQueue(index: number)`
- `reorderQueue(fromIndex: number, toIndex: number)`
- `clearQueue()`
- `shuffleQueue()`

**Deliverables:**
- Queue actions in Redux
- Shuffle action
- Clear action

**Checklist:**
- [ ] Add to queue
- [ ] Remove from queue
- [ ] Reorder
- [ ] Clear
- [ ] Shuffle

---

# PHASE 27 — Status Bar System

### 27.1 StatusBar Component
**File:** `src/components/StatusBar.tsx`

Create a managed StatusBar component:
- Props: `variant: 'home' | 'player' | 'modal'`
- Home: translucent, theme-aware color
- Player landscape: hidden
- Player portrait: hidden (full controls)
- Modal: translucent, theme-aware

**Deliverables:**
- Centralized StatusBar
- Variants handled

**Checklist:**
- [ ] Home variant correct
- [ ] Player hidden
- [ ] Theme-aware

### 27.2 StatusBar in Navigation
**File:** `src/navigation/RootNavigator.tsx`
**File:** `App.tsx`

Set StatusBar per-screen in navigation `screenOptions`:
```typescript
screenOptions={{
  contentOptions={{
    headerShown: false,
  },
  statusBar: {
    style: isDark ? 'light' : 'dark',
    backgroundColor: 'transparent',
  }
}}
```

**Deliverables:**
- StatusBar per screen
- Theme-aware

**Checklist:**
- [ ] Per-screen StatusBar
- [ ] Theme syncs

---

# PHASE 28 — Haptic Feedback

### 28.1 Haptic Feedback Integration
**File:** `src/hooks/useHaptics.ts`

Use `expo-haptics` or `react-native-haptic-feedback`:
- Light tap: tab selection
- Medium: button press, toggle
- Heavy: slider snap, gesture threshold reached

**Deliverables:**
- Haptic hook
- Light/medium/heavy variants
- Applied to key interactions

**Checklist:**
- [ ] Hook created
- [ ] Tab press haptics
- [ ] Toggle haptics
- [ ] Seek haptics

---

# PHASE 29 — Deep Linking & URL Handling

### 29.1 Handle Content URIs
**File:** `App.tsx`
**File:** `src/services/fileService.ts`

Handle `content://` URIs from external apps:
- Register as video/audio player intent
- Accept file shared via Android Share Sheet
- Process incoming intent on app launch

**Deliverables:**
- Intent handling
- Shared file playback

**Checklist:**
- [ ] Accepts shared files
- [ ] Plays shared content

---

# PHASE 30 — Final Polish & QA

### 30.1 Cross-Screen Consistency Audit
Review every screen for:
- [ ] Consistent header height (or none)
- [ ] Consistent padding (xxl horizontal)
- [ ] Consistent font usage (AppText variants)
- [ ] Consistent color usage (theme tokens only, no hardcoded hex except gold accent)
- [ ] Consistent border radius
- [ ] Consistent shadow usage
- [ ] Consistent animation timing

**Checklist:**
- [ ] Headers consistent
- [ ] Padding consistent
- [ ] Fonts consistent
- [ ] Colors from tokens
- [ ] Animations consistent

### 30.2 Dark/Light Mode Audit
Review every component in both themes:
- [ ] All hardcoded `#FFFFFF` replaced with `colors.background.primary`
- [ ] All hardcoded `#000000` replaced with appropriate token
- [ ] Gold accent consistent across modes
- [ ] No pure white on white or pure black on black (unless intentional)

**Checklist:**
- [ ] No #FFFFFF hardcoded
- [ ] No #000000 hardcoded
- [ ] Both themes tested

### 30.3 Memory & Performance Audit
- [ ] No memory leaks from subscriptions (mpv event listeners)
- [ ] No console.log left in production
- [ ] Image assets optimized (run `npx react-native optimize images`)
- [ ] Bundle size reasonable (< 30MB)

**Checklist:**
- [ ] No memory leaks
- [ ] No console.log
- [ ] Images optimized
- [ ] Bundle size check

### 30.4 Final TypeScript Check
```bash
npx tsc --noEmit
```
Must be clean (0 errors, 0 warnings) before each phase commit.

**Checklist:**
- [ ] 0 TypeScript errors
- [ ] 0 TypeScript warnings

---

# Implementation Order

| Phase | Name | Priority | Estimated Effort |
|-------|------|----------|-----------------|
| 1 | Design Tokens & Theme System | P0 | High |
| 2 | Component Library | P0 | High |
| 3 | Floating Tab Bar Polish | P1 | Medium |
| 4 | Navigation Redesign | P1 | Medium |
| 5 | HomeScreen Redesign | P0 | High |
| 6 | LibraryScreen Implementation | P0 | High |
| 7 | SearchScreen Implementation | P1 | High |
| 8 | SettingsScreen Redesign | P1 | High |
| 9 | PlayerScreen Decomposition | P0 | Very High |
| 10 | Sub-Pages Full Implementation | P1 | High |
| 11 | PreferencesScreen Polish | P2 | Low |
| 12 | Folder Structure Refactor | P1 | Medium |
| 13 | Animation Infrastructure | P1 | Medium |
| 14 | Data & State Management | P1 | Medium |
| 15 | Player Gestures | P1 | High |
| 16 | Mini-Player | P2 | Medium |
| 17 | Accessibility | P2 | Low |
| 18 | Error & Loading States | P1 | Medium |
| 19 | Performance Optimization | P2 | Medium |
| 20 | Splash & App Launch | P2 | Low |
| 21 | Preferences Deep Integration | P2 | Low |
| 22 | Folder Linking Deep Integration | P1 | High |
| 23 | Search Deep Integration | P1 | High |
| 24 | Player Sub-Panels Polish | P1 | High |
| 25 | Panel Animations | P1 | Medium |
| 26 | Now Playing Queue | P2 | Medium |
| 27 | Status Bar System | P2 | Medium |
| 28 | Haptic Feedback | P2 | Low |
| 29 | Deep Linking | P2 | Medium |
| 30 | Final Polish & QA | P0 | Medium |

---

# Key Decisions (Can Be Overridden)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Light mode base color | `#F5F0E8` (ivory) | Never pure white; warm and premium |
| Accent color | `#C9A84C` (antique gold) | Restrained, not gaudy; premium feel |
| Navigation style | Floating tab bar | Modern, premium; apps like Spotify/YouTube use it |
| Player orientation | Adapts to content | Best UX; user can also force lock |
| EQ visualization | Simple line graph | Minimalist; avoids kiddish graphics |
| Tab icons | PNG only | Consistency with existing assets |
| Animations | Spring-based | Natural, physics-first |
| Folder management | Settings-based | Organized; user knows where to look |
| Search | Debounced 300ms | Balance between responsiveness and performance |
