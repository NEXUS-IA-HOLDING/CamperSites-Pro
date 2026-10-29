/**
 * CockpitLocationDetailSheet.tsx - Ficha deslizable de cabina automotriz para el punto seleccionado
 * Reemplaza los popups cutres por una tarjeta de control táctico con servicios y cálculo de ruta segura
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface LocationItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  description?: string;
  address?: string;
}

interface CockpitLocationDetailSheetProps {
  location: LocationItem | null;
  distanceKm?: number;
  onClose: () => void;
  onStartRoute: (location: LocationItem) => void;
  onOpenReviews: (location: LocationItem) => void;
}

export const CockpitLocationDetailSheet: React.FC<CockpitLocationDetailSheetProps> = ({
  location,
  distanceKm,
  onClose,
  onStartRoute,
  onOpenReviews,
}) => {
  if (!location) return null;

  // Determinar servicios según la categoría
  const isCamping = location.category === 'CAMPING' || location.category.includes('CAMP');
  const isAreaCamper = location.category === 'AREA_SERVICIOS' || location.category === 'AREA_DESCANSO';
  const isGasStation = location.category === 'GASOLINERA_GLP';
  const isRestaurant = location.category === 'RESTAURANTE' || location.category.includes('BAR');

  return (
    <View style={styles.sheetContainer}>
      {/* Barra superior de arrastre */}
      <View style={styles.dragHandleContainer}>
        <View style={styles.dragHandle} />
      </View>

      {/* Cabecera con Categoría y Botón de Cierre */}
      <View style={styles.headerRow}>
        <View style={styles.categoryBadge}>
          <Icon
            name={
              isCamping
                ? 'tent'
                : isAreaCamper
                ? 'van-utility'
                : isGasStation
                ? 'gas-station'
                : isRestaurant
                ? 'silverware-fork-knife'
                : 'map-marker'
            }
            size={14}
            color="#10B981"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.categoryBadgeText}>
            {location.category.replace(/_/g, ' ')}
          </Text>
        </View>

        <View style={styles.verifiedBadge}>
          <Icon name="shield-check" size={14} color="#38BDF8" style={{ marginRight: 4 }} />
          <Text style={styles.verifiedText}>Comunidad Verificada</Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Nombre y Dirección */}
      <Text style={styles.title} numberOfLines={2}>
        {location.name}
      </Text>
      {location.address && (
        <View style={styles.addressRow}>
          <Icon name="map-marker-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.addressText} numberOfLines={1}>
            {location.address}
          </Text>
        </View>
      )}

      {/* Servicios Disponibles (Píldoras tácticas) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
        {(isCamping || isAreaCamper) && (
          <>
            <View style={styles.servicePill}>
              <Icon name="water" size={14} color="#38BDF8" />
              <Text style={styles.serviceText}>Agua Potable</Text>
            </View>
            <View style={styles.servicePill}>
              <Icon name="flash" size={14} color="#FBBF24" />
              <Text style={styles.serviceText}>Electricidad</Text>
            </View>
            <View style={styles.servicePill}>
              <Icon name="arrow-down-bold-circle-outline" size={14} color="#A78BFA" />
              <Text style={styles.serviceText}>Vaciado Aguas</Text>
            </View>
          </>
        )}
        {isGasStation && (
          <>
            <View style={styles.servicePill}>
              <Icon name="gas-cylinder" size={14} color="#F87171" />
              <Text style={styles.serviceText}>GLP / Autogas</Text>
            </View>
            <View style={styles.servicePill}>
              <Icon name="air-filter" size={14} color="#34D399" />
              <Text style={styles.serviceText}>AdBlue Surtidor</Text>
            </View>
          </>
        )}
        {isRestaurant && (
          <>
            <View style={styles.servicePill}>
              <Icon name="coffee" size={14} color="#FB923C" />
              <Text style={styles.serviceText}>Desayunos / Menú</Text>
            </View>
            <View style={styles.servicePill}>
              <Icon name="parking" size={14} color="#60A5FA" />
              <Text style={styles.serviceText}>Parking Amplio</Text>
            </View>
          </>
        )}
        <View style={styles.servicePill}>
          <Icon name="shield-lock-outline" size={14} color="#10B981" />
          <Text style={styles.serviceText}>Zona Segura</Text>
        </View>
        <View style={styles.servicePill}>
          <Icon name="cash-multiple" size={14} color="#34D399" />
          <Text style={styles.serviceText}>Gratis / Bajo Coste</Text>
        </View>
      </ScrollView>

      {/* Botones de Acción de Cabina */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryRouteBtn}
          activeOpacity={0.85}
          onPress={() => onStartRoute(location)}>
          <View style={styles.btnIconPod}>
            <Icon name="navigation" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryBtnTitle}>INICIAR RUTA SEGURA</Text>
            <Text style={styles.primaryBtnSub}>
              {distanceKm !== undefined ? `${distanceKm} km · ` : ''}Optimizado por altura y gálibo
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reviewsBtn}
          activeOpacity={0.8}
          onPress={() => onOpenReviews(location)}>
          <Icon name="star-outline" size={22} color="#F8FAFC" />
          <Text style={styles.reviewsBtnText}>Reseñas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 16,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 20,
    zIndex: 110,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  categoryBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  addressText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  servicesScroll: {
    marginBottom: 12,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  serviceText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryRouteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnIconPod: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  primaryBtnTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  primaryBtnSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
  reviewsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  reviewsBtnText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});

export default CockpitLocationDetailSheet;
