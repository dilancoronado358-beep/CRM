import { useState, useEffect, useRef, useMemo } from "react";
import { T } from "../theme";
import { Ico, Btn, Inp } from "../components/ui";
import { getApiUrl, uuid, uid } from "../utils";
import { createClient } from "@supabase/supabase-js";
import { io } from "socket.io-client";
import { sileo as toast } from "../utils/sileo";
import axios from "axios";

import { sb } from "../hooks/useSupaState";
import { SharedEmailComposer } from "./SharedEmailComposer";
/**
 * LeadTimeline: El Corazón del CRM (Pilar 3: Smart Feed Unificado)
 * Centraliza WhatsApp, Email, Notas, Tareas y Auditoría en un feed premium.
 */
export function LeadTimeline({ deal = {}, contacto = {}, db = {}, setDb, guardarEnSupa, setModulo, focusEmailId, setFocusEmailId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("all"); // all, whatsapp, email, notes
  const [comentario, setComentario] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailTo, setEmailTo] = useState(contacto?.email || "");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [emailAttachments, setEmailAttachments] = useState([]);
  const [emailAccountId, setEmailAccountId] = useState(db.email_accounts?.[0]?.id || "");
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [composerTab, setComposerTab] = useState("Comentario");
  const [emailExpandido, setEmailExpandido] = useState(null); 
  const [previewFile, setPreviewFile] = useState(null); 

  const [taskForm, setTaskForm] = useState({ titulo: "", prioridad: "media", vencimiento: "", asignado: db?.usuario?.name || "", descripcion: "" });
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const telefono = contacto?.telefono;
  const cleanPhone = useMemo(() => {
    let cp = telefono ? String(telefono).replace(/\D/g, '') : "";
    if (cp.startsWith('0')) cp = cp.substring(1);
    return cp;
  }, [telefono]);

  const WA_SERVER_URL = getApiUrl(db);

  // Tareas filtradas para este contacto/deal desde el DB GLOBAL
  const globalTasks = useMemo(() => {
    return (db?.tareas || []).filter(t =>
      (t.contacto_id && t.contacto_id === contacto?.id) ||
      (t.deal_id && t.deal_id === deal?.id)
    );
  }, [db?.tareas, contacto?.id, deal?.id]);

  const pendingTasks = useMemo(() => globalTasks.filter(t => t.estado !== 'completada'), [globalTasks]);

  useEffect(() => {
    socketRef.current = io(WA_SERVER_URL, { 
      auth: { org_id: db.usuario?.org_id },
      query: { org_id: db.usuario?.org_id },
      transports: ['websocket'] 
    });
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
  }, [telefono, deal?.id, deal?.notas, (db?.tareas || []).length, (db?.actividades || []).length, (db?.auditoria || []).length]);

  const cargarTimeline = async () => {
    setLoading(true);
    let entries = [];

    // 1. Nota del Deal / Comentarios
    if (deal?.notas) {
      entries.push({
        type: "note",
        id: "note_" + deal.id,
        body: deal.notas,
        timestamp: new Date(deal.creado || Date.now()).getTime() / 1000,
        user: deal.responsable || "Sistema"
      });
    }

    // 2. Evento de Creación
    if (deal?.creado) {
       entries.push({
         type: "event",
         id: "spawn_" + deal.id,
         body: `Oportunidad creada por ${deal.responsable || 'Sistema'}`,
         timestamp: new Date(deal.creado).getTime() / 1000,
         icon: "plus",
         color: T.teal
       });
    }

    // 3. WhatsApps (Supabase)
    if (cleanPhone || deal?.id) {
      try {
        let waData = [];
        let q1 = sb.from('whatsapp_messages').select('*').eq('org_id', db.usuario?.org_id);
        if (deal?.id && cleanPhone) {
          q1 = q1.or(`deal_id.eq.${deal.id},chat_id.ilike.%${cleanPhone}%`);
        } else if (deal?.id) {
          q1 = q1.eq('deal_id', deal.id);
        } else if (cleanPhone) {
          q1 = q1.ilike('chat_id', `%${cleanPhone}%`);
        }
        const { data } = await q1.order('timestamp', { ascending: false }).limit(60);
        if (data) {
          data.forEach(m => {
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

    // 4. Auditoría (Cambios de Etapa y otros)
    if (db.auditoria) {
      (db.auditoria || []).filter(a => a.entidad_id === deal?.id || (contacto?.id && a.entidad_id === contacto.id)).forEach(a => {
        const isStage = a.campo?.toLowerCase().includes("etapa");
        entries.push({
          type: isStage ? "stage" : "audit",
          id: a.id,
          body: isStage ? `Movido de ${a.valor_anterior || 'Inicio'} a ${a.valor_nuevo}` : `${a.usuario_nombre} cambió ${a.campo} de "${a.valor_anterior || 'vacío'}" a "${a.valor_nuevo}"`,
          timestamp: new Date(a.creado).getTime() / 1000,
          user: a.usuario_nombre,
          color: isStage ? T.purple : T.whiteDim
        });
      });
    }

    // 5. Tareas
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

    // 6. Actividades Custom
    if (db.actividades) {
      (db.actividades || []).filter(a => a.deal_id === deal.id).forEach(a => {
        entries.push({
          type: "activity",
          id: a.id,
          body: a.descripcion || a.tipo,
          timestamp: new Date(a.fecha || a.creado).getTime() / 1000,
          icon: a.tipo === "llamada" ? "phone" : a.tipo === "reunion" ? "users" : "lightning",
          color: T.teal
        });
      });
    }

    // 7. Emails (Supabase)
    if (contacto?.email || deal?.id) {
       try {
         const qE = sb.from('emails').select('*').eq('org_id', db.usuario?.org_id);
         const filters = [];
         if (deal?.id) filters.push(`deal_id.eq.${deal.id}`);
         else if (contacto?.email) filters.push(`de.ilike.%${contacto.email}%`, `para.ilike.%${contacto.email}%`);

         if (filters.length > 0) {
           const { data: emailData } = await qE.or(filters.join(',')).order('fecha', { ascending: false }).limit(40);
           if (emailData) {
             emailData.forEach(e => {
               entries.push({
                 type: "email",
                 id: e.id,
                 body: e.cuerpo,
                 asunto: e.asunto,
                 timestamp: (e.fecha ? new Date(e.fecha).getTime() / 1000 : Date.now() / 1000),
                 de: e.de,
                 para: e.para,
                 html: e.html,
                 adjuntos: e.adjuntos || []
               });
             });
           }
         }
       } catch (err) { console.warn("Error cargando emails en Timeline", err); }
    }

    // FUSIONAR Y ORDENAR
    setItems(prev => {
      const locales = prev.filter(p => typeof p.id === 'string' && p.id.startsWith('local_'));
      const serverBodiesW = new Set(entries.filter(e => e.type === "whatsapp").map(e => e.body));
      const localesRestantes = locales.filter(l => l.type === "whatsapp" ? !serverBodiesW.has(l.body) : true);

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
    toast.success("Nota guardada");
  };

  const handleSendWA = () => {
    if (!waMsg.trim() || !telefono) return;
    if (!socketRef.current) return toast.error("WhatsApp no conectado");

    const nuevoMsg = { type: "whatsapp", id: "local_" + Date.now(), body: waMsg, timestamp: Date.now() / 1000, fromMe: true };
    setItems(prev => [nuevoMsg, ...prev]);

    socketRef.current.emit("whatsapp_send_message", { 
      to: cleanPhone.includes('@') ? cleanPhone : cleanPhone + "@c.us", 
      text: waMsg, dealId: deal?.id, clientId: nuevoMsg.id, org_id: db.usuario?.org_id
    });
    setWaMsg("");
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleSendEmailRich = async (data) => {
    const accId = emailAccountId || db.email_accounts?.[0]?.id;
    if (!accId) return toast.error("No hay cuenta vinculada");

    setEnviandoEmail(true);
    try {
      const API_URL = getApiUrl(db);
      await axios.post(`${API_URL}/api/email/send`, {
        accountId: accId, 
        to: data.to, 
        cc: data.cc, 
        bcc: data.bcc,
        subject: data.subject || "(Sin asunto)", 
        body: data.body,
        attachments: data.attachments, 
        dealId: deal?.id, 
        contactoId: contacto?.id
      });
      toast.success("Correo enviado ✅");
      cargarTimeline();
      setComposerTab("Comentario");
    } catch (e) {
      toast.error("Error al enviar email: " + (e.response?.data?.error || e.message));
    } finally {
      setEnviandoEmail(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (filtro === "all") return true;
      if (filtro === "whatsapp") return it.type === "whatsapp";
      if (filtro === "email") return it.type === "email";
      if (filtro === "notes") return ["note", "task", "activity", "event"].includes(it.type);
      return true;
    });
  }, [items, filtro]);

  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(it => {
      const date = new Date((it.timestamp || 0) * 1000);
      const day = date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
      if (!groups[day]) groups[day] = [];
      groups[day].push(it);
    });
    return groups;
  }, [filteredItems]);

  const renderAck = (ack) => {
    if (!ack || ack === 0) return <Ico k="clock" size={12} style={{ opacity: 0.5 }} />;
    if (ack === 1) return <Ico k="check" size={12} style={{ opacity: 0.5 }} />;
    if (ack === 2) return <Ico k="checks" size={12} style={{ opacity: 0.5 }} />;
    if (ack === 3) return <Ico k="checks" size={12} style={{ color: "#34B7F1" }} />;
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg1, borderLeft: `1px solid ${T.borderHi}`, position: "relative", overflow: "hidden" }}>
      
      {/* HEADER: SMART TABS */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.borderHi}`, background: T.bg1, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "Comentario", label: "Nota", color: T.white, icon: "note", f: "all" },
            { id: "WhatsApp", label: "WhatsApp", color: "#25D366", icon: "phone", f: "whatsapp" },
            { id: "Email", label: "Email", color: T.teal, icon: "mail", f: "email" },
            { id: "Tarea", label: "Tarea", color: T.amber, icon: "check", f: "notes" }
          ].map(t => {
            const act = t.id === composerTab;
            return (
              <button key={t.id} 
                onClick={() => { setComposerTab(t.id); setFiltro(t.f); }}
                style={{ 
                  background: act ? `${t.color}15` : "transparent",
                  border: `1px solid ${act ? t.color + "40" : "transparent"}`,
                  color: act ? t.color : T.whiteDim,
                  padding: "8px 16px", borderRadius: 100, fontSize: 12, fontWeight: 800, cursor: "pointer", transition: "all .2s",
                  display: "flex", alignItems: "center", gap: 8
                }}>
                <Ico k={t.icon} size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
        <Btn variant="fantasma" onClick={cargarTimeline} size="sm"><Ico k="refresh" size={14} /></Btn>
      </div>

      {/* COMPOSER DYNAMIC AREA */}
      <div style={{ padding: 20, background: T.bg2, borderBottom: `1px solid ${T.borderHi}`, flexShrink: 0 }}>
        {composerTab === "Comentario" && (
           <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <textarea value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Escribe una nota interna para este negocio..." 
                style={{ width: "100%", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 14, fontSize: 13, color: T.white, outline: "none", resize: "none", minHeight: 80 }} />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn variant="primario" onClick={handleAddComment} disabled={!comentario.trim()}>Guardar Nota</Btn>
              </div>
           </div>
        )}
        {composerTab === "WhatsApp" && (
           <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                 <textarea value={waMsg} onChange={e => setWaMsg(e.target.value)} placeholder="Enviar mensaje de WhatsApp..." 
                    style={{ flex: 1, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 12, fontSize: 13, color: T.white, outline: "none", resize: "none", minHeight: 44 }} />
                 <Btn variant="primario" onClick={handleSendWA} disabled={!waMsg.trim() || !cleanPhone} style={{ width: 44, height: 44, padding: 0, background: "#25D366" }}>
                    <Ico k="paper-plane" size={18} />
                 </Btn>
              </div>
              {!cleanPhone && <div style={{ fontSize: 10, color: T.red, fontWeight: 700 }}>⚠️ Contacto sin número válido</div>}
           </div>
        )}
        {composerTab === "Email" && (
           <SharedEmailComposer 
             db={db}
             defaultTo={contacto?.email || ""}
             simulandoEnvio={enviandoEmail}
             onSend={handleSendEmailRich}
             onDiscard={() => setComposerTab("Comentario")}
           />
        )}
      </div>

      {/* FEED: UNIFIED SMART FLOW (PILAR 3) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
         {loading ? (
           <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}><Ico k="refresh" size={32} className="spin" style={{ color: T.teal }} /></div>
         ) : Object.entries(groupedItems).map(([day, dayItems]) => (
           <div key={day} style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                 <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${T.border})` }} />
                 <span style={{ fontSize: 11, fontWeight: 900, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em" }}>{day}</span>
                 <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${T.border}, transparent)` }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                 {dayItems.map((it, idx) => {
                    const colors = { 
                      whatsapp: "#25D366", email: T.teal, task: T.amber, note: T.whiteDim, 
                      stage: T.purple, activity: T.teal, audit: T.whiteDim, event: T.whiteDim 
                    };
                    const iconMap = { 
                      whatsapp: "phone", email: "mail", task: "check", note: "note", 
                      audit: "history", stage: "trend", activity: it.icon || "lightning", event: "plus" 
                    };
                    const isEmail = it.type === 'email';
                    const expanded = emailExpandido === it.id;

                    return (
                       <div key={it.id + idx} style={{ display: "flex", gap: 16, animation: "fadeIn .2s ease" }}>
                          {/* Nodo de Icono con color de acento */}
                          <div style={{ 
                             width: 38, height: 38, borderRadius: 12, background: T.bg2, border: `1px solid ${colors[it.type]}30`, 
                             color: colors[it.type], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 
                          }}><Ico k={iconMap[it.type]} size={18} /></div>
                          
                          {/* Card Premium unificada */}
                          <div style={{ 
                             flex: 1, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px 18px", 
                             boxShadow: "0 4px 12px rgba(0,0,0,0.02)", cursor: isEmail ? "pointer" : "default"
                          }} onClick={() => isEmail && setEmailExpandido(expanded ? null : it.id)}>
                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                   <span style={{ fontSize: 10, fontWeight: 900, color: colors[it.type], textTransform: "uppercase" }}>{it.type}</span>
                                   {it.user && <span style={{ fontSize: 10, color: T.whiteDim }}>• {it.user}</span>}
                                   {it.ack !== undefined && renderAck(it.ack)}
                                </div>
                                <span style={{ fontSize: 10, color: T.whiteDim }}>{new Date((it.timestamp || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             </div>

                             {it.asunto && <div style={{ fontSize: 13, fontWeight: 800, color: T.white, marginBottom: 4 }}>{it.asunto}</div>}

                             <div style={{ fontSize: 13, color: it.type === 'stage' ? T.purple : T.whiteOff, whiteSpace: "pre-wrap", lineHeight: 1.5, fontWeight: it.type === 'stage' ? 700 : 400 }}>
                                {isEmail && expanded ? (
                                   <div dangerouslySetInnerHTML={{ __html: it.html || it.body?.replace(/\n/g, '<br>') }} style={{ fontSize: 12, mt: 10, p: 10, background: T.bg1, borderRadius: 10 }} />
                                ) : (
                                   it.body?.length > 250 ? it.body.substring(0, 250) + "..." : it.body || (it.hasMedia ? "📎 Archivo adjunto" : "")
                                )}
                             </div>

                             {it.hasMedia && (
                                <div style={{ marginTop: 10, padding: "8px 12px", background: T.bg1, borderRadius: 10, border: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.teal, fontWeight: 700 }}>
                                   <Ico k="paperclip" size={14} /> {it.file_name || "Archivo"}
                                </div>
                             )}

                             {it.type === 'task' && it.deadline && (
                                <div style={{ marginTop: 10, fontSize: 11, color: T.amber, fontWeight: 700, background: `${T.amber}10`, padding: "6px 12px", borderRadius: 8, width: "fit-content", display: "flex", gap: 6 }}>
                                   <Ico k="calendar" size={12} /> Límite: {it.deadline}
                                </div>
                             )}
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>
         ))}
         {!loading && filteredItems.length === 0 && <div style={{ textAlign: "center", padding: 60, opacity: 0.3 }}><Ico k="inbox" size={40} /><div style={{ mt: 10 }}>Historial vacío</div></div>}
         <div ref={chatBottomRef} style={{ height: 1 }} />
      </div>

      <style>{`
         @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
         .spin { animation: spin 1s linear infinite; }
         @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
