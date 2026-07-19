/**
 * CamperSites Pro - SECURITY SERVICE
 * YRYS
 *
 * Protección completa:
 * - Rate limiting (anti-DDoS/spam)
 * - Input validation & sanitization (anti-injection)
 * - Session security (anti-spoofing)
 * - Device fingerprinting
 * - Anti-cheat (alertas falsas)
 * - Secure storage
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Logger } from '../utils/logger';

// ============================================
// 1. DEVICE FINGERPRINT (Anti-session-spoofing)
// ============================================
let cachedFingerprint: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;

  // Intentar recuperar fingerprint guardado
  const stored = await AsyncStorage.getItem('@cs_device_fp');
  if (stored) {
    cachedFingerprint = stored;
    return stored;
  }

  // Generar nuevo fingerprint basado en plataforma + timestamp + random
  const components = [
    Platform.OS,
    Platform.Version,
    (Platform.constants as any)?.Brand || 'unknown',
    (Platform.constants as any)?.Model || 'unknown',
    Date.now().toString(36),
    Math.random().toString(36).substring(2, 10),
  ];

  const fp = hashString(components.join('|'));
  await AsyncStorage.setItem('@cs_device_fp', fp);
  cachedFingerprint = fp;
  return fp;
}

// Simple hash para fingerprint (no necesita crypto)
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'fp_' + Math.abs(hash).toString(36) + '_' + str.length.toString(36);
}


// ============================================
// 2. INPUT VALIDATION & SANITIZATION
//    (Anti-SQL-injection, Anti-XSS, Anti-prompt-injection)
// ============================================

// Sanitizar texto libre del usuario
export function sanitizeInput(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Trim whitespace
    .trim()
    // Limitar longitud
    .substring(0, maxLength)
    // Eliminar caracteres de control
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Eliminar tags HTML/script
    .replace(/<[^>]*>/g, '')
    // Escapar comillas para prevenir SQL injection
    .replace(/'/g, '\u2019') // Reemplazar con comilla tipográfica
    .replace(/"/g, '\u201C')
    // Eliminar patrones SQL peligrosos
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|UNION|CREATE)\b)/gi, '')
    // Eliminar null bytes
    .replace(/\0/g, '');
}

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Validar password strength
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Mínimo 8 caracteres');
  if (password.length > 128) errors.push('Máximo 128 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Al menos 1 mayúscula');
  if (!/[a-z]/.test(password)) errors.push('Al menos 1 minúscula');
  if (!/[0-9]/.test(password)) errors.push('Al menos 1 número');

  return { valid: errors.length === 0, errors };
}

// Validar coordenadas GPS (anti-fake locations)
export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180 &&
    !isNaN(lat) && !isNaN(lon) &&
    isFinite(lat) && isFinite(lon)
  );
}


// ============================================
// 3. RATE LIMITING (Client-side + Server-side)
// ============================================

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  windowMs: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Límites por acción
const RATE_LIMITS: Record<string, { maxPerWindow: number; windowMs: number }> = {
  'create_alert':    { maxPerWindow: 5,  windowMs: 60000 },   // 5 alertas/min
  'vote_alert':      { maxPerWindow: 20, windowMs: 60000 },   // 20 votos/min
  'search':          { maxPerWindow: 30, windowMs: 60000 },   // 30 búsquedas/min
  'fetch_locations': { maxPerWindow: 10, windowMs: 60000 },   // 10 fetches/min
  'login':           { maxPerWindow: 5,  windowMs: 300000 },  // 5 logins/5min
  'register':        { maxPerWindow: 3,  windowMs: 3600000 }, // 3 registros/hora
  'admin_activation':{ maxPerWindow: 3,  windowMs: 3600000 }, // 3 intentos admin/hora
};

export function checkRateLimit(action: string): boolean {
  const config = RATE_LIMITS[action];
  if (!config) return true; // Si no hay config, permitir

  const now = Date.now();
  const entry = rateLimitStore.get(action);

  if (!entry || (now - entry.firstRequest) > config.windowMs) {
    // Nueva ventana
    rateLimitStore.set(action, { count: 1, firstRequest: now, windowMs: config.windowMs });
    return true;
  }

  if (entry.count >= config.maxPerWindow) {
    Logger.warn('Security', `Rate limit exceeded for: ${action}`);
    return false; // BLOQUEADO
  }

  entry.count++;
  return true;
}

// Tiempo restante hasta que se desbloquee
export function getRateLimitReset(action: string): number {
  const config = RATE_LIMITS[action];
  if (!config) return 0;

  const entry = rateLimitStore.get(action);
  if (!entry) return 0;

  const elapsed = Date.now() - entry.firstRequest;
  return Math.max(0, config.windowMs - elapsed);
}


// ============================================
// 4. SESSION SECURITY
// ============================================

// Registrar sesión activa
export async function registerSession(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fingerprint = await getDeviceFingerprint();

    await supabase.from('active_sessions').upsert({
      user_id: user.id,
      device_fingerprint: fingerprint,
      user_agent: `${Platform.OS}/${Platform.Version}`,
      last_active: new Date().toISOString(),
      is_valid: true,
    }, {
      onConflict: 'user_id,device_fingerprint',
    });
  } catch (error) {
    // Silencioso - no romper la app si falla security logging
    Logger.warn('Security', 'Session registration failed', error);
  }
}

// Verificar que la sesión actual es válida
export async function isSessionValid(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const fingerprint = await getDeviceFingerprint();

    const { data } = await supabase
      .from('active_sessions')
      .select('is_valid')
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .single();

    return data?.is_valid !== false;
  } catch {
    return true; // Si falla la verificación, no bloquear
  }
}

// Cerrar todas las sesiones (para logout seguro)
export async function invalidateAllSessions(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('active_sessions')
      .update({ is_valid: false })
      .eq('user_id', user.id);
  } catch (error) {
    Logger.warn('Security', 'Session invalidation failed', error);
  }
}


// ============================================
// 5. ANTI-CHEAT (Alertas comunitarias)
// ============================================

// Verificar si usuario está baneado
export async function isUserBanned(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_security')
      .select('is_banned')
      .eq('user_id', user.id)
      .single();

    return data?.is_banned === true;
  } catch {
    return false;
  }
}

// Verificar alerta antes de crear (validaciones anti-cheat)
export function validateAlert(alert: {
  type: string;
  latitude: number;
  longitude: number;
  description?: string;
}): { valid: boolean; error?: string } {
  // Validar tipo
  const validTypes = [
    'CONTROL_POLICIAL', 'RADAR_MOVIL', 'ACCIDENTE', 'PELIGRO_VIA',
    'VEHICULO_PARADO', 'OBRAS', 'ANIMAL_VIA', 'CONDICIONES_METEOROLOGICAS',
  ];
  if (!validTypes.includes(alert.type)) {
    return { valid: false, error: 'Tipo de alerta no válido' };
  }

  // Validar coordenadas
  if (!isValidCoordinate(alert.latitude, alert.longitude)) {
    return { valid: false, error: 'Ubicación no válida' };
  }

  // Validar que las coordenadas son en Europa (anti-fake)
  if (alert.latitude < 25 || alert.latitude > 72 ||
      alert.longitude < -25 || alert.longitude > 45) {
    return { valid: false, error: 'Ubicación fuera de la zona de cobertura' };
  }

  // Rate limit
  if (!checkRateLimit('create_alert')) {
    return { valid: false, error: 'Demasiadas alertas. Espera un momento.' };
  }

  return { valid: true };
}


// ============================================
// 6. SECURE STORAGE HELPERS
// ============================================
// NOTA: Para almacenamiento verdaderamente seguro en producción,
// se recomienda usar expo-secure-store o react-native-keychain
// que utilizan el Keychain (iOS) y Keystore (Android)

const SECURE_PREFIX = '@cs_secure_';

// Ofuscación simple para datos no críticos (NO es encriptación real)
// Usar solo para datos de baja sensibilidad como preferencias
function simpleObfuscate(value: string): string {
  // XOR simple con rotación de caracteres
  return value.split('').map((char, i) => {
    const code = char.charCodeAt(0) ^ (i % 256);
    return String.fromCharCode(code);
  }).join('');
}

// Guardar dato sensible (con ofuscación básica)
// ADVERTENCIA: Esto NO es encriptación segura. Para tokens, passwords, etc.
// usar expo-secure-store o soluciones nativas de keychain/keystore
export async function secureStore(key: string, value: string): Promise<void> {
  // Doble capa: ofuscación + base64
  const obfuscated = simpleObfuscate(value);
  const encoded = Buffer.from(obfuscated).toString('base64');
  await AsyncStorage.setItem(SECURE_PREFIX + key, encoded);
}

// Leer dato sensible
export async function secureRetrieve(key: string): Promise<string | null> {
  const encoded = await AsyncStorage.getItem(SECURE_PREFIX + key);
  if (!encoded) return null;
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return simpleObfuscate(decoded); // La ofuscación XOR es reversible
  } catch (error) {
    Logger.warn('Security', 'Failed to retrieve secure data', error);
    return null;
  }
}

// Borrar dato sensible
export async function secureDelete(key: string): Promise<void> {
  await AsyncStorage.removeItem(SECURE_PREFIX + key);
}

// ============================================
// 7. SERVER-SIDE RATE LIMITING VALIDATION
// ============================================
// El rate limiting del cliente es solo una primera línea de defensa.
// La validación REAL debe hacerse en el servidor/database.
// Esta función prepara los datos para validación server-side.

export function prepareRateLimitHeaders(action: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const fingerprint = getDeviceFingerprint();
  
  return {
    'X-RateLimit-Action': action,
    'X-RateLimit-Timestamp': timestamp,
    'X-Device-Fingerprint': fingerprint || 'unknown',
  };
}

// Validar respuesta del servidor sobre rate limiting
export function handleRateLimitResponse(response: any): { allowed: boolean; retryAfter?: number } {
  if (response?.rateLimited) {
    const retryAfter = response?.retryAfter || 60000; // default 1 min
    return { allowed: false, retryAfter };
  }
  return { allowed: true };
}


// ============================================
// 8. SECURITY AUDIT LOG
// ============================================

export async function logSecurityEvent(
  action: string,
  details: Record<string, any> = {},
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('audit_log').insert({
      user_id: user?.id || null,
      action,
      details,
    });
  } catch {
    // Silencioso
  }
}
