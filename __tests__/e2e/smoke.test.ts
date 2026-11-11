/**
 * CamperSites Pro — E2E Smoke Test
 * Validates Jest test runner, in-memory mocks, and native bridge abstractions
 */

import React from 'react';
import { Linking, Share, Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import MapLibreGL from '@maplibre/maplibre-react-native';
import BackgroundTimer from 'react-native-background-timer';
import {
  mockAsyncStorage,
  mockGeolocation,
  mockMapLibre,
  mockLinking,
  mockShare,
  mockAppState,
  mockSupabase,
  resetAllTestMocks,
} from './helpers/testMocks';

describe('E2E Infrastructure & Stateful Mock Harness Smoke Test', () => {
  beforeEach(() => {
    resetAllTestMocks();
  });

  // ==========================================================================
  // 1. AsyncStorage Stateful Verification
  // ==========================================================================
  describe('AsyncStorage In-Memory Storage Engine', () => {
    it('should store, retrieve, and delete single key-values', async () => {
      await AsyncStorage.setItem('test_camper_key', 'val_123');
      const retrieved = await AsyncStorage.getItem('test_camper_key');
      expect(retrieved).toBe('val_123');

      await AsyncStorage.removeItem('test_camper_key');
      const afterDelete = await AsyncStorage.getItem('test_camper_key');
      expect(afterDelete).toBeNull();
    });

    it('should handle multiGet, multiSet, and getAllKeys', async () => {
      await AsyncStorage.multiSet([
        ['vehicle_height', '3.15'],
        ['vehicle_weight', '3500'],
      ]);

      const keys = await AsyncStorage.getAllKeys();
      expect(keys).toContain('vehicle_height');
      expect(keys).toContain('vehicle_weight');

      const values = await AsyncStorage.multiGet(['vehicle_height', 'vehicle_weight']);
      expect(values).toEqual([
        ['vehicle_height', '3.15'],
        ['vehicle_weight', '3500'],
      ]);

      await AsyncStorage.clear();
      const keysAfterClear = await AsyncStorage.getAllKeys();
      expect(keysAfterClear).toHaveLength(0);
    });

    it('should support seeding and dumping state', () => {
      mockAsyncStorage._seed({
        '@campersites_master_persistence_v2': { brand: 'Pilote', model: 'Pacific 650' },
      });

      const dump = mockAsyncStorage._dump();
      expect(dump['@campersites_master_persistence_v2']).toBeDefined();
      const parsed = JSON.parse(dump['@campersites_master_persistence_v2']);
      expect(parsed.brand).toBe('Pilote');
      expect(parsed.model).toBe('Pacific 650');
    });
  });

  // ==========================================================================
  // 2. Geolocation Watch & Speed Emulation
  // ==========================================================================
  describe('Geolocation Watchers & Speed Simulator', () => {
    it('should return initial position via getCurrentPosition', (done) => {
      Geolocation.getCurrentPosition((pos) => {
        expect(pos.coords.latitude).toBeCloseTo(40.4168);
        expect(pos.coords.longitude).toBeCloseTo(-3.7038);
        done();
      });
    });

    it('should register watchPosition and receive emitted updates', (done) => {
      let callCount = 0;
      const watchId = Geolocation.watchPosition((pos) => {
        callCount++;
        if (callCount === 1) {
          // Initial position delivered immediately
          expect(pos.coords.speed).toBe(0);
          // Simulate vehicle accelerating to 45 km/h
          mockGeolocation.emitSpeed(45, 40.418, -3.705, 180);
        } else if (callCount === 2) {
          // Speed in m/s (45 km/h / 3.6 = 12.5 m/s)
          expect(pos.coords.speed).toBeCloseTo(12.5, 1);
          expect(pos.coords.latitude).toBeCloseTo(40.418);
          expect(pos.coords.heading).toBe(180);
          Geolocation.clearWatch(watchId);
          done();
        }
      });
    });
  });

  // ==========================================================================
  // 3. MapLibre GL Components & Imperative Camera Controls
  // ==========================================================================
  describe('MapLibre GL MapView and Camera Harness', () => {
    it('should capture ShapeSource GeoJSON shapes', () => {
      const sampleGeoJSON = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [-3.7038, 40.4168],
                [-3.705, 40.418],
              ],
            },
            properties: { routeId: 'primary-casing' },
          },
        ],
      };

      // Instantiate ShapeSource
      mockMapLibre.ShapeSource({
        id: 'route-source',
        shape: sampleGeoJSON,
      });

      expect(mockMapLibre._shapes.has('route-source')).toBe(true);
      expect(mockMapLibre._shapes.get('route-source')).toEqual(sampleGeoJSON);
    });

    it('should provide camera movement methods via ref', async () => {
      const cameraRef: any = { current: null };
      const element = React.createElement(mockMapLibre.Camera, {
        ref: (inst: any) => {
          cameraRef.current = inst;
        },
      });

      // Execute ref callbacks
      if (typeof element.ref === 'function') {
        const dummyInstance = {
          setCamera: jest.fn((cam) => {
            mockMapLibre._lastCamera = cam;
          }),
          moveTo: jest.fn((coord, dur) => {
            mockMapLibre._lastCamera = { centerCoordinate: coord, duration: dur };
          }),
        };
        element.ref(dummyInstance);
      }

      cameraRef.current.setCamera({
        centerCoordinate: [-3.7038, 40.4168],
        zoomLevel: 15,
        pitch: 60,
      });

      expect(mockMapLibre._lastCamera).toEqual({
        centerCoordinate: [-3.7038, 40.4168],
        zoomLevel: 15,
        pitch: 60,
      });
    });
  });

  // ==========================================================================
  // 4. Linking & Share Stateful Dispatch
  // ==========================================================================
  describe('External Navigation Deep Linking & Share Handler', () => {
    it('should record openURL invocations for Waze and Google Maps', async () => {
      const gmapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=40.7512,-4.0125';
      const wazeUrl = 'https://waze.com/ul?ll=40.7512,-4.0125&navigate=yes';

      await Linking.openURL(gmapsUrl);
      await Linking.openURL(wazeUrl);

      expect(mockLinking.openedUrls).toContain(gmapsUrl);
      expect(mockLinking.openedUrls).toContain(wazeUrl);
      expect(mockLinking.openedUrls).toHaveLength(2);
    });

    it('should track shared content', async () => {
      const sharePayload = {
        title: 'Camper Location',
        message: 'Área Camper Cabo de Gata: https://campersites.pro/spot/loc-2',
      };

      const result = await Share.share(sharePayload);
      expect(result.action).toBe('sharedAction');
      expect(mockShare.sharedContents).toContainEqual(sharePayload);
    });
  });

  // ==========================================================================
  // 5. Supabase In-Memory Relational Engine
  // ==========================================================================
  describe('Supabase Client In-Memory Operations', () => {
    it('should query locations table with filter and ordering', async () => {
      const response = await mockSupabase
        .from('locations')
        .select('*')
        .eq('is_partner', true)
        .order('price', { ascending: true });

      expect(response.error).toBeNull();
      expect(response.data).toHaveLength(2);
      expect(response.data[0].name).toBe('Área Camper Cabo de Gata'); // price 15
      expect(response.data[1].name).toBe('Camping Sierra de Guadarrama'); // price 25
    });

    it('should insert and retrieve reservations', async () => {
      const newReservation = {
        id: 'res-999',
        campsite_id: 'loc-1',
        user_id: 'test-camper-user-1',
        check_in: '2026-11-15',
        check_out: '2026-11-18',
        total_price: 75,
      };

      const insertRes = await mockSupabase
        .from('b2b_reservations')
        .insert(newReservation);

      expect(insertRes.error).toBeNull();

      const queryRes = await mockSupabase
        .from('b2b_reservations')
        .select('*')
        .eq('id', 'res-999')
        .single();

      expect(queryRes.error).toBeNull();
      expect(queryRes.data.campsite_id).toBe('loc-1');
      expect(queryRes.data.total_price).toBe(75);
    });

    it('should verify authenticated user context', async () => {
      const userRes = await mockSupabase.auth.getUser();
      expect(userRes.error).toBeNull();
      expect(userRes.data.user.email).toBe('camper@example.com');
    });
  });

  // ==========================================================================
  // 6. BackgroundTimer, Platform & AppState
  // ==========================================================================
  describe('Platform & Lifecycle Integration', () => {
    it('should support BackgroundTimer execution', () => {
      const cb = jest.fn();
      BackgroundTimer.runBackgroundTimer(cb, 1000);
      expect(cb).toHaveBeenCalled();
    });

    it('should report platform and app state', () => {
      expect(Platform.OS).toBeDefined();
      expect(AppState.currentState).toBe('active');

      const stateChangeSpy = jest.fn();
      const sub = AppState.addEventListener('change', stateChangeSpy);

      mockAppState.setState('background');
      expect(stateChangeSpy).toHaveBeenCalledWith('background');
      expect(AppState.currentState).toBe('background');

      sub.remove();
    });
  });
});
