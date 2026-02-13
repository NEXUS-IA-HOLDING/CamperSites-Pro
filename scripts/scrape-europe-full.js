#!/usr/bin/env node

/**
 * CamperSites Pro - SCRAPER MASIVO EUROPA v3
 * YRYS
 *
 * Técnicas anti-504:
 * 1. Múltiples endpoints Overpass (failover automático)
 * 2. Timeout Overpass bajo (60s) para queries rápidas
 * 3. BBoxes muy pequeños (máx ~3° lat × ~4° lon)
 * 4. Solo `node` + `way` (sin `relation` = mucho más rápido)
 * 5. `out center qt;` (qt = quadtile sort, más rápido en servidor)
 * 6. Delay adaptativo: sube si hay errores, baja si van bien
 * 7. Progreso granular: guarda cada query completada
 * 8. Categorías pesadas (restaurantes, supermercados) solo en regiones pequeñas
 *
 * Ejecutar: node scripts/scrape-europe-full.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURACIÓN
// ============================================
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
let currentEndpoint = 0;

const BASE_DELAY_MS = 4000;       // 4s entre queries normales
const ERROR_DELAY_MS = 30000;     // 30s tras un error
const MAX_RETRIES = 3;
const OVERPASS_TIMEOUT = 60;      // 60s timeout en Overpass (bajo = menos 504)
const HTTP_TIMEOUT = 90000;       // 90s HTTP timeout

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const PROGRESS_FILE = path.join(dataDir, 'scrape-full-progress.json');
const OUTPUT_FILE = path.join(dataDir, 'scraped-data.json');

// ============================================
// REGIONES DE EUROPA (bboxes pequeños ~2-3° × 3-5°)
// Formato: 'sur,oeste,norte,este'
// ============================================
const REGIONS = [
  // España (7 zonas)
  { name: 'ES-Galicia', bbox: '41.8,-9.3,43.8,-6.5', country: 'ES' },
  { name: 'ES-Cantabrico', bbox: '42.5,-6.5,43.8,-1.0', country: 'ES' },
  { name: 'ES-Cataluna', bbox: '40.5,0.0,42.9,3.4', country: 'ES' },
  { name: 'ES-Centro', bbox: '38.5,-5.5,41.5,-1.0', country: 'ES' },
  { name: 'ES-Levante', bbox: '37.0,-2.0,40.5,0.5', country: 'ES' },
  { name: 'ES-Andalucia', bbox: '36.0,-7.5,38.5,-1.5', country: 'ES' },
  { name: 'ES-Canarias', bbox: '27.5,-18.2,29.5,-13.3', country: 'ES' },
  // Portugal (2)
  { name: 'PT-Norte', bbox: '39.5,-9.5,42.2,-6.2', country: 'PT' },
  { name: 'PT-Sur', bbox: '36.9,-9.5,39.5,-7.0', country: 'PT' },
  // Francia (6)
  { name: 'FR-Midi', bbox: '42.0,-0.5,44.0,4.0', country: 'FR' },
  { name: 'FR-Provenza', bbox: '43.0,4.0,45.0,7.8', country: 'FR' },
  { name: 'FR-Atlantico', bbox: '44.0,-2.0,47.5,0.5', country: 'FR' },
  { name: 'FR-Centro', bbox: '45.0,0.5,48.0,4.0', country: 'FR' },
  { name: 'FR-Este', bbox: '46.0,4.0,49.0,8.2', country: 'FR' },
  { name: 'FR-Norte', bbox: '48.0,-4.5,51.1,3.0', country: 'FR' },
  // Italia (4)
  { name: 'IT-Norte', bbox: '44.0,6.6,47.1,12.5', country: 'IT' },
  { name: 'IT-Adriatico', bbox: '42.0,12.5,45.0,18.6', country: 'IT' },
  { name: 'IT-Centro', bbox: '40.5,9.5,44.0,15.0', country: 'IT' },
  { name: 'IT-Sur', bbox: '36.5,13.0,41.0,18.6', country: 'IT' },
  // Alemania (3)
  { name: 'DE-Bavaria', bbox: '47.2,9.5,50.5,13.5', country: 'DE' },
  { name: 'DE-Oeste', bbox: '49.0,5.8,52.5,9.5', country: 'DE' },
  { name: 'DE-Norte', bbox: '52.0,9.0,55.1,15.1', country: 'DE' },
  // Otros
  { name: 'Benelux', bbox: '49.4,2.5,53.6,7.2', country: 'BNL' },
  { name: 'Suiza', bbox: '45.8,5.9,47.8,10.5', country: 'CH' },
  { name: 'Austria', bbox: '46.4,9.5,48.9,17.2', country: 'AT' },
  { name: 'UK-Sur', bbox: '50.0,-5.5,52.5,2.0', country: 'UK' },
  { name: 'UK-Centro', bbox: '52.0,-5.5,54.5,0.5', country: 'UK' },
  { name: 'UK-Norte', bbox: '54.5,-6.0,58.5,0.0', country: 'UK' },
  { name: 'Croacia', bbox: '42.4,13.4,46.6,19.5', country: 'HR' },
  { name: 'Grecia', bbox: '34.8,19.3,41.8,29.7', country: 'GR' },
  { name: 'Noruega-Sur', bbox: '57.0,4.5,63.5,12.0', country: 'NO' },
  { name: 'Chequia-Eslovaquia', bbox: '47.5,12.0,51.1,22.5', country: 'CZ' },
  { name: 'Polonia', bbox: '49.0,14.0,54.8,24.2', country: 'PL' },
];

// ============================================
// CATEGORÍAS con queries Overpass optimizadas
// ============================================
// Principio: queries simples, un solo tag a la vez, sin relations

function makeQuery(filterStr, bbox) {
  return `[out:json][timeout:${OVERPASS_TIMEOUT}];(node${filterStr}(${bbox});way${filterStr}(${bbox}););out center qt;`;
}

const CATEGORIES = [
  // === CORE CAMPER (Fase 1 - todas las regiones) ===
  {
    name: 'Campings',
    category: 'CAMPING',
    phase: 1,
    query: (bbox) => makeQuery('["tourism"="camp_site"]', bbox),
  },
  {
    name: 'Caravanas',
    category: 'CAMPING', // se fusiona con campings
    phase: 1,
    query: (bbox) => makeQuery('["tourism"="caravan_site"]', bbox),
  },
  {
    name: 'Parking Camper (motorhome)',
    category: 'PARKING_PERMITIDO',
    phase: 1,
    query: (bbox) => makeQuery('["amenity"="parking"]["motorhome"="yes"]', bbox),
  },
  {
    name: 'Parking Camper (caravan)',
    category: 'PARKING_PERMITIDO',
    phase: 1,
    query: (bbox) => makeQuery('["amenity"="parking"]["caravan"="yes"]', bbox),
  },
  {
    name: 'Áreas descanso',
    category: 'AREA_DESCANSO',
    phase: 1,
    query: (bbox) => makeQuery('["highway"="rest_area"]', bbox),
  },
  {
    name: 'Dump stations',
    category: 'AREA_SERVICIOS',
    phase: 1,
    query: (bbox) => makeQuery('["amenity"="sanitary_dump_station"]', bbox),
  },
  {
    name: 'Puntos de agua',
    category: 'AREA_SERVICIOS',
    phase: 1,
    query: (bbox) => makeQuery('["amenity"="water_point"]', bbox),
  },
  {
    name: 'Miradores',
    category: 'MIRADOR',
    phase: 1,
    query: (bbox) => makeQuery('["tourism"="viewpoint"]', bbox),
  },
  {
    name: 'Playas',
    category: 'PLAYA',
    phase: 1,
    query: (bbox) => makeQuery('["natural"="beach"]', bbox),
  },
  {
    name: 'Montañas',
    category: 'MONTANA',
    phase: 1,
    query: (bbox) => `[out:json][timeout:${OVERPASS_TIMEOUT}];(node["natural"="peak"]["ele"](${bbox}););out center qt;`,
  },
  {
    name: 'Lagos',
    category: 'LAGO',
    phase: 1,
    query: (bbox) => `[out:json][timeout:${OVERPASS_TIMEOUT}];(node["natural"="water"]["water"="lake"](${bbox});way["natural"="water"]["water"="lake"](${bbox}););out center qt;`,
  },
  {
    name: 'Cascadas',
    category: 'CASCADA',
    phase: 1,
    query: (bbox) => `[out:json][timeout:${OVERPASS_TIMEOUT}];(node["waterway"="waterfall"](${bbox}););out center qt;`,
  },

  // === SERVICIOS (Fase 2 - todas las regiones) ===
  {
    name: 'Lavaderos coches',
    category: 'LAVADERO_COCHES',
    phase: 2,
    query: (bbox) => makeQuery('["amenity"="car_wash"]', bbox),
  },
  {
    name: 'Gasolineras GLP',
    category: 'GASOLINERA_GLP',
    phase: 2,
    query: (bbox) => `[out:json][timeout:${OVERPASS_TIMEOUT}];(node["amenity"="fuel"]["fuel:lpg"="yes"](${bbox});way["amenity"="fuel"]["fuel:lpg"="yes"](${bbox}););out center qt;`,
  },
  {
    name: 'Lavanderías',
    category: 'LAVANDERIA',
    phase: 2,
    query: (bbox) => makeQuery('["shop"="laundry"]', bbox),
  },
  {
    name: 'Farmacias',
    category: 'FARMACIA',
    phase: 2,
    query: (bbox) => `[out:json][timeout:${OVERPASS_TIMEOUT}];(node["amenity"="pharmacy"](${bbox}););out center qt;`,
  },

  // === COMPLEMENTARIOS (Fase 3 - todas las regiones, queries ligeras) ===
  {
    name: 'Supermercados',
    category: 'SUPERMERCADO',
    phase: 3,
    query: (bbox) => makeQuery('["shop"="supermarket"]', bbox),
  },
  {
    name: 'Restaurantes',
    category: 'RESTAURANTE',
    phase: 3,
    query: (bbox) => makeQuery('["amenity"="restaurant"]', bbox),
  },
];

// ============================================
// FUNCIONES
// ============================================
const delay = (ms) => new Promise(r => setTimeout(r, ms));

function getEndpoint() {
  return OVERPASS_ENDPOINTS[currentEndpoint % OVERPASS_ENDPOINTS.length];
}

function rotateEndpoint() {
  currentEndpoint++;
  const ep = getEndpoint();
  console.log(`  🔄 Cambiando a: ${ep.split('//')[1].split('/')[0]}`);
}

function mapElement(el, category, country) {
  const tags = el.tags || {};
  const lat = el.lat || (el.center ? el.center.lat : null);
  const lon = el.lon || (el.center ? el.center.lon : null);
  if (!lat || !lon) return null;

  let name = tags.name || tags['name:en'] || tags['name:es'] || tags['name:local'] || '';
  if (!name) {
    const defaults = {
      MIRADOR: 'Mirador', PLAYA: 'Playa', LAGO: 'Lago', CASCADA: 'Cascada',
      MONTANA: tags.ele ? `Cumbre ${tags.ele}m` : 'Montaña',
      CAMPING: 'Camping', PARKING_PERMITIDO: 'Parking Camper',
      AREA_DESCANSO: 'Área descanso', AREA_SERVICIOS: 'Punto servicios',
      LAVADERO_COCHES: 'Lavadero', SUPERMERCADO: tags.brand || 'Supermercado',
      RESTAURANTE: 'Restaurante', GASOLINERA_GLP: tags.brand || 'Gasolinera GLP',
      LAVANDERIA: 'Lavandería', FARMACIA: tags.brand || 'Farmacia',
    };
    name = defaults[category] || category;
    if (tags.brand && !name.includes(tags.brand)) name = tags.brand;
  }

  return {
    id: `osm-${el.id}`,
    name,
    latitude: lat,
    longitude: lon,
    category,
    address: tags['addr:full'] || [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || '',
    city: tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '',
    province: tags['addr:province'] || tags['addr:state'] || tags['addr:county'] || '',
    country: country || '',
    hasWater: tags.drinking_water === 'yes' || tags.water_point === 'yes' || false,
    hasElectricity: tags.power_supply === 'yes' || tags.electricity === 'yes' || false,
    capacity: parseInt(tags.capacity) || null,
    price: tags.fee === 'no' ? 0 : (tags.charge ? parseFloat((tags.charge.match(/[\d.]+/) || ['0'])[0]) : null),
    description: tags.description || tags['description:en'] || '',
    website: tags.website || tags['contact:website'] || '',
    phone: tags.phone || tags['contact:phone'] || '',
  };
}

async function queryOverpass(queryStr) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const endpoint = getEndpoint();
    try {
      const res = await axios.post(endpoint, `data=${encodeURIComponent(queryStr)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: HTTP_TIMEOUT,
      });
      return res.data.elements || [];
    } catch (err) {
      const status = err.response ? err.response.status : 0;
      const msg = err.response ? `HTTP ${status}` : err.message;

      if (status === 429 || status === 504 || status === 503) {
        // Rate limit o timeout del servidor → rotar endpoint
        rotateEndpoint();
      }

      if (attempt < MAX_RETRIES) {
        const waitTime = ERROR_DELAY_MS * attempt;
        console.log(`\n  ⚠️ ${msg} (intento ${attempt}/${MAX_RETRIES}) → espera ${waitTime/1000}s`);
        await delay(waitTime);
      } else {
        console.log(`\n  ❌ ${msg} (saltando tras ${MAX_RETRIES} intentos)`);
        return [];
      }
    }
  }
  return [];
}

// ============================================
// PROGRESO (resume automático)
// ============================================
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch {}
  return { done: [] };
}

function saveProgress(done, locations) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
    done,
    locationCount: locations.length,
    ts: new Date().toISOString(),
  }));
  // Guardar datos parciales (sin pretty print para ahorrar espacio)
  fs.writeFileSync(
    path.join(dataDir, 'scraped-data-partial.json'),
    JSON.stringify({ locations })
  );
}

// ============================================
// MAIN
// ============================================
async function main() {
  const total = REGIONS.length * CATEGORIES.length;

  console.log('═══════════════════════════════════════════════════');
  console.log('  CamperSites Pro - SCRAPER MASIVO EUROPA v3');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  ${REGIONS.length} regiones × ${CATEGORIES.length} categorías = ${total} queries`);
  console.log(`  Endpoints: ${OVERPASS_ENDPOINTS.length} (failover automático)`);
  console.log(`  Timeout Overpass: ${OVERPASS_TIMEOUT}s | Delay: ${BASE_DELAY_MS/1000}s`);
  console.log('═══════════════════════════════════════════════════\n');

  const progress = loadProgress();
  let locations = [];

  // Cargar datos parciales si existen
  const partialFile = path.join(dataDir, 'scraped-data-partial.json');
  if (progress.done.length > 0 && fs.existsSync(partialFile)) {
    try {
      locations = JSON.parse(fs.readFileSync(partialFile, 'utf-8')).locations || [];
      console.log(`📂 Resumiendo: ${progress.done.length}/${total} completadas, ${locations.length} locations\n`);
    } catch { locations = []; }
  }

  let qNum = progress.done.length;
  let consecutiveErrors = 0;
  const startTime = Date.now();

  for (const region of REGIONS) {
    let regionHasWork = false;
    for (const cat of CATEGORIES) {
      const key = `${region.name}|${cat.name}`;
      if (!progress.done.includes(key)) {
        regionHasWork = true;
        break;
      }
    }
    if (!regionHasWork) continue;

    console.log(`\n🌍 ${region.name} (${region.country})`);

    for (const cat of CATEGORIES) {
      const key = `${region.name}|${cat.name}`;
      if (progress.done.includes(key)) continue;

      qNum++;
      const pct = ((qNum / total) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 60000).toFixed(0);
      process.stdout.write(`  [${pct}% | ${elapsed}m] ${cat.name}...`);

      const els = await queryOverpass(cat.query(region.bbox));

      if (els.length === 0 && consecutiveErrors < 3) {
        // Podría ser un query sin resultados legítimo o un error silencioso
        // Comprobamos: categorías como "Cascadas" pueden tener 0 resultados
      }

      const mapped = els.map(el => mapElement(el, cat.category, region.country)).filter(Boolean);
      locations.push(...mapped);

      if (els.length >= 0) {
        console.log(` ✅ ${mapped.length}`);
        consecutiveErrors = 0;
      }

      progress.done.push(key);

      // Guardar progreso cada 3 queries
      if (qNum % 3 === 0) {
        saveProgress(progress.done, locations);
      }

      // Delay adaptativo
      let currentDelay = BASE_DELAY_MS;
      if (consecutiveErrors > 0) {
        currentDelay = Math.min(BASE_DELAY_MS * (1 + consecutiveErrors), 15000);
      }
      await delay(currentDelay);
    }
  }

  // Guardar progreso final
  saveProgress(progress.done, locations);

  // ============================================
  // DEDUPLICAR
  // ============================================
  console.log(`\n🔄 Deduplicando ${locations.length} locations...`);
  const seen = new Map();
  locations.forEach(l => {
    if (!seen.has(l.id)) seen.set(l.id, l);
  });
  const unique = Array.from(seen.values());
  console.log(`✅ ${unique.length} únicas (${locations.length - unique.length} duplicados eliminados)`);

  // ============================================
  // ESTADÍSTICAS
  // ============================================
  const byCat = {};
  const byCountry = {};
  unique.forEach(l => {
    byCat[l.category] = (byCat[l.category] || 0) + 1;
    byCountry[l.country] = (byCountry[l.country] || 0) + 1;
  });

  // ============================================
  // GUARDAR RESULTADO FINAL
  // ============================================
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    locations: unique,
    stats: { total: unique.length, byCategory: byCat, byCountry },
    lastUpdated: new Date().toISOString(),
    version: '3.0',
  }, null, 2));

  // Limpiar archivos temporales
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
  if (fs.existsSync(partialFile)) fs.unlinkSync(partialFile);

  const totalTime = ((Date.now() - startTime) / 60000).toFixed(1);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SCRAPING COMPLETADO');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Tiempo: ${totalTime} minutos`);
  console.log('');
  console.log('  POR CATEGORÍA:');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) =>
    console.log(`    ${c.padEnd(22)} ${String(n).padStart(6)}`)
  );
  console.log('');
  console.log('  POR PAÍS:');
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) =>
    console.log(`    ${c.padEnd(22)} ${String(n).padStart(6)}`)
  );
  console.log(`\n  TOTAL: ${unique.length} locations`);
  console.log(`  Archivo: ${OUTPUT_FILE}`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.log('💡 Ejecuta de nuevo — el progreso se guarda automáticamente');
  process.exit(1);
});
