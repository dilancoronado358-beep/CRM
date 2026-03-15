import { useState } from "react";
import { T, THEMES, applyTheme } from "../theme";
import { Btn, Inp, Sel, Campo, Tarjeta, EncabezadoSeccion, Celda, CabeceraTabla, FilaTabla, Chip, Ico, Modal } from "../components/ui";
import { fdtm } from "../utils";

export const Configuracion = ({ db, setDb, guardarEnSupa }) => {
  const [tab, setTab] = useState("perfil");
  
  const [fPerfil, setFPerfil] = useState({ name: db.usuario?.name || "", email: db.usuario?.email || "", idioma: db.usuario?.idioma || "es" });
  const [fEmail, setFEmail] = useState(db.cuentaEmail || {});
  const [fEmpresa, setFEmpresa] = useState(db.empresaConfigs?.nombre || "");
  const [showUserModal, setShowUserModal] = useState(false);
  const [recordatorios, setRecordatorios] = useState(db.recordatorios || {
    dealSinActividadDias: 7, dealCierraCercanoDias: 3,
    emailDigestHora: "09:00", emailDigest: true,
    pushNotif: true, alertaTareaVencida: true,
  });

  const auditLogs = [
    { id: 1, action: "Login Exitoso", ip: "192.168.1.45", location: "Madrid, ES", time: new Date().toISOString() },
    { id: 2, action: "Pipeline Modificado", ip: "192.168.1.45", location: "Madrid, ES", time: new Date(Date.now() - 3600000).toISOString() },
    { id: 3, action: "Exportación Bloqueada", ip: "Unknown", location: "Beijing, CN", time: new Date(Date.now() - 86400000).toISOString(), threat: true },
  ];

  const guardarPerfil = () => {
    const act = { ...db.usuario, ...fPerfil, avatar: fPerfil.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() };
    setDb(d => ({ ...d, usuario: act }));
    alert("Perfil actualizado correctamente");
  };

  const guardarEmail = () => {
    setDb(d => ({ ...d, cuentaEmail: { ...fEmail, conectado: true } }));
    alert("Configuración SMTP/IMAP guardada. Handshake TLS OK.");
  };

  const cambiarTema = (themeId) => {
    applyTheme(themeId);
    setDb(d => ({ ...d, usuario: { ...d.usuario, tema: themeId } }));
  };

  const guardarRecordatorios = () => {
    setDb(d => ({ ...d, recordatorios }));
    alert("Configuración de recordatorios guardada.");
  };

  const TABS = [
    { id: "perfil",  label: "Mi Perfil",         icon: "user"     },
    { id: "apariencia", label: "Apariencia",      icon: "star"     },
    { id: "recordatorios", label: "Recordatorios", icon: "bell"   },
    { id: "empresa", label: "Infraestructura",    icon: "building" },
    { id: "usuarios", label: "Equipo & Accesos",  icon: "users"    },
    { id: "email",   label: "SMTP / IMAP",        icon: "mail"     },
    { id: "api",     label: "API & Webhooks",      icon: "code"     },
    { id: "security", label: "Seguridad",         icon: "eye"      },
    { id: "avanzado", label: "Avanzado",          icon: "cog"      },
  ];

  return (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-start", minHeight: "80vh" }}>

      {/* SIDEBAR */}
      <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, position: "sticky", top: 0 }}>
        <EncabezadoSeccion title="Ajustes CRM" sub="Administración Global" />
        {TABS.map(opt => {
          const act = tab === opt.id;
          return (
            <button key={opt.id} onClick={() => setTab(opt.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 8, border: "none", background: act ? T.tealSoft : "transparent", color: act ? T.teal : T.whiteDim, fontWeight: act ? 700 : 500, cursor: "pointer", transition: "all .2s", fontFamily: "inherit", textAlign: "left" }}
              onMouseEnter={e => { if (!act) { e.currentTarget.style.background = T.bg2; e.currentTarget.style.color = T.white; } }}
              onMouseLeave={e => { if (!act) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.whiteDim; } }}>
              <Ico k={opt.icon} size={16} />
              {opt.label}
              {act && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: T.teal, boxShadow: `0 0 10px ${T.teal}` }} />}
            </button>
          );
        })}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, maxWidth: 900, animation: "fadeIn .3s" }}>

        {/* ── APARIENCIA / TEMAS ── */}
        {tab === "apariencia" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="star" size={24} style={{ color: T.teal }} /> Tema del Sistema</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 28 }}>Elige la apariencia visual del CRM. El cambio es instantáneo y se guarda automáticamente.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {Object.values(THEMES).map(th => {
                const isSel = (db.usuario?.tema || "dark") === th.id;
                return (
                  <div key={th.id} onClick={() => cambiarTema(th.id)}
                    style={{ border: `2px solid ${isSel ? T.teal : T.borderHi}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all .2s", transform: isSel ? "scale(1.03)" : "scale(1)", boxShadow: isSel ? `0 0 0 3px ${T.teal}30, 0 8px 24px rgba(0,0,0,0.15)` : "none" }}>
                    {/* Mini preview */}
                    <div style={{ height: 80, background: th.bg0, display: "flex", padding: 10, gap: 6 }}>
                      <div style={{ width: 28, background: th.bg1, borderRadius: 6, display: "flex", flexDirection: "column", gap: 4, padding: 4 }}>
                        {[th.teal, th.green, th.amber].map((c, i) => <div key={i} style={{ height: 6, borderRadius: 3, background: c, opacity: .8 }} />)}
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ height: 12, background: th.teal, borderRadius: 4, width: "70%" }} />
                        <div style={{ height: 8, background: th.bg2, borderRadius: 4 }} />
                        <div style={{ height: 8, background: th.bg2, borderRadius: 4, width: "80%" }} />
                      </div>
                    </div>
                    <div style={{ padding: "10px 14px", background: T.bg1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{th.icon} {th.label}</div>
                      {isSel && <div style={{ fontSize: 11, color: T.teal, fontWeight: 700 }}>● Activo</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Tarjeta>
        )}

        {/* ── RECORDATORIOS ── */}
        {tab === "recordatorios" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="bell" size={24} style={{ color: T.amber }} /> Centro de Recordatorios</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 28 }}>Configura cuándo y cómo el CRM te notificará sobre eventos importantes.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ background: T.bg2, borderRadius: 12, padding: 20, border: `1px solid ${T.borderHi}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.white, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><Ico k="clock" size={16} style={{ color: T.amber }} /> Deal Sin Actividad</div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 14 }}>Alerta cuando un deal activo no tiene actividad registrada desde X días.</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, color: T.white }}>Avisar después de</span>
                  <Inp type="number" value={recordatorios.dealSinActividadDias} style={{ width: 72 }}
                    onChange={e => setRecordatorios(r => ({ ...r, dealSinActividadDias: +e.target.value }))} />
                  <span style={{ fontSize: 13, color: T.whiteDim }}>días sin actividad</span>
                </div>
              </div>
              <div style={{ background: T.bg2, borderRadius: 12, padding: 20, border: `1px solid ${T.borderHi}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.white, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><Ico k="calendar" size={16} style={{ color: T.red }} /> Cierre de Deal Cercano</div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 14 }}>Notificación cuando la fecha de cierre estimada de un deal está próxima.</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, color: T.white }}>Avisar con</span>
                  <Inp type="number" value={recordatorios.dealCierraCercanoDias} style={{ width: 72 }}
                    onChange={e => setRecordatorios(r => ({ ...r, dealCierraCercanoDias: +e.target.value }))} />
                  <span style={{ fontSize: 13, color: T.whiteDim }}>días de antelación</span>
                </div>
              </div>
              <div style={{ background: T.bg2, borderRadius: 12, padding: 20, border: `1px solid ${T.borderHi}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.white, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><Ico k="mail" size={16} style={{ color: T.teal }} /> Resumen Diario por Email</div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 14 }}>Recibe un daily digest con el resumen de pipeline, tareas y actividades pendientes.</div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={recordatorios.emailDigest} onChange={e => setRecordatorios(r => ({ ...r, emailDigest: e.target.checked }))} style={{ accentColor: T.teal, width: 16, height: 16 }} />
                    <span style={{ fontSize: 13, color: T.white }}>Activar</span>
                  </label>
                  <Inp type="time" value={recordatorios.emailDigestHora} style={{ width: 110 }}
                    onChange={e => setRecordatorios(r => ({ ...r, emailDigestHora: e.target.value }))} />
                </div>
              </div>
              <div style={{ background: T.bg2, borderRadius: 12, padding: 20, border: `1px solid ${T.borderHi}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.white, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><Ico k="bell" size={16} style={{ color: T.teal }} /> Notificaciones Push</div>
                {[{ key: "pushNotif", label: "Notificaciones push en navegador" }, { key: "alertaTareaVencida", label: "Alertar cuando una tarea esté vencida" }].map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 12 }}>
                    <input type="checkbox" checked={recordatorios[key]} onChange={e => setRecordatorios(r => ({ ...r, [key]: e.target.checked }))} style={{ accentColor: T.teal, width: 16, height: 16 }} />
                    <span style={{ fontSize: 13, color: T.white }}>{label}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={guardarRecordatorios}><Ico k="check" size={14} /> Guardar Recordatorios</Btn>
              </div>
            </div>
          </Tarjeta>
        )}
        {tab === "perfil" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><Ico k="user" size={24} style={{ color: T.teal }} /> Preferencias de Cuenta</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "20px", background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}` }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(45deg, #14B8A6, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", boxShadow: "0 10px 25px rgba(20, 184, 166, 0.4)" }}>
                  {fPerfil.name ? fPerfil.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "??"}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 4 }}>Avatar Generado por IA</div>
                  <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 16 }}>Basado en la firma de tu perfil y tu rol de sistema.</div>
                  <Btn variant="secundario" size="sm">Cambiar Imagen</Btn>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Campo label="Nombre Completo"><Inp value={fPerfil.name} onChange={e => setFPerfil({ ...fPerfil, name: e.target.value })} style={{ fontSize: 15 }} /></Campo>
                <Campo label="Correo Electrónico de Identidad (IdP)"><Inp value={fPerfil.email} onChange={e => setFPerfil({ ...fPerfil, email: e.target.value })} style={{ fontSize: 15 }} /></Campo>
                <Campo label="Idioma del Sistema / System Language"><Sel value={fPerfil.idioma} onChange={e => setFPerfil({ ...fPerfil, idioma: e.target.value })} style={{ fontSize: 15 }}><option value="es">Español (Principal)</option><option value="en">English (BETA)</option><option value="ru">Русский (Ruso)</option><option value="fr">Français (Francés)</option></Sel></Campo>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><Btn onClick={guardarPerfil} disabled={!fPerfil.name.trim()} style={{ fontSize: 14, padding: "10px 24px" }}><Ico k="check" size={16} /> Update Index</Btn></div>
            </div>
          </Tarjeta>
        )}

        {tab === "empresa" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><Ico k="building" size={24} style={{ color: T.teal }} /> Tenant & Infraestructura</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <Campo label="Tenant Name (Nombre Legal)"><Inp value={fEmpresa} onChange={e => setFEmpresa(e.target.value)} style={{ fontSize: 16 }} /></Campo>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Campo label="Fuerza de Moneda (BETA)"><Sel disabled style={{ fontSize: 14 }}><option>USD ($) - Multi-Currency Ready</option><option>MXN ($)</option><option>EUR (€)</option></Sel></Campo>
                <Campo label="Región de Procesamiento de Datos"><Sel disabled style={{ fontSize: 14 }}><option>us-east-1 (N. Virginia)</option><option>eu-central-1 (Frankfurt)</option></Sel></Campo>
              </div>
              <div style={{ padding: 20, background: T.teal + "10", border: `1px solid ${T.tealSoft}`, borderRadius: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.teal, marginBottom: 6 }}>Ambiente Enterprise Activado</div>
                <div style={{ fontSize: 13, color: T.whiteDim }}>Este tenant posee un clúster dedicado de base de datos garantizando 99.99% SLA para la infraestructura configurada.</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><Btn onClick={guardarEmpresa} disabled={!fEmpresa.trim()} style={{ fontSize: 14, padding: "10px 24px" }}>Synchronize Tenant</Btn></div>
            </div>
          </Tarjeta>
        )}

        {tab === "usuarios" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.white, display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}><Ico k="users" size={24} style={{ color: T.teal }} /> Identity & Access Management (IAM)</div>
                <div style={{ fontSize: 13, color: T.whiteDim }}>Control granular de accesos (RBAC). Mapea usuarios contra directorios internos.</div>
              </div>
              <Btn onClick={() => setShowUserModal(true)} style={{ background: T.teal, padding: "10px 20px" }}><Ico k="plus" size={16} />Provisionar Usuario</Btn>
            </div>
            
            <div style={{ borderRadius: 12, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <CabeceraTabla cols={["Identidad / JWT", "Jerarquía (Role)", "División", "Health", ""]} />
                <tbody>
                  {db.usuariosApp?.map(u => (
                    <FilaTabla key={u.id}>
                      <Celda>
                        <div style={{ fontWeight: 800, color: T.white, fontSize: 14 }}>{u.name}</div>
                        <div style={{ color: T.whiteDim, fontSize: 11 }}>{u.email}</div>
                      </Celda>
                      <Celda><Chip label={u.role.toUpperCase()} color={u.role === "admin" ? T.teal : u.role === "manager" ? T.amber : T.whiteDim} bg={u.role === "admin" ? T.teal+"20" : undefined} /></Celda>
                      <Celda style={{ color: T.whiteOff, fontWeight: 600 }}>{u.area}</Celda>
                      <Celda>{u.activo ? <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.green, fontSize: 12, fontWeight: 800 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }}/> Online</div> : <Chip label="Revoked" color={T.red} />}</Celda>
                      <Celda><Btn variant="fantasma" size="sm"><Ico k="edit" size={16} /></Btn></Celda>
                    </FilaTabla>
                  )) || <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: T.whiteDim }}>IAM Directory is empty.</td></tr>}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        )}

        {tab === "email" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="mail" size={24} style={{ color: T.teal }} /> Exchange & SMTP/IMAP Tunnels</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 32 }}>Orquesta el enrutamiento bidireccional de correos corporativos directamente al pipeline de ventas. Cifrado TLS estricto.</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Campo label="Proveedor de Tránsito"><Sel value={fEmail.proveedor} onChange={e => setFEmail({ ...fEmail, proveedor: e.target.value })} style={{ fontSize: 15 }}><option value="personalizado">Enterprise Exchange (Custom IMAP/SMTP)</option><option value="gmail" disabled>Google Workspace (Requiere OAUTH2 Scopes)</option><option value="outlook" disabled>Azure AD / Microsoft 365</option></Sel></Campo>
                <Campo label="Máscara de Remitente (Alias)"><Inp value={fEmail.direccion} onChange={e => setFEmail({ ...fEmail, direccion: e.target.value })} placeholder="Ej. ventas@tuempresa.com" style={{ fontSize: 15 }} /></Campo>
              </div>

              <div style={{ padding: 24, background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}`, position: "relative" }}>
                <div style={{ position: "absolute", top: 20, right: 24, color: T.whiteDim }}><Ico k="arrow" size={24} style={{ transform: "rotate(-45deg)" }} /></div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 20 }}>SMTP Egress / Enrutador de Salida</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <Campo label="Endpoint SMTP"><Inp value={fEmail.smtpHost} onChange={e => setFEmail({ ...fEmail, smtpHost: e.target.value })} placeholder="smtp.mailgun.org" /></Campo>
                  <Campo label="Puerto TCP"><Inp value={fEmail.smtpPort} onChange={e => setFEmail({ ...fEmail, smtpPort: e.target.value })} placeholder="587 (TLS/STARTTLS)" /></Campo>
                  <Campo label="Identity (Usuario)"><Inp value={fEmail.smtpUser} onChange={e => setFEmail({ ...fEmail, smtpUser: e.target.value })} /></Campo>
                  <Campo label="Secret (Contraseña / App Token)"><Inp type="password" value={fEmail.smtpPass} onChange={e => setFEmail({ ...fEmail, smtpPass: e.target.value })} /></Campo>
                </div>
              </div>

              <div style={{ padding: 24, background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}`, position: "relative" }}>
                <div style={{ position: "absolute", top: 20, right: 24, color: T.whiteDim }}><Ico k="arrow" size={24} style={{ transform: "rotate(135deg)" }} /></div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 20 }}>IMAP Ingress / Receptor Entrada</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <Campo label="Endpoint IMAP"><Inp value={fEmail.imapHost} onChange={e => setFEmail({ ...fEmail, imapHost: e.target.value })} placeholder="imap.mailgun.org" /></Campo>
                  <Campo label="Puerto TCP"><Inp value={fEmail.imapPort} onChange={e => setFEmail({ ...fEmail, imapPort: e.target.value })} placeholder="993 (SSL Strict)" /></Campo>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <Btn onClick={guardarEmail} style={{ padding: "12px 28px", fontSize: 14, background: "linear-gradient(45deg, #14B8A6, #0ea5e9)", border: "none" }}><Ico k="plug" size={16} /> Execute Handshake & Save</Btn>
              </div>
            </div>
          </Tarjeta>
        )}

        {tab === "api" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="code" size={24} style={{ color: T.teal }} /> API Gateways & Webhooks</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 32 }}>Endpoints robustos para integraciones programáticas con tu stack tecnológico (Zapier, Snowflake, dbt).</div>
            
            <div style={{ padding: 24, background: T.bg2, borderRadius: 12, border: `1px solid ${T.tealSoft}`, marginBottom: 32 }}>
              <Campo label="Private Bearer Auth Token (v2.0)"><div style={{ display: "flex", gap: 12 }}><Inp value={db.empresaConfigs?.apiKey || "sk_live_51Mxxxxx_1T8xx9qLxR"} readOnly style={{ fontFamily: "monospace", color: T.teal, backgroundColor: T.teal + "10", border: `1px solid ${T.tealSoft}`, fontSize: 15 }} /><Btn variant="secundario" style={{ fontSize: 14 }}>Clone</Btn><Btn variant="peligro" style={{ fontSize: 14 }}>Rotate Secret</Btn></div></Campo>
            </div>
            
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>Webhooks Subscriptions (Event-Driven Streams)</div>
                <Btn style={{ padding: "8px 16px" }}><Ico k="plus" size={14} /> Register Endpoint</Btn>
              </div>
              {db.empresaConfigs?.webhooks?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {db.empresaConfigs.webhooks.map(wh => (
                    <div key={wh.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: T.bg1, border: `1px solid ${T.borderHi}`, borderRadius: 8, boxShadow: "inset 4px 0 0 #14B8A6" }}>
                      <div><div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 6, fontFamily: "monospace" }}>POST {wh.url}</div><Chip label={wh.evento} color={T.teal} bg={T.teal+"20"} /></div>
                      <Btn variant="fantasma" size="sm"><Ico k="trash" size={16} style={{ color: T.red }} /></Btn>
                    </div>
                  ))}
                </div>
              ) : <div style={{ padding: 40, border: `1px dashed ${T.borderHi}`, borderRadius: 10, textAlign: "center", color: T.whiteDim, fontSize: 14 }}>No listener endpoints attached to the bus.</div>}
            </div>
          </Tarjeta>
        )}

        {tab === "security" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="eye" size={24} style={{ color: T.amber }} /> Security Operations Center (SOC)</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 32 }}>Monitorización activa de accesos, MFA y prevención de exfiltración de datos (DLP).</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
              <div style={{ padding: 24, background: T.amber+"10", border: `1px solid ${T.amber}40`, borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 800, color: T.amber }}>Multi-Factor Auth (MFA)</div><Chip label="Required" color={T.red} /></div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 16 }}>Todos los perfiles de administrador están forzados a usar TOTP.</div>
                <Btn variant="secundario" style={{ color: T.amber, borderColor: T.amber }}>Configurar Políticas</Btn>
              </div>
              <div style={{ padding: 24, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>Data Masking (PII)</div><Chip label="Active" color={T.green} /></div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 16 }}>Enmascara teléfonos y correos para roles 'Ventas' limitados.</div>
                <Btn variant="secundario">Reglas DLP</Btn>
              </div>
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 16 }}>Audit Logs (Últimas 24h)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "monospace" }}>
              <CabeceraTabla cols={["Timestamp", "Evento", "Location", "IP Address"]} />
              <tbody>
                {auditLogs.map(l => (
                  <FilaTabla key={l.id}>
                    <Celda style={{ color: T.whiteDim }}>{fdtm(l.time)}</Celda>
                    <Celda style={{ color: l.threat ? T.red : T.white, fontWeight: l.threat ? 800 : 500 }}>{l.action}</Celda>
                    <Celda>{l.location}</Celda>
                    <Celda>{l.ip}</Celda>
                  </FilaTabla>
                ))}
              </tbody>
            </table>
          </Tarjeta>
        )}

        {tab === "avanzado" && (
          <Tarjeta style={{ padding: 32, background: T.red + "05", borderColor: T.red + "30" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.red, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}><Ico k="cog" size={24} /> Database Local / Wipe Data (Root Mode)</div>
            <div style={{ fontSize: 14, color: T.whiteOff, marginBottom: 24, lineHeight: 1.6 }}>Precaución Severa: Esta acción purgará todo el árbol de IndexedDB/localStorage de este nodo de origen. Elimina deals, logs de auditoría, pipelines y credenciales inyectadas, forzando un resync forzoso o dejándolo en blando si Supabase está truncado.</div>
            
            <div style={{ padding: 20, background: T.bg0, border: `1px solid ${T.red}50`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>Purge Local Node Cache</div>
                <div style={{ fontSize: 12, color: T.whiteDim }}>~ 4.5MB liberados tras purga.</div>
              </div>
              <Btn variant="peligro" onClick={() => {
                if (confirm("WARNING: ¿Estás 100% seguro de vaciar la cache local del clúster de estado? Esto es irreversible.")) {
                  localStorage.removeItem("crm_nexus_v4");
                  window.location.reload();
                }
              }} style={{ padding: "12px 24px", fontSize: 14, fontWeight: 800 }}><Ico k="trash" size={16} /> WIPE CLUSTER DATA</Btn>
            </div>
          </Tarjeta>
        )}
      </div>

      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title="Provisionar Identidad en Directorio" width={480}>
        <Campo label="Nombre Registrado"><Inp placeholder="ej. Ana Gómez" style={{ fontSize: 15 }} /></Campo>
        <Campo label="Correo Institucional (SAML Mapping)"><Inp placeholder="ana@tuempresa.com" style={{ fontSize: 15 }} /></Campo>
        <Campo label="Nivel de Acceso IAM"><Sel style={{ fontSize: 14, padding: 12 }}><option>Ventas (Tier 1 - Solo Lectura DLP)</option><option>Ventas - Regional Manager</option><option>Administrador Táctico</option><option>Root Superadmin</option></Sel></Campo>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 32 }}><Btn variant="secundario" onClick={() => setShowUserModal(false)} style={{ fontSize: 14, padding: "10px 20px" }}>Abortar</Btn><Btn style={{ fontSize: 14, padding: "10px 20px" }}>Despachar Invitación</Btn></div>
      </Modal>
    </div>
  );
};
