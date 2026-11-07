/**
 * OvernightSleepModeModal.tsx - Modo Pernocta Segura y Vigilancia Nocturna de Toldo
 * CamperSites Pro - Asistente de Noche
 *
 * Pantalla OLED ultra-oscura para ahorrar batería y evitar deslumbramientos al dormir en la camper.
 * Monitoriza las rachas de viento nocturnas para avisar si peligra el toldo exterior.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  Vibration,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { camperWeatherService, CamperWeatherReport } from '../services/CamperWeatherService';
import { AudioAlertService } from '../services/AudioAlertService';

interface Props {
  visible: boolean;
  latitude: number;
  longitude: number;
  onClose: () => void;
}

export const OvernightSleepModeModal: React.FC<Props> = ({
  visible,
  latitude,
  longitude,
  onClose,
}) => {
  const [timeStr, setTimeStr] = useState<string>('00:00');
  const [dateStr, setDateStr] = useState<string>('');
  const [weather, setWeather] = useState<CamperWeatherReport | null>(null);
  const [isAwningAlarmActive, setIsAwningAlarmActive] = useState<boolean>(true);

  useEffect(() => {
    if (visible) {
      updateClock();
      const clockTimer = setInterval(updateClock, 1000);
      loadNightWeather();
      const weatherTimer = setInterval(loadNightWeather, 5 * 60 * 1000); // Cada 5 minutos

      return () => {
        clearInterval(clockTimer);
        clearInterval(weatherTimer);
      };
    }
  }, [visible, latitude, longitude]);

  const updateClock = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setTimeStr(`${h}:${m}`);

    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    setDateStr(now.toLocaleDateString('es-ES', options));
  };

  const loadNightWeather = async () => {
    try {
      const data = await camperWeatherService.getSpotWeather(latitude, longitude);
      if (data) {
        setWeather(data);
        // Si las rachas superan 35 km/h y la alarma está activa, alertar
        if (data.windGustsKmH >= 35 && isAwningAlarmActive) {
          Vibration.vibrate([0, 200, 100, 200]);
          AudioAlertService.speak(`Atención: Racha de viento de ${Math.round(data.windGustsKmH)} kilómetros por hora. Peligro en toldo exterior.`);
        }
      }
    } catch {}
  };

  const isWindDanger = (weather?.windGustsKmH || 0) >= 35;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Cabecera discreta */}
        <View style={styles.topRow}>
          <View style={styles.modeBadge}>
            <Icon name="bed-king-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
            <Text style={styles.modeBadgeText}>MODO PERNOCTA SEGURA</Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Reloj Central Gigante OLED Minimalista */}
        <View style={styles.clockSection}>
          <Text style={styles.clockTime}>{timeStr}</Text>
          <Text style={styles.clockDate}>{dateStr}</Text>
        </View>

        {/* Tarjeta de Vigilancia de Viento y Toldo Exterior */}
        <View style={[styles.weatherCard, isWindDanger && styles.weatherCardDanger]}>
          <View style={styles.weatherCardHeader}>
            <Icon
              name={isWindDanger ? 'weather-windy-variant' : 'weather-windy'}
              size={22}
              color={isWindDanger ? '#EF4444' : '#38BDF8'}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.weatherCardTitle, isWindDanger && { color: '#EF4444' }]}>
              {isWindDanger ? '⚠️ ALERTA RACHAS DE VIENTO EN TOLDO' : 'Vigilancia Nocturna de Viento'}
            </Text>
          </View>

          <View style={styles.weatherMetricsRow}>
            <View style={styles.weatherMetric}>
              <Text style={styles.weatherMetricLabel}>Rachas Máximas</Text>
              <Text style={[styles.weatherMetricValue, isWindDanger && { color: '#EF4444' }]}>
                {weather ? `${Math.round(weather.windGustsKmH)} km/h` : '--'}
              </Text>
            </View>

            <View style={styles.weatherMetric}>
              <Text style={styles.weatherMetricLabel}>Temperatura Exterior</Text>
              <Text style={styles.weatherMetricValue}>
                {weather ? `${Math.round(weather.temperatureC)} °C` : '--'}
              </Text>
            </View>

            <View style={styles.weatherMetric}>
              <Text style={styles.weatherMetricLabel}>Estado Toldo</Text>
              <Text style={[styles.weatherMetricValue, { color: isWindDanger ? '#EF4444' : '#10B981' }]}>
                {isWindDanger ? 'RECOGER' : 'SEGURO'}
              </Text>
            </View>
          </View>
        </View>

        {/* Coordenadas de Emergencia SOS */}
        <View style={styles.sosCard}>
          <View style={styles.sosTextWrap}>
            <Text style={styles.sosLabel}>COORDENADAS GPS EXACTAS (EN CASO DE ASISTENCIA)</Text>
            <Text style={styles.sosCoords}>
              {latitude.toFixed(5)}° N, {longitude.toFixed(5)}° W
            </Text>
          </View>
          <TouchableOpacity
            style={styles.sosCallBtn}
            onPress={() => {
              Alert.alert(
                'Llamada de Emergencia 112',
                `Tus coordenadas para los servicios de emergencia son:\n\nLatitud: ${latitude.toFixed(5)}\nLongitud: ${longitude.toFixed(5)}`,
                [{ text: 'Entendido' }]
              );
            }}>
            <Icon name="phone-alert" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.sosCallBtnText}>SOS 112</Text>
          </TouchableOpacity>
        </View>

        {/* Botón Salir de Noche */}
        <TouchableOpacity style={styles.exitButton} onPress={onClose} activeOpacity={0.8}>
          <Icon name="weather-sunny" size={18} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.exitButtonText}>Reanudar Modo Conducción</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure Black OLED
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 30,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  modeBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  closeBtn: {
    padding: 6,
  },
  clockSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  clockTime: {
    color: '#F8FAFC',
    fontSize: 78,
    fontWeight: '200',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  clockDate: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'capitalize',
    marginTop: -4,
  },
  weatherCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    padding: 14,
  },
  weatherCardDanger: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  weatherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  weatherCardTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  weatherMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weatherMetric: {
    alignItems: 'center',
  },
  weatherMetricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  weatherMetricValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
  },
  sosTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  sosLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sosCoords: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  sosCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sosCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
  },
  exitButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
});
