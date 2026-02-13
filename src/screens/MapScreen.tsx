import React, { useState, useEffect, useRef } from 'react';
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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import PushNotification from 'react-native-push-notification';
import BackgroundTimer from 'react-native-background-timer';
import haversine from 'haversine-distance';
import { MAPBOX_ACCESS_TOKEN } from '@env';
import { supabase } from '../lib/supabase';

// ⚠️ CONFIGURACIÓN CRÍTICA
const GPS_UPDATE_INTERVAL = 1000; // 1 segundo - TIEMPO REAL
const RADAR_ALERT_DISTANCE = 1000; // 1km antes
const RADAR_REMINDER_DISTANCE = 50; // 50m recordatorio
const CONTROL_ALERT_DISTANCE = 5000; // 5KM ANTES - CRÍTICO para autopista
const CONTROL_REMINDER_DISTANCE = 1000; // 1km recordatorio
const CHECK_INTERVAL = 2000; // Verificar cada 2 segundos

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

// Configuración de iconos y colores por categoría para el mapa
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
  // Estados principales
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
  
  // Estados de alertas
  const [alertedRadars, setAlertedRadars] = useState<Set<string>>(new Set());
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [showRadarVerification, setShowRadarVerification] = useState(false);
  const [radarToVerify, setRadarToVerify] = useState<Radar | null>(null);
  
  const mapRef = useRef<MapView>(null);
  const watchId = useRef<number | null>(null);
  const checkIntervalId = useRef<any>(null);

  useEffect(() => {
    // Configurar notificaciones push
    configurePushNotifications();
    
    // Solicitar permisos y empezar tracking
    requestLocationPermission();
    
    // Cargar datos
    fetchLocations();
    fetchRadars();
    
    return () => {
      // Cleanup
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
      if (checkIntervalId.current) {
        BackgroundTimer.clearInterval(checkIntervalId.current);
      }
    };
  }, []);

  const configurePushNotifications = () => {
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('Notification:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });

    // Canal para Android
    PushNotification.createChannel(
      {
        channelId: 'alerts',
        channelName: 'Alertas de Tráfico',
        channelDescription: 'Alertas de radares y controles',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Channel created: ${created}`)
    );
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: pedir WHEN_IN_USE primero, luego ALWAYS
        let result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (result === RESULTS.GRANTED) {
          // Ahora pedir ALWAYS para background
          result = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
        }
        if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
          startRealtimeLocationTracking();
        } else {
          // Intentar con solo WHEN_IN_USE
          startRealtimeLocationTracking();
        }
      } else {
        // Android: pedir FINE_LOCATION primero (obligatorio)
        const fineResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

        if (fineResult === RESULTS.GRANTED) {
          startRealtimeLocationTracking();

          // Luego pedir BACKGROUND si Android 10+
          if (Platform.Version >= 29) {
            const bgResult = await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
            if (bgResult !== RESULTS.GRANTED) {
              console.log('Background location not granted - alerts may not work in background');
            }
          }
        } else {
          Alert.alert(
            'Permiso de Ubicación',
            'CamperSites necesita tu ubicación para mostrarte lugares cercanos y alertas de radares.\n\nVe a Ajustes > Aplicaciones > CamperSites > Permisos > Ubicación y actívalo.',
            [{ text: 'Entendido' }]
          );
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      // Intentar tracking de todas formas por si ya tiene permisos
      startRealtimeLocationTracking();
    }
  };

  // ⭐ GPS EN TIEMPO REAL - ACTUALIZACIÓN CADA 1 SEGUNDO
  const startRealtimeLocationTracking = () => {
    // Obtener ubicación inicial
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        setCurrentLocation({ 
          latitude, 
          longitude, 
          speed: speed || 0 
        });
        setLoading(false);
        
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        setLoading(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );

    // ⚠️ CRÍTICO: Actualización cada 1 SEGUNDO
    watchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        setCurrentLocation({ 
          latitude, 
          longitude, 
          speed: speed || 0 
        });
      },
      (error) => console.error('Watch position error:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 0, // Sin filtro = máxima precisión
        interval: GPS_UPDATE_INTERVAL, // 1 segundo
        fastestInterval: 500, // Mínimo 500ms
        forceRequestLocation: true,
        showLocationDialog: true,
      }
    );

    // ⚠️ CRÍTICO: Verificar alertas cada 2 segundos
    checkIntervalId.current = BackgroundTimer.setInterval(() => {
      if (currentLocation && isNavigating) {
        checkForAlerts(currentLocation.latitude, currentLocation.longitude, currentLocation.speed);
      }
    }, CHECK_INTERVAL);
  };

  // ⭐ SISTEMA DE ALERTAS MEJORADO
  const checkForAlerts = (lat: number, lng: number, speed: number) => {
    radars.forEach((radar) => {
      const distance = haversine(
        { latitude: lat, longitude: lng },
        { latitude: radar.latitude, longitude: radar.longitude }
      );

      const radarKey = `${radar.id}-${distance < 100 ? 'close' : 'far'}`;

      // ⚠️ ALERTA 1KM - RADARES
      if (radar.type === 'RADAR' && distance <= RADAR_ALERT_DISTANCE && distance > RADAR_REMINDER_DISTANCE) {
        if (!alertedRadars.has(radarKey)) {
          sendRadarAlert(radar, distance, speed, '1km');
          setAlertedRadars(prev => new Set(prev).add(radarKey));
        }
      }

      // ⚠️ RECORDATORIO 50M - RADARES
      if (radar.type === 'RADAR' && distance <= RADAR_REMINDER_DISTANCE && distance > 10) {
        const reminderKey = `${radar.id}-reminder`;
        if (!alertedRadars.has(reminderKey)) {
          sendRadarAlert(radar, distance, speed, '50m');
          setAlertedRadars(prev => new Set(prev).add(reminderKey));
        }
      }

      // ⚠️ VERIFICACIÓN - AL PASAR
      if (distance <= 10 && !alertedRadars.has(`${radar.id}-passed`)) {
        setRadarToVerify(radar);
        setShowRadarVerification(true);
        setAlertedRadars(prev => new Set(prev).add(`${radar.id}-passed`));
      }

      // ⚠️ ALERTA 5KM - CONTROLES (Autopista)
      if (radar.type === 'CONTROL' && distance <= CONTROL_ALERT_DISTANCE && distance > CONTROL_REMINDER_DISTANCE) {
        if (!alertedRadars.has(radarKey)) {
          sendControlAlert(radar, distance, '5km');
          setAlertedRadars(prev => new Set(prev).add(radarKey));
          
          // Ofrecer ruta alternativa INMEDIATAMENTE
          offerAlternativeRoute(lat, lng);
        }
      }

      // ⚠️ RECORDATORIO 1KM - CONTROLES
      if (radar.type === 'CONTROL' && distance <= CONTROL_REMINDER_DISTANCE && distance > 100) {
        const reminderKey = `${radar.id}-control-reminder`;
        if (!alertedRadars.has(reminderKey)) {
          sendControlAlert(radar, distance, '1km');
          setAlertedRadars(prev => new Set(prev).add(reminderKey));
        }
      }
    });
  };

  // ⭐ NOTIFICACIÓN RADAR (1km y 50m)
  const sendRadarAlert = (radar: Radar, distance: number, speed: number, stage: string) => {
    const timeToRadar = speed > 0 ? (distance / (speed / 3.6)) : 0;
    
    PushNotification.localNotification({
      channelId: 'alerts',
      title: stage === '1km' ? '⚠️ RADAR A 1KM' : '🚨 RADAR 50 METROS',
      message: `Límite: ${radar.speedLimit} km/h - Llegas en ${Math.round(timeToRadar)}s`,
      playSound: true,
      vibrate: true,
      priority: 'high',
      importance: 'high',
    });

    // Vibración diferente según distancia
    if (Platform.OS === 'android') {
      const pattern = stage === '1km' ? [0, 500, 200, 500] : [0, 200, 100, 200, 100, 200];
      // @ts-ignore
      Vibration.vibrate(pattern);
    }
  };

  // ⭐ NOTIFICACIÓN CONTROL (5km y 1km + RECÁLCULO)
  const sendControlAlert = (radar: Radar, distance: number, stage: string) => {
    const distanceKm = (distance / 1000).toFixed(1);
    
    PushNotification.localNotification({
      channelId: 'alerts',
      title: stage === '5km' ? '🚔 CONTROL POLICIAL 5KM' : '🚨 CONTROL 1KM',
      message: stage === '5km' 
        ? `Control detectado a ${distanceKm}km - Tienes tiempo para salir`
        : `Control a ${distanceKm}km - Última oportunidad`,
      playSound: true,
      vibrate: true,
      priority: 'max',
      importance: 'max',
    });

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
                currentLocation.latitude,
                currentLocation.longitude,
                selectedLocation.latitude,
                selectedLocation.longitude,
                true // Evitar control
              );
            }
          }
        }
      ]
    );
  };

  // ⭐ RECÁLCULO AUTOMÁTICO RUTA
  const offerAlternativeRoute = async (lat: number, lng: number) => {
    if (!selectedLocation) return;

    await calculateRoutes(
      lat,
      lng,
      selectedLocation.latitude,
      selectedLocation.longitude,
      true
    );

    Alert.alert(
      'Ruta Alternativa Calculada',
      '¿Deseas tomar la ruta alternativa que evita el control?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, Cambiar', 
          onPress: () => {
            if (routes.length > 1) {
              setSelectedRoute(routes[1]); // Ruta alternativa
            }
          }
        }
      ]
    );
  };

  // ⭐ CARGA DINÁMICA: Locations desde Supabase en radio de 50km
  const lastFetchCenter = useRef<{lat: number; lng: number} | null>(null);

  const fetchLocations = async (lat?: number, lng?: number) => {
    try {
      const centerLat = lat || currentLocation?.latitude || 40.4168;
      const centerLng = lng || currentLocation?.longitude || -3.7038;

      // Radio de 50km = ~0.45° lat, ~0.55° lon
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
        console.error('Error fetching locations:', error);
        return;
      }

      setLocations(data || []);
      lastFetchCenter.current = { lat: centerLat, lng: centerLng };
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Fallback vacío - sin datos hardcoded
      setLocations([]);
    }
  };

  // Refetch dinámico: recargar cuando usuario se mueve >15km
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
        console.error('Error fetching radars:', error);
        return;
      }

      // Mapear snake_case → camelCase
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

  // ⭐ CALCULAR RUTAS (Principal + Alternativas)
  const calculateRoutes = async (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    avoidControls: boolean = false
  ) => {
    try {
      // Ruta principal (mas rapida)
      const mainUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`;

      // Ruta alternativa
      const altUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full&alternatives=true&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`;

      const [mainResponse, altResponse] = await Promise.all([
        fetch(mainUrl),
        fetch(altUrl),
      ]);

      const mainData = await mainResponse.json();
      const altData = await altResponse.json();

      const calculatedRoutes: Route[] = [];

      // Procesar ruta principal
      if (mainData.routes && mainData.routes.length > 0) {
        const route = mainData.routes[0];
        calculatedRoutes.push({
          coordinates: route.geometry.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
          })),
          distance: route.distance,
          duration: route.duration,
          incidents: detectIncidents(route.geometry.coordinates),
          type: 'fastest',
        });
      }

      // Procesar rutas alternativas
      if (altData.routes && altData.routes.length > 1) {
        for (let i = 1; i < altData.routes.length; i++) {
          const route = altData.routes[i];
          calculatedRoutes.push({
            coordinates: route.geometry.coordinates.map((coord: number[]) => ({
              latitude: coord[1],
              longitude: coord[0],
            })),
            distance: route.distance,
            duration: route.duration,
            incidents: detectIncidents(route.geometry.coordinates),
            type: 'alternative',
          });
        }
      }

      setRoutes(calculatedRoutes);
      setShowRouteSelector(true);

    } catch (error) {
      console.error('Error calculating routes:', error);
      Alert.alert('Error', 'No se pudo calcular la ruta');
    }
  };

  // Detectar incidentes en ruta
  const detectIncidents = (coordinates: number[][]): string[] => {
    const incidents: string[] = [];
    
    coordinates.forEach((coord) => {
      radars.forEach((radar) => {
        const distance = haversine(
          { latitude: coord[1], longitude: coord[0] },
          { latitude: radar.latitude, longitude: radar.longitude }
        );
        
        if (distance < 100) {
          if (radar.type === 'RADAR') {
            incidents.push(`⚠️ Radar ${radar.speedLimit} km/h`);
          } else {
            incidents.push(`🚔 Control policial`);
          }
        }
      });
    });

    return [...new Set(incidents)]; // Eliminar duplicados
  };

  const startNavigation = (route: Route) => {
    setSelectedRoute(route);
    setIsNavigating(true);
    setShowRouteSelector(false);
    setAlertedRadars(new Set()); // Reset alertas

    PushNotification.localNotification({
      channelId: 'alerts',
      title: '🚗 Navegación Iniciada',
      message: `Destino: ${selectedLocation?.name}`,
      ongoing: true,
    });

    // Ajustar mapa a ruta
    mapRef.current?.fitToCoordinates(route.coordinates, {
      edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
      animated: true,
    });
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setSelectedLocation(null);
    setSelectedRoute(null);
    setRoutes([]);
    setAlertedRadars(new Set());

    PushNotification.cancelAllLocalNotifications();
  };

  const verifyRadar = async (stillThere: boolean) => {
    if (!radarToVerify) return;

    try {
      // Insertar reporte de verificación en Supabase
      await supabase.from('radar_reports').insert({
        radar_id: radarToVerify.id,
        report_type: stillThere ? 'confirmed' : 'removed',
        reported_at: new Date().toISOString(),
      });

      // Actualizar radar si se confirma
      if (stillThere) {
        await supabase
          .from('radars')
          .update({
            last_verified: new Date().toISOString(),
            verified: true,
          })
          .eq('id', radarToVerify.id);
      }

      Alert.alert(
        'Gracias',
        stillThere
          ? 'Radar confirmado y actualizado'
          : 'Radar marcado como eliminado'
      );
    } catch (error) {
      console.error('Error verifying radar:', error);
    }

    setShowRadarVerification(false);
    setRadarToVerify(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Iniciando GPS en tiempo real...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation?.latitude || 40.4168,
          longitude: currentLocation?.longitude || -3.7038,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false} // Usamos marcador custom
        showsMyLocationButton={false}
        followsUserLocation={isNavigating}>
        
        {/* Usuario - Marcador custom */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={0}>
            <View style={styles.userMarker}>
              <Icon name="navigation" size={30} color="#1976D2" />
            </View>
          </Marker>
        )}

        {/* Ubicaciones - con iconos y colores por categoría */}
        {locations.map((location) => {
          const markerConfig = getMarkerConfig(location.category);
          return (
            <Marker
              key={location.id}
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={location.name}
              description={location.description || location.address}
              onPress={() => {
                setSelectedLocation(location);
                if (currentLocation) {
                  calculateRoutes(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    location.latitude,
                    location.longitude
                  );
                }
              }}>
              <Icon name={markerConfig.icon} size={32} color={markerConfig.color} />
            </Marker>
          );
        })}

        {/* Radares */}
        {radars.map((radar) => (
          <Marker
            key={radar.id}
            coordinate={{
              latitude: radar.latitude,
              longitude: radar.longitude,
            }}
            title={radar.type === 'RADAR' ? 'Radar' : 'Control'}
            description={`${radar.speedLimit} km/h`}>
            <Icon 
              name={radar.type === 'RADAR' ? 'speedometer' : 'shield-alert'} 
              size={30} 
              color={radar.type === 'RADAR' ? '#D32F2F' : '#FF6F00'} 
            />
          </Marker>
        ))}

        {/* Rutas */}
        {selectedRoute && (
          <Polyline
            coordinates={selectedRoute.coordinates}
            strokeColor="#2196F3"
            strokeWidth={5}
          />
        )}

        {/* Rutas alternativas (grises) */}
        {routes.filter(r => r !== selectedRoute).map((route, idx) => (
          <Polyline
            key={idx}
            coordinates={route.coordinates}
            strokeColor="#9E9E9E"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        ))}
      </MapView>

      {/* Botón centrar */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={() => {
          if (currentLocation && mapRef.current) {
            mapRef.current.animateToRegion({
              ...currentLocation,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }
        }}>
        <Icon name="crosshairs-gps" size={24} color="#2E7D32" />
      </TouchableOpacity>

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
      <Modal
        visible={showRouteSelector}
        transparent={true}
        animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona tu ruta</Text>
            
            {routes.map((route, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.routeOption,
                  route.type === 'fastest' && styles.recommendedRoute
                ]}
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

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowRouteSelector(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal verificación radar */}
      <Modal
        visible={showRadarVerification}
        transparent={true}
        animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.verifyModal}>
            <Text style={styles.verifyTitle}>¿El radar sigue aquí?</Text>
            <Text style={styles.verifySubtitle}>
              Ayúdanos a mantener la información actualizada
            </Text>
            <View style={styles.verifyButtons}>
              <TouchableOpacity
                style={[styles.verifyBtn, styles.verifyNo]}
                onPress={() => verifyRadar(false)}>
                <Text style={styles.verifyBtnText}>No, lo quitaron</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.verifyBtn, styles.verifyYes]}
                onPress={() => verifyRadar(true)}>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
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
  navInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    marginLeft: 10,
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  navStats: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  navSpeed: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 5,
  },
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
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
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  routeType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeStats: {
    fontSize: 14,
    color: '#666',
  },
  incidents: {
    marginTop: 5,
  },
  incidentsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 5,
  },
  incident: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  cancelBtn: {
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  verifyModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    margin: 20,
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  verifySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  verifyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verifyBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  verifyNo: {
    backgroundColor: '#F44336',
  },
  verifyYes: {
    backgroundColor: '#4CAF50',
  },
  verifyBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MapScreen;
