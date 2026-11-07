/**
 * FuelPriceComparatorModal.tsx - Comparador Táctico de Gasolineras Baratas y GLP
 * CamperSites Pro - Asistente de Conducción y Ahorro en Ruta
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  FuelPriceService,
  FuelStationItem,
  FuelFilterType,
} from '../services/FuelPriceService';

interface Props {
  visible: boolean;
  userLatitude: number;
  userLongitude: number;
  onClose: () => void;
  onSelectStation: (station: FuelStationItem) => void;
}

export const FuelPriceComparatorModal: React.FC<Props> = ({
  visible,
  userLatitude,
  userLongitude,
  onClose,
  onSelectStation,
}) => {
  const [fuelType, setFuelType] = useState<FuelFilterType>('diesel');
  const [radiusKm, setRadiusKm] = useState<number>(30);
  const [stations, setStations] = useState<FuelStationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      loadStations();
    }
  }, [visible, fuelType, radiusKm, userLatitude, userLongitude]);

  const loadStations = async () => {
    setLoading(true);
    const data = await FuelPriceService.getNearbyFuelStations(
      userLatitude,
      userLongitude,
      fuelType,
      radiusKm
    );
    setStations(data);
    setLoading(false);
  };

  const bestStation = stations.find(s => s.isCheapest);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Cabecera */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBadge}>
                <Icon name="gas-station" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Ahorro Combustible & GLP</Text>
                <Text style={styles.headerSubtitle}>Precios oficiales MITECO en tiempo real</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Selector de Tipo de Combustible */}
          <View style={styles.fuelTabsRow}>
            <TouchableOpacity
              style={[styles.fuelTab, fuelType === 'diesel' && styles.fuelTabActive]}
              onPress={() => setFuelType('diesel')}>
              <Icon
                name="gas-cylinder"
                size={16}
                color={fuelType === 'diesel' ? '#10B981' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.fuelTabText,
                  fuelType === 'diesel' && styles.fuelTabTextActive,
                ]}>
                Diésel A
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fuelTab, fuelType === 'glp' && styles.fuelTabActive]}
              onPress={() => setFuelType('glp')}>
              <Icon
                name="propane-tank"
                size={16}
                color={fuelType === 'glp' ? '#38BDF8' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.fuelTabText,
                  fuelType === 'glp' && styles.fuelTabTextActive,
                ]}>
                GLP / Autogas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fuelTab, fuelType === 'gasolina' && styles.fuelTabActive]}
              onPress={() => setFuelType('gasolina')}>
              <Icon
                name="fuel"
                size={16}
                color={fuelType === 'gasolina' ? '#F59E0B' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.fuelTabText,
                  fuelType === 'gasolina' && styles.fuelTabTextActive,
                ]}>
                Gasolina 95
              </Text>
            </TouchableOpacity>
          </View>

          {/* Banner de Mayor Ahorro Detectado */}
          {bestStation && bestStation.estimatedSavingsEur && bestStation.estimatedSavingsEur > 0 ? (
            <View style={styles.bestSavingsBanner}>
              <Icon name="piggy-bank-outline" size={22} color="#10B981" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bestSavingsTitle}>
                  Ahorro estimado: hasta {bestStation.estimatedSavingsEur.toFixed(1)}€ en {bestStation.name}
                </Text>
                <Text style={styles.bestSavingsDesc}>
                  A {bestStation.distanceKm} km • Precio: {fuelType === 'diesel' ? bestStation.dieselPrice?.toFixed(3) : fuelType === 'glp' ? bestStation.glpPrice?.toFixed(3) : bestStation.gasolinePrice?.toFixed(3)} €/L
                </Text>
              </View>
            </View>
          ) : null}

          {/* Lista de Gasolineras */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Buscando mejores precios en un radio de {radiusKm} km...</Text>
            </View>
          ) : stations.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="gas-station-off" size={40} color="#64748B" />
              <Text style={styles.emptyText}>No se encontraron gasolineras con {fuelType.toUpperCase()} en {radiusKm} km.</Text>
            </View>
          ) : (
            <FlatList
              data={stations}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const price = fuelType === 'diesel' ? item.dieselPrice : fuelType === 'glp' ? item.glpPrice : item.gasolinePrice;
                return (
                  <View style={[styles.stationCard, item.isCheapest && styles.stationCardCheapest]}>
                    <View style={styles.stationTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.stationName} numberOfLines={1}>{item.name}</Text>
                          {item.isCheapest && (
                            <View style={styles.cheapestBadge}>
                              <Text style={styles.cheapestBadgeText}>MÁS BARATA</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.stationAddress} numberOfLines={1}>
                          {item.address} • {item.locality}
                        </Text>
                      </View>

                      <View style={styles.pricePod}>
                        <Text style={[styles.priceText, item.isCheapest && styles.priceTextCheapest]}>
                          {price ? `${price.toFixed(3)}€` : '--'}
                        </Text>
                        <Text style={styles.priceUnit}>por litro</Text>
                      </View>
                    </View>

                    <View style={styles.stationBottomRow}>
                      <View style={styles.stationMetaRow}>
                        <Icon name="map-marker-distance" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{item.distanceKm} km</Text>
                        {item.estimatedSavingsEur && item.estimatedSavingsEur > 0 ? (
                          <View style={styles.savingsPill}>
                            <Text style={styles.savingsPillText}>Ahorras ~{item.estimatedSavingsEur}€</Text>
                          </View>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        style={styles.navigateBtn}
                        activeOpacity={0.8}
                        onPress={() => onSelectStation(item)}>
                        <Icon name="navigation-variant" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.navigateBtnText}>Ir aquí</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
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
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '82%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  fuelTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  fuelTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fuelTabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  fuelTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  fuelTabTextActive: {
    color: '#F8FAFC',
  },
  bestSavingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 10,
    marginBottom: 12,
  },
  bestSavingsTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  bestSavingsDesc: {
    color: '#E2E8F0',
    fontSize: 11,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 10,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  stationCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginBottom: 8,
  },
  stationCardCheapest: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  stationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stationName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    maxWidth: 180,
  },
  cheapestBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  cheapestBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  stationAddress: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  pricePod: {
    alignItems: 'flex-end',
  },
  priceText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  priceTextCheapest: {
    color: '#10B981',
  },
  priceUnit: {
    color: '#64748B',
    fontSize: 10,
  },
  stationBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
  },
  stationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8,
  },
  savingsPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsPillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
