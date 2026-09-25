// V23 W24 D-040b: env values come from src/constants/env.json (a
// JSON module Metro bundles into the JS — no native module, no
// BuildConfig reflection, no TurboModule involved). This was the
// SIMBA pattern before react-native-config was adopted, and we
// revert to it now because react-native-config's Bridgeless-mode
// BuildConfig lookup (PR #879, in 1.7.2) is broken on this project.
//
// What we observed: with react-native-config 1.7.2 restored, the
// TurboModule IS registered correctly (codegen runs, PackageList
// includes RNCConfigPackage, no throw from index.js). But at runtime
// Config = { LIBRARY_PACKAGE_NAME: 'com.simba.player', DEBUG: true,
// BUILD_TYPE: 'debug' } — that's the LIBRARY's BuildConfig (with
// LIBRARY_PACKAGE_NAME overwritten by AGP to the app's namespace).
// The app's BuildConfig.java has PODCAST_INDEX_API_KEY etc. (verified
// on disk), but `buildConfigPackageCandidates()` is returning the
// LIB's package somehow instead of the app's namespace. The PR #879
// fix is verified by stub-compile only, not real device builds; our
// RN 0.86 bridgeless setup hits the edge case it didn't exercise.
//
// Workaround: keep the env values in two places (android/.env is
// the canonical source for BuildConfig/dotenv.gradle; src/constants/env.json
// is the bundle-time fallback that JS reads) and update them by hand.
// They were identical before this regression so the duplication is
// acceptable for the duration of the bridgeless workaround. To
// switch back to react-native-config when upstream lands a real fix,
// re-import from 'react-native-config' (the .env + dotenv.gradle +
// resValue + module registration stay in place ready for it).
import envJson from './env.json';

export const ENV = {
  PODCAST_INDEX_API_KEY: envJson.PODCAST_INDEX_API_KEY ?? '',
  PODCAST_INDEX_API_SECRET: envJson.PODCAST_INDEX_API_SECRET ?? '',
  JAMENDO_CLIENT_ID: envJson.JAMENDO_CLIENT_ID ?? '',
  JAMENDO_CLIENT_SECRET: envJson.JAMENDO_CLIENT_SECRET ?? '',
  AUDIUS_API_KEY: envJson.AUDIUS_API_KEY ?? '',
  GOOGLE_WEB_CLIENT_ID: envJson.GOOGLE_WEB_CLIENT_ID ?? '',
};

export default ENV;





