/**
 * CamperRewardsService.ts
 * Sistema de Gamificación, Puntos y Pirámide de Recompensas de CamperSites Pro
 *
 * Modelo económico equilibrado y blindado contra exploits:
 * - Conducción Segura: Bloqueo estricto de anuncios, obtención y canje de puntos si velocidad > 0.5 km/h.
 * - Validación Geofence Haversine para contribuciones comunitarias (300m fuel, 400m fotos, 500m radares).
 * - Límite diario de 150 puntos por acciones comunitarias y cooldowns anti-spam.
 * - Límite de 3 anuncios recompensados al día (con 60s de cooldown entre anuncios).
 * - Salvaguarda matemática del valor de la suscripción Pro:
 *   * Pase 3h Radares: 120 pts (3 horas de monitorización DGT).
 *   * 1 Provincia Offline: 350 pts (otorga 1 crédito de descarga en offlineProvinceCredits).
 *   * Cupón 20% Dto: 500 pts (genera código único CAMPER20-XXXX).
 *   * Pases Pro de fin de semana (900 pts) y mensual (2500 pts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';

export type CamperTier = 'rookie' | 'explorer' | 'overlander' | 'master_nomad';

export interface CamperRewardTierInfo {
  tier: CamperTier;
  label: string;
  minPoints: number;
  badge: string;
  perks: string[];
  pointsMultiplier: number;
}

export type RewardType =
  | 'speed_radar_pass'
  | 'offline_province'
  | 'weekend_pro'
  | 'sub_discount'
  | 'month_pro';

export interface RewardRedeemable {
  id: string;
  title: string;
  description: string;
  costPoints: number;
  icon: string;
  type: RewardType;
  durationHours?: number;
}

export interface ActivePassItem {
  type: string;
  expiresAt: number; // timestamp ms
  code?: string;
  name?: string;
  activatedAt?: number;
}

export interface RewardsProfile {
  totalPoints: number;
  availablePoints: number;
  lifetimeAdsWatched: number;
  adsWatchedToday: number;
  lastAdDate: string;
  lastAdTimestamp?: number;
  communityPointsEarnedToday: number;
  lastCommunityPointsDate: string;
  lastActionTimestamps: Record<string, number>;
  actionCountToday: Record<string, number>;
  claimedTargetIdsToday: string[];
  offlineProvinceCredits: number;
  discountCoupons: string[];
  activePasses: ActivePassItem[];
}

export type CommunityActionType =
  | 'report_radar'
  | 'upload_photo'
  | 'update_fuel_price'
  | 'detailed_review';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface CommunityPointClaim {
  action: CommunityActionType;
  currentSpeedKmH: number;
  userCoords?: GeoCoordinates;
  targetCoords?: GeoCoordinates;
  targetId?: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = '@campersites_rewards_profile';
export const STATIONARY_SPEED_THRESHOLD_KMH = 0.5; // Tolerancia a deriva GPS estática
export const MAX_DAILY_ADS = 3;
export const AD_REWARD_POINTS = 15;
export const AD_COOLDOWN_MS = 60000; // 60 segundos entre anuncios
export const MAX_DAILY_COMMUNITY_POINTS = 150; // Límite diario estricto de puntos comunitarios

// Geofence en metros según tipo de acción
export const GEOFENCE_LIMITS_METERS: Record<CommunityActionType, number> = {
  update_fuel_price: 300,
  upload_photo: 400,
  report_radar: 500,
  detailed_review: 500,
};

// Cooldowns mínimos entre acciones del mismo tipo (ms)
export const ACTION_COOLDOWNS_MS: Record<CommunityActionType, number> = {
  report_radar: 180000, // 3 minutos
  upload_photo: 30000,  // 30 segundos
  update_fuel_price: 60000, // 1 minuto
  detailed_review: 60000,   // 1 minuto
};

// Límites diarios de acciones por tipo
export const ACTION_DAILY_MAX: Record<CommunityActionType, number> = {
  report_radar: 5,
  upload_photo: 5,
  update_fuel_price: 3,
  detailed_review: 3,
};

export const REWARD_TIERS: Record<CamperTier, CamperRewardTierInfo> = {
  rookie: {
    tier: 'rookie',
    label: 'Rookie Camper',
    minPoints: 0,
    badge: '🚐',
    perks: ['Acceso básico a comunidad', 'Reporte de radares', '1x puntos por acción'],
    pointsMultiplier: 1.0,
  },
  explorer: {
    tier: 'explorer',
    label: 'Explorer Van',
    minPoints: 250,
    badge: '🏕️',
    perks: ['Insignia Explorer en perfil', 'Filtro rápido de áreas con vaciado', '1.1x puntos por reporte'],
    pointsMultiplier: 1.1,
  },
  overlander: {
    tier: 'overlander',
    label: 'Overlander Pro',
    minPoints: 750,
    badge: '⛰️',
    perks: ['Prioridad de verificación de reportes', '10% de descuento automático en reservas B2B', '1.25x puntos'],
    pointsMultiplier: 1.25,
  },
  master_nomad: {
    tier: 'master_nomad',
    label: 'Master Nomad',
    minPoints: 2000,
    badge: '👑',
    perks: ['Estatus VIP en áreas colaboradoras', 'Acceso anticipado a nuevas rutas', '1.5x puntos acumulados'],
    pointsMultiplier: 1.5,
  },
};

export const REDEEM_CATALOG: RewardRedeemable[] = [
  {
    id: 'pass_radar_3h',
    title: 'Pase Radares DGT Tramo (3 Horas)',
    description: 'Monitorización de velocidad media y velocímetro de cabina durante 3h de viaje.',
    costPoints: 120,
    icon: 'radar',
    type: 'speed_radar_pass',
    durationHours: 3,
  },
  {
    id: 'pass_offline_province',
    title: 'Descarga 1 Provincia Offline',
    description: 'Descarga satélite y puntos de servicio de 1 provincia para viajar sin datos.',
    costPoints: 350,
    icon: 'download-circle-outline',
    type: 'offline_province',
  },
  {
    id: 'pass_discount_annual',
    title: 'Cupón 20% Dto. Suscripción Anual',
    description: 'Aplica un 20% de descuento directo en el plan CamperSites Pro Anual.',
    costPoints: 500,
    icon: 'ticket-percent-outline',
    type: 'sub_discount',
  },
  {
    id: 'pass_weekend_pro',
    title: 'Pase Fin de Semana Pro (48 Horas)',
    description: 'Desbloquea navegación de gálibo y alertas avanzadas durante todo el fin de semana.',
    costPoints: 900,
    icon: 'shield-star-outline',
    type: 'weekend_pro',
    durationHours: 48,
  },
  {
    id: 'pass_month_pro',
    title: '1 Mes Completo Pro Gratis',
    description: 'Acceso total a todas las funciones Pro durante 30 días naturales.',
    costPoints: 2500,
    icon: 'crown-outline',
    type: 'month_pro',
    durationHours: 720,
  },
];

/**
 * Función Haversine para cálculo de distancia geodésica exacta en metros
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Comprueba si el vehículo está en movimiento con tolerancia a deriva GPS estática (0.5 km/h)
 */
export function isVehicleMoving(speedKmH: number): boolean {
  return typeof speedKmH === 'number' && speedKmH > STATIONARY_SPEED_THRESHOLD_KMH;
}

export class CamperRewardsServiceImpl {
  private profile: RewardsProfile = {
    totalPoints: 50, // Puntos de bienvenida
    availablePoints: 50,
    lifetimeAdsWatched: 0,
    adsWatchedToday: 0,
    lastAdDate: new Date().toISOString().slice(0, 10),
    lastAdTimestamp: 0,
    communityPointsEarnedToday: 0,
    lastCommunityPointsDate: new Date().toISOString().slice(0, 10),
    lastActionTimestamps: {},
    actionCountToday: {},
    claimedTargetIdsToday: [],
    offlineProvinceCredits: 0,
    discountCoupons: [],
    activePasses: [],
  };

  private isLoaded = false;

  constructor() {
    this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const today = new Date().toISOString().slice(0, 10);

        // Reset de anuncios diarios si es nuevo día
        if (parsed.lastAdDate !== today) {
          parsed.adsWatchedToday = 0;
          parsed.lastAdDate = today;
        }

        // Reset de límites comunitarios diarios si es nuevo día
        if (parsed.lastCommunityPointsDate !== today) {
          parsed.communityPointsEarnedToday = 0;
          parsed.lastCommunityPointsDate = today;
          parsed.actionCountToday = {};
          parsed.claimedTargetIdsToday = [];
        }

        // Asegurar campos robustos retrocompatibles
        parsed.lastActionTimestamps = parsed.lastActionTimestamps || {};
        parsed.actionCountToday = parsed.actionCountToday || {};
        parsed.claimedTargetIdsToday = parsed.claimedTargetIdsToday || [];
        parsed.offlineProvinceCredits = parsed.offlineProvinceCredits || 0;
        parsed.discountCoupons = parsed.discountCoupons || [];

        // Limpiar pases caducados
        const now = Date.now();
        parsed.activePasses = (parsed.activePasses || []).filter(
          (p: ActivePassItem) => p.expiresAt > now
        );

        this.profile = {
          ...this.profile,
          ...parsed,
        };
      }
      this.isLoaded = true;
    } catch (e) {
      Logger.error('CamperRewardsService', 'Error loading rewards profile', e);
      this.isLoaded = true;
    }
  }

  private async saveProfile(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      Logger.error('CamperRewardsService', 'Error saving rewards profile', e);
    }
  }

  public async getProfile(): Promise<RewardsProfile> {
    if (!this.isLoaded) await this.loadProfile();
    return { ...this.profile };
  }

  public getTier(points: number): CamperRewardTierInfo {
    if (points >= REWARD_TIERS.master_nomad.minPoints) return REWARD_TIERS.master_nomad;
    if (points >= REWARD_TIERS.overlander.minPoints) return REWARD_TIERS.overlander;
    if (points >= REWARD_TIERS.explorer.minPoints) return REWARD_TIERS.explorer;
    return REWARD_TIERS.rookie;
  }

  /**
   * Registra el visionado de un anuncio de recompensa con control estricto de seguridad:
   * Solo disponible si el vehículo está totalmente detenido (speedKmH <= 0.5 km/h).
   */
  public async watchRewardedAd(currentSpeedKmH: number): Promise<{
    success: boolean;
    pointsEarned: number;
    remainingToday: number;
    message: string;
  }> {
    if (!this.isLoaded) await this.loadProfile();

    // 1. Bloqueo estricto de seguridad vial
    if (isVehicleMoving(currentSpeedKmH)) {
      Logger.warn(
        'CamperRewardsService',
        `Blocked ad watch: vehicle moving at ${currentSpeedKmH.toFixed(1)} km/h`
      );
      return {
        success: false,
        pointsEarned: 0,
        remainingToday: Math.max(0, MAX_DAILY_ADS - this.profile.adsWatchedToday),
        message: 'Por tu seguridad vial, los anuncios solo pueden verse con el vehículo totalmente estacionado.',
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    if (this.profile.lastAdDate !== today) {
      this.profile.adsWatchedToday = 0;
      this.profile.lastAdDate = today;
    }

    // 2. Límite diario de anuncios
    if (this.profile.adsWatchedToday >= MAX_DAILY_ADS) {
      return {
        success: false,
        pointsEarned: 0,
        remainingToday: 0,
        message: 'Has alcanzado el límite diario de 3 anuncios recompensados. Vuelve mañana o suma puntos colaborando.',
      };
    }

    // 3. Cooldown anti-spam entre anuncios (60s)
    const now = Date.now();
    const elapsedSinceLastAd = now - (this.profile.lastAdTimestamp || 0);
    if (this.profile.lastAdTimestamp && elapsedSinceLastAd < AD_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((AD_COOLDOWN_MS - elapsedSinceLastAd) / 1000);
      return {
        success: false,
        pointsEarned: 0,
        remainingToday: MAX_DAILY_ADS - this.profile.adsWatchedToday,
        message: `Por favor espera ${waitSeconds}s antes de visualizar el siguiente anuncio.`,
      };
    }

    // 4. Concesión de puntos según nivel de la pirámide
    const tier = this.getTier(this.profile.totalPoints);
    const earned = Math.round(AD_REWARD_POINTS * tier.pointsMultiplier);

    this.profile.adsWatchedToday += 1;
    this.profile.lifetimeAdsWatched += 1;
    this.profile.lastAdTimestamp = now;
    this.profile.totalPoints += earned;
    this.profile.availablePoints += earned;
    await this.saveProfile();

    const remaining = MAX_DAILY_ADS - this.profile.adsWatchedToday;
    return {
      success: true,
      pointsEarned: earned,
      remainingToday: remaining,
      message: `¡+${earned} CamperPoints conseguidos! Te quedan ${remaining} anuncios hoy.`,
    };
  }

  /**
   * Suma puntos por contribuciones a la comunidad con validación geofence,
   * tasa de refresco, límite diario de 150 pts y bloqueo en movimiento.
   */
  public async addCommunityPoints(
    claimOrAction: CommunityPointClaim | CommunityActionType,
    currentSpeedKmH = 0
  ): Promise<{ success: boolean; pointsEarned: number; message: string }> {
    if (!this.isLoaded) await this.loadProfile();

    // Normalizar payload
    const claim: CommunityPointClaim =
      typeof claimOrAction === 'string'
        ? { action: claimOrAction, currentSpeedKmH }
        : claimOrAction;

    // 1. Bloqueo estricto en marcha
    if (isVehicleMoving(claim.currentSpeedKmH)) {
      Logger.warn(
        'CamperRewardsService',
        `Blocked community points claim: vehicle moving at ${claim.currentSpeedKmH.toFixed(1)} km/h`
      );
      return {
        success: false,
        pointsEarned: 0,
        message: 'Por tu seguridad vial, no puedes reclamar puntos comunitarios con el vehículo en marcha.',
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    if (this.profile.lastCommunityPointsDate !== today) {
      this.profile.communityPointsEarnedToday = 0;
      this.profile.lastCommunityPointsDate = today;
      this.profile.actionCountToday = {};
      this.profile.claimedTargetIdsToday = [];
    }

    // 2. Límite diario estricto de 150 puntos comunitarios
    if (this.profile.communityPointsEarnedToday >= MAX_DAILY_COMMUNITY_POINTS) {
      return {
        success: false,
        pointsEarned: 0,
        message: `Has alcanzado el límite diario de ${MAX_DAILY_COMMUNITY_POINTS} puntos comunitarios. Gracias por tu colaboración, vuelve mañana.`,
      };
    }

    // 3. Validación de límite por tipo de acción
    const countToday = this.profile.actionCountToday[claim.action] || 0;
    const maxActionToday = ACTION_DAILY_MAX[claim.action] || 5;
    if (countToday >= maxActionToday) {
      return {
        success: false,
        pointsEarned: 0,
        message: `Has alcanzado el límite diario de ${maxActionToday} aportaciones para esta acción.`,
      };
    }

    // 4. Cooldown anti-spam por acción
    const now = Date.now();
    const lastTimestamp = this.profile.lastActionTimestamps[claim.action] || 0;
    const requiredCooldown = ACTION_COOLDOWNS_MS[claim.action] || 30000;
    if (now - lastTimestamp < requiredCooldown) {
      const waitSec = Math.ceil((requiredCooldown - (now - lastTimestamp)) / 1000);
      return {
        success: false,
        pointsEarned: 0,
        message: `Acción enviada recientemente. Por favor espera ${waitSec}s antes de enviar otra aportación.`,
      };
    }

    // 5. Deduplicación por estación o punto objetivo
    if (claim.targetId && claim.action === 'update_fuel_price') {
      if (this.profile.claimedTargetIdsToday.includes(claim.targetId)) {
        return {
          success: false,
          pointsEarned: 0,
          message: 'Ya has registrado una actualización de precio para esta estación de combustible hoy.',
        };
      }
    }

    // 6. Validación Geofence Haversine
    if (claim.userCoords && claim.targetCoords) {
      const distanceMeters = calculateHaversineDistanceMeters(
        claim.userCoords.latitude,
        claim.userCoords.longitude,
        claim.targetCoords.latitude,
        claim.targetCoords.longitude
      );
      const maxAllowedDistance = GEOFENCE_LIMITS_METERS[claim.action] || 500;

      if (distanceMeters > maxAllowedDistance) {
        Logger.warn(
          'CamperRewardsService',
          `Geofence validation failed for ${claim.action}: distance ${distanceMeters}m > allowed ${maxAllowedDistance}m`
        );
        return {
          success: false,
          pointsEarned: 0,
          message: `Ubicación fuera de rango: estás a ${distanceMeters}m (máximo permitido: ${maxAllowedDistance}m). Debes estar físicamente en el lugar.`,
        };
      }
    } else if (claim.action === 'update_fuel_price' && (!claim.userCoords || !claim.targetCoords)) {
      // Para precio de combustible es indispensable la comprobación de proximidad
      return {
        success: false,
        pointsEarned: 0,
        message: 'Se requieren coordenadas GPS del usuario y de la gasolinera para validar el precio.',
      };
    }

    // 7. Cálculo de puntos con multiplicador del nivel actual
    const pointsMap: Record<CommunityActionType, number> = {
      report_radar: 25,
      upload_photo: 20,
      update_fuel_price: 15,
      detailed_review: 30,
    };
    const basePoints = pointsMap[claim.action] || 15;
    const tier = this.getTier(this.profile.totalPoints);
    let earned = Math.round(basePoints * tier.pointsMultiplier);

    // Ajustar si se supera el tope diario de 150 puntos
    const potentialTotal = this.profile.communityPointsEarnedToday + earned;
    if (potentialTotal > MAX_DAILY_COMMUNITY_POINTS) {
      earned = MAX_DAILY_COMMUNITY_POINTS - this.profile.communityPointsEarnedToday;
    }

    if (earned <= 0) {
      return {
        success: false,
        pointsEarned: 0,
        message: `Has alcanzado el límite diario de ${MAX_DAILY_COMMUNITY_POINTS} puntos comunitarios.`,
      };
    }

    // 8. Actualizar estado y persistir
    this.profile.communityPointsEarnedToday += earned;
    this.profile.totalPoints += earned;
    this.profile.availablePoints += earned;
    this.profile.lastActionTimestamps[claim.action] = now;
    this.profile.actionCountToday[claim.action] = countToday + 1;
    if (claim.targetId) {
      this.profile.claimedTargetIdsToday.push(claim.targetId);
    }

    await this.saveProfile();

    return {
      success: true,
      pointsEarned: earned,
      message: `¡+${earned} CamperPoints por tu aportación a la comunidad! (${this.profile.communityPointsEarnedToday}/${MAX_DAILY_COMMUNITY_POINTS} pts hoy).`,
    };
  }

  /**
   * Canje de recompensas del catálogo con salvaguarda de valor Pro y bloqueo en marcha
   */
  public async redeemReward(
    rewardId: string,
    currentSpeedKmH = 0
  ): Promise<{ success: boolean; couponCode?: string; message: string }> {
    if (!this.isLoaded) await this.loadProfile();

    // 1. Bloqueo estricto de seguridad vial
    if (isVehicleMoving(currentSpeedKmH)) {
      Logger.warn(
        'CamperRewardsService',
        `Blocked reward redemption: vehicle moving at ${currentSpeedKmH.toFixed(1)} km/h`
      );
      return {
        success: false,
        message: 'Por tu seguridad vial, no puedes canjear recompensas con el vehículo en movimiento.',
      };
    }

    const reward = REDEEM_CATALOG.find((r) => r.id === rewardId);
    if (!reward) return { success: false, message: 'Recompensa no encontrada.' };

    if (this.profile.availablePoints < reward.costPoints) {
      return {
        success: false,
        message: `Necesitas ${reward.costPoints} puntos (tienes ${this.profile.availablePoints}).`,
      };
    }

    // 2. Deducir puntos disponibles
    this.profile.availablePoints -= reward.costPoints;

    let couponCode: string | undefined;

    // 3. Aplicar beneficios según el tipo de recompensa
    if (reward.durationHours) {
      // Pases temporales (Pase 3h Radares, Finde Pro, Mes Pro)
      const expiresAt = Date.now() + reward.durationHours * 3600 * 1000;
      this.profile.activePasses.push({
        type: reward.type,
        expiresAt,
        name: reward.title,
        activatedAt: Date.now(),
      });
    } else if (reward.type === 'offline_province') {
      // Crédito de descarga de provincia offline (sin caducidad inmediata)
      this.profile.offlineProvinceCredits = (this.profile.offlineProvinceCredits || 0) + 1;
      this.profile.activePasses.push({
        type: 'offline_province',
        expiresAt: Date.now() + 365 * 24 * 3600 * 1000, // Válido 1 año para usar
        name: reward.title,
        activatedAt: Date.now(),
      });
    } else if (reward.type === 'sub_discount') {
      // Cupón 20% Dto: Generar código único CAMPER20-XXXX
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      couponCode = `CAMPER20-${randomSuffix}`;
      this.profile.discountCoupons = [...(this.profile.discountCoupons || []), couponCode];
      this.profile.activePasses.push({
        type: 'sub_discount',
        code: couponCode,
        expiresAt: Date.now() + 30 * 24 * 3600 * 1000, // 30 días de validez
        name: `Cupón 20% Dto (${couponCode})`,
        activatedAt: Date.now(),
      });
    }

    await this.saveProfile();

    if (couponCode) {
      return {
        success: true,
        couponCode,
        message: `¡Cupón ${couponCode} generado con éxito! Aplícalo para disfrutar del 20% de descuento en tu suscripción Pro.`,
      };
    }

    if (reward.type === 'offline_province') {
      return {
        success: true,
        message: `¡${reward.title} canjeado! Tienes ${this.profile.offlineProvinceCredits} crédito(s) de provincia offline disponibles.`,
      };
    }

    return {
      success: true,
      message: `¡${reward.title} activado con éxito!`,
    };
  }

  /**
   * Verifica si un pase temporal está actualmente activo
   */
  public hasActivePass(passType: RewardType | string): boolean {
    const now = Date.now();

    // Verificación especial para descarga offline si quedan créditos
    if (passType === 'offline_province' && (this.profile.offlineProvinceCredits || 0) > 0) {
      return true;
    }

    return this.profile.activePasses.some((p) => p.type === passType && p.expiresAt > now);
  }

  /**
   * Obtiene la información del pase activo si existe
   */
  public getActivePass(passType: string): ActivePassItem | undefined {
    const now = Date.now();
    return this.profile.activePasses.find((p) => p.type === passType && p.expiresAt > now);
  }

  /**
   * Obtiene la cantidad de créditos de provincia offline disponibles
   */
  public getOfflineProvinceCredits(): number {
    return this.profile.offlineProvinceCredits || 0;
  }

  /**
   * Consume un crédito de descarga de provincia offline
   */
  public async consumeOfflineProvinceCredit(): Promise<boolean> {
    if (!this.isLoaded) await this.loadProfile();
    if ((this.profile.offlineProvinceCredits || 0) > 0) {
      this.profile.offlineProvinceCredits -= 1;
      await this.saveProfile();
      return true;
    }
    return false;
  }

  /**
   * Obtiene los códigos promocionales disponibles
   */
  public getDiscountCoupons(): string[] {
    return [...(this.profile.discountCoupons || [])];
  }

  /**
   * Resetea límites diarios (utilidad para tests y debugging)
   */
  public async resetDailyLimitsForTesting(): Promise<void> {
    this.profile.adsWatchedToday = 0;
    this.profile.lastAdTimestamp = 0;
    this.profile.communityPointsEarnedToday = 0;
    this.profile.actionCountToday = {};
    this.profile.claimedTargetIdsToday = [];
    this.profile.lastActionTimestamps = {};
    await this.saveProfile();
  }
}

export const camperRewardsService = new CamperRewardsServiceImpl();
