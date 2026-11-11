/**
 * CamperRewardsModal.tsx
 * Modal de Gamificación, Puntos y Pirámide de Recompensas
 * CamperSites Pro - Conducción Segura, Ad Simulation y Salvaguarda de Valor Pro
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Clipboard,
  Dimensions,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import {
  camperRewardsService,
  RewardsProfile,
  REWARD_TIERS,
  REDEEM_CATALOG,
  RewardRedeemable,
  isVehicleMoving,
  MAX_DAILY_ADS,
  MAX_DAILY_COMMUNITY_POINTS,
  STATIONARY_SPEED_THRESHOLD_KMH,
} from '../services/CamperRewardsService';
import {
  rewardedAdSimulationEngine,
  AdSponsor,
  AD_SIMULATION_DURATION_SECONDS,
} from '../services/RewardedAdSimulationEngine';

interface CamperRewardsModalProps {
  visible: boolean;
  currentSpeedKmH: number;
  onClose: () => void;
}

export const CamperRewardsModal: React.FC<CamperRewardsModalProps> = ({
  visible,
  currentSpeedKmH,
  onClose,
}) => {
  const [profile, setProfile] = useState<RewardsProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'pyramid' | 'catalog' | 'earn'>('pyramid');
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Velocidad activa (sincronizada con props y GPS directo como resguardo, con filtro deadband < 4.5 km/h)
  const [liveSpeedKmH, setLiveSpeedKmH] = useState(() => {
    const initialRaw = Math.max(0, currentSpeedKmH || 0);
    return initialRaw < 4.5 ? 0.0 : initialRaw;
  });

  // Estado de simulación de anuncio
  const [isSimulatingAd, setIsSimulatingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(AD_SIMULATION_DURATION_SECONDS);
  const [activeSponsor, setActiveSponsor] = useState<AdSponsor | null>(null);

  const watchId = useRef<number | null>(null);

  const fetchProfile = async () => {
    const data = await camperRewardsService.getProfile();
    setProfile(data);
  };

  // Mantener sincronizado liveSpeedKmH con prop con filtro deadband (< 4.5 km/h -> 0.0 km/h)
  useEffect(() => {
    const rawSpd = Math.max(0, currentSpeedKmH || 0);
    const spd = rawSpd < 4.5 ? 0.0 : rawSpd;
    setLiveSpeedKmH(spd);
    rewardedAdSimulationEngine.updateSpeed(spd);
  }, [currentSpeedKmH]);

  // Suscripción Geolocation de resguardo mientras el modal esté visible
  useEffect(() => {
    if (visible) {
      fetchProfile();

      try {
        watchId.current = Geolocation.watchPosition(
          (pos) => {
            const rawSpeed = pos.coords.speed;
            const spd = rawSpeed && rawSpeed > 0 ? rawSpeed * 3.6 : 0;
            // Filtro deadband: suprime deriva GPS estática en parado (< 4.5 km/h)
            const normalized = spd < 4.5 ? 0.0 : spd;
            setLiveSpeedKmH(normalized);
            rewardedAdSimulationEngine.updateSpeed(normalized);
          },
          () => {},
          { enableHighAccuracy: true, distanceFilter: 1, interval: 1000 }
        );
      } catch (e) {
        // En emuladores o entornos sin permiso, se confía en prop
      }
    } else {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (rewardedAdSimulationEngine.isSimulating()) {
        rewardedAdSimulationEngine.cancelAdSimulation('Modal cerrado por el usuario.');
      }
      setIsSimulatingAd(false);
    }

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [visible]);

  // Disparar reproducción de anuncio recompensado simulado
  const handleStartRewardedAd = () => {
    if (isVehicleMoving(liveSpeedKmH)) {
      Alert.alert(
        '⚠️ Vehículo en Movimiento',
        `Por normativa de seguridad vial DGT, no es posible reproducir anuncios mientras el vehículo esté en movimiento (${liveSpeedKmH.toFixed(1)} km/h). Detén el vehículo por completo para continuar.`
      );
      return;
    }

    if (!profile) return;

    if (profile.adsWatchedToday >= MAX_DAILY_ADS) {
      Alert.alert(
        'Límite Diario Alcanzado',
        'Has visto los 3 anuncios permitidos hoy. Vuelve mañana o acumula puntos colaborando con reportes en ruta.'
      );
      return;
    }

    const sponsor = rewardedAdSimulationEngine.getCurrentSponsor();
    setActiveSponsor(sponsor);
    setAdCountdown(AD_SIMULATION_DURATION_SECONDS);
    setIsSimulatingAd(true);

    const started = rewardedAdSimulationEngine.startAdSimulation({
      onCountdown: (sec) => {
        setAdCountdown(sec);
      },
      onComplete: async () => {
        setIsSimulatingAd(false);
        const res = await camperRewardsService.watchRewardedAd(liveSpeedKmH);
        if (res.success) {
          Alert.alert('🎉 ¡Recompensa Conseguida!', res.message);
          fetchProfile();
        } else {
          Alert.alert('Aviso', res.message);
        }
      },
      onAborted: (reason) => {
        setIsSimulatingAd(false);
        Alert.alert('⚠️ Anuncio Interrumpido', reason);
      },
    });

    if (!started) {
      setIsSimulatingAd(false);
    }
  };

  const handleCancelAd = () => {
    Alert.alert(
      '¿Interrumpir Anuncio?',
      'Si sales antes de que termine la cuenta atrás no se sumarán los CamperPoints a tu cartera.',
      [
        { text: 'Seguir Viendo', style: 'cancel' },
        {
          text: 'Interrumpir',
          style: 'destructive',
          onPress: () => {
            rewardedAdSimulationEngine.cancelAdSimulation('Cancelado manualmente por el usuario.');
            setIsSimulatingAd(false);
          },
        },
      ]
    );
  };

  const handleRedeem = async (reward: RewardRedeemable) => {
    if (isVehicleMoving(liveSpeedKmH)) {
      Alert.alert(
        '⚠️ Vehículo en Movimiento',
        `No puedes canjear recompensas con el vehículo en marcha (${liveSpeedKmH.toFixed(1)} km/h). Estaciona de forma segura.`
      );
      return;
    }

    Alert.alert(
      'Confirmar Canje',
      `¿Deseas canjear ${reward.costPoints} CamperPoints por "${reward.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Canjear',
          onPress: async () => {
            const res = await camperRewardsService.redeemReward(reward.id, liveSpeedKmH);
            if (res.success) {
              if (res.couponCode) {
                Clipboard.setString(res.couponCode);
                Alert.alert(
                  '✅ ¡Cupón Generado y Copiado!',
                  `Código: ${res.couponCode}\n\nHa sido copiado al portapapeles y guardado en tu pestaña de Pases. Úsalo al suscribirte.`
                );
              } else {
                Alert.alert('✅ Canje Exitoso', res.message);
              }
              fetchProfile();
            } else {
              Alert.alert('No se pudo completar el canje', res.message);
            }
          },
        },
      ]
    );
  };

  const handleCopyCode = (code: string) => {
    Clipboard.setString(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 3000);
    Alert.alert('📋 Copiado', `El código ${code} ha sido copiado al portapapeles.`);
  };

  if (!profile) return null;

  const currentTier = camperRewardsService.getTier(profile.totalPoints);
  const vehicleIsMoving = isVehicleMoving(liveSpeedKmH);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* AVISO DE CONDUCCIÓN SEGURA / BLOQUEO POR VELOCIDAD */}
          {vehicleIsMoving && (
            <View style={styles.safetyLockoutBanner}>
              <Icon name="car-speed-limiter" size={24} color="#000" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.safetyLockoutTitle}>
                  ⚠️ MODO CONDUCCIÓN ACTIVO ({liveSpeedKmH.toFixed(1)} km/h)
                </Text>
                <Text style={styles.safetyLockoutDesc}>
                  Por seguridad vial, la visualización de anuncios y el canje de recompensas están bloqueados en marcha.
                </Text>
              </View>
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.tierBadge}>{currentTier.badge}</Text>
              <View>
                <Text style={styles.headerTitle}>{currentTier.label}</Text>
                <Text style={styles.headerSubtitle}>
                  {profile.availablePoints} CamperPoints disponibles ({profile.totalPoints} acumulados)
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Subtabs */}
          <View style={styles.subtabs}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'pyramid' && styles.tabBtnActive]}
              onPress={() => setActiveTab('pyramid')}>
              <Text style={[styles.tabText, activeTab === 'pyramid' && styles.tabTextActive]}>
                Pirámide Niveles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'catalog' && styles.tabBtnActive]}
              onPress={() => setActiveTab('catalog')}>
              <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>
                Canjear Pases
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'earn' && styles.tabBtnActive]}
              onPress={() => setActiveTab('earn')}>
              <Text style={[styles.tabText, activeTab === 'earn' && styles.tabTextActive]}>
                Ganar Puntos
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* TAB 1: PIRÁMIDE DE NIVELES */}
            {activeTab === 'pyramid' && (
              <View style={styles.pyramidContainer}>
                <Text style={styles.sectionHeader}>🏔️ Pirámide de Estatus Camper</Text>
                <Text style={styles.sectionSub}>
                  Avanza de nivel acumulando puntos por aportaciones verificadas y multiplica las recompensas de tu viaje.
                </Text>

                {Object.values(REWARD_TIERS).map((t) => {
                  const isCurrent = t.tier === currentTier.tier;
                  return (
                    <View
                      key={t.tier}
                      style={[styles.tierCard, isCurrent && styles.tierCardCurrent]}>
                      <View style={styles.tierHeaderRow}>
                        <Text style={styles.tierCardIcon}>{t.badge}</Text>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={styles.tierTitleWrap}>
                            <Text style={styles.tierCardTitle}>{t.label}</Text>
                            {isCurrent && <Text style={styles.currentBadgeTag}>TU NIVEL</Text>}
                          </View>
                          <Text style={styles.tierMinPoints}>
                            Desde {t.minPoints} pts • Multiplicador {t.pointsMultiplier}x
                          </Text>
                        </View>
                      </View>
                      <View style={styles.perksList}>
                        {t.perks.map((p, idx) => (
                          <Text key={idx} style={styles.perkItem}>
                            ✓ {p}
                          </Text>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 2: CATÁLOGO DE CANJE Y PASES ACTIVOS */}
            {activeTab === 'catalog' && (
              <View style={styles.catalogContainer}>
                {/* Sección de Pases Activos & Cupones */}
                {(profile.activePasses.length > 0 ||
                  (profile.offlineProvinceCredits || 0) > 0 ||
                  (profile.discountCoupons || []).length > 0) && (
                  <View style={styles.activePassesSection}>
                    <Text style={styles.activePassesHeader}>🎟️ Mis Pases y Cupones Activos</Text>

                    {/* Créditos Provincia Offline */}
                    {(profile.offlineProvinceCredits || 0) > 0 && (
                      <View style={styles.activePassChip}>
                        <Icon name="download-circle" size={20} color="#00E676" />
                        <Text style={styles.activePassText}>
                          {profile.offlineProvinceCredits} crédito(s) de provincia offline disponibles para descarga
                        </Text>
                      </View>
                    )}

                    {/* Pases temporales activos */}
                    {profile.activePasses.map((p, idx) => {
                      const remainingHours = Math.max(
                        0,
                        Math.round((p.expiresAt - Date.now()) / (3600 * 1000))
                      );
                      const isExpired = p.expiresAt <= Date.now();
                      if (isExpired) return null;

                      return (
                        <View key={idx} style={styles.activePassChip}>
                          <Icon name="clock-outline" size={20} color="#FFD600" />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.activePassText}>
                              {p.name || p.type}
                            </Text>
                            <Text style={styles.activePassSub}>
                              {remainingHours > 24
                                ? `Expira en ${Math.round(remainingHours / 24)} días`
                                : `Expira en ${remainingHours} horas`}
                            </Text>
                          </View>
                        </View>
                      );
                    })}

                    {/* Cupones de descuento generados */}
                    {(profile.discountCoupons || []).map((code, idx) => (
                      <View key={idx} style={styles.couponCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.couponTag}>CUPÓN 20% DTO PRO</Text>
                          <Text style={styles.couponCode}>{code}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyCouponBtn}
                          onPress={() => handleCopyCode(code)}>
                          <Icon
                            name={copiedCoupon === code ? 'check-bold' : 'content-copy'}
                            size={16}
                            color="#000"
                          />
                          <Text style={styles.copyCouponBtnText}>
                            {copiedCoupon === code ? 'Copiado' : 'Copiar'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.sectionHeader}>🎁 Catálogo de Pases Temporales</Text>
                <Text style={styles.sectionSub}>
                  Canjea tus puntos por pases de rescate y seguridad sin devaluar la suscripción Pro.
                </Text>

                {REDEEM_CATALOG.map((item) => {
                  const canAfford = profile.availablePoints >= item.costPoints;
                  const isRedeemDisabled = !canAfford || vehicleIsMoving;

                  return (
                    <View key={item.id} style={styles.rewardCard}>
                      <View style={styles.rewardLeft}>
                        <View style={styles.rewardIconWrap}>
                          <Icon name={item.icon} size={26} color="#00E676" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.rewardTitle}>{item.title}</Text>
                          <Text style={styles.rewardDesc}>{item.description}</Text>
                          <Text style={styles.rewardCost}>💰 {item.costPoints} CamperPoints</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.redeemBtn, isRedeemDisabled && styles.redeemBtnDisabled]}
                        disabled={isRedeemDisabled}
                        onPress={() => handleRedeem(item)}>
                        <Text style={styles.redeemBtnText}>
                          {vehicleIsMoving
                            ? 'Bloqueado'
                            : canAfford
                            ? 'Canjear'
                            : 'Insuficiente'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 3: GANAR PUNTOS */}
            {activeTab === 'earn' && (
              <View style={styles.earnContainer}>
                <Text style={styles.sectionHeader}>⭐ Formas de Sumar CamperPoints</Text>

                {/* Tarjeta de Anuncio Recompensado con Motor Desacoplado */}
                <View style={styles.earnCard}>
                  <View style={styles.earnHeaderRow}>
                    <Icon name="play-circle-outline" size={32} color="#FFD600" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.earnCardTitle}>Vídeo Recompensado (Solo en Parado)</Text>
                      <Text style={styles.earnCardDesc}>
                        Visualiza 5 segundos de patrocinadores verificados (Repsol, Baleària, Allianz) y gana +15 pts.
                      </Text>
                      <Text style={styles.adCounterText}>
                        Hoy: {profile.adsWatchedToday}/{MAX_DAILY_ADS} anuncios completados
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      (vehicleIsMoving || profile.adsWatchedToday >= MAX_DAILY_ADS) &&
                        styles.actionBtnDisabled,
                    ]}
                    disabled={vehicleIsMoving || profile.adsWatchedToday >= MAX_DAILY_ADS}
                    onPress={handleStartRewardedAd}>
                    <Text style={styles.actionBtnText}>
                      {vehicleIsMoving
                        ? `🚫 Detén el vehículo (${liveSpeedKmH.toFixed(1)} km/h)`
                        : profile.adsWatchedToday >= MAX_DAILY_ADS
                        ? 'Límite diario de 3 anuncios alcanzado'
                        : 'Ver Vídeo Patrocinado (+15 pts)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Programa de Afiliados: Invita a un Amigo */}
                <View style={[styles.earnCard, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                  <View style={styles.earnHeaderRow}>
                    <Icon name="account-multiple-plus" size={32} color="#10B981" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.earnCardTitle, { color: '#10B981' }]}>
                        Programa Afiliados: Invita a un Amigo (+500 pts)
                      </Text>
                      <Text style={styles.earnCardDesc}>
                        Por cada amigo que descargue la app con tu enlace y active un plan de 1 año o superior, ambos recibís +500 CamperPoints directos y 1 mes Pro gratis.
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => {
                      Share.share({
                        title: 'Únete a CamperSites Pro con Descuento',
                        message: '¡Hola! Te invito a probar CamperSites Pro, la app de navegación GPS especializada para autocaravanas y campers. Descárgala o activa tu suscripción anual con un 20% de descuento directo aquí: https://paddlecraft5.gumroad.com/l/phjqix',
                      }).catch(() => {});
                    }}>
                    <Text style={[styles.actionBtnText, { color: '#0F172A', fontWeight: '900' }]}>
                      🎁 Compartir Enlace de Afiliado (+500 pts)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Límite y Progreso Diario de Puntos Comunitarios */}
                <View style={styles.communityHeaderWrap}>
                  <Text style={styles.sectionHeader}>🤝 Aportaciones Comunitarias Verificadas</Text>
                  <View style={styles.capBadge}>
                    <Text style={styles.capBadgeText}>
                      Tope hoy: {profile.communityPointsEarnedToday || 0}/{MAX_DAILY_COMMUNITY_POINTS} pts
                    </Text>
                  </View>
                </View>

                {/* Acciones de Comunidad con Geofence */}
                <View style={styles.communityGrid}>
                  <View style={styles.comRow}>
                    <Icon name="radar" size={24} color="#00E676" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.comLabel}>Reportar radar / control DGT en ruta</Text>
                      <Text style={styles.comGeofenceHint}>📍 Radio máx. 500m • Cooldown 3 min</Text>
                    </View>
                    <Text style={styles.comPts}>+25 pts</Text>
                  </View>

                  <View style={styles.comRow}>
                    <Icon name="camera-plus" size={24} color="#40C4FF" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.comLabel}>Subir foto real de área o gálibo</Text>
                      <Text style={styles.comGeofenceHint}>📍 Radio máx. 400m de la ubicación</Text>
                    </View>
                    <Text style={styles.comPts}>+20 pts</Text>
                  </View>

                  <View style={styles.comRow}>
                    <Icon name="gas-station" size={24} color="#FF9100" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.comLabel}>Actualizar precio GLP en estación</Text>
                      <Text style={styles.comGeofenceHint}>📍 Radio máx. 300m de la estación de servicio</Text>
                    </View>
                    <Text style={styles.comPts}>+15 pts</Text>
                  </View>

                  <View style={[styles.comRow, { borderBottomWidth: 0 }]}>
                    <Icon name="star-outline" size={24} color="#E040FB" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.comLabel}>Reseña detallada con acceso camper</Text>
                      <Text style={styles.comGeofenceHint}>📍 Análisis verificado en el lugar</Text>
                    </View>
                    <Text style={styles.comPts}>+30 pts</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* MODAL SIMULADOR DE ANUNCIO RECOMPENSADO */}
        {isSimulatingAd && activeSponsor && (
          <Modal transparent animationType="fade" visible={isSimulatingAd}>
            <View style={styles.adModalOverlay}>
              <View style={styles.adModalCard}>
                {/* Header Anuncio */}
                <View style={styles.adModalHeader}>
                  <View style={styles.adSponsorTag}>
                    <Text style={styles.adSponsorTagText}>{activeSponsor.badge}</Text>
                  </View>
                  <TouchableOpacity style={styles.adCloseBtn} onPress={handleCancelAd}>
                    <Icon name="close" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                {/* Banner Central */}
                <View style={styles.adBody}>
                  <View
                    style={[
                      styles.adIconContainer,
                      { backgroundColor: activeSponsor.accentColor + '20' },
                    ]}>
                    <Icon
                      name={activeSponsor.logoIcon}
                      size={54}
                      color={activeSponsor.accentColor}
                    />
                  </View>

                  <Text style={styles.adSponsorName}>{activeSponsor.name}</Text>
                  <Text style={styles.adHeadline}>{activeSponsor.headline}</Text>
                  <Text style={styles.adTagline}>{activeSponsor.tagline}</Text>

                  {/* Contador y Barra de Progreso */}
                  <View style={styles.adTimerWrap}>
                    <View style={styles.adTimerBadge}>
                      <Icon name="timer-sand" size={18} color="#FFD600" />
                      <Text style={styles.adTimerText}>
                        Recompensa en {adCountdown}s
                      </Text>
                    </View>
                    <View style={styles.adProgressBarBackground}>
                      <View
                        style={[
                          styles.adProgressBarFill,
                          {
                            width: `${((AD_SIMULATION_DURATION_SECONDS - adCountdown) / AD_SIMULATION_DURATION_SECONDS) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* Footer Anuncio */}
                <View style={styles.adFooter}>
                  <Text style={styles.adSafetyNotice}>
                    🛡️ Conducción Segura CamperSites • Vigilancia activa de velocidad
                  </Text>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#121820',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  safetyLockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB300',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  safetyLockoutTitle: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  safetyLockoutDesc: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierBadge: {
    fontSize: 32,
    marginRight: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  subtabs: {
    flexDirection: 'row',
    backgroundColor: '#0A0E14',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#1E293B',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00E676',
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSub: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  pyramidContainer: {
    paddingBottom: 20,
  },
  tierCard: {
    backgroundColor: '#1A222D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#263445',
  },
  tierCardCurrent: {
    borderColor: '#00E676',
    backgroundColor: '#142820',
  },
  tierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierCardIcon: {
    fontSize: 28,
  },
  tierTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierCardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  currentBadgeTag: {
    backgroundColor: '#00E676',
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  tierMinPoints: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  perksList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#263445',
    paddingTop: 8,
  },
  perkItem: {
    color: '#CBD5E1',
    fontSize: 12,
    marginVertical: 2,
  },
  catalogContainer: {
    paddingBottom: 20,
  },
  activePassesSection: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  activePassesHeader: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  activePassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  activePassText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  activePassSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  couponTag: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  couponCode: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  copyCouponBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  copyCouponBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  rewardCard: {
    backgroundColor: '#1A222D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#263445',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  rewardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0A0E14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rewardDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  rewardCost: {
    color: '#FFD600',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  redeemBtn: {
    backgroundColor: '#00E676',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  redeemBtnDisabled: {
    backgroundColor: '#334155',
  },
  redeemBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  earnContainer: {
    paddingBottom: 20,
  },
  earnCard: {
    backgroundColor: '#1A222D',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#263445',
    marginBottom: 16,
  },
  earnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earnCardTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  earnCardDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  adCounterText: {
    color: '#FFD600',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  actionBtn: {
    backgroundColor: '#FFD600',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  actionBtnDisabled: {
    backgroundColor: '#334155',
  },
  actionBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  communityHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  capBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  capBadgeText: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
  },
  communityGrid: {
    backgroundColor: '#1A222D',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#263445',
  },
  comRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#263445',
  },
  comLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  comGeofenceHint: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  comPts: {
    color: '#00E676',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 8,
  },

  // ESTILOS DEL SIMULADOR DE ANUNCIOS RECOMPENSADOS
  adModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adModalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  adModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  adSponsorTag: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  adSponsorTagText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  adCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#0F172A',
  },
  adBody: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  adIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  adSponsorName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  adHeadline: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  adTagline: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  adTimerWrap: {
    width: '100%',
    alignItems: 'center',
  },
  adTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  adTimerText: {
    color: '#FFD600',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  adProgressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  adProgressBarFill: {
    height: '100%',
    backgroundColor: '#00E676',
  },
  adFooter: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    width: '100%',
    alignItems: 'center',
  },
  adSafetyNotice: {
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
  },
});
