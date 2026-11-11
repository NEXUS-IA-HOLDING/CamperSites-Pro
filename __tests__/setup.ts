/**
 * Global Jest Test Setup
 * CamperSites Pro E2E and Unit Test Infrastructure
 */

import {
  mockAsyncStorage,
  mockGeolocation,
  mockMapLibre,
  mockLinking,
  mockShare,
  mockAppState,
  mockBackgroundTimer,
  mockSupabase,
} from './e2e/helpers/testMocks';

// Silence unnecessary React Native / Hermes warnings during tests
// but preserve genuine error logging
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated:') ||
      args[0].includes('componentWillReceiveProps') ||
      args[0].includes('componentWillMount') ||
      args[0].includes('Sending `onAnimatedValueUpdate`'))
  ) {
    return;
  }
  originalWarn(...args);
};

// 1. Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// 2. Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => mockGeolocation);

// 3. Mock @maplibre/maplibre-react-native
jest.mock('@maplibre/maplibre-react-native', () => mockMapLibre);

// 4. Mock react-native-background-timer
jest.mock('react-native-background-timer', () => mockBackgroundTimer);

// 5. Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () =>
  require('./e2e/helpers/vectorIconsMock')
);
jest.mock('react-native-vector-icons', () =>
  require('./e2e/helpers/vectorIconsMock')
);

// 6. Mock react-native-sound
jest.mock('react-native-sound', () => {
  return class MockSound {
    static setCategory = jest.fn();
    play = jest.fn((cb) => cb && cb(true));
    stop = jest.fn();
    pause = jest.fn();
    release = jest.fn();
    setVolume = jest.fn();
    getDuration = jest.fn(() => 5);
  };
});

// 7. Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn(async () => 'granted'),
  request: jest.fn(async () => 'granted'),
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    },
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
      LOCATION_ALWAYS: 'ios.permission.LOCATION_ALWAYS',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
}));

// 8. Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaConsumer: ({ children }: any) => children({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children, ...props }: any) => React.createElement('SafeAreaView', props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// 9. Mock react-native-screens
jest.mock('react-native-screens', () => {
  const React = require('react');
  return {
    enableScreens: jest.fn(),
    screensEnabled: jest.fn(() => true),
    ScreenContainer: ({ children }: any) => React.createElement('ScreenContainer', null, children),
    Screen: ({ children }: any) => React.createElement('Screen', null, children),
  };
});

// 10. Mock react-native-push-notification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  createChannel: jest.fn((_config, cb) => cb && cb(true)),
}));

// 11. Mock @react-native-community/push-notification-ios
jest.mock('@react-native-community/push-notification-ios', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  requestPermissions: jest.fn(async () => ({ alert: true, badge: true, sound: true })),
}));

// 12. Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// 13. Augment React Native Linking & Share with stateful mocks
try {
  const RN = require('react-native');
  if (RN.Linking) {
    RN.Linking.openURL = mockLinking.openURL;
    RN.Linking.canOpenURL = mockLinking.canOpenURL;
    RN.Linking.getInitialURL = mockLinking.getInitialURL;
  }
  if (RN.Share) {
    RN.Share.share = mockShare.share;
  }
  if (RN.AppState) {
    RN.AppState.addEventListener = mockAppState.addEventListener;
    Object.defineProperty(RN.AppState, 'currentState', {
      get: () => mockAppState.currentState,
      configurable: true,
    });
  }
} catch (e) {
  // Ignore if react-native not fully initialized
}
