/**
 * MapControlDock - Dock agrupado en el lado inferior derecho de la pantalla
 * CamperSites Pro - UX de Alto Rendimiento y Conducción Segura
 *
 * Agrupa todos los controles de navegación para no entorpecer la visión:
 * 1. Selector desplegable de capas (Satélite, Relieve Montaña, Noche Táctica, Día)
 * 2. Botón de recentrado GPS
 * 3. Botón sutil de reporte de incidencias en 1 toque (con margen de 100m)
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MapStyleType } from '../types/assistant';

interface MapControlDockProps {
  currentMapStyle: MapStyleType;
  gpsEnabled: boolean;
  isFullScreen?: boolean;
  onSelectMapStyle: (style: MapStyleType) => void;
  onRecenterGPS: () => void;
  onOpenReportIncident: () => void;
  onToggleFullScreen?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

interface MapLayerOption {
  key: MapStyleType;
  label: string;
  sublabel: string;
  icon: string;
  badge: string;
}

const MAP_LAYERS: MapLayerOption[] = [
  {
    key: 'satellite',
    label: 'Satélite',
    sublabel: 'Esri World Imagery HD',
    icon: 'satellite-variant',
    badge: '🛰️',
  },
  {
    key: 'topo',
    label: 'Relieve',
    sublabel: 'Curvas de nivel y cumbres',
    icon: 'image-filter-hdr',
    badge: '⛰️',
  },
  {
    key: 'dark',
    label: 'Nocturno',
    sublabel: 'Táctico Dark Matter',
    icon: 'weather-night',
    badge: '🌑',
  },
  {
    key: 'day',
    label: 'Día',
    sublabel: 'OpenStreetMap estándar',
    icon: 'white-balance-sunny',
    badge: '🗺️',
  },
];

export const MapControlDock: React.FC<MapControlDockProps> = ({
  currentMapStyle,
  gpsEnabled,
  isFullScreen = false,
  onSelectMapStyle,
  onRecenterGPS,
  onOpenReportIncident,
  onToggleFullScreen,
  onZoomIn,
  onZoomOut,
}) => {
  const [layersOpen, setLayersOpen] = useState(false);

  const toggleLayers = () => {
    setLayersOpen(prev => !prev);
  };

  const handleSelectStyle = (style: MapStyleType) => {
    onSelectMapStyle(style);
    setLayersOpen(false);
  };

  return (
    <View style={styles.dockWrapper} pointerEvents="box-none">
      {/* Menú Flotante Desplegable de Capas (Hacia arriba) */}
      {layersOpen && (
        <View style={styles.layersFlyout}>
          <Text style={styles.flyoutHeader}>VISTA DEL MAPA</Text>
          {MAP_LAYERS.map(layer => {
            const isActive = currentMapStyle === layer.key;
            return (
              <TouchableOpacity
                key={layer.key}
                style={[styles.layerItem, isActive && styles.layerItemActive]}
                onPress={() => handleSelectStyle(layer.key)}
                activeOpacity={0.75}>
                <View
                  style={[
                    styles.layerIconBox,
                    isActive && styles.layerIconBoxActive,
                  ]}>
                  <Icon
                    name={layer.icon}
                    size={20}
                    color={isActive ? '#38BDF8' : '#94A3B8'}
                  />
                </View>
                <View style={styles.layerTextBox}>
                  <Text
                    style={[
                      styles.layerLabel,
                      isActive && styles.layerLabelActive,
                    ]}>
                    {layer.label}
                  </Text>
                  <Text style={styles.layerSublabel}>{layer.sublabel}</Text>
                </View>
                {isActive && (
                  <Icon name="check-circle" size={18} color="#38BDF8" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Pila vertical de controles agrupados abajo a la derecha */}
      <View style={styles.dockColumn}>
        {/* 0. Botón Maximizar / Minimizar Pantalla Completa del Mapa */}
        {onToggleFullScreen && (
          <TouchableOpacity
            style={[styles.dockBtn, isFullScreen && styles.dockBtnActive]}
            onPress={onToggleFullScreen}
            activeOpacity={0.8}>
            <Icon
              name={isFullScreen ? 'fullscreen-exit' : 'fullscreen'}
              size={24}
              color={isFullScreen ? '#F59E0B' : '#38BDF8'}
            />
          </TouchableOpacity>
        )}

        {/* 0.1 Botones de Zoom In / Zoom Out */}
        {onZoomIn && onZoomOut && (
          <View style={styles.zoomGroup}>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={onZoomIn}
              activeOpacity={0.75}>
              <Icon name="plus" size={20} color="#F1F5F9" />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={onZoomOut}
              activeOpacity={0.75}>
              <Icon name="minus" size={20} color="#F1F5F9" />
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Botón Desplegable de Capas del Mapa */}
        <TouchableOpacity
          style={[styles.dockBtn, layersOpen && styles.dockBtnActive]}
          onPress={toggleLayers}
          activeOpacity={0.8}>
          <Icon
            name="layers-triple"
            size={22}
            color={layersOpen ? '#38BDF8' : '#F1F5F9'}
          />
        </TouchableOpacity>

        {/* 2. Botón Recentrador GPS en Cabina */}
        <TouchableOpacity
          style={[styles.dockBtn, gpsEnabled && styles.recenterBtnActive]}
          onPress={onRecenterGPS}
          activeOpacity={0.8}
          accessibilityLabel="Centrar en mi ubicación">
          <Icon
            name="crosshairs-gps"
            size={24}
            color={gpsEnabled ? '#38BDF8' : '#94A3B8'}
          />
        </TouchableOpacity>

        {/* 3. Botón Sutil de Reporte de Incidencias en Marcha */}
        <TouchableOpacity
          style={[styles.dockBtn, styles.reportBtn]}
          onPress={onOpenReportIncident}
          activeOpacity={0.8}>
          <Icon name="alert-rhombus" size={24} color="#F59E0B" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: 96,
    right: 14,
    zIndex: 95,
    alignItems: 'flex-end',
  },
  layersFlyout: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    width: 220,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 14,
  },
  flyoutHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  layerItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
  },
  layerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  layerIconBoxActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
  },
  layerTextBox: {
    flex: 1,
  },
  layerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  layerLabelActive: {
    color: '#38BDF8',
  },
  layerSublabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  dockColumn: {
    gap: 10,
    alignItems: 'center',
  },
  dockBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  dockBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  recenterBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  zoomGroup: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  zoomBtn: {
    width: 44,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  reportBtn: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
});

export default MapControlDock;
