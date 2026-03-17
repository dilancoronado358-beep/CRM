import { useState, useEffect, useRef, useMemo } from "react";
import { T } from "../theme";
import { Ico, Btn } from "../components/ui";
import { createClient } from "@supabase/supabase-js";
import { io } from "socket.io-client";

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const sb = createClient(SUPA_URL, SUPA_KEY);

export function LeadTimeline({ deal = {}, contacto = {}, db = {}, setDb, guardarEnSupa, setModulo }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("all");
  const [comentario, setComentario] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [composerTab, setComposerTab] = useState("Comentario");

  const [taskForm, setTaskForm] = useState({ titulo: "", prioridad: "media", vencimiento: "", asignado: db?.usuario?.name || "", descripcion: "" });
  const socketRef = useRef(null);

  const telefono = contacto?.telefono;
  const adminUrl = db?.usuariosApp?.find(u => u.role === 'admin' && u.waServerUrl)?.waServerUrl;
  const WA_SERVER_URL = db?.usuario?.waServerUrl || adminUrl || `${window.location.protocol}//${window.location.hostname}:3001`;

  // Tareas filtradas para este contacto/deal desde el DB GLOBAL
  const globalTasks = useMemo(() => {
    return (db?.tareas || []).filter(t => 
      (t.contacto_id && t.contacto_id === contacto?.id) || 
      (t.deal_id && t.deal_id === deal?.id)
    );
  }, [db?.tareas, contacto?.id, deal?.id]);

  const pendingTasks = useMemo(() => globalTasks.filter(t => t.estado !== 'completada'), [globalTasks]);

  useEffect(() => {
    socketRef.current = io(WA_SERVER_URL, { transports: ['websocket'] });
    socketRef.current.on('whatsapp_message', (msg) => {
      const cleanPhone = telefono ? telefono.replace(/\D/g, '') : "";
      if ((cleanPhone && msg.chat_id?.includes(cleanPhone)) || msg.deal_id === deal?.id) {
        cargarTimeline();
      }
    });
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [telefono, deal?.id]);

  useEffect(() => {
    cargarTimeline();
  }, [telefono, deal?.id, deal?.notas, db?.tareas]);

  const cargarTimeline = async () => {
    setLoading(true);
    let entries = [];

    // 1. Nota del Deal
    if (deal?.notas) {
      entries.push({
        type: "note",
        id: "note_" + deal.id,
        body: deal.notas,
        timestamp: new Date(deal.creado || Date.now()).getTime() / 1000,
        user: deal.responsable || "Sistema"
      });
    }

    // 2. WhatsApps (Supabase)
    if (telefono || deal?.id) {
      try {
        const cleanPhone = telefono ? telefono.replace(/\D/g, '') : "";
        let q = sb.from('whatsapp_messages').select('*');
        if (deal?.id) q = q.or(`deal_id.eq.${deal.id},chat_id.ilike.%${cleanPhone}%`);
        else q = q.ilike('chat_id', `%${cleanPhone}%`);

        const { data: waData } = await q.order('timestamp', { ascending: false }).limit(50);
        if (waData) {
          waData.forEach(m => {
            entries.push({
              type: "whatsapp",
              id: m.id,
              body: m.body,
              timestamp: m.timestamp || (Date.now() / 1000),
              fromMe: m.from_me,
              hasMedia: m.has_media,
              file_name: m.file_name
            });
          });
        }
      } catch (e) { console.warn("Error cargar Timeline WA:", e); }
    }

    // 3. Tareas (usamos las del DB GLOBAL para el timeline)
    globalTasks.forEach(t => {
      entries.push({
        type: "task",
        id: t.id,
        body: t.titulo,
        timestamp: new Date(t.creado || Date.now()).getTime() / 1000,
        deadline: t.vencimiento,
        status: t.estado,
        priority: t.prioridad
      });
    });

    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    setItems(entries);
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!comentario.trim()) return;
    const nuevaNota = deal?.notas ? `${deal.notas}\n\n[${new Date().toLocaleString()}] ${comentario}` : `[${new Date().toLocaleString()}] ${comentario}`;
    await guardarEnSupa("deals", { ...deal, notas: nuevaNota });
    setComentario("");
  };

  const handleSendWA = () => {
    if (!waMsg.trim() || !telefono) return;
    if (!socketRef.current) return alert("WhatsApp no conectado");
    
    socketRef.current.emit("whatsapp_send_message", { to: telefono + "@c.us", text: waMsg, dealId: deal?.id });
    setWaMsg("");
  };

  const handleAddTask = async () => {
    if (!taskForm.titulo.trim()) return;
    const uid = () => Math.random().toString(36).substr(2, 9);
    const nueva = {
      ...taskForm,
      id: "t" + uid(),
      contacto_id: contacto?.id || null,
      deal_id: deal?.id || null,
      estado: "pendiente",
      creado: new Date().toISOString()
    };
    await guardarEnSupa("tareas", nueva);
    setTaskForm({ titulo: "", prioridad: "media", vencimiento: "", asignado: db?.usuario?.name || "", descripcion: "" });
  };

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (filtro === "all") return true;
      if (filtro === "whatsapp") return it.type === "whatsapp";
      if (filtro === "notes") return it.type === "note" || it.type === "task";
      return true;
    });
  }, [items, filtro]);

  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(it => {
      const date = new Date((it.timestamp || 0) * 1000);
      const day = date.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
      if (!groups[day]) groups[day] = [];
      groups[day].push(it);
    });
    return groups;
  }, [filteredItems]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f0f3f5", borderRadius: 12, overflow: "hidden" }}>
      {/* HEADER COMPOSER */}
      <div style={{ padding: "0 20px", borderBottom: `1px solid #d4dde1`, background: "#fff" }}>
        <div style={{ display: "flex", gap: 24 }}>
          {["Comentario", "WhatsApp", "Tarea"].map(t => (
            <button key={t}
              onClick={() => { setComposerTab(t); setFiltro(t === "WhatsApp" ? "whatsapp" : "all"); }}
              style={{
                background: "none", border: "none", color: t === composerTab ? "#333" : "#666",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                borderBottom: `3px solid ${t === composerTab ? "#00bbd3" : "transparent"}`,
                padding: "16px 4px", position: "relative", top: 1
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px", background: "#f9fafb" }}>
        {composerTab === "Comentario" && (
          <div>
            <textarea value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Deja un comentario..." style={{ width: "100%", background: "#fff", border: `1px solid #c6d2d6`, borderRadius: 4, padding: "12px 16px", fontSize: 14, minHeight: 60, outline: "none", resize: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><Btn onClick={handleAddComment} disabled={!comentario.trim()} size="sm" style={{ background: "#7fb700", color: "#fff" }}>ENVIAR</Btn></div>
          </div>
        )}
        {composerTab === "WhatsApp" && (
          <div>
            <textarea value={waMsg} onChange={e => setWaMsg(e.target.value)} placeholder="Mensaje de WhatsApp..." style={{ width: "100%", background: "#fff", border: `2px solid #25D366`, borderRadius: 4, padding: "12px 16px", fontSize: 14, minHeight: 60, outline: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><Btn onClick={handleSendWA} disabled={!waMsg.trim()} size="sm" style={{ background: "#25D366", color: "#fff" }}>ENVIAR</Btn></div>
          </div>
        )}
        {composerTab === "Tarea" && (
          <div style={{ background: "#fff", border: `1px solid #c6d2d6`, borderRadius: 8, padding: 12 }}>
            <input value={taskForm.titulo} onChange={e => setTaskForm(p => ({ ...p, titulo: e.target.value }))} placeholder="¿Qué hay que hacer? *" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d4dde1", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <select value={taskForm.prioridad} onChange={e => setTaskForm(p => ({ ...p, prioridad: e.target.value }))} style={{ flex: 1, padding: 8, border: "1px solid #d4dde1", borderRadius: 4 }}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select>
              <input type="date" value={taskForm.vencimiento} onChange={e => setTaskForm(p => ({ ...p, vencimiento: e.target.value }))} style={{ flex: 1, padding: 8, border: "1px solid #d4dde1", borderRadius: 4 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><Btn onClick={handleAddTask} disabled={!taskForm.titulo.trim()} size="sm" style={{ background: "#7fb700", color: "#fff" }}>CREAR</Btn></div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px", position: "relative" }}>
        {filtro !== "whatsapp" && <div style={{ position: "absolute", left: 35, top: 0, bottom: 0, width: 2, background: "#d4dde1" }} />}
        
        {/* PENDING TASKS */}
        {filtro === "all" && pendingTasks.length > 0 && (
          <div style={{ position: "relative", zIndex: 1, marginBottom: 20 }}>
            <div style={{ textAlign: "center", margin: "16px 0" }}><span style={{ background: "#7fb700", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 800 }}>TAREAS PENDIENTES</span></div>
            {pendingTasks.map(t => (
              <div key={t.id} style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#00bbd3", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid #f0f3f5" }}><Ico k="check" size={14} style={{ color: "#fff" }} /></div>
                <div style={{ flex: 1, background: "#fff", border: "1px solid #c6d2d6", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#00bbd3" }}>{t.titulo}</div>
                  <div style={{ fontSize: 11, color: "#999" }}>Límite: {t.vencimiento || "Sin fecha"}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FEED */}
        {Object.entries(groupedItems).map(([day, dayItems]) => (
          <div key={day} style={{ position: "relative", zIndex: 1 }}>
            <div style={{ textAlign: "center", margin: "24px 0" }}><span style={{ background: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, color: "#99b2b9", border: "1px solid #d4dde1" }}>{day}</span></div>
            {dayItems.map((it, idx) => (
              <div key={it.id + idx} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: it.type === "whatsapp" ? "#25D366" : it.type === "note" ? "#00bbd3" : "#f4c63d", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid #f0f3f5" }}>
                  <Ico k={it.type === "whatsapp" ? "phone" : it.type === "note" ? "note" : "star"} size={14} style={{ color: "#fff" }} />
                </div>
                <div style={{ flex: 1, background: "#fff", border: "1px solid #c6d2d6", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase" }}>{it.type}</div>
                    <div style={{ fontSize: 10, color: "#999" }}>{new Date((it.timestamp || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#333", whiteSpace: "pre-wrap" }}>{it.body}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {items.length === 0 && !loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Sin actividad registrada.</div>}
      </div>
    </div>
  );
}
