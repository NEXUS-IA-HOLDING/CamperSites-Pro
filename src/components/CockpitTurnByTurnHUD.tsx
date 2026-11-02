/**
 * CockpitTurnByTurnHUD.tsx - Panel de navegación activa y maniobra de giro en cabina
 * Proporciona experiencia automotriz estilo Waze / Tesla Navigation:
 * - Próxima maniobra con flecha direccional gigante y metros restantes
 * - Nombre de vía / salida de autovía
 * - ETA, km restantes y tiempo de llegada
 * - Alerta inminente de gálibo / puente bajo si aplica
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AudioAlertMode, TachographStatus } from '../types/assistant';

interface CockpitTurnByTurnHUDProps {
  instruction?: string;
  roadName?: string;
  distanceToTurnMeters?: number;
  maneuverType?: 'turn-right' | 'turn-left' | 'straight' | 'roundabout' | 'merge' | 'u-turn' | 'arrive' | 'fork';
  speedLimitKmH?: number;
  currentSpeedKmH?: number;
  remainingDistanceKm: number;
  remainingMinutes: number;
  etaString?: string;
  isOffRoute?: boolean;
  camera3DMode?: boolean;
  audioMode?: AudioAlertMode;
  nightMode?: 'auto' | 'day' | 'night';
  isNightActive?: boolean;
  tachographStatus?: TachographStatus | null;
  activeHazard?: { maxAllowedHeight: number; distanceMeters: number } | null;
  onStopNavigation: () => void;
  onToggleCameraMode?: () => void;
  onToggleAudioMode?: () => void;
  onToggleNightMode?: () => void;
  onOpenTachographDetails?: () => void;
}

export const CockpitTurnByTurnHUD: React.FC<CockpitTurnByTurnHUDProps> = ({
  instruction = 'Continúe recto por la vía principal',
  roadName,
  distanceToTurnMeters = 350,
  maneuverType = 'straight',
  speedLimitKmH = 90,
  currentSpeedKmH,
  remainingDistanceKm,
  remainingMinutes,
  etaString,
  isOffRoute = false,
  camera3DMode = true,
  audioMode = 'multimedia',
  nightMode = 'auto',
  isNightActive = false,
  tachographStatus,
  activeHazard,
  onStopNavigation,
  onToggleCameraMode,
  onToggleAudioMode,
  onToggleNightMode,
  onOpenTachographDetails,
}) => {
  const getManeuverIcon = () => {
    switch (maneuverType) {
      case 'turn-right': return 'arrow-top-right-thick';
      case 'turn-left': return 'arrow-top-left-thick';
      case 'roundabout': return 'rotate-right';
      case 'merge': return 'source-merge';
      case 'fork': return 'source-fork';
      case 'u-turn': return 'u-turn-left';
      case 'arrive': return 'flag-checkered';
      default: return 'arrow-up-thick';
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  return (
    <View style={styles.hudContainer}>
      {/* Banner de Maniobra Principal (Glassmorphism Oscuro Profundo) */}
      <View style={styles.maneuverCard}>
        <View style={styles.maneuverIconPod}>
          <Icon name={getManeuverIcon()} size={36} color="#FFFFFF" />
          <Text style={styles.turnMetersText}>{formatDistance(distanceToTurnMeters)}</Text>
        </View>

        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText} numberOfLines={2}>
            {instruction}
          </Text>
          <View style={styles.nextRoadRow}>
            <Icon name="road-variant" size={14} color="#38BDF8" style={{ marginRight: 4 }} />
            <Text style={styles.nextRoadText} numberOfLines={1}>
              {roadName || 'Ruta Prioritaria Vehículo Especial'}
            </Text>
          </View>
        </View>

        {/* Señal de límite de velocidad redonda DGT y velocímetro actual */}
        <View style={styles.speedLimitSign}>
          <Text style={styles.speedLimitNumber}>{speedLimitKmH}</Text>
        </View>
      </View>

      {/* Alerta de Desvío de Ruta / Recálculo */}
      {isOffRoute && (
        <View style={[styles.hazardBanner, { backgroundColor: 'rgba(239, 68, 68, 0.95)', borderColor: '#FCA5A5' }]}>
          <Icon name="sync" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={[styles.hazardText, { color: '#FFFFFF' }]}>
            Desvío detectado. Recalculando ruta automáticamente...
          </Text>
        </View>
      )}

      {/* Alerta crítica de gálibo / puente bajo si está en rango */}
      {activeHazard && (
        <View style={styles.hazardBanner}>
          <Icon name="alert-octagon" size={20} color="#FEF08A" style={{ marginRight: 8 }} />
          <Text style={styles.hazardText}>
            ¡ATENCIÓN! Paso inferior {activeHazard.maxAllowedHeight}m a {activeHazard.distanceMeters}m
          </Text>
        </View>
      )}

      {/* Barra de Estadísticas de Viaje y Controles de Cabina */}
      <View style={styles.tripStatsBar}>
        <View style={styles.statPod}>
          <Text style={styles.statValue}>{formatTime(remainingMinutes)}</Text>
          <Text style={styles.statLabel}>TIEMPO</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statPod}>
          <Text style={styles.statValue}>{remainingDistanceKm.toFixed(1)} km</Text>
          <Text style={styles.statLabel}>DISTANCIA</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statPod}>
          <Text style={styles.statValue}>{etaString || '18:45'}</Text>
          <Text style={styles.statLabel}>LLEGADA</Text>
        </View>

        {/* Botón de alternancia Cámara 3D / 2D */}
        {onToggleCameraMode && (
          <TouchableOpacity
            style={styles.hudActionBtn}
            onPress={onToggleCameraMode}
            activeOpacity={0.7}
            accessibilityLabel="Alternar vista 3D / 2D">
            <Icon
              name={camera3DMode ? 'video-3d' : 'map-outline'}
              size={18}
              color={camera3DMode ? '#38BDF8' : '#94A3B8'}
            />
          </TouchableOpacity>
        )}

        {/* Botón de alternancia Canal de Audio */}
        {onToggleAudioMode && (
          <TouchableOpacity
            style={styles.hudActionBtn}
            onPress={onToggleAudioMode}
            activeOpacity={0.7}
            accessibilityLabel="Cambiar canal de audio">
            <Icon
              name={
                audioMode === 'silent_visual'
                  ? 'volume-off'
                  : audioMode === 'bluetooth_hfp'
                  ? 'bluetooth-audio'
                  : 'volume-high'
              }
              size={18}
              color={audioMode === 'silent_visual' ? '#EF4444' : '#10B981'}
            />
          </TouchableOpacity>
        )}

        {/* Botón de alternancia Visión Nocturna / Modo Cabina */}
        {onToggleNightMode && (
          <TouchableOpacity
            style={[styles.hudActionBtn, isNightActive && styles.hudActionBtnNight]}
            onPress={onToggleNightMode}
            activeOpacity={0.7}
            accessibilityLabel="Alternar visión nocturna de cabina">
            <Icon
              name={
                nightMode === 'auto'
                  ? (isNightActive ? 'weather-night' : 'weather-sunset')
                  : nightMode === 'night'
                  ? 'weather-night'
                  : 'white-balance-sunny'
              }
              size={18}
              color={isNightActive ? '#F59E0B' : '#38BDF8'}
            />
          </TouchableOpacity>
        )}

        {/* Alerta de Tacógrafo para conductores de camión */}
        {tachographStatus && onOpenTachographDetails && (
          <TouchableOpacity
            style={[
              styles.hudActionBtn,
              tachographStatus.isWarningActive && { backgroundColor: 'rgba(239, 68, 68, 0.4)' },
            ]}
            onPress={onOpenTachographDetails}
            activeOpacity={0.7}>
            <Icon
              name="clock-alert-outline"
              size={18}
              color={tachographStatus.isWarningActive ? '#EF4444' : '#F59E0B'}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.stopBtn} onPress={onStopNavigation} activeOpacity={0.8}>
          <Icon name="close" size={18} color="#FFFFFF" />
          <Text style={styles.stopBtnText}>Salir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hudContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 20,
    left: 14,
    right: 14,
    zIndex: 120,
  },
  maneuverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  maneuverIconPod: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    minWidth: 70,
  },
  turnMetersText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  instructionContainer: {
    flex: 1,
  },
  instructionText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  nextRoadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  nextRoadText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  speedLimitSign: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  speedLimitNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  hazardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  hazardText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  tripStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  statPod: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  hudActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hudActionBtnNight: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  stopBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
});

export default CockpitTurnByTurnHUD;
