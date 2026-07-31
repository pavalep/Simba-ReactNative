module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['mockup/', 'scripts/'],
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
  ],
};
