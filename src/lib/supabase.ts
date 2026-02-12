/**
 * Supabase Client - Configuracion segura
 * YRYS - CamperSites Pro
 *
 * Las credenciales se cargan desde variables de entorno (.env)
 * NUNCA hardcodear tokens o claves en el codigo fuente
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Validacion en runtime - evita inicializar con credenciales vacias
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[CamperSites] Faltan variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY. ' +
    'Copia .env.example a .env y configura los valores.'
  );
}

/**
 * Cliente de Supabase configurado con:
 * - AsyncStorage para persistencia de sesion offline
 * - Auto-refresh de tokens de autenticacion
 * - Deteccion automatica de sesion
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // No aplica en React Native
  },
});

export default supabase;
