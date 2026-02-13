/**
 * ExploreScreen - Buscar y explorar locations
 * CamperSites Pro - YRYS
 *
 * 30+ categorías organizadas por secciones
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SectionList,
  ScrollView,
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
// TODAS LAS CATEGORÍAS ORGANIZADAS
// ============================================
const CATEGORY_SECTIONS = [
  {
    title: 'Alojamiento',
    icon: 'bed',
    categories: [
      { key: 'CAMPING', label: 'Campings', icon: 'tent', color: '#2D5016' },
      { key: 'PARKING_PERMITIDO', label: 'Parkings', icon: 'parking', color: '#1976D2' },
      { key: 'AREA_DESCANSO', label: 'Descanso', icon: 'bench', color: '#E67E22' },
      { key: 'AREA_SERVICIOS', label: 'Servicios', icon: 'water-pump', color: '#8E44AD' },
    ],
  },
  {
    title: 'Naturaleza',
    icon: 'pine-tree',
    categories: [
      { key: 'MIRADOR', label: 'Miradores', icon: 'binoculars', color: '#27AE60' },
      { key: 'PLAYA', label: 'Playas', icon: 'beach', color: '#3498DB' },
      { key: 'MONTANA', label: 'Montañas', icon: 'image-filter-hdr', color: '#795548' },
      { key: 'LAGO', label: 'Lagos', icon: 'waves', color: '#0097A7' },
      { key: 'CASCADA', label: 'Cascadas', icon: 'waterfall', color: '#00BCD4' },
    ],
  },
  {
    title: 'Servicios Camper',
    icon: 'rv-truck',
    categories: [
      { key: 'LAVADERO_COCHES', label: 'Lavaderos', icon: 'car-wash', color: '#607D8B' },
      { key: 'GASOLINERA_GLP', label: 'GLP/Autogas', icon: 'gas-station', color: '#F44336' },
      { key: 'LAVANDERIA', label: 'Lavanderías', icon: 'tshirt-crew', color: '#9C27B0' },
    ],
  },
  {
    title: 'Alimentación',
    icon: 'food',
    categories: [
      { key: 'SUPERMERCADO', label: 'Supermercados', icon: 'cart', color: '#4CAF50' },
      { key: 'RESTAURANTE', label: 'Restaurantes', icon: 'silverware-fork-knife', color: '#FF9800' },
      { key: 'FARMACIA', label: 'Farmacias', icon: 'medical-bag', color: '#F44336' },
    ],
  },
];

// Flat list para el filtro horizontal
const ALL_CATEGORIES = [
  { key: 'ALL', label: 'Todos', icon: 'map-marker-multiple', color: '#333' },
  ...CATEGORY_SECTIONS.flatMap(s => s.categories),
];

const getCategoryConfig = (category: string) => {
  for (const section of CATEGORY_SECTIONS) {
    const found = section.categories.find(c => c.key === category);
    if (found) return found;
  }
  return { key: category, label: category, icon: 'map-marker', color: '#999' };
};

export default function ExploreScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLocations = useCallback(async () => {
    try {
      let query = supabase
        .from('locations')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .limit(200);

      if (selectedCategory !== 'ALL') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim();
        query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,province.ilike.%${q}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      setLocations(data || []);
      setFilteredLocations(data || []);
      setTotalCount(count || data?.length || 0);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchLocations();
    }, searchQuery.length > 0 ? 500 : 0); // Debounce búsqueda

    return () => clearTimeout(timer);
  }, [fetchLocations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations();
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
        <Icon
          name={item.icon}
          size={15}
          color={isActive ? '#FFFFFF' : item.color}
        />
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

  const renderLocationCard = ({ item }: { item: Location }) => {
    const config = getCategoryConfig(item.category);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: config.color + '18' },
            ]}>
            <Icon name={config.icon} size={16} color={config.color} />
            <Text style={[styles.categoryBadgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {item.country ? (
              <Text style={styles.countryBadge}>{item.country}</Text>
            ) : null}
            {item.price !== null && item.price > 0 && (
              <Text style={styles.priceText}>{item.price}€</Text>
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
            <Icon name="map-marker" size={14} color={theme.colors.text.secondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {[item.city, item.province].filter(Boolean).join(', ')}
            </Text>
          </View>
        ) : null}

        <View style={styles.amenities}>
          {item.has_water && (
            <View style={[styles.amenityBadge, { backgroundColor: '#E3F2FD' }]}>
              <Icon name="water" size={13} color="#1976D2" />
              <Text style={[styles.amenityText, { color: '#1976D2' }]}>Agua</Text>
            </View>
          )}
          {item.has_electricity && (
            <View style={[styles.amenityBadge, { backgroundColor: '#FFF3E0' }]}>
              <Icon name="flash" size={13} color="#E67E22" />
              <Text style={[styles.amenityText, { color: '#E67E22' }]}>Luz</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryGrid = () => (
    <View style={styles.categoryGridContainer}>
      {CATEGORY_SECTIONS.map(section => (
        <View key={section.title} style={styles.gridSection}>
          <View style={styles.gridSectionHeader}>
            <Icon name={section.icon} size={18} color={theme.colors.text.secondary} />
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
                  <Icon
                    name={cat.icon}
                    size={22}
                    color={isActive ? '#FFF' : cat.color}
                  />
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
        <Icon name="map-marker-multiple" size={18} color={theme.colors.primary.main} />
        <Text style={styles.showAllText}>Ver todos</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorar</Text>
        <Text style={styles.headerSubtitle}>
          {totalCount > 200 ? `${totalCount}+ lugares` : `${filteredLocations.length} lugares`}
          {selectedCategory !== 'ALL' ? ` · ${getCategoryConfig(selectedCategory).label}` : ''}
        </Text>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={22} color={theme.colors.text.hint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, ciudad..."
          placeholderTextColor={theme.colors.text.hint}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={theme.colors.text.hint} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowCategoryGrid(!showCategoryGrid)}>
          <Icon
            name={showCategoryGrid ? 'close' : 'tune-variant'}
            size={20}
            color={selectedCategory !== 'ALL' ? theme.colors.primary.main : theme.colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      {/* Filtros de categoría - Horizontal chips */}
      {!showCategoryGrid && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesList}>
          {ALL_CATEGORIES.slice(0, 8).map(renderCategoryChip)}
          <TouchableOpacity
            style={styles.moreChip}
            onPress={() => setShowCategoryGrid(true)}>
            <Icon name="dots-horizontal" size={18} color={theme.colors.text.secondary} />
            <Text style={styles.moreChipText}>Más</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Grid de categorías expandido */}
      {showCategoryGrid && (
        <ScrollView style={styles.categoryGridScroll} nestedScrollEnabled>
          {renderCategoryGrid()}
        </ScrollView>
      )}

      {/* Lista de locations */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Cargando lugares...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLocations}
          keyExtractor={item => item.id}
          renderItem={renderLocationCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
              <Icon name="map-search" size={64} color={theme.colors.text.disabled} />
              <Text style={styles.emptyText}>No se encontraron lugares</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.length > 0
                  ? 'Prueba con otro término de búsqueda'
                  : 'Aún no hay datos para esta categoría.\nEjecuta el scraper para obtener datos.'}
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
    backgroundColor: theme.colors.background.light,
  },
  header: {
    backgroundColor: theme.colors.primary.main,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...theme.shadows.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.primary,
    marginLeft: 8,
    padding: 0,
  },
  filterButton: {
    marginLeft: 8,
    padding: 4,
  },
  categoriesScroll: {
    marginTop: 12,
    maxHeight: 44,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  moreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  moreChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  // Category Grid
  categoryGridScroll: {
    maxHeight: 340,
    marginTop: 8,
  },
  categoryGridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  gridSection: {
    marginBottom: 12,
  },
  gridSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  gridSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.secondary,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    minWidth: 100,
  },
  gridItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  showAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary.main,
  },
  // Cards
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  countryBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.hint,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  priceText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primary.main,
  },
  freeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  amenities: {
    flexDirection: 'row',
    gap: 6,
  },
  amenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  amenityText: {
    fontSize: 11,
    fontWeight: '600',
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
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
