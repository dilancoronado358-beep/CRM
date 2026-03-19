import { useState, useEffect, useRef, useMemo } from "react";
import { T } from "../theme";
import { Ico, Btn, Inp } from "../components/ui";
import { getApiUrl } from "../utils";
import { createClient } from "@supabase/supabase-js";
import { io } from "socket.io-client";
import { sileo as toast } from "../utils/sileo";
import axios from "axios";

const SUPA_URL = "https://eoylgxwlhsmwqgadahvk.supabase.co";
const SUPA_KEY = "sb_publishable_wKUbf7IFOoH4HIUayIAJdQ_Boj1jgZa";
const sb = createClient(SUPA_URL, SUPA_KEY);

export function LeadTimeline({ deal = {}, contacto = {}, db = {}, setDb, guardarEnSupa, setModulo }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("all");
  const [comentario, setComentario] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [emailAttachments, setEmailAttachments] = useState([]);
  const [emailAccountId, setEmailAccountId] = useState(db.email_accounts?.[0]?.id || "");
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [composerTab, setComposerTab] = useState("Comentario");
  const [emailExpandido, setEmailExpandido] = useState(null); // ID del correo expandido
  const [previewFile, setPreviewFile] = useState(null); // { data, name, type }

  const [taskForm, setTaskForm] = useState({ titulo: "", prioridad: "media", vencimiento: "", asignado: db?.usuario?.name || "", descripcion: "" });
  const [enviandoEmail, setEnviandoEmail] = useState(false);
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
        let waError = null;

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
          waError = { message: e.message };
        }

        if (waError && (waError.message.includes("column \"chat_id\" does not exist") || waError.message.includes("chat_id"))) {
          let q2 = sb.from('whatsapp_messages').select('*');
          if (deal?.id && cleanPhone) q2 = q2.or(`deal_id.eq.${deal.id},chatid.ilike.%${cleanPhone}%`);
          else if (deal?.id) q2 = q2.eq('deal_id', deal.id);
          else if (cleanPhone) q2 = q2.ilike('chatid', `%${cleanPhone}%`);
          else q2 = q2.eq('id', 'impossible-match');
          const { data: waData2, error: waError2 } = await q2.order('timestamp', { ascending: false }).limit(50);
          if (!waError2 && waData2) waData = waData2;
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

    // 4. Auditoría (Cambios de Etapa y otros)
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

    // 6. Actividades Custom (Fase 43)
    (db.actividades || []).filter(a => a.deal_id === deal.id).forEach(a => {
      entries.push({
        type: "activity",
        id: a.id,
        body: a.descripcion || a.tipo,
        timestamp: new Date(a.fecha || a.creado).getTime() / 1000,
        icon: a.tipo === "llamada" ? "phone" : a.tipo === "reunion" ? "users" : "note",
        color: T.teal
      });
    });

    // 7. Emails (Supabase)
    if (contacto?.email || deal?.id || contacto?.id) {
       try {
         const qE = sb.from('emails').select('*');
         const filters = [];
         if (contacto?.email) filters.push(`de.eq.${contacto.email}`, `para.eq.${contacto.email}`);
         if (deal?.id) filters.push(`deal_id.eq.${deal.id}`);
         if (contacto?.id) filters.push(`contacto_id.eq.${contacto.id}`);

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
    
    // Detectar menciones @nombre
    const menciones = comentario.match(/@(\w+)/g);
    if (menciones) {
      for (const m of menciones) {
        const nombre = m.substring(1).toLowerCase();
        const targetUser = db.usuariosApp?.find(u => (u.name || "").toLowerCase().includes(nombre));
        if (targetUser && targetUser.id !== db.usuario?.id) {
          const noti = {
            id: "not" + Math.random().toString(36).substr(2, 9),
            usuario_id: targetUser.id,
            titulo: "📌 Nueva mención",
            mensaje: `${db.usuario?.name || "Alguien"} te mencionó en el lead: ${deal?.titulo || "Sin título"}`,
            tipo: "info",
            url: "pipeline", // Redirigir al pipeline para que lo vea
            leida: false,
            creado: new Date().toISOString()
          };
          await guardarEnSupa("notificaciones", noti);
        }
      }
    }

    const nuevaNota = deal?.notas ? `${deal.notas}\n\n[${new Date().toLocaleString()}] ${comentario}` : `[${new Date().toLocaleString()}] ${comentario}`;
    await guardarEnSupa("deals", { ...deal, notas: nuevaNota });
    setComentario("");
  };

  const handleSendWA = () => {
    if (!waMsg.trim() || !telefono) return;
    if (!socketRef.current) return toast.error("WhatsApp no conectado");

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

  useEffect(() => {
    if (!emailAccountId && db.email_accounts?.length > 0) {
      setEmailAccountId(db.email_accounts[0].id);
    }
  }, [db.email_accounts]);

  const handleSendEmail = async () => {
    if (!emailBody.trim() || !contacto?.email) return toast.error("Cuerpo o destinatario vacío.");
    
    const accId = emailAccountId || db.email_accounts?.[0]?.id;
    if (!accId) return toast.error("No hay cuenta vinculada");

    setEnviandoEmail(true);
    try {
      const API_URL = getApiUrl(db);
      await axios.post(`${API_URL}/api/email/send`, {
        accountId: accId,
        to: contacto.email,
        cc: emailCc,
        bcc: emailBcc,
        subject: emailSubject || "(Sin asunto)",
        body: emailBody,
        attachments: emailAttachments,
        dealId: deal?.id,
        contactoId: contacto?.id
      });

      toast.success("Correo enviado correctamente ✅");
      setEmailSubject("");
      setEmailBody("");
      setEmailCc("");
      setEmailBcc("");
      setEmailAttachments([]);
      cargarTimeline();
    } catch (e) {
      toast.error("Error al enviar email: " + (e.response?.data?.error || e.message));
    } finally {
      setEnviandoEmail(false);
    }
  };

  const aplicarPlantilla = (id) => {
    const tpl = db.plantillasEmail?.find(p => p.id === id);
    if (tpl) {
      setEmailSubject(tpl.asunto || "");
      setEmailBody(tpl.cuerpo || "");
    }
  };

  const handleFileChangeEmail = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setSubiendoAdjunto(true);
    const nuevos = [...emailAttachments];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const safeName = `att_${Date.now()}_${f.name.replace(/[^a-z0-9.]/gi, '_')}`;
      try {
        const { data, error } = await sb.storage.from('email-attachments').upload(safeName, f);
        if (error) throw error;
        const { data: { publicUrl } } = sb.storage.from('email-attachments').getPublicUrl(safeName);
        nuevos.push({ name: f.name, url: publicUrl, type: f.type, size: f.size });
      } catch (err) { 
        console.error(err);
        toast.error("Error subiendo " + f.name); 
      }
    }
    setEmailAttachments(nuevos);
    setSubiendoAdjunto(false);
    e.target.value = "";
  };

  const eliminarAdjuntoEmail = (idx) => {
    setEmailAttachments(prev => prev.filter((_, i) => i !== idx));
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
      if (filtro === "email") return it.type === "email";
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg1, borderLeft: `1px solid ${T.borderHi}`, position: "relative", overflow: "hidden" }}>

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
      <div style={{ padding: "0 20px", borderBottom: `1px solid ${T.borderHi}`, background: T.bg1, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 24 }}>
          {["Comentario", "WhatsApp", "Email", "Tarea"].map(t => (
            <button key={t}
              onClick={() => {
                setComposerTab(t);
                setFiltro(t === "WhatsApp" ? "whatsapp" : (t === "Email" ? "email" : "all"));
                if (t === "WhatsApp") setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
              }}
              style={{
                background: "none", border: "none", color: t === composerTab ? (t === "Email" ? T.teal : (t === "WhatsApp" ? "#25D366" : "#00bbd3")) : "#666",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                borderBottom: `3px solid ${t === composerTab ? (t === "Email" ? T.teal : (t === "WhatsApp" ? "#25D366" : "#00bbd3")) : "transparent"}`,
                padding: "16px 4px", position: "relative", top: 1
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* COMPOSER TOP SOLO PARA COMENTARIOS O TAREAS */}
      {composerTab !== "WhatsApp" && (
        <div style={{ padding: "16px 20px", background: T.bg2, flexShrink: 0, borderBottom: `1px solid ${T.borderHi}` }}>
          {composerTab === "Comentario" && (
            <div>
              <textarea value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Deja un comentario..." style={{ width: "100%", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "12px 16px", fontSize: 14, minHeight: 60, outline: "none", resize: "none", color: T.white }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><Btn onClick={handleAddComment} disabled={!comentario.trim()} size="sm" style={{ background: T.teal, color: "#000" }}>PUBLICAR</Btn></div>
            </div>
          )}
          {composerTab === "Email" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* SELECT ACCOUNT & TEMPLATE */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, position: "relative" }}>
                   {db.email_accounts?.length > 1 ? (
                     <select 
                       value={emailAccountId} 
                       onChange={(e) => setEmailAccountId(e.target.value)}
                       style={{ width: "100%", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, color: T.white, outline: "none" }}
                     >
                        {db.email_accounts.map(a => <option key={a.id} value={a.id}>De: {a.email}</option>)}
                     </select>
                   ) : (
                     <div style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, color: T.whiteDim }}>
                       De: <b style={{ color: T.white, marginLeft: 4 }}>{db.email_accounts?.[0]?.email || "Sin cuenta vinculada"}</b>
                     </div>
                   )}
                </div>
                <select 
                  onChange={(e) => aplicarPlantilla(e.target.value)} 
                  style={{ width: 140, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "8px 10px", fontSize: 11, color: T.white, outline: "none" }}
                >
                  <option value="">— Plantilla —</option>
                  {(db.plantillasEmail || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              {/* TO / CC / BCC */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: T.white }}>
                    Para: <b>{contacto?.email || "(Sin correo)"}</b>
                  </div>
                  <button onClick={() => setShowCcBcc(!showCcBcc)} style={{ background: "none", border: "none", color: T.teal, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {showCcBcc ? "Ocultar CC" : "+ CC/BCC"}
                  </button>
                </div>

                {showCcBcc && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeIn .2s" }}>
                    <Inp value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="CC (Copia)" style={{ background: T.bg1, fontSize: 11 }} />
                    <Inp value={emailBcc} onChange={e => setEmailBcc(e.target.value)} placeholder="BCC (Copia oculta)" style={{ background: T.bg1, fontSize: 11 }} />
                  </div>
                )}
              </div>

              <Inp value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Asunto del correo..." style={{ background: T.bg1 }} />
              
              <div style={{ position: "relative" }}>
                <textarea 
                  value={emailBody} 
                  onChange={e => setEmailBody(e.target.value)} 
                  placeholder="Escribe tu mensaje por correo..." 
                  style={{ width: "100%", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "12px 16px", fontSize: 14, minHeight: 140, outline: "none", resize: "vertical", color: T.white, lineHeight: 1.5 }} 
                />
              </div>

              {/* ATTACHMENTS LIST */}
              {emailAttachments.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {emailAttachments.map((a, idx) => (
                    <div key={idx} style={{ background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, color: T.white, display: "flex", alignItems: "center", gap: 6 }}>
                      <Ico k="paperclip" size={10} /> {a.name}
                      <button onClick={() => eliminarAdjuntoEmail(idx)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <Ico k="x" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="file" multiple id="attach-email" style={{ display: "none" }} onChange={handleFileChangeEmail} />
                  <label htmlFor="attach-email" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.whiteDim, fontSize: 12, fontWeight: 600 }}>
                    {subiendoAdjunto ? <Ico k="refresh" size={16} className="spin" /> : <Ico k="paperclip" size={16} />} 
                    Adjuntar archivos
                  </label>
                </div>
                <Btn onClick={handleSendEmail} disabled={enviandoEmail || !contacto?.email || !emailBody.trim()} size="sm" style={{ background: T.teal, color: "#000", padding: "8px 20px" }}>
                  {enviandoEmail ? <Ico k="refresh" size={16} className="spin" /> : <Ico k="paper-plane" size={16} />} ENVIAR EMAIL
                </Btn>
              </div>
            </div>
          )}
          {composerTab === "Tarea" && (
            <div style={{ background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 12, padding: 16 }}>
              <input value={taskForm.titulo} onChange={e => setTaskForm(p => ({ ...p, titulo: e.target.value }))} placeholder="¿Qué hay que hacer? *" style={{ width: "100%", background: "transparent", padding: "8px 0", border: "none", borderBottom: `1px solid ${T.borderHi}`, marginBottom: 12, color: T.white, outline: "none" }} />
              <div style={{ display: "flex", gap: 12 }}>
                <select value={taskForm.prioridad} onChange={e => setTaskForm(p => ({ ...p, prioridad: e.target.value }))} style={{ flex: 1, padding: 8, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, color: T.white }}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select>
                <input type="date" value={taskForm.vencimiento} onChange={e => setTaskForm(p => ({ ...p, vencimiento: e.target.value }))} style={{ flex: 1, padding: 8, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 8, color: T.white }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><Btn onClick={handleAddTask} disabled={!taskForm.titulo.trim()} size="sm" style={{ background: T.teal, color: "#000" }}>CREAR TAREA</Btn></div>
            </div>
          )}
        </div>
      )}

      {/* SCROLL AREA */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: composerTab === "WhatsApp" ? "20px" : "0 20px 40px", position: "relative" }}>
        {filtro !== "whatsapp" && <div style={{ position: "absolute", left: 47, top: 0, bottom: 0, width: 2, background: T.borderHi, zIndex: 1, opacity: 0.5 }} />}

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
          <div key={day} style={{ position: "relative", zIndex: 1, paddingLeft: 20 }}>
            <div style={{ margin: "24px 0 16px -10px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.border, border: `3px solid ${T.bg1}`, zIndex: 2 }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em" }}>{day}</span>
            </div>
            {dayItems.map((it, idx) => {
              const colors = {
                whatsapp: "#25D366",
                note: T.teal,
                audit: T.whiteDim,
                task: T.amber,
                stage: T.purple,
                activity: T.teal,
                event: T.teal
              };
              const iconMap = {
                whatsapp: "phone",
                email: "mail",
                note: "note",
                audit: "history",
                task: "check",
                stage: "trend",
                activity: it.icon || "lightning",
                event: it.icon || "plus"
              };

              return (
                <div key={it.id + idx} style={{ display: "flex", gap: 20, marginBottom: 20, animation: "fadeIn .3s ease" }}>
                  {/* ICON NODE */}
                  <div style={{ 
                    width: 36, height: 36, borderRadius: 10, 
                    background: (colors[it.type] || T.teal) + "18", 
                    color: colors[it.type] || T.teal, 
                    display: "flex", alignItems: "center", justifyContent: "center", 
                    border: `1px solid ${(colors[it.type] || T.teal)}30`, 
                    flexShrink: 0, zIndex: 2,
                    boxShadow: `0 4px 12px ${(colors[it.type] || T.teal)}15`,
                    backdropFilter: "blur(4px)"
                  }}>
                    <Ico k={iconMap[it.type]} size={16} />
                  </div>

                  {/* GLASS CARD */}
                  <div style={{ 
                    flex: 1, 
                    background: "rgba(255,255,255,0.03)", 
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${T.borderHi}`, 
                    borderRadius: 14, 
                    padding: "14px 18px",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                    transition: "all .2s",
                    cursor: it.type === 'email' ? 'pointer' : 'default'
                  }}
                  onClick={() => it.type === 'email' ? setEmailExpandido(emailExpandido === it.id ? null : it.id) : null}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateX(4px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "none"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: colors[it.type], textTransform: "uppercase", letterSpacing: ".05em" }}>{it.type}</span>
                        {it.user && <span style={{ fontSize: 10, color: T.whiteDim }}>• {it.user}</span>}
                        {it.type === 'email' && <Ico k={emailExpandido === it.id ? "chevron-up" : "chevron-down"} size={10} style={{ color: T.teal }} />}
                      </div>
                      <div style={{ fontSize: 10, color: T.whiteDim, fontWeight: 600 }}>{new Date((it.timestamp || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {it.hasMedia && it.file_name && (
                      <div style={{ marginBottom: 8, padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 8, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.border}` }}>
                        <Ico k="paperclip" size={14} style={{ color: T.teal }} /> {it.file_name}
                      </div>
                    )}
                    <div style={{ fontSize: 14, color: it.type === "stage" ? T.purple : T.whiteOff, whiteSpace: "pre-wrap", lineHeight: 1.5, fontWeight: it.type === "stage" ? 700 : 500 }}>
                      {it.type === 'email' && emailExpandido === it.id ? (
                        <div style={{ overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: it.html || it.body?.replace(/\n/g, '<br>') }} />
                      ) : (
                        it.body?.length > 150 ? it.body.substring(0, 150) + "..." : it.body || (it.hasMedia ? "📎 Archivo adjunto" : "")
                      )}
                    </div>

                    {it.type === 'email' && it.asunto && (
                      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: T.teal }}>
                        Asunto: {it.asunto}
                      </div>
                    )}
                    {it.type === 'email' && (
                      <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: T.whiteDim }}>
                        <span>De: {it.de}</span>
                        <span>Para: {it.para}</span>
                      </div>
                    )}

                    {/* EXPANDED ATTACHMENTS */}
                    {it.type === 'email' && emailExpandido === it.id && it.adjuntos?.length > 0 && (
                      <div style={{ marginTop: 12, pt: 12, borderTop: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim }}>ADJUNTOS:</div>
                        {it.adjuntos.map((a, i) => (
                           <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 8, color: T.teal, fontSize: 12, textDecoration: "none" }}>
                             <Ico k="paperclip" size={14} /> {a.name}
                           </a>
                        ))}
                      </div>
                    )}
                    {it.type === "task" && it.deadline && (
                      <div style={{ marginTop: 10, fontSize: 11, color: T.whiteDim, display: "flex", alignItems: "center", gap: 6, background: T.bg2, padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`, width: "fit-content" }}>
                        <Ico k="calendar" size={12} /> Límite: {it.deadline} {it.priority && <span style={{ color: it.priority === 'alta' ? T.red : T.teal }}>• {it.priority.toUpperCase()}</span>}
                      </div>
                    )}
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
