/**
 * CockpitQuickWaypointModal.tsx
 * Asistente de Paradas Rápidas en Ruta para el Copiloto Camper
 * CamperSites Pro - Cero Distracciones al Volante
 */

import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import haversine from 'haversine-distance';
import { offlineSpotVault, OfflineSpot } from '../services/OfflineSpotVaultService';

export type QuickWaypointCategory = 'glp' | 'water' | 'supermarket' | 'rest_area';

export interface QuickWaypointItem {
  id: string;
  name: string;
  category: QuickWaypointCategory;
  categoryLabel: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
  address?: string;
  pricePerUnit?: string;
  badge?: string;
}

interface CockpitQuickWaypointModalProps {
  visible: boolean;
  currentCoords: [number, number]; // [lng, lat]
  onSelectWaypoint: (point: { name: string; latitude: number; longitude: number; category: string }) => void;
  onClose: () => void;
}

export const CockpitQuickWaypointModal: React.FC<CockpitQuickWaypointModalProps> = ({
  visible,
  currentCoords,
  onSelectWaypoint,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<QuickWaypointCategory>('glp');

  const userLat = currentCoords[1];
  const userLng = currentCoords[0];

  const nearbyItems = useMemo<QuickWaypointItem[]>(() => {
    if (!visible) return [];
    const allSpots = offlineSpotVault.getAllSpots();
    const userPoint = { latitude: userLat, longitude: userLng };

    const results: QuickWaypointItem[] = [];

    // 1. Filtrar según la categoría solicitada
    for (const spot of allSpots) {
      const spotPoint = { latitude: spot.latitude, longitude: spot.longitude };
      const distM = haversine(userPoint, spotPoint);
      const distKm = Math.round((distM / 1000) * 10) / 10;

      // Filtrado por categoría
      if (activeCategory === 'water') {
        if (spot.has_water || spot.category.includes('VACIADO') || spot.category.includes('AREA')) {
          results.push({
            id: spot.id,
            name: spot.name,
            category: 'water',
            categoryLabel: '💧 Agua & Vaciado',
            distanceKm: distKm,
            latitude: spot.latitude,
            longitude: spot.longitude,
            address: spot.address || `${spot.city || 'En ruta'}, ${spot.province || ''}`,
            badge: spot.has_water ? 'Agua Potable' : 'Vaciado Gratis',
          });
        }
      } else if (activeCategory === 'glp') {
        if (spot.category.includes('GLP') || spot.category.includes('GASOLINERA') || spot.category.includes('SERVICIOS')) {
          results.push({
            id: spot.id,
            name: spot.name,
            category: 'glp',
            categoryLabel: '⛽ GLP Autogas',
            distanceKm: distKm,
            latitude: spot.latitude,
            longitude: spot.longitude,
            address: spot.address || `${spot.city || 'En ruta'}, ${spot.province || ''}`,
            pricePerUnit: '0,94 €/L',
            badge: 'Surtidor Truma GLP',
          });
        }
      } else if (activeCategory === 'supermarket') {
        if (spot.suitable_for_large_vehicles || spot.category.includes('PARKING') || spot.name.toLowerCase().includes('comercial')) {
          results.push({
            id: spot.id,
            name: spot.name.includes('Área') ? `Centro Comercial & Parking (${spot.city || 'Camper'})` : spot.name,
            category: 'supermarket',
            categoryLabel: '🛒 Súper / Parking Alto',
            distanceKm: distKm,
            latitude: spot.latitude,
            longitude: spot.longitude,
            address: spot.address || `${spot.city || 'En ruta'}`,
            badge: 'Gálibo > 3.2m',
          });
        }
      } else if (activeCategory === 'rest_area') {
        if (spot.category.includes('PERNOCTA') || spot.category.includes('AREA') || spot.category.includes('CAMPING')) {
          results.push({
            id: spot.id,
            name: spot.name,
            category: 'rest_area',
            categoryLabel: '🅿️ Área Segura',
            distanceKm: distKm,
            latitude: spot.latitude,
            longitude: spot.longitude,
            address: spot.address || `${spot.city || 'En ruta'}`,
            pricePerUnit: spot.price && spot.price > 0 ? `${spot.price}€/noche` : 'Gratis',
            badge: 'Pernocta Legal',
          });
        }
      }
    }

    // Ordenar de más cercano a más lejano
    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results.slice(0, 15);
  }, [visible, activeCategory, userLat, userLng]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Cabecera */}
          <View style={styles.headerRow}>
            <View style={styles.headerIconBox}>
              <Icon name="map-marker-plus-outline" size={24} color="#38BDF8" />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.headerTitle}>Paradas Rápidas en Ruta</Text>
              <Text style={styles.headerSubtitle}>
                Añade puntos estratégicos a tu trayecto en 1 toque
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Selector de Categorías de Parada Urgente */}
          <View style={styles.categoryTabsRow}>
            <TouchableOpacity
              style={[styles.categoryTab, activeCategory === 'glp' && styles.categoryTabActive]}
              onPress={() => setActiveCategory('glp')}
              activeOpacity={0.8}>
              <Icon name="gas-cylinder" size={16} color={activeCategory === 'glp' ? '#38BDF8' : '#94A3B8'} />
              <Text style={[styles.categoryTabText, activeCategory === 'glp' && styles.categoryTabTextActive]}>
                ⛽ GLP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTab, activeCategory === 'water' && styles.categoryTabActive]}
              onPress={() => setActiveCategory('water')}
              activeOpacity={0.8}>
              <Icon name="water-pump" size={16} color={activeCategory === 'water' ? '#38BDF8' : '#94A3B8'} />
              <Text style={[styles.categoryTabText, activeCategory === 'water' && styles.categoryTabTextActive]}>
                💧 Agua / Vaciado
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTab, activeCategory === 'supermarket' && styles.categoryTabActive]}
              onPress={() => setActiveCategory('supermarket')}
              activeOpacity={0.8}>
              <Icon name="cart-outline" size={16} color={activeCategory === 'supermarket' ? '#38BDF8' : '#94A3B8'} />
              <Text style={[styles.categoryTabText, activeCategory === 'supermarket' && styles.categoryTabTextActive]}>
                🛒 Súper Alto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTab, activeCategory === 'rest_area' && styles.categoryTabActive]}
              onPress={() => setActiveCategory('rest_area')}
              activeOpacity={0.8}>
              <Icon name="shield-home-outline" size={16} color={activeCategory === 'rest_area' ? '#38BDF8' : '#94A3B8'} />
              <Text style={[styles.categoryTabText, activeCategory === 'rest_area' && styles.categoryTabTextActive]}>
                🅿️ Descanso
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Puntos Cercanos */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {nearbyItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="map-marker-question-outline" size={42} color="#475569" />
                <Text style={styles.emptyText}>No hay servicios inmediatos en este radio</Text>
              </View>
            ) : (
              nearbyItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.waypointCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    onSelectWaypoint({
                      name: item.name,
                      latitude: item.latitude,
                      longitude: item.longitude,
                      category: item.category,
                    });
                    onClose();
                  }}>
                  <View style={styles.waypointDistanceBox}>
                    <Text style={styles.distanceVal}>{item.distanceKm}</Text>
                    <Text style={styles.distanceUnit}>km</Text>
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.waypointTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <Text style={styles.waypointAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                    <View style={styles.waypointTagRow}>
                      {item.badge && (
                        <View style={styles.waypointBadge}>
                          <Text style={styles.waypointBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                      {item.pricePerUnit && (
                        <View style={[styles.waypointBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}>
                          <Text style={[styles.waypointBadgeText, { color: '#10B981' }]}>{item.pricePerUnit}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.addWaypointBtn}>
                    <Icon name="plus" size={18} color="#FFFFFF" />
                    <Text style={styles.addWaypointBtnText}>Añadir</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderColor: '#38BDF8',
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  categoryTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  categoryTabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  categoryTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  categoryTabTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '600',
  },
  waypointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginBottom: 8,
  },
  waypointDistanceBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  distanceVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#38BDF8',
  },
  distanceUnit: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  waypointTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  waypointAddress: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  waypointTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  waypointBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  waypointBadgeText: {
    fontSize: 9,
    color: '#38BDF8',
    fontWeight: '700',
  },
  addWaypointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 2,
  },
  addWaypointBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
