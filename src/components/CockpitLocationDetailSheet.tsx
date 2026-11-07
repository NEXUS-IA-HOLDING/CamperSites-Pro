/**
 * CockpitLocationDetailSheet.tsx - Ficha deslizable de cabina automotriz para el punto seleccionado
 * Reemplaza los popups cutres por una tarjeta de control táctico con servicios 100% modificables,
 * selector interactivo de rutas y cálculo de conducción 3D segura.
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
  TextInput,
  ActivityIndicator,
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
import { ClearanceHazardService } from '../services/ClearanceHazardService';
import { ClearanceHazard } from '../types/assistant';

const FAVORITES_KEY = '@campersites_favorites';
const SPOT_OVERRIDES_KEY = '@campersites_spot_overrides';

export interface SpotOverrideData {
  customName?: string;
  customPrice?: string;
  customNote?: string;
  services?: Record<string, boolean>;
  updatedAt?: string;
}

interface ServiceDefinition {
  key: string;
  label: string;
  icon: string;
  color: string;
}

const ALL_MODIFIABLE_SERVICES: ServiceDefinition[] = [
  { key: 'water', label: 'Agua Potable', icon: 'water', color: '#38BDF8' },
  { key: 'electricity', label: 'Electricidad', icon: 'flash', color: '#FBBF24' },
  { key: 'dump', label: 'Vaciado Aguas', icon: 'arrow-down-bold-circle-outline', color: '#A78BFA' },
  { key: 'lpg', label: 'GLP / Autogas', icon: 'gas-cylinder', color: '#F87171' },
  { key: 'safe', label: 'Zona Segura', icon: 'shield-lock-outline', color: '#10B981' },
  { key: 'free', label: 'Gratis / Bajo Coste', icon: 'cash-multiple', color: '#34D399' },
  { key: 'wifi', label: 'WiFi / 5G', icon: 'wifi', color: '#60A5FA' },
  { key: 'offroad', label: 'Apto 4x4 / Moto', icon: 'Jeepney', color: '#FB923C' },
];

interface LocationItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  description?: string;
  address?: string;
}

export interface CockpitLocationDetailSheetProps {
  location: LocationItem | null;
  distanceKm?: number;
  vehicleHeight?: number;
  onClose: () => void;
  onStartRoute: (location: LocationItem) => void;
  onOpenReviews: (location: LocationItem) => void;
  routes?: any[];
  selectedRoute?: any | null;
  isCalculatingRoute?: boolean;
  onSelectRoute?: (route: any) => void;
  onStartDirectNavigation?: (route: any) => void;
  onStartSimulation3D?: (route?: any) => void;
}

export const CockpitLocationDetailSheet: React.FC<CockpitLocationDetailSheetProps> = ({
  location,
  distanceKm,
  vehicleHeight,
  onClose,
  onStartRoute,
  onOpenReviews,
  routes,
  selectedRoute,
  isCalculatingRoute,
  onSelectRoute,
  onStartDirectNavigation,
  onStartSimulation3D,
}) => {
  const [occupancy, setOccupancy] = useState<LocationOccupancyData | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [weather, setWeather] = useState<CamperWeatherReport | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingSpot, setIsEditingSpot] = useState(false);

  // Estado de overrides locales persistentes del punto
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [activeServices, setActiveServices] = useState<Record<string, boolean>>({});
  const [savedNotice, setSavedNotice] = useState(false);

  const effectiveVehicleHeight = vehicleHeight || 2.80;
  const spotClearanceHazard = location
    ? ClearanceHazardService.checkSpotHeightRestriction(
        location.latitude,
        location.longitude,
        effectiveVehicleHeight,
        280
      )
    : null;

  useEffect(() => {
    if (location) {
      setOccupancy(locationOccupancyService.getOccupancy(location.id));
      checkFavoriteStatus(location.id);
      loadWeatherData(location.latitude, location.longitude);
      loadSpotOverrides(location);
      setIsEditingSpot(false);
    }
  }, [location?.id, location?.latitude, location?.longitude]);

  const getDefaultServicesForCategory = (cat: string): Record<string, boolean> => {
    const isCamping = cat === 'CAMPING' || cat.includes('CAMP');
    const isAreaCamper = cat === 'AREA_SERVICIOS' || cat === 'AREA_DESCANSO';
    const isGasStation = cat === 'GASOLINERA_GLP';

    return {
      water: isCamping || isAreaCamper,
      electricity: isCamping || isAreaCamper,
      dump: isCamping || isAreaCamper,
      lpg: isGasStation,
      safe: true,
      free: !isCamping,
      wifi: isCamping,
      offroad: true,
    };
  };

  const loadSpotOverrides = async (loc: LocationItem) => {
    const defaults = getDefaultServicesForCategory(loc.category);
    try {
      const raw = await AsyncStorage.getItem(SPOT_OVERRIDES_KEY);
      if (raw) {
        const allOverrides: Record<string, SpotOverrideData> = JSON.parse(raw);
        const current = allOverrides[loc.id];
        if (current) {
          setCustomName(current.customName || loc.name);
          setCustomPrice(current.customPrice || (defaults.free ? 'Gratis' : '12 €/noche'));
          setCustomNote(current.customNote || '');
          setActiveServices({ ...defaults, ...(current.services || {}) });
          return;
        }
      }
    } catch {}
    setCustomName(loc.name);
    setCustomPrice(defaults.free ? 'Gratis' : '12 €/noche');
    setCustomNote('');
    setActiveServices(defaults);
  };

  const persistSpotOverride = async (
    nextServices: Record<string, boolean>,
    nextName: string,
    nextPrice: string,
    nextNote: string
  ) => {
    if (!location) return;
    try {
      const raw = await AsyncStorage.getItem(SPOT_OVERRIDES_KEY);
      const allOverrides: Record<string, SpotOverrideData> = raw ? JSON.parse(raw) : {};
      allOverrides[location.id] = {
        customName: nextName.trim() || location.name,
        customPrice: nextPrice.trim() || 'Gratis',
        customNote: nextNote.trim(),
        services: nextServices,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(SPOT_OVERRIDES_KEY, JSON.stringify(allOverrides));
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1800);
    } catch {}
  };

  const handleToggleService = (serviceKey: string) => {
    const updated = {
      ...activeServices,
      [serviceKey]: !activeServices[serviceKey],
    };
    setActiveServices(updated);
    persistSpotOverride(updated, customName, customPrice, customNote);
  };

  const handleSaveCustomFields = () => {
    persistSpotOverride(activeServices, customName, customPrice, customNote);
    setIsEditingSpot(false);
  };

  const handleDirectOccupancyChange = async (level: OccupancyLevel) => {
    if (!location) return;
    const res = await locationOccupancyService.submitCheckIn(location.id, level);
    setOccupancy(res);
  };

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
      const displayName = customName || location.name;
      const mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      await Share.share({
        title: displayName,
        message: `🚐 ¡Mira este punto en CamperSites Pro!\n\n📍 ${displayName} (${customPrice || 'Gratis'})\nCoordenadas: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}\n${customNote ? `Nota: ${customNote}\n` : ''}\nVer en mapa: ${mapsUrl}`,
      });
    } catch {}
  };

  const handleShareTikTok = async () => {
    if (!location) return;
    const res = await TikTokService.shareSpot({
      title: customName || location.name,
      description: customNote || location.description,
      latitude: location.latitude,
      longitude: location.longitude,
      category: location.category,
      city: location.address,
    });
    Alert.alert('🎵 Compartir en TikTok', res.message);
  };

  const handleOpenExternalMaps = () => {
    if (!location) return;
    const displayName = customName || location.name;
    const url = Platform.select({
      ios: `maps:0,0?q=${location.latitude},${location.longitude}(${encodeURIComponent(displayName)})`,
      android: `geo:0,0?q=${location.latitude},${location.longitude}(${encodeURIComponent(displayName)})`,
    }) || `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${location.latitude},${location.longitude}`);
    });
  };

  if (!location) return null;

  const isCamping = location.category === 'CAMPING' || location.category.includes('CAMP');
  const isAreaCamper = location.category === 'AREA_SERVICIOS' || location.category === 'AREA_DESCANSO';
  const isGasStation = location.category === 'GASOLINERA_GLP';
  const isRestaurant = location.category === 'RESTAURANTE' || location.category.includes('BAR');

  const displayName = customName || location.name;
  const hasRoutes = Array.isArray(routes) && routes.length > 0;

  return (
    <View style={[styles.sheetContainer, isExpanded && styles.sheetContainerExpanded]}>
      {/* Barra superior de arrastre / expansión */}
      <TouchableOpacity
        style={styles.dragHandleContainer}
        activeOpacity={0.7}
        onPress={() => setIsExpanded(!isExpanded)}>
        <View style={styles.dragHandle} />
        <View style={styles.expandHintRow}>
          <Icon
            name={isExpanded ? 'chevron-down' : 'chevron-up'}
            size={16}
            color="#38BDF8"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.expandHintText}>
            {isExpanded
              ? 'Contraer panel táctico'
              : 'Toca aquí o en el título para ampliar y modificar servicios / rutas'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Cabecera con Categoría, Botón Modificar y Acciones */}
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

        {/* Botón directo para Modificar / Personalizar Punto */}
        <TouchableOpacity
          style={[
            styles.editSpotBadge,
            isEditingSpot && styles.editSpotBadgeActive,
          ]}
          activeOpacity={0.8}
          onPress={() => {
            setIsExpanded(true);
            setIsEditingSpot(!isEditingSpot);
          }}>
          <Text style={styles.editSpotBadgeText}>
            {isEditingSpot ? '✓ Cerrar Edición' : '✏️ Modificar / Personalizar Punto'}
          </Text>
        </TouchableOpacity>

        {/* Acciones Rápidas de Cabecera: Favorito, TikTok, Compartir, Maps y Cerrar */}
        <View style={styles.headerActionsPod}>
          <TouchableOpacity
            onPress={handleToggleFavorite}
            style={styles.actionIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={19}
              color={isFavorite ? '#EF4444' : '#94A3B8'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareTikTok}
            style={[styles.actionIconBtn, { backgroundColor: 'rgba(254, 44, 85, 0.12)' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="music-note" size={18} color="#FE2C55" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareLocation}
            style={styles.actionIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="share-variant-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenExternalMaps}
            style={styles.actionIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="google-maps" size={18} color="#38BDF8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido scrolleable */}
      <ScrollView
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        style={isExpanded ? styles.expandedContentScroll : styles.compactContentScroll}
        contentContainerStyle={styles.expandedContentContainer}>

        {/* Nombre, Precio y Dirección (Tocar alterna expansión) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.titleSectionTouch}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={isExpanded ? undefined : 1}>
              {displayName}
            </Text>
            <View style={styles.priceTagBadge}>
              <Text style={styles.priceTagText}>{customPrice || 'Gratis'}</Text>
            </View>
          </View>

          {location.address ? (
            <View style={styles.addressRow}>
              <Icon name="map-marker-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.addressText} numberOfLines={isExpanded ? undefined : 1}>
                {location.address}
              </Text>
            </View>
          ) : null}

          {customNote ? (
            <View style={styles.customNoteBanner}>
              <Icon name="notebook-edit-outline" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.customNoteBannerText}>{customNote}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

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

        {/* Panel Editable (Nombre personalizado, Precio y Nota a la comunidad) */}
        {isEditingSpot && (
          <View style={styles.editorCard}>
            <View style={styles.editorHeaderRow}>
              <Icon name="pencil-box-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.editorHeaderTitle}>
                Personalizar Datos y Aviso del Punto
              </Text>
            </View>

            <View style={styles.editorInputsRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.editorFieldLabel}>Nombre del punto</Text>
                <TextInput
                  style={styles.editorInput}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Nombre personalizado..."
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.editorFieldLabel}>Precio / Tarifa</Text>
                <TextInput
                  style={styles.editorInput}
                  value={customPrice}
                  onChangeText={setCustomPrice}
                  placeholder="Gratis o €/noche"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <Text style={[styles.editorFieldLabel, { marginTop: 8 }]}>
              Nota personal o aviso a la comunidad (gálibo, sombra, nivelación, precios...)
            </Text>
            <TextInput
              style={[styles.editorInput, { minHeight: 52, textAlignVertical: 'top' }]}
              value={customNote}
              onChangeText={setCustomNote}
              multiline
              placeholder="Escribe aquí cualquier detalle útil de este punto..."
              placeholderTextColor="#64748B"
            />

            <View style={styles.editorQuickPriceRow}>
              {['Gratis', '5 €/noche', '10 €/noche', '15 €/noche', 'Solo Clientes'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.quickPriceChip,
                    customPrice === p && styles.quickPriceChipActive,
                  ]}
                  onPress={() => setCustomPrice(p)}>
                  <Text
                    style={[
                      styles.quickPriceChipText,
                      customPrice === p && styles.quickPriceChipTextActive,
                    ]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.saveEditBtn}
              activeOpacity={0.85}
              onPress={handleSaveCustomFields}>
              <Icon name="content-save-check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveEditBtnText}>Guardar Cambios del Punto</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Coordenadas GPS exactas + Aviso de guardado */}
        <View style={styles.coordsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="crosshairs-gps" size={15} color="#38BDF8" style={{ marginRight: 6 }} />
            <Text style={styles.coordsText}>
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {savedNotice && (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>✓ Guardado</Text>
              </View>
            )}
            {distanceKm !== undefined && (
              <View style={styles.distanceBadgeCompact}>
                <Text style={styles.distanceTextCompact}>A {distanceKm} km</Text>
              </View>
            )}
          </View>
        </View>

        {/* SELECTOR INTERACTIVO DE LAS 3 RUTAS EN EL DESPLEGABLE */}
        {(isCalculatingRoute || hasRoutes) && (
          <View style={styles.routesInlineContainer}>
            <View style={styles.routesInlineHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="routes" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={styles.routesInlineTitle}>
                  ELIGE TU RUTA PREFERIDA ({routes?.length || 3} OPCIONES)
                </Text>
              </View>
              {isCalculatingRoute && (
                <ActivityIndicator size="small" color="#38BDF8" />
              )}
            </View>

            {hasRoutes && (
              <View style={styles.routesCardsRow}>
                {routes!.map((rt: any, idx: number) => {
                  const isSelected =
                    (selectedRoute && selectedRoute.id && rt.id === selectedRoute.id) ||
                    (selectedRoute && selectedRoute.name && rt.name === selectedRoute.name) ||
                    (!selectedRoute && idx === 0);

                  const routeTitle =
                    idx === 0
                      ? '⭐ Más Rápida'
                      : idx === 1
                      ? '🛣️ Sin Peajes'
                      : '🏕️ Panorámica';

                  const distKm =
                    typeof rt.distance === 'number'
                      ? (rt.distance / 1000).toFixed(1)
                      : '0.0';
                  const durMin =
                    typeof rt.duration === 'number'
                      ? Math.max(1, Math.round(rt.duration / 60))
                      : 0;
                  const radarAlertsCount = Array.isArray(rt.incidents)
                    ? rt.incidents.length
                    : 0;

                  return (
                    <TouchableOpacity
                      key={rt.id || `route-opt-${idx}`}
                      style={[
                        styles.routeOptionCard,
                        isSelected && styles.routeOptionCardSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (onSelectRoute) {
                          onSelectRoute(rt);
                        }
                      }}>
                      <View style={styles.routeOptionTopRow}>
                        <Text
                          style={[
                            styles.routeOptionLabel,
                            isSelected && styles.routeOptionLabelSelected,
                          ]}
                          numberOfLines={1}>
                          {rt.badge || routeTitle}
                        </Text>
                        {isSelected && (
                          <Icon name="check-circle" size={14} color="#38BDF8" />
                        )}
                      </View>

                      <Text style={styles.routeOptionStats}>
                        {distKm} km · {durMin} min
                      </Text>

                      {rt.clearanceHazard ? (
                        <Text
                          style={[styles.routeOptionRadarText, { color: '#EF4444', fontWeight: '800' }]}
                          numberOfLines={1}>
                          ⛔ Gálibo {rt.clearanceHazard.hazard.maxAllowedHeight.toFixed(2)}m
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.routeOptionRadarText,
                            radarAlertsCount > 0
                              ? { color: '#FBBF24' }
                              : { color: '#34D399' },
                          ]}
                          numberOfLines={1}>
                          {radarAlertsCount > 0
                            ? `⚠️ ${radarAlertsCount} aviso${radarAlertsCount > 1 ? 's' : ''}`
                            : '✓ Gálibo OK'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Ocupación en 1 Toque (3 botones directos en línea: Libre, Pocas, Lleno) */}
        <View style={styles.occupancyCard}>
          <View style={styles.occupancyHeaderRow}>
            <View style={styles.occupancyBadgeRow}>
              <View
                style={[
                  styles.occupancyDot,
                  {
                    backgroundColor:
                      occupancy?.level === 'few'
                        ? '#F59E0B'
                        : occupancy?.level === 'full'
                        ? '#EF4444'
                        : '#10B981',
                  },
                ]}
              />
              <Text style={styles.occupancySectionLabel}>
                OCUPACIÓN EN TIEMPO REAL (TOCA PARA CAMBIAR):
              </Text>
            </View>
            {occupancy && (
              <Text style={styles.occupancyEstimateText}>
                {occupancy.freeSpotsEstimate}
              </Text>
            )}
          </View>

          <View style={styles.occupancyButtonsRow}>
            <TouchableOpacity
              style={[
                styles.occupancyQuickBtn,
                occupancy?.level === 'plenty' && styles.occupancyQuickBtnPlenty,
              ]}
              activeOpacity={0.8}
              onPress={() => handleDirectOccupancyChange('plenty')}>
              <Text
                style={[
                  styles.occupancyQuickBtnText,
                  occupancy?.level === 'plenty' && styles.occupancyQuickBtnTextActive,
                ]}>
                🟢 Libre
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.occupancyQuickBtn,
                occupancy?.level === 'few' && styles.occupancyQuickBtnFew,
              ]}
              activeOpacity={0.8}
              onPress={() => handleDirectOccupancyChange('few')}>
              <Text
                style={[
                  styles.occupancyQuickBtnText,
                  occupancy?.level === 'few' && styles.occupancyQuickBtnTextActive,
                ]}>
                🟡 Pocas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.occupancyQuickBtn,
                occupancy?.level === 'full' && styles.occupancyQuickBtnFull,
              ]}
              activeOpacity={0.8}
              onPress={() => handleDirectOccupancyChange('full')}>
              <Text
                style={[
                  styles.occupancyQuickBtnText,
                  occupancy?.level === 'full' && styles.occupancyQuickBtnTextActive,
                ]}>
                🔴 Lleno
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Servicios y Atributos 100% Modificables en 1 Toque */}
        <View style={styles.servicesHeaderRow}>
          <Text style={styles.servicesHeaderTitle}>
            SERVICIOS DEL PUNTO (TOCA CUALQUIERA PARA ACTIVAR / DESACTIVAR)
          </Text>
        </View>

        <ScrollView
          horizontal={!isExpanded}
          showsHorizontalScrollIndicator={false}
          style={styles.servicesScroll}
          contentContainerStyle={isExpanded ? styles.servicesGridExpanded : undefined}>
          {ALL_MODIFIABLE_SERVICES.map(srv => {
            const isActive = !!activeServices[srv.key];
            return (
              <TouchableOpacity
                key={srv.key}
                activeOpacity={0.75}
                onPress={() => handleToggleService(srv.key)}
                style={[
                  styles.servicePill,
                  isActive ? styles.servicePillActive : styles.servicePillInactive,
                  isExpanded && styles.servicePillExpandedItem,
                ]}>
                <Icon
                  name={srv.icon === 'Jeepney' ? 'car-4x4' : srv.icon}
                  size={14}
                  color={isActive ? srv.color : '#64748B'}
                />
                <Text
                  style={[
                    styles.serviceText,
                    isActive ? styles.serviceTextActive : styles.serviceTextInactive,
                  ]}>
                  {srv.label}
                </Text>
                {isActive && (
                  <Text style={styles.serviceCheckMark}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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

        {/* Descripción detallada al expandir */}
        {isExpanded && location.description ? (
          <View style={styles.fullDescCard}>
            <View style={styles.fullDescHeader}>
              <Icon name="text-box-outline" size={16} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.fullDescTitle}>Información y Consejos del Lugar</Text>
            </View>
            <Text style={styles.fullDescText}>{location.description}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Botones de Acción Directa 3D en el pie del desplegable */}
      <View style={styles.actionsRow}>
        {/* Botón principal: 🚀 INICIAR CONDUCCIÓN 3D */}
        <TouchableOpacity
          style={styles.primaryRouteBtn}
          activeOpacity={0.85}
          onPress={() => {
            const targetRoute = selectedRoute || (hasRoutes ? routes![0] : null);
            if (targetRoute && onStartDirectNavigation) {
              onStartDirectNavigation(targetRoute);
            } else {
              onStartRoute(location);
            }
          }}>
          <View style={styles.btnIconPod}>
            <Icon name="navigation-variant" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryBtnTitle} numberOfLines={1}>
              🚀 INICIAR CONDUCCIÓN 3D
            </Text>
            <Text style={styles.primaryBtnSub} numberOfLines={1}>
              {selectedRoute
                ? `${(selectedRoute.distance / 1000).toFixed(1)} km · ${Math.max(
                    1,
                    Math.round(selectedRoute.duration / 60)
                  )} min`
                : distanceKm !== undefined
                ? `A ${distanceKm} km · GPS Cabina 3D`
                : 'Navegación GPS Cabina 3D'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Botón: 🎮 SIMULAR 3D */}
        <TouchableOpacity
          style={styles.sim3DBtn}
          activeOpacity={0.85}
          onPress={() => {
            const targetRoute = selectedRoute || (hasRoutes ? routes![0] : undefined);
            if (onStartSimulation3D) {
              onStartSimulation3D(targetRoute);
            } else {
              onStartRoute(location);
            }
          }}>
          <Icon name="gamepad-variant-outline" size={18} color="#34D399" />
          <Text style={styles.sim3DBtnText}>🎮 SIMULAR 3D</Text>
        </TouchableOpacity>

        {/* Botón: 🛣️ Opciones */}
        <TouchableOpacity
          style={styles.optionsRouteBtn}
          activeOpacity={0.8}
          onPress={() => {
            setIsExpanded(true);
            onStartRoute(location);
          }}>
          <Icon name="routes" size={18} color="#38BDF8" />
          <Text style={styles.optionsRouteBtnText}>🛣️ Opciones</Text>
        </TouchableOpacity>

        {/* Botón: ⭐ Reseñas */}
        <TouchableOpacity
          style={styles.reviewsBtn}
          activeOpacity={0.8}
          onPress={() => onOpenReviews(location)}>
          <Icon name="star-outline" size={18} color="#FBBF24" />
          <Text style={styles.reviewsBtnText}>⭐ Reseñas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 14,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 22,
    zIndex: 110,
  },
  sheetContainerExpanded: {
    maxHeight: '86%',
    paddingBottom: 18,
  },
  expandHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  expandHintText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  compactContentScroll: {
    maxHeight: 290,
    marginVertical: 2,
  },
  expandedContentScroll: {
    maxHeight: 470,
    marginVertical: 4,
  },
  expandedContentContainer: {
    paddingBottom: 10,
  },
  titleSectionTouch: {
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceTagBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priceTagText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
  },
  customNoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
  },
  customNoteBannerText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  editSpotBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  editSpotBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    borderColor: '#10B981',
  },
  editSpotBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  editorCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  editorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editorHeaderTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  editorInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorFieldLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  editorInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  editorQuickPriceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickPriceChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickPriceChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  quickPriceChipText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  quickPriceChipTextActive: {
    color: '#34D399',
  },
  saveEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  saveEditBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  coordsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  coordsText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  savedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savedBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  distanceBadgeCompact: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distanceTextCompact: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  routesInlineContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  routesInlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  routesInlineTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  routesCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  routeOptionCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  routeOptionCardSelected: {
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
    borderColor: '#38BDF8',
  },
  routeOptionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  routeOptionLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  routeOptionLabelSelected: {
    color: '#FFFFFF',
  },
  routeOptionStats: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  routeOptionRadarText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fullDescCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fullDescHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fullDescTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  fullDescText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
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
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  categoryBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  addressText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  occupancyCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  occupancyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  occupancySectionLabel: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  occupancyEstimateText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  occupancyButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  occupancyQuickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  occupancyQuickBtnPlenty: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    borderColor: '#10B981',
  },
  occupancyQuickBtnFew: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderColor: '#F59E0B',
  },
  occupancyQuickBtnFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderColor: '#EF4444',
  },
  occupancyQuickBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  occupancyQuickBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  servicesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  servicesHeaderTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  servicesScroll: {
    marginBottom: 10,
  },
  servicesGridExpanded: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
  },
  servicePillExpandedItem: {
    marginRight: 0,
    marginBottom: 4,
  },
  servicePillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderColor: 'rgba(56, 189, 248, 0.45)',
  },
  servicePillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.65,
  },
  serviceText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  serviceTextActive: {
    color: '#F8FAFC',
  },
  serviceTextInactive: {
    color: '#64748B',
  },
  serviceCheckMark: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  primaryRouteBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 15,
    paddingVertical: 9,
    paddingHorizontal: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnIconPod: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  primaryBtnTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  primaryBtnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '600',
  },
  sim3DBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  sim3DBtnText: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  optionsRouteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  optionsRouteBtnText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  reviewsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  reviewsBtnText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  headerActionsPod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    padding: 5,
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
    marginBottom: 8,
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
