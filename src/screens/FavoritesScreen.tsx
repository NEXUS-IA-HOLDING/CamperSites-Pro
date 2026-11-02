/**
 * FavoritesScreen - Lugares favoritos del usuario y lista de deseos nómade
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
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { AdvancedFavorites } from '../features/premium';

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
  description?: string;
}

// Lugares legendarios sugeridos para cuando la lista de favoritos esté vacía
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
    name: 'Parking Mirador Picos de Europa (Sotres)',
    latitude: 43.2312,
    longitude: -4.7523,
    category: 'PARKING_PERMITIDO',
    city: 'Cabrales',
    province: 'Asturias',
    has_water: true,
    has_electricity: false,
    price: 0,
    description: 'Vistas panorámicas hacia el Naranjo de Bulnes y pistas de senderismo.',
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
    id: 'spot_cazorla_rec',
    name: 'Área Ecológica Parque Natural Cazorla',
    latitude: 37.9123,
    longitude: -2.9984,
    category: 'AREA_SERVICIOS',
    city: 'Cazorla',
    province: 'Jaén',
    has_water: true,
    has_electricity: true,
    price: 12,
    description: 'Punto de recarga de agua limpia y vaciado rodeado de pinos centenarios.',
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'CAMPING': return 'tent';
    case 'PARKING_PERMITIDO': return 'parking';
    case 'AREA_DESCANSO': return 'bench';
    case 'AREA_SERVICIOS': return 'water-pump';
    case 'PUNTO_PERSONALIZADO':
    case 'FAVORITO': return 'crosshairs-gps';
    default: return 'map-marker';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'CAMPING': return '#10B981';
    case 'PARKING_PERMITIDO': return '#38BDF8';
    case 'AREA_DESCANSO': return '#F59E0B';
    case 'AREA_SERVICIOS': return '#818CF8';
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
  const [viewMode, setViewMode] = useState<'list' | 'folders'>('list');

  const handleSelectFavorite = async (item: Location) => {
    try {
      await AsyncStorage.setItem('@campersites_jump_to_location', JSON.stringify(item));
      navigation.navigate('Mapa' as never);
    } catch {}
  };

  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      const ids: string[] = stored ? JSON.parse(stored) : [];
      setFavoriteIds(ids);

      if (ids.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Buscar en Supabase
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .in('id', ids);

      let loadedList: Location[] = data || [];

      // Cargar también puntos personalizados marcados por el usuario
      try {
        const customStored = await AsyncStorage.getItem('@campersites_custom_locations');
        if (customStored) {
          const customLocs: Location[] = JSON.parse(customStored);
          const customMatches = customLocs.filter(c => ids.includes(c.id));
          // Evitar duplicados por id
          const existingIds = new Set(loadedList.map(l => l.id));
          customMatches.forEach(cm => {
            if (!existingIds.has(cm.id)) {
              loadedList.push(cm);
            }
          });
        }
      } catch (customErr) {
        console.warn('Error reading custom locations for favorites:', customErr);
      }

      if (loadedList.length === 0) {
        // Fallback a los recomendados que coincidan
        const localMatches = CURATED_RECOMMENDED_SPOTS.filter(s => ids.includes(s.id));
        setFavorites(localMatches);
      } else {
        setFavorites(loadedList);
      }
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const addCuratedToFavorites = async (item: Location) => {
    try {
      const newIds = [...favoriteIds, item.id];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newIds));
      setFavoriteIds(newIds);
      setFavorites(prev => [item, ...prev]);
      Alert.alert('¡Añadido a Favoritos!', `"${item.name}" guardado para tus próximas rutas.`);
    } catch (err) {
      console.error('Error adding curated to favorites:', err);
    }
  };

  const removeFavorite = async (locationId: string) => {
    try {
      const newIds = favoriteIds.filter(id => id !== locationId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newIds));
      setFavoriteIds(newIds);
      setFavorites(prev => prev.filter(loc => loc.id !== locationId));

      // Limpiar también de ubicaciones personalizadas si existía allí
      try {
        const customStored = await AsyncStorage.getItem('@campersites_custom_locations');
        if (customStored) {
          const customLocs: Location[] = JSON.parse(customStored);
          const updatedCustom = customLocs.filter(c => c.id !== locationId);
          await AsyncStorage.setItem('@campersites_custom_locations', JSON.stringify(updatedCustom));
        }
      } catch {}
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const renderFavoriteCard = ({ item }: { item: Location }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => handleSelectFavorite(item)}>
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
              {[item.city, item.province].filter(Boolean).join(', ')}
            </Text>
          )}
          <View style={styles.cardTags}>
            {item.has_water && (
              <View style={styles.tag}>
                <Icon name="water" size={12} color="#38BDF8" />
                <Text style={styles.tagText}>Agua</Text>
              </View>
            )}
            {item.has_electricity && (
              <View style={styles.tag}>
                <Icon name="flash" size={12} color="#FBBF24" />
                <Text style={styles.tagText}>220V</Text>
              </View>
            )}
            {item.price !== null && item.price !== undefined && (
              <View style={[styles.tag, item.price === 0 && styles.freeTag]}>
                <Text style={[styles.tagText, item.price === 0 && styles.freeTagText]}>
                  {item.price === 0 ? 'Gratis' : `${item.price}€`}
                </Text>
              </View>
            )}
            <View style={[styles.tag, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Icon name="navigation-variant" size={11} color="#38BDF8" />
              <Text style={[styles.tagText, { color: '#38BDF8', fontWeight: '700' }]}>Ver en Mapa</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFavorite(item.id)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="heart" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Marca de agua elegante del logo en el fondo */}
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.backgroundCenteredLogo}
        resizeMode="contain"
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Mis Favoritos</Text>
          <View style={styles.countBadge}>
            <Icon name="heart" size={14} color="#EF4444" />
            <Text style={styles.countText}>{favorites.length}</Text>
          </View>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}>
            <Icon
              name="format-list-bulleted"
              size={16}
              color={viewMode === 'list' ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
              Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'folders' && styles.toggleBtnActive]}
            onPress={() => setViewMode('folders')}>
            <Icon
              name="folder-star"
              size={16}
              color={viewMode === 'folders' ? '#0F172A' : '#94A3B8'}
            />
            <Text style={[styles.toggleBtnText, viewMode === 'folders' && styles.toggleBtnTextActive]}>
              Carpetas Pro
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'folders' ? (
        <AdvancedFavorites />
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : favorites.length === 0 ? (
        // Estado inicial enriquecido con recomendaciones reales (NUNCA SOSO)
        <FlatList
          ListHeaderComponent={
            <View style={styles.emptyHeader}>
              <View style={styles.emptyIconContainer}>
                <Icon name="heart-pulse" size={44} color="#38BDF8" />
              </View>
              <Text style={styles.emptyTitle}>Tu lista de favoritos está esperando</Text>
              <Text style={styles.emptySubtitle}>
                Guarda tus áreas preferidas con el corazón. Te sugerimos estos 4 destinos top para empezar:
              </Text>
            </View>
          }
          data={CURATED_RECOMMENDED_SPOTS}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.recommendedCard}>
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
                    {[item.city, item.province].filter(Boolean).join(', ')}
                  </Text>
                  <Text style={styles.recDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.addCuratedButton}
                  onPress={() => addCuratedToFavorites(item)}
                  activeOpacity={0.8}>
                  <Icon name="heart-plus" size={20} color="#38BDF8" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    backgroundColor: '#0F172A',
  },
  backgroundCenteredLogo: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    alignSelf: 'center',
    top: '5%',
    opacity: 0.06,
  },
  header: {
    backgroundColor: '#1E293B',
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#38BDF8',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  toggleBtnTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recommendedCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardLocation: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  recDesc: {
    fontSize: 11,
    color: '#38BDF8',
    marginTop: 3,
  },
  cardTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagText: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  freeTag: {
    backgroundColor: '#065F46',
    borderColor: '#059669',
  },
  freeTagText: {
    color: '#34D399',
    fontWeight: '800',
  },
  removeButton: {
    padding: 8,
  },
  addCuratedButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
