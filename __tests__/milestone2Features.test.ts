import { VehiclePersistenceService, MASTER_PERSISTENCE_KEY, LEGACY_KEYS } from '../src/services/VehiclePersistenceService';
import {
  STATIONARY_SPEED_THRESHOLD_KMH as REWARDS_SPEED_THRESHOLD,
  isVehicleMoving,
} from '../src/services/CamperRewardsService';
import {
  RewardedAdSimulationEngine,
  STATIONARY_SPEED_THRESHOLD_KMH as ENGINE_SPEED_THRESHOLD,
} from '../src/services/RewardedAdSimulationEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Milestone 2 Features Verification', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('Feature 7: Total Persistence (VehiclePersistenceService)', () => {
    it('should save and load master state with version 2', async () => {
      const customConfig = {
        type: 'camper',
        height: '3.10',
        width: '2.30',
        length: '7.20',
        weight: '3850',
        axles: '2',
        fuelType: 'diesel',
        name: 'Hymer B-Klasse',
      };
      const customPrefs = {
        radarAlertDistance: 1200,
        avoidTolls: true,
        avoidHighways: false,
        drivingStyle: 'economic',
        maxSlopePreference: 'low',
        tachographWarningsEnabled: false,
      };

      await VehiclePersistenceService.saveMasterState({
        vehicleConfig: customConfig,
        drivingPreferences: customPrefs,
        onboardingCompleted: true,
        profileCompleted: true,
      });

      const loaded = await VehiclePersistenceService.loadMasterState();
      expect(loaded.version).toBe(2);
      expect(loaded.vehicleConfig.height).toBe('3.10');
      expect(loaded.vehicleConfig.name).toBe('Hymer B-Klasse');
      expect(loaded.drivingPreferences.avoidTolls).toBe(true);
      expect(loaded.drivingPreferences.drivingStyle).toBe('economic');
      expect(loaded.onboardingCompleted).toBe(true);
      expect(loaded.profileCompleted).toBe(true);

      // Verify sync with legacy keys
      const legacyConfigRaw = await AsyncStorage.getItem(LEGACY_KEYS.VEHICLE_CONFIG);
      expect(legacyConfigRaw).not.toBeNull();
      const legacyConfig = JSON.parse(legacyConfigRaw!);
      expect(legacyConfig.height).toBe('3.10');

      const legacyPrefsRaw = await AsyncStorage.getItem(LEGACY_KEYS.DRIVING_PREFERENCES);
      expect(legacyPrefsRaw).not.toBeNull();
      const legacyPrefs = JSON.parse(legacyPrefsRaw!);
      expect(legacyPrefs.avoidTolls).toBe(true);

      const legacyOnboarding = await AsyncStorage.getItem(LEGACY_KEYS.ONBOARDING_COMPLETED);
      expect(legacyOnboarding).toBe('true');
    });

    it('should hydrate from legacy keys if master state does not exist yet', async () => {
      await AsyncStorage.setItem(
        LEGACY_KEYS.VEHICLE_CONFIG,
        JSON.stringify({ height: '2.95', length: '6.40', type: 'campervan' })
      );
      await AsyncStorage.setItem(
        LEGACY_KEYS.DRIVING_PREFERENCES,
        JSON.stringify({ avoidTolls: true, maxSlopePreference: 'high' })
      );
      await AsyncStorage.setItem(LEGACY_KEYS.ONBOARDING_COMPLETED, 'true');

      const state = await VehiclePersistenceService.loadMasterState();
      expect(state.version).toBe(2);
      expect(state.vehicleConfig.height).toBe('2.95');
      expect(state.drivingPreferences.avoidTolls).toBe(true);
      expect(state.drivingPreferences.maxSlopePreference).toBe('high');
      expect(state.onboardingCompleted).toBe(true);

      // Verifies it wrote to master persistence key
      const masterRaw = await AsyncStorage.getItem(MASTER_PERSISTENCE_KEY);
      expect(masterRaw).not.toBeNull();
    });
  });

  describe('Feature 16: Status Camper Speed Lockout & Standstill False Positives', () => {
    it('should have STATIONARY_SPEED_THRESHOLD_KMH set to 3.5 km/h across services', () => {
      expect(REWARDS_SPEED_THRESHOLD).toBe(3.5);
      expect(ENGINE_SPEED_THRESHOLD).toBe(3.5);
    });

    it('should correctly evaluate isVehicleMoving with 3.5 km/h threshold', () => {
      expect(isVehicleMoving(0.0)).toBe(false);
      expect(isVehicleMoving(0.8)).toBe(false); // GPS drift in parked camper
      expect(isVehicleMoving(2.4)).toBe(false); // GPS jitter
      expect(isVehicleMoving(3.5)).toBe(false); // At boundary
      expect(isVehicleMoving(3.6)).toBe(true);  // Real driving movement
      expect(isVehicleMoving(25.0)).toBe(true);
    });

    it('should require 2 consecutive speed readings above threshold before aborting ad', () => {
      const engine = new RewardedAdSimulationEngine();
      const onAborted = jest.fn();
      const onCountdown = jest.fn();

      // Vehicle stationary (0 km/h)
      engine.updateSpeed(0.0);
      const started = engine.startAdSimulation({
        onCountdown,
        onAborted,
      });
      expect(started).toBe(true);
      expect(engine.isSimulating()).toBe(true);

      // Transient GPS spike (reading 1: 4.2 km/h > 3.5)
      engine.updateSpeed(4.2);
      // Must NOT abort on 1 single spike
      expect(engine.isSimulating()).toBe(true);
      expect(onAborted).not.toHaveBeenCalled();

      // Second consecutive reading above threshold confirms driving -> aborts
      engine.updateSpeed(4.5);
      expect(engine.isSimulating()).toBe(false);
      expect(onAborted).toHaveBeenCalledTimes(1);
    });

    it('should reset consecutive violation count if speed drops back below threshold', () => {
      const engine = new RewardedAdSimulationEngine();
      const onAborted = jest.fn();

      engine.updateSpeed(0.0);
      engine.startAdSimulation({ onAborted });

      // First spike
      engine.updateSpeed(3.8);
      expect(engine.isSimulating()).toBe(true);

      // Speed drops back down (jitter settled)
      engine.updateSpeed(0.0);
      expect(engine.isSimulating()).toBe(true);

      // Another isolated spike (1st reading again)
      engine.updateSpeed(4.0);
      expect(engine.isSimulating()).toBe(true);
      expect(onAborted).not.toHaveBeenCalled();

      engine.cancelAdSimulation('End test');
    });
  });
});
