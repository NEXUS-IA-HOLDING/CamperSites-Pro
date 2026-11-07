/**
 * MarkedPointDetailSheet - Ficha de Punto Marcado en Mapa
 * CamperSites Pro - Cockpit Navigation Suite
 *
 * Permite interactuar con cualquier punto marcado libremente en el mapa:
 * 1. Calcular varias rutas alternativas (Ruta rápida + alternativas con distancias y radares)
 * 2. Guardar a Favoritos con nombre personalizado y persistencia offline
 * 3. Iniciar navegación turn-by-turn de cabina directa
 * 4. Ver alertas de viento, toldo y clima en ese punto exacto
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Share,
  Linking,
  TextInput,
  Modal,
  Clipboard,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { camperWeatherService, CamperWeatherReport } from '../services/CamperWeatherService';
import { AudioAlertService } from '../services/AudioAlertService';
import { TikTokService } from '../services/TikTokService';
import { ClearanceHazardService } from '../services/ClearanceHazardService';
import { ClearanceHazard } from '../types/assistant';

export interface MarkedPointItem {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  category?: string;
}

interface MarkedPointDetailSheetProps {
  point: MarkedPointItem;
  distanceKm?: number;
  vehicleHeight?: number;
  isFavorite: boolean;
  routes?: any[];
  selectedRoute?: any | null;
  onSelectRoute?: (route: any) => void;
  onStartSimulation3D?: (route?: any) => void;
  onUpdatePointCategory?: (point: MarkedPointItem, category: string) => void;
  onClose: () => void;
  onSaveFavorite: (point: MarkedPointItem) => void;
  onCalculateRoutes: (point: MarkedPointItem) => void;
  onStartDirectRoute: (point: MarkedPointItem) => void;
  onUpdatePointName: (point: MarkedPointItem, newName: string) => void;
}

const POINT_CATEGORIES = [
  { id: 'PUNTO_PERSONALIZADO', label: '📍 Punto GPS', color: '#F59E0B' },
  { id: 'AREA_SERVICIOS', label: '🚐 Área Camper', color: '#10B981' },
  { id: 'CAMPING', label: '🏕️ Camping', color: '#38BDF8' },
  { id: 'RUTA_4X4_MOTO', label: '🏍️ Ruta Moto / 4x4', color: '#A855F7' },
  { id: 'SOS_PUNTO', label: '🆘 Punto Encuentro', color: '#EF4444' },
];

export const MarkedPointDetailSheet: React.FC<MarkedPointDetailSheetProps> = ({
  point,
  distanceKm,
  vehicleHeight,
  isFavorite,
  routes = [],
  selectedRoute,
  onSelectRoute,
  onStartSimulation3D,
  onUpdatePointCategory,
  onClose,
  onSaveFavorite,
  onCalculateRoutes,
  onStartDirectRoute,
  onUpdatePointName,
}) => {
  const [weather, setWeather] = useState<CamperWeatherReport | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState(point.name);
  const [copiedGps, setCopiedGps] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(point.category || 'PUNTO_PERSONALIZADO');
  const [isExpanded, setIsExpanded] = useState(true);

  const effectiveVehicleHeight = vehicleHeight || 2.80;
  const spotClearanceHazard: ClearanceHazard | null = point
    ? ClearanceHazardService.checkSpotHeightRestriction(
        point.latitude,
        point.longitude,
        effectiveVehicleHeight,
        280
      )
    : null;

  useEffect(() => {
    setCustomNameInput(point.name);
    loadWeather();
  }, [point.id, point.latitude, point.longitude]);

  const loadWeather = async () => {
    try {
      const rep = await camperWeatherService.getSpotWeather(point.latitude, point.longitude);
      setWeather(rep);
    } catch {}
  };

  const handleCopyGps = () => {
    const coordsStr = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
    Clipboard.setString(coordsStr);
    setCopiedGps(true);
    setTimeout(() => setCopiedGps(false), 2500);
  };

  const handleShare = async () => {
    try {
      const mapsUrl = `https://maps.google.com/?q=${point.latitude},${point.longitude}`;
      await Share.share({
        title: point.name,
        message: `🚐 Punto marcado en CamperSites Pro:\n📍 ${point.name}\nCoordenadas: ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}\n\nVer en mapa: ${mapsUrl}`,
      });
    } catch {}
  };

  const handleShareTikTok = async () => {
    const res = await TikTokService.shareSpot({
      title: point.name,
      latitude: point.latitude,
      longitude: point.longitude,
      city: point.address,
    });
    Alert.alert('🎵 Compartir en TikTok', res.message);
  };

  const handleOpenExternal = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${point.latitude},${point.longitude}(${encodeURIComponent(point.name)})`,
      android: `geo:${point.latitude},${point.longitude}?q=${point.latitude},${point.longitude}(${encodeURIComponent(point.name)})`,
    });
    if (url) Linking.openURL(url);
  };

  const handleSaveCustomName = () => {
    const trimmed = customNameInput.trim();
    if (trimmed) {
      onUpdatePointName(point, trimmed);
    }
    setIsEditingName(false);
  };

  return (
    <View style={styles.sheetContainer}>
      {/* Indicador de arrastre superior */}
      <View style={styles.dragHandleContainer}>
        <View style={styles.dragHandle} />
      </View>

      {/* Cabecera con Insignia de Punto Marcado y Acciones Rápidas */}
      <View style={styles.headerRow}>
        <View style={styles.badgePod}>
          <Icon name="crosshairs-gps" size={15} color="#F59E0B" style={{ marginRight: 6 }} />
          <Text style={styles.badgePodText}>PUNTO MARCADO EN MAPA</Text>
        </View>

        <View style={styles.headerActionsPod}>
          <TouchableOpacity
            onPress={() => onSaveFavorite(point)}
            style={[styles.actionIconBtn, isFavorite && styles.actionIconBtnActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon
              name={isFavorite ? 'star' : 'star-outline'}
              size={21}
              color={isFavorite ? '#F59E0B' : '#94A3B8'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareTikTok}
            style={[styles.actionIconBtn, { backgroundColor: 'rgba(254, 44, 85, 0.12)', borderColor: 'rgba(254, 44, 85, 0.35)' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="music-note" size={19} color="#FE2C55" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            style={styles.actionIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="share-variant-outline" size={19} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenExternal}
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

      {/* Título editable */}
      <View style={styles.titleRow}>
        <Text style={styles.titleText} numberOfLines={1}>
          {point.name}
        </Text>
        <TouchableOpacity
          style={styles.editNameBtn}
          onPress={() => setIsEditingName(true)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Icon name="pencil-outline" size={18} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {/* Coordenadas GPS y Distancia */}
      <View style={styles.metaRow}>
        <TouchableOpacity
          style={styles.coordsChip}
          onPress={handleCopyGps}
          activeOpacity={0.8}>
          <Icon
            name={copiedGps ? 'check-circle' : 'content-copy'}
            size={13}
            color={copiedGps ? '#34D399' : '#38BDF8'}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.coordsText, copiedGps && { color: '#34D399' }]}>
            {copiedGps ? '¡Copiado!' : `${point.latitude.toFixed(5)}°, ${point.longitude.toFixed(5)}°`}
          </Text>
        </TouchableOpacity>

        {distanceKm !== undefined && (
          <View style={styles.distanceChip}>
            <Icon name="map-marker-distance" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
            <Text style={styles.distanceText}>A {distanceKm} km</Text>
          </View>
        )}
      </View>

      {/* ALERTA CRÍTICA DE GÁLIBO / BARRERA DE ALTURA EN ESTE DESTINO */}
      {spotClearanceHazard && (
        <View style={styles.clearanceDangerBanner}>
          <View style={styles.clearanceDangerIconWrap}>
            <Icon
              name={spotClearanceHazard.hazardType === 'height_barrier' ? 'car-limousine' : 'bridge'}
              size={22}
              color="#EF4444"
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.clearanceDangerHeader}>
              <Text style={styles.clearanceDangerTitle}>
                {spotClearanceHazard.hazardType === 'height_barrier'
                  ? `⛔ BARRERA DE ALTURA (${spotClearanceHazard.maxAllowedHeight.toFixed(2)}m)`
                  : `⛔ GÁLIBO BAJO ACCESO (${spotClearanceHazard.maxAllowedHeight.toFixed(2)}m)`}
              </Text>
              <View style={styles.clearanceDangerBadge}>
                <Text style={styles.clearanceDangerBadgeText}>PELIGRO TECHO</Text>
              </View>
            </View>
            <Text style={styles.clearanceDangerText}>
              {spotClearanceHazard.description}. Tu vehículo ({effectiveVehicleHeight.toFixed(2)}m) excede el gálibo máximo permitido. No podrás acceder ni aparcar.
            </Text>
          </View>
        </View>
      )}

      {/* Widget de Clima y Rachas de Viento en el punto marcado */}
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
                <Text style={styles.weatherConditionText}>{weather.weatherDescription}</Text>
              </View>
              <View style={styles.windRow}>
                <Icon
                  name="weather-windy"
                  size={14}
                  color={weather.highProfileWindAlert ? '#EF4444' : '#38BDF8'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.windSpeedText,
                    weather.highProfileWindAlert && { color: '#F87171', fontWeight: '800' },
                  ]}>
                  Viento: {weather.windSpeedKmH} km/h · Rachas: {weather.windGustsKmH} km/h
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.awningBadge,
              {
                backgroundColor: weather.awningSafe
                  ? 'rgba(16, 185, 129, 0.15)'
                  : weather.highProfileWindAlert
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                borderColor: weather.awningSafe
                  ? 'rgba(16, 185, 129, 0.4)'
                  : weather.highProfileWindAlert
                  ? 'rgba(239, 68, 68, 0.4)'
                  : 'rgba(245, 158, 11, 0.4)',
              },
            ]}>
            <Icon
              name={
                weather.awningSafe
                  ? 'shield-check'
                  : weather.highProfileWindAlert
                  ? 'alert-octagon'
                  : 'alert-outline'
              }
              size={13}
              color={
                weather.awningSafe
                  ? '#34D399'
                  : weather.highProfileWindAlert
                  ? '#F87171'
                  : '#FBBF24'
              }
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.awningText,
                {
                  color: weather.awningSafe
                    ? '#34D399'
                    : weather.highProfileWindAlert
                    ? '#F87171'
                    : '#FBBF24',
                },
              ]}>
              {weather.awningSafe
                ? 'Toldo Seguro'
                : weather.highProfileWindAlert
                ? 'Peligro Viento'
                : 'Precaución'}
            </Text>
          </View>
        </View>
      )}

      {/* Selector interactivo de Categoría del Punto Marcado */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 10 }}>
        {POINT_CATEGORIES.map(cat => {
          const active = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedCategory(cat.id);
                onUpdatePointCategory?.(point, cat.id);
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                marginRight: 8,
                borderWidth: 1,
                backgroundColor: active ? `${cat.color}25` : 'rgba(30, 41, 59, 0.7)',
                borderColor: active ? cat.color : 'rgba(71, 85, 105, 0.6)',
              }}>
              <Text
                style={{
                  color: active ? '#FFFFFF' : '#94A3B8',
                  fontSize: 11,
                  fontWeight: active ? '800' : '600',
                }}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Si ya hay rutas calculadas, selector interactivo en línea */}
      {routes.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '800', marginBottom: 6 }}>
            🛣️ ELIGE TU RUTA PREFERIDA ({routes.length} OPCIONES):
          </Text>
          {routes.map((rt, idx) => {
            const isSel = selectedRoute === rt || (!selectedRoute && idx === 0);
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.85}
                onPress={() => onSelectRoute?.(rt)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  marginBottom: 6,
                  borderWidth: 1.5,
                  backgroundColor: isSel ? 'rgba(2, 132, 199, 0.22)' : 'rgba(30, 41, 59, 0.75)',
                  borderColor: isSel ? '#38BDF8' : 'rgba(71, 85, 105, 0.5)',
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F8FAFC', fontSize: 12, fontWeight: '800' }}>
                    {rt.name || (idx === 0 ? '⭐ Más Rápida' : idx === 1 ? '🛣️ Sin Peajes' : '🏕️ Panorámica')}
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                    {((rt.distance || 0) / 1000).toFixed(1)} km · {Math.round((rt.duration || 0) / 60)} min
                  </Text>
                </View>
                <Icon
                  name={isSel ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={isSel ? '#38BDF8' : '#64748B'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Botones Principales de Acción Solicitados por el Usuario */}
      <View style={styles.actionsContainer}>
        {/* Botón 1: Calcular varias rutas alternativas */}
        <TouchableOpacity
          style={styles.calculateRoutesBtn}
          activeOpacity={0.85}
          onPress={() => onCalculateRoutes(point)}>
          <View style={styles.btnIconPodBlue}>
            <Icon name="routes" size={20} color="#38BDF8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.calculateRoutesBtnTitle}>CALCULAR VARIAS RUTAS</Text>
            <Text style={styles.calculateRoutesBtnSub}>
              Compara alternativas, tiempos, distancias y radares
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color="#38BDF8" />
        </TouchableOpacity>

        {/* Fila secundaria: Guardar en Favoritos + Simular 3D + Iniciar Navegación Directa */}
        <View style={styles.secondaryActionsRow}>
          {/* Botón Favoritos */}
          <TouchableOpacity
            style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
            activeOpacity={0.8}
            onPress={() => onSaveFavorite(point)}>
            <Icon
              name={isFavorite ? 'star' : 'star-outline'}
              size={18}
              color={isFavorite ? '#F59E0B' : '#E2E8F0'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.favoriteBtnText, isFavorite && styles.favoriteBtnTextActive]}>
              {isFavorite ? 'Favorito' : 'Guardar'}
            </Text>
          </TouchableOpacity>

          {/* Botón Simular 3D */}
          {onStartSimulation3D && (
            <TouchableOpacity
              style={[styles.favoriteBtn, { borderColor: '#38BDF8', backgroundColor: 'rgba(2, 132, 199, 0.25)' }]}
              activeOpacity={0.85}
              onPress={() => onStartSimulation3D(selectedRoute || routes[0])}>
              <Icon name="gamepad-variant" size={18} color="#38BDF8" style={{ marginRight: 4 }} />
              <Text style={[styles.favoriteBtnText, { color: '#38BDF8' }]}>Simular 3D</Text>
            </TouchableOpacity>
          )}

          {/* Botón Navegación Directa */}
          <TouchableOpacity
            style={styles.directNavBtn}
            activeOpacity={0.85}
            onPress={() => onStartDirectRoute(point)}>
            <Icon name="navigation" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.directNavBtnText}>Iniciar 3D</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal para renombrar el punto */}
      <Modal
        visible={isEditingName}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditingName(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Icon name="rename-box" size={22} color="#38BDF8" style={{ marginRight: 8 }} />
              <Text style={styles.editModalTitle}>Nombrar Punto Marcado</Text>
            </View>
            <Text style={styles.editModalSubtitle}>
              Ponle un nombre reconocible para tus rutas y favoritos (ej. "Mirador secreto", "Cala tranquila"):
            </Text>
            <TextInput
              style={styles.editInput}
              value={customNameInput}
              onChangeText={setCustomNameInput}
              placeholder="Nombre del punto..."
              placeholderTextColor="#64748B"
              autoFocus={true}
              selectTextOnFocus={true}
            />
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => setIsEditingName(false)}>
                <Text style={styles.editCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editSaveBtn}
                onPress={handleSaveCustomName}>
                <Text style={styles.editSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 16,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 16,
    zIndex: 9999,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
  },
  clearanceDangerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    padding: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  clearanceDangerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  clearanceDangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  clearanceDangerTitle: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    flex: 1,
  },
  clearanceDangerBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  clearanceDangerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  clearanceDangerText: {
    color: '#FECACA',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgePod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  badgePodText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headerActionsPod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.7)',
  },
  actionIconBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.6)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  editNameBtn: {
    padding: 6,
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  coordsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.8)',
  },
  coordsText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  distanceText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  weatherAlertCard: {
    backgroundColor: 'rgba(127, 29, 29, 0.35)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weatherEmoji: {
    fontSize: 24,
  },
  weatherTempText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  weatherConditionText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  windSpeedText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  awningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  awningText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: 8,
  },
  calculateRoutesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.85)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#06B6D4',
  },
  btnIconPodBlue: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  calculateRoutesBtnTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  calculateRoutesBtnSub: {
    color: '#E0F2FE',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  favoriteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.7)',
  },
  favoriteBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.55)',
  },
  favoriteBtnText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  favoriteBtnTextActive: {
    color: '#FBBF24',
  },
  directNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  directNavBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  editModalContent: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 20,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editModalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  editModalSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  editInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    color: '#F8FAFC',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  editCancelText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 14,
  },
  editSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0284C7',
  },
  editSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
