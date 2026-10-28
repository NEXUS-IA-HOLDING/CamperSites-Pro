/**
 * Community Alerts Service
 * Sistema de alertas comunitarias + puntos de reputación
 * CamperSites Pro - YRYS
 */

import { supabase } from './supabase';

// ============================================
// TIPOS
// ============================================

export type AlertType =
  | 'CONTROL_POLICIAL'
  | 'RADAR_MOVIL'
  | 'ACCIDENTE'
  | 'PELIGRO_VIA'
  | 'VEHICULO_PARADO'
  | 'OBRAS'
  | 'ANIMAL_VIA'
  | 'CONDICIONES_METEOROLOGICAS'
  | 'TRAFICO_DENSO'
  | 'NIEBLA'
  | 'LLUVIA_INTENSA'
  | 'ATASCO'
  | 'OBJETO_CALZADA'
  | 'CARRETERA_MAL_ESTADO';

export type AlertSeverity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type AlertStatus = 'ACTIVE' | 'EXPIRED' | 'FAKE' | 'CONFIRMED';
export type TrustLevel = 'NOVATO' | 'EXPLORADOR' | 'GUARDIAN' | 'VETERANO' | 'LEYENDA';

export interface CommunityAlert {
  id: string;
  reporter_id: string;
  reporter_trust_score: number;
  alert_type: AlertType;
  latitude: number;
  longitude: number;
  road: string;
  direction: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  confirmations: number;
  denials: number;
  confidence_score: number;
  radius_meters?: number;
  expires_at: string;
  created_at: string;
}

export interface UserTrustProfile {
  trust_score: number;
  trust_level: TrustLevel;
  total_points: number;
  alerts_created: number;
  alerts_confirmed: number;
  alerts_accuracy: number;
  streak_days: number;
}

export interface PointTransaction {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

// ============================================
// CONFIGURACIÓN DE ALERTAS
// ============================================

export const ALERT_CONFIG: Record<AlertType, {
  icon: string;
  color: string;
  label: string;
  defaultSeverity: AlertSeverity;
  expiresMinutes: number;
  alertDistanceKm: number;
}> = {
  CONTROL_POLICIAL: {
    icon: 'shield-alert',
    color: '#FF6F00',
    label: 'Control Policial',
    defaultSeverity: 'ALTA',
    expiresMinutes: 120,
    alertDistanceKm: 5,
  },
  RADAR_MOVIL: {
    icon: 'radar',
    color: '#D32F2F',
    label: 'Radar Móvil',
    defaultSeverity: 'ALTA',
    expiresMinutes: 180,
    alertDistanceKm: 2,
  },
  ACCIDENTE: {
    icon: 'car-emergency',
    color: '#B71C1C',
    label: 'Accidente',
    defaultSeverity: 'CRITICA',
    expiresMinutes: 60,
    alertDistanceKm: 3,
  },
  PELIGRO_VIA: {
    icon: 'alert-octagon',
    color: '#E65100',
    label: 'Peligro en Vía',
    defaultSeverity: 'MEDIA',
    expiresMinutes: 120,
    alertDistanceKm: 2,
  },
  VEHICULO_PARADO: {
    icon: 'car-brake-alert',
    color: '#F57C00',
    label: 'Vehículo Parado',
    defaultSeverity: 'MEDIA',
    expiresMinutes: 60,
    alertDistanceKm: 1,
  },
  OBRAS: {
    icon: 'hammer-wrench',
    color: '#FF8F00',
    label: 'Obras',
    defaultSeverity: 'BAJA',
    expiresMinutes: 480,
    alertDistanceKm: 2,
  },
  ANIMAL_VIA: {
    icon: 'paw',
    color: '#6D4C41',
    label: 'Animal en Vía',
    defaultSeverity: 'ALTA',
    expiresMinutes: 30,
    alertDistanceKm: 1,
  },
  CONDICIONES_METEOROLOGICAS: {
    icon: 'weather-lightning-rainy',
    color: '#1565C0',
    label: 'Mal Tiempo',
    defaultSeverity: 'MEDIA',
    expiresMinutes: 240,
    alertDistanceKm: 5,
  },
  TRAFICO_DENSO: {
    icon: 'car-multiple',
    color: '#FFB300',
    label: 'Tráfico Denso',
    defaultSeverity: 'MEDIA',
    expiresMinutes: 60,
    alertDistanceKm: 2,
  },
  NIEBLA: {
    icon: 'weather-fog',
    color: '#90A4AE',
    label: 'Niebla',
    defaultSeverity: 'ALTA',
    expiresMinutes: 120,
    alertDistanceKm: 3,
  },
  LLUVIA_INTENSA: {
    icon: 'weather-pouring',
    color: '#0288D1',
    label: 'Lluvia Intensa',
    defaultSeverity: 'MEDIA',
    expiresMinutes: 90,
    alertDistanceKm: 3,
  },
  ATASCO: {
    icon: 'traffic-light',
    color: '#E64A19',
    label: 'Atasco',
    defaultSeverity: 'ALTA',
    expiresMinutes: 45,
    alertDistanceKm: 2,
  },
  OBJETO_CALZADA: {
    icon: 'alert-box',
    color: '#F57C00',
    label: 'Objeto en Calzada',
    defaultSeverity: 'ALTA',
    expiresMinutes: 45,
    alertDistanceKm: 1,
  },
  CARRETERA_MAL_ESTADO: {
    icon: 'road-variant',
    color: '#795548',
    label: 'Carretera Mal Estado',
    defaultSeverity: 'MEDIA',
    expiresMinutes: 720,
    alertDistanceKm: 2,
  },
};

// ============================================
// NIVELES DE CONFIANZA
// ============================================

export const TRUST_LEVELS: Record<TrustLevel, {
  minScore: number;
  label: string;
  icon: string;
  color: string;
  perks: string;
}> = {
  NOVATO: {
    minScore: 0,
    label: 'Novato',
    icon: 'account',
    color: '#9E9E9E',
    perks: 'Reportar alertas básicas (requieren verificación)',
  },
  EXPLORADOR: {
    minScore: 150,
    label: 'Explorador',
    icon: 'compass',
    color: '#1976D2',
    perks: 'Alertas visibles + votar otras alertas',
  },
  GUARDIAN: {
    minScore: 500,
    label: 'Guardián',
    icon: 'shield-check',
    color: '#2E7D32',
    perks: 'Alertas priorizadas + badge verificado',
  },
  VETERANO: {
    minScore: 1500,
    label: 'Veterano',
    icon: 'star',
    color: '#FF6F00',
    perks: 'Alta confianza + moderación + rutas premium',
  },
  LEYENDA: {
    minScore: 5000,
    label: 'Leyenda',
    icon: 'crown',
    color: '#FFD700',
    perks: 'Máxima confianza + alertas permanentes + beta tester',
  },
};

// ============================================
// PUNTOS POR ACCIÓN
// ============================================

export const POINTS_TABLE = {
  ALERT_CREATED: 10,
  FIRST_ALERT: 25,
  ALERT_CONFIRMED: 15,
  ALERT_CONFIRMED_5X: 25,
  ALERT_CONFIRMED_10X: 50,
  VOTED_CONFIRM: 3,
  VOTED_DENY: 2,
  ALERT_MARKED_FAKE: -20,
  STREAK_3_DAYS: 30,
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500,
  LEVEL_UP: 50,
  RADAR_VERIFIED: 5,
  DAILY_BONUS: 5,
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Obtener alertas activas cercanas a una posición
 */
export async function getNearbyAlerts(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
): Promise<CommunityAlert[]> {
  // Calcular bounding box aproximado
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(latitude * (Math.PI / 180)));

  const { data, error } = await supabase
    .from('community_alerts')
    .select('*')
    .in('status', ['ACTIVE', 'CONFIRMED'])
    .gte('latitude', latitude - latDelta)
    .lte('latitude', latitude + latDelta)
    .gte('longitude', longitude - lngDelta)
    .lte('longitude', longitude + lngDelta)
    .gte('expires_at', new Date().toISOString())
    .order('confidence_score', { ascending: false });

  if (error) {
    console.error('Error fetching nearby alerts:', error);
    return [];
  }

  return data || [];
}

/**
 * Crear nueva alerta comunitaria
 */
export async function createAlert(params: {
  alertType: AlertType;
  latitude: number;
  longitude: number;
  road?: string;
  direction?: string;
  description?: string;
  severity?: AlertSeverity;
}): Promise<{ success: boolean; alert?: CommunityAlert; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión para reportar' };
  }

  // Obtener trust_score actual
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('trust_score')
    .eq('id', user.id)
    .single();

  const config = ALERT_CONFIG[params.alertType];

  const { data, error } = await supabase
    .from('community_alerts')
    .insert({
      reporter_id: user.id,
      reporter_trust_score: profile?.trust_score || 0,
      alert_type: params.alertType,
      latitude: params.latitude,
      longitude: params.longitude,
      road: params.road || '',
      direction: params.direction || '',
      description: params.description || '',
      severity: params.severity || config.defaultSeverity,
      expires_at: new Date(
        Date.now() + config.expiresMinutes * 60 * 1000,
      ).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating alert:', error);
    return { success: false, error: error.message };
  }

  return { success: true, alert: data };
}

/**
 * Votar (confirmar o negar) una alerta
 */
export async function voteAlert(
  alertId: string,
  voteType: 'CONFIRM' | 'DENY',
  voterLat?: number,
  voterLng?: number,
  distanceToAlert?: number,
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  const { error } = await supabase
    .from('alert_votes')
    .insert({
      alert_id: alertId,
      voter_id: user.id,
      vote_type: voteType,
      voter_latitude: voterLat,
      voter_longitude: voterLng,
      distance_to_alert: distanceToAlert,
    });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya has votado esta alerta' };
    }
    console.error('Error voting:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Obtener perfil de confianza del usuario
 */
export async function getUserTrustProfile(): Promise<UserTrustProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('trust_score, trust_level, total_points, alerts_created, alerts_confirmed, alerts_accuracy, streak_days')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching trust profile:', error);
    return null;
  }

  return data;
}

/**
 * Obtener historial de puntos
 */
export async function getPointHistory(limit: number = 20): Promise<PointTransaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching point history:', error);
    return [];
  }

  return data || [];
}

/**
 * Helper: obtener el nivel actual basado en el score
 */
export function getTrustLevelForScore(score: number): TrustLevel {
  if (score >= 5000) return 'LEYENDA';
  if (score >= 1500) return 'VETERANO';
  if (score >= 500) return 'GUARDIAN';
  if (score >= 150) return 'EXPLORADOR';
  return 'NOVATO';
}

/**
 * Helper: progreso al siguiente nivel (0-100)
 */
export function getProgressToNextLevel(score: number): {
  currentLevel: TrustLevel;
  nextLevel: TrustLevel | null;
  progress: number;
  pointsNeeded: number;
} {
  const levels: { level: TrustLevel; min: number }[] = [
    { level: 'NOVATO', min: 0 },
    { level: 'EXPLORADOR', min: 150 },
    { level: 'GUARDIAN', min: 500 },
    { level: 'VETERANO', min: 1500 },
    { level: 'LEYENDA', min: 5000 },
  ];

  const currentIdx = levels.findIndex(
    (l, i) => i === levels.length - 1 || score < levels[i + 1].min,
  );
  const current = levels[currentIdx];
  const next = currentIdx < levels.length - 1 ? levels[currentIdx + 1] : null;

  if (!next) {
    return {
      currentLevel: 'LEYENDA',
      nextLevel: null,
      progress: 100,
      pointsNeeded: 0,
    };
  }

  const rangeSize = next.min - current.min;
  const inRange = score - current.min;

  return {
    currentLevel: current.level,
    nextLevel: next.level,
    progress: Math.round((inRange / rangeSize) * 100),
    pointsNeeded: next.min - score,
  };
}
