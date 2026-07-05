const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          'nativewind',
          'react-native-reanimated',
          'react-native-safe-area-context',
          'react-native-gesture-handler',
        ],
      },
    },
    argv
  );
  
  // Resolve alias untuk react-native-web
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    'react-native-reanimated': path.resolve(__dirname, 'node_modules/react-native-reanimated'),
    'react-native-safe-area-context': path.resolve(__dirname, 'node_modules/react-native-safe-area-context'),
    'react-native-gesture-handler': path.resolve(__dirname, 'node_modules/react-native-gesture-handler'),
  };

  return config;
};
