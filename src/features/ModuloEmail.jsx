import { useState, useEffect, useRef, memo } from "react";
import { T } from "../theme";
import { uid, fdtm, fdate, getApiUrl } from "../utils";
import { Av, Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, Vacio, Ico } from "../components/ui";
import axios from "axios";
import { sileo as toast } from "../utils/sileo";
import { sb } from "../hooks/useSupaState";

const HtmlEmail = memo(({ html, cuerpo }) => {
  const iframeRef = useRef(null);
  const content = html || (cuerpo ? cuerpo.replace(/\n/g, '<br>') : "");

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const adjustHeight = () => {
      if (iframe.contentWindow && iframe.contentWindow.document.body) {
        const h = iframe.contentWindow.document.body.scrollHeight;
        if (h > 0) iframe.style.height = (h + 60) + "px";
      }
    };

    const obs = new ResizeObserver(adjustHeight);
    
    const setup = () => {
      if (iframe.contentWindow && iframe.contentWindow.document.body) {
        obs.observe(iframe.contentWindow.document.body);
        adjustHeight();
      }
    };

    iframe.addEventListener("load", setup);
    setup();

    return () => {
      iframe.removeEventListener("load", setup);
      obs.disconnect();
    };
  }, [content]);

  return (
    <iframe
      ref={iframeRef}
      title="Email Content"
      scrolling="no"
      srcDoc={`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; margin: 0; padding: 24px; overflow-x: hidden; line-height: 1.6; background: #fff; }
              img, table, td, div, p, section { max-width: 100% !important; height: auto !important; box-sizing: border-box !important; }
              table { width: 100% !important; table-layout: fixed !important; }
              a { color: #06B6D4; text-decoration: none; }
              * { word-wrap: break-word; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `}
      style={{ width: "100%", border: "none", background: "#FFFFFF", borderRadius: 16, overflow: "hidden", minHeight: 400, transition: "height 0.2s ease-out" }}
    />
  );
});

export const ModuloEmail = ({ db, setDb, guardarEnSupa, eliminarDeSupa, t, cargandoFondo, setModulo, focusEmailId, setFocusEmailId }) => {
  const [carpeta, setCarpeta] = useState("entrada");

  const getAvClr = (s) => {
    if (!s) return T.teal;
    let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h) % 360}, 65%, 65%)`;
  };

  const [showRedactar, setShowRedactar] = useState(false);
  const [emailFocus, setEmailFocus] = useState(null);
  const [f, setF] = useState({ para: "", asunto: "", cuerpo: "", cc: "", bcc: "", plantillaId: "", tipo: "texto" });
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);
  const [respuestaRapida, setRespuestaRapida] = useState("");
  const [replyCC, setReplyCC] = useState("");
  const [replyBCC, setReplyBCC] = useState("");
  const [showCCReply, setShowCCReply] = useState(false);
  const [showBCCReply, setShowBCCReply] = useState(false);
  const [simulandoEnvio, setSimulandoEnvio] = useState(false);
  const [logEnvio, setLogEnvio] = useState([]);
  const [adjuntosSubiendo, setAdjuntosSubiendo] = useState(false);
  const [adjuntosLocal, setAdjuntosLocal] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(db.email_accounts?.[0]?.id || null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showConv, setShowConv] = useState(false);
  const [showPreviewCompose, setShowPreviewCompose] = useState(false);
  const [cf, setCf] = useState({ titulo: "", pipeline_id: "", etapa_id: "" });

  useEffect(() => {
    if (showConv && emailFocus) {
      const plId = db.pipelines[0]?.id || "";
      const pl = db.pipelines.find(p => p.id === plId);
      setCf({
        titulo: emailFocus.asunto,
        pipeline_id: plId,
        etapa_id: pl?.etapas?.[0]?.id || ""
      });
    }
  }, [showConv, emailFocus, db.pipelines]);

  // Manejar foco externo (desde Timeline)
  useEffect(() => {
    if (focusEmailId) {
      const target = (db.emails || []).find(e => e.id === focusEmailId);
      if (target) {
        setEmailFocus(target);
        // Marcamos como leído si corresponde
        if (!target.leido) marcarLeido(target.id);
      }
      setFocusEmailId(null); // Consumimos el foco
    }
  }, [focusEmailId, db.emails]);

  useEffect(() => {
    if (!selectedAccountId && db.email_accounts?.length > 0) {
      setSelectedAccountId(db.email_accounts[0].id);
    }
  }, [db.email_accounts, selectedAccountId]);

  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const aplicarTpl = e => {
    const id = e.target.value;
    const tpl = db.plantillasEmail.find(p => p.id === id);
    if (tpl) setF({ ...f, asunto: tpl.asunto, cuerpo: tpl.cuerpo, plantillaId: id, tipo: tpl.tipo || "texto" });
    else setF({ ...f, plantillaId: "", tipo: "texto" });
  };

  const redactarIA = () => {
    setF({ ...f, cuerpo: "Redactando con IA...\n\n" });
    setTimeout(() => {
      setF({ ...f, cuerpo: `Hola ${f.para.split("@")[0] || "cliente"},\n\nGracias por tu mensaje. He revisado la propuesta y me parece excelente.\n\nMe gustaría agendar una reunión rápida para definir los siguientes pasos.\n\nEspero tus noticias.\n\nSaludos,\n${db.usuario?.name}` });
    }, 1200);
  };

  const enviarRealista = async () => {
    if (!f.para.trim() || !f.cuerpo.trim()) return;
    const acc = db.email_accounts?.find(a => a.id === selectedAccountId) || db.email_accounts?.[0];
    if (!acc) { toast.error("Por favor, configura tu cuenta de correo."); return; }

    setSimulandoEnvio(true);
    setLogEnvio(["[SMTP] Handshake..."]);
    try {
      const API_URL = getApiUrl(db);
      const res = await axios.post(`${API_URL}/api/email/send`, {
        accountId: acc.id,
        to: f.para,
        cc: f.cc,
        bcc: f.bcc,
        subject: f.asunto || "Sin asunto",
        body: f.cuerpo,
        attachments: adjuntosLocal
      }, { headers: { 'ngrok-skip-browser-warning': 'true' } });

      setLogEnvio(p => [...p, "[250] OK: Transmitido."]);
      setTimeout(async () => {
        setShowRedactar(false);
        setSimulandoEnvio(false);
        setLogEnvio([]);
        const nuevo = { 
          id: uuid(), // Use real UUID
          de: acc.email, 
          para: f.para, 
          asunto: f.asunto || "Sin asunto", 
          cuerpo: f.cuerpo, 
          fecha: new Date().toISOString(), 
          creado: new Date().toISOString(),
          creado_at: new Date().toISOString(), 
          created_at: new Date().toISOString(),
          carpeta: 'enviados', 
          leido: true, 
          adjuntos: adjuntosLocal, 
          account_id: acc.id, 
          user_id: db.usuario?.id 
        };
        setDb(prev => ({ ...prev, emails: [nuevo, ...prev.emails] }));
        const resSupa = await guardarEnSupa("emails", nuevo);
        if (resSupa.error) toast.error("Error al guardar: " + resSupa.error.message);
        
        setF({ para: "", asunto: "", cuerpo: "", cc: "", bcc: "", plantillaId: "" });
        setAdjuntosLocal([]);
      }, 800);
    } catch (e) {
      toast.error("Error al enviar: " + (e.response?.data?.error || e.message));
      setSimulandoEnvio(false);
    }
  };

  const marcarLeido = async (id) => {
    const item = db.emails.find(e => e.id === id);
    if (!item || item.leido) return;
    const n = { ...item, leido: true };
    setDb(d => ({ ...d, emails: d.emails.map(e => e.id === id ? n : e) }));
    try {
      await guardarEnSupa("emails", n);
    } catch (e) {
      console.error("Error guardando estado leido", e);
    }
    if (emailFocus?.id === id) setEmailFocus(n);
  };

  const toggleSeleccion = (id) => {
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const seleccionarTodo = () => {
    if (selectedIds.length === msgs.length && msgs.length > 0) setSelectedIds([]);
    else setSelectedIds(msgs.map(m => m.id));
  };

  const eliminarSeleccionados = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`¿Seguro que quieres eliminar ${selectedIds.length} correos?`)) return;
    const ids = [...selectedIds];
    setSelectedIds([]);
    setDb(d => ({ ...d, emails: d.emails.filter(e => !ids.includes(e.id)) }));
    try {
      for (const id of ids) {
        await eliminarDeSupa("emails", { id });
      }
      toast.success(`${ids.length} correos eliminados.`);
    } catch (e) {
      toast.error("Error al eliminar algunos correos.");
    }
    if (ids.includes(emailFocus?.id)) setEmailFocus(null);
  };

  const marcarSeleccionadosLeidos = async (leido = true) => {
    const ids = [...selectedIds];
    const nuevosEmails = db.emails.map(e => ids.includes(e.id) ? { ...e, leido } : e);
    setDb(d => ({ ...d, emails: nuevosEmails }));
    setSelectedIds([]);
    for (const id of ids) {
      const item = nuevosEmails.find(e => e.id === id);
      await guardarEnSupa("emails", item);
    }
    toast.success(`${ids.length} correos marcados.`);
  };

  const handleConvert = async () => {
    if (!emailFocus) return;
    const emailStr = emailFocus.de;
    let con = db.contactos.find(c => c.email === emailStr);
    
    if (!con) {
      con = { id: "c" + uid(), nombre: emailStr.split("@")[0], email: emailStr, creado: new Date().toISOString() };
      setDb(d => ({ ...d, contactos: [...(db.contactos || []), con] }));
      await guardarEnSupa("contactos", con);
    }
    
    const nd = {
      id: "d" + uid(),
      titulo: cf.titulo || emailFocus.asunto,
      contacto_id: con.id,
      pipeline_id: cf.pipeline_id,
      etapa_id: cf.etapa_id,
      valor: 0,
      responsable: db.usuario?.name || "Admin",
      creado: new Date().toISOString().slice(0, 10),
      custom_fields: {}
    };
    
    setDb(d => ({ ...d, deals: [nd, ...(db.deals || [])] }));
    await guardarEnSupa("deals", nd);
    
    // Vincular email al deal
    const updatedEmail = { 
      ...emailFocus, 
      deal_id: nd.id, 
      user_id: db.usuario?.id, 
      account_id: emailFocus.account_id || selectedAccountId || (db.email_accounts?.[0]?.id),
      creado_at: emailFocus.creado_at || new Date().toISOString(),
      created_at: emailFocus.created_at || new Date().toISOString(),
      creado: emailFocus.creado || new Date().toISOString()
    };
    setDb(d => ({ ...d, emails: (d.emails || []).map(e => e.id === emailFocus.id ? updatedEmail : e) }));
    const rEmail = await guardarEnSupa("emails", updatedEmail);
    if (rEmail.error) toast.error("Error vinculando email: " + rEmail.error.message);
    
    // Log actividad
    const act = { id: "act" + uid(), deal_id: nd.id, tipo: "email", nota: `Convertido desde email: ${emailFocus.asunto}`, fecha: new Date().toISOString(), usuario_id: db.usuario?.id };
    await guardarEnSupa("actividades", act);
    
    toast.success("🛰️ ¡Convertido a Negociación con éxito!");
    setShowConv(false);
  };

  const handleSync = async () => {
    const acc = db.email_accounts?.find(a => a.id === selectedAccountId) || db.email_accounts?.[0];
    if (!acc) return;
    await guardarEnSupa("email_accounts", { ...acc, last_sync: new Date().toISOString() });
    toast.info("Sincronización en curso...");
  };

  const msgs = db.emails
    .filter(e => e.carpeta === carpeta && (selectedAccountId ? e.account_id === selectedAccountId : true))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const sidebarItems = [
    { id: "entrada", label: "Bandeja entrada", icon: "inbox" },
    { id: "enviados", label: "Enviados", icon: "send" },
    { id: "borradores", label: "Borradores", icon: "note" },
  ];

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAdjuntosSubiendo(true);
    const nuevosAdjuntos = [...adjuntosLocal];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = `att_${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
      try {
        const { data, error } = await sb.storage.from('email-attachments').upload(safeName, file, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = sb.storage.from('email-attachments').getPublicUrl(safeName);
        nuevosAdjuntos.push({ name: file.name, url: publicUrl, type: file.type, size: file.size });
      } catch (err) { toast.error(`Error subiendo ${file.name}`); }
    }
    setAdjuntosLocal(nuevosAdjuntos);
    setAdjuntosSubiendo(false);
    e.target.value = "";
  };

  const enviarRespuesta = async () => {
    if (!respuestaRapida.trim() || !emailFocus) return;
    const acc = db.email_accounts?.find(a => a.id === selectedAccountId) || db.email_accounts?.[0];
    if (!acc) return;
    try {
      const API_URL = getApiUrl(db);
      const res = await axios.post(`${API_URL}/api/email/send`, {
        accountId: acc.id,
        to: emailFocus.de,
        cc: replyCC,
        bcc: replyBCC,
        subject: `Re: ${emailFocus.asunto}`,
        body: respuestaRapida,
        parentMessageId: emailFocus.mensaje_id,
        threadId: emailFocus.thread_id,
        attachments: adjuntosLocal
      }, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      toast.success("✅ Respuesta enviada.");
      const nuevaRpta = { 
        id: "em_reply_" + Date.now(), 
        de: acc.email, 
        para: emailFocus.de, 
        asunto: `Re: ${emailFocus.asunto}`, 
        cuerpo: respuestaRapida, 
        fecha: new Date().toISOString(), 
        carpeta: 'enviados', 
        leido: true, 
        adjuntos: adjuntosLocal,
        deal_id: emailFocus.deal_id,
        account_id: acc.id,
        user_id: db.usuario?.id,
        creado_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        creado: new Date().toISOString(),
        thread_id: emailFocus.thread_id,
        mensaje_id: res.data?.messageId || null
      };
      setDb(prev => ({ ...prev, emails: [nuevaRpta, ...prev.emails] }));
      const rs = await guardarEnSupa("emails", nuevaRpta);
      if (rs.error) toast.error("Error guardando respuesta: " + rs.error.message);
      
      setRespuestaRapida("");
      setReplyCC(""); setReplyBCC("");
      setShowCCReply(false); setShowBCCReply(false);
      setAdjuntosLocal([]);
    } catch (e) { toast.error("Error enviando respuesta."); }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 110px)", background: T.bg0, borderRadius: 32, overflow: "hidden", border: `1.5px solid ${T.whiteFade}10`, boxShadow: "0 30px 80px rgba(0,0,0,0.15)", position: "relative" }}>
      {/* Background glass effect enhancement */}
      <div style={{ position: "absolute", top: -150, right: -150, width: 400, height: 400, background: T.teal, filter: "blur(180px)", opacity: 0.1, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -150, left: -150, width: 400, height: 400, background: T.purple || "#A78BFA", filter: "blur(180px)", opacity: 0.1, pointerEvents: "none" }} />
      
      {/* 1. SIDEBAR (GLASS PANEL) */}
      <div style={{ width: 260, background: "rgba(255,255,255,0.03)", backdropFilter: "blur(30px)", borderRight: `1.5px solid ${T.whiteFade}08`, display: "flex", flexDirection: "column", padding: "32px 20px" }}>
        <button onClick={() => setShowRedactar(true)}
          style={{ width: "100%", height: 48, background: "linear-gradient(135deg, #14B8A6, #0D9488)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: `0 8px 20px ${T.teal}40`, marginBottom: 12 }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02) translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 25px ${T.teal}60`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1) translateY(0)"; e.currentTarget.style.boxShadow = `0 8px 20px ${T.teal}40`; }}
        >
          <Ico k="edit" size={16} /> REDACTAR
        </button>

        {db.email_accounts && db.email_accounts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, paddingLeft: 4 }}>Cuenta Activa</div>
            <Sel value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setEmailFocus(null); }} style={{ width: "100%", height: 40, borderRadius: 10, fontSize: 12, background: "rgba(255,255,255,0.05)" }}>
              {db.email_accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.email}</option>
              ))}
            </Sel>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sidebarItems.map(item => {
            const act = carpeta === item.id;
            const count = item.id === "entrada" ? db.emails.filter(e => e.carpeta === "entrada" && !e.leido).length : 0;
            return (
              <div key={item.id} onClick={() => { setCarpeta(item.id); setEmailFocus(null); }}
                style={{ height: 44, padding: "0 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: act ? "rgba(255,255,255,0.06)" : "transparent", color: act ? T.white : T.whiteDim, transition: "all 0.2s" }}
                onMouseEnter={e => { if (!act) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { if (!act) e.currentTarget.style.background = "transparent"; }}
              >
                <Ico k={item.icon} size={18} style={{ color: act ? T.teal : T.whiteFade }} />
                <span style={{ fontSize: 13, fontWeight: act ? 700 : 500, flex: 1 }}>{t(item.label)}</span>
                {count > 0 && <span style={{ background: T.teal, color: "#fff", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>{count}</span>}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "auto", background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 16, border: `1px solid ${T.whiteFade}05` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 10px ${T.green}` }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.white }}>Servicio Activo</span>
          </div>
          <div style={{ fontSize: 10, color: T.whiteDim, lineHeight: 1.4 }}>IMAP/SMTP sincronizado vía OAuth 2.0</div>
        </div>
      </div>

      {/* 2. LISTA DE MENSAJES */}
      <div style={{ width: emailFocus ? 400 : "100%", display: "flex", flexDirection: "column", borderRight: emailFocus ? `1px solid ${T.whiteFade}08` : "none", transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div style={{ height: 64, borderBottom: `1px solid ${T.whiteFade}08`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(255,255,255,0.01)" }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: T.white, letterSpacing: "-0.01em" }}>
            {carpeta === "entrada" ? "Bandeja de Entrada" : carpeta === "enviados" ? "Enviados" : "Borradores"}
          </div>
          <button onClick={handleSync} style={{ background: "transparent", border: "none", color: T.whiteDim, cursor: "pointer", transition: "transform 0.5s ease" }}
            onMouseEnter={e => e.currentTarget.style.transform = "rotate(180deg)"}
            onMouseLeave={e => e.currentTarget.style.transform = "rotate(0)"}>
            <Ico k="refresh" size={16} />
          </button>
        </div>

        {/* 2.1 TOOLBAR DE ACCIONES MASIVAS */}
        <div style={{ height: 48, borderBottom: `1px solid ${T.whiteFade}10`, display: "flex", alignItems: "center", padding: "0 16px", background: selectedIds.length > 0 ? "rgba(20,184,166,0.1)" : "transparent", transition: "all 0.3s" }}>
          <div onClick={seleccionarTodo} style={{ width: 18, height: 18, border: `1.5px solid ${selectedIds.length === msgs.length && msgs.length > 0 ? T.teal : T.whiteFade}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginRight: 20, background: selectedIds.length === msgs.length && msgs.length > 0 ? T.teal : "transparent" }}>
            {selectedIds.length === msgs.length && msgs.length > 0 && <Ico k="check" size={12} color="#fff" />}
          </div>
          
          {selectedIds.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.white, marginRight: 8 }}>{selectedIds.length} seleccionados</span>
              <button onClick={eliminarSeleccionados} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}><Ico k="trash" size={14} /> Eliminar</button>
              <button onClick={() => marcarSeleccionadosLeidos(true)} style={{ background: "none", border: "none", color: T.teal, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700 }}><Ico k="eye" size={14} /> Marcar leído</button>
              <button onClick={() => setSelectedIds([])} style={{ background: "none", border: "none", color: T.whiteDim, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Cancelar</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 16, color: T.whiteDim }}>
              <button onClick={handleSync} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}><Ico k="refresh" size={14} /> Sincronizar</button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {cargandoFondo && msgs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} style={{ height: 42, borderBottom: `1px solid ${T.whiteFade}10`, animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : msgs.length === 0 ? <Vacio text="No hay mensajes" /> : msgs.map(e => {
            const isSel = emailFocus?.id === e.id;
            const isChecked = selectedIds.includes(e.id);
            const deStr = (carpeta === "entrada" ? e.de : e.para) || "Sin remitente";
            
            return (
              <div key={e.id} onClick={() => { setEmailFocus(e); marcarLeido(e.id); }}
                style={{ 
                  display: "flex",
                  alignItems: "center",
                  padding: "0 16px",
                  height: 42,
                  cursor: "pointer",
                  background: isChecked ? "rgba(20,184,166,0.08)" : isSel ? "rgba(255,255,255,0.05)" : "transparent",
                  borderBottom: `1px solid ${T.whiteFade}05`,
                  transition: "background 0.1s",
                  fontSize: 13,
                  position: "relative",
                  color: !e.leido ? T.white : T.whiteOff
                }}
                onMouseEnter={e => { if (!isSel && !isChecked) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={e => { if (!isSel && !isChecked) e.currentTarget.style.background = "transparent"; }}
              >
                {!e.leido && (
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: T.teal }} />
                )}

                {/* GMAIL-STYLE ICONS */}
                <div style={{ display: "flex", gap: 12, marginRight: 16, color: T.whiteFade, alignItems: "center" }}>
                  <div onClick={(ev) => { ev.stopPropagation(); toggleSeleccion(e.id); }} 
                    style={{ width: 14, height: 14, border: `1.5px solid ${isChecked ? T.teal : T.whiteFade}`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", background: isChecked ? T.teal : "transparent", transition: "all 0.2s" }}>
                    {isChecked && <Ico k="check" size={10} color="#fff" />}
                  </div>
                  <Ico k="star" size={14} style={{ opacity: 0.4 }} />
                </div>

                {/* SENDER */}
                <div style={{ width: 160, fontWeight: !e.leido ? 800 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0, marginRight: 16 }}>
                  {deStr.split("@")[0]}
                </div>

                {/* CONTENT (Subject - Snippet) */}
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: !e.leido ? 800 : 600, color: T.white }}>{e.asunto}</span>
                  <span style={{ color: T.whiteDim, marginLeft: 8, opacity: 0.6 }}>— {e.cuerpo}</span>
                </div>

                {/* DATE */}
                <div style={{ width: 80, textAlign: "right", fontSize: 11, fontWeight: 700, color: T.whiteDim, opacity: 0.6, flexShrink: 0 }}>
                  {fdate(e.fecha)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. LECTOR DE MENSAJES */}
      {emailFocus ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.01)" }}>
          <div style={{ padding: "24px 40px", borderBottom: `1px solid ${T.whiteFade}05`, background: "rgba(255,255,255,0.01)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.white, letterSpacing: "-0.02em", lineHeight: 1.2, flex: 1 }}>{emailFocus.asunto}</h2>
              <div style={{ display: "flex", gap: 8, paddingLeft: 24 }}>
                <button onClick={() => setShowConv(true)} 
                  style={{ height: 32, padding: "0 12px", borderRadius: 8, background: T.tealSoft, border: `1px solid ${T.teal}40`, color: T.teal, cursor: "pointer", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.tealSoft.replace('0.1', '0.15'); e.currentTarget.style.transform = "scale(1.02)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.tealSoft; e.currentTarget.style.transform = "none"; }}>
                  <Ico k="lightning" size={14} /> CONVERTIR A LEAD
                </button>
                <button onClick={() => setEmailFocus(null)} 
                  style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "none", color: T.whiteDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = T.white; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = T.whiteDim; }}>
                  <Ico k="x" size={16} />
                </button>
                <button onClick={() => { eliminarDeSupa("emails", emailFocus.id); setEmailFocus(null); }} 
                  style={{ width: 32, height: 32, borderRadius: 8, background: T.redS, border: "none", color: T.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.redS.replace('0.12', '0.18'); e.currentTarget.style.transform = "scale(1.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.redS; e.currentTarget.style.transform = "none"; }}>
                  <Ico k="trash" size={16} />
                </button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Av text={carpeta === "entrada" ? emailFocus.de : emailFocus.para} color={T.teal} size={48} fs={16} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: T.white }}>{carpeta === "entrada" ? emailFocus.de : "Tú"}</span>
                  <span style={{ fontSize: 12, color: T.whiteDim }}>{fdtm(emailFocus.fecha)}</span>
                </div>
                <div style={{ fontSize: 13, color: T.whiteDim }}>Para: <span style={{ color: T.whiteFade }}>{carpeta === "entrada" ? "Mí" : emailFocus.para}</span></div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 40px 40px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, padding: 8, border: `1px solid ${T.whiteFade}08` }}>
              <HtmlEmail html={emailFocus.html} cuerpo={emailFocus.cuerpo} />

              {/* Adjuntos en el lector */}
              {emailFocus.adjuntos && (
                <div style={{ marginTop: 24, padding: "16px 0", borderTop: `1px solid ${T.whiteFade}05`, display: "flex", gap: 12 }}>
                  {emailFocus.adjuntos.map((at, i) => (
                    <a key={i} href={at.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: 10, color: T.white, textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
                      <Ico k="paperclip" size={14} /> {at.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FOOTER: RESPUESTA RÁPIDA (PREMIUM) */}
        <div style={{ padding: "20px 24px", borderTop: `1px solid ${T.whiteFade}08`, background: "rgba(255,255,255,0.01)" }}>
          {showCCReply && <div style={{ marginBottom: 12, animation: "fadeIn 0.2s" }}><Inp value={replyCC} onChange={e => setReplyCC(e.target.value)} placeholder="CC (Copia)..." style={{ background: "rgba(0,0,0,0.1)", border: `1px solid ${T.whiteFade}08`, borderRadius: 10, padding: "8px 12px", fontSize: 12 }} /></div>}
          {showBCCReply && <div style={{ marginBottom: 12, animation: "fadeIn 0.2s" }}><Inp value={replyBCC} onChange={e => setReplyBCC(e.target.value)} placeholder="BCC (Copia Oculta)..." style={{ background: "rgba(0,0,0,0.1)", border: `1px solid ${T.whiteFade}08`, borderRadius: 10, padding: "8px 12px", fontSize: 12 }} /></div>}
          
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button onClick={() => setShowCCReply(!showCCReply)} style={{ background: showCCReply ? T.teal + "20" : "transparent", border: `1px solid ${showCCReply ? T.teal : T.whiteFade + "15"}`, borderRadius: 8, padding: "4px 8px", color: showCCReply ? T.teal : T.whiteDim, fontSize: 10, fontWeight: 800, cursor: "pointer" }}>CC</button>
              <button onClick={() => setShowBCCReply(!showBCCReply)} style={{ background: showBCCReply ? T.teal + "20" : "transparent", border: `1px solid ${showBCCReply ? T.teal : T.whiteFade + "15"}`, borderRadius: 8, padding: "4px 8px", color: showBCCReply ? T.teal : T.whiteDim, fontSize: 10, fontWeight: 800, cursor: "pointer" }}>BCC</button>
            </div>
            
            <div style={{ position: "relative", flex: 1 }}>
              <Inp value={respuestaRapida} onChange={e => setRespuestaRapida(e.target.value)} placeholder="Escribe tu respuesta..." style={{ background: "rgba(0,0,0,0.15)", border: `1px solid ${T.whiteFade}08`, borderRadius: 16, padding: "12px 48px 12px 16px", minHeight: 48, fontSize: 13 }} rows={1} />
              <button onClick={() => document.getElementById('reply-attach').click()} style={{ position: "absolute", right: 12, bottom: 12, background: "none", border: "none", color: T.whiteDim, cursor: "pointer", opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.6}><Ico k="paperclip" size={18} /></button>
              <input type="file" id="reply-attach" multiple style={{ display: "none" }} onChange={handleFileChange} />
            </div>
            <Btn onClick={enviarRespuesta} disabled={simulandoEnvio || !respuestaRapida.trim() || adjuntosSubiendo} style={{ height: 48, borderRadius: 16, padding: "0 24px" }}>
              {simulandoEnvio ? "..." : <><Ico k="reply" size={16} style={{ marginRight: 6 }} /> Responder</>}
            </Btn>
          </div>

          {adjuntosLocal.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {adjuntosLocal.map((at, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", padding: "3px 8px", borderRadius: 6, border: `1px solid ${T.whiteFade}08` }}>
                  <Ico k="paperclip" size={10} style={{ color: T.teal }} />
                  <span style={{ fontSize: 10, color: T.whiteOff }}>{at.name}</span>
                  <button onClick={() => setAdjuntosLocal(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", padding: 0, marginLeft: 2, display: "flex" }}><Ico k="x" size={10} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
          <div style={{ textAlign: "center" }}>
            <Ico k="mail" size={64} style={{ marginBottom: 16, display: "block", margin: "0 auto" }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Selecciona un mensaje para leerlo</div>
          </div>
        </div>
      )}

      {/* 4. MODAL REDACCIÓN (SUPER CLEAN) */}
      <Modal open={showRedactar} onClose={() => setShowRedactar(false)} title="Nuevo Mensaje" width={720}>
        <div style={{ padding: "0 12px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}><Campo label="Para"><Inp value={f.para} onChange={s("para")} placeholder="ej@ejemplo.com" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.whiteFade}10` }} /></Campo></div>
              <div style={{ display: "flex", gap: 6, paddingBottom: 6 }}>
                <button onClick={() => setShowCC(!showCC)} style={{ background: showCC ? T.teal + "20" : "transparent", border: `1px solid ${showCC ? T.teal : T.whiteFade + "20"}`, borderRadius: 8, padding: "4px 10px", color: showCC ? T.teal : T.whiteDim, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>CC</button>
                <button onClick={() => setShowBCC(!showBCC)} style={{ background: showBCC ? T.teal + "20" : "transparent", border: `1px solid ${showBCC ? T.teal : T.whiteFade + "20"}`, borderRadius: 8, padding: "4px 10px", color: showBCC ? T.teal : T.whiteDim, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>BCC</button>
              </div>
            </div>
            {showCC && <div style={{ animation: "fadeIn 0.2s" }}><Campo label="CC (Copia)"><Inp value={f.cc} onChange={s("cc")} placeholder="cc@ejemplo.com" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.whiteFade}10` }} /></Campo></div>}
            {showBCC && <div style={{ animation: "fadeIn 0.2s" }}><Campo label="BCC (Copia Oculta)"><Inp value={f.bcc} onChange={s("bcc")} placeholder="bcc@ejemplo.com" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.whiteFade}10` }} /></Campo></div>}
            <Campo label="Asunto"><Inp value={f.asunto} onChange={s("asunto")} placeholder="Propuesta comercial..." style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.whiteFade}10` }} /></Campo>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
              <div style={{ width: 140 }}>
                <Sel value={f.plantillaId} onChange={aplicarTpl} style={{ height: 32, fontSize: 11, background: "rgba(255,255,255,0.05)", border: `1px solid ${T.whiteFade}10` }}>
                  <option value="">— Plantillas —</option>
                  {db.plantillasEmail?.map(p => <option key={p.id} value={p.id}>{p.nombre || p.asunto}</option>)}
                </Sel>
              </div>
              <button 
                onClick={() => document.getElementById('compose-attach').click()}
                style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: "6px 12px", color: T.white, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Ico k="paperclip" size={14} /> Adjuntar
              </button>
              <input type="file" id="compose-attach" multiple style={{ display: "none" }} onChange={handleFileChange} />
            </div>
            <button onClick={redactarIA} style={{ background: `linear-gradient(135deg, ${T.purple}, ${T.teal})`, border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 12px ${T.purple}40`, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
              ✨ Redactar con IA
            </button>
            {f.cuerpo.trim() && (
               <button onClick={() => setShowPreviewCompose(true)} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${T.teal}40`, borderRadius: 8, padding: "6px 14px", color: T.teal, fontSize: 11, fontWeight: 800, cursor: "pointer", transition: "all 0.2s", marginLeft: 8 }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                 <Ico k="eye" size={14} style={{ marginRight: 4 }} /> Vista Previa
               </button>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <textarea value={f.cuerpo} onChange={s("cuerpo")} 
              style={{ width: "100%", height: 320, background: "rgba(0,0,0,0.2)", border: `1px solid ${T.whiteFade}08`, borderRadius: 16, color: T.whiteOff, padding: 20, fontSize: 14, outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "inherit" }} 
              placeholder="Escribe tu mensaje aquí..." 
            />
            {adjuntosSubiendo && <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 10, color: T.teal, fontWeight: 700 }}>Subiendo archivos...</div>}
          </div>

          {adjuntosLocal.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {adjuntosLocal.map((at, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 8, border: `1px solid ${T.whiteFade}10` }}>
                  <Ico k="paperclip" size={12} style={{ color: T.teal }} />
                  <span style={{ fontSize: 11, color: T.whiteOff }}>{at.name}</span>
                  <button onClick={() => setAdjuntosLocal(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", padding: 0, marginLeft: 4, display: "flex" }}><Ico k="x" size={12} /></button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 12 }}>
            <Btn variant="secundario" onClick={() => setShowRedactar(false)}>Descartar</Btn>
            <Btn onClick={enviarRealista} disabled={simulandoEnvio || adjuntosSubiendo} style={{ padding: "0 32px", height: 44, borderRadius: 12 }}>
              {simulandoEnvio ? "Enviando..." : <><Ico k="send" size={16} style={{ marginRight: 8 }} /> Enviar Ahora</>}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* MODAL CONVERSION A LEAD */}
      <Modal open={showConv} onClose={() => setShowConv(false)} title="Convertir Email en Negociación (Lead)" width={500}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <Campo label="Título de la Negociación">
            <Inp value={cf.titulo} onChange={e => setCf({ ...cf, titulo: e.target.value })} placeholder="Ej. Propuesta Software Acme" />
          </Campo>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Campo label="Pipeline">
              <Sel value={cf.pipeline_id} onChange={e => {
                const pid = e.target.value;
                const pl = db.pipelines.find(p => p.id === pid);
                setCf({ ...cf, pipeline_id: pid, etapa_id: pl?.etapas?.[0]?.id || "" });
              }}>
                {db.pipelines.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Sel>
            </Campo>

            <Campo label="Etapa Inicial">
              <Sel value={cf.etapa_id} onChange={e => setCf({ ...cf, etapa_id: e.target.value })}>
                {db.pipelines.find(p => p.id === cf.pipeline_id)?.etapas.map(et => (
                  <option key={et.id} value={et.id}>{et.nombre}</option>
                ))}
              </Sel>
            </Campo>
          </div>

          <div style={{ background: "rgba(20,184,166,0.05)", padding: 16, borderRadius: 12, border: `1px solid ${T.teal}20`, display: "flex", gap: 12, alignItems: "center" }}>
            <Av text={emailFocus?.de} size={32} color={T.teal} />
            <div style={{ fontSize: 12, color: T.whiteDim }}>
              Se asignará automáticamente al contacto: <strong style={{ color: T.white }}>{emailFocus?.de}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <Btn variant="secundario" onClick={() => setShowConv(false)} full>Cancelar</Btn>
            <Btn onClick={handleConvert} full style={{ background: T.teal, color: "#000" }}>Crear Lead ahora</Btn>
          </div>
        </div>
      </Modal>
      {/* MODAL VISTA PREVIA REDACCIÓN */}
      <Modal open={showPreviewCompose} onClose={() => setShowPreviewCompose(false)} title="Vista Previa del Mensaje" width={800}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 0, overflow: "hidden", border: `1px solid ${T.border}` }}>
          {f.tipo === "html" ? (
             <iframe
               title="Preview Compose"
               srcDoc={f.cuerpo}
               style={{ width: "100%", height: "500px", border: "none" }}
             />
          ) : (
            <div style={{ padding: 40, color: "#1e293b", whiteSpace: "pre-wrap", minHeight: 300, fontFamily: "sans-serif" }}>
              {f.cuerpo}
            </div>
          )}
        </div>
        <Btn onClick={() => setShowPreviewCompose(false)} style={{ marginTop: 20 }} full>Continuar Editando</Btn>
      </Modal>
    </div>
  );
};
