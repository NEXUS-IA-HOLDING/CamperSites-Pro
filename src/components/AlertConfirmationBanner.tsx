/**
 * AlertConfirmationBanner - Banner para confirmar/negar alertas cercanas
 * CamperSites Pro - YRYS
 *
 * Aparece cuando el usuario está cerca de una alerta comunitaria
 * y puede confirmar o negar que sigue activa
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  CommunityAlert,
  ALERT_CONFIG,
  voteAlert,
} from '../lib/communityAlerts';
import { CamperSitesTheme as theme } from '../theme';

interface Props {
  alert: CommunityAlert;
  userLatitude: number;
  userLongitude: number;
  distanceMeters: number;
  onDismiss: () => void;
}

export default function AlertConfirmationBanner({
  alert,
  userLatitude,
  userLongitude,
  distanceMeters,
  onDismiss,
}: Props) {
  const [slideAnim] = useState(new Animated.Value(-200));
  const [voted, setVoted] = useState(false);
  const [voteResult, setVoteResult] = useState<'CONFIRM' | 'DENY' | null>(null);

  const config = ALERT_CONFIG[alert.alert_type];

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleVote = async (voteType: 'CONFIRM' | 'DENY') => {
    setVoted(true);
    setVoteResult(voteType);

    await voteAlert(
      alert.id,
      voteType,
      userLatitude,
      userLongitude,
      distanceMeters,
    );

    // Ocultar después de 2 segundos
    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, 2000);
  };

  const distanceText = distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}>
      <View style={[styles.banner, { borderLeftColor: config.color }]}>
        {!voted ? (
          <>
            {/* Info de la alerta */}
            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: config.color + '20' }]}>
                <Icon name={config.icon} size={24} color={config.color} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.alertType}>{config.label}</Text>
                <Text style={styles.alertMeta}>
                  A {distanceText} • {alert.confirmations} confirmaciones
                </Text>
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(alert.confidence_score)}%
                </Text>
              </View>
            </View>

            {/* Pregunta */}
            <Text style={styles.question}>¿Sigue ahí?</Text>

            {/* Botones */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={() => handleVote('CONFIRM')}
                activeOpacity={0.7}>
                <Icon name="check-bold" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Sí, confirmo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.denyButton]}
                onPress={() => handleVote('DENY')}
                activeOpacity={0.7}>
                <Icon name="close-thick" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>No está</Text>
              </TouchableOpacity>
            </View>

            {/* Puntos */}
            <Text style={styles.pointsHint}>
              +3 puntos por verificar
            </Text>
          </>
        ) : (
          /* Resultado del voto */
          <View style={styles.resultContainer}>
            <Icon
              name={voteResult === 'CONFIRM' ? 'check-circle' : 'close-circle'}
              size={32}
              color={voteResult === 'CONFIRM' ? theme.colors.primary.main : theme.colors.alerts.radar}
            />
            <Text style={styles.resultText}>
              {voteResult === 'CONFIRM'
                ? '¡Confirmado! +3 puntos 🎉'
                : 'Reportado como ausente. +2 puntos'}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 12,
    right: 12,
    zIndex: 200,
  },
  banner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  alertType: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  alertMeta: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 1,
  },
  confidenceBadge: {
    backgroundColor: theme.colors.background.light,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary.main,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary.main,
  },
  denyButton: {
    backgroundColor: theme.colors.alerts.radar,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pointsHint: {
    fontSize: 12,
    color: '#F57C00',
    textAlign: 'center',
    marginTop: 8,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
});
