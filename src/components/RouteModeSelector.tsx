/**
 * RouteModeSelector - Selector Rápido de Modo de Perfil y Estilo de Mapa
 * CamperSites Pro
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MapStyleType, VehicleProfileMode } from '../types/assistant';
import { CamperSitesTheme as theme } from '../theme';

interface RouteModeSelectorProps {
  currentMode: VehicleProfileMode;
  currentMapStyle: MapStyleType;
  onSelectMode: (mode: VehicleProfileMode) => void;
  onSelectMapStyle: (style: MapStyleType) => void;
}

export const RouteModeSelector: React.FC<RouteModeSelectorProps> = ({
  currentMode,
  currentMapStyle,
  onSelectMode,
  onSelectMapStyle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const getModeLabel = (mode: VehicleProfileMode) => {
    switch (mode) {
      case 'camper': return 'Camper';
      case 'truck': return 'Camión';
      case 'delivery': return 'Reparto';
    }
  };

  const getModeIcon = (mode: VehicleProfileMode) => {
    switch (mode) {
      case 'camper': return 'caravan';
      case 'truck': return 'truck';
      case 'delivery': return 'package-variant-closed';
    }
  };

  const getStyleLabel = (style: MapStyleType) => {
    switch (style) {
      case 'satellite': return 'Satélite HD';
      case 'dark': return 'Midnight';
      case 'topo': return 'Outdoor Topo';
      case 'day': return 'Día OSM';
    }
  };

  const getStyleIcon = (style: MapStyleType) => {
    switch (style) {
      case 'satellite': return 'satellite-variant';
      case 'dark': return 'weather-night';
      case 'topo': return 'terrain';
      case 'day': return 'white-balance-sunny';
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.pillTrigger}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}>
        <View style={styles.pillLeft}>
          <Icon name={getModeIcon(currentMode)} size={18} color="#FFFFFF" />
          <Text style={styles.pillText}>{getModeLabel(currentMode)}</Text>
        </View>
        <View style={styles.pillDivider} />
        <View style={styles.pillRight}>
          <Icon name={getStyleIcon(currentMapStyle)} size={16} color="#38BDF8" />
        </View>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Modo de Asistente</Text>
            <View style={styles.optionsRow}>
              {[
                { mode: 'camper' as VehicleProfileMode, label: 'Camper / AC', icon: 'caravan', color: '#10B981' },
                { mode: 'truck' as VehicleProfileMode, label: 'Camión Pesado', icon: 'truck', color: '#F59E0B' },
                { mode: 'delivery' as VehicleProfileMode, label: 'Repartidor TSP', icon: 'package-variant-closed', color: '#06B6D4' },
              ].map(item => (
                <TouchableOpacity
                  key={item.mode}
                  style={[
                    styles.modeCard,
                    currentMode === item.mode && { borderColor: item.color, backgroundColor: item.color + '18' },
                  ]}
                  onPress={() => {
                    onSelectMode(item.mode);
                    setModalVisible(false);
                  }}>
                  <Icon name={item.icon} size={24} color={currentMode === item.mode ? item.color : '#94A3B8'} />
                  <Text style={[styles.modeCardText, currentMode === item.mode && { color: item.color, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.menuTitle, { marginTop: 16 }]}>Capa del Mapa</Text>
            <View style={styles.optionsGrid}>
              {[
                { style: 'satellite' as MapStyleType, label: 'Satélite HD', icon: 'satellite-variant' },
                { style: 'dark' as MapStyleType, label: 'Táctico Dark', icon: 'weather-night' },
                { style: 'topo' as MapStyleType, label: 'Outdoor Topo', icon: 'terrain' },
                { style: 'day' as MapStyleType, label: 'Día Estándar', icon: 'white-balance-sunny' },
              ].map(item => (
                <TouchableOpacity
                  key={item.style}
                  style={[
                    styles.layerBtn,
                    currentMapStyle === item.style && styles.layerBtnActive,
                  ]}
                  onPress={() => {
                    onSelectMapStyle(item.style);
                    setModalVisible(false);
                  }}>
                  <Icon
                    name={item.icon}
                    size={20}
                    color={currentMapStyle === item.style ? '#FFFFFF' : '#475569'}
                  />
                  <Text style={[styles.layerText, currentMapStyle === item.style && styles.layerTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pillTrigger: {
    position: 'absolute',
    top: 50,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
    gap: 8,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  pillDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  pillRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  modeCardText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  layerBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  layerBtnActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  layerText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  layerTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
