/**
 * Performance utilities - CamperSites Pro
 * YRYS - Utilidades de optimización de rendimiento
 * 
 * Funciones y configuraciones reutilizables para maximizar
 * el rendimiento de la aplicación en dispositivos móviles.
 */

import { useCallback, useRef, useMemo } from 'react';
import { FlatListProps } from 'react-native';
import { Logger } from './logger';

/**
 * Hook: debounce para búsquedas o callbacks costosos.
 * Evita llamadas excesivas al teclear.
 *
 * @param callback - Función a ejecutar tras el delay
 * @param delay    - Milisegundos de espera (default: 300ms)
 *
 * @example
 *   const handleSearch = useDebounce((q: string) => searchLocations(q), 300);
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 300,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  ) as T;
}

/**
 * Hook: throttle para limitar frecuencia de ejecución
 * Útil para eventos de scroll o resize
 *
 * @param callback - Función a ejecutar
 * @param limit    - Límite en milisegundos
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  limit: number = 100,
): T {
  const inThrottle = useRef(false);
  
  return useCallback((...args: Parameters<T>) => {
    if (!inThrottle.current) {
      callback(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [callback, limit]) as T;
}

/**
 * Hook: memoize para cachear resultados de funciones costosas
 * 
 * @param fn - Función a memoizar
 * @param keyFn - Función para generar clave de cache
 */
export function useMemoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = useRef<Map<string, ReturnType<T>>>(new Map());
  
  return useCallback(((...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    if (cache.current.has(key)) {
      return cache.current.get(key)!;
    }
    const result = fn(...args);
    cache.current.set(key, result);
    return result;
  }) as T, [fn, keyFn]);
}

/**
 * Configuración óptima para FlatList de locations.
 * Aplicar como spread: <FlatList {...FLATLIST_PERF_PROPS} ... />
 * 
 * Optimizaciones incluidas:
 * - removeClippedSubviews: Elimina renderizado fuera de pantalla
 * - maxToRenderPerBatch: Limita items por batch
 * - updateCellsBatchingPeriod: Controla frecuencia de updates
 * - initialNumToRender: Items iniciales mínimos
 * - windowSize: Ventana de renderizado optimizada
 */
export const FLATLIST_PERF_PROPS = {
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 10,
  windowSize: 5,
  getItemLayout: (_data: any, index: number) => ({
    length: 180, // Altura estimada por item
    offset: 180 * index,
    index,
  }),
} as Partial<FlatListProps<any>>;

/**
 * Configuración para listas largas (+100 items)
 */
export const FLATLIST_LONG_PERF_PROPS = {
  ...FLATLIST_PERF_PROPS,
  initialNumToRender: 5,
  windowSize: 3,
  maxToRenderPerBatch: 5,
} as Partial<FlatListProps<any>>;

/**
 * Factory para crear keys estables en FlatList
 * Evita re-renderizados innecesarios
 */
export const createKeyExtractor = <T extends { id: string | number }>(
  fieldName: keyof T = 'id'
) => {
  return (item: T): string => {
    return String(item[fieldName]);
  };
};

/**
 * Utilidad para medir tiempo de ejecución
 * Útil para debugging de performance
 */
export const measureTime = <T,>(fn: () => T, label: string = 'Operation'): T => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  // Usar Logger en lugar de console.log directo
  Logger.debug('Performance', `${label} completado`, { 
    duration: `${(end - start).toFixed(2)}ms` 
  });
  
  return result;
};

/**
 * Hook para detectar si un componente está montado
 * Previene updates en componentes desmontados
 */
export function useMounted(): () => boolean {
  const mounted = useRef(true);
  
  useCallback(() => {
    return () => {
      mounted.current = false;
    };
  }, []);
  
  return () => mounted.current;
}

