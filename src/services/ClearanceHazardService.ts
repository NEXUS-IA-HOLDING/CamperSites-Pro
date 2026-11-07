/**
 * ClearanceHazardService.ts - Servicio Integral de Gálibos, Puentes Bajos y Barreras de Altura
 * CamperSites Pro
 *
 * Cubre:
 * 1. Puentes bajos y túneles en carreteras nacionales, autovías y accesos urbanos.
 * 2. Barreras de altura (height restrictors) en parkings de playa, centros comerciales,
 *    miradores y accesos a calas de España y Portugal.
 * 3. Verificación rápida por cercanía haversine para rutas y fichas de ubicación.
 */

import { ClearanceHazard } from '../types/assistant';

export const SPAIN_CLEARANCE_HAZARDS: ClearanceHazard[] = [
  // ========================================================
  // 1. BARRERAS DE ALTURA EN PARKINGS Y PLAYAS (Anti-Camper)
  // ========================================================
  // Andalucía & Costa del Sol & Cádiz
  { id: 'bar-and-1', latitude: 36.5290, longitude: -6.2890, maxAllowedHeight: 2.10, description: 'Barrera altura acceso Parking Playa La Victoria', roadName: 'Paseo Marítimo', hazardType: 'height_barrier', spotName: 'Parking Playa La Victoria' },
  { id: 'bar-and-2', latitude: 36.1865, longitude: -5.9220, maxAllowedHeight: 2.00, description: 'Gálibo 2.00m Parking Playa de Bolonia', roadName: 'Acceso Duna Bolonia', hazardType: 'height_barrier', spotName: 'Playa de Bolonia' },
  { id: 'bar-and-3', latitude: 36.1950, longitude: -6.0280, maxAllowedHeight: 2.15, description: 'Barrera limitadora Parking Faro de Trafalgar', roadName: 'Carretera del Faro', hazardType: 'height_barrier', spotName: 'Faro Trafalgar' },
  { id: 'bar-and-4', latitude: 36.7580, longitude: -2.2350, maxAllowedHeight: 2.20, description: 'Pórtico gálibo Parking Playa de Mónsul', roadName: 'Pista Cabo de Gata', hazardType: 'height_barrier', spotName: 'Playa de Mónsul' },
  { id: 'bar-and-5', latitude: 36.7620, longitude: -2.2510, maxAllowedHeight: 2.20, description: 'Barrera gálibo Parking Playa de Los Genoveses', roadName: 'Camino Genoveses', hazardType: 'height_barrier', spotName: 'Los Genoveses' },
  { id: 'bar-and-6', latitude: 36.5350, longitude: -4.6210, maxAllowedHeight: 2.00, description: 'Barrera Parking Paseo Marítimo Fuengirola', roadName: 'Rey de España', hazardType: 'height_barrier', spotName: 'Parking Puerto Fuengirola' },
  { id: 'bar-and-7', latitude: 36.5050, longitude: -4.8820, maxAllowedHeight: 2.10, description: 'Barrera gálibo Playa del Cable Marbella', roadName: 'Acceso Playa Cable', hazardType: 'height_barrier', spotName: 'Playa del Cable' },
  { id: 'bar-and-8', latitude: 36.7110, longitude: -4.4280, maxAllowedHeight: 2.10, description: 'Pórtico gálibo Parking Muelle Uno Málaga', roadName: 'Paseo de la Farola', hazardType: 'height_barrier', spotName: 'Puerto Málaga Muelle Uno' },

  // Cataluña & Costa Brava & Costa Daurada
  { id: 'bar-cat-1', latitude: 41.3780, longitude: 2.1910, maxAllowedHeight: 2.10, description: 'Barrera altura Parking Barceloneta Port Vell', roadName: 'Passeig Marítim', hazardType: 'height_barrier', spotName: 'Parking Playa Barceloneta' },
  { id: 'bar-cat-2', latitude: 41.3930, longitude: 2.2060, maxAllowedHeight: 2.20, description: 'Barrera limitadora Parking Bogatell', roadName: 'Avinguda del Litoral', hazardType: 'height_barrier', spotName: 'Platja del Bogatell' },
  { id: 'bar-cat-3', latitude: 41.6720, longitude: 2.7910, maxAllowedHeight: 2.00, description: 'Pórtico gálibo Parking Cala Canyelles Lloret', roadName: 'Av. Canyelles', hazardType: 'height_barrier', spotName: 'Cala Canyelles' },
  { id: 'bar-cat-4', latitude: 41.9540, longitude: 3.2120, maxAllowedHeight: 2.10, description: 'Barrera gálibo Parking Aiguablava Begur', roadName: 'Ctra. de Platja Fonda', hazardType: 'height_barrier', spotName: 'Cala Aiguablava' },
  { id: 'bar-cat-5', latitude: 42.2850, longitude: 3.2810, maxAllowedHeight: 2.20, description: 'Pórtico altura Parque Natural Cap de Creus', roadName: 'Ctra. Cap de Creus', hazardType: 'height_barrier', spotName: 'Faro Cap de Creus' },
  { id: 'bar-cat-6', latitude: 41.1120, longitude: 1.2510, maxAllowedHeight: 2.00, description: 'Barrera acceso Parking Platja Arrabassada', roadName: 'Passeig Marítim Rafael Casanova', hazardType: 'height_barrier', spotName: 'Platja Arrabassada Tarragona' },
  { id: 'bar-cat-7', latitude: 41.0710, longitude: 1.1410, maxAllowedHeight: 2.10, description: 'Barrera altura Parking Ponent Salou', roadName: 'Passeig Miramar', hazardType: 'height_barrier', spotName: 'Playa Ponent Salou' },

  // Levante & Costa Blanca & Baleares
  { id: 'bar-lev-1', latitude: 39.4670, longitude: -0.3230, maxAllowedHeight: 2.10, description: 'Barrera altura Parking Malvarrosa Valencia', roadName: 'Paseo Marítimo de Levante', hazardType: 'height_barrier', spotName: 'Playa Malvarrosa' },
  { id: 'bar-lev-2', latitude: 39.3320, longitude: -0.3150, maxAllowedHeight: 2.00, description: 'Pórtico gálibo Parking El Saler Devesa', roadName: 'CV-500 acceso playa', hazardType: 'height_barrier', spotName: 'Playa del Saler' },
  { id: 'bar-lev-3', latitude: 38.6410, longitude: 0.0710, maxAllowedHeight: 2.10, description: 'Barrera altura Parking Peñón de Ifach Calpe', roadName: 'Av. del Port', hazardType: 'height_barrier', spotName: 'Peñón de Ifach' },
  { id: 'bar-lev-4', latitude: 38.5320, longitude: -0.1250, maxAllowedHeight: 2.10, description: 'Barrera gálibo Parking Poniente Benidorm', roadName: 'Av. Armada Española', hazardType: 'height_barrier', spotName: 'Playa Poniente Benidorm' },
  { id: 'bar-lev-5', latitude: 37.6410, longitude: -0.7180, maxAllowedHeight: 2.00, description: 'Barrera limitadora La Manga Mar Menor km 4', roadName: 'Gran Vía de La Manga', hazardType: 'height_barrier', spotName: 'Playa Galúa La Manga' },
  { id: 'bar-lev-6', latitude: 39.5620, longitude: 2.6390, maxAllowedHeight: 2.10, description: 'Barrera acceso Parking Can Pere Antoni Palma', roadName: 'Passeig Marítim', hazardType: 'height_barrier', spotName: 'Platja de Palma' },

  // Cornisa Cantábrica & Galicia & Asturias
  { id: 'bar-can-1', latitude: 43.3180, longitude: -1.9720, maxAllowedHeight: 2.10, description: 'Barrera altura Parking Zurriola San Sebastián', roadName: 'Paseo de Zurriola', hazardType: 'height_barrier', spotName: 'Playa de la Zurriola' },
  { id: 'bar-can-2', latitude: 43.4730, longitude: -3.7840, maxAllowedHeight: 2.00, description: 'Pórtico gálibo Parking El Sardinero Santander', roadName: 'Av. Manuel García Lago', hazardType: 'height_barrier', spotName: 'Segunda del Sardinero' },
  { id: 'bar-can-3', latitude: 43.4350, longitude: -4.4320, maxAllowedHeight: 2.10, description: 'Barrera limitadora Playa de Oyambre Comillas', roadName: 'Acceso Parque Oyambre', hazardType: 'height_barrier', spotName: 'Playa de Oyambre' },
  { id: 'bar-can-4', latitude: 43.5420, longitude: -5.6510, maxAllowedHeight: 2.10, description: 'Barrera altura Parking Playa San Lorenzo Gijón', roadName: 'Av. de Rufo García Rendueles', hazardType: 'height_barrier', spotName: 'Playa San Lorenzo Gijón' },
  { id: 'bar-can-5', latitude: 43.5610, longitude: -7.1550, maxAllowedHeight: 2.20, description: 'Pórtico gálibo Parking Playa de Las Catedrales', roadName: 'Ctra. As Catedrais', hazardType: 'height_barrier', spotName: 'Playa de las Catedrales' },
  { id: 'bar-can-6', latitude: 42.2350, longitude: -8.7610, maxAllowedHeight: 2.10, description: 'Barrera altura Parking Playa de Samil Vigo', roadName: 'Av. de Samil', hazardType: 'height_barrier', spotName: 'Playa de Samil Vigo' },
  { id: 'bar-can-7', latitude: 42.3980, longitude: -8.8150, maxAllowedHeight: 2.00, description: 'Barrera limitadora Parking Silgar Sanxenxo', roadName: 'Paseo de Silgar', hazardType: 'height_barrier', spotName: 'Playa de Silgar' },

  // Centros Comerciales & Miradores de Montaña
  { id: 'bar-mad-1', latitude: 40.5280, longitude: -3.6550, maxAllowedHeight: 2.20, description: 'Pórtico gálibo CC Plaza Norte 2 San Sebastián de los Reyes', roadName: 'Acceso Superficie', hazardType: 'height_barrier', spotName: 'Plaza Norte 2' },
  { id: 'bar-mad-2', latitude: 40.4850, longitude: -3.8810, maxAllowedHeight: 2.10, description: 'Gálibo 2.10m CC Gran Plaza 2 Majadahonda', roadName: 'Calle de los Químicos', hazardType: 'height_barrier', spotName: 'Gran Plaza 2' },
  { id: 'bar-mad-3', latitude: 40.7510, longitude: -4.0150, maxAllowedHeight: 2.30, description: 'Barrera acceso Puerto de Navacerrada parking inferior', roadName: 'M-601 km 12', hazardType: 'height_barrier', spotName: 'Puerto de Navacerrada' },
  { id: 'bar-mad-4', latitude: 40.7780, longitude: -3.9610, maxAllowedHeight: 2.20, description: 'Pórtico gálibo Parking Puerto de Cotos', roadName: 'SG-615 acceso mirador', hazardType: 'height_barrier', spotName: 'Puerto de Cotos' },

  // ========================================================
  // 2. PUENTES BAJOS, TÚNELES Y PASOS SUBTERRÁNEOS EN CALZADA
  // ========================================================
  // Madrid y Centro
  { id: 'haz-1', latitude: 40.4168, longitude: -3.7038, maxAllowedHeight: 2.80, description: 'Paso subterráneo gálibo 2.80m', roadName: 'M-30 enlace', hazardType: 'tunnel' },
  { id: 'haz-5', latitude: 40.4021, longitude: -3.6912, maxAllowedHeight: 2.70, description: 'Túnel urbano Atocha gálibo 2.70m', roadName: 'Paseo Infanta Isabel', hazardType: 'tunnel' },
  { id: 'haz-6', latitude: 40.4482, longitude: -3.7035, maxAllowedHeight: 2.90, description: 'Paso inferior Cuatro Caminos 2.90m', roadName: 'Bravo Murillo', hazardType: 'tunnel' },
  { id: 'haz-7', latitude: 40.3855, longitude: -3.7188, maxAllowedHeight: 2.85, description: 'Puente ferroviario gálibo 2.85m', roadName: 'Antonio López', hazardType: 'bridge' },
  { id: 'haz-22', latitude: 40.4090, longitude: -3.6820, maxAllowedHeight: 2.75, description: 'Paso bajo puente FFCC Méndez Álvaro', roadName: 'Calle Méndez Álvaro', hazardType: 'bridge' },
  { id: 'haz-23', latitude: 40.4350, longitude: -3.6780, maxAllowedHeight: 2.90, description: 'Paso inferior María de Molina / A-2', roadName: 'Túnel María de Molina', hazardType: 'tunnel' },

  // Cataluña y Nordeste
  { id: 'haz-2', latitude: 41.3851, longitude: 2.1734, maxAllowedHeight: 3.10, description: 'Puente ferroviario bajo 3.10m', roadName: 'Acceso Costero', hazardType: 'bridge' },
  { id: 'haz-8', latitude: 41.4012, longitude: 2.1985, maxAllowedHeight: 2.95, description: 'Paso inferior Glòries 2.95m', roadName: 'Gran Via Corts Catalanes', hazardType: 'tunnel' },
  { id: 'haz-9', latitude: 41.3411, longitude: 2.1023, maxAllowedHeight: 2.80, description: 'Puente FFCC Hospitalet 2.80m', roadName: 'Carretera del Mig', hazardType: 'bridge' },
  { id: 'haz-10', latitude: 41.5432, longitude: 2.4419, maxAllowedHeight: 2.75, description: 'Paso bajo vía N-II Mataró 2.75m', roadName: 'Paseo Marítimo N-II', hazardType: 'bridge' },
  { id: 'haz-24', latitude: 41.4420, longitude: 2.2150, maxAllowedHeight: 2.85, description: 'Paso bajo vía tren Badalona', roadName: 'Carrer d Eduard Maristany', hazardType: 'bridge' },
  { id: 'haz-25', latitude: 41.2350, longitude: 1.8080, maxAllowedHeight: 2.70, description: 'Paso subterráneo ferrocarril Sitges', roadName: 'Passeig de Vilanova', hazardType: 'bridge' },
  { id: 'haz-26', latitude: 41.9830, longitude: 2.8250, maxAllowedHeight: 2.90, description: 'Puente tren acceso Devesa Girona', roadName: 'Carrer del Riu Güell', hazardType: 'bridge' },

  // Andalucía y Sur
  { id: 'haz-3', latitude: 37.3891, longitude: -5.9845, maxAllowedHeight: 2.90, description: 'Arco monumental gálibo 2.90m', roadName: 'Centro Histórico', hazardType: 'historic_arch' },
  { id: 'haz-11', latitude: 36.7213, longitude: -4.4214, maxAllowedHeight: 2.85, description: 'Túnel alcazaba acceso puerto 2.85m', roadName: 'Paseo de los Curas', hazardType: 'tunnel' },
  { id: 'haz-12', latitude: 37.1773, longitude: -3.5986, maxAllowedHeight: 2.65, description: 'Arco histórico Albayzín gálibo 2.65m', roadName: 'Puerta Elvira', hazardType: 'historic_arch' },
  { id: 'haz-13', latitude: 36.5298, longitude: -6.2924, maxAllowedHeight: 2.90, description: 'Paso bajo muralla Puertas de Tierra 2.90m', roadName: 'Cuesta de las Calesas', hazardType: 'historic_arch' },
  { id: 'haz-27', latitude: 37.8850, longitude: -4.7790, maxAllowedHeight: 2.80, description: 'Paso bajo FFCC Medina Azahara Córdoba', roadName: 'Av. de América', hazardType: 'bridge' },
  { id: 'haz-28', latitude: 37.2610, longitude: -6.9450, maxAllowedHeight: 2.90, description: 'Paso inferior puente Renfe Huelva', roadName: 'Av. de Italia', hazardType: 'bridge' },

  // Galicia y Cantábrico
  { id: 'haz-4', latitude: 43.3619, longitude: -8.4116, maxAllowedHeight: 3.00, description: 'Túnel urbano limitado 3.00m', roadName: 'Ronda Norte', hazardType: 'tunnel' },
  { id: 'haz-14', latitude: 43.2630, longitude: -2.9350, maxAllowedHeight: 2.90, description: 'Paso inferior Deusto 2.90m', roadName: 'Avenida Lehendakari Aguirre', hazardType: 'tunnel' },
  { id: 'haz-15', latitude: 43.3215, longitude: -1.9856, maxAllowedHeight: 2.80, description: 'Paso ferroviario Gros 2.80m', roadName: 'Calle Zabaleta', hazardType: 'bridge' },
  { id: 'haz-16', latitude: 43.4623, longitude: -3.8099, maxAllowedHeight: 2.95, description: 'Túnel de Tetuán gálibo 2.95m', roadName: 'Paseo de Menéndez Pelayo', hazardType: 'tunnel' },
  { id: 'haz-29', latitude: 42.8800, longitude: -8.5450, maxAllowedHeight: 2.85, description: 'Paso bajo puente tren Santiago de Compostela', roadName: 'Rúa do Hórreo', hazardType: 'bridge' },
  { id: 'haz-30', latitude: 43.3680, longitude: -5.8450, maxAllowedHeight: 2.80, description: 'Paso inferior estación Llamaquique Oviedo', roadName: 'Calle Trece Rosas', hazardType: 'tunnel' },

  // Levante y Murcia
  { id: 'haz-17', latitude: 39.4699, longitude: -0.3763, maxAllowedHeight: 2.80, description: 'Paso inferior antiguo cauce Turia 2.80m', roadName: 'Puente de las Flores', hazardType: 'tunnel' },
  { id: 'haz-18', latitude: 38.3452, longitude: -0.4810, maxAllowedHeight: 2.90, description: 'Puente Renfe acceso Benalúa 2.90m', roadName: 'Avenida de Elche', hazardType: 'bridge' },
  { id: 'haz-19', latitude: 37.9922, longitude: -1.1307, maxAllowedHeight: 2.75, description: 'Paso bajo vía del tren Nonduermas 2.75m', roadName: 'Camino Hondo del Carril', hazardType: 'bridge' },
  { id: 'haz-31', latitude: 39.9860, longitude: -0.0510, maxAllowedHeight: 2.85, description: 'Paso subterráneo ferrocarril Castellón', roadName: 'Paseo Morella', hazardType: 'tunnel' },

  // Castilla, Aragón y Navarra
  { id: 'haz-20', latitude: 41.6488, longitude: -0.8891, maxAllowedHeight: 2.85, description: 'Paso inferior Goya 2.85m', roadName: 'Avenida Francisco de Goya', hazardType: 'tunnel' },
  { id: 'haz-21', latitude: 41.6523, longitude: -4.7245, maxAllowedHeight: 2.90, description: 'Túnel Arco de Ladrillo 2.90m', roadName: 'Paseo Arco de Ladrillo', hazardType: 'tunnel' },
  { id: 'haz-32', latitude: 42.8180, longitude: -1.6440, maxAllowedHeight: 2.95, description: 'Paso inferior Avenida Zaragoza Pamplona', roadName: 'Av. Zaragoza', hazardType: 'tunnel' },
  { id: 'haz-33', latitude: 42.4650, longitude: -2.4450, maxAllowedHeight: 2.80, description: 'Paso bajo puente Renfe Logroño', roadName: 'Calle Vara de Rey', hazardType: 'bridge' },
  { id: 'haz-34', latitude: 40.9650, longitude: -5.6630, maxAllowedHeight: 2.85, description: 'Paso inferior vías tren Salamanca', roadName: 'Paseo de la Estación', hazardType: 'bridge' },
];

export class ClearanceHazardService {
  /**
   * Obtiene todos los obstáculos registrados en el catálogo
   */
  public static getAllHazards(): ClearanceHazard[] {
    return SPAIN_CLEARANCE_HAZARDS;
  }

  /**
   * Comprueba si una ubicación o spot tiene una barrera de altura limitante para el vehículo
   */
  public static checkSpotHeightRestriction(
    spotLat: number,
    spotLng: number,
    vehicleHeightMeters: number,
    maxDistanceMeters: number = 250
  ): ClearanceHazard | null {
    for (const h of SPAIN_CLEARANCE_HAZARDS) {
      if (h.maxAllowedHeight < vehicleHeightMeters + 0.10) {
        const d = this.haversineDistance(
          { latitude: spotLat, longitude: spotLng },
          { latitude: h.latitude, longitude: h.longitude }
        );
        if (d <= maxDistanceMeters) {
          return h;
        }
      }
    }
    return null;
  }

  private static haversineDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(coord1.latitude)) *
        Math.cos(toRad(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export default ClearanceHazardService;
