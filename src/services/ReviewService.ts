/**
 * ReviewService - Gestión de Reseñas y Opiniones de la Comunidad
 * CamperSites Pro
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { LocationReview, LocationReviewStats } from '../types/assistant';
import { Logger } from '../utils/logger';

const LOCAL_REVIEWS_STORAGE_PREFIX = '@camper_location_reviews_';

export class ReviewService {
  /**
   * Obtener las reseñas de una ubicación concreta
   */
  public static async fetchLocationReviews(locationId: string): Promise<LocationReview[]> {
    try {
      const { data, error } = await supabase
        .from('location_reviews')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) {
        Logger.warn('ReviewService', 'Error fetching remote reviews, reading local cache', error);
        return this.getLocalReviews(locationId);
      }

      if (data && data.length > 0) {
        const mapped: LocationReview[] = data.map((r: any) => ({
          id: r.id,
          locationId: r.location_id,
          userId: r.user_id,
          userName: r.user_name || 'Viajero',
          rating: r.rating,
          securityLevel: r.security_level,
          noiseLevel: r.noise_level,
          comment: r.comment || '',
          verifiedServices: r.verified_services || [],
          vehicleTypeUsed: r.vehicle_type_used || 'camper',
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));

        // Guardar copia local en caché
        await this.saveLocalReviews(locationId, mapped);
        return mapped;
      }

      return this.getLocalReviews(locationId);
    } catch (e) {
      Logger.error('ReviewService', 'Exception fetching reviews', e);
      return this.getLocalReviews(locationId);
    }
  }

  /**
   * Enviar una nueva reseña o actualizar la existente
   */
  public static async submitReview(
    review: Omit<LocationReview, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; review?: LocationReview; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const userId = user?.id || review.userId || 'anon-user';
      const userName = user?.user_metadata?.display_name || review.userName || 'Viajero';

      const payload = {
        location_id: review.locationId,
        user_id: userId,
        user_name: userName,
        rating: review.rating,
        security_level: review.securityLevel,
        noise_level: review.noiseLevel,
        comment: review.comment,
        verified_services: review.verifiedServices,
        vehicle_type_used: review.vehicleTypeUsed,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('location_reviews')
        .upsert(payload, { onConflict: 'location_id,user_id' })
        .select()
        .single();

      if (error) {
        Logger.warn('ReviewService', 'Supabase error, saving offline review locally', error);
        // Fallback offline
        const localReview: LocationReview = {
          id: `local-${Date.now()}`,
          locationId: review.locationId,
          userId,
          userName,
          rating: review.rating,
          securityLevel: review.securityLevel,
          noiseLevel: review.noiseLevel,
          comment: review.comment,
          verifiedServices: review.verifiedServices,
          vehicleTypeUsed: review.vehicleTypeUsed,
          createdAt: new Date().toISOString(),
        };

        const existing = await this.getLocalReviews(review.locationId);
        const filtered = existing.filter(r => r.userId !== userId);
        const updated = [localReview, ...filtered];
        await this.saveLocalReviews(review.locationId, updated);

        return { success: true, review: localReview };
      }

      const createdReview: LocationReview = {
        id: data.id,
        locationId: data.location_id,
        userId: data.user_id,
        userName: data.user_name,
        rating: data.rating,
        securityLevel: data.security_level,
        noiseLevel: data.noise_level,
        comment: data.comment,
        verifiedServices: data.verified_services || [],
        vehicleTypeUsed: data.vehicle_type_used,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Actualizar caché
      const existing = await this.getLocalReviews(review.locationId);
      const filtered = existing.filter(r => r.id !== createdReview.id && r.userId !== createdReview.userId);
      await this.saveLocalReviews(review.locationId, [createdReview, ...filtered]);

      return { success: true, review: createdReview };
    } catch (e: any) {
      Logger.error('ReviewService', 'submitReview error', e);
      return { success: false, error: e?.message || 'Error al guardar la reseña' };
    }
  }

  /**
   * Calcular estadísticas agregadas de una lista de reseñas
   */
  public static calculateReviewStats(reviews: LocationReview[]): LocationReviewStats {
    if (!reviews || reviews.length === 0) {
      return {
        totalReviews: 0,
        avgRating: 0,
        safeCount: 0,
        cautionCount: 0,
        unsafeCount: 0,
        quietCount: 0,
        acceptableCount: 0,
        noisyCount: 0,
      };
    }

    const total = reviews.length;
    const sumRating = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = Number((sumRating / total).toFixed(1));

    const safeCount = reviews.filter(r => r.securityLevel === 'safe').length;
    const cautionCount = reviews.filter(r => r.securityLevel === 'caution').length;
    const unsafeCount = reviews.filter(r => r.securityLevel === 'unsafe').length;

    const quietCount = reviews.filter(r => r.noiseLevel === 'quiet').length;
    const acceptableCount = reviews.filter(r => r.noiseLevel === 'acceptable').length;
    const noisyCount = reviews.filter(r => r.noiseLevel === 'noisy').length;

    return {
      totalReviews: total,
      avgRating,
      safeCount,
      cautionCount,
      unsafeCount,
      quietCount,
      acceptableCount,
      noisyCount,
    };
  }

  private static async getLocalReviews(locationId: string): Promise<LocationReview[]> {
    try {
      const raw = await AsyncStorage.getItem(`${LOCAL_REVIEWS_STORAGE_PREFIX}${locationId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static async saveLocalReviews(locationId: string, reviews: LocationReview[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${LOCAL_REVIEWS_STORAGE_PREFIX}${locationId}`, JSON.stringify(reviews));
    } catch (e) {
      Logger.error('ReviewService', 'saveLocalReviews error', e);
    }
  }
}
