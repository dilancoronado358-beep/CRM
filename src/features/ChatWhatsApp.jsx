import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { Btn, Inp, Tarjeta, Celda, Chip, Ico, Modal } from "../components/ui";
import { io } from "socket.io-client";
import { useSupaState } from "../hooks/useSupaState";

export function ChatWhatsApp({ t }) {
  const { db, setDb, guardarEnSupa, eliminarDeSupa } = useSupaState();
  const [waConnected, setWaConnected] = useState(false);
  const [waQR, setWaQR] = useState("");
  const socketRef = useRef(null);

  // URL del servidor WhatsApp — se detecta automáticamente según la configuración, el admin o el host del CRM
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const adminUrl = db?.usuariosApp?.find(u => u.role === 'admin' && u.waServerUrl)?.waServerUrl;
  const WA_SERVER_URL = db?.usuario?.waServerUrl || adminUrl || `${protocol}//${window.location.hostname}:3001`;

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState({});
  const [inputMsg, setInputMsg] = useState("");
  const [tab, setTab] = useState("chats"); // 'chats' o 'automatizacion'
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [searchLink, setSearchLink] = useState("");
  const [syncError, setSyncError] = useState("");

  const [reglas, setReglas] = useState([]);
  const [nuevaRegla, setNuevaRegla] = useState({ 
    keyword: "", 
    reply: "", 
    start_time: "00:00", 
    end_time: "23:59", 
    media_url: "",
    delay: 2, // Default 2 seconds
    ai_prompt: "" 
  });

  const [avatars, setAvatars] = useState({});

  const fileInputRef = useRef(null);
  const dummyRef = useRef(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [stagedMedia, setStagedMedia] = useState(null);

  const handleAttachMenu = (type) => {
    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = "image/*";
      else fileInputRef.current.accept = "*";
      fileInputRef.current.click();
    }
    setShowAttachMenu(false);
  };

  useEffect(() => {
    // Si ya existe un socket, lo desconectamos antes de reconectar
    if (socketRef.current) socketRef.current.disconnect();

    socketRef.current = io(WA_SERVER_URL, {
      transports: ['websocket'],
      autoConnect: true
    });
    const socket = socketRef.current;

    // Proactivamente intentamos pedir el QR por HTTP si ya existe uno (ngrok fallback)
    const fetchQR = async () => {
      try {
        const res = await fetch(`${WA_SERVER_URL}/qr`, { headers: { "ngrok-skip-browser-warning": "true" } });
        if (res.ok) {
          const data = await res.json();
          if (data.qr) setWaQR(data.qr);
        }
      } catch (e) { /* ignore */ }
    };
    fetchQR();

    // Pedir estado inicial
    socket.emit('get_whatsapp_status');

    socket.on('whatsapp_qr', (qrBase64) => {
      setWaQR(qrBase64);
      setWaConnected(false);
    });

    socket.on('whatsapp_ready', () => {
      setWaConnected(true);
      setWaQR("");
      setSyncError("Sincronizando chats (puede tardar unos minutos en servidores nuevos)...");
      socket.emit('get_whatsapp_chats');
    });

    socket.on('whatsapp_chats_list', (data) => {
      setSyncError("");
      setChats(data);
      data.forEach(c => {
        socket.emit('whatsapp_get_avatar', c.id._serialized);
      });
    });

    socket.on('whatsapp_chats_error', (data) => {
      setSyncError(data.message);
    });

    socket.on('whatsapp_avatar_res', ({ id, url }) => {
      if (url) {
        setAvatars(prev => ({ ...prev, [id]: url }));
      }
    });

    socket.on('whatsapp_message', (msg) => {
      // 1. Actualizar el historial de mensajes
      setMessages(prev => {
        const chatMsgs = prev[msg.chatId] || [];
        const exists = chatMsgs.findIndex(m => m.id === msg.id || (msg.clientId && m.id === msg.clientId));
        if (exists !== -1) {
          const newMsgs = [...chatMsgs];
          newMsgs[exists] = msg;
          return { ...prev, [msg.chatId]: newMsgs };
        }
        return { ...prev, [msg.chatId]: [...chatMsgs, msg] };
      });

      // 2. [MEJORA] Actualizar la lista de chats en tiempo real (sidebar)
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c.id._serialized === msg.chatId) {
            return { ...c, lastMessage: { body: msg.body, timestamp: msg.timestamp }, timestamp: msg.timestamp };
          }
          return c;
        });
      });

      // 3. Scroll automático si el chat está activo
      if (msg.chatId === activeChatId) {
        setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });

    socket.on('whatsapp_message_ack', ({ id, chatId, ack }) => {
      setMessages(prev => {
        const chatMsgs = prev[chatId] || [];
        const index = chatMsgs.findIndex(m => m.id === id);
        if (index !== -1) {
          const newMsgs = [...chatMsgs];
          newMsgs[index] = { ...newMsgs[index], ack };
          return { ...prev, [chatId]: newMsgs };
        }
        return prev;
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [WA_SERVER_URL]);

  useEffect(() => {
    if (activeChatId) {
      // Salto inmediato al final cuando abrimos un chat
      setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    }
  }, [activeChatId]);


  useEffect(() => {
    if (db?.whatsapp_automations) {
      setReglas(db.whatsapp_automations);
    }
  }, [db?.whatsapp_automations]);

  const handleSend = () => {
    if (!inputMsg.trim() && !stagedMedia) return;
    if (!activeChatId) return;

    const clientId = "local_" + Date.now();

    if (stagedMedia) {
      const payload = {
        to: activeChatId,
        mediaData: stagedMedia.mediaData,
        fileName: stagedMedia.fileName,
        caption: inputMsg || "",
        clientId
      };

      // Emit to server
      socketRef.current?.emit('whatsapp_send_media', payload);

      // Optimistic UI Feedback
      const fMsg = {
        id: clientId,
        chatId: activeChatId,
        fromMe: true,
        body: payload.caption,
        timestamp: Math.floor(Date.now() / 1000),
        ack: 0,
        hasMedia: true,
        mediaData: stagedMedia.mediaData,
        fileName: stagedMedia.fileName,
        mimeType: stagedMedia.mimeType,
        isUploading: true
      };
      setMessages(prev => {
        const chatMsgs = prev[activeChatId] || [];
        return { ...prev, [activeChatId]: [...chatMsgs, fMsg] };
      });
      setStagedMedia(null);
    } else {
      socketRef.current?.emit('whatsapp_send_message', { to: activeChatId, text: inputMsg, clientId });

      // Optimistic UI Feedback for text
      const fMsg = {
        id: clientId,
        chatId: activeChatId,
        fromMe: true,
        body: inputMsg,
        timestamp: Math.floor(Date.now() / 1000),
        ack: 0
      };
      setMessages(prev => {
        const chatMsgs = prev[activeChatId] || [];
        return { ...prev, [activeChatId]: [...chatMsgs, fMsg] };
      });
    }

    setInputMsg("");
    // Forzar scroll al enviar
    setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const cancelUpload = (clientId) => {
    setMessages(prev => {
      if (!activeChatId || !prev[activeChatId]) return prev;
      return {
        ...prev,
        [activeChatId]: prev[activeChatId].filter(m => m.id !== clientId)
      };
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    // Validar el peso (ej. max 16MB)
    if (file.size > 16 * 1024 * 1024) {
      alert("El archivo excede el límite de 16MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Data = ev.target.result;
      const isImage = file.type.startsWith('image/');

      setStagedMedia({
        mediaData: base64Data,
        fileName: file.name,
        mimeType: file.type,
        isImage
      });
    };
    reader.readAsDataURL(file);

    // Limpiar input
    e.target.value = null;
  };

  const renderAck = (ack) => {
    if (ack === 1) return <Ico k="check_plain" size={14} style={{ color: T.whiteDim, marginLeft: 6 }} />;
    if (ack === 2) return <Ico k="checks" size={14} style={{ color: T.whiteDim, marginLeft: 6 }} />;
    if (ack >= 3) return <Ico k="checks" size={14} style={{ color: "#34B7F1", marginLeft: 6 }} />;
    // pending (0) or sending
    return <Ico k="clock" size={12} style={{ color: T.whiteDim, marginLeft: 6 }} />;
  };

  const agregarRegla = () => {
    if (!nuevaRegla.keyword || (!nuevaRegla.reply && !nuevaRegla.media_url)) return;
    const item = {
      id: crypto.randomUUID(),
      keyword: nuevaRegla.keyword.toLowerCase(),
      reply_text: nuevaRegla.reply,
      media_url: nuevaRegla.media_url,
      start_time: nuevaRegla.start_time,
      end_time: nuevaRegla.end_time,
      delay: parseInt(nuevaRegla.delay) || 0,
      ai_prompt: nuevaRegla.ai_prompt,
      active: true
    };
    setDb(prev => ({ ...prev, whatsapp_automations: [...(prev.whatsapp_automations || []), item] }));
    setNuevaRegla({ keyword: "", reply: "", start_time: "00:00", end_time: "23:59", media_url: "", delay: 2, ai_prompt: "" });
  };

  const eliminarRegla = (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta regla?")) return;
    setDb(prev => {
      const filtered = (prev.whatsapp_automations || []).filter(r => r.id !== id);
      return { ...prev, whatsapp_automations: filtered };
    });
  };

  const handleUpdateReglas = () => {
    if (socketRef.current) {
      socketRef.current.emit('whatsapp_update_rules', reglas);
      alert("✅ Reglas enviadas al bot local correctamente.");
    }
  };

  const vincularChatAContacto = (contactoID) => {
    const phone = activeChatId.split('@')[0];
    setDb(prev => ({
      ...prev,
      contactos: prev.contactos.map(c => c.id === contactoID ? { ...c, telefono: phone } : c)
    }));
    setShowVincularModal(false);
    alert("✅ Contacto vinculado correctamente.");
  };

  if (!waConnected && !waQR) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(37,211,102,0.3)" }}>
          <Ico k="phone" size={32} style={{ color: "#000" }} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T.white }}>Conectando con WhatsApp...</h2>
        <p style={{ color: T.whiteDim }}>Verificando el estado del servidor en: <span style={{ fontFamily: "monospace", color: T.teal }}>{WA_SERVER_URL}</span></p>

        {adminUrl && !db.usuario?.waServerUrl && (
          <p style={{ fontSize: 12, color: T.teal, marginTop: -10 }}>ℹ️ Usando configuración global del Administrador.</p>
        )}

        {window.location.hostname === "localhost" && !db.usuario?.waServerUrl && (
          <div style={{ padding: 12, borderRadius: 8, background: T.amber + "20", border: `1px solid ${T.amber}`, color: T.amber, fontSize: 12, maxWidth: 400, textAlign: "center" }}>
            ⚠️ Estás accediendo vía <b>localhost</b>. Si estás en otro dispositivo, cambia la configuración por la IP de tu PC o un túnel.
          </div>
        )}

        <Btn variant="primario" onClick={() => socketRef.current?.emit('get_whatsapp_status')}>Forzar Revisión</Btn>
      </div>
    );
  }

  if (!waConnected && waQR) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(37,211,102,0.3)" }}>
          <Ico k="phone" size={32} style={{ color: "#000" }} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T.white }}>Vincular Servidor WhatsApp</h2>
        <p style={{ color: T.whiteDim, textAlign: "center", maxWidth: 400 }}>Abre WhatsApp en tu teléfono, ve a "Dispositivos Vinculados" y escanea el siguiente código para iniciar el bot.</p>
        <img src={waQR} alt="WhatsApp QR Code" style={{ width: 250, height: 250, borderRadius: 16, background: "#FFF", padding: 12, border: `1px solid ${T.border}` }} />
        <p style={{ color: T.teal, fontSize: 13, fontWeight: 700 }}>El QR se actualiza automáticamente cada 3 minutos.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 135px)", overflow: "hidden", gap: 20 }}>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

      {/* HEADER TABS EN WHATSAPP */}
      <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${T.borderHi}`, paddingBottom: 16 }}>
        <button onClick={() => setTab("chats")} style={{ background: "none", border: "none", color: tab === "chats" ? T.teal : T.whiteDim, fontSize: 16, fontWeight: tab === "chats" ? 700 : 500, cursor: "pointer", pb: 5 }}>Conversaciones en Vivo</button>
        <button onClick={() => setTab("automatizacion")} style={{ background: "none", border: "none", color: tab === "automatizacion" ? T.teal : T.whiteDim, fontSize: 16, fontWeight: tab === "automatizacion" ? 700 : 500, cursor: "pointer", pb: 5 }}>Bot & Auto-Respuestas</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <Chip label="Conexión Activa" color={T.green} bg={T.green + "20"} />
          <Btn variant="secundario" size="sm" onClick={() => { setSyncError("Re-sincronizando..."); socketRef.current?.emit('get_whatsapp_chats'); }}><Ico k="refresh" size={14} /> Sincronizar</Btn>
        </div>
      </div>

      {tab === "chats" && (
        <div style={{ display: "flex", gap: 24, flex: 1, minHeight: 0 }}>
          {/* LISTA DE CHATS ORDENADA POR ÚLTIMO MENSAJE */}
          <div style={{ width: 320, background: T.bg1, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
            <div style={{ padding: 16, borderBottom: `1px solid ${T.border}` }}>
              <input placeholder="Buscar chat..." style={{ background: T.bg2, border: "none", borderRadius: 8, padding: "10px 14px", color: T.white, width: "100%", outline: "none", fontSize: 13 }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {chats.map(c => (
                <div key={c.id._serialized} onClick={() => { setActiveChatId(c.id._serialized); socketRef.current?.emit('whatsapp_get_chat', c.id._serialized); }}
                  style={{ padding: "16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: activeChatId === c.id._serialized ? T.bg2 : "transparent", transition: "all .2s", display: "flex", gap: 12, alignItems: "center" }}>

                  {avatars[c.id._serialized] ? (
                    <img src={avatars[c.id._serialized]} alt="avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${T.borderHi}` }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.tealSoft, color: T.teal, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, border: `1px solid rgba(0,0,0,0.1)` }}>
                      {c.name ? c.name.charAt(0).toUpperCase() : <Ico k="users" size={18} />}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, color: T.white, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name || c.id.user}</div>
                      <div style={{ fontSize: 11, color: T.whiteDim }}>{new Date(c.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {c.lastMessage && <div style={{ fontSize: 13, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMessage.body}</div>}
                  </div>
                </div>
              ))}
              {syncError && <div style={{ padding: 16, textAlign: "center", color: T.amber, fontSize: 12, borderBottom: `1px solid ${T.borderHi}` }}><Ico k="refresh" size={24} style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 8px" }} />{syncError}</div>}
              {chats.length === 0 && !syncError && <div style={{ padding: 32, textAlign: "center", color: T.whiteDim, fontSize: 13 }}>No hay chats recientes.</div>}
            </div>
          </div>

          {/* VENTANA DE MENSAJES */}
          <div style={{ flex: 1, background: T.bg1, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            {activeChatId ? (
              <>
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, background: T.bg2, display: "flex", alignItems: "center", gap: 12 }}>
                  {avatars[activeChatId] ? (
                    <img src={avatars[activeChatId]} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${T.borderHi}` }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.teal, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                      <Ico k="user" size={16} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: T.white, fontSize: 15 }}>{chats.find(c => c.id._serialized === activeChatId)?.name || activeChatId.split('@')[0]}</div>
                    <div style={{ fontSize: 12, color: T.whiteDim }}>{activeChatId.includes('g.us') ? 'Grupo' : 'Contacto'}</div>
                  </div>

                  {!activeChatId.includes('g.us') && (
                    <div style={{ marginLeft: "auto" }}>
                      {(() => {
                        const phone = activeChatId.split('@')[0];
                        const cExistente = db.contactos?.find(c => c.telefono === phone);
                        if (cExistente) {
                          return <Chip label={`Vínculo: ${cExistente.nombre}`} color={T.teal} bg={T.tealSoft} />;
                        }
                        return <Btn variant="fantasma" size="sm" onClick={() => setShowVincularModal(true)} style={{ color: T.teal, border: `1px solid ${T.teal}40`, gap: 8 }}><Ico k="user" size={14} /> Vincular a Lead</Btn>;
                      })()}
                    </div>
                  )}
                </div>

                {/* ÁREA DE CHAT SCROLL */}
                <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16, backgroundImage: `radial-gradient(${T.borderHi} 1px, transparent 1px)`, backgroundSize: "20px 20px" }}>
                  {(messages[activeChatId] || []).map((m, i) => {
                    const isMe = m.fromMe;
                    const hasMedia = m.hasMedia || m.mediaData;
                    const isImage = hasMedia && (m.mimeType?.startsWith('image/') || m.mediaData?.startsWith('data:image/'));
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "70%", background: isMe ? T.teal : T.bg2, color: isMe ? "#000" : T.white, padding: "12px 16px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", fontSize: 14, lineHeight: 1.5, position: "relative" }}>

                          {/* Renderizado Condicional de Media */}
                          {hasMedia && (
                            <div style={{ marginBottom: m.body ? 8 : 0, position: "relative", overflow: "hidden", borderRadius: 8 }}>
                              {isImage ? (
                                <>
                                  <img src={m.mediaData || "https://placehold.co/400x300/222/FFF?text=Image+Not+Loaded"} alt="Attachment" style={{ maxWidth: "100%", maxHeight: 300, cursor: m.isUploading ? "default" : "pointer", display: "block", filter: m.isUploading ? "brightness(0.5) grayscale(0.5)" : "none", transition: "all .3s" }} onClick={() => !m.isUploading && m.mediaData && window.open(m.mediaData, "_blank")} />
                                  {m.isUploading && (
                                    <>
                                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                        <Ico k="refresh" size={32} style={{ color: "rgba(255,255,255,0.9)", animation: "spin 1s linear infinite" }} />
                                        <span style={{ color: "#FFF", fontSize: 11, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>Enviando...</span>
                                      </div>
                                      <button onClick={() => cancelUpload(m.id)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", border: "none", color: "#FFF", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
                                        <Ico k="x" size={16} />
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div style={{ position: "relative" }}>
                                  <a href={!m.isUploading ? (m.mediaData || "#") : "#"} download={!m.isUploading ? (m.fileName || "documento") : undefined} style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "rgba(0,0,0,0.1)", textDecoration: "none", color: "inherit", opacity: m.isUploading ? 0.6 : 1, cursor: m.isUploading ? "default" : "pointer" }}>
                                    {m.isUploading ? <Ico k="refresh" size={20} style={{ animation: "spin 1s linear infinite" }} /> : <Ico k="paperclip" size={20} />}
                                    <div style={{ flex: 1, minWidth: 0, paddingRight: m.isUploading ? 30 : 0 }}>
                                      <div style={{ fontWeight: 800, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{m.fileName || "Archivo Adjunto"}</div>
                                      <div style={{ fontSize: 11, opacity: 0.7 }}>{m.isUploading ? "Subiendo documento..." : "Descargar documento"}</div>
                                    </div>
                                  </a>
                                  {m.isUploading && (
                                    <button onClick={() => cancelUpload(m.id)} style={{ position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)", background: "rgba(0,0,0,0.2)", border: "none", color: T.white, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                      <Ico k="x" size={14} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>

                          <div style={{ fontSize: 10, color: isMe ? "rgba(0,0,0,0.5)" : T.whiteDim, display: "flex", justifyContent: "flex-end", marginTop: 4, alignItems: "center", gap: 4 }}>
                            {new Date(m.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && renderAck(m.ack)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(messages[activeChatId] || []).length === 0 && <div style={{ textAlign: "center", color: T.whiteDim, marginTop: "20%" }}>Sin mensajes cacheados o vacíos.</div>}
                  <div ref={dummyRef} />
                </div>

                <div style={{ borderTop: `1px solid ${T.border}`, background: T.bg1, display: "flex", flexDirection: "column" }}>

                  {/* PREVIEW DEL ARCHIVO ADJUNTO */}
                  {stagedMedia && (
                    <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.borderHi}` }}>
                      {stagedMedia.isImage ? (
                        <div style={{ width: 44, height: 44, borderRadius: 8, backgroundImage: `url(${stagedMedia.mediaData})`, backgroundSize: "cover", backgroundPosition: "center", border: `1px solid ${T.borderHi}` }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center", color: "#9060FA", border: `1px solid ${T.borderHi}` }}>
                          <Ico k="note" size={20} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: T.white, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{stagedMedia.fileName}</div>
                        <div style={{ fontSize: 11, color: T.whiteDim }}>Archivo listo para enviar</div>
                      </div>
                      <Btn variant="fantasma" size="sm" onClick={() => setStagedMedia(null)} style={{ color: T.red, padding: 8 }} title="Cancelar"><Ico k="trash" size={16} /></Btn>
                    </div>
                  )}

                  {/* CAJA DE TEXTO */}
                  <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

                    <div style={{ position: "relative" }}>
                      <Btn variant="secundario" onClick={() => setShowAttachMenu(!showAttachMenu)} style={{ width: 44, height: 44, padding: 0, justifyContent: "center", display: "flex", borderRadius: "50%", background: showAttachMenu ? T.bg2 : undefined }}>
                        <Ico k={showAttachMenu ? "x" : "plus"} size={18} />
                      </Btn>

                      {showAttachMenu && (
                        <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 16, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 4, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 100, width: 170 }}>
                          <button onClick={() => handleAttachMenu('image')} style={{ background: "transparent", border: "none", color: T.white, padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderRadius: 8, transition: "background .2s", textAlign: "left", width: "100%", fontSize: 13, fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <Ico k="eye" size={18} style={{ color: "#34B7F1", flexShrink: 0 }} /> Imágenes
                          </button>
                          <button onClick={() => handleAttachMenu('doc')} style={{ background: "transparent", border: "none", color: T.white, padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderRadius: 8, transition: "background .2s", textAlign: "left", width: "100%", fontSize: 13, fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <Ico k="note" size={18} style={{ color: "#9060FA", flexShrink: 0 }} /> Documentos
                          </button>
                        </div>
                      )}
                    </div>

                    <Inp value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="Escribe un mensaje o adjunta un archivo..." style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') handleSend(); }} />
                    <Btn variant="primario" onClick={handleSend} style={{ width: 44, height: 44, padding: 0, justifyContent: "center", display: "flex", borderRadius: "50%" }}><Ico k="send" size={16} style={{ marginLeft: -2 }} /></Btn>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.whiteDim, flexDirection: "column", gap: 16 }}>
                <Ico k="chat" size={48} style={{ opacity: 0.2 }} />
                <span>Selecciona un chat a la izquierda para ver los mensajes.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "automatizacion" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <Tarjeta>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: T.white, marginBottom: 8 }}>Respuestas Automáticas Simples</h3>
              <p style={{ color: T.whiteDim, fontSize: 13, lineHeight: 1.5 }}>
                Define palabras clave que tus clientes suelan escribir (ej. "hola", "precio", "horario"). Cuando el bot detecte esas palabras enviará automáticamente la respuesta que configures empujada por el backend en tu dispositivo en tiempo real.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Si el mensaje contiene:</label>
                <Inp placeholder="ej. precio, hola..." value={nuevaRegla.keyword} onChange={e => setNuevaRegla({ ...nuevaRegla, keyword: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Horario de Inicio:</label>
                <input type="time" value={nuevaRegla.start_time} onChange={e => setNuevaRegla({ ...nuevaRegla, start_time: e.target.value })} style={{ width: "100%", height: 44, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "0 12px", color: T.white, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Horario de Fin:</label>
                <input type="time" value={nuevaRegla.end_time} onChange={e => setNuevaRegla({ ...nuevaRegla, end_time: e.target.value })} style={{ width: "100%", height: 44, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "0 12px", color: T.white, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Delay Respuesta (seg):</label>
                <Inp type="number" min="0" max="60" value={nuevaRegla.delay} onChange={e => setNuevaRegla({ ...nuevaRegla, delay: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Respuesta de Texto (opcional):</label>
                <textarea
                  value={nuevaRegla.reply} onChange={e => setNuevaRegla({ ...nuevaRegla, reply: e.target.value })}
                  placeholder="¡Hola! En qué puedo ayudarte..."
                  style={{ width: "100%", height: 80, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "12px 16px", color: T.white, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 13 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Prompt de IA Personalizado (opcional):</label>
                <textarea
                  value={nuevaRegla.ai_prompt} onChange={e => setNuevaRegla({ ...nuevaRegla, ai_prompt: e.target.value })}
                  placeholder="ej. Responde como un experto técnico..."
                  style={{ width: "100%", height: 80, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "12px 16px", color: T.white, outline: "none", resize: "none", fontFamily: "inherit", fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 32, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>URL Imagen/Archivo (opcional):</label>
                <Inp placeholder="https://ejemplo.com/foto.jpg" value={nuevaRegla.media_url} onChange={e => setNuevaRegla({ ...nuevaRegla, media_url: e.target.value })} />
              </div>
              <Btn variant="primario" style={{ height: 44 }} onClick={agregarRegla}><Ico k="plus" size={14} /> Agregar Regla</Btn>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: T.whiteDim, fontWeight: 700, width: "12%" }}>Trigger</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: T.whiteDim, fontWeight: 700, width: "12%" }}>Horario</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: T.whiteDim, fontWeight: 700, width: "8%" }}>Delay</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: T.whiteDim, fontWeight: 700, width: "58%" }}>Respuesta / IA Prompt</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", color: T.whiteDim, fontWeight: 700, width: "10%" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reglas.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${T.borderHi}` }}>
                     <Celda><Chip label={r.keyword} color={T.teal} bg={T.tealSoft} /></Celda>
                    <Celda><span style={{ color: T.whiteDim, fontSize: 11 }}>{r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}</span></Celda>
                    <Celda><span style={{ color: T.whiteDim, fontSize: 11 }}>{r.delay || 0}s</span></Celda>
                    <Celda>
                      <div style={{ color: T.white, fontSize: 13, wordBreak: "break-word", overflowWrap: "break-word" }}>
                        {r.ai_prompt ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                            <Ico k="lightning" size={14} style={{ color: T.teal, marginTop: 2 }} />
                            <div>
                              <div style={{ fontWeight: 700, color: T.teal, fontSize: 11, textTransform: "uppercase" }}>IA Prompt Activo</div>
                              <div style={{ fontSize: 12, color: T.whiteOff, opacity: 0.8 }}>{r.ai_prompt}</div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {r.reply_text && <div style={{ marginBottom: 4 }}>{r.reply_text}</div>}
                            {r.media_url && <div style={{ fontSize: 11, color: T.teal, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {r.media_url}</div>}
                          </>
                        )}
                      </div>
                    </Celda>
                    <Celda align="right">
                      <Btn variant="fantasma" size="sm" onClick={() => eliminarRegla(r.id)} style={{ color: T.red, padding: 8 }}>
                        <Ico k="trash" size={16} />
                      </Btn>
                    </Celda>
                  </tr>
                ))}
                {reglas.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: 32, textAlign: "center", color: T.whiteDim }}>No hay reglas automáticas creadas.</td></tr>
                )}
              </tbody>
            </table>

            <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end", borderTop: `1px solid ${T.border}`, paddingTop: 24 }}>
              <Btn variant="primario" onClick={handleUpdateReglas} style={{ background: T.teal, color: "#000" }}><Ico k="check" size={14} /> Aplicar Cambios al Bot Local</Btn>
            </div>
          </Tarjeta>
        </div>
      )}

      <Modal open={showVincularModal} onClose={() => setShowVincularModal(false)} title="Vincular Chat a Lead">
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: T.whiteDim, fontSize: 13, marginBottom: 16 }}>Selecciona un contacto existente en el CRM para asociarle el número {activeChatId?.split('@')[0]}.</p>
          <Inp placeholder="Buscar por nombre o empresa..." value={searchLink} onChange={e => setSearchLink(e.target.value)} />
        </div>
        <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {db.contactos?.filter(c => c.nombre?.toLowerCase().includes(searchLink.toLowerCase()) || c.empresa?.toLowerCase().includes(searchLink.toLowerCase())).map(c => (
            <div key={c.id} onClick={() => vincularChatAContacto(c.id)} style={{ padding: "12px 16px", background: T.bg2, borderRadius: 8, border: `1px solid ${T.borderHi}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.borderColor = T.teal} onMouseLeave={e => e.currentTarget.style.borderColor = T.borderHi}>
              <div>
                <div style={{ fontWeight: 700, color: T.white }}>{c.nombre}</div>
                <div style={{ fontSize: 12, color: T.whiteDim }}>{c.empresa || "Sin empresa"} · {c.telefono || "Sin teléfono"}</div>
              </div>
              <Ico k="plus" size={16} style={{ color: T.teal }} />
            </div>
          ))}
          {db.contactos.length === 0 && <div style={{ textAlign: "center", color: T.whiteDim, padding: 20 }}>No hay contactos disponibles.</div>}
        </div>
      </Modal>
    </div>
  );
}
