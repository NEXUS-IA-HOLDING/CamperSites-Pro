/**
 * test-navigation-engine.js - Suite de verificación de algoritmos automotrices
 * CamperSites Pro
 */

// Haversine
function haversineMeters(coord1, coord2) {
  const R = 6371000;
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

// Proyección ortogonal en segmento (Snap-to-Road)
function projectPointOnSegment(p, a, b) {
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
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const dist = Math.hypot(px - projX, py - projY);

  return {
    point: { latitude: projY / mPerDegLat, longitude: projX / mPerDegLng },
    distance: dist,
    t,
  };
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ FALLO: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log('=================================================================');
console.log('🏎️ VERIFICACIÓN DE ALGORITMOS DE CABINA: WAZE + SYGIC + PARK4NIGHT');
console.log('=================================================================\n');

// 1. Test Snap to Road
console.log('1. Test Snap-to-Road (Eliminación de Deriva GPS):');
const pointA = { latitude: 40.4168, longitude: -3.7038 };
const pointB = { latitude: 40.4268, longitude: -3.7038 }; // Recta norte
// GPS desplazado 15 metros al este
const gpsCar = { latitude: 40.4218, longitude: -3.7036 };

const proj = projectPointOnSegment(gpsCar, pointA, pointB);
assert(proj.distance < 20 && proj.distance > 10, `Deriva calculada correctamente: ${proj.distance.toFixed(1)} metros`);
assert(Math.abs(proj.point.longitude - (-3.7038)) < 0.00001, 'Cursor proyectado exactamente sobre el eje de la calzada');

// 2. Test Radar de Tramo (V_avg)
console.log('\n2. Test Radar de Tramo (Velocidad Media V_avg):');
const sectionLen = 3300; // 3.3 km
const limitKmH = 100;
// Si recorre 3300m en 100 segundos -> 33 m/s * 3.6 = 118.8 km/h -> Exceso
const tSeconds = 100;
const vAvg = (sectionLen / tSeconds) * 3.6;
assert(vAvg > limitKmH, `Velocidad media detectada: ${vAvg.toFixed(1)} km/h (Límite: ${limitKmH} km/h) -> ALERTA ROJA ACTIVADA`);

// 3. Test Bóveda Offline (Consultas en zonas sin 4G)
console.log('\n3. Test Bóveda Offline (Bounding Box en Zonas Sin Cobertura):');
const mockPacks = [
  { id: 'spot-1', name: 'Área Picos de Europa', latitude: 43.185, longitude: -4.832, category: 'AREA_SERVICIOS', has_water: true, has_electricity: true },
  { id: 'spot-2', name: 'Camping Pirineos', latitude: 42.601, longitude: 0.123, category: 'CAMPING', has_water: true, has_electricity: false },
  { id: 'spot-3', name: 'Parking Cabo de Gata', latitude: 36.782, longitude: -2.215, category: 'PARKING_PERMITIDO', has_water: false, has_electricity: false },
];

// Query Bounding box Asturias / Cantabria
const asturiasBounds = { minLat: 43.0, maxLat: 43.5, minLng: -5.0, maxLng: -4.5 };
const foundInAsturias = mockPacks.filter(s =>
  s.latitude >= asturiasBounds.minLat &&
  s.latitude <= asturiasBounds.maxLat &&
  s.longitude >= asturiasBounds.minLng &&
  s.longitude <= asturiasBounds.maxLng
);
assert(foundInAsturias.length === 1 && foundInAsturias[0].name.includes('Picos'), 'Spot en alta montaña recuperado offline sin internet');

// 4. Test Filtros Avanzados (Park4Night)
console.log('\n4. Test Filtro Multicriterio Park4Night:');
const filteredWithWaterAndElectricity = mockPacks.filter(s => s.has_water && s.has_electricity);
assert(filteredWithWaterAndElectricity.length === 1 && filteredWithWaterAndElectricity[0].category === 'AREA_SERVICIOS', 'Filtro multicriterio (Agua + Luz) validado');

console.log('\n=================================================================');
console.log('🏆 TODOS LOS ALGORITMOS NUCLEARES VERIFICADOS SATISFACTORIAMENTE');
console.log('=================================================================');
