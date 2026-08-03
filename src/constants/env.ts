// ─── API Key Configuration ──────────────────────────────────────────────
// Keys are read from .env via react-native-config at build time.
// .env is gitignored — never commit real keys.
import Config from 'react-native-config';

export const ENV = {
  PODCAST_INDEX_API_KEY: Config.PODCAST_INDEX_API_KEY ?? '',
  PODCAST_INDEX_API_SECRET: Config.PODCAST_INDEX_API_SECRET ?? '',
  JAMENDO_CLIENT_ID: Config.JAMENDO_CLIENT_ID ?? '',
  JAMENDO_CLIENT_SECRET: Config.JAMENDO_CLIENT_SECRET ?? '',
  AUDIUS_API_KEY: Config.AUDIUS_API_KEY ?? '',
  GOOGLE_WEB_CLIENT_ID: Config.GOOGLE_WEB_CLIENT_ID ?? '',
};
