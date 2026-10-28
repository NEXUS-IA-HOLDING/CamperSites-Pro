/**
 * AdminActivationPanel - Componente para activar modo administrador
 * CamperSites Pro - YRYS
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CamperSitesTheme as theme } from '../theme';
import {
  validateAdminCode,
  activateAdminMode,
  isAdminActive,
  deactivateAdminMode,
  getAdminSessionInfo,
  getAdminPermissions,
} from '../lib/adminAuth';

export default function AdminActivationPanel() {
  const [showModal, setShowModal] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLevel, setAdminLevel] = useState<string | undefined>();
  const [sessionInfo, setSessionInfo] = useState<{
    level?: string;
    expiresAt?: string;
    timeRemaining?: string;
  } | null>(null);

  // Verificar estado admin al montar
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const status = await isAdminActive();
    setIsAdmin(status.active);
    
    if (status.active && status.level) {
      setAdminLevel(status.level);
      const info = await getAdminSessionInfo();
      setSessionInfo(info);
    }
  };

  const handleActivate = async () => {
    if (!adminCode.trim()) {
      Alert.alert('Error', 'Ingresa un código de administrador');
      return;
    }

    setLoading(true);

    try {
      // Validar código
      const result = await validateAdminCode(adminCode);

      if (result.valid && result.adminLevel) {
        // Activar modo admin
        const activation = await activateAdminMode(result.adminLevel);

        if (activation.success) {
          Alert.alert(
            '¡Modo Admin Activado!',
            `Nivel: ${result.adminLevel.toUpperCase()}\n` +
            `Acceso total por 24 horas\n\n` +
            `Ahora puedes probar todas las funcionalidades premium.`,
            [{ text: 'Genial', onPress: () => {
              setShowModal(false);
              setAdminCode('');
              checkAdminStatus();
            }}]
          );
        } else {
          Alert.alert('Error', activation.error || 'No se pudo activar');
        }
      } else {
        Alert.alert('Código Inválido', result.error || 'Verifica el código e intenta nuevamente');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Desactivar Modo Admin',
      '¿Estás seguro de que deseas desactivar el modo administrador?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            await deactivateAdminMode();
            setIsAdmin(false);
            setAdminLevel(undefined);
            setSessionInfo(null);
            Alert.alert('Modo Admin Desactivado');
          },
        },
      ]
    );
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'master':
        return '#FFD700'; // Dorado
      case 'test':
        return theme.colors.primary.main;
      case 'support':
        return theme.colors.text.secondary;
      default:
        return theme.colors.text.hint;
    }
  };

  const getLevelIcon = (level?: string) => {
    switch (level) {
      case 'master':
        return 'crown';
      case 'test':
        return 'bug';
      case 'support':
        return 'headset';
      default:
        return 'shield-account';
    }
  };

  // Renderizar panel si es admin
  if (isAdmin && sessionInfo) {
    return (
      <View style={styles.adminPanel}>
        <View style={styles.adminHeader}>
          <View style={[styles.adminBadge, { backgroundColor: getLevelColor(adminLevel) + '20' }]}>
            <Icon name={getLevelIcon(adminLevel)} size={24} color={getLevelColor(adminLevel)} />
            <Text style={[styles.adminBadgeText, { color: getLevelColor(adminLevel) }]}>
              {adminLevel?.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDeactivate} style={styles.deactivateButton}>
            <Icon name="logout" size={20} color={theme.colors.alerts.radar} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.adminInfo}>
          <View style={styles.infoRow}>
            <Icon name="clock-outline" size={16} color={theme.colors.text.hint} />
            <Text style={styles.infoText}>
              Expira: {sessionInfo.expiresAt}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="timer-sand" size={16} color={theme.colors.text.hint} />
            <Text style={styles.infoText}>
              Tiempo restante: {sessionInfo.timeRemaining}
            </Text>
          </View>
        </View>

        <View style={styles.permissionsList}>
          <Text style={styles.permissionsTitle}>Permisos Activos:</Text>
          {adminLevel && (() => {
            const permissions = getAdminPermissions(adminLevel as any);
            return (
              <>
                {permissions.canAccessAllPlans && (
                  <View style={styles.permissionItem}>
                    <Icon name="check-circle" size={14} color={theme.colors.success.main} />
                    <Text style={styles.permissionText}>Acceso a todos los planes</Text>
                  </View>
                )}
                {permissions.canModifySettings && (
                  <View style={styles.permissionItem}>
                    <Icon name="check-circle" size={14} color={theme.colors.success.main} />
                    <Text style={styles.permissionText}>Modificar configuración</Text>
                  </View>
                )}
                {permissions.canBypassLimits && (
                  <View style={styles.permissionItem}>
                    <Icon name="check-circle" size={14} color={theme.colors.success.main} />
                    <Text style={styles.permissionText}>Omitir límites</Text>
                  </View>
                )}
                {permissions.canAccessDebugTools && (
                  <View style={styles.permissionItem}>
                    <Icon name="check-circle" size={14} color={theme.colors.success.main} />
                    <Text style={styles.permissionText}>Herramientas de debug</Text>
                  </View>
                )}
              </>
            );
          })()}
        </View>
      </View>
    );
  }

  // Renderizar botón de activación
  return (
    <>
      <TouchableOpacity 
        style={styles.activateButton}
        onPress={() => setShowModal(true)}
      >
        <Icon name="shield-key" size={20} color={theme.colors.primary.main} />
        <Text style={styles.activateButtonText}>Activar Modo Admin</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="shield-key" size={40} color={theme.colors.primary.main} />
              <Text style={styles.modalTitle}>Activar Modo Administrador</Text>
              <Text style={styles.modalSubtitle}>
                Ingresa tu código para acceder a todas las funcionalidades
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.codeInput}
                placeholder="CÓDIGO ADMIN"
                placeholderTextColor={theme.colors.text.hint}
                value={adminCode}
                onChangeText={setAdminCode}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                editable={!loading}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setAdminCode('');
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, loading && styles.confirmButtonDisabled]}
                onPress={handleActivate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="key" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Activar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.helpText}>
              <Icon name="information-outline" size={14} color={theme.colors.text.hint} />
              <Text style={styles.helpTextContent}>
                El código expira en 24 horas. Solo para testing y desarrollo.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Panel de admin activo
  adminPanel: {
    backgroundColor: theme.colors.background.light,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary.main + '30',
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deactivateButton: {
    padding: 8,
  },
  adminInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  permissionsList: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.main,
    paddingTop: 12,
  },
  permissionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },

  // Botón de activación
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    backgroundColor: theme.colors.primary.main + '10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary.main + '30',
    borderStyle: 'dashed',
  },
  activateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary.main,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.background.main,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: theme.colors.background.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 1.5,
    borderColor: theme.colors.border.main,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: theme.colors.background.light,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary.main,
    ...theme.shadows.md,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.main,
  },
  helpTextContent: {
    fontSize: 12,
    color: theme.colors.text.hint,
    textAlign: 'center',
  },
});
