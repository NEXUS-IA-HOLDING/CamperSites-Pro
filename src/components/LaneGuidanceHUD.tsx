/**
 * LaneGuidanceHUD.tsx - Visualizador Automotriz de Guía de Carriles en Carretera
 * CamperSites Pro - Estilo Sygic Truck / Waze Cockpit
 * 
 * Muestra la configuración de carriles de la calzada (ej: 4 carriles en autovía)
 * e ilumina claramente los carriles válidos para el próximo desvío o salida.
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface LaneInfo {
  valid: boolean;
  indications: string[]; // 'left' | 'straight' | 'right' | 'slight right' | 'slight left' | 'uturn'
}

interface LaneGuidanceHUDProps {
  lanes: LaneInfo[];
  distanceToManeuverMeters?: number;
}

export const LaneGuidanceHUD: React.FC<LaneGuidanceHUDProps> = ({
  lanes,
  distanceToManeuverMeters,
}) => {
  if (!lanes || lanes.length === 0) return null;

  const getLaneIcon = (indications: string[]) => {
    const ind = indications[0] || 'straight';
    switch (ind) {
      case 'left':
      case 'sharp left':
        return 'arrow-top-left';
      case 'slight left':
        return 'arrow-top-left-thin';
      case 'right':
      case 'sharp right':
        return 'arrow-top-right';
      case 'slight right':
        return 'arrow-top-right-thin';
      case 'uturn':
        return 'u-turn-left';
      case 'straight':
      default:
        return 'arrow-up';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <Icon name="arrow-split-vertical" size={13} color="#38BDF8" style={{ marginRight: 4 }} />
        <Text style={styles.badgeText}>SELECCIÓN DE CARRIL</Text>
        {distanceToManeuverMeters !== undefined && (
          <Text style={styles.distanceBadge}>a {Math.round(distanceToManeuverMeters)}m</Text>
        )}
      </View>

      <View style={styles.lanesRow}>
        {lanes.map((lane, index) => {
          const isValid = lane.valid;
          return (
            <View
              key={`lane-${index}`}
              style={[
                styles.laneBox,
                isValid ? styles.laneBoxValid : styles.laneBoxInvalid,
              ]}>
              <Icon
                name={getLaneIcon(lane.indications)}
                size={22}
                color={isValid ? '#FFFFFF' : 'rgba(148, 163, 184, 0.4)'}
              />
              {/* Indicador inferior de carril activo */}
              <View
                style={[
                  styles.laneIndicatorDot,
                  isValid ? styles.dotValid : styles.dotInvalid,
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 6,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  badgeText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  distanceBadge: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 6,
  },
  lanesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  laneBox: {
    width: 38,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  laneBoxValid: {
    backgroundColor: '#0284C7',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  laneBoxInvalid: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  laneIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  dotValid: {
    backgroundColor: '#67E8F9',
  },
  dotInvalid: {
    backgroundColor: 'transparent',
  },
});

export default LaneGuidanceHUD;
