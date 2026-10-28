/**
 * VehicleMapCursor - Icono de posición de vehículo personalizable con rotación 360°
 * CamperSites Pro - Navegación Personalizada
 *
 * Permite cambiar la flecha estándar por:
 * - Autocaravana Capuchina (Fiat ARCA del logo)
 * - Camper Van Gran Volumen
 * - Camión Tráiler Pesado (HGV)
 * - Furgón de Reparto Express (TSP)
 * - 4x4 Overlanding / Expedición
 * - Flecha Deportiva Neón
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { VEHICLE_CURSORS, VehicleCursorType } from '../types/assistant';

interface VehicleMapCursorProps {
  cursorType?: VehicleCursorType;
  heading?: number; // Grados de orientación (0-360°)
  isMoving?: boolean;
}

export const VehicleMapCursor: React.FC<VehicleMapCursorProps> = ({
  cursorType = 'camper_arca',
  heading = 0,
  isMoving = false,
}) => {
  const config = VEHICLE_CURSORS[cursorType] || VEHICLE_CURSORS.camper_arca;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Halo de pulso / radar circular */}
      <View
        style={[
          styles.radarPulse,
          {
            backgroundColor: config.haloColor,
            borderColor: config.color,
          },
        ]}
      />

      {/* Vehículo rotatorio orientado según el rumbo de conducción */}
      <View
        style={[
          styles.cursorPod,
          {
            borderColor: config.color,
            shadowColor: config.color,
            transform: [{ rotate: `${Math.round(heading)}deg` }],
          },
        ]}>
        {cursorType === 'arrow' ? (
          <Icon name="navigation" size={24} color={config.color} />
        ) : (
          <Icon name={config.icon} size={22} color="#FFFFFF" />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    opacity: 0.75,
  },
  cursorPod: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default VehicleMapCursor;
