/**
 * OfflineMapTileService.ts - Gestor de Descarga de Cartografía Satelital Offline
 * CamperSites Pro — Nexus AI Holding
 *
 * Permite descargar y almacenar cuadrículas satelitales en caché local para
 * navegación y pernocta en valles, calas y puertos de montaña sin cobertura 4G/5G.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';

export interface OfflineTileRegion {
  id: string;
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  minZoom: number;
  maxZoom: number;
  tileCountEstimate: number;
  sizeMBEstimate: number;
  downloadedAt: string;
  isCompleted: boolean;
}

const STORAGE_KEY_OFFLINE_REGIONS = '@camper_offline_satellite_regions';

export class OfflineMapTileService {
  /**
   * Estima el número de tiles y megabytes para una región dada
   */
  public static estimateRegionTiles(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    minZoom: number = 10,
    maxZoom: number = 15
  ): { tileCount: number; sizeMB: number } {
    let totalTiles = 0;

    for (let z = minZoom; z <= maxZoom; z++) {
      const n = Math.pow(2, z);
      const minX = Math.floor(((minLng + 180) / 360) * n);
      const maxX = Math.floor(((maxLng + 180) / 360) * n);

      const latRadMin = (minLat * Math.PI) / 180;
      const latRadMax = (maxLat * Math.PI) / 180;

      const minY = Math.floor(
        ((1 - Math.log(Math.tan(latRadMax) + 1 / Math.cos(latRadMax)) / Math.PI) / 2) * n
      );
      const maxY = Math.floor(
        ((1 - Math.log(Math.tan(latRadMin) + 1 / Math.cos(latRadMin)) / Math.PI) / 2) * n
      );

      const countX = Math.max(1, Math.abs(maxX - minX) + 1);
      const countY = Math.max(1, Math.abs(maxY - minY) + 1);

      totalTiles += countX * countY;
    }

    // Promedio de 18 KB por tile de satélite comprimido WebP/JPEG
    const sizeMB = Number(((totalTiles * 18) / 1024).toFixed(1));
    return { tileCount: totalTiles, sizeMB };
  }

  /**
   * Obtiene la lista de regiones descargadas
   */
  public static async getDownloadedRegions(): Promise<OfflineTileRegion[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_OFFLINE_REGIONS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      Logger.error('OfflineTileService', 'Error cargando regiones offline', e);
    }
    return [];
  }

  /**
   * Registra una nueva región descargada
   */
  public static async saveDownloadedRegion(region: OfflineTileRegion): Promise<void> {
    try {
      const current = await this.getDownloadedRegions();
      const updated = [...current.filter(r => r.id !== region.id), region];
      await AsyncStorage.setItem(STORAGE_KEY_OFFLINE_REGIONS, JSON.stringify(updated));
    } catch (e) {
      Logger.error('OfflineTileService', 'Error guardando región offline', e);
    }
  }

  /**
   * Elimina una región descargada para liberar espacio
   */
  public static async removeDownloadedRegion(regionId: string): Promise<void> {
    try {
      const current = await this.getDownloadedRegions();
      const updated = current.filter(r => r.id !== regionId);
      await AsyncStorage.setItem(STORAGE_KEY_OFFLINE_REGIONS, JSON.stringify(updated));
    } catch (e) {
      Logger.error('OfflineTileService', 'Error eliminando región offline', e);
    }
  }
}
