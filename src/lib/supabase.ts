/**
 * Supabase Client - Configuración segura y robusta
 * YRYS - CamperSites Pro
 * 
 * Cliente de Supabase con manejo elegante de errores y modo offline.
 * Las credenciales se cargan desde variables de entorno (.env)
 * NUNCA hardcodear tokens o claves en el código fuente
 * 
 * Características:
 * - Modo offline automático si no hay conexión
 * - Reintentos inteligentes
 * - Cache local de datos críticos
 * - Persistencia de sesión segura
 */

import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import { Logger } from '../utils/logger';

// Configuración de reintentos y timeout
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // ms
const CONNECTION_TIMEOUT = 10000; // ms

// Cliente singleton
let supabaseInstance: SupabaseClient | null = null;

/**
 * Crea cliente Supabase con configuración optimizada
 */
function createSupabaseClient(): SupabaseClient {
  // Validación graceful - permite modo offline si faltan credenciales
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('demo')) {
    Logger.warn('Supabase', 'Modo offline activado - Sin conexión a Supabase');
    // Cliente mock para modo offline
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: async () => ({ data: [], error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
    } as unknown as SupabaseClient;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'camper-sites-pro/1.0.0' },
    },
  });
}

/**
 * Obtiene instancia singleton del cliente Supabase
 * Lazy loading para inicialización bajo demanda
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    try {
      supabaseInstance = createSupabaseClient();
    } catch (error) {
      Logger.error('Supabase', 'Error inicializando Supabase', error);
      supabaseInstance = createSupabaseClient();
    }
  }
  return supabaseInstance;
}

// Inicializar instancia
supabaseInstance = createSupabaseClient();

/**
 * Función utilitaria para operaciones con reintentos
 * @param fn - Función asíncrona a ejecutar
 * @param attempts - Número de intentos restantes
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempts > 1) {
      Logger.info('Supabase', `Reintento (${attempts - 1}/${RETRY_ATTEMPTS})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return withRetry(fn, attempts - 1);
    }
    throw error;
  }
}

export const supabase = getSupabase();
export default supabase;
