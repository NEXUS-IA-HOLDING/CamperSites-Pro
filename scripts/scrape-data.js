#!/usr/bin/env node

/**
 * Script de Scraping DGT + OSM
 * Ejecutar: npm run scrape
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Crear directorio data si no existe
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('🚀 Iniciando scraping de datos...\n');

// ⭐ SCRAPING OPENSTREETMAP
async function scrapOSMCampings() {
  console.log('🏕️  Obteniendo campings de OpenStreetMap...');
  
  const spain = '36.0,-9.3,43.8,3.3'; // bbox España
  
  const query = `
    [out:json][timeout:90];
    (
      node["tourism"="camp_site"](${spain});
      way["tourism"="camp_site"](${spain});
      relation["tourism"="camp_site"](${spain});
    );
    out center;
  `;

  try {
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      query,
      { 
        headers: { 'Content-Type': 'text/plain' },
        timeout: 120000 
      }
    );

    const locations = response.data.elements.map(el => {
      const tags = el.tags || {};
      const lat = el.lat || (el.center && el.center.lat);
      const lon = el.lon || (el.center && el.center.lon);

      return {
        id: `osm-${el.id}`,
        name: tags.name || `Camping ${el.id}`,
        latitude: lat,
        longitude: lon,
        category: 'CAMPING',
        address: tags['addr:full'] || tags['addr:street'] || '',
        city: tags['addr:city'] || '',
        province: tags['addr:province'] || '',
        hasWater: tags.water_point === 'yes' || tags.drinking_water === 'yes',
        hasElectricity: tags.power_supply === 'yes' || tags.electricity === 'yes',
        capacity: parseInt(tags.capacity) || null,
        price: parsePriceFromTags(tags),
        description: tags.description || '',
        website: tags.website || tags.contact_website || '',
        phone: tags.phone || tags.contact_phone || '',
      };
    }).filter(loc => loc.latitude && loc.longitude);

    console.log(`✅ ${locations.length} campings obtenidos`);
    return locations;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

async function scrapOSMParking() {
  console.log('🅿️  Obteniendo parkings de OpenStreetMap...');
  
  const spain = '36.0,-9.3,43.8,3.3';
  
  const query = `
    [out:json][timeout:90];
    (
      node["amenity"="parking"]["access"~"yes|permissive|customers"]["hgv"="yes"](${spain});
      way["amenity"="parking"]["access"~"yes|permissive|customers"]["hgv"="yes"](${spain});
    );
    out center;
  `;

  try {
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      query,
      { 
        headers: { 'Content-Type': 'text/plain' },
        timeout: 120000 
      }
    );

    const parkings = response.data.elements.map(el => {
      const tags = el.tags || {};
      const lat = el.lat || (el.center && el.center.lat);
      const lon = el.lon || (el.center && el.center.lon);

      return {
        id: `parking-${el.id}`,
        name: tags.name || `Parking ${el.id}`,
        latitude: lat,
        longitude: lon,
        category: 'PARKING_PERMITIDO',
        address: tags['addr:full'] || '',
        city: tags['addr:city'] || '',
        capacity: parseInt(tags.capacity) || null,
        price: parsePriceFromTags(tags),
      };
    }).filter(loc => loc.latitude && loc.longitude);

    console.log(`✅ ${parkings.length} parkings obtenidos`);
    return parkings;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

// ⭐ RADARES DGT
async function scrapDGTRadars() {
  console.log('📡 Obteniendo radares DGT...');
  
  // Datos de muestra mientras configuramos scraping real
  const radars = [
    {
      id: 'dgt-mad-001',
      code: 'MAD-001',
      type: 'RADAR',
      latitude: 40.4168,
      longitude: -3.7038,
      speedLimit: 90,
      road: 'M-30',
      km: '12.5',
      direction: 'Ambos sentidos',
      province: 'Madrid',
      verified: true,
      lastVerified: new Date().toISOString(),
    },
    // Añadir más radares reales aquí
  ];

  console.log(`✅ ${radars.length} radares cargados`);
  return radars;
}

function parsePriceFromTags(tags) {
  const fee = tags.fee;
  if (fee === 'no') return 0;
  if (fee === 'yes' && tags.charge) {
    const match = tags.charge.match(/\d+/);
    if (match) return parseInt(match[0]);
  }
  return null;
}

// ⭐ EJECUTAR TODO
async function main() {
  try {
    // Obtener todos los datos
    const [campings, parkings, radars] = await Promise.all([
      scrapOSMCampings(),
      scrapOSMParking(),
      scrapDGTRadars(),
    ]);

    const allLocations = [...campings, ...parkings];

    // Guardar en archivo JSON
    const output = {
      locations: allLocations,
      radars: radars,
      stats: {
        totalLocations: allLocations.length,
        campings: campings.length,
        parkings: parkings.length,
        radars: radars.length,
      },
      lastUpdated: new Date().toISOString(),
    };

    const outputPath = path.join(dataDir, 'scraped-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log('\n✅ SCRAPING COMPLETADO\n');
    console.log('📊 Estadísticas:');
    console.log(`   Campings: ${campings.length}`);
    console.log(`   Parkings: ${parkings.length}`);
    console.log(`   Radares: ${radars.length}`);
    console.log(`   Total ubicaciones: ${allLocations.length}`);
    console.log(`\n💾 Guardado en: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ Error en scraping:', error);
    process.exit(1);
  }
}

main();
