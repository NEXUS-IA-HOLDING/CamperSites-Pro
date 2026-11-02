/**
 * OfflineVaultManager.tsx - Gestor de Bóveda de Puntos y Mapas Offline
 * CamperSites Pro - Rival de Park4Night Pro y Sygic Truck
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  offlineSpotVault,
  REGIONAL_OFFLINE_PACKS,
  OfflineRegionPack,
} from '../services/OfflineSpotVaultService';

export const OfflineVaultManager: React.FC = () => {
  const [installedPacks, setInstalledPacks] = useState<string[]>([]);
  const [downloadingPackId, setDownloadingPackId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [totalSpots, setTotalSpots] = useState<number>(0);

  useEffect(() => {
    refreshInstalledPacks();
  }, []);

  const refreshInstalledPacks = () => {
    const installed = offlineSpotVault.getInstalledPackIds();
    setInstalledPacks(installed);
    setTotalSpots(offlineSpotVault.getTotalOfflineSpotsCount());
  };

  const handleInstall = async (packId: string) => {
    setDownloadingPackId(packId);
    setDownloadProgress(10);

    const success = await offlineSpotVault.installPack(packId, (p) => {
      setDownloadProgress(p);
    });

    setDownloadingPackId(null);
    setDownloadProgress(0);

    if (success) {
      refreshInstalledPacks();
      Alert.alert('¡Paquete Instalado!', 'Los puntos y servicios de esta región ya están disponibles offline.');
    } else {
      Alert.alert('Error', 'No se pudo completar la instalación.');
    }
  };

  const handleUninstall = (pack: typeof REGIONAL_OFFLINE_PACKS[0]) => {
    Alert.alert(
      'Eliminar Paquete Offline',
      `¿Deseas desinstalar los puntos offline de ${pack.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await offlineSpotVault.uninstallPack(pack.id);
            refreshInstalledPacks();
          },
        },
      ]
    );
  };

  const totalSizeMb = REGIONAL_OFFLINE_PACKS
    .filter(p => installedPacks.includes(p.id))
    .reduce((acc, curr) => acc + curr.approxSizeMb, 0);

  return (
    <View style={styles.container}>
      {/* Banner Resumen de Almacenamiento Offline */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryIconPod}>
          <Icon name="database-check" size={28} color="#38BDF8" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.summaryTitle}>Bóveda Offline Activa</Text>
          <Text style={styles.summarySubtitle}>
            {installedPacks.length} regiones · {totalSpots} spots disponibles sin 4G
          </Text>
          <Text style={styles.summarySizeText}>
            Espacio en dispositivo: {totalSizeMb.toFixed(1)} MB
          </Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>PAQUETES REGIONALES DISPONIBLES</Text>

      <ScrollView style={styles.packsList} showsVerticalScrollIndicator={false}>
        {REGIONAL_OFFLINE_PACKS.map(pack => {
          const isInstalled = installedPacks.includes(pack.id);
          const isDownloading = downloadingPackId === pack.id;

          return (
            <View key={pack.id} style={styles.packCard}>
              <View style={styles.packHeader}>
                <View style={[styles.packFlagPod, isInstalled && styles.packFlagPodActive]}>
                  <Icon
                    name={isInstalled ? 'check-decagram' : 'cloud-download-outline'}
                    size={22}
                    color={isInstalled ? '#10B981' : '#0284C7'}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.packTitle}>{pack.name}</Text>
                  <Text style={styles.packSub}>
                    {pack.country} · {pack.spotsCount} spots verificados · {pack.approxSizeMb} MB
                  </Text>
                </View>

                {isInstalled ? (
                  <TouchableOpacity
                    style={styles.trashBtn}
                    onPress={() => handleUninstall(pack)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="trash-can-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                ) : isDownloading ? (
                  <View style={styles.downloadingPod}>
                    <ActivityIndicator size="small" color="#0284C7" />
                    <Text style={styles.downloadProgressText}>{downloadProgress}%</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleInstall(pack.id)}
                    activeOpacity={0.8}>
                    <Icon name="download" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.downloadBtnText}>Instalar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Píldoras de servicios incluidos en el paquete */}
              <View style={styles.servicesRow}>
                <View style={styles.serviceMiniBadge}>
                  <Text style={styles.serviceMiniText}>💧 Agua Potable</Text>
                </View>
                <View style={styles.serviceMiniBadge}>
                  <Text style={styles.serviceMiniText}>⚡ Electricidad</Text>
                </View>
                <View style={styles.serviceMiniBadge}>
                  <Text style={styles.serviceMiniText}>🚰 Vaciado</Text>
                </View>
                <View style={styles.serviceMiniBadge}>
                  <Text style={styles.serviceMiniText}>🌙 Pernocta</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryIconPod: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  summarySubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  summarySizeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  packsList: {
    flex: 1,
  },
  packCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  packHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packFlagPod: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packFlagPodActive: {
    backgroundColor: '#ECFDF5',
  },
  packTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  packSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  downloadingPod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  trashBtn: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  serviceMiniBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceMiniText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
});

export default OfflineVaultManager;
