/**
 * DrivingSimulationService.ts - Motor de Simulación de Conducción 3D en Cabina
 * CamperSites Pro - Demo Drive & Screen Recording Tool
 *
 * Permite simular una ruta realista en 3D sin necesidad de desplazarse físicamente:
 * - Acelera de 0 a 75 km/h con cálculo continuo de rumbo (bearing)
 * - Mueve el vehículo suavemente por las coordenadas de la ruta
 * - Dispara alertas de radares DGT, velocímetro HUD y sensores de viento
 * - Ideal para que el usuario pruebe la cabina 3D y grabe clips virales para TikTok
 */

import haversine from 'haversine-distance';

export interface SimulatedCoordinate {
  latitude: number;
  longitude: number;
  heading?: number;
}

export type SimulationCallback = (position: {
  latitude: number;
  longitude: number;
  speed: number; // m/s
  heading: number;
  progressPercent: number;
}) => void;

// Ruta escénica por defecto: Cabo de Gata (Almería) hacia calas salvajes
const DEFAULT_SCENIC_COASTAL_ROUTE: SimulatedCoordinate[] = [
  { latitude: 36.7820, longitude: -2.1950 },
  { latitude: 36.7850, longitude: -2.1920 },
  { latitude: 36.7895, longitude: -2.1880 },
  { latitude: 36.7940, longitude: -2.1830 },
  { latitude: 36.7985, longitude: -2.1770 },
  { latitude: 36.8040, longitude: -2.1700 },
  { latitude: 36.8110, longitude: -2.1610 },
  { latitude: 36.8180, longitude: -2.1520 },
  { latitude: 36.8250, longitude: -2.1430 },
  { latitude: 36.8310, longitude: -2.1350 },
  { latitude: 36.8370, longitude: -2.1260 },
  { latitude: 36.8420, longitude: -2.1180 },
  { latitude: 36.8480, longitude: -2.1090 },
  { latitude: 36.8530, longitude: -2.1000 },
  { latitude: 36.8590, longitude: -2.0910 },
  { latitude: 36.8650, longitude: -2.0820 },
  { latitude: 36.8710, longitude: -2.0730 },
  { latitude: 36.8780, longitude: -2.0620 },
  { latitude: 36.8840, longitude: -2.0510 },
  { latitude: 36.8900, longitude: -2.0400 },
  { latitude: 36.8950, longitude: -2.0290 },
  { latitude: 36.9010, longitude: -2.0180 },
  { latitude: 36.9060, longitude: -2.0080 },
];

function calculateBearing(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const y = Math.sin(toRad(destLng - startLng)) * Math.cos(toRad(destLat));
  const x =
    Math.cos(toRad(startLat)) * Math.sin(toRad(destLat)) -
    Math.sin(toRad(startLat)) * Math.cos(toRad(destLat)) * Math.cos(toRad(destLng - startLng));

  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

class DrivingSimulationService {
  private timer: any = null;
  private isSimulating: boolean = false;
  private coordinates: SimulatedCoordinate[] = [];
  private currentIndex: number = 0;
  private currentSpeedKmH: number = 0;
  private targetSpeedKmH: number = 72; // Velocidad de crucero estándar camper
  private callback: SimulationCallback | null = null;
  private onEndCallback: (() => void) | null = null;

  public isActive(): boolean {
    return this.isSimulating;
  }

  public startSimulation(
    routeCoordinates?: SimulatedCoordinate[],
    onUpdate?: SimulationCallback,
    onEnd?: () => void
  ): boolean {
    if (this.isSimulating) {
      this.stopSimulation();
    }

    this.coordinates =
      routeCoordinates && routeCoordinates.length >= 2
        ? routeCoordinates
        : DEFAULT_SCENIC_COASTAL_ROUTE;

    this.callback = onUpdate || null;
    this.onEndCallback = onEnd || null;
    this.currentIndex = 0;
    this.currentSpeedKmH = 20; // Inicia a baja velocidad y acelera
    this.isSimulating = true;

    this.timer = setInterval(() => {
      this.tick();
    }, 600);

    return true;
  }

  private tick() {
    if (!this.isSimulating || this.currentIndex >= this.coordinates.length - 1) {
      this.stopSimulation();
      if (this.onEndCallback) this.onEndCallback();
      return;
    }

    const currentPoint = this.coordinates[this.currentIndex];
    const nextPoint = this.coordinates[this.currentIndex + 1];

    // Rumbo hacia el siguiente punto de la calzada
    const bearing = calculateBearing(
      currentPoint.latitude,
      currentPoint.longitude,
      nextPoint.latitude,
      nextPoint.longitude
    );

    // Aceleración gradual hasta velocidad crucero
    if (this.currentSpeedKmH < this.targetSpeedKmH) {
      this.currentSpeedKmH = Math.min(this.targetSpeedKmH, this.currentSpeedKmH + 6);
    }

    const speedMetersPerSecond = this.currentSpeedKmH / 3.6;
    const progressPercent = Math.round((this.currentIndex / (this.coordinates.length - 1)) * 100);

    if (this.callback) {
      this.callback({
        latitude: currentPoint.latitude,
        longitude: currentPoint.longitude,
        speed: speedMetersPerSecond,
        heading: bearing,
        progressPercent,
      });
    }

    this.currentIndex++;
  }

  public stopSimulation(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isSimulating = false;
    this.callback = null;
  }
}

export const drivingSimulationService = new DrivingSimulationService();
