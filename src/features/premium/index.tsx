/**
 * FASE 5: FEATURES PREMIUM
 * Funcionalidades avanzadas para suscripción
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MAPBOX_ACCESS_TOKEN } from '@env';

// ⭐ 1. RUTAS MULTI-DESTINO
export const MultiDestinationRoute = () => {
  const [waypoints, setWaypoints] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);

  const addWaypoint = (location) => {
    setWaypoints([...waypoints, location]);
  };

  const optimizeRoute = async () => {
    // Algoritmo TSP (Traveling Salesman Problem) simplificado
    const coordinates = waypoints.map(w => `${w.longitude},${w.latitude}`).join(';');
    
    const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates}?roundtrip=false&source=first&destination=last&access_token=${MAPBOX_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.trips && data.trips.length > 0) {
      setOptimizedRoute(data.trips[0]);
    }
  };

  return (
    <View>
      <Text style={styles.title}>Planifica tu Ruta Multi-Destino</Text>
      {waypoints.map((wp, idx) => (
        <View key={idx} style={styles.waypoint}>
          <Text>{idx + 1}. {wp.name}</Text>
          <TouchableOpacity onPress={() => removeWaypoint(idx)}>
            <Icon name="close" size={20} />
          </TouchableOpacity>
        </View>
      ))}
      
      {waypoints.length >= 2 && (
        <TouchableOpacity style={styles.optimizeBtn} onPress={optimizeRoute}>
          <Text style={styles.optimizeBtnText}>Optimizar Ruta</Text>
        </TouchableOpacity>
      )}

      {optimizedRoute && (
        <View style={styles.routeInfo}>
          <Text>Distancia total: {(optimizedRoute.distance / 1000).toFixed(1)} km</Text>
          <Text>Tiempo estimado: {Math.round(optimizedRoute.duration / 60)} min</Text>
          <Text>Paradas optimizadas: {waypoints.length}</Text>
        </View>
      )}
    </View>
  );
};

// ⭐ 2. PLANIFICADOR VIAJES MULTI-DÍA
export const TripPlanner = () => {
  const [trip, setTrip] = useState({
    name: '',
    startDate: new Date(),
    endDate: new Date(),
    days: [],
  });

  const addDay = (day) => {
    const newDay = {
      date: day,
      locations: [],
      notes: '',
      budget: 0,
    };
    setTrip({ ...trip, days: [...trip.days, newDay] });
  };

  const addLocationToDay = (dayIndex, location) => {
    const updatedDays = [...trip.days];
    updatedDays[dayIndex].locations.push(location);
    setTrip({ ...trip, days: updatedDays });
  };

  const calculateTripCost = () => {
    return trip.days.reduce((total, day) => {
      const dayCost = day.locations.reduce((sum, loc) => sum + (loc.price || 0), 0);
      return total + dayCost;
    }, 0);
  };

  const exportToCalendar = async () => {
    // Exportar a Google Calendar / Apple Calendar
    const icsData = generateICS(trip);
    await Share.share({
      message: 'Mi viaje en CamperSites',
      url: icsData,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Planifica tu Viaje</Text>
      
      <View style={styles.tripHeader}>
        <TextInput
          placeholder="Nombre del viaje"
          value={trip.name}
          onChangeText={(name) => setTrip({ ...trip, name })}
          style={styles.tripName}
        />
        <View style={styles.dates}>
          <DatePicker
            date={trip.startDate}
            onDateChange={(date) => setTrip({ ...trip, startDate: date })}
          />
          <Text> - </Text>
          <DatePicker
            date={trip.endDate}
            onDateChange={(date) => setTrip({ ...trip, endDate: date })}
          />
        </View>
      </View>

      {trip.days.map((day, idx) => (
        <View key={idx} style={styles.dayCard}>
          <Text style={styles.dayTitle}>Día {idx + 1}</Text>
          <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
          
          {day.locations.map((loc, locIdx) => (
            <View key={locIdx} style={styles.locationItem}>
              <Icon name="map-marker" size={20} color="#2E7D32" />
              <Text style={styles.locationName}>{loc.name}</Text>
              <Text style={styles.locationPrice}>{loc.price || 0}€</Text>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addLocationBtn}
            onPress={() => {/* Abrir selector de ubicación */}}>
            <Icon name="plus" size={20} />
            <Text>Añadir parada</Text>
          </TouchableOpacity>

          <TextInput
            placeholder="Notas del día..."
            value={day.notes}
            onChangeText={(notes) => updateDayNotes(idx, notes)}
            multiline
            style={styles.notes}
          />
        </View>
      ))}

      <View style={styles.tripSummary}>
        <Text style={styles.summaryTitle}>Resumen del Viaje</Text>
        <Text>Duración: {trip.days.length} días</Text>
        <Text>Paradas totales: {trip.days.reduce((sum, d) => sum + d.locations.length, 0)}</Text>
        <Text style={styles.totalCost}>Coste estimado: {calculateTripCost()}€</Text>
      </View>

      <TouchableOpacity style={styles.exportBtn} onPress={exportToCalendar}>
        <Icon name="calendar-export" size={20} color="#FFF" />
        <Text style={styles.exportBtnText}>Exportar a Calendario</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ⭐ 3. MODO OFFLINE COMPLETO
export const OfflineManager = () => {
  const [downloadedRegions, setDownloadedRegions] = useState([]);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const downloadRegion = async (region) => {
    const { minLat, maxLat, minLng, maxLng } = region.bounds;
    
    // Descargar tiles del mapa
    const zoom = 14; // Nivel de detalle
    const tiles = calculateTiles(minLat, maxLat, minLng, maxLng, zoom);
    
    let downloaded = 0;
    for (const tile of tiles) {
      const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/${tile.z}/${tile.x}/${tile.y}?access_token=${MAPBOX_ACCESS_TOKEN}`;
      const response = await fetch(url);
      const blob = await response.blob();
      
      await AsyncStorage.setItem(
        `tile_${tile.z}_${tile.x}_${tile.y}`,
        await blobToBase64(blob)
      );
      
      downloaded++;
      setDownloadProgress((downloaded / tiles.length) * 100);
    }

    // Descargar datos de ubicaciones
    const locations = await fetchLocationsInBounds(region.bounds);
    await AsyncStorage.setItem(
      `locations_${region.id}`,
      JSON.stringify(locations)
    );

    // Descargar datos de radares
    const radars = await fetchRadarsInBounds(region.bounds);
    await AsyncStorage.setItem(
      `radars_${region.id}`,
      JSON.stringify(radars)
    );

    setDownloadedRegions([...downloadedRegions, region]);
  };

  const getOfflineLocations = async (regionId) => {
    const data = await AsyncStorage.getItem(`locations_${regionId}`);
    return data ? JSON.parse(data) : [];
  };

  return (
    <View style={styles.offlineManager}>
      <Text style={styles.title}>Mapas Offline</Text>
      
      <View style={styles.regionList}>
        <TouchableOpacity
          style={styles.regionCard}
          onPress={() => downloadRegion({ id: 'andalucia', name: 'Andalucía', bounds: {...} })}>
          <Icon name="download" size={30} color="#2E7D32" />
          <Text>Andalucía</Text>
          <Text style={styles.size}>~250MB</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.regionCard}
          onPress={() => downloadRegion({ id: 'cataluna', name: 'Cataluña', bounds: {...} })}>
          <Icon name="download" size={30} color="#2E7D32" />
          <Text>Cataluña</Text>
          <Text style={styles.size}>~180MB</Text>
        </TouchableOpacity>
      </View>

      {downloadProgress > 0 && downloadProgress < 100 && (
        <View style={styles.progress}>
          <Text>Descargando... {downloadProgress.toFixed(0)}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
          </View>
        </View>
      )}

      <View style={styles.downloaded}>
        <Text style={styles.downloadedTitle}>Regiones Descargadas</Text>
        {downloadedRegions.map((region) => (
          <View key={region.id} style={styles.downloadedItem}>
            <Icon name="check-circle" size={20} color="#2E7D32" />
            <Text>{region.name}</Text>
            <TouchableOpacity onPress={() => deleteRegion(region.id)}>
              <Icon name="delete" size={20} color="#D32F2F" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

// ⭐ 4. SISTEMA DE FAVORITOS AVANZADO
export const AdvancedFavorites = () => {
  const [folders, setFolders] = useState([
    { id: '1', name: 'Playas', color: '#2196F3', locations: [] },
    { id: '2', name: 'Montaña', color: '#4CAF50', locations: [] },
    { id: '3', name: 'Ciudades', color: '#FF9800', locations: [] },
  ]);

  const createFolder = (name, color) => {
    const newFolder = {
      id: Date.now().toString(),
      name,
      color,
      locations: [],
    };
    setFolders([...folders, newFolder]);
  };

  const addToFolder = (folderId, location) => {
    const updatedFolders = folders.map(f => 
      f.id === folderId 
        ? { ...f, locations: [...f.locations, location] }
        : f
    );
    setFolders(updatedFolders);
  };

  const shareFolder = async (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    
    // Generar link compartible
    const shareData = {
      title: `Mis favoritos: ${folder.name}`,
      text: `${folder.locations.length} ubicaciones compartidas`,
      url: `campersites://shared-folder/${folderId}`,
    };

    await Share.share(shareData);
  };

  return (
    <ScrollView style={styles.favorites}>
      <Text style={styles.heading}>Mis Favoritos</Text>
      
      {folders.map(folder => (
        <View key={folder.id} style={[styles.folder, { borderColor: folder.color }]}>
          <View style={styles.folderHeader}>
            <View style={styles.folderTitle}>
              <View style={[styles.colorDot, { backgroundColor: folder.color }]} />
              <Text style={styles.folderName}>{folder.name}</Text>
              <Text style={styles.folderCount}>({folder.locations.length})</Text>
            </View>
            <TouchableOpacity onPress={() => shareFolder(folder.id)}>
              <Icon name="share-variant" size={20} />
            </TouchableOpacity>
          </View>

          {folder.locations.map(loc => (
            <View key={loc.id} style={styles.favLocation}>
              <Icon name="map-marker" size={20} color={folder.color} />
              <Text style={styles.favLocationName}>{loc.name}</Text>
            </View>
          ))}
        </View>
      ))}

      <TouchableOpacity
        style={styles.createFolderBtn}
        onPress={() => {/* Mostrar modal crear carpeta */}}>
        <Icon name="folder-plus" size={24} color="#2E7D32" />
        <Text>Nueva Carpeta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ⭐ 5. ESTADÍSTICAS Y LOGROS
export const StatsAndAchievements = () => {
  const [stats, setStats] = useState({
    kmDriven: 0,
    locationsVisited: 0,
    daysOnRoad: 0,
    countriesVisited: 0,
  });

  const achievements = [
    { id: 'explorer', name: 'Explorador', description: 'Visita 10 ubicaciones', unlocked: false, icon: 'compass' },
    { id: 'adventurer', name: 'Aventurero', description: '1000km recorridos', unlocked: false, icon: 'road' },
    { id: 'camper', name: 'Camper Pro', description: '30 días en ruta', unlocked: false, icon: 'trophy' },
  ];

  return (
    <ScrollView style={styles.stats}>
      <Text style={styles.heading}>Tus Estadísticas</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Icon name="road-variant" size={40} color="#2E7D32" />
          <Text style={styles.statValue}>{stats.kmDriven.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Kilómetros</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="map-marker-multiple" size={40} color="#1976D2" />
          <Text style={styles.statValue}>{stats.locationsVisited}</Text>
          <Text style={styles.statLabel}>Lugares Visitados</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="calendar" size={40} color="#FF6F00" />
          <Text style={styles.statValue}>{stats.daysOnRoad}</Text>
          <Text style={styles.statLabel}>Días de Ruta</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="earth" size={40} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.countriesVisited}</Text>
          <Text style={styles.statLabel}>Países</Text>
        </View>
      </View>

      <Text style={styles.achievementsTitle}>Logros</Text>
      
      {achievements.map(achievement => (
        <View 
          key={achievement.id} 
          style={[
            styles.achievement,
            achievement.unlocked && styles.achievementUnlocked
          ]}>
          <Icon 
            name={achievement.icon} 
            size={30} 
            color={achievement.unlocked ? '#FFD700' : '#BDBDBD'} 
          />
          <View style={styles.achievementInfo}>
            <Text style={styles.achievementName}>{achievement.name}</Text>
            <Text style={styles.achievementDesc}>{achievement.description}</Text>
          </View>
          {achievement.unlocked && (
            <Icon name="check-circle" size={24} color="#4CAF50" />
          )}
        </View>
      ))}
    </ScrollView>
  );
};

// ⭐ MODELO DE NEGOCIO ACTUALIZADO
/*
GRATIS:
- ✅ GPS ILIMITADO (NUEVO!)
- ✅ Navegación ilimitada
- ✅ Alertas radares
- ✅ Alertas controles 10km
- ✅ Ubicaciones básicas: 5,000
- ✅ Favoritos: 5

PREMIUM (9.99€/mes):
- ✅ Ubicaciones premium: 15,000+ (los mejores sitios)
- ✅ Multi-destino optimizado
- ✅ Planificador multi-día
- ✅ Mapas offline
- ✅ Carpetas favoritos ilimitadas
- ✅ Compartir carpetas
- ✅ Estadísticas avanzadas
- ✅ Logros y gamificación
- ✅ Sin anuncios
- ✅ Soporte prioritario
*/
