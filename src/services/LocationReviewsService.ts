/**
 * Servicio Comunitario de Reseñas y Experiencias de Usuarios
 * CamperSites-Pro: Camper, Camión y Reparto
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Logger } from '../utils/logger';

export interface LocationReview {
  id: string;
  location_id: string;
  user_id?: string;
  user_display_name: string;
  vehicle_type: 'camper' | 'truck' | 'delivery' | 'van';
  rating: number; // 1-5
  safety_rating: 'SEGURO' | 'PRECAUCION' | 'INSEGURO';
  noise_level: 'SILENCIOSO' | 'MODERADO' | 'RUIDOSO';
  verified_services: string[];
  comment: string;
  likes_count?: number;
  created_at: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  safetyScorePercentage: number;
  noiseDominant: 'SILENCIOSO' | 'MODERADO' | 'RUIDOSO';
}

const LOCAL_REVIEWS_KEY = '@camper_local_reviews_';

class LocationReviewsService {
  /**
   * Obtiene reseñas de una ubicación (remotas con fallback a caché local)
   */
  async getReviewsForLocation(locationId: string): Promise<LocationReview[]> {
    try {
      const { data, error } = await supabase
        .from('location_reviews')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        // Cachear localmente
        await AsyncStorage.setItem(
          LOCAL_REVIEWS_KEY + locationId,
          JSON.stringify(data),
        );
        return data as LocationReview[];
      }
    } catch (err) {
      Logger.warn('LocationReviews', 'Error remoto, cargando caché local', err);
    }

    // Fallback a almacenamiento local / offline
    try {
      const local = await AsyncStorage.getItem(LOCAL_REVIEWS_KEY + locationId);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      Logger.error('LocationReviews', 'Error leyendo caché local', e);
    }

    // Si no hay reseñas registradas aún en Supabase ni en caché local, retornar lista vacía limpia
    return [];
  }

  /**
   * Envía una nueva reseña comunitaria
   */
  async submitReview(review: Omit<LocationReview, 'id' | 'created_at'>): Promise<LocationReview> {
    const newReview: LocationReview = {
      ...review,
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('location_reviews').insert({
        location_id: newReview.location_id,
        user_id: newReview.user_id || null,
        user_display_name: newReview.user_display_name,
        vehicle_type: newReview.vehicle_type,
        rating: newReview.rating,
        safety_rating: newReview.safety_rating,
        noise_level: newReview.noise_level,
        verified_services: newReview.verified_services,
        comment: newReview.comment,
      });
    } catch (err) {
      Logger.warn('LocationReviews', 'Modo offline: guardando reseña localmente', err);
    }

    // Guardar en caché local inmediatamente para que el usuario la vea al instante
    try {
      const existing = await this.getReviewsForLocation(newReview.location_id);
      const updated = [newReview, ...existing];
      await AsyncStorage.setItem(
        LOCAL_REVIEWS_KEY + newReview.location_id,
        JSON.stringify(updated),
      );
    } catch (e) {
      Logger.error('LocationReviews', 'Error actualizando caché local', e);
    }

    return newReview;
  }

  /**
   * Calcula el resumen estadístico de opiniones
   */
  calculateSummary(reviews: LocationReview[]): ReviewSummary {
    if (!reviews || reviews.length === 0) {
      return {
        averageRating: 5.0,
        totalReviews: 0,
        safetyScorePercentage: 100,
        noiseDominant: 'SILENCIOSO',
      };
    }

    const total = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / total;
    const safeCount = reviews.filter(r => r.safety_rating === 'SEGURO').length;
    const safetyPercent = Math.round((safeCount / total) * 100);

    const noiseCounts = reviews.reduce((acc, r) => {
      acc[r.noise_level] = (acc[r.noise_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let dominantNoise: 'SILENCIOSO' | 'MODERADO' | 'RUIDOSO' = 'SILENCIOSO';
    let maxCount = 0;
    for (const [noise, count] of Object.entries(noiseCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantNoise = noise as any;
      }
    }

    return {
      averageRating: parseFloat(avgRating.toFixed(1)),
      totalReviews: total,
      safetyScorePercentage: safetyPercent,
      noiseDominant: dominantNoise,
    };
  }
}

export const locationReviewsService = new LocationReviewsService();
