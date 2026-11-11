import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  FlatList,
  ScrollView,
  Vibration,
  Share,
  Linking,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useFocusEffect } from '@react-navigation/native';
import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import haversine from 'haversine-distance';
import { supabase } from '../lib/supabase';
import { FLATLIST_PERF_PROPS } from '../utils/performance';
import { Logger } from '../utils/logger';
import ReportAlertButton from '../components/ReportAlertButton';
import { LocationReviewsModal } from '../components/LocationReviewsModal';
import { RouteModeSelector } from '../components/RouteModeSelector';
import { SpeedGaugesHUD } from '../components/SpeedGaugesHUD';
import { MapControlDock } from '../components/MapControlDock';
import { VehicleMapCursor } from '../components/VehicleMapCursor';
import { VehicleCursorSelectorModal } from '../components/VehicleCursorSelectorModal';
import { CockpitSearchBar, QUICK_FILTERS, QuickFilter } from '../components/CockpitSearchBar';
import { CockpitLocationDetailSheet } from '../components/CockpitLocationDetailSheet';
import { MarkedPointDetailSheet, MarkedPointItem } from '../components/MarkedPointDetailSheet';
import { CockpitTurnByTurnHUD } from '../components/CockpitTurnByTurnHUD';
import { LaneGuidanceHUD } from '../components/LaneGuidanceHUD';
import { CockpitSectionRadarHUD } from '../components/CockpitSectionRadarHUD';
import { CockpitHazardVerificationHUD } from '../components/CockpitHazardVerificationHUD';
import { FuelPriceComparatorModal } from '../components/FuelPriceComparatorModal';
import { CamperLevelerModal } from '../components/CamperLevelerModal';
import { OvernightSleepModeModal } from '../components/OvernightSleepModeModal';
import { VehicleTelemetryModal } from '../components/VehicleTelemetryModal';
import { CamperTravelPlannerModal } from '../components/CamperTravelPlannerModal';
import { CamperVehicleDimensionsModal } from '../components/CamperVehicleDimensionsModal';
import { CamperValhallaRoutingService } from '../services/CamperValhallaRoutingService';
import { FuelStationItem } from '../services/FuelPriceService';
import {
  CommunityAlert,
  ALERT_CONFIG as COMMUNITY_ALERT_CONFIG,
  getNearbyAlerts,
  voteAlert,
} from '../lib/communityAlerts';
import {
  AdvancedSpotFilterModal,
  SpotFilterCriteria,
  DEFAULT_FILTER_CRITERIA,
} from '../components/AdvancedSpotFilterModal';
import { AudioAlertService } from '../services/AudioAlertService';
import { CockpitNightModeService, NightModeState } from '../services/CockpitNightModeService';
import {
  sectionRadarTracker,
  SectionRadarStatus,
} from '../services/SectionRadarTracker';
import { offlineSpotVault } from '../services/OfflineSpotVaultService';
import { ClearanceHazardService } from '../services/ClearanceHazardService';
import { drivingSimulationService } from '../services/DrivingSimulationService';
import { routeHistoryService } from '../services/RouteHistoryService';
import {
  navigationEngine,
  NavigationProgress,
} from '../services/TurnByTurnNavigationEngine';
import {
  AudioAlertMode,
  ClearanceHazard,
  DrivingPreferences,
  MapStyleType,
  TachographStatus,
  VehicleCursorType,
  VehicleProfileMode,
} from '../types/assistant';
import { VehicleRoutingService } from '../services/VehicleRoutingService';

// Inicializar MapLibre (sin token - usa raster gratuito)
MapLibreGL.setAccessToken(null);

// Función de Auto-Zoom Adaptativo por Velocidad y Asistencia en Cruces/Visibilidad
export function calculateSpeedAdaptiveCamera(
  speedKmH: number,
  distanceToManeuverMeters?: number
): { zoom: number; pitch: number } {
  // 1. Asistencia en Maniobras / Cruces / Rotondas (< 180 metros de distancia)
  // Permite al conductor identificar el carril y salida exactos con máxima claridad en niebla, noche o rutas desconocidas
  if (
    distanceToManeuverMeters !== undefined &&
    distanceToManeuverMeters > 0 &&
    distanceToManeuverMeters < 180
  ) {
    const proximityRatio = Math.max(0, distanceToManeuverMeters / 180);
    const junctionZoom = 18.3 - proximityRatio * 0.5; // Zoom 18.3 a 17.8 cerca del cruce
    const junctionPitch = 50 + proximityRatio * 10;   // Inclinación 50° para vista cenital-perspectiva del cruce
    return { zoom: Math.min(18.6, junctionZoom), pitch: junctionPitch };
  }

  // 2. Escala Adaptativa según Velocidad del Vehículo (km/h)
  if (speedKmH <= 25) {
    // Maniobras a paso de peatón / calles estrechas de pueblos / entrada a campings
    return { zoom: 18.2, pitch: 58 };
  } else if (speedKmH <= 50) {
    // Ciudad / travesías urbanas (25 a 50 km/h) -> zoom suave de 18.2 a 17.2
    const t = (speedKmH - 25) / 25;
    return { zoom: 18.2 - t * 1.0, pitch: 58 };
  } else if (speedKmH <= 80) {
    // Carreteras convencionales / secundarias (50 a 80 km/h) -> zoom de 17.2 a 16.2
    const t = (speedKmH - 50) / 30;
    return { zoom: 17.2 - t * 1.0, pitch: 60 };
  } else if (speedKmH <= 110) {
    // Autovías / vías rápidas (80 a 110 km/h) -> visión expandida de 16.2 a 15.2
    const t = (speedKmH - 80) / 30;
    return { zoom: 16.2 - t * 1.0, pitch: 62 };
  } else {
    // Alta velocidad autopista (> 110 km/h) -> zoom 14.8 para anticipar salidas y radares a gran distancia
    return { zoom: 14.8, pitch: 64 };
  }
}

// Proyecta el foco de la cámara unos metros por delante del vehículo en modo Cabina 3D
// para que la furgoneta se ubique en el tercio inferior de la pantalla y el conductor vea toda la calzada por delante
export function projectLookAhead(
  lat: number,
  lng: number,
  bearingDeg: number,
  metersAhead: number = 85
): [number, number] {
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (metersAhead * Math.cos(rad)) / 111132.95;
  const dLng =
    (metersAhead * Math.sin(rad)) /
    (111132.95 * Math.cos((lat * Math.PI) / 180));
  return [lng + dLng, lat + dLat];
}

// Calcula el rumbo exacto (0-360°) entre dos posiciones GPS reales consecutivas
function computeGpsBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// 5 Estilos de Mapa Conmutables de Alta Definición y Relieve 3D (100% Libres de API Keys y sin marcas de agua)
const MAP_STYLES: Record<MapStyleType, any> = {
  satellite: Object.freeze({
    version: 8 as const,
    sources: {
      satellite: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri World Imagery',
        maxzoom: 19,
      },
    },
    layers: [
      { id: 'satellite-pure-layer', type: 'raster' as const, source: 'satellite', minzoom: 0, maxzoom: 19 },
    ],
  }),
  hybrid: Object.freeze({
    version: 8 as const,
    sources: {
      satellite: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri Satellite',
        maxzoom: 19,
      },
      roads: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri Roads',
        maxzoom: 19,
      },
      labels: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri Labels',
        maxzoom: 19,
      },
      terrain: {
        type: 'raster-dem' as const,
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        encoding: 'terrarium' as const,
        maxzoom: 15,
      },
    },
    layers: [
      { id: 'satellite-layer', type: 'raster' as const, source: 'satellite', minzoom: 0, maxzoom: 19 },
      {
        id: 'hillshade-layer',
        type: 'hillshade' as const,
        source: 'terrain',
        minzoom: 0,
        maxzoom: 16,
        paint: {
          'hillshade-exaggeration': 0.6,
          'hillshade-shadow-color': '#111827',
          'hillshade-highlight-color': '#FFFFFF',
        },
      },
      { id: 'roads-layer', type: 'raster' as const, source: 'roads', minzoom: 0, maxzoom: 19 },
      { id: 'labels-layer', type: 'raster' as const, source: 'labels', minzoom: 0, maxzoom: 19 },
    ],
  }),
  dark: Object.freeze({
    version: 8 as const,
    sources: {
      dark: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri Dark Canvas',
        maxzoom: 18,
      },
      darkLabels: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri Dark Labels',
        maxzoom: 18,
      },
    },
    layers: [
      { id: 'dark-layer', type: 'raster' as const, source: 'dark', minzoom: 0, maxzoom: 18 },
      { id: 'dark-labels-layer', type: 'raster' as const, source: 'darkLabels', minzoom: 0, maxzoom: 18 },
    ],
  }),
  topo: Object.freeze({
    version: 8 as const,
    sources: {
      topo: {
        type: 'raster' as const,
        tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenTopoMap',
        maxzoom: 17,
      },
      terrain: {
        type: 'raster-dem' as const,
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        encoding: 'terrarium' as const,
        maxzoom: 15,
      },
    },
    layers: [
      { id: 'topo-layer', type: 'raster' as const, source: 'topo', minzoom: 0, maxzoom: 17 },
      {
        id: 'topo-hillshade-layer',
        type: 'hillshade' as const,
        source: 'terrain',
        minzoom: 0,
        maxzoom: 16,
        paint: {
          'hillshade-exaggeration': 0.7,
        },
      },
    ],
  }),
  day: Object.freeze({
    version: 8 as const,
    sources: {
      osm: {
        type: 'raster' as const,
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap',
        maxzoom: 19,
      },
    },
    layers: [{ id: 'osm-layer', type: 'raster' as const, source: 'osm', minzoom: 0, maxzoom: 19 }],
  }),
};

// Centro de España (fallback)
const DEFAULT_CENTER: [number, number] = [-3.5, 40.0]; // [lng, lat]
const DEFAULT_ZOOM = 5;

const LAST_LOCATION_KEY = '@camper_last_known_location';
const PREFERENCES_STORAGE_KEY = '@camper_driving_preferences';
const VEHICLE_STORAGE_KEY = '@camper_vehicle_config';

const DEFAULT_DRIVING_PREFS: DrivingPreferences = {
  radarAlertDistance: 1000,
  controlAlertDistance: 5000,
  clearanceAlertDistance: 1000,
  audioMode: 'multimedia',
  hapticFeedback: true,
  tachographWarningsEnabled: false,
};

// Base de datos de puentes bajos, túneles y barreras de altura en España
const KNOWN_CLEARANCE_HAZARDS: ClearanceHazard[] = ClearanceHazardService.getAllHazards();

const GPS_UPDATE_INTERVAL = 1000;
const CHECK_INTERVAL = 2000;

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  description?: string;
  address?: string;
}

interface Radar {
  id: string;
  latitude: number;
  longitude: number;
  type: 'RADAR' | 'CONTROL';
  speedLimit: number;
  verified: boolean;
  lastVerified?: string;
  description?: string;
  radarType?: string;
  roadName?: string;
}

interface Route {
  id?: string;
  name?: string;
  subtitle?: string;
  badge?: string;
  coordinates: Array<{latitude: number; longitude: number}>;
  distance: number;
  duration: number;
  incidents: string[];
  clearanceHazard?: { hazard: ClearanceHazard; distanceMeters: number };
  type: 'fastest' | 'alternative';
  rawRoute?: any;
}

export type DestinationSheetMode = 'minimized' | 'standard' | 'full';

// Memoizar configuración de marcadores - evita recreación en cada render
const MARKER_CONFIG_CACHE: Record<string, { icon: string; color: string }> = {};
const getMarkerConfig = (category: string): { icon: string; color: string } => {
  if (MARKER_CONFIG_CACHE[category]) {
    return MARKER_CONFIG_CACHE[category];
  }
  
  let config: { icon: string; color: string };
  switch (category) {
    case 'CAMPING': config = { icon: 'tent', color: '#2D5016' }; break;
    case 'PARKING_PERMITIDO': config = { icon: 'parking', color: '#1976D2' }; break;
    case 'AREA_DESCANSO': config = { icon: 'bench', color: '#E67E22' }; break;
    case 'AREA_SERVICIOS': config = { icon: 'water-pump', color: '#8E44AD' }; break;
    case 'MIRADOR': config = { icon: 'binoculars', color: '#27AE60' }; break;
    case 'PLAYA': config = { icon: 'beach', color: '#3498DB' }; break;
    case 'MONTANA': config = { icon: 'image-filter-hdr', color: '#795548' }; break;
    case 'LAGO': config = { icon: 'waves', color: '#0097A7' }; break;
    case 'CASCADA': config = { icon: 'waterfall', color: '#00BCD4' }; break;
    case 'LAVADERO_COCHES': config = { icon: 'car-wash', color: '#607D8B' }; break;
    case 'GASOLINERA_GLP': config = { icon: 'gas-station', color: '#F44336' }; break;
    case 'LAVANDERIA': config = { icon: 'tshirt-crew', color: '#9C27B0' }; break;
    case 'SUPERMERCADO': config = { icon: 'cart', color: '#4CAF50' }; break;
    case 'RESTAURANTE': config = { icon: 'silverware-fork-knife', color: '#FF9800' }; break;
    case 'BAR':
    case 'BAR_CAFETERIA': config = { icon: 'glass-cocktail', color: '#D97706' }; break;
    case 'HOTEL': config = { icon: 'bed', color: '#6366F1' }; break;
    case 'FARMACIA': config = { icon: 'medical-bag', color: '#F44336' }; break;
    default: config = { icon: 'map-marker', color: '#2E7D32' };
  }
  
  MARKER_CONFIG_CACHE[category] = config;
  return config;
};

const MapScreen = () => {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    speed: number;
    heading?: number;
  } | null>(null);

  // Centro anclado para cálculo de marcadores de mapa (Throttled a 200m de desplazamiento)
  const [markerAnchorLocation, setMarkerAnchorLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const lastMarkerCalculationPos = useRef<{ latitude: number; longitude: number } | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [radars, setRadars] = useState<Radar[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);

  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [cameraCenter, setCameraCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [cameraZoom, setCameraZoom] = useState(DEFAULT_ZOOM);

  const [alertedRadars, setAlertedRadars] = useState<Set<string>>(new Set());
  const [showFullDetailSheet, setShowFullDetailSheet] = useState(false);
  const [showRadarVerification, setShowRadarVerification] = useState(false);
  const [radarToVerify, setRadarToVerify] = useState<Radar | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Estados del Asistente Inteligente (Pilar 1, 2, 3, 4, 5)
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyleType>('hybrid');
  const [profileMode, setProfileMode] = useState<VehicleProfileMode>('camper');
  const [drivingPrefs, setDrivingPrefs] = useState<DrivingPreferences>(DEFAULT_DRIVING_PREFS);
  const [vehicleHeight, setVehicleHeight] = useState<number>(2.80);
  const [tachographStatus, setTachographStatus] = useState<TachographStatus | null>(null);
  const [activeClearanceHazard, setActiveClearanceHazard] = useState<{ hazard: ClearanceHazard; distanceMeters: number } | null>(null);
  const [navStartTime, setNavStartTime] = useState<number>(0);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [reviewsLocation, setReviewsLocation] = useState<Location | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState(90);
  const [selectedCursor, setSelectedCursor] = useState<VehicleCursorType>('camper_arca');
  const [showCursorModal, setShowCursorModal] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string>('all');
  const [navProgress, setNavProgress] = useState<NavigationProgress | null>(null);
  const [camera3DMode, setCamera3DMode] = useState<boolean>(false);
  const [sectionRadarStatus, setSectionRadarStatus] = useState<SectionRadarStatus | null>(null);
  const [showAdvancedFilterModal, setShowAdvancedFilterModal] = useState<boolean>(false);
  const [advancedFilterCriteria, setAdvancedFilterCriteria] = useState<SpotFilterCriteria>(DEFAULT_FILTER_CRITERIA);
  const [nightModeState, setNightModeState] = useState<NightModeState>(CockpitNightModeService.getState());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [isAwayFromUser, setIsAwayFromUser] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isCruisingActive, setIsCruisingActive] = useState<boolean>(false);
  const [communityAlerts, setCommunityAlerts] = useState<CommunityAlert[]>([]);
  const [activeVerificationAlert, setActiveVerificationAlert] = useState<{
    alert: CommunityAlert;
    distanceMeters: number;
  } | null>(null);
  const lastVerificationAlertId = useRef<string | null>(null);
  const cruisingInactiveCount = useRef<number>(0);
  const [showFuelModal, setShowFuelModal] = useState<boolean>(false);
  const [showLevelerModal, setShowLevelerModal] = useState<boolean>(false);
  const [showSleepModal, setShowSleepModal] = useState<boolean>(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState<boolean>(false);
  const [showTravelPlannerModal, setShowTravelPlannerModal] = useState<boolean>(false);
  const [showDimensionsModal, setShowDimensionsModal] = useState<boolean>(false);
  const [markedPoint, setMarkedPoint] = useState<MarkedPointItem | null>(null);
  const [isMarkedPointFavorite, setIsMarkedPointFavorite] = useState(false);
  const [savedCustomPoints, setSavedCustomPoints] = useState<MarkedPointItem[]>([]);
  const [destinationSheetMode, setDestinationSheetMode] = useState<DestinationSheetMode>('standard');
  const isDestinationCardMinimized = destinationSheetMode === 'minimized';
  const setIsDestinationCardMinimized = useCallback((minimized: boolean) => {
    setDestinationSheetMode(minimized ? 'minimized' : 'standard');
  }, []);
  const currentMapCenterRef = useRef<[number, number]>(DEFAULT_CENTER);
  const lastStableHeading = useRef<number>(0);

  const handleShareLocation = useCallback(async (loc: Location) => {
    const lat = loc.latitude;
    const lng = loc.longitude;
    const name = loc.name || 'Punto de Destino';
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

    Alert.alert(
      'Compartir o Abrir con otra App',
      `📍 ${name}\nCoordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      [
        {
          text: 'Google Maps',
          onPress: () => Linking.openURL(googleUrl).catch(() => {}),
        },
        {
          text: 'Waze',
          onPress: () => Linking.openURL(wazeUrl).catch(() => Linking.openURL(googleUrl)),
        },
        {
          text: 'Compartir Enlace',
          onPress: () => {
            Share.share({
              title: `${name} - CamperSites Pro`,
              message: `📍 ${name}\nCoordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}\nVer en Google Maps: ${googleUrl}\n\nEnviado desde CamperSites Pro`,
            }).catch(() => {});
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }, []);

  const loadSavedCustomPoints = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@campersites_custom_locations');
      if (raw) {
        setSavedCustomPoints(JSON.parse(raw));
      }
    } catch {}
  }, []);

  const handleToggleFullScreen = useCallback(() => {
    setIsFullScreen(prev => {
      const next = !prev;
      AudioAlertService.speak(
        next ? 'Mapa maximizado a pantalla completa.' : 'Mapa minimizado.'
      );
      return next;
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setCameraZoom(prev => {
      const nextZoom = Math.min(19, prev + 1);
      cameraRef.current?.setCamera({
        centerCoordinate: currentMapCenterRef.current,
        zoomLevel: nextZoom,
        animationDuration: 250,
      });
      return nextZoom;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setCameraZoom(prev => {
      const nextZoom = Math.max(3, prev - 1);
      cameraRef.current?.setCamera({
        centerCoordinate: currentMapCenterRef.current,
        zoomLevel: nextZoom,
        animationDuration: 250,
      });
      return nextZoom;
    });
  }, []);

  const handleRecenter = useCallback(() => {
    if (currentLocation) {
      const activeBearing = isNavigating
        ? (navProgress?.snappedPosition?.bearing ?? currentLocation.heading ?? 0)
        : (currentLocation.heading || 0);
      const speedKmH = (currentLocation.speed || 0) * 3.6;
      const adaptiveCam = calculateSpeedAdaptiveCamera(speedKmH, navProgress?.distanceToTurnMeters);
      const lookAheadCenter = projectLookAhead(
        currentLocation.latitude,
        currentLocation.longitude,
        activeBearing,
        85
      );
      currentMapCenterRef.current = lookAheadCenter;

      setIsAwayFromUser(false);
      isAwayFromUserRef.current = false;
      setCamera3DMode(true);
      camera3DModeRef.current = true;

      cameraRef.current?.setCamera({
        centerCoordinate: lookAheadCenter,
        zoomLevel: adaptiveCam.zoom,
        pitch: 60,
        heading: activeBearing,
        animationDuration: 700,
      });
      AudioAlertService.speak('Modo conducción 3D activo');
    } else {
      cameraRef.current?.setCamera({
        centerCoordinate: DEFAULT_CENTER,
        zoomLevel: DEFAULT_ZOOM,
        pitch: 0,
        heading: 0,
        animationDuration: 800,
      });
      setIsAwayFromUser(false);
      isAwayFromUserRef.current = false;
    }
  }, [currentLocation, isNavigating, navProgress]);

  const isNavigatingRef = useRef(false);
  const camera3DModeRef = useRef(false);
  const isAwayFromUserRef = useRef(false);
  const lastGpsFixRef = useRef<{ latitude: number; longitude: number; timestamp: number } | null>(null);

  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    camera3DModeRef.current = camera3DMode;
  }, [camera3DMode]);

  useEffect(() => {
    isAwayFromUserRef.current = isAwayFromUser;
  }, [isAwayFromUser]);

  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const watchId = useRef<number | null>(null);
  const checkIntervalId = useRef<any>(null);
  const lastFetchCenter = useRef<{lat: number; lng: number} | null>(null);
  const lastBoundsFetch = useRef<string>('');
  const isRecalculating = useRef<boolean>(false);

  const saveLastKnownLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
        latitude: lat,
        longitude: lng,
        timestamp: Date.now(),
      }));
    } catch (e) {
      Logger.error('MapScreen', 'AsyncStorage setItem error', e);
    }
  }, []);

  const getLastKnownLocation = useCallback(async (): Promise<{latitude: number; longitude: number} | null> => {
    try {
      const saved = await AsyncStorage.getItem(LAST_LOCATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
          return { latitude: parsed.latitude, longitude: parsed.longitude };
        }
      }
    } catch (e) {
      Logger.error('MapScreen', 'AsyncStorage getItem error', e);
    }
    return null;
  }, []);

  useEffect(() => {
    const initMap = async () => {
      // Cargar configuración de vehículo y preferencias de conducción
      try {
        const savedPrefs = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (savedPrefs) {
          const parsedPrefs = { ...DEFAULT_DRIVING_PREFS, ...JSON.parse(savedPrefs) };
          setDrivingPrefs(parsedPrefs);
          AudioAlertService.setAudioMode(parsedPrefs.audioMode);
        }
        const savedCursor = await AsyncStorage.getItem('@camper_cursor_type');
        if (savedCursor) {
          setSelectedCursor(savedCursor as VehicleCursorType);
        }
        const savedVehicle = await AsyncStorage.getItem(VEHICLE_STORAGE_KEY);
        if (savedVehicle) {
          const parsedV = JSON.parse(savedVehicle);
          if (parsedV.height) setVehicleHeight(parseFloat(parsedV.height));
          if (parsedV.type === 'truck' || parsedV.type === 'camion') setProfileMode('truck');
        }
      } catch (e) {
        Logger.error('MapScreen', 'Error loading vehicle or prefs', e);
      }

      const lastLoc = await getLastKnownLocation();
      if (lastLoc) {
        setCameraCenter([lastLoc.longitude, lastLoc.latitude]);
        setCameraZoom(12);
        if (!lastMarkerCalculationPos.current) {
          lastMarkerCalculationPos.current = lastLoc;
          setMarkerAnchorLocation(lastLoc);
        }
        fetchLocations(lastLoc.latitude, lastLoc.longitude);
      } else {
        fetchLocations(DEFAULT_CENTER[1], DEFAULT_CENTER[0]);
      }

      fetchRadars();
      if (lastLoc) {
        fetchCommunityAlerts(lastLoc.latitude, lastLoc.longitude);
      } else {
        fetchCommunityAlerts(DEFAULT_CENTER[1], DEFAULT_CENTER[0]);
      }
      setLoading(false);
      requestLocationPermission();

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (e) {
        // Modo offline
      }
    };

    initMap();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    const unsubscribeNight = CockpitNightModeService.subscribe((state) => {
      setNightModeState(state);
      if (state.mode === 'auto' || state.mode === 'night') {
        if (state.isNight) {
          setCurrentMapStyle('dark');
        } else {
          setCurrentMapStyle('satellite');
        }
      }
    });

    return () => {
      unsubscribeNight();
      authListener?.subscription?.unsubscribe();
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
      if (checkIntervalId.current) {
        BackgroundTimer.clearInterval(checkIntervalId.current);
      }
    };
  }, []);

  // Al enfocarse en el mapa, comprobar si viene de Favoritos o Explorar para centrar en el punto
  useFocusEffect(
    useCallback(() => {
      loadSavedCustomPoints();
      const checkJumpLocation = async () => {
        try {
          const raw = await AsyncStorage.getItem('@campersites_jump_to_location');
          if (raw) {
            await AsyncStorage.removeItem('@campersites_jump_to_location');
            const target: Location & { _autoCalculateRoute?: boolean } = JSON.parse(raw);
            setSelectedLocation(target);
            setDestinationSheetMode('standard');
            const targetCoord: [number, number] = [target.longitude, target.latitude];
            currentMapCenterRef.current = targetCoord;
            setCameraCenter(targetCoord);
            setCameraZoom(16.5);
            cameraRef.current?.setCamera({
              centerCoordinate: targetCoord,
              zoomLevel: 16.5,
              animationDuration: 1000,
            });
            AudioAlertService.speak(`Destino seleccionado: ${target.name}`);
            // Pre-calcular opciones de ruta hacia el destino seleccionado
            const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
            const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
            calculateRoutes(fromLat, fromLng, target.latitude, target.longitude, false, false);
          }
        } catch {}
      };
      checkJumpLocation();
    }, [])
  );

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        let result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
          startRealtimeLocationTracking();
          await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
        }
      } else {
        const fineResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        if (fineResult === RESULTS.GRANTED) {
          startRealtimeLocationTracking();
        } else {
          // Si el usuario deniega o pospone, arrancar con ubicación inicial segura sin bloquear
          startRealtimeLocationTracking();
        }
      }
    } catch (error) {
      Logger.error('MapScreen', 'Error requesting location permission', error);
    }
  };

  const startRealtimeLocationTracking = () => {
    setGpsEnabled(true);

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        setCurrentLocation({ latitude, longitude, speed: speed || 0 });
        saveLastKnownLocation(latitude, longitude);

        // Mover cámara a posición real
        cameraRef.current?.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });

        fetchLocations(latitude, longitude);
      },
      (error) => Logger.error('MapScreen', 'Error getting location', error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );

    watchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        const now = Date.now();
        let effectiveSpeedMps = speed && speed > 0 ? speed : 0;
        let effectiveHeading = heading !== null && heading !== undefined && heading > 0 ? heading : -1;

        // Cálculo geométrico real de velocidad y rumbo entre muestras GPS consecutivas
        // Garantiza velocidad y rumbo exactos incluso en móviles Android cuyo chip GPS devuelve speed=0 o heading=0
        if (lastGpsFixRef.current) {
          const dtSec = (now - lastGpsFixRef.current.timestamp) / 1000;
          const distM = haversine(
            { latitude: lastGpsFixRef.current.latitude, longitude: lastGpsFixRef.current.longitude },
            { latitude, longitude }
          );
          if (dtSec >= 0.4 && distM >= 1.8) {
            if (effectiveSpeedMps <= 0.3) {
              effectiveSpeedMps = Math.min(45, distM / dtSec);
            }
            if (effectiveHeading < 0 && distM >= 2.2) {
              effectiveHeading = computeGpsBearing(
                lastGpsFixRef.current.latitude,
                lastGpsFixRef.current.longitude,
                latitude,
                longitude
              );
            }
            lastGpsFixRef.current = { latitude, longitude, timestamp: now };
          } else if (dtSec > 4.0) {
            lastGpsFixRef.current = { latitude, longitude, timestamp: now };
          }
        } else {
          lastGpsFixRef.current = { latitude, longitude, timestamp: now };
        }

        const currentSpeedKmH = effectiveSpeedMps * 3.6;
        CockpitNightModeService.updateLocation(latitude, longitude);

        // Filtro inteligente anti-peonza / anti-jitter:
        // Si el vehículo está en movimiento (>= 2.5 km/h), actualizar el rumbo estable de la calzada
        if (currentSpeedKmH >= 2.5 && effectiveHeading >= 0) {
          lastStableHeading.current = effectiveHeading;
        }

        setCurrentLocation({
          latitude,
          longitude,
          speed: effectiveSpeedMps,
          heading: lastStableHeading.current,
        });

        // Throttle de recálculo de marcadores: solo recalcular si el vehículo se desplaza más de 200m
        if (!lastMarkerCalculationPos.current) {
          lastMarkerCalculationPos.current = { latitude, longitude };
          setMarkerAnchorLocation({ latitude, longitude });
        } else {
          const dispM = haversine(lastMarkerCalculationPos.current, { latitude, longitude });
          if (dispM >= 200) {
            lastMarkerCalculationPos.current = { latitude, longitude };
            setMarkerAnchorLocation({ latitude, longitude });
          }
        }

        // 1. Navegación Turn-by-Turn activa y Cámara 3D Dinámica con Look-Ahead
        if (isNavigatingRef.current) {
          const progress = navigationEngine.updateLocation(
            latitude,
            longitude,
            effectiveSpeedMps,
            lastStableHeading.current
          );
          setNavProgress(progress);

          if (!isAwayFromUserRef.current) {
            const adaptiveCam = calculateSpeedAdaptiveCamera(
              currentSpeedKmH,
              progress.distanceToTurnMeters
            );

            const safeHeading = progress.snappedPosition?.bearing ?? lastStableHeading.current;
            const is3D = camera3DModeRef.current;
            const targetCenter: [number, number] = is3D
              ? projectLookAhead(
                  progress.snappedPosition.latitude,
                  progress.snappedPosition.longitude,
                  safeHeading,
                  85
                )
              : [progress.snappedPosition.longitude, progress.snappedPosition.latitude];

            cameraRef.current?.setCamera({
              centerCoordinate: targetCenter,
              zoomLevel: is3D ? adaptiveCam.zoom : 15.5,
              pitch: is3D ? adaptiveCam.pitch : 0,
              heading: is3D ? safeHeading : 0,
              animationDuration: 450,
            });
          }
        } else {
          // 1B. MODO CRUCERO DE CONDUCCIÓN LIBRE 3D (> 10 km/h sin ruta configurada):
          // Si el vehículo supera 10 km/h sin destino marcado, la cámara desciende a ras de calzada,
          // se inclina en perspectiva 3D (pitch 50-55°), adopta zoom adaptativo a la velocidad y
          // sigue el rumbo del vehículo para que el conductor disfrute de máxima visión de la carretera en tiempo real.
          if (currentSpeedKmH >= 10.0) {
            if (!isCruisingActive) {
              setIsCruisingActive(true);
              // Al comenzar la marcha > 10 km/h, anclamos automáticamente la vista a la carretera
              isAwayFromUserRef.current = false;
              setIsAwayFromUser(false);
              setCamera3DMode(true);
              camera3DModeRef.current = true;
            }
            cruisingInactiveCount.current = 0;

            if (!isAwayFromUserRef.current) {
              const adaptiveCam = calculateSpeedAdaptiveCamera(currentSpeedKmH);
              const lookAheadCenter = projectLookAhead(
                latitude,
                longitude,
                lastStableHeading.current,
                75
              );
              cameraRef.current?.setCamera({
                centerCoordinate: lookAheadCenter,
                zoomLevel: adaptiveCam.zoom,
                pitch: adaptiveCam.pitch,
                heading: lastStableHeading.current,
                animationDuration: 500,
              });
            }
          } else {
            // Si la velocidad desciende por debajo de 5 km/h durante paradas prolongadas
            if (isCruisingActive) {
              cruisingInactiveCount.current += 1;
              if (cruisingInactiveCount.current > 15) { // ~15 segundos parado
                setIsCruisingActive(false);
              }
            }
          }
        }

        // 2. Control y Seguimiento de Radares de Tramo DGT
        const secStatus = sectionRadarTracker.updatePosition(latitude, longitude, effectiveSpeedMps);
        setSectionRadarStatus(secStatus);

        // 3. Alerta sonora inmediata de exceso de velocidad
        if (currentSpeedKmH > currentSpeedLimit) {
          AudioAlertService.playSpeedExceededAlert(currentSpeedKmH, currentSpeedLimit);
        }

        if (Math.random() < 0.033) {
          saveLastKnownLocation(latitude, longitude);
        }
      },
      (error) => {
        Logger.error('MapScreen', 'Watch position error', error);
        if (error.code === 2 || error.code === 3) {
          setGpsEnabled(false);
        }
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 0,
        interval: GPS_UPDATE_INTERVAL,
        fastestInterval: 500,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );

    checkIntervalId.current = BackgroundTimer.setInterval(() => {
      if (currentLocation) {
        const speedKmH = currentLocation.speed * 3.6;
        if (isNavigating || speedKmH >= 10 || isCruisingActive) {
          checkForAlerts(currentLocation.latitude, currentLocation.longitude, currentLocation.speed);
          checkForCommunityAlerts(currentLocation.latitude, currentLocation.longitude);
        }
      }
    }, CHECK_INTERVAL);
  };

  const checkForAlerts = (lat: number, lng: number, speed: number) => {
    const radarDist = drivingPrefs.radarAlertDistance || 1000;
    const controlDist = drivingPrefs.controlAlertDistance || 5000;

    radars.forEach((radar) => {
      const distance = haversine(
        { latitude: lat, longitude: lng },
        { latitude: radar.latitude, longitude: radar.longitude }
      );

      const radarKey = `${radar.id}-alert-${radarDist}m`;
      if (radar.type === 'RADAR' && distance <= radarDist && distance > 50) {
        if (!alertedRadars.has(radarKey)) {
          sendRadarAlert(radar, distance, speed, `${radarDist}m`);
          setAlertedRadars(prev => new Set(prev).add(radarKey));
        }
      }

      if (radar.type === 'RADAR' && distance <= 50 && distance > 10) {
        const reminderKey = `${radar.id}-reminder`;
        if (!alertedRadars.has(reminderKey)) {
          sendRadarAlert(radar, distance, speed, '50m');
          setAlertedRadars(prev => new Set(prev).add(reminderKey));
        }
      }

      if (distance <= 10 && !alertedRadars.has(`${radar.id}-passed`)) {
        setRadarToVerify(radar);
        setShowRadarVerification(true);
        setAlertedRadars(prev => new Set(prev).add(`${radar.id}-passed`));
      }

      const controlKey = `${radar.id}-control-${controlDist}m`;
      if (radar.type === 'CONTROL' && distance <= controlDist && distance > 1000) {
        if (!alertedRadars.has(controlKey)) {
          sendControlAlert(radar, distance, `${(controlDist / 1000).toFixed(0)}km`);
          setAlertedRadars(prev => new Set(prev).add(controlKey));
          offerAlternativeRoute(lat, lng);
        }
      }

      if (radar.type === 'CONTROL' && distance <= 1000 && distance > 100) {
        const reminderKey = `${radar.id}-control-reminder`;
        if (!alertedRadars.has(reminderKey)) {
          sendControlAlert(radar, distance, '1km');
          setAlertedRadars(prev => new Set(prev).add(reminderKey));
        }
      }
    });

    // Detección en tiempo real de puentes bajos y gálibos según la altura del vehículo
    if (selectedRoute && selectedRoute.coordinates.length > 0) {
      const clearanceConflicts = VehicleRoutingService.checkClearanceHazards(
        selectedRoute.coordinates,
        KNOWN_CLEARANCE_HAZARDS,
        vehicleHeight,
        drivingPrefs.clearanceAlertDistance || 1000
      );
      if (clearanceConflicts.length > 0) {
        setActiveClearanceHazard(clearanceConflicts[0]);
        AudioAlertService.playClearanceDangerAlert(clearanceConflicts[0].hazard.maxAllowedHeight, vehicleHeight);
      } else {
        setActiveClearanceHazard(null);
      }
    } else if (isCruisingActive || speed * 3.6 >= 10) {
      // Detección de proximidad en Modo Crucero Libre (> 10 km/h o sin ruta fijada)
      let nearbyHazard: { hazard: ClearanceHazard; distanceMeters: number } | null = null;
      for (const h of KNOWN_CLEARANCE_HAZARDS) {
        if (h.maxAllowedHeight < vehicleHeight + 0.10) {
          const d = haversine(
            { latitude: lat, longitude: lng },
            { latitude: h.latitude, longitude: h.longitude }
          );
          if (d <= (drivingPrefs.clearanceAlertDistance || 800)) {
            nearbyHazard = { hazard: h, distanceMeters: d };
            break;
          }
        }
      }
      if (nearbyHazard) {
        setActiveClearanceHazard(nearbyHazard);
        AudioAlertService.playClearanceDangerAlert(nearbyHazard.hazard.maxAllowedHeight, vehicleHeight);
      } else {
        setActiveClearanceHazard(null);
      }
    }

    // Actualización de tacógrafo solo si está explícitamente activado y en modo Camión
    if (profileMode === 'truck' && drivingPrefs.tachographWarningsEnabled && navStartTime > 0) {
      const status = VehicleRoutingService.calculateTachographStatus(navStartTime);
      setTachographStatus(status);
      if (status.isWarningActive) {
        AudioAlertService.playTachographRestAlert(status.maxContinuousMinutes - status.drivingMinutes);
      }
    } else if (!drivingPrefs.tachographWarningsEnabled && tachographStatus !== null) {
      setTachographStatus(null);
    }
  };

  const sendRadarAlert = (radar: Radar, distance: number, speed: number, stage: string) => {
    Logger.info('MapScreen', `RADAR ALERT: ${stage} - ${radar.speedLimit}km/h`);
    const desc = (radar.description || '').toLowerCase();
    let type: 'fixed' | 'section' | 'traffic_light' | 'mobile' | 'tunnel' = 'fixed';
    if (desc.includes('túnel') || desc.includes('tunel')) {
      type = 'tunnel';
      CockpitNightModeService.setTunnelState(distance < 350);
    } else if (desc.includes('tramo')) {
      type = 'section';
    } else if (desc.includes('semáforo') || desc.includes('semaforo') || desc.includes('foto-rojo')) {
      type = 'traffic_light';
    }
    AudioAlertService.playRadarApproachingAlert(radar.id, radar.speedLimit, distance, type);
  };

  const sendControlAlert = (radar: Radar, distance: number, stage: string) => {
    const distanceKm = (distance / 1000).toFixed(1);
    Logger.info('MapScreen', `CONTROL ALERT: ${stage} - ${distanceKm}km`);
    AudioAlertService.playIncidentAlert(radar.id, 'Control policial', distance);

    Alert.alert(
      stage === '5km' ? '🚔 Control a 5km' : '🚨 Control a 1km',
      `Detectado a ${distanceKm}km. ¿Calcular ruta alternativa?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Recalcular',
          onPress: () => {
            if (currentLocation && selectedLocation) {
              calculateRoutes(
                currentLocation.latitude, currentLocation.longitude,
                selectedLocation.latitude, selectedLocation.longitude,
                true
              );
            }
          }
        }
      ]
    );
  };

  const offerAlternativeRoute = async (lat: number, lng: number) => {
    if (!selectedLocation) return;
    const freshRoutes = await calculateRoutes(lat, lng, selectedLocation.latitude, selectedLocation.longitude, true);
    Alert.alert(
      'Ruta Alternativa Calculada',
      '¿Deseas tomar la ruta alternativa que evita el control?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cambiar',
          onPress: () => {
            if (freshRoutes.length > 1) setSelectedRoute(freshRoutes[1]);
          }
        }
      ]
    );
  };

  const fetchLocations = async (lat?: number, lng?: number) => {
    try {
      const centerLat = lat || currentLocation?.latitude || 40.0;
      const centerLng = lng || currentLocation?.longitude || -3.5;
      const latDelta = 0.45;
      const lngDelta = 0.55;

      const { data, error } = await supabase
        .from('locations')
        .select('id, name, latitude, longitude, category, description, address')
        .gte('latitude', centerLat - latDelta)
        .lte('latitude', centerLat + latDelta)
        .gte('longitude', centerLng - lngDelta)
        .lte('longitude', centerLng + lngDelta)
        .limit(500);

      if (error) { 
        Logger.error('MapScreen', 'Error fetching locations', error); 
        return; 
      }
      setLocations(data || []);
      lastFetchCenter.current = { lat: centerLat, lng: centerLng };
    } catch (error) {
      Logger.error('MapScreen', 'Error fetching locations', error);
      setLocations([]);
    }
  };

  const fetchLocationsInBounds = async (
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
  ) => {
    try {
      const boundsKey = `${minLat.toFixed(2)}_${maxLat.toFixed(2)}_${minLng.toFixed(2)}_${maxLng.toFixed(2)}`;
      if (lastBoundsFetch.current === boundsKey) return;
      lastBoundsFetch.current = boundsKey;

      const { data, error } = await supabase
        .from('locations')
        .select('id, name, latitude, longitude, category, description, address')
        .gte('latitude', minLat)
        .lte('latitude', maxLat)
        .gte('longitude', minLng)
        .lte('longitude', maxLng)
        .limit(600);

      if (error) {
        Logger.error('MapScreen', 'Error fetching locations in bounds', error);
        // Fallback inmediato a bóveda offline
        const offlineSpots = offlineSpotVault.queryBounds(minLat, maxLat, minLng, maxLng);
        if (offlineSpots.length > 0) {
          setLocations(offlineSpots as Location[]);
        }
        return;
      }
      if (data && data.length > 0) {
        // Enriquecer con spots de la bóveda offline si hay alguno descargado
        const offlineSpots = offlineSpotVault.queryBounds(minLat, maxLat, minLng, maxLng);
        const merged = offlineSpots.length > 0 ? [...data, ...offlineSpots] : data;
        setLocations(merged);
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        lastFetchCenter.current = { lat: centerLat, lng: centerLng };
      } else {
        const offlineSpots = offlineSpotVault.queryBounds(minLat, maxLat, minLng, maxLng);
        if (offlineSpots.length > 0) {
          setLocations(offlineSpots as Location[]);
        }
      }
    } catch (error) {
      Logger.error('MapScreen', 'Error fetching locations in bounds', error);
    }
  };

  useEffect(() => {
    if (!currentLocation || !lastFetchCenter.current) return;
    const dist = haversine(
      { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
      { latitude: lastFetchCenter.current.lat, longitude: lastFetchCenter.current.lng },
    );
    if (dist > 15000) {
      fetchLocations(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation]);

  const fetchRadars = async () => {
    try {
      const { data, error } = await supabase
        .from('radars')
        .select('id, latitude, longitude, type, speed_limit, verified, last_verified, active')
        .eq('active', true);

      if (error) { 
        Logger.error('MapScreen', 'Error fetching radars', error); 
        return; 
      }

      const mapped = (data || []).map(r => ({
        id: r.id,
        latitude: r.latitude,
        longitude: r.longitude,
        type: (r.type === 'FIJO' || r.type === 'RADAR') ? 'RADAR' as const : 'CONTROL' as const,
        speedLimit: r.speed_limit || 0,
        verified: r.verified || false,
        lastVerified: r.last_verified || undefined,
      }));
      setRadars(mapped);
    } catch (error) {
      Logger.error('MapScreen', 'Error fetching radars', error);
      setRadars([]);
    }
  };

  const fetchCommunityAlerts = useCallback(async (lat: number, lng: number) => {
    try {
      const items = await getNearbyAlerts(lat, lng, 25);
      setCommunityAlerts(items);
    } catch (e) {
      Logger.error('MapScreen', 'Error fetching community alerts', e);
    }
  }, []);

  const checkForCommunityAlerts = useCallback((lat: number, lng: number) => {
    if (communityAlerts.length === 0) return;
    for (const a of communityAlerts) {
      const dist = haversine(
        { latitude: lat, longitude: lng },
        { latitude: a.latitude, longitude: a.longitude }
      );
      // Radio de aviso y verificación interactiva estilo Waze (entre 30m y 350m)
      if (dist <= 350 && dist >= 30) {
        if (lastVerificationAlertId.current !== a.id) {
          lastVerificationAlertId.current = a.id;
          setActiveVerificationAlert({ alert: a, distanceMeters: dist });
          break;
        }
      }
    }
  }, [communityAlerts]);

  const handleOffRouteRecalculate = useCallback(() => {
    if (isRecalculating.current || !selectedLocation || !currentLocation) return;
    isRecalculating.current = true;
    Logger.info('MapScreen', 'Recálculo automático por desvío en marcha...');
    calculateRoutes(
      currentLocation.latitude,
      currentLocation.longitude,
      selectedLocation.latitude,
      selectedLocation.longitude
    ).finally(() => {
      setTimeout(() => {
        isRecalculating.current = false;
      }, 6000);
    });
  }, [currentLocation, selectedLocation]);

  const calculateRoutes = async (
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
    avoidControls: boolean = false,
    autoShowModal: boolean = false
  ): Promise<Route[]> => {
    setIsCalculatingRoute(true);
    try {
      const calculatedRoutes: Route[] = [];

      // 1. Intentar primero con Valhalla Truck (Respeto de Gálibo y Medidas Camper)
      try {
        const valhallaRoute = await CamperValhallaRoutingService.calculateTruckRoute(
          { latitude: fromLat, longitude: fromLng },
          { latitude: toLat, longitude: toLng }
        );
        if (valhallaRoute && valhallaRoute.coordinates.length > 0) {
          calculatedRoutes.push({
            id: 'route-valhalla-truck',
            name: '🛡️ Valhalla Gálibo Seguro',
            subtitle: 'Ruta verificada sin puentes bajos ni pasos estrechos',
            badge: 'Gálibo OK',
            coordinates: valhallaRoute.coordinates,
            distance: valhallaRoute.distanceMeters,
            duration: valhallaRoute.durationSeconds,
            incidents: detectIncidents(valhallaRoute.coordinates.map(c => [c.longitude, c.latitude])),
            type: 'fastest',
            rawRoute: valhallaRoute,
          });
        }
      } catch (valhallaErr) {
        Logger.warn('MapScreen', 'Valhalla Truck fallback a OSRM');
      }

      // 2. Usar OSRM para rutas complementarias y alternativas
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&annotations=true&alternatives=true`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            data.routes.forEach((route: any, idx: number) => {
              // Si ya tenemos Valhalla como fastest, las de OSRM son alternativas
              const isFirst = calculatedRoutes.length === 0 && idx === 0;
              calculatedRoutes.push({
                coordinates: route.geometry.coordinates.map((coord: number[]) => ({
                  latitude: coord[1],
                  longitude: coord[0],
                })),
                distance: route.distance,
                duration: route.duration,
                incidents: detectIncidents(route.geometry.coordinates),
                type: isFirst ? 'fastest' : 'alternative',
                rawRoute: route,
              });
            });
          }
        }
      } catch (fetchErr) {
        Logger.warn('MapScreen', 'OSRM server offline o timeout, activando fallback');
      }

      // Si OSRM devolvió menos de 3 rutas, generar alternativas inteligentes (Sin Peajes y Panorámica)
      if (calculatedRoutes.length < 3 && calculatedRoutes.length > 0) {
        const midLat = (fromLat + toLat) / 2;
        const midLng = (fromLng + toLng) / 2;
        const dLat = toLat - fromLat;
        const dLng = toLng - fromLng;

        // Opción 2: Sin peajes / Nacional (desvío perpendicular norte/este)
        if (calculatedRoutes.length === 1) {
          try {
            const detourLat = midLat - dLng * 0.14;
            const detourLng = midLng + dLat * 0.14;
            const altUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${detourLng.toFixed(5)},${detourLat.toFixed(5)};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&annotations=true`;
            const altController = new AbortController();
            const altTimeout = setTimeout(() => altController.abort(), 3500);
            const altRes = await fetch(altUrl, { signal: altController.signal });
            clearTimeout(altTimeout);
            if (altRes.ok) {
              const altData = await altRes.json();
              if (altData.routes && altData.routes.length > 0) {
                const alt = altData.routes[0];
                calculatedRoutes.push({
                  id: 'route-no-tolls',
                  name: '🛣️ Sin Peajes (Nacional)',
                  subtitle: 'Carreteras nacionales seguras evitando peajes',
                  badge: 'Económica',
                  coordinates: alt.geometry.coordinates.map((coord: number[]) => ({
                    latitude: coord[1],
                    longitude: coord[0],
                  })),
                  distance: alt.distance,
                  duration: alt.duration,
                  incidents: detectIncidents(alt.geometry.coordinates),
                  type: 'alternative',
                  rawRoute: alt,
                });
              }
            }
          } catch (_) {}
        }

        // Opción 3: Panorámica Camper (desvío perpendicular opuesto)
        if (calculatedRoutes.length === 2) {
          try {
            const detourLat3 = midLat + dLng * 0.14;
            const detourLng3 = midLng - dLat * 0.14;
            const altUrl3 = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${detourLng3.toFixed(5)},${detourLat3.toFixed(5)};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&annotations=true`;
            const altController3 = new AbortController();
            const altTimeout3 = setTimeout(() => altController3.abort(), 3500);
            const altRes3 = await fetch(altUrl3, { signal: altController3.signal });
            clearTimeout(altTimeout3);
            if (altRes3.ok) {
              const altData3 = await altRes3.json();
              if (altData3.routes && altData3.routes.length > 0) {
                const alt3 = altData3.routes[0];
                calculatedRoutes.push({
                  id: 'route-scenic',
                  name: '🏕️ Panorámica Camper',
                  subtitle: 'Vía paisajística con miradores y áreas de pernocta',
                  badge: 'Paisaje',
                  coordinates: alt3.geometry.coordinates.map((coord: number[]) => ({
                    latitude: coord[1],
                    longitude: coord[0],
                  })),
                  distance: alt3.distance,
                  duration: alt3.duration,
                  incidents: detectIncidents(alt3.geometry.coordinates),
                  type: 'alternative',
                  rawRoute: alt3,
                });
              }
            }
          } catch (_) {}
        }
      }

      // Si OSRM falló o no devolvió rutas, crear una ruta suave interpolada de navegación segura
      if (calculatedRoutes.length === 0) {
        const straightDistM = haversine({ latitude: fromLat, longitude: fromLng }, { latitude: toLat, longitude: toLng });
        const steps = 20;
        const coords: { latitude: number; longitude: number }[] = [];
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          coords.push({
            latitude: fromLat + (toLat - fromLat) * ratio,
            longitude: fromLng + (toLng - fromLng) * ratio,
          });
        }
        const estDist = Math.max(500, Math.round(straightDistM * 1.25));
        const estDur = Math.max(60, Math.round(estDist / 22));
        calculatedRoutes.push({
          id: 'route-fastest-fallback',
          name: '⭐ Ruta Rápida Directa',
          subtitle: 'Vía principal hacia destino',
          badge: 'Recomendada',
          coordinates: coords,
          distance: estDist,
          duration: estDur,
          incidents: [],
          type: 'fastest',
          rawRoute: {
            distance: estDist,
            duration: estDur,
            geometry: {
              type: 'LineString',
              coordinates: coords.map(c => [c.longitude, c.latitude]),
            },
            legs: [{
              steps: [{
                maneuver: { type: 'depart', modifier: 'straight', location: [fromLng, fromLat] },
                name: 'Carretera principal hacia destino',
                distance: estDist,
                duration: estDur,
              }],
            }],
          },
        });
      }

      // Etiquetar nombres, subtítulos y verificar gálibos/puentes bajos en todas las rutas
      calculatedRoutes.forEach((route, idx) => {
        if (!route.id) {
          route.id = `route-${route.type || 'calc'}-${idx}`;
        }
        // 1. Verificación de puentes bajos en esta alternativa según la altura configurada del vehículo
        const hazardsOnRoute = VehicleRoutingService.checkClearanceHazards(
          route.coordinates,
          KNOWN_CLEARANCE_HAZARDS,
          vehicleHeight,
          350 // Radio estricto de coincidencia sobre la calzada
        );

        if (hazardsOnRoute.length > 0) {
          const topHazard = hazardsOnRoute[0];
          route.clearanceHazard = topHazard;
          const warningText = `⛔ Gálibo bajo: ${topHazard.hazard.maxAllowedHeight.toFixed(2)}m (${topHazard.hazard.description})`;
          if (!route.incidents.includes(warningText)) {
            route.incidents.unshift(warningText);
          }
        }

        if (!route.name) {
          if (idx === 0) {
            route.name = '⭐ Más Rápida (Autovía)';
            route.subtitle = 'Menor tiempo y vías principales';
            route.badge = 'Recomendada';
          } else if (idx === 1) {
            route.name = '🛣️ Sin Peajes (Nacional)';
            route.subtitle = 'Evita tramos de peaje, ideal para ahorrar';
            route.badge = 'Económica';
          } else {
            route.name = '🏕️ Panorámica Camper';
            route.subtitle = 'Vía relajada con miradores y naturaleza';
            route.badge = 'Paisaje';
          }
        }

        // Si la ruta tiene conflicto de gálibo, ajustar badge y avisar claramente
        if (route.clearanceHazard) {
          route.badge = `⚠️ Gálibo ${route.clearanceHazard.hazard.maxAllowedHeight.toFixed(2)}m`;
        }
      });

      // Si la ruta más rápida tiene peligro de gálibo pero hay otra segura, auto-seleccionar la segura
      let preferredRoute = calculatedRoutes[0];
      if (preferredRoute.clearanceHazard) {
        const safeAlternative = calculatedRoutes.find((r) => !r.clearanceHazard);
        if (safeAlternative) {
          preferredRoute = safeAlternative;
          AudioAlertService.speak(
            `Atención: Ruta principal con gálibo bajo de ${preferredRoute.clearanceHazard?.hazard?.maxAllowedHeight || 'reducido'} metros. Se ha seleccionado la alternativa segura.`
          );
        }
      }

      setRoutes(calculatedRoutes);
      if (calculatedRoutes.length > 0) {
        setSelectedRoute(preferredRoute);

        // Auto-encuadre de cámara hacia toda la ruta (Estilo Google Maps & Waze)
        if (!isNavigatingRef.current && preferredRoute.coordinates && preferredRoute.coordinates.length > 1) {
          let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
          preferredRoute.coordinates.forEach((c) => {
            if (c.latitude < minLat) minLat = c.latitude;
            if (c.latitude > maxLat) maxLat = c.latitude;
            if (c.longitude < minLng) minLng = c.longitude;
            if (c.longitude > maxLng) maxLng = c.longitude;
          });
          cameraRef.current?.fitBounds(
            [maxLng, maxLat],
            [minLng, minLat],
            [120, 50, 240, 50],
            1000
          );
        }
      }

      // Si ya estábamos navegando (recálculo automático), actualizar de inmediato sin interrumpir
      if (isNavigatingRef.current && calculatedRoutes.length > 0) {
        const fastestRoute = calculatedRoutes[0];
        setSelectedRoute(fastestRoute);
        navigationEngine.initializeRoute(
          fastestRoute.rawRoute,
          { latitude: fromLat, longitude: fromLng },
          handleOffRouteRecalculate
        );
        return calculatedRoutes;
      }

      return calculatedRoutes;
    } catch (error) {
      Logger.error('MapScreen', 'Error calculating routes', error);
      return [];
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const detectIncidents = (coordinates: number[][]): string[] => {
    const seenRadarIds = new Set<string>();
    const incidents: string[] = [];
    coordinates.forEach((coord) => {
      radars.forEach((radar) => {
        if (seenRadarIds.has(radar.id)) return; // ya procesado
        const distance = haversine(
          { latitude: coord[1], longitude: coord[0] },
          { latitude: radar.latitude, longitude: radar.longitude }
        );
        if (distance < 100) {
          seenRadarIds.add(radar.id);
          if (radar.type === 'RADAR') {
            incidents.push(`⚠️ Radar ${radar.speedLimit} km/h`);
          } else {
            incidents.push(`🚔 Control policial`);
          }
        }
      });
    });
    return incidents;
  };

  const startNavigation = (route: Route) => {
    setSelectedRoute(route);
    setIsNavigating(true);
    isNavigatingRef.current = true;
    setShowFullDetailSheet(false);
    setAlertedRadars(new Set());
    const startTime = Date.now();
    setNavStartTime(startTime);
    if (profileMode === 'truck' && drivingPrefs.tachographWarningsEnabled) {
      setTachographStatus(VehicleRoutingService.calculateTachographStatus(startTime));
    }

    const startLat = currentLocation?.latitude || (route.coordinates[0]?.latitude ?? 40.0);
    const startLng = currentLocation?.longitude || (route.coordinates[0]?.longitude ?? -3.5);

    // Inicializar motor turn-by-turn con pasos e instrucciones de voz
    navigationEngine.initializeRoute(
      route.rawRoute || route,
      { latitude: startLat, longitude: startLng },
      handleOffRouteRecalculate
    );

    // Calcular primera actualización inmediata para obtener rumbo exacto de la calzada inicial
    const initialProg = navigationEngine.updateLocation(
      startLat,
      startLng,
      currentLocation?.speed || 0,
      currentLocation?.heading
    );
    setNavProgress(initialProg);

    const initialBearing = initialProg.snappedPosition?.bearing ?? currentLocation?.heading ?? 0;
    const lookAheadCenter = projectLookAhead(
      initialProg.snappedPosition.latitude,
      initialProg.snappedPosition.longitude,
      initialBearing,
      85
    );

    // Activar modo cámara de cabina 3D (pitch: 60) con Look-Ahead
    setCamera3DMode(true);
    camera3DModeRef.current = true;
    setIsAwayFromUser(false);
    isAwayFromUserRef.current = false;
    cameraRef.current?.setCamera({
      centerCoordinate: lookAheadCenter,
      zoomLevel: 18.2,
      pitch: 60,
      heading: initialBearing,
      animationDuration: 800,
    });

    // Registrar automáticamente la ruta en el Historial de Rutas del usuario
    const destCoord = route.coordinates[route.coordinates.length - 1];
    routeHistoryService.recordRoute({
      destinationName: selectedLocation?.name || markedPoint?.name || route.name || 'Ruta de Navegación',
      destinationCategory: selectedLocation?.category || markedPoint?.category || 'RUTA',
      fromLat: startLat,
      fromLng: startLng,
      toLat: selectedLocation?.latitude ?? markedPoint?.latitude ?? destCoord?.latitude ?? startLat,
      toLng: selectedLocation?.longitude ?? markedPoint?.longitude ?? destCoord?.longitude ?? startLng,
      distanceMeters: route.distance || 0,
      durationSeconds: route.duration || 0,
      routeName: route.name,
      vehicleMode: profileMode,
      vehicleCursor: selectedCursor,
    });

    Logger.info('MapScreen', `NAV START: ${selectedLocation?.name}`);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    isNavigatingRef.current = false;
    setCamera3DMode(false);
    camera3DModeRef.current = false;
    setSelectedLocation(null);
    setShowFullDetailSheet(false);
    setSelectedRoute(null);
    setRoutes([]);
    setNavProgress(null);
    sectionRadarTracker.reset();
    setSectionRadarStatus(null);
    setAlertedRadars(new Set());
    setActiveClearanceHazard(null);
    setTachographStatus(null);
    setNavStartTime(0);

    // Restaurar perspectiva 2D aérea hacia el norte
    cameraRef.current?.setCamera({
      pitch: 0,
      heading: 0,
      zoomLevel: 14,
      animationDuration: 600,
    });
  };

  const handleStartDemoSimulation = useCallback((route?: Route) => {
    setShowFullDetailSheet(false);
    setIsSimulationActive(true);
    setCamera3DMode(true);
    camera3DModeRef.current = true;
    setIsAwayFromUser(false);
    isAwayFromUserRef.current = false;

    if (route) {
      setSelectedRoute(route);
      setIsNavigating(true);
      isNavigatingRef.current = true;
      navigationEngine.initializeRoute(
        route.rawRoute || route,
        {
          latitude: route.coordinates[0]?.latitude ?? 36.782,
          longitude: route.coordinates[0]?.longitude ?? -2.195,
        },
        handleOffRouteRecalculate
      );
    }

    AudioAlertService.speak('Iniciando simulación de conducción 3D');

    drivingSimulationService.startSimulation(
      route?.coordinates,
      (simPos) => {
        const speedKmH = simPos.speed * 3.6;
        lastStableHeading.current = simPos.heading;
        setCurrentLocation({
          latitude: simPos.latitude,
          longitude: simPos.longitude,
          speed: simPos.speed,
          heading: simPos.heading,
        });

        let activeDistanceToTurn: number | undefined;
        let activeBearing = simPos.heading;
        let activeLat = simPos.latitude;
        let activeLng = simPos.longitude;

        if (route) {
          const prog = navigationEngine.updateLocation(
            simPos.latitude,
            simPos.longitude,
            simPos.speed,
            simPos.heading
          );
          setNavProgress(prog);
          activeDistanceToTurn = prog.distanceToTurnMeters;
          activeBearing = prog.snappedPosition.bearing;
          activeLat = prog.snappedPosition.latitude;
          activeLng = prog.snappedPosition.longitude;
        }

        const sStatus = sectionRadarTracker.updatePosition(
          simPos.latitude,
          simPos.longitude,
          simPos.speed
        );
        setSectionRadarStatus(sStatus);

        const is3D = camera3DModeRef.current;
        const adaptiveCam = calculateSpeedAdaptiveCamera(speedKmH, activeDistanceToTurn);
        const targetCenter: [number, number] = is3D
          ? projectLookAhead(activeLat, activeLng, activeBearing, 85)
          : [activeLng, activeLat];

        cameraRef.current?.setCamera({
          centerCoordinate: targetCenter,
          zoomLevel: is3D ? adaptiveCam.zoom : 15.5,
          pitch: is3D ? adaptiveCam.pitch : 0,
          heading: is3D ? activeBearing : 0,
          animationDuration: 520,
        });
      },
      () => {
        setIsSimulationActive(false);
        setIsNavigating(false);
        isNavigatingRef.current = false;
        AudioAlertService.speak('Simulación completada');
      }
    );
  }, [handleOffRouteRecalculate]);

  const handleStopDemoSimulation = useCallback(() => {
    drivingSimulationService.stopSimulation();
    setIsSimulationActive(false);
    setIsNavigating(false);
    isNavigatingRef.current = false;
    setSelectedRoute(null);
    setNavProgress(null);
    AudioAlertService.speak('Simulación detenida');
  }, []);

  // Interceptar pulsación larga libre en cualquier lugar del mapa
  const handleMapLongPress = useCallback(async (feature: any) => {
    try {
      const coords = feature?.geometry?.coordinates || feature?.coordinates;
      if (!coords || coords.length < 2) return;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (isNaN(lng) || isNaN(lat)) return;

      // Vibración táctil háptica inmediata
      try {
        Vibration.vibrate([0, 50, 40, 50]);
      } catch {}

      const pointId = `custom_pt_${Date.now()}`;
      const defaultName = `Punto GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      const newPoint: MarkedPointItem = {
        id: pointId,
        latitude: lat,
        longitude: lng,
        name: defaultName,
        address: `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        category: 'PUNTO_PERSONALIZADO',
      };

      setMarkedPoint(newPoint);
      setSelectedLocation(null);

      // Comprobar si ya existe en favoritos
      const favStored = await AsyncStorage.getItem('@campersites_favorites');
      if (favStored) {
        const favIds: string[] = JSON.parse(favStored);
        setIsMarkedPointFavorite(favIds.includes(newPoint.id));
      } else {
        setIsMarkedPointFavorite(false);
      }

      // Centrar suavemente en el punto pulsado
      cameraRef.current?.setCamera({
        centerCoordinate: [lng, lat],
        animationDuration: 450,
      });

      AudioAlertService.speak('Punto marcado en el mapa');

      // Calcular automáticamente las 3 alternativas de ruta para mostrarlas directamente en el desplegable
      const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
      const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
      calculateRoutes(fromLat, fromLng, lat, lng, false, false);
    } catch (err) {
      Logger.error('MapScreen', 'Error en handleMapLongPress', err);
    }
  }, []);

  // Guardar o retirar punto marcado de favoritos
  const handleToggleMarkedPointFavorite = useCallback(async (point: MarkedPointItem) => {
    try {
      const favStored = await AsyncStorage.getItem('@campersites_favorites');
      let favIds: string[] = favStored ? JSON.parse(favStored) : [];

      const customStored = await AsyncStorage.getItem('@campersites_custom_locations');
      let customLocs: any[] = customStored ? JSON.parse(customStored) : [];

      const isFav = favIds.includes(point.id);

      if (isFav) {
        favIds = favIds.filter(id => id !== point.id);
        customLocs = customLocs.filter(c => c.id !== point.id);
        setIsMarkedPointFavorite(false);
        AudioAlertService.speak('Punto quitado de favoritos');
      } else {
        favIds.push(point.id);
        const customObj = {
          id: point.id,
          name: point.name,
          latitude: point.latitude,
          longitude: point.longitude,
          category: 'PUNTO_PERSONALIZADO',
          city: 'Coordenadas GPS',
          province: 'Ubicación Propia',
          has_water: false,
          has_electricity: false,
          price: 0,
          description: `Punto personalizado en mapa (${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)})`,
        };
        customLocs = customLocs.filter(c => c.id !== point.id);
        customLocs.push(customObj);
        setIsMarkedPointFavorite(true);
        try {
          Vibration.vibrate([0, 80]);
        } catch {}
        AudioAlertService.speak('Punto guardado en tus favoritos');
        Alert.alert('⭐ Guardado en Favoritos', `"${point.name}" se ha añadido a tu lista de favoritos.`);
      }

      await AsyncStorage.setItem('@campersites_favorites', JSON.stringify(favIds));
      await AsyncStorage.setItem('@campersites_custom_locations', JSON.stringify(customLocs));
      setSavedCustomPoints(customLocs);
    } catch (err) {
      Logger.error('MapScreen', 'Error toggling marked point favorite', err);
    }
  }, []);

  // Calcular varias rutas alternativas hacia el punto marcado
  const handleCalculateRoutesForMarkedPoint = useCallback(async (point: MarkedPointItem) => {
    const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
    const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];

    AudioAlertService.speak(`Calculando varias rutas hacia ${point.name}`);
    await calculateRoutes(
      fromLat,
      fromLng,
      point.latitude,
      point.longitude,
      false,
      false // no auto-modal: navegación directa e intuitiva
    );
  }, [currentLocation]);

  // Iniciar navegación directa inmediata hacia el punto marcado
  const handleStartDirectRouteForMarkedPoint = useCallback(async (point: MarkedPointItem) => {
    const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
    const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];

    AudioAlertService.speak(`Iniciando ruta hacia ${point.name}`);
    const calcRoutes = await calculateRoutes(
      fromLat,
      fromLng,
      point.latitude,
      point.longitude,
      false,
      false
    );

    if (calcRoutes && calcRoutes.length > 0) {
      startNavigation(calcRoutes[0]);
      setMarkedPoint(null);
    }
  }, [currentLocation]);

  // Renombrar punto marcado
  const handleUpdatePointName = useCallback(async (point: MarkedPointItem, newName: string) => {
    const updated = { ...point, name: newName };
    setMarkedPoint(updated);

    try {
      const customStored = await AsyncStorage.getItem('@campersites_custom_locations');
      if (customStored) {
        const customLocs: any[] = JSON.parse(customStored);
        const idx = customLocs.findIndex(c => c.id === point.id);
        if (idx !== -1) {
          customLocs[idx].name = newName;
          await AsyncStorage.setItem('@campersites_custom_locations', JSON.stringify(customLocs));
          setSavedCustomPoints(customLocs);
        }
      }
    } catch {}
  }, []);

  const toggleCameraMode = () => {
    const nextMode = !camera3DMode;
    setCamera3DMode(nextMode);
    camera3DModeRef.current = nextMode;
    if (nextMode) {
      const activeBearing = navProgress?.snappedPosition.bearing || currentLocation?.heading || 0;
      const targetCenter = currentLocation
        ? projectLookAhead(currentLocation.latitude, currentLocation.longitude, activeBearing, 85)
        : DEFAULT_CENTER;
      cameraRef.current?.setCamera({
        pitch: 60,
        zoomLevel: 17.8,
        heading: activeBearing,
        centerCoordinate: targetCenter,
        animationDuration: 600,
      });
    } else {
      cameraRef.current?.setCamera({
        pitch: 0,
        heading: 0,
        zoomLevel: 15,
        centerCoordinate: currentLocation
          ? [currentLocation.longitude, currentLocation.latitude]
          : DEFAULT_CENTER,
        animationDuration: 600,
      });
    }
  };

  const verifyRadar = async (stillThere: boolean) => {
    if (!radarToVerify) return;
    try {
      /**
       * Llamar a la función RPC de Supabase (migration-006-anti-abuse.sql)
       * que incluye:
       *   - Verificación de autenticación obligatoria
       *   - Rate limiting: máx 20 reportes/usuario/día
       *   - Unique constraint: 1 voto/usuario/radar/día
       *   - Lógica de desactivación solo con 5+ usuarios distintos en 7 días
       */
      const { data, error } = await supabase.rpc('submit_radar_report', {
        p_radar_id: radarToVerify.id,
        p_still_there: stillThere,
        p_latitude: currentLocation?.latitude ?? null,
        p_longitude: currentLocation?.longitude ?? null,
      });

      if (error) throw error;

      const result = data as {
        ok: boolean;
        error?: string;
        geo_verified?: boolean;
        distance_m?: number;
      };

      if (!result.ok) {
        const msgs: Record<string, string> = {
          AUTH_REQUIRED: 'Inicia sesión para reportar radares.',
          RATE_LIMIT_EXCEEDED: 'Has alcanzado el límite diario de reportes (20/día).',
          ALREADY_VOTED_TODAY: 'Ya has votado sobre este radar hoy.',
          RADAR_NOT_FOUND: 'Radar no encontrado.',
        };
        Alert.alert('No se pudo enviar', msgs[result.error || ''] || result.error || 'Error desconocido');
        return;
      }

      // Si el reporte de "no está" tuvo éxito, quitar el radar del mapa localmente
      // (el backend solo desactiva con 5+ usuarios geo-verificados distintos en 7 días)
      if (!stillThere) {
        setRadars(prev => prev.filter(r => r.id !== radarToVerify.id));
      }

      // Feedback diferenciado según si el reporte fue geo-verificado
      if (result.geo_verified) {
        Alert.alert(
          'Gracias — reporte verificado ✅',
          stillThere
            ? '📍 Posición confirmada cerca del radar. Tu reporte cuenta con peso extra.'
            : `📍 Paso confirmado (a ${result.distance_m?.toFixed(0) ?? '?'}m). Reporte registrado con alta fiabilidad.`,
        );
      } else {
        Alert.alert(
          'Reporte recibido',
          stillThere
            ? '✅ Radar confirmado (sin verificación de posición exacta).'
            : '⚠️ Reporte guardado, pero no se pudo verificar tu posición GPS cerca del punto.',
        );
      }
    } catch (error: any) {
      console.error('Error verifying radar:', error);
      // Mensaje amigable para errores de red
      const msg = error?.message?.includes('network') || error?.message?.includes('fetch')
        ? 'Sin conexión. Inténtalo cuando tengas internet.'
        : 'No se pudo enviar el reporte. Inténtalo de nuevo.';
      Alert.alert('Error', msg);
    }
    setShowRadarVerification(false);
    setRadarToVerify(null);
  };

  // Manejar movimiento del mapa para recargar locations según el encuadre (viewport)
  const handleRegionDidChange = useCallback(async (feature: any) => {
    const isUserGesture = feature?.properties?.isUserInteraction === true;
    const center = feature?.geometry?.coordinates;
    if (center && Array.isArray(center) && center.length === 2) {
      currentMapCenterRef.current = [center[0], center[1]];
      // Solo desactivar el auto-seguimiento 3D si el usuario arrastró el mapa manualmente con el dedo
      if (isUserGesture && currentLocation) {
        const distFromUser = haversine(
          { latitude: center[1], longitude: center[0] },
          { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
        );
        if (distFromUser > 350) {
          setIsAwayFromUser(true);
          isAwayFromUserRef.current = true;
        }
      }
    }

    if (isNavigating) return;

    try {
      let bounds = feature?.properties?.visibleBounds;
      if (!bounds && mapRef.current?.getVisibleBounds) {
        bounds = await mapRef.current.getVisibleBounds();
      }

      if (bounds && Array.isArray(bounds) && bounds.length === 2) {
        const lng1 = bounds[0][0];
        const lat1 = bounds[0][1];
        const lng2 = bounds[1][0];
        const lat2 = bounds[1][1];
        const minLat = Math.min(lat1, lat2);
        const maxLat = Math.max(lat1, lat2);
        const minLng = Math.min(lng1, lng2);
        const maxLng = Math.max(lng1, lng2);

        // Limitar consulta si el zoom es razonable (<= 6.0 grados de amplitud)
        if (maxLat - minLat <= 6.0 && maxLng - minLng <= 7.0) {
          fetchLocationsInBounds(minLat, maxLat, minLng, maxLng);
          return;
        }
      }
    } catch (e) {
      // Ignorar y usar fallback por distancia
    }

    if (lastFetchCenter.current) {
      if (center) {
        const dist = haversine(
          { latitude: center[1], longitude: center[0] },
          { latitude: lastFetchCenter.current.lat, longitude: lastFetchCenter.current.lng },
        );
        if (dist > 15000) {
          fetchLocations(center[1], center[0]);
        }
      }
    }
  }, [isNavigating, currentLocation]);

  // Generar GeoJSON memoizado para la ruta seleccionada con metadatos de gálibo
  const routeGeoJSON = useMemo(() => {
    if (!selectedRoute) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: selectedRoute.coordinates.map(c => [c.longitude, c.latitude]),
        },
        properties: {
          id: selectedRoute.id || 'selected-route',
          hasClearanceHazard: !!selectedRoute.clearanceHazard,
        },
      }],
    };
  }, [selectedRoute]);

  // GeoJSON para rutas alternativas con identificadores para selección táctil en mapa
  const altRoutesGeoJSON = useMemo(() => {
    const alts = routes.filter(r => r !== selectedRoute);
    if (alts.length === 0) return null;

    return {
      type: 'FeatureCollection' as const,
      features: alts.map((route, index) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: route.coordinates.map(c => [c.longitude, c.latitude]),
        },
        properties: {
          routeId: route.id || `alt-route-${index}`,
          routeIndex: routes.indexOf(route),
        },
      })),
    };
  }, [routes, selectedRoute]);

  // Manejador de selección táctil directa sobre el trazado de rutas alternativas en el mapa
  const handleAltRoutePress = useCallback((event: any) => {
    const clickedFeature = event?.features?.[0];
    if (!clickedFeature) return;

    const rId = clickedFeature.properties?.routeId;
    const rIdx = clickedFeature.properties?.routeIndex;

    const matchedRoute = routes.find(r => r.id && r.id === rId) ??
      (typeof rIdx === 'number' && routes[rIdx] ? routes[rIdx] : null);

    if (matchedRoute && matchedRoute !== selectedRoute) {
      setSelectedRoute(matchedRoute);
    }
  }, [routes, selectedRoute]);

  // Badges flotantes de ETA (+X min) en el punto medio de rutas alternativas
  const alternativeRouteBadges = useMemo(() => {
    if (!selectedRoute || routes.length <= 1) return [];

    return routes
      .filter(r => r !== selectedRoute && r.coordinates && r.coordinates.length > 1)
      .map((altRoute, index) => {
        const midIdx = Math.floor(altRoute.coordinates.length / 2);
        const midCoord = altRoute.coordinates[midIdx];

        const diffSec = altRoute.duration - selectedRoute.duration;
        const diffMin = Math.round(diffSec / 60);

        let label = '';
        if (diffMin > 0) {
          label = `+${diffMin} min`;
        } else if (diffMin < 0) {
          label = `${diffMin} min`;
        } else {
          label = 'Mismo tiempo';
        }

        return {
          id: altRoute.id || `alt-badge-${index}`,
          route: altRoute,
          coordinate: [midCoord.longitude, midCoord.latitude] as [number, number],
          label,
          diffMin,
          hasClearanceHazard: !!altRoute.clearanceHazard,
          hazardHeight: altRoute.clearanceHazard?.hazard.maxAllowedHeight,
        };
      });
  }, [routes, selectedRoute]);

  // Detección de peligro de gálibo activo en la ruta actual o en proximidad
  const displayedClearanceHazard = useMemo(() => {
    return selectedRoute?.clearanceHazard?.hazard || activeClearanceHazard?.hazard || null;
  }, [selectedRoute?.clearanceHazard, activeClearanceHazard]);

  // Filtrar ubicaciones según filtros avanzados (Park4Night), filtros rápidos o perfil de vehículo
  const filteredLocations = useMemo(() => {
    let result = locations;

    // 1. Filtros avanzados tipo Park4Night
    if (advancedFilterCriteria.categories.length > 0) {
      result = result.filter(loc => advancedFilterCriteria.categories.includes(loc.category));
    }
    if (advancedFilterCriteria.requireWater) {
      result = result.filter(loc => (loc as any).has_water === true);
    }
    if (advancedFilterCriteria.requireElectricity) {
      result = result.filter(loc => (loc as any).has_electricity === true);
    }
    if (advancedFilterCriteria.onlyFree) {
      result = result.filter(loc => (loc as any).price === 0 || !(loc as any).price);
    }
    if (advancedFilterCriteria.onlyLargeVehicles) {
      result = result.filter(loc =>
        (loc as any).suitable_for_large_vehicles === true ||
        loc.category === 'AREA_SERVICIOS' ||
        loc.category === 'GASOLINERA_GLP'
      );
    }

    // 2. Filtro rápido de cabina si no hay categoría específica avanzada
    if (advancedFilterCriteria.categories.length === 0 && activeFilterId !== 'all') {
      const qFilter = QUICK_FILTERS.find(f => f.id === activeFilterId);
      if (qFilter && qFilter.categories.length > 0) {
        result = result.filter(loc => qFilter.categories.includes(loc.category));
      }
    }

    // 3. Perfil de vehículo
    const allowed = VehicleRoutingService.getCategoriesForMode(profileMode);
    if (!allowed || allowed.length === 0) return result;
    return result.filter(loc => allowed.includes(loc.category));
  }, [locations, activeFilterId, profileMode, advancedFilterCriteria]);

  // Decluttering inteligente: Renderizar solo los 35 spots más cercanos al encuadre para máxima fluidez y evitar apelotonamiento
  // Optimizado con throttle de desplazamiento de 200m para evitar re-renderizados continuos a cada tick GPS (500ms)
  const visibleLocations = useMemo(() => {
    const centerLat = currentMapCenterRef.current[1] || markerAnchorLocation?.latitude || DEFAULT_CENTER[1];
    const centerLng = currentMapCenterRef.current[0] || markerAnchorLocation?.longitude || DEFAULT_CENTER[0];

    const withDist = filteredLocations.map(loc => ({
      ...loc,
      _dist: haversine({ latitude: centerLat, longitude: centerLng }, { latitude: loc.latitude, longitude: loc.longitude }),
    }));
    withDist.sort((a, b) => a._dist - b._dist);
    return withDist.slice(0, 35);
  }, [filteredLocations, markerAnchorLocation]);

  // Radares visibles optimizados: Solo los radares a menos de 45km del vehículo para no saturar la pantalla
  // Optimizado con throttle de 200m de desplazamiento
  const visibleRadars = useMemo(() => {
    const centerLat = markerAnchorLocation?.latitude || currentMapCenterRef.current[1] || DEFAULT_CENTER[1];
    const centerLng = markerAnchorLocation?.longitude || currentMapCenterRef.current[0] || DEFAULT_CENTER[0];

    return radars
      .filter(radar => {
        const d = haversine({ latitude: centerLat, longitude: centerLng }, { latitude: radar.latitude, longitude: radar.longitude });
        return d <= 45000;
      })
      .slice(0, 25);
  }, [radars, markerAnchorLocation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de Búsqueda de Cabina y Chips de Filtro Rápido (Glassmorphism Oscuro) */}
      {!isNavigating && !isFullScreen && (
        <CockpitSearchBar
          currentCoords={currentLocation ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude } : null}
          activeFilterId={activeFilterId}
          hasActiveAdvancedFilters={
            advancedFilterCriteria.categories.length > 0 ||
            advancedFilterCriteria.requireWater ||
            advancedFilterCriteria.requireElectricity ||
            advancedFilterCriteria.onlyFree ||
            advancedFilterCriteria.onlyLargeVehicles
          }
          onSelectFilter={(filter) => setActiveFilterId(filter.id)}
          onOpenAdvancedFilters={() => setShowAdvancedFilterModal(true)}
          onSelectSearchResult={async (result) => {
            const locItem = result as Location;
            setSelectedLocation(locItem);
            setDestinationSheetMode('standard');
            setDestinationSheetMode('standard');
            currentMapCenterRef.current = [result.longitude, result.latitude];
            cameraRef.current?.setCamera({
              centerCoordinate: [result.longitude, result.latitude],
              zoomLevel: 15.5,
              animationDuration: 1000,
            });
            setIsAwayFromUser(true);

            // Calcular ruta al instante para que el botón de iniciar esté listo sin espera
            const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
            const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
            await calculateRoutes(fromLat, fromLng, locItem.latitude, locItem.longitude, false, false);
          }}
        />
      )}

      {/* Navegación Activa Turn-by-Turn en Cabina (Waze / Tesla Style) */}
      {isNavigating && selectedRoute && (
        <CockpitTurnByTurnHUD
          instruction={
            navProgress?.instruction ||
            (selectedRoute.incidents.length > 0
              ? selectedRoute.incidents[0]
              : 'Siga la ruta segura hacia destino')
          }
          roadName={navProgress?.roadName}
          distanceToTurnMeters={navProgress?.distanceToTurnMeters ?? 400}
          maneuverType={navProgress?.maneuverType ?? 'straight'}
          speedLimitKmH={currentSpeedLimit}
          currentSpeedKmH={currentLocation ? currentLocation.speed * 3.6 : 0}
          remainingDistanceKm={
            navProgress?.remainingDistanceKm ?? selectedRoute.distance / 1000
          }
          remainingMinutes={
            navProgress?.remainingMinutes ?? Math.round(selectedRoute.duration / 60)
          }
          etaString={
            navProgress?.etaString ??
            new Date(Date.now() + selectedRoute.duration * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          }
          isOffRoute={navProgress?.isOffRoute ?? false}
          camera3DMode={camera3DMode}
          audioMode={drivingPrefs.audioMode}
          nightMode={nightModeState.mode}
          isNightActive={nightModeState.isNight}
          tachographStatus={tachographStatus}
          activeHazard={
            activeClearanceHazard
              ? {
                  maxAllowedHeight: activeClearanceHazard.hazard.maxAllowedHeight,
                  distanceMeters: activeClearanceHazard.distanceMeters,
                }
              : null
          }
          onStopNavigation={stopNavigation}
          onToggleCameraMode={toggleCameraMode}
          onToggleNightMode={() => {
            const nextMode =
              nightModeState.mode === 'auto'
                ? 'night'
                : nightModeState.mode === 'night'
                ? 'day'
                : 'auto';
            CockpitNightModeService.setMode(nextMode);
          }}
          onToggleAudioMode={() => {
            const nextMode: AudioAlertMode =
              drivingPrefs.audioMode === 'multimedia'
                ? 'bluetooth_hfp'
                : drivingPrefs.audioMode === 'bluetooth_hfp'
                ? 'silent_visual'
                : 'multimedia';
            const updated = { ...drivingPrefs, audioMode: nextMode };
            setDrivingPrefs(updated);
            AudioAlertService.setAudioMode(nextMode);
            AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
          }}
          onOpenTachographDetails={() => {
            if (tachographStatus) {
              Alert.alert(
                'Tacógrafo Digital (Reglamento UE)',
                `Conducción continua: ${VehicleRoutingService.formatTachographTime(
                  tachographStatus.drivingMinutes
                )}\nLímite legal: 4h 30m.\n\n${
                  tachographStatus.isWarningActive
                    ? '⚠️ ¡Atención! Te quedan menos de 45 minutos. Debes estacionar en un área de servicio para camiones.'
                    : 'Estado normal de conducción.'
                }`
              );
            }
          }}
        />
      )}

      {/* Guía Automotriz de Carriles en Autovía / Salidas (Sygic Truck / Waze) */}
      {isNavigating && navProgress?.activeLanes && navProgress.activeLanes.length > 0 && (
        <View style={styles.laneGuidanceWrapper}>
          <LaneGuidanceHUD
            lanes={navProgress.activeLanes}
            distanceToManeuverMeters={navProgress.distanceToTurnMeters}
          />
        </View>
      )}

      {/* Alerta y Medidor de Velocidad Media de Radar de Tramo DGT */}
      {sectionRadarStatus && sectionRadarStatus.isActive && (
        <View style={styles.sectionRadarWrapper}>
          <CockpitSectionRadarHUD status={sectionRadarStatus} />
        </View>
      )}

      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={MAP_STYLES[currentMapStyle] || MAP_STYLES.satellite}
        logoEnabled={false}
        attributionEnabled={false}
        onLongPress={handleMapLongPress}
        onRegionDidChange={handleRegionDidChange}>

        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: cameraCenter,
            zoomLevel: cameraZoom,
          }}
        />

        {/* Marcador del Punto Seleccionado con Pulsación Larga */}
        {markedPoint && (
          <MapLibreGL.PointAnnotation
            key={`marked-pin-${markedPoint.id}`}
            id={`marked-pin-${markedPoint.id}`}
            coordinate={[markedPoint.longitude, markedPoint.latitude]}>
            <View style={styles.markedPinWrapper}>
              <View style={styles.markedPinPulseRing} />
              <View style={styles.markedPinHead}>
                <Icon name="crosshairs-gps" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.markedPinArrow} />
            </View>
          </MapLibreGL.PointAnnotation>
        )}

        {/* Puntos Personalizados Guardados en Favoritos */}
        {savedCustomPoints.map((cp) => (
          <MapLibreGL.PointAnnotation
            key={`saved-cp-${cp.id}`}
            id={`saved-cp-${cp.id}`}
            coordinate={[cp.longitude, cp.latitude]}
            onSelected={() => {
              setMarkedPoint(cp);
              setIsMarkedPointFavorite(true);
              setSelectedLocation(null);
            }}>
            <View style={styles.savedCustomPin}>
              <Icon name="star" size={15} color="#FBBF24" />
            </View>
          </MapLibreGL.PointAnnotation>
        ))}

        {/* Usuario - marcador con vehículo personalizado y orientación 360° con Snap-to-Road */}
        {currentLocation && (
          <MapLibreGL.PointAnnotation
            id="user-location"
            coordinate={
              isNavigating && navProgress?.snappedPosition
                ? [
                    navProgress.snappedPosition.longitude,
                    navProgress.snappedPosition.latitude,
                  ]
                : [currentLocation.longitude, currentLocation.latitude]
            }>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowCursorModal(true)}>
              <VehicleMapCursor
                cursorType={selectedCursor}
                heading={
                  camera3DMode && !isAwayFromUser
                    ? 0
                    : isNavigating && navProgress?.snappedPosition
                    ? navProgress.snappedPosition.bearing
                    : (currentLocation.heading || 0)
                }
                isMoving={(currentLocation.speed || 0) > 0.8}
              />
            </TouchableOpacity>
          </MapLibreGL.PointAnnotation>
        )}

        {/* Ubicaciones filtradas por perfil (De-cluttered: Máximo 35 más cercanas al encuadre) */}
        {visibleLocations.map((location) => {
          const markerConfig = getMarkerConfig(location.category);
          return (
            <MapLibreGL.PointAnnotation
              key={location.id}
              id={`loc-${location.id}`}
              coordinate={[location.longitude, location.latitude]}
              onSelected={() => {
                setSelectedLocation(location);
                setDestinationSheetMode('standard');
                const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
                const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
                calculateRoutes(fromLat, fromLng, location.latitude, location.longitude, false, false);
              }}>
              <View style={styles.markerBadge}>
                <Icon name={markerConfig.icon} size={18} color={markerConfig.color} />
              </View>
              <MapLibreGL.Callout title={location.name}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{location.name}</Text>
                  <Text style={styles.calloutDesc}>{location.description || location.address || ''}</Text>
                </View>
              </MapLibreGL.Callout>
            </MapLibreGL.PointAnnotation>
          );
        })}

        {/* Radares relevantes (De-cluttered: Solo a menos de 45km de la posición) */}
        {visibleRadars.map((radar) => (
          <MapLibreGL.PointAnnotation
            key={radar.id}
            id={`radar-${radar.id}`}
            coordinate={[radar.longitude, radar.latitude]}>
            <View style={styles.radarBadge}>
              <Icon
                name={radar.type === 'RADAR' ? 'speedometer' : 'shield-alert'}
                size={16}
                color="#FFFFFF"
              />
            </View>
            <MapLibreGL.Callout title={radar.type === 'RADAR' ? 'Radar' : 'Control'}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>
                  {radar.type === 'RADAR' ? 'Radar' : 'Control'} - {radar.speedLimit} km/h
                </Text>
              </View>
            </MapLibreGL.Callout>
          </MapLibreGL.PointAnnotation>
        ))}

        {/* Alertas Comunitarias en Tiempo Real (Waze / Google Maps Style) */}
        {communityAlerts.map((ca) => {
          const cfg = COMMUNITY_ALERT_CONFIG[ca.alert_type] || {
            icon: 'alert-circle',
            color: '#F59E0B',
            label: 'Incidencia',
          };
          return (
            <MapLibreGL.PointAnnotation
              key={`comm-${ca.id}`}
              id={`comm-${ca.id}`}
              coordinate={[ca.longitude, ca.latitude]}
              onSelected={() => {
                setActiveVerificationAlert({
                  alert: ca,
                  distanceMeters: currentLocation
                    ? haversine(
                        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                        { latitude: ca.latitude, longitude: ca.longitude }
                      )
                    : 100,
                });
              }}>
              <View style={[styles.communityAlertBadge, { backgroundColor: cfg.color }]}>
                <Icon name={cfg.icon} size={15} color="#FFFFFF" />
              </View>
            </MapLibreGL.PointAnnotation>
          );
        })}

        {/* Rutas alternativas (Doble capa: Casing oscuro + Trazo slate con tap-to-select interactivo) */}
        {altRoutesGeoJSON && (
          <MapLibreGL.ShapeSource
            id="alt-routes-source"
            shape={altRoutesGeoJSON}
            hitbox={{ width: 44, height: 44 }}
            onPress={handleAltRoutePress}
          >
            <MapLibreGL.LineLayer
              id="alt-routes-casing"
              belowLayerID="alt-routes-core"
              style={{
                lineColor: '#1E293B',
                lineWidth: 7,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 0.8,
              }}
            />
            <MapLibreGL.LineLayer
              id="alt-routes-core"
              style={{
                lineColor: '#94A3B8',
                lineWidth: 4.5,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 0.85,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Ruta seleccionada (Doble capa Waze/Google Maps: Casing marino/carmesí + Core azul/rojo gálibo) */}
        {routeGeoJSON && (
          <MapLibreGL.ShapeSource id="route-source" shape={routeGeoJSON}>
            <MapLibreGL.LineLayer
              id="route-casing"
              belowLayerID="route-core"
              style={{
                lineColor: selectedRoute?.clearanceHazard ? '#7F1D1D' : '#1E3A8A',
                lineWidth: 10,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 0.9,
              }}
            />
            <MapLibreGL.LineLayer
              id="route-core"
              style={{
                lineColor: selectedRoute?.clearanceHazard ? '#EF4444' : '#2563EB',
                lineWidth: 6,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 1.0,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Badges de ETA (+X min) en el punto medio de rutas alternativas */}
        {alternativeRouteBadges.map((badge) => (
          <MapLibreGL.PointAnnotation
            key={`alt-eta-${badge.id}`}
            id={`alt-eta-${badge.id}`}
            coordinate={badge.coordinate}
            onSelected={() => setSelectedRoute(badge.route)}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedRoute(badge.route)}
              style={[
                styles.altRouteEtaBadge,
                badge.hasClearanceHazard && styles.altRouteEtaBadgeHazard,
              ]}
            >
              {badge.hasClearanceHazard ? (
                <>
                  <Icon name="alert-octagon" size={13} color="#EF4444" style={{ marginRight: 3 }} />
                  <Text style={styles.altRouteEtaHazardText}>
                    ⛔ {badge.hazardHeight ? `${badge.hazardHeight.toFixed(1)}m` : 'Gálibo'}
                  </Text>
                  <Text style={[styles.altRouteEtaText, { marginLeft: 3 }]}>
                    {badge.label}
                  </Text>
                </>
              ) : (
                <>
                  <Icon name="clock-outline" size={12} color="#94A3B8" style={{ marginRight: 3 }} />
                  <Text style={styles.altRouteEtaText}>{badge.label}</Text>
                </>
              )}
            </TouchableOpacity>
          </MapLibreGL.PointAnnotation>
        ))}

        {/* Marcador de Gálibo Crítico en ruta (Pórtico / Barrera / Puente bajo) */}
        {displayedClearanceHazard && (
          <MapLibreGL.PointAnnotation
            key={`hazard-${displayedClearanceHazard.id}`}
            id={`hazard-${displayedClearanceHazard.id}`}
            coordinate={[displayedClearanceHazard.longitude, displayedClearanceHazard.latitude]}
          >
            <View style={styles.clearanceHazardPin}>
              <View style={styles.clearanceHazardPinBadge}>
                <Icon name="alert-octagon" size={14} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.clearanceHazardPinText}>
                  ⛔ {displayedClearanceHazard.maxAllowedHeight.toFixed(1)}m
                </Text>
              </View>
              <View style={styles.clearanceHazardPinNeedle} />
            </View>
            <MapLibreGL.Callout title={`⛔ Gálibo ${displayedClearanceHazard.maxAllowedHeight.toFixed(2)}m`}>
              <View style={styles.clearanceHazardCallout}>
                <View style={styles.clearanceHazardCalloutHeader}>
                  <Icon name="alert-octagon" size={16} color="#EF4444" style={{ marginRight: 5 }} />
                  <Text style={styles.clearanceHazardCalloutTitle}>
                    Peligro Gálibo: {displayedClearanceHazard.maxAllowedHeight.toFixed(2)}m
                  </Text>
                </View>
                <Text style={styles.clearanceHazardCalloutDesc}>
                  {displayedClearanceHazard.description}
                </Text>
                {displayedClearanceHazard.roadName && (
                  <Text style={styles.clearanceHazardCalloutMeta}>
                    Vía: {displayedClearanceHazard.roadName}
                  </Text>
                )}
                {displayedClearanceHazard.spotName && (
                  <Text style={styles.clearanceHazardCalloutMeta}>
                    Punto: {displayedClearanceHazard.spotName}
                  </Text>
                )}
              </View>
            </MapLibreGL.Callout>
          </MapLibreGL.PointAnnotation>
        )}
      </MapLibreGL.MapView>

      {/* Indicadores automotrices en el lado izquierdo: Señal redonda DGT + Velocímetro digital */}
      <SpeedGaugesHUD
        currentSpeedKmH={currentLocation ? (currentLocation.speed * 3.6) : 0}
        speedLimit={currentSpeedLimit}
      />

      {/* Dock agrupado en el lado inferior derecho: Capas desplegables + 3D/2D + Recentrador GPS + Reporte sutil */}
      <MapControlDock
        currentMapStyle={currentMapStyle}
        gpsEnabled={gpsEnabled}
        isFullScreen={isFullScreen}
        isSimulating={isSimulationActive}
        camera3DMode={camera3DMode}
        onToggleCamera3D={toggleCameraMode}
        onSelectMapStyle={setCurrentMapStyle}
        onToggleFullScreen={handleToggleFullScreen}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRecenterGPS={handleRecenter}
        onOpenReportIncident={() => setIsReportModalOpen(true)}
        onOpenFuelComparator={() => setShowFuelModal(true)}
        onOpenLeveler={() => setShowLevelerModal(true)}
        onOpenSleepMode={() => setShowSleepModal(true)}
        onOpenTelemetry={() => setShowTelemetryModal(true)}
        onOpenCopilot={() => setShowTravelPlannerModal(true)}
        onOpenDimensions={() => setShowDimensionsModal(true)}
        onToggleSimulation={() =>
          isSimulationActive ? handleStopDemoSimulation() : handleStartDemoSimulation(selectedRoute || routes[0])
        }
      />

      {/* Banner Superior de Simulación de Conducción 3D Activa */}
      {isSimulationActive && (
        <View
          style={{
            position: 'absolute',
            top: 65,
            left: 16,
            right: 16,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderWidth: 1.5,
            borderColor: '#38BDF8',
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 10,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#EF4444',
                marginRight: 10,
              }}
            />
            <View>
              <Text style={{ color: '#38BDF8', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>
                DEMO CABINA 3D ACTIVA
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                Simulando ruta, velocímetro HUD y radares DGT
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: '#EF4444',
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={handleStopDemoSimulation}>
            <Icon name="stop" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Detener</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botón Flotante de Recentrado Rápido en Vehículo (Aparece cuando el usuario desplaza el mapa) */}
      {isAwayFromUser && (
        <TouchableOpacity
          style={styles.floatingRecenterBtn}
          onPress={handleRecenter}
          activeOpacity={0.85}>
          <Icon name="navigation-variant" size={18} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.floatingRecenterText}>Modo Conducción 3D</Text>
        </TouchableOpacity>
      )}

      {/* HUD de Verificación Comunitaria al aproximarse a cualquier obstáculo / radar / barrera */}
      <CockpitHazardVerificationHUD
        alert={activeVerificationAlert?.alert || null}
        distanceMeters={activeVerificationAlert?.distanceMeters || 0}
        onDismiss={() => setActiveVerificationAlert(null)}
        onVoted={() => {
          setActiveVerificationAlert(null);
          if (currentLocation) {
            fetchCommunityAlerts(currentLocation.latitude, currentLocation.longitude);
          }
        }}
      />

      {/* Banner Superior de Modo Crucero 3D Activo (> 10 km/h sin ruta fijada) */}
      {isCruisingActive && !isNavigating && (
        <View style={styles.cruisingModePill}>
          <View style={styles.cruisingPulseDot} />
          <Text style={styles.cruisingModeText}>
            🏎️ MODO CRUCERO 3D • {Math.round((currentLocation?.speed || 0) * 3.6)} km/h • Vista Carretera
          </Text>
        </View>
      )}



      {/* Indicador de cálculo de ruta en curso */}
      {isCalculatingRoute && (
        <View style={styles.calculatingRoutePill}>
          <ActivityIndicator size="small" color="#38BDF8" style={{ marginRight: 8 }} />
          <Text style={styles.calculatingRouteText}>Calculando ruta segura...</Text>
        </View>
      )}

      {/* Modal ergonómico de reporte de incidencias con margen automático de 100m */}
      <ReportAlertButton
        userLatitude={currentLocation?.latitude || DEFAULT_CENTER[1]}
        userLongitude={currentLocation?.longitude || DEFAULT_CENTER[0]}
        isLoggedIn={isLoggedIn}
        isEmbedded={true}
        isOpenExternal={isReportModalOpen}
        onCloseExternal={() => setIsReportModalOpen(false)}
        onAlertCreated={() => {
          fetchRadars();
          if (currentLocation) {
            fetchCommunityAlerts(currentLocation.latitude, currentLocation.longitude);
          }
        }}
      />

      {/* Sin GPS banner */}
      {!gpsEnabled && !loading && (
        <View style={styles.noGpsBanner}>
          <Icon name="map-marker-off" size={16} color="#FFF" />
          <Text style={styles.noGpsText}>Sin GPS - Explora moviendo el mapa</Text>
        </View>
      )}

      {/* Ficha Deslizable Completa (Solo si el usuario pulsa en detalles/info) */}
      {selectedLocation && !isNavigating && showFullDetailSheet && (
        <CockpitLocationDetailSheet
          location={selectedLocation}
          vehicleHeight={vehicleHeight}
          distanceKm={
            currentLocation
              ? Math.round(
                  (haversine(
                    { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                    { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }
                  ) / 1000) * 10
                ) / 10
              : undefined
          }
          routes={routes}
          selectedRoute={selectedRoute}
          isCalculatingRoute={isCalculatingRoute}
          onSelectRoute={(rt) => setSelectedRoute(rt)}
          onStartDirectNavigation={async (rt) => {
            if (rt) {
              startNavigation(rt);
            } else {
              const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
              const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
              const calc = await calculateRoutes(fromLat, fromLng, selectedLocation.latitude, selectedLocation.longitude, false, false);
              if (calc && calc.length > 0) {
                startNavigation(calc[0]);
              }
            }
          }}
          onStartSimulation3D={async (rt) => {
            if (rt) {
              setSelectedLocation(null);
              setShowFullDetailSheet(false);
              handleStartDemoSimulation(rt);
            } else {
              const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
              const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
              const calc = await calculateRoutes(fromLat, fromLng, selectedLocation.latitude, selectedLocation.longitude, false, false);
              setSelectedLocation(null);
              setShowFullDetailSheet(false);
              handleStartDemoSimulation(calc?.[0]);
            }
          }}
          onClose={() => {
            setSelectedLocation(null);
            setShowFullDetailSheet(false);
          }}
          onStartRoute={async (loc) => {
            const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
            const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
            AudioAlertService.speak(`Calculando ruta hacia ${loc.name}`);
            await calculateRoutes(
              fromLat,
              fromLng,
              loc.latitude,
              loc.longitude,
              false,
              false
            );
          }}
          onOpenReviews={(loc) => {
            setReviewsLocation(loc);
            setReviewsModalVisible(true);
          }}
        />
      )}

      {/* HUD Minimalista GPS de Destino Seleccionado (Estilo Waze / Google Maps - No Intrusivo & Minimizable) */}
      {selectedLocation && !isNavigating && !showFullDetailSheet && (
        <View style={[styles.cleanDestinationCard, isDestinationCardMinimized && { paddingVertical: 8, paddingHorizontal: 12 }]}>
          {isDestinationCardMinimized ? (
            /* Modo Barra Minimizada: No tapa el mapa ni la ruta */
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center' }}
              activeOpacity={0.85}
              onPress={() => setIsDestinationCardMinimized(false)}>
              <View style={[styles.destinationIconPod, { width: 30, height: 30, marginRight: 8 }]}>
                <Icon
                  name={
                    selectedLocation.category === 'area_autocaravanas'
                      ? 'caravan'
                      : selectedLocation.category === 'camping'
                      ? 'tent'
                      : selectedLocation.category === 'parking_dia'
                      ? 'parking'
                      : selectedLocation.category === 'gasolinera'
                      ? 'gas-station'
                      : 'map-marker-radius'
                  }
                  size={16}
                  color="#38BDF8"
                />
              </View>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={[styles.destinationTitle, { fontSize: 13 }]} numberOfLines={1}>
                  {selectedLocation.name}
                </Text>
                {(selectedRoute || routes.length > 0) && (
                  <Text style={{ fontSize: 11, color: '#38BDF8', fontWeight: '700' }}>
                    {(((selectedRoute || routes[0]).distance) / 1000).toFixed(1)} km • {Math.round(((selectedRoute || routes[0]).duration) / 60)} min
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={{ padding: 6, marginRight: 4 }}
                onPress={() => handleShareLocation(selectedLocation)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="share-variant" size={17} color="#38BDF8" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 6, marginRight: 4 }}
                onPress={() => setIsDestinationCardMinimized(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="chevron-up" size={20} color="#F8FAFC" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.destinationCloseBtn}
                onPress={() => {
                  setSelectedLocation(null);
                  setRoutes([]);
                  setSelectedRoute(null);
                  setShowFullDetailSheet(false);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <>
              {/* Cabecera: Icono, Nombre del Destino, Minimizar, Compartir y Cerrar */}
              <View style={styles.destinationHeaderRow}>
                <View style={styles.destinationIconPod}>
                  <Icon
                    name={
                      selectedLocation.category === 'area_autocaravanas'
                        ? 'caravan'
                        : selectedLocation.category === 'camping'
                        ? 'tent'
                        : selectedLocation.category === 'parking_dia'
                        ? 'parking'
                        : selectedLocation.category === 'gasolinera'
                        ? 'gas-station'
                        : 'map-marker-radius'
                    }
                    size={20}
                    color="#38BDF8"
                  />
                </View>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.destinationTitle} numberOfLines={1}>
                    {selectedLocation.name}
                  </Text>
                  <Text style={styles.destinationSubtitle} numberOfLines={1}>
                    {selectedLocation.address || selectedLocation.description || 'Punto de destino en ruta'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ padding: 6, marginRight: 2 }}
                  onPress={() => handleShareLocation(selectedLocation)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="share-variant" size={18} color="#38BDF8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 6, marginRight: 2 }}
                  onPress={() => setIsDestinationCardMinimized(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="chevron-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.destinationCloseBtn}
                  onPress={() => {
                    setSelectedLocation(null);
                    setRoutes([]);
                    setSelectedRoute(null);
                    setShowFullDetailSheet(false);
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Icon name="close" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Métricas de Ruta: Distancia, Tiempo, ETA */}
              {isCalculatingRoute ? (
                <View style={styles.destinationLoadingRow}>
                  <ActivityIndicator size="small" color="#38BDF8" style={{ marginRight: 8 }} />
                  <Text style={styles.destinationLoadingText}>Calculando trayecto óptimo...</Text>
                </View>
              ) : (selectedRoute || routes.length > 0) ? (
                <>
                  {/* Selector de Rutas Alternativas (Chips compactos) */}
                  {routes.length > 1 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.destinationRoutesScroll}
                      contentContainerStyle={{ paddingVertical: 2 }}>
                      {routes.map((rt, idx) => {
                        const activeRt = selectedRoute || routes[0];
                        const isSelected = activeRt === rt;
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.destinationRouteChip,
                              isSelected && styles.destinationRouteChipActive,
                            ]}
                            onPress={() => setSelectedRoute(rt)}>
                            <Icon
                              name={isSelected ? 'check-circle' : 'circle-outline'}
                              size={13}
                              color={isSelected ? '#38BDF8' : '#64748B'}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.destinationRouteChipText,
                                isSelected && styles.destinationRouteChipTextActive,
                              ]}>
                              {rt.name || (idx === 0 ? 'Más rápida' : `Ruta ${idx + 1}`)} • {Math.round(rt.duration / 60)} min
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  <View style={styles.destinationMetricsRow}>
                    <View style={styles.metricItem}>
                      <Icon name="map-marker-distance" size={15} color="#38BDF8" style={{ marginRight: 4 }} />
                      <Text style={styles.metricVal}>
                        {(((selectedRoute || routes[0]).distance) / 1000).toFixed(1)} km
                      </Text>
                    </View>
                    <View style={[styles.metricItem, { marginLeft: 16 }]}>
                      <Icon name="clock-outline" size={15} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.metricVal}>
                        {Math.round(((selectedRoute || routes[0]).duration) / 60)} min
                      </Text>
                    </View>
                    <View style={[styles.metricItem, { marginLeft: 16 }]}>
                      <Icon name="flag-checkered" size={15} color="#FBBF24" style={{ marginRight: 4 }} />
                      <Text style={styles.metricVal}>
                        ETA {new Date(Date.now() + ((selectedRoute || routes[0]).duration) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}

              {/* Botones de Acción: Iniciar Ruta (Principal), Simular 3D, Compartir y Ver Ficha */}
              <View style={styles.destinationActionsRow}>
                <TouchableOpacity
                  style={styles.destinationStartBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    const target = selectedRoute || (routes.length > 0 ? routes[0] : null);
                    if (target) {
                      startNavigation(target);
                    } else {
                      const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
                      const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
                      calculateRoutes(fromLat, fromLng, selectedLocation.latitude, selectedLocation.longitude, false, false).then((calcs) => {
                        if (calcs && calcs.length > 0) {
                          startNavigation(calcs[0]);
                        }
                      });
                    }
                  }}>
                  <Icon name="navigation-variant" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.destinationStartBtnText}>🚀 Iniciar Ruta</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.destinationSimBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    const target = selectedRoute || (routes.length > 0 ? routes[0] : undefined);
                    handleStartDemoSimulation(target);
                  }}>
                  <Icon name="gamepad-variant" size={18} color="#38BDF8" style={{ marginRight: 6 }} />
                  <Text style={styles.destinationSimBtnText}>Simular</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.destinationDetailBtn}
                  activeOpacity={0.85}
                  onPress={() => setShowFullDetailSheet(true)}>
                  <Icon name="information-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Ficha Deslizable de Punto Marcado en el Mapa (Pulsación Larga) */}
      {markedPoint && !isNavigating && (
        <MarkedPointDetailSheet
          point={markedPoint}
          vehicleHeight={vehicleHeight}
          distanceKm={
            currentLocation
              ? Math.round(
                  (haversine(
                    { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                    { latitude: markedPoint.latitude, longitude: markedPoint.longitude }
                  ) / 1000) * 10
                ) / 10
              : undefined
          }
          isFavorite={isMarkedPointFavorite}
          routes={routes}
          selectedRoute={selectedRoute}
          onSelectRoute={(rt) => setSelectedRoute(rt)}
          onStartSimulation3D={(rt) => {
            setMarkedPoint(null);
            handleStartDemoSimulation(rt || selectedRoute || routes[0]);
          }}
          onUpdatePointCategory={(pt, category) => {
            setMarkedPoint({ ...pt, category });
          }}
          onClose={() => setMarkedPoint(null)}
          onSaveFavorite={handleToggleMarkedPointFavorite}
          onCalculateRoutes={handleCalculateRoutesForMarkedPoint}
          onStartDirectRoute={handleStartDirectRouteForMarkedPoint}
          onUpdatePointName={handleUpdatePointName}
        />
      )}

      {/* Modal de Reseñas de la Comunidad (Pilar 4) */}
      {reviewsModalVisible && (
        <LocationReviewsModal
          visible={true}
          locationId={reviewsLocation?.id || ''}
          locationName={reviewsLocation?.name || ''}
          onClose={() => setReviewsModalVisible(false)}
        />
      )}

      {/* Modal de Filtro Multicriterio Profesional (Park4Night / iOverlander) */}
      {showAdvancedFilterModal && (
        <AdvancedSpotFilterModal
          visible={true}
          initialCriteria={advancedFilterCriteria}
          onApply={(crit) => setAdvancedFilterCriteria(crit)}
          onClose={() => setShowAdvancedFilterModal(false)}
        />
      )}

      {/* Modal Comparador de Precios de Diésel y GLP (MITECO) */}
      {showFuelModal && (
        <FuelPriceComparatorModal
          visible={true}
          userLatitude={currentLocation?.latitude || DEFAULT_CENTER[1]}
          userLongitude={currentLocation?.longitude || DEFAULT_CENTER[0]}
          onClose={() => setShowFuelModal(false)}
          onSelectStation={async (station) => {
            setShowFuelModal(false);
            const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
            const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
            AudioAlertService.speak(`Calculando ruta hacia gasolinera ${station.name}`);
            const calc = await calculateRoutes(fromLat, fromLng, station.latitude, station.longitude, false, false);
            if (calc && calc.length > 0) {
              startNavigation(calc[0]);
            }
          }}
        />
      )}

      {/* Modal Nivelador de Cabina 3D e Inclinómetro de Calzos */}
      {showLevelerModal && (
        <CamperLevelerModal
          visible={true}
          onClose={() => setShowLevelerModal(false)}
        />
      )}

      {/* Modal de Modo Pernocta Segura y Vigilancia Nocturna de Toldo */}
      {showSleepModal && (
        <OvernightSleepModeModal
          visible={true}
          latitude={currentLocation?.latitude || DEFAULT_CENTER[1]}
          longitude={currentLocation?.longitude || DEFAULT_CENTER[0]}
          onClose={() => setShowSleepModal(false)}
        />
      )}

      {/* Modal de Telemetría del Vehículo, Neumáticos TPMS, Mantenimiento y Android Auto */}
      {showTelemetryModal && (
        <VehicleTelemetryModal
          visible={true}
          currentSpeedKmH={currentLocation ? (currentLocation.speed * 3.6) : 0}
          destinationCoord={selectedLocation ? { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude, name: selectedLocation.name } : null}
          onClose={() => setShowTelemetryModal(false)}
        />
      )}

      {/* Modal de Planificador de Viajes e Itinerarios con Copiloto IA */}
      {showTravelPlannerModal && (
        <CamperTravelPlannerModal
          visible={true}
          onClose={() => setShowTravelPlannerModal(false)}
          onStartNavigation={(startCity, endCity, coordinates) => {
            const locItem: Location = {
              id: `plan_dest_${Date.now()}`,
              name: `${endCity} (Itinerario)`,
              latitude: coordinates[1],
              longitude: coordinates[0],
              category: 'AREA_SERVICIOS',
              address: `Ruta desde ${startCity} hacia ${endCity}`,
              description: `Destino de etapa generado por el Copiloto IA de CamperSites Pro`,
            };
            setSelectedLocation(locItem);
            setDestinationSheetMode('standard');
            const targetCoord: [number, number] = [coordinates[0], coordinates[1]];
            currentMapCenterRef.current = targetCoord;
            setCameraCenter(targetCoord);
            setCameraZoom(16.5);
            cameraRef.current?.setCamera({
              centerCoordinate: targetCoord,
              zoomLevel: 16.5,
              animationDuration: 1000,
            });
            AudioAlertService.speak(`Etapa seleccionada: ${endCity}`);
            setShowTravelPlannerModal(false);
          }}
        />
      )}

      {/* Modal de Gálibo y Medidas Camper (Valhalla Truck Routing & Descarga Offline) */}
      {showDimensionsModal && (
        <CamperVehicleDimensionsModal
          visible={true}
          onClose={() => setShowDimensionsModal(false)}
          currentLocation={currentLocation ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude } : null}
          onDimensionsSaved={() => {
            if (selectedLocation && currentLocation) {
              calculateRoutes(currentLocation.latitude, currentLocation.longitude, selectedLocation.latitude, selectedLocation.longitude);
            }
          }}
        />
      )}



      {/* Modal verificación radar */}
      {showRadarVerification && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.verifyModal}>
              <Text style={styles.verifyTitle}>¿El radar sigue aquí?</Text>
              <Text style={styles.verifySubtitle}>Ayúdanos a mantener la información actualizada</Text>
              <View style={styles.verifyButtons}>
                <TouchableOpacity style={[styles.verifyBtn, styles.verifyNo]} onPress={() => verifyRadar(false)}>
                  <Text style={styles.verifyBtnText}>No, lo quitaron</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.verifyBtn, styles.verifyYes]} onPress={() => verifyRadar(true)}>
                  <Text style={styles.verifyBtnText}>Sí, sigue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal de personalización de icono de vehículo en el mapa */}
      {showCursorModal && (
        <VehicleCursorSelectorModal
          visible={true}
          selectedCursor={selectedCursor}
          onSelectCursor={(cursor) => {
            setSelectedCursor(cursor);
            AsyncStorage.setItem('@camper_cursor_type', cursor);
          }}
          onClose={() => setShowCursorModal(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1976D2',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 8,
  },
  radarBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 8,
  },
  floatingRecenterBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 115 : 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 92,
  },
  floatingRecenterText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  calculatingRoutePill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 110,
  },
  calculatingRouteText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  callout: {
    padding: 8,
    minWidth: 150,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000',
  },
  calloutDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  centerButton: {
    position: 'absolute',
    bottom: 115,
    right: 20,
    backgroundColor: '#FFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  locationQuickCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  locationQuickHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickCardCategory: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  quickCardClose: {
    padding: 4,
  },
  quickCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickRouteBtn: {
    flex: 1.4,
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickRouteBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  quickReviewsBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickReviewsBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  navPanel: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
  },
  navInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  navText: { marginLeft: 10, flex: 1 },
  navTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  navStats: { fontSize: 14, color: '#666', marginTop: 2 },
  navSpeed: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginTop: 5 },
  stopBtn: {
    backgroundColor: '#D32F2F',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  routeModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  modalSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  routeOption: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginBottom: 8,
  },
  routeOptionSelected: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderColor: '#38BDF8',
  },
  routeRadioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  routeRadioDotActive: {
    borderColor: '#38BDF8',
  },
  routeRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeType: { fontSize: 14, fontWeight: '700', color: '#E2E8F0' },
  routeTypeActive: { color: '#38BDF8', fontWeight: '800' },
  routeBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  routeBadgePillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  routeBadgeText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  routeBadgeTextActive: { color: '#38BDF8' },
  routeSubtitleText: { fontSize: 11, color: '#94A3B8', marginTop: 2, marginLeft: 26 },
  routeMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 26,
  },
  routeStats: { fontSize: 12, fontWeight: '700', color: '#38BDF8' },
  routeDurationText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  routeEtaText: { fontSize: 11, fontWeight: '600', color: '#FBBF24' },
  incidents: { marginTop: 6, marginLeft: 26 },
  incidentsTitle: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  incident: { fontSize: 11, color: '#F87171', marginTop: 1 },
  startNavigationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  startNavigationBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  recommendedRoute: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  cancelBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#666' },
  cleanDestinationCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 900,
  },
  destinationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  destinationIconPod: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  destinationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  destinationSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  destinationCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  destinationLoadingText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },
  destinationRoutesScroll: {
    marginBottom: 6,
  },
  destinationRouteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 8,
  },
  destinationRouteChipActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
    borderColor: '#38BDF8',
  },
  destinationRouteChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  destinationRouteChipTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  destinationMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
    marginBottom: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  destinationActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destinationStartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  destinationStartBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  destinationSimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  destinationSimBtnText: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 12,
  },
  destinationDetailBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyModal: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 24,
    margin: 20,
  },
  verifyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8, color: '#F8FAFC' },
  verifySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 20 },
  verifyButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  verifyBtn: { flex: 1, padding: 15, borderRadius: 10, marginHorizontal: 5 },
  verifyNo: { backgroundColor: '#F44336' },
  verifyYes: { backgroundColor: '#4CAF50' },
  verifyBtnText: { color: '#FFF', fontWeight: 'bold', textAlign: 'center' },
  noGpsBanner: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  noGpsText: { color: '#FFF', fontSize: 13, fontWeight: '500' },
  laneGuidanceWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 142 : 112,
    alignSelf: 'center',
    zIndex: 119,
  },
  sectionRadarWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 190 : 160,
    left: 14,
    right: 14,
    zIndex: 118,
  },
  markedPinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 56,
  },
  markedPinPulseRing: {
    position: 'absolute',
    top: 4,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  markedPinHead: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D97706',
    borderWidth: 2.5,
    borderColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 2,
  },
  markedPinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D97706',
    marginTop: -2,
    zIndex: 1,
  },
  savedCustomPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 8,
  },
  communityAlertBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 9,
  },
  cruisingModePill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 46,
    alignSelf: 'center',
    zIndex: 9999,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  cruisingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
    marginRight: 8,
  },
  cruisingModeText: {
    color: '#F0F9FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  quickReportFloatingBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 146 : 130,
    right: 14,
    zIndex: 9998,
    backgroundColor: '#F59E0B',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
  },
  quickReportFloatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  floatingModeSelector: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 194 : 178,
    right: 14,
    zIndex: 9998,
    flexDirection: 'column',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 22,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  modeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  modeIcon: {
    fontSize: 16,
  },
  altRouteEtaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#64748B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  altRouteEtaBadgeHazard: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
  },
  altRouteEtaText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  altRouteEtaHazardText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '800',
  },
  clearanceHazardPin: {
    alignItems: 'center',
  },
  clearanceHazardPinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    elevation: 8,
  },
  clearanceHazardPinText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  clearanceHazardPinNeedle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#DC2626',
  },
  clearanceHazardCallout: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    maxWidth: 220,
  },
  clearanceHazardCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clearanceHazardCalloutTitle: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  clearanceHazardCalloutDesc: {
    color: '#E2E8F0',
    fontSize: 11,
    lineHeight: 15,
  },
  clearanceHazardCalloutMeta: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 3,
  },
});

export default MapScreen;
