/**
 * UpdateAvailableBanner.tsx — CamperSites Pro
 * Nexus Studio (Nexus AI Holding)
 *
 * Componente visual de alto impacto (Banner superior + Modal de actualización en 1 toque)
 * que verifica `UpdateService.checkForUpdate()` al montar y cada vez que la app
 * vuelve a primer plano (`AppState`), garantizando que el usuario siempre reciba
 * el aviso de nueva versión OTA.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  AppState,
  AppStateStatus,
  Linking,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import UpdateService, { ReleaseInfo, CURRENT_VERSION } from '../services/UpdateService';

interface UpdateAvailableBannerProps {
  /** Permite mostrar el modal automáticamente al detectar una actualización obligatoria */
  autoOpenModalOnMandatory?: boolean;
}

export const UpdateAvailableBanner: React.FC<UpdateAvailableBannerProps> = ({
  autoOpenModalOnMandatory = true,
}) => {
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(
    UpdateService.getLastReleaseInfo()
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const runUpdateCheck = useCallback(async () => {
    const info = await UpdateService.checkForUpdate();
    if (info && info.isNewer) {
      setReleaseInfo(info);
      setBannerDismissed(false);
      if (autoOpenModalOnMandatory && info.mandatory) {
        setModalVisible(true);
      }
    }
  }, [autoOpenModalOnMandatory]);

  useEffect(() => {
    // Suscribirse a cambios emitidos por cualquier llamada a UpdateService.checkForUpdate()
    const unsubscribe = UpdateService.subscribe(info => {
      setReleaseInfo(info);
      if (info.isNewer) {
        setBannerDismissed(false);
      }
    });

    // Comprobación inicial al montar el componente
    runUpdateCheck();

    // Comprobación automática cada vez que la app vuelve a primer plano
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          runUpdateCheck();
        }
      }
    );

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [runUpdateCheck]);

  if (!releaseInfo || !releaseInfo.isNewer) {
    return null;
  }

  const handleDownloadPrimary = () => {
    UpdateService.openUpdateDownload(releaseInfo);
  };

  const handleOpenFallbackWeb = () => {
    const webUrl =
      releaseInfo.fallbackUrl ||
      'https://nexus-ia-holding.github.io/CamperSites-Pro/#descarga';
    Linking.openURL(webUrl).catch(() => {});
  };

  const bulletPoints = releaseInfo.releaseNotes
    .split(/[,•\n]+/)
    .map(item => item.trim())
    .filter(item => item.length > 3);

  return (
    <>
      {/* Banner Superior Flotante Imposible de Ignorar */}
      {!bannerDismissed && (
        <View style={styles.bannerContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.bannerCard}
            activeOpacity={0.9}
            onPress={() => setModalVisible(true)}>
            <View style={styles.bannerIconPulse}>
              <Icon name="cloud-download" size={22} color="#0F172A" />
            </View>
            <View style={styles.bannerTextCol}>
              <View style={styles.bannerTitleRow}>
                <Text style={styles.bannerBadge}>NUEVA VERSIÓN v{releaseInfo.version}</Text>
                {releaseInfo.mandatory && (
                  <Text style={styles.mandatoryTag}>RECOMENDADA</Text>
                )}
              </View>
              <Text style={styles.bannerSubtitle} numberOfLines={1}>
                Toca aquí para descargar e instalar las últimas mejoras 3D
              </Text>
            </View>
            <View style={styles.bannerCtaPill}>
              <Text style={styles.bannerCtaText}>ACTUALIZAR</Text>
              <Icon name="chevron-right" size={16} color="#0F172A" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Completo de Actualización en 1 Toque */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Cabecera del Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.rocketCircle}>
                <Icon name="rocket-launch" size={30} color="#10B981" />
              </View>
              <View style={styles.versionPillsRow}>
                <View style={styles.oldVersionPill}>
                  <Text style={styles.oldVersionText}>Actual: v{CURRENT_VERSION}</Text>
                </View>
                <Icon name="arrow-right" size={16} color="#38BDF8" />
                <View style={styles.newVersionPill}>
                  <Text style={styles.newVersionText}>Nueva: v{releaseInfo.version}</Text>
                </View>
              </View>
              <Text style={styles.modalTitle}>
                ¡Actualización Oficial Disponible!
              </Text>
              <Text style={styles.modalSubtitle}>
                CamperSites Pro se ha actualizado con nuevas funciones de cabina 3D y base de datos mejorada.
              </Text>
            </View>

            {/* Barra de Novedades */}
            <View style={styles.notesBox}>
              <Text style={styles.notesHeader}>NOVEDADES DE ESTA VERSIÓN</Text>
              <ScrollView
                style={styles.notesScroll}
                showsVerticalScrollIndicator={false}>
                {bulletPoints.length > 0 ? (
                  bulletPoints.map((note, idx) => (
                    <View key={idx} style={styles.noteRow}>
                      <Icon
                        name="check-decagram"
                        size={16}
                        color="#10B981"
                        style={styles.noteIcon}
                      />
                      <Text style={styles.noteText}>{note}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noteText}>{releaseInfo.releaseNotes}</Text>
                )}
              </ScrollView>
            </View>

            {/* Botón Directo en 1 Toque */}
            <TouchableOpacity
              style={styles.downloadPrimaryBtn}
              activeOpacity={0.85}
              onPress={handleDownloadPrimary}>
              <Text style={styles.downloadPrimaryText}>
                ⬇️ DESCARGAR E INSTALAR ACTUALIZACIÓN
              </Text>
            </TouchableOpacity>

            {/* Enlace Alternativo a la Web Oficial */}
            <TouchableOpacity
              style={styles.fallbackWebBtn}
              activeOpacity={0.8}
              onPress={handleOpenFallbackWeb}>
              <Icon name="web" size={16} color="#38BDF8" />
              <Text style={styles.fallbackWebText}>
                Abrir página oficial de descarga (QR / Web)
              </Text>
            </TouchableOpacity>

            {/* Cerrar modal manteniendo el banner o posponer */}
            <TouchableOpacity
              style={styles.laterBtn}
              activeOpacity={0.75}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.laterBtnText}>Recordármelo más tarde</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    zIndex: 999,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 16,
  },
  bannerIconPulse: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bannerTextCol: {
    flex: 1,
    marginRight: 8,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerBadge: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.4,
  },
  mandatoryTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F172A',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#E2E8F0',
    marginTop: 2,
    fontWeight: '600',
  },
  bannerCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bannerCtaText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rocketCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  oldVersionPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  oldVersionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  newVersionPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newVersionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  notesBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  notesHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  notesScroll: {
    maxHeight: 160,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12.5,
    color: '#E2E8F0',
    lineHeight: 18,
    fontWeight: '600',
  },
  downloadPrimaryBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  downloadPrimaryText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  fallbackWebBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  fallbackWebText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  laterBtn: {
    paddingVertical: 10,
    marginTop: 4,
    alignItems: 'center',
  },
  laterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default UpdateAvailableBanner;
