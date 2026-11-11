/**
 * MapControlDock.tsx - Ultra-compact right dock (<220px) + Lateral Camper Tools Drawer
 * CamperSites Pro - UX de Alto Rendimiento y Conducción Segura
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MapStyleType } from '../types/assistant';

export interface MapControlDockProps {
  currentMapStyle: MapStyleType;
  gpsEnabled: boolean;
  isFullScreen?: boolean;
  isSimulating?: boolean;
  camera3DMode?: boolean;
  onSelectMapStyle: (style: MapStyleType) => void;
  onRecenterGPS: () => void;
  onOpenReportIncident: () => void;
  onToggleFullScreen?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleSimulation?: () => void;
  onToggleCamera3D?: () => void;
  onOpenFuelComparator?: () => void;
  onOpenLeveler?: () => void;
  onOpenSleepMode?: () => void;
  onOpenTelemetry?: () => void;
  onOpenCopilot?: () => void;
  onOpenDimensions?: () => void;
}

interface MapLayerOption {
  key: MapStyleType;
  label: string;
  sublabel: string;
  icon: string;
  badge: string;
}

const MAP_LAYERS: MapLayerOption[] = [
  { key: 'satellite', label: 'Satélite', sublabel: 'Esri World Imagery HD', icon: 'satellite-variant', badge: '🛰️' },
  { key: 'hybrid', label: 'Híbrido HD', sublabel: 'Satélite + Vías + Relieve', icon: 'map-legend', badge: '🗺️' },
  { key: 'topo', label: 'Relieve', sublabel: 'Curvas de nivel y 3D DEM', icon: 'image-filter-hdr', badge: '⛰️' },
  { key: 'dark', label: 'Nocturno', sublabel: 'Táctico Dark Matter', icon: 'weather-night', badge: '🌑' },
  { key: 'day', label: 'Vectorial', sublabel: 'OpenStreetMap estándar', icon: 'white-balance-sunny', badge: '📐' },
];

export const MapControlDock: React.FC<MapControlDockProps> = ({
  currentMapStyle,
  gpsEnabled,
  isFullScreen = false,
  isSimulating = false,
  camera3DMode = false,
  onSelectMapStyle,
  onRecenterGPS,
  onOpenReportIncident,
  onToggleFullScreen,
  onZoomIn,
  onZoomOut,
  onToggleSimulation,
  onToggleCamera3D,
  onOpenFuelComparator,
  onOpenLeveler,
  onOpenSleepMode,
  onOpenTelemetry,
  onOpenCopilot,
  onOpenDimensions,
}) => {
  const [layersOpen, setLayersOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const toggleLayers = () => {
    setLayersOpen(prev => !prev);
    if (!layersOpen) setToolsOpen(false);
  };

  const toggleTools = () => {
    setToolsOpen(prev => !prev);
    if (!toolsOpen) setLayersOpen(false);
  };

  const handleSelectStyle = (style: MapStyleType) => {
    onSelectMapStyle(style);
    setLayersOpen(false);
  };

  const handleToolAction = (action?: () => void) => {
    if (action) {
      action();
      setToolsOpen(false);
    }
  };

  return (
    <View style={styles.dockWrapper} pointerEvents="box-none">
      {/* Menú Lateral Flotante de Capas (Aparece a la izquierda del dock) */}
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
                <View style={[styles.layerIconBox, isActive && styles.layerIconBoxActive]}>
                  <Icon name={layer.icon} size={18} color={isActive ? '#38BDF8' : '#94A3B8'} />
                </View>
                <View style={styles.layerTextBox}>
                  <Text style={[styles.layerLabel, isActive && styles.layerLabelActive]}>
                    {layer.label}
                  </Text>
                  <Text style={styles.layerSublabel}>{layer.sublabel}</Text>
                </View>
                {isActive && <Icon name="check-circle" size={16} color="#38BDF8" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Cajón Lateral de Herramientas Camper */}
      {toolsOpen && (
        <View style={styles.toolsFlyout}>
          <Text style={styles.flyoutHeader}>HERRAMIENTAS CAMPER</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            style={{ maxHeight: 330 }}
            contentContainerStyle={{ paddingBottom: 4 }}>
            {onOpenFuelComparator && (
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolAction(onOpenFuelComparator)}
                activeOpacity={0.75}>
                <View style={[styles.toolIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Icon name="gas-station" size={17} color="#10B981" />
                </View>
                <View style={styles.toolTextBox}>
                  <Text style={styles.toolLabel}>Diésel & GLP Barato</Text>
                  <Text style={styles.toolSublabel}>Precios actualizados DGT</Text>
                </View>
              </TouchableOpacity>
            )}

            {onOpenLeveler && (
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolAction(onOpenLeveler)}
                activeOpacity={0.75}>
                <View style={[styles.toolIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                  <Icon name="spirit-level" size={17} color="#38BDF8" />
                </View>
                <View style={styles.toolTextBox}>
                  <Text style={styles.toolLabel}>Nivelador Digital 3D</Text>
                  <Text style={styles.toolSublabel}>Burbuja giroscópica</Text>
                </View>
              </TouchableOpacity>
            )}

            {onOpenSleepMode && (
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolAction(onOpenSleepMode)}
                activeOpacity={0.75}>
                <View style={[styles.toolIconBox, { backgroundColor: 'rgba(129, 140, 248, 0.2)' }]}>
                  <Icon name="bed-king-outline" size={17} color="#818CF8" />
                </View>
                <View style={styles.toolTextBox}>
                  <Text style={styles.toolLabel}>Modo Pernocta Segura</Text>
                  <Text style={styles.toolSublabel}>Alarma de perímetro</Text>
                </View>
              </TouchableOpacity>
            )}

            {onOpenTelemetry && (
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolAction(onOpenTelemetry)}
                activeOpacity={0.75}>
                <View style={[styles.toolIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                  <Icon name="car-connected" size={17} color="#38BDF8" />
                </View>
                <View style={styles.toolTextBox}>
                  <Text style={styles.toolLabel}>Telemetría en Vivo</Text>
                  <Text style={styles.toolSublabel}>Altitud, velocidad y GPS</Text>
                </View>
              </TouchableOpacity>
            )}

            {onOpenCopilot && (
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolAction(onOpenCopilot)}
                activeOpacity={0.75}>
                <View style={[styles.toolIconBox, { backgroundColor: 'rgba(167, 139, 250, 0.2)' }]}>
                  <Icon name="brain" size={17} color="#A78BFA" />
                </View>
                <View style={styles.toolTextBox}>
                  <Text style={styles.toolLabel}>Copiloto IA & Rutas 3D</Text>
                  <Text style={styles.toolSublabel}>Itinerarios legendarios</Text>
                </View>
              </TouchableOpacity>
            )}

            {onOpenDimensions && (
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolAction(onOpenDimensions)}
                activeOpacity={0.75}>
                <View style={[styles.toolIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Icon name="truck-cargo-container" size={17} color="#10B981" />
                </View>
                <View style={styles.toolTextBox}>
                  <Text style={styles.toolLabel}>Medidas y Gálibo</Text>
                  <Text style={styles.toolSublabel}>Altura, peso y anchura</Text>
                </View>
              </TouchableOpacity>
            )}

            {onToggleSimulation && (
              <TouchableOpacity
                style={[styles.toolItem, isSimulating && styles.toolItemActive]}
                onPress={() => handleToolAction(onToggleSimulation)}
                activeOpacity={0.75}>
                <View style={[styles.toolIconBox, { backgroundColor: isSimulating ? '#0284C7' : 'rgba(56, 189, 248, 0.2)' }]}>
                  <Icon name={isSimulating ? 'stop-circle' : 'car-sports'} size={17} color="#38BDF8" />
                </View>
                <View style={styles.toolTextBox}>
                  <Text style={[styles.toolLabel, isSimulating && { color: '#38BDF8' }]}>
                    {isSimulating ? 'Detener Demo 3D' : 'Simulación Demo 3D'}
                  </Text>
                  <Text style={styles.toolSublabel}>Recorrido virtual</Text>
                </View>
              </TouchableOpacity>
            )}

            {onToggleFullScreen && (
              <TouchableOpacity
                style={styles.toolItem}
                onPress={() => handleToolAction(onToggleFullScreen)}
                activeOpacity={0.75}>
                <View style={[styles.toolIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Icon name={isFullScreen ? 'fullscreen-exit' : 'fullscreen'} size={17} color="#F59E0B" />
                </View>
                <View style={styles.toolTextBox}>
                  <Text style={styles.toolLabel}>{isFullScreen ? 'Salir Pantalla Completa' : 'Pantalla Completa'}</Text>
                  <Text style={styles.toolSublabel}>Maximizar mapa</Text>
                </View>
              </TouchableOpacity>
            )}

            {onZoomIn && onZoomOut && (
              <View style={styles.zoomDrawerRow}>
                <TouchableOpacity style={styles.zoomDrawerBtn} onPress={onZoomIn} activeOpacity={0.75}>
                  <Icon name="plus" size={16} color="#F1F5F9" />
                  <Text style={styles.zoomDrawerText}>Acercar</Text>
                </TouchableOpacity>
                <View style={styles.zoomDrawerDivider} />
                <TouchableOpacity style={styles.zoomDrawerBtn} onPress={onZoomOut} activeOpacity={0.75}>
                  <Icon name="minus" size={16} color="#F1F5F9" />
                  <Text style={styles.zoomDrawerText}>Alejar</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Pila Vertical Primaria: Exactamente 5 botones compactos (<220px total) */}
      <View style={styles.dockColumn}>
        {/* 1. Recentrador GPS */}
        <TouchableOpacity
          style={[styles.dockBtn, gpsEnabled && styles.recenterBtnActive]}
          onPress={onRecenterGPS}
          activeOpacity={0.8}
          accessibilityLabel="Centrar en mi ubicación">
          <Icon name="crosshairs-gps" size={20} color={gpsEnabled ? '#38BDF8' : '#94A3B8'} />
        </TouchableOpacity>

        {/* 2. Conmutador 3D / 2D */}
        {onToggleCamera3D && (
          <TouchableOpacity
            style={[styles.dockBtn, styles.camera3DBtn, camera3DMode && styles.camera3DBtnActive]}
            onPress={onToggleCamera3D}
            activeOpacity={0.8}
            accessibilityLabel={camera3DMode ? 'Modo 2D' : 'Modo 3D'}>
            <Icon
              name={camera3DMode ? 'navigation-variant' : 'perspective-less'}
              size={17}
              color={camera3DMode ? '#10B981' : '#38BDF8'}
            />
            <View style={[styles.mode3DBadge, camera3DMode ? styles.mode3DBadgeActive : styles.mode3DBadgeInactive]}>
              <Text style={[styles.mode3DBadgeText, camera3DMode && styles.mode3DBadgeTextActive]}>
                {camera3DMode ? '3D' : '2D'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 3. Selector de Capas */}
        <TouchableOpacity
          style={[styles.dockBtn, layersOpen && styles.dockBtnActive]}
          onPress={toggleLayers}
          activeOpacity={0.8}
          accessibilityLabel="Capas del mapa">
          <Icon name="layers-triple" size={20} color={layersOpen ? '#38BDF8' : '#F1F5F9'} />
        </TouchableOpacity>

        {/* 4. Cajón de Herramientas Camper */}
        <TouchableOpacity
          style={[styles.dockBtn, toolsOpen && styles.dockBtnActive, isSimulating && { borderColor: '#38BDF8' }]}
          onPress={toggleTools}
          activeOpacity={0.8}
          accessibilityLabel="Herramientas Camper">
          <Icon name="toolbox-outline" size={19} color={toolsOpen ? '#38BDF8' : isSimulating ? '#38BDF8' : '#F1F5F9'} />
          {isSimulating && <View style={styles.simPulseBadge} />}
        </TouchableOpacity>

        {/* 5. Avisar Incidencia Rápida */}
        <TouchableOpacity
          style={[styles.dockBtn, styles.reportBtn]}
          onPress={onOpenReportIncident}
          activeOpacity={0.8}
          accessibilityLabel="Avisar incidencia">
          <Icon name="alert-rhombus" size={20} color="#F59E0B" />
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
    zIndex: 100, // Harmonized Dock zIndex
    alignItems: 'flex-end',
  },
  dockColumn: {
    gap: 4, // 5 * 40 + 4 * 4 = 216px total height (< 220px)
    alignItems: 'center',
  },
  dockBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
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
  camera3DBtn: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  camera3DBtnActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  mode3DBadge: {
    position: 'absolute',
    bottom: 2,
    paddingHorizontal: 4,
    paddingVertical: 0.5,
    borderRadius: 4,
  },
  mode3DBadgeInactive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  mode3DBadgeActive: {
    backgroundColor: '#10B981',
  },
  mode3DBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#38BDF8',
  },
  mode3DBadgeTextActive: {
    color: '#0F172A',
  },
  recenterBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
  },
  reportBtn: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  simPulseBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38BDF8',
  },
  // Desplegables Laterales (Posicionados a la izquierda de la columna con zIndex: 120)
  layersFlyout: {
    position: 'absolute',
    right: 48,
    bottom: 0,
    width: 220,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 120, // Harmonized Flyout zIndex
  },
  toolsFlyout: {
    position: 'absolute',
    right: 48,
    bottom: 0,
    width: 236,
    maxHeight: 380,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 120, // Harmonized Drawer zIndex
  },
  flyoutHeader: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginBottom: 3,
  },
  layerItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
  },
  layerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  layerIconBoxActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
  },
  layerTextBox: {
    flex: 1,
  },
  layerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  layerLabelActive: {
    color: '#38BDF8',
  },
  layerSublabel: {
    fontSize: 9,
    color: '#94A3B8',
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 9,
    marginBottom: 2,
  },
  toolItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  toolIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  toolTextBox: {
    flex: 1,
  },
  toolLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  toolSublabel: {
    fontSize: 9,
    color: '#94A3B8',
  },
  zoomDrawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 10,
    marginTop: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  zoomDrawerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  zoomDrawerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  zoomDrawerDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});

export default MapControlDock;
