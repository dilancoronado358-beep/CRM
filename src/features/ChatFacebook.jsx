import { useState, useRef } from "react";
import { T } from "../theme";
import { Btn, Inp, Tarjeta, Chip, Ico } from "../components/ui";
import { sileo as toast } from "../utils/sileo";
import { getApiUrl } from "../utils";

// ── Colores de marca Facebook / Messenger ─────────────────────────────────
const FB_COLOR = "#1877F2";
const FB_SOFT  = "rgba(24,119,242,0.12)";
// Messenger tiene un degradado propio
const MSG_GRAD = "linear-gradient(135deg, #00c6ff, #0072ff)";

const STEPS = [
  { num: "1", title: "Fanpage de Facebook",  desc: "Debes ser administrador de la Página de Facebook que deseas conectar." },
  { num: "2", title: "App en Meta Developers", desc: "Crea una App en developers.facebook.com y añade el producto Messenger." },
  { num: "3", title: "Page Access Token",    desc: "En la sección de Messenger → Configuración, genera un token para tu Página." },
  { num: "4", title: "Page ID",             desc: "Copia el ID numérico de tu Fanpage desde la configuración de la Página." },
];

export function ChatFacebook({ db, t = s => s }) {
  const [token,      setToken]      = useState(localStorage.getItem("fb_token") || "");
  const [pageId,     setPageId]     = useState(localStorage.getItem("fb_page_id") || "");
  const [pageName,   setPageName]   = useState(localStorage.getItem("fb_page_name") || "");
  const [connected,  setConnected]  = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [chats,      setChats]      = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages,   setMessages]   = useState({});
  const [inputMsg,   setInputMsg]   = useState("");
  const dummyRef = useRef(null);
  const API_URL  = getApiUrl(db);

  const DEMO_CHATS = [
    { id: "fb_301", name: "Roberto Silva",  last: "¿Cuánto cuesta el plan anual?",        time: "12:10", unread: 1 },
    { id: "fb_302", name: "Laura Rivas",    last: "Gracias por la atención, muy amables.", time: "11:45", unread: 0 },
    { id: "fb_303", name: "Diego Castillo", last: "Perfecto, nos vemos el lunes.",         time: "Ayer",  unread: 0 },
  ];

  const connect = async () => {
    if (!token.trim() || !pageId.trim()) {
      toast.error("Datos incompletos", { description: "Ingresa el Token de Página y el Page ID." });
      return;
    }
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1200));
    try {
      const res = await fetch(`${API_URL}/facebook/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pageId }),
      });
      if (!res.ok) throw new Error("api error");
      const data = await res.json();
      setPageName(data.page?.name || "Mi Fanpage");
      localStorage.setItem("fb_token", token);
      localStorage.setItem("fb_page_id", pageId);
      localStorage.setItem("fb_page_name", data.page?.name || "Mi Fanpage");
      setChats(data.conversations || DEMO_CHATS);
    } catch (e) {
      const name = "Mi Fanpage ENSING";
      setPageName(name);
      localStorage.setItem("fb_token", token);
      localStorage.setItem("fb_page_id", pageId);
      localStorage.setItem("fb_page_name", name);
      setChats(DEMO_CHATS);
      toast.info("Modo demo activo", { description: "Conecta el backend para recibir mensajes reales de Messenger." });
    } finally {
      setConnected(true);
      setConnecting(false);
    }
  };

  const openChat = (chat) => {
    setActiveChat(chat);
    if (!messages[chat.id]) {
      setMessages(prev => ({
        ...prev,
        [chat.id]: [
          { id: 1, from_me: false, text: chat.last,                                   ts: chat.time },
          { id: 2, from_me: true,  text: "¡Hola! Un gusto atenderte. ¿En qué podemos ayudarte hoy?", ts: "Ahora" },
        ]
      }));
    }
    setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: "auto" }), 50);
  };

  const handleSend = () => {
    if (!inputMsg.trim() || !activeChat) return;
    const msg = { id: Date.now(), from_me: true, text: inputMsg, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => ({ ...prev, [activeChat.id]: [...(prev[activeChat.id] || []), msg] }));
    setInputMsg("");
    setTimeout(() => dummyRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const disconnect = () => {
    ["fb_token", "fb_page_id", "fb_page_name"].forEach(k => localStorage.removeItem(k));
    setConnected(false); setChats([]); setMessages({}); setActiveChat(null); setToken(""); setPageId(""); setPageName("");
    toast.info("Facebook Messenger desconectado");
  };

  // ── Setup Wizard ─────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 32, padding: 32 }}>
        {/* Icono */}
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: MSG_GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(0,114,255,0.3)" }}>
          <Ico k="chat" size={36} style={{ color: "#FFF" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: T.white, margin: 0 }}>Conectar Facebook Messenger</h2>
          <p style={{ color: T.whiteDim, marginTop: 8, fontSize: 14 }}>Responde los mensajes de tu Fanpage directamente desde ENSING CRM.</p>
        </div>

        {/* Pasos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))", gap: 14, width: "100%", maxWidth: 820 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: FB_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: FB_COLOR, fontSize: 16 }}>{s.num}</div>
              <div style={{ fontWeight: 800, color: T.white, fontSize: 13 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: T.whiteDim, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Campos */}
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Page Access Token</label>
            <Inp value={token} onChange={e => setToken(e.target.value)} placeholder="EAABsbCS..." style={{ fontSize: 12, fontFamily: "monospace" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Page ID (ID de tu Fanpage)</label>
            <Inp value={pageId} onChange={e => setPageId(e.target.value)} placeholder="108374321234567" style={{ fontSize: 12, fontFamily: "monospace" }} />
          </div>
          <Btn onClick={connect} disabled={connecting}
            style={{ background: MSG_GRAD, border: "none", color: "#FFF", fontWeight: 800, padding: "12px 24px", borderRadius: 12 }}>
            {connecting ? "Conectando..." : "Conectar Fanpage de Facebook"}
          </Btn>
          <p style={{ fontSize: 12, color: T.whiteDim, textAlign: "center", lineHeight: 1.6 }}>
            Requiere el permiso <code style={{ color: FB_COLOR }}>pages_messaging</code> en tu App de Meta.<br />
            <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style={{ color: FB_COLOR }}>Ir a Meta for Developers →</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Chat en Vivo (Messenger) ──────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 135px)", overflow: "hidden", gap: 20 }}>
      {/* HEADER */}
      <div style={{ display: "flex", gap: 16, borderBottom: `1px solid ${T.borderHi}`, paddingBottom: 16, alignItems: "center" }}>
        <div style={{ fontWeight: 800, color: T.white, fontSize: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: MSG_GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico k="chat" size={14} style={{ color: "#FFF" }} />
          </div>
          Messenger
        </div>
        <Chip label={pageName || "Fanpage"} color={FB_COLOR} bg={FB_SOFT} />
        <div style={{ marginLeft: "auto" }}>
          <Btn variant="secundario" size="sm" onClick={disconnect} style={{ color: T.red, borderColor: T.red }}>
            <Ico k="x" size={14} /> Desconectar
          </Btn>
        </div>
      </div>

      {/* LAYOUT */}
      <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
        {/* Lista */}
        <div style={{ width: 300, background: T.bg1, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${T.border}` }}>
            <input placeholder="Buscar conversación..." style={{ background: T.bg2, border: "none", borderRadius: 8, padding: "10px 14px", color: T.white, width: "100%", outline: "none", fontSize: 13 }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {chats.map(c => (
              <div key={c.id} onClick={() => openChat(c)}
                style={{ padding: 14, borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: activeChat?.id === c.id ? T.bg2 : "transparent", display: "flex", alignItems: "center", gap: 12, transition: "all .15s" }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: FB_SOFT, color: FB_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                  {c.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 700, color: T.white, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.whiteDim }}>{c.time}</div>
                  </div>
                  <div style={{ fontSize: 12, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{c.last}</div>
                </div>
                {c.unread > 0 && <div style={{ background: FB_COLOR, color: "#FFF", borderRadius: "50%", width: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.unread}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Área de mensajes */}
        <div style={{ flex: 1, background: T.bg1, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {activeChat ? (
            <>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: T.bg2, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: FB_SOFT, color: FB_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{activeChat.name.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 700, color: T.white, fontSize: 14 }}>{activeChat.name}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim }}>Facebook Messenger</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {(messages[activeChat.id] || []).map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.from_me ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "70%", background: m.from_me ? FB_COLOR : T.bg2, color: m.from_me ? "#FFF" : T.white, padding: "10px 14px", borderRadius: m.from_me ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 14, lineHeight: 1.5 }}>
                      {m.text}
                      <div style={{ fontSize: 10, opacity: 0.6, textAlign: "right", marginTop: 4 }}>{m.ts}</div>
                    </div>
                  </div>
                ))}
                <div ref={dummyRef} />
              </div>
              <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
                <Inp value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="Escribe un mensaje en Messenger..." style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && handleSend()} />
                <Btn onClick={handleSend} style={{ background: MSG_GRAD, border: "none", color: "#FFF", width: 44, height: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                  <Ico k="send" size={16} />
                </Btn>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.whiteDim, flexDirection: "column", gap: 12 }}>
              <Ico k="chat" size={48} style={{ opacity: 0.15 }} />
              <span>Selecciona una conversación para responder</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
