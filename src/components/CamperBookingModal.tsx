/**
 * CamperBookingModal.tsx
 * Motor de Reservas B2B de Parcelas y Estancias Camper
 * CamperSites Pro - Central de Reservas Integrada
 */

import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  b2bReservationService,
  validateVehicleDimensions,
  PITCH_DIMENSIONS,
  AVAILABLE_ADDONS,
  PitchType,
  B2BReservationResult,
} from '../services/B2BReservationService';

export interface PartnerCampsite {
  id: string;
  name: string;
  region: string;
  rating: number;
  pricePerNight: number;
  availablePitches: number;
  badge: string;
}

export const PARTNER_CAMPSITES: PartnerCampsite[] = [
  { id: 'area_sierra_madrid_01', name: 'Área Camper Sierra Norte', region: 'Madrid', rating: 4.8, pricePerNight: 16.50, availablePitches: 8, badge: 'DGT 0 Emisiones' },
  { id: 'camping_costa_brava_02', name: 'Camping Resort Costa Brava', region: 'Girona, Cataluña', rating: 4.9, pricePerNight: 24.00, availablePitches: 5, badge: 'Playa & Piscina' },
  { id: 'area_cabo_gata_03', name: 'Área Ecoturismo Cabo de Gata', region: 'Almería, Andalucía', rating: 4.7, pricePerNight: 14.00, availablePitches: 12, badge: 'Parque Natural' },
  { id: 'camping_picos_europa_04', name: 'Camping Picos de Europa', region: 'Cangas de Onís, Asturias', rating: 4.9, pricePerNight: 21.00, availablePitches: 4, badge: 'Montaña & Rutas' },
  { id: 'area_pirineos_ordesa_05', name: 'Camper Park Pirineos Ordesa', region: 'Huesca, Aragón', rating: 4.8, pricePerNight: 18.00, availablePitches: 7, badge: 'Esquí & Senderismo' },
  { id: 'area_tarifa_wind_06', name: 'Tarifa Camper Beach Haven', region: 'Cádiz, Andalucía', rating: 4.6, pricePerNight: 19.50, availablePitches: 6, badge: 'Kitesurf & Playa' },
  { id: 'camping_rias_baixas_07', name: 'Camping Rías Baixas O Grove', region: 'Pontevedra, Galicia', rating: 4.8, pricePerNight: 20.00, availablePitches: 9, badge: 'Gastronomía & Mar' },
  { id: 'area_valencia_albufera_08', name: 'Área Albufera Camper Park', region: 'Valencia', rating: 4.7, pricePerNight: 15.00, availablePitches: 11, badge: 'Cerca Albufera' },
];

interface CamperBookingModalProps {
  visible: boolean;
  areaId?: string;
  areaName?: string;
  onClose: () => void;
  onBookingSuccess?: (booking: B2BReservationResult) => void;
}

export const CamperBookingModal: React.FC<CamperBookingModalProps> = ({
  visible,
  areaId = 'area_sierra_madrid_01',
  areaName = 'Área Camper Sierra Norte (Madrid)',
  onClose,
  onBookingSuccess,
}) => {
  const [activeAreaId, setActiveAreaId] = useState(areaId);
  const [activeAreaName, setActiveAreaName] = useState(areaName);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [areaSearchQuery, setAreaSearchQuery] = useState('');

  const [pitchType, setPitchType] = useState<PitchType>('comfort_medium');
  const [vehicleLength, setVehicleLength] = useState('6.8');
  const [vehicleHeight, setVehicleHeight] = useState('2.9');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['addon_electricity']);
  const [checkInDate, setCheckInDate] = useState('2026-11-01');
  const [checkOutDate, setCheckOutDate] = useState('2026-11-03');
  const [licensePlate, setLicensePlate] = useState('9842-MCG');
  const [customerName, setCustomerName] = useState('Carlos Camper');
  const [customerEmail, setCustomerEmail] = useState('carlos.camper@nomad.com');
  const [customerPhone, setCustomerPhone] = useState('+34 612 345 678');
  const [loading, setLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<B2BReservationResult | null>(null);

  const numVehicleLength = parseFloat(vehicleLength) || 0;
  const numVehicleHeight = parseFloat(vehicleHeight) || 0;
  const dimensionValidation = validateVehicleDimensions(pitchType, numVehicleLength, numVehicleHeight);

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const quote = b2bReservationService.calculateQuote(
    checkInDate,
    checkOutDate,
    pitchType,
    selectedAddons
  );

  const handleConfirmReservation = async () => {
    if (!dimensionValidation.isValid) {
      Alert.alert(
        'Dimensiones incompatibles',
        dimensionValidation.message || 'Tu vehículo supera las dimensiones permitidas para la parcela.'
      );
      return;
    }

    if (!licensePlate.trim()) {
      Alert.alert('Matrícula requerida', 'Introduce la matrícula para el reconocimiento de barrera.');
      return;
    }

    setLoading(true);
    try {
      const res = await b2bReservationService.createReservation({
        areaId: activeAreaId,
        areaName: activeAreaName,
        checkInDate,
        checkOutDate,
        pitchType,
        vehicleLengthMeters: numVehicleLength,
        vehicleHeightMeters: numVehicleHeight,
        licensePlate,
        addons: selectedAddons,
        customerName,
        customerEmail,
        customerPhone,
      });

      setConfirmedBooking(res);
      onBookingSuccess?.(res);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo procesar la reserva. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampsites = PARTNER_CAMPSITES.filter((c) => {
    const q = areaSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q) ||
      c.badge.toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>🏕️ Central de Reservas B2B</Text>
              <TouchableOpacity
                style={styles.headerAreaBadge}
                onPress={() => setShowAreaPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  📍 {activeAreaName}
                </Text>
                <Icon name="chevron-down" size={14} color="#00E676" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                setConfirmedBooking(null);
                onClose();
              }}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {confirmedBooking ? (
              /* VISTA DE CONFIRMACIÓN CON CÓDIGO QR Y PIN DE BARRERA */
              <View style={styles.confirmationWrap}>
                <View style={styles.successIconCircle}>
                  <Icon name="check-bold" size={38} color="#00E676" />
                </View>
                <Text style={styles.confTitle}>¡Reserva Confirmada y Garantizada!</Text>
                <Text style={styles.confSubtitle}>
                  Acceso automático con lector de matrícula y PIN de barrera
                </Text>

                <View style={styles.voucherCard}>
                  <View style={styles.voucherHeader}>
                    <Text style={styles.voucherIdText}>{confirmedBooking.bookingId}</Text>
                    <Text style={styles.voucherStatusBadge}>CONFIRMADA</Text>
                  </View>

                  <View style={styles.qrPlaceholder}>
                    <Icon name="qrcode-scan" size={100} color="#00E676" />
                    <Text style={styles.qrCodeText}>{confirmedBooking.qrAccessCode}</Text>
                  </View>

                  <View style={styles.pinSection}>
                    <Text style={styles.pinLabel}>PIN TECLADO BARRERA:</Text>
                    <Text style={styles.pinCodeText}>{confirmedBooking.barrierPinCode}</Text>
                  </View>

                  <View style={styles.voucherDetailsGrid}>
                    <View style={styles.voucherRow}>
                      <Text style={styles.vLabel}>Matrícula:</Text>
                      <Text style={styles.vVal}>{confirmedBooking.licensePlate}</Text>
                    </View>
                    <View style={styles.voucherRow}>
                      <Text style={styles.vLabel}>Estancia:</Text>
                      <Text style={styles.vVal}>
                        {confirmedBooking.checkInDate} ➔ {confirmedBooking.checkOutDate} ({confirmedBooking.numberOfNights} noches)
                      </Text>
                    </View>
                    <View style={styles.voucherRow}>
                      <Text style={styles.vLabel}>Total Pagado:</Text>
                      <Text style={styles.vValHighlight}>{confirmedBooking.totalAmount.toFixed(2)} €</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setConfirmedBooking(null);
                    onClose();
                  }}>
                  <Text style={styles.doneBtnText}>Cerrar y Ver en Mis Reservas</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* FORMULARIO DE RESERVA B2B */
              <View>
                {/* 1. Selector de Camping o Área Camper */}
                <Text style={styles.formSectionTitle}>1. Camping o Área Camper</Text>
                <TouchableOpacity
                  style={styles.campsiteChoiceCard}
                  onPress={() => setShowAreaPicker(true)}
                  activeOpacity={0.8}>
                  <View style={styles.campsiteChoiceLeft}>
                    <View style={styles.campsiteChoiceIconWrap}>
                      <Icon name="tent" size={24} color="#00E676" />
                    </View>
                    <View style={styles.campsiteChoiceInfo}>
                      <Text style={styles.campsiteChoiceName}>{activeAreaName}</Text>
                      <Text style={styles.campsiteChoiceMeta}>
                        Toca para elegir entre campings y áreas asociadas
                      </Text>
                    </View>
                  </View>
                  <View style={styles.campsiteChangeBadge}>
                    <Icon name="swap-horizontal" size={16} color="#00E676" />
                    <Text style={styles.campsiteChangeBadgeText}>Cambiar</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. Selector de Tipo de Parcela según Medida */}
                <Text style={styles.formSectionTitle}>2. Dimensiones de Vehículo y Parcela</Text>

                <View style={styles.dimensionsRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Longitud Vehículo (m)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={vehicleLength}
                      onChangeText={setVehicleLength}
                      placeholder="6.8"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Altura / Gálibo (m)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={vehicleHeight}
                      onChangeText={setVehicleHeight}
                      placeholder="2.9"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Chip interactivo de compatibilidad de gálibo */}
                <View
                  style={[
                    styles.compatibilityChip,
                    dimensionValidation.isValid
                      ? styles.compatibilityChipValid
                      : styles.compatibilityChipInvalid,
                  ]}>
                  <Icon
                    name={dimensionValidation.isValid ? 'check-decagram' : 'alert-circle'}
                    size={20}
                    color={dimensionValidation.isValid ? '#00E676' : '#EF4444'}
                  />
                  <View style={styles.compatibilityContent}>
                    <Text
                      style={[
                        styles.compatibilityText,
                        dimensionValidation.isValid
                          ? styles.compatibilityTextValid
                          : styles.compatibilityTextInvalid,
                      ]}>
                      {dimensionValidation.message}
                    </Text>
                    {!dimensionValidation.isValid && dimensionValidation.recommendedPitchType && (
                      <TouchableOpacity
                        style={styles.switchPitchBtn}
                        onPress={() => setPitchType(dimensionValidation.recommendedPitchType!)}>
                        <Text style={styles.switchPitchBtnText}>
                          Cambiar a parcela recomendada ({dimensionValidation.recommendedPitchType === 'comfort_medium' ? 'Autocaravana' : 'Liner / XXL'})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.pitchTypeRow}>
                  <TouchableOpacity
                    style={[styles.pitchBtn, pitchType === 'standard_small' && styles.pitchBtnActive]}
                    onPress={() => setPitchType('standard_small')}>
                    <Icon name="van-passenger" size={24} color={pitchType === 'standard_small' ? '#000' : '#CBD5E1'} />
                    <Text style={[styles.pitchBtnTitle, pitchType === 'standard_small' && styles.pitchBtnTitleActive]}>
                      Camper Corta
                    </Text>
                    <Text style={[styles.pitchBtnSub, pitchType === 'standard_small' && styles.pitchBtnSubActive]}>
                      &lt;6.0m (16€/n)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pitchBtn, pitchType === 'comfort_medium' && styles.pitchBtnActive]}
                    onPress={() => setPitchType('comfort_medium')}>
                    <Icon name="caravan" size={24} color={pitchType === 'comfort_medium' ? '#000' : '#CBD5E1'} />
                    <Text style={[styles.pitchBtnTitle, pitchType === 'comfort_medium' && styles.pitchBtnTitleActive]}>
                      Autocaravana
                    </Text>
                    <Text style={[styles.pitchBtnSub, pitchType === 'comfort_medium' && styles.pitchBtnSubActive]}>
                      6-8m (22€/n)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pitchBtn, pitchType === 'xxl_heavy' && styles.pitchBtnActive]}
                    onPress={() => setPitchType('xxl_heavy')}>
                    <Icon name="truck-trailer" size={24} color={pitchType === 'xxl_heavy' ? '#000' : '#CBD5E1'} />
                    <Text style={[styles.pitchBtnTitle, pitchType === 'xxl_heavy' && styles.pitchBtnTitleActive]}>
                      Liner / XXL
                    </Text>
                    <Text style={[styles.pitchBtnSub, pitchType === 'xxl_heavy' && styles.pitchBtnSubActive]}>
                      &gt;8.0m (28€/n)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 3. Fechas de Estancia */}
                <Text style={styles.formSectionTitle}>3. Fechas y Matrícula para Barrera</Text>
                <View style={styles.datesRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Entrada</Text>
                    <TextInput
                      style={styles.textInput}
                      value={checkInDate}
                      onChangeText={setCheckInDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Salida</Text>
                    <TextInput
                      style={styles.textInput}
                      value={checkOutDate}
                      onChangeText={setCheckOutDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Matrícula</Text>
                    <TextInput
                      style={[styles.textInput, styles.plateInput]}
                      value={licensePlate}
                      onChangeText={setLicensePlate}
                      placeholder="9999-XXX"
                      placeholderTextColor="#64748B"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                {/* 4. Servicios y Suplementos */}
                <Text style={styles.formSectionTitle}>4. Servicios y Tomas Eléctricas</Text>
                {AVAILABLE_ADDONS.map((addon) => {
                  const isChecked = selectedAddons.includes(addon.id);
                  return (
                    <TouchableOpacity
                      key={addon.id}
                      style={[styles.addonRow, isChecked && styles.addonRowChecked]}
                      onPress={() => toggleAddon(addon.id)}>
                      <Icon name={addon.icon} size={22} color={isChecked ? '#00E676' : '#94A3B8'} />
                      <Text style={[styles.addonName, isChecked && styles.addonNameChecked]}>
                        {addon.name}
                      </Text>
                      <Text style={styles.addonPrice}>+{addon.pricePerNight} €/noche</Text>
                      <Icon
                        name={isChecked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                        size={22}
                        color={isChecked ? '#00E676' : '#64748B'}
                        style={{ marginLeft: 8 }}
                      />
                    </TouchableOpacity>
                  );
                })}

                {/* 5. Resumen de Precios y Comisión B2B */}
                <View style={styles.quoteCard}>
                  <Text style={styles.quoteTitle}>5. Desglose de Facturación B2B</Text>
                  <View style={styles.quoteRow}>
                    <Text style={styles.qLabel}>
                      Estancia ({quote.nights} noches x {quote.nightlyRate} €):
                    </Text>
                    <Text style={styles.qVal}>{quote.baseTotal.toFixed(2)} €</Text>
                  </View>
                  <View style={styles.quoteRow}>
                    <Text style={styles.qLabel}>Suplementos seleccionados:</Text>
                    <Text style={styles.qVal}>{quote.addonsTotal.toFixed(2)} €</Text>
                  </View>
                  <View style={styles.quoteRow}>
                    <Text style={styles.qLabel}>Comisión gestión CamperSites (10%):</Text>
                    <Text style={styles.qVal}>{quote.platformFee.toFixed(2)} €</Text>
                  </View>
                  <View style={styles.quoteRow}>
                    <Text style={styles.qLabel}>IVA aplicable (21%):</Text>
                    <Text style={styles.qVal}>{quote.taxesTotal.toFixed(2)} €</Text>
                  </View>
                  <View style={[styles.quoteRow, styles.quoteTotalRow]}>
                    <Text style={styles.qTotalLabel}>Total a Pagar:</Text>
                    <Text style={styles.qTotalVal}>{quote.totalAmount.toFixed(2)} €</Text>
                  </View>
                </View>

                {/* Botón de Confirmación */}
                <TouchableOpacity
                  style={[
                    styles.bookActionBtn,
                    (loading || !dimensionValidation.isValid) && styles.bookActionBtnDisabled,
                  ]}
                  disabled={loading || !dimensionValidation.isValid}
                  onPress={handleConfirmReservation}>
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text
                      style={[
                        styles.bookActionBtnText,
                        !dimensionValidation.isValid && styles.bookActionBtnTextDisabled,
                      ]}>
                      {dimensionValidation.isValid
                        ? `Confirmar Reserva • ${quote.totalAmount.toFixed(2)} €`
                        : 'Vehículo Excede Parcela • No Permitido'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* SUB-MODAL SELECTOR DE CAMPINGS / ÁREAS ASOCIADAS */}
          <Modal
            visible={showAreaPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAreaPicker(false)}>
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerTitle}>🏕️ Elegir Camping / Área Camper</Text>
                    <Text style={styles.pickerSubtitle}>Red de campings con acceso automatizado</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closePickerBtn}
                    onPress={() => setShowAreaPicker(false)}>
                    <Icon name="close" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Buscador en tiempo real */}
                <View style={styles.pickerSearchWrap}>
                  <Icon name="magnify" size={20} color="#64748B" />
                  <TextInput
                    style={styles.pickerSearchInput}
                    placeholder="Buscar camping, área o provincia..."
                    placeholderTextColor="#64748B"
                    value={areaSearchQuery}
                    onChangeText={setAreaSearchQuery}
                    autoCapitalize="none"
                  />
                  {areaSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setAreaSearchQuery('')}>
                      <Icon name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Lista de Campings Asociados */}
                <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                  {filteredCampsites.length === 0 ? (
                    <View style={styles.pickerEmptyState}>
                      <Icon name="tent-off" size={40} color="#64748B" />
                      <Text style={styles.pickerEmptyText}>No se encontraron campings con ese criterio</Text>
                    </View>
                  ) : (
                    filteredCampsites.map((c) => {
                      const isSelected = c.id === activeAreaId;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                          onPress={() => {
                            setActiveAreaId(c.id);
                            setActiveAreaName(`${c.name} (${c.region})`);
                            setShowAreaPicker(false);
                          }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <View style={styles.pickerItemHeaderRow}>
                              <Text style={styles.pickerItemName}>{c.name}</Text>
                              <View style={styles.pickerItemBadge}>
                                <Text style={styles.pickerItemBadgeText}>{c.badge}</Text>
                              </View>
                            </View>
                            <Text style={styles.pickerItemRegion}>📍 {c.region} • ⭐ {c.rating} • {c.availablePitches} parcelas libres</Text>
                            <Text style={styles.pickerItemPrice}>Desde {c.pricePerNight.toFixed(2)} € / noche</Text>
                          </View>
                          {isSelected ? (
                            <Icon name="check-circle" size={24} color="#00E676" />
                          ) : (
                            <Icon name="chevron-right" size={22} color="#64748B" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
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
  content: {
    padding: 16,
  },
  formSectionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 8,
  },
  pitchTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pitchBtn: {
    flex: 1,
    backgroundColor: '#1A222D',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#263445',
  },
  pitchBtnActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  pitchBtnTitle: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  pitchBtnTitleActive: {
    color: '#000',
    fontWeight: '800',
  },
  pitchBtnSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  pitchBtnSubActive: {
    color: '#121820',
    fontWeight: '700',
  },
  datesRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  inputCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0A0E14',
    borderWidth: 1,
    borderColor: '#263445',
    borderRadius: 8,
    color: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12,
  },
  plateInput: {
    color: '#00E676',
    fontWeight: '800',
    textAlign: 'center',
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A222D',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#263445',
  },
  addonRowChecked: {
    borderColor: '#00E676',
    backgroundColor: '#13281E',
  },
  addonName: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
    marginLeft: 10,
  },
  addonNameChecked: {
    color: '#FFF',
    fontWeight: '700',
  },
  addonPrice: {
    color: '#FFD600',
    fontSize: 11,
    fontWeight: '700',
  },
  quoteCard: {
    backgroundColor: '#1A222D',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#263445',
  },
  quoteTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  qLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  qVal: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  quoteTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#263445',
    paddingTop: 8,
    marginTop: 6,
  },
  qTotalLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  qTotalVal: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '900',
  },
  bookActionBtn: {
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  bookActionBtnDisabled: {
    backgroundColor: '#334155',
  },
  bookActionBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  confirmationWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#13281E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#00E676',
    marginBottom: 12,
  },
  confTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  confSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  voucherCard: {
    backgroundColor: '#1A222D',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#263445',
    alignItems: 'center',
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#263445',
    paddingBottom: 8,
    marginBottom: 12,
  },
  voucherIdText: {
    color: '#00E676',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  voucherStatusBadge: {
    backgroundColor: '#00E676',
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qrPlaceholder: {
    alignItems: 'center',
    marginVertical: 8,
  },
  qrCodeText: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 4,
  },
  pinSection: {
    backgroundColor: '#0A0E14',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  pinLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  pinCodeText: {
    color: '#FFD600',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 2,
  },
  voucherDetailsGrid: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#263445',
    paddingTop: 8,
    marginTop: 6,
  },
  voucherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  vLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  vVal: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  vValHighlight: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '800',
  },
  doneBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dimensionsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  compatibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  compatibilityChipValid: {
    backgroundColor: '#13281E',
    borderColor: '#00E676',
  },
  compatibilityChipInvalid: {
    backgroundColor: '#2C1214',
    borderColor: '#EF4444',
  },
  compatibilityContent: {
    flex: 1,
    marginLeft: 8,
  },
  compatibilityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  compatibilityTextValid: {
    color: '#00E676',
  },
  compatibilityTextInvalid: {
    color: '#FCA5A5',
  },
  switchPitchBtn: {
    marginTop: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  switchPitchBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  bookActionBtnTextDisabled: {
    color: '#94A3B8',
  },
  headerAreaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  campsiteChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  campsiteChoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  campsiteChoiceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#00E67640',
  },
  campsiteChoiceInfo: {
    flex: 1,
  },
  campsiteChoiceName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  campsiteChoiceMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  campsiteChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E67618',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00E67650',
  },
  campsiteChangeBadgeText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pickerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pickerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closePickerBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#0F172A',
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerSearchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
    marginLeft: 6,
  },
  pickerList: {
    maxHeight: 380,
  },
  pickerEmptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmptyText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerItemSelected: {
    borderColor: '#00E676',
    backgroundColor: '#13281E',
  },
  pickerItemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  pickerItemName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  pickerItemBadge: {
    backgroundColor: '#00E67620',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  pickerItemBadgeText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },
  pickerItemRegion: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  pickerItemPrice: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
});
