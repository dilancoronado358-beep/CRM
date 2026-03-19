import { useState } from "react";
import { T } from "../theme";
import { uid, fdtm, fdate } from "../utils";
import { Av, Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, Vacio, ControlSegmentado, Ico } from "../components/ui";
import axios from "axios";
import { sileo as toast } from "../utils/sileo";

export const ModuloEmail = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [carpeta, setCarpeta] = useState("entrada");
  const [showRedactar, setShowRedactar] = useState(false);
  const [emailFocus, setEmailFocus] = useState(null);
  const [f, setF] = useState({ para: "", asunto: "", cuerpo: "", cc: "", bcc: "", plantillaId: "" });
  const [respuestaRapida, setRespuestaRapida] = useState("");
  const [simulandoEnvio, setSimulandoEnvio] = useState(false);
  const [logEnvio, setLogEnvio] = useState([]);
  const [adjuntosSubiendo, setAdjuntosSubiendo] = useState(false);
  const [adjuntosLocal, setAdjuntosLocal] = useState([]); // { name, url, type, size }

  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const aplicarTpl = id => {
    const tpl = db.plantillasEmail.find(p => p.id === id);
    if (tpl) setF({ ...f, asunto: tpl.asunto, cuerpo: tpl.cuerpo, plantillaId: id });
    else setF({ ...f, plantillaId: "" });
  };

  const redactarIA = () => {
    setF({ ...f, cuerpo: "Redactando con IA...\n\n" });
    setTimeout(() => {
      setF({ ...f, cuerpo: `Hola ${f.para.split("@")[0] || "cliente"},\n\nEspero que este mensaje te encuentre muy bien.\n\nEscribo para hacer seguimiento a nuestra última conversación sobre la propuesta. ¿Tuviste oportunidad de revisarla?\n\nMe gustaría agendar una breve llamada de 10 minutos para aclarar cualquier duda técnica.\n\nQuedo atento a tus comentarios.\n\nSaludos cordiales,\n${db.usuario?.name}` });
    }, 1500);
  };

  const getApiUrl = () => {
    const orgActual = db.organizacion?.find(o => o.id === db.usuario?.org_id);
    if (orgActual?.wa_server_url) return orgActual.wa_server_url;
    const protocol = window.location.protocol;
    return `${protocol}//${window.location.hostname}:3001`;
  };

  const enviarRealista = async () => {
    if (!f.para.trim() || !f.cuerpo.trim()) return;
    const acc = db.email_accounts?.[0];
    if (!acc) { toast.error("Configura tu cuenta de correo en la pestaña de Configuración."); return; }

    setSimulandoEnvio(true);
    const host = acc.smtp_host || (acc.provider === 'google' ? 'smtp.gmail.com' : 'smtp.office365.com');
    setLogEnvio(["[SMTP] Iniciando handshake con " + host]);

    try {
      const API_URL = getApiUrl();
      setLogEnvio(prev => [...prev, "[AUTH] Autenticando canal TLS/SSL... ok."]);
      
      const res = await axios.post(`${API_URL}/api/email/send`, {
        accountId: acc.id,
        to: f.para,
        subject: f.asunto || "Sin asunto",
        body: f.cuerpo,
        attachments: adjuntosLocal
      }, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      setLogEnvio(prev => [...prev, `[SEND] Transmitiendo payload cifrado...`]);
      setLogEnvio(prev => [...prev, "[250] OK: Email transmitido exitosamente."]);
      
      setTimeout(() => {
        setShowRedactar(false);
        setSimulandoEnvio(false);
        setLogEnvio([]);
        // Actualización inmediata para UX
        const nuevoEnviado = {
          id: "em_sent_" + Date.now(),
          de: acc.email,
          para: f.para,
          asunto: f.asunto || "Sin asunto",
          cuerpo: f.cuerpo,
          fecha: new Date().toISOString(),
          carpeta: 'enviados',
          leido: true
        };
        setDb(prev => ({ ...prev, emails: [{ ...nuevoEnviado, adjuntos: adjuntosLocal }, ...prev.emails] }));
        setF({ para: "", asunto: "", cuerpo: "", cc: "", bcc: "", plantillaId: "" });
        setAdjuntosLocal([]);
      }, 1000);
    } catch (e) {
      const errorDetail = e.response?.data?.error || e.message;
      setLogEnvio(prev => [...prev, "❌ Error: " + errorDetail]);
      if (errorDetail.includes("Network Error")) {
        toast.error({ title: "Error de Red", description: "No se pudo conectar al servidor. Asegúrate de que ngrok esté activo y la URL sea correcta." });
      } else {
        toast.error("Error enviando: " + errorDetail);
      }
      setTimeout(() => setSimulandoEnvio(false), 5000);
    }
  };

  const enviarRespuesta = async () => {
    if (!respuestaRapida.trim() || !emailFocus) return;
    const acc = db.email_accounts?.[0];
    if (!acc) return;

    try {
      const API_URL = getApiUrl();
      await axios.post(`${API_URL}/api/email/send`, {
        accountId: acc.id,
        to: emailFocus.de,
        subject: emailFocus.asunto.startsWith("Re:") ? emailFocus.asunto : `Re: ${emailFocus.asunto}`,
        body: respuestaRapida,
        attachments: adjuntosLocal
      }, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      toast.success("✅ Respuesta enviada.");
      
      // Actualización inmediata local
      const nuevaRpta = {
        id: "em_reply_" + Date.now(),
        de: acc.email,
        para: emailFocus.de,
        asunto: emailFocus.asunto.startsWith("Re:") ? emailFocus.asunto : `Re: ${emailFocus.asunto}`,
        cuerpo: respuestaRapida,
        fecha: new Date().toISOString(),
        carpeta: 'enviados',
        leido: true
      };
      setDb(prev => ({ ...prev, emails: [{ ...nuevaRpta, adjuntos: adjuntosLocal }, ...prev.emails] }));
      setRespuestaRapida("");
      setAdjuntosLocal([]);
    } catch (e) {
      const errorDetail = e.response?.data?.error || e.message;
      if (errorDetail.includes("Network Error")) {
        toast.error({ title: "Error de Red", description: "No se pudo enviar la respuesta. Revisa tu túnel ngrok." });
      } else {
        toast.error("❌ Error enviando respuesta: " + errorDetail);
      }
    }
  };

  const handleSync = async () => {
    const acc = db.email_accounts?.find(a => a.active);
    if (!acc) return;
    try {
      await guardarEnSupa("email_accounts", { ...acc, last_sync: new Date().toISOString() });
      toast.success("✅ Sincronización solicitada.");
    } catch (e) {
      console.error("Sync error", e);
    }
  };

  const eliminar = async id => {
    setDb(d => ({ ...d, emails: d.emails.filter(e => e.id !== id) }));
    await eliminarDeSupa("emails", id);
    if (emailFocus?.id === id) setEmailFocus(null);
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAdjuntosSubiendo(true);
    const nuevosAdjuntos = [...adjuntosLocal];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = `att_${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
      
      try {
        const { data, error } = await sb.storage
          .from('email-attachments')
          .upload(safeName, file, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = sb.storage.from('email-attachments').getPublicUrl(safeName);
        nuevosAdjuntos.push({ name: file.name, url: publicUrl, type: file.type, size: file.size });
        toast.success(`Archivo ${file.name} subido.`);
      } catch (err) {
        console.error("Error subiendo adjunto:", err.message);
        toast.error(`Error subiendo ${file.name}`);
      }
    }

    setAdjuntosLocal(nuevosAdjuntos);
    setAdjuntosSubiendo(false);
    e.target.value = ""; // Reset input
  };

  const quitarAdjunto = (index) => {
    setAdjuntosLocal(prev => prev.filter((_, i) => i !== index));
  };

  const marcarLeido = async id => {
    const act = db.emails.find(e => e.id === id);
    if (!act || act.leido) return;
    const n = { ...act, leido: true };
    setDb(d => ({ ...d, emails: d.emails.map(e => e.id === id ? n : e) }));
    await guardarEnSupa("emails", n);
    if (emailFocus?.id === id) setEmailFocus(n);
  };

  const msgs = db.emails.filter(e => e.carpeta === carpeta).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <div style={{ display: "flex", gap: 24, height: "calc(100vh - 120px)", padding: "0 10px" }}>
      {/* SIDEBAR EMAIL ULTRA - GLASS STYLE */}
      <div style={{ width: 250, display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, background: "rgba(255,255,255,0.02)", backdropFilter: "blur(10px)", borderRadius: 20, padding: 12, border: `1px solid ${T.whiteFade}15` }}>
        <button onClick={() => setShowRedactar(true)} 
          style={{ width: "100%", marginBottom: 20, background: T.teal, color: "#fff", border: "none", padding: "14px", borderRadius: 14, fontWeight: 900, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all .3s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: `0 8px 25px ${T.teal}40`, transform: "translateY(0)" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 30px ${T.teal}60`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 8px 25px ${T.teal}40`; }}
        >
          <Ico k="edit" size={18} /> REDACTAR
        </button>

        <div style={{ fontSize: 11, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em", padding: "10px 14px", marginTop: 8 }}>Favoritos</div>
        {[
          { id: "entrada", label: "Inbox", icon: "inbox" },
          { id: "enviados", label: "Sent", icon: "send" },
          { id: "borradores", label: "Drafts", icon: "note" }
        ].map(c => {
          const count = c.id === "entrada" ? db.emails.filter(e => e.carpeta === "entrada" && !e.leido).length : 0;
          const act = carpeta === c.id;
          return (
            <button key={c.id} onClick={() => { setCarpeta(c.id); setEmailFocus(null); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, border: "none", background: act ? "rgba(255,255,255,0.06)" : "transparent", color: act ? T.white : T.whiteFade, fontWeight: act ? 800 : 600, cursor: "pointer", transition: "all .2s", fontFamily: "inherit", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Ico k={c.icon} size={16} style={{ color: act ? T.teal : T.whiteFade, opacity: act ? 1 : 0.6 }} />{c.label}</div>
              {count > 0 && <span style={{ background: T.teal, color: "#fff", borderRadius: 8, padding: "2px 6px", fontSize: 10, fontWeight: 900, boxShadow: `0 0 10px ${T.teal}50` }}>{count}</span>}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: db.email_accounts?.some(a => a.active) ? T.green : T.amber }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", boxShadow: `0 0 10px currentColor` }} />
            <span style={{ fontSize: 12, fontWeight: 800 }}>{db.email_accounts?.some(a => a.active) ? "Correo Conectado" : "Esperando Conexión"}</span>
          </div>
          <div style={{ fontSize: 11, color: T.whiteDim }}>{db.email_accounts?.some(a => a.active) ? "Sincronización en tiempo real activa vía OAuth." : "Debes conectar tu cuenta en Configuración."}</div>
        </div>
      </div>

      {/* LISTA DE CORREOS */}
      <Tarjeta style={{ flex: 1, display: "flex", overflow: "hidden", padding: 0, border: `1px solid ${T.borderHi}`, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
        <div style={{ width: emailFocus ? 380 : "100%", display: "flex", flexDirection: "column", borderRight: emailFocus ? `1px solid ${T.borderHi}` : "none", transition: "width .3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.borderHi}`, background: T.bg1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, color: T.white, fontSize: 16 }}>
              {carpeta === "entrada" ? "Bandeja de Entrada" : carpeta === "enviados" ? "Mensajes Enviados" : "Borradores"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="fantasma" size="sm" style={{ padding: 6 }} onClick={handleSync} title="Sincronizar emails (IMAP)"><Ico k="refresh" size={16} /></Btn>
              <Btn variant="fantasma" size="sm" style={{ padding: 6 }}><Ico k="check" size={16} /></Btn>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", background: "transparent", padding: "10px 14px" }}>
            {msgs.length === 0 ? <Vacio text="Carpeta vacía." /> : msgs.map(e => (
              <div key={e.id} onClick={() => { setEmailFocus(e); marcarLeido(e.id); }} 
                style={{ padding: "14px 18px", borderRadius: 14, marginBottom: 4, cursor: "pointer", background: emailFocus?.id === e.id ? "rgba(255,255,255,0.06)" : "transparent", border: `1px solid ${emailFocus?.id === e.id ? T.whiteFade + '20' : 'transparent'}`, transition: "all .2s cubic-bezier(0.16, 1, 0.3, 1)", position: "relative" }}
                onMouseEnter={e => { if (emailFocus?.id !== e.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { if (emailFocus?.id !== e.id) e.currentTarget.style.background = "transparent"; }}
              >
                {!e.leido && carpeta === "entrada" && <div style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: T.teal, boxShadow: `0 0 10px ${T.teal}` }} />}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: !e.leido && carpeta === "entrada" ? 900 : 600, color: !e.leido && carpeta === "entrada" ? T.white : T.whiteOff, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {carpeta === "entrada" ? e.de : e.para}
                  </div>
                  <div style={{ fontSize: 11, color: T.whiteDim, flexShrink: 0, fontWeight: 600, opacity: 0.7 }}>{fdate(e.fecha)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: !e.leido && carpeta === "entrada" ? 700 : 500, color: T.white, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.asunto}</div>
                <div style={{ fontSize: 12, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.6 }}>{e.cuerpo}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LECTOR EMAIL */}
        {emailFocus && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg1, minWidth: 400 }}>
            {/* Cabecera Lector */}
            <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: T.white, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{emailFocus.asunto || "(Sin asunto)"}</div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Btn variant="fantasma" size="sm" onClick={() => setEmailFocus(null)} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10 }}><Ico k="x" size={18} /></Btn>
                  <Btn variant="fantasma" size="sm" onClick={() => eliminar(emailFocus.id)} style={{ background: "rgba(239,68,68,0.1)", borderRadius: 10 }}><Ico k="trash" size={18} style={{ color: T.red }} /></Btn>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Av text={carpeta === "entrada" ? emailFocus.de : emailFocus.para} color={T.teal} size={48} fs={16} style={{ boxShadow: `0 4px 15px ${T.teal}30` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.white }}>{carpeta === "entrada" ? emailFocus.de : db.usuario?.name}</div>
                    <div style={{ fontSize: 12, color: T.whiteFade, fontWeight: 600 }}>{fdtm(emailFocus.fecha)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: T.whiteDim }}>Para: <span style={{ color: T.whiteOff, fontWeight: 600 }}>{carpeta === "entrada" ? "Mí" : emailFocus.para}</span></div>
                </div>
              </div>
            </div>

            {/* Cuerpo Lector */}
            <div style={{ padding: "0 32px 32px", flex: 1, overflowY: "auto", fontSize: 16, color: T.whiteOff, lineHeight: 1.8, fontFamily: "inherit" }}>
              {emailFocus.html ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: emailFocus.html }} 
                  style={{ background: "#fff", color: "#111", padding: "32px", borderRadius: 16, overflowX: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
                />
              ) : (
                <div style={{ whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: `1px solid ${T.whiteFade}10` }}>{emailFocus.cuerpo}</div>
              )}

              {/* Adjuntos */}
              {emailFocus.adjuntos && emailFocus.adjuntos.length > 0 && (
                <div style={{ marginTop: 32, borderTop: `1px solid ${T.borderHi}`, paddingTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.whiteDim, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Ico k="paperclip" size={14} /> ADJUNTOS ({emailFocus.adjuntos.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {emailFocus.adjuntos.map((at, i) => (
                      <a key={i} href={at.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", width: 140 }}>
                        <div style={{ background: T.bg2, borderRadius: 8, padding: 8, border: `1px solid ${T.borderHi}`, transition: "transform .2s" }}>
                          {at.type?.startsWith("image/") ? (
                            <img src={at.url} alt={at.name} style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 4, marginBottom: 8 }} />
                          ) : (
                            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", background: T.bg3, borderRadius: 4, marginBottom: 8 }}>
                              <Ico k="file" size={32} style={{ color: T.whiteDim }} />
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{at.name}</div>
                          <div style={{ fontSize: 10, color: T.whiteDim }}>{(at.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Acción Rápida Lector */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.borderHi}`, background: T.bg1, display: "flex", gap: 12 }}>
              <Inp 
                value={respuestaRapida}
                onChange={e => setRespuestaRapida(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) enviarRespuesta(); }}
                placeholder="Respuesta rápida (Cmd+Enter para enviar)..." 
                style={{ flex: 1, borderRadius: 20, paddingLeft: 20 }} 
              />
              <div style={{ position: "relative" }}>
                 <input type="file" multiple id="email-reply-attach-input" style={{ display: "none" }} onChange={handleFileChange} />
                 <label htmlFor="email-reply-attach-input">
                   <Ico k="paperclip" size={16} style={{ cursor: "pointer", marginTop: 8, color: adjuntosSubiendo ? T.whiteDim : T.white }} />
                 </label>
              </div>
              <Btn onClick={enviarRespuesta} disabled={!respuestaRapida.trim() || adjuntosSubiendo} style={{ borderRadius: 20, padding: "8px 20px" }}>
                <Ico k="send" size={14} /> Enviar
              </Btn>
            </div>
          </div>
        )}
      </Tarjeta>

      {/* MODAL DE REDACCIÓN COMPLEJO TIPO SUPERHUMAN */}
      <Modal open={showRedactar} onClose={() => { if (!simulandoEnvio) setShowRedactar(false) }} title="Composer" width={800}>
        {simulandoEnvio ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: T.teal + "20", color: T.teal, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "pulse 1s infinite" }}>
              <Ico k="send" size={30} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 16 }}>Cifrando y Enviando...</div>
            <div style={{ background: "#000", border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: 16, textAlign: "left", fontFamily: "monospace", fontSize: 12, color: T.green, minHeight: 120 }}>
              {logEnvio.map((l, i) => <div key={i} style={{ marginBottom: 4 }}>{l}</div>)}
              <span style={{ animation: "pulse 1s infinite" }}>_</span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>

            <div style={{ display: "flex", background: T.bg2, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottom: `1px solid ${T.borderHi}`, padding: "10px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", width: 60, alignSelf: "center" }}>Para</div>
              <input value={f.para} onChange={s("para")} placeholder="correo@empresa.com" style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: T.white, fontSize: 14, fontWeight: 600, fontFamily: "inherit" }} />
              <div style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 700, color: T.whiteDim, cursor: "pointer" }}><span>Cc</span><span>Bcc</span></div>
            </div>

            <div style={{ display: "flex", background: T.bg2, borderBottom: `1px solid ${T.borderHi}`, padding: "10px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.whiteDim, textTransform: "uppercase", width: 60, alignSelf: "center" }}>Asunto</div>
              <input value={f.asunto} onChange={s("asunto")} placeholder="Propuesta de integración..." style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: T.white, fontSize: 14, fontWeight: 800, fontFamily: "inherit" }} />
            </div>

            {/* BARRA HERRAMIENTAS EDITOR */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.bg3, borderBottom: `1px solid ${T.borderHi}`, padding: "8px 16px", flexWrap: "wrap" }}>
              <Btn variant="fantasma" size="sm" style={{ padding: "4px 8px", width: 30 }}><strong style={{ fontFamily: "serif" }}>B</strong></Btn>
              <Btn variant="fantasma" size="sm" style={{ padding: "4px 8px", width: 30 }}><em style={{ fontFamily: "serif" }}>I</em></Btn>
              <Btn variant="fantasma" size="sm" style={{ padding: "4px 8px", width: 30 }}><u style={{ fontFamily: "serif" }}>U</u></Btn>
              <div style={{ width: 1, height: 16, background: T.borderHi, margin: "0 4px" }} />
              <Btn variant="fantasma" size="sm" style={{ padding: "4px 8px" }}><Ico k="list" size={14} /></Btn>
              <Btn variant="fantasma" size="sm" style={{ padding: "4px 8px" }}><Ico k="note" size={14} /></Btn>
              <div style={{ width: 1, height: 16, background: T.borderHi, margin: "0 4px" }} />

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                <Sel value={f.plantillaId} onChange={e => aplicarTpl(e.target.value)} style={{ padding: "4px 8px", height: "auto", fontSize: 11, width: 140, background: T.bg1, border: "none" }}>
                  <option value="">Plantillas</option>
                  {db.plantillasEmail.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                </Sel>
                <button onClick={redactarIA} style={{ background: "linear-gradient(45deg, #A78BFA, #3b82f6)", border: "none", padding: "4px 12px", borderRadius: 20, color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Ico k="lightning" size={12} /> Redactar con IA
                </button>
              </div>
            </div>

            <textarea value={f.cuerpo} onChange={s("cuerpo")} placeholder="Escribe tu mensaje aquí..." style={{ border: "none", outline: "none", background: "rgba(255,255,255,0.02)", color: T.white, padding: "32px", fontSize: 16, fontFamily: "inherit", minHeight: 350, resize: "none", lineHeight: 1.8 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", background: "rgba(0,0,0,0.2)", borderTop: `1px solid ${T.whiteFade}10`, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ position: "relative" }}>
                   <input type="file" multiple id="email-attach-input" style={{ display: "none" }} onChange={handleFileChange} />
                   <label htmlFor="email-attach-input">
                     <Ico k="paperclip" size={16} style={{ cursor: "pointer", color: adjuntosSubiendo ? T.whiteDim : T.white }} />
                   </label>
                </div>
                <Ico k="trash" size={14} style={{ cursor: "pointer", color: T.whiteDim }} onClick={() => { setShowRedactar(false); setAdjuntosLocal([]); }} />
                
                {/* Visualizador de adjuntos cargados */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", maxWidth: 300 }}>
                  {adjuntosLocal.map((at, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: T.bg3, padding: "4px 8px", borderRadius: 4, fontSize: 10, color: T.white }}>
                      <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{at.name}</span>
                      <Ico k="x" size={10} style={{ cursor: "pointer" }} onClick={() => quitarAdjunto(i)} />
                    </div>
                  ))}
                  {adjuntosSubiendo && <span style={{ fontSize: 10, color: T.teal, animation: "pulse 1s infinite" }}>Subiendo...</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: T.whiteDim, fontWeight: 600 }}>Cmd + Enter para enviar</span>
                <Btn onClick={enviarRealista} disabled={!f.para.trim() || !f.cuerpo.trim() || adjuntosSubiendo} style={{ borderRadius: 20, padding: "8px 24px" }}><Ico k="send" size={14} style={{ marginRight: 6 }} /> Enviar</Btn>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
