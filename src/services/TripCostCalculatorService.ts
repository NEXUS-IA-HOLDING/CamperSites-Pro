/**
 * TripCostCalculatorService.ts
 * Calculadora de Coste Estimado de Viaje y Presupuesto Inteligente para Campers
 * CamperSites Pro
 */

import { UserVehicleSetup, vehicleCatalogService } from './VehicleCatalogService';

export interface TripCostEstimate {
  distanceKm: number;
  durationMinutes: number;
  fuelType: 'diesel' | 'glp' | 'gasolina';
  avgConsumptionL100km: number;
  fuelLitersNeeded: number;
  pricePerLiterEur: number;
  fuelCostEur: number;
  accommodationCostEur: number;
  totalCostEur: number;
  repsolSavingsEur: number;
  costWithRepsolDiscountEur: number;
  vehicleLabel: string;
}

export class TripCostCalculatorService {
  private static readonly DEFAULT_DIESEL_PRICE = 1.48; // €/L medio en España/Portugal
  private static readonly DEFAULT_GLP_PRICE = 0.94; // €/L medio GLP
  private static readonly DEFAULT_GASOLINE_PRICE = 1.62; // €/L medio Gasolina 95
  private static readonly REPSOL_DISCOUNT_PER_LITER = 0.10; // 10 cts/L con código Waylet

  /**
   * Calcula el consumo medio estimado según aerodinámica y peso del vehículo si no está registrado
   */
  public static estimateConsumption(vehicle?: UserVehicleSetup | null): number {
    if (vehicle && vehicle.avgConsumptionL100km && vehicle.avgConsumptionL100km > 0) {
      return vehicle.avgConsumptionL100km;
    }

    // Cálculo dinámico por gálibo aerodinámico y MMA
    let base = 8.8; // Furgoneta estándar L2H2 ~140cv
    const height = vehicle?.height || 2.65;
    const weight = vehicle?.weight || 3200;

    if (height > 3.0) {
      base += 2.4; // Capuchina o Gran Integral >3m
    } else if (height > 2.8) {
      base += 1.4; // Perfilada / Integral alta
    } else if (height < 2.1) {
      base -= 1.3; // Minicamper / Techo elevable (VW California, Marco Polo)
    }

    if (weight > 3800) {
      base += 1.5; // >3.5t MMA carnet C1
    } else if (weight > 3300) {
      base += 0.6;
    } else if (weight < 2500) {
      base -= 0.8;
    }

    return Math.round(base * 10) / 10;
  }

  /**
   * Obtiene el precio por litro medio según el carburante
   */
  public static getPricePerLiter(fuelType: string): number {
    const clean = (fuelType || 'diesel').toLowerCase();
    if (clean.includes('glp') || clean.includes('autogas')) {
      return this.DEFAULT_GLP_PRICE;
    }
    if (clean.includes('gasolin') || clean.includes('benzin')) {
      return this.DEFAULT_GASOLINE_PRICE;
    }
    return this.DEFAULT_DIESEL_PRICE;
  }

  /**
   * Calcula el desglose financiero completo del trayecto
   */
  public static async calculateEstimate(params: {
    distanceMeters: number;
    durationSeconds?: number;
    destinationPricePerNight?: number | null;
    customVehicle?: UserVehicleSetup | null;
  }): Promise<TripCostEstimate> {
    const vehicle = params.customVehicle !== undefined
      ? params.customVehicle
      : await vehicleCatalogService.loadUserVehicleSetup();

    const distanceKm = Math.max(0.1, Math.round((params.distanceMeters / 1000) * 10) / 10);
    const durationMinutes = Math.round((params.durationSeconds || distanceKm * 65) / 60);

    const fuelTypeStr = (vehicle?.fuelType || 'diesel').toLowerCase();
    const fuelType: 'diesel' | 'glp' | 'gasolina' = fuelTypeStr.includes('glp')
      ? 'glp'
      : fuelTypeStr.includes('gasolin')
      ? 'gasolina'
      : 'diesel';

    const avgConsumptionL100km = this.estimateConsumption(vehicle);
    const pricePerLiterEur = this.getPricePerLiter(fuelType);

    const fuelLitersNeeded = Math.round(((distanceKm / 100) * avgConsumptionL100km) * 10) / 10;
    const fuelCostEur = Math.round((fuelLitersNeeded * pricePerLiterEur) * 100) / 100;

    const accommodationCostEur = params.destinationPricePerNight && params.destinationPricePerNight > 0
      ? params.destinationPricePerNight
      : 0;

    const totalCostEur = Math.round((fuelCostEur + accommodationCostEur) * 100) / 100;
    const repsolSavingsEur = Math.round((fuelLitersNeeded * this.REPSOL_DISCOUNT_PER_LITER) * 100) / 100;
    const costWithRepsolDiscountEur = Math.max(0, Math.round((totalCostEur - repsolSavingsEur) * 100) / 100);

    const vehicleLabel = vehicle?.model
      ? `${vehicle.brand} ${vehicle.model}`
      : 'Camper Estándar';

    return {
      distanceKm,
      durationMinutes,
      fuelType,
      avgConsumptionL100km,
      fuelLitersNeeded,
      pricePerLiterEur,
      fuelCostEur,
      accommodationCostEur,
      totalCostEur,
      repsolSavingsEur,
      costWithRepsolDiscountEur,
      vehicleLabel,
    };
  }
}

export const tripCostCalculatorService = TripCostCalculatorService;
