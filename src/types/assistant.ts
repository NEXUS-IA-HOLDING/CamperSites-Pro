/**
 * Tipos para el Asistente de Ruta Inteligente de Vehículos Especiales
 * CamperSites Pro - Camper, Camión y Reparto
 */

// Modos de perfil de vehículo (Camper, Moto, 4x4, Coche, Camión, Reparto y SOS Supervivencia)
export type VehicleProfileMode =
  | 'camper'
  | 'moto'
  | 'offroad_4x4'
  | 'car'
  | 'truck'
  | 'delivery'
  | 'sos_lost';

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

// Estilos de mapa disponibles (Satelital puro, Híbrido HD con etiquetas, Táctico Dark, Topográfico 3D y Día estándar)
export type MapStyleType = 'satellite' | 'hybrid' | 'dark' | 'topo' | 'day';

// Modos de aviso de audio
export type AudioAlertMode = 'multimedia' | 'bluetooth_hfp' | 'silent_visual';

// Modelos de icono de posición personalizado en el mapa (13 modelos 3D multimodo)
export type VehicleCursorType =
  | 'arrow'
  | 'camper_arca'
  | 'camper_van'
  | 'vw_california'
  | 'overland_4x4'
  | 'moto_trail'
  | 'moto_sport'
  | 'car_suv'
  | 'car_sport'
  | 'truck_hgv'
  | 'delivery_van'
  | 'bicycle_mtb'
  | 'sos_beacon';

export interface VehicleCursorConfig {
  type: VehicleCursorType;
  label: string;
  subtitle?: string;
  icon: string;
  badge: string;
  color: string;
  haloColor: string;
}

export const VEHICLE_CURSORS: Record<VehicleCursorType, VehicleCursorConfig> = {
  camper_arca: {
    type: 'camper_arca',
    label: 'Autocaravana Capuchina',
    subtitle: 'Gran volumen con placa solar y claraboyas',
    icon: 'rv-truck',
    badge: '🚐',
    color: '#10B981',
    haloColor: 'rgba(16, 185, 129, 0.4)',
  },
  camper_van: {
    type: 'camper_van',
    label: 'Camper Van Gran Volumen',
    subtitle: 'Furgón camperizado L2H2 / L3H2',
    icon: 'van-utility',
    badge: '🚐',
    color: '#059669',
    haloColor: 'rgba(5, 150, 105, 0.4)',
  },
  vw_california: {
    type: 'vw_california',
    label: 'Camper Clásica Bicolor',
    subtitle: 'Estilo California / Bulli con techo elevable',
    icon: 'caravan',
    badge: '🏖️',
    color: '#38BDF8',
    haloColor: 'rgba(56, 189, 248, 0.4)',
  },
  overland_4x4: {
    type: 'overland_4x4',
    label: '4x4 Overlanding Off-Road',
    subtitle: 'Todo terreno con baca, rueda trasera y LED',
    icon: 'jeep',
    badge: '🚙',
    color: '#84CC16',
    haloColor: 'rgba(132, 204, 22, 0.4)',
  },
  moto_trail: {
    type: 'moto_trail',
    label: 'Moto Trail / Enduro Monte',
    subtitle: 'Ideal para pistas forestales, monte y puertos',
    icon: 'motorbike',
    badge: '🏍️',
    color: '#F97316',
    haloColor: 'rgba(249, 115, 22, 0.4)',
  },
  moto_sport: {
    type: 'moto_sport',
    label: 'Moto Touring / Carretera',
    subtitle: 'Rutas asfálticas reviradas y viajes largos',
    icon: 'motorbike-electric',
    badge: '🏁',
    color: '#EC4899',
    haloColor: 'rgba(236, 72, 153, 0.4)',
  },
  car_suv: {
    type: 'car_suv',
    label: 'Coche Turismo / SUV Familiar',
    subtitle: 'Viajes por carretera, escapadas y uso diario',
    icon: 'car-estate',
    badge: '🚗',
    color: '#6366F1',
    haloColor: 'rgba(99, 102, 241, 0.4)',
  },
  car_sport: {
    type: 'car_sport',
    label: 'Coche Deportivo GT',
    subtitle: 'Chasis aerodinámico de alto rendimiento',
    icon: 'car-sports',
    badge: '🏎️',
    color: '#EF4444',
    haloColor: 'rgba(239, 68, 68, 0.4)',
  },
  truck_hgv: {
    type: 'truck_hgv',
    label: 'Camión Tráiler Pesado',
    subtitle: 'Transporte profesional +3.5t con control de gálibo',
    icon: 'truck',
    badge: '🚛',
    color: '#F59E0B',
    haloColor: 'rgba(245, 158, 11, 0.4)',
  },
  delivery_van: {
    type: 'delivery_van',
    label: 'Courier / Furgón de Reparto',
    subtitle: 'Logística urbana y rutas multiparada',
    icon: 'truck-fast',
    badge: '📦',
    color: '#06B6D4',
    haloColor: 'rgba(6, 182, 212, 0.4)',
  },
  bicycle_mtb: {
    type: 'bicycle_mtb',
    label: 'Bicicleta MTB / Cicloturismo',
    subtitle: 'Senderos, vías verdes y rutas bikepacking',
    icon: 'bicycle',
    badge: '🚵',
    color: '#14B8A6',
    haloColor: 'rgba(20, 184, 166, 0.4)',
  },
  sos_beacon: {
    type: 'sos_beacon',
    label: 'Explorador SOS / A Pie',
    subtitle: 'Modo rescate, senderismo y orientación si te pierdes',
    icon: 'lifebuoy',
    badge: '🆘',
    color: '#EF4444',
    haloColor: 'rgba(239, 68, 68, 0.55)',
  },
  arrow: {
    type: 'arrow',
    label: 'Flecha Táctica Neón 3D',
    subtitle: 'Puntero GPS minimalista de máxima precisión',
    icon: 'navigation',
    badge: '▲',
    color: '#0284C7',
    haloColor: 'rgba(2, 132, 199, 0.4)',
  },
};

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

// Detección de gálibo / puente bajo / barrera de altura en ruta
export type ClearanceHazardType = 'bridge' | 'tunnel' | 'height_barrier' | 'historic_arch';

export interface ClearanceHazard {
  id: string;
  latitude: number;
  longitude: number;
  maxAllowedHeight: number; // metros
  description: string;
  roadName?: string;
  hazardType?: ClearanceHazardType;
  spotName?: string;
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
