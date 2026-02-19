import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import haversine from 'haversine-distance';
import { supabase } from '../lib/supabase';

// Inicializar MapLibre (sin token - usa OSM gratuito)
MapLibreGL.setAccessToken(null);

// Tile server OpenStreetMap gratuito
const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster' as const,
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Centro de España (fallback)
const DEFAULT_CENTER: [number, number] = [-3.5, 40.0]; // [lng, lat] - MapLibre usa [lng, lat]
const DEFAULT_ZOOM = 5;

const LAST_LOCATION_KEY = '@camper_last_known_location';

// Configuración GPS
const GPS_UPDATE_INTERVAL = 1000;
const RADAR_ALERT_DISTANCE = 1000;
const RADAR_REMINDER_DISTANCE = 50;
const CONTROL_ALERT_DISTANCE = 5000;
const CONTROL_REMINDER_DISTANCE = 1000;
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

const getMarkerConfig = (category: string): { icon: string; color: string } => {
  switch (category) {
    case 'CAMPING': return { icon: 'tent', color: '#2D5016' };
    case 'PARKING_PERMITIDO': return { icon: 'parking', color: '#1976D2' };
    case 'AREA_DESCANSO': return { icon: 'bench', color: '#E67E22' };
    case 'AREA_SERVICIOS': return { icon: 'water-pump', color: '#8E44AD' };
    case 'MIRADOR': return { icon: 'binoculars', color: '#27AE60' };
    case 'PLAYA': return { icon: 'beach', color: '#3498DB' };
    case 'MONTANA': return { icon: 'image-filter-hdr', color: '#795548' };
    case 'LAGO': return { icon: 'waves', color: '#0097A7' };
    case 'CASCADA': return { icon: 'waterfall', color: '#00BCD4' };
    case 'LAVADERO_COCHES': return { icon: 'car-wash', color: '#607D8B' };
    case 'GASOLINERA_GLP': return { icon: 'gas-station', color: '#F44336' };
    case 'LAVANDERIA': return { icon: 'tshirt-crew', color: '#9C27B0' };
    case 'SUPERMERCADO': return { icon: 'cart', color: '#4CAF50' };
    case 'RESTAURANTE': return { icon: 'silverware-fork-knife', color: '#FF9800' };
    case 'FARMACIA': return { icon: 'medical-bag', color: '#F44336' };
    default: return { icon: 'map-marker', color: '#2E7D32' };
  }
};

const MapScreen = () => {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    speed: number;
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

  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const watchId = useRef<number | null>(null);
  const checkIntervalId = useRef<any>(null);
  const lastFetchCenter = useRef<{lat: number; lng: number} | null>(null);

  const saveLastKnownLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
        latitude: lat,
        longitude: lng,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('AsyncStorage setItem error:', e);
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
      console.error('AsyncStorage getItem error:', e);
    }
    return null;
  }, []);

  useEffect(() => {
    const initMap = async () => {
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
    };

    initMap();

    return () => {
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
      console.error('Error requesting location permission:', error);
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
      (error) => console.error('Error getting location:', error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );

    watchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        setCurrentLocation({ latitude, longitude, speed: speed || 0 });

        if (Math.random() < 0.033) {
          saveLastKnownLocation(latitude, longitude);
        }
      },
      (error) => {
        console.error('Watch position error:', error);
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
    radars.forEach((radar) => {
      const distance = haversine(
        { latitude: lat, longitude: lng },
        { latitude: radar.latitude, longitude: radar.longitude }
      );

      const radarKey1km = `${radar.id}-alert-1km`;

      if (radar.type === 'RADAR' && distance <= RADAR_ALERT_DISTANCE && distance > RADAR_REMINDER_DISTANCE) {
        if (!alertedRadars.has(radarKey1km)) {
          sendRadarAlert(radar, distance, speed, '1km');
          setAlertedRadars(prev => new Set(prev).add(radarKey1km));
        }
      }

      if (radar.type === 'RADAR' && distance <= RADAR_REMINDER_DISTANCE && distance > 10) {
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

      const controlKey5km = `${radar.id}-control-5km`;
      if (radar.type === 'CONTROL' && distance <= CONTROL_ALERT_DISTANCE && distance > CONTROL_REMINDER_DISTANCE) {
        if (!alertedRadars.has(controlKey5km)) {
          sendControlAlert(radar, distance, '5km');
          setAlertedRadars(prev => new Set(prev).add(controlKey5km));
          offerAlternativeRoute(lat, lng);
        }
      }

      if (radar.type === 'CONTROL' && distance <= CONTROL_REMINDER_DISTANCE && distance > 100) {
        const reminderKey = `${radar.id}-control-reminder`;
        if (!alertedRadars.has(reminderKey)) {
          sendControlAlert(radar, distance, '1km');
          setAlertedRadars(prev => new Set(prev).add(reminderKey));
        }
      }
    });
  };

  const sendRadarAlert = (radar: Radar, distance: number, speed: number, stage: string) => {
    console.log(`RADAR ALERT: ${stage} - ${radar.speedLimit}km/h`);
  };

  const sendControlAlert = (radar: Radar, distance: number, stage: string) => {
    const distanceKm = (distance / 1000).toFixed(1);
    console.log(`CONTROL ALERT: ${stage} - ${distanceKm}km`);

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

      if (error) { console.error('Error fetching locations:', error); return; }
      setLocations(data || []);
      lastFetchCenter.current = { lat: centerLat, lng: centerLng };
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
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

      if (error) { console.error('Error fetching radars:', error); return; }

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
      console.error('Error fetching radars:', error);
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
      console.error('Error calculating routes:', error);
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
    console.log(`NAV START: ${selectedLocation?.name}`);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setSelectedLocation(null);
    setSelectedRoute(null);
    setRoutes([]);
    setAlertedRadars(new Set());
  };

  const verifyRadar = async (stillThere: boolean) => {
    if (!radarToVerify) return;
    try {
      await supabase.from('radar_reports').insert({
        radar_id: radarToVerify.id,
        report_type: stillThere ? 'confirmed' : 'removed',
        reported_at: new Date().toISOString(),
      });
      if (stillThere) {
        await supabase.from('radars').update({
          last_verified: new Date().toISOString(),
          verified: true,
        }).eq('id', radarToVerify.id);
      }
      Alert.alert('Gracias', stillThere ? 'Radar confirmado y actualizado' : 'Radar marcado como eliminado');
    } catch (error) {
      console.error('Error verifying radar:', error);
    }
    setShowRadarVerification(false);
    setRadarToVerify(null);
  };

  // Manejar movimiento del mapa para recargar locations
  const handleRegionDidChange = useCallback(async (feature: any) => {
    if (!isNavigating && lastFetchCenter.current) {
      const center = feature?.geometry?.coordinates;
      if (center) {
        const dist = haversine(
          { latitude: center[1], longitude: center[0] },
          { latitude: lastFetchCenter.current.lat, longitude: lastFetchCenter.current.lng },
        );
        if (dist > 30000) {
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
      <MapLibreGL.MapView
        style={styles.map}
        styleJSON={JSON.stringify(OSM_STYLE)}
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

        {/* Usuario - marcador */}
        {currentLocation && (
          <MapLibreGL.PointAnnotation
            id="user-location"
            coordinate={[currentLocation.longitude, currentLocation.latitude]}>
            <View style={styles.userMarker}>
              <Icon name="navigation" size={24} color="#1976D2" />
            </View>
          </MapLibreGL.PointAnnotation>
        )}

        {/* Ubicaciones */}
        {locations.map((location) => {
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

      {/* Botón centrar */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={() => {
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
        }}>
        <Icon
          name={gpsEnabled ? 'crosshairs-gps' : 'crosshairs'}
          size={24}
          color={gpsEnabled ? '#2E7D32' : '#999'}
        />
      </TouchableOpacity>

      {/* Sin GPS banner */}
      {!gpsEnabled && !loading && (
        <View style={styles.noGpsBanner}>
          <Icon name="map-marker-off" size={16} color="#FFF" />
          <Text style={styles.noGpsText}>Sin GPS - Explora moviendo el mapa</Text>
        </View>
      )}

      {/* Panel navegación activa */}
      {isNavigating && selectedLocation && selectedRoute && (
        <View style={styles.navPanel}>
          <View style={styles.navInfo}>
            <Icon name="navigation" size={24} color="#2E7D32" />
            <View style={styles.navText}>
              <Text style={styles.navTitle}>{selectedLocation.name}</Text>
              <Text style={styles.navStats}>
                {(selectedRoute.distance / 1000).toFixed(1)} km • {Math.round(selectedRoute.duration / 60)} min
              </Text>
              {currentLocation && (
                <Text style={styles.navSpeed}>
                  {Math.round(currentLocation.speed * 3.6)} km/h
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.stopBtn} onPress={stopNavigation}>
            <Icon name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

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
    bottom: 100,
    right: 20,
    backgroundColor: '#FFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
