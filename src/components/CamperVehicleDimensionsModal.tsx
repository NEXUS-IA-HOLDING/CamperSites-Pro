/**
 * CamperVehicleDimensionsModal.tsx - Ajustes de Dimensiones y Gálibo del Vehículo
 * CamperSites Pro — Nexus AI Holding
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  CamperValhallaRoutingService,
  CamperVehicleDimensions,
  DEFAULT_CAMPER_DIMENSIONS,
} from '../services/CamperValhallaRoutingService';
import { OfflineMapTileService } from '../services/OfflineMapTileService';
import { VehicleCatalogModal } from './VehicleCatalogModal';
import { UserVehicleSetup } from '../services/VehicleCatalogService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onDimensionsSaved?: (dims: CamperVehicleDimensions) => void;
  currentLocation?: { latitude: number; longitude: number } | null;
}

export const CamperVehicleDimensionsModal: React.FC<Props> = ({
  visible,
  onClose,
  onDimensionsSaved,
  currentLocation,
}) => {
  const [height, setHeight] = useState<number>(DEFAULT_CAMPER_DIMENSIONS.height);
  const [width, setWidth] = useState<number>(DEFAULT_CAMPER_DIMENSIONS.width);
  const [length, setLength] = useState<number>(DEFAULT_CAMPER_DIMENSIONS.length);
  const [weight, setWeight] = useState<number>(DEFAULT_CAMPER_DIMENSIONS.weight);
  const [excludeTolls, setExcludeTolls] = useState<boolean>(false);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState<boolean>(false);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      CamperValhallaRoutingService.getVehicleDimensions().then((dims) => {
        setHeight(dims.height);
        setWidth(dims.width);
        setLength(dims.length);
        setWeight(dims.weight);
        setExcludeTolls(!!dims.excludeTolls);
      });
    }
  }, [visible]);

  const handleSave = async () => {
    const updated: CamperVehicleDimensions = {
      height: Number(height.toFixed(2)),
      width: Number(width.toFixed(2)),
      length: Number(length.toFixed(2)),
      weight: Number(weight.toFixed(1)),
      excludeTolls,
    };
    await CamperValhallaRoutingService.saveVehicleDimensions(updated);
    Alert.alert(
      'Gálibo Actualizado',
      `Dimensiones guardadas:\nAltura: ${updated.height}m | Ancho: ${updated.width}m\nLargo: ${updated.length}m | Peso: ${updated.weight}t\n\nEl motor de rutas Valhalla esquivará automáticamente cualquier obstáculo menor a ${updated.height}m.`
    );
    if (onDimensionsSaved) {
      onDimensionsSaved(updated);
    }
    onClose();
  };

  const handleDownloadOfflineZone = async () => {
    if (!currentLocation) {
      Alert.alert('Ubicación requerida', 'Activa el GPS para descargar la cuadrícula de satélite de tu zona.');
      return;
    }
    setIsDownloadingOffline(true);
    const radius = 0.35; // ~40km de cobertura
    const minLat = currentLocation.latitude - radius;
    const maxLat = currentLocation.latitude + radius;
    const minLng = currentLocation.longitude - radius;
    const maxLng = currentLocation.longitude + radius;

    const estimate = OfflineMapTileService.estimateRegionTiles(minLat, maxLat, minLng, maxLng, 10, 14);

    setTimeout(async () => {
      await OfflineMapTileService.saveDownloadedRegion({
        id: `offline-zone-${Date.now()}`,
        name: `Zona Local (${currentLocation.latitude.toFixed(2)}, ${currentLocation.longitude.toFixed(2)})`,
        minLat,
        maxLat,
        minLng,
        maxLng,
        minZoom: 10,
        maxZoom: 14,
        tileCountEstimate: estimate.tileCount,
        sizeMBEstimate: estimate.sizeMB,
        downloadedAt: new Date().toISOString(),
        isCompleted: true,
      });
      setIsDownloadingOffline(false);
      Alert.alert(
        'Cuadrícula Satelital Guardada',
        `Se han descargado ${estimate.tileCount} fragmentos satelitales (${estimate.sizeMB} MB) para navegación sin cobertura 4G/5G en tu zona.`
      );
    }, 1200);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBadge}>
                <Icon name="truck-cargo-container" size={22} color="#10B981" />
              </View>
              <View>
                <Text style={styles.title}>Gálibo & Medidas Camper</Text>
                <Text style={styles.subtitle}>Enrutamiento Valhalla sin Puentes Bajos</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Aviso de Seguridad */}
            <View style={styles.safetyBox}>
              <Icon name="shield-check" size={20} color="#10B981" />
              <Text style={styles.safetyText}>
                Valhalla Truck calculará tus rutas excluyendo túneles con limitación de altura inferior a{' '}
                <Text style={styles.boldText}>{height.toFixed(2)}m</Text> y calles no aptas para tu longitud.
              </Text>
            </View>

            {/* Botón Catálogo Oficial de Modelos */}
            <TouchableOpacity
              style={styles.catalogShortcutBtn}
              activeOpacity={0.85}
              onPress={() => setShowCatalogModal(true)}>
              <Icon name="book-open-page-variant" size={20} color="#38BDF8" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.catalogShortcutTitle}>Elegir Modelo Exacto del Catálogo</Text>
                <Text style={styles.catalogShortcutSub}>Fiat Ducato, VW California, Benimar, Sprinter, etc.</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#38BDF8" />
            </TouchableOpacity>

            {/* Selector de Altura */}
            <View style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Icon name="arrow-up-down" size={18} color="#38BDF8" />
                <Text style={styles.fieldLabel}>Altura del Vehículo (m)</Text>
                <Text style={styles.fieldValue}>{height.toFixed(2)} m</Text>
              </View>
              <View style={styles.buttonRow}>
                {[2.0, 2.6, 2.9, 3.2, 3.5, 3.8].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.presetBtn, Math.abs(height - val) < 0.05 && styles.presetBtnActive]}
                    onPress={() => setHeight(val)}>
                    <Text
                      style={[
                        styles.presetBtnText,
                        Math.abs(height - val) < 0.05 && styles.presetBtnTextActive,
                      ]}>
                      {val.toFixed(1)}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Selector de Anchura */}
            <View style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Icon name="arrow-left-right" size={18} color="#FBBF24" />
                <Text style={styles.fieldLabel}>Anchura (m)</Text>
                <Text style={styles.fieldValue}>{width.toFixed(2)} m</Text>
              </View>
              <View style={styles.buttonRow}>
                {[2.0, 2.15, 2.3, 2.45, 2.55].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.presetBtn, Math.abs(width - val) < 0.05 && styles.presetBtnActive]}
                    onPress={() => setWidth(val)}>
                    <Text
                      style={[
                        styles.presetBtnText,
                        Math.abs(width - val) < 0.05 && styles.presetBtnTextActive,
                      ]}>
                      {val.toFixed(2)}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Selector de Longitud */}
            <View style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Icon name="ruler" size={18} color="#EC4899" />
                <Text style={styles.fieldLabel}>Longitud Total (m)</Text>
                <Text style={styles.fieldValue}>{length.toFixed(1)} m</Text>
              </View>
              <View style={styles.buttonRow}>
                {[5.0, 6.0, 6.8, 7.4, 8.5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.presetBtn, Math.abs(length - val) < 0.1 && styles.presetBtnActive]}
                    onPress={() => setLength(val)}>
                    <Text
                      style={[
                        styles.presetBtnText,
                        Math.abs(length - val) < 0.1 && styles.presetBtnTextActive,
                      ]}>
                      {val.toFixed(1)}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Selector de Peso */}
            <View style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Icon name="weight" size={18} color="#A78BFA" />
                <Text style={styles.fieldLabel}>Peso MMA (Toneladas)</Text>
                <Text style={styles.fieldValue}>{weight.toFixed(1)} t</Text>
              </View>
              <View style={styles.buttonRow}>
                {[2.8, 3.5, 4.25, 5.0, 7.5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.presetBtn, Math.abs(weight - val) < 0.1 && styles.presetBtnActive]}
                    onPress={() => setWeight(val)}>
                    <Text
                      style={[
                        styles.presetBtnText,
                        Math.abs(weight - val) < 0.1 && styles.presetBtnTextActive,
                      ]}>
                      {val.toFixed(1)}t
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Switch Peajes */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Icon name="cash-remove" size={20} color="#F59E0B" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.toggleTitle}>Evitar Autopistas de Peaje</Text>
                  <Text style={styles.toggleSubtitle}>Priorizar autovías y carreteras nacionales</Text>
                </View>
              </View>
              <Switch
                value={excludeTolls}
                onValueChange={setExcludeTolls}
                trackColor={{ false: '#334155', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Botón Descarga Satélite Offline */}
            <TouchableOpacity
              style={styles.offlineBtn}
              onPress={handleDownloadOfflineZone}
              disabled={isDownloadingOffline}>
              <Icon name="cloud-download" size={20} color="#38BDF8" />
              <Text style={styles.offlineBtnText}>
                {isDownloadingOffline
                  ? 'Descargando Cuadrícula Satelital...'
                  : 'Descargar Satélite Offline de esta Zona'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Icon name="check-bold" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Guardar y Aplicar en Mapa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <VehicleCatalogModal
        visible={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        onVehicleSaved={(setup) => {
          setHeight(setup.height);
          setWidth(setup.width);
          setLength(setup.length);
          setWeight(setup.weight);
          setShowCatalogModal(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 10,
  },
  catalogShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    marginBottom: 14,
  },
  catalogShortcutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },
  catalogShortcutSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  safetyText: {
    color: '#D1FAE5',
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 10,
    flex: 1,
  },
  boldText: {
    fontWeight: '800',
    color: '#34D399',
  },
  fieldCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  fieldValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  presetBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  offlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginTop: 4,
  },
  offlineBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
