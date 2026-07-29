/**
 * Configuración Centralizada de la Aplicación
 * 
 * IMPORTANTE: Este archivo es gestionado por los desarrolladores.
 * El usuario final NO debe modificar esto.
 * 
 * Para producción, estas claves deberían inyectarse mediante variables de entorno
 * en el proceso de build (CI/CD) o servirse desde un backend seguro.
 */

import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  MAPBOX_ACCESS_TOKEN, 
  OPEN_STREET_VIEW_KEY 
} from '@env';

export const AppConfig = {
  // Claves de Mapas y Rutas (Gestionadas por la empresa)
  MAPBOX: {
    TOKEN: MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiY2FtcGVyc2l0ZXMtcHJvIiwiYSI6ImNscXh5ejB3YTA...', 
  },
  
  OPEN_STREET_VIEW: {
    API_KEY: OPEN_STREET_VIEW_KEY || '', 
  },

  // Configuración de la IA de Rutas
  ROUTING_ENGINE: {
    ENABLE_AI_OPTIMIZATION: true,
    DEFAULT_VEHICLE_PROFILE: {
      height: 2.5, // metros
      width: 2.0,  // metros
      weight: 2000, // kg
      type: 'camper',
      avoidSteepHills: false,
    }
  },

  // Supabase (Configuración pública necesaria para el cliente)
  SUPABASE: {
    URL: SUPABASE_URL || 'https://tu-proyecto.supabase.co',
    ANON_KEY: SUPABASE_ANON_KEY || 'tu-anon-key-publica',
  },

  // Planes disponibles
  PLANS: {
    FREE: {
      id: 'free',
      name: 'Gratuito',
      price: 0,
      features: [
        'Rutas básicas',
        'Límite de 5 rutas/día',
        'Sin optimización IA avanzada'
      ]
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
        'Soporte prioritario'
      ]
    }
  }
};

export default AppConfig;
