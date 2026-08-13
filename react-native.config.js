module.exports = {
  project: {
    android: {
      sourceDir: './android',
    },
    ios: {},
  },
  // v7 brand typography — 5 font families, 11 TTFs total.
  // `npx react-native-asset` will copy the files into
  //   android/app/src/main/assets/fonts/
  //   ios/CinePlayer/Fonts/
  // and register them in build.gradle + Info.plist (UIAppFonts).
  assets: ['./assets/fonts/'],
};
