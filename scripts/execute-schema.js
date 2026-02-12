/**
 * Execute Schema SQL - CamperSites Pro
 * Ejecuta el schema.sql directamente en Supabase via pg-meta API
 */

const fs = require('fs');
const path = require('path');

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

const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function executeSQL(sql) {
  // Supabase expone un endpoint para ejecutar SQL raw via pg-meta
  // POST /pg/query con el service_role key
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // Intentar via el SQL endpoint alternativo
    return null;
  }
  return await res.json();
}

async function executeSQLviaPgMeta(sql) {
  // Endpoint interno de Supabase para SQL queries
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'x-connection-encrypted': 'true',
    },
    body: JSON.stringify({ query: sql }),
  });

  return { status: res.status, ok: res.ok, body: await res.text() };
}

async function main() {
  console.log('===========================================');
  console.log(' CamperSites Pro - Schema Executor');
  console.log('===========================================\n');

  // Leer schema SQL
  const schemaPath = path.join(__dirname, '../supabase/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log(`SQL leido: ${sql.length} caracteres\n`);

  // Intentar ejecutar todo el SQL de una vez
  console.log('Intentando ejecutar via pg-meta...');
  const result = await executeSQLviaPgMeta(sql);
  console.log('Resultado:', result.status, result.ok ? 'OK' : 'FAIL');

  if (result.body) {
    const bodyPreview = result.body.substring(0, 500);
    console.log('Body:', bodyPreview);
  }

  if (!result.ok) {
    console.log('\n⚠️  La API pg-meta no esta accesible directamente.');
    console.log('\nOpciones para crear las tablas:\n');
    console.log('  OPCION 1 - Dashboard de Supabase (mas facil):');
    console.log(`  1. Abre: https://supabase.com/dashboard/project/cdlhipiukgjmfimhjlkl/sql/new`);
    console.log('  2. Pega el contenido de supabase/schema.sql');
    console.log('  3. Click en "Run"\n');
    console.log('  OPCION 2 - psql:');
    console.log('  Necesitas la password de tu proyecto Supabase.');
    console.log('  /opt/homebrew/opt/libpq/bin/psql "postgresql://postgres.cdlhipiukgjmfimhjlkl:TU_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" -f supabase/schema.sql\n');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
