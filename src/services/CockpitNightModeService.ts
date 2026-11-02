/**
 * CockpitNightModeService - Motor Inteligente de Visión Nocturna y Modo Túnel
 * CamperSites Pro - Conducción en Cabina sin Deslumbramientos
 *
 * Características:
 * - Cálculo astronómico solar preciso según coordenadas GPS y fecha (Amanecer / Ocaso).
 * - Detección instantánea de Túneles (conmuta a modo noche para evitar deslumbramiento).
 * - Modos: 'auto' (astronómico/sensores), 'day' (forzado día), 'night' (forzado noche).
 * - Persistencia en AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';

export type CockpitThemeMode = 'auto' | 'day' | 'night';

export interface NightModeState {
  isNight: boolean;
  mode: CockpitThemeMode;
  reason: 'solar' | 'tunnel' | 'manual' | 'clock';
  sunriseTime?: string;
  sunsetTime?: string;
}

const STORAGE_KEY = '@campersites_cockpit_night_mode';

class CockpitNightModeServiceImpl {
  private mode: CockpitThemeMode = 'auto';
  private isNight: boolean = false;
  private isInsideTunnel: boolean = false;
  private currentReason: 'solar' | 'tunnel' | 'manual' | 'clock' = 'clock';
  private listeners: Set<(state: NightModeState) => void> = new Set();
  private lastLat: number = 40.4168; // Madrid por defecto
  private lastLng: number = -3.7038;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'auto' || saved === 'day' || saved === 'night') {
        this.mode = saved;
      }
    } catch (e) {
      Logger.warn('CockpitNightModeService', 'No se pudo leer la preferencia de modo noche', e);
    }
    this.evaluate();
  }

  /**
   * Actualiza coordenadas GPS para cálculo solar astronómico
   */
  public updateLocation(lat: number, lng: number) {
    this.lastLat = lat;
    this.lastLng = lng;
    this.evaluate();
  }

  /**
   * Notifica entrada o salida de un túnel
   */
  public setTunnelState(insideTunnel: boolean) {
    if (this.isInsideTunnel !== insideTunnel) {
      this.isInsideTunnel = insideTunnel;
      Logger.info('CockpitNightModeService', `Estado de túnel: ${insideTunnel ? 'DENTRO DE TÚNEL' : 'FUERA'}`);
      this.evaluate();
    }
  }

  /**
   * Configura el modo de cabina: auto, day o night
   */
  public async setMode(newMode: CockpitThemeMode) {
    this.mode = newMode;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch (_) {}
    this.evaluate();
  }

  public getMode(): CockpitThemeMode {
    return this.mode;
  }

  public getState(): NightModeState {
    return {
      isNight: this.isNight,
      mode: this.mode,
      reason: this.currentReason,
    };
  }

  public subscribe(listener: (state: NightModeState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        Logger.error('CockpitNightModeService', 'Error en listener de modo noche', err);
      }
    });
  }

  /**
   * Evaluación del estado visual según física astronómica y sensores
   */
  public evaluate() {
    let nextIsNight = false;
    let reason: 'solar' | 'tunnel' | 'manual' | 'clock' = 'clock';

    if (this.mode === 'night') {
      nextIsNight = true;
      reason = 'manual';
    } else if (this.mode === 'day') {
      nextIsNight = false;
      reason = 'manual';
    } else {
      // Modo AUTO
      if (this.isInsideTunnel) {
        nextIsNight = true;
        reason = 'tunnel';
      } else {
        const solar = this.calculateSolarIsNight(this.lastLat, this.lastLng);
        nextIsNight = solar.isNight;
        reason = solar.reason;
      }
    }

    if (this.isNight !== nextIsNight || this.currentReason !== reason) {
      this.isNight = nextIsNight;
      this.currentReason = reason;
      Logger.info('CockpitNightModeService', `Conmutación de interfaz: ${nextIsNight ? 'NOCHE / CABINA OSCURA' : 'DÍA'} (Causa: ${reason})`);
      this.notify();
    }
  }

  /**
   * Cálculo astronómico solar para España y Europa
   */
  private calculateSolarIsNight(lat: number, lng: number): { isNight: boolean; reason: 'solar' | 'clock' } {
    try {
      const now = new Date();
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
      
      // Declinación solar aproximada (grados)
      const declination = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
      
      // Ecuación del tiempo (minutos)
      const b = ((360 / 365) * (dayOfYear - 81) * Math.PI) / 180;
      const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
      
      // Ángulo horario para amanecer/atardecer (con refracción atmosférica -0.83°)
      const latRad = (lat * Math.PI) / 180;
      const decRad = (declination * Math.PI) / 180;
      const cosHourAngle =
        (Math.sin((-0.833 * Math.PI) / 180) - Math.sin(latRad) * Math.sin(decRad)) /
        (Math.cos(latRad) * Math.cos(decRad));

      if (cosHourAngle > 1) {
        // Noche polar
        return { isNight: true, reason: 'solar' };
      }
      if (cosHourAngle < -1) {
        // Día polar
        return { isNight: false, reason: 'solar' };
      }

      const hourAngleDeg = (Math.acos(cosHourAngle) * 180) / Math.PI;
      const solarNoonUtcMinutes = 720 - 4 * lng - eot;
      
      // Offset de zona horaria local en minutos
      const tzOffsetMinutes = -now.getTimezoneOffset();
      const solarNoonLocalMinutes = solarNoonUtcMinutes + tzOffsetMinutes;
      
      const halfDayMinutes = hourAngleDeg * 4;
      const sunriseMinutes = solarNoonLocalMinutes - halfDayMinutes;
      const sunsetMinutes = solarNoonLocalMinutes + halfDayMinutes;
      
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Es de noche si la hora actual es antes del amanecer o después del ocaso
      const isNight = currentMinutes < sunriseMinutes || currentMinutes > sunsetMinutes;
      return { isNight, reason: 'solar' };
    } catch (_) {
      // Fallback simple por reloj horario (20:00 a 07:30)
      const hours = new Date().getHours();
      return { isNight: hours >= 20 || hours < 7, reason: 'clock' };
    }
  }
}

export const CockpitNightModeService = new CockpitNightModeServiceImpl();
