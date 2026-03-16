import { useState, useEffect, useRef } from "react";
import { T } from "../theme";
import { Ico, Btn, Inp, Chip } from "../components/ui";
import { createClient } from "@supabase/supabase-js";
import { fdate } from "../utils";
import { io } from "socket.io-client";

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const sb = createClient(SUPA_URL, SUPA_KEY);

export function LeadTimeline({ deal, contacto, db, setDb, guardarEnSupa, setModulo }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("all"); // all, whatsapp, notes
  const [comentario, setComentario] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [composerTab, setComposerTab] = useState("Comentario");
  const socketRef = useRef(null);
  const dummyRef = useRef(null);

  const telefono = contacto?.telefono;
  const adminUrl = db?.usuariosApp?.find(u => u.role === 'admin' && u.waServerUrl)?.waServerUrl;
  const WA_SERVER_URL = db?.usuario?.waServerUrl || adminUrl || `${window.location.protocol}//${window.location.hostname}:3001`;

  useEffect(() => {
    // Inicializar Socket para envío en vivo
    socketRef.current = io(WA_SERVER_URL, { transports: ['websocket'] });

    socketRef.current.on('whatsapp_message', (msg) => {
      // Si el mensaje es para este chat o deal, recargamos
      if (msg.chatId.includes(telefono) || msg.deal_id === deal.id) {
        cargarTimeline();
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [telefono, deal?.id]);

  useEffect(() => {
    cargarTimeline();
  }, [telefono, deal?.id, deal?.notas]);

  const cargarTimeline = async () => {
    setLoading(true);
    let timelineEntries = [];

    // 1. Agregar Notas del Deal
    if (deal?.notas) {
      timelineEntries.push({
        type: "note",
        id: "note_" + deal.id,
        body: deal.notas,
        timestamp: new Date(deal.creado || Date.now()).getTime() / 1000,
        user: deal.responsable || "Sistema"
      });
    }

    // 2. Traer WhatsApp de Supabase (Anclados a este Deal o filtrados por Teléfono)
    if (telefono || deal?.id) {
      try {
        let query = sb.from('whatsapp_messages').select('*');

        // Priorizamos anclaje por dealId
        if (deal?.id) {
          query = query.or(`deal_id.eq.${deal.id},chatId.ilike.%${telefono}%`);
        } else {
          query = query.ilike('chatId', `%${telefono}%`);
        }

        const { data, error } = await query.order('timestamp', { ascending: false });

        if (data) {
          data.forEach(m => {
            timelineEntries.push({
              type: "whatsapp",
              id: m.id,
              body: m.body,
              timestamp: m.timestamp,
              fromMe: m.fromMe,
              hasMedia: m.hasMedia,
              deal_id: m.deal_id
            });
          });
        }
      } catch (e) { console.error(e); }
    }

    // Ordenar cronológicamente descendente
    timelineEntries.sort((a, b) => b.timestamp - a.timestamp);
    setItems(timelineEntries);
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!comentario.trim()) return;
    const nuevaNota = deal.notas ? `${deal.notas}\n\n[${new Date().toLocaleString()}] ${comentario}` : `[${new Date().toLocaleString()}] ${comentario}`;

    // Actualizar deal con la nueva nota
    const dealActualizado = { ...deal, notas: nuevaNota };
    setDb(prev => ({
      ...prev,
      deals: prev.deals.map(d => d.id === deal.id ? dealActualizado : d)
    }));
    await guardarEnSupa("deals", dealActualizado);
    setComentario("");
    cargarTimeline();
  };

  const handleSendWA = () => {
    if (!waMsg.trim() || !telefono) return;
    if (!socketRef.current) return alert("WhatsApp no conectado");

    // Actualización optimista para que aparezca "al momento"
    const optimisticMsg = {
      type: "whatsapp",
      id: "temp_" + Date.now(),
      body: waMsg,
      timestamp: Math.floor(Date.now() / 1000),
      fromMe: true,
      hasMedia: false,
      deal_id: deal.id,
      sending: true
    };

    setItems(prev => [optimisticMsg, ...prev]);

    const payload = {
      to: telefono + "@c.us",
      text: waMsg,
      dealId: deal.id
    };

    socketRef.current.emit("whatsapp_send_message", payload);
    setWaMsg("");
  };

  const handleGoToChat = () => {
    if (!telefono) return;
    const chatId = telefono + "@c.us";
    localStorage.setItem('wa_pending_chat', chatId);
    if (setModulo) setModulo('whatsapp');
  };

  const filteredItems = items.filter(it => {
    if (filtro === "all") return true;
    if (filtro === "whatsapp") return it.type === "whatsapp";
    if (filtro === "notes") return it.type === "note";
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg2, borderRadius: 16, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
      {/* HEADER COMPOSER */}
      <div style={{ padding: 20, borderBottom: `1px solid ${T.border}`, background: T.bg1 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          {["Comentario", "WhatsApp", "Tarea", "Llamada"].map(t => (
            <button key={t}
              onClick={() => setComposerTab(t)}
              style={{ background: "none", border: "none", color: t === composerTab ? T.teal : T.whiteDim, fontWeight: 700, fontSize: 13, cursor: "pointer", borderBottom: t === composerTab ? `2px solid ${T.teal}` : "none", paddingBottom: 6 }}>
              {t}
            </button>
          ))}
        </div>

        {composerTab === "Comentario" && (
          <div style={{ position: "relative" }}>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Escribe un comentario o nota para este lead..."
              style={{ width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 16, color: T.white, fontSize: 13, minHeight: 80, outline: "none", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <Btn onClick={handleAddComment} disabled={!comentario.trim()} size="sm" style={{ background: T.teal, color: "#000" }}>Guardar Nota</Btn>
            </div>
          </div>
        )}

        {composerTab === "WhatsApp" && (
          <div style={{ position: "relative" }}>
            {!telefono ? (
              <div style={{ padding: 16, textAlign: "center", color: T.red, fontSize: 12 }}>Este contacto no tiene teléfono vinculado.</div>
            ) : (
              <>
                <textarea
                  value={waMsg}
                  onChange={e => setWaMsg(e.target.value)}
                  placeholder={`Enviar WhatsApp a ${telefono}...`}
                  style={{ width: "100%", background: T.bg2, border: `3px solid ${T.teal}40`, borderRadius: 12, padding: 16, color: T.white, fontSize: 13, minHeight: 80, outline: "none", fontFamily: "inherit" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
                  <button onClick={handleGoToChat} style={{ background: "none", border: "none", color: T.teal, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Ico k="eye" size={12} /> Abrir chat completo
                  </button>
                  <Btn onClick={handleSendWA} disabled={!waMsg.trim()} size="sm" style={{ background: "#25D366", color: "#000" }}>
                    <Ico k="phone" size={12} /> Enviar Mensaje
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}

        {(composerTab === "Tarea" || composerTab === "Llamada") && (
          <div style={{ padding: 20, textAlign: "center", color: T.whiteDim, fontSize: 13 }}>Sube de nivel tu CRM. Módulo de {composerTab} próximamente...</div>
        )}
      </div>

      {/* TIMELINE SEARCH & FILTER */}
      <div style={{ padding: "12px 20px", background: T.bg1, borderBottom: `1px solid ${T.borderHi}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Chip label="Todos" color={filtro === "all" ? T.teal : T.whiteDim} bg={filtro === "all" ? T.tealSoft : "transparent"} onClick={() => setFiltro("all")} style={{ cursor: "pointer" }} />
          <Chip label="WhatsApp" color={filtro === "whatsapp" ? T.teal : T.whiteDim} bg={filtro === "whatsapp" ? T.tealSoft : "transparent"} onClick={() => setFiltro("whatsapp")} style={{ cursor: "pointer" }} />
          <Chip label="Notas" color={filtro === "notes" ? T.teal : T.whiteDim} bg={filtro === "notes" ? T.tealSoft : "transparent"} onClick={() => setFiltro("notes")} style={{ cursor: "pointer" }} />
        </div>
        <Btn variant="fantasma" size="sm" onClick={cargarTimeline}><Ico k="refresh" size={14} /></Btn>
      </div>

      {/* FEED */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
        <div style={{ position: "absolute", left: 35, top: 0, bottom: 0, width: 2, background: T.borderHi, zIndex: 0 }} />

        {loading && <div style={{ textAlign: "center", color: T.teal }}>Sincronizando línea de tiempo...</div>}

        {filteredItems.map((it, idx) => (
          <div key={it.id + idx} style={{ display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
            {/* ICON BUBBLE */}
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: it.type === "whatsapp" ? "#25D366" : T.teal,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 4px " + T.bg2, flexShrink: 0, marginTop: 4
            }}>
              <Ico k={it.type === "whatsapp" ? "phone" : "note"} size={12} style={{ color: "#000" }} />
            </div>

            {/* CONTENT CARD */}
            <div style={{ flex: 1, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: T.white, textTransform: "uppercase", letterSpacing: ".02em" }}>
                  {it.type === "whatsapp" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {it.fromMe ? "WhatsApp (Enviado)" : "WhatsApp (Recibido)"}
                      {it.deal_id === deal.id && <Chip label="Este Lead" size="xs" color={T.teal} />}
                    </span>
                  ) : "Nota / Comentario"}
                </div>
                <div style={{ fontSize: 11, color: T.whiteDim }}>{new Date(it.timestamp * 1000).toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 13, color: T.whiteOff, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {it.body} {it.sending && <span style={{ fontSize: 10, color: T.whiteDim }}>(Enviando...)</span>}
              </div>
              {it.hasMedia && <div style={{ marginTop: 10, padding: 8, background: T.bg2, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: T.teal }}>
                <Ico k="document" size={14} /> Archivo adjuntado en WhatsApp
              </div>}
            </div>
          </div>
        ))}

        {!loading && filteredItems.length === 0 && (
          <div style={{ textAlign: "center", color: T.whiteDim, padding: 40, background: T.bg1, borderRadius: 12, border: `1px dashed ${T.borderHi}`, zIndex: 1 }}>
            No hay actividad registrada aún.
          </div>
        )}
      </div>
    </div>
  );
}
