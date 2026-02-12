/**
 * COMPONENTE: Verificación Control Policial
 * Ventana lateral con cronómetro 40 segundos
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

interface ControlVerificationProps {
  control: {
    id: string;
    latitude: number;
    longitude: number;
    reportedAt: string;
  };
  onVerify: (stillActive: boolean) => void;
  onDismiss: () => void;
}

export const ControlVerificationPanel: React.FC<ControlVerificationProps> = ({
  control,
  onVerify,
  onDismiss,
}) => {
  const [timeLeft, setTimeLeft] = useState(40);
  const [slideAnim] = useState(new Animated.Value(width));

  useEffect(() => {
    // Animar entrada
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    // Cronómetro 40 segundos
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVerify = (stillActive: boolean) => {
    // Animar salida
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onVerify(stillActive);
    });
  };

  const progressPercentage = (timeLeft / 40) * 100;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
        },
      ]}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Icon name="shield-alert" size={28} color="#FF6F00" />
          </View>
          <View>
            <Text style={styles.title}>Control Policial</Text>
            <Text style={styles.subtitle}>¿Sigue activo?</Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Cronómetro */}
      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>{timeLeft}</Text>
          <Text style={styles.timerLabel}>segundos</Text>
        </View>
        
        {/* Barra de progreso circular */}
        <View style={styles.progressRing}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercentage}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Información del control */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Icon name="clock-outline" size={18} color="#666" />
          <Text style={styles.infoText}>
            Reportado hace {getTimeAgo(control.reportedAt)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="map-marker" size={18} color="#666" />
          <Text style={styles.infoText}>
            {control.latitude.toFixed(4)}, {control.longitude.toFixed(4)}
          </Text>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.yesBtn]}
          onPress={() => handleVerify(true)}>
          <Icon name="check-circle" size={24} color="#FFF" />
          <Text style={styles.actionBtnText}>Sí, sigue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.noBtn]}
          onPress={() => handleVerify(false)}>
          <Icon name="close-circle" size={24} color="#FFF" />
          <Text style={styles.actionBtnText}>No, se fue</Text>
        </TouchableOpacity>
      </View>

      {/* Mensaje motivacional */}
      <View style={styles.motivational}>
        <Icon name="account-group" size={16} color="#2E7D32" />
        <Text style={styles.motivationalText}>
          Ayuda a otros conductores verificando
        </Text>
      </View>
    </Animated.View>
  );
};

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const reported = new Date(timestamp);
  const diffMinutes = Math.floor((now.getTime() - reported.getTime()) / 60000);

  if (diffMinutes < 1) return 'menos de 1 min';
  if (diffMinutes < 60) return `${diffMinutes} min`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  
  return 'más de 24h';
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 100,
    width: width * 0.85,
    maxWidth: 350,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  timerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF3E0',
    borderWidth: 4,
    borderColor: '#FF6F00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6F00',
  },
  timerLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressRing: {
    width: '100%',
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6F00',
    borderRadius: 3,
  },
  infoContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  yesBtn: {
    backgroundColor: '#4CAF50',
  },
  noBtn: {
    backgroundColor: '#D32F2F',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  motivational: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 6,
  },
  motivationalText: {
    fontSize: 12,
    color: '#2E7D32',
    fontStyle: 'italic',
  },
});

export default ControlVerificationPanel;
