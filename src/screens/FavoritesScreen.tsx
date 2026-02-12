/**
 * FavoritesScreen - Lugares favoritos del usuario
 * CamperSites Pro - YRYS
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { CamperSitesTheme as theme } from '../theme';

const FAVORITES_KEY = '@campersites_favorites';

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
}

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

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Location[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    try {
      // Cargar IDs de favoritos de AsyncStorage
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      const ids: string[] = stored ? JSON.parse(stored) : [];
      setFavoriteIds(ids);

      if (ids.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Buscar las locations en Supabase
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .in('id', ids);

      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }

      setFavorites(data || []);
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const removeFavorite = async (locationId: string) => {
    try {
      const newIds = favoriteIds.filter(id => id !== locationId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newIds));
      setFavoriteIds(newIds);
      setFavorites(prev => prev.filter(loc => loc.id !== locationId));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const renderFavoriteCard = ({ item }: { item: Location }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getCategoryColor(item.category) + '15' },
          ]}>
          <Icon
            name={getCategoryIcon(item.category)}
            size={28}
            color={getCategoryColor(item.category)}
          />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          {(item.city || item.province) && (
            <Text style={styles.cardLocation} numberOfLines={1}>
              {[item.city, item.province].filter(Boolean).join(', ')}
            </Text>
          )}
          <View style={styles.cardTags}>
            {item.has_water && (
              <View style={styles.tag}>
                <Icon name="water" size={12} color={theme.colors.accent.sky} />
                <Text style={styles.tagText}>Agua</Text>
              </View>
            )}
            {item.has_electricity && (
              <View style={styles.tag}>
                <Icon name="flash" size={12} color={theme.colors.secondary.main} />
                <Text style={styles.tagText}>Luz</Text>
              </View>
            )}
            {item.price !== null && item.price > 0 && (
              <View style={styles.tag}>
                <Icon name="currency-eur" size={12} color={theme.colors.primary.main} />
                <Text style={styles.tagText}>{item.price}€</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFavorite(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="heart" size={24} color={theme.colors.alerts.radar} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoritos</Text>
        <View style={styles.countBadge}>
          <Icon name="heart" size={16} color="#FFFFFF" />
          <Text style={styles.countText}>{favorites.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="heart-outline" size={80} color={theme.colors.text.disabled} />
          </View>
          <Text style={styles.emptyTitle}>Sin favoritos aún</Text>
          <Text style={styles.emptySubtitle}>
            Explora el mapa y guarda tus lugares preferidos tocando el corazón
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={item => item.id}
          renderItem={renderFavoriteCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  countText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    ...theme.shadows.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  cardLocation: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  cardTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  tagText: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  removeButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.background.paper,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
