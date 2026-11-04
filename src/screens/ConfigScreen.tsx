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
import {
  AudioAlertService,
  VoicePreferences,
  VoiceNotificationLevel,
  DEFAULT_VOICE_PREFERENCES,
} from '../services/AudioAlertService';
import { CockpitNightModeService, CockpitThemeMode } from '../services/CockpitNightModeService';
import { OfflineVaultManager } from '../components/OfflineVaultManager';
import { UpdateService } from '../services/UpdateService';
import {
  languageService,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '../services/LanguageService';
import {
  routeHistoryService,
  RouteHistorySettings,
} from '../services/RouteHistoryService';
import { AdminDashboardModal, AdminTab } from '../components/AdminDashboardModal';

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
  { key: 'furgoneta', label: 'Furgoneta Camper', emoji: '🚐', maxHeight: 2.6, maxWidth: 2.0, maxLength: 6.0 },
  { key: 'autocaravana_s', label: 'Autocaravana <6m', emoji: '🏕️', maxHeight: 3.0, maxWidth: 2.3, maxLength: 5.9 },
  { key: 'autocaravana_m', label: 'Autocaravana 6-7m', emoji: '🚌', maxHeight: 3.2, maxWidth: 2.3, maxLength: 7.0 },
  { key: 'autocaravana_l', label: 'Autocaravana >7m', emoji: '🚍', maxHeight: 3.5, maxWidth: 2.5, maxLength: 9.0 },
  { key: 'caravana', label: 'Coche + Caravana', emoji: '🏠', maxHeight: 2.8, maxWidth: 2.3, maxLength: 10.0 },
  { key: 'moto_trail', label: 'Moto Trail / Monte', emoji: '🏍️', maxHeight: 1.4, maxWidth: 0.95, maxLength: 2.2 },
  { key: 'moto_carretera', label: 'Moto Carretera / Sport', emoji: '🏁', maxHeight: 1.25, maxWidth: 0.85, maxLength: 2.1 },
  { key: 'offroad_4x4', label: '4x4 Off-Road / Overland', emoji: '🚙', maxHeight: 2.15, maxWidth: 2.0, maxLength: 4.9 },
  { key: 'coche', label: 'Coche Turismo / SUV', emoji: '🚗', maxHeight: 1.6, maxWidth: 1.9, maxLength: 4.5 },
  { key: 'bicicleta_mtb', label: 'Bicicleta MTB / Gravel', emoji: '🚵', maxHeight: 1.2, maxWidth: 0.7, maxLength: 1.8 },
  { key: 'camion_rigido', label: 'Camión Rígido / Pesado', emoji: '🚚', maxHeight: 3.8, maxWidth: 2.5, maxLength: 10.0 },
  { key: 'camion_trailer', label: 'Tráiler / Articulado', emoji: '🚛', maxHeight: 4.0, maxWidth: 2.55, maxLength: 16.5 },
  { key: 'furgon_reparto', label: 'Courier / Furgón Pro', emoji: '🚐💨', maxHeight: 2.7, maxWidth: 2.1, maxLength: 6.5 },
  { key: 'sos_rescate', label: 'Modo SOS / Perdido', emoji: '🆘', maxHeight: 0, maxWidth: 0, maxLength: 0 },
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
  const [cockpitThemeMode, setCockpitThemeMode] = useState<CockpitThemeMode>(CockpitNightModeService.getMode());
  const [voicePrefs, setVoicePrefs] = useState<VoicePreferences>(AudioAlertService.getVoicePreferences());
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(languageService.getLanguage());

  // Configuración de Historial de Rutas y Panel Admin
  const [historySettings, setHistorySettings] = useState<RouteHistorySettings>({
    enabled: true,
    maxEntries: 50,
    autoCleanDays: 90,
    saveCustomWaypoints: true,
  });
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<AdminTab>('servers');

  const handleUpdateVoicePref = (key: keyof VoicePreferences, val: any) => {
    const updated = { ...voicePrefs, [key]: val };
    setVoicePrefs(updated);
    AudioAlertService.setVoicePreferences({ [key]: val });
    AsyncStorage.setItem('@camper_voice_preferences', JSON.stringify(updated)).catch(() => {});
  };

  useEffect(() => {
    loadVehicleConfig();
    loadDrivingPreferences();
    loadVehicleCursor();
    loadHistoryConfig();
    const unsub = languageService.subscribe(l => setCurrentLang(l));
    return () => unsub();
  }, []);

  const loadHistoryConfig = async () => {
    try {
      const [s, h] = await Promise.all([
        routeHistoryService.getSettings(),
        routeHistoryService.getHistory(),
      ]);
      setHistorySettings(s);
      setHistoryCount(h.length);
    } catch {}
  };

  const handleUpdateHistorySetting = async (patch: Partial<RouteHistorySettings>) => {
    const updated = await routeHistoryService.updateSettings(patch);
    setHistorySettings(updated);
  };

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

        {/* 1.5 SECCIÓN IDIOMA DE LA APLICACIÓN (i18n) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 Idioma de la Aplicación / Language</Text>
          <Text style={styles.hintText}>
            Selecciona el idioma del copiloto, avisos y fichas de pernocta en Europa
          </Text>
          <View style={[styles.btnRow, { marginTop: 8 }]}>
            {SUPPORTED_LANGUAGES.map(lang => {
              const isSelected = currentLang === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  activeOpacity={0.8}
                  style={[
                    styles.choiceBtn,
                    isSelected && styles.choiceBtnActive,
                    { flex: 1, marginHorizontal: 3, paddingVertical: 10 },
                  ]}
                  onPress={async () => {
                    await languageService.setLanguage(lang.code);
                    setCurrentLang(lang.code);
                    Alert.alert(
                      'Idioma Actualizado',
                      `La aplicación ahora está configurada en ${lang.nativeName} (${lang.flag}).`
                    );
                  }}>
                  <Text style={{ fontSize: 20, marginBottom: 2 }}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.choiceBtnText,
                      isSelected && styles.choiceBtnTextActive,
                      { fontSize: 11 },
                    ]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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

              {/* Botón de Test de Voz de Cabina */}
              <TouchableOpacity
                style={styles.testVoiceBtn}
                activeOpacity={0.8}
                onPress={() => {
                  AudioAlertService.speak(
                    'Sistema de voz Cockpit CamperSites Pro verificado. Radar fijo a quinientos metros, límite noventa. Conducción asistida activa.'
                  );
                }}>
                <Icon name="account-voice" size={18} color="#0284C7" />
                <Text style={styles.testVoiceBtnText}>🔊 Probar Locución Cockpit por Altavoz</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* SELECCIÓN DE MODO DE LOCUCIÓN DE VOZ */}
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.subHeading}>Modo de Locución de Voz:</Text>
              <Text style={styles.settingSubtitle}>
                Elige qué tipo de notificaciones quieres que se pronuncien en voz alta
              </Text>
              <View style={[styles.btnRow, { marginTop: 6, flexWrap: 'wrap' }]}>
                {[
                  { key: 'safety_only', label: '🛡️ Solo Alertas (Recom.)', desc: 'Radares, gálibo y velocidad' },
                  { key: 'radars_only', label: '🚨 Solo Radares DGT', desc: 'Radares y velocidad' },
                  { key: 'all', label: '🧭 Completo', desc: 'Alertas y maniobras' },
                  { key: 'mute', label: '🔇 Silencio', desc: 'Solo HUD visual' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.choiceBtn,
                      { minWidth: '48%', marginBottom: 6 },
                      voicePrefs.level === opt.key && styles.choiceBtnActive,
                    ]}
                    onPress={() => handleUpdateVoicePref('level', opt.key)}>
                    <Text style={[styles.choiceBtnText, voicePrefs.level === opt.key && styles.choiceBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* INTERRUPTORES GRANULARES DE VOZ */}
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.subHeading}>Personalización de Avisos de Voz:</Text>

              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Avisos de Radares DGT</Text>
                  <Text style={styles.settingSubtitle}>Radares fijos, de tramo, túneles y semáforos</Text>
                </View>
                <Switch
                  value={voicePrefs.announceRadars}
                  onValueChange={v => handleUpdateVoicePref('announceRadars', v)}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Alerta de Exceso de Velocidad</Text>
                  <Text style={styles.settingSubtitle}>Aviso al rebasar el límite oficial R-301</Text>
                </View>
                <Switch
                  value={voicePrefs.announceSpeedLimit}
                  onValueChange={v => handleUpdateVoicePref('announceSpeedLimit', v)}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Alerta Crítica de Gálibo</Text>
                  <Text style={styles.settingSubtitle}>Aviso ante pasos inferiores y puentes bajos</Text>
                </View>
                <Switch
                  value={voicePrefs.announceClearanceDanger}
                  onValueChange={v => handleUpdateVoicePref('announceClearanceDanger', v)}
                  trackColor={{ false: '#334155', true: '#DC2626' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Instrucciones de Maniobras (Giro a Giro)</Text>
                  <Text style={styles.settingSubtitle}>Salidas de autovía, bifurcaciones y rotondas</Text>
                </View>
                <Switch
                  value={voicePrefs.announceTurnByTurn}
                  onValueChange={v => handleUpdateVoicePref('announceTurnByTurn', v)}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Locución al pulsar botones (Feedback)</Text>
                  <Text style={styles.settingSubtitle}>Desactivado para no hablar en cada toque de pantalla</Text>
                </View>
                <Switch
                  value={voicePrefs.announceUiFeedback}
                  onValueChange={v => handleUpdateVoicePref('announceUiFeedback', v)}
                  trackColor={{ false: '#334155', true: '#0284C7' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Selector de Modo Noche / Visión Nocturna de Cabina */}
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.subHeading}>Visión de Pantalla en Cabina:</Text>
              <Text style={styles.settingSubtitle}>
                {cockpitThemeMode === 'auto'
                  ? '☀️/🌙 Automático: Conmuta al anochecer, amanecer o dentro de túneles'
                  : cockpitThemeMode === 'night'
                  ? '🌙 Modo Noche Forzado: Fondo OLED oscuro anti-deslumbramiento'
                  : '☀️ Modo Día Forzado: Máximo contraste a plena luz'}
              </Text>
              <View style={[styles.btnRow, { marginTop: 8 }]}>
                {[
                  { key: 'auto', label: 'Auto (Sol/Túnel)', icon: 'weather-sunset' },
                  { key: 'day', label: 'Día', icon: 'white-balance-sunny' },
                  { key: 'night', label: 'Noche OLED', icon: 'weather-night' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.choiceBtn,
                      cockpitThemeMode === opt.key && styles.choiceBtnActive,
                    ]}
                    onPress={() => {
                      setCockpitThemeMode(opt.key as CockpitThemeMode);
                      CockpitNightModeService.setMode(opt.key as CockpitThemeMode);
                    }}>
                    <Icon name={opt.icon} size={16} color={cockpitThemeMode === opt.key ? '#FFFFFF' : '#64748B'} />
                    <Text style={[styles.choiceBtnText, cockpitThemeMode === opt.key && styles.choiceBtnTextActive]}>
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

        {/* 5. SECCIÓN HISTORIAL DE RUTAS Y PRIVACIDAD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📜 Historial de Rutas y Privacidad</Text>
          <View style={styles.cardBox}>
            <View style={styles.settingRow}>
              <View style={[styles.iconPod, { backgroundColor: '#38BDF815' }]}>
                <Icon name="history" size={22} color="#38BDF8" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.settingTitle}>Guardar Historial de Rutas Automáticamente</Text>
                <Text style={styles.settingSubtitle}>
                  Rutas guardadas actualmente: {historyCount} trayectos
                </Text>
              </View>
              <Switch
                value={historySettings.enabled}
                onValueChange={v => handleUpdateHistorySetting({ enabled: v })}
                trackColor={{ false: '#CBD5E1', true: theme.colors.primary.light }}
                thumbColor={historySettings.enabled ? theme.colors.primary.main : '#F8FAFC'}
              />
            </View>

            <View style={styles.divider} />

            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.subHeading}>Retención Automática del Historial:</Text>
              <View style={styles.btnRow}>
                {[
                  { days: 7, label: '7 días' },
                  { days: 30, label: '30 días' },
                  { days: 90, label: '90 días' },
                  { days: 365, label: '1 año' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.days}
                    style={[
                      styles.choiceBtn,
                      historySettings.autoCleanDays === opt.days && styles.choiceBtnActive,
                    ]}
                    onPress={() => handleUpdateHistorySetting({ autoCleanDays: opt.days })}>
                    <Text
                      style={[
                        styles.choiceBtnText,
                        historySettings.autoCleanDays === opt.days && styles.choiceBtnTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.subHeading}>Máximo de Rutas Guardadas:</Text>
              <View style={styles.btnRow}>
                {[25, 50, 100].map(limit => (
                  <TouchableOpacity
                    key={limit}
                    style={[
                      styles.choiceBtn,
                      historySettings.maxEntries === limit && styles.choiceBtnActive,
                    ]}
                    onPress={() => handleUpdateHistorySetting({ maxEntries: limit })}>
                    <Text
                      style={[
                        styles.choiceBtnText,
                        historySettings.maxEntries === limit && styles.choiceBtnTextActive,
                      ]}>
                      {limit} rutas
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {historyCount > 0 && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    gap: 6,
                  }}
                  onPress={() => {
                    Alert.alert(
                      'Borrar Historial de Rutas',
                      '¿Seguro que deseas eliminar todas las rutas guardadas?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Borrar Todo',
                          style: 'destructive',
                          onPress: async () => {
                            await routeHistoryService.clearAllHistory();
                            setHistoryCount(0);
                            Alert.alert('Historial limpio', 'Se han eliminado todas las rutas.');
                          },
                        },
                      ]
                    );
                  }}>
                  <Icon name="trash-can-outline" size={18} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13 }}>
                    Vaciar Historial de Rutas ({historyCount})
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* 5.5 CENTRO DE MANDO ADMIN Y SOPORTE EN TIEMPO REAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ Panel de Admin y Estado de Servidores</Text>
          <TouchableOpacity
            style={[styles.card, { borderColor: '#F59E0B', borderWidth: 1.5 }]}
            onPress={() => {
              setAdminInitialTab('servers');
              setShowAdminModal(true);
            }}
            activeOpacity={0.75}>
            <View style={[styles.iconPod, { backgroundColor: '#F59E0B20' }]}>
              <Icon name="shield-crown" size={24} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Abrir Panel de Administración (Tiempo Real)</Text>
              <Text style={styles.cardSubtitle}>
                Estado de servidores en vivo, latencia, incidencias de usuarios, KPIs y finanzas
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color="#F59E0B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { marginTop: 10 }]}
            onPress={() => {
              setAdminInitialTab('incidents');
              setShowAdminModal(true);
            }}
            activeOpacity={0.75}>
            <View style={[styles.iconPod, { backgroundColor: '#EF444418' }]}>
              <Icon name="alert-octagon" size={24} color="#EF4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Reportar Problema, Incidencia o Alerta SOS</Text>
              <Text style={styles.cardSubtitle}>
                Envía un reporte inmediato al Centro de Mando si detectas un fallo o peligro
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 6. SECCIÓN MAPAS OFFLINE */}
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

        {/* 7. SECCIÓN ACTUALIZACIONES Y ESTADO DEL SISTEMA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Actualizaciones del Asistente</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => UpdateService.promptIfUpdateAvailable(true)}
            activeOpacity={0.7}>
            <View style={[styles.iconPod, { backgroundColor: '#10B98115' }]}>
              <Icon name="cloud-sync" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Buscar Actualizaciones Ahora</Text>
              <Text style={styles.cardSubtitle}>Versión instalada: v1.0.0 • Cartografía y radares DGT</Text>
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

      {/* Modal Bóveda de Puntos y Mapas Offline */}
      <Modal visible={showOfflineModal} animationType="slide" onRequestClose={() => setShowOfflineModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: 48 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>🗺️ Bóveda de Puntos Offline</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#0284C7' }}>Rival de Park4Night Pro & Sygic Truck</Text>
            </View>
            <TouchableOpacity onPress={() => setShowOfflineModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <OfflineVaultManager />
        </View>
      </Modal>

      {/* Modal Centro de Mando Admin en Tiempo Real */}
      <AdminDashboardModal
        visible={showAdminModal}
        initialTab={adminInitialTab}
        onClose={() => setShowAdminModal(false)}
      />
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
  settingTextContainer: { flex: 1, marginRight: 12 },
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
  testVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  testVoiceBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
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
