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

const app = express();
app.use(cors());

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
      const msgOut = {
        id: sentMsg.id._serialized,
        chatId: data.to,
        body: sentMsg.body,
        fromMe: true,
        timestamp: sentMsg.timestamp,
        ack: sentMsg.ack
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
        mimeType: mimeType
      };

      socket.emit('whatsapp_message', { ...msgOut, clientId: data.clientId });

      // PERSISTENCIA
      supabase.from('whatsapp_messages').upsert(msgOut, { onConflict: 'id' }).then(() => { });

    } catch (e) {
      console.error('Error enviando archivo multimedia/adjunto', e);
    }
  });

  socket.on('whatsapp_update_rules', (rules) => {
    console.log('Nuevas reglas de bot recibidas:', rules);
    autoRules = rules;
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

// Función para obtener respuesta de AI
async function getAIResponse(userText) {
  if (!GEMINI_API_KEY) return null;
  try {
    const prompt = `Eres un asistente de ventas de ENSING CRM. Responde de forma amable, profesional y concisa. Cliente dice: "${userText}"`;
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (e) {
    console.error("Error en Gemini AI:", e.message);
    return null;
  }
}

// Lógica de Chatbot Inteligente
whatsappClient.on('message', async msg => {
  console.log(`Mensaje recibido de ${msg.from}: ${msg.body}`);

  // Sincronizar mensaje con el frontend
  const msgData = {
    id: msg.id._serialized,
    chatId: msg.from,
    body: msg.body,
    fromMe: msg.fromMe,
    timestamp: msg.timestamp,
    ack: msg.ack
  };
  io.emit('whatsapp_message', msgData);

  // PERSISTENCIA: Guardar en Supabase
  supabase.from('whatsapp_messages').upsert(msgData, { onConflict: 'id' }).then(() => { });

  if (msg.fromMe) return;

  const text = msg.body.toLowerCase();
  let responded = false;

  // 1. LEAD AUTOMÁTICO: Asegurar que el contacto existe en CRM
  await handleAutoLead(msg);

  // 2. AUTO-RESPUESTAS POR PALABRA CLAVE (Dinamismo con Horario y Media)
  for (let rule of autoRules) {
    if (text.includes(rule.keyword)) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = (rule.start_time || "00:00").split(':').map(Number);
      const [endH, endM] = (rule.end_time || "23:59").split(':').map(Number);
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;

      if (currentTime >= startTime && currentTime <= endTime) {
        const chat = await msg.getChat();
        await chat.sendStateTyping();

        setTimeout(async () => {
          try {
            if (rule.media_url) {
              const media = await MessageMedia.fromUrl(rule.media_url).catch(e => null);
              if (media) await whatsappClient.sendMessage(msg.from, media, { caption: rule.reply_text || "" });
              else if (rule.reply_text) await msg.reply(rule.reply_text);
            } else if (rule.reply_text) {
              await msg.reply(rule.reply_text);
            }

            const botReply = {
              id: `bot_${Date.now()}`,
              chatId: msg.from,
              body: rule.reply_text || "Archivo enviado",
              fromMe: true,
              timestamp: Math.floor(Date.now() / 1000),
              ack: 1,
              hasMedia: !!rule.media_url
            };
            io.emit('whatsapp_message', botReply);

            // PERSISTENCIA
            supabase.from('whatsapp_messages').insert(botReply).then(() => { });
          } catch (e) { console.error("Error en regla:", e.message); }
        }, 1500);
        responded = true;
        break;
      }
    }
  }

  // 3. INTELIGENCIA ARTIFICIAL (Si no hubo match de palabra clave)
  if (!responded && GEMINI_API_KEY) {
    const aiReply = await getAIResponse(msg.body);
    if (aiReply) {
      await msg.reply(aiReply);
      const aiReplyObj = {
        id: `ai_${Date.now()}`,
        chatId: msg.from,
        body: aiReply,
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000),
        ack: 1
      };
      io.emit('whatsapp_message', aiReplyObj);

      // PERSISTENCIA
      supabase.from('whatsapp_messages').insert(aiReplyObj).then(() => { });
    }
  }
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
