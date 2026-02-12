#!/usr/bin/env node

/**
 * CamperSites Pro - Scraping Masivo de Europa
 * Obtiene campings, areas de autocaravanas, parkings y areas de descanso
 * de OpenStreetMap (Overpass API) para toda Europa.
 *
 * Ejecutar: npm run scrape:europe
 * Tiempo estimado: 30-60 minutos
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURACION
// ============================================
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const DELAY_BETWEEN_QUERIES = 4000;   // 4s entre consultas
const DELAY_BETWEEN_REGIONS = 6000;   // 6s entre regiones
const MAX_RETRIES = 3;
const RETRY_DELAY = 30000;            // 30s en caso de fallo
const QUERY_TIMEOUT = 120;            // timeout Overpass en segundos

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const PROGRESS_FILE = path.join(dataDir, 'scrape-progress.json');
const OUTPUT_FILE = path.join(dataDir, 'scraped-data.json');

// ============================================
// REGIONES DE EUROPA (17 bboxes)
// Formato: 'sur,oeste,norte,este'
// ============================================
const EUROPE_REGIONS = [
  { name: 'Peninsula Iberica', bbox: '36.0,-9.5,43.8,3.3' },
  { name: 'Portugal', bbox: '36.9,-9.5,42.2,-6.2' },
  { name: 'Francia Sur', bbox: '42.0,-1.8,46.0,7.8' },
  { name: 'Francia Norte', bbox: '46.0,-5.2,51.1,8.2' },
  { name: 'Italia Sur + Sicilia + Sardinia', bbox: '36.0,6.6,42.0,18.6' },
  { name: 'Italia Norte', bbox: '42.0,6.6,47.1,13.8' },
  { name: 'Alemania Sur', bbox: '47.2,5.8,51.0,15.1' },
  { name: 'Alemania Norte + Dinamarca', bbox: '51.0,5.8,57.8,15.1' },
  { name: 'Benelux', bbox: '49.4,2.5,53.6,7.2' },
  { name: 'Islas Britanicas', bbox: '49.9,-10.5,58.7,1.8' },
  { name: 'Escandinavia Sur', bbox: '55.3,4.5,63.0,18.5' },
  { name: 'Escandinavia Norte', bbox: '63.0,4.5,71.2,31.0' },
  { name: 'Austria + Suiza', bbox: '45.8,5.9,48.9,17.2' },
  { name: 'Europa del Este (PL, CZ, SK, HU)', bbox: '45.7,14.0,54.9,24.2' },
  { name: 'Balkanes', bbox: '38.0,13.4,46.2,29.7' },
  { name: 'Grecia + Creta', bbox: '34.8,19.3,41.8,29.7' },
  { name: 'Balticos + Finlandia', bbox: '53.9,20.9,70.1,31.6' },
];

// ============================================
// TIPOS DE CONSULTAS OVERPASS
// ============================================
function buildCampingQuery(bbox) {
  return `[out:json][timeout:${QUERY_TIMEOUT}];
(
  node["tourism"="camp_site"](${bbox});
  way["tourism"="camp_site"](${bbox});
  relation["tourism"="camp_site"](${bbox});
);
out center;`;
}

function buildCaravanQuery(bbox) {
  return `[out:json][timeout:${QUERY_TIMEOUT}];
(
  node["tourism"="caravan_site"](${bbox});
  way["tourism"="caravan_site"](${bbox});
  relation["tourism"="caravan_site"](${bbox});
);
out center;`;
}

function buildParkingQuery(bbox) {
  return `[out:json][timeout:${QUERY_TIMEOUT}];
(
  node["amenity"="parking"]["motorhome"="yes"](${bbox});
  way["amenity"="parking"]["motorhome"="yes"](${bbox});
  node["amenity"="parking"]["caravan"="yes"](${bbox});
  way["amenity"="parking"]["caravan"="yes"](${bbox});
  node["amenity"="parking"]["camping_car"="yes"](${bbox});
  way["amenity"="parking"]["camping_car"="yes"](${bbox});
  node["amenity"="parking"]["hgv"="yes"]["access"~"yes|permissive|customers"](${bbox});
  way["amenity"="parking"]["hgv"="yes"]["access"~"yes|permissive|customers"](${bbox});
);
out center;`;
}

function buildRestAreaQuery(bbox) {
  return `[out:json][timeout:${QUERY_TIMEOUT}];
(
  node["amenity"="rest_area"](${bbox});
  way["amenity"="rest_area"](${bbox});
  node["highway"="rest_area"](${bbox});
  way["highway"="rest_area"](${bbox});
);
out center;`;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parsePriceFromTags(tags) {
  const fee = tags.fee;
  if (fee === 'no') return 0;
  if (fee === 'yes' && tags.charge) {
    const match = tags.charge.match(/[\d.]+/);
    if (match) return parseFloat(match[0]);
  }
  return null;
}

function mapElement(el, category) {
  const tags = el.tags || {};
  const lat = el.lat || (el.center && el.center.lat);
  const lon = el.lon || (el.center && el.center.lon);

  if (!lat || !lon) return null;

  return {
    id: `osm-${el.id}`,
    name: tags.name || tags['name:en'] || tags['name:es'] || `${category} ${el.id}`,
    latitude: lat,
    longitude: lon,
    category: category,
    address: tags['addr:full'] || [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || '',
    city: tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '',
    province: tags['addr:province'] || tags['addr:state'] || tags['addr:county'] || '',
    hasWater: tags.drinking_water === 'yes' || tags.water_point === 'yes' || false,
    hasElectricity: tags.power_supply === 'yes' || tags.electricity === 'yes' || false,
    capacity: parseInt(tags.capacity) || null,
    price: parsePriceFromTags(tags),
    description: tags.description || tags['description:en'] || '',
    website: tags.website || tags['contact:website'] || tags.url || '',
    phone: tags.phone || tags['contact:phone'] || '',
  };
}

async function queryOverpass(query, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(OVERPASS_URL, query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 150000, // 2.5 minutos HTTP timeout
      });
      return response.data.elements || [];
    } catch (error) {
      const msg = error.response
        ? `HTTP ${error.response.status}: ${error.response.statusText}`
        : error.message;
      console.error(`    Intento ${attempt}/${retries} fallo: ${msg}`);
      if (attempt < retries) {
        const waitTime = RETRY_DELAY * attempt;
        console.log(`    Esperando ${waitTime / 1000}s antes de reintentar...`);
        await delay(waitTime);
      }
    }
  }
  return [];
}

function deduplicateLocations(locations) {
  const seen = new Map();
  for (const loc of locations) {
    if (!seen.has(loc.id)) {
      seen.set(loc.id, loc);
    }
  }
  return Array.from(seen.values());
}

// ============================================
// PROGRESO (resume si falla)
// ============================================
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      return data;
    } catch {
      return { completedRegions: [], locations: [] };
    }
  }
  return { completedRegions: [], locations: [] };
}

function saveProgress(completedRegions, locations) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
    completedRegions,
    locationCount: locations.length,
    timestamp: new Date().toISOString(),
  }));
  // Guardar datos parciales
  fs.writeFileSync(
    path.join(dataDir, 'scraped-data-partial.json'),
    JSON.stringify({ locations }, null, 2)
  );
}

// ============================================
// SCRAPING POR REGION
// ============================================
async function scrapeRegion(region) {
  const results = [];
  const queries = [
    { name: 'Campings', query: buildCampingQuery(region.bbox), category: 'CAMPING' },
    { name: 'Caravanas', query: buildCaravanQuery(region.bbox), category: 'CARAVAN_SITE' },
    { name: 'Parkings', query: buildParkingQuery(region.bbox), category: 'PARKING_PERMITIDO' },
    { name: 'Areas descanso', query: buildRestAreaQuery(region.bbox), category: 'AREA_DESCANSO' },
  ];

  for (const q of queries) {
    process.stdout.write(`  ${q.name}...`);
    const elements = await queryOverpass(q.query);
    const mapped = elements.map(el => mapElement(el, q.category)).filter(Boolean);
    results.push(...mapped);
    console.log(` ${mapped.length}`);
    await delay(DELAY_BETWEEN_QUERIES);
  }

  return results;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('=================================================');
  console.log('  CamperSites Pro - Scraping Masivo Europa');
  console.log('  Regiones: ' + EUROPE_REGIONS.length);
  console.log('  Consultas por region: 4');
  console.log('  Tiempo estimado: 30-60 minutos');
  console.log('=================================================\n');

  const progress = loadProgress();
  let allLocations = [];

  // Cargar datos parciales si existen
  const partialFile = path.join(dataDir, 'scraped-data-partial.json');
  if (progress.completedRegions.length > 0 && fs.existsSync(partialFile)) {
    try {
      const partial = JSON.parse(fs.readFileSync(partialFile, 'utf-8'));
      allLocations = partial.locations || [];
      console.log(`Resumiendo: ${progress.completedRegions.length} regiones completadas, ${allLocations.length} ubicaciones\n`);
    } catch {
      allLocations = [];
    }
  }

  let regionIndex = 0;
  for (const region of EUROPE_REGIONS) {
    regionIndex++;

    if (progress.completedRegions.includes(region.name)) {
      console.log(`[${regionIndex}/${EUROPE_REGIONS.length}] ${region.name} - SALTADA (ya completada)`);
      continue;
    }

    console.log(`\n[${regionIndex}/${EUROPE_REGIONS.length}] ${region.name}`);
    console.log(`  Bbox: ${region.bbox}`);

    const regionResults = await scrapeRegion(region);
    allLocations.push(...regionResults);

    const subtotal = regionResults.length;
    console.log(`  Subtotal region: ${subtotal} ubicaciones`);
    console.log(`  Total acumulado: ${allLocations.length}`);

    progress.completedRegions.push(region.name);
    saveProgress(progress.completedRegions, allLocations);

    if (regionIndex < EUROPE_REGIONS.length) {
      await delay(DELAY_BETWEEN_REGIONS);
    }
  }

  // Deduplicar
  console.log(`\nDeduplicando ${allLocations.length} ubicaciones...`);
  const unique = deduplicateLocations(allLocations);
  console.log(`Ubicaciones unicas: ${unique.length} (${allLocations.length - unique.length} duplicados eliminados)`);

  // Estadisticas por categoria
  const stats = {
    totalLocations: unique.length,
    campings: unique.filter(l => l.category === 'CAMPING').length,
    caravanSites: unique.filter(l => l.category === 'CARAVAN_SITE').length,
    parkings: unique.filter(l => l.category === 'PARKING_PERMITIDO').length,
    restAreas: unique.filter(l => l.category === 'AREA_DESCANSO').length,
  };

  // Guardar resultado final
  const output = {
    locations: unique,
    radars: [], // Los radares se gestionan con scrape-radares-oficiales.js
    stats: stats,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  // Limpiar archivos de progreso
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
  if (fs.existsSync(partialFile)) fs.unlinkSync(partialFile);

  console.log('\n=================================================');
  console.log('  SCRAPING COMPLETADO');
  console.log('=================================================');
  console.log(`  Campings:          ${stats.campings}`);
  console.log(`  Areas caravanas:   ${stats.caravanSites}`);
  console.log(`  Parkings:          ${stats.parkings}`);
  console.log(`  Areas descanso:    ${stats.restAreas}`);
  console.log(`  TOTAL:             ${stats.totalLocations}`);
  console.log(`\n  Guardado en: ${OUTPUT_FILE}`);
  console.log('=================================================\n');
}

main().catch(err => {
  console.error('\nError fatal:', err);
  process.exit(1);
});
