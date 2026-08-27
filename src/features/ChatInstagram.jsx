import { useState, useRef } from "react";
import { T } from "../theme";
import { Btn, Inp, Tarjeta, Chip, Ico } from "../components/ui";
import { sileo as toast } from "../utils/sileo";
import { getApiUrl } from "../utils";

// ── Colores de marca Instagram ────────────────────────────────────────────
const IG_GRAD  = "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";
const IG_COLOR = "#e1306c";
const IG_SOFT  = "rgba(225,48,108,0.12)";

const STEPS = [
  { num: "1", title: "Cuenta de Negocios",   desc: "Tu cuenta de Instagram debe ser de tipo Profesional/Negocios y estar vinculada a una Fanpage de Facebook." },
  { num: "2", title: "Meta Developer App",    desc: "Ve a developers.facebook.com, crea una App y añade el producto Instagram Graph API." },
  { num: "3", title: "Page Access Token",     desc: "En la consola de Meta, obtén el Token de Acceso de Página con permisos instagram_manage_messages." },
  { num: "4", title: "Instagram Account ID",  desc: "Copia el ID numérico de tu cuenta de Instagram Business desde la consola de Meta." },
];

export function ChatInstagram({ db, t = s => s }) {
  const [token,     setToken]     = useState(localStorage.getItem("ig_token") || "");
  const [igId,      setIgId]      = useState(localStorage.getItem("ig_account_id") || "");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [chats,     setChats]     = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages,  setMessages]  = useState({});
  const [inputMsg,  setInputMsg]  = useState("");
  const dummyRef = useRef(null);
  const API_URL  = getApiUrl(db);

  const DEMO_CHATS = [
    { id: "ig_201", name: "valeria.designs",   last: "¡Me encantó el servicio! 🔥",       time: "11:05", unread: 3 },
    { id: "ig_202", name: "startup.mx",        last: "¿Tienen plan mensual?",              time: "10:30", unread: 0 },
    { id: "ig_203", name: "pedro_entrepreneur", last: "Sí, espero la propuesta. Gracias.", time: "Ayer",  unread: 0 },
  ];

  const connect = async () => {
    if (!token.trim() || !igId.trim()) {
      toast.error("Datos incompletos", { description: "Ingresa el Token y el ID de tu cuenta." });
      return;
    }
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1200)); // Simulación
    try {
      const res = await fetch(`${API_URL}/instagram/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, igId }),
      });
      if (!res.ok) throw new Error("api error");
      const data = await res.json();
      localStorage.setItem("ig_token", token);
      localStorage.setItem("ig_account_id", igId);
      setChats(data.conversations || demoChats());
    } catch (e) {
      // Demo mode
      setChats(DEMO_CHATS);
      toast.info("Modo demo activo", { description: "Conecta el backend para recibir DMs reales." });
    } finally {
      setConnected(true);
      setConnecting(false);
      localStorage.setItem("ig_token", token);
      localStorage.setItem("ig_account_id", igId);
    }
  };

  const openChat = (chat) => {
    setActiveChat(chat);
    if (!messages[chat.id]) {
      setMessages(prev => ({
        ...prev,
        [chat.id]: [
          { id: 1, from_me: false, text: chat.last,                              ts: chat.time },
          { id: 2, from_me: true,  text: "¡Hola! Gracias por escribirnos 😊 ¿En qué podemos ayudarte?", ts: "Ahora" },
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
    localStorage.removeItem("ig_token");
    localStorage.removeItem("ig_account_id");
    setConnected(false); setChats([]); setMessages({}); setActiveChat(null); setToken(""); setIgId("");
    toast.info("Instagram desconectado");
  };

  // ── Setup Wizard ─────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 32, padding: 32 }}>
        {/* Icono */}
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: IG_GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(220,39,67,0.3)" }}>
          <Ico k="camera" size={36} style={{ color: "#FFF" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: T.white, margin: 0 }}>Conectar Instagram DM</h2>
          <p style={{ color: T.whiteDim, marginTop: 8, fontSize: 14 }}>Gestiona los mensajes directos de tu cuenta Business desde ENSING CRM.</p>
        </div>

        {/* Pasos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, width: "100%", maxWidth: 800 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: IG_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: IG_COLOR, fontSize: 16 }}>{s.num}</div>
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
            <label style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Instagram Account ID</label>
            <Inp value={igId} onChange={e => setIgId(e.target.value)} placeholder="17841400000000000" style={{ fontSize: 12, fontFamily: "monospace" }} />
          </div>
          <Btn onClick={connect} disabled={connecting}
            style={{ background: IG_GRAD, border: "none", color: "#FFF", fontWeight: 800, padding: "12px 24px", borderRadius: 12 }}>
            {connecting ? "Conectando..." : "Conectar Instagram Business"}
          </Btn>
          <p style={{ fontSize: 12, color: T.whiteDim, textAlign: "center", lineHeight: 1.6 }}>
            Necesitas permisos <code style={{ color: IG_COLOR }}>instagram_manage_messages</code> en tu App de Meta.<br />
            <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style={{ color: IG_COLOR }}>Ir a Meta for Developers →</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Chat en Vivo ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 135px)", overflow: "hidden", gap: 20 }}>
      {/* HEADER */}
      <div style={{ display: "flex", gap: 16, borderBottom: `1px solid ${T.borderHi}`, paddingBottom: 16, alignItems: "center" }}>
        <div style={{ fontWeight: 800, color: T.white, fontSize: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: IG_GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico k="camera" size={14} style={{ color: "#FFF" }} />
          </div>
          Instagram Direct
        </div>
        <Chip label="Cuenta Business" color={IG_COLOR} bg={IG_SOFT} />
        <div style={{ marginLeft: "auto" }}>
          <Btn variant="secundario" size="sm" onClick={disconnect} style={{ color: T.red, borderColor: T.red }}>
            <Ico k="x" size={14} /> Desconectar
          </Btn>
        </div>
      </div>

      {/* LAYOUT */}
      <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
        {/* Lista de DMs */}
        <div style={{ width: 300, background: T.bg1, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${T.border}` }}>
            <input placeholder="Buscar DM..." style={{ background: T.bg2, border: "none", borderRadius: 8, padding: "10px 14px", color: T.white, width: "100%", outline: "none", fontSize: 13 }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {chats.map(c => (
              <div key={c.id} onClick={() => openChat(c)}
                style={{ padding: 14, borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: activeChat?.id === c.id ? T.bg2 : "transparent", display: "flex", alignItems: "center", gap: 12, transition: "all .15s" }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: IG_SOFT, color: IG_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 700, color: T.white, fontSize: 13 }}>@{c.name}</div>
                    <div style={{ fontSize: 11, color: T.whiteDim }}>{c.time}</div>
                  </div>
                  <div style={{ fontSize: 12, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{c.last}</div>
                </div>
                {c.unread > 0 && <div style={{ background: IG_COLOR, color: "#FFF", borderRadius: "50%", width: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.unread}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Mensajes */}
        <div style={{ flex: 1, background: T.bg1, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {activeChat ? (
            <>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: T.bg2, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: IG_SOFT, color: IG_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{activeChat.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 700, color: T.white, fontSize: 14 }}>@{activeChat.name}</div>
                  <div style={{ fontSize: 11, color: T.whiteDim }}>Instagram</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {(messages[activeChat.id] || []).map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.from_me ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "70%", background: m.from_me ? IG_COLOR : T.bg2, color: m.from_me ? "#FFF" : T.white, padding: "10px 14px", borderRadius: m.from_me ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 14, lineHeight: 1.5 }}>
                      {m.text}
                      <div style={{ fontSize: 10, opacity: 0.6, textAlign: "right", marginTop: 4 }}>{m.ts}</div>
                    </div>
                  </div>
                ))}
                <div ref={dummyRef} />
              </div>
              <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
                <Inp value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="Escribe un mensaje..." style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && handleSend()} />
                <Btn onClick={handleSend} style={{ background: IG_COLOR, border: "none", color: "#FFF", width: 44, height: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                  <Ico k="send" size={16} />
                </Btn>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.whiteDim, flexDirection: "column", gap: 12 }}>
              <Ico k="camera" size={48} style={{ opacity: 0.15 }} />
              <span>Selecciona un DM para responder</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
