module.exports = {
  preset: 'react-native',
  watchman: false,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: [
    '<rootDir>/node_modules/react-native/jest/setup.js',
    '<rootDir>/__tests__/setup.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@maplibre|@react-navigation|haversine-distance)/)',
  ],
  testMatch: [
    '<rootDir>/__tests__/**/*.test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
  ],
  moduleNameMapper: {
    '^@env$': '<rootDir>/__tests__/e2e/helpers/envMock.ts',
    '^react-native-vector-icons/(.*)$': '<rootDir>/__tests__/e2e/helpers/vectorIconsMock.js',
  },
  verbose: true,
  testTimeout: 15000,
};
