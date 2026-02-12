/**
 * ExploreScreen - Buscar y explorar locations
 * CamperSites Pro - YRYS
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
  has_water: boolean;
  has_electricity: boolean;
  price: number | null;
  description: string;
}

const CATEGORIES = [
  { key: 'ALL', label: 'Todos', icon: 'map-marker-multiple' },
  { key: 'CAMPING', label: 'Campings', icon: 'tent' },
  { key: 'PARKING_PERMITIDO', label: 'Parkings', icon: 'parking' },
  { key: 'AREA_DESCANSO', label: 'Descanso', icon: 'bench' },
  { key: 'AREA_SERVICIOS', label: 'Servicios', icon: 'water-pump' },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'CAMPING': return 'tent';
    case 'PARKING_PERMITIDO': return 'parking';
    case 'AREA_DESCANSO': return 'bench';
    case 'AREA_SERVICIOS': return 'water-pump';
    default: return 'map-marker';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'CAMPING': return theme.colors.primary.main;
    case 'PARKING_PERMITIDO': return theme.colors.accent.sky;
    case 'AREA_DESCANSO': return theme.colors.secondary.main;
    case 'AREA_SERVICIOS': return theme.colors.accent.mountain;
    default: return theme.colors.text.secondary;
  }
};

export default function ExploreScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      let query = supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true })
        .limit(500);

      if (selectedCategory !== 'ALL') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      setLocations(data || []);
      setFilteredLocations(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredLocations(
        locations.filter(
          loc =>
            loc.name.toLowerCase().includes(q) ||
            loc.city.toLowerCase().includes(q) ||
            loc.province.toLowerCase().includes(q),
        ),
      );
    }
  }, [searchQuery, locations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations();
  };

  const renderLocationCard = ({ item }: { item: Location }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryColor(item.category) + '20' },
          ]}>
          <Icon
            name={getCategoryIcon(item.category)}
            size={18}
            color={getCategoryColor(item.category)}
          />
          <Text
            style={[
              styles.categoryText,
              { color: getCategoryColor(item.category) },
            ]}>
            {item.category.replace('_', ' ')}
          </Text>
        </View>
        {item.price !== null && item.price > 0 && (
          <Text style={styles.priceText}>{item.price}€</Text>
        )}
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.name}
      </Text>

      {(item.city || item.province) && (
        <View style={styles.locationRow}>
          <Icon name="map-marker" size={14} color={theme.colors.text.secondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {[item.city, item.province].filter(Boolean).join(', ')}
          </Text>
        </View>
      )}

      <View style={styles.amenities}>
        {item.has_water && (
          <View style={styles.amenityBadge}>
            <Icon name="water" size={14} color={theme.colors.accent.sky} />
            <Text style={styles.amenityText}>Agua</Text>
          </View>
        )}
        {item.has_electricity && (
          <View style={styles.amenityBadge}>
            <Icon name="flash" size={14} color={theme.colors.secondary.main} />
            <Text style={styles.amenityText}>Luz</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorar</Text>
        <Text style={styles.headerSubtitle}>
          {filteredLocations.length} lugares encontrados
        </Text>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={22} color={theme.colors.text.hint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, ciudad o provincia..."
          placeholderTextColor={theme.colors.text.hint}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={theme.colors.text.hint} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros de categoría */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.key && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item.key)}>
              <Icon
                name={item.icon}
                size={16}
                color={
                  selectedCategory === item.key
                    ? '#FFFFFF'
                    : theme.colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item.key && styles.categoryChipTextActive,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

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
                Prueba con otro término de búsqueda
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...theme.shadows.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginLeft: 10,
    padding: 0,
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.text.disabled,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary.main,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  amenities: {
    flexDirection: 'row',
    gap: 8,
  },
  amenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  amenityText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
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
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
});
