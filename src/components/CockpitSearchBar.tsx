/**
 * CockpitSearchBar.tsx - Barra de búsqueda inteligente de cabina y chips de filtro rápido
 * Diseño automotriz de alta gama: Glassmorphism, auto-completado y filtros de 1 toque
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import haversine from 'haversine-distance';
import { supabase } from '../lib/supabase';
import { Logger } from '../utils/logger';
import { offlineSpotVault } from '../services/OfflineSpotVaultService';

export interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  categories: string[];
  color: string;
}

export const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'all',
    label: '✨ Todos',
    icon: 'star-circle-outline',
    categories: [],
    color: '#38BDF8',
  },
  {
    id: 'camper',
    label: '🏕️ Campers',
    icon: 'tent',
    categories: ['CAMPING', 'AREA_DESCANSO', 'AREA_SERVICIOS'],
    color: '#10B981',
  },
  {
    id: 'free_sleep',
    label: '🌙 Dormir Gratis',
    icon: 'weather-night',
    categories: ['PERNOCTA_LIBRE', 'PARKING_PERMITIDO'],
    color: '#818CF8',
  },
  {
    id: 'glp',
    label: '⛽ GLP / Autogas',
    icon: 'gas-station',
    categories: ['GASOLINERA_GLP'],
    color: '#EF4444',
  },
  {
    id: 'truck',
    label: '🚛 Camiones',
    icon: 'truck',
    categories: ['AREA_DESCANSO', 'AREA_SERVICIOS', 'RESTAURANTE', 'PARKING_PERMITIDO'],
    color: '#F59E0B',
  },
  {
    id: 'food',
    label: '🍽️ Bares / Restaurantes',
    icon: 'silverware-fork-knife',
    categories: ['RESTAURANTE', 'BAR', 'BAR_CAFETERIA'],
    color: '#FB923C',
  },
  {
    id: 'services',
    label: '💧 Agua y Servicios',
    icon: 'water-pump',
    categories: ['LLENADO_AGUA', 'VACIADO_AGUAS', 'LAVANDERIA', 'LAVADERO_COCHES'],
    color: '#06B6D4',
  },
  {
    id: 'radars',
    label: '⚠️ Radares DGT',
    icon: 'speedometer',
    categories: ['RADAR'],
    color: '#DC2626',
  },
];

interface SearchResultItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  description?: string;
  address?: string;
  distanceKm?: number;
}

interface CockpitSearchBarProps {
  currentCoords?: { latitude: number; longitude: number } | null;
  activeFilterId: string;
  hasActiveAdvancedFilters?: boolean;
  onSelectFilter: (filter: QuickFilter) => void;
  onSelectSearchResult: (result: SearchResultItem) => void;
  onOpenAdvancedFilters?: () => void;
  onFocusChange?: (isFocused: boolean) => void;
}

export const CockpitSearchBar: React.FC<CockpitSearchBarProps> = ({
  currentCoords,
  activeFilterId,
  hasActiveAdvancedFilters = false,
  onSelectFilter,
  onSelectSearchResult,
  onOpenAdvancedFilters,
  onFocusChange,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<any>(null);

  // Búsqueda inteligente con debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const cleanQuery = query.trim();
        // Sanitización contra inyección de filtros PostgREST / Supabase
        const safeQuery = cleanQuery.replace(/[%_,()"\\]/g, ' ').trim();
        if (safeQuery.length < 2) {
          setResults([]);
          setIsSearching(false);
          return;
        }

        const combinedResults: SearchResultItem[] = [];
        const seenKeys = new Set<string>();

        // 1. Puntos en la nube (Supabase)
        try {
          const { data, error } = await supabase
            .from('locations')
            .select('id, name, latitude, longitude, category, description, address')
            .or(`name.ilike.%${safeQuery}%,address.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
            .limit(10);

          if (!error && data) {
            data.forEach((item) => {
              const key = `${item.latitude.toFixed(4)}_${item.longitude.toFixed(4)}`;
              seenKeys.add(key);
              combinedResults.push({
                ...item,
                distanceKm: currentCoords
                  ? Math.round(
                      haversine(
                        { latitude: currentCoords.latitude, longitude: currentCoords.longitude },
                        { latitude: item.latitude, longitude: item.longitude }
                      ) / 100
                    ) / 10
                  : undefined,
              });
            });
          }
        } catch (cloudErr) {
          Logger.warn('CockpitSearchBar', 'Cloud search offline', cloudErr);
        }

        // 2. Bóveda local de spots offline (Montaña y zonas rurales)
        try {
          const offlineMatches = offlineSpotVault.searchSpots(cleanQuery);
          offlineMatches.slice(0, 10).forEach((spot) => {
            const key = `${spot.latitude.toFixed(4)}_${spot.longitude.toFixed(4)}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              combinedResults.push({
                id: spot.id,
                name: spot.name,
                latitude: spot.latitude,
                longitude: spot.longitude,
                category: spot.category,
                description: spot.description,
                address: [spot.address, spot.city, spot.province].filter(Boolean).join(', '),
                distanceKm: currentCoords
                  ? Math.round(
                      haversine(
                        { latitude: currentCoords.latitude, longitude: currentCoords.longitude },
                        { latitude: spot.latitude, longitude: spot.longitude }
                      ) / 100
                    ) / 10
                  : undefined,
              });
            }
          });
        } catch (vaultErr) {}

        // 3. Geocodificador OpenStreetMap Photon (ciudades, pueblos, direcciones en toda Europa)
        if (combinedResults.length < 10) {
          try {
            const photonLat = currentCoords?.latitude || 40.4168;
            const photonLng = currentCoords?.longitude || -3.7038;
            const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&lat=${photonLat}&lon=${photonLng}&limit=6`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const geoRes = await fetch(photonUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData?.features && Array.isArray(geoData.features)) {
                geoData.features.forEach((feat: any) => {
                  const p = feat.properties;
                  const coords = feat.geometry?.coordinates;
                  if (!coords || coords.length < 2) return;
                  const lat = coords[1];
                  const lng = coords[0];
                  const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
                  if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    const placeName = p.name || cleanQuery;
                    const subtitle = [p.street, p.city || p.town || p.village, p.state, p.country]
                      .filter(Boolean)
                      .join(', ');
                    combinedResults.push({
                      id: `geo-${p.osm_id || Math.random()}`,
                      name: placeName,
                      latitude: lat,
                      longitude: lng,
                      category: (p.osm_value || 'DESTINO').toUpperCase(),
                      description: subtitle || 'Destino en carretera',
                      address: subtitle,
                      distanceKm: currentCoords
                        ? Math.round(
                            haversine(
                              { latitude: currentCoords.latitude, longitude: currentCoords.longitude },
                              { latitude: lat, longitude: lng }
                            ) / 100
                          ) / 10
                        : undefined,
                    });
                  }
                });
              }
            }
          } catch (geoErr) {
            // Geocodificación silenciosa en caso de offline
          }
        }

        // Ordenar por distancia si está disponible
        if (currentCoords) {
          combinedResults.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
        }

        setResults(combinedResults);
        setShowResults(combinedResults.length > 0);
      } catch (e) {
        Logger.error('CockpitSearchBar', 'Fallo de búsqueda', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, currentCoords]);

  const handleSelectResult = (item: SearchResultItem) => {
    Keyboard.dismiss();
    setShowResults(false);
    setQuery(item.name);
    onSelectSearchResult(item);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      {/* Barra de Búsqueda de Cabina (Glassmorphism Oscuro) */}
      <View style={styles.searchBar}>
        <Icon name="magnify" size={22} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar áreas camper, gasolineras, comida, pueblos..."
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (!showResults && text.length >= 2) setShowResults(true);
          }}
          onFocus={() => {
            if (results.length > 0) setShowResults(true);
            onFocusChange?.(true);
          }}
          onBlur={() => onFocusChange?.(false)}
          returnKeyType="search"
          autoCorrect={false}
        />
        {isSearching && (
          <ActivityIndicator size="small" color="#10B981" style={styles.loadingSpinner} />
        )}
        {query.length > 0 && !isSearching && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Resultados desplegables con diseño de tarjeta táctica */}
      {showResults && results.length > 0 && (
        <View style={styles.resultsDropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultRow}
                onPress={() => handleSelectResult(item)}
                activeOpacity={0.7}>
                <View style={styles.resultIconPod}>
                  <Icon
                    name={
                      item.category.includes('CAMP')
                        ? 'tent'
                        : item.category.includes('GAS')
                        ? 'gas-station'
                        : item.category.includes('REST')
                        ? 'silverware-fork-knife'
                        : item.category.includes('BAR')
                        ? 'glass-cocktail'
                        : 'map-marker'
                    }
                    size={18}
                    color="#10B981"
                  />
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.resultSub} numberOfLines={1}>
                    {item.address || item.category.replace(/_/g, ' ')}
                  </Text>
                </View>
                {item.distanceKm !== undefined && (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{item.distanceKm} km</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            style={{ maxHeight: 240 }}
          />
        </View>
      )}

      {/* Chips de Filtro Rápido (Desplazamiento horizontal fluido) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterContainer}>
        {onOpenAdvancedFilters && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenAdvancedFilters}
            style={[
              styles.filterChip,
              styles.advancedFilterTrigger,
              hasActiveAdvancedFilters && styles.advancedFilterTriggerActive,
            ]}>
            <Icon
              name="tune-variant"
              size={15}
              color={hasActiveAdvancedFilters ? '#FFFFFF' : '#38BDF8'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: hasActiveAdvancedFilters ? '#FFFFFF' : '#38BDF8', fontWeight: '800' },
              ]}>
              Filtros Pro
            </Text>
          </TouchableOpacity>
        )}
        {QUICK_FILTERS.map((f) => {
          const isActive = activeFilterId === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              activeOpacity={0.8}
              onPress={() => onSelectFilter(f)}
              style={[
                styles.filterChip,
                isActive && {
                  backgroundColor: f.color,
                  borderColor: f.color,
                  shadowColor: f.color,
                  shadowOpacity: 0.4,
                  elevation: 6,
                },
              ]}>
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 20,
    left: 14,
    right: 14,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  loadingSpinner: {
    marginLeft: 8,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 6,
  },
  resultsDropdown: {
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultIconPod: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  resultSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  distanceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  filterContainer: {
    marginTop: 10,
  },
  filterScroll: {
    paddingRight: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  advancedFilterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderColor: 'rgba(56, 189, 248, 0.6)',
  },
  advancedFilterTriggerActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

export default CockpitSearchBar;
