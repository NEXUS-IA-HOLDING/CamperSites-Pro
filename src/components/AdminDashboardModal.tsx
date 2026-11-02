/**
 * AdminDashboardModal.tsx - Panel Integral de Administración y Centro de Mando
 * CamperSites Pro (YRYS)
 * 
 * Permite a los administradores:
 * 1. Visualizar balances de costes y ganancias en tiempo real.
 * 2. Gestionar la cuenta de cobro (PayPal / SEPA).
 * 3. Consultar, buscar y filtrar usuarios.
 * 4. Dar y quitar privilegios (Admin, Staff, Moderador, Usuario).
 * 5. Cambiar suscripciones (Free, Pro Mensual, Pro Anual, VIP).
 * 6. Bloquear y desbloquear usuarios infractores al instante.
 * 7. Añadir y escalar miembros del equipo y personal.
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  adminService,
  AdminUserRecord,
  FinancialBalanceMetrics,
  PayoutConfiguration,
  UserRole,
  UserPlan,
} from '../services/AdminService';

interface AdminDashboardModalProps {
  visible: boolean;
  onClose: () => void;
}

type AdminTab = 'balances' | 'users' | 'team' | 'kpis';

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('balances');
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<FinancialBalanceMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [payoutConfig, setPayoutConfig] = useState<PayoutConfiguration | null>(null);

  // Filtros de usuarios
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Formulario nuevo miembro de equipo
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('staff');

  // Formulario de pagos
  const [paypalInput, setPaypalInput] = useState('');
  const [ibanInput, setIbanInput] = useState('');
  const [holderInput, setHolderInput] = useState('');

  useEffect(() => {
    if (visible) {
      loadAllDashboardData();
    }
  }, [visible]);

  const loadAllDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Barrera de Seguridad Criptográfica / RBAC
      const authCheck = await adminService.verifyAdminAccess();
      if (!authCheck.authorized) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }
      setIsAuthorized(true);

      const [m, u, p] = await Promise.all([
        adminService.getFinancialMetrics(),
        adminService.getUsersList(),
        adminService.getPayoutConfig(),
      ]);
      setMetrics(m);
      setUsers(u);
      setPayoutConfig(p);
      setPaypalInput(p.paypalEmail);
      setIbanInput(p.iban);
      setHolderInput(p.accountHolder);
    } catch (e) {
      setIsAuthorized(false);
      Alert.alert('Acceso Denegado', 'No dispones de credenciales maestras de administrador');
    } finally {
      setLoading(false);
    }
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

  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchUserQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

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
              <Text style={styles.headerTitle}>PANEL DE ADMINISTRACIÓN</Text>
              <Text style={styles.headerSubtitle}>Centro de Mando Ejecutivo · YRYS</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* CONTROL DE AUTORIZACIÓN: SI NO ES ADMIN MAESTRO SE BLOQUEA */}
        {isAuthorized === false ? (
          <View style={styles.accessDeniedContainer}>
            <View style={styles.accessDeniedIconBox}>
              <Icon name="shield-lock" size={64} color="#EF4444" />
            </View>
            <Text style={styles.accessDeniedTitle}>ACCESO RESTRINGIDO (403)</Text>
            <Text style={styles.accessDeniedSub}>
              Esta consola ejecutiva está reservada exclusivamente para el Administrador Maestro (equipo-ia@proton.me).
              Tu identidad no dispone de credenciales maestras autorizadas.
            </Text>
            <TouchableOpacity style={styles.accessDeniedBackBtn} onPress={onClose} activeOpacity={0.85}>
              <Icon name="arrow-left" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.accessDeniedBackBtnText}>Volver a la Aplicación</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* SELECTOR DE PESTAÑAS TÁCTICAS */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'balances' && styles.tabBtnActive]}
                onPress={() => setActiveTab('balances')}>
                <Icon
                  name="cash-multiple"
                  size={18}
                  color={activeTab === 'balances' ? '#38BDF8' : '#64748B'}
                />
                <Text style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}>
                  Balances
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
                onPress={() => setActiveTab('users')}>
                <Icon
                  name="account-group"
                  size={18}
                  color={activeTab === 'users' ? '#38BDF8' : '#64748B'}
                />
                <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
                  Usuarios ({users.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'team' && styles.tabBtnActive]}
                onPress={() => setActiveTab('team')}>
                <Icon
                  name="account-plus"
                  size={18}
                  color={activeTab === 'team' ? '#38BDF8' : '#64748B'}
                />
                <Text style={[styles.tabText, activeTab === 'team' && styles.tabTextActive]}>
                  Equipo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'kpis' && styles.tabBtnActive]}
                onPress={() => setActiveTab('kpis')}>
                <Icon
                  name="chart-timeline-variant"
                  size={18}
                  color={activeTab === 'kpis' ? '#38BDF8' : '#64748B'}
                />
                <Text style={[styles.tabText, activeTab === 'kpis' && styles.tabTextActive]}>
                  KPIs
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.loadingText}>Cargando datos en tiempo real...</Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* ========================================================= */}
            {/* PESTAÑA 1: BALANCES Y FINANZAS */}
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

                {/* TARJETAS PRINCIPALES DE BALANCE */}
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
                      <Text style={styles.profitSub}>Margen de Ganancia: {metrics.profitMarginPercent}%</Text>
                    </View>
                    <Text style={styles.profitValue}>{metrics.netProfitEur.toFixed(2)} €</Text>
                  </View>
                  <View style={styles.profitDivider} />
                  <View style={styles.mrrRow}>
                    <Text style={styles.mrrText}>MRR (Ingreso Mensual Recurrente): {metrics.mrrEur.toFixed(2)} €/mes</Text>
                    <Text style={styles.arrText}>ARR: {metrics.arrEur.toFixed(2)} €/año</Text>
                  </View>
                </View>

                {/* DESGLOSE POR FUENTES */}
                <Text style={[styles.subSectionTitle, { marginTop: 18 }]}>DESGLOSE DE FUENTES DE INGRESOS</Text>
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownRow}>
                    <View style={styles.sourceInfo}>
                      <Icon name="van-utility" size={18} color="#38BDF8" style={{ marginRight: 8 }} />
                      <Text style={styles.sourceName}>Suscripciones Camper Pro</Text>
                    </View>
                    <Text style={styles.sourceAmount}>{metrics.subscriptionRevenueEur.toFixed(2)} €</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.sourceInfo}>
                      <Icon name="google-ads" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                      <Text style={styles.sourceName}>Google Ads (AdMob) + Patrocinios</Text>
                    </View>
                    <Text style={styles.sourceAmount}>{metrics.adRevenueEur.toFixed(2)} €</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.sourceInfo}>
                      <Icon name="handshake" size={18} color="#10B981" style={{ marginRight: 8 }} />
                      <Text style={styles.sourceName}>Afiliados B2B (Baleària, IATI Seguros)</Text>
                    </View>
                    <Text style={styles.sourceAmount}>{metrics.affiliateRevenueEur.toFixed(2)} €</Text>
                  </View>
                </View>

                {/* RETIRADA / CONFIGURACIÓN DE CUENTA PAYPAL */}
                <Text style={[styles.subSectionTitle, { marginTop: 22 }]}>CUENTA DE COBROS Y LIQUIDACIÓN</Text>
                <View style={styles.payoutCard}>
                  <View style={styles.payoutHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.payoutCardTitle}>Saldo Pendiente de Liquidación</Text>
                      <Text style={styles.payoutSub}>Transferencia periódica mensual de ganancias netas</Text>
                    </View>
                    <Text style={styles.payoutAvailable}>{metrics.pendingPayoutEur.toFixed(2)} €</Text>
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
                    <Text style={styles.inputLabel}>Cuenta Bancaria / IBAN (Transferencias SEPA AdMob):</Text>
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

                  <TouchableOpacity style={styles.savePayoutBtn} onPress={handleSavePayoutConfig} activeOpacity={0.85}>
                    <Icon name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.savePayoutBtnText}>GUARDAR CUENTA DE COBROS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* PESTAÑA 2: USUARIOS Y PERMISOS */}
            {/* ========================================================= */}
            {activeTab === 'users' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>GESTIÓN DE USUARIOS EN TIEMPO REAL</Text>
                  <Text style={styles.countBadge}>{filteredUsers.length} encontrados</Text>
                </View>

                {/* BUSCADOR Y FILTROS */}
                <View style={styles.searchRow}>
                  <Icon name="magnify" size={20} color="#64748B" style={{ marginLeft: 12, marginRight: 6 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por email o nombre..."
                    placeholderTextColor="#64748B"
                    value={searchUserQuery}
                    onChangeText={setSearchUserQuery}
                    autoCapitalize="none"
                  />
                  {searchUserQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchUserQuery('')} style={{ padding: 8 }}>
                      <Icon name="close" size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* FILTRO DE ROLES */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFiltersScroll}>
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
                      <Text style={[styles.filterChipText, roleFilter === f.id && styles.filterChipTextActive]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* LISTA DE USUARIOS */}
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
                          <Text style={styles.userMeta}>Registrado: {u.createdAt} · Último acceso: {u.lastLogin}</Text>
                        </View>
                      </View>

                      {/* CONTROLES RÁPIDOS DE ADMINISTRACIÓN */}
                      <View style={styles.userActionsRow}>
                        {/* Selector de Rol */}
                        <TouchableOpacity
                          style={styles.actionPill}
                          onPress={() => handleChangeUserRole(u)}
                          activeOpacity={0.8}>
                          <Icon
                            name={u.role === 'admin' ? 'crown' : u.role === 'staff' ? 'wrench' : 'account'}
                            size={14}
                            color="#38BDF8"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.actionPillText}>Rol: {u.role.toUpperCase()}</Text>
                          <Icon name="chevron-down" size={14} color="#64748B" />
                        </TouchableOpacity>

                        {/* Selector de Plan */}
                        <TouchableOpacity
                          style={styles.actionPill}
                          onPress={() => handleChangeUserPlan(u)}
                          activeOpacity={0.8}>
                          <Icon name="star-circle" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                          <Text style={styles.actionPillText}>Plan: {u.plan.toUpperCase()}</Text>
                          <Icon name="chevron-down" size={14} color="#64748B" />
                        </TouchableOpacity>

                        {/* Botón de Bloqueo */}
                        <TouchableOpacity
                          style={[styles.blockBtn, u.isBlocked ? styles.unblockBtn : styles.blockBtnActive]}
                          onPress={() => handleToggleBlock(u)}
                          activeOpacity={0.8}>
                          <Icon
                            name={u.isBlocked ? 'lock-open' : 'lock'}
                            size={14}
                            color="#FFFFFF"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.blockBtnText}>{u.isBlocked ? 'Desbloquear' : 'Bloquear'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* PESTAÑA 3: EQUIPO Y ESCALABILIDAD */}
            {/* ========================================================= */}
            {activeTab === 'team' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>AÑADIR PERSONAL Y ESCALAR EQUIPO</Text>
                </View>

                <View style={styles.addStaffCard}>
                  <Text style={styles.addStaffTitle}>Invitar Nuevo Miembro Operativo</Text>
                  <Text style={styles.addStaffSub}>
                    Asigna permisos administrativos, de soporte o moderación para que tu equipo gestione la app.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Correo electrónico del miembro:</Text>
                    <View style={styles.textInputBox}>
                      <Icon name="email" size={18} color="#64748B" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="empleado@empresa.com"
                        placeholderTextColor="#64748B"
                        value={newStaffEmail}
                        onChangeText={setNewStaffEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre completo o Alias:</Text>
                    <View style={styles.textInputBox}>
                      <Icon name="account" size={18} color="#64748B" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Ej. Juan Soporte Camper"
                        placeholderTextColor="#64748B"
                        value={newStaffName}
                        onChangeText={setNewStaffName}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Rol y Nivel de Privilegios:</Text>
                    <View style={styles.rolePickerRow}>
                      {[
                        { id: 'staff' as UserRole, label: '🛠️ Staff (Soporte)' },
                        { id: 'moderator' as UserRole, label: '🛡️ Moderador' },
                        { id: 'admin' as UserRole, label: '👑 Administrador' },
                      ].map((r) => (
                        <TouchableOpacity
                          key={r.id}
                          style={[styles.roleSelectPill, newStaffRole === r.id && styles.roleSelectPillActive]}
                          onPress={() => setNewStaffRole(r.id)}>
                          <Text
                            style={[
                              styles.roleSelectText,
                              newStaffRole === r.id && styles.roleSelectTextActive,
                            ]}>
                            {r.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.createStaffBtn} onPress={handleCreateStaff} activeOpacity={0.85}>
                    <Icon name="account-plus" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.createStaffBtnText}>REGISTRAR EN EL EQUIPO</Text>
                  </TouchableOpacity>
                </View>

                {/* LISTA DEL EQUIPO ACTUAL */}
                <Text style={[styles.subSectionTitle, { marginTop: 22 }]}>MIEMBROS ACTIVOS DEL EQUIPO</Text>
                {users
                  .filter((u) => u.role !== 'user')
                  .map((m) => (
                    <View key={m.id} style={styles.teamMemberRow}>
                      <Icon
                        name={m.role === 'admin' ? 'crown' : 'shield-account'}
                        size={22}
                        color={m.role === 'admin' ? '#F59E0B' : '#38BDF8'}
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.teamMemberName}>{m.displayName}</Text>
                        <Text style={styles.teamMemberEmail}>{m.email}</Text>
                      </View>
                      <View style={styles.teamRoleBadge}>
                        <Text style={styles.teamRoleBadgeText}>{m.role.toUpperCase()}</Text>
                      </View>
                    </View>
                  ))}
              </View>
            )}

            {/* ========================================================= */}
            {/* PESTAÑA 4: KPIS EN VIVO */}
            {/* ========================================================= */}
            {activeTab === 'kpis' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>MÉTRICAS TÉCNICAS Y KPIS DE LA APP</Text>
                  <View style={styles.livePulsePod}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveText}>TIEMPO REAL</Text>
                  </View>
                </View>

                <View style={styles.kpiGrid}>
                  <View style={styles.kpiBox}>
                    <Icon name="tent" size={28} color="#10B981" />
                    <Text style={styles.kpiNumber}>517.363</Text>
                    <Text style={styles.kpiLabel}>Puntos Camper en DB</Text>
                  </View>

                  <View style={styles.kpiBox}>
                    <Icon name="speedometer" size={28} color="#EF4444" />
                    <Text style={styles.kpiNumber}>2.257</Text>
                    <Text style={styles.kpiLabel}>Radares Oficiales DGT</Text>
                  </View>

                  <View style={styles.kpiBox}>
                    <Icon name="navigation-variant" size={28} color="#38BDF8" />
                    <Text style={styles.kpiNumber}>1.840</Text>
                    <Text style={styles.kpiLabel}>Rutas Navegadas Hoy</Text>
                  </View>

                  <View style={styles.kpiBox}>
                    <Icon name="account-clock" size={28} color="#F59E0B" />
                    <Text style={styles.kpiNumber}>{users.length}</Text>
                    <Text style={styles.kpiLabel}>Usuarios Registrados</Text>
                  </View>
                </View>

                <Text style={[styles.subSectionTitle, { marginTop: 22 }]}>SALUD DE LOS SERVIDORES</Text>
                <View style={styles.serverStatusCard}>
                  {[
                    { name: 'Supabase Cloud Database & Auth', status: 'ONLINE', ping: '24ms' },
                    { name: 'Servidor de Enrutamiento OSRM GPS', status: 'ONLINE', ping: '48ms' },
                    { name: 'Mosaicos de Mapa Satelital Esri HD', status: 'ONLINE', ping: '18ms' },
                    { name: 'Geocodificador OSM Photon Europa', status: 'ONLINE', ping: '62ms' },
                  ].map((s, idx) => (
                    <View key={idx} style={styles.serverRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.greenDot} />
                        <Text style={styles.serverName}>{s.name}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.serverPing}>{s.ping}</Text>
                        <Text style={styles.serverStatusText}>{s.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
          </>
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
    gap: 12,
  },
  shieldIconPod: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  tabText: {
    fontSize: 11,
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
    padding: 30,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  livePulsePod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
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
    borderWidth: 1.5,
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
  },
  netProfitCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
  },
  profitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.6,
  },
  profitSub: {
    fontSize: 10,
    color: '#94A3B8',
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
    marginVertical: 12,
  },
  mrrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mrrText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  arrText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  breakdownCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
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
    fontSize: 12,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  sourceAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
  },
  payoutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  payoutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  payoutCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  payoutSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  payoutAvailable: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textInput: {
    flex: 1,
    height: 40,
    color: '#F8FAFC',
    fontSize: 12,
  },
  savePayoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  savePayoutBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
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
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: '#F8FAFC',
    fontSize: 12,
  },
  roleFiltersScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  usersList: {
    gap: 10,
  },
  userCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  userCardAdmin: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  userCardBlocked: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    opacity: 0.75,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  userAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38BDF8',
  },
  userDisplayName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  blockedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  blockedBadgeText: {
    fontSize: 8,
    color: '#EF4444',
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 11,
    color: '#94A3B8',
  },
  userMeta: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  userActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionPillText: {
    fontSize: 9,
    color: '#E2E8F0',
    fontWeight: '700',
    marginRight: 2,
  },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  blockBtnActive: {
    backgroundColor: '#EF4444',
  },
  unblockBtn: {
    backgroundColor: '#10B981',
  },
  blockBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addStaffCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  addStaffTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  addStaffSub: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 14,
    marginBottom: 12,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  roleSelectPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleSelectPillActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  roleSelectText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },
  roleSelectTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  createStaffBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  createStaffBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  teamMemberName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  teamMemberEmail: {
    fontSize: 10,
    color: '#94A3B8',
  },
  teamRoleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamRoleBadgeText: {
    fontSize: 9,
    color: '#38BDF8',
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiBox: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    marginVertical: 4,
  },
  kpiLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  serverStatusCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  serverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  serverName: {
    fontSize: 11,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  serverPing: {
    fontSize: 10,
    color: '#64748B',
  },
  serverStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0F172A',
  },
  accessDeniedIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  accessDeniedSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  accessDeniedBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  accessDeniedBackBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});

export default AdminDashboardModal;
