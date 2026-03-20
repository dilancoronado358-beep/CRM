import { useState, useEffect } from "react";
import { T } from "../theme";
import { Ico, Chip } from "../components/ui";
import { useSupaState } from "../hooks/useSupaState";
import { createClient } from "@supabase/supabase-js";

// Necesitamos crear un cliente rápido para esta vista si no queremos exponer useSupaState entero para queries dinámicas
import { sb } from "../hooks/useSupaState";

export function WhatsAppHistoryLead({ telefono }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!telefono) return;
    cargarHistorial();
  }, [telefono]);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      // Buscamos mensajes donde el chatId contenga el teléfono
      const { data, error } = await sb
        .from('whatsapp_messages')
        .select('*')
        .ilike('chatId', `%${telefono}%`)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (e) {
      console.error("Error cargando historial WA:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!telefono) return <div style={{ padding: 20, color: T.whiteDim, textAlign: "center" }}>Vincule un número de WhatsApp a este contacto para ver el historial.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: 400, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase" }}>Historial de WhatsApp</h4>
        <BtnS size="sm" onClick={cargarHistorial}><Ico k="refresh" size={12} /></BtnS>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: T.bg2, borderRadius: 12, padding: 16, border: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", gap: 12 }}>
        {loading && <div style={{ textAlign: "center", color: T.teal, padding: 20 }}>Cargando mensajes...</div>}
        {!loading && messages.length === 0 && <div style={{ textAlign: "center", color: T.whiteDim, padding: 20 }}>No hay mensajes registrados para este número.</div>}
        
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.fromMe ? "flex-end" : "flex-start", maxWidth: "85%", background: m.fromMe ? T.teal : T.bg1, color: m.fromMe ? "#000" : T.white, padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
            {m.hasMedia && <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.7 }}>📎 Archivo Adjunto</div>}
            <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
            <div style={{ fontSize: 9, opacity: 0.5, marginTop: 4, textAlign: "right" }}>
              {new Date(m.timestamp * 1000).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BtnS = ({ children, onClick, size }) => (
  <button onClick={onClick} style={{ background: "transparent", border: `1px solid ${T.borderHi}`, color: T.white, borderRadius: 6, padding: size === "sm" ? "4px 8px" : "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
    {children}
  </button>
);
