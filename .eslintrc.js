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
  },
};
