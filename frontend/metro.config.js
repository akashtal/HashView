const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Add SVG transformer
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'], // SVG support only
  // unstable_enablePackageExports: false, // Removed to fix expo-notifications resolution

  // Force axios to use browser build since we disabled package exports
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === 'axios') {
      // Redirect axios to its browser build using absolute path
      return {
        filePath: require.resolve('axios/dist/browser/axios.cjs'),
        type: 'sourceFile',
      };
    }
    // Default resolution for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
