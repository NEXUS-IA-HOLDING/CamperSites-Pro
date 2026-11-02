/**
 * B2BReservationService.ts
 * Central de Reservas B2B para Áreas Camper, Campings y Parkings Privados
 *
 * Características:
 * - Reserva de parcelas garantizadas con verificación de gálibo y longitud del vehículo.
 * - Suplementos de cabina: Conexión eléctrica (220V 16A), toma de agua y mascotas.
 * - Cálculo de comisiones B2B (10% de comisión CamperSites Pro, 21% IVA).
 * - Generación de voucher con código QR de acceso y PIN numérico de 6 dígitos para barreras automáticas.
 * - Soporte offline robusto con persistencia en AsyncStorage y sincronización con Supabase.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Logger } from '../utils/logger';

export type PitchType = 'standard_small' | 'comfort_medium' | 'xxl_heavy';

export interface PitchDimensionLimit {
  maxLengthMeters: number;
  maxHeightMeters: number;
  nightlyRate: number;
  electricityRating: string;
}

export const PITCH_DIMENSIONS: Record<PitchType, PitchDimensionLimit> = {
  standard_small: {
    maxLengthMeters: 6.0,
    maxHeightMeters: 2.8,
    nightlyRate: 16.0,
    electricityRating: '10A',
  },
  comfort_medium: {
    maxLengthMeters: 8.0,
    maxHeightMeters: 3.3,
    nightlyRate: 22.0,
    electricityRating: '16A',
  },
  xxl_heavy: {
    maxLengthMeters: 12.0,
    maxHeightMeters: 4.0,
    nightlyRate: 28.0,
    electricityRating: '16A / 32A',
  },
};

export interface DimensionValidationResult {
  isValid: boolean;
  recommendedPitchType?: PitchType;
  message: string;
}

export interface PitchServiceAddon {
  id: string;
  name: string;
  pricePerNight: number;
  icon: string;
}

export interface B2BReservationRequest {
  areaId: string;
  areaName: string;
  checkInDate: string;  // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  pitchType: PitchType;
  vehicleLengthMeters: number;
  vehicleHeightMeters: number;
  licensePlate: string;
  addons: string[];     // IDs de addons seleccionados
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface B2BReservationResult {
  bookingId: string;
  status: 'confirmed' | 'pending_payment';
  areaId: string;
  areaName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  pitchType: PitchType;
  licensePlate: string;
  nightlyRate: number;
  baseTotal: number;
  addonsTotal: number;
  platformFee: number; // Comisión B2B 10%
  taxesTotal: number;  // IVA 21%
  totalAmount: number;
  qrAccessCode: string;
  barrierPinCode: string;
  createdAt: number;
}

export interface ReservationQuote {
  nights: number;
  nightlyRate: number;
  baseTotal: number;
  addonsTotal: number;
  platformFee: number;
  taxesTotal: number;
  totalAmount: number;
}

export type ReservationParams = B2BReservationRequest;
export type ReservationConfirmation = B2BReservationResult;

const STORAGE_KEY = '@campersites_b2b_reservations';
const COMMISSION_RATE = 0.10; // 10% de comisión B2B por reserva
const IVA_RATE = 0.21;        // 21% IVA en España

export const AVAILABLE_ADDONS: PitchServiceAddon[] = [
  {
    id: 'addon_electricity',
    name: 'Conexión Eléctrica (220V 16A)',
    pricePerNight: 4.5,
    icon: 'power-plug',
  },
  {
    id: 'addon_water_fill',
    name: 'Toma Directa Agua Potable en Parcela',
    pricePerNight: 2.0,
    icon: 'water-pump',
  },
  {
    id: 'addon_pet',
    name: 'Suplemento Mascota (Zona Canina)',
    pricePerNight: 1.5,
    icon: 'paw',
  },
  {
    id: 'addon_late_checkout',
    name: 'Late Check-Out (Salida hasta las 18:00h)',
    pricePerNight: 6.0,
    icon: 'clock-outline',
  },
];

export function validateVehicleDimensions(
  pitchType: PitchType,
  lengthMeters: number,
  heightMeters: number
): DimensionValidationResult {
  if (isNaN(lengthMeters) || isNaN(heightMeters) || lengthMeters <= 0 || heightMeters <= 0) {
    return {
      isValid: false,
      message: 'Las dimensiones del vehículo deben ser valores numéricos positivos.',
    };
  }

  const limit = PITCH_DIMENSIONS[pitchType];
  if (!limit) {
    return {
      isValid: false,
      message: `Tipo de parcela '${pitchType}' no reconocido.`,
    };
  }

  if (lengthMeters <= limit.maxLengthMeters && heightMeters <= limit.maxHeightMeters) {
    return {
      isValid: true,
      message: `Vehículo compatible con parcela (${lengthMeters.toFixed(1)}m ≤ ${limit.maxLengthMeters}m, ${heightMeters.toFixed(1)}m ≤ ${limit.maxHeightMeters}m)`,
    };
  }

  // Determinar recomendación si excede dimensiones
  let recommendedPitchType: PitchType | undefined;
  if (
    lengthMeters <= PITCH_DIMENSIONS.comfort_medium.maxLengthMeters &&
    heightMeters <= PITCH_DIMENSIONS.comfort_medium.maxHeightMeters
  ) {
    recommendedPitchType = 'comfort_medium';
  } else if (
    lengthMeters <= PITCH_DIMENSIONS.xxl_heavy.maxLengthMeters &&
    heightMeters <= PITCH_DIMENSIONS.xxl_heavy.maxHeightMeters
  ) {
    recommendedPitchType = 'xxl_heavy';
  }

  if (recommendedPitchType) {
    const recLimit = PITCH_DIMENSIONS[recommendedPitchType];
    const recName = recommendedPitchType === 'comfort_medium' ? 'Autocaravana (6-8m)' : 'Liner / XXL (>8m)';
    return {
      isValid: false,
      recommendedPitchType,
      message: `Vehículo demasiado grande para esta parcela (${lengthMeters}m x ${heightMeters}m). Recomendado: ${recName} (hasta ${recLimit.maxLengthMeters}m x ${recLimit.maxHeightMeters}m).`,
    };
  }

  return {
    isValid: false,
    message: `El vehículo (${lengthMeters}m x ${heightMeters}m) excede las dimensiones máximas del camping (${PITCH_DIMENSIONS.xxl_heavy.maxLengthMeters}m x ${PITCH_DIMENSIONS.xxl_heavy.maxHeightMeters}m).`,
  };
}

class B2BReservationServiceImpl {
  private reservations: B2BReservationResult[] = [];
  private isLoaded = false;

  constructor() {
    this.loadReservations();
  }

  private async loadReservations(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        this.reservations = JSON.parse(data);
      }
      this.isLoaded = true;
    } catch (e) {
      Logger.error('B2BReservationService', 'Error loading reservations', e);
    }
  }

  private async saveReservations(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.reservations));
    } catch (e) {
      Logger.error('B2BReservationService', 'Error saving reservations', e);
    }
  }

  public validateVehicleDimensions(
    pitchType: PitchType,
    lengthMeters: number,
    heightMeters: number
  ): DimensionValidationResult {
    return validateVehicleDimensions(pitchType, lengthMeters, heightMeters);
  }

  public calculateQuote(
    checkInDateOrParams:
      | string
      | {
          checkInDate: string;
          checkOutDate: string;
          pitchType: PitchType;
          selectedAddonIds?: string[];
          addonIds?: string[];
        },
    checkOutDate?: string,
    pitchType?: PitchType,
    addonIds?: string[]
  ): ReservationQuote {
    let inDate = '';
    let outDate = '';
    let pType: PitchType = 'standard_small';
    let addons: string[] = [];

    if (typeof checkInDateOrParams === 'string') {
      inDate = checkInDateOrParams;
      outDate = checkOutDate || '';
      pType = pitchType || 'standard_small';
      addons = addonIds || [];
    } else if (checkInDateOrParams && typeof checkInDateOrParams === 'object') {
      inDate = checkInDateOrParams.checkInDate;
      outDate = checkInDateOrParams.checkOutDate;
      pType = checkInDateOrParams.pitchType;
      addons = checkInDateOrParams.selectedAddonIds || checkInDateOrParams.addonIds || [];
    }

    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const rawDiff = Math.round((end - start) / (1000 * 3600 * 24));
    const diffDays = !isNaN(rawDiff) && rawDiff > 0 ? rawDiff : 1;

    const nightlyRate = PITCH_DIMENSIONS[pType]?.nightlyRate ?? 16.0;
    const baseTotal = nightlyRate * diffDays;

    let addonsDaily = 0;
    addons.forEach((id) => {
      const addon = AVAILABLE_ADDONS.find((a) => a.id === id);
      if (addon) addonsDaily += addon.pricePerNight;
    });
    const addonsTotal = addonsDaily * diffDays;

    const subtotal = baseTotal + addonsTotal;
    const platformFee = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
    const taxesTotal = Math.round((subtotal + platformFee) * IVA_RATE * 100) / 100;
    const totalAmount = Math.round((subtotal + platformFee + taxesTotal) * 100) / 100;

    return {
      nights: diffDays,
      nightlyRate,
      baseTotal,
      addonsTotal,
      platformFee,
      taxesTotal,
      totalAmount,
    };
  }

  public async createReservation(request: B2BReservationRequest): Promise<B2BReservationResult> {
    if (!this.isLoaded) await this.loadReservations();

    // Validar gálibo y longitud del vehículo
    const dimensionCheck = this.validateVehicleDimensions(
      request.pitchType,
      request.vehicleLengthMeters,
      request.vehicleHeightMeters
    );
    if (!dimensionCheck.isValid) {
      throw new Error(dimensionCheck.message);
    }

    const quote = this.calculateQuote(
      request.checkInDate,
      request.checkOutDate,
      request.pitchType,
      request.addons
    );

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingId = `CP-B2B-${Date.now().toString().slice(-4)}${randomSuffix}`;
    const barrierPin = Math.floor(100000 + Math.random() * 900000).toString();
    const cleanPlate = request.licensePlate.toUpperCase().trim();
    const qrAccessCode = `CAMPERSITES:BOOKING:${bookingId}:${cleanPlate}`;

    const reservation: B2BReservationResult = {
      bookingId,
      status: 'confirmed',
      areaId: request.areaId,
      areaName: request.areaName,
      checkInDate: request.checkInDate,
      checkOutDate: request.checkOutDate,
      numberOfNights: quote.nights,
      pitchType: request.pitchType,
      licensePlate: cleanPlate,
      nightlyRate: quote.nightlyRate,
      baseTotal: quote.baseTotal,
      addonsTotal: quote.addonsTotal,
      platformFee: quote.platformFee,
      taxesTotal: quote.taxesTotal,
      totalAmount: quote.totalAmount,
      qrAccessCode,
      barrierPinCode: barrierPin,
      createdAt: Date.now(),
    };

    // Sincronización con Supabase (b2b_reservations) con fallback resiliente offline
    try {
      let currentUserId: string | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          currentUserId = authData.user.id;
        }
      } catch {
        // Modo offline / usuario no autenticado
      }

      let hostId: string | null = null;
      let pitchId: string | null = null;
      try {
        const { data: host } = await supabase
          .from('b2b_campground_hosts')
          .select('id')
          .eq('location_id', request.areaId)
          .maybeSingle();
        if (host?.id) hostId = host.id;

        if (hostId) {
          const { data: pitch } = await supabase
            .from('b2b_pitches')
            .select('id')
            .eq('host_id', hostId)
            .eq('pitch_type', request.pitchType)
            .eq('is_available', true)
            .maybeSingle();
          if (pitch?.id) pitchId = pitch.id;
        }
      } catch {
        // Fallback si no existen hosts o pitches registrados
      }

      const { error: insertError } = await supabase.from('b2b_reservations').insert({
        booking_id: reservation.bookingId,
        user_id: currentUserId,
        host_id: hostId,
        pitch_id: pitchId,
        location_id: request.areaId,
        area_name: request.areaName,
        customer_name: request.customerName,
        customer_email: request.customerEmail,
        customer_phone: request.customerPhone,
        license_plate: reservation.licensePlate,
        vehicle_length_meters: request.vehicleLengthMeters,
        vehicle_height_meters: request.vehicleHeightMeters,
        check_in_date: reservation.checkInDate,
        check_out_date: reservation.checkOutDate,
        number_of_nights: reservation.numberOfNights,
        pitch_type: reservation.pitchType,
        nightly_rate: reservation.nightlyRate,
        base_total: reservation.baseTotal,
        addons_total: reservation.addonsTotal,
        platform_fee: reservation.platformFee,
        taxes_total: reservation.taxesTotal,
        total_amount: reservation.totalAmount,
        selected_addons: request.addons,
        barrier_pin_code: reservation.barrierPinCode,
        qr_access_code: reservation.qrAccessCode,
        status: reservation.status,
      });

      if (insertError) {
        Logger.warn(
          'B2BReservationService',
          'Supabase insert returned error, saved locally in AsyncStorage',
          insertError
        );
      } else {
        Logger.info(
          'B2BReservationService',
          `Reservation ${reservation.bookingId} synced to Supabase successfully`
        );
      }
    } catch (err) {
      Logger.warn(
        'B2BReservationService',
        'Supabase offline / network exception, saved locally in AsyncStorage',
        err
      );
    }

    // Persistencia garantizada en almacenamiento local offline (AsyncStorage)
    this.reservations.unshift(reservation);
    await this.saveReservations();

    return reservation;
  }

  public async getMyReservations(): Promise<B2BReservationResult[]> {
    if (!this.isLoaded) await this.loadReservations();

    try {
      const { data, error } = await supabase
        .from('b2b_reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const remoteReservations: B2BReservationResult[] = data.map((row: any) => ({
          bookingId: row.booking_id,
          status: row.status,
          areaId: row.location_id || '',
          areaName: row.area_name || '',
          checkInDate: row.check_in_date,
          checkOutDate: row.check_out_date,
          numberOfNights: row.number_of_nights,
          pitchType: row.pitch_type,
          licensePlate: row.license_plate,
          nightlyRate: Number(row.nightly_rate) || 0,
          baseTotal: Number(row.base_total) || 0,
          addonsTotal: Number(row.addons_total) || 0,
          platformFee: Number(row.platform_fee) || 0,
          taxesTotal: Number(row.taxes_total) || 0,
          totalAmount: Number(row.total_amount) || 0,
          qrAccessCode: row.qr_access_code,
          barrierPinCode: row.barrier_pin_code,
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        }));

        // Fusionar evitando duplicados
        const localIds = new Set(remoteReservations.map((r) => r.bookingId));
        for (const loc of this.reservations) {
          if (!localIds.has(loc.bookingId)) {
            remoteReservations.push(loc);
          }
        }
        this.reservations = remoteReservations;
        await this.saveReservations();
        return this.reservations;
      }
    } catch (e) {
      Logger.warn('B2BReservationService', 'Failed to fetch reservations from Supabase, returning local', e);
    }

    return [...this.reservations];
  }

  public async cancelReservation(bookingId: string): Promise<boolean> {
    if (!this.isLoaded) await this.loadReservations();
    const idx = this.reservations.findIndex((r) => r.bookingId === bookingId);
    if (idx !== -1) {
      this.reservations.splice(idx, 1);
      await this.saveReservations();

      try {
        await supabase.from('b2b_reservations').delete().eq('booking_id', bookingId);
      } catch (err) {
        Logger.warn('B2BReservationService', 'Failed to delete remote reservation from Supabase', err);
      }

      return true;
    }
    return false;
  }
}

export const b2bReservationService = new B2BReservationServiceImpl();

export function calculateQuote(
  checkInDateOrParams:
    | string
    | {
        checkInDate: string;
        checkOutDate: string;
        pitchType: PitchType;
        selectedAddonIds?: string[];
        addonIds?: string[];
      },
  checkOutDate?: string,
  pitchType?: PitchType,
  addonIds?: string[]
): ReservationQuote {
  return b2bReservationService.calculateQuote(checkInDateOrParams, checkOutDate, pitchType, addonIds);
}
