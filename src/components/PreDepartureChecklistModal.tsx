/**
 * PreDepartureChecklistModal.tsx
 * Checklist de Seguridad Antes de Arrancar + Presupuesto Estimado de Viaje
 * CamperSites Pro
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Vibration,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripCostEstimate, TripCostCalculatorService } from '../services/TripCostCalculatorService';

export const SKIP_CHECKLIST_STORAGE_KEY = '@camper_skip_pre_departure_checklist';

interface SafetyCheckItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  critical: boolean;
}

const SAFETY_CHECKS: SafetyCheckItem[] = [
  {
    id: 'windows_roof',
    icon: 'window-closed-variant',
    title: 'Claraboyas y Ventanas',
    description: 'Cerradas herméticamente para evitar que se arranquen por el viento a 100 km/h.',
    critical: true,
  },
  {
    id: 'step_awning',
    icon: 'stairs-up',
    title: 'Escalón Eléctrico y Toldo',
    description: 'Recogidos y enclavados por completo antes de engranar la marcha.',
    critical: true,
  },
  {
    id: 'gas_fridge',
    icon: 'gas-cylinder',
    title: 'Gas Propano y Nevera a 12V',
    description: 'Llave de paso de gas cerrada. Nevera conmutada a batería de 12V.',
    critical: true,
  },
  {
    id: 'chocks_cable',
    icon: 'power-plug-off',
    title: 'Calzos y Cable 220V',
    description: 'Calzos de nivelación guardados y cable eléctrico desconectado de la torreta.',
    critical: true,
  },
  {
    id: 'interior_lock',
    icon: 'lock-check-outline',
    title: 'Armarios y Objetos Sueltos',
    description: 'Pestillos de cajones asegurados y enseres de mesa recogidos.',
    critical: false,
  },
];

interface PreDepartureChecklistModalProps {
  visible: boolean;
  destinationName: string;
  distanceMeters: number;
  durationSeconds?: number;
  destinationPricePerNight?: number | null;
  onConfirmStartNavigation: () => void;
  onCancel: () => void;
}

export const PreDepartureChecklistModal: React.FC<PreDepartureChecklistModalProps> = ({
  visible,
  destinationName,
  distanceMeters,
  durationSeconds,
  destinationPricePerNight,
  onConfirmStartNavigation,
  onCancel,
}) => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [costEstimate, setCostEstimate] = useState<TripCostEstimate | null>(null);
  const [skipInFuture, setSkipInFuture] = useState(false);

  useEffect(() => {
    if (visible) {
      TripCostCalculatorService.calculateEstimate({
        distanceMeters,
        durationSeconds,
        destinationPricePerNight,
      }).then((est) => setCostEstimate(est));
    }
  }, [visible, distanceMeters, durationSeconds, destinationPricePerNight]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        Vibration.vibrate(25);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setCheckedIds(new Set(SAFETY_CHECKS.map((c) => c.id)));
    Vibration.vibrate(40);
  };

  const handleProceed = async () => {
    if (skipInFuture) {
      await AsyncStorage.setItem(SKIP_CHECKLIST_STORAGE_KEY, 'true');
    }
    Vibration.vibrate(60);
    onConfirmStartNavigation();
  };

  const allChecked = checkedIds.size === SAFETY_CHECKS.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Barra superior con agarre táctil */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerIconPod}>
              <Icon name="shield-car" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.headerTitle}>Checklist Antes de Arrancar</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Destino: {destinationName}
              </Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Tarjeta de Presupuesto Estimado del Viaje (Calculadora Financiera) */}
            {costEstimate && (
              <View style={styles.costCard}>
                <View style={styles.costHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="calculator-variant-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                    <Text style={styles.costCardTitle}>PRESUPUESTO ESTIMADO DE VIAJE</Text>
                  </View>
                  <Text style={styles.costVehicleBadge}>{costEstimate.vehicleLabel}</Text>
                </View>

                <View style={styles.costMetricsRow}>
                  <View style={styles.costMetricItem}>
                    <Text style={styles.costMetricLabel}>Combustible ({costEstimate.fuelType.toUpperCase()})</Text>
                    <Text style={styles.costMetricVal}>~{costEstimate.fuelCostEur.toFixed(2)} €</Text>
                    <Text style={styles.costMetricSub}>
                      {costEstimate.fuelLitersNeeded}L · {costEstimate.avgConsumptionL100km} L/100km
                    </Text>
                  </View>

                  <View style={styles.costMetricDivider} />

                  <View style={styles.costMetricItem}>
                    <Text style={styles.costMetricLabel}>Estancia / Parcela</Text>
                    <Text style={styles.costMetricVal}>
                      {costEstimate.accommodationCostEur > 0 ? `${costEstimate.accommodationCostEur.toFixed(2)} €` : '0,00 € (Gratis)'}
                    </Text>
                    <Text style={styles.costMetricSub}>Tarifa de pernocta</Text>
                  </View>

                  <View style={styles.costMetricDivider} />

                  <View style={styles.costMetricItem}>
                    <Text style={styles.costMetricLabel}>Coste Total</Text>
                    <Text style={[styles.costMetricVal, { color: '#10B981' }]}>
                      {costEstimate.totalCostEur.toFixed(2)} €
                    </Text>
                    <Text style={styles.costMetricSub}>{costEstimate.distanceKm} km · {costEstimate.durationMinutes} min</Text>
                  </View>
                </View>

                {costEstimate.repsolSavingsEur > 0 && (
                  <TouchableOpacity
                    style={styles.repsolDiscountRow}
                    activeOpacity={0.8}
                    onPress={() => Linking.openURL('https://repsol.es/particulares/vehiculo/autogas-glp/?promo=CAMPERSITESPRO')}>
                    <Icon name="tag-percent" size={16} color="#FF6D00" style={{ marginRight: 6 }} />
                    <Text style={styles.repsolDiscountText}>
                      Ahorra <Text style={{ fontWeight: '800', color: '#FF6D00' }}>-{costEstimate.repsolSavingsEur.toFixed(2)}€</Text> con Repsol Waylet (10 cts/L dto)
                    </Text>
                    <Icon name="chevron-right" size={16} color="#FF6D00" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Cabecera del Checklist */}
            <View style={styles.checklistTitleRow}>
              <Text style={styles.checklistSectionTitle}>Puntos Críticos de Seguridad</Text>
              <TouchableOpacity onPress={handleSelectAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.selectAllText}>Marcar todos ({checkedIds.size}/{SAFETY_CHECKS.length})</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de Verificaciones */}
            {SAFETY_CHECKS.map((item) => {
              const isChecked = checkedIds.has(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.checkRow, isChecked && styles.checkRowActive]}
                  onPress={() => toggleCheck(item.id)}
                  activeOpacity={0.85}>
                  <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxActive]}>
                    <Icon
                      name={isChecked ? 'check-bold' : item.icon}
                      size={18}
                      color={isChecked ? '#FFFFFF' : '#94A3B8'}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.checkItemTitle, isChecked && styles.checkItemTitleActive]}>
                        {item.title}
                      </Text>
                      {item.critical && !isChecked && (
                        <View style={styles.criticalBadge}>
                          <Text style={styles.criticalBadgeText}>Crítico</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.checkItemDesc}>{item.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Checkbox "No volver a mostrar automáticamente" */}
            <TouchableOpacity
              style={styles.skipRow}
              onPress={() => setSkipInFuture(!skipInFuture)}
              activeOpacity={0.8}>
              <Icon
                name={skipInFuture ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={18}
                color={skipInFuture ? '#10B981' : '#64748B'}
              />
              <Text style={styles.skipText}>No volver a mostrar antes de cada ruta</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.startNavigationBtn, allChecked && styles.startNavigationBtnReady]}
              onPress={handleProceed}
              activeOpacity={0.85}>
              <Icon name="navigation-variant" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.startNavigationBtnText}>
                {allChecked ? '🚀 ¡Todo Listo • Iniciar Ruta!' : '🚀 Iniciar Ruta'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Revisar en el mapa</Text>
            </TouchableOpacity>
          </View>
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
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderColor: '#38BDF8',
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerIconPod: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // Cost Card
  costCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 14,
  },
  costHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  costCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.6,
  },
  costVehicleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  costMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  costMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  costMetricDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
  costMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
    textAlign: 'center',
  },
  costMetricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  costMetricSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  repsolDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 109, 0, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 109, 0, 0.25)',
  },
  repsolDiscountText: {
    fontSize: 11,
    color: '#F8FAFC',
    flex: 1,
  },
  // Checklist
  checklistTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  checklistSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 8,
  },
  checkRowActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  checkboxBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  checkItemTitleActive: {
    color: '#10B981',
  },
  checkItemDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 14,
  },
  criticalBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  criticalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 8,
  },
  // Actions
  actionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  startNavigationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  startNavigationBtnReady: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  startNavigationBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
