#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const envPath = path.join(__dirname, '../.env');
let env = {};
fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const headers = {
  'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'count=exact',
};

async function countTable(table) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, { headers });
  const range = res.headers.get('content-range');
  return range ? range.split('/')[1] : '?';
}

async function main() {
  console.log('=== ESTADO SUPABASE ===\n');

  const tables = ['locations', 'radars', 'radar_reports', 'user_profiles', 'community_alerts', 'alert_votes', 'point_transactions'];
  for (const t of tables) {
    const count = await countTable(t);
    console.log(`  ${t.padEnd(22)} ${count} registros`);
  }

  // Categorías en locations
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers,
  }).catch(() => null);

  // Country check
  const r2 = await fetch(`${env.SUPABASE_URL}/rest/v1/locations?select=country&limit=1`, {
    headers: { ...headers, 'Prefer': 'return=representation' },
  });
  const hasCountry = r2.ok;
  console.log(`\n  Columna 'country': ${hasCountry ? 'EXISTE ✅' : 'NO EXISTE ❌'}`);

  console.log('\n=== MIGRACIÓN 003 ===');
  // Test MIRADOR
  const r3 = await fetch(`${env.SUPABASE_URL}/rest/v1/locations?category=eq.MIRADOR&select=id&limit=1`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });
  const miradorRange = r3.headers.get('content-range');
  console.log(`  Miradores: ${miradorRange ? miradorRange.split('/')[1] : 'ERROR'}`);

  const r4 = await fetch(`${env.SUPABASE_URL}/rest/v1/locations?category=eq.PLAYA&select=id&limit=1`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });
  const playaRange = r4.headers.get('content-range');
  console.log(`  Playas: ${playaRange ? playaRange.split('/')[1] : 'ERROR'}`);

  const r5 = await fetch(`${env.SUPABASE_URL}/rest/v1/locations?category=eq.MONTANA&select=id&limit=1`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });
  const montRange = r5.headers.get('content-range');
  console.log(`  Montañas: ${montRange ? montRange.split('/')[1] : 'ERROR'}`);

  console.log('\n✅ Check completo');
}

main().catch(console.error);
