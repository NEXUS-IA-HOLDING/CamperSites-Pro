/**
 * FASE 4: OPTIMIZACIONES DE PERFORMANCE
 * React Native best practices
 */

import { memo, useMemo, useCallback } from 'react';
import { FlatList, Image } from 'react-native';

// ⭐ 1. MEMOIZACIÓN DE COMPONENTES
export const LocationCard = memo(({ location, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.card}>
        <Text>{location.name}</Text>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si location.id cambió
  return prevProps.location.id === nextProps.location.id;
});

// ⭐ 2. FLATLIST OPTIMIZADA
export const OptimizedLocationList = ({ locations, onSelectLocation }) => {
  const renderItem = useCallback(({ item }) => (
    <LocationCard 
      location={item} 
      onPress={() => onSelectLocation(item)}
    />
  ), [onSelectLocation]);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <FlatList
      data={locations}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Performance props críticos
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
      getItemLayout={(data, index) => ({
        length: 100, // Altura fija del item
        offset: 100 * index,
        index,
      })}
    />
  );
};

// ⭐ 3. CACHÉ DE IMÁGENES
import FastImage from 'react-native-fast-image';

export const CachedImage = ({ uri, style }) => (
  <FastImage
    source={{
      uri,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable,
    }}
    style={style}
    resizeMode={FastImage.resizeMode.cover}
  />
);

// ⭐ 4. LAZY LOADING DE COMPONENTES
import React, { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export const LazyLoadedScreen = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <HeavyComponent />
  </Suspense>
);

// ⭐ 5. DEBOUNCE PARA BÚSQUEDA
import { useCallback, useRef } from 'react';

export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Uso:
const SearchScreen = () => {
  const handleSearch = useDebounce((query) => {
    // Búsqueda real
    searchLocations(query);
  }, 300);

  return (
    <TextInput
      onChangeText={handleSearch}
      placeholder="Buscar..."
    />
  );
};

// ⭐ 6. MEMOIZACIÓN DE CÁLCULOS PESADOS
export const MapScreen = () => {
  const nearbyLocations = useMemo(() => {
    if (!userLocation || !locations) return [];
    
    return locations
      .map(loc => ({
        ...loc,
        distance: calculateDistance(userLocation, loc),
      }))
      .filter(loc => loc.distance < 50) // 50km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // Solo top 20
  }, [userLocation, locations]);

  return <LocationList locations={nearbyLocations} />;
};

// ⭐ 7. VIRTUALIZACIÓN AVANZADA
import { RecyclerListView, DataProvider, LayoutProvider } from 'recyclerlistview';

export const VirtualizedList = ({ data }) => {
  const dataProvider = useMemo(
    () => new DataProvider((r1, r2) => r1.id !== r2.id).cloneWithRows(data),
    [data]
  );

  const layoutProvider = useMemo(
    () => new LayoutProvider(
      (index) => 'ITEM',
      (type, dim) => {
        dim.width = Dimensions.get('window').width;
        dim.height = 100;
      }
    ),
    []
  );

  const rowRenderer = useCallback((type, item) => (
    <LocationCard location={item} />
  ), []);

  return (
    <RecyclerListView
      dataProvider={dataProvider}
      layoutProvider={layoutProvider}
      rowRenderer={rowRenderer}
    />
  );
};

// ⭐ 8. BATCH UPDATES
import { unstable_batchedUpdates } from 'react-native';

export const batchedLocationUpdate = (newLocation, newRadars) => {
  unstable_batchedUpdates(() => {
    setUserLocation(newLocation);
    setNearbyRadars(newRadars);
    setAlertCount(calculateAlerts(newRadars));
  });
};

// ⭐ 9. MEMORIA - CLEANUP
useEffect(() => {
  const watchId = Geolocation.watchPosition(callback);
  const intervalId = setInterval(checkAlerts, 2000);

  return () => {
    Geolocation.clearWatch(watchId);
    clearInterval(intervalId);
  };
}, []);

// ⭐ 10. ANIMACIONES NATIVAS
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

export const AnimatedCard = ({ isVisible }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isVisible ? 1 : 0, { duration: 200 }),
    transform: [
      { scale: withTiming(isVisible ? 1 : 0.9, { duration: 200 }) }
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Card />
    </Animated.View>
  );
};

// ⭐ MÉTRICAS ESPERADAS
/*
Con estas optimizaciones:

Bundle Size: < 15MB
First Load: < 2s
Time to Interactive: < 3s
Frame Rate: 60 FPS constante
Memory: < 150MB
Battery: Optimizado (GPS cada 1s = alto consumo necesario)

Performance Score: 95+/100
Accessibility: 100/100
Best Practices: 100/100
*/
