/**
 * Performance utilities - CamperSites Pro
 * YRYS
 *
 * Exports reutilizables de optimización de performance.
 * El resto de optimizaciones (memoización en componentes, FlatList config, etc.)
 * se aplican directamente en cada screen.
 */

import { useCallback, useRef } from 'react';

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
 * Configuración estándar para FlatList de locations.
 * Aplicar como spread: <FlatList {...FLATLIST_PERF_PROPS} ... />
 */
export const FLATLIST_PERF_PROPS = {
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 10,
  windowSize: 5,
} as const;
