/**
 * ProfileScreen - Perfil de usuario y configuracion
 * CamperSites Pro - YRYS
 */

import React, { useState } from 'react';
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
import { CamperSitesTheme as theme } from '../theme';

interface SettingRowProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
}

function SettingRow({
  icon,
  iconColor = theme.colors.text.secondary,
  title,
  subtitle,
  onPress,
  rightElement,
  isDestructive = false,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '15' }]}>
        <Icon name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text
          style={[
            styles.settingTitle,
            isDestructive && { color: theme.colors.alerts.radar },
          ]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (
        onPress && (
          <Icon name="chevron-right" size={22} color={theme.colors.text.disabled} />
        )
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoggedIn] = useState(false);

  const handleLogin = () => {
    Alert.alert(
      'Próximamente',
      'El sistema de login estará disponible en la próxima actualización.',
    );
  };

  const handlePremium = () => {
    Alert.alert(
      'CamperSites Premium',
      'Acceso ilimitado a todas las funciones premium por 9,99€/mes.\n\n• Navegación offline\n• Rutas multi-destino\n• Planificador de viajes\n• Sin publicidad\n\nPróximamente disponible.',
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {isLoggedIn ? (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Icon name="account" size={40} color={theme.colors.primary.main} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Viajero</Text>
              <Text style={styles.userEmail}>usuario@email.com</Text>
            </View>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.loginCard} onPress={handleLogin}>
            <View style={styles.loginIconContainer}>
              <Icon name="account-plus" size={36} color={theme.colors.primary.main} />
            </View>
            <View style={styles.loginInfo}>
              <Text style={styles.loginTitle}>Inicia sesión</Text>
              <Text style={styles.loginSubtitle}>
                Guarda favoritos, reporta radares y más
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={theme.colors.text.disabled} />
          </TouchableOpacity>
        )}

        {/* Premium Card */}
        <TouchableOpacity style={styles.premiumCard} onPress={handlePremium}>
          <View style={styles.premiumContent}>
            <Icon name="crown" size={28} color="#FFD700" />
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>CamperSites Premium</Text>
              <Text style={styles.premiumSubtitle}>
                Desbloquea todas las funciones
              </Text>
            </View>
          </View>
          <View style={styles.premiumPrice}>
            <Text style={styles.premiumPriceText}>9,99€/mes</Text>
          </View>
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="map-marker-check" size={28} color={theme.colors.primary.main} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Visitados</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="road-variant" size={28} color={theme.colors.accent.sky} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Km</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="shield-check" size={28} color={theme.colors.secondary.main} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Reportes</Text>
          </View>
        </View>

        {/* Settings Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertas</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="bell"
              iconColor={theme.colors.secondary.main}
              title="Notificaciones"
              subtitle="Alertas de radares y controles"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{
                    false: theme.colors.text.disabled,
                    true: theme.colors.primary.light,
                  }}
                  thumbColor={
                    notificationsEnabled
                      ? theme.colors.primary.main
                      : '#f4f3f4'
                  }
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
                  trackColor={{
                    false: theme.colors.text.disabled,
                    true: theme.colors.primary.light,
                  }}
                  thumbColor={
                    soundEnabled ? theme.colors.primary.main : '#f4f3f4'
                  }
                />
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="information"
              iconColor={theme.colors.accent.sky}
              title="Acerca de"
              subtitle="CamperSites Pro v1.0.0"
              onPress={() =>
                Alert.alert(
                  'CamperSites Pro',
                  'Tu compañero de ruta para viajar en camper.\n\nVersión 1.0.0\nYRYS',
                )
              }
            />
            <View style={styles.separator} />
            <SettingRow
              icon="star"
              iconColor="#FFD700"
              title="Valorar la app"
              onPress={() =>
                Alert.alert('¡Gracias!', 'Disponible próximamente en la App Store.')
              }
            />
            <View style={styles.separator} />
            <SettingRow
              icon="help-circle"
              iconColor={theme.colors.primary.main}
              title="Ayuda y soporte"
              onPress={() =>
                Alert.alert(
                  'Soporte',
                  '¿Necesitas ayuda? Escríbenos a soporte@campersites.pro',
                )
              }
            />
          </View>
        </View>

        {/* Version */}
        <Text style={styles.version}>CamperSites Pro v1.0.0 — YRYS</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  header: {
    backgroundColor: theme.colors.primary.main,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  freeBadge: {
    backgroundColor: theme.colors.text.disabled + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.secondary,
  },
  // Login Card
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  loginIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary.main + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginInfo: {
    flex: 1,
    marginLeft: 14,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary.main,
  },
  loginSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  // Premium Card
  premiumCard: {
    backgroundColor: theme.colors.primary.dark,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    ...theme.shadows.md,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  premiumSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  premiumPrice: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 12,
  },
  premiumPriceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFD700',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    ...theme.shadows.sm,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  // Sections
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  settingSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.text.disabled + '40',
    marginLeft: 66,
  },
  // Version
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.text.hint,
    marginTop: 20,
  },
});
