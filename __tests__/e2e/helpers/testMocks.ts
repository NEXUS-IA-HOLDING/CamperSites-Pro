/**
 * CamperSites Pro — Stateful In-Memory Test Mocks & Helpers
 * Genuine implementations for opaque-box E2E testing
 */

import React from 'react';

// ============================================================================
// 1. ASYNC STORAGE MOCK
// ============================================================================
export interface MockAsyncStorageType {
  _store: Map<string, string>;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  getAllKeys: () => Promise<string[]>;
  multiGet: (keys: string[]) => Promise<[string, string | null][]>;
  multiSet: (keyValuePairs: [string, string][]) => Promise<void>;
  multiRemove: (keys: string[]) => Promise<void>;
  _dump: () => Record<string, string>;
  _seed: (entries: Record<string, any>) => void;
  _reset: () => void;
}

export function createMockAsyncStorage(): MockAsyncStorageType {
  const store = new Map<string, string>();

  return {
    _store: store,
    getItem: jest.fn(async (key: string) => {
      return store.has(key) ? store.get(key)! : null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: jest.fn(async () => {
      store.clear();
    }),
    getAllKeys: jest.fn(async () => {
      return Array.from(store.keys());
    }),
    multiGet: jest.fn(async (keys: string[]) => {
      return keys.map((k) => [k, store.has(k) ? store.get(k)! : null] as [string, string | null]);
    }),
    multiSet: jest.fn(async (pairs: [string, string][]) => {
      for (const [k, v] of pairs) {
        store.set(k, String(v));
      }
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      for (const k of keys) {
        store.delete(k);
      }
    }),
    _dump: () => {
      const obj: Record<string, string> = {};
      store.forEach((v, k) => {
        obj[k] = v;
      });
      return obj;
    },
    _seed: (entries: Record<string, any>) => {
      for (const [k, v] of Object.entries(entries)) {
        store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    },
    _reset: () => {
      store.clear();
    },
  };
}

export const mockAsyncStorage = createMockAsyncStorage();

// ============================================================================
// 2. GEOLOCATION MOCK
// ============================================================================
export interface MockGeoPosition {
  coords: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    accuracy: number;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed: number | null; // in m/s (standard Geolocation API)
  };
  timestamp: number;
}

export interface MockGeolocationType {
  _watchers: Map<number, (pos: MockGeoPosition) => void>;
  _nextWatchId: number;
  _lastPosition: MockGeoPosition;
  getCurrentPosition: (
    success: (pos: MockGeoPosition) => void,
    error?: (err: any) => void,
    options?: any
  ) => void;
  watchPosition: (
    success: (pos: MockGeoPosition) => void,
    error?: (err: any) => void,
    options?: any
  ) => number;
  clearWatch: (watchId: number) => void;
  stopObserving: () => void;
  requestAuthorization: (type?: string) => Promise<'granted' | 'denied'>;
  emitPosition: (position: Partial<MockGeoPosition> & { coords: Partial<MockGeoPosition['coords']> }) => void;
  emitSpeed: (speedKmh: number, lat?: number, lng?: number, heading?: number) => void;
  clearAllWatches: () => void;
  _reset: () => void;
}

export function createMockGeolocation(): MockGeolocationType {
  const watchers = new Map<number, (pos: MockGeoPosition) => void>();
  let nextId = 1;

  let currentPos: MockGeoPosition = {
    coords: {
      latitude: 40.4168,
      longitude: -3.7038,
      altitude: 667,
      accuracy: 5,
      heading: 0,
      speed: 0, // 0 m/s
    },
    timestamp: Date.now(),
  };

  const geo: MockGeolocationType = {
    _watchers: watchers,
    _nextWatchId: nextId,
    _lastPosition: currentPos,
    getCurrentPosition: jest.fn((success, _error, _options) => {
      success(currentPos);
    }),
    watchPosition: jest.fn((success, _error, _options) => {
      const id = nextId++;
      watchers.set(id, success);
      success(currentPos);
      return id;
    }),
    clearWatch: jest.fn((id: number) => {
      watchers.delete(id);
    }),
    stopObserving: jest.fn(() => {
      watchers.clear();
    }),
    requestAuthorization: jest.fn(async () => 'granted'),
    emitPosition: (partial) => {
      currentPos = {
        coords: {
          latitude: partial.coords.latitude ?? currentPos.coords.latitude,
          longitude: partial.coords.longitude ?? currentPos.coords.longitude,
          altitude: partial.coords.altitude ?? currentPos.coords.altitude,
          accuracy: partial.coords.accuracy ?? currentPos.coords.accuracy,
          heading: partial.coords.heading ?? currentPos.coords.heading,
          speed: partial.coords.speed !== undefined ? partial.coords.speed : currentPos.coords.speed,
        },
        timestamp: partial.timestamp ?? Date.now(),
      };
      geo._lastPosition = currentPos;
      watchers.forEach((cb) => {
        try {
          cb(currentPos);
        } catch (e) {
          // ignore watcher callback errors in mock
        }
      });
    },
    emitSpeed: (speedKmh: number, lat?: number, lng?: number, heading?: number) => {
      const speedMs = speedKmh / 3.6; // convert km/h to m/s
      geo.emitPosition({
        coords: {
          speed: speedMs,
          latitude: lat ?? currentPos.coords.latitude,
          longitude: lng ?? currentPos.coords.longitude,
          heading: heading ?? currentPos.coords.heading,
        },
      });
    },
    clearAllWatches: () => {
      watchers.clear();
    },
    _reset: () => {
      watchers.clear();
      nextId = 1;
      currentPos = {
        coords: {
          latitude: 40.4168,
          longitude: -3.7038,
          altitude: 667,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };
      geo._lastPosition = currentPos;
    },
  };

  return geo;
}

export const mockGeolocation = createMockGeolocation();

// ============================================================================
// 3. MAPLIBRE MOCK
// ============================================================================
export interface MockMapLibreType {
  setAccessToken: jest.Mock;
  setConnected: jest.Mock;
  _lastCamera: any;
  _shapes: Map<string, any>;
  _mountedViews: Set<any>;
  MapView: React.FC<any>;
  Camera: React.FC<any>;
  ShapeSource: React.FC<any>;
  LineLayer: React.FC<any>;
  SymbolLayer: React.FC<any>;
  PointAnnotation: React.FC<any>;
  Callout: React.FC<any>;
  UserLocation: React.FC<any>;
  StyleURL: Record<string, string>;
  CameraPadding: Record<string, number>;
  _reset: () => void;
}

export function createMockMapLibre(): MockMapLibreType {
  const shapes = new Map<string, any>();
  const mounted = new Set<any>();
  let lastCamera: any = null;

  const mock: MockMapLibreType = {
    setAccessToken: jest.fn(),
    setConnected: jest.fn(),
    _lastCamera: lastCamera,
    _shapes: shapes,
    _mountedViews: mounted,
    MapView: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        getCenter: jest.fn(async () => [-3.7038, 40.4168]),
        getZoom: jest.fn(async () => 14),
        setCamera: jest.fn((cam) => {
          lastCamera = cam;
          mock._lastCamera = cam;
        }),
        fitBounds: jest.fn((ne, sw, padding, duration) => {
          lastCamera = { bounds: { ne, sw }, padding, duration };
          mock._lastCamera = lastCamera;
        }),
        queryRenderedFeaturesAtPoint: jest.fn(async () => []),
      }));
      return React.createElement('MapLibreMapView', { ...props, testID: props.testID || 'maplibre-map-view' }, props.children);
    }) as any,
    Camera: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        setCamera: jest.fn((cam) => {
          lastCamera = cam;
          mock._lastCamera = cam;
        }),
        moveTo: jest.fn((coord, dur) => {
          lastCamera = { centerCoordinate: coord, duration: dur };
          mock._lastCamera = lastCamera;
        }),
      }));
      return React.createElement('MapLibreCamera', props, props.children);
    }) as any,
    ShapeSource: (props: any) => {
      if (props.id && props.shape) {
        shapes.set(props.id, props.shape);
      }
      return React.createElement('MapLibreShapeSource', props, props.children);
    },
    LineLayer: (props: any) => React.createElement('MapLibreLineLayer', props, props.children),
    SymbolLayer: (props: any) => React.createElement('MapLibreSymbolLayer', props, props.children),
    PointAnnotation: (props: any) => React.createElement('MapLibrePointAnnotation', props, props.children),
    Callout: (props: any) => React.createElement('MapLibreCallout', props, props.children),
    UserLocation: (props: any) => React.createElement('MapLibreUserLocation', props, props.children),
    StyleURL: {
      Street: 'https://tiles.openfreemap.org/styles/liberty',
      Satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      Dark: 'https://tiles.openfreemap.org/styles/dark',
    },
    CameraPadding: {},
    _reset: () => {
      shapes.clear();
      mounted.clear();
      lastCamera = null;
      mock._lastCamera = null;
    },
  };

  return mock;
}

export const mockMapLibre = createMockMapLibre();

// ============================================================================
// 4. LINKING & SHARE MOCK
// ============================================================================
export interface MockLinkingType {
  openedUrls: string[];
  canOpenUrls: Record<string, boolean>;
  openURL: (url: string) => Promise<boolean>;
  canOpenURL: (url: string) => Promise<boolean>;
  getInitialURL: () => Promise<string | null>;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  _reset: () => void;
}

export function createMockLinking(): MockLinkingType {
  const opened: string[] = [];
  const canOpenMap: Record<string, boolean> = {};

  return {
    openedUrls: opened,
    canOpenUrls: canOpenMap,
    openURL: jest.fn(async (url: string) => {
      opened.push(url);
      return true;
    }),
    canOpenURL: jest.fn(async (url: string) => {
      return canOpenMap[url] !== false;
    }),
    getInitialURL: jest.fn(async () => null),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    _reset: () => {
      opened.length = 0;
      Object.keys(canOpenMap).forEach((k) => delete canOpenMap[k]);
    },
  };
}

export const mockLinking = createMockLinking();

export interface MockShareType {
  sharedContents: any[];
  share: (content: any, options?: any) => Promise<{ action: string }>;
  _reset: () => void;
}

export function createMockShare(): MockShareType {
  const contents: any[] = [];
  return {
    sharedContents: contents,
    share: jest.fn(async (content: any) => {
      contents.push(content);
      return { action: 'sharedAction' };
    }),
    _reset: () => {
      contents.length = 0;
    },
  };
}

export const mockShare = createMockShare();

// ============================================================================
// 5. APP STATE MOCK
// ============================================================================
export interface MockAppStateType {
  currentState: 'active' | 'background' | 'inactive';
  _listeners: Set<(state: string) => void>;
  addEventListener: (type: string, handler: (state: string) => void) => { remove: () => void };
  setState: (newState: 'active' | 'background' | 'inactive') => void;
  _reset: () => void;
}

export function createMockAppState(): MockAppStateType {
  const listeners = new Set<(state: string) => void>();
  let state: 'active' | 'background' | 'inactive' = 'active';

  return {
    get currentState() {
      return state;
    },
    _listeners: listeners,
    addEventListener: jest.fn((type: string, handler: (state: string) => void) => {
      if (type === 'change') {
        listeners.add(handler);
      }
      return {
        remove: () => listeners.delete(handler),
      };
    }),
    setState: (newState) => {
      state = newState;
      listeners.forEach((h) => h(newState));
    },
    _reset: () => {
      state = 'active';
      listeners.clear();
    },
  };
}

export const mockAppState = createMockAppState();

// ============================================================================
// 6. SUPABASE IN-MEMORY STATEFUL MOCK
// ============================================================================
export interface MockSupabaseType {
  _tables: Map<string, any[]>;
  _seedTable: (tableName: string, rows: any[]) => void;
  _getTable: (tableName: string) => any[];
  _clearTable: (tableName: string) => void;
  _reset: () => void;
  auth: {
    _currentUser: any;
    getUser: jest.Mock;
    getSession: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
    signUp: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
  from: (table: string) => any;
  rpc: jest.Mock;
}

export function createMockSupabase(): MockSupabaseType {
  const tables = new Map<string, any[]>();

  function seedDefaults() {
    tables.set('locations', [
      {
        id: 'loc-1',
        name: 'Camping Sierra de Guadarrama',
        latitude: 40.7512,
        longitude: -4.0125,
        type: 'CAMPING',
        max_vehicle_height: 3.5,
        max_vehicle_weight: 4.5,
        price: 25,
        is_partner: true,
        has_electricity: true,
        has_water: true,
      },
      {
        id: 'loc-2',
        name: 'Área Camper Cabo de Gata',
        latitude: 36.7824,
        longitude: -2.2415,
        type: 'AREA_AC',
        max_vehicle_height: 4.0,
        max_vehicle_weight: 5.0,
        price: 15,
        is_partner: true,
        has_electricity: true,
        has_water: true,
      },
    ]);
    tables.set('b2b_reservations', []);
    tables.set('user_profiles', []);
  }

  seedDefaults();

  let currentUser: any = {
    id: 'test-camper-user-1',
    email: 'camper@example.com',
    user_metadata: { display_name: 'Test Camper' },
  };

  const client: MockSupabaseType = {
    _tables: tables,
    _seedTable: (name, rows) => {
      tables.set(name, [...rows]);
    },
    _getTable: (name) => {
      return tables.get(name) || [];
    },
    _clearTable: (name) => {
      tables.set(name, []);
    },
    _reset: () => {
      tables.clear();
      seedDefaults();
      currentUser = {
        id: 'test-camper-user-1',
        email: 'camper@example.com',
        user_metadata: { display_name: 'Test Camper' },
      };
    },
    auth: {
      _currentUser: currentUser,
      getUser: jest.fn(async () => ({
        data: { user: currentUser },
        error: null,
      })),
      getSession: jest.fn(async () => ({
        data: { session: currentUser ? { user: currentUser, access_token: 'mock-jwt-token' } : null },
        error: null,
      })),
      signInWithPassword: jest.fn(async ({ email }) => {
        currentUser = { id: 'auth-user', email, user_metadata: { display_name: 'Auth User' } };
        return { data: { user: currentUser, session: { access_token: 'token' } }, error: null };
      }),
      signOut: jest.fn(async () => {
        currentUser = null;
        return { error: null };
      }),
      signUp: jest.fn(async ({ email }) => {
        currentUser = { id: 'new-user', email, user_metadata: {} };
        return { data: { user: currentUser, session: null }, error: null };
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    rpc: jest.fn(async (_fn, _params) => ({ data: { ok: true }, error: null })),
    from: (tableName: string) => {
      let rows = [...(tables.get(tableName) || [])];
      let selectedCols: string[] | null = null;
      let limitCount: number | null = null;
      let isSingle = false;
      let isMaybeSingle = false;

      const builder: any = {
        select: jest.fn((cols = '*') => {
          if (cols !== '*') {
            selectedCols = cols.split(',').map((c: string) => c.trim());
          }
          return builder;
        }),
        eq: jest.fn((column: string, val: any) => {
          rows = rows.filter((r) => r[column] === val);
          return builder;
        }),
        neq: jest.fn((column: string, val: any) => {
          rows = rows.filter((r) => r[column] !== val);
          return builder;
        }),
        gt: jest.fn((column: string, val: any) => {
          rows = rows.filter((r) => r[column] > val);
          return builder;
        }),
        gte: jest.fn((column: string, val: any) => {
          rows = rows.filter((r) => r[column] >= val);
          return builder;
        }),
        lt: jest.fn((column: string, val: any) => {
          rows = rows.filter((r) => r[column] < val);
          return builder;
        }),
        lte: jest.fn((column: string, val: any) => {
          rows = rows.filter((r) => r[column] <= val);
          return builder;
        }),
        in: jest.fn((column: string, values: any[]) => {
          rows = rows.filter((r) => values.includes(r[column]));
          return builder;
        }),
        order: jest.fn((column: string, { ascending = true }: any = {}) => {
          rows.sort((a, b) => {
            if (a[column] < b[column]) return ascending ? -1 : 1;
            if (a[column] > b[column]) return ascending ? 1 : -1;
            return 0;
          });
          return builder;
        }),
        limit: jest.fn((n: number) => {
          limitCount = n;
          return builder;
        }),
        insert: jest.fn(async (newRows: any | any[]) => {
          const toAdd = Array.isArray(newRows) ? newRows : [newRows];
          const currentTable = tables.get(tableName) || [];
          const stamped = toAdd.map((r, i) => ({
            id: r.id || `gen-id-${Date.now()}-${i}`,
            created_at: new Date().toISOString(),
            ...r,
          }));
          currentTable.push(...stamped);
          tables.set(tableName, currentTable);
          return { data: stamped, error: null };
        }),
        upsert: jest.fn(async (upsertRows: any | any[], _opts?: any) => {
          const toUpsert = Array.isArray(upsertRows) ? upsertRows : [upsertRows];
          const currentTable = tables.get(tableName) || [];
          for (const item of toUpsert) {
            const idx = currentTable.findIndex((r) => r.id && r.id === item.id);
            if (idx >= 0) {
              currentTable[idx] = { ...currentTable[idx], ...item };
            } else {
              currentTable.push({ id: item.id || `gen-id-${Date.now()}`, ...item });
            }
          }
          tables.set(tableName, currentTable);
          return { data: toUpsert, error: null };
        }),
        update: jest.fn(async (updates: any) => {
          const currentTable = tables.get(tableName) || [];
          // Updates rows currently filtered
          const ids = new Set(rows.map((r) => r.id));
          for (let i = 0; i < currentTable.length; i++) {
            if (ids.has(currentTable[i].id)) {
              currentTable[i] = { ...currentTable[i], ...updates };
            }
          }
          return { data: updates, error: null };
        }),
        delete: jest.fn(async () => {
          const currentTable = tables.get(tableName) || [];
          const ids = new Set(rows.map((r) => r.id));
          const kept = currentTable.filter((r) => !ids.has(r.id));
          tables.set(tableName, kept);
          return { data: null, error: null };
        }),
        single: jest.fn(() => {
          isSingle = true;
          return builder;
        }),
        maybeSingle: jest.fn(() => {
          isMaybeSingle = true;
          return builder;
        }),
        then: (resolve: any, reject?: any) => {
          let resultRows = [...rows];
          if (limitCount !== null) {
            resultRows = resultRows.slice(0, limitCount);
          }
          if (selectedCols) {
            resultRows = resultRows.map((r) => {
              const res: any = {};
              for (const col of selectedCols!) {
                res[col] = r[col];
              }
              return res;
            });
          }

          if (isSingle) {
            if (resultRows.length === 0) {
              return Promise.resolve({ data: null, error: new Error('Row not found') }).then(resolve, reject);
            }
            return Promise.resolve({ data: resultRows[0], error: null }).then(resolve, reject);
          }

          if (isMaybeSingle) {
            return Promise.resolve({ data: resultRows[0] || null, error: null }).then(resolve, reject);
          }

          return Promise.resolve({ data: resultRows, error: null }).then(resolve, reject);
        },
      };

      return builder;
    },
  };

  return client;
}

export const mockSupabase = createMockSupabase();

// ============================================================================
// 7. BACKGROUND TIMER MOCK
// ============================================================================
export const mockBackgroundTimer = {
  runBackgroundTimer: jest.fn((callback: () => void, _delay: number) => {
    callback();
  }),
  stopBackgroundTimer: jest.fn(),
  setInterval: jest.fn((fn, ms) => setInterval(fn, ms)),
  clearInterval: jest.fn((id) => clearInterval(id)),
  setTimeout: jest.fn((fn, ms) => setTimeout(fn, ms)),
  clearTimeout: jest.fn((id) => clearTimeout(id)),
};

// ============================================================================
// 8. GLOBAL RESET HELPER
// ============================================================================
export function resetAllTestMocks(): void {
  mockAsyncStorage._reset();
  mockGeolocation._reset();
  mockMapLibre._reset();
  mockLinking._reset();
  mockShare._reset();
  mockAppState._reset();
  mockSupabase._reset();
  jest.clearAllMocks();
}
