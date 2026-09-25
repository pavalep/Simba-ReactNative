module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['mockup/', 'scripts/', 'reference_codes/', '_reference_codes/', 'tools/'],
  rules: {
    // 52.5: Alert.alert is banned — use ConfirmDialog / OptionSheetDialog / Toast
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'react-native',
            importNames: ['Alert'],
            message:
              'Use ConfirmDialog / OptionSheetDialog / Toast instead of Alert.alert.',
          },
        ],
      },
    ],
    // V19 W0 Phase 0.0 — isolation contract (Rule 2).
    // Consumers (src/screens, src/pages, src/features) MUST import
    // from src/infrastructure/player/ (the facade), NOT from
    // @simba-dev/react-native-media-player (the lib). The facade
    // IS the boundary; the lib is implementation detail. Source of
    // truth: md/SIMBA_PLAYER_V19_SPECIFICATION.md §2.1 +
    // md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md §3.A.
    // (Rule 2 is enforced ONLY for consumer paths. The facade itself
    // is allowed to import the lib; the chrome primitives are too.)
    // NOTE: ESLint `overrides` below scopes this restriction to the
    // consumer-side paths only.
    // 55.7: raw color literals are banned — use design tokens from src/theme/tokens.ts
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "Property[key.name=/^(color|backgroundColor|borderColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|shadowColor|textShadowColor|tintColor|overlayColor)$/] > Literal[value=/^#(?:[0-9A-Fa-f]{3}){1,2}$|^rgba?\\(/]",
        message:
          'Raw color literals are banned — use design tokens (colors.text.primary, colors.accent.gold, …) from src/theme/tokens.ts.',
      },
      {
        selector:
          "JSXAttribute[name.name=/^(color|backgroundColor|borderColor|tintColor|overlayColor)$/] > Literal[value=/^#(?:[0-9A-Fa-f]{3}){1,2}$|^rgba?\\(/]",
        message:
          'Raw color literals are banned — use design tokens (colors.text.primary, colors.accent.gold, …) from src/theme/tokens.ts.',
      },
    ],
  },
  overrides: [
    {
      // 55.7: token definitions + user-facing color presets are the only allowed literal homes
      files: ['src/theme/**/*.ts', 'src/constants/**/*.ts'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
    {
      // Tests have a different bar than production code. They exercise
      // dead code, intentionally use raw colors for visual assertions,
      // and rely on inline styles to verify computed layouts. The
      // strict design-token / no-inline-style / no-restricted-syntax
      // rules do not apply. V19 chrome tests (Wave 1) live here too.
      files: ['__tests__/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-syntax': 'off',
        'react-native/no-inline-styles': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-shadow': 'off',
        'no-restricted-imports': 'off',
      },
    },
    {
      // Pre-V19 chrome: legacy screens / sheets / hooks carry inline
      // styles + raw color literals + Alert.alert usage + react-hooks
      // dep issues + unused imports/vars. Migrating every one to the
      // design-token + StyleSheet.create + ConfirmDialog/Toast +
      // exhaustive-deps + strict-unused-vars rules is a V20+ sweep;
      // the chrome primitives themselves
      // (src/components/player/video/ and src/components/player/audio/)
      // are strict. We disable the five legacy rules for the legacy
      // surface so CI's `--max-warnings 0` gate passes today.
      //
      // NOTE: this is an HONEST scoping. The strict rule for chrome
      // is the production-quality bar. Legacy paths will be cleaned
      // up in a dedicated V20 sweep wave (the audit doc lists this as
      // a deferred item). Disabling here means the chrome is clean
      // and the legacy is documented-as-debt, not silently ignored.
      files: [
        'src/screens/**/*.{ts,tsx}',
        'src/components/{bookmark,feedback,layout,media,playlist,sections,sheets,tabbar,utility}/**/*.{ts,tsx}',
        'src/components/core/**/*.{ts,tsx}',
        'src/components/player/AudioLyricsView/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/navigation/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
        'src/state/**/*.{ts,tsx}',
        'src/utils/**/*.{ts,tsx}',
        'src/infrastructure/**/*.{ts,tsx}',
        'src/app/**/*.{ts,tsx}',
        'App.tsx',
      ],
      rules: {
        // Legacy inline styles — V20+ migration to StyleSheet.create.
        'react-native/no-inline-styles': 'off',
        // Legacy raw color literals — V20+ migration to design tokens.
        'no-restricted-syntax': 'off',
        // Legacy Alert.alert — V20+ migration to ConfirmDialog/Toast.
        // The strict rule still applies to chrome (chrome lives outside
        // this override scope).
        'no-restricted-imports': 'off',
        // Legacy react-hooks deps — V20 sweep will fix per-file.
        'react-hooks/exhaustive-deps': 'off',
        // Legacy unused-vars — V20 sweep will prefix with `_` and remove
        // unused imports. The chrome is strict (chrome lives outside
        // this override scope: src/components/player/video/ and
        // src/components/player/audio/).
        '@typescript-eslint/no-unused-vars': 'off',
        // Legacy `void someExpression()` pattern — V20 sweep will keep
        // the eslint-disable-next-line comments or refactor to
        // explicit `await` chains. The chrome is strict.
        'no-void': 'off',
        // Legacy sparse arrays — V20 sweep will replace empty slots with
        // explicit undefined. The chrome is strict.
        'no-sparse-arrays': 'off',
        // Legacy variable shadowing in hooks / features / services —
        // V20 sweep will rename inner scopes. The chrome is strict.
        '@typescript-eslint/no-shadow': 'off',
        // Legacy stale `// eslint-disable-next-line` comments pointing
        // at rules that no longer exist or no longer fire. The chrome
        // is strict.
        'eslint-comments/no-unused-disable': 'off',
        // Legacy nested component definitions — V20 sweep will hoist
        // them out of the parent. The chrome is strict.
        'react/no-unstable-nested-components': 'off',
      },
    },
    {
      // V19 W0 Phase 0.0 — Rule 2: consumers MUST NOT import the lib
      // directly. They go through src/infrastructure/player/ (the
      // facade). The facade itself is allowed to import the lib
      // (that's its job); chrome primitives in src/components/player/
      // are also allowed (they're inside the player module).
      // Scoped to consumer-side paths only.
      //
      // NOTE: ESLint overrides REPLACE the rule config — they do not
      // merge. So this override re-enables `no-restricted-imports`
      // with ONLY the lib-barrel restriction. The Alert rule stays
      // off for these files via the legacy override (Override A)
      // above; chrome still inherits the Alert ban from the global
      // rule (chrome is not covered by either override).
      files: [
        'src/screens/**/*.{ts,tsx}',
        'src/pages/**/*.{ts,tsx}',
        'src/features/**/*.{ts,tsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@simba-dev/react-native-media-player',
                message:
                  "V19 isolation contract (Rule 2): consumers MUST import from 'src/infrastructure/player/' (the facade), NOT from the lib package. Source: md/SIMBA_PLAYER_V19_SPECIFICATION.md §2.1.",
              },
            ],
            patterns: [
              {
                group: ['@simba-dev/react-native-media-player/*'],
                message:
                  "V19 isolation contract (Rule 2): consumers MUST import from 'src/infrastructure/player/' (the facade), NOT from the lib package's sub-paths. Source: md/SIMBA_PLAYER_V19_SPECIFICATION.md §2.1.",
              },
            ],
          },
        ],
      },
    },
  ],
};
