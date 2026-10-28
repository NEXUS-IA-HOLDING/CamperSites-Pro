/**
 * CamperSites Pro - Environment Logger
 * YRYS - Sistema de logging seguro según el entorno
 * 
 * Este módulo centraliza el logging y previene la exposición
 * de datos sensibles en producción.
 */

// Determinar si estamos en modo desarrollo
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

/**
 * Logger seguro que solo muestra logs detallados en desarrollo
 * En producción, solo muestra errores críticos
 */
export const Logger = {
  /**
   * Log informativo - Solo en desarrollo
   */
  info: (tag: string, message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[${tag}] ${message}`, data || '');
    }
  },

  /**
   * Log de advertencia - Solo en desarrollo
   */
  warn: (tag: string, message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`[${tag}] ${message}`, data || '');
    }
  },

  /**
   * Log de error - Siempre visible (producción y desarrollo)
   */
  error: (tag: string, message: string, error?: any) => {
    console.error(`[${tag}] ${message}`, error || '');
  },

  /**
   * Log de debug - Solo en desarrollo con flag especial
   * Usar para debugging muy detallado
   */
  debug: (tag: string, message: string, data?: any) => {
    if (isDevelopment && global.__CS_DEBUG__) {
      console.log(`[DEBUG:${tag}] ${message}`, data || '');
    }
  },

  /**
   * Log de seguridad - Siempre registrado pero sanitizado
   * Nunca incluir datos sensibles como passwords o tokens
   */
  security: (tag: string, event: string, details?: Record<string, any>) => {
    // Sanitizar detalles - eliminar campos sensibles
    const sanitized = sanitizeForLogging(details || {});
    
    if (isDevelopment) {
      console.log(`[SECURITY:${tag}] ${event}`, sanitized);
    }
    
    // En producción, podríamos enviar a un servicio de audit logging
    // sin exponer los datos en consola
  },
};

/**
 * Sanitiza objetos para logging, eliminando campos sensibles
 */
function sanitizeForLogging(obj: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'credential',
    'authorization',
    'cookie',
    'session',
  ];

  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    
    // Si el campo contiene palabras sensibles, lo ocultamos
    if (sensitiveFields.some(field => keyLower.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursivamente sanitizar objetos anidados
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Hook para habilitar debug mode en desarrollo
 * Usar en componentes principales
 */
export function enableDebugMode(): void {
  if (isDevelopment) {
    global.__CS_DEBUG__ = true;
    Logger.info('Logger', 'Debug mode enabled');
  }
}

/**
 * Deshabilita debug mode
 */
export function disableDebugMode(): void {
  global.__CS_DEBUG__ = false;
  Logger.info('Logger', 'Debug mode disabled');
}

// Declaración del tipo global para TypeScript
declare global {
  var __CS_DEBUG__: boolean | undefined;
}
