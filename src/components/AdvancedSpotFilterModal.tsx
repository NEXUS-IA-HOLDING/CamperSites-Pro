/**
 * AdvancedSpotFilterModal.tsx - Filtro Multicriterio Profesional estilo Park4Night / iOverlander
 * CamperSites Pro - Cockpit Travel Suite
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface SpotFilterCriteria {
  categories: string[];
  requireWater: boolean;
  requireElectricity: boolean;
  requireWasteDump: boolean;
  onlyFree: boolean;
  onlyLargeVehicles: boolean;
  minRating: number;
}

export const DEFAULT_FILTER_CRITERIA: SpotFilterCriteria = {
  categories: [],
  requireWater: false,
  requireElectricity: false,
  requireWasteDump: false,
  onlyFree: false,
  onlyLargeVehicles: false,
  minRating: 0,
};

interface AdvancedSpotFilterModalProps {
  visible: boolean;
  initialCriteria?: SpotFilterCriteria;
  onApply: (criteria: SpotFilterCriteria) => void;
  onClose: () => void;
}

const SPOT_TYPE_OPTIONS = [
  { key: 'AREA_SERVICIOS', label: 'Áreas Camper', icon: 'van-passenger', emoji: '🚐', color: '#0284C7' },
  { key: 'CAMPING', label: 'Campings', icon: 'tent', emoji: '⛺', color: '#16A34A' },
  { key: 'PARKING_PERMITIDO', label: 'Parkings Noche', icon: 'parking', emoji: '🅿️', color: '#6366F1' },
  { key: 'PERNOCTA_LIBRE', label: 'Naturaleza Libre', icon: 'pine-tree', emoji: '🌲', color: '#059669' },
  { key: 'GASOLINERA_GLP', label: 'GLP / Autogas', icon: 'gas-cylinder', emoji: '⛽', color: '#DC2626' },
];

export const AdvancedSpotFilterModal: React.FC<AdvancedSpotFilterModalProps> = ({
  visible,
  initialCriteria = DEFAULT_FILTER_CRITERIA,
  onApply,
  onClose,
}) => {
  const [criteria, setCriteria] = useState<SpotFilterCriteria>(initialCriteria);

  const toggleCategory = (key: string) => {
    setCriteria(prev => {
      const exists = prev.categories.includes(key);
      const updated = exists
        ? prev.categories.filter(c => c !== key)
        : [...prev.categories, key];
      return { ...prev, categories: updated };
    });
  };

  const resetFilters = () => {
    setCriteria(DEFAULT_FILTER_CRITERIA);
  };

  const countActiveFilters = (): number => {
    let count = criteria.categories.length;
    if (criteria.requireWater) count++;
    if (criteria.requireElectricity) count++;
    if (criteria.requireWasteDump) count++;
    if (criteria.onlyFree) count++;
    if (criteria.onlyLargeVehicles) count++;
    if (criteria.minRating > 0) count++;
    return count;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Barra superior del modal */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Filtros de Pernocta y Servicios</Text>
              <Text style={styles.sheetSubtitle}>Estilo Park4Night / Sygic Camper</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. Tipo de Alojamiento / Lugar */}
            <Text style={styles.sectionTitle}>TIPO DE LUGAR</Text>
            <View style={styles.typesGrid}>
              {SPOT_TYPE_OPTIONS.map(opt => {
                const isSelected = criteria.categories.includes(opt.key);
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.typeChip,
                      isSelected && { backgroundColor: opt.color, borderColor: opt.color },
                    ]}
                    onPress={() => toggleCategory(opt.key)}
                    activeOpacity={0.8}>
                    <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && { color: '#FFFFFF', fontWeight: '800' },
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Servicios Esenciales del Vehículo */}
            <Text style={styles.sectionTitle}>SERVICIOS ESENCIALES</Text>
            <View style={styles.switchesGroup}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelRow}>
                  <Icon name="water" size={20} color="#38BDF8" style={{ marginRight: 10 }} />
                  <Text style={styles.switchLabel}>Agua Potable (Llenado)</Text>
                </View>
                <Switch
                  value={criteria.requireWater}
                  onValueChange={val => setCriteria(prev => ({ ...prev, requireWater: val }))}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.switchDivider} />

              <View style={styles.switchRow}>
                <View style={styles.switchLabelRow}>
                  <Icon name="flash" size={20} color="#FBBF24" style={{ marginRight: 10 }} />
                  <Text style={styles.switchLabel}>Electricidad 220V</Text>
                </View>
                <Switch
                  value={criteria.requireElectricity}
                  onValueChange={val => setCriteria(prev => ({ ...prev, requireElectricity: val }))}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.switchDivider} />

              <View style={styles.switchRow}>
                <View style={styles.switchLabelRow}>
                  <Icon name="arrow-down-bold-circle-outline" size={20} color="#A78BFA" style={{ marginRight: 10 }} />
                  <Text style={styles.switchLabel}>Vaciado Grises y WC Químico</Text>
                </View>
                <Switch
                  value={criteria.requireWasteDump}
                  onValueChange={val => setCriteria(prev => ({ ...prev, requireWasteDump: val }))}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* 3. Dimensiones y Aptitud para Gran Tonelaje */}
            <Text style={styles.sectionTitle}>VEHÍCULOS Y RESTRICCIONES</Text>
            <View style={styles.switchesGroup}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelRow}>
                  <Icon name="truck-outline" size={20} color="#34D399" style={{ marginRight: 10 }} />
                  <View>
                    <Text style={styles.switchLabel}>Apto para vehículos {'>'} 7.5m</Text>
                    <Text style={styles.switchSubLabel}>Acceso amplio para autocaravana grande o camión</Text>
                  </View>
                </View>
                <Switch
                  value={criteria.onlyLargeVehicles}
                  onValueChange={val => setCriteria(prev => ({ ...prev, onlyLargeVehicles: val }))}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.switchDivider} />

              <View style={styles.switchRow}>
                <View style={styles.switchLabelRow}>
                  <Icon name="cash-remove" size={20} color="#F87171" style={{ marginRight: 10 }} />
                  <View>
                    <Text style={styles.switchLabel}>Solo lugares 100% GRATIS</Text>
                    <Text style={styles.switchSubLabel}>Excluir campings y áreas de pago</Text>
                  </View>
                </View>
                <Switch
                  value={criteria.onlyFree}
                  onValueChange={val => setCriteria(prev => ({ ...prev, onlyFree: val }))}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </ScrollView>

          {/* Botones de acción inferiores */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.7}>
              <Text style={styles.resetBtnText}>Restablecer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                onApply(criteria);
                onClose();
              }}
              activeOpacity={0.85}>
              <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.applyBtnText}>
                Ver Resultados ({countActiveFilters()} activos)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 10,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  switchesGroup: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  switchLabel: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  switchSubLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  switchDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  resetBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default AdvancedSpotFilterModal;
