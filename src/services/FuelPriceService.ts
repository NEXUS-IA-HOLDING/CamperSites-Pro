/**
 * FuelPriceService.ts - Comparador de Precios Oficiales de Combustible y GLP (MITECO)
 * CamperSites Pro - Asistente de Ahorro para Viajeros Camper
 *
 * Conecta en tiempo real con el Geoportal oficial del Ministerio para la Transición Ecológica
 * para mostrar los precios exactos de Diésel A, GLP (Autogas) y Gasolina 95, calculando
 * el ahorro real por depósito (70L) en ruta.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import haversine from 'haversine-distance';

const FUEL_API_URL = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
const CACHE_KEY = '@campersites_fuel_prices_cache';
const CACHE_TIMESTAMP_KEY = '@campersites_fuel_prices_timestamp';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 Horas de caché (precios se actualizan a diario)

export interface FuelStationItem {
  id: string;
  name: string;
  brand: string;
  address: string;
  locality: string;
  latitude: number;
  longitude: number;
  schedule: string;
  dieselPrice?: number;
  glpPrice?: number;
  gasolinePrice?: number;
  distanceKm: number;
  estimatedSavingsEur?: number;
  isCheapest?: boolean;
}

export type FuelFilterType = 'diesel' | 'glp' | 'gasolina';

export class FuelPriceService {
  private static cachedStations: any[] = [];
  private static lastFetchTime: number = 0;

  /**
   * Obtiene las gasolineras más cercanas y baratas ordenadas por precio
   */
  public static async getNearbyFuelStations(
    lat: number,
    lng: number,
    fuelType: FuelFilterType = 'diesel',
    radiusKm: number = 25
  ): Promise<FuelStationItem[]> {
    try {
      const rawList = await this.loadAllStations();
      if (!rawList || rawList.length === 0) return [];

      const targetCoord = { latitude: lat, longitude: lng };
      const nearby: FuelStationItem[] = [];

      for (const item of rawList) {
        const itemLat = parseFloat((item['Latitud'] || '').replace(',', '.'));
        const itemLng = parseFloat((item['Longitud (WGS84)'] || '').replace(',', '.'));

        if (isNaN(itemLat) || isNaN(itemLng)) continue;

        const distMeters = haversine(targetCoord, { latitude: itemLat, longitude: itemLng });
        const distKm = Math.round((distMeters / 1000) * 10) / 10;

        if (distKm <= radiusKm) {
          const diesel = this.parsePrice(item['Precio Gasoleo A']);
          const glp = this.parsePrice(item['Precio Gases licuados del petróleo']);
          const gasolina = this.parsePrice(item['Precio Gasolina 95 E5']);

          // Filtrar según el tipo de combustible requerido
          if (fuelType === 'diesel' && !diesel) continue;
          if (fuelType === 'glp' && !glp) continue;
          if (fuelType === 'gasolina' && !gasolina) continue;

          const brand = (item['Rótulo'] || 'Gasolinera').trim();

          nearby.push({
            id: `fuel-${item['C.P.'] || ''}-${itemLat.toFixed(4)}-${itemLng.toFixed(4)}`,
            name: brand,
            brand,
            address: (item['Dirección'] || '').trim(),
            locality: (item['Municipio'] || item['Localidad'] || '').trim(),
            latitude: itemLat,
            longitude: itemLng,
            schedule: (item['Horario'] || '24 Horas').trim(),
            dieselPrice: diesel,
            glpPrice: glp,
            gasolinePrice: gasolina,
            distanceKm: distKm,
          });
        }
      }

      // Ordenar por el precio del combustible elegido (más barato primero)
      nearby.sort((a, b) => {
        const priceA = fuelType === 'diesel' ? (a.dieselPrice || 99) : fuelType === 'glp' ? (a.glpPrice || 99) : (a.gasolinePrice || 99);
        const priceB = fuelType === 'diesel' ? (b.dieselPrice || 99) : fuelType === 'glp' ? (b.glpPrice || 99) : (b.gasolinePrice || 99);
        return priceA - priceB;
      });

      if (nearby.length > 0) {
        // Calcular precio medio en la zona
        const prices = nearby.map(s => (fuelType === 'diesel' ? s.dieselPrice! : fuelType === 'glp' ? s.glpPrice! : s.gasolinePrice!));
        const avgPrice = prices.reduce((acc, p) => acc + p, 0) / prices.length;

        // Marcar la más barata y estimar ahorro en depósito camper de 70 litros
        nearby.forEach((s, idx) => {
          if (idx === 0) s.isCheapest = true;
          const sPrice = fuelType === 'diesel' ? s.dieselPrice! : fuelType === 'glp' ? s.glpPrice! : s.gasolinePrice!;
          const diffPerLiter = avgPrice - sPrice;
          s.estimatedSavingsEur = diffPerLiter > 0 ? Math.round(diffPerLiter * 70 * 10) / 10 : 0;
        });
      }

      return nearby.slice(0, 30);
    } catch (e) {
      return [];
    }
  }

  private static parsePrice(val?: string): number | undefined {
    if (!val) return undefined;
    const num = parseFloat(val.replace(',', '.').trim());
    return isNaN(num) || num <= 0 ? undefined : num;
  }

  private static async loadAllStations(): Promise<any[]> {
    const now = Date.now();
    if (this.cachedStations.length > 0 && (now - this.lastFetchTime) < CACHE_TTL_MS) {
      return this.cachedStations;
    }

    try {
      const stored = await AsyncStorage.getItem(CACHE_KEY);
      const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (stored && timestamp) {
        const age = now - parseInt(timestamp, 10);
        if (age < CACHE_TTL_MS) {
          this.cachedStations = JSON.parse(stored);
          this.lastFetchTime = parseInt(timestamp, 10);
          return this.cachedStations;
        }
      }
    } catch {}

    // Descarga fresca de la API oficial MITECO
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(FUEL_API_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (CamperSitesPro Mobile App)' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data['ListaEESSPrecio'])) {
          this.cachedStations = data['ListaEESSPrecio'];
          this.lastFetchTime = now;
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify(this.cachedStations)).catch(() => {});
          AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, String(now)).catch(() => {});
          return this.cachedStations;
        }
      }
    } catch (err) {
      // Si falla la red, usar caché existente si había
      if (this.cachedStations.length > 0) return this.cachedStations;
    }

    return [];
  }
}

export default FuelPriceService;
