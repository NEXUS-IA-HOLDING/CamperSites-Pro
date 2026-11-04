/**
 * VehicleMapCursor.tsx - Simulador de Vehículo 3D con Orientación 360° y Haz de Luces
 * CamperSites Pro - Navegación 3D en Cabina estilo Waze / Google Maps
 *
 * Renderiza un modelo de vehículo tridimensional con:
 * - Chasis realista según tipo: Autocaravana Capuchina, Camper Van, 4x4 Overlanding, Camión o Flecha Neón
 * - Haz de luces delanteras (faros LED) proyectados sobre el asfalto en 3D
 * - Pilotos traseros LED de frenado / posición con aura roja
 * - Sombra de contacto sobre el asfalto
 * - Micro-vibración de suspensión dinámica en marcha
 */

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { VEHICLE_CURSORS, VehicleCursorType } from '../types/assistant';

interface VehicleMapCursorProps {
  cursorType?: VehicleCursorType;
  heading?: number; // Orientación 0-360° respecto al norte
  isMoving?: boolean;
}

export const VehicleMapCursor: React.FC<VehicleMapCursorProps> = ({
  cursorType = 'camper_arca',
  heading = 0,
  isMoving = false,
}) => {
  const config = VEHICLE_CURSORS[cursorType] || VEHICLE_CURSORS.camper_arca;
  const vibrationAnim = useRef(new Animated.Value(0)).current;

  // Animación sutil de marcha / vibración de suspensión del motor al rodar
  useEffect(() => {
    if (isMoving) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(vibrationAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(vibrationAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      vibrationAnim.setValue(0);
    }
  }, [isMoving, vibrationAnim]);

  const translateY = vibrationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1.2],
  });

  return (
    <View style={styles.rootContainer} pointerEvents="none">
      {/* Contenedor que rota 360° según el rumbo de la calzada */}
      <Animated.View
        style={[
          styles.rotationWrapper,
          {
            transform: [
              { rotate: `${Math.round(heading)}deg` },
              { translateY },
            ],
          },
        ]}>

        {/* 1. HAZ DE FAROS DELANTEROS (Proyección de luz sobre el asfalto en 3D) */}
        <View style={styles.headlightsProjection}>
          <View style={[styles.lightBeam, styles.lightBeamLeft]} />
          <View style={[styles.lightBeam, styles.lightBeamRight]} />
        </View>

        {/* 2. SOMBRA REALISTA DE CONTACTO CON EL ASFALTO */}
        <View style={styles.groundShadow} />

        {/* 3. RUEDAS LATERALES (Ocultas en moto, bici, SOS o flecha) */}
        {cursorType !== 'arrow' &&
          cursorType !== 'moto_trail' &&
          cursorType !== 'moto_sport' &&
          cursorType !== 'bicycle_mtb' &&
          cursorType !== 'sos_beacon' && (
            <>
              <View style={[styles.wheel, styles.wheelFrontLeft]} />
              <View style={[styles.wheel, styles.wheelFrontRight]} />
              <View style={[styles.wheel, styles.wheelRearLeft]} />
              <View style={[styles.wheel, styles.wheelRearRight]} />
            </>
          )}

        {/* 4. MODELO DE VEHÍCULO SEGÚN TIPO */}
        {cursorType === 'arrow' ? (
          // FLECHA DEPORTIVA NEÓN 3D
          <View style={styles.arrowPod}>
            <View style={styles.arrowCore}>
              <Icon name="navigation" size={32} color="#38BDF8" />
            </View>
          </View>
        ) : cursorType === 'sos_beacon' ? (
          // BALIZA TÁCTICA SOS / EXPLORADOR A PIE ("ME HE PERDIDO")
          <View style={styles.sosBeaconWrap}>
            <View style={styles.sosOuterRing}>
              <View style={styles.sosInnerCore}>
                <Icon name="lifebuoy" size={24} color="#FFFFFF" />
              </View>
            </View>
          </View>
        ) : cursorType === 'moto_trail' || cursorType === 'moto_sport' || cursorType === 'bicycle_mtb' ? (
          // MOTO TRAIL / MOTO TOURING / BICICLETA MTB 3D
          <View style={styles.motoContainer}>
            {/* Rueda delantera */}
            <View style={styles.motoWheelFront} />
            {/* Manillar ancho con paramanos */}
            <View
              style={[
                styles.motoHandlebar,
                cursorType === 'moto_sport' && { width: 22 },
              ]}
            />
            {/* Depósito y chasis central */}
            <View
              style={[
                styles.motoBody,
                cursorType === 'moto_trail' && { backgroundColor: '#F97316' },
                cursorType === 'moto_sport' && { backgroundColor: '#EC4899' },
                cursorType === 'bicycle_mtb' && { backgroundColor: '#14B8A6', width: 10 },
              ]}>
              {/* Casco del piloto visto desde arriba */}
              <View style={styles.motoHelmet} />
              {/* Maletas laterales de aluminio en Moto Trail */}
              {cursorType === 'moto_trail' && (
                <View style={styles.motoPanniersRow}>
                  <View style={styles.motoPannier} />
                  <View style={styles.motoPannier} />
                </View>
              )}
            </View>
            {/* Rueda trasera + piloto LED rojo */}
            <View style={styles.motoWheelRear} />
            <View style={styles.rearLedTaillight} />
          </View>
        ) : (
          // MODELOS AUTOMOTRICES 3D: AUTOCARAVANA / CAMPER / 4x4 / TURISMO / CAMIÓN
          <View
            style={[
              styles.vehicleChassis,
              cursorType === 'camper_arca' && styles.chassisArca,
              cursorType === 'vw_california' && styles.chassisCalifornia,
              cursorType === 'overland_4x4' && styles.chassis4x4,
              cursorType === 'car_suv' && styles.chassisSuv,
              cursorType === 'car_sport' && styles.chassisSport,
              cursorType === 'truck_hgv' && styles.chassisTruck,
            ]}>

            {/* FAROS DELANTEROS LED */}
            <View style={styles.frontBumper}>
              <View style={styles.ledHeadlight} />
              <View style={styles.grilleCenter} />
              <View style={styles.ledHeadlight} />
            </View>

            {/* CAPÓ Y RETROVISORES */}
            <View style={styles.hoodSection}>
              <View style={[styles.sideMirror, styles.mirrorLeft]} />
              <View style={styles.hoodSurface} />
              <View style={[styles.sideMirror, styles.mirrorRight]} />
            </View>

            {/* PARABRISAS PANORÁMICO TINTADO CON REFLEJO */}
            <View style={styles.windshieldContainer}>
              <View style={styles.windshieldGlass}>
                <View style={styles.windshieldGlare} />
              </View>
            </View>

            {/* TECHO / EQUIPAMIENTO CAMPER ESPECÍFICO */}
            <View style={styles.roofSection}>
              {cursorType === 'camper_arca' && (
                <>
                  {/* Cama Capuchina sobre cabina + Claraboya + Placa Solar */}
                  <View style={styles.alcoveCapuchina}>
                    <Text style={styles.alcoveText}>ARCA</Text>
                  </View>
                  <View style={styles.solarPanel}>
                    <View style={styles.solarGridLine} />
                  </View>
                  <View style={styles.roofVent} />
                </>
              )}

              {cursorType === 'camper_van' && (
                <>
                  {/* Furgón Gran Volumen con Claraboya y Nervaduras */}
                  <View style={styles.vanRoofRib} />
                  <View style={styles.roofVent} />
                  <View style={styles.vanRoofRib} />
                </>
              )}

              {cursorType === 'vw_california' && (
                <>
                  {/* Techo Elevable Pop-Top Bicolor */}
                  <View style={styles.californiaPopTop}>
                    <View style={styles.roofVent} />
                  </View>
                </>
              )}

              {cursorType === 'overland_4x4' && (
                <>
                  {/* Baca Safari Expedition con Planchas de Desatasco */}
                  <View style={styles.safariRack}>
                    <View style={styles.rackBar} />
                    <View style={styles.rackBar} />
                  </View>
                </>
              )}

              {cursorType === 'car_suv' && (
                <>
                  {/* Techo Solar Panorámico de Cristal */}
                  <View style={styles.suvSunroof} />
                </>
              )}

              {cursorType === 'car_sport' && (
                <>
                  {/* Franja Racing Deportiva y Alerón Trasero */}
                  <View style={styles.sportStripe} />
                </>
              )}

              {cursorType === 'truck_hgv' && (
                <>
                  {/* Camión con deflectores de cabina */}
                  <View style={styles.truckDeflector} />
                  <View style={styles.truckFifthWheel} />
                </>
              )}

              {cursorType === 'delivery_van' && (
                <>
                  <View style={styles.vanRoofRib} />
                  <View style={styles.roofVent} />
                </>
              )}
            </View>

            {/* RUEDA DE REPUESTO TRASERA (Sólo 4x4) */}
            {cursorType === 'overland_4x4' && (
              <View style={styles.spareTire} />
            )}

            {/* PARAGOLPES TRASERO CON PILOTOS LED ROJOS */}
            <View style={styles.rearBumper}>
              <View style={styles.rearLedTaillight} />
              <View style={styles.licensePlate} />
              <View style={styles.rearLedTaillight} />
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    width: 90,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotationWrapper: {
    width: 90,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  /* 1. FAROS DELANTEROS Y HAZ DE LUZ */
  headlightsProjection: {
    position: 'absolute',
    top: 2,
    width: 70,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.85,
    pointerEvents: 'none',
  },
  lightBeam: {
    width: 26,
    height: 46,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: 'rgba(254, 240, 138, 0.18)',
    borderWidth: 0.5,
    borderColor: 'rgba(254, 240, 138, 0.35)',
  },
  lightBeamLeft: {
    transform: [{ rotate: '-8deg' }],
  },
  lightBeamRight: {
    transform: [{ rotate: '8deg' }],
  },

  /* 2. SOMBRA BAJO EL VEHÍCULO */
  groundShadow: {
    position: 'absolute',
    top: 36,
    width: 34,
    height: 60,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    transform: [{ scaleY: 0.95 }],
  },

  /* 3. RUEDAS */
  wheel: {
    position: 'absolute',
    width: 4.5,
    height: 12,
    backgroundColor: '#090D16',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#334155',
  },
  wheelFrontLeft: {
    left: 27,
    top: 42,
  },
  wheelFrontRight: {
    right: 27,
    top: 42,
  },
  wheelRearLeft: {
    left: 27,
    top: 76,
  },
  wheelRearRight: {
    right: 27,
    top: 76,
  },

  /* 4. CHASIS DEL VEHÍCULO EN 3D */
  vehicleChassis: {
    position: 'absolute',
    top: 35,
    width: 32,
    height: 58,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    overflow: 'hidden',
  },
  chassisArca: {
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
    height: 62,
  },
  chassis4x4: {
    borderColor: '#84CC16',
    backgroundColor: '#3F6212',
    height: 54,
  },
  chassisTruck: {
    borderColor: '#F59E0B',
    backgroundColor: '#1E293B',
    height: 68,
  },

  /* MORRO Y FAROS DELANTEROS */
  frontBumper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    paddingTop: 2,
    height: 8,
    backgroundColor: '#0F172A',
  },
  ledHeadlight: {
    width: 5,
    height: 4,
    backgroundColor: '#FEF08A',
    borderRadius: 2,
    shadowColor: '#FDE047',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  grilleCenter: {
    flex: 1,
    height: 2,
    backgroundColor: '#334155',
    marginHorizontal: 3,
    borderRadius: 1,
  },

  /* CAPÓ Y RETROVISORES */
  hoodSection: {
    height: 8,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    justifyContent: 'center',
  },
  hoodSurface: {
    marginHorizontal: 4,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
  },
  sideMirror: {
    position: 'absolute',
    width: 4,
    height: 3,
    backgroundColor: '#0F172A',
    borderRadius: 1,
    top: 2,
  },
  mirrorLeft: {
    left: -3,
  },
  mirrorRight: {
    right: -3,
  },

  /* PARABRISAS TINTADO */
  windshieldContainer: {
    height: 9,
    paddingHorizontal: 2,
    backgroundColor: '#CBD5E1',
  },
  windshieldGlass: {
    flex: 1,
    backgroundColor: '#0369A1',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  windshieldGlare: {
    position: 'absolute',
    width: 25,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ rotate: '-18deg' }, { translateX: -3 }],
  },

  /* TECHO Y ACCESORIOS */
  roofSection: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  alcoveCapuchina: {
    width: 24,
    height: 7,
    backgroundColor: '#10B981',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  alcoveText: {
    fontSize: 5.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  solarPanel: {
    width: 20,
    height: 12,
    backgroundColor: '#0F172A',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  solarGridLine: {
    width: '100%',
    height: 0.8,
    backgroundColor: '#38BDF8',
  },
  roofVent: {
    width: 9,
    height: 9,
    backgroundColor: '#38BDF8',
    borderRadius: 2,
    borderWidth: 0.8,
    borderColor: '#FFFFFF',
  },
  vanRoofRib: {
    width: 22,
    height: 1.5,
    backgroundColor: '#94A3B8',
    marginVertical: 1.5,
    borderRadius: 1,
  },
  safariRack: {
    width: 22,
    height: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 3,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  rackBar: {
    height: 1.5,
    backgroundColor: '#F59E0B',
    marginHorizontal: 2,
  },
  truckDeflector: {
    width: 24,
    height: 10,
    backgroundColor: '#D97706',
    borderRadius: 2,
    marginBottom: 4,
  },
  truckFifthWheel: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  spareTire: {
    position: 'absolute',
    bottom: 3,
    width: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    alignSelf: 'center',
    zIndex: 10,
  },

  /* TRASERA CON PILOTOS ROJOS */
  rearBumper: {
    height: 6,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
  },
  rearLedTaillight: {
    width: 5,
    height: 3,
    backgroundColor: '#EF4444',
    borderRadius: 1.5,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
  },
  licensePlate: {
    width: 8,
    height: 2.5,
    backgroundColor: '#FEF08A',
    borderRadius: 1,
  },

  /* FLECHA NEÓN 3D */
  arrowPod: {
    position: 'absolute',
    top: 35,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCore: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },

  /* BALIZA TÁCTICA SOS / EXPLORADOR A PIE */
  sosBeaconWrap: {
    position: 'absolute',
    top: 30,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosOuterRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosInnerCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },

  /* MOTO TRAIL / MOTO SPORT / BICICLETA MTB 3D */
  motoContainer: {
    position: 'absolute',
    top: 24,
    width: 34,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  motoWheelFront: {
    width: 5,
    height: 11,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#64748B',
  },
  motoHandlebar: {
    width: 28,
    height: 4,
    backgroundColor: '#94A3B8',
    borderRadius: 2,
    marginTop: -2,
    zIndex: 5,
  },
  motoBody: {
    width: 14,
    height: 32,
    backgroundColor: '#F97316',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginTop: -1,
  },
  motoHelmet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  motoPanniersRow: {
    position: 'absolute',
    bottom: 2,
    width: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  motoPannier: {
    width: 5,
    height: 11,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    borderWidth: 0.8,
    borderColor: '#475569',
  },
  motoWheelRear: {
    width: 6,
    height: 11,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    marginTop: -1,
  },

  /* CHASIS ADICIONALES (CALIFORNIA / SUV / DEPORTIVO) */
  chassisCalifornia: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  chassisSuv: {
    backgroundColor: '#312E81',
    borderColor: '#818CF8',
  },
  chassisSport: {
    backgroundColor: '#991B1B',
    borderColor: '#EF4444',
  },
  californiaPopTop: {
    width: '84%',
    height: 22,
    backgroundColor: '#0284C7',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  suvSunroof: {
    width: '78%',
    height: 16,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  sportStripe: {
    width: 6,
    height: 26,
    backgroundColor: '#FBBF24',
    borderRadius: 2,
  },
});

export default VehicleMapCursor;
