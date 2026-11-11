/**
 * RewardedAdSimulationEngine.ts
 * Motor de Simulación de Anuncios Recompensados Desacoplado
 * CamperSites Pro - Conducción Segura y Modo Offline
 *
 * Características:
 * - Cero dependencias de credenciales o SDKs nativos de AdMob (offline-ready).
 * - Cuenta atrás realista de 5 segundos con emisión de ticks.
 * - Rotación de patrocinadores camper verificados (Repsol AutoGas GLP, Baleària, Allianz).
 * - Speed Watchdog integrado: cancela de inmediato la reproducción si el vehículo se mueve (> 0.5 km/h).
 */

import { Logger } from '../utils/logger';

export interface AdSponsor {
  id: string;
  name: string;
  headline: string;
  tagline: string;
  badge: string;
  logoIcon: string;
  accentColor: string;
  ctaText: string;
}

export const AD_SPONSORS: AdSponsor[] = [
  {
    id: 'repsol_autogas',
    name: 'Repsol AutoGas GLP',
    headline: 'Red Oficial AutoGas GLP y Lavado RV Alta Presión',
    tagline: 'Repostaje GLP para calefacción Truma, AdBlue a granel y pistas de lavado con gálibo especial para autocaravanas.',
    badge: '⛽ Combustible & GLP',
    logoIcon: 'gas-station',
    accentColor: '#FF6F00',
    ctaText: 'Localizar Estaciones GLP',
  },
  {
    id: 'balearia_ferries',
    name: 'Baleària Ferries Camper',
    headline: 'Conexión Marítima Balears & Marruecos con Toma 220V',
    tagline: 'Embarque prioritario de autocaravanas, conexión eléctrica continua en bodega y camarotes pet-friendly.',
    badge: '⛴️ Rutas Marítimas',
    logoIcon: 'ferry',
    accentColor: '#0288D1',
    ctaText: 'Ver Rutas Camper Baleària',
  },
  {
    id: 'allianz_camper',
    name: 'Allianz Camper Seguros',
    headline: 'Póliza Especializada RV sin Límite de Altura ni Tonelaje',
    tagline: 'Asistencia en carretera 24/7 en toda Europa, grúa sin límite de peso y cobertura de accesorios interiores fijos.',
    badge: '🛡️ Seguro Especializado',
    logoIcon: 'shield-check',
    accentColor: '#1565C0',
    ctaText: 'Calcular Seguro Camper',
  },
];

export interface AdSimulationCallbacks {
  onCountdown?: (secondsRemaining: number) => void;
  onComplete?: () => void;
  onAborted?: (reason: string) => void;
}

export const AD_SIMULATION_DURATION_SECONDS = 5;
export const STATIONARY_SPEED_THRESHOLD_KMH = 3.5;

export class RewardedAdSimulationEngine {
  private active = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private secondsRemaining = AD_SIMULATION_DURATION_SECONDS;
  private activeCallbacks: AdSimulationCallbacks | null = null;
  private currentSponsorIndex = 0;
  private currentSpeedKmH = 0;
  private consecutiveSpeedViolations = 0;

  constructor() {
    this.currentSponsorIndex = Math.floor(Math.random() * AD_SPONSORS.length);
  }

  /**
   * Obtiene el patrocinador actual asignado para el anuncio.
   */
  public getCurrentSponsor(): AdSponsor {
    return AD_SPONSORS[this.currentSponsorIndex % AD_SPONSORS.length];
  }

  /**
   * Avanza al siguiente patrocinador de la rotación y lo devuelve.
   */
  public getNextSponsor(): AdSponsor {
    this.currentSponsorIndex = (this.currentSponsorIndex + 1) % AD_SPONSORS.length;
    return this.getCurrentSponsor();
  }

  /**
   * Indica si hay una simulación en curso.
   */
  public isSimulating(): boolean {
    return this.active;
  }

  /**
   * Devuelve los segundos restantes de la cuenta atrás actual.
   */
  public getRemainingSeconds(): number {
    return this.secondsRemaining;
  }

  /**
   * Actualiza la velocidad del vehículo en el Watchdog.
   * Si la simulación está activa y la velocidad supera el umbral estacionario (> 3.5 km/h)
   * durante al menos 2 lecturas consecutivas, aborta la reproducción por seguridad vial.
   */
  public updateSpeed(speedKmH: number): void {
    this.currentSpeedKmH = Math.max(0, speedKmH || 0);

    if (this.currentSpeedKmH > STATIONARY_SPEED_THRESHOLD_KMH) {
      this.consecutiveSpeedViolations += 1;
    } else {
      this.consecutiveSpeedViolations = 0;
    }

    if (this.active && this.consecutiveSpeedViolations >= 2) {
      Logger.warn(
        'RewardedAdSimulationEngine',
        `Speed Watchdog triggered: vehicle moving at ${this.currentSpeedKmH.toFixed(1)} km/h (2 consecutive readings). Aborting ad.`
      );
      this.cancelAdSimulation(
        `Vehículo en movimiento detectado (${this.currentSpeedKmH.toFixed(1)} km/h). Anuncio abortado por seguridad vial.`
      );
    }
  }

  /**
   * Inicia la simulación del anuncio recompensado.
   * Valida previamente que el vehículo esté completamente detenido.
   */
  public startAdSimulation(callbacks: AdSimulationCallbacks): boolean {
    // Si ya hay una simulación corriendo, abortamos la anterior
    if (this.active) {
      this.cancelAdSimulation('Nueva simulación solicitada.');
    }

    // Comprobación de seguridad vial previa al inicio
    if (this.currentSpeedKmH > STATIONARY_SPEED_THRESHOLD_KMH) {
      Logger.warn(
        'RewardedAdSimulationEngine',
        `Cannot start ad: vehicle is moving at ${this.currentSpeedKmH.toFixed(1)} km/h.`
      );
      callbacks.onAborted?.(
        `No se puede iniciar el anuncio con el vehículo en marcha (${this.currentSpeedKmH.toFixed(1)} km/h).`
      );
      return false;
    }

    this.active = true;
    this.activeCallbacks = callbacks;
    this.secondsRemaining = AD_SIMULATION_DURATION_SECONDS;
    this.consecutiveSpeedViolations = 0;
    this.getNextSponsor();

    Logger.info(
      'RewardedAdSimulationEngine',
      `Starting ad simulation (Sponsor: ${this.getCurrentSponsor().name}, Duration: ${this.secondsRemaining}s)`
    );

    // Notificar primer segundo
    this.activeCallbacks.onCountdown?.(this.secondsRemaining);

    this.timer = setInterval(() => {
      // Vigilancia en cada tick de intervalo
      if (this.currentSpeedKmH > STATIONARY_SPEED_THRESHOLD_KMH && this.consecutiveSpeedViolations >= 2) {
        this.cancelAdSimulation(
          `Vehículo en marcha detectado (${this.currentSpeedKmH.toFixed(1)} km/h). Anuncio cancelado por seguridad vial.`
        );
        return;
      }

      this.secondsRemaining -= 1;

      if (this.secondsRemaining > 0) {
        this.activeCallbacks?.onCountdown?.(this.secondsRemaining);
      } else {
        // Anuncio completado con éxito
        this.clearTimer();
        this.active = false;
        this.consecutiveSpeedViolations = 0;
        const cb = this.activeCallbacks;
        this.activeCallbacks = null;

        Logger.info('RewardedAdSimulationEngine', 'Ad simulation completed successfully.');
        cb?.onCountdown?.(0);
        cb?.onComplete?.();
      }
    }, 1000);

    return true;
  }

  /**
   * Cancela la simulación en curso con un motivo específico.
   */
  public cancelAdSimulation(reason: string): void {
    if (!this.active) return;

    this.clearTimer();
    this.active = false;
    this.consecutiveSpeedViolations = 0;
    const cb = this.activeCallbacks;
    this.activeCallbacks = null;

    Logger.warn('RewardedAdSimulationEngine', `Ad simulation cancelled: ${reason}`);
    cb?.onAborted?.(reason);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const rewardedAdSimulationEngine = new RewardedAdSimulationEngine();
