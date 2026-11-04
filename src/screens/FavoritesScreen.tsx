/**
 * FavoritesScreen - Gestión Completa de Favoritos, Puntos Propios e Historial de Rutas
 * CamperSites Pro - Multi-Vehículo (Camper, Moto, 4x4, Coche, Camión y SOS)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { AdvancedFavorites } from '../features/premium';
import {
  routeHistoryService,
  RouteHistoryEntry,
  RouteHistorySettings,
  DEFAULT_HISTORY_SETTINGS,
} from '../services/RouteHistoryService';

const FAVORITES_KEY = '@campersites_favorites';
const CUSTOM_LOCATIONS_KEY = '@campersites_custom_locations';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  city: string;
  province: string;
  has_water: boolean;
  has_electricity: boolean;
  price: number | null;
  description?: string;
}

const LOCATION_CATEGORIES = [
  { id: 'CAMPING', label: 'Camping / Área Camper', icon: 'tent', color: '#10B981' },
  { id: 'PARKING_PERMITIDO', label: 'Pernocta / Parking Libre', icon: 'parking', color: '#38BDF8' },
  { id: 'RUTA_MOTO_MONTE', label: 'Ruta Moto / Puerto / Monte', icon: 'motorbike', color: '#F97316' },
  { id: 'PISTA_4X4', label: 'Pista 4x4 / Off-Road', icon: 'jeep', color: '#84CC16' },
  { id: 'MIRADOR', label: 'Mirador / Naturaleza', icon: 'image-filter-hdr', color: '#A855F7' },
  { id: 'AREA_SERVICIOS', label: 'Agua / Vaciado / GLP', icon: 'water-pump', color: '#818CF8' },
  { id: 'PUNTO_SOS', label: 'Refugio / Punto SOS', icon: 'lifebuoy', color: '#EF4444' },
];

// Lugares legendarios sugeridos para añadir con 1 toque
const CURATED_RECOMMENDED_SPOTS: Location[] = [
  {
    id: 'spot_cabo_gata_rec',
    name: 'Área Camper Cabo de Gata & Las Negras',
    latitude: 36.8791,
    longitude: -2.0084,
    category: 'CAMPING',
    city: 'Níjar',
    province: 'Almería',
    has_water: true,
    has_electricity: true,
    price: 15,
    description: 'A 200m del mar, noches estrelladas sin contaminación lumínica.',
  },
  {
    id: 'spot_picos_europa_rec',
    name: 'Mirador & Ruta Trail Picos de Europa (Sotres)',
    latitude: 43.2312,
    longitude: -4.7523,
    category: 'RUTA_MOTO_MONTE',
    city: 'Cabrales',
    province: 'Asturias',
    has_water: true,
    has_electricity: false,
    price: 0,
    description: 'Puerto de montaña mítico para campers, motos trail y 4x4.',
  },
  {
    id: 'spot_fisterra_rec',
    name: 'Área O Rincón da Costa Fisterra',
    latitude: 42.9089,
    longitude: -9.2556,
    category: 'CAMPING',
    city: 'Fisterra',
    province: 'A Coruña',
    has_water: true,
    has_electricity: true,
    price: 18,
    description: 'Atardeceres legendarios sobre el océano Atlántico.',
  },
  {
    id: 'spot_bardenas_4x4',
    name: 'Travesía 4x4 & Moto Bardenas Reales',
    latitude: 42.1925,
    longitude: -1.5122,
    category: 'PISTA_4X4',
    city: 'Arguedas',
    province: 'Navarra',
    has_water: false,
    has_electricity: false,
    price: 0,
    description: 'Pista desértica autorizada para 4x4, moto trail y overlanding.',
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'CAMPING': return 'tent';
    case 'PARKING_PERMITIDO': return 'parking';
    case 'RUTA_MOTO_MONTE': return 'motorbike';
    case 'PISTA_4X4': return 'jeep';
    case 'MIRADOR': return 'image-filter-hdr';
    case 'AREA_DESCANSO': return 'bench';
    case 'AREA_SERVICIOS': return 'water-pump';
    case 'PUNTO_SOS': return 'lifebuoy';
    case 'PUNTO_PERSONALIZADO':
    case 'FAVORITO': return 'crosshairs-gps';
    default: return 'map-marker';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'CAMPING': return '#10B981';
    case 'PARKING_PERMITIDO': return '#38BDF8';
    case 'RUTA_MOTO_MONTE': return '#F97316';
    case 'PISTA_4X4': return '#84CC16';
    case 'MIRADOR': return '#A855F7';
    case 'AREA_DESCANSO': return '#F59E0B';
    case 'AREA_SERVICIOS': return '#818CF8';
    case 'PUNTO_SOS': return '#EF4444';
    case 'PUNTO_PERSONALIZADO':
    case 'FAVORITO': return '#F59E0B';
    default: return '#94A3B8';
  }
};

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const [favorites, setFavorites] = useState<Location[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'folders' | 'history'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Estado del Historial de Rutas y su Configuración
  const [routeHistory, setRouteHistory] = useState<RouteHistoryEntry[]>([]);
  const [historySettings, setHistorySettings] = useState<RouteHistorySettings>(DEFAULT_HISTORY_SETTINGS);
  const [showHistorySettingsModal, setShowHistorySettingsModal] = useState(false);

  // Estado del Modal para Añadir Nueva Ubicación
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCity, setNewLocCity] = useState('');
  const [newLocCategory, setNewLocCategory] = useState('CAMPING');
  const [newLocLat, setNewLocLat] = useState('');
  const [newLocLng, setNewLocLng] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');
  const [nominatimQuery, setNominatimQuery] = useState('');
  const [nominatimResults, setNominatimResults] = useState<any[]>([]);
  const [searchingNominatim, setSearchingNominatim] = useState(false);

  const handleSelectFavorite = async (item: Location, autoCalculateRoute: boolean = false) => {
    try {
      await AsyncStorage.setItem(
        '@campersites_jump_to_location',
        JSON.stringify({ ...item, _autoCalculateRoute: autoCalculateRoute })
      );
      navigation.navigate('Mapa' as never);
    } catch {}
  };

  const loadFavoritesAndHistory = useCallback(async () => {
    try {
      // 1. Cargar Historial de Rutas y Ajustes
      const [histList, histCfg] = await Promise.all([
        routeHistoryService.getHistory(),
        routeHistoryService.getSettings(),
      ]);
      setRouteHistory(histList);
      setHistorySettings(histCfg);

      // 2. Cargar Favoritos
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      const ids: string[] = stored ? JSON.parse(stored) : [];
      setFavoriteIds(ids);

      if (ids.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      let loadedList: Location[] = [];

      // Cargar puntos personalizados locales
      try {
        const customStored = await AsyncStorage.getItem(CUSTOM_LOCATIONS_KEY);
        if (customStored) {
          const customLocs: Location[] = JSON.parse(customStored);
          const customMatches = customLocs.filter(c => ids.includes(c.id));
          loadedList.push(...customMatches);
        }
      } catch {}

      // Cargar recomendados si coinciden
      const curatedMatches = CURATED_RECOMMENDED_SPOTS.filter(s => ids.includes(s.id));
      curatedMatches.forEach(cm => {
        if (!loadedList.some(l => l.id === cm.id)) {
          loadedList.push(cm);
        }
      });

      // Buscar también en Supabase los IDs estándar
      const remainingIds = ids.filter(id => !loadedList.some(l => l.id === id));
      if (remainingIds.length > 0) {
        const { data } = await supabase
          .from('locations')
          .select('*')
          .in('id', remainingIds);
        if (data && data.length > 0) {
          loadedList.push(...data);
        }
      }

      setFavorites(loadedList);
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavoritesAndHistory();
    }, [loadFavoritesAndHistory])
  );

  // Búsqueda autocompletada de direcciones reales (OpenStreetMap Nominatim) para añadir ubicación
  useEffect(() => {
    if (nominatimQuery.trim().length < 3) {
      setNominatimResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingNominatim(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          nominatimQuery.trim()
        )}&limit=5&addressdetails=1`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'CamperSitesPro/1.2' },
        });
        if (res.ok) {
          const data = await res.json();
          setNominatimResults(data || []);
        }
      } catch {} finally {
        setSearchingNominatim(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [nominatimQuery]);

  const handleUseCurrentGPSForNewLocation = () => {
    Geolocation.getCurrentPosition(
      (pos) => {
        setNewLocLat(pos.coords.latitude.toFixed(6));
        setNewLocLng(pos.coords.longitude.toFixed(6));
        if (!newLocName.trim()) {
          setNewLocName('Mi Posición GPS Actual');
        }
        Alert.alert('📍 Coordenadas Obtenidas', `Lat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)}`);
      },
      () => {
        Alert.alert('Aviso GPS', 'No se pudo obtener el GPS actual. Puedes buscar por nombre arriba o escribir las coordenadas.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateCustomFavorite = async () => {
    const lat = parseFloat(newLocLat.replace(',', '.'));
    const lng = parseFloat(newLocLng.replace(',', '.'));

    if (!newLocName.trim()) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para identificar esta ubicación.');
      return;
    }
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert(
        'Ubicación requerida',
        'Busca un pueblo/dirección en el buscador superior o pulsa "Usar mi GPS actual" para fijar las coordenadas.'
      );
      return;
    }

    const newItem: Location = {
      id: `custom_fav_${Date.now()}`,
      name: newLocName.trim(),
      latitude: lat,
      longitude: lng,
      category: newLocCategory,
      city: newLocCity.trim() || 'Ubicación Personalizada',
      province: '',
      has_water: newLocCategory === 'CAMPING' || newLocCategory === 'AREA_SERVICIOS',
      has_electricity: newLocCategory === 'CAMPING',
      price: 0,
      description: newLocDesc.trim() || `Guardado manualmente (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    };

    try {
      const customRaw = await AsyncStorage.getItem(CUSTOM_LOCATIONS_KEY);
      const customList: Location[] = customRaw ? JSON.parse(customRaw) : [];
      const updatedCustom = [newItem, ...customList];
      await AsyncStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(updatedCustom));

      const updatedIds = [newItem.id, ...favoriteIds];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedIds));

      setFavoriteIds(updatedIds);
      setFavorites(prev => [newItem, ...prev]);

      // Reset modal
      setNewLocName('');
      setNewLocCity('');
      setNewLocLat('');
      setNewLocLng('');
      setNewLocDesc('');
      setNominatimQuery('');
      setNominatimResults([]);
      setShowAddLocationModal(false);

      Alert.alert('✅ Ubicación Añadida', `"${newItem.name}" ya está en tus Favoritos y en el Mapa.`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la ubicación.');
    }
  };

  const addCuratedToFavorites = async (item: Location) => {
    try {
      if (favoriteIds.includes(item.id)) return;
      const newIds = [item.id, ...favoriteIds];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newIds));
      setFavoriteIds(newIds);
      setFavorites(prev => [item, ...prev]);
      Alert.alert('⭐ Añadido a Favoritos', `"${item.name}" guardado en tu lista.`);
    } catch (err) {
      console.error('Error adding curated to favorites:', err);
    }
  };

  const confirmRemoveFavorite = (item: Location) => {
    Alert.alert(
      '🗑️ Borrar Ubicación',
      `¿Seguro que quieres eliminar "${item.name}" de tus favoritos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => removeFavorite(item.id),
        },
      ]
    );
  };

  const removeFavorite = async (locationId: string) => {
    try {
      const newIds = favoriteIds.filter(id => id !== locationId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newIds));
      setFavoriteIds(newIds);
      setFavorites(prev => prev.filter(loc => loc.id !== locationId));

      try {
        const customStored = await AsyncStorage.getItem(CUSTOM_LOCATIONS_KEY);
        if (customStored) {
          const customLocs: Location[] = JSON.parse(customStored);
          const updatedCustom = customLocs.filter(c => c.id !== locationId);
          await AsyncStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(updatedCustom));
        }
      } catch {}
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const confirmClearAllFavorites = () => {
    if (favorites.length === 0) return;
    Alert.alert(
      '🗑️ Vaciar Todos los Favoritos',
      `Se eliminarán las ${favorites.length} ubicaciones guardadas. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar Todo',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([]));
            setFavoriteIds([]);
            setFavorites([]);
          },
        },
      ]
    );
  };

  // Filtrado por barra de búsqueda
  const filteredFavorites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter(
      f =>
        f.name.toLowerCase().includes(q) ||
        (f.city && f.city.toLowerCase().includes(q)) ||
        (f.province && f.province.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q)) ||
        (f.description && f.description.toLowerCase().includes(q))
    );
  }, [favorites, searchQuery]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return routeHistory;
    return routeHistory.filter(
      h =>
        h.destinationName.toLowerCase().includes(q) ||
        (h.routeName && h.routeName.toLowerCase().includes(q)) ||
        (h.vehicleMode && h.vehicleMode.toLowerCase().includes(q))
    );
  }, [routeHistory, searchQuery]);

  const handleRepeatRoute = async (entry: RouteHistoryEntry) => {
    const target: Location = {
      id: entry.id,
      name: entry.destinationName,
      latitude: entry.toLat,
      longitude: entry.toLng,
      category: entry.destinationCategory || 'RUTA',
      city: 'Historial de Rutas',
      province: '',
      has_water: false,
      has_electricity: false,
      price: null,
    };
    await handleSelectFavorite(target, true);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    const updated = await routeHistoryService.deleteEntry(id);
    setRouteHistory(updated);
  };

  const handleClearAllHistory = () => {
    Alert.alert(
      '🗑️ Borrar Historial de Rutas',
      '¿Seguro que deseas eliminar todas las rutas registradas en tu historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar Historial',
          style: 'destructive',
          onPress: async () => {
            await routeHistoryService.clearAllHistory();
            setRouteHistory([]);
          },
        },
      ]
    );
  };

  const handleUpdateHistoryConfig = async (partial: Partial<RouteHistorySettings>) => {
    const updated = await routeHistoryService.updateSettings(partial);
    setHistorySettings(updated);
  };

  const renderFavoriteCard = ({ item }: { item: Location }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => handleSelectFavorite(item, false)}>
      <View style={styles.cardContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${getCategoryColor(item.category)}20` },
          ]}>
          <Icon
            name={getCategoryIcon(item.category)}
            size={26}
            color={getCategoryColor(item.category)}
          />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          {(item.city || item.province) && (
            <Text style={styles.cardLocation} numberOfLines={1}>
              📍 {[item.city, item.province].filter(Boolean).join(', ')}
            </Text>
          )}
          <View style={styles.cardTags}>
            <TouchableOpacity
              style={[styles.tag, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}
              onPress={() => handleSelectFavorite(item, true)}>
              <Icon name="navigation" size={12} color="#10B981" />
              <Text style={[styles.tagText, { color: '#10B981', fontWeight: '800' }]}>
                Iniciar Ruta
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tag, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}
              onPress={() => handleSelectFavorite(item, false)}>
              <Icon name="map-search-outline" size={12} color="#38BDF8" />
              <Text style={[styles.tagText, { color: '#38BDF8', fontWeight: '700' }]}>
                Ver en Mapa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmRemoveFavorite(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="trash-can-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteBtnLabel}>Borrar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderHistoryCard = ({ item }: { item: RouteHistoryEntry }) => {
    const distKm = (item.distanceMeters / 1000).toFixed(1);
    const durMin = Math.max(1, Math.round(item.durationSeconds / 60));
    const dateStr = new Date(item.timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <Icon name="map-marker-path" size={26} color="#38BDF8" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.destinationName}
            </Text>
            <Text style={styles.cardLocation}>
              🕒 {dateStr} • 📏 {distKm} km ({durMin} min)
            </Text>
            <View style={styles.cardTags}>
              <TouchableOpacity
                style={[styles.tag, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}
                onPress={() => handleRepeatRoute(item)}>
                <Icon name="replay" size={13} color="#10B981" />
                <Text style={[styles.tagText, { color: '#10B981', fontWeight: '800' }]}>
                  Repetir Ruta 3D
                </Text>
              </TouchableOpacity>
              {item.routeName && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.routeName}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteHistoryItem(item.id)}>
            <Icon name="trash-can-outline" size={20} color="#EF4444" />
            <Text style={styles.deleteBtnLabel}>Borrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.backgroundCenteredLogo}
        resizeMode="contain"
      />

      {/* Header Superior con Botones de Añadir y Borrar */}
      <View style={styles.header}>
        <View style={styles.headerTopBar}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Favoritos y Rutas</Text>
            <View style={styles.countBadge}>
              <Icon name="heart" size={13} color="#EF4444" />
              <Text style={styles.countText}>{favorites.length}</Text>
            </View>
          </View>

          <View style={styles.headerActionBtns}>
            <TouchableOpacity
              style={styles.addSpotButton}
              onPress={() => setShowAddLocationModal(true)}>
              <Icon name="map-marker-plus" size={16} color="#FFFFFF" />
              <Text style={styles.addSpotButtonText}>+ Añadir</Text>
            </TouchableOpacity>

            {viewMode === 'list' && favorites.length > 0 && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={confirmClearAllFavorites}>
                <Icon name="delete-sweep-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}

            {viewMode === 'history' && (
              <TouchableOpacity
                style={styles.historyConfigButton}
                onPress={() => setShowHistorySettingsModal(true)}>
                <Icon name="cog-outline" size={18} color="#38BDF8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Barra de Búsqueda en Tiempo Real */}
        <View style={styles.searchBarWrap}>
          <Icon name="magnify" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              viewMode === 'history'
                ? 'Buscar en tu historial de rutas...'
                : 'Buscar en tus favoritos por nombre, ciudad o tipo...'
            }
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Selector de 3 Pestañas: Favoritos | Carpetas | Historial de Rutas */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}>
            <Icon
              name="heart-multiple"
              size={15}
              color={viewMode === 'list' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              Favoritos ({favorites.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'history' && styles.toggleBtnActive]}
            onPress={() => setViewMode('history')}>
            <Icon
              name="history"
              size={16}
              color={viewMode === 'history' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text style={[styles.toggleText, viewMode === 'history' && styles.toggleTextActive]}>
              Historial ({routeHistory.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'folders' && styles.toggleBtnActive]}
            onPress={() => setViewMode('folders')}>
            <Icon
              name="folder-star-outline"
              size={15}
              color={viewMode === 'folders' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text style={[styles.toggleText, viewMode === 'folders' && styles.toggleTextActive]}>
              Carpetas
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido Principal según Pestaña */}
      {viewMode === 'folders' ? (
        <AdvancedFavorites />
      ) : viewMode === 'history' ? (
        <View style={{ flex: 1 }}>
          {/* Barra de Estado de Configuración de Historial */}
          <View style={styles.historyBannerBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon
                name={historySettings.enabled ? 'record-circle' : 'pause-circle'}
                size={18}
                color={historySettings.enabled ? '#10B981' : '#F59E0B'}
              />
              <Text style={styles.historyBannerText}>
                {historySettings.enabled
                  ? `Guardado automático activo (Retención: ${
                      historySettings.autoCleanDays === 0
                        ? 'Siempre'
                        : `${historySettings.autoCleanDays} días`
                    })`
                  : 'Guardado de historial en pausa'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowHistorySettingsModal(true)}>
                <Text style={styles.historyConfigLink}>Configurar</Text>
              </TouchableOpacity>
              {routeHistory.length > 0 && (
                <TouchableOpacity onPress={handleClearAllHistory}>
                  <Text style={[styles.historyConfigLink, { color: '#EF4444' }]}>Vaciar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {filteredHistory.length === 0 ? (
            <View style={styles.emptyHistoryBox}>
              <Icon name="map-clock-outline" size={52} color="#475569" />
              <Text style={styles.emptyTitle}>Sin rutas en el historial</Text>
              <Text style={styles.emptySubtext}>
                Cada vez que inicies una ruta en el Mapa (en Camper, Moto, 4x4 o Coche), se guardará aquí automáticamente para que puedas repetirla con 1 toque.
              </Text>
              <TouchableOpacity
                style={styles.goExploreBtn}
                onPress={() => navigation.navigate('Mapa' as never)}>
                <Icon name="map-Search" size={18} color="#FFFFFF" />
                <Text style={styles.goExploreBtnText}>Ir al Mapa e Iniciar Ruta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredHistory}
              renderItem={renderHistoryCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : filteredFavorites.length === 0 ? (
        <FlatList
          data={CURATED_RECOMMENDED_SPOTS}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.emptyHeaderBanner}>
              <View style={styles.emptyIconCircle}>
                <Icon name="heart-plus-outline" size={40} color="#EF4444" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? 'No hay favoritos que coincidan con tu búsqueda'
                  : 'Tu lista de favoritos está vacía'}
              </Text>
              <Text style={styles.emptySubtext}>
                Pulsa el botón superior "+ Añadir" para guardar cualquier punto, ruta de moto, pista 4x4 o área camper, o añade uno de estos destinos recomendados:
              </Text>
              <Text style={styles.curatedSectionTitle}>
                ✨ DESTINOS Y RUTAS RECOMENDADAS (CAMPER / MOTO / 4X4)
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${getCategoryColor(item.category)}20` },
                  ]}>
                  <Icon
                    name={getCategoryIcon(item.category)}
                    size={26}
                    color={getCategoryColor(item.category)}
                  />
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardLocation} numberOfLines={1}>
                    📍 {item.city}, {item.province}
                  </Text>
                  {item.description && (
                    <Text style={styles.curatedDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.addCuratedBtn}
                  onPress={() => addCuratedToFavorites(item)}>
                  <Icon name="plus-circle" size={20} color="#10B981" />
                  <Text style={styles.addCuratedBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredFavorites}
          renderItem={renderFavoriteCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* MODAL PARA AÑADIR NUEVA UBICACIÓN A FAVORITOS */}
      <Modal
        visible={showAddLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddLocationModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 Añadir Ubicación a Favoritos</Text>
              <TouchableOpacity onPress={() => setShowAddLocationModal(false)}>
                <Icon name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Opción 1: Buscador Automático de Lugares */}
              <Text style={styles.inputLabel}>1. Buscar pueblo, dirección o monte (Autocompletado):</Text>
              <View style={styles.nominatimBox}>
                <Icon name="magnify" size={18} color="#38BDF8" />
                <TextInput
                  style={styles.nominatimInput}
                  placeholder="Ej: Cangas de Onís, Cabo de Gata, Puerto de Navacerrada..."
                  placeholderTextColor="#64748B"
                  value={nominatimQuery}
                  onChangeText={setNominatimQuery}
                />
                {searchingNominatim && <ActivityIndicator size="small" color="#38BDF8" />}
              </View>

              {nominatimResults.map((res, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.nominatimResultItem}
                  onPress={() => {
                    const mainName = res.display_name.split(',')[0];
                    setNewLocName(mainName);
                    setNewLocCity(res.address?.city || res.address?.town || res.address?.state || '');
                    setNewLocLat(String(res.lat));
                    setNewLocLng(String(res.lon));
                    setNominatimResults([]);
                    setNominatimQuery('');
                  }}>
                  <Icon name="map-marker-check" size={18} color="#10B981" />
                  <Text style={styles.nominatimResultText} numberOfLines={2}>
                    {res.display_name}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Opción 2: Usar mi GPS actual con 1 toque */}
              <TouchableOpacity
                style={styles.useGpsBtn}
                onPress={handleUseCurrentGPSForNewLocation}>
                <Icon name="crosshairs-gps" size={18} color="#38BDF8" />
                <Text style={styles.useGpsBtnText}>
                  Usar mi Posición GPS Actual Exacta
                </Text>
              </TouchableOpacity>

              {/* Nombre y Categoría */}
              <Text style={styles.inputLabel}>2. Nombre de la ubicación *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej: Mirador Secreto / Pista Moto / Área Pernocta"
                placeholderTextColor="#64748B"
                value={newLocName}
                onChangeText={setNewLocName}
              />

              <Text style={styles.inputLabel}>3. Tipo de punto (Camper, Moto, 4x4, SOS):</Text>
              <View style={styles.categoryGrid}>
                {LOCATION_CATEGORIES.map(cat => {
                  const active = newLocCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        active && { borderColor: cat.color, backgroundColor: `${cat.color}22` },
                      ]}
                      onPress={() => setNewLocCategory(cat.id)}>
                      <Icon name={cat.icon} size={16} color={active ? cat.color : '#94A3B8'} />
                      <Text style={[styles.categoryChipText, active && { color: '#FFFFFF', fontWeight: '700' }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Latitud</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="40.4168"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={newLocLat}
                    onChangeText={setNewLocLat}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Longitud</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="-3.7038"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={newLocLng}
                    onChangeText={setNewLocLng}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Notas / Descripción (Opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej: Suelo nivelado, fuente cerca, buena cobertura..."
                placeholderTextColor="#64748B"
                value={newLocDesc}
                onChangeText={setNewLocDesc}
              />

              <TouchableOpacity
                style={styles.saveNewLocationBtn}
                onPress={handleCreateCustomFavorite}>
                <Icon name="content-save-check" size={20} color="#FFFFFF" />
                <Text style={styles.saveNewLocationBtnText}>Guardar en Favoritos</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIGURACIÓN DEL HISTORIAL DE RUTAS */}
      <Modal
        visible={showHistorySettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHistorySettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️ Configuración de Historial</Text>
              <TouchableOpacity onPress={() => setShowHistorySettingsModal(false)}>
                <Icon name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.settingTitle}>Guardar historial de rutas automáticamente</Text>
                <Text style={styles.settingSub}>
                  Registra cada ruta iniciada en el mapa para poder consultarla o repetirla.
                </Text>
              </View>
              <Switch
                value={historySettings.enabled}
                onValueChange={val => handleUpdateHistoryConfig({ enabled: val })}
                trackColor={{ false: '#334155', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Text style={styles.inputLabel}>Tiempo de conservación automática:</Text>
            <View style={styles.retentionRow}>
              {[
                { label: '7 días', val: 7 },
                { label: '30 días', val: 30 },
                { label: '90 días', val: 90 },
                { label: 'Siempre', val: 0 },
              ].map(opt => {
                const selected = historySettings.autoCleanDays === opt.val;
                return (
                  <TouchableOpacity
                    key={opt.val}
                    style={[styles.retentionChip, selected && styles.retentionChipActive]}
                    onPress={() => handleUpdateHistoryConfig({ autoCleanDays: opt.val })}>
                    <Text style={[styles.retentionChipText, selected && { color: '#FFFFFF', fontWeight: '800' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Límite máximo de rutas guardadas:</Text>
            <View style={styles.retentionRow}>
              {[25, 100, 500].map(limit => {
                const selected = historySettings.maxEntries === limit;
                return (
                  <TouchableOpacity
                    key={limit}
                    style={[styles.retentionChip, selected && styles.retentionChipActive]}
                    onPress={() => handleUpdateHistoryConfig({ maxEntries: limit })}>
                    <Text style={[styles.retentionChipText, selected && { color: '#FFFFFF', fontWeight: '800' }]}>
                      Máx. {limit} rutas
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.dangerClearHistoryBtn}
              onPress={() => {
                setShowHistorySettingsModal(false);
                handleClearAllHistory();
              }}>
              <Icon name="trash-can-outline" size={18} color="#EF4444" />
              <Text style={styles.dangerClearHistoryText}>
                Borrar todo el historial ahora ({routeHistory.length} rutas)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundCenteredLogo: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    width: 280,
    height: 280,
    opacity: 0.06,
    pointerEvents: 'none',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  headerActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSpotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addSpotButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  clearAllButton: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  historyConfigButton: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    marginLeft: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 5,
  },
  toggleBtnActive: {
    backgroundColor: '#0284C7',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  deleteBtnLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 2,
  },
  emptyHeaderBanner: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  curatedSectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.7,
    marginTop: 4,
  },
  curatedDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    marginBottom: 4,
  },
  addCuratedBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
  },
  addCuratedBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  historyBannerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131D31',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  historyBannerText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  historyConfigLink: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyHistoryBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  goExploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  goExploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 10,
    marginBottom: 6,
  },
  nominatimBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  nominatimInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 8,
  },
  nominatimResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  nominatimResultText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 12,
  },
  useGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  useGpsBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryChipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  saveNewLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 18,
    marginBottom: 10,
  },
  saveNewLocationBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  settingSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  retentionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  retentionChip: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  retentionChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  retentionChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerClearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  dangerClearHistoryText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
});
