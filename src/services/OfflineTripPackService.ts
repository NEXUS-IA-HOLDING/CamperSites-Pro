/**
 * OfflineTripPackService.ts
 * Gestor del "Pack Desconexión Offline": Almacena rutas, servicios, gálibos y áreas sin cobertura en 1 toque
 * CamperSites Pro — Nexus AI Holding
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineSpotVault, OfflineSpot } from './OfflineSpotVaultService';
import { ClearanceHazardService } from './ClearanceHazardService';
import { ClearanceHazard } from '../types/assistant';
import { Logger } from '../utils/logger';

const TRIP_PACKS_INDEX_KEY = '@camper_offline_trip_packs_index';
const TRIP_PACK_PREFIX = '@camper_offline_pack_';

export interface OfflineTripPackItem {
  tripId: string;
  name: string;
  savedAt: number;
  originCoords?: [number, number];
  destinationCoords: [number, number];
  spotsCount: number;
  hazardsCount: number;
  sizeKb: number;
  spots: OfflineSpot[];
  hazards: ClearanceHazard[];
}

export class OfflineTripPackService {
  /**
   * Empaqueta e indexa todos los servicios, gálibos y puntos de pernocta de la ruta en almacenamiento local
   */
  public static async downloadTripPack(trip: {
    tripId: string;
    name: string;
    destinationCoords: [number, number]; // [lng, lat]
    originCoords?: [number, number];
    coordinates?: [number, number][];
  }): Promise<{ success: boolean; spotsCount: number; hazardsCount: number; sizeKb: number }> {
    try {
      const destLng = trip.destinationCoords[0];
      const destLat = trip.destinationCoords[1];

      const origLng = trip.originCoords ? trip.originCoords[0] : destLng - 0.5;
      const origLat = trip.originCoords ? trip.originCoords[1] : destLat - 0.5;

      const minLat = Math.min(destLat, origLat) - 0.25;
      const maxLat = Math.max(destLat, origLat) + 0.25;
      const minLng = Math.min(destLng, origLng) - 0.25;
      const maxLng = Math.max(destLng, origLng) + 0.25;

      // 1. Extraer spots relevantes de la bóveda
      const spots = offlineSpotVault.queryBounds(minLat, maxLat, minLng, maxLng);

      // 2. Extraer peligros de gálibo
      const allHazards = ClearanceHazardService.getAllHazards();
      const corridorHazards = allHazards.filter((h) => {
        return (
          h.latitude >= minLat &&
          h.latitude <= maxLat &&
          h.longitude >= minLng &&
          h.longitude <= maxLng
        );
      });

      const packPayload: OfflineTripPackItem = {
        tripId: trip.tripId,
        name: trip.name,
        savedAt: Date.now(),
        originCoords: trip.originCoords,
        destinationCoords: trip.destinationCoords,
        spotsCount: spots.length,
        hazardsCount: corridorHazards.length,
        sizeKb: Math.round(JSON.stringify({ spots, corridorHazards }).length / 1024),
        spots,
        hazards: corridorHazards,
      };

      // Guardar el paquete individual
      await AsyncStorage.setItem(`${TRIP_PACK_PREFIX}${trip.tripId}`, JSON.stringify(packPayload));

      // Actualizar índice general de packs
      const rawIndex = await AsyncStorage.getItem(TRIP_PACKS_INDEX_KEY);
      const index: string[] = rawIndex ? JSON.parse(rawIndex) : [];
      if (!index.includes(trip.tripId)) {
        index.push(trip.tripId);
        await AsyncStorage.setItem(TRIP_PACKS_INDEX_KEY, JSON.stringify(index));
      }

      Logger.info(
        'OfflineTripPack',
        `Pack "${trip.name}" guardado: ${spots.length} spots, ${corridorHazards.length} gálibos (${packPayload.sizeKb} KB)`
      );

      return {
        success: true,
        spotsCount: spots.length,
        hazardsCount: corridorHazards.length,
        sizeKb: packPayload.sizeKb,
      };
    } catch (error) {
      Logger.error('OfflineTripPack', 'Error empaquetando ruta offline', error);
      return { success: false, spotsCount: 0, hazardsCount: 0, sizeKb: 0 };
    }
  }

  /**
   * Comprueba si una ruta o destino ya está guardada en la caché offline
   */
  public static async isTripSavedOffline(tripId: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(`${TRIP_PACK_PREFIX}${tripId}`);
      return raw !== null;
    } catch {
      return false;
    }
  }

  /**
   * Elimina un paquete offline
   */
  public static async removeTripPack(tripId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${TRIP_PACK_PREFIX}${tripId}`);
      const rawIndex = await AsyncStorage.getItem(TRIP_PACKS_INDEX_KEY);
      if (rawIndex) {
        const index: string[] = JSON.parse(rawIndex);
        const filtered = index.filter((id) => id !== tripId);
        await AsyncStorage.setItem(TRIP_PACKS_INDEX_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      Logger.error('OfflineTripPack', 'Error eliminando pack', e);
    }
  }

  /**
   * Obtiene todos los paquetes offline guardados
   */
  public static async getSavedTripPacks(): Promise<OfflineTripPackItem[]> {
    try {
      const rawIndex = await AsyncStorage.getItem(TRIP_PACKS_INDEX_KEY);
      if (!rawIndex) return [];
      const ids: string[] = JSON.parse(rawIndex);
      const list: OfflineTripPackItem[] = [];
      for (const id of ids) {
        const raw = await AsyncStorage.getItem(`${TRIP_PACK_PREFIX}${id}`);
        if (raw) list.push(JSON.parse(raw));
      }
      return list;
    } catch {
      return [];
    }
  }
}

export const offlineTripPackService = OfflineTripPackService;
