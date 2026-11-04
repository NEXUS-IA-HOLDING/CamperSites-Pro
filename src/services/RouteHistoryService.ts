/**
 * RouteHistoryService.ts - Servicio de Historial de Rutas y Configuración de Privacidad/Retención
 * CamperSites Pro - Multi-Vehículo (Camper, Moto, 4x4, Coche, Camión y SOS)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleCursorType, VehicleProfileMode } from '../types/assistant';

const ROUTE_HISTORY_STORAGE_KEY = '@campersites_route_history';
const ROUTE_HISTORY_SETTINGS_KEY = '@campersites_route_history_settings';

export interface RouteHistoryEntry {
  id: string;
  destinationName: string;
  destinationCategory?: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  distanceMeters: number;
  durationSeconds: number;
  routeName?: string;
  vehicleMode: VehicleProfileMode;
  vehicleCursor?: VehicleCursorType;
  timestamp: number;
}

export interface RouteHistorySettings {
  enabled: boolean;          // Guardar automáticamente cada ruta iniciada
  maxEntries: number;        // 25, 100, 500
  autoCleanDays: number;     // 7, 30, 90, 365, 0 (sin caducidad)
  saveCustomWaypoints: boolean;
}

export const DEFAULT_HISTORY_SETTINGS: RouteHistorySettings = {
  enabled: true,
  maxEntries: 100,
  autoCleanDays: 90,
  saveCustomWaypoints: true,
};

class RouteHistoryService {
  /**
   * Obtiene la configuración actual del historial de rutas
   */
  public async getSettings(): Promise<RouteHistorySettings> {
    try {
      const raw = await AsyncStorage.getItem(ROUTE_HISTORY_SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_HISTORY_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {}
    return DEFAULT_HISTORY_SETTINGS;
  }

  /**
   * Actualiza la configuración del historial de rutas
   */
  public async updateSettings(
    partial: Partial<RouteHistorySettings>
  ): Promise<RouteHistorySettings> {
    const current = await this.getSettings();
    const updated: RouteHistorySettings = { ...current, ...partial };
    try {
      await AsyncStorage.setItem(ROUTE_HISTORY_SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  }

  /**
   * Obtiene todas las rutas guardadas aplicando limpieza automática si está configurada
   */
  public async getHistory(): Promise<RouteHistoryEntry[]> {
    try {
      const settings = await this.getSettings();
      const raw = await AsyncStorage.getItem(ROUTE_HISTORY_STORAGE_KEY);
      if (!raw) return [];

      let list: RouteHistoryEntry[] = JSON.parse(raw);

      // Limpieza por antigüedad si autoCleanDays > 0
      if (settings.autoCleanDays > 0) {
        const cutoff = Date.now() - settings.autoCleanDays * 24 * 60 * 60 * 1000;
        const filtered = list.filter(item => item.timestamp >= cutoff);
        if (filtered.length !== list.length) {
          list = filtered;
          await AsyncStorage.setItem(ROUTE_HISTORY_STORAGE_KEY, JSON.stringify(list));
        }
      }

      return list.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  /**
   * Registra una nueva ruta iniciada por el usuario (si el historial está activo)
   */
  public async recordRoute(
    entry: Omit<RouteHistoryEntry, 'id' | 'timestamp'>
  ): Promise<RouteHistoryEntry | null> {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled) {
        return null;
      }

      const list = await this.getHistory();
      const newEntry: RouteHistoryEntry = {
        ...entry,
        id: `route_hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      };

      // Evitar duplicado consecutivo idéntico en menos de 2 minutos
      if (
        list.length > 0 &&
        list[0].destinationName === newEntry.destinationName &&
        Date.now() - list[0].timestamp < 120000
      ) {
        return list[0];
      }

      const updated = [newEntry, ...list].slice(0, settings.maxEntries || 100);
      await AsyncStorage.setItem(ROUTE_HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return newEntry;
    } catch {
      return null;
    }
  }

  /**
   * Elimina una ruta concreta del historial
   */
  public async deleteEntry(id: string): Promise<RouteHistoryEntry[]> {
    try {
      const list = await this.getHistory();
      const updated = list.filter(item => item.id !== id);
      await AsyncStorage.setItem(ROUTE_HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  }

  /**
   * Borra por completo todo el historial de rutas
   */
  public async clearAllHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ROUTE_HISTORY_STORAGE_KEY);
    } catch {}
  }
}

export const routeHistoryService = new RouteHistoryService();
