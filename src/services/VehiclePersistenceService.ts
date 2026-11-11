import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';

export const MASTER_PERSISTENCE_KEY = '@campersites_master_persistence_v2';

export const LEGACY_KEYS = {
  VEHICLE_CONFIG: '@camper_vehicle_config',
  VEHICLE_SETUP: '@camper_exact_vehicle_setup',
  VEHICLE_DIMENSIONS: '@camper_vehicle_dimensions',
  DRIVING_PREFERENCES: '@camper_driving_preferences',
  ONBOARDING_COMPLETED: '@camper_onboarding_completed',
  PROFILE_COMPLETED: '@camper_profile_completed',
} as const;

export interface MasterVehiclePersistence {
  version: 2;
  vehicleConfig: any;
  vehicleSetup?: any;
  dimensions?: any;
  drivingPreferences: any;
  onboardingCompleted: boolean;
  profileCompleted: boolean;
  lastUpdatedAt: string;
}

const DEFAULT_MASTER_STATE: MasterVehiclePersistence = {
  version: 2,
  vehicleConfig: {
    type: 'camper',
    height: '2.8',
    width: '2.2',
    length: '6.0',
    weight: '3500',
    axles: '2',
    fuelType: 'diesel',
    rangeKm: '650',
    environmentalBadge: 'C',
    name: 'Mi Autocaravana / Camper',
  },
  vehicleSetup: null,
  dimensions: null,
  drivingPreferences: {
    radarAlertDistance: 1000,
    controlAlertDistance: 5000,
    clearanceAlertDistance: 1000,
    audioMode: 'multimedia',
    hapticFeedback: true,
    tachographWarningsEnabled: false,
    avoidTolls: false,
    avoidHighways: false,
    drivingStyle: 'balanced',
    maxSlopePreference: 'medium',
  },
  onboardingCompleted: false,
  profileCompleted: false,
  lastUpdatedAt: new Date().toISOString(),
};

export class VehiclePersistenceService {
  /**
   * Carga el estado unificado maestro de persistencia del vehículo.
   * Si no existe la clave v2, recupera e hidrata desde las claves de almacenamiento legadas.
   */
  public static async loadMasterState(): Promise<MasterVehiclePersistence> {
    try {
      const rawMaster = await AsyncStorage.getItem(MASTER_PERSISTENCE_KEY);
      if (rawMaster) {
        const parsed = JSON.parse(rawMaster) as MasterVehiclePersistence;
        if (parsed && parsed.version === 2) {
          return {
            ...DEFAULT_MASTER_STATE,
            ...parsed,
            vehicleConfig: { ...DEFAULT_MASTER_STATE.vehicleConfig, ...(parsed.vehicleConfig || {}) },
            drivingPreferences: { ...DEFAULT_MASTER_STATE.drivingPreferences, ...(parsed.drivingPreferences || {}) },
          };
        }
      }

      // Migración / Recuperación desde almacenamiento legado
      const [rawConfig, rawSetup, rawDims, rawPrefs, rawOnboarded, rawProfileDone] = await Promise.all([
        AsyncStorage.getItem(LEGACY_KEYS.VEHICLE_CONFIG),
        AsyncStorage.getItem(LEGACY_KEYS.VEHICLE_SETUP),
        AsyncStorage.getItem(LEGACY_KEYS.VEHICLE_DIMENSIONS),
        AsyncStorage.getItem(LEGACY_KEYS.DRIVING_PREFERENCES),
        AsyncStorage.getItem(LEGACY_KEYS.ONBOARDING_COMPLETED),
        AsyncStorage.getItem(LEGACY_KEYS.PROFILE_COMPLETED),
      ]);

      const vehicleConfig = rawConfig ? JSON.parse(rawConfig) : DEFAULT_MASTER_STATE.vehicleConfig;
      const vehicleSetup = rawSetup ? JSON.parse(rawSetup) : DEFAULT_MASTER_STATE.vehicleSetup;
      const dimensions = rawDims ? JSON.parse(rawDims) : DEFAULT_MASTER_STATE.dimensions;
      const drivingPreferences = rawPrefs
        ? { ...DEFAULT_MASTER_STATE.drivingPreferences, ...JSON.parse(rawPrefs) }
        : DEFAULT_MASTER_STATE.drivingPreferences;
      const onboardingCompleted = rawOnboarded === 'true';
      const profileCompleted = rawProfileDone === 'true';

      const migratedState: MasterVehiclePersistence = {
        version: 2,
        vehicleConfig,
        vehicleSetup,
        dimensions,
        drivingPreferences,
        onboardingCompleted,
        profileCompleted,
        lastUpdatedAt: new Date().toISOString(),
      };

      // Guardar el estado unificado inicial migrado
      await AsyncStorage.setItem(MASTER_PERSISTENCE_KEY, JSON.stringify(migratedState));
      return migratedState;
    } catch (error) {
      Logger.error('VehiclePersistenceService', 'Error loading master state', error);
      return DEFAULT_MASTER_STATE;
    }
  }

  /**
   * Guarda de forma atómica en el estado maestro v2 y sincroniza retrocompatiblemente con claves legadas.
   */
  public static async saveMasterState(partial: Partial<MasterVehiclePersistence>): Promise<void> {
    try {
      const currentState = await this.loadMasterState();

      const updatedState: MasterVehiclePersistence = {
        ...currentState,
        ...partial,
        version: 2,
        vehicleConfig: partial.vehicleConfig !== undefined
          ? (typeof partial.vehicleConfig === 'object' ? { ...currentState.vehicleConfig, ...partial.vehicleConfig } : partial.vehicleConfig)
          : currentState.vehicleConfig,
        drivingPreferences: partial.drivingPreferences !== undefined
          ? { ...currentState.drivingPreferences, ...partial.drivingPreferences }
          : currentState.drivingPreferences,
        lastUpdatedAt: new Date().toISOString(),
      };

      // 1. Guardar en clave unificada v2
      await AsyncStorage.setItem(MASTER_PERSISTENCE_KEY, JSON.stringify(updatedState));

      // 2. Sincronización transparente con almacenamiento legado para compatibilidad con módulos no migrados
      const syncTasks: Promise<void>[] = [];

      if (updatedState.vehicleConfig) {
        syncTasks.push(
          AsyncStorage.setItem(LEGACY_KEYS.VEHICLE_CONFIG, JSON.stringify(updatedState.vehicleConfig))
        );
      }
      if (updatedState.vehicleSetup !== undefined) {
        syncTasks.push(
          AsyncStorage.setItem(LEGACY_KEYS.VEHICLE_SETUP, JSON.stringify(updatedState.vehicleSetup))
        );
      }
      if (updatedState.dimensions !== undefined) {
        syncTasks.push(
          AsyncStorage.setItem(LEGACY_KEYS.VEHICLE_DIMENSIONS, JSON.stringify(updatedState.dimensions))
        );
      }
      if (updatedState.drivingPreferences) {
        syncTasks.push(
          AsyncStorage.setItem(LEGACY_KEYS.DRIVING_PREFERENCES, JSON.stringify(updatedState.drivingPreferences))
        );
      }
      if (updatedState.onboardingCompleted !== undefined) {
        syncTasks.push(
          AsyncStorage.setItem(LEGACY_KEYS.ONBOARDING_COMPLETED, updatedState.onboardingCompleted ? 'true' : 'false')
        );
      }
      if (updatedState.profileCompleted !== undefined) {
        syncTasks.push(
          AsyncStorage.setItem(LEGACY_KEYS.PROFILE_COMPLETED, updatedState.profileCompleted ? 'true' : 'false')
        );
      }

      await Promise.all(syncTasks);
      Logger.info('VehiclePersistenceService', 'Master state and legacy keys successfully persisted');
    } catch (error) {
      Logger.error('VehiclePersistenceService', 'Error saving master state', error);
      throw error;
    }
  }
}

export default VehiclePersistenceService;
