/**
 * ReportAlertButton - Botón flotante + Modal de reporte
 * CamperSites Pro - YRYS
 *
 * Botón FAB que abre un selector de tipo de alerta
 * para que el usuario reporte incidencias en la vía
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  AlertType,
  ALERT_CONFIG,
  createAlert,
} from '../lib/communityAlerts';
import { CamperSitesTheme as theme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  userLatitude: number;
  userLongitude: number;
  isLoggedIn: boolean;
  onAlertCreated?: () => void;
}

const ALERT_TYPES: { type: AlertType; icon: string; label: string; color: string }[] = [
  { type: 'CONTROL_POLICIAL', icon: 'shield-alert', label: 'Control Policial', color: '#FF6F00' },
  { type: 'RADAR_MOVIL', icon: 'radar', label: 'Radar Móvil', color: '#D32F2F' },
  { type: 'ACCIDENTE', icon: 'car-emergency', label: 'Accidente', color: '#B71C1C' },
  { type: 'PELIGRO_VIA', icon: 'alert-octagon', label: 'Peligro en Vía', color: '#E65100' },
  { type: 'VEHICULO_PARADO', icon: 'car-brake-alert', label: 'Vehículo Parado', color: '#F57C00' },
  { type: 'OBRAS', icon: 'hammer-wrench', label: 'Obras', color: '#FF8F00' },
  { type: 'ANIMAL_VIA', icon: 'paw', label: 'Animal en Vía', color: '#6D4C41' },
  { type: 'CONDICIONES_METEOROLOGICAS', icon: 'weather-lightning-rainy', label: 'Mal Tiempo', color: '#1565C0' },
];

export default function ReportAlertButton({
  userLatitude,
  userLongitude,
  isLoggedIn,
  onAlertCreated,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const startPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    startPulse();
    if (!isLoggedIn) {
      Alert.alert(
        'Inicia sesión',
        'Necesitas una cuenta para reportar alertas y ganar puntos.',
      );
      return;
    }
    setShowModal(true);
  };

  const handleReport = async (alertType: AlertType) => {
    setSending(true);

    const result = await createAlert({
      alertType,
      latitude: userLatitude,
      longitude: userLongitude,
    });

    setSending(false);
    setShowModal(false);

    if (result.success) {
      Alert.alert(
        '✅ ¡Alerta reportada!',
        `Has reportado: ${ALERT_CONFIG[alertType].label}\n\n+10 puntos ganados 🎉\n\nOtros conductores serán alertados.`,
      );
      onAlertCreated?.();
    } else {
      Alert.alert('Error', result.error || 'No se pudo enviar la alerta');
    }
  };

  return (
    <>
      {/* FAB Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          { transform: [{ scale: pulseAnim }] },
        ]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handlePress}
          activeOpacity={0.8}>
          <Icon name="alert-plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal selector */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Reportar Alerta</Text>
              <Text style={styles.modalSubtitle}>
                Ayuda a otros conductores • Gana puntos
              </Text>
            </View>

            {/* Grid de tipos */}
            <View style={styles.alertGrid}>
              {ALERT_TYPES.map(item => (
                <TouchableOpacity
                  key={item.type}
                  style={styles.alertCard}
                  onPress={() => handleReport(item.type)}
                  disabled={sending}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.alertIconContainer,
                      { backgroundColor: item.color + '15' },
                    ]}>
                    <Icon name={item.icon} size={30} color={item.color} />
                  </View>
                  <Text style={styles.alertLabel} numberOfLines={2}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Info puntos */}
            <View style={styles.pointsInfo}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={styles.pointsText}>
                +10 puntos por cada alerta • +15 si otros la confirman
              </Text>
            </View>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    zIndex: 100,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text.disabled,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  alertGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  alertCard: {
    width: (SCREEN_WIDTH - 52) / 4,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  alertIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 14,
  },
  pointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    gap: 6,
  },
  pointsText: {
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '500',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
});
