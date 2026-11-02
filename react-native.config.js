const androidPlatform = require('@react-native-community/cli-platform-android');
const iosPlatform = require('@react-native-community/cli-platform-ios');
const cliPlugin = require('@react-native/community-cli-plugin');

module.exports = {
  commands: [
    cliPlugin.bundleCommand,
    cliPlugin.ramBundleCommand,
    cliPlugin.startCommand,
  ],
  project: {
    ios: {},
    android: {
      sourceDir: './android',
      appName: 'app',
      packageName: 'com.campersitestemp',
    },
  },
  platforms: {
    android: {
      projectConfig: androidPlatform.projectConfig,
      dependencyConfig: androidPlatform.dependencyConfig,
    },
    ios: {
      projectConfig: iosPlatform.projectConfig,
      dependencyConfig: iosPlatform.dependencyConfig,
    },
  },
};
