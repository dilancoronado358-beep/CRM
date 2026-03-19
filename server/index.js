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
const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);

// Bloqueo global de sincronización por cuenta
const syncingAccounts = {};

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

app.get('/', (req, res) => res.send('ENSING WhatsApp Server is Running! 🚀'));
app.get('/health', (req, res) => res.json({ status: 'ok', clientReady, latestQR: !!latestQRUrl }));
app.get('/qr', (req, res) => {
  if (latestQRUrl) res.json({ qr: latestQRUrl });
  else res.status(404).json({ error: "No hay QR generado aún." });
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

let clientReady = false;
let isFetchingChats = false;
let latestQRUrl = "";
let autoRules = [];

// Inicializamos el cliente de WhatsApp
// Utilizamos LocalAuth para guardar la sesión y no tener que escanear cada vez
const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

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
  console.log('Cliente Web CRM conectado');

  socket.on('get_whatsapp_status', () => {
    if (clientReady) {
      socket.emit('whatsapp_ready');
    } else if (latestQRUrl) {
      socket.emit('whatsapp_qr', latestQRUrl);
    }
  });

  socket.on('get_whatsapp_chats', async () => {
    console.log('Frontend solicitó la lista de chats');
    if (!clientReady) {
      console.log('Abortado: clientReady = false');
      return;
    }
    if (isFetchingChats) {
      console.log('Abortado: isFetchingChats = true (ya hay una en curso)');
      socket.emit('whatsapp_chats_error', { message: 'Sincronización pesada en curso. Por favor, dale unos segundos más...' });
      return;
    }

    isFetchingChats = true;
    try {
      console.log('[DEBUG] Ejecutando getChats() con timeout interno de 60s...');
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_GET_CHATS')), 60000));
      const chats = await Promise.race([whatsappClient.getChats(), timeout]);

      console.log(`[DEBUG] getChats() completado: recibidos ${chats.length} chats.`);
      const list = chats.slice(0, 30).map(c => ({
        id: { _serialized: c.id._serialized, user: c.id.user },
        name: c.name,
        timestamp: c.timestamp,
        lastMessage: c.lastMessage ? { body: c.lastMessage.body } : null
      }));
      socket.emit('whatsapp_chats_list', list);
      console.log(`Enviados ${list.length} chats al frontend`);
    } catch (e) {
      console.error('Error enviando chats:', e.message);
      if (e.message === 'TIMEOUT_GET_CHATS') {
        socket.emit('whatsapp_chats_error', {
          message: 'Tu WhatsApp tiene muchos mensajes y está tardando más de lo normal en enviarlos a la computadora. Sigue esperando...'
        });
      }
    } finally {
      isFetchingChats = false;
    }
  });

  socket.on('whatsapp_get_avatar', async (chatId) => {
    try {
      const url = await whatsappClient.getProfilePicUrl(chatId);
      if (url) {
        socket.emit('whatsapp_avatar_res', { id: chatId, url });
      }
    } catch (e) {
      // Ignore if no avatar or error
    }
  });

  socket.on('whatsapp_get_chat', async (chatId) => {
    try {
      const chat = await whatsappClient.getChatById(chatId);
      const msgs = await chat.fetchMessages({ limit: 50 });
      msgs.forEach(msg => {
        socket.emit('whatsapp_message', {
          id: msg.id._serialized,
          chat_id: msg.from === whatsappClient.info.wid._serialized ? msg.to : (msg.fromMe ? msg.to : msg.from),
          body: msg.body,
          from_me: msg.fromMe,
          timestamp: msg.timestamp,
          ack: msg.ack
        });
      });
    } catch (e) { console.error('Error fetching messages', e); }
  });

  socket.on('whatsapp_send_message', async (data) => {
    try {
      const sentMsg = await whatsappClient.sendMessage(data.to, data.text);
      const activeDealId = data.dealId || await getActiveDealId(data.to);
      const msgOut = {
        id: sentMsg.id._serialized,
        chat_id: data.to,
        body: sentMsg.body,
        from_me: true,
        timestamp: sentMsg.timestamp,
        ack: sentMsg.ack,
        deal_id: activeDealId || null
      };
      socket.emit('whatsapp_message', { ...msgOut, clientId: data.clientId });

      // PERSISTENCIA: Intentar guardar con chat_id (estándar nuevo)
      const { error: err1 } = await supabase.from('whatsapp_messages').upsert(msgOut, { onConflict: 'id' });
      if (err1) {
        if (err1.message.includes("column \"chat_id\" does not exist")) {
          // Fallback a chatid si falla por nombre de columna
          const fallback = { ...msgOut };
          fallback.chatid = fallback.chat_id;
          delete fallback.chat_id;
          const { error: err2 } = await supabase.from('whatsapp_messages').upsert(fallback, { onConflict: 'id' });
          if (err2) console.error('❌ Supabase Fallback Error:', err2.message);
          else console.log(`✅ Mensaje enviado guardado (Fallback chatid): ${msgOut.id}`);
        } else {
          console.error('❌ Supabase Error (Manual Out):', err1.message);
        }
      } else {
        console.log(`✅ Mensaje enviado guardado (chat_id): ${msgOut.id}`);
      }
    } catch (e) {
      console.error('Error sending message', e);
    }
  });

  socket.on('whatsapp_send_media', async (data) => {
    try {
      console.log(`Petición para enviar media a ${data.to}. Archivo: ${data.fileName}`);

      // Decodificar Base64 data URL con tolerancia
      const matches = data.mediaData.match(/^data:(.+?);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Formato base64 inválido');
      }

      const mimeType = matches[1];
      const base64Content = matches[2];

      const media = new MessageMedia(mimeType, base64Content, data.fileName);

      const sentMsg = await whatsappClient.sendMessage(data.to, media, {
        caption: data.caption || "",
        sendMediaAsDocument: !mimeType.startsWith('image/') // Si no es imagen, se va como doc
      });

      console.log(`Adjunto enviado exitosamente a ${data.to}`);

      const activeDealId = data.dealId || await getActiveDealId(data.to);

      // Enviamos el ack de confirmación al frontend refiriendo el ID local optimista
      const msgOut = {
        id: sentMsg.id._serialized,
        chat_id: data.to,
        body: sentMsg.body || data.caption,
        from_me: true,
        timestamp: sentMsg.timestamp,
        ack: sentMsg.ack,
        has_media: sentMsg.hasMedia,
        file_name: data.fileName,
        mime_type: mimeType,
        deal_id: activeDealId || null
      };

      socket.emit('whatsapp_message', { ...msgOut, clientId: data.clientId });

      // PERSISTENCIA: Tolerancia a nombres de columnas
      const { error: errMedia } = await supabase.from('whatsapp_messages').upsert(msgOut, { onConflict: 'id' });
      if (errMedia) {
        if (errMedia.message.includes("column")) {
          const fallback = { ...msgOut };
          if (errMedia.message.includes("chat_id")) { fallback.chatid = fallback.chat_id; delete fallback.chat_id; }
          if (errMedia.message.includes("deal_id")) { fallback.dealid = fallback.deal_id; delete fallback.deal_id; }
          if (errMedia.message.includes("from_me")) { fallback.fromme = fallback.from_me; delete fallback.from_me; }
          const { error: errMedia2 } = await supabase.from('whatsapp_messages').upsert(fallback, { onConflict: 'id' });
          if (errMedia2) console.error('❌ Supabase Media Fallback Error:', errMedia2.message);
        } else {
          console.error('❌ Supabase Media Error:', errMedia.message);
        }
      }

    } catch (e) {
      console.error('Error enviando archivo multimedia/adjunto', e);
    }
  });

  socket.on('whatsapp_update_rules', (rules) => {
    console.log(`🔄 Sincronización: Recibidas ${rules?.length || 0} reglas del frontend.`);
    if (Array.isArray(rules)) {
      autoRules = rules;
      console.log("Keywords sincronizados:", autoRules.map(r => r.keyword).join(", "));
    }
  });

  socket.on('whatsapp_logout', async () => {
    console.log('Solicitud de cierre de sesión recibida. Desvinculando cuenta y borrando caché...');
    try {
      if (clientReady || latestQRUrl) {
        // En lugar de logout() que a veces falla si el celular pierde señal,
        // destruimos el cliente y borramos la carpeta de sesión para forzar nuevo QR.
        await whatsappClient.destroy();

        try {
          fs.rmSync('.wwebjs_auth', { recursive: true, force: true });
          fs.rmSync('.wwebjs_cache', { recursive: true, force: true });
        } catch (e) { console.log('No se pudo borrar caché wwebjs', e.message); }

        console.log('Sesión destruida y caché purgado. Reinicializando...');
        clientReady = false;
        latestQRUrl = "";

        // Re-crear el cliente limpio
        whatsappClient.initialize();
      }
    } catch (e) {
      console.error('Error al destruir sesión', e);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente Web CRM desconectado');
  });
});

whatsappClient.on('qr', async (qr) => {
  console.log('QR RECIBIDO. Emitiendo a Frontend...');
  try {
    const qrDataUrl = await qrcode.toDataURL(qr);
    latestQRUrl = qrDataUrl;
    logFile(`✨ [WhatsApp] QR Generado y Guardado. Longitud: ${qrDataUrl.length}`);
    io.emit('whatsapp_qr', qrDataUrl);
  } catch (err) {
    logFile(`❌ [WhatsApp QR Error]: ${err.message}`);
    console.error('Error generando QR Code base64', err);
  }
});

whatsappClient.on('ready', () => {
  logFile('✅ [WhatsApp] Cliente de WhatsApp Listooo!');
  clientReady = true;
  latestQRUrl = ""; // Limpiar QR
  io.emit('whatsapp_ready');
});

whatsappClient.on('authenticated', () => {
  console.log('Autenticado exitosamente!');
});

whatsappClient.on('auth_failure', msg => {
  console.error('Fallo en la autenticacion', msg);
});

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

// Lógica de Chatbot Inteligente
whatsappClient.on('message', async msg => {
  // IGNORAR ESTADOS DE WHATSAPP (historias)
  if (msg.isStatus || msg.from === 'status@broadcast') {
    return; // No procesamos ni notificamos sobre estados
  }

  console.log(`Mensaje recibido de ${msg.from}: ${msg.body}`);

  // 1. LEAD AUTOMÁTICO: Asegurar que el contacto existe en CRM
  await handleAutoLead(msg);

  // 1.2 ANCLAJE A LEAD: Buscar si hay un negocio activo para este chat
  const activeDealId = await getActiveDealId(msg.from);

  // Sincronizar mensaje con el frontend
  const msgData = {
    id: msg.id._serialized,
    chat_id: msg.from,
    body: msg.body,
    from_me: msg.fromMe,
    timestamp: msg.timestamp,
    ack: msg.ack,
    deal_id: activeDealId || null
  };
  io.emit('whatsapp_message', msgData);

  // PERSISTENCIA: Tolerancia a nombres de columnas (Inbound)
  const { error: upsertErr } = await supabase.from('whatsapp_messages').upsert(msgData, { onConflict: 'id' });
  if (upsertErr) {
    if (upsertErr.message.includes("column")) {
      const fallback = { ...msgData };
      if (upsertErr.message.includes("chat_id")) { fallback.chatid = fallback.chat_id; delete fallback.chat_id; }
      if (upsertErr.message.includes("deal_id")) { fallback.dealid = fallback.deal_id; delete fallback.deal_id; }
      if (upsertErr.message.includes("from_me")) { fallback.fromme = fallback.from_me; delete fallback.from_me; }
      const { error: upsertErr2 } = await supabase.from('whatsapp_messages').upsert(fallback, { onConflict: 'id' });
      if (upsertErr2) console.error('❌ Supabase Inbound Fallback Error:', upsertErr2.message);
    } else {
      console.error('❌ Supabase Inbound Error:', upsertErr.message);
    }
  }

  if (msg.fromMe) return;

  const text = msg.body.toLowerCase();
  let responded = false;

  // 1.5 TRANSCRIPCIÓN DE AUDIOS
  if (msg.hasMedia && (msg.type === 'audio' || msg.type === 'voice')) {
    try {
      const media = await msg.downloadMedia();
      if (media && media.mimetype && media.mimetype.startsWith('audio/')) {
        const transcript = await transcribeAudio(media);
        if (transcript) {
          msgData.body = `🎤 [Audio Transcrito]: ${transcript}`;
          // Actualizar en realtime y persistencia
          io.emit('whatsapp_message', msgData);
          supabase.from('whatsapp_messages').upsert(msgData, { onConflict: 'id' }).then(() => { });
        }
      }
    } catch (err) {
      console.error("Error procesando audio:", err.message);
    }
  }

  // 2. AUTO-RESPUESTAS POR PALABRA CLAVE (Dinamismo con Horario, Media, IA y Delay)
  console.log(`🔍 Evaluando ${autoRules.length} reglas para el mensaje: "${text}"`);
  for (let rule of autoRules) {
    if (text.includes(rule.keyword)) {
      console.log(`🎯 Coincidencia de keyword: "${rule.keyword}"`);
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = (rule.start_time || "00:00").split(':').map(Number);
      const [endH, endM] = (rule.end_time || "23:59").split(':').map(Number);
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;

      if (currentTime >= startTime && currentTime <= endTime) {
        console.log(`✅ Regla emparejada: "${rule.keyword}"`);

        const chat = await msg.getChat();

        // Calculamos el delay (mínimo 1.5s para que se vea el typing)
        const delayInSec = parseFloat(rule.delay);
        const userDelay = (isNaN(delayInSec) ? 0 : delayInSec) * 1000;
        const finalDelay = Math.max(1500, userDelay);

        console.log(`⏳ Delay configurado: ${delayInSec}s -> Real: ${finalDelay}ms. AI Prompt: ${rule.ai_prompt ? 'SI' : 'NO'}`);
        responded = true;

        await chat.sendStateTyping();

        setTimeout(async () => {
          try {
            let finalReply = rule.reply_text || "";

            // Si la regla tiene un prompt de IA, generamos la respuesta dinámicamente
            if (rule.ai_prompt && (GEMINI_API_KEY || OPENAI_API_KEY)) {
              console.log(`🤖 Generando respuesta IA con Prompt: "${rule.ai_prompt}"`);
              const fullPrompt = `${rule.ai_prompt}. El cliente dijo: "${msg.body}"`;
              const aiResult = await getUnifiedAIResponse(fullPrompt, true);
              if (aiResult) {
                finalReply = aiResult;
                console.log(`✨ IA respondió: ${finalReply.substring(0, 50)}...`);
              } else {
                console.log(`⚠️ IA no devolvió respuesta, usando fallback de texto.`);
              }
            }

            if (!finalReply && !rule.media_url) {
              console.log("❌ Error: La regla no produjo ni texto ni imagen. Abortando envío.");
              return;
            }

            if (rule.media_url) {
              console.log(`📎 Enviando media: ${rule.media_url}`);
              const media = await MessageMedia.fromUrl(rule.media_url).catch(e => {
                console.error("Error descargando media de la regla:", e.message);
                return null;
              });
              if (media) await whatsappClient.sendMessage(msg.from, media, { caption: finalReply });
              else if (finalReply) await msg.reply(finalReply);
            } else if (finalReply) {
              console.log(`📤 Enviando respuesta de texto.`);
              await msg.reply(finalReply);
            }

            const botReply = {
              id: `bot_${Date.now()}`,
              chatId: msg.from,
              body: finalReply || "Archivo enviado",
              fromMe: true,
              timestamp: Math.floor(Date.now() / 1000),
              ack: 1,
              hasMedia: !!rule.media_url,
              deal_id: activeDealId || null
            };
            io.emit('whatsapp_message', botReply);
            supabase.from('whatsapp_messages').insert(botReply).then(() => { });
          } catch (e) {
            console.error("❌ Error fatal en ejecución de regla:", e.message);
          }
        }, finalDelay);
        break;
      }
    }
  }

  // 3. INTELIGENCIA ARTIFICIAL (Si no hubo match de palabra clave)
  if (!responded && (GEMINI_API_KEY || OPENAI_API_KEY)) {
    const aiReply = await getUnifiedAIResponse(msg.body);
    if (aiReply) {
      await msg.reply(aiReply);
      const aiReplyObj = {
        id: `ai_${Date.now()}`,
        chatId: msg.from,
        body: aiReply,
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000),
        ack: 1,
        deal_id: activeDealId || null
      };
      io.emit('whatsapp_message', aiReplyObj);

      // PERSISTENCIA
      supabase.from('whatsapp_messages').insert(aiReplyObj).then(() => { });
    }
  }

  // 4. SUGERENCIA DE TAREAS (Proactivo)
  suggestCRMTask(msg.from, msg.body);
});

whatsappClient.on('message_ack', async (msg, ack) => {
  const msgId = msg.id._serialized;
  io.emit('whatsapp_message_ack', {
    id: msgId,
    chatId: msg.from === whatsappClient.info.wid._serialized ? msg.to : (msg.fromMe ? msg.to : msg.from),
    ack: ack
  });

  // PERSISTENCIA DEL ACK: Actualizar en Supabase para que los vistos sean permanentes
  try {
    const { error } = await supabase.from('whatsapp_messages').update({ ack }).eq('id', msgId);
    if (error) console.error(`❌ Error actualizando ACK para ${msgId}:`, error.message);
  } catch (e) {
    console.error(`❌ Error fatal actualizando ACK:`, e.message);
  }
});

console.log('Iniciando Cliente WhatsApp...');
whatsappClient.initialize();

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
  const { accountId, to, subject, body, html } = req.body;
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
      subject,
      text: body,
      html: html || body.replace(/\n/g, '<br>')
    });

    logFile(`✅ [SMTP] Email enviado! ID: ${info.messageId}`);

    const deterministicId = "em_" + Buffer.from(info.messageId).toString('hex').slice(0, 32);

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
      mensaje_id: info.messageId,
      adjuntos: [] // Inicialmente vacío si se envía desde aquí sin adjuntos complejos
    }, { onConflict: 'id' });

    if (insErr) {
      logFile(`⚠️ [SMTP] Email enviado pero falló persistencia: ${insErr.message}`);
    }

    res.json({ success: true, messageId: info.messageId });
  } catch (e) {
    logFile(`❌ [SMTP Error]: ${e.message}`);
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
  const host = req.get('host');
  const finalProto = (host.includes('localhost') || host.includes('127.0.0.1')) ? protocol : 'https';
  const redirect_uri = `${finalProto}://${host}/api/auth/google/callback`;
  
  logFile(`🔗 [OAuth Google] Redirect URI generado: ${redirect_uri}`);

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
  const host = req.get('host');
  const finalProto = (host.includes('localhost') || host.includes('127.0.0.1')) ? protocol : 'https';
  const redirect_uri = `${finalProto}://${host}/api/auth/azure/callback`;

  logFile(`🔗 [OAuth Azure] Redirect URI generado: ${redirect_uri}`);

  const rootUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  const options = {
    client_id: process.env.AZURE_CLIENT_ID,
    response_type: 'code',
    redirect_uri,
    response_mode: 'query',
    scope: 'offline_access Mail.Read Calendars.Read User.Read',
    state: JSON.stringify({ userId, orgId })
  };

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
});

app.get('/api/auth/azure/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    const { userId, orgId } = JSON.parse(state || "{}");
    const redirect_uri = `${req.protocol}://${req.get('host')}/api/auth/azure/callback`;

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
    const redirect_uri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

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

// Listener en tiempo real para disparar sincronización desde el frontend sin depender del puerto 3001
// Debounce simple para el sync en tiempo real (evitar bucle con last_sync)
const lastSyncTime = {};

supabase
  .channel('email_sync_triggers')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'email_accounts' }, async (payload) => {
    const accId = payload.new.id;
    const now = Date.now();
    
    // Ignorar si se sincronizó hace menos de 60 segundos
    if (lastSyncTime[accId] && (now - lastSyncTime[accId] < 60000)) {
      // logFile(`⏳ [Realtime] Ignorando trigger para ${accId} (en cooldown).`);
      return;
    }
    
    lastSyncTime[accId] = now;
    logFile(`🔔 [Realtime] Cambio detectado en cuenta ${accId}. disparando sync...`);
    await syncEmails(accId);
    if (payload.new.sync_calendar) await syncCalendar(accId);
  })
  .subscribe((status) => {
    logFile(`📡 [Realtime Subscription Status]: ${status}`);
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
  } else {
    logFile(`ℹ️ [CRON] No se encontraron cuentas activas.`);
  }
}, 2 * 60 * 1000);

server.listen(process.env.PORT || 3001, () => {
  console.log(`Server CRM corriendo en puerto ${process.env.PORT || 3001}`);
});
