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
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import haversine from 'haversine-distance';
import { supabase } from '../lib/supabase';
import { FLATLIST_PERF_PROPS } from '../utils/performance';
import { Logger } from '../utils/logger';
import ReportAlertButton from '../components/ReportAlertButton';
import { DrivingHUD } from '../components/DrivingHUD';
import { LocationReviewsModal } from '../components/LocationReviewsModal';
import { RouteModeSelector } from '../components/RouteModeSelector';
import { SpeedGaugesHUD } from '../components/SpeedGaugesHUD';
import { MapControlDock } from '../components/MapControlDock';
import { VehicleMapCursor } from '../components/VehicleMapCursor';
import { VehicleCursorSelectorModal } from '../components/VehicleCursorSelectorModal';
import { AudioAlertService } from '../services/AudioAlertService';
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

// 4 Estilos de Mapa Conmutables de Alta Definición
const MAP_STYLES: Record<MapStyleType, any> = {
  satellite: Object.freeze({
    version: 8 as const,
    sources: {
      satellite: {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri',
        maxzoom: 19,
      },
    },
    layers: [{ id: 'satellite-layer', type: 'raster' as const, source: 'satellite', minzoom: 0, maxzoom: 19 }],
  }),
  dark: Object.freeze({
    version: 8 as const,
    sources: {
      dark: {
        type: 'raster' as const,
        tiles: ['https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© CartoDB',
        maxzoom: 19,
      },
    },
    layers: [{ id: 'dark-layer', type: 'raster' as const, source: 'dark', minzoom: 0, maxzoom: 19 }],
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

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  description: string;
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
}

interface Route {
  coordinates: Array<{latitude: number; longitude: number}>;
  distance: number;
  duration: number;
  incidents: string[];
  type: 'fastest' | 'alternative';
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

  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const watchId = useRef<number | null>(null);
  const checkIntervalId = useRef<any>(null);
  const lastFetchCenter = useRef<{lat: number; lng: number} | null>(null);
  const lastBoundsFetch = useRef<string>('');

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

    return () => {
      authListener?.subscription?.unsubscribe();
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
      if (checkIntervalId.current) {
        BackgroundTimer.clearInterval(checkIntervalId.current);
      }
    };
  }, []);

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
          if (parseInt(String(Platform.Version), 10) >= 29) {
            await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
          }
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
        setCurrentLocation({
          latitude,
          longitude,
          speed: speed || 0,
          heading: heading || 0,
        });

        // 1. Alerta sonora inmediata de exceso de velocidad
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
    AudioAlertService.playRadarApproachingAlert(radar.id, radar.speedLimit, distance);
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
        return;
      }
      if (data && data.length > 0) {
        setLocations(data);
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        lastFetchCenter.current = { lat: centerLat, lng: centerLng };
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

  const calculateRoutes = async (
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
    avoidControls: boolean = false
  ): Promise<Route[]> => {
    try {
      // Usar OSRM (gratuito, sin API key)
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&alternatives=true`;

      const response = await fetch(url);
      const data = await response.json();

      const calculatedRoutes: Route[] = [];

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
          });
        });
      }

      setRoutes(calculatedRoutes);
      setShowRouteSelector(true);
      return calculatedRoutes;
    } catch (error) {
      Logger.error('MapScreen', 'Error calculating routes', error);
      Alert.alert('Error', 'No se pudo calcular la ruta');
      return [];
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
    Logger.info('MapScreen', `NAV START: ${selectedLocation?.name}`);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setSelectedLocation(null);
    setSelectedRoute(null);
    setRoutes([]);
    setAlertedRadars(new Set());
    setActiveClearanceHazard(null);
    setTachographStatus(null);
    setNavStartTime(0);
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
      const center = feature?.geometry?.coordinates;
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
  }, [isNavigating]);

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

  // Filtrar ubicaciones según el perfil de vehículo activo
  const filteredLocations = useMemo(() => {
    const allowed = VehicleRoutingService.getCategoriesForMode(profileMode);
    if (!allowed || allowed.length === 0) return locations;
    return locations.filter(loc => allowed.includes(loc.category));
  }, [locations, profileMode]);

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
      {/* Selector de modo y estilo de mapa (Pilar 1 & 3) */}
      {!isNavigating && (
        <RouteModeSelector
          currentMode={profileMode}
          currentMapStyle={currentMapStyle}
          onSelectMode={setProfileMode}
          onSelectMapStyle={setCurrentMapStyle}
        />
      )}

      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={MAP_STYLES[currentMapStyle] || MAP_STYLES.satellite}
        logoEnabled={false}
        attributionEnabled={false}
        onRegionDidChange={handleRegionDidChange}>

        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: cameraCenter,
            zoomLevel: cameraZoom,
          }}
        />

        {/* Usuario - marcador con vehículo personalizado y orientación 360° */}
        {currentLocation && (
          <MapLibreGL.PointAnnotation
            id="user-location"
            coordinate={[currentLocation.longitude, currentLocation.latitude]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowCursorModal(true)}>
              <VehicleMapCursor
                cursorType={selectedCursor}
                heading={currentLocation.heading || 0}
                isMoving={(currentLocation.speed || 0) > 1}
              />
            </TouchableOpacity>
          </MapLibreGL.PointAnnotation>
        )}

        {/* Ubicaciones filtradas por perfil */}
        {filteredLocations.map((location) => {
          const markerConfig = getMarkerConfig(location.category);
          return (
            <MapLibreGL.PointAnnotation
              key={location.id}
              id={`loc-${location.id}`}
              coordinate={[location.longitude, location.latitude]}
              onSelected={() => {
                setSelectedLocation(location);
                if (currentLocation) {
                  calculateRoutes(
                    currentLocation.latitude, currentLocation.longitude,
                    location.latitude, location.longitude
                  );
                }
              }}>
              <View style={styles.markerContainer}>
                <Icon name={markerConfig.icon} size={28} color={markerConfig.color} />
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

        {/* Radares */}
        {radars.map((radar) => (
          <MapLibreGL.PointAnnotation
            key={radar.id}
            id={`radar-${radar.id}`}
            coordinate={[radar.longitude, radar.latitude]}>
            <View style={styles.markerContainer}>
              <Icon
                name={radar.type === 'RADAR' ? 'speedometer' : 'shield-alert'}
                size={26}
                color={radar.type === 'RADAR' ? '#D32F2F' : '#FF6F00'}
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
        onSelectMapStyle={setCurrentMapStyle}
        onRecenterGPS={() => {
          if (currentLocation) {
            cameraRef.current?.setCamera({
              centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
              zoomLevel: 14,
              animationDuration: 1000,
            });
          } else {
            cameraRef.current?.setCamera({
              centerCoordinate: DEFAULT_CENTER,
              zoomLevel: DEFAULT_ZOOM,
              animationDuration: 1000,
            });
          }
        }}
        onOpenReportIncident={() => setIsReportModalOpen(true)}
      />

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

      {/* Head-Up Display (HUD) de Conducción Futurista (Pilar 1, 2, 3) */}
      {isNavigating && selectedLocation && selectedRoute && (
        <DrivingHUD
          currentSpeedKmH={currentLocation ? (currentLocation.speed * 3.6) : 0}
          speedLimit={90}
          destinationName={selectedLocation.name}
          remainingDistanceKm={selectedRoute.distance / 1000}
          remainingDurationMinutes={Math.round(selectedRoute.duration / 60)}
          profileMode={profileMode}
          audioMode={drivingPrefs.audioMode}
          vehicleHeightMeters={vehicleHeight}
          activeClearanceHazard={activeClearanceHazard}
          tachographStatus={tachographStatus}
          onStopNavigation={stopNavigation}
          onToggleAudioMode={() => {
            const nextMode: AudioAlertMode =
              drivingPrefs.audioMode === 'multimedia'
                ? 'bluetooth_hfp'
                : drivingPrefs.audioMode === 'bluetooth_hfp'
                ? 'silent_visual'
                : 'multimedia';
            const updated = { ...drivingPrefs, audioMode: nextMode };
            setDrivingPrefs(updated);
            AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
          }}
          onOpenClearanceDetails={() => {
            if (activeClearanceHazard) {
              Alert.alert(
                'Aviso de Gálibo Crítico',
                `Paso bajo detectado en ruta: ${activeClearanceHazard.hazard.description}.\nAltura permitida: ${activeClearanceHazard.hazard.maxAllowedHeight.toFixed(2)}m.\nTu vehículo mide: ${vehicleHeight.toFixed(2)}m.\n\nSe recomienda tomar desvío seguro.`
              );
            }
          }}
          onOpenTachographDetails={() => {
            if (tachographStatus) {
              Alert.alert(
                'Tacógrafo Digital (Reglamento UE)',
                `Conducción continua: ${VehicleRoutingService.formatTachographTime(tachographStatus.drivingMinutes)}\nLímite legal: 4h 30m.\n\n${
                  tachographStatus.isWarningActive
                    ? '⚠️ ¡Atención! Te quedan menos de 45 minutos. Debes estacionar en un área de servicio para camiones.'
                    : 'Estado normal de conducción.'
                }`
              );
            }
          }}
        />
      )}

      {/* Tarjeta Glassmorphic de Ubicación Seleccionada con Acceso a Reseñas */}
      {selectedLocation && !isNavigating && (
        <View style={styles.locationQuickCard}>
          <View style={styles.locationQuickHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickCardTitle} numberOfLines={1}>{selectedLocation.name}</Text>
              <Text style={styles.quickCardCategory}>
                {selectedLocation.category.replace(/_/g, ' ')} {selectedLocation.address ? `• ${selectedLocation.address}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedLocation(null)} style={styles.quickCardClose}>
              <Icon name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          <View style={styles.quickCardActions}>
            <TouchableOpacity
              style={styles.quickRouteBtn}
              onPress={() => {
                if (currentLocation) {
                  calculateRoutes(
                    currentLocation.latitude, currentLocation.longitude,
                    selectedLocation.latitude, selectedLocation.longitude
                  );
                }
              }}>
              <Icon name="navigation" size={18} color="#FFFFFF" />
              <Text style={styles.quickRouteBtnText}>Ruta Inteligente</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickReviewsBtn}
              onPress={() => {
                setReviewsLocation(selectedLocation);
                setReviewsModalVisible(true);
              }}>
              <Icon name="star-outline" size={18} color="#0F172A" />
              <Text style={styles.quickReviewsBtnText}>Reseñas</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de Reseñas de la Comunidad (Pilar 4) */}
      <LocationReviewsModal
        visible={reviewsModalVisible}
        locationId={reviewsLocation?.id || ''}
        locationName={reviewsLocation?.name || ''}
        onClose={() => setReviewsModalVisible(false)}
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
});

export default MapScreen;
