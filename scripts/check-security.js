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
};

async function checkTable(name) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${name}?select=*&limit=1`, { headers });
  return res.ok;
}

async function main() {
  console.log('=== VERIFICACIÓN SEGURIDAD ===\n');

  const securityTables = [
    'rate_limits',
    'login_attempts',
    'active_sessions',
    'user_security',
    'audit_log',
  ];

  let allGood = true;
  for (const t of securityTables) {
    const exists = await checkTable(t);
    console.log(`  ${exists ? '✅' : '❌'} ${t}`);
    if (!exists) allGood = false;
  }

  // Verificar tablas existentes
  console.log('\n=== TABLAS PRINCIPALES ===\n');
  const mainTables = ['locations', 'radars', 'community_alerts', 'alert_votes', 'point_transactions', 'user_profiles'];
  for (const t of mainTables) {
    const exists = await checkTable(t);
    console.log(`  ${exists ? '✅' : '❌'} ${t}`);
    if (!exists) allGood = false;
  }

  console.log(allGood ? '\n🔒 SEGURIDAD COMPLETA ✅' : '\n⚠️ Hay tablas faltantes');
}

main().catch(console.error);
