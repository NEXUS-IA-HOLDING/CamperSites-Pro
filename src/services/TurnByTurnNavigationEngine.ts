/**
 * TurnByTurnNavigationEngine.ts - Motor de Navegación Profesional en Tiempo Real
 * CamperSites Pro - Cockpit Automotive Navigation
 * 
 * Capacidades:
 * 1. Parseo y formateo inteligente de maniobras OSRM (giros, rotondas con salidas, incorporaciones, salidas de autopista)
 * 2. Snap-to-Road (proyección geométrica en tiempo real sobre la calzada para eliminar deriva GPS)
 * 3. Cálculo de distancia precisa al próximo giro y a destino
 * 4. Avisos por voz (TTS) en cascada (1km -> 400m -> Ahora)
 * 5. Detección automática de desvío de ruta (>35m sostenidos) con orden de recálculo instantáneo
 * 6. Orientación de cámara y rumbo de cabina 3D
 */

import { AudioAlertService } from './AudioAlertService';
import { Logger } from '../utils/logger';
import { LaneInfo } from '../components/LaneGuidanceHUD';

export type HUDManeuverType =
  | 'turn-right'
  | 'turn-left'
  | 'straight'
  | 'roundabout'
  | 'merge'
  | 'u-turn'
  | 'arrive'
  | 'fork';

export interface OSRMStep {
  distance: number; // metros
  duration: number; // segundos
  name: string; // ej: "Calle Mayor", "Autovía del Norte"
  ref?: string; // ej: "A-1", "AP-7", "N-340"
  maneuver: {
    location: [number, number]; // [lng, lat]
    bearing_before: number;
    bearing_after: number;
    type: string; // 'turn', 'new name', 'depart', 'arrive', 'merge', 'on ramp', 'off ramp', 'fork', 'end of road', 'continue', 'roundabout', 'rotary'
    modifier?: string; // 'uturn', 'sharp right', 'right', 'slight right', 'straight', 'slight left', 'left', 'sharp left'
    exit?: number;
  };
  intersections?: Array<{
    location: [number, number];
    bearings: number[];
    lanes?: Array<{
      valid: boolean;
      indications: string[];
    }>;
  }>;
  geometry?: string | { coordinates: [number, number][] };
}

export interface NavigationStep {
  id: string;
  name: string;
  roadRef?: string;
  instruction: string;
  voiceInstruction: string;
  maneuverType: HUDManeuverType;
  distanceMeters: number;
  durationSeconds: number;
  location: { latitude: number; longitude: number };
  routeCoordIndex?: number;
  bearingBefore: number;
  bearingAfter: number;
  exitNumber?: number;
  lanes?: LaneInfo[];
}

export interface NavigationProgress {
  currentStepIndex: number;
  currentStep: NavigationStep | null;
  nextStep: NavigationStep | null;
  distanceToTurnMeters: number;
  instruction: string;
  roadName: string;
  maneuverType: HUDManeuverType;
  remainingDistanceKm: number;
  remainingMinutes: number;
  etaString: string;
  snappedPosition: {
    latitude: number;
    longitude: number;
    bearing: number;
  };
  activeLanes?: LaneInfo[];
  isOffRoute: boolean;
  offRouteDistanceMeters: number;
  isDestinationReached: boolean;
}

// Cálculo de distancia euclidiana esférica Haversine en metros
function haversineMeters(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371000; // Radio terrestre en metros
  const dLat = (coord2.latitude - coord1.latitude) * (Math.PI / 180);
  const dLng = (coord2.longitude - coord1.longitude) * (Math.PI / 180);
  const lat1 = coord1.latitude * (Math.PI / 180);
  const lat2 = coord2.latitude * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Rumbo (bearing) entre dos puntos en grados (0° - 360°)
function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const phi1 = lat1 * (Math.PI / 180);
  const phi2 = lat2 * (Math.PI / 180);

  const y = Math.sin(dLng) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Proyección ortogonal de punto P sobre segmento AB para Snap-to-Road
function projectPointOnSegment(
  p: { latitude: number; longitude: number },
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): { point: { latitude: number; longitude: number }; distance: number; t: number } {
  // Conversión aproximada plana local en metros
  const latMid = (a.latitude + b.latitude) / 2;
  const mPerDegLat = 111132.95;
  const mPerDegLng = 111132.95 * Math.cos(latMid * (Math.PI / 180));

  const ax = a.longitude * mPerDegLng;
  const ay = a.latitude * mPerDegLat;
  const bx = b.longitude * mPerDegLng;
  const by = b.latitude * mPerDegLat;
  const px = p.longitude * mPerDegLng;
  const py = p.latitude * mPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const dist = Math.hypot(px - ax, py - ay);
    return { point: a, distance: dist, t: 0 };
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t)); // Clamped al segmento

  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const dist = Math.hypot(px - projX, py - projY);

  return {
    point: {
      latitude: projY / mPerDegLat,
      longitude: projX / mPerDegLng,
    },
    distance: dist,
    t,
  };
}

export class TurnByTurnNavigationEngine {
  private routeCoordinates: Array<{ latitude: number; longitude: number }> = [];
  private steps: NavigationStep[] = [];
  private currentStepIndex: number = 0;
  private totalDistanceMeters: number = 0;
  private totalDurationSeconds: number = 0;
  private consecutiveOffRouteCount: number = 0;
  private isOffRoute: boolean = false;
  private onOffRouteCallback?: () => void;
  private announcedPhases: Set<string> = new Set(); // ej: 'step-2-400m'

  /**
   * Carga una ruta OSRM con pasos (steps) y geometría GeoJSON
   */
  public initializeRoute(
    rawRoute: any,
    initialLocation: { latitude: number; longitude: number },
    onOffRoute?: () => void
  ) {
    this.onOffRouteCallback = onOffRoute;
    this.consecutiveOffRouteCount = 0;
    this.isOffRoute = false;
    this.announcedPhases.clear();
    this.currentStepIndex = 0;

    // 1. Extraer coordenadas del polyline
    if (rawRoute.geometry && rawRoute.geometry.coordinates) {
      this.routeCoordinates = rawRoute.geometry.coordinates.map((c: [number, number]) => ({
        longitude: c[0],
        latitude: c[1],
      }));
    } else if (rawRoute.coordinates) {
      this.routeCoordinates = rawRoute.coordinates;
    } else {
      this.routeCoordinates = [];
    }

    this.totalDistanceMeters = rawRoute.distance || 0;
    this.totalDurationSeconds = rawRoute.duration || 0;

    // 2. Extraer y formatear pasos de navegación de OSRM
    const osrmSteps: OSRMStep[] =
      rawRoute.legs && rawRoute.legs[0] && rawRoute.legs[0].steps
        ? rawRoute.legs[0].steps
        : [];

    this.steps = osrmSteps.map((step, idx) => this.parseOSRMStep(step, idx));

    // Si OSRM no devolvió steps detallados, creamos paso por defecto
    if (this.steps.length === 0 && this.routeCoordinates.length > 0) {
      const lastCoord = this.routeCoordinates[this.routeCoordinates.length - 1];
      this.steps = [
        {
          id: 'step-0',
          name: 'Vía asignada',
          instruction: 'Siga la ruta trazada hacia el destino',
          voiceInstruction: 'Siga la ruta trazada hacia su destino',
          maneuverType: 'straight',
          distanceMeters: this.totalDistanceMeters,
          durationSeconds: this.totalDurationSeconds,
          location: lastCoord,
          routeCoordIndex: Math.max(0, this.routeCoordinates.length - 1),
          bearingBefore: 0,
          bearingAfter: 0,
        },
      ];
    } else if (this.routeCoordinates.length > 0) {
      // Asociar cada maniobra con su vértice exacto en la polilínea (monótonamente creciente)
      let searchStartIdx = 0;
      for (let s = 0; s < this.steps.length; s++) {
        const stepLoc = this.steps[s].location;
        let bestIdx = searchStartIdx;
        let bestDist = Infinity;
        for (let k = searchStartIdx; k < this.routeCoordinates.length; k++) {
          const d = haversineMeters(stepLoc, this.routeCoordinates[k]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = k;
          }
          // Si ya encontramos un punto muy cercano (<12m) y empieza a alejarse, parar búsqueda local
          if (bestDist < 12 && d > 45) {
            break;
          }
        }
        this.steps[s].routeCoordIndex = bestIdx;
        searchStartIdx = bestIdx;
      }
    }

    // En OSRM, steps[0] es 'depart' (punto de origen 0m). La primera maniobra por delante es steps[1]
    this.currentStepIndex = this.steps.length > 1 ? 1 : 0;

    Logger.info(
      'TurnByTurnNavigationEngine',
      `Ruta inicializada: ${this.steps.length} maniobras, ${(this.totalDistanceMeters / 1000).toFixed(1)} km`
    );

    // Aviso de inicio de viaje con la primera maniobra real por delante
    const firstUpcoming = this.steps[this.currentStepIndex] || this.steps[0];
    if (firstUpcoming) {
      AudioAlertService.speak(`Iniciando navegación 3D. ${firstUpcoming.voiceInstruction}`, 'nav_start', 1000);
    }
  }

  /**
   * Procesa la posición GPS actual del vehículo, realiza snap-to-road,
   * calcula distancias reales por carretera al próximo giro y emite avisos por voz
   */
  public updateLocation(
    currentLat: number,
    currentLng: number,
    speed: number,
    gpsHeading?: number
  ): NavigationProgress {
    const rawPos = { latitude: currentLat, longitude: currentLng };

    // 1. Proyección ortogonal (Snap-to-road) sobre la polilínea de la ruta
    let closestDist = Infinity;
    let closestPoint = rawPos;
    let closestSegmentBearing = gpsHeading || 0;
    let closestSegmentIndex = 0;

    if (this.routeCoordinates.length >= 2) {
      for (let i = 0; i < this.routeCoordinates.length - 1; i++) {
        const segA = this.routeCoordinates[i];
        const segB = this.routeCoordinates[i + 1];
        const proj = projectPointOnSegment(rawPos, segA, segB);

        if (proj.distance < closestDist) {
          closestDist = proj.distance;
          closestPoint = proj.point;
          // Buscar un vértice por delante a mínimo 8 metros para un rumbo tangente 100% estable en curvas
          let lookAheadIdx = i + 1;
          while (
            lookAheadIdx < this.routeCoordinates.length - 1 &&
            haversineMeters(closestPoint, this.routeCoordinates[lookAheadIdx]) < 8
          ) {
            lookAheadIdx++;
          }
          closestSegmentBearing = calculateBearing(
            segA.latitude,
            segA.longitude,
            this.routeCoordinates[lookAheadIdx].latitude,
            this.routeCoordinates[lookAheadIdx].longitude
          );
          closestSegmentIndex = i;
        }
      }
    }

    // 2. Detección de Desvío de Ruta (Off-Route > 45 metros sostenidos)
    const OFF_ROUTE_THRESHOLD_METERS = 45;
    if (closestDist > OFF_ROUTE_THRESHOLD_METERS) {
      this.consecutiveOffRouteCount += 1;
      if (this.consecutiveOffRouteCount >= 3 && !this.isOffRoute) {
        this.isOffRoute = true;
        Logger.warn('TurnByTurnNavigationEngine', `Vehículo desviado de ruta (${Math.round(closestDist)}m). Recalculando...`);
        AudioAlertService.speak('Recalculando ruta...', 'off_route', 10000);
        if (this.onOffRouteCallback) {
          this.onOffRouteCallback();
        }
      }
    } else {
      this.consecutiveOffRouteCount = 0;
      this.isOffRoute = false;
    }

    // Posición proyectada sobre el asfalto y rumbo tangente de la vía cuando estamos en ruta (<= 45m)
    const isSnapped = closestDist <= 45 && this.routeCoordinates.length >= 2;
    const finalLat = isSnapped ? closestPoint.latitude : currentLat;
    const finalLng = isSnapped ? closestPoint.longitude : currentLng;
    const finalHeading = isSnapped
      ? closestSegmentBearing
      : (gpsHeading !== undefined && gpsHeading >= 0 ? gpsHeading : closestSegmentBearing);

    // 3. Avanzar automáticamente de paso si ya superamos el vértice de la maniobra en la polilínea
    while (
      this.currentStepIndex < this.steps.length - 1 &&
      this.steps[this.currentStepIndex].routeCoordIndex !== undefined &&
      closestSegmentIndex > this.steps[this.currentStepIndex].routeCoordIndex!
    ) {
      this.currentStepIndex += 1;
    }

    let currentStep = this.steps[this.currentStepIndex] || null;

    // Calcular distancia REAL por carretera (siguiendo los segmentos de la ruta) hasta la maniobra activa
    let distToManeuver = 0;
    if (currentStep) {
      const targetIdx = currentStep.routeCoordIndex;
      if (targetIdx !== undefined && targetIdx > closestSegmentIndex && this.routeCoordinates.length > targetIdx) {
        distToManeuver = haversineMeters(
          { latitude: finalLat, longitude: finalLng },
          this.routeCoordinates[closestSegmentIndex + 1]
        );
        for (let k = closestSegmentIndex + 1; k < targetIdx; k++) {
          distToManeuver += haversineMeters(this.routeCoordinates[k], this.routeCoordinates[k + 1]);
        }
      } else {
        distToManeuver = haversineMeters({ latitude: finalLat, longitude: finalLng }, currentStep.location);
      }

      // Transición al siguiente paso si estamos a menos de 25m de la maniobra
      if (distToManeuver < 25 && this.currentStepIndex < this.steps.length - 1) {
        this.currentStepIndex += 1;
        currentStep = this.steps[this.currentStepIndex];
        Logger.info('TurnByTurnNavigationEngine', `Maniobra completada. Siguiente: ${currentStep.instruction}`);
      }
    }

    const nextStep = this.steps[this.currentStepIndex + 1] || null;
    const activeRoadStep = this.steps[Math.max(0, this.currentStepIndex - 1)] || currentStep;

    // 4. Calcular distancia y tiempo restantes a destino
    let remainingDistMeters = 0;
    if (this.routeCoordinates.length > 0) {
      remainingDistMeters = haversineMeters(
        { latitude: finalLat, longitude: finalLng },
        this.routeCoordinates[closestSegmentIndex + 1] || this.routeCoordinates[this.routeCoordinates.length - 1]
      );
      for (let j = closestSegmentIndex + 1; j < this.routeCoordinates.length - 1; j++) {
        remainingDistMeters += haversineMeters(this.routeCoordinates[j], this.routeCoordinates[j + 1]);
      }
    }

    const currentSpeedMps = Math.max(speed, 8); // mínimo ~29 km/h para ETA realista
    const remainingSeconds = Math.round(remainingDistMeters / currentSpeedMps);
    const etaDate = new Date(Date.now() + remainingSeconds * 1000);
    const etaString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isDestinationReached =
      this.currentStepIndex >= this.steps.length - 1 && distToManeuver < 30;

    // 5. Gestión de Locución por Voz inteligente
    if (currentStep && !this.isOffRoute && !isDestinationReached) {
      this.handleVoiceAnnouncements(currentStep, distToManeuver);
    } else if (isDestinationReached) {
      const arrivedKey = 'destination_reached';
      if (!this.announcedPhases.has(arrivedKey)) {
        this.announcedPhases.add(arrivedKey);
        AudioAlertService.speak('Ha llegado a su destino.', arrivedKey, 30000);
      }
    }

    // 6. Determinar carriles activos si estamos a menos de 800m del giro
    let activeLanes: LaneInfo[] | undefined;
    if (currentStep && distToManeuver <= 800) {
      if (currentStep.lanes && currentStep.lanes.length > 0) {
        activeLanes = currentStep.lanes;
      } else if (
        currentStep.maneuverType === 'fork' ||
        currentStep.maneuverType === 'turn-right' ||
        currentStep.maneuverType === 'turn-left'
      ) {
        activeLanes = this.synthesizeLanes(currentStep.maneuverType);
      }
    }

    return {
      currentStepIndex: this.currentStepIndex,
      currentStep,
      nextStep,
      distanceToTurnMeters: Math.round(distToManeuver),
      instruction: currentStep ? currentStep.instruction : 'Continúe hacia el destino',
      roadName: activeRoadStep ? activeRoadStep.name || activeRoadStep.roadRef || 'Vía principal' : '',
      maneuverType: currentStep ? currentStep.maneuverType : 'straight',
      remainingDistanceKm: remainingDistMeters / 1000,
      remainingMinutes: Math.max(1, Math.round(remainingSeconds / 60)),
      etaString,
      snappedPosition: {
        latitude: finalLat,
        longitude: finalLng,
        bearing: finalHeading,
      },
      activeLanes,
      isOffRoute: this.isOffRoute,
      offRouteDistanceMeters: closestDist,
      isDestinationReached,
    };
  }

  /**
   * Genera avisos de voz estructurados a intervalos clave (1km, 400m, Inminente)
   */
  private handleVoiceAnnouncements(step: NavigationStep, distanceMeters: number) {
    const stepPrefix = `step-${this.currentStepIndex}`;

    // Nivel 1: Aviso lejano en autovía / carretera (850m - 1000m)
    if (distanceMeters <= 1000 && distanceMeters > 750) {
      const key = `${stepPrefix}-1km`;
      if (!this.announcedPhases.has(key)) {
        this.announcedPhases.add(key);
        AudioAlertService.speak(`En un kilómetro, ${step.voiceInstruction}`, key, 10000);
      }
    }

    // Nivel 2: Aviso intermedio de preparación (300m - 400m)
    if (distanceMeters <= 400 && distanceMeters > 250) {
      const key = `${stepPrefix}-400m`;
      if (!this.announcedPhases.has(key)) {
        this.announcedPhases.add(key);
        AudioAlertService.speak(`A 400 metros, ${step.voiceInstruction}`, key, 8000);
      }
    }

    // Nivel 3: Aviso inminente de ejecución (30m - 80m)
    if (distanceMeters <= 80 && distanceMeters > 20) {
      const key = `${stepPrefix}-now`;
      if (!this.announcedPhases.has(key)) {
        this.announcedPhases.add(key);
        const instantVoice = this.formatImmediateVoice(step);
        AudioAlertService.speak(instantVoice, key, 6000);
      }
    }
  }

  /**
   * Convierte un paso de OSRM en datos en español claros y unificados
   */
  private parseOSRMStep(step: OSRMStep, index: number): NavigationStep {
    const maneuver = step.maneuver || { type: 'continue', modifier: 'straight', location: [0, 0], bearing_before: 0, bearing_after: 0 };
    const name = step.name || '';
    const ref = step.ref || '';
    const exitNum = maneuver.exit;

    let maneuverType: HUDManeuverType = 'straight';
    let textInstruction = 'Continúe recto';
    let voiceInstruction = 'continúe recto';

    const roadLabel = ref ? `${ref}${name ? ` - ${name}` : ''}` : name;

    switch (maneuver.type) {
      case 'turn':
        if (maneuver.modifier?.includes('right')) {
          maneuverType = 'turn-right';
          textInstruction = roadLabel ? `Gire a la derecha en ${roadLabel}` : 'Gire a la derecha';
          voiceInstruction = roadLabel ? `gire a la derecha en ${roadLabel}` : 'gire a la derecha';
        } else if (maneuver.modifier?.includes('left')) {
          maneuverType = 'turn-left';
          textInstruction = roadLabel ? `Gire a la izquierda en ${roadLabel}` : 'Gire a la izquierda';
          voiceInstruction = roadLabel ? `gire a la izquierda en ${roadLabel}` : 'gire a la izquierda';
        } else if (maneuver.modifier === 'uturn') {
          maneuverType = 'u-turn';
          textInstruction = 'Realice un cambio de sentido';
          voiceInstruction = 'realice un cambio de sentido cuando sea posible';
        }
        break;

      case 'roundabout':
      case 'rotary':
        maneuverType = 'roundabout';
        const exitText = exitNum ? `la ${exitNum}ª salida` : 'la salida indicada';
        textInstruction = roadLabel ? `En la rotonda, tome ${exitText} hacia ${roadLabel}` : `En la rotonda, tome ${exitText}`;
        voiceInstruction = roadLabel ? `en la rotonda, tome ${exitText} hacia ${roadLabel}` : `en la rotonda, tome ${exitText}`;
        break;

      case 'off ramp':
        maneuverType = 'fork';
        textInstruction = roadLabel ? `Tome la salida hacia ${roadLabel}` : 'Tome la salida';
        voiceInstruction = roadLabel ? `tome la salida hacia ${roadLabel}` : 'tome la salida a la derecha';
        break;

      case 'on ramp':
      case 'merge':
        maneuverType = 'merge';
        textInstruction = roadLabel ? `Incorpórese a ${roadLabel}` : 'Incorpórese a la vía principal';
        voiceInstruction = roadLabel ? `incorpórese a ${roadLabel}` : 'incorpórese a la vía principal';
        break;

      case 'fork':
        maneuverType = 'fork';
        const forkSide = maneuver.modifier?.includes('left') ? 'la izquierda' : 'la derecha';
        textInstruction = roadLabel ? `Manténgase a ${forkSide} hacia ${roadLabel}` : `Manténgase a ${forkSide}`;
        voiceInstruction = textInstruction.toLowerCase();
        break;

      case 'arrive':
        maneuverType = 'arrive';
        textInstruction = 'Ha llegado a su destino';
        voiceInstruction = 'ha llegado a su destino';
        break;

      default:
        maneuverType = 'straight';
        textInstruction = roadLabel ? `Continúe por ${roadLabel}` : 'Continúe recto por la vía';
        voiceInstruction = roadLabel ? `continúe por ${roadLabel}` : 'continúe recto';
        break;
    }

    // Extraer configuración de carriles si OSRM los proporciona
    let stepLanes: LaneInfo[] | undefined;
    if (step.intersections && step.intersections[0] && step.intersections[0].lanes) {
      stepLanes = step.intersections[0].lanes.map(l => ({
        valid: l.valid,
        indications: l.indications || ['straight'],
      }));
    }

    return {
      id: `step-${index}`,
      name: name || ref || 'Vía principal',
      roadRef: ref,
      instruction: textInstruction,
      voiceInstruction,
      maneuverType,
      distanceMeters: step.distance || 0,
      durationSeconds: step.duration || 0,
      location: {
        latitude: maneuver.location[1],
        longitude: maneuver.location[0],
      },
      bearingBefore: maneuver.bearing_before || 0,
      bearingAfter: maneuver.bearing_after || 0,
      exitNumber: exitNum,
      lanes: stepLanes,
    };
  }

  /**
   * Genera configuración de carriles realista para autovías y bifurcaciones
   */
  private synthesizeLanes(maneuver: HUDManeuverType): LaneInfo[] {
    switch (maneuver) {
      case 'fork':
      case 'turn-right':
        return [
          { valid: false, indications: ['straight'] },
          { valid: false, indications: ['straight'] },
          { valid: true, indications: ['slight right'] },
          { valid: true, indications: ['right'] },
        ];
      case 'turn-left':
        return [
          { valid: true, indications: ['left'] },
          { valid: true, indications: ['slight left'] },
          { valid: false, indications: ['straight'] },
          { valid: false, indications: ['straight'] },
        ];
      default:
        return [
          { valid: true, indications: ['straight'] },
          { valid: true, indications: ['straight'] },
        ];
    }
  }

  private formatImmediateVoice(step: NavigationStep): string {
    switch (step.maneuverType) {
      case 'turn-right':
        return 'Ahora, gire a la derecha';
      case 'turn-left':
        return 'Ahora, gire a la izquierda';
      case 'roundabout':
        return `Entre en la rotonda y tome la ${step.exitNumber || 1}ª salida`;
      case 'fork':
        return 'Tome la salida ahora';
      case 'merge':
        return 'Incorpórese con precaución';
      case 'u-turn':
        return 'Cambio de sentido ahora';
      case 'arrive':
        return 'Ha llegado al destino';
      default:
        return 'Continúe recto';
    }
  }
}

export const navigationEngine = new TurnByTurnNavigationEngine();
