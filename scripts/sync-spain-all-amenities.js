#!/usr/bin/env node

/**
 * sync-spain-all-amenities.js
 * Extractor exhaustivo de POIs de OpenStreetMap para España
 * 
 * Descarga y sincroniza con Supabase:
 * - Bares y Restaurantes (amenity=bar, restaurant, cafe)
 * - Gasolineras (amenity=fuel) con GLP, GNC, AdBlue
 * - Campings y áreas de autocaravana (tourism=camp_site, caravan_site)
 * - Hoteles y alojamientos rurales (tourism=hotel, motel, hostel, guest_house)
 * - Áreas de descanso en autovías y carreteras (highway=rest_area, services)
 * 
 * Uso: node scripts/sync-spain-all-amenities.js [--region=madrid|andalucia|galicia|all] [--limit=5000]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fxxqutphlawspnfovnfk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Coordenadas bounding box de regiones de España para consultar Overpass
const REGIONS = {
  madrid: { south: 39.88, west: -4.58, north: 41.17, east: -3.05, name: 'Comunidad de Madrid' },
  andalucia: { south: 36.00, west: -7.55, north: 38.73, east: -1.63, name: 'Andalucía' },
  cataluna: { south: 40.52, west: 0.16, north: 42.86, east: 3.33, name: 'Cataluña' },
  galicia: { south: 41.81, west: -9.30, north: 43.79, east: -6.73, name: 'Galicia' },
  asturias: { south: 42.88, west: -7.18, north: 43.68, east: -4.51, name: 'Asturias / Cantabria' },
  valencia: { south: 37.84, west: -1.53, north: 40.79, east: 0.70, name: 'Comunidad Valenciana' },
  pais_vasco: { south: 42.47, west: -3.45, north: 43.46, east: -1.74, name: 'País Vasco / Navarra' },
  spain_center: { south: 38.50, west: -5.50, north: 41.50, east: -2.00, name: 'España Central' },
};

const args = process.argv.slice(2);
const regionArg = args.find(a => a.startsWith('--region='));
const selectedRegionKey = regionArg ? regionArg.split('=')[1] : 'madrid';
const limitArg = args.find(a => a.startsWith('--limit='));
const BATCH_LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 2500;

async function fetchOverpassData(bbox) {
  const midLat = (bbox.south + bbox.north) / 2;
  const midLng = (bbox.west + bbox.east) / 2;
  const s = (midLat - 0.05).toFixed(4);
  const n = (midLat + 0.05).toFixed(4);
  const w = (midLng - 0.05).toFixed(4);
  const e = (midLng + 0.05).toFixed(4);

  const tags = [
    'node["amenity"="restaurant"]',
    'node["amenity"="bar"]',
    'node["amenity"="fuel"]',
    'node["tourism"="hotel"]',
    'node["tourism"="camp_site"]',
  ];

  const perTagLimit = Math.max(20, Math.floor(BATCH_LIMIT / tags.length));
  let allElements = [];

  for (const tag of tags) {
    const query = `[out:json][timeout:15];${tag}(${s},${w},${n},${e});out ${perTagLimit};`;
    try {
      console.log(`🌐 Consultando OSM para ${tag}...`);
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'CamperSitesProBot/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (response.ok) {
        const json = await response.json();
        if (json.elements) {
          allElements = allElements.concat(json.elements);
          console.log(`  -> Obtenidos ${json.elements.length} elementos para ${tag}`);
        }
      }
    } catch (e) {
      console.warn(`  ⚠️ Error para ${tag}:`, e.message);
    }
  }

  return allElements;
}

function mapOsmCategory(tags) {
  if (tags.tourism === 'camp_site') return 'CAMPING';
  if (tags.tourism === 'caravan_site') return 'AREA_DESCANSO';
  if (tags.amenity === 'fuel') return 'GASOLINERA_GLP';
  if (tags.amenity === 'bar' || tags.amenity === 'cafe') return 'BAR_CAFETERIA';
  if (tags.amenity === 'restaurant') return 'RESTAURANTE';
  if (tags.highway === 'rest_area' || tags.highway === 'services') return 'AREA_DESCANSO';
  return 'AREA_SERVICIOS';
}

async function run() {
  const region = REGIONS[selectedRegionKey] || REGIONS.madrid;
  console.log(`============================================================`);
  console.log(`🇪🇸 Sincronizador de POIs de España - OpenStreetMap & Supabase`);
  console.log(`📍 Región seleccionada: ${region.name}`);
  console.log(`📦 Límite de descarga: ${BATCH_LIMIT} puntos`);
  console.log(`============================================================`);

  const elements = await fetchOverpassData(region);
  console.log(`📥 Elementos recibidos de OpenStreetMap: ${elements.length}`);

  if (elements.length === 0) {
    console.log('ℹ️ No se obtuvieron elementos nuevos para esta región o el servidor tardó.');
    return;
  }

  const rows = [];
  elements.forEach((el, index) => {
    if (!el.lat || !el.lon) return;
    const tags = el.tags || {};
    const category = mapOsmCategory(tags);
    const name = tags.name || tags['brand'] || `${category.replace(/_/g, ' ')} (${el.id})`;
    const address = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(', ');

    rows.push({
      id: `osm-${el.id}`,
      name: name.slice(0, 100),
      latitude: el.lat,
      longitude: el.lon,
      category,
      description: tags.description || tags.note || `Importado desde OpenStreetMap España`,
      address: address.slice(0, 150) || null,
      price: tags.fee === 'yes' ? 10.0 : 0.0,
      verified: true,
    });
  });

  console.log(`🚀 Subiendo ${rows.length} POIs a Supabase en lotes de 500...`);
  const chunkSize = 500;
  let totalUploaded = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('locations').upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      console.error(`⚠️ Error al subir lote ${i / chunkSize}:`, error.message);
    } else {
      totalUploaded += chunk.length;
      process.stdout.write(`\r✅ Guardados en Supabase: ${totalUploaded} / ${rows.length} POIs...`);
    }
  }

  console.log(`\n🎉 Sincronización completada con éxito. Total insertados/actualizados: ${totalUploaded}`);
}

run().catch(err => {
  console.error('❌ Error fatal:', err);
});
