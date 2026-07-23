const React = require('react');

module.exports = {
  SafeAreaProvider: ({children}) => children,
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
};
