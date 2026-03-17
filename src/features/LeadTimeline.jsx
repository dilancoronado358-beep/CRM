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
  const [previewFile, setPreviewFile] = useState(null); // { data, name, type }

  const [taskForm, setTaskForm] = useState({ titulo: "", prioridad: "media", vencimiento: "", asignado: db?.usuario?.name || "", descripcion: "" });
  const socketRef = useRef(null);
  const scrollRef = useRef(null); // Ref para autoscroll del chat
  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const telefono = contacto?.telefono;
  const cleanPhone = useMemo(() => {
    let cp = telefono ? String(telefono).replace(/\D/g, '') : "";
    if (cp.startsWith('0')) cp = cp.substring(1);
    return cp;
  }, [telefono]);

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
      if ((cleanPhone && msg.chat_id?.includes(cleanPhone)) || (cleanPhone && msg.chatid?.includes(cleanPhone)) || msg.deal_id === deal?.id) {
        setTimeout(cargarTimeline, 1500);
      }
    });
    socketRef.current.on('whatsapp_message_ack', ({ id, ack }) => {
      setItems(prev => prev.map(it => it.id === id ? { ...it, ack } : it));
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
    if (cleanPhone || deal?.id) {
      try {
        let waData = [];
        let waError = null;

        // Attempt 1: Use chat_id (preferred snake_case)
        try {
          let q1 = sb.from('whatsapp_messages').select('*');
          if (deal?.id && cleanPhone) {
            q1 = q1.or(`deal_id.eq.${deal.id},chat_id.ilike.%${cleanPhone}%`);
          } else if (deal?.id) {
            q1 = q1.eq('deal_id', deal.id);
          } else if (cleanPhone) {
            q1 = q1.ilike('chat_id', `%${cleanPhone}%`);
          } else {
            q1 = q1.eq('id', 'impossible-match');
          }
          const { data, error } = await q1.order('timestamp', { ascending: false }).limit(50);
          waData = data;
          waError = error;
        } catch (e) {
          console.warn("Error en la primera consulta WA (chat_id):", e);
          waError = { message: e.message }; // Treat network/other errors as if chat_id failed
        }

        // Fallback if chat_id column doesn't exist or query failed
        if (waError && (waError.message.includes("column \"chat_id\" does not exist") || waError.message.includes("chat_id"))) {
          console.error("Error Supabase WA (chat_id no existe o falló), intentando con chatid:", waError.message);
          let q2 = sb.from('whatsapp_messages').select('*');
          if (deal?.id && cleanPhone) q2 = q2.or(`deal_id.eq.${deal.id},chatid.ilike.%${cleanPhone}%`);
          else if (deal?.id) q2 = q2.eq('deal_id', deal.id);
          else if (cleanPhone) q2 = q2.ilike('chatid', `%${cleanPhone}%`);
          else q2 = q2.eq('id', 'impossible-match'); // Should not happen if cleanPhone or deal?.id is true
          const { data: waData2, error: waError2 } = await q2.order('timestamp', { ascending: false }).limit(50);
          if (waError2) {
            console.error("Error Supabase WA (chatid):", waError2.message);
          } else if (waData2) {
            waData = waData2;
          }
        }

        if (waData) {
          waData.forEach(m => {
            entries.push({
              type: "whatsapp",
              id: m.id,
              body: m.body,
              timestamp: m.timestamp || (Date.now() / 1000),
              fromMe: m.from_me ?? m.fromme,
              hasMedia: m.has_media ?? m.hasmedia,
              file_name: m.file_name ?? m.filename,
              ack: m.ack
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

    // FUSIONAR: Preservamos los locales (id que empiezan con local_)
    setItems(prev => {
      const locales = prev.filter(p => typeof p.id === 'string' && p.id.startsWith('local_'));
      // Removemos los locales que ya llegaron del server basados en coincidencia de body
      const serverBodies = new Set(entries.filter(e => e.type === "whatsapp").map(e => e.body));
      const localesRestantes = locales.filter(l => !serverBodies.has(l.body));

      const fusionados = [...entries, ...localesRestantes];
      fusionados.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return fusionados;
    });

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

    const nuevoMsg = {
      type: "whatsapp",
      id: "local_" + Date.now(),
      body: waMsg,
      timestamp: Date.now() / 1000,
      fromMe: true
    };

    // UI Optimista: Añadir instantáneamente sin esperar a Supabase
    setItems(prev => [nuevoMsg, ...prev]);

    socketRef.current.emit("whatsapp_send_message", { to: cleanPhone.length > 5 ? (cleanPhone.includes('@') ? cleanPhone : cleanPhone + "@c.us") : (telefono.includes('@') ? telefono : telefono + "@c.us"), text: waMsg, dealId: deal?.id, clientId: nuevoMsg.id });
    setWaMsg("");

    // Autoscroll
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !telefono) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setPreviewFile({
        data: event.target.result,
        name: file.name,
        type: file.type
      });
      e.target.value = ""; // Reset input
    };
    reader.readAsDataURL(file);
  };

  const confirmSendMedia = () => {
    if (!previewFile || !socketRef.current) return;

    const nuevoMsg = {
      type: "whatsapp",
      id: "local_" + Date.now(),
      body: waMsg, // Usar waMsg como caption
      timestamp: Date.now() / 1000,
      fromMe: true,
      hasMedia: true,
      file_name: previewFile.name
    };

    setItems(prev => [nuevoMsg, ...prev]);

    socketRef.current.emit("whatsapp_send_media", {
      to: cleanPhone + "@c.us",
      mediaData: previewFile.data,
      fileName: previewFile.name,
      caption: waMsg,
      dealId: deal?.id,
      clientId: nuevoMsg.id
    });

    setPreviewFile(null);
    setWaMsg("");
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const renderAck = (ack) => {
    if (!ack || ack === 0) return <Ico k="clock" size={12} style={{ color: "#999" }} />;
    if (ack === 1) return <Ico k="check_plain" size={12} style={{ color: "#999" }} />;
    if (ack === 2) return <Ico k="checks" size={12} style={{ color: "#999" }} />;
    if (ack === 3) return <Ico k="checks" size={12} style={{ color: "#34B7F1" }} />;
    return null;
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f0f3f5", borderRadius: 12, overflow: "hidden", position: "relative" }}>

      {/* PREVIEW MODAL OVERLAY */}
      {previewFile && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 12px 24px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>Vista Previa de Adjunto</span>
              <button onClick={() => setPreviewFile(null)} style={{ background: "#eee", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666" }}>
                <Ico k="x" size={16} />
              </button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
              {previewFile.type.startsWith("image/") ? (
                <div style={{ width: "100%", borderRadius: 8, overflow: "hidden", border: "1px solid #eee" }}>
                  <img src={previewFile.data} alt="preview" style={{ width: "100%", display: "block" }} />
                </div>
              ) : (
                <div style={{ width: "100%", padding: "40px 20px", background: "#f1f3f4", borderRadius: 12, textAlign: "center", border: "2px dashed #dadce0" }}>
                  <Ico k="paperclip" size={48} style={{ color: "#25D366", marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#3c4043" }}>{previewFile.name}</div>
                  <div style={{ fontSize: 12, color: "#70757a", marginTop: 4 }}>{previewFile.type}</div>
                </div>
              )}

              <div style={{ width: "100%" }}>
                <textarea
                  value={waMsg}
                  onChange={e => setWaMsg(e.target.value)}
                  placeholder="Añadir comentario..."
                  style={{ width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, outline: "none", resize: "none" }}
                />
              </div>
            </div>

            <div style={{ padding: "12px 20px", background: "#f8f9fa", display: "flex", gap: 12 }}>
              <button onClick={() => setPreviewFile(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontWeight: 600, cursor: "pointer" }}>CANCELAR</button>
              <button onClick={confirmSendMedia} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#25D366", color: "#fff", fontWeight: 700, cursor: "pointer" }}>ENVIAR AHORA</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER COMPOSER */}
      <div style={{ padding: "0 20px", borderBottom: `1px solid #d4dde1`, background: "#fff", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 24 }}>
          {["Comentario", "WhatsApp", "Tarea"].map(t => (
            <button key={t}
              onClick={() => {
                setComposerTab(t);
                setFiltro(t === "WhatsApp" ? "whatsapp" : "all");
                if (t === "WhatsApp") setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
              }}
              style={{
                background: "none", border: "none", color: t === composerTab ? "#333" : "#666",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                borderBottom: `3px solid ${t === composerTab ? (t === "WhatsApp" ? "#25D366" : "#00bbd3") : "transparent"}`,
                padding: "16px 4px", position: "relative", top: 1
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* COMPOSER TOP SOLO PARA COMENTARIOS O TAREAS */}
      {composerTab !== "WhatsApp" && (
        <div style={{ padding: "16px 20px", background: "#f9fafb", flexShrink: 0 }}>
          {composerTab === "Comentario" && (
            <div>
              <textarea value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Deja un comentario..." style={{ width: "100%", background: "#fff", border: `1px solid #c6d2d6`, borderRadius: 4, padding: "12px 16px", fontSize: 14, minHeight: 60, outline: "none", resize: "none" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><Btn onClick={handleAddComment} disabled={!comentario.trim()} size="sm" style={{ background: "#7fb700", color: "#fff" }}>ENVIAR</Btn></div>
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
      )}

      {/* SCROLL AREA */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: composerTab === "WhatsApp" ? "20px" : "0 20px 40px", position: "relative", backgroundImage: composerTab === "WhatsApp" ? `radial-gradient(#d4dde1 1px, transparent 1px)` : "none", backgroundSize: "20px 20px" }}>
        {filtro !== "whatsapp" && <div style={{ position: "absolute", left: 35, top: 0, bottom: 0, width: 2, background: "#d4dde1" }} />}

        {/* PENDING TASKS (Solo en TODOS) */}
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

        {/* FEED VISTA CRONOLÓGICA GENERAL */}
        {composerTab !== "WhatsApp" && Object.entries(groupedItems).map(([day, dayItems]) => (
          <div key={day} style={{ position: "relative", zIndex: 1 }}>
            <div style={{ textAlign: "center", margin: "24px 0" }}><span style={{ background: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, color: "#99b2b9", border: "1px solid #d4dde1" }}>{day}</span></div>
            {dayItems.map((it, idx) => {
              return (
                <div key={it.id + idx} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: it.type === "whatsapp" ? "#25D366" : it.type === "note" ? "#00bbd3" : "#f4c63d", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid #f0f3f5", flexShrink: 0 }}>
                    <Ico k={it.type === "whatsapp" ? "phone" : it.type === "note" ? "note" : "star"} size={14} style={{ color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1, background: "#fff", border: "1px solid #c6d2d6", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase" }}>{it.type === "whatsapp" ? `WhatsApp (${it.fromMe ? 'Saliente' : 'Entrante'})` : it.type}</div>
                      <div style={{ fontSize: 10, color: "#999" }}>{new Date((it.timestamp || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {it.hasMedia && it.file_name && (
                      <div style={{ marginBottom: 4, padding: "6px 10px", background: "rgba(0,0,0,0.05)", borderRadius: 6, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        <Ico k="paperclip" size={14} /> {it.file_name}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: "#333", whiteSpace: "pre-wrap" }}>{it.body || (it.hasMedia ? "📎 Archivo adjunto" : "")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {items.length === 0 && !loading && composerTab !== "WhatsApp" && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Sin actividad registrada.</div>}

        {/* VISTA DE CHAT (Burbujas ascendentes) */}
        {composerTab === "WhatsApp" && (() => {
          const waItems = items.filter(i => i.type === "whatsapp");
          // Revertimos para que el feed vaya de más viejo a más nuevo (chat natural)
          waItems.reverse();

          return (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {waItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Sin mensajes en este chat.</div>
              ) : (
                waItems.map((it, idx) => {
                  const isMe = it.fromMe;
                  const d = new Date((it.timestamp || 0) * 1000);
                  const showDayLabel = idx === 0 || new Date((waItems[idx - 1].timestamp || 0) * 1000).toDateString() !== d.toDateString();

                  return (
                    <div key={it.id + idx}>
                      {showDayLabel && (
                        <div style={{ textAlign: "center", margin: "16px 0" }}><span style={{ background: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 11, color: "#99b2b9", border: "1px solid #d4dde1", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>{d.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</span></div>
                      )}
                      <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 12 }}>
                        <div style={{ maxWidth: "80%", background: isMe ? "#dcf8c6" : "#fff", border: isMe ? "1px solid #c1eeb0" : "1px solid #c6d2d6", padding: "8px 12px", borderRadius: isMe ? "12px 12px 0 12px" : "12px 12px 12px 0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", position: "relative" }}>
                          {it.hasMedia && it.file_name && (
                            <div style={{ marginBottom: 4, padding: "6px 10px", background: "rgba(0,0,0,0.05)", borderRadius: 6, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                              <Ico k="paperclip" size={14} /> {it.file_name}
                            </div>
                          )}
                          <div style={{ fontSize: 13, color: "#333", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{it.body || (it.hasMedia ? "📎 Archivo adjunto" : "")}</div>
                          <div style={{ fontSize: 10, color: "#999", display: "flex", justifyContent: "flex-end", marginTop: 4, alignItems: "center", gap: 4 }}>
                            {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && renderAck(it.ack)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Dummy ref para el auto-scroll natural */}
              <div ref={chatBottomRef} style={{ height: 1 }} />
            </div>
          );
        })()}
      </div>

      {/* COMPOSER BOTTOM SOLO PARA WHATSAPP (Como chat real) */}
      {composerTab === "WhatsApp" && (
        <div style={{ background: "#f0f3f5", borderTop: `1px solid #d4dde1`, flexShrink: 0 }}>
          {/* QUICK SUGGESTIONS / ACTIONS */}
          {cleanPhone && (
            <div style={{ padding: "10px 16px 0 16px", display: "flex", gap: 8, overflowX: "auto", whiteSpace: "nowrap" }}>
              <button onClick={async () => {
                const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
                const uid_gen = () => Math.random().toString(36).substr(2, 9);
                const t = { 
                  id: "t" + uid_gen(), 
                  titulo: "⏰ Seguimiento: " + (deal.titulo || "Lead"), 
                  prioridad: "media", 
                  estado: "pendiente", 
                  asignado: db.usuario?.name || "Asignado", 
                  vencimiento: manana, 
                  contacto_id: contacto.id, 
                  deal_id: deal.id, 
                  creado: new Date().toISOString() 
                };
                await guardarEnSupa("tareas", t);
                setDb(prev => ({ ...prev, tareas: [t, ...(prev.tareas || [])] }));
              }} 
              style={{ background: "#fff", border: "1px solid #d4dde1", borderRadius: 16, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: T.teal, display: "flex", alignItems: "center", gap: 5 }}>
                <Ico k="clock" size={12} /> Seguimiento Mañana
              </button>
              <button onClick={() => setWaMsg("¿Hola, cómo estás? Quería dar seguimiento a lo conversado.")} 
              style={{ background: "#fff", border: "1px solid #d4dde1", borderRadius: 16, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#555" }}>
                👋 Saludo rápido
              </button>
              <button onClick={() => setWaMsg("¡Excelente! Quedo a la espera de tu respuesta para avanzar.")} 
              style={{ background: "#fff", border: "1px solid #d4dde1", borderRadius: 16, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#555" }}>
                🎯 Cierre de charla
              </button>
            </div>
          )}
          <div style={{ padding: "12px 16px 16px 16px", position: "relative" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} />
              <Btn onClick={() => fileInputRef.current?.click()} style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", border: "1px solid #c6d2d6", color: "#666", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico k="paperclip" size={18} />
              </Btn>
              <textarea
                value={waMsg}
                onChange={e => setWaMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); previewFile ? confirmSendMedia() : handleSendWA(); } }}
                placeholder={previewFile ? "Añadir comentario..." : "Escribe un mensaje..."}
                style={{ flex: 1, background: "#fff", border: `1px solid #c6d2d6`, borderRadius: 8, padding: "10px 16px", fontSize: 14, minHeight: 44, maxHeight: 120, outline: "none", resize: "none" }}
              />
              <Btn onClick={previewFile ? confirmSendMedia() : handleSendWA} disabled={(!waMsg.trim() && !previewFile) || !cleanPhone} style={{ width: 44, height: 44, borderRadius: "50%", background: "#25D366", color: "#fff", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico k="paper-plane" size={18} style={{ marginLeft: -2 }} />
              </Btn>
            </div>
            {!cleanPhone && <div style={{ color: "red", fontSize: 11, marginTop: 12, textAlign: "center", fontWeight: 700, background: "rgba(255,0,0,0.05)", padding: 8, borderRadius: 8 }}>⚠️ Este contacto no tiene un número de teléfono válido asignado o el número es demasiado corto.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
