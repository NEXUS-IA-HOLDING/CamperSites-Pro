/**
 * Upload Radars to Supabase
 * CamperSites Pro - YRYS
 */

const fs = require('fs');
const path = require('path');
const fetchFn = typeof fetch !== 'undefined' ? fetch : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

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

const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates,return=minimal',
};

async function main() {
  const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/radares-verificados.json'), 'utf-8'));
  const radars = rawData.radares.map(r => ({
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

  console.log(`📡 Subiendo ${radars.length} radares a Supabase en lotes de 200...`);

  const BATCH_SIZE = 200;
  let totalUploaded = 0;

  for (let i = 0; i < radars.length; i += BATCH_SIZE) {
    const batch = radars.slice(i, i + BATCH_SIZE);
    const res = await fetchFn(`${SUPABASE_URL}/rest/v1/radars`, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(`❌ Error en lote ${i}-${i + batch.length}:`, JSON.stringify(err, null, 2));
    } else {
      totalUploaded += batch.length;
      console.log(`✅ Lote subido: ${totalUploaded} / ${radars.length} radares (${Math.round((totalUploaded / radars.length) * 100)}%)`);
    }
  }

  // Verificar conteo
  const countRes = await fetchFn(`${SUPABASE_URL}/rest/v1/radars?select=*&limit=0`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });
  const range = countRes.headers.get('content-range');
  console.log(`📊 Total radares en BD: ${range ? range.split('/')[1] : '?'}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
