/**
 * CockpitHazardVerificationHUD.tsx - Tarjeta de Verificación Comunitaria en Tiempo Real (Estilo Waze / Google Maps)
 * CamperSites Pro - Asistente de Conducción Segura
 *
 * Se activa automáticamente cuando un conductor se aproxima a un obstáculo, radar o barrera
 * reportada previamente para validar si sigue presente o ya está despejada.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommunityAlert, ALERT_CONFIG, voteAlert } from '../lib/communityAlerts';
import { AudioAlertService } from '../services/AudioAlertService';

interface Props {
  alert: CommunityAlert | null;
  distanceMeters: number;
  onDismiss: () => void;
  onVoted?: (alertId: string, vote: 'CONFIRM' | 'DENY') => void;
}

export const CockpitHazardVerificationHUD: React.FC<Props> = ({
  alert,
  distanceMeters,
  onDismiss,
  onVoted,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (alert) {
      setFeedback(null);
      // Animación de entrada
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }).start();

      // Alerta sonora sutil de cortesía
      try {
        Vibration.vibrate(60);
        AudioAlertService.speak('Atención, aproximación a incidencia en vía. Por favor confirma si sigue presente.');
      } catch {}

      // Auto-descartar después de 14 segundos si no responde
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 14000);
    } else {
      handleDismiss();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [alert?.id]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const handleVote = async (type: 'CONFIRM' | 'DENY') => {
    if (!alert) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    try {
      Vibration.vibrate(40);
    } catch {}

    const isConfirm = type === 'CONFIRM';
    setFeedback(
      isConfirm
        ? '✓ ¡Confirmado! Gracias por avisar a otros campistas (+10 pts)'
        : '✕ Notificado como despejado. ¡Buen viaje! (+10 pts)'
    );

    await voteAlert(alert.id, type, alert.latitude, alert.longitude, distanceMeters);
    onVoted?.(alert.id, type);

    setTimeout(() => {
      handleDismiss();
    }, 2200);
  };

  if (!alert) return null;

  const config = ALERT_CONFIG[alert.alert_type] || {
    icon: 'alert-circle',
    color: '#F59E0B',
    label: 'Incidencia en Vía',
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}>
      <View style={styles.card}>
        {feedback ? (
          <View style={styles.feedbackRow}>
            <Icon
              name="check-decagram"
              size={24}
              color="#10B981"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        ) : (
          <>
            {/* Cabecera del Aviso */}
            <View style={styles.headerRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${config.color}25` }]}>
                <Icon name={config.icon} size={22} color={config.color} />
              </View>

              <View style={styles.headerTextWrap}>
                <View style={styles.badgeRow}>
                  <Text style={styles.badgeLabel}>AVISO EN LA VÍA</Text>
                  <Text style={styles.distanceBadge}>A {Math.round(distanceMeters)} m</Text>
                </View>
                <Text style={styles.alertTitle} numberOfLines={1}>
                  {config.label}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleDismiss}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Pregunta rápida para el conductor */}
            <Text style={styles.questionText}>
              ¿Sigue presente este obstáculo o control?
            </Text>

            {/* Botones de Respuesta de 1 toque */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.btnAction, styles.btnConfirm]}
                activeOpacity={0.8}
                onPress={() => handleVote('CONFIRM')}>
                <Icon name="check-bold" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnTextConfirm}>SÍ, SIGUE AQUÍ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnAction, styles.btnDeny]}
                activeOpacity={0.8}
                onPress={() => handleVote('DENY')}>
                <Icon name="close-thick" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnTextDeny}>DESPEJADO</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 44,
    left: 12,
    right: 12,
    zIndex: 99999,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.6,
  },
  distanceBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 6,
  },
  questionText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnConfirm: {
    backgroundColor: '#10B981',
  },
  btnDeny: {
    backgroundColor: '#334155',
  },
  btnTextConfirm: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnTextDeny: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  feedbackText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
