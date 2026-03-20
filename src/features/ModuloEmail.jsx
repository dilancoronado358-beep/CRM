import { useState, useEffect } from "react";
import { T } from "../theme";
import { uid, fdtm, fdate, getApiUrl } from "../utils";
import { Av, Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, Vacio, Ico } from "../components/ui";
import axios from "axios";
import { sileo as toast } from "../utils/sileo";
import { sb } from "../hooks/useSupaState";

export const ModuloEmail = ({ db, setDb, guardarEnSupa, eliminarDeSupa, cargandoFondo }) => {
  const [carpeta, setCarpeta] = useState("entrada");
  const [showRedactar, setShowRedactar] = useState(false);
  const [emailFocus, setEmailFocus] = useState(null);
  const [f, setF] = useState({ para: "", asunto: "", cuerpo: "", cc: "", bcc: "", plantillaId: "" });
  const [respuestaRapida, setRespuestaRapida] = useState("");
  const [simulandoEnvio, setSimulandoEnvio] = useState(false);
  const [logEnvio, setLogEnvio] = useState([]);
  const [adjuntosSubiendo, setAdjuntosSubiendo] = useState(false);
  const [adjuntosLocal, setAdjuntosLocal] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(db.email_accounts?.[0]?.id || null);

  useEffect(() => {
    if (!selectedAccountId && db.email_accounts?.length > 0) {
      setSelectedAccountId(db.email_accounts[0].id);
    }
  }, [db.email_accounts, selectedAccountId]);

  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const aplicarTpl = id => {
    const tpl = db.plantillasEmail.find(p => p.id === id);
    if (tpl) setF({ ...f, asunto: tpl.asunto, cuerpo: tpl.cuerpo, plantillaId: id });
    else setF({ ...f, plantillaId: "" });
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
        subject: f.asunto || "Sin asunto",
        body: f.cuerpo,
        attachments: adjuntosLocal
      }, { headers: { 'ngrok-skip-browser-warning': 'true' } });

      setLogEnvio(p => [...p, "[250] OK: Transmitido."]);
      setTimeout(() => {
        setShowRedactar(false);
        setSimulandoEnvio(false);
        setLogEnvio([]);
        const nuevo = { id: "em_sent_" + Date.now(), de: acc.email, para: f.para, asunto: f.asunto || "Sin asunto", cuerpo: f.cuerpo, fecha: new Date().toISOString(), carpeta: 'enviados', leido: true, adjuntos: adjuntosLocal };
        setDb(prev => ({ ...prev, emails: [nuevo, ...prev.emails] }));
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
    await guardarEnSupa("emails", n);
    if (emailFocus?.id === id) setEmailFocus(n);
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
    { id: "entrada", label: "Inbox", icon: "inbox" },
    { id: "enviados", label: "Sent", icon: "send" },
    { id: "borradores", label: "Drafts", icon: "note" },
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
      await axios.post(`${API_URL}/api/email/send`, {
        accountId: acc.id,
        to: emailFocus.de,
        subject: emailFocus.asunto.startsWith("Re:") ? emailFocus.asunto : `Re: ${emailFocus.asunto}`,
        body: respuestaRapida,
        attachments: adjuntosLocal
      }, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      toast.success("✅ Respuesta enviada.");
      const nuevaRpta = { id: "em_reply_" + Date.now(), de: acc.email, para: emailFocus.de, asunto: `Re: ${emailFocus.asunto}`, cuerpo: respuestaRapida, fecha: new Date().toISOString(), carpeta: 'enviados', leido: true, adjuntos: adjuntosLocal };
      setDb(prev => ({ ...prev, emails: [nuevaRpta, ...prev.emails] }));
      setRespuestaRapida("");
      setAdjuntosLocal([]);
    } catch (e) { toast.error("Error enviando respuesta."); }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 110px)", background: T.bg0, borderRadius: 24, overflow: "hidden", border: `1px solid ${T.whiteFade}10`, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
      {/* 1. SIDEBAR (GLASS PANEL) */}
      <div style={{ width: 240, background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)", borderRight: `1px solid ${T.whiteFade}08`, display: "flex", flexDirection: "column", padding: "24px 16px" }}>
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
                <span style={{ fontSize: 13, fontWeight: act ? 700 : 500, flex: 1 }}>{item.label}</span>
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

        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {cargandoFondo && msgs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ height: 100, background: "rgba(255,255,255,0.03)", borderRadius: 16, animation: "pulse 1.5s infinite" }} />)}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.2; } }`}</style>
            </div>
          ) : msgs.length === 0 ? <Vacio text="No hay mensajes" /> : msgs.map(e => (
            <div key={e.id} onClick={() => { setEmailFocus(e); marcarLeido(e.id); }}
              style={{ position: "relative", padding: "16px 20px", borderRadius: 16, marginBottom: 4, cursor: "pointer", background: emailFocus?.id === e.id ? "rgba(255,255,255,0.06)" : "transparent", transition: "all 0.2s" }}
              onMouseEnter={e => { if (emailFocus?.id !== e.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
              onMouseLeave={e => { if (emailFocus?.id !== e.id) e.currentTarget.style.background = "transparent"; }}
            >
              {!e.leido && carpeta === "entrada" && <div style={{ position: "absolute", left: 8, top: 22, width: 6, height: 6, borderRadius: "50%", background: T.teal, boxShadow: `0 0 8px ${T.teal}` }} />}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: !e.leido ? 800 : 600, color: !e.leido ? T.white : T.whiteOff, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{carpeta === "entrada" ? e.de : e.para}</span>
                <span style={{ fontSize: 11, color: T.whiteDim, opacity: 0.6 }}>{fdate(e.fecha)}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.asunto}</div>
              <div style={{ fontSize: 12, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", opacity: 0.5 }}>{e.cuerpo}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LECTOR DE MENSAJES */}
      {emailFocus ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.01)" }}>
          <div style={{ padding: "40px", borderBottom: `1px solid ${T.whiteFade}05` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: T.white, letterSpacing: "-0.03em", lineHeight: 1.1, flex: 1 }}>{emailFocus.asunto}</h2>
              <div style={{ display: "flex", gap: 8, paddingLeft: 24 }}>
                <button onClick={() => setEmailFocus(null)} style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "none", color: T.white, cursor: "pointer" }}><Ico k="x" size={18} /></button>
                <button onClick={() => { eliminarDeSupa("emails", emailFocus.id); setEmailFocus(null); }} style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "none", color: T.red, cursor: "pointer" }}><Ico k="trash" size={18} /></button>
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
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 20, padding: 32, border: `1px solid ${T.whiteFade}08`, lineHeight: 1.7, fontSize: 16, color: T.whiteOff }}>
              {emailFocus.html ? <div dangerouslySetInnerHTML={{ __html: emailFocus.html }} /> : <div style={{ whiteSpace: "pre-wrap" }}>{emailFocus.cuerpo}</div>}

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

          <div style={{ height: 80, borderTop: `1px solid ${T.whiteFade}05`, display: "flex", alignItems: "center", padding: "0 32px", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <input type="file" multiple id="email-reply-attach-input" style={{ display: "none" }} onChange={handleFileChange} />
              <label htmlFor="email-reply-attach-input">
                <Ico k="paperclip" size={18} style={{ cursor: "pointer", color: adjuntosSubiendo ? T.whiteDim : T.white }} />
              </label>
            </div>
            <Inp value={respuestaRapida} onChange={e => setRespuestaRapida(e.target.value)} placeholder="Escribe una respuesta rápida..." style={{ flex: 1, borderRadius: 12, height: 48 }} />
            <Btn onClick={enviarRespuesta} disabled={!respuestaRapida.trim() || adjuntosSubiendo} style={{ height: 48, borderRadius: 12, padding: "0 24px" }}><Ico k="send" size={16} style={{ marginRight: 8 }} /> Responder</Btn>
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
      <Modal open={showRedactar} onClose={() => setShowRedactar(false)} title="Nuevo Mensaje" width={640}>
        <div style={{ padding: "8px 24px 24px" }}>
          <Campo label="Para"><Inp value={f.para} onChange={s("para")} placeholder="ej@ejemplo.com" /></Campo>
          <Campo label="Asunto"><Inp value={f.asunto} onChange={s("asunto")} placeholder="Propuesta..." /></Campo>
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "12px 0" }}>
            <button onClick={aplicarTpl} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: "6px 12px", color: T.whiteDim, fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 8 }}>Plantillas</button>
            <button onClick={redactarIA} style={{ background: "linear-gradient(45deg, #A78BFA, #3b82f6)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Redactar con IA</button>
          </div>
          <textarea value={f.cuerpo} onChange={s("cuerpo")} style={{ width: "100%", height: 300, background: "rgba(255,255,255,0.02)", border: `1px solid ${T.whiteFade}10`, borderRadius: 12, color: T.white, padding: 16, fontSize: 14, outline: "none", resize: "none", lineHeight: 1.6 }} placeholder="Escribe tu mensaje..." />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <Btn onClick={enviarRealista} disabled={simulandoEnvio}>{simulandoEnvio ? "Enviando..." : "Enviar Ahora"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};
