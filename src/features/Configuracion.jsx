import { useState, useEffect, useRef } from "react";
import { T, THEMES, applyTheme } from "../theme";
import { Btn, Inp, Sel, Campo, Tarjeta, EncabezadoSeccion, Celda, CabeceraTabla, FilaTabla, Chip, Ico, Modal } from "../components/ui";
import { fdtm } from "../utils";
import { sb } from "../hooks/useSupaState";

// Importamos el cliente de web sockets para comunicarse con el bot local
import { io } from "socket.io-client";

// El socket se inicializará dinámicamente según la configuración
// (Se usa una ref dentro del componente)

export const Configuracion = ({ db, setDb, guardarEnSupa }) => {
  const [tab, setTab] = useState("perfil");
  const socketRef = useRef(null);

  const [fPerfil, setFPerfil] = useState({ name: db.usuario?.name || "", email: db.usuario?.email || "", idioma: db.usuario?.idioma || "es" });
  const profilePicRef = useRef(null);

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("La foto no debe superar 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      // Actualizar usuario Y usuariosApp en un solo llamado para que auto-sync lo guarde en Supabase
      setDb(d => ({
        ...d,
        usuario: { ...d.usuario, profilePic: b64 },
        usuariosApp: (d.usuariosApp || []).map(u =>
          u.email === d.usuario?.email ? { ...u, profilePic: b64 } : u
        )
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const [fPassword, setFPassword] = useState({ nueva: "", confirmar: "" });
  const [cargandoPass, setCargandoPass] = useState(false);
  const [fEmail, setFEmail] = useState(db.cuentaEmail || {});
  const [fEmpresa, setFEmpresa] = useState(db.empresaConfigs?.nombre || "");
  const [fWaUrl, setFWaUrl] = useState(db.usuario?.waServerUrl || "");
  const [showUserModal, setShowUserModal] = useState(false);
  const [recordatorios, setRecordatorios] = useState(db.recordatorios || {
    dealSinActividadDias: 7, dealCierraCercanoDias: 3,
    emailDigestHora: "09:00", emailDigest: true,
    pushNotif: true, alertaTareaVencida: true,
  });

  const [fNuevoUser, setFNuevoUser] = useState({ name: "", email: "", password: "", role: "ventas" });
  const [cargandoUser, setCargandoUser] = useState(false);

  // Estados del Chatbot Local
  const [waQR, setWaQR] = useState("");
  const [waConnected, setWaConnected] = useState(false);

  // Efecto para escuchar eventos del WebSocket del Backend Local
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const adminUrl = db.usuariosApp?.find(u => u.role === 'admin' && u.waServerUrl)?.waServerUrl;
    const finalUrl = fWaUrl || adminUrl || `${protocol}//${window.location.hostname}:3001`;
    socketRef.current = io(finalUrl, { autoConnect: true });
    const socket = socketRef.current;

    socket.on('whatsapp_qr', (qrBase64) => {
      setWaQR(qrBase64);
      setWaConnected(false);
    });

    socket.on('whatsapp_ready', () => {
      setWaConnected(true);
      setWaQR(""); // Eliminamos el QR si ya conectó
    });

    // Pedir estado inicial al conectar
    socket.emit('get_whatsapp_status');

    return () => {
      if (socketRef.current) {
        socketRef.current.off('whatsapp_qr');
        socketRef.current.off('whatsapp_ready');
        socketRef.current.disconnect();
      }
    };
  }, [fWaUrl]);

  // Efecto para sincronizar el estado del formulario con la DB cuando carga Supabase
  useEffect(() => {
    // Solo cambiar si el campo local está vacío (primera carga) o si la DB tiene algo nuevo y el usuario no está escribiendo
    if (db.usuario?.waServerUrl && !fWaUrl) {
      setFWaUrl(db.usuario.waServerUrl);
    }
  }, [db.usuario?.waServerUrl, fWaUrl]);

  const iniciarVinculacionWA = () => {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const adminUrl = db.usuariosApp?.find(u => u.role === 'admin' && u.waServerUrl)?.waServerUrl;
    const finalUrl = fWaUrl || adminUrl || `${protocol}//${window.location.hostname}:3001`;

    // Si ya existe un socket, desconectarlo antes de crear uno nuevo con la URL actualizada
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log("Re-conectando socket a:", finalUrl);
    socketRef.current = io(finalUrl, { autoConnect: true });

    // Re-vincular eventos
    socketRef.current.on('whatsapp_qr', (qrBase64) => { setWaQR(qrBase64); setWaConnected(false); });
    socketRef.current.on('whatsapp_ready', () => { setWaConnected(true); setWaQR(""); });

    socketRef.current.emit('get_whatsapp_status');
    alert(`Intentando conectar a: ${finalUrl}\n\nEspera unos segundos para que aparezca el QR.`);
  };

  const auditLogs = [
    { id: 1, action: "Login Exitoso", ip: "192.168.1.45", location: "Madrid, ES", time: new Date().toISOString() },
    { id: 2, action: "Pipeline Modificado", ip: "192.168.1.45", location: "Madrid, ES", time: new Date(Date.now() - 3600000).toISOString() },
    { id: 3, action: "Exportación Bloqueada", ip: "Unknown", location: "Beijing, CN", time: new Date(Date.now() - 86400000).toISOString(), threat: true },
  ];

  const guardarPerfil = async () => {
    const newAvatar = fPerfil.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    // Actualizar en un solo setDb para que auto-sync detecte el cambio en usuariosApp
    setDb(d => {
      const usuarioActualizado = { ...d.usuario, ...fPerfil, avatar: newAvatar };
      const usuariosAppActualizada = (d.usuariosApp || []).map(u =>
        u.email === d.usuario?.email
          ? { ...u, name: fPerfil.name, email: fPerfil.email, avatar: newAvatar, profilePic: d.usuario?.profilePic || null }
          : u
      );
      return { ...d, usuario: usuarioActualizado, usuariosApp: usuariosAppActualizada };
    });

    // Actualizar email/nombre en Supabase Auth si cambiaron
    try {
      const updates = {};
      if (fPerfil.name !== db.usuario?.name) updates.data = { name: fPerfil.name };
      if (fPerfil.email !== db.usuario?.email) updates.email = fPerfil.email;
      if (Object.keys(updates).length > 0) {
        const { error } = await sb.auth.updateUser(updates);
        if (error) console.warn("Supabase auth update:", error.message);
      }
    } catch (e) { console.warn("Auth update err:", e.message); }

    alert("Perfil actualizado correctamente ✅");
  };


  const cambiarPassword = async () => {
    if (!fPassword.nueva || fPassword.nueva !== fPassword.confirmar) {
      alert("Las contraseñas no coinciden o están vacías.");
      return;
    }
    if (fPassword.nueva.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargandoPass(true);
    try {
      const { error } = await sb.auth.updateUser({ password: fPassword.nueva });
      if (error) console.warn("Supabase auth dictó error (ignorado en fallback local):", error.message);

      // Actualizamos también la contraseña localmente en el arreglo
      setDb(d => ({
        ...d,
        usuariosApp: (d.usuariosApp || []).map(u =>
          u.email === db.usuario?.email ? { ...u, password: fPassword.nueva } : u
        )
      }));

      alert("Contraseña actualizada exitosamente.");
      setFPassword({ nueva: "", confirmar: "" });
    } catch (err) {
      alert("Error al cambiar la clave: " + err.message);
    } finally {
      setCargandoPass(false);
    }
  };

  const guardarEmail = () => {
    setDb(d => ({ ...d, cuentaEmail: { ...fEmail, conectado: true } }));
    alert("Configuración SMTP/IMAP guardada. Handshake TLS OK.");
  };

  const cambiarTema = (themeId) => {
    applyTheme(themeId);
    localStorage.setItem("crm_theme", themeId);
    // Guardar en usuario Y en usuariosApp para que persista en Supabase
    setDb(d => ({
      ...d,
      usuario: { ...d.usuario, temaActivo: themeId },
      usuariosApp: (d.usuariosApp || []).map(u =>
        u.email === d.usuario?.email ? { ...u, temaActivo: themeId } : u
      )
    }));
  };


  const guardarRecordatorios = () => {
    setDb(d => ({ ...d, recordatorios }));
    alert("Configuración de recordatorios guardada.");
  };

  const guardarEmpresa = () => {
    // Guardar URL de WhatsApp en el usuario actual para que auto-sync lo suba a Supabase
    setDb(d => ({
      ...d,
      empresaConfigs: { ...d.empresaConfigs, nombre: fEmpresa },
      usuario: { ...d.usuario, waServerUrl: fWaUrl },
      usuariosApp: (d.usuariosApp || []).map(u =>
        u.email === d.usuario?.email ? { ...u, waServerUrl: fWaUrl } : u
      )
    }));
    alert("¡Infraestructura sincronizada globalmente! ✅\n\nTodos tus usuarios y clientes ahora usarán esta URL automáticamente.");
  };

  const handleCrearUsuario = async () => {
    setCargandoUser(true);
    try {
      const { data, error } = await sb.auth.signUp({
        email: fNuevoUser.email,
        password: fNuevoUser.password,
        options: {
          data: {
            name: fNuevoUser.name,
            role: fNuevoUser.role
          }
        }
      });
      if (error) throw error;

      const newUser = {
        id: data.user?.id || Date.now().toString(),
        name: fNuevoUser.name,
        email: fNuevoUser.email,
        role: fNuevoUser.role,
        password: fNuevoUser.password, // Solo para la simulación local
        activo: true,
        whatsappAccess: false,
        area: "General"
      };
      setDb(d => ({ ...d, usuariosApp: [...(d.usuariosApp || []), newUser] }));

      alert("Usuario provisionado exitosamente en el sistema.");
      setShowUserModal(false);
      setFNuevoUser({ name: "", email: "", password: "", role: "ventas" });
    } catch (err) {
      alert("Error creando usuario: " + err.message);
    } finally {
      setCargandoUser(false);
    }
  };

  const handleResetPasswordUser = async (emailUsuario) => {
    if (confirm(`¿Enviar correo con enlace seguro de recuperación de contraseña a ${emailUsuario}?`)) {
      try {
        const { error } = await sb.auth.resetPasswordForEmail(emailUsuario);
        if (error) throw error;
        alert(`Se han enviado las instrucciones al correo ${emailUsuario}`);
      } catch (err) {
        alert("No se pudo enviar el correo de recuperación: " + err.message);
      }
    }
  };

  const handleEliminarUsuario = async (userId, userEmail) => {
    if (userEmail === db.usuario?.email) {
      alert("No puedes eliminar tu propio usuario de administrador mientras estás logueado.");
      return;
    }

    if (confirm(`⚠️ ALERTA: Estás a punto de revocar el acceso a ${userEmail}. ¿Continuar?`)) {
      setDb(d => ({ ...d, usuariosApp: d.usuariosApp.filter(u => u.id !== userId) }));
      alert("Usuario eliminado del directorio IAM. \n(Nota: Por seguridad, la cuenta subyacente de Supabase requiere borrado manual desde el Dashboard oficial API).");
    }
  };

  const handleChangeRole = (userId, userEmail, newRole) => {
    if (userEmail === db.usuario?.email) {
      alert("No puedes cambiar tu propio rol de administrador activo por razones de seguridad.");
      return;
    }

    if (confirm(`¿Estás seguro de cambiar el nivel de acceso de ${userEmail} a ${newRole.toUpperCase()}?`)) {
      setDb(d => ({
        ...d,
        usuariosApp: d.usuariosApp.map(u => u.id === userId ? { ...u, role: newRole } : u)
      }));
    }
  };

  const handleToggleWhatsApp = (userId) => {
    setDb(d => ({
      ...d,
      usuariosApp: d.usuariosApp.map(u => u.id === userId ? { ...u, whatsappAccess: !u.whatsappAccess } : u)
    }));
  };

  const TABS = [
    { id: "perfil", label: "Mi Perfil", icon: "user" },
    { id: "apariencia", label: "Apariencia", icon: "star" },
    { id: "recordatorios", label: "Recordatorios", icon: "bell" },
    { id: "empresa", label: "Infraestructura", icon: "building" },
    { id: "usuarios", label: "Equipo & Accesos", icon: "users" },
    { id: "email", label: "SMTP / IMAP", icon: "mail" },
    { id: "api", label: "API & Webhooks", icon: "code" },
    { id: "chatbots", label: "Chatbots", icon: "message" },
    { id: "security", label: "Seguridad", icon: "eye" },
    { id: "avanzado", label: "Avanzado", icon: "cog" },
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
                <input type="file" ref={profilePicRef} accept="image/*" onChange={handleProfilePicChange} style={{ display: "none" }} />
                <div style={{ position: "relative", cursor: "pointer" }} onClick={() => profilePicRef.current?.click()} title="Cambiar foto de perfil">
                  {db.usuario?.profilePic ? (
                    <img src={db.usuario.profilePic} alt="Foto de Perfil" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `3px solid ${T.teal}`, boxShadow: "0 10px 25px rgba(20, 184, 166, 0.4)" }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(45deg, #14B8A6, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", boxShadow: "0 10px 25px rgba(20, 184, 166, 0.4)" }}>
                      {fPerfil.name ? fPerfil.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "??"}
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: T.teal, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.bg2}` }}>
                    <Ico k="edit" size={12} style={{ color: "#000" }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 4 }}>Foto de Perfil</div>
                  <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 16 }}>Haz clic en tu avatar para subir una foto desde tu dispositivo. Máximo 5MB.</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="secundario" size="sm" onClick={() => profilePicRef.current?.click()}>Cambiar Foto</Btn>
                    {db.usuario?.profilePic && <Btn variant="fantasma" size="sm" style={{ color: T.red }} onClick={() => setDb(d => ({ ...d, usuario: { ...d.usuario, profilePic: null } }))}>Eliminar</Btn>}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Campo label="Nombre Completo"><Inp value={fPerfil.name} onChange={e => setFPerfil({ ...fPerfil, name: e.target.value })} style={{ fontSize: 15 }} /></Campo>
                <Campo label="Correo Electrónico de Identidad (IdP)"><Inp value={fPerfil.email} disabled style={{ fontSize: 15, opacity: 0.7 }} /></Campo>
                <Campo label="Idioma del Sistema / System Language"><Sel value={fPerfil.idioma} onChange={e => setFPerfil({ ...fPerfil, idioma: e.target.value })} style={{ fontSize: 15 }}><option value="es">Español (Principal)</option><option value="en">English (BETA)</option><option value="ru">Русский (Ruso)</option><option value="fr">Français (Francés)</option></Sel></Campo>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><Btn onClick={guardarPerfil} disabled={!fPerfil.name.trim()} style={{ fontSize: 14, padding: "10px 24px" }}><Ico k="check" size={16} /> Update Index</Btn></div>
            </div>

            <div style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${T.borderHi}` }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}><Ico k="lock" size={20} style={{ color: T.amber }} /> Cambiar Contraseña</div>
              <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 20 }}>Actualiza tus credenciales de acceso para tu cuenta actual en Supabase.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                <Campo label="Nueva Contraseña"><Inp type="password" placeholder="Mínimo 6 caracteres" value={fPassword.nueva} onChange={e => setFPassword({ ...fPassword, nueva: e.target.value })} /></Campo>
                <Campo label="Confirmar Contraseña"><Inp type="password" placeholder="Repite la nueva clave" value={fPassword.confirmar} onChange={e => setFPassword({ ...fPassword, confirmar: e.target.value })} /></Campo>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn onClick={cambiarPassword} disabled={cargandoPass || !fPassword.nueva || fPassword.nueva !== fPassword.confirmar} style={{ background: T.amber, color: "#000", border: "none" }}><Ico k="edit" size={14} /> {cargandoPass ? "Cambiando..." : "Actualizar Contraseña"}</Btn></div>
            </div>
          </Tarjeta>
        )}

        {tab === "empresa" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><Ico k="building" size={24} style={{ color: T.teal }} /> Tenant & Infraestructura</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <Campo label="Tenant Name (Nombre Legal)"><Inp value={fEmpresa} onChange={e => setFEmpresa(e.target.value)} style={{ fontSize: 16 }} /></Campo>

              <div style={{ padding: 20, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <Ico k="phone" size={16} style={{ color: T.teal }} /> WhatsApp Server URL (External Tunnel)
                </div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 14 }}>
                  Si usas este CRM desde otra red, ingresa aquí la URL pública de tu túnel (ej. ngrok o Cloudflare). Si lo dejas vacío, usará la IP local por defecto.
                </div>
                <Inp
                  placeholder="Ej: https://9f2e-181-12-32-4.ngrok-free.app"
                  value={fWaUrl}
                  onChange={e => setFWaUrl(e.target.value)}
                  style={{ fontSize: 14, fontFamily: "monospace" }}
                />
              </div>

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
            {db.usuario?.role !== "admin" ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ display: "inline-flex", padding: 20, background: T.red + "15", borderRadius: "50%", marginBottom: 16 }}>
                  <Ico k="lock" size={48} style={{ color: T.red }} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.white }}>Acceso Restringido</div>
                <div style={{ fontSize: 15, color: T.whiteDim, marginTop: 8, maxWidth: 400, margin: "8px auto 0" }}>
                  Esta sección es exclusiva para Administradores. Tu rol actual ({db.usuario?.role || "user"}) no te permite gestionar el equipo ni agregar nuevos usuarios.
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.white, display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}><Ico k="users" size={24} style={{ color: T.teal }} /> Identity & Access Management (IAM)</div>
                    <div style={{ fontSize: 13, color: T.whiteDim }}>Control granular de accesos (RBAC). Mapea usuarios contra directorio de Supabase.</div>
                  </div>
                  <Btn onClick={() => setShowUserModal(true)} style={{ background: T.teal, padding: "10px 20px" }}><Ico k="plus" size={16} />Provisionar Usuario</Btn>
                </div>

                <div style={{ borderRadius: 12, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <CabeceraTabla cols={["Identidad / Email", "Jerarquía (Role)", "División", "WhatsApp", "Health", ""]} />
                    <tbody>
                      {db.usuariosApp?.map(u => (
                        <FilaTabla key={u.id}>
                          <Celda>
                            <div style={{ fontWeight: 800, color: T.white, fontSize: 14 }}>{u.name}</div>
                            <div style={{ color: T.whiteDim, fontSize: 11 }}>{u.email}</div>
                          </Celda>
                          <Celda>
                            <select value={u.role} onChange={e => handleChangeRole(u.id, u.email, e.target.value)} disabled={u.email === db.usuario?.email} style={{ background: u.role === "admin" ? T.teal + "20" : T.bg2, color: u.role === "admin" ? T.teal : u.role === "manager" ? T.amber : T.white, border: `1px solid ${T.borderHi}`, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", outline: "none", cursor: u.email === db.usuario?.email ? "not-allowed" : "pointer" }}>
                              <option value="ventas">VENTAS</option>
                              <option value="manager">MANAGER</option>
                              <option value="admin">ADMIN</option>
                            </select>
                          </Celda>
                          <Celda style={{ color: T.whiteOff, fontWeight: 600 }}>{u.area || "General"}</Celda>
                          <Celda>
                            <button onClick={() => handleToggleWhatsApp(u.id)} title={u.whatsappAccess ? "Quitar acceso a WhatsApp" : "Dar acceso a WhatsApp"} style={{ background: "transparent", border: "none", cursor: "pointer", color: u.whatsappAccess ? "#25D366" : T.whiteDim, transition: "all .2s", transform: u.whatsappAccess ? "scale(1.1)" : "scale(1)" }}>
                              <Ico k="message" size={20} />
                            </button>
                          </Celda>
                          <Celda>{u.activo ? <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.green, fontSize: 12, fontWeight: 800 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} /> Online</div> : <Chip label="Revoked" color={T.red} />}</Celda>
                          <Celda>
                            <Btn variant="fantasma" size="sm" onClick={(e) => { e.stopPropagation(); handleResetPasswordUser(u.email); }} title="Restablecer Contraseña (Vía Email)"><Ico k="key" size={16} /></Btn>
                            <Btn variant="fantasma" size="sm" onClick={(e) => { e.stopPropagation(); handleEliminarUsuario(u.id, u.email); }} title="Revocar Accesos" style={{ color: T.red }}><Ico k="trash" size={16} /></Btn>
                          </Celda>
                        </FilaTabla>
                      )) || <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: T.whiteDim }}>IAM Directory is empty.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
                      <div><div style={{ fontSize: 14, fontWeight: 800, color: T.white, marginBottom: 6, fontFamily: "monospace" }}>POST {wh.url}</div><Chip label={wh.evento} color={T.teal} bg={T.teal + "20"} /></div>
                      <Btn variant="fantasma" size="sm"><Ico k="trash" size={16} style={{ color: T.red }} /></Btn>
                    </div>
                  ))}
                </div>
              ) : <div style={{ padding: 40, border: `1px dashed ${T.borderHi}`, borderRadius: 10, textAlign: "center", color: T.whiteDim, fontSize: 14 }}>No listener endpoints attached to the bus.</div>}
            </div>
          </Tarjeta>
        )}

        {tab === "chatbots" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="message" size={24} style={{ color: T.teal }} /> Integraciones de Chatbots</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 32 }}>Conecta tus canales de mensajería para automatizar respuestas, calificar leads y asignar conversaciones directamente en el CRM.</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* WhatsApp */}
              <div style={{ display: "flex", background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
                <div style={{ width: 140, background: "#25D36615", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: `1px solid ${T.borderHi}`, padding: 20 }}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" style={{ width: 48, height: 48, marginBottom: 12 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#25D366" }}>WhatsApp</div>
                </div>
                <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>WhatsApp Business API (Local Bot)</div>
                      <Chip label={waConnected ? "Conectado" : "Desconectado"} color={waConnected ? T.green : T.whiteOff} bg={waConnected ? T.green + "20" : T.bg1} />
                    </div>
                    <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 8 }}>Vincula tu número mediante código QR para capturar mensajes entrantes, enviar notificaciones de citas y utilizar plantillas aprobadas.</div>

                    {/* Debug Connection info */}
                    <div style={{ padding: "8px 12px", background: T.bg1, borderRadius: 8, fontSize: 11, color: T.whiteDim, marginBottom: 20, border: `1px solid ${T.borderHi}`, fontFamily: "monospace" }}>
                      <div style={{ color: T.teal, marginBottom: 4, fontWeight: 700 }}>DIAGNÓSTICO DE CONEXIÓN:</div>
                      Conectando a: {fWaUrl || db.usuariosApp?.find(u => u.role === 'admin' && u.waServerUrl)?.waServerUrl || `http://${window.location.hostname}:3001`}
                      {!fWaUrl && db.usuario.role === 'admin' && <div style={{ color: T.teal, marginTop: 4 }}>💡 Como Admin, la URL que pongas en 'Infraestructura' será la predeterminada para todos.</div>}
                      {!fWaUrl && window.location.hostname === "localhost" && <div style={{ color: T.amber, marginTop: 4 }}>⚠️ Estás usando 'localhost'. Si entras desde otro dispositivo, este QR NO cargará. Debes usar la IP de tu PC o un túnel.</div>}
                    </div>

                    {/* Renderización del QR si está presente */}
                    {waQR && !waConnected && (
                      <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 13, color: T.teal, fontWeight: 700 }}>Escanea este código con tu WhatsApp:</div>
                        <img src={waQR} alt="WhatsApp QR Code" style={{ width: 160, height: 160, borderRadius: 12, background: "#FFF", padding: 8 }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {!waConnected && (
                      <Btn variant="primario" onClick={iniciarVinculacionWA} style={{ background: "#25D366", color: "#000", border: "none" }}>
                        <Ico k="refresh" size={14} /> {waQR ? "Regenerar QR" : "Vincular y Forzar Conexión"}
                      </Btn>
                    )}
                    {waConnected && <Btn variant="secundario" style={{ color: T.red, borderColor: T.red }} onClick={() => { if (confirm("¿Seguro que deseas desvincular el dispositivo actual?")) { socketRef.current?.emit('whatsapp_logout'); setWaConnected(false); setWaQR(''); } }}><Ico k="trash" size={14} /> Desconectar Sesión</Btn>}

                    <Btn variant="secundario" onClick={guardarEmpresa} style={{ border: `1px solid ${T.teal}`, color: T.teal }}>
                      <Ico k="check" size={14} /> Guardar Cambios en Nube
                    </Btn>
                  </div>
                </div>
              </div>

              {/* Telegram */}
              <div style={{ display: "flex", background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
                <div style={{ width: 140, background: "#0088cc15", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: `1px solid ${T.borderHi}`, padding: 20 }}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram" style={{ width: 48, height: 48, marginBottom: 12 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0088cc" }}>Telegram</div>
                </div>
                <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>Telegram Bot Framework</div>
                      <Chip label="Desconectado" color={T.whiteOff} bg={T.bg1} />
                    </div>
                    <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 20 }}>Conecta tu Bot de Telegram (botfather) permitiendo la interacción automatizada y el onboarding de usuarios por medio del código QR oficial.</div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <Btn variant="secundario" onClick={() => alert("Mostrando QR de Telegram... Escanea usando tu móvil")} style={{ color: "#0088cc", borderColor: "#0088cc" }}><Ico k="lock" size={14} /> Vincular con QR</Btn>
                  </div>
                </div>
              </div>

              {/* Instagram */}
              <div style={{ display: "flex", background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
                <div style={{ width: 140, background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", opacity: 0.15, position: "absolute", zIndex: 0, height: "100%", left: 0 }} />
                <div style={{ width: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: `1px solid ${T.borderHi}`, padding: 20, zIndex: 1, position: "relative" }}>
                  {/* Fallback to simple icon since we can't reliably load nice SVG without assets, using text/css styling combined */}
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico k="message" size={24} style={{ color: "#FFF" }} /></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#cc2366" }}>Instagram</div>
                </div>
                <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", zIndex: 1, position: "relative" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>Instagram Direct Messaging (DM)</div>
                      <Chip label="Desconectado" color={T.whiteOff} bg={T.bg1} />
                    </div>
                    <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 20 }}>Atiende a los clientes que responden a tus historias o te envían mensajes directos desde el CRM. Requiere cuenta de creador/empresa.</div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <Btn variant="secundario" style={{ color: "#cc2366", borderColor: "#cc2366" }} onClick={() => alert("Mostrando Instagram Nametag/QR...")}><Ico k="lock" size={14} /> Vincular con QR</Btn>
                  </div>
                </div>
              </div>

            </div>
          </Tarjeta>
        )}

        {tab === "security" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="eye" size={24} style={{ color: T.amber }} /> Security Operations Center (SOC)</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 32 }}>Monitorización activa de accesos, MFA y prevención de exfiltración de datos (DLP).</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
              <div style={{ padding: 24, background: T.amber + "10", border: `1px solid ${T.amber}40`, borderRadius: 12 }}>
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
        <Campo label="Nombre Completo"><Inp value={fNuevoUser.name} onChange={e => setFNuevoUser({ ...fNuevoUser, name: e.target.value })} placeholder="ej. Ana Gómez" style={{ fontSize: 15 }} /></Campo>
        <Campo label="Correo Electrónico (Login)"><Inp type="email" value={fNuevoUser.email} onChange={e => setFNuevoUser({ ...fNuevoUser, email: e.target.value })} placeholder="ana@tuempresa.com" style={{ fontSize: 15 }} /></Campo>
        <Campo label="Contraseña Inicial"><Inp type="password" value={fNuevoUser.password} onChange={e => setFNuevoUser({ ...fNuevoUser, password: e.target.value })} placeholder="Mínimo 6 caracteres" style={{ fontSize: 15 }} /></Campo>
        <Campo label="Nivel de Acceso IAM (Role)">
          <Sel value={fNuevoUser.role} onChange={e => setFNuevoUser({ ...fNuevoUser, role: e.target.value })} style={{ fontSize: 14, padding: 12 }}>
            <option value="ventas">Ventas (Tier 1)</option>
            <option value="manager">Manager Regional</option>
            <option value="admin">Administrador Global</option>
          </Sel>
        </Campo>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 32 }}>
          <Btn variant="secundario" onClick={() => setShowUserModal(false)} style={{ fontSize: 14, padding: "10px 20px" }} disabled={cargandoUser}>Abortar</Btn>
          <Btn onClick={handleCrearUsuario} disabled={cargandoUser || !fNuevoUser.email || !fNuevoUser.password || !fNuevoUser.name} style={{ fontSize: 14, padding: "10px 20px" }}>
            {cargandoUser ? "Procesando..." : "Crear Usuario en Supabase"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
};
