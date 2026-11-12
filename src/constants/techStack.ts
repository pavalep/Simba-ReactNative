// ─── The app's stack — ONE owner ─────────────────────────────────
//
// The About page shows a short "Built with" card; the Credits page
// shows the same stack in full, grouped. They are ONE list, so they
// live in ONE file.
//
// WHY IT WAS WRONG (2026-11-12)
// ─────────────────────────────
//
// Both pages named Redux Toolkit and redux-persist. The app has not
// used either since V17: `package.json` has no `redux` and no
// `@reduxjs/toolkit`, and every one of the app's 23 stores is a
// `zustand` store. The Credits page had carried the claim since 25.3.
//
// The list below is what the app ACTUALLY ships — every entry is a
// dependency in `package.json`, a file in `android/app/src/main/assets/
// fonts`, or the native player the app is built on:
//
//   Media engine   MPV (via the native player), FFmpeg
//   Framework      React Native 0.86, TypeScript, React 19
//   State & data   Zustand 5, react-native-mmkv
//   Navigation     React Navigation 7 + the UI kit
//   Tooling        Jest, react-native-haptic-feedback
//
// `__tests__/app/techStack.test.ts` checks that every "Built with" chip
// names an entry below, and that no entry names a package the app does
// not have.
//
// The `About / light` and `About / dark` boards in Penpot (page `SIMBA`,
// drawn by `designs/penpot/profile.js`) carry the same list — the board
// is the sketch, this file is the owner. See `md/ABOUT_PAGE_FIX.md`.

/** One library, as the Credits page prints it. */
export interface TechEntry {
  /**
   * The canonical short name — the About page's chip.
   *
   * `MMKV` here, `react-native-mmkv` in the credits line: the chip
   * says what the thing is called, the credits line says which package
   * ships it.
   */
  name: string;
  /** The full line the Credits page prints, with the version and licence. */
  label: string;
}

/** One group of libraries — the Credits page's own grouping. */
export interface TechGroup {
  title: string;
  entries: TechEntry[];
}

/** The app's stack, grouped. */
export const TECH_STACK: TechGroup[] = [
  {
    title: 'Media engine',
    entries: [
      {
        name: 'MPV',
        label: 'MPV — video and audio playback (LGPL-2.1+)',
      },
      {
        name: 'libmpv bindings for React Native',
        label: 'libmpv bindings for React Native',
      },
      {
        name: 'FFmpeg',
        label: 'FFmpeg — demuxing and decoding',
      },
    ],
  },
  {
    title: 'Framework',
    entries: [
      {name: 'React Native', label: 'React Native 0.86 (MIT)'},
      {name: 'TypeScript', label: 'TypeScript'},
      {name: 'React', label: 'React 19'},
    ],
  },
  {
    title: 'State & data',
    entries: [
      {name: 'Zustand', label: 'Zustand 5 (MIT)'},
      {name: 'MMKV', label: 'react-native-mmkv (MIT)'},
    ],
  },
  {
    title: 'Navigation & UI',
    entries: [
      {name: 'React Navigation', label: 'React Navigation 7 (MIT)'},
      {
        name: 'react-native-linear-gradient',
        label: 'react-native-linear-gradient',
      },
      {name: 'react-native-svg', label: 'react-native-svg'},
      {
        name: 'react-native-safe-area-context',
        label: 'react-native-safe-area-context',
      },
    ],
  },
  {
    title: 'Tooling',
    entries: [
      {
        name: 'Jest',
        label: 'Jest + @testing-library/react-native',
      },
      {
        name: 'react-native-haptic-feedback',
        label: 'react-native-haptic-feedback',
      },
    ],
  },
];

/**
 * The About page's "Built with" chips — the headline of the stack.
 *
 * The order is the About board's: the framework first (what the app
 * IS), then the engine, then the state, then the navigation.
 */
export const BUILT_WITH_CHIPS: string[] = [
  'React Native',
  'TypeScript',
  'MPV',
  'Zustand',
  'MMKV',
  'React Navigation',
];
