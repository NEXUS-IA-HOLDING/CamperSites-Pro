/**
 * CamperTravelPlannerModal.tsx
 * Interfaz interactiva del Planificador de Viajes e Itinerarios Camper (Travel Planner)
 *
 * Características:
 * - Explorador de Rutas Legendarias pre-configuradas (Transpirenaica, Galicia, Marruecos Ferry).
 * - Diseñador de Itinerarios a medida (Origen, Destino, Días, Vehículo, GLP, 220V).
 * - Timeline vertical día a día con cálculo de km, paradas de vaciado, miradores y pernocta.
 * - Integración de conversión directa:
 *   * Botón de reserva de parcela B2B.
 *   * Botón de seguro IATI Escapadas (-5% dto).
 *   * Botón de Ferry Baleària (-15% dto).
 *   * Botón de envío directo de la etapa al GPS de cabina.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  camperTravelPlannerService,
  TravelPlan,
  DayStage,
  VehicleCategory,
} from '../services/CamperTravelPlannerService';
import { affiliatePartnerService } from '../services/AffiliatePartnerService';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onStartNavigation?: (startCity: string, endCity: string, coordinates: [number, number]) => void;
  onOpenB2BBooking?: (overnightName: string) => void;
}

type TabType = 'presets' | 'create' | 'saved';

export const CamperTravelPlannerModal: React.FC<Props> = ({
  visible,
  onClose,
  onStartNavigation,
  onOpenB2BBooking,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TravelPlan | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // Formulario de creación
  const [origin, setOrigin] = useState('Madrid');
  const [destination, setDestination] = useState('Cabo de Gata');
  const [durationDays, setDurationDays] = useState(5);
  const [vehicleType, setVehicleType] = useState<VehicleCategory>('motorhome_compact');
  const [needsLPG, setNeedsLPG] = useState(true);
  const [needsElectricity, setNeedsElectricity] = useState(true);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    await camperTravelPlannerService.initialize();
    const all = await camperTravelPlannerService.getAllPlans();
    const active = await camperTravelPlannerService.getActivePlan();
    setPlans(all);
    setActivePlanId(active?.id || null);
  };

  const handleSelectPlan = (plan: TravelPlan) => {
    setSelectedPlan(plan);
  };

  const handleSetAsActive = async (plan: TravelPlan) => {
    await camperTravelPlannerService.setActivePlan(plan.id);
    setActivePlanId(plan.id);
    Alert.alert(
      '¡Viaje Activado!',
      `"${plan.title}" es ahora tu viaje activo. Las etapas y paradas se sincronizarán con el mapa de cabina.`,
      [{ text: 'Entendido' }]
    );
  };

  const handleGenerateCustom = async () => {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Datos incompletos', 'Por favor introduce la ciudad de origen y de destino.');
      return;
    }

    const generated = camperTravelPlannerService.generateCustomItinerary({
      title: `${origin} ➔ ${destination}`,
      startCity: origin.trim(),
      destinationCity: destination.trim(),
      durationDays,
      vehicleType,
      needsLPG,
      needsElectricityEveryDays: needsElectricity ? 2 : undefined,
    });

    await camperTravelPlannerService.savePlan(generated);
    await loadData();
    setSelectedPlan(generated);
  };

  const handleActionClick = (action: DayStage['recommendedAction']) => {
    if (!action) return;
    if (action.type === 'buy_insurance') {
      const partner = affiliatePartnerService.getPartnerById('iati_escapadas_camper');
      if (partner) affiliatePartnerService.openPartner(partner);
    } else if (action.type === 'book_ferry') {
      const partner = affiliatePartnerService.getPartnerById('balearia_ferries_camper');
      if (partner) affiliatePartnerService.openPartner(partner);
    } else if (action.type === 'refill_lpg') {
      const partner = affiliatePartnerService.getPartnerById('repsol_waylet_glp');
      if (partner) affiliatePartnerService.openPartner(partner);
    } else if (action.type === 'book_pitch') {
      if (onOpenB2BBooking) {
        onOpenB2BBooking(action.title);
      } else {
        Alert.alert('Central de Reservas B2B', 'Abriendo motor de reserva de parcelas...');
      }
    }
  };

  const getVehicleLabel = (type: VehicleCategory) => {
    switch (type) {
      case 'camper_van': return 'Furgoneta Camper (<6m)';
      case 'motorhome_compact': return 'Autocaravana (6-7m)';
      case 'motorhome_large': return 'Integral / Capuchina (>7m)';
      case 'overlander_4x4': return '4x4 Overlander / Célula';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* HEADER SUPERIOR */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (selectedPlan) {
                setSelectedPlan(null);
              } else {
                onClose();
              }
            }}>
            <Icon name={selectedPlan ? 'arrow-left' : 'close'} size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerSuperTitle}>
              {selectedPlan ? 'DETALLE DEL ITINERARIO' : 'MODO RUTA NÓMADE'}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedPlan ? selectedPlan.title : 'Travel Planner Camper'}
            </Text>
          </View>
          {selectedPlan && (
            <TouchableOpacity
              style={[
                styles.activateBadge,
                activePlanId === selectedPlan.id && styles.activeBadgeActive,
              ]}
              onPress={() => handleSetAsActive(selectedPlan)}>
              <Icon
                name={activePlanId === selectedPlan.id ? 'check-circle' : 'flag-checkered'}
                size={18}
                color="#FFF"
              />
              <Text style={styles.activateText}>
                {activePlanId === selectedPlan.id ? 'Activo' : 'Activar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CONTENIDO PRINCIPAL */}
        {selectedPlan ? (
          // ==================================================================
          // VISTA DETALLADA DÍA A DÍA (TIMELINE)
          // ==================================================================
          <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
            {/* Banner de resumen */}
            <View style={styles.planHeroCard}>
              <Image source={{ uri: selectedPlan.bannerImage }} style={styles.planHeroImage} />
              <View style={styles.planHeroOverlay}>
                <View style={styles.metricRow}>
                  <View style={styles.metricPill}>
                    <Icon name="calendar-range" size={16} color="#38BDF8" />
                    <Text style={styles.metricText}>{selectedPlan.durationDays} Días</Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Icon name="map-marker-distance" size={16} color="#10B981" />
                    <Text style={styles.metricText}>{selectedPlan.totalDistanceKm} km</Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Icon name="steering" size={16} color="#F59E0B" />
                    <Text style={styles.metricText}>{selectedPlan.totalDrivingHours}h conducción</Text>
                  </View>
                </View>
                <Text style={styles.heroDescription}>{selectedPlan.description}</Text>
              </View>
            </View>

            {/* SECCIÓN DEL TIMELINE POR ETAPAS */}
            <View style={styles.timelineSection}>
              <Text style={styles.sectionHeading}>ETAPAS DÍA A DÍA Y PARADAS TÉCNICAS</Text>

              {selectedPlan.stages.map((stage) => (
                <View key={stage.dayNumber} style={styles.dayCard}>
                  {/* Cabecera del día */}
                  <View style={styles.dayHeader}>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeNumber}>DÍA {stage.dayNumber}</Text>
                    </View>
                    <View style={styles.dayTitleBox}>
                      <Text style={styles.dayTitle}>{stage.title}</Text>
                      <Text style={styles.dayRoute}>
                        {stage.startCity} ➔ {stage.endCity} • {stage.drivingKm} km ({Math.round(stage.estimatedMinutes / 60)}h {stage.estimatedMinutes % 60}m)
                      </Text>
                    </View>
                  </View>

                  {/* Paradas técnicas del día */}
                  {stage.stops.length > 0 && (
                    <View style={styles.stopsContainer}>
                      <Text style={styles.subHeading}>Paradas intermedias recomendadas:</Text>
                      {stage.stops.map((stop) => (
                        <View key={stop.id} style={styles.stopRow}>
                          <View
                            style={[
                              styles.stopIconCircle,
                              stop.type === 'lpg_gas' && { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
                              stop.type === 'water_dump' && { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                              stop.type === 'ferry_terminal' && { backgroundColor: 'rgba(56, 189, 248, 0.2)' },
                            ]}>
                            <Icon
                              name={
                                stop.type === 'lpg_gas'
                                  ? 'gas-station'
                                  : stop.type === 'water_dump'
                                  ? 'water-pump'
                                  : stop.type === 'ferry_terminal'
                                  ? 'ferry'
                                  : stop.type === 'supermarket_parking'
                                  ? 'cart'
                                  : 'camera-iris'
                              }
                              size={16}
                              color={
                                stop.type === 'lpg_gas'
                                  ? '#EF4444'
                                  : stop.type === 'water_dump'
                                  ? '#10B981'
                                  : stop.type === 'ferry_terminal'
                                  ? '#38BDF8'
                                  : '#FBBF24'
                              }
                            />
                          </View>
                          <View style={styles.stopInfo}>
                            <Text style={styles.stopName}>{stop.name}</Text>
                            <Text style={styles.stopNotes}>{stop.notes || stop.address}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Pernocta de la noche */}
                  <View style={styles.overnightBox}>
                    <View style={styles.overnightHeader}>
                      <Icon name="bed-king-outline" size={20} color="#818CF8" />
                      <Text style={styles.overnightTitle}>Lugar de Pernocta</Text>
                      <View
                        style={[
                          styles.priceTag,
                          stage.overnight.pricePerNight === 0 && styles.freePriceTag,
                        ]}>
                        <Text style={styles.priceTagText}>
                          {stage.overnight.pricePerNight === 0
                            ? 'GRATIS'
                            : `${stage.overnight.pricePerNight} €/noche`}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.overnightName}>{stage.overnight.name}</Text>
                    <Text style={styles.overnightAddress}>{stage.overnight.address}</Text>

                    {/* Servicios del área */}
                    <View style={styles.servicesRow}>
                      {stage.overnight.hasElectricity && (
                        <View style={styles.serviceChip}>
                          <Icon name="flash" size={14} color="#FBBF24" />
                          <Text style={styles.serviceText}>220V</Text>
                        </View>
                      )}
                      {stage.overnight.hasWater && (
                        <View style={styles.serviceChip}>
                          <Icon name="water" size={14} color="#38BDF8" />
                          <Text style={styles.serviceText}>Agua</Text>
                        </View>
                      )}
                      {stage.overnight.hasWasteDump && (
                        <View style={styles.serviceChip}>
                          <Icon name="trash-can-outline" size={14} color="#10B981" />
                          <Text style={styles.serviceText}>Vaciado</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Tarjeta de Acción / Monetización Cruzada */}
                  {stage.recommendedAction && (
                    <TouchableOpacity
                      style={styles.actionCard}
                      onPress={() => handleActionClick(stage.recommendedAction)}>
                      <View style={styles.actionIconBox}>
                        <Icon
                          name={
                            stage.recommendedAction.type === 'buy_insurance'
                              ? 'shield-check'
                              : stage.recommendedAction.type === 'book_ferry'
                              ? 'ferry'
                              : 'calendar-check'
                          }
                          size={22}
                          color="#38BDF8"
                        />
                      </View>
                      <View style={styles.actionTextBox}>
                        <Text style={styles.actionTitle}>{stage.recommendedAction.title}</Text>
                        <Text style={styles.actionDesc}>{stage.recommendedAction.description}</Text>
                        <Text style={styles.actionCta}>{stage.recommendedAction.ctaLabel} ➔</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Botón de inicio de navegación en cabina */}
                  {onStartNavigation && (
                    <TouchableOpacity
                      style={styles.navigateStageButton}
                      onPress={() => {
                        onStartNavigation(
                          stage.startCity,
                          stage.endCity,
                          stage.overnight.coordinates
                        );
                        onClose();
                      }}>
                      <Icon name="navigation-variant" size={18} color="#0F172A" />
                      <Text style={styles.navigateStageText}>Navegar Etapa en el GPS de Cabina</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        ) : (
          // ==================================================================
          // VISTA PRINCIPAL CON PESTAÑAS (PRESETS / CREAR / MIS VIAJES)
          // ==================================================================
          <View style={styles.body}>
            {/* TABS DE SELECCIÓN */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'presets' && styles.tabButtonActive]}
                onPress={() => setActiveTab('presets')}>
                <Icon
                  name="compass"
                  size={18}
                  color={activeTab === 'presets' ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === 'presets' && styles.tabButtonTextActive]}>
                  Rutas Top
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'create' && styles.tabButtonActive]}
                onPress={() => setActiveTab('create')}>
                <Icon
                  name="plus-circle-outline"
                  size={18}
                  color={activeTab === 'create' ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === 'create' && styles.tabButtonTextActive]}>
                  Diseñar Ruta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
                onPress={() => setActiveTab('saved')}>
                <Icon
                  name="bookmark-outline"
                  size={18}
                  color={activeTab === 'saved' ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === 'saved' && styles.tabButtonTextActive]}>
                  Mis Viajes ({plans.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* CONTENIDO SEGÚN LA PESTAÑA */}
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {activeTab === 'presets' && (
                <View style={styles.presetsList}>
                  <Text style={styles.sectionSubtitle}>
                    ITINERARIOS RECOMENDADOS POR CONDUCTORES EXPERTOS
                  </Text>
                  {plans
                    .filter((p) => p.isPreset)
                    .map((plan) => (
                      <TouchableOpacity
                        key={plan.id}
                        style={styles.planCard}
                        onPress={() => handleSelectPlan(plan)}>
                        <Image source={{ uri: plan.bannerImage }} style={styles.cardImage} />
                        <View style={styles.cardContent}>
                          <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardCategory}>{plan.category.toUpperCase()}</Text>
                            <Text style={styles.cardDuration}>{plan.durationDays} DÍAS</Text>
                          </View>
                          <Text style={styles.cardTitle}>{plan.title}</Text>
                          <Text style={styles.cardSubtitle}>{plan.subtitle}</Text>

                          <View style={styles.tagRow}>
                            {plan.tags.map((t, idx) => (
                              <View key={idx} style={styles.tagPill}>
                                <Text style={styles.tagPillText}>{t}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.cardFooter}>
                            <Text style={styles.cardKmText}>{plan.totalDistanceKm} km en ruta</Text>
                            <View style={styles.viewPlanCta}>
                              <Text style={styles.viewPlanCtaText}>Ver Itinerario</Text>
                              <Icon name="chevron-right" size={16} color="#38BDF8" />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {activeTab === 'create' && (
                <View style={styles.createForm}>
                  <Text style={styles.sectionSubtitle}>
                    CONFIGURA TU PRÓXIMA ESCAPADA EN CAMPER
                  </Text>

                  {/* Origen y Destino */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Ciudad de Salida</Text>
                    <View style={styles.inputBox}>
                      <Icon name="map-marker-outline" size={20} color="#38BDF8" />
                      <TextInput
                        style={styles.textInput}
                        value={origin}
                        onChangeText={setOrigin}
                        placeholder="Ej. Madrid, Barcelona, Valencia"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Destino Final</Text>
                    <View style={styles.inputBox}>
                      <Icon name="flag-checkered" size={20} color="#10B981" />
                      <TextInput
                        style={styles.textInput}
                        value={destination}
                        onChangeText={setDestination}
                        placeholder="Ej. Cabo de Gata, Pirineos, Galicia"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                  </View>

                  {/* Selector de Días */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Duración del Viaje: {durationDays} Días</Text>
                    <View style={styles.daySelectorRow}>
                      {[3, 5, 7, 10, 14].map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.dayOption,
                            durationDays === d && styles.dayOptionSelected,
                          ]}
                          onPress={() => setDurationDays(d)}>
                          <Text
                            style={[
                              styles.dayOptionText,
                              durationDays === d && styles.dayOptionTextSelected,
                            ]}>
                            {d} Días
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Tipo de Vehículo */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Tipo de Vehículo</Text>
                    <View style={styles.vehicleSelectRow}>
                      {(
                        [
                          'camper_van',
                          'motorhome_compact',
                          'motorhome_large',
                          'overlander_4x4',
                        ] as VehicleCategory[]
                      ).map((v) => (
                        <TouchableOpacity
                          key={v}
                          style={[
                            styles.vehicleOption,
                            vehicleType === v && styles.vehicleOptionSelected,
                          ]}
                          onPress={() => setVehicleType(v)}>
                          <Icon
                            name={
                              v === 'camper_van'
                                ? 'van-passenger'
                                : v === 'motorhome_compact'
                                ? 'caravan'
                                : v === 'motorhome_large'
                                ? 'bus'
                                : 'car-estate'
                            }
                            size={20}
                            color={vehicleType === v ? '#38BDF8' : '#94A3B8'}
                          />
                          <Text
                            style={[
                              styles.vehicleText,
                              vehicleType === v && styles.vehicleTextSelected,
                            ]}>
                            {getVehicleLabel(v)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Toggles de Preferencias */}
                  <View style={styles.switchGroup}>
                    <TouchableOpacity
                      style={styles.switchRow}
                      onPress={() => setNeedsLPG(!needsLPG)}>
                      <View style={styles.switchLeft}>
                        <Icon name="gas-station" size={20} color="#EF4444" />
                        <View style={styles.switchTextCol}>
                          <Text style={styles.switchLabel}>Incluir Repostaje GLP / Autogás</Text>
                          <Text style={styles.switchSub}>
                            Busca estaciones Repsol y Cepsa con GLP en ruta
                          </Text>
                        </View>
                      </View>
                      <Icon
                        name={needsLPG ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                        size={24}
                        color={needsLPG ? '#38BDF8' : '#64748B'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.switchRow}
                      onPress={() => setNeedsElectricity(!needsElectricity)}>
                      <View style={styles.switchLeft}>
                        <Icon name="flash" size={20} color="#FBBF24" />
                        <View style={styles.switchTextCol}>
                          <Text style={styles.switchLabel}>Electricidad 220V cada 2 noches</Text>
                          <Text style={styles.switchSub}>
                            Prioriza campings con reserva para recargar baterías
                          </Text>
                        </View>
                      </View>
                      <Icon
                        name={
                          needsElectricity
                            ? 'checkbox-marked-circle'
                            : 'checkbox-blank-circle-outline'
                        }
                        size={24}
                        color={needsElectricity ? '#38BDF8' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Botón de Generación */}
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleGenerateCustom}>
                    <Icon name="auto-fix" size={22} color="#0F172A" />
                    <Text style={styles.generateButtonText}>
                      Diseñar Itinerario Inteligente
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeTab === 'saved' && (
                <View style={styles.savedList}>
                  <Text style={styles.sectionSubtitle}>
                    TUS ITINERARIOS GUARDADOS Y DISPONIBLES OFFLINE
                  </Text>
                  {plans.map((plan) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        activePlanId === plan.id && styles.activePlanCardBorder,
                      ]}
                      onPress={() => handleSelectPlan(plan)}>
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.cardCategory}>
                            {plan.isPreset ? 'PRESET OFICIAL' : 'MI RUTA'}
                          </Text>
                          {activePlanId === plan.id && (
                            <View style={styles.activePillBadge}>
                              <Text style={styles.activePillText}>ACTIVO EN CABINA</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.cardTitle}>{plan.title}</Text>
                        <Text style={styles.cardSubtitle}>{plan.subtitle}</Text>
                        <View style={styles.cardFooter}>
                          <Text style={styles.cardKmText}>
                            {plan.stages.length} etapas • {plan.totalDistanceKm} km
                          </Text>
                          <View style={styles.viewPlanCta}>
                            <Text style={styles.viewPlanCtaText}>Abrir</Text>
                            <Icon name="chevron-right" size={16} color="#38BDF8" />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  headerSuperTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  activateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  activeBadgeActive: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
  },
  activateText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  body: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: '#131D31',
  },
  tabButtonActive: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 6,
  },
  tabButtonTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  listScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 12,
  },
  presetsList: {
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: '#131D31',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  activePlanCardBorder: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  cardDuration: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  activePillBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tagPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  tagPillText: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  cardKmText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewPlanCta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewPlanCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginRight: 2,
  },
  // Formularios de Creación
  createForm: {
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D31',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  textInput: {
    flex: 1,
    height: 48,
    color: '#F8FAFC',
    fontSize: 14,
    marginLeft: 10,
  },
  daySelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayOption: {
    flex: 1,
    backgroundColor: '#131D31',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dayOptionSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  dayOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dayOptionTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  vehicleSelectRow: {
    flexDirection: 'column',
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D31',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  vehicleOptionSelected: {
    borderColor: '#38BDF8',
    backgroundColor: '#1E293B',
  },
  vehicleText: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 12,
  },
  vehicleTextSelected: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  switchGroup: {
    backgroundColor: '#131D31',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  switchTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#38BDF8',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
  savedList: {
    marginBottom: 20,
  },
  // Vista Detallada (Timeline)
  detailScroll: {
    flex: 1,
  },
  planHeroCard: {
    position: 'relative',
    height: 190,
  },
  planHeroImage: {
    width: '100%',
    height: '100%',
  },
  planHeroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 15, 29, 0.88)',
    padding: 14,
  },
  metricRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
    marginLeft: 4,
  },
  heroDescription: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  timelineSection: {
    padding: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: '#131D31',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dayHeader: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  dayBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginRight: 10,
  },
  dayBadgeNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
  },
  dayTitleBox: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  dayRoute: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  stopsContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  stopNotes: {
    fontSize: 11,
    color: '#64748B',
  },
  overnightBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#818CF8',
  },
  overnightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  overnightTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#818CF8',
    marginLeft: 6,
    flex: 1,
  },
  priceTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freePriceTag: {
    backgroundColor: '#065F46',
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  overnightName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  overnightAddress: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  servicesRow: {
    flexDirection: 'row',
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  serviceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
    marginLeft: 4,
  },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: '#0F2744',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionTextBox: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
    lineHeight: 15,
  },
  actionCta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  navigateStageButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateStageText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
});
