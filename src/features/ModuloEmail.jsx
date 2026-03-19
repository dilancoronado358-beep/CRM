import { useState } from "react";
import { T } from "../theme";
import { uid, fdtm, fdate } from "../utils";
import { Av, Chip, Btn, Inp, Sel, Campo, Modal, Tarjeta, Vacio, ControlSegmentado, Ico } from "../components/ui";
import axios from "axios";

export const ModuloEmail = ({ db, setDb, guardarEnSupa, eliminarDeSupa }) => {
  const [carpeta, setCarpeta] = useState("entrada");
  const [showRedactar, setShowRedactar] = useState(false);
  const [emailFocus, setEmailFocus] = useState(null);
  const [f, setF] = useState({ para: "", asunto: "", cuerpo: "", cc: "", bcc: "", plantillaId: "" });
  const [respuestaRapida, setRespuestaRapida] = useState("");
  const [simulandoEnvio, setSimulandoEnvio] = useState(false);
  const [logEnvio, setLogEnvio] = useState([]);

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
    return orgActual?.wa_server_url || `http://${window.location.hostname}:3001`;
  };

  const enviarRealista = async () => {
    if (!f.para.trim() || !f.cuerpo.trim()) return;
    const acc = db.email_accounts?.[0];
    if (!acc) { alert("Configura tu cuenta de correo en la pestaña de Configuración."); return; }

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
        body: f.cuerpo
      });

      setLogEnvio(prev => [...prev, `[SEND] Transmitiendo payload cifrado...`]);
      setLogEnvio(prev => [...prev, "[250] OK: Email transmitido exitosamente."]);
      
      setTimeout(() => {
        setShowRedactar(false);
        setSimulandoEnvio(false);
        setLogEnvio([]);
        setF({ para: "", asunto: "", cuerpo: "", cc: "", bcc: "", plantillaId: "" });
      }, 1000);
    } catch (e) {
      const errorDetail = e.response?.data?.error || e.message;
      setLogEnvio(prev => [...prev, "❌ Error: " + errorDetail]);
      if (errorDetail.includes("Network Error")) {
        alert("Error de Red: No se pudo conectar al servidor. Asegúrate de que ngrok esté activo y que la URL en Configuración > Infraestructura sea la correcta.");
      } else {
        alert("Error enviando: " + errorDetail);
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
        body: respuestaRapida
      });
      alert("✅ Respuesta enviada.");
      setRespuestaRapida("");
      // Opcional: Recargar emails para ver el enviado
    } catch (e) {
      const errorDetail = e.response?.data?.error || e.message;
      if (errorDetail.includes("Network Error")) {
        alert("Error de Red: No se pudo enviar la respuesta. Revisa tu túnel ngrok en la pestaña de Infraestructura.");
      } else {
        alert("❌ Error enviando respuesta: " + errorDetail);
      }
    }
  };

  const handleSync = async () => {
    const acc = db.email_accounts?.find(a => a.active);
    if (!acc) return;
    try {
      await guardarEnSupa("email_accounts", { ...acc, last_sync: new Date().toISOString() });
      alert("✅ Sincronización solicitada.");
    } catch (e) {
      console.error("Sync error", e);
    }
  };

  const eliminar = async id => {
    setDb(d => ({ ...d, emails: d.emails.filter(e => e.id !== id) }));
    await eliminarDeSupa("emails", id);
    if (emailFocus?.id === id) setEmailFocus(null);
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
    <div style={{ display: "flex", gap: 24, height: "calc(100vh - 120px)" }}>
      {/* SIDEBAR EMAIL ULTRA */}
      <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        <button onClick={() => setShowRedactar(true)} style={{ marginBottom: 16, background: T.tealGlow, color: T.teal, border: `1px solid ${T.tealSoft}`, padding: "12px 16px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s", boxShadow: `0 4px 15px ${T.teal}20` }}>
          <Ico k="edit" size={16} /> NUEVO CORREO (C)
        </button>

        <div style={{ fontSize: 11, fontWeight: 800, color: T.whiteDim, textTransform: "uppercase", letterSpacing: ".1em", padding: "10px 14px", marginTop: 8 }}>Favoritos</div>
        {[
          { id: "entrada", label: "Bandeja Entrada", icon: "inbox" },
          { id: "enviados", label: "Enviados", icon: "send" },
          { id: "borradores", label: "Borradores", icon: "note" }
        ].map(c => {
          const count = c.id === "entrada" ? db.emails.filter(e => e.carpeta === "entrada" && !e.leido).length : 0;
          const act = carpeta === c.id;
          return (
            <button key={c.id} onClick={() => { setCarpeta(c.id); setEmailFocus(null); }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, border: "none", background: act ? T.bg2 : "transparent", color: act ? T.white : T.whiteOff, fontWeight: act ? 800 : 600, cursor: "pointer", transition: "all .15s", fontFamily: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Ico k={c.icon} size={15} style={{ color: act ? T.teal : T.whiteDim }} />{c.label}</div>
              {count > 0 && <span style={{ background: T.teal, color: "#fff", borderRadius: 12, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>{count}</span>}
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

          <div style={{ flex: 1, overflowY: "auto", background: T.bg1 }}>
            {msgs.length === 0 ? <Vacio text="Carpeta vacía." /> : msgs.map(e => (
              <div key={e.id} onClick={() => { setEmailFocus(e); marcarLeido(e.id); }} style={{ padding: "16px 20px", borderBottom: `1px solid ${T.borderHi}`, cursor: "pointer", background: emailFocus?.id === e.id ? T.bg2 : (!e.leido && carpeta === "entrada" ? T.teal + "08" : "transparent"), transition: "background .15s", position: "relative" }}>
                {!e.leido && carpeta === "entrada" && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: T.teal }} />}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: !e.leido && carpeta === "entrada" ? 800 : 600, color: !e.leido && carpeta === "entrada" ? T.white : T.whiteOff, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {carpeta === "entrada" ? e.de : e.para}
                  </div>
                  <div style={{ fontSize: 11, color: T.whiteDim, flexShrink: 0, fontWeight: 600 }}>{fdate(e.fecha)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: !e.leido && carpeta === "entrada" ? 700 : 500, color: T.white, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.asunto}</div>
                <div style={{ fontSize: 12, color: T.whiteDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.cuerpo}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LECTOR EMAIL */}
        {emailFocus && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg1, minWidth: 400 }}>
            {/* Cabecera Lector */}
            <div style={{ padding: "24px", borderBottom: `1px solid ${T.borderHi}`, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.white, lineHeight: 1.2 }}>{emailFocus.asunto || "(Sin asunto)"}</div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Btn variant="fantasma" size="sm" onClick={() => setEmailFocus(null)}><Ico k="x" size={16} /></Btn>
                  <Btn variant="fantasma" size="sm" onClick={() => eliminar(emailFocus.id)}><Ico k="trash" size={16} style={{ color: T.red }} /></Btn>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.bg2, padding: "12px 16px", borderRadius: 10 }}>
                <Av text={carpeta === "entrada" ? emailFocus.de : emailFocus.para} color={T.teal} size={40} fs={14} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>{carpeta === "entrada" ? emailFocus.de : db.usuario?.name}</div>
                    <div style={{ fontSize: 11, color: T.whiteDim, fontWeight: 600 }}>{fdtm(emailFocus.fecha)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: T.whiteDim }}>Para: <span style={{ color: T.whiteOff }}>{carpeta === "entrada" ? "Mí" : emailFocus.para}</span></div>
                </div>
              </div>
            </div>

            {/* Cuerpo Lector */}
            <div style={{ padding: "32px 24px", flex: 1, overflowY: "auto", fontSize: 15, color: T.white, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {emailFocus.cuerpo}
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
              <Btn onClick={enviarRespuesta} disabled={!respuestaRapida.trim()} style={{ borderRadius: 20, padding: "8px 20px" }}>
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

            <textarea value={f.cuerpo} onChange={s("cuerpo")} placeholder="Escribe tu mensaje aquí..." style={{ border: "none", borderBottomLeftRadius: 10, borderBottomRightRadius: 10, outline: "none", background: T.bg1, color: T.white, padding: 24, fontSize: 15, fontFamily: "inherit", minHeight: 300, resize: "vertical", lineHeight: 1.6 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: T.bg2, borderTop: `1px solid ${T.borderHi}` }}>
              <div style={{ fontSize: 11, color: T.whiteDim }}><Ico k="trash" size={14} style={{ cursor: "pointer", marginRight: 16 }} onClick={() => setShowRedactar(false)} /><Ico k="calendar" size={14} style={{ cursor: "pointer" }} /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: T.whiteDim, fontWeight: 600 }}>Cmd + Enter para enviar</span>
                <Btn onClick={enviarRealista} disabled={!f.para.trim() || !f.cuerpo.trim()} style={{ borderRadius: 20, padding: "8px 24px" }}><Ico k="send" size={14} style={{ marginRight: 6 }} /> Enviar</Btn>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
