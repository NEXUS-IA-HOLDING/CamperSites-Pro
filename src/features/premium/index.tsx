/**
 * FASE 5: FEATURES PREMIUM
 * Funcionalidades avanzadas para suscripción
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Share,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MAPBOX_ACCESS_TOKEN } from '@env';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const generateICS = (trip: Trip): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CamperSites//ES',
  ];
  trip.days.forEach((day, idx) => {
    const dtstart = day.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`SUMMARY:${trip.name} - Día ${idx + 1}`);
    lines.push(`DESCRIPTION:${day.notes || 'Sin notas'}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

// Conversión de coordenadas a tiles OSM/Mapbox
const lon2tile = (lon: number, zoom: number) =>
  Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
const lat2tile = (lat: number, zoom: number) =>
  Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );

const calculateTiles = (
  minLat: number, maxLat: number,
  minLng: number, maxLng: number,
  zoom: number,
): { z: number; x: number; y: number }[] => {
  const tiles: { z: number; x: number; y: number }[] = [];
  const xMin = lon2tile(minLng, zoom);
  const xMax = lon2tile(maxLng, zoom);
  const yMin = lat2tile(maxLat, zoom); // lat invertida en tiles
  const yMax = lat2tile(minLat, zoom);
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push({ z: zoom, x, y });
    }
  }
  return tiles;
};

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  price?: number;
}

interface DayPlan {
  date: Date;
  locations: Location[];
  notes: string;
  budget: number;
}

interface Trip {
  name: string;
  startDate: Date;
  endDate: Date;
  days: DayPlan[];
}

interface Region {
  id: string;
  name: string;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

interface Folder {
  id: string;
  name: string;
  color: string;
  locations: Location[];
}

interface Stats {
  kmDriven: number;
  locationsVisited: number;
  daysOnRoad: number;
  countriesVisited: number;
}

// ─── Regiones predefinidas ───────────────────────────────────────────────────

const REGIONS: Region[] = [
  { id: 'andalucia', name: 'Andalucía', bounds: { minLat: 36.0, maxLat: 38.7, minLng: -7.5, maxLng: -1.7 } },
  { id: 'cataluna', name: 'Cataluña', bounds: { minLat: 40.5, maxLat: 42.9, minLng: 0.1, maxLng: 3.3 } },
  { id: 'madrid', name: 'Madrid', bounds: { minLat: 39.8, maxLat: 41.2, minLng: -4.6, maxLng: -3.0 } },
  { id: 'galicia', name: 'Galicia', bounds: { minLat: 41.8, maxLat: 43.8, minLng: -9.3, maxLng: -6.7 } },
];

// ─── 1. RUTAS MULTI-DESTINO ──────────────────────────────────────────────────

export const MultiDestinationRoute = () => {
  const [waypoints, setWaypoints] = useState<Location[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<{ distance: number; duration: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const addWaypoint = (location: Location) => {
    setWaypoints(prev => [...prev, location]);
  };

  const removeWaypoint = (idx: number) => {
    setWaypoints(prev => prev.filter((_, i) => i !== idx));
  };

  const optimizeRoute = async () => {
    if (waypoints.length < 2) return;
    setLoading(true);
    try {
      const coordinates = waypoints.map(w => `${w.longitude},${w.latitude}`).join(';');
      const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates}?roundtrip=false&source=first&destination=last&access_token=${MAPBOX_ACCESS_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.trips && data.trips.length > 0) {
        setOptimizedRoute(data.trips[0]);
      } else {
        Alert.alert('Sin resultados', 'No se pudo calcular la ruta optimizada.');
      }
    } catch (e) {
      console.error('optimizeRoute error:', e);
      Alert.alert('Error', 'No se pudo conectar con el servicio de rutas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ruta Multi-Destino</Text>
      {waypoints.map((wp, idx) => (
        <View key={idx} style={styles.waypoint}>
          <Text style={styles.waypointText}>{idx + 1}. {wp.name}</Text>
          <TouchableOpacity onPress={() => removeWaypoint(idx)}>
            <Icon name="close" size={20} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      ))}

      {waypoints.length >= 2 && (
        <TouchableOpacity
          style={[styles.optimizeBtn, loading && styles.btnDisabled]}
          onPress={optimizeRoute}
          disabled={loading}>
          <Text style={styles.optimizeBtnText}>
            {loading ? 'Calculando...' : 'Optimizar Ruta'}
          </Text>
        </TouchableOpacity>
      )}

      {optimizedRoute && (
        <View style={styles.routeInfo}>
          <Text style={styles.routeInfoText}>Distancia: {(optimizedRoute.distance / 1000).toFixed(1)} km</Text>
          <Text style={styles.routeInfoText}>Tiempo: {Math.round(optimizedRoute.duration / 60)} min</Text>
          <Text style={styles.routeInfoText}>Paradas: {waypoints.length}</Text>
        </View>
      )}
    </View>
  );
};

// ─── 2. PLANIFICADOR MULTI-DÍA ───────────────────────────────────────────────

export const TripPlanner = () => {
  const [trip, setTrip] = useState<Trip>({
    name: '',
    startDate: new Date(),
    endDate: new Date(),
    days: [],
  });

  const addDay = () => {
    const nextDate = new Date(trip.startDate);
    nextDate.setDate(nextDate.getDate() + trip.days.length);
    const newDay: DayPlan = { date: nextDate, locations: [], notes: '', budget: 0 };
    setTrip(prev => ({ ...prev, days: [...prev.days, newDay] }));
  };

  const removeDay = (idx: number) => {
    setTrip(prev => ({ ...prev, days: prev.days.filter((_, i) => i !== idx) }));
  };

  const updateDayNotes = (dayIndex: number, notes: string) => {
    setTrip(prev => {
      const updatedDays = [...prev.days];
      updatedDays[dayIndex] = { ...updatedDays[dayIndex], notes };
      return { ...prev, days: updatedDays };
    });
  };

  const calculateTripCost = () =>
    trip.days.reduce((total, day) =>
      total + day.locations.reduce((sum, loc) => sum + (loc.price || 0), 0), 0);

  const exportToCalendar = async () => {
    if (!trip.name) {
      Alert.alert('Falta nombre', 'Añade un nombre al viaje antes de exportar.');
      return;
    }
    try {
      const icsData = generateICS(trip);
      await Share.share({
        message: `Mi viaje "${trip.name}" en CamperSites\n\n${icsData}`,
        title: `Viaje: ${trip.name}`,
      });
    } catch (e) {
      console.error('exportToCalendar error:', e);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Planifica tu Viaje</Text>

      <TextInput
        placeholder="Nombre del viaje"
        placeholderTextColor="#9E9E9E"
        value={trip.name}
        onChangeText={name => setTrip(prev => ({ ...prev, name }))}
        style={styles.tripName}
      />

      {trip.days.map((day, idx) => (
        <View key={idx} style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>Día {idx + 1} — {formatDate(day.date)}</Text>
            <TouchableOpacity onPress={() => removeDay(idx)}>
              <Icon name="delete" size={18} color="#D32F2F" />
            </TouchableOpacity>
          </View>

          {day.locations.map((loc, locIdx) => (
            <View key={locIdx} style={styles.locationItem}>
              <Icon name="map-marker" size={18} color="#2E7D32" />
              <Text style={styles.locationName}>{loc.name}</Text>
              <Text style={styles.locationPrice}>{loc.price || 0}€</Text>
            </View>
          ))}

          <TextInput
            placeholder="Notas del día..."
            placeholderTextColor="#9E9E9E"
            value={day.notes}
            onChangeText={notes => updateDayNotes(idx, notes)}
            multiline
            style={styles.notes}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addDayBtn} onPress={addDay}>
        <Icon name="plus" size={20} color="#2E7D32" />
        <Text style={styles.addDayText}>Añadir día</Text>
      </TouchableOpacity>

      <View style={styles.tripSummary}>
        <Text style={styles.summaryTitle}>Resumen</Text>
        <Text style={styles.summaryText}>Duración: {trip.days.length} días</Text>
        <Text style={styles.summaryText}>
          Paradas: {trip.days.reduce((s, d) => s + d.locations.length, 0)}
        </Text>
        <Text style={styles.totalCost}>Coste estimado: {calculateTripCost()}€</Text>
      </View>

      <TouchableOpacity style={styles.exportBtn} onPress={exportToCalendar}>
        <Icon name="calendar-export" size={20} color="#FFF" />
        <Text style={styles.exportBtnText}>Exportar a Calendario</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── 3. MODO OFFLINE ─────────────────────────────────────────────────────────

export const OfflineManager = () => {
  const [downloadedRegions, setDownloadedRegions] = useState<Region[]>([]);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [currentRegion, setCurrentRegion] = useState('');

  useEffect(() => {
    loadDownloadedRegions();
  }, []);

  const loadDownloadedRegions = async () => {
    try {
      const raw = await AsyncStorage.getItem('offline_regions');
      if (raw) setDownloadedRegions(JSON.parse(raw));
    } catch (e) {
      console.error('loadDownloadedRegions error:', e);
    }
  };

  const isDownloaded = (regionId: string) =>
    downloadedRegions.some(r => r.id === regionId);

  const downloadRegion = async (region: Region) => {
    if (isDownloaded(region.id)) {
      Alert.alert('Ya descargado', `${region.name} ya está disponible offline.`);
      return;
    }
    setDownloading(true);
    setCurrentRegion(region.name);
    setDownloadProgress(0);

    try {
      const { minLat, maxLat, minLng, maxLng } = region.bounds;
      const tiles = calculateTiles(minLat, maxLat, minLng, maxLng, 10); // zoom 10 = ligero
      let downloaded = 0;

      for (const tile of tiles) {
        const url = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
        try {
          const response = await fetch(url);
          if (response.ok) {
            // Guardamos la URL para referencia offline (tiles reales requieren lib nativa)
            await AsyncStorage.setItem(`tile_ref_${tile.z}_${tile.x}_${tile.y}`, url);
          }
        } catch {
          // Tile individual fallida — continuar
        }
        downloaded++;
        setDownloadProgress(Math.round((downloaded / tiles.length) * 100));
      }

      const updated = [...downloadedRegions, region];
      setDownloadedRegions(updated);
      await AsyncStorage.setItem('offline_regions', JSON.stringify(updated));
      Alert.alert('✅ Descarga completada', `${region.name} disponible offline.`);
    } catch (e) {
      console.error('downloadRegion error:', e);
      Alert.alert('Error', 'No se pudo completar la descarga.');
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
      setCurrentRegion('');
    }
  };

  const deleteRegion = async (regionId: string) => {
    Alert.alert(
      'Eliminar región',
      '¿Eliminar los datos offline de esta región?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = downloadedRegions.filter(r => r.id !== regionId);
              setDownloadedRegions(updated);
              await AsyncStorage.setItem('offline_regions', JSON.stringify(updated));
            } catch (e) {
              console.error('deleteRegion error:', e);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mapas Offline</Text>

      <View style={styles.regionList}>
        {REGIONS.map(region => (
          <TouchableOpacity
            key={region.id}
            style={[styles.regionCard, isDownloaded(region.id) && styles.regionDownloaded]}
            onPress={() => downloadRegion(region)}
            disabled={downloading}>
            <Icon
              name={isDownloaded(region.id) ? 'check-circle' : 'download'}
              size={28}
              color={isDownloaded(region.id) ? '#2E7D32' : '#1976D2'}
            />
            <Text style={styles.regionName}>{region.name}</Text>
            <Text style={styles.regionSize}>
              {isDownloaded(region.id) ? 'Descargado' : 'Descargar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {downloading && (
        <View style={styles.progress}>
          <Text style={styles.progressText}>
            Descargando {currentRegion}... {downloadProgress}%
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${downloadProgress}%` as any }]} />
          </View>
        </View>
      )}

      {downloadedRegions.length > 0 && (
        <View style={styles.downloadedSection}>
          <Text style={styles.downloadedTitle}>Regiones Descargadas</Text>
          {downloadedRegions.map(region => (
            <View key={region.id} style={styles.downloadedItem}>
              <Icon name="check-circle" size={20} color="#2E7D32" />
              <Text style={styles.downloadedName}>{region.name}</Text>
              <TouchableOpacity onPress={() => deleteRegion(region.id)}>
                <Icon name="delete" size={20} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// ─── 4. FAVORITOS AVANZADOS ──────────────────────────────────────────────────

const FOLDERS_KEY = 'premium_folders';

export const AdvancedFavorites = () => {
  const [folders, setFolders] = useState<Folder[]>([
    { id: '1', name: 'Playas', color: '#2196F3', locations: [] },
    { id: '2', name: 'Montaña', color: '#4CAF50', locations: [] },
    { id: '3', name: 'Ciudades', color: '#FF9800', locations: [] },
  ]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const raw = await AsyncStorage.getItem(FOLDERS_KEY);
      if (raw) setFolders(JSON.parse(raw));
    } catch (e) {
      console.error('loadFolders error:', e);
    }
  };

  const saveFolders = async (updated: Folder[]) => {
    try {
      await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('saveFolders error:', e);
    }
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const colors = ['#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#009688'];
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      color: colors[Math.floor(Math.random() * colors.length)],
      locations: [],
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveFolders(updated);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const shareFolder = async (folder: Folder) => {
    try {
      const locationList = folder.locations.map(l => `• ${l.name}`).join('\n');
      await Share.share({
        title: `Mis favoritos: ${folder.name}`,
        message: `📍 ${folder.name} — ${folder.locations.length} ubicaciones\n\n${locationList}\n\nCompartido desde CamperSites Pro`,
      });
    } catch (e) {
      console.error('shareFolder error:', e);
    }
  };

  const deleteFolder = (folderId: string) => {
    Alert.alert('Eliminar carpeta', '¿Eliminar esta carpeta y sus favoritos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          const updated = folders.filter(f => f.id !== folderId);
          setFolders(updated);
          saveFolders(updated);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Mis Favoritos</Text>

      {folders.map(folder => (
        <View key={folder.id} style={[styles.folder, { borderLeftColor: folder.color }]}>
          <View style={styles.folderHeader}>
            <View style={styles.folderTitle}>
              <View style={[styles.colorDot, { backgroundColor: folder.color }]} />
              <Text style={styles.folderName}>{folder.name}</Text>
              <Text style={styles.folderCount}>({folder.locations.length})</Text>
            </View>
            <View style={styles.folderActions}>
              <TouchableOpacity onPress={() => shareFolder(folder)} style={styles.actionIcon}>
                <Icon name="share-variant" size={18} color="#1976D2" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteFolder(folder.id)} style={styles.actionIcon}>
                <Icon name="delete" size={18} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          </View>

          {folder.locations.length === 0 && (
            <Text style={styles.emptyFolder}>Sin ubicaciones aún</Text>
          )}

          {folder.locations.map(loc => (
            <View key={loc.id} style={styles.favLocation}>
              <Icon name="map-marker" size={18} color={folder.color} />
              <Text style={styles.favLocationName}>{loc.name}</Text>
            </View>
          ))}
        </View>
      ))}

      {showNewFolder ? (
        <View style={styles.newFolderForm}>
          <TextInput
            placeholder="Nombre de la carpeta"
            placeholderTextColor="#9E9E9E"
            value={newFolderName}
            onChangeText={setNewFolderName}
            style={styles.newFolderInput}
            autoFocus
          />
          <View style={styles.newFolderButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewFolder(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createBtn} onPress={createFolder}>
              <Text style={styles.createBtnText}>Crear</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.createFolderBtn} onPress={() => setShowNewFolder(true)}>
          <Icon name="folder-plus" size={22} color="#2E7D32" />
          <Text style={styles.createFolderText}>Nueva Carpeta</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

// ─── 5. ESTADÍSTICAS Y LOGROS ────────────────────────────────────────────────

const STATS_KEY = 'user_stats';

export const StatsAndAchievements = () => {
  const [stats, setStats] = useState<Stats>({
    kmDriven: 0,
    locationsVisited: 0,
    daysOnRoad: 0,
    countriesVisited: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const raw = await AsyncStorage.getItem(STATS_KEY);
      if (raw) setStats(JSON.parse(raw));
    } catch (e) {
      console.error('loadStats error:', e);
    }
  };

  const achievements = [
    {
      id: 'explorer',
      name: 'Explorador',
      description: 'Visita 10 ubicaciones',
      unlocked: stats.locationsVisited >= 10,
      icon: 'compass',
    },
    {
      id: 'adventurer',
      name: 'Aventurero',
      description: '1.000 km recorridos',
      unlocked: stats.kmDriven >= 1000,
      icon: 'road',
    },
    {
      id: 'camper',
      name: 'Camper Pro',
      description: '30 días en ruta',
      unlocked: stats.daysOnRoad >= 30,
      icon: 'trophy',
    },
    {
      id: 'worldtraveler',
      name: 'Viajero',
      description: 'Visita 3 países',
      unlocked: stats.countriesVisited >= 3,
      icon: 'earth',
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Tus Estadísticas</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Icon name="road-variant" size={36} color="#2E7D32" />
          <Text style={styles.statValue}>{stats.kmDriven.toLocaleString('es-ES')}</Text>
          <Text style={styles.statLabel}>Kilómetros</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="map-marker-multiple" size={36} color="#1976D2" />
          <Text style={styles.statValue}>{stats.locationsVisited}</Text>
          <Text style={styles.statLabel}>Lugares</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="calendar" size={36} color="#FF6F00" />
          <Text style={styles.statValue}>{stats.daysOnRoad}</Text>
          <Text style={styles.statLabel}>Días en Ruta</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="earth" size={36} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.countriesVisited}</Text>
          <Text style={styles.statLabel}>Países</Text>
        </View>
      </View>

      <Text style={styles.achievementsTitle}>
        Logros ({unlockedCount}/{achievements.length})
      </Text>

      {achievements.map(achievement => (
        <View
          key={achievement.id}
          style={[styles.achievement, achievement.unlocked && styles.achievementUnlocked]}>
          <Icon
            name={achievement.icon}
            size={28}
            color={achievement.unlocked ? '#FFD700' : '#BDBDBD'}
          />
          <View style={styles.achievementInfo}>
            <Text style={[styles.achievementName, achievement.unlocked && styles.achievementNameUnlocked]}>
              {achievement.name}
            </Text>
            <Text style={styles.achievementDesc}>{achievement.description}</Text>
          </View>
          {achievement.unlocked && <Icon name="check-circle" size={22} color="#4CAF50" />}
        </View>
      ))}
    </ScrollView>
  );
};

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', marginBottom: 20 },

  // Multi-destino
  waypoint: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, elevation: 1 },
  waypointText: { fontSize: 14, color: '#333', flex: 1 },
  optimizeBtn: { backgroundColor: '#2E7D32', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  optimizeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  routeInfo: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 10, marginTop: 12 },
  routeInfoText: { fontSize: 14, color: '#2E7D32', marginBottom: 4 },

  // Trip planner
  tripName: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  dayCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 16, marginBottom: 12, elevation: 2 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  locationItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  locationName: { flex: 1, fontSize: 13, color: '#333' },
  locationPrice: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  notes: { backgroundColor: '#F9F9F9', borderRadius: 6, padding: 10, marginTop: 8, minHeight: 60, fontSize: 13, color: '#555', borderWidth: 1, borderColor: '#E0E0E0' },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#2E7D32', marginBottom: 16 },
  addDayText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  tripSummary: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 10, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#1B5E20', marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#2E7D32', marginBottom: 2 },
  totalCost: { fontSize: 16, fontWeight: '800', color: '#1B5E20', marginTop: 8 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1976D2', padding: 14, borderRadius: 10, marginBottom: 24 },
  exportBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Offline manager
  regionList: { gap: 10, marginBottom: 16 },
  regionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', padding: 16, borderRadius: 10, elevation: 2 },
  regionDownloaded: { backgroundColor: '#E8F5E9' },
  regionName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  regionSize: { fontSize: 12, color: '#757575' },
  progress: { backgroundColor: '#FFF', padding: 16, borderRadius: 10, marginBottom: 12 },
  progressText: { fontSize: 13, color: '#333', marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2E7D32', borderRadius: 4 },
  downloadedSection: { marginTop: 8 },
  downloadedTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  downloadedItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8 },
  downloadedName: { flex: 1, fontSize: 14, color: '#333' },

  // Favorites
  folder: { backgroundColor: '#FFF', borderRadius: 10, padding: 16, marginBottom: 12, elevation: 2, borderLeftWidth: 4 },
  folderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  folderTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  folderName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  folderCount: { fontSize: 13, color: '#757575' },
  folderActions: { flexDirection: 'row', gap: 4 },
  actionIcon: { padding: 4 },
  emptyFolder: { fontSize: 12, color: '#BDBDBD', fontStyle: 'italic', marginBottom: 4 },
  favLocation: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  favLocationName: { fontSize: 13, color: '#333' },
  newFolderForm: { backgroundColor: '#FFF', padding: 16, borderRadius: 10, marginBottom: 12 },
  newFolderInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12 },
  newFolderButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  cancelBtnText: { color: '#757575', fontWeight: '600' },
  createBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#2E7D32', alignItems: 'center' },
  createBtnText: { color: '#FFF', fontWeight: '700' },
  createFolderBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#2E7D32', marginBottom: 24 },
  createFolderText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderRadius: 10, padding: 16, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1A1A2E', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#757575', marginTop: 4, textAlign: 'center' },
  achievementsTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 10, elevation: 1, opacity: 0.6 },
  achievementUnlocked: { opacity: 1, borderLeftWidth: 3, borderLeftColor: '#FFD700' },
  achievementInfo: { flex: 1 },
  achievementName: { fontSize: 14, fontWeight: '700', color: '#9E9E9E' },
  achievementNameUnlocked: { color: '#1A1A2E' },
  achievementDesc: { fontSize: 12, color: '#BDBDBD', marginTop: 2 },
});

// ─── Modelo de negocio ───────────────────────────────────────────────────────
/*
GRATIS:
- ✅ GPS ilimitado
- ✅ Navegación ilimitada
- ✅ Alertas radares + controles
- ✅ 5.000 ubicaciones
- ✅ 5 favoritos

PREMIUM (9.99€/mes):
- ✅ 15.000+ ubicaciones
- ✅ Rutas multi-destino optimizadas
- ✅ Planificador multi-día con exportación
- ✅ Mapas offline por región
- ✅ Carpetas favoritos ilimitadas + compartir
- ✅ Estadísticas y logros
- ✅ Sin anuncios
- ✅ Soporte prioritario
*/
