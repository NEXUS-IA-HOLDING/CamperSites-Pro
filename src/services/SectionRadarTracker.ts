/**
 * SectionRadarTracker.ts - Motor de Control y Seguimiento de Radares de Tramo
 * CamperSites Pro - Cockpit Navigation Automotive System
 * 
 * Capacidades:
 * 1. Detección automática de entrada a zona de radar de tramo DGT
 * 2. Cálculo matemático exacto de Velocidad Media real (V_avg = distancia_recorrida / tiempo_transcurrido)
 * 3. Estimación de distancia restante hasta la cámara de salida
 * 4. Gestión de alertas sonoras y hápticas si la velocidad media supera el límite legal
 * 5. Notificación de fin de tramo con resumen de cumplimiento
 */

import { AudioAlertService } from './AudioAlertService';
import { Logger } from '../utils/logger';

export interface SectionRadarZone {
  id: string;
  name: string;
  road: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  totalLengthMeters: number;
  speedLimitKmH: number;
}

export interface SectionRadarStatus {
  isActive: boolean;
  zone: SectionRadarZone | null;
  currentSpeedKmH: number;
  averageSpeedKmH: number;
  speedLimitKmH: number;
  distanceRemainingMeters: number;
  progressPercent: number; // 0 - 100%
  elapsedSeconds: number;
  isOverSpeedLimit: boolean;
  overSpeedDeltaKmH: number;
}

// Haversine en metros
function haversineDist(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Base de datos de tramos DGT emblemáticos de alta afluencia en España
export const KNOWN_SECTION_RADARS: SectionRadarZone[] = [
  {
    id: 'sec-a6-guadarrama',
    name: 'Túnel de Guadarrama (A-6)',
    road: 'A-6 km 53.5 a 56.7',
    startLat: 40.6975,
    startLng: -4.1352,
    endLat: 40.7182,
    endLng: -4.1568,
    totalLengthMeters: 3300,
    speedLimitKmH: 100,
  },
  {
    id: 'sec-m30-rio',
    name: 'Túneles M-30 Calle 30',
    road: 'M-30 km 12.0 a 14.8',
    startLat: 40.3951,
    startLng: -3.7042,
    endLat: 40.4123,
    endLng: -3.7215,
    totalLengthMeters: 2800,
    speedLimitKmH: 70,
  },
  {
    id: 'sec-ap7-castellon',
    name: 'Tramo AP-7 Castellón - Oropesa',
    road: 'AP-7 km 440 a 445',
    startLat: 40.0621,
    startLng: 0.1154,
    endLat: 40.0984,
    endLng: 0.1422,
    totalLengthMeters: 5100,
    speedLimitKmH: 120,
  },
  {
    id: 'sec-a7-torremolinos',
    name: 'Tramo Autovía del Mediterráneo (A-7)',
    road: 'A-7 km 226 a 229',
    startLat: 36.6212,
    startLng: -4.5098,
    endLat: 36.6432,
    endLng: -4.4875,
    totalLengthMeters: 3200,
    speedLimitKmH: 80,
  },
  {
    id: 'sec-a1-somosierra',
    name: 'Descenso Puerto de Somosierra (A-1)',
    road: 'A-1 km 91.5 a 96.0',
    startLat: 41.1345,
    startLng: -3.5821,
    endLat: 41.1689,
    endLng: -3.5934,
    totalLengthMeters: 4500,
    speedLimitKmH: 90,
  },
];

class SectionRadarTrackerImpl {
  private activeZone: SectionRadarZone | null = null;
  private entryTime: number = 0;
  private accumulatedDistanceMeters: number = 0;
  private lastPosition: { latitude: number; longitude: number } | null = null;
  private lastWarningTimestamp: number = 0;

  /**
   * Evalúa la posición actual con respecto a los radares de tramo
   */
  public updatePosition(
    lat: number,
    lng: number,
    instantSpeedMps: number
  ): SectionRadarStatus | null {
    const currentSpeedKmH = Math.max(0, instantSpeedMps * 3.6);
    const now = Date.now();

    // 1. Si no estamos en ningún tramo, comprobar si entramos a alguno
    if (!this.activeZone) {
      for (const zone of KNOWN_SECTION_RADARS) {
        const distToStart = haversineDist(lat, lng, zone.startLat, zone.startLng);
        // Si estamos a menos de 75m del punto de inicio del tramo
        if (distToStart <= 75) {
          this.activeZone = zone;
          this.entryTime = now;
          this.accumulatedDistanceMeters = 0;
          this.lastPosition = { latitude: lat, longitude: lng };

          Logger.info('SectionRadarTracker', `Entrando a radar de tramo: ${zone.name} (${zone.speedLimitKmH} km/h)`);
          AudioAlertService.speak(
            `Atención, inicio de radar de tramo. Límite ${zone.speedLimitKmH} kilómetros por hora.`,
            `sec_enter_${zone.id}`,
            15000
          );
          break;
        }
      }

      if (!this.activeZone) {
        return null;
      }
    }

    // 2. Si ya estamos dentro del tramo, acumular distancia
    if (this.lastPosition) {
      const stepDist = haversineDist(
        this.lastPosition.latitude,
        this.lastPosition.longitude,
        lat,
        lng
      );
      // Filtrar posibles saltos de GPS espurios (> 150m por segundo)
      if (stepDist < 150) {
        this.accumulatedDistanceMeters += stepDist;
      }
    }
    this.lastPosition = { latitude: lat, longitude: lng };

    const elapsedSeconds = Math.max(1, (now - this.entryTime) / 1000);
    // V_avg = (metros / segundos) * 3.6 = km/h
    const averageSpeedKmH = (this.accumulatedDistanceMeters / elapsedSeconds) * 3.6;

    const distToEnd = haversineDist(lat, lng, this.activeZone.endLat, this.activeZone.endLng);
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((this.accumulatedDistanceMeters / this.activeZone.totalLengthMeters) * 100))
    );

    const isOverSpeed = averageSpeedKmH > this.activeZone.speedLimitKmH;
    const overSpeedDelta = isOverSpeed ? averageSpeedKmH - this.activeZone.speedLimitKmH : 0;

    // Alerta de voz si la velocidad media supera el límite
    if (isOverSpeed && now - this.lastWarningTimestamp > 12000 && elapsedSeconds > 10) {
      this.lastWarningTimestamp = now;
      AudioAlertService.speak(
        `Atención, velocidad media ${Math.round(averageSpeedKmH)} en tramo de ${this.activeZone.speedLimitKmH}. Reduzca la marcha.`,
        'sec_overspeed',
        10000
      );
    }

    // 3. Comprobar salida del tramo (distancia al final < 60m o distancia acumulada superada)
    if (distToEnd <= 60 || this.accumulatedDistanceMeters >= this.activeZone.totalLengthMeters * 1.1) {
      Logger.info('SectionRadarTracker', `Fin de radar de tramo: ${this.activeZone.name}. Media final: ${Math.round(averageSpeedKmH)} km/h`);
      if (averageSpeedKmH <= this.activeZone.speedLimitKmH) {
        AudioAlertService.speak('Fin del radar de tramo. Velocidad media correcta.', 'sec_exit_ok', 10000);
      } else {
        AudioAlertService.speak('Fin del radar de tramo. Límite de velocidad superado.', 'sec_exit_over', 10000);
      }
      this.reset();
      return null;
    }

    return {
      isActive: true,
      zone: this.activeZone,
      currentSpeedKmH: Math.round(currentSpeedKmH),
      averageSpeedKmH: Math.round(averageSpeedKmH * 10) / 10,
      speedLimitKmH: this.activeZone.speedLimitKmH,
      distanceRemainingMeters: Math.round(distToEnd),
      progressPercent,
      elapsedSeconds: Math.round(elapsedSeconds),
      isOverSpeedLimit: isOverSpeed,
      overSpeedDeltaKmH: Math.round(overSpeedDelta * 10) / 10,
    };
  }

  public reset() {
    this.activeZone = null;
    this.entryTime = 0;
    this.accumulatedDistanceMeters = 0;
    this.lastPosition = null;
    this.lastWarningTimestamp = 0;
  }
}

export const sectionRadarTracker = new SectionRadarTrackerImpl();
