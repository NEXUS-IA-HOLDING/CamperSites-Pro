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

const VEHICLE_STORAGE_KEY = '@camper_vehicle_config';

// Tipos de vehículo predefinidos
const VEHICLE_TYPES = [
  { key: 'coche', label: 'Coche', emoji: '🚗', maxHeight: 1.5, maxWidth: 1.9, maxLength: 4.5 },
  { key: 'furgoneta', label: 'Furgoneta Camper', emoji: '🚐', maxHeight: 2.6, maxWidth: 2.0, maxLength: 6.0 },
  { key: 'autocaravana_s', label: 'Autocaravana <6m', emoji: '🏕️', maxHeight: 3.0, maxWidth: 2.3, maxLength: 5.9 },
  { key: 'autocaravana_m', label: 'Autocaravana 6-7m', emoji: '🚌', maxHeight: 3.2, maxWidth: 2.3, maxLength: 7.0 },
  { key: 'autocaravana_l', label: 'Autocaravana >7m', emoji: '🚍', maxHeight: 3.5, maxWidth: 2.5, maxLength: 9.0 },
  { key: 'caravana', label: 'Coche + Caravana', emoji: '🏠', maxHeight: 2.8, maxWidth: 2.3, maxLength: 10.0 },
  { key: 'custom', label: 'Personalizado', emoji: '📐', maxHeight: 0, maxWidth: 0, maxLength: 0 },
];

interface VehicleConfig {
  type: string;
  height: string; // metros
  width: string;
  length: string;
  weight: string; // kg
  name: string; // nombre personalizado
}

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

  // Vehículo
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig>({
    type: '', height: '', width: '', length: '', weight: '', name: '',
  });
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [tempVehicle, setTempVehicle] = useState<VehicleConfig>({
    type: '', height: '', width: '', length: '', weight: '', name: '',
  });

  useEffect(() => {
    checkAuth();
    loadVehicleConfig();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setIsLoggedIn(true);
      setUserEmail(user.email || '');
      setUserName(user.user_metadata?.display_name || 'Viajero');
      loadTrustProfile();
    }
  };

  const loadTrustProfile = async () => {
    const profile = await getUserTrustProfile();
    if (profile) setTrustProfile(profile);
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
        type: type.key,
        height: type.maxHeight.toString(),
        width: type.maxWidth.toString(),
        length: type.maxLength.toString(),
        weight: '',
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
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
            </View>
          )}
          <Text style={styles.vehicleHint}>
            Las rutas se adaptarán a las dimensiones de tu vehículo
          </Text>
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

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Alertas</Text>
          <View style={styles.sectionCard}>
            <SettingRow icon="bell" iconColor="#FF6F00" title="Notificaciones"
              subtitle="Alertas de radares, controles y peligros"
              rightElement={
                <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#DDD', true: theme.colors.primary.light }}
                  thumbColor={notificationsEnabled ? theme.colors.primary.main : '#f4f3f4'} />
              } />
            <View style={styles.separator} />
            <SettingRow icon="volume-high" iconColor="#1976D2" title="Sonido"
              subtitle="Alertas sonoras al acercarse"
              rightElement={
                <Switch value={soundEnabled} onValueChange={setSoundEnabled}
                  trackColor={{ false: '#DDD', true: theme.colors.primary.light }}
                  thumbColor={soundEnabled ? theme.colors.primary.main : '#f4f3f4'} />
              } />
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
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  header: {
    backgroundColor: theme.colors.primary.main,
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // User Card
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 18, padding: 16, marginBottom: 12,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: theme.colors.primary.main + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  userInfo: { flex: 1, marginLeft: 14 },
  userName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  userEmail: { fontSize: 13, color: '#888', marginTop: 2 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },

  // Login Card
  loginCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 18, padding: 16, marginBottom: 12,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  loginIconContainer: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: theme.colors.primary.main + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  loginInfo: { flex: 1, marginLeft: 14 },
  loginTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.primary.main },
  loginSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },

  // Trust Card
  trustCard: {
    backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  trustHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trustBadge: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  trustInfo: { flex: 1 },
  trustLevelText: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  trustPerks: { fontSize: 13, color: '#888', marginTop: 2 },
  pointsContainer: { alignItems: 'center' },
  pointsNumber: { fontSize: 24, fontWeight: '800', color: theme.colors.primary.main },
  pointsLabel: { fontSize: 11, color: '#888' },

  // Progress
  progressSection: { marginTop: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, color: '#888' },
  progressPercent: { fontSize: 13, fontWeight: '700', color: theme.colors.primary.main },
  progressBarBg: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressHint: { fontSize: 12, color: '#AAA', marginTop: 4 },

  // Trust Stats
  trustStats: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  trustStat: { flex: 1, alignItems: 'center' },
  trustStatNum: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  trustStatLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  trustStatDivider: { width: 1, backgroundColor: '#F0F0F0' },

  // Vehicle
  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 16, padding: 16, gap: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  vehicleEmoji: { fontSize: 36 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  vehicleDetails: { fontSize: 13, color: '#888', marginTop: 2 },
  vehicleAction: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primary.main + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  vehicleDimensions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10,
  },
  dimBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,
  },
  dimIcon: { fontSize: 14 },
  dimText: { fontSize: 13, fontWeight: '600', color: '#555' },
  vehicleHint: {
    fontSize: 12, color: '#AAA', marginTop: 8, fontStyle: 'italic', textAlign: 'center',
  },

  // Premium
  premiumCard: {
    backgroundColor: '#1B5E20', borderRadius: 18, padding: 18, marginBottom: 16,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 6,
  },
  premiumContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumEmoji: { fontSize: 28 },
  premiumInfo: { flex: 1 },
  premiumTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  premiumSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  premiumPrice: {
    backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginTop: 12,
  },
  premiumPriceText: { fontSize: 15, fontWeight: '700', color: '#FFD700' },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#666', marginBottom: 8, marginLeft: 4, letterSpacing: 0.3 },
  sectionCard: {
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },

  // Settings Row
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500', color: '#1A1A1A' },
  settingSubtitle: { fontSize: 13, color: '#888', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 66 },

  // Points Guide
  pointsGuideRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  pointsEmoji: { fontSize: 20, width: 34, textAlign: 'center' },
  pointsGuideReason: { flex: 1, fontSize: 14, color: '#333' },
  pointsGuidePoints: { fontSize: 16, fontWeight: '800' },

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
});
