/**
 * scripts/supabase-keepalive.js - Evita que Supabase pause el proyecto por inactividad
 * CamperSites Pro
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function getEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return env;
}

async function ping() {
  const env = getEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Falta SUPABASE_URL o SUPABASE_ANON_KEY en .env');
    process.exit(1);
  }

  const pingUrl = `${url}/rest/v1/radars?select=id&limit=1`;
  const options = {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  };

  https.get(pingUrl, options, (res) => {
    if (res.statusCode === 200) {
      console.log(`✅ Supabase Activo y Saludable (HTTP ${res.statusCode}) - ${new Date().toISOString()}`);
      process.exit(0);
    } else {
      console.log(`⚠️ Supabase respondió con código HTTP ${res.statusCode}`);
      process.exit(0);
    }
  }).on('error', (err) => {
    console.error('❌ Error ping Supabase:', err.message);
    process.exit(1);
  });
}

ping();
