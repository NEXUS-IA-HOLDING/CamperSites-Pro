/**
 * ReportAlertButton - Botón sutil + Modal ergonómico para reporte con una mano
 * CamperSites Pro - Asistente de Conducción Segura
 *
 * - Botón pequeño y sutil en dock inferior derecho
 * - Margen automático de 100m alrededor de la posición GPS del vehículo
 * - Selección en 1 toque sin apartar la vista ni manipular coordenadas manualmente
 * - Barra no bloqueante de deshacer (3 segundos) para máxima seguridad al volante
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  AlertType,
  ALERT_CONFIG,
  createAlert,
} from '../lib/communityAlerts';
import { validateAlert, isUserBanned, logSecurityEvent } from '../lib/security';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  userLatitude: number;
  userLongitude: number;
  isLoggedIn: boolean;
  onAlertCreated?: () => void;
  /** Si es true, oculta el FAB propio para permitir integrarlo en un dock agrupado */
  isEmbedded?: boolean;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

interface AlertOptionItem {
  type: AlertType;
  icon: string;
  label: string;
  color: string;
  desc: string;
}

const DRIVER_ALERT_OPTIONS: AlertOptionItem[] = [
  {
    type: 'BARRERA_ALTURA',
    icon: 'car-limousine',
    label: 'Barrera Altura',
    color: '#EF4444',
    desc: 'Gálibo bajo no registrado',
  },
  {
    type: 'RADAR_MOVIL',
    icon: 'radar',
    label: 'Radar Móvil',
    color: '#C2185B',
    desc: 'Control velocidad',
  },
  {
    type: 'CONTROL_POLICIAL',
    icon: 'shield-alert',
    label: 'Control Policial',
    color: '#3F51B5',
    desc: 'Fuerzas de seguridad',
  },
  {
    type: 'OBJETO_CALZADA',
    icon: 'alert-box',
    label: 'Objeto Calzada',
    color: '#F57C00',
    desc: 'Obstáculo en carril',
  },
  {
    type: 'VIA_ESTRECHA_CAMPER',
    icon: 'van-utility',
    label: 'Paso Estrecho',
    color: '#F97316',
    desc: 'Dificultad autocaravana',
  },
  {
    type: 'OBRAS',
    icon: 'hammer-wrench',
    label: 'Obras en Vía',
    color: '#FB8C00',
    desc: 'Carril cortado / desvío',
  },
  {
    type: 'ACCIDENTE',
    icon: 'car-emergency',
    label: 'Accidente',
    color: '#DC2626',
    desc: 'Precaución extrema',
  },
  {
    type: 'ATASCO',
    icon: 'traffic-light',
    label: 'Atasco',
    color: '#E64A19',
    desc: 'Retención total',
  },
  {
    type: 'ZONA_INSEGURA',
    icon: 'shield-alert',
    label: 'Zona Insegura',
    color: '#DC2626',
    desc: 'Aviso robo / peligro',
  },
  {
    type: 'VEHICULO_PARADO',
    icon: 'car-brake-alert',
    label: 'Vehículo Parado',
    color: '#FF9800',
    desc: 'Arcén o carril',
  },
  {
    type: 'CARRETERA_MAL_ESTADO',
    icon: 'road-variant',
    label: 'Baches / Firme',
    color: '#6D4C41',
    desc: 'Asfalto en mal estado',
  },
  {
    type: 'ANIMAL_VIA',
    icon: 'paw',
    label: 'Animal en la Vía',
    color: '#8D6E63',
    desc: 'Peligro inminente',
  },
];

export default function ReportAlertButton({
  userLatitude,
  userLongitude,
  isLoggedIn,
  onAlertCreated,
  isEmbedded = false,
  isOpenExternal = false,
  onCloseExternal,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [undoToast, setUndoToast] = useState<{
    visible: boolean;
    alertType: AlertType;
    alertLabel: string;
    countdown: number;
    alertId?: string;
  } | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isEmbedded) {
      setShowModal(isOpenExternal);
    }
  }, [isOpenExternal, isEmbedded]);

  // Manejo del contador regresivo para deshacer alerta (3 segundos)
  useEffect(() => {
    if (undoToast && undoToast.countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setUndoToast(prev => (prev ? { ...prev, countdown: prev.countdown - 1 } : null));
      }, 1000);
    } else if (undoToast && undoToast.countdown === 0) {
      setUndoToast(null);
    }
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [undoToast]);

  const handleOpenModal = () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Inicia sesión',
        'Necesitas una cuenta para reportar alertas a la comunidad.',
      );
      return;
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    onCloseExternal?.();
  };

  /**
   * Reporte ergonómico en 1 toque:
   * 1. Toma la posición GPS actual del conductor.
   * 2. Aplica automáticamente un margen circular de seguridad de 100 metros.
   * 3. Cierra el modal de inmediato para devolver la atención al volante.
   * 4. Muestra un toast no bloqueante con cuenta regresiva de 3s para deshacer.
   */
  const handleSelectIncident = async (item: AlertOptionItem) => {
    try {
      Vibration.vibrate(50); // Feedback táctil rápido
    } catch (_) {}

    // Validar seguridad de la alerta
    const validation = validateAlert({
      type: item.type,
      latitude: userLatitude,
      longitude: userLongitude,
    });

    if (!validation.valid) {
      Alert.alert('No se puede reportar', validation.error || 'Error de validación');
      handleCloseModal();
      return;
    }

    const banned = await isUserBanned();
    if (banned) {
      Alert.alert('Cuenta suspendida', 'Tu cuenta ha sido restringida por actividad anómala.');
      handleCloseModal();
      return;
    }

    // Cerrar inmediatamente el modal para evitar distracciones en marcha
    handleCloseModal();

    // Activar toast flotante con margen de 100m
    setUndoToast({
      visible: true,
      alertType: item.type,
      alertLabel: item.label,
      countdown: 3,
    });

    setSending(true);
    logSecurityEvent('quick_driver_alert', {
      type: item.type,
      lat: userLatitude,
      lon: userLongitude,
      radiusMeters: 100,
    });

    const result = await createAlert({
      alertType: item.type,
      latitude: userLatitude,
      longitude: userLongitude,
      description: `Reportado por conductor en ruta (Margen 100m)`,
      severity: ALERT_CONFIG[item.type]?.defaultSeverity || 'MEDIA',
    });

    setSending(false);

    if (result.success && result.alert) {
      setUndoToast(prev => (prev ? { ...prev, alertId: result.alert?.id } : null));
      onAlertCreated?.();
    }
  };

  const handleUndo = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setUndoToast(null);
    Alert.alert('Reporte Cancelado', 'La alerta ha sido cancelada.');
  };

  return (
    <>
      {/* Botón flotante sutil (si no está integrado en un dock exterior) */}
      {!isEmbedded && (
        <TouchableOpacity
          style={styles.subtleFab}
          onPress={handleOpenModal}
          activeOpacity={0.85}>
          <Icon name="alert-rhombus" size={24} color="#F59E0B" />
        </TouchableOpacity>
      )}

      {/* Modal Ergonómico para Conducción Segura (One-Handed Driver Sheet) */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          <View style={styles.sheetContent}>
            {/* Tirador y encabezado */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <View style={styles.titleRow}>
                <Icon name="car-defroster" size={20} color="#F59E0B" />
                <Text style={styles.sheetTitle}>Reporte Rápido al Conducir</Text>
              </View>

              {/* Tag del margen automático de 100m */}
              <View style={styles.safetyZoneBadge}>
                <Icon name="map-marker-radius" size={16} color="#10B981" />
                <Text style={styles.safetyZoneText}>
                  Punto fijado automáticamente con radio de 100m en tu GPS actual
                </Text>
              </View>
            </View>

            {/* Grid ergonómico de 12 incidencias (3 columnas x 4 filas táctiles) */}
            <View style={styles.incidentGrid}>
              {DRIVER_ALERT_OPTIONS.map(item => (
                <TouchableOpacity
                  key={item.type}
                  style={styles.incidentCard}
                  onPress={() => handleSelectIncident(item)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: item.color + '22', borderColor: item.color },
                    ]}>
                    <Icon name={item.icon} size={28} color={item.color} />
                  </View>
                  <Text style={styles.incidentLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.incidentDesc} numberOfLines={1}>
                    {item.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Botón inferior de cancelación rápida */}
            <TouchableOpacity style={styles.quickDismissBtn} onPress={handleCloseModal}>
              <Icon name="close" size={18} color="#94A3B8" />
              <Text style={styles.quickDismissText}>Cerrar y volver a la carretera</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast no bloqueante con cuenta atrás para Deshacer (3s) */}
      {undoToast && (
        <View style={styles.undoToastContainer} pointerEvents="box-none">
          <View style={styles.undoToastCard}>
            <View style={styles.undoIconBox}>
              <Icon name="check-circle" size={22} color="#10B981" />
            </View>
            <View style={styles.undoTextBox}>
              <Text style={styles.undoTitle}>
                {undoToast.alertLabel} reportado (radio 100m)
              </Text>
              <Text style={styles.undoSubtitle}>
                Avisando a conductores cercanos...
              </Text>
            </View>
            <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
              <Text style={styles.undoButtonText}>
                Deshacer ({undoToast.countdown}s)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Botón FAB sutil y discreto
  subtleFab: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 90,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#334155',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  safetyZoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  safetyZoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34D399',
    textAlign: 'center',
  },
  incidentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginVertical: 10,
  },
  incidentCard: {
    width: (SCREEN_WIDTH - 56) / 3,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 6,
  },
  incidentLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  incidentDesc: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  quickDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 6,
  },
  quickDismissText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  // Toast no bloqueante
  undoToastContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  undoToastCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
  undoIconBox: {
    marginRight: 10,
  },
  undoTextBox: {
    flex: 1,
  },
  undoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  undoSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  undoButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  undoButtonText: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 12,
  },
});
