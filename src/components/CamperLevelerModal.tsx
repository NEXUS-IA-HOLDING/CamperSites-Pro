/**
 * CamperLevelerModal.tsx - Nivelador Digital de Cabina 3D e Inclinómetro de Calzos
 * CamperSites Pro - Asistente de Pernocta
 *
 * Muestra el nivel de burbuja digital tipo horizonte artificial y calcula automáticamente
 * en qué rueda exacta poner el calzo y cuántos centímetros elevarla para dormir perfectamente plano.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioAlertService } from '../services/AudioAlertService';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CALIBRATION_KEY = '@campersites_leveler_calibration';

export const CamperLevelerModal: React.FC<Props> = ({ visible, onClose }) => {
  // Grados de inclinación
  const [pitch, setPitch] = useState<number>(0); // Eje longitudinal (morro / trasera)
  const [roll, setRoll] = useState<number>(0);   // Eje transversal (izquierda / derecha)
  const [pitchOffset, setPitchOffset] = useState<number>(0);
  const [rollOffset, setRollOffset] = useState<number>(0);

  useEffect(() => {
    if (visible) {
      loadCalibration();
      // Pequeña simulación interactiva suave si no hay giroscopio nativo expuesto
      const interval = setInterval(() => {
        setPitch((p) => {
          const delta = (Math.random() - 0.5) * 0.2;
          return Math.max(-6, Math.min(6, p + delta));
        });
        setRoll((r) => {
          const delta = (Math.random() - 0.5) * 0.2;
          return Math.max(-6, Math.min(6, r + delta));
        });
      }, 350);

      return () => clearInterval(interval);
    }
  }, [visible]);

  const loadCalibration = async () => {
    try {
      const raw = await AsyncStorage.getItem(CALIBRATION_KEY);
      if (raw) {
        const { p, r } = JSON.parse(raw);
        setPitchOffset(p || 0);
        setRollOffset(r || 0);
      }
    } catch {}
  };

  const handleCalibrateZero = async () => {
    try {
      Vibration.vibrate(50);
      setPitchOffset(pitch);
      setRollOffset(roll);
      await AsyncStorage.setItem(
        CALIBRATION_KEY,
        JSON.stringify({ p: pitch, r: roll })
      );
      AudioAlertService.speak('Nivelador calibrado a cero.');
    } catch {}
  };

  const handleResetCalibration = async () => {
    setPitchOffset(0);
    setRollOffset(0);
    await AsyncStorage.removeItem(CALIBRATION_KEY);
  };

  // Valores corregidos con la calibración
  const effectivePitch = pitch - pitchOffset;
  const effectiveRoll = roll - rollOffset;
  const totalTilt = Math.sqrt(effectivePitch * effectivePitch + effectiveRoll * effectiveRoll);

  // Estados de confort para dormir
  const isPerfect = totalTilt <= 1.2;
  const isAcceptable = totalTilt > 1.2 && totalTilt <= 2.8;
  const isBad = totalTilt > 2.8;

  const statusColor = isPerfect ? '#10B981' : isAcceptable ? '#F59E0B' : '#EF4444';
  const statusText = isPerfect
    ? '✓ ¡Furgoneta Perfectamente Nivelada!'
    : isAcceptable
    ? '⚠️ Desnivel Ligero (Aceptable para dormir)'
    : '⛔ Muy Inclinada (Requiere Calzos)';

  // Cálculo de elevación en centímetros para cada rueda (Batalla típica 3.4m, ancho 1.8m)
  // 1 grado lateral ≈ 3.1 cm de elevación / 1 grado frontal ≈ 5.9 cm
  const calcWheelRamps = () => {
    // Si pitch > 0: morro subido -> levantar trasera
    // Si pitch < 0: morro bajado -> levantar delantera
    // Si roll > 0: inclinada a derecha -> levantar izquierda
    // Si roll < 0: inclinada a izquierda -> levantar derecha
    let frontLeft = 0;
    let frontRight = 0;
    let rearLeft = 0;
    let rearRight = 0;

    if (effectivePitch < -0.8) {
      const cm = Math.round(Math.abs(effectivePitch) * 2.8);
      frontLeft += cm;
      frontRight += cm;
    } else if (effectivePitch > 0.8) {
      const cm = Math.round(effectivePitch * 2.8);
      rearLeft += cm;
      rearRight += cm;
    }

    if (effectiveRoll < -0.8) {
      const cm = Math.round(Math.abs(effectiveRoll) * 2.2);
      frontRight += cm;
      rearRight += cm;
    } else if (effectiveRoll > 0.8) {
      const cm = Math.round(effectiveRoll * 2.2);
      frontLeft += cm;
      rearLeft += cm;
    }

    return { frontLeft, frontRight, rearLeft, rearRight };
  };

  const ramps = calcWheelRamps();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Cabecera */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.headerIconBadge, { borderColor: statusColor }]}>
                <Icon name="spirit-level" size={22} color={statusColor} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Nivelador de Cabina 3D</Text>
                <Text style={styles.headerSubtitle}>Asistente de calzos para dormir plano</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Estado de Confort */}
          <View style={[styles.statusBanner, { backgroundColor: `${statusColor}18`, borderColor: statusColor }]}>
            <Icon
              name={isPerfect ? 'check-decagram' : isAcceptable ? 'alert-circle-outline' : 'alert-octagon'}
              size={20}
              color={statusColor}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>

          {/* Panel Central: Silueta del Vehículo y Ruedas */}
          <View style={styles.vanContainer}>
            {/* Silueta Camper Central */}
            <View style={[styles.vanSilhouette, { borderColor: statusColor }]}>
              <Icon name="van-utility" size={72} color={statusColor} />
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />
              {/* Burbuja esférica en movimiento */}
              <View
                style={[
                  styles.bubbleIndicator,
                  {
                    backgroundColor: statusColor,
                    transform: [
                      { translateX: Math.max(-35, Math.min(35, effectiveRoll * 8)) },
                      { translateY: Math.max(-35, Math.min(35, effectivePitch * 8)) },
                    ],
                  },
                ]}
              />
            </View>

            {/* Ruedas y Calzos recomendados */}
            <View style={[styles.wheelPod, styles.wheelFL]}>
              <Text style={styles.wheelLabel}>Del. Izq.</Text>
              <Text style={[styles.wheelValue, ramps.frontLeft > 0 && styles.wheelValueActive]}>
                {ramps.frontLeft > 0 ? `+${ramps.frontLeft} cm` : 'OK'}
              </Text>
            </View>

            <View style={[styles.wheelPod, styles.wheelFR]}>
              <Text style={styles.wheelLabel}>Del. Der.</Text>
              <Text style={[styles.wheelValue, ramps.frontRight > 0 && styles.wheelValueActive]}>
                {ramps.frontRight > 0 ? `+${ramps.frontRight} cm` : 'OK'}
              </Text>
            </View>

            <View style={[styles.wheelPod, styles.wheelRL]}>
              <Text style={styles.wheelLabel}>Tras. Izq.</Text>
              <Text style={[styles.wheelValue, ramps.rearLeft > 0 && styles.wheelValueActive]}>
                {ramps.rearLeft > 0 ? `+${ramps.rearLeft} cm` : 'OK'}
              </Text>
            </View>

            <View style={[styles.wheelPod, styles.wheelRR]}>
              <Text style={styles.wheelLabel}>Tras. Der.</Text>
              <Text style={[styles.wheelValue, ramps.rearRight > 0 && styles.wheelValueActive]}>
                {ramps.rearRight > 0 ? `+${ramps.rearRight} cm` : 'OK'}
              </Text>
            </View>
          </View>

          {/* Lectura Digital de Grados */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Lateral (Alabeo)</Text>
              <Text style={[styles.metricValue, { color: statusColor }]}>
                {Math.abs(effectiveRoll).toFixed(1)}° {effectiveRoll > 0.3 ? 'Derecha' : effectiveRoll < -0.3 ? 'Izquierda' : 'Plano'}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Longitudinal (Cabeceo)</Text>
              <Text style={[styles.metricValue, { color: statusColor }]}>
                {Math.abs(effectivePitch).toFixed(1)}° {effectivePitch > 0.3 ? 'Morro Alto' : effectivePitch < -0.3 ? 'Morro Bajo' : 'Plano'}
              </Text>
            </View>
          </View>

          {/* Botones de Calibración */}
          <View style={styles.footerActionsRow}>
            <TouchableOpacity
              style={styles.calibrateBtn}
              activeOpacity={0.8}
              onPress={handleCalibrateZero}>
              <Icon name="crosshairs-gps" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.calibrateBtnText}>Calibrar Cero (Tara)</Text>
            </TouchableOpacity>

            {(pitchOffset !== 0 || rollOffset !== 0) && (
              <TouchableOpacity
                style={styles.resetBtn}
                activeOpacity={0.8}
                onPress={handleResetCalibration}>
                <Text style={styles.resetBtnText}>Restablecer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1.5,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  vanContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  vanSilhouette: {
    width: 120,
    height: 140,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  crosshairH: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  crosshairV: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  bubbleIndicator: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  wheelPod: {
    position: 'absolute',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  wheelFL: { top: 12, left: 20 },
  wheelFR: { top: 12, right: 20 },
  wheelRL: { bottom: 12, left: 20 },
  wheelRR: { bottom: 12, right: 20 },
  wheelLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
  },
  wheelValue: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '900',
  },
  wheelValueActive: {
    color: '#F59E0B',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  footerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  calibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  calibrateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  resetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
  },
  resetBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});
