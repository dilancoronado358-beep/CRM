import { useState, useEffect, useRef, useMemo } from "react";
import { T } from "../theme";
import { Ico, Btn, Chip } from "../components/ui";
import { createClient } from "@supabase/supabase-js";
import { io } from "socket.io-client";

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const sb = createClient(SUPA_URL, SUPA_KEY);

export function LeadTimeline({ deal, contacto, db, setDb, guardarEnSupa, setModulo }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("all");
  const [comentario, setComentario] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [composerTab, setComposerTab] = useState("Comentario");
  const [tasks, setTasks] = useState([]);

  // States for New Task
  const [taskForm, setTaskForm] = useState({ titulo: "", prioridad: "media", vencimiento: "", asignado: db.usuario?.name || "", descripcion: "" });
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
      const cleanPhone = telefono ? telefono.replace(/\D/g, '') : "";
      if ((cleanPhone && msg.chat_id.includes(cleanPhone)) || msg.deal_id === deal.id) {
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

    // traer WhatsApp de Supabase
    if (telefono || deal?.id) {
      try {
        const cleanPhone = telefono ? telefono.replace(/\D/g, '') : "";
        let queryMsg = sb.from('whatsapp_messages').select('*');

        if (deal?.id) {
          queryMsg = queryMsg.or(`deal_id.eq.${deal.id},chat_id.ilike.%${cleanPhone}%`);
        } else if (cleanPhone) {
          queryMsg = queryMsg.ilike('chat_id', `%${cleanPhone}%`);
        } else {
          setLoading(false);
          return;
        }

        const { data: waData } = await queryMsg.order('timestamp', { ascending: false });

        if (waData) {
          waData.forEach(m => {
            timelineEntries.push({
              type: "whatsapp",
              id: m.id,
              body: m.body,
              timestamp: m.timestamp,
              fromMe: m.from_me,
              hasMedia: m.has_media,
              deal_id: m.deal_id,
              file_name: m.file_name
            });
          });
        }

        // 3. Traer Tareas (para sección Cosas para Hacer)
        const { data: tasksData } = await sb.from('tareas').select('*').eq('contactoId', contacto?.id).order('vencimiento', { ascending: true });
        if (tasksData) {
          setTasks(tasksData.filter(t => t.estado !== 'completada'));
          tasksData.forEach(t => {
            timelineEntries.push({
              type: "task",
              id: t.id,
              body: t.titulo,
              timestamp: new Date(t.creado || Date.now()).getTime() / 1000,
              deadline: t.vencimiento,
              status: t.estado,
              priority: t.prioridad
            });
          });
        }

      } catch (e) { console.error(e); }
    }

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

  const handleAddTask = async () => {
    if (!taskForm.titulo.trim()) return;
    const uid = () => Math.random().toString(36).substr(2, 9);
    const nueva = {
      ...taskForm,
      id: "t" + uid(),
      contactoId: contacto?.id || null,
      dealId: deal?.id || null,
      estado: "pendiente",
      creado: new Date().toISOString()
    };

    const { error } = await guardarEnSupa("tareas", nueva);
    if (!error) {
      // Actualizar estado global
      setDb(prev => ({ ...prev, tareas: [nueva, ...prev.tareas] }));

      // Actualizar vista local
      setTasks(prev => [nueva, ...prev]);
      setItems(prev => [{
        type: "task",
        id: nueva.id,
        body: nueva.titulo,
        timestamp: Date.now() / 1000,
        deadline: nueva.vencimiento,
        status: nueva.estado,
        priority: nueva.prioridad
      }, ...prev]);

      setTaskForm({ titulo: "", prioridad: "media", vencimiento: "", asignado: db.usuario?.name || "", descripcion: "" });
    } else {
      console.error("Error al crear tarea:", error);
    }
  };

  const handleGoToChat = () => {
    setFiltro("whatsapp");
    setComposerTab("WhatsApp");
  };

  const filteredItems = items.filter(it => {
    if (filtro === "all") return true;
    if (filtro === "whatsapp") return it.type === "whatsapp";
    if (filtro === "notes") return it.type === "note" || it.type === "task";
    return true;
  });

  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(it => {
      const date = new Date(it.timestamp * 1000);
      const day = date.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
      if (!groups[day]) groups[day] = [];
      groups[day].push(it);
    });
    return groups;
  }, [filteredItems]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f0f3f5", borderRadius: 12, border: "none", overflow: "hidden" }}>
      {/* HEADER COMPOSER (Bitrix Style) */}
      <div style={{ padding: "0 20px", borderBottom: `1px solid #d4dde1`, background: "#fff" }}>
        <div style={{ display: "flex", gap: 24 }}>
          {["Comentario", "WhatsApp", "Tarea", "Llamada"].map(t => (
            <button key={t}
              onClick={() => {
                setComposerTab(t);
                if (t === "WhatsApp") setFiltro("whatsapp");
                else setFiltro("all");
              }}
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
          <div style={{ position: "relative" }}>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Deja un comentario..."
              style={{ width: "100%", background: "#fff", border: `1px solid #c6d2d6`, borderRadius: 4, padding: "12px 16px", color: "#333", fontSize: 14, minHeight: 60, outline: "none", resize: "none" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Btn onClick={handleAddComment} disabled={!comentario.trim()} size="sm" style={{ background: "#7fb700", color: "#fff", borderRadius: 2, fontWeight: 700 }}>ENVIAR</Btn>
            </div>
          </div>
        )}

        {composerTab === "WhatsApp" && (
          <div style={{ position: "relative" }}>
            <textarea
              value={waMsg}
              onChange={e => setWaMsg(e.target.value)}
              placeholder={`Mensaje de WhatsApp...`}
              style={{ width: "100%", background: "#fff", border: `1px solid #25D366`, borderRadius: 4, padding: "12px 16px", color: "#333", fontSize: 14, minHeight: 60, outline: "none" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Btn onClick={handleSendWA} disabled={!waMsg.trim()} size="sm" style={{ background: "#25D366", color: "#fff" }}>ENVIAR WHATSAPP</Btn>
            </div>
          </div>
        )}

        {composerTab === "Tarea" && (
          <div style={{ background: "#fff", border: `1px solid #c6d2d6`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, textTransform: "uppercase" }}>Título de la tarea *</div>
                <input
                  value={taskForm.titulo}
                  onChange={e => setTaskForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="¿Qué hay que hacer?"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d4dde1", borderRadius: 4, fontSize: 14, outline: "none" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, textTransform: "uppercase" }}>Prioridad</div>
                <select
                  value={taskForm.prioridad}
                  onChange={e => setTaskForm(p => ({ ...p, prioridad: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d4dde1", borderRadius: 4, fontSize: 14, background: "#fff" }}
                >
                  <option value="alta">🔴 Alta</option>
                  <option value="media">🟡 Media</option>
                  <option value="baja">🟢 Baja</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, textTransform: "uppercase" }}>Responsable</div>
                <select
                  value={taskForm.asignado}
                  onChange={e => setTaskForm(p => ({ ...p, asignado: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d4dde1", borderRadius: 4, fontSize: 14, background: "#fff" }}
                >
                  {db.usuariosApp?.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, textTransform: "uppercase" }}>Fecha límite</div>
                <input
                  type="date"
                  value={taskForm.vencimiento}
                  onChange={e => setTaskForm(p => ({ ...p, vencimiento: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d4dde1", borderRadius: 4, fontSize: 14, outline: "none" }}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, textTransform: "uppercase" }}>Descripción</div>
                <textarea
                  value={taskForm.descripcion}
                  onChange={e => setTaskForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Detalles adicionales..."
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d4dde1", borderRadius: 4, fontSize: 14, outline: "none", minHeight: 60, resize: "none" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={handleAddTask} disabled={!taskForm.titulo.trim()} size="sm" style={{ background: "#7fb700", color: "#fff", fontWeight: 700 }}>CREAR TAREA</Btn>
            </div>
          </div>
        )}
      </div>

      {/* FEED (Full Scrollable Area) */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative", padding: "0 20px 40px" }}>

        {/* Vertical Line */}
        {filtro !== "whatsapp" && <div style={{ position: "absolute", left: 35, top: 0, bottom: 0, width: 2, background: "#d4dde1", zIndex: 0 }} />}

        {/* COSAS POR HACER SECTION */}
        {filtro === "all" && tasks.length > 0 && (
          <div style={{ position: "relative", zIndex: 1, marginBottom: 30 }}>
            <div style={{ textAlign: "center", marginBottom: 16, marginTop: 20 }}>
              <span style={{ background: "#7fb700", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Cosas para hacer</span>
            </div>
            {tasks.map(task => (
              <div key={task.id} style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#00bbd3", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid #f0f3f5", flexShrink: 0 }}>
                  <Ico k="check" size={14} style={{ color: "#fff" }} />
                </div>
                <div style={{ flex: 1, background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #c6d2d6", position: "relative", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <div style={{ color: "#00bbd3", fontWeight: 700 }}>TAREA: {task.titulo}</div>
                    <div style={{ color: "#999" }}>Límite: {task.vencimiento}</div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#333" }}>{task.descripcion || "Sin descripción"}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button style={{ background: "#00bbd3", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 2, fontSize: 11, fontWeight: 700 }}>ABRIR</button>
                    <button style={{ background: "#fff", color: "#666", border: "1px solid #c6d2d6", padding: "4px 12px", borderRadius: 2, fontSize: 11 }}>PING</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DATED GROUPS */}
        {Object.entries(groupedItems).map(([day, dayItems]) => (
          <div key={day} style={{ position: "relative", zIndex: 1 }}>
            {filtro !== "whatsapp" && (
              <div style={{ textAlign: "center", margin: "30px 0" }}>
                <span style={{ background: "#fff", padding: "4px 16px", borderRadius: 20, fontSize: 12, color: "#99b2b9", border: "1px solid #d4dde1", fontWeight: 600 }}>{day}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: filtro === "whatsapp" ? "column-reverse" : "column", gap: 16 }}>
              {dayItems.map((it, idx) => {
                const isMe = it.fromMe;
                const isWhatsApp = it.type === "whatsapp";

                if (isWhatsApp && filtro === "whatsapp") {
                  return (
                    <div key={it.id + idx} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", width: "100%", padding: "4px 0" }}>
                      <div style={{
                        maxWidth: "80%", background: isMe ? "#e1ffc7" : "#fff", color: "#333", padding: "10px 14px",
                        borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.05)"
                      }}>
                        <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{it.body}</div>
                        <div style={{ fontSize: 10, marginTop: 4, textAlign: "right", color: "#999" }}>
                          {new Date(it.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={it.id + idx} style={{ display: "flex", gap: 16 }}>
                    {/* ICON BUBBLE (Bitrix Style) */}
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: it.type === "whatsapp" ? "#25D366" : it.type === "note" ? "#00bbd3" : "#f4c63d",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "4px solid #f0f3f5", flexShrink: 0, zIndex: 2
                    }}>
                      <Ico k={it.type === "whatsapp" ? "phone" : it.type === "note" ? "comment" : "star"} size={14} style={{ color: "#fff" }} />
                    </div>

                    {/* CARD (White style) */}
                    <div style={{ flex: 1, background: "#fff", border: "1px solid #c6d2d6", borderRadius: 8, padding: 16, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#666", textTransform: "capitalize" }}>
                          {it.type === "whatsapp" ? (isMe ? "WhatsApp enviado" : "WhatsApp recibido") : "Comentario"}
                          {it.deal_id === deal.id && filtro === "all" && <span style={{ marginLeft: 8, color: "#00bbd3", fontSize: 10 }}>[Este Lead]</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#999" }}>{new Date(it.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {it.body}
                        {it.sending && <span style={{ marginLeft: 8, color: "#00bbd3", fontSize: 10 }}>[Enviando...]</span>}
                      </div>
                      {it.hasMedia && <div style={{ marginTop: 10, padding: 8, background: "#f9fafb", borderRadius: 4, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#00bbd3", border: "1px solid #eef2f4" }}>
                        <Ico k="document" size={14} /> Archivo: {it.file_name || "Adjunto de WhatsApp"}
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!loading && filteredItems.length === 0 && (
          <div style={{ textAlign: "center", color: "#999", padding: 60 }}>Sin actividad.</div>
        )}
      </div>
    </div>
  );
}
