/**
 * AudioAlertService - Sistema de avisos sonoros y por voz para conducción inteligente
 * CamperSites Pro - YRYS
 *
 * Reproduce avisos sonoros y por voz para:
 * 1. Exceso del límite de velocidad
 * 2. Radares fijos/móviles cercanos
 * 3. Incidencias en la carretera (accidentes, animales, tráfico, niebla)
 * 4. Gálibo crítico / puente bajo
 * 5. Alerta de tacógrafo para descanso obligatorio
 */

import { Vibration, Platform } from 'react-native';
import { AudioAlertMode } from '../types/assistant';
import { Logger } from '../utils/logger';

export type AlertSoundType =
  | 'speed_exceeded'
  | 'radar_approaching'
  | 'incident_warning'
  | 'clearance_danger'
  | 'tachograph_warning'
  | 'report_success';

interface AudioAlertOptions {
  audioMode?: AudioAlertMode;
  haptic?: boolean;
  distanceMeters?: number;
  speedLimit?: number;
  incidentLabel?: string;
}

class AudioAlertServiceImpl {
  private lastAlertTimestamps: Map<string, number> = new Map();
  private isMuted: boolean = false;
  private currentAudioMode: AudioAlertMode = 'multimedia';

  /**
   * Configura el modo de audio activo
   */
  public setAudioMode(mode: AudioAlertMode) {
    this.currentAudioMode = mode;
    this.isMuted = mode === 'silent_visual';
  }

  public getAudioMode(): AudioAlertMode {
    return this.currentAudioMode;
  }

  /**
   * Verifica si una alerta está en período de enfriamiento para no spamear
   */
  public shouldPlayAlert(alertKey: string, cooldownMs: number = 20000): boolean {
    const now = Date.now();
    const lastPlayed = this.lastAlertTimestamps.get(alertKey);
    if (lastPlayed && now - lastPlayed < cooldownMs) {
      return false;
    }
    this.lastAlertTimestamps.set(alertKey, now);
    return true;
  }

  /**
   * 1. Aviso de Exceso de Velocidad
   */
  public playSpeedExceededAlert(currentSpeed: number, speedLimit: number) {
    const key = `speed_limit_${speedLimit}`;
    if (!this.shouldPlayAlert(key, 12000)) return;

    this.triggerHapticFeedback([0, 100, 80, 100]);

    if (this.isMuted) return;

    Logger.info('AudioAlertService', `Aviso sonoro: Exceso de velocidad (${Math.round(currentSpeed)} en zona de ${speedLimit})`);
    this.speakText(`Atención, límite de ${speedLimit} superado`);
  }

  /**
   * 2. Aviso de Radar Cercano
   */
  public playRadarApproachingAlert(radarId: string, speedLimit: number, distanceMeters: number) {
    const key = `radar_${radarId}_${Math.round(distanceMeters / 300)}`;
    if (!this.shouldPlayAlert(key, 25000)) return;

    this.triggerHapticFeedback([0, 80, 50, 80]);

    if (this.isMuted) return;

    const roundedDist = Math.round(distanceMeters / 50) * 50;
    Logger.info('AudioAlertService', `Aviso sonoro: Radar a ${roundedDist}m, límite ${speedLimit}`);
    this.speakText(`Radar a ${roundedDist} metros, límite ${speedLimit}`);
  }

  /**
   * 3. Aviso de Incidencia en Carretera
   */
  public playIncidentAlert(incidentId: string, label: string, distanceMeters: number) {
    const key = `incident_${incidentId}`;
    if (!this.shouldPlayAlert(key, 30000)) return;

    this.triggerHapticFeedback([0, 120, 60, 120]);

    if (this.isMuted) return;

    const roundedDist = Math.round(distanceMeters / 100) * 100;
    Logger.info('AudioAlertService', `Aviso sonoro: ${label} a ${roundedDist}m`);
    this.speakText(`Precaución: ${label} a ${roundedDist} metros`);
  }

  /**
   * 4. Alerta Crítica de Gálibo / Altura de Puente
   */
  public playClearanceDangerAlert(maxAllowedHeight: number, vehicleHeight: number) {
    const key = `clearance_danger_${maxAllowedHeight}`;
    if (!this.shouldPlayAlert(key, 8000)) return;

    // Patrón de vibración de emergencia SOS
    this.triggerHapticFeedback([0, 200, 100, 200, 100, 200]);

    if (this.isMuted) return;

    Logger.warn('AudioAlertService', `PELIGRO DE GÁLIBO: Puente ${maxAllowedHeight}m, vehículo ${vehicleHeight}m`);
    this.speakText(`¡Peligro! Altura del puente ${maxAllowedHeight.toFixed(2)} metros inferior a tu vehículo.`);
  }

  /**
   * 5. Alerta de Tacógrafo para Descanso Legal de Camión
   */
  public playTachographRestAlert(remainingMinutes: number) {
    const key = 'tachograph_rest_alert';
    if (!this.shouldPlayAlert(key, 60000)) return;

    this.triggerHapticFeedback([0, 150, 100, 150]);

    if (this.isMuted) return;

    Logger.info('AudioAlertService', `Aviso Tacógrafo: Quedan ${remainingMinutes}m para descanso legal`);
    this.speakText(`Aviso de tacógrafo. Quedan ${remainingMinutes} minutos para el descanso obligatorio.`);
  }

  /**
   * 6. Chime de Éxito al Reportar
   */
  public playSuccessFeedback() {
    this.triggerHapticFeedback([0, 40]);
  }

  /**
   * Emite síntesis de voz / TTS accesible de acuerdo con el canal seleccionado
   */
  private speakText(message: string) {
    try {
      const globalScope = global as any;
      const synth = globalScope.speechSynthesis || (globalScope.window && globalScope.window.speechSynthesis);
      const Utterance = globalScope.SpeechSynthesisUtterance || (globalScope.window && globalScope.window.SpeechSynthesisUtterance);
      if (synth && Utterance) {
        const utterance = new Utterance(message);
        utterance.lang = 'es-ES';
        utterance.rate = 1.05;
        synth.speak(utterance);
      }
    } catch (e) {
      Logger.error('AudioAlertService', 'Error al sintetizar voz', e);
    }
  }

  /**
   * Feedback háptico según preferencias
   */
  private triggerHapticFeedback(pattern: number[]) {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Vibration.vibrate(pattern);
      }
    } catch (_) {}
  }
}

export const AudioAlertService = new AudioAlertServiceImpl();
