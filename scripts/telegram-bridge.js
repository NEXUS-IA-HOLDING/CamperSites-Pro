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
  return telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
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

  while (true) {
    try {
      const offset = (state.lastUpdateId || 0) + 1;
      const res = await telegramApi(token, `getUpdates?offset=${offset}&timeout=25`);
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

          // Respuestas instantáneas de cortesía mientras el Agente procesa
          if (text === '/start') {
            await sendMessage(
              token,
              senderChatId,
              `🟢 *Puente Directo con tu Agente Antigravity Activo*\n\nEscríbeme por aquí lo que quieras que haga en *CamperSites Pro* mientras estás fuera del ordenador y te iré respondiendo en tiempo real.`
            );
          } else if (text === '/codigos') {
            await sendMessage(
              token,
              senderChatId,
              `🎟️ *Códigos VIP Activos en CamperSites Pro v2.0.0:*\n• \`FAMILIA-VIP\` — VIP Vitalicio (Familiares)\n• \`AMIGOS-PRO\` — 1 Año Pro Gratis (Amigos)\n• \`COMPIS-RUTA\` — 1 Año Pro + Moderador (Compañeros)\n• \`FUNDADOR-100\` — Primeros 100 Usuarios Pioneros\n• \`STAFF-MOD\` — Equipo Staff / Soporte`
            );
          } else {
            await sendMessage(
              token,
              senderChatId,
              `⚙️ _Recibido en el Mac. Procesando tu instrucción:_ "${text}"...`
            );
          }

          state.inbox = state.inbox || [];
          state.inbox.push({ id: upd.update_id, text, timestamp });
          if (state.inbox.length > 50) state.inbox = state.inbox.slice(-50);
          saveState(state);

          if (waitOnce) {
            process.exit(0);
          }
        }
      }
    } catch (err) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main();
