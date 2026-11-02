/**
 * AudioAlertService - Sistema de avisos sonoros y por voz para conducción inteligente
 * CamperSites Pro - YRYS (Cockpit Voice Engine)
 *
 * Reproduce avisos sonoros y síntesis de voz nativa (TTS) para:
 * 1. Exceso del límite de velocidad
 * 2. Radares DGT (fijo, tramo, semáforo, túnel) con distancia escalonada
 * 3. Incidencias en la carretera (accidentes, obras, retenciones, niebla)
 * 4. Gálibo crítico / puente bajo (Alerta máxima de seguridad)
 * 5. Alerta de tacógrafo para descanso legal
 * 6. Guiado y maniobras Turn-by-Turn
 * 7. Disponibilidad de plazas en áreas cercanas
 */

import { Vibration, Platform, NativeModules } from 'react-native';
import { AudioAlertMode } from '../types/assistant';
import { Logger } from '../utils/logger';

export type AlertSoundType =
  | 'speed_exceeded'
  | 'radar_approaching'
  | 'incident_warning'
  | 'clearance_danger'
  | 'tachograph_warning'
  | 'report_success';

export type VoiceNotificationLevel = 
  | 'all'             // Todo: alertas + navegación + confirmaciones
  | 'safety_only'     // Solo alertas de seguridad: radares DGT, velocidad, gálibo (SIN locución en clics de interfaz)
  | 'radars_only'     // Solo radares DGT y límites de velocidad
  | 'mute';           // Silencio total (solo avisos visuales en HUD)

export interface VoicePreferences {
  level: VoiceNotificationLevel;
  announceRadars: boolean;
  announceSpeedLimit: boolean;
  announceClearanceDanger: boolean;
  announceTurnByTurn: boolean;
  announceUiFeedback: boolean; // Silenciado por defecto para no hablar en cada toque
  radarAdvanceDistanceMeters: number;
}

export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  level: 'safety_only',
  announceRadars: true,
  announceSpeedLimit: true,
  announceClearanceDanger: true,
  announceTurnByTurn: true,
  announceUiFeedback: false, // Desactivado por defecto
  radarAdvanceDistanceMeters: 1000,
};

interface AudioAlertOptions {
  audioMode?: AudioAlertMode;
  haptic?: boolean;
  distanceMeters?: number;
  speedLimit?: number;
  incidentLabel?: string;
  radarType?: 'fixed' | 'section' | 'traffic_light' | 'mobile' | 'tunnel';
}

const CockpitTTSNative = NativeModules.CockpitTTS;

class AudioAlertServiceImpl {
  private lastAlertTimestamps: Map<string, number> = new Map();
  private isMuted: boolean = false;
  private currentAudioMode: AudioAlertMode = 'multimedia';
  private speechQueue: string[] = [];
  private isSpeaking: boolean = false;
  private voicePrefs: VoicePreferences = { ...DEFAULT_VOICE_PREFERENCES };

  /**
   * Configura las preferencias granulares de notificación de voz
   */
  public setVoicePreferences(prefs: Partial<VoicePreferences>) {
    this.voicePrefs = { ...this.voicePrefs, ...prefs };
    if (this.voicePrefs.level === 'mute') {
      this.isMuted = true;
    } else if (this.currentAudioMode !== 'silent_visual') {
      this.isMuted = false;
    }
    Logger.info('AudioAlertService', `Preferencias de voz actualizadas: nivel=${this.voicePrefs.level}, uiFeedback=${this.voicePrefs.announceUiFeedback}`);
  }

  public getVoicePreferences(): VoicePreferences {
    return { ...this.voicePrefs };
  }

  public setVoiceLevel(level: VoiceNotificationLevel) {
    this.setVoicePreferences({ level });
  }

  /**
   * Configura el modo de audio activo
   */
  public setAudioMode(mode: AudioAlertMode) {
    this.currentAudioMode = mode;
    this.isMuted = mode === 'silent_visual';
    Logger.info('AudioAlertService', `Modo de audio establecido en: ${mode} (mute: ${this.isMuted})`);
  }

  public getAudioMode(): AudioAlertMode {
    return this.currentAudioMode;
  }

  /**
   * Verifica si una alerta está en período de enfriamiento para evitar repeticiones excesivas
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

    if (this.isMuted || !this.voicePrefs.announceSpeedLimit || this.voicePrefs.level === 'mute') return;

    Logger.info('AudioAlertService', `Aviso sonoro: Exceso de velocidad (${Math.round(currentSpeed)} en zona de ${speedLimit})`);
    this.speakText(`Atención: límite de velocidad de ${speedLimit} kilómetros por hora superado.`);
  }

  /**
   * 2. Aviso de Radar Cercano con tipología DGT
   */
  public playRadarApproachingAlert(
    radarId: string,
    speedLimit: number,
    distanceMeters: number,
    type: 'fixed' | 'section' | 'traffic_light' | 'mobile' | 'tunnel' = 'fixed'
  ) {
    // Clave escalonada según distancia (ej. a 800m, 500m, 200m)
    const tier = distanceMeters > 500 ? 'far' : distanceMeters > 250 ? 'mid' : 'close';
    const key = `radar_${radarId}_${tier}`;
    if (!this.shouldPlayAlert(key, 20000)) return;

    this.triggerHapticFeedback([0, 80, 50, 80]);

    if (this.isMuted || !this.voicePrefs.announceRadars || this.voicePrefs.level === 'mute') return;

    const roundedDist = Math.round(distanceMeters / 50) * 50;
    let typeName = 'Radar fijo';
    if (type === 'section') typeName = 'Inicio de radar de tramo';
    else if (type === 'traffic_light') typeName = 'Radar de semáforo';
    else if (type === 'tunnel') typeName = 'Radar en túnel';
    else if (type === 'mobile') typeName = 'Posible radar móvil';

    const speech = `Atención: ${typeName} a ${roundedDist} metros. Límite ${speedLimit}.`;
    Logger.info('AudioAlertService', `Aviso de radar: ${speech}`);
    this.speakText(speech);
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
    const speech = `Precaución: ${label} a ${roundedDist} metros.`;
    Logger.info('AudioAlertService', speech);
    this.speakText(speech);
  }

  /**
   * 4. Alerta Crítica de Gálibo / Altura de Puente
   */
  public playClearanceDangerAlert(maxAllowedHeight: number, vehicleHeight: number) {
    const key = `clearance_danger_${maxAllowedHeight}`;
    if (!this.shouldPlayAlert(key, 8000)) return;

    // Patrón de vibración de emergencia SOS
    this.triggerHapticFeedback([0, 200, 100, 200, 100, 200]);

    if (this.isMuted || !this.voicePrefs.announceClearanceDanger || this.voicePrefs.level === 'mute') return;

    Logger.warn('AudioAlertService', `PELIGRO DE GÁLIBO: Puente ${maxAllowedHeight}m, vehículo ${vehicleHeight}m`);
    this.speakText(`¡Peligro! Altura del paso inferior de ${maxAllowedHeight.toFixed(2)} metros incompatible con tu vehículo.`);
  }

  /**
   * 5. Alerta de Tacógrafo para Descanso Legal de Camión / Gran Autocaravana
   */
  public playTachographRestAlert(remainingMinutes: number) {
    const key = 'tachograph_rest_alert';
    if (!this.shouldPlayAlert(key, 60000)) return;

    this.triggerHapticFeedback([0, 150, 100, 150]);

    if (this.isMuted) return;

    Logger.info('AudioAlertService', `Aviso Tacógrafo: Quedan ${remainingMinutes}m para descanso legal`);
    this.speakText(`Aviso de conducción: restan ${remainingMinutes} minutos para el descanso obligatorio.`);
  }

  /**
   * 6. Alerta de Área con Plazas Libres Cercana
   */
  public playSpotOccupancyAlert(spotName: string, availableSpots: number, distanceMeters: number) {
    const key = `spot_occ_${spotName}`;
    if (!this.shouldPlayAlert(key, 120000)) return;

    if (this.isMuted) return;

    const distKm = (distanceMeters / 1000).toFixed(1);
    const speech = `Área cercana a ${distKm} kilómetros: ${spotName}, con ${availableSpots} plazas disponibles.`;
    Logger.info('AudioAlertService', speech);
    this.speakText(speech);
  }

  /**
   * 7. Feedback de Confirmación de Acción
   */
  public playSuccessFeedback() {
    this.triggerHapticFeedback([0, 40]);
  }

  /**
   * Locución directa para navegación Turn-by-Turn o avisos personalizados
   */
  public speak(
    message: string,
    cooldownKey?: string,
    cooldownMs: number = 5000,
    category: 'ui' | 'safety' | 'nav' = 'ui'
  ) {
    if (this.isMuted || this.voicePrefs.level === 'mute') return;
    if (category === 'ui' && !this.voicePrefs.announceUiFeedback) return;
    if (category === 'nav' && !this.voicePrefs.announceTurnByTurn) return;
    if (this.voicePrefs.level === 'radars_only' && category !== 'safety') return;

    if (cooldownKey && !this.shouldPlayAlert(cooldownKey, cooldownMs)) return;
    Logger.info('AudioAlertService', `Locución Cockpit (${category}): "${message}"`);
    this.speakText(message);
  }

  /**
   * Emite síntesis de voz nativa (Android CockpitTTS) o Web SpeechSynthesis fallback
   */
  private speakText(message: string) {
    try {
      // 1. Android Native TTS Module (zero latencia, alta fidelidad en español de España)
      if (CockpitTTSNative && typeof CockpitTTSNative.speak === 'function') {
        CockpitTTSNative.speak(message);
        return;
      }

      // 2. Fallback Web / Hybrid SpeechSynthesis
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
      Logger.error('AudioAlertService', 'Error al sintetizar voz de cabina', e);
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
