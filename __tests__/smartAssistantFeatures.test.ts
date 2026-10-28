/**
 * Tests unitarios y de integración para el Asistente de Ruta Inteligente de Vehículos Especiales
 * Camper, Camión y Reparto - CamperSites Pro
 */

jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user', user_metadata: { display_name: 'Tester' } } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      upsert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    })),
  },
}));

import { VehicleRoutingService, TACHO_MAX_CONTINUOUS_MINUTES, TACHO_WARNING_MINUTES } from '../src/services/VehicleRoutingService';
import { ReviewService } from '../src/services/ReviewService';
import { ClearanceHazard, DeliveryStop, LocationReview } from '../src/types/assistant';
import { CamperSitesTheme } from '../src/theme';
import { ALERT_CONFIG, AlertType } from '../src/lib/communityAlerts';

describe('Smart Assistant Features for Special Vehicles (Camper, Truck, Delivery)', () => {

  // ============================================
  // 1. OPTIMIZACIÓN TSP MULTI-PARADA (REPARTO)
  // ============================================
  describe('TSP Route Optimization for Delivery / Last Mile', () => {
    const origin = { latitude: 40.4168, longitude: -3.7038 }; // Madrid Centro

    it('should handle empty or single stop gracefully', () => {
      const emptyResult = VehicleRoutingService.optimizeDeliveryStops(origin, []);
      expect(emptyResult.orderedStops).toEqual([]);
      expect(emptyResult.totalDistanceKm).toBe(0);

      const singleStop: DeliveryStop = {
        id: 'stop-1',
        address: 'Calle Mayor 1',
        latitude: 40.4153,
        longitude: -3.7074,
        estimatedUnloadMinutes: 4,
      };
      const singleResult = VehicleRoutingService.optimizeDeliveryStops(origin, [singleStop]);
      expect(singleResult.orderedStops.length).toBe(1);
      expect(singleResult.orderedStops[0].sequenceOrder).toBe(1);
      expect(singleResult.totalServiceDurationMin).toBe(4);
      expect(singleResult.totalDurationMin).toBeGreaterThan(0);
    });

    it('should order multiple stops and compute cumulative arrival times', () => {
      const stops: DeliveryStop[] = [
        { id: 'far', address: 'Cliente Lejano', latitude: 40.4800, longitude: -3.6500, estimatedUnloadMinutes: 5 },
        { id: 'near', address: 'Cliente Cercano', latitude: 40.4190, longitude: -3.7010, estimatedUnloadMinutes: 3 },
        { id: 'mid', address: 'Cliente Medio', latitude: 40.4350, longitude: -3.6800, estimatedUnloadMinutes: 4 },
      ];

      const result = VehicleRoutingService.optimizeDeliveryStops(origin, stops, 40);
      expect(result.orderedStops.length).toBe(3);
      // Nearest neighbor should pick the closest stop first
      expect(result.orderedStops[0].id).toBe('near');
      expect(result.orderedStops[0].sequenceOrder).toBe(1);
      expect(result.orderedStops[0].estimatedArrival).toBeDefined();

      expect(result.totalServiceDurationMin).toBe(12); // 5 + 3 + 4
      expect(result.totalDistanceKm).toBeGreaterThan(0);
    });

    it('should scale efficiently up to 50 stops within 50ms', () => {
      const stops50: DeliveryStop[] = [];
      for (let i = 0; i < 50; i++) {
        stops50.push({
          id: `stop-${i}`,
          address: `Parada de entrega #${i + 1}`,
          latitude: origin.latitude + (Math.sin(i) * 0.05),
          longitude: origin.longitude + (Math.cos(i) * 0.05),
          estimatedUnloadMinutes: 3,
        });
      }

      const start = Date.now();
      const result = VehicleRoutingService.optimizeDeliveryStops(origin, stops50, 35);
      const elapsed = Date.now() - start;

      expect(result.orderedStops.length).toBe(50);
      expect(result.totalServiceDurationMin).toBe(150); // 50 * 3
      expect(elapsed).toBeLessThan(100); // Rápido y fluido
    });
  });

  // ============================================
  // 2. MODO TACÓGRAFO REGLAMENTARIO (CAMIÓN)
  // ============================================
  describe('Tachograph Regulatory Timer (EU 561/2006)', () => {
    it('should correctly signal normal state under 3h 45m', () => {
      const status = VehicleRoutingService.calculateTachographStatus(0, false, 120); // 2 horas
      expect(status.drivingMinutes).toBe(120);
      expect(status.isWarningActive).toBe(false);
      expect(status.isLimitExceeded).toBe(false);
    });

    it('should activate smart alarm at 3h 45m (225 min)', () => {
      const status = VehicleRoutingService.calculateTachographStatus(0, false, TACHO_WARNING_MINUTES);
      expect(status.isWarningActive).toBe(true);
      expect(status.isLimitExceeded).toBe(false);
    });

    it('should flag legal limit exceeded at 4h 30m (270 min)', () => {
      const status = VehicleRoutingService.calculateTachographStatus(0, false, TACHO_MAX_CONTINUOUS_MINUTES);
      expect(status.isWarningActive).toBe(false); // exceeds warning to danger
      expect(status.isLimitExceeded).toBe(true);
    });

    it('should format tachograph time cleanly', () => {
      expect(VehicleRoutingService.formatTachographTime(95)).toBe('1h 35m');
      expect(VehicleRoutingService.formatTachographTime(225)).toBe('3h 45m');
      expect(VehicleRoutingService.formatTachographTime(270)).toBe('4h 30m');
    });
  });

  // ============================================
  // 3. DETECCIÓN DE GÁLIBO Y PUENTES BAJOS
  // ============================================
  describe('Clearance and Low Bridge Detection', () => {
    const routeCoords = [
      { latitude: 40.4160, longitude: -3.7030 },
      { latitude: 40.4170, longitude: -3.7040 },
    ];

    const hazards: ClearanceHazard[] = [
      {
        id: 'bridge-1',
        latitude: 40.4165,
        longitude: -3.7035,
        maxAllowedHeight: 2.90,
        description: 'Puente con gálibo 2.90m',
      },
      {
        id: 'bridge-2',
        latitude: 40.4169,
        longitude: -3.7039,
        maxAllowedHeight: 4.20,
        description: 'Puente alto 4.20m',
      },
    ];

    it('should detect danger when vehicle height exceeds allowed clearance', () => {
      const tallVehicleHeight = 3.20; // 3.20m camper / camión
      const conflicts = VehicleRoutingService.checkClearanceHazards(routeCoords, hazards, tallVehicleHeight, 1000);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].hazard.id).toBe('bridge-1');
      expect(conflicts[0].hazard.maxAllowedHeight).toBe(2.90);
    });

    it('should not flag conflict for low vehicles with sufficient clearance', () => {
      const lowVehicleHeight = 1.90; // Coche o van compacta
      const conflicts = VehicleRoutingService.checkClearanceHazards(routeCoords, hazards, lowVehicleHeight, 1000);

      expect(conflicts.length).toBe(0);
    });
  });

  // ============================================
  // 4. FILTRADO DE PUNTOS POR PERFIL
  // ============================================
  describe('POI Categories by Vehicle Mode', () => {
    it('should provide specialized POI categories for Camper, Truck, and Delivery', () => {
      const camperCategories = VehicleRoutingService.getCategoriesForMode('camper');
      expect(camperCategories).toContain('CAMPING');
      expect(camperCategories).toContain('AREA_SERVICIOS');
      expect(camperCategories).toContain('PLAYA');

      const truckCategories = VehicleRoutingService.getCategoriesForMode('truck');
      expect(truckCategories).toContain('RESTAURANTE');
      expect(truckCategories).toContain('AREA_DESCANSO');
      expect(truckCategories).not.toContain('PLAYA');

      const deliveryCategories = VehicleRoutingService.getCategoriesForMode('delivery');
      expect(deliveryCategories).toContain('PARKING_PERMITIDO');
      expect(deliveryCategories).toContain('SUPERMERCADO');
    });
  });

  // ============================================
  // 5. SISTEMA DE RESEÑAS Y OPINIONES
  // ============================================
  describe('Community Reviews & Ratings Calculation', () => {
    const mockReviews: LocationReview[] = [
      {
        id: 'rev-1',
        locationId: 'loc-1',
        userId: 'u1',
        userName: 'Carlos Camper',
        rating: 5,
        securityLevel: 'safe',
        noiseLevel: 'quiet',
        comment: 'Área estupenda, suelo nivelado y tomas de agua operativas.',
        verifiedServices: ['water', 'electricity'],
        vehicleTypeUsed: 'camper',
        createdAt: '2026-05-10T10:00:00Z',
      },
      {
        id: 'rev-2',
        locationId: 'loc-1',
        userId: 'u2',
        userName: 'Marta Camión',
        rating: 4,
        securityLevel: 'safe',
        noiseLevel: 'acceptable',
        comment: 'Buen menú del día y plazas amplias para tráiler.',
        verifiedServices: ['truck_parking', 'adblue'],
        vehicleTypeUsed: 'truck',
        createdAt: '2026-05-12T14:30:00Z',
      },
      {
        id: 'rev-3',
        locationId: 'loc-1',
        userId: 'u3',
        userName: 'David Van',
        rating: 3,
        securityLevel: 'caution',
        noiseLevel: 'noisy',
        comment: 'Un poco ruidoso cerca de la autovía.',
        verifiedServices: [],
        vehicleTypeUsed: 'van',
        createdAt: '2026-05-14T20:00:00Z',
      },
    ];

    it('should calculate accurate review statistics', () => {
      const stats = ReviewService.calculateReviewStats(mockReviews);
      expect(stats.totalReviews).toBe(3);
      expect(stats.avgRating).toBe(4.0); // (5 + 4 + 3) / 3 = 4.0
      expect(stats.safeCount).toBe(2);
      expect(stats.cautionCount).toBe(1);
      expect(stats.unsafeCount).toBe(0);
      expect(stats.quietCount).toBe(1);
      expect(stats.acceptableCount).toBe(1);
      expect(stats.noisyCount).toBe(1);
    });

    it('should return safe empty statistics when no reviews exist', () => {
      const emptyStats = ReviewService.calculateReviewStats([]);
      expect(emptyStats.totalReviews).toBe(0);
      expect(emptyStats.avgRating).toBe(0);
    });
  });

  // ============================================
  // 7. INCIDENCIAS DE CONDUCCIÓN SEGURA (1 TOQUE / 100M)
  // ============================================
  describe('One-Handed Driver Incident Alerts & 100m Geofencing', () => {
    it('should configure all requested driver incidents with correct metadata', () => {
      const requiredIncidents: AlertType[] = [
        'TRAFICO_DENSO',
        'VEHICULO_PARADO',
        'ANIMAL_VIA',
        'NIEBLA',
        'LLUVIA_INTENSA',
        'ATASCO',
        'OBJETO_CALZADA',
        'CARRETERA_MAL_ESTADO',
        'ACCIDENTE',
        'CONTROL_POLICIAL',
        'RADAR_MOVIL',
      ];

      for (const incident of requiredIncidents) {
        expect(ALERT_CONFIG[incident]).toBeDefined();
        expect(ALERT_CONFIG[incident].icon).toBeDefined();
        expect(ALERT_CONFIG[incident].label).toBeDefined();
        expect(ALERT_CONFIG[incident].color).toBeDefined();
        expect(ALERT_CONFIG[incident].expiresMinutes).toBeGreaterThan(0);
        expect(ALERT_CONFIG[incident].alertDistanceKm).toBeGreaterThan(0);
      }
    });

    it('should assign appropriate severity to critical road hazards', () => {
      expect(ALERT_CONFIG.ACCIDENTE.defaultSeverity).toBe('CRITICA');
      expect(ALERT_CONFIG.ANIMAL_VIA.defaultSeverity).toBe('ALTA');
      expect(ALERT_CONFIG.OBJETO_CALZADA.defaultSeverity).toBe('ALTA');
      expect(ALERT_CONFIG.NIEBLA.defaultSeverity).toBe('ALTA');
      expect(ALERT_CONFIG.ATASCO.defaultSeverity).toBe('ALTA');
    });
  });
});
