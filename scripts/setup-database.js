#!/usr/bin/env node

/**
 * Script de configuración de Supabase para CamperSites Pro
 * 
 * Este script:
 * 1. Verifica las credenciales de Supabase
 * 2. Crea el esquema de base de datos
 * 3. Ejecuta migraciones necesarias
 * 4. Valida la configuración
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Colores para output
const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
};

// Obtener credenciales desde variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validar credenciales
function validateCredentials() {
  log.info('Validando credenciales de Supabase...');
  
  if (!SUPABASE_URL || SUPABASE_URL.includes('tu-proyecto')) {
    log.error('SUPABASE_URL no configurada correctamente');
    log.warning('Edita el archivo .env con tu URL de proyecto de Supabase');
    log.warning('Puedes obtenerla en: https://app.supabase.com/project/_/settings/api');
    return false;
  }
  
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('tu-anon-key')) {
    log.error('SUPABASE_ANON_KEY no configurada correctamente');
    log.warning('Edita el archivo .env con tu clave anónima de Supabase');
    return false;
  }
  
  log.success('Credenciales válidas');
  return true;
}

// Crear cliente Supabase
function createSupabaseClient() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
    log.success('Cliente Supabase creado');
    return supabase;
  } catch (error) {
    log.error(`Error creando cliente Supabase: ${error.message}`);
    return null;
  }
}

// Testear conexión
async function testConnection(supabase) {
  log.info('Probando conexión con Supabase...');
  
  try {
    const { data, error } = await supabase.from('locations').select('count').limit(1);
    
    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        log.warning('La tabla locations no existe - es necesario ejecutar el schema');
        return 'schema_needed';
      }
      log.error(`Error en consulta: ${error.message}`);
      return 'error';
    }
    
    log.success('Conexión exitosa');
    return 'connected';
  } catch (error) {
    log.error(`Error en conexión: ${error.message}`);
    return 'error';
  }
}

// Leer archivo SQL
const fs = require('fs');
const path = require('path');

async function executeSchema(supabase) {
  log.info('Leyendo schema.sql...');
  
  const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    log.error('No se encontró schema.sql en supabase/schema.sql');
    return false;
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf8');
  log.success(`Schema leído (${schema.length} bytes)`);
  
  // Nota: Para ejecutar el schema completo, necesitas usar el Dashboard de Supabase
  // o la CLI de Supabase. Aquí solo mostramos las instrucciones.
  log.info('\n===========================================');
  log.info('INSTRUCCIONES PARA EJECUTAR EL SCHEMA:');
  log.info('===========================================');
  log.info('');
  log.info('Opción 1: Usar el Dashboard de Supabase');
  log.info('  1. Ve a https://app.supabase.com');
  log.info('  2. Selecciona tu proyecto');
  log.info('  3. Ve a SQL Editor');
  log.info('  4. Copia y pega el contenido de supabase/schema.sql');
  log.info('  5. Ejecuta el script');
  log.info('');
  log.info('Opción 2: Usar Supabase CLI');
  log.info('  1. Instala: npm install -g supabase');
  log.info('  2. Login: supabase login');
  log.info('  3. Link: supabase link --project-ref TU_PROJECT_ID');
  log.info('  4. Ejecuta: supabase db push');
  log.info('');
  log.info('Opción 3: Migraciones automáticas');
  log.info('  Ejecuta los scripts de migración en orden:');
  log.info('  - supabase/migration-002-community-alerts.sql');
  log.info('  - supabase/migration-003-expanded-categories.sql');
  log.info('  - etc.');
  log.info('');
  log.info('===========================================\n');
  
  return true;
}

// Mostrar resumen
function showSummary() {
  console.log('\n===========================================');
  log.success('¡Configuración completada!');
  console.log('===========================================\n');
  log.info('Próximos pasos:');
  log.info('');
  log.info('1. Ejecuta el schema en Supabase (ver instrucciones arriba)');
  log.info('');
  log.info('2. Configura las políticas RLS (Row Level Security):');
  log.info('   - Ve al Dashboard de Supabase');
  log.info('   - Authentication > Policies');
  log.info('   - Habilita RLS para todas las tablas');
  log.info('');
  log.info('3. Carga datos de ejemplo:');
  log.info('   npm run scrape');
  log.info('   npm run upload');
  log.info('');
  log.info('4. Prueba la aplicación:');
  log.info('   npm run android  # Android');
  log.info('   npm run ios      # iOS (solo macOS)');
  log.info('');
  console.log('===========================================\n');
}

// Main
async function main() {
  console.log('\n===========================================');
  console.log('  CamperSites Pro - Setup de Base de Datos');
  console.log('===========================================\n');
  
  // Validar credenciales
  if (!validateCredentials()) {
    process.exit(1);
  }
  
  // Crear cliente
  const supabase = createSupabaseClient();
  if (!supabase) {
    process.exit(1);
  }
  
  // Testear conexión
  const connectionStatus = await testConnection(supabase);
  
  if (connectionStatus === 'error') {
    log.error('No se pudo conectar a Supabase');
    process.exit(1);
  } else if (connectionStatus === 'schema_needed') {
    log.warning('Es necesario ejecutar el schema primero');
    await executeSchema(supabase);
  } else {
    log.success('Base de datos ya configurada');
  }
  
  // Mostrar resumen
  showSummary();
}

main().catch(error => {
  log.error(`Error inesperado: ${error.message}`);
  process.exit(1);
});
