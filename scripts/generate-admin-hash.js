#!/usr/bin/env node

/**
 * Script para generar hashes de códigos admin de forma segura
 * Uso: npm run generate-admin-hash -- <codigo-secreto>
 * 
 * Este script NO debe usarse en producción. En producción, los hashes
 * deben generarse server-side con bcrypt o argon2.
 */

const crypto = require('crypto');

// Salt por defecto (cambiar en producción)
const DEFAULT_SALT = process.env.EXPO_PUBLIC_ADMIN_SALT || 'YRYS_CAMPER_SITES_2024_DEV_ONLY';

function hashAdminCode(code, salt = DEFAULT_SALT) {
  // Hash simple para ofuscación (NO es criptográfico para producción)
  // En producción usar bcrypt: bcrypt.hashSync(code, 10)
  const saltedCode = code + salt;
  let hash = 0;
  
  for (let i = 0; i < saltedCode.length; i++) {
    const char = saltedCode.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16).padStart(16, '0');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\n❌ Error: Debes proporcionar un código\n');
    console.log('Uso:');
    console.log('  npm run generate-admin-hash -- <codigo-secreto>\n');
    console.log('Ejemplo:');
    console.log('  npm run generate-admin-hash -- MiCodigoSecreto123\n');
    console.log('Variables de entorno opcionales:');
    console.log('  EXPO_PUBLIC_ADMIN_SALT=<salt-personalizado>\n');
    process.exit(1);
  }
  
  const code = args[0];
  
  if (code.length < 8) {
    console.log('\n❌ Error: El código debe tener al menos 8 caracteres\n');
    process.exit(1);
  }
  
  const hash = hashAdminCode(code);
  
  console.log('\n✅ Hash generado exitosamente:\n');
  console.log('┌─────────────────────────────────────────┐');
  console.log(`│ Código: ${code.padEnd(32)} │`);
  console.log(`│ Hash:   ${hash.padEnd(32)} │`);
  console.log('└─────────────────────────────────────────┘\n');
  console.log('📝 Agrega este hash a tu archivo .env:\n');
  console.log(`EXPO_PUBLIC_ADMIN_MASTER_HASH=${hash}\n`);
  console.log('⚠️  IMPORTANTE:');
  console.log('   - NUNCA compartas el código original');
  console.log('   - NUNCA commitees el archivo .env a Git');
  console.log('   - En producción, usa bcrypt o argon2\n');
}

main();
