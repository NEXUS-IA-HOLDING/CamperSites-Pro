/**
 * Tipos para el Asistente de Ruta Inteligente de Vehículos Especiales
 * CamperSites Pro - Camper, Camión y Reparto
 */

// Modos de perfil de vehículo
export type VehicleProfileMode = 'camper' | 'truck' | 'delivery';

// Tipos de combustible y propulsión
export type FuelType = 
  | 'diesel' 
  | 'diesel_plus' 
  | 'gasolina' 
  | 'glp' 
  | 'gnc' 
  | 'electrico' 
  | 'hibrido';

// Distintivos ambientales DGT / ZBE
export type EnvironmentalBadge = '0' | 'ECO' | 'C' | 'B' | 'SIN_DISTINTIVO';

// Estilos de mapa disponibles
export type MapStyleType = 'satellite' | 'dark' | 'topo' | 'day';

// Modos de aviso de audio
export type AudioAlertMode = 'multimedia' | 'bluetooth_hfp' | 'silent_visual';

// Configuración técnica avanzada del vehículo
export interface AdvancedVehicleConfig {
  mode: VehicleProfileMode;
  name: string;
  vehicleType: string;
  
  // Dimensiones exactas
  height: number; // en metros (ej. 3.20)
  width: number;  // en metros (ej. 2.45)
  length: number; // en metros (ej. 7.50)
  weightKg: number; // peso actual / tara en kg
  maxWeightKg: number; // MMA (Masa Máxima Autorizada) en kg
  axles: number;  // número de ejes (2, 3, 4+)

  // Motor y combustible
  fuelType: FuelType;
  tankCapacity: number; // Litros o kWh
  rangeKm: number;      // Autonomía total en km
  avgConsumption: number; // L/100km o kWh/100km
  engineYear?: number;
  engineCC?: number;

  // Distintivo ambiental
  environmentalBadge: EnvironmentalBadge;

  // Preferencias de ruta
  avoidTolls: boolean;
  avoidHighways: boolean;
  avoidSteepHills: boolean;
  maxSlopePreference: 'low' | 'medium' | 'high';
}

// Configuración de alertas granulares y audio
export interface DrivingPreferences {
  radarAlertDistance: number;    // 500, 1000, 2000 (metros)
  controlAlertDistance: number;  // 2000, 5000, 10000 (metros)
  clearanceAlertDistance: number; // 500, 1000 (metros)
  audioMode: AudioAlertMode;
  hapticFeedback: boolean;
  tachographWarningsEnabled: boolean;
}

// Estado del Tacógrafo Digital (Reglamentario UE camiones)
export interface TachographStatus {
  drivingMinutes: number;         // minutos acumulados de conducción continua
  maxContinuousMinutes: number;   // límite reglamentario (270 min = 4h 30m)
  warningThresholdMinutes: number;// preaviso inteligente (225 min = 3h 45m)
  isWarningActive: boolean;       // a las 3h 45m para buscar área
  isLimitExceeded: boolean;       // superadas las 4h 30m
  isResting: boolean;             // en pausa / descanso
  sessionStartTime: number;       // timestamp de inicio
}

// Parada para Repartidor / TSP
export interface DeliveryStop {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  recipientName?: string;
  notes?: string;
  estimatedUnloadMinutes: number; // ej. 3-5 minutos de descarga
  isCompleted?: boolean;
  sequenceOrder?: number;
  estimatedArrival?: string;
}

// Resultado de optimización TSP multi-parada
export interface TSPOptimizationResult {
  orderedStops: DeliveryStop[];
  totalDistanceKm: number;
  totalDriveDurationMin: number;
  totalServiceDurationMin: number;
  totalDurationMin: number; // conducción + descargas
}

// Detección de gálibo / puente bajo en ruta
export interface ClearanceHazard {
  id: string;
  latitude: number;
  longitude: number;
  maxAllowedHeight: number; // metros
  description: string;
  roadName?: string;
}

// Reseña de la comunidad
export interface LocationReview {
  id: string;
  locationId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  securityLevel: 'safe' | 'caution' | 'unsafe';
  noiseLevel: 'quiet' | 'acceptable' | 'noisy';
  comment: string;
  verifiedServices: string[];
  vehicleTypeUsed: string;
  createdAt: string;
  updatedAt?: string;
}

// Estadísticas agregadas de reseñas para una ubicación
export interface LocationReviewStats {
  totalReviews: number;
  avgRating: number;
  safeCount: number;
  cautionCount: number;
  unsafeCount: number;
  quietCount: number;
  acceptableCount: number;
  noisyCount: number;
}
