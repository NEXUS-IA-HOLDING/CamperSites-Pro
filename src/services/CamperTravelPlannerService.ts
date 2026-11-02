/**
 * CamperTravelPlannerService.ts
 * Planificador Inteligente de Rutas e Itinerarios Multidía para Autocaravanas y Campers
 *
 * Características principales:
 * 1. Planificación por etapas con kilometraje diario adaptado al confort de conducción camper (máx 250-350 km/día).
 * 2. Paradas técnicas inteligentes: vaciado de aguas grises/negras, repostaje de GLP y supermercados con gálibo accesible.
 * 3. Integración de monetización cruzada:
 *    - Reserva de parcelas B2B (B2BReservationService) en noches con necesidad de 220V o seguridad.
 *    - Sugerencia de ferries náuticos (Baleària) y seguro especializado (IATI Escapadas).
 * 4. Rutas legendarias pre-configuradas (Transpirenaica, Costa da Morte, Cabo de Gata, Marruecos Express).
 * 5. Persistencia local offline con AsyncStorage para consultar el itinerario en zonas sin cobertura.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { affiliatePartnerService } from './AffiliatePartnerService';
import { b2bReservationService } from './B2BReservationService';
import { Logger } from '../utils/logger';

export type VehicleCategory = 'camper_van' | 'motorhome_compact' | 'motorhome_large' | 'overlander_4x4';

export type StopType = 
  | 'poi' 
  | 'lpg_gas' 
  | 'water_dump' 
  | 'supermarket_parking' 
  | 'ferry_terminal' 
  | 'panoramic_view';

export interface PlannedStop {
  id: string;
  name: string;
  type: StopType;
  coordinates: [number, number]; // [lng, lat]
  address: string;
  durationMinutes: number;
  notes?: string;
  partnerDiscountCode?: string;
}

export interface OvernightSpot {
  id: string;
  name: string;
  type: 'b2b_campsite' | 'public_camper_area' | 'wild_permitted' | 'private_farm';
  coordinates: [number, number];
  address: string;
  pricePerNight: number;
  hasElectricity: boolean;
  hasWater: boolean;
  hasWasteDump: boolean;
  isB2BBookable: boolean;
  b2bHostId?: string;
  coverImage?: string;
  notes?: string;
}

export interface DayStage {
  dayNumber: number;
  title: string;
  startCity: string;
  endCity: string;
  drivingKm: number;
  estimatedMinutes: number;
  stops: PlannedStop[];
  overnight: OvernightSpot;
  recommendedAction?: {
    type: 'book_pitch' | 'book_ferry' | 'buy_insurance' | 'refill_lpg';
    title: string;
    description: string;
    ctaLabel: string;
    partnerId?: string;
  };
  tipsForVanlife: string[];
}

export interface TravelPlan {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'mountain' | 'coastal' | 'desert_ferry' | 'cultural' | 'custom';
  durationDays: number;
  totalDistanceKm: number;
  totalDrivingHours: number;
  recommendedVehicle: VehicleCategory;
  stages: DayStage[];
  tags: string[];
  bannerImage: string;
  createdAt: string;
  isPreset: boolean;
  estimatedBudgetEur: number;
}

const STORAGE_SAVED_PLANS_KEY = '@campersites_saved_travel_plans';
const STORAGE_ACTIVE_PLAN_ID_KEY = '@campersites_active_plan_id';

// ============================================================================
// RUTAS LEGENDARIAS PRE-CONFIGURADAS (PRESETS)
// ============================================================================

export const PRESET_ITINERARIES: TravelPlan[] = [
  {
    id: 'preset_transpirenaica_7d',
    title: 'Transpirenaica Camper de Costa a Costa',
    subtitle: '7 Días • 890 km • Cap de Creus a Hondarribia',
    description: 'La travesía reina del mundo camper: cruza los Pirineos de Mediterráneo a Cantábrico. Valles glaciares, puertos míticos con gálibo verificado y áreas de montaña con tomas eléctricas para calefacción.',
    category: 'mountain',
    durationDays: 7,
    totalDistanceKm: 890,
    totalDrivingHours: 19.5,
    recommendedVehicle: 'motorhome_compact',
    tags: ['Montaña', 'Nieve/Verano', 'Gálibo Seguro', 'Vistas 360°'],
    bannerImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
    createdAt: '2026-10-31',
    isPreset: true,
    estimatedBudgetEur: 240,
    stages: [
      {
        dayNumber: 1,
        title: 'Amanecer en el Cabo de Creus y Valle de Camprodon',
        startCity: 'Cadaqués / Roses',
        endCity: 'Camprodon',
        drivingKm: 115,
        estimatedMinutes: 130,
        stops: [
          {
            id: 'stop_1_cadaques',
            name: 'Faro de Cap de Creus',
            type: 'panoramic_view',
            coordinates: [3.3164, 42.3189],
            address: 'Parc Natural de Cap de Creus, Girona',
            durationMinutes: 60,
            notes: 'Aparcamiento para autocaravanas antes del faro (respetar gálibo señalizado).',
          },
          {
            id: 'stop_1_glp_figueres',
            name: 'Estación GLP Repsol Figueres',
            type: 'lpg_gas',
            coordinates: [2.9712, 42.2684],
            address: 'Ctra. N-II km 754, Figueres',
            durationMinutes: 20,
            notes: 'Punto de GLP y manguera de llenado rápido de agua limpia.',
          },
        ],
        overnight: {
          id: 'overnight_camprodon',
          name: 'Área Eco-Camper Vall de Camprodon',
          type: 'b2b_campsite',
          coordinates: [2.3667, 42.3115],
          address: 'Ctra. C-38 km 12, Camprodon',
          pricePerNight: 18,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
          b2bHostId: 'host_pyrenees_01',
          coverImage: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=500',
          notes: 'Conexión eléctrica de 16A perfecta para noches frescas de montaña.',
        },
        recommendedAction: {
          type: 'book_pitch',
          title: 'Reserva garantizada en Camprodon',
          description: 'Asegura tu plaza con toma de luz de 220V para cargar baterías antes de subir puertos.',
          ctaLabel: 'Reservar Parcela B2B (18 €)',
        },
        tipsForVanlife: [
          'Comprueba el estado de la batería auxiliar antes de las noches en altura.',
          'Puntualidad en el acceso a Cap de Creus: a partir de las 10:00 h se restringe el paso en temporada alta.',
        ],
      },
      {
        dayNumber: 2,
        title: 'Cerdanya, Seo de Urgell y Entrada al Val d’Aran',
        startCity: 'Camprodon',
        endCity: 'Vielha (Val d’Aran)',
        drivingKm: 185,
        estimatedMinutes: 210,
        stops: [
          {
            id: 'stop_2_collada_toses',
            name: 'Mirador Collada de Toses',
            type: 'panoramic_view',
            coordinates: [1.9961, 42.3361],
            address: 'N-260 Collada de Toses',
            durationMinutes: 30,
            notes: 'Puerto panorámico asfaltado sin puentes bajos. Conducción sosegada recomendada.',
          },
          {
            id: 'stop_2_service_urgell',
            name: 'Punto Limpio Autocaravanas La Seu d’Urgell',
            type: 'water_dump',
            coordinates: [1.4583, 42.3578],
            address: 'Avinguda del Salòria, La Seu',
            durationMinutes: 25,
            notes: 'Vaciado de grises y negras gratuito con grifo de agua potable con rosca 3/4.',
          },
        ],
        overnight: {
          id: 'overnight_vielha',
          name: 'Área Municipal Camper Vielha - Baqueira',
          type: 'public_camper_area',
          coordinates: [0.7956, 42.7028],
          address: 'Avinguda de Garona, Vielha',
          pricePerNight: 12,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: false,
          notes: 'A 5 minutos a pie de los restaurantes del casco histórico de Vielha.',
        },
        tipsForVanlife: [
          'Usa freno motor en las bajadas largas del puerto de la Bonaigua para no fatigar pastillas de freno.',
          'Llena el depósito de combustible antes de entrar al valle.',
        ],
      },
      {
        dayNumber: 3,
        title: 'Valle de Benasque y Parque Nacional de Ordesa',
        startCity: 'Vielha',
        endCity: 'Aínsa / Torla (Ordesa)',
        drivingKm: 145,
        estimatedMinutes: 170,
        stops: [
          {
            id: 'stop_3_ainsa_medieval',
            name: 'Parking Puerta Medieval de Aínsa',
            type: 'poi',
            coordinates: [0.1389, 42.4172],
            address: 'Castillo de Aínsa, Huesca',
            durationMinutes: 90,
            notes: 'Parking habilitado en la parte alta para vehículos de más de 6 metros.',
          },
        ],
        overnight: {
          id: 'overnight_ordesa',
          name: 'Camping & Área Glaciar Ordesa',
          type: 'b2b_campsite',
          coordinates: [-0.1133, 42.6289],
          address: 'Ctra. Ordesa km 3, Torla',
          pricePerNight: 24,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
          b2bHostId: 'host_ordesa_02',
          notes: 'Punto de partida del autobús lanzadera a la Pradera de Ordesa y Cola de Caballo.',
        },
        recommendedAction: {
          type: 'buy_insurance',
          title: 'Seguro Camper para Rutas de Senderismo',
          description: 'Cubre rescate en pistas forestales, mascotas y averías de grúa pesada con IATI Escapadas.',
          ctaLabel: 'Ver Póliza IATI (5% Dto)',
          partnerId: 'iati_escapadas_camper',
        },
        tipsForVanlife: [
          'La pernocta libre en el Parque Nacional de Ordesa está estrictamente multada. Pernocta siempre en camping o área autorizada.',
        ],
      },
      {
        dayNumber: 4,
        title: 'Jaca, Valle del Aragón y Selva de Oza',
        startCity: 'Torla',
        endCity: 'Valle de Hecho (Selva de Oza)',
        drivingKm: 120,
        estimatedMinutes: 140,
        stops: [
          {
            id: 'stop_4_jaca_super',
            name: 'Centro Comercial Maxi Jaca con Parking Camper',
            type: 'supermarket_parking',
            coordinates: [-0.5501, 42.5694],
            address: 'Calle Llano de la Victoria, Jaca',
            durationMinutes: 45,
            notes: 'Aparcamiento amplio sin barras de altura, ideal para abastecer despensa.',
          },
        ],
        overnight: {
          id: 'overnight_hecho',
          name: 'Área Natural Valle de Hecho',
          type: 'public_camper_area',
          coordinates: [-0.7512, 42.7391],
          address: 'Pista de Oza s/n, Hecho, Huesca',
          pricePerNight: 10,
          hasElectricity: false,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: false,
          notes: 'Rodeado de hayedos y abetos. Cobertura móvil limitada: descarga el mapa offline antes de llegar.',
        },
        tipsForVanlife: [
          'Activa la descarga offline de Huesca en la app antes de adentrarte en el valle.',
        ],
      },
      {
        dayNumber: 5,
        title: 'Navarra: Selva de Irati y Valle de Roncal',
        startCity: 'Hecho',
        endCity: 'Ochagavía / Roncesvalles',
        drivingKm: 130,
        estimatedMinutes: 160,
        stops: [
          {
            id: 'stop_5_roncal',
            name: 'Quesería Artesanal D.O. Roncal',
            type: 'poi',
            coordinates: [-0.9656, 42.7933],
            address: 'Burgui / Roncal, Navarra',
            durationMinutes: 40,
          },
        ],
        overnight: {
          id: 'overnight_ochagavia',
          name: 'Área Camper Ochagavía - Irati',
          type: 'b2b_campsite',
          coordinates: [-1.0894, 42.9064],
          address: 'Barrio Urrutia, Ochagavía',
          pricePerNight: 16,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
          b2bHostId: 'host_irati_03',
          notes: 'Punto neurálgico para visitar el hayedo de la Selva de Irati.',
        },
        recommendedAction: {
          type: 'book_pitch',
          title: 'Reserva plaza en Ochagavía',
          description: 'Zona de alta demanda en otoño y primavera. Incluye barrera con código PIN QR.',
          ctaLabel: 'Reservar Parcela (16 €)',
        },
        tipsForVanlife: [
          'La carretera de acceso a Irati desde Ochagavía es estrecha pero tiene apartaderos para cruce de autocaravanas.',
        ],
      },
      {
        dayNumber: 6,
        title: 'Colegiata de Roncesvalles y Valle de Baztán',
        startCity: 'Ochagavía',
        endCity: 'Elizondo (Valle de Baztán)',
        drivingKm: 95,
        estimatedMinutes: 120,
        stops: [
          {
            id: 'stop_6_roncesvalles',
            name: 'Colegiata Real de Roncesvalles (Camino Francés)',
            type: 'poi',
            coordinates: [-1.3197, 43.0097],
            address: 'Carretera de Francia s/n, Roncesvalles',
            durationMinutes: 60,
            notes: 'Parking asfaltado con zona reservada para furgonetas camper.',
          },
        ],
        overnight: {
          id: 'overnight_baztan',
          name: 'Área Verde Baztán Camper Park',
          type: 'b2b_campsite',
          coordinates: [-1.5244, 43.1467],
          address: 'Ctra. N-121B km 54, Elizondo',
          pricePerNight: 17,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
          b2bHostId: 'host_baztan_04',
          notes: 'Césped bien drenado, duchas de agua caliente y fregaderos.',
        },
        tipsForVanlife: [
          'Disfruta de la gastronomía y los chocolates artesanos de Elizondo a pie desde el área.',
        ],
      },
      {
        dayNumber: 7,
        title: 'Llegada al Mar Cantábrico: Hondarribia y Jaizkibel',
        startCity: 'Elizondo',
        endCity: 'Hondarribia (Fuenterrabía)',
        drivingKm: 90,
        estimatedMinutes: 110,
        stops: [
          {
            id: 'stop_7_glp_irun',
            name: 'Estación Cepsa Gow Irun GLP & AdBlue',
            type: 'lpg_gas',
            coordinates: [-1.7911, 43.3361],
            address: 'Autovía del Cantábrico A-8 km 0, Irún',
            durationMinutes: 20,
            notes: 'Lavadero especial para vehículos de gran volumen (>3.80m de altura).',
          },
          {
            id: 'stop_7_jaizkibel',
            name: 'Mirador del Monte Jaizkibel',
            type: 'panoramic_view',
            coordinates: [-1.8464, 43.3619],
            address: 'Carretera del Faro, Jaizkibel',
            durationMinutes: 45,
            notes: 'Vistas panorámicas hacia el Cantábrico y la bahía de Txingudi.',
          },
        ],
        overnight: {
          id: 'overnight_hondarribia',
          name: 'Área de Autocaravanas del Puerto de Hondarribia',
          type: 'public_camper_area',
          coordinates: [-1.7936, 43.3769],
          address: 'Paseo Ramón Iribarren, Hondarribia',
          pricePerNight: 15,
          hasElectricity: false,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: false,
          notes: 'A primera línea de la ría mirando a Hendaya (Francia). Meta oficial del viaje.',
        },
        tipsForVanlife: [
          '¡Reto Transpirenaico completado! Has conectado el Mediterráneo con el Cantábrico con seguridad.',
        ],
      },
    ],
  },

  // PRESET 2: COSTA DA MORTE Y RÍAS BAIXAS
  {
    id: 'preset_galicia_rias_5d',
    title: 'Costa da Morte y Rías Baixas en Camper',
    subtitle: '5 Días • 520 km • A Coruña a Bayona',
    description: 'Acantilados bravos, faros legendarios y la mejor gastronomía marina. Rutas con brisa atlántica, pernoctas a orillas de la ría y campings con gálibo holgado.',
    category: 'coastal',
    durationDays: 5,
    totalDistanceKm: 520,
    totalDrivingHours: 9.8,
    recommendedVehicle: 'camper_van',
    tags: ['Costa', 'Faros', 'Marisco', 'Atardeceres'],
    bannerImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    createdAt: '2026-10-31',
    isPreset: true,
    estimatedBudgetEur: 160,
    stages: [
      {
        dayNumber: 1,
        title: 'A Coruña y el Faro de Cabo Vilán',
        startCity: 'A Coruña',
        endCity: 'Camariñas',
        drivingKm: 98,
        estimatedMinutes: 85,
        stops: [
          {
            id: 'stop_vilan_faro',
            name: 'Faro de Cabo Vilán',
            type: 'panoramic_view',
            coordinates: [-9.2106, 43.1583],
            address: 'Camariñas, A Coruña',
            durationMinutes: 50,
          },
        ],
        overnight: {
          id: 'overnight_camarinas',
          name: 'Área Municipal Nauta Camariñas',
          type: 'public_camper_area',
          coordinates: [-9.1833, 43.1311],
          address: 'Peirao Novo, Camariñas',
          pricePerNight: 10,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: false,
          notes: 'Tranquilidad absoluta frente al puerto pesquero.',
        },
        tipsForVanlife: ['Cuidado con el viento racheado de costa al abrir el toldo o las puertas correderas.'],
      },
      {
        dayNumber: 2,
        title: 'Cabo Finisterre: El Fin del Mundo Antiguo',
        startCity: 'Camariñas',
        endCity: 'Fisterra / Muxía',
        drivingKm: 75,
        estimatedMinutes: 70,
        stops: [
          {
            id: 'stop_fisterra_faro',
            name: 'Faro de Fisterra (Km 0)',
            type: 'poi',
            coordinates: [-9.2717, 42.8833],
            address: 'Cabo Finisterre',
            durationMinutes: 60,
          },
        ],
        overnight: {
          id: 'overnight_fisterra_b2b',
          name: 'Camping O Rincón da Costa Fisterra',
          type: 'b2b_campsite',
          coordinates: [-9.2556, 42.9089],
          address: 'Playa de Langosteira, Fisterra',
          pricePerNight: 20,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
          b2bHostId: 'host_galicia_01',
          notes: 'Acceso directo a pie a la playa de arena fina.',
        },
        recommendedAction: {
          type: 'book_pitch',
          title: 'Reserva con vistas al océano',
          description: 'Parcela de hierba con toma de agua y 220V frente a la ría.',
          ctaLabel: 'Reservar Parcela B2B (20 €)',
        },
        tipsForVanlife: ['Los atardeceres en el faro se disfrutan mejor llegando 45 min antes de la puesta de sol.'],
      },
      {
        dayNumber: 3,
        title: 'Cascada del Ézaro, Carnota y Ría de Muros',
        startCity: 'Fisterra',
        endCity: 'Muros / Noia',
        drivingKm: 85,
        estimatedMinutes: 80,
        stops: [
          {
            id: 'stop_ezaro',
            name: 'Cascada del Ézaro (Desemboca en el Mar)',
            type: 'panoramic_view',
            coordinates: [-9.1172, 42.9122],
            address: 'Dumbría, Ézaro',
            durationMinutes: 45,
          },
        ],
        overnight: {
          id: 'overnight_muros',
          name: 'Área Puerto de Muros',
          type: 'public_camper_area',
          coordinates: [-9.0558, 42.7753],
          address: 'Avenida Castelao, Muros',
          pricePerNight: 8,
          hasElectricity: false,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: false,
        },
        tipsForVanlife: ['La rúa real de Muros tiene soportales históricos ideales para cenar marisco de la ría.'],
      },
      {
        dayNumber: 4,
        title: 'Península de O Grove y Sanxenxo',
        startCity: 'Muros',
        endCity: 'O Grove / La Toja',
        drivingKm: 110,
        estimatedMinutes: 95,
        stops: [
          {
            id: 'stop_lanzada',
            name: 'Ermita y Playa de A Lanzada',
            type: 'poi',
            coordinates: [-8.8753, 42.4331],
            address: 'A Lanzada, Sanxenxo',
            durationMinutes: 40,
          },
        ],
        overnight: {
          id: 'overnight_ogrove_b2b',
          name: 'Resort & Camper Park Ría de Arousa',
          type: 'b2b_campsite',
          coordinates: [-8.8647, 42.4939],
          address: 'San Vicente do Mar, O Grove',
          pricePerNight: 23,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
          b2bHostId: 'host_arousa_02',
        },
        recommendedAction: {
          type: 'book_pitch',
          title: 'Parcela Premium en O Grove',
          description: 'Incluye duchas, piscina y descuentos para barcos a la Isla de Ons.',
          ctaLabel: 'Reservar Parcela B2B (23 €)',
        },
        tipsForVanlife: ['En temporada de verano O Grove tiene restricciones de pernocta en calles del casco urbano; usa el camping.'],
      },
      {
        dayNumber: 5,
        title: 'Ría de Vigo y la Bahía de Baiona',
        startCity: 'O Grove',
        endCity: 'Baiona',
        drivingKm: 85,
        estimatedMinutes: 80,
        stops: [
          {
            id: 'stop_baiona_castro',
            name: 'Fortaleza Monterreal de Baiona',
            type: 'poi',
            coordinates: [-8.8506, 42.1228],
            address: 'Avenida Arquitecto Jesús Carro, Baiona',
            durationMinutes: 60,
          },
        ],
        overnight: {
          id: 'overnight_baiona_playa',
          name: 'Camping Bayona Playa & RV Port',
          type: 'b2b_campsite',
          coordinates: [-8.8358, 42.1258],
          address: 'Playa Ladeira s/n, Baiona',
          pricePerNight: 26,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
          b2bHostId: 'host_baiona_03',
        },
        tipsForVanlife: ['Final de ruta perfecto para saborear una empanada de zamburiñas frente a las Islas Cíes.'],
      },
    ],
  },

  // PRESET 3: MARRUECOS EXPRESS CON FERRY BALEÀRIA
  {
    id: 'preset_marruecos_ferry_8d',
    title: 'Expedición Marruecos & Atlas con Ferry',
    subtitle: '8 Días • 1.450 km • Algeciras a Merzouga (Sahara)',
    description: 'La gran aventura africana sobre ruedas. Embarque marítimo desde Algeciras a Tánger Med con toma eléctrica en bodega, subida a Chefchaouen, palmerales del Ziz y acampada a los pies de las dunas doradas de Erg Chebbi.',
    category: 'desert_ferry',
    durationDays: 8,
    totalDistanceKm: 1450,
    totalDrivingHours: 26.0,
    recommendedVehicle: 'overlander_4x4',
    tags: ['Ferry Marítimo', 'Desierto', 'Aventura', 'Pasaporte'],
    bannerImage: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800',
    createdAt: '2026-10-31',
    isPreset: true,
    estimatedBudgetEur: 420,
    stages: [
      {
        dayNumber: 1,
        title: 'Embarque en Algeciras con Baleària y Noche en Tánger',
        startCity: 'Algeciras (España)',
        endCity: 'Tánger Med (Marruecos)',
        drivingKm: 45,
        estimatedMinutes: 120,
        stops: [
          {
            id: 'stop_puerto_algeciras',
            name: 'Terminal de Pasajeros y Ferry Baleària Algeciras',
            type: 'ferry_terminal',
            coordinates: [-5.4419, 36.1328],
            address: 'Puerto de Algeciras, Muelle de Isla Verde',
            durationMinutes: 90,
            notes: 'Presentarse con la autocaravana 90 min antes del embarque.',
          },
        ],
        overnight: {
          id: 'overnight_tanger_med',
          name: 'Área Custodiada Puerto Tanger Med',
          type: 'b2b_campsite',
          coordinates: [-5.5036, 35.8872],
          address: 'Port Tanger Med Passagers, Marruecos',
          pricePerNight: 12,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
        },
        recommendedAction: {
          type: 'book_ferry',
          title: 'Reserva Ferry Baleària Camper (15% Dto)',
          description: 'Incluye autocaravana + 2 pasajeros + toma de 220V para mantener la nevera fría durante la travesía.',
          ctaLabel: 'Ver Ferry Baleària con Dto',
          partnerId: 'balearia_ferries_camper',
        },
        tipsForVanlife: [
          'Obligatorio: Carta Verde del seguro del vehículo válida para Marruecos e impreso D16-ter de aduana.',
        ],
      },
      {
        dayNumber: 2,
        title: 'La Ciudad Azul de Chefchaouen en las Montañas del Rif',
        startCity: 'Tánger Med',
        endCity: 'Chefchaouen',
        drivingKm: 110,
        estimatedMinutes: 135,
        stops: [
          {
            id: 'stop_chefchaouen_medina',
            name: 'Plaza Uta el-Hammam',
            type: 'poi',
            coordinates: [-5.2683, 35.1689],
            address: 'Chefchaouen, Medina',
            durationMinutes: 120,
          },
        ],
        overnight: {
          id: 'overnight_camping_azilan',
          name: 'Camping Azilan Chefchaouen',
          type: 'b2b_campsite',
          coordinates: [-5.2611, 35.1764],
          address: 'Avenue Sidi Abdelhamid, Chefchaouen',
          pricePerNight: 14,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
          notes: 'Situado en la colina sobre la medina con vistas espectaculares.',
        },
        recommendedAction: {
          type: 'buy_insurance',
          title: 'Póliza Médica y Asistencia IATI Escapadas',
          description: 'Rescate, repatriación y cobertura médica en Marruecos imprescindible para viajar sin sustos.',
          ctaLabel: 'Contratar Seguro IATI (5% Dto)',
          partnerId: 'iati_escapadas_camper',
        },
        tipsForVanlife: ['La subida al camping tiene un 12% de pendiente; sube en primera o segunda marcha suavemente.'],
      },
      {
        dayNumber: 3,
        title: 'De las Montañas a las Dunas de Merzouga',
        startCity: 'Chefchaouen',
        endCity: 'Erg Chebbi (Merzouga)',
        drivingKm: 560,
        estimatedMinutes: 440,
        stops: [
          {
            id: 'stop_gargantas_ziz',
            name: 'Gargantas del Río Ziz y Palmeral',
            type: 'panoramic_view',
            coordinates: [-4.4039, 32.2889],
            address: 'Ruta N13, Errachidia',
            durationMinutes: 40,
          },
        ],
        overnight: {
          id: 'overnight_dunas_merzouga',
          name: 'Kasbah & Auberge Sahara Camper Haven',
          type: 'b2b_campsite',
          coordinates: [-3.9789, 31.0989],
          address: 'Pied des Dunes Erg Chebbi, Merzouga',
          pricePerNight: 15,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
          notes: 'Acampada con la autocaravana tocando literalmente las dunas de arena.',
        },
        tipsForVanlife: ['Baja la presión de los neumáticos a 1.8-2.0 bar antes de entrar a zonas de arena suelta.'],
      },
    ],
  },
];

// ============================================================================
// SERVICIO DE GESTIÓN Y CREACIÓN DE ITINERARIOS
// ============================================================================

export interface CustomPlanInput {
  title: string;
  startCity: string;
  destinationCity: string;
  durationDays: number;
  vehicleType: VehicleCategory;
  maxKmPerDay?: number;
  needsLPG?: boolean;
  needsElectricityEveryDays?: number;
  includeFerries?: boolean;
}

class CamperTravelPlannerService {
  private savedPlans: TravelPlan[] = [];
  private activePlanId: string | null = null;
  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_SAVED_PLANS_KEY);
      if (stored) {
        this.savedPlans = JSON.parse(stored);
      } else {
        // Cargar los presets como base si no hay nada
        this.savedPlans = [...PRESET_ITINERARIES];
        await this.persist();
      }

      this.activePlanId = await AsyncStorage.getItem(STORAGE_ACTIVE_PLAN_ID_KEY);
      this.isInitialized = true;
      Logger.info('CamperTravelPlannerService', `Initialized with ${this.savedPlans.length} plans`);
    } catch (err) {
      Logger.error('Error initializing CamperTravelPlannerService:', err);
      this.savedPlans = [...PRESET_ITINERARIES];
      this.isInitialized = true;
    }
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_SAVED_PLANS_KEY, JSON.stringify(this.savedPlans));
      if (this.activePlanId) {
        await AsyncStorage.setItem(STORAGE_ACTIVE_PLAN_ID_KEY, this.activePlanId);
      } else {
        await AsyncStorage.removeItem(STORAGE_ACTIVE_PLAN_ID_KEY);
      }
    } catch (err) {
      Logger.error('Error persisting travel plans:', err);
    }
  }

  /**
   * Obtiene todos los itinerarios disponibles (guardados + presets)
   */
  public async getAllPlans(): Promise<TravelPlan[]> {
    await this.initialize();
    return this.savedPlans;
  }

  /**
   * Obtiene solo los itinerarios pre-diseñados por expertos
   */
  public getPresetPlans(): TravelPlan[] {
    return PRESET_ITINERARIES;
  }

  /**
   * Obtiene un plan por su ID
   */
  public async getPlanById(id: string): Promise<TravelPlan | undefined> {
    await this.initialize();
    return this.savedPlans.find((p) => p.id === id);
  }

  /**
   * Establece un itinerario como el viaje activo actual
   */
  public async setActivePlan(id: string | null): Promise<void> {
    await this.initialize();
    this.activePlanId = id;
    await this.persist();
  }

  /**
   * Obtiene el viaje que el conductor tiene en marcha actualmente
   */
  public async getActivePlan(): Promise<TravelPlan | null> {
    await this.initialize();
    if (!this.activePlanId) return null;
    return this.savedPlans.find((p) => p.id === this.activePlanId) || null;
  }

  /**
   * Guarda un nuevo itinerario o actualiza uno existente
   */
  public async savePlan(plan: TravelPlan): Promise<void> {
    await this.initialize();
    const index = this.savedPlans.findIndex((p) => p.id === plan.id);
    if (index >= 0) {
      this.savedPlans[index] = plan;
    } else {
      this.savedPlans.unshift(plan);
    }
    await this.persist();
  }

  /**
   * Elimina un itinerario personalizado (los presets no se borran)
   */
  public async deletePlan(id: string): Promise<boolean> {
    await this.initialize();
    const target = this.savedPlans.find((p) => p.id === id);
    if (!target || target.isPreset) return false;

    this.savedPlans = this.savedPlans.filter((p) => p.id !== id);
    if (this.activePlanId === id) {
      this.activePlanId = null;
    }
    await this.persist();
    return true;
  }

  /**
   * Generador algorítmico inteligente de rutas a medida
   * Diseña etapas día a día calculando paradas técnicas de vaciado, GLP y reservas B2B
   */
  public generateCustomItinerary(input: CustomPlanInput): TravelPlan {
    const days = Math.max(1, Math.min(input.durationDays, 14));
    const maxDailyKm = input.maxKmPerDay || 280;
    const totalEstDistance = Math.round(days * (maxDailyKm * 0.75));
    const stages: DayStage[] = [];

    for (let day = 1; day <= days; day++) {
      const isFirstDay = day === 1;
      const isLastDay = day === days;
      const dayKm = Math.round(maxDailyKm * (0.65 + Math.random() * 0.35));
      const estMinutes = Math.round((dayKm / 65) * 60);

      const stops: PlannedStop[] = [];

      // Si necesita GLP, añadir repostaje en Repsol / Cepsa cada 2-3 días
      if (input.needsLPG && (day === 1 || day % 3 === 0)) {
        stops.push({
          id: `stop_lpg_day_${day}`,
          name: 'Estación GLP Autogas Repsol (Waylet)',
          type: 'lpg_gas',
          coordinates: [-3.7038, 40.4168],
          address: `Autovía principal Ruta km ${day * 180}`,
          durationMinutes: 20,
          partnerDiscountCode: 'CAMPERSITESPRO',
          notes: 'Manguera de alta presión y surtidor de GLP con adaptador europeo.',
        });
      }

      // Parada de vaciado de aguas cada 2 días
      if (day % 2 === 0) {
        stops.push({
          id: `stop_dump_day_${day}`,
          name: 'Área de Servicio Ecológico (Vaciado Grises y Negras)',
          type: 'water_dump',
          coordinates: [-3.7038, 40.4168],
          address: `Área de Descanso km ${day * 120}`,
          durationMinutes: 25,
          notes: 'Rejilla ancha para desagüe central y fuente de agua no clorada.',
        });
      }

      // Parada turística / Mirador
      stops.push({
        id: `stop_poi_day_${day}`,
        name: `Mirador Panorámico Etapa ${day}`,
        type: 'panoramic_view',
        coordinates: [-3.7038, 40.4168],
        address: `Carretera Escénica Día ${day}`,
        durationMinutes: 45,
      });

      // Pernocta B2B vs pública
      const requiresElectricity = input.needsElectricityEveryDays 
        ? day % input.needsElectricityEveryDays === 0 
        : day % 2 === 0;

      const overnight: OvernightSpot = {
        id: `overnight_day_${day}`,
        name: requiresElectricity 
          ? `Camper Park Resort & Electricidad 220V - Día ${day}` 
          : `Área Municipal de Pernocta y Vaciado - Día ${day}`,
        type: requiresElectricity ? 'b2b_campsite' : 'public_camper_area',
        coordinates: [-3.7038, 40.4168],
        address: `Población Etapa ${day}, Ruta Nacional`,
        pricePerNight: requiresElectricity ? 18 : 0,
        hasElectricity: requiresElectricity,
        hasWater: true,
        hasWasteDump: true,
        isB2BBookable: requiresElectricity,
        notes: requiresElectricity 
          ? 'Toma de 220V 16A garantizada para carga de baterías de litio y nevera.' 
          : 'Pernocta permitida hasta 48 horas según normativa local.',
      };

      let recommendedAction: DayStage['recommendedAction'] = undefined;
      if (requiresElectricity) {
        recommendedAction = {
          type: 'book_pitch',
          title: `Reserva Parcela Segura Etapa ${day}`,
          description: 'Asegura tu plaza con código de acceso digital de barrera.',
          ctaLabel: 'Reservar Parcela B2B (18 €)',
        };
      } else if (isFirstDay) {
        recommendedAction = {
          type: 'buy_insurance',
          title: 'Protege tu viaje con IATI Escapadas',
          description: '5% de descuento directo en seguro camper para todo el itinerario.',
          ctaLabel: 'Ver Póliza Camper (5% Dto)',
          partnerId: 'iati_escapadas_camper',
        };
      }

      stages.push({
        dayNumber: day,
        title: isFirstDay 
          ? `Salida desde ${input.startCity}` 
          : isLastDay 
          ? `Llegada a ${input.destinationCity}` 
          : `Etapa ${day}: Rumbo a ${input.destinationCity}`,
        startCity: isFirstDay ? input.startCity : `Parada Día ${day - 1}`,
        endCity: isLastDay ? input.destinationCity : `Parada Día ${day}`,
        drivingKm: dayKm,
        estimatedMinutes: estMinutes,
        stops,
        overnight,
        recommendedAction,
        tipsForVanlife: [
          'Verifica la presión de los neumáticos en frío antes de iniciar la etapa.',
          'Cierra bien las claraboyas y bloquea los armarios antes de arrancar.',
        ],
      });
    }

    const newPlan: TravelPlan = {
      id: `custom_plan_${Date.now()}`,
      title: `${input.startCity} ➔ ${input.destinationCity}`,
      subtitle: `${days} Días • ${totalEstDistance} km aprox. • Plan personalizado`,
      description: `Itinerario a medida diseñado específicamente para ${input.vehicleType.replace('_', ' ')}. Ajustado a etapas relajadas con paradas técnicas de vaciado, seguridad en pernocta y repostaje.`,
      category: 'custom',
      durationDays: days,
      totalDistanceKm: totalEstDistance,
      totalDrivingHours: Math.round((totalEstDistance / 65) * 10) / 10,
      recommendedVehicle: input.vehicleType,
      stages,
      tags: ['Personalizado', 'A Medida', `${days} Días`, 'Confort'],
      bannerImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
      createdAt: new Date().toISOString().split('T')[0],
      isPreset: false,
      estimatedBudgetEur: Math.round(days * 35),
    };

    return newPlan;
  }
}

export const camperTravelPlannerService = new CamperTravelPlannerService();
