/**
 * Setup Database - CamperSites Pro
 * YRYS
 *
 * Crea tablas directamente usando la API de Supabase
 * Ejecutar: node scripts/setup-database.js
 */

const fs = require('fs');
const path = require('path');

// Polyfill dinámico para fetch usando node-fetch@3 (compatible con CommonJS)
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// Leer .env
const envPath = path.join(__dirname, '../.env');
let env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
}

const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env o variables de entorno');
  process.exit(1);
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

async function tableExists(tableName) {
  // Intentamos una petición simple; si devuelve error de relación o 404 asumimos que no existe
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`, {
      headers,
    });
    if (res.status === 404) return false;
    if (!res.ok) {
      // Intentar leer cuerpo (puede no ser JSON)
      let body;
      try { body = await res.json(); } catch (e) { body = null; }
      if (body && (body.code === '42P01' || (body.message && (body.message.includes('does not exist') || body.message.includes('schema cache'))))) {
        return false;
      }
      // Otros errores se consideran que la tabla existe o hay permisos insuficientes
      return true;
    }
    return true;
  } catch (err) {
    console.error(`  Error comprobando tabla ${tableName}:`, err.message);
    return false;
  }
}

async function uploadLocations() {
  console.log('\n📍 Subiendo locations a Supabase...');

  const dataPath = path.join(__dirname, '../data/scraped-data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('⚠️  No se encontro data/scraped-data.json - ejecuta "npm run scrape" primero');
    return 0;
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const locations = rawData.locations || [];
  console.log(`  Encontradas ${locations.length} locations en el JSON`);

  const mapped = locations.map(loc => ({
    id: loc.id,
    name: loc.name || `Location ${loc.id}`,
    latitude: loc.latitude,
    longitude: loc.longitude,
    category: loc.category || 'PARKING_PERMITIDO',
    address: loc.address || '',
    city: loc.city || '',
    province: loc.province || '',
    has_water: loc.hasWater || false,
    has_electricity: loc.hasElectricity || false,
    capacity: loc.capacity || null,
    price: loc.price !== undefined && loc.price !== null ? loc.price : null,
    description: loc.description || '',
    website: loc.website || '',
    phone: loc.phone || '',
    source: 'osm',
    verified: false,
  }));

  // Subir en lotes de 200
  const BATCH_SIZE = 200;
  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/locations`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        let err;
        try { err = await res.json(); } catch (e) { err = { status: res.status, statusText: res.statusText }; }
        console.error(`  ❌ Lote ${i}-${i + batch.length}: ${err.message || JSON.stringify(err)}`);
        errors++;
      } else {
        uploaded += batch.length;
        process.stdout.write(`\r  ✅ ${uploaded}/${mapped.length} locations subidas`);
      }
    } catch (err) {
      console.error(`  ❌ Lote ${i}-${i + batch.length} error: ${err.message}`);
      errors++;
    }
  }

  console.log('');
  if (errors > 0) console.log(`  ⚠️  Hubo ${errors} errores al subir batches`);
  return uploaded;
}

async function uploadRadars() {
  console.log('\n📡 Subiendo radares a Supabase...');

  const dataPath = path.join(__dirname, '../data/radares-verificados.json');
  if (!fs.existsSync(dataPath)) {
    console.log('⚠️  No se encontro data/radares-verificados.json');
    return 0;
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const radars = rawData.radares || [];
  console.log(`  Encontrados ${radars.length} radares en el JSON`);

  const mapped = radars.map(r => ({
    id: r.id,
    code: r.code || '',
    type: r.type || 'FIJO',
    latitude: r.latitude,
    longitude: r.longitude,
    speed_limit: r.speedLimit || null,
    road: r.road || '',
    km: r.km || '',
    direction: r.direction || '',
    province: r.province || '',
    source: r.source || 'dgt',
    verified: r.verified || false,
    last_verified: r.lastVerified || null,
    verification_count: r.verificationCount || 0,
    active: true,
  }));

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/radars`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(mapped),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(`  ❌ Error: ${err.message || JSON.stringify(err)}`);
      return 0;
    }

    console.log(`  ✅ ${mapped.length} radares subidos`);
    return mapped.length;
  } catch (err) {
    console.error('  ❌ Error subiendo radares:', err.message);
    return 0;
  }
}

async function countRows(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
      headers: { ...headers, 'Prefer': 'count=exact' },
    });
    const contentRange = res.headers.get('content-range');
    return contentRange ? contentRange.split('/')[1] : '?';
  } catch (err) {
    console.error(`  Error contando filas en ${table}:`, err.message);
    return '?';
  }
}

async function main() {
  console.log('===========================================');
  console.log(' CamperSites Pro - Database Setup');
  console.log(' YRYS');
  console.log('===========================================\n');

  // 1. Verificar si las tablas existen
  console.log('🔍 Verificando tablas...');
  const tables = ['locations', 'radars', 'radar_reports', 'user_profiles', 'saved_routes'];
  const missing = [];

  for (const table of tables) {
    const exists = await tableExists(table);
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    if (!exists) missing.push(table);
  }

  if (missing.length > 0) {
    console.log('\n' + '='.repeat(50));
    console.log('⚠️  TABLAS NO ENCONTRADAS: ' + missing.join(', '));
    console.log('='.repeat(50));
    console.log('\nPara crear las tablas:');
    console.log(`  1. Abre: https://supabase.com/dashboard/project/cdlhipiukgjmfimhjlkl/sql/new`);
    console.log('  2. Copia el contenido de: supabase/schema.sql');
    console.log('  3. Pulsa "Run"');
    console.log('  4. Vuelve a ejecutar: node scripts/setup-database.js');
    console.log('');
    process.exit(0);
  }

  // 2. Subir datos
  console.log('\n📤 Subiendo datos...');
  const locCount = await uploadLocations();
  const radCount = await uploadRadars();

  // 3. Verificacion final
  console.log('\n📊 Estado final de la base de datos:');
  for (const table of tables) {
    const count = await countRows(table);
    console.log(`  ${table}: ${count} registros`);
  }

  console.log('\n✅ Setup completado correctamente!');
  console.log('===========================================\n');
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err && err.message ? err.message : err);
  process.exit(1);
});