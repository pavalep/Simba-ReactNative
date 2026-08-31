// Jest mock for react-native-localize. The native RNLocalize
// module is not registered in the jest test env. We stub the
// public API to safe defaults that match the test locale.

module.exports = {
  getLocales: () => [
    {languageCode: 'en', countryCode: 'US', languageTag: 'en-US', isRTL: false},
  ],
  findBestLanguageTag: () => ({languageTag: 'en-US', isRTL: false}),
  findBestAvailableLanguage: () => 'en',
  getNumberFormatSettings: () => ({decimalSeparator: '.', groupingSeparator: ','}),
  getCalendar: () => 'gregorian',
  getCountry: () => 'US',
  getCurrencies: () => ['USD'],
  getTemperatureUnit: () => 'celsius',
  getTimeZone: () => 'UTC',
  uses24HourClock: () => true,
  usesMetricSystem: () => true,
  addEventListener: () => ({remove: () => {}}),
  removeEventListener: () => {},
  findLanguage: () => undefined,
};
