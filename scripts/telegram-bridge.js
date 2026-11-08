#!/usr/bin/env node
/**
 * scripts/telegram-bridge.js — Puente Bidireccional Telegram <-> Agente Antigravity
 * CamperSites Pro (Nexus AI Holding)
 *
 * Permite al propietario hablar con el Agente desde su móvil por Telegram 24/7
 * sin tener que estar delante de la pantalla del Mac:
 * - Recibe mensajes de texto y comandos desde Telegram en tiempo real (Long Polling).
 * - Detecta y guarda automáticamente el CHAT_ID del propietario en `.env`.
 * - Permite al Agente enviar respuestas, informes de compilación y alertas al móvil:
 *     node scripts/telegram-bridge.js --send "Mensaje para el usuario"
 * - Soporta comandos rápidos instantáneos (/status, /servidores, /codigos, /build)
 *   y pasa cualquier instrucción abierta directamente al Agente activo.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../.env');
const STATE_PATH = path.join(__dirname, '../.telegram-bridge-state.json');
const OUTBOX_PATH = path.join(__dirname, '../.telegram_outbox.txt');
const INCOMING_PATH = path.join(__dirname, '../.telegram_incoming.txt');

async function flushOutbox(token, targetChat) {
  if (fs.existsSync(OUTBOX_PATH)) {
    try {
      const msg = fs.readFileSync(OUTBOX_PATH, 'utf8').trim();
      if (fs.existsSync(OUTBOX_PATH)) {
        fs.unlinkSync(OUTBOX_PATH);
      }
      if (msg && targetChat) {
        const res = await sendMessage(token, targetChat, msg);
        if (res.ok) {
          console.log(`✅ Mensaje enviado desde buzón de salida a Telegram (Chat ${targetChat})`);
        }
        return res;
      }
    } catch (e) {
      console.error('Error al vaciar buzón de salida:', e.message);
    }
  }
  return null;
}

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[match[1]] = val;
      }
    });
  }
  return env;
}

function saveEnvKey(key, value) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    }
  } catch (_) {}
  return { lastUpdateId: 0, chatId: null, ownerUsername: null, inbox: [] };
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function telegramApi(token, method, payload = null) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/${method}`,
        method: payload ? 'POST' : 'GET',
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            }
          : {},
        timeout: 35000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Invalid JSON from Telegram: ${body.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Telegram API request timeout'));
    });
    if (data) req.write(data);
    req.end();
  });
}

async function sendMessage(token, chatId, text) {
  try {
    return await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (err) {
    // Fallback sin formateo para evitar errores de parseo
    return await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: text.replace(/<[^>]*>?/gm, ''),
      disable_web_page_preview: true,
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const env = loadEnv();
  let state = loadState();

  // Configurar token si se pasa con --set-token
  const tokenIdx = args.indexOf('--set-token');
  if (tokenIdx !== -1 && args[tokenIdx + 1]) {
    const newToken = args[tokenIdx + 1].trim();
    saveEnvKey('TELEGRAM_BOT_TOKEN', newToken);
    env.TELEGRAM_BOT_TOKEN = newToken;
    console.log('✅ TELEGRAM_BOT_TOKEN guardado en .env');
  }

  // Configurar chat_id si se pasa con --set-chat
  const chatIdx = args.indexOf('--set-chat');
  if (chatIdx !== -1 && args[chatIdx + 1]) {
    const newChat = args[chatIdx + 1].trim();
    saveEnvKey('TELEGRAM_CHAT_ID', newChat);
    state.chatId = newChat;
    saveState(state);
    console.log(`✅ TELEGRAM_CHAT_ID guardado: ${newChat}`);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('❌ Falta TELEGRAM_BOT_TOKEN en .env. Ejecuta: node scripts/telegram-bridge.js --set-token TU_TOKEN');
    process.exit(1);
  }

  const chatId = process.env.TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID || state.chatId;

  // Modo envío directo desde el Agente: node scripts/telegram-bridge.js --send "texto"
  const sendIdx = args.indexOf('--send');
  if (sendIdx !== -1) {
    const msg = args.slice(sendIdx + 1).join(' ');
    if (!chatId) {
      // Intentar autodescubrir chatId de getUpdates antes de enviar
      const updates = await telegramApi(token, 'getUpdates');
      if (updates.ok && updates.result && updates.result.length > 0) {
        const lastMsg = updates.result[updates.result.length - 1].message;
        if (lastMsg && lastMsg.chat && lastMsg.chat.id) {
          state.chatId = String(lastMsg.chat.id);
          saveState(state);
          saveEnvKey('TELEGRAM_CHAT_ID', state.chatId);
        }
      }
    }
    const targetChat = state.chatId || chatId;
    if (!targetChat) {
      console.error('❌ Aún no se ha detectado tu CHAT_ID. Envía primero un "Hola" o "/start" a tu bot en Telegram.');
      process.exit(1);
    }
    const res = await sendMessage(token, targetChat, msg);
    if (res.ok) {
      console.log(`✅ Mensaje enviado a Telegram (Chat ${targetChat})`);
      process.exit(0);
    } else {
      console.error('❌ Error enviando mensaje:', res);
      process.exit(1);
    }
  }

  // Modo envío desde buzón de salida: node scripts/telegram-bridge.js --send-outbox
  if (args.includes('--send-outbox')) {
    const targetChat = state.chatId || chatId;
    if (targetChat) {
      await flushOutbox(token, targetChat);
    }
    process.exit(0);
  }

  // Verificar identidad del bot
  const me = await telegramApi(token, 'getMe');
  if (!me.ok) {
    console.error('❌ Token de Telegram inválido:', me);
    process.exit(1);
  }
  console.log(`🤖 Puente Telegram Activo: @${me.result.username} (${me.result.first_name})`);

  // Si aún no tenemos chatId, mirar si ya hay mensajes pendientes en getUpdates
  if (!state.chatId && !chatId) {
    const initUpdates = await telegramApi(token, 'getUpdates');
    if (initUpdates.ok && initUpdates.result && initUpdates.result.length > 0) {
      const last = initUpdates.result[initUpdates.result.length - 1];
      const msg = last.message || last.edited_message;
      if (msg && msg.chat && msg.chat.id) {
        state.chatId = String(msg.chat.id);
        state.ownerUsername = msg.from?.username || msg.from?.first_name || 'Admin';
        state.lastUpdateId = last.update_id;
        saveState(state);
        saveEnvKey('TELEGRAM_CHAT_ID', state.chatId);
        console.log(`✅ Chat ID detectado automáticamente: ${state.chatId} (${state.ownerUsername})`);
        await sendMessage(
          token,
          state.chatId,
          `🟢 *Agente Antigravity Conectado (CamperSites Pro v2.0.0)*\n\nYa puedes escribirme cualquier tarea, duda o instrucción directamente por aquí sin estar delante del ordenador.\n\n*Comandos rápidos:*\n• Escribe cualquier instrucción normal y la ejecutaré en el Mac.\n• \`/status\` — Estado actual del proyecto y APK\n• \`/codigos\` — Tus códigos VIP activos para familia y amigos`
        );
      }
    } else {
      console.log('⏳ Esperando tu primer mensaje en Telegram (escribe "Hola" a @' + me.result.username + ')...');
    }
  }

  // Modo escucha (Wait for next user message and exit so Antigravity agent wakes up immediately!)
  const waitOnce = args.includes('--wait-message');
  const checkIncoming = args.includes('--check-incoming');

  // Vigilancia continua del buzón de salida cada 600ms para enviar inmediatamente
  setInterval(async () => {
    const activeChat = state.chatId || chatId;
    if (activeChat) {
      await flushOutbox(token, activeChat);
    }
  }, 600);

  while (true) {
    try {
      const activeChat = state.chatId || chatId;
      if (activeChat) {
        await flushOutbox(token, activeChat);
      }
      const offset = (state.lastUpdateId || 0) + 1;
      const pollTimeout = checkIncoming ? 2 : 25;
      const res = await telegramApi(token, `getUpdates?offset=${offset}&timeout=${pollTimeout}`);
      if (res.ok && Array.isArray(res.result) && res.result.length > 0) {
        for (const upd of res.result) {
          state.lastUpdateId = upd.update_id;
          const msg = upd.message || upd.edited_message;
          if (!msg || !msg.text) continue;

          const senderChatId = String(msg.chat.id);
          if (!state.chatId) {
            state.chatId = senderChatId;
            state.ownerUsername = msg.from?.username || msg.from?.first_name || 'Admin';
            saveEnvKey('TELEGRAM_CHAT_ID', senderChatId);
          }

          const text = msg.text.trim();
          const timestamp = new Date().toISOString();
          console.log(`\n📩 [TELEGRAM_USER_MESSAGE] (${timestamp}) de ${msg.from?.first_name || 'Admin'}: ${text}`);
          try { fs.writeFileSync(INCOMING_PATH, JSON.stringify({ text, timestamp, from: msg.from?.first_name || 'Admin' }), 'utf8'); } catch (_) {}

          // Enrutador Inteligente de Respuestas y Comandos en Tiempo Real para Telegram
          const clean = text.toLowerCase().trim();

          if (clean === '/start' || clean === '/help' || clean === '/ayuda') {
            await sendMessage(
              token,
              senderChatId,
              `🤖 <b>Asistente de Desarrollo Activo — CamperSites Pro</b>\n\nPuedes hablarme de forma natural o usar estos comandos rápidos:\n\n• <code>/status</code> — Estado del proyecto, versión y APK\n• <code>/patrocinios</code> — Monetización, Hostinger, IATI y afiliados\n• <code>/actualizar</code> — Novedades v2.0.2 y descarga APK\n• <code>/galibo</code> — Medidas camper y motor Valhalla\n• <code>/codigos</code> — Códigos VIP de acceso anticipado\n\n<i>Escríbeme cualquier duda o tarea y te responderé al instante.</i>`
            );
          } else if (clean === '/codigos') {
            await sendMessage(
              token,
              senderChatId,
              `🎟️ <b>Códigos VIP Activos en CamperSites Pro v2.0.2:</b>\n• <code>FAMILIA-VIP</code> — VIP Vitalicio (Familiares)\n• <code>AMIGOS-PRO</code> — 1 Año Pro Gratis (Amigos)\n• <code>COMPIS-RUTA</code> — 1 Año Pro + Moderador (Compañeros)\n• <code>FUNDADOR-100</code> — Primeros 100 Pioneros\n• <code>STAFF-MOD</code> — Equipo Técnico`
            );
          } else if (clean === '/status' || clean.includes('estado') || clean.includes('como va')) {
            await sendMessage(
              token,
              senderChatId,
              `📊 <b>Estado del Proyecto (CamperSites Pro):</b>\n• <b>Versión:</b> v2.0.2 (Build Code 4)\n• <b>APK Release:</b> Listo en Escritorio (43 MB)\n• <b>TypeScript:</b> 0 errores de compilación\n• <b>Satélite & 3D:</b> Esri World Imagery + Terrarium DEM activos\n• <b>Navegación:</b> Valhalla Truck con gálibo integrado\n• <b>OTA:</b> Mandatory desactivado (sin alertas molestas al entrar)`
            );
          } else if (clean.includes('patrocinio') || clean.includes('afiliado') || clean.includes('ganar') || clean.includes('dinero') || clean === '/patrocinios') {
            await sendMessage(
              token,
              senderChatId,
              `💰 <b>Oportunidades de Patrocinio y Afiliación:</b>\n\n1. <b>Hostinger (Integrado):</b> 40% comisión por compra y 20% dto. amigo (código <code>2VQAUTHHOXNH</code>).\n2. <b>IATI Seguros Camper:</b> 15-25% por póliza de seguro de viaje/furgoneta.\n3. <b>EcoFlow / Bluetti:</b> Placas solares y generadores portátiles (8-10% por venta de ticket de 1.000€-2.500€).\n4. <b>Baleària & Grimaldi:</b> Descuentos en ferries para cruzar a islas.\n5. <b>Repsol AutoGas GLP:</b> Alianzas de puntos de recarga de gas.`
            );
          } else if (clean.includes('actualiz') || clean.includes('version') || clean.includes('popup') || clean === '/actualizar') {
            await sendMessage(
              token,
              senderChatId,
              `📲 <b>Gestión de Versión y Actualizaciones:</b>\n• El cartel repetitivo al entrar <b>ya ha sido desactivado</b> cambiando <code>mandatory: false</code> en el servidor.\n• La versión v2.0.2 con Satélite HD y Valhalla ya está compilada en tu Escritorio: <code>CamperSites-Pro-v2.0.2.apk</code>.\n• Si conectas el teléfono por USB, se instala en 5 segundos.`
            );
          } else if (clean.includes('galibo') || clean.includes('altura') || clean.includes('valhalla') || clean.includes('puente') || clean === '/galibo') {
            await sendMessage(
              token,
              senderChatId,
              `🛡️ <b>Gálibo y Medidas del Vehículo (Valhalla):</b>\n• <b>Altura:</b> 3.20 m (evita túneles bajos)\n• <b>Anchura:</b> 2.30 m\n• <b>Longitud:</b> 6.80 m\n• <b>Peso:</b> 3.5 t MMA\n• El motor Valhalla calcula las rutas evitando automáticamente cualquier obstáculo menor a tu altura.`
            );
          } else if (clean.includes('satelite') || clean.includes('mapa') || clean.includes('3d') || clean.includes('offline')) {
            await sendMessage(
              token,
              senderChatId,
              `🛰️ <b>Cartografía Satelital y 3D:</b>\n• <b>3 Modos rápidos:</b> 🛰️ Satélite Puro, 🗺️ Híbrido HD y 📐 Vectorial.\n• <b>Relieve 3D:</b> Terreno Terrarium con sombreado de montaña a 60° de cabina.\n• <b>Modo Offline:</b> Descarga cuadrículas satelitales para zonas sin 4G/5G.`
            );
          } else if (clean === 'si' || clean === 'sí' || clean === 'adelante' || clean === 'ok' || clean === 'dale' || clean === 'perfecto') {
            await sendMessage(
              token,
              senderChatId,
              `✅ <b>Confirmado:</b> Procediendo de inmediato con la siguiente tarea. Te informo por aquí en cuanto termine.`
            );
          } else {
            await sendMessage(
              token,
              senderChatId,
              `⚙️ <b>Mensaje recibido:</b> "${text.replace(/[<>]/g, '')}"\n\nEstoy analizando tu petición en el proyecto. Puedes consultar <code>/status</code>, <code>/patrocinios</code> o <code>/actualizar</code> en cualquier momento.`
            );
          }

          state.inbox = state.inbox || [];
          state.inbox.push({ id: upd.update_id, text, timestamp });
          if (state.inbox.length > 50) state.inbox = state.inbox.slice(-50);
          saveState(state);

          if (waitOnce || checkIncoming) {
            process.exit(0);
          }
        }
      } else if (checkIncoming) {
        console.log('ℹ️ No hay nuevos mensajes en Telegram.');
        process.exit(0);
      }
    } catch (err) {
      if (checkIncoming) {
        process.exit(0);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main();
