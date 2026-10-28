/**
 * DrivingHUD - Head-Up Display de Conducción Futurista y Dinámico
 * CamperSites Pro - Asistente de Ruta Inteligente
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
import {
  AudioAlertMode,
  ClearanceHazard,
  TachographStatus,
  VehicleProfileMode,
} from '../types/assistant';
import { CamperSitesTheme as theme } from '../theme';
import { VehicleRoutingService } from '../services/VehicleRoutingService';

interface DrivingHUDProps {
  currentSpeedKmH: number;
  speedLimit?: number;
  destinationName: string;
  remainingDistanceKm: number;
  remainingDurationMinutes: number;
  profileMode: VehicleProfileMode;
  audioMode: AudioAlertMode;
  vehicleHeightMeters: number;
  showSpeedometer?: boolean;
  activeClearanceHazard?: { hazard: ClearanceHazard; distanceMeters: number } | null;
  tachographStatus?: TachographStatus | null;
  currentDeliveryStop?: { current: number; total: number; eta: string; unloadMinutes: number } | null;
  onStopNavigation: () => void;
  onToggleAudioMode: () => void;
  onOpenClearanceDetails?: () => void;
  onOpenTachographDetails?: () => void;
}

export const DrivingHUD: React.FC<DrivingHUDProps> = ({
  currentSpeedKmH,
  speedLimit = 90,
  destinationName,
  remainingDistanceKm,
  remainingDurationMinutes,
  profileMode,
  audioMode,
  vehicleHeightMeters,
  showSpeedometer = false,
  activeClearanceHazard,
  tachographStatus,
  currentDeliveryStop,
  onStopNavigation,
  onToggleAudioMode,
  onOpenClearanceDetails,
  onOpenTachographDetails,
}) => {
  const isOverSpeed = speedLimit > 0 && currentSpeedKmH > speedLimit;
  const isNearLimit = speedLimit > 0 && currentSpeedKmH > speedLimit - 7 && !isOverSpeed;

  const speedColor = isOverSpeed
    ? theme.colors.hud.speedOver
    : isNearLimit
    ? theme.colors.hud.speedWarning
    : theme.colors.hud.speedNormal;

  const getAudioModeIcon = () => {
    switch (audioMode) {
      case 'bluetooth_hfp': return 'bluetooth-audio';
      case 'silent_visual': return 'volume-off';
      case 'multimedia': default: return 'volume-high';
    }
  };

  const getAudioModeLabel = () => {
    switch (audioMode) {
      case 'bluetooth_hfp': return 'BT HFP';
      case 'silent_visual': return 'Mudo';
      case 'multimedia': default: return 'Audio';
    }
  };

  return (
    <View style={styles.hudContainer}>
      {/* 1. Alerta Crítica de Gálibo / Puente Bajo (Si existe conflicto) */}
      {activeClearanceHazard && (
        <TouchableOpacity
          style={styles.clearanceBanner}
          activeOpacity={0.85}
          onPress={onOpenClearanceDetails}>
          <View style={styles.clearanceIconContainer}>
            <Icon name="arrow-collapse-vertical" size={26} color="#FFFFFF" />
          </View>
          <View style={styles.clearanceInfo}>
            <Text style={styles.clearanceTitle}>⚠️ ALERTA DE GÁLIBO A {activeClearanceHazard.distanceMeters}m</Text>
            <Text style={styles.clearanceSubtitle}>
              Paso máx: {activeClearanceHazard.hazard.maxAllowedHeight.toFixed(2)}m • Tu vehículo: {vehicleHeightMeters.toFixed(2)}m
            </Text>
          </View>
          <Icon name="alert-octagon" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* 2. Barra Superior: Destino + ETA + Audio Mode + Salir */}
      <View style={styles.glassHeader}>
        <View style={styles.destinationBox}>
          <Text style={styles.destName} numberOfLines={1}>{destinationName}</Text>
          <Text style={styles.routeStats}>
            {remainingDistanceKm.toFixed(1)} km • {remainingDurationMinutes} min restante
          </Text>
        </View>

        {/* Quick Audio Mode Toggle */}
        <TouchableOpacity style={styles.audioBadge} onPress={onToggleAudioMode}>
          <Icon name={getAudioModeIcon()} size={18} color="#0EA5E9" />
          <Text style={styles.audioText}>{getAudioModeLabel()}</Text>
        </TouchableOpacity>

        {/* Botón Stop Navigation */}
        <TouchableOpacity style={styles.exitButton} onPress={onStopNavigation}>
          <Icon name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 3. Panel Central: Velocímetro Dinámico de Alto Impacto (opcional si no se usa HUD lateral) */}
      <View style={styles.speedometerRow}>
        {showSpeedometer && (
          <>
            <View style={[styles.speedCircle, { borderColor: speedColor }]}>
              <Text style={[styles.speedNumber, { color: speedColor }]}>
                {Math.round(currentSpeedKmH)}
              </Text>
              <Text style={styles.speedUnit}>KM/H</Text>
            </View>

            {/* Límite de Velocidad */}
            {speedLimit > 0 && (
              <View style={[styles.speedLimitSign, isOverSpeed && styles.speedLimitAlert]}>
                <Text style={styles.speedLimitNumber}>{speedLimit}</Text>
              </View>
            )}
          </>
        )}

        {/* 4. Widgets Específicos por Perfil */}
        {profileMode === 'truck' && tachographStatus && (
          <TouchableOpacity
            style={[
              styles.profileWidget,
              tachographStatus.isWarningActive && styles.widgetWarning,
              tachographStatus.isLimitExceeded && styles.widgetDanger,
            ]}
            onPress={onOpenTachographDetails}>
            <View style={styles.widgetHeader}>
              <Icon name="clock-digital" size={18} color={tachographStatus.isWarningActive ? '#F97316' : '#10B981'} />
              <Text style={styles.widgetTitle}>Tacógrafo UE</Text>
            </View>
            <Text style={styles.widgetValue}>
              {VehicleRoutingService.formatTachographTime(tachographStatus.drivingMinutes)} / 4h 30m
            </Text>
            {tachographStatus.isWarningActive && (
              <Text style={styles.widgetAlertText}>🚨 45 min para descanso legal</Text>
            )}
          </TouchableOpacity>
        )}

        {profileMode === 'delivery' && currentDeliveryStop && (
          <View style={styles.profileWidget}>
            <View style={styles.widgetHeader}>
              <Icon name="package-variant-closed" size={18} color="#06B6D4" />
              <Text style={styles.widgetTitle}>Reparto Express</Text>
            </View>
            <Text style={styles.widgetValue}>
              Parada {currentDeliveryStop.current}/{currentDeliveryStop.total}
            </Text>
            <Text style={styles.widgetSubValue}>
              ETA: {currentDeliveryStop.eta} • ~{currentDeliveryStop.unloadMinutes}m descarga
            </Text>
          </View>
        )}

        {profileMode === 'camper' && (
          <View style={styles.profileWidget}>
            <View style={styles.widgetHeader}>
              <Icon name="caravan" size={18} color="#22C55E" />
              <Text style={styles.widgetTitle}>Modo Camper</Text>
            </View>
            <Text style={styles.widgetValue}>Pernocta Legal Activa</Text>
            <Text style={styles.widgetSubValue}>Servicios AC y agua filtrados</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hudContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 20,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  clearanceBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  clearanceIconContainer: {
    marginRight: 10,
  },
  clearanceInfo: {
    flex: 1,
  },
  clearanceTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  clearanceSubtitle: {
    color: '#FEE2E2',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  glassHeader: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  destinationBox: {
    flex: 1,
    marginRight: 8,
  },
  destName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  routeStats: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: 'rgba(14, 165, 233, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    gap: 4,
  },
  audioText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  exitButton: {
    backgroundColor: '#EF4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedometerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  speedCircle: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  speedNumber: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  speedUnit: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    marginTop: -3,
  },
  speedLimitSign: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  speedLimitAlert: {
    backgroundColor: '#FEE2E2',
    transform: [{ scale: 1.08 }],
  },
  speedLimitNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  profileWidget: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
  },
  widgetWarning: {
    borderColor: '#F97316',
    backgroundColor: 'rgba(40, 20, 10, 0.95)',
  },
  widgetDanger: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(50, 10, 10, 0.95)',
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  widgetTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  widgetValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  widgetSubValue: {
    color: '#06B6D4',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  widgetAlertText: {
    color: '#F97316',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
