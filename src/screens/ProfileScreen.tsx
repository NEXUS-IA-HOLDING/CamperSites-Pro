/**
 * ProfileScreen - Perfil, vehículo y reputación
 * CamperSites Pro - YRYS
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
import { supabase } from '../lib/supabase';
import {
  getUserTrustProfile,
  getProgressToNextLevel,
  TRUST_LEVELS,
  type UserTrustProfile,
  type TrustLevel,
} from '../lib/communityAlerts';
import AdminActivationPanel from '../components/AdminActivationPanel';
import { CamperSitesTheme as theme } from '../theme';
import {
  OfflineManager,
  StatsAndAchievements,
  TripPlanner,
  MultiDestinationRoute,
} from '../features/premium';
import { VEHICLE_CURSORS, VehicleCursorType } from '../types/assistant';
import { CamperRewardsModal } from '../components/CamperRewardsModal';
import Geolocation from 'react-native-geolocation-service';
import { AffiliatePartnersModal } from '../components/AffiliatePartnersModal';
import { CamperBookingModal } from '../components/CamperBookingModal';
import { CamperTravelPlannerModal } from '../components/CamperTravelPlannerModal';
import { AdminDashboardModal } from '../components/AdminDashboardModal';
import { adminService } from '../services/AdminService';

const VEHICLE_STORAGE_KEY = '@camper_vehicle_config';

// Tipos de vehículo predefinidos
const VEHICLE_TYPES = [
  { key: 'coche', label: 'Coche', emoji: '🚗', maxHeight: 1.5, maxWidth: 1.9, maxLength: 4.5 },
  { key: 'furgoneta', label: 'Furgoneta Camper', emoji: '🚐', maxHeight: 2.6, maxWidth: 2.0, maxLength: 6.0 },
  { key: 'autocaravana_s', label: 'Autocaravana <6m', emoji: '🏕️', maxHeight: 3.0, maxWidth: 2.3, maxLength: 5.9 },
  { key: 'autocaravana_m', label: 'Autocaravana 6-7m', emoji: '🚌', maxHeight: 3.2, maxWidth: 2.3, maxLength: 7.0 },
  { key: 'autocaravana_l', label: 'Autocaravana >7m', emoji: '🚍', maxHeight: 3.5, maxWidth: 2.5, maxLength: 9.0 },
  { key: 'caravana', label: 'Coche + Caravana', emoji: '🏠', maxHeight: 2.8, maxWidth: 2.3, maxLength: 10.0 },
  { key: 'camion_rigido', label: 'Camión Rígido / Pesado', emoji: '🚚', maxHeight: 3.8, maxWidth: 2.5, maxLength: 10.0 },
  { key: 'camion_trailer', label: 'Tráiler / Articulado', emoji: '🚛', maxHeight: 4.0, maxWidth: 2.55, maxLength: 16.5 },
  { key: 'furgon_reparto', label: 'Courier / Furgón Profesional', emoji: '🚐💨', maxHeight: 2.7, maxWidth: 2.1, maxLength: 6.5 },
  { key: 'custom', label: 'Personalizado', emoji: '📐', maxHeight: 0, maxWidth: 0, maxLength: 0 },
];

export interface VehicleConfig {
  type: string;
  height: string; // metros
  width: string;  // metros
  length: string; // metros
  weight: string; // kg / MMA
  axles: string;  // número de ejes (2, 3, 4+)
  fuelType: string; // diesel, diesel_plus, gasolina, glp, gnc, electrico, hibrido
  rangeKm: string;  // km
  tankCapacity: string; // L o kWh
  avgConsumption: string; // L/100km o kWh/100km
  environmentalBadge: string; // 0, ECO, C, B, SIN_DISTINTIVO
  name: string; // nombre personalizado
}

const PREFERENCES_STORAGE_KEY = '@camper_driving_preferences';

// ============================================
// SETTING ROW
// ============================================
function SettingRow({ icon, iconColor = '#666', title, subtitle, onPress, rightElement }: {
  icon: string; iconColor?: string; title: string; subtitle?: string;
  onPress?: () => void; rightElement?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={onPress ? 0.6 : 1} disabled={!onPress}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '15' }]}>
        <Icon name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <Icon name="chevron-right" size={22} color="#CCC" />)}
    </TouchableOpacity>
  );
}

// ============================================
// TRUST LEVEL CARD
// ============================================
function TrustLevelCard({ trustProfile }: { trustProfile: UserTrustProfile }) {
  const progress = getProgressToNextLevel(trustProfile.trust_score);
  const levelConfig = TRUST_LEVELS[trustProfile.trust_level as TrustLevel] ?? TRUST_LEVELS['NOVATO'];
  const nextLevelConfig = progress.nextLevel ? TRUST_LEVELS[progress.nextLevel] : null;

  return (
    <View style={styles.trustCard}>
      <View style={styles.trustHeader}>
        <View style={[styles.trustBadge, { backgroundColor: levelConfig.color + '20' }]}>
          <Icon name={levelConfig.icon} size={32} color={levelConfig.color} />
        </View>
        <View style={styles.trustInfo}>
          <Text style={styles.trustLevelText}>{levelConfig.label}</Text>
          <Text style={styles.trustPerks}>{levelConfig.perks}</Text>
        </View>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsNumber}>{trustProfile.total_points}</Text>
          <Text style={styles.pointsLabel}>puntos</Text>
        </View>
      </View>

      {nextLevelConfig && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Siguiente: {nextLevelConfig.label}
            </Text>
            <Text style={styles.progressPercent}>{progress.progress}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress.progress}%`, backgroundColor: levelConfig.color }]} />
          </View>
          <Text style={styles.progressHint}>Faltan {progress.pointsNeeded} puntos</Text>
        </View>
      )}

      <View style={styles.trustStats}>
        <View style={styles.trustStat}>
          <Text style={styles.trustStatNum}>{trustProfile.alerts_created}</Text>
          <Text style={styles.trustStatLabel}>Alertas</Text>
        </View>
        <View style={styles.trustStatDivider} />
        <View style={styles.trustStat}>
          <Text style={styles.trustStatNum}>{trustProfile.alerts_confirmed}</Text>
          <Text style={styles.trustStatLabel}>Confirmadas</Text>
        </View>
        <View style={styles.trustStatDivider} />
        <View style={styles.trustStat}>
          <Text style={styles.trustStatNum}>{trustProfile.streak_days}</Text>
          <Text style={styles.trustStatLabel}>Racha</Text>
        </View>
        <View style={styles.trustStatDivider} />
        <View style={styles.trustStat}>
          <Text style={styles.trustStatNum}>
            {trustProfile.alerts_accuracy > 0 ? `${Math.round(trustProfile.alerts_accuracy)}%` : '-'}
          </Text>
          <Text style={styles.trustStatLabel}>Precisión</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================
// MAIN PROFILE SCREEN
// ============================================
export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [trustProfile, setTrustProfile] = useState<UserTrustProfile | null>(null);
  const [activePremiumTool, setActivePremiumTool] = useState<'offline' | 'stats' | 'trips' | 'multidest' | null>(null);

  // Preferencias de Conducción Granulares (Pilar 5)
  const [radarDistance, setRadarDistance] = useState<number>(1000);
  const [controlDistance, setControlDistance] = useState<number>(5000);
  const [clearanceDistance, setClearanceDistance] = useState<number>(1000);
  const [audioAlertMode, setAudioAlertMode] = useState<'multimedia' | 'bluetooth_hfp' | 'silent_visual'>('multimedia');
  const [tachographEnabled, setTachographEnabled] = useState<boolean>(true);

  // Vehículo y Ficha Técnica (Pilar 2)
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig>({
    type: '', height: '', width: '', length: '', weight: '', axles: '2',
    fuelType: 'diesel', rangeKm: '', tankCapacity: '', avgConsumption: '',
    environmentalBadge: 'C', name: '',
  });
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [tempVehicle, setTempVehicle] = useState<VehicleConfig>({
    type: '', height: '', width: '', length: '', weight: '', axles: '2',
    fuelType: 'diesel', rangeKm: '', tankCapacity: '', avgConsumption: '',
    environmentalBadge: 'C', name: '',
  });

  // Cursor del Vehículo en Ruta (Pilar 3)
  const [selectedCursor, setSelectedCursor] = useState<VehicleCursorType>('camper_arca');

  // Club Camper, Puntos Recompensas y Afiliados
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [rewardsGpsSpeedKmH, setRewardsGpsSpeedKmH] = useState(0);

  useEffect(() => {
    let watchId: number | null = null;
    if (showRewardsModal) {
      try {
        Geolocation.getCurrentPosition(
          (pos) => {
            const rawSpeed = pos.coords.speed;
            const spd = rawSpeed && rawSpeed > 0 ? rawSpeed * 3.6 : 0;
            setRewardsGpsSpeedKmH(Math.max(0, spd));
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
        );

        watchId = Geolocation.watchPosition(
          (pos) => {
            const rawSpeed = pos.coords.speed;
            const spd = rawSpeed && rawSpeed > 0 ? rawSpeed * 3.6 : 0;
            setRewardsGpsSpeedKmH(Math.max(0, spd));
          },
          () => {},
          { enableHighAccuracy: true, distanceFilter: 1, interval: 1000 }
        );
      } catch (e) {}
    } else {
      setRewardsGpsSpeedKmH(0);
    }

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [showRewardsModal]);
  const [showAffiliatesModal, setShowAffiliatesModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showTravelPlannerModal, setShowTravelPlannerModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
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

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setIsLoggedIn(true);
      setUserEmail(user.email || '');
      setUserName(user.user_metadata?.display_name || 'Viajero');
      loadTrustProfile();
    }
    // Verificación de credenciales de Administrador Maestro
    try {
      const authCheck = await adminService.verifyAdminAccess();
      setIsAdminAuthorized(authCheck.authorized);
    } catch {
      setIsAdminAuthorized(false);
    }
  };

  const loadTrustProfile = async () => {
    const profile = await getUserTrustProfile();
    if (profile) setTrustProfile(profile);
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
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar');
    }
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

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setIsLoggedIn(false);
          setTrustProfile(null);
        },
      },
    ]);
  };

  const openVehicleModal = () => {
    setTempVehicle({ ...vehicleConfig });
    setShowVehicleModal(true);
  };

  const getVehicleEmoji = () => {
    const found = VEHICLE_TYPES.find(v => v.key === vehicleConfig.type);
    return found?.emoji || '🚐';
  };

  const getVehicleSummary = () => {
    if (!vehicleConfig.type) return 'Sin configurar';
    const parts = [];
    if (vehicleConfig.name) parts.push(vehicleConfig.name);
    if (vehicleConfig.length) parts.push(`${vehicleConfig.length}m`);
    if (vehicleConfig.height) parts.push(`↕${vehicleConfig.height}m`);
    return parts.join(' · ') || 'Configurado';
  };

  return (
    <View style={styles.container}>
      {/* Marca de agua elegante del logo en el fondo */}
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.backgroundCenteredLogo}
        resizeMode="contain"
      />
      {/* Header con Logo Oficial de la App */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="cover"
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>CamperSites Pro</Text>
            <Text style={styles.headerSubtitle}>Asistente Inteligente de Ruta</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* User Card */}
        {isLoggedIn ? (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              {trustProfile ? (
                <Icon name={TRUST_LEVELS[trustProfile.trust_level as TrustLevel]?.icon || 'account'} size={30}
                  color={TRUST_LEVELS[trustProfile.trust_level as TrustLevel]?.color || theme.colors.primary.main} />
              ) : (
                <Icon name="account" size={30} color={theme.colors.primary.main} />
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
            </View>
            {trustProfile && (
              <View style={[styles.levelBadge, { backgroundColor: TRUST_LEVELS[trustProfile.trust_level as TrustLevel]?.color + '20' }]}>
                <Text style={[styles.levelBadgeText, { color: TRUST_LEVELS[trustProfile.trust_level as TrustLevel]?.color }]}>
                  {TRUST_LEVELS[trustProfile.trust_level as TrustLevel]?.label}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.loginCard} onPress={() => Alert.alert('Próximamente', 'Login disponible pronto.')}>
            <View style={styles.loginIconContainer}>
              <Icon name="account-plus" size={32} color={theme.colors.primary.main} />
            </View>
            <View style={styles.loginInfo}>
              <Text style={styles.loginTitle}>Inicia sesión</Text>
              <Text style={styles.loginSubtitle}>Reporta alertas, gana puntos y sube de nivel</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#CCC" />
          </TouchableOpacity>
        )}

        {/* Trust Level Card */}
        {trustProfile && <TrustLevelCard trustProfile={trustProfile} />}

        {/* Tarjeta Ejecutiva de Acceso al Panel de Administración & Finanzas (Solo Admin Autorizado) */}
        {isAdminAuthorized && (
          <TouchableOpacity
            style={styles.adminDashboardBanner}
            onPress={() => setShowAdminDashboard(true)}
            activeOpacity={0.85}>
            <View style={styles.adminBannerIconBox}>
              <Icon name="shield-crown" size={26} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.adminBannerTitle}>PANEL DE ADMINISTRACIÓN</Text>
                <View style={styles.adminLiveBadge}>
                  <Text style={styles.adminLiveText}>EJECUTIVO</Text>
                </View>
              </View>
              <Text style={styles.adminBannerSub}>
                Balances, ganancias, usuarios en vivo, suscripciones y equipo
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color="#38BDF8" />
          </TouchableOpacity>
        )}

        {/* ============================================ */}
        {/* VEHÍCULO - SECCIÓN NUEVA */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚐 Mi vehículo</Text>
          <TouchableOpacity style={styles.vehicleCard} onPress={openVehicleModal} activeOpacity={0.7}>
            <Text style={styles.vehicleEmoji}>{getVehicleEmoji()}</Text>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {vehicleConfig.name || 'Configura tu vehículo'}
              </Text>
              <Text style={styles.vehicleDetails}>{getVehicleSummary()}</Text>
            </View>
            <View style={styles.vehicleAction}>
              <Icon name="pencil" size={18} color={theme.colors.primary.main} />
            </View>
          </TouchableOpacity>
          {vehicleConfig.type && (
            <View style={styles.vehicleDimensions}>
              {vehicleConfig.length ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimIcon}>📏</Text>
                  <Text style={styles.dimText}>{vehicleConfig.length}m largo</Text>
                </View>
              ) : null}
              {vehicleConfig.height ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimIcon}>↕️</Text>
                  <Text style={styles.dimText}>{vehicleConfig.height}m alto</Text>
                </View>
              ) : null}
              {vehicleConfig.width ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimIcon}>↔️</Text>
                  <Text style={styles.dimText}>{vehicleConfig.width}m ancho</Text>
                </View>
              ) : null}
              {vehicleConfig.weight ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimIcon}>⚖️</Text>
                  <Text style={styles.dimText}>{vehicleConfig.weight}kg</Text>
                </View>
              ) : null}
              {vehicleConfig.axles ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimIcon}>🛣️</Text>
                  <Text style={styles.dimText}>{vehicleConfig.axles} ejes</Text>
                </View>
              ) : null}
              {vehicleConfig.fuelType ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimIcon}>⛽</Text>
                  <Text style={styles.dimText}>{vehicleConfig.fuelType.toUpperCase()}</Text>
                </View>
              ) : null}
              {vehicleConfig.environmentalBadge ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimIcon}>🏷️</Text>
                  <Text style={styles.dimText}>ZBE: {vehicleConfig.environmentalBadge}</Text>
                </View>
              ) : null}
              {vehicleConfig.rangeKm ? (
                <View style={styles.dimBadge}>
                  <Text style={styles.dimIcon}>🔋</Text>
                  <Text style={styles.dimText}>{vehicleConfig.rangeKm}km</Text>
                </View>
              ) : null}
            </View>
          )}
          <Text style={styles.vehicleHint}>
            Las rutas se adaptarán a las dimensiones de tu vehículo
          </Text>
        </View>

        {/* ============================================ */}
        {/* ICONO DEL VEHÍCULO EN EL MAPA (Pilar 3) */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Icono del Vehículo en Ruta</Text>
          <Text style={styles.vehicleHint}>
            Personaliza el vehículo que marca tu posición en el mapa y rota 360° en tiempo real
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

        {/* Premium */}
        <TouchableOpacity style={styles.premiumCard} onPress={() => Alert.alert(
          'CamperSites Premium',
          'Acceso ilimitado por 9,99€/mes.\n\n• Sin anuncios\n• Navegación offline\n• Rutas multi-destino\n• Planificador de viajes\n\nPróximamente disponible.',
        )}>
          <View style={styles.premiumContent}>
            <Text style={styles.premiumEmoji}>👑</Text>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>CamperSites Premium</Text>
              <Text style={styles.premiumSubtitle}>Sin anuncios + todas las funciones</Text>
            </View>
          </View>
          <View style={styles.premiumPrice}>
            <Text style={styles.premiumPriceText}>9,99€/mes</Text>
          </View>
        </TouchableOpacity>

        {/* Puntos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ Cómo ganar puntos</Text>
          <View style={styles.sectionCard}>
            {[
              { reason: 'Crear alerta', points: '+10', emoji: '🔔' },
              { reason: 'Primera alerta', points: '+25', emoji: '🌟' },
              { reason: 'Alerta confirmada', points: '+15', emoji: '✅' },
              { reason: '5 confirmaciones', points: '+25', emoji: '👥' },
              { reason: '10 confirmaciones', points: '+50', emoji: '🏆' },
              { reason: 'Confirmar alerta', points: '+3', emoji: '👍' },
              { reason: 'Negar alerta falsa', points: '+2', emoji: '👎' },
              { reason: 'Racha 7 días', points: '+100', emoji: '🔥' },
              { reason: 'Alerta falsa', points: '-20', emoji: '⚠️' },
            ].map((item, index, arr) => (
              <React.Fragment key={item.reason}>
                <View style={styles.pointsGuideRow}>
                  <Text style={styles.pointsEmoji}>{item.emoji}</Text>
                  <Text style={styles.pointsGuideReason}>{item.reason}</Text>
                  <Text style={[styles.pointsGuidePoints, { color: item.points.startsWith('-') ? '#D32F2F' : '#2E7D32' }]}>
                    {item.points}
                  </Text>
                </View>
                {index < arr.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Niveles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎖️ Niveles de confianza</Text>
          <View style={styles.sectionCard}>
            {(['NOVATO', 'EXPLORADOR', 'GUARDIAN', 'VETERANO', 'LEYENDA'] as TrustLevel[]).map((level, index) => {
              const config = TRUST_LEVELS[level];
              const isCurrent = trustProfile?.trust_level === level;
              return (
                <React.Fragment key={level}>
                  <View style={[styles.levelRow, isCurrent && styles.levelRowCurrent]}>
                    <View style={[styles.levelIcon, { backgroundColor: config.color + '15' }]}>
                      <Icon name={config.icon} size={22} color={config.color} />
                    </View>
                    <View style={styles.levelInfo}>
                      <Text style={[styles.levelName, isCurrent && { color: config.color, fontWeight: '700' }]}>
                        {config.label}
                      </Text>
                      <Text style={styles.levelPerks}>{config.perks}</Text>
                    </View>
                    <Text style={styles.levelScore}>{config.minScore}+</Text>
                    {isCurrent && <Icon name="check-circle" size={20} color={config.color} />}
                  </View>
                  {index < 4 && <View style={styles.separator} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Herramientas Premium */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ Herramientas Premium</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="map-down"
              iconColor="#1976D2"
              title="Mapas Offline"
              subtitle="Descarga regiones para navegar sin cobertura"
              onPress={() => setActivePremiumTool('offline')}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="trophy"
              iconColor="#FFB300"
              title="Estadísticas y Logros"
              subtitle="Tus viajes, kilómetros y medallas"
              onPress={() => setActivePremiumTool('stats')}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="calendar-clock"
              iconColor="#2E7D32"
              title="Planificador de Viajes"
              subtitle="Itinerarios multi-día y exportación .ICS"
              onPress={() => setActivePremiumTool('trips')}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="routes"
              iconColor="#E65100"
              title="Ruta Multi-Destino"
              subtitle="Optimización de paradas (algoritmo TSP)"
              onPress={() => setActivePremiumTool('multidest')}
            />
          </View>
        </View>

        {/* Club Camper, Puntos de Recompensa, Afiliados y B2B */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💎 Club Camper, Recompensas y Ventajas</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="crown"
              iconColor="#FFD600"
              title="Pirámide de Niveles & CamperPoints"
              subtitle="Gana puntos, sube de nivel y canjea pases seguros"
              onPress={() => setShowRewardsModal(true)}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="map-clock-outline"
              iconColor="#38BDF8"
              title="Travel Planner & Itinerarios Camper"
              subtitle="Rutas legendarias y planificación multidía por etapas"
              onPress={() => setShowTravelPlannerModal(true)}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="handshake"
              iconColor="#00E676"
              title="Descuentos en GLP, Ferries y Seguros"
              subtitle="Repsol Waylet, Cepsa Gow, Baleària, Trasmed y Allianz"
              onPress={() => setShowAffiliatesModal(true)}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="calendar-check"
              iconColor="#00B0FF"
              title="Central de Reservas B2B de Parcelas"
              subtitle="Reservas garantizadas y códigos PIN de barreras"
              onPress={() => setShowBookingModal(true)}
            />
          </View>
        </View>

        {/* Preferencias de Conducción y Alertas Granulares (Pilar 5) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Preferencias de Conducción y Alertas</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="bell"
              iconColor="#FF6F00"
              title="Notificaciones en Ruta"
              subtitle="Alertas de radares, controles y peligros"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={v => {
                    setNotificationsEnabled(v);
                    updatePreference('notificationsEnabled', v);
                  }}
                  trackColor={{ false: '#DDD', true: theme.colors.primary.light }}
                  thumbColor={notificationsEnabled ? theme.colors.primary.main : '#f4f3f4'}
                />
              }
            />

            {/* Distancia de Preaviso para Radares */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>
                ⚠️ Distancia de Preaviso - Radares:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[500, 1000, 2000].map(dist => (
                  <TouchableOpacity
                    key={dist}
                    style={[
                      { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center' },
                      radarDistance === dist && { borderColor: theme.colors.primary.main, backgroundColor: theme.colors.primary.main + '15' },
                    ]}
                    onPress={() => {
                      setRadarDistance(dist);
                      updatePreference('radarAlertDistance', dist);
                    }}>
                    <Text style={[{ fontSize: 12, fontWeight: '600', color: '#666' }, radarDistance === dist && { color: theme.colors.primary.main, fontWeight: '800' }]}>
                      {dist >= 1000 ? `${dist / 1000} km` : `${dist} m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.separator} />

            {/* Distancia de Preaviso para Controles */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>
                🚔 Distancia de Preaviso - Controles Policiales:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[2000, 5000, 10000].map(dist => (
                  <TouchableOpacity
                    key={dist}
                    style={[
                      { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center' },
                      controlDistance === dist && { borderColor: '#FF6F00', backgroundColor: '#FFF3E0' },
                    ]}
                    onPress={() => {
                      setControlDistance(dist);
                      updatePreference('controlAlertDistance', dist);
                    }}>
                    <Text style={[{ fontSize: 12, fontWeight: '600', color: '#666' }, controlDistance === dist && { color: '#FF6F00', fontWeight: '800' }]}>
                      {dist / 1000} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.separator} />

            {/* Distancia de Preaviso para Gálibos / Puentes Bajos */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>
                🌉 Distancia de Preaviso - Gálibo / Puentes Bajos:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[500, 1000].map(dist => (
                  <TouchableOpacity
                    key={dist}
                    style={[
                      { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center' },
                      clearanceDistance === dist && { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
                    ]}
                    onPress={() => {
                      setClearanceDistance(dist);
                      updatePreference('clearanceAlertDistance', dist);
                    }}>
                    <Text style={[{ fontSize: 12, fontWeight: '600', color: '#666' }, clearanceDistance === dist && { color: '#D32F2F', fontWeight: '800' }]}>
                      {dist >= 1000 ? `${dist / 1000} km` : `${dist} m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.separator} />

            {/* Canal de Audio / Salida Sonora */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>
                🔊 Modo de Aviso de Audio:
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { mode: 'multimedia', label: 'Altavoz / Media', icon: 'volume-high' },
                  { mode: 'bluetooth_hfp', label: 'Bluetooth HFP', icon: 'bluetooth-audio' },
                  { mode: 'silent_visual', label: 'Solo Visual', icon: 'volume-off' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.mode}
                    style={[
                      { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center' },
                      audioAlertMode === opt.mode && { borderColor: '#1976D2', backgroundColor: '#E3F2FD' },
                    ]}
                    onPress={() => {
                      setAudioAlertMode(opt.mode as any);
                      updatePreference('audioMode', opt.mode);
                    }}>
                    <Icon name={opt.icon} size={16} color={audioAlertMode === opt.mode ? '#1976D2' : '#666'} />
                    <Text style={[{ fontSize: 10, fontWeight: '600', color: '#666', marginTop: 2, textAlign: 'center' }, audioAlertMode === opt.mode && { color: '#1976D2', fontWeight: '800' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                * Bluetooth HFP simula una llamada telefónica para pausar la radio del coche al alertar.
              </Text>
            </View>

            <View style={styles.separator} />

            {/* Tacógrafo inteligente */}
            <SettingRow
              icon="clock-digital"
              iconColor="#10B981"
              title="Alarma Tacógrafo (Camiones)"
              subtitle="Alarma inteligente a las 3h 45m para buscar área de descanso antes de las 4h 30m reglamentarias"
              rightElement={
                <Switch
                  value={tachographEnabled}
                  onValueChange={v => {
                    setTachographEnabled(v);
                    updatePreference('tachographWarningsEnabled', v);
                  }}
                  trackColor={{ false: '#DDD', true: theme.colors.primary.light }}
                  thumbColor={tachographEnabled ? theme.colors.primary.main : '#f4f3f4'}
                />
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Cuenta</Text>
          <View style={styles.sectionCard}>
            {/* Panel de activación de administrador */}
            <AdminActivationPanel />
            <View style={styles.separator} />
            <SettingRow icon="information" iconColor="#1976D2" title="Acerca de" subtitle="CamperSites Pro v1.0.0"
              onPress={() => Alert.alert('CamperSites Pro', 'Tu compañero de ruta.\n\nVersión 1.0.0\nYRYS')} />
            <View style={styles.separator} />
            <SettingRow icon="star" iconColor="#FFD700" title="Valorar la app"
              onPress={() => Alert.alert('¡Gracias!', 'Disponible próximamente.')} />
            {isLoggedIn && (
              <>
                <View style={styles.separator} />
                <SettingRow icon="logout" iconColor="#D32F2F" title="Cerrar sesión" onPress={handleLogout} />
              </>
            )}
          </View>
        </View>

        <Text style={styles.version}>CamperSites Pro v1.0.0 — YRYS</Text>
      </ScrollView>

      {/* ============================================ */}
      {/* MODAL CONFIGURACIÓN VEHÍCULO */}
      {/* ============================================ */}
      <Modal visible={showVehicleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚐 Mi vehículo</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Tipo de vehículo */}
              <Text style={styles.modalLabel}>Tipo de vehículo</Text>
              <View style={styles.vehicleTypesGrid}>
                {VEHICLE_TYPES.map(type => {
                  const isSelected = tempVehicle.type === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      style={[styles.vehicleTypeItem, isSelected && styles.vehicleTypeSelected]}
                      onPress={() => handleSelectVehicleType(type)}>
                      <Text style={styles.vehicleTypeEmoji}>{type.emoji}</Text>
                      <Text style={[styles.vehicleTypeLabel, isSelected && styles.vehicleTypeLabelSelected]}
                        numberOfLines={2}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Nombre personalizado */}
              {tempVehicle.type && (
                <>
                  <Text style={styles.modalLabel}>Nombre (opcional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej: Mi Fiat Ducato"
                    placeholderTextColor="#999"
                    value={tempVehicle.name}
                    onChangeText={t => setTempVehicle({ ...tempVehicle, name: t })}
                  />

                  <Text style={styles.modalLabel}>Dimensiones</Text>
                  <View style={styles.dimInputsRow}>
                    <View style={styles.dimInputGroup}>
                      <Text style={styles.dimInputLabel}>📏 Largo (m)</Text>
                      <TextInput
                        style={styles.dimInput}
                        keyboardType="decimal-pad"
                        placeholder="6.0"
                        placeholderTextColor="#BBB"
                        value={tempVehicle.length}
                        onChangeText={t => setTempVehicle({ ...tempVehicle, length: t })}
                      />
                    </View>
                    <View style={styles.dimInputGroup}>
                      <Text style={styles.dimInputLabel}>↕️ Alto (m)</Text>
                      <TextInput
                        style={styles.dimInput}
                        keyboardType="decimal-pad"
                        placeholder="2.8"
                        placeholderTextColor="#BBB"
                        value={tempVehicle.height}
                        onChangeText={t => setTempVehicle({ ...tempVehicle, height: t })}
                      />
                    </View>
                  </View>
                  <View style={styles.dimInputsRow}>
                    <View style={styles.dimInputGroup}>
                      <Text style={styles.dimInputLabel}>↔️ Ancho (m)</Text>
                      <TextInput
                        style={styles.dimInput}
                        keyboardType="decimal-pad"
                        placeholder="2.3"
                        placeholderTextColor="#BBB"
                        value={tempVehicle.width}
                        onChangeText={t => setTempVehicle({ ...tempVehicle, width: t })}
                      />
                    </View>
                    <View style={styles.dimInputGroup}>
                      <Text style={styles.dimInputLabel}>⚖️ Peso (kg)</Text>
                      <TextInput
                        style={styles.dimInput}
                        keyboardType="number-pad"
                        placeholder="3500"
                        placeholderTextColor="#BBB"
                        value={tempVehicle.weight}
                        onChangeText={t => setTempVehicle({ ...tempVehicle, weight: t })}
                      />
                    </View>
                  </View>

                  {/* Número de Ejes y MMA */}
                  <View style={styles.dimInputsRow}>
                    <View style={styles.dimInputGroup}>
                      <Text style={styles.dimInputLabel}>🛣️ Número de Ejes</Text>
                      <TextInput
                        style={styles.dimInput}
                        keyboardType="number-pad"
                        placeholder="2"
                        placeholderTextColor="#BBB"
                        value={tempVehicle.axles}
                        onChangeText={t => setTempVehicle({ ...tempVehicle, axles: t })}
                      />
                    </View>
                    <View style={styles.dimInputGroup}>
                      <Text style={styles.dimInputLabel}>🔋 Autonomía (km)</Text>
                      <TextInput
                        style={styles.dimInput}
                        keyboardType="number-pad"
                        placeholder="650"
                        placeholderTextColor="#BBB"
                        value={tempVehicle.rangeKm}
                        onChangeText={t => setTempVehicle({ ...tempVehicle, rangeKm: t })}
                      />
                    </View>
                  </View>

                  {/* Consumo y Capacidad */}
                  <View style={styles.dimInputsRow}>
                    <View style={styles.dimInputGroup}>
                      <Text style={styles.dimInputLabel}>⛽ Depósito/Batería (L/kWh)</Text>
                      <TextInput
                        style={styles.dimInput}
                        keyboardType="decimal-pad"
                        placeholder="80"
                        placeholderTextColor="#BBB"
                        value={tempVehicle.tankCapacity}
                        onChangeText={t => setTempVehicle({ ...tempVehicle, tankCapacity: t })}
                      />
                    </View>
                    <View style={styles.dimInputGroup}>
                      <Text style={styles.dimInputLabel}>📊 Consumo medio (L/100km)</Text>
                      <TextInput
                        style={styles.dimInput}
                        keyboardType="decimal-pad"
                        placeholder="9.5"
                        placeholderTextColor="#BBB"
                        value={tempVehicle.avgConsumption}
                        onChangeText={t => setTempVehicle({ ...tempVehicle, avgConsumption: t })}
                      />
                    </View>
                  </View>

                  {/* Distintivo Ambiental ZBE */}
                  <Text style={styles.modalLabel}>Distintivo Ambiental DGT / ZBE</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {[
                      { key: '0', label: '🔵 0 Emisiones' },
                      { key: 'ECO', label: '🟢 ECO' },
                      { key: 'C', label: '🟡 Etiqueta C' },
                      { key: 'B', label: '🟠 Etiqueta B' },
                      { key: 'SIN_DISTINTIVO', label: '❌ Sin Distintivo' },
                    ].map(badge => (
                      <TouchableOpacity
                        key={badge.key}
                        style={[
                          { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: '#DDD', backgroundColor: '#FFF' },
                          tempVehicle.environmentalBadge === badge.key && { borderColor: theme.colors.primary.main, backgroundColor: theme.colors.primary.main + '15' },
                        ]}
                        onPress={() => setTempVehicle({ ...tempVehicle, environmentalBadge: badge.key })}>
                        <Text style={[{ fontSize: 11, fontWeight: '600', color: '#666' }, tempVehicle.environmentalBadge === badge.key && { color: theme.colors.primary.main, fontWeight: '800' }]}>
                          {badge.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Tipo de Combustible */}
                  <Text style={styles.modalLabel}>Tipo de Carburante / Propulsión</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {[
                      { key: 'diesel', label: 'Diésel' },
                      { key: 'diesel_plus', label: 'Diésel Plus' },
                      { key: 'gasolina', label: 'Gasolina' },
                      { key: 'glp', label: 'GLP Autogás' },
                      { key: 'gnc', label: 'GNC' },
                      { key: 'electrico', label: '100% Eléctrico' },
                      { key: 'hibrido', label: 'Híbrido' },
                    ].map(fuel => (
                      <TouchableOpacity
                        key={fuel.key}
                        style={[
                          { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: '#DDD', backgroundColor: '#FFF' },
                          tempVehicle.fuelType === fuel.key && { borderColor: '#1976D2', backgroundColor: '#E3F2FD' },
                        ]}
                        onPress={() => setTempVehicle({ ...tempVehicle, fuelType: fuel.key })}>
                        <Text style={[{ fontSize: 11, fontWeight: '600', color: '#666' }, tempVehicle.fuelType === fuel.key && { color: '#1976D2', fontWeight: '800' }]}>
                          {fuel.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowVehicleModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSave, !tempVehicle.type && { opacity: 0.5 }]}
                disabled={!tempVehicle.type}
                onPress={() => saveVehicleConfig(tempVehicle)}>
                <Text style={styles.modalBtnSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ============================================ */}
      {/* MODAL HERRAMIENTAS PREMIUM */}
      {/* ============================================ */}
      <Modal visible={!!activePremiumTool} animationType="slide" onRequestClose={() => setActivePremiumTool(null)}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text.primary }}>
              {activePremiumTool === 'offline' && '🗺️ Mapas Offline'}
              {activePremiumTool === 'stats' && '🏆 Estadísticas y Logros'}
              {activePremiumTool === 'trips' && '🗓️ Planificador de Viajes'}
              {activePremiumTool === 'multidest' && '📍 Ruta Multi-Destino'}
            </Text>
            <TouchableOpacity onPress={() => setActivePremiumTool(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {activePremiumTool === 'offline' && <OfflineManager />}
            {activePremiumTool === 'stats' && <StatsAndAchievements />}
            {activePremiumTool === 'trips' && <TripPlanner />}
            {activePremiumTool === 'multidest' && <MultiDestinationRoute />}
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL CLUB CAMPER & RECOMPENSAS */}
      <CamperRewardsModal
        visible={showRewardsModal}
        currentSpeedKmH={rewardsGpsSpeedKmH}
        onClose={() => setShowRewardsModal(false)}
      />

      {/* MODAL AFILIADOS (GLP, FERRIES, SEGUROS) */}
      <AffiliatePartnersModal
        visible={showAffiliatesModal}
        onClose={() => setShowAffiliatesModal(false)}
      />

      {/* MODAL RESERVAS B2B */}
      <CamperBookingModal
        visible={showBookingModal}
        areaId="area_sierra_madrid_01"
        areaName="Área Camper Sierra Norte (Madrid)"
        onClose={() => setShowBookingModal(false)}
      />

      {/* MODAL TRAVEL PLANNER */}
      <CamperTravelPlannerModal
        visible={showTravelPlannerModal}
        onClose={() => setShowTravelPlannerModal(false)}
        onOpenB2BBooking={() => {
          setShowTravelPlannerModal(false);
          setShowBookingModal(true);
        }}
      />

      {/* MODAL PANEL DE ADMINISTRACIÓN EJECUTIVO */}
      <AdminDashboardModal
        visible={showAdminDashboard}
        onClose={() => setShowAdminDashboard(false)}
      />
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  backgroundCenteredLogo: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    alignSelf: 'center',
    top: '5%',
    opacity: 0.05,
  },
  header: {
    backgroundColor: '#1E293B',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    marginRight: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#F8FAFC', letterSpacing: -0.5 },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  cursorScrollView: {
    marginTop: 10,
    marginBottom: 4,
  },
  cursorScrollContent: {
    paddingRight: 10,
    gap: 10,
  },
  cursorChoiceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    width: 108,
    borderWidth: 1.5,
    borderColor: '#334155',
    position: 'relative',
  },
  cursorChoiceCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#1A2942',
  },
  cursorBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cursorChoiceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  cursorSelectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // User Card
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B',
    borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#38BDF8',
  },
  userInfo: { flex: 1, marginLeft: 14 },
  userName: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  userEmail: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },

  // Login Card
  loginCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B',
    borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  loginIconContainer: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  loginInfo: { flex: 1, marginLeft: 14 },
  loginTitle: { fontSize: 18, fontWeight: '700', color: '#38BDF8' },
  loginSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },

  // Trust Card
  trustCard: {
    backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  trustHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trustBadge: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  trustInfo: { flex: 1 },
  trustLevelText: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  trustPerks: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  pointsContainer: { alignItems: 'center' },
  pointsNumber: { fontSize: 24, fontWeight: '800', color: '#38BDF8' },
  pointsLabel: { fontSize: 11, color: '#94A3B8' },

  // Progress
  progressSection: { marginTop: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, color: '#94A3B8' },
  progressPercent: { fontSize: 13, fontWeight: '700', color: '#38BDF8' },
  progressBarBg: { height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressHint: { fontSize: 12, color: '#64748B', marginTop: 4 },

  // Trust Stats
  trustStats: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#334155' },
  trustStat: { flex: 1, alignItems: 'center' },
  trustStatNum: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  trustStatLabel: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  trustStatDivider: { width: 1, backgroundColor: '#334155' },

  // Vehicle
  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B',
    borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  vehicleEmoji: { fontSize: 36 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  vehicleDetails: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  vehicleAction: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  vehicleDimensions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10,
  },
  dimBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: '#334155',
  },
  dimIcon: { fontSize: 14 },
  dimText: { fontSize: 13, fontWeight: '600', color: '#CBD5E1' },
  vehicleHint: {
    fontSize: 12, color: '#64748B', marginTop: 8, fontStyle: 'italic', textAlign: 'center',
  },

  // Premium
  premiumCard: {
    backgroundColor: '#0F2744', borderRadius: 18, padding: 18, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#0284C7',
  },
  premiumContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumEmoji: { fontSize: 28 },
  premiumInfo: { flex: 1 },
  premiumTitle: { fontSize: 18, fontWeight: '700', color: '#F8FAFC' },
  premiumSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  premiumPrice: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)', alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginTop: 12,
  },
  premiumPriceText: { fontSize: 15, fontWeight: '800', color: '#38BDF8' },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#38BDF8', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  sectionCard: {
    backgroundColor: '#1E293B', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#334155',
  },

  // Settings Row
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  settingSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#334155', marginLeft: 66 },

  // Points Guide
  pointsGuideRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  pointsEmoji: { fontSize: 20, width: 34, textAlign: 'center' },
  pointsGuideReason: { flex: 1, fontSize: 14, color: '#CBD5E1' },
  pointsGuidePoints: { fontSize: 15, fontWeight: '800', color: '#10B981' },

  // Levels
  levelRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  levelRowCurrent: { backgroundColor: '#F8FFF8' },
  levelIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  levelInfo: { flex: 1 },
  levelName: { fontSize: 15, fontWeight: '500', color: '#333' },
  levelPerks: { fontSize: 12, color: '#888', marginTop: 1 },
  levelScore: { fontSize: 13, fontWeight: '600', color: '#AAA', marginRight: 4 },

  // Version
  version: { textAlign: 'center', fontSize: 12, color: '#BBB', marginTop: 20 },

  // Vehicle Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  modalLabel: { fontSize: 14, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 8 },
  vehicleTypesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  vehicleTypeItem: {
    width: '30%', alignItems: 'center', padding: 12, borderRadius: 14,
    backgroundColor: '#F8F8F8', borderWidth: 2, borderColor: '#F0F0F0',
  },
  vehicleTypeSelected: {
    backgroundColor: theme.colors.primary.main + '12',
    borderColor: theme.colors.primary.main,
  },
  vehicleTypeEmoji: { fontSize: 28, marginBottom: 4 },
  vehicleTypeLabel: { fontSize: 11, fontWeight: '600', color: '#555', textAlign: 'center' },
  vehicleTypeLabelSelected: { color: theme.colors.primary.main },
  modalInput: {
    backgroundColor: '#F8F8F8', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#1A1A1A', borderWidth: 1, borderColor: '#E8E8E8',
  },
  dimInputsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  dimInputGroup: { flex: 1 },
  dimInputLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 4 },
  dimInput: {
    backgroundColor: '#F8F8F8', borderRadius: 12, padding: 12,
    fontSize: 16, fontWeight: '600', color: '#1A1A1A', textAlign: 'center',
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  modalBtnCancel: {
    flex: 1, padding: 14, borderRadius: 14, backgroundColor: '#F0F0F0', alignItems: 'center',
  },
  modalBtnCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  modalBtnSave: {
    flex: 1, padding: 14, borderRadius: 14, backgroundColor: theme.colors.primary.main, alignItems: 'center',
  },
  modalBtnSaveText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  adminDashboardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  adminBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  adminLiveBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  adminBannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
