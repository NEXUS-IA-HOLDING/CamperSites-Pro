/**
 * CamperValhallaRoutingService.ts - Motor de Rutas Valhalla con Gálibo y Medidas Camper
 * CamperSites Pro — Nexus AI Holding
 *
 * Calcula rutas evitando túneles bajos, puentes con limitación de gálibo y
 * pasos estrechos según las dimensiones exactas de la autocaravana o furgoneta.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';

export interface CamperVehicleDimensions {
  height: number;  // metros (ej. 3.2m)
  width: number;   // metros (ej. 2.3m)
  length: number;  // metros (ej. 6.8m)
  weight: number;  // toneladas (ej. 3.5t)
  excludeTolls?: boolean;
}

export const DEFAULT_CAMPER_DIMENSIONS: CamperVehicleDimensions = {
  height: 3.2,
  width: 2.3,
  length: 6.8,
  weight: 3.5,
  excludeTolls: false,
};

const STORAGE_KEY_DIMENSIONS = '@camper_vehicle_dimensions';
const VALHALLA_FOSSGIS_ENDPOINT = 'https://valhalla1.openstreetmap.de/route';

export interface ValhallaManeuver {
  type: number;
  instruction: string;
  verbal_pre_transition_instruction?: string;
  street_names?: string[];
  time: number;
  length: number; // km
  begin_shape_index: number;
  end_shape_index: number;
}

export interface ValhallaRouteResult {
  coordinates: { latitude: number; longitude: number }[];
  distanceKm: number;
  distanceMeters: number;
  durationSeconds: number;
  summary: string;
  maneuvers: ValhallaManeuver[];
  isTruckSafe: boolean;
  clearanceVerified: boolean;
}

/**
 * Decodifica una polilínea codificada con precisión 6 (estándar Valhalla)
 */
export function decodePolyline6(str: string, precision: number = 6): { latitude: number; longitude: number }[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: { latitude: number; longitude: number }[] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let byte: number;
    let shift = 0;
    let result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({
      latitude: lat / factor,
      longitude: lng / factor,
    });
  }

  return coordinates;
}

export class CamperValhallaRoutingService {
  /**
   * Obtiene las dimensiones configuradas para el vehículo
   */
  public static async getVehicleDimensions(): Promise<CamperVehicleDimensions> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY_DIMENSIONS);
      if (data) {
        return { ...DEFAULT_CAMPER_DIMENSIONS, ...JSON.parse(data) };
      }
    } catch (e) {
      Logger.warn('ValhallaRouting', 'Error leyendo dimensiones de vehículo guardadas');
    }
    return DEFAULT_CAMPER_DIMENSIONS;
  }

  /**
   * Guarda las dimensiones del vehículo en el almacenamiento local
   */
  public static async saveVehicleDimensions(dimensions: CamperVehicleDimensions): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_DIMENSIONS, JSON.stringify(dimensions));
    } catch (e) {
      Logger.error('ValhallaRouting', 'Error guardando dimensiones de vehículo', e);
    }
  }

  /**
   * Calcula una ruta con Valhalla respetando el gálibo del vehículo (costing: truck)
   */
  public static async calculateTruckRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    customDimensions?: Partial<CamperVehicleDimensions>
  ): Promise<ValhallaRouteResult | null> {
    const dimensions: CamperVehicleDimensions = {
      ...(await this.getVehicleDimensions()),
      ...(customDimensions || {}),
    };

    const payload = {
      locations: [
        { lat: origin.latitude, lon: origin.longitude },
        { lat: destination.latitude, lon: destination.longitude },
      ],
      costing: 'truck',
      costing_options: {
        truck: {
          height: dimensions.height,
          width: dimensions.width,
          length: dimensions.length,
          weight: dimensions.weight,
          exclude_tolls: dimensions.excludeTolls ? 1 : 0,
          gate_penalty: 600,
        },
      },
      directions_options: {
        units: 'kilometers',
        language: 'es-ES',
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(VALHALLA_FOSSGIS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        Logger.warn('ValhallaRouting', `HTTP Error en Valhalla: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
        return null;
      }

      const leg = data.trip.legs[0];
      const shapeStr = leg.shape;
      if (!shapeStr) return null;

      const coordinates = decodePolyline6(shapeStr, 6);
      const distanceKm = data.trip.summary?.length || leg.summary?.length || 0;
      const durationSeconds = data.trip.summary?.time || leg.summary?.time || 0;

      return {
        coordinates,
        distanceKm,
        distanceMeters: Math.round(distanceKm * 1000),
        durationSeconds,
        summary: leg.summary?.name || 'Ruta Optimizada Camper (Sin Obstáculos)',
        maneuvers: leg.maneuvers || [],
        isTruckSafe: true,
        clearanceVerified: true,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      Logger.warn('ValhallaRouting', `Fallo al contactar Valhalla: ${err.message}`);
      return null;
    }
  }
}
