/**
 * ConfigScreen.tsx - Pantalla Principal de Configuración del Asistente y Vehículo
 * CamperSites Pro - Camper, Camión y Reparto
 * 
 * Centraliza:
 * 1. Ficha técnica y gálibo del vehículo (altura, ancho, largo, peso, combustible, distintivo DGT)
 * 2. Personalización de icono de vehículo en ruta (rotación 360°)
 * 3. Alertas sonoras, canales de audio (Multimedia / Bluetooth HFP) y distancias de preaviso
 * 4. Modos profesionales (Tacógrafo digital CE 561/2006 y Reparto TSP)
 * 5. Mapas offline y visualización
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CamperSitesTheme as theme } from '../theme';
import { VEHICLE_CURSORS, VehicleCursorType, AudioAlertMode } from '../types/assistant';
import { AudioAlertService } from '../services/AudioAlertService';
import { OfflineManager } from '../features/premium';

const VEHICLE_STORAGE_KEY = '@camper_vehicle_config';
const PREFERENCES_STORAGE_KEY = '@camper_driving_preferences';

export interface VehicleConfig {
  type: string;
  height: string;
  width: string;
  length: string;
  weight: string;
  axles: string;
  fuelType: string;
  rangeKm: string;
  tankCapacity: string;
  avgConsumption: string;
  environmentalBadge: string;
  name: string;
}

const VEHICLE_TYPES = [
  { key: 'coche', label: 'Coche', emoji: '🚗', maxHeight: 1.5, maxWidth: 1.9, maxLength: 4.5 },
  { key: 'furgoneta', label: 'Furgoneta Camper', emoji: '🚐', maxHeight: 2.6, maxWidth: 2.0, maxLength: 6.0 },
  { key: 'autocaravana_s', label: 'Autocaravana <6m', emoji: '🏕️', maxHeight: 3.0, maxWidth: 2.3, maxLength: 5.9 },
  { key: 'autocaravana_m', label: 'Autocaravana 6-7m', emoji: '🚌', maxHeight: 3.2, maxWidth: 2.3, maxLength: 7.0 },
  { key: 'autocaravana_l', label: 'Autocaravana >7m', emoji: '🚍', maxHeight: 3.5, maxWidth: 2.5, maxLength: 9.0 },
  { key: 'caravana', label: 'Coche + Caravana', emoji: '🏠', maxHeight: 2.8, maxWidth: 2.3, maxLength: 10.0 },
  { key: 'camion_rigido', label: 'Camión Rígido / Pesado', emoji: '🚚', maxHeight: 3.8, maxWidth: 2.5, maxLength: 10.0 },
  { key: 'camion_trailer', label: 'Tráiler / Articulado', emoji: '🚛', maxHeight: 4.0, maxWidth: 2.55, maxLength: 16.5 },
  { key: 'furgon_reparto', label: 'Reparto Última Milla', emoji: '📦', maxHeight: 2.7, maxWidth: 2.1, maxLength: 6.5 },
  { key: 'custom', label: 'Personalizado', emoji: '📐', maxHeight: 0, maxWidth: 0, maxLength: 0 },
];

export default function ConfigScreen() {
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig>({
    type: '', height: '', width: '', length: '', weight: '', axles: '2',
    fuelType: 'diesel', rangeKm: '', tankCapacity: '', avgConsumption: '',
    environmentalBadge: 'C', name: '',
  });
  const [tempVehicle, setTempVehicle] = useState<VehicleConfig>({
    type: '', height: '', width: '', length: '', weight: '', axles: '2',
    fuelType: 'diesel', rangeKm: '', tankCapacity: '', avgConsumption: '',
    environmentalBadge: 'C', name: '',
  });
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  // Cursor del vehículo
  const [selectedCursor, setSelectedCursor] = useState<VehicleCursorType>('camper_arca');

  // Preferencias de alertas
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [radarDistance, setRadarDistance] = useState<number>(1000);
  const [controlDistance, setControlDistance] = useState<number>(5000);
  const [clearanceDistance, setClearanceDistance] = useState<number>(1000);
  const [audioAlertMode, setAudioAlertMode] = useState<AudioAlertMode>('multimedia');
  const [tachographEnabled, setTachographEnabled] = useState<boolean>(true);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  useEffect(() => {
    loadVehicleConfig();
    loadDrivingPreferences();
    loadVehicleCursor();
  }, []);

  const loadVehicleCursor = async () => {
    try {
      const saved = await AsyncStorage.getItem('@camper_cursor_type');
      if (saved) setSelectedCursor(saved as VehicleCursorType);
    } catch (e) {}
  };

  const loadVehicleConfig = async () => {
    try {
      const saved = await AsyncStorage.getItem(VEHICLE_STORAGE_KEY);
      if (saved) setVehicleConfig(JSON.parse(saved));
    } catch (e) {}
  };

  const saveVehicleConfig = async (config: VehicleConfig) => {
    try {
      await AsyncStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(config));
      setVehicleConfig(config);
      setShowVehicleModal(false);
      Alert.alert('¡Guardado!', 'Ficha técnica actualizada correctamente.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  const loadDrivingPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.radarAlertDistance) setRadarDistance(p.radarAlertDistance);
        if (p.controlAlertDistance) setControlDistance(p.controlAlertDistance);
        if (p.clearanceAlertDistance) setClearanceDistance(p.clearanceAlertDistance);
        if (p.audioMode) setAudioAlertMode(p.audioMode);
        if (p.tachographWarningsEnabled !== undefined) setTachographEnabled(p.tachographWarningsEnabled);
      }
    } catch (e) {}
  };

  const updatePreference = async (key: string, value: any) => {
    try {
      const saved = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      const current = saved ? JSON.parse(saved) : {};
      const updated = { ...current, [key]: value };
      await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
      if (key === 'audioMode') {
        AudioAlertService.setAudioMode(value);
      }
    } catch (e) {}
  };

  const handleSelectVehicleType = (type: typeof VEHICLE_TYPES[0]) => {
    if (type.key === 'custom') {
      setTempVehicle({ ...tempVehicle, type: 'custom' });
    } else {
      setTempVehicle({
        ...tempVehicle,
        type: type.key,
        height: type.maxHeight > 0 ? type.maxHeight.toString() : tempVehicle.height,
        width: type.maxWidth > 0 ? type.maxWidth.toString() : tempVehicle.width,
        length: type.maxLength > 0 ? type.maxLength.toString() : tempVehicle.length,
        weight: type.key.includes('camion') ? '18000' : '3500',
        axles: type.key === 'camion_trailer' ? '5' : type.key === 'camion_rigido' ? '3' : '2',
        fuelType: tempVehicle.fuelType || 'diesel',
        environmentalBadge: tempVehicle.environmentalBadge || 'C',
        name: type.label,
      });
    }
  };

  const openVehicleModal = () => {
    setTempVehicle({ ...vehicleConfig });
    setShowVehicleModal(true);
  };

  const getVehicleEmoji = () => {
    const found = VEHICLE_TYPES.find(v => v.key === vehicleConfig.type);
    return found?.emoji || '🚐';
  };

  return (
    <View style={styles.container}>
      {/* Header con Logo Oficial de la App */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="cover"
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Ajustes y Vehículo</Text>
            <Text style={styles.headerSubtitle}>Configuración del Asistente de Ruta</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 1. SECCIÓN VEHÍCULO & FICHA TÉCNICA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚐 Ficha Técnica del Vehículo</Text>
          <TouchableOpacity style={styles.card} onPress={openVehicleModal} activeOpacity={0.7}>
            <Text style={styles.vehicleEmoji}>{getVehicleEmoji()}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {vehicleConfig.name || 'Configurar dimensiones del vehículo'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {vehicleConfig.height ? `↕ ${vehicleConfig.height}m de alto` : 'Esencial para evitar túneles bajos'} · {vehicleConfig.weight ? `⚖️ ${vehicleConfig.weight}kg` : 'MMA'}
              </Text>
            </View>
            <Icon name="pencil" size={20} color={theme.colors.primary.main} />
          </TouchableOpacity>

          {vehicleConfig.type ? (
            <View style={styles.dimRow}>
              {vehicleConfig.height ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimText}>↕ {vehicleConfig.height}m alto</Text>
                </View>
              ) : null}
              {vehicleConfig.width ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimText}>↔ {vehicleConfig.width}m ancho</Text>
                </View>
              ) : null}
              {vehicleConfig.length ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimText}>📏 {vehicleConfig.length}m largo</Text>
                </View>
              ) : null}
              {vehicleConfig.fuelType ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimText}>⛽ {vehicleConfig.fuelType.toUpperCase()}</Text>
                </View>
              ) : null}
              {vehicleConfig.environmentalBadge ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimText}>🏷️ ZBE: {vehicleConfig.environmentalBadge}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.hintText}>
            El navegador calculará rutas esquivando puentes inferiores a tu altura + 15cm de margen de seguridad.
          </Text>
        </View>

        {/* 2. SECCIÓN ICONO DEL VEHÍCULO EN RUTA (ROTACIÓN 360°) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Icono del Vehículo en Ruta (360°)</Text>
          <Text style={styles.hintText}>
            Selecciona el modelo que rota en el mapa según el rumbo exacto del GPS
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cursorScrollContent}
            style={styles.cursorScrollView}>
            {(Object.keys(VEHICLE_CURSORS) as VehicleCursorType[]).map((cKey) => {
              const cur = VEHICLE_CURSORS[cKey];
              const isSelected = selectedCursor === cKey;
              return (
                <TouchableOpacity
                  key={cKey}
                  activeOpacity={0.8}
                  onPress={async () => {
                    setSelectedCursor(cKey);
                    await AsyncStorage.setItem('@camper_cursor_type', cKey);
                  }}
                  style={[
                    styles.cursorChoiceCard,
                    isSelected && styles.cursorChoiceCardActive,
                  ]}>
                  <View style={[styles.cursorBadgeIcon, isSelected && { backgroundColor: cur.color + '22' }]}>
                    <Text style={{ fontSize: 26 }}>{cur.badge}</Text>
                  </View>
                  <Text
                    style={[styles.cursorChoiceLabel, isSelected && { color: cur.color, fontWeight: '800' }]}
                    numberOfLines={1}>
                    {cur.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.cursorSelectedBadge}>
                      <Icon name="check-circle" size={16} color={cur.color} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. SECCIÓN AUDIO Y ALERTAS SONORAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Avisos Sonoros y Canales de Audio</Text>
          <View style={styles.cardBox}>
            <View style={styles.settingRow}>
              <View style={[styles.iconPod, { backgroundColor: '#FF6F0015' }]}>
                <Icon name="volume-high" size={22} color="#FF6F00" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.settingTitle}>Avisos de Voz y Pitidos Acústicos</Text>
                <Text style={styles.settingSubtitle}>Exceso de velocidad, radares y gálibos</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={v => {
                  setSoundEnabled(v);
                  updatePreference('soundEnabled', v);
                }}
                trackColor={{ false: '#CBD5E1', true: theme.colors.primary.light }}
                thumbColor={soundEnabled ? theme.colors.primary.main : '#F8FAFC'}
              />
            </View>

            <View style={styles.divider} />

            {/* Selector de Canal de Audio */}
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.subHeading}>Canal de Salida de Audio:</Text>
              <View style={styles.btnRow}>
                {[
                  { key: 'multimedia', label: 'Altavoz / Multimedia', icon: 'volume-high' },
                  { key: 'bluetooth_hfp', label: 'Bluetooth HFP', icon: 'bluetooth-audio' },
                  { key: 'silent_visual', label: 'Silencioso', icon: 'volume-off' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.choiceBtn,
                      audioAlertMode === opt.key && styles.choiceBtnActive,
                    ]}
                    onPress={() => {
                      setAudioAlertMode(opt.key as AudioAlertMode);
                      updatePreference('audioMode', opt.key);
                    }}>
                    <Icon name={opt.icon} size={16} color={audioAlertMode === opt.key ? '#FFFFFF' : '#64748B'} />
                    <Text style={[styles.choiceBtnText, audioAlertMode === opt.key && styles.choiceBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Distancia de Preaviso para Radares */}
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.subHeading}>Distancia de Aviso - Radares:</Text>
              <View style={styles.btnRow}>
                {[500, 1000, 2000].map(dist => (
                  <TouchableOpacity
                    key={dist}
                    style={[
                      styles.choiceBtn,
                      radarDistance === dist && styles.choiceBtnActive,
                    ]}
                    onPress={() => {
                      setRadarDistance(dist);
                      updatePreference('radarAlertDistance', dist);
                    }}>
                    <Text style={[styles.choiceBtnText, radarDistance === dist && styles.choiceBtnTextActive]}>
                      {dist >= 1000 ? `${dist / 1000} km` : `${dist} m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Distancia de Preaviso para Controles Policiales */}
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.subHeading}>Distancia de Aviso - Controles Policiales:</Text>
              <View style={styles.btnRow}>
                {[2000, 5000, 10000].map(dist => (
                  <TouchableOpacity
                    key={dist}
                    style={[
                      styles.choiceBtn,
                      controlDistance === dist && styles.choiceBtnActive,
                    ]}
                    onPress={() => {
                      setControlDistance(dist);
                      updatePreference('controlAlertDistance', dist);
                    }}>
                    <Text style={[styles.choiceBtnText, controlDistance === dist && styles.choiceBtnTextActive]}>
                      {dist / 1000} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 4. SECCIÓN ASISTENTE PROFESIONAL (TACÓGRAFO Y REPARTO) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Modos Profesionales (Camión & Reparto)</Text>
          <View style={styles.cardBox}>
            <View style={styles.settingRow}>
              <View style={[styles.iconPod, { backgroundColor: '#F59E0B15' }]}>
                <Icon name="clock-alert-outline" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.settingTitle}>Avisos Tacógrafo Digital UE</Text>
                <Text style={styles.settingSubtitle}>Alerta 45 min antes de las 4h 30m de conducción</Text>
              </View>
              <Switch
                value={tachographEnabled}
                onValueChange={v => {
                  setTachographEnabled(v);
                  updatePreference('tachographWarningsEnabled', v);
                }}
                trackColor={{ false: '#CBD5E1', true: theme.colors.primary.light }}
                thumbColor={tachographEnabled ? theme.colors.primary.main : '#F8FAFC'}
              />
            </View>
          </View>
        </View>

        {/* 5. SECCIÓN MAPAS OFFLINE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Mapas Offline y Rendimiento</Text>
          <TouchableOpacity style={styles.card} onPress={() => setShowOfflineModal(true)} activeOpacity={0.7}>
            <View style={[styles.iconPod, { backgroundColor: '#0284C715' }]}>
              <Icon name="map-down" size={24} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Descargar Mapas para Navegación Offline</Text>
              <Text style={styles.cardSubtitle}>Navega en puertos de montaña o zonas sin cobertura 4G/5G</Text>
            </View>
            <Icon name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ============================================ */}
      {/* MODAL CONFIGURACIÓN TÉCNICA VEHÍCULO */}
      {/* ============================================ */}
      <Modal visible={showVehicleModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚐 Ficha Técnica del Vehículo</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Icon name="close" size={24} color="#334155" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Selecciona tipo base de vehículo:</Text>
              <View style={styles.typeGrid}>
                {VEHICLE_TYPES.map(vt => (
                  <TouchableOpacity
                    key={vt.key}
                    style={[
                      styles.typeBtn,
                      tempVehicle.type === vt.key && styles.typeBtnActive,
                    ]}
                    onPress={() => handleSelectVehicleType(vt)}>
                    <Text style={{ fontSize: 20 }}>{vt.emoji}</Text>
                    <Text style={[styles.typeBtnText, tempVehicle.type === vt.key && styles.typeBtnTextActive]}>
                      {vt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Nombre / Apodo:</Text>
              <TextInput
                style={styles.textInput}
                value={tempVehicle.name}
                onChangeText={t => setTempVehicle({ ...tempVehicle, name: t })}
                placeholder="Ej. Mi Camper Fiat ARCA"
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>↕ Altura (m):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempVehicle.height}
                    onChangeText={t => setTempVehicle({ ...tempVehicle, height: t })}
                    keyboardType="numeric"
                    placeholder="2.80"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>↔ Ancho (m):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempVehicle.width}
                    onChangeText={t => setTempVehicle({ ...tempVehicle, width: t })}
                    keyboardType="numeric"
                    placeholder="2.10"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>📏 Longitud (m):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempVehicle.length}
                    onChangeText={t => setTempVehicle({ ...tempVehicle, length: t })}
                    keyboardType="numeric"
                    placeholder="6.40"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>⚖️ Peso / MMA (kg):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempVehicle.weight}
                    onChangeText={t => setTempVehicle({ ...tempVehicle, weight: t })}
                    keyboardType="numeric"
                    placeholder="3500"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>🛣️ Número de Ejes:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempVehicle.axles}
                    onChangeText={t => setTempVehicle({ ...tempVehicle, axles: t })}
                    keyboardType="numeric"
                    placeholder="2"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowVehicleModal(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSave}
                onPress={() => saveVehicleConfig(tempVehicle)}>
                <Text style={styles.btnSaveText}>Guardar Ficha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Mapas Offline */}
      <Modal visible={showOfflineModal} animationType="slide" onRequestClose={() => setShowOfflineModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: 48 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>🗺️ Descarga de Mapas Offline</Text>
            <TouchableOpacity onPress={() => setShowOfflineModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            <OfflineManager />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#0F172A',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#38BDF8',
    marginRight: 14,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 8, letterSpacing: -0.2 },
  hintText: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  vehicleEmoji: { fontSize: 32, marginRight: 14 },
  dimRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  dimBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dimText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  cursorScrollView: { marginTop: 10, marginBottom: 4 },
  cursorScrollContent: { paddingRight: 10, gap: 10 },
  cursorChoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    width: 108,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cursorChoiceCardActive: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  cursorBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cursorChoiceLabel: { fontSize: 11, fontWeight: '600', color: '#334155', textAlign: 'center' },
  cursorSelectedBadge: { position: 'absolute', top: 6, right: 6 },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  iconPod: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  settingSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  subHeading: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8 },
  btnRow: { flexDirection: 'row', gap: 8 },
  choiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  choiceBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#0284C7',
  },
  choiceBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  choiceBtnTextActive: { color: '#FFFFFF', fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 },
  textInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeBtn: {
    width: '31%',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeBtnActive: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  typeBtnText: { fontSize: 10, fontWeight: '700', color: '#475569', marginTop: 4, textAlign: 'center' },
  typeBtnTextActive: { color: '#065F46', fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancel: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center' },
  btnCancelText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  btnSave: { flex: 2, paddingVertical: 12, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center' },
  btnSaveText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
