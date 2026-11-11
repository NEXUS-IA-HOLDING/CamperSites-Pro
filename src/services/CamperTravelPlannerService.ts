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

export type VehicleCategory = 'camper_van' | 'campervan' | 'motorhome_compact' | 'motorhome_large' | 'overlander_4x4';

export type StopType = 
  | 'poi' 
  | 'lpg_gas' 
  | 'water_dump' 
  | 'supermarket_parking' 
  | 'ferry_terminal' 
  | 'panoramic_view'
  | 'beach'
  | 'cultural_site'
  | 'nature'
  | 'viewpoint'
  | 'parking';

export interface PlannedStop {
  id: string;
  name: string;
  type: StopType;
  coordinates: [number, number]; // [lng, lat]
  address: string;
  durationMinutes?: number;
  notes?: string;
  partnerDiscountCode?: string;
}

export interface OvernightSpot {
  id: string;
  name: string;
  type: 'b2b_campsite' | 'public_camper_area' | 'wild_permitted' | 'private_farm' | 'free_area';
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
  overnight?: OvernightSpot;
  overnightSpot?: OvernightSpot;
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
  category: 'mountain' | 'coastal' | 'desert_ferry' | 'cultural' | 'cultural_heritage' | 'custom';
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

  // PRESET 4: PICOS DE EUROPA & CANGAS DE ONÍS
  {
    id: 'preset_picos_europa_4d',
    title: 'Picos de Europa & Garganta del Cares',
    subtitle: '4 Días • 320 km • Cangas de Onís, Covadonga y Potes',
    description: 'Imponentes macizos calizos, carreteras panorámicas y lagos glaciares. Incluye pernocta en áreas camper autorizadas y consejos para el paso del Desfiladero de La Hermida.',
    category: 'mountain',
    durationDays: 4,
    totalDistanceKm: 320,
    totalDrivingHours: 7.5,
    recommendedVehicle: 'motorhome_compact',
    tags: ['Montaña', 'Gargantas', 'Queso Cabrales', 'Naturaleza'],
    bannerImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 160,
    stages: [
      {
        dayNumber: 1,
        title: 'Cangas de Onís y Subida a los Lagos de Covadonga',
        startCity: 'Cangas de Onís',
        endCity: 'Covadonga',
        drivingKm: 65,
        estimatedMinutes: 90,
        stops: [
          {
            id: 'stop_cangas_puente',
            name: 'Puente Romano de Cangas de Onís',
            type: 'panoramic_view',
            coordinates: [-5.1278, 43.3512],
            address: 'Cangas de Onís, Asturias',
            notes: 'Cruz de la Victoria suspendida sobre el río Sella.',
          },
        ],
        overnightSpot: {
          id: 'overnight_cangas_area',
          name: 'Área de Autocaravanas Cangas de Onís',
          type: 'free_area',
          coordinates: [-5.1292, 43.3533],
          address: 'Avenida de Covadonga, Cangas de Onís',
          pricePerNight: 0,
          hasElectricity: false,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: false,
        },
        tipsForVanlife: ['En temporada alta el acceso a Lagos de Covadonga en autocaravana está restringido; utiliza el bus lanzadera.'],
      },
    ],
  },

  // PRESET 5: CABO DE GATA & DESIERTO DE TABERNAS
  {
    id: 'preset_cabo_gata_4d',
    title: 'Cabo de Gata & Paraíso Volcánico del Sur',
    subtitle: '4 Días • 280 km • San José, Mónsul y Las Negras',
    description: 'Playas vírgenes de lava fósil, aguas cristalinas y atardeceres dorados en el mayor parque marítimo-terrestre del Mediterráneo.',
    category: 'coastal',
    durationDays: 4,
    totalDistanceKm: 280,
    totalDrivingHours: 6.0,
    recommendedVehicle: 'campervan',
    tags: ['Playas Vírgenes', 'Volcánico', 'Snorkel', 'Reserva'],
    bannerImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 140,
    stages: [
      {
        dayNumber: 1,
        title: 'Llegada a San José y Playas de los Genoveses y Mónsul',
        startCity: 'Almería',
        endCity: 'San José',
        drivingKm: 70,
        estimatedMinutes: 65,
        stops: [
          {
            id: 'stop_monsul_playa',
            name: 'Playa de Mónsul y Duna Fósil',
            type: 'beach',
            coordinates: [-2.1481, 36.7315],
            address: 'Parque Natural Cabo de Gata-Níjar',
            notes: 'Escenario de películas míticas como Indiana Jones.',
          },
        ],
        overnightSpot: {
          id: 'overnight_cabo_gata_camper',
          name: 'Cabo de Gata Camper Park',
          type: 'b2b_campsite',
          coordinates: [-2.2356, 36.8012],
          address: 'Carretera AL-3115 km 7, Cabo de Gata',
          pricePerNight: 14,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
        },
        tipsForVanlife: ['Respeta escrupulosamente la prohibición de pernoctar a pie de playa dentro del Parque Natural para evitar sanciones ambientales.'],
      },
    ],
  },

  // PRESET 6: RUTA VÍA DE LA PLATA (SEVILLA A GIJÓN)
  {
    id: 'preset_ruta_plata_6d',
    title: 'Vía de la Plata: De la Bética al Mar Cantábrico',
    subtitle: '6 Días • 810 km • Sevilla, Mérida, Salamanca y Gijón',
    description: 'La gran calzada romana que atraviesa España de sur a norte. Monumentos romanos, dehesas extremeñas, plazas mayores y sidra asturiana.',
    category: 'cultural_heritage',
    durationDays: 6,
    totalDistanceKm: 810,
    totalDrivingHours: 12.0,
    recommendedVehicle: 'motorhome_large',
    tags: ['Historia', 'Calzada Romana', 'Gastronomía', 'Patrimonio'],
    bannerImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 260,
    stages: [
      {
        dayNumber: 1,
        title: 'Sevilla y Teatro Romano de Mérida',
        startCity: 'Sevilla',
        endCity: 'Mérida',
        drivingKm: 190,
        estimatedMinutes: 125,
        stops: [
          {
            id: 'stop_merida_teatro',
            name: 'Teatro y Anfiteatro Romano de Mérida',
            type: 'cultural_site',
            coordinates: [-6.3382, 38.9158],
            address: 'Mérida, Badajoz',
          },
        ],
        overnightSpot: {
          id: 'overnight_merida_camper',
          name: 'Área Camper Mérida Teatro Romano',
          type: 'b2b_campsite',
          coordinates: [-6.3312, 38.9214],
          address: 'Calle Marco Agripa, Mérida',
          pricePerNight: 12,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
        },
        tipsForVanlife: ['El área de Mérida está vigilada por cámaras las 24 horas y permite ir caminando al conjunto arqueológico.'],
      },
    ],
  },

  // PRESET 7: PUEBLOS BLANCOS DE CÁDIZ & SERRANÍA DE RONDA
  {
    id: 'preset_pueblos_blancos_3d',
    title: 'Pueblos Blancos & Tajo de Ronda',
    subtitle: '3 Días • 240 km • Arcos, Grazalema, Setenil y Ronda',
    description: 'Pueblos encalados colgados en desfiladeros, casas excavadas bajo rocas gigantes en Setenil y el majestuoso Puente Nuevo de Ronda.',
    category: 'mountain',
    durationDays: 3,
    totalDistanceKm: 240,
    totalDrivingHours: 5.5,
    recommendedVehicle: 'motorhome_compact',
    tags: ['Pueblos con Encanto', 'Andalucía', 'Ruta Serrana'],
    bannerImage: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 120,
    stages: [
      {
        dayNumber: 1,
        title: 'Arcos de la Frontera y Grazalema',
        startCity: 'Arcos de la Frontera',
        endCity: 'Grazalema',
        drivingKm: 75,
        estimatedMinutes: 80,
        stops: [
          {
            id: 'stop_setenil_cuevas',
            name: 'Calle Cuevas del Sol en Setenil de las Bodegas',
            type: 'cultural_site',
            coordinates: [-5.1812, 36.8638],
            address: 'Setenil de las Bodegas, Cádiz',
          },
        ],
        overnightSpot: {
          id: 'overnight_ronda_area',
          name: 'Área Autocaravanas La Rondeña',
          type: 'b2b_campsite',
          coordinates: [-5.1589, 36.7512],
          address: 'Carretera Ronda-Campillos, Ronda',
          pricePerNight: 15,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
        },
        tipsForVanlife: ['No entres con autocaravana de más de 6m al casco antiguo de Setenil ni Arcos; aparca en los parkings exteriores señalizados.'],
      },
    ],
  },

  // PRESET 8: COSTA DA MORTE & FAROS DEL FIN DEL MUNDO
  {
    id: 'preset_costa_da_morte_4d',
    title: 'Costa da Morte & Faros del Fin del Mundo',
    subtitle: '4 Días • 310 km • Malpica, Muxía, Fisterra y Ézaro',
    description: 'La costa más salvaje de Europa. Acantilados donde rompe el Atlántico, leyendas de naufragios, el Faro de Finisterre y la única cascada de Europa que cae al mar.',
    category: 'coastal',
    durationDays: 4,
    totalDistanceKm: 310,
    totalDrivingHours: 7.0,
    recommendedVehicle: 'campervan',
    tags: ['Atlántico Salvaje', 'Faros', 'Puesta de Sol', 'Marisco'],
    bannerImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 150,
    stages: [
      {
        dayNumber: 1,
        title: 'Faro de Cabo Vilán y Santuario de Muxía',
        startCity: 'Camariñas',
        endCity: 'Muxía',
        drivingKm: 70,
        estimatedMinutes: 85,
        stops: [
          {
            id: 'stop_faro_vilan',
            name: 'Faro de Cabo Vilán',
            type: 'panoramic_view',
            coordinates: [-9.2104, 43.1578],
            address: 'Camariñas, A Coruña',
          },
        ],
        overnightSpot: {
          id: 'overnight_fisterra_camper',
          name: 'Área Camper Finisterre O Cabalo',
          type: 'b2b_campsite',
          coordinates: [-9.2612, 42.9123],
          address: 'Paseo Marítimo, Fisterra',
          pricePerNight: 12,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
        },
        tipsForVanlife: ['El viento atlántico en los faros puede superar los 80 km/h; orienta el frontal de la furgoneta hacia el viento para mayor estabilidad al dormir.'],
      },
    ],
  },

  // PRESET 9: BARDENAS REALES & DESIERTO DE NAVARRA
  {
    id: 'preset_bardenas_reales_3d',
    title: 'Bardenas Reales: El Cañón de Colorado Español',
    subtitle: '3 Días • 210 km • Tudela, Castildetierra y Olite',
    description: 'Paisaje semidesértico lunar declarado Reserva de la Biosfera. Chimeneas de hadas erosionadas por el cierzo y castillos góticos navarros.',
    category: 'desert_ferry',
    durationDays: 3,
    totalDistanceKm: 210,
    totalDrivingHours: 4.5,
    recommendedVehicle: 'motorhome_compact',
    tags: ['Desierto', 'Paisaje Lunar', 'Fotografía', 'Castillos'],
    bannerImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 110,
    stages: [
      {
        dayNumber: 1,
        title: 'Ruta Perimetral de la Blanca Baja y Castildetierra',
        startCity: 'Arguedas',
        endCity: 'Tudela',
        drivingKm: 85,
        estimatedMinutes: 110,
        stops: [
          {
            id: 'stop_castildetierra',
            name: 'Monolito Natural de Castildetierra',
            type: 'panoramic_view',
            coordinates: [-1.5175, 42.2098],
            address: 'Bardenas Reales, Navarra',
          },
        ],
        overnightSpot: {
          id: 'overnight_arguedas_cuevas',
          name: 'Área Municipal Camper Arguedas (Junto a las Cuevas)',
          type: 'free_area',
          coordinates: [-1.5945, 42.1762],
          address: 'Camino de las Cuevas, Arguedas',
          pricePerNight: 0,
          hasElectricity: false,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: false,
        },
        tipsForVanlife: ['Prohibida la pernocta dentro del Parque Natural de las Bardenas; el área gratuita de Arguedas al pie de las cuevas trogloditas es perfecta.'],
      },
    ],
  },

  // PRESET 10: ALGARVE SALVAJE & COSTA VICENTINA (PORTUGAL)
  {
    id: 'preset_algarve_vicentina_5d',
    title: 'Costa Vicentina & Playas Secretas del Algarve',
    subtitle: '5 Días • 450 km • Sines, Sagres, Lagos y Tavira',
    description: 'El litoral virgen del suroeste alentejano y los acantilados dorados del Algarve. Rutas de surf, pueblos de pescadores y gastronomía atlántica.',
    category: 'coastal',
    durationDays: 5,
    totalDistanceKm: 450,
    totalDrivingHours: 9.0,
    recommendedVehicle: 'campervan',
    tags: ['Portugal', 'Surf', 'Acantilados', 'Puestas de Sol'],
    bannerImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 220,
    stages: [
      {
        dayNumber: 1,
        title: 'Cabo de San Vicente y Fortaleza de Sagres',
        startCity: 'Aljezur',
        endCity: 'Sagres',
        drivingKm: 90,
        estimatedMinutes: 80,
        stops: [
          {
            id: 'stop_cabo_san_vicente',
            name: 'Faro de Cabo de São Vicente',
            type: 'panoramic_view',
            coordinates: [-8.9964, 37.0231],
            address: 'Sagres, Algarve, Portugal',
          },
        ],
        overnightSpot: {
          id: 'overnight_sagres_camper',
          name: 'Área de Serviço para Autocaravanas Sagres',
          type: 'b2b_campsite',
          coordinates: [-8.9345, 37.0125],
          address: 'Sitio das Hortas, Sagres',
          pricePerNight: 13,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
        },
        tipsForVanlife: ['En Portugal la pernocta fuera de áreas ASA autorizadas conlleva multas de la GNR; pernocta siempre en áreas reguladas ASA.'],
      },
    ],
  },

  // PRESET 11: DOLOMITAS & PASOS ALPINOS 3D (ITALIA)
  {
    id: 'preset_dolomitas_alpes_6d',
    title: 'Dolomitas Mágicas: Tre Cime & Paso Stelvio',
    subtitle: '6 Días • 620 km • Bolzano, Cortina, Val Gardena y Stelvio',
    description: 'La cordillera más bella del planeta. Picos de roca rosa al atardecer (Enrosadira), lagos de color esmeralda (Lago di Braies) y curvas míticas.',
    category: 'mountain',
    durationDays: 6,
    totalDistanceKm: 620,
    totalDrivingHours: 14.5,
    recommendedVehicle: 'motorhome_compact',
    tags: ['Alpes', 'Dolomitas', 'Altas Cumbres', 'Pistas Panorámicas'],
    bannerImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 380,
    stages: [
      {
        dayNumber: 1,
        title: 'Bolzano y Val Gardena hacia el Paso Sella',
        startCity: 'Bolzano',
        endCity: 'Ortisei',
        drivingKm: 60,
        estimatedMinutes: 70,
        stops: [
          {
            id: 'stop_passo_sella',
            name: 'Mirador del Passo Sella (2.246m)',
            type: 'panoramic_view',
            coordinates: [11.7583, 46.5083],
            address: 'Passo Sella, Dolomitas, Italia',
          },
        ],
        overnightSpot: {
          id: 'overnight_cortina_camper',
          name: 'Camping Cortina Dolomiti Resort',
          type: 'b2b_campsite',
          coordinates: [12.1389, 46.5245],
          address: 'Via Campo 2, Cortina d\'Ampezzo',
          pricePerNight: 28,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
        },
        tipsForVanlife: ['Revisa los frenos y usa el freno de motor en las bajadas alpinas pronunciadas para evitar el fading del líquido de frenos.'],
      },
    ],
  },

  // PRESET 12: SELVA NEGRA (SCHWARZWALD ALEMANIA)
  {
    id: 'preset_selva_negra_5d',
    title: 'Selva Negra Romántica: Cascadas, Relojes y Bosques',
    subtitle: '5 Días • 480 km • Baden-Baden, Triberg, Titisee y Friburgo',
    description: 'Carreteras de ensueño flanqueadas por abetos centenarios, las cascadas más altas de Alemania en Triberg y el lago alpino de Titisee.',
    category: 'mountain',
    durationDays: 5,
    totalDistanceKm: 480,
    totalDrivingHours: 9.5,
    recommendedVehicle: 'motorhome_large',
    tags: ['Alemania', 'Bosques', 'Cascadas', 'Lagos'],
    bannerImage: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 290,
    stages: [
      {
        dayNumber: 1,
        title: 'Baden-Baden y la Schwarzwaldhochstraße (B500)',
        startCity: 'Baden-Baden',
        endCity: 'Triberg',
        drivingKm: 95,
        estimatedMinutes: 90,
        stops: [
          {
            id: 'stop_triberg_wasserfalle',
            name: 'Cascadas de Triberg y Reloj de Cuco Gigante',
            type: 'panoramic_view',
            coordinates: [8.2322, 48.1306],
            address: 'Triberg, Baden-Württemberg, Alemania',
          },
        ],
        overnightSpot: {
          id: 'overnight_titisee_stellplatz',
          name: 'Wohnmobilstellplatz am Titisee',
          type: 'b2b_campsite',
          coordinates: [8.1567, 47.9012],
          address: 'Neustädter Str., Titisee-Neustadt',
          pricePerNight: 20,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
        },
        tipsForVanlife: ['En Alemania las autocaravanas necesitan el distintivo ambiental verde (Umweltplakette) para entrar en ciudades como Friburgo.'],
      },
    ],
  },

  // PRESET 13: GARROWS Y LAVANDA DE PROVENZA (FRANCIA)
  {
    id: 'preset_provenza_verdon_5d',
    title: 'Provenza en Flor & Gran Cañón del Verdon',
    subtitle: '5 Días • 420 km • Valensole, Verdon y Moustiers',
    description: 'El mayor cañón de Europa con aguas turquesa esmeralda, campos infinitos de lavanda en la meseta de Valensole y pueblos medievales provenzales.',
    category: 'coastal',
    durationDays: 5,
    totalDistanceKm: 420,
    totalDrivingHours: 9.0,
    recommendedVehicle: 'campervan',
    tags: ['Francia', 'Cañón', 'Lavanda', 'Aguas Turquesa'],
    bannerImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 260,
    stages: [
      {
        dayNumber: 1,
        title: 'Ruta de las Gargantas del Verdon y Lago de Sainte-Croix',
        startCity: 'Castellane',
        endCity: 'Moustiers-Sainte-Marie',
        drivingKm: 80,
        estimatedMinutes: 105,
        stops: [
          {
            id: 'stop_point_sublime_verdon',
            name: 'Mirador Point Sublime del Cañón del Verdon',
            type: 'panoramic_view',
            coordinates: [6.3983, 43.7917],
            address: 'Rougon, Gargantas del Verdon, Francia',
          },
        ],
        overnightSpot: {
          id: 'overnight_moustiers_aire',
          name: 'Aire Camping-Car Park Moustiers-Sainte-Marie',
          type: 'b2b_campsite',
          coordinates: [6.2234, 43.8456],
          address: 'Chemin de Saint-Jean, Moustiers',
          pricePerNight: 16,
          hasElectricity: true,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: true,
        },
        tipsForVanlife: ['Los túneles de la Ruta de las Gargantas (Route des Crêtes) tienen un límite de gálibo de 3.4m; extrema precaución con capuchinas altas.'],
      },
    ],
  },

  // PRESET 14: RIBEIRA SACRA & CAÑÓN DEL SIL
  {
    id: 'preset_ribeira_sacra_3d',
    title: 'Ribeira Sacra & Cañones del Sil',
    subtitle: '3 Días • 230 km • Monforte, Parada de Sil y Castro Caldelas',
    description: 'Viñedos en bancales verticales imposibles sobre el río Sil, monasterios románicos escondidos en bosques de castaños y miradores de vértigo.',
    category: 'mountain',
    durationDays: 3,
    totalDistanceKm: 230,
    totalDrivingHours: 5.5,
    recommendedVehicle: 'motorhome_compact',
    tags: ['Cañón Fluvial', 'Viñedos Heroicos', 'Románico', 'Miradores'],
    bannerImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    createdAt: '2026-11-01',
    isPreset: true,
    estimatedBudgetEur: 125,
    stages: [
      {
        dayNumber: 1,
        title: 'Miradores de Parada de Sil y Balcones de Madrid',
        startCity: 'Ourense',
        endCity: 'Parada de Sil',
        drivingKm: 65,
        estimatedMinutes: 75,
        stops: [
          {
            id: 'stop_balcones_madrid',
            name: 'Mirador Balcones de Madrid sobre el Cañón del Sil',
            type: 'panoramic_view',
            coordinates: [-7.5689, 42.3856],
            address: 'Parada de Sil, Ourense',
          },
        ],
        overnightSpot: {
          id: 'overnight_parada_sil_area',
          name: 'Área Municipal Camper Parada de Sil',
          type: 'free_area',
          coordinates: [-7.5712, 42.3823],
          address: 'Rúa do Campo, Parada de Sil',
          pricePerNight: 0,
          hasElectricity: false,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: false,
        },
        tipsForVanlife: ['Las carreteras secundarias de la Ribeira Sacra son estrechas y sinuosas; da preferencia a los autobuses locales en curvas cerradas.'],
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
        // Reconciliar y asegurar que todos los presets estén disponibles
        const existingIds = new Set(this.savedPlans.map(p => p.id));
        let addedNew = false;
        for (const preset of PRESET_ITINERARIES) {
          if (!existingIds.has(preset.id)) {
            this.savedPlans.push(preset);
            addedNew = true;
          }
        }
        if (addedNew) {
          await this.persist();
        }
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
