/**
 * ExploreScreen - Buscar y explorar locations
 * CamperSites Pro - YRYS
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Keyboard,
  Alert,
  Clipboard,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import Geolocation from 'react-native-geolocation-service';
import haversine from 'haversine-distance';
import { supabase } from '../lib/supabase';
import { CamperSitesTheme as theme } from '../theme';
import { LocationReviewsModal } from '../components/LocationReviewsModal';
import {
  AdvancedSpotFilterModal,
  SpotFilterCriteria,
  DEFAULT_FILTER_CRITERIA,
} from '../components/AdvancedSpotFilterModal';
import { offlineSpotVault } from '../services/OfflineSpotVaultService';
import { CamperTravelPlannerModal } from '../components/CamperTravelPlannerModal';
import { CamperAdBanner } from '../components/CamperAdBanner';
import { AffiliatePartnersModal } from '../components/AffiliatePartnersModal';
import {
  AFFILIATE_PARTNERS,
  AffiliatePartner,
  affiliatePartnerService,
} from '../services/AffiliatePartnerService';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  address: string;
  city: string;
  province: string;
  country: string;
  has_water: boolean;
  has_electricity: boolean;
  price: number | null;
  description: string;
  distanceKm?: number;
}

MapLibreGL.setAccessToken(null);

const EXPLORE_MAP_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
    },
    roads: {
      type: 'raster',
      tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'satellite-layer', type: 'raster', source: 'satellite' },
    { id: 'roads-layer', type: 'raster', source: 'roads' },
  ],
};

// ============================================
// CATEGORÍAS CON EMOJIS NATIVOS (alta calidad)
// ============================================
const CATEGORY_SECTIONS = [
  {
    title: 'Descuentos & Códigos Referencia',
    emoji: '🏷️',
    categories: [
      { key: 'DESCUENTOS', label: 'Todos los Descuentos', emoji: '🎁', icon: 'tag-multiple', color: '#10B981' },
      { key: 'HOSTINGER', label: 'Hostinger (20% Dto)', emoji: '🌐', icon: 'server-network', color: '#673AB7' },
      { key: 'REPSOL_GLP', label: 'Repsol AutoGas GLP', emoji: '⛽', icon: 'gas-station', color: '#FF6D00' },
      { key: 'BALEARIA', label: 'Baleària Ferries 15%', emoji: '⛴️', icon: 'ferry', color: '#0288D1' },
      { key: 'IATI_SEGUROS', label: 'Seguros Camper IATI 5%', emoji: '🛡️', icon: 'shield-car', color: '#E65100' },
    ],
  },
  {
    title: 'Alojamiento',
    emoji: '🏕️',
    categories: [
      { key: 'CAMPING', label: 'Campings', emoji: '⛺', icon: 'tent', color: '#2D5016' },
      { key: 'PARKING_PERMITIDO', label: 'Parkings', emoji: '🅿️', icon: 'parking', color: '#1976D2' },
      { key: 'AREA_DESCANSO', label: 'Descanso', emoji: '🛋️', icon: 'bench', color: '#E67E22' },
      { key: 'AREA_SERVICIOS', label: 'Servicios', emoji: '🚿', icon: 'water-pump', color: '#8E44AD' },
    ],
  },
  {
    title: 'Rutas Moto, 4x4 y Rescate SOS',
    emoji: '🏍️',
    categories: [
      { key: 'RUTA_MOTO_MONTE', label: 'Rutas Moto / Monte', emoji: '🏍️', icon: 'motorbike', color: '#EA580C' },
      { key: 'PISTA_4X4', label: 'Pistas 4x4 Off-Road', emoji: '🚙', icon: 'car-traction-control', color: '#4D7C0F' },
      { key: 'PUNTO_SOS', label: 'Refugio / Ayuda SOS', emoji: '🆘', icon: 'lifebuoy', color: '#DC2626' },
    ],
  },
  {
    title: 'Naturaleza',
    emoji: '🌲',
    categories: [
      { key: 'MIRADOR', label: 'Miradores', emoji: '🏔️', icon: 'binoculars', color: '#27AE60' },
      { key: 'PLAYA', label: 'Playas', emoji: '🏖️', icon: 'beach', color: '#3498DB' },
      { key: 'MONTANA', label: 'Montañas', emoji: '⛰️', icon: 'image-filter-hdr', color: '#795548' },
      { key: 'LAGO', label: 'Lagos', emoji: '🌊', icon: 'waves', color: '#0097A7' },
      { key: 'CASCADA', label: 'Cascadas', emoji: '💧', icon: 'waterfall', color: '#00BCD4' },
    ],
  },
  {
    title: 'Servicios Camper',
    emoji: '🚐',
    categories: [
      { key: 'LAVADERO_COCHES', label: 'Lavaderos', emoji: '🧽', icon: 'car-wash', color: '#607D8B' },
      { key: 'GASOLINERA_GLP', label: 'GLP/Autogas', emoji: '⛽', icon: 'gas-station', color: '#F44336' },
      { key: 'LAVANDERIA', label: 'Lavanderías', emoji: '👕', icon: 'tshirt-crew', color: '#9C27B0' },
    ],
  },
  {
    title: 'Alimentación',
    emoji: '🍽️',
    categories: [
      { key: 'SUPERMERCADO', label: 'Supermercados', emoji: '🛒', icon: 'cart', color: '#4CAF50' },
      { key: 'RESTAURANTE', label: 'Restaurantes', emoji: '🍴', icon: 'silverware-fork-knife', color: '#FF9800' },
      { key: 'FARMACIA', label: 'Farmacias', emoji: '💊', icon: 'medical-bag', color: '#F44336' },
    ],
  },
];

const ALL_CATEGORIES = [
  { key: 'ALL', label: 'Todos', emoji: '📍', icon: 'map-marker-multiple', color: '#333' },
  { key: 'DESCUENTOS', label: 'Descuentos & Códigos', emoji: '🏷️', icon: 'tag-multiple', color: '#10B981' },
  { key: 'HOSTINGER', label: 'Hostinger 20% Dto', emoji: '🌐', icon: 'server-network', color: '#673AB7' },
  ...CATEGORY_SECTIONS.flatMap(s => s.categories).filter(c => c.key !== 'DESCUENTOS' && c.key !== 'HOSTINGER'),
];

const getCategoryConfig = (category: string) => {
  for (const section of CATEGORY_SECTIONS) {
    const found = section.categories.find(c => c.key === category);
    if (found) return found;
  }
  return { key: category, label: category, emoji: '📍', icon: 'map-marker', color: '#999' };
};

const isAffiliateCategory = (cat: string) =>
  ['DESCUENTOS', 'HOSTINGER', 'REPSOL_GLP', 'BALEARIA', 'IATI_SEGUROS'].includes(cat);

export default function ExploreScreen() {
  const navigation = useNavigation();
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedPartnerCodeId, setCopiedPartnerCodeId] = useState<string | null>(null);

  const handleCopyPartnerCode = (partner: AffiliatePartner) => {
    if (!partner.promoCode) return;
    Clipboard.setString(partner.promoCode);
    affiliatePartnerService.copyPromoCode(partner.promoCode);
    setCopiedPartnerCodeId(partner.id);
    Alert.alert(
      '✅ Código Copiado',
      `El código de descuento "${partner.promoCode}" ha sido copiado al portapapeles. Pégalo durante tu compra para disfrutar del descuento.`
    );
    setTimeout(() => {
      setCopiedPartnerCodeId(prev => (prev === partner.id ? null : prev));
    }, 3000);
  };

  const handleOpenPartnerLink = async (partner: AffiliatePartner) => {
    try {
      await affiliatePartnerService.openPartner(partner);
    } catch {
      Linking.openURL(partner.affiliateUrl);
    }
  };

  const displayedAffiliates = useMemo(() => {
    if (!isAffiliateCategory(selectedCategory)) return [];
    if (selectedCategory === 'HOSTINGER') {
      return AFFILIATE_PARTNERS.filter(p => p.id === 'hostinger_referral');
    }
    if (selectedCategory === 'REPSOL_GLP') {
      return AFFILIATE_PARTNERS.filter(p => p.category === 'fuel_lpg');
    }
    if (selectedCategory === 'BALEARIA') {
      return AFFILIATE_PARTNERS.filter(p => p.category === 'ferry');
    }
    if (selectedCategory === 'IATI_SEGUROS') {
      return AFFILIATE_PARTNERS.filter(p => p.category === 'insurance');
    }
    return AFFILIATE_PARTNERS;
  }, [selectedCategory]);

  const handleJumpToMap = async (item: Location) => {
    try {
      await AsyncStorage.setItem('@campersites_jump_to_location', JSON.stringify(item));
      navigation.navigate('Mapa' as never);
    } catch {}
  };
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  const [showTravelPlanner, setShowTravelPlanner] = useState(false);
  const [showAffiliatesModal, setShowAffiliatesModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLocationForReviews, setSelectedLocationForReviews] = useState<Location | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<SpotFilterCriteria>(DEFAULT_FILTER_CRITERIA);
  const [userCoords, setUserCoords] = useState<[number, number]>([-4.0890, 40.6720]); // Guadarrama A-6 fallback
  const [showServicesMap, setShowServicesMap] = useState<boolean>(true);
  const exploreCameraRef = useRef<any>(null);

  // Obtener geolocalización real del usuario
  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => {
        if (isMountedRef.current) {
          const newCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setUserCoords(newCoords);
          exploreCameraRef.current?.setCamera({
            centerCoordinate: newCoords,
            zoomLevel: 12.5,
            animationDuration: 800,
          });
          // Recalcular y ordenar de inmediato por proximidad GPS
          fetchLocations(searchQuery, selectedCategory, newCoords);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 15000 }
    );
  }, []);

  // Ref para evitar race conditions en búsqueda
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchLocations = useCallback(async (query: string, category: string, overrideCoords?: [number, number]) => {
    if (isAffiliateCategory(category)) {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }
    try {
      const activeCoords = overrideCoords || userCoords;
      const userLat = activeCoords[1];
      const userLng = activeCoords[0];
      let rawLocations: any[] = [];

      // 1. Si no hay texto de búsqueda, priorizar búsqueda geográfica alrededor del usuario (radio ~75 km)
      if (query.trim().length === 0) {
        const latDelta = 0.75;
        const lngDelta = 0.75;
        let geoQuery = supabase
          .from('locations')
          .select('*', { count: 'exact' })
          .gte('latitude', userLat - latDelta)
          .lte('latitude', userLat + latDelta)
          .gte('longitude', userLng - lngDelta)
          .lte('longitude', userLng + lngDelta)
          .limit(150);

        if (category !== 'ALL') {
          if (category === 'RUTA_MOTO_MONTE') {
            geoQuery = geoQuery.in('category', ['MONTANA', 'MIRADOR', 'CASCADA']);
          } else if (category === 'PISTA_4X4') {
            geoQuery = geoQuery.in('category', ['MONTANA', 'LAGO', 'MIRADOR', 'CASCADA']);
          } else if (category === 'PUNTO_SOS') {
            geoQuery = geoQuery.in('category', ['FARMACIA', 'AREA_SERVICIOS', 'AREA_DESCANSO', 'GASOLINERA_GLP']);
          } else {
            geoQuery = geoQuery.eq('category', category);
          }
        }

        const { data: geoData } = await geoQuery;
        if (geoData && geoData.length > 0) {
          rawLocations = geoData;
        }
      }

      // Si no hubo resultados geográficos locales o hay una búsqueda de texto específica
      if (rawLocations.length === 0) {
        let q = supabase
          .from('locations')
          .select('*', { count: 'exact' })
          .limit(200);

        if (category !== 'ALL') {
          if (category === 'RUTA_MOTO_MONTE') {
            q = q.in('category', ['MONTANA', 'MIRADOR', 'CASCADA']);
          } else if (category === 'PISTA_4X4') {
            q = q.in('category', ['MONTANA', 'LAGO', 'MIRADOR', 'CASCADA']);
          } else if (category === 'PUNTO_SOS') {
            q = q.in('category', ['FARMACIA', 'AREA_SERVICIOS', 'AREA_DESCANSO', 'GASOLINERA_GLP']);
          } else {
            q = q.eq('category', category);
          }
        }

        if (query.trim().length > 0) {
          // Sanitizar: eliminar caracteres especiales de iLIKE y PostgREST
          const search = query.trim().replace(/[%_\\'(),"\\]/g, '').substring(0, 100);
          if (search.length > 0) {
            q = q.or(`name.ilike.%${search}%,city.ilike.%${search}%,province.ilike.%${search}%`);
          }
        }

        const { data } = await q;
        if (data && data.length > 0) {
          rawLocations = data;
        }
      }

      // Fallback a bóveda local offline si no hay red o datos
      if (rawLocations.length === 0) {
        const offlineResults = offlineSpotVault.searchSpots(query);
        rawLocations = offlineResults as any[];
      }

      // 2. Calcular distancia Haversine exacta para CADA ubicación respecto a la posición del usuario
      const mappedWithDistance = rawLocations.map((item: any) => {
        const dist = (item.latitude && item.longitude)
          ? Math.round(haversine({ latitude: userLat, longitude: userLng }, { latitude: item.latitude, longitude: item.longitude }) / 100) / 10
          : 9999;
        return {
          ...item,
          distanceKm: dist < 9000 ? dist : undefined,
        };
      });

      // 3. ORDENAR ESTRICTAMENTE DE MÁS CERCA A MÁS LEJOS
      mappedWithDistance.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));

      if (isMountedRef.current) {
        setLocations(mappedWithDistance);
        setTotalCount(mappedWithDistance.length);
      }
    } catch (err) {
      console.error('Error fetching explore locations:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userCoords]);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (searchQuery.length === 0) {
      // Sin búsqueda → fetch inmediato
      setLoading(true);
      fetchLocations('', selectedCategory);
    } else {
      // Con búsqueda → debounce 600ms
      setLoading(true);
      searchTimerRef.current = setTimeout(() => {
        fetchLocations(searchQuery, selectedCategory);
      }, 600);
    }

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, selectedCategory, fetchLocations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations(searchQuery, selectedCategory);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const hasActiveAdvancedCriteria = useMemo(() => {
    return (
      filterCriteria.categories.length > 0 ||
      filterCriteria.requireWater ||
      filterCriteria.requireElectricity ||
      filterCriteria.requireWasteDump ||
      filterCriteria.onlyFree ||
      filterCriteria.onlyLargeVehicles
    );
  }, [filterCriteria]);

  const displayedLocations = useMemo(() => {
    let list = locations;
    if (filterCriteria.categories.length > 0) {
      list = list.filter(l => filterCriteria.categories.includes(l.category));
    }
    if (filterCriteria.requireWater) {
      list = list.filter(l => l.has_water === true);
    }
    if (filterCriteria.requireElectricity) {
      list = list.filter(l => l.has_electricity === true);
    }
    if (filterCriteria.onlyFree) {
      list = list.filter(l => l.price === 0 || l.price === null);
    }
    // Ordenar estrictamente de más cercano a más lejano
    return [...list].sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  }, [locations, filterCriteria]);

  const renderCategoryChip = (item: typeof ALL_CATEGORIES[0]) => {
    const isActive = selectedCategory === item.key;
    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.categoryChip,
          isActive && { backgroundColor: item.color, borderColor: item.color },
        ]}
        onPress={() => {
          setSelectedCategory(item.key);
          setShowCategoryGrid(false);
        }}>
        <Text style={styles.chipEmoji}>{item.emoji}</Text>
        <Text
          style={[
            styles.categoryChipText,
            isActive && styles.categoryChipTextActive,
          ]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Memoizar renderLocationCard para evitar recreación en cada render de FlatList
  const renderLocationCard = useCallback(({ item }: { item: Location }) => {
    const config = getCategoryConfig(item.category);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => setSelectedLocationForReviews(item)}>
        {/* Barra de color superior */}
        <View style={[styles.cardColorBar, { backgroundColor: config.color }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: config.color + '12' }]}>
              <Text style={styles.badgeEmoji}>{config.emoji}</Text>
              <Text style={[styles.categoryBadgeText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
            <View style={styles.cardHeaderRight}>
              {item.distanceKm !== undefined && (
                <View style={styles.distanceBadgeCard}>
                  <Icon name="navigation-variant" size={12} color="#0284C7" style={{ marginRight: 3 }} />
                  <Text style={styles.distanceBadgeCardText}>
                    {item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm} km`}
                  </Text>
                </View>
              )}
              {item.price !== null && item.price > 0 && (
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>{item.price}€</Text>
                </View>
              )}
              {item.price === 0 && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeText}>GRATIS</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>

          {(item.city || item.province) ? (
            <View style={styles.locationRow}>
              <Text style={styles.locationEmoji}>📍</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {[item.city, item.province, item.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}

          <View style={[styles.amenities, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {item.has_water && (
                <View style={styles.amenityBadge}>
                  <Text style={styles.amenityEmoji}>💧</Text>
                  <Text style={styles.amenityText}>Agua</Text>
                </View>
              )}
              {item.has_electricity && (
                <View style={[styles.amenityBadge, styles.amenityElectric]}>
                  <Text style={styles.amenityEmoji}>⚡</Text>
                  <Text style={styles.amenityText}>Luz</Text>
                </View>
              )}
              {item.description && item.description.toLowerCase().includes('wifi') && (
                <View style={[styles.amenityBadge, styles.amenityWifi]}>
                  <Text style={styles.amenityEmoji}>📶</Text>
                  <Text style={styles.amenityText}>WiFi</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => handleJumpToMap(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#E0F2FE',
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="map-marker-path" size={14} color="#0284C7" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>Mapa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedLocationForReviews(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#FFFBEB',
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="star" size={14} color="#F59E0B" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>Opiniones</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  // Renderizador de tarjetas de descuentos y códigos de referencia oficiales
  const renderAffiliatePartnerCard = useCallback(({ item }: { item: AffiliatePartner }) => {
    const isCopied = copiedPartnerCodeId === item.id;
    return (
      <View style={styles.affiliateCard}>
        <View style={[styles.cardColorBar, { backgroundColor: item.accentColor }]} />

        {item.limitedTimeOffer ? (
          <View style={styles.affiliateLimitedRibbon}>
            <Icon name="clock-fast" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
            <Text style={styles.affiliateLimitedText}>
              {item.limitedTimeOffer} • 40% Comisión Titular / 20% Dto Amigo
            </Text>
          </View>
        ) : null}

        <View style={styles.affiliateCardBody}>
          <View style={styles.affiliateHeaderRow}>
            <View style={[styles.affiliateLogoBadge, { backgroundColor: item.accentColor }]}>
              <Icon name={item.logoIcon} size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.affiliateBrandName}>{item.brandName}</Text>
                <View style={styles.affiliateBadgeTag}>
                  <Text style={styles.affiliateBadgeText}>{item.badge}</Text>
                </View>
              </View>
              <Text style={styles.affiliateTitle}>{item.title}</Text>
            </View>
          </View>

          <View style={styles.affiliateDiscountBox}>
            <Icon name="sale" size={18} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.affiliateDiscountText}>{item.discountSummary}</Text>
          </View>

          <Text style={styles.affiliateDesc}>{item.description}</Text>

          <View style={styles.affiliatePerksBox}>
            {item.perks.map((perk, i) => (
              <View key={i} style={styles.affiliatePerkRow}>
                <Icon name="check-circle" size={14} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.affiliatePerkText}>{perk}</Text>
              </View>
            ))}
          </View>

          <View style={styles.affiliateActionRow}>
            {item.promoCode ? (
              <TouchableOpacity
                style={[styles.affiliateCodeBtn, isCopied && styles.affiliateCodeBtnCopied]}
                onPress={() => handleCopyPartnerCode(item)}
                activeOpacity={0.8}>
                <Icon
                  name={isCopied ? 'check-bold' : 'content-copy'}
                  size={14}
                  color={isCopied ? '#10B981' : '#38BDF8'}
                  style={{ marginRight: 6 }}
                />
                <View>
                  <Text style={styles.affiliateCodeLabel}>CÓDIGO DE DESCUENTO</Text>
                  <Text style={styles.affiliateCodeVal}>{item.promoCode}</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.affiliateCtaBtn, { backgroundColor: item.accentColor }]}
              onPress={() => handleOpenPartnerLink(item)}
              activeOpacity={0.85}>
              <Icon name="open-in-new" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.affiliateCtaText}>
                {item.id === 'hostinger_referral' ? 'Canjear en Hostinger (-20%)' : 'Ir a la Oferta'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [copiedPartnerCodeId]);

  const renderCategoryGrid = () => (
    <View style={styles.categoryGridContainer}>
      {CATEGORY_SECTIONS.map(section => (
        <View key={section.title} style={styles.gridSection}>
          <View style={styles.gridSectionHeader}>
            <Text style={styles.gridSectionEmoji}>{section.emoji}</Text>
            <Text style={styles.gridSectionTitle}>{section.title}</Text>
          </View>
          <View style={styles.gridRow}>
            {section.categories.map(cat => {
              const isActive = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.gridItem,
                    isActive && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.key);
                    setShowCategoryGrid(false);
                  }}>
                  <Text style={styles.gridItemEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.gridItemText,
                      isActive && { color: '#FFF' },
                    ]}
                    numberOfLines={1}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      <TouchableOpacity
        style={styles.showAllButton}
        onPress={() => {
          setSelectedCategory('ALL');
          setShowCategoryGrid(false);
        }}>
        <Text style={styles.showAllEmoji}>📍</Text>
        <Text style={styles.showAllText}>Ver todos</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header con gradiente visual */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Explorar</Text>
          <Text style={styles.headerSubtitle}>
            {isAffiliateCategory(selectedCategory)
              ? `${displayedAffiliates.length} acuerdos y códigos de referencia con descuento directo`
              : (totalCount > 200 ? `${totalCount.toLocaleString()}+ lugares` : `${locations.length} lugares`)}
            {selectedCategory !== 'ALL' ? ` · ${getCategoryConfig(selectedCategory).emoji} ${getCategoryConfig(selectedCategory).label}` : ''}
          </Text>
        </View>
      </View>

      {/* Barra de búsqueda mejorada */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchEmoji}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, ciudad, provincia..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Icon name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, hasActiveAdvancedCriteria && styles.filterButtonActive]}
          onPress={() => setShowAdvancedFilters(true)}>
          <Icon
            name="tune-variant"
            size={20}
            color={hasActiveAdvancedCriteria ? '#FFF' : theme.colors.primary.main}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, showCategoryGrid && styles.filterButtonActive]}
          onPress={() => setShowCategoryGrid(!showCategoryGrid)}>
          <Icon
            name={showCategoryGrid ? 'close' : 'grid-large'}
            size={20}
            color={showCategoryGrid ? '#FFF' : (selectedCategory !== 'ALL' ? theme.colors.primary.main : '#666')}
          />
        </TouchableOpacity>
      </View>

      {/* Filtros horizontal */}
      {!showCategoryGrid && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesList}
          keyboardShouldPersistTaps="handled">
          {ALL_CATEGORIES.slice(0, 8).map(renderCategoryChip)}
          <TouchableOpacity
            style={styles.moreChip}
            onPress={() => setShowCategoryGrid(true)}>
            <Text style={styles.moreChipEmoji}>➕</Text>
            <Text style={styles.moreChipText}>Más</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Banner Destacado: Travel Planner Camper */}
      {!showCategoryGrid && (
        <TouchableOpacity
          style={styles.travelPlannerBanner}
          onPress={() => setShowTravelPlanner(true)}
          activeOpacity={0.88}>
          <View style={styles.travelPlannerBannerLeft}>
            <View style={styles.travelPlannerIconBox}>
              <Icon name="map-clock-outline" size={24} color="#38BDF8" />
            </View>
            <View style={styles.travelPlannerTextBox}>
              <View style={styles.travelPlannerBadgeRow}>
                <Text style={styles.travelPlannerBadge}>TRAVEL PLANNER</Text>
                <View style={styles.proTag}>
                  <Text style={styles.proTagText}>PRO</Text>
                </View>
              </View>
              <Text style={styles.travelPlannerTitle}>Diseña tu Itinerario por Etapas</Text>
              <Text style={styles.travelPlannerSub}>
                Rutas con pernocta segura, vaciado y GLP
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={22} color="#38BDF8" />
        </TouchableOpacity>
      )}

      {/* Banner 1: Pase Fundador Pionero VIP (Crowdfunding & Impulso Google Play) */}
      {!showCategoryGrid && (
        <TouchableOpacity
          style={[styles.travelPlannerBanner, { borderColor: 'rgba(16, 185, 129, 0.45)', backgroundColor: 'rgba(16, 185, 129, 0.12)', marginBottom: 10 }]}
          onPress={() => {
            Linking.openURL('https://camper.nexusaiholding.com/patrocinios.html');
          }}
          activeOpacity={0.88}>
          <View style={styles.travelPlannerBannerLeft}>
            <View style={[styles.travelPlannerIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.25)' }]}>
              <Icon name="crown" size={24} color="#10B981" />
            </View>
            <View style={styles.travelPlannerTextBox}>
              <View style={styles.travelPlannerBadgeRow}>
                <Text style={[styles.travelPlannerBadge, { color: '#10B981' }]}>PASE FUNDADOR VIP</Text>
                <View style={[styles.proTag, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.proTagText}>2 AÑOS VIP (19,99€)</Text>
                </View>
              </View>
              <Text style={styles.travelPlannerTitle}>Pase Pionero 2 Años (Solo 100 Plazas)</Text>
              <Text style={styles.travelPlannerSub}>
                2 Años completos de acceso VIP Pro y apoya el lanzamiento en Google Play y Apple Store
              </Text>
            </View>
          </View>
          <Icon name="open-in-new" size={20} color="#10B981" />
        </TouchableOpacity>
      )}

      {/* Banner Monetización: Club Descuentos Camper & Hostinger */}
      {!showCategoryGrid && (
        <TouchableOpacity
          style={[styles.travelPlannerBanner, { borderColor: 'rgba(103, 58, 183, 0.45)', backgroundColor: 'rgba(103, 58, 183, 0.12)' }]}
          onPress={() => setSelectedCategory('DESCUENTOS')}
          activeOpacity={0.88}>
          <View style={styles.travelPlannerBannerLeft}>
            <View style={[styles.travelPlannerIconBox, { backgroundColor: 'rgba(103, 58, 183, 0.25)' }]}>
              <Icon name="tag-multiple" size={24} color="#A78BFA" />
            </View>
            <View style={styles.travelPlannerTextBox}>
              <View style={styles.travelPlannerBadgeRow}>
                <Text style={[styles.travelPlannerBadge, { color: '#A78BFA' }]}>DESCUENTOS & COMISIONES</Text>
                <View style={[styles.proTag, { backgroundColor: '#673AB7' }]}>
                  <Text style={styles.proTagText}>HOSTINGER -20%</Text>
                </View>
              </View>
              <Text style={styles.travelPlannerTitle}>Hostinger VPS & Cloud, GLP Repsol & IATI</Text>
              <Text style={styles.travelPlannerSub}>
                Ahorra hasta un 20% con nuestros códigos de referencia verificados
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={22} color="#A78BFA" />
        </TouchableOpacity>
      )}

      {/* Sponsor / Google Ads Banner for Free Users */}
      {!showCategoryGrid && <CamperAdBanner placement="feed" />}

      {/* Grid de categorías expandido */}
      {showCategoryGrid && (
        <ScrollView style={styles.categoryGridScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {renderCategoryGrid()}
        </ScrollView>
      )}

      {/* Barra de cabecera del mapa de servicios de proximidad */}
      {!showCategoryGrid && !isAffiliateCategory(selectedCategory) && (
        <View style={styles.servicesMapHeader}>
          <View style={styles.servicesMapHeaderLeft}>
            <Text style={styles.servicesMapHeaderTitle}>Radar de Servicios Cercanos</Text>
            <Text style={styles.servicesMapHeaderSub}>Servicios activos alrededor de tu posición</Text>
          </View>
          <TouchableOpacity
            style={[styles.mapToggleBtn, showServicesMap && styles.mapToggleBtnActive]}
            onPress={() => setShowServicesMap(prev => !prev)}
            activeOpacity={0.8}>
            <Icon name={showServicesMap ? 'map-minus' : 'map-search'} size={15} color="#FFF" />
            <Text style={styles.mapToggleBtnText}>
              {showServicesMap ? 'Ocultar' : 'Ver Mapa'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mapa Satelital de Servicios Cercanos a la Posición del Usuario */}
      {!showCategoryGrid && !isAffiliateCategory(selectedCategory) && showServicesMap && (
        <View style={styles.servicesMapContainer}>
          <MapLibreGL.MapView
            style={styles.servicesMap}
            mapStyle={EXPLORE_MAP_STYLE}
            logoEnabled={false}
            attributionEnabled={false}
          >
            <MapLibreGL.Camera
              ref={exploreCameraRef}
              defaultSettings={{
                centerCoordinate: userCoords,
                zoomLevel: 12.5,
              }}
            />

            {/* Baliza GPS del Usuario */}
            <MapLibreGL.PointAnnotation id="explore-user-beacon" coordinate={userCoords}>
              <View style={styles.userBeacon}>
                <View style={styles.userBeaconCore} />
              </View>
            </MapLibreGL.PointAnnotation>

            {/* Marcadores de Servicios Georreferenciados */}
            {displayedLocations.slice(0, 25).map(loc => {
              if (!loc.latitude || !loc.longitude) return null;
              const config = getCategoryConfig(loc.category);
              return (
                <MapLibreGL.PointAnnotation
                  key={loc.id}
                  id={`marker-${loc.id}`}
                  coordinate={[loc.longitude, loc.latitude]}
                  onSelected={() => setSelectedLocationForReviews(loc)}
                >
                  <View style={[styles.servicePin, { borderColor: config.color }]}>
                    <Text style={styles.servicePinEmoji}>{config.emoji}</Text>
                  </View>
                  <MapLibreGL.Callout title={loc.name}>
                    <View style={styles.serviceCallout}>
                      <Text style={styles.calloutTitle}>{loc.name}</Text>
                      <Text style={styles.calloutSub}>{config.label} · Toca para ver</Text>
                    </View>
                  </MapLibreGL.Callout>
                </MapLibreGL.PointAnnotation>
              );
            })}
          </MapLibreGL.MapView>
        </View>
      )}

      {/* Lista de Códigos de Descuento & Afiliados Oficiales */}
      {isAffiliateCategory(selectedCategory) ? (
        <FlatList
          data={displayedAffiliates}
          keyExtractor={item => item.id}
          renderItem={renderAffiliatePartnerCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Buscando lugares...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedLocations}
          keyExtractor={item => item.id}
          renderItem={renderLocationCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary.main]}
              tintColor={theme.colors.primary.main}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyText}>No se encontraron lugares</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.length > 0
                  ? 'Prueba con otro término de búsqueda'
                  : 'No hay datos para esta categoría'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal de Filtros Avanzados (Park4Night) */}
      <AdvancedSpotFilterModal
        visible={showAdvancedFilters}
        initialCriteria={filterCriteria}
        onApply={(crit) => setFilterCriteria(crit)}
        onClose={() => setShowAdvancedFilters(false)}
      />

      {/* Modal de Reseñas de la Comunidad (Pilar 4) */}
      <LocationReviewsModal
        visible={!!selectedLocationForReviews}
        locationId={selectedLocationForReviews?.id || ''}
        locationName={selectedLocationForReviews?.name || ''}
        onClose={() => setSelectedLocationForReviews(null)}
      />

      {/* Modal de Travel Planner Camper */}
      <CamperTravelPlannerModal
        visible={showTravelPlanner}
        onClose={() => setShowTravelPlanner(false)}
      />

      {/* Modal de Afiliados y Descuentos Camper */}
      <AffiliatePartnersModal
        visible={showAffiliatesModal}
        onClose={() => setShowAffiliatesModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  // Header
  header: {
    backgroundColor: theme.colors.primary.main,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {},
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: -18,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  searchEmoji: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    marginLeft: 10,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary.main,
  },
  // Categories
  categoriesScroll: {
    marginTop: 14,
    maxHeight: 48,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  chipEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  moreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 5,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  moreChipEmoji: {
    fontSize: 14,
  },
  moreChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  // Category Grid
  categoryGridScroll: {
    maxHeight: 360,
    marginTop: 10,
  },
  categoryGridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  gridSection: {
    marginBottom: 14,
  },
  gridSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  gridSectionEmoji: {
    fontSize: 18,
  },
  gridSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    minWidth: 110,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  gridItemEmoji: {
    fontSize: 20,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  showAllEmoji: {
    fontSize: 16,
  },
  showAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary.main,
  },
  // Cards
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardColorBar: {
    height: 4,
  },
  cardBody: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  distanceBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceBadgeCardText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  badgeEmoji: {
    fontSize: 14,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E7D32',
  },
  freeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  locationEmoji: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#777',
    flex: 1,
  },
  amenities: {
    flexDirection: 'row',
    gap: 8,
  },
  amenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  amenityElectric: {
    backgroundColor: '#FFF8E1',
  },
  amenityWifi: {
    backgroundColor: '#F3E5F5',
  },
  amenityEmoji: {
    fontSize: 13,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  // Loading / Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Servicios Cercanos Radar Map
  servicesMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  servicesMapHeaderLeft: {
    flex: 1,
  },
  servicesMapHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  servicesMapHeaderSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  mapToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  mapToggleBtnActive: {
    backgroundColor: '#0369A1',
  },
  mapToggleBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  servicesMapContainer: {
    height: 190,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  servicesMap: {
    flex: 1,
  },
  userBeacon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBeaconCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  servicePin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  servicePinEmoji: {
    fontSize: 13,
  },
  serviceCallout: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  calloutTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  calloutSub: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  travelPlannerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  travelPlannerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  travelPlannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  travelPlannerTextBox: {
    flex: 1,
  },
  travelPlannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  travelPlannerBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  proTag: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  proTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  travelPlannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  travelPlannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  // Tarjetas de Descuentos & Afiliados Oficiales
  affiliateCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  affiliateLimitedRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
  },
  affiliateLimitedText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  affiliateCardBody: {
    padding: 16,
  },
  affiliateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  affiliateLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  affiliateBrandName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
  },
  affiliateBadgeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  affiliateBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  affiliateTitle: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  affiliateDiscountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  affiliateDiscountText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  affiliateDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 4,
  },
  affiliatePerksBox: {
    marginVertical: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  affiliatePerkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2.5,
  },
  affiliatePerkText: {
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
  },
  affiliateActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  affiliateCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  affiliateCodeBtnCopied: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  affiliateCodeLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  affiliateCodeVal: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  affiliateCtaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  affiliateCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
