/**
 * SpeedGaugesHUD - Indicadores automotrices de velocidad en el lado izquierdo
 * CamperSites Pro - Asistente de Ruta Inteligente
 *
 * Marcador 1: Señal redonda DGT oficial de límite de velocidad (blanco con borde rojo)
 * Marcador 2: Velocímetro digital en tiempo real con halo dinámico de proximidad/exceso
 */

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Platform,
} from 'react-native';

interface SpeedGaugesHUDProps {
  currentSpeedKmH: number;
  speedLimit?: number;
}

export const SpeedGaugesHUD: React.FC<SpeedGaugesHUDProps> = ({
  currentSpeedKmH,
  speedLimit = 90,
}) => {
  const isOverSpeed = speedLimit > 0 && currentSpeedKmH > speedLimit;
  const isNearLimit =
    speedLimit > 0 && currentSpeedKmH > speedLimit - 7 && !isOverSpeed;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isOverSpeed) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOverSpeed, pulseAnim]);

  // Halo dinámico de color
  const haloColor = isOverSpeed
    ? '#EF4444' // Rojo exceso
    : isNearLimit
    ? '#F59E0B' // Ámbar advertencia
    : '#10B981'; // Verde esmeralda óptimo

  const displaySpeed = Math.max(0, Math.round(currentSpeedKmH));

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 1. SEÑAL REDONDA DGT: LÍMITE DE VELOCIDAD */}
      {speedLimit > 0 && (
        <View style={styles.speedLimitSign}>
          <Text style={styles.speedLimitText}>{speedLimit}</Text>
        </View>
      )}

      {/* 2. VELOCÍMETRO DIGITAL EN TIEMPO REAL CON HALO DINÁMICO */}
      <Animated.View
        style={[
          styles.speedGaugePod,
          {
            borderColor: haloColor,
            shadowColor: haloColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}>
        <Text style={[styles.speedValueText, { color: isOverSpeed ? '#EF4444' : '#FFFFFF' }]}>
          {displaySpeed}
        </Text>
        <Text style={styles.speedUnitText}>KM/H</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    top: Platform.OS === 'ios' ? 120 : 100,
    zIndex: 90,
    alignItems: 'center',
    gap: 12,
  },
  // Señal oficial DGT (círculo blanco con grueso borde rojo)
  speedLimitSign: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 5,
    borderColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  speedLimitText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  // Pod cockpit velocímetro digital
  speedGaugePod: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 10,
  },
  speedValueText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    includeFontPadding: false,
    lineHeight: 26,
  },
  speedUnitText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: -2,
  },
});
export default SpeedGaugesHUD;
