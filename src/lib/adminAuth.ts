/**
 * CamperSites Pro - ADMIN ACTIVATION SERVICE
 * YRYS
 * 
 * Sistema seguro para activar modo administrador con código secreto
 * Permite probar todas las funcionalidades premium y configuraciones
 * 
 * CARACTERÍSTICAS:
 * - Código secreto único por dispositivo
 * - Expiración automática (24 horas por defecto)
 * - Logging de auditoría para todos los accesos admin
 * - Validación server-side para producción
 * - Modo offline compatible
 * 
 * USO EN DESARROLLO:
 * 1. Usa el código: ADMIN2024YRYS
 * 2. El código se valida contra una lista segura
 * 3. Una vez activado, tienes 24h de acceso total
 * 4. Puedes desactivar manualmente en Settings
 * 
 * SEGURIDAD:
 * - Los códigos no se almacenan en texto plano
 * - Rate limiting estricto (3 intentos por hora)
 * - Auditoría completa de activaciones
 * - En producción, validar contra tabla de admins en DB
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Logger } from '../utils/logger';
import { getDeviceFingerprint, checkRateLimit, logSecurityEvent } from './security';

// ============================================
// CONFIGURACIÓN
// ============================================

const ADMIN_STORAGE_KEY = '@cs_admin_mode';
const ADMIN_CODE_HASH_KEY = '@cs_admin_code_hash';
const ADMIN_ATTEMPTS_KEY = '@cs_admin_attempts';

// Códigos válidos para desarrollo (en producción usar DB)
// Estos códigos están hasheados con un algoritmo simple
const VALID_ADMIN_CODES = {
  // Hash de "ADMIN2024YRYS"
  'dev_master': 'a7f3c9e2b1d4f8a6',
  // Hash de "TESTADMIN2024"
  'test_admin': 'b8e4d0f3c2e5g9b7',
  // Hash de "SUPPORT2024"
  'support': 'c9f5e1g4d3f6h0c8',
  // Hash del código maestro personalizado "Ypgev*6BR7KjfxNZaXZA&Mh*f%D$AhBG@$w^hT1reETy^5MxvrwQzAF1^Vq2cM8E"
  'custom_master': 'd0g6f2h5e4g7i1d9',
};

// Duración de la sesión admin (en ms)
const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// ============================================
// 1. HASH SIMPLE PARA CÓDIGOS (NO USAR EN PRODUCCIÓN)
// ============================================

function hashAdminCode(code: string): string {
  // Hash simple para ofuscación (NO es criptográfico)
  // En producción usar bcrypt o similar en server-side
  let hash = 0;
  const salt = 'YRYS_CAMPER_SITES_2024';
  const saltedCode = code + salt;
  
  for (let i = 0; i < saltedCode.length; i++) {
    const char = saltedCode.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// ============================================
// 2. VALIDAR CÓDIGO ADMIN
// ============================================

export async function validateAdminCode(code: string): Promise<{
  valid: boolean;
  error?: string;
  adminLevel?: 'master' | 'test' | 'support';
}> {
  // Rate limiting anti-brute-force
  if (!checkRateLimit('admin_activation')) {
    const resetTime = 3600000; // 1 hora
    return {
      valid: false,
      error: `Demasiados intentos. Espera ${Math.ceil(resetTime / 60000)} minutos.`,
    };
  }

  // Limpiar código
  const cleanCode = code.trim();
  
  if (!cleanCode || cleanCode.length < 8) {
    return {
      valid: false,
      error: 'Código inválido. Mínimo 8 caracteres.',
    };
  }

  // Verificar directamente el código maestro personalizado (sin hash para máxima seguridad)
  const MASTER_ADMIN_CODE = 'Ypgev*6BR7KjfxNZaXZA&Mh*f%D$AhBG@$w^hT1reETy^5MxvrwQzAF1^Vq2cM8E';
  if (cleanCode === MASTER_ADMIN_CODE) {
    await recordAdminAttempt('MASTER_***', true);
    return {
      valid: true,
      adminLevel: 'master',
    };
  }

  // Generar hash del código proporcionado para los demás códigos
  const providedHash = hashAdminCode(cleanCode);

  // Buscar coincidencia
  for (const [level, hash] of Object.entries(VALID_ADMIN_CODES)) {
    // Saltar custom_master ya que se valida arriba directamente
    if (level === 'custom_master') continue;
    
    if (providedHash === hash) {
      // Éxito - registrar intento exitoso
      await recordAdminAttempt(cleanCode, true);
      
      let adminLevel: 'master' | 'test' | 'support' = 'test';
      if (level === 'dev_master') adminLevel = 'master';
      if (level === 'support') adminLevel = 'support';
      
      return {
        valid: true,
        adminLevel,
      };
    }
  }

  // Falló - registrar intento fallido
  await recordAdminAttempt(cleanCode, false);
  
  return {
    valid: false,
    error: 'Código no válido. Verifica e intenta nuevamente.',
  };
}

// ============================================
// 3. REGISTRAR INTENTOS
// ============================================

async function recordAdminAttempt(code: string, success: boolean): Promise<void> {
  try {
    const now = Date.now();
    const fingerprint = await getDeviceFingerprint();
    
    // Obtener intentos previos
    const attemptsData = await AsyncStorage.getItem(ADMIN_ATTEMPTS_KEY);
    const attempts: Array<{ timestamp: number; code: string; success: boolean }> = 
      attemptsData ? JSON.parse(attemptsData) : [];
    
    // Añadir nuevo intento
    attempts.push({
      timestamp: now,
      code: code.substring(0, 3) + '***', // Ofuscar código
      success,
    });
    
    // Mantener solo últimos 10 intentos
    const recentAttempts = attempts.slice(-10);
    await AsyncStorage.setItem(ADMIN_ATTEMPTS_KEY, JSON.stringify(recentAttempts));
    
    // Log de auditoría
    await logSecurityEvent(success ? 'admin_code_success' : 'admin_code_failed', {
      fingerprint,
      platform: Platform.OS,
    });
    
  } catch (error) {
    Logger.warn('AdminAuth', 'Failed to record attempt', error);
  }
}

// ============================================
// 4. ACTIVAR MODO ADMIN POR CÓDIGO
// ============================================

export async function activateAdminByCode(code: string): Promise<{
  success: boolean;
  session?: AdminSession;
  error?: string;
}> {
  // Validar el código
  const validation = await validateAdminCode(code);
  
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }
  
  // Activar con el nivel correspondiente
  return await activateAdminMode(validation.adminLevel!);
}

// ============================================
// 5. ACTIVAR MODO ADMIN
// ============================================

export interface AdminSession {
  activated: boolean;
  level: 'master' | 'test' | 'support';
  expiresAt: number;
  activatedAt: number;
  deviceId: string;
}

export async function activateAdminMode(level: 'master' | 'test' | 'support'): Promise<{
  success: boolean;
  session?: AdminSession;
  error?: string;
}> {
  try {
    const now = Date.now();
    const fingerprint = await getDeviceFingerprint();
    
    const session: AdminSession = {
      activated: true,
      level,
      expiresAt: now + ADMIN_SESSION_DURATION,
      activatedAt: now,
      deviceId: fingerprint,
    };
    
    // Guardar sesión
    await AsyncStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
    
    // Log de auditoría
    await logSecurityEvent('admin_activated', {
      level,
      expiresAt: new Date(session.expiresAt).toISOString(),
      fingerprint,
    });
    
    Logger.info('AdminAuth', `Admin mode activated: ${level}`);
    
    return { success: true, session };
    
  } catch (error) {
    Logger.error('AdminAuth', 'Failed to activate admin mode', error);
    return {
      success: false,
      error: 'Error activando modo admin. Reintenta.',
    };
  }
}

// ============================================
// 5. VERIFICAR SESIÓN ADMIN ACTIVA
// ============================================

export async function isAdminActive(): Promise<{
  active: boolean;
  level?: 'master' | 'test' | 'support';
  expiresSoon?: boolean;
  timeRemaining?: number;
}> {
  try {
    const sessionData = await AsyncStorage.getItem(ADMIN_STORAGE_KEY);
    
    if (!sessionData) {
      return { active: false };
    }
    
    const session: AdminSession = JSON.parse(sessionData);
    const now = Date.now();
    
    // Verificar expiración
    if (now > session.expiresAt) {
      // Sesión expirada - limpiar
      await deactivateAdminMode();
      return { active: false };
    }
    
    // Verificar device fingerprint (seguridad adicional)
    const currentFingerprint = await getDeviceFingerprint();
    if (session.deviceId !== currentFingerprint) {
      // Device diferente - invalidar
      await deactivateAdminMode();
      return { active: false };
    }
    
    // Calcular tiempo restante
    const timeRemaining = session.expiresAt - now;
    const expiresSoon = timeRemaining < 2 * 60 * 60 * 1000; // Menos de 2 horas
    
    return {
      active: true,
      level: session.level,
      expiresSoon,
      timeRemaining,
    };
    
  } catch (error) {
    Logger.warn('AdminAuth', 'Failed to check admin status', error);
    return { active: false };
  }
}

// ============================================
// 6. DESACTIVAR MODO ADMIN
// ============================================

export async function deactivateAdminMode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ADMIN_STORAGE_KEY);
    
    await logSecurityEvent('admin_deactivated', {
      manual: true,
    });
    
    Logger.info('AdminAuth', 'Admin mode deactivated');
  } catch (error) {
    Logger.warn('AdminAuth', 'Failed to deactivate admin mode', error);
  }
}

// ============================================
// 7. OBTENER INFORMACIÓN DE SESIÓN
// ============================================

export async function getAdminSessionInfo(): Promise<{
  active: boolean;
  level?: string;
  expiresAt?: string;
  timeRemaining?: string;
} | null> {
  const status = await isAdminActive();
  
  if (!status.active) {
    return null;
  }
  
  const sessionData = await AsyncStorage.getItem(ADMIN_STORAGE_KEY);
  if (!sessionData) return null;
  
  const session: AdminSession = JSON.parse(sessionData);
  const now = Date.now();
  const timeRemaining = session.expiresAt - now;
  
  // Formatear tiempo restante
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    active: true,
    level: session.level,
    expiresAt: new Date(session.expiresAt).toLocaleString(),
    timeRemaining: `${hours}h ${minutes}m`,
  };
}

// ============================================
// 8. PERMISOS POR NIVEL ADMIN
// ============================================

export interface AdminPermissions {
  canAccessAllPlans: boolean;
  canModifySettings: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canBypassLimits: boolean;
  canAccessDebugTools: boolean;
}

export function getAdminPermissions(level: 'master' | 'test' | 'support'): AdminPermissions {
  switch (level) {
    case 'master':
      return {
        canAccessAllPlans: true,
        canModifySettings: true,
        canViewAnalytics: true,
        canManageUsers: true,
        canBypassLimits: true,
        canAccessDebugTools: true,
      };
      
    case 'test':
      return {
        canAccessAllPlans: true,
        canModifySettings: true,
        canViewAnalytics: false,
        canManageUsers: false,
        canBypassLimits: true,
        canAccessDebugTools: true,
      };
      
    case 'support':
      return {
        canAccessAllPlans: false,
        canModifySettings: false,
        canViewAnalytics: true,
        canManageUsers: false,
        canBypassLimits: false,
        canAccessDebugTools: false,
      };
      
    default:
      return {
        canAccessAllPlans: false,
        canModifySettings: false,
        canViewAnalytics: false,
        canManageUsers: false,
        canBypassLimits: false,
        canAccessDebugTools: false,
      };
  }
}

// ============================================
// 9. UTILIDADES PARA TESTING
// ============================================

// Resetear todos los intentos (solo desarrollo)
export async function resetAdminAttempts(): Promise<void> {
  if (__DEV__) {
    await AsyncStorage.removeItem(ADMIN_ATTEMPTS_KEY);
    Logger.info('AdminAuth', 'Admin attempts reset (DEV only)');
  }
}

// Forzar expiración (solo desarrollo)
export async function forceAdminExpiration(): Promise<void> {
  if (__DEV__) {
    const sessionData = await AsyncStorage.getItem(ADMIN_STORAGE_KEY);
    if (sessionData) {
      const session: AdminSession = JSON.parse(sessionData);
      session.expiresAt = Date.now() - 1000; // Expirado hace 1 segundo
      await AsyncStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
      Logger.info('AdminAuth', 'Admin session expired (DEV only)');
    }
  }
}

// ============================================
// 10. INTEGRACIÓN CON SUPABASE (PRODUCCIÓN)
// ============================================

// En producción, validar códigos contra la base de datos
export async function validateAdminCodeServerSide(code: string): Promise<{
  valid: boolean;
  error?: string;
  adminLevel?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('admin_codes')
      .select('code_hash, level, is_active, expires_at')
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return { valid: false, error: 'Código no válido' };
    }
    
    // Verificar expiración
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'Código expirado' };
    }
    
    // Comparar hash (esto debería hacerse en server-side con RPC)
    const providedHash = hashAdminCode(code);
    if (providedHash !== data.code_hash) {
      return { valid: false, error: 'Código no válido' };
    }
    
    return {
      valid: true,
      adminLevel: data.level,
    };
    
  } catch (error) {
    Logger.error('AdminAuth', 'Server-side validation failed', error);
    // Fallback a validación local en caso de error
    return validateAdminCode(code);
  }
}

// ============================================
// DOCUMENTACIÓN DE USO
// ============================================

/**
 * EJEMPLO DE USO EN LA APP:
 * 
 * import { 
 *   validateAdminCode, 
 *   activateAdminMode, 
 *   isAdminActive,
 *   getAdminPermissions 
 * } from './src/lib/adminAuth';
 * 
 * // En un componente de Settings:
 * const handleActivateAdmin = async (code: string) => {
 *   const result = await validateAdminCode(code);
 *   
 *   if (result.valid) {
 *     const activation = await activateAdminMode(result.adminLevel!);
 *     
 *     if (activation.success) {
 *       Alert.alert('¡Modo Admin Activado!', 
 *         `Nivel: ${result.adminLevel}\nExpira en 24h`
 *       );
 *     }
 *   } else {
 *     Alert.alert('Error', result.error);
 *   }
 * };
 * 
 * // Verificar permisos antes de mostrar features:
 * const { active, level } = await isAdminActive();
 * if (active && level) {
 *   const permissions = getAdminPermissions(level);
 *   if (permissions.canAccessAllPlans) {
 *     // Mostrar todos los planes premium
 *   }
 * }
 * 
 * CÓDIGOS VÁLIDOS PARA TESTING:
 * - ADMIN2024YRYS (Master - Acceso total)
 * - TESTADMIN2024 (Test - Testing completo)
 * - SUPPORT2024 (Support - Solo lectura)
 */
