const express = require('express');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
app.get('/', (req, res) => res.send('ENSING WhatsApp Server is Running! 🚀'));
app.get('/health', (req, res) => res.json({ status: 'ok', clientReady, latestQR: !!latestQRUrl }));
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

let clientReady = false;
let isFetchingChats = false;
let autoRules = [
  { id: 1, keyword: "hola", reply: "¡Hola! Soy el asistente virtual de ENSING CRM 🤖. ¿En qué te puedo ayudar hoy? Escribe 'opciones' para ver más." },
  { id: 2, keyword: "opciones", reply: "1. Consultar Servicios\n2. Hablar con Asesor\n3. Soporte Integraciones" }
];
let latestQRUrl = "";

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
      socket.emit('whatsapp_message', {
        id: sentMsg.id._serialized,
        clientId: data.clientId, // Devuelve el ID local para resolver en el frontend
        chatId: data.to,
        body: sentMsg.body,
        fromMe: true,
        timestamp: sentMsg.timestamp,
        ack: sentMsg.ack
      });
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
      socket.emit('whatsapp_message', {
        id: sentMsg.id._serialized,
        clientId: data.clientId,
        chatId: data.to,
        body: sentMsg.body || data.caption,
        fromMe: true,
        timestamp: sentMsg.timestamp,
        ack: sentMsg.ack,
        hasMedia: sentMsg.hasMedia
      });

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

// Lógica de Chatbot Simple
whatsappClient.on('message', async msg => {
  console.log(`Mensaje recibido de ${msg.from}: ${msg.body}`);
  io.emit('whatsapp_message', {
    id: msg.id._serialized,
    chatId: msg.from,
    body: msg.body,
    fromMe: msg.fromMe,
    timestamp: msg.timestamp,
    ack: msg.ack
  });

  const text = msg.body.toLowerCase();

  // Lógica de auto-respuestas dinámica
  for (let rule of autoRules) {
    if (text.includes(rule.keyword)) {
      const chat = await msg.getChat();
      await chat.sendStateTyping();
      setTimeout(async () => {
        await msg.reply(rule.reply);
        // Alert frontend of the reply
        io.emit('whatsapp_message', {
          id: `bot_${Date.now()}`,
          chatId: msg.from,
          body: rule.reply,
          fromMe: true,
          timestamp: Math.floor(Date.now() / 1000),
          ack: 1
        });
      }, 2000);
      break; // Respondemos solo a la primera coincidencia
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
