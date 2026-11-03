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
  Vibration,
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
import { affiliatePartnerService } from '../services/AffiliatePartnerService';
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

// 4 Estilos de Mapa Conmutables de Alta Definición (100% Libres de API Keys y sin marcas de agua)
const MAP_STYLES: Record<MapStyleType, any> = {
  satellite: Object.freeze({
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
    },
    layers: [
      { id: 'satellite-layer', type: 'raster' as const, source: 'satellite', minzoom: 0, maxzoom: 19 },
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
    },
    layers: [{ id: 'topo-layer', type: 'raster' as const, source: 'topo', minzoom: 0, maxzoom: 17 }],
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
  tachographWarningsEnabled: true,
};

// Base de datos de puentes bajos y gálibos críticos para avisos en tiempo real
const KNOWN_CLEARANCE_HAZARDS: ClearanceHazard[] = [
  { id: 'haz-1', latitude: 40.4168, longitude: -3.7038, maxAllowedHeight: 2.80, description: 'Paso subterráneo gálibo 2.80m', roadName: 'M-30 enlace' },
  { id: 'haz-2', latitude: 41.3851, longitude: 2.1734, maxAllowedHeight: 3.10, description: 'Puente ferroviario bajo 3.10m', roadName: 'Acceso Costero' },
  { id: 'haz-3', latitude: 37.3891, longitude: -5.9845, maxAllowedHeight: 2.90, description: 'Arco monumental gálibo 2.90m', roadName: 'Centro Histórico' },
  { id: 'haz-4', latitude: 43.3619, longitude: -8.4116, maxAllowedHeight: 3.00, description: 'Túnel urbano limitado 3.00m', roadName: 'Ronda Norte' },
];

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
  coordinates: Array<{latitude: number; longitude: number}>;
  distance: number;
  duration: number;
  incidents: string[];
  type: 'fastest' | 'alternative';
  rawRoute?: any;
}

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
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [showRadarVerification, setShowRadarVerification] = useState(false);
  const [radarToVerify, setRadarToVerify] = useState<Radar | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Estados del Asistente Inteligente (Pilar 1, 2, 3, 4, 5)
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyleType>('satellite');
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
  const [isAwayFromUser, setIsAwayFromUser] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [markedPoint, setMarkedPoint] = useState<MarkedPointItem | null>(null);
  const [isMarkedPointFavorite, setIsMarkedPointFavorite] = useState(false);
  const [savedCustomPoints, setSavedCustomPoints] = useState<MarkedPointItem[]>([]);
  const currentMapCenterRef = useRef<[number, number]>(DEFAULT_CENTER);
  const lastStableHeading = useRef<number>(0);

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
      const targetCoords: [number, number] = [currentLocation.longitude, currentLocation.latitude];
      currentMapCenterRef.current = targetCoords;
      cameraRef.current?.setCamera({
        centerCoordinate: targetCoords,
        zoomLevel: 15.5,
        pitch: isNavigating ? 60 : 0,
        heading: isNavigating ? (currentLocation.heading || 0) : 0,
        animationDuration: 800,
      });
      setIsAwayFromUser(false);
      AudioAlertService.speak('Centrando en tu vehículo');
    } else {
      cameraRef.current?.setCamera({
        centerCoordinate: DEFAULT_CENTER,
        zoomLevel: DEFAULT_ZOOM,
        animationDuration: 800,
      });
      setIsAwayFromUser(false);
    }
  }, [currentLocation, isNavigating]);

  const isNavigatingRef = useRef(false);
  const camera3DModeRef = useRef(false);

  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    camera3DModeRef.current = camera3DMode;
  }, [camera3DMode]);

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
        fetchLocations(lastLoc.latitude, lastLoc.longitude);
      } else {
        fetchLocations(DEFAULT_CENTER[1], DEFAULT_CENTER[0]);
      }

      fetchRadars();
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
            const target: Location = JSON.parse(raw);
            setSelectedLocation(target);
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
        const currentSpeedKmH = (speed || 0) * 3.6;
        CockpitNightModeService.updateLocation(latitude, longitude);

        // Filtro inteligente anti-peonza / anti-jitter:
        // Si el vehículo está detenido o quieto (< 2.5 km/h), descartar fluctuaciones aleatorias del magnetómetro/giroscopio
        if (currentSpeedKmH >= 2.5 && heading !== null && heading !== undefined && heading >= 0) {
          lastStableHeading.current = heading;
        }

        setCurrentLocation({
          latitude,
          longitude,
          speed: speed || 0,
          heading: lastStableHeading.current,
        });

        // 1. Navegación Turn-by-Turn activa y Cámara 3D Dinámica
        if (isNavigatingRef.current) {
          const progress = navigationEngine.updateLocation(
            latitude,
            longitude,
            speed || 0,
            lastStableHeading.current
          );
          setNavProgress(progress);

          if (camera3DModeRef.current) {
            const adaptiveCam = calculateSpeedAdaptiveCamera(
              currentSpeedKmH,
              progress.distanceToTurnMeters
            );

            // Al estar detenido (< 2.5 km/h), mantener la orientación fija de la calzada
            const safeHeading = progress.snappedPosition?.bearing ?? lastStableHeading.current;

            cameraRef.current?.setCamera({
              centerCoordinate: [
                progress.snappedPosition.longitude,
                progress.snappedPosition.latitude,
              ],
              zoomLevel: adaptiveCam.zoom,
              pitch: adaptiveCam.pitch,
              heading: safeHeading,
              animationDuration: 400,
            });
          }
        }
        // En modo libre (!isNavigating), la cámara no se rota automáticamente, permitiendo explorar en calma.

        // 2. Control y Seguimiento de Radares de Tramo DGT
        const secStatus = sectionRadarTracker.updatePosition(latitude, longitude, speed || 0);
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
      if (currentLocation && isNavigating) {
        checkForAlerts(currentLocation.latitude, currentLocation.longitude, currentLocation.speed);
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
    }

    // Actualización de tacógrafo si está en modo Camión
    if (profileMode === 'truck' && navStartTime > 0) {
      const status = VehicleRoutingService.calculateTachographStatus(navStartTime);
      setTachographStatus(status);
      if (status.isWarningActive) {
        AudioAlertService.playTachographRestAlert(status.maxContinuousMinutes - status.drivingMinutes);
      }
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
      // 1. Usar OSRM con timeout controlado (5s)
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&annotations=true&alternatives=true`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const calculatedRoutes: Route[] = [];

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            data.routes.forEach((route: any, idx: number) => {
              calculatedRoutes.push({
                coordinates: route.geometry.coordinates.map((coord: number[]) => ({
                  latitude: coord[1],
                  longitude: coord[0],
                })),
                distance: route.distance,
                duration: route.duration,
                incidents: detectIncidents(route.geometry.coordinates),
                type: idx === 0 ? 'fastest' : 'alternative',
                rawRoute: route,
              });
            });
          }
        }
      } catch (fetchErr) {
        Logger.warn('MapScreen', 'OSRM server offline o timeout, activando fallback');
      }

      // Si solo devolvió 1 ruta, calcular una segunda ruta alternativa paisajística
      if (calculatedRoutes.length === 1) {
        try {
          const midLat = (fromLat + toLat) / 2;
          const midLng = (fromLng + toLng) / 2;
          const dLat = toLat - fromLat;
          const dLng = toLng - fromLng;
          const detourLat = midLat - dLng * 0.15;
          const detourLng = midLng + dLat * 0.15;
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

      setRoutes(calculatedRoutes);
      if (calculatedRoutes.length > 0) {
        setSelectedRoute(calculatedRoutes[0]);
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

      if (autoShowModal) {
        setShowRouteSelector(true);
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
    setShowRouteSelector(false);
    setAlertedRadars(new Set());
    const startTime = Date.now();
    setNavStartTime(startTime);
    if (profileMode === 'truck') {
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

    // Activar modo cámara de cabina 3D (pitch: 60)
    setCamera3DMode(true);
    cameraRef.current?.setCamera({
      centerCoordinate: [startLng, startLat],
      zoomLevel: 17.5,
      pitch: 60,
      heading: currentLocation?.heading || 0,
      animationDuration: 800,
    });

    Logger.info('MapScreen', `NAV START: ${selectedLocation?.name}`);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setCamera3DMode(false);
    camera3DModeRef.current = false;
    setSelectedLocation(null);
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
      true // autoShowModal: abre modal de rutas alternativas comparativas
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
    if (nextMode) {
      cameraRef.current?.setCamera({
        pitch: 60,
        zoomLevel: 17.5,
        heading: navProgress?.snappedPosition.bearing || currentLocation?.heading || 0,
        centerCoordinate: currentLocation
          ? [currentLocation.longitude, currentLocation.latitude]
          : DEFAULT_CENTER,
        animationDuration: 600,
      });
    } else {
      cameraRef.current?.setCamera({
        pitch: 0,
        heading: 0,
        zoomLevel: 14,
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
    if (isNavigating) return;

    const center = feature?.geometry?.coordinates;
    if (center && Array.isArray(center) && center.length === 2) {
      currentMapCenterRef.current = [center[0], center[1]];
      if (currentLocation) {
        const distFromUser = haversine(
          { latitude: center[1], longitude: center[0] },
          { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
        );
        setIsAwayFromUser(distFromUser > 350);
      }
    }

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

  // Generar GeoJSON para la ruta seleccionada
  const routeGeoJSON = selectedRoute ? {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: selectedRoute.coordinates.map(c => [c.longitude, c.latitude]),
      },
      properties: {},
    }],
  } : null;

  // GeoJSON para rutas alternativas
  const altRoutesGeoJSON = routes.filter(r => r !== selectedRoute).length > 0 ? {
    type: 'FeatureCollection' as const,
    features: routes.filter(r => r !== selectedRoute).map(route => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: route.coordinates.map(c => [c.longitude, c.latitude]),
      },
      properties: {},
    })),
  } : null;

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
  const visibleLocations = useMemo(() => {
    const centerLat = currentMapCenterRef.current[1] || currentLocation?.latitude || DEFAULT_CENTER[1];
    const centerLng = currentMapCenterRef.current[0] || currentLocation?.longitude || DEFAULT_CENTER[0];

    const withDist = filteredLocations.map(loc => ({
      ...loc,
      _dist: haversine({ latitude: centerLat, longitude: centerLng }, { latitude: loc.latitude, longitude: loc.longitude }),
    }));
    withDist.sort((a, b) => a._dist - b._dist);
    return withDist.slice(0, 35);
  }, [filteredLocations, currentLocation]);

  // Radares visibles optimizados: Solo los radares a menos de 45km del vehículo para no saturar la pantalla
  const visibleRadars = useMemo(() => {
    const centerLat = currentLocation?.latitude || currentMapCenterRef.current[1] || DEFAULT_CENTER[1];
    const centerLng = currentLocation?.longitude || currentMapCenterRef.current[0] || DEFAULT_CENTER[0];

    return radars
      .filter(radar => {
        const d = haversine({ latitude: centerLat, longitude: centerLng }, { latitude: radar.latitude, longitude: radar.longitude });
        return d <= 45000;
      })
      .slice(0, 25);
  }, [radars, currentLocation]);

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
                  isNavigating && navProgress?.snappedPosition
                    ? navProgress.snappedPosition.bearing
                    : (currentLocation.heading || 0)
                }
                isMoving={(currentLocation.speed || 0) > 1}
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
                const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
                const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
                calculateRoutes(fromLat, fromLng, location.latitude, location.longitude);
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

        {/* Ruta seleccionada */}
        {routeGeoJSON && (
          <MapLibreGL.ShapeSource id="route-source" shape={routeGeoJSON}>
            <MapLibreGL.LineLayer
              id="route-line"
              style={{
                lineColor: '#2196F3',
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Rutas alternativas */}
        {altRoutesGeoJSON && (
          <MapLibreGL.ShapeSource id="alt-routes-source" shape={altRoutesGeoJSON}>
            <MapLibreGL.LineLayer
              id="alt-routes-line"
              style={{
                lineColor: '#9E9E9E',
                lineWidth: 3,
                lineCap: 'round',
                lineJoin: 'round',
                lineDasharray: [5, 5],
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* Indicadores automotrices en el lado izquierdo: Señal redonda DGT + Velocímetro digital */}
      <SpeedGaugesHUD
        currentSpeedKmH={currentLocation ? (currentLocation.speed * 3.6) : 0}
        speedLimit={currentSpeedLimit}
      />

      {/* Dock agrupado en el lado inferior derecho: Capas desplegables + Recentrador GPS + Reporte sutil */}
      <MapControlDock
        currentMapStyle={currentMapStyle}
        gpsEnabled={gpsEnabled}
        isFullScreen={isFullScreen}
        onSelectMapStyle={setCurrentMapStyle}
        onToggleFullScreen={handleToggleFullScreen}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRecenterGPS={handleRecenter}
        onOpenReportIncident={() => setIsReportModalOpen(true)}
      />

      {/* Botón Flotante de Recentrado Rápido en Vehículo (Aparece cuando el usuario desplaza el mapa) */}
      {isAwayFromUser && !isNavigating && (
        <TouchableOpacity
          style={styles.floatingRecenterBtn}
          onPress={handleRecenter}
          activeOpacity={0.85}>
          <Icon name="crosshairs-gps" size={18} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.floatingRecenterText}>Centrar en mi vehículo</Text>
        </TouchableOpacity>
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
        }}
      />

      {/* Sin GPS banner */}
      {!gpsEnabled && !loading && (
        <View style={styles.noGpsBanner}>
          <Icon name="map-marker-off" size={16} color="#FFF" />
          <Text style={styles.noGpsText}>Sin GPS - Explora moviendo el mapa</Text>
        </View>
      )}

      {/* Ficha Deslizable de Cabina de Ubicación Seleccionada */}
      {selectedLocation && !isNavigating && (
        <CockpitLocationDetailSheet
          location={selectedLocation}
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
          onClose={() => setSelectedLocation(null)}
          onStartRoute={async (loc) => {
            const fromLat = currentLocation?.latitude || DEFAULT_CENTER[1];
            const fromLng = currentLocation?.longitude || DEFAULT_CENTER[0];
            AudioAlertService.speak(`Iniciando ruta hacia ${loc.name}`);
            const calcRoutes = await calculateRoutes(
              fromLat,
              fromLng,
              loc.latitude,
              loc.longitude
            );
            if (calcRoutes && calcRoutes.length > 0) {
              startNavigation(calcRoutes[0]);
            }
          }}
          onOpenReviews={(loc) => {
            setReviewsLocation(loc);
            setReviewsModalVisible(true);
          }}
        />
      )}

      {/* Ficha Deslizable de Punto Marcado en el Mapa (Pulsación Larga) */}
      {markedPoint && !isNavigating && (
        <MarkedPointDetailSheet
          point={markedPoint}
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
          onClose={() => setMarkedPoint(null)}
          onSaveFavorite={handleToggleMarkedPointFavorite}
          onCalculateRoutes={handleCalculateRoutesForMarkedPoint}
          onStartDirectRoute={handleStartDirectRouteForMarkedPoint}
          onUpdatePointName={handleUpdatePointName}
        />
      )}

      {/* Modal de Reseñas de la Comunidad (Pilar 4) */}
      <LocationReviewsModal
        visible={reviewsModalVisible}
        locationId={reviewsLocation?.id || ''}
        locationName={reviewsLocation?.name || ''}
        onClose={() => setReviewsModalVisible(false)}
      />

      {/* Modal de Filtro Multicriterio Profesional (Park4Night / iOverlander) */}
      <AdvancedSpotFilterModal
        visible={showAdvancedFilterModal}
        initialCriteria={advancedFilterCriteria}
        onApply={(crit) => setAdvancedFilterCriteria(crit)}
        onClose={() => setShowAdvancedFilterModal(false)}
      />

      {/* Modal selector de rutas */}
      <Modal visible={showRouteSelector} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona tu ruta</Text>
            {routes.map((route, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.routeOption, route.type === 'fastest' && styles.recommendedRoute]}
                onPress={() => startNavigation(route)}>
                <View style={styles.routeHeader}>
                  <Text style={styles.routeType}>
                    {route.type === 'fastest' ? '⭐ Recomendada' : 'Alternativa'}
                  </Text>
                  <Text style={styles.routeStats}>
                    {(route.distance / 1000).toFixed(1)} km • {Math.round(route.duration / 60)} min
                  </Text>
                </View>
                {route.incidents.length > 0 && (
                  <View style={styles.incidents}>
                    <Text style={styles.incidentsTitle}>En esta ruta:</Text>
                    {route.incidents.map((incident, i) => (
                      <Text key={i} style={styles.incident}>{incident}</Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {/* Banner de Seguridad en Ruta: Seguro Camper IATI 5% Dto */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.35)',
                borderRadius: 12,
                padding: 12,
                marginTop: 10,
                marginBottom: 6,
              }}
              activeOpacity={0.85}
              onPress={async () => {
                const partner = affiliatePartnerService.getPartnerById('iati_escapadas_camper');
                if (partner) {
                  await affiliatePartnerService.openPartner(partner);
                }
              }}>
              <Icon name="shield-check" size={22} color="#10B981" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>
                  🛡️ Asistencia Médica y Grúa en Ruta
                </Text>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                  5% Dto. exclusivo en IATI Escapadas para tu viaje
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color="#10B981" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRouteSelector(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal verificación radar */}
      <Modal visible={showRadarVerification} transparent={true} animationType="fade">
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

      {/* Modal de personalización de icono de vehículo en el mapa */}
      <VehicleCursorSelectorModal
        visible={showCursorModal}
        selectedCursor={selectedCursor}
        onSelectCursor={(cursor) => {
          setSelectedCursor(cursor);
          AsyncStorage.setItem('@camper_cursor_type', cursor);
        }}
        onClose={() => setShowCursorModal(false)}
      />
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
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  routeOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  recommendedRoute: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  routeType: { fontSize: 16, fontWeight: 'bold' },
  routeStats: { fontSize: 14, color: '#666' },
  incidents: { marginTop: 5 },
  incidentsTitle: { fontSize: 12, fontWeight: 'bold', color: '#D32F2F', marginBottom: 5 },
  incident: { fontSize: 12, color: '#666', marginLeft: 10 },
  cancelBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#666' },
  verifyModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    margin: 20,
  },
  verifyTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  verifySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
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
});

export default MapScreen;
