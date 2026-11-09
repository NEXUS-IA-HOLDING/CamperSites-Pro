/**
 * AffiliatePartnerService.ts
 * Integración de Afiliados y Acuerdos Estratégicos para Autocaravanas y Campers
 *
 * Verticales clave:
 * 1. Combustibles y GLP: Repsol (Waylet), Cepsa (Gow), BP, Galp.
 * 2. Ferries Marítimos: Balearia, Trasmediterránea / Armas, Direct Ferries (Marruecos, Baleares, Canarias).
 * 3. Seguros Especializados Camper: Allianz Camper, IATI Escapadas, CamperCover / Zalba-Caldú.
 */
import { Linking, Clipboard } from 'react-native';

export interface AffiliatePartner {
  id: string;
  category: 'fuel_lpg' | 'ferry' | 'insurance' | 'accessories' | 'tech' | 'hosting';
  brandName: string;
  name?: string;
  title: string;
  badge: string;
  badgeText?: string;
  discountSummary: string;
  discountText?: string;
  description: string;
  perks: string[];
  benefits?: string[];
  affiliateUrl: string;
  promoCode?: string;
  logoIcon: string;
  iconName?: string;
  accentColor: string;
  priority?: number;
  deepLinkUri?: string;
  utmCampaign?: string;
  limitedTimeOffer?: string;
}

export const AFFILIATE_PARTNERS: AffiliatePartner[] = [
  // --- PASE FUNDADOR PIONERO (FINANCIACIÓN GOOGLE PLAY & APPLE STORE) ---
  {
    id: 'founder_pass_vip',
    category: 'tech',
    brandName: 'CamperSites Pro',
    name: 'Pase Fundador Pionero VIP',
    title: '👑 Pase Fundador Pionero • Acceso VIP Vitalicio',
    badge: '⭐ SOLO 100 PLAZAS',
    badgeText: '⭐ Solo 100 Plazas',
    discountSummary: 'Pago único 19,99€ (Ahorro vitalicio de 48€/año)',
    discountText: 'Acceso ilimitado de por vida sin suscripciones',
    description: 'Conviértete en uno de los 100 primeros miembros pioneros. Tu aportación financia directamente la publicación oficial en Google Play Store y Apple Developer.',
    perks: [
      'Acceso VIP permanente de por vida a todas las funciones presentes y futuras',
      'Satélite fotorrealista Esri HD, 3D Terrarium y Rutas Valhalla sin restricciones',
      'Insignia dorada exclusiva "Fundador #001" visible en tu perfil público',
      'Acceso prioritario a betas cerradas y canal privado con el equipo',
    ],
    benefits: [
      'Sin cuotas mensuales ni renovaciones anuales jamás',
      'Impulso directo para publicar la app en Google Play y Apple Store',
      'Comunidad exclusiva de autocaravanistas pioneros',
    ],
    affiliateUrl: 'https://nexus-ia-holding.github.io/CamperSites-Pro/patrocinios.html',
    promoCode: 'FUNDADOR-100',
    logoIcon: 'crown',
    iconName: 'crown',
    accentColor: '#10B981',
    priority: -2,
    limitedTimeOffer: 'Plazas Limitadas para la Comunidad',
    utmCampaign: 'founder_pass',
  },

  // --- ENERGÍA SOLAR & BATERÍAS LIFEPO4 (ECOFLOW & BLUETTI) ---
  {
    id: 'ecoflow_solar_generators',
    category: 'accessories',
    brandName: 'EcoFlow & Bluetti',
    name: 'EcoFlow Estaciones Solares LiFePO4',
    title: 'EcoFlow & Bluetti • Energía Solar 230V Portátil',
    badge: '☀️ 10% DTO CAMPER',
    badgeText: '☀️ 10% Dto. Camper',
    discountSummary: 'Hasta 10% de descuento en generadores solares y placas',
    discountText: 'Independencia energética 230V silenciosa para microondas y aire acondicionado',
    description: 'Baterías portátiles LiFePO4 de carga ultra rápida (0 a 80% en 50 min) y paneles solares plegables para no depender de tomas de camping.',
    perks: [
      'Onda senoidal pura de 600W a 2400W para cocinar y trabajar en remoto',
      'Baterías de química LiFePO4 con más de 3.000 ciclos de vida (10 años)',
      'Carga solar directa con hasta 500W desde el techo de la camper',
    ],
    benefits: [
      'Total libertad de pernocta sin necesidad de engancharte a 220V',
      'Silencioso: cero emisiones y sin ruidos de generadores de gasolina',
    ],
    affiliateUrl: 'https://es.ecoflow.com/',
    promoCode: 'CAMPERPRO10',
    logoIcon: 'solar-power',
    iconName: 'solar-power',
    accentColor: '#0284C7',
    priority: -1,
    limitedTimeOffer: 'Campaña Primavera - Verano',
    utmCampaign: 'ecoflow_camper',
  },

  // --- HOSTING WEB & CLOUD TECH (HOSTINGER) ---
  {
    id: 'hostinger_referral',
    category: 'hosting',
    brandName: 'Hostinger',
    name: 'Hostinger Web & Cloud Hosting',
    title: 'Hostinger • Servidores VPS & Cloud Hosting',
    badge: '🔥 20% DTO EXCLUSIVO',
    badgeText: '🔥 20% Dto. Exclusivo',
    discountSummary: '20% de descuento directo en tu primera compra',
    discountText: '20% de descuento en planes de 12 meses o más (VPS, Cloud y Web)',
    description: 'Alojamiento web de alta velocidad, servidores VPS y servicios en la nube con un 20% de descuento con nuestro código de recomendación oficial.',
    perks: [
      '20% de descuento garantizado con el código 2VQAUTHHOXNH',
      'Válido para Alojamiento VPS, en la nube y agencias (planes 12+ meses)',
      'Panel hPanel ultra intuitivo, certificados SSL gratis y discos NVMe',
      'Soporte técnico 24/7 en español y 30 días de garantía',
    ],
    benefits: [
      '20% de descuento directo al aplicar el código de recomendación',
      'Alojamiento VPS, en la nube y para agencias (planes de 12 meses o más)',
      'Gana velocidad y estabilidad para tus proyectos online',
    ],
    affiliateUrl: 'https://www.hostinger.com/es?REFERRALCODE=2VQAUTHHOXNH',
    promoCode: '2VQAUTHHOXNH',
    logoIcon: 'server-network',
    iconName: 'server-network',
    accentColor: '#673AB7',
    priority: 0,
    limitedTimeOffer: 'Oferta Especial por Tiempo Limitado',
    utmCampaign: 'hostinger_referral',
  },

  // --- COMBUSTIBLES Y GLP ---
  {
    id: 'repsol_waylet_glp',
    category: 'fuel_lpg',
    brandName: 'Repsol AutoGas GLP',
    name: 'Repsol AutoGas GLP',
    title: 'Repsol Waylet • GLP & Diésel Camper',
    badge: '⛽ Ahorro 10 cts/L',
    badgeText: '⛽ Ahorro 10 cts/L',
    discountSummary: 'Hasta 10 céntimos/litro en GLP y combustible',
    discountText: 'Hasta 10 céntimos/litro en GLP y combustible',
    description: 'La mayor red de surtidores de AutoGas GLP en España para calefacción Truma y propano camper.',
    perks: [
      'Más de 420 puntos con GLP para autocaravanas en España',
      'Pago directo desde la app móvil sin pasar por caja',
      'Lavaderos especiales de techo alto >3.8m adaptados a campers',
    ],
    benefits: [
      'Más de 420 puntos con GLP para autocaravanas en España',
      'Pago directo desde la app móvil sin pasar por caja',
      'Lavaderos especiales de techo alto >3.8m adaptados a campers',
    ],
    affiliateUrl: 'https://repsol.es/particulares/vehiculo/autogas-glp/?promo=CAMPERSITESPRO',
    promoCode: 'WAYLETCAMPER',
    logoIcon: 'gas-station',
    iconName: 'gas-station',
    accentColor: '#FF6D00',
    priority: 1,
    deepLinkUri: 'waylet://home',
    utmCampaign: 'commercial_partners',
  },
  {
    id: 'cepsa_gow_glp',
    category: 'fuel_lpg',
    brandName: 'Cepsa Gow',
    name: 'Cepsa Gow',
    title: 'Cepsa Gow • Estaciones con GLP & AdBlue',
    badge: '🔥 5 cts/L saldo',
    badgeText: '🔥 5 cts/L saldo',
    discountSummary: '5 céntimos/litro de saldo acumulable en cada repostaje',
    discountText: '5 céntimos/litro de saldo acumulable en cada repostaje',
    description: 'Puntos estratégicos en autopistas con surtidores de GLP y mangueras de AdBlue para furgonetas camper.',
    perks: [
      'Puntos de carga de agua y vaciado en estaciones de servicio seleccionadas',
      'Descuento directo en lubricantes y gas embotellado de propano',
      'Áreas de descanso seguras e iluminadas para pernocta rápida',
    ],
    benefits: [
      'Puntos de carga de agua y vaciado en estaciones de servicio seleccionadas',
      'Descuento directo en lubricantes y gas embotellado de propano',
      'Áreas de descanso seguras e iluminadas para pernocta rápida',
    ],
    affiliateUrl: 'https://cepsa.es/es/particular/cepsagow?affiliate=campersites',
    promoCode: 'CEPSACAMPER5',
    logoIcon: 'fuel',
    iconName: 'fuel',
    accentColor: '#D32F2F',
    priority: 2,
    deepLinkUri: 'cepsagow://home',
    utmCampaign: 'commercial_partners',
  },

  // --- FERRIES MARÍTIMOS (BALEARES, CANARIAS, MARRUECOS) ---
  {
    id: 'balearia_camper_ferry',
    category: 'ferry',
    brandName: 'Baleària Ferries',
    name: 'Baleària Ferries',
    title: 'Baleària • Rutas Baleares y Marruecos',
    badge: '⛴️ 15% Dto. Vehículo',
    badgeText: '⛴️ 15% Dto. Vehículo',
    discountSummary: '15% de descuento en pasaje de autocaravana y camper',
    discountText: '15% de descuento en pasaje de autocaravana y camper',
    description: 'Conexiones directas desde Barcelona, Valencia y Dénia a Ibiza/Mallorca, y Algeciras a Tánger Med.',
    perks: [
      'Bodegas con tomas eléctricas de 220V para frigoríficos durante la travesía',
      'Camarotes pet-friendly para viajar con tus mascotas',
      'Embarque prioritario para vehículos de longitud >6.5m y altura >3m',
    ],
    benefits: [
      'Bodegas con tomas eléctricas de 220V para frigoríficos durante la travesía',
      'Camarotes pet-friendly para viajar con tus mascotas',
      'Embarque prioritario para vehículos de longitud >6.5m y altura >3m',
    ],
    affiliateUrl: 'https://balearia.com/es/rutas/autocaravanas?partner=campersitespro',
    promoCode: 'BALEARIACAMPER15',
    logoIcon: 'ferry',
    iconName: 'ferry',
    accentColor: '#0288D1',
    priority: 3,
    deepLinkUri: 'balearia://booking',
    utmCampaign: 'commercial_partners',
  },
  {
    id: 'trasmed_armas_ferry',
    category: 'ferry',
    brandName: 'Trasmediterránea / Naviera Armas',
    name: 'Trasmediterránea / Naviera Armas',
    title: 'Trasmediterránea • Canarias & Norte de África',
    badge: '🌊 Tarifa Camper Pack',
    badgeText: '🌊 Tarifa Camper Pack',
    discountSummary: 'Tarifa reducida con camarote incluido para autocaravanas',
    discountText: 'Tarifa reducida con camarote incluido para autocaravanas',
    description: 'Líneas regulares Cádiz - Islas Canarias y Almería/Málaga - Melilla y Nador.',
    perks: [
      'Permiso de transporte de bombonas de gas precintadas homologadas',
      'Descuento en billete de ida y vuelta con fecha abierta',
      'Cancelación gratuita hasta 48 horas antes del embarque',
    ],
    benefits: [
      'Permiso de transporte de bombonas de gas precintadas homologadas',
      'Descuento en billete de ida y vuelta con fecha abierta',
      'Cancelación gratuita hasta 48 horas antes del embarque',
    ],
    affiliateUrl: 'https://trasmediterranea.es/ofertas/camper?code=CAMPERSITES',
    promoCode: 'ARMASCAMPER',
    logoIcon: 'ship-wheel',
    iconName: 'ship-wheel',
    accentColor: '#00796B',
    priority: 4,
    deepLinkUri: 'trasmed://ofertas',
    utmCampaign: 'commercial_partners',
  },

  // --- SEGUROS ESPECIALIZADOS DE AUTOCARAVANA Y CAMPER ---
  {
    id: 'allianz_camper_seguros',
    category: 'insurance',
    brandName: 'Allianz Camper & RV',
    name: 'Allianz Camper & RV',
    title: 'Allianz • Seguro Todo Riesgo Camper',
    badge: '🛡️ Grúa Sin Límite Tonelaje',
    badgeText: '🛡️ Grúa Sin Límite Tonelaje',
    discountSummary: 'Hasta un 20% de descuento en póliza Todo Riesgo',
    discountText: 'Hasta un 20% de descuento en póliza Todo Riesgo',
    description: 'La póliza líder del mercado para vehículos vivienda de alto tonelaje y campers gran volumen.',
    perks: [
      'Asistencia en carretera 24/7 sin límite de peso ni restricción de altura/gálibo',
      'Robo y daños del equipamiento camper interior (nevera, placas solares, baterías)',
      'Vehículo de sustitución camper o cobertura de noches de hotel',
    ],
    benefits: [
      'Asistencia en carretera 24/7 sin límite de peso ni restricción de altura/gálibo',
      'Robo y daños del equipamiento camper interior (nevera, placas solares, baterías)',
      'Vehículo de sustitución camper o cobertura de noches de hotel',
    ],
    affiliateUrl: 'https://allianz.es/seguros-camper?partner=campersitespro',
    promoCode: 'ALLIANZCAMPER20',
    logoIcon: 'shield-car',
    iconName: 'shield-car',
    accentColor: '#1565C0',
    priority: 5,
    deepLinkUri: 'allianz://seguros',
    utmCampaign: 'commercial_partners',
  },
  {
    id: 'iati_escapadas_camper',
    category: 'insurance',
    brandName: 'IATI Escapadas',
    name: 'IATI Escapadas',
    title: 'IATI Escapadas • Asistencia en Viaje y Camper',
    badge: '🚐 5% Dto. Exclusivo',
    badgeText: '🚐 5% Dto. Exclusivo',
    discountSummary: '5% de descuento en seguro médico y de viaje en ruta',
    discountText: '5% de descuento en seguro médico y de viaje en ruta',
    description: 'Cobertura médica internacional, rescate en pista forestal y repatriación en toda Europa y Marruecos.',
    perks: [
      'Cobertura de deportes de aventura, senderismo y cicloturismo',
      'Conductor profesional en caso de indisposición médica',
      'Gastos de cerrajería y pérdida de llaves del vehículo vivienda',
    ],
    benefits: [
      'Cobertura de deportes de aventura, senderismo y cicloturismo',
      'Conductor profesional en caso de indisposición médica',
      'Gastos de cerrajería y pérdida de llaves del vehículo vivienda',
    ],
    affiliateUrl: 'https://iatiseguros.com/seguro-escapadas/?r=campersitespro',
    promoCode: 'IATIESCAPADAS5',
    logoIcon: 'car-emergency',
    iconName: 'car-emergency',
    accentColor: '#E65100',
    priority: 6,
    deepLinkUri: 'iati://escapadas',
    utmCampaign: 'commercial_partners',
  },
];

export class AffiliatePartnerServiceImpl {
  public getPartners(): AffiliatePartner[] {
    return AFFILIATE_PARTNERS;
  }

  public getPartnersByCategory(category?: string): AffiliatePartner[] {
    if (!category || category === 'all') return AFFILIATE_PARTNERS;
    return AFFILIATE_PARTNERS.filter((p) => p.category === category);
  }

  public getPartnerById(id: string): AffiliatePartner | undefined {
    return AFFILIATE_PARTNERS.find((p) => p.id === id);
  }

  public getAffiliateLink(partner: AffiliatePartner): string {
    return this.buildUtmUrl(partner);
  }

  public buildUtmUrl(partner: AffiliatePartner, customCampaign?: string): string {
    const campaign = customCampaign || partner.utmCampaign || 'commercial_partners';
    const source = 'campersites_pro';
    const medium = 'app_referral';
    const content = partner.id;

    try {
      const url = new URL(partner.affiliateUrl);
      url.searchParams.set('utm_source', source);
      url.searchParams.set('utm_medium', medium);
      url.searchParams.set('utm_campaign', campaign);
      url.searchParams.set('utm_content', content);
      return url.toString();
    } catch {
      const base = partner.affiliateUrl;
      const separator = base.includes('?') ? '&' : '?';
      return `${base}${separator}utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}&utm_content=${encodeURIComponent(content)}`;
    }
  }

  public async openPartner(partner: AffiliatePartner): Promise<{ openedApp: boolean; url: string }> {
    if (partner.deepLinkUri) {
      try {
        const canOpen = await Linking.canOpenURL(partner.deepLinkUri);
        if (canOpen) {
          await Linking.openURL(partner.deepLinkUri);
          return { openedApp: true, url: partner.deepLinkUri };
        }
      } catch {
        // Fall back gracefully to UTM web URL
      }
    }

    const finalUrl = this.buildUtmUrl(partner);
    try {
      await Linking.openURL(finalUrl);
    } catch {
      // In case Linking fails in test/mock environment
    }
    return { openedApp: false, url: finalUrl };
  }

  public copyPromoCode(promoCode: string): void {
    if (promoCode) {
      Clipboard.setString(promoCode);
    }
  }
}

export const affiliatePartnerService = new AffiliatePartnerServiceImpl();
