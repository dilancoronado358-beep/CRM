import { useState, useEffect } from "react";
import { T } from "../theme";
import { Ico, Btn, Inp, Chip } from "../components/ui";
import { createClient } from "@supabase/supabase-js";
import { fdate } from "../utils";

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const sb = createClient(SUPA_URL, SUPA_KEY);

export function LeadTimeline({ deal, contacto, db, setDb, guardarEnSupa }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("all"); // all, whatsapp, notes
  const [comentario, setComentario] = useState("");

  const telefono = contacto?.telefono;

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

    // 2. Traer WhatsApp de Supabase
    if (telefono) {
      try {
        const { data, error } = await sb
          .from('whatsapp_messages')
          .select('*')
          .ilike('chatId', `%${telefono}%`)
          .order('timestamp', { ascending: false });
        if (data) {
          data.forEach(m => {
            timelineEntries.push({
              type: "whatsapp",
              id: m.id,
              body: m.body,
              timestamp: m.timestamp,
              fromMe: m.fromMe,
              hasMedia: m.hasMedia
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
            <button key={t} style={{ background: "none", border: "none", color: t === "Comentario" ? T.teal : T.whiteDim, fontWeight: 700, fontSize: 13, cursor: "pointer", borderBottom: t === "Comentario" ? `2px solid ${T.teal}` : "none", paddingBottom: 6 }}>{t}</button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Escribe un comentario o nota para este lead..."
            style={{ width: "100%", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 16, color: T.white, fontSize: 13, minHeight: 80, outline: "none", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <Btn onClick={handleAddComment} disabled={!comentario.trim()} size="sm" style={{ background: T.teal, color: "#000" }}>Enviar</Btn>
          </div>
        </div>
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
                  {it.type === "whatsapp" ? (it.fromMe ? "WhatsApp (Enviado)" : "WhatsApp (Recibido)") : "Nota / Comentario"}
                </div>
                <div style={{ fontSize: 11, color: T.whiteDim }}>{new Date(it.timestamp * 1000).toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 13, color: T.whiteOff, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {it.body}
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
