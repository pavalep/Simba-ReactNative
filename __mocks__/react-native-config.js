// Jest mock for react-native-config. The native module is not
// registered in the jest test env. We return an empty config
// object so callers fall back to their `?? ''` defaults.

module.exports = {
  PODCAST_INDEX_API_KEY: '',
  PODCAST_INDEX_API_SECRET: '',
  WEATHER_API_KEY: '',
};
