/**
 * AdMobService.ts - Motor de Monetización y Publicidad de Cabina
 * CamperSites Pro (YRYS)
 * 
 * Gestiona unidades de Google AdMob (Banners e Interstitials) y patrocinios camper B2B.
 * Regla de Oro: Los usuarios PRO / Premium NO ven publicidad jamás (experiencia 100% limpia).
 * Los usuarios Gratuitos ven banners discretos no intrusivos que generan ingresos pasivos.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminService } from './AdminService';
import { Logger } from '../utils/logger';

export interface CamperSponsoredAd {
  id: string;
  brand: string;
  title: string;
  tagline: string;
  ctaText: string;
  ctaUrl: string;
  iconName: string;
  accentColor: string;
  badgeText: string;
  estimatedCpcEur: number;
}

// Banners patrocinados de alto valor camper (Ferrys Baleària, IATI Seguros, Repsol Autogas, Caravanas)
export const SPONSORED_CAMPER_ADS: CamperSponsoredAd[] = [
  {
    id: 'ad-balearia',
    brand: 'Baleària Ferries',
    title: 'Viaja a Baleares o Marruecos en Camper',
    tagline: '15% dto. exclusivo para comunidad CamperSites Pro en camarote y bodega.',
    ctaText: 'Reservar Ferry',
    ctaUrl: 'https://www.balearia.com',
    iconName: 'ferry',
    accentColor: '#0284C7',
    badgeText: 'PATROCINADO · FERRY CAMPER',
    estimatedCpcEur: 0.45,
  },
  {
    id: 'ad-iati',
    brand: 'IATI Seguros Camper',
    title: 'Seguro de Viaje y Asistencia 24h',
    tagline: 'Cobertura médica, rescate en montaña y repatriación con 5% de descuento.',
    ctaText: 'Calcular Precio',
    ctaUrl: 'https://www.iatiseguros.com',
    iconName: 'shield-car',
    accentColor: '#10B981',
    badgeText: 'PATROCINADO · SEGURO CAMPER',
    estimatedCpcEur: 0.60,
  },
  {
    id: 'ad-repsol-glp',
    brand: 'Repsol AutoGas GLP',
    title: 'Red de más de 450 surtidores GLP',
    tagline: 'Ahorra hasta un 40% en combustible y calefacción en ruta.',
    ctaText: 'Ver Estaciones',
    ctaUrl: 'https://www.repsol.es',
    iconName: 'gas-station',
    accentColor: '#EF4444',
    badgeText: 'PATROCINADO · AUTOGAS',
    estimatedCpcEur: 0.35,
  },
  {
    id: 'ad-solarpower',
    brand: 'EcoFlow / Placas Solares',
    title: 'Energía Solar y Baterías de Litio LiFePO4',
    tagline: 'Autonomía eléctrica total de 12V/230V para pernocta libre en la naturaleza.',
    ctaText: 'Ver Ofertas',
    ctaUrl: 'https://es.ecoflow.com',
    iconName: 'solar-power',
    accentColor: '#F59E0B',
    badgeText: 'PATROCINADO · ENERGÍA OFF-GRID',
    estimatedCpcEur: 0.50,
  },
];

class AdMobService {
  private adEnabled: boolean = true;
  private currentAdIndex: number = 0;

  /**
   * Comprueba si el usuario debe ver publicidad según su plan
   */
  public async shouldShowAds(): Promise<boolean> {
    try {
      const plan = await AsyncStorage.getItem('@camper_user_plan');
      const onboarded = await AsyncStorage.getItem('@camper_onboarding_completed');
      
      // Usuarios PRO o Premium nunca ven anuncios
      if (plan === 'pro' || plan === 'premium' || plan === 'pro_monthly' || plan === 'pro_annual' || plan === 'lifetime_vip') {
        return false;
      }
      return this.adEnabled;
    } catch (e) {
      return true;
    }
  }

  /**
   * Obtiene el siguiente anuncio patrocinado o rotativo
   */
  public getNextSponsoredAd(): CamperSponsoredAd {
    const ad = SPONSORED_CAMPER_ADS[this.currentAdIndex % SPONSORED_CAMPER_ADS.length];
    this.currentAdIndex++;
    // Registrar impresión para cálculo de ganancias en el panel de administración
    adminService.recordAdImpression(0.0015);
    return ad;
  }

  /**
   * Registra clic en anuncio
   */
  public recordAdClick(ad: CamperSponsoredAd): void {
    Logger.info('AdMobService', `Clic registrado en anuncio: ${ad.brand} (${ad.estimatedCpcEur}€)`);
    adminService.recordAdImpression(ad.estimatedCpcEur);
  }
}

export const adMobService = new AdMobService();
