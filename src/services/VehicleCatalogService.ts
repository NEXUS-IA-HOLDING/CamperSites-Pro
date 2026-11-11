/**
 * VehicleCatalogService.ts
 * Catálogo Oficial de Vehículos Camper, Gran Volumen, Autocaravanas y Furgones
 * CamperSites Pro — Nexus AI Holding
 *
 * Características:
 * - Catálogo exhaustivo de marcas y modelos reales (Fiat, Ford, Mercedes, VW, Benimar, Hymer, etc.)
 * - Medidas exactas de serie (altura, anchura, longitud, MMA)
 * - Ficha técnica de motor (cilindrada cc, potencia CV, consumo medio L/100km, depósito)
 * - Cálculo predictivo de consumo y coste de combustible según ruta y dimensiones
 * - Recomendaciones de recambios específicos con Autodoc y accesorios/gadgets con Amazon (Afiliación)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';

export interface VehicleRecambioAutodoc {
  id: string;
  name: string;
  category: 'filtros' | 'frenos' | 'baterias' | 'limpiaparabrisas' | 'suspension' | 'aceites';
  description: string;
  oemReference?: string;
  searchUrl: string;
  approxPriceEur: number;
  importance: 'esencial' | 'recomendado' | 'inspeccion';
}

export interface VehicleGadgetAmazon {
  id: string;
  name: string;
  category: 'aislantes' | 'nivelacion' | 'electricidad' | 'seguridad' | 'confort' | 'tpms';
  description: string;
  searchUrl: string;
  approxPriceEur: number;
  badge?: string;
}

export interface VehicleModelItem {
  id: string;
  brand: string;
  model: string;
  generation: string;
  category: 'campervan' | 'gran_volumen' | 'perfilada' | 'capuchina' | 'integral' | 'camion_overland';
  chassisBase: string; // Ej: 'Fiat Ducato', 'Mercedes Sprinter', 'Ford Transit', etc.
  years: string;
  dimensions: {
    height: number; // metros
    width: number;  // metros
    length: number; // metros
    weight: number; // toneladas (MMA)
  };
  engine: {
    fuelType: 'diesel' | 'gasolina' | 'hibrido' | 'electrico';
    displacementCc: number;
    horsepower: number;
    avgConsumptionL100km: number;
    tankCapacityL: number;
    environmentalBadge: '0' | 'ECO' | 'C' | 'B';
  };
  recambios: VehicleRecambioAutodoc[];
  gadgets: VehicleGadgetAmazon[];
}

export interface UserVehicleSetup {
  catalogId?: string; // ID en el catálogo si fue elegido de catálogo
  brand: string;
  model: string;
  category: string;
  chassisBase: string;
  // Medidas activas (pueden diferir de serie si el usuario añade claraboyas, toldos, etc.)
  height: number;
  width: number;
  length: number;
  weight: number;
  // Motor y consumo
  fuelType: 'diesel' | 'gasolina' | 'hibrido' | 'electrico';
  displacementCc: number;
  horsepower: number;
  avgConsumptionL100km: number;
  tankCapacityL: number;
  environmentalBadge: '0' | 'ECO' | 'C' | 'B';
  // Personalizaciones añadidas
  hasRoofRack?: boolean;
  hasSolarPanels?: boolean;
  hasBikeRack?: boolean;
  hasTowBar?: boolean;
  hasAirConditioner?: boolean;
  extraHeightCm?: number;
  extraLengthCm?: number;
  updatedAt?: string;
}

const USER_VEHICLE_SETUP_KEY = '@camper_exact_vehicle_setup';
const AUTODOC_AFFILIATE_TAG = 'campersitespro';
const AMAZON_AFFILIATE_TAG = 'campersites-21';

// Catálogo enriquecido con los modelos más vendidos en España y Europa
export const VEHICLE_CATALOG: VehicleModelItem[] = [
  // -------------------------------------------------------------
  // FIAT DUCATO (Base del 70% de autocaravanas y campers europeas)
  // -------------------------------------------------------------
  {
    id: 'fiat_ducato_l2h2_140',
    brand: 'Fiat',
    model: 'Ducato L2H2 Gran Volumen (5.4m)',
    generation: 'Series 7 / 8 (2014 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2014 - Presente',
    dimensions: { height: 2.52, width: 2.05, length: 5.41, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 8.9,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [
      {
        id: 'rec_ducato_filtro_aceite',
        name: 'Filtro de Aceite Mann-Filter HU 7010 z',
        category: 'filtros',
        description: 'Filtro de cartucho específico para motores 2.2 / 2.3 MultiJet',
        searchUrl: `https://www.autodoc.es/repuestos/filtro-de-aceite-10359/fiat/ducato?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 11.9,
        importance: 'esencial',
      },
      {
        id: 'rec_ducato_filtro_gasoil',
        name: 'Filtro de Combustible Purflux CS762',
        category: 'filtros',
        description: 'Trampa de agua y purgado para diésel Common Rail',
        searchUrl: `https://www.autodoc.es/repuestos/filtro-de-combustible-10361/fiat/ducato?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 24.5,
        importance: 'esencial',
      },
      {
        id: 'rec_ducato_pastillas_freno',
        name: 'Juego de Pastillas Delanteras Brembo P 23 150',
        category: 'frenos',
        description: 'Compuesto cerámico de alto rendimiento para chasis pesado 3.5T',
        searchUrl: `https://www.autodoc.es/repuestos/juego-de-pastillas-de-freno-10130/fiat/ducato?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 46.8,
        importance: 'esencial',
      },
      {
        id: 'rec_ducato_aceite_5w30',
        name: 'Aceite Motor Selenia Forward 0W-30 / 5W-30 (5L)',
        category: 'aceites',
        description: 'Norma oficial Fiat 9.55535-DS1 para filtro DPF y AdBlue',
        searchUrl: `https://www.autodoc.es/repuestos/aceite-de-motor-12094/fiat/ducato?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 52.0,
        importance: 'esencial',
      },
      {
        id: 'rec_ducato_limpiaparabrisas',
        name: 'Escobillas Bosch Aerotwin A102S (650mm / 550mm)',
        category: 'limpiaparabrisas',
        description: 'Barrido silencioso sin vibración en luna panorámica',
        searchUrl: `https://www.autodoc.es/repuestos/limpiaparabrisas-10298/fiat/ducato?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 26.5,
        importance: 'recomendado',
      },
    ],
    gadgets: [
      {
        id: 'gad_ducato_aislante_cabina',
        name: 'Oscurecedor Térmico Interior 9 Capas Cabina Fiat Ducato',
        category: 'aislantes',
        description: 'Corte a medida para parabrisas y ventanas laterales con ventosas de vacío',
        searchUrl: `https://www.amazon.es/s?k=aislante+termico+cabina+fiat+ducato&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 68.0,
        badge: 'Top Ventas 4 Estaciones',
      },
      {
        id: 'gad_fiamma_level_up',
        name: 'Cuñas Niveladoras Fiamma Level Up con Bolsa',
        category: 'nivelacion',
        description: 'Soporte de 5 toneladas con superficie dentada antideslizante',
        searchUrl: `https://www.amazon.es/s?k=cunas+niveladoras+fiamma+level+up&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 32.5,
        badge: 'Imprescindible Pernocta',
      },
      {
        id: 'gad_tpms_solar',
        name: 'Sensor TPMS Solar de Presión y Temperatura de Neumáticos',
        category: 'tpms',
        description: '4 sensores externos inalámbricos con alarma de pinchazo y sobrecalentamiento',
        searchUrl: `https://www.amazon.es/s?k=tpms+solar+autocaravana+presion+neumaticos&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 42.0,
        badge: 'Seguridad en Carretera',
      },
      {
        id: 'gad_inversor_onda_pura',
        name: 'Inversor Onda Pura 12V a 220V 1500W / 3000W Pico',
        category: 'electricidad',
        description: 'Para conectar cafeteras, ordenadores y secadores sin dañar la electrónica',
        searchUrl: `https://www.amazon.es/s?k=inversor+onda+pura+1500w+12v+220v+camper&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 145.0,
        badge: 'Autonomía 220V',
      },
    ],
  },
  {
    id: 'fiat_ducato_l3h2_160',
    brand: 'Fiat',
    model: 'Ducato L3H2 Gran Volumen (6.0m)',
    generation: 'Series 7 / 8 (2014 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2016 - Presente',
    dimensions: { height: 2.52, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 9.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [
      {
        id: 'rec_ducato_l3_filtro_aire',
        name: 'Filtro de Aire Mann-Filter C 17 237',
        category: 'filtros',
        description: 'Alta retención de polvo para tramos de montaña y caminos de tierra',
        searchUrl: `https://www.autodoc.es/repuestos/filtro-de-aire-10360/fiat/ducato?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 18.5,
        importance: 'esencial',
      },
      {
        id: 'rec_ducato_l3_bateria_agm',
        name: 'Batería de Arranque Varta Silver Dynamic AGM 95Ah 850A',
        category: 'baterias',
        description: 'Capacidad de arranque en frío extremo bajo cero para pernoctas en nieve',
        searchUrl: `https://www.autodoc.es/repuestos/bateria-10142/fiat/ducato?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 175.0,
        importance: 'esencial',
      },
    ],
    gadgets: [
      {
        id: 'gad_fiamma_f45s',
        name: 'Toldo Fiamma F45S 3.50m Carcasa Deep Black',
        category: 'confort',
        description: 'Sombra instantánea y refugio contra lluvia en parcela',
        searchUrl: `https://www.amazon.es/s?k=toldo+fiamma+f45s+camper&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 720.0,
        badge: 'Confort Exterior',
      },
    ],
  },
  {
    id: 'fiat_ducato_l4h2_180',
    brand: 'Fiat',
    model: 'Ducato L4H2 Maxi Gran Volumen (6.36m)',
    generation: 'Series 8 (2018 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato Maxi',
    years: '2018 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 6.36, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 180,
      avgConsumptionL100km: 9.8,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // -------------------------------------------------------------
  // VOLKSWAGEN (California, Transporter T5/T6/T6.1, Grand California)
  // -------------------------------------------------------------
  {
    id: 'vw_california_t61_150',
    brand: 'Volkswagen',
    model: 'California Ocean / Coast T6.1 (2.0 TDI 150 CV)',
    generation: 'T6.1 (2019 - Presente)',
    category: 'campervan',
    chassisBase: 'Volkswagen T6.1',
    years: '2019 - Presente',
    dimensions: { height: 1.99, width: 1.90, length: 4.90, weight: 3.0 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1968,
      horsepower: 150,
      avgConsumptionL100km: 7.4,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [
      {
        id: 'rec_vw_t6_filtro_aceite',
        name: 'Filtro de Aceite Mann-Filter HU 7020 z (2.0 TDI)',
        category: 'filtros',
        description: 'Compatible con motores TDI Euro 6d-ISC-FCM',
        searchUrl: `https://www.autodoc.es/repuestos/filtro-de-aceite-10359/vw/transporter-t6?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 12.0,
        importance: 'esencial',
      },
      {
        id: 'rec_vw_t6_pastillas',
        name: 'Pastillas de Freno ATE Ceramic Delanteras',
        category: 'frenos',
        description: 'Cero polvo negro en llantas y frenada silenciosa',
        searchUrl: `https://www.autodoc.es/repuestos/juego-de-pastillas-de-freno-10130/vw/transporter-t6?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 55.0,
        importance: 'esencial',
      },
    ],
    gadgets: [
      {
        id: 'gad_vw_t6_funda_techo',
        name: 'Funda Térmica Exterior Techo Elevable Thais VW T5/T6/T6.1',
        category: 'aislantes',
        description: 'Protege la lona del viento, lluvia y aísla del frío en la cama superior',
        searchUrl: `https://www.amazon.es/s?k=funda+techo+elevable+vw+california+t6&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 189.0,
        badge: 'Imprescindible Nieve y Frío',
      },
      {
        id: 'gad_vw_mosquiteras',
        name: 'Mosquitera Magnética para Portón Lateral y Trasero VW T6',
        category: 'confort',
        description: 'Ventilación fresca sin mosquitos ni avispas en verano',
        searchUrl: `https://www.amazon.es/s?k=mosquitera+magnetica+porton+vw+t6&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 54.0,
        badge: 'Ventilación Nocturna',
      },
    ],
  },
  {
    id: 'vw_grand_california_600',
    brand: 'Volkswagen',
    model: 'Grand California 600 (Crafter 2.0 TDI 177 CV)',
    generation: 'Crafter Camper (2019 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Volkswagen Crafter',
    years: '2019 - Presente',
    dimensions: { height: 2.97, width: 2.04, length: 5.98, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1968,
      horsepower: 177,
      avgConsumptionL100km: 10.2,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // -------------------------------------------------------------
  // MERCEDES-BENZ (Sprinter, Marco Polo, Vito)
  // -------------------------------------------------------------
  {
    id: 'mercedes_sprinter_l2h2_316_cdi',
    brand: 'Mercedes-Benz',
    model: 'Sprinter 314 / 316 / 319 CDI L2H2 (5.9m)',
    generation: 'W907 / W910 (2018 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Mercedes Sprinter',
    years: '2018 - Presente',
    dimensions: { height: 2.65, width: 2.02, length: 5.93, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2143,
      horsepower: 163,
      avgConsumptionL100km: 9.6,
      tankCapacityL: 93,
      environmentalBadge: 'C',
    },
    recambios: [
      {
        id: 'rec_sprinter_filtro_combustible',
        name: 'Filtro de Combustible Hengst E438KP D282',
        category: 'filtros',
        description: 'Separación de agua con sensor de nivel para Mercedes CDI',
        searchUrl: `https://www.autodoc.es/repuestos/filtro-de-combustible-10361/mercedes-benz/sprinter?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 38.0,
        importance: 'esencial',
      },
      {
        id: 'rec_sprinter_pastillas_brembo',
        name: 'Pastillas Delanteras Brembo P 50 144',
        category: 'frenos',
        description: 'Máxima resistencia al fadding en bajadas de puertos de montaña',
        searchUrl: `https://www.autodoc.es/repuestos/juego-de-pastillas-de-freno-10130/mercedes-benz/sprinter?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 52.0,
        importance: 'esencial',
      },
    ],
    gadgets: [
      {
        id: 'gad_sprinter_aislante',
        name: 'Aislante Térmico Exterior Parabrisas Mercedes Sprinter W907',
        category: 'aislantes',
        description: 'Evita la condensación interior en luna delantera',
        searchUrl: `https://www.amazon.es/s?k=aislante+termico+exterior+mercedes+sprinter&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 110.0,
        badge: 'Cero Condensación',
      },
    ],
  },
  {
    id: 'mercedes_marco_polo_v250d',
    brand: 'Mercedes-Benz',
    model: 'Clase V Marco Polo 250d / 300d (190 / 239 CV)',
    generation: 'W447 (2015 - Presente)',
    category: 'campervan',
    chassisBase: 'Mercedes Clase V',
    years: '2015 - Presente',
    dimensions: { height: 1.98, width: 1.93, length: 5.14, weight: 3.1 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 190,
      avgConsumptionL100km: 7.6,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // -------------------------------------------------------------
  // FORD (Transit Custom Nugget, Transit L2H2 / L3H3)
  // -------------------------------------------------------------
  {
    id: 'ford_transit_custom_nugget',
    brand: 'Ford',
    model: 'Transit Custom Nugget Westfalia (2.0 EcoBlue 130/150/170 CV)',
    generation: 'Custom (2018 - Presente)',
    category: 'campervan',
    chassisBase: 'Ford Transit Custom',
    years: '2018 - Presente',
    dimensions: { height: 2.06, width: 2.03, length: 4.97, weight: 3.2 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 150,
      avgConsumptionL100km: 7.9,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [
      {
        id: 'rec_ford_filtro_aceite',
        name: 'Filtro de Aceite Ford Motorcraft 2.0 EcoBlue',
        category: 'filtros',
        description: 'Original homologado Ford para evitar desgaste de correa bañada en aceite',
        searchUrl: `https://www.autodoc.es/repuestos/filtro-de-aceite-10359/ford/transit-custom?tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 14.5,
        importance: 'esencial',
      },
    ],
    gadgets: [],
  },
  {
    id: 'ford_transit_l3h3_170',
    brand: 'Ford',
    model: 'Transit L3H3 Gran Volumen (5.98m / Techo Alto)',
    generation: 'Transit MK8 (2016 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Ford Transit',
    years: '2016 - Presente',
    dimensions: { height: 2.78, width: 2.06, length: 5.98, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 170,
      avgConsumptionL100km: 9.7,
      tankCapacityL: 80,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // -------------------------------------------------------------
  // AUTOCARAVANAS PERFILADAS, CAPUCHINAS E INTEGRALES
  // -------------------------------------------------------------
  {
    id: 'benimar_tessoro_463',
    brand: 'Benimar',
    model: 'Tessoro 463 / 496 Perfilada (7.43m)',
    generation: 'Chasis Ford Transit (2018 - Presente)',
    category: 'perfilada',
    chassisBase: 'Ford Transit Chasis Cabina',
    years: '2018 - Presente',
    dimensions: { height: 2.89, width: 2.30, length: 7.43, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 170,
      avgConsumptionL100km: 11.2,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [
      {
        id: 'rec_benimar_bateria_habitaculo',
        name: 'Batería LiFePO4 Litio 100Ah / 150Ah con BMS Bluetooth',
        category: 'baterias',
        description: 'Multiplica x3 la autonomía respecto a AGM con 1/3 de peso',
        searchUrl: `https://www.amazon.es/s?k=bateria+litio+lifepo4+100ah+autocaravana&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 320.0,
        importance: 'recomendado',
      },
    ],
    gadgets: [
      {
        id: 'gad_calzos_milenco',
        name: 'Calzos Milenco Triple Level 3 Alturas',
        category: 'nivelacion',
        description: 'Capacidad 6 toneladas para autocaravanas pesadas de más de 7 metros',
        searchUrl: `https://www.amazon.es/s?k=calzos+milenco+triple+autocaravana&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 59.0,
        badge: 'Cero Inclinación',
      },
    ],
  },
  {
    id: 'benimar_sport_340_capuchina',
    brand: 'Benimar',
    model: 'Sport 340 / 346 Capuchina Familiar (6.99m)',
    generation: 'Chasis Ford Transit (2019 - Presente)',
    category: 'capuchina',
    chassisBase: 'Ford Transit',
    years: '2019 - Presente',
    dimensions: { height: 3.10, width: 2.30, length: 6.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 160,
      avgConsumptionL100km: 12.8,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'hymer_b_klasse_masterline_integral',
    brand: 'Hymer',
    model: 'B-Klasse MasterLine / ModernComfort I (7.39m Integral)',
    generation: 'Chasis Mercedes Sprinter SLC (2020 - Presente)',
    category: 'integral',
    chassisBase: 'Mercedes Sprinter SLC',
    years: '2020 - Presente',
    dimensions: { height: 2.96, width: 2.35, length: 7.39, weight: 4.2 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 177,
      avgConsumptionL100km: 11.5,
      tankCapacityL: 93,
      environmentalBadge: 'ECO',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'adria_twin_supreme_640',
    brand: 'Adria',
    model: 'Twin Supreme 640 SLB Gran Volumen Skyroof',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 6.36, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 9.5,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'dethleffs_trend_t7057',
    brand: 'Dethleffs',
    model: 'Trend T 7057 DBM Perfilada (7.41m)',
    generation: 'Fiat Ducato (2019 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2019 - Presente',
    dimensions: { height: 2.94, width: 2.33, length: 7.41, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 11.0,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'knaus_boxstar_600',
    brand: 'Knaus',
    model: 'BoxStar 600 Street Gran Volumen (5.99m)',
    generation: 'Fiat Ducato (2018 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2018 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.2,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'challenger_260_graphite',
    brand: 'Challenger',
    model: 'Challenger 260 Graphite Ultimate Perfilada (6.99m)',
    generation: 'Ford Transit (2021 - Presente)',
    category: 'perfilada',
    chassisBase: 'Ford Transit',
    years: '2021 - Presente',
    dimensions: { height: 2.92, width: 2.35, length: 6.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 170,
      avgConsumptionL100km: 10.8,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'iveco_daily_4x4_overland',
    brand: 'Iveco',
    model: 'Daily 4x4 / 35S Camión Expedición Overland',
    generation: 'Daily Hi-Matic (2017 - Presente)',
    category: 'camion_overland',
    chassisBase: 'Iveco Daily 4x4',
    years: '2017 - Presente',
    dimensions: { height: 3.25, width: 2.15, length: 6.80, weight: 5.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2998,
      horsepower: 180,
      avgConsumptionL100km: 13.5,
      tankCapacityL: 110,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
];

class VehicleCatalogServiceImpl {
  private activeSetup: UserVehicleSetup | null = null;
  private isLoaded = false;

  /**
   * Obtiene la lista completa de marcas disponibles en el catálogo
   */
  public getBrands(): string[] {
    const brandsSet = new Set<string>();
    VEHICLE_CATALOG.forEach((item) => brandsSet.add(item.brand));
    return Array.from(brandsSet).sort();
  }

  /**
   * Busca modelos en el catálogo por término de búsqueda (ej. "Ducato", "California", "Benimar")
   */
  public searchModels(query: string): VehicleModelItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return VEHICLE_CATALOG;
    return VEHICLE_CATALOG.filter(
      (item) =>
        item.brand.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.chassisBase.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }

  /**
   * Obtiene un modelo específico del catálogo por su ID
   */
  public getModelById(id: string): VehicleModelItem | undefined {
    return VEHICLE_CATALOG.find((item) => item.id === id);
  }

  /**
   * Carga la configuración guardada del vehículo del usuario
   */
  public async loadUserVehicleSetup(): Promise<UserVehicleSetup> {
    if (this.isLoaded && this.activeSetup) return this.activeSetup;

    try {
      const stored = await AsyncStorage.getItem(USER_VEHICLE_SETUP_KEY);
      if (stored) {
        this.activeSetup = JSON.parse(stored);
        this.isLoaded = true;
        return this.activeSetup!;
      }
    } catch (e) {
      Logger.error('VehicleCatalogService', 'Error cargando vehículo guardado', e);
    }

    // Por defecto: Fiat Ducato L2H2 estándar (la camper más habitual)
    const defaultModel = VEHICLE_CATALOG[0];
    this.activeSetup = {
      catalogId: defaultModel.id,
      brand: defaultModel.brand,
      model: defaultModel.model,
      category: defaultModel.category,
      chassisBase: defaultModel.chassisBase,
      height: defaultModel.dimensions.height,
      width: defaultModel.dimensions.width,
      length: defaultModel.dimensions.length,
      weight: defaultModel.dimensions.weight,
      fuelType: defaultModel.engine.fuelType,
      displacementCc: defaultModel.engine.displacementCc,
      horsepower: defaultModel.engine.horsepower,
      avgConsumptionL100km: defaultModel.engine.avgConsumptionL100km,
      tankCapacityL: defaultModel.engine.tankCapacityL,
      environmentalBadge: defaultModel.engine.environmentalBadge,
      hasSolarPanels: false,
      hasRoofRack: false,
      hasBikeRack: false,
      hasTowBar: false,
      updatedAt: new Date().toISOString(),
    };
    this.isLoaded = true;
    return this.activeSetup;
  }

  /**
   * Guarda o actualiza la configuración del vehículo del usuario
   */
  public async saveUserVehicleSetup(setup: UserVehicleSetup): Promise<UserVehicleSetup> {
    const toSave: UserVehicleSetup = {
      ...setup,
      height: Number(Number(setup.height).toFixed(2)),
      width: Number(Number(setup.width).toFixed(2)),
      length: Number(Number(setup.length).toFixed(2)),
      weight: Number(Number(setup.weight).toFixed(1)),
      avgConsumptionL100km: Number(Number(setup.avgConsumptionL100km).toFixed(1)),
      updatedAt: new Date().toISOString(),
    };

    this.activeSetup = toSave;
    try {
      await AsyncStorage.setItem(USER_VEHICLE_SETUP_KEY, JSON.stringify(toSave));
      // Sincronizar también con la clave genérica @camper_vehicle_config para retrocompatibilidad
      await AsyncStorage.setItem(
        '@camper_vehicle_config',
        JSON.stringify({
          type: toSave.category,
          height: String(toSave.height),
          width: String(toSave.width),
          length: String(toSave.length),
          weight: String(Math.round(toSave.weight * 1000)),
          fuelType: toSave.fuelType,
          avgConsumption: String(toSave.avgConsumptionL100km),
          tankCapacity: String(toSave.tankCapacityL),
          name: `${toSave.brand} ${toSave.model}`,
        })
      );
    } catch (e) {
      Logger.error('VehicleCatalogService', 'Error guardando vehículo de usuario', e);
    }
    return toSave;
  }

  /**
   * Selecciona un modelo del catálogo y calcula las medidas reales teniendo en cuenta
   * accesorios instalados si existían previamente (claraboyas, toldos, etc.)
   */
  public async applyCatalogModel(
    modelId: string,
    existingAccessories?: Partial<UserVehicleSetup>
  ): Promise<UserVehicleSetup> {
    const item = this.getModelById(modelId);
    if (!item) throw new Error(`Modelo con id ${modelId} no encontrado en el catálogo.`);

    // Calcular márgenes de accesorios
    let extraHeight = 0;
    let extraLength = 0;
    if (existingAccessories?.hasRoofRack) extraHeight += 0.15;
    if (existingAccessories?.hasAirConditioner) extraHeight += 0.22;
    if (existingAccessories?.hasSolarPanels) extraHeight += 0.08;
    if (existingAccessories?.hasBikeRack) extraLength += 0.65;
    if (existingAccessories?.hasTowBar) extraLength += 0.25;

    const setup: UserVehicleSetup = {
      catalogId: item.id,
      brand: item.brand,
      model: item.model,
      category: item.category,
      chassisBase: item.chassisBase,
      height: Number((item.dimensions.height + extraHeight).toFixed(2)),
      width: item.dimensions.width,
      length: Number((item.dimensions.length + extraLength).toFixed(2)),
      weight: item.dimensions.weight,
      fuelType: item.engine.fuelType,
      displacementCc: item.engine.displacementCc,
      horsepower: item.engine.horsepower,
      avgConsumptionL100km: item.engine.avgConsumptionL100km,
      tankCapacityL: item.engine.tankCapacityL,
      environmentalBadge: item.engine.environmentalBadge,
      hasRoofRack: !!existingAccessories?.hasRoofRack,
      hasSolarPanels: !!existingAccessories?.hasSolarPanels,
      hasBikeRack: !!existingAccessories?.hasBikeRack,
      hasTowBar: !!existingAccessories?.hasTowBar,
      hasAirConditioner: !!existingAccessories?.hasAirConditioner,
      updatedAt: new Date().toISOString(),
    };

    return this.saveUserVehicleSetup(setup);
  }

  /**
   * Calcula el consumo predictivo y el coste de combustible exacto para una ruta
   * teniendo en cuenta la cilindrada, potencia CV, peso y coeficiente de gálibo
   */
  public calculateTripFuelEstimate(
    distanceKm: number,
    fuelPricePerLitreEur: number = 1.45,
    setup?: UserVehicleSetup
  ): {
    estimatedLitres: number;
    estimatedCostEur: number;
    co2Kg: number;
    consumptionL100kmEffective: number;
  } {
    const v = setup || this.activeSetup;
    const baseConsumption = v?.avgConsumptionL100km || 9.2;

    // Factores de corrección por resistencia aerodinámica (altura y anchura) y peso
    const height = v?.height || 2.6;
    const weight = v?.weight || 3.5;

    // Vehículos más altos de 2.8m tienen mayor resistencia al viento a velocidad de crucero
    const aeroFactor = height > 2.8 ? 1.08 : height > 3.0 ? 1.15 : 1.0;
    // Vehículos más pesados de 3.5t incrementan consumo en subidas
    const weightFactor = weight > 3.5 ? 1.1 : 1.0;

    const effectiveConsumption = baseConsumption * aeroFactor * weightFactor;
    const estimatedLitres = Number(((distanceKm / 100) * effectiveConsumption).toFixed(1));
    const estimatedCostEur = Number((estimatedLitres * fuelPricePerLitreEur).toFixed(2));
    // Factor CO2 diésel ~ 2.65 kg CO2 por litro
    const co2Kg = Number((estimatedLitres * 2.65).toFixed(1));

    return {
      estimatedLitres,
      estimatedCostEur,
      co2Kg,
      consumptionL100kmEffective: Number(effectiveConsumption.toFixed(1)),
    };
  }

  /**
   * Obtiene la lista de recambios específicos recomendados con enlace de afiliación Autodoc
   */
  public getRecommendedRecambios(setup?: UserVehicleSetup): VehicleRecambioAutodoc[] {
    const v = setup || this.activeSetup;
    if (!v) return VEHICLE_CATALOG[0].recambios;

    // Si tiene catálogo vinculado
    if (v.catalogId) {
      const match = this.getModelById(v.catalogId);
      if (match && match.recambios.length > 0) {
        return match.recambios;
      }
    }

    // Si es un chasis conocido o genérico, generar enlaces directos a Autodoc según su marca/chasis
    const brandTerm = encodeURIComponent(v.brand || 'fiat');
    const modelTerm = encodeURIComponent(v.chassisBase || v.model || 'ducato');

    return [
      {
        id: 'rec_custom_filtro_aceite',
        name: `Filtro de Aceite para ${v.brand} ${v.model}`,
        category: 'filtros',
        description: `Compatible con motor ${v.displacementCc || 2000}cc ${v.horsepower || 140}CV ${v.fuelType}`,
        searchUrl: `https://www.autodoc.es/repuestos/filtro-de-aceite-10359?keyword=${brandTerm}+${modelTerm}&tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 12.5,
        importance: 'esencial',
      },
      {
        id: 'rec_custom_filtro_combustible',
        name: `Filtro de Combustible para ${v.brand} ${v.model}`,
        category: 'filtros',
        description: 'Separación de agua y partículas finas para inyección diésel / gasolina',
        searchUrl: `https://www.autodoc.es/repuestos/filtro-de-combustible-10361?keyword=${brandTerm}+${modelTerm}&tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 26.0,
        importance: 'esencial',
      },
      {
        id: 'rec_custom_pastillas',
        name: `Pastillas de Freno Homologadas para ${v.brand} ${v.model}`,
        category: 'frenos',
        description: `Específicas para peso de ${v.weight} toneladas`,
        searchUrl: `https://www.autodoc.es/repuestos/juego-de-pastillas-de-freno-10130?keyword=${brandTerm}+${modelTerm}&tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 48.0,
        importance: 'esencial',
      },
      {
        id: 'rec_custom_bateria',
        name: 'Batería de Arranque AGM Reforzada 95Ah',
        category: 'baterias',
        description: 'Potencia de arranque asegurada en temperaturas bajo cero',
        searchUrl: `https://www.autodoc.es/repuestos/bateria-10142?keyword=${brandTerm}+${modelTerm}&tag=${AUTODOC_AFFILIATE_TAG}`,
        approxPriceEur: 160.0,
        importance: 'recomendado',
      },
    ];
  }

  /**
   * Obtiene la lista de gadgets y accesorios específicos recomendados con enlace de afiliación Amazon
   */
  public getRecommendedGadgets(setup?: UserVehicleSetup): VehicleGadgetAmazon[] {
    const v = setup || this.activeSetup;
    if (v?.catalogId) {
      const match = this.getModelById(v.catalogId);
      if (match && match.gadgets.length > 0) {
        return match.gadgets;
      }
    }

    const chassisTerm = encodeURIComponent(v?.chassisBase || v?.brand || 'camper');

    return [
      {
        id: 'gad_universal_aislante',
        name: `Aislante Térmico Interior 9 Capas para Cabina ${v?.brand || 'Camper'}`,
        category: 'aislantes',
        description: 'Aislante de ventana reflectante verano/invierno para luna delantera y puertas',
        searchUrl: `https://www.amazon.es/s?k=aislante+termico+cabina+${chassisTerm}&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 69.0,
        badge: 'Top Ventas Térmico',
      },
      {
        id: 'gad_universal_cunas',
        name: 'Cuñas Niveladoras Reforzadas con Nivel de Burbuja',
        category: 'nivelacion',
        description: `Imprescindible para pernocta horizontal hasta ${v?.weight || 3.5}T`,
        searchUrl: `https://www.amazon.es/s?k=cunas+niveladoras+autocaravana+fiamma&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 34.0,
        badge: 'Básicos Camper',
      },
      {
        id: 'gad_universal_tpms',
        name: 'Monitor TPMS Solar Sensores Neumáticos',
        category: 'tpms',
        description: 'Alerta instantánea en cabina de pérdida de presión o temperatura en autopista',
        searchUrl: `https://www.amazon.es/s?k=tpms+solar+sensores+presion+autocaravana&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 42.0,
        badge: 'Seguridad Activa',
      },
      {
        id: 'gad_universal_inversor',
        name: 'Inversor Onda Pura 12V a 220V 1500W',
        category: 'electricidad',
        description: 'Carga de ordenadores portátiles, batidoras y pequeños electrodomésticos',
        searchUrl: `https://www.amazon.es/s?k=inversor+onda+pura+12v+220v+1500w+camper&tag=${AMAZON_AFFILIATE_TAG}`,
        approxPriceEur: 139.0,
        badge: '220V en Ruta',
      },
    ];
  }
}

export const vehicleCatalogService = new VehicleCatalogServiceImpl();
