/**
 * ProfileScreen - Perfil de usuario con sistema de reputación
 * CamperSites Pro - YRYS
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import {
  getUserTrustProfile,
  getPointHistory,
  getProgressToNextLevel,
  TRUST_LEVELS,
  POINTS_TABLE,
  type UserTrustProfile,
  type PointTransaction,
  type TrustLevel,
} from '../lib/communityAlerts';
import { CamperSitesTheme as theme } from '../theme';

// ============================================
// SETTING ROW COMPONENT
// ============================================
interface SettingRowProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingRow({ icon, iconColor = theme.colors.text.secondary, title, subtitle, onPress, rightElement }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={onPress ? 0.6 : 1} disabled={!onPress}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '15' }]}>
        <Icon name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <Icon name="chevron-right" size={22} color={theme.colors.text.disabled} />)}
    </TouchableOpacity>
  );
}

// ============================================
// TRUST LEVEL CARD
// ============================================
function TrustLevelCard({ trustProfile }: { trustProfile: UserTrustProfile }) {
  const progress = getProgressToNextLevel(trustProfile.trust_score);
  const levelConfig = TRUST_LEVELS[trustProfile.trust_level as TrustLevel];
  const nextLevelConfig = progress.nextLevel ? TRUST_LEVELS[progress.nextLevel] : null;

  return (
    <View style={styles.trustCard}>
      {/* Nivel actual */}
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

      {/* Barra de progreso al siguiente nivel */}
      {nextLevelConfig && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Siguiente: {nextLevelConfig.label}
            </Text>
            <Text style={styles.progressPercent}>{progress.progress}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progress.progress}%`,
                  backgroundColor: levelConfig.color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            Faltan {progress.pointsNeeded} puntos de confianza
          </Text>
        </View>
      )}

      {/* Stats rápidos */}
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
            {trustProfile.alerts_accuracy > 0
              ? `${Math.round(trustProfile.alerts_accuracy)}%`
              : '-'}
          </Text>
          <Text style={styles.trustStatLabel}>Precisión</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================
// POINTS TABLE INFO
// ============================================
function PointsGuide() {
  const items = [
    { reason: 'Crear alerta', points: '+10', icon: 'alert-plus', color: '#2E7D32' },
    { reason: 'Primera alerta', points: '+25', icon: 'star', color: '#FFD700' },
    { reason: 'Alerta confirmada', points: '+15', icon: 'check-decagram', color: '#1976D2' },
    { reason: '5 confirmaciones', points: '+25', icon: 'account-group', color: '#7B1FA2' },
    { reason: '10 confirmaciones', points: '+50', icon: 'trophy', color: '#FF6F00' },
    { reason: 'Confirmar alerta', points: '+3', icon: 'thumb-up', color: '#388E3C' },
    { reason: 'Negar alerta falsa', points: '+2', icon: 'thumb-down', color: '#F57C00' },
    { reason: 'Racha 7 días', points: '+100', icon: 'fire', color: '#D32F2F' },
    { reason: 'Alerta falsa', points: '-20', icon: 'alert-circle', color: '#B71C1C' },
  ];

  return (
    <View style={styles.sectionCard}>
      {items.map((item, index) => (
        <React.Fragment key={item.reason}>
          <View style={styles.pointsGuideRow}>
            <View style={[styles.pointsGuideIcon, { backgroundColor: item.color + '15' }]}>
              <Icon name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={styles.pointsGuideReason}>{item.reason}</Text>
            <Text
              style={[
                styles.pointsGuidePoints,
                { color: item.points.startsWith('-') ? '#B71C1C' : '#2E7D32' },
              ]}>
              {item.points}
            </Text>
          </View>
          {index < items.length - 1 && <View style={styles.separator} />}
        </React.Fragment>
      ))}
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

  useEffect(() => {
    checkAuth();
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
    if (profile) {
      setTrustProfile(profile);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setIsLoggedIn(false);
          setTrustProfile(null);
        },
      },
    ]);
  };

  const handlePremium = () => {
    Alert.alert(
      'CamperSites Premium',
      'Acceso ilimitado por 9,99€/mes.\n\n• Sin anuncios\n• Navegación offline\n• Rutas multi-destino\n• Planificador de viajes\n\nPróximamente disponible.',
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {isLoggedIn ? (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              {trustProfile ? (
                <Icon
                  name={TRUST_LEVELS[trustProfile.trust_level as TrustLevel]?.icon || 'account'}
                  size={32}
                  color={TRUST_LEVELS[trustProfile.trust_level as TrustLevel]?.color || theme.colors.primary.main}
                />
              ) : (
                <Icon name="account" size={32} color={theme.colors.primary.main} />
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
              <Icon name="account-plus" size={36} color={theme.colors.primary.main} />
            </View>
            <View style={styles.loginInfo}>
              <Text style={styles.loginTitle}>Inicia sesión</Text>
              <Text style={styles.loginSubtitle}>Reporta alertas, gana puntos y sube de nivel</Text>
            </View>
            <Icon name="chevron-right" size={24} color={theme.colors.text.disabled} />
          </TouchableOpacity>
        )}

        {/* Trust Level Card */}
        {trustProfile && <TrustLevelCard trustProfile={trustProfile} />}

        {/* Premium */}
        <TouchableOpacity style={styles.premiumCard} onPress={handlePremium}>
          <View style={styles.premiumContent}>
            <Icon name="crown" size={28} color="#FFD700" />
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>CamperSites Premium</Text>
              <Text style={styles.premiumSubtitle}>Sin anuncios + todas las funciones</Text>
            </View>
          </View>
          <View style={styles.premiumPrice}>
            <Text style={styles.premiumPriceText}>9,99€/mes</Text>
          </View>
        </TouchableOpacity>

        {/* Cómo ganar puntos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cómo ganar puntos</Text>
          <PointsGuide />
        </View>

        {/* Niveles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Niveles de confianza</Text>
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
          <Text style={styles.sectionTitle}>Alertas</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="bell"
              iconColor={theme.colors.secondary.main}
              title="Notificaciones"
              subtitle="Alertas de radares, controles y peligros"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: theme.colors.text.disabled, true: theme.colors.primary.light }}
                  thumbColor={notificationsEnabled ? theme.colors.primary.main : '#f4f3f4'}
                />
              }
            />
            <View style={styles.separator} />
            <SettingRow
              icon="volume-high"
              iconColor={theme.colors.accent.sky}
              title="Sonido"
              subtitle="Alertas sonoras al acercarse"
              rightElement={
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: theme.colors.text.disabled, true: theme.colors.primary.light }}
                  thumbColor={soundEnabled ? theme.colors.primary.main : '#f4f3f4'}
                />
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={styles.sectionCard}>
            <SettingRow icon="information" iconColor={theme.colors.accent.sky} title="Acerca de" subtitle="CamperSites Pro v1.0.0"
              onPress={() => Alert.alert('CamperSites Pro', 'Tu compañero de ruta.\n\nVersión 1.0.0\nYRYS')} />
            <View style={styles.separator} />
            <SettingRow icon="star" iconColor="#FFD700" title="Valorar la app"
              onPress={() => Alert.alert('¡Gracias!', 'Disponible próximamente.')} />
            {isLoggedIn && (
              <>
                <View style={styles.separator} />
                <SettingRow icon="logout" iconColor={theme.colors.alerts.radar} title="Cerrar sesión" onPress={handleLogout} />
              </>
            )}
          </View>
        </View>

        <Text style={styles.version}>CamperSites Pro v1.0.0 — YRYS</Text>
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.light },
  header: { backgroundColor: theme.colors.primary.main, paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  // User Card
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, ...theme.shadows.sm },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary.main + '10', justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1, marginLeft: 14 },
  userName: { fontSize: 18, fontWeight: '700', color: theme.colors.text.primary },
  userEmail: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },
  // Login Card
  loginCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, ...theme.shadows.sm },
  loginIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary.main + '12', justifyContent: 'center', alignItems: 'center' },
  loginInfo: { flex: 1, marginLeft: 14 },
  loginTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.primary.main },
  loginSubtitle: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 },
  // Trust Card
  trustCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, ...theme.shadows.sm },
  trustHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trustBadge: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  trustInfo: { flex: 1 },
  trustLevelText: { fontSize: 20, fontWeight: '800', color: theme.colors.text.primary },
  trustPerks: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 },
  pointsContainer: { alignItems: 'center' },
  pointsNumber: { fontSize: 24, fontWeight: '800', color: theme.colors.primary.main },
  pointsLabel: { fontSize: 11, color: theme.colors.text.secondary },
  // Progress
  progressSection: { marginTop: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, color: theme.colors.text.secondary },
  progressPercent: { fontSize: 13, fontWeight: '700', color: theme.colors.primary.main },
  progressBarBg: { height: 8, backgroundColor: theme.colors.background.light, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressHint: { fontSize: 12, color: theme.colors.text.hint, marginTop: 4 },
  // Trust Stats
  trustStats: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.text.disabled + '30' },
  trustStat: { flex: 1, alignItems: 'center' },
  trustStatNum: { fontSize: 18, fontWeight: '800', color: theme.colors.text.primary },
  trustStatLabel: { fontSize: 11, color: theme.colors.text.secondary, marginTop: 2 },
  trustStatDivider: { width: StyleSheet.hairlineWidth, backgroundColor: theme.colors.text.disabled + '30' },
  // Premium
  premiumCard: { backgroundColor: theme.colors.primary.dark, borderRadius: 16, padding: 18, marginBottom: 16, ...theme.shadows.md },
  premiumContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumInfo: { flex: 1 },
  premiumTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  premiumSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  premiumPrice: { backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginTop: 12 },
  premiumPriceText: { fontSize: 15, fontWeight: '700', color: '#FFD700' },
  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text.secondary, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', ...theme.shadows.sm },
  // Settings Row
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500', color: theme.colors.text.primary },
  settingSubtitle: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.text.disabled + '40', marginLeft: 66 },
  // Points Guide
  pointsGuideRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  pointsGuideIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  pointsGuideReason: { flex: 1, fontSize: 14, color: theme.colors.text.primary },
  pointsGuidePoints: { fontSize: 16, fontWeight: '800' },
  // Levels
  levelRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  levelRowCurrent: { backgroundColor: theme.colors.background.light },
  levelIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  levelInfo: { flex: 1 },
  levelName: { fontSize: 15, fontWeight: '500', color: theme.colors.text.primary },
  levelPerks: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 1 },
  levelScore: { fontSize: 13, fontWeight: '600', color: theme.colors.text.hint, marginRight: 4 },
  // Version
  version: { textAlign: 'center', fontSize: 12, color: theme.colors.text.hint, marginTop: 20 },
});
