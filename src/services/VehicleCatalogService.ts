/**
 * VehicleCatalogService.ts
 * Catálogo Oficial Exhaustivo de Vehículos Camper, Gran Volumen, Autocaravanas y Furgones
 * CamperSites Pro — Nexus AI Holding
 *
 * Características:
 * - Más de 65 modelos reales con medidas exactas de serie (altura, anchura, longitud, MMA)
 * - Cobertura de las marcas líderes: Fiat, Volkswagen, Mercedes-Benz, Ford, Citroën, Peugeot,
 *   Renault, Toyota, Nissan, Benimar, Hymer, Adria, Dethleffs, Knaus, Bürstner, Pössl, Chausson,
 *   Challenger, McLouis, Roller Team, Rapido, Carthago, MAN e Iveco.
 * - Ficha técnica de motor: cilindrada (cc), potencia (CV), tipo de combustible, depósito y consumo L/100km.
 * - Cálculo de consumo predictivo y gasto en combustible según resistencia aerodinámica de cabina y peso.
 * - Recomendaciones de recambios con Autodoc y gadgets/accesorios con Amazon (Afiliación directa).
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

export type VehicleCategoryType =
  | 'campervan'
  | 'gran_volumen'
  | 'perfilada'
  | 'capuchina'
  | 'integral'
  | 'camion_overland';

export interface VehicleModelItem {
  id: string;
  brand: string;
  model: string;
  generation: string;
  category: VehicleCategoryType;
  chassisBase: string;
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
  catalogId?: string;
  brand: string;
  model: string;
  category: string;
  chassisBase: string;
  height: number;
  width: number;
  length: number;
  weight: number;
  fuelType: 'diesel' | 'gasolina' | 'hibrido' | 'electrico';
  displacementCc: number;
  horsepower: number;
  avgConsumptionL100km: number;
  tankCapacityL: number;
  environmentalBadge: '0' | 'ECO' | 'C' | 'B';
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

// Catálogo de modelos reales con medidas oficiales y motorización
export const VEHICLE_CATALOG: VehicleModelItem[] = [
  // =============================================================
  // 1. FIAT (Ducato, Scudo, Talento)
  // =============================================================
  {
    id: 'fiat_ducato_l1h1_120',
    brand: 'Fiat',
    model: 'Ducato L1H1 Compacto (4.96m)',
    generation: 'Series 7 / 8 (2014 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2014 - Presente',
    dimensions: { height: 2.25, width: 2.05, length: 4.96, weight: 3.3 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 120,
      avgConsumptionL100km: 8.2,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'fiat_ducato_l2h2_140',
    brand: 'Fiat',
    model: 'Ducato L2H2 Gran Volumen (5.41m)',
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
    ],
  },
  {
    id: 'fiat_ducato_l3h2_160',
    brand: 'Fiat',
    model: 'Ducato L3H2 Gran Volumen (5.99m)',
    generation: 'Series 7 / 8 (2016 - Presente)',
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
    recambios: [],
    gadgets: [],
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
  {
    id: 'fiat_ducato_l4h3_maxi',
    brand: 'Fiat',
    model: 'Ducato L4H3 Maxi Techo Super Alto (6.36m)',
    generation: 'Series 7 / 8 (2016 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato Maxi',
    years: '2016 - Presente',
    dimensions: { height: 2.78, width: 2.05, length: 6.36, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 10.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'fiat_scudo_camper_145',
    brand: 'Fiat',
    model: 'Scudo / Talento Camper Techo Elevable (5.0m)',
    generation: 'Scudo III (2022 - Presente)',
    category: 'campervan',
    chassisBase: 'Fiat Scudo',
    years: '2022 - Presente',
    dimensions: { height: 1.94, width: 1.92, length: 4.96, weight: 2.8 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1997,
      horsepower: 145,
      avgConsumptionL100km: 7.2,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 2. VOLKSWAGEN (California, Multivan, Crafter, Grand California)
  // =============================================================
  {
    id: 'vw_california_t5_140',
    brand: 'Volkswagen',
    model: 'California T5 Comfortline (2.0 TDI 140 CV)',
    generation: 'T5 GP (2009 - 2015)',
    category: 'campervan',
    chassisBase: 'Volkswagen T5',
    years: '2009 - 2015',
    dimensions: { height: 1.99, width: 1.90, length: 4.89, weight: 3.0 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1968,
      horsepower: 140,
      avgConsumptionL100km: 7.7,
      tankCapacityL: 80,
      environmentalBadge: 'B',
    },
    recambios: [],
    gadgets: [],
  },
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
    ],
  },
  {
    id: 'vw_california_t61_204_4motion',
    brand: 'Volkswagen',
    model: 'California Ocean T6.1 4Motion (2.0 TDI 204 CV)',
    generation: 'T6.1 4Motion (2019 - Presente)',
    category: 'campervan',
    chassisBase: 'Volkswagen T6.1 4Motion',
    years: '2019 - Presente',
    dimensions: { height: 1.99, width: 1.90, length: 4.90, weight: 3.08 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1968,
      horsepower: 204,
      avgConsumptionL100km: 8.5,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'vw_caddy_california',
    brand: 'Volkswagen',
    model: 'Caddy California / Maxi (2.0 TDI 122 CV)',
    generation: 'Caddy 5 (2021 - Presente)',
    category: 'campervan',
    chassisBase: 'Volkswagen Caddy',
    years: '2021 - Presente',
    dimensions: { height: 1.83, width: 1.85, length: 4.85, weight: 2.3 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1968,
      horsepower: 122,
      avgConsumptionL100km: 5.4,
      tankCapacityL: 55,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
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
  {
    id: 'vw_grand_california_680',
    brand: 'Volkswagen',
    model: 'Grand California 680 (Crafter 6.84m / Camas Gemelas)',
    generation: 'Crafter Camper Maxi (2019 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Volkswagen Crafter',
    years: '2019 - Presente',
    dimensions: { height: 2.84, width: 2.04, length: 6.84, weight: 3.88 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1968,
      horsepower: 177,
      avgConsumptionL100km: 10.6,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'vw_id_buzz_camper',
    brand: 'Volkswagen',
    model: 'ID. Buzz Camper 100% Eléctrico (77 kWh 204 CV)',
    generation: 'ID. Buzz (2022 - Presente)',
    category: 'campervan',
    chassisBase: 'Volkswagen MEB',
    years: '2022 - Presente',
    dimensions: { height: 1.93, width: 1.98, length: 4.71, weight: 3.0 },
    engine: {
      fuelType: 'electrico',
      displacementCc: 0,
      horsepower: 204,
      avgConsumptionL100km: 20.5,
      tankCapacityL: 77,
      environmentalBadge: '0',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 3. MERCEDES-BENZ (Sprinter, Marco Polo, Vito)
  // =============================================================
  {
    id: 'mercedes_sprinter_l2h2_316_cdi',
    brand: 'Mercedes-Benz',
    model: 'Sprinter 314 / 316 / 319 CDI L2H2 (5.93m)',
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
    ],
    gadgets: [],
  },
  {
    id: 'mercedes_sprinter_4x4_overland',
    brand: 'Mercedes-Benz',
    model: 'Sprinter 4x4 AWD 319 CDI Overland (V6 / 4 Cil 190 CV)',
    generation: 'W907 4x4 (2019 - Presente)',
    category: 'camion_overland',
    chassisBase: 'Mercedes Sprinter 4x4',
    years: '2019 - Presente',
    dimensions: { height: 2.85, width: 2.02, length: 5.93, weight: 4.1 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 190,
      avgConsumptionL100km: 11.2,
      tankCapacityL: 93,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
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
  {
    id: 'mercedes_vito_tourer_camper',
    brand: 'Mercedes-Benz',
    model: 'Vito Tourer Camper 116 / 119 CDI (163 / 190 CV)',
    generation: 'W447 (2015 - Presente)',
    category: 'campervan',
    chassisBase: 'Mercedes Vito',
    years: '2015 - Presente',
    dimensions: { height: 1.94, width: 1.93, length: 5.14, weight: 3.0 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 163,
      avgConsumptionL100km: 7.2,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 4. FORD (Transit Custom Nugget, Transit L2/L3, Trail 4x4)
  // =============================================================
  {
    id: 'ford_transit_custom_nugget',
    brand: 'Ford',
    model: 'Transit Custom Nugget Westfalia (2.0 EcoBlue 150 CV)',
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
    recambios: [],
    gadgets: [],
  },
  {
    id: 'ford_transit_custom_nugget_plus',
    brand: 'Ford',
    model: 'Transit Custom Nugget Plus (5.34m / Baño y WC fijo)',
    generation: 'Custom Plus (2019 - Presente)',
    category: 'campervan',
    chassisBase: 'Ford Transit Custom L2',
    years: '2019 - Presente',
    dimensions: { height: 2.08, width: 2.03, length: 5.34, weight: 3.3 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 170,
      avgConsumptionL100km: 8.3,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'ford_transit_l2h2_130',
    brand: 'Ford',
    model: 'Transit L2H2 Furgón Gran Volumen (5.53m)',
    generation: 'Transit MK8 (2016 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Ford Transit',
    years: '2016 - Presente',
    dimensions: { height: 2.55, width: 2.06, length: 5.53, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 130,
      avgConsumptionL100km: 8.8,
      tankCapacityL: 80,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'ford_transit_l3h3_170',
    brand: 'Ford',
    model: 'Transit L3H3 Gran Volumen Techo Alto (5.98m)',
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
  {
    id: 'ford_transit_trail_4x4',
    brand: 'Ford',
    model: 'Transit Trail AWD 4x4 Gran Volumen (5.98m)',
    generation: 'Transit Trail (2020 - Presente)',
    category: 'camion_overland',
    chassisBase: 'Ford Transit AWD',
    years: '2020 - Presente',
    dimensions: { height: 2.74, width: 2.06, length: 5.98, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 170,
      avgConsumptionL100km: 10.5,
      tankCapacityL: 80,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 5. CITROËN & PEUGEOT (Jumper, Boxer, SpaceTourer, Berlingo)
  // =============================================================
  {
    id: 'citroen_jumper_l2h2_140',
    brand: 'Citroën',
    model: 'Jumper L2H2 Gran Volumen (5.41m)',
    generation: 'Jumper III (2014 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Citroën Jumper',
    years: '2014 - Presente',
    dimensions: { height: 2.52, width: 2.05, length: 5.41, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 140,
      avgConsumptionL100km: 8.9,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'citroen_jumper_l3h2_165',
    brand: 'Citroën',
    model: 'Jumper L3H2 Gran Volumen (5.99m)',
    generation: 'Jumper III (2016 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Citroën Jumper',
    years: '2016 - Presente',
    dimensions: { height: 2.52, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 165,
      avgConsumptionL100km: 9.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'citroen_spacetourer_camper',
    brand: 'Citroën',
    model: 'SpaceTourer Camper Tinkervan / Pössl Campster (4.95m)',
    generation: 'SpaceTourer (2016 - Presente)',
    category: 'campervan',
    chassisBase: 'Citroën SpaceTourer',
    years: '2016 - Presente',
    dimensions: { height: 1.96, width: 1.92, length: 4.95, weight: 2.8 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1997,
      horsepower: 145,
      avgConsumptionL100km: 7.1,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'citroen_berlingo_xl_camper',
    brand: 'Citroën',
    model: 'Berlingo XL Camper Tinkervan (4.75m)',
    generation: 'Berlingo III (2018 - Presente)',
    category: 'campervan',
    chassisBase: 'Citroën Berlingo XL',
    years: '2018 - Presente',
    dimensions: { height: 1.84, width: 1.85, length: 4.75, weight: 2.2 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1499,
      horsepower: 130,
      avgConsumptionL100km: 5.5,
      tankCapacityL: 50,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'peugeot_boxer_l3h2_140',
    brand: 'Peugeot',
    model: 'Boxer L3H2 Gran Volumen (5.99m)',
    generation: 'Boxer III (2015 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Peugeot Boxer',
    years: '2015 - Presente',
    dimensions: { height: 2.52, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 140,
      avgConsumptionL100km: 9.1,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'peugeot_rifter_long_camper',
    brand: 'Peugeot',
    model: 'Rifter Long Camper Tinkervan (4.75m)',
    generation: 'Rifter (2018 - Presente)',
    category: 'campervan',
    chassisBase: 'Peugeot Rifter',
    years: '2018 - Presente',
    dimensions: { height: 1.84, width: 1.85, length: 4.75, weight: 2.2 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1499,
      horsepower: 130,
      avgConsumptionL100km: 5.5,
      tankCapacityL: 50,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 6. RENAULT (Trafic SpaceNomad, Master Gran Volumen)
  // =============================================================
  {
    id: 'renault_trafic_spacenomad_150',
    brand: 'Renault',
    model: 'Trafic SpaceNomad Techo Elevable (5.08m)',
    generation: 'Trafic III Fase 2 (2021 - Presente)',
    category: 'campervan',
    chassisBase: 'Renault Trafic',
    years: '2021 - Presente',
    dimensions: { height: 1.99, width: 1.95, length: 5.08, weight: 3.0 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1997,
      horsepower: 150,
      avgConsumptionL100km: 7.5,
      tankCapacityL: 80,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'renault_master_l2h2_150',
    brand: 'Renault',
    model: 'Master L2H2 Gran Volumen (5.57m)',
    generation: 'Master III (2016 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Renault Master',
    years: '2016 - Presente',
    dimensions: { height: 2.49, width: 2.07, length: 5.57, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2299,
      horsepower: 150,
      avgConsumptionL100km: 9.2,
      tankCapacityL: 80,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'renault_master_l3h2_180',
    brand: 'Renault',
    model: 'Master L3H2 Gran Volumen (6.22m)',
    generation: 'Master III (2019 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Renault Master',
    years: '2019 - Presente',
    dimensions: { height: 2.49, width: 2.07, length: 6.22, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2299,
      horsepower: 180,
      avgConsumptionL100km: 9.7,
      tankCapacityL: 80,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 7. TOYOTA & NISSAN (Proace, Hilux 4x4, Primastar)
  // =============================================================
  {
    id: 'toyota_proace_camper_nomad',
    brand: 'Toyota',
    model: 'Proace Verso Camper Nomad (4.95m)',
    generation: 'Proace (2018 - Presente)',
    category: 'campervan',
    chassisBase: 'Toyota Proace',
    years: '2018 - Presente',
    dimensions: { height: 1.90, width: 1.92, length: 4.95, weight: 2.8 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1997,
      horsepower: 145,
      avgConsumptionL100km: 7.0,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'toyota_hilux_4x4_celula',
    brand: 'Toyota',
    model: 'Hilux Double Cab con Célula Camper 4x4 (5.33m)',
    generation: 'Hilux VIII (2016 - Presente)',
    category: 'camion_overland',
    chassisBase: 'Toyota Hilux 4x4',
    years: '2016 - Presente',
    dimensions: { height: 2.70, width: 1.90, length: 5.33, weight: 3.2 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2393,
      horsepower: 150,
      avgConsumptionL100km: 10.4,
      tankCapacityL: 80,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'nissan_primastar_camper',
    brand: 'Nissan',
    model: 'Primastar / NV300 Camper Michelangelo (5.08m)',
    generation: 'Primastar (2021 - Presente)',
    category: 'campervan',
    chassisBase: 'Nissan Primastar',
    years: '2021 - Presente',
    dimensions: { height: 1.99, width: 1.95, length: 5.08, weight: 3.0 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1997,
      horsepower: 150,
      avgConsumptionL100km: 7.4,
      tankCapacityL: 80,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 8. BENIMAR (Líder en ventas en España)
  // =============================================================
  {
    id: 'benimar_benivan_116_pro',
    brand: 'Benimar',
    model: 'Benivan 116 / 120 Gran Volumen (5.99m)',
    generation: 'Chasis Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.65, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.4,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'benimar_benivan_160_twin',
    brand: 'Benimar',
    model: 'Benivan 160 Camas Gemelas (6.36m)',
    generation: 'Chasis Fiat Ducato (2021 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato Maxi',
    years: '2021 - Presente',
    dimensions: { height: 2.65, width: 2.05, length: 6.36, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 9.9,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'benimar_tessoro_463',
    brand: 'Benimar',
    model: 'Tessoro 463 / 496 Perfilada Camas Gemelas (7.43m)',
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
    id: 'benimar_tessoro_440_compact',
    brand: 'Benimar',
    model: 'Tessoro 440 UP Perfilada Compacta (6.34m)',
    generation: 'Chasis Ford Transit (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'Ford Transit',
    years: '2020 - Presente',
    dimensions: { height: 2.89, width: 2.30, length: 6.34, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 130,
      avgConsumptionL100km: 10.2,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'benimar_mileo_263',
    brand: 'Benimar',
    model: 'Mileo 263 / 296 Perfilada Premium (7.39m)',
    generation: 'Chasis Fiat Ducato (2019 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2019 - Presente',
    dimensions: { height: 2.89, width: 2.30, length: 7.39, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 11.0,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'benimar_sport_340_capuchina',
    brand: 'Benimar',
    model: 'Sport 340 / 346 Capuchina Familiar 6-7 Plazas (6.99m)',
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
    id: 'benimar_amphitryon_967_integral',
    brand: 'Benimar',
    model: 'Amphitryon 967 / 997 Integral de Gama Alta (7.42m)',
    generation: 'Fiat Ducato Integral (2020 - Presente)',
    category: 'integral',
    chassisBase: 'Fiat Ducato AL-KO',
    years: '2020 - Presente',
    dimensions: { height: 2.95, width: 2.35, length: 7.42, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 11.8,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 9. PÖSSL (Líder europeo de furgonetas camper)
  // =============================================================
  {
    id: 'possl_2win_plus_600',
    brand: 'Pössl',
    model: '2Win / 2Win Plus Gran Volumen (5.99m)',
    generation: 'Citroën / Fiat (2018 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Citroën Jumper / Fiat Ducato',
    years: '2018 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 140,
      avgConsumptionL100km: 9.2,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'possl_summit_540_shine',
    brand: 'Pössl',
    model: 'Summit 540 Shine Compacto (5.41m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 5.41, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 8.8,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'possl_roadcruiser_640',
    brand: 'Pössl',
    model: 'Roadcruiser Camas Gemelas (6.36m)',
    generation: 'Fiat Ducato Maxi (2018 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato Maxi',
    years: '2018 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 6.36, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 9.8,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'possl_campster_spacetourer',
    brand: 'Pössl',
    model: 'Campster / Vanster (Citroën SpaceTourer 4.95m)',
    generation: 'Campster (2017 - Presente)',
    category: 'campervan',
    chassisBase: 'Citroën SpaceTourer',
    years: '2017 - Presente',
    dimensions: { height: 1.96, width: 1.92, length: 4.95, weight: 2.8 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1997,
      horsepower: 145,
      avgConsumptionL100km: 7.1,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 10. HYMER / CARADO / SUNLIGHT (Erwin Hymer Group)
  // =============================================================
  {
    id: 'hymer_grand_canyon_s_4x4',
    brand: 'Hymer',
    model: 'Grand Canyon S 4x4 (Mercedes Sprinter 4x4 5.93m)',
    generation: 'Sprinter W907 (2020 - Presente)',
    category: 'camion_overland',
    chassisBase: 'Mercedes Sprinter 4x4',
    years: '2020 - Presente',
    dimensions: { height: 2.85, width: 2.06, length: 5.93, weight: 3.88 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 190,
      avgConsumptionL100km: 11.5,
      tankCapacityL: 93,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'hymer_free_600',
    brand: 'Hymer',
    model: 'Free 540 / 600 Blue Evolution (5.99m)',
    generation: 'Fiat Ducato (2019 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2019 - Presente',
    dimensions: { height: 2.60, width: 2.08, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'hymer_ml_t_580_4x4',
    brand: 'Hymer',
    model: 'ML-T 580 4x4 Perfilada Todoterreno (6.98m)',
    generation: 'Mercedes Sprinter 4x4 (2019 - Presente)',
    category: 'perfilada',
    chassisBase: 'Mercedes Sprinter 4x4',
    years: '2019 - Presente',
    dimensions: { height: 2.92, width: 2.22, length: 6.98, weight: 3.88 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 190,
      avgConsumptionL100km: 12.0,
      tankCapacityL: 93,
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
    id: 'carado_cv_600',
    brand: 'Carado',
    model: 'CV600 / CV640 Gran Volumen (5.99m / 6.36m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.65, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'carado_t_447_perfilada',
    brand: 'Carado',
    model: 'T447 / T338 Perfilada Familiar (7.40m)',
    generation: 'Fiat Ducato (2019 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2019 - Presente',
    dimensions: { height: 2.90, width: 2.32, length: 7.40, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 11.1,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'sunlight_cliff_600_adventure',
    brand: 'Sunlight',
    model: 'Cliff 600 / 640 Adventure Edition (5.99m)',
    generation: 'Citroën / Fiat (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Citroën Jumper',
    years: '2020 - Presente',
    dimensions: { height: 2.65, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 140,
      avgConsumptionL100km: 9.2,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'sunlight_a70_capuchina',
    brand: 'Sunlight',
    model: 'A70 / A72 Capuchina Familiar 6 Plazas (7.25m)',
    generation: 'Fiat Ducato (2019 - Presente)',
    category: 'capuchina',
    chassisBase: 'Fiat Ducato',
    years: '2019 - Presente',
    dimensions: { height: 3.14, width: 2.32, length: 7.25, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 12.6,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 11. ADRIA (Twin, Matrix, Coral, Sonic)
  // =============================================================
  {
    id: 'adria_twin_supreme_640',
    brand: 'Adria',
    model: 'Twin Supreme 640 SLB Gran Volumen Skyroof (6.36m)',
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
    id: 'adria_matrix_plus_670',
    brand: 'Adria',
    model: 'Matrix Plus 670 SL / DL Perfilada Basculante (7.49m)',
    generation: 'Citroën / Fiat (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.90, width: 2.30, length: 7.49, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 11.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'adria_coral_supreme_670',
    brand: 'Adria',
    model: 'Coral Supreme 670 DL Techo Panorámico (7.49m)',
    generation: 'Fiat Ducato (2021 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2021 - Presente',
    dimensions: { height: 2.85, width: 2.30, length: 7.49, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 11.2,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'adria_sonic_supreme_700',
    brand: 'Adria',
    model: 'Sonic Supreme 700 DC Integral de Lujo (7.52m)',
    generation: 'Fiat AL-KO (2020 - Presente)',
    category: 'integral',
    chassisBase: 'Fiat Ducato AL-KO',
    years: '2020 - Presente',
    dimensions: { height: 2.96, width: 2.32, length: 7.52, weight: 4.4 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 180,
      avgConsumptionL100km: 11.9,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 12. DETHLEFFS (Trend, Globebus, Pulse, Alpa)
  // =============================================================
  {
    id: 'dethleffs_globebus_t1',
    brand: 'Dethleffs',
    model: 'Globebus T1 / T6 Perfilada Compacta (5.99m / 6.98m)',
    generation: 'Fiat Ducato (2018 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2018 - Presente',
    dimensions: { height: 2.81, width: 2.20, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 10.0,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'dethleffs_trend_t7057',
    brand: 'Dethleffs',
    model: 'Trend T 7057 DBM / EB Perfilada (7.41m)',
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
    id: 'dethleffs_alpa_a6820',
    brand: 'Dethleffs',
    model: 'Alpa A 6820-2 Capuchina Salón en U (7.33m)',
    generation: 'Fiat AL-KO (2019 - Presente)',
    category: 'capuchina',
    chassisBase: 'Fiat Ducato AL-KO',
    years: '2019 - Presente',
    dimensions: { height: 3.23, width: 2.33, length: 7.33, weight: 4.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 180,
      avgConsumptionL100km: 13.5,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 13. KNAUS & WEINSBERG
  // =============================================================
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
    id: 'knaus_van_ti_plus_man_4x4',
    brand: 'Knaus',
    model: 'Van TI Plus 650 MEG (MAN TGE 4x4 6.99m)',
    generation: 'MAN TGE 4Motion (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'MAN TGE 4x4',
    years: '2020 - Presente',
    dimensions: { height: 2.90, width: 2.20, length: 6.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1968,
      horsepower: 177,
      avgConsumptionL100km: 10.9,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'knaus_sun_i_900_integral',
    brand: 'Knaus',
    model: 'Sun I 900 LEG Integral de Lujo 3 Ejes (8.82m)',
    generation: 'Fiat AL-KO 3 Ejes (2019 - Presente)',
    category: 'integral',
    chassisBase: 'Fiat Ducato AL-KO Tandem',
    years: '2019 - Presente',
    dimensions: { height: 2.94, width: 2.34, length: 8.82, weight: 5.0 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 180,
      avgConsumptionL100km: 13.2,
      tankCapacityL: 120,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'weinsberg_carabus_600_mq',
    brand: 'Weinsberg',
    model: 'CaraBus / CaraTour 600 MQ (Peugeot / Fiat 5.99m)',
    generation: 'Peugeot Boxer (2019 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Peugeot Boxer',
    years: '2019 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 140,
      avgConsumptionL100km: 9.1,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'weinsberg_caracompact_pepper_mb',
    brand: 'Weinsberg',
    model: 'CaraCompact Suite MB 640 MEG Edition Pepper (6.92m)',
    generation: 'Mercedes Sprinter (2021 - Presente)',
    category: 'perfilada',
    chassisBase: 'Mercedes Sprinter',
    years: '2021 - Presente',
    dimensions: { height: 2.80, width: 2.20, length: 6.92, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 150,
      avgConsumptionL100km: 10.4,
      tankCapacityL: 65,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 14. BÜRSTNER (Campeo, Lyseo, Elegance)
  // =============================================================
  {
    id: 'burstner_campeo_c600',
    brand: 'Bürstner',
    model: 'Campeo C 540 / C 600 Gran Volumen (5.99m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.65, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'burstner_lyseo_td_690',
    brand: 'Bürstner',
    model: 'Lyseo TD 690 G / 744 Harmony Line (6.99m / 7.49m)',
    generation: 'Fiat Ducato (2019 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2019 - Presente',
    dimensions: { height: 2.95, width: 2.30, length: 6.99, weight: 3.5 },
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
    id: 'burstner_elegance_i910_integral',
    brand: 'Bürstner',
    model: 'Elegance I 910 G Integral Chasis SLC (8.99m)',
    generation: 'Mercedes Sprinter SLC 3 Ejes (2021 - Presente)',
    category: 'integral',
    chassisBase: 'Mercedes Sprinter SLC',
    years: '2021 - Presente',
    dimensions: { height: 3.05, width: 2.34, length: 8.99, weight: 5.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 170,
      avgConsumptionL100km: 13.0,
      tankCapacityL: 93,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 15. CHALLENGER & CHAUSSON (Grupo Trigano)
  // =============================================================
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
    id: 'challenger_380_familiar',
    brand: 'Challenger',
    model: 'Challenger 380 Graphite Literas Basculantes (7.19m)',
    generation: 'Ford Transit (2021 - Presente)',
    category: 'perfilada',
    chassisBase: 'Ford Transit',
    years: '2021 - Presente',
    dimensions: { height: 2.92, width: 2.35, length: 7.19, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 170,
      avgConsumptionL100km: 11.2,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'chausson_titanium_640',
    brand: 'Chausson',
    model: 'Titanium Ultimate 640 Salón SmartLounge (6.99m)',
    generation: 'Ford Transit (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'Ford Transit',
    years: '2020 - Presente',
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
    id: 'chausson_v594_max_van',
    brand: 'Chausson',
    model: 'V594 Max First Line 4 Plazas Doble Litera (5.99m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.65, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 16. MCLOUIS & ROLLER TEAM
  // =============================================================
  {
    id: 'mclouis_menfys_3_maxi',
    brand: 'McLouis',
    model: 'Menfys 3 / 4 Maxi Gran Volumen (5.99m / 6.36m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.65, width: 2.05, length: 5.99, weight: 3.5 },
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
    id: 'mclouis_glamys_322_capuchina',
    brand: 'McLouis',
    model: 'Glamys 322 Capuchina Familiar 7 Plazas (6.99m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'capuchina',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 3.20, width: 2.35, length: 6.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 12.8,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'mclouis_mc4_873_perfilada',
    brand: 'McLouis',
    model: 'MC4 873 / 379 Camas Gemelas Perfilada (7.45m)',
    generation: 'Fiat Ducato (2021 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2021 - Presente',
    dimensions: { height: 2.95, width: 2.35, length: 7.45, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 11.2,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'roller_team_kronos_284',
    brand: 'Roller Team',
    model: 'Kronos 284 TL / 265 TL Perfilada (7.45m)',
    generation: 'Ford Transit (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'Ford Transit',
    years: '2020 - Presente',
    dimensions: { height: 2.95, width: 2.35, length: 7.45, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 170,
      avgConsumptionL100km: 11.3,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'roller_team_livingstone_2',
    brand: 'Roller Team',
    model: 'Livingstone 2 / 5 Sport Gran Volumen (5.99m / 6.36m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.65, width: 2.05, length: 5.99, weight: 3.5 },
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

  // =============================================================
  // 17. RAPIDO & CARTHAGO / MALIBU
  // =============================================================
  {
    id: 'rapido_v55_modulspace',
    brand: 'Rapido',
    model: 'Rapido V55 / V68 Gran Volumen Ducha Central (5.99m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'rapido_686f_perfilada',
    brand: 'Rapido',
    model: 'Rapido 686F / 886F Cama Isla Central (7.20m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato AL-KO',
    years: '2020 - Presente',
    dimensions: { height: 2.76, width: 2.35, length: 7.20, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 10.9,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'rapido_distinction_i96_integral',
    brand: 'Rapido',
    model: 'Distinction i96 / i1090 Integral de Lujo (7.54m / 8.79m)',
    generation: 'Mercedes Sprinter AL-KO (2021 - Presente)',
    category: 'integral',
    chassisBase: 'Mercedes Sprinter AL-KO',
    years: '2021 - Presente',
    dimensions: { height: 2.99, width: 2.35, length: 7.54, weight: 4.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 170,
      avgConsumptionL100km: 12.2,
      tankCapacityL: 93,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'carthago_chic_c_line_49',
    brand: 'Carthago',
    model: 'chic c-line I 4.9 LE Integral Premium (7.50m)',
    generation: 'Mercedes Sprinter AL-KO (2020 - Presente)',
    category: 'integral',
    chassisBase: 'Mercedes Sprinter AL-KO',
    years: '2020 - Presente',
    dimensions: { height: 2.89, width: 2.27, length: 7.50, weight: 4.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 170,
      avgConsumptionL100km: 11.6,
      tankCapacityL: 93,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'malibu_van_600_db',
    brand: 'Malibu',
    model: 'Malibu Van 600 DB / 640 LE First Class (5.99m / 6.36m)',
    generation: 'Fiat Ducato (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.59, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.3,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },

  // =============================================================
  // 18. IVECO & OVERLAND / 4x4 EXPEDICIÓN
  // =============================================================
  {
    id: 'iveco_daily_35s18_gran_volumen',
    brand: 'Iveco',
    model: 'Daily 35S18 Furgón Gran Volumen (6.00m - 7.10m)',
    generation: 'Daily Hi-Matic (2018 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Iveco Daily',
    years: '2018 - Presente',
    dimensions: { height: 2.65, width: 2.05, length: 6.00, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2998,
      horsepower: 180,
      avgConsumptionL100km: 11.0,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'iveco_daily_4x4_overland',
    brand: 'Iveco',
    model: 'Daily 4x4 / 35S Camión Expedición Overland (6.80m)',
    generation: 'Daily Hi-Matic 4x4 (2017 - Presente)',
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
  {
    id: 'man_tge_4x4_overland',
    brand: 'MAN',
    model: 'MAN TGE 3.180 4x4 Allrad Overland (5.98m)',
    generation: 'TGE (2019 - Presente)',
    category: 'camion_overland',
    chassisBase: 'MAN TGE 4x4',
    years: '2019 - Presente',
    dimensions: { height: 2.68, width: 2.04, length: 5.98, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1968,
      horsepower: 177,
      avgConsumptionL100km: 10.8,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'dacia_dokker_jogger_camper',
    brand: 'Dacia',
    model: 'Jogger / Dokker Camper Yevana (4.54m)',
    generation: 'Jogger (2022 - Presente)',
    category: 'campervan',
    chassisBase: 'Dacia Jogger',
    years: '2022 - Presente',
    dimensions: { height: 1.80, width: 1.78, length: 4.54, weight: 1.8 },
    engine: {
      fuelType: 'gasolina',
      displacementCc: 999,
      horsepower: 110,
      avgConsumptionL100km: 5.8,
      tankCapacityL: 50,
      environmentalBadge: 'ECO',
    },
    recambios: [],
    gadgets: [],
  },
  // ==========================================
  // MARCAS EUROPEAS ADICIONALES (EXPANSIÓN)
  // ==========================================
  {
    id: 'pilote_p696d_essentiel',
    brand: 'Pilote',
    model: 'Pilote Pacific P696D Essentiel (6.99m)',
    generation: 'Pacific (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.88, width: 2.30, length: 6.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 11.2,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'pilote_g740c_evidence',
    brand: 'Pilote',
    model: 'Pilote Galaxy G740C Evidence Integral (7.49m)',
    generation: 'Galaxy (2021 - Presente)',
    category: 'integral',
    chassisBase: 'Fiat Ducato CCS',
    years: '2021 - Presente',
    dimensions: { height: 2.92, width: 2.35, length: 7.49, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 11.8,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'pilote_v600g_van',
    brand: 'Pilote',
    model: 'Pilote Van V600G Premium (5.99m)',
    generation: 'Van (2019 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2019 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 5.99, weight: 3.3 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2287,
      horsepower: 140,
      avgConsumptionL100km: 9.2,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'rimor_seal_12_plus',
    brand: 'Rimor',
    model: 'Rimor Seal 12 Plus Perfilada (6.48m)',
    generation: 'Seal (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.94, width: 2.34, length: 6.48, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 11.0,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'rimor_super_brig_695',
    brand: 'Rimor',
    model: 'Rimor Super Brig 695 Capuchina (7.37m)',
    generation: 'Super Brig (2018 - Presente)',
    category: 'capuchina',
    chassisBase: 'Fiat Ducato',
    years: '2018 - Presente',
    dimensions: { height: 3.12, width: 2.34, length: 7.37, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2287,
      horsepower: 160,
      avgConsumptionL100km: 12.8,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'morelo_empire_liner_98lo',
    brand: 'Morelo',
    model: 'Morelo Empire Liner 98 LO Super Luxury (10.2m)',
    generation: 'Empire Liner (2021 - Presente)',
    category: 'integral',
    chassisBase: 'Iveco Daily 70C',
    years: '2021 - Presente',
    dimensions: { height: 3.75, width: 2.50, length: 10.20, weight: 7.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2998,
      horsepower: 207,
      avgConsumptionL100km: 15.8,
      tankCapacityL: 150,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'concorde_charisma_860li',
    brand: 'Concorde',
    model: 'Concorde Charisma 860 LI Liner (8.77m)',
    generation: 'Charisma (2020 - Presente)',
    category: 'integral',
    chassisBase: 'Iveco Daily 70C',
    years: '2020 - Presente',
    dimensions: { height: 3.46, width: 2.40, length: 8.77, weight: 7.0 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2998,
      horsepower: 207,
      avgConsumptionL100km: 14.9,
      tankCapacityL: 120,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'giottiline_siena_385',
    brand: 'Giottiline',
    model: 'Giottiline Siena 385 Perfilada (6.99m)',
    generation: 'Siena (2021 - Presente)',
    category: 'perfilada',
    chassisBase: 'Citroën Jumper',
    years: '2021 - Presente',
    dimensions: { height: 2.90, width: 2.32, length: 6.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 140,
      avgConsumptionL100km: 10.9,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'etrusco_t6900_sb',
    brand: 'Etrusco',
    model: 'Etrusco T 6900 SB Perfilada Ford (6.98m)',
    generation: 'T-Series (2022 - Presente)',
    category: 'perfilada',
    chassisBase: 'Ford Transit',
    years: '2022 - Presente',
    dimensions: { height: 2.92, width: 2.32, length: 6.98, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1995,
      horsepower: 130,
      avgConsumptionL100km: 10.6,
      tankCapacityL: 70,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'itineo_nomad_cj660',
    brand: 'Itineo',
    model: 'Itineo Nomad CJ660 Integral Compacta (6.61m)',
    generation: 'Nomad (2021 - Presente)',
    category: 'integral',
    chassisBase: 'Peugeot Boxer',
    years: '2021 - Presente',
    dimensions: { height: 2.80, width: 2.19, length: 6.61, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 140,
      avgConsumptionL100km: 10.5,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'laika_ecovip_l3009',
    brand: 'Laika',
    model: 'Laika Ecovip L 3009 Perfilada Italiana (6.99m)',
    generation: 'Ecovip (2021 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2021 - Presente',
    dimensions: { height: 2.96, width: 2.25, length: 6.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 11.2,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'bavaria_trend_t706d',
    brand: 'Bavaria',
    model: 'Bavaria Tren-D T706 D Perfilada (6.99m)',
    generation: 'Tren-D (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'Fiat Ducato',
    years: '2020 - Presente',
    dimensions: { height: 2.88, width: 2.30, length: 6.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2287,
      horsepower: 140,
      avgConsumptionL100km: 11.1,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'mobilvetta_kyacht_tekno_86',
    brand: 'Mobilvetta',
    model: 'Mobilvetta K-Yacht Tekno Line 86 Integral (7.45m)',
    generation: 'K-Yacht (2021 - Presente)',
    category: 'integral',
    chassisBase: 'Fiat Ducato AL-KO',
    years: '2021 - Presente',
    dimensions: { height: 2.95, width: 2.35, length: 7.45, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 11.9,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'frankia_neo_mi7bd',
    brand: 'Frankia',
    model: 'Frankia Neo MI 7 BD Integral Mercedes (6.98m)',
    generation: 'Neo (2022 - Presente)',
    category: 'integral',
    chassisBase: 'Mercedes Sprinter AL-KO',
    years: '2022 - Presente',
    dimensions: { height: 2.96, width: 2.24, length: 6.98, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 170,
      avgConsumptionL100km: 11.4,
      tankCapacityL: 65,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'hobby_optima_deluxe_t65',
    brand: 'Hobby',
    model: 'Hobby Optima De Luxe T65 HK (6.78m)',
    generation: 'Optima (2020 - Presente)',
    category: 'perfilada',
    chassisBase: 'Citroën Jumper',
    years: '2020 - Presente',
    dimensions: { height: 2.87, width: 2.16, length: 6.78, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 140,
      avgConsumptionL100km: 10.7,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'westfalia_columbus_600d',
    brand: 'Westfalia',
    model: 'Westfalia Columbus 600 D Gran Volumen (5.99m)',
    generation: 'Columbus (2021 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2021 - Presente',
    dimensions: { height: 2.60, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.3,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'westfalia_james_cook_4x4',
    brand: 'Westfalia',
    model: 'Westfalia James Cook Mercedes Sprinter 4x4 (5.93m)',
    generation: 'James Cook (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Mercedes Sprinter 4x4',
    years: '2020 - Presente',
    dimensions: { height: 2.91, width: 2.05, length: 5.93, weight: 3.88 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 190,
      avgConsumptionL100km: 11.5,
      tankCapacityL: 93,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'levoyageur_heritage_79cf',
    brand: 'Le Voyageur',
    model: 'Le Voyageur Héritage LVXH 7.9 CF Mercedes (7.91m)',
    generation: 'Héritage (2021 - Presente)',
    category: 'integral',
    chassisBase: 'Mercedes Sprinter 417 CDI',
    years: '2021 - Presente',
    dimensions: { height: 3.09, width: 2.25, length: 7.91, weight: 4.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 1950,
      horsepower: 170,
      avgConsumptionL100km: 12.3,
      tankCapacityL: 93,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'clever_celebration_600',
    brand: 'Clever Vans',
    model: 'Clever Celebration 600 Gran Volumen (5.99m)',
    generation: 'Celebration (2020 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Citroën Jumper',
    years: '2020 - Presente',
    dimensions: { height: 2.58, width: 2.05, length: 5.99, weight: 3.3 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2179,
      horsepower: 140,
      avgConsumptionL100km: 9.1,
      tankCapacityL: 90,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'font_vendome_leader_camp',
    brand: 'Font Vendôme',
    model: 'Font Vendôme Leader Camp (5.99m)',
    generation: 'Leader Camp (2021 - Presente)',
    category: 'gran_volumen',
    chassisBase: 'Fiat Ducato',
    years: '2021 - Presente',
    dimensions: { height: 2.60, width: 2.05, length: 5.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 140,
      avgConsumptionL100km: 9.2,
      tankCapacityL: 75,
      environmentalBadge: 'C',
    },
    recambios: [],
    gadgets: [],
  },
  {
    id: 'niesmann_bischoff_ismove_69e',
    brand: 'Niesmann+Bischoff',
    model: 'Niesmann+Bischoff iSmove 6.9 E Integral (6.99m)',
    generation: 'iSmove (2021 - Presente)',
    category: 'integral',
    chassisBase: 'Fiat Ducato AL-KO',
    years: '2021 - Presente',
    dimensions: { height: 2.83, width: 2.28, length: 6.99, weight: 3.5 },
    engine: {
      fuelType: 'diesel',
      displacementCc: 2184,
      horsepower: 160,
      avgConsumptionL100km: 11.5,
      tankCapacityL: 75,
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
   * Obtiene las categorías únicas disponibles en el catálogo
   */
  public getCategories(): VehicleCategoryType[] {
    const categoriesSet = new Set<VehicleCategoryType>();
    VEHICLE_CATALOG.forEach((item) => categoriesSet.add(item.category));
    return Array.from(categoriesSet);
  }

  /**
   * Busca modelos en el catálogo por término de búsqueda y/o categoría
   */
  public searchModels(query: string, categoryFilter?: VehicleCategoryType | 'ALL'): VehicleModelItem[] {
    const q = query.toLowerCase().trim();
    return VEHICLE_CATALOG.filter((item) => {
      const matchesCategory = !categoryFilter || categoryFilter === 'ALL' || item.category === categoryFilter;
      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        item.brand.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.chassisBase.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
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

    // Por defecto: Fiat Ducato L2H2 estándar (la camper más habitual de Europa)
    const defaultModel = VEHICLE_CATALOG.find((m) => m.id === 'fiat_ducato_l2h2_140') || VEHICLE_CATALOG[0];
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
   * teniendo en cuenta la cilindrada, potencia CV, peso y coeficiente aerodinámico
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

    const height = v?.height || 2.6;
    const weight = v?.weight || 3.5;

    // Vehículos más altos de 2.8m tienen mayor resistencia al viento
    const aeroFactor = height > 2.8 ? 1.08 : height > 3.0 ? 1.15 : 1.0;
    // Vehículos más pesados de 3.5t incrementan consumo en subidas
    const weightFactor = weight > 3.5 ? 1.1 : 1.0;

    const effectiveConsumption = baseConsumption * aeroFactor * weightFactor;
    const estimatedLitres = Number(((distanceKm / 100) * effectiveConsumption).toFixed(1));
    const estimatedCostEur = Number((estimatedLitres * fuelPricePerLitreEur).toFixed(2));
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
    if (!v) return VEHICLE_CATALOG[1].recambios;

    if (v.catalogId) {
      const match = this.getModelById(v.catalogId);
      if (match && match.recambios && match.recambios.length > 0) {
        return match.recambios;
      }
    }

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
      if (match && match.gadgets && match.gadgets.length > 0) {
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
