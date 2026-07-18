/**
 * ExploreScreen - Buscar y explorar locations
 * CamperSites Pro - YRYS
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { CamperSitesTheme as theme } from '../theme';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  address: string;
  city: string;
  province: string;
  country: string;
  has_water: boolean;
  has_electricity: boolean;
  price: number | null;
  description: string;
}

// ============================================
// CATEGORÍAS CON EMOJIS NATIVOS (alta calidad)
// ============================================
const CATEGORY_SECTIONS = [
  {
    title: 'Alojamiento',
    emoji: '🏕️',
    categories: [
      { key: 'CAMPING', label: 'Campings', emoji: '⛺', icon: 'tent', color: '#2D5016' },
      { key: 'PARKING_PERMITIDO', label: 'Parkings', emoji: '🅿️', icon: 'parking', color: '#1976D2' },
      { key: 'AREA_DESCANSO', label: 'Descanso', emoji: '🛋️', icon: 'bench', color: '#E67E22' },
      { key: 'AREA_SERVICIOS', label: 'Servicios', emoji: '🚿', icon: 'water-pump', color: '#8E44AD' },
    ],
  },
  {
    title: 'Naturaleza',
    emoji: '🌲',
    categories: [
      { key: 'MIRADOR', label: 'Miradores', emoji: '🏔️', icon: 'binoculars', color: '#27AE60' },
      { key: 'PLAYA', label: 'Playas', emoji: '🏖️', icon: 'beach', color: '#3498DB' },
      { key: 'MONTANA', label: 'Montañas', emoji: '⛰️', icon: 'image-filter-hdr', color: '#795548' },
      { key: 'LAGO', label: 'Lagos', emoji: '🌊', icon: 'waves', color: '#0097A7' },
      { key: 'CASCADA', label: 'Cascadas', emoji: '💧', icon: 'waterfall', color: '#00BCD4' },
    ],
  },
  {
    title: 'Servicios Camper',
    emoji: '🚐',
    categories: [
      { key: 'LAVADERO_COCHES', label: 'Lavaderos', emoji: '🧽', icon: 'car-wash', color: '#607D8B' },
      { key: 'GASOLINERA_GLP', label: 'GLP/Autogas', emoji: '⛽', icon: 'gas-station', color: '#F44336' },
      { key: 'LAVANDERIA', label: 'Lavanderías', emoji: '👕', icon: 'tshirt-crew', color: '#9C27B0' },
    ],
  },
  {
    title: 'Alimentación',
    emoji: '🍽️',
    categories: [
      { key: 'SUPERMERCADO', label: 'Supermercados', emoji: '🛒', icon: 'cart', color: '#4CAF50' },
      { key: 'RESTAURANTE', label: 'Restaurantes', emoji: '🍴', icon: 'silverware-fork-knife', color: '#FF9800' },
      { key: 'FARMACIA', label: 'Farmacias', emoji: '💊', icon: 'medical-bag', color: '#F44336' },
    ],
  },
];

const ALL_CATEGORIES = [
  { key: 'ALL', label: 'Todos', emoji: '📍', icon: 'map-marker-multiple', color: '#333' },
  ...CATEGORY_SECTIONS.flatMap(s => s.categories),
];

const getCategoryConfig = (category: string) => {
  for (const section of CATEGORY_SECTIONS) {
    const found = section.categories.find(c => c.key === category);
    if (found) return found;
  }
  return { key: category, label: category, emoji: '📍', icon: 'map-marker', color: '#999' };
};

export default function ExploreScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Ref para evitar race conditions en búsqueda
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchLocations = useCallback(async (query: string, category: string) => {
    try {
      let q = supabase
        .from('locations')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .limit(200);

      if (category !== 'ALL') {
        q = q.eq('category', category);
      }

      if (query.trim().length > 0) {
        // Sanitizar: eliminar caracteres especiales de iLIKE y limitar longitud
        const search = query.trim().replace(/[%_\\'"]/g, '').substring(0, 100);
        if (search.length > 0) {
          q = q.or(`name.ilike.%${search}%,city.ilike.%${search}%,province.ilike.%${search}%`);
        }
      }

      const { data, error, count } = await q;

      if (!isMountedRef.current) return;

      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      setLocations(data || []);
      setTotalCount(count || data?.length || 0);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (searchQuery.length === 0) {
      // Sin búsqueda → fetch inmediato
      setLoading(true);
      fetchLocations('', selectedCategory);
    } else {
      // Con búsqueda → debounce 600ms
      setLoading(true);
      searchTimerRef.current = setTimeout(() => {
        fetchLocations(searchQuery, selectedCategory);
      }, 600);
    }

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, selectedCategory, fetchLocations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations(searchQuery, selectedCategory);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const renderCategoryChip = (item: typeof ALL_CATEGORIES[0]) => {
    const isActive = selectedCategory === item.key;
    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.categoryChip,
          isActive && { backgroundColor: item.color, borderColor: item.color },
        ]}
        onPress={() => {
          setSelectedCategory(item.key);
          setShowCategoryGrid(false);
        }}>
        <Text style={styles.chipEmoji}>{item.emoji}</Text>
        <Text
          style={[
            styles.categoryChipText,
            isActive && styles.categoryChipTextActive,
          ]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Memoizar renderLocationCard para evitar recreación en cada render de FlatList
  const renderLocationCard = useCallback(({ item }: { item: Location }) => {
    const config = getCategoryConfig(item.category);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        {/* Barra de color superior */}
        <View style={[styles.cardColorBar, { backgroundColor: config.color }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: config.color + '12' }]}>
              <Text style={styles.badgeEmoji}>{config.emoji}</Text>
              <Text style={[styles.categoryBadgeText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
            <View style={styles.cardHeaderRight}>
              {item.price !== null && item.price > 0 && (
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>{item.price}€</Text>
                </View>
              )}
              {item.price === 0 && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeText}>GRATIS</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>

          {(item.city || item.province) ? (
            <View style={styles.locationRow}>
              <Text style={styles.locationEmoji}>📍</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {[item.city, item.province, item.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}

          <View style={styles.amenities}>
            {item.has_water && (
              <View style={styles.amenityBadge}>
                <Text style={styles.amenityEmoji}>💧</Text>
                <Text style={styles.amenityText}>Agua</Text>
              </View>
            )}
            {item.has_electricity && (
              <View style={[styles.amenityBadge, styles.amenityElectric]}>
                <Text style={styles.amenityEmoji}>⚡</Text>
                <Text style={styles.amenityText}>Luz</Text>
              </View>
            )}
            {item.description && item.description.toLowerCase().includes('wifi') && (
              <View style={[styles.amenityBadge, styles.amenityWifi]}>
                <Text style={styles.amenityEmoji}>📶</Text>
                <Text style={styles.amenityText}>WiFi</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderCategoryGrid = () => (
    <View style={styles.categoryGridContainer}>
      {CATEGORY_SECTIONS.map(section => (
        <View key={section.title} style={styles.gridSection}>
          <View style={styles.gridSectionHeader}>
            <Text style={styles.gridSectionEmoji}>{section.emoji}</Text>
            <Text style={styles.gridSectionTitle}>{section.title}</Text>
          </View>
          <View style={styles.gridRow}>
            {section.categories.map(cat => {
              const isActive = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.gridItem,
                    isActive && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.key);
                    setShowCategoryGrid(false);
                  }}>
                  <Text style={styles.gridItemEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.gridItemText,
                      isActive && { color: '#FFF' },
                    ]}
                    numberOfLines={1}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <TouchableOpacity
        style={styles.showAllButton}
        onPress={() => {
          setSelectedCategory('ALL');
          setShowCategoryGrid(false);
        }}>
        <Text style={styles.showAllEmoji}>📍</Text>
        <Text style={styles.showAllText}>Ver todos</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header con gradiente visual */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Explorar</Text>
          <Text style={styles.headerSubtitle}>
            {totalCount > 200 ? `${totalCount.toLocaleString()}+ lugares` : `${locations.length} lugares`}
            {selectedCategory !== 'ALL' ? ` · ${getCategoryConfig(selectedCategory).emoji} ${getCategoryConfig(selectedCategory).label}` : ''}
          </Text>
        </View>
      </View>

      {/* Barra de búsqueda mejorada */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchEmoji}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, ciudad, provincia..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Icon name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showCategoryGrid && styles.filterButtonActive]}
          onPress={() => setShowCategoryGrid(!showCategoryGrid)}>
          <Icon
            name={showCategoryGrid ? 'close' : 'tune-variant'}
            size={20}
            color={showCategoryGrid ? '#FFF' : (selectedCategory !== 'ALL' ? theme.colors.primary.main : '#666')}
          />
        </TouchableOpacity>
      </View>

      {/* Filtros horizontal */}
      {!showCategoryGrid && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesList}
          keyboardShouldPersistTaps="handled">
          {ALL_CATEGORIES.slice(0, 8).map(renderCategoryChip)}
          <TouchableOpacity
            style={styles.moreChip}
            onPress={() => setShowCategoryGrid(true)}>
            <Text style={styles.moreChipEmoji}>➕</Text>
            <Text style={styles.moreChipText}>Más</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Grid de categorías expandido */}
      {showCategoryGrid && (
        <ScrollView style={styles.categoryGridScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {renderCategoryGrid()}
        </ScrollView>
      )}

      {/* Lista de locations */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Buscando lugares...</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={item => item.id}
          renderItem={renderLocationCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary.main]}
              tintColor={theme.colors.primary.main}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyText}>No se encontraron lugares</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.length > 0
                  ? 'Prueba con otro término de búsqueda'
                  : 'No hay datos para esta categoría'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  // Header
  header: {
    backgroundColor: theme.colors.primary.main,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {},
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: -18,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  searchEmoji: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    marginLeft: 10,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary.main,
  },
  // Categories
  categoriesScroll: {
    marginTop: 14,
    maxHeight: 48,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  chipEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  moreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 5,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  moreChipEmoji: {
    fontSize: 14,
  },
  moreChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  // Category Grid
  categoryGridScroll: {
    maxHeight: 360,
    marginTop: 10,
  },
  categoryGridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  gridSection: {
    marginBottom: 14,
  },
  gridSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  gridSectionEmoji: {
    fontSize: 18,
  },
  gridSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    minWidth: 110,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  gridItemEmoji: {
    fontSize: 20,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  showAllEmoji: {
    fontSize: 16,
  },
  showAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary.main,
  },
  // Cards
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardColorBar: {
    height: 4,
  },
  cardBody: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E7D32',
  },
  freeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  locationEmoji: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#777',
    flex: 1,
  },
  amenities: {
    flexDirection: 'row',
    gap: 8,
  },
  amenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  amenityElectric: {
    backgroundColor: '#FFF8E1',
  },
  amenityWifi: {
    backgroundColor: '#F3E5F5',
  },
  amenityEmoji: {
    fontSize: 13,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  // Loading / Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
});
