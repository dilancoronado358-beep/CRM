import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { Btn, Inp, Tarjeta, Celda, Chip, Ico, Modal, Sel } from "../components/ui";
import { io } from "socket.io-client";
import { useSupaState, sb } from "../hooks/useSupaState";
import { sileo as toast } from "../utils/sileo";
import { getApiUrl } from "../utils";

export function ChatWhatsApp({ db, setDb, guardarEnSupa, eliminarDeSupa, t, setModulo }) {
  const [waConnected, setWaConnected] = useState(false);
  const [waQR, setWaQR] = useState("");
  const socketRef = useRef(null);

  const WA_SERVER_URL = getApiUrl(db);

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState({});
  const [logs, setLogs] = useState([]);
  const addLog = (tag, data) => {
    setLogs(prev => [{ t: new Date().toLocaleTimeString(), tag, d: JSON.stringify(data).substring(0, 150) }, ...prev].slice(0, 30));
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMsg, setInputMsg] = useState("");
  const [tab, setTab] = useState("chats"); // 'chats' o 'automatizacion'
  const [subTab, setSubTab] = useState("simple"); // 'simple' o 'ia'
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
    delay: 2,
    ai_prompt: "",
    account_id: "" // "" significa Global
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

  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [waStatuses, setWaStatuses] = useState({}); // { [accId]: { ready, qr } }
  
  // Filtrar cuentas a las que el usuario tiene acceso
  const misCuentas = (db.whatsapp_accounts || []).filter(acc => {
      const esAdmin = db.usuario?.role === 'admin';
      const esDueno = acc.user_id === db.usuario?.id;
      const esPublico = acc.acceso === 'todos';
      return esAdmin || esDueno || esPublico;
  });

  useEffect(() => {
    if (!selectedAccountId && misCuentas.length > 0) {
      setSelectedAccountId(misCuentas[0].id);
    }
  }, [misCuentas]);

  useEffect(() => {
    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(WA_SERVER_URL, { query: { org_id: db.usuario?.org_id }, transports: ['websocket'], autoConnect: true });
    socketRef.current = socket;

    socket.onAny((event, ...args) => {
      if (['whatsapp_chats_list', 'whatsapp_message', 'whatsapp_chat_history', 'whatsapp_chat_messages'].includes(event)) return; // Ignorar los que ya logueamos
      addLog('ANY_EVENT: ' + event, args);
    });

    if (db.usuario?.org_id) {
        addLog('EMIT_JOIN_ORG', { org_id: db.usuario.org_id });
        socket.emit('join_org', db.usuario.org_id);
    }

    // Pedir estado de todas mis cuentas
    misCuentas.forEach(acc => {
        socket.emit('get_whatsapp_status', { accountId: acc.id });
    });

    socket.on('whatsapp_qr', ({ accountId, qr }) => {
      setWaStatuses(prev => ({ ...prev, [accountId]: { ...prev[accountId], qr, ready: false } }));
    });

    socket.on('whatsapp_ready', ({ accountId }) => {
      setWaStatuses(prev => ({ ...prev, [accountId]: { ...prev[accountId], qr: "", ready: true } }));
      if (accountId === selectedAccountId) {
          socket.emit('get_whatsapp_chats', { accountId });
      }
    });

    socket.on('whatsapp_chats_list', ({ accountId, chats: list }) => {
      addLog('CHATS_LIST_REC', { accountId, receivedCount: list?.length, activeAcc: selectedAccountId });
      if (String(accountId) === String(selectedAccountId)) {
          setChats(prev => {
            const newChats = [...prev];
            (list || []).forEach(inc => {
              const idx = newChats.findIndex(c => cleanId(c.id._serialized) === cleanId(inc.id._serialized));
              if (idx >= 0) {
                // Preservar name si el entrante no lo tiene, o actualizar si el entrante es mejor
                if (inc.name && inc.name !== inc.id.user) newChats[idx].name = inc.name;
                if (inc.lastMessage) newChats[idx].lastMessage = inc.lastMessage;
                newChats[idx].timestamp = inc.timestamp;
              } else {
                newChats.push(inc);
              }
            });
            return newChats.sort((a,b) => b.timestamp - a.timestamp);
          });
          setSyncError("");
          (list || []).forEach(c => socket.emit('whatsapp_get_avatar', { accountId, chatId: c.id._serialized }));
      }
    });

    socket.on('whatsapp_avatar_res', ({ accountId, id, url }) => {
      if (accountId === selectedAccountId && url) {
        setAvatars(prev => ({ ...prev, [id]: url }));
      }
    });

    const cleanId = (id) => String(id || '').replace(/\D/g, '');

    const handleBatchMessages = (data) => {
      const msgs = data.messages || data.msgs || data.data || [];
      const dataAccId = data.accountId || data.account_id || data.accId;
      addLog('BATCH_MSGS_REC', { dataAccId, count: msgs?.length, activeAcc: selectedAccountId });
      
      if (msgs && msgs.length > 0) {
        addLog('RAW_MSG_SAMPLE', msgs[0]);
      }

      const rawId = data.chatId || data.chat_id || data.id || data.from;
      const cid = cleanId(rawId);
      
      if (dataAccId && selectedAccountId && String(dataAccId) !== String(selectedAccountId)) {
          addLog('BATCH_REJECTED_ACC_MISMATCH', { rec: dataAccId, active: selectedAccountId });
          return;
      }
      if (!cid || !msgs || msgs.length === 0) return;
      
      setMessages(prev => {
        const existing = prev[cid] || [];
        const ids = new Set(existing.map(m => m.id));
        const normalizedMsgs = msgs.map(m => ({
          id: m.id || m._serialized || Math.random().toString(36),
          fromMe: m.fromMe === true || m.from_me === true || m.key?.fromMe === true,
          body: m.body || m.text || m.content || m.message?.conversation || m.msg?.body || "",
          timestamp: Number(m.timestamp || m.t || m.messageTimestamp || Math.floor(Date.now()/1000)),
          ack: m.ack || 0
        }));
        const combined = [...existing, ...normalizedMsgs.filter(m => !ids.has(m.id))].sort((a,b) => a.timestamp - b.timestamp);
        return { ...prev, [cid]: combined };
      });
      setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    };

    socket.on('whatsapp_chat_history', handleBatchMessages);
    socket.on('whatsapp_messages', handleBatchMessages);
    socket.on('whatsapp_chat_messages', handleBatchMessages);
    socket.on('whatsapp_receive_messages', handleBatchMessages);

    socket.on('whatsapp_message', (msg) => {
      addLog('NEW_MSG', msg);
      const msgAccId = msg.account_id || msg.accountId;
      if (msgAccId && selectedAccountId && msgAccId !== selectedAccountId) return;
      
      const isFromMe = msg.fromMe === true || msg.from_me === true || msg.key?.fromMe === true;
      let rawChatId = msg.chat_id || msg.chatId;
      if (!rawChatId) {
        rawChatId = isFromMe ? msg.to : msg.from;
      }
      
      const cid = cleanId(rawChatId);
      if (!cid) return;

      const normalizedMsg = {
        id: msg.id?._serialized || msg.id || msg.clientId || Math.random().toString(36),
        fromMe: isFromMe,
        body: msg.body || msg.text || msg.content || msg.message?.conversation || msg.msg?.body || "",
        timestamp: Number(msg.timestamp || msg.t || msg.messageTimestamp || Math.floor(Date.now()/1000)),
        ack: msg.ack || 0,
        hasMedia: msg.hasMedia || msg.has_media,
        mediaData: msg.mediaData || msg.mediadata,
        fileName: msg.fileName || msg.file_name,
        mimeType: msg.mimeType || msg.mimetype,
        clientId: msg.clientId
      };

      setMessages(prev => {
        const chatMsgs = prev[cid] || [];
        const newMsgs = [...chatMsgs];
        
        // Find if we already have this message by real ID or by optimistic clientId
        const existsById = newMsgs.findIndex(m => m.id && m.id === normalizedMsg.id);
        const existsByClient = normalizedMsg.clientId ? newMsgs.findIndex(m => m.clientId === normalizedMsg.clientId) : -1;
        
        if (existsByClient !== -1) {
            // Update optimistic message
            newMsgs[existsByClient] = { ...newMsgs[existsByClient], ...normalizedMsg };
            // If message_create ALSO added it, remove the duplicate
            if (existsById !== -1 && existsById !== existsByClient) {
                newMsgs.splice(existsById, 1);
            }
        } else if (existsById !== -1) {
            // Update existing real message (e.g. from message_create)
            newMsgs[existsById] = { ...newMsgs[existsById], ...normalizedMsg };
        } else {
            // New message
            newMsgs.push(normalizedMsg);
        }
        
        return { ...prev, [cid]: newMsgs };
      });

      setChats(prevChats => {
        const exists = prevChats.find(c => cleanId(c.id._serialized) === cid || c.id._serialized === rawChatId);
        if (exists) {
          return prevChats.map(c => {
            if (cleanId(c.id._serialized) === cid || c.id._serialized === rawChatId) {
              return { ...c, lastMessage: { body: normalizedMsg.body, timestamp: normalizedMsg.timestamp }, timestamp: normalizedMsg.timestamp };
            }
            return c;
          }).sort((a, b) => b.timestamp - a.timestamp);
        } else {
          // Si el chat no existía en la lista (estaba vacía), lo agregamos al principio
          const phoneNum = msg.contact_number || rawChatId.split('@')[0];
          const newChat = {
            id: { _serialized: rawChatId, user: phoneNum },
            name: msg.contact_name || phoneNum,
            timestamp: normalizedMsg.timestamp,
            lastMessage: { body: normalizedMsg.body, timestamp: normalizedMsg.timestamp }
          };
          return [newChat, ...prevChats].sort((a, b) => b.timestamp - a.timestamp);
        }
      });

      if (cid === cleanId(activeChatId)) {
        setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });

    socket.on('whatsapp_message_ack', ({ id, chat_id, ack, accountId }) => {
      if (accountId !== selectedAccountId) return;

      setMessages(prev => {
        const cid = cleanId(chat_id);
        const chatMsgs = prev[cid] || [];
        const index = chatMsgs.findIndex(m => m.id === id);
        if (index !== -1) {
          const newMsgs = [...chatMsgs];
          newMsgs[index] = { ...newMsgs[index], ack };
          return { ...prev, [cid]: newMsgs };
        }
        return prev;
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [WA_SERVER_URL, selectedAccountId]);

  // Limpiar estado al cambiar de cuenta
  useEffect(() => {
    setChats([]);
    setActiveChatId(null);
    setMessages({});
    setSyncError("");
    // Si ya sabemos que está lista, pedimos chats de inmediato
    if (waStatuses[selectedAccountId]?.ready) {
        socketRef.current?.emit('get_whatsapp_chats', { accountId: selectedAccountId });
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (activeChatId) {
      setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
      setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'auto' }), 300);
    }
  }, [activeChatId]);

  const misReglas = (db.whatsapp_automations || []).filter(r => {
      if (!r.account_id) return true; // Global
      return r.account_id === selectedAccountId;
  });

  const agregarRegla = async () => {
    if (!nuevaRegla.keyword) return toast.error("Keyword requerida");
    const id = crypto.randomUUID();
    const g = {
      id,
      org_id: db.usuario?.org_id,
      account_id: nuevaRegla.account_id || null, // Nulo es global
      keyword: nuevaRegla.keyword.toLowerCase(),
      reply_text: nuevaRegla.reply,
      ai_prompt: nuevaRegla.ai_prompt,
      media_url: nuevaRegla.media_url,
      delay: nuevaRegla.delay,
      start_time: nuevaRegla.start_time,
      end_time: nuevaRegla.end_time,
      active: true
    };
    await guardarEnSupa("whatsapp_automations", g);
    setDb(d => ({ ...d, whatsapp_automations: [...(d.whatsapp_automations || []), g] }));
    setNuevaRegla({ keyword: "", reply: "", start_time: "00:00", end_time: "23:59", media_url: "", delay: 2, ai_prompt: "", account_id: "" });
    // Sincronizar servidor
    socketRef.current?.emit('whatsapp_update_rules', { rules: [...(db.whatsapp_automations || []), g], org_id: db.usuario?.org_id });
    toast.success("Regla guardada ✅");
  };

  const eliminarRegla = async (id) => {
    if (!confirm("¿Eliminar regla?")) return;
    await eliminarDeSupa("whatsapp_automations", id);
    const filter = db.whatsapp_automations.filter(r => r.id !== id);
    setDb(d => ({ ...d, whatsapp_automations: filter }));
    socketRef.current?.emit('whatsapp_update_rules', { rules: filter, org_id: db.usuario?.org_id });
  };

  const handleSend = () => {
    if (!inputMsg.trim() && !stagedMedia) return;
    if (!activeChatId) return;

    const clientId = "local_" + Date.now();

    if (stagedMedia) {
      socketRef.current.emit('whatsapp_send_media', {
        accountId: selectedAccountId,
        to: activeChatId,
        mediaData: stagedMedia.mediaData,
        fileName: stagedMedia.fileName,
        caption: inputMsg,
        clientId: Date.now().toString(),
        org_id: db.usuario?.org_id
      });

      // Optimistic UI Feedback
      const fMsg = {
        id: clientId,
        clientId: clientId,
        chatId: activeChatId,
        fromMe: true,
        body: inputMsg,
        timestamp: Math.floor(Date.now() / 1000),
        ack: 0,
        hasMedia: true,
        mediaData: stagedMedia.mediaData,
        fileName: stagedMedia.fileName,
        mimeType: stagedMedia.mimeType,
        isUploading: true
      };
      setMessages(prev => {
        const cid = String(activeChatId || '').replace(/\D/g, '');
        const chatMsgs = prev[cid] || [];
        return { ...prev, [cid]: [...chatMsgs, fMsg] };
      });
      setStagedMedia(null);
    } else {
      if (socketRef.current && selectedAccountId) {
        const clientId = Date.now().toString();
        socketRef.current.emit('whatsapp_send_message', {
          accountId: selectedAccountId,
          to: activeChatId,
          text: inputMsg,
          clientId,
          org_id: db.usuario?.org_id
        });

        // Optimistic UI Feedback for text
        const fMsg = {
          id: clientId,
          clientId: clientId,
          chatId: activeChatId,
          fromMe: true,
          body: inputMsg,
          timestamp: Math.floor(Date.now() / 1000),
          ack: 0
        };
        setMessages(prev => {
          const cid = String(activeChatId || '').replace(/\D/g, '');
          const chatMsgs = prev[cid] || [];
          return { ...prev, [cid]: [...chatMsgs, fMsg] };
        });
      }
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

    if (file.size > 16 * 1024 * 1024) {
      toast.error("El archivo excede el límite de 16MB.");
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
    e.target.value = null;
  };

  const renderAck = (ack) => {
    if (ack === undefined || ack === null || ack === 0) return <span style={{ color: "rgba(0,0,0,0.4)", marginLeft: 6, fontSize: 12 }}>🕐</span>;
    if (ack === 1) return <span style={{ color: "rgba(0,0,0,0.45)", marginLeft: 6, fontSize: 12 }}>✓</span>;
    if (ack === 2) return <span style={{ color: "rgba(0,0,0,0.45)", marginLeft: 6, fontSize: 12 }}>✓✓</span>;
    return <span style={{ color: "#1E90FF", marginLeft: 6, fontSize: 12 }}>✓✓</span>;
  };

  const vincularChatAContacto = (contactoID) => {
    const phone = String(activeChatId || '').split('@')[0];
    setDb(prev => ({
      ...prev,
      contactos: prev.contactos.map(c => c.id === contactoID ? { ...c, telefono: phone } : c)
    }));
    setShowVincularModal(false);
    toast.success("✅ Contacto vinculado correctamente.");
  };

  const selectChat = async (chatId) => {
    addLog('SELECT_CHAT', { chatId });
    const num = String(chatId || '').replace(/\D/g, ''); 
    setActiveChatId(chatId);

    if (socketRef.current) {
        const payload = { accountId: selectedAccountId, chatId, chatId_serialized: chatId, org_id: db.usuario?.org_id };
        addLog('FORCE_SYNC_EMIT', payload);
        socketRef.current.emit('whatsapp_get_chat', payload);
        socketRef.current.emit('whatsapp_get_messages', payload);
    }
    
    // 🔥 BÚSQUEDA DEFINITIVA (Schema verificado!)
    const { data } = await sb.from("whatsapp_messages")
      .select("*")
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: false })
      .limit(60);

    let msgs = [];
    if (data && data.length > 0) {
      msgs = data.map(m => ({
        id: m.id,
        fromMe: m.from_me,
        body: m.body || m.text || "",
        timestamp: Number(m.timestamp) || Math.floor(new Date(m.created_at).getTime() / 1000),
        ack: m.ack,
        hasMedia: m.has_media,
        mediaData: m.mediadata,
        fileName: m.file_name,
        mimeType: m.mimetype
      }));
    }
    
    // Rescate de snippet si la DB falla
    if (msgs.length === 0) {
       const chatInfo = chats.find(c => c.id._serialized === chatId);
       if (chatInfo?.lastMessage) {
         msgs = [{
           id: 'snippet-' + chatId,
           fromMe: chatInfo.lastMessage.fromMe,
           body: chatInfo.lastMessage.body,
           timestamp: chatInfo.lastMessage.timestamp,
           ack: 1
         }];
       }
    }

    setMessages(prev => ({
      ...prev,
      [String(chatId || '').replace(/\D/g, '')]: msgs
    }));
    setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: 'auto' }), 300);
  };

  const forceSyncRecent = () => {
    if (!activeChatId) return;
    addLog('MANUAL_SYNC_TRIGGERED', { activeChatId });
    if (socketRef.current) {
      const payload = { 
        accountId: selectedAccountId, 
        chatId: activeChatId, 
        id: activeChatId, 
        chat_id: activeChatId,
        chatId_serialized: activeChatId,
        org_id: db.usuario?.org_id 
      };
      
      addLog('FORCE_SYNC_FULL_BURST', payload);
      
      // Intentamos todas las combinaciones posibles de eventos de carga
      socketRef.current.emit('whatsapp_get_messages', payload);
      socketRef.current.emit('whatsapp_get_chat', payload);
      socketRef.current.emit('whatsapp_get_history', payload);
      socketRef.current.emit('get_messages', payload);
      socketRef.current.emit('get_chat_messages', payload);
      socketRef.current.emit('fetch_messages', payload);
      socketRef.current.emit('load_chat', payload);
      socketRef.current.emit('sync_chat', payload);
      socketRef.current.emit('get_chat_history', payload);
    }
    selectChat(activeChatId); 
    toast.success("Sincronización masiva enviada...");
  };

  const handleUpdateReglas = () => {
    if (socketRef.current) {
      socketRef.current.emit('whatsapp_update_rules', { rules: db.whatsapp_automations || [], org_id: db.usuario?.org_id });
      toast.success("¡Configuración enviada! El bot se ha actualizado.");
    } else {
      toast.error("❌ No hay conexión con el servidor de WhatsApp.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", overflow: "hidden" }}>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

      {/* HEADER TABS EN WHATSAPP */}
      <div style={{ display: "flex", gap: 32, borderBottom: `1px solid ${T.border}`, padding: "0 10px 20px 10px", alignItems: "center", flexShrink: 0 }}>
        <button onClick={() => setTab("chats")} style={{ background: "none", border: "none", color: tab === "chats" ? T.teal : T.whiteDim, fontSize: 15, fontWeight: tab === "chats" ? 800 : 500, cursor: "pointer", position: "relative", padding: "0 0 10px 0" }}>
            Conversaciones en Vivo
            {tab === "chats" && <div style={{ position: "absolute", bottom: -20, left: 0, right: 0, height: 3, background: T.teal, borderRadius: "3px 3px 0 0" }} />}
        </button>
        <button onClick={() => setTab("automatizacion")} style={{ background: "none", border: "none", color: tab === "automatizacion" ? T.teal : T.whiteDim, fontSize: 15, fontWeight: tab === "automatizacion" ? 800 : 500, cursor: "pointer", position: "relative", padding: "0 0 10px 0" }}>
            Bot & Auto-Respuestas
            {tab === "automatizacion" && <div style={{ position: "absolute", bottom: -20, left: 0, right: 0, height: 3, background: T.teal, borderRadius: "3px 3px 0 0" }} />}
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          {misCuentas.length > 0 && <Chip label="Sistema Conectado" color={T.green} bg={T.greenS} />}
          <Btn variant="fantasma" size="sm" onClick={() => { setSyncError("Re-sincronizando..."); socketRef.current?.emit('get_whatsapp_chats', { accountId: selectedAccountId }); }} style={{ color: T.whiteDim }}><Ico k="refresh" size={14} /> Sincronizar</Btn>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", marginTop: 20 }}>
        {misCuentas.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, textAlign: "center", animation: "fadeIn .4s" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: T.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", color: T.teal }}>
                    <Ico k="phone" size={40} />
                </div>
                <div>
                    <h2 style={{ fontSize: 28, fontWeight: 900, color: T.white, marginBottom: 8 }}>Módulo WhatsApp Multi-Canal</h2>
                    <p style={{ color: T.whiteDim, maxWidth: 500, fontSize: 15, lineHeight: 1.6 }}>
                        Bienvenido al nuevo sistema de WhatsApp. Ahora puedes vincular múltiples números, separar chats personales de equipo y usar IA avanzada.
                    </p>
                </div>
                <div style={{ padding: 24, background: T.bg2, borderRadius: 16, border: `1px solid ${T.borderHi}`, maxWidth: 450 }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", textAlign: "left" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid ${T.teal}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.teal, fontWeight: 900, flexShrink: 0 }}>1</div>
                        <div style={{ fontSize: 13, color: T.whiteDim }}>Ve a la sección de <b>Configuración</b> para registrar tu primer canal.</div>
                    </div>
                </div>
                <Btn variant="primario" onClick={() => { localStorage.setItem("config_active_tab", "wa_channels"); setModulo("config"); }} style={{ padding: "14px 40px" }}>Configurar mi Primer Canal</Btn>
            </div>
        ) : (
            <>
                {tab === "chats" && (
                  <div style={{ display: "flex", gap: 0, flex: 1, minHeight: 0, minWidth: 0 }}>
                    {/* LISTA DE CHATS */}
                    <div style={{ width: 360, minWidth: 360, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.border}`, background: T.bg1, flexShrink: 0, position: "relative" }}>
                      <div style={{ padding: "24px 20px", background: T.bg1 }}>
                        <div style={{ fontSize: 12, color: T.whiteDim, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Canal Activo</div>
                        <select 
                            value={selectedAccountId || ""} 
                            onChange={e => setSelectedAccountId(e.target.value)}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: T.bg2, color: T.white, border: `1px solid ${T.border}`, fontSize: 14, fontWeight: 700, outline: "none", cursor: "pointer" }}
                        >
                            {misCuentas.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {waStatuses[acc.id]?.ready ? '🟢' : '🔴'} {acc.nombre}
                                </option>
                            ))}
                        </select>
                      </div>

                      <div style={{ padding: "0 20px 20px 20px" }}>
                        <div style={{ position: "relative" }}>
                            <Ico k="search" size={14} style={{ position: "absolute", left: 14, top: 14, color: T.whiteDim }} />
                            <input title="search" placeholder="Buscar chats..." style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px 12px 40px", color: T.white, width: "100%", outline: "none", fontSize: 13 }} />
                        </div>
                      </div>

                      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
                        {chats.map(c => (
                          <div key={c.id._serialized} onClick={() => selectChat(c.id._serialized)}
                            style={{ padding: "14px 12px", borderRadius: 12, marginBottom: 4, cursor: "pointer", background: activeChatId === c.id._serialized ? T.tealSoft : "transparent", transition: "all .2s", display: "flex", gap: 12, alignItems: "center" }}>
                            
                            {avatars[c.id._serialized] ? (
                              <img src={avatars[c.id._serialized]} alt="avatar" style={{ width: 44, height: 44, borderRadius: "14px", objectFit: "cover", flexShrink: 0, border: `1px solid ${activeChatId === c.id._serialized ? T.teal : T.borderHi}` }} />
                            ) : (
                              <div style={{ width: 44, height: 44, borderRadius: "14px", background: activeChatId === c.id._serialized ? T.teal : T.bg2, color: activeChatId === c.id._serialized ? "#000" : T.teal, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
                                {(() => {
                                    const p = String(c.id?._serialized || '').split('@')[0];
                                    const rec = db.contactos?.find(cnt => String(cnt.telefono) === p);
                                    const nom = rec?.nombre ? String(rec.nombre) : c.name;
                                    return nom ? String(nom).charAt(0).toUpperCase() : <Ico k="users" size={18} />;
                                })()}
                              </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                <div style={{ fontWeight: 800, color: T.white, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {(() => {
                                      const p = String(c.id?._serialized || '').split('@')[0];
                                      const rec = db.contactos?.find(cnt => String(cnt.telefono) === p);
                                      return rec?.nombre ? String(rec.nombre) : String(c.name || c.id?.user || p);
                                  })()}
                                </div>
                                <div style={{ fontSize: 11, color: T.whiteDim }}>
                                  {(() => {
                                      try {
                                          const ts = Number(c.timestamp);
                                          if(!ts || isNaN(ts)) return '';
                                          const d = new Date(ts * 1000);
                                          return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                      } catch(e) { return ''; }
                                  })()}
                                </div>
                              </div>
                              {c.lastMessage && <div style={{ fontSize: 12, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.7 }}>{typeof c.lastMessage.body === 'object' ? JSON.stringify(c.lastMessage.body) : String(c.lastMessage.body || "")}</div>}
                            </div>
                          </div>
                        ))}
                        {chats.length === 0 && !syncError && (
                          <div style={{ padding: 40, textAlign: "center", color: T.whiteDim, fontSize: 13, opacity: 0.5 }}>
                            {waStatuses[selectedAccountId]?.ready ? "No hay conversaciones activas." : "Esperando conexión..."}
                          </div>
                        )}
                      </div>

                      {/* OVERLAY DESCONECTADO */}
                      {selectedAccountId && !waStatuses[selectedAccountId]?.ready && (
                        <div style={{ position: "absolute", top: 100, bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", zIndex: 10 }}>
                           <div style={{ width: 60, height: 60, borderRadius: "50%", background: T.redS, color: T.red, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                              <Ico k="slash" size={30} />
                           </div>
                           <div style={{ fontWeight: 800, color: T.white, fontSize: 18, marginBottom: 12 }}>No estás conectado</div>
                           <p style={{ color: T.whiteDim, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>Este canal requiere vinculación para poder ver los chats y enviar mensajes.</p>
                           <Btn variant="primario" onClick={() => { localStorage.setItem("config_active_tab", "wa_channels"); setModulo("config"); }} style={{ background: T.red, color: T.white }}>Ir a Vincular Canal</Btn>
                        </div>
                      )}
                    </div>

                    {/* VENTANA DE MENSAJES */}
                    <div style={{ flex: 1, background: T.bg1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", minWidth: 0 }}>
                      {activeChatId ? (
                        <>
                          <div style={{ padding: "20px 32px", borderBottom: `1px solid ${T.border}`, background: T.bg1, display: "flex", alignItems: "center", gap: 16 }}>
                              {avatars[activeChatId] ? (
                                <img src={avatars[activeChatId]} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${T.borderHi}` }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.teal, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                                  <Ico k="user" size={16} />
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: T.white, fontSize: 15 }}>
                                  {(() => {
                                      const p = String(activeChatId || '').split('@')[0];
                                      const rec = db.contactos?.find(cnt => String(cnt.telefono) === p);
                                      return rec?.nombre ? String(rec.nombre) : String(chats?.find(c => c.id?._serialized === activeChatId)?.name || p);
                                  })()}
                                </div>
                                <div style={{ fontSize: 12, color: T.whiteDim }}>{activeChatId.includes('g.us') ? 'Grupo' : 'Contacto'}</div>
                              </div>

                              {!activeChatId.includes('g.us') && (
                                <div style={{ marginLeft: "auto" }}>
                                  {(() => {
                                    const phone = String(activeChatId || '').split('@')[0];
                                    const cExistente = db.contactos?.find(c => c.telefono === phone);
                                    if (cExistente) {
                                      return <Chip label={`Vínculo: ${cExistente.nombre}`} color={T.teal} bg={T.tealSoft} />;
                                    }
                                    return <Btn variant="fantasma" size="sm" onClick={() => setShowVincularModal(true)} style={{ color: T.teal, border: `1px solid ${T.teal}40`, gap: 8 }}><Ico k="user" size={14} /> Vincular a Lead</Btn>;
                                  })()}
                                </div>
                              )}
                              <Btn variant="fantasma" size="sm" onClick={forceSyncRecent} style={{ marginLeft: 12, border: `1px solid ${T.teal}40`, gap: 8, color: T.teal }}>
                                <Ico k="refresh" size={14} /> Sincronización Total
                              </Btn>
                          </div>

                          <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                              {(() => {
                                const num = String(activeChatId || '').replace(/\D/g, '');
                                const cid = String(activeChatId || '').split('@')[0];
                                const allMsgs = [...(messages[activeChatId] || []), ...(messages[cid] || []), ...(messages[num] || [])];
                                const uniqueMsgsMap = new Map();
                                
                                allMsgs.forEach(m => {
                                    // El problema es que el mensaje optimista tiene id="1234" (clientId)
                                    // Y el real tiene id="true_1234@c.us" (diferente ID)
                                    // Pero AMBOS tienen el mismo 'body' y un 'timestamp' casi idéntico.
                                    
                                    // Primero intentamos buscar si ya hay un mensaje casi idéntico
                                    let foundDuplicateKey = null;
                                    for (let [key, existing] of uniqueMsgsMap.entries()) {
                                        if (existing.id === m.id) {
                                            foundDuplicateKey = key; break;
                                        }
                                        if (existing.clientId && m.clientId && existing.clientId === m.clientId) {
                                            foundDuplicateKey = key; break;
                                        }
                                        // Si ambos son del mismo usuario, mismo texto, y enviados con menos de 10 segundos de diferencia
                                        if (existing.fromMe === m.fromMe && existing.body === m.body && Math.abs(existing.timestamp - m.timestamp) < 10) {
                                            foundDuplicateKey = key; break;
                                        }
                                    }

                                    if (foundDuplicateKey) {
                                        // Si encontramos duplicado, preferimos conservar el real (que tiene un ID más largo y 'ack' correcto)
                                        const existing = uniqueMsgsMap.get(foundDuplicateKey);
                                        const preferNew = String(m.id || '').length > String(existing.id || '').length || m.ack > existing.ack;
                                        if (preferNew) {
                                            uniqueMsgsMap.set(foundDuplicateKey, { ...existing, ...m });
                                        } else {
                                            uniqueMsgsMap.set(foundDuplicateKey, { ...m, ...existing });
                                        }
                                    } else {
                                        uniqueMsgsMap.set(m.id || Math.random().toString(), m);
                                    }
                                });
                                
                                const getTs = (msgObj) => Number(msgObj?.timestamp) || 0;
                                const msgs = Array.from(uniqueMsgsMap.values()).sort((a, b) => getTs(a) - getTs(b));
                                
                                return msgs.map((m, i) => {
                                  const isMe = m.fromMe === true || m.from_me === true;
                                  const hasMedia = m.hasMedia || m.mediaData;
                                  const isImage = hasMedia && (String(m.mimeType || '').startsWith('image/') || String(m.mediaData || '').startsWith('data:image/'));
                                  return (
                                    <div key={i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                      <div style={{ maxWidth: "70%", background: isMe ? T.teal : T.bg2, color: isMe ? "#000" : T.white, padding: "12px 16px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", fontSize: 14, lineHeight: 1.5, position: "relative" }}>
                                        {hasMedia && (
                                          <div style={{ marginBottom: m.body ? 8 : 0, position: "relative", overflow: "hidden", borderRadius: 8 }}>
                                            {isImage ? (
                                              <img src={m.mediaData} alt="Attachment" style={{ maxWidth: "100%", maxHeight: 300, cursor: "pointer", display: "block" }} onClick={() => window.open(m.mediaData, "_blank")} />
                                            ) : (
                                              <a href={m.mediaData} download={m.fileName || "documento"} style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "rgba(0,0,0,0.1)", textDecoration: "none", color: "inherit" }}>
                                                <Ico k="paperclip" size={20} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                  <div style={{ fontWeight: 800, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{m.fileName || "Archivo Adjunto"}</div>
                                                  <div style={{ fontSize: 11, opacity: 0.7 }}>Descargar documento</div>
                                                </div>
                                              </a>
                                            )}
                                          </div>
                                        )}
                                        <div style={{ whiteSpace: "pre-wrap" }}>{typeof m.body === 'object' ? JSON.stringify(m.body) : String(m.body || m.text || "")}</div>
                                        <div style={{ fontSize: 10, color: isMe ? "rgba(0,0,0,0.5)" : T.whiteDim, display: "flex", justifyContent: "flex-end", marginTop: 4, alignItems: "center", gap: 4 }}>
                                          {(() => {
                                              try {
                                                  const ts = Number(m.timestamp);
                                                  if(!ts || isNaN(ts)) return '';
                                                  const d = new Date(ts * 1000);
                                                  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                              } catch(e) { return ''; }
                                          })()}
                                          {isMe && renderAck(m.ack)}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })() }
                              <div ref={dummyRef} />
                          </div>



                          <div style={{ padding: 16, borderTop: `1px solid ${T.border}`, background: T.bg1 }}>
                              {stagedMedia && (
                                <div style={{ padding: "12px 16px", background: T.bg2, borderRadius: 12, display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                                   <Ico k={stagedMedia.isImage ? "image" : "note"} size={20} style={{ color: T.teal }} />
                                   <span style={{ fontSize: 13, color: T.white, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{stagedMedia.fileName}</span>
                                   <Btn variant="fantasma" size="sm" onClick={() => setStagedMedia(null)} style={{ color: T.red }}><Ico k="trash" size={14} /></Btn>
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                                <Btn variant="secundario" onClick={() => fileInputRef.current?.click()} style={{ width: 44, height: 44, padding: 0, justifyContent: "center", borderRadius: "50%" }}>
                                    <Ico k="plus" size={18} />
                                </Btn>
                                <Inp value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="Escribe un mensaje..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && handleSend()} />
                                <Btn variant="primario" onClick={handleSend} style={{ width: 44, height: 44, padding: 0, justifyContent: "center", borderRadius: "50%" }}>
                                    <Ico k="send" size={18} />
                                </Btn>
                              </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, opacity: 0.6 }}>
                          <div style={{ width: 70, height: 70, borderRadius: "50%", border: `1px dashed ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Ico k="chat" size={32} />
                          </div>
                          <span style={{ color: T.whiteDim, fontWeight: 700 }}>Selecciona una conversación para leer los mensajes</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tab === "automatizacion" && (
                  <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px 20px" }}>
                    <Tarjeta style={{ padding: 32, border: `1px solid ${T.border}`, background: T.bg1 }}>
                      <div style={{ display: "flex", gap: 32, marginBottom: 32, borderBottom: `1px solid ${T.border}`, paddingBottom: 16 }}>
                        <button
                          onClick={() => { setSubTab("simple"); setNuevaRegla({ ...nuevaRegla, ai_prompt: "", reply: "" }); }}
                          style={{ background: "none", border: "none", color: subTab === "simple" ? T.teal : T.whiteDim, fontSize: 14, fontWeight: subTab === "simple" ? 800 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                          <Ico k="chat" size={16} /> Respuestas Simples
                        </button>
                        <button
                          onClick={() => { setSubTab("ia"); setNuevaRegla({ ...nuevaRegla, ai_prompt: "", reply: "" }); }}
                          style={{ background: "none", border: "none", color: subTab === "ia" ? T.teal : T.whiteDim, fontSize: 14, fontWeight: subTab === "ia" ? 800 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                          <Ico k="lightning" size={16} /> Inteligencia Artificial
                        </button>
                      </div>

                      {subTab === "simple" ? (
                        <div style={{ marginBottom: 32 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 8 }}>Configurar Respuesta Simple</h3>
                          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Trigger:</label>
                                <Inp placeholder="ej. hola" value={nuevaRegla.keyword} onChange={e => setNuevaRegla({ ...nuevaRegla, keyword: e.target.value })} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Retraso (seg):</label>
                                <Inp type="number" value={nuevaRegla.delay} onChange={e => setNuevaRegla({ ...nuevaRegla, delay: e.target.value })} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Canal:</label>
                                <Sel value={nuevaRegla.account_id} 
                                    onChange={e => setNuevaRegla({ ...nuevaRegla, account_id: e.target.value })}>
                                    <div value="">🌎 Global</div>
                                    {misCuentas.map(acc => (
                                        <div key={acc.id} value={acc.id}>{acc.nombre}</div>
                                    ))}
                                </Sel>
                            </div>
                          </div>
                          <div style={{ marginBottom: 24 }}>
                              <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Mensaje de Respuesta:</label>
                              <Inp value={nuevaRegla.reply} onChange={e => setNuevaRegla({ ...nuevaRegla, reply: e.target.value })} />
                          </div>
                          <Btn variant="primario" onClick={agregarRegla}>Guardar Regla</Btn>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 32 }}>
                           <h3 style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 8 }}>Configurar Respuesta con IA</h3>
                           <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Trigger:</label>
                                    <Inp placeholder="ej. ayuda" value={nuevaRegla.keyword} onChange={e => setNuevaRegla({ ...nuevaRegla, keyword: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Canal:</label>
                                    <Sel value={nuevaRegla.account_id} 
                                        onChange={e => setNuevaRegla({ ...nuevaRegla, account_id: e.target.value })}>
                                        <div value="">🌎 Global</div>
                                        {misCuentas.map(acc => (
                                            <div key={acc.id} value={acc.id}>{acc.nombre}</div>
                                        ))}
                                    </Sel>
                                </div>
                           </div>
                           <div style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, marginBottom: 6, display: "block", textTransform: "uppercase" }}>Instrucciones IA (Prompt):</label>
                                <textarea value={nuevaRegla.ai_prompt} onChange={e => setNuevaRegla({ ...nuevaRegla, ai_prompt: e.target.value })} style={{ width: "100%", height: 100, borderRadius: 12, background: T.bg2, border: `1px solid ${T.border}`, color: T.white, padding: 16, outline: "none" }} />
                           </div>
                           <Btn variant="primario" onClick={agregarRegla}>Guardar Regla IA</Btn>
                        </div>
                      )}

                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 24 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                            <th style={{ textAlign: "left", padding: 12, color: T.whiteDim }}>Trigger</th>
                            <th style={{ textAlign: "left", padding: 12, color: T.whiteDim }}>Canal</th>
                            <th style={{ textAlign: "left", padding: 12, color: T.whiteDim }}>Respuesta / IA</th>
                            <th style={{ textAlign: "right", padding: 12, color: T.whiteDim }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {misReglas.map(r => (
                            <tr key={r.id} style={{ borderBottom: `1px solid ${T.borderHi}` }}>
                              <td style={{ padding: 12 }}><Chip label={r.keyword} color={T.teal} bg={T.tealSoft} /></td>
                              <td style={{ padding: 12 }}>{r.account_id ? misCuentas.find(a => a.id === r.account_id)?.nombre : "🌎 Global"}</td>
                              <td style={{ padding: 12 }}>{r.ai_prompt ? "🤖 " + r.ai_prompt.slice(0, 50) + "..." : r.reply_text}</td>
                              <td style={{ padding: 12, textAlign: "right" }}><Btn variant="fantasma" size="sm" onClick={() => eliminarRegla(r.id)} style={{ color: T.red }}><Ico k="trash" size={14} /></Btn></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ paddingTop: 24, display: "flex", justifyContent: "flex-end" }}>
                         <Btn variant="primario" onClick={handleUpdateReglas} style={{ background: T.teal, color: "#000" }}>Aplicar Cambios</Btn>
                      </div>
                    </Tarjeta>
                  </div>
                )}
            </>
        )}
      </div>

      <Modal open={showVincularModal} onClose={() => setShowVincularModal(false)} title="Vincular Chat a Lead">
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: T.whiteDim, fontSize: 13, marginBottom: 16 }}>Selecciona un contacto existente en el CRM para asociarle el número {activeChatId?.split('@')[0]}.</p>
            <Inp placeholder="Buscar por nombre o empresa..." value={searchLink} onChange={e => setSearchLink(e.target.value)} />
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {(db.contactos || []).filter(c => c.nombre?.toLowerCase().includes(searchLink.toLowerCase()) || c.empresa?.toLowerCase().includes(searchLink.toLowerCase())).map(c => (
              <div key={c.id} onClick={() => vincularChatAContacto(c.id)} style={{ padding: "12px 16px", background: T.bg1, borderRadius: 12, border: `1px solid ${T.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, color: T.white }}>{c.nombre}</div>
                  <div style={{ fontSize: 12, color: T.whiteDim }}>{c.empresa || "Sin empresa"}</div>
                </div>
                <Ico k="plus" size={16} style={{ color: T.teal }} />
              </div>
            ))}
          </div>
      </Modal>


    </div>
  );
}
