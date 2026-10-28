/**
 * Configuración de la app.
 * Tokens y URLs salen de .env vía @env. Sin fallbacks con claves reales.
 */

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  MAPBOX_ACCESS_TOKEN,
  OPEN_STREET_VIEW_KEY,
} from '@env';

export const AppConfig = {
  MAPBOX: {
    TOKEN: MAPBOX_ACCESS_TOKEN || '',
  },

  OPEN_STREET_VIEW: {
    API_KEY: OPEN_STREET_VIEW_KEY || '',
  },

  ROUTING_ENGINE: {
    ENABLE_AI_OPTIMIZATION: true,
    DEFAULT_VEHICLE_PROFILE: {
      height: 2.5,
      width: 2.0,
      weight: 2000,
      type: 'camper',
      avoidSteepHills: false,
    },
  },

  SUPABASE: {
    URL: SUPABASE_URL || '',
    ANON_KEY: SUPABASE_ANON_KEY || '',
  },

  PLANS: {
    FREE: {
      id: 'free',
      name: 'Gratuito',
      price: 0,
      currency: 'EUR',
      features: [
        'Rutas básicas',
        'Límite de 5 rutas/día',
        'Sin optimización IA avanzada',
      ],
    },
    PREMIUM: {
      id: 'premium',
      name: 'Premium',
      price: 9.99,
      currency: 'EUR',
      period: 'month',
      features: [
        'Rutas ilimitadas',
        'Optimización IA con perfil de vehículo',
        'Evitar cuestas pronunciadas',
        'Verificación de altura en tiempo real',
        'Optimización de consumo',
        'Soporte prioritario',
      ],
    },
  },
};

export default AppConfig;
