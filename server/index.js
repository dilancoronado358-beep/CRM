const express = require('express');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Configuración Supabase (Copiada del frontend para conveniencia)
const SUPA_URL = process.env.SUPA_URL || "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = process.env.SUPA_KEY || "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const supabase = createClient(SUPA_URL, SUPA_KEY);

// Configuración AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => res.send('ENSING WhatsApp Server is Running! 🚀'));
app.get('/health', (req, res) => res.json({ status: 'ok', clientReady, latestQR: !!latestQRUrl }));
app.get('/qr', (req, res) => {
  if (latestQRUrl) res.json({ qr: latestQRUrl });
  else res.status(404).json({ error: "No hay QR generado aún." });
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
          chatId: msg.from === whatsappClient.info.wid._serialized ? msg.to : (msg.fromMe ? msg.to : msg.from),
          body: msg.body,
          fromMe: msg.fromMe,
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
        chatId: data.to,
        body: sentMsg.body,
        fromMe: true,
        timestamp: sentMsg.timestamp,
        ack: sentMsg.ack,
        deal_id: activeDealId || null
      };
      socket.emit('whatsapp_message', { ...msgOut, clientId: data.clientId });

      // PERSISTENCIA
      supabase.from('whatsapp_messages').upsert(msgOut, { onConflict: 'id' }).then(() => { });
    } catch (e) { console.error('Error sending message', e); }
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
        chatId: data.to,
        body: sentMsg.body || data.caption,
        fromMe: true,
        timestamp: sentMsg.timestamp,
        ack: sentMsg.ack,
        hasMedia: sentMsg.hasMedia,
        fileName: data.fileName,
        mimeType: mimeType,
        deal_id: activeDealId || null
      };

      socket.emit('whatsapp_message', { ...msgOut, clientId: data.clientId });

      // PERSISTENCIA
      supabase.from('whatsapp_messages').upsert(msgOut, { onConflict: 'id' }).then(() => { });

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
    io.emit('whatsapp_qr', qrDataUrl);
  } catch (err) {
    console.error('Error generando QR Code base64', err);
  }
});

whatsappClient.on('ready', () => {
  console.log('Cliente de WhatsApp Listooo!');
  clientReady = true;
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
      .select('id, etapaId')
      .eq('contactoId', contacto.id)
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
      contactoId: newContact.id,
      etapaId: 'et1', // Nuevo Lead
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
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      });
      analysis = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    res.json({ analysis });
  } catch (e) {
    console.error("Error en /ai/analyze:", e.message);
    res.status(500).json({ error: "Error procesando el análisis de AI." });
  }
});

// Lógica de Chatbot Inteligente
whatsappClient.on('message', async msg => {
  console.log(`Mensaje recibido de ${msg.from}: ${msg.body}`);

  // 1. LEAD AUTOMÁTICO: Asegurar que el contacto existe en CRM
  await handleAutoLead(msg);

  // 1.2 ANCLAJE A LEAD: Buscar si hay un negocio activo para este chat
  const activeDealId = await getActiveDealId(msg.from);

  // Sincronizar mensaje con el frontend
  const msgData = {
    id: msg.id._serialized,
    chatId: msg.from,
    body: msg.body,
    fromMe: msg.fromMe,
    timestamp: msg.timestamp,
    ack: msg.ack,
    deal_id: activeDealId || null
  };
  io.emit('whatsapp_message', msgData);

  // PERSISTENCIA: Guardar en Supabase (ahora con deal_id si existe)
  supabase.from('whatsapp_messages').upsert(msgData, { onConflict: 'id' }).then(() => { });

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

whatsappClient.on('message_ack', (msg, ack) => {
  io.emit('whatsapp_message_ack', {
    id: msg.id._serialized,
    chatId: msg.from === whatsappClient.info.wid._serialized ? msg.to : (msg.fromMe ? msg.to : msg.from),
    ack: ack
  });
});

console.log('Iniciando Cliente WhatsApp...');
whatsappClient.initialize();

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de integraciones y WebSockets escuchando en puerto ${PORT} (todas las interfaces de red)`);
});
