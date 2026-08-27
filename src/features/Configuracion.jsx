import { useState, useEffect, useRef } from "react";
import { T, THEMES, applyTheme } from "../theme";
import { Btn, Inp, Sel, Campo, Tarjeta, EncabezadoSeccion, Celda, CabeceraTabla, FilaTabla, Chip, Ico, Modal, ConfirmModal, IndSupa } from "../components/ui";
import { fdtm, uuid, getApiUrl } from "../utils";
import { sb } from "../hooks/useSupaState";
import axios from "axios";
import { sileo } from "../utils/sileo";
import { checkPlanLimit, getPlanLimitError, PLAN_META, PLAN_LIMITS, getUsageStats } from "../utils/planes";

// Importamos el cliente de web sockets para comunicarse con el bot local
import { io } from "socket.io-client";

export const Configuracion = ({ db, setDb, guardarEnSupa, eliminarDeSupa, estadoSupa, esAdminGlobal }) => {
  const API_URL = getApiUrl(db);

  const [tab, setTab] = useState(localStorage.getItem("config_active_tab") || "perfil");
  const socketRef = useRef(null);

  useEffect(() => {
    // Limpiar el puente de navegación para que no persista en recargas manuales
    localStorage.removeItem("config_active_tab");
  }, []);

  const [fPerfil, setFPerfil] = useState({ name: db.usuario?.name || "", email: db.usuario?.email || "", idioma: db.usuario?.idioma || "es" });
  const profilePicRef = useRef(null);

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { sileo.error("La foto no debe superar 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      const updatedUser = { ...db.usuario, profilePic: b64 };
      guardarEnSupa("usuariosApp", updatedUser);
      setDb(d => ({ ...d, usuario: updatedUser }));
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const [fPassword, setFPassword] = useState({ nueva: "", confirmar: "" });
  const [cargandoPass, setCargandoPass] = useState(false);
  const [fEmail, setFEmail] = useState(db.email_accounts?.[0] || {
    email: "",
    password_hash: "",
    provider: "custom",
    smtp_host: "smtp.mailgun.org",
    smtp_port: 587,
    imap_host: "imap.mailgun.org",
    imap_port: 993
  });
  const [probandoEmail, setProbandoEmail] = useState(false);
  const [fEmpresa, setFEmpresa] = useState(db.empresaConfigs?.nombre || "");
  const [fWaUrl, setFWaUrl] = useState(""); 
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

  // Estados API & Webhooks
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showDelEmailModal, setShowDelEmailModal] = useState(false);
  const [selectedEmailAcc, setSelectedEmailAcc] = useState(null);
  const [fWebhook, setFWebhook] = useState({ url: "", evento: "deal.ganado" });
  const [fOrg, setFOrg] = useState({ nombre: "", slug: "" });
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState(null);
  const [cargandoApi, setCargandoApi] = useState(false);
  const [cargandoOrg, setCargandoOrg] = useState(false);

  const confirmSwitch = (orgId) => {
    setTargetOrgId(orgId);
    setShowSwitchModal(true);
  };
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [orgAuditada, setOrgAuditada] = useState(null);


  const [waInstancesStatus, setWaInstancesStatus] = useState({}); // { [accId]: { qr, ready } }
  const [showManualEmail, setShowManualEmail] = useState(false);
  const [showWAModal, setShowWAModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentAccountQR, setCurrentAccountQR] = useState(null);

  const [fWAAccount, setFWAAccount] = useState({ nombre: "", acceso: "todos" });

  useEffect(() => {
    const finalUrl = fWaUrl || getApiUrl(db);
    socketRef.current = io(finalUrl, {
      transports: ['websocket'],
      autoConnect: true
    });
    const socket = socketRef.current;

    // Unirse a la sala de la organización para recibir eventos de todos los canales
    if (db.usuario?.org_id) {
        socket.emit('join_org', db.usuario.org_id);
    }

    socket.on('whatsapp_qr', ({ accountId, qr }) => {
      setWaInstancesStatus(prev => ({ ...prev, [accountId]: { ...prev[accountId], qr, ready: false } }));
    });

    socket.on('whatsapp_ready', ({ accountId }) => {
      setWaInstancesStatus(prev => ({ ...prev, [accountId]: { ...prev[accountId], qr: "", ready: true } }));
      sileo.success("✅ WhatsApp vinculado: " + accountId);
    });

    socket.on('whatsapp_disconnected', ({ accountId }) => {
      setWaInstancesStatus(prev => ({ ...prev, [accountId]: { ...prev[accountId], ready: false, qr: "" } }));
    });

    // Pedir estado de todas las cuentas conocidas
    db.whatsapp_accounts?.forEach(acc => {
        socket.emit('get_whatsapp_status', { accountId: acc.id });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [fWaUrl, db.usuario?.org_id, db.whatsapp_accounts?.length]);


  useEffect(() => {
    const orgActual = db.organizacion?.find(o => o.id === db.usuario?.org_id);
    const globalUrl = orgActual?.wa_server_url;
    if (globalUrl && !fWaUrl) {
      setFWaUrl(globalUrl);
    }
  }, [db.usuario?.org_id, db.organizacion]);

  const vincularWA = (accountId) => {
    if (socketRef.current) {
        const acc = (db.whatsapp_accounts || []).find(a => a.id === accountId);
        setCurrentAccountQR(acc);
        setShowQRModal(true);
        socketRef.current.emit('init_whatsapp_account', { accountId, orgId: db.usuario?.org_id });
        socketRef.current.emit('get_whatsapp_status', { accountId });
        sileo.info("⏳ Inicializando canal... El QR aparecerá en breve.");
    }
  };

  const desvincularWA = (accountId) => {
    if (!confirm("¿Cerrar sesión de WhatsApp en este canal?")) return;
    if (socketRef.current) {
      socketRef.current.emit('whatsapp_logout', { accountId });
    }
  };

  const agregarCuentaWA = async () => {
    if (!fWAAccount.nombre) return sileo.error("Nombre del canal requerido");
    const nueva = {
        id: uuid(),
        org_id: db.usuario?.org_id,
        user_id: db.usuario?.id,
        nombre: fWAAccount.nombre,
        acceso: fWAAccount.acceso,
        activo: true,
        estado: 'desconectado'
    };
    
    const { data: confirmado, error } = await guardarEnSupa("whatsapp_accounts", nueva);
    
    if (!error) {
        setShowWAModal(false);
        sileo.success("✅ Canal creado. Ahora puedes vincularlo.");
        setFWAAccount({ nombre: "", acceso: "todos" }); // Reset form
    } else {
        console.error("Error guardando cuenta WA:", error);
        sileo.error(`❌ Error: ${error?.message || "No se pudo guardar el canal"}`);
    }
  };

  const eliminarWhatsAppAcc = async (id) => {
    if (!confirm("¿Eliminar este canal permanentemente?")) return;
    await eliminarDeSupa("whatsapp_accounts", id);
  };


  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data === "oauth_success") {
        sileo.success("✅ Cuenta vinculada correctamente.");
        sb.from("email_accounts").select("*").eq("user_id", db.usuario?.id)
          .then(({ data }) => {
            if (data) setDb(prev => ({ ...prev, email_accounts: data }));
          });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [db.usuario?.id]);

  const handleConnectEmail = async (provider) => {
    const API_URL = getApiUrl(db);
    const userId = db.usuario?.id;
    const orgId = db.usuario?.org_id;
    if (!userId) return sileo.error("Error: No se detectó sesión de usuario.");
    const url = `${API_URL}/api/auth/${provider}?userId=${userId}&orgId=${orgId || ""}`;
    window.open(url, "Conectar Email", "width=600,height=700");
  };

  const syncEmails = async (accountId) => {
    setProbandoEmail(true);
    try {
      const acc = db.email_accounts?.find(a => a.id === accountId);
      if (!acc) return;
      await guardarEnSupa("email_accounts", { ...acc, last_sync: new Date().toISOString() });
      sileo.success("✅ Señal de sincronización enviada. Los correos deberían aparecer en 1 minuto.");
    } catch (e) {
      sileo.error("Error al solicitar sync: " + e.message);
    } finally {
      setProbandoEmail(false);
    }
  };

  const handleEliminarEmailAcc = async () => {
    if (!selectedEmailAcc) return;
    try {
      await eliminarDeSupa("email_accounts", selectedEmailAcc.id);
      // Eliminar también los emails asociados a esta cuenta en Supabase para no dejar huérfanos
      await sb.from("emails").delete().eq("account_id", selectedEmailAcc.id);

      setDb(d => ({ 
        ...d, 
        email_accounts: (d.email_accounts || []).filter(a => a.id !== selectedEmailAcc.id),
        emails: (d.emails || []).filter(e => e.account_id !== selectedEmailAcc.id)
      }));
      sileo.success("Cuenta de correo y sus correos desenlazados correctamente.");
      setShowDelEmailModal(false);
      setSelectedEmailAcc(null);
    } catch(e) {
      sileo.error("Error al eliminar la cuenta: " + e.message);
    }
  };

  const [conectando, setConectando] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const probarConexionHttp = async () => {
    setConectando(true);
    setTestResult(null);
    try {
      const adminUrl = db.usuariosApp?.find(u => u.role === 'admin' && u.waServerUrl)?.waServerUrl;
      const url = fWaUrl || adminUrl;
      if (!url) throw new Error("No hay URL configurada.");
      const res = await fetch(`${url}/health`);
      const data = await res.json();
      if (data.status === 'ok') {
        setTestResult({ success: true, msg: "¡Conexión exitosa! El servidor está respondiendo." });
        try {
          const qrRes = await fetch(`${url}/qr`);
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            if (qrData.qr) setWaQR(qrData.qr);
          }
        } catch (qrE) { console.log('QR no disponible por HTTP todavía'); }
        iniciarVinculacionWA();
      } else {
        throw new Error("Respuesta inválida del servidor.");
      }
    } catch (e) {
      setTestResult({ success: false, msg: e.message === "Failed to fetch" ? "Error de Red/CORS: El servidor no permitió la conexión o el túnel está caído." : `Error: ${e.message}` });
    } finally {
      setConectando(false);
    }
  };

  const auditLogs = [
    { id: 1, action: "Login Exitoso", ip: "192.168.1.45", location: "Madrid, ES", time: new Date().toISOString() },
    { id: 2, action: "Pipeline Modificado", ip: "192.168.1.45", location: "Madrid, ES", time: new Date(Date.now() - 3600000).toISOString() },
    { id: 3, action: "Exportación Bloqueada", ip: "Unknown", location: "Beijing, CN", time: new Date(Date.now() - 86400000).toISOString(), threat: true },
  ];

  const guardarPerfil = async () => {
    const newAvatar = fPerfil.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const usuarioActualizado = { ...db.usuario, ...fPerfil, avatar: newAvatar };
    const { error } = await guardarEnSupa("usuariosApp", usuarioActualizado);
    if (!error) {
       setDb(d => ({ ...d, usuario: usuarioActualizado }));
    }
    sileo.success("Perfil actualizado correctamente ✨");
  };


  const cambiarPassword = async () => {
    if (!fPassword.nueva || fPassword.nueva !== fPassword.confirmar) {
      sileo.error("Las contraseñas no coinciden o están vacías.");
      return;
    }
    if (fPassword.nueva.length < 6) {
      sileo.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setCargandoPass(true);
    try {
      const { error } = await sb.auth.updateUser({ password: fPassword.nueva });
      if (error) throw error;
      setDb(d => ({
        ...d,
        usuariosApp: (d.usuariosApp || []).map(u =>
          u.email === db.usuario?.email ? { ...u, password: fPassword.nueva } : u
        )
      }));
      sileo.success("Contraseña actualizada exitosamente.");
      setFPassword({ nueva: "", confirmar: "" });
    } catch (err) {
      sileo.error("Error al cambiar la clave: " + err.message);
    } finally {
      setCargandoPass(false);
    }
  };

  const cambiarTema = (themeId) => {
    applyTheme(themeId);
    localStorage.setItem("crm_theme", themeId);
    const updatedUser = { ...db.usuario, tema: themeId };
    guardarEnSupa("usuariosApp", updatedUser);
    setDb(d => ({ ...d, usuario: updatedUser }));
  };

  const guardarRecordatorios = () => {
    setDb(d => ({ ...d, recordatorios }));
    sileo.success("Configuración de recordatorios guardada.");
  };

  const guardarEmpresa = async () => {
    const orgActual = db.organizacion?.find(o => o.id === db.usuario?.org_id);
    if (!orgActual) return sileo.error("No se pudo identificar la organización activa.");
    const payloadOrg = { ...orgActual, nombre: fEmpresa, wa_server_url: fWaUrl };
    await guardarEnSupa("organizacion", payloadOrg);
    setDb(d => ({
      ...d,
      organizacion: d.organizacion.map(o => o.id === orgActual.id ? payloadOrg : o),
      empresaConfigs: { ...d.empresaConfigs, nombre: fEmpresa }
    }));
    sileo.success({ title: "¡Estructura sincronizada!", description: "Cambios aplicados correctamente." });
  };

  const handleCrearUsuario = async () => {
    if (!fNuevoUser.name.trim() || !fNuevoUser.email.trim() || !fNuevoUser.password.trim()) {
      sileo.error("Completa todos los campos antes de continuar.");
      return;
    }
    if (fNuevoUser.password.length < 6) {
      sileo.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (fNuevoUser.email.toLowerCase() === db.usuario?.email.toLowerCase()) {
      sileo.error("No puedes crear un usuario con tu mismo correo.");
      return;
    }
    if (!db.usuario?.org_id) {
      sileo.error("Error: No se pudo identificar la organización activa.");
      return;
    }
    setCargandoUser(true);
    try {
      const initials = fNuevoUser.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      let newUser = null;

      // ── ESTRATEGIA 1: Servidor admin (no toca la sesión) ─────────────────
      let viaServer = false;
      try {
        const API_URL = getApiUrl(db);
        const res = await fetch(`${API_URL}/api/admin/create-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fNuevoUser.name,
            email: fNuevoUser.email,
            password: fNuevoUser.password,
            role: fNuevoUser.role,
            org_id: db.usuario.org_id
          })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error del servidor");
        newUser = result.user;
        viaServer = true;
      } catch (serverErr) {
        // El servidor no está corriendo — usar fallback con restauración de sesión
        console.warn("[Crear Usuario] Servidor no disponible, usando fallback:", serverErr.message);
      }

      // ── ESTRATEGIA 2 (fallback): signUp + restaurar sesión del admin ─────
      if (!viaServer) {
        // 1. Guardar tokens del admin ANTES de hacer signUp
        const { data: { session: adminSession } } = await sb.auth.getSession();

        // 2. Crear cuenta (esto momentáneamente cambia la sesión)
        const { data, error } = await sb.auth.signUp({
          email: fNuevoUser.email,
          password: fNuevoUser.password,
          options: { data: { name: fNuevoUser.name, role: fNuevoUser.role, org_id: db.usuario.org_id } }
        });
        if (error) throw error;

        // 3. Restaurar INMEDIATAMENTE la sesión del administrador
        if (adminSession?.access_token && adminSession?.refresh_token) {
          await sb.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token
          });
        }

        // 4. Guardar perfil en usuariosApp
        newUser = {
          id: data.user?.id,
          name: fNuevoUser.name,
          email: fNuevoUser.email,
          role: fNuevoUser.role,
          avatar: initials,
          org_id: db.usuario.org_id,
          activo: true,
          creado: new Date().toISOString()
        };
        const { error: sError } = await guardarEnSupa("usuariosApp", newUser);
        if (sError) throw new Error("Perfil no guardado: " + sError.message);
      }

      // ── ÉXITO ─────────────────────────────────────────────────────────────
      setDb(d => ({ ...d, usuariosApp: [...(d.usuariosApp || []), newUser] }));
      sileo.success({
        title: "✅ Usuario creado exitosamente",
        description: `${fNuevoUser.name} ya puede ingresar al CRM con su email y contraseña.`
      });
      setShowUserModal(false);
      setFNuevoUser({ name: "", email: "", password: "", role: "ventas" });

    } catch (err) {
      sileo.error("Error al crear usuario: " + err.message);
    } finally {
      setCargandoUser(false);
    }
  };

  const handleResetPasswordUser = async (emailUsuario) => {
    if (confirm(`¿Enviar correo con enlace seguro de recuperación de contraseña a ${emailUsuario}?`)) {
      try {
        const { error } = await sb.auth.resetPasswordForEmail(emailUsuario, {
          redirectTo: window.location.origin + window.location.pathname,
        });
        if (error) throw error;
        sileo.success(`Se han enviado las instrucciones al correo ${emailUsuario}`);
      } catch (err) {
        sileo.error("No se pudo enviar el correo de recuperación: " + err.message);
      }
    }
  };

  const handleEliminarUsuario = async (userId, userEmail) => {
    if (userEmail === db.usuario?.email) {
      sileo.error("No puedes eliminar tu propio usuario de administrador.");
      return;
    }
    if (confirm(`⚠️ ALERTA: Estás a punto de revocar el acceso a ${userEmail}. ¿Continuar?`)) {
      await eliminarDeSupa("usuariosApp", userId);
      sileo.success("Usuario eliminado del directorio IAM.");
    }
  };

  const handleChangeRole = (userId, userEmail, newRole) => {
    if (userEmail === db.usuario?.email) {
      sileo.error("No puedes cambiar tu propio rol.");
      return;
    }
    if (confirm(`¿Estás seguro de cambiar el nivel de acceso de ${userEmail} a ${newRole.toUpperCase()}?`)) {
      const u = db.usuariosApp.find(x => x.id === userId);
      if (u) guardarEnSupa("usuariosApp", { ...u, role: newRole });
    }
  };

  const handleToggleWhatsApp = (userId) => {
    const u = db.usuariosApp.find(x => x.id === userId);
    if (u) guardarEnSupa("usuariosApp", { ...u, whatsappAccess: !u.whatsappAccess });
  };

  const rotateApiToken = async () => {
    const orgId = db.usuario?.org_id;
    if (!orgId) return sileo.error("Error: No se encontró organización vinculada.");
    if (!confirm("⚠️ ¿Deseas rotar el secreto de API?")) return;
    setCargandoApi(true);
    const newToken = "sk_dev_" + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
    const payload = { id: "api_cfg_" + orgId, api_token: newToken, org_id: orgId, creado: new Date().toISOString() };
    try {
      await guardarEnSupa("api_settings", payload);
      setDb(d => ({ ...d, api_settings: [payload] }));
      sileo.success("✅ Token rotado exitosamente!");
    } catch (e) {
      sileo.error("Error crítico: " + e.message);
    } finally {
      setCargandoApi(false);
    }
  };

  const copiarToken = () => {
    const token = db.api_settings?.[0]?.api_token || "";
    navigator.clipboard.writeText(token);
    sileo.success("Token copiado 📋");
  };

  const registrarWebhook = async () => {
    if (!fWebhook.url.startsWith("http")) return sileo.error("URL de webhook no válida.");
    const nuevo = { ...fWebhook, id: "wh_" + uid(), creado: new Date().toISOString(), activo: true };
    await guardarEnSupa("webhook_subscriptions", nuevo);
    setDb(d => ({ ...d, webhook_subscriptions: [...(d.webhook_subscriptions || []), nuevo] }));
    setShowWebhookModal(false);
    setFWebhook({ url: "", evento: "deal.ganado" });
  };

  const eliminarWebhook = async (id) => {
    if (!confirm("¿Eliminar este webhook?")) return;
    await sb.from("webhook_subscriptions").delete().eq("id", id);
    setDb(d => ({ ...d, webhook_subscriptions: d.webhook_subscriptions.filter(w => w.id !== id) }));
  };

  const handleCrearOrg = async () => {
    if (!fOrg.nombre || !fOrg.slug) return sileo.error("Completa todos los campos");
    setCargandoOrg(true);
    const nuevaId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : uid();
    const nueva = { id: nuevaId, ...fOrg, creado_at: new Date().toISOString() };
    try {
      const { error } = await guardarEnSupa("organizacion", nueva);
      if (!error) {
        setShowOrgModal(false);
        setFOrg({ nombre: "", slug: "" });
        sileo.success("Organización creada ✅");
      }
    } catch (e) {
      sileo.error("Error: " + e.message);
    } finally {
      setCargandoOrg(false);
    }
  };

  const handleEliminarOrg = async (id, nombre) => {
    if (id === '00000000-0000-0000-0000-000000000001') return sileo.error("No se puede eliminar la principal.");
    if (!confirm(`⚠️ ¿Borrar organización "${nombre}"?`)) return;
    setCargandoOrg(true);
    try {
      const { error } = await sb.from("organizacion").delete().eq("id", id);
      if (error) {
        if (error.message.includes("foreign key constraint")) {
           throw new Error("No puedes borrar esta empresa porque aún tiene usuarios, contactos o datos vinculados. Debes vaciarla primero.");
        }
        throw error;
      }
      setDb(d => ({ ...d, organizacion: d.organizacion.filter(o => o.id !== id) }));
      sileo.success("Empresa borrada permanentemente.");
    } catch (e) {
      sileo.error("Error: " + e.message);
    } finally {
      setCargandoOrg(false);
    }
  };

  const handleCambiarPlan = async (orgId, nuevoPlan) => {
    if (!confirm(`¿Cambiar el plan de esta organización a ${nuevoPlan.toUpperCase()}?`)) return;
    try {
      const org = db.organizacion.find(o => o.id === orgId);
      if (org) {
        setDb(prev => ({ ...prev, organizacion: prev.organizacion.map(o => o.id === orgId ? { ...o, plan: nuevoPlan } : o) }));
        await guardarEnSupa("organizacion", { ...org, plan: nuevoPlan });
        sileo.success(`Plan actualizado a ${nuevoPlan.toUpperCase()}`);
      }
    } catch (e) {
      sileo.error("Error cambiando plan: " + e.message);
    }
  };

  const handleSwitchFinal = async () => {
    if (!targetOrgId) return;
    try {
      const userUpdate = { ...db.usuario, org_id: targetOrgId };
      const { error } = await guardarEnSupa("usuariosApp", userUpdate);
      if (!error) {
        localStorage.setItem("crm_usuario_activo", JSON.stringify(userUpdate));
        window.location.reload();
      }
    } catch (e) {
      sileo.error("Error: " + e.message);
    } finally {
      setShowSwitchModal(false);
    }
  };

  const [showCheckout, setShowCheckout] = useState(false);
  const [targetPlan, setTargetPlan] = useState(null);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [cardData, setCardData] = useState({ numero: "", nombre: "", expiry: "", cvv: "" });

  const handleUpgrade = async () => {
    if (!targetPlan) return;
    setProcesandoPago(true);
    // Simulamos el proceso de pago (2.5s)
    await new Promise(r => setTimeout(r, 2500));
    try {
      const org = db.organizacion.find(o => o.id === db.usuario?.org_id);
      if (org) {
        const orgActualizada = { ...org, plan: targetPlan.id };
        await guardarEnSupa("organizacion", orgActualizada);
        setDb(prev => ({ ...prev, organizacion: prev.organizacion.map(o => o.id === org.id ? orgActualizada : o) }));
        setPagoExitoso(true);
        setTimeout(() => { setShowCheckout(false); setPagoExitoso(false); setProcesandoPago(false); setTargetPlan(null); setCardData({ numero: "", nombre: "", expiry: "", cvv: "" }); }, 3000);
        sileo.success({ title: `🎉 ¡Bienvenido a ${targetPlan.nombre}!`, description: "Tu plan fue activado. Los nuevos límites ya están disponibles." });
      }
    } catch (e) {
      sileo.error("Error al actualizar el plan: " + e.message);
      setProcesandoPago(false);
    }
  };

  const TABS = [
    { id: "perfil", label: "Mi Perfil", icon: "user" },
    { id: "apariencia", label: "Apariencia", icon: "star" },
    { id: "recordatorios", label: "Recordatorios", icon: "bell" },
    { id: "suscripcion", label: "Suscripción", icon: "credit-card" },
    esAdminGlobal && { id: "empresa", label: "Infraestructura", icon: "building" },
    { id: "usuarios", label: "Equipo & Accesos", icon: "users" },
    esAdminGlobal && { id: "organizaciones", label: "Organizaciones", icon: "grid" },
    { id: "email", label: "SMTP / IMAP", icon: "mail" },
    { id: "wa_channels", label: "Canales WhatsApp", icon: "phone" },
    { id: "chatbots", label: "Bot & Reglas", icon: "message" },
    { id: "security", label: "Seguridad", icon: "eye" },
    esAdminGlobal && { id: "supabase", label: "Conexión Supabase", icon: "database" },
    esAdminGlobal && { id: "avanzado", label: "Avanzado", icon: "cog" },
  ].filter(Boolean);

  const SQL_MIGRATION = `-- MIGRACIÓN MULTI-TENANCY CRM
DO $$ 
DECLARE 
    t TEXT;
    tablas TEXT[] := ARRAY['deals', 'tareas', 'campos_personalizados', 'contactos', 'whatsapp_messages', 'empresas', 'actividades', 'emails', 'email_accounts', 'notas', 'productos', 'plantillasEmail', 'automatizaciones', 'whatsapp_automations', 'finanzas_gastos', 'finanzas_comisiones', 'notificaciones', 'auditoria', 'api_settings', 'webhook_subscriptions', 'landing_pages', 'formularios_publicos', 'documentos', 'pipelines', 'usuariosApp'];
BEGIN 
    INSERT INTO public.organizacion (id, nombre, slug) VALUES ('00000000-0000-0000-0000-000000000001', 'Organización Principal', 'principal') ON CONFLICT DO NOTHING;
    FOREACH t IN ARRAY tablas LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizacion(id) DEFAULT ''00000000-0000-0000-0000-000000000001''', t);
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;`;

  return (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-start", minHeight: "80vh" }}>

      <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, position: "sticky", top: 0 }}>
        <EncabezadoSeccion title="Ajustes CRM" sub="Administración Global" />
        {TABS.map(opt => {
          const act = tab === opt.id;
          return (
            <button key={opt.id} onClick={() => setTab(opt.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 8, border: "none", background: act ? T.tealSoft : "transparent", color: act ? T.teal : T.whiteDim, fontWeight: act ? 700 : 500, cursor: "pointer", transition: "all .2s", fontFamily: "inherit", textAlign: "left" }}>
              <Ico k={opt.icon} size={16} />
              {opt.label}
              {act && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: T.teal, boxShadow: `0 0 10px ${T.teal}` }} />}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, maxWidth: 900, animation: "fadeIn .3s" }}>
        {tab === "apariencia" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="star" size={24} style={{ color: T.teal }} /> Tema del Sistema</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 28 }}>Elige el estilo visual del CRM.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {Object.values(THEMES).map(th => {
                const isSel = (db.usuario?.tema || localStorage.getItem("crm_theme") || "dark") === th.id;
                return (
                  <div key={th.id} onClick={() => cambiarTema(th.id)}
                    style={{ border: `2px solid ${isSel ? T.teal : T.borderHi}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all .2s", transform: isSel ? "scale(1.03)" : "scale(1)", background: T.bg2 }}>
                    <div style={{ height: 60, background: th.bg0, display: "flex", padding: 10, gap: 4 }}>
                       <div style={{ width: 20, background: th.bg1, borderRadius: 4 }} />
                       <div style={{ flex: 1, background: th.bg2, borderRadius: 4 }} />
                    </div>
                    <div style={{ padding: "10px 14px", background: T.bg1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{th.icon} {th.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Tarjeta>
        )}

        {tab === "suscripcion" && (() => {
          const orgActual = db.organizacion?.find(o => o.id === db.usuario?.org_id);
          const planActualId = orgActual?.plan || "estandar";
          const planActual = PLAN_META[planActualId] || PLAN_META.estandar;
          const usage = getUsageStats(db);
          const ORDEN_PLANES = ["estandar", "premium", "business"];
          const planActualIdx = ORDEN_PLANES.indexOf(planActualId);

          const UsageBar = ({ label, actual, limite, icon }) => {
            const pct = limite === Infinity ? 0 : Math.min(100, Math.round((actual / limite) * 100));
            const color = pct >= 90 ? "#EF4444" : pct >= 70 ? "#F59E0B" : "#10B981";
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.whiteDim }}>
                    <Ico k={icon} size={14} /> {label}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 90 ? "#EF4444" : T.white }}>
                    {actual} / {limite === Infinity ? "\u221e" : limite}
                  </span>
                </div>
                <div style={{ height: 6, background: T.bg1, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: limite === Infinity ? "0%" : `${pct}%`, background: color, borderRadius: 99, transition: "width 1s ease", boxShadow: pct >= 70 ? `0 0 8px ${color}` : "none" }} />
                </div>
              </div>
            );
          };

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <div style={{ padding: "24px 28px", borderRadius: 20, background: planActual.gradient, border: `1px solid ${planActual.color}40`, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: `0 8px 32px ${planActual.color}20` }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: planActual.color, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Plan Actual</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{planActual.nombre}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{planActual.descripcion}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 42, fontWeight: 900, color: planActual.color }}>${planActual.precio}<span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.5)" }}>/mes</span></div>
                  {planActual.badge && <div style={{ marginTop: 8, display: "inline-block", background: `${planActual.color}30`, border: `1px solid ${planActual.color}60`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: planActual.color }}>{planActual.badge}</div>}
                </div>
              </div>

              <Tarjeta style={{ padding: 28 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                  <Ico k="chart" size={20} style={{ color: T.teal }} /> Uso Actual de Recursos
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
                  <UsageBar label="Usuarios" actual={usage.usuarios?.actual || 0} limite={usage.usuarios?.limite || 10} icon="users" />
                  <UsageBar label="Canales WhatsApp" actual={usage.whatsapp?.actual || 0} limite={usage.whatsapp?.limite || 2} icon="phone" />
                  <UsageBar label="Contactos" actual={usage.contactos?.actual || 0} limite={usage.contactos?.limite || 500} icon="user" />
                  <UsageBar label="Pipelines" actual={usage.pipelines?.actual || 0} limite={usage.pipelines?.limite || 2} icon="funnel" />
                  <UsageBar label="Plantillas Email" actual={usage.plantillas?.actual || 0} limite={usage.plantillas?.limite || 10} icon="template" />
                  <UsageBar label="Formularios" actual={usage.formularios?.actual || 0} limite={usage.formularios?.limite || 10} icon="note" />
                </div>
              </Tarjeta>

              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 6 }}>Planes Disponibles</div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 20 }}>Actualiza tu plan para desbloquear m\u00e1s recursos y funcionalidades.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                  {ORDEN_PLANES.map((pid, idx) => {
                    const meta = PLAN_META[pid];
                    const esCurrent = pid === planActualId;
                    const esUpgrade = idx > planActualIdx;
                    return (
                      <div key={pid} style={{ borderRadius: 20, border: `2px solid ${esCurrent ? meta.color : T.borderHi}`, background: esCurrent ? `${meta.color}08` : T.bg2, padding: 24, display: "flex", flexDirection: "column", position: "relative", transition: "all .3s", transform: esCurrent ? "scale(1.02)" : "scale(1)", boxShadow: esCurrent ? `0 8px 32px ${meta.color}20` : "none" }}>
                        {meta.badge && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: meta.color, borderRadius: 20, padding: "3px 14px", fontSize: 11, fontWeight: 800, color: "#000", whiteSpace: "nowrap" }}>{meta.badge}</div>}
                        <div style={{ fontSize: 11, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{meta.nombre}</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: T.white, marginBottom: 4 }}>${meta.precio}<span style={{ fontSize: 13, fontWeight: 400, color: T.whiteDim }}>/mes</span></div>
                        <div style={{ fontSize: 12, color: T.whiteDim, marginBottom: 20, lineHeight: 1.5 }}>{meta.descripcion}</div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                          {meta.features.map((f, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: f.disabled ? T.whiteDim : T.white, opacity: f.disabled ? 0.4 : 1 }}>
                              <div style={{ width: 18, height: 18, borderRadius: "50%", background: f.disabled ? T.bg1 : `${meta.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Ico k={f.disabled ? "x" : "check_plain"} size={10} style={{ color: f.disabled ? T.whiteDim : meta.color }} />
                              </div>
                              {f.text}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => { if (esUpgrade) { setTargetPlan(meta); setShowCheckout(true); } }} disabled={!esUpgrade}
                          style={{ padding: "12px 0", borderRadius: 12, border: "none", fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: esUpgrade ? "pointer" : "default", transition: "all .2s", background: esCurrent ? `${meta.color}20` : esUpgrade ? meta.color : T.bg1, color: esCurrent ? meta.color : esUpgrade ? "#000" : T.whiteDim }}>
                          {esCurrent ? "\u2713 Plan Actual" : esUpgrade ? `Upgrade a ${meta.nombre}` : "Plan Inferior"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {tab === "wa_channels" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.white, display: "flex", alignItems: "center", gap: 10 }}>
                <Ico k="phone" size={24} style={{ color: "#25D366" }} /> Canales de WhatsApp Multi-User
              </div>
              <Btn onClick={() => { 
                  if(!checkPlanLimit(db, "whatsapp")) return sileo.error(getPlanLimitError("canales de WhatsApp"));
                  setFWAAccount({ nombre: "", acceso: "todos" }); setShowWAModal(true); 
                }} style={{ background: "#25D366", color: "#000" }}>
                <Ico k="plus" size={16} /> Agregar Canal
              </Btn>
            </div>

            <p style={{ color: T.whiteDim, fontSize: 13, marginBottom: 24 }}>
                Vincula diferentes números de WhatsApp para tu equipo. Puedes definir si cada canal es de acceso general o personal.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ textAlign: "left", padding: 12, color: T.whiteDim, fontSize: 12 }}>Nombre del Canal</th>
                    <th style={{ textAlign: "left", padding: 12, color: T.whiteDim, fontSize: 12 }}>Visibilidad</th>
                    <th style={{ textAlign: "left", padding: 12, color: T.whiteDim, fontSize: 12 }}>Estado</th>
                    <th style={{ textAlign: "right", padding: 12, color: T.whiteDim, fontSize: 12 }}>Acciones</th>
                  </tr>
               </thead>
               <tbody>
                  {db.whatsapp_accounts?.map(acc => {
                    const status = waInstancesStatus[acc.id] || {};
                    return (
                      <tr key={acc.id} style={{ borderBottom: `1px solid ${T.borderHi}` }}>
                        <Celda>
                            <div style={{ fontWeight: 700, color: T.white }}>{acc.nombre}</div>
                            <div style={{ fontSize: 11, color: T.whiteDim }}>{acc.numero || "Número no vinculado"}</div>
                        </Celda>
                        <Celda>
                            <Chip 
                              label={acc.acceso === 'todos' ? 'Público (Todos)' : 'Personal (Privado)'} 
                              color={acc.acceso === 'todos' ? T.teal : T.amber} 
                              bg={acc.acceso === 'todos' ? T.tealSoft : T.amberS} 
                            />
                        </Celda>
                        <Celda>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: status.ready ? T.green : T.red, boxShadow: status.ready ? `0 0 10px ${T.green}` : "none" }} />
                                <span style={{ fontSize: 12, color: T.white }}>{status.ready ? 'Conectado' : 'Desconectado'}</span>
                            </div>
                        </Celda>
                        <Celda align="right">
                            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
                                {status.qr && !status.ready && (
                                    <div 
                                        style={{ background: "#FFF", padding: 6, borderRadius: 10, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", transition: "all .2s" }} 
                                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                                        onClick={() => { setCurrentAccountQR(acc); setShowQRModal(true); }}
                                    >
                                        <img src={status.qr} style={{ width: 44, height: 44, display: "block" }} title="Ampliar QR" />
                                    </div>
                                )}
                                {!status.ready ? (
                                    <Btn size="sm" variant="fantasma" onClick={() => vincularWA(acc.id)} style={{ color: T.teal, fontWeight: 800 }}>
                                        {status.qr ? 'Ver QR' : 'Vincular'}
                                    </Btn>
                                ) : (
                                    <Btn size="sm" variant="fantasma" onClick={() => desvincularWA(acc.id)} style={{ color: T.red }}>Desconectar</Btn>
                                )}
                                <Btn size="sm" variant="fantasma" onClick={() => eliminarWhatsAppAcc(acc.id)} style={{ color: T.whiteDim }}><Ico k="trash" size={14} /></Btn>
                            </div>
                        </Celda>
                      </tr>
                    );
                  })}
                  {(!db.whatsapp_accounts || db.whatsapp_accounts.length === 0) && (
                    <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: T.whiteDim }}>Aún no has agregado canales de WhatsApp.</td></tr>
                  )}
               </tbody>
            </table>
          </Tarjeta>
        )}

        {tab === "chatbots" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="message" size={24} style={{ color: "#25D366" }} /> Reglas de Chatbot Multi-Canal</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 28 }}>Configura respuestas automáticas o IA para tus canales de WhatsApp.</div>
            
            <div style={{ padding: 20, background: T.bg2, borderRadius: 12, border: `1px solid ${T.borderHi}`, marginBottom: 32 }}>
                <div style={{ fontSize: 13, color: T.white, fontWeight: 700, marginBottom: 12 }}>⚠️ Instrucciones Multi-Canal</div>
                <ul style={{ fontSize: 12, color: T.whiteDim, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <li>Las reglas pueden ser <b>Globales</b> (aplican a todos los números) o <b>Específicas</b> a un canal.</li>
                    <li>Si usas IA, asegúrate de tener configurada la API Key en Infraestructura.</li>
                    <li>Los cambios se aplican de forma inmediata en el servidor.</li>
                </ul>
            </div>

            <p style={{ color: T.whiteDim, textAlign: "center", padding: 40 }}>Vaya a la sección de <b>WhatsApp</b> en el menú principal para configurar las reglas específicas por chat y disparar el robot.</p>
          </Tarjeta>
        )}

        {tab === "recordatorios" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="bell" size={24} style={{ color: T.amber }} /> Recordatorios Inteligentes</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
              <div style={{ padding: 24, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 4 }}>Deal Sin Actividad</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Inp type="number" value={recordatorios.dealSinActividadDias} style={{ width: 72 }} onChange={e => setRecordatorios(r => ({ ...r, dealSinActividadDias: +e.target.value }))} />
                  <span style={{ fontSize: 13, color: T.whiteDim }}>días sin registro</span>
                </div>
              </div>
              <div style={{ padding: 24, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 12 }}>Notificaciones Globales</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: T.white, cursor: "pointer" }}>
                    <input type="checkbox" checked={recordatorios.pushNotif} onChange={e => setRecordatorios(r => ({ ...r, pushNotif: e.target.checked }))} /> Push Notifications (Navegador)
                  </label>
                  <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: T.white, cursor: "pointer" }}>
                    <input type="checkbox" checked={recordatorios.emailDigest} onChange={e => setRecordatorios(r => ({ ...r, emailDigest: e.target.checked }))} /> Daily Email Digest
                  </label>
                </div>
              </div>
            </div>
            <Btn onClick={guardarRecordatorios} full style={{ padding: '14px' }}><Ico k="check" size={16} /> Guardar Cambios</Btn>
          </Tarjeta>
        )}

        {tab === "perfil" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><Ico k="user" size={24} style={{ color: T.teal }} /> Preferencias de Cuenta</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div style={{ display: "flex", gap: 24, padding: 24, background: T.bg2, borderRadius: 16, border: `1px solid ${T.borderHi}`, alignItems: "center" }}>
                <input type="file" ref={profilePicRef} accept="image/*" style={{ display: "none" }} onChange={handleProfilePicChange} />
                <div style={{ position: "relative", cursor: "pointer" }} onClick={() => profilePicRef.current?.click()}>
                   {db.usuario?.profilePic ? <img src={db.usuario.profilePic} style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: `3px solid ${T.teal}` }} /> : <div style={{ width: 100, height: 100, borderRadius: "50%", background: T.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: T.teal }}>{fPerfil.name?.[0]}</div>}
                   <div style={{ position: "absolute", bottom: 4, right: 4, width: 28, height: 28, background: T.teal, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.bg2}` }}><Ico k="edit" size={14} style={{ color: "#000" }} /></div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: T.white, fontSize: 18 }}>Avatar Personal</div>
                  <div style={{ fontSize: 13, color: T.whiteDim, marginTop: 4 }}>Haz clic para actualizar tu foto de perfil. Máximo 5MB.</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <Campo label="Nombre Completo"><Inp value={fPerfil.name} onChange={e => setFPerfil({ ...fPerfil, name: e.target.value })} style={{ fontSize: 15 }} /></Campo>
                <Campo label="Email"><Inp value={fPerfil.email} disabled style={{ fontSize: 15 }} /></Campo>
              </div>
              <Btn onClick={guardarPerfil}>Guardar Perfil</Btn>

              <div style={{ marginTop: 10, paddingTop: 32, borderTop: `1px solid ${T.borderHi}` }}>
                 <div style={{ fontWeight: 800, color: T.white, marginBottom: 20, fontSize: 18 }}>Seguridad de Acceso</div>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <Campo label="Nueva Contraseña"><Inp type="password" value={fPassword.nueva} onChange={e => setFPassword({ ...fPassword, nueva: e.target.value })} style={{ fontSize: 15 }} /></Campo>
                    <Campo label="Confirmar"><Inp type="password" value={fPassword.confirmar} onChange={e => setFPassword({ ...fPassword, confirmar: e.target.value })} style={{ fontSize: 15 }} /></Campo>
                 </div>
                 <Btn onClick={cambiarPassword} style={{ marginTop: 12, background: T.amber, color: "#000", border: 'none', fontWeight: 800 }}>Actualizar Credenciales</Btn>
              </div>
            </div>
          </Tarjeta>
        )}

        {/* ESTRUCTURA INFRAESTRUCTURA RESTAURADA */}
        {tab === "empresa" && esAdminGlobal && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><Ico k="building" size={24} style={{ color: T.teal }} /> Tenant & Infraestructura</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <Campo label="Tenant Name"><Inp value={fEmpresa} onChange={e => setFEmpresa(e.target.value)} style={{ fontSize: 15 }} /></Campo>
              <Campo label="WhatsApp Core URL (Cloudflare Tunnel)"><Inp value={fWaUrl} onChange={e => setFWaUrl(e.target.value)} placeholder="https://..." style={{ fontSize: 15 }} /></Campo>
              <div style={{ padding: 20, background: T.tealSoft, borderRadius: 14, border: `1px solid ${T.tealSoft}` }}>
                 <div style={{ fontWeight: 800, color: T.teal, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><Ico k="check" size={14} /> 99.99% Enterprise SLA Active</div>
                 <div style={{ fontSize: 12, color: T.whiteOff, marginTop: 4 }}>Clúster dedicado de base de datos y memoria caché para esta instancia regionalizada.</div>
              </div>
              <Btn onClick={guardarEmpresa} full>Synchronize Tenant</Btn>
            </div>
          </Tarjeta>
        )}

        {tab === "organizaciones" && esAdminGlobal && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.white, display: "flex", alignItems: "center", gap: 10 }}><Ico k="grid" size={24} style={{ color: T.teal }} /> Organizaciones & Aislamiento</div>
              <Btn onClick={() => setShowOrgModal(true)} style={{ background: T.teal, color: "#000" }}><Ico k="plus" size={16} /> Nueva</Btn>
            </div>
            <div style={{ marginBottom: 24, padding: 16, background: T.amberS, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid rgba(245, 158, 11, 0.2)` }}>
               <div style={{ fontSize: 13, color: T.whiteOff }}>¿Activando nuevas tablas? Ejecuta el script de migración multi-tenant.</div>
               <Btn variant="secundario" size="sm" onClick={() => { navigator.clipboard.writeText(SQL_MIGRATION); sileo.success("¡Script SQL copiado!"); }}>Copiar SQL</Btn>
            </div>
            <div style={{ borderRadius: 14, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <CabeceraTabla cols={["Empresa / Organización", "Slug ID", "Plan", "Usuarios", "Acciones"]} />
                <tbody>
                  {(db.organizacion || []).map(org => (
                    <FilaTabla key={org.id}>
                      <Celda>
                        <div style={{ fontWeight: 800, color: T.white }}>{org.nombre}</div>
                        <div style={{ fontSize: 11, color: T.whiteDim }}>{org.id}</div>
                      </Celda>
                      <Celda><Chip label={org.slug} /></Celda>
                      <Celda>
                        <select 
                          value={org.plan || "estandar"} 
                          onChange={e => handleCambiarPlan(org.id, e.target.value)}
                          disabled={org.id === '00000000-0000-0000-0000-000000000001'}
                          style={{ background: T.bg2, color: T.white, border: `1px solid ${T.borderHi}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, cursor: "pointer", outline: "none", fontWeight: 800 }}
                        >
                          <option value="estandar">ESTÁNDAR</option>
                          <option value="premium">PREMIUM</option>
                          <option value="business">BUSINESS</option>
                        </select>
                      </Celda>
                      <Celda>{(db.usuariosApp || []).filter(u => u.org_id === org.id).length} colaboradores</Celda>
                      <Celda>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn variant="fantasma" onClick={() => { setOrgAuditada(org); setShowUserListModal(true); }}><Ico k="eye" size={18} style={{ color: T.teal }} /></Btn>
                          <Btn variant="fantasma" onClick={() => confirmSwitch(org.id)} style={{ color: org.id === db.usuario?.org_id ? T.green : T.whiteOff }}><Ico k={org.id === db.usuario?.org_id ? "check" : "lightning"} size={18} /></Btn>
                          <Btn variant="fantasma" onClick={() => handleEliminarOrg(org.id, org.nombre)} style={{ color: T.red }} disabled={org.id === '00000000-0000-0000-0000-000000000001'}><Ico k="trash" size={18} /></Btn>
                        </div>
                      </Celda>
                    </FilaTabla>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        )}

        {tab === "usuarios" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.white, display: "flex", alignItems: "center", gap: 10 }}><Ico k="users" size={24} style={{ color: T.teal }} /> Identity & Access (IAM)</div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginTop: 4 }}>Control de roles segmentado por organización (RBAC).</div>
              </div>
              <Btn onClick={() => {
                  if(!checkPlanLimit(db, "usuarios")) return sileo.error(getPlanLimitError("usuarios"));
                  setShowUserModal(true);
                }} style={{ background: T.teal, color: "#000" }}><Ico k="plus" size={16} /> Provisionar</Btn>
            </div>
            <div style={{ borderRadius: 14, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <CabeceraTabla cols={["Colaborador / Email", "Jerarquía (Rol)", "WA", "Health", ""]} />
                <tbody>
                  {(db.usuariosApp || []).filter(u => esAdminGlobal ? true : u.org_id === db.usuario?.org_id).map(u => {
                    const org = db.organizacion?.find(o => o.id === u.org_id);
                    return (
                    <FilaTabla key={u.id}>
                      <Celda>
                        <div style={{ fontWeight: 800, color: T.white }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: T.whiteDim }}>{u.email}</div>
                        {esAdminGlobal && <div style={{ fontSize: 10, color: T.teal, fontWeight: 800, marginTop: 4, textTransform: "uppercase" }}>🏢 {org?.nombre || "N/A"}</div>}
                      </Celda>
                      <Celda>
                         <select value={u.role} onChange={e => handleChangeRole(u.id, u.email, e.target.value)} style={{ background: T.bg2, color: T.white, border: `1px solid ${T.borderHi}`, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                             <option value="ventas">VENTAS</option><option value="manager">MANAGER</option><option value="admin">ADMIN</option>
                         </select>
                      </Celda>
                      <Celda>
                        <button onClick={() => handleToggleWhatsApp(u.id)} style={{ background: "transparent", border: "none", color: u.whatsappAccess ? "#25D366" : T.whiteDim, cursor: 'pointer', transition: 'all .2s', transform: u.whatsappAccess ? 'scale(1.2)' : 'scale(1)' }}>
                          <Ico k="message" size={22} />
                        </button>
                      </Celda>
                      <Celda>{u.activo ? <div style={{ display: "flex", gap: 6, alignItems: "center", color: T.green, fontSize: 12, fontWeight: 800 }}><div style={{ width: 8, height: 8, background: T.green, borderRadius: "50%", boxShadow: `0 0 8px ${T.green}` }} /> Online</div> : <div style={{ color: T.red, fontWeight: 800, fontSize: 12 }}>Revoked</div>}</Celda>
                      <Celda>
                         <div style={{ display: "flex", gap: 8 }}>
                            <Btn variant="fantasma" size="sm" onClick={() => handleResetPasswordUser(u.email)} title="Reset Password"><Ico k="key" size={16} /></Btn>
                            <Btn variant="fantasma" size="sm" onClick={() => handleEliminarUsuario(u.id, u.email)} style={{ color: T.red }} title="Delete"><Ico k="trash" size={16} /></Btn>
                         </div>
                      </Celda>
                    </FilaTabla>
                  );})}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        )}

        {tab === "email" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.white, display: "flex", alignItems: "center", gap: 10 }}>
                <Ico k="mail" size={24} style={{ color: T.teal }} /> Email Intelligence Engine
              </div>
              {(db.email_accounts?.length > 0) && (
                <Btn variant="secundario" size="sm" onClick={() => {
                  if(!checkPlanLimit(db, "emails")) return sileo.error(getPlanLimitError("cuentas de correo por usuario"));
                  setShowManualEmail(true);
                }}>
                  <Ico k="plus" size={14} /> Agregar cuenta
                </Btn>
              )}
            </div>

            {/* ─── CUENTAS YA CONECTADAS ─────────────────────────────────── */}
            {db.email_accounts && db.email_accounts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {db.email_accounts.map(acc => {
                  const isGoogle = acc.provider === 'google' || acc.smtp_host?.includes('gmail');
                  const isMS = acc.provider === 'azure' || acc.smtp_host?.includes('outlook') || acc.smtp_host?.includes('office365');
                  const providerLabel = isGoogle ? 'Google Workspace' : isMS ? 'Microsoft 365' : 'SMTP/IMAP';
                  const GoogleLogo = () => (
                    <svg viewBox="0 0 48 48" width="28" height="28"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  );
                  const MicrosoftLogo = () => (
                    <svg viewBox="0 0 23 23" width="26" height="26"><rect fill="#f25022" x="1" y="1" width="10" height="10"/><rect fill="#00a4ef" x="1" y="12" width="10" height="10"/><rect fill="#7fba00" x="12" y="1" width="10" height="10"/><rect fill="#ffb900" x="12" y="12" width="10" height="10"/></svg>
                  );
                  return (
                    <div key={acc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: T.bg2, border: `1px solid ${T.teal}30`, borderRadius: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: isGoogle ? "rgba(66,133,244,0.08)" : isMS ? "rgba(0,164,239,0.08)" : T.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isGoogle ? <GoogleLogo /> : isMS ? <MicrosoftLogo /> : <span style={{ fontSize: 22 }}>📧</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: T.white, fontSize: 14 }}>{acc.email}</div>
                          <div style={{ fontSize: 11, color: T.teal, fontWeight: 700, marginTop: 2 }}>{providerLabel}</div>
                          {acc.last_sync && (
                            <div style={{ fontSize: 10, color: T.whiteDim, marginTop: 2 }}>
                              Última sync: {new Date(acc.last_sync).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn variant="secundario" size="sm" onClick={() => syncEmails(acc.id)} disabled={probandoEmail}>
                          <Ico k="refresh" size={14} /> Sincronizar
                        </Btn>
                        <Btn variant="fantasma" size="sm" onClick={() => { setSelectedEmailAcc(acc); setShowDelEmailModal(true); }} style={{ color: T.red }}>
                          <Ico k="trash" size={14} />
                        </Btn>
                      </div>
                    </div>
                  );
                })}

                {/* Botón para agregar otra cuenta */}
                <div style={{ marginTop: 8, paddingTop: 20, borderTop: `1px solid ${T.borderHi}` }}>
                  <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 12 }}>¿Quieres agregar otra cuenta?</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div onClick={() => {
                        if(!checkPlanLimit(db, "emails")) return sileo.error(getPlanLimitError("cuentas de correo por usuario"));
                        handleConnectEmail('google');
                      }} style={{ flex: 1, cursor: "pointer", padding: "14px 20px", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 14, display: "flex", alignItems: "center", gap: 12, transition: "all .2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.borderHi}>
                      <svg viewBox="0 0 48 48" width="24" height="24"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                      <div>
                        <div style={{ fontWeight: 700, color: T.white, fontSize: 13 }}>Google Workspace</div>
                        <div style={{ fontSize: 11, color: T.whiteDim }}>Gmail / Google</div>
                      </div>
                    </div>
                    <div onClick={() => {
                        if(!checkPlanLimit(db, "emails")) return sileo.error(getPlanLimitError("cuentas de correo por usuario"));
                        handleConnectEmail('azure');
                      }} style={{ flex: 1, cursor: "pointer", padding: "14px 20px", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 14, display: "flex", alignItems: "center", gap: 12, transition: "all .2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.borderHi}>
                      <svg viewBox="0 0 23 23" width="22" height="22"><rect fill="#f25022" x="1" y="1" width="10" height="10"/><rect fill="#00a4ef" x="1" y="12" width="10" height="10"/><rect fill="#7fba00" x="12" y="1" width="10" height="10"/><rect fill="#ffb900" x="12" y="12" width="10" height="10"/></svg>
                      <div>
                        <div style={{ fontWeight: 700, color: T.white, fontSize: 13 }}>Microsoft 365</div>
                        <div style={{ fontSize: 11, color: T.whiteDim }}>Outlook / Office</div>
                      </div>
                    </div>
                    <div onClick={() => {
                        if(!checkPlanLimit(db, "emails")) return sileo.error(getPlanLimitError("cuentas de correo por usuario"));
                        setShowManualEmail(true);
                      }} style={{ flex: 1, cursor: "pointer", padding: "14px 20px", background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 14, display: "flex", alignItems: "center", gap: 12, transition: "all .2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.borderHi}>
                      <span style={{ fontSize: 20 }}>📧</span>
                      <div>
                        <div style={{ fontWeight: 700, color: T.white, fontSize: 13 }}>SMTP / IMAP</div>
                        <div style={{ fontSize: 11, color: T.whiteDim }}>Servidor propio</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ─── PANTALLA VACÍA: sin cuentas aún ──────────────────────── */
              <div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 24 }}>
                  Conecta tu cuenta de correo para enviar y recibir emails directamente desde el CRM.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div onClick={() => {
                      if(!checkPlanLimit(db, "emails")) return sileo.error(getPlanLimitError("cuentas de correo por usuario"));
                      handleConnectEmail('google');
                    }} style={{ cursor: "pointer", padding: 32, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 20, textAlign: "center", transition: "all .2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}
                    onMouseLeave={e => e.currentTarget.style.borderColor = T.borderHi}>
                    <img src="/brand/google_logo.png" alt="Google" style={{ height: 48, marginBottom: 16 }} />
                    <div style={{ fontWeight: 800, color: T.white, fontSize: 18 }}>Google Workspace</div>
                    <div style={{ fontSize: 12, color: T.whiteDim, marginTop: 8 }}>Sincronización de Correo y Calendario</div>
                  </div>
                  <div onClick={() => {
                      if(!checkPlanLimit(db, "emails")) return sileo.error(getPlanLimitError("cuentas de correo por usuario"));
                      handleConnectEmail('azure');
                    }} style={{ cursor: "pointer", padding: 32, background: T.bg2, border: `1px solid ${T.borderHi}`, borderRadius: 20, textAlign: "center", transition: "all .2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}
                    onMouseLeave={e => e.currentTarget.style.borderColor = T.borderHi}>
                    <img src="/brand/microsoft_logo.png" alt="Microsoft" style={{ height: 48, marginBottom: 16 }} />
                    <div style={{ fontWeight: 800, color: T.white, fontSize: 18 }}>Microsoft 365 / Outlook</div>
                    <div style={{ fontSize: 12, color: T.whiteDim, marginTop: 8 }}>Empresa y cuentas personales</div>
                  </div>
                </div>
                <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: T.whiteDim }}>
                  ¿Usas un servidor IMAP/SMTP propio? <span style={{ color: T.teal, cursor: "pointer", fontWeight: 700 }} onClick={() => {
                      if(!checkPlanLimit(db, "emails")) return sileo.error(getPlanLimitError("cuentas de correo por usuario"));
                      setShowManualEmail(true);
                    }}>Click aquí para configuración manual</span>
                </div>
              </div>
            )}
          </Tarjeta>
        )}

        {tab === "api" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="code" size={24} style={{ color: T.teal }} /> API Control & Webhooks</div>
            <div style={{ fontSize: 14, color: T.whiteDim, marginBottom: 28 }}>Puerta de enlace segura para integraciones programáticas con Zapier, Make, etc.</div>
            <div style={{ padding: 24, background: T.bg2, border: `1px solid ${T.tealSoft}`, borderRadius: 16 }}>
               <div style={{ fontSize: 12, color: T.teal, fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Private Bearer Auth Token (v2.0)</div>
               <div style={{ display: "flex", gap: 12 }}>
                  <Inp value={db.api_settings?.[0]?.api_token || "Token no configurado..."} readOnly style={{ flex: 1, fontFamily: "monospace", color: T.teal, background: T.bg1, fontSize: 14 }} />
                  <Btn variant="secundario" onClick={copiarToken} style={{ minWidth: 80 }}>Copy</Btn>
                  <Btn variant="peligro" onClick={rotateApiToken} disabled={cargandoApi} style={{ minWidth: 100 }}>Rotate Access</Btn>
               </div>
            </div>
          </Tarjeta>
        )}

        {tab === "chatbots" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><Ico k="message" size={24} style={{ color: T.teal }} /> Omnicanalidad & Chatbots</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
               <div style={{ background: T.bg2, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", overflow: "hidden" }}>
                  <div style={{ width: 140, background: "#25D36615", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style={{ width: 56, marginBottom: 12 }} />
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#25D366" }}>WhatsApp</div>
                  </div>
                  <div style={{ flex: 1, padding: 24 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 800, color: T.white, fontSize: 18 }}>WhatsApp API Bridge</div>
                          <div style={{ fontSize: 12, color: T.whiteDim, marginTop: 4 }}>Gateway local conectado a este Tenant.</div>
                        </div>
                        <Chip label={waConnected ? "Online" : "Offline"} color={waConnected ? T.green : T.whiteOff} />
                     </div>
                     
                     <details style={{ marginTop: 20, background: T.bg1, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.borderHi}` }}>
                        <summary style={{ fontSize: 13, color: T.teal, fontWeight: 700, cursor: "pointer" }}>Ver diagnóstico de conexión</summary>
                        <div style={{ marginTop: 12, fontSize: 11, color: T.whiteDim, fontFamily: "monospace" }}>
                           Host: {fWaUrl || getApiUrl(db)}
                           <br />Protocol: WebSocket (Socket.io)
                           <div style={{ marginTop: 8, color: T.amber }}>🔗 Asegúrate de que tu túnel Cloudflare esté corriendo correctamente.</div>
                        </div>
                     </details>

                     {waQR && !waConnected && (
                       <div style={{ textAlign: "center", marginTop: 24, padding: 20, background: "#FFF", borderRadius: 16 }}>
                         <div style={{ fontSize: 14, color: "#000", fontWeight: 800, marginBottom: 16 }}>Escanea este código:</div>
                         <img src={waQR} style={{ width: 180 }} />
                       </div>
                     )}

                     <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                        <Btn onClick={probarConexionHttp} disabled={conectando} style={{ background: "#25D366", color: "#000", border: 'none' }}>{conectando ? "Diagnosticando..." : (waQR ? "Regenerar QR" : "Vincular con QR")}</Btn>
                        <Btn variant="secundario" onClick={guardarEmpresa}>Sync Infrastructure</Btn>
                     </div>
                  </div>
               </div>
               
               <div style={{ background: T.bg2, borderRadius: 16, border: `1px solid ${T.borderHi}`, display: "flex", overflow: "hidden" }}>
                  <div style={{ width: 140, background: "#0088cc15", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" style={{ width: 56, marginBottom: 12 }} />
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0088cc" }}>Telegram</div>
                  </div>
                  <div style={{ flex: 1, padding: 32 }}>
                     <div style={{ fontWeight: 800, color: T.white, fontSize: 18 }}>Telegram Bot Framework</div>
                     <div style={{ fontSize: 13, color: T.whiteDim, marginTop: 8 }}>Vincula tu token de BotFather para interactuar desde el CRM.</div>
                     <Btn variant="fantasma" style={{ marginTop: 16, color: "#0088cc", borderColor: "#0088cc" }}>Configurar Bot</Btn>
                  </div>
               </div>
            </div>
          </Tarjeta>
        )}

        {tab === "security" && (
          <Tarjeta style={{ padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}><Ico k="eye" size={24} style={{ color: T.amber }} /> Security Operations Center (SOC)</div>
            <div style={{ marginBottom: 24, fontSize: 14, color: T.whiteDim }}>Logs de auditoría global y monitorización de amenazas (Últimas 24h).</div>
            <div style={{ borderRadius: 14, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "monospace" }}>
                <CabeceraTabla cols={["Time (UTC)", "Nivel", "Evento Administrativo", "Ubicación / IP"]} />
                <tbody>
                  {auditLogs.map(l => (
                    <FilaTabla key={l.id}>
                      <Celda style={{ color: T.whiteDim }}>{fdtm(l.time)}</Celda>
                      <Celda>{l.threat ? <Chip label="HIGH" color={T.red} /> : <Chip label="INFO" color={T.teal} />}</Celda>
                      <Celda style={{ color: l.threat ? T.red : T.white, fontWeight: 800 }}>{l.action}</Celda>
                      <Celda>{l.location} ({l.ip})</Celda>
                    </FilaTabla>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        )}

        {tab === "supabase" && esAdminGlobal && (
          <Tarjeta style={{ padding: 32 }}>
             <div style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><Ico k="database" size={24} style={{ color: T.teal }} /> Conexión con Supabase Cloud</div>
             <IndSupa estado={estadoSupa} />
          </Tarjeta>
        )}

        {tab === "avanzado" && esAdminGlobal && (
          <Tarjeta style={{ padding: 32, border: `1px solid rgba(239, 68, 68, 0.3)` }}>
             <div style={{ fontSize: 20, fontWeight: 800, color: T.red, display: "flex", alignItems: "center", gap: 10 }}><Ico k="cog" size={24} /> Opciones de Root / Recuperación</div>
             <div style={{ marginTop: 24, padding: 24, background: "rgba(239, 68, 68, 0.05)", borderRadius: 16, border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                <div style={{ fontWeight: 800, color: T.red, fontSize: 18 }}>Wipe Cluster Cache</div>
                <div style={{ fontSize: 13, color: T.whiteOff, margin: "12px 0 24px" }}>Esta acción purga todos los datos locales (IndexedDB) forzando una sincronización inmediata desde la nube en el próximo reinicio. Útil si detectas corrupción de datos persistente.</div>
                <Btn variant="peligro" onClick={() => { if (confirm("⚠️ ¿Estás 100% seguro de vaciar la cache local del clúster?")) { localStorage.clear(); window.location.reload(); } }} style={{ fontWeight: 800 }}>WIPE LOCAL STORAGE & RELOAD</Btn>
             </div>
          </Tarjeta>
        )}
      </div>

      <Modal open={showUserModal} onClose={() => { setShowUserModal(false); setFNuevoUser({ name: "", email: "", password: "", role: "ventas" }); }} title="Crear Nuevo Usuario CRM" width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Info banner */}
          <div style={{ background: `${T.teal}12`, border: `1px solid ${T.teal}30`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Ico k="mail" size={16} style={{ color: T.teal, marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: T.whiteDim, lineHeight: 1.6 }}>
              El usuario recibirá un correo de verificación en su email. Una vez que confirme, podrá ingresar al CRM con las credenciales que aquí definas.
            </div>
          </div>

          <Campo label="Nombre Completo">
            <Inp
              value={fNuevoUser.name}
              onChange={e => setFNuevoUser({ ...fNuevoUser, name: e.target.value })}
              placeholder="Ej: María García"
              style={{ fontSize: 15 }}
            />
          </Campo>

          <Campo label="Email de Acceso">
            <Inp
              type="email"
              value={fNuevoUser.email}
              onChange={e => setFNuevoUser({ ...fNuevoUser, email: e.target.value })}
              placeholder="correo@empresa.com"
              style={{ fontSize: 15 }}
            />
          </Campo>

          <Campo label="Contraseña Inicial">
            <Inp
              type="password"
              value={fNuevoUser.password}
              onChange={e => setFNuevoUser({ ...fNuevoUser, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              style={{ fontSize: 15 }}
            />
          </Campo>

          <Campo label="Rol en el CRM">
            <Sel
              value={fNuevoUser.role}
              onChange={e => setFNuevoUser({ ...fNuevoUser, role: e.target.value })}
              style={{ height: 48 }}>
              <option value="admin">Administrador — Acceso total</option>
              <option value="ventas">Vendedor — Sólo ve sus propios leads</option>
              <option value="viewer">Observador — Solo lectura</option>
            </Sel>
          </Campo>

          <Btn
            onClick={handleCrearUsuario}
            disabled={cargandoUser || !fNuevoUser.name || !fNuevoUser.email || !fNuevoUser.password}
            full
            style={{ marginTop: 8, padding: 14, fontWeight: 800, fontSize: 14 }}>
            {cargandoUser ? "Creando usuario..." : "✅ Crear Usuario"}
          </Btn>
        </div>
      </Modal>

      <Modal open={showOrgModal} onClose={() => setShowOrgModal(false)} title="Registrar Nueva Organización (Tenant)">
        <Campo label="Nombre de la Organización">
          <Inp 
            value={fOrg.nombre} 
            onChange={e => {
              const val = e.target.value;
              setFOrg({ ...fOrg, nombre: val, slug: val.toLowerCase().trim().replace(/[\s\W-]+/g, '-') });
            }} 
            style={{ fontSize: 15 }} 
          />
        </Campo>
        <Campo label="Identificador Único (Slug)"><Inp value={fOrg.slug} onChange={e => setFOrg({ ...fOrg, slug: e.target.value })} style={{ fontSize: 15 }} disabled /></Campo>
        <Btn onClick={handleCrearOrg} full style={{ marginTop: 24, padding: 14 }}>Crear Instancia</Btn>
      </Modal>

      {showSwitchModal && (
        <ConfirmModal open onConfirm={handleSwitchFinal} onClose={() => setShowSwitchModal(false)} title="Cambiar Instancia de Trabajo" />
      )}

      {showManualEmail && (
        <Modal open onClose={() => setShowManualEmail(false)} title="Agregar Cuenta de Correo (SMTP/IMAP)" width={520}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Info */}
            <div style={{ background: `${T.teal}12`, border: `1px solid ${T.teal}30`, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: T.whiteDim, lineHeight: 1.6 }}>
              💡 Para Gmail usa <b>smtp.gmail.com</b> (puerto 587) y activa "Contraseñas de aplicación" en tu cuenta de Google. Para Outlook usa <b>smtp.office365.com</b>.
            </div>

            <Campo label="Correo electrónico">
              <Inp
                type="email"
                value={fEmail.email}
                onChange={e => setFEmail({ ...fEmail, email: e.target.value })}
                placeholder="tucorreo@empresa.com"
              />
            </Campo>

            <Campo label="Contraseña de aplicación">
              <Inp
                type="password"
                value={fEmail.password_hash}
                onChange={e => setFEmail({ ...fEmail, password_hash: e.target.value })}
                placeholder="Contraseña o App Password"
              />
            </Campo>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
              <Campo label="Host SMTP (envío)">
                <Inp value={fEmail.smtp_host} onChange={e => setFEmail({ ...fEmail, smtp_host: e.target.value })} placeholder="smtp.gmail.com" />
              </Campo>
              <Campo label="Puerto">
                <Inp type="number" value={fEmail.smtp_port} onChange={e => setFEmail({ ...fEmail, smtp_port: +e.target.value })} />
              </Campo>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
              <Campo label="Host IMAP (recepción)">
                <Inp value={fEmail.imap_host} onChange={e => setFEmail({ ...fEmail, imap_host: e.target.value })} placeholder="imap.gmail.com" />
              </Campo>
              <Campo label="Puerto">
                <Inp type="number" value={fEmail.imap_port} onChange={e => setFEmail({ ...fEmail, imap_port: +e.target.value })} />
              </Campo>
            </div>

            <Btn
              onClick={async () => {
                if (!fEmail.email || !fEmail.password_hash) {
                  sileo.error("El email y la contraseña son obligatorios.");
                  return;
                }
                // Verificar si ya existe una cuenta con ese email
                const existente = (db.email_accounts || []).find(a => a.email === fEmail.email);
                const payload = {
                  ...fEmail,
                  id: existente?.id || uuid(),
                  user_id: db.usuario?.id,
                  org_id: db.usuario?.org_id,
                  provider: fEmail.provider || "custom",
                  creado: existente?.creado || new Date().toISOString(),
                };
                const { data: saved, error } = await guardarEnSupa("email_accounts", payload);
                if (error) {
                  sileo.error("Error al guardar: " + error.message);
                  return;
                }
                const registroGuardado = saved || payload;
                // Actualizar estado local inmediatamente
                setDb(d => {
                  const lista = d.email_accounts || [];
                  const idx = lista.findIndex(a => a.id === registroGuardado.id);
                  return {
                    ...d,
                    email_accounts: idx >= 0
                      ? lista.map(a => a.id === registroGuardado.id ? registroGuardado : a)
                      : [...lista, registroGuardado]
                  };
                });
                sileo.success({ title: "✅ Cuenta guardada", description: `${fEmail.email} ya aparece en tu configuración de correo.` });
                setShowManualEmail(false);
                // Resetear para próxima cuenta
                setFEmail({ email: "", password_hash: "", provider: "custom", smtp_host: "smtp.gmail.com", smtp_port: 587, imap_host: "imap.gmail.com", imap_port: 993 });
              }}
              full
              style={{ marginTop: 8, padding: 14, fontWeight: 800 }}>
              💾 Guardar cuenta de correo
            </Btn>
          </div>
        </Modal>
      )}


      {showUserListModal && orgAuditada && (
        <Modal open title={`Panel de Auditoría: ${orgAuditada.nombre}`} onClose={() => setShowUserListModal(false)} width={640}>
           <div style={{ marginBottom: 20, fontSize: 13, color: T.whiteDim }}>Lista oficial de colaboradores vinculados a este tenant.</div>
           <div style={{ borderRadius: 14, border: `1px solid ${T.borderHi}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                 <CabeceraTabla cols={["Colaborador", "Nivel", "Estado Global"]} />
                 <tbody>
                    {(db.usuariosApp || []).filter(u => u.org_id === orgAuditada.id).map(u => (
                       <FilaTabla key={u.id}>
                          <Celda>
                             <div style={{ fontWeight: 800, color: T.white }}>{u.name}</div>
                             <div style={{ fontSize: 11, color: T.whiteDim }}>{u.email}</div>
                          </Celda>
                          <Celda><Chip label={u.role.toUpperCase()} /></Celda>
                          <Celda>
                             <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <div style={{ width: 8, height: 8, background: u.activo ? T.green : T.red, borderRadius: "50%" }} />
                                <span style={{ fontSize: 12, fontWeight: 700 }}>{u.activo ? "AUTORIZADO" : "BLOQUEADO"}</span>
                             </div>
                          </Celda>
                       </FilaTabla>
                    ))}
                 </tbody>
              </table>
           </div>
           <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowUserListModal(false)}>Cerrar Auditoría</Btn>
           </div>
        </Modal>
      )}

      <Modal open={showWAModal} onClose={() => setShowWAModal(false)} title="Agregar Nuevo Canal de WhatsApp">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Campo label="Nombre del Canal (Ej: Ventas, Soporte)">
            <Inp placeholder="Canal..." value={fWAAccount.nombre} onChange={e => setFWAAccount({ ...fWAAccount, nombre: e.target.value })} />
          </Campo>
          <Campo label="Nivel de Acceso">
            <Sel value={fWAAccount.acceso} onChange={e => setFWAAccount({ ...fWAAccount, acceso: e.target.value })}>
              <div value="todos">Público (Todos pueden ver los chats)</div>
              <div value="personal">Personal (Solo tú y admins)</div>
            </Sel>
          </Campo>
          <div style={{ padding: 12, background: T.tealSoft, borderRadius: 8, fontSize: 12, color: T.whiteDim }}>
            ℹ️ Una vez creado el canal, deberás "Vincularlo" escaneando el código QR desde tu celular.
          </div>
          <Btn onClick={agregarCuentaWA} full>Crear Canal</Btn>
        </div>
      </Modal>

      <Modal open={showQRModal} onClose={() => setShowQRModal(false)} title={`Vincular: ${currentAccountQR?.nombre || 'Canal'}`}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: "10px 0" }}>
           <p style={{ color: T.whiteDim, textAlign: "center", fontSize: 14 }}>
              Abre WhatsApp en tu teléfono, ve a Dispositivos Vinculados y escanea este código.
           </p>

           <div style={{ background: "#FFF", padding: 20, borderRadius: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.5)", position: "relative" }}>
              {currentAccountQR && waInstancesStatus[currentAccountQR.id]?.qr ? (
                 <img src={waInstancesStatus[currentAccountQR.id].qr} style={{ width: 280, height: 280, display: "block" }} />
              ) : (
                <div style={{ width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
                    <div style={{ width: 40, height: 40, border: `4px solid ${T.bg3}`, borderTopColor: T.teal, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    <span style={{ color: "#000", fontWeight: 800, fontSize: 13 }}>Generando código QR...</span>
                </div>
              )}
           </div>

           <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 12 }}>
              <Btn variant="secundario" full onClick={() => setShowQRModal(false)}>Cerrar</Btn>
              <Btn variant="primario" full onClick={() => vincularWA(currentAccountQR?.id)}>Regenerar QR</Btn>
           </div>
        </div>
      </Modal>

      {showDelEmailModal && (
        <ConfirmModal 
          open 
          onConfirm={handleEliminarEmailAcc} 
          onClose={() => { setShowDelEmailModal(false); setSelectedEmailAcc(null); }} 
          title={`¿Eliminar configuración de correo para ${selectedEmailAcc?.email}?`} 
        />
      )}

      {showCheckout && targetPlan && (
        <Modal open onClose={() => { if (!procesandoPago) { setShowCheckout(false); setTargetPlan(null); setPagoExitoso(false); } }} title="" width={480}>
          <div style={{ textAlign: "center" }}>
            {pagoExitoso ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 0" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${targetPlan.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🎉</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.white }}>¡Pago Exitoso!</div>
                <div style={{ fontSize: 14, color: T.whiteDim }}>Tu plan <b style={{ color: targetPlan.color }}>{targetPlan.nombre}</b> fue activado. Los nuevos límites ya están disponibles.</div>
              </div>
            ) : (
              <>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: `${targetPlan.color}15`, border: `1px solid ${targetPlan.color}40`, borderRadius: 16, padding: "10px 20px", marginBottom: 16 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: targetPlan.color }}>{targetPlan.nombre}</span>
                  <span style={{ fontSize: 13, color: T.whiteDim }}>— ${targetPlan.precio}/mes</span>
                </div>
                <div style={{ fontSize: 13, color: T.whiteDim, marginBottom: 20 }}>Introduce los datos de tu tarjeta para activar el plan.</div>
                <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 16, padding: 20, textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#8b949e", textTransform: "uppercase", letterSpacing: 1 }}>Pago Seguro</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["VISA", "MC", "AMEX"].map(b => <span key={b} style={{ fontSize: 10, fontWeight: 700, color: "#8b949e", background: "#21262d", borderRadius: 4, padding: "2px 6px" }}>{b}</span>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 5, fontWeight: 600 }}>NÚMERO DE TARJETA</div>
                    <input value={cardData.numero} onChange={e => setCardData(p => ({ ...p, numero: e.target.value.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim() }))} placeholder="1234 5678 9012 3456" style={{ width: "100%", background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "11px 14px", fontSize: 15, color: "#f0f6fc", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 5, fontWeight: 600 }}>NOMBRE EN LA TARJETA</div>
                    <input value={cardData.nombre} onChange={e => setCardData(p => ({ ...p, nombre: e.target.value }))} placeholder="JUAN PÉREZ" style={{ width: "100%", background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#f0f6fc", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 5, fontWeight: 600 }}>EXPIRACIÓN</div>
                      <input value={cardData.expiry} onChange={e => { let v = e.target.value.replace(/\D/g,"").slice(0,4); if(v.length>2) v=v.slice(0,2)+"/"+v.slice(2); setCardData(p=>({...p,expiry:v})); }} placeholder="MM/AA" style={{ width: "100%", background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#f0f6fc", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 5, fontWeight: 600 }}>CVV</div>
                      <input value={cardData.cvv} onChange={e => setCardData(p=>({...p,cvv:e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="•••" type="password" style={{ width: "100%", background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#f0f6fc", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "12px 16px", background: T.bg2, borderRadius: 12 }}>
                  <span style={{ fontSize: 13, color: T.whiteDim }}>Total hoy:</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: targetPlan.color }}>${targetPlan.precio}/mes</span>
                </div>
                <button onClick={handleUpgrade} disabled={procesandoPago || !cardData.numero || !cardData.nombre || !cardData.expiry || !cardData.cvv}
                  style={{ marginTop: 14, width: "100%", padding: "15px", borderRadius: 14, border: "none", fontFamily: "inherit", fontWeight: 900, fontSize: 15, cursor: procesandoPago ? "wait" : "pointer", background: procesandoPago ? T.bg2 : `linear-gradient(135deg, ${targetPlan.color}, ${targetPlan.color}cc)`, color: procesandoPago ? T.whiteDim : "#000", transition: "all .3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  {procesandoPago
                    ? <><div style={{ width: 18, height: 18, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Procesando pago...</>
                    : <>🔒 Activar Plan {targetPlan.nombre}</>}
                </button>
                <div style={{ fontSize: 11, color: T.whiteDim, marginTop: 10 }}>🔐 Transacción cifrada con TLS 1.3 · Datos seguros</div>
              </>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
};

