/**
 * CockpitLocationDetailSheet.tsx - Ficha deslizable de cabina automotriz para el punto seleccionado
 * Reemplaza los popups cutres por una tarjeta de control táctico con servicios y cálculo de ruta segura
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Share,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  locationOccupancyService,
  LocationOccupancyData,
  OccupancyLevel,
} from '../services/LocationOccupancyService';
import {
  camperWeatherService,
  CamperWeatherReport,
} from '../services/CamperWeatherService';
import { TikTokService } from '../services/TikTokService';

const FAVORITES_KEY = '@campersites_favorites';

interface LocationItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  description?: string;
  address?: string;
}

interface CockpitLocationDetailSheetProps {
  location: LocationItem | null;
  distanceKm?: number;
  onClose: () => void;
  onStartRoute: (location: LocationItem) => void;
  onOpenReviews: (location: LocationItem) => void;
}

export const CockpitLocationDetailSheet: React.FC<CockpitLocationDetailSheetProps> = ({
  location,
  distanceKm,
  onClose,
  onStartRoute,
  onOpenReviews,
}) => {
  const [occupancy, setOccupancy] = useState<LocationOccupancyData | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [weather, setWeather] = useState<CamperWeatherReport | null>(null);

  useEffect(() => {
    if (location) {
      setOccupancy(locationOccupancyService.getOccupancy(location.id));
      checkFavoriteStatus(location.id);
      loadWeatherData(location.latitude, location.longitude);
    }
  }, [location?.id, location?.latitude, location?.longitude]);

  const checkFavoriteStatus = async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        setIsFavorite(ids.includes(id));
      }
    } catch {}
  };

  const loadWeatherData = async (lat: number, lon: number) => {
    try {
      const rep = await camperWeatherService.getSpotWeather(lat, lon);
      setWeather(rep);
    } catch {}
  };

  const handleToggleFavorite = async () => {
    if (!location) return;
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      let ids: string[] = stored ? JSON.parse(stored) : [];
      if (ids.includes(location.id)) {
        ids = ids.filter(i => i !== location.id);
        setIsFavorite(false);
      } else {
        ids.push(location.id);
        setIsFavorite(true);
      }
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    } catch {}
  };

  const handleShareLocation = async () => {
    if (!location) return;
    try {
      const mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      await Share.share({
        title: location.name,
        message: `🚐 ¡Mira este punto en CamperSites Pro!\n\n📍 ${location.name}\nCoordenadas: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}\n\nVer en mapa: ${mapsUrl}`,
      });
    } catch {}
  };

  const handleShareTikTok = async () => {
    if (!location) return;
    const res = await TikTokService.shareSpot({
      title: location.name,
      description: location.description,
      latitude: location.latitude,
      longitude: location.longitude,
      category: location.category,
      city: location.address,
    });
    Alert.alert('🎵 Compartir en TikTok', res.message);
  };

  const handleOpenExternalMaps = () => {
    if (!location) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${location.latitude},${location.longitude}(${encodeURIComponent(location.name)})`,
      android: `geo:0,0?q=${location.latitude},${location.longitude}(${encodeURIComponent(location.name)})`,
    }) || `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${location.latitude},${location.longitude}`);
    });
  };

  if (!location) return null;

  // Determinar servicios según la categoría
  const isCamping = location.category === 'CAMPING' || location.category.includes('CAMP');
  const isAreaCamper = location.category === 'AREA_SERVICIOS' || location.category === 'AREA_DESCANSO';
  const isGasStation = location.category === 'GASOLINERA_GLP';
  const isRestaurant = location.category === 'RESTAURANTE' || location.category.includes('BAR');

  const handlePromptCheckIn = () => {
    Alert.alert(
      '📍 Confirmar Ocupación de Plazas',
      `¿Cómo está la disponibilidad en ${location.name}?`,
      [
        {
          text: '🟢 Hay sitio libre',
          onPress: async () => {
            const res = await locationOccupancyService.submitCheckIn(location.id, 'plenty');
            setOccupancy(res);
          },
        },
        {
          text: '🟡 Quedan pocas plazas',
          onPress: async () => {
            const res = await locationOccupancyService.submitCheckIn(location.id, 'few');
            setOccupancy(res);
          },
        },
        {
          text: '🔴 Completo / Lleno',
          style: 'destructive',
          onPress: async () => {
            const res = await locationOccupancyService.submitCheckIn(location.id, 'full');
            setOccupancy(res);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.sheetContainer}>
      {/* Barra superior de arrastre */}
      <View style={styles.dragHandleContainer}>
        <View style={styles.dragHandle} />
      </View>

      {/* Cabecera con Categoría y Botón de Cierre */}
      <View style={styles.headerRow}>
        <View style={styles.categoryBadge}>
          <Icon
            name={
              isCamping
                ? 'tent'
                : isAreaCamper
                ? 'van-utility'
                : isGasStation
                ? 'gas-station'
                : isRestaurant
                ? 'silverware-fork-knife'
                : 'map-marker'
            }
            size={14}
            color="#10B981"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.categoryBadgeText}>
            {location.category.replace(/_/g, ' ')}
          </Text>
        </View>

        <View style={styles.verifiedBadge}>
          <Icon name="shield-check" size={14} color="#38BDF8" style={{ marginRight: 4 }} />
          <Text style={styles.verifiedText}>Comunidad Verificada</Text>
        </View>

        {/* Acciones Rápidas de Cabecera: Favorito, Compartir, Abrir Navegador y Cerrar */}
        <View style={styles.headerActionsPod}>
          <TouchableOpacity
            onPress={handleToggleFavorite}
            style={styles.actionIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#EF4444' : '#94A3B8'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareTikTok}
            style={[styles.actionIconBtn, { backgroundColor: 'rgba(254, 44, 85, 0.12)', borderColor: 'rgba(254, 44, 85, 0.35)' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="music-note" size={19} color="#FE2C55" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareLocation}
            style={styles.actionIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="share-variant-outline" size={19} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenExternalMaps}
            style={styles.actionIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="google-maps" size={19} color="#38BDF8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Nombre y Dirección */}
      <Text style={styles.title} numberOfLines={2}>
        {location.name}
      </Text>
      {location.address && (
        <View style={styles.addressRow}>
          <Icon name="map-marker-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.addressText} numberOfLines={1}>
            {location.address}
          </Text>
        </View>
      )}

      {/* Tarjeta de Clima y Rachas de Viento (Especial Camper/Autocaravana) */}
      {weather && (
        <View
          style={[
            styles.weatherCard,
            weather.highProfileWindAlert && styles.weatherAlertCard,
          ]}>
          <View style={styles.weatherLeft}>
            <Text style={styles.weatherEmoji}>{weather.weatherEmoji}</Text>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.weatherTempText}>{weather.temperatureC}°C</Text>
                <Text style={styles.weatherDescText}>{weather.weatherDescription}</Text>
              </View>
              <Text
                style={[
                  styles.weatherWindText,
                  weather.highProfileWindAlert && { color: '#F87171', fontWeight: '800' },
                ]}>
                💨 Viento {weather.windSpeedKmH} km/h · Rachas {weather.windGustsKmH} km/h
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.awningBadge,
              weather.awningSafe ? styles.awningBadgeSafe : styles.awningBadgeRisk,
            ]}>
            <Icon
              name={weather.awningSafe ? 'umbrella-outline' : 'weather-windy'}
              size={12}
              color={weather.awningSafe ? '#10B981' : '#F59E0B'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.awningBadgeText,
                { color: weather.awningSafe ? '#34D399' : '#FBBF24' },
              ]}>
              {weather.awningSafe ? 'Toldo OK' : 'Riesgo Toldo'}
            </Text>
          </View>
        </View>
      )}

      {/* Ocupación y Plazas en Tiempo Real (Rival Park4Night Pro) */}
      {occupancy && (isCamping || isAreaCamper) && (
        <View style={styles.occupancyCard}>
          <View style={styles.occupancyHeaderRow}>
            <View style={styles.occupancyBadgeRow}>
              <View
                style={[
                  styles.occupancyDot,
                  {
                    backgroundColor:
                      occupancy.level === 'plenty'
                        ? '#10B981'
                        : occupancy.level === 'few'
                        ? '#F59E0B'
                        : '#EF4444',
                  },
                ]}
              />
              <Text
                style={[
                  styles.occupancyTitle,
                  {
                    color:
                      occupancy.level === 'plenty'
                        ? '#34D399'
                        : occupancy.level === 'few'
                        ? '#FBBF24'
                        : '#F87171',
                  },
                ]}>
                {occupancy.level === 'plenty'
                  ? 'PLAZAS DISPONIBLES'
                  : occupancy.level === 'few'
                  ? 'POCAS PLAZAS LIBRES'
                  : 'COMPLETO / SIN PLAZAS'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkInBtn}
              onPress={handlePromptCheckIn}
              activeOpacity={0.8}>
              <Icon name="map-marker-check" size={14} color="#38BDF8" style={{ marginRight: 4 }} />
              <Text style={styles.checkInBtnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.occupancyDetailRow}>
            <Text style={styles.occupancyEstimateText}>{occupancy.freeSpotsEstimate}</Text>
            <Text style={styles.occupancyMetaText}>
              · {occupancy.lastReportedAgo} ({occupancy.confirmedCount} campers hoy)
            </Text>
          </View>
        </View>
      )}

      {/* Servicios Disponibles (Píldoras tácticas) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
        {(isCamping || isAreaCamper) && (
          <>
            <View style={styles.servicePill}>
              <Icon name="water" size={14} color="#38BDF8" />
              <Text style={styles.serviceText}>Agua Potable</Text>
            </View>
            <View style={styles.servicePill}>
              <Icon name="flash" size={14} color="#FBBF24" />
              <Text style={styles.serviceText}>Electricidad</Text>
            </View>
            <View style={styles.servicePill}>
              <Icon name="arrow-down-bold-circle-outline" size={14} color="#A78BFA" />
              <Text style={styles.serviceText}>Vaciado Aguas</Text>
            </View>
          </>
        )}
        {isGasStation && (
          <>
            <View style={styles.servicePill}>
              <Icon name="gas-cylinder" size={14} color="#F87171" />
              <Text style={styles.serviceText}>GLP / Autogas</Text>
            </View>
            <View style={styles.servicePill}>
              <Icon name="air-filter" size={14} color="#34D399" />
              <Text style={styles.serviceText}>AdBlue Surtidor</Text>
            </View>
          </>
        )}
        {isRestaurant && (
          <>
            <View style={styles.servicePill}>
              <Icon name="coffee" size={14} color="#FB923C" />
              <Text style={styles.serviceText}>Desayunos / Menú</Text>
            </View>
            <View style={styles.servicePill}>
              <Icon name="parking" size={14} color="#60A5FA" />
              <Text style={styles.serviceText}>Parking Amplio</Text>
            </View>
          </>
        )}
        <View style={styles.servicePill}>
          <Icon name="shield-lock-outline" size={14} color="#10B981" />
          <Text style={styles.serviceText}>Zona Segura</Text>
        </View>
        <View style={styles.servicePill}>
          <Icon name="cash-multiple" size={14} color="#34D399" />
          <Text style={styles.serviceText}>Gratis / Bajo Coste</Text>
        </View>
      </ScrollView>

      {/* Botones de Acción de Cabina */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryRouteBtn}
          activeOpacity={0.85}
          onPress={() => onStartRoute(location)}>
          <View style={styles.btnIconPod}>
            <Icon name="navigation" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryBtnTitle}>INICIAR RUTA SEGURA</Text>
            <Text style={styles.primaryBtnSub}>
              {distanceKm !== undefined ? `${distanceKm} km · ` : ''}Optimizado por altura y gálibo
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reviewsBtn}
          activeOpacity={0.8}
          onPress={() => onOpenReviews(location)}>
          <Icon name="star-outline" size={22} color="#F8FAFC" />
          <Text style={styles.reviewsBtnText}>Reseñas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 16,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 20,
    zIndex: 110,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  categoryBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  addressText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  occupancyCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  occupancyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  occupancyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  occupancyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  occupancyTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  checkInBtnText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  occupancyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  occupancyEstimateText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  occupancyMetaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  servicesScroll: {
    marginBottom: 12,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  serviceText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryRouteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnIconPod: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  primaryBtnTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  primaryBtnSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
  reviewsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  reviewsBtnText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  headerActionsPod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  weatherAlertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  weatherEmoji: {
    fontSize: 22,
  },
  weatherTempText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  weatherDescText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  weatherWindText: {
    fontSize: 10,
    color: '#38BDF8',
    marginTop: 1,
  },
  awningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  awningBadgeSafe: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  awningBadgeRisk: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  awningBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

export default CockpitLocationDetailSheet;
