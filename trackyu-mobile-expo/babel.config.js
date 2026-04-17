module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated doit être en dernier
      'react-native-reanimated/plugin',
    ],
  };
};
