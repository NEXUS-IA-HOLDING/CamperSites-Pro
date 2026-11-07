/**
 * VehicleTelemetryModal.tsx - Panel Táctico de Telemetría, Presión de Neumáticos y Mantenimiento
 * CamperSites Pro - Salud del Vehículo & Conexión Android Auto
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  VehicleTelemetryService,
  VehicleTelemetryData,
  TireData,
  MaintenanceItem,
} from '../services/VehicleTelemetryService';

interface Props {
  visible: boolean;
  currentSpeedKmH?: number;
  destinationCoord?: { latitude: number; longitude: number; name?: string } | null;
  onClose: () => void;
}

type TabType = 'tires' | 'maintenance' | 'performance';

export const VehicleTelemetryModal: React.FC<Props> = ({
  visible,
  currentSpeedKmH = 0,
  destinationCoord,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('tires');
  const [telemetry, setTelemetry] = useState<VehicleTelemetryData | null>(null);
  const [editingOdo, setEditingOdo] = useState<boolean>(false);
  const [odoInput, setOdoInput] = useState<string>('');

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    VehicleTelemetryService.simulateRoadConditions(currentSpeedKmH);
    const data = await VehicleTelemetryService.getTelemetry();
    setTelemetry(data);
    setOdoInput(String(data.totalKm));
  };

  const handleRecordMaintenance = (type: 'oilAndFilter' | 'fuelFilter' | 'airFilter' | 'brakeFluid', name: string) => {
    Alert.alert(
      `Registrar Mantenimiento`,
      `¿Confirmas que has realizado el cambio de ${name} a los ${telemetry?.totalKm.toLocaleString()} km? Se reseteará el contador de vida útil.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Registrar',
          onPress: async () => {
            const updated = await VehicleTelemetryService.recordMaintenance(type);
            setTelemetry({ ...updated });
          },
        },
      ]
    );
  };

  const handleCalibrateTires = () => {
    Alert.alert(
      'Calibrar Presión de Neumáticos (TPMS)',
      'Selecciona el tipo de furgoneta / camper para fijar la presión recomendada en frío:',
      [
        {
          text: 'Gran Volumen / AC (4.8 bar del / 5.2 bar tras)',
          onPress: async () => {
            const updated = await VehicleTelemetryService.calibrateTires(4.8, 5.2);
            setTelemetry({ ...updated });
          },
        },
        {
          text: 'Camper Mediana (3.2 bar del / 3.6 bar tras)',
          onPress: async () => {
            const updated = await VehicleTelemetryService.calibrateTires(3.2, 3.6);
            setTelemetry({ ...updated });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleSaveOdometer = async () => {
    const val = parseInt(odoInput, 10);
    if (!isNaN(val) && val > 0) {
      const updated = await VehicleTelemetryService.updateOdometer(val);
      setTelemetry({ ...updated });
      setEditingOdo(false);
    }
  };

  const handleProjectAndroidAuto = async () => {
    if (destinationCoord) {
      const ok = await VehicleTelemetryService.projectToAndroidAuto(destinationCoord);
      if (ok) {
        Alert.alert('Android Auto Proyectado', 'La ruta se ha enviado a la pantalla del vehículo.');
      }
    } else {
      Alert.alert(
        'Modo Android Auto Preparado',
        'Tu sistema de cabina está conectado. Cuando selecciones cualquier spot o ruta, pulsa en "Proyectar" para verlo en la pantalla de la furgoneta.'
      );
    }
  };

  if (!telemetry) return null;

  const renderTirePod = (tire: TireData, label: string) => {
    const isOptimal = tire.status === 'optimal';
    const color = isOptimal ? '#10B981' : tire.status === 'warning' ? '#F59E0B' : '#EF4444';
    return (
      <View style={[styles.tirePod, { borderColor: color }]}>
        <View style={styles.tireTopRow}>
          <Text style={styles.tireLabel}>{label}</Text>
          <Icon name="car-tire-alert" size={16} color={color} />
        </View>
        <Text style={[styles.tirePressure, { color }]}>
          {tire.pressureBar.toFixed(1)} <Text style={styles.tireUnit}>bar</Text>
        </Text>
        <Text style={styles.tirePsi}>({Math.round(tire.pressureBar * 14.5038)} psi)</Text>
        <View style={styles.tireBottomRow}>
          <Icon name="thermometer" size={12} color="#94A3B8" />
          <Text style={styles.tireTemp}>{tire.temperatureC}°C</Text>
        </View>
      </View>
    );
  };

  const renderMaintenanceCard = (
    item: MaintenanceItem,
    type: 'oilAndFilter' | 'fuelFilter' | 'airFilter' | 'brakeFluid'
  ) => {
    const percent = item.recommendedLifePercent;
    const color = percent > 40 ? '#10B981' : percent > 15 ? '#F59E0B' : '#EF4444';

    return (
      <View style={styles.maintCard}>
        <View style={styles.maintTopRow}>
          <View style={styles.maintTitleWrap}>
            <View style={[styles.maintIconBox, { backgroundColor: `${color}18`, borderColor: color }]}>
              <Icon name={item.icon} size={20} color={color} />
            </View>
            <View>
              <Text style={styles.maintName}>{item.name}</Text>
              <Text style={styles.maintNotes}>{item.notes}</Text>
            </View>
          </View>
          <View style={styles.maintPercentPod}>
            <Text style={[styles.maintPercentText, { color }]}>{percent}%</Text>
            <Text style={styles.maintPercentSub}>vida útil</Text>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>

        <View style={styles.maintBottomRow}>
          <Text style={styles.maintKmText}>
            Quedan: <Text style={{ color: '#F8FAFC', fontWeight: '800' }}>{item.kmRemaining.toLocaleString()} km</Text> (cada {item.intervalKm / 1000}k km)
          </Text>

          <TouchableOpacity
            style={styles.recordChangeBtn}
            onPress={() => handleRecordMaintenance(type, item.name)}
            activeOpacity={0.8}>
            <Icon name="wrench-outline" size={13} color="#38BDF8" style={{ marginRight: 4 }} />
            <Text style={styles.recordChangeText}>Registrar Cambio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Cabecera */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBadge}>
                <Icon name="car-connected" size={20} color="#38BDF8" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Telemetría & Android Auto</Text>
                <Text style={styles.headerSubtitle}>
                  {telemetry.totalKm.toLocaleString()} km • Diagnóstico en tiempo real
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Selector de Pestañas */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'tires' && styles.tabBtnActive]}
              onPress={() => setActiveTab('tires')}>
              <Icon
                name="car-tire-alert"
                size={16}
                color={activeTab === 'tires' ? '#38BDF8' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeTab === 'tires' && styles.tabBtnTextActive]}>
                Neumáticos TPMS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'maintenance' && styles.tabBtnActive]}
              onPress={() => setActiveTab('maintenance')}>
              <Icon
                name="wrench-clock"
                size={16}
                color={activeTab === 'maintenance' ? '#10B981' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeTab === 'maintenance' && styles.tabBtnTextActive]}>
                Filtros & Aceite
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'performance' && styles.tabBtnActive]}
              onPress={() => setActiveTab('performance')}>
              <Icon
                name="chart-timeline-variant"
                size={16}
                color={activeTab === 'performance' ? '#F59E0B' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeTab === 'performance' && styles.tabBtnTextActive]}>
                Rendimiento
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contenido scrolleable según pestaña */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* PESTAÑA 1: NEUMÁTICOS TPMS */}
            {activeTab === 'tires' && (
              <View>
                <View style={styles.tiresOverviewBanner}>
                  <Icon name="shield-check" size={20} color="#10B981" style={{ marginRight: 8 }} />
                  <Text style={styles.tiresOverviewText}>
                    Presión óptima para viajar cargado (4.8 bar del / 5.2 bar tras). Evita reventones por sobrecalentamiento.
                  </Text>
                </View>

                {/* Chasis con los 4 neumáticos */}
                <View style={styles.chassisContainer}>
                  <View style={styles.chassisVan}>
                    <Icon name="van-utility" size={90} color="#38BDF8" style={{ opacity: 0.85 }} />
                  </View>

                  <View style={styles.tiresGrid}>
                    <View style={styles.tiresRow}>
                      {renderTirePod(telemetry.tires.frontLeft, 'Del. Izq.')}
                      {renderTirePod(telemetry.tires.frontRight, 'Del. Der.')}
                    </View>
                    <View style={[styles.tiresRow, { marginTop: 14 }]}>
                      {renderTirePod(telemetry.tires.rearLeft, 'Tras. Izq.')}
                      {renderTirePod(telemetry.tires.rearRight, 'Tras. Der.')}
                    </View>
                  </View>
                </View>

                {/* Botón de Calibración TPMS */}
                <TouchableOpacity
                  style={styles.calibrateTiresBtn}
                  activeOpacity={0.8}
                  onPress={handleCalibrateTires}>
                  <Icon name="tune-variant" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.calibrateTiresBtnText}>Fijar / Calibrar Presión Objetivo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* PESTAÑA 2: MANTENIMIENTO PREDICTIVO & FILTROS */}
            {activeTab === 'maintenance' && (
              <View>
                {/* Baterías (Motor y Auxiliar) */}
                <View style={styles.batteriesCard}>
                  <View style={styles.batteryPod}>
                    <Icon name="car-battery" size={18} color="#38BDF8" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.batteryLabel}>Batería Motor</Text>
                      <Text style={styles.batteryVolts}>
                        {telemetry.batteryMotorVolts.toFixed(1)}V{' '}
                        <Text style={{ fontSize: 10, color: telemetry.isAlternatorCharging ? '#10B981' : '#94A3B8' }}>
                          {telemetry.isAlternatorCharging ? '(Cargando)' : '(Reposo)'}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.batteryDivider} />

                  <View style={styles.batteryPod}>
                    <Icon name="lightning-bolt" size={18} color="#10B981" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.batteryLabel}>Batería Auxiliar Camper</Text>
                      <Text style={[styles.batteryVolts, { color: '#10B981' }]}>
                        {telemetry.batteryAuxCamperVolts.toFixed(1)}V (100% Lista)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tarjetas de Mantenimiento */}
                {renderMaintenanceCard(telemetry.maintenance.oilAndFilter, 'oilAndFilter')}
                {renderMaintenanceCard(telemetry.maintenance.fuelFilter, 'fuelFilter')}
                {renderMaintenanceCard(telemetry.maintenance.airFilter, 'airFilter')}
                {renderMaintenanceCard(telemetry.maintenance.brakeFluid, 'brakeFluid')}
              </View>
            )}

            {/* PESTAÑA 3: RENDIMIENTO & CONSUMO */}
            {activeTab === 'performance' && (
              <View>
                {/* Odómetro */}
                <View style={styles.odometerCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.odometerLabel}>KILOMETRAJE TOTAL DEL VEHÍCULO</Text>
                    {editingOdo ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <TextInput
                          style={styles.odometerInput}
                          keyboardType="numeric"
                          value={odoInput}
                          onChangeText={setOdoInput}
                        />
                        <TouchableOpacity style={styles.saveOdoBtn} onPress={handleSaveOdometer}>
                          <Text style={styles.saveOdoText}>Guardar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.odometerValue}>{telemetry.totalKm.toLocaleString()} km</Text>
                    )}
                  </View>
                  {!editingOdo && (
                    <TouchableOpacity style={styles.editOdoBtn} onPress={() => setEditingOdo(true)}>
                      <Icon name="pencil" size={16} color="#38BDF8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Grid de Métricas de Rendimiento */}
                <View style={styles.perfGrid}>
                  <View style={styles.perfCard}>
                    <Icon name="gas-station" size={20} color="#10B981" style={{ marginBottom: 4 }} />
                    <Text style={styles.perfLabel}>Consumo Medio</Text>
                    <Text style={styles.perfValue}>{telemetry.avgConsumptionL100} L/100km</Text>
                    <Text style={styles.perfSub}>Diésel eficiente</Text>
                  </View>

                  <View style={styles.perfCard}>
                    <Icon name="map-marker-distance" size={20} color="#38BDF8" style={{ marginBottom: 4 }} />
                    <Text style={styles.perfLabel}>Autonomía Est.</Text>
                    <Text style={styles.perfValue}>~640 km</Text>
                    <Text style={styles.perfSub}>{telemetry.fuelTankPercent}% depósito</Text>
                  </View>

                  <View style={styles.perfCard}>
                    <Icon name="cash-multiple" size={20} color="#F59E0B" style={{ marginBottom: 4 }} />
                    <Text style={styles.perfLabel}>Coste Estimado</Text>
                    <Text style={styles.perfValue}>~0.13 €/km</Text>
                    <Text style={styles.perfSub}>Ahorro en ruta</Text>
                  </View>

                  <View style={styles.perfCard}>
                    <Icon name="car-speed-limiter" size={20} color="#A78BFA" style={{ marginBottom: 4 }} />
                    <Text style={styles.perfLabel}>Velocidad Media</Text>
                    <Text style={styles.perfValue}>{currentSpeedKmH > 0 ? Math.round(currentSpeedKmH) : 78} km/h</Text>
                    <Text style={styles.perfSub}>Ruta habitual</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Botón Inferior: Proyección a Pantalla de Salpicadero Android Auto */}
          <TouchableOpacity
            style={styles.projectAndroidAutoBtn}
            activeOpacity={0.85}
            onPress={handleProjectAndroidAuto}>
            <Icon name="cast-connected" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.projectAndroidAutoText}>
              📺 Proyectar en Pantalla Android Auto (Salpicadero)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '85%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  tabBtnText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#F8FAFC',
  },
  tiresOverviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 10,
    marginBottom: 12,
  },
  tiresOverviewText: {
    color: '#D1FAE5',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  chassisContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
    marginBottom: 12,
  },
  chassisVan: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiresGrid: {
    width: '100%',
    paddingHorizontal: 8,
  },
  tiresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tirePod: {
    width: '44%',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
  },
  tireTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  tireLabel: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '800',
  },
  tirePressure: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tireUnit: {
    fontSize: 11,
    fontWeight: '700',
  },
  tirePsi: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
  },
  tireBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  tireTemp: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  calibrateTiresBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  calibrateTiresBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  batteriesCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginBottom: 12,
  },
  batteryPod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
  },
  batteryVolts: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 1,
  },
  batteryDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 10,
  },
  maintCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginBottom: 8,
  },
  maintTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  maintTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  maintIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  maintName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  maintNotes: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  maintPercentPod: {
    alignItems: 'flex-end',
  },
  maintPercentText: {
    fontSize: 16,
    fontWeight: '900',
  },
  maintPercentSub: {
    color: '#64748B',
    fontSize: 9,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  maintBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maintKmText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  recordChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  recordChangeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  odometerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 12,
  },
  odometerLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  odometerValue: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  odometerInput: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#38BDF8',
    width: 140,
    marginRight: 8,
  },
  saveOdoBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveOdoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  editOdoBtn: {
    padding: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 10,
  },
  perfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  perfCard: {
    width: '48%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    alignItems: 'flex-start',
  },
  perfLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  perfValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
    marginVertical: 2,
  },
  perfSub: {
    color: '#94A3B8',
    fontSize: 10,
  },
  projectAndroidAutoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  projectAndroidAutoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
