/**
 * AdminDashboardModal.tsx - Centro de Mando Ejecutivo, Telemetría en Tiempo Real, Salud de Servidores e Incidencias
 * CamperSites Pro (YRYS)
 *
 * Permite al Administrador:
 * 1. Monitorizar en tiempo real si algún servidor cae o aumenta su latencia (Supabase, OSRM, Open-Meteo, Nominatim, Esri, GitHub OTA).
 * 2. Recibir, filtrar y resolver incidencias reportadas por usuarios, fallos de la app o alertas SOS.
 * 3. Analizar KPIs en tiempo real y distribución multivehículo (Camper, Moto, 4x4, Coche, Camión, SOS).
 * 4. Visualizar balances económicos y configurar cuenta de cobro (PayPal / SEPA).
 * 5. Gestionar usuarios, roles, suscripciones y equipo de soporte.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  adminService,
  AdminUserRecord,
  FinancialBalanceMetrics,
  PayoutConfiguration,
  UserRole,
  UserPlan,
  ServerHealthRecord,
  AppIncidentRecord,
  IncidentSeverity,
  IncidentStatus,
  LiveAppStats,
  AccessInviteCode,
} from '../services/AdminService';

interface AdminDashboardModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: AdminTab;
}

export type AdminTab = 'servers' | 'incidents' | 'codes' | 'kpis' | 'balances' | 'users';

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  visible,
  onClose,
  initialTab = 'servers',
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshingServers, setRefreshingServers] = useState(false);

  const [servers, setServers] = useState<ServerHealthRecord[]>([]);
  const [incidents, setIncidents] = useState<AppIncidentRecord[]>([]);
  const [liveStats, setLiveStats] = useState<LiveAppStats | null>(null);
  const [metrics, setMetrics] = useState<FinancialBalanceMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [payoutConfig, setPayoutConfig] = useState<PayoutConfiguration | null>(null);

  // Filtros de incidencias
  const [incidentFilter, setIncidentFilter] = useState<'all' | IncidentStatus>('all');
  const [showNewIncidentForm, setShowNewIncidentForm] = useState(false);
  const [newIncTitle, setNewIncTitle] = useState('');
  const [newIncDesc, setNewIncDesc] = useState('');
  const [newIncSeverity, setNewIncSeverity] = useState<IncidentSeverity>('app_bug');
  const [newIncVehicle, setNewIncVehicle] = useState('Camper / Autocaravana');

  // Filtros de usuarios
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Nuevo miembro de equipo
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('staff');

  // Formulario de pagos
  const [paypalInput, setPaypalInput] = useState('');
  const [ibanInput, setIbanInput] = useState('');
  const [holderInput, setHolderInput] = useState('');

  // Códigos de Invitación, Referidos y Privilegios (Familia, Amigos, Compañeros, Pioneros)
  const [inviteCodes, setInviteCodes] = useState<AccessInviteCode[]>([]);
  const [newCodeText, setNewCodeText] = useState('');
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [newCodeGroup, setNewCodeGroup] = useState<AccessInviteCode['targetGroup']>('family');
  const [newCodePlan, setNewCodePlan] = useState<UserPlan>('lifetime_vip');
  const [newCodeRole, setNewCodeRole] = useState<UserRole>('user');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<number>(10);

  useEffect(() => {
    if (visible) {
      if (initialTab) setActiveTab(initialTab);
      loadAllDashboardData();
    }
  }, [visible, initialTab]);

  // Auto-refresco cada 20 segundos mientras el panel está abierto en la pestaña de servidores
  useEffect(() => {
    if (!visible || activeTab !== 'servers') return;
    const interval = setInterval(() => {
      handlePingServersSilent();
    }, 20000);
    return () => clearInterval(interval);
  }, [visible, activeTab]);

  const handlePingServersSilent = async () => {
    try {
      const srv = await adminService.checkServersHealth();
      setServers(srv);
      const stats = await adminService.getLiveAppTelemetry(srv);
      setLiveStats(stats);
    } catch {}
  };

  const handlePingServersManual = async () => {
    setRefreshingServers(true);
    try {
      const srv = await adminService.checkServersHealth();
      setServers(srv);
      const [inc, stats] = await Promise.all([
        adminService.getIncidents(),
        adminService.getLiveAppTelemetry(srv),
      ]);
      setIncidents(inc);
      setLiveStats(stats);
    } finally {
      setRefreshingServers(false);
    }
  };

  const loadAllDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const srv = await adminService.checkServersHealth();
      const [inc, stats, m, u, p, codesList] = await Promise.all([
        adminService.getIncidents(),
        adminService.getLiveAppTelemetry(srv),
        adminService.getFinancialMetrics(),
        adminService.getUsersList(),
        adminService.getPayoutConfig(),
        adminService.getInviteCodes(),
      ]);

      setServers(srv);
      setIncidents(inc);
      setLiveStats(stats);
      setMetrics(m);
      setUsers(u);
      setPayoutConfig(p);
      setInviteCodes(codesList);
      setPaypalInput(p.paypalEmail);
      setIbanInput(p.iban);
      setHolderInput(p.accountHolder);
    } catch (e) {
      Alert.alert('Aviso', 'Algunos datos en tiempo real tardaron en responder.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateIncident = async () => {
    if (!newIncTitle.trim() || !newIncDesc.trim()) {
      Alert.alert('Campos requeridos', 'Por favor escribe un título y descripción de la incidencia.');
      return;
    }
    await adminService.reportIncident({
      title: newIncTitle.trim(),
      description: newIncDesc.trim(),
      severity: newIncSeverity,
      vehicleType: newIncVehicle,
      userEmail: 'equipo-ia@proton.me',
      userName: 'Reporte Directo',
    });
    setNewIncTitle('');
    setNewIncDesc('');
    setShowNewIncidentForm(false);
    const updatedInc = await adminService.getIncidents();
    setIncidents(updatedInc);
    Alert.alert('✅ Incidencia Registrada', 'La alerta se ha añadido al registro en tiempo real.');
  };

  const handleUpdateIncidentStatus = async (inc: AppIncidentRecord, status: IncidentStatus) => {
    await adminService.updateIncidentStatus(inc.id, status);
    const updated = await adminService.getIncidents();
    setIncidents(updated);
    const stats = await adminService.getLiveAppTelemetry(servers);
    setLiveStats(stats);
  };

  const handleDeleteIncident = (inc: AppIncidentRecord) => {
    Alert.alert('Archivar Incidencia', `¿Eliminar "${inc.title}" del listado activo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await adminService.deleteIncident(inc.id);
          const updated = await adminService.getIncidents();
          setIncidents(updated);
        },
      },
    ]);
  };

  const handleSavePayoutConfig = async () => {
    if (!paypalInput.trim()) {
      Alert.alert('Atención', 'Por favor introduce un correo de PayPal válido');
      return;
    }
    const success = await adminService.updatePayoutConfig({
      paypalEmail: paypalInput.trim(),
      iban: ibanInput.trim(),
      accountHolder: holderInput.trim(),
    });
    if (success) {
      Alert.alert('✅ Cuenta de Cobro Actualizada', `Tus ingresos se transferirán a: ${paypalInput.trim()}`);
      loadAllDashboardData();
    }
  };

  const handleChangeUserRole = (user: AdminUserRecord) => {
    const roles: { label: string; role: UserRole }[] = [
      { label: '👑 Administrador Total', role: 'admin' },
      { label: '🛠️ Staff / Soporte Técnico', role: 'staff' },
      { label: '🛡️ Moderador de Contenido', role: 'moderator' },
      { label: '👤 Usuario Estándar', role: 'user' },
    ];

    Alert.alert(
      'Cambiar Rol de Privilegios',
      `Selecciona el nuevo rol para ${user.displayName} (${user.email}):`,
      [
        ...roles.map((r) => ({
          text: r.label,
          onPress: async () => {
            await adminService.updateUserRole(user.id, r.role);
            loadAllDashboardData();
          },
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleChangeUserPlan = (user: AdminUserRecord) => {
    const plans: { label: string; plan: UserPlan }[] = [
      { label: '⭐ Plan Gratuito (Free)', plan: 'free' },
      { label: '🚐 Pro Mensual (4.99€/mes)', plan: 'pro_monthly' },
      { label: '🚀 Pro Anual (39.99€/año)', plan: 'pro_annual' },
      { label: '💎 VIP Lifetime (Vitalicio)', plan: 'lifetime_vip' },
    ];

    Alert.alert(
      'Gestionar Suscripción',
      `Selecciona el plan para ${user.displayName}:`,
      [
        ...plans.map((p) => ({
          text: p.label,
          onPress: async () => {
            await adminService.updateUserPlan(user.id, p.plan);
            loadAllDashboardData();
          },
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleToggleBlock = (user: AdminUserRecord) => {
    const action = user.isBlocked ? 'Desbloquear' : 'Bloquear';
    Alert.alert(
      `${action} Usuario`,
      `¿Confirmas que deseas ${action.toLowerCase()} el acceso a ${user.displayName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: action,
          style: user.isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            await adminService.toggleBlockUser(user.id, !user.isBlocked);
            loadAllDashboardData();
          },
        },
      ]
    );
  };

  const handleCreateStaff = async () => {
    if (!newStaffEmail.trim() || !newStaffName.trim()) {
      Alert.alert('Atención', 'Rellena el correo y nombre del nuevo miembro del equipo');
      return;
    }

    await adminService.addStaffMember(newStaffEmail, newStaffName, newStaffRole);
    Alert.alert('Personal Añadido', `Se ha incorporado a ${newStaffName} como ${newStaffRole.toUpperCase()}`);
    setNewStaffEmail('');
    setNewStaffName('');
    loadAllDashboardData();
  };

  const handleGenerateRandomCode = () => {
    const prefixes: Record<AccessInviteCode['targetGroup'], string> = {
      family: 'FAMILIA',
      friends: 'AMIGOS',
      colleagues: 'COMPIS',
      founders: 'PIONERO',
      staff: 'STAFF',
      general: 'GUMROAD',
      partners: 'PARTNER',
    };
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generated = `${prefixes[newCodeGroup]}-${suffix}`;
    setNewCodeText(generated);
  };

  const handleCreateInviteCode = async () => {
    const codeToCreate =
      newCodeText.trim() ||
      `VIP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const labelToCreate =
      newCodeLabel.trim() ||
      (newCodeGroup === 'family'
        ? 'Pase Familiar (VIP Vitalicio)'
        : newCodeGroup === 'friends'
        ? 'Pase Amigos (Pro Anual)'
        : newCodeGroup === 'colleagues'
        ? 'Pase Compañeros de Ruta / Trabajo'
        : newCodeGroup === 'founders'
        ? 'Pase Pioneros Fundadores'
        : 'Pase Equipo Staff / Moderación');

    const created = await adminService.createInviteCode({
      code: codeToCreate,
      label: labelToCreate,
      targetGroup: newCodeGroup,
      grantedPlan: newCodePlan,
      grantedRole: newCodeRole,
      maxUses: newCodeMaxUses,
    });

    setNewCodeText('');
    setNewCodeLabel('');
    const updatedCodes = await adminService.getInviteCodes();
    setInviteCodes(updatedCodes);

    Alert.alert(
      '🎟️ Código Creado y Activo',
      `Código: ${created.code}\nPara: ${created.label}\n\n¿Deseas compartirlo ahora por WhatsApp con tus familiares o amigos?`,
      [
        { text: 'Más tarde', style: 'cancel' },
        {
          text: '📲 Compartir ahora',
          onPress: () => handleShareInviteCode(created),
        },
      ]
    );
  };

  const handleShareInviteCode = async (item: AccessInviteCode) => {
    const planLabel =
      item.grantedPlan === 'lifetime_vip'
        ? '💎 Pase VIP Vitalicio (Todo Gratis para Siempre)'
        : item.grantedPlan === 'pro_annual'
        ? '🚀 1 Año de CamperSites Pro Gratis'
        : '🚐 Pase Pro Mensual Gratis';

    const roleLabel =
      item.grantedRole === 'admin'
        ? ' + Permisos Co-Admin'
        : item.grantedRole === 'staff'
        ? ' + Rango Staff Oficial'
        : item.grantedRole === 'moderator'
        ? ' + Rango Moderador Verificador'
        : '';

    const message =
      `🚐✨ ¡Hola! Te envío tu invitación especial para *CamperSites Pro* (${item.label}).\n\n` +
      `🎟️ Tu código de acceso exclusivo es: *${item.code}*\n` +
      `🎁 Desbloquea: ${planLabel}${roleLabel} (+${item.bonusPoints} CamperPoints y Mapas Offline 3D).\n\n` +
      `📲 *Cómo activarlo en 10 segundos:*\n` +
      `1. Descarga o abre la app en: https://nexus-ia-holding.github.io/CamperSites-Pro/\n` +
      `2. Entra en la pestaña *Perfil* -> *🎟️ Canjear Código VIP / Invitación*\n` +
      `3. Escribe *${item.code}* y pulsa *CANJEAR*. ¡Disfruta de la ruta!`;

    try {
      await Share.share({
        title: `Invitación VIP CamperSites Pro: ${item.code}`,
        message,
      });
    } catch {}
  };

  const handleToggleCodeActive = async (item: AccessInviteCode) => {
    await adminService.toggleInviteCodeActive(item.id);
    const updated = await adminService.getInviteCodes();
    setInviteCodes(updated);
  };

  const handleDeleteInviteCode = (item: AccessInviteCode) => {
    Alert.alert(
      'Eliminar Código de Acceso',
      `¿Seguro que deseas eliminar el código "${item.code}" (${item.label})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await adminService.deleteInviteCode(item.id);
            const updated = await adminService.getInviteCodes();
            setInviteCodes(updated);
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchUserQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  const filteredIncidents = incidents.filter((inc) => {
    if (incidentFilter === 'all') return true;
    return inc.status === incidentFilter;
  });

  const openIncidentsCount = incidents.filter((i) => i.status !== 'resolved').length;
  const downServersCount = servers.filter((s) => s.status === 'DOWN').length;
  const degradedServersCount = servers.filter((s) => s.status === 'DEGRADED').length;

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'critical_sos':
        return { label: '🆘 SOS / CRÍTICA', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.16)' };
      case 'server_outage':
        return { label: '⚡ SERVIDOR / RED', color: '#F97316', bg: 'rgba(249, 115, 22, 0.16)' };
      case 'app_bug':
        return { label: '🐞 FALLO APP', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.16)' };
      case 'map_data':
        return { label: '🗺️ AVISO MAPA / GÁLIBO', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.16)' };
      default:
        return { label: '💬 SUGERENCIA', color: '#10B981', bg: 'rgba(16, 185, 129, 0.16)' };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* CABECERA SUPERIOR DE CONTROL */}
        <View style={styles.header}>
          <View style={styles.headerTitleBox}>
            <View style={styles.shieldIconPod}>
              <Icon name="shield-crown" size={24} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.headerTitle}>CENTRO DE MANDO ADMIN</Text>
              <Text style={styles.headerSubtitle}>Telemetría en Tiempo Real · Servidores · Incidencias</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://nexus-ia-holding.github.io/CamperSites-Pro/admin.html').catch(() => {})
              }
              style={styles.webAdminBtn}>
              <Icon name="web" size={16} color="#38BDF8" />
              <Text style={styles.webAdminBtnText}>Web</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SELECTOR DE PESTAÑAS TÁCTICAS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 50, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' }}
          contentContainerStyle={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'servers' && styles.tabBtnActive]}
            onPress={() => setActiveTab('servers')}>
            <Icon
              name="server-network"
              size={15}
              color={
                downServersCount > 0
                  ? '#EF4444'
                  : activeTab === 'servers'
                  ? '#38BDF8'
                  : '#64748B'
              }
            />
            <Text style={[styles.tabText, activeTab === 'servers' && styles.tabTextActive]}>
              Servidores
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'incidents' && styles.tabBtnActive]}
            onPress={() => setActiveTab('incidents')}>
            <Icon
              name="alert-octagon"
              size={15}
              color={
                openIncidentsCount > 0
                  ? '#F59E0B'
                  : activeTab === 'incidents'
                  ? '#38BDF8'
                  : '#64748B'
              }
            />
            <Text style={[styles.tabText, activeTab === 'incidents' && styles.tabTextActive]}>
              Alertas ({openIncidentsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'codes' && styles.tabBtnActive]}
            onPress={() => setActiveTab('codes')}>
            <Icon
              name="ticket-confirmation"
              size={15}
              color={activeTab === 'codes' ? '#F59E0B' : '#64748B'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'codes' && { color: '#F59E0B', fontWeight: '900' },
              ]}>
              🎟️ Códigos & VIP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'kpis' && styles.tabBtnActive]}
            onPress={() => setActiveTab('kpis')}>
            <Icon
              name="chart-timeline-variant"
              size={15}
              color={activeTab === 'kpis' ? '#38BDF8' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'kpis' && styles.tabTextActive]}>
              Analítica
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'balances' && styles.tabBtnActive]}
            onPress={() => setActiveTab('balances')}>
            <Icon
              name="cash-multiple"
              size={15}
              color={activeTab === 'balances' ? '#38BDF8' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}>
              Finanzas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
            onPress={() => setActiveTab('users')}>
            <Icon
              name="account-group"
              size={15}
              color={activeTab === 'users' ? '#38BDF8' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              Usuarios
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>Auditando servidores y base de datos en tiempo real...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* ========================================================= */}
            {/* PESTAÑA 1: SALUD DE SERVIDORES EN TIEMPO REAL */}
            {/* ========================================================= */}
            {activeTab === 'servers' && (
              <View>
                {/* Banner de Estado Global */}
                <View
                  style={[
                    styles.globalHealthBanner,
                    downServersCount > 0
                      ? { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.12)' }
                      : degradedServersCount > 0
                      ? { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.12)' }
                      : { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                  ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Icon
                      name={
                        downServersCount > 0
                          ? 'alert-decagram'
                          : degradedServersCount > 0
                          ? 'alert-circle'
                          : 'check-decagram'
                      }
                      size={28}
                      color={
                        downServersCount > 0
                          ? '#EF4444'
                          : degradedServersCount > 0
                          ? '#F59E0B'
                          : '#10B981'
                      }
                      style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.globalHealthTitle}>
                        {downServersCount > 0
                          ? `🔴 ALERTA CRÍTICA: ${downServersCount} SERVIDOR(ES) CAÍDO(S)`
                          : degradedServersCount > 0
                          ? `🟠 AVISO: ${degradedServersCount} SERVICIO(S) CON LATENCIA ALTA`
                          : '🟢 TODOS LOS SISTEMAS OPERATIVOS (100% ONLINE)'}
                      </Text>
                      <Text style={styles.globalHealthSub}>
                        Latencia media global: {liveStats?.avgServerLatencyMs || 32} ms · Auto-diagnóstico cada 20s
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.pingNowBtn}
                    onPress={handlePingServersManual}
                    disabled={refreshingServers}>
                    {refreshingServers ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Icon name="refresh" size={16} color="#FFF" />
                        <Text style={styles.pingNowBtnText}>Testear</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>MONITOR DE INFRAESTRUCTURA EN VIVO</Text>
                  <View style={styles.livePulsePod}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveText}>PING HTTP REAL</Text>
                  </View>
                </View>

                {servers.map((srv) => {
                  const isOnline = srv.status === 'ONLINE';
                  const isDegraded = srv.status === 'DEGRADED';
                  const statusColor = isOnline ? '#10B981' : isDegraded ? '#F59E0B' : '#EF4444';
                  const barPercent = Math.min(100, Math.max(8, Math.round((srv.latencyMs / 800) * 100)));

                  return (
                    <View key={srv.id} style={styles.serverDetailCard}>
                      <View style={styles.serverDetailTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[styles.statusDotLarge, { backgroundColor: statusColor }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.serverDetailName}>{srv.name}</Text>
                            <Text style={styles.serverDetailEndpoint}>{srv.endpoint}</Text>
                          </View>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <View
                            style={[
                              styles.serverStatusBadge,
                              { backgroundColor: statusColor + '20', borderColor: statusColor },
                            ]}>
                            <Text style={[styles.serverStatusBadgeText, { color: statusColor }]}>
                              {srv.status} · {srv.latencyMs} ms
                            </Text>
                          </View>
                          <Text style={styles.serverCheckedAt}>Verificado: {srv.checkedAt}</Text>
                        </View>
                      </View>

                      <View style={styles.latencyBarBg}>
                        <View
                          style={[
                            styles.latencyBarFill,
                            { width: `${barPercent}%`, backgroundColor: statusColor },
                          ]}
                        />
                      </View>

                      <Text style={styles.serverDetailInfo}>{srv.details}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ========================================================= */}
            {/* PESTAÑA 2: INCIDENCIAS DE USUARIOS, ERRORES Y ALERTAS SOS */}
            {/* ========================================================= */}
            {activeTab === 'incidents' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>BANDEJA DE INCIDENCIAS Y SOPORTE</Text>
                  <TouchableOpacity
                    style={styles.newIncidentBtn}
                    onPress={() => setShowNewIncidentForm(!showNewIncidentForm)}>
                    <Icon name={showNewIncidentForm ? 'close' : 'plus'} size={15} color="#FFF" />
                    <Text style={styles.newIncidentBtnText}>
                      {showNewIncidentForm ? 'Cerrar' : 'Nueva Alerta'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showNewIncidentForm && (
                  <View style={styles.newIncidentCard}>
                    <Text style={styles.addStaffTitle}>Registrar Incidencia o Alerta Operativa</Text>
                    <TextInput
                      style={styles.incInput}
                      placeholder="Título (ej. Fallo en ruta, Puente bajo sin marcar, SOS...)"
                      placeholderTextColor="#64748B"
                      value={newIncTitle}
                      onChangeText={setNewIncTitle}
                    />
                    <TextInput
                      style={[styles.incInput, { minHeight: 72, textAlignVertical: 'top' }]}
                      placeholder="Descripción detallada del problema o coordenadas..."
                      placeholderTextColor="#64748B"
                      multiline
                      value={newIncDesc}
                      onChangeText={setNewIncDesc}
                    />
                    <Text style={styles.inputLabel}>Nivel de Prioridad:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginVertical: 8 }}>
                      {(
                        [
                          { id: 'critical_sos', label: '🆘 SOS / Crítica' },
                          { id: 'app_bug', label: '🐞 Fallo App' },
                          { id: 'server_outage', label: '⚡ Servidor' },
                          { id: 'map_data', label: '🗺️ Mapa / Gálibo' },
                          { id: 'feedback', label: '💬 Sugerencia' },
                        ] as { id: IncidentSeverity; label: string }[]
                      ).map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={[
                            styles.filterChip,
                            newIncSeverity === s.id && styles.filterChipActive,
                          ]}
                          onPress={() => setNewIncSeverity(s.id)}>
                          <Text
                            style={[
                              styles.filterChipText,
                              newIncSeverity === s.id && styles.filterChipTextActive,
                            ]}>
                            {s.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.inputLabel}>Vehículo Afectado:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginVertical: 8 }}>
                      {[
                        'Camper / Autocaravana',
                        'Moto Trail / Monte',
                        '4x4 Off-Road',
                        'Coche / SUV',
                        'Camión Pesado',
                        'Excursionista SOS',
                      ].map((v) => (
                        <TouchableOpacity
                          key={v}
                          style={[
                            styles.filterChip,
                            newIncVehicle === v && styles.filterChipActive,
                          ]}
                          onPress={() => setNewIncVehicle(v)}>
                          <Text
                            style={[
                              styles.filterChipText,
                              newIncVehicle === v && styles.filterChipTextActive,
                            ]}>
                            {v}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <TouchableOpacity
                      style={styles.createStaffBtn}
                      onPress={handleCreateIncident}>
                      <Icon name="send" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.createStaffBtnText}>GUARDAR INCIDENCIA EN EL PANEL</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Filtros de Estado */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.roleFiltersScroll}>
                  {[
                    { id: 'all', label: `Todas (${incidents.length})` },
                    {
                      id: 'open',
                      label: `🔴 Abiertas (${incidents.filter((i) => i.status === 'open').length})`,
                    },
                    {
                      id: 'investigating',
                      label: `🟠 En Revisión (${
                        incidents.filter((i) => i.status === 'investigating').length
                      })`,
                    },
                    {
                      id: 'resolved',
                      label: `🟢 Resueltas (${
                        incidents.filter((i) => i.status === 'resolved').length
                      })`,
                    },
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[
                        styles.filterChip,
                        incidentFilter === f.id && styles.filterChipActive,
                      ]}
                      onPress={() => setIncidentFilter(f.id as any)}>
                      <Text
                        style={[
                          styles.filterChipText,
                          incidentFilter === f.id && styles.filterChipTextActive,
                        ]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {filteredIncidents.map((inc) => {
                  const sev = getSeverityBadge(inc.severity);
                  const isResolved = inc.status === 'resolved';
                  return (
                    <View
                      key={inc.id}
                      style={[
                        styles.incidentCard,
                        inc.severity === 'critical_sos' && !isResolved && { borderColor: '#EF4444' },
                        isResolved && { opacity: 0.75 },
                      ]}>
                      <View style={styles.incidentHeaderRow}>
                        <View style={[styles.sevBadge, { backgroundColor: sev.bg }]}>
                          <Text style={[styles.sevBadgeText, { color: sev.color }]}>{sev.label}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            inc.status === 'open'
                              ? { backgroundColor: 'rgba(239,68,68,0.2)' }
                              : inc.status === 'investigating'
                              ? { backgroundColor: 'rgba(245,158,11,0.2)' }
                              : { backgroundColor: 'rgba(16,185,129,0.2)' },
                          ]}>
                          <Text
                            style={[
                              styles.statusPillText,
                              inc.status === 'open'
                                ? { color: '#EF4444' }
                                : inc.status === 'investigating'
                                ? { color: '#F59E0B' }
                                : { color: '#10B981' },
                            ]}>
                            {inc.status === 'open'
                              ? 'ABIERTA'
                              : inc.status === 'investigating'
                              ? 'EN REVISIÓN'
                              : 'RESUELTA'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.incidentTitle}>{inc.title}</Text>
                      <Text style={styles.incidentDesc}>{inc.description}</Text>

                      <View style={styles.incidentMetaBox}>
                        <Text style={styles.incidentMetaText}>
                          👤 {inc.userName} ({inc.userEmail}) · 🚐 {inc.vehicleType}
                        </Text>
                        <Text style={styles.incidentMetaText}>
                          🕒 {inc.createdAt}
                          {inc.latitude && inc.longitude
                            ? ` · 📍 GPS: ${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`
                            : ''}
                        </Text>
                      </View>

                      <View style={styles.incidentActionsRow}>
                        {inc.status !== 'investigating' && inc.status !== 'resolved' && (
                          <TouchableOpacity
                            style={[styles.incActionBtn, { backgroundColor: 'rgba(245,158,11,0.2)' }]}
                            onPress={() => handleUpdateIncidentStatus(inc, 'investigating')}>
                            <Icon name="magnify-scan" size={14} color="#F59E0B" />
                            <Text style={[styles.incActionText, { color: '#F59E0B' }]}>
                              En Revisión
                            </Text>
                          </TouchableOpacity>
                        )}
                        {inc.status !== 'resolved' ? (
                          <TouchableOpacity
                            style={[styles.incActionBtn, { backgroundColor: 'rgba(16,185,129,0.2)' }]}
                            onPress={() => handleUpdateIncidentStatus(inc, 'resolved')}>
                            <Icon name="check-circle" size={14} color="#10B981" />
                            <Text style={[styles.incActionText, { color: '#10B981' }]}>
                              Marcar Resuelta
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.incActionBtn, { backgroundColor: 'rgba(56,189,248,0.18)' }]}
                            onPress={() => handleUpdateIncidentStatus(inc, 'open')}>
                            <Icon name="restore" size={14} color="#38BDF8" />
                            <Text style={[styles.incActionText, { color: '#38BDF8' }]}>Reabrir</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.incActionBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
                          onPress={() => handleDeleteIncident(inc)}>
                          <Icon name="trash-can-outline" size={14} color="#EF4444" />
                          <Text style={[styles.incActionText, { color: '#EF4444' }]}>Archivar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ========================================================= */}
            {/* PESTAÑA 3: CÓDIGOS DE ACCESO, REFERIDOS Y PRIVILEGIOS VIP */}
            {/* ========================================================= */}
            {activeTab === 'codes' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>
                    GENERADOR DE CÓDIGOS DE INVITACIÓN & PRIVILEGIOS
                  </Text>
                  <View style={styles.livePulsePod}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveText}>{inviteCodes.length} ACTIVOS</Text>
                  </View>
                </View>

                {/* TARJETA DE GENERACIÓN DE NUEVOS CÓDIGOS */}
                <View
                  style={[
                    styles.newIncidentCard,
                    { borderColor: '#F59E0B', backgroundColor: '#1E293B' },
                  ]}>
                  <Text style={[styles.addStaffTitle, { color: '#F59E0B' }]}>
                    🎟️ Crear Código para Familiares, Amigos o Compañeros
                  </Text>
                  <Text style={styles.addStaffSub}>
                    Genera pases VIP vitalicios o anuales y envíalos directamente por WhatsApp.
                  </Text>

                  <Text style={styles.inputLabel}>1. ¿Para quién es este código?</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginVertical: 8 }}>
                    {(
                      [
                        {
                          id: 'family',
                          label: '👨‍👩‍👧‍👦 Familiares (VIP Vitalicio)',
                          defaultPlan: 'lifetime_vip' as UserPlan,
                          defaultRole: 'user' as UserRole,
                          defaultLabel: 'Pase Familiares (Todo Gratis Vitalicio)',
                        },
                        {
                          id: 'friends',
                          label: '🍻 Amigos (1 Año Pro)',
                          defaultPlan: 'pro_annual' as UserPlan,
                          defaultRole: 'user' as UserRole,
                          defaultLabel: 'Amigos & Grupo Camper (1 Año Pro Gratis)',
                        },
                        {
                          id: 'colleagues',
                          label: '🏍️ Compañeros Ruta / Trabajo',
                          defaultPlan: 'pro_annual' as UserPlan,
                          defaultRole: 'moderator' as UserRole,
                          defaultLabel: 'Compañeros de Ruta & Trabajo (Moderador + Pro)',
                        },
                        {
                          id: 'founders',
                          label: '🚀 Primeros 100 Usuarios',
                          defaultPlan: 'pro_annual' as UserPlan,
                          defaultRole: 'user' as UserRole,
                          defaultLabel: 'Pioneros Fundadores CamperSites',
                        },
                        {
                          id: 'staff',
                          label: '🛡️ Equipo Staff / Co-Admin',
                          defaultPlan: 'lifetime_vip' as UserPlan,
                          defaultRole: 'staff' as UserRole,
                          defaultLabel: 'Equipo Oficial de Soporte y Moderación',
                        },
                      ] as const
                    ).map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.filterChip,
                          newCodeGroup === g.id && {
                            backgroundColor: 'rgba(245, 158, 11, 0.22)',
                            borderColor: '#F59E0B',
                          },
                        ]}
                        onPress={() => {
                          setNewCodeGroup(g.id);
                          setNewCodePlan(g.defaultPlan);
                          setNewCodeRole(g.defaultRole);
                          if (!newCodeLabel.trim()) {
                            setNewCodeLabel(g.defaultLabel);
                          }
                        }}>
                        <Text
                          style={[
                            styles.filterChipText,
                            newCodeGroup === g.id && { color: '#F59E0B', fontWeight: '800' },
                          ]}>
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.inputLabel}>
                    2. Código Personalizado (o genera uno automático):
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <TextInput
                      style={[styles.incInput, { flex: 1, marginBottom: 0, fontWeight: '800' }]}
                      placeholder="Ej. PRIMO-CARLOS, COMPIS-4X4..."
                      placeholderTextColor="#64748B"
                      autoCapitalize="characters"
                      value={newCodeText}
                      onChangeText={setNewCodeText}
                    />
                    <TouchableOpacity
                      style={{
                        backgroundColor: 'rgba(56, 189, 248, 0.2)',
                        borderWidth: 1,
                        borderColor: '#38BDF8',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 4,
                      }}
                      onPress={handleGenerateRandomCode}>
                      <Icon name="dice-multiple" size={18} color="#38BDF8" />
                      <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '800' }}>
                        Generar
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>3. Etiqueta / Nota identificativa:</Text>
                  <TextInput
                    style={styles.incInput}
                    placeholder="Ej. Pase VIP para mi hermano y primos..."
                    placeholderTextColor="#64748B"
                    value={newCodeLabel}
                    onChangeText={setNewCodeLabel}
                  />

                  <Text style={styles.inputLabel}>4. Privilegio / Plan que desbloquea:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginVertical: 8 }}>
                    {(
                      [
                        { id: 'lifetime_vip', label: '💎 VIP Vitalicio (Gratis Siempre)' },
                        { id: 'pro_annual', label: '🚀 Pro Anual (1 Año Gratis)' },
                        { id: 'pro_monthly', label: '🚐 Pro Mensual (1 Mes)' },
                      ] as { id: UserPlan; label: string }[]
                    ).map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.filterChip,
                          newCodePlan === p.id && styles.filterChipActive,
                        ]}
                        onPress={() => setNewCodePlan(p.id)}>
                        <Text
                          style={[
                            styles.filterChipText,
                            newCodePlan === p.id && styles.filterChipTextActive,
                          ]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.inputLabel}>5. Rol y Permisos dentro de la App:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginVertical: 8 }}>
                    {(
                      [
                        { id: 'user', label: '👤 Usuario VIP' },
                        { id: 'moderator', label: '🛡️ Moderador Verificador' },
                        { id: 'staff', label: '🛠️ Staff Soporte' },
                        { id: 'admin', label: '👑 Co-Admin' },
                      ] as { id: UserRole; label: string }[]
                    ).map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.filterChip,
                          newCodeRole === r.id && styles.filterChipActive,
                        ]}
                        onPress={() => setNewCodeRole(r.id)}>
                        <Text
                          style={[
                            styles.filterChipText,
                            newCodeRole === r.id && styles.filterChipTextActive,
                          ]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.inputLabel}>6. Límite máximo de personas que pueden usarlo:</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                    {[
                      { val: 1, label: '1 persona' },
                      { val: 10, label: '10 usos' },
                      { val: 50, label: '50 usos' },
                      { val: 0, label: '♾️ Ilimitado' },
                    ].map((u) => (
                      <TouchableOpacity
                        key={u.val}
                        style={[
                          styles.filterChip,
                          { flex: 1, marginRight: 0, alignItems: 'center' },
                          newCodeMaxUses === u.val && styles.filterChipActive,
                        ]}
                        onPress={() => setNewCodeMaxUses(u.val)}>
                        <Text
                          style={[
                            styles.filterChipText,
                            newCodeMaxUses === u.val && styles.filterChipTextActive,
                          ]}>
                          {u.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.createStaffBtn, { backgroundColor: '#F59E0B', marginTop: 10 }]}
                    onPress={handleCreateInviteCode}>
                    <Icon name="ticket-percent" size={18} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={[styles.createStaffBtnText, { color: '#0F172A' }]}>
                      ➕ CREAR Y ACTIVAR CÓDIGO DE INVITACIÓN
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* LISTA DE CÓDIGOS ACTIVOS */}
                <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>
                  CÓDIGOS LISTOS PARA COMPARTIR ({inviteCodes.length})
                </Text>

                {inviteCodes.map((item) => {
                  const isVip = item.grantedPlan === 'lifetime_vip';
                  const badgeColor = !item.isActive
                    ? '#64748B'
                    : isVip
                    ? '#F59E0B'
                    : '#10B981';

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.incidentCard,
                        {
                          borderColor: item.isActive ? badgeColor + '66' : '#334155',
                          opacity: item.isActive ? 1 : 0.65,
                        },
                      ]}>
                      <View style={styles.incidentHeaderRow}>
                        <View
                          style={{
                            backgroundColor: badgeColor + '22',
                            borderWidth: 1,
                            borderColor: badgeColor,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}>
                          <Text
                            style={{
                              color: badgeColor,
                              fontWeight: '900',
                              fontSize: 14,
                              letterSpacing: 0.8,
                            }}>
                            🎟️ {item.code}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: '#F8FAFC', fontSize: 12, fontWeight: '800' }}>
                            Usos: {item.usedCount} / {item.maxUses === 0 ? '♾️' : item.maxUses}
                          </Text>
                          <Text
                            style={{
                              color: item.isActive ? '#10B981' : '#EF4444',
                              fontSize: 10,
                              fontWeight: '800',
                            }}>
                            {item.isActive ? '● ACTIVO' : '⏸ PAUSADO'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.incidentTitle}>{item.label}</Text>

                      <View style={styles.incidentMetaBox}>
                        <Text style={[styles.incidentMetaText, { color: '#38BDF8', fontWeight: '700' }]}>
                          🎁 Plan:{' '}
                          {item.grantedPlan === 'lifetime_vip'
                            ? '💎 VIP VITALICIO (Todo Gratis)'
                            : item.grantedPlan === 'pro_annual'
                            ? '🚀 PRO ANUAL (1 Año Gratis)'
                            : '🚐 PRO MENSUAL'}{' '}
                          · Rol: {item.grantedRole.toUpperCase()}
                        </Text>
                        <Text style={styles.incidentMetaText}>
                          ⭐ Bonus: +{item.bonusPoints} CamperPoints · 🗺️ {item.offlineCredits} sem.
                          Mapas Offline 3D
                        </Text>
                        {item.redeemedBy && item.redeemedBy.length > 0 && (
                          <Text style={[styles.incidentMetaText, { color: '#CBD5E1', marginTop: 4 }]}>
                            ✅ Canjeado por:{' '}
                            {item.redeemedBy
                              .slice(0, 4)
                              .map((r) => `${r.emailOrName} (${r.date})`)
                              .join(', ')}
                          </Text>
                        )}
                      </View>

                      <View style={[styles.incidentActionsRow, { flexWrap: 'wrap' }]}>
                        <TouchableOpacity
                          style={[
                            styles.incActionBtn,
                            { backgroundColor: 'rgba(16, 185, 129, 0.22)', borderWidth: 1, borderColor: '#10B981' },
                          ]}
                          onPress={() => handleShareInviteCode(item)}>
                          <Icon name="share-variant" size={14} color="#10B981" />
                          <Text style={[styles.incActionText, { color: '#10B981' }]}>
                            📲 Compartir por WhatsApp
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.incActionBtn,
                            { backgroundColor: 'rgba(245, 158, 11, 0.18)' },
                          ]}
                          onPress={() => handleToggleCodeActive(item)}>
                          <Icon
                            name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                            size={14}
                            color="#F59E0B"
                          />
                          <Text style={[styles.incActionText, { color: '#F59E0B' }]}>
                            {item.isActive ? 'Pausar' : 'Activar'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.incActionBtn,
                            { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                          ]}
                          onPress={() => handleDeleteInviteCode(item)}>
                          <Icon name="trash-can-outline" size={14} color="#EF4444" />
                          <Text style={[styles.incActionText, { color: '#EF4444' }]}>Borrar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ========================================================= */}
            {/* PESTAÑA 4: ANALÍTICA Y KPIS EN TIEMPO REAL */}
            {/* ========================================================= */}
            {activeTab === 'kpis' && liveStats && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>TELEMETRÍA DE LA PLATAFORMA EN VIVO</Text>
                  <View style={styles.livePulsePod}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveText}>SUPABASE LIVE</Text>
                  </View>
                </View>

                <View style={styles.kpiGrid}>
                  <View style={styles.kpiBox}>
                    <Icon name="tent" size={26} color="#10B981" />
                    <Text style={styles.kpiNumber}>
                      {liveStats.totalSpotsCount.toLocaleString()}
                    </Text>
                    <Text style={styles.kpiLabel}>Ubicaciones en BD</Text>
                  </View>

                  <View style={styles.kpiBox}>
                    <Icon name="speedometer" size={26} color="#EF4444" />
                    <Text style={styles.kpiNumber}>
                      {liveStats.totalRadarsCount.toLocaleString()}
                    </Text>
                    <Text style={styles.kpiLabel}>Radares Oficiales DGT</Text>
                  </View>

                  <View style={styles.kpiBox}>
                    <Icon name="navigation-variant" size={26} color="#38BDF8" />
                    <Text style={styles.kpiNumber}>
                      {liveStats.routesCalculatedCount.toLocaleString()}
                    </Text>
                    <Text style={styles.kpiLabel}>Rutas 3D Calculadas</Text>
                  </View>

                  <View style={styles.kpiBox}>
                    <Icon name="alert-decagram" size={26} color="#F59E0B" />
                    <Text style={styles.kpiNumber}>{liveStats.openIncidentsCount}</Text>
                    <Text style={styles.kpiLabel}>Incidencias Activas</Text>
                  </View>
                </View>

                <Text style={[styles.subSectionTitle, { marginTop: 20 }]}>
                  USO POR TIPO DE VEHÍCULO (MULTIVEHÍCULO)
                </Text>
                <View style={styles.breakdownCard}>
                  {[
                    {
                      label: '🚐 Campers y Autocaravanas',
                      pct: liveStats.vehicleDistribution.camper,
                      color: '#38BDF8',
                    },
                    {
                      label: '🏍️ Motos (Trail / Monte / Carretera)',
                      pct: liveStats.vehicleDistribution.moto,
                      color: '#F97316',
                    },
                    {
                      label: '🚙 4x4 Off-Road y Overland',
                      pct: liveStats.vehicleDistribution.offroad4x4,
                      color: '#10B981',
                    },
                    {
                      label: '🚗 Coches Turismo / SUV',
                      pct: liveStats.vehicleDistribution.car,
                      color: '#A855F7',
                    },
                    {
                      label: '🚛 Camiones y Furgón Reparto',
                      pct: liveStats.vehicleDistribution.truck,
                      color: '#F59E0B',
                    },
                    {
                      label: '🆘 Modo SOS / Rescate / Senderismo',
                      pct: liveStats.vehicleDistribution.sos,
                      color: '#EF4444',
                    },
                  ].map((item) => (
                    <View key={item.label} style={{ marginBottom: 12 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}>
                        <Text style={{ color: '#E2E8F0', fontSize: 13, fontWeight: '600' }}>
                          {item.label}
                        </Text>
                        <Text style={{ color: item.color, fontSize: 13, fontWeight: '800' }}>
                          {item.pct}%
                        </Text>
                      </View>
                      <View style={styles.latencyBarBg}>
                        <View
                          style={[
                            styles.latencyBarFill,
                            { width: `${item.pct}%`, backgroundColor: item.color },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* PESTAÑA 4: BALANCES Y FINANZAS */}
            {/* ========================================================= */}
            {activeTab === 'balances' && metrics && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>BALANCE ECONÓMICO MENSUAL</Text>
                  <View style={styles.livePulsePod}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveText}>EN DIRECTO</Text>
                  </View>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={[styles.metricCard, { borderColor: '#10B981' }]}>
                    <Text style={styles.metricLabel}>Ingresos Brutos</Text>
                    <Text style={[styles.metricValue, { color: '#10B981' }]}>
                      {metrics.grossRevenueEur.toFixed(2)} €
                    </Text>
                    <Text style={styles.metricSub}>Suscripciones + Ads + B2B</Text>
                  </View>

                  <View style={[styles.metricCard, { borderColor: '#EF4444' }]}>
                    <Text style={styles.metricLabel}>Costes Servidores</Text>
                    <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                      -{metrics.operationalCostsEur.toFixed(2)} €
                    </Text>
                    <Text style={styles.metricSub}>Supabase + OSRM + Maps</Text>
                  </View>
                </View>

                <View style={[styles.netProfitCard, { borderColor: '#38BDF8' }]}>
                  <View style={styles.profitHeaderRow}>
                    <View>
                      <Text style={styles.profitTitle}>BENEFICIO NETO ESTIMADO</Text>
                      <Text style={styles.profitSub}>
                        Margen de Ganancia: {metrics.profitMarginPercent}%
                      </Text>
                    </View>
                    <Text style={styles.profitValue}>{metrics.netProfitEur.toFixed(2)} €</Text>
                  </View>
                  <View style={styles.profitDivider} />
                  <View style={styles.mrrRow}>
                    <Text style={styles.mrrText}>MRR: {metrics.mrrEur.toFixed(2)} €/mes</Text>
                    <Text style={styles.arrText}>ARR: {metrics.arrEur.toFixed(2)} €/año</Text>
                  </View>
                </View>

                <Text style={[styles.subSectionTitle, { marginTop: 18 }]}>
                  DESGLOSE DE FUENTES DE INGRESOS
                </Text>
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownRow}>
                    <View style={styles.sourceInfo}>
                      <Icon
                        name="van-utility"
                        size={18}
                        color="#38BDF8"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.sourceName}>Suscripciones Camper Pro</Text>
                    </View>
                    <Text style={styles.sourceAmount}>
                      {metrics.subscriptionRevenueEur.toFixed(2)} €
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.sourceInfo}>
                      <Icon
                        name="google-ads"
                        size={18}
                        color="#F59E0B"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.sourceName}>Google Ads (AdMob) + Patrocinios</Text>
                    </View>
                    <Text style={styles.sourceAmount}>{metrics.adRevenueEur.toFixed(2)} €</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.sourceInfo}>
                      <Icon
                        name="handshake"
                        size={18}
                        color="#10B981"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.sourceName}>Afiliados B2B (Baleària, IATI Seguros)</Text>
                    </View>
                    <Text style={styles.sourceAmount}>
                      {metrics.affiliateRevenueEur.toFixed(2)} €
                    </Text>
                  </View>
                </View>

                <Text style={[styles.subSectionTitle, { marginTop: 22 }]}>
                  CUENTA DE COBROS Y LIQUIDACIÓN
                </Text>
                <View style={styles.payoutCard}>
                  <View style={styles.payoutHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payoutCardTitle}>Saldo Pendiente de Liquidación</Text>
                      <Text style={styles.payoutSub}>
                        Transferencia periódica mensual de ganancias netas
                      </Text>
                    </View>
                    <Text style={styles.payoutAvailable}>
                      {metrics.pendingPayoutEur.toFixed(2)} €
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cuenta de PayPal para Cobros:</Text>
                    <View style={styles.textInputBox}>
                      <Icon name="paypal" size={20} color="#0079C1" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="tu-correo@paypal.com"
                        placeholderTextColor="#64748B"
                        value={paypalInput}
                        onChangeText={setPaypalInput}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Titular de la Cuenta:</Text>
                    <View style={styles.textInputBox}>
                      <Icon name="account" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Nombre o Razón Social"
                        placeholderTextColor="#64748B"
                        value={holderInput}
                        onChangeText={setHolderInput}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cuenta Bancaria / IBAN (SEPA):</Text>
                    <View style={styles.textInputBox}>
                      <Icon name="bank" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="ES00 0000 0000 0000 0000 0000"
                        placeholderTextColor="#64748B"
                        value={ibanInput}
                        onChangeText={setIbanInput}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.savePayoutBtn}
                    onPress={handleSavePayoutConfig}
                    activeOpacity={0.85}>
                    <Icon
                      name="check-circle"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.savePayoutBtnText}>GUARDAR CUENTA DE COBROS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* PESTAÑA 5: USUARIOS Y EQUIPO */}
            {/* ========================================================= */}
            {activeTab === 'users' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>GESTIÓN DE USUARIOS Y EQUIPO</Text>
                  <Text style={styles.countBadge}>{filteredUsers.length} activos</Text>
                </View>

                <View style={styles.searchRow}>
                  <Icon
                    name="magnify"
                    size={20}
                    color="#64748B"
                    style={{ marginLeft: 12, marginRight: 6 }}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por email o nombre..."
                    placeholderTextColor="#64748B"
                    value={searchUserQuery}
                    onChangeText={setSearchUserQuery}
                    autoCapitalize="none"
                  />
                  {searchUserQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchUserQuery('')}
                      style={{ padding: 8 }}>
                      <Icon name="close" size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.roleFiltersScroll}>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'admin', label: '👑 Admins' },
                    { id: 'staff', label: '🛠️ Staff' },
                    { id: 'moderator', label: '🛡️ Moderadores' },
                    { id: 'user', label: '👤 Usuarios' },
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.filterChip, roleFilter === f.id && styles.filterChipActive]}
                      onPress={() => setRoleFilter(f.id)}>
                      <Text
                        style={[
                          styles.filterChipText,
                          roleFilter === f.id && styles.filterChipTextActive,
                        ]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.usersList}>
                  {filteredUsers.map((u) => (
                    <View
                      key={u.id}
                      style={[
                        styles.userCard,
                        u.isBlocked && styles.userCardBlocked,
                        u.role === 'admin' && styles.userCardAdmin,
                      ]}>
                      <View style={styles.userCardHeader}>
                        <View style={styles.userAvatarBox}>
                          <Text style={styles.userAvatarText}>
                            {u.displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.userDisplayName}>{u.displayName}</Text>
                            {u.isBlocked && (
                              <View style={styles.blockedBadge}>
                                <Text style={styles.blockedBadgeText}>BLOQUEADO</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.userEmail}>{u.email}</Text>
                          <Text style={styles.userMeta}>
                            Registrado: {u.createdAt} · Último acceso: {u.lastLogin}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.userActionsRow}>
                        <TouchableOpacity
                          style={styles.actionPill}
                          onPress={() => handleChangeUserRole(u)}
                          activeOpacity={0.8}>
                          <Icon
                            name={
                              u.role === 'admin'
                                ? 'crown'
                                : u.role === 'staff'
                                ? 'wrench'
                                : 'account'
                            }
                            size={14}
                            color="#38BDF8"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.actionPillText}>Rol: {u.role.toUpperCase()}</Text>
                          <Icon name="chevron-down" size={14} color="#64748B" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionPill}
                          onPress={() => handleChangeUserPlan(u)}
                          activeOpacity={0.8}>
                          <Icon
                            name="star-circle"
                            size={14}
                            color="#F59E0B"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.actionPillText}>Plan: {u.plan.toUpperCase()}</Text>
                          <Icon name="chevron-down" size={14} color="#64748B" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.blockBtn,
                            u.isBlocked ? styles.unblockBtn : styles.blockBtnActive,
                          ]}
                          onPress={() => handleToggleBlock(u)}
                          activeOpacity={0.8}>
                          <Icon
                            name={u.isBlocked ? 'lock-open' : 'lock'}
                            size={14}
                            color="#FFFFFF"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.blockBtnText}>
                            {u.isBlocked ? 'Desbloquear' : 'Bloquear'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Invitar personal */}
                <View style={[styles.addStaffCard, { marginTop: 20 }]}>
                  <Text style={styles.addStaffTitle}>Añadir Miembro al Equipo Operativo</Text>
                  <Text style={styles.addStaffSub}>
                    Otorga permisos de soporte o moderación a colaboradores.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Correo electrónico:</Text>
                    <View style={styles.textInputBox}>
                      <Icon name="email" size={18} color="#64748B" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="colaborador@campersites.es"
                        placeholderTextColor="#64748B"
                        value={newStaffEmail}
                        onChangeText={setNewStaffEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre o Alias:</Text>
                    <View style={styles.textInputBox}>
                      <Icon name="account" size={18} color="#64748B" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Ej. Laura Soporte"
                        placeholderTextColor="#64748B"
                        value={newStaffName}
                        onChangeText={setNewStaffName}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.createStaffBtn}
                    onPress={handleCreateStaff}
                    activeOpacity={0.85}>
                    <Icon
                      name="account-plus"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.createStaffBtnText}>REGISTRAR EN EL EQUIPO</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shieldIconPod: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  webAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  webAdminBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#38BDF8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  globalHealthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 18,
  },
  globalHealthTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
  },
  globalHealthSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  pingNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  pingNowBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  serverDetailCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  serverDetailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  serverDetailName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  serverDetailEndpoint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  serverStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  serverStatusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  serverCheckedAt: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 3,
  },
  latencyBarBg: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  latencyBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  serverDetailInfo: {
    color: '#94A3B8',
    fontSize: 11,
  },
  newIncidentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newIncidentBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  newIncidentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  incInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  incidentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  incidentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sevBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sevBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  incidentTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  incidentDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  incidentMetaBox: {
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  incidentMetaText: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 2,
  },
  incidentActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  incActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  incActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  livePulsePod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 10,
    color: '#64748B',
  },
  netProfitCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  profitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  profitSub: {
    fontSize: 11,
    color: '#38BDF8',
    marginTop: 2,
  },
  profitValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#38BDF8',
  },
  profitDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  mrrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mrrText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  arrText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '800',
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  breakdownCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceName: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  sourceAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  payoutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  payoutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  payoutCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  payoutSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  payoutAvailable: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textInput: {
    flex: 1,
    height: 42,
    color: '#F8FAFC',
    fontSize: 13,
  },
  savePayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  savePayoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  countBadge: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: '#F8FAFC',
    fontSize: 13,
  },
  roleFiltersScroll: {
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#38BDF8',
  },
  usersList: {
    gap: 10,
  },
  userCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  userCardBlocked: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  userCardAdmin: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  userAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  userDisplayName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  userEmail: {
    fontSize: 12,
    color: '#94A3B8',
  },
  userMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  blockedBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  blockedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  userActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
    marginRight: 4,
  },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  blockBtnActive: {
    backgroundColor: '#EF4444',
  },
  unblockBtn: {
    backgroundColor: '#10B981',
  },
  blockBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addStaffCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  addStaffTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  addStaffSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
  },
  createStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  createStaffBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiBox: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
});
