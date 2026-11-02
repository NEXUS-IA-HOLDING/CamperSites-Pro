/**
 * CockpitSectionRadarHUD.tsx - Banner Head-Up Display de Radar de Tramo en Tiempo Real
 * CamperSites Pro - Experiencia de Conducción Automotriz
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SectionRadarStatus } from '../services/SectionRadarTracker';

interface CockpitSectionRadarHUDProps {
  status: SectionRadarStatus;
}

export const CockpitSectionRadarHUD: React.FC<CockpitSectionRadarHUDProps> = ({ status }) => {
  const isOver = status.isOverSpeedLimit;
  const isNear = !isOver && status.averageSpeedKmH >= status.speedLimitKmH - 3;

  const avgColor = isOver ? '#EF4444' : isNear ? '#F59E0B' : '#10B981';

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  return (
    <View style={[styles.container, isOver && styles.containerOverSpeed]}>
      {/* Cabecera del Tramo */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <Icon name="camera-control" size={16} color={avgColor} style={{ marginRight: 6 }} />
          <Text style={[styles.badgeText, { color: avgColor }]}>
            RADAR DE TRAMO ACTIVO
          </Text>
        </View>
        <Text style={styles.roadText} numberOfLines={1}>
          {status.zone?.road || 'Carretera controlada'}
        </Text>
      </View>

      {/* Cuerpo Central: Señal DGT + Velocidad Media + Quedan */}
      <View style={styles.bodyRow}>
        {/* Señal DGT límite */}
        <View style={styles.speedLimitSign}>
          <Text style={styles.speedLimitNumber}>{status.speedLimitKmH}</Text>
        </View>

        {/* Medidor de Velocidad Media */}
        <View style={styles.avgSpeedPod}>
          <Text style={styles.avgSpeedLabel}>VELOCIDAD MEDIA</Text>
          <View style={styles.avgSpeedValueRow}>
            <Text style={[styles.avgSpeedNumber, { color: avgColor }]}>
              {status.averageSpeedKmH.toFixed(1)}
            </Text>
            <Text style={styles.avgSpeedUnit}>km/h</Text>
          </View>
          {isOver && (
            <Text style={styles.overSpeedWarning}>
              +{status.overSpeedDeltaKmH.toFixed(1)} km/h ¡REDUZCA!
            </Text>
          )}
        </View>

        {/* Distancia Restante */}
        <View style={styles.remainingPod}>
          <Text style={styles.remainingLabel}>RESTA</Text>
          <Text style={styles.remainingDistance}>
            {formatDistance(status.distanceRemainingMeters)}
          </Text>
          <Text style={styles.remainingPercent}>{status.progressPercent}% completado</Text>
        </View>
      </View>

      {/* Barra de Progreso a lo largo del tramo */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${status.progressPercent}%`, backgroundColor: avgColor },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  containerOverSpeed: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(30, 10, 10, 0.97)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roadText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    maxWidth: 160,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  speedLimitSign: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 3.5,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedLimitNumber: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  avgSpeedPod: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  avgSpeedLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  avgSpeedValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  avgSpeedNumber: {
    fontSize: 26,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  avgSpeedUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 4,
  },
  overSpeedWarning: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: 2,
  },
  remainingPod: {
    alignItems: 'flex-end',
  },
  remainingLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  remainingDistance: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  remainingPercent: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default CockpitSectionRadarHUD;
