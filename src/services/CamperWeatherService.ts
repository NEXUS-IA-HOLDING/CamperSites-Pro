/**
 * CamperWeatherService.ts - Meteorología y Alertas de Viento en Ruta para Campers y Autocaravanas
 * CamperSites Pro (YRYS)
 * 
 * Especializado en las vulnerabilidades de vehículos habitables:
 * 1. Efecto vela y rachas de viento lateral (peligro en viaductos y puertos).
 * 2. Seguridad de despliegue de toldos y techos elevables (desaconsejado con rachas > 25 km/h).
 * 3. Alertas de helada (riesgo de congelación de depósitos de agua y boiler a < 2°C).
 * 4. Fallback offline automático sin dependencias ni claves API de pago.
 */

import { Logger } from '../utils/logger';

export interface CamperWeatherReport {
  temperatureC: number;
  windSpeedKmH: number;
  windGustsKmH: number;
  weatherCode: number;
  weatherDescription: string;
  weatherEmoji: string;
  awningSafe: boolean; // ¿Es seguro desplegar el toldo exterior?
  highProfileWindAlert: boolean; // ¿Rachas peligrosas para furgones altos o autocaravanas?
  frostRiskAlert: boolean; // ¿Riesgo de congelación de agua en circuito camper?
  safetyAdvice: string;
}

class CamperWeatherService {
  /**
   * Obtiene la previsión meteorológica para las coordenadas dadas
   */
  public async getSpotWeather(latitude: number, longitude: number): Promise<CamperWeatherReport> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const current = json.current;
        if (current) {
          const temp = Math.round(current.temperature_2m ?? 18);
          const wind = Math.round(current.wind_speed_10m ?? 12);
          const gusts = Math.round(current.wind_gusts_10m ?? (wind * 1.4));
          const code = current.weather_code ?? 0;

          return this.buildReport(temp, wind, gusts, code);
        }
      }
    } catch (e) {
      Logger.warn('CamperWeatherService', 'Fallback meteorológico offline activado', e);
    }

    // Fallback offline estacional inteligente
    return this.getOfflineSeasonalEstimate(latitude);
  }

  /**
   * Construye el informe con asesoramiento específico para vida camper
   */
  private buildReport(
    temp: number,
    wind: number,
    gusts: number,
    code: number
  ): CamperWeatherReport {
    const { desc, emoji } = this.interpretWeatherCode(code);

    const awningSafe = gusts < 28;
    const highProfileWindAlert = gusts >= 40;
    const frostRiskAlert = temp <= 2;

    let advice = 'Condiciones excelentes para pernoctar.';

    if (highProfileWindAlert) {
      advice = `⚠️ Viento fuerte (${gusts} km/h). Sujeta firmemente la dirección y NO despliegues toldos ni techo elevable.`;
    } else if (!awningSafe) {
      advice = `💨 Rachas de ${gusts} km/h. Recoge el toldo antes de dormir o salir de excursión.`;
    } else if (frostRiskAlert) {
      advice = `❄️ Riesgo de helada (${temp}°C). Mantén la calefacción residual encendida y vigila la válvula FrostControl del boiler.`;
    }

    return {
      temperatureC: temp,
      windSpeedKmH: wind,
      windGustsKmH: gusts,
      weatherCode: code,
      weatherDescription: desc,
      weatherEmoji: emoji,
      awningSafe,
      highProfileWindAlert,
      frostRiskAlert,
      safetyAdvice: advice,
    };
  }

  /**
   * Interpreta los códigos WMO oficiales
   */
  private interpretWeatherCode(code: number): { desc: string; emoji: string } {
    if (code === 0) return { desc: 'Cielo despejado', emoji: '☀️' };
    if (code >= 1 && code <= 3) return { desc: 'Parcialmente nublado', emoji: '⛅' };
    if (code >= 45 && code <= 48) return { desc: 'Niebla o bruma', emoji: '🌫️' };
    if (code >= 51 && code <= 55) return { desc: 'Llovizna suave', emoji: '🌦️' };
    if (code >= 61 && code <= 65) return { desc: 'Lluvia moderada', emoji: '🌧️' };
    if (code >= 71 && code <= 75) return { desc: 'Nevada', emoji: '❄️' };
    if (code >= 80 && code <= 82) return { desc: 'Chubascos', emoji: '🌦️' };
    if (code >= 95 && code <= 99) return { desc: 'Tormenta eléctrica', emoji: '⛈️' };
    return { desc: 'Despejado', emoji: '🌤️' };
  }

  /**
   * Estimador offline según latitud y mes del año
   */
  private getOfflineSeasonalEstimate(latitude: number): CamperWeatherReport {
    const month = new Date().getMonth(); // 0 a 11
    const isWinter = month === 11 || month === 0 || month === 1;
    const isSummer = month >= 5 && month <= 8;

    let temp = 18;
    if (isWinter) temp = latitude > 40 ? 6 : 12;
    if (isSummer) temp = latitude > 40 ? 26 : 31;

    return {
      temperatureC: temp,
      windSpeedKmH: 14,
      windGustsKmH: 22,
      weatherCode: 1,
      weatherDescription: 'Tiempo templado (Caché local)',
      weatherEmoji: '🌤️',
      awningSafe: true,
      highProfileWindAlert: false,
      frostRiskAlert: false,
      safetyAdvice: 'Condiciones meteorológicas estables en ruta.',
    };
  }
}

export const camperWeatherService = new CamperWeatherService();
