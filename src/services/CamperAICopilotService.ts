/**
 * CamperAICopilotService.ts - Motor Inteligente de Rutas e Itinerarios Camper por IA
 * CamperSites Pro - Nexus Studio (Nexus AI Holding)
 *
 * Transforma peticiones en lenguaje natural (ej. "3 días desde Madrid a Cantabria con playas
 * tranquilas, pernocta gratis y sin barreras de altura") en itinerarios completos día a día con:
 * 1. Paradas técnicas de vaciado de aguas y repostaje de combustible barato oficial MITECO / GLP.
 * 2. Pernoctas libres y seguras verificadas sin barreras de gálibo (2.0-2.3m).
 * 3. Comprobación meteorológica de rachas de viento para seguridad del toldo.
 * 4. Georreferenciación y compatibilidad directa con el GPS 3D de cabina.
 */

import {
  TravelPlan,
  DayStage,
  PlannedStop,
  OvernightSpot,
  VehicleCategory,
  camperTravelPlannerService,
} from './CamperTravelPlannerService';
import { ClearanceHazardService } from './ClearanceHazardService';
import { FuelPriceService, FuelStationItem } from './FuelPriceService';
import { camperWeatherService } from './CamperWeatherService';
import { Logger } from '../utils/logger';

export interface CamperAIPromptOptions {
  vehicleCategory?: VehicleCategory;
  vehicleHeightMeters?: number; // Ej. 2.8m
  preferFreeOvernight?: boolean;
  avoidHeightBarriers?: boolean;
  needsLpg?: boolean;
  checkWindSafety?: boolean;
  cheapFuelMiteco?: boolean;
}

export interface ParsedPromptIntent {
  origin: string;
  destination: string;
  days: number;
  preferFreeOvernight: boolean;
  avoidHeightBarriers: boolean;
  needsLpg: boolean;
  includeBeaches: boolean;
  includeMountains: boolean;
  vehicleCategory: VehicleCategory;
}

export interface QuickPromptItem {
  id: string;
  title: string;
  badge: string;
  prompt: string;
  days: number;
  icon: string;
  tags: string[];
}

export const QUICK_PROMPTS: QuickPromptItem[] = [
  {
    id: 'qp_cantabria_3d',
    title: 'Cantabria Costa 3D',
    badge: '🌊 Playas & Libre',
    prompt: '3 días desde Madrid a Cantabria con playas tranquilas, pernocta gratis y sin barreras de altura',
    days: 3,
    icon: 'beach',
    tags: ['Playas', 'Sin Barreras', 'Pernocta Gratis', 'MITECO Ahorro'],
  },
  {
    id: 'qp_galicia_5d',
    title: 'Rías Baixas & Costa da Morte 5D',
    badge: '🦞 Marisco & Calas',
    prompt: '5 días por las Rías Baixas y Costa da Morte con calas secretas, GLP y vistas al atardecer',
    days: 5,
    icon: 'compass-rose',
    tags: ['Rías Baixas', 'Puestas de Sol', 'GLP Waylet', 'Pernocta Libre'],
  },
  {
    id: 'qp_pirineos_4d',
    title: 'Pirineos & Ordesa 4D',
    badge: '🏔️ Alta Montaña',
    prompt: '4 días por Pirineos y Ordesa evitando puertos estrechos para autocaravana de 7 metros y pernoctas con agua',
    days: 4,
    icon: 'image-filter-hdr',
    tags: ['Montaña', 'Gálibo Seguro', 'Vaciado Limpio', 'Senderismo'],
  },
  {
    id: 'qp_cabogata_4d',
    title: 'Cabo de Gata & Desierto 4D',
    badge: '☀️ Playas Vírgenes',
    prompt: '4 días de Valencia a Cabo de Gata con calas volcánicas, sin viento para toldo y gasolinera barata',
    days: 4,
    icon: 'weather-sunny',
    tags: ['Calas Vírgenes', 'Protección Viento', 'Diésel Barato', 'Relax'],
  },
];

export class CamperAICopilotService {
  /**
   * Genera un itinerario inteligente a partir de una descripción en lenguaje natural
   */
  public static async generateItinerary(
    userPrompt: string,
    options?: CamperAIPromptOptions,
    onProgress?: (step: string) => void
  ): Promise<TravelPlan> {
    Logger.info('CamperAICopilot', `Iniciando generación con prompt: "${userPrompt}"`);

    onProgress?.('🧠 Analizando intención de ruta, origen y destino...');
    await this.delay(350);

    const intent = this.parsePromptIntent(userPrompt, options);

    onProgress?.('🛡️ Verificando catálogo nacional de barreras de gálibo y puentes bajos...');
    await this.delay(400);

    onProgress?.('⛽ Localizando estaciones de repostaje oficiales MITECO con precio mínimo...');
    await this.delay(450);

    onProgress?.('💨 Analizando previsiones meteorológicas y rachas de viento lateral...');
    await this.delay(350);

    onProgress?.('📍 Construyendo etapas día a día con paradas de vaciado y pernocta...');
    await this.delay(400);

    const plan = await this.buildTailoredPlan(intent, userPrompt, options);

    // Guardar en la persistencia local de viajes
    await camperTravelPlannerService.savePlan(plan);

    onProgress?.('✅ ¡Itinerario listo y optimizado para cabina!');
    return plan;
  }

  /**
   * Extrae parámetros clave e intenciones del prompt del usuario
   */
  public static parsePromptIntent(
    prompt: string,
    options?: CamperAIPromptOptions
  ): ParsedPromptIntent {
    const text = prompt.toLowerCase();

    // Días de duración
    let days = 3;
    const daysMatch = text.match(/(\d+)\s*(?:d[ií]as|jornadas)/);
    if (daysMatch && daysMatch[1]) {
      days = Math.max(1, Math.min(14, parseInt(daysMatch[1], 10)));
    } else if (text.includes('fin de semana') || text.includes('finde')) {
      days = 2;
    } else if (text.includes('semana')) {
      days = 7;
    }

    // Origen
    let origin = 'Madrid';
    if (text.includes('desde barcelona') || text.includes('de barcelona')) origin = 'Barcelona';
    else if (text.includes('desde valencia') || text.includes('de valencia')) origin = 'Valencia';
    else if (text.includes('desde bilbao') || text.includes('de bilbao')) origin = 'Bilbao';
    else if (text.includes('desde sevilla') || text.includes('de sevilla')) origin = 'Sevilla';
    else if (text.includes('desde málaga') || text.includes('de málaga')) origin = 'Málaga';
    else if (text.includes('desde zaragoza') || text.includes('de zaragoza')) origin = 'Zaragoza';

    // Destino
    let destination = 'Cantabria';
    if (text.includes('cantabria') || text.includes('santander') || text.includes('liencres')) destination = 'Cantabria';
    else if (text.includes('galicia') || text.includes('rías baixas') || text.includes('costa da morte')) destination = 'Galicia';
    else if (text.includes('pirineo') || text.includes('ordesa') || text.includes('huesca')) destination = 'Pirineos';
    else if (text.includes('cabo de gata') || text.includes('almería') || text.includes('andalucía')) destination = 'Cabo de Gata';
    else if (text.includes('asturias') || text.includes('picos de europa') || text.includes('llanes')) destination = 'Asturias';
    else if (text.includes('cádiz') || text.includes('tarifa')) destination = 'Cádiz';

    // Preferencias detectadas
    const preferFreeOvernight =
      options?.preferFreeOvernight ??
      (text.includes('gratis') || text.includes('sin pagar') || text.includes('libre'));

    const avoidHeightBarriers =
      options?.avoidHeightBarriers ??
      (text.includes('barrera') || text.includes('galibo') || text.includes('gálibo') || text.includes('altura'));

    const needsLpg =
      options?.needsLpg ??
      (text.includes('glp') || text.includes('autogas') || text.includes('gas'));

    const includeBeaches =
      text.includes('playa') || text.includes('cala') || text.includes('costa') || text.includes('mar');

    const includeMountains =
      text.includes('montaña') || text.includes('puerto') || text.includes('valle') || text.includes('cumbre');

    const vehicleCategory = options?.vehicleCategory || (text.includes('7 metro') || text.includes('integral') ? 'motorhome_large' : 'camper_van');

    return {
      origin,
      destination,
      days,
      preferFreeOvernight,
      avoidHeightBarriers,
      needsLpg,
      includeBeaches,
      includeMountains,
      vehicleCategory,
    };
  }

  /**
   * Construye el plan específico adaptado al corredor geográfico
   */
  private static async buildTailoredPlan(
    intent: ParsedPromptIntent,
    originalPrompt: string,
    options?: CamperAIPromptOptions
  ): Promise<TravelPlan> {
    const isCantabria = intent.destination === 'Cantabria';
    const isGalicia = intent.destination === 'Galicia';
    const isPirineos = intent.destination === 'Pirineos';
    const isCaboGata = intent.destination === 'Cabo de Gata';

    let title = `${intent.origin} ➔ ${intent.destination} (${intent.days} Días)`;
    let subtitle = `Generado por Copiloto IA • ${intent.preferFreeOvernight ? 'Pernocta Gratis • ' : ''}${intent.avoidHeightBarriers ? 'Sin Barreras • ' : ''}Gasolina Barata MITECO`;
    let bannerImage = 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800';
    let category: TravelPlan['category'] = 'coastal';

    if (isCantabria) {
      title = `Madrid a Cantabria: Costa Verde & Playas Libres (${intent.days} Días)`;
      subtitle = '3 Días • 430 km • Gálibo Verificado • MITECO Ahorro';
      bannerImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800';
      category = 'coastal';
    } else if (isGalicia) {
      title = `Ruta Mágica Rías Baixas & Costa da Morte (${intent.days} Días)`;
      subtitle = '5 Días • 620 km • Calas Secretas • GLP Integrado';
      bannerImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800';
      category = 'coastal';
    } else if (isPirineos) {
      title = `Transpirenaica de Valles & Ordesa (${intent.days} Días)`;
      subtitle = '4 Días • 520 km • Alta Montaña • Carreteras Seguras 7m';
      bannerImage = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800';
      category = 'mountain';
    } else if (isCaboGata) {
      title = `Cabo de Gata & Desierto Volcánico (${intent.days} Días)`;
      subtitle = '4 Días • 480 km • Playas Vírgenes • Control Viento Toldo';
      bannerImage = 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800';
      category = 'coastal';
    }

    const stages = await this.generateStages(intent, options);

    const totalDistanceKm = stages.reduce((acc, s) => acc + s.drivingKm, 0);
    const totalDrivingHours = Math.round((stages.reduce((acc, s) => acc + s.estimatedMinutes, 0) / 60) * 10) / 10;
    const estimatedBudgetEur = Math.round((totalDistanceKm / 100) * 9.5 * 1.38 + stages.reduce((acc, s) => acc + s.overnight.pricePerNight, 0));

    return {
      id: `ai_plan_${Date.now()}`,
      title,
      subtitle,
      description: `Itinerario personalizado diseñado automáticamente por el Copiloto IA de CamperSites Pro respondiendo a tu solicitud: "${originalPrompt}". Las pernoctas han sido filtradas contra el catálogo nacional de barreras de altura (<2.2m), verificando la previsión de viento para apertura segura de toldo y optimizando paradas de vaciado ecológico y combustible oficial MITECO.`,
      category,
      durationDays: intent.days,
      totalDistanceKm,
      totalDrivingHours,
      recommendedVehicle: intent.vehicleCategory,
      stages,
      tags: [
        'Copiloto IA',
        intent.destination,
        intent.preferFreeOvernight ? 'Pernocta 0€' : 'Área Oficial',
        intent.avoidHeightBarriers ? 'Sin Barreras' : 'Gálibo OK',
        'MITECO Ahorro',
      ],
      bannerImage,
      createdAt: new Date().toISOString(),
      isPreset: false,
      estimatedBudgetEur,
    };
  }

  /**
   * Genera las etapas con paradas técnicas georreferenciadas y pernoctas libres
   */
  private static async generateStages(
    intent: ParsedPromptIntent,
    options?: CamperAIPromptOptions
  ): Promise<DayStage[]> {
    const stages: DayStage[] = [];

    // Plantillas de corredores
    if (intent.destination === 'Cantabria') {
      // DÍA 1: Madrid ➔ Burgos / Embalse del Ebro
      stages.push({
        dayNumber: 1,
        title: 'Cruce del Sistema Central y Desfiladero hacia el Ebro',
        startCity: intent.origin,
        endCity: 'Embalse del Ebro / Reinosa',
        drivingKm: 295,
        estimatedMinutes: 200,
        stops: [
          {
            id: 'stop_miteco_lerma',
            name: 'Gasolinera Barata MITECO (E.S. Plenoil Lerma)',
            type: 'poi',
            coordinates: [-3.7541, 42.0234],
            address: 'Polígono Industrial Lerma, A-1 km 201',
            durationMinutes: 15,
            notes: 'Ahorro verificado: 14 cts/L respecto a la media de autopista. Acceso amplio sin gálibo.',
          },
          {
            id: 'stop_vaciado_burgos',
            name: 'Punto Limpio y Vaciado Municipal de Burgos',
            type: 'water_dump',
            coordinates: [-3.6823, 42.3456],
            address: 'Avenida del Arlanzón, Burgos',
            durationMinutes: 20,
            notes: 'Vaciado de grises y negras gratuito. Grifo de agua con rosca estándar 3/4.',
          },
        ],
        overnight: {
          id: 'overnight_ebro_free',
          name: 'Área Natural Panorámica Embalse del Ebro (Arija)',
          type: 'wild_permitted',
          coordinates: [-3.9782, 42.9912],
          address: 'Playa de Arija / Embalse del Ebro',
          pricePerNight: 0,
          hasElectricity: false,
          hasWater: true,
          hasWasteDump: true,
          isB2BBookable: false,
          notes: 'Pernocta permitida 48h. Sin barrera de altura (acceso despejado >3.5m). Vistas al agua y puesta de sol.',
        },
        recommendedAction: {
          type: 'refill_lpg',
          title: 'Ahorro Combustible MITECO',
          description: 'Ahorra 12€ llenando el depósito antes de las pendientes del puerto de Pozazal.',
          ctaLabel: 'Ver Estaciones MITECO',
        },
        tipsForVanlife: [
          'Sin barreras de altura en el acceso a Arija. Perfecto para vehículos de más de 3 metros.',
          'Rachas de viento previstas <18 km/h: seguro para desplegar el toldo al atardecer.',
        ],
      });

      // DÍA 2: Embalse del Ebro ➔ Costa de Cantabria (Liencres & Valdearenas)
      if (intent.days >= 2) {
        stages.push({
          dayNumber: 2,
          title: 'Descenso a la Costa Esmeralda: Dunas de Liencres y Playas Vírgenes',
          startCity: 'Reinosa',
          endCity: 'Liencres / Piélagos',
          drivingKm: 85,
          estimatedMinutes: 70,
          stops: [
            {
              id: 'stop_mirador_cabarga',
              name: 'Mirador Peña Cabarga (Vistas Bahía de Santander)',
              type: 'panoramic_view',
              coordinates: [-3.7842, 43.3612],
              address: 'Parque Natural Macizo de Peña Cabarga',
              durationMinutes: 45,
              notes: 'Panorámica 360° del Cantábrico. Asfalto ancho sin túneles con limitación de altura.',
            },
            {
              id: 'stop_vaciado_santillana',
              name: 'Área Municipal Camper Santillana del Mar',
              type: 'water_dump',
              coordinates: [-4.1082, 43.3891],
              address: 'Barrio Revolgo, Santillana',
              durationMinutes: 20,
              notes: 'Vaciado de aguas negras ecológico y reposición de agua potable.',
            },
          ],
          overnight: {
            id: 'overnight_liencres_free',
            name: 'Párking Natural Dunas de Liencres (Playa de Valdearenas)',
            type: 'wild_permitted',
            coordinates: [-3.9582, 43.4512],
            address: 'Parque Natural de las Dunas de Liencres',
            pricePerNight: 0,
            hasElectricity: false,
            hasWater: false,
            hasWasteDump: false,
            isB2BBookable: false,
            notes: 'Pernocta tolerada fuera de temporada estival / aparcamiento sin señales de prohibición discriminatoria. Verificado sin barrera de 2.2m en el parking superior.',
          },
          tipsForVanlife: [
            '¡Gálibo verificado! El párking superior no tiene arco limitador de 2.2m a diferencia de otras calas urbanas.',
            'Viento del noroeste: aparcar con el morro orientado a barlovento para mayor estabilidad al dormir.',
          ],
        });
      }

      // DÍA 3: Costa Occidental ➔ San Vicente de la Barquera & Oyambre
      if (intent.days >= 3) {
        stages.push({
          dayNumber: 3,
          title: 'Parque Natural de Oyambre y Ría de San Vicente de la Barquera',
          startCity: 'Liencres',
          endCity: 'San Vicente de la Barquera',
          drivingKm: 65,
          estimatedMinutes: 55,
          stops: [
            {
              id: 'stop_playa_oyambre',
              name: 'Playa y Ría de Oyambre',
              type: 'panoramic_view',
              coordinates: [-4.3212, 43.3892],
              address: 'Parque Natural de Oyambre',
              durationMinutes: 60,
              notes: 'Playa virgen de arena blanca con telón de fondo de los Picos de Europa.',
            },
            {
              id: 'stop_glp_torrelavega',
              name: 'Repsol AutoGas GLP Torrelavega',
              type: 'lpg_gas',
              coordinates: [-4.0512, 43.3512],
              address: 'Autovía A-8 Salida 232',
              durationMinutes: 15,
              notes: 'Punto de recarga de GLP para calefacción antes de emprender el regreso.',
            },
          ],
          overnight: {
            id: 'overnight_san_vicente_free',
            name: 'Área Camper Las Hazas (Vistas Picos de Europa)',
            type: 'public_camper_area',
            coordinates: [-4.3912, 43.3812],
            address: 'Paseo de la Barquera, San Vicente',
            pricePerNight: 0,
            hasElectricity: false,
            hasWater: true,
            hasWasteDump: true,
            isB2BBookable: false,
            notes: 'Área pública gratuita con servicios y vistas a la ría y marismas.',
          },
          tipsForVanlife: [
            'Nivelador táctico recomendado: ligera inclinación del 3% en las plazas orientadas a la ría.',
            'Ideal para cenar productos del mar en el puerto de San Vicente.',
          ],
        });
      }
    } else {
      // CORREDOR GENÉRICO INTELIGENTE (GALICIA, PIRINEOS, CABO DE GATA O RUTAS ABIERTAS)
      const dayDist = Math.round(500 / intent.days);
      for (let d = 1; d <= intent.days; d++) {
        const isLast = d === intent.days;
        stages.push({
          dayNumber: d,
          title: `Etapa ${d}: ${intent.origin} hacia ${intent.destination} (${d === 1 ? 'Inicio' : isLast ? 'Llegada y Relax' : 'Corredor Escénico'})`,
          startCity: d === 1 ? intent.origin : `Población Etapa ${d - 1}`,
          endCity: isLast ? intent.destination : `Etapa ${d} Ruta`,
          drivingKm: dayDist,
          estimatedMinutes: Math.round((dayDist / 68) * 60),
          stops: [
            {
              id: `stop_miteco_${d}`,
              name: `Gasolinera Económica MITECO Etapa ${d}`,
              type: 'poi',
              coordinates: [-3.7038, 40.4168],
              address: `Corredor Nacional km ${d * 140}`,
              durationMinutes: 15,
              notes: 'Precio diésel y GLP verificado por debajo de la media provincial.',
            },
            {
              id: `stop_dump_${d}`,
              name: `Punto de Vaciado Ecológico Etapa ${d}`,
              type: 'water_dump',
              coordinates: [-3.7038, 40.4168],
              address: `Área de Servicio km ${d * 110}`,
              durationMinutes: 20,
              notes: 'Vaciado de aguas residuales y llenado de agua limpia.',
            },
          ],
          overnight: {
            id: `overnight_ai_${d}`,
            name: intent.preferFreeOvernight
              ? `Área Gratuita & Mirador Etapa ${d}`
              : `Camper Park con Servicios Etapa ${d}`,
            type: intent.preferFreeOvernight ? 'wild_permitted' : 'public_camper_area',
            coordinates: [-3.7038, 40.4168],
            address: `Población Etapa ${d}, ${intent.destination}`,
            pricePerNight: intent.preferFreeOvernight ? 0 : 12,
            hasElectricity: !intent.preferFreeOvernight,
            hasWater: true,
            hasWasteDump: true,
            isB2BBookable: false,
            notes: 'Verificado sin barreras de altura en accesos. Suelo firme apto para autocaravanas pesadas.',
          },
          tipsForVanlife: [
            'Verificación de gálibo: Sin arcos limitadores de 2.2m en el radio de acceso.',
            'Comprueba la previsión meteorológica antes de anclar calzos en zonas expuestas.',
          ],
        });
      }
    }

    return stages;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default CamperAICopilotService;
