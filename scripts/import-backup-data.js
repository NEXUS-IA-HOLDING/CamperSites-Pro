#!/usr/bin/env node

/**
 * Script de importación masiva de datos desde el backup de Supabase
 * Importa los 517.351 lugares y los 101 radares verificados
 * Uso: node scripts/import-backup-data.js [--batch=500] [--limit=1000] [--dry-run]
 */

const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const BACKUP_PATH = path.join(__dirname, '../supabase/backups/db_cluster-24-10-2026@12-10-57.backup.gz');

// Argumentos CLI
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(a => a.startsWith('--batch='));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 500;
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

if (!fs.existsSync(BACKUP_PATH)) {
  console.error(`❌ Archivo de backup no encontrado en: ${BACKUP_PATH}`);
  process.exit(1);
}

if (!isDryRun && (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('tu-proyecto'))) {
  console.error('❌ Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY) en .env');
  console.error('   O ejecuta con --dry-run para probar la lectura local sin subir datos.');
  process.exit(1);
}

const supabase = !isDryRun ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
}) : null;

async function run() {
  console.log('🚐 CamperSites-Pro - Importador de Backup Supabase');
  console.log(`📁 Archivo: ${BACKUP_PATH}`);
  console.log(`⚙️ Configuración: Batch=${BATCH_SIZE}, Límite=${LIMIT === Infinity ? 'Todo' : LIMIT}, Modo=${isDryRun ? 'DRY-RUN (Simulación)' : 'PRODUCCIÓN'}`);
  console.log('------------------------------------------------------------');

  const fileStream = fs.createReadStream(BACKUP_PATH);
  const unzipStream = zlib.createGunzip();
  const rl = readline.createInterface({
    input: fileStream.pipe(unzipStream),
    crlfDelay: Infinity,
  });

  let currentTable = null;
  let headers = [];
  let buffer = [];
  let totalProcessed = 0;
  let totalLocations = 0;
  let totalRadars = 0;

  for await (const line of rl) {
    if (line.startsWith('COPY public.')) {
      const match = line.match(/^COPY public\.(\w+)\s+\((.+)\)\s+FROM stdin;/);
      if (match) {
        currentTable = match[1];
        headers = match[2].split(',').map(h => h.trim());
        console.log(`\n📦 Detectada tabla: public.${currentTable} (${headers.length} columnas)`);
      }
      continue;
    }

    if (currentTable) {
      if (line.startsWith('\\.')) {
        // Fin de la tabla actual: vaciar buffer
        if (buffer.length > 0) {
          await flushBatch(currentTable, buffer);
          buffer = [];
        }
        console.log(`✅ Finalizada importación de tabla: public.${currentTable}`);
        currentTable = null;
        continue;
      }

      if (currentTable !== 'locations' && currentTable !== 'radars') {
        continue;
      }

      const values = line.split('\t');
      const row = {};
      headers.forEach((col, idx) => {
        const val = values[idx];
        if (val === undefined || val === '\\N' || val === '') {
          row[col] = null;
        } else if (val === 't') {
          row[col] = true;
        } else if (val === 'f') {
          row[col] = false;
        } else if (['latitude', 'longitude', 'price', 'speed_limit', 'km'].includes(col)) {
          const num = parseFloat(val);
          row[col] = isNaN(num) ? null : num;
        } else if (['capacity', 'verification_count'].includes(col)) {
          const num = parseInt(val, 10);
          row[col] = isNaN(num) ? null : num;
        } else {
          row[col] = val;
        }
      });

      buffer.push(row);
      totalProcessed++;
      if (currentTable === 'locations') totalLocations++;
      if (currentTable === 'radars') totalRadars++;

      if (buffer.length >= BATCH_SIZE) {
        await flushBatch(currentTable, buffer);
        buffer = [];
        if (totalProcessed % 5000 === 0 || totalProcessed < 5000) {
          process.stdout.write(`\r🚀 Procesados: ${totalProcessed.toLocaleString()} registros (${totalLocations.toLocaleString()} ubicaciones, ${totalRadars} radares)...`);
        }
      }

      if (totalProcessed >= LIMIT) {
        if (buffer.length > 0) {
          await flushBatch(currentTable, buffer);
          buffer = [];
        }
        console.log(`\n🛑 Límite alcanzado (${LIMIT} registros).`);
        break;
      }
    }
  }

  console.log('\n============================================================');
  console.log(`🎉 Resumen Final:`);
  console.log(`   - Ubicaciones procesadas: ${totalLocations.toLocaleString()}`);
  console.log(`   - Radares procesados: ${totalRadars.toLocaleString()}`);
  console.log('============================================================');
}

async function flushBatch(table, items) {
  if (isDryRun) return;
  try {
    const { error } = await supabase.from(table).upsert(items, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      console.error(`\n⚠️ Error en batch de ${table}:`, error.message);
    }
  } catch (err) {
    console.error(`\n⚠️ Excepción en batch de ${table}:`, err.message);
  }
}

run().catch(err => {
  console.error('\n❌ Error fatal:', err);
  process.exit(1);
});
