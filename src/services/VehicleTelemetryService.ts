/**
 * VehicleTelemetryService.ts - Telemetría, Presión de Neumáticos (TPMS) y Mantenimiento Predictivo
 * CamperSites Pro - Asistente de Salud del Vehículo & Android Auto
 *
 * Monitoriza:
 * 1. Presión y temperatura de los 4 neumáticos con avisos de desllante/sobrepresión.
 * 2. Intervalos de cambio de Aceite motor, Filtro de Gasoil, Filtro de Aire y Batería.
 * 3. Telemetría de consumo (L/100km), autonomía y coste por km.
 * 4. Integración y proyección hacia pantallas de salpicadero Android Auto.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { AudioAlertService } from './AudioAlertService';

const TELEMETRY_STORAGE_KEY = '@campersites_vehicle_telemetry';

export interface TireData {
  pressureBar: number;
  temperatureC: number;
  targetPressureBar: number;
  status: 'optimal' | 'warning' | 'danger';
}

export interface MaintenanceItem {
  id: string;
  name: string;
  icon: string;
  intervalKm: number;
  lastChangeKm: number;
  currentKm: number;
  recommendedLifePercent: number; // 0 - 100%
  kmRemaining: number;
  isDue: boolean;
  notes: string;
}

export interface VehicleTelemetryData {
  totalKm: number;
  vehicleType: 'camper_gv' | 'autocaravana' | 'camper_compact' | 'furgon';
  tires: {
    frontLeft: TireData;
    frontRight: TireData;
    rearLeft: TireData;
    rearRight: TireData;
  };
  batteryMotorVolts: number;
  batteryAuxCamperVolts: number;
  isAlternatorCharging: boolean;
  avgConsumptionL100: number;
  fuelTankPercent: number;
  fuelType: 'diesel' | 'glp' | 'gasolina';
  maintenance: {
    oilAndFilter: MaintenanceItem;
    fuelFilter: MaintenanceItem;
    airFilter: MaintenanceItem;
    brakeFluid: MaintenanceItem;
  };
  lastUpdate: string;
}

const DEFAULT_TELEMETRY: VehicleTelemetryData = {
  totalKm: 142500,
  vehicleType: 'camper_gv',
  tires: {
    frontLeft: { pressureBar: 4.8, temperatureC: 24, targetPressureBar: 4.8, status: 'optimal' },
    frontRight: { pressureBar: 4.8, temperatureC: 25, targetPressureBar: 4.8, status: 'optimal' },
    rearLeft: { pressureBar: 5.2, temperatureC: 26, targetPressureBar: 5.2, status: 'optimal' },
    rearRight: { pressureBar: 5.1, temperatureC: 27, targetPressureBar: 5.2, status: 'optimal' },
  },
  batteryMotorVolts: 12.6,
  batteryAuxCamperVolts: 13.1,
  isAlternatorCharging: false,
  avgConsumptionL100: 9.4,
  fuelTankPercent: 68,
  fuelType: 'diesel',
  maintenance: {
    oilAndFilter: {
      id: 'oil',
      name: 'Aceite Motor & Filtro',
      icon: 'oil',
      intervalKm: 20000,
      lastChangeKm: 135000,
      currentKm: 142500,
      recommendedLifePercent: 62,
      kmRemaining: 12500,
      isDue: false,
      notes: 'Aceite 5W-30 / 0W-30 Low SAPS',
    },
    fuelFilter: {
      id: 'fuel_filter',
      name: 'Filtro de Gasoil',
      icon: 'gas-cylinder',
      intervalKm: 40000,
      lastChangeKm: 120000,
      currentKm: 142500,
      recommendedLifePercent: 44,
      kmRemaining: 17500,
      isDue: false,
      notes: 'Vital para proteger inyectores diésel',
    },
    airFilter: {
      id: 'air_filter',
      name: 'Filtro de Aire Motor',
      icon: 'air-filter',
      intervalKm: 25000,
      lastChangeKm: 135000,
      currentKm: 142500,
      recommendedLifePercent: 70,
      kmRemaining: 17500,
      isDue: false,
      notes: 'Revisar si se circula por pistas de tierra',
    },
    brakeFluid: {
      id: 'brake_fluid',
      name: 'Líquido de Frenos',
      icon: 'car-brake-fluid-level',
      intervalKm: 60000,
      lastChangeKm: 110000,
      currentKm: 142500,
      recommendedLifePercent: 46,
      kmRemaining: 27500,
      isDue: false,
      notes: 'DOT 4 / DOT 5.1 cada 2 años',
    },
  },
  lastUpdate: new Date().toISOString(),
};

export class VehicleTelemetryService {
  private static telemetry: VehicleTelemetryData = DEFAULT_TELEMETRY;
  private static isInitialized = false;

  public static async getTelemetry(): Promise<VehicleTelemetryData> {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.telemetry;
  }

  public static async init(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(TELEMETRY_STORAGE_KEY);
      if (raw) {
        this.telemetry = { ...DEFAULT_TELEMETRY, ...JSON.parse(raw) };
      } else {
        this.telemetry = DEFAULT_TELEMETRY;
      }
      this.recalculateMaintenance();
      this.isInitialized = true;
    } catch {
      this.telemetry = DEFAULT_TELEMETRY;
      this.isInitialized = true;
    }
  }

  public static async updateOdometer(newKm: number): Promise<VehicleTelemetryData> {
    this.telemetry.totalKm = Math.max(this.telemetry.totalKm, newKm);
    this.recalculateMaintenance();
    await this.save();
    return this.telemetry;
  }

  /**
   * Registra la realización de un mantenimiento (resetea el contador del filtro/aceite)
   */
  public static async recordMaintenance(
    type: 'oilAndFilter' | 'fuelFilter' | 'airFilter' | 'brakeFluid',
    atKm?: number
  ): Promise<VehicleTelemetryData> {
    const km = atKm !== undefined ? atKm : this.telemetry.totalKm;
    if (this.telemetry.maintenance[type]) {
      this.telemetry.maintenance[type].lastChangeKm = km;
      this.telemetry.maintenance[type].currentKm = km;
    }
    this.recalculateMaintenance();
    await this.save();
    AudioAlertService.speak(`Mantenimiento de ${this.telemetry.maintenance[type].name} registrado a los ${km} kilómetros.`);
    return this.telemetry;
  }

  /**
   * Calibra la presión de los neumáticos al valor objetivo
   */
  public static async calibrateTires(
    frontTarget: number = 4.8,
    rearTarget: number = 5.2
  ): Promise<VehicleTelemetryData> {
    this.telemetry.tires.frontLeft.targetPressureBar = frontTarget;
    this.telemetry.tires.frontLeft.pressureBar = frontTarget;
    this.telemetry.tires.frontLeft.status = 'optimal';

    this.telemetry.tires.frontRight.targetPressureBar = frontTarget;
    this.telemetry.tires.frontRight.pressureBar = frontTarget;
    this.telemetry.tires.frontRight.status = 'optimal';

    this.telemetry.tires.rearLeft.targetPressureBar = rearTarget;
    this.telemetry.tires.rearLeft.pressureBar = rearTarget;
    this.telemetry.tires.rearLeft.status = 'optimal';

    this.telemetry.tires.rearRight.targetPressureBar = rearTarget;
    this.telemetry.tires.rearRight.pressureBar = rearTarget;
    this.telemetry.tires.rearRight.status = 'optimal';

    await this.save();
    AudioAlertService.speak('Sensores de presión de neumáticos calibrados.');
    return this.telemetry;
  }

  /**
   * Simula ligeras fluctuaciones de temperatura y presión en marcha
   */
  public static simulateRoadConditions(speedKmH: number): void {
    if (speedKmH > 20) {
      // Los neumáticos se calientan con la velocidad (+0.1 - +0.2 bar en carretera)
      const heatFactor = Math.min(6, (speedKmH / 100) * 4);
      this.telemetry.batteryMotorVolts = 14.2; // Alternador cargando
      this.telemetry.isAlternatorCharging = true;
      this.telemetry.tires.frontLeft.temperatureC = Math.round(24 + heatFactor);
      this.telemetry.tires.frontRight.temperatureC = Math.round(25 + heatFactor);
      this.telemetry.tires.rearLeft.temperatureC = Math.round(26 + heatFactor);
      this.telemetry.tires.rearRight.temperatureC = Math.round(27 + heatFactor);
    } else {
      this.telemetry.batteryMotorVolts = 12.6;
      this.telemetry.isAlternatorCharging = false;
    }
  }

  /**
   * Lanza la navegación proyectada hacia la pantalla del coche mediante Android Auto / Waze / Maps
   */
  public static async projectToAndroidAuto(destination: {
    latitude: number;
    longitude: number;
    name?: string;
  }): Promise<boolean> {
    const lat = destination.latitude;
    const lng = destination.longitude;
    const label = encodeURIComponent(destination.name || 'Destino Camper');

    // Intent prioritario para Android Auto / Google Navigation
    const geoUri = `google.navigation:q=${lat},${lng}&mode=d`;
    const fallbackUri = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;

    try {
      const supported = await Linking.canOpenURL(geoUri);
      if (supported) {
        await Linking.openURL(geoUri);
        return true;
      } else {
        await Linking.openURL(fallbackUri);
        return true;
      }
    } catch {
      try {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        return true;
      } catch {
        return false;
      }
    }
  }

  private static recalculateMaintenance(): void {
    const current = this.telemetry.totalKm;
    Object.keys(this.telemetry.maintenance).forEach((key) => {
      const item = (this.telemetry.maintenance as any)[key] as MaintenanceItem;
      const kmUsed = current - item.lastChangeKm;
      item.currentKm = current;
      item.kmRemaining = Math.max(0, item.intervalKm - kmUsed);
      const lifeRatio = Math.max(0, Math.min(1, (item.intervalKm - kmUsed) / item.intervalKm));
      item.recommendedLifePercent = Math.round(lifeRatio * 100);
      item.isDue = item.kmRemaining <= 1000 || item.recommendedLifePercent <= 5;
    });
  }

  private static async save(): Promise<void> {
    try {
      this.telemetry.lastUpdate = new Date().toISOString();
      await AsyncStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(this.telemetry));
    } catch {}
  }
}

export default VehicleTelemetryService;
