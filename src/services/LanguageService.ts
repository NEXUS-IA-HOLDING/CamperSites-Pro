/**
 * LanguageService.ts - Sistema Ligero de Internacionalización Multi-idioma
 * CamperSites Pro - Soporte para la Comunidad Europea de Autocaravanas y Campers
 *
 * Idiomas soportados:
 * - 🇪🇸 Español (es) - Nativo
 * - 🇬🇧 English (en) - Internacional
 * - 🇫🇷 Français (fr) - Comunidad nómada y Park4Night
 * - 🇩🇪 Deutsch (de) - Mayor parque de autocaravanas de Europa (Bürstner, Hymer, Dethleffs)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'es' | 'en' | 'fr' | 'de';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
];

const LANGUAGE_STORAGE_KEY = '@campersites_selected_language';

const TRANSLATIONS = {
  es: {
    // Navegación & Cabina 3D
    nav_start: 'Iniciar Navegación',
    nav_stop: 'Finalizar Ruta',
    nav_simulate: '🎮 Simular Conducción 3D (Demo)',
    nav_simulating: 'Simulando Ruta en 3D...',
    nav_recenter: 'Modo Conducción 3D',
    nav_fastest: 'Ruta Rápida',
    nav_scenic: 'Ruta Panorámica / Camper',
    nav_select_route: 'Selecciona tu Ruta',
    nav_speed_gps: 'KM/H GPS',
    nav_speed_limit: 'LÍMITE VÍA',
    nav_radar_alert: 'RADAR DE TRAMO DGT A',
    nav_avg_speed: 'Velocidad Media',
    nav_legal: 'Legal',
    nav_exceeded: '¡Exceso de velocidad!',
    
    // Clima & Toldo
    weather_safe_awning: '🛡️ TOLDO SEGURO',
    weather_warning_awning: '⚠️ RECOGER TOLDO',
    weather_gusts: 'Rachas de viento',
    weather_acoustic_alert: 'Alarma de viento activada',
    
    // Bóveda Offline
    offline_vault_title: 'Bóveda 100% Offline',
    offline_vault_desc: 'Más de 517.000 áreas de pernocta verificadas sin cobertura móvil.',
    offline_download_all: 'Descargar Toda Europa (1 Clic)',
    offline_ready: 'Listo para viajar sin 4G',
    
    // Spots & Pernocta
    spot_verified: '🛡️ VERIFICADO',
    spot_water: '💧 Agua Potable',
    spot_waste: '🚿 Vaciado de Aguas',
    spot_electricity: '⚡ Conexión 220V',
    spot_sea_view: '🌊 Vista al Mar',
    spot_pet_friendly: '🐾 Admite Mascotas',
    spot_free_parking: '🅿️ Gratuito',
    
    // Ajustes & Perfil
    settings_title: 'Configuración de Cabina',
    settings_language: 'Idioma de la Aplicación',
    settings_vehicle: 'Gálibo y Vehículo',
    settings_audio: 'Canal de Audio',
    settings_cursor: 'Icono del Vehículo',
    settings_crowdfunding: 'Meta Licencia Google Play',
    settings_share: 'Compartir App',
  },
  en: {
    // Navigation & 3D Cockpit
    nav_start: 'Start Navigation',
    nav_stop: 'End Route',
    nav_simulate: '🎮 Simulate 3D Drive (Demo)',
    nav_simulating: 'Simulating 3D Route...',
    nav_recenter: '3D Cockpit Driving Mode',
    nav_fastest: 'Fastest Route',
    nav_scenic: 'Scenic / Camper Route',
    nav_select_route: 'Select Your Route',
    nav_speed_gps: 'KM/H GPS',
    nav_speed_limit: 'SPEED LIMIT',
    nav_radar_alert: 'AVERAGE SPEED CAMERA AT',
    nav_avg_speed: 'Average Speed',
    nav_legal: 'Legal',
    nav_exceeded: 'Speed Limit Exceeded!',
    
    // Weather & Awning
    weather_safe_awning: '🛡️ AWNING SAFE',
    weather_warning_awning: '⚠️ RETRACT AWNING',
    weather_gusts: 'Wind gusts',
    weather_acoustic_alert: 'High wind alarm active',
    
    // Offline Vault
    offline_vault_title: '100% Offline Vault',
    offline_vault_desc: 'Over 517,000 verified camper spots without cellular service.',
    offline_download_all: 'Download All Europe (1 Click)',
    offline_ready: 'Ready for off-grid travel',
    
    // Spots & Campsites
    spot_verified: '🛡️ VERIFIED',
    spot_water: '💧 Fresh Water',
    spot_waste: '🚿 Waste Dump',
    spot_electricity: '⚡ 220V Hookup',
    spot_sea_view: '🌊 Sea View',
    spot_pet_friendly: '🐾 Pet Friendly',
    spot_free_parking: '🅿️ Free Parking',
    
    // Settings & Profile
    settings_title: 'Cockpit Settings',
    settings_language: 'App Language',
    settings_vehicle: 'Vehicle Dimensions',
    settings_audio: 'Audio Channel',
    settings_cursor: 'Vehicle Map Cursor',
    settings_crowdfunding: 'Google Play License Goal',
    settings_share: 'Share App',
  },
  fr: {
    // Navigation & Cockpit 3D
    nav_start: 'Démarrer la Navigation',
    nav_stop: 'Arrêter l’Itinéraire',
    nav_simulate: '🎮 Simuler la Conduite 3D (Démo)',
    nav_simulating: 'Simulation 3D en cours...',
    nav_recenter: 'Mode Conduite 3D',
    nav_fastest: 'Itinéraire le plus rapide',
    nav_scenic: 'Itinéraire Panoramique Camping-Car',
    nav_select_route: 'Choisissez votre itinéraire',
    nav_speed_gps: 'KM/H GPS',
    nav_speed_limit: 'LIMITATION',
    nav_radar_alert: 'RADAR TRONÇON À',
    nav_avg_speed: 'Vitesse Moyenne',
    nav_legal: 'Légal',
    nav_exceeded: 'Vitesse Excessive !',
    
    // Météo & Store
    weather_safe_awning: '🛡️ STORE SÉCURISÉ',
    weather_warning_awning: '⚠️ RENTRER LE STORE',
    weather_gusts: 'Rafales de vent',
    weather_acoustic_alert: 'Alarme vent fort active',
    
    // Bóveda Offline
    offline_vault_title: 'Coffre 100% Hors-Ligne',
    offline_vault_desc: 'Plus de 517.000 aires vérifiées sans aucune connexion 4G.',
    offline_download_all: 'Télécharger toute l’Europe (1 Clic)',
    offline_ready: 'Prêt pour voyager hors réseau',
    
    // Spots & Aires
    spot_verified: '🛡️ VÉRIFIÉ',
    spot_water: '💧 Eau Potable',
    spot_waste: '🚿 Vidange des Eaux',
    spot_electricity: '⚡ Électricité 220V',
    spot_sea_view: '🌊 Vue sur Mer',
    spot_pet_friendly: '🐾 Animaux Acceptés',
    spot_free_parking: '🅿️ Gratuit',
    
    // Réglages & Profil
    settings_title: 'Configuration du Cockpit',
    settings_language: 'Langue de l’Application',
    settings_vehicle: 'Gabarit du Véhicule',
    settings_audio: 'Canal Audio',
    settings_cursor: 'Curseur de Carte',
    settings_crowdfunding: 'Objectif Licence Google Play',
    settings_share: 'Partager l’Application',
  },
  de: {
    // Navigation & 3D Cockpit
    nav_start: 'Navigation Starten',
    nav_stop: 'Route Beenden',
    nav_simulate: '🎮 3D-Fahrt Simulieren (Demo)',
    nav_simulating: '3D-Simulation läuft...',
    nav_recenter: '3D-Fahrmodus Zentrieren',
    nav_fastest: 'Schnellste Route',
    nav_scenic: 'Panoramaroute / Wohnmobil',
    nav_select_route: 'Route Auswählen',
    nav_speed_gps: 'KM/H GPS',
    nav_speed_limit: 'TEMPOLIMIT',
    nav_radar_alert: 'STRECKENRADAR IN',
    nav_avg_speed: 'Durchschnittstempo',
    nav_legal: 'Regelkonform',
    nav_exceeded: 'Geschwindigkeit überschritten!',
    
    // Wetter & Markise
    weather_safe_awning: '🛡️ MARKISE SICHER',
    weather_warning_awning: '⚠️ MARKISE EINFANGEN',
    weather_gusts: 'Windböen',
    weather_acoustic_alert: 'Starkwind-Alarm aktiv',
    
    // Offline Tresor
    offline_vault_title: '100% Offline-Tresor',
    offline_vault_desc: 'Über 517.000 geprüfte Stellplätze komplett ohne Mobilfunk.',
    offline_download_all: 'Ganz Europa Herunterladen (1 Klick)',
    offline_ready: 'Bereit für autarkes Reisen',
    
    // Spots & Stellplätze
    spot_verified: '🛡️ GEPRÜFT',
    spot_water: '💧 Frischwasser',
    spot_waste: '🚿 Entsorgungsstation',
    spot_electricity: '⚡ 220V Stromanschluss',
    spot_sea_view: '🌊 Meerblick',
    spot_pet_friendly: '🐾 Haustiere Erlaubt',
    spot_free_parking: '🅿️ Kostenlos',
    
    // Einstellungen & Profil
    settings_title: 'Cockpit-Einstellungen',
    settings_language: 'App-Sprache',
    settings_vehicle: 'Fahrzeugabmessungen',
    settings_audio: 'Audiokanal',
    settings_cursor: 'Fahrzeugsymbol',
    settings_crowdfunding: 'Ziel Google Play Lizenz',
    settings_share: 'App Teilen',
  },
};

class LanguageService {
  private currentLanguage: SupportedLanguage = 'es';
  private listeners: Array<(lang: SupportedLanguage) => void> = [];

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && (saved === 'es' || saved === 'en' || saved === 'fr' || saved === 'de')) {
        this.currentLanguage = saved as SupportedLanguage;
      }
    } catch {
      this.currentLanguage = 'es';
    }
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public async setLanguage(lang: SupportedLanguage): Promise<void> {
    this.currentLanguage = lang;
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {}
    this.notifyListeners();
  }

  public t(key: keyof typeof TRANSLATIONS.es): string {
    const dict = TRANSLATIONS[this.currentLanguage] || TRANSLATIONS.es;
    return (dict as any)[key] || TRANSLATIONS.es[key] || key;
  }

  public subscribe(listener: (lang: SupportedLanguage) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.currentLanguage));
  }
}

export const languageService = new LanguageService();
