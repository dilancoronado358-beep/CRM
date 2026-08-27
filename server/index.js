const express = require('express');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodemailer = require('nodemailer');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const logFile = (msg) => {
  try {
    const t = new Date().toISOString();
    require('fs').appendFileSync('server_log.txt', `[${t}] ${msg}\n`);
  } catch (e) { }
  console.log(msg);
};

logFile("🚀 SERVER CRM INICIANDO...");

// Configuración Supabase (Copiada del frontend para conveniencia)
const SUPA_URL = process.env.SUPA_URL || "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = process.env.SUPA_KEY || "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supabase = createClient(SUPA_URL, SUPA_KEY);

// Bloqueo global de sincronización por cuenta
const syncingAccounts = {};

// Status Global para /health y /qr (Nueva Multi-Cuenta)
let latestQRUrl = "";
let clientReady = false;


// Configuración AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Middleware para validar el Bearer Token contra api_settings de Supabase
const authenticateApi = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "No autorizado. Se requiere 'Authorization: Bearer <token>'" });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data, error } = await supabase
      .from('api_settings')
      .select('api_token')
      .eq('api_token', token)
      .maybeSingle();

    if (error || !data) {
      return res.status(401).json({ error: "Token inválido o expirado." });
    }

    // Actualizar último uso
    await supabase.from('api_settings').update({ ultimo_uso: new Date().toISOString() }).eq('api_token', token);
    next();
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error during auth" });
  }
};

// Despachador de Webhooks: Busca suscripciones y envía el payload
const triggerWebhooks = async (evento, payload) => {
  try {
    const { data: subs, error } = await supabase
      .from('webhook_subscriptions')
      .select('url')
      .eq('evento', evento)
      .eq('activo', true);

    if (error || !subs || subs.length === 0) return;

    console.log(`📡 Disparando ${subs.length} webhooks para evento: ${evento}`);

    subs.forEach(sub => {
      axios.post(sub.url, {
        event: evento,
        timestamp: new Date().toISOString(),
        data: payload
      }, { timeout: 5000 }).catch(e => console.error(`❌ Fallo al enviar webhook a ${sub.url}:`, e.message));
    });
  } catch (err) {
    console.error("Error en dispatcher de webhooks:", err.message);
  }
};

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => res.send('CRM WhatsApp Multi-Account Server is Running! 🚀'));
app.get('/health', (req, res) => {
  const activeInstances = Object.keys(whatsappInstances).map(id => ({ id, ready: whatsappInstances[id].ready }));
  res.json({ status: 'ok', instances: activeInstances, count: activeInstances.length });
});
app.get('/qr', (req, res) => {
  if (latestQRUrl) return res.json({ qr: latestQRUrl });
  res.status(404).json({ error: "No hay QR generado aún." });
});
app.get('/qr/:id', (req, res) => {
  const id = req.params.id;
  if (id && whatsappInstances[id]?.qr) return res.json({ qr: whatsappInstances[id].qr });
  res.status(404).json({ error: "ID de cuenta inválido o sin QR." });
});

/* ═══════════════════════════════════════════
   API V1: EXTERNAL ENDPOINTS (Phase 42)
   ═══════════════════════════════════════════ */

// Consultar Negocios (Deals) desde externo
app.get('/api/v1/deals', authenticateApi, async (req, res) => {
  try {
    const { data, error } = await supabase.from('deals').select('*, contactos(*)').order('creado', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear Lead desde externo (ej: Formulario propio o Zapier)
app.post('/api/v1/leads', authenticateApi, async (req, res) => {
  const { nombre, email, telefono, titulo_deal, valor } = req.body;

  if (!nombre || !telefono) {
    return res.status(400).json({ error: "Nombre y teléfono son obligatorios." });
  }

  try {
    // 1. Crear Contacto
    const { data: contacto, error: errC } = await supabase.from('contactos').insert({
      id: "c_api_" + Date.now(),
      nombre,
      email,
      telefono,
      estado: 'lead',
      fuente: 'API Gate'
    }).select().single();
    if (errC) throw errC;

    // 2. Crear Deal
    const { data: deal, error: errD } = await supabase.from('deals').insert({
      id: "d_api_" + Date.now(),
      titulo: titulo_deal || `Nuevo Lead API - ${nombre}`,
      contacto_id: contacto.id,
      etapa_id: 'et1',
      valor: valor || 0
    }).select().single();
    if (errD) throw errD;

    // Disparar Webhook de nuevo lead
    triggerWebhooks('lead.nuevo', { contacto, deal });

    res.status(201).json({ success: true, contactoId: contacto.id, dealId: deal.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


/* ═══════════════════════════════════════════
   API ADMIN: CREAR USUARIOS SIN CAMBIAR SESIÓN
   Usa service_role key del servidor para crear
   usuarios sin afectar la sesión del admin.
   ═══════════════════════════════════════════ */

// Cliente Supabase Admin (service_role) — solo en servidor, nunca en frontend
const supabaseAdmin = createClient(
  process.env.SUPA_URL || "https://eoylgxwlhsmwqgadahvk.supabase.co",
  process.env.SUPA_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/admin/create-user
// Crea usuario en Auth + perfil en usuariosApp SIN tocar la sesión actual
app.post('/api/admin/create-user', async (req, res) => {
  const { name, email, password, role, org_id } = req.body;
  if (!name || !email || !password || !org_id) {
    return res.status(400).json({ error: "Faltan campos obligatorios: name, email, password, org_id." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contrasena debe tener al menos 6 caracteres." });
  }
  try {
    // 1. Crear en Supabase Auth con admin API (no cambia sesion del caller)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, org_id }
    });
    if (authError) {
      logFile("Error creando Auth user: " + authError.message);
      return res.status(400).json({ error: authError.message });
    }
    const userId = authData.user?.id;
    logFile("Usuario Auth creado: " + email + " (" + userId + ")");

    // 2. Insertar perfil en usuariosApp
    const initials = name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    const newProfile = {
      id: userId,
      name: name,
      email: email,
      role: role || "ventas",
      avatar: initials,
      org_id: org_id,
      activo: true,
      creado: new Date().toISOString()
    };
    const { error: profileError } = await supabaseAdmin.from('usuariosApp').upsert(newProfile);
    if (profileError) {
      logFile("Auth OK pero fallo en perfil: " + profileError.message);
      return res.status(500).json({ error: "Usuario creado pero fallo al guardar perfil: " + profileError.message });
    }
    logFile("Perfil guardado para " + email);
    res.status(201).json({ success: true, user: newProfile });
  } catch (e) {
    logFile("Error critico create-user: " + e.message);
    res.status(500).json({ error: e.message });
  }
});
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// ═══════════════════════════════════════════
// PHASE 42: WHATSAPP MULTI-ACCOUNT ENGINE
// ═══════════════════════════════════════════

const whatsappInstances = {}; // { [accountId]: { client, ready, qr, orgId } }
let autoRules = [];

// Función para inicializar un cliente de WhatsApp específico
async function initWhatsAppAccount(accountId, orgId) {
  if (whatsappInstances[accountId]) {
    logFile(`⚠️ [WA] La cuenta ${accountId} ya está inicializada.`);
    return whatsappInstances[accountId];
  }

  logFile(`🚀 [WA] Inicializando cuenta ${accountId} (Org: ${orgId})...`);

  // Cada cuenta usa su propia carpeta de sesión aislada
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: accountId }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']
    }
  });

  const instance = { client, ready: false, qr: "", orgId, accountId };
  whatsappInstances[accountId] = instance;

  client.on('qr', async (qr) => {
    try {
      const qrDataUrl = await qrcode.toDataURL(qr);
      instance.qr = qrDataUrl;
      instance.ready = false;
      logFile(`✨ [WA] QR generado para cuenta ${accountId} (Enviando a sala org_${orgId})`);
      latestQRUrl = qrDataUrl; // Fallback global
      io.to(`org_${orgId}`).emit('whatsapp_qr', { accountId, qr: qrDataUrl });
    } catch (err) {
      logFile(`❌ [WA QR Error] Account ${accountId}: ${err.message}`);
    }
  });

  client.on('ready', () => {
    logFile(`✅ [WA] Cuenta ${accountId} lista!`);
    instance.ready = true;
    instance.qr = "";
    // Notificar al frontend que esta cuenta específica está lista
    io.to(`org_${orgId}`).emit('whatsapp_ready', { accountId });
    // Actualizar estado en DB
    supabase.from('whatsapp_accounts').update({ estado: 'conectado' }).eq('id', accountId).then(() => { });
  });

  client.on('authenticated', () => logFile(`🔓 [WA] Cuenta ${accountId} autenticada.`));
  client.on('auth_failure', (msg) => logFile(`❌ [WA] Fallo de autenticación en ${accountId}: ${msg}`));

  client.on('message_create', async (msg) => {
    if (msg.isStatus || msg.from === 'status@broadcast') return;

    logFile(`📩 [WA] Msg en ${accountId}: ${msg.body}`);

    // Sincronizar con el frontend (solo a la organización correcta)
    const finalChatId = msg.fromMe ? msg.to : msg.from;
    const activeDealId = await getActiveDealId(finalChatId);

    // Extraer nombre e información del contacto para mandarlo al frontend
    let contactName = null;
    let contactNumber = null;
    try {
      const contact = await msg.getContact();
      contactName = contact.name || contact.pushname || contact.shortName || null;
      contactNumber = contact.number || null;
    } catch (err) {
      // Ignorar si falla getContact
    }

    let finalId = msg.id?._serialized;
    if (!finalId) {
      finalId = typeof msg.id === 'string' ? msg.id : `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    const msgData = {
      id: finalId,
      chat_id: finalChatId,
      body: msg.body || '',
      from_me: msg.fromMe ? true : false,
      timestamp: msg.timestamp || msg.t || Math.floor(Date.now() / 1000),
      ack: msg.ack || 0,
      has_media: msg.hasMedia || false,
      deal_id: activeDealId || null,
      account_id: accountId, // <--- CRÍTICO
      contact_name: contactName,
      contact_number: contactNumber
    };

    io.to(`org_${orgId}`).emit('whatsapp_message', msgData);

    // Persistencia — solo columnas que existen en la tabla
    const persistData = {
      id: finalId,
      chat_id: finalChatId,
      body: msg.body || '',
      from_me: msg.fromMe ? true : false,
      timestamp: msg.timestamp || msg.t || Math.floor(Date.now() / 1000),
      ack: msg.ack || 0,
      has_media: msg.hasMedia || false,
      deal_id: activeDealId || null,
      account_id: accountId,
      org_id: orgId
    };

    const { error: upsertErr } = await supabase.from('whatsapp_messages').upsert(persistData, { onConflict: 'id' });

    if (upsertErr) logFile(`⚠️ [WA Message Persist Error]: ${upsertErr.message}`);

    // Procesar automatizaciones... (Implementaremos el filtrado por account_id en el motor de reglas)
    if (!msg.fromMe) {
      handleChatbotRules(accountId, orgId, msg);
    }
  });

  client.on('message_ack', async (msg, ack) => {
    io.to(`org_${orgId}`).emit('whatsapp_message_ack', {
      id: msg.id._serialized,
      chat_id: msg.from === client.info.wid._serialized ? msg.to : msg.from,
      ack,
      accountId
    });

    // Guardar el estado de lectura (ack) en la base de datos
    await supabase.from('whatsapp_messages')
      .update({ ack })
      .eq('id', msg.id._serialized);
  });

  client.initialize().catch(e => logFile(`❌ [WA Init Fail] ${accountId}: ${e.message}`));
  return instance;
}

// Cargar todas las cuentas al arrancar el servidor
async function bootWhatsAppAccounts() {
  logFile("📡 [WA] Cargando cuentas desde Supabase...");
  const { data: accounts, error } = await supabase.from('whatsapp_accounts').select('*').eq('activo', true);

  if (error) {
    logFile(`❌ [WA] Error al cargar cuentas: ${error.message}`);
    return;
  }

  logFile(`ℹ️ [WA] Se encontraron ${accounts.length} cuentas activas para inicializar.`);
  for (const acc of accounts) {
    await initWhatsAppAccount(acc.id, acc.org_id);
  }
}

// Reemplazar la inicialización única
bootWhatsAppAccounts();


// Cargar reglas desde Supabase al iniciar
// Endpoint interno para disparar webhooks desde el frontend (sin auth para simplicidad de puente local)
app.post('/api/internal/trigger-webhook', async (req, res) => {
  const { event, payload } = req.body;
  triggerWebhooks(event, payload);
  res.json({ ok: true });
});

async function loadAutoRules() {
  try {
    console.log("📡 Conectando a Supabase para cargar reglas...");
    const { data, error } = await supabase.from('whatsapp_automations').select('*');

    if (error) {
      console.error("❌ Error de Supabase al cargar reglas:", error.message, error.hint);
      return;
    }

    console.log(`📊 Consulta exitosa. Filas encontradas: ${data?.length || 0}`);

    if (!data || data.length === 0) {
      console.log("⚠️ No hay reglas en 'whatsapp_automations'. Intentando 'chatbotRules'...");
      const { data: altData } = await supabase.from('chatbotRules').select('*');
      if (altData && altData.length > 0) {
        autoRules = altData.map(r => ({ ...r, keyword: (r.trigger || r.keyword || "").toLowerCase() }));
        console.log(`✅ ${autoRules.length} reglas cargadas desde tabla alternativa.`);
        return;
      }
    }

    // Filtrar las no activas y normalizar keywords
    autoRules = (data || []).filter(r => r.active !== false).map(r => ({
      ...r,
      keyword: (r.keyword || "").toLowerCase()
    }));

    console.log(`🤖 Bot listo: ${autoRules.length} reglas activas cargadas.`);
    if (autoRules.length > 0) {
      console.log("Keywords detectados:", autoRules.map(r => r.keyword).join(", "));
    }
  } catch (err) {
    console.error("Error crítico inicializando reglas:", err.message);
  }
}

loadAutoRules();

io.on('connection', (socket) => {
  console.log('🔌 Nuevo cliente socket conectado:', socket.id);

  // Unirse a la sala de la organización para recibir eventos segmentados
  socket.on('join_org', (orgId) => {
    if (orgId) {
      socket.join(`org_${orgId}`);
      logFile(`👤 [Socket] Cliente unido a sala org_${orgId}`);
    }
  });

  // Escuchar actualizaciones de reglas de WhatsApp en tiempo real
  socket.on('whatsapp_update_rules', (data) => {
    if (data && data.rules) {
      autoRules = data.rules.filter(r => r.active !== false).map(r => ({
        ...r,
        keyword: (r.keyword || "").toLowerCase()
      }));
      logFile(`✅ [WhatsApp Bot] Reglas actualizadas en tiempo real: ${autoRules.length} reglas activas.`);
    } else {
      loadAutoRules(); // Fallback si no envían las reglas, recargar de DB
    }
  });

  // Fallback: Disparar workflow manualmente desde el frontend
  socket.on('workflow_trigger', async (data) => {

    const { dealId, etapaId } = data;
    logFile(`🔌 [Socket] Recibido workflow_trigger para deal ${dealId} -> Etapa ${etapaId}`);

    const { data: deal, error: dealErr } = await supabase.from('deals').select('*').eq('id', dealId).single();
    if (!dealErr && deal) {
      const { data: rules, error: rulesErr } = await supabase
        .from('automatizaciones')
        .select('*')
        .eq('etapa_id', etapaId || deal.etapa_id)
        .eq('activo', true);

      if (!rulesErr && rules && rules.length > 0) {
        logFile(`⚙️ [Socket Workflow] ${rules.length} reglas encontradas.`);
        for (const rule of rules) {
          if (evaluateConditions(rule.config || {}, deal)) {
            await executeRuleAction(rule, deal);
          }
        }
      }
    }
  });

  socket.on('get_whatsapp_status', (data) => {
    const { accountId } = data;
    const instance = whatsappInstances[accountId];
    if (instance) {
      if (instance.ready) socket.emit('whatsapp_ready', { accountId });
      else if (instance.qr) socket.emit('whatsapp_qr', { accountId, qr: instance.qr });
    }
  });

  socket.on('get_whatsapp_chats', async (data) => {
    const { accountId } = data;
    const instance = whatsappInstances[accountId];
    if (!instance || !instance.ready) return;

    try {
      // Extraer todos los chats directamente desde la memoria profunda de WhatsApp Web
      // Esto esquiva el bug de whatsapp-web.js que devuelve vacío si hay LIDs o cambios en la UI de Meta
      let rawChats = [];
      try {
        rawChats = await instance.client.pupPage.evaluate(() => {
          try {
            if (!window.Store || !window.Store.Chat) return [];
            return window.Store.Chat.getModelsArray().map(c => {
              let lastMsg = '';
              try {
                if (c.msgs && c.msgs.length > 0) {
                  const m = c.msgs[c.msgs.length - 1];
                  lastMsg = m.body || m.text || '';
                }
              } catch (e) { }
              return {
                id: c.id._serialized,
                user: c.id.user,
                name: c.name || c.formattedTitle || c.id.user,
                timestamp: c.t,
                lastMessage: lastMsg
              };
            }).filter(c => c && c.id !== 'status@broadcast');
          } catch (e) {
            return [];
          }
        });
      } catch (evaluateErr) {
        // Fallback si puppeteer falla
        try {
          const chats = await instance.client.getChats();
          rawChats = chats.map(c => ({
            id: c.id._serialized,
            user: c.id.user,
            name: c.name || c.id.user,
            timestamp: c.timestamp,
            lastMessage: c.lastMessage ? c.lastMessage.body : ''
          }));
        } catch (e) { }
      }

      let list = (rawChats || []).slice(0, 50).map(c => ({
        id: { _serialized: c.id, user: c.user },
        name: c.name,
        timestamp: c.timestamp,
        lastMessage: c.lastMessage ? { body: c.lastMessage } : null
      }));

      // Obtener contactos para cruzar nombres si whatsapp-web.js devuelve números raros
      try {
        const rawContacts = await instance.client.pupPage.evaluate(() => {
          try {
            return window.Store.Contact.getModelsArray().map(c => ({
              id: c.id._serialized,
              name: c.name,
              pushname: c.pushname,
              number: c.userid || c.id.user,
              lid: c.lid
            }));
          } catch (e) {
            return [];
          }
        });

        const contactMap = new Map();
        rawContacts.forEach(c => {
          contactMap.set(c.id, c.name || c.pushname || c.number);
          // Mapear también LIDs si existen
          if (c.lid) contactMap.set(c.lid, c.name || c.pushname || c.number);
          if (c.lid) contactMap.set(c.lid + '@lid', c.name || c.pushname || c.number);
        });

        list = list.map(chat => {
          let realName = contactMap.get(chat.id._serialized);

          if (realName && chat.name === chat.id.user) {
            chat.name = realName;
          }
          return chat;
        });
      } catch (e) { }

      // Fallback a base de datos si whatsapp-web.js devuelve vacío temporalmente
      if (list.length === 0) {
        logFile(`⚠️ [WA] getChats vacío para ${accountId}. Recurriendo a BD...`);
        const { data: msgs } = await supabase
          .from('whatsapp_messages')
          .select('chat_id, body, timestamp, contact_name, contact_number')
          .eq('account_id', accountId)
          .order('timestamp', { ascending: false })
          .limit(200);

        if (msgs && msgs.length > 0) {
          const uniqueChats = new Map();
          msgs.forEach(m => {
            if (!uniqueChats.has(m.chat_id)) {
              const phoneNum = m.contact_number || m.chat_id.split('@')[0];
              uniqueChats.set(m.chat_id, {
                id: { _serialized: m.chat_id, user: phoneNum },
                name: m.contact_name || phoneNum,
                timestamp: m.timestamp,
                lastMessage: { body: m.body }
              });
            }
          });
          list = Array.from(uniqueChats.values()).slice(0, 30);
        }
      }

      socket.emit('whatsapp_chats_list', { accountId, chats: list });
    } catch (e) {
      logFile(`❌ [WA GetChats Error] ${accountId}: ${e.message}`);
    }
  });

  socket.on('whatsapp_get_avatar', async (data) => {
    const { accountId, chatId } = data;
    const instance = whatsappInstances[accountId];
    if (!instance) return;
    try {
      const url = await instance.client.getProfilePicUrl(chatId);
      if (url) socket.emit('whatsapp_avatar_res', { accountId, id: chatId, url });
    } catch (e) { }
  });

  socket.on('whatsapp_get_chat', async (data) => {
    const { accountId, chatId } = data;
    const instance = whatsappInstances[accountId];
    if (!instance || !instance.client || !instance.client.pupPage) return;
    try {
      // Usar inyector profundo para extraer el historial sin pasar por whatsapp-web.js (que está crasheando)
      const rawMsgs = await instance.client.pupPage.evaluate(async (cId) => {
        try {
          const chat = window.Store.Chat.get(cId);
          if (!chat) return [];

          // Cargar mensajes previos si es necesario
          if (chat.msgs.models.length < 50) {
            try { await window.Store.Cmd.loadEarlierMsgs(chat); } catch (e) { }
          }

          return chat.msgs.getModelsArray().slice(-50).map(m => {
            return {
              id: m.id._serialized,
              from: m.from ? m.from._serialized : (m.id.fromMe ? chat.id._serialized : cId),
              to: m.to ? m.to._serialized : (m.id.fromMe ? cId : chat.id._serialized),
              body: m.body || m.text || '',
              fromMe: m.id.fromMe,
              timestamp: m.t || m.timestamp || m.messageTimestamp || Math.floor(Date.now() / 1000),
              ack: m.ack,
              hasMedia: m.isMedia || m.hasMedia,
              mimeType: m.mimetype || null,
              fileName: m.filename || null
            };
          });
        } catch (e) {
          return [];
        }
      }, chatId);

      const wid = instance.client.info?.wid?._serialized || '';

      const history = rawMsgs.map(msg => ({
        id: msg.id,
        chat_id: msg.from === wid ? msg.to : (msg.fromMe ? msg.to : msg.from),
        body: msg.body,
        from_me: msg.fromMe,
        timestamp: msg.timestamp,
        ack: msg.ack,
        account_id: accountId,
        has_media: msg.hasMedia,
        mime_type: msg.mimeType,
        file_name: msg.fileName
      }));

      // Fusionar con mensajes locales (base de datos) por si hay más historia o no cargaron todos
      const { data: dbMsgs } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('chat_id', chatId)
        .eq('account_id', accountId)
        .order('timestamp', { ascending: false })
        .limit(50);

      let finalHistory = [...history];
      if (dbMsgs && dbMsgs.length > 0) {
        dbMsgs.forEach(dbm => {
          if (!finalHistory.find(m => m.id === dbm.id)) {
            finalHistory.push(dbm);
          }
        });
        finalHistory.sort((a, b) => a.timestamp - b.timestamp);
      }

      socket.emit('whatsapp_chat_history', { accountId, chatId, messages: finalHistory });
    } catch (e) {
      logFile(`❌ [WA GetChat Error] ${accountId}: ${e.message}`);
    }
  });

  socket.on('whatsapp_send_message', async (data) => {
    const { accountId, to, text, clientId, org_id } = data;
    const instance = whatsappInstances[accountId];
    if (!instance || !instance.ready) return;

    try {
      const sentMsg = await instance.client.sendMessage(to, text);
      const activeDealId = data.dealId || await getActiveDealId(to);
      const msgOut = {
        id: sentMsg?.id?._serialized || `out_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        chat_id: to,
        body: sentMsg?.body || text,
        from_me: true,
        timestamp: sentMsg?.timestamp || Math.floor(Date.now() / 1000),
        ack: sentMsg?.ack || 0,
        deal_id: activeDealId || null,
        account_id: accountId
      };
      socket.emit('whatsapp_message', { ...msgOut, clientId });
      await supabase.from('whatsapp_messages').upsert({ ...msgOut, org_id: org_id }, { onConflict: 'id' });
    } catch (e) {
      logFile(`❌ [WA Send Error] ${accountId}: ${e.message}`);
    }
  });

  socket.on('whatsapp_send_media', async (data) => {
    const { accountId, to, mediaData, fileName, caption, clientId, org_id } = data;
    const instance = whatsappInstances[accountId];
    if (!instance || !instance.ready) return;

    try {
      const matches = mediaData.match(/^data:(.+?);base64,(.+)$/);
      if (!matches) throw new Error('Formato base64 inválido');
      const media = new MessageMedia(matches[1], matches[2], fileName);

      const sentMsg = await instance.client.sendMessage(to, media, {
        caption: caption || "",
        sendMediaAsDocument: !matches[1].startsWith('image/')
      });

      const activeDealId = await getActiveDealId(to);
      const msgOut = {
        id: sentMsg.id._serialized,
        chat_id: to,
        body: sentMsg.body || caption,
        from_me: true,
        timestamp: sentMsg.timestamp,
        ack: sentMsg.ack,
        has_media: true,
        file_name: fileName,
        mime_type: matches[1],
        deal_id: activeDealId || null,
        account_id: accountId
      };
      socket.emit('whatsapp_message', { ...msgOut, clientId });
      await supabase.from('whatsapp_messages').upsert({ ...msgOut, org_id: org_id }, { onConflict: 'id' });
    } catch (e) {
      logFile(`❌ [WA Media Error] ${accountId}: ${e.message}`);
    }
  });


  socket.on('whatsapp_update_rules', (rules) => {
    console.log(`🔄 Sincronización: Recibidas ${rules?.length || 0} reglas del frontend.`);
    if (Array.isArray(rules)) {
      autoRules = rules;
      console.log("Keywords sincronizados:", autoRules.map(r => r.keyword).join(", "));
    }
  });

  socket.on('whatsapp_logout', async (data) => {
    const { accountId } = data;
    const instance = whatsappInstances[accountId];
    if (!instance) return;

    logFile(`🚩 [WA] Solicitud de cierre de sesión para ${accountId}`);
    try {
      await instance.client.logout();
      await instance.client.destroy();
      delete whatsappInstances[accountId];
      // Actualizar DB
      await supabase.from('whatsapp_accounts').update({ estado: 'desconectado', numero: null }).eq('id', accountId);
      socket.emit('whatsapp_disconnected', { accountId });
    } catch (e) {
      logFile(`❌ [WA Logout Error] ${accountId}: ${e.message}`);
    }
  });

  socket.on('init_whatsapp_account', async (data) => {
    const { accountId, orgId } = data;
    await initWhatsAppAccount(accountId, orgId);
  });

  socket.on('disconnect', () => {
    console.log('Cliente Web CRM desconectado');
  });
});


// (Eliminamos los antiguos listeners globales fuera del socket)


// Función para obtener el Deal ID activo de un contacto
async function getActiveDealId(chatId) {
  try {
    const phone = chatId.split('@')[0];

    // 1. Buscar contacto
    const { data: contacto } = await supabase.from('contactos').select('id').eq('telefono', phone).maybeSingle();
    if (!contacto) return null;

    // 2. Buscar Deal más reciente que NO sea Ganado ni Perdido
    // Para simplificar, buscamos deals asociados al contacto
    const { data: deal } = await supabase
      .from('deals')
      .select('id, etapa_id')
      .eq('contacto_id', contacto.id)
      .order('creado', { ascending: false })
      .limit(1)
      .maybeSingle();

    return deal?.id || null;
  } catch (e) {
    console.error("Error obteniendo Deal ID activo:", e.message);
    return null;
  }
}

// Función para crear Lead Automático
async function handleAutoLead(msg) {
  try {
    const contactId = msg.from;
    const phone = contactId.split('@')[0];

    // 1. Verificar si el contacto ya existe
    const { data: existente } = await supabase.from('contactos').select('id').eq('telefono', phone).maybeSingle();
    if (existente) return existente.id;

    console.log(`✨ Creando Lead Automático para: ${phone}`);

    // 2. Crear Contacto
    const newContact = {
      id: crypto?.randomUUID?.() || `c_${Date.now()}`,
      nombre: `WhatsApp ${phone}`,
      telefono: phone,
      estado: 'lead',
      fuente: 'WhatsApp Bot',
      creado: new Date().toISOString().split('T')[0]
    };

    const { error: errC } = await supabase.from('contactos').insert(newContact);
    if (errC) throw errC;

    // 3. Crear Deal (Oportunidad)
    const newDeal = {
      id: crypto?.randomUUID?.() || `d_${Date.now()}`,
      titulo: `Oportunidad WhatsApp - ${phone}`,
      contacto_id: newContact.id,
      etapa_id: 'et1', // Nuevo Lead
      valor: 0,
      creado: new Date().toISOString().split('T')[0]
    };
    await supabase.from('deals').insert(newDeal);

    return newContact.id;
  } catch (e) {
    console.error("Error en handleAutoLead:", e.message);
  }
}

// Función para obtener respuesta de AI (Gemini)
async function getAIResponse(userText, isRawPrompt = false) {
  if (!GEMINI_API_KEY) return null;
  try {
    const prompt = isRawPrompt ? userText : `Eres un asistente de ventas de ENSING CRM. Responde de forma amable, profesional y concisa. Cliente dice: "${userText}"`;
    // Usamos gemini-1.5-flash que es más estable y tiene límites más altos en nivel gratuito
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (e) {
    if (e.response?.status === 429) {
      console.error("⚠️ Gemini: Límite de cuota excedido (Rate Limit).");
    } else {
      console.error("Error en Gemini AI:", e.message);
    }
    return null;
  }
}

// Función para obtener respuesta de OpenAI (ChatGPT)
async function getGPTResponse(prompt, model = "gpt-4o-mini") {
  if (!OPENAI_API_KEY) return null;
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data?.choices?.[0]?.message?.content;
  } catch (e) {
    console.error("Error en OpenAI AI:", e.response?.data?.error?.message || e.message);
    return null;
  }
}

// Motor de AI Unificado (Detecta mejor proveedor disponible)
async function getUnifiedAIResponse(userText, isRawPrompt = false) {
  const prompt = isRawPrompt ? userText : `Eres un asistente de ventas de ENSING CRM. Responde de forma amable, profesional y concisa. Cliente dice: "${userText}"`;

  // 1. Prioridad: OpenAI
  if (OPENAI_API_KEY) {
    const res = await getGPTResponse(prompt);
    if (res) return res;
  }

  // 2. Fallback: Gemini
  if (GEMINI_API_KEY) {
    const res = await getAIResponse(userText, isRawPrompt);
    if (res) return res;
  }

  return null;
}

// Función para transcribir audios con Gemini
async function transcribeAudio(media) {
  if (!GEMINI_API_KEY || !media) return null;
  try {
    console.log(`🎙️ Transcribiendo audio (${media.mimetype})...`);

    // Preparar el cuerpo para Gemini multimodal
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [
          { text: "Eres un transcriptor preciso. Transcribe exactamente lo que se dice en este audio de WhatsApp. Si no hay voz inteligible, responde '[No se detectó voz clara]'." },
          { inline_data: { mime_type: media.mimetype, data: media.data } }
        ]
      }]
    });

    const transcription = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`✅ Transcripción: ${transcription}`);
    return transcription;
  } catch (e) {
    console.error("Error transcribiendo con Gemini:", e.message);
    return "[Error en transcripción automática]";
  }
}

// Función para sugerir tareas automáticamente basado en el chat
async function suggestCRMTask(chatId, messageText) {
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) return;
  try {
    const prompt = `
      Analiza este mensaje de un chat de ventas y determina si implica una TAREA o COMPROMISO a futuro (ej: llamar, enviar info, revisar presupuesto).
      Mensaje: "${messageText}"
      
      Si hay un compromiso, responde ÚNICAMENTE un objeto JSON con este formato:
      {"tarea": "Título breve de la tarea", "dias": número_de_dias_en_el_futuro}
      Si NO hay compromiso claro, responde: null
    `;

    let aiText = "";
    if (OPENAI_API_KEY) {
      aiText = await getGPTResponse(prompt);
    } else {
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      });
      aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }
    if (!aiText || aiText.trim() === 'null') return;

    const data = JSON.parse(aiText.match(/\{.*\}/s)?.[0] || 'null');
    if (data && data.tarea) {
      // 1. Buscar contacto vinculado
      const phone = chatId.split('@')[0];
      const { data: contacto } = await supabase.from('contactos').select('id, nombre').eq('telefono', phone).maybeSingle();

      if (contacto) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + (data.dias || 1));

        const nuevaTarea = {
          id: `task_ai_${Date.now()}`,
          titulo: data.tarea,
          contactoId: contacto.id,
          prioridad: 'media',
          estado: 'pendiente',
          asignado: 'Sistema (AI)',
          vencimiento: deadline.toISOString().split('T')[0],
          descripcion: `Sugerida automáticamente por IA basado en el chat con ${contacto.nombre}`
        };

        await supabase.from('tareas').insert(nuevaTarea);
        console.log(`📌 Tarea AI creada: ${data.tarea} para el ${nuevaTarea.vencimiento}`);
      }
    }
  } catch (e) {
    console.error("Error sugiriendo tarea con AI:", e.message);
  }
}

// ENDPOINT: Análisis de Negocio Proactivo
app.post('/ai/analyze', async (req, res) => {
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return res.status(500).json({ error: "No hay API Key de AI (Gemini u OpenAI) configurada." });
  }

  try {
    const { deals, contactos, actividades, tareas } = req.body;

    const prompt = `
      Eres un experto analista de ventas y estrategia de negocios para el CRM "ENSING". 
      Analiza los siguientes datos y genera un reporte PROACTIVO y MOTIVADOR para el usuario.
      
      DATOS:
      - Oportunidades: ${JSON.stringify(deals?.slice(0, 15))}
      - Contactos Recientes: ${JSON.stringify(contactos?.slice(0, 5))}
      - Actividades/Tareas: ${JSON.stringify(tareas?.slice(0, 10))}
      
      INSTRUCCIONES:
      1. Identifica los 3 deals más importantes que se deben cerrar esta semana.
      2. Detecta si hay clientes "atascados" (sin actividad reciente).
      3. Da un consejo estratégico para mejorar la conversión.
      4. Estima el revenue potencial para el periodo.
      
      FORMATO: Responde en Markdown elegante, usa emojis, negritas y listas. Sé breve pero impactante.
    `;

    let analysis = "";
    if (OPENAI_API_KEY) {
      analysis = await getGPTResponse(prompt, "gpt-4o");
    } else {
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      });
      analysis = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    res.json({ analysis });
  } catch (e) {
    const errorMsg = e.response?.data?.error?.message || e.message || "Error desconocido en el servidor AI";
    console.error("❌ Error en /ai/analyze:", errorMsg);
    res.status(500).json({ error: `Error procesando el análisis: ${errorMsg}` });
  }
});

// 🤖 MOTOR DE BOT UNIFICADO PARA MULTI-CUENTA
async function handleChatbotRules(accountId, orgId, msg) {
  try {
    const instance = whatsappInstances[accountId];
    if (!instance) return;

    // 1. LEAD AUTOMÁTICO: Asegurar que el contacto existe en CRM
    await handleAutoLead(msg);
    const activeDealId = await getActiveDealId(msg.from);

    const text = msg.body.toLowerCase();
    let responded = false;

    // 2. TRANSCRIPCIÓN DE AUDIOS
    if (msg.hasMedia && (msg.type === 'audio' || msg.type === 'voice')) {
      const media = await msg.downloadMedia();
      if (media && media.mimetype?.startsWith('audio/')) {
        const transcript = await transcribeAudio(media);
        if (transcript) {
          const transcriptMsg = `🎤 [Audio Transcrito]: ${transcript}`;
          io.to(`org_${orgId}`).emit('whatsapp_message', { chat_id: msg.from, body: transcriptMsg, account_id: accountId });
        }
      }
    }

    // 3. AUTO-RESPUESTAS POR PALABRA CLAVE
    for (let rule of autoRules) {
      // Filtrar reglas por cuenta si la regla tiene account_id, sino aplicar a todas (o filtrar por org_id)
      if (rule.account_id && rule.account_id !== accountId) continue;
      if (rule.org_id && rule.org_id !== orgId) continue;

      // Regex para coincidencia exacta de palabra o frase (ignorando puntuación adyacente)
      const regex = new RegExp(`\\b${rule.keyword}\\b`, 'i');
      
      if (regex.test(text)) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = (rule.start_time || "00:00").split(':').map(Number);
        const [endH, endM] = (rule.end_time || "23:59").split(':').map(Number);
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;

        if (currentTime >= startTime && currentTime <= endTime) {
          responded = true;
          const chat = await msg.getChat();
          await chat.sendStateTyping();

          const finalDelay = Math.max(1500, (parseFloat(rule.delay) || 0) * 1000);

          setTimeout(async () => {
            let finalReply = rule.reply_text || "";
            if (rule.ai_prompt && (GEMINI_API_KEY || OPENAI_API_KEY)) {
              const aiResult = await getUnifiedAIResponse(`${rule.ai_prompt}. El cliente dijo: "${msg.body}"`, true);
              if (aiResult) finalReply = aiResult;
            }

            if (rule.media_url) {
              const media = await MessageMedia.fromUrl(rule.media_url).catch(() => null);
              if (media) await instance.client.sendMessage(msg.from, media, { caption: finalReply });
              else if (finalReply) await msg.reply(finalReply);
            } else if (finalReply) {
              await msg.reply(finalReply);
            }

            const botReply = {
              id: `bot_${Date.now()}`,
              chat_id: msg.from,
              body: finalReply || "Archivo enviado",
              from_me: true,
              timestamp: Math.floor(Date.now() / 1000),
              ack: 1,
              account_id: accountId
            };
            io.to(`org_${orgId}`).emit('whatsapp_message', botReply);
            await supabase.from('whatsapp_messages').insert({ ...botReply, org_id: orgId });
          }, finalDelay);
          break;
        }
      }
    }

    // Se ha eliminado la IA Global (General AI) por defecto.
    // El bot solo responderá a reglas específicas o reglas con AI Prompt configurado
    // para evitar spam y respuestas no deseadas a mensajes personales.

    // 5. SUGERENCIA DE TAREAS
    suggestCRMTask(msg.from, msg.body);

  } catch (e) {
    logFile(`❌ [WA Bot Error] ${accountId}: ${e.message}`);
  }
}


// Removida inicialización única redundante (Se usa bootWhatsAppAccounts)
// logFile('Iniciando Cliente WhatsApp... (Multi-Account Enabled)');

/* ═══════════════════════════════════════════
   PHASE 43: EMAIL BRIDGE (IMAP & SMTP)
   ═══════════════════════════════════════════ */

// Función para refrescar tokens de Google/Microsoft
async function refreshAccessToken(accountId) {
  try {
    const { data: acc, error } = await supabase.from('email_accounts').select('*').eq('id', accountId).single();
    if (error || !acc || !acc.refresh_token) return null;

    console.log(`🔄 Refrescando token para ${acc.email} (${acc.provider})...`);
    let url = "";
    let body = {};

    if (acc.provider === 'google') {
      url = "https://oauth2.googleapis.com/token";
      body = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: acc.refresh_token,
        grant_type: 'refresh_token'
      };
    } else if (acc.provider === 'azure') {
      url = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;
      body = {
        client_id: process.env.AZURE_CLIENT_ID,
        client_secret: process.env.AZURE_CLIENT_SECRET,
        refresh_token: acc.refresh_token,
        grant_type: 'refresh_token',
        scope: 'offline_access Mail.Read Calendars.Read'
      };
    }

    const res = await axios.post(url, new URLSearchParams(body));
    const { access_token, expires_in } = res.data;

    if (!access_token) {
      logFile(`❌ [Refresh] No se recibió access_token para ${accountId}`);
      return null;
    }

    const updates = {
      access_token,
      expires_at: new Date(Date.now() + (expires_in * 1000)).toISOString()
    };
    await supabase.from('email_accounts').update(updates).eq('id', accountId);
    logFile(`✅ [Refresh] Token renovado con éxito para ${accountId}`);
    return access_token;
  } catch (e) {
    const errorMsg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    logFile(`❌ Error refrescando token para ${accountId}: ${errorMsg}`);
    return null;
  }
}
// Sincronizar correos de Azure/Microsoft vía Graph API (Bypasses IMAP Block)
async function syncAzureEmails(accountId, acc, log) {
  try {
    let token = acc.access_token;
    if (acc.expires_at && new Date(acc.expires_at) <= new Date()) {
      log(`🔄 [Graph API] Token expirado para ${accountId}. Refrescando...`);
      token = await refreshAccessToken(accountId);
      if (!token) return { error: "Authentication failed (expired token)" };
    }

    log(`📂 [Graph API] Obteniendo últimos 50 correos...`);
    const { data: messagesData } = await axios.get('https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,conversationId,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,hasAttachments', {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.body-content-type="html"'
      }
    });

    const messages = messagesData.value || [];
    log(`📥 [Graph API] Procesando ${messages.length} correos.`);

    let totalCount = 0;
    for (const msg of messages) {
      try {
        const msgId = msg.id;
        const requireCrypto = require('crypto');
        const deterministicId = "em_" + requireCrypto.createHash('md5').update(msgId).digest('hex');

        const fromEmail = msg.from?.emailAddress?.address || "";
        const fromName = msg.from?.emailAddress?.name || fromEmail;
        let isSent = fromEmail.toLowerCase() === acc.email.toLowerCase();

        // Si es mandado por mi, lo mando a 'enviados', si no a 'entrada'
        const carpeta = isSent ? 'enviados' : 'entrada';

        let htmlBody = msg.body?.content || "";
        let textBody = msg.bodyPreview || "";

        const adjuntos = [];
        // NOTA: Para no sobrecargar la API en esta fase, no bajamos los adjuntos completos por Graph a menos que sea necesario.
        // Se puede expandir en el futuro usando /messages/{id}/attachments

        const { data: contacto } = await supabase.from('contactos').select('id').eq('email', fromEmail).maybeSingle();
        let dealId = null;
        if (contacto) {
          const { data: deal } = await supabase.from('deals').select('id').eq('contacto_id', contacto.id).order('creado', { ascending: false }).limit(1).maybeSingle();
          dealId = deal?.id;
        }

        const { error: insertErr } = await supabase.from('emails').upsert({
          id: deterministicId,
          user_id: acc.user_id,
          org_id: acc.org_id,
          account_id: accountId,
          de: fromName,
          para: (msg.toRecipients && msg.toRecipients[0]) ? (msg.toRecipients[0].emailAddress?.name || msg.toRecipients[0].emailAddress?.address) : acc.email,
          asunto: msg.subject || '(Sin asunto)',
          fecha: new Date(msg.receivedDateTime).toISOString(),
          cuerpo: textBody,
          html: htmlBody,
          leido: msg.isRead || isSent,
          carpeta: carpeta,
          mensaje_id: msgId,
          deal_id: dealId,
          contacto_id: contacto?.id,
          adjuntos: adjuntos
        }, { onConflict: 'id' });

        if (!insertErr) totalCount++;
      } catch (msgErr) {
        log(`⚠️ [Graph API] Error guardando msg ${msg.id}: ${msgErr.message}`);
      }
    }

    log(`📩 [Graph API] Sincronización finalizada (${totalCount} procesados).`);
    await supabase.from('email_accounts').update({ last_sync: new Date().toISOString() }).eq('id', accountId);
    return { success: true, count: totalCount };

  } catch (e) {
    log(`❌ [Graph API Error]: ${e.response?.data?.error?.message || e.message}`);
    return { error: e.message };
  }
}


// Sincronizar correos vía IMAP (Soporta XOAUTH2)
async function syncEmails(accountId) {
  const log = (msg) => {
    try { require('fs').appendFileSync('server_log.txt', `[${new Date().toISOString()}] ${msg}\n`); } catch (e) { }
    console.log(msg);
  };

  try {
    log(`Syncing for ${accountId}...`);
    let { data: acc, error } = await supabase.from('email_accounts').select('*').eq('id', accountId).single();
    if (error || !acc || !acc.active) return { error: "Account not found or inactive" };

    if (!acc.org_id && acc.user_id) {
      const { data: u } = await supabase.from('usuariosApp').select('org_id').eq('id', acc.user_id).single();
      if (u) acc.org_id = u.org_id;
    }
    log(`📍 Org ID: ${acc.org_id}`);

    if (syncingAccounts[accountId]) {
      log(`⚠️ Ya hay una sincronización en marcha para ${accountId}.`);
      return { success: false, error: "Sync in progress" };
    }

    if (acc.provider === 'azure') {
      syncingAccounts[accountId] = true;
      const res = await syncAzureEmails(accountId, acc, log);
      delete syncingAccounts[accountId];
      return res;
    }

    syncingAccounts[accountId] = true;

    const config = {
      imap: {
        user: acc.email,
        host: acc.imap_host || (acc.provider === 'google' ? 'imap.gmail.com' : 'outlook.office365.com'),
        port: acc.imap_port || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      }
    };

    if (acc.access_token) {
      let token = acc.access_token;
      const isExpired = !acc.expires_at || new Date(acc.expires_at) <= new Date();
      if (isExpired) {
        log(`🔄 [IMAP] Token expirado para ${accountId}. Refrescando...`);
        token = await refreshAccessToken(accountId);
      }

      if (!token) {
        log(`❌ [IMAP] No se pudo obtener token para ${accountId}`);
        delete syncingAccounts[accountId];
        return { error: "Authentication failed (expired token)" };
      }

      config.imap.xoauth2 = Buffer.from(`user=${acc.email}\x01auth=Bearer ${token}\x01\x01`).toString('base64');
    } else {
      config.imap.password = acc.password_hash;
    }

    log(`📡 [IMAP] Conectando a ${config.imap.host}:${config.imap.port}...`);
    let connection;
    try {
      connection = await imaps.connect(config);
    } catch (err) {
      if ((err.message.includes('Invalid credentials') || err.message.includes('Failure')) && acc.access_token) {
        log(`🔄 [IMAP] Credenciales inválidas. Forzando refresco de token...`);
        const newToken = await refreshAccessToken(accountId);
        if (newToken) {
          config.imap.xoauth2 = Buffer.from(`user=${acc.email}\x01auth=Bearer ${newToken}\x01\x01`).toString('base64');
          connection = await imaps.connect(config);
        } else throw err;
      } else throw err;
    }

    const boxesToSync = ['INBOX'];
    if (acc.provider === 'google') boxesToSync.push('[Gmail]/Enviados');
    else if (acc.provider === 'azure') boxesToSync.push('Sent Items');

    let totalCount = 0;

    for (const boxName of boxesToSync) {
      try {
        log(`📂 [IMAP] Abriendo carpeta: ${boxName}...`);
        await connection.openBox(boxName);

        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const dateStr = twoDaysAgo.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

        const searchCriteria = [['SINCE', dateStr]];
        const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], struct: true, markSeen: false };

        const results = await connection.search(searchCriteria, fetchOptions);
        const lastResults = (results || []).slice(-50);
        log(`📥 [IMAP] ${boxName}: Procesando ${lastResults.length} correos.`);

        for (const item of lastResults) {
          try {
            const headerPart = item.parts.find(p => p.which === 'HEADER');
            const fullPart = item.parts.find(p => p.which === '');
            const rawContent = fullPart ? fullPart.body : (headerPart ? headerPart.body : null);
            if (!rawContent) continue;

            const mail = await simpleParser(String(rawContent));
            const msgUid = item.attributes.uid.toString();
            const fromEmail = mail.from?.value?.[0]?.address || "";
            const subject = mail.subject || '(Sin asunto)';
            const messageIdHeader = mail.messageId || `no-id-${Date.now()}-${msgUid}`;
            const deterministicId = "em_" + Buffer.from(messageIdHeader).toString('hex').slice(0, 32);

            // Procesar Adjuntos
            const adjuntos = [];
            if (mail.attachments && mail.attachments.length > 0) {
              for (const att of mail.attachments) {
                const fileName = att.filename || `unnamed_${Date.now()}`;
                const safeName = `${deterministicId}_${fileName.replace(/[^a-z0-9.]/gi, '_')}`;

                const { data: uploadData, error: upErr } = await supabase.storage
                  .from('email-attachments')
                  .upload(safeName, att.content, {
                    contentType: att.contentType,
                    upsert: true
                  });

                if (!upErr) {
                  const { data: { publicUrl } } = supabase.storage.from('email-attachments').getPublicUrl(safeName);
                  adjuntos.push({ name: fileName, url: publicUrl, type: att.contentType, size: att.size });
                }
              }
            }

            const { data: contacto } = await supabase.from('contactos').select('id').eq('email', fromEmail).maybeSingle();
            let dealId = null;
            if (contacto) {
              const { data: deal } = await supabase.from('deals').select('id').eq('contacto_id', contacto.id).order('creado', { ascending: false }).limit(1).maybeSingle();
              dealId = deal?.id;
            }

            const { error: insertErr } = await supabase.from('emails').upsert({
              id: deterministicId,
              user_id: acc.user_id,
              org_id: acc.org_id,
              account_id: accountId,
              de: fromEmail,
              para: mail.to?.value?.[0]?.address || acc.email,
              asunto: subject,
              fecha: mail.date ? mail.date.toISOString() : new Date().toISOString(),
              cuerpo: mail.text || "",
              html: mail.html || "",
              leido: boxName !== 'INBOX',
              carpeta: boxName === 'INBOX' ? 'entrada' : 'enviados',
              mensaje_id: messageIdHeader,
              deal_id: dealId,
              contacto_id: contacto?.id,
              adjuntos: adjuntos
            }, { onConflict: 'id' });

            if (!insertErr) totalCount++;
          } catch (msgErr) {
            log(`⚠️ [IMAP] Error msg UID ${item.attributes?.uid}: ${msgErr.message}`);
          }
        }
      } catch (boxErr) {
        log(`⚠️ [IMAP] Error abriendo/procesando ${boxName}: ${boxErr.message}`);
      }
    }

    log(`📩 [IMAP] Sincronización total finalizada (${totalCount} procesados).`);
    connection.end();
    await supabase.from('email_accounts').update({ last_sync: new Date().toISOString() }).eq('id', accountId);
    return { success: true, count: totalCount };
  } catch (e) {
    log(`❌ [IMAP Error]: ${e.message}`);
    console.error("❌ [IMAP Error]:", e.message);
    return { error: e.message };
  } finally {
    // Liberar bloqueo al terminar
    delete syncingAccounts[accountId];
  }
}

// Sincronizar Calendario (Google / Microsoft)
async function syncCalendar(accountId) {
  const log = (msg) => {
    try { require('fs').appendFileSync('server_log.txt', `[${new Date().toISOString()}] [CAL] ${msg}\n`); } catch (e) { }
    console.log(`[CAL] ${msg}`);
  };

  try {
    log(`📅 Iniciando sincronización de calendario para ${accountId}...`);
    let { data: acc, error } = await supabase.from('email_accounts').select('*').eq('id', accountId).single();
    if (error || !acc || !acc.access_token || !acc.sync_calendar) {
      log(`⚠️ Cuenta no elegible para calendario (o sin token)`);
      return;
    }

    if (!acc.org_id && acc.user_id) {
      const { data: u } = await supabase.from('usuariosApp').select('org_id').eq('id', acc.user_id).single();
      if (u) acc.org_id = u.org_id;
    }
    log(`📍 Org ID: ${acc.org_id}`);

    // Validar expiración
    let token = acc.access_token;
    if (acc.expires_at && new Date(acc.expires_at) <= new Date()) {
      token = await refreshAccessToken(accountId);
      if (!token) return;
    }

    log(`📅 [Calendar] Solicitando eventos a Google API...`);
    let events = [];
    if ((acc.provider || 'google') === 'google') {
      const res = await axios.get("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        headers: { Authorization: `Bearer ${token}` },
        params: { timeMin: new Date().toISOString(), maxResults: 10, singleEvents: true, orderBy: 'startTime' },
        timeout: 10000
      });
      events = (res.data.items || []).map(e => ({
        id: "cal_g_" + e.id,
        titulo: e.summary || "(Sin título)",
        descripcion: e.description || "",
        vencimiento: (e.start.dateTime || e.start.date).split('T')[0],
        estado: 'pendiente'
      }));
    } else if (acc.provider === 'azure') {
      const res = await axios.get("https://graph.microsoft.com/v1.0/me/events", {
        headers: { Authorization: `Bearer ${token}` },
        params: { $top: 10, $select: 'subject,bodyPreview,start,id' }
      });
      events = (res.data.value || []).map(e => ({
        id: "cal_m_" + e.id,
        titulo: e.subject || "(Sin título)",
        descripcion: e.bodyPreview || "",
        vencimiento: e.start.dateTime.split('T')[0],
        estado: 'pendiente'
      }));
    }

    for (const ev of events) {
      await supabase.from('tareas').upsert({
        ...ev,
        user_id: acc.user_id,
        org_id: acc.org_id, // INCLUIR ORG_ID PARA VISIBILIDAD
        prioridad: 'media',
        asignado: 'Sincronizado'
      }, { onConflict: 'id' });
    }
    logFile(`✅ [Calendar] ${events.length} eventos sincronizados.`);
  } catch (e) {
    logFile(`❌ [Calendar Error]: ${e.response?.data?.error?.message || e.message}`);
  }
}

// Endpoints Email
app.post('/api/email/send', async (req, res) => {
  const { accountId, to, cc, bcc, subject, body, html, attachments, dealId, contactoId } = req.body;
  logFile(`📤 [SMTP] Petición de envío desde cuenta ${accountId} para ${to}`);
  try {
    const { data: acc, error } = await supabase.from('email_accounts').select('*').eq('id', accountId).single();
    if (error || !acc) {
      logFile(`❌ [SMTP] Cuenta ${accountId} no encontrada.`);
      throw new Error("Cuenta no configurada");
    }

    if (!acc.org_id && acc.user_id) {
      const { data: u } = await supabase.from('usuariosApp').select('org_id').eq('id', acc.user_id).single();
      if (u) acc.org_id = u.org_id;
    }

    let messageId = null;

    if (acc.provider === 'azure') {
      let token = acc.access_token;
      if (acc.expires_at && new Date(acc.expires_at) <= new Date()) {
        token = await refreshAccessToken(accountId);
      }

      logFile(`📡 [Graph API] Enviando email vía Microsoft Graph para ${acc.email}...`);

      const emailPayload = {
        message: {
          subject: subject,
          body: {
            contentType: html ? "html" : "text",
            content: html || body.replace(/\n/g, '<br>')
          },
          toRecipients: to.split(',').map(e => ({ emailAddress: { address: e.trim() } }))
        },
        saveToSentItems: "true"
      };

      if (cc) {
        emailPayload.message.ccRecipients = cc.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
      }
      if (bcc) {
        emailPayload.message.bccRecipients = bcc.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
      }

      if (attachments && attachments.length > 0) {
        emailPayload.message.attachments = [];
        for (const att of attachments) {
          try {
            const resp = await axios.get(att.url, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(resp.data, 'binary').toString('base64');
            emailPayload.message.attachments.push({
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: att.name,
              contentBytes: base64
            });
          } catch (e) {
            logFile(`⚠️ Error descargando adjunto para Graph API: ${e.message}`);
          }
        }
      }

      await axios.post('https://graph.microsoft.com/v1.0/me/sendMail', emailPayload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      messageId = "msg_graph_" + Date.now();
      logFile(`✅ [Graph API] Email enviado! ID: ${messageId}`);

    } else {
      // Flujo original (SMTP) para Google y otros
      let transporterConfig = {
        host: acc.smtp_host || (acc.provider === 'google' ? 'smtp.gmail.com' : 'smtp.office365.com'),
        port: acc.smtp_port || (acc.provider === 'google' ? 465 : 587),
        secure: (acc.smtp_port === 465) || (acc.provider === 'google'),
      };

      if (acc.access_token) {
        let token = acc.access_token;
        if (acc.expires_at && new Date(acc.expires_at) <= new Date()) {
          token = await refreshAccessToken(accountId);
        }
        transporterConfig.auth = {
          type: 'OAuth2',
          user: acc.email,
          accessToken: token
        };
      } else {
        transporterConfig.auth = { user: acc.email, pass: acc.password_hash };
      }

      const transporter = nodemailer.createTransport(transporterConfig);
      logFile(`📡 [SMTP] Conectando a ${transporterConfig.host}:${transporterConfig.port}...`);

      const info = await transporter.sendMail({
        from: `"${acc.email}" <${acc.email}>`,
        to,
        cc,
        bcc,
        subject,
        text: body,
        html: html || body.replace(/\n/g, '<br>'),
        attachments: (attachments || []).map(a => ({
          filename: a.name,
          path: a.url
        }))
      });
      messageId = info.messageId;
      logFile(`✅ [SMTP] Email enviado! ID: ${messageId}`);
    }

    const deterministicId = "em_" + Buffer.from(String(messageId)).toString('hex').slice(0, 32);

    const { error: insErr } = await supabase.from('emails').upsert({
      id: deterministicId,
      account_id: accountId,
      user_id: acc.user_id,
      org_id: acc.org_id,
      carpeta: 'enviados',
      de: acc.email,
      para: to,
      asunto: subject,
      cuerpo: body,
      html: html || body.replace(/\n/g, '<br>'),
      fecha: new Date().toISOString(),
      leido: true,
      mensaje_id: messageId,
      adjuntos: attachments || [],
      deal_id: dealId || null,
      contacto_id: contactoId || null
    }, { onConflict: 'id' });

    if (insErr) {
      logFile(`⚠️ [API] Email enviado pero falló persistencia: ${insErr.message}`);
    }

    res.json({ success: true, messageId: messageId });
  } catch (e) {
    logFile(`❌ [API Error] Envío de email fallido: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/email/sync', async (req, res) => {
  const { accountId } = req.body;
  const result = await syncEmails(accountId);
  await syncCalendar(accountId); // Sincronizar también calendario
  if (result.error) return res.status(500).json(result);
  res.json(result);
});

// ═══════════════════════════════════════════
// NEW OAUTH FLOW (CUSTOM)
// ═══════════════════════════════════════════

app.get('/api/auth/google', (req, res) => {
  const { userId, orgId } = req.query;
  if (!userId) return res.status(400).send("Falta userId");

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  // FIJAMOS el redirect a localhost para evitar que los cambios de Ngrok rompan la validación de Google
  const redirect_uri = `http://localhost:3001/api/auth/google/callback`;

  logFile(`🔗 [OAuth Google] Redirect URI fijado a: ${redirect_uri}`);

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri,
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' '),
    state: JSON.stringify({ userId, orgId })
  };

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

app.get('/api/auth/azure', (req, res) => {
  const { userId, orgId } = req.query;
  if (!userId) return res.status(400).send("Falta userId");

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  // FIJAMOS el redirect a localhost para evitar problemas con Ngrok
  const redirect_uri = `http://localhost:3001/api/auth/azure/callback`;

  logFile(`🔗 [OAuth Azure] Redirect URI fijado a: ${redirect_uri}`);

  const rootUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  const options = {
    client_id: process.env.AZURE_CLIENT_ID,
    response_type: 'code',
    redirect_uri,
    response_mode: 'query',
    scope: 'offline_access Mail.Read Mail.Send Calendars.Read User.Read',
    state: JSON.stringify({ userId, orgId })
  };

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

app.get('/api/auth/azure/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    const { userId, orgId } = JSON.parse(state || "{}");
    const redirect_uri = `http://localhost:3001/api/auth/azure/callback`;

    const { data: tokens } = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      code,
      redirect_uri,
      grant_type: 'authorization_code'
    }));

    const { data: profile } = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const email = profile.mail || profile.userPrincipalName;
    const accId = "acc_" + Buffer.from(email).toString('hex').slice(0, 16);

    const payload = {
      id: accId,
      user_id: userId,
      org_id: orgId || null,
      email: email,
      provider: 'azure',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      active: true,
      sync_calendar: true
    };

    await supabase.from('email_accounts').upsert(payload, { onConflict: 'id' });
    res.send("<html><body><h3>Conectado con éxito</h3><script>if(window.opener) window.opener.postMessage('oauth_success','*'); setTimeout(()=>window.close(),2000);</script></body></html>");
  } catch (e) {
    res.status(500).send("Error Azure OAuth: " + e.message);
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send("Falta el código de autorización");

  try {
    const { userId, orgId } = JSON.parse(state || "{}");
    const redirect_uri = `http://localhost:3001/api/auth/google/callback`;

    // 1. Canjear código por tokens
    const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri,
      grant_type: 'authorization_code'
    }));

    // 2. Obtener email del usuario
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const email = profile.email;
    const accId = "acc_" + Buffer.from(email).toString('hex').slice(0, 16);

    // 3. Guardar en email_accounts
    const payload = {
      id: accId,
      user_id: userId,
      org_id: orgId || null,
      email: email,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      active: true,
      sync_calendar: true
    };

    const { error } = await supabase.from('email_accounts').upsert(payload, { onConflict: 'id' });
    if (error) throw error;

    logFile(`✅ [OAuth] Cuenta ${email} vinculada con éxito al usuario ${userId}`);

    // 4. Redirigir al frontend (asumimos que vive en el mismo host o lo sacamos del state si fuera necesario)
    // Por ahora, redirigimos a donde vino o un path relativo si es SPA
    res.send(`
      <html><body>
        <h3>Conectado con éxito</h3>
        <p>Ya puedes cerrar esta ventana y regresar al CRM.</p>
        <script>
          if (window.opener) {
             window.opener.postMessage("oauth_success", "*");
          }
          setTimeout(() => window.close(), 2000);
        </script>
      </body></html>
    `);
  } catch (e) {
    logFile(`❌ [OAuth Error]: ${e.message}`);
    res.status(500).send("Error en el proceso de vinculación: " + e.message);
  }
});

app.post('/api/email/test-connection', async (req, res) => {
  const { smtp_host, smtp_port, imap_host, imap_port, email, password_hash } = req.body;
  const results = { smtp: null, imap: null };

  // Test SMTP
  try {
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port === 465,
      auth: { user: email, pass: password_hash },
      connectionTimeout: 5000
    });
    await transporter.verify();
    results.smtp = { ok: true };
  } catch (e) {
    results.smtp = { ok: false, error: e.message };
  }

  // Test IMAP
  try {
    const config = {
      imap: {
        user: email,
        password: password_hash,
        host: imap_host,
        port: imap_port,
        tls: true,
        authTimeout: 5000
      }
    };
    const connection = await imaps.connect(config);
    connection.end();
    results.imap = { ok: true };
  } catch (e) {
    results.imap = { ok: false, error: e.message };
  }

  res.json(results);
});

// Sync automático cada 2 minutos (reducido para mejor experiencia)
setInterval(async () => {
  logFile("⏱️ [CRON] Iniciando sync automático...");
  const { data: accounts, error } = await supabase.from('email_accounts').select('id, sync_calendar').eq('active', true);
  if (error) logFile(`❌ Error al buscar cuentas: ${error.message}`);

  if (accounts) {
    logFile(`ℹ️ [CRON] Se encontraron ${accounts.length} cuentas activas para sincronizar.`);
    for (const acc of accounts) {
      await syncEmails(acc.id);
      if (acc.sync_calendar) await syncCalendar(acc.id);
    }
  }
}, 30 * 1000); // Sync automático cada 30 segundos

/* ═══════════════════════════════════════════
   PHASE 44: WORKFLOW ENGINE (AUTOMATIONS)
   ═══════════════════════════════════════════ */

// Evaluar si un deal cumple las condiciones de una regla
function evaluateConditions(ruleConfig, deal) {
  if (!ruleConfig.condiciones || ruleConfig.condiciones.length === 0) return true;

  return ruleConfig.condiciones.every(cond => {
    const dealValue = deal[cond.fieldId];
    const targetValue = cond.val;

    switch (cond.op) {
      case '==': return String(dealValue) === String(targetValue);
      case '!=': return String(dealValue) !== String(targetValue);
      case 'contiene': return String(dealValue || "").toLowerCase().includes(String(targetValue || "").toLowerCase());
      case 'no_contiene': return !String(dealValue || "").toLowerCase().includes(String(targetValue || "").toLowerCase());
      case '>': return Number(dealValue) > Number(targetValue);
      case '<': return Number(dealValue) < Number(targetValue);
      case 'set': return dealValue !== null && dealValue !== undefined && dealValue !== '';
      case 'not_set': return dealValue === null || dealValue === undefined || dealValue === '';
      default: return true;
    }
  });
}

// Helper: Obtener teléfono de un negocio
async function getPhoneFromDeal(dealId) {
  try {
    const { data: deal } = await supabase
      .from('deals')
      .select('contacto_id, contactos(telefono)')
      .eq('id', dealId)
      .single();
    return deal?.contactos?.telefono || null;
  } catch (e) {
    return null;
  }
}

// Ejecutar una acción de automatización
async function executeRuleAction(rule, deal) {
  const { config, tipo } = rule;
  logFile(`🤖 [Workflow] Ejecutando "${rule.nombre}" para deal ${deal.id} (Tipo: ${tipo})`);

  try {
    // Reemplazo de variables comunes
    const replaceVars = (text) => {
      if (!text) return "";
      let t = text;
      // Tratar de obtener el nombre del contacto si no está en el payload del deal
      const nombre = deal.contactos?.nombre || "Cliente";
      t = t.replace(/{nombre}/g, nombre);
      t = t.replace(/{valor}/g, deal.valor || "0");
      t = t.replace(/{titulo}/g, deal.titulo || "");
      return t;
    };

    switch (tipo) {
      case 'change_stage':
        if (config.etapa_destino) {
          await supabase.from('deals').update({ etapa_id: config.etapa_destino }).eq('id', deal.id);
          logFile(`✅ [Workflow] Etapa cambiada a ${config.etapa_destino}`);
        }
        break;

      case 'change_resp':
        if (config.responsable_id) {
          await supabase.from('deals').update({ responsable: config.responsable_id }).eq('id', deal.id);
          logFile(`✅ [Workflow] Responsable cambiado a ${config.responsable_id}`);
        }
        break;

      case 'mod_item':
        if (config.campos && config.campos.length > 0) {
          const updates = {};
          config.campos.forEach(f => {
            updates[f.id] = replaceVars(f.value);
          });
          await supabase.from('deals').update(updates).eq('id', deal.id);
          logFile(`✅ [Workflow] Campos actualizados en deal: ${Object.keys(updates).join(', ')}`);
        }
        break;

      case 'upd_contact':
        if (deal.contacto_id && config.campos && config.campos.length > 0) {
          const updates = {};
          config.campos.forEach(f => {
            updates[f.id] = replaceVars(f.value);
          });
          await supabase.from('contactos').update(updates).eq('id', deal.contacto_id);
          logFile(`✅ [Workflow] Contacto actualizado`);
        }
        break;

      case 'upd_company':
        if (deal.empresa_id && config.campos && config.campos.length > 0) {
          const updates = {};
          config.campos.forEach(f => {
            updates[f.id] = replaceVars(f.value);
          });
          await supabase.from('empresas').update(updates).eq('id', deal.empresa_id);
          logFile(`✅ [Workflow] Empresa actualizada`);
        }
        break;

      case 'create_task':
        await supabase.from('tareas').insert({
          titulo: replaceVars(config.titulo_tarea) || "Tarea automática",
          descripcion: replaceVars(config.desc_tarea) || "",
          user_id: deal.user_id,
          org_id: deal.org_id,
          estado: 'pendiente',
          prioridad: 'media',
          vencimiento: new Date(Date.now() + 86400000).toISOString().split('T')[0]
        });
        logFile(`✅ [Workflow] Tarea creada: ${config.titulo_tarea}`);
        break;

      case 'notif_user':
        await supabase.from('notificaciones').insert({
          user_id: deal.user_id,
          org_id: deal.org_id,
          titulo: rule.nombre,
          mensaje: replaceVars(config.mensaje) || "Se activó una automatización",
          leida: false,
          tipo: 'sistema'
        });
        io.emit('nueva_notificacion', { user_id: deal.user_id });
        logFile(`✅ [Workflow] Notificación enviada al usuario`);
        break;

      case 'delete_item':
        await supabase.from('deals').delete().eq('id', deal.id);
        logFile(`✅ [Workflow] Deal eliminado`);
        break;

      case 'archive_deal':
        await supabase.from('deals').update({ etapa_id: 'archivado' }).eq('id', deal.id);
        logFile(`✅ [Workflow] Deal archivado`);
        break;

      case 'add_tag':
        if (config.tag) {
          const currentTags = Array.isArray(deal.etiquetas) ? deal.etiquetas : [];
          if (!currentTags.includes(config.tag)) {
            await supabase.from('deals').update({ etiquetas: [...currentTags, config.tag] }).eq('id', deal.id);
            logFile(`✅ [Workflow] Etiqueta añadida: ${config.tag}`);
          }
        }
        break;

      case 'remove_tag':
        if (config.tag) {
          const currentTags = Array.isArray(deal.etiquetas) ? deal.etiquetas : [];
          if (currentTags.includes(config.tag)) {
            await supabase.from('deals').update({ etiquetas: currentTags.filter(t => t !== config.tag) }).eq('id', deal.id);
            logFile(`✅ [Workflow] Etiqueta quitada: ${config.tag}`);
          }
        }
        break;

      case 'enviar_wa':
        if (config.mensaje) {
          const phone = await getPhoneFromDeal(deal.id);
          const accId = config.account_id;
          const instance = whatsappInstances[accId];
          if (phone && instance && instance.ready) {
            const finalMsg = replaceVars(config.mensaje);
            // Asegurar formato de WhatsApp (quitar símbolos no numéricos y añadir @c.us)
            const cleanPhone = phone.replace(/\D/g, '');
            await instance.client.sendMessage(`${cleanPhone}@c.us`, finalMsg);
            logFile(`✅ [Workflow] WhatsApp enviado desde ${accId} a ${cleanPhone}`);
          } else {
            logFile(`⚠️ [Workflow] Falló envío WA: Teléfono: ${!!phone}, Cuenta: ${accId}, Lista: ${!!instance?.ready}`);
          }
        }
        break;

      case 'enviar_email':
        // 1. Determinar qué cuenta usar
        let mailAccId = config.account_id;
        let query = supabase.from('email_accounts').select('*').eq('active', true);

        if (mailAccId) query = query.eq('id', mailAccId);
        else query = query.eq('user_id', deal.user_id);

        const { data: accounts } = await query.limit(1);

        if (accounts && accounts[0]) {
          const acc = accounts[0];
          const toEmail = deal.contactos?.email || "";

          if (toEmail) {
            logFile(`📧 [Workflow] Enviando email automático desde ${acc.email} para ${toEmail}`);

            let transporterConfig = {
              host: acc.smtp_host || (acc.provider === 'google' ? 'smtp.gmail.com' : 'smtp.office365.com'),
              port: acc.smtp_port || (acc.provider === 'google' ? 465 : 587),
              secure: (acc.smtp_port === 465) || (acc.provider === 'google'),
            };

            if (acc.access_token) {
              let token = acc.access_token;
              if (acc.expires_at && new Date(acc.expires_at) <= new Date()) {
                token = await refreshAccessToken(acc.id);
              }
              transporterConfig.auth = { type: 'OAuth2', user: acc.email, accessToken: token };
            } else {
              transporterConfig.auth = { user: acc.email, pass: acc.password_hash };
            }

            const transporter = nodemailer.createTransport(transporterConfig);
            await transporter.sendMail({
              from: `"${acc.email}" <${acc.email}>`,
              to: toEmail,
              subject: replaceVars(config.asunto || "Seguimiento CRM"),
              text: replaceVars(config.mensaje),
              html: replaceVars(config.html) || replaceVars(config.mensaje)?.replace(/\n/g, '<br>')
            });

            logFile(`✅ [Workflow] Email enviado con éxito`);
          }
        }
        break;

      case 'run_webhook':
        if (config.url) {
          try {
            await axios.post(config.url, {
              deal,
              event: rule.nombre,
              timestamp: new Date().toISOString()
            });
            logFile(`✅ [Workflow] Webhook enviado a ${config.url}`);
          } catch (e) {
            logFile(`❌ [Workflow] Error en Webhook: ${e.message}`);
          }
        }
        break;

      case 'data_clean':
        if (config.campo && config.metodo) {
          let val = deal[config.campo];
          if (typeof val === 'string') {
            if (config.metodo === 'upper') val = val.toUpperCase();
            if (config.metodo === 'lower') val = val.toLowerCase();
            if (config.metodo === 'trim') val = val.trim();
            await supabase.from('deals').update({ [config.campo]: val }).eq('id', deal.id);
            logFile(`✅ [Workflow] Datos limpiados en ${config.campo} (${config.metodo})`);
          }
        }
        break;

      default:
        logFile(`⚠️ [Workflow] Tipo de acción no soportado: ${tipo}`);
    }
  } catch (err) {
    logFile(`❌ [Workflow Error] Error ejecutando ${rule.nombre}: ${err.message}`);
  }
}


// Listener de tiempo real para DEALS
supabase
  .channel('workflow_engine')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, async (payload) => {
    logFile(`🔔 [Realtime] Cambio detectado en tabla 'deals'`);
    const oldDeal = payload.old;
    const newDeal = payload.new;

    if (oldDeal && newDeal && oldDeal.etapa_id !== newDeal.etapa_id) {
      logFile(`🔔 [Workflow] Cambio de etapa en deal ${newDeal.id}: ${oldDeal.etapa_id} -> ${newDeal.etapa_id}`);

      const { data: rules, error } = await supabase
        .from('automatizaciones')
        .select('*')
        .eq('etapa_id', newDeal.etapa_id)
        .eq('activo', true);

      if (!error && rules && rules.length > 0) {
        logFile(`⚙️ [Workflow] ${rules.length} reglas encontradas.`);
        for (const rule of rules) {
          if (evaluateConditions(rule.config || {}, newDeal)) {
            await executeRuleAction(rule, newDeal);
          } else {
            logFile(`⏭️ [Workflow] Condiciones no cumplidas para rule: ${rule.nombre}`);
          }
        }
      }
    } else {
      logFile(`ℹ️ [Workflow] Update recibido pero no hay cambio de etapa o falta payload (Old: ${!!oldDeal}, New: ${!!newDeal})`);
    }
  })
  .subscribe();

server.listen(process.env.PORT || 3001, () => {
  console.log(`Server CRM corriendo en puerto ${process.env.PORT || 3001}`);
});
