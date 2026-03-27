import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { Btn, Inp, Tarjeta, Chip, Ico, Modal } from "../components/ui";
import { getApiUrl } from "../utils";
import { sileo as toast } from "../utils/sileo";

// ── Colores de marca Telegram ──────────────────────────────────────────────
const TG_COLOR = "#0088cc";
const TG_SOFT  = "rgba(0,136,204,0.12)";

const STEPS = [
  { icon: "paper-plane", title: "Abre Telegram", desc: "En tu teléfono o escritorio, busca el contacto @BotFather." },
  { icon: "chat",       title: "Escribe /newbot", desc: "Sigue las instrucciones para darle un nombre y un @username a tu bot." },
  { icon: "code",       title: "Copia el Token",  desc: "BotFather te dará un token (ej: 7123456789:AAH...). Pégalo abajo." },
];

export function ChatTelegram({ db, t = s => s }) {
  const [token,      setToken]      = useState(localStorage.getItem("tg_bot_token") || "");
  const [botInfo,    setBotInfo]    = useState(null);
  const [connected,  setConnected]  = useState(false);
  const [checking,   setChecking]   = useState(false);
  const [chats,      setChats]      = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages,   setMessages]   = useState({});
  const [inputMsg,   setInputMsg]   = useState("");
  const [tab,        setTab]        = useState("chats");
  const dummyRef = useRef(null);

  const API_URL = getApiUrl(db);

  // Verificar si ya había un token guardado
  useEffect(() => {
    const saved = localStorage.getItem("tg_bot_token");
    if (saved) {
      setToken(saved);
      verifyToken(saved);
    }
  }, []);

  const verifyToken = async (tkn = token) => {
    if (!tkn.trim()) return;
    setChecking(true);
    try {
      const res = await fetch(`${API_URL}/telegram/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tkn }),
      });
      if (res.ok) {
        const data = await res.json();
        setBotInfo(data.bot);
        setConnected(true);
        localStorage.setItem("tg_bot_token", tkn);
        loadChats(tkn);
      } else {
        // Demo mode: muestra UI conectada con datos ficticios
        setBotInfo({ username: "MiCRMBot", first_name: "ENSING Bot" });
        setConnected(true);
        localStorage.setItem("tg_bot_token", tkn);
        setChats([
          { id: 101, name: "María García",    last: "Hola, me interesa el plan Pro", time: "10:42", unread: 2 },
          { id: 102, name: "Carlos Mendoza",  last: "¿Tienen soporte en español?",   time: "09:15", unread: 0 },
          { id: 103, name: "Ana Juárez",      last: "OK, gracias por la info.",      time: "Ayer",  unread: 0 },
        ]);
        toast.success("Bot conectado (modo demo)", { description: "Conecta el backend para mensajes en tiempo real." });
      }
    } catch {
      setBotInfo({ username: "MiCRMBot", first_name: "ENSING Bot" });
      setConnected(true);
      localStorage.setItem("tg_bot_token", tkn);
      setChats([
        { id: 101, name: "María García",   last: "Hola, me interesa el plan Pro", time: "10:42", unread: 2 },
        { id: 102, name: "Carlos Mendoza", last: "¿Tienen soporte en español?",   time: "09:15", unread: 0 },
      ]);
      toast.info("Modo demo activado", { description: "Servidor de Telegram no encontrado, mostrando datos de ejemplo." });
    } finally {
      setChecking(false);
    }
  };

  const loadChats = async (tkn) => {
    try {
      const res = await fetch(`${API_URL}/telegram/chats?token=${tkn}`);
      if (res.ok) setChats(await res.json());
    } catch { /* already set demo chats */ }
  };

  const openChat = (chat) => {
    setActiveChat(chat);
    if (!messages[chat.id]) {
      setMessages(prev => ({
        ...prev,
        [chat.id]: [
          { id: 1, from_me: false, text: chat.last,       ts: "10:41" },
          { id: 2, from_me: true,  text: "¡Hola! ¿Cómo puedo ayudarte hoy?", ts: "10:42" },
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
    localStorage.removeItem("tg_bot_token");
    setConnected(false); setBotInfo(null); setChats([]); setMessages({}); setActiveChat(null); setToken("");
    toast.info("Bot desvinculado");
  };

  // ── Pantalla: Introducir Token ─────────────────────────────────────────────
  if (!connected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 32, padding: 40 }}>
        {/* Icono */}
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: TG_COLOR, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 10px 30px ${TG_SOFT}` }}>
          <Ico k="paper-plane" size={36} style={{ color: "#FFF" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: T.white, margin: 0 }}>Conectar Telegram Bot</h2>
          <p style={{ color: T.whiteDim, marginTop: 8, fontSize: 14 }}>Sigue los 3 pasos para vincular tu bot de Telegram a ENSING CRM.</p>
        </div>

        {/* Pasos */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 700 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: "1 1 180px", minWidth: 160, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: TG_SOFT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico k={s.icon} size={20} style={{ color: TG_COLOR }} />
              </div>
              <div style={{ fontWeight: 800, color: T.white, fontSize: 14 }}>{i + 1}. {s.title}</div>
              <div style={{ fontSize: 13, color: T.whiteDim, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Campo Token */}
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".06em" }}>Token del Bot</label>
          <Inp
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            onKeyDown={e => e.key === "Enter" && verifyToken()}
            style={{ fontSize: 13, fontFamily: "monospace" }}
          />
          <Btn
            onClick={() => verifyToken()}
            disabled={checking || !token.trim()}
            style={{ background: TG_COLOR, border: "none", color: "#FFF", fontWeight: 800, padding: "12px 24px", borderRadius: 12 }}
          >
            {checking ? "Verificando..." : "Conectar Bot de Telegram"}
          </Btn>
        </div>
      </div>
    );
  }

  // ── Pantalla: Chat en Vivo ─────────────────────────────────────────────────
  const botQR = botInfo ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://t.me/${botInfo.username}` : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 135px)", overflow: "hidden", gap: 20 }}>
      {/* HEADER */}
      <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${T.borderHi}`, paddingBottom: 16, alignItems: "center" }}>
        <button onClick={() => setTab("chats")} style={{ background: "none", border: "none", color: tab === "chats" ? TG_COLOR : T.whiteDim, fontSize: 15, fontWeight: tab === "chats" ? 700 : 500, cursor: "pointer" }}>
          Conversaciones
        </button>
        <button onClick={() => setTab("config")} style={{ background: "none", border: "none", color: tab === "config" ? TG_COLOR : T.whiteDim, fontSize: 15, fontWeight: tab === "config" ? 700 : 500, cursor: "pointer" }}>
          Configuración del Bot
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "6px 14px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#10B981" }}>@{botInfo?.username}</span>
          </div>
          <Btn variant="secundario" size="sm" onClick={disconnect} style={{ color: T.red, borderColor: T.red }}>
            <Ico k="x" size={14} /> Desconectar
          </Btn>
        </div>
      </div>

      {/* CHATS TAB */}
      {tab === "chats" && (
        <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
          {/* Lista */}
          <div style={{ width: 300, background: T.bg1, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: `1px solid ${T.border}` }}>
              <input placeholder="Buscar chat..." style={{ background: T.bg2, border: "none", borderRadius: 8, padding: "10px 14px", color: T.white, width: "100%", outline: "none", fontSize: 13 }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {chats.map(c => (
                <div key={c.id} onClick={() => openChat(c)}
                  style={{ padding: 16, borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: activeChat?.id === c.id ? T.bg2 : "transparent", display: "flex", alignItems: "center", gap: 12, transition: "all .15s" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: TG_SOFT, color: TG_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                    {c.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 700, color: T.white, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: T.whiteDim }}>{c.time}</div>
                    </div>
                    <div style={{ fontSize: 12, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{c.last}</div>
                  </div>
                  {c.unread > 0 && <div style={{ background: TG_COLOR, color: "#FFF", borderRadius: "50%", width: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.unread}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, background: T.bg1, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {activeChat ? (
              <>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: T.bg2, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: TG_SOFT, color: TG_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{activeChat.name.charAt(0)}</div>
                  <div style={{ fontWeight: 700, color: T.white }}>{activeChat.name}</div>
                  <Chip label="Telegram" color={TG_COLOR} bg={TG_SOFT} style={{ marginLeft: "auto" }} />
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                  {(messages[activeChat.id] || []).map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.from_me ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "70%", background: m.from_me ? TG_COLOR : T.bg2, color: m.from_me ? "#FFF" : T.white, padding: "10px 14px", borderRadius: m.from_me ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 14, lineHeight: 1.5 }}>
                        {m.text}
                        <div style={{ fontSize: 10, opacity: 0.6, textAlign: "right", marginTop: 4 }}>{m.ts}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={dummyRef} />
                </div>
                <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
                  <Inp value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="Escribe un mensaje..." style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && handleSend()} />
                  <Btn onClick={handleSend} style={{ background: TG_COLOR, border: "none", color: "#FFF", width: 44, height: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                    <Ico k="send" size={16} />
                  </Btn>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.whiteDim, flexDirection: "column", gap: 12 }}>
                <Ico k="paper-plane" size={48} style={{ opacity: 0.15 }} />
                <span>Selecciona un chat para ver los mensajes</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIG TAB */}
      {tab === "config" && (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", gap: 24, flexWrap: "wrap" }}>
          {/* QR del Bot */}
          <Tarjeta style={{ padding: 28, flex: "0 0 280px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>QR de tu Bot</div>
            <div style={{ fontSize: 12, color: T.whiteDim, textAlign: "center" }}>Tus clientes escanean este código para iniciar una conversación con <b style={{ color: TG_COLOR }}>@{botInfo?.username}</b>.</div>
            {botQR && <img src={botQR} alt="Bot QR" style={{ width: 180, height: 180, borderRadius: 12, background: "#FFF", padding: 8, border: `1px solid ${T.borderHi}` }} />}
            <Btn variant="secundario" size="sm" onClick={() => window.open(botQR, "_blank")}>
              <Ico k="download" size={14} /> Descargar QR
            </Btn>
          </Tarjeta>

          {/* Info del Bot */}
          <Tarjeta style={{ padding: 28, flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>Información del Bot</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["Nombre", botInfo?.first_name || "ENSING Bot"],
                ["Username", `@${botInfo?.username || "MiCRMBot"}`],
                ["Token (parcial)", token ? `${token.slice(0, 10)}...${token.slice(-6)}` : "—"],
                ["Estado", "Activo"],
              ].map(([k, v]) => (
                <div key={k} style={{ background: T.bg2, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={disconnect} style={{ background: T.redS, border: `1px solid ${T.red}`, color: T.red, fontWeight: 700 }}>
                <Ico k="x" size={14} /> Desconectar Bot
              </Btn>
            </div>
          </Tarjeta>
        </div>
      )}
    </div>
  );
}
