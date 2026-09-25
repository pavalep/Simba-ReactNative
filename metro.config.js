const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    // T-D-040b PATCH: Metro's default sourceExts order is
    // ['js', 'jsx', 'json', 'ts', 'tsx']. With both env.ts and
    // env.json in src/constants/, `import {ENV} from './env'`
    // resolves to env.json (which has no `ENV` export, so `ENV`
    // is undefined at runtime → "Cannot read property
    // 'GOOGLE_WEB_CLIENT_ID' of undefined"). Hoist 'ts'/'tsx'
    // before 'json' so the .ts module wins. See commit
    // message for the discovery context.
    sourceExts: [
      'js',
      'jsx',
      'ts',
      'tsx',
      'json',
      'svg',
      ...sourceExts.filter(ext => !['js','jsx','json','ts','tsx','svg'].includes(ext)),
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);

