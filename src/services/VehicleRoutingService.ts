/**
 * VehicleRoutingService - Motor de Inteligencia de Rutas para Vehículos Especiales
 * CamperSites Pro - Camper, Camión y Reparto
 */

import haversine from 'haversine-distance';
import {
  AdvancedVehicleConfig,
  ClearanceHazard,
  DeliveryStop,
  TachographStatus,
  TSPOptimizationResult,
  VehicleProfileMode,
} from '../types/assistant';

// Margen de seguridad estándar para altura de gálibo (15 cm)
export const CLEARANCE_SAFETY_MARGIN_METERS = 0.15;

// Límites reglamentarios del tacógrafo europeo (Reglamento CE 561/2006)
export const TACHO_MAX_CONTINUOUS_MINUTES = 270; // 4 horas y 30 minutos
export const TACHO_WARNING_MINUTES = 225;        // 3 horas y 45 minutos (45 min antes)

export class VehicleRoutingService {
  /**
   * Optimización TSP multi-parada (Nearest Neighbor + 2-opt)
   * Diseñado para repartidores (Amazon, mensajería, paquetería)
   * Soporta hasta 50 paradas con tiempos de descarga estimados.
   */
  public static optimizeDeliveryStops(
    origin: { latitude: number; longitude: number },
    stops: DeliveryStop[],
    averageSpeedKmH: number = 38 // velocidad media urbana/interurbana
  ): TSPOptimizationResult {
    if (!stops || stops.length === 0) {
      return {
        orderedStops: [],
        totalDistanceKm: 0,
        totalDriveDurationMin: 0,
        totalServiceDurationMin: 0,
        totalDurationMin: 0,
      };
    }

    if (stops.length === 1) {
      const distMeters = haversine(origin, stops[0]);
      const distKm = distMeters / 1000;
      const driveMin = Math.round((distKm / averageSpeedKmH) * 60);
      const serviceMin = stops[0].estimatedUnloadMinutes || 4;

      const singleStop: DeliveryStop = {
        ...stops[0],
        sequenceOrder: 1,
        estimatedArrival: this.calculateArrivalTime(new Date(), driveMin),
      };

      return {
        orderedStops: [singleStop],
        totalDistanceKm: Number(distKm.toFixed(2)),
        totalDriveDurationMin: driveMin,
        totalServiceDurationMin: serviceMin,
        totalDurationMin: driveMin + serviceMin,
      };
    }

    // 1. Construir ruta inicial mediante Nearest Neighbor
    const remaining = [...stops];
    const ordered: DeliveryStop[] = [];
    let currentPoint = origin;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = haversine(currentPoint, {
          latitude: remaining[i].latitude,
          longitude: remaining[i].longitude,
        });
        if (d < minDistance) {
          minDistance = d;
          nearestIndex = i;
        }
      }

      const nextStop = remaining.splice(nearestIndex, 1)[0];
      ordered.push(nextStop);
      currentPoint = { latitude: nextStop.latitude, longitude: nextStop.longitude };
    }

    // 2. Refinamiento 2-opt (intercambio de aristas para desenredar cruces)
    const improvedRoute = this.twoOptOptimization(origin, ordered);

    // 3. Calcular métricas finales y tiempos de llegada acumulados
    let totalDistMeters = 0;
    let prevPoint = origin;
    let cumulativeMinutes = 0;
    const now = new Date();

    const finalizedStops: DeliveryStop[] = improvedRoute.map((stop, idx) => {
      const legDist = haversine(prevPoint, {
        latitude: stop.latitude,
        longitude: stop.longitude,
      });
      totalDistMeters += legDist;
      prevPoint = { latitude: stop.latitude, longitude: stop.longitude };

      const legDriveMin = (legDist / 1000 / averageSpeedKmH) * 60;
      cumulativeMinutes += legDriveMin;

      const arrivalTimeStr = this.calculateArrivalTime(now, Math.round(cumulativeMinutes));
      cumulativeMinutes += stop.estimatedUnloadMinutes || 4;

      return {
        ...stop,
        sequenceOrder: idx + 1,
        estimatedArrival: arrivalTimeStr,
      };
    });

    const totalDistanceKm = Number((totalDistMeters / 1000).toFixed(2));
    const totalDriveMin = Math.round((totalDistanceKm / averageSpeedKmH) * 60);
    const totalServiceMin = finalizedStops.reduce(
      (sum, s) => sum + (s.estimatedUnloadMinutes || 4),
      0
    );

    return {
      orderedStops: finalizedStops,
      totalDistanceKm,
      totalDriveDurationMin: totalDriveMin,
      totalServiceDurationMin: totalServiceMin,
      totalDurationMin: totalDriveMin + totalServiceMin,
    };
  }

  /**
   * Refinamiento 2-opt para optimizar secuencia
   */
  private static twoOptOptimization(
    origin: { latitude: number; longitude: number },
    route: DeliveryStop[]
  ): DeliveryStop[] {
    let best = [...route];
    let improved = true;
    let iterations = 0;
    const maxIterations = 50; // seguridad para no bloquear el hilo de ejecución

    const calculateTotalDist = (r: DeliveryStop[]) => {
      let d = haversine(origin, r[0]);
      for (let i = 0; i < r.length - 1; i++) {
        d += haversine(r[i], r[i + 1]);
      }
      return d;
    };

    let bestDist = calculateTotalDist(best);

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 0; i < best.length - 1; i++) {
        for (let k = i + 1; k < best.length; k++) {
          const newRoute = this.twoOptSwap(best, i, k);
          const newDist = calculateTotalDist(newRoute);

          if (newDist < bestDist - 10) { // al menos 10 metros de mejora
            best = newRoute;
            bestDist = newDist;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    return best;
  }

  private static twoOptSwap(route: DeliveryStop[], i: number, k: number): DeliveryStop[] {
    const swapped = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
    return swapped;
  }

  private static calculateArrivalTime(baseDate: Date, minutesToAdd: number): string {
    const target = new Date(baseDate.getTime() + minutesToAdd * 60000);
    const hours = target.getHours().toString().padStart(2, '0');
    const mins = target.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  }

  /**
   * Tacógrafo Reglamentario (Camión)
   * Devuelve el estado actual con alarma inteligente a las 3h 45m
   */
  public static calculateTachographStatus(
    sessionStartTimestamp: number,
    isResting: boolean = false,
    customElapsedMinutes?: number
  ): TachographStatus {
    const now = Date.now();
    const drivingMinutes = customElapsedMinutes !== undefined
      ? customElapsedMinutes
      : isResting
      ? 0
      : Math.floor((now - sessionStartTimestamp) / 60000);

    const isWarningActive = drivingMinutes >= TACHO_WARNING_MINUTES && drivingMinutes < TACHO_MAX_CONTINUOUS_MINUTES;
    const isLimitExceeded = drivingMinutes >= TACHO_MAX_CONTINUOUS_MINUTES;

    return {
      drivingMinutes,
      maxContinuousMinutes: TACHO_MAX_CONTINUOUS_MINUTES,
      warningThresholdMinutes: TACHO_WARNING_MINUTES,
      isWarningActive,
      isLimitExceeded,
      isResting,
      sessionStartTime: sessionStartTimestamp,
    };
  }

  /**
   * Formatea minutos de tacógrafo en formato visual "3h 45m"
   */
  public static formatTachographTime(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }

  /**
   * Detección de gálibos y puentes bajos en ruta
   */
  public static checkClearanceHazards(
    routeCoordinates: Array<{ latitude: number; longitude: number }>,
    hazards: ClearanceHazard[],
    vehicleHeightMeters: number,
    alertDistanceMeters: number = 1000
  ): { hazard: ClearanceHazard; distanceMeters: number }[] {
    const conflicts: { hazard: ClearanceHazard; distanceMeters: number }[] = [];

    hazards.forEach((hazard) => {
      // Si la altura del gálibo es menor que la del vehículo + margen de seguridad
      if (hazard.maxAllowedHeight <= vehicleHeightMeters + CLEARANCE_SAFETY_MARGIN_METERS) {
        // Encontrar distancia mínima a la ruta
        let minDistanceToRoute = Infinity;

        for (const coord of routeCoordinates) {
          const dist = haversine(coord, {
            latitude: hazard.latitude,
            longitude: hazard.longitude,
          });
          if (dist < minDistanceToRoute) {
            minDistanceToRoute = dist;
          }
        }

        if (minDistanceToRoute <= alertDistanceMeters) {
          conflicts.push({
            hazard,
            distanceMeters: Math.round(minDistanceToRoute),
          });
        }
      }
    });

    return conflicts.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  /**
   * Filtro de categorías y servicios según el modo de perfil activo
   */
  public static getCategoriesForMode(mode: VehicleProfileMode): string[] {
    switch (mode) {
      case 'camper':
        return [
          'CAMPING',
          'PARKING_PERMITIDO',
          'AREA_DESCANSO',
          'AREA_SERVICIOS',
          'MIRADOR',
          'PLAYA',
          'GASOLINERA_GLP',
          'LAGO',
          'CASCADA',
          'RESTAURANTE',
          'BAR',
          'BAR_CAFETERIA',
          'HOTEL',
          'SUPERMERCADO',
          'LAVANDERIA',
          'FARMACIA',
        ];
      case 'truck':
        return [
          'AREA_DESCANSO',
          'AREA_SERVICIOS',
          'RESTAURANTE', // Menú del día y parking camiones
          'BAR',
          'BAR_CAFETERIA',
          'HOTEL',
          'GASOLINERA_GLP',
          'PARKING_PERMITIDO',
          'LAVADERO_COCHES',
          'SUPERMERCADO',
        ];
      case 'delivery':
        return [
          'PARKING_PERMITIDO',
          'AREA_DESCANSO',
          'GASOLINERA_GLP',
          'SUPERMERCADO',
          'BAR',
          'BAR_CAFETERIA',
          'RESTAURANTE',
        ];
      default:
        return [];
    }
  }
}
